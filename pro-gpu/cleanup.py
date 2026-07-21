from beam import endpoint, Image, Volume
import os
import subprocess

image = Image(python_version="python3.11")
volume = Volume(name="miaocut-models-v2", mount_path="/models")

@endpoint(name="inspect", image=image, volumes=[volume])
def inspect_volume(context):
    res = subprocess.run(["du", "-sh", "/models"], capture_output=True, text=True)
    res2 = subprocess.run(["find", "/models", "-type", "f", "-print", "|", "wc", "-l"], shell=True, capture_output=True, text=True)
    res3 = subprocess.run(["ls", "-la", "/models"], capture_output=True, text=True)
    return {"size": res.stdout, "files": res2.stdout, "ls": res3.stdout}
