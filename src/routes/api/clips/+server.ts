import { json } from '@sveltejs/kit';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
	try {
		const clipsDir = join(process.cwd(), 'clips');
		const files = await readdir(clipsDir);

		// Filtrer uniquement les fichiers vidéo
		const videoFiles = files.filter(file =>
			file.endsWith('.mp4') ||
			file.endsWith('.webm') ||
			file.endsWith('.mov') ||
			file.endsWith('.avi')
		);

		return json({ files: videoFiles });
	} catch (error) {
		return json({ files: [] });
	}
}
