export interface VideoInstrument {
	id: string;
	name: string;
	videoFile: File | null;
	videoUrl: string | null;
	color: string;
	gridPosition: number; // Position dans la grille d'affichage (0-8 pour une grille 3x3)
}

export interface VideoClip {
	id: string;
	instrumentId: string;
	startTime: number; // En beats
	duration: number; // En beats (durée de la vidéo)
	trackIndex: number;
}

export interface SequencerState {
	instruments: VideoInstrument[];
	clips: VideoClip[];
	isPlaying: boolean;
	currentTime: number; // En beats
	bpm: number;
	totalBeats: number;
	gridSize: { rows: number; cols: number };
	loopMode: boolean;
}

export interface PlaybackState {
	currentBeat: number;
	activeClips: Set<string>; // IDs des clips en cours de lecture
}
