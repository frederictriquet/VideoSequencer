import { writable } from 'svelte/store';
import type {
	SequencerState,
	PlaybackState,
	VideoClip,
	VideoInstrument
} from '$lib/types/sequencer';

// État principal du séquenceur
const initialState: SequencerState = {
	instruments: [],
	clips: [],
	isPlaying: false,
	currentTime: 0,
	bpm: 120,
	totalBeats: 128, // 32 mesures de 4 temps = ~1 minute à 120 BPM
	gridSize: { rows: 3, cols: 3 },
	loopMode: false
};

export const sequencerState = writable<SequencerState>(initialState);

// État de lecture en temps réel
export const playbackState = writable<PlaybackState>({
	currentBeat: 0,
	activeClips: new Set()
});

// Utilitaires pour calculer le temps
export const timeUtils = {
	beatsToSeconds: (beats: number, bpm: number): number => {
		return (beats / bpm) * 60;
	},
	secondsToBeats: (seconds: number, bpm: number): number => {
		return (seconds / 60) * bpm;
	}
};

// Actions du séquenceur
export const sequencerActions = {
	addInstrument: (name: string, videoFile: File | null = null, videoUrl: string | null = null) => {
		sequencerState.update((state) => {
			const url = videoFile ? URL.createObjectURL(videoFile) : videoUrl;
			const id = `instrument-${Date.now()}-${Math.random()}`;
			const availablePositions = Array.from(
				{ length: state.gridSize.rows * state.gridSize.cols },
				(_, i) => i
			);
			const usedPositions = state.instruments.map((inst) => inst.gridPosition);
			const freePositions = availablePositions.filter((pos) => !usedPositions.includes(pos));

			// Vérifier qu'il reste de la place
			if (freePositions.length === 0) {
				console.warn("Grille pleine : impossible d'ajouter plus d'instruments");
				return state;
			}

			const gridPosition = freePositions[0];
			// trackPosition = position actuelle dans la timeline (ordre d'ajout)
			const trackPosition = state.instruments.length;

			const colors = [
				'#FF6B6B',
				'#4ECDC4',
				'#45B7D1',
				'#FFA07A',
				'#98D8C8',
				'#F7DC6F',
				'#BB8FCE',
				'#85C1E2',
				'#F8B739'
			];
			const color = colors[state.instruments.length % colors.length];

			return {
				...state,
				instruments: [
					...state.instruments,
					{
						id,
						name,
						videoFile,
						videoUrl: url,
						color,
						gridPosition,
						trackPosition,
						offset: 0,
						maxDuration: 0
					}
				]
			};
		});
	},

	removeInstrument: (id: string) => {
		sequencerState.update((state) => {
			// Révoquer l'URL de l'objet
			const instrument = state.instruments.find((inst) => inst.id === id);
			if (instrument?.videoUrl) {
				URL.revokeObjectURL(instrument.videoUrl);
			}

			// Supprimer tous les clips qui référencent cette gridPosition
			const gridPosToRemove = instrument?.gridPosition;

			return {
				...state,
				instruments: state.instruments.filter((inst) => inst.id !== id),
				clips: state.clips.filter((clip) => clip.gridPosition !== gridPosToRemove)
			};
		});
	},

	addClip: (instrumentId: string, startTime: number, duration: number, trackIndex: number) => {
		sequencerState.update((state) => {
			const id = `clip-${Date.now()}-${Math.random()}`;
			// Trouver la gridPosition de l'instrument
			const instrument = state.instruments.find((inst) => inst.id === instrumentId);
			if (!instrument) {
				console.warn(`Instrument ${instrumentId} not found`);
				return state;
			}

			return {
				...state,
				clips: [
					...state.clips,
					{
						id,
						gridPosition: instrument.gridPosition, // Stocker la gridPosition au lieu de l'instrumentId
						startTime,
						duration,
						trackIndex
					}
				]
			};
		});
	},

	removeClip: (id: string) => {
		sequencerState.update((state) => ({
			...state,
			clips: state.clips.filter((clip) => clip.id !== id)
		}));
	},

	updateClip: (id: string, updates: Partial<VideoClip>) => {
		sequencerState.update((state) => ({
			...state,
			clips: state.clips.map((clip) => (clip.id === id ? { ...clip, ...updates } : clip))
		}));
	},

	updateInstrument: (id: string, updates: Partial<VideoInstrument>) => {
		sequencerState.update((state) => ({
			...state,
			instruments: state.instruments.map((inst) =>
				inst.id === id ? { ...inst, ...updates } : inst
			)
		}));
	},

	setBpm: (bpm: number) => {
		sequencerState.update((state) => ({
			...state,
			bpm: Math.max(40, Math.min(300, bpm))
		}));
	},

	play: () => {
		sequencerState.update((state) => ({
			...state,
			isPlaying: true
		}));
	},

	pause: () => {
		sequencerState.update((state) => ({
			...state,
			isPlaying: false
		}));
	},

	stop: () => {
		sequencerState.update((state) => ({
			...state,
			isPlaying: false,
			currentTime: 0
		}));
		playbackState.update((state) => ({
			...state,
			currentBeat: 0,
			activeClips: new Set()
		}));
	},

	setCurrentTime: (time: number) => {
		sequencerState.update((state) => ({
			...state,
			currentTime: Math.max(0, Math.min(state.totalBeats, time))
		}));
	},

	toggleLoopMode: () => {
		sequencerState.update((state) => ({
			...state,
			loopMode: !state.loopMode
		}));
	},

	moveInstrumentToPosition: (instrumentId: string, newGridPosition: number) => {
		sequencerState.update((state) => {
			// Vérifier que la position est valide
			const maxPosition = state.gridSize.rows * state.gridSize.cols - 1;
			if (newGridPosition < 0 || newGridPosition > maxPosition) {
				return state;
			}

			// Trouver l'instrument à déplacer et celui qui occupe la position de destination
			const movingInstrument = state.instruments.find((inst) => inst.id === instrumentId);
			const occupyingInstrument = state.instruments.find(
				(inst) => inst.gridPosition === newGridPosition
			);

			if (!movingInstrument) return state;

			// Échanger à la fois gridPosition ET trackPosition
			// Cela fait que la vidéo ET la track échangent de place ensemble
			let updatedInstruments;
			let updatedClips = state.clips;

			if (occupyingInstrument) {
				// Swap des gridPosition ET des trackPosition
				const oldGridPosition = movingInstrument.gridPosition;
				const oldTrackPosition = movingInstrument.trackPosition;
				const occupyingTrackPosition = occupyingInstrument.trackPosition;

				updatedInstruments = state.instruments.map((inst) => {
					if (inst.id === instrumentId) {
						return {
							...inst,
							gridPosition: newGridPosition,
							trackPosition: occupyingTrackPosition
						};
					}
					if (inst.id === occupyingInstrument.id) {
						return {
							...inst,
							gridPosition: oldGridPosition,
							trackPosition: oldTrackPosition
						};
					}
					return inst;
				});

				// Échanger les gridPosition des clips pour qu'ils suivent le swap des instruments
				// Cela garantit que la timeline ET le replay restent cohérents
				const oldGridPos = movingInstrument.gridPosition;
				const newGridPos = occupyingInstrument.gridPosition;

				updatedClips = state.clips.map((clip) => {
					if (clip.gridPosition === oldGridPos) {
						// Ce clip était sur l'ancienne position de l'instrument déplacé
						return { ...clip, gridPosition: newGridPos };
					} else if (clip.gridPosition === newGridPos) {
						// Ce clip était sur la position de destination
						return { ...clip, gridPosition: oldGridPos };
					}
					return clip;
				});

				// Recalculer les trackIndex de tous les clips selon le nouvel ordre
				const sortedInstruments = [...updatedInstruments].sort(
					(a, b) => a.trackPosition - b.trackPosition
				);

				// Créer un map: gridPosition -> trackIndex
				const gridPosToTrackIndex = new Map<number, number>();
				sortedInstruments.forEach((inst, index) => {
					gridPosToTrackIndex.set(inst.gridPosition, index);
				});

				updatedClips = updatedClips.map((clip) => ({
					...clip,
					trackIndex: gridPosToTrackIndex.get(clip.gridPosition) ?? clip.trackIndex
				}));
			} else {
				// Position libre, simplement déplacer gridPosition (trackPosition ne change pas)
				updatedInstruments = state.instruments.map((inst) =>
					inst.id === instrumentId ? { ...inst, gridPosition: newGridPosition } : inst
				);
			}

			return {
				...state,
				instruments: updatedInstruments,
				clips: updatedClips
			};
		});
	},

	setGridSize: (rows: number, cols: number) => {
		sequencerState.update((state) => {
			// Vérifier si on peut réduire la grille
			const newTotalCells = rows * cols;
			const currentMaxPosition = Math.max(
				...state.instruments.map((inst) => inst.gridPosition),
				-1
			);

			// Si on réduit, vérifier que tous les instruments tiennent dans la nouvelle grille
			if (currentMaxPosition >= newTotalCells) {
				console.warn(
					'Impossible de réduire: des instruments occupent des positions qui seraient supprimées'
				);
				return state;
			}

			return {
				...state,
				gridSize: { rows, cols }
			};
		});
	},

	exportToJSON: (state: SequencerState) => {
		// Créer une version sérialisable (sans File et videoUrl)
		const exportData = {
			version: '1.0',
			bpm: state.bpm,
			totalBeats: state.totalBeats,
			gridSize: state.gridSize,
			instruments: state.instruments.map((inst) => ({
				id: inst.id,
				name: inst.name,
				color: inst.color,
				gridPosition: inst.gridPosition,
				trackPosition: inst.trackPosition,
				offset: inst.offset || 0,
				maxDuration: inst.maxDuration || 0
			})),
			clips: state.clips.map((clip) => ({
				id: clip.id,
				gridPosition: clip.gridPosition,
				startTime: clip.startTime,
				duration: clip.duration,
				trackIndex: clip.trackIndex
			}))
		};

		const json = JSON.stringify(exportData, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `VideoSequencer-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	},

	importFromJSON: async (jsonData: any) => {
		try {
			console.log('🔄 Début importFromJSON');

			// Valider la version
			if (!jsonData.version) {
				console.error('❌ Pas de champ "version" dans le JSON');
				throw new Error('Champ "version" manquant');
			}
			if (jsonData.version !== '1.0') {
				console.error('❌ Version non supportée:', jsonData.version);
				throw new Error(`Version de fichier non supportée: ${jsonData.version}`);
			}
			console.log('✅ Version validée:', jsonData.version);

			// Charger d'abord les vidéos depuis ./clips pour avoir les URLs
			console.log('📂 Chargement des clips disponibles...');
			const response = await fetch('/api/clips');
			if (!response.ok) {
				console.error('❌ Erreur fetch /api/clips:', response.status);
				throw new Error(`Erreur chargement clips: ${response.status}`);
			}
			const clipsData = await response.json();
			console.log('✅ Clips disponibles:', clipsData.files?.length || 0);

			const availableVideos = new Map<string, string>();
			clipsData.files?.forEach((filename: string) => {
				const name = filename.replace(/\.[^/.]+$/, '');
				availableVideos.set(name, `/api/clips/${filename}`);
				console.log(`   - ${name} → ${filename}`);
			});

			sequencerState.update((state) => {
				console.log('🔧 Mise à jour du state...');

				// Nettoyer les anciennes URLs
				state.instruments.forEach((inst) => {
					if (inst.videoUrl) {
						URL.revokeObjectURL(inst.videoUrl);
					}
				});
				console.log('✅ Anciennes URLs nettoyées');

				// Reconstruire les instruments avec les vidéos disponibles
				console.log('🎸 Reconstruction des instruments...');
				const instruments = jsonData.instruments.map((inst: any, index: number) => {
					const videoUrl = availableVideos.get(inst.name) || null;
					console.log(
						`   ${index + 1}. ${inst.name} (position ${inst.gridPosition}) → ${videoUrl ? 'vidéo trouvée' : '⚠️ vidéo manquante'}`
					);
					return {
						id: inst.id,
						name: inst.name,
						color: inst.color,
						gridPosition: inst.gridPosition,
						trackPosition: inst.trackPosition ?? index, // Utiliser trackPosition du JSON ou index comme fallback
						videoFile: null,
						videoUrl,
						offset: inst.offset || 0,
						maxDuration: inst.maxDuration || 0
					};
				});
				console.log('✅ Instruments reconstruits:', instruments.length);

				// Restaurer l'état complet
				console.log('🎬 Restauration des clips:', jsonData.clips?.length || 0);
				jsonData.clips?.forEach((clip: any, index: number) => {
					console.log(
						`   ${index + 1}. Clip sur gridPosition ${clip.gridPosition}, beat ${clip.startTime}, durée ${clip.duration}`
					);
				});

				console.log('⚙️ Restauration des paramètres:');
				console.log(`   - BPM: ${jsonData.bpm}`);
				console.log(`   - Total beats: ${jsonData.totalBeats}`);
				console.log(`   - Grid: ${jsonData.gridSize.rows}x${jsonData.gridSize.cols}`);
				console.log(`   - Loop mode: ${jsonData.loopMode || false}`);

				return {
					instruments,
					clips: jsonData.clips,
					isPlaying: false,
					currentTime: 0,
					bpm: jsonData.bpm,
					totalBeats: jsonData.totalBeats,
					gridSize: jsonData.gridSize,
					loopMode: jsonData.loopMode || false
				};
			});

			console.log('✅ Import terminé avec succès');
			return true;
		} catch (err) {
			console.error("❌ Erreur lors de l'import:");
			console.error('   Type:', err instanceof Error ? err.name : typeof err);
			console.error('   Message:', err instanceof Error ? err.message : String(err));
			console.error('   Stack:', err instanceof Error ? err.stack : 'N/A');
			return false;
		}
	},

	exportToCSV: (state: SequencerState) => {
		// Trier les instruments par gridPosition pour correspondre à l'ordre de la grille
		const sortedInstruments = [...state.instruments].sort(
			(a, b) => a.gridPosition - b.gridPosition
		);

		// Trouver le dernier beat utilisé
		const lastBeat = state.clips.reduce((max, clip) => {
			return Math.max(max, clip.startTime);
		}, 0);

		// Générer les colonnes par demi-beats jusqu'au dernier beat + marge
		const totalBeats = Math.ceil(lastBeat) + 4;
		const columns: number[] = [];
		for (let beat = 0; beat < totalBeats; beat += 0.5) {
			columns.push(beat);
		}

		// Construire l'en-tête
		let csv = 'Instrument,' + columns.join(',') + '\n';

		// Construire chaque ligne d'instrument
		sortedInstruments.forEach((instrument) => {
			const row: string[] = [instrument.name];

			// Pour chaque colonne, vérifier s'il y a un clip qui commence à ce beat
			columns.forEach((beat) => {
				const hasClip = state.clips.some(
					(clip) => clip.gridPosition === instrument.gridPosition && clip.startTime === beat
				);
				row.push(hasClip ? 'X' : '');
			});

			csv += row.join(',') + '\n';
		});

		// Télécharger le fichier
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `VideoSequencer-${Date.now()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	},

	importFromCSV: async (csvContent: string) => {
		try {
			console.log('🔄 Début importFromCSV');

			// Parser le CSV
			const lines = csvContent.trim().split('\n');
			if (lines.length < 2) {
				throw new Error('Fichier CSV vide ou invalide');
			}

			// Parser l'en-tête pour obtenir les beats
			const header = lines[0].split(',');
			if (header[0] !== 'Instrument') {
				throw new Error('Format CSV invalide: première colonne doit être "Instrument"');
			}
			const beats = header.slice(1).map((b) => parseFloat(b));
			console.log('✅ Beats trouvés:', beats.length);

			// Parser chaque ligne d'instrument
			const instrumentLines = lines.slice(1);
			console.log('✅ Instruments trouvés:', instrumentLines.length);

			// Déterminer la taille de la grille (n×n)
			const n = Math.ceil(Math.sqrt(instrumentLines.length));
			console.log(`✅ Taille de grille calculée: ${n}×${n}`);

			// Charger les vidéos disponibles
			console.log('📂 Chargement des clips disponibles...');
			const response = await fetch('/api/clips');
			if (!response.ok) {
				throw new Error(`Erreur chargement clips: ${response.status}`);
			}
			const clipsData = await response.json();
			const availableVideos = new Map<string, string>();
			clipsData.files?.forEach((filename: string) => {
				const name = filename.replace(/\.[^/.]+$/, '');
				availableVideos.set(name, `/api/clips/${filename}`);
			});
			console.log('✅ Clips disponibles:', availableVideos.size);

			// Générer une palette de couleurs
			const colors = [
				'#667eea',
				'#f093fb',
				'#4facfe',
				'#43e97b',
				'#fa709a',
				'#fee140',
				'#30cfd0',
				'#a8edea',
				'#ff6b6b',
				'#4ecdc4',
				'#45b7d1',
				'#f7b731',
				'#5f27cd',
				'#00d2d3',
				'#ff9ff3',
				'#feca57'
			];

			// Construire les instruments et clips
			const instruments: VideoInstrument[] = [];
			const clips: VideoClip[] = [];

			instrumentLines.forEach((line, instrumentIndex) => {
				const cells = line.split(',');
				const instrumentName = cells[0].trim();
				const clipMarkers = cells.slice(1);

				// Créer l'instrument
				const instrumentId = `instrument-${Date.now()}-${Math.random()}`;
				const videoUrl = availableVideos.get(instrumentName) || null;
				const color = colors[instrumentIndex % colors.length];

				instruments.push({
					id: instrumentId,
					name: instrumentName,
					color,
					gridPosition: instrumentIndex,
					trackPosition: instrumentIndex, // Dans CSV, trackPosition = gridPosition initialement
					videoFile: null,
					videoUrl,
					offset: 0,
					maxDuration: 0
				});

				console.log(
					`   ${instrumentIndex + 1}. ${instrumentName} (position ${instrumentIndex}) → ${videoUrl ? 'vidéo trouvée' : '⚠️ vidéo manquante'}`
				);

				// Créer les clips pour cet instrument
				clipMarkers.forEach((marker, beatIndex) => {
					if (marker.trim().toUpperCase() === 'X') {
						const clipId = `clip-${Date.now()}-${Math.random()}`;
						clips.push({
							id: clipId,
							gridPosition: instrumentIndex, // Utiliser gridPosition au lieu d'instrumentId
							startTime: beats[beatIndex],
							duration: 0.5, // Durée par défaut (non utilisée pour le rendu)
							trackIndex: instrumentIndex
						});
					}
				});
			});

			console.log('✅ Instruments créés:', instruments.length);
			console.log('✅ Clips créés:', clips.length);

			// Calculer le totalBeats
			const lastBeat = clips.reduce((max, clip) => Math.max(max, clip.startTime), 0);
			const totalBeats = Math.ceil(lastBeat) + 4;

			// Mettre à jour l'état
			sequencerState.update((state) => {
				// Nettoyer les anciennes URLs
				state.instruments.forEach((inst) => {
					if (inst.videoUrl) {
						URL.revokeObjectURL(inst.videoUrl);
					}
				});

				return {
					instruments,
					clips,
					isPlaying: false,
					currentTime: 0,
					bpm: 120, // BPM par défaut
					totalBeats,
					gridSize: { rows: n, cols: n },
					loopMode: false
				};
			});

			console.log('✅ Import CSV terminé avec succès');
			return true;
		} catch (err) {
			console.error("❌ Erreur lors de l'import CSV:");
			console.error('   Type:', err instanceof Error ? err.name : typeof err);
			console.error('   Message:', err instanceof Error ? err.message : String(err));
			console.error('   Stack:', err instanceof Error ? err.stack : 'N/A');
			return false;
		}
	},

	generateFFmpegScript: (state: SequencerState) => {
		// Calculer la durée totale
		const lastClipEnd = state.clips.reduce((max, clip) => {
			return Math.max(max, clip.startTime + clip.duration);
		}, 0);
		const totalDuration = timeUtils.beatsToSeconds(lastClipEnd, state.bpm);

		const gridCols = state.gridSize.cols;
		const gridRows = state.gridSize.rows;
		const cellWidth = Math.floor(1920 / gridCols);
		const cellHeight = Math.floor(1080 / gridRows);

		let script = `#!/usr/bin/env python3
"""
Script de rendu VideoSequencer
Généré le ${new Date().toLocaleString()}
BPM: ${state.bpm}, Durée: ${totalDuration.toFixed(2)}s, Grille: ${gridCols}x${gridRows}

Installation: pip install moviepy
Utilisation: python3 render-VideoSequencer.py
"""

from moviepy import VideoFileClip, ColorClip, CompositeVideoClip
import os

# Configuration
CLIPS_DIR = "./clips"
OUTPUT_DIR = "./output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

DURATION = ${totalDuration.toFixed(3)}
WIDTH, HEIGHT = 1920, 1080
CELL_WIDTH = ${cellWidth}
CELL_HEIGHT = ${cellHeight}

print("🎬 Rendu vidéo VideoSequencer")
print(f"Durée: {DURATION:.2f}s")
print(f"Grille: ${gridCols}x${gridRows}")
print(f"Clips: ${state.clips.length}")
print("")

# Fond noir
base = ColorClip(size=(WIDTH, HEIGHT), color=(0,0,0), duration=DURATION)

# Liste de tous les clips
clips = []

`;

		// Générer le code pour chaque clip
		state.clips.forEach((clip, idx) => {
			const inst = state.instruments.find((i) => i.gridPosition === clip.gridPosition);
			if (!inst) return;

			const startSec = timeUtils.beatsToSeconds(clip.startTime, state.bpm);
			const offset = inst.offset || 0;
			const maxDuration = inst.maxDuration || 0;

			const row = Math.floor(inst.gridPosition / gridCols);
			const col = inst.gridPosition % gridCols;
			const x = col * cellWidth;
			const y = row * cellHeight;

			script += `# Clip ${idx + 1}: ${inst.name} au beat ${clip.startTime}${offset > 0 ? ` (offset: ${offset}s)` : ''}${maxDuration > 0 ? ` (max: ${maxDuration}s)` : ''}\n`;
			script += `# Chercher le fichier vidéo avec différentes extensions\n`;
			script += `video_path${idx} = None\n`;
			script += `for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:\n`;
			script += `    potential = f"{CLIPS_DIR}/${inst.name}" + ext\n`;
			script += `    if os.path.exists(potential):\n`;
			script += `        video_path${idx} = potential\n`;
			script += `        break\n`;
			script += `if not video_path${idx}:\n`;
			script += `    print(f"⚠️  Vidéo non trouvée: ${inst.name}")\n`;
			script += `    continue\n`;
			script += `video${idx} = VideoFileClip(video_path${idx})\n`;

			// Utiliser la portion définie par offset et maxDuration, indépendamment de la durée en beats
			if (maxDuration > 0) {
				// Durée limitée par maxDuration
				script += `clip_duration${idx} = min(${maxDuration.toFixed(3)}, video${idx}.duration - ${offset.toFixed(3)})\n`;
			} else {
				// Utiliser toute la vidéo disponible après l'offset
				script += `clip_duration${idx} = video${idx}.duration - ${offset.toFixed(3)}\n`;
			}

			script += `video${idx} = video${idx}.subclipped(${offset.toFixed(3)}, ${offset.toFixed(3)} + clip_duration${idx})\n`;
			script += `video${idx} = video${idx}.resized((${cellWidth}, ${cellHeight}))\n`;
			script += `video${idx} = video${idx}.with_start(${startSec.toFixed(3)})\n`;
			script += `video${idx} = video${idx}.with_position((${x}, ${y}))\n`;
			script += `clips.append(video${idx})\n\n`;
		});

		script += `# Créer les images fixes (première frame) pour chaque instrument
print("Création des images fixes...")
static_frames = []

`;

		// Créer les frames statiques pour chaque instrument
		state.instruments.forEach((inst) => {
			const row = Math.floor(inst.gridPosition / gridCols);
			const col = inst.gridPosition % gridCols;
			const x = col * cellWidth;
			const y = row * cellHeight;

			const offset = inst.offset || 0;
			const varName = inst.name.replace(/[^a-zA-Z0-9]/g, '_');

			script += `# Frame fixe pour ${inst.name}${offset > 0 ? ` (offset: ${offset}s)` : ''}\n`;
			script += `static_path_${varName} = None\n`;
			script += `for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:\n`;
			script += `    potential = f"{CLIPS_DIR}/${inst.name}" + ext\n`;
			script += `    if os.path.exists(potential):\n`;
			script += `        static_path_${varName} = potential\n`;
			script += `        break\n`;
			script += `if static_path_${varName}:\n`;
			script += `    static_${varName} = VideoFileClip(static_path_${varName})\n`;
			script += `    static_${varName} = static_${varName}.to_ImageClip(${offset.toFixed(3)})\n`;
			script += `    static_${varName} = static_${varName}.resized((${cellWidth}, ${cellHeight}))\n`;
			script += `    static_${varName} = static_${varName}.with_duration(DURATION)\n`;
			script += `    static_${varName} = static_${varName}.with_position((${x}, ${y}))\n`;
			script += `    static_frames.append(static_${varName})\n\n`;
		});

		script += `# Composer: fond noir + frames fixes + clips animés
print(f"Composition de {len(static_frames)} frames fixes + {len(clips)} clips animés...")
final = CompositeVideoClip([base] + static_frames + clips, size=(WIDTH, HEIGHT))

# Rendu
from datetime import datetime
output_file = f"{OUTPUT_DIR}/render_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
print(f"Rendu vers: {output_file}")

final.write_videofile(
    output_file,
    fps=30,
    codec='libx264',
    audio_codec='aac',
    bitrate='5000k',
    preset='medium'
)

print("✅ Rendu terminé!")
print(f"Fichier: {output_file}")
`;

		// Télécharger
		const blob = new Blob([script], { type: 'text/x-python' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'render-VideoSequencer.py';
		a.click();
		URL.revokeObjectURL(url);

		return script;
	},

	renderVideoAPI: async (state: SequencerState) => {
		try {
			// Préparer les données pour l'API
			const renderData = {
				bpm: state.bpm,
				gridSize: state.gridSize,
				instruments: state.instruments.map((inst) => ({
					id: inst.id,
					name: inst.name,
					gridPosition: inst.gridPosition,
					offset: inst.offset || 0,
					maxDuration: inst.maxDuration || 0
				})),
				clips: state.clips.map((clip) => ({
					id: clip.id,
					gridPosition: clip.gridPosition,
					startTime: clip.startTime,
					duration: clip.duration
				}))
			};

			// Créer un FormData pour envoyer les données + vidéos uploadées
			const formData = new FormData();
			formData.append('data', JSON.stringify(renderData));

			// Ajouter les vidéos qui ont été uploadées (pas celles de ./clips/)
			const uploadedVideos = state.instruments.filter((inst) => inst.videoFile !== null);
			for (const inst of uploadedVideos) {
				if (inst.videoFile) {
					// Créer un nouveau fichier avec le bon nom (nom de l'instrument + extension)
					const extension = inst.videoFile.name.split('.').pop();
					const newFile = new File([inst.videoFile], `${inst.name}.${extension}`, {
						type: inst.videoFile.type
					});
					formData.append('videos', newFile);
				}
			}

			console.log(
				`📤 Envoi de ${uploadedVideos.length} vidéos uploadées + ${state.instruments.length - uploadedVideos.length} vidéos locales`
			);

			// Appeler l'API de rendu
			// Timeout de 30 minutes pour les très longs rendus (nombreux clips)
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000);

			console.log('🎬 Envoi de la requête de rendu...');
			const response = await fetch('/api/render', {
				method: 'POST',
				body: formData,
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				console.error('❌ Erreur HTTP:', response.status, errorText);
				throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
			}

			console.log('✅ Réponse reçue, téléchargement du fichier...');

			// Télécharger le fichier vidéo
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `render_${Date.now()}.mp4`;
			a.click();
			URL.revokeObjectURL(url);

			return true;
		} catch (err) {
			console.error('Erreur de rendu:', err);
			return false;
		}
	}
};
