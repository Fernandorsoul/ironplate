import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('student').notNull(),
  age: integer('age'),
  weight: doublePrecision('weight'),
  height: doublePrecision('height'),
  gender: text('gender').default('male'),
  activityLevel: text('activity_level').default('moderate'),
  goal: text('goal').default('maintenance'),
  sport: text('sport').default('bodybuilding'),
  photoUri: text('photo_uri'),
  targetWeightKg: doublePrecision('target_weight_kg'),
  hydrationGoalMl: doublePrecision('hydration_goal_ml'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastLogin: timestamp('last_login', { withTimezone: true }),
}, (table) => [uniqueIndex('users_email_unique').on(table.email)]);

export const dailyLogs = pgTable('daily_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  weight: doublePrecision('weight'),
  waterMl: doublePrecision('water_ml'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('daily_logs_user_date_unique').on(table.userId, table.date),
  index('daily_logs_user_id_idx').on(table.userId),
]);

export const meals = pgTable('meals', {
  id: text('id').primaryKey(),
  dailyLogId: text('daily_log_id').notNull().references(() => dailyLogs.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  timing: text('timing').notNull(),
  time: text('time'),
  totalCalories: doublePrecision('total_calories').default(0).notNull(),
  totalProtein: doublePrecision('total_protein').default(0).notNull(),
  totalCarbs: doublePrecision('total_carbs').default(0).notNull(),
  totalFat: doublePrecision('total_fat').default(0).notNull(),
}, (table) => [index('meals_daily_log_id_idx').on(table.dailyLogId)]);

export const mealFoods = pgTable('meal_foods', {
  id: text('id').primaryKey(),
  mealId: text('meal_id').notNull().references(() => meals.id, { onDelete: 'cascade' }),
  foodId: text('food_id').notNull(),
  foodName: text('food_name').notNull(),
  foodCategory: text('food_category'),
  grams: doublePrecision('grams').notNull(),
  quantity: doublePrecision('quantity'),
  unit: text('unit'),
  calories: doublePrecision('calories').default(0).notNull(),
  protein: doublePrecision('protein').default(0).notNull(),
  carbs: doublePrecision('carbs').default(0).notNull(),
  fat: doublePrecision('fat').default(0).notNull(),
}, (table) => [index('meal_foods_meal_id_idx').on(table.mealId)]);

export const workouts = pgTable('workouts', {
  id: text('id').primaryKey(),
  dailyLogId: text('daily_log_id').notNull().references(() => dailyLogs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  duration: integer('duration').default(0).notNull(),
  intensity: text('intensity').default('medium').notNull(),
  time: text('time'),
  splitId: text('split_id'),
  splitDayId: text('split_day_id'),
  muscleGroupsJson: text('muscle_groups_json'),
}, (table) => [index('workouts_daily_log_id_idx').on(table.dailyLogId)]);

export const weightHistory = pgTable('weight_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  weight: doublePrecision('weight').notNull(),
  bodyFat: doublePrecision('body_fat'),
}, (table) => [
  uniqueIndex('weight_history_user_date_unique').on(table.userId, table.date),
  index('weight_history_user_id_idx').on(table.userId),
]);

export const customFoods = pgTable('custom_foods', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  calories: doublePrecision('calories').default(0).notNull(),
  protein: doublePrecision('protein').default(0).notNull(),
  carbs: doublePrecision('carbs').default(0).notNull(),
  fat: doublePrecision('fat').default(0).notNull(),
}, (table) => [index('custom_foods_user_id_idx').on(table.userId)]);

export const mealPlans = pgTable('meal_plans', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  goal: text('goal').notNull(),
  totalCalories: doublePrecision('total_calories').default(0).notNull(),
  totalProtein: doublePrecision('total_protein').default(0).notNull(),
  totalCarbs: doublePrecision('total_carbs').default(0).notNull(),
  totalFat: doublePrecision('total_fat').default(0).notNull(),
  mealsJson: text('meals_json').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('meal_plans_user_id_idx').on(table.userId)]);

