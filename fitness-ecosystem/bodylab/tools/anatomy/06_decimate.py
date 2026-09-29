# F5 — Decimate the calibrated muscles GLB to the web budget (~12 MB).
# Operates on UNIQUE mesh datablocks (glTF import shares meshes between
# mirrored objects): decimate once, re-share across all users.
# - Small structures (< MIN_TRIS) untouched to preserve fine anatomy
# - UVs dropped when no image textures reference them (colors live in materials)
# - Node names preserved (structure picking depends on them)
# Run: blender --background --python 06_decimate.py -- <src_glb> <out_glb> <report_json> [target_tris]
import bpy
import sys
import os
import json

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
src_glb, out_glb, report_path = argv[0], argv[1], argv[2]
TARGET_TRIS = int(argv[3]) if len(argv) > 3 else 1_050_000
MIN_TRIS = 400  # unique meshes below this tri count are never decimated


def tri_count(mesh) -> int:
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src_glb)
objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]

# --- Group objects by unique mesh datablock ----------------------------------
mesh_users: dict = {}
for o in objs:
    mesh_users.setdefault(o.data, []).append(o)

pre_tris_unique = sum(tri_count(m) for m in mesh_users)
pre_bytes = os.path.getsize(src_glb)

# --- UV / texture audit -------------------------------------------------------
has_uv = any(len(m.uv_layers) > 0 for m in mesh_users)
has_image = any(
    n.type == "TEX_IMAGE" and n.image
    for m in bpy.data.materials
    if m.use_nodes and m.node_tree
    for n in m.node_tree.nodes
)
drop_uv = has_uv and not has_image

# --- Adaptive ratio over UNIQUE tris ------------------------------------------
small_tris = sum(tri_count(m) for m in mesh_users if tri_count(m) < MIN_TRIS)
big_tris = pre_tris_unique - small_tris
ratio = min(1.0, max(0.05, (TARGET_TRIS - small_tris) / big_tris)) if big_tris else 1.0
print(f"DEC pre_tris_unique={pre_tris_unique} unique_meshes={len(mesh_users)} "
      f"small={small_tris} big={big_tris} ratio={ratio:.4f} drop_uv={drop_uv}")

# --- Decimate unique meshes (temp single-user objects) ------------------------
scene = bpy.context.scene
decimated_meshes = 0
for mesh, users in list(mesh_users.items()):
    t = tri_count(mesh)
    if t < MIN_TRIS or ratio >= 1.0:
        continue
    work = mesh.copy()  # single-user working copy
    tmp = bpy.data.objects.new("tmp_dec", work)
    scene.collection.objects.link(tmp)
    md = tmp.modifiers.new("dec", "DECIMATE")
    md.ratio = ratio
    md.use_collapse_triangulate = True
    with bpy.context.temp_override(object=tmp, active_object=tmp):
        bpy.ops.object.modifier_apply(modifier=md.name)
    scene.collection.objects.unlink(tmp)
    bpy.data.objects.remove(tmp)
    # Re-share the decimated result with every object that used the original
    for o in users:
        o.data = work
    mesh_users.pop(mesh)
    mesh_users[work] = users
    bpy.data.meshes.remove(mesh)
    decimated_meshes += 1

post_tris_unique = sum(tri_count(m) for m in mesh_users)
print(f"DEC decimated_unique_meshes={decimated_meshes} post_tris_unique={post_tris_unique}")

# --- Drop UVs (safe: no image textures) ---------------------------------------
if drop_uv:
    for m in mesh_users:
        while len(m.uv_layers) > 0:
            m.uv_layers.remove(m.uv_layers[0])

# --- Export --------------------------------------------------------------------
bpy.ops.object.select_all(action="DESELECT")
for o in objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.export_scene.gltf(
    filepath=out_glb,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
)
post_bytes = os.path.getsize(out_glb)
print(f"DEC bytes {pre_bytes} -> {post_bytes}")

report = {
    "src": src_glb,
    "out": out_glb,
    "pre_bytes": pre_bytes,
    "post_bytes": post_bytes,
    "pre_tris_unique": pre_tris_unique,
    "post_tris_unique": post_tris_unique,
    "unique_meshes": len(mesh_users),
    "decimated_unique_meshes": decimated_meshes,
    "ratio": round(ratio, 4),
    "min_tris_guard": MIN_TRIS,
    "dropped_uvs": bool(drop_uv),
    "has_image_textures": bool(has_image),
}
with open(report_path, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=1)
print("DEC_OK", json.dumps(report))
