import type { ReleaseNewsCard } from './releaseNewsTypes';

/**
 * Gerado automaticamente por scripts/sync-release-news.mjs a partir das
 * GitHub Releases publicadas. Não edite à mão — rode npm run sync:release-news.
 */
export const GENERATED_RELEASE_NEWS: ReleaseNewsCard[] = [
  {
    badge: "RELEASE",
    date: "setembro de 2026",
    icon: "rocket-outline",
    title: "Versão v1.0.23",
    description: "Full Changelog: https://github.com/Fernandorsoul/ironplate/compare/v1.0.22...v1.0.23",
    highlights: [
      "feat: APK Neon-ready + Novidades automaticas por release by @Fernandorsoul in https://github.com/Fernandorsoul/ironplate/pull/155",
      "Dev by @Fernandorsoul in https://github.com/Fernandorsoul/ironplate/pull/156",
    ],
    featured: true,
    version: "v1.0.23",
    url: "https://github.com/Fernandorsoul/ironplate/releases/tag/v1.0.23",
  },
  {
    badge: "RELEASE",
    date: "setembro de 2026",
    icon: "analytics-outline",
    title: "Versão v1.0.22",
    description: "Adiciona target_weight_kg, hydration_goal_ml, water_ml, last_login via bootstrap (0004 legado fora do journal).",
    highlights: [],
    version: "v1.0.22",
    url: "https://github.com/Fernandorsoul/ironplate/releases/tag/v1.0.22",
  },
  {
    badge: "RELEASE",
    date: "setembro de 2026",
    icon: "rocket-outline",
    title: "Versão v1.0.21",
    description: "Web usa same-origin /api; corrige CORS em aliases rs-oul.vercel.app",
    highlights: [],
    version: "v1.0.21",
    url: "https://github.com/Fernandorsoul/ironplate/releases/tag/v1.0.21",
  },
  {
    badge: "CORREÇÃO",
    date: "setembro de 2026",
    icon: "construct-outline",
    title: "Versão v1.0.20",
    description: "Hotfix login: coercao de session_version + fail-open rate limit store.",
    highlights: [],
    version: "v1.0.20",
    url: "https://github.com/Fernandorsoul/ironplate/releases/tag/v1.0.20",
  },
];
