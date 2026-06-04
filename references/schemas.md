# Schemas

Use these schemas as contracts for the scripts. JSON may include extra fields, but required fields must be present.

## brief.json

```json
{
  "project_id": "black-puffer-vest-ad",
  "scenario": "ecommerce",
  "video_type": "ecommerce",
  "target_platform": "douyin",
  "aspect_ratio": "9:16",
  "target_duration_sec": 15,
  "language": "zh-CN",
  "product": {
    "name": "黑色羽绒马甲",
    "category": "童装",
    "brand": "",
    "appearance": "黑色短款羽绒马甲，蓬松绗缝，拉链门襟",
    "price_positioning": "中端实穿款",
    "target_audience": "关注保暖、耐穿和日常搭配的家长",
    "selling_points": [
      {
        "name": "轻暖蓬松",
        "evidence": "绗缝充绒视觉明显，适合秋冬叠穿",
        "priority": 1
      }
    ],
    "must_keep": ["版型", "颜色", "绗缝结构"],
    "must_avoid": ["产品变形", "夸张折扣话术", "文字乱码"]
  },
  "assets": [
    {
      "id": "product_main",
      "role": "product",
      "path": "./assets/input/product.jpg",
      "notes": "main product reference"
    }
  ],
  "model_library": {
    "enabled": true,
    "library_path": "./assets/models/model-library.json",
    "selected_model_id": "child-neutral",
    "selected_view": "front",
    "selection_hint": "match product category and target audience"
  },
  "scene_library": {
    "enabled": true,
    "library_path": "./assets/scenes/scene-library.json",
    "selection_strategy": "auto",
    "preferred_scene_ids": [],
    "allow_scene_reference_fusion": true
  },
  "narration": {
    "mode": "auto",
    "enabled": null,
    "delivery": "auto",
    "voice_style": "自然、轻快、可信的电商解说"
  },
  "style": {
    "tone": "高级童装街拍",
    "palette": ["黑色", "米白", "暖金"],
    "lighting": "柔和棚拍加轻微街头自然光",
    "camera": "慢推进，中近景，产品始终清晰"
  },
  "constraints": {
    "budget_confirmed": false,
    "no_text_in_generation": true,
    "requires_user_confirmation_before_submit": true
  }
}
```

## storyboard.json

```json
{
  "project_id": "black-puffer-vest-ad",
  "run_dir": "./runs/black-puffer-vest-ad",
  "scenario": "ecommerce",
  "video_type": "ecommerce",
  "product": {
    "name": "黑色羽绒马甲",
    "category": "童装",
    "target_audience": "关注保暖、耐穿和日常搭配的家长"
  },
  "aspect_ratio": "9:16",
  "target_width": 1080,
  "target_height": 1920,
  "target_duration_sec": 15,
  "continuity": {
    "narrative_logline": "5 个镜头讲清家长为什么需要黑色羽绒马甲。",
    "visual_identity": "黑色亮面短款儿童羽绒马甲，横向绗缝，连帽高领，中央黑色拉链，左下角小标。",
    "subject_consistency": "同一位儿童模特，同一套内搭和发型，同一件商品跨镜头保持一致。",
    "rhythm": "先证明卖点，再进入真实场景，最后产品定格收口。",
    "camera_language": "竖屏中近景慢推进，转场以相近景别和自然动作承接。",
    "lighting_language": "柔和自然光",
    "platform": "douyin"
  },
  "narration": {
    "mode": "auto",
    "enabled": true,
    "delivery": "tts",
    "tts_enabled": true,
    "kling_dialogue_enabled": false,
    "language": "zh-CN",
    "voice_style": "自然、轻快、可信的电商解说",
    "decision_reason": "ecommerce/带货 videos default to voiceover for selling proof",
    "total_script": "轻暖蓬松，秋冬上学保暖但不压身。\n耐脏百搭，校服卫衣牛仔裤都能叠穿。",
    "tts_output_path": "./audio/voiceover.m4a",
    "subtitle_srt_path": "./subtitles/voiceover.srt",
    "subtitle_ass_path": "./subtitles/voiceover.ass"
  },
  "global_negative_prompt": "穿模，人物变脸，产品变形，颜色失真，文字乱码，Logo变形，镜头抖动",
  "frame_generation": {
    "provider": "image2",
    "mode": "image-to-image",
    "request_dir": "./logs/image2-requests",
    "output_dir": "./frames/generated",
    "reference_weight": 0.7
  },
  "model_library": {
    "enabled": true,
    "library_path": "./assets/models/model-library.json",
    "selected_model_id": "child-neutral",
    "selected_view": "front",
    "fusion_categories": ["服装", "童装", "女装", "男装", "内衣", "运动服", "鞋", "帽子", "配饰"]
  },
  "scene_library": {
    "enabled": true,
    "library_path": "./assets/scenes/scene-library.json",
    "selection_strategy": "auto",
    "preferred_scene_ids": [],
    "allow_scene_reference_fusion": true
  },
  "post_production": {
    "overlay_plan": "品牌名、卖点标签和价格全部后期叠加",
    "music": "清爽明快，80-100 BPM",
    "subtitles": "narration-assets 生成字幕，assemble 阶段烧录"
  },
  "stage_results": {
    "index_path": "./results/index.json"
  },
  "shots": [
    {
      "id": "s01",
      "title": "轻暖蓬松证明",
      "purpose": "证明马甲轻暖蓬松",
      "beat": {
        "index": 1,
        "role": "selling-proof",
        "rhythm": "开场 0.5 秒给商品明确识别，随后进入动作。",
        "transition_from_previous": "开场镜头，无需承接。",
        "transition_to_next": "结尾保留商品清晰可见，并用轻微运动引到下一镜头。"
      },
      "duration_sec": 2.8,
      "product_presence": "visible",
      "source_images": ["product_main"],
      "model": {
        "required": true,
        "model_id": "child-neutral",
        "view": "front",
        "library_path": "./assets/models/model-library.json"
      },
      "scene": {
        "scene_id": "school-gate-autumn",
        "role": "background-reference",
        "library_path": "./assets/scenes/scene-library.json",
        "reference_image_path": "./assets/scenes/generated/school-gate-autumn.png",
        "prompt": "秋冬清晨校门外，干净砖墙和栏杆背景，少量落叶，柔和自然光。",
        "fusion_mode": "scene-background-fusion"
      },
      "voiceover": "轻暖蓬松，秋冬上学保暖但不压身。",
      "subtitle": "轻暖蓬松，秋冬上学保暖但不压身",
      "closing_frame_prompt": "竖屏 9:16，黑色羽绒马甲挂在暖色棚拍背景中，绗缝蓬松清晰，拉链居中，柔和侧逆光，产品比例真实，画面无文字。",
      "video_prompt": "竖屏 9:16，4 秒。黑色羽绒马甲在暖色棚拍背景中轻微转动，绗缝蓬松度和厚度清晰可见，镜头缓慢推进，柔和侧逆光勾勒边缘，产品版型颜色保持一致，画面无文字。",
      "negative_prompt": "产品变形，颜色失真，绗缝消失，文字乱码，Logo变形，背景杂乱，镜头抖动",
      "image2": {
        "mode": "product-model-fusion",
        "reference_weight": 0.7,
        "size": "1080x1920",
        "output_path": "./frames/generated/s01/frame.png"
      },
      "kling": {
        "video_model": "kling-v3-omni",
        "route": "image-to-video",
        "generation_duration_sec": 3,
        "sound": "off"
      },
      "frame_path": "",
      "clip_path": "",
      "qa_status": "pending"
    }
  ]
}
```

