# Quality Gates

## Before paid generation

- Product identity is clear: name, category, appearance, and at least one product image or explicit no-image strategy.
- Video type is selected: `brand`, `ecommerce`, or `hybrid`.
- User has confirmed paid image2/Kling submission.
- `brief.json` and `storyboard.json` pass script validation.
- Every shot has one purpose and one prompt job.
- Every shot has `beat` and scene selection. `voiceover`/`subtitle` are required only when `storyboard.narration.enabled=true`.
- Narration decision matches style: ecommerce/带货 generally has voiceover; advertising concept films, cinematic mood pieces, and explicitly silent videos generally do not.
- Narration delivery matches production needs: use local TTS for stable off-screen ecommerce narration; use Kling dialogue only for presenter/talking-head/person-speaking concepts or when explicitly requested; use subtitle-only when audio should stay off.
- Shot durations are rhythm-based, not mechanically equal. `duration_sec` is the final edit length; generation duration may be longer when provider limits require it.
- The storyboard has a global continuity rule for product identity, subject/model identity, wardrobe, lighting, camera rhythm, and transition logic.
- Apparel-like products have a selected model library entry and use image2 `product-model-fusion` for on-body/product-on-person frames.

## Keyframe QA

Accept a generated frame only when:
- Product shape, color, material, and scale match the reference.
- For apparel fusion, garment cut/color/material match the product image and the model identity/body remains stable.
- The image has no readable fake text, garbled logo, or accidental price labels.
- The shot composition supports the intended video motion.
- The generated frame matches the selected scene and still feels connected to adjacent shots.
- The frame matches target aspect ratio or can be safely cropped.
- There are no obvious hand/body/product deformations for ecommerce shots.

## Clip QA

Accept a clip only when:
- It satisfies the shot purpose.
- Product identity remains stable across the clip.
- Subject/model identity, wardrobe, product state, and scene logic connect to neighboring clips.
- Motion has a clean start and end.
- Clip motion follows the shot's `beat.transition_from_previous` and `beat.transition_to_next`.
- Duration is close enough for the edit plan.
- If generated duration is longer than planned, assembly trims to `duration_sec` without cutting off the intended action.
- No severe flicker, morphing, text artifacts, or unwanted camera shake.

## Retry policy

- Retry only failed shots.
- Change the smallest prompt surface that explains the failure.
- If product identity fails, strengthen source image use and identity constraints.
- If motion fails, simplify the action and remove competing scene details.
- If text/logos appear, move all text to post-production and add negative prompts.
- If shots feel unrelated, strengthen top-level `continuity`, reuse the same model/scene references, and simplify scene changes.
- If narration does not match visuals, revise `voiceover` and `subtitle` before regenerating TTS.

## Final edit QA

- Sum of accepted clip durations covers target duration.
- Aspect ratio matches target output.
- Clip order follows the storyboard.
- TTS audio exists when `narration.delivery=tts`.
- Generated clip audio is preserved when `narration.delivery=kling-dialogue` and no external audio is passed to assembly.
- Burned subtitles are readable, timed to shot boundaries, and do not cover the product.
- Final mp4 opens in `ffprobe`.
- Any overlays, captions, price labels, or brand marks are added in post-production, not generated inside image2 frames or Kling footage.
