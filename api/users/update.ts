import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, fields } = req.body;

    if (!userId || !fields) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Build dynamic update
    const allowedFields = ['name', 'age', 'weight', 'height', 'gender', 'activity_level', 'goal', 'sport'];
    const fieldMap: Record<string, string> = {
      activityLevel: 'activity_level',
    };

    const updates: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(fields)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates.push(dbField);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Build the SET clause dynamically
    const setClauses = updates.map((field, index) => `${field} = $${index + 1}`);
    setClauses.push('updated_at = NOW()');
    const setClause = setClauses.join(', ');
    values.push(userId);

    // Use raw query for dynamic field names
    const query = `UPDATE users SET ${setClause} WHERE id = $${values.length}`;
    await sql(query, values as any[]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
