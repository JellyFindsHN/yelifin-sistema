// proxy.ts
import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS    = ["", "/login", "/register", "/forgot-password"]
const AUTH_ONLY_PATHS = ["/verify-email", "/onboarding"]

// ── Verificación JWT manual (Edge-compatible) ──────────────────────────
// Firebase ID tokens son JWTs firmados con RS256 por Google
async function verifyFirebaseToken(token: string): Promise<boolean> {
  try {
    // 1. Decodificar header para obtener el kid
    const [headerB64, payloadB64] = token.split(".")
    const header  = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")))
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")))

    // 2. Validar claims básicos
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return false                                    // expirado
    if (payload.aud !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return false // proyecto incorrecto

    // 3. Obtener clave pública de Google (cacheada por el CDN de Google)
    const keysRes = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
      { next: { revalidate: 3600 } } // cachear 1h
    )
    if (!keysRes.ok) return false
    const keys = await keysRes.json()
    const certPem = keys[header.kid]
    if (!certPem) return false

    // 4. Importar la clave pública y verificar la firma
    const certDer = pemToDer(certPem)
    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      certDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    )

    const data      = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    const signature = base64UrlDecode(token.split(".")[2])

    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, data)

  } catch {
    return false
  }
}

function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/, "")
    .replace(/-----END CERTIFICATE-----/, "")
    .replace(/\s/g, "")
  const binary = atob(base64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function base64UrlDecode(str: string): ArrayBuffer {
  const base64   = str.replace(/-/g, "+").replace(/_/g, "/")
  const padded   = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=")
  const binary   = atob(padded)
  const bytes    = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// ── Middleware ─────────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")   ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const token      = request.cookies.get("token")?.value
  const isPublic   = PUBLIC_PATHS.some((p) =>
    p === "" ? pathname === "/" : pathname.startsWith(p)
  )
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))

  // Sin cookie → dejar pasar (useAuth redirige en cliente)
  if (!token) return NextResponse.next()

  // Verificar token con clave pública de Google
  const isValid = await verifyFirebaseToken(token)

  // Token inválido o expirado → tratar como sin sesión
  if (!isValid) return NextResponse.next()

  // Token válido en página pública → ir al dashboard
  if (isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Token válido en dashboard → verificar onboarding
  if (!isAuthOnly) {
    try {
      const res = await fetch(new URL("/api/onboarding", request.url), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (!data?.data?.onboarding_completed) {
          return NextResponse.redirect(new URL("/onboarding", request.url))
        }
      }
    } catch {
      // Si falla el fetch, dejamos pasar
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}