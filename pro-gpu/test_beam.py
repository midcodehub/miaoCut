import os
from beam import Image

image = (
    Image(python_version="python3.11", commands=["pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118"])
    .add_python_packages([
        "transformers", "timm", "einops",
        "cupy-cuda11x", "pillow", "numpy", "kornia",
        "fastapi", "python-multipart", "urllib3"
    ])
)
print("Image built successfully")
