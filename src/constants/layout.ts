export const PHONE_BREAKPOINT = 768;
export const SMALL_PHONE_BREAKPOINT = 360;
export const SCREEN_CONTENT_MAX_WIDTH = 760;

export function isPhoneLayout(width: number): boolean {
  return width < PHONE_BREAKPOINT;
}

