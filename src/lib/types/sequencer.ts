export interface VideoInstrument {
	id: string;
	name: string;
	videoFile: File | null;
	videoUrl: string | null;
	color: string;
	gridPosition: number; // Position dans la grille d'affichage vidéo (0-8 pour une grille 3x3)
	trackPosition: number; // Position dans la timeline (ordre des tracks, indépendant de gridPosition)
	offset: number; // Offset de départ dans la vidéo (en secondes)
	maxDuration: number; // Durée maximale utilisable de la vidéo (en secondes, 0 = pas de limite)
}

export interface VideoClip {
	id: string;
	gridPosition: number; // Position de grille de la vidéo à jouer (fixe, ne change pas lors du drag&drop)
	startTime: number; // En beats
	duration: number; // En beats (durée de la vidéo)
	trackIndex: number; // Index de la track dans la timeline (calculé dynamiquement)
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
