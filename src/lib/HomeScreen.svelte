<script lang="ts">
  import Dropzone from "./Dropzone.svelte";
  import ProgressOverlay from "./ProgressOverlay.svelte";
  import VideoTrimmer from "./VideoTrimmer.svelte";
  import { videoToGif, trimAndConvertToGif } from "./ffmpeg";
  import { Zap, Scissors, Wand2, Clock, Sparkles } from "lucide-svelte";

  let {
    onGifGenerated,
  }: {
    onGifGenerated: (blob: Blob) => void;
  } = $props();

  type Mode = "direct" | "trim";

  let mode: Mode = $state("direct");
  let file: File | null = $state(null);
  let processing = $state(false);
  let progressMsg = $state("");
  let error = $state("");
  let videoDuration = $state(0);

  // Trim state
  let trimStart = $state(0);
  let trimEnd = $state(15);
  let showTrimmer = $state(false);
  let swapInput: HTMLInputElement;

  function onFileSelected(f: File) {
    file = f;
    error = "";
    showTrimmer = false;
    const url = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      videoDuration = video.duration;
      URL.revokeObjectURL(url);

      // Auto-set trim range
      trimStart = 0;
      trimEnd = Math.min(videoDuration, 15);

      // In trim mode, show trimmer automatically when video is loaded
      if (mode === "trim") {
        showTrimmer = true;
      }
    };
    video.src = url;
  }

  function canGenerate(): boolean {
    if (!file) return false;
    if (mode === "direct" && videoDuration > 15) return false;
    if (mode === "trim" && !showTrimmer) return false;
    return true;
  }

  function onTrimConfirmed(start: number, end: number) {
    trimStart = start;
    trimEnd = end;
  }

  function selectMode(newMode: Mode) {
    mode = newMode;
    error = "";
    if (newMode === "trim" && file && videoDuration > 0) {
      showTrimmer = true;
    } else {
      showTrimmer = false;
    }
  }

  async function generate() {
    if (!file || processing) return;

    if (mode === "direct" && videoDuration > 15) {
      error =
        "No modo Direto, o vídeo precisa ter até 15 segundos. Use o modo Recorte para vídeos maiores.";
      return;
    }

    processing = true;
    error = "";
    progressMsg = "Iniciando...";

    try {
      let blob: Blob;
      if (mode === "trim") {
        blob = await trimAndConvertToGif(file, trimStart, trimEnd, (msg) => {
          progressMsg = msg;
        });
      } else {
        blob = await videoToGif(file, (msg) => {
          progressMsg = msg;
        });
      }
      onGifGenerated(blob);
    } catch (e: any) {
      console.error(e);
      error = "Erro ao gerar GIF. Tente novamente com outro vídeo.";
    } finally {
      processing = false;
    }
  }
</script>

{#if processing}
  <ProgressOverlay
    message={progressMsg}
    subMessage="Isso pode levar alguns segundos..."
  />
{/if}

<div class="container">
  <header class="header" style="position: relative; padding: 1rem 0;">
    <div
      style="position: absolute; top: -1.5rem; right: -1rem; color: var(--color-primary); transform: rotate(15deg); filter: drop-shadow(0 0 15px rgba(204, 255, 0, 0.4));"
    >
      <Sparkles size={48} strokeWidth={1.5} />
    </div>
    <div class="brand-logo">
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="logo-svg"
      >
        <circle cx="40" cy="45" r="22" fill="var(--color-secondary)" />
        <rect
          x="20"
          y="30"
          width="40"
          height="40"
          stroke="var(--color-tertiary)"
          stroke-width="5"
          transform="rotate(15 40 50)"
        />
        <rect
          x="40"
          y="35"
          width="45"
          height="45"
          fill="var(--color-primary)"
          style="filter: drop-shadow(0 0 15px rgba(204, 255, 0, 0.4));"
          transform="rotate(-10 62.5 57.5)"
        />
        <polygon
          points="62,35 50,55 58,55 52,75 72,50 60,50"
          fill="var(--color-background)"
        />
      </svg>
      <h1>FIGIF</h1>
    </div>
    <h2>Crie figurinhas GIF<br />para WhatsApp</h2>
  </header>

  <div class="section">
    <span class="section__label">Modo</span>
    <div class="mode-cards">
      <div
        class="mode-card"
        class:active={mode === "direct"}
        role="radio"
        aria-checked={mode === "direct"}
        tabindex="0"
        onclick={() => selectMode("direct")}
        onkeydown={(e: KeyboardEvent) =>
          e.key === "Enter" && selectMode("direct")}
      >
        <div style="display:flex; align-items:center;">
          <span
            class="mode-card__title"
            style="display: flex; align-items: center; gap: 0.5rem;"
          >
            <Zap size={24} strokeWidth={3} color="var(--color-primary)" />
            Direto
          </span>
        </div>
        <span class="mode-card__desc"
          >Vídeos de até 15 segundos, transformados direto em GIF</span
        >
      </div>

      <div
        class="mode-card"
        class:active={mode === "trim"}
        role="radio"
        aria-checked={mode === "trim"}
        tabindex="0"
        onclick={() => selectMode("trim")}
        onkeydown={(e: KeyboardEvent) =>
          e.key === "Enter" && selectMode("trim")}
      >
        <div style="display:flex; align-items:center;">
          <span
            class="mode-card__title"
            style="display: flex; align-items: center; gap: 0.5rem;"
          >
            <Scissors size={24} strokeWidth={2.5} />
            Recorte
          </span>
        </div>
        <span class="mode-card__desc"
          >Para vídeos maiores — recorte até 15 segundos do trecho desejado</span
        >
      </div>
    </div>
  </div>

  {#if !(showTrimmer && file)}
    <Dropzone {onFileSelected} hidePreview={showTrimmer} />
  {/if}

  {#if showTrimmer && file && videoDuration > 0}
    <div class="section">
      <span class="section__label">Recortar trecho</span>
      <VideoTrimmer
        {file}
        duration={videoDuration}
        maxDuration={15}
        {onTrimConfirmed}
        fileSize={file.size}
        onSwapVideo={() => swapInput.click()}
      />
    </div>
  {/if}

  <input
    bind:this={swapInput}
    type="file"
    accept="video/mp4,video/*"
    style="display:none"
    onchange={(e: Event) => {
      const input = e.target as HTMLInputElement;
      const f = input.files?.[0];
      if (f) onFileSelected(f);
      input.value = "";
    }}
  />

  {#if error}
    <p class="error-msg">{error}</p>
  {/if}

  {#if mode === "direct" && file && videoDuration > 15}
    <p
      class="error-msg"
      style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;"
    >
      <Clock size={16} />
      O vídeo tem {videoDuration.toFixed(1)}s — no modo Direto o limite é 15
      segundos.
    </p>
  {/if}

  <div class="actions">
    <button
      class="btn btn-primary"
      disabled={!canGenerate() || processing}
      onclick={generate}
    >
      <Wand2 size={24} strokeWidth={2.5} />
      Gerar GIF
    </button>
  </div>
</div>
