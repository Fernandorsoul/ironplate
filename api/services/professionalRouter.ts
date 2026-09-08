import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { requireAuth } from '../middleware/auth';
import profileHandler from '../professionals/profile';
import linksHandler from '../professionals/links';
import reviewHandler from '../professionals/review';
import nutritionPlansHandler from '../professionals/nutrition-plans';
import exercisesHandler from '../professionals/exercises';
import trainingPlansHandler from '../professionals/training-plans';
import trainingExecutionsHandler from '../professionals/training-executions';
import { handleAdministrativeIdentifier } from './administrativeIdentifier';

export async function handleProfessionalRoutes(req: VercelRequest, res: VercelResponse) {
  const operation = typeof req.query.operation === 'string' ? req.query.operation : 'profile';
  if (operation === 'profile') return profileHandler(req, res);
  if (operation === 'links') return linksHandler(req, res);
  if (operation === 'review') return reviewHandler(req, res);
  if (operation === 'nutrition-plans') return nutritionPlansHandler(req, res);
  if (operation === 'exercises') return exercisesHandler(req, res);
  if (operation === 'training-plans') return trainingPlansHandler(req, res);
  if (operation === 'training-executions') return trainingExecutionsHandler(req, res);
  if (operation !== 'identifier') return res.status(404).json({ error: 'Unknown professional operation' });

  if (applyCors(req, res, ['GET', 'PUT'])) return;
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const identity = await requireAuth(req, res);
  if (!identity) return;
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });
  try {
    await handleAdministrativeIdentifier(req, res, sql, identity.userId);
  } catch (error) {
    console.error('Administrative identifier error:', error);
    if (error instanceof Error && error.message.includes('ADMIN_IDENTIFIER_PEPPER')) {
      return res.status(500).json({ error: 'Administrative identifier service not configured' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
