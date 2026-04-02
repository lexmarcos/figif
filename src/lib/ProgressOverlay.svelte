<script lang="ts">
  let {
    message = "Processando...",
    subMessage = "",
  }: {
    message?: string;
    subMessage?: string;
  } = $props();

  $effect(() => {
    // Save original overflow
    const originalOverflow = document.body.style.overflow;
    // Disable scroll when component is mounted
    document.body.style.overflow = "hidden";

    // Restore on unmount
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  });
</script>

<div class="brutal-overlay">
  <div class="brutal-loader-box">
    <div class="brutal-spinner"></div>

    <div class="text-content">
      <h2 class="loader-message">{message}</h2>
      {#if subMessage}
        <p class="loader-submessage">{subMessage}</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .brutal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    animation: fadeInFade 0.3s ease-out;
  }

  @keyframes fadeInFade {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(8px);
    }
  }

  .brutal-loader-box {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    width: 100%;
    max-width: 420px;
    padding: 3.5rem 2rem;
    background: var(--bg-card, #141414);
    border: 3px solid var(--color-secondary, #ffffff);
    box-shadow: 6px 6px 0px rgba(255, 255, 255, 0.2);
    overflow: hidden;
  }

  .brutal-spinner {
    width: 64px;
    height: 64px;
    background-color: transparent;
    border: 4px solid var(--border-card, rgba(255, 255, 255, 0.15));
    border-top: 4px solid var(--color-secondary, #ffffff);
    border-right: 4px solid var(--color-secondary, #ffffff);
    border-radius: 0%; /* Sharp corners for brutalist feel */
    animation: spinBrutal 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
  }

  @keyframes spinBrutal {
    0% {
      transform: rotate(0deg) scale(1);
    }
    50% {
      transform: rotate(180deg) scale(0.8);
      border-radius: 50%;
    }
    100% {
      transform: rotate(360deg) scale(1);
      border-radius: 0%;
    }
  }

  .text-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
    z-index: 2;
  }

  .loader-message {
    font-family: "Bricolage Grotesque", sans-serif;
    color: var(--color-secondary, #ffffff);
    font-size: 1.75rem;
    font-weight: 800;
    text-transform: uppercase;
    margin: 0;
    letter-spacing: 0.05em;
    animation: pulseText 1.5s ease-in-out infinite alternate;
  }

  .loader-submessage {
    font-family: "Plus Jakarta Sans", sans-serif;
    color: var(--text-secondary, #a3a3a3);
    font-size: 1rem;
    margin: 0;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  @keyframes pulseText {
    0% {
      opacity: 0.7;
    }
    100% {
      opacity: 1;
    }
  }

  /* Mobile Responsiveness */
  @media (max-width: 640px) {
    .brutal-overlay {
      padding: 1rem;
    }

    .brutal-loader-box {
      padding: 2.5rem 1.5rem;
      gap: 1.5rem;
      box-shadow: 4px 4px 0px rgba(255, 255, 255, 0.2);
      border-width: 2px;
    }

    .brutal-spinner {
      width: 50px;
      height: 50px;
      border-width: 3px;
    }

    .loader-message {
      font-size: 1.35rem;
    }

    .loader-submessage {
      font-size: 0.9rem;
    }
  }
</style>
