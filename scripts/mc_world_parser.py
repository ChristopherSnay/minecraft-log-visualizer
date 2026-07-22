import json
import os
import zipfile
from datetime import datetime, timezone

from collectors.advancements import collect_advancements
from collectors.level import collect_level
from collectors.logs import collect_logs
from collectors.playerdata import collect_playerdata
# Collectors
from collectors.stats import collect_stats
from collectors.usercache import collect_usercache
from build_sessions import main as build_sessions
from dotenv import load_dotenv


def write_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def parse_world(world_path, captured_at):
    """
    Runs all collectors and returns a unified world model:

    {
        "stats": { "players": { "uuid": { ...all player data... } } },
        "level": {...},
        "logs": {...},
        "usercache": {...},
        "captured_at": "..."
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

    world["captured_at"] = captured_at

    # Merge player names into stats using usercache.json
    for uuid, name in world["usercache"].items():
        if uuid in world["stats"]["players"]:
            world["stats"]["players"][uuid]["name"] = name

    # Merge advancements and playerdata into each player's stats object
    adv_players = world.get("advancements", {}).get("players", {})
    pd_players = world.get("playerdata", {}).get("players", {})
    for uuid, player in world["stats"]["players"].items():
        if uuid in adv_players:
            adv = adv_players[uuid]
            player["completed"] = adv.get("completed", [])
            player["in_progress"] = adv.get("in_progress", [])
        if uuid in pd_players:
            pd = pd_players[uuid]
            for key in ("position", "dimension", "xp", "health", "food", "saturation", "inventory", "effects"):
                if key in pd:
                    player[key] = pd[key]

    # Remove now-redundant top-level collections
    world.pop("advancements", None)
    world.pop("playerdata", None)

    # Apply EXCLUDE_DATA: remove unwanted top-level and per-player keys.
    # Use @name to exclude an entire player by name (e.g. @DivineLight).
    exclude_raw = os.getenv("EXCLUDE_DATA", "")
    excludes = {k.strip() for k in exclude_raw.split(",") if k.strip()}
    excluded_names = {k[1:] for k in excludes if k.startswith("@")}
    key_excludes = {k for k in excludes if not k.startswith("@")}

    if key_excludes:
        for key in list(key_excludes):
            if key in world:
                del world[key]

        for player in world.get("stats", {}).get("players", {}).values():
            for key in key_excludes:
                player.pop(key, None)

    if excluded_names:
        players = world.get("stats", {}).get("players", {})
        to_remove = [uuid for uuid, p in players.items() if p.get("name") in excluded_names]
        for uuid in to_remove:
            del players[uuid]

    return world


def main():
    mc_root = os.getenv("MC_ROOT")

    if not mc_root:
        raise RuntimeError("MC_ROOT is not set in .env")

    if not os.path.isdir(mc_root):
        raise RuntimeError(f"Server root not found: {mc_root}")

    world_path = os.path.join(mc_root, "world")

    if not os.path.isdir(world_path):
        raise RuntimeError(f"World folder not found: {world_path}")

    captured_at = datetime.now(timezone.utc).isoformat()
    world = parse_world(world_path, captured_at)

    # Write unified world model into public/data for React
    output_dir = os.path.join("public", "data")
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, "stats.json")
    write_json(output_path, world)

    # Write timestamped backup
    backup_dir = os.path.join("data", "backups")
    os.makedirs(backup_dir, exist_ok=True)

    ts = captured_at.replace(":", "-").replace("+", "-").replace(".", "-")
    backup_path = os.path.join(backup_dir, f"stats-{ts}.zip")
    with zipfile.ZipFile(backup_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("stats.json", json.dumps(world, indent=2))

    print(f"Generated {output_path}")
    print(f"Backup  {backup_path}")

    build_sessions()


load_dotenv()

if __name__ == "__main__":
    main()
