import { adminAuth } from '@/lib/firebase-admin';

export async function GET() {
  try {
    // Intentar listar usuarios (solo para probar conexión)
    const listUsersResult = await adminAuth.listUsers(1);

    return Response.json({
      success: true,
      message: 'Firebase Admin conectado correctamente',
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
