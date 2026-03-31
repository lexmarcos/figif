<script lang="ts">
  let {
    message = "Processando...",
    subMessage = "",
  }: {
    message?: string;
    subMessage?: string;
  } = $props();
</script>

<div class="progress-overlay">
  <div class="progress-overlay__spinner"></div>
  <p class="progress-overlay__text">{message}</p>
  {#if subMessage}
    <p class="progress-overlay__sub">{subMessage}</p>
  {/if}
</div>
