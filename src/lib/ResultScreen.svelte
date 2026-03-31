<script lang="ts">
  import CropTool from "./CropTool.svelte";
  import ProgressOverlay from "./ProgressOverlay.svelte";
  import { cropGif } from "./ffmpeg";
  import { Copy, Scissors, Download, ArrowLeft } from "lucide-svelte";

  let {
    gifBlob = $bindable(),
    onBack,
  }: {
    gifBlob: Blob;
    onBack: () => void;
  } = $props();

  let cropping = $state(false);
  let processing = $state(false);
  let progressMsg = $state("");
  let toast = $state("");
  let toastTimeout: ReturnType<typeof setTimeout>;

  let gifUrl = $derived(URL.createObjectURL(gifBlob));

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function showToast(msg: string) {
    toast = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast = "";
    }, 3000);
  }

  async function copyGif() {
    try {
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        const img = new Image();
        img.src = gifUrl;
        await new Promise((resolve) => (img.onload = resolve));

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        const pngBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png"),
        );

        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob }),
        ]);
        showToast("✅ Imagem copiada!");
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (err) {
      downloadGif();
      showToast("📥 GIF baixado (copiar não suportado neste navegador)");
    }
  }

  function downloadGif() {
    const a = document.createElement("a");
    a.href = gifUrl;
    a.download = "figif-sticker.gif";
    a.click();
  }

  async function onCropComplete(x: number, y: number, w: number, h: number) {
    processing = true;
    progressMsg = "Recortando...";

    try {
      const newBlob = await cropGif(gifBlob, x, y, w, h, (msg) => {
        progressMsg = msg;
      });
      gifBlob = newBlob;
      cropping = false;
      showToast("✅ GIF recortado!");
    } catch (e) {
      console.error(e);
      showToast("❌ Erro ao recortar");
    } finally {
      processing = false;
    }
  }
</script>

{#if processing}
  <ProgressOverlay message={progressMsg} />
{/if}

<div class="container">
  <div class="back-row">
    <button class="btn-back" onclick={onBack}>
      <ArrowLeft size={16} />
      Novo GIF
    </button>
  </div>

  <header class="header">
    <h1>Seu GIF</h1>
    <h2>Pronto para usar como figurinha!</h2>
  </header>

  <div class="gif-result">
    {#if cropping}
      <CropTool
        imageUrl={gifUrl}
        {onCropComplete}
        onCancel={() => (cropping = false)}
      />
    {:else}
      <div class="gif-result__preview">
        <img src={gifUrl} alt="GIF gerado" />
      </div>

      <p class="gif-result__size">{formatSize(gifBlob.size)}</p>

      <div class="gif-result__actions">
        <button class="btn btn-primary" onclick={copyGif}>
          <Copy size={18} />
          Copiar GIF
        </button>
        <button class="btn btn-secondary" onclick={() => (cropping = true)}>
          <Scissors size={18} />
          Recortar
        </button>
        <button class="btn btn-secondary" onclick={downloadGif}>
          <Download size={18} />
          Baixar
        </button>
      </div>
    {/if}
  </div>
</div>

{#if toast}
  <div class="toast">{toast}</div>
{/if}
