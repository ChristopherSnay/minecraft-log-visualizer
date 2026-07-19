import json
import os

from collectors.advancements import collect_advancements
from collectors.level import collect_level
from collectors.logs import collect_logs
from collectors.playerdata import collect_playerdata
# Collectors
from collectors.stats import collect_stats
from collectors.usercache import collect_usercache
# Delta engine
from delta import compute_deltas
from dotenv import load_dotenv


def write_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def parse_world(world_path):
    """
    Runs all collectors and returns a unified world model:

    {
        "stats": {...},
        "advancements": {...},
        "playerdata": {...},
        "level": {...},
        "logs": {...},
        "deltas": {...}
    }
    """

    world = {}

    # Run collectors
    world["stats"] = collect_stats(world_path)
    world["advancements"] = collect_advancements(world_path)
    world["playerdata"] = collect_playerdata(world_path)
    world["level"] = collect_level(world_path)
    world["logs"] = collect_logs()
    world["usercache"] = collect_usercache()

    # Merge player names into stats using usercache.json
    for uuid, name in world["usercache"].items():
        if uuid in world["stats"]["players"]:
            world["stats"]["players"][uuid]["name"] = name



    # Compute deltas
    cache_path = os.path.join("data", "cache.json")
    world["deltas"] = compute_deltas(world, cache_path)

    return world


def main():
    world_path = os.getenv("WORLD_PATH")

    if not world_path:
        raise RuntimeError("WORLD_PATH is not set in .env")

    if not os.path.isdir(world_path):
        raise RuntimeError(f"World folder not found: {world_path}")

    world = parse_world(world_path)

    # Write unified world model into public/data for React
    output_dir = os.path.join("public", "data")
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, "stats.json")
    write_json(output_path, world)

    print(f"Generated {output_path}")


load_dotenv()

if __name__ == "__main__":
    main()
