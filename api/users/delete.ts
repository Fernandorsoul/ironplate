import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    // Verificar se o usuário existe
    const users = await sql`
      SELECT id FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Deletar dados relacionados em ordem (devido a foreign keys)
    // 1. Deletar refeições e alimentos
    await sql`DELETE FROM meal_foods WHERE meal_id IN (SELECT id FROM meals WHERE user_id = ${userId})`;
    await sql`DELETE FROM meals WHERE user_id = ${userId}`;

    // 2. Deletar histórico de peso
    await sql`DELETE FROM weight_history WHERE user_id = ${userId}`;

    // 3. Deletar medidas corporais
    await sql`DELETE FROM body_measurements WHERE user_id = ${userId}`;

    // 4. Deletar alimentos customizados
    await sql`DELETE FROM custom_foods WHERE user_id = ${userId}`;

    // 5. Deletar planos de refeição
    await sql`DELETE FROM meal_plans WHERE user_id = ${userId}`;

    // 6. Deletar logs diários
    await sql`DELETE FROM daily_logs WHERE user_id = ${userId}`;

    // 7. Deletar o usuário
    await sql`DELETE FROM users WHERE id = ${userId}`;

    return res.status(200).json({
      success: true,
      message: 'Account and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
