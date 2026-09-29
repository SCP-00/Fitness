# F2 — Extract: skeletal + muscular systems from Z-Anatomy, clean, export GLB.
# Run: blender --background --python 02_extract.py -- <blend> <outdir>
# License: source geometry is CC-BY-SA 4.0 (Z-Anatomy) / CC-BY-SA 2.1 JP (BodyParts3D).
import bpy
import json
import sys
import os

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
blend_path = argv[0]
outdir = argv[1]

SYSTEMS = {
    "skeleton": "1: Skeletal system",
    "muscles": "4: Muscular system",
}

# Suffix semantics (Z-Anatomy naming): .j joint/part of bone, .i insertion area,
# .l/.r left/right, .ol/.or/.el/.er origin/insertion of insertions system.
KEEP_SUFFIXES = {".j", ".l", ".r", ".i", ""}  # "" = no suffix (midline bones)
DROP_SUFFIXES = {".ol", ".or", ".el", ".er"}

bpy.ops.wm.open_mainfile(filepath=blend_path)

def tail(name: str) -> str:
    base, dot, suf = name.rpartition(".")
    if dot and len(suf) <= 2 and suf.isalpha():
        return "." + suf
    return ""

report = {}
for out_name, coll_name in SYSTEMS.items():
    coll = bpy.data.collections.get(coll_name)
    if not coll:
        report[out_name] = {"error": f"collection not found: {coll_name}"}
        continue

    # Build a fresh scene collection with linked copies of the wanted meshes
    kept, dropped = 0, 0
    tris = 0
    new_coll = bpy.data.collections.new(f"EXPORT_{out_name}")
    bpy.context.scene.collection.children.link(new_coll)

    for obj in list(coll.objects):
        if obj.type != "MESH":
            continue
        t = tail(obj.name)
        if t in DROP_SUFFIXES:
            dropped += 1
            continue
        if t not in KEEP_SUFFIXES:
            dropped += 1
            continue
        inst = obj.copy()  # linked duplicate (shares mesh data — cheap)
        inst.name = obj.name
        new_coll.objects.link(inst)
        kept += 1
        tris += sum(len(p.vertices) - 2 for p in obj.data.polygons)

    # Select only the new collection's objects for export
    bpy.ops.object.select_all(action="DESELECT")
    export_objs = [o for o in new_coll.objects]
    for o in export_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = export_objs[0] if export_objs else None

    out_path = os.path.join(outdir, f"anatomy-{out_name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,          # apply modifiers
        export_yup=True,            # glTF convention
    )
    size = os.path.getsize(out_path)
    report[out_name] = {"kept": kept, "dropped": dropped, "tris": tris, "bytes": size}
    print(f"EXPORT {out_name}: kept={kept} dropped={dropped} tris={tris} bytes={size}")

    # Cleanup the temp collection for the next system
    for o in export_objs:
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(new_coll)

with open(os.path.join(outdir, "extract_report.json"), "w", encoding="utf-8") as f:
    json.dump(report, f, indent=1)
print("EXTRACT_OK", json.dumps(report))
