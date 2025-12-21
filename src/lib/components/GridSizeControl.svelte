<script lang="ts">
	import { sequencerState, sequencerActions } from '$lib/stores/sequencer';

	function canReduceRows(): boolean {
		// Vérifier si la dernière ligne est vide
		const lastRowStart = ($sequencerState.gridSize.rows - 1) * $sequencerState.gridSize.cols;
		const lastRowEnd = $sequencerState.gridSize.rows * $sequencerState.gridSize.cols;

		return !$sequencerState.instruments.some(
			(inst) => inst.gridPosition >= lastRowStart && inst.gridPosition < lastRowEnd
		);
	}

	function canReduceCols(): boolean {
		// Vérifier si la dernière colonne est vide
		const lastCol = $sequencerState.gridSize.cols - 1;

		return !$sequencerState.instruments.some((inst) => inst.gridPosition % $sequencerState.gridSize.cols === lastCol);
	}

	function increaseRows() {
		if ($sequencerState.gridSize.rows < 5) {
			sequencerActions.setGridSize($sequencerState.gridSize.rows + 1, $sequencerState.gridSize.cols);
		}
	}

	function decreaseRows() {
		if ($sequencerState.gridSize.rows > 1) {
			if (canReduceRows()) {
				sequencerActions.setGridSize($sequencerState.gridSize.rows - 1, $sequencerState.gridSize.cols);
			} else {
				alert('Impossible de réduire : la dernière ligne contient des instruments');
			}
		}
	}

	function increaseCols() {
		if ($sequencerState.gridSize.cols < 5) {
			sequencerActions.setGridSize($sequencerState.gridSize.rows, $sequencerState.gridSize.cols + 1);
		}
	}

	function decreaseCols() {
		if ($sequencerState.gridSize.cols > 1) {
			if (canReduceCols()) {
				sequencerActions.setGridSize($sequencerState.gridSize.rows, $sequencerState.gridSize.cols - 1);
			} else {
				alert('Impossible de réduire : la dernière colonne contient des instruments');
			}
		}
	}
</script>

<div class="grid-size-control">
	<h3>Taille de la grille</h3>

	<div class="control-row">
		<label class="control-label">Lignes:</label>
		<div class="control-buttons">
			<button
				onclick={decreaseRows}
				class="control-btn"
				disabled={$sequencerState.gridSize.rows <= 1 || !canReduceRows()}
			>
				−
			</button>
			<span class="value">{$sequencerState.gridSize.rows}</span>
			<button
				onclick={increaseRows}
				class="control-btn"
				disabled={$sequencerState.gridSize.rows >= 5}
			>
				+
			</button>
		</div>
	</div>

	<div class="control-row">
		<label class="control-label">Colonnes:</label>
		<div class="control-buttons">
			<button
				onclick={decreaseCols}
				class="control-btn"
				disabled={$sequencerState.gridSize.cols <= 1 || !canReduceCols()}
			>
				−
			</button>
			<span class="value">{$sequencerState.gridSize.cols}</span>
			<button
				onclick={increaseCols}
				class="control-btn"
				disabled={$sequencerState.gridSize.cols >= 5}
			>
				+
			</button>
		</div>
	</div>

	<div class="info">Grille: {$sequencerState.gridSize.cols}×{$sequencerState.gridSize.rows}</div>
</div>

<style>
	.grid-size-control {
		padding: 1rem;
		background: #252525;
		border-top: 1px solid #333;
		border-bottom: 1px solid #333;
	}

	h3 {
		margin: 0 0 0.75rem 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: #e0e0e0;
	}

	.control-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.control-row:last-of-type {
		margin-bottom: 0.75rem;
	}

	.control-label {
		font-size: 0.85rem;
		color: #aaa;
	}

	.control-buttons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.control-btn {
		width: 28px;
		height: 28px;
		background: #2a2a2a;
		border: 1px solid #444;
		border-radius: 4px;
		color: white;
		font-size: 1.2rem;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.control-btn:hover:not(:disabled) {
		background: #333;
		border-color: #667eea;
		transform: scale(1.05);
	}

	.control-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.control-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.value {
		min-width: 20px;
		text-align: center;
		font-weight: 600;
		color: #ffffff;
		font-family: 'Courier New', monospace;
	}

	.info {
		font-size: 0.75rem;
		color: #666;
		text-align: center;
		padding-top: 0.5rem;
		border-top: 1px solid #2a2a2a;
	}
</style>
