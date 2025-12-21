<script lang="ts">
	import { sequencerActions } from '$lib/stores/sequencer';
	import type { VideoInstrument } from '$lib/types/sequencer';
	import { onMount, onDestroy } from 'svelte';

	export let instrument: VideoInstrument;
	export let onClose: () => void;

	let offset = instrument.offset;
	let maxDuration = instrument.maxDuration;
	let videoElement: HTMLVideoElement;
	let isPlaying = false;
	let playbackInterval: number | null = null;
	let videoDuration = 0;

	// Pour le double slider - utiliser des valeurs locales séparées
	let sliderStart = offset;
	let sliderEnd = 0;

	// Synchroniser offset/maxDuration vers les sliders
	$: {
		sliderStart = offset;
		sliderEnd = maxDuration > 0 ? offset + maxDuration : videoDuration;
	}

	// Handlers pour mettre à jour offset/maxDuration depuis les sliders
	function handleStartChange(event: Event) {
		const value = parseFloat((event.target as HTMLInputElement).value);
		offset = value;
		// Ajuster la fin si nécessaire
		if (sliderEnd <= offset) {
			sliderEnd = Math.min(offset + 1, videoDuration);
		}
		maxDuration = sliderEnd - offset;
	}

	function handleEndChange(event: Event) {
		const value = parseFloat((event.target as HTMLInputElement).value);
		sliderEnd = value;
		// S'assurer que la fin est après le début
		if (value > offset) {
			maxDuration = value - offset;
		}
	}

	function handleSave() {
		sequencerActions.updateInstrument(instrument.id, { offset, maxDuration });
		onClose();
	}

	function handleVideoLoaded() {
		if (videoElement) {
			videoDuration = videoElement.duration;
			if (sliderEnd === 0 || sliderEnd > videoDuration) {
				sliderEnd = videoDuration;
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		} else if (event.key === 'Enter') {
			handleSave();
		}
	}

	function playPreview() {
		if (!videoElement) return;

		videoElement.currentTime = offset;
		videoElement.play();
		isPlaying = true;

		// Arrêter la vidéo si maxDuration est atteint ou à la fin de la vidéo
		playbackInterval = window.setInterval(() => {
			const endPoint = maxDuration > 0 ? offset + maxDuration : videoDuration;
			if (videoElement.currentTime >= endPoint || videoElement.ended) {
				stopPreview();
			}
		}, 100);
	}

	function stopPreview() {
		if (!videoElement) return;

		videoElement.pause();
		videoElement.currentTime = offset;
		isPlaying = false;

		if (playbackInterval !== null) {
			clearInterval(playbackInterval);
			playbackInterval = null;
		}
	}

	// Mettre à jour la position de la vidéo quand l'offset change
	$: if (videoElement && !isPlaying) {
		videoElement.currentTime = offset;
	}

	onMount(() => {
		if (videoElement) {
			videoElement.currentTime = offset;
		}
	});

	onDestroy(() => {
		if (playbackInterval !== null) {
			clearInterval(playbackInterval);
		}
		if (videoElement && !videoElement.paused) {
			videoElement.pause();
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="modal-backdrop"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	role="button"
	tabindex="-1"
>
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		<h3>Propriétés de l'Instrument</h3>

		<div class="property-group">
			<label for="instrument-name">Nom:</label>
			<input id="instrument-name" type="text" value={instrument.name} disabled />
		</div>

		<div class="property-group">
			<label for="grid-position">Position grille:</label>
			<input id="grid-position" type="number" value={instrument.gridPosition} disabled />
		</div>

		{#if instrument.videoUrl}
			<div class="preview-section">
				<label>Prévisualisation:</label>
				<div class="video-preview">
					<video
						bind:this={videoElement}
						src={instrument.videoUrl}
						class="preview-video"
						onloadedmetadata={handleVideoLoaded}
					>
						<track kind="captions" />
					</video>
				</div>
				{#if videoDuration > 0}
					<div class="video-duration">
						Durée totale: {videoDuration.toFixed(2)}s
					</div>
				{/if}
				<div class="preview-controls">
					<button
						class="btn-play"
						onclick={playPreview}
						disabled={isPlaying}
						title="Tester avec les offsets actuels"
					>
						▶ Play
					</button>
					<button
						class="btn-stop"
						onclick={stopPreview}
						disabled={!isPlaying}
						title="Arrêter et revenir au début"
					>
						■ Stop
					</button>
					<small class="preview-hint">
						Teste la lecture avec offset = {offset}s
						{#if maxDuration > 0}et durée max = {maxDuration}s{/if}
					</small>
				</div>
			</div>
		{/if}

		{#if videoDuration > 0}
			<div class="property-group">
				<label>Portion de vidéo utilisée:</label>
				<div class="range-slider-container">
					<div class="range-slider">
						<input
							type="range"
							value={sliderStart}
							oninput={handleStartChange}
							min="0"
							max={videoDuration}
							step="0.01"
							class="slider slider-start"
						/>
						<input
							type="range"
							value={sliderEnd}
							oninput={handleEndChange}
							min="0"
							max={videoDuration}
							step="0.01"
							class="slider slider-end"
						/>
						<div class="slider-track">
							<div
								class="slider-range"
								style="left: {(sliderStart / videoDuration) * 100}%; width: {((sliderEnd -
									sliderStart) /
									videoDuration) *
									100}%"
							></div>
						</div>
					</div>
					<div class="range-values">
						<span>{sliderStart.toFixed(2)}s</span>
						<span>→</span>
						<span>{sliderEnd.toFixed(2)}s</span>
						<span class="range-duration">({(sliderEnd - sliderStart).toFixed(2)}s utilisables)</span
						>
					</div>
				</div>
			</div>
		{/if}

		<div class="property-group inputs-row">
			<div class="input-col">
				<label for="offset">Début (s):</label>
				<input
					id="offset"
					type="number"
					bind:value={offset}
					min="0"
					max={videoDuration}
					step="0.1"
					placeholder="0.0"
				/>
			</div>
			<div class="input-col">
				<label for="max-duration">Durée max (s):</label>
				<input
					id="max-duration"
					type="number"
					bind:value={maxDuration}
					min="0"
					max={videoDuration}
					step="0.1"
					placeholder="0 = ∞"
				/>
			</div>
		</div>

		<div class="button-group">
			<button class="btn-cancel" onclick={onClose}>Annuler</button>
			<button class="btn-save" onclick={handleSave}>Sauvegarder</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background: #252525;
		border-radius: 8px;
		padding: 2rem;
		min-width: 400px;
		max-width: 500px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		border: 1px solid #444;
	}

	h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		color: #ffffff;
		border-bottom: 2px solid #667eea;
		padding-bottom: 0.5rem;
	}

	.property-group {
		margin-bottom: 1.5rem;
	}

	.preview-section {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #1a1a1a;
		border-radius: 4px;
		border: 1px solid #444;
	}

	.preview-section label {
		margin-bottom: 0.75rem;
	}

	.video-duration {
		text-align: center;
		font-size: 0.8rem;
		color: #aaa;
		margin-bottom: 0.75rem;
		font-family: 'Courier New', monospace;
	}

	.video-preview {
		width: 100%;
		aspect-ratio: 16 / 9;
		background: #000;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.preview-video {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.preview-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.btn-play,
	.btn-stop {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.85rem;
	}

	.btn-play {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.btn-play:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.btn-stop {
		background: #ff4444;
		color: white;
	}

	.btn-stop:hover:not(:disabled) {
		background: #ff6666;
		transform: translateY(-1px);
	}

	.btn-play:disabled,
	.btn-stop:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.preview-hint {
		flex: 1;
		font-size: 0.7rem;
		color: #888;
		font-style: italic;
	}

	label {
		display: block;
		font-size: 0.85rem;
		color: #aaa;
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	input[type='text'],
	input[type='number'] {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: #1a1a1a;
		border: 1px solid #444;
		border-radius: 4px;
		color: #ffffff;
		font-size: 1rem;
		font-family: 'Courier New', monospace;
	}

	.inputs-row {
		display: flex;
		gap: 1rem;
	}

	.input-col {
		flex: 1;
	}

	.input-col input {
		width: 100%;
		padding: 0.4rem 0.5rem;
		font-size: 0.9rem;
	}

	/* Double Range Slider */
	.range-slider-container {
		margin-top: 0.5rem;
	}

	.range-slider {
		position: relative;
		height: 40px;
		margin-bottom: 0.75rem;
	}

	.slider {
		position: absolute;
		width: 100%;
		height: 6px;
		background: transparent;
		pointer-events: none;
		-webkit-appearance: none;
		appearance: none;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #667eea;
		cursor: pointer;
		pointer-events: all;
		border: 2px solid #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #667eea;
		cursor: pointer;
		pointer-events: all;
		border: 2px solid #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.slider-start::-webkit-slider-thumb {
		background: #667eea;
		z-index: 5;
	}

	.slider-end::-webkit-slider-thumb {
		background: #f5576c;
		z-index: 4;
	}

	.slider-start::-moz-range-thumb {
		background: #667eea;
		z-index: 5;
	}

	.slider-end::-moz-range-thumb {
		background: #f5576c;
		z-index: 4;
	}

	.slider-track {
		position: absolute;
		width: 100%;
		height: 6px;
		background: #444;
		border-radius: 3px;
		top: 17px;
		pointer-events: none;
	}

	.slider-range {
		position: absolute;
		height: 100%;
		background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
		border-radius: 3px;
	}

	.range-values {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: #aaa;
		font-family: 'Courier New', monospace;
		justify-content: center;
	}

	.range-duration {
		color: #667eea;
		font-weight: 600;
	}

	input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	input:not(:disabled):focus {
		outline: none;
		border-color: #667eea;
	}

	small {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #888;
		font-style: italic;
	}

	.button-group {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 2rem;
	}

	button {
		padding: 0.5rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
	}

	.btn-cancel {
		background: #2a2a2a;
		border: 1px solid #444;
		color: white;
	}

	.btn-cancel:hover {
		background: #333;
		border-color: #555;
	}

	.btn-save {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.btn-save:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.btn-save:active,
	.btn-cancel:active {
		transform: translateY(0);
	}
</style>
