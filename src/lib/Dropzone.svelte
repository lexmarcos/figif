<script lang="ts">
  import { onDestroy } from "svelte";
  import { Clapperboard } from "lucide-svelte";

  let {
    onFileSelected,
    selectedFile = $bindable(null),
    maxSizeMB = 400,
  }: {
    onFileSelected: (file: File) => void;
    selectedFile?: File | null;
    maxSizeMB?: number;
  } = $props();

  let dragOver = $state(false);
  let error = $state("");
  let videoUrl = $state("");
  let videoDuration = $state(0);
  let fileInput: HTMLInputElement;

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function validate(file: File): boolean {
    error = "";
    if (!file.type.startsWith("video/")) {
      error = "Arquivo inválido. Selecione um vídeo MP4.";
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      error = `O vídeo excede o limite de ${maxSizeMB}MB.`;
      return false;
    }
    return true;
  }

  function handleFile(file: File) {
    if (!validate(file)) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(file);
    selectedFile = file;
    onFileSelected(file);
  }

  function onDrop(e: DragEvent) {
    dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) handleFile(file);
  }

  function onVideoLoaded(e: Event) {
    const video = e.target as HTMLVideoElement;
    videoDuration = video.duration;
  }

  function removeFile() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = "";
    selectedFile = null;
    videoDuration = 0;
    error = "";
    if (fileInput) fileInput.value = "";
  }

  onDestroy(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  });
</script>

<div class="section">
  <span class="section__label">Vídeo</span>

  {#if !selectedFile}
    <div
      class="dropzone"
      class:drag-over={dragOver}
      role="button"
      tabindex="0"
      ondragover={(e: DragEvent) => {
        e.preventDefault();
        dragOver = true;
      }}
      ondragleave={() => (dragOver = false)}
      ondrop={(e: DragEvent) => {
        e.preventDefault();
        onDrop(e);
      }}
      onclick={() => fileInput.click()}
      onkeydown={(e: KeyboardEvent) => e.key === "Enter" && fileInput.click()}
    >
      <div class="dropzone__icon">
        <Clapperboard size={48} strokeWidth={1.5} color="var(--text-muted)" />
      </div>
      <p class="dropzone__text">
        Arraste seu vídeo aqui ou <strong>clique para selecionar</strong>
      </p>
      <p class="dropzone__hint">MP4 • Até {maxSizeMB}MB</p>
    </div>
  {:else}
    <div class="video-preview">
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        src={videoUrl}
        controls
        playsinline
        onloadedmetadata={onVideoLoaded}
      ></video>
      <div class="video-preview__info">
        <span>{selectedFile.name} • {formatSize(selectedFile.size)}</span>
        {#if videoDuration > 0}
          <span>{videoDuration.toFixed(1)}s</span>
        {/if}
      </div>
      <button class="video-preview__remove" onclick={removeFile}>
        ✕ Remover
      </button>
    </div>
  {/if}

  {#if error}
    <p class="error-msg">{error}</p>
  {/if}

  <input
    bind:this={fileInput}
    type="file"
    accept="video/mp4,video/*"
    style="display:none"
    onchange={onInputChange}
  />
</div>
