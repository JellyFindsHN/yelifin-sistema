// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { neon } from "@neondatabase/serverless";
import { seedDefaultCategories } from "@/lib/seed-default-categories";

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

    // ── 0. Validar y limpiar registros huérfanos ──────────────────
    const [existingUser] = await sql`
      SELECT id, firebase_uid, email FROM users WHERE email = ${email} LIMIT 1
    `;

    if (existingUser) {
      // Usuario existe en PostgreSQL, verificar si existe en Firebase
      let firebaseUserExists = false;
      
      // Validar que firebase_uid no sea null o inválido
      if (!existingUser.firebase_uid || existingUser.firebase_uid.trim() === '') {
        console.log(`⚠️ Usuario con firebase_uid inválido: ${email}`);
        // Proceder directamente a limpieza (no intentar verificar en Firebase)
      } else {
        try {
          await adminAuth.getUser(existingUser.firebase_uid);
          firebaseUserExists = true;
        } catch (fbError: any) {
          if (fbError.code !== 'auth/user-not-found') {
            // Error diferente a "usuario no encontrado"
            throw fbError;
          }
          // Si es 'auth/user-not-found', firebaseUserExists sigue siendo false
        }
      }

      if (firebaseUserExists) {
        // Usuario existe correctamente en ambos sistemas
        return NextResponse.json(
          { error: "Este correo ya está registrado" },
          { status: 409 }
        );
      }

      // Usuario existe en PostgreSQL pero NO en Firebase (estado inconsistente)
      // Proceder a eliminar TODOS los registros relacionados
      console.log(`🗑️ Limpiando registros huérfanos para: ${email}`);
      
      try {
        await sql`BEGIN`;

        // Eliminar en orden inverso de dependencias (foreign keys)
        // Solo las tablas que existen en tu schema
        
        // 1. Eliminar transacciones (si existen)
        await sql`
          DELETE FROM transactions 
          WHERE account_id IN (
            SELECT id FROM accounts WHERE user_id = ${existingUser.id}
          )
        `;

        // 2. Eliminar categorías
        await sql`
          DELETE FROM transaction_categories 
          WHERE user_id = ${existingUser.id}
        `;

        // 3. Eliminar cuentas
        await sql`
          DELETE FROM accounts 
          WHERE user_id = ${existingUser.id}
        `;

        // 4. Eliminar suscripción
        await sql`
          DELETE FROM user_subscriptions 
          WHERE user_id = ${existingUser.id}
        `;

        // 5. Eliminar perfil
        await sql`
          DELETE FROM user_profile 
          WHERE user_id = ${existingUser.id}
        `;

        // 6. Finalmente, eliminar usuario
        await sql`
          DELETE FROM users 
          WHERE id = ${existingUser.id}
        `;

        await sql`COMMIT`;
        
        console.log(`✅ Registros huérfanos eliminados para: ${email}`);
        
      } catch (cleanupError) {
        await sql`ROLLBACK`;
        console.error("❌ Error al limpiar registros huérfanos:", cleanupError);
        throw new Error("Error al limpiar datos inconsistentes");
      }

      // Después de la limpieza, continuar con el registro normal
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
          { error: "Este correo ya está registrado en Firebase" },
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

    // ── 3. Transacción PostgreSQL ──────────────────────────────────
    let newUser, subscription;

    try {
      await sql`BEGIN`;

      [newUser] = await sql`
        INSERT INTO users (firebase_uid, email, display_name)
        VALUES (${firebaseUid}, ${email}, ${display_name})
        RETURNING id, firebase_uid, email, display_name, created_at
      `;

      await sql`
        INSERT INTO user_profile (user_id, business_name)
        VALUES (${newUser.id}, ${business_name})
      `;

      [subscription] = await sql`
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

      await seedDefaultCategories(newUser.id, sql);

      await sql`
        INSERT INTO accounts (user_id, name, type, balance)
        VALUES (${newUser.id}, 'Efectivo', 'CASH', 0)
      `;

      await sql`COMMIT`;

    } catch (txError) {
      await sql`ROLLBACK`;
      throw txError;
    }

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

    // Rollback Firebase si se creó
    if (firebaseUid) {
      try {
        await adminAuth.deleteUser(firebaseUid);
        console.log("🔄 Rollback Firebase: usuario eliminado");
      } catch (rollbackError) {
        console.error("❌ Error en rollback Firebase:", rollbackError);
      }
    }

    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Este correo ya está registrado" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear la cuenta. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}