export const bodyMeasurements = pgTable('body_measurements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  weight: doublePrecision('weight').notNull(),
  height: doublePrecision('height'),
  bodyFat: doublePrecision('body_fat'),
  bodyFatMethod: text('body_fat_method').default('visual'),
  resistance: doublePrecision('resistance'),
  reactance: doublePrecision('reactance'),
  phaseAngle: doublePrecision('phase_angle'),
  muscleMass: doublePrecision('muscle_mass'),
  skeletalMuscle: doublePrecision('skeletal_muscle'),
  waterPercent: doublePrecision('water_percent'),
  waterKg: doublePrecision('water_kg'),
  boneMass: doublePrecision('bone_mass'),
  proteinPercent: doublePrecision('protein_percent'),
  proteinMass: doublePrecision('protein_mass'),
  basalMetabolism: doublePrecision('basal_metabolism'),
  visceralFat: doublePrecision('visceral_fat'),
  triceps: doublePrecision('triceps'),
  biceps: doublePrecision('biceps'),
  subscapular: doublePrecision('subscapular'),
  suprailiac: doublePrecision('suprailiac'),
  abdominal: doublePrecision('abdominal'),
  chestSkinfold: doublePrecision('chest_skinfold'),
  axillaryMid: doublePrecision('axillary_mid'),
  thighSkinfold: doublePrecision('thigh_skinfold'),
  calfSkinfold: doublePrecision('calf_skinfold'),
  armRelaxedRight: doublePrecision('arm_relaxed_right'),
  armRelaxedLeft: doublePrecision('arm_relaxed_left'),
  armFlexedRight: doublePrecision('arm_flexed_right'),
  armFlexedLeft: doublePrecision('arm_flexed_left'),
  forearmRight: doublePrecision('forearm_right'),
  forearmLeft: doublePrecision('forearm_left'),
  wristRight: doublePrecision('wrist_right'),
  wristLeft: doublePrecision('wrist_left'),
  chestCircumference: doublePrecision('chest_circumference'),
  waistCircumference: doublePrecision('waist_circumference'),
  abdomenCircumference: doublePrecision('abdomen_circumference'),
  hipCircumference: doublePrecision('hip_circumference'),
  thighProximalRight: doublePrecision('thigh_proximal_right'),
  thighProximalLeft: doublePrecision('thigh_proximal_left'),
  thighMidRight: doublePrecision('thigh_mid_right'),
  thighMidLeft: doublePrecision('thigh_mid_left'),
  calfRight: doublePrecision('calf_right'),
  calfLeft: doublePrecision('calf_left'),
  ankleRight: doublePrecision('ankle_right'),
  ankleLeft: doublePrecision('ankle_left'),
  leanMass: doublePrecision('lean_mass'),
  fatMass: doublePrecision('fat_mass'),
  bmi: doublePrecision('bmi'),
  waistHipRatio: doublePrecision('waist_hip_ratio'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('body_measurements_user_date_unique').on(table.userId, table.date),
  index('body_measurements_user_id_idx').on(table.userId),
]);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('password_reset_tokens_hash_unique').on(table.tokenHash),
  index('password_reset_tokens_user_id_idx').on(table.userId),
]);

export const professionalProfiles = pgTable('professional_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  registrationType: text('registration_type').notNull(),
  registrationNumber: text('registration_number').notNull(),
  registrationRegion: text('registration_region').notNull(),
  bio: text('bio'),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('professional_profiles_user_unique').on(table.userId),
  uniqueIndex('professional_profiles_registration_unique').on(
    table.registrationType,
    table.registrationNumber,
    table.registrationRegion,
  ),
]);

export const userRoles = pgTable('user_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  status: text('status').default('active').notNull(),
  grantedBy: text('granted_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_roles_user_role_unique').on(table.userId, table.role),
  index('user_roles_user_idx').on(table.userId),
]);

export const professionalCredentials = pgTable('professional_credentials', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  professionalRole: text('professional_role').notNull(),
  registrationType: text('registration_type').notNull(),
  registrationNumber: text('registration_number').notNull(),
  registrationRegion: text('registration_region').notNull(),
  status: text('status').default('pending').notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedBy: text('verified_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('professional_credentials_user_role_unique').on(table.userId, table.professionalRole),
  uniqueIndex('professional_credentials_registration_unique').on(
    table.registrationType,
    table.registrationNumber,
    table.registrationRegion,
  ),
  index('professional_credentials_user_idx').on(table.userId),
]);

