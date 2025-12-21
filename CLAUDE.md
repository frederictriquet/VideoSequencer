# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VideoSequencer is a SvelteKit-based web application that allows users to create video compositions by arranging video clips on a beat-based timeline in a grid layout. The app features:

- Beat-based sequencing (BPM-driven)
- Grid-based video layout (configurable NxN grid)
- Timeline editing interface
- Video rendering via a separate Python service (FastAPI + MoviePy)
- Docker deployment with Traefik reverse proxy

## Technology Stack

- **Frontend**: SvelteKit 2 (Svelte 5), TypeScript, Vite
- **Backend**: SvelteKit API routes + FastAPI render service (Python)
- **Video Processing**: MoviePy (Python)
- **Testing**: Vitest (unit), Playwright (e2e), Stryker (mutation)
- **Deployment**: Docker Compose with Traefik
- **Git Hooks**: Husky + lint-staged
- **Commit Convention**: Conventional Commits (enforced by commitlint)

## Development Commands

### Build and Run

```bash
npm run dev                  # Start dev server (Vite)
npm run build               # Build for production
npm run preview             # Preview production build
```

### Testing

```bash
npm test                    # Run unit tests (Vitest)
npm run test:watch          # Run tests in watch mode
npm run test:ui             # Open Vitest UI
npm run test:coverage       # Run tests with coverage report
npm run test:e2e            # Run end-to-end tests (Playwright)
npm run test:e2e:ui         # Open Playwright UI
npm run test:e2e:debug      # Debug Playwright tests
npm run test:all            # Run all tests (unit + e2e)
npm run test:mutation       # Run mutation testing (Stryker)
npm run test:mutation:incremental  # Run incremental mutation testing
```

### Code Quality

```bash
npm run check               # Type-check with svelte-check
npm run check:watch         # Type-check in watch mode
```

### Docker

```bash
npm run docker:build        # Build Docker images
npm run docker:up           # Start containers
npm run docker:down         # Stop containers
npm run docker:logs         # View logs
npm run docker:restart      # Restart containers
```

## Architecture

### Core State Management

All application state is managed through Svelte stores in [src/lib/stores/sequencer.ts](src/lib/stores/sequencer.ts):

- **sequencerState**: Main state store containing instruments, clips, playback state, BPM, grid configuration
- **playbackState**: Real-time playback tracking (current beat, active clips)
- **sequencerActions**: All mutations to state (add/remove instruments, add/remove clips, playback controls, etc.)
- **timeUtils**: Beat/seconds conversion utilities

Key state shape (see [src/lib/types/sequencer.ts](src/lib/types/sequencer.ts)):

- **VideoInstrument**: Represents a video file with ID, name, file/URL, color, and grid position
- **VideoClip**: Instance of an instrument placed on timeline (start time, duration in beats, track index)
- **SequencerState**: Global state including instruments array, clips array, BPM, total beats, grid size, loop mode

### Multi-Service Architecture

The app consists of three services (see [docker-compose.yml](docker-compose.yml)):

1. **app** (SvelteKit): Main web application serving the UI and API routes
   - Handles video clip uploads
   - Proxies render requests to the render service
   - Serves static video files from `./clips/` directory

2. **render** (FastAPI + MoviePy): Video rendering service at [render-service/main.py](render-service/main.py)
   - Receives composition data + uploaded videos
   - Generates composite video using MoviePy
   - Returns rendered MP4 file
   - Can use videos from `./clips/` or uploaded files

3. **traefik**: Reverse proxy handling HTTPS/SSL (production only)

### API Endpoints

- **GET /api/clips**: List all video files in `./clips/` directory
- **GET /api/clips/[filename]**: Serve a specific video file
- **POST /api/render**: Proxy to render service for video composition

### Component Structure

Main UI components in [src/lib/components/](src/lib/components/):

- **VideoSequencer.svelte**: Root component orchestrating all sub-components
- **Timeline.svelte**: Beat-based timeline editor for placing clips
- **VideoGrid.svelte**: Grid display showing video instrument positions
- **TransportControls.svelte**: Playback controls (play/pause/stop, BPM)
- **InstrumentPanel.svelte**: List of loaded instruments
- **GridSizeControl.svelte**: Configure grid dimensions

### Video Rendering

Two rendering approaches:

1. **Client-side script generation**: [sequencerActions.generateFFmpegScript()](src/lib/stores/sequencer.ts:335-461)
   - Generates a standalone Python script using MoviePy
   - Downloads script for manual execution
   - Useful for offline rendering

