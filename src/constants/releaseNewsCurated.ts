import type { ReleaseNewsCard } from './releaseNewsTypes';

/**
 * Cards editoriais manuais da home pública.
 * O script scripts/sync-release-news.mjs não altera este arquivo.
 */
export const CURATED_RELEASE_NEWS: ReleaseNewsCard[] = [
  {
    badge: 'NOVIDADE',
    date: 'Agosto de 2026',
    icon: 'restaurant-outline',
    title: 'Dietas esportivas agora passam por validação completa',
    description:
      'Os cardápios deixaram de combinar alimentos soltos e agora partem de refeições que fazem sentido na prática.',
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
    description:
      'Reforçamos a persistência para que registros manuais de peso e o plano escolhido continuem disponíveis ao voltar ao IronPlate.',
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
    description:
      'As atualizações recentes também melhoraram a edição das fichas de treino e protegeram fluxos sensíveis do aplicativo.',
    highlights: [
      'Grupos musculares das fichas podem ser personalizados',
      'Recuperação de senha e exportações receberam proteções adicionais',
    ],
  },
];
