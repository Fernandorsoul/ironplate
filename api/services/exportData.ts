export function buildExportFileName(date: Date = new Date()): string {
  return `ironplate-export-${date.toISOString().slice(0, 10)}.json`;
}
export function parseMealsJson(raw: unknown): any[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildExportPayload(parts: {
  user: Record<string, unknown>;
  profile: Record<string, unknown>;
  dailyLogs: any[];
  weightHistory: any[];
  bodyMeasurements: any[];
  customFoods: any[];
  mealPlans: any[];
  professionalNutritionPlans?: any[];
  professionalExercises?: any[];
  professionalTrainingPlans?: any[];
  professionalTrainingExecutions?: any[];
  professionalAvailabilityRules?: any[];
  professionalScheduleBlockouts?: any[];
  professionalAppointments?: any[];
  professionalAppointmentEvents?: any[];
  professionalNotifications?: any[];
  professionalLinks?: any[];
  professionalLinkInvitations?: any[];
  consentHistory?: any[];
  auditHistory?: any[];
  administrativeIdentifiers?: any[];
  exportedAt?: string;
}): Record<string, unknown> {
  return {
    exportedAt: parts.exportedAt ?? new Date().toISOString(),
    formatVersion: 1,
    user: parts.user,
    profile: parts.profile,
    dailyLogs: parts.dailyLogs,
    weightHistory: parts.weightHistory,
    bodyMeasurements: parts.bodyMeasurements,
    customFoods: parts.customFoods,
    mealPlans: parts.mealPlans,
    professionalNutritionPlans: parts.professionalNutritionPlans ?? [],
    professionalExercises: parts.professionalExercises ?? [],
    professionalTrainingPlans: parts.professionalTrainingPlans ?? [],
    professionalTrainingExecutions: parts.professionalTrainingExecutions ?? [],
    professionalAvailabilityRules: parts.professionalAvailabilityRules ?? [],
    professionalScheduleBlockouts: parts.professionalScheduleBlockouts ?? [],
    professionalAppointments: parts.professionalAppointments ?? [],
    professionalAppointmentEvents: parts.professionalAppointmentEvents ?? [],
    professionalNotifications: parts.professionalNotifications ?? [],
    professionalLinks: parts.professionalLinks ?? [],
    professionalLinkInvitations: parts.professionalLinkInvitations ?? [],
    consentHistory: parts.consentHistory ?? [],
    auditHistory: parts.auditHistory ?? [],
    administrativeIdentifiers: parts.administrativeIdentifiers ?? [],
  };
}
