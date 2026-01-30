import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { query, transaction } from "@/lib/db";
import { generateSlug } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar token de Firebase
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);

    // 2. Obtener datos del body
    const body = await request.json();
    const { firebase_uid, email, display_name, organization_name } = body;

    // Validaciones
    if (!firebase_uid || !email || !display_name || !organization_name) {
      return Response.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el UID del token coincida
    if (decodedToken.uid !== firebase_uid) {
      return Response.json(
        { error: "Token inválido" },
        { status: 401 }
      );
    }

    // 3. Crear usuario y organización en una transacción
    const result = await transaction(async (client) => {
      // Verificar si el usuario ya existe
      const existingUser = await client.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [firebase_uid]
      );

      if (existingUser.rows.length > 0) {
        throw new Error("El usuario ya existe");
      }

      // Crear usuario
      const userResult = await client.query(
        `
        INSERT INTO users (firebase_uid, email, display_name, is_active)
        VALUES ($1, $2, $3, true)
        RETURNING id, email, display_name
        `,
        [firebase_uid, email, display_name]
      );

      const user = userResult.rows[0];

      // Generar slug único para la organización
      let slug = generateSlug(organization_name);
      
      // Verificar si el slug ya existe
      let slugExists = await client.query(
        "SELECT id FROM organizations WHERE slug = $1",
        [slug]
      );

      // Si existe, agregar número al final
      let counter = 1;
      while (slugExists.rows.length > 0) {
        slug = `${generateSlug(organization_name)}-${counter}`;
        slugExists = await client.query(
          "SELECT id FROM organizations WHERE slug = $1",
          [slug]
        );
        counter++;
      }

      // Crear organización
      const orgResult = await client.query(
        `
        INSERT INTO organizations (name, slug)
        VALUES ($1, $2)
        RETURNING id, name, slug
        `,
        [organization_name, slug]
      );

      const organization = orgResult.rows[0];

      // Crear membresía (usuario como OWNER)
      await client.query(
        `
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES ($1, $2, 'OWNER')
        `,
        [organization.id, user.id]
      );

      return {
        user,
        organization,
      };
    });

    // 4. Retornar respuesta exitosa
    return Response.json(
      {
        message: "Usuario creado exitosamente",
        user: result.user,
        organization: result.organization,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error en registro:", error);
    
    return Response.json(
      {
        error: "Error al crear la cuenta",
        message: error.message || "Error desconocido",
      },
      { status: 500 }
    );
  }
}
