import type { RequestHandler } from './$types';

const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || 'http://localhost:8000';

export const GET: RequestHandler = async ({ params }) => {
	const { job_id } = params;

	try {
		const response = await fetch(`${RENDER_SERVICE_URL}/render/status/${job_id}`);

		if (!response.ok) {
			return new Response(JSON.stringify({ error: 'Job not found' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = await response.json();
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error fetching render status:', error);
		return new Response(JSON.stringify({ error: 'Service unavailable' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
