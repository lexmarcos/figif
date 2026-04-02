<script lang="ts">
  import { onDestroy } from "svelte";
  import { Play, Pause, RefreshCw } from "lucide-svelte";

  const LARGE_DURATION_PROBE_TIME = 1_000_000;
  const MIN_SELECTION_SECONDS = 1;
  const PREVIEW_FRAME_OFFSET = 0.001;
  const PLAYBACK_EPSILON = 0.05;
  const DRAG_INTENT_THRESHOLD_PX = 6;

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

  let resolvedDuration = $state(0);
  let startTime = $state(0);
  let endTime = $state(0);
  let currentTime = $state(0);
  let isPlaying = $state(false);
  let hasInitializedTrim = $state(false);

  let dragging:
    | "start"
    | "end"
    | "range"
    | "playhead"
    | "selection-pending"
    | null = $state(null);
  let dragStartX = 0;
  let dragStartVal = 0;
  let dragStartStart = 0;
  let dragStartEnd = 0;
  let pendingSelectionSeekTime = 0;

  let effectiveDuration = $derived(
    getFiniteDuration(duration) || resolvedDuration,
  );
  let minimumSelectionDuration = $derived(
    effectiveDuration > 0
      ? Math.min(MIN_SELECTION_SECONDS, effectiveDuration)
      : 0,
  );
  let selectedDuration = $derived(Math.max(0, endTime - startTime));

  $effect(() => {
    if (!file) {
      videoUrl = "";
      resolvedDuration = 0;
      startTime = 0;
      endTime = 0;
      currentTime = 0;
      isPlaying = false;
      hasInitializedTrim = false;
      return;
    }

    const nextVideoUrl = URL.createObjectURL(file);
    videoUrl = nextVideoUrl;
    resolvedDuration = 0;
    startTime = 0;
    endTime = 0;
    currentTime = 0;
    isPlaying = false;
    hasInitializedTrim = false;

    return () => {
      URL.revokeObjectURL(nextVideoUrl);
    };
  });

  $effect(() => {
    if (!effectiveDuration) return;

    if (!hasInitializedTrim) {
      startTime = 0;
      endTime = Math.min(effectiveDuration, maxDuration);
      currentTime = 0;
      hasInitializedTrim = true;
      syncPreviewFrame(0);
      return;
    }

    const nextMinSelectionDuration = minimumSelectionDuration;
    const maxStartTime = Math.max(0, effectiveDuration - nextMinSelectionDuration);
    const nextStartTime = clamp(startTime, 0, maxStartTime);
    let nextEndTime = clamp(
      endTime,
      nextStartTime + nextMinSelectionDuration,
      effectiveDuration,
    );

    if (nextEndTime - nextStartTime > maxDuration) {
      nextEndTime = Math.min(effectiveDuration, nextStartTime + maxDuration);
    }

    startTime = nextStartTime;
    endTime = nextEndTime;

    if (currentTime < nextStartTime || currentTime > nextEndTime) {
      seekTo(nextStartTime);
    }
  });

  function getFiniteDuration(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function toPercent(time: number): number {
    if (!effectiveDuration) return 0;
    return (clamp(time, 0, effectiveDuration) / effectiveDuration) * 100;
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

  function getSafeSeekTime(time: number): number {
    if (!effectiveDuration) return 0;

    const boundedTime = clamp(time, 0, effectiveDuration);
    if (boundedTime >= effectiveDuration && effectiveDuration > PREVIEW_FRAME_OFFSET) {
      return effectiveDuration - PREVIEW_FRAME_OFFSET;
    }

    return boundedTime;
  }

  function getPreviewTime(time: number): number {
    if (!effectiveDuration) return 0;
    if (time > 0) return getSafeSeekTime(time);
    if (effectiveDuration <= PREVIEW_FRAME_OFFSET) return 0;
    return PREVIEW_FRAME_OFFSET;
  }

  function getTimeFromX(clientX: number): number {
    if (!trackEl || !effectiveDuration) return 0;
    const rect = trackEl.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * effectiveDuration;
  }

  function syncResolvedDuration() {
    if (!videoEl) return 0;

    const nextDuration = getFiniteDuration(videoEl.duration);
    if (!nextDuration) return 0;

    resolvedDuration = nextDuration;
    return nextDuration;
  }

  function syncPreviewFrame(targetTime = startTime) {
    if (!videoEl || !effectiveDuration) return;

    const previewTime = getPreviewTime(targetTime);
    videoEl.currentTime = previewTime;
    currentTime = previewTime;
  }

  function pausePlaybackForInteraction() {
    if (!videoEl || videoEl.paused) return;

    videoEl.pause();
    isPlaying = false;
  }

  function beginDragging(
    e: PointerEvent,
    type: "start" | "end" | "range" | "playhead" | "selection-pending",
  ) {
    e.preventDefault();
    e.stopPropagation();

    pausePlaybackForInteraction();
    dragging = type;
    dragStartX = e.clientX;
    dragStartVal =
      type === "start"
        ? startTime
        : type === "end"
          ? endTime
          : currentTime;
    dragStartStart = startTime;
    dragStartEnd = endTime;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onHandleDown(e: PointerEvent, type: "start" | "end") {
    beginDragging(e, type);
  }

  function onSelectionPointerDown(e: PointerEvent) {
    pendingSelectionSeekTime = clamp(getTimeFromX(e.clientX), startTime, endTime);
    beginDragging(e, "selection-pending");
  }

  function onPlayheadPointerDown(e: PointerEvent) {
    beginDragging(e, "playhead");
  }

  function onTrackPointerDown(e: PointerEvent) {
    const target = e.target as HTMLElement;
    if (
      target.closest(".trimmer__handle") ||
      target.closest(".trimmer__selection") ||
      target.closest(".trimmer__playhead-hitbox")
    ) {
      return;
    }

    const nextTime = clamp(getTimeFromX(e.clientX), startTime, endTime);
    seekTo(nextTime);
    beginDragging(e, "playhead");
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !trackEl || !effectiveDuration) return;
    const rect = trackEl.getBoundingClientRect();
    const dx = e.clientX - dragStartX;
    const dt = (dx / rect.width) * effectiveDuration;

    if (dragging === "selection-pending") {
      if (Math.abs(dx) < DRAG_INTENT_THRESHOLD_PX) return;
      dragging = "range";
    }

    if (dragging === "start") {
      let newStart = clamp(
        dragStartVal + dt,
        0,
        dragStartEnd - minimumSelectionDuration,
      );
      if (dragStartEnd - newStart > maxDuration) {
        newStart = dragStartEnd - maxDuration;
      }
      startTime = Math.max(0, newStart);
      seekTo(startTime);
    } else if (dragging === "end") {
      let newEnd = clamp(
        dragStartVal + dt,
        dragStartStart + minimumSelectionDuration,
        effectiveDuration,
      );
      if (newEnd - dragStartStart > maxDuration) {
        newEnd = dragStartStart + maxDuration;
      }
      endTime = Math.min(effectiveDuration, newEnd);
      seekTo(endTime);
    } else if (dragging === "playhead") {
      seekTo(clamp(getTimeFromX(e.clientX), startTime, endTime));
    } else if (dragging === "range") {
      const rangeDuration = dragStartEnd - dragStartStart;
      let newStart = clamp(
        dragStartStart + dt,
        0,
        effectiveDuration - rangeDuration,
      );
      startTime = newStart;
      endTime = newStart + rangeDuration;
      seekTo(clamp(dragStartVal + dt, startTime, endTime));
    }
  }

  function onPointerUp() {
    if (dragging === "selection-pending") {
      seekTo(pendingSelectionSeekTime);
    }

    dragging = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  function seekTo(time: number) {
    if (!videoEl || !effectiveDuration) return;

    const nextTime = getSafeSeekTime(time);
    videoEl.currentTime = nextTime;
    currentTime = nextTime;
  }

  async function togglePlay() {
    if (!videoEl) return;
    if (!videoEl.paused && !videoEl.ended) {
      videoEl.pause();
      return;
    }

    if (currentTime < startTime || currentTime >= endTime - PLAYBACK_EPSILON) {
      seekTo(startTime);
    }

    try {
      await videoEl.play();
    } catch (error) {
      console.error(error);
      isPlaying = false;
    }
  }

  function onTimeUpdate() {
    if (!videoEl) return;
    currentTime = videoEl.currentTime;
    // Loop within selection
    if (currentTime >= endTime - PLAYBACK_EPSILON) {
      videoEl.pause();
      isPlaying = false;
      syncPreviewFrame(startTime);
    }
  }

  function onVideoLoadedMetadata() {
    if (syncResolvedDuration()) return;

    try {
      videoEl.currentTime = LARGE_DURATION_PROBE_TIME;
    } catch (error) {
      console.error(error);
    }
  }

  function onVideoLoadedData() {
    syncResolvedDuration();
    if (!hasInitializedTrim || isPlaying) return;
    syncPreviewFrame(startTime);
  }

  function onVideoDurationChange() {
    syncResolvedDuration();
  }

  function onVideoEnded() {
    isPlaying = false;
    syncPreviewFrame(startTime);
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

  onDestroy(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  });
</script>

<div class="trimmer">
  <div class="trimmer__video">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
      bind:this={videoEl}
      src={videoUrl}
      playsinline
      preload="metadata"
      onloadedmetadata={onVideoLoadedMetadata}
      onloadeddata={onVideoLoadedData}
      ondurationchange={onVideoDurationChange}
      onended={onVideoEnded}
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
        onpointerdown={onTrackPointerDown}
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
        aria-valuemax={effectiveDuration}
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
          onpointerdown={onSelectionPointerDown}
        ></div>

        <!-- Playhead -->
        <div
          class="trimmer__playhead"
          style="left: {toPercent(currentTime)}%;"
        ></div>
        <div
          class="trimmer__playhead-hitbox"
          style="left: {toPercent(currentTime)}%;"
          onpointerdown={onPlayheadPointerDown}
          role="slider"
          aria-label="Posição atual do vídeo"
          tabindex="0"
          aria-valuenow={currentTime}
          aria-valuemin={startTime}
          aria-valuemax={endTime}
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
          {#if effectiveDuration > 0}• {effectiveDuration.toFixed(1)}s{/if}
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
