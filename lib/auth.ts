import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';
import { query } from './db';

export interface AuthUser {
  uid: string;
  email: string;
  userId: number;
  organizationId: number;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

/**
 * Verifica el token de Firebase y obtiene datos del usuario desde la BD
 */
export async function verifyAuth(request: NextRequest): Promise<AuthUser> {
  try {
    // Obtener token del header Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.substring(7);

    // Verificar token con Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Obtener usuario y organización de la base de datos
    const users = await query<{
      user_id: number;
      organization_id: number;
      role: string;
      email: string;
    }>(
      `
      SELECT 
        u.id as user_id,
        om.organization_id,
        om.role,
        u.email
      FROM users u
      INNER JOIN organization_members om ON u.id = om.user_id
      WHERE u.firebase_uid = $1
      LIMIT 1
      `,
      [decodedToken.uid]
    );

    if (!users || users.length === 0) {
      throw new Error('User not found in database');
    }

    const user = users[0];

    return {
      uid: decodedToken.uid,
      email: user.email,
      userId: user.user_id,
      organizationId: user.organization_id,
      role: user.role as AuthUser['role'],
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Authentication failed');
  }
}

/**
 * Respuesta de error 401 (No autorizado)
 */
export function unauthorizedResponse(message: string = 'No autorizado') {
  return Response.json({ error: message }, { status: 401 });
}

/**
 * Respuesta de error 403 (Prohibido)
 */
export function forbiddenResponse(message: string = 'Prohibido') {
  return Response.json({ error: message }, { status: 403 });
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export function hasRole(user: AuthUser, roles: AuthUser['role'][]): boolean {
  return roles.includes(user.role);
}