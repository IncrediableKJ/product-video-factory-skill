#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const defaultKling = path.join(codexHome, "skills", "klingai", "scripts", "kling.mjs");

function usage() {
  console.log(`Product Video Factory

Usage:
  node factory.mjs init --out <run-dir> [--name <project-id>] [--brief <brief.json>]
  node factory.mjs model-library-requests --out <dir> [--age-groups <list>] [--genders <list>] [--image2-command <cmd>]
  node factory.mjs scene-library-requests --out <dir> [--scenario <ecommerce|ad|promo>] [--category <category>] [--image2-command <cmd>]
  node factory.mjs plan-storyboard --brief <brief.json> --out <storyboard.json> [--scenario <ecommerce|ad|promo>] [--run-dir <dir>]
  node factory.mjs validate-brief --brief <brief.json>
  node factory.mjs validate-storyboard --storyboard <storyboard.json>
  node factory.mjs image2-requests --storyboard <storyboard.json> [--out <dir>] [--image2-command <cmd>]
  node factory.mjs kling-commands --storyboard <storyboard.json> --stage videos [--kling <path>]
  node factory.mjs inspect-media --storyboard <storyboard.json> [--stage <frames|clips|all>] [--strict]
  node factory.mjs narration-assets --storyboard <storyboard.json> [--out-dir <dir>] [--tts <say|none>] [--voice <name>]
  node factory.mjs qa-report --storyboard <storyboard.json> --out <report.md>
  node factory.mjs assemble --storyboard <storyboard.json> --output <final.mp4> [--audio <music.ext>] [--subtitles <file.ass|file.srt>] [--burn-subtitles]

All paths may be absolute or relative to the current working directory.
`);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function requireArg(args, key) {
  const value = args[key];
  if (!value || value === true) {
    throw new Error(`Missing required --${key}`);
  }
  return String(value);
}

async function readJson(file) {
  const raw = await fs.readFile(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error.message}`);
  }
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeStageResult(runDir, stage, payload) {
  if (!runDir) return "";
  const resolvedRunDir = path.resolve(runDir);
  const resultsDir = path.join(resolvedRunDir, "results");
  await fs.mkdir(resultsDir, { recursive: true });
  const resultPath = path.join(resultsDir, `${stage}.json`);
  const record = {
    stage,
    written_at: new Date().toISOString(),
    ...payload
  };
  await writeJson(resultPath, record);
  const indexPath = path.join(resultsDir, "index.json");
  let index = { run_dir: resolvedRunDir, stages: [] };
  if (existsSync(indexPath)) {
    try {
      index = await readJson(indexPath);
    } catch {
      index = { run_dir: resolvedRunDir, stages: [] };
    }
  }
  index.run_dir = resolvedRunDir;
  index.stages = (index.stages || []).filter((item) => item.stage !== stage);
  index.stages.push({
    stage,
    result_path: resultPath,
    written_at: record.written_at,
    summary: payload.summary || ""
  });
  index.stages.sort((a, b) => a.stage.localeCompare(b.stage));
  await writeJson(indexPath, index);
  return resultPath;
}

function projectIdFromDir(dir) {
  return path.basename(path.resolve(dir)).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "product-video";
}

function templateBrief(projectId) {
  return {
    project_id: projectId,
    scenario: "ecommerce",
    video_type: "ecommerce",
    target_platform: "douyin",
    aspect_ratio: "9:16",
    target_duration_sec: 15,
    language: "zh-CN",
    product: {
      name: "",
      category: "",
      brand: "",
      appearance: "",
      price_positioning: "",
      target_audience: "",
      selling_points: [
        {
          name: "",
          evidence: "",
          priority: 1
        }
      ],
      must_keep: [],
      must_avoid: []
    },
    assets: [
      {
        id: "product_main",
        role: "product",
        path: "./assets/input/product.jpg",
        notes: "replace with the actual product image path"
      }
    ],
    model_library: {
      enabled: true,
      library_path: "./assets/models/model-library.json",
      selected_model_id: "",
      selected_view: "front",
      selection_hint: "match product category and target audience"
    },
    scene_library: {
      enabled: true,
      library_path: "./assets/scenes/scene-library.json",
      selection_strategy: "auto",
      preferred_scene_ids: [],
      allow_scene_reference_fusion: true
    },
    narration: {
      mode: "auto",
      enabled: null,
      delivery: "auto",
      voice_style: "",
      note: "auto: ecommerce usually uses TTS voiceover; concept/ad films can stay silent; presenter/talking-head styles can use Kling dialogue"
    },
    style: {
      tone: "",
      palette: [],
      lighting: "",
      camera: ""
    },
    constraints: {
      budget_confirmed: false,
      no_text_in_generation: true,
      requires_user_confirmation_before_submit: true
    }
  };
}

function templateStoryboard(projectId, runDir) {
  return {
    project_id: projectId,
    run_dir: runDir,
    scenario: "ecommerce",
    video_type: "ecommerce",
    product: {
      name: "",
      category: "",
      target_audience: ""
    },
    aspect_ratio: "9:16",
    target_width: 1080,
    target_height: 1920,
    target_duration_sec: 15,
    continuity: {
      narrative_logline: "",
      visual_identity: "",
      subject_consistency: "Keep the same product, model identity, inner outfit, age, hairstyle, and styling across all generated frames.",
      rhythm: "",
      transition_rule: "Each shot should feel like the next moment in one short product story, not an unrelated catalog image."
    },
    narration: {
      mode: "auto",
      enabled: true,
      delivery: "tts",
      tts_enabled: true,
      kling_dialogue_enabled: false,
      language: "zh-CN",
      voice_style: "自然、轻快、可信的电商解说",
      decision_reason: "ecommerce defaults to narrated selling proof",
      total_script: "",
      tts_output_path: "./audio/voiceover.m4a",
      subtitle_srt_path: "./subtitles/voiceover.srt",
      subtitle_ass_path: "./subtitles/voiceover.ass"
    },
    global_negative_prompt: "穿模，人物变脸，产品变形，颜色失真，文字乱码，Logo变形，镜头抖动",
    frame_generation: {
      provider: "image2",
      mode: "image-to-image",
      request_dir: "./logs/image2-requests",
      output_dir: "./frames/generated",
      reference_weight: 0.7
    },
    model_library: {
      enabled: true,
      library_path: "./assets/models/model-library.json",
      selected_model_id: "",
      selected_view: "front",
      fusion_categories: ["服装", "童装", "女装", "男装", "内衣", "运动服", "鞋", "帽子", "配饰"]
    },
    scene_library: {
      enabled: true,
      library_path: "./assets/scenes/scene-library.json",
      selection_strategy: "auto",
      allow_scene_reference_fusion: true
    },
    post_production: {
      overlay_plan: "品牌名、卖点标签和价格全部后期叠加",
      music: "清爽明快，80-100 BPM",
      subtitles: "使用 narration-assets 生成字幕，assemble 阶段烧录到视频"
    },
    assets: [
      {
        id: "product_main",
        role: "product",
        path: "./assets/input/product.jpg"
      }
    ],
    shots: [
      {
        id: "s01",
        title: "",
        purpose: "",
        beat: {
          index: 1,
          role: "",
          rhythm: "",
          transition_from_previous: "",
          transition_to_next: ""
        },
        duration_sec: 4,
        product_presence: "visible",
        source_images: ["product_main"],
        model: {
          required: false,
          model_id: "",
          view: "front"
        },
        scene: {
          scene_id: "",
          role: "background-reference",
          library_path: "./assets/scenes/scene-library.json",
          reference_image_path: "",
          prompt: "",
          fusion_mode: "scene-background-fusion"
        },
        voiceover: "",
        subtitle: "",
        closing_frame_prompt: "",
        video_prompt: "",
        negative_prompt: "",
        image2: {
          mode: "image-to-image",
          reference_weight: 0.7,
          size: "1080x1920",
          output_path: "./frames/generated/s01/frame.png"
        },
        kling: {
          video_model: "kling-v3-omni",
          route: "image-to-video",
          sound: "off"
        },
        frame_path: "",
        clip_path: "",
        qa_status: "pending"
      }
    ]
  };
}

function assetMap(doc) {
  return new Map((doc.assets || []).map((asset) => [asset.id, asset]));
}

function resolveRunRelative(doc, value, cwd = process.cwd()) {
  if (!value) return "";
  if (path.isAbsolute(value)) return value;
  const root = doc.run_dir ? path.resolve(cwd, doc.run_dir) : cwd;
  return path.resolve(root, value);
}

function promptLength(text) {
  return [...String(text || "")].length;
}

const defaultAgeGroups = [
  { id: "child", label: "儿童", age_range: "6-9" },
  { id: "teen", label: "青少年", age_range: "13-17" },
  { id: "young-adult", label: "青年", age_range: "20-30" },
  { id: "adult", label: "成年人", age_range: "31-45" },
  { id: "mature", label: "成熟年龄", age_range: "46-60" },
  { id: "senior", label: "银发年龄", age_range: "61-75" }
];

const modelViews = [
  { id: "front", label: "正面" },
  { id: "side", label: "侧面" },
  { id: "back", label: "背面" }
];

function parseList(value, fallback) {
  if (!value || value === true) return fallback;
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function modelGenderLabel(gender) {
  if (gender === "female") return "女性";
  if (gender === "male") return "男性";
  return "中性";
}

function isApparelCategory(category = "") {
  return /服装|童装|女装|男装|内衣|外套|上衣|裤|裙|鞋|帽|包|配饰|瑜伽裤|羽绒|卫衣|T恤|衬衫|穿搭|apparel|fashion|clothing|shoes/i.test(String(category));
}

function selectedModelIdFromBrief(brief) {
  const configured = brief.model_library?.selected_model_id;
  if (configured) return configured;
  const audience = `${brief.product?.target_audience || ""} ${brief.product?.category || ""}`;
  let age = "young-adult";
  if (/儿童|孩子|小孩|童装|kid|child/i.test(audience)) age = "child";
  else if (/青少年|学生|teen/i.test(audience)) age = "teen";
  else if (/中老年|熟龄|mature/i.test(audience)) age = "mature";
  else if (/老人|银发|senior/i.test(audience)) age = "senior";
  let gender = "neutral";
  if (/女性|女生|女童|女装|female|woman|girl/i.test(audience)) gender = "female";
  else if (/男性|男生|男童|男装|male|man|boy/i.test(audience)) gender = "male";
  return `${age}-${gender}`;
}

function normalizeScenario(value, fallback = "ecommerce") {
  const raw = String(value || fallback || "ecommerce").trim().toLowerCase();
  const compact = raw.replace(/[\s_-]+/g, "");
  if (["ecommerce", "commerce", "shop", "shopping", "sell", "selling", "电商", "带货", "卖点", "转化", "种草"].includes(compact)) return "ecommerce";
  if (["ad", "ads", "advertising", "advertisement", "commercial", "广告", "广告片", "品牌广告", "投放"].includes(compact)) return "ad";
  if (["promo", "promotion", "promotional", "brandfilm", "brand", "宣传片", "品牌宣传片", "产品宣传片", "宣传", "品宣"].includes(compact)) return "promo";
  if (["hybrid"].includes(compact)) return "promo";
  return raw;
}

function scenarioToVideoType(scenario) {
  if (scenario === "ecommerce") return "ecommerce";
  if (scenario === "ad") return "brand";
  if (scenario === "promo") return "hybrid";
  return scenario;
}

function narrationDecisionForBrief(brief, scenario) {
  const narration = brief.narration || {};
  const styleText = [
    brief.video_style,
    brief.style?.tone,
    brief.style?.camera,
    brief.style?.lighting,
    brief.style?.description,
    brief.style?.keywords,
    brief.product?.target_audience,
    brief.target_platform
  ].filter(Boolean).join(" ");
  const normalizeDelivery = (value) => {
    const raw = String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
    if (!raw || raw === "auto") return "";
    if (["none", "silent", "off", "no", "false", "无", "无解说", "无旁白", "不要解说"].includes(raw)) return "none";
    if (["tts", "localtts", "voiceover", "旁白", "解说", "本地tts"].includes(raw)) return "tts";
    if (["kling", "klingdialogue", "dialogue", "talkinghead", "presenter", "spoken", "可灵", "可灵口播", "口播", "真人口播", "人物说话", "镜头内口播"].includes(raw)) return "kling-dialogue";
    if (["subtitle", "subtitles", "subtitleonly", "caption", "captions", "只字幕", "仅字幕", "字幕"].includes(raw)) return "subtitle-only";
    return "";
  };
  const autoDelivery = () => {
    if (/只字幕|仅字幕|字幕版|subtitle only|caption only/i.test(styleText)) return "subtitle-only";
    if (/真人口播|主播|出镜讲解|人物说话|模特说|镜头内口播|对口型|口型|lip sync|talking head|presenter|可灵口播|kling dialogue/i.test(styleText)) return "kling-dialogue";
    return "tts";
  };
  const explicitDelivery = normalizeDelivery(narration.delivery || narration.audio_strategy || narration.delivery_mode);
  if (explicitDelivery === "none") {
    return { enabled: false, mode: "none", delivery: "none", tts_enabled: false, kling_dialogue_enabled: false, reason: "brief.narration.delivery disables voiceover" };
  }
  if (typeof narration.enabled === "boolean") {
    const enabled = narration.enabled;
    const delivery = enabled ? (explicitDelivery || autoDelivery()) : "none";
    return {
      enabled,
      mode: enabled ? "voiceover" : "none",
      delivery,
      tts_enabled: delivery === "tts",
      kling_dialogue_enabled: delivery === "kling-dialogue",
      reason: "brief.narration.enabled explicitly set"
    };
  }
  const rawMode = String(narration.mode || "auto").trim().toLowerCase();
  if (["none", "silent", "no", "off", "false", "无", "无解说", "无旁白", "不要解说"].includes(rawMode)) {
    return { enabled: false, mode: "none", delivery: "none", tts_enabled: false, kling_dialogue_enabled: false, reason: "brief.narration.mode disables voiceover" };
  }
  if (explicitDelivery) {
    return {
      enabled: true,
      mode: rawMode === "auto" ? "auto" : "voiceover",
      delivery: explicitDelivery,
      tts_enabled: explicitDelivery === "tts",
      kling_dialogue_enabled: explicitDelivery === "kling-dialogue",
      reason: "brief.narration.delivery explicitly set"
    };
  }
  if (["voiceover", "tts", "subtitle", "subtitles", "on", "true", "解说", "旁白"].includes(rawMode)) {
    const delivery = rawMode === "subtitle" || rawMode === "subtitles" ? "subtitle-only" : autoDelivery();
    return {
      enabled: true,
      mode: "voiceover",
      delivery,
      tts_enabled: delivery === "tts",
      kling_dialogue_enabled: delivery === "kling-dialogue",
      reason: "brief.narration.mode enables voiceover"
    };
  }
  if (scenario === "ecommerce") {
    const delivery = autoDelivery();
    return {
      enabled: true,
      mode: "auto",
      delivery,
      tts_enabled: delivery === "tts",
      kling_dialogue_enabled: delivery === "kling-dialogue",
      reason: "ecommerce/带货 videos default to voiceover for selling proof"
    };
  }
  if (/无解说|不要解说|无旁白|静音|silent|no voice|concept|cinematic|film|大片|概念|情绪|氛围|质感|高级广告|视觉广告/i.test(styleText)) {
    return { enabled: false, mode: "auto", delivery: "none", tts_enabled: false, kling_dialogue_enabled: false, reason: "style indicates concept/cinematic/silent visual film" };
  }
  if (/带货|电商|卖点|讲解|口播|解说|导购|种草|详情页/i.test(styleText)) {
    const delivery = autoDelivery();
    return {
      enabled: true,
      mode: "auto",
      delivery,
      tts_enabled: delivery === "tts",
      kling_dialogue_enabled: delivery === "kling-dialogue",
      reason: "style/platform indicates selling or guided explanation"
    };
  }
  if (scenario === "ad") {
    return { enabled: false, mode: "auto", delivery: "none", tts_enabled: false, kling_dialogue_enabled: false, reason: "ad concept films default to no voiceover unless requested" };
  }
  const delivery = autoDelivery();
  return {
    enabled: true,
    mode: "auto",
    delivery,
    tts_enabled: delivery === "tts",
    kling_dialogue_enabled: delivery === "kling-dialogue",
    reason: "promo videos default to light narration unless style says silent"
  };
}

function narrationEnabledForDoc(doc) {
  return doc.narration?.enabled === true;
}

function narrationDeliveryForDoc(doc) {
  if (!narrationEnabledForDoc(doc)) return "none";
  return doc.narration?.delivery || (doc.narration?.tts_enabled ? "tts" : "tts");
}

function ttsEnabledForDoc(doc) {
  return narrationEnabledForDoc(doc) && narrationDeliveryForDoc(doc) === "tts";
}

function klingDialogueEnabledForDoc(doc) {
  return narrationEnabledForDoc(doc) && narrationDeliveryForDoc(doc) === "kling-dialogue";
}

function shotHasVisibleSpeaker(shot) {
  return Boolean(shot.model?.required || ["visible", "lifestyle"].includes(shot.product_presence || ""));
}

function escapeDialogue(text) {
  return String(text || "").replace(/[“”"]/g, "").trim();
}

function klingDialoguePromptForShot(doc, shot) {
  if (!klingDialogueEnabledForDoc(doc) || !shot.voiceover) return "";
  const line = escapeDialogue(shot.voiceover);
  const style = doc.narration?.voice_style || "自然清晰";
  if (shotHasVisibleSpeaker(shot)) {
    return `镜头内人物自然口播，中文清晰说出：“${line}”。口型和语音内容同步，语气${style}，不要生成额外字幕或乱码文字。`;
  }
  return `画外旁白用中文清晰说出：“${line}”。语气${style}，不要生成额外字幕或乱码文字。`;
}

function validateBriefDoc(doc) {
  const errors = [];
  const warnings = [];
  const scenario = normalizeScenario(doc.scenario || doc.video_type);
  if (!doc.project_id) errors.push("project_id is required");
  if (!["ecommerce", "ad", "promo"].includes(scenario)) errors.push("scenario must be ecommerce, ad, or promo");
  if (!["brand", "ecommerce", "hybrid"].includes(doc.video_type)) errors.push("video_type must be brand, ecommerce, or hybrid");
  if (!/^\d+:\d+$/.test(doc.aspect_ratio || "")) errors.push("aspect_ratio must look like 9:16 or 16:9");
  if (!Number.isFinite(Number(doc.target_duration_sec)) || Number(doc.target_duration_sec) <= 0) errors.push("target_duration_sec must be positive");
  if (!doc.product?.name) errors.push("product.name is required");
  if (!doc.product?.category) errors.push("product.category is required");
  if (!doc.product?.appearance) warnings.push("product.appearance is empty; product identity may drift");
  if (!Array.isArray(doc.product?.selling_points) || doc.product.selling_points.length === 0) errors.push("product.selling_points must contain at least one item");
  if (!Array.isArray(doc.assets) || doc.assets.length === 0) errors.push("assets must contain at least one product image or explicit reference");
  if (doc.model_library?.enabled && !doc.model_library?.library_path) warnings.push("model_library.enabled is true but library_path is empty");
  if (doc.scene_library?.enabled !== false && !doc.scene_library?.library_path) warnings.push("scene_library is enabled but library_path is empty");
  for (const asset of doc.assets || []) {
    if (!asset.id) errors.push("each asset needs id");
    if (!asset.role) errors.push(`asset ${asset.id || "(unknown)"} needs role`);
    if (!asset.path) errors.push(`asset ${asset.id || "(unknown)"} needs path`);
  }
  return { errors, warnings };
}

function validateStoryboardDoc(doc) {
  const errors = [];
  const warnings = [];
  const scenario = normalizeScenario(doc.scenario || doc.video_type);
  if (!doc.project_id) errors.push("project_id is required");
  if (!doc.run_dir) warnings.push("run_dir is empty; relative media paths will resolve from cwd");
  if (!["ecommerce", "ad", "promo"].includes(scenario)) errors.push("scenario must be ecommerce, ad, or promo");
  if (!["brand", "ecommerce", "hybrid"].includes(doc.video_type)) errors.push("video_type must be brand, ecommerce, or hybrid");
  if (!/^\d+:\d+$/.test(doc.aspect_ratio || "")) errors.push("aspect_ratio must look like 9:16 or 16:9");
  if (!Array.isArray(doc.shots) || doc.shots.length === 0) errors.push("shots must contain at least one shot");
  const frameProvider = doc.frame_generation?.provider || "image2";
  if (frameProvider !== "image2") errors.push("frame_generation.provider must be image2");
  if (!doc.continuity?.narrative_logline) warnings.push("continuity.narrative_logline is empty; shots may feel unrelated");
  const narrationEnabled = narrationEnabledForDoc(doc);
  if (narrationEnabled && !doc.narration?.total_script) warnings.push("narration.total_script is empty");
  if (doc.scene_library?.enabled !== false && !doc.scene_library?.library_path) warnings.push("scene_library.library_path is empty");
  const ids = new Set();
  const assets = assetMap(doc);
  let duration = 0;
  for (const [index, shot] of (doc.shots || []).entries()) {
    const label = shot.id || `shot[${index}]`;
    if (!shot.id) errors.push(`${label}: id is required`);
    if (ids.has(shot.id)) errors.push(`${label}: duplicate shot id`);
    ids.add(shot.id);
    if (!shot.purpose) errors.push(`${label}: purpose is required`);
    if (!shot.beat?.role) warnings.push(`${label}: beat.role is empty; rhythm continuity may be weak`);
    if (index > 0 && !shot.beat?.transition_from_previous) warnings.push(`${label}: transition_from_previous is empty`);
    if (narrationEnabled && !shot.voiceover) warnings.push(`${label}: voiceover is empty`);
    if (narrationEnabled && !shot.subtitle) warnings.push(`${label}: subtitle is empty`);
    if (doc.scene_library?.enabled !== false && !shot.scene?.scene_id) warnings.push(`${label}: no scene selected`);
    if (!Number.isFinite(Number(shot.duration_sec)) || Number(shot.duration_sec) <= 0) errors.push(`${label}: duration_sec must be positive`);
    duration += Number(shot.duration_sec || 0);
    if (shot.kling?.generation_duration_sec && Number(shot.kling.generation_duration_sec) < Number(shot.duration_sec || 0)) {
      warnings.push(`${label}: kling.generation_duration_sec is shorter than edit duration_sec; assembly may need a longer generated clip`);
    }
    if (!["none", "visible", "detail", "lifestyle"].includes(shot.product_presence)) warnings.push(`${label}: product_presence should be none, visible, detail, or lifestyle`);
    if (!shot.closing_frame_prompt) errors.push(`${label}: closing_frame_prompt is required`);
    if (!shot.video_prompt) errors.push(`${label}: video_prompt is required`);
    if (!shot.negative_prompt && !doc.global_negative_prompt) errors.push(`${label}: negative_prompt or global_negative_prompt is required`);
    if (promptLength(shot.video_prompt) > 500) warnings.push(`${label}: video_prompt is over 500 characters; Kling prompts may be less reliable`);
    if (promptLength(shot.closing_frame_prompt) > 500) warnings.push(`${label}: closing_frame_prompt is over 500 characters`);
    for (const ref of shot.source_images || []) {
      if (!assets.has(ref)) errors.push(`${label}: source_images references unknown asset ${ref}`);
    }
    const image2Mode = shot.image2?.mode || doc.frame_generation?.mode || "image-to-image";
    if (!["image-to-image", "text-to-image", "product-model-fusion"].includes(image2Mode)) errors.push(`${label}: image2.mode must be image-to-image, text-to-image, or product-model-fusion`);
    if (image2Mode === "image-to-image" && (!Array.isArray(shot.source_images) || shot.source_images.length === 0)) {
      errors.push(`${label}: image2 image-to-image mode requires at least one source image`);
    }
    if (image2Mode === "product-model-fusion") {
      if (!Array.isArray(shot.source_images) || shot.source_images.length === 0) errors.push(`${label}: product-model-fusion requires product source_images`);
      if (!shot.model?.model_id && !doc.model_library?.selected_model_id) warnings.push(`${label}: product-model-fusion has no explicit model_id; model selection will use defaults`);
      if (!doc.model_library?.library_path) warnings.push(`${label}: product-model-fusion has no model_library.library_path`);
    }
    const model = shot.kling?.video_model;
    if (model && !["kling-v3", "kling-v3-omni", "kling-video-o1", "kling-image-o1"].includes(model)) {
      errors.push(`${label}: unsupported video_model ${model}`);
    }
  }
  const target = Number(doc.target_duration_sec || 0);
  if (target > 0 && Math.abs(duration - target) > Math.max(1, target * 0.15)) {
    warnings.push(`shot duration sum ${duration}s differs from target_duration_sec ${target}s`);
  }
  return { errors, warnings };
}

function printValidation(kind, result) {
  for (const warning of result.warnings) console.warn(`WARN ${kind}: ${warning}`);
  if (result.errors.length) {
    for (const error of result.errors) console.error(`ERROR ${kind}: ${error}`);
    throw new Error(`${kind} validation failed with ${result.errors.length} error(s)`);
  }
  console.log(`OK ${kind}: validation passed (${result.warnings.length} warning(s))`);
}

async function init(args) {
  const outDir = path.resolve(requireArg(args, "out"));
  const projectId = args.name ? String(args.name) : projectIdFromDir(outDir);
  await fs.mkdir(outDir, { recursive: true });
  for (const dir of ["assets/input", "assets/models", "assets/scenes", "frames/generated", "clips", "audio", "subtitles", "qa", "edit", "logs"]) {
    await fs.mkdir(path.join(outDir, dir), { recursive: true });
  }
  const briefPath = path.join(outDir, "brief.json");
  const storyboardPath = path.join(outDir, "storyboard.json");
  if (args.brief && args.brief !== true) {
    const sourceBrief = path.resolve(String(args.brief));
    await fs.copyFile(sourceBrief, briefPath);
  } else if (!existsSync(briefPath)) {
    await writeJson(briefPath, templateBrief(projectId));
  }
  if (!existsSync(storyboardPath)) {
    await writeJson(storyboardPath, templateStoryboard(projectId, outDir));
  }
  const resultPath = await writeStageResult(outDir, "00-init", {
    summary: "Run directory initialized",
    run_dir: outDir,
    brief_path: briefPath,
    storyboard_path: storyboardPath,
    directories: ["assets/input", "assets/models", "assets/scenes", "frames/generated", "clips", "audio", "subtitles", "qa", "edit", "logs", "results"].map((dir) => path.join(outDir, dir))
  });
  console.log(`Run initialized: ${outDir}`);
  console.log(`Brief: ${briefPath}`);
  console.log(`Storyboard: ${storyboardPath}`);
  console.log(`Stage result: ${resultPath}`);
}

function modelPrompt({ age, gender, view, style }) {
  const genderLabel = modelGenderLabel(gender);
  return `竖屏 9:16，生成一位${age.label}（年龄段 ${age.age_range}）${genderLabel}服装展示模特的${view.label}三视图素材之一。人物站姿自然、全身入镜、手臂自然下垂、身体比例真实，穿纯色贴身基础打底服，背景纯白或浅灰，均匀棚拍光。保持同一个 model_id 的面部、发型、身形、肤色和气质一致。${style || "适合电商服装换装与商品融合"}。画面无文字、无Logo、无水印。`;
}

async function modelLibraryRequests(args) {
  const outDir = path.resolve(requireArg(args, "out"));
  const requestDir = path.join(outDir, "requests");
  const modelsDir = path.join(outDir, "models");
  const ageIds = parseList(args["age-groups"], defaultAgeGroups.map((age) => age.id));
  const genders = parseList(args.genders, ["female", "male", "neutral"]);
  const style = args.style && args.style !== true ? String(args.style) : "";
  await fs.mkdir(requestDir, { recursive: true });
  await fs.mkdir(modelsDir, { recursive: true });
  const library = {
    provider: "image2",
    kind: "model-library",
    created_at: new Date().toISOString(),
    usage: "Use these model three-view assets for apparel product-model-fusion frames.",
    models: []
  };
  const commands = [];
  for (const ageId of ageIds) {
    const age = defaultAgeGroups.find((item) => item.id === ageId) || { id: ageId, label: ageId, age_range: ageId };
    for (const gender of genders) {
      const modelId = `${age.id}-${gender}`;
      const model = {
        id: modelId,
        age_group: age.id,
        age_label: age.label,
        age_range: age.age_range,
        gender,
        views: {}
      };
      for (const view of modelViews) {
        const outputPath = path.join(modelsDir, modelId, `${view.id}.png`);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        const request = {
          provider: "image2",
          kind: "model-library-view",
          model_id: modelId,
          consistency_group: modelId,
          age_group: age.id,
          age_range: age.age_range,
          gender,
          view: view.id,
          prompt: modelPrompt({ age, gender, view, style }),
          negative_prompt: "多人同框，半身照，姿势夸张，身体变形，手指畸形，脸部变形，服装复杂图案，文字，Logo，水印，背景杂乱",
          aspect_ratio: "9:16",
          size: "1080x1920",
          output_path: outputPath,
          constraints: {
            full_body: true,
            plain_base_layer: true,
            same_identity_across_views: true,
            suitable_for_product_model_fusion: true
          }
        };
        const requestPath = path.join(requestDir, `${modelId}-${view.id}.json`);
        await writeJson(requestPath, request);
        model.views[view.id] = outputPath;
        commands.push({ request_path: requestPath, output_path: outputPath });
      }
      library.models.push(model);
    }
  }
  const libraryPath = path.join(outDir, "model-library.json");
  const manifestPath = path.join(requestDir, "manifest.json");
  await writeJson(libraryPath, library);
  await writeJson(manifestPath, { provider: "image2", library_path: libraryPath, requests: commands });
  const runDir = args["run-dir"] && args["run-dir"] !== true
    ? path.resolve(String(args["run-dir"]))
    : path.basename(outDir) === "models" && path.basename(path.dirname(outDir)) === "assets"
      ? path.dirname(path.dirname(outDir))
      : outDir;
  const localResultPath = path.join(outDir, "model-library-result.json");
  const resultPayload = {
    summary: "Model library image2 requests generated",
    model_library_path: libraryPath,
    manifest_path: manifestPath,
    model_count: library.models.length,
    request_count: commands.length,
    output_dir: outDir
  };
  await writeJson(localResultPath, resultPayload);
  const stageResultPath = await writeStageResult(runDir, "01-model-library", resultPayload);
  console.log(`model library written: ${libraryPath}`);
  console.log(`image2 model requests written: ${requestDir}`);
  console.log(`Local result: ${localResultPath}`);
  console.log(`Stage result: ${stageResultPath}`);
  console.log(`# Review before running. image2 model generation may be billable.`);
  const image2Command = args["image2-command"] && args["image2-command"] !== true ? String(args["image2-command"]) : "";
  for (const item of commands) {
    if (image2Command) console.log(`${image2Command} --request ${shellQuote(item.request_path)} --output ${shellQuote(item.output_path)}`);
    else console.log(`request=${item.request_path} output=${item.output_path}`);
  }
}

const scenePresets = [
  {
    id: "clean-studio-gray",
    title: "干净浅灰棚拍",
    scenarios: ["ecommerce", "ad", "promo"],
    categories: ["all"],
    roles: ["opening", "proof", "closing", "product-hero"],
    prompt: "竖屏 9:16，浅灰无缝棚拍背景，柔和大面积侧光，地面与背景过渡自然，画面干净，主体区域居中，上方和右侧有后期字幕留白，无文字、无Logo、无水印。",
    negative_prompt: "杂乱背景，强烈色块，可读文字，广告牌，水印，过曝，低质感"
  },
  {
    id: "school-gate-autumn",
    title: "秋冬校门上学路",
    scenarios: ["ecommerce", "promo"],
    categories: ["童装", "儿童", "书包", "鞋"],
    roles: ["proof", "lifestyle", "context"],
    prompt: "竖屏 9:16，秋冬清晨校门外或校园门口街区，干净砖墙和栏杆背景，地面少量落叶，柔和自然光，画面真实生活感，主体位置清楚，无可读文字、无校名、无水印。",
    negative_prompt: "拥挤人群，可读校名，广告字，脏乱街景，危险道路，低质感"
  },
  {
    id: "outdoor-playground-autumn",
    title: "秋冬户外玩耍",
    scenarios: ["ecommerce", "promo"],
    categories: ["童装", "儿童", "运动", "鞋"],
    roles: ["proof", "lifestyle", "motion"],
    prompt: "竖屏 9:16，秋冬社区公园或儿童活动区，背景有滑梯、树木和柔和散景，地面干净，空间适合儿童轻跑和抬手活动，真实自然光，无文字、无水印。",
    negative_prompt: "危险器械，拥挤人群，画面杂乱，广告文字，肢体遮挡严重"
  },
  {
    id: "urban-street-cafe",
    title: "城市街头日常",
    scenarios: ["ecommerce", "ad", "promo"],
    categories: ["服装", "童装", "鞋", "包", "配饰", "all"],
    roles: ["lifestyle", "context"],
    prompt: "竖屏 9:16，干净城市街头或咖啡店外立面，午后柔和自然光，背景轻微虚化，有街拍质感，主体行走空间清楚，无可读招牌、无水印。",
    negative_prompt: "杂乱店招，可读文字，拥挤人群，过度滤镜，主体空间不足"
  },
  {
    id: "home-entryway-winter",
    title: "秋冬出门玄关",
    scenarios: ["ecommerce", "promo"],
    categories: ["童装", "服装", "鞋", "包"],
    roles: ["lifestyle", "context", "warmth"],
    prompt: "竖屏 9:16，温暖干净的家庭玄关或衣帽区，秋冬出门前的生活氛围，木色和浅色墙面，柔和室内光，主体站位清楚，无文字、无水印。",
    negative_prompt: "空间拥挤，杂物堆积，可读文字，廉价影棚感，强噪点"
  },
  {
    id: "premium-product-dark",
    title: "高级深色产品光影",
    scenarios: ["ad"],
    categories: ["all"],
    roles: ["hook", "detail", "closing"],
    prompt: "竖屏 9:16，高级深色棚拍环境，局部侧逆光扫过产品区域，背景极简，有商业广告质感，产品主位清晰，画面无文字、无Logo、无水印。",
    negative_prompt: "低质感，强噪点，背景杂乱，过曝，可读文字，廉价促销感"
  },
  {
    id: "soft-brand-context",
    title: "柔和品牌语境",
    scenarios: ["promo"],
    categories: ["all"],
    roles: ["opening", "context", "closing"],
    prompt: "竖屏 9:16，柔和自然光的品牌宣传片开篇空间，干净背景，层次适中，氛围可信而不夸张，留出字幕和品牌信息空间，画面无文字。",
    negative_prompt: "过度豪华，杂乱背景，可读文字，Logo伪造，低质感"
  }
];

function sceneMatchesCategory(scene, category) {
  if ((scene.categories || []).includes("all")) return true;
  const text = String(category || "");
  return (scene.categories || []).some((item) => text.includes(item) || item.includes(text));
}

function scenesForBrief(brief, scenario) {
  const category = brief.product?.category || "";
  return scenePresets.filter((scene) => (scene.scenarios || []).includes(scenario) && sceneMatchesCategory(scene, category));
}

function defaultSceneForRole(brief, scenario, role, fallbackId = "clean-studio-gray") {
  const preferred = brief.scene_library?.preferred_scene_ids || [];
  const available = scenesForBrief(brief, scenario);
  const preferredMatch = available.find((scene) => preferred.includes(scene.id) && (scene.roles || []).includes(role));
  if (preferredMatch) return preferredMatch;
  return available.find((scene) => (scene.roles || []).includes(role))
    || scenePresets.find((scene) => scene.id === fallbackId)
    || scenePresets[0];
}

function sceneForShot(brief, scenario, role, shotId) {
  if (brief.scene_library?.enabled === false) return null;
  const scene = defaultSceneForRole(brief, scenario, role);
  if (!scene) return null;
  const libraryPath = brief.scene_library?.library_path || "./assets/scenes/scene-library.json";
  return {
    scene_id: scene.id,
    role: "background-reference",
    library_path: libraryPath,
    reference_image_path: `./assets/scenes/generated/${scene.id}.png`,
    prompt: scene.prompt,
    negative_prompt: scene.negative_prompt,
    fusion_mode: "scene-background-fusion",
    selection_reason: `${shotId} ${role} uses ${scene.title}`
  };
}

async function sceneLibraryRequests(args) {
  const outDir = path.resolve(requireArg(args, "out"));
  const scenario = normalizeScenario(args.scenario && args.scenario !== true ? String(args.scenario) : "ecommerce");
  const category = args.category && args.category !== true ? String(args.category) : "";
  const requestDir = path.join(outDir, "requests");
  const generatedDir = path.join(outDir, "generated");
  await fs.mkdir(requestDir, { recursive: true });
  await fs.mkdir(generatedDir, { recursive: true });
  const selected = scenePresets.filter((scene) => (scene.scenarios || []).includes(scenario) && sceneMatchesCategory(scene, category));
  const scenes = (selected.length ? selected : scenePresets.filter((scene) => scene.id === "clean-studio-gray")).map((scene) => ({
    ...scene,
    reference_image_path: `./generated/${scene.id}.png`
  }));
  const library = {
    provider: "image2",
    kind: "scene-library",
    created_at: new Date().toISOString(),
    scenario,
    category,
    usage: "Use generated scene references as background/environment inputs for image2 scene-background-fusion when they match a shot role.",
    scenes
  };
  const commands = [];
  for (const scene of scenes) {
    const outputPath = path.join(generatedDir, `${scene.id}.png`);
    const request = {
      provider: "image2",
      kind: "scene-library-reference",
      scene_id: scene.id,
      title: scene.title,
      prompt: scene.prompt,
      negative_prompt: scene.negative_prompt,
      aspect_ratio: "9:16",
      size: "1080x1920",
      output_path: outputPath,
      constraints: {
        no_people_required: true,
        no_readable_text: true,
        suitable_for_later_product_or_model_fusion: true
      }
    };
    const requestPath = path.join(requestDir, `${scene.id}.json`);
    await writeJson(requestPath, request);
    commands.push({ scene_id: scene.id, request_path: requestPath, output_path: outputPath });
  }
  const libraryPath = path.join(outDir, "scene-library.json");
  const manifestPath = path.join(requestDir, "manifest.json");
  await writeJson(libraryPath, library);
  await writeJson(manifestPath, { provider: "image2", library_path: libraryPath, requests: commands });
  const runDir = args["run-dir"] && args["run-dir"] !== true
    ? path.resolve(String(args["run-dir"]))
    : path.basename(outDir) === "scenes" && path.basename(path.dirname(outDir)) === "assets"
      ? path.dirname(path.dirname(outDir))
      : outDir;
  const resultPayload = {
    summary: "Scene library image2 requests generated",
    scene_library_path: libraryPath,
    manifest_path: manifestPath,
    scenario,
    category,
    scene_count: scenes.length,
    request_count: commands.length
  };
  await writeJson(path.join(outDir, "scene-library-result.json"), resultPayload);
  const stageResultPath = await writeStageResult(runDir, "01-scene-library", resultPayload);
  console.log(`scene library written: ${libraryPath}`);
  console.log(`image2 scene requests written: ${requestDir}`);
  console.log(`Stage result: ${stageResultPath}`);
  console.log(`# Review before running. image2 scene generation may be billable.`);
  const image2Command = args["image2-command"] && args["image2-command"] !== true ? String(args["image2-command"]) : "";
  for (const item of commands) {
    if (image2Command) console.log(`${image2Command} --request ${shellQuote(item.request_path)} --output ${shellQuote(item.output_path)}`);
    else console.log(`request=${item.request_path} output=${item.output_path}`);
  }
}

function productSummary(brief) {
  const product = brief.product || {};
  const name = product.name || "商品";
  const category = product.category ? `${product.category}` : "商品";
  const appearance = product.appearance || "保持商品外观、颜色、材质和比例准确";
  const tone = brief.style?.tone || "干净、有质感、适合短视频平台";
  const lighting = brief.style?.lighting || "柔和自然光";
  const camera = brief.style?.camera || "稳定中近景，产品清晰";
  return { product, name, category, appearance, tone, lighting, camera };
}

function topSellingPoints(brief, limit = 3) {
  const points = Array.isArray(brief.product?.selling_points) ? brief.product.selling_points : [];
  return points
    .filter((point) => point?.name)
    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999))
    .slice(0, limit);
}

