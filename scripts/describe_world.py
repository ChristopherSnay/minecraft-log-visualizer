import os

from dotenv import load_dotenv

load_dotenv()  # <-- THIS is the missing piece

def describe(path, indent=0):
    prefix = " " * indent

    if not os.path.exists(path):
        print(f"{prefix}[missing] {path}")
        return

    if os.path.isfile(path):
        print(f"{prefix}- {os.path.basename(path)}")
        return

    print(f"{prefix}{os.path.basename(path)}/")

    try:
        entries = sorted(os.listdir(path))
    except PermissionError:
        print(f"{prefix}  [permission denied]")
        return

    for entry in entries:
        full = os.path.join(path, entry)
        if os.path.isdir(full):
            describe(full, indent + 2)
        else:
            print(f"{' ' * (indent + 2)}- {entry}")


def main():
    world_path = os.getenv("WORLD_PATH")

    if not world_path:
        print("WORLD_PATH is not set in your environment.")
        return

    print(f"Describing world directory: {world_path}\n")
    describe(world_path)


if __name__ == "__main__":
    main()
