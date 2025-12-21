<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { sequencerState, sequencerActions, timeUtils } from '$lib/stores/sequencer';

	let timelineCanvas: HTMLCanvasElement;
	let tracksContainer: HTMLDivElement;
	let ctx: CanvasRenderingContext2D | null;
	let animationFrame: number;

	const PIXELS_PER_BEAT = 40;
	const TRACK_HEIGHT = 60;
	const TIMELINE_HEIGHT = 40;

	// Variables pour le drag & drop
	let isDragging = false;
	let draggedClipId: string | null = null;
	let dragStartX = 0;
	let dragStartBeat = 0;

	// Variables pour créer de nouveaux clips
	let isCreatingClip = false;
	let newClipStart = 0;
	let newClipTrack = 0;
	let newClipInstrumentId = '';

	// Trier les instruments par gridPosition pour que les tracks correspondent à la grille
	$: tracks = [...$sequencerState.instruments]
		.sort((a, b) => a.gridPosition - b.gridPosition)
		.map((inst, index) => ({
			index,
			instrument: inst,
			clips: $sequencerState.clips.filter((clip) => clip.instrumentId === inst.id)
		}));

	$: timelineWidth = $sequencerState.totalBeats * PIXELS_PER_BEAT;

	// Moteur de lecture temps réel
	let lastTime = 0;
	function updatePlayback(currentTime: number) {
		if (!$sequencerState.isPlaying) {
			lastTime = currentTime;
			animationFrame = requestAnimationFrame(updatePlayback);
			return;
		}

		const deltaTime = currentTime - lastTime;
		lastTime = currentTime;

		const deltaBeat = timeUtils.secondsToBeats(deltaTime / 1000, $sequencerState.bpm);
		let newTime = $sequencerState.currentTime + deltaBeat;

		// Trouver la fin réelle du dernier clip
		const lastClipEnd = $sequencerState.clips.reduce((max, clip) => {
			return Math.max(max, clip.startTime + clip.duration);
		}, 0);

		// S'arrêter à la fin du dernier clip (ou totalBeats si pas de clips)
		const endPoint = lastClipEnd > 0 ? lastClipEnd : $sequencerState.totalBeats;

		if (newTime >= endPoint) {
			if ($sequencerState.loopMode) {
				// Mode boucle : revenir au début et continuer
				sequencerActions.setCurrentTime(0);
			} else {
				// Mode normal : arrêter
				console.log(`🛑 Fin atteinte (${endPoint} beats), arrêt de la lecture`);
				sequencerActions.stop();
			}
		} else {
			sequencerActions.setCurrentTime(newTime);
		}

		drawTimeline();
		animationFrame = requestAnimationFrame(updatePlayback);
	}

	function drawTimeline() {
		if (!ctx || !timelineCanvas) return;

		const canvas = timelineCanvas;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Fond
		ctx.fillStyle = '#1a1a1a';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Grille des beats
		ctx.strokeStyle = '#333';
		ctx.lineWidth = 1;

		for (let beat = 0; beat <= $sequencerState.totalBeats; beat++) {
			const x = beat * PIXELS_PER_BEAT;

			// Ligne verticale
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();

			// Numéro de beat
			if (beat % 4 === 0) {
				ctx.fillStyle = '#888';
				ctx.font = '11px sans-serif';
				ctx.fillText(`${beat}`, x + 4, 20);
			}
		}

		// Ligne de lecture actuelle
		const playheadX = $sequencerState.currentTime * PIXELS_PER_BEAT;
		ctx.strokeStyle = '#667eea';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(playheadX, 0);
		ctx.lineTo(playheadX, canvas.height);
		ctx.stroke();
	}

	function handleTimelineClick(event: MouseEvent) {
		if (!timelineCanvas) return;
		const rect = timelineCanvas.getBoundingClientRect();
		const x = event.clientX - rect.left + tracksContainer.scrollLeft;
		const beat = x / PIXELS_PER_BEAT;
		sequencerActions.setCurrentTime(beat);
	}

	function handleTrackMouseDown(event: MouseEvent, trackIndex: number, instrumentId: string) {
		const target = event.target as HTMLElement;
		if (target.classList.contains('clip')) {
			// Démarrer le drag d'un clip existant
			const clipId = target.dataset.clipId;
			if (clipId) {
				isDragging = true;
				draggedClipId = clipId;
				dragStartX = event.clientX;
				const clip = $sequencerState.clips.find((c) => c.id === clipId);
				if (clip) dragStartBeat = clip.startTime;
			}
		} else if (target.classList.contains('track')) {
			// Créer un nouveau clip
			isCreatingClip = true;
			const rect = target.getBoundingClientRect();
			const x = event.clientX - rect.left + tracksContainer.scrollLeft;
			newClipStart = Math.floor(x / PIXELS_PER_BEAT);
			newClipTrack = trackIndex;
			newClipInstrumentId = instrumentId;
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (isDragging && draggedClipId) {
			const deltaX = event.clientX - dragStartX;
			const deltaBeat = deltaX / PIXELS_PER_BEAT;
			const newStartTime = Math.max(0, dragStartBeat + deltaBeat);
			sequencerActions.updateClip(draggedClipId, { startTime: newStartTime });
		}
	}

	function handleMouseUp(event: MouseEvent) {
		if (isCreatingClip) {
			// Finaliser la création du clip
			const rect = tracksContainer.getBoundingClientRect();
			const x = event.clientX - rect.left + tracksContainer.scrollLeft;
			const endBeat = Math.floor(x / PIXELS_PER_BEAT);
			const duration = Math.max(1, endBeat - newClipStart);

			// Obtenir la durée réelle de la vidéo
			const instrument = $sequencerState.instruments.find((i) => i.id === newClipInstrumentId);
			if (instrument) {
				sequencerActions.addClip(newClipInstrumentId, newClipStart, duration, newClipTrack);
			}
		}

		isDragging = false;
		draggedClipId = null;
		isCreatingClip = false;
	}

	function deleteClip(clipId: string) {
		//if (confirm('Supprimer ce clip ?')) {
			sequencerActions.removeClip(clipId);
		//}
	}

	onMount(() => {
		if (timelineCanvas) {
			ctx = timelineCanvas.getContext('2d');
			drawTimeline();
		}
		animationFrame = requestAnimationFrame(updatePlayback);

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	});

	onDestroy(() => {
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
		}
		if (typeof document !== 'undefined') {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}
	});

	// Redessiner quand l'état change (uniquement côté client)
	$: if (typeof window !== 'undefined') {
		$sequencerState;
		drawTimeline();
	}
