<script lang="ts">
	import { sequencerState, sequencerActions } from '$lib/stores/sequencer';

	function handleBpmChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const bpm = parseInt(target.value, 10);
		if (!isNaN(bpm)) {
			sequencerActions.setBpm(bpm);
		}
	}

	function formatTime(beats: number, bpm: number): string {
		const totalSeconds = (beats / bpm) * 60;
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.floor(totalSeconds % 60);
		const milliseconds = Math.floor((totalSeconds % 1) * 100);
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
	}
</script>

<div class="transport-controls">
	<div class="controls-left">
		<button
			class="control-btn play-btn"
			onclick={() =>
				$sequencerState.isPlaying ? sequencerActions.pause() : sequencerActions.play()}
			title={$sequencerState.isPlaying ? 'Pause' : 'Play'}
		>
			{#if $sequencerState.isPlaying}
				<svg viewBox="0 0 24 24" class="icon">
					<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="currentColor" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" class="icon">
					<path d="M8 5v14l11-7z" fill="currentColor" />
				</svg>
			{/if}
		</button>

		<button class="control-btn stop-btn" onclick={() => sequencerActions.stop()} title="Stop">
			<svg viewBox="0 0 24 24" class="icon">
				<rect x="6" y="6" width="12" height="12" fill="currentColor" />
			</svg>
		</button>

		<button
			class="control-btn loop-btn"
			class:active={$sequencerState.loopMode}
			onclick={() => sequencerActions.toggleLoopMode()}
			title={$sequencerState.loopMode ? 'Loop: ON' : 'Loop: OFF'}
		>
			<svg viewBox="0 0 24 24" class="icon">
				<path
					d="M17 17H7V14L3 18L7 22V19H19V13H17M7 7H17V10L21 6L17 2V5H5V11H7V7Z"
					fill="currentColor"
				/>
			</svg>
		</button>

		<div class="time-display">
			<span class="time-label">Temps:</span>
			<span class="time-value">
				{formatTime($sequencerState.currentTime, $sequencerState.bpm)}
			</span>
		</div>

		<div class="beat-display">
			<span class="beat-label">Beat:</span>
			<span class="beat-value">
				{Math.floor($sequencerState.currentTime) + 1}/{$sequencerState.totalBeats}
			</span>
		</div>
	</div>

	<div class="controls-right">
		<label class="bpm-control">
			<span class="bpm-label">BPM:</span>
			<input
				type="number"
				value={$sequencerState.bpm}
				onchange={handleBpmChange}
				min="40"
				max="300"
				class="bpm-input"
			/>
		</label>
	</div>
</div>

<style>
	.transport-controls {
		background: #252525;
		border-top: 2px solid #333;
		padding: 1rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
	}

	.controls-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.control-btn {
		width: 48px;
		height: 48px;
		background: #2a2a2a;
		border: 1px solid #444;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		color: #ffffff;
	}

	.control-btn:hover {
		background: #333;
		border-color: #555;
		transform: scale(1.05);
	}

	.control-btn:active {
		transform: scale(0.95);
	}

	.play-btn {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-color: transparent;
	}

	.play-btn:hover {
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.stop-btn:hover {
		background: #ff4444;
		border-color: #ff6666;
	}

	.loop-btn {
		background: #2a2a2a;
	}

	.loop-btn.active {
		background: linear-gradient(135deg, #f7dc6f 0%, #f8b739 100%);
		border-color: transparent;
	}

	.loop-btn:hover {
		background: #333;
	}

	.loop-btn.active:hover {
		box-shadow: 0 4px 12px rgba(248, 183, 57, 0.4);
	}

	.icon {
		width: 24px;
		height: 24px;
	}

	.time-display,
	.beat-display {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: #2a2a2a;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
	}

	.time-label,
	.beat-label {
		font-size: 0.75rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.time-value,
	.beat-value {
		font-size: 1rem;
		font-weight: 600;
		color: #ffffff;
	}

	.controls-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.bpm-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: #2a2a2a;
		border-radius: 4px;
		cursor: pointer;
	}

	.bpm-label {
		font-size: 0.75rem;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.bpm-input {
		width: 60px;
		padding: 0.25rem 0.5rem;
		background: #1a1a1a;
		border: 1px solid #444;
		border-radius: 3px;
		color: #ffffff;
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		font-family: 'Courier New', monospace;
	}

	.bpm-input:focus {
		outline: none;
		border-color: #667eea;
	}

	.bpm-input::-webkit-inner-spin-button,
	.bpm-input::-webkit-outer-spin-button {
		opacity: 1;
	}
</style>
