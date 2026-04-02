<script lang="ts">
  import { onDestroy } from "svelte";
  import CropTool from "./CropTool.svelte";
  import ProgressOverlay from "./ProgressOverlay.svelte";
  import { cropGif, reencodeGif } from "./ffmpeg";
  import {
    Copy,
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
    tone: "success" | "error" | "download";
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

  function showToast(
    message: string,
    tone: "success" | "error" | "download" = "success",
  ) {
    toast = { message, tone };
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast = null;
    }, 3000);
  }

  function supportsClipboardMimeType(type: string): boolean {
    if (typeof ClipboardItem === "undefined") return false;
    if (typeof ClipboardItem.supports === "function") {
      return ClipboardItem.supports(type);
    }

    return true;
  }

  async function copyGif() {
    const gifType = gifBlob.type || "image/gif";
    const clipboardBlob =
      gifBlob.type === gifType
        ? gifBlob
        : gifBlob.slice(0, gifBlob.size, gifType);

    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        throw new Error("Clipboard API not available");
      }

      if (!supportsClipboardMimeType(gifType)) {
        throw new Error(`Clipboard API does not support ${gifType}`);
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [gifType]: Promise.resolve(clipboardBlob),
        }),
      ]);
      showToast("GIF copiado!", "success");
    } catch (err) {
      console.error(err);
      downloadGif();
      showToast(
        "Seu navegador baixou o GIF para manter a animação.",
        "download",
      );
    }
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
          <div class="copy-hint" aria-hidden="true">
            <span class="copy-hint-icon">
              <Copy size={40} strokeWidth={2.6} />
            </span>
            <span class="copy-hint-text"
              >Pressione e segure para copiar<br />e cole no WhatsApp</span
            >
          </div>
        </div>
      {/if}
    </div>

    <div class="result-card__info">
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
      <div class="result-card__actions">
        <button class="result-action result-action--primary" onclick={copyGif}>
          <Copy size={20} strokeWidth={2.5} />
          <span>Copiar</span>
        </button>
        <button class="result-action" onclick={downloadGif}>
          <Download size={20} strokeWidth={2.5} />
          <span>Baixar</span>
        </button>
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
          <div class="quality-apply-row">
            <span class="quality-desc">{getQualityLabel(quality)}</span>
            <button
              class="btn btn-primary btn--compact"
              onclick={applyQuality}
              disabled={processing}
            >
              Aplicar
            </button>
          </div>
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
  <div
    class="toast"
    class:toast--error={toast.tone === "error"}
    class:toast--download={toast.tone === "download"}
  >
    <div class="toast__icon" aria-hidden="true">
      {#if toast.tone === "success"}
        <Check size={22} strokeWidth={3} />
      {:else if toast.tone === "download"}
        <Download size={22} strokeWidth={3} />
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

  .copy-hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    border: 3px solid var(--color-primary);
    box-shadow: 4px 4px 0px rgba(204, 255, 0, 0.4);
    color: #fff;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    pointer-events: none;
    z-index: 10;
    animation: hintFadeInOut 5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .copy-hint-icon {
    color: var(--color-primary);
    filter: drop-shadow(0 0 18px rgba(204, 255, 0, 0.5));
    animation: pressPulse 1.5s ease-in-out infinite;
  }

  .copy-hint-text {
    font-family: "Bricolage Grotesque", sans-serif;
    font-size: 0.9rem;
    font-weight: 800;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.05em;
    line-height: 1.3;
  }

  @keyframes pressPulse {
    0%,
    100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(4px) scale(0.9);
    }
  }

  @keyframes hintFadeInOut {
    0% {
      opacity: 0;
      transform: translate(-50%, -45%);
    }
    10% {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
    85% {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%);
      visibility: hidden;
    }
  }
</style>
