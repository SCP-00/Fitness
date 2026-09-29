# Exercise images, generated locally (ComfyUI)

> Goal: the 43 exercises that currently fall back to a drawn figure get a real
> silhouette, produced on this laptop, with **no third-party licence and no
> borrowed artwork**.
>
> Verdict up front: **yes, do it — but the input must be our own pose, not
> somebody else's screenshot, and the output must be reviewed before it ships.**

## 0. The three decisions this folder already made for you

**1. We do not use the reference images as input.** Feeding a screenshot of
another app's exercise into img2img makes a *derivative* of their art, which is
exactly the legal problem you wanted to avoid. What we feed the model instead is
a **pose map** rendered by our own movement rig ([`render-poses.mjs`](render-poses.mjs)):
a pure data skeleton whose joint angles come from `PATTERN_DEMOS` in
`bodylab/core/exercises`. Poses are functional data; the *look* is supplied by
the model and is entirely ours.

**2. The rig is not thrown away — it becomes the input.** This is the part that
makes the whole idea better than either option alone: the model cannot know that
a Nordic curl isolates the knee with a fixed shin, or that a plank is an
anti-extension brace. Our rig knows, because we wrote those angles. So the model
supplies style, and we keep biomechanical truth. It also means all 143 exercises
are already mapped (28 patterns → 143 ids, verified).

**3. It will not animate, and that is fine.** What prevents injuries is seeing
the *motion*. Our rig animates; a diffusion model produces stills. So the plan is
**one still per exercise** to complete the library, while the animation stays
with the rig and the licensed GIFs stay tier 1 of the cascade
(`gif → still → drawn`). Generated images only ever fill the *empty* slot.

## 1. Your machine (measured, not assumed)

| | |
|---|---|
| GPU | **NVIDIA RTX 3050 Laptop, 6 GB VRAM** (driver 617.14) |
| CPU / RAM | i5-13420H, 12 threads / 15.7 GB |
| Free disk | 235 GB on C: |
| Python / git-lfs | 3.11.15 / 3.7.1 |

6 GB is the whole story: it decides the model and the resolution.

| Tier | Models | Disk | Per image (768²/1024²) | VRAM behaviour |
|---|---|---|---|---|
| **`sd15`** (default) | SD 1.5 + OpenPose ControlNet | **5.3 GB** | **3–8 s** | comfortable, no flags needed |
| **`sdxl`** (quality) | SDXL + Lightning 4-step LoRA + OpenPose ControlNet | 9.2 GB | 15–45 s | needs `--lowvram`; slower but visibly better hands/limbs |

Start with `sd15` — get the loop working, judge the look on two or three images,
and only then download the SDXL tier if you want better figures. Total of both
tiers: **14.5 GB**, all verified reachable.

Skip (for this GPU): **Flux** (needs 12–24 GB, minutes per image here) and
**SD 3.5 / Z-Image** (6 B+ parameters, thin ControlNet ecosystem).

## 2. Install ComfyUI

Two routes. The **portable** one is recommended here: it is self-contained, it
never touches your system Python, and its `run_nvidia_gpu.bat` is exactly where
we want to add the memory flags.

### Route A — portable (recommended)

This machine has **no `D:` drive**, so the path used here is
`C:\ComfyUI_windows_portable` (short, outside OneDrive).

1. Download the portable build — this exact link is stable and was verified
   (`200`) while writing this:
   <https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia.7z>
   (≈1.5 GB; the `…_nvidia.7z` suffix matters — the plain `…portable.7z` name is
   a 404.)
2. Extract it at `C:\` with 7-Zip. It unpacks its own root folder,
   `ComfyUI_windows_portable`, so extracting **is safe even after the models are
   downloaded**: the archive only ships empty `models/` folders with
   `put_*_here` placeholders, and our file names (`sd15-base.safetensors`, …)
   do not collide. That is why `fetch-models.mjs` can run in parallel with the
   download and extraction.
3. Add the flags for 6 GB — open `run_nvidia_gpu.bat` and edit the last line:

```bat
.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build --lowvram
```

   `--lowvram` keeps the weights in system RAM and streams them to the GPU: slower,
   but it is what makes SDXL possible at 6 GB. Add `--fp16-vae` too if you see
   black images.

4. Also install the **ComfyUI-Manager** custom node (it is how you add
   `comfyui_controlnet_aux` later if a preprocessor is ever needed):
   `cd ComfyUI\custom_nodes && git clone https://github.com/ltdrdata/ComfyUI-Manager`
5. Double-click `run_nvidia_gpu.bat`. The UI is at <http://127.0.0.1:8188>.
   **Leave this window open while generating** — the scripts talk to that port.

### Route B — desktop app
The official installer from <https://www.comfy.org/> is friendlier, but it keeps
models in its own folder (point `COMFYUI_DIR` at it) and the extra launch flags
live in its settings rather than a `.bat`. Fine if you prefer a normal Windows
app.

## 3. Download the models

Everything is manifest-driven so nothing is guessed:

```bash
cd fitness-ecosystem/tools/ai-media
node fetch-models.mjs --check                 # verify every URL, download nothing
COMFYUI_DIR="D:/ComfyUI_windows_portable/ComfyUI" node fetch-models.mjs --tier light
```

`--check` is not ceremony: it HEADs each file and prints the real size, so a
renamed upstream file is caught in seconds instead of after 7 GB. The last run:
**5/5 reachable**, `sd15-base` 3.97 GB, `control-openpose-sd15` 1.35 GB.

Resumable — an interrupted download keeps a `.part` and continues from there.

