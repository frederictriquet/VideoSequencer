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
import subprocess
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
    offset: float = 0.0  # Offset de départ dans la vidéo (en secondes)
    maxDuration: float = 0.0  # Durée maximale utilisable (en secondes, 0 = pas de limite)

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
# Chemins - utiliser des chemins relatifs pour exécution locale
CLIPS_DIR = os.environ.get('CLIPS_DIR', "/app/clips")
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', "/app/output")
TEMP_DIR = os.environ.get('TEMP_DIR', "/tmp/VideoSequencer_uploads")

# Créer les répertoires seulement s'ils n'existent pas et qu'on a les permissions
try:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)
except OSError as e:
    print(f"⚠️ Impossible de créer les répertoires: {e}")
    # Utiliser des chemins locaux si /app n'est pas accessible
    if not os.path.exists(OUTPUT_DIR):
        OUTPUT_DIR = "./output"
        os.makedirs(OUTPUT_DIR, exist_ok=True)
    if not os.path.exists(CLIPS_DIR):
        CLIPS_DIR = "../clips"

def beats_to_seconds(beats: float, bpm: int) -> float:
    return (beats / bpm) * 60

def precise_cut_video(input_path: str, start_time: float, duration: float, output_path: str) -> bool:
    """
    Découpe une vidéo avec précision frame-parfaite en utilisant ffmpeg directement
    Retourne True si succès, False sinon
    """
    try:
        # Utiliser ffmpeg pour un découpage précis
        # -ss avant -i pour seek rapide, -t pour la durée
        # -c copy ne fonctionne pas pour découpage précis, on doit réencoder
        cmd = [
            'ffmpeg', '-y',
            '-ss', str(start_time),  # Seek au timestamp exact
            '-i', input_path,
            '-t', str(duration),  # Durée exacte
            '-c:v', 'libx264',  # Réencodage nécessaire pour précision frame
            '-preset', 'ultrafast',  # Rapide pour le rendu
            '-crf', '18',  # Qualité élevée
            '-c:a', 'aac',
            '-b:a', '192k',
            output_path
        ]

        # Afficher la commande complète pour debug
        cmd_str = ' '.join(cmd)
        print(f"     🔧 Commande ffmpeg: {cmd_str}")

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"     ❌ Erreur ffmpeg stderr: {result.stderr}")

        return result.returncode == 0
    except Exception as e:
        print(f"❌ Erreur ffmpeg: {e}")
        return False

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
            video_path = uploaded_videos.get(inst.name)

            if not video_path:
                # Chercher avec différentes extensions
                for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
                    potential_path = os.path.join(CLIPS_DIR, f"{inst.name}{ext}")
                    if os.path.exists(potential_path):
                        video_path = potential_path
                        break

            if not video_path or not os.path.exists(video_path):
                print(f"⚠️  Vidéo non trouvée: {inst.name}")
                continue

            row = inst.gridPosition // grid_cols
            col = inst.gridPosition % grid_cols
            x = col * cell_width
            y = row * cell_height

            # Utiliser l'offset de l'instrument
            offset = inst.offset

            # Extraire la frame à l'offset spécifié
            video = VideoFileClip(video_path)
            static_frame = video.to_ImageClip(offset)
            static_frame = static_frame.resized((cell_width, cell_height))
            # Assombrir l'image statique (30% de luminosité)
            static_frame = static_frame.image_transform(lambda image: (image * 0.3).astype('uint8'))
            static_frame = static_frame.with_duration(total_duration)
            static_frame = static_frame.with_position((x, y))
            static_frames.append(static_frame)
            video.close()

        # Créer les clips animés
        print(f"Création de {len(request.clips)} clips animés...")
        animated_clips = []

        # Cache pour éviter de découper et charger plusieurs fois le même clip
        # Clé: (instrument_name, offset, duration) -> chemin du fichier découpé
        cut_clips_cache = {}
        # Cache des clips MoviePy chargés (pour éviter de charger 332 fois le même fichier)
        # Clé: chemin du fichier -> VideoFileClip (non redimensionné, non positionné)
        loaded_clips_cache = {}

        for clip in request.clips:
            # Trouver l'instrument correspondant
            inst = next((i for i in request.instruments if i.id == clip.instrumentId), None)
            if not inst:
                continue

            # Chercher d'abord dans les uploads, puis dans ./clips/
            video_path = uploaded_videos.get(inst.name)

            if not video_path:
                # Chercher avec différentes extensions
                print(f"     🔍 Recherche vidéo pour: '{inst.name}'")
                for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
                    potential_path = os.path.join(CLIPS_DIR, f"{inst.name}{ext}")
                    print(f"        Essai: {potential_path}")
                    if os.path.exists(potential_path):
                        video_path = potential_path
                        print(f"        ✅ Trouvé!")
                        break
                    else:
                        print(f"        ❌ N'existe pas")

            if not video_path or not os.path.exists(video_path):
                print(f"⚠️  Vidéo non trouvée pour instrument: {inst.name}")
                print(f"     Fichiers disponibles dans {CLIPS_DIR}:")
                try:
                    files = os.listdir(CLIPS_DIR)
                    for f in sorted(files):
                        print(f"       - {f}")
                except Exception as e:
                    print(f"     Erreur listage: {e}")
                continue

            start_sec = beats_to_seconds(clip.startTime, request.bpm)
            offset = inst.offset
            max_duration = inst.maxDuration

            row = inst.gridPosition // grid_cols
            col = inst.gridPosition % grid_cols
            x = col * cell_width
            y = row * cell_height

            # Créer le clip avec offset et maxDuration (indépendant de la durée en beats)
            video = VideoFileClip(video_path)
            available_duration = video.duration - offset

            # Utiliser la portion définie par offset et maxDuration
            if max_duration > 0:
                # Limiter par maxDuration
                clip_duration = min(max_duration, available_duration)
            else:
                # Utiliser toute la vidéo disponible après l'offset
                clip_duration = available_duration

            # Debug logging pour diagnostic
            print(f"  📊 Clip {clip.id} (instrument: {inst.name}):")
            print(f"     - startTime (beats): {clip.startTime}")
            print(f"     - start_sec (calculé): {start_sec:.3f}s")
            print(f"     - offset: {offset:.3f}s")
            print(f"     - max_duration: {max_duration:.3f}s")
            print(f"     - video.duration: {video.duration:.3f}s")
            print(f"     - available_duration: {available_duration:.3f}s")
            print(f"     - clip_duration (final): {clip_duration:.3f}s")
            print(f"     - position grid: ({row}, {col}) → coords: ({x}, {y})")

            # Vérifier si on a déjà découpé ce même clip (même instrument + offset + durée)
            cache_key = (inst.name, offset, clip_duration)
            temp_cut_path = cut_clips_cache.get(cache_key)

            if temp_cut_path:
                print(f"     - ♻️ Réutilisation du clip en cache")
            else:
                # Découper la vidéo avec ffmpeg pour précision frame-parfaite
                print(f"     - Découpage précis avec ffmpeg: de {offset:.3f}s, durée {clip_duration:.3f}s")

                # Créer un fichier temporaire pour le clip découpé
                # Utiliser un nom basé sur le cache_key pour éviter les collisions
                temp_cut_path = os.path.join(TEMP_DIR, f"cut_{inst.name}_{offset}_{clip_duration}.mp4")

                # Découper avec ffmpeg (précision frame-parfaite)
                success = precise_cut_video(video_path, offset, clip_duration, temp_cut_path)

                if not success:
                    print(f"⚠️  Échec découpage ffmpeg pour clip {clip.id}")
                    continue

                # Mettre en cache
                cut_clips_cache[cache_key] = temp_cut_path
                print(f"     - ✅ Clip découpé et mis en cache")

            # Charger le clip pré-découpé dans MoviePy (avec cache)
            if temp_cut_path in loaded_clips_cache:
                base_clip = loaded_clips_cache[temp_cut_path]
                print(f"     - ♻️ Clip MoviePy en cache")
            else:
                base_clip = VideoFileClip(temp_cut_path)
                loaded_clips_cache[temp_cut_path] = base_clip
                print(f"     - Clip chargé dans MoviePy, durée: {base_clip.duration:.3f}s")

            # Créer une instance positionnée et redimensionnée pour ce clip spécifique
            # Utiliser copy() pour créer une instance indépendante
            video_cut = base_clip.copy()
            video_cut = video_cut.resized((cell_width, cell_height))
            video_cut = video_cut.with_start(start_sec)
            video_cut = video_cut.with_position((x, y))

            print(f"     - Clip ajouté à la position {start_sec:.3f}s dans la composition")
            animated_clips.append(video_cut)

        # Statistiques du cache
        print(f"\n📊 Statistiques du cache:")
        print(f"   - Clips traités: {len(request.clips)}")
        print(f"   - Clips uniques découpés: {len(cut_clips_cache)}")
        print(f"   - Réutilisations: {len(request.clips) - len(cut_clips_cache)}")
        print(f"   - Gain: {((len(request.clips) - len(cut_clips_cache)) / len(request.clips) * 100):.1f}%\n")

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
        # Utiliser des paramètres ffmpeg pour forcer la précision du découpage
        # -avoid_negative_ts make_zero: évite les timestamps négatifs
        # -copyts: préserve les timestamps originaux
        final.write_videofile(
            output_path,
            fps=30,
            codec='libx264',
            audio_codec='aac',
            bitrate='5000k',
            preset='medium',
            ffmpeg_params=['-avoid_negative_ts', 'make_zero'],
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
