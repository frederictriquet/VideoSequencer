FROM python:3.11-slim

# Installer les dépendances système nécessaires pour moviepy et ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Créer le répertoire de travail
WORKDIR /app

# Copier les requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code de l'API
COPY . .

# Créer les répertoires nécessaires
RUN mkdir -p /app/output /app/clips

# Exposer le port
EXPOSE 8000

# Lancer l'API
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
