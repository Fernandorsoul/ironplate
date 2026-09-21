import { CURATED_RELEASE_NEWS } from './releaseNewsCurated';
import { GENERATED_RELEASE_NEWS } from './releaseNewsGenerated';
import type { ReleaseNewsCard } from './releaseNewsTypes';

export type { ReleaseNewsCard } from './releaseNewsTypes';

/**
 * Fonte única da seção "Novidades" da home pública.
 * Releases do GitHub entram primeiro (sempre atualizadas no deploy/build);
 * cards curatoriais manuais ficam em seguida.
 */
export const RELEASE_NEWS: ReleaseNewsCard[] = [
  ...GENERATED_RELEASE_NEWS,
  ...CURATED_RELEASE_NEWS,
];
