import json
import os


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)

def parse_advancement_file(uuid, raw):
    """
    Normalize advancement data for both single-player and server formats.

    Single-player format:
        {
            "minecraft:story/mine_stone": {
                "done": true,
                "criteria": { ... }
            }
        }

    Server format:
        {
            "minecraft:story/mine_stone": 1,
            "minecraft:adventure/root": 0
        }
    """

    completed = []
    in_progress = []

    for adv_id, data in raw.items():

        # --- SERVER FORMAT (int) ---
        if isinstance(data, int):
            if data == 1:
                completed.append({
                    "id": adv_id,
                    "time": None
                })
            else:
                in_progress.append({
                    "id": adv_id,
                    "criteria": []
                })
            continue

        # --- SINGLE-PLAYER FORMAT (dict) ---
        if isinstance(data, dict):
            if data.get("done"):
                # Try to extract timestamp if present
                timestamp = None
                criteria = data.get("criteria", {})
                for crit, crit_data in criteria.items():
                    # Check if crit_data is a string timestamp
                    if isinstance(crit_data, str):
                        timestamp = crit_data
                        break
                    # Also check for dict format with "obtained" key (some formats)
                    elif isinstance(crit_data, dict) and "obtained" in crit_data:
                        timestamp = crit_data["obtained"]
                        break

                completed.append({
                    "id": adv_id,
                    "time": timestamp
                })
            else:
                in_progress.append({
                    "id": adv_id,
                    "criteria": list(data.get("criteria", {}).keys())
                })

    return {
        "uuid": uuid,
        "completed": completed,
        "in_progress": in_progress
    }


def collect_advancements(world_path):
    """
    Reads world/advancements/*.json and returns:

    {
        "players": {
            "uuid": {
                "completed": [...],
                "in_progress": [...]
            }
        }
    }
    """

    adv_dir = os.path.join(world_path, "players", "advancements")

    if not os.path.isdir(adv_dir):
        return {"players": {}}

    players = {}

    for filename in os.listdir(adv_dir):
        if not filename.endswith(".json"):
            continue

        full_path = os.path.join(adv_dir, filename)
        raw = load_json(full_path)

        uuid = filename.replace(".json", "")
        players[uuid] = parse_advancement_file(uuid, raw)

    return {"players": players}
