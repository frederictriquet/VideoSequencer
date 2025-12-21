import { error } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET({ params }) {
	try {
		const { filename } = params;
		const clipsDir = join(process.cwd(), 'clips');
		const filePath = join(clipsDir, filename);

		// Sécurité : empêcher l'accès en dehors du répertoire clips
		if (!filePath.startsWith(clipsDir)) {
			throw error(403, 'Forbidden');
		}

		const fileBuffer = await readFile(filePath);

		// Déterminer le type MIME
		let contentType = 'video/mp4';
		if (filename.endsWith('.webm')) contentType = 'video/webm';
		if (filename.endsWith('.mov')) contentType = 'video/quicktime';

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': contentType,
				'Accept-Ranges': 'bytes'
			}
		});
	} catch (err) {
		throw error(404, 'File not found');
	}
}
