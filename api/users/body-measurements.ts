import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generalRateLimit } from '../middleware/rateLimit';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'POST'])) return;

  const sql = getSql();
  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  await generalRateLimit(req, res, async () => {
    if (req.method === 'GET') {
      try {
        const { userId, limit = 30 } = req.query;

        if (!userId) {
          return res.status(400).json({ error: 'Missing userId parameter' });
        }

        const measurements = await sql`
          SELECT * FROM body_measurements WHERE user_id = ${userId as string} ORDER BY date DESC LIMIT ${Number(limit)}
        `;

        const result = (measurements as any[]).map(m => ({
          date: m.date,
          weight: m.weight,
          height: m.height || undefined,
          bodyFat: m.body_fat || undefined,
          bodyFatMethod: m.body_fat_method || 'visual',
          resistance: m.resistance || undefined,
          reactance: m.reactance || undefined,
          phaseAngle: m.phase_angle || undefined,
          muscleMass: m.muscle_mass || undefined,
          skeletalMuscle: m.skeletal_muscle || undefined,
          waterPercent: m.water_percent || undefined,
          waterKg: m.water_kg || undefined,
          boneMass: m.bone_mass || undefined,
          proteinPercent: m.protein_percent || undefined,
          proteinMass: m.protein_mass || undefined,
          basalMetabolism: m.basal_metabolism || undefined,
          visceralFat: m.visceral_fat || undefined,
          triceps: m.triceps || undefined,
          biceps: m.biceps || undefined,
          subscapular: m.subscapular || undefined,
          suprailiac: m.suprailiac || undefined,
          abdominal: m.abdominal || undefined,
          chestSkinfold: m.chest_skinfold || undefined,
          axillaryMid: m.axillary_mid || undefined,
          thighSkinfold: m.thigh_skinfold || undefined,
          calfSkinfold: m.calf_skinfold || undefined,
          armRelaxedRight: m.arm_relaxed_right || undefined,
          armRelaxedLeft: m.arm_relaxed_left || undefined,
          armFlexedRight: m.arm_flexed_right || undefined,
          armFlexedLeft: m.arm_flexed_left || undefined,
          forearmRight: m.forearm_right || undefined,
          forearmLeft: m.forearm_left || undefined,
          wristRight: m.wrist_right || undefined,
          wristLeft: m.wrist_left || undefined,
          chestCircumference: m.chest_circumference || undefined,
          waistCircumference: m.waist_circumference || undefined,
          abdomenCircumference: m.abdomen_circumference || undefined,
          hipCircumference: m.hip_circumference || undefined,
          thighProximalRight: m.thigh_proximal_right || undefined,
          thighProximalLeft: m.thigh_proximal_left || undefined,
          thighMidRight: m.thigh_mid_right || undefined,
          thighMidLeft: m.thigh_mid_left || undefined,
          calfRight: m.calf_right || undefined,
          calfLeft: m.calf_left || undefined,
          ankleRight: m.ankle_right || undefined,
          ankleLeft: m.ankle_left || undefined,
          leanMass: m.lean_mass || undefined,
          fatMass: m.fat_mass || undefined,
          bmi: m.bmi || undefined,
          waistHipRatio: m.waist_hip_ratio || undefined,
          notes: m.notes || undefined,
        }));

        return res.status(200).json(result);
      } catch (error) {
        console.error('Get body measurements error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method === 'POST') {
      try {
        const { userId, measurement } = req.body;

        if (!userId || !measurement) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = `${userId}_${measurement.date}`;
        const h = measurement.height || 170;
        const leanMass = measurement.weight * (1 - (measurement.bodyFat || 0) / 100);
        const fatMass = measurement.weight * ((measurement.bodyFat || 0) / 100);
        const bmi = measurement.weight / Math.pow(h / 100, 2);
        const waistHipRatio = (measurement.waistCircumference && measurement.hipCircumference)
          ? measurement.waistCircumference / measurement.hipCircumference : undefined;

        await sql`
          INSERT OR REPLACE INTO body_measurements (
            id, user_id, date, weight, height, body_fat, body_fat_method,
            resistance, reactance, phase_angle,
            muscle_mass, skeletal_muscle, water_percent, water_kg,
            bone_mass, protein_percent, protein_mass, basal_metabolism, visceral_fat,
            triceps, biceps, subscapular, suprailiac, abdominal, chest_skinfold,
            axillary_mid, thigh_skinfold, calf_skinfold,
            arm_relaxed_right, arm_relaxed_left, arm_flexed_right, arm_flexed_left,
            forearm_right, forearm_left, wrist_right, wrist_left,
            chest_circumference, waist_circumference, abdomen_circumference, hip_circumference,
            thigh_proximal_right, thigh_proximal_left, thigh_mid_right, thigh_mid_left,
            calf_right, calf_left, ankle_right, ankle_left,
            lean_mass, fat_mass, bmi, waist_hip_ratio, notes
          ) VALUES (
            ${id}, ${userId}, ${measurement.date}, ${measurement.weight}, ${measurement.height || null},
            ${measurement.bodyFat || null}, ${measurement.bodyFatMethod || 'visual'},
            ${measurement.resistance || null}, ${measurement.reactance || null}, ${measurement.phaseAngle || null},
            ${measurement.muscleMass || null}, ${measurement.skeletalMuscle || null},
            ${measurement.waterPercent || null}, ${measurement.waterKg || null},
            ${measurement.boneMass || null}, ${measurement.proteinPercent || null},
            ${measurement.proteinMass || null}, ${measurement.basalMetabolism || null},
            ${measurement.visceralFat || null},
            ${measurement.triceps || null}, ${measurement.biceps || null}, ${measurement.subscapular || null},
            ${measurement.suprailiac || null}, ${measurement.abdominal || null}, ${measurement.chestSkinfold || null},
            ${measurement.axillaryMid || null}, ${measurement.thighSkinfold || null}, ${measurement.calfSkinfold || null},
            ${measurement.armRelaxedRight || null}, ${measurement.armRelaxedLeft || null},
            ${measurement.armFlexedRight || null}, ${measurement.armFlexedLeft || null},
            ${measurement.forearmRight || null}, ${measurement.forearmLeft || null},
            ${measurement.wristRight || null}, ${measurement.wristLeft || null},
            ${measurement.chestCircumference || null}, ${measurement.waistCircumference || null},
            ${measurement.abdomenCircumference || null}, ${measurement.hipCircumference || null},
            ${measurement.thighProximalRight || null}, ${measurement.thighProximalLeft || null},
            ${measurement.thighMidRight || null}, ${measurement.thighMidLeft || null},
            ${measurement.calfRight || null}, ${measurement.calfLeft || null},
            ${measurement.ankleRight || null}, ${measurement.ankleLeft || null},
            ${leanMass}, ${fatMass}, ${bmi}, ${waistHipRatio || null}, ${measurement.notes || null}
          )
        `;

        return res.status(201).json({ success: true });
      } catch (error) {
        console.error('Save body measurement error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
