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
