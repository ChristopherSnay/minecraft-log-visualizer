"""
Minecraft statistics collector.

Reads world/stats/*.json and returns normalized player statistics.

No external dependencies required.
"""

from __future__ import annotations

import json
from pathlib import Path

CM_TO_KM = 100000
TICKS_PER_HOUR = 20 * 60 * 60

CUSTOM_KEYS = {
    "minecraft:play_time": ("play_time_hours", lambda v: round(v / TICKS_PER_HOUR, 2)),
    "minecraft:time_since_death": ("hours_since_death", lambda v: round(v / TICKS_PER_HOUR, 2)),
    "minecraft:deaths": ("deaths", int),
    "minecraft:jump": ("jumps", int),
    "minecraft:walk_one_cm": ("walk_km", lambda v: round(v / CM_TO_KM, 2)),
    "minecraft:sprint_one_cm": ("sprint_km", lambda v: round(v / CM_TO_KM, 2)),
    "minecraft:crouch_one_cm": ("crouch_km", lambda v: round(v / CM_TO_KM, 2)),
    "minecraft:swim_one_cm": ("swim_km", lambda v: round(v / CM_TO_KM, 2)),
    "minecraft:fly_one_cm": ("fly_km", lambda v: round(v / CM_TO_KM, 2)),
    "minecraft:fall_one_cm": ("fall_km", lambda v: round(v / CM_TO_KM, 2)),
    "minecraft:damage_dealt": ("damage_dealt", int),
    "minecraft:damage_taken": ("damage_taken", int),
}


def _strip_namespace(name: str) -> str:
    if ":" in name:
        return name.split(":", 1)[1]
    return name


def _convert_block_table(table: dict) -> dict:
    return {
        _strip_namespace(block): count
        for block, count in sorted(
            table.items(),
            key=lambda item: item[1],
            reverse=True,
        )
    }


def collect(stats_directory: str | Path, uuid_lookup: dict | None = None) -> dict:
    """
    Parse every file in world/stats.

    uuid_lookup maps UUID -> player name.
    """

    stats_directory = Path(stats_directory)

    players = {}

    for stat_file in stats_directory.glob("*.json"):

        uuid = stat_file.stem

        player = uuid

        if uuid_lookup:
            player = uuid_lookup.get(uuid, uuid)

        with open(stat_file, encoding="utf8") as fp:
            data = json.load(fp)

        output = {}

        custom = data.get("stats", {}).get("minecraft:custom", {})

        for mc_key, value in custom.items():
            if mc_key in CUSTOM_KEYS:
                name, func = CUSTOM_KEYS[mc_key]
                output[name] = func(value)

        mined = (
            data.get("stats", {})
            .get("minecraft:mined", {})
        )

        killed = (
            data.get("stats", {})
            .get("minecraft:killed", {})
        )

        crafted = (
            data.get("stats", {})
            .get("minecraft:crafted", {})
        )

        output["blocks_mined"] = _convert_block_table(mined)
        output["mobs_killed"] = _convert_block_table(killed)
        output["items_crafted"] = _convert_block_table(crafted)

        players[player] = output

    return players