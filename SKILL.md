---
name: product-video-factory
description: "商品视频工厂。Use when the user wants to turn product information plus product images into a full AI commercial/ecommerce video pipeline: analyze selling points, design storyboard shots, write image2 keyframe/closing-frame requests, validate generated frames, call the installed klingai skill for image-to-video clips, and edit clips into one final video. Triggers include 商品视频, 商品广告, 电商卖点视频, 带货视频, 产品分镜, image2 生图, 收帧图, image2video, 可灵生成视频, and 批量商品短视频."
---

# Product Video Factory

Build a production pipeline, not only prompt text. The agent handles product strategy and visual judgment; bundled scripts handle deterministic project scaffolding, JSON validation, scene-aware storyboard planning, image2 keyframe request generation, narration/TTS/subtitle assets, Kling video command generation, media inspection, QA reports, and final ffmpeg assembly.

Every stage must produce a concrete output artifact. Scripts write structured stage results under `results/` and maintain `results/index.json` so the next stage can be traced from files, not memory.

Asset reuse is mandatory: before every new generation run, check the persistent model and scene libraries for suitable assets. Generate new model or scene assets only when no suitable library match exists, and promote accepted generated assets back into the persistent library before finishing the run.

## Entry Points

Use this skill for:
- Product info + product image(s) -> complete video production plan.
- Selling-point analysis -> storyboard -> image2 keyframes -> Kling clips -> final edited mp4.
- Brand texture films, ecommerce proof videos, product demos, and short-form ads.
- Iterating generated frames/clips after QA failures.

For pure prompt-only requests, `product-video-prompt` may be enough. For any request that includes generation, validation, or final video assembly, use this skill.

## Credentials and Dependencies

- This skill does not bundle Kling credentials, API keys, tokens, account IDs, or resource-pack data.
- Video generation uses the installed `klingai` skill at `$CODEX_HOME/skills/klingai/scripts/kling.mjs` or `~/.codex/skills/klingai/scripts/kling.mjs`.
- Each user must configure their own Kling account before billable generation, for example:
  ```bash
  node ~/.codex/skills/klingai/scripts/kling.mjs account --bind-url
  ```
- Users may also configure credentials through the `klingai` skill's supported import/configure flows. Never copy credentials from another machine or include `~/.config/kling/.credentials` in this skill package.
- If `klingai` is missing, install/configure it first or pass a compatible script path with `--kling <path>` when running `kling-commands`.

## Workflow

1. **Create a run directory**
   ```bash
   node {baseDir}/scripts/factory.mjs init --out ./runs/<product-id>
   ```
   Put product images under `assets/input/`. Keep all generated frames, clips, QA notes, logs, and final exports inside this run directory.

2. **Write `brief.json`**
   Capture product facts, target platform, `scenario`, image paths, selling points, and constraints. Use `scenario: "ecommerce"` for 电商/带货, `scenario: "ad"` for 广告片, or `scenario: "promo"` for 宣传片. Use `references/schemas.md` only when you need the exact shape.

3. **Analyze the product**
   Identify category, audience, price position, visual memory points, top 3-5 selling points, proof moments, generation risks, and style direction. Infer missing non-critical fields from category; ask only when brand safety, product identity, or paid generation intent is unclear.

4. **Match persistent model and scene assets first**
   ```bash
   node {baseDir}/scripts/factory.mjs asset-match --brief ./runs/<product-id>/brief.json --write-brief
   ```
   This checks `assets/model-library/model-library.json` and `assets/scene-library/scene-library.json`, writes `results/01-asset-match.json`, and updates `brief.json` with the selected model, selected scene IDs, and library paths. Do this before storyboard planning and before any billable image2 generation. If `missing_assets` is empty, reuse the matched assets and skip model/scene generation.

5. **Create missing model assets only when needed**
   ```bash
   node {baseDir}/scripts/factory.mjs model-library-requests --out ./runs/<product-id>/assets/models
   ```
   Run this only when `asset-match` reports no suitable model. It writes image2 requests for model three-view assets across age groups: child, teen, young-adult, adult, mature, and senior. Submit the minimum missing requests, save outputs to the requested paths, and keep `model-library.json` in the run. After visual QA accepts the new model, promote it:
   ```bash
   node {baseDir}/scripts/factory.mjs asset-promote --type model --id <model-id> --source ./runs/<product-id>/assets/models/models/<model-id> --age-group <age> --gender <gender> --fit-categories "<category-list>"
   ```
   Read `references/model-library.md` before changing the age/gender coverage or adding a new reusable model profile.

