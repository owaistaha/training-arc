// Exercise media is © Gym visual (not MIT). It's loaded straight from the pinned
// dataset commit — never copied into public/, never resized by next/image.
export const DATASET_COMMIT = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd";
export const MEDIA_BASE = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${DATASET_COMMIT}/`;

export const GYM_VISUAL_CREDIT = "© Gym visual — https://gymvisual.com/";
export const GYM_VISUAL_URL = "https://gymvisual.com/";

/** Media is shown at its native size, max 180×180. */
export const MEDIA_SIZE = 180;

export function mediaUrl(path: string): string {
  return MEDIA_BASE + path.replace(/^\/+/, "");
}
