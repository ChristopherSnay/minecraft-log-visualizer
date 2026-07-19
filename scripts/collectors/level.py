import os

import nbtlib


def collect_level(world_path):
    """
    Extracts world-level metadata from level.dat.

    Returns:
    {
        "seed": 123456789,
        "game_mode": "survival",
        "difficulty": "normal",
        "hardcore": False,
        "time": 123456,
        "day_time": 123456,
        "raining": False,
        "thundering": False,
        "spawn": [x, y, z],
        "border": {
            "center": [x, z],
            "size": 6000.0
        },
        "version": {
            "name": "1.20.4",
            "id": 346
        }
    }
    """

    level_path = os.path.join(world_path, "level.dat")
    if not os.path.isfile(level_path):
        return {"error": "level.dat not found"}

    data = nbtlib.load(level_path)
    # Some servers store level.dat with root["Data"], others store the data directly.
    root = data.get("Data", data)

    # Basic fields
    seed = int(root.get("WorldGenSettings", {}).get("seed", 0))
    game_mode = int(root.get("GameType", 0))
    difficulty = int(root.get("Difficulty", 2))
    hardcore = bool(root.get("hardcore", False))

    # Time fields
    time = int(root.get("Time", 0))
    day_time = int(root.get("DayTime", 0))

    # Weather
    raining = bool(root.get("raining", False))
    thundering = bool(root.get("thundering", False))

    # Spawn point
    spawn_x = int(root.get("SpawnX", 0))
    spawn_y = int(root.get("SpawnY", 0))
    spawn_z = int(root.get("SpawnZ", 0))

    # World border
    border_center_x = float(root.get("BorderCenterX", 0.0))
    border_center_z = float(root.get("BorderCenterZ", 0.0))
    border_size = float(root.get("BorderSize", 6000.0))

    # Version info
    version_name = str(root.get("Version", {}).get("Name", "unknown"))
    version_id = int(root.get("Version", {}).get("Id", 0))

    # Convert numeric game mode to readable string
    GAME_MODES = {
        0: "survival",
        1: "creative",
        2: "adventure",
        3: "spectator"
    }

    DIFFICULTIES = {
        0: "peaceful",
        1: "easy",
        2: "normal",
        3: "hard"
    }

    return {
        "seed": seed,
        "game_mode": GAME_MODES.get(game_mode, "unknown"),
        "difficulty": DIFFICULTIES.get(difficulty, "unknown"),
        "hardcore": hardcore,
        "time": time,
        "day_time": day_time,
        "raining": raining,
        "thundering": thundering,
        "spawn": [spawn_x, spawn_y, spawn_z],
        "border": {
            "center": [border_center_x, border_center_z],
            "size": border_size
        },
        "version": {
            "name": version_name,
            "id": version_id
        }
    }
