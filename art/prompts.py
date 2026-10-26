"""
Art direction for the "senior" (grades 9-12) age style: a moody, hand-painted indie game at night.
One shared style line keeps every painting consistent. Change STYLE and every asset follows.
"""

STYLE = (
    "hand-painted digital matte painting, gouache and oil brushwork, visible painterly brush strokes, "
    "soft edges, rich textured canvas, cinematic indie game concept art in the style of Spiritfarer and Studio Ghibli night scenes, "
    "deep teal, pine green and blue-black palette, atmospheric perspective, volumetric mist, "
    "masterpiece, highly detailed, no text, no watermark, no people, no animals"
)

VALLEY = (
    "a wide quiet valley at night seen from a low hillside, layered rolling hills fading into mist, "
    "a jagged mountain range silhouette on the horizon, dark pine trees scattered on the slopes, "
    "a clear sky full of faint stars, a soft grassy meadow in the foreground with tall wild grass, "
    "empty open space in the center foreground where a small creature could stand, "
)

VALLEY_DARK = VALLEY + "very dark moonless night, cold blue-green shadows, almost no light, " + STYLE

VALLEY_LIT = (
    VALLEY
    + "a single warm golden lantern glow coming from the center foreground, warm amber light spilling across the grass "
    "and catching the edges of the hills and pine trees, fireflies, glowing mist, the rest of the night still cool and dark, "
    + STYLE
)

# Repaints of the chosen valley (same composition, different light)
REPAINT_DARK = (
    VALLEY
    + "deep moonless night, the meadow and hills in cold blue-green shadow, no lantern, no warm light at all, "
    "only faint starlight, " + STYLE
)
REPAINT_FULL = (
    VALLEY
    + "the whole valley is gently lit by warm golden lantern light spreading from the center of the meadow, "
    "glowing amber grass, warm light on the edges of the hills and pine trees, golden mist, fireflies everywhere, "
    "a faint warm glow on the horizon, still night, " + STYLE
)

GLOAM_V2 = (
    "character concept art of a small round soft creature shaped like a plump egg, covered in fluffy deep plum-rose and raspberry fur, "
    "darker plum fur underneath, both short stubby arms resting down at its sides, two tiny feet, "
    "big glossy dark brown eyes, a calm unimpressed half-lidded expression, a tiny mouth, "
    "a curly green vine stalk with a spiral tip and one small leaf grows from the top of its head and curves over to hold a small round glowing paper lantern hanging above its head, "
    "the lantern casts warm golden light on the top of its fuzzy head, full body, centered, front view, symmetrical pose, "
    "hand-painted, gouache and oil brushwork, soft fur texture, Spiritfarer and Studio Ghibli style, "
    "isolated on a plain flat very dark green background, no text, no watermark"
)

GLOAM = (
    "character concept art of a small round adorable creature, like a soft felted plum-rose puffball with a slightly squashed egg shape, "
    "short stubby arms, tiny feet, big expressive glossy brown eyes with heavy eyelids and a smug expression, "
    "a curly green vine stalk with one small leaf growing from the top of its head, holding up a small glowing paper lantern with a dark metal cap, "
    "the lantern casts warm golden light on its fuzzy face, full body, centered, front three-quarter view, "
    "hand-painted, gouache brushwork, soft fur texture, Spiritfarer and Studio Ghibli style, "
    "isolated on a plain flat very dark green background, no text, no watermark"
)


# ---- Gloam 2.0 concept round (Phase 3) ----
# Same core in every concept: small, round, a little dramatic, a lantern hanging from a curly stalk on its head.
# Different materials and silhouettes, so the pick is a real choice. Front view, arms down, plain background:
# the chosen one gets cut into parts for the animation rig.
_CONCEPT_TAIL = (
    "a curly vine stalk with a spiral tip grows from the top of its head and curves over to hold a small round paper lantern, "
    "the lantern glows warm gold and lights the top of its head, full body, centered, front view, standing, both short arms down at its sides, "
    "two tiny feet, big expressive eyes, a dry unimpressed half-lidded expression, "
    "hand-painted character concept art, gouache and oil brushwork, soft painterly shading, indie game character design sheet, "
    "isolated on a plain flat very dark teal background, no text, no watermark"
)
CONCEPTS = {
    "c1_ink": "a small round creature with a smooth glossy blue-black ink-drop body like a polished river stone, a soft sheen highlight, big pale moon-white eyes, " + _CONCEPT_TAIL,
    "c2_felt": "a small round creature made of rust-orange felted wool with soft fuzzy fibres and faint stitched seams, a cream-coloured belly patch, " + _CONCEPT_TAIL,
    "c3_moth": "a small round fluffy creature with charcoal-grey and dusty lavender fur like a moth, two big feathery moth antennae ears, a fluffy cream collar ruff, " + _CONCEPT_TAIL,
    "c4_velvet": "a small round creature with short deep plum-rose velvet fur, darker plum underneath, two small rounded ear tufts, rosy cheeks, " + _CONCEPT_TAIL,
    "c5_owl": "a small round puffball creature with slate-blue and cream feathery down, two pointed ear tufts like a tiny owl, a pale face disc, " + _CONCEPT_TAIL,
    "c6_ember": "a small round creature with soft charcoal fur and a warm dark-red ember glow showing through the fur on its chest, two small horn-like nubs, " + _CONCEPT_TAIL,
}

