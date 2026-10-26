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
