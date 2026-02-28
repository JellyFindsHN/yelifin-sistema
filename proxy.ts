// proxy.ts
import { NextRequest, NextResponse } from "next/server"

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ["", "/login", "/register", "/forgot-password"]

// Rutas de auth que no requieren onboarding completo
const AUTH_ONLY_PATHS = ["/verify-email", "/onboarding"]

// Esta es la función que Next ejecuta en cada request del proxy
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Dejar pasar assets y rutas de API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Obtener token de la cookie
  const token =
    request.cookies.get("__session")?.value ??
    request.cookies.get("token")?.value

  const isPublic = PUBLIC_PATHS.some((p) =>
    p === "" ? pathname === "/" : pathname.startsWith(p)
  )
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))

  // Sin token → solo puede estar en rutas públicas o de auth-only
  if (!token) {
    if (isPublic || isAuthOnly) return NextResponse.next()
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Con token en ruta pública → redirigir al dashboard
  if (token && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Rutas del dashboard → verificar onboarding
  if (!isPublic && !isAuthOnly) {
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
      // Si falla el check, dejar pasar (fail-open)
    }
  }

  return NextResponse.next()
}

// Igual que antes: qué rutas pasan por el proxy
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}