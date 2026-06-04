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

## Selection heuristics

- `童装`, `儿童`, `孩子` -> `child-neutral` unless user specifies gender.
- `青少年`, `学生` -> `teen-neutral`.
- `女装`, `女性`, `女生` -> prefer `female`.
- `男装`, `男性`, `男生` -> prefer `male`.
- unspecified adult apparel -> `young-adult-neutral`.

If the selected model is missing from the actual library, generate the missing model request first or choose an available model explicitly in `brief.json.model_library.selected_model_id`.
