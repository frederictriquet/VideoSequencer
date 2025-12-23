<script lang="ts">
	import { onMount } from 'svelte';
	import { sequencerState, sequencerActions } from '$lib/stores/sequencer';
	import Timeline from './Timeline.svelte';
	import VideoGrid from './VideoGrid.svelte';
	import TransportControls from './TransportControls.svelte';
	import InstrumentPanel from './InstrumentPanel.svelte';
	import GridSizeControl from './GridSizeControl.svelte';

	let fileInput: HTMLInputElement;
	let jsonFileInput: HTMLInputElement;
	let instrumentName = '';
	let showVideoGrid = true;
	let showTimeline = true;

	async function loadClipsFromFolder() {
		try {
			const response = await fetch('/api/clips');
			const data = await response.json();

			if (data.files && data.files.length > 0) {
				// Charger chaque fichier vidéo
				for (const filename of data.files) {
					// Extraire le nom de l'instrument du nom de fichier (sans extension)
					const name = filename.replace(/\.[^/.]+$/, '');
					const videoUrl = `/api/clips/${filename}`;

					// Ajouter l'instrument
					sequencerActions.addInstrument(name, null, videoUrl);
				}

				alert(`${data.files.length} clips chargés depuis ./clips`);
			} else {
				alert('Aucun clip trouvé dans le répertoire ./clips');
			}
		} catch (err) {
			console.error('Erreur lors du chargement des clips:', err);
			alert('Impossible de charger les clips depuis ./clips');
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file && file.type.startsWith('video/')) {
			// Use the provided name, or fallback to filename without extension
			const name = instrumentName.trim() || file.name.replace(/\.[^/.]+$/, '');
			sequencerActions.addInstrument(name, file);
			instrumentName = '';
			target.value = '';
		} else {
			alert('Veuillez sélectionner un fichier vidéo valide');
		}
	}

	function triggerFileInput() {
		fileInput?.click();
	}

	function exportProject() {
		sequencerActions.exportToJSON($sequencerState);
	}

	async function renderVideo() {
		// Vérifier qu'il y a des clips
		if ($sequencerState.clips.length === 0) {
			alert('Aucun clip à rendre. Ajoutez des clips sur la timeline avant de générer le rendu.');
			return;
		}

		// Rendu via API
		const button = document.querySelector('.render-btn') as HTMLButtonElement;
		if (button) {
			button.disabled = true;
			button.textContent = '⏳ Rendu en cours...';
		}

		const success = await sequencerActions.renderVideoAPI($sequencerState);

		if (button) {
			button.disabled = false;
			button.textContent = '🎬 Rendu Vidéo';
		}

		if (success) {
			alert('✅ Vidéo téléchargée avec succès !');
		} else {
			alert(
				'❌ Erreur lors du rendu. Vérifiez que le service Docker est lancé:\ndocker-compose -f docker-compose.dev.yml up -d'
			);
		}
	}

	function triggerJsonFileInput() {
		jsonFileInput?.click();
	}

	async function handleJsonFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file && file.type === 'application/json') {
			try {
				const text = await file.text();
				const jsonData = JSON.parse(text);

				console.log('📤 Import JSON:', jsonData);
				const success = await sequencerActions.importFromJSON(jsonData);

				if (success) {
					console.log('✅ État après import:', $sequencerState);
					alert(
						`Projet chargé : ${jsonData.instruments.length} instruments, ${jsonData.clips.length} clips`
					);
				} else {
					alert('Erreur lors du chargement du projet');
				}
			} catch (err) {
				alert('Fichier JSON invalide');
				console.error('Erreur parsing JSON:', err);
			}
			target.value = '';
		} else {
			alert('Veuillez sélectionner un fichier JSON');
		}
	}

	// Version et build info (injectés par Vite au build)
	const appVersion = import.meta.env.VITE_APP_VERSION;
	const buildTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP;

	// Debug info
	$: debugInfo = {
		isPlaying: $sequencerState.isPlaying,
		currentTime: $sequencerState.currentTime.toFixed(2),
		clips: $sequencerState.clips.length,
		instruments: $sequencerState.instruments.length,
		version: appVersion,
		build: buildTimestamp
	};
</script>