## Field notes

- `assets[].path`, `frame_path`, and `clip_path` may be absolute or relative to `run_dir`.
- `scenario`: `ecommerce` for 电商/带货, `ad` for 广告片, `promo` for 宣传片. `video_type` remains for compatibility and is derived from scenario by `plan-storyboard`.
- `shots[].source_images` must reference `assets[].id`.
- `model_library`: path to reusable model three-view assets. Use `model-library-requests` to create request JSON and the library manifest.
- `scene_library`: path to reusable scene/background references. Use `scene-library-requests` to create scene request JSON and the library manifest.
- `continuity`: global narrative, visual identity, subject consistency, rhythm, camera, and lighting rules. `image2-requests` and `kling-commands` inject this into shot prompts.
- `narration`: global narration decision and output paths. `mode: "auto"` lets the planner decide whether narration exists; `delivery: "auto"` lets it choose `tts`, `kling-dialogue`, `subtitle-only`, or `none`. Ecommerce usually enables voiceover with local TTS; presenter/talking-head/真人口播 styles use Kling dialogue; concept/ad films may disable narration. Explicit `enabled`, `mode`, or `delivery` overrides auto.
- Apparel categories should use `shots[].image2.mode = "product-model-fusion"` and `shots[].model.required = true`.
- `shots[].beat`: per-shot rhythm role and transition notes. Required for coherent multi-shot videos.
- `shots[].duration_sec`: final edit duration for that shot. It may be uneven or fractional.
- `shots[].kling.generation_duration_sec`: provider generation duration. It can be longer than `duration_sec`; assembly trims the clip back to `duration_sec`.
- `shots[].scene`: selected scene preset and optional reference image path. If the reference image exists, `image2-requests` includes it as `scene_images`.
- `shots[].voiceover` and `shots[].subtitle`: generated during storyboard planning only when `narration.enabled=true`; silent/concept films leave them empty.
- `product_presence`: `none`, `visible`, `detail`, or `lifestyle`.
- `qa_status`: `pending`, `accepted`, `retry`, or `rejected`.
- `frame_generation.provider` defaults to `image2`; frame generation should produce image2 request JSON, not Kling image commands.
- `shots[].image2.mode`: `text-to-image`, `image-to-image`, or `product-model-fusion`.
- `shots[].image2.output_path` is the intended save path for the image2 result.
- Use `frame_path` only after the generated image2 keyframe has passed visual QA. It usually equals `shots[].image2.output_path`.
- Use `clip_path` only after a generated clip has passed visual QA.
- `results/index.json` and `results/<stage>.json` are required trace artifacts for stage-by-stage output.
- Final assembly can include narration and burned subtitles:
  `assemble --audio ./audio/voiceover.m4a --subtitles ./subtitles/voiceover.ass --burn-subtitles`.
