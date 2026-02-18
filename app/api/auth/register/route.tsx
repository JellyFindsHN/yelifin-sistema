// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  let firebaseUid: string | null = null;

  try {
    const { email, password, display_name, business_name } = await req.json();

    // ── Validaciones básicas ──────────────────────────────────────
    if (!email || !password || !display_name || !business_name) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // ── 1. Crear usuario en Firebase ──────────────────────────────
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.createUser({
        email,
        password,
        displayName: display_name,
      });
      firebaseUid = firebaseUser.uid;
    } catch (firebaseError: any) {
      if (firebaseError.code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "Este correo ya está registrado" },
          { status: 409 }
        );
      }
      throw firebaseError;
    }

    // ── 2. Obtener el plan trial ───────────────────────────────────
    const [trialPlan] = await sql`
      SELECT id FROM subscription_plans
      WHERE slug = 'trial' AND is_active = TRUE
      LIMIT 1
    `;

    if (!trialPlan) {
      throw new Error("Plan trial no encontrado");
    }

    // ── 3. Insertar en PostgreSQL (todo en una transacción) ────────
    const [newUser] = await sql`
      INSERT INTO users (firebase_uid, email, display_name)
      VALUES (${firebaseUid}, ${email}, ${display_name})
      RETURNING id, firebase_uid, email, display_name, created_at
    `;

    await sql`
      INSERT INTO user_profile (user_id, business_name)
      VALUES (${newUser.id}, ${business_name})
    `;

    const [subscription] = await sql`
      INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        provider
      )
      VALUES (
        ${newUser.id},
        ${trialPlan.id},
        'TRIAL',
        'NONE'
      )
      RETURNING id, status, created_at
    `;

    // ── 4. Respuesta ───────────────────────────────────────────────
    return NextResponse.json(
      {
        message: "Cuenta creada exitosamente",
        data: {
          user: {
            id: newUser.id,
            firebase_uid: newUser.firebase_uid,
            email: newUser.email,
            display_name: newUser.display_name,
          },
          subscription: {
            id: subscription.id,
            status: subscription.status,
          },
        },
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("❌ Error en registro:", error);

    // Rollback: si Firebase se creó pero PostgreSQL falló, eliminar de Firebase
    if (firebaseUid) {
      try {
        await adminAuth.deleteUser(firebaseUid);
        console.log("🔄 Rollback Firebase: usuario eliminado");
      } catch (rollbackError) {
        console.error("❌ Error en rollback Firebase:", rollbackError);
      }
    }

    return NextResponse.json(
      { error: "Error al crear la cuenta. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}