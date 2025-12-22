import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

// Lire la version depuis package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;
const buildTimestamp = new Date().toISOString();

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
		'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp)
	}
});
