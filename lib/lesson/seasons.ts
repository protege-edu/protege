import type { LessonBlueprint } from "./types";

/**
 * Phase 1's hard-coded lesson: grade 9 science, why do we have seasons?
 * Written for the "senior" age style (grades 9–12), so Gloam's lines are dry and lowercase.
 * In Phase 2 the AI generates blueprints like this from a teacher's notes, in the class's age style,
 * and the teacher approves it before students ever see it.
 *
 * Questions go from neutral to more specific: Gloam only asks the specific ones once it has a clue,
 * so a question never hints at an idea the student hasn't taught yet.
 */
export const seasons: LessonBlueprint = {
  id: "seasons",
  ageStyle: "senior",
  grade: 9,
  topic: "seasons",
  topicWords: ["sun", "earth", "summer", "winter", "spring", "fall", "autumn", "season", "weather", "hot", "cold", "heat", "warm", "planet", "temperature"],
  title: "Why do we have seasons?",
  subject: "Grade 9 science",
  opener:
    "ok so i figured out seasons by myself. summer = earth gets closer to the sun. winter = it backs off. like a campfire. not complicated. ...is it complicated.",
  concepts: [
    {
      id: "tilt",
      name: "The tilt",
      truth:
        "Earth's axis is tilted about 23.5 degrees, and it stays pointed the same way in space as Earth orbits the sun. So for part of the year one hemisphere leans toward the sun, and later it leans away.",
      misconception: "Earth stands perfectly straight up and down, like a spinning top.",
      beliefs: [
        "earth spins perfectly straight. like a very serious top.",
        "wait. earth is... crooked?",
        "so earth leans, and the lean never changes direction as it goes around.",
        "earth is tilted about 23.5° and keeps leaning the same way all year. lean toward the sun = summer for your half. i hate how much sense that makes.",
      ],
      questions: [
        "so what actually makes summer hot, if it's not my campfire theory?",
        "does earth spin perfectly straight, or is something off about it?",
        "ok but why would earth being crooked change the weather?",
      ],
      giveaways: ["tilt", "23.5", "23 degrees", "lean"],
      evidence: ["tilt", "lean", "axis", "23", "angled", "crooked", "tipped", "tip", "point"],
      recap:
        "Earth's axis is tilted about 23.5°, and it keeps pointing the same way all year. So for part of the year your half of Earth leans toward the sun, and later it leans away.",
      notebook: {
        right: ["earth goes around the sun once a year.", "the lean is about 23.5 degrees. weirdly specific."],
        wrong: "the lean flips the other way every six months. that's why the seasons swap.",
      },
      whatIf: {
        scenario: "what if earth had no lean at all? perfectly straight up and down. what happens to seasons?",
        truth: "With no tilt, neither hemisphere would ever lean toward the sun, so there would be almost no seasons: each place would get about the same sunlight all year.",
        misconception: "Seasons would still happen the same way, because they come from Earth's distance to the sun.",
      },
    },
    {
      id: "angle",
      name: "Sun angle",
      truth:
        "When sunlight hits the ground more directly (sun high in the sky), the same energy is packed into a smaller area, so it heats more. Slanted light spreads the same energy over a bigger area, so it heats less.",
      misconception: "Sunlight is sunlight. It doesn't matter what angle it comes in at.",
      beliefs: [
        "sunlight is sunlight. angles are a math class problem.",
        "so the sun being high or low in the sky... matters?",
        "straight-down light hits harder because it's more... packed in?",
        "direct light packs the energy into a small spot. low, slanted light spreads it thin. same sun, weaker hit.",
      ],
      questions: [
        "why is noon hotter than 6pm? it's literally the same sun.",
        "does it matter if the sun is high in the sky or low?",
        "why would straight-down light hit harder than light from the side?",
      ],
      giveaways: ["direct light", "directly", "slanted", "spread out", "spreads out", "concentrated", "energy per"],
      evidence: ["direct", "straight", "angle", "slant", "spread", "concentrat", "focus", "high in the sky", "overhead", "flashlight", "area", "intens", "low in the sky"],
      recap:
        "When the sun is high, its light hits the ground more directly and packs its energy into a smaller area, so it heats more. When it's low, the same light spreads out over a bigger area and heats less.",
      notebook: {
        right: ["the sun is higher in the sky in summer.", "noon light comes in steeper than evening light."],
        wrong: "slanted light is actually stronger, because it travels further and builds up speed.",
      },
      whatIf: {
        scenario: "what if the sun was straight overhead all day, everywhere, forever?",
        truth: "Sunlight would always hit straight down, packing its energy into small areas, so everywhere would heat a lot more, like the tropics all year.",
        misconception: "Nothing would change, because the angle of sunlight doesn't change how much it heats.",
      },
    },
    {
      id: "daylight",
      name: "Day length",
      truth:
        "In summer the days are longer, so the ground gets more hours of sunlight to heat up and fewer hours of night to cool down. In winter it's the opposite.",
      misconception: "Days are always the same length. Twelve hours, done.",
      beliefs: [
        "every day is the same length. that's what a day is.",
        "summer days feel longer. is that real or is it just no school.",
        "longer days = more hours for the sun to heat stuff?",
        "summer days are longer: more hours heating, less night cooling. winter is the reverse. annoyingly logical.",
      ],
      questions: [
        "why does it get dark at like 5pm in winter?",
        "does the number of daylight hours change anything about temperature?",
        "so what does a long day actually do to the ground?",
      ],
      giveaways: ["longer days", "days are longer", "more hours of", "shorter days", "days are shorter"],
      evidence: ["longer", "shorter", "hours", "day length", "daylight", "night", "dark", "same length", "length", "12 hours", "twelve hours"],
      recap:
        "In summer the days are longer, so the ground gets more hours of sun to warm up and fewer hours of night to cool down. In winter it's the other way around.",
      notebook: {
        right: ["summer days are long. like, sunset-at-9pm long.", "winter nights are long and cold."],
        wrong: "day length doesn't matter. the ground only heats up at noon anyway.",
      },
      whatIf: {
        scenario: "what if every day of the year was exactly 12 hours of sun and 12 of dark?",
        truth: "Summer would lose its extra hours of heating and winter its extra hours of cooling, so the difference between summer and winter would get smaller (though the sun's angle would still matter).",
        misconception: "Nothing would change, because how long the sun is up doesn't affect temperature.",
      },
    },
    {
      id: "distance",
      name: "Not distance",
      truth:
        "Distance from the sun is NOT the reason for seasons. Earth's orbit is almost a circle, and Earth is actually closest to the sun in early January, which is winter in the northern hemisphere.",
      misconception: "Summer happens because Earth gets closer to the sun.",
      beliefs: [
        "summer = closer to the sun. campfire logic. undefeated.",
        "wait. you're saying distance isn't it? but. the campfire.",
        "so the distance barely changes because the orbit is basically a circle?",
        "it's not distance. earth is closest to the sun in january. my campfire theory is in the trash, where it belongs.",
      ],
      questions: [
        "if summer means closer to the sun, why does australia get summer in december?",
        "is earth's path around the sun some big stretched-out oval?",
        "so when is earth actually closest to the sun? do you know?",
      ],
      giveaways: [
        "january",
        "almost a circle",
        "nearly circular",
        "basically a circle",
        "perihelion",
        "not because of distance",
        "isn't distance",
        "not distance",
        "doesn't scoot closer",
        "doesn't get closer",
        "not closer",
        "isn't closer",
        "made up that campfire",
        "made up a campfire",
        "campfire nonsense",
        "campfire theory is wrong",
      ],
      evidence: ["distance", "closer", "close", "far", "near", "orbit", "oval", "circle", "january", "ellip"],
      recap:
        "Seasons are NOT caused by distance. Earth's orbit is almost a circle, and Earth is actually closest to the sun in early January, during the northern winter.",
      notebook: {
        right: ["earth's orbit is almost a circle.", "earth is closest to the sun in january."],
        wrong: "summer is when earth gets closest to the sun. campfire rules.",
      },
      whatIf: {
        scenario: "what if earth's orbit was a perfect circle, so it was always the exact same distance from the sun?",
        truth: "Seasons would barely change, because distance isn't what causes them: the tilt would still make each half lean toward and away from the sun.",
        misconception: "There would be no seasons at all, because seasons come from Earth getting closer and further from the sun.",
      },
    },
    {
      id: "hemispheres",
      name: "Two halves",
      truth:
        "The northern and southern hemispheres have opposite seasons at the same time, because when one half leans toward the sun the other half leans away.",
      misconception: "The whole planet has the same season at the same time.",
      beliefs: [
        "it's winter everywhere at once. global sweater season.",
        "hold on. it can be summer somewhere while it's winter here?",
        "so the top and bottom halves of earth swap seasons?",
        "when the north leans toward the sun, the south leans away. opposite seasons. christmas at the beach is real.",
      ],
      questions: [
        "is it winter for literally everyone on earth at the same time?",
        "what season is it in australia during our winter?",
        "why would the top and bottom of earth be any different?",
      ],
      giveaways: ["opposite season", "seasons are opposite", "southern hemisphere", "other half"],
      evidence: ["hemisphere", "opposite", "australia", "south", "north", "other half", "other side", "bottom half", "top half", "equator", "everywhere", "same time", "whole planet", "whole world", "everyone"],
      recap:
        "The northern and southern hemispheres have opposite seasons. When one half leans toward the sun, the other half leans away, so it's summer in Australia during our winter.",
      notebook: {
        right: ["canada and australia are on opposite halves of earth.", "christmas in australia is at the beach. apparently."],
        wrong: "when it's summer in canada, it's summer everywhere. it's one planet.",
      },
      whatIf: {
        scenario: "what if you moved to argentina in july? what season would you pack for?",
        truth: "Winter, because Argentina is in the southern hemisphere, which leans away from the sun in July while the north leans toward it.",
        misconception: "Summer, because July is summer everywhere on Earth.",
      },
    },
  ],
  sequence: {
    conceptId: "angle",
    cards: [
      "your half of earth leans toward the sun",
      "the sun climbs higher in the sky",
      "sunlight hits more directly, and the days get longer",
      "the ground soaks up more energy than it loses",
      "summer",
    ],
    why: "Leaning toward the sun puts it higher in the sky, so its light hits more directly (packed into a smaller area) and the days are longer, so the ground gains more heat than it loses at night.",
  },
  storyBeats: [
    "the valley is dark. one lantern, barely on.",
    "a little light. somewhere, a cricket decides to care.",
    "the hills are catching the light. gloam is getting dangerous.",
    "the whole valley is waking up.",
    "every candle is lit.",
  ],
  finale:
    "ok. i get seasons. the tilt, the angle, the long days, the two halves, and distance was a lie the whole time. you're a good teacher. don't tell anyone i said that.",
};
