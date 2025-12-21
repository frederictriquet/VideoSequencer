#!/usr/bin/env python3
"""
API de rendu vidéo pour VideoSequencer
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from moviepy import VideoFileClip, ColorClip, CompositeVideoClip
import os
import tempfile
import json
from datetime import datetime
from typing import List, Optional

app = FastAPI(title="VideoSequencer Render Service")

# CORS pour permettre les requêtes depuis l'app web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèles
class GridSize(BaseModel):
    rows: int
    cols: int

class Instrument(BaseModel):
    id: str
    name: str
    gridPosition: int

class Clip(BaseModel):
    id: str
    instrumentId: str
    startTime: float
    duration: float

class RenderRequest(BaseModel):
    bpm: int
    gridSize: GridSize
    instruments: List[Instrument]
    clips: List[Clip]

# Configuration
CLIPS_DIR = "/app/clips"
OUTPUT_DIR = "/app/output"
TEMP_DIR = "/tmp/VideoSequencer_uploads"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

def beats_to_seconds(beats: float, bpm: int) -> float:
    return (beats / bpm) * 60

@app.get("/")
def root():
    return {"status": "ok", "service": "VideoSequencer Render API"}

@app.post("/render")
async def render_video(
    data: str = Form(...),
    videos: Optional[List[UploadFile]] = File(None)
):
    """
    Génère une vidéo à partir de la composition
    Accepte aussi des vidéos uploadées en plus de celles dans ./clips/
    """
    try:
        # Parser les données JSON
        request = RenderRequest(**json.loads(data))

        # Sauvegarder les vidéos uploadées temporairement
        uploaded_videos = {}
        if videos:
            print(f"📤 Réception de {len(videos)} vidéos uploadées...")
            for video_file in videos:
                # Le nom du fichier doit correspondre au nom de l'instrument
                temp_path = os.path.join(TEMP_DIR, video_file.filename)
                with open(temp_path, 'wb') as f:
                    content = await video_file.read()
                    f.write(content)

                # Extraire le nom sans extension
                name = os.path.splitext(video_file.filename)[0]
                uploaded_videos[name] = temp_path
                print(f"  ✓ Sauvegardé: {name} -> {temp_path}")
        # Calculer la durée totale
        last_clip_end = max(
            (clip.startTime + clip.duration for clip in request.clips),
            default=0
        )
        total_duration = beats_to_seconds(last_clip_end, request.bpm)

        if total_duration == 0:
            raise HTTPException(status_code=400, detail="Aucun clip à rendre")

        # Configuration de la grille
        grid_cols = request.gridSize.cols
        grid_rows = request.gridSize.rows
        cell_width = 1920 // grid_cols
        cell_height = 1080 // grid_rows

        print(f"🎬 Rendu VideoSequencer - Durée: {total_duration:.2f}s, Grille: {grid_cols}x{grid_rows}")

        # Fond noir
        base = ColorClip(size=(1920, 1080), color=(0, 0, 0), duration=total_duration)

        # Créer les frames statiques pour chaque instrument
        print("Création des images fixes...")
        static_frames = []

        for inst in request.instruments:
            # Chercher d'abord dans les uploads, puis dans ./clips/
            video_path = uploaded_videos.get(inst.name) or os.path.join(CLIPS_DIR, f"{inst.name}.mp4")

            if not os.path.exists(video_path):
                print(f"⚠️  Vidéo non trouvée: {inst.name}")
                continue

            row = inst.gridPosition // grid_cols
            col = inst.gridPosition % grid_cols
            x = col * cell_width
            y = row * cell_height

            # Extraire la première frame
            video = VideoFileClip(video_path)
            static_frame = video.to_ImageClip(0)
            static_frame = static_frame.resized((cell_width, cell_height))
            static_frame = static_frame.with_duration(total_duration)
            static_frame = static_frame.with_position((x, y))
            static_frames.append(static_frame)
            video.close()

        # Créer les clips animés
        print(f"Création de {len(request.clips)} clips animés...")
        animated_clips = []

        for clip in request.clips:
            # Trouver l'instrument correspondant
            inst = next((i for i in request.instruments if i.id == clip.instrumentId), None)
            if not inst:
                continue

            # Chercher d'abord dans les uploads, puis dans ./clips/
            video_path = uploaded_videos.get(inst.name) or os.path.join(CLIPS_DIR, f"{inst.name}.mp4")

            if not os.path.exists(video_path):
                print(f"⚠️  Vidéo non trouvée pour clip: {inst.name}")
                continue

            start_sec = beats_to_seconds(clip.startTime, request.bpm)
            duration_sec = beats_to_seconds(clip.duration, request.bpm)

            row = inst.gridPosition // grid_cols
            col = inst.gridPosition % grid_cols
            x = col * cell_width
            y = row * cell_height

            # Créer le clip
            video = VideoFileClip(video_path)
            clip_duration = min(duration_sec, video.duration)
            video = video.subclipped(0, clip_duration)
            video = video.resized((cell_width, cell_height))
            video = video.with_start(start_sec)
            video = video.with_position((x, y))
            animated_clips.append(video)

        # Composer
        print("Composition finale...")
        final = CompositeVideoClip(
            [base] + static_frames + animated_clips,
            size=(1920, 1080)
        )

        # Générer le nom de fichier de sortie
        output_filename = f"render_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
        output_path = os.path.join(OUTPUT_DIR, output_filename)

        # Rendu
        print(f"Rendu vers: {output_path}")
        final.write_videofile(
            output_path,
            fps=30,
            codec='libx264',
            audio_codec='aac',
            bitrate='5000k',
            preset='medium',
            logger=None  # Désactiver les logs verbeux
        )

        # Nettoyer
        final.close()
        for clip in animated_clips:
            clip.close()
        for frame in static_frames:
            frame.close()
        base.close()

        print(f"✅ Rendu terminé: {output_filename}")

        # Retourner le fichier
        return FileResponse(
            output_path,
            media_type="video/mp4",
            filename=output_filename
        )

    except Exception as e:
        print(f"❌ Erreur de rendu: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "healthy"}
