<script lang="ts">
  import { onDestroy } from "svelte";
  import CropTool from "./CropTool.svelte";
  import ProgressOverlay from "./ProgressOverlay.svelte";
  import { cropGif, reencodeGif } from "./ffmpeg";
  import {
    MessageCircle,
    Scissors,
    Download,
    SlidersHorizontal,
    RotateCcw,
    Check,
    X,
  } from "lucide-svelte";

  type AspectRatio = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

  let {
    gifBlob = $bindable(),
    onBack,
  }: {
    gifBlob: Blob;
    onBack: () => void;
  } = $props();

  let cropping = $state(false);
  let aspectRatio = $state<AspectRatio>("free");
  let processing = $state(false);
  let progressMsg = $state("");
  let toast = $state<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  let toastTimeout: ReturnType<typeof setTimeout>;

  // Quality control
  let quality = $state(100);
  let showQuality = $state(false);
  let originalBlob: Blob | null = $state(null);

  // Crop tool ref for triggering confirm from outside
  let cropConfirmFn: (() => void) | null = $state(null);

  let gifUrl = $state("");

  $effect(() => {
    const nextUrl = URL.createObjectURL(gifBlob);
    gifUrl = nextUrl;

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  });

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function showToast(message: string, tone: "success" | "error" = "success") {
    toast = { message, tone };
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast = null;
    }, 3000);
  }

  function downloadGif() {
    const a = document.createElement("a");
    a.href = gifUrl;
    a.download = "figif-sticker.gif";
    a.click();
  }

  function startCropping() {
    cropping = true;
    showQuality = false;
    aspectRatio = "free";
  }

  function cancelCropping() {
    cropping = false;
    cropConfirmFn = null;
    aspectRatio = "free";
  }

  function registerCropConfirm(confirm: (() => void) | null) {
    cropConfirmFn = confirm;
  }

  function applyCropSelection() {
    if (processing || !cropConfirmFn) return;
    cropConfirmFn();
  }

  async function onCropComplete(x: number, y: number, w: number, h: number) {
    processing = true;
    progressMsg = "Recortando...";

    try {
      const newBlob = await cropGif(gifBlob, x, y, w, h, (msg) => {
        progressMsg = msg;
      });
      gifBlob = newBlob;
      originalBlob = null;
      quality = 100;
      cropping = false;
      cropConfirmFn = null;
      showToast("GIF recortado!", "success");
    } catch (e) {
      console.error(e);
      showToast("Erro ao recortar", "error");
    } finally {
      processing = false;
    }
  }

  async function applyQuality() {
    if (processing) return;

    if (!originalBlob) {
      originalBlob = gifBlob;
    }

    processing = true;
    progressMsg = `Ajustando qualidade (${quality}%)...`;

    try {
      const sourceBlob = originalBlob || gifBlob;
      const newBlob = await reencodeGif(sourceBlob, quality, (msg) => {
        progressMsg = msg;
      });
      gifBlob = newBlob;
      showToast(`Qualidade ajustada para ${quality}%`, "success");
    } catch (e) {
      console.error(e);
      showToast("Erro ao ajustar qualidade", "error");
    } finally {
      processing = false;
    }
  }

  function getQualityLabel(q: number): string {
    if (q <= 20) return "Muito Baixa";
    if (q <= 40) return "Baixa";
    if (q <= 60) return "Média";
    if (q <= 80) return "Alta";
    return "Máxima";
  }

  onDestroy(() => {
    if (toastTimeout) clearTimeout(toastTimeout);
  });
</script>

{#if processing}
  <ProgressOverlay message={progressMsg} />
{/if}

<div class="container">
  <div class="result-card">
    <div
      class="result-card__preview"
      class:result-card__preview--cropping={cropping}
    >
      {#if cropping}
        <CropTool
          imageUrl={gifUrl}
          {aspectRatio}
          {onCropComplete}
          onConfirmReady={registerCropConfirm}
        />
      {:else}
        <div class="result-image-container">
          <img src={gifUrl} alt="GIF gerado" />
        </div>
      {/if}
    </div>

    {#if !cropping}
      <div class="result-card__hint" role="note">
        <div class="result-card__hint_shell">
          <span class="result-card__hint-icon" aria-hidden="true">
            <MessageCircle size={18} strokeWidth={2.5} />
          </span>
          <span class="result-card__hint-text">
            <span class="result-card__hint-label">Dica:</span>
            Aperte e segure no gif para copiar e colar na conversa do WhatsApp
          </span>
        </div>
      </div>
    {/if}

    <div
      class="result-card__info"
      class:result-card__info--with-hint={!cropping}
    >
      <span class="result-card__size">{formatSize(gifBlob.size)}</span>
      <span class="result-card__badge">GIF</span>
    </div>

    {#if cropping}
      <div class="result-card__crop-controls">
        <label class="crop-ratio-row" for="crop-aspect-ratio">
          <span class="crop-ratio-label">Proporção:</span>
          <select
            id="crop-aspect-ratio"
            class="crop-ratio-select"
            bind:value={aspectRatio}
          >
            <option value="free">Livre</option>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
            <option value="3:4">3:4</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>
        </label>
      </div>

      <div class="result-card__actions result-card__actions--crop">
        <button class="result-action" onclick={cancelCropping}>
          <X size={20} strokeWidth={2.5} />
          <span>Cancelar</span>
        </button>
        <button
          class="result-action result-action--primary"
          onclick={applyCropSelection}
          disabled={!cropConfirmFn || processing}
        >
          <Check size={20} strokeWidth={2.5} />
          <span>Aplicar corte</span>
        </button>
      </div>
    {:else}
      <div class="result-card__actions result-card__actions--single">
        <button
          class="result-action result-action--primary"
          onclick={downloadGif}
        >
          <Download size={20} strokeWidth={2.5} />
          <span>Baixar</span>
        </button>
      </div>
      <div class="result-card__actions">
        <button class="result-action" onclick={startCropping}>
          <Scissors size={20} strokeWidth={2.5} />
          <span>Recortar</span>
        </button>
        <button
          class="result-action"
          class:result-action--active={showQuality}
          onclick={() => (showQuality = !showQuality)}
        >
          <SlidersHorizontal size={20} strokeWidth={2.5} />
          <span>Qualidade</span>
        </button>
      </div>

      {#if showQuality}
        <div class="result-card__quality">
          <div class="quality-slider-row">
            <span class="quality-desc">{getQualityLabel(quality)}</span>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              bind:value={quality}
              class="quality-range"
            />
            <span class="quality-chip">{quality}%</span>
          </div>
        </div>
        <div class="result-card__actions result-card__actions--crop">
          <button class="result-action" onclick={() => (showQuality = false)}>
            <X size={20} strokeWidth={2.5} />
            <span>Cancelar</span>
          </button>
          <button
            class="result-action result-action--primary"
            onclick={applyQuality}
            disabled={processing}
          >
            <Check size={20} strokeWidth={2.5} />
            <span>Aplicar Qualidade</span>
          </button>
        </div>
      {/if}
    {/if}

    <button class="result-card__new" onclick={onBack}>
      <RotateCcw size={18} strokeWidth={2.5} />
      Criar outro GIF
    </button>
  </div>
</div>

{#if toast}
  <div class="toast" class:toast--error={toast.tone === "error"}>
    <div class="toast__icon" aria-hidden="true">
      {#if toast.tone === "success"}
        <Check size={22} strokeWidth={3} />
      {:else}
        <X size={22} strokeWidth={3} />
      {/if}
    </div>
    <div class="toast__message">{toast.message}</div>
  </div>
{/if}

<style>
  .result-image-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }
</style>
