# Prompt Patterns

## Brand film

Use when the goal is tone, memory, texture, and brand recall. Prefer 5 independent shots for a 15-second film:

| Shot | Role | Product |
| --- | --- | --- |
| 1 | atmosphere opening | none |
| 2 | material/texture metaphor | none |
| 3 | product reveal | visible |
| 4 | product detail motion | detail |
| 5 | clean hero closing | visible |

Rules:
- Shots 1 and 2 should not show the product.
- Use organic motion: liquid, mist, light sweep, fabric, particles, ingredient movement.
- Shot 5 should leave empty space for logo/text added in editing.
- Do not ask the model to generate readable text.

## Ecommerce proof video

Use when the goal is conversion, demo, proof, platform listing, or selling point display.

Structure:
- One shot per selling point, 3-5 seconds each.
- One lifestyle/use-case shot.
- One product hero closing shot.

Rules:
- Each shot proves one selling point only.
- Make actions concrete with a clear start and end.
- Use ordinary believable bodies/hands/scenes unless luxury branding is explicit.
- Keep the same model/wardrobe/product identity across all shots unless the storyboard intentionally changes users.
- Connect shots with explicit beat notes: what carries over, what changes, and where the next shot should begin.
- Use scene references when they support the proof moment: studio for detail/proof, school/home/street/playground for lifestyle and use-case proof.
- Negative prompts must name the category's common failures.

## Prompt style

Use natural-language paragraphs:

For image2 keyframes:

`[global continuity] + [shot transition] + [aspect ratio] + [product/reference identity] + [final composition] + [scene] + [lighting] + [style] + [no text constraint]`

For image2 apparel fusion:

`[global continuity] + [selected model age/body/view] + [product garment identity] + [how garment fits the model] + [scene reference if available] + [lighting] + [preserve product cut/color/material] + [no text constraint]`

For Kling video clips:

`[shot transition] + [aspect ratio and duration] + [subject/product] + [scene] + [action] + [camera movement] + [lighting] + [style] + [identity constraints]`

For narration/subtitles:

`[one selling point or narrative idea] + [short visual proof]`

Keep each shot's narration short enough to fit its duration. Put readable text into subtitles/post-production, not image2 frames.

Delivery rules:
- `tts`: keep video prompts visual-only; generate off-screen narration in `narration-assets`.
- `kling-dialogue`: append explicit speech to Kling video prompts, for example `镜头内人物自然口播，中文清晰说出：“...”`; use `--sound on` and preserve generated clip audio in assembly.
- `subtitle-only`: generate subtitle files but no audio.
- `none`: keep shot `voiceover` and `subtitle` empty.

Avoid tag blocks. Avoid long comma-only prompt piles. Keep each image2 or Kling prompt focused enough that one shot has one visual job.

## Common negative prompts

Brand/product:
`产品变形，瓶身变形，颜色失真，材质静止无动态，文字乱码，Logo变形，画面杂乱，镜头抖动`

Ecommerce/person:
`穿模，人物变脸，穿搭变化，发型变化，手部畸形，手指粘连，多余手指，产品变形，颜色失真，产品漂浮，文字乱码，Logo变形，镜头抖动`

Category additions:
- Apparel: `面料透明，版型走样，身材夸张，缝线错乱`
- Beauty: `嘴唇变形，眼部变形，妆色失真，手部变形`
- Food: `食物变形，颜色不自然，摆盘混乱，不可食用质感`
- 3C: `屏幕文字乱码，产品比例失调，接口错位，反光过曝`
