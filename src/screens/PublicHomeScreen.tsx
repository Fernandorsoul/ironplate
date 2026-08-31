import React, { ComponentProps, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginModal } from '../components/LoginModal';
import { RegisterModal } from '../components/RegisterModal';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import type { RootStackScreenProps } from '../types/navigation';

type IconName = ComponentProps<typeof Ionicons>['name'];

const FEATURES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'restaurant-outline',
    title: 'Nutrição sob medida',
    description: 'Metas de calorias e macronutrientes alinhadas ao seu corpo, esporte e objetivo.',
  },
  {
    icon: 'analytics-outline',
    title: 'Evolução visível',
    description: 'Peso, medidas e aderência reunidos em uma visão simples para decisões melhores.',
  },
  {
    icon: 'barbell-outline',
    title: 'Treino conectado',
    description: 'Registre seus treinos e entenda como cada sessão participa do seu gasto diário.',
  },
];

const STEPS: { number: string; title: string; description: string }[] = [
  { number: '01', title: 'Defina seu perfil', description: 'Conte seu objetivo, rotina e modalidade.' },
  { number: '02', title: 'Receba suas metas', description: 'Tenha uma referência diária clara e pessoal.' },
  { number: '03', title: 'Acompanhe e evolua', description: 'Registre o dia e enxergue seu progresso.' },
];

const RELEASES: {
  badge: string;
  date: string;
  icon: IconName;
  title: string;
  description: string;
  highlights: string[];
  featured?: boolean;
}[] = [
  {
    badge: 'NOVIDADE',
    date: 'Agosto de 2026',
    icon: 'restaurant-outline',
    title: 'Dietas esportivas agora passam por validação completa',
    description: 'Os cardápios deixaram de combinar alimentos soltos e agora partem de refeições que fazem sentido na prática.',
    highlights: [
      'Receitas completas para café da manhã, almoço, pré, pós-treino e ceia',
      'Porções ajustadas para calorias, proteínas, carboidratos e gorduras',
      'Planos fora das faixas nutricionais são bloqueados antes de aparecer',
    ],
    featured: true,
  },
  {
    badge: 'MELHORIA',
    date: 'Agosto de 2026',
    icon: 'save-outline',
    title: 'Seu peso e sua dieta permanecem salvos',
    description: 'Reforçamos a persistência para que registros manuais de peso e o plano escolhido continuem disponíveis ao voltar ao IronPlate.',
    highlights: [
      'Registro manual de peso sincronizado com o banco',
      'Plano alimentar escolhido preservado entre sessões',
    ],
  },
  {
    badge: 'EVOLUÇÃO CONTÍNUA',
    date: 'Últimas versões',
    icon: 'shield-checkmark-outline',
    title: 'Mais controle nos treinos e na segurança',
    description: 'As atualizações recentes também melhoraram a edição das fichas de treino e protegeram fluxos sensíveis do aplicativo.',
    highlights: [
      'Grupos musculares das fichas podem ser personalizados',
      'Recuperação de senha e exportações receberam proteções adicionais',
    ],
  },
];

