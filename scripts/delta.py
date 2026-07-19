import json
import os
from copy import deepcopy


def load_json(path):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return None


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)



def diff_dict(old, new):
    """
    Compute numeric deltas between two dicts:
    { "minecraft:stone": 120 } vs { "minecraft:stone": 140 }
    -> { "minecraft:stone": +20 }
    """

    deltas = {}
    keys = set(old.keys()) | set(new.keys())

    for key in keys:
        old_val = old.get(key, 0)
        new_val = new.get(key, 0)

        if isinstance(old_val, (int, float)) and isinstance(new_val, (int, float)):
            delta = new_val - old_val
            if delta != 0:
                deltas[key] = delta

    return deltas


def diff_player(old_player, new_player):
    """
    Compute deltas for a single player's stats.
    Handles:
    - blocks mined
    - items crafted
    - items used
    - mobs killed
    - custom stats
    - items picked up
    - items dropped
    """

    categories = [
        "blocks_mined",
        "items_crafted",
        "items_used",
        "mobs_killed",
        "custom_stats",
        "items_picked_up",
        "items_dropped",
    ]

    deltas = {}

    for cat in categories:
        old_cat = old_player.get(cat, {})
        new_cat = new_player.get(cat, {})
        cat_delta = diff_dict(old_cat, new_cat)

        if cat_delta:
            deltas[cat] = cat_delta

    return deltas


def compute_deltas(current_stats, cache_path):
    """
    Compare current stats.json with cache.json.

    Returns:
    {
        "players": {
            "uuid": {
                "blocks_mined": { "minecraft:stone": +12, ... },
                "items_crafted": { ... },
                ...
            }
        }
    }
    """

    # Load previous stats
    old_stats = load_json(cache_path)
    new_stats = current_stats

    # If no cache exists yet, create one and return empty deltas
    if old_stats is None:
        save_json(cache_path, deepcopy(new_stats))
        return {"players": {}}

    deltas = {"players": {}}

    old_players = old_stats.get("stats", {}).get("players", {})
    new_players = new_stats.get("stats", {}).get("players", {})

    for uuid, new_player in new_players.items():
        old_player = old_players.get(uuid, {})
        player_delta = diff_player(old_player, new_player)

        if player_delta:
            deltas["players"][uuid] = player_delta

    # Update cache
    save_json(cache_path, deepcopy(new_stats))

    return deltas
