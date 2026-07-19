import os

import nbtlib


def parse_player_file(path):
    """
    Extracts useful player information from NBT playerdata files.

    Returns:
    {
        "uuid": "...",
        "position": [x, y, z],
        "dimension": "minecraft:overworld",
        "xp": 42,
        "health": 18.0,
        "food": 20,
        "saturation": 5.0,
        "inventory": [
            {"id": "minecraft:stone", "count": 64},
            ...
        ],
        "effects": [
            {"id": "minecraft:speed", "amplifier": 1, "duration": 1200}
        ]
    }
    """

    data = nbtlib.load(path)
    # Some servers store level.dat with root["Data"], others store the data directly.
    root = data.get("Data", data)

    # Basic fields
    position = list(root.get("Pos", [0, 0, 0]))
    dimension = root.get("Dimension", "minecraft:overworld")
    xp = root.get("XpLevel", 0)
    health = float(root.get("Health", 0))
    food = root.get("foodLevel", 0)
    saturation = float(root.get("foodSaturationLevel", 0))

    # Inventory parsing
    inventory = []
    for item in root.get("Inventory", []):
        item_id = item.get("id", None)
        count = item.get("Count", 1)
        if item_id:
            inventory.append({
                "id": str(item_id),
                "count": int(count)
            })

    # Potion effects
    effects = []
    for eff in root.get("ActiveEffects", []):
        eff_id = eff.get("Id", None)
        amplifier = eff.get("Amplifier", 0)
        duration = eff.get("Duration", 0)

        if eff_id is not None:
            effects.append({
                "id": f"minecraft:{eff_id}",
                "amplifier": int(amplifier),
                "duration": int(duration)
            })

    return {
        "position": position,
        "dimension": str(dimension),
        "xp": int(xp),
        "health": health,
        "food": int(food),
        "saturation": saturation,
        "inventory": inventory,
        "effects": effects
    }


def collect_playerdata(world_path):
    """
    Reads world/playerdata/*.dat and returns:

    {
        "players": {
            "uuid": {
                ...player fields...
            }
        }
    }
    """

    playerdata_dir = os.path.join(world_path, "players", "data")


    if not os.path.isdir(playerdata_dir):
        return {"players": {}}

    players = {}

    for filename in os.listdir(playerdata_dir):
        if not filename.endswith(".dat"):
            continue

        full_path = os.path.join(playerdata_dir, filename)
        uuid = filename.replace(".dat", "")

        try:
            players[uuid] = parse_player_file(full_path)
        except Exception as e:
            players[uuid] = {"error": str(e)}

    return {"players": players}
