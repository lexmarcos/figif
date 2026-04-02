<script lang="ts">
  import { onMount } from "svelte";
  import { Cookie, Link, Heart } from "lucide-svelte";
  import HomeScreen from "./lib/HomeScreen.svelte";
  import ResultScreen from "./lib/ResultScreen.svelte";
  import CookieConsentBanner from "./lib/CookieConsentBanner.svelte";
  import {
    acceptCookieConsent,
    initializeAnalyticsConsent,
    isAnalyticsConfigured,
    rejectCookieConsent,
    type CookieConsentStatus,
  } from "./lib/analytics-consent";
  import { getSharedXStatusUrlFromPathname } from "./lib/x-status-link";

  type Screen = "home" | "result";

  let currentScreen: Screen = $state("home");
  let gifBlob: Blob | null = $state(null);
  let cookieConsentStatus: CookieConsentStatus | null = $state(null);
  let cookieBannerOpen = $state(false);
  let analyticsEnabled = $state(false);
  let initialTwitterUrl: string | null = $state(null);

  onMount(() => {
    initialTwitterUrl = getSharedXStatusUrlFromPathname(
      window.location.pathname,
    );

    analyticsEnabled = isAnalyticsConfigured();
    if (!analyticsEnabled) return;

    cookieConsentStatus = initializeAnalyticsConsent();
    cookieBannerOpen = cookieConsentStatus === null;
  });

  function onGifGenerated(blob: Blob) {
    gifBlob = blob;
    currentScreen = "result";
  }

  function goHome() {
    gifBlob = null;
    currentScreen = "home";
  }

  function clearInitialTwitterUrl() {
    if (!initialTwitterUrl) return;

    initialTwitterUrl = null;
    if (window.location.pathname === "/") return;

    window.history.replaceState(window.history.state, "", "/");
  }

  function acceptAnalyticsCookies() {
    cookieConsentStatus = acceptCookieConsent();
    cookieBannerOpen = false;
  }

  function rejectAnalyticsCookies() {
    cookieConsentStatus = rejectCookieConsent();
    cookieBannerOpen = false;
  }

  function openCookieBanner() {
    cookieBannerOpen = true;
  }

  function closeCookieBanner() {
    if (cookieConsentStatus === null) return;
    cookieBannerOpen = false;
  }
</script>

{#if currentScreen === "home"}
  <HomeScreen
    {onGifGenerated}
    {initialTwitterUrl}
    onInitialTwitterUrlConsumed={clearInitialTwitterUrl}
  />
{:else if currentScreen === "result" && gifBlob}
  <ResultScreen {gifBlob} onBack={goHome} />
{/if}

<footer class="app-footer">
  <div class="app-footer__content">
    <p class="app-footer__credit">
      Feito com <Heart
        size={14}
        strokeWidth={3}
        fill="currentColor"
        class="footer-heart-icon"
      /> por markzuel
    </p>
    <div class="app-footer__actions">
      {#if analyticsEnabled && cookieConsentStatus !== null}
        <button
          class="app-footer__button"
          type="button"
          onclick={openCookieBanner}
          aria-label="Reabrir banner de cookies"
        >
          <Cookie size={16} strokeWidth={2.5} />
          Cookies
        </button>
      {/if}

      <a
        class="app-footer__link"
        href="https://github.com/lexmarcos/figif"
        target="_blank"
        rel="noreferrer"
        aria-label="Abrir repositório do FiGif no GitHub"
      >
        <Link size={16} strokeWidth={2.5} />
        GitHub
      </a>
    </div>
  </div>
</footer>

{#if analyticsEnabled}
  <CookieConsentBanner
    status={cookieConsentStatus}
    isOpen={cookieBannerOpen}
    onAccept={acceptAnalyticsCookies}
    onReject={rejectAnalyticsCookies}
    onClose={closeCookieBanner}
  />
{/if}
