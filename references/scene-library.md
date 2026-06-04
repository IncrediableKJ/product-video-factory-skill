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

## Reuse before generation

Before generating any new scene asset, run:

```bash
node {baseDir}/scripts/factory.mjs asset-match --brief ./runs/<product-id>/brief.json --write-brief
```

Only generate scene requests when `results/01-asset-match.json` reports no matching generated scene reference, or when the storyboard needs a role/location that the persistent library cannot cover. If a matched scene has `reference_image_path` and the file exists, reuse it and do not create a duplicate scene.

After a new scene passes visual QA, promote it into the persistent scene library:

```bash
node {baseDir}/scripts/factory.mjs asset-promote \
  --type scene \
  --id <scene-id> \
  --source ./runs/<product-id>/assets/scenes/generated/<scene-id>.png \
  --scenario <ecommerce|ad|promo> \
  --category "<category-list>" \
  --roles "<role-list>" \
  --season-tags "<season-tags>" \
  --location-tags "<location-tags>" \
  --tone-tags "<tone-tags>" \
  --best-for "<usage-or-selling-point-tags>" \
  --prompt "<background-only prompt>" \
  --negative-prompt "<avoid list>"
```

Use stable IDs that describe location, season, and visual purpose, such as `school-gate-autumn` or `premium-product-dark`.

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

## Persistent reusable assets

The skill may include generated reusable scene assets under:

```text
assets/scene-library/scene-library.json
assets/scene-library/generated/<scene-id>.png
```

For future videos, prefer the persistent scene library when the generated reference image matches the scenario, shot role, product category, usage scene, season, and tone. The current reusable scenes are:

| Scene ID | Best match | Shot roles |
| --- | --- | --- |
| `clean-studio-gray` | all categories; product hero, details, opening, closing | opening, proof, closing, product-hero, detail |
| `school-gate-autumn` | 童装/儿童用品; 秋冬上学、耐脏百搭、校服/卫衣叠穿 | proof, lifestyle, context, daily-use |
| `outdoor-playground-autumn` | 童装/儿童用品/运动; 户外玩耍、活动方便 | proof, lifestyle, motion, comfort |
| `home-entryway-winter` | 童装/服装/鞋包; 日常叠穿、秋冬出门、保暖 | lifestyle, context, warmth, daily-use |

Use these fields in `brief.json` when reusing it:

```json
{
  "scene_library": {
    "enabled": true,
    "library_path": "/absolute/path/to/product-video-factory/assets/scene-library/scene-library.json",
    "selection_strategy": "auto",
    "preferred_scene_ids": ["school-gate-autumn", "outdoor-playground-autumn"],
    "allow_scene_reference_fusion": true
  }
}
```

Selection order: video scenario -> shot role -> product category -> usage scenario -> season -> tone and lighting. If no generated reference matches, use the closest prompt-only preset and generate the missing scene before final frame generation.
