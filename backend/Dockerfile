FROM python:3.11-slim

# System deps needed by OpenCV / EasyOCR (libgl, libglib) and Pillow (jpeg/png libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libjpeg62-turbo \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# Install CPU-optimized PyTorch first (fast & lightweight, avoids downloading 2.5GB CUDA bundles)
RUN pip install --no-cache-dir --default-timeout=1000 torch==2.4.1 torchvision==0.19.1 --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

COPY . .

RUN mkdir -p /app/app/static/uploads /app/app/static/ela_outputs

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