# The checkpoint shrine: one per idea on the journey (a candle is drawn on top in code, and lit by teaching)
SHRINE = (
    "a single small old stone shrine, a short stack of three rounded mossy river stones with a flat stone slab on top, "
    "patches of moss and lichen, a few blades of grass at its base, standing alone, front view, centered, full object visible, "
    "night, cool blue-green moonlight, hand-painted, gouache and oil brushwork, soft painterly shading, indie game prop design, "
    "isolated on a plain flat very dark teal background, no text, no watermark, no candle, no fire"
)

# The secret-picture key students sign in with (components/join/KeyPictures.tsx). Each one has to be
# recognised in a split second by a 5-year-old, so: one object, a bold clear silhouette, its own colour.
# No gold or warm lantern glow anywhere (lantern gold only ever means understanding).
_KEY_TAIL = (
    "single object, centered, front view, full object visible, bold simple readable silhouette, "
    "hand-painted, gouache and oil brushwork, soft painterly shading, indie game item icon, "
    "isolated on a plain flat very dark teal background, no text, no watermark, no frame, no glow"
)
KEY_PICTURES = {
    "key_moon": "a pale silvery-blue crescent moon with soft painted craters, " + _KEY_TAIL,
    "key_fern": "a single curling green fern frond, bright fresh green leaves, " + _KEY_TAIL,
    "key_lantern": "a small old iron lantern with blue-green glass panes, unlit, dark metal, " + _KEY_TAIL,
    "key_owl": "a small round brown owl sitting, big round eyes, fluffy feathers, cute, " + _KEY_TAIL,
    "key_star": "a chunky five-pointed star made of pale pink crystal, " + _KEY_TAIL,
    "key_mushroom": "a single red mushroom with white spots, short white stem, " + _KEY_TAIL,
    "key_leaf": "a single bright orange-red maple leaf, autumn, " + _KEY_TAIL,
    "key_moth": "a fluffy pale lilac moth with wings spread open, feathery antennae, cute, " + _KEY_TAIL,
    "key_stone": "a small stack of three smooth grey river stones, " + _KEY_TAIL,
}

# ---- The younger Gloams (M5 concept round) ----
# The SAME creature as the high school Gloam (c2_felt: rust-orange felted wool, a cream belly patch, faint stitched
# seams, a paper lantern on a curly stalk), grown into each age's personality and world. Front view, arms down,
# plain background: the chosen one gets cut into parts for the rig, like art/gloam2_rig.py.
_YOUNG_CORE = (
    "a small round creature made of orange felted wool with soft fuzzy fibres and faint stitched seams, a cream-coloured belly patch, "
    "a curly green vine stalk with a spiral tip grows from the top of its head and curves over to hold a small round paper lantern, "
    "full body, centered, front view, standing, both short arms down at its sides, two tiny feet, "
)
YOUNG_GLOAMS = {
    # K-2: rounder, brighter, bouncy, huge sparkly eyes, a big happy smile
    "gloam_little": "an extra round chubby " + _YOUNG_CORE.replace("a small round creature", "small creature")
    + "bright tangerine orange, huge sparkly round eyes with big white highlights, rosy pink cheeks, a big happy open smile, "
    "cheerful children's picture book illustration, soft watercolour and gouache, bright warm sunny daylight colours, "
    "isolated on a plain flat soft pale sky-blue background, no text, no watermark",
    # 3-5: playful, a bit silly, curious
    "gloam_junior": _YOUNG_CORE
    + "big curious round eyes, one eyebrow raised, a lopsided cheeky grin showing one tooth, a little tuft of fuzz on top of its head, "
    "storybook illustration, gouache and coloured pencil texture, warm golden dusk light, "
    "isolated on a plain flat soft dusky lavender background, no text, no watermark",
    # 6-8: goofy, dramatic, theatrical
    "gloam_middle": _YOUNG_CORE
    + "a short tattered teal scarf wrapped around its neck with the ends blowing sideways in the wind, big expressive eyes, "
    "huge dramatic bushy eyebrows, a theatrical wide-eyed gasp expression with a small open mouth, "
    "stylised indie animation character design, bold shapes, gouache texture, dramatic twilight rim light, "
    "isolated on a plain flat deep twilight blue background, no text, no watermark",
}
