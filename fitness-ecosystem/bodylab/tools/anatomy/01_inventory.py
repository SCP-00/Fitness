# F1 — Inventory: dump the Z-Anatomy blend structure to JSON (headless).
# Run: blender --background --python 01_inventory.py -- <blend> <out.json>
import bpy
import json
import sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
blend_path = argv[0] if argv else ""
out_path = argv[1] if len(argv) > 1 else "anatomy_inventory.json"

bpy.ops.wm.open_mainfile(filepath=blend_path)

def obj_stats(o):
    s = {
        "name": o.name,
        "type": o.type,
        "parent": o.parent.name if o.parent else None,
        "verts": 0,
        "tris": 0,
    }
    if o.type == "MESH":
        s["verts"] = len(o.data.vertices)
        s["tris"] = sum(len(p.vertices) - 2 for p in o.data.polygons)
    return s

inventory = {
    "blend": blend_path,
    "blender_version": bpy.app.version_string,
    "collections": [],
    "objects": [],
    "counts": {},
}

# Collections tree (Z-Anatomy organizes anatomy by systems)
def walk_coll(coll, depth=0):
    inventory["collections"].append({
        "name": coll.name,
        "depth": depth,
        "objects": [o.name for o in coll.objects],
    })
    for child in coll.children:
        walk_coll(child, depth + 1)

for coll in bpy.data.collections:
    if coll.users <= 1:  # root collections (not linked as child elsewhere)
        walk_coll(coll)

for o in bpy.data.objects:
    inventory["objects"].append(obj_stats(o))

from collections import Counter
types = Counter(o["type"] for o in inventory["objects"])
inventory["counts"] = {
    "objects_total": len(inventory["objects"]),
    "by_type": dict(types),
    "meshes": sum(1 for o in inventory["objects"] if o["type"] == "MESH"),
    "total_verts": sum(o["verts"] for o in inventory["objects"]),
    "total_tris": sum(o["tris"] for o in inventory["objects"]),
}

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(inventory, f, ensure_ascii=False)

print("INVENTORY_OK", inventory["counts"])
