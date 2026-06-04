# Model Library

Use a reusable image2-generated model library whenever apparel-like products need on-body frames.

## Generate requests

```bash
node {baseDir}/scripts/factory.mjs model-library-requests --out ./runs/<product-id>/assets/models
```

Default coverage:

| Age group | Age range | Purpose |
| --- | --- | --- |
| child | 6-9 | 童装、儿童用品 |
| teen | 13-17 | 青少年服饰 |
| young-adult | 20-30 | 大多数女装/男装/运动服 |
| adult | 31-45 | 通勤、家庭、成熟消费人群 |
| mature | 46-60 | 熟龄服饰、功能服饰 |
| senior | 61-75 | 银发用品、舒适服饰 |

Default genders: `female`, `male`, `neutral`.

Each generated model has three image2 requests:

- `front`: 正面全身站姿
- `side`: 侧面全身站姿
- `back`: 背面全身站姿

The command writes:

- `model-library.json`
- `requests/<model-id>-front.json`
- `requests/<model-id>-side.json`
- `requests/<model-id>-back.json`
- expected outputs under `models/<model-id>/<view>.png`

## Apparel fusion rule

When `product.category` matches apparel-like products such as `服装`, `童装`, `女装`, `男装`, `运动服`, `鞋`, `帽子`, or `配饰`, `plan-storyboard` should set frame requests to:

```json
{
  "image2": {
    "mode": "product-model-fusion"
  },
  "model": {
    "required": true,
    "model_id": "child-neutral",
    "view": "front"
  }
}
```

The image2 request will include:

- `product_images`: product reference image paths.
- `model_images`: selected model view image paths from `model-library.json`.
- `fusion`: instructions to preserve garment cut, color, material, and model identity.

## Reuse before generation

Before generating any new model asset, run:

```bash
node {baseDir}/scripts/factory.mjs asset-match --brief ./runs/<product-id>/brief.json --write-brief
```

Only generate model requests when `results/01-asset-match.json` reports a missing model. If a matched model has the required view, reuse it for `product-model-fusion` and do not create a duplicate model.

After a new model passes visual QA, promote it into the persistent library:

```bash
node {baseDir}/scripts/factory.mjs asset-promote \
  --type model \
  --id <model-id> \
  --source ./runs/<product-id>/assets/models/models/<model-id> \
  --age-group <age-group> \
  --gender <female|male|neutral> \
  --fit-categories "<category-list>" \
  --audience-tags "<audience-tags>" \
  --scenario-tags "<scenario-list>" \
  --tone-tags "<tone-tags>"
```

Keep promoted model IDs descriptive enough for matching, such as `child-neutral-casual-6-8` or `young-adult-female-athleisure-20-30`.

## Selection heuristics

- `童装`, `儿童`, `孩子` -> `child-neutral` unless user specifies gender.
- `青少年`, `学生` -> `teen-neutral`.
- `女装`, `女性`, `女生` -> prefer `female`.
- `男装`, `男性`, `男生` -> prefer `male`.
- unspecified adult apparel -> `young-adult-neutral`.

If the selected model is missing from the actual library, generate the missing model request first or choose an available model explicitly in `brief.json.model_library.selected_model_id`.

## Persistent reusable assets

The skill may include generated reusable model assets under:

```text
assets/model-library/model-library.json
assets/model-library/models/<model-id>/<view>.png
```

For future videos, prefer the persistent library when it matches the product audience and category. The current reusable seed model is:

| Model ID | Best match | Views | Notes |
| --- | --- | --- | --- |
| `child-neutral-casual-6-8` | 童装、儿童外套、羽绒马甲、上学/户外/日常叠穿 | front / side / back | Cream sweatshirt, dark jeans, simple sneakers; clean age-appropriate styling |

Use these fields in `brief.json` when reusing it:

```json
{
  "model_library": {
    "enabled": true,
    "library_path": "/absolute/path/to/product-video-factory/assets/model-library/model-library.json",
    "selected_model_id": "child-neutral-casual-6-8",
    "selected_view": "front"
  }
}
```

Matching should consider, in order: product target audience, product category, video scenario, desired body/pose coverage, wardrobe compatibility, and visual tone. If only the alias `child-neutral` appears in an old storyboard, map it to `child-neutral-casual-6-8` when using the persistent library.
