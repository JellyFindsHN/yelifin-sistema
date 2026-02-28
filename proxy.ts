// proxy.ts
import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ["", "/login", "/register", "/forgot-password"]
const AUTH_ONLY_PATHS = ["/verify-email", "/onboarding"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // OJO: esto solo mira cookies, no el estado de Firebase en el cliente
  const token =
    request.cookies.get("__session")?.value ??
    request.cookies.get("token")?.value

  const isPublic = PUBLIC_PATHS.some((p) =>
    p === "" ? pathname === "/" : pathname.startsWith(p)
  )
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))

  // 1) Si NO hay token, ya no redirigimos a /login.
  // Dejamos que el front decida (useAuth ya hace redirect en el cliente).
  if (!token) {
    // Solo evitamos que un usuario logueado vuelva a /login
    if (isPublic || isAuthOnly) return NextResponse.next()
    return NextResponse.next()
  }

  // 2) Si HAY token y está en páginas públicas → mandamos al dashboard
  if (token && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // 3) Check de onboarding solo si hay token
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
      // Si falla, dejamos pasar igual
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}