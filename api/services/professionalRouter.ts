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
import availabilityHandler from '../professionals/availability';
import appointmentsHandler from '../professionals/appointments';
import notificationsHandler from '../professionals/notifications';
import {
  handleAdministrativeIdentifier,
  handleAdministrativeIdentifierSearch,
} from './administrativeIdentifier';
import sharedDataHandler from '../professionals/shared-data';
import { rateLimit } from '../middleware/rateLimit';

const identifierSearchRateLimit = rateLimit({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Too many administrative searches. Try again later.',
  identity: req => typeof (req as any).auth?.userId === 'string' ? (req as any).auth.userId : null,
});

const identifierWriteRateLimit = rateLimit({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000,
  message: 'Too many administrative identifier updates. Try again later.',
  identity: req => typeof (req as any).auth?.userId === 'string' ? (req as any).auth.userId : null,
});

export async function handleProfessionalRoutes(req: VercelRequest, res: VercelResponse) {
  const operation = typeof req.query.operation === 'string' ? req.query.operation : 'profile';
  if (operation === 'profile') return profileHandler(req, res);
  if (operation === 'links') return linksHandler(req, res);
  if (operation === 'review') return reviewHandler(req, res);
  if (operation === 'nutrition-plans') return nutritionPlansHandler(req, res);
  if (operation === 'exercises') return exercisesHandler(req, res);
  if (operation === 'training-plans') return trainingPlansHandler(req, res);
  if (operation === 'training-executions') return trainingExecutionsHandler(req, res);
  if (operation === 'availability') return availabilityHandler(req, res);
  if (operation === 'appointments') return appointmentsHandler(req, res);
  if (operation === 'notifications') return notificationsHandler(req, res);
  if (operation === 'shared-data') return sharedDataHandler(req, res);
  if (operation === 'identifier-search') {
    if (applyCors(req, res, ['POST'])) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const identity = await requireAuth(req, res);
    if (!identity) return;
    const sql = getSql();
    if (!sql) return res.status(500).json({ error: 'Database not configured' });
    try {
      return await identifierSearchRateLimit(req, res, () => (
        handleAdministrativeIdentifierSearch(req, res, sql, identity.userId)
      ));
    } catch (error) {
      console.error('Administrative identifier search error:', error);
      return res.status(500).json({ error: 'Administrative identifier service unavailable' });
    }
  }
  if (operation !== 'identifier') return res.status(404).json({ error: 'Unknown professional operation' });

  if (applyCors(req, res, ['GET', 'PUT', 'DELETE'])) return;
  if (!['GET', 'PUT', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const identity = await requireAuth(req, res);
  if (!identity) return;
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });
  try {
    return await identifierWriteRateLimit(req, res, () => (
      handleAdministrativeIdentifier(req, res, sql, identity.userId)
    ));
  } catch (error) {
    console.error('Administrative identifier error:', error);
    if (error instanceof Error && error.message.includes('ADMIN_IDENTIFIER_')) {
      return res.status(500).json({ error: 'Administrative identifier service not configured' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
