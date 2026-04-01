import Clarity from "@microsoft/clarity";

export type CookieConsentStatus = "accepted" | "rejected";

const STORAGE_KEY = "figif.cookie-consent";
const ANALYTICS_ENABLED_IN_ENV = import.meta.env.PROD;
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim() || "";
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || "";
const CLARITY_COOKIE_NAMES = [
  "_clck",
  "_clsk",
  "CLID",
  "ANONCHK",
  "MR",
  "MUID",
  "SM",
] as const;
const GOOGLE_COOKIE_PREFIXES = ["_ga", "_gid", "_gat", "_gac_", "_gcl_"] as const;
const GOOGLE_SCRIPT_ID = "figif-google-tag";

type ClarityConsentOptions = {
  ad_Storage: "granted" | "denied";
  analytics_Storage: "granted" | "denied";
};

type GoogleConsentOptions = {
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  analytics_storage: "granted" | "denied";
};

const DENIED_CONSENT: ClarityConsentOptions = {
  ad_Storage: "denied",
  analytics_Storage: "denied",
};

const GRANTED_CONSENT: ClarityConsentOptions = {
  ad_Storage: "denied",
  analytics_Storage: "granted",
};

const GOOGLE_DENIED_CONSENT: GoogleConsentOptions = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
};

const GOOGLE_GRANTED_CONSENT: GoogleConsentOptions = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "granted",
};

let clarityInitialized = false;
let googleInitialized = false;

declare global {
  interface Window {
    dataLayer: unknown[][];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

function canUseBrowserApis(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function ensureClarityInitialized(): boolean {
  if (!isClarityConfigured() || clarityInitialized) return clarityInitialized;

  Clarity.init(CLARITY_PROJECT_ID);
  clarityInitialized = true;
  return true;
}

function isGoogleAnalyticsConfigured(): boolean {
  return (
    ANALYTICS_ENABLED_IN_ENV && canUseBrowserApis() && GA_MEASUREMENT_ID.length > 0
  );
}

function defineGtag() {
  if (!window.dataLayer) window.dataLayer = [];
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
  }
}

function setGoogleAnalyticsDisabled(disabled: boolean) {
  if (!isGoogleAnalyticsConfigured()) return;
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = disabled;
}

function injectGoogleAnalyticsScript() {
  if (document.getElementById(GOOGLE_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.id = GOOGLE_SCRIPT_ID;
  (document.head || document.documentElement).appendChild(script);
}

function ensureGoogleAnalyticsInitialized(): boolean {
  if (!isGoogleAnalyticsConfigured()) return false;
  if (googleInitialized) return true;

  defineGtag();
  setGoogleAnalyticsDisabled(false);
  window.gtag?.("consent", "default", GOOGLE_DENIED_CONSENT);
  injectGoogleAnalyticsScript();
  window.gtag?.("js", new Date());
  window.gtag?.("config", GA_MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  googleInitialized = true;
  return true;
}

function applyConsentState(consent: ClarityConsentOptions) {
  if (!ensureClarityInitialized()) return;
  Clarity.consentV2(consent);
}

function applyGoogleConsentState(consent: GoogleConsentOptions) {
  if (!googleInitialized || !window.gtag) return;
  window.gtag("consent", "update", consent);
}

function getCookieDomains(hostname: string): string[] {
  const parts = hostname.split(".").filter(Boolean);
  const domains = new Set<string>([""]);

  for (let index = 0; index < parts.length - 1; index += 1) {
    const domain = parts.slice(index).join(".");
    domains.add(domain);
    domains.add(`.${domain}`);
  }

  return [...domains];
}

function expireCookie(name: string, domain: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const domainAttribute = domain ? `; Domain=${domain}` : "";

  document.cookie =
    `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/` +
    `${domainAttribute}; SameSite=Lax${secure}`;
}

function clearCookies(names: string[]) {
  if (!canUseBrowserApis()) return;

  for (const cookieName of names) {
    for (const domain of getCookieDomains(window.location.hostname)) {
      expireCookie(cookieName, domain);
    }
  }
}

function clearClarityCookies() {
  clearCookies([...CLARITY_COOKIE_NAMES]);
}

function clearGoogleAnalyticsCookies() {
  if (!canUseBrowserApis()) return;

  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter(Boolean)
    .filter((cookieName) =>
      GOOGLE_COOKIE_PREFIXES.some(
        (prefix) => cookieName === prefix || cookieName.startsWith(prefix),
      ),
    );

  clearCookies([...new Set(cookieNames)]);
}

function startGoogleAnalyticsTracking() {
  if (!ensureGoogleAnalyticsInitialized()) return;

  setGoogleAnalyticsDisabled(false);
  applyGoogleConsentState(GOOGLE_GRANTED_CONSENT);
}

function stopGoogleAnalyticsTracking() {
  if (!isGoogleAnalyticsConfigured()) return;

  if (googleInitialized) {
    applyGoogleConsentState(GOOGLE_DENIED_CONSENT);
  }

  setGoogleAnalyticsDisabled(true);
  clearGoogleAnalyticsCookies();
}

export function isAnalyticsConfigured(): boolean {
  return isClarityConfigured() || isGoogleAnalyticsConfigured();
}

function isClarityConfigured(): boolean {
  return (
    ANALYTICS_ENABLED_IN_ENV &&
    canUseBrowserApis() &&
    CLARITY_PROJECT_ID.length > 0
  );
}

export function getStoredCookieConsent(): CookieConsentStatus | null {
  if (!canUseBrowserApis()) return null;

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    return storedValue === "accepted" || storedValue === "rejected"
      ? storedValue
      : null;
  } catch {
    return null;
  }
}

export function initializeAnalyticsConsent(): CookieConsentStatus | null {
  if (!isAnalyticsConfigured()) return null;

  const storedConsent = getStoredCookieConsent();

  if (isClarityConfigured()) {
    applyConsentState(
      storedConsent === "accepted" ? GRANTED_CONSENT : DENIED_CONSENT,
    );

    if (storedConsent === "rejected") {
      Clarity.consent(false);
      clearClarityCookies();
    }
  }

  if (storedConsent === "accepted") {
    startGoogleAnalyticsTracking();
  } else if (storedConsent === "rejected") {
    stopGoogleAnalyticsTracking();
  }

  return storedConsent;
}

export function acceptCookieConsent(): CookieConsentStatus {
  if (!isAnalyticsConfigured()) return "accepted";

  window.localStorage.setItem(STORAGE_KEY, "accepted");

  if (isClarityConfigured()) {
    applyConsentState(GRANTED_CONSENT);
  }

  startGoogleAnalyticsTracking();
  return "accepted";
}

export function rejectCookieConsent(): CookieConsentStatus {
  if (!isAnalyticsConfigured()) return "rejected";

  window.localStorage.setItem(STORAGE_KEY, "rejected");

  if (isClarityConfigured()) {
    applyConsentState(DENIED_CONSENT);
    Clarity.consent(false);
    clearClarityCookies();
  }

  stopGoogleAnalyticsTracking();
  return "rejected";
}
