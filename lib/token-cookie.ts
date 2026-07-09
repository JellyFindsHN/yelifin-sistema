// lib/token-cookie.ts
// Único dueño de la cookie `token` que lee el proxy (middleware).
// Debe setearse desde el cliente (no httpOnly) porque el SDK de Firebase
// refresca el ID token cada hora y hay que re-escribir la cookie.

const MAX_AGE = 3600; // igual a la vida del ID token de Firebase

export function setTokenCookie(token: string) {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `token=${token}; path=/; max-age=${MAX_AGE}; SameSite=Lax${secure}`;
}

export function clearTokenCookie() {
  document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
}
