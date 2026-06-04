# 商品视频工厂

这个项目用于把商品资料和商品图片转成完整的 AI 电商/广告视频生产流程。它不是单纯生成提示词，而是把「商品分析、场景/模特资产、分镜设计、image2 生图、Kling 图生视频、解说/字幕、成片组装、QA 检查」封装成一个可复用的 Codex skill。

当前仓库用于分发 `product-video-factory` skill 源码。本地开发工作区中还保留了一次童装黑色羽绒马甲的视频生产样例和打包产物，但生成视频、运行产物、`node_modules`、`.venv` 和账号凭据不建议提交到 Git。

## 目录结构

```text
.
├── SKILL.md                 # skill 主说明和工作流
├── agents/openai.yaml       # skill 展示元数据
├── assets/                  # 可复用持久模特库和场景库
├── references/              # 分镜、场景、模特、质量门等参考文档
├── scripts/factory.mjs      # 流程脚本
└── README.md                # 项目说明
```

本地开发工作区可能还包含：

```text
dist/                         # 本地打包产物
runs/                         # 商品视频流程运行产物
black-puffer-vest/            # HyperFrames 示例成片工程
```

## 能做什么

- 根据商品名称、品类、卖点、使用场景和商品图片生成视频生产方案。
- 自动判断视频类型：电商带货、广告概念片、品牌/产品宣传片。
- 生成连续分镜，而不是互不关联的单镜头提示词。
- 支持非均等镜头长度，根据节奏分配每个分镜时长。
- 支持场景库，在生图阶段融合适合的电商、广告或宣传片场景。
- 支持模特库，按年龄段生成三视图；服装类商品可用 image2 做商品与模特融合。
- 每次生成前先匹配持久素材库；没有合适素材时再生成，并把验收通过的新素材沉淀回库。
- 根据视频风格决定是否需要解说词、TTS、字幕或 Kling 口播。
- 生成 image2 请求、Kling 命令、字幕文件、QA 报告和最终 mp4。

## 安装 Skill

推荐直接 clone 到使用者自己的 Codex skills 目录：

```bash
git clone https://github.com/IncrediableKJ/product-video-factory-skill.git \
  ~/.codex/skills/product-video-factory
```

安装后目录应类似：

```text
~/.codex/skills/product-video-factory/
├── SKILL.md
├── agents/openai.yaml
├── assets/
├── references/
└── scripts/factory.mjs
```

如果使用本地生成的 zip 包，也可以解压安装：

```bash
unzip dist/product-video-factory-skill-*.zip -d ~/.codex/skills
```

## Kling 账号配置

skill 包不会包含任何 Kling 密钥、token、账号 ID 或资源包信息。每个使用者都需要自己配置 Kling 账号。

如果已经安装 `klingai` skill，可以执行：

```bash
node ~/.codex/skills/klingai/scripts/kling.mjs account --bind-url
```

凭据通常保存在使用者自己的本机配置中，例如 `~/.config/kling/.credentials`。不要把这个文件放进项目、zip 包或共享目录。

## 标准流程

以下命令中的 `<run-id>` 可以替换成具体商品名，例如 `black-puffer-vest-ecommerce`。

### 1. 初始化运行目录

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs init \
  --out ./runs/<run-id>
```

把商品图片放到：

```text
runs/<run-id>/assets/input/
```

### 2. 准备商品 brief

在 `runs/<run-id>/brief.json` 中填写商品资料。最小示例：

```json
{
  "product_name": "黑色羽绒马甲",
  "category": "童装外套",
  "scenario": "ecommerce",
  "selling_points": ["轻暖蓬松", "耐脏百搭", "活动方便"],
  "usage_scenarios": ["秋冬上学", "户外玩耍", "日常叠穿"],
  "product_images": ["assets/input/product.jpg"],
  "target_platform": "电商短视频",
  "style": "清爽真实、童装日常、卖点明确"
}
```

常用 `scenario`：

- `ecommerce`：电商卖点、带货、种草、商品证明。
- `ad`：广告概念片、品牌记忆点、情绪化投放。
- `promo`：品牌/产品宣传片、介绍型叙事。

### 3. 匹配持久素材库

每次生成前先匹配持久模特库和场景库：

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs asset-match \
  --brief ./runs/<run-id>/brief.json \
  --write-brief
```

该步骤会输出：

```text
runs/<run-id>/results/01-asset-match.json
```

如果 `missing_assets` 为空，后续直接复用已匹配的模特和场景，不需要重新生成素材。

### 4. 生成缺失的模特库请求

仅当 `asset-match` 报告没有合适模特时再生成。

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs model-library-requests \
  --out ./runs/<run-id>/assets/models
```

该步骤会输出各年龄段模特三视图的 image2 请求。用 image2 生成后，把结果保存到请求中指定的路径。通过 QA 的新模特需要沉淀到持久库：

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs asset-promote \
  --type model \
  --id <model-id> \
  --source ./runs/<run-id>/assets/models/models/<model-id> \
  --age-group <age-group> \
  --gender <female|male|neutral> \
  --fit-categories "<category-list>"
```

### 5. 生成缺失的场景库请求