export default function PublicHomeScreen({
  navigation,
  route,
}: RootStackScreenProps<'PublicHome'>) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [releasesOffset, setReleasesOffset] = useState(0);
  const [aboutOffset, setAboutOffset] = useState(0);
  const [loginVisible, setLoginVisible] = useState(Boolean(route.params?.openLogin));
  const [registerVisible, setRegisterVisible] = useState(Boolean(route.params?.openRegister));
  const isDesktop = width >= 900;
  const isCompact = width < 640;

  useEffect(() => {
    if (route.params?.openLogin) {
      setRegisterVisible(false);
      setLoginVisible(true);
    } else if (route.params?.openRegister) {
      setLoginVisible(false);
      setRegisterVisible(true);
    }
  }, [route.params?.openLogin, route.params?.openRegister]);

  const openLogin = () => {
    setRegisterVisible(false);
    setLoginVisible(true);
  };

  const closeLogin = () => {
    setLoginVisible(false);
    if (route.params?.openLogin) {
      navigation.setParams({ openLogin: false });
    }
  };

  const openRegister = () => {
    setLoginVisible(false);
    setRegisterVisible(true);
  };

  const closeRegister = () => {
    setRegisterVisible(false);
    if (route.params?.openRegister) {
      navigation.setParams({ openRegister: false });
    }
  };

  const openForgotPassword = () => {
    closeLogin();
    navigation.navigate('ForgotPassword');
  };

  const openPrivacyPolicy = () => {
    closeRegister();
    navigation.navigate('PrivacyPolicy');
  };

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });
  const scrollToAbout = () => scrollRef.current?.scrollTo({
    y: Math.max(0, aboutOffset - 88),
    animated: true,
  });
  const scrollToReleases = () => scrollRef.current?.scrollTo({
    y: Math.max(0, releasesOffset - 88),
    animated: true,
  });

  const captureAboutOffset = (event: LayoutChangeEvent) => {
    setAboutOffset(event.nativeEvent.layout.y);
  };
  const captureReleasesOffset = (event: LayoutChangeEvent) => {
    setReleasesOffset(event.nativeEvent.layout.y);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerShell}>
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Ir para o início"
              style={styles.logoRow}
              onPress={scrollToTop}
            >
              <View style={styles.logoMark}>
                <Ionicons name="barbell" size={20} color={COLORS.text} />
              </View>
              <Text style={styles.logoText}>IRONPLATE</Text>
            </TouchableOpacity>

            {!isCompact && (
              <View style={styles.navigationLinks}>
                <TouchableOpacity onPress={scrollToTop}>
                  <Text style={styles.navigationLink}>Início</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={scrollToReleases}>
                  <Text style={styles.navigationLink}>Novidades</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={scrollToAbout}>
                  <Text style={styles.navigationLink}>Sobre</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              style={styles.headerLoginButton}
              onPress={openLogin}
            >
              <Text style={styles.headerLoginText}>Entrar</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
          <View style={[styles.heroCopy, isDesktop && styles.heroCopyDesktop]}>
            <View style={styles.eyebrowPill}>
              <View style={styles.liveDot} />
              <Text style={styles.eyebrowText}>NUTRIÇÃO PARA QUEM TREINA</Text>
            </View>
            <Text accessibilityRole="header" style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>
              Transforme rotina em{`\n`}
              <Text style={styles.heroTitleAccent}>performance.</Text>
            </Text>
            <Text style={styles.heroDescription}>
              O IronPlate organiza alimentação, treinos e evolução em um só lugar — para você saber o que fazer hoje e enxergar o quanto já avançou.
            </Text>
            <View style={[styles.heroActions, isCompact && styles.heroActionsCompact]}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.primaryButton, isCompact && styles.fullWidthButton]}
                onPress={openRegister}
              >
                <Text style={styles.primaryButtonText}>Começar agora</Text>
                <Ionicons name="arrow-forward" size={19} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.secondaryButton, isCompact && styles.fullWidthButton]}
                onPress={scrollToAbout}
              >
                <Ionicons name="play" size={17} color={COLORS.primary} />
                <Text style={styles.secondaryButtonText}>Conhecer o IronPlate</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.heroTrustRow}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accent} />
              <Text style={styles.heroTrustText}>Seus dados protegidos e sob seu controle.</Text>
            </View>
          </View>

          <View style={[styles.previewWrap, isDesktop && styles.previewWrapDesktop]}>
            <View style={styles.previewGlow} />
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View>
                  <Text style={styles.previewKicker}>VISÃO DE HOJE</Text>
                  <Text style={styles.previewGreeting}>Sua meta diária</Text>
                </View>
                <View style={styles.previewAvatar}>
                  <Ionicons name="person" size={18} color={COLORS.text} />
                </View>
              </View>

              <View style={styles.caloriePanel}>
                <View style={styles.calorieRing}>
                  <Text style={styles.calorieValue}>1.840</Text>
                  <Text style={styles.calorieUnit}>de 2.450 kcal</Text>
                </View>
                <View style={styles.calorieCopy}>
                  <Text style={styles.calorieCopyLabel}>75% da meta</Text>
                  <Text style={styles.calorieCopyTitle}>No caminho certo</Text>
                  <Text style={styles.calorieCopyHint}>Faltam 610 kcal para hoje</Text>
                </View>
              </View>

              <View style={styles.macrosRow}>
                <MacroPreview label="Proteína" value="132g" progress="78%" color={COLORS.protein} />
                <MacroPreview label="Carbo" value="206g" progress="68%" color={COLORS.carbs} />
                <MacroPreview label="Gordura" value="54g" progress="72%" color={COLORS.fat} />
              </View>

              <View style={styles.previewFooter}>
                <View style={styles.previewFooterIcon}>
                  <Ionicons name="barbell-outline" size={19} color={COLORS.primary} />
                </View>
                <View style={styles.previewFooterCopy}>
                  <Text style={styles.previewFooterLabel}>Próxima atividade</Text>
                  <Text style={styles.previewFooterTitle}>Treino de força · 18:30</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionEyebrow}>TUDO NO MESMO RITMO</Text>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Menos improviso. Mais clareza.
          </Text>
          <Text style={styles.sectionDescription}>
            Ferramentas essenciais para transformar seus dados em uma rotina possível de seguir.
          </Text>
          <View style={[styles.featuresGrid, isDesktop && styles.featuresGridDesktop]}>
            {FEATURES.map((feature) => (
              <View key={feature.title} style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon} size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View onLayout={captureReleasesOffset} style={styles.releasesSection}>
          <View style={[styles.releasesHeader, isDesktop && styles.releasesHeaderDesktop]}>
            <View style={styles.releasesHeaderCopy}>
              <Text style={styles.releaseEyebrow}>NOVIDADES DO IRONPLATE</Text>
              <Text accessibilityRole="header" style={[styles.releaseSectionTitle, isCompact && styles.releaseSectionTitleCompact]}>
                O produto evolui junto com a sua rotina.
              </Text>
            </View>
            <Text style={styles.releaseSectionDescription}>
              Um resumo transparente das melhorias mais recentes em alimentação, progresso, treinos e segurança.
            </Text>
          </View>

          <View style={[styles.releaseGrid, isDesktop && styles.releaseGridDesktop]}>
            {RELEASES.map((release) => (
              <View
                key={`${release.badge}-${release.title}`}
                style={[
                  styles.releaseCard,
                  release.featured && styles.releaseCardFeatured,
                  isDesktop && styles.releaseCardDesktop,
                  isDesktop && release.featured && styles.releaseCardFeaturedDesktop,
                ]}
              >
                <View style={styles.releaseMetaRow}>
                  <View style={[styles.releaseBadge, release.featured && styles.releaseBadgeFeatured]}>
                    <Text style={[styles.releaseBadgeText, release.featured && styles.releaseBadgeTextFeatured]}>
                      {release.badge}
                    </Text>
                  </View>
                  <Text style={styles.releaseDate}>{release.date}</Text>
                </View>

                <View style={[styles.releaseIcon, release.featured && styles.releaseIconFeatured]}>
                  <Ionicons
                    name={release.icon}
                    size={23}
                    color={release.featured ? COLORS.text : COLORS.primary}
                  />
                </View>
                <Text style={styles.releaseTitle}>{release.title}</Text>
                <Text style={styles.releaseDescription}>{release.description}</Text>

                <View style={styles.releaseHighlights}>
                  {release.highlights.map((highlight) => (
                    <View key={highlight} style={styles.releaseHighlightRow}>
                      <Ionicons name="checkmark-circle" size={17} color={COLORS.accent} />
                      <Text style={styles.releaseHighlightText}>{highlight}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View onLayout={captureAboutOffset} style={styles.aboutSection}>
          <View style={[styles.aboutPanel, isDesktop && styles.aboutPanelDesktop]}>
            <View style={[styles.aboutCopy, isDesktop && styles.aboutCopyDesktop]}>
              <Text style={styles.aboutEyebrow}>SOBRE O IRONPLATE</Text>
              <Text accessibilityRole="header" style={[styles.aboutTitle, isCompact && styles.aboutTitleCompact]}>
                Tecnologia que acompanha a sua disciplina.
              </Text>
              <Text style={styles.aboutDescription}>
                O IronPlate nasceu para aproximar planejamento e prática. Em vez de dados espalhados, você encontra uma leitura integrada da sua alimentação, treino e composição corporal.
              </Text>
              <Text style={styles.aboutDescription}>
                A proposta é simples: dar contexto à sua rotina para que cada escolha tenha propósito — seja ganhar massa, reduzir gordura ou manter a performance.
              </Text>
              <TouchableOpacity style={styles.aboutButton} onPress={openRegister}>
                <Text style={styles.aboutButtonText}>Criar minha conta</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.background} />
              </TouchableOpacity>
            </View>

            <View style={[styles.stepsCard, isDesktop && styles.stepsCardDesktop]}>
              <Text style={styles.stepsKicker}>COMECE EM TRÊS PASSOS</Text>
              {STEPS.map((step, index) => (
                <View key={step.number} style={styles.stepRow}>
                  <View style={styles.stepNumberWrap}>
                    <Text style={styles.stepNumber}>{step.number}</Text>
                  </View>
                  <View style={styles.stepCopy}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                  {index < STEPS.length - 1 && <View style={styles.stepLine} />}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <Text accessibilityRole="header" style={styles.ctaTitle}>Pronto para treinar com mais direção?</Text>
          <Text style={styles.ctaDescription}>
            Crie seu perfil e transforme metas em ações diárias.
          </Text>
          <View style={styles.ctaActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={openRegister}>
              <Text style={styles.primaryButtonText}>Começar agora</Text>
              <Ionicons name="arrow-forward" size={19} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaLoginButton} onPress={openLogin}>
              <Text style={styles.ctaLoginText}>Já tenho uma conta</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.logoRow}>
            <View style={styles.logoMarkSmall}>
              <Ionicons name="barbell" size={15} color={COLORS.text} />
            </View>
            <Text style={styles.footerLogoText}>IRONPLATE</Text>
          </View>
          <Text style={styles.footerText}>Nutrição, treino e evolução no mesmo ritmo.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.footerLink}>Privacidade</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LoginModal
        visible={loginVisible}
        onClose={closeLogin}
        onForgotPassword={openForgotPassword}
        onRegister={openRegister}
      />
      <RegisterModal
        visible={registerVisible}
        onClose={closeRegister}
        onLogin={openLogin}
        onPrivacyPolicy={openPrivacyPolicy}
      />
    </SafeAreaView>
  );
}

function MacroPreview({
  label,
  value,
  progress,
  color,
}: {
  label: string;
  value: string;
  progress: `${number}%`;
  color: string;
}) {
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroLabelRow}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      <Text style={styles.macroValue}>{value}</Text>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: progress, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0D16',
  },
  screen: {
    flex: 1,
    backgroundColor: '#0B0D16',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerShell: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#202332',
    backgroundColor: '#0B0D16',
  },
  header: {
    width: '100%',
    maxWidth: 1180,
    minHeight: 72,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  logoMarkSmall: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  logoText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  navigationLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  navigationLink: {
    paddingVertical: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  headerLoginButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  headerLoginText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
  },
  hero: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    gap: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    paddingTop: 72,
    paddingBottom: 88,
  },
  heroDesktop: {
    minHeight: 670,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCopy: {
    flex: 1,
  },
  heroCopyDesktop: {
    paddingRight: SPACING.xl,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#353A4F',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#121522',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  eyebrowText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.35,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 52,
    fontWeight: '900',
    lineHeight: 58,
    letterSpacing: -1.8,
  },
  heroTitleCompact: {
    fontSize: 40,
    lineHeight: 45,
    letterSpacing: -1.25,
  },
  heroTitleAccent: {
    color: COLORS.primary,
  },
  heroDescription: {
    maxWidth: 600,
    marginTop: SPACING.lg,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    lineHeight: 26,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: SPACING.xl,
  },
  heroActionsCompact: {
    flexDirection: 'column',
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: '#34394B',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#121522',
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  fullWidthButton: {
    width: '100%',
  },
  heroTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  heroTrustText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  previewWrap: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWrapDesktop: {
    minHeight: 490,
  },
  previewGlow: {
    position: 'absolute',
    width: '76%',
    height: '76%',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 107, 53, 0.14)',
  },
  previewCard: {
    width: '100%',
    maxWidth: 500,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#353A4E',
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: '#151827',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 38,
    elevation: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  previewKicker: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  previewGreeting: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
  },
  previewAvatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#2B3042',
  },
  caloriePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#0F1220',
  },
  calorieRing: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#181B2A',
  },
  calorieValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: '900',
  },
  calorieUnit: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 9,
  },
  calorieCopy: {
    minWidth: 0,
    flex: 1,
  },
  calorieCopyLabel: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
  },
  calorieCopyTitle: {
    marginTop: 5,
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
  },
  calorieCopyHint: {
    marginTop: 5,
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  macroItem: {
    minWidth: 0,
    flex: 1,
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#202435',
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  macroLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
  },
  macroValue: {
    marginTop: 7,
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
  },
  macroTrack: {
    height: 4,
    overflow: 'hidden',
    marginTop: 9,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#353A4B',
  },
  macroFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#2B3041',
  },
  previewFooterIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  previewFooterCopy: {
    minWidth: 0,
    flex: 1,
  },
  previewFooterLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  previewFooterTitle: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  featuresSection: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 88,
    borderTopWidth: 1,
    borderTopColor: '#202332',
  },
  sectionEyebrow: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  sectionTitle: {
    marginTop: SPACING.sm,
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.1,
    textAlign: 'center',
  },
  sectionDescription: {
    maxWidth: 580,
    alignSelf: 'center',
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    lineHeight: 25,
    textAlign: 'center',
  },
  featuresGrid: {
    gap: SPACING.md,
    marginTop: SPACING.xxl,
  },
  featuresGridDesktop: {
    flexDirection: 'row',
  },
  featureCard: {
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#292D3D',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#121522',
  },
  featureCardDesktop: {
    flex: 1,
  },
  featureIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  featureTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
  },
  featureDescription: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
  },
  releasesSection: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 88,
    borderTopWidth: 1,
    borderTopColor: '#202332',
  },
  releasesHeader: {
    gap: SPACING.md,
  },
  releasesHeaderDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  releasesHeaderCopy: {
    minWidth: 0,
    flex: 1,
  },
  releaseEyebrow: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  releaseSectionTitle: {
    maxWidth: 620,
    marginTop: SPACING.sm,
    color: COLORS.text,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
    letterSpacing: -1.15,
  },
  releaseSectionTitleCompact: {
    fontSize: 31,
    lineHeight: 37,
  },
  releaseSectionDescription: {
    maxWidth: 430,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
  },
  releaseGrid: {
    gap: SPACING.md,
    marginTop: SPACING.xxl,
  },
  releaseGridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  releaseCard: {
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#292D3D',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#121522',
  },
  releaseCardDesktop: {
    minWidth: 0,
    flex: 1,
  },
  releaseCardFeatured: {
    borderColor: 'rgba(255, 107, 53, 0.58)',
    backgroundColor: '#191925',
  },
  releaseCardFeaturedDesktop: {
    flex: 1.2,
  },
  releaseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  releaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#24283A',
  },
  releaseBadgeFeatured: {
    backgroundColor: 'rgba(255, 107, 53, 0.16)',
  },
  releaseBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.15,
  },
  releaseBadgeTextFeatured: {
    color: COLORS.primaryLight,
  },
  releaseDate: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  releaseIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  releaseIconFeatured: {
    backgroundColor: COLORS.primary,
  },
  releaseTitle: {
    marginTop: SPACING.lg,
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '900',
    lineHeight: 24,
  },
  releaseDescription: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 21,
  },
  releaseHighlights: {
    gap: 10,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#2A2E3E',
  },
  releaseHighlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  releaseHighlightText: {
    minWidth: 0,
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    lineHeight: 18,
  },
  aboutSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 88,
    backgroundColor: '#111420',
  },
  aboutPanel: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    gap: SPACING.xl,
    padding: SPACING.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#363A4B',
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: '#191C2B',
  },
  aboutPanelDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 48,
  },
  aboutCopy: {
    flex: 1,
  },
  aboutCopyDesktop: {
    paddingRight: SPACING.xl,
  },
  aboutEyebrow: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  aboutTitle: {
    maxWidth: 600,
    marginTop: SPACING.sm,
    color: COLORS.text,
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 46,
    letterSpacing: -1.2,
  },
  aboutTitleCompact: {
    fontSize: 31,
    lineHeight: 37,
  },
  aboutDescription: {
    maxWidth: 620,
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 23,
  },
  aboutButton: {
    minHeight: 50,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.text,
  },
  aboutButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
  },
  stepsCard: {
    flex: 1,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#0F1220',
  },
  stepsCardDesktop: {
    maxWidth: 430,
  },
  stepsKicker: {
    marginBottom: SPACING.lg,
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  stepRow: {
    position: 'relative',
    flexDirection: 'row',
    minHeight: 82,
  },
  stepNumberWrap: {
    zIndex: 1,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#171A28',
  },
  stepNumber: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.xs,
    fontWeight: '900',
  },
  stepCopy: {
    minWidth: 0,
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
  },
  stepDescription: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    lineHeight: 18,
  },
  stepLine: {
    position: 'absolute',
    top: 42,
    bottom: 0,
    left: 20,
    width: 1,
    backgroundColor: '#3B4051',
  },
  ctaSection: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 96,
  },
  ctaTitle: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.1,
    textAlign: 'center',
  },
  ctaDescription: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
  },
  ctaActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  ctaLoginButton: {
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  ctaLoginText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  footer: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: '#202332',
  },
  footerLogoText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  footerLink: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
});
