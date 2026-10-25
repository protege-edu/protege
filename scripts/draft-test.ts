/**
 * Drafts a blueprint from sample teacher notes with the real model and prints it with any problems.
 *   npx tsx scripts/draft-test.ts
 */
import { draftBlueprint } from "@/lib/ai/blueprint";
import { checkBlueprint } from "@/lib/teacher/checks";

const NOTES = `Photosynthesis - Grade 9 Science

Plants make their own food through photosynthesis. This happens mostly in the leaves, inside tiny structures called chloroplasts, which contain the green pigment chlorophyll.

Inputs: carbon dioxide (CO2) from the air enters through small pores called stomata. Water is absorbed by the roots and carried up to the leaves. Light energy from the sun is captured by chlorophyll.

Word equation: carbon dioxide + water --(light energy)--> glucose + oxygen

Where does a plant's mass come from? Most of the mass of a plant comes from carbon dioxide in the air, not from the soil. Soil provides water and small amounts of minerals, but the carbon in glucose comes from CO2.

Glucose is used for energy (cellular respiration) and to build cellulose for cell walls, so the plant grows.

Oxygen is released as a by-product through the stomata. Plants also do cellular respiration all the time, day and night, using oxygen.

Common mistakes: "plants get their food from the soil", "plants breathe in CO2 and breathe out oxygen instead of respiring".`;

async function main() {
  const t0 = Date.now();
  const bp = await draftBlueprint({ source: NOTES, grade: 9, onProgress: (s) => console.log(`  [${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`) });
  console.log(`\nDrafted in ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  console.log(JSON.stringify(bp, null, 2));
  const problems = checkBlueprint(bp);
  console.log(`\n${problems.length} problems`);
  for (const p of problems) console.log(` - ${p.message}`);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