export const professionalLinkInvitations = pgTable('professional_link_invitations', {
  id: text('id').primaryKey(),
  professionalId: text('professional_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  professionalRolesJson: text('professional_roles_json').notNull(),
  purpose: text('purpose').notNull(),
  scopesJson: text('scopes_json').notNull(),
  consentVersion: text('consent_version').notNull(),
  durationDays: integer('duration_days').notNull(),
  status: text('status').default('issued').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedBy: text('accepted_by').references(() => users.id, { onDelete: 'set null' }),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('professional_link_invitations_token_unique').on(table.tokenHash),
  index('professional_link_invitations_professional_idx').on(table.professionalId, table.createdAt),
]);

export const professionalStudentLinks = pgTable('professional_student_links', {
  id: text('id').primaryKey(),
  professionalId: text('professional_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestedBy: text('requested_by').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').default('invited').notNull(),
  purpose: text('purpose').notNull(),
  consentVersion: text('consent_version').notNull(),
  requestedScopesJson: text('requested_scopes_json').default('[]').notNull(),
  professionalRolesJson: text('professional_roles_json').default('[]').notNull(),
  origin: text('origin').default('invite_link').notNull(),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastActionBy: text('last_action_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('professional_student_links_pair_unique').on(table.professionalId, table.studentId),
  index('professional_student_links_professional_idx').on(table.professionalId),
  index('professional_student_links_student_idx').on(table.studentId),
]);

export const professionalNutritionPlans = pgTable('professional_nutrition_plans', {
  id: text('id').primaryKey(),
  professionalId: text('professional_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkId: text('link_id').notNull().references(() => professionalStudentLinks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  objective: text('objective'),
  status: text('status').default('draft').notNull(),
  currentVersion: integer('current_version').default(1).notNull(),
  publishedVersion: integer('published_version'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
}, (table) => [
  index('professional_nutrition_plans_professional_idx').on(table.professionalId),
  index('professional_nutrition_plans_student_idx').on(table.studentId),
  index('professional_nutrition_plans_link_idx').on(table.linkId),
]);

export const professionalNutritionPlanVersions = pgTable('professional_nutrition_plan_versions', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => professionalNutritionPlans.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  mealsJson: text('meals_json').notNull(),
  totalCalories: doublePrecision('total_calories').default(0).notNull(),
  totalProtein: doublePrecision('total_protein').default(0).notNull(),
  totalCarbs: doublePrecision('total_carbs').default(0).notNull(),
  totalFat: doublePrecision('total_fat').default(0).notNull(),
  changeSummary: text('change_summary'),
  status: text('status').default('draft').notNull(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('professional_nutrition_plan_versions_unique').on(table.planId, table.version),
  index('professional_nutrition_plan_versions_plan_idx').on(table.planId),
]);

export const professionalExercises = pgTable('professional_exercises', {
  id: text('id').primaryKey(),
  ownerProfessionalId: text('owner_professional_id').references(() => users.id, { onDelete: 'cascade' }),
  visibility: text('visibility').default('private').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  muscleGroupsJson: text('muscle_groups_json').notNull(),
  equipment: text('equipment'),
  modality: text('modality').notNull(),
  instructions: text('instructions').notNull(),
  mediaUrl: text('media_url'),
  sourceAttribution: text('source_attribution'),
  safetyNotes: text('safety_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('professional_exercises_owner_idx').on(table.ownerProfessionalId),
  index('professional_exercises_visibility_idx').on(table.visibility),
]);

export const professionalTrainingPlans = pgTable('professional_training_plans', {
  id: text('id').primaryKey(),
  professionalId: text('professional_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkId: text('link_id').notNull().references(() => professionalStudentLinks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  objective: text('objective'),
  startsOn: text('starts_on'),
  endsOn: text('ends_on'),
  status: text('status').default('draft').notNull(),
  currentVersion: integer('current_version').default(1).notNull(),
  publishedVersion: integer('published_version'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
}, (table) => [
  index('professional_training_plans_professional_idx').on(table.professionalId),
  index('professional_training_plans_student_idx').on(table.studentId),
  index('professional_training_plans_link_idx').on(table.linkId),
]);

export const professionalTrainingPlanVersions = pgTable('professional_training_plan_versions', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().references(() => professionalTrainingPlans.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  sessionsJson: text('sessions_json').notNull(),
  changeSummary: text('change_summary'),
  status: text('status').default('draft').notNull(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('professional_training_plan_versions_unique').on(table.planId, table.version),
  index('professional_training_plan_versions_plan_idx').on(table.planId),
]);

export const professionalTrainingExecutions = pgTable('professional_training_executions', {
  id: text('id').primaryKey(),
  planVersionId: text('plan_version_id').notNull().references(() => professionalTrainingPlanVersions.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workoutId: text('workout_id').references(() => workouts.id, { onDelete: 'set null' }),
  sessionId: text('session_id').notNull(),
  status: text('status').default('completed').notNull(),
  resultsJson: text('results_json').notNull(),
  perceivedExertion: doublePrecision('perceived_exertion'),
  feedback: text('feedback'),
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('professional_training_executions_student_idx').on(table.studentId),
  index('professional_training_executions_version_idx').on(table.planVersionId),
  index('professional_training_executions_workout_idx').on(table.workoutId),
]);

export const professionalAvailabilityRules = pgTable('professional_availability_rules', {
  id: text('id').primaryKey(),
  professionalId: text('professional_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  appointmentType: text('appointment_type').notNull(),
  weekday: integer('weekday').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  timeZone: text('time_zone').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  slotIntervalMinutes: integer('slot_interval_minutes').notNull(),
  bufferBeforeMinutes: integer('buffer_before_minutes').default(0).notNull(),
  bufferAfterMinutes: integer('buffer_after_minutes').default(0).notNull(),
  minimumNoticeMinutes: integer('minimum_notice_minutes').default(720).notNull(),
  maximumBookingDays: integer('maximum_booking_days').default(90).notNull(),
  requestHoldMinutes: integer('request_hold_minutes').default(1440).notNull(),
  effectiveFrom: text('effective_from').notNull(),
  effectiveUntil: text('effective_until'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('professional_availability_rules_professional_idx').on(table.professionalId),
  index('professional_availability_rules_lookup_idx').on(
    table.professionalId,
    table.appointmentType,
    table.weekday,
  ),
]);

export const professionalScheduleBlockouts = pgTable('professional_schedule_blockouts', {
  id: text('id').primaryKey(),
  professionalId: text('professional_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recurrence: text('recurrence').default('single').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  weekday: integer('weekday'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  timeZone: text('time_zone').notNull(),
  effectiveFrom: text('effective_from'),
  effectiveUntil: text('effective_until'),
  reasonCategory: text('reason_category').default('other').notNull(),
  privateReason: text('private_reason'),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('professional_schedule_blockouts_professional_idx').on(table.professionalId),
  index('professional_schedule_blockouts_single_idx').on(table.professionalId, table.startsAt, table.endsAt),
]);

export const professionalAppointments = pgTable('professional_appointments', {
  id: text('id').primaryKey(),
  professionalId: text('professional_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkId: text('link_id').notNull().references(() => professionalStudentLinks.id, { onDelete: 'cascade' }),
  appointmentType: text('appointment_type').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  timeZone: text('time_zone').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  bufferBeforeMinutes: integer('buffer_before_minutes').default(0).notNull(),
  bufferAfterMinutes: integer('buffer_after_minutes').default(0).notNull(),
  status: text('status').default('requested').notNull(),
  previousStatus: text('previous_status'),
  holdExpiresAt: timestamp('hold_expires_at', { withTimezone: true }),
  proposedSlotsJson: text('proposed_slots_json'),
  origin: text('origin').default('student_request').notNull(),
  neutralTitle: text('neutral_title').default('Atendimento').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('professional_appointments_professional_idx').on(table.professionalId, table.startsAt),
  index('professional_appointments_student_idx').on(table.studentId, table.startsAt),
  index('professional_appointments_link_idx').on(table.linkId),
]);

export const professionalAppointmentEvents = pgTable('professional_appointment_events', {
  id: text('id').primaryKey(),
  appointmentId: text('appointment_id').notNull().references(() => professionalAppointments.id, { onDelete: 'cascade' }),
  actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status'),
  metadataJson: text('metadata_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('professional_appointment_events_appointment_idx').on(table.appointmentId)]);

export const professionalNotifications = pgTable('professional_notifications', {
  id: text('id').primaryKey(),
  recipientUserId: text('recipient_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  appointmentId: text('appointment_id').references(() => professionalAppointments.id, { onDelete: 'cascade' }),
  notificationType: text('notification_type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('professional_notifications_recipient_idx').on(table.recipientUserId, table.createdAt)]);

export const consentRecords = pgTable('consent_records', {
  id: text('id').primaryKey(),
  linkId: text('link_id').notNull().references(() => professionalStudentLinks.id, { onDelete: 'cascade' }),
  subjectUserId: text('subject_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(),
  scopesJson: text('scopes_json').default('[]').notNull(),
  version: text('version').notNull(),
  status: text('status').default('requested').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  changedBy: text('changed_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('consent_records_link_created_idx').on(table.linkId, table.createdAt),
  index('consent_records_subject_idx').on(table.subjectUserId),
]);

export const administrativeIdentifiers = pgTable('administrative_identifiers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  identifierType: text('identifier_type').notNull(),
  valueHash: text('value_hash').notNull(),
  encryptedValue: text('encrypted_value').notNull(),
  encryptionIv: text('encryption_iv').notNull(),
  encryptionTag: text('encryption_tag').notNull(),
  encryptionKeyVersion: text('encryption_key_version').default('v1').notNull(),
  lastFour: text('last_four').notNull(),
  purpose: text('purpose').notNull(),
  authorizedAt: timestamp('authorized_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('administrative_identifiers_user_type_unique').on(table.userId, table.identifierType),
  uniqueIndex('administrative_identifiers_hash_idx').on(table.valueHash),
]);

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  subjectUserId: text('subject_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadataJson: text('metadata_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('audit_logs_actor_idx').on(table.actorUserId),
  index('audit_logs_subject_idx').on(table.subjectUserId),
  index('audit_logs_entity_idx').on(table.entityType, table.entityId),
]);
