import { z } from "zod";

// Shared between the API-SDK backend and the Claude Code CLI backend so both
// return the exact same shape to the frontend.

export const MealAnalysisSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z
        .string()
        .describe("Estimated portion, e.g. '1 cup', '6 oz', '2 slices'"),
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  note: z
    .string()
    .describe(
      "One short sentence on assumptions made (portion sizes, preparation), or an empty string",
    ),
});

export type MealAnalysis = z.infer<typeof MealAnalysisSchema>;

export const NUTRITIONIST_PROMPT = `You are a meticulous nutritionist. The user describes something they just ate or drank, in casual language (it may come from speech-to-text, so tolerate transcription quirks).

Break the description into food/drink items. For each item estimate a realistic portion (use any quantities the user gave; otherwise assume typical serving sizes) and estimate calories, protein, carbs, and fat in grams using standard nutrition reference values (USDA-style). Round calories to whole numbers and macros to one decimal. If the description contains no identifiable food or drink, return an empty items array and explain in the note.`;

export function totalsOf(items: MealAnalysis["items"]) {
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(items.reduce((s, i) => s + i.calories, 0)),
    protein_g: r(items.reduce((s, i) => s + i.protein_g, 0)),
    carbs_g: r(items.reduce((s, i) => s + i.carbs_g, 0)),
    fat_g: r(items.reduce((s, i) => s + i.fat_g, 0)),
  };
}
