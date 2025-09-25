FROM python:3.11-slim

# Install system deps for camelot
RUN apt-get update && apt-get install -y \
    build-essential \
    libxml2-dev libxslt-dev \
    libjpeg-dev zlib1g-dev \
    poppler-utils ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./
EXPOSE 5000
CMD ["python", "app.py"]
