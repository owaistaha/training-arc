# Archetype art briefs (step 9, for review, nothing generated yet)

Six portraits of our **original** characters, one per archetype in
`src/data/archetypes.json`. Each prompt below is built from that archetype's
`artBrief`. Where the prompt differs from the `artBrief`, the section says
why (usually to steer away from a known character's look).

**Final prompt = the archetype's subject paragraph + the shared style block,
pasted verbatim.** No prompt contains a franchise or character name.

---

## Shared style block (appended to every prompt)

> Original character illustration in a modern anime-inspired cel-shaded style:
> clean, confident ink lineart, two-tone cel shading with a single soft
> highlight, and grounded athletic anatomy (defined but believable muscle, not
> exaggerated). The character is a clearly adult man in his mid-twenties. Full
> body, centred, turned three-quarters toward the viewer, the whole figure
> inside the frame with the head near the top tenth and the feet near the
> bottom tenth; camera at chest height unless stated otherwise. The background
> is solid near-black (#0A0A0F) filling the entire canvas edge to edge; any
> environment detail described above is a faint, low-contrast silhouette that
> fades into the black. Lighting: a strong warm rim light from behind in
> energy orange (#FF6B1A) blending to gold (#FFB020) that outlines the whole
> silhouette, plus a soft cool front fill so the face and body stay readable.
> Clothing stays in muted neutrals (charcoal, slate, stone, black, oatmeal) so
> the rim light is the only saturated colour. Portrait 3:4 composition. No
> text, letters, logos, emblems, kanji, symbols, watermarks, signature, frame
> or border. Safe for work.

### Shared rules

| Rule | Value |
|---|---|
| Style | One style for all six: same line weight, shading, rim light and framing. Generate the Warrior first; once approved, pass it as a **style reference** for the other five (see Workflow). |
| Framing | Full body, centred, head ≈ top 10 %, feet ≈ bottom 10 %. Action poses (Vanguard's deadlift set-up, Ninja, Monk) stay inside the same bounding box. |
| Aspect / export | Portrait **3:4**, exported at **768×1024 WebP** (quality ~82, target < 120 KB each). |
| Background | **Solid `#0A0A0F`** (our `--color-bg`). The image model can't output real transparency, and a matching solid background blends seamlessly into the dark UI. Transparent WebP stays an option if we cut the figures out later. |
| Colour | Wardrobe in muted neutrals. Orange → gold appears **only** as rim light, so no character wears an orange outfit. |
| Files | `public/archetypes/<id>.webp` (`warrior.webp`, `vanguard.webp`, …) |
| Hard nos | Franchise or character names in prompts, alt text or file names; any hair + outfit + colour combination from a known character (per-archetype lists below); text or symbols on clothing; weapons other than the Swordsman's single sheathed blade (the Vanguard's barbell is gym equipment, not a weapon); anyone who reads as under 18. |

---

## 1. The Warrior (`warrior`)

**artBrief:** Original anime-style martial artist, athletic V-taper build,
simple training outfit, determined expression, dynamic pose, bold cel shading

**Subject paragraph**

> A lean, athletic martial artist with a pronounced V-taper: broad shoulders,
> wide back, narrow waist and visible abs. He has short, neatly cropped dark
> hair lying flat, and a determined, focused expression. He wears plain grey
> training wear: a charcoal-grey sleeveless training top and loose dark-grey
> training trousers, with off-white cloth hand wraps and bare feet. Dynamic
> fighting stance: weight on the front foot, lead fist raised at chin height,
> rear fist guarding the ribs, as if about to step forward. Faint diagonal
> speed lines in the dark background.

**Must not resemble:** orange or orange-and-blue gi; spiky or upswept black
hair; blue undershirt or blue wristbands and boots; any chest emblem or kanji;
a red headband with white gi.

---

## 2. The Vanguard (`vanguard`)

**artBrief:** Original anime-style strength athlete, compact dense muscular
build, chalked hands gripping a loaded barbell, calm focused expression, plain
dark training wear, dramatic lighting

**Subject paragraph**

> A compact, dense, powerfully built strength athlete: thick arms, heavy traps
> and a deep chest on a shorter frame. He has a very short dark-brown buzz cut
> and a calm, focused expression, eyes on the bar. He wears plain dark training
> wear: a fitted black short-sleeve training shirt, dark-grey training shorts
> over black leggings, and flat black lifting shoes. He stands over a loaded
> barbell on the floor in the set-up position for a deadlift: hips hinged,
> back flat, arms straight, both chalked hands gripping the bar just outside
> his shins, with white chalk dust drifting in the air. The plates are plain
> matte black with no markings. Dramatic side lighting adds extra contrast on
> one side of the body. The full barbell and both plates stay inside the frame.

**Decisions applied:** the archetype was renamed from "The Rival Prince" to
**The Vanguard** (tagline unchanged). The crossed-arms/smirk pose was replaced
with the barbell set-up above, and `archetypes.json` was updated to match.
Hair is a buzz cut and the outfit is plain training wear (no armour, vest or
plates).

**Must not resemble:** blue bodysuit with white chest armour; white gloves and
white boots; tall upswept black hair with a sharp widow's peak; spiky golden
hair; a coloured eyepiece or scouter; arms folded with a smirk.

---

## 3. The Shadow Ninja (`ninja`)

**artBrief:** Original anime-style stealth fighter, lean shredded agile
build, dark wraps and scarf, mid-leap pose, moonlit background

**Subject paragraph**

> A lean, shredded, agile stealth fighter with very low body fat and sharply
> defined abs. He has short black hair pulled into a small, tight top-knot and
> a calm, focused expression; his face is uncovered. He wears a sleeveless
> charcoal top, dark slate trousers bound at the shins with dark cloth wraps,
> matching forearm wraps and a long slate-grey scarf trailing behind him. He
> is caught mid-leap, one knee drawn up and one leg extended, the scarf
> streaming. Behind him, a large pale full moon, very low contrast, sits
> behind a faint silhouette of rooftops, all fading into the black.

**Changes from the artBrief:** none, beyond fixing the scarf colour (slate
grey) and hair (top-knot) to avoid known looks.

**Must not resemble:** orange jumpsuit; forehead protector with a metal
plate; spiky blond hair or cheek whisker marks; face mask with spiky silver
hair; spiky black hair with a high collar; red scarf; spiral or cloud motifs;
any clan-style symbol.

---

## 4. The Titan (`titan`)

**artBrief:** Original anime-style giant brawler, massive heavily muscled
build, towering pose, cracked ground, heroic low angle

**Subject paragraph**

> A giant brawler with a massive, heavily muscled build: huge shoulders and
> chest, thick arms and legs, broad waist. He has a clean-shaven head, a short
> dark stubble beard and a steady, confident expression. He wears a plain black
> sleeveless shirt stretched across his chest, dark-grey cargo trousers and
> heavy black boots, with athletic tape on his knuckles. Towering pose: feet
> planted wide, fists loosely at his sides, shoulders squared. The ground at
> his feet is cracked, with a few small fragments lifting. **Camera exception:**
> heroic low angle from knee height, looking up.

**Changes from the artBrief:** none.

**Must not resemble:** blond hair with two upright antenna-like locks; a
red-white-and-blue or yellow hero suit; any cape; green hair with gold
jewellery, white trousers and a red sash; grey or non-human skin; a bald head
with a yellow jumpsuit and white cape.

---

## 5. The Swordsman (`swordsman`)

**artBrief:** Original anime-style wandering swordsman, athletic strong build,
simple robe open at chest, sheathed blade, calm focused stance

**Subject paragraph**

> A wandering swordsman with an athletic, strong build, a powerful back and a
> solid core. He has short, slightly tousled dark-brown hair (no ponytail),
> is clean-shaven with no scars, and has a calm, focused expression. He wears
> a simple undyed stone-grey robe open at the chest, wide charcoal trousers,
> a plain dark rope belt and simple straw sandals. **One** sword in a plain
> dark-wood scabbard hangs at his left hip, sheathed, his left hand resting on
> it. Calm, grounded stance, weight centred, looking just past the viewer.
> Faint drifting leaves in the dark background.

**Changes from the artBrief:** limited to exactly **one** blade; no ponytail
or long hair; neutral robe colour.

**Must not resemble:** green hair; three swords or a sword held in the mouth;
green waist wrap; black bandana tied on the arm; three earrings; long red hair
with a cross-shaped cheek scar and magenta robe; glasses with a high
ponytail; long wild black hair; a straw hat.

---

## 6. The Monk (`monk`)

**artBrief:** Original anime-style mountain monk, lean calisthenics build,
holding a handstand on a rock, simple training pants, misty peaks

**Subject paragraph**

> A mountain monk with a lean, wiry calisthenics physique: visible back and
> shoulder definition, strong core, long limbs. He has short cropped black
> hair and a serene, concentrated expression. He is bare-chested, in loose
> sand-coloured linen training trousers tied at the ankles, with dark cloth
> wristbands and bare feet. He holds a perfectly straight handstand on a flat
> rock, legs together and pointed to the sky; his body is inverted but stays
> inside the same frame. Behind him, faint misty mountain peaks in layered
> silhouettes fade into the black.

**Changes from the artBrief:** hair is **short and cropped, not shaved**,
because a shaved head is the strongest single cue for the best-known monk
characters.

**Must not resemble:** shaved head with six dots on the forehead; orange gi;
shaved head with blue arrow tattoos; saffron or yellow-orange robes; a bald
head with a yellow jumpsuit and cape; prayer-bead necklace combined with any
of the above.

---

## Alt text (for the `<img>` tags)

| id | alt |
|---|---|
| warrior | Original anime-style illustration of a lean martial artist in grey training wear, in a fighting stance |
| vanguard | Original anime-style illustration of a compact, heavily muscled strength athlete gripping a loaded barbell |
| ninja | Original anime-style illustration of a lean stealth fighter leaping in front of a full moon |
| titan | Original anime-style illustration of a giant muscular brawler standing on cracked ground |
| swordsman | Original anime-style illustration of a calm swordsman in a grey robe with a sheathed sword |
| monk | Original anime-style illustration of a lean monk holding a handstand on a rock |

## Workflow (once the prompts are approved)

1. Generate **Warrior** at 3:4 (Nano Banana 2, then Pro at 2K if detail is
   lacking). Iterate until approved; it becomes the style anchor.
2. Generate the other five with the approved Warrior as a reference image,
   adding: *"Match the art style, line weight, cel shading, rim lighting,
   background and framing of the reference image. Do not copy the reference
   character's face, hair, build or outfit."*
3. Resize and export each image to 768×1024 WebP and save it to
   `public/archetypes/<id>.webp`.
4. Human IP check (below), then wire the images into `ArchetypeCard` and the
   landing page in place of the SVG silhouettes.

**Layout note for the swap:** the archetype card's art area is currently a
landscape crop (~310×208). A 3:4 portrait there needs `object-contain`
centred on `#0A0A0F`. That's another reason for a solid background that
matches the UI, so the edges disappear. The figure will render about 156 px
wide on a 375 px screen; if that's too small, the card art area should grow.

## IP review checklist (per image, by eye)

- [ ] No franchise or character name anywhere: prompt, file name, alt text,
      metadata.
- [ ] Hair + outfit + colour combination doesn't match any character you
      recognise (check against the "Must not resemble" list).
- [ ] No text, emblem, kanji or symbol on clothing or background.
- [ ] Reads as an adult; SFW.
- [ ] Matches the other five in style, framing and lighting.
- [ ] Background edges are solid `#0A0A0F` (no grey or vignette halo on the
      dark UI).
