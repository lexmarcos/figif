<script lang="ts">
  import { onDestroy } from "svelte";

  type AspectRatio = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

  interface Props {
    imageUrl: string;
    aspectRatio?: AspectRatio;
    onCropComplete: (x: number, y: number, w: number, h: number) => void;
    onConfirmReady?: (confirm: (() => void) | null) => void;
  }

  let {
    imageUrl,
    aspectRatio = "free",
    onCropComplete,
    onConfirmReady = () => {},
  }: Props = $props();

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

  const MIN_SIZE = 40;

  function getAspect() {
    if (aspectRatio === "1:1") return 1;
    if (aspectRatio === "4:3") return 4 / 3;
    if (aspectRatio === "3:4") return 3 / 4;
    if (aspectRatio === "16:9") return 16 / 9;
    if (aspectRatio === "9:16") return 9 / 16;
    return null;
  }

  function getDisplayedDimensions() {
    if (!imgEl) return { dw: 0, dh: 0 };
    const rect = imgEl.getBoundingClientRect();
    return { dw: rect.width, dh: rect.height };
  }

  function applyAspectRatio() {
    if (!imgW) return;
    const { dw, dh } = getDisplayedDimensions();
    const asp = getAspect();

    let newCw = dw * 0.8;
    let newCh = dh * 0.8;

    if (asp) {
      newCh = newCw / asp;
      if (newCh > dh * 0.8) {
        newCh = dh * 0.8;
        newCw = newCh * asp;
      }
    }

    cw = newCw;
    ch = newCh;
    cx = (dw - cw) / 2;
    cy = (dh - ch) / 2;
  }

  function onImgLoad() {
    imgW = imgEl.naturalWidth;
    imgH = imgEl.naturalHeight;
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
    const asp = getAspect();

    if (dragging === "move") {
      cx = clamp(startCx + dx, 0, dw - cw);
      cy = clamp(startCy + dy, 0, dh - ch);
    } else {
      let signX = dragging.includes("r") ? 1 : -1;
      let signY = dragging.includes("b") ? 1 : -1;

      let tempCw = startCw + dx * signX;
      let tempCh = startCh + dy * signY;

      if (asp) {
        tempCh = tempCw / asp;
      }

      if (tempCw < MIN_SIZE) {
        tempCw = MIN_SIZE;
        if (asp) tempCh = tempCw / asp;
      }

      const boundX = signX === 1 ? dw - startCx : startCx + startCw;
      const boundY = signY === 1 ? dh - startCy : startCy + startCh;

      if (tempCw > boundX) {
        tempCw = boundX;
        if (asp) tempCh = tempCw / asp;
      }

      if (tempCh > boundY) {
        tempCh = boundY;
        if (asp) tempCw = tempCh * asp;
      }

      if (tempCw > boundX) {
        tempCw = boundX;
        if (asp) tempCh = tempCw / asp;
      }

      cw = tempCw;
      ch = tempCh;

      if (signX === -1) cx = startCx + startCw - cw;
      if (signY === -1) cy = startCy + startCh - ch;
    }
  }

  function onPointerUp() {
    dragging = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  function handleComplete() {
    if (!imgW || !imgH) return;

    const { dw, dh } = getDisplayedDimensions();
    if (!dw || !dh) return;

    const scaleX = imgW / dw;
    const scaleY = imgH / dh;
    onCropComplete(cx * scaleX, cy * scaleY, cw * scaleX, ch * scaleY);
  }

  $effect(() => {
    aspectRatio;
    imgW;

    if (!imgW) return;

    const frame = requestAnimationFrame(() => {
      applyAspectRatio();
    });

    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    onConfirmReady(handleComplete);

    return () => {
      onConfirmReady(null);
    };
  });

  onDestroy(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  });
</script>

<div class="crop-tool">
  <div class="crop-container">
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
</div>

<style>
  .crop-tool {
    display: flex;
    justify-content: center;
    width: 100%;
  }
</style>
