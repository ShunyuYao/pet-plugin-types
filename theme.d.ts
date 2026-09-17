/**
 * @experimental Chat theme v1: data format, unreleased.
 * Pure data; no SDK methods, CSS, URLs, scripts, fonts, icons or layout definitions.
 * The host enforces exact object fields and the 16 KiB UTF-8 JSON file limit.
 */
export type ThemeColorKey =
  | 'canvas' | 'panel' | 'ink' | 'muted' | 'surface' | 'card' | 'line'
  | 'accent' | 'accentInk' | 'tint' | 'success' | 'error' | 'errorSurface' | 'file' | 'fileInk';

/** @experimental The host validates exactly six hexadecimal digits (#RRGGBB), not arbitrary CSS. */
export type ThemeColor = `#${string}`;

/** @experimental Exactly fifteen required color slots. */
export type ThemeColors = Record<ThemeColorKey, ThemeColor>;

/** @experimental Integer pixel radius; values outside 0–28 are rejected. */
export type ThemeRadius = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
  | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28;

/** @experimental Presets rendered by the host; no external assets or arbitrary styles. */
export type ThemeTexture = 'plain' | 'paper' | 'grid';

/** @experimental These six fields are the complete accepted theme document. */
export interface ThemeDefinition {
  schemaVersion: 1;
  target: 'chat';
  colors: ThemeColors;
  radius: ThemeRadius;
  bubbleRadius: ThemeRadius;
  texture: ThemeTexture;
}
