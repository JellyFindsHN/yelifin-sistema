// app/api/admin/storage/route.ts
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyAdmin, createErrorResponse, isAuthSuccess } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!isAuthSuccess(auth)) return createErrorResponse(auth.error, auth.status);

  try {
    const [dbSize] = await sql`
      SELECT pg_database_size(current_database()) AS size_bytes
    `;

    const tableSizes = await sql`
      SELECT
        tablename,
        pg_total_relation_size('public.' || tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
      LIMIT 15
    `;

    const topUsers = await sql`
      SELECT
        u.id,
        u.email,
        COALESCE(up.business_name, u.display_name, u.email) AS display_name,
        (
          (SELECT COUNT(*) FROM products                WHERE user_id = u.id)::int +
          (SELECT COUNT(*) FROM sales                   WHERE user_id = u.id)::int +
          (SELECT COUNT(*) FROM transactions            WHERE user_id = u.id)::int +
          (SELECT COUNT(*) FROM customers               WHERE user_id = u.id)::int +
          (SELECT COUNT(*) FROM credit_card_transactions WHERE user_id = u.id)::int +
          (SELECT COUNT(*) FROM inventory_movements     WHERE user_id = u.id)::int +
          (SELECT COUNT(*) FROM events                  WHERE user_id = u.id)::int
        ) AS total_rows
      FROM users u
      LEFT JOIN user_profile up ON up.user_id = u.id
      ORDER BY total_rows DESC
      LIMIT 10
    `;

    const imageCount = await sql`
      SELECT
        (SELECT COUNT(*) FROM users        WHERE photo_url          IS NOT NULL)::int AS user_photos,
        (SELECT COUNT(*) FROM user_profile WHERE business_logo_url  IS NOT NULL)::int AS logos,
        (SELECT COUNT(*) FROM products     WHERE image_url          IS NOT NULL)::int AS product_images
    `;

    return Response.json({
      db_size_bytes: Number(dbSize.size_bytes),
      table_sizes:   tableSizes.map((r) => ({
        tablename:  r.tablename,
        size_bytes: Number(r.size_bytes),
      })),
      top_users:   topUsers.map((r) => ({
        id:           Number(r.id),
        email:        r.email,
        display_name: r.display_name,
        total_rows:   Number(r.total_rows),
      })),
      image_counts: {
        user_photos:    Number(imageCount[0].user_photos),
        logos:          Number(imageCount[0].logos),
        product_images: Number(imageCount[0].product_images),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/storage:", error);
    return createErrorResponse("Error al obtener datos de almacenamiento", 500);
  }
}
