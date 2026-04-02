<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Play, Pause, RefreshCw } from "lucide-svelte";

  let {
    file,
    duration,
    maxDuration = 10,
    onTrimConfirmed,
    fileSize = 0,
    onSwapVideo,
  }: {
    file: File;
    duration: number;
    maxDuration?: number;
    onTrimConfirmed: (start: number, end: number) => void;
    fileSize?: number;
    onSwapVideo?: () => void;
  } = $props();

  let videoUrl = $state("");
  let videoEl: HTMLVideoElement;
  let trackEl: HTMLDivElement;

  let startTime = $state(0);
  let endTime = $state(0);
  let currentTime = $state(0);
  let isPlaying = $state(false);

  let dragging: "start" | "end" | "range" | null = $state(null);
  let dragStartX = 0;
  let dragStartVal = 0;
  let dragStartStart = 0;
  let dragStartEnd = 0;

  let animFrame = 0;

  $effect(() => {
    if (file) {
      videoUrl = URL.createObjectURL(file);
      startTime = 0;
      endTime = Math.min(duration, maxDuration);
    }
  });

  function toPercent(time: number): number {
    return (time / duration) * 100;
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
  }

  function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  function getTimeFromX(clientX: number): number {
    if (!trackEl) return 0;
    const rect = trackEl.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * duration;
  }

  function onHandleDown(e: PointerEvent, type: "start" | "end" | "range") {
    e.preventDefault();
    e.stopPropagation();
    dragging = type;
    dragStartX = e.clientX;
    dragStartVal = type === "start" ? startTime : endTime;
    dragStartStart = startTime;
    dragStartEnd = endTime;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const dx = e.clientX - dragStartX;
    const dt = (dx / rect.width) * duration;

    if (dragging === "start") {
      let newStart = clamp(dragStartVal + dt, 0, endTime - 1);
      if (endTime - newStart > maxDuration) {
        newStart = endTime - maxDuration;
      }
      startTime = Math.max(0, newStart);
      seekTo(startTime);
    } else if (dragging === "end") {
      let newEnd = clamp(dragStartVal + dt, startTime + 1, duration);
      if (newEnd - startTime > maxDuration) {
        newEnd = startTime + maxDuration;
      }
      endTime = Math.min(duration, newEnd);
      seekTo(endTime);
    } else if (dragging === "range") {
      const rangeDuration = dragStartEnd - dragStartStart;
      let newStart = clamp(dragStartStart + dt, 0, duration - rangeDuration);
      startTime = newStart;
      endTime = newStart + rangeDuration;
      seekTo(startTime);
    }
  }

  function onPointerUp() {
    dragging = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  function seekTo(time: number) {
    if (videoEl) {
      videoEl.currentTime = time;
      currentTime = time;
    }
  }

  function togglePlay() {
    if (!videoEl) return;
    if (isPlaying) {
      videoEl.pause();
    } else {
      if (currentTime < startTime || currentTime >= endTime) {
        seekTo(startTime);
      }
      videoEl.play();
    }
    isPlaying = !isPlaying;
  }

  function onTimeUpdate() {
    if (!videoEl) return;
    currentTime = videoEl.currentTime;
    // Loop within selection
    if (currentTime >= endTime) {
      videoEl.pause();
      isPlaying = false;
      seekTo(startTime);
    }
  }

  function jumpStart() {
    seekTo(startTime);
  }

  function jumpEnd() {
    seekTo(endTime > 1 ? endTime - 0.5 : endTime);
  }

  function onTrackClick(e: MouseEvent) {
    if (dragging) return;
    const time = getTimeFromX(e.clientX);
    seekTo(clamp(time, startTime, endTime));
  }

  // Reactively push trim times to parent whenever they change
  $effect(() => {
    if (
      startTime !== undefined &&
      endTime !== undefined &&
      endTime > startTime
    ) {
      onTrimConfirmed(startTime, endTime);
    }
  });

  onMount(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  });

  onDestroy(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  });

  let selectedDuration = $derived(endTime - startTime);
</script>

<div class="trimmer">
  <div class="trimmer__video">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
      bind:this={videoEl}
      src={videoUrl}
      playsinline
      ontimeupdate={onTimeUpdate}
      onpause={() => (isPlaying = false)}
      onplay={() => (isPlaying = true)}
    ></video>
  </div>

  <div class="trimmer__controls">
    <div class="trimmer__transport">
      <button
        class="trimmer__btn trimmer__btn--play"
        onclick={togglePlay}
        title={isPlaying ? "Pausar" : "Reproduzir"}
      >
        {#if isPlaying}
          <Pause size={24} strokeWidth={2.5} />
        {:else}
          <Play size={24} strokeWidth={2.5} />
        {/if}
      </button>
    </div>

    <div class="trimmer__timeline">
      <div
        class="trimmer__track"
        bind:this={trackEl}
        onclick={onTrackClick}
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === "ArrowLeft")
            seekTo(Math.max(startTime, currentTime - 1));
          if (e.key === "ArrowRight")
            seekTo(Math.min(endTime, currentTime + 1));
        }}
        role="slider"
        tabindex="0"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={duration}
      >
        <!-- Inactive zones -->
        <div
          class="trimmer__inactive"
          style="left: 0; width: {toPercent(startTime)}%;"
        ></div>
        <div
          class="trimmer__inactive"
          style="left: {toPercent(endTime)}%; width: {100 -
            toPercent(endTime)}%;"
        ></div>

        <!-- Active selection -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="trimmer__selection"
          style="left: {toPercent(startTime)}%; width: {toPercent(
            endTime - startTime,
          )}%;"
          onpointerdown={(e: PointerEvent) => onHandleDown(e, "range")}
        ></div>

        <!-- Playhead -->
        <div
          class="trimmer__playhead"
          style="left: {toPercent(currentTime)}%;"
        ></div>

        <!-- Handles -->
        <div
          class="trimmer__handle trimmer__handle--start"
          style="left: {toPercent(startTime)}%;"
          onpointerdown={(e: PointerEvent) => onHandleDown(e, "start")}
          role="slider"
          aria-label="Início do corte"
          tabindex="0"
          aria-valuenow={startTime}
        ></div>
        <div
          class="trimmer__handle trimmer__handle--end"
          style="left: {toPercent(endTime)}%;"
          onpointerdown={(e: PointerEvent) => onHandleDown(e, "end")}
          role="slider"
          aria-label="Fim do corte"
          tabindex="0"
          aria-valuenow={endTime}
        ></div>
      </div>
    </div>

    <div class="trimmer__info">
      <span class="trimmer__time">{formatTime(startTime)}</span>
      <span
        class="trimmer__duration"
        class:trimmer__duration--warn={selectedDuration > maxDuration}
      >
        {selectedDuration.toFixed(1)}s / {maxDuration}s
      </span>
      <span class="trimmer__time">{formatTime(endTime)}</span>
    </div>
  </div>

  {#if fileSize > 0 || onSwapVideo}
    <div class="trimmer__footer">
      {#if fileSize > 0}
        <span class="trimmer__file-size">
          {fileSize < 1024 * 1024
            ? (fileSize / 1024).toFixed(1) + " KB"
            : (fileSize / (1024 * 1024)).toFixed(1) + " MB"}
          {#if duration > 0}• {duration.toFixed(1)}s{/if}
        </span>
      {/if}
      {#if onSwapVideo}
        <button class="video-preview__remove-btn" onclick={onSwapVideo}>
          <RefreshCw size={22} strokeWidth={2.5} />
          Trocar Vídeo
        </button>
      {/if}
    </div>
  {/if}
</div>
