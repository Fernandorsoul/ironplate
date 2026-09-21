import type { ReleaseNewsCard } from './releaseNewsTypes';

/**
 * Gerado automaticamente por scripts/sync-release-news.mjs a partir das
 * GitHub Releases publicadas. Não edite à mão — rode npm run sync:release-news.
 */
export const GENERATED_RELEASE_NEWS: ReleaseNewsCard[] = [
  {
    badge: "RELEASE",
    date: "setembro de 2026",
    icon: "analytics-outline",
    title: "Versão v1.0.22",
    description: "Adiciona target_weight_kg, hydration_goal_ml, water_ml, last_login via bootstrap (0004 legado fora do journal).",
    highlights: [],
    featured: true,
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
  {
    badge: "RELEASE",
    date: "setembro de 2026",
    icon: "rocket-outline",
    title: "Versão v1.0.19",
    description: "0012 DROP CONSTRAINT IF EXISTS + nomes truncados. Validado no Neon.",
    highlights: [],
    version: "v1.0.19",
    url: "https://github.com/Fernandorsoul/ironplate/releases/tag/v1.0.19",
  },
  {
    badge: "CORREÇÃO",
    date: "setembro de 2026",
    icon: "construct-outline",
    title: "Versão v1.0.18",
    description: "Validado no Neon: DROP INDEX IF EXISTS + unique no bootstrap. Fix 42P17 ja em master.",
    highlights: [],
    version: "v1.0.18",
    url: "https://github.com/Fernandorsoul/ironplate/releases/tag/v1.0.18",
  },
  {
    badge: "CORREÇÃO",
    date: "setembro de 2026",
    icon: "bluetooth-outline",
    title: "Versão v1.0.17",
    description: "Fix 42P17 confirmado: exclusion gist imutavel. Neon snapshot: appointments table ausente (rollback), btree_gist pendente, journal ate 0003 - migrate deve aplicar 0004+ limpo.",
    highlights: [],
    version: "v1.0.17",
    url: "https://github.com/Fernandorsoul/ironplate/releases/tag/v1.0.17",
  },
];
