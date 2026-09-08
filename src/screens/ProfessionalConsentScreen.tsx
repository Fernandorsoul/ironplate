import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import {
  decideProfessionalInvitation,
  getProfessionalInvitation,
  getProfessionalLinks,
  updateProfessionalConsent,
} from '../services/database';
import type {
  ProfessionalConsentScope,
  ProfessionalInvitationPreview,
  ProfessionalLink,
} from '../types';

const SCOPE_LABELS: Record<ProfessionalConsentScope, string> = {
  basic_profile: 'Perfil basico',
  nutrition_data: 'Dados nutricionais',
  meals_adherence: 'Refeicoes e aderencia',
  meal_plans: 'Planos alimentares',
  weight: 'Peso',
  body_measurements: 'Medidas e composicao corporal',
  prescribed_training: 'Treinos prescritos',
  training_execution: 'Execucao de treinos',
  scheduling: 'Agenda',
};

export default function ProfessionalConsentScreen({ navigation, route }: any) {
  const { isAuthenticated } = useApp();
  const token = typeof route?.params?.token === 'string' ? route.params.token : undefined;
  const [invitation, setInvitation] = useState<ProfessionalInvitationPreview | null>(null);
  const [links, setLinks] = useState<ProfessionalLink[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<ProfessionalConsentScope[]>([]);
  const [linkScopes, setLinkScopes] = useState<Record<string, ProfessionalConsentScope[]>>({});
  const [isLoading, setIsLoading] = useState(isAuthenticated);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLinks = async () => {
    const result = await getProfessionalLinks();
    const studentLinks = result.filter(link => link.viewerRole === 'student');
    setLinks(studentLinks);
    setLinkScopes(Object.fromEntries(studentLinks.map(link => [link.id, link.grantedScopes])));
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const load = token
      ? getProfessionalInvitation(token).then(result => {
          if (!active) return;
          setInvitation(result);
          setSelectedScopes(result.scopes);
        })
      : loadLinks();
    load
      .catch(() => {
        if (active) setError(token ? 'Este convite expirou ou ja foi utilizado.' : 'Nao foi possivel carregar seus consentimentos.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, token]);

  const toggleScope = (scope: ProfessionalConsentScope) => {
    setSelectedScopes(current => (
      current.includes(scope) ? current.filter(item => item !== scope) : [...current, scope]
    ));
  };

  const decideInvitation = async (decision: 'accept' | 'decline') => {
    if (!token || isSaving) return;
    if (decision === 'accept' && selectedScopes.length === 0) {
      Alert.alert('Selecione os dados', 'Mantenha ao menos uma categoria ou recuse o convite.');
      return;
    }
    setIsSaving(true);
    try {
      await decideProfessionalInvitation(token, decision, decision === 'accept' ? selectedScopes : undefined);
      Alert.alert(
        decision === 'accept' ? 'Consentimento registrado' : 'Convite recusado',
        decision === 'accept'
          ? 'O acesso foi limitado as categorias selecionadas e pode ser revogado a qualquer momento.'
          : 'Nenhum dado foi compartilhado.',
      );
      navigation.replace('ProfessionalConsent');
    } catch {
      setError('O convite nao esta mais disponivel.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveLink = async (link: ProfessionalLink, decision: 'limit' | 'revoke') => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updateProfessionalConsent(
        link.id,
        decision,
        decision === 'limit' ? linkScopes[link.id] : undefined,
      );
      await loadLinks();
      Alert.alert(
        decision === 'revoke' ? 'Acesso revogado' : 'Consentimento atualizado',
        decision === 'revoke'
          ? 'Novas leituras e alteracoes pelo profissional foram bloqueadas imediatamente.'
          : 'As categorias autorizadas foram atualizadas.',
      );
    } catch {
      Alert.alert('Erro', 'Nao foi possivel atualizar o consentimento.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Convite profissional</Text>
        <Text style={styles.description}>Entre na sua conta para revisar o convite sem expor seus dados.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('PublicHome', { openLogin: true })}>
          <Text style={styles.primaryButtonText}>Entrar com seguranca</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.kicker}>PRIVACIDADE E CONTROLE</Text>
      <Text style={styles.title}>{token ? 'Revise antes de compartilhar' : 'Seus consentimentos'}</Text>
      <Text style={styles.description}>
        Voce decide quais categorias cada profissional pode acessar e pode revogar imediatamente.
      </Text>

      {isLoading && <ActivityIndicator color={COLORS.primary} size="large" />}
      {error && <Text style={styles.error}>{error}</Text>}

      {invitation && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{invitation.professionalName}</Text>
          <Text style={styles.registration}>
            {invitation.registrations.map(item => `${item.type} ${item.number}/${item.region}`).join(' | ')}
          </Text>
          <Text style={styles.purpose}>{invitation.purpose}</Text>
          <Text style={styles.meta}>Duracao do vinculo: {invitation.durationDays} dias</Text>
          <Text style={styles.sectionLabel}>DADOS SOLICITADOS</Text>
          {invitation.scopes.map(scope => {
            const selected = selectedScopes.includes(scope);
            return (
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={scope}
                onPress={() => toggleScope(scope)}
                style={[styles.scopeRow, selected && styles.scopeRowSelected]}
              >
                <View style={[styles.checkbox, selected && styles.checkboxSelected]} />
                <Text style={styles.scopeText}>{SCOPE_LABELS[scope]}</Text>
              </TouchableOpacity>
            );
          })}
          <Text style={styles.notice}>{invitation.revocationNotice}</Text>
          <TouchableOpacity
            disabled={isSaving}
            style={styles.primaryButton}
            onPress={() => decideInvitation('accept')}
          >
            <Text style={styles.primaryButtonText}>Aceitar categorias selecionadas</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={isSaving} style={styles.secondaryButton} onPress={() => decideInvitation('decline')}>
            <Text style={styles.secondaryButtonText}>Recusar sem compartilhar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!token && !isLoading && links.length === 0 && !error && (
        <View style={styles.emptyCard}>
          <Text style={styles.cardTitle}>Nenhum profissional com acesso</Text>
          <Text style={styles.description}>Quando voce aceitar um convite, ele aparecera aqui.</Text>
        </View>
      )}

      {!token && links.map(link => (
        <View key={link.id} style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.cardTitle}>{link.professionalName}</Text>
            <Text style={[styles.status, link.status !== 'active' && styles.statusInactive]}>
              {link.status === 'active' ? 'ATIVO' : link.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.registration}>{link.registrations.join(' | ')}</Text>
          <Text style={styles.purpose}>{link.purpose}</Text>
          <Text style={styles.sectionLabel}>CATEGORIAS LIBERADAS</Text>
          {link.status === 'active' ? link.requestedScopes.map(scope => {
            const selected = (linkScopes[link.id] ?? []).includes(scope);
            return (
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={scope}
                onPress={() => setLinkScopes(current => ({
                  ...current,
                  [link.id]: selected
                    ? (current[link.id] ?? []).filter(item => item !== scope)
                    : [...(current[link.id] ?? []), scope],
                }))}
                style={[styles.scopeRow, selected && styles.scopeRowSelected]}
              >
                <View style={[styles.checkbox, selected && styles.checkboxSelected]} />
                <Text style={styles.scopeText}>{SCOPE_LABELS[scope]}</Text>
              </TouchableOpacity>
            );
          }) : (
            <View style={styles.chips}>
              {link.grantedScopes.map(scope => (
                <Text key={scope} style={styles.chip}>{SCOPE_LABELS[scope]}</Text>
              ))}
            </View>
          )}
          <Text style={styles.meta}>Ultima alteracao: {new Date(link.lastChangedAt).toLocaleDateString('pt-BR')}</Text>
          {link.status === 'active' && (
            <>
              <TouchableOpacity
                disabled={isSaving || (linkScopes[link.id]?.length ?? 0) === 0}
                style={styles.primaryButton}
                onPress={() => saveLink(link, 'limit')}
              >
                <Text style={styles.primaryButtonText}>Salvar categorias</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isSaving} style={styles.revokeButton} onPress={() => saveLink(link, 'revoke')}>
                <Text style={styles.revokeText}>Revogar acesso agora</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  content: { gap: SPACING.md, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  centered: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  back: { color: COLORS.primary, fontSize: FONT_SIZE.md },
  kicker: { color: COLORS.calories, fontSize: FONT_SIZE.xs, fontWeight: '800', letterSpacing: 2, marginTop: SPACING.lg },
  title: { color: COLORS.text, fontSize: FONT_SIZE.xxl, fontWeight: '800', marginTop: SPACING.xs },
  description: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, lineHeight: 24, marginTop: SPACING.sm, textAlign: 'center' },
  error: { color: COLORS.error, fontSize: FONT_SIZE.md, paddingVertical: SPACING.lg, textAlign: 'center' },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl },
  cardTitle: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '800' },
  registration: { color: COLORS.accent, fontSize: FONT_SIZE.sm, fontWeight: '700', marginTop: SPACING.xs },
  purpose: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, lineHeight: 23, marginTop: SPACING.md },
  meta: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: SPACING.md },
  sectionLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontWeight: '800', letterSpacing: 1.5, marginTop: SPACING.lg },
  scopeRow: {
    alignItems: 'center',
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: SPACING.sm,
    padding: SPACING.md,
  },
  scopeRowSelected: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.primary },
  checkbox: { borderColor: COLORS.textMuted, borderRadius: 5, borderWidth: 2, height: 20, marginRight: SPACING.md, width: 20 },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  scopeText: { color: COLORS.text, flex: 1, fontSize: FONT_SIZE.md },
  notice: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 21, marginTop: SPACING.lg },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    padding: SPACING.md,
  },
  primaryButtonText: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', marginTop: SPACING.sm, padding: SPACING.md },
  secondaryButtonText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, fontWeight: '700' },
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  status: { color: COLORS.success, fontSize: FONT_SIZE.xs, fontWeight: '900' },
  statusInactive: { color: COLORS.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  chip: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.full,
    color: COLORS.text,
    fontSize: FONT_SIZE.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  revokeButton: {
    alignItems: 'center',
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.lg,
    padding: SPACING.md,
  },
  revokeText: { color: COLORS.error, fontSize: FONT_SIZE.md, fontWeight: '800' },
});
