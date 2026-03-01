<script lang="ts">
	import { renderProgress } from '$lib/stores/sequencer';

	$: progress = $renderProgress;
	$: progressPercent = Math.round(progress.progress);
</script>

{#if progress.isRendering || progress.status === 'completed' || progress.status === 'error'}
	<div class="render-progress-overlay">
		<div class="render-progress-modal">
			<h3>
				{#if progress.status === 'error'}
					Erreur de rendu
				{:else if progress.status === 'completed'}
					Rendu terminé!
				{:else}
					Rendu en cours...
				{/if}
			</h3>

			<div class="progress-bar-container">
				<div
					class="progress-bar"
					class:error={progress.status === 'error'}
					class:completed={progress.status === 'completed'}
					style="width: {progressPercent}%"
				></div>
			</div>

			<div class="progress-info">
				<span class="progress-percent">{progressPercent}%</span>
				<span class="progress-step">{progress.step}</span>
			</div>

			{#if progress.totalClips > 0 && progress.status === 'processing'}
				<div class="clips-info">
					Clips: {progress.processedClips} / {progress.totalClips}
				</div>
			{/if}

			{#if progress.status === 'error' && progress.error}
				<div class="error-message">
					{progress.error}
				</div>
			{/if}

			{#if progress.status === 'completed' || progress.status === 'error'}
				<button
					class="close-button"
					on:click={() =>
						renderProgress.set({
							isRendering: false,
							jobId: null,
							status: 'idle',
							progress: 0,
							step: '',
							totalClips: 0,
							processedClips: 0,
							error: null
						})}
				>
					Fermer
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.render-progress-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.render-progress-modal {
		background: #1a1a2e;
		border-radius: 12px;
		padding: 2rem;
		min-width: 400px;
		max-width: 500px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
		border: 1px solid #333;
	}

	h3 {
		margin: 0 0 1.5rem 0;
		color: #fff;
		font-size: 1.25rem;
		text-align: center;
	}

	.progress-bar-container {
		background: #2d2d44;
		border-radius: 8px;
		height: 24px;
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, #4ecdc4, #45b7d1);
		border-radius: 8px;
		transition: width 0.3s ease;
	}

	.progress-bar.completed {
		background: linear-gradient(90deg, #4ecdc4, #2ecc71);
	}

	.progress-bar.error {
		background: linear-gradient(90deg, #e74c3c, #c0392b);
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #aaa;
		font-size: 0.9rem;
	}

	.progress-percent {
		font-weight: bold;
		color: #4ecdc4;
		font-size: 1.1rem;
	}

	.progress-step {
		color: #888;
	}

	.clips-info {
		text-align: center;
		color: #666;
		font-size: 0.85rem;
		margin-top: 0.75rem;
	}

	.error-message {
		background: rgba(231, 76, 60, 0.2);
		border: 1px solid #e74c3c;
		border-radius: 6px;
		padding: 0.75rem;
		margin-top: 1rem;
		color: #e74c3c;
		font-size: 0.9rem;
	}

	.close-button {
		display: block;
		width: 100%;
		margin-top: 1.5rem;
		padding: 0.75rem;
		background: #4ecdc4;
		color: #1a1a2e;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
	}

	.close-button:hover {
		background: #45b7d1;
	}
</style>
