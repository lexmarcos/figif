<script lang="ts">
  import { onDestroy } from "svelte";
  import { Check, X } from "lucide-svelte";

  let {
    imageUrl,
    onCropComplete,
    onCancel,
  }: {
    imageUrl: string;
    onCropComplete: (x: number, y: number, w: number, h: number) => void;
    onCancel: () => void;
  } = $props();

  let container: HTMLDivElement;
  let imgEl: HTMLImageElement;
  let imgW = $state(0);
  let imgH = $state(0);

  let cx = $state(0);
  let cy = $state(0);
  let cw = $state(0);
  let ch = $state(0);

  let dragging: "move" | "tl" | "tr" | "bl" | "br" | null = $state(null);
  let startX = 0;
  let startY = 0;
  let startCx = 0;
  let startCy = 0;
  let startCw = 0;
  let startCh = 0;

  const MIN_SIZE = 30;

  function onImgLoad() {
    imgW = imgEl.naturalWidth;
    imgH = imgEl.naturalHeight;

    const rect = imgEl.getBoundingClientRect();
    const dw = rect.width;
    const dh = rect.height;

    cw = dw * 0.8;
    ch = dh * 0.8;
    cx = (dw - cw) / 2;
    cy = (dh - ch) / 2;
  }

  function getDisplayedDimensions() {
    if (!imgEl) return { dw: 0, dh: 0 };
    const rect = imgEl.getBoundingClientRect();
    return { dw: rect.width, dh: rect.height };
  }

  function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
  }

  function onPointerDown(
    e: PointerEvent,
    type: "move" | "tl" | "tr" | "bl" | "br",
  ) {
    e.preventDefault();
    e.stopPropagation();
    dragging = type;
    startX = e.clientX;
    startY = e.clientY;
    startCx = cx;
    startCy = cy;
    startCw = cw;
    startCh = ch;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const { dw, dh } = getDisplayedDimensions();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (dragging === "move") {
      cx = clamp(startCx + dx, 0, dw - cw);
      cy = clamp(startCy + dy, 0, dh - ch);
    } else if (dragging === "tl") {
      const newCx = clamp(startCx + dx, 0, startCx + startCw - MIN_SIZE);
      const newCy = clamp(startCy + dy, 0, startCy + startCh - MIN_SIZE);
      cw = startCw + (startCx - newCx);
      ch = startCh + (startCy - newCy);
      cx = newCx;
      cy = newCy;
    } else if (dragging === "tr") {
      cw = clamp(startCw + dx, MIN_SIZE, dw - startCx);
      const newCy = clamp(startCy + dy, 0, startCy + startCh - MIN_SIZE);
      ch = startCh + (startCy - newCy);
      cy = newCy;
    } else if (dragging === "bl") {
      const newCx = clamp(startCx + dx, 0, startCx + startCw - MIN_SIZE);
      cw = startCw + (startCx - newCx);
      cx = newCx;
      ch = clamp(startCh + dy, MIN_SIZE, dh - startCy);
    } else if (dragging === "br") {
      cw = clamp(startCw + dx, MIN_SIZE, dw - startCx);
      ch = clamp(startCh + dy, MIN_SIZE, dh - startCy);
    }
  }

  function onPointerUp() {
    dragging = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  function handleComplete() {
    const { dw, dh } = getDisplayedDimensions();
    const scaleX = imgW / dw;
    const scaleY = imgH / dh;
    onCropComplete(cx * scaleX, cy * scaleY, cw * scaleX, ch * scaleY);
  }

  onDestroy(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  });
</script>

<div class="crop-wrapper">
  <div class="crop-container" bind:this={container}>
    <img
      bind:this={imgEl}
      src={imageUrl}
      alt="Recortar GIF"
      onload={onImgLoad}
      draggable="false"
    />
    {#if imgW > 0}
      <div class="crop-overlay">
        <div
          class="crop-selection"
          style="left:{cx}px; top:{cy}px; width:{cw}px; height:{ch}px;"
          onpointerdown={(e: PointerEvent) => onPointerDown(e, "move")}
          role="slider"
          aria-label="Área de recorte"
          tabindex="0"
          aria-valuenow={0}
        >
          <div
            class="crop-handle tl"
            onpointerdown={(e: PointerEvent) => onPointerDown(e, "tl")}
            role="presentation"
          ></div>
          <div
            class="crop-handle tr"
            onpointerdown={(e: PointerEvent) => onPointerDown(e, "tr")}
            role="presentation"
          ></div>
          <div
            class="crop-handle bl"
            onpointerdown={(e: PointerEvent) => onPointerDown(e, "bl")}
            role="presentation"
          ></div>
          <div
            class="crop-handle br"
            onpointerdown={(e: PointerEvent) => onPointerDown(e, "br")}
            role="presentation"
          ></div>
        </div>
      </div>
    {/if}
  </div>

  <div class="crop-actions">
    <button class="btn btn-primary" onclick={handleComplete}>
      <Check size={18} />
      Concluído
    </button>
    <button class="btn btn-secondary" onclick={onCancel}>
      <X size={18} />
      Cancelar
    </button>
  </div>
</div>

<style>
  .crop-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    width: 100%;
  }

  .crop-actions {
    display: flex;
    gap: 0.75rem;
  }
</style>
