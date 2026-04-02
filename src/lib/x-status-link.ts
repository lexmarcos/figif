const SHARED_X_STATUS_PATH_PATTERN = /^\/i\/status\/(\d+)\/?$/;
const X_STATUS_ID_PATTERN = /\/status\/(\d+)/;

export function buildXStatusUrl(statusId: string): string {
  return `https://x.com/i/status/${statusId}`;
}

export function getSharedXStatusUrlFromPathname(
  pathname: string,
): string | null {
  const match = pathname.match(SHARED_X_STATUS_PATH_PATTERN);
  if (!match) return null;

  return buildXStatusUrl(match[1]);
}

export function normalizeXStatusUrl(value: string): string {
  const trimmedValue = value.trim();
  const statusId = trimmedValue.match(X_STATUS_ID_PATTERN)?.[1];

  if (!statusId) return trimmedValue;

  return buildXStatusUrl(statusId);
}
