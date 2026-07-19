import json
import os

from dotenv import load_dotenv

load_dotenv()

def collect_usercache():
    """
    Loads usercache.json from the Minecraft server root defined in MC_ROOT.
    Returns a dict mapping UUID -> player name.
    """

    server_root = os.getenv("MC_ROOT")
    if not server_root:
        raise RuntimeError("MC_ROOT is not set in .env")

    path = os.path.join(server_root, "usercache.json")

    if not os.path.isfile(path):
        print(f"Warning: usercache.json not found at {path}")
        return {}

    try:
        with open(path, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading usercache.json: {e}")
        return {}

    # Convert list → dict keyed by UUID
    return {entry["uuid"]: entry["name"] for entry in data if "uuid" in entry and "name" in entry}
