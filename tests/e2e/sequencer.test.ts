import { test, expect } from '@playwright/test';

test.describe('VideoSequencer - Video Sequencer', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('displays main interface elements', async ({ page }) => {
		// Vérifier le titre
		await expect(page.getByRole('heading', { name: /VideoSequencer/i })).toBeVisible();

		// Vérifier les boutons principaux par leur texte
		await expect(page.getByText('+ Ajouter Vidéo')).toBeVisible();
		await expect(page.getByText('📁 Charger Clips')).toBeVisible();
		await expect(page.getByText('📤 Import JSON')).toBeVisible();
		await expect(page.getByText('📥 Export JSON')).toBeVisible();
		await expect(page.getByText('🎬 Rendu Vidéo')).toBeVisible();
	});

	test('shows empty state when no instruments', async ({ page }) => {
		await expect(page.getByText('Aucun instrument')).toBeVisible();
	});

	test('displays grid size controls', async ({ page }) => {
		await expect(page.getByText('Taille de la grille')).toBeVisible();
		await expect(page.getByText('Lignes:')).toBeVisible();
		await expect(page.getByText('Colonnes:')).toBeVisible();
	});

	test('displays transport controls', async ({ page }) => {
		// Vérifier les boutons de transport
		await expect(page.getByTitle(/Play|Pause/i)).toBeVisible();
		await expect(page.getByTitle('Stop')).toBeVisible();
		await expect(page.getByTitle(/Loop/i)).toBeVisible();
	});

	test('displays BPM control', async ({ page }) => {
		const bpmInput = page.locator('.bpm-input');
		await expect(bpmInput).toBeVisible();
		await expect(bpmInput).toHaveValue('120');
	});

	test('shows debug panel with metrics', async ({ page }) => {
		await expect(page.getByText(/Playing:/i)).toBeVisible();
		await expect(page.getByText(/Time:/i)).toBeVisible();
		await expect(page.getByText(/Clips:/i)).toBeVisible();
		await expect(page.getByText(/Instruments:/i)).toBeVisible();
	});

	test('can increase grid rows', async ({ page }) => {
		// Trouver les boutons - et + pour les lignes
		const decreaseRowsBtn = page.locator('.control-buttons').first().locator('button').first();
		const increaseRowsBtn = page.locator('.control-buttons').first().locator('button').last();

		// Vérifier la valeur initiale (3×3)
		await expect(page.getByText('Grille: 3×3')).toBeVisible();

		// Diminuer puis augmenter pour tester
		await decreaseRowsBtn.click();
		await expect(page.getByText('Grille: 3×2')).toBeVisible();

		await increaseRowsBtn.click();
		await expect(page.getByText('Grille: 3×3')).toBeVisible();
	});

	test('can increase grid columns', async ({ page }) => {
		// Trouver les boutons - et + pour les colonnes
		const decreaseColsBtn = page.locator('.control-buttons').nth(1).locator('button').first();
		const increaseColsBtn = page.locator('.control-buttons').nth(1).locator('button').last();

		// Vérifier la valeur initiale (3×3)
		await expect(page.getByText('Grille: 3×3')).toBeVisible();

		// Diminuer puis augmenter pour tester
		await decreaseColsBtn.click();
		await expect(page.getByText('Grille: 2×3')).toBeVisible();

		await increaseColsBtn.click();
		await expect(page.getByText('Grille: 3×3')).toBeVisible();
	});

	test('displays video grid with correct number of cells', async ({ page }) => {
		// Grille 3x3 = 9 cellules (défaut)
		const cells = page.locator('.grid-cell');
		await expect(cells).toHaveCount(9);
	});

	test('can toggle loop mode', async ({ page }) => {
		const loopBtn = page.getByTitle(/Loop/i);

		// Vérifier l'état initial (OFF)
		await expect(loopBtn).not.toHaveClass(/active/);

		// Activer
		await loopBtn.click();
		await expect(loopBtn).toHaveClass(/active/);

		// Désactiver
		await loopBtn.click();
		await expect(loopBtn).not.toHaveClass(/active/);
	});

	test('play/pause button toggles', async ({ page }) => {
		const playBtn = page.getByTitle(/Play/i);

		// Cliquer pour lancer
		await playBtn.click();

		// Le bouton devrait maintenant être "Pause"
		await expect(page.getByTitle('Pause')).toBeVisible();

		// Vérifier que le statut Playing est à YES
		await expect(page.getByText(/Playing: YES/i)).toBeVisible();
	});

	test('stop button resets time', async ({ page }) => {
		const playBtn = page.getByTitle(/Play/i);
		const stopBtn = page.getByTitle('Stop');

		// Lancer la lecture
		await playBtn.click();

		// Attendre un peu
		await page.waitForTimeout(500);

		// Arrêter
		await stopBtn.click();

		// Vérifier que Playing est à NO
		await expect(page.getByText(/Playing: NO/i)).toBeVisible();

		// Le temps devrait être revenu à 0
		await expect(page.getByText(/Time: 0\.00/i)).toBeVisible();
	});

	test('can change BPM value', async ({ page }) => {
		const bpmInput = page.locator('.bpm-input');

		// Vérifier la valeur initiale
		await expect(bpmInput).toHaveValue('120');

		// Changer le BPM
		await bpmInput.fill('140');
		await bpmInput.blur();

		// Vérifier que la valeur a changé
		await expect(bpmInput).toHaveValue('140');
	});

	test('timeline is rendered', async ({ page }) => {
		const canvas = page.locator('.timeline-canvas');
		await expect(canvas).toBeVisible();
	});

	test('video grid adjusts to grid size changes', async ({ page }) => {
		// Augmenter de 3×3 à 4×4
		const increaseRowsBtn = page.locator('.control-buttons').first().locator('button').last();
		const increaseColsBtn = page.locator('.control-buttons').nth(1).locator('button').last();

		await increaseRowsBtn.click();
		await increaseColsBtn.click();

		// Grille 4x4 = 16 cellules
		const cells = page.locator('.grid-cell');
		await expect(cells).toHaveCount(16);
	});
});
