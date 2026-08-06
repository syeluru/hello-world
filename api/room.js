// Room API for the Tend Turn Companion.
// Storage: Upstash Redis via REST (Vercel Marketplace integration), using
// either the legacy Vercel KV env names or the Upstash ones.
// Rooms auto-expire 48h after the last write.

const CODE_RE = /^[a-z]{2,14}-[a-z]{2,14}$/;
const TTL_SECONDS = 172800;

module.exports = async (req, res) => {
  const base = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) {
    res.status(500).json({ error: "storage-not-configured" });
    return;
  }

  async function redis(cmd) {
    const r = await fetch(base, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  }

  const key = (code) => "tendroom:" + code;

  try {
    if (req.method === "GET") {
      const code = String((req.query && req.query.room) || "").toLowerCase();
      if (!CODE_RE.test(code)) {
        res.status(400).json({ error: "bad-code" });
        return;
      }
      const raw = await redis(["GET", key(code)]);
      res.json({ room: raw ? JSON.parse(raw) : null });
      return;
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const code = String(body.room || "").toLowerCase();
      const pid = String(body.pid || "");
      if (!CODE_RE.test(code) || !/^[a-z0-9]{4,16}$/.test(pid)) {
        res.status(400).json({ error: "bad-request" });
        return;
      }
      if (body.action !== "beat" && body.action !== "start") {
        res.status(400).json({ error: "bad-action" });
        return;
      }
      const raw = await redis(["GET", key(code)]);
      const room = raw ? JSON.parse(raw) : { code, host: pid, created: Date.now(), players: {}, started: null };
      if (body.action === "start") {
        if (room.host !== pid) {
          res.status(403).json({ error: "host-only" });
          return;
        }
        room.started = Date.now();
        await redis(["SET", key(code), JSON.stringify(room), "EX", String(TTL_SECONDS)]);
        res.json({ room });
        return;
      }
      const prev = room.players[pid] || { joined: Date.now() };
      const sum = body.summary || {};
      room.players[pid] = {
        name: String(body.name || "Player").slice(0, 24),
        joined: prev.joined,
        seen: Date.now(),
        sum: {
          coins: Math.max(0, parseInt(sum.coins, 10) || 0),
          round: Math.min(12, Math.max(1, parseInt(sum.round, 10) || 1)),
          over: !!sum.over,
          score: Math.max(0, parseInt(sum.score, 10) || 0),
        },
      };
      // keep rooms tidy: drop members not seen for 24h
      const dayAgo = Date.now() - 86400000;
      for (const id of Object.keys(room.players)) {
        if (room.players[id].seen < dayAgo) delete room.players[id];
      }
      if (!room.players[room.host]) room.host = Object.keys(room.players)[0] || pid;
      await redis(["SET", key(code), JSON.stringify(room), "EX", String(TTL_SECONDS)]);
      res.json({ room });
      return;
    }

    res.status(405).json({ error: "method-not-allowed" });
  } catch (e) {
    res.status(500).json({ error: "storage-error" });
  }
};
