<script lang="ts">
  import Dropzone from "./Dropzone.svelte";
  import ProgressOverlay from "./ProgressOverlay.svelte";
  import VideoTrimmer from "./VideoTrimmer.svelte";
  import { trimAndConvertToGif } from "./ffmpeg";
  import { Wand2, Sparkles, Link, ArrowLeft } from "lucide-svelte";

  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
    /\/$/,
    "",
  );

  function apiUrl(path: string): string {
    return `${API_BASE_URL}${path}`;
  }

  let {
    onGifGenerated,
  }: {
    onGifGenerated: (blob: Blob) => void;
  } = $props();

  let file: File | null = $state(null);
  let twitterUrl = $state("");
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
      showTrimmer = true;
    };
    video.src = url;
  }

  function canGenerate(): boolean {
    return !!file && showTrimmer;
  }

  async function fetchTwitterVideo() {
    if (!twitterUrl) return;
    processing = true;
    error = "";
    progressMsg = "Buscando vídeo no Twitter...";

    try {
      const resp = await fetch(apiUrl("/api/twitter"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: twitterUrl,
          vCodec: "h264",
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "A API local rejeitou o pedido.");
      }
      if (!data.url) throw new Error("URL do vídeo não encontrada");

      progressMsg = "Baixando mídia...";
      const proxyUrl =
        apiUrl("/api/proxy-video") + "?url=" + encodeURIComponent(data.url);
      const mediaResp = await fetch(proxyUrl);
      if (!mediaResp.ok) throw new Error("Erro de conexão ao rotear mídia");
      const blob = await mediaResp.blob();
      const filename = "twitter_video.mp4";
      const f = new File([blob], filename, { type: blob.type });

      onFileSelected(f);
      twitterUrl = "";
    } catch (err: any) {
      console.error(err);
      error =
        "Não foi possível baixar o vídeo. Verifique se o link possui um vídeo válido.";
    } finally {
      processing = false;
    }
  }

  function onTrimConfirmed(start: number, end: number) {
    trimStart = start;
    trimEnd = end;
  }

  function goBackToLanding() {
    file = null;
    showTrimmer = false;
    videoDuration = 0;
    trimStart = 0;
    trimEnd = 15;
    error = "";
  }

  async function generate() {
    if (!file || processing) return;

    processing = true;
    error = "";
    progressMsg = "Iniciando...";

    try {
      const blob = await trimAndConvertToGif(
        file,
        trimStart,
        trimEnd,
        (msg) => {
          progressMsg = msg;
        },
      );
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

  {#if !showTrimmer || !file}
    <!-- ===== LANDING: Dropzone + Twitter ===== -->
    <div class="landing-zone">
      <Dropzone {onFileSelected} />

      <div class="landing-zone__divider">
        <span class="landing-zone__divider-line"></span>
        <span class="landing-zone__divider-text">ou</span>
        <span class="landing-zone__divider-line"></span>
      </div>

      <div class="landing-zone__twitter">
        <div class="landing-zone__twitter-label">
          <Link size={18} strokeWidth={2.5} />
          <span>Cole um link do <strong>X (Twitter)</strong></span>
        </div>
        <div class="landing-zone__twitter-row">
          <input
            type="url"
            bind:value={twitterUrl}
            placeholder="https://x.com/..."
            class="brutalist-input"
            style="flex: 1;"
            onkeydown={(e) => e.key === "Enter" && fetchTwitterVideo()}
          />
          <button
            class="btn btn-primary btn--compact"
            onclick={fetchTwitterVideo}
            disabled={processing || !twitterUrl}
          >
            Buscar
          </button>
        </div>
      </div>
    </div>
  {:else}
    <!-- ===== TRIM STATE: Trimmer + Generate ===== -->
    <div class="section">
      <div class="trim-header">
        <button class="btn-back" onclick={goBackToLanding}>
          <ArrowLeft size={18} strokeWidth={2.5} />
          Voltar
        </button>
        <span class="section__label" style="margin: 0;">Recortar trecho</span>
      </div>
      <VideoTrimmer
        {file}
        duration={videoDuration}
        maxDuration={15}
        {onTrimConfirmed}
        fileSize={file.size}
        onSwapVideo={() => swapInput.click()}
      />
    </div>

    <div class="actions">
      <button
        class="btn btn-generate"
        disabled={!canGenerate() || processing}
        onclick={generate}
      >
        <Wand2 size={24} strokeWidth={2.5} />
        Gerar GIF
      </button>
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
</div>
