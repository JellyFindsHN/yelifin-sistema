// proxy.ts
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["", "/login", "/register", "/forgot-password"];
const AUTH_ONLY_PATHS = ["/verify-email", "/onboarding"];

type VerifiedTokenPayload = {
  aud?: string;
  exp?: number;
  email_verified?: boolean;
  [key: string]: any;
};

type VerifiedTokenResult =
  | { valid: true; payload: VerifiedTokenPayload }
  | { valid: false };

// ── Verificación JWT manual (Edge-compatible) ──────────────────────────
// Firebase ID tokens son JWTs firmados con RS256 por Google
async function verifyFirebaseToken(token: string): Promise<VerifiedTokenResult> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false };

    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(
      atob(headerB64.replace(/-/g, "+").replace(/_/g, "/"))
    );
    const payload: VerifiedTokenPayload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );

    const now = Math.floor(Date.now() / 1000);

    if (!payload.exp || payload.exp < now) return { valid: false };
    if (payload.aud !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { valid: false };
    }

    const keysRes = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
      { next: { revalidate: 3600 } }
    );

    if (!keysRes.ok) return { valid: false };

    const keys = await keysRes.json();
    const certPem = keys[header.kid];
    if (!certPem) return { valid: false };

    const certDer = pemToDer(certPem);
    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      certDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signature,
      data
    );

    if (!isValid) return { valid: false };

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/, "")
    .replace(/-----END CERTIFICATE-----/, "")
    .replace(/\s/g, "");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function base64UrlDecode(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

// ── Middleware ─────────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  const isPublic = PUBLIC_PATHS.some((p) =>
    p === "" ? pathname === "/" : pathname.startsWith(p)
  );

  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p));

  // Sin cookie → dejar pasar
  if (!token) return NextResponse.next();

  const result = await verifyFirebaseToken(token);

  // Token inválido o expirado → tratar como sin sesión
  if (!result.valid) {
    return NextResponse.next();
  }

  const emailVerified = result.payload.email_verified === true;

  // Usuario autenticado pero NO verificado:
  // solo puede entrar a /verify-email
  if (!emailVerified) {
    if (!pathname.startsWith("/verify-email")) {
      return NextResponse.redirect(new URL("/verify-email", request.url));
    }
    return NextResponse.next();
  }

  // Si ya verificó email y entra a páginas públicas, revisar onboarding
  if (isPublic) {
    try {
      const res = await fetch(new URL("/api/onboarding", request.url), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();

        if (!data?.data?.onboarding_completed) {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
      }
    } catch {
      // Si falla el fetch, usar fallback al dashboard
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Si intenta entrar a /verify-email ya estando verificado, redirigir según onboarding
  if (pathname.startsWith("/verify-email")) {
    try {
      const res = await fetch(new URL("/api/onboarding", request.url), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();

        if (!data?.data?.onboarding_completed) {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
      }
    } catch {
      // fallback al dashboard
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Para rutas privadas que no son /verify-email ni /onboarding,
  // validar si el onboarding ya fue completado
  if (!isAuthOnly) {
    try {
      const res = await fetch(new URL("/api/onboarding", request.url), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();

        if (!data?.data?.onboarding_completed) {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
      }
    } catch {
      // Si falla el fetch, dejamos pasar
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};