6. **Create missing scene assets only when needed**
   ```bash
   node {baseDir}/scripts/factory.mjs scene-library-requests --out ./runs/<product-id>/assets/scenes --scenario ecommerce --category "<category>"
   ```
   Run this only when `asset-match` reports no suitable scenes or a desired scene exists only as a prompt without a generated reference image. Submit the minimum missing requests. After visual QA accepts a new scene, promote it:
   ```bash
   node {baseDir}/scripts/factory.mjs asset-promote --type scene --id <scene-id> --source ./runs/<product-id>/assets/scenes/generated/<scene-id>.png --scenario ecommerce --category "<category>" --roles "<role-list>"
   ```
   Read `references/scene-library.md` before adding new reusable scene presets.

7. **Plan continuous, narrated, scene-aware `storyboard.json`**
   ```bash
   node {baseDir}/scripts/factory.mjs plan-storyboard --brief ./runs/<product-id>/brief.json --out ./runs/<product-id>/storyboard.json
   ```
   The scenario controls shot structure: ecommerce proves selling points, ad creates an attention/memory arc, and promo builds a product/brand narrative. The storyboard must include `continuity`, per-shot `beat` transitions, `narration` decision fields, and `scene` selection so generated images and clips feel like one video. Read `references/scenario-profiles.md` when choosing or explaining a scenario.

8. **Refine `storyboard.json`**
   Each shot must include a single purpose, edit duration, source image references, beat/transition notes, selected scene, optional voiceover/subtitle text, `closing_frame_prompt`, `video_prompt`, `negative_prompt`, `image2` keyframe hints, and Kling video routing hints. `duration_sec` is the final edit length and can be uneven/fractional; `kling.generation_duration_sec` is the generated clip length and must satisfy provider limits. Keep prompts concise, natural-language, and typically under 500 Chinese characters before generated continuity/scene context is added.

9. **Validate before generation**
   ```bash
   node {baseDir}/scripts/factory.mjs validate-brief --brief ./runs/<product-id>/brief.json
   node {baseDir}/scripts/factory.mjs validate-storyboard --storyboard ./runs/<product-id>/storyboard.json
   ```

10. **Billable gate**
   image2 frame generation and Kling video submits may spend quota. Before any real submit, show the user the run directory, shot count, expected generated frames/clips, and commands or request summary. Do not submit speculative retries.

11. **Generate closing/key frames with image2**
   ```bash
   node {baseDir}/scripts/factory.mjs image2-requests --storyboard ./runs/<product-id>/storyboard.json
   ```
   This writes one request JSON per shot under `logs/image2-requests/`. Requests include continuity context, narration context only when narration is enabled, apparel model fusion inputs, and scene reference images when available. Submit those requests to image2, save each result to the request's `output_path`, then inspect frames visually and run media checks. If a real image2 CLI is available, pass `--image2-command <cmd>` to print executable commands.

12. **Generate video clips**
   Update `storyboard.json` with accepted frame paths, then:
   ```bash
   node {baseDir}/scripts/factory.mjs kling-commands --storyboard ./runs/<product-id>/storyboard.json --stage videos
   ```
   Generate each shot independently unless the storyboard explicitly calls for one continuous clip.

13. **Generate narration, TTS audio, and subtitles when enabled**
   ```bash
   node {baseDir}/scripts/factory.mjs narration-assets --storyboard ./runs/<product-id>/storyboard.json --tts say --voice Tingting
   ```
   The storyboard decides `narration.delivery`: `tts`, `kling-dialogue`, `subtitle-only`, or `none`. This command generates local TTS only for `delivery=tts`. For `delivery=kling-dialogue`, it writes `audio/voiceover.txt` plus subtitles but skips local TTS because Kling generates spoken audio from the video prompt. If the storyboard is a silent concept/ad film, the command records a disabled stage result and skips TTS/subtitle generation. Use `--tts none` when only script/subtitle files are needed.

14. **QA and retry**
   ```bash
   node {baseDir}/scripts/factory.mjs qa-report --storyboard ./runs/<product-id>/storyboard.json --out ./runs/<product-id>/qa/report.md
   node {baseDir}/scripts/factory.mjs inspect-media --storyboard ./runs/<product-id>/storyboard.json --stage all
   ```
   If a frame or clip fails, change only the failed shot prompt/negative prompt and retry that shot.

15. **Assemble final video**
    ```bash
    node {baseDir}/scripts/factory.mjs assemble --storyboard ./runs/<product-id>/storyboard.json --output ./runs/<product-id>/edit/final.mp4
    ```
    The script normalizes clips to the target aspect ratio and concatenates them with ffmpeg. For `delivery=tts`, add `--audio ./audio/voiceover.m4a --subtitles ./subtitles/voiceover.ass --burn-subtitles`. For `delivery=kling-dialogue`, do not pass external `--audio`; assembly preserves generated clip audio and can still burn subtitles. When ffmpeg lacks `ass/subtitles/drawtext`, the script falls back to rendering transparent subtitle PNGs with macOS Swift and overlaying them by shot timing.

