# F5 QA — Render full-res vs shipped (decimated+quantized+meshopt) muscles at
# identical cameras (Workbench, ortho) and diff the pixels.
# Run: blender --background --python 07_render_qa.py -- <fullres_glb> <shipped_glb> <outdir>
import bpy
import sys
import os
import json
import math
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
full_glb, ship_glb, outdir = argv[0], argv[1], argv[2]
os.makedirs(outdir, exist_ok=True)

RES_X, RES_Y = 900, 1400
VIEWS = {"front": (0.0, 0.0), "threeq": (32.0, 8.0)}  # azimuth°, elevation°


def setup_and_render(glb, tag):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "SINGLE"
    sc.display.shading.single_color = (0.72, 0.30, 0.26)
    sc.render.resolution_x = RES_X
    sc.render.resolution_y = RES_Y
    cam_data = bpy.data.cameras.new("qa_cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 1.15
    cam = bpy.data.objects.new("qa_cam", cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    mid_z = 1.753 / 2
    paths = {}
    for name, (az, el) in VIEWS.items():
        a, e = math.radians(az), math.radians(el)
        d = 6.0
        cam.location = (d * math.cos(e) * math.sin(a),
                        -d * math.cos(e) * math.cos(a),
                        mid_z + d * math.sin(e))
        direction = Vector((0, 0, mid_z)) - cam.location
        cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        p = os.path.join(outdir, f"qa-{tag}-{name}.png")
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        paths[name] = p
        print(f"QA rendered {p}")
    return paths


def load_px(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    arr = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    bpy.data.images.remove(img)
    return arr


full = setup_and_render(full_glb, "fullres")
ship = setup_and_render(ship_glb, "shipped")

report = {}
for name in VIEWS:
    a, b = load_px(full[name]), load_px(ship[name])
    d = np.abs(a[:, :, :3] - b[:, :, :3]).max(axis=2)
    frac = float((d > 0.04).mean())
    mean_d = float(d.mean())
    report[name] = {"pixels_changed_frac": round(frac, 5), "mean_abs_delta": round(mean_d, 5)}
    print(f"QA {name}: changed={frac*100:.2f}% mean_delta={mean_d:.4f}")
    # diff heatmap (amplified) for the record
    hm = np.clip(d[..., None] * 5.0, 0, 1)
    heat = np.concatenate([hm, hm, hm, np.ones_like(hm)], axis=2).ravel()
    hi = bpy.data.images.new(f"heat-{name}", RES_X, RES_Y, alpha=True)
    hi.pixels = heat.tolist()
    hp = os.path.join(outdir, f"qa-diff-{name}.png")
    hi.filepath_raw = hp
    hi.file_format = "PNG"
    hi.save()
    bpy.data.images.remove(hi)

with open(os.path.join(outdir, "render_qa_report.json"), "w", encoding="utf-8") as f:
    json.dump(report, f, indent=1)
print("QA_OK", json.dumps(report))
