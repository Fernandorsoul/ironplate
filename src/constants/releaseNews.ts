import { CURATED_RELEASE_NEWS } from './releaseNewsCurated';
import { GENERATED_RELEASE_NEWS } from './releaseNewsGenerated';
import type { ReleaseNewsCard } from './releaseNewsTypes';

export type { ReleaseNewsCard } from './releaseNewsTypes';

/** Quantidade de cards de release exibidos na home pública. */
export const RELEASE_NEWS_LIMIT = 4;

/**
 * Fonte única da seção "Novidades" da home pública.
 * Mostra apenas as 4 atualizações de release mais recentes.
 * Se o GitHub Releases ainda não tiver sido sincronizado, usa o fallback curatorial.
 */
export const RELEASE_NEWS: ReleaseNewsCard[] = (
  GENERATED_RELEASE_NEWS.length > 0 ? GENERATED_RELEASE_NEWS : CURATED_RELEASE_NEWS
).slice(0, RELEASE_NEWS_LIMIT);
