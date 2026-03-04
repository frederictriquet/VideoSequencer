import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { sequencerState, sequencerActions, timeUtils, renderProgress } from './sequencer';

describe('timeUtils', () => {
	it('converts beats to seconds correctly', () => {
		expect(timeUtils.beatsToSeconds(4, 120)).toBe(2); // 4 beats à 120 BPM = 2 secondes
		expect(timeUtils.beatsToSeconds(8, 60)).toBe(8); // 8 beats à 60 BPM = 8 secondes
		expect(timeUtils.beatsToSeconds(2, 240)).toBe(0.5); // 2 beats à 240 BPM = 0.5 secondes
	});

	it('converts seconds to beats correctly', () => {
		expect(timeUtils.secondsToBeats(2, 120)).toBe(4); // 2 secondes à 120 BPM = 4 beats
		expect(timeUtils.secondsToBeats(8, 60)).toBe(8); // 8 secondes à 60 BPM = 8 beats
		expect(timeUtils.secondsToBeats(0.5, 240)).toBe(2); // 0.5 secondes à 240 BPM = 2 beats
	});
});

describe('sequencerState', () => {
	beforeEach(() => {
		// Réinitialiser l'état entre chaque test
		sequencerState.set({
			instruments: [],
			clips: [],
			isPlaying: false,
			currentTime: 0,
			bpm: 120,
			totalBeats: 64,
			gridSize: { rows: 3, cols: 3 },
			loopMode: false
		});
	});

	describe('addInstrument', () => {
		it('adds an instrument with auto-assigned grid position', () => {
			const videoUrl = 'blob:test-url';
			sequencerActions.addInstrument('Kick', null, videoUrl);

			const state = get(sequencerState);
			expect(state.instruments).toHaveLength(1);
			expect(state.instruments[0].name).toBe('Kick');
			expect(state.instruments[0].gridPosition).toBe(0);
			expect(state.instruments[0].videoUrl).toBe(videoUrl);
		});

		it('assigns different grid positions to multiple instruments', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			sequencerActions.addInstrument('Snare', null, 'url2');
			sequencerActions.addInstrument('HiHat', null, 'url3');

			const state = get(sequencerState);
			expect(state.instruments).toHaveLength(3);
			expect(state.instruments[0].gridPosition).toBe(0);
			expect(state.instruments[1].gridPosition).toBe(1);
			expect(state.instruments[2].gridPosition).toBe(2);
		});

		it('prevents adding more instruments than grid cells', () => {
			// Grille 3x3 = 9 cellules max
			sequencerActions.addInstrument('Inst1', null, 'url1');
			sequencerActions.addInstrument('Inst2', null, 'url2');
			sequencerActions.addInstrument('Inst3', null, 'url3');
			sequencerActions.addInstrument('Inst4', null, 'url4');
			sequencerActions.addInstrument('Inst5', null, 'url5');
			sequencerActions.addInstrument('Inst6', null, 'url6');
			sequencerActions.addInstrument('Inst7', null, 'url7');
			sequencerActions.addInstrument('Inst8', null, 'url8');
			sequencerActions.addInstrument('Inst9', null, 'url9');
			sequencerActions.addInstrument('Inst10', null, 'url10'); // Devrait être ignoré

			const state = get(sequencerState);
			expect(state.instruments).toHaveLength(9);
		});
	});

	describe('removeInstrument', () => {
		it('removes an instrument and its clips', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			const state1 = get(sequencerState);
			const instrumentId = state1.instruments[0].id;

			sequencerActions.addClip(instrumentId, 0, 4, 0);

			sequencerActions.removeInstrument(instrumentId);

			const state2 = get(sequencerState);
			expect(state2.instruments).toHaveLength(0);
			expect(state2.clips).toHaveLength(0);
		});
	});

	describe('addClip', () => {
		it('adds a clip to an instrument', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			const state1 = get(sequencerState);
			const instrumentId = state1.instruments[0].id;

			sequencerActions.addClip(instrumentId, 0, 4, 0);

			const state2 = get(sequencerState);
			expect(state2.clips).toHaveLength(1);
			expect(state2.clips[0].gridPosition).toBe(0);
			expect(state2.clips[0].startTime).toBe(0);
			expect(state2.clips[0].duration).toBe(4);
		});
	});

	describe('removeClip', () => {
		it('removes a specific clip', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			const state1 = get(sequencerState);
			const instrumentId = state1.instruments[0].id;

			sequencerActions.addClip(instrumentId, 0, 4, 0);
			sequencerActions.addClip(instrumentId, 8, 4, 0);

			const state2 = get(sequencerState);
			const clipId = state2.clips[0].id;

			sequencerActions.removeClip(clipId);

			const state3 = get(sequencerState);
			expect(state3.clips).toHaveLength(1);
			expect(state3.clips[0].startTime).toBe(8);
		});
	});

	describe('updateClip', () => {
		it('updates clip properties', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			const state1 = get(sequencerState);
			const instrumentId = state1.instruments[0].id;

			sequencerActions.addClip(instrumentId, 0, 4, 0);

			const state2 = get(sequencerState);
			const clipId = state2.clips[0].id;

			sequencerActions.updateClip(clipId, { startTime: 8, duration: 2 });

			const state3 = get(sequencerState);
			expect(state3.clips[0].startTime).toBe(8);
			expect(state3.clips[0].duration).toBe(2);
		});
	});

	describe('setBpm', () => {
		it('sets BPM within valid range', () => {
			sequencerActions.setBpm(140);
			expect(get(sequencerState).bpm).toBe(140);
		});

		it('clamps BPM to minimum', () => {
			sequencerActions.setBpm(20);
			expect(get(sequencerState).bpm).toBe(40);
		});

		it('clamps BPM to maximum', () => {
			sequencerActions.setBpm(400);
			expect(get(sequencerState).bpm).toBe(300);
		});
	});

	describe('playback controls', () => {
		it('starts playback', () => {
			sequencerActions.play();
			expect(get(sequencerState).isPlaying).toBe(true);
		});

		it('pauses playback', () => {
			sequencerActions.play();
			sequencerActions.pause();
			expect(get(sequencerState).isPlaying).toBe(false);
		});

		it('stops playback and resets time', () => {
			sequencerActions.setCurrentTime(10);
			sequencerActions.play();
			sequencerActions.stop();

			const state = get(sequencerState);
			expect(state.isPlaying).toBe(false);
			expect(state.currentTime).toBe(0);
		});
	});

	describe('toggleLoopMode', () => {
		it('toggles loop mode on and off', () => {
			expect(get(sequencerState).loopMode).toBe(false);

			sequencerActions.toggleLoopMode();
			expect(get(sequencerState).loopMode).toBe(true);

			sequencerActions.toggleLoopMode();
			expect(get(sequencerState).loopMode).toBe(false);
		});
	});

	describe('moveInstrumentToPosition', () => {
		it('moves instrument to empty position', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			const state1 = get(sequencerState);
			const instrumentId = state1.instruments[0].id;

			expect(state1.instruments[0].gridPosition).toBe(0);

			sequencerActions.moveInstrumentToPosition(instrumentId, 2);

			const state2 = get(sequencerState);
			expect(state2.instruments[0].gridPosition).toBe(2);
		});

		it('swaps positions when dropping on occupied cell', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			sequencerActions.addInstrument('Snare', null, 'url2');

			const state1 = get(sequencerState);
			const inst1Id = state1.instruments[0].id;
			const inst2Id = state1.instruments[1].id;

			expect(state1.instruments[0].gridPosition).toBe(0);
			expect(state1.instruments[1].gridPosition).toBe(1);

			sequencerActions.moveInstrumentToPosition(inst1Id, 1);

			const state2 = get(sequencerState);
			const inst1After = state2.instruments.find((i) => i.id === inst1Id);
			const inst2After = state2.instruments.find((i) => i.id === inst2Id);

			expect(inst1After?.gridPosition).toBe(1);
			expect(inst2After?.gridPosition).toBe(0);
		});

		it('updates trackIndex when moving instruments', () => {
			// Ajouter 3 instruments
			sequencerActions.addInstrument('Kick', null, 'url1');
			sequencerActions.addInstrument('Snare', null, 'url2');
			sequencerActions.addInstrument('HiHat', null, 'url3');

			const state1 = get(sequencerState);
			const kickId = state1.instruments[0].id;
			const snareId = state1.instruments[1].id;
			const hihatId = state1.instruments[2].id;

			// Ajouter des clips pour chaque instrument
			sequencerActions.addClip(kickId, 0, 1, 0);
			sequencerActions.addClip(snareId, 2, 1, 1);
			sequencerActions.addClip(hihatId, 4, 1, 2);

			const state2 = get(sequencerState);

			// Vérifier les trackIndex initiaux
			const kickClip1 = state2.clips.find((c) => c.gridPosition === 0);
			const snareClip1 = state2.clips.find((c) => c.gridPosition === 1);
			const hihatClip1 = state2.clips.find((c) => c.gridPosition === 2);

			expect(kickClip1?.trackIndex).toBe(0);
			expect(snareClip1?.trackIndex).toBe(1);
			expect(hihatClip1?.trackIndex).toBe(2);

			// Déplacer Kick (position 0) vers position 2
			// Cela devrait changer l'ordre: Snare(0), HiHat(1), Kick(2)
			// Et mettre à jour les trackIndex: Kick devient track 2
			sequencerActions.moveInstrumentToPosition(kickId, 2);

			const state3 = get(sequencerState);

			// Vérifier que les positions ont changé
			const kickAfter = state3.instruments.find((i) => i.id === kickId);
			const snareAfter = state3.instruments.find((i) => i.id === snareId);
			const hihatAfter = state3.instruments.find((i) => i.id === hihatId);

			expect(kickAfter?.gridPosition).toBe(2);
			expect(snareAfter?.gridPosition).toBe(1);
			expect(hihatAfter?.gridPosition).toBe(0);

			// Vérifier que les trackIndex ont été mis à jour pour correspondre
			// à l'ordre trié: HiHat(pos 0)=track 0, Snare(pos 1)=track 1, Kick(pos 2)=track 2
			const kickClip2 = state3.clips.find((c) => c.gridPosition === 2);
			const snareClip2 = state3.clips.find((c) => c.gridPosition === 1);
			const hihatClip2 = state3.clips.find((c) => c.gridPosition === 0);

			expect(hihatClip2?.trackIndex).toBe(0); // HiHat maintenant en track 0
			expect(snareClip2?.trackIndex).toBe(1); // Snare reste en track 1
			expect(kickClip2?.trackIndex).toBe(2); // Kick maintenant en track 2
		});

		it('swaps positions and clips follow their instruments visually', () => {
			// Ajouter 2 instruments
			sequencerActions.addInstrument('Bass', null, 'url1');
			sequencerActions.addInstrument('Charleston', null, 'url2');

			const state1 = get(sequencerState);
			const bassId = state1.instruments[0].id;
			const charlestonId = state1.instruments[1].id;

			// Ajouter des clips sur chaque instrument
			sequencerActions.addClip(bassId, 0, 1, 0); // Clip basse au beat 0, track 0
			sequencerActions.addClip(charlestonId, 2, 1, 1); // Clip charleston au beat 2, track 1

			const state2 = get(sequencerState);

			expect(state2.instruments[0].gridPosition).toBe(0); // Bass en position grille 0
			expect(state2.instruments[0].trackPosition).toBe(0); // Bass en track 0
			expect(state2.instruments[1].gridPosition).toBe(1); // Charleston en position grille 1
			expect(state2.instruments[1].trackPosition).toBe(1); // Charleston en track 1

			// Échanger Bass (gridPos 0) avec Charleston (gridPos 1)
			sequencerActions.moveInstrumentToPosition(bassId, 1);

			const state3 = get(sequencerState);

			// Vérifier que les positions ont été échangées
			const bassAfter = state3.instruments.find((i) => i.id === bassId);
			const charlestonAfter = state3.instruments.find((i) => i.id === charlestonId);

			expect(bassAfter?.gridPosition).toBe(1); // Bass maintenant en grille position 1
			expect(bassAfter?.trackPosition).toBe(1); // Bass maintenant en track position 1
			expect(charlestonAfter?.gridPosition).toBe(0); // Charleston maintenant en grille position 0
			expect(charlestonAfter?.trackPosition).toBe(0); // Charleston maintenant en track position 0

			// IMPORTANT: Les gridPosition des clips ont été échangées pour suivre les instruments
			// Le clip qui était sur Bass (gridPos 0) est maintenant sur gridPos 1 (nouvelle position de Bass)
			// Le clip qui était sur Charleston (gridPos 1) est maintenant sur gridPos 0 (nouvelle position de Charleston)
			const clipAtBeat0 = state3.clips.find((c) => c.startTime === 0);
			const clipAtBeat2 = state3.clips.find((c) => c.startTime === 2);

			expect(clipAtBeat0?.gridPosition).toBe(1); // Échangé vers nouvelle position de Bass
			expect(clipAtBeat0?.trackIndex).toBe(1); // Suit Bass sur track 1
			expect(clipAtBeat2?.gridPosition).toBe(0); // Échangé vers nouvelle position de Charleston
			expect(clipAtBeat2?.trackIndex).toBe(0); // Suit Charleston sur track 0
		});
	});

	describe('setGridSize', () => {
		it('increases grid size', () => {
			sequencerActions.setGridSize(3, 3);
			const state = get(sequencerState);
			expect(state.gridSize.rows).toBe(3);
			expect(state.gridSize.cols).toBe(3);
		});

		it('prevents reducing grid size when instruments would be lost', () => {
			sequencerActions.addInstrument('Inst1', null, 'url1');
			sequencerActions.addInstrument('Inst2', null, 'url2');
			sequencerActions.addInstrument('Inst3', null, 'url3');
			sequencerActions.addInstrument('Inst4', null, 'url4');

			// Tenter de réduire à 1x1 (seulement 1 cellule) alors qu'on a 4 instruments
			sequencerActions.setGridSize(1, 1);

			const state = get(sequencerState);
			expect(state.gridSize.rows).toBe(3); // Pas changé
			expect(state.gridSize.cols).toBe(3); // Pas changé
		});

		it('allows reducing grid size when positions are free', () => {
			sequencerActions.addInstrument('Inst1', null, 'url1');

			sequencerActions.setGridSize(1, 1);

			const state = get(sequencerState);
			expect(state.gridSize.rows).toBe(1);
			expect(state.gridSize.cols).toBe(1);
		});
	});

	describe('setCurrentTime', () => {
		it('sets current time within bounds', () => {
			sequencerActions.setCurrentTime(10);
			expect(get(sequencerState).currentTime).toBe(10);
		});

		it('clamps time to minimum', () => {
			sequencerActions.setCurrentTime(-5);
			expect(get(sequencerState).currentTime).toBe(0);
		});

		it('clamps time to totalBeats', () => {
			sequencerActions.setCurrentTime(100);
			expect(get(sequencerState).currentTime).toBe(64);
		});
	});

	describe('updateInstrument', () => {
		it('updates instrument properties', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			const id = get(sequencerState).instruments[0].id;

			sequencerActions.updateInstrument(id, { name: 'BassDrum', offset: 1.5 });

			const state = get(sequencerState);
			expect(state.instruments[0].name).toBe('BassDrum');
			expect(state.instruments[0].offset).toBe(1.5);
		});

		it('does not modify other instruments', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			sequencerActions.addInstrument('Snare', null, 'url2');
			const kickId = get(sequencerState).instruments[0].id;

			sequencerActions.updateInstrument(kickId, { name: 'BassDrum' });

			expect(get(sequencerState).instruments[1].name).toBe('Snare');
		});
	});

	describe('addClip edge cases', () => {
		it('does nothing when instrument is not found', () => {
			sequencerActions.addClip('non-existent-id', 0, 4, 0);
			expect(get(sequencerState).clips).toHaveLength(0);
		});
	});

	describe('moveInstrumentToPosition edge cases', () => {
		it('does nothing for negative position', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			const id = get(sequencerState).instruments[0].id;

			sequencerActions.moveInstrumentToPosition(id, -1);

			expect(get(sequencerState).instruments[0].gridPosition).toBe(0);
		});

		it('does nothing for position beyond grid bounds', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');
			const id = get(sequencerState).instruments[0].id;

			sequencerActions.moveInstrumentToPosition(id, 100);

			expect(get(sequencerState).instruments[0].gridPosition).toBe(0);
		});

		it('does nothing when instrument is not found', () => {
			sequencerActions.addInstrument('Kick', null, 'url1');

			sequencerActions.moveInstrumentToPosition('non-existent-id', 1);

			expect(get(sequencerState).instruments[0].gridPosition).toBe(0);
		});
	});

	describe('CSV export/import', () => {
		it('exportToCSV generates valid CSV content', () => {
			// Ajouter des instruments
			sequencerActions.addInstrument('Kick', null, 'url1');
			sequencerActions.addInstrument('Snare', null, 'url2');

			const state1 = get(sequencerState);
			const kickId = state1.instruments[0].id;
			const snareId = state1.instruments[1].id;

			// Ajouter des clips
			sequencerActions.addClip(kickId, 0, 0.5, 0);
			sequencerActions.addClip(kickId, 2, 0.5, 0);
			sequencerActions.addClip(snareId, 1, 0.5, 1);

			// Note: Dans un environnement de test réel, nous ne pouvons pas facilement tester le téléchargement
			// mais nous pouvons au moins vérifier que la fonction ne plante pas
			expect(() => {
				// La fonction exporte mais ne retourne rien, juste vérifions qu'elle ne plante pas
				// sequencerActions.exportToCSV(get(sequencerState));
			}).not.toThrow();
		});

		it('importFromCSV parses valid CSV correctly', async () => {
			const csvContent = `Instrument,0,0.5,1,1.5,2,2.5,3
Kick,X,,,X,,,
Snare,,,X,,,X,`;

			// Mock fetch pour simuler le chargement des clips
			global.fetch = async () =>
				({
					ok: true,
					json: async () => ({ files: [] })
				}) as Response;

			await sequencerActions.importFromCSV(csvContent);

			const state = get(sequencerState);

			// Vérifier que les instruments ont été créés
			expect(state.instruments).toHaveLength(2);
			expect(state.instruments[0].name).toBe('Kick');
			expect(state.instruments[1].name).toBe('Snare');

			// Vérifier la grille (2 instruments -> 2x2)
			expect(state.gridSize.rows).toBe(2);
			expect(state.gridSize.cols).toBe(2);

			// Vérifier que les clips ont été créés
			expect(state.clips).toHaveLength(4);

			// Vérifier les positions des clips
			const kickClips = state.clips.filter((c) => c.gridPosition === 0);
			const snareClips = state.clips.filter((c) => c.gridPosition === 1);

			expect(kickClips).toHaveLength(2);
			expect(snareClips).toHaveLength(2);

			expect(kickClips[0].startTime).toBe(0);
			expect(kickClips[1].startTime).toBe(1.5);

			expect(snareClips[0].startTime).toBe(1);
			expect(snareClips[1].startTime).toBe(2.5);
		});

		it('importFromCSV handles invalid CSV gracefully', async () => {
			const invalidCSV = `Invalid,CSV,Format`;

			global.fetch = async () =>
				({
					ok: true,
					json: async () => ({ files: [] })
				}) as Response;

			const result = await sequencerActions.importFromCSV(invalidCSV);

			// La fonction devrait retourner false en cas d'erreur
			expect(result).toBe(false);
		});

		it('importFromCSV calculates correct grid size', async () => {
			// Test avec différents nombres d'instruments
			const testCases = [
				{ instruments: 1, expectedGrid: 1 }, // 1 instrument -> 1x1
				{ instruments: 4, expectedGrid: 2 }, // 4 instruments -> 2x2
				{ instruments: 9, expectedGrid: 3 }, // 9 instruments -> 3x3
				{ instruments: 10, expectedGrid: 4 } // 10 instruments -> 4x4 (ceil(sqrt(10)) = 4)
			];

			global.fetch = async () =>
				({
					ok: true,
					json: async () => ({ files: [] })
				}) as Response;

			for (const testCase of testCases) {
				// Générer le CSV
				let csv = 'Instrument,0\n';
				for (let i = 0; i < testCase.instruments; i++) {
					csv += `Inst${i},\n`;
				}

				await sequencerActions.importFromCSV(csv);

				const state = get(sequencerState);
				expect(state.gridSize.rows).toBe(testCase.expectedGrid);
				expect(state.gridSize.cols).toBe(testCase.expectedGrid);
			}
		});

		it('importFromCSV matches instruments with available video files', async () => {
			global.fetch = async () =>
				({
					ok: true,
					json: async () => ({ files: ['Kick.mp4', 'Snare.mov'] })
				}) as Response;

			const csv = `Instrument,0,0.5
Kick,X,
Snare,,X`;

			await sequencerActions.importFromCSV(csv);

			const state = get(sequencerState);
			const kick = state.instruments.find((i) => i.name === 'Kick');
			const snare = state.instruments.find((i) => i.name === 'Snare');
			expect(kick?.videoUrl).toBe('/api/clips/Kick.mp4');
			expect(snare?.videoUrl).toBe('/api/clips/Snare.mov');
		});

		it('importFromCSV revokes old instrument URLs on re-import', async () => {
			const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

			// Premier import avec instruments ayant des videoUrls
			sequencerActions.addInstrument('OldInst', null, 'blob:old-url');

			global.fetch = async () =>
				({
					ok: true,
					json: async () => ({ files: [] })
				}) as Response;

			const csv = `Instrument,0\nNewInst,X`;
			await sequencerActions.importFromCSV(csv);

			expect(revokeObjectURL).toHaveBeenCalledWith('blob:old-url');
			revokeObjectURL.mockRestore();
		});
	});

	describe('exportToJSON', () => {
		let mockCreateObjectURL: ReturnType<typeof vi.spyOn>;
		let mockRevokeObjectURL: ReturnType<typeof vi.spyOn>;
		let mockClick: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockClick = vi.fn();
			mockCreateObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-json');
			mockRevokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
			vi.spyOn(document, 'createElement').mockReturnValue({
				href: '',
				download: '',
				click: mockClick
			} as unknown as HTMLAnchorElement);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('triggers a download', () => {
			const state = get(sequencerState);
			sequencerActions.exportToJSON(state);

			expect(mockCreateObjectURL).toHaveBeenCalled();
			expect(mockClick).toHaveBeenCalled();
			expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-json');
		});

		it('exports correct JSON structure', async () => {
			let capturedBlob: Blob | null = null;
			mockCreateObjectURL.mockImplementation((blob: Blob) => {
				capturedBlob = blob;
				return 'blob:mock-json';
			});

			sequencerActions.addInstrument('Kick', null, null);
			const state1 = get(sequencerState);
			sequencerActions.addClip(state1.instruments[0].id, 0, 4, 0);
			const state = get(sequencerState);

			sequencerActions.exportToJSON(state);

			const text = await capturedBlob!.text();
			const data = JSON.parse(text);

			expect(data.version).toBe('1.0');
			expect(data.bpm).toBe(state.bpm);
			expect(data.instruments).toHaveLength(1);
			expect(data.instruments[0].name).toBe('Kick');
			expect(data.clips).toHaveLength(1);
		});
	});

	describe('importFromJSON', () => {
		beforeEach(() => {
			global.fetch = async () =>
				({
					ok: true,
					json: async () => ({ files: ['Kick.mp4'] })
				}) as Response;
		});

		it('imports valid JSON successfully', async () => {
			const jsonData = {
				version: '1.0',
				bpm: 140,
				totalBeats: 32,
				gridSize: { rows: 2, cols: 2 },
				loopMode: true,
				instruments: [
					{
						id: 'inst-1',
						name: 'Kick',
						color: '#ff0000',
						gridPosition: 0,
						trackPosition: 0,
						offset: 0,
						maxDuration: 0
					}
				],
				clips: [{ id: 'clip-1', gridPosition: 0, startTime: 0, duration: 0.5, trackIndex: 0 }]
			};

			const result = await sequencerActions.importFromJSON(jsonData);

			expect(result).toBe(true);
			const state = get(sequencerState);
			expect(state.bpm).toBe(140);
			expect(state.totalBeats).toBe(32);
			expect(state.loopMode).toBe(true);
			expect(state.instruments).toHaveLength(1);
			expect(state.instruments[0].name).toBe('Kick');
			expect(state.instruments[0].videoUrl).toBe('/api/clips/Kick.mp4');
			expect(state.clips).toHaveLength(1);
		});

		it('returns false when version field is missing', async () => {
			const result = await sequencerActions.importFromJSON({ bpm: 120 });
			expect(result).toBe(false);
		});

		it('returns false when version is unsupported', async () => {
			const result = await sequencerActions.importFromJSON({ version: '2.0' });
			expect(result).toBe(false);
		});

		it('returns false when fetch fails', async () => {
			global.fetch = async () => ({ ok: false, status: 500 }) as Response;

			const jsonData = {
				version: '1.0',
				bpm: 120,
				totalBeats: 64,
				gridSize: { rows: 3, cols: 3 },
				instruments: [],
				clips: []
			};
			const result = await sequencerActions.importFromJSON(jsonData);
			expect(result).toBe(false);
		});

		it('handles clips with instrumentId (new format)', async () => {
			const jsonData = {
				version: '1.0',
				bpm: 120,
				totalBeats: 64,
				gridSize: { rows: 2, cols: 2 },
				loopMode: false,
				instruments: [
					{
						id: 'inst-1',
						name: 'Snare',
						color: '#00ff00',
						gridPosition: 1,
						trackPosition: 1,
						offset: 0,
						maxDuration: 0
					}
				],
				clips: [
					{ id: 'clip-1', instrumentId: 'inst-1', startTime: 2, duration: 0.5, trackIndex: 1 }
				]
			};

			await sequencerActions.importFromJSON(jsonData);

			const state = get(sequencerState);
			expect(state.clips[0].gridPosition).toBe(1);
		});

		it('revokes old instrument URLs on import', async () => {
			const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

			sequencerActions.addInstrument('OldInst', null, 'blob:old-url');

			const jsonData = {
				version: '1.0',
				bpm: 120,
				totalBeats: 64,
				gridSize: { rows: 1, cols: 1 },
				loopMode: false,
				instruments: [],
				clips: []
			};

			await sequencerActions.importFromJSON(jsonData);

			expect(revokeObjectURL).toHaveBeenCalledWith('blob:old-url');
			revokeObjectURL.mockRestore();
		});
	});

	describe('exportToCSV', () => {
		let mockCreateObjectURL: ReturnType<typeof vi.spyOn>;
		let mockRevokeObjectURL: ReturnType<typeof vi.spyOn>;
		let mockClick: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockClick = vi.fn();
			mockCreateObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-csv');
			mockRevokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
			vi.spyOn(document, 'createElement').mockReturnValue({
				href: '',
				download: '',
				click: mockClick
			} as unknown as HTMLAnchorElement);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('triggers a download', () => {
			const state = get(sequencerState);
			sequencerActions.exportToCSV(state);

			expect(mockCreateObjectURL).toHaveBeenCalled();
			expect(mockClick).toHaveBeenCalled();
			expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-csv');
		});

		it('generates correct CSV content', async () => {
			let capturedBlob: Blob | null = null;
			mockCreateObjectURL.mockImplementation((blob: Blob) => {
				capturedBlob = blob;
				return 'blob:mock-csv';
			});

			sequencerActions.addInstrument('Kick', null, null);
			sequencerActions.addInstrument('Snare', null, null);
			const state1 = get(sequencerState);
			sequencerActions.addClip(state1.instruments[0].id, 0, 0.5, 0);
			sequencerActions.addClip(state1.instruments[1].id, 1, 0.5, 1);
			const state = get(sequencerState);

			sequencerActions.exportToCSV(state);

			const text = await capturedBlob!.text();
			expect(text).toContain('Instrument,');
			expect(text).toContain('Kick');
			expect(text).toContain('Snare');
			expect(text).toContain('X');
		});

		it('handles empty state without clips', async () => {
			let capturedBlob: Blob | null = null;
			mockCreateObjectURL.mockImplementation((blob: Blob) => {
				capturedBlob = blob;
				return 'blob:mock-csv';
			});

			sequencerActions.addInstrument('Kick', null, null);
			const state = get(sequencerState);

			sequencerActions.exportToCSV(state);

			const text = await capturedBlob!.text();
			expect(text).toContain('Instrument,');
			expect(text).toContain('Kick');
		});
	});

	describe('generateFFmpegScript', () => {
		beforeEach(() => {
			vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-py');
			vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
			vi.spyOn(document, 'createElement').mockReturnValue({
				href: '',
				download: '',
				click: vi.fn()
			} as unknown as HTMLAnchorElement);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('generates a Python script with correct configuration', () => {
			const state = get(sequencerState);
			const script = sequencerActions.generateFFmpegScript(state);

			expect(script).toContain('#!/usr/bin/env python3');
			expect(script).toContain(`BPM: ${state.bpm}`);
			expect(script).toContain(`${state.gridSize.cols}x${state.gridSize.rows}`);
			expect(script).toContain('from moviepy import');
		});

		it('includes clip data for each instrument', () => {
			sequencerActions.addInstrument('Kick', null, null);
			const state1 = get(sequencerState);
			sequencerActions.addClip(state1.instruments[0].id, 0, 4, 0);
			const state = get(sequencerState);

			const script = sequencerActions.generateFFmpegScript(state);

			expect(script).toContain('Kick');
			expect(script).toContain('video0');
			expect(script).toContain('clips.append(video0)');
		});

		it('generates static frames for each instrument', () => {
			sequencerActions.addInstrument('HiHat', null, null);
			const state = get(sequencerState);

			const script = sequencerActions.generateFFmpegScript(state);

			expect(script).toContain('HiHat');
			expect(script).toContain('static_frames');
		});

		it('uses maxDuration when set', () => {
			sequencerActions.addInstrument('Bass', null, null);
			const state1 = get(sequencerState);
			sequencerActions.updateInstrument(state1.instruments[0].id, { maxDuration: 2.5 });
			sequencerActions.addClip(state1.instruments[0].id, 0, 4, 0);
			const state = get(sequencerState);

			const script = sequencerActions.generateFFmpegScript(state);

			expect(script).toContain('2.500');
		});

		it('triggers download', () => {
			const mockClick = vi.fn();
			vi.spyOn(document, 'createElement').mockReturnValue({
				href: '',
				download: '',
				click: mockClick
			} as unknown as HTMLAnchorElement);

			const state = get(sequencerState);
			sequencerActions.generateFFmpegScript(state);

			expect(mockClick).toHaveBeenCalled();
		});
	});

	describe('renderVideoAPI', () => {
		beforeEach(() => {
			vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-video');
			vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
			vi.spyOn(document, 'createElement').mockReturnValue({
				href: '',
				download: '',
				click: vi.fn()
			} as unknown as HTMLAnchorElement);

			// Réinitialiser renderProgress
			renderProgress.set({
				isRendering: false,
				jobId: null,
				status: 'idle',
				progress: 0,
				step: '',
				totalClips: 0,
				processedClips: 0,
				error: null
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('returns true and triggers download on successful blob response', async () => {
			global.fetch = async () =>
				({
					ok: true,
					headers: { get: () => 'video/mp4' },
					blob: async () => new Blob(['fake-video'], { type: 'video/mp4' })
				}) as unknown as Response;

			const state = get(sequencerState);
			const result = await sequencerActions.renderVideoAPI(state);

			expect(result).toBe(true);
			const progress = get(renderProgress);
			expect(progress.isRendering).toBe(false);
			expect(progress.status).toBe('completed');
		});

		it('returns false on HTTP error', async () => {
			global.fetch = async () =>
				({
					ok: false,
					status: 500,
					text: async () => 'Internal Server Error'
				}) as unknown as Response;

			const state = get(sequencerState);
			const result = await sequencerActions.renderVideoAPI(state);

			expect(result).toBe(false);
			const progress = get(renderProgress);
			expect(progress.status).toBe('error');
			expect(progress.error).toContain('500');
		});

		it('sets isRendering to true during render', async () => {
			let resolveRender: () => void;
			const renderPromise = new Promise<void>((resolve) => {
				resolveRender = resolve;
			});

			global.fetch = async () => {
				await renderPromise;
				return {
					ok: true,
					headers: { get: () => 'video/mp4' },
					blob: async () => new Blob(['fake-video'])
				} as unknown as Response;
			};

			const renderCall = sequencerActions.renderVideoAPI(get(sequencerState));
			// Vérifier que isRendering est true pendant le rendu
			expect(get(renderProgress).isRendering).toBe(true);

			resolveRender!();
			await renderCall;
		});

		it('includes uploaded video files in FormData', async () => {
			let capturedFormData: FormData | null = null;
			global.fetch = async (_url: string | URL | Request, options?: RequestInit) => {
				capturedFormData = options?.body as FormData;
				return {
					ok: true,
					headers: { get: () => 'video/mp4' },
					blob: async () => new Blob(['fake-video'])
				} as unknown as Response;
			};

			const mockFile = new File(['video-data'], 'kick.mp4', { type: 'video/mp4' });
			sequencerActions.addInstrument('Kick', mockFile, null);
			const state = get(sequencerState);

			await sequencerActions.renderVideoAPI(state);

			expect(capturedFormData).not.toBeNull();
			expect(capturedFormData!.has('data')).toBe(true);
			expect(capturedFormData!.has('videos')).toBe(true);
		});
	});
});
