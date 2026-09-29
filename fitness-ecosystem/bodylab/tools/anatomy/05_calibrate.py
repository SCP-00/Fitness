# F4 — Calibrate: scale skeleton+muscles GLBs so the SKELETON stature is exactly
# TARGET meters, grounded (min Z = 0 on the union), centered on X/Y.
# One shared transform (same scale + same offset) for both systems => registration kept.
# Run: blender --background --python 05_calibrate.py -- <src_dir> <masters_dir> <web_dir>
import bpy
import sys
import os
import json
import shutil
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
src_dir = argv[0]      # current (pre-calibration) GLBs
masters_dir = argv[1]  # calibrated full-res masters
web_dir = argv[2]      # web public dir

TARGET_HEIGHT = 1.753  # standard man stature (m), per docs/3D_MODELING_PLAN.md


def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_glb(path):
    """Import into the CURRENT scene (no wipe) and return its new mesh objects."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in set(bpy.data.objects) - before if o.type == "MESH"]


def bounds(objs):
    xs, ys, zs = [], [], []
    for o in objs:
        if o.type != "MESH":
            continue
        for c in o.bound_box:
            v = o.matrix_world @ Vector(c)
            xs.append(v.x); ys.append(v.y); zs.append(v.z)
    return dict(x0=min(xs), y0=min(ys), z0=min(zs),
                x1=max(xs), y1=max(ys), z1=max(zs))


def bake_and_transform(objs, S, dx, dy, dz):
    """Premultiply node transforms (mesh data untouched => mesh sharing kept,
    buffer deduplication in glTF export preserved)."""
    M = Matrix.Translation(Vector((dx, dy, dz))) @ Matrix.Scale(S, 4)
    for o in objs:
        o.matrix_world = M @ o.matrix_world


def export(objs, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )
    return os.path.getsize(path)


# --- 1) Skeleton: measure, derive shared transform --------------------------
skel = import_glb(os.path.join(src_dir, "anatomy-skeleton.glb"))
sb = bounds(skel)
H = sb["z1"] - sb["z0"]
S = TARGET_HEIGHT / H
print(f"CAL skeleton pre-height={H:.4f} scale={S:.6f}")

# --- 2) Muscles into the SAME scene (skeleton stays alive), measure --------
mus = import_glb(os.path.join(src_dir, "anatomy-muscles.glb"))
mb = bounds(mus)

# Union ground (whichever system reaches lowest), skeleton-centered on X/Y.
union_z0 = min(sb["z0"], mb["z0"]) * S
cx = (sb["x0"] + sb["x1"]) / 2 * S
cy = (sb["y0"] + sb["y1"]) / 2 * S
dx, dy, dz = -cx, -cy, -union_z0
print(f"CAL offsets dx={dx:.4f} dy={dy:.4f} dz={dz:.4f}")

# --- 3) Transform + export skeleton, then muscles (same scene) --------------
bake_and_transform(skel, S, dx, dy, dz)
os.makedirs(masters_dir, exist_ok=True)
skel_master = os.path.join(masters_dir, "anatomy-skeleton-calibrated.glb")
skel_bytes = export(skel, skel_master)
skel_post = bounds(skel)  # sanity check before scene is wiped

bake_and_transform(mus, S, dx, dy, dz)
mus_master = os.path.join(masters_dir, "anatomy-muscles-calibrated.glb")
mus_bytes = export(mus, mus_master)
mus_post = bounds(mus)

# --- 4) Deploy to web public dir --------------------------------------------
os.makedirs(web_dir, exist_ok=True)
shutil.copyfile(skel_master, os.path.join(web_dir, "anatomy-skeleton.glb"))
shutil.copyfile(mus_master, os.path.join(web_dir, "anatomy-muscles.glb"))

report = {
    "target_height_m": TARGET_HEIGHT,
    "skeleton": {
        "pre_height_m": round(H, 4),
        "scale": round(S, 6),
        "post_bounds": {k: round(v, 4) for k, v in skel_post.items()},
        "post_height_m": round(skel_post["z1"] - skel_post["z0"], 4),
        "bytes": skel_bytes,
    },
    "muscles": {
        "pre_height_m": round(mb["z1"] - mb["z0"], 4),
        "post_bounds": {k: round(v, 4) for k, v in mus_post.items()},
        "post_height_m": round(mus_post["z1"] - mus_post["z0"], 4),
        "bytes": mus_bytes,
    },
    "offset": {"dx": round(dx, 4), "dy": round(dy, 4), "dz": round(dz, 4)},
}
with open(os.path.join(masters_dir, "calibration_report.json"), "w", encoding="utf-8") as f:
    json.dump(report, f, indent=1)
print("CAL_OK", json.dumps(report))
