/**
 * What to download, and where it goes.
 *
 * Two tiers, because a 6 GB laptop GPU cannot be prescribed the same stack as a
 * desktop. `light` is the one to install first (comfortable at 6 GB, 3–8 s per
 * image); `quality` is the same pipeline with SDXL + a 4-step Lightning LoRA
 * (better anatomy, 15–45 s per image, needs `--lowvram`).
 *
 * Every entry is checked against the real URL by `node fetch-models.mjs --check`
 * before anything is downloaded, so a renamed file is caught in seconds instead
 * of after 7 GB.
 *
 * `to` is the ComfyUI folder under `models/`; `as` is the name ComfyUI will show
 * in its node dropdowns (upstream keeps files called `diffusion_pytorch_model.*`
 * which is useless when three of them sit in the same folder).
 */
export const TIERS = {
  light: [
    {
      id: "sd15-base",
      repo: "stable-diffusion-v1-5/stable-diffusion-v1-5",
      file: "v1-5-pruned-emaonly.safetensors",
      to: "checkpoints",
      as: "sd15-base.safetensors",
      gb: 4.0,
    },
    {
      id: "controlnet-openpose-sd15",
      repo: "lllyasviel/control_v11p_sd15_openpose",
      file: "diffusion_pytorch_model.safetensors",
      to: "controlnet",
      as: "control-openpose-sd15.safetensors",
      gb: 1.4,
    },
  ],
  quality: [
    {
      id: "sdxl-base",
      repo: "stabilityai/stable-diffusion-xl-base-1.0",
      file: "sd_xl_base_1.0.safetensors",
      to: "checkpoints",
      as: "sdxl-base.safetensors",
      gb: 6.9,
    },
    {
      id: "sdxl-lightning-4step",
      repo: "ByteDance/SDXL-Lightning",
      file: "sdxl_lightning_4step_lora.safetensors",
      to: "loras",
      as: "sdxl-lightning-4step.safetensors",
      gb: 0.4,
    },
    {
      id: "controlnet-openpose-sdxl",
      repo: "xinsir/controlnet-openpose-sdxl-1.0",
      file: "diffusion_pytorch_model.safetensors",
      to: "controlnet",
      as: "control-openpose-sdxl.safetensors",
      gb: 2.5,
    },
  ],
};

/** Style LoRAs are downloaded by hand from Civitai (they need an account), so
 *  they are listed here instead of being fetched automatically. */
export const STYLE_LORAS = [
  {
    id: "flat-vector / silhouette",
    where: "civitai.com — search: “flat vector”, “silhouette”, “sprite sheet”, “sticker”",
    why: "a fixed style LoRA is what makes 143 images look like one set; pick ONE, note its trigger word, and never mix",
    install: "models/loras/<name>.safetensors + note the trigger word in this file",
  },
];

export const resolveUrl = (m) =>
  `https://huggingface.co/${m.repo}/resolve/main/${m.file}`;

export const allModels = (tier) =>
  tier === "all" ? [...TIERS.light, ...TIERS.quality] : TIERS[tier];
