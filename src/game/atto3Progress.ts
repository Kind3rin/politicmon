export const PHOTO_CHAPTER_REWARD_FLAGS = Object.freeze({
  "campo-photo-complete": true,
  "coalition-menu-unlocked": true,
  "cornice-impossibile": true,
  "feed-dossier-1": true,
  "future-chapter-unlocked": true
} as const);

export function photoChapterRewardPatch(flags: Readonly<Record<string, boolean>>): typeof PHOTO_CHAPTER_REWARD_FLAGS | null {
  return flags["campo-photo-complete"] ? null : PHOTO_CHAPTER_REWARD_FLAGS;
}
