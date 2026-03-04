<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		sequencerState,
		playbackState,
		timeUtils,
		sequencerActions
	} from '$lib/stores/sequencer';
	import type { VideoInstrument } from '$lib/types/sequencer';

	// Références aux éléments vidéo (par gridPosition)
	let videoRefs: Map<number, HTMLVideoElement> = new Map();
	let gridContainer: HTMLDivElement;

	// Variables pour le drag & drop
	let draggedInstrumentId: string | null = null;
	let dragOverPosition: number | null = null;

	function handleDragStart(event: DragEvent, instrumentId: string) {
		draggedInstrumentId = instrumentId;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(event: DragEvent, position: number) {
		event.preventDefault();
		dragOverPosition = position;
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDragLeave() {
		dragOverPosition = null;
	}

	function handleDrop(event: DragEvent, position: number) {
		event.preventDefault();
		if (draggedInstrumentId) {
			sequencerActions.moveInstrumentToPosition(draggedInstrumentId, position);
		}
		draggedInstrumentId = null;
		dragOverPosition = null;
	}

	function handleDragEnd() {
		draggedInstrumentId = null;
		dragOverPosition = null;
	}

	// Action Svelte pour enregistrer une référence vidéo (par gridPosition)
	function videoAction(element: HTMLVideoElement, gridPos: number) {
		videoRefs.set(gridPos, element);
		element.preload = 'auto';
		element.loop = false;
		console.log(`📹 Video registered at gridPos ${gridPos}, src: ${element.src}`);

		return {
			destroy() {
				videoRefs.delete(gridPos);
				console.log(`🗑️ Video unregistered at gridPos ${gridPos}`);
			}
		};
	}

	// Créer la grille d'instruments
	$: gridArray = Array.from(
		{ length: $sequencerState.gridSize.rows * $sequencerState.gridSize.cols },
		(_, index) => {
			return $sequencerState.instruments.find((inst) => inst.gridPosition === index) || null;
		}
	);

	// Logger les instruments pour debug
	$: {
		console.log(
			'📋 Current instruments:',
			$sequencerState.instruments.map((i) => ({ id: i.id, name: i.name, hasUrl: !!i.videoUrl }))
		);
		console.log(
			'🎬 Current clips:',
			$sequencerState.clips.map((c) => ({
				id: c.id,
				gridPosition: c.gridPosition,
				start: c.startTime,
				duration: c.duration
			}))
		);
	}

	// Mapper les clips actifs avec leur progression
	let activeClipsMap = new Map<string, { clip: any; progress: number }>();

	// Stocker l'ID du clip actif et son temps de début pour chaque gridPosition
	let activeClipInfo = new Map<number, { clipId: string; startTime: number }>();

	// Réinitialiser quand on arrête de jouer
	$: if (!$sequencerState.isPlaying) {
		activeClipInfo.clear();
	}

	// Gérer la lecture des vidéos selon les clips actifs
	$: {
		console.log(`🎥 VideoRefs map:`, Array.from(videoRefs.keys()));

		// Si on ne joue pas, arrêter toutes les vidéos et afficher la frame à l'offset
		if (!$sequencerState.isPlaying) {
			videoRefs.forEach((video, gridPos) => {
				const instrument = $sequencerState.instruments.find((i) => i.gridPosition === gridPos);
				const offset = instrument?.offset || 0;

				if (!video.paused) {
					video.pause();
				}

				// Toujours afficher la frame à l'offset quand on ne joue pas
				try {
					if (video.currentTime !== offset) {
						video.currentTime = offset;
					}
				} catch (err) {
					console.warn(`⚠️ Erreur définition currentTime pour gridPos ${gridPos}: ${err}`);
				}
			});
		} else {
			// Créer un set des gridPositions qui ont des clips actifs
			const currentActiveGridPositions = new Set<number>();

			// Mode lecture : gérer les clips actifs
			$sequencerState.clips.forEach((clip) => {
				const clipStart = clip.startTime;
				const clipEnd = clipStart + clip.duration;
				const isActive =
					$sequencerState.currentTime >= clipStart && $sequencerState.currentTime < clipEnd;

				if (isActive) {
					currentActiveGridPositions.add(clip.gridPosition);
					const video = videoRefs.get(clip.gridPosition);
					if (!video) {
						console.warn(`⚠️ No video ref found for gridPosition ${clip.gridPosition}`);
						return;
					}

					// Vérifier si c'est un nouveau clip (différent ID)
					const currentInfo = activeClipInfo.get(clip.gridPosition);
					const isNewClip = !currentInfo || currentInfo.clipId !== clip.id;

					if (isNewClip) {
						// Nouveau clip : enregistrer ses infos et calculer le playbackRate
						console.log(`🎬 Starting new clip ${clip.id} for gridPosition ${clip.gridPosition}`);
						activeClipInfo.set(clip.gridPosition, {
							clipId: clip.id,
							startTime: clipStart
						});

						// Assurer que la vidéo est chargée et a des métadonnées
						if (video.readyState < 2) {
							console.log(`⏳ Loading video for gridPosition ${clip.gridPosition}`);
							video.load();
						}

						// Trouver l'instrument à cette gridPosition pour obtenir son offset et maxDuration
						const instrument = $sequencerState.instruments.find(
							(i) => i.gridPosition === clip.gridPosition
						);
						const offset = instrument?.offset || 0;
						const maxDuration = instrument?.maxDuration || 0;

						// Calculer la durée du clip en secondes
						const clipDurationSeconds = timeUtils.beatsToSeconds(
							clip.duration,
							$sequencerState.bpm
						);

						// Jouer à vitesse normale (1.0) et simplement respecter les offsets
						try {
							video.playbackRate = 1.0;
						} catch (err) {
							console.warn(`⚠️ Impossible de définir playbackRate: ${err}`);
						}

						console.log(
							`⚙️ Clip start: ${clipStart}, duration: ${clip.duration} beats, Offset: ${offset}s, MaxDuration: ${maxDuration}s`
						);

						// Démarrer depuis l'offset
						try {
							video.currentTime = offset;
						} catch (err) {
							console.warn(`⚠️ Impossible de définir currentTime: ${err}`);
						}

						// Démarrer la lecture
						const playPromise = video.play();
						if (playPromise !== undefined) {
							playPromise.catch((err) => {
								if (err.name !== 'AbortError') {
									console.warn(`Erreur lecture vidéo gridPos ${clip.gridPosition}:`, err.message);
								}
							});
						}
					} else {
						// La vidéo joue déjà pour ce clip, vérifier si elle a atteint sa fin (maxDuration)
						const instrument = $sequencerState.instruments.find(
							(i) => i.gridPosition === clip.gridPosition
						);
						const offset = instrument?.offset || 0;
						const maxDuration = instrument?.maxDuration || 0;

						// Arrêter uniquement si maxDuration est dépassé (pas basé sur les beats du clip)
						if (maxDuration > 0 && video.currentTime >= offset + maxDuration && !video.paused) {
							video.pause();
							video.currentTime = offset;
						}
					}
				}
			});

			// Arrêter les vidéos qui n'ont plus de clips actifs et qui ont dépassé leur maxDuration
			videoRefs.forEach((video, gridPos) => {
				if (!currentActiveGridPositions.has(gridPos) && !video.paused) {
					const instrument = $sequencerState.instruments.find((i) => i.gridPosition === gridPos);
					const offset = instrument?.offset || 0;
					const maxDuration = instrument?.maxDuration || 0;

					// Ne pas arrêter si la vidéo est encore dans sa durée max
					const shouldContinue = maxDuration === 0 || video.currentTime < offset + maxDuration;

					if (!shouldContinue) {
						video.pause();
						video.currentTime = offset;
						activeClipInfo.delete(gridPos);
					}
					// Sinon, laisser la vidéo continuer de jouer même sans clip actif
				}
			});
		}
	}

	// Nettoyer lors de la destruction
	onDestroy(() => {
		videoRefs.forEach((video) => {
			video.pause();
		});
		videoRefs.clear();
	});
</script>

<div
	class="video-grid"
	bind:this={gridContainer}
	style="--grid-cols: {$sequencerState.gridSize.cols}; --grid-rows: {$sequencerState.gridSize.rows}"
>
	{#each gridArray as instrument, index (index)}
		<div
			class="grid-cell"
			class:drag-over={dragOverPosition === index}
			role="cell"
			tabindex={index}
			style="border: 2px solid {instrument?.color || '#333'}"
			ondragover={(e) => handleDragOver(e, index)}
			ondragleave={handleDragLeave}
			ondrop={(e) => handleDrop(e, index)}
		>
			{#if instrument && instrument.videoUrl}
				<div
					class="video-wrapper"
					role="img"
					aria-label={instrument.name}
					draggable="true"
					ondragstart={(e) => handleDragStart(e, instrument.id)}
					ondragend={handleDragEnd}
				>
					<video
						use:videoAction={instrument.gridPosition}
						src={instrument.videoUrl}
						class="video-player"
						muted={false}
					>
						<track kind="captions" />
					</video>
					<div class="instrument-label" style="background: {instrument.color}">
						{instrument.name}
					</div>
					<div class="drag-handle" title="Glisser pour déplacer">⋮⋮</div>
				</div>
			{:else}
				<div class="empty-cell">
					<span class="cell-number">{index + 1}</span>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.video-grid {
		display: grid;
		grid-template-columns: repeat(var(--grid-cols), 1fr);
		grid-template-rows: repeat(var(--grid-rows), 1fr);
		gap: 4px;
		background: #0a0a0a;
		padding: 1rem;
		width: 100%;
		flex: 1;
		min-height: 0;
	}

	.grid-cell {
		position: relative;
		background: #1a1a1a;
		border-radius: 4px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.grid-cell.drag-over {
		background: #2a2a4a;
		border-color: #667eea !important;
		box-shadow: inset 0 0 20px rgba(102, 126, 234, 0.3);
	}

	.video-wrapper {
		width: 100%;
		height: 100%;
		position: relative;
		cursor: move;
	}

	.video-wrapper:active {
		cursor: grabbing;
	}

	.video-player {
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}

	.drag-handle {
		position: absolute;
		top: 4px;
		right: 4px;
		background: rgba(0, 0, 0, 0.6);
		color: white;
		padding: 4px 8px;
		border-radius: 3px;
		font-size: 1rem;
		opacity: 0;
		transition: opacity 0.2s;
		pointer-events: none;
		user-select: none;
	}

	.video-wrapper:hover .drag-handle {
		opacity: 1;
	}

	.instrument-label {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		text-align: center;
		opacity: 0.9;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	.empty-cell {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #444;
		font-size: 2rem;
		font-weight: 300;
	}

	.cell-number {
		opacity: 0.3;
	}
</style>