function roundTenths(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function normalizeWeightedDurations(weights, target, minDuration = 1.6) {
  const total = Math.max(Number(target || 15), weights.length * minDuration);
  const sum = weights.reduce((acc, value) => acc + Number(value || 0), 0) || weights.length;
  let durations = weights.map((weight) => Math.max(minDuration, total * Number(weight || 1) / sum));
  const minTotal = minDuration * durations.length;
  if (minTotal < total) {
    const locked = durations.map((value) => value <= minDuration + 0.0001);
    let lockedSum = durations.reduce((acc, value, index) => acc + (locked[index] ? value : 0), 0);
    let flexibleSum = durations.reduce((acc, value, index) => acc + (locked[index] ? 0 : value), 0);
    for (let i = 0; i < durations.length; i += 1) {
      if (!locked[i]) durations[i] = (total - lockedSum) * durations[i] / flexibleSum;
    }
  }
  durations = durations.map(roundTenths);
  const delta = roundTenths(total - durations.reduce((acc, value) => acc + value, 0));
  durations[durations.length - 1] = roundTenths(durations[durations.length - 1] + delta);
  return durations;
}

function durationWeightsForScenario(scenario, proofCount) {
  if (scenario === "ecommerce") {
    const proofWeights = Array.from({ length: proofCount }, (_, index) => index === 0 ? 0.95 : index === proofCount - 1 ? 1.12 : 1);
    return [...proofWeights, 1.28, 0.92];
  }
  if (scenario === "ad") return [0.72, 0.95, 1.08, 1.18, 1.07];
  if (scenario === "promo") return [0.86, 0.92, 1.08, 1.18, 1.06];
  return Array.from({ length: proofCount }, () => 1);
}

function distributeDurations(count, target, scenario = "ecommerce", proofCount = count) {
  const weights = durationWeightsForScenario(scenario, proofCount);
  const usableWeights = weights.length === count ? weights : Array.from({ length: count }, (_, index) => weights[index] || 1);
  return normalizeWeightedDurations(usableWeights, target);
}

function klingGenerationDurationForShot(shot) {
  const planned = Number(shot.duration_sec || 0);
  const configured = Number(shot.kling?.generation_duration_sec || 0);
  const value = configured > 0 ? configured : Math.ceil(planned);
  return Math.min(15, Math.max(3, value));
}

function defaultAssets(brief) {
  return Array.isArray(brief.assets) && brief.assets.length
    ? brief.assets
    : [{ id: "product_main", role: "product", path: "./assets/input/product.jpg" }];
}

function productImageRefs(brief) {
  const assets = defaultAssets(brief);
  const productAssets = assets.filter((asset) => asset.role === "product" || asset.id === "product_main");
  return (productAssets.length ? productAssets : assets).slice(0, 2).map((asset) => asset.id);
}

function shouldUseModelFusionForBrief(brief) {
  return Boolean(brief.model_library?.enabled !== false && isApparelCategory(brief.product?.category || ""));
}

function modelSelectionForBrief(brief, view = "front") {
  return {
    required: shouldUseModelFusionForBrief(brief),
    model_id: selectedModelIdFromBrief(brief),
    view: brief.model_library?.selected_view || view || "front",
    library_path: brief.model_library?.library_path || "./assets/models/model-library.json"
  };
}

function image2ModeForShot(brief, productPresence, fallback = "image-to-image") {
  if (fallback === "text-to-image" || productPresence === "none") return fallback;
  return shouldUseModelFusionForBrief(brief) ? "product-model-fusion" : fallback;
}

function modelForShot(brief, productPresence, view = "front") {
  if (!shouldUseModelFusionForBrief(brief) || productPresence === "none") {
    return { required: false, model_id: "", view: "front" };
  }
  return modelSelectionForBrief(brief, view);
}

function negativeFor(brief, extra = "") {
  const mustAvoid = Array.isArray(brief.product?.must_avoid) ? brief.product.must_avoid.join("，") : "";
  const raw = [mustAvoid, extra, "产品变形，颜色失真，文字乱码，Logo变形，背景杂乱，镜头抖动"].filter(Boolean).join("，");
  const seen = new Set();
  return raw
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter((item) => item && !seen.has(item) && seen.add(item))
    .join("，");
}

function visualIdentityForBrief(brief) {
  const { name, appearance } = productSummary(brief);
  const mustKeep = Array.isArray(brief.product?.must_keep) ? brief.product.must_keep.join("，") : "";
  return [name, appearance, mustKeep ? `必须保持：${mustKeep}` : ""].filter(Boolean).join("；");
}

function continuityProfileForBrief(brief, scenario, shotCount) {
  const { name, category, tone, lighting, camera } = productSummary(brief);
  const audience = brief.product?.target_audience || "目标用户";
  const platform = brief.target_platform || "短视频平台";
  const rhythmByScenario = {
    ecommerce: "先证明卖点，再进入真实场景，最后产品定格收口；节奏清楚、实用、便于带货。",
    ad: "钩子快、揭示稳、情绪转场、卖点放大、定格收束；节奏有广告记忆点。",
    promo: "从语境到产品，再到优势和用户价值，最后品牌收束；节奏平稳连贯。"
  };
  return {
    narrative_logline: `${shotCount} 个镜头讲清 ${audience} 为什么需要${name}这个${category}。`,
    visual_identity: visualIdentityForBrief(brief),
    subject_consistency: "同一位模特/使用者，同一套内搭和发型，同一件商品，商品颜色、材质、结构、Logo位置和版型跨镜头保持一致。",
    rhythm: rhythmByScenario[scenario] || rhythmByScenario.ecommerce,
    camera_language: `${camera}；转场以同方向运动、相近景别或自然动作承接为主。`,
    lighting_language: lighting,
    platform
  };
}

function shotBeat(index, total, role, scenario, title) {
  const start = index === 0;
  const end = index === total - 1;
  const rhythm = start
    ? "开场 0.5 秒给商品或场景明确识别，随后进入动作。"
    : end
      ? "动作放慢，留出 0.8 秒定格给字幕和收尾。"
      : "承接上一个镜头的运动方向，1 秒内让商品重新清晰入镜。";
  return {
    index: index + 1,
    role,
    rhythm,
    transition_from_previous: start ? "开场镜头，无需承接。" : `延续上一镜头的同一模特、穿搭和商品状态，用相近景别或动作方向进入“${title}”。`,
    transition_to_next: end ? "收尾镜头，画面稳定定格。" : "结尾保留商品清晰可见，并用轻微运动或视线方向引到下一镜头。"
  };
}

function voiceoverForShot({ brief, scenario, title, purpose, point, role, isClosing }) {
  const name = brief.product?.name || "这款商品";
  const pointName = point?.name || title || purpose;
  const evidence = String(point?.evidence || "").replace(/[。.!！]+$/g, "");
  if (scenario === "ecommerce") {
    if (role === "selling-proof") return `${pointName}，${evidence || "孩子秋冬穿着不压身，实穿也利落"}。`;
    if (role === "lifestyle") return `${name}日常上学、户外玩耍和叠穿都很顺手。`;
    if (isClosing) return `黑色耐看又百搭，秋冬给孩子备这一件刚刚好。`;
  }
  if (scenario === "ad") {
    if (role === "hook") return `${name}，第一眼就要有记忆点。`;
    if (role === "reveal") return `把设计、质感和轮廓一次看清。`;
    if (role === "emotion") return `它不是只好看，也能进入真实日常。`;
    if (role === "benefit") return `${pointName}，让核心优势被看见。`;
    if (isClosing) return `${name}，把好感留在最后一秒。`;
  }
  if (role === "context") return `从真实场景开始，看见${name}的使用价值。`;
  if (role === "entry") return `${name}进入画面，产品重点更清楚。`;
  if (role === "advantages") return `核心优势集中呈现，细节和质感都要看得见。`;
  if (role === "user-value") return `放到用户身上，价值才真正成立。`;
  return `${name}，用一个完整画面完成收束。`;
}

function subtitleForVoiceover(text) {
  return String(text || "").replace(/[，。；;,.]+$/g, "");
}

function continuityPrefix(docOrBrief, shot) {
  const continuity = docOrBrief.continuity || {};
  return joinPromptParts([
    continuity.visual_identity ? `全片视觉连续性：${continuity.visual_identity}` : "",
    continuity.subject_consistency ? `连续性约束：${continuity.subject_consistency}` : "",
    shot.beat?.transition_from_previous ? `承接关系：${shot.beat.transition_from_previous}` : ""
  ]);
}

function joinPromptParts(parts) {
  const cleaned = parts
    .filter(Boolean)
    .map((item) => String(item).trim().replace(/[。.!！；;]+$/g, ""))
    .filter(Boolean);
  return cleaned.length ? `${cleaned.join("。")}。` : "";
}

function imagePromptForShot(doc, shot) {
  return joinPromptParts([
    continuityPrefix(doc, shot),
    shot.beat?.rhythm ? `镜头节奏：${shot.beat.rhythm}` : "",
    shot.scene?.prompt ? `场景要求：${shot.scene.prompt}` : "",
    shot.closing_frame_prompt
  ]);
}

function videoPromptForShot(doc, shot) {
  const continuity = joinPromptParts([
    doc.continuity?.subject_consistency ? `连续性：${doc.continuity.subject_consistency}` : "",
    shot.beat?.transition_from_previous ? `承接：${shot.beat.transition_from_previous}` : "",
    shot.beat?.transition_to_next ? `结尾：${shot.beat.transition_to_next}` : ""
  ]);
  return joinPromptParts([continuity, shot.beat?.rhythm ? `节奏：${shot.beat.rhythm}` : "", shot.video_prompt]);
}

function createShot({ id, title, purpose, duration, productPresence, sourceImages, image2Mode, framePrompt, videoPrompt, negative, size, model, beat, scene, voiceover, subtitle }) {
  return {
    id,
    title,
    purpose,
    beat: beat || {
      index: 0,
      role: "",
      rhythm: "",
      transition_from_previous: "",
      transition_to_next: ""
    },
    duration_sec: duration,
    product_presence: productPresence,
    source_images: sourceImages,
    model: model || {
      required: false,
      model_id: "",
      view: "front"
    },
    scene: scene || {
      scene_id: "",
      role: "background-reference",
      library_path: "./assets/scenes/scene-library.json",
      reference_image_path: "",
      prompt: "",
      fusion_mode: "scene-background-fusion"
    },
    voiceover: voiceover || "",
    subtitle: subtitle || subtitleForVoiceover(voiceover || ""),
    closing_frame_prompt: framePrompt,
    video_prompt: videoPrompt,
    negative_prompt: negative,
    image2: {
      mode: image2Mode,
      reference_weight: image2Mode === "image-to-image" || image2Mode === "product-model-fusion" ? 0.7 : 0,
      size,
      output_path: `./frames/generated/${id}/frame.png`
    },
    kling: {
      video_model: "kling-v3-omni",
      route: "image-to-video",
      generation_duration_sec: Math.min(15, Math.max(3, Math.ceil(Number(duration || 3)))),
      sound: "off"
    },
    frame_path: "",
    clip_path: "",
    qa_status: "pending"
  };
}

function ecommerceShots(brief, durations, size) {
  const { name, appearance, lighting, camera } = productSummary(brief);
  const refs = productImageRefs(brief);
  const points = topSellingPoints(brief, 3);
  const total = durations.length;
  const narrationEnabled = narrationDecisionForBrief(brief, "ecommerce").enabled;
  const sellingShots = points.map((point, index) => {
    const id = `s${String(index + 1).padStart(2, "0")}`;
    const title = `${point.name}证明`;
    const evidence = point.evidence || `用清楚的画面证明${point.name}`;
    const role = "selling-proof";
    const sceneRole = /活动|跑|玩|运动|方便/.test(point.name)
      ? "motion"
      : /耐脏|百搭|上学|日常|通勤|叠穿/.test(point.name)
        ? "context"
        : "proof";
    const voiceover = narrationEnabled ? voiceoverForShot({ brief, scenario: "ecommerce", title, purpose: `证明卖点：${point.name}`, point, role }) : "";
    return createShot({
      id,
      title,
      purpose: `证明卖点：${point.name}`,
      beat: shotBeat(index, total, role, "ecommerce", title),
      duration: durations[index],
      productPresence: "visible",
      sourceImages: refs,
      image2Mode: image2ModeForShot(brief, "visible"),
      model: modelForShot(brief, "visible", "front"),
      scene: sceneForShot(brief, "ecommerce", sceneRole, id),
      voiceover,
      subtitle: subtitleForVoiceover(voiceover),
      size,
      framePrompt: `竖屏 9:16，${name}作为画面主角，${appearance}。画面直接证明“${point.name}”：${evidence}。${lighting}，${camera}，商品比例真实，画面无文字。`,
      videoPrompt: `竖屏 9:16，${durations[index]} 秒。${name}在真实使用或展示场景中完成一个清楚动作，用画面证明“${point.name}”：${evidence}。镜头稳定推进，${lighting}，商品外观、颜色和材质全程保持一致，画面无文字。`,
      negative: negativeFor(brief, "动作不连贯，手部畸形，穿模，功能演示不清楚")
    });
  });
  const lifestyleIndex = sellingShots.length;
  const closingIndex = sellingShots.length + 1;
  return [
    ...sellingShots,
    createShot({
      id: `s${String(lifestyleIndex + 1).padStart(2, "0")}`,
      title: "生活场景",
      purpose: "把商品放进目标用户的真实使用场景",
      beat: shotBeat(lifestyleIndex, total, "lifestyle", "ecommerce", "生活场景"),
      duration: durations[lifestyleIndex],
      productPresence: "lifestyle",
      sourceImages: refs,
      image2Mode: image2ModeForShot(brief, "lifestyle"),
      model: modelForShot(brief, "lifestyle", "front"),
      scene: sceneForShot(brief, "ecommerce", "lifestyle", `s${String(lifestyleIndex + 1).padStart(2, "0")}`),
      voiceover: narrationEnabled ? voiceoverForShot({ brief, scenario: "ecommerce", title: "生活场景", purpose: "真实使用场景", role: "lifestyle" }) : "",
      size,
      framePrompt: `竖屏 9:16，${name}出现在目标用户的真实生活场景中，${appearance}保持准确。环境干净自然，用户状态可信，不夸张摆拍，画面无文字。`,
      videoPrompt: `竖屏 9:16，${durations[lifestyleIndex]} 秒。目标用户在真实生活场景中自然使用或展示${name}，动作轻松可信，商品始终清晰可见。镜头中景缓慢跟随，${lighting}，画面无文字。`,
      negative: negativeFor(brief, "人物变脸，穿搭变化，动作僵硬，摆拍感过强")
    }),
    createShot({
      id: `s${String(closingIndex + 1).padStart(2, "0")}`,
      title: "产品定格收尾",
      purpose: "给后期品牌、价格和卖点标签留白",
      beat: shotBeat(closingIndex, total, "closing", "ecommerce", "产品定格收尾"),
      duration: durations[closingIndex],
      productPresence: "visible",
      sourceImages: refs,
      image2Mode: image2ModeForShot(brief, "visible"),
      model: modelForShot(brief, "visible", "front"),
      scene: sceneForShot(brief, "ecommerce", "closing", `s${String(closingIndex + 1).padStart(2, "0")}`),
      voiceover: narrationEnabled ? voiceoverForShot({ brief, scenario: "ecommerce", title: "产品定格收尾", purpose: "收尾", role: "closing", isClosing: true }) : "",
      size,
      framePrompt: `竖屏 9:16，${name}正面居中，背景干净，上方三分之一留白，${appearance}准确清晰，均匀补光，画面无文字。`,
      videoPrompt: `竖屏 9:16，${durations[closingIndex]} 秒。${name}正面居中定格，镜头极慢推进，上方三分之一留白用于后期文字，商品颜色和结构准确，画面本身无文字。`,
      negative: negativeFor(brief, "产品偏移中心，背景杂色")
    })
  ];
}

function adShots(brief, durations, size) {
  const { name, appearance, tone, lighting } = productSummary(brief);
  const refs = productImageRefs(brief);
  const memoryPoint = topSellingPoints(brief, 1)[0]?.name || brief.style?.tone || "核心记忆点";
  const narrationEnabled = narrationDecisionForBrief(brief, "ad").enabled;
  const shots = [
    {
      title: "广告钩子",
      role: "hook",
      purpose: "用强视觉记忆点抓住注意力",
      productPresence: "detail",
      mode: "image-to-image",
      frame: `竖屏 9:16，${name}的关键材质或轮廓形成强视觉钩子，${appearance}准确，背景简洁有冲击力，突出“${memoryPoint}”，画面无文字。`,
      video: `竖屏 9:16，${durations[0]} 秒。${name}的关键材质或轮廓以强视觉钩子开场，光线快速扫过产品表面，突出“${memoryPoint}”，镜头短促推进，画面无文字。`
    },
    {
      title: "产品揭示",
      role: "reveal",
      purpose: "让用户明确看见商品本体",
      productPresence: "visible",
      mode: "image-to-image",
      frame: `竖屏 9:16，${name}完整出现，${appearance}，${lighting}，画面高级干净，产品比例真实，画面无文字。`,
      video: `竖屏 9:16，${durations[1]} 秒。${name}从局部细节过渡到完整产品，镜头缓慢拉开，${lighting}，产品外观保持一致，画面无文字。`
    },
    {
      title: "情绪场景",
      role: "emotion",
      purpose: "建立广告情绪和品牌感",
      productPresence: "lifestyle",
      mode: "image-to-image",
      frame: `竖屏 9:16，${name}置于${tone}的广告场景中，环境和光线服务于产品记忆点，商品清晰但不过度堆砌，画面无文字。`,
      video: `竖屏 9:16，${durations[2]} 秒。${name}在${tone}的广告场景中自然出现，场景元素轻微运动，镜头平滑推进，产品始终稳定清晰，画面无文字。`
    },
    {
      title: "卖点放大",
      role: "benefit",
      purpose: "把最重要卖点转成可感知画面",
      productPresence: "detail",
      mode: "image-to-image",
      frame: `竖屏 9:16，微距展示${name}最能体现“${memoryPoint}”的产品细节，${appearance}准确，光线有质感，画面无文字。`,
      video: `竖屏 9:16，${durations[3]} 秒。微距展示${name}最能体现“${memoryPoint}”的产品细节，光线沿产品表面缓慢移动，材质变化清晰，画面无文字。`
    },
    {
      title: "广告定格",
      role: "closing",
      purpose: "形成最终记忆点并留给后期品牌信息",
      productPresence: "visible",
      mode: "image-to-image",
      frame: `竖屏 9:16，${name}居中定格，背景纯净有高级感，大面积留白，${appearance}准确，画面无文字。`,
      video: `竖屏 9:16，${durations[4]} 秒。${name}居中定格，镜头极慢推进，背景留白用于后期品牌和行动号召，画面本身无文字。`
    }
  ];
  return shots.map((shot, index) => {
    const id = `s${String(index + 1).padStart(2, "0")}`;
    const voiceover = narrationEnabled ? voiceoverForShot({ brief, scenario: "ad", title: shot.title, purpose: shot.purpose, point: { name: memoryPoint }, role: shot.role, isClosing: index === shots.length - 1 }) : "";
    return createShot({
    id,
    title: shot.title,
    purpose: shot.purpose,
    beat: shotBeat(index, shots.length, shot.role, "ad", shot.title),
    duration: durations[index],
    productPresence: shot.productPresence,
    sourceImages: refs,
    image2Mode: image2ModeForShot(brief, shot.productPresence, shot.mode),
    model: modelForShot(brief, shot.productPresence, shot.productPresence === "detail" ? "side" : "front"),
    scene: sceneForShot(brief, "ad", shot.role === "emotion" ? "lifestyle" : shot.role, id),
    voiceover,
    subtitle: subtitleForVoiceover(voiceover),
    size,
    framePrompt: shot.frame,
    videoPrompt: shot.video,
    negative: negativeFor(brief, "过度滤镜，广告质感廉价，产品不清晰")
  });
  });
}

function promoShots(brief, durations, size) {
  const { name, category, appearance, tone, lighting } = productSummary(brief);
  const refs = productImageRefs(brief);
  const points = topSellingPoints(brief, 3).map((point) => point.name).join("、") || "核心优势";
  const narrationEnabled = narrationDecisionForBrief(brief, "promo").enabled;
  const shots = [
    {
      title: "场景开篇",
      role: "context",
      purpose: "建立宣传片语境和品类场景",
      productPresence: "none",
      mode: "text-to-image",
      frame: `竖屏 9:16，${category}相关的干净开篇场景，氛围为${tone}，空间有层次，光线自然，画面无商品文字和Logo。`,
      video: `竖屏 9:16，${durations[0]} 秒。${category}相关的干净开篇场景中，光线缓慢移动，建立${tone}的宣传片氛围，镜头平稳推进，画面无文字。`
    },
    {
      title: "产品进入",
      role: "entry",
      purpose: "从场景过渡到商品",
      productPresence: "visible",
      mode: "image-to-image",
      frame: `竖屏 9:16，${name}从场景中自然进入视觉中心，${appearance}准确，${lighting}，画面无文字。`,
      video: `竖屏 9:16，${durations[1]} 秒。镜头从场景缓慢过渡到${name}，产品进入视觉中心，${appearance}保持准确，${lighting}，画面无文字。`
    },
    {
      title: "核心优势",
      role: "advantages",
      purpose: "集中展示产品核心优势",
      productPresence: "detail",
      mode: "image-to-image",
      frame: `竖屏 9:16，展示${name}的核心优势：${points}。产品细节清晰，材质真实，画面无文字。`,
      video: `竖屏 9:16，${durations[2]} 秒。镜头依次掠过${name}最重要的细节，用画面展示${points}，运动克制高级，画面无文字。`
    },
    {
      title: "用户/使用价值",
      role: "user-value",
      purpose: "展示商品给目标用户带来的价值",
      productPresence: "lifestyle",
      mode: "image-to-image",
      frame: `竖屏 9:16，目标用户在真实场景中使用或接触${name}，状态自然可信，产品清楚可见，画面无文字。`,
      video: `竖屏 9:16，${durations[3]} 秒。目标用户在真实场景中自然使用或接触${name}，动作平稳可信，宣传片质感，产品外观稳定，画面无文字。`
    },
    {
      title: "品牌收束",
      role: "closing",
      purpose: "形成宣传片结尾并留给后期品牌信息",
      productPresence: "visible",
      mode: "image-to-image",
      frame: `竖屏 9:16，${name}在干净背景中完成宣传片式收尾构图，留出上方或侧方空白，${appearance}准确，画面无文字。`,
      video: `竖屏 9:16，${durations[4]} 秒。${name}在干净背景中完成宣传片式收尾，镜头极慢推进，留白用于后期品牌信息，画面本身无文字。`
    }
  ];
  return shots.map((shot, index) => {
    const id = `s${String(index + 1).padStart(2, "0")}`;
    const voiceover = narrationEnabled ? voiceoverForShot({ brief, scenario: "promo", title: shot.title, purpose: shot.purpose, role: shot.role, isClosing: index === shots.length - 1 }) : "";
    return createShot({
    id,
    title: shot.title,
    purpose: shot.purpose,
    beat: shotBeat(index, shots.length, shot.role, "promo", shot.title),
    duration: durations[index],
    productPresence: shot.productPresence,
    sourceImages: shot.mode === "image-to-image" ? refs : [],
    image2Mode: image2ModeForShot(brief, shot.productPresence, shot.mode),
    model: modelForShot(brief, shot.productPresence, shot.productPresence === "detail" ? "side" : "front"),
    scene: sceneForShot(brief, "promo", shot.role === "entry" ? "context" : shot.role, id),
    voiceover,
    subtitle: subtitleForVoiceover(voiceover),
    size,
    framePrompt: shot.frame,
    videoPrompt: shot.video,
    negative: negativeFor(brief, "宣传片节奏混乱，产品身份漂移，场景廉价")
  });
  });
}

function storyboardFromBrief(brief, opts = {}) {
  const scenario = normalizeScenario(opts.scenario || brief.scenario || brief.video_type);
  if (!["ecommerce", "ad", "promo"].includes(scenario)) throw new Error(`Unsupported scenario: ${scenario}`);
  const runDir = opts.runDir || brief.run_dir || path.dirname(opts.outPath || process.cwd());
  const widthHeight = expectedSize(brief);
  const size = `${widthHeight[0]}x${widthHeight[1]}`;
  const target = Number(brief.target_duration_sec || 15);
  const ecommerceProofCount = Math.min(topSellingPoints(brief, 3).length || 1, 3);
  const ecommerceCount = ecommerceProofCount + 2;
  const count = scenario === "ecommerce" ? ecommerceCount : 5;
  const durations = distributeDurations(count, target, scenario, scenario === "ecommerce" ? ecommerceProofCount : count);
  const continuity = continuityProfileForBrief(brief, scenario, count);
  const narrationDecision = narrationDecisionForBrief(brief, scenario);
  const storyboard = {
    project_id: brief.project_id,
    run_dir: runDir,
    scenario,
    video_type: scenarioToVideoType(scenario),
    target_platform: brief.target_platform || "douyin",
    product: brief.product || {},
    aspect_ratio: brief.aspect_ratio || "9:16",
    target_width: widthHeight[0],
    target_height: widthHeight[1],
    target_duration_sec: durations.reduce((sum, value) => sum + value, 0),
    continuity,
    narration: {
      mode: narrationDecision.mode,
      enabled: narrationDecision.enabled,
      delivery: narrationDecision.delivery,
      tts_enabled: narrationDecision.tts_enabled,
      kling_dialogue_enabled: narrationDecision.kling_dialogue_enabled,
      language: brief.language || "zh-CN",
      voice_style: narrationDecision.enabled ? (brief.narration?.voice_style || "自然、轻快、可信的电商解说") : "",
      decision_reason: narrationDecision.reason,
      total_script: "",
      tts_output_path: brief.narration?.tts_output_path || "./audio/voiceover.m4a",
      subtitle_srt_path: brief.narration?.subtitle_srt_path || "./subtitles/voiceover.srt",
      subtitle_ass_path: brief.narration?.subtitle_ass_path || "./subtitles/voiceover.ass"
    },
    global_negative_prompt: negativeFor(brief),
    frame_generation: {
      provider: "image2",
      mode: "image-to-image",
      request_dir: "./logs/image2-requests",
      output_dir: "./frames/generated",
      reference_weight: 0.7
    },
    model_library: {
      enabled: brief.model_library?.enabled !== false,
      library_path: brief.model_library?.library_path || "./assets/models/model-library.json",
      selected_model_id: selectedModelIdFromBrief(brief),
      selected_view: brief.model_library?.selected_view || "front",
      fusion_categories: ["服装", "童装", "女装", "男装", "内衣", "运动服", "鞋", "帽子", "配饰"]
    },
    scene_library: {
      enabled: brief.scene_library?.enabled !== false,
      library_path: brief.scene_library?.library_path || "./assets/scenes/scene-library.json",
      selection_strategy: brief.scene_library?.selection_strategy || "auto",
      preferred_scene_ids: brief.scene_library?.preferred_scene_ids || [],
      allow_scene_reference_fusion: brief.scene_library?.allow_scene_reference_fusion !== false
    },
    post_production: {
      overlay_plan: scenario === "ecommerce"
        ? "卖点标签、品牌名、价格和行动按钮全部后期叠加"
        : "品牌名、Slogan、Logo 和行动号召全部后期叠加",
      music: scenario === "ecommerce" ? "清爽明快，80-100 BPM" : "有记忆点的品牌配乐，70-90 BPM",
      subtitles: narrationDecision.enabled ? "narration-assets 生成字幕，assemble 阶段使用 --burn-subtitles 烧录" : "当前风格不生成解说和字幕"
    },
    assets: defaultAssets(brief),
    shots: []
  };
  if (scenario === "ecommerce") storyboard.shots = ecommerceShots(brief, durations, size);
  if (scenario === "ad") storyboard.shots = adShots(brief, durations, size);
  if (scenario === "promo") storyboard.shots = promoShots(brief, durations, size);
  storyboard.narration.total_script = narrationDecision.enabled
    ? storyboard.shots.map((shot) => shot.voiceover).filter(Boolean).join("\n")
    : "";
  return storyboard;
}

async function planStoryboard(args) {
  const briefPath = path.resolve(requireArg(args, "brief"));
  const outPath = path.resolve(requireArg(args, "out"));
  const brief = await readJson(briefPath);
  printValidation("brief", validateBriefDoc(brief));
  const storyboard = storyboardFromBrief(brief, {
    scenario: args.scenario && args.scenario !== true ? String(args.scenario) : undefined,
    runDir: args["run-dir"] && args["run-dir"] !== true ? String(args["run-dir"]) : path.dirname(outPath),
    outPath
  });
  printValidation("storyboard", validateStoryboardDoc(storyboard));
  await writeJson(outPath, storyboard);
  const resultPath = await writeStageResult(storyboard.run_dir || path.dirname(outPath), "02-storyboard-plan", {
    summary: "Scene-aware storyboard generated",
    storyboard_path: outPath,
    scenario: storyboard.scenario,
    shot_count: storyboard.shots.length,
    shots: storyboard.shots.map((shot) => ({
      id: shot.id,
      title: shot.title,
      purpose: shot.purpose,
      duration_sec: shot.duration_sec,
      generation_duration_sec: klingGenerationDurationForShot(shot),
      image2_mode: shot.image2?.mode,
      model_id: shot.model?.model_id || "",
      beat_role: shot.beat?.role || "",
      scene_id: shot.scene?.scene_id || "",
      voiceover: shot.voiceover || ""
    }))
  });
  console.log(`Scenario storyboard written: ${outPath}`);
  console.log(`Scenario: ${storyboard.scenario}`);
  console.log(`Shots: ${storyboard.shots.length}`);
  console.log(`Stage result: ${resultPath}`);
}

function shellQuote(value) {
  const s = String(value);
  if (/^[A-Za-z0-9_./:=@%+-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function resolveAssetPath(doc, assetId) {
  const asset = assetMap(doc).get(assetId);
  return asset?.path ? resolveRunRelative(doc, asset.path) : "";
}

function imageInputsForShot(doc, shot) {
  const paths = [];
  for (const id of shot.source_images || []) {
    const p = resolveAssetPath(doc, id);
    if (p) paths.push(p);
  }
  return paths;
}

function modelLibraryPath(doc) {
  const configured = shotlessModelLibraryPath(doc);
  return configured ? resolveRunRelative(doc, configured) : "";
}

function shotlessModelLibraryPath(doc) {
  return doc.model_library?.library_path || "";
}

async function readModelLibrary(doc) {
  const libraryPath = modelLibraryPath(doc);
  if (!libraryPath || !existsSync(libraryPath)) return { path: libraryPath, library: null };
  return { path: libraryPath, library: await readJson(libraryPath) };
}

function modelViewPathsFromLibrary(libraryInfo, modelId, view) {
  const model = libraryInfo.library?.models?.find((item) => item.id === modelId);
  if (!model) return [];
  if (view === "all") return Object.values(model.views || {});
  return model.views?.[view] ? [model.views[view]] : [];
}

function sceneLibraryPath(doc, shot) {
  const configured = shot?.scene?.library_path || doc.scene_library?.library_path || "";
  return configured ? resolveRunRelative(doc, configured) : "";
}

async function readSceneLibrary(doc, shot) {
  const libraryPath = sceneLibraryPath(doc, shot);
  if (!libraryPath || !existsSync(libraryPath)) return { path: libraryPath, library: null };
  return { path: libraryPath, library: await readJson(libraryPath) };
}

function resolveSceneReference(doc, libraryInfo, shot) {
  if (doc.scene_library?.enabled === false || !shot.scene?.scene_id) return { scene: shot.scene || null, images: [] };
  const sceneId = shot.scene.scene_id;
  const fromLibrary = libraryInfo.library?.scenes?.find((item) => item.id === sceneId);
  const scene = { ...(fromLibrary || {}), ...(shot.scene || {}) };
  const candidates = [
    shot.scene?.reference_image_path,
    fromLibrary?.reference_image_path
  ].filter(Boolean);
  const images = [];
  for (const item of candidates) {
    const resolved = path.isAbsolute(item)
      ? item
      : item.startsWith("./generated/") && libraryInfo.path
        ? path.resolve(path.dirname(libraryInfo.path), item)
        : resolveRunRelative(doc, item);
    if (existsSync(resolved) && !images.includes(resolved)) images.push(resolved);
  }
  return { scene, images };
}

function image2OutputPath(doc, shot) {
  const configured = shot.image2?.output_path || shot.frame_path || `frames/generated/${shot.id}/frame.png`;
  return resolveRunRelative(doc, configured);
}

async function image2RequestForShot(doc, shot) {
  const [width, height] = expectedSize(doc);
  const negative = [shot.negative_prompt || doc.global_negative_prompt || "", shot.scene?.negative_prompt || ""].filter(Boolean).join("，");
  const mode = shot.image2?.mode || doc.frame_generation?.mode || "image-to-image";
  const productImages = imageInputsForShot(doc, shot);
  const modelId = shot.model?.model_id || doc.model_library?.selected_model_id || "";
  const modelView = shot.model?.view || doc.model_library?.selected_view || "front";
  const libraryInfo = await readModelLibrary(doc);
  const rawModelImages = modelId ? modelViewPathsFromLibrary(libraryInfo, modelId, modelView) : [];
  const modelImages = rawModelImages.map((item) => path.isAbsolute(item) ? item : resolveRunRelative(doc, item));
  const sceneLibraryInfo = await readSceneLibrary(doc, shot);
  const sceneInfo = resolveSceneReference(doc, sceneLibraryInfo, shot);
  const sceneImages = doc.scene_library?.allow_scene_reference_fusion === false ? [] : sceneInfo.images;
  const isFusion = mode === "product-model-fusion";
  return {
    provider: "image2",
    project_id: doc.project_id,
    shot_id: shot.id,
    title: shot.title || "",
    purpose: shot.purpose || "",
    mode,
    prompt: imagePromptForShot(doc, shot),
    negative_prompt: negative,
    aspect_ratio: doc.aspect_ratio || "9:16",
    size: shot.image2?.size || `${width}x${height}`,
    source_images: isFusion ? [...productImages, ...modelImages, ...sceneImages] : [...productImages, ...sceneImages],
    product_images: isFusion ? productImages : undefined,
    model_images: isFusion ? modelImages : undefined,
    scene_images: sceneImages,
    continuity: doc.continuity || undefined,
    beat: shot.beat || undefined,
    narration: shot.voiceover || shot.subtitle ? {
      voiceover: shot.voiceover || "",
      subtitle: shot.subtitle || ""
    } : undefined,
    scene: sceneInfo.scene ? {
      scene_id: sceneInfo.scene.scene_id || sceneInfo.scene.id || "",
      title: sceneInfo.scene.title || "",
      prompt: sceneInfo.scene.prompt || "",
      fusion_mode: sceneInfo.scene.fusion_mode || "scene-background-fusion",
      library_path: sceneLibraryInfo.path || shot.scene?.library_path || doc.scene_library?.library_path || "",
      reference_image_path: shot.scene?.reference_image_path || sceneInfo.scene.reference_image_path || "",
      has_reference_image: sceneImages.length > 0
    } : undefined,
    model: isFusion ? {
      model_id: modelId,
      view: modelView,
      library_path: libraryInfo.path || doc.model_library?.library_path || ""
    } : undefined,
    fusion: isFusion ? {
      type: "apparel-product-on-model",
      preserve_product_cut_color_material: true,
      preserve_model_identity_pose_body: true,
      preserve_scene_lighting_perspective_when_available: sceneImages.length > 0,
      use_product_as_garment_reference: true,
      no_body_or_face_retouch_drift: true
    } : undefined,
    reference_weight: shot.image2?.reference_weight ?? doc.frame_generation?.reference_weight ?? 0.7,
    output_path: image2OutputPath(doc, shot),
    constraints: {
      product_presence: shot.product_presence || "",
      preserve_cross_shot_continuity: true,
      use_scene_reference_when_available: sceneImages.length > 0,
      no_text_in_generation: true,
      keep_brand_logo_price_for_post: true
    }
  };
}

async function image2Requests(args) {
  const storyboardPath = path.resolve(requireArg(args, "storyboard"));
  const doc = await readJson(storyboardPath);
  printValidation("storyboard", validateStoryboardDoc(doc));
  const requestDir = args.out && args.out !== true
    ? path.resolve(String(args.out))
    : resolveRunRelative(doc, doc.frame_generation?.request_dir || "./logs/image2-requests");
  await fs.mkdir(requestDir, { recursive: true });
  const manifest = {
    provider: "image2",
    project_id: doc.project_id,
    storyboard: storyboardPath,
    created_at: new Date().toISOString(),
    requests: []
  };
  for (const shot of doc.shots || []) {
    const request = await image2RequestForShot(doc, shot);
    await fs.mkdir(path.dirname(request.output_path), { recursive: true });
    const requestPath = path.join(requestDir, `${shot.id}.json`);
    await writeJson(requestPath, request);
    manifest.requests.push({
      shot_id: shot.id,
      request_path: requestPath,
      output_path: request.output_path
    });
  }
  const manifestPath = path.join(requestDir, "manifest.json");
  await writeJson(manifestPath, manifest);
  const stageResultPath = await writeStageResult(doc.run_dir || path.dirname(storyboardPath), "03-image2-requests", {
    summary: "image2 frame requests generated",
    storyboard_path: storyboardPath,
    manifest_path: manifestPath,
    request_count: manifest.requests.length,
    requests: manifest.requests
  });
  console.log(`image2 request manifest written: ${manifestPath}`);
  console.log(`Stage result: ${stageResultPath}`);
  console.log(`# Review before running. image2 frame generation may be billable.`);
  const image2Command = args["image2-command"] && args["image2-command"] !== true ? String(args["image2-command"]) : "";
  if (image2Command) {
    for (const item of manifest.requests) {
      console.log(`${image2Command} --request ${shellQuote(item.request_path)} --output ${shellQuote(item.output_path)}`);
    }
  } else {
    for (const item of manifest.requests) {
      console.log(`request=${item.request_path} output=${item.output_path}`);
    }
  }
}

async function klingCommands(args) {
  const storyboardPath = path.resolve(requireArg(args, "storyboard"));
  const stage = requireArg(args, "stage");
  const kling = args.kling && args.kling !== true ? path.resolve(String(args.kling)) : defaultKling;
  const doc = await readJson(storyboardPath);
  printValidation("storyboard", validateStoryboardDoc(doc));
  if (!["frames", "videos"].includes(stage)) throw new Error("--stage must be frames or videos");
  if (stage === "frames") {
    console.warn("WARN: frame generation now uses image2. Use `image2-requests`; forwarding to image2 request generation.");
    await image2Requests({ ...args, storyboard: storyboardPath });
    return;
  }
  if (!existsSync(kling)) throw new Error(`Kling script not found: ${kling}`);
  const commands = [];
  for (const shot of doc.shots) {
    const outDir = resolveRunRelative(doc, `clips/${shot.id}`);
    const negative = shot.negative_prompt || doc.global_negative_prompt || "";
    const frame = shot.frame_path ? resolveRunRelative(doc, shot.frame_path) : image2OutputPath(doc, shot);
    const generationDuration = klingGenerationDurationForShot(shot);
    const dialoguePrompt = klingDialoguePromptForShot(doc, shot);
    const prompt = joinPromptParts([videoPromptForShot(doc, shot), dialoguePrompt]);
    const cmd = ["node", kling, "video", "--prompt", prompt, "--duration", String(generationDuration), "--aspect_ratio", doc.aspect_ratio, "--output_dir", outDir];
    const videoModel = shot.kling?.video_model;
    if (videoModel) cmd.push("--model", videoModel);
    const sound = dialoguePrompt ? "on" : (shot.kling?.sound || "off");
    if (sound) cmd.push("--sound", sound);
    if (frame) cmd.push("--image", frame);
    if (negative) cmd.push("--negative_prompt", negative);
    commands.push(cmd);
  }
  console.log(`# Review before running. Kling generation is billable.`);
  const printableCommands = commands.map((cmd) => ["KLING_ALLOW_ABSOLUTE_PATHS=1", ...cmd].map(shellQuote).join(" "));
  const logsDir = resolveRunRelative(doc, "./logs");
  await fs.mkdir(logsDir, { recursive: true });
  const commandScriptPath = path.join(logsDir, "kling-video-commands.sh");
  await fs.writeFile(commandScriptPath, `#!/usr/bin/env bash\nset -euo pipefail\n\n${printableCommands.join("\n")}\n`);
  await fs.chmod(commandScriptPath, 0o755);
  const stageResultPath = await writeStageResult(doc.run_dir || path.dirname(storyboardPath), "05-kling-video-commands", {
    summary: "Kling video commands generated",
    storyboard_path: storyboardPath,
    command_script_path: commandScriptPath,
    command_count: printableCommands.length,
    output_dirs: (doc.shots || []).map((shot) => resolveRunRelative(doc, `clips/${shot.id}`))
  });
  console.log(`Command script written: ${commandScriptPath}`);
  console.log(`Stage result: ${stageResultPath}`);
  for (const cmd of printableCommands) console.log(cmd);
}

async function run(command, args, opts = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: opts.stdio || "pipe" });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}: ${stderr || stdout}`));
    });
  });
}

async function probe(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]);
  return JSON.parse(stdout);
}

function expectedSize(doc) {
  if (doc.target_width && doc.target_height) return [Number(doc.target_width), Number(doc.target_height)];
  const [a, b] = String(doc.aspect_ratio || "9:16").split(":").map(Number);
  if (a === 16 && b === 9) return [1920, 1080];
  if (a === 1 && b === 1) return [1080, 1080];
  return [1080, 1920];
}

function firstVideoPath(doc, shot) {
  if (shot.clip_path) return resolveRunRelative(doc, shot.clip_path);
  const dir = resolveRunRelative(doc, `clips/${shot.id}`);
  return { dir };
}

async function findFirstMp4(dir) {
  if (!existsSync(dir)) return "";
  const entries = await fs.readdir(dir);
  const mp4 = entries.find((entry) => entry.toLowerCase().endsWith(".mp4"));
  return mp4 ? path.join(dir, mp4) : "";
}

async function inspectMedia(args) {
  const storyboardPath = path.resolve(requireArg(args, "storyboard"));
  const stage = args.stage && args.stage !== true ? String(args.stage) : "all";
  const strict = Boolean(args.strict);
  const doc = await readJson(storyboardPath);
  const stages = stage === "all" ? ["frames", "clips"] : [stage];
  let failures = 0;
  const items = [];
  for (const shot of doc.shots || []) {
    if (stages.includes("frames")) {
      const frame = shot.frame_path ? resolveRunRelative(doc, shot.frame_path) : image2OutputPath(doc, shot);
      if (!frame || !existsSync(frame)) {
        console.log(`MISS frame ${shot.id}: ${frame || "(frame_path empty)"}`);
        items.push({ shot_id: shot.id, kind: "frame", status: "missing", path: frame || "" });
        if (strict) failures += 1;
      } else {
        const info = await probe(frame);
        const stream = info.streams?.find((s) => s.width && s.height);
        console.log(`OK frame ${shot.id}: ${frame} ${stream?.width || "?"}x${stream?.height || "?"}`);
        items.push({ shot_id: shot.id, kind: "frame", status: "ok", path: frame, width: stream?.width || null, height: stream?.height || null });
      }
    }
    if (stages.includes("clips")) {
      let clip = firstVideoPath(doc, shot);
      if (clip.dir) clip = await findFirstMp4(clip.dir);
      if (!clip || !existsSync(clip)) {
        console.log(`MISS clip ${shot.id}: ${shot.clip_path || "(clip_path empty/no mp4 in clips dir)"}`);
        items.push({ shot_id: shot.id, kind: "clip", status: "missing", path: shot.clip_path || "" });
        if (strict) failures += 1;
      } else {
        const info = await probe(clip);
        const stream = info.streams?.find((s) => s.codec_type === "video");
        const duration = Number(info.format?.duration || stream?.duration || 0);
        console.log(`OK clip ${shot.id}: ${clip} ${stream?.width || "?"}x${stream?.height || "?"} ${duration.toFixed(2)}s`);
        items.push({ shot_id: shot.id, kind: "clip", status: "ok", path: clip, width: stream?.width || null, height: stream?.height || null, duration_sec: Number(duration.toFixed(3)) });
      }
    }
  }
  const stageName = stages.join("-") === "frames-clips" ? "04-media-inspect" : `04-media-inspect-${stages.join("-")}`;
  const resultPath = await writeStageResult(doc.run_dir || path.dirname(storyboardPath), stageName, {
    summary: `Media inspected: ${items.filter((item) => item.status === "ok").length} ok, ${items.filter((item) => item.status === "missing").length} missing`,
    storyboard_path: storyboardPath,
    strict,
    items
  });
  console.log(`Stage result: ${resultPath}`);
  if (failures) throw new Error(`inspect-media failed with ${failures} missing item(s)`);
}

function timelineForShots(doc) {
  let cursor = 0;
  return (doc.shots || []).map((shot, index) => {
    const start = cursor;
    const duration = Number(shot.duration_sec || 0);
    const end = start + duration;
    cursor = end;
    return {
      index: index + 1,
      shot,
      start,
      end,
      duration,
      text: shot.voiceover || shot.subtitle || shot.title || shot.purpose || ""
    };
  });
}

function srtTime(seconds) {
  const msTotal = Math.max(0, Math.round(Number(seconds || 0) * 1000));
  const ms = msTotal % 1000;
  const totalSeconds = Math.floor(msTotal / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function assTime(seconds) {
  const csTotal = Math.max(0, Math.round(Number(seconds || 0) * 100));
  const cs = csTotal % 100;
  const totalSeconds = Math.floor(csTotal / 100);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAss(text) {
  return String(text || "").replace(/\{/g, "(").replace(/\}/g, ")").replace(/\r?\n/g, "\\N");
}

function escapeSrt(text) {
  return String(text || "").replace(/\r?\n/g, "\n");
}

function atempoFilters(factor) {
  let remaining = Number(factor || 1);
  const filters = [];
  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters;
}

async function writeSubtitleFiles(doc, timeline, srtPath, assPath) {
  const [width, height] = expectedSize(doc);
  const srtLines = [];
  for (const item of timeline) {
    const text = item.shot.subtitle || subtitleForVoiceover(item.text);
    srtLines.push(String(item.index));
    srtLines.push(`${srtTime(item.start)} --> ${srtTime(item.end)}`);
    srtLines.push(escapeSrt(text));
    srtLines.push("");
  }
  await fs.mkdir(path.dirname(srtPath), { recursive: true });
  await fs.writeFile(srtPath, `${srtLines.join("\n")}\n`);

  const fontSize = height >= 1900 ? 58 : 42;
  const marginV = height >= 1900 ? 155 : 90;
  const assLines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "ScaledBorderAndShadow: yes",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,PingFang SC,${fontSize},&H00FFFFFF,&H000000FF,&H9A000000,&H66000000,0,0,0,0,100,100,0,0,1,3,1,2,80,80,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
  ];
  for (const item of timeline) {
    const text = item.shot.subtitle || subtitleForVoiceover(item.text);
    assLines.push(`Dialogue: 0,${assTime(item.start)},${assTime(item.end)},Default,,0,0,0,,${escapeAss(text)}`);
  }
  await fs.mkdir(path.dirname(assPath), { recursive: true });
  await fs.writeFile(assPath, `${assLines.join("\n")}\n`);
}

async function synthesizeSayAudio(timeline, audioDir, outputPath, voice) {
  await fs.mkdir(audioDir, { recursive: true });
  const segmentsDir = path.join(audioDir, "segments");
  await fs.mkdir(segmentsDir, { recursive: true });
  await run("which", ["say"]);
  const normalized = [];
  for (const item of timeline) {
    const id = item.shot.id || `shot-${item.index}`;
    const textPath = path.join(segmentsDir, `${id}.txt`);
    const rawPath = path.join(segmentsDir, `${id}.aiff`);
    const wavPath = path.join(segmentsDir, `${id}.wav`);
    await fs.writeFile(textPath, `${item.text || ""}\n`);
    if (!item.text) {
      await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-t", String(item.duration), "-c:a", "pcm_s16le", wavPath]);
      normalized.push(wavPath);
      continue;
    }
    const sayArgs = [];
    if (voice) sayArgs.push("-v", voice);
    sayArgs.push("-o", rawPath, "-f", textPath);
    await run("say", sayArgs);
    const info = await probe(rawPath);
    const rawDuration = Number(info.format?.duration || 0);
    const filters = rawDuration > item.duration && item.duration > 0
      ? [...atempoFilters(rawDuration / item.duration), `atrim=0:${item.duration}`, "asetpts=N/SR/TB"].join(",")
      : `apad,atrim=0:${item.duration},asetpts=N/SR/TB`;
    await run("ffmpeg", ["-y", "-i", rawPath, "-af", filters, "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", wavPath]);
    normalized.push(wavPath);
  }
  const listPath = path.join(segmentsDir, "concat.txt");
  await fs.writeFile(listPath, normalized.map((file) => `file ${shellQuote(file)}\n`).join(""));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:a", "aac", "-b:a", "192k", outputPath]);
}

async function narrationAssets(args) {
  const storyboardPath = path.resolve(requireArg(args, "storyboard"));
  const doc = await readJson(storyboardPath);
  printValidation("storyboard", validateStoryboardDoc(doc));
  if (!narrationEnabledForDoc(doc)) {
    const resultPath = await writeStageResult(doc.run_dir || path.dirname(storyboardPath), "06-narration-assets", {
      summary: "Narration disabled for this storyboard style",
      storyboard_path: storyboardPath,
      enabled: false,
      decision_reason: doc.narration?.decision_reason || ""
    });
    console.log("Narration disabled; no TTS or subtitle assets generated.");
    console.log(`Stage result: ${resultPath}`);
    return;
  }
  const root = args["out-dir"] && args["out-dir"] !== true
    ? path.resolve(String(args["out-dir"]))
    : resolveRunRelative(doc, ".");
  const audioDir = path.join(root, "audio");
  const subtitlesDir = path.join(root, "subtitles");
  const textPath = path.join(audioDir, "voiceover.txt");
  const ttsOutput = resolveRunRelative(doc, doc.narration?.tts_output_path || "./audio/voiceover.m4a");
  const srtPath = resolveRunRelative(doc, doc.narration?.subtitle_srt_path || "./subtitles/voiceover.srt");
  const assPath = resolveRunRelative(doc, doc.narration?.subtitle_ass_path || "./subtitles/voiceover.ass");
  const timeline = timelineForShots(doc);
  await fs.mkdir(audioDir, { recursive: true });
  await fs.writeFile(textPath, `${timeline.map((item) => item.text).filter(Boolean).join("\n")}\n`);
  await writeSubtitleFiles(doc, timeline, srtPath, assPath);
  const tts = args.tts && args.tts !== true ? String(args.tts) : "say";
  const voice = args.voice && args.voice !== true ? String(args.voice) : "";
  const delivery = narrationDeliveryForDoc(doc);
  let audioStatus = delivery === "tts" ? "skipped" : `handled-by-${delivery}`;
  if (delivery === "tts" && tts !== "none") {
    if (tts !== "say") throw new Error("--tts must be say or none");
    await synthesizeSayAudio(timeline, audioDir, ttsOutput, voice);
    audioStatus = "generated";
  }
  const resultPath = await writeStageResult(doc.run_dir || path.dirname(storyboardPath), "06-narration-assets", {
    summary: delivery === "tts" ? "Narration, TTS audio, and subtitles generated" : "Narration script and subtitles generated; TTS skipped by delivery strategy",
    storyboard_path: storyboardPath,
    voiceover_text_path: textPath,
    delivery,
    tts_engine: tts,
    tts_audio_path: audioStatus === "generated" ? ttsOutput : "",
    audio_status: audioStatus,
    subtitle_srt_path: srtPath,
    subtitle_ass_path: assPath,
    line_count: timeline.length
  });
  console.log(`Voiceover text: ${textPath}`);
  if (audioStatus === "generated") console.log(`TTS audio: ${ttsOutput}`);
  else console.log(`TTS audio: skipped (${audioStatus})`);
  console.log(`SRT subtitles: ${srtPath}`);
  console.log(`ASS subtitles: ${assPath}`);
  console.log(`Stage result: ${resultPath}`);
}

async function qaReport(args) {
  const storyboardPath = path.resolve(requireArg(args, "storyboard"));
  const outPath = path.resolve(requireArg(args, "out"));
  const doc = await readJson(storyboardPath);
  const lines = [];
  lines.push(`# QA Report: ${doc.project_id || "product-video"}`);
  lines.push("");
  lines.push(`- Video type: ${doc.video_type}`);
  lines.push(`- Aspect ratio: ${doc.aspect_ratio}`);
  lines.push(`- Target duration: ${doc.target_duration_sec}s`);
  if (doc.continuity?.narrative_logline) lines.push(`- Narrative: ${doc.continuity.narrative_logline}`);
  const narrationEnabled = narrationEnabledForDoc(doc);
  if (narrationEnabled) lines.push(`- Narration: ${doc.narration?.tts_output_path || "./audio/voiceover.m4a"}`);
  else lines.push(`- Narration: disabled (${doc.narration?.decision_reason || "style decision"})`);
  lines.push("");
  lines.push("## Shot Checklist");
  lines.push("");
  for (const shot of doc.shots || []) {
    lines.push(`### ${shot.id} ${shot.title || shot.purpose || ""}`.trim());
    lines.push("");
    lines.push(`- Purpose: ${shot.purpose || ""}`);
    lines.push(`- Beat: ${shot.beat?.role || ""} / ${shot.beat?.rhythm || ""}`);
    lines.push(`- Transition: ${shot.beat?.transition_from_previous || ""}`);
    lines.push(`- Scene: ${shot.scene?.scene_id || ""}`);
    if (narrationEnabled) {
      lines.push(`- Voiceover: ${shot.voiceover || ""}`);
      lines.push(`- Subtitle: ${shot.subtitle || ""}`);
    }
    lines.push(`- Edit duration: ${shot.duration_sec}s`);
    lines.push(`- Kling generation duration: ${klingGenerationDurationForShot(shot)}s`);
    lines.push(`- QA status: ${shot.qa_status || "pending"}`);
    lines.push(`- Frame: ${shot.frame_path || ""}`);
    lines.push(`- Clip: ${shot.clip_path || ""}`);
    lines.push("- [ ] Product identity matches reference");
    lines.push("- [ ] No generated text/logo/price artifacts");
    lines.push("- [ ] Motion supports this shot purpose");
    lines.push("- [ ] Shot visually connects to previous/next shot");
    if (narrationEnabled) lines.push("- [ ] Narration and subtitle match this shot's visual content");
    lines.push("- [ ] Scene reference/fusion supports the shot instead of fighting product identity");
    lines.push("- [ ] No severe deformation, flicker, morphing, or camera shake");
    lines.push("- [ ] Accepted for final edit");
    lines.push("");
  }
  lines.push("## Retry Notes");
  lines.push("");
  lines.push("- Retry only failed shots and change the smallest necessary prompt surface.");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${lines.join("\n")}\n`);
  const resultPath = await writeStageResult(doc.run_dir || path.dirname(storyboardPath), "06-qa-report", {
    summary: "QA report generated",
    storyboard_path: storyboardPath,
    qa_report_path: outPath,
    shot_count: (doc.shots || []).length
  });
  console.log(`QA report written: ${outPath}`);
  console.log(`Stage result: ${resultPath}`);
}

function ffmpegFilterPath(file) {
  return String(file).replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/,/g, "\\,");
}

async function availableFfmpegFilters() {
  const { stdout, stderr } = await run("ffmpeg", ["-hide_banner", "-filters"]);
  return `${stdout}\n${stderr}`;
}

async function renderSubtitleOverlayImages(doc, tempDir) {
  const [width, height] = expectedSize(doc);
  const timeline = timelineForShots(doc);
  const overlayDir = path.join(tempDir, "subtitle-overlays");
  await fs.mkdir(overlayDir, { recursive: true });
  const configPath = path.join(overlayDir, "subtitle-overlays.json");
  const swiftPath = path.join(overlayDir, "render_subtitles.swift");
  const items = timeline.map((item) => ({
    shot_id: item.shot.id,
    start: item.start,
    end: item.end,
    text: item.shot.subtitle || subtitleForVoiceover(item.text),
    path: path.join(overlayDir, `${item.shot.id || `shot-${item.index}`}.png`)
  }));
  await writeJson(configPath, {
    width,
    height,
    font_size: height >= 1900 ? 58 : 42,
    margin_x: Math.round(width * 0.08),
    margin_bottom: height >= 1900 ? 150 : 90,
    box_height: height >= 1900 ? 190 : 140,
    items
  });
  await fs.writeFile(swiftPath, `import Foundation
import AppKit

struct SubtitleItem: Codable {
  let shot_id: String
  let start: Double
  let end: Double
  let text: String
  let path: String
}

struct Config: Codable {
  let width: Int
  let height: Int
  let font_size: Double
  let margin_x: Int
  let margin_bottom: Int
  let box_height: Int
  let items: [SubtitleItem]
}

let configURL = URL(fileURLWithPath: CommandLine.arguments[1])
let data = try Data(contentsOf: configURL)
let config = try JSONDecoder().decode(Config.self, from: data)

for item in config.items {
  let size = NSSize(width: config.width, height: config.height)
  let image = NSImage(size: size)
  image.lockFocus()
  NSColor.clear.setFill()
  NSRect(x: 0, y: 0, width: config.width, height: config.height).fill()

  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = .center
  paragraph.lineBreakMode = .byWordWrapping

  let font = NSFont(name: "PingFang SC", size: config.font_size)
    ?? NSFont.systemFont(ofSize: config.font_size, weight: .semibold)
  let rect = NSRect(
    x: config.margin_x,
    y: config.margin_bottom,
    width: config.width - config.margin_x * 2,
    height: config.box_height
  )
  let attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: NSColor.white,
    .strokeColor: NSColor.black,
    .strokeWidth: -4.5,
    .paragraphStyle: paragraph
  ]
  (item.text as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attrs)
  image.unlockFocus()

  guard let tiff = image.tiffRepresentation,
        let rep = NSBitmapImageRep(data: tiff),
        let png = rep.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "subtitle-render", code: 1)
  }
  try png.write(to: URL(fileURLWithPath: item.path))
}
`);
  await run("swift", [swiftPath, configPath]);
  return items;
}

async function subtitleBurnPlan(doc, subtitles, tempDir) {
  const filters = await availableFfmpegFilters();
  const ext = path.extname(subtitles || "").toLowerCase();
  if (ext === ".ass" && /\bass\b/.test(filters)) {
    return { kind: "vf", value: `ass=filename=${ffmpegFilterPath(subtitles)}`, inputs: [] };
  }
  if (/\bsubtitles\b/.test(filters)) {
    return { kind: "vf", value: `subtitles=filename=${ffmpegFilterPath(subtitles)}`, inputs: [] };
  }
  if (/\boverlay\b/.test(filters)) {
    const overlays = await renderSubtitleOverlayImages(doc, tempDir);
    return { kind: "overlay", inputs: overlays };
  }
  throw new Error("ffmpeg has no ass/subtitles/drawtext/overlay path for burning subtitles");
}

async function mediaHasAudio(file) {
  try {
    const info = await probe(file);
    return Boolean(info.streams?.some((stream) => stream.codec_type === "audio"));
  } catch {
    return false;
  }
}

async function normalizeClip(input, output, width, height, duration = 0, keepAudio = false) {
  await fs.mkdir(path.dirname(output), { recursive: true });
  const filters = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
    "setsar=1",
    "fps=30",
    "format=yuv420p"
  ];
  if (Number(duration) > 0) filters.push(`tpad=stop_mode=clone:stop_duration=${Number(duration).toFixed(3)}`);
  const vf = filters.join(",");
  const hasAudio = keepAudio ? await mediaHasAudio(input) : false;
  const args = ["-y", "-i", input];
  if (keepAudio && !hasAudio) {
    args.push("-f", "lavfi", "-t", String(Number(duration) > 0 ? duration : 0.1), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
  }
  if (Number(duration) > 0) args.push("-t", String(duration));
  args.push("-map", "0:v:0");
  if (keepAudio) args.push("-map", hasAudio ? "0:a:0" : "1:a:0");
  args.push("-vf", vf);
  if (keepAudio && Number(duration) > 0) args.push("-af", `apad,atrim=0:${Number(duration).toFixed(3)},asetpts=N/SR/TB`);
  if (!keepAudio) args.push("-an");
  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "18");
  if (keepAudio) args.push("-c:a", "aac", "-b:a", "192k");
  args.push(output);
  await run("ffmpeg", args);
}

async function assemble(args) {
  const storyboardPath = path.resolve(requireArg(args, "storyboard"));
  const output = path.resolve(requireArg(args, "output"));
  const doc = await readJson(storyboardPath);
  const [width, height] = expectedSize(doc);
  const editDir = path.dirname(output);
  const tempDir = path.join(editDir, ".factory-normalized");
  const audio = args.audio && args.audio !== true ? path.resolve(String(args.audio)) : "";
  const preserveGeneratedAudio = !audio && klingDialogueEnabledForDoc(doc);
  await fs.mkdir(tempDir, { recursive: true });
  const normalized = [];
  for (const shot of doc.shots || []) {
    let clip = firstVideoPath(doc, shot);
    if (clip.dir) clip = await findFirstMp4(clip.dir);
    if (!clip || !existsSync(clip)) throw new Error(`Missing clip for ${shot.id}; set clip_path or place mp4 under clips/${shot.id}`);
    const out = path.join(tempDir, `${shot.id}.mp4`);
    await normalizeClip(clip, out, width, height, Number(shot.duration_sec || 0), preserveGeneratedAudio);
    normalized.push(out);
  }
  const listPath = path.join(tempDir, "concat.txt");
  await fs.writeFile(listPath, normalized.map((file) => `file ${shellQuote(file)}\n`).join(""));
  const subtitles = (args.subtitles || args.subtitle) && (args.subtitles || args.subtitle) !== true
    ? path.resolve(String(args.subtitles || args.subtitle))
    : "";
  const burnSubtitles = Boolean(args["burn-subtitles"] || args.burn);
  const needsPost = Boolean(audio || (subtitles && burnSubtitles));
  const concatOut = needsPost ? path.join(tempDir, "video-only.mp4") : output;
  await fs.mkdir(path.dirname(output), { recursive: true });
  await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", concatOut]);
  if (needsPost) {
    const burnPlan = subtitles && burnSubtitles ? await subtitleBurnPlan(doc, subtitles, tempDir) : null;
    const ffmpegArgs = ["-y", "-i", concatOut];
    if (audio) ffmpegArgs.push("-i", audio);
    const overlayInputStart = 1 + (audio ? 1 : 0);
    if (burnPlan?.kind === "overlay") {
      for (const item of burnPlan.inputs) ffmpegArgs.push("-i", item.path);
    }
    let videoMap = "0:v:0";
    if (burnPlan?.kind === "vf") {
      ffmpegArgs.push("-vf", burnPlan.value);
    } else if (burnPlan?.kind === "overlay" && burnPlan.inputs.length) {
      let previous = "0:v";
      const filters = [];
      for (const [index, item] of burnPlan.inputs.entries()) {
        const inputIndex = overlayInputStart + index;
        const outputLabel = index === burnPlan.inputs.length - 1 ? "vout" : `v${index + 1}`;
        const start = Number(item.start || 0).toFixed(3);
        const end = Number(item.end || 0).toFixed(3);
        filters.push(`[${previous}][${inputIndex}:v]overlay=0:0:enable='between(t\\,${start}\\,${end})'[${outputLabel}]`);
        previous = outputLabel;
      }
      ffmpegArgs.push("-filter_complex", filters.join(";"));
      videoMap = "[vout]";
    }
    if (audio) {
      ffmpegArgs.push("-map", videoMap, "-map", "1:a:0", "-shortest");
    } else if (preserveGeneratedAudio) {
      ffmpegArgs.push("-map", videoMap, "-map", "0:a?", "-shortest");
    } else {
      ffmpegArgs.push("-map", videoMap, "-an");
    }
    if (burnPlan) ffmpegArgs.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "18");
    else ffmpegArgs.push("-c:v", "copy");
    if (audio || preserveGeneratedAudio) ffmpegArgs.push("-c:a", "aac", "-b:a", "192k");
    ffmpegArgs.push(output);
    await run("ffmpeg", ffmpegArgs);
  }
  const info = await probe(output);
  const stream = info.streams?.find((s) => s.codec_type === "video");
  const duration = Number(info.format?.duration || stream?.duration || 0);
  const resultPath = await writeStageResult(doc.run_dir || path.dirname(storyboardPath), "07-final-assembly", {
    summary: "Final video assembled",
    storyboard_path: storyboardPath,
    final_video_path: output,
    audio_path: audio || "",
    generated_audio_preserved: preserveGeneratedAudio,
    subtitles_path: subtitles || "",
    subtitles_burned: Boolean(subtitles && burnSubtitles),
    normalized_clip_count: normalized.length,
    width: stream?.width || null,
    height: stream?.height || null,
    duration_sec: Number(duration.toFixed(3))
  });
  console.log(`Final video written: ${output}`);
  console.log(`Stage result: ${resultPath}`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  try {
    if (!command || command === "help" || command === "--help") {
      usage();
      return;
    }
    if (command === "init") await init(args);
    else if (command === "model-library-requests") await modelLibraryRequests(args);
    else if (command === "scene-library-requests") await sceneLibraryRequests(args);
    else if (command === "plan-storyboard") await planStoryboard(args);
    else if (command === "validate-brief") printValidation("brief", validateBriefDoc(await readJson(path.resolve(requireArg(args, "brief")))));
    else if (command === "validate-storyboard") printValidation("storyboard", validateStoryboardDoc(await readJson(path.resolve(requireArg(args, "storyboard")))));
    else if (command === "image2-requests") await image2Requests(args);
    else if (command === "kling-commands") await klingCommands(args);
    else if (command === "inspect-media") await inspectMedia(args);
    else if (command === "narration-assets") await narrationAssets(args);
    else if (command === "qa-report") await qaReport(args);
    else if (command === "assemble") await assemble(args);
    else throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
