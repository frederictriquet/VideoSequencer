#!/usr/bin/env python3
"""
API de rendu vidéo pour VideoSequencer
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from moviepy import VideoFileClip, ColorClip, CompositeVideoClip
import os
import tempfile
import json
import subprocess
import asyncio
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import multiprocessing

app = FastAPI(title="VideoSequencer Render Service")

# Executor pour les tâches de rendu en arrière-plan
render_executor = ThreadPoolExecutor(max_workers=2)

# Stockage des jobs de rendu en cours
@dataclass
class RenderJob:
    id: str
    status: str = "pending"  # pending, processing, completed, error
    progress: int = 0  # 0-100
    step: str = ""
    output_path: str = ""
    error: str = ""
    total_clips: int = 0
    processed_clips: int = 0
    # Données nécessaires pour le rendu (stockées après upload)
    request_data: Optional[Dict] = None
    uploaded_videos: Optional[Dict[str, str]] = None

render_jobs: Dict[str, RenderJob] = {}

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

def do_render_job(job_id: str, request_dict: dict, uploaded_videos: dict):
    """
    Effectue le rendu vidéo dans un thread séparé.
    Met à jour le job avec la progression.
    """
    job = render_jobs.get(job_id)
    if not job:
        return

    try:
        # Reconstruire la requête depuis le dict
        request = RenderRequest(**request_dict)

        # Le reste du rendu commence ici
        job.step = "Calcul de la durée..."
        job.progress = 10

        # Calculer la durée totale
        last_clip_end = max(
            (clip.startTime + clip.duration for clip in request.clips),
            default=0
        )
        total_duration = beats_to_seconds(last_clip_end, request.bpm)

        if total_duration == 0:
            job.status = "error"
            job.error = "Aucun clip à rendre"
            job.step = "Erreur!"
            return

        # Configuration de la grille
        grid_cols = request.gridSize.cols
        grid_rows = request.gridSize.rows
        cell_width = 1920 // grid_cols
        cell_height = 1080 // grid_rows

        print(f"🎬 Rendu VideoSequencer - Durée: {total_duration:.2f}s, Grille: {grid_cols}x{grid_rows}")
        job.step = "Création du fond..."
        job.progress = 15

        # Fond noir
        base = ColorClip(size=(1920, 1080), color=(0, 0, 0), duration=total_duration)

        # Créer les frames statiques pour chaque instrument
        job.step = "Création des images fixes..."
        job.progress = 20
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
        job.step = f"Préparation de {len(request.clips)} clips..."
        job.progress = 25
        print(f"Création de {len(request.clips)} clips animés...")
        animated_clips = []

        # Cache pour éviter de découper et charger plusieurs fois le même clip
        cut_clips_cache = {}
        loaded_clips_cache = {}

        # ====== PHASE 1: Collecter les infos de tous les clips ======
        clips_info = []  # Liste de (clip, inst, video_path, offset, clip_duration, cache_key, position)

        for clip in request.clips:
            inst = next((i for i in request.instruments if i.id == clip.instrumentId), None)
            if not inst:
                continue

            video_path = uploaded_videos.get(inst.name)
            if not video_path:
                for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
                    potential_path = os.path.join(CLIPS_DIR, f"{inst.name}{ext}")
                    if os.path.exists(potential_path):
                        video_path = potential_path
                        break

            if not video_path or not os.path.exists(video_path):
                continue

            # Calculer les paramètres du clip
            video = VideoFileClip(video_path)
            offset = inst.offset
            max_duration = inst.maxDuration
            available_duration = video.duration - offset
            video.close()

            if max_duration > 0:
                clip_duration = min(max_duration, available_duration)
            else:
                clip_duration = available_duration

            start_sec = beats_to_seconds(clip.startTime, request.bpm)
            row = inst.gridPosition // grid_cols
            col = inst.gridPosition % grid_cols
            x = col * cell_width
            y = row * cell_height

            cache_key = (inst.name, offset, clip_duration)
            temp_cut_path = os.path.join(TEMP_DIR, f"cut_{inst.name}_{offset}_{clip_duration}.mp4")

            clips_info.append({
                'clip': clip,
                'inst': inst,
                'video_path': video_path,
                'offset': offset,
                'clip_duration': clip_duration,
                'cache_key': cache_key,
                'temp_cut_path': temp_cut_path,
                'start_sec': start_sec,
                'position': (x, y)
            })

        # ====== PHASE 2: Découper en parallèle avec FFmpeg ======
        # Identifier les découpes uniques nécessaires
        unique_cuts = {}  # cache_key -> temp_cut_path
        for info in clips_info:
            if info['cache_key'] not in unique_cuts:
                unique_cuts[info['cache_key']] = info

        num_cuts = len(unique_cuts)
        job.step = f"Découpage de {num_cuts} clips uniques (parallèle)..."
        print(f"🔪 Découpage parallèle de {num_cuts} clips uniques sur {min(num_cuts, multiprocessing.cpu_count())} threads...")

        # Lancer les découpes en parallèle
        num_workers = min(num_cuts, multiprocessing.cpu_count(), 8)  # Max 8 threads FFmpeg simultanés
        cuts_completed = 0
        cuts_failed = set()

        if num_cuts > 0:
            with ThreadPoolExecutor(max_workers=num_workers) as cut_executor:
                # Soumettre toutes les tâches de découpe
                future_to_key = {}
                for cache_key, info in unique_cuts.items():
                    # Vérifier si le fichier existe déjà (cache disque)
                    if os.path.exists(info['temp_cut_path']):
                        cut_clips_cache[cache_key] = info['temp_cut_path']
                        cuts_completed += 1
                        print(f"  ♻️ Cache disque: {info['inst'].name}")
                    else:
                        future = cut_executor.submit(
                            precise_cut_video,
                            info['video_path'],
                            info['offset'],
                            info['clip_duration'],
                            info['temp_cut_path']
                        )
                        future_to_key[future] = (cache_key, info)

                # Récupérer les résultats au fur et à mesure
                for future in as_completed(future_to_key):
                    cache_key, info = future_to_key[future]
                    try:
                        success = future.result()
                        if success:
                            cut_clips_cache[cache_key] = info['temp_cut_path']
                            print(f"  ✅ Découpé: {info['inst'].name}")
                        else:
                            cuts_failed.add(cache_key)
                            print(f"  ❌ Échec: {info['inst'].name}")
                    except Exception as e:
                        cuts_failed.add(cache_key)
                        print(f"  ❌ Erreur {info['inst'].name}: {e}")

                    cuts_completed += 1
                    # Progression: 25% à 50% pour les découpes
                    cut_progress = int(25 + (25 * cuts_completed / num_cuts))
                    job.progress = min(cut_progress, 50)
                    job.step = f"Découpage {cuts_completed}/{num_cuts}..."

        print(f"✅ Découpes terminées: {len(cut_clips_cache)} réussies, {len(cuts_failed)} échouées")

        # ====== PHASE 3: Charger et positionner les clips MoviePy ======
        job.step = "Chargement des clips..."
        job.progress = 55

        for idx, info in enumerate(clips_info):
            cache_key = info['cache_key']

            # Ignorer si la découpe a échoué
            if cache_key in cuts_failed:
                continue

            temp_cut_path = cut_clips_cache.get(cache_key)
            if not temp_cut_path:
                continue

            # Charger ou réutiliser le clip MoviePy
            if temp_cut_path in loaded_clips_cache:
                base_clip = loaded_clips_cache[temp_cut_path]
            else:
                base_clip = VideoFileClip(temp_cut_path)
                loaded_clips_cache[temp_cut_path] = base_clip

            # Créer l'instance positionnée
            video_cut = base_clip.copy()
            video_cut = video_cut.resized((cell_width, cell_height))
            video_cut = video_cut.with_start(info['start_sec'])
            video_cut = video_cut.with_position(info['position'])
            animated_clips.append(video_cut)

            # Mise à jour progression (55% à 70% pour le chargement MoviePy)
            job.processed_clips = len(animated_clips)
            load_progress = int(55 + (15 * (idx + 1) / len(clips_info)))
            job.progress = min(load_progress, 70)
            job.step = f"Chargement clip {idx + 1}/{len(clips_info)}..."

        # Composer
        job.step = "Composition finale..."
        job.progress = 75
        print("Composition finale...")
        final = CompositeVideoClip(
            [base] + static_frames + animated_clips,
            size=(1920, 1080)
        )

        # Générer le nom de fichier de sortie
        output_filename = f"render_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
        output_path = os.path.join(OUTPUT_DIR, output_filename)

        # Rendu
        job.step = "Encodage vidéo (ffmpeg)..."
        job.progress = 80
        print(f"Rendu vers: {output_path}")
        final.write_videofile(
            output_path,
            fps=30,
            codec='libx264',
            audio_codec='aac',
            bitrate='5000k',
            preset='medium',
            ffmpeg_params=['-avoid_negative_ts', 'make_zero'],
            logger=None
        )
        job.progress = 95

        # Nettoyer
        final.close()
        for clip in animated_clips:
            clip.close()
        for frame in static_frames:
            frame.close()
        base.close()

        print(f"✅ Rendu terminé: {output_filename}")

        # Marquer le job comme terminé
        job.status = "completed"
        job.progress = 100
        job.step = "Terminé!"
        job.output_path = output_path

    except Exception as e:
        print(f"❌ Erreur de rendu: {str(e)}")
        job.status = "error"
        job.error = str(e)
        job.step = "Erreur!"


@app.post("/render")
async def render_video(
    data: str = Form(...),
    videos: Optional[List[UploadFile]] = File(None)
):
    """
    Génère une vidéo à partir de la composition.
    Lance le rendu en arrière-plan et retourne immédiatement un job_id.
    """
    try:
        # Parser les données JSON
        request_dict = json.loads(data)
        request = RenderRequest(**request_dict)

        # Créer un job de rendu
        job_id = str(uuid.uuid4())[:8]
        job = RenderJob(
            id=job_id,
            status="processing",
            step="Réception des fichiers...",
            total_clips=len(request.clips)
        )
        render_jobs[job_id] = job
        print(f"🆔 Job créé: {job_id}")

        # Sauvegarder les vidéos uploadées temporairement (synchrone car await)
        uploaded_videos = {}
        if videos:
            print(f"📤 Réception de {len(videos)} vidéos uploadées...")
            for video_file in videos:
                temp_path = os.path.join(TEMP_DIR, video_file.filename)
                with open(temp_path, 'wb') as f:
                    content = await video_file.read()
                    f.write(content)
                name = os.path.splitext(video_file.filename)[0]
                uploaded_videos[name] = temp_path
                print(f"  ✓ Sauvegardé: {name} -> {temp_path}")

        job.progress = 5
        job.step = "Démarrage du rendu..."

        # Lancer le rendu dans un thread séparé
        render_executor.submit(do_render_job, job_id, request_dict, uploaded_videos)

        # Retourner immédiatement le job_id
        return {
            "job_id": job_id,
            "status": "processing",
            "message": "Rendu démarré en arrière-plan"
        }

    except Exception as e:
        print(f"❌ Erreur lors de la création du job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/render/status/{job_id}")
def get_render_status(job_id: str):
    """Retourne le statut d'un job de rendu"""
    job = render_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "status": job.status,
        "progress": job.progress,
        "step": job.step,
        "total_clips": job.total_clips,
        "processed_clips": job.processed_clips,
        "error": job.error
    }

@app.get("/render/download/{job_id}")
def download_render(job_id: str):
    """Télécharge le fichier rendu"""
    job = render_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed: {job.status}")
    if not os.path.exists(job.output_path):
        raise HTTPException(status_code=404, detail="Output file not found")

    filename = os.path.basename(job.output_path)
    return FileResponse(
        job.output_path,
        media_type="video/mp4",
        filename=filename
    )

async def sse_generator(job_id: str):
    """Générateur SSE pour la progression du rendu"""
    while True:
        job = render_jobs.get(job_id)
        if not job:
            yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
            break

        data = {
            "status": job.status,
            "progress": job.progress,
            "step": job.step,
            "total_clips": job.total_clips,
            "processed_clips": job.processed_clips
        }

        if job.status == "completed":
            data["download_url"] = f"/render/download/{job_id}"
            yield f"data: {json.dumps(data)}\n\n"
            break
        elif job.status == "error":
            data["error"] = job.error
            yield f"data: {json.dumps(data)}\n\n"
            break
        else:
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(0.5)  # Poll toutes les 500ms

@app.get("/render/stream/{job_id}")
async def stream_render_progress(job_id: str):
    """Stream SSE de la progression du rendu"""
    job = render_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return StreamingResponse(
        sse_generator(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
