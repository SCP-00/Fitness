# F3 — Validate: import exported GLBs and measure overall height (Z extent).
# Run: blender --background --python 04_validate.py -- <dir-with-glbs> <out.json>
import bpy
import json
import sys
import os

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
src = argv[0]
out_path = argv[1] if len(argv) > 1 else "validate_report.json"

report = {}
for name in ("anatomy-skeleton", "anatomy-muscles"):
    # clean scene between imports
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path = os.path.join(src, name + ".glb")
    bpy.ops.import_scene.gltf(filepath=path)
    xs, ys, zs = [], [], []
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        for corner in o.bound_box:
            v = o.matrix_world @ __import__("mathutils").Vector(corner)
            xs.append(v.x); ys.append(v.y); zs.append(v.z)
    if not zs:
        report[name] = {"error": "no meshes"}
        continue
    report[name] = {
        "objects": len([o for o in bpy.data.objects if o.type == "MESH"]),
        "min": [round(min(xs), 3), round(min(ys), 3), round(min(zs), 3)],
        "max": [round(max(xs), 3), round(max(ys), 3), round(max(zs), 3)],
        "size": [round(max(xs) - min(xs), 3), round(max(ys) - min(ys), 3), round(max(zs) - min(zs), 3)],
    }
    print(f"VALIDATE {name}: {report[name]}")

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=1)
print("VALIDATE_OK")
