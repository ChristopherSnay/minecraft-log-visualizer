import asyncio
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

WEBHOOK_URL = os.environ["DISCORD_WEBHOOK_URL"]
SERVER_HOST = os.environ.get("MC_SERVER_HOST", "127.0.0.1")
SERVER_PORT = int(os.environ.get("MC_SERVER_PORT", "25565"))
POLL_INTERVAL = int(os.environ.get("DISCORD_POLL_INTERVAL", "30"))
MESSAGE_ID_FILE = Path(__file__).resolve().parent.parent / ".message_id"

last_players = set()
last_server_online = None


def load_message_id():
    if MESSAGE_ID_FILE.exists():
        return MESSAGE_ID_FILE.read_text().strip() or None
    return None


def save_message_id(mid):
    if mid:
        MESSAGE_ID_FILE.write_text(mid)
    elif MESSAGE_ID_FILE.exists():
        MESSAGE_ID_FILE.unlink()


def send_webhook(embed, content=None):
    mid = load_message_id()
    payload = {"embeds": [embed]}
    if content:
        payload["content"] = content

    if mid:
        url = f"{WEBHOOK_URL}/messages/{mid}"
        r = requests.patch(url, json=payload)
        if r.status_code == 404:
            save_message_id(None)
            return send_webhook(embed, content)
    else:
        r = requests.post(f"{WEBHOOK_URL}?wait=true", json=payload)
        if r.status_code in (200, 204):
            try:
                data = r.json()
                save_message_id(data.get("id"))
            except Exception:
                pass
    return r


def build_status_embed(players, player_count, max_players, version):
    if players:
        player_list = "\n".join(f"• {p}" for p in sorted(players))
        color = 0x43B581
        title = f"Online — {player_count}/{max_players}"
    else:
        player_list = "No players online"
        color = 0x747F8D
        title = "Server — 0 players online"

    return {
        "title": title,
        "description": player_list,
        "color": color,
        "footer": {"text": f"MC {version} • Polling every {POLL_INTERVAL}s"},
    }


async def query_server():
    from mcstatus import JavaServer

    try:
        server = JavaServer.lookup(f"{SERVER_HOST}:{SERVER_PORT}")
        status = await asyncio.wait_for(server.async_status(), timeout=10)
        players = set()
        if status.players.sample:
            for p in status.players.sample:
                players.add(p.name)
        return True, players, status.players.max, str(status.version.name)
    except Exception:
        return False, set(), 0, "unknown"


async def main():
    global last_players, last_server_online

    print(f"[discord_status] Polling {SERVER_HOST}:{SERVER_PORT} every {POLL_INTERVAL}s")
    print(f"[discord_status] Webhook: ...{WEBHOOK_URL[-20:]}")

    while True:
        online, players, max_players, version = await query_server()

        if online:
            joined = players - last_players
            left = last_players - players

            if players != last_players or online != last_server_online:
                embed = build_status_embed(players, len(players), max_players, version)
                send_webhook(embed)

                for name in joined:
                    print(f"[discord_status] +{name} joined")
                for name in left:
                    print(f"[discord_status] -{name} left")

            last_players = players
        else:
            if last_server_online is not False:
                embed = {
                    "title": "Server Offline",
                    "description": "The Minecraft server is not responding.",
                    "color": 0xF04747,
                }
                send_webhook(embed)
                print("[discord_status] Server is offline")

        last_server_online = online
        await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[discord_status] Shutting down")
