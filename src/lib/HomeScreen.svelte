<script lang="ts">
  import Dropzone from "./Dropzone.svelte";
  import ProgressOverlay from "./ProgressOverlay.svelte";
  import { videoToGif } from "./ffmpeg";
  import { Zap, Scissors, Wand2, Clock } from "lucide-svelte";

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

  function onFileSelected(f: File) {
    file = f;
    error = "";
    const url = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      videoDuration = video.duration;
      URL.revokeObjectURL(url);
    };
    video.src = url;
  }

  function canGenerate(): boolean {
    if (!file) return false;
    if (mode === "direct" && videoDuration > 15) return false;
    return true;
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
      const blob = await videoToGif(file, (msg) => {
        progressMsg = msg;
      });
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
  <header class="header">
    <h1>FiGif</h1>
    <h2>Crie figurinhas GIF para WhatsApp</h2>
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
        onclick={() => (mode = "direct")}
        onkeydown={(e: KeyboardEvent) => e.key === "Enter" && (mode = "direct")}
      >
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <div class="mode-card__radio"></div>
          <span
            class="mode-card__title"
            style="display: flex; align-items: center; gap: 0.4rem;"
          >
            <Zap size={18} strokeWidth={2.5} color="var(--accent-start)" />
            Direto
          </span>
        </div>
        <span class="mode-card__desc"
          >Vídeos de até 15 segundos, transformados direto em GIF</span
        >
      </div>

      <div
        class="mode-card disabled"
        role="radio"
        aria-checked={false}
        tabindex="-1"
        title="Em breve"
      >
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <div class="mode-card__radio"></div>
          <span
            class="mode-card__title"
            style="display: flex; align-items: center; gap: 0.4rem;"
          >
            <Scissors size={18} strokeWidth={2} />
            Recorte
          </span>
        </div>
        <span class="mode-card__desc"
          >Para vídeos maiores — recorte o trecho desejado (em breve)</span
        >
      </div>
    </div>
  </div>

  <Dropzone {onFileSelected} />

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
      <Wand2 size={20} />
      Gerar GIF
    </button>
  </div>
</div>
