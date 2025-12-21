import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Récupérer le FormData
		const formData = await request.formData();

		// URL du service de rendu (en dev: localhost, en prod: nom du service Docker)
		const renderServiceUrl = process.env.RENDER_SERVICE_URL || 'http://localhost:8000';

		// Transférer le FormData tel quel au service de rendu
		const response = await fetch(`${renderServiceUrl}/render`, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw error(response.status, `Erreur de rendu: ${errorText}`);
		}

		// Récupérer le fichier vidéo
		const videoBlob = await response.blob();

		// Retourner le fichier
		return new Response(videoBlob, {
			headers: {
				'Content-Type': 'video/mp4',
				'Content-Disposition': `attachment; filename="render_${Date.now()}.mp4"`
			}
		});
	} catch (err) {
		console.error('Erreur API render:', err);
		throw error(500, 'Erreur lors du rendu vidéo');
	}
};
