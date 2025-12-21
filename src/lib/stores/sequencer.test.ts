import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { sequencerState, sequencerActions, timeUtils } from './sequencer';

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
			gridSize: { rows: 2, cols: 2 },
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
			// Grille 2x2 = 4 cellules max
			sequencerActions.addInstrument('Inst1', null, 'url1');
			sequencerActions.addInstrument('Inst2', null, 'url2');
			sequencerActions.addInstrument('Inst3', null, 'url3');
			sequencerActions.addInstrument('Inst4', null, 'url4');
			sequencerActions.addInstrument('Inst5', null, 'url5'); // Devrait être ignoré

			const state = get(sequencerState);
			expect(state.instruments).toHaveLength(4);
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
			expect(state2.clips[0].instrumentId).toBe(instrumentId);
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
			const inst1After = state2.instruments.find(i => i.id === inst1Id);
			const inst2After = state2.instruments.find(i => i.id === inst2Id);

			expect(inst1After?.gridPosition).toBe(1);
			expect(inst2After?.gridPosition).toBe(0);
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
			expect(state.gridSize.rows).toBe(2); // Pas changé
			expect(state.gridSize.cols).toBe(2); // Pas changé
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
});
