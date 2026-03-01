import type { RequestHandler } from './$types';

const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || 'http://localhost:8000';

export const GET: RequestHandler = async ({ params }) => {
	const { job_id } = params;

	try {
		const response = await fetch(`${RENDER_SERVICE_URL}/render/download/${job_id}`);

		if (!response.ok) {
			const errorText = await response.text();
			return new Response(errorText, {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Récupérer le blob vidéo
		const blob = await response.blob();

		return new Response(blob, {
			headers: {
				'Content-Type': 'video/mp4',
				'Content-Disposition': `attachment; filename="render_${job_id}.mp4"`
			}
		});
	} catch (error) {
		console.error('Error downloading render:', error);
		return new Response(JSON.stringify({ error: 'Service unavailable' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
