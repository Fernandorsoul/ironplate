import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import {
  createProfessionalInvitation,
  getProfessionalProfile,
  searchAdministrativeCpf,
} from '../services/database';
import type {
  ProfessionalConsentScope,
  ProfessionalCredential,
  ProfessionalProfile,
} from '../types';

type ProfessionalRole = ProfessionalCredential['professionalRole'];

const SCOPE_OPTIONS: Array<{
  key: ProfessionalConsentScope;
  label: string;
  roles: ProfessionalRole[];
}> = [
  { key: 'basic_profile', label: 'Perfil basico', roles: ['nutritionist', 'fitness_professional'] },
  { key: 'nutrition_data', label: 'Dados nutricionais', roles: ['nutritionist'] },
  { key: 'meals_adherence', label: 'Refeicoes e aderencia', roles: ['nutritionist'] },
  { key: 'meal_plans', label: 'Planos alimentares', roles: ['nutritionist'] },
  { key: 'weight', label: 'Peso', roles: ['nutritionist', 'fitness_professional'] },
  { key: 'body_measurements', label: 'Medidas e composicao', roles: ['nutritionist', 'fitness_professional'] },
  { key: 'prescribed_training', label: 'Treinos prescritos', roles: ['fitness_professional'] },
  { key: 'training_execution', label: 'Execucao de treinos', roles: ['fitness_professional'] },
];

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
  const [purpose, setPurpose] = useState('Acompanhamento profissional individual');
  const [selectedScopes, setSelectedScopes] = useState<ProfessionalConsentScope[]>(['basic_profile']);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [invitation, setInvitation] = useState<Awaited<ReturnType<typeof createProfessionalInvitation>> | null>(null);
  const [cpfSearch, setCpfSearch] = useState('');
  const [cpfMatch, setCpfMatch] = useState<Awaited<ReturnType<typeof searchAdministrativeCpf>>>(null);
  const [cpfSearchMessage, setCpfSearchMessage] = useState('');

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
  const verifiedRoles = [...new Set(verifiedCredentials.map(credential => credential.professionalRole))];
  const availableScopes = SCOPE_OPTIONS.filter(option => (
    option.roles.some(role => verifiedRoles.includes(role))
  ));

  const toggleScope = (scope: ProfessionalConsentScope) => {
    setInvitation(null);
    setSelectedScopes(current => (
      current.includes(scope) ? current.filter(item => item !== scope) : [...current, scope]
    ));
  };

  const createInvitation = async () => {
    if (purpose.trim().length < 10 || selectedScopes.length === 0 || verifiedRoles.length === 0) {
      setInviteError('Informe a finalidade e selecione ao menos uma categoria.');
      return;
    }
    setInviteError('');
    setIsCreatingInvite(true);
    try {
      const created = await createProfessionalInvitation({
        purpose: purpose.trim(),
        scopes: selectedScopes,
        professionalRoles: verifiedRoles,
        consentVersion: '2026-09',
        expiresInHours: 72,
        durationDays: 365,
      });
      setInvitation(created);
    } catch (error) {
      console.error('Professional invitation creation error:', error);
      setInviteError('Nao foi possivel gerar o convite agora.');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const shareInvitation = async () => {
    if (!invitation) return;
    await Share.share({
      title: 'Convite IronPlate',
      message: `Convite para acompanhamento no IronPlate: ${invitation.invitationUrl}`,
      url: invitation.invitationUrl,
    });
  };

  const searchCpf = async () => {
    setCpfSearchMessage('');
    try {
      const match = await searchAdministrativeCpf(cpfSearch);
      setCpfMatch(match);
      setCpfSearchMessage(match ? '' : 'Nenhum aluno da sua carteira corresponde ao CPF informado.');
    } catch {
      setCpfMatch(null);
      setCpfSearchMessage('Nao foi possivel realizar a busca. Confira o CPF ou aguarde.');
    }
  };

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

      {!isLoading && verifiedCredentials.length > 0 && (
        <View style={styles.inviteCard}>
          <Text style={styles.inviteEyebrow}>CONSENTIMENTO GRANULAR</Text>
          <Text style={styles.inviteTitle}>Criar convite seguro</Text>
          <Text style={styles.inviteText}>
            Escolha somente os dados necessarios. O aluno podera reduzir as categorias antes do aceite
            e revogar o acesso a qualquer momento.
          </Text>
          <Text style={styles.fieldLabel}>Finalidade</Text>
          <TextInput
            accessibilityLabel="Finalidade do acompanhamento"
            multiline
            onChangeText={value => {
              setPurpose(value);
              setInvitation(null);
            }}
            placeholder="Descreva por que estes dados sao necessarios"
            placeholderTextColor={COLORS.textMuted}
            style={styles.purposeInput}
            value={purpose}
          />
          <Text style={styles.fieldLabel}>Categorias solicitadas</Text>
          <View style={styles.scopeGrid}>
            {availableScopes.map(option => {
              const selected = selectedScopes.includes(option.key);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  key={option.key}
                  onPress={() => toggleScope(option.key)}
                  style={[styles.scopeChip, selected && styles.scopeChipSelected]}
                >
                  <Text style={[styles.scopeChipText, selected && styles.scopeChipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.inviteMeta}>Link valido por 72 horas. Vinculo valido por 365 dias.</Text>
          {!!inviteError && <Text style={styles.errorText}>{inviteError}</Text>}
          <Pressable
            accessibilityRole="button"
            disabled={isCreatingInvite}
            onPress={createInvitation}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            {isCreatingInvite
              ? <ActivityIndicator color={COLORS.background} />
              : <Text style={styles.primaryButtonText}>Gerar link e QR</Text>}
          </Pressable>

          {invitation && (
            <View style={styles.invitationResult}>
              <View style={styles.qrFrame}>
                <QRCode
                  backgroundColor="#FFFFFF"
                  color="#111827"
                  size={180}
                  value={invitation.qrPayload}
                />
              </View>
              <Text selectable style={styles.invitationLink}>{invitation.invitationUrl}</Text>
              <Text style={styles.inviteMeta}>Uso unico. Nao publique este convite em canais abertos.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={shareInvitation}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.secondaryButtonText}>Compartilhar convite</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {!isLoading && verifiedCredentials.length > 0 && (
        <View style={styles.inviteCard}>
          <Text style={styles.inviteEyebrow}>CARTEIRA PROTEGIDA</Text>
          <Text style={styles.inviteTitle}>Localizar por CPF completo</Text>
          <Text style={styles.inviteText}>
            A busca considera somente alunos com vinculo ativo e retorna o CPF mascarado.
          </Text>
          <TextInput
            accessibilityLabel="Buscar CPF na carteira"
            keyboardType="number-pad"
            onChangeText={setCpfSearch}
            placeholder="000.000.000-00"
            placeholderTextColor={COLORS.textMuted}
            style={styles.purposeInput}
            value={cpfSearch}
          />
          <Pressable accessibilityRole="button" onPress={searchCpf} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Buscar na minha carteira</Text>
          </Pressable>
          {cpfMatch && (
            <View style={styles.searchResult}>
              <Text style={styles.roleTitle}>{cpfMatch.displayName}</Text>
              <Text style={styles.credentialValue}>{cpfMatch.maskedValue}</Text>
            </View>
          )}
          {!!cpfSearchMessage && <Text style={styles.inviteMeta}>{cpfSearchMessage}</Text>}
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
  inviteCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  inviteEyebrow: { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontWeight: '800', letterSpacing: 1.5 },
  inviteTitle: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '800', marginTop: SPACING.sm },
  inviteText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 21, marginTop: SPACING.sm },
  fieldLabel: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '700', marginTop: SPACING.lg },
  purposeInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.sm,
    minHeight: 76,
    padding: SPACING.md,
    textAlignVertical: 'top',
  },
  scopeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  scopeChip: {
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  scopeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  scopeChipText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  scopeChipTextSelected: { color: COLORS.background },
  inviteMeta: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, lineHeight: 18, marginTop: SPACING.md },
  errorText: { color: COLORS.error, fontSize: FONT_SIZE.sm, marginTop: SPACING.md },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  primaryButtonText: { color: COLORS.background, fontSize: FONT_SIZE.md, fontWeight: '800' },
  buttonPressed: { opacity: 0.75 },
  invitationResult: { alignItems: 'center', borderTopColor: COLORS.borderLight, borderTopWidth: 1, marginTop: SPACING.lg, paddingTop: SPACING.lg },
  qrFrame: { backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  invitationLink: { color: COLORS.calories, fontSize: FONT_SIZE.xs, lineHeight: 18, marginTop: SPACING.md, textAlign: 'center' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    width: '100%',
  },
  secondaryButtonText: { color: COLORS.primary, fontSize: FONT_SIZE.md, fontWeight: '700' },
  searchResult: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, marginTop: SPACING.md, padding: SPACING.md, width: '100%' },
  personalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  personalEyebrow: { color: COLORS.calories, fontSize: FONT_SIZE.xs, fontWeight: '800', letterSpacing: 1.5 },
  personalTitle: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700', marginTop: SPACING.sm },
  personalText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 21, marginTop: SPACING.sm },
});
