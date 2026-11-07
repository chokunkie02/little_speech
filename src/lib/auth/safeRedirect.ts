export function safeAuthRedirect(value: string | null): string | null {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\") || [...value].some((character) => character.charCodeAt(0) < 32)) {
    return null;
  }
  return value;
}
