<p align="center">
  <svg width="180" height="180" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="45" r="22" fill="#ffffff" />
    <rect x="20" y="30" width="40" height="40" stroke="#0091ff" stroke-width="5" transform="rotate(15 40 50)" />
    <rect x="40" y="35" width="45" height="45" fill="#CCFF00" style="filter: drop-shadow(0 0 15px rgba(204, 255, 0, 0.4));" transform="rotate(-10 62.5 57.5)" />
    <polygon points="62,35 50,55 58,55 52,75 72,50 60,50" fill="#000000" />
  </svg>
</p>

<h1 align="center">FiGif</h1>

<p align="center">
  A browser-focused GIF maker for creating animated stickers with trim, crop, and local rendering.
</p>

## About the project

**FiGif** is a web application for turning videos into GIFs ready to use on WhatsApp and other platforms. The main idea is to keep the core processing on the client with **FFmpeg WebAssembly**, reducing reliance on external infrastructure and preserving user privacy.

In addition to local uploads, the app can also fetch videos from **X/Twitter** through a **Node.js + Express** proxy, working around browser CORS limitations.

## What the app does

- Local video upload in the browser
- Video import from X/Twitter
- Trim a section of the video before GIF generation
- Inline visual crop of the generated GIF
- Final GIF quality adjustment
- Local processing with progress feedback
- Dark brutalist interface focused on speed and readability

## Stack

- **Frontend:** Svelte 5 + Vite + TypeScript
- **Styling:** Plain CSS
- **Icons:** lucide-svelte
- **Media processing:** `@ffmpeg/ffmpeg` + `@ffmpeg/util`
- **Supporting backend:** Node.js + Express + CORS
- **Containerization:** Docker + Docker Compose + Nginx

## How to run locally

### Prerequisites

- Node.js 22+ recommended
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Start the backend

In one terminal:

```bash
npm run server
```

The proxy will be available at `http://localhost:3001`.

### 3. Start the frontend

In another terminal:

```bash
npm run dev
```

The frontend will usually be available at `http://localhost:5173`.

## How to run with Docker Compose

### 1. Configure the environment

The project already includes a `.env` file with the frontend public port:

```env
FIGIF_PORT=8080
```

If needed, adjust this value before starting the containers.

### 2. Start the services

```bash
docker compose up --build
```

After that, the application will be available at:

```bash
http://localhost:8080
```

## Compose service structure

- `frontend`: production build of the Svelte app served by Nginx
- `backend`: Express proxy for X/Twitter video integration

Nginx forwards `/api/*` routes to the backend automatically.

## Useful scripts

```bash
npm run dev
npm run server
npm run build
npm run preview
npm run check
```

## Usage flow

1. Upload a local video or paste an X/Twitter link
2. Choose the segment that will be turned into a GIF
3. Generate the GIF in the browser
4. Crop the desired area directly on the result screen
5. Adjust the quality, then copy or download the final file

## Notes

- GIF processing may take a few seconds depending on the video and device.
- For X/Twitter video import to work, the backend must be running.
- The app uses specific frontend headers for compatibility with FFmpeg WebAssembly.
