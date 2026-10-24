import type { LessonBlueprint } from "./types";

/** Phase 1's hard-coded lesson. Grade 9 science: why do we have seasons? */
export const seasons: LessonBlueprint = {
  id: "seasons",
  title: "Why do we have seasons?",
  subject: "Grade 9 science",
  opener:
    "Okay. OKAY. I figured out seasons all by myself. Summer is when Earth scoots closer to the sun, like standing next to a campfire. Winter is when we drift away. Genius, right? ...Right?",
  concepts: [
    {
      id: "tilt",
      name: "The tilt",
      truth:
        "Earth's axis is tilted about 23.5 degrees, and it stays pointed the same way in space as Earth orbits the sun. So for part of the year one hemisphere leans toward the sun, and later it leans away.",
      misconception: "Earth stands perfectly straight up and down, like a spinning top.",
      beliefs: [
        "Earth spins perfectly straight. Like a very serious top.",
        "Wait, Earth is... crooked? Like a little lean?",
        "So Earth leans, and the lean doesn't change direction as it goes around?",
        "Earth is tilted about 23.5 degrees and keeps leaning the same way all year. Leaning toward the sun = summer for that half!",
      ],
      questions: [
        "Does Earth spin straight up and down, or is it doing something weird?",
        "Okay but WHY would Earth being crooked change the weather??",
      ],
      giveaways: ["tilt", "23.5", "23 degrees", "lean"],
      evidence: ["tilt", "lean", "axis", "23", "angled", "crooked", "tipped", "tip", "point"],
    },
    {
      id: "angle",
      name: "Sun angle",
      truth:
        "When sunlight hits the ground more directly (sun high in the sky), the same energy is packed into a smaller area, so it heats more. Slanted light spreads the same energy over a bigger area, so it heats less.",
      misconception: "Sunlight is sunlight. It doesn't matter what angle it comes in at.",
      beliefs: [
        "Sunlight is sunlight. Angle is for math class.",
        "So the sun being high or low in the sky... matters?",
        "Straight-down light is stronger somehow? Because it's more... squished?",
        "Direct light packs the energy into a small spot, slanted light spreads it out thin. Like a flashlight pointed straight vs. at an angle!",
      ],
      questions: [
        "Why is noon hotter than sunset if it's the same sun?",
        "Is the sun at noon somehow stronger than the sun at 6pm? It's the same sun!",
      ],
      giveaways: ["direct light", "directly", "slanted", "spread out", "spreads out", "concentrated", "energy per"],
      evidence: ["direct", "straight", "angle", "slant", "spread", "concentrat", "focus", "high in the sky", "overhead", "flashlight", "area", "intens", "low in the sky"],
    },
    {
      id: "daylight",
      name: "Day length",
      truth:
        "In summer the days are longer, so the ground gets more hours of sunlight to heat up and fewer hours of night to cool down. In winter it's the opposite.",
      misconception: "Days are always the same length. Twelve hours, done.",
      beliefs: [
        "Every day is exactly the same length. That's what 'day' means.",
        "Summer days feel longer... is that real or is it just because there's no school?",
        "Longer days mean more time for the sun to heat stuff up?",
        "Summer days are longer, so more hours of heating and less night to cool off. Winter is the other way!",
      ],
      questions: [
        "Why does it get dark at like 5pm in winter?",
        "Does the number of daylight hours change anything about temperature?",
      ],
      giveaways: ["longer days", "days are longer", "more hours of", "shorter days", "days are shorter"],
      evidence: ["longer", "shorter", "hours", "day length", "daylight", "night", "dark"],
    },
    {
      id: "distance",
      name: "Not distance",
      truth:
        "Distance from the sun is NOT the reason for seasons. Earth's orbit is almost a circle, and Earth is actually closest to the sun in early January, which is winter in the northern hemisphere.",
      misconception: "Summer happens because Earth gets closer to the sun.",
      beliefs: [
        "Summer = closer to the sun. Campfire logic. Unbeatable.",
        "Wait, you're saying distance ISN'T it? But... the campfire...",
        "So the distance barely changes because the orbit is almost a circle?",
        "It's not distance! Earth is actually closest to the sun in January. My campfire theory is in the trash where it belongs.",
      ],
      questions: [
        "If summer is when we're closer to the sun, why would Australia have summer in December?",
        "Is Earth's path around the sun a big stretched oval?",
      ],
      giveaways: ["january", "almost a circle", "nearly circular", "perihelion", "not because of distance", "isn't distance"],
      evidence: ["distance", "closer", "close", "far", "near", "orbit", "oval", "circle", "january", "ellip"],
    },
    {
      id: "hemispheres",
      name: "Two halves",
      truth:
        "The northern and southern hemispheres have opposite seasons at the same time, because when one half leans toward the sun the other half leans away.",
      misconception: "The whole planet has the same season at the same time.",
      beliefs: [
        "It's winter everywhere at once. Planet-wide hot chocolate season.",
        "Hold on, it can be summer somewhere while it's winter here?",
        "So the top half and bottom half of Earth swap seasons?",
        "When the north leans toward the sun, the south leans away. So their seasons are opposite. Christmas at the beach in Australia!",
      ],
      questions: [
        "Is it winter for everyone on Earth at the same time?",
        "What season is it in Australia during our winter?",
      ],
      giveaways: ["opposite season", "seasons are opposite", "southern hemisphere", "other half"],
      evidence: ["hemisphere", "opposite", "australia", "south", "north", "other half", "other side", "bottom half", "top half", "equator"],
    },
  ],
  storyBeats: [
    "The valley is dark. Gloam's lantern is barely a spark.",
    "A little glow. Somewhere a cricket starts up.",
    "The hills catch the light. Gloam is getting dangerously smart.",
    "The whole valley is waking up.",
    "Every candle is lit. The valley glows.",
  ],
  finale:
    "I GET SEASONS. The tilt, the angle, the long days, the opposite halves, and distance was a big fat lie. You're a really good teacher, you know that?",
};