Then, for the `sd15` tier, **a style LoRA is what turns 32 images into one set**.
Download one from Civitai (search *flat vector*, *silhouette*, *sport pictogram*,
*sticker*) into `models/loras/`, note its **trigger word**, and add a
`LoraLoader` node to the workflow (the SDXL template already shows how). One
LoRA only — mixing two destroys consistency.

## 4. The workflow templates

[`workflow-sd15-silhouette.json`](workflow-sd15-silhouette.json) and
[`workflow-sdxl-silhouette.json`](workflow-sdxl-silhouette.json) are in
**API format** (what `POST /prompt` takes), not the UI format. Same shape in both:

```
CheckpointLoader ──┬─→ CLIPTextEncode (positive) ─┐
                   ├─→ CLIPTextEncode (negative) ─┤
                   └─→ (SDXL: LoraLoader) ────────┤
LoadImage (our pose) ─→ ControlNetLoader ─→ ControlNetApplyAdvanced ─┐
EmptyLatentImage ────────────────────────────────────────────────────┤
                                                                     └─→ KSampler → VAEDecode → SaveImage
```

The only knobs that matter, and how to set them:

| Knob | `sd15` | `sdxl` | Why |
|---|---|---|---|
| steps / cfg | 26 / 6.5 | **4 / 2.0** | Lightning is a distilled 4-step LoRA; more steps or higher CFG *ruins* it |
| sampler / scheduler | `dpmpp_2m` / `karras` | `euler` / `sgm_uniform` | what each was trained for |
| ControlNet strength | 1.0 | 1.0 | below ~0.7 the model starts inventing a different pose |
| resolution | 768² | 1024² | SDXL is trained at 1024; SD1.5 at 512–768 |
| prompt | one fixed sentence, never edited per image | same | the prompt is part of the style contract |

Open a template in the ComfyUI UI with **Workflow → Open** if you want to see it
graphically (paste the JSON via *Load*), but the scripts drive it directly.

## 5. Run the pipeline

```bash
cd fitness-ecosystem/tools/ai-media

node render-poses.mjs            # 28 pose maps → poses/  (already committed-ready, 3 s)
node generate.mjs --dry-run      # what would be generated, and from which pose
node generate.mjs --only nordic-curl   # ONE image, to judge the look first
node generate.mjs --strength-only      # 32 exercises; cardio skipped on purpose
node generate.mjs                      # all 43 (11 of them are cardio: little to teach)
node generate.mjs --install            # after you have looked at them
```

`--dry-run` on this repo, right now:

```
without media        : 43
   …of those, with a pose available: 43
   …with no pose (keep the drawing): 0
queued now           : 43
```

Nothing touches the apps until `--install`, which copies the reviewed PNGs into
`public/exercises/ai/` of **both** apps and registers them in **both**
`asset-manifest.json` files as `image` entries (never as `gif`, never overriding
an existing source). Time budget: 32 images × ~5 s ≈ **3–5 minutes** of GPU on the
`sd15` tier, plus model load; SDXL is roughly 15–45 s each.

**Review is not optional.** A diffusion model produces *plausible* anatomy, not
*correct* anatomy: count limbs, check that the joint in the caption is the joint
bending, and check that the equipment matches what the exercise needs. A wrong
silhouette teaching a wrong position is worse than the honest drawing it would
replace. Generate two or three, look at them, then batch.

## 6. Rules that protect the result

1. Never feed third-party pixels (no GIFs, no screenshots, no downloaded lesson
   images) — only `poses/`, which is ours.
2. One prompt, one LoRA, one resolution, one seed family (the seed is
   `sha1(exerciseId)`, so re-runs are reproducible and the same exercise always
   gets the same image).
3. Review before install. Delete anything anatomically wrong rather than
   re-rolling the seed until it looks nice.
4. Annotations stay honest: `source: "generated-locally (own movement rig + local
   diffusion)"` is written into the manifest.
5. Generated images never replace the licensed GIFs or the public-domain photos —
   they only fill the empty slot, and the drawn fallback stays compiled in.
6. Cardio entries get skipped by default: a silhouette of "steady bike" teaches
   nothing that a duration does not.

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `torch.cuda.OutOfMemoryError` | launch with `--lowvram` (portable `.bat`), close Chrome/Discord, drop to 768² |
| Black or grey output | add `--fp16-vae`; SDXL needs its VAE (the template reads it from the checkpoint) |
| The figure ignores the pose | ControlNet strength below 1.0, or the pose PNG is not the openpose palette — re-run `render-poses.mjs` |
| Everything looks like the same person in a different room | that is a *style* problem: add the one style LoRA, don't touch the prompt |
| `ComfyUI is not answering at 127.0.0.1:8188` | the portable window is closed; start it and leave it open |
| Generation is very slow | expected at 6 GB with `--lowvram`; use the `sd15` tier for the batch and SDXL only for the images you care about |
| Download breaks at 90 % | re-run `fetch-models.mjs`: it resumes from the `.part` file |

## 8. What I would do next, in order

1. `fetch-models.mjs --tier light`, install one style LoRA, generate **two**
   images (`--only nordic-curl`, `--only archer-push-up`).
2. Look at them. If the look is good: `--strength-only`, review, `--install`.
3. If the look is *not* good, the cheap fix is a better LoRA (Civitai) rather
   than a bigger model — style lives in the LoRA, not the checkpoint.
4. Only then consider the animated version: the rig can already export every
   frame (`render-poses.mjs --all-frames`), so an AI-interpolated GIF is a
   stretch goal, not a rewrite.
