// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json(
        { error: "Token requerido" },
        { status: 400 }
      );
    }

    // 1. Verificar el token con Firebase Admin
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 401 }
      );
    }

    const { uid, email } = decodedToken;

    // 2. Verificar que el usuario existe en PostgreSQL y está activo
    const [user] = await sql`
      SELECT
        u.id,
        u.firebase_uid,
        u.email,
        u.display_name,
        u.is_active,
        up.business_name,
        us.status AS subscription_status,
        sp.slug  AS plan_slug
      FROM users u
      LEFT JOIN user_profile up ON up.user_id = u.id
      LEFT JOIN user_subscriptions us ON us.user_id = u.id
      LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE u.firebase_uid = ${uid}
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "Esta cuenta ha sido deshabilitada" },
        { status: 403 }
      );
    }

    // 3. Construir respuesta JSON
    const response = NextResponse.json({
      message: "Login exitoso",
      data: {
        user: {
          id: user.id,
          firebase_uid: user.firebase_uid,
          email: user.email,
          display_name: user.display_name,
          business_name: user.business_name,
        },
        subscription: {
          status: user.subscription_status,
          plan: user.plan_slug,
        },
      },
    });

    // 4. Setear cookie de sesión para que el proxy pueda leerla
    //    (el proxy está leyendo `token` y opcionalmente `__session`)
    const isProd = process.env.NODE_ENV === "production";

    response.cookies.set("token", idToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días, ajusta si quieres
    });

    // Si quieres compatibilidad extra, puedes duplicar en __session:
    // response.cookies.set("__session", idToken, {
    //   httpOnly: true,
    //   secure: isProd,
    //   sameSite: "lax",
    //   path: "/",
    //   maxAge: 60 * 60 * 24 * 7,
    // });

    return response;
  } catch (error: any) {
    console.error("❌ Error en login:", error);
    return NextResponse.json(
      { error: "Error al iniciar sesión. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}