<div class="video-sequencer">
	<header class="header">
		<h1>VideoSequencer - Séquenceur Vidéo</h1>
		<div class="add-instrument">
			<input
				type="text"
				bind:value={instrumentName}
				placeholder="Nom de l'instrument (optionnel)"
				class="instrument-name-input"
			/>
			<button onclick={triggerFileInput} class="add-btn"> + Ajouter Vidéo </button>
			<button onclick={loadClipsFromFolder} class="load-btn" title="Charger depuis ./clips">
				📁 Charger Clips
			</button>
			<button onclick={triggerJsonFileInput} class="import-btn" title="Importer un projet JSON">
				📤 Import JSON
			</button>
			<button onclick={exportProject} class="export-btn" title="Exporter le projet">
				📥 Export JSON
			</button>
			<button onclick={renderVideo} class="render-btn" title="Générer le rendu vidéo">
				🎬 Rendu Vidéo
			</button>
			<button
				onclick={() => (showVideoGrid = !showVideoGrid)}
				class="toggle-grid-btn"
				title={showVideoGrid ? 'Masquer la grille vidéo' : 'Afficher la grille vidéo'}
			>
				{showVideoGrid ? '🔼 Masquer Grille' : '🔽 Afficher Grille'}
			</button>
			<button
				onclick={() => (showTimeline = !showTimeline)}
				class="toggle-timeline-btn"
				title={showTimeline ? 'Masquer la timeline' : 'Afficher la timeline'}
			>
				{showTimeline ? '🔽 Masquer Timeline' : '🔼 Afficher Timeline'}
			</button>
			<input
				type="file"
				accept="video/*"
				bind:this={fileInput}
				onchange={handleFileSelect}
				style="display: none;"
			/>
			<input
				type="file"
				accept="application/json,.json"
				bind:this={jsonFileInput}
				onchange={handleJsonFileSelect}
				style="display: none;"
			/>
		</div>
	</header>

	<div class="main-content">
		<div class="left-panel">
			<GridSizeControl />
			<InstrumentPanel />
		</div>

		<div
			class="center-panel"
			class:grid-hidden={!showVideoGrid}
			class:timeline-hidden={!showTimeline}
		>
			<div class="content-area">
				<div class="grid-wrapper" class:hidden={!showVideoGrid}>
					<VideoGrid />
				</div>
				<div class="timeline-wrapper" class:hidden={!showTimeline}>
					<Timeline />
				</div>
			</div>

			<TransportControls />

			<!-- Debug Panel -->
			<div class="debug-panel">
				<span>🎵 Playing: {debugInfo.isPlaying ? 'YES' : 'NO'}</span>
				<span>⏱️ Time: {debugInfo.currentTime}</span>
				<span>🎬 Clips: {debugInfo.clips}</span>
				<span>🎸 Instruments: {debugInfo.instruments}</span>
				<span>📦 v{debugInfo.version}</span>
				<span>🔨 Build: {debugInfo.build}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.video-sequencer {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: #1a1a1a;
		color: #ffffff;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.header {
		padding: 1rem 2rem;
		background: #252525;
		border-bottom: 2px solid #333;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.add-instrument {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.instrument-name-input {
		padding: 0.5rem 1rem;
		background: #2a2a2a;
		border: 1px solid #444;
		border-radius: 4px;
		color: #ffffff;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.instrument-name-input:focus {
		border-color: #667eea;
	}

	.instrument-name-input::placeholder {
		color: #666;
	}

	.add-btn {
		padding: 0.5rem 1.5rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border: none;
		border-radius: 4px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		font-size: 0.9rem;
	}

	.add-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.add-btn:active {
		transform: translateY(0);
	}

	.export-btn {
		padding: 0.5rem 1.5rem;
		background: #2a2a2a;
		border: 1px solid #444;
		border-radius: 4px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
	}

	.export-btn:hover {
		background: #333;
		border-color: #555;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.export-btn:active {
		transform: translateY(0);
	}

	.load-btn {
		padding: 0.5rem 1.5rem;
		background: #2a2a2a;
		border: 1px solid #444;
		border-radius: 4px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
	}

	.load-btn:hover {
		background: #333;
		border-color: #667eea;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
	}

	.load-btn:active {
		transform: translateY(0);
	}

	.import-btn {
		padding: 0.5rem 1.5rem;
		background: #2a2a2a;
		border: 1px solid #444;
		border-radius: 4px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
	}

	.import-btn:hover {
		background: #333;
		border-color: #45b7d1;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(69, 183, 209, 0.3);
	}

	.import-btn:active {
		transform: translateY(0);
	}

	.render-btn {
		padding: 0.5rem 1.5rem;
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
		border: none;
		border-radius: 4px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
	}

	.render-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
	}

	.render-btn:active {
		transform: translateY(0);
	}

	.toggle-grid-btn {
		padding: 0.5rem 1.5rem;
		background: #2a2a2a;
		border: 1px solid #444;
		border-radius: 4px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
	}

	.toggle-grid-btn:hover {
		background: #333;
		border-color: #667eea;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
	}

	.toggle-grid-btn:active {
		transform: translateY(0);
	}

	.toggle-timeline-btn {
		padding: 0.5rem 1.5rem;
		background: #2a2a2a;
		border: 1px solid #444;
		border-radius: 4px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
	}

	.toggle-timeline-btn:hover {
		background: #333;
		border-color: #667eea;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
	}

	.toggle-timeline-btn:active {
		transform: translateY(0);
	}

	.main-content {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.left-panel {
		width: 250px;
		background: #202020;
		border-right: 2px solid #333;
		overflow-y: auto;
	}

	.center-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.content-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 0;
	}

	.grid-wrapper,
	.timeline-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 0;
	}

	.grid-wrapper.hidden,
	.timeline-wrapper.hidden {
		position: absolute;
		left: -9999px;
		visibility: hidden;
		flex: 0;
		min-height: 0;
		height: 0;
	}

	.debug-panel {
		background: #2a2a2a;
		border-top: 1px solid #444;
		padding: 0.5rem 1rem;
		display: flex;
		gap: 1.5rem;
		font-size: 0.85rem;
		color: #aaa;
		font-family: 'Courier New', monospace;
	}

	.debug-panel span {
		white-space: nowrap;
	}
</style>
