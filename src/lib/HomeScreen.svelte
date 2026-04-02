<script lang="ts">
  import Dropzone from "./Dropzone.svelte";
  import ProgressOverlay from "./ProgressOverlay.svelte";
  import VideoTrimmer from "./VideoTrimmer.svelte";
  import { trimAndConvertToGif } from "./ffmpeg";
  import { Wand2, Link, ArrowLeft, Play, X } from "lucide-svelte";
  import { normalizeXStatusUrl } from "./x-status-link";

  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
    /\/$/,
    "",
  );
  const MAX_VIDEO_DURATION_SECONDS = 10;

  function apiUrl(path: string): string {
    return `${API_BASE_URL}${path}`;
  }

  interface Props {
    initialTwitterUrl?: string | null;
    onGifGenerated: (blob: Blob) => void;
    onInitialTwitterUrlConsumed?: () => void;
  }

  let {
    initialTwitterUrl = null,
    onGifGenerated,
    onInitialTwitterUrlConsumed,
  }: Props = $props();

  let file: File | null = $state(null);
  let twitterUrl = $state("");
  let processing = $state(false);
  let progressMsg = $state("");
  let error = $state("");
  let videoDuration = $state(0);

  // Trim state
  let trimStart = $state(0);
  let trimEnd = $state(MAX_VIDEO_DURATION_SECONDS);
  let showTrimmer = $state(false);
  let showTutorial = $state(false);
  let lastAutoFetchedTwitterUrl: string | null = $state(null);
  let swapInput: HTMLInputElement;
  let tutorialVideo = $state<HTMLVideoElement | undefined>(undefined);

  $effect(() => {
    if (!showTutorial || !tutorialVideo) return;

    tutorialVideo.playbackRate = 1.25;
    tutorialVideo.currentTime = 0;
    tutorialVideo.play().catch(() => {});
  });

  $effect(() => {
    const normalizedInitialTwitterUrl = initialTwitterUrl
      ? normalizeXStatusUrl(initialTwitterUrl)
      : "";

    if (
      !normalizedInitialTwitterUrl ||
      normalizedInitialTwitterUrl === lastAutoFetchedTwitterUrl ||
      file ||
      processing
    ) {
      return;
    }

    lastAutoFetchedTwitterUrl = normalizedInitialTwitterUrl;
    twitterUrl = normalizedInitialTwitterUrl;

    void fetchTwitterVideo(normalizedInitialTwitterUrl).then((didLoadVideo) => {
      if (didLoadVideo) {
        onInitialTwitterUrlConsumed?.();
      }
    });
  });

  function onFileSelected(f: File) {
    file = f;
    error = "";
    showTrimmer = false;
    const url = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
      URL.revokeObjectURL(url);

      // Auto-set trim range
      trimStart = 0;
      trimEnd = Math.min(
        videoDuration || MAX_VIDEO_DURATION_SECONDS,
        MAX_VIDEO_DURATION_SECONDS,
      );
      showTrimmer = true;
    };
    video.src = url;
  }

  function canGenerate(): boolean {
    return !!file && showTrimmer;
  }

  async function fetchTwitterVideo(sourceUrl = twitterUrl): Promise<boolean> {
    const normalizedTwitterUrl = normalizeXStatusUrl(sourceUrl);
    if (!normalizedTwitterUrl) return false;

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
          url: normalizedTwitterUrl,
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
      const fileType = blob.type.startsWith("video/") ? blob.type : "video/mp4";
      const f = new File([blob], filename, { type: fileType });

      onFileSelected(f);
      twitterUrl = "";
      return true;
    } catch (err: any) {
      console.error(err);
      error =
        "Não foi possível baixar o vídeo. Verifique se o link possui um vídeo válido.";
      return false;
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
    trimEnd = MAX_VIDEO_DURATION_SECONDS;
    error = "";
  }

  function openTutorial() {
    showTutorial = true;
  }

  function closeTutorial() {
    showTutorial = false;
    if (!tutorialVideo) return;

    tutorialVideo.pause();
    tutorialVideo.currentTime = 0;
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
  <header class="header home-hero">
    <div class="brand-logo home-hero__brand">
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="logo-svg home-hero__logo"
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
          class="home-hero__accent-shape"
          transform="rotate(-10 62.5 57.5)"
        />
        <polygon
          points="62,35 50,55 58,55 52,75 72,50 60,50"
          fill="var(--color-background)"
        />
      </svg>
      <h1>FIGIF</h1>
    </div>
    <h2 class="home-hero__subtitle">
      <span>Crie figurinhas GIF</span>
      <span>para WhatsApp</span>
    </h2>
  </header>

  {#if !showTrimmer || !file}
    <!-- ===== LANDING: Dropzone + Twitter ===== -->
    <div class="home-tutorial">
      <button class="btn btn-secondary home-tutorial__button" onclick={openTutorial}>
        <Play size={18} strokeWidth={2.7} />
        Como usar
      </button>
    </div>

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
            class="brutalist-input landing-zone__input"
            onkeydown={(e) => {
              if (e.key !== "Enter") return;

              void fetchTwitterVideo();
            }}
          />
          <button
            class="btn btn-primary btn--compact landing-zone__submit"
            onclick={() => {
              void fetchTwitterVideo();
            }}
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
        <span class="section__label trim-header__label">Recortar trecho</span>
      </div>
      <VideoTrimmer
        {file}
        duration={videoDuration}
        maxDuration={MAX_VIDEO_DURATION_SECONDS}
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
    class="native-file-input"
    type="file"
    accept="video/mp4,video/*"
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

{#if showTutorial}
  <div
    class="tutorial-modal"
    role="dialog"
    aria-modal="true"
    aria-label="Tutorial de uso do FiGif"
  >
    <button
      class="tutorial-modal__backdrop"
      type="button"
      aria-label="Fechar tutorial"
      onclick={closeTutorial}
    ></button>
    <div class="tutorial-modal__panel">
      <div class="tutorial-modal__header">
        <div class="tutorial-modal__eyebrow">Como usar</div>
        <button
          class="tutorial-modal__close"
          type="button"
          aria-label="Fechar tutorial"
          onclick={closeTutorial}
        >
          <X size={20} strokeWidth={2.8} />
        </button>
      </div>

      <div class="tutorial-modal__body">
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          bind:this={tutorialVideo}
          class="tutorial-modal__video"
          src="/tutorial.webm"
          controls
          playsinline
          preload="metadata"
        ></video>
      </div>
    </div>
  </div>
{/if}
