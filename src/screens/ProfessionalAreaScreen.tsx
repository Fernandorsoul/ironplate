import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { getProfessionalProfile } from '../services/database';
import type { ProfessionalCredential, ProfessionalProfile } from '../types';

const ROLE_CONTENT = {
  nutritionist: {
    eyebrow: 'NUTRICAO',
    title: 'Atendimento nutricional',
    description: 'Planos alimentares, acompanhamento e agenda com consentimento ativo.',
  },
  fitness_professional: {
    eyebrow: 'TREINAMENTO',
    title: 'Educacao fisica',
    description: 'Prescricoes, execucoes de treino e agenda com consentimento ativo.',
  },
} as const;

function roleLabel(role: ProfessionalCredential['professionalRole']): string {
  return role === 'nutritionist' ? 'Nutricionista' : 'Profissional de educacao fisica';
}

export default function ProfessionalAreaScreen() {
  const { profile: userProfile } = useApp();
  const [professionalProfile, setProfessionalProfile] = useState<ProfessionalProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getProfessionalProfile()
      .then(profile => {
        if (active) setProfessionalProfile(profile);
      })
      .catch(error => console.error('Professional profile load error:', error))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeRoles = (userProfile?.roles ?? []).filter(
    (role): role is 'nutritionist' | 'fitness_professional' => (
      role === 'nutritionist' || role === 'fitness_professional'
    ),
  );
  const verifiedCredentials = professionalProfile?.credentials.filter(
    credential => credential.status === 'verified' && activeRoles.includes(credential.professionalRole),
  ) ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>AREA PROFISSIONAL</Text>
        <Text style={styles.title}>Trabalho habilitado, dados protegidos.</Text>
        <Text style={styles.subtitle}>
          Cada atuacao abaixo foi validada separadamente. O acesso aos dados de alunos continua
          condicionado a vinculo e consentimento ativos.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando habilitacoes...</Text>
        </View>
      ) : (
        <View style={styles.roleGrid}>
          {verifiedCredentials.map(credential => {
            const content = ROLE_CONTENT[credential.professionalRole];
            return (
              <View key={credential.id} style={styles.roleCard}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleEyebrow}>{content.eyebrow}</Text>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>VERIFICADO</Text>
                  </View>
                </View>
                <Text style={styles.roleTitle}>{content.title}</Text>
                <Text style={styles.roleDescription}>{content.description}</Text>
                <View style={styles.credentialLine}>
                  <Text style={styles.credentialLabel}>{roleLabel(credential.professionalRole)}</Text>
                  <Text style={styles.credentialValue}>
                    {credential.registrationType} {credential.registrationNumber} / {credential.registrationRegion}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.personalCard}>
        <Text style={styles.personalEyebrow}>CONTA CUMULATIVA</Text>
        <Text style={styles.personalTitle}>Sua area pessoal permanece independente</Text>
        <Text style={styles.personalText}>
          O papel de aluno nao e removido quando uma habilitacao profissional e ativada.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { gap: SPACING.lg, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  hero: {
    backgroundColor: COLORS.surface,
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 5,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
  },
  kicker: { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontWeight: '800', letterSpacing: 2 },
  title: { color: COLORS.text, fontSize: FONT_SIZE.xxl, fontWeight: '800', marginTop: SPACING.sm },
  subtitle: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, lineHeight: 24, marginTop: SPACING.md },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  roleGrid: { gap: SPACING.md },
  roleCard: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  roleHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  roleEyebrow: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, fontWeight: '800', letterSpacing: 1.5 },
  verifiedBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  verifiedText: { color: COLORS.background, fontSize: 10, fontWeight: '900' },
  roleTitle: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '800', marginTop: SPACING.md },
  roleDescription: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 21, marginTop: SPACING.sm },
  credentialLine: { borderTopColor: COLORS.borderLight, borderTopWidth: 1, marginTop: SPACING.lg, paddingTop: SPACING.md },
  credentialLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },
  credentialValue: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '700', marginTop: SPACING.xs },
  personalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  personalEyebrow: { color: COLORS.calories, fontSize: FONT_SIZE.xs, fontWeight: '800', letterSpacing: 1.5 },
  personalTitle: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700', marginTop: SPACING.sm },
  personalText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 21, marginTop: SPACING.sm },
});