2. **Server-side API rendering**: [sequencerActions.renderVideoAPI()](src/lib/stores/sequencer.ts:463-526)
   - Sends composition + videos to FastAPI service
   - Renders on server using MoviePy
   - Returns MP4 file for download

Both methods:

- Create a black background (1920x1080)
- Place static frames (first frame) of each instrument in grid positions
- Overlay animated clips at specified beat timestamps
- Output 30fps MP4 with H.264/AAC encoding

### Beat-Based Timing System

All timing is beat-based, not seconds-based:

- Clips positioned by **start beat** and **duration in beats**
- Conversion between beats and seconds: [timeUtils](src/lib/stores/sequencer.ts:25-32)
- BPM (beats per minute) determines playback speed
- Default: 120 BPM, 64 total beats (16 measures of 4 beats)

### Video File Handling

The app supports two video sources:

1. **Pre-loaded clips**: Videos in `./clips/` directory (accessed via API routes)
2. **User uploads**: Videos uploaded through the UI (stored as File objects)

When rendering:

- Uploaded videos are sent via FormData to render service
- Pre-loaded clips are referenced by filename (render service reads from `/app/clips/`)

## Commit Convention

This project uses **Conventional Commits** (enforced by commitlint):

**Format**: `<type>[optional scope]: <description>`

**Types**:

- `feat`: New feature (triggers MINOR version bump)
- `fix`: Bug fix (triggers PATCH version bump)
- `feat!` or `BREAKING CHANGE:`: Breaking change (triggers MAJOR version bump)
- `docs`, `style`, `refactor`, `perf`, `test`, `chore`: No version bump

**Examples**:

```
feat: add video trim functionality
fix: resolve timeline scroll overflow on mobile
feat!: migrate to beat-based timing system

BREAKING CHANGE: Clips now use beat positions instead of seconds.
```

**Guidelines**:

- Use present tense: "add feature" not "added feature"
- Don't capitalize first letter
- No period at end
- Keep under 72 characters

Pre-commit hooks will validate commit messages automatically.

## Testing Strategy

### Unit Tests (Vitest)

- Test files: `*.test.ts` or `*.spec.ts` in `src/`
- Uses happy-dom environment
- Setup file: [src/tests/setup.ts](src/tests/setup.ts)
- Focus on pure functions, utilities, and store actions

### E2E Tests (Playwright)

- Test files in [tests/e2e/](tests/e2e/)
- Runs against production build (`npm run build && npm run preview`)
- Tests full user workflows: loading clips, placing clips, playback

### Mutation Testing (Stryker)

- Configured via [stryker.config.mjs](stryker.config.mjs)
- Use `--incremental` flag for faster subsequent runs

## Development Workflow

1. **Adding a new instrument action**:
   - Add method to `sequencerActions` in [src/lib/stores/sequencer.ts](src/lib/stores/sequencer.ts)
   - Update `SequencerState` type if needed in [src/lib/types/sequencer.ts](src/lib/types/sequencer.ts)
   - Add unit tests in [src/lib/stores/sequencer.test.ts](src/lib/stores/sequencer.test.ts)

2. **Adding a new UI component**:
   - Create in [src/lib/components/](src/lib/components/)
   - Import and use in `VideoSequencer.svelte` or parent component
   - Subscribe to stores using `$sequencerState` syntax (Svelte 5 auto-subscriptions)

3. **Modifying render logic**:
   - Client script generation: Edit `generateFFmpegScript()` in [src/lib/stores/sequencer.ts](src/lib/stores/sequencer.ts)
   - Server rendering: Edit [render-service/main.py](render-service/main.py)
   - Test both rendering paths after changes

4. **Working with the render service locally**:
   - Render service expects to run in Docker with mounted volumes
   - For local testing, ensure `./clips/` and `./output/` directories exist
   - Use `docker:up` to start all services together

## Important Notes

- **Grid positions** are zero-indexed (0 to rows\*cols-1)
- **Instrument IDs** are generated using `Date.now() + Math.random()` for uniqueness
- **Video URLs** from File objects must be revoked with `URL.revokeObjectURL()` to prevent memory leaks
- **TypeScript strict mode** is enabled - all code must pass strict type checking
- **Path aliases**: Use `$lib/` prefix for imports from [src/lib/](src/lib/) (SvelteKit convention)
- **Request body size limit**: SvelteKit has a default 512KB limit for request bodies. When uploading large video files through the render API, you may need to increase this limit in production by setting the `BODY_SIZE_LIMIT` environment variable (e.g., `BODY_SIZE_LIMIT=50000000` for 50MB) or configuring it in `svelte.config.js`
