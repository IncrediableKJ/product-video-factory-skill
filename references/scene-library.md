# Scene Library

Use a scene library when the product video needs consistent environments across image generation.

## Purpose

- Keep frames visually related across shots.
- Reuse strong ecommerce/ad/promo environments instead of reinventing a scene prompt per shot.
- Provide optional background/reference images for image2 scene-background-fusion.

## Default command

```bash
node {baseDir}/scripts/factory.mjs scene-library-requests \
  --out ./runs/<product-id>/assets/scenes \
  --scenario ecommerce \
  --category "<category>"
```

This writes:
- `assets/scenes/scene-library.json`
- `assets/scenes/requests/<scene-id>.json`
- `assets/scenes/requests/manifest.json`
- `results/01-scene-library.json`

Generate the requested scene images only when the storyboard can benefit from reusable scene references. Save outputs under `assets/scenes/generated/<scene-id>.png`.

## Selection Rules

- Ecommerce: choose practical proof scenes first, such as studio, school route, home entryway, outdoor play, street daily-use context.
- Ad: choose fewer, stronger visual motifs, such as dark product light, cinematic studio, or emotional lifestyle scenes.
- Promo: choose coherent context scenes that can support a beginning, product entry, user value, and closing.
- For apparel and person-based shots, scene identity must not override model identity, garment fidelity, or product shape/color/material.
- If a scene reference image exists, `image2-requests` includes it in `scene_images` and `source_images`.
- If the reference image does not exist, `image2-requests` still includes `scene.prompt`, so the generated keyframe follows the selected environment.

## Adding Presets

Scene presets should include:

```json
{
  "id": "school-gate-autumn",
  "title": "秋冬校门上学路",
  "scenarios": ["ecommerce", "promo"],
  "categories": ["童装", "儿童"],
  "roles": ["proof", "lifestyle", "context"],
  "prompt": "竖屏 9:16，秋冬清晨校门外或校园门口街区...",
  "negative_prompt": "拥挤人群，可读校名，广告字..."
}
```

Keep scene prompts background-focused. Do not put the product, brand copy, price, or readable slogans in scene reference prompts.