## Decision Rules

- Choose `scenario=ecommerce` when the user emphasizes selling points, conversion, demo, proof, price, platform listing, or 带货.
- Choose `scenario=ad` when the user emphasizes 广告片, 投放, 品牌记忆点, 情绪钩子, or a short persuasive commercial.
- Choose `scenario=promo` when the user emphasizes 宣传片, 品牌/产品介绍, longer-form narrative, company/product value, or product story.
- Use one proof shot per selling point for ecommerce; add one lifestyle shot and one product hero closing shot.
- Use a 5-shot attention -> reveal -> emotion -> benefit -> closing arc for ad.
- Use a 5-shot context -> product -> advantages -> user value -> brand closing arc for promo.
- Always design shot-to-shot continuity: same product identity, model/subject identity, wardrobe, scene logic, camera direction, and rhythm unless the concept explicitly calls for a jump cut.
- Do not force equal shot lengths. Allocate `duration_sec` by storyboard rhythm: hooks can be shorter, proof/action/lifestyle shots can be longer, and closings should have enough hold time for subtitles/CTA. If a provider has a minimum generation duration, generate longer and trim in assembly.
- Decide narration and audio delivery by video style. Use `narration.mode: "auto"` and `narration.delivery: "auto"` by default: ecommerce/带货/卖点展示 usually enables voiceover with local TTS; presenter/talking-head/真人口播/模特说话 styles use Kling dialogue with `--sound on`; advertising concept films, cinematic mood pieces, and silent visual ads usually disable voiceover. Explicit `narration.enabled`, `narration.mode`, or `narration.delivery` always wins.
- Use `scene_library` when a matching scene exists. Scene references are supporting background inputs; product and model identity have priority over scene fidelity.
- Always run `asset-match` before storyboard planning. Reuse matched persistent assets when available; do not regenerate equivalent models or scenes just for convenience.
- If a new model or scene is generated and passes visual QA, run `asset-promote` before finishing so the asset becomes available to future videos.
- Keep brand/logo/price/text overlays for post-production; do not ask image2 or Kling to render readable text.
- For frame generation, default to image2. For video generation, prefer the installed `klingai` skill and check its subcommand help before adding flags.
- For apparel-like categories (服装, 童装, 女装, 男装, 鞋帽配饰), frame generation must use image2 `product-model-fusion`: source product image(s) + selected model three-view asset. Do not render apparel on an ungrounded synthetic person when a model library is available.

## Required Outputs

For every production run, produce or update:
- `brief.json`
- `storyboard.json`
- `qa/report.md`
- accepted frame paths
- accepted clip paths
- model library paths and selected model ID for apparel runs
- scene library paths and selected scene IDs
- asset match result and any promoted persistent asset IDs
- narration script and subtitle paths when narration is enabled; TTS audio path only when `narration.delivery=tts`
- `results/index.json`
- one `results/<stage>.json` per completed stage
- final mp4 path, when assembly is requested

Stage outputs:

| Stage | Required output |
| --- | --- |
| init | `results/00-init.json` |
| persistent asset match | `results/01-asset-match.json` |
| persistent asset promotion | `assets/model-library/asset-promote-result.json` or `assets/scene-library/asset-promote-result.json`; `results/01-asset-promote.json` when `--run-dir` is passed |
| model library | `assets/models/model-library.json`, `assets/models/requests/manifest.json`, `results/01-model-library.json` |
| scene library | `assets/scenes/scene-library.json`, `assets/scenes/requests/manifest.json`, `results/01-scene-library.json` |
| storyboard planning | `storyboard.json`, `results/02-storyboard-plan.json` |
| image2 frame requests | `logs/image2-requests/manifest.json`, `results/03-image2-requests.json` |
| media inspection | `results/04-media-inspect*.json` |
| Kling video commands | `logs/kling-video-commands.sh`, `results/05-kling-video-commands.json` |
| narration/TTS/subtitles | `audio/voiceover.txt`, subtitle files, `results/06-narration-assets.json`; `audio/voiceover.m4a` only for `delivery=tts` |
| QA report | `qa/report.md`, `results/06-qa-report.json` |
| final assembly | `edit/final.mp4`, `results/07-final-assembly.json` |

When reporting results to the user, include task IDs, local paths, and any URLs printed by Kling. Never print credentials or secret values.

## References

- `references/schemas.md`: exact `brief.json` and `storyboard.json` shapes.
- `references/model-library.md`: model library age groups, three-view requests, and apparel fusion rules.
- `references/scene-library.md`: reusable scene/background reference presets and scene fusion rules.
- `references/scenario-profiles.md`: ecommerce/ad/promo storyboard structures and when to choose each.
- `references/prompt-patterns.md`: brand/ecommerce shot and prompt patterns.
- `references/quality-gates.md`: visual, media, and retry QA gates.