仅当 `asset-match` 报告没有合适场景，或已有场景只有 prompt 没有参考图时再生成。

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs scene-library-requests \
  --out ./runs/<run-id>/assets/scenes \
  --scenario ecommerce \
  --category "童装外套"
```

通过 QA 的新场景需要沉淀到持久库：

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs asset-promote \
  --type scene \
  --id <scene-id> \
  --source ./runs/<run-id>/assets/scenes/generated/<scene-id>.png \
  --scenario ecommerce \
  --category "<category-list>" \
  --roles "<role-list>"
```

### 6. 生成分镜

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs plan-storyboard \
  --brief ./runs/<run-id>/brief.json \
  --out ./runs/<run-id>/storyboard.json
```

分镜会包含：

- 每个镜头的目的和节奏。
- 非均等镜头时长。
- 镜头之间的连续性设计。
- 场景选择。
- image2 关键帧提示。
- Kling 图生视频提示。
- 解说词/字幕/口播策略。

### 7. 校验 brief 和分镜

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs validate-brief \
  --brief ./runs/<run-id>/brief.json

node ~/.codex/skills/product-video-factory/scripts/factory.mjs validate-storyboard \
  --storyboard ./runs/<run-id>/storyboard.json
```

### 8. 生成 image2 请求

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs image2-requests \
  --storyboard ./runs/<run-id>/storyboard.json
```

输出位置：

```text
runs/<run-id>/logs/image2-requests/
```

服装类商品会优先使用 `product-model-fusion` 思路：商品图、模特图、场景图一起进入 image2 请求。

### 9. 生成 Kling 视频命令

在 image2 关键帧完成并写回 `storyboard.json` 后，生成 Kling 命令：

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs kling-commands \
  --storyboard ./runs/<run-id>/storyboard.json \
  --stage videos
```

输出命令脚本：

```text
runs/<run-id>/logs/kling-video-commands.sh
```

执行脚本前请确认镜头数量、预计消耗和账号资源包。

### 10. 生成解说、TTS 和字幕

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs narration-assets \
  --storyboard ./runs/<run-id>/storyboard.json \
  --tts say \
  --voice Tingting
```

流程会根据视频风格自动判断：

- 电商带货视频通常生成解说词、TTS 和字幕。
- 真人口播或模特说话风格可使用 Kling prompt 显式说话，不一定生成本地 TTS。
- 广告概念大片或纯视觉品牌片可以不生成解说词。

### 11. 检查素材和生成 QA 报告

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs inspect-media \
  --storyboard ./runs/<run-id>/storyboard.json \
  --stage all

node ~/.codex/skills/product-video-factory/scripts/factory.mjs qa-report \
  --storyboard ./runs/<run-id>/storyboard.json \
  --out ./runs/<run-id>/qa/report.md
```

### 12. 组装最终视频

无本地 TTS 时：

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs assemble \
  --storyboard ./runs/<run-id>/storyboard.json \
  --output ./runs/<run-id>/edit/final.mp4
```

使用本地 TTS 并烧字幕时：

```bash
node ~/.codex/skills/product-video-factory/scripts/factory.mjs assemble \
  --storyboard ./runs/<run-id>/storyboard.json \
  --output ./runs/<run-id>/edit/final.mp4 \
  --audio ./runs/<run-id>/audio/voiceover.m4a \
  --subtitles ./runs/<run-id>/subtitles/voiceover.ass \
  --burn-subtitles
```

## 每个环节的输出

```text
runs/<run-id>/
├── brief.json
├── storyboard.json
├── assets/
│   ├── input/
│   ├── models/
│   └── scenes/
├── frames/
├── clips/
├── logs/
│   ├── image2-requests/
│   └── kling-video-commands.sh
├── audio/
├── subtitles/
├── qa/report.md
├── edit/final.mp4
└── results/
    ├── index.json
    └── *.json
```

`results/index.json` 会记录每个阶段的结果文件，方便追踪流程进度。

## 当前样例

本地开发工作区中曾生成过一个童装黑色羽绒马甲样例：

```text
runs/black-puffer-vest-ecommerce-20260604-172512/
```

最终成片位置：

```text
runs/black-puffer-vest-ecommerce-20260604-172512/edit/final.mp4
```

本地工作区另有一个 HyperFrames 示例工程：

```text
black-puffer-vest/
```

可进入该目录运行：

```bash
npm run dev
npm run check
npm run render
```

## 重新打包 Skill

如需重新生成 zip，可在确认 skill 校验通过后执行：

```bash
node --check ~/.codex/skills/product-video-factory/scripts/factory.mjs
python ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  ~/.codex/skills/product-video-factory

cd ~/.codex/skills
zip -qr /path/to/product-video-factory-skill.zip product-video-factory \
  -x "*/.DS_Store" "*/__MACOSX/*" "*/node_modules/*" "*/.git/*"
```

打包后建议再做一次密钥扫描，确认没有包含 Kling 凭据或其他 token。

## 安全注意事项

- 不要提交或分发 Kling 密钥、账号凭据、资源包详情。
- 不要把 `~/.config/kling/.credentials` 放进 skill 包。
- image2 和 Kling 生成会消耗资源，批量提交前需要明确镜头数、帧数和视频数。
- 失败重试时只重试失败镜头，避免无谓消耗。