</script>

<div class="timeline-container">
	<div class="tracks-wrapper" bind:this={tracksContainer}>
		<canvas
			bind:this={timelineCanvas}
			width={timelineWidth}
			height={TIMELINE_HEIGHT}
			class="timeline-canvas"
			onclick={handleTimelineClick}
		></canvas>

		<div class="tracks" style="width: {timelineWidth}px;">
			{#each tracks as track (track.instrument.id)}
				<div
					class="track"
					style="height: {TRACK_HEIGHT}px; border-left: 3px solid {track.instrument.color};"
					onmousedown={(e) => handleTrackMouseDown(e, track.index, track.instrument.id)}
				>
					<div class="track-label">{track.instrument.name}</div>
					{#each track.clips as clip (clip.id)}
						<div
							class="clip"
							data-clip-id={clip.id}
							style="
								left: {clip.startTime * PIXELS_PER_BEAT}px;
								width: {clip.duration * PIXELS_PER_BEAT}px;
								background: {track.instrument.color};
							"
						>
							<span class="clip-label">{track.instrument.name}</span>
							<button class="clip-delete" onclick={() => deleteClip(clip.id)}>×</button>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.timeline-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: #1a1a1a;
		overflow: hidden;
	}

	.timeline-canvas {
		cursor: pointer;
		display: block;
		background: #1a1a1a;
		border-bottom: 2px solid #333;
	}

	.tracks-wrapper {
		flex: 1;
		overflow: auto;
		background: #0a0a0a;
	}

	.tracks {
		min-width: 100%;
	}

	.track {
		position: relative;
		background: #1a1a1a;
		border-bottom: 1px solid #2a2a2a;
		cursor: crosshair;
		user-select: none;
	}

	.track:hover {
		background: #1f1f1f;
	}

	.track-label {
		position: absolute;
		left: 8px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.85rem;
		color: #666;
		pointer-events: none;
		z-index: 0;
	}

	.clip {
		position: absolute;
		top: 8px;
		height: calc(100% - 16px);
		border-radius: 4px;
		cursor: move;
		display: flex;
		align-items: center;
		padding: 0 8px;
		opacity: 0.8;
		transition: opacity 0.2s;
		z-index: 1;
	}

	.clip:hover {
		opacity: 1;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}

	.clip-label {
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
		pointer-events: none;
	}

	.clip-delete {
		width: 20px;
		height: 20px;
		background: rgba(255, 255, 255, 0.2);
		border: none;
		border-radius: 50%;
		color: white;
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		display: none;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		margin-left: 4px;
	}

	.clip:hover .clip-delete {
		display: flex;
	}

	.clip-delete:hover {
		background: rgba(255, 68, 68, 0.8);
	}
</style>
