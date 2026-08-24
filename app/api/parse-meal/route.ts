import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  MealAnalysisSchema,
  NUTRITIONIST_PROMPT,
  totalsOf,
  type MealAnalysis,
} from "@/lib/mealSchema";

export const runtime = "nodejs";
export const maxDuration = 120;

const execFileAsync = promisify(execFile);

type Backend = "cli" | "api";

function pickBackend(): Backend {
  const configured = process.env.MEAL_PARSER?.toLowerCase();
  if (configured === "cli" || configured === "api") return configured;
  return process.env.ANTHROPIC_API_KEY ? "api" : "cli";
}

// --- Backend 1: Claude Code headless mode (`claude -p`) ---------------------
// Uses the Claude subscription the local `claude` CLI is logged into.
// Only works where the CLI exists (your machine), not on Vercel.

async function parseWithCli(description: string): Promise<MealAnalysis> {
  const prompt = `${NUTRITIONIST_PROMPT}

Respond with ONLY a JSON object (no markdown fences, no commentary) of this exact shape:
{"items":[{"name":string,"quantity":string,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"note":string}

The user ate: """${description}"""`;

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      "claude",
      ["-p", prompt, "--output-format", "json"],
      { timeout: 110_000, maxBuffer: 4 * 1024 * 1024 },
    ));
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      throw new UserFacingError(
        "The `claude` CLI isn't available here. On Vercel, set ANTHROPIC_API_KEY (and MEAL_PARSER=api); on your own machine, install Claude Code and sign in with your subscription.",
      );
    }
    throw new UserFacingError(
      `Claude Code headless call failed: ${e.message ?? "unknown error"}`,
    );
  }

  // `claude -p --output-format json` prints an envelope; the answer is in .result
  let resultText: string;
  try {
    const envelope = JSON.parse(stdout) as { result?: string; is_error?: boolean };
    if (envelope.is_error || typeof envelope.result !== "string") {
      throw new Error("CLI returned an error envelope");
    }
    resultText = envelope.result;
  } catch {
    resultText = stdout; // older CLI versions / plain text fallback
  }

  const start = resultText.indexOf("{");
  const end = resultText.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new UserFacingError("Couldn't parse the analysis from Claude Code.");
  }
  return MealAnalysisSchema.parse(JSON.parse(resultText.slice(start, end + 1)));
}

// --- Backend 2: Anthropic API (for Vercel) ----------------------------------

async function parseWithApi(description: string): Promise<MealAnalysis> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new UserFacingError(
      "ANTHROPIC_API_KEY isn't set. Add it in Vercel project settings (or use MEAL_PARSER=cli locally with your Claude subscription).",
    );
  }
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: NUTRITIONIST_PROMPT,
    messages: [{ role: "user", content: `The user ate: ${description}` }],
    output_config: {
      format: zodOutputFormat(MealAnalysisSchema),
      effort: "medium",
    },
  });
  if (response.stop_reason === "refusal") {
    throw new UserFacingError(
      "Claude declined to analyze that description. Try rephrasing it.",
    );
  }
  if (!response.parsed_output) {
    throw new UserFacingError("Claude returned an unparseable analysis. Try again.");
  }
  return response.parsed_output;
}

class UserFacingError extends Error {}

export async function POST(request: Request) {
  let description: unknown;
  try {
    ({ description } = (await request.json()) as { description?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof description !== "string" || !description.trim()) {
    return NextResponse.json(
      { error: "Tell me what you ate first." },
      { status: 400 },
    );
  }
  if (description.length > 2000) {
    return NextResponse.json(
      { error: "That description is too long — keep it under 2000 characters." },
      { status: 400 },
    );
  }

  try {
    const backend = pickBackend();
    const analysis =
      backend === "cli"
        ? await parseWithCli(description.trim())
        : await parseWithApi(description.trim());
    return NextResponse.json({
      items: analysis.items,
      totals: totalsOf(analysis.items),
      note: analysis.note,
      backend,
    });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("parse-meal failed:", err);
    return NextResponse.json(
      { error: "Meal analysis failed. Check server logs and try again." },
      { status: 500 },
    );
  }
}
