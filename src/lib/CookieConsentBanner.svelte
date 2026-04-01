<script lang="ts">
  import { Cookie, X } from "lucide-svelte";
  import type { CookieConsentStatus } from "./analytics-consent";

  interface Props {
    status: CookieConsentStatus | null;
    isOpen: boolean;
    onAccept: () => void;
    onReject: () => void;
    onOpen: () => void;
    onClose: () => void;
  }

  let { status, isOpen, onAccept, onReject, onOpen, onClose }: Props = $props();

  const needsDecision = $derived(status === null);
</script>

{#if !isOpen && !needsDecision}
  <button class="cookie-trigger" type="button" onclick={onOpen}>
    <Cookie size={16} strokeWidth={3} />
    Cookies
  </button>
{/if}

{#if isOpen}
  <div
    class="cookie-consent"
    role="dialog"
    aria-modal={needsDecision}
    aria-label="Configurar Cookies"
  >
    <div class="cookie-consent__panel">
      <div class="cookie-consent__content">
        <Cookie size={24} strokeWidth={2.5} class="cookie-icon" />
        <p>
          Usamos analytics para entender o uso do app. <strong
            >Ele funciona 100% sem eles.</strong
          >
        </p>
      </div>

      <div class="cookie-consent__actions">
        <button
          class="cookie-btn cookie-btn--reject"
          type="button"
          onclick={onReject}
        >
          Rejeitar
        </button>
        <button
          class="cookie-btn cookie-btn--accept"
          type="button"
          onclick={onAccept}
        >
          Aceitar
        </button>
        {#if !needsDecision}
          <button
            class="cookie-btn cookie-btn--close"
            type="button"
            aria-label="Fechar"
            onclick={onClose}
          >
            <X size={20} strokeWidth={3} />
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
