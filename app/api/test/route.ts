import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT NOW() as current_time, version()');
    return Response.json({
      success: true,
      database: 'NeonDB PostgreSQL',
      time: result[0].current_time,
      version: result[0].version,
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