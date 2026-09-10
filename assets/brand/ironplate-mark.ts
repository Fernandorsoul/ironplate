/**
 * IronPlate brand mark — Forge Plate
 * Circular gym/food plate with grip notches and a central iron bar ("I").
 * Source of truth for logo/favicon generation. Do not hand-edit PNGs.
 */
export const IRONPLATE_PALETTE = {
  iron: '#1A1A2E',
  forge: '#FF6B35',
  forgeDeep: '#E55A2B',
  plate: '#16213E',
  steel: '#B2BEC3',
  mint: '#00B894',
} as const;

export function ironPlateMarkSvg(options?: {
  size?: number;
  background?: 'none' | 'iron' | 'transparent';
  monochrome?: string;
}): string {
  const size = options?.size ?? 1024;
  const mono = options?.monochrome;
  const bgMode = options?.background ?? 'iron';
  const forge = mono ?? IRONPLATE_PALETTE.forge;
  const deep = mono ?? IRONPLATE_PALETTE.forgeDeep;
  const iron = IRONPLATE_PALETTE.iron;
  const plate = mono ?? IRONPLATE_PALETTE.plate;
  const steel = mono ?? IRONPLATE_PALETTE.steel;

  const bg =
    bgMode === 'transparent'
      ? ''
      : bgMode === 'none'
        ? ''
        : `<rect width="1024" height="1024" fill="${iron}"/>`;

  // Soft vignette plate under the mark
  const underplate =
    bgMode === 'transparent'
      ? ''
      : `<circle cx="512" cy="512" r="360" fill="${iron}" opacity="0.55"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024" role="img" aria-label="IronPlate">
  ${bg}
  ${underplate}
  <!-- Outer plate rim -->
  <circle cx="512" cy="512" r="340" fill="none" stroke="${forge}" stroke-width="56"/>
  <!-- Inner plate face -->
  <circle cx="512" cy="512" r="268" fill="${plate}" stroke="${deep}" stroke-width="10"/>
  <!-- Grip notches (Olympic plate) -->
  <g fill="${iron}">
    <circle cx="512" cy="198" r="34"/>
    <circle cx="512" cy="826" r="34"/>
    <circle cx="198" cy="512" r="34"/>
    <circle cx="826" cy="512" r="34"/>
  </g>
  <!-- Center hub -->
  <circle cx="512" cy="512" r="92" fill="${iron}" stroke="${forge}" stroke-width="18"/>
  <!-- Iron bar / letter I through the hub -->
  <rect x="488" y="360" width="48" height="304" rx="12" fill="${forge}"/>
  <rect x="430" y="360" width="164" height="36" rx="10" fill="${steel}"/>
  <rect x="430" y="628" width="164" height="36" rx="10" fill="${steel}"/>
</svg>`;
}
