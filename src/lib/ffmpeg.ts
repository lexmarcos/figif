import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loaded = false;

export async function loadFfmpeg(onProgress?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpeg && loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    console.log('[ffmpeg]', message);
  });

  if (onProgress) onProgress('Carregando FFmpeg...');

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  loaded = true;
  return ffmpeg;
}

export async function videoToGif(
  file: File,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await loadFfmpeg(onProgress);

  if (onProgress) onProgress('Preparando vídeo...');
  const inputData = await fetchFile(file);
  await ff.writeFile('input.mp4', inputData);

  if (onProgress) onProgress('Gerando paleta de cores...');
  await ff.exec([
    '-i', 'input.mp4',
    '-vf', 'fps=10,scale=320:-1:flags=lanczos,palettegen=stats_mode=diff',
    '-y', 'palette.png',
  ]);

  if (onProgress) onProgress('Convertendo para GIF...');
  await ff.exec([
    '-i', 'input.mp4',
    '-i', 'palette.png',
    '-lavfi', 'fps=10,scale=320:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5',
    '-y', 'output.gif',
  ]);

  const data = await ff.readFile('output.gif');
  const blob = new Blob([data], { type: 'image/gif' });

  // Cleanup
  await ff.deleteFile('input.mp4');
  await ff.deleteFile('palette.png');
  await ff.deleteFile('output.gif');

  return blob;
}

export async function trimAndConvertToGif(
  file: File,
  startTime: number,
  endTime: number,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await loadFfmpeg(onProgress);

  if (onProgress) onProgress('Preparando vídeo...');
  const inputData = await fetchFile(file);
  await ff.writeFile('input.mp4', inputData);

  const duration = endTime - startTime;
  const startStr = startTime.toFixed(3);
  const durationStr = duration.toFixed(3);

  if (onProgress) onProgress('Recortando trecho do vídeo...');
  await ff.exec([
    '-ss', startStr,
    '-i', 'input.mp4',
    '-t', durationStr,
    '-c', 'copy',
    '-y', 'trimmed.mp4',
  ]);

  if (onProgress) onProgress('Gerando paleta de cores...');
  await ff.exec([
    '-i', 'trimmed.mp4',
    '-vf', 'fps=10,scale=320:-1:flags=lanczos,palettegen=stats_mode=diff',
    '-y', 'palette.png',
  ]);

  if (onProgress) onProgress('Convertendo para GIF...');
  await ff.exec([
    '-i', 'trimmed.mp4',
    '-i', 'palette.png',
    '-lavfi', 'fps=10,scale=320:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5',
    '-y', 'output.gif',
  ]);

  const data = await ff.readFile('output.gif');
  const blob = new Blob([data], { type: 'image/gif' });

  await ff.deleteFile('input.mp4');
  await ff.deleteFile('trimmed.mp4');
  await ff.deleteFile('palette.png');
  await ff.deleteFile('output.gif');

  return blob;
}

export async function cropGif(
  gifBlob: Blob,
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await loadFfmpeg(onProgress);

  if (onProgress) onProgress('Recortando GIF...');
  const inputData = await fetchFile(gifBlob);
  await ff.writeFile('crop_input.gif', inputData);

  await ff.exec([
    '-i', 'crop_input.gif',
    '-vf', `crop=${Math.round(cropW)}:${Math.round(cropH)}:${Math.round(cropX)}:${Math.round(cropY)}`,
    '-y', 'crop_output.gif',
  ]);

  const data = await ff.readFile('crop_output.gif');
  const blob = new Blob([data], { type: 'image/gif' });

  await ff.deleteFile('crop_input.gif');
  await ff.deleteFile('crop_output.gif');

  return blob;
}

export async function reencodeGif(
  gifBlob: Blob,
  quality: number,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ff = await loadFfmpeg(onProgress);

  // Map quality 1-100 to ffmpeg parameters
  const t = Math.max(0, Math.min(1, (quality - 1) / 99));
  const colors = Math.round(16 + t * (256 - 16));      // 16–256 colors
  const fps = Math.round(5 + t * (15 - 5));             // 5–15 fps
  const scale = Math.round(160 + t * (480 - 160));      // 160–480px width
  const bayerScale = Math.round(5 - t * 4);             // 5–1 (lower = better dither)

  if (onProgress) onProgress(`Reprocessando (${quality}%)...`);
  const inputData = await fetchFile(gifBlob);
  await ff.writeFile('q_input.gif', inputData);

  if (onProgress) onProgress('Gerando paleta...');
  await ff.exec([
    '-i', 'q_input.gif',
    '-vf', `fps=${fps},scale=${scale}:-1:flags=lanczos,palettegen=max_colors=${colors}:stats_mode=diff`,
    '-y', 'q_palette.png',
  ]);

  if (onProgress) onProgress('Aplicando qualidade...');
  await ff.exec([
    '-i', 'q_input.gif',
    '-i', 'q_palette.png',
    '-lavfi', `fps=${fps},scale=${scale}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=${bayerScale}`,
    '-y', 'q_output.gif',
  ]);

  const data = await ff.readFile('q_output.gif');
  const blob = new Blob([data], { type: 'image/gif' });

  await ff.deleteFile('q_input.gif');
  await ff.deleteFile('q_palette.png');
  await ff.deleteFile('q_output.gif');

  return blob;
}
