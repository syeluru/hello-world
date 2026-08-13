#!/usr/bin/env bash
# =============================================================================
# Creates the "Garage: Open" and "Garage: Close" button scripts in Home
# Assistant via the REST API — no clicking through the UI.
#
# Run this ON the machine that can reach Home Assistant (your MacBook).
#
# Setup (one time):
#   1. In Home Assistant: click your username (bottom-left) -> Security tab
#      -> scroll to "Long-lived access tokens" -> Create Token -> copy it.
#   2. export HA_TOKEN="paste-the-token-here"
#   3. ./create-garage-buttons.sh
#
# Optional: export HA_URL if your instance isn't at homeassistant.local:8123
#   export HA_URL="http://192.168.1.50:8123"
#
# Safe to re-run — it overwrites these two scripts and touches nothing else.
# =============================================================================
set -euo pipefail

HA_URL="${HA_URL:-http://homeassistant.local:8123}"

if [[ -z "${HA_TOKEN:-}" ]]; then
  echo "ERROR: HA_TOKEN is not set."
  echo
  echo "In Home Assistant: your username (bottom-left) -> Security ->"
  echo "Long-lived access tokens -> Create Token, then:"
  echo '  export HA_TOKEN="your-token-here"'
  exit 1
fi

# The cover entity the buttons act on. Change if your ratgdo device is named
# something other than "garage-door".
COVER="${COVER:-cover.garage_door_door}"

echo "Home Assistant: $HA_URL"
echo "Target cover:   $COVER"
echo

# --- Step 1: is anything actually listening there? ---------------------------
# Checked WITHOUT the token so a network problem is never mistaken for a
# bad token — these are completely different fixes.
echo "Checking that Home Assistant is reachable..."
if ! curl -s -o /dev/null --max-time 8 "$HA_URL/" 2>/dev/null; then
  echo
  echo "ERROR: Nothing responded at $HA_URL"
  echo
  echo "This is a NETWORK problem, not a token problem. Work through these:"
  echo
  echo "  1. Is the Home Assistant VM actually running in UTM?"
  echo
  echo "  2. Does the name resolve?"
  echo "       ping -c 2 homeassistant.local"
  echo "     If that fails, mDNS isn't working — use the IP address instead."
  echo
  echo "  3. Find the IP: look at the HA VM's console window in UTM. It prints"
  echo "     its address on the login screen. Then:"
  echo "       export HA_URL=\"http://192.168.1.NNN:8123\""
  echo "       $0"
  echo
  echo "  4. If the VM has no LAN address at all, its network is set to Shared"
  echo "     (NAT). Switch the VM to Bridged mode in UTM settings and reboot it."
  echo
  exit 1
fi
echo "  Reachable."

# --- Step 2: does the token work? --------------------------------------------
echo "Checking the access token..."
auth_status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 \
  -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/" || true)

if [[ "$auth_status" != "200" ]]; then
  echo
  echo "ERROR: Home Assistant answered, but rejected the token (HTTP $auth_status)."
  echo
  echo "This is a TOKEN problem — the network is fine. Usually one of:"
  echo "  - The token was truncated when copied. They are very long; make sure"
  echo "    the whole string is inside the quotes."
  echo "  - The token was revoked or belongs to a different HA instance."
  echo "  - You created a 'Refresh token' rather than a LONG-LIVED access token."
  echo
  echo "Create a new one: your username (bottom-left) -> Security tab ->"
  echo "Long-lived access tokens -> Create Token."
  echo
  exit 1
fi
echo "  Token accepted."

# --- Verify the garage cover actually exists ---------------------------------
if ! curl -sf -H "Authorization: Bearer $HA_TOKEN" \
     "$HA_URL/api/states/$COVER" >/dev/null; then
  echo
  echo "WARNING: $COVER does not exist yet."
  echo "The buttons will still be created, but won't do anything until the"
  echo "ratgdo is set up. Re-run with COVER=<your entity> to target another."
  echo
fi

# --- Helper: create/overwrite one script -------------------------------------
create_script() {
  local object_id="$1" payload="$2"
  echo -n "Creating script.$object_id ... "
  if curl -sf -X POST \
      -H "Authorization: Bearer $HA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$HA_URL/api/config/script/config/$object_id" >/dev/null; then
    echo "done"
  else
    echo "FAILED"
    exit 1
  fi
}

create_script "garage_open_now" "$(cat <<JSON
{
  "alias": "Garage: Open",
  "icon": "mdi:garage-open-variant",
  "description": "One-tap open. Safe to run when already open.",
  "mode": "single",
  "sequence": [
    {
      "action": "cover.open_cover",
      "target": { "entity_id": "$COVER" }
    }
  ]
}
JSON
)"

create_script "garage_close_now" "$(cat <<JSON
{
  "alias": "Garage: Close",
  "icon": "mdi:garage-variant",
  "description": "One-tap close.",
  "mode": "single",
  "sequence": [
    {
      "action": "cover.close_cover",
      "target": { "entity_id": "$COVER" }
    }
  ]
}
JSON
)"

echo
echo "Done. Two new entities exist:"
echo "  script.garage_open_now   -> \"Garage: Open\""
echo "  script.garage_close_now  -> \"Garage: Close\""
echo
echo "They are immediately available in the phone app's widget picker."
echo "No restart needed."
