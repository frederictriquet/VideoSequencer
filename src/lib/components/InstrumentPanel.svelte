<script lang="ts">
	import { sequencerState, sequencerActions } from '$lib/stores/sequencer';
	import InstrumentPropertiesModal from './InstrumentPropertiesModal.svelte';
	import type { VideoInstrument } from '$lib/types/sequencer';

	let showPropertiesModal = false;
	let selectedInstrument: VideoInstrument | null = null;

	function removeInstrument(id: string) {
		if (confirm('Êtes-vous sûr de vouloir supprimer cet instrument ?')) {
			sequencerActions.removeInstrument(id);
		}
	}

	function addTestClip(instrumentId: string, trackIndex: number) {
		// Ajouter un clip de test de 4 beats à la position 0
		sequencerActions.addClip(instrumentId, 0, 4, trackIndex);
	}

	function openInstrumentProperties(instrument: VideoInstrument) {
		selectedInstrument = instrument;
		showPropertiesModal = true;
	}

	function closePropertiesModal() {
		showPropertiesModal = false;
		selectedInstrument = null;
	}
</script>

<div class="instrument-panel">
	<h2>Instruments</h2>
	<div class="instruments-list">
		{#each $sequencerState.instruments as instrument, index (instrument.id)}
			<div
				class="instrument-item"
				style="border-left: 3px solid {instrument.color}"
				ondblclick={() => openInstrumentProperties(instrument)}
				title="Double-clic pour éditer les propriétés"
			>
				<div class="instrument-info">
					<div class="instrument-name">
						{instrument.name}
						{#if instrument.offset > 0}
							<span class="offset-indicator">+{instrument.offset}s</span>
						{/if}
					</div>
					<div class="instrument-position">Région {instrument.gridPosition + 1}</div>
				</div>
				<div class="instrument-actions">
					<button
						onclick={() => addTestClip(instrument.id, index)}
						class="test-btn"
						title="Ajouter clip de test"
					>
						+
					</button>
					<button
						onclick={() => removeInstrument(instrument.id)}
						class="remove-btn"
						title="Supprimer"
					>
						×
					</button>
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<p>Aucun instrument</p>
				<p class="hint">Ajoutez une vidéo pour commencer</p>
			</div>
		{/each}
	</div>
</div>

{#if showPropertiesModal && selectedInstrument}
	<InstrumentPropertiesModal instrument={selectedInstrument} onClose={closePropertiesModal} />
{/if}

<style>
	.instrument-panel {
		padding: 1rem;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	h2 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #e0e0e0;
	}

	.instruments-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.instrument-item {
		background: #2a2a2a;
		padding: 0.75rem;
		border-radius: 4px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: background 0.2s;
	}

	.instrument-item:hover {
		background: #323232;
	}

	.instrument-info {
		flex: 1;
		min-width: 0;
		margin-right: 0.5rem;
	}

	.instrument-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.instrument-name {
		font-weight: 500;
		color: #ffffff;
		margin-bottom: 0.25rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.offset-indicator {
		display: inline-block;
		background: rgba(102, 126, 234, 0.3);
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-size: 0.7rem;
		font-family: 'Courier New', monospace;
		flex-shrink: 0;
	}

	.instrument-position {
		font-size: 0.75rem;
		color: #888;
	}

	.test-btn,
	.remove-btn {
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 50%;
		color: white;
		font-size: 1.2rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background 0.2s,
			transform 0.1s;
		flex-shrink: 0;
	}

	.test-btn {
		background: #4ecdc4;
	}

	.test-btn:hover {
		background: #45b7d1;
		transform: scale(1.1);
	}

	.remove-btn {
		background: #ff4444;
	}

	.remove-btn:hover {
		background: #ff6666;
		transform: scale(1.1);
	}

	.test-btn:active,
	.remove-btn:active {
		transform: scale(0.95);
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #666;
		text-align: center;
		padding: 2rem;
	}

	.empty-state p {
		margin: 0.25rem 0;
	}

	.hint {
		font-size: 0.85rem;
		color: #555;
	}
</style>
