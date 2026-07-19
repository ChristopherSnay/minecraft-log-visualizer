import json
import os

# Minecraft stat keys map to nicer names
STAT_KEY_MAP = {
    "minecraft:mined": "blocks_mined",
    "minecraft:crafted": "items_crafted",
    "minecraft:used": "items_used",
    "minecraft:killed": "mobs_killed",
    "minecraft:custom": "custom_stats",
    "minecraft:picked_up": "items_picked_up",
    "minecraft:dropped": "items_dropped",
}

def translate_stats(raw_stats):
    # Server format wraps everything under "stats"
    root = raw_stats.get("stats", raw_stats)

    translated = {}

    for mc_key, nice_key in STAT_KEY_MAP.items():
        translated[nice_key] = root.get(mc_key, {})

    return translated


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)

def collect_stats(world_path):
    """
    Reads all world/stats/*.json files and returns a dict:

    {
        "players": {
            "Steve": { ... },
            "Alex": { ... }
        }
    }
    """

    stats_dir = os.path.join(world_path, "players", "stats")

    if not os.path.isdir(stats_dir):
        return {"players": {}}

    players = {}

    for filename in os.listdir(stats_dir):
        if not filename.endswith(".json"):
            continue

        full_path = os.path.join(stats_dir, filename)
        raw = load_json(full_path)

        # Extract UUID from filename
        uuid = filename.replace(".json", "")

        # Translate categories
        translated = translate_stats(raw)

        players[uuid] = translated

    return {"players": players}
