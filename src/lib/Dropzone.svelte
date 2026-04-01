<script lang="ts">
  import { Clapperboard } from "lucide-svelte";

  let {
    onFileSelected,
    maxSizeMB = 400,
  }: {
    onFileSelected: (file: File) => void;
    maxSizeMB?: number;
  } = $props();

  let dragOver = $state(false);
  let error = $state("");
  let fileInput: HTMLInputElement;

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
    input.value = "";
  }
</script>

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
    <Clapperboard size={56} strokeWidth={2} />
  </div>
  <p class="dropzone__text">
    Arraste seu vídeo ou <br /><strong>clique para selecionar</strong>
  </p>
  <p class="dropzone__hint">MP4 • Até {maxSizeMB}MB</p>
</div>

{#if error}
  <p class="error-msg">{error}</p>
{/if}

<input
  bind:this={fileInput}
  class="native-file-input"
  type="file"
  accept="video/mp4,video/*"
  onchange={onInputChange}
/>
