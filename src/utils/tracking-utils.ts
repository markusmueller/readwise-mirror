import type { App, TFile } from 'obsidian';
import { canonicalizeApiBaseUrl } from 'services/readwise-api';
import type { PluginSettings } from 'types/settings';
import { READWISE_REVIEW_URL_BASE } from '../constants';

const BOOKREVIEW_PATH = '/bookreview/';

/**
 * URL prefixes that mark a frontmatter value as a Readwise tracking URL:
 * readwise.io, plus the origin of a custom API base URL so that a self-hosted
 * backend can emit `readwise_url` on its own host.
 */
export function getTrackingUrlBases(settings: Pick<PluginSettings, 'apiBaseUrl'>): string[] {
  const bases = [READWISE_REVIEW_URL_BASE];
  const apiBaseUrl = canonicalizeApiBaseUrl(settings.apiBaseUrl);
  if (apiBaseUrl) {
    const customBase = `${new URL(apiBaseUrl).origin}${BOOKREVIEW_PATH}`;
    if (customBase !== READWISE_REVIEW_URL_BASE) bases.push(customBase);
  }
  return bases;
}

/**
 * Returns the Readwise book id encoded in a tracking URL, or undefined when the
 * value is not a string, does not start with an accepted base, or carries no numeric id.
 */
export function parseTrackedReadwiseId(
  value: unknown,
  settings: Pick<PluginSettings, 'apiBaseUrl'>
): number | undefined {
  if (typeof value !== 'string') return undefined;
  const base = getTrackingUrlBases(settings).find((b) => value.startsWith(b));
  if (!base) return undefined;
  const idStr = value.slice(base.length);
  return /^\d+$/.test(idStr) ? Number(idStr) : undefined;
}

/**
 * Determines whether a file is a Readwise-tracked note by checking a configured frontmatter property.
 *
 * Checks the frontmatter property named by `settings.trackingProperty` and returns true if its string value is a
 * tracking URL for one of the bases from `getTrackingUrlBases`.
 * Returns false for a falsy `file`, a missing or non-string property, or a value that does not start with an accepted base.
 *
 * @param settings - Plugin settings; `settings.trackingProperty` is the frontmatter key to inspect.
 * @returns True if the file is tracked by Readwise, otherwise false.
 */
export function isTrackedReadwiseNote(file: TFile, app: App, settings: PluginSettings): boolean {
  if (!file) {
    return false;
  }
  const trackingProperty = settings.trackingProperty;
  const fileCache = app.metadataCache.getFileCache(file);
  const frontmatterValue: unknown = fileCache?.frontmatter?.[trackingProperty];

  return parseTrackedReadwiseId(frontmatterValue, settings) !== undefined;
}

/**
 * Returns whether a file is located inside the configured Readwise library folder.
 *
 * Traverses the file's parent folders upward and compares each folder's path to
 * `settings.baseFolderName` (trimmed). If `file` is falsy or `settings.baseFolderName`
 * is empty after trimming, the function returns false.
 *
 * @param file - The file to check (may be null/undefined).
 * @param settings - Plugin settings; `baseFolderName` is used (whitespace trimmed) as the root folder name to match.
 * @returns True if an ancestor folder's path equals the configured base folder name; otherwise false.
 */
export function isInReadwiseLibrary(file: TFile | null | undefined, settings: PluginSettings): boolean {
  if (!file) return false;
  const baseFolderName = settings.baseFolderName?.trim();
  if (!baseFolderName) return false;
  let currentFolder = file.parent;

  while (currentFolder) {
    if (currentFolder.path === baseFolderName) {
      return true;
    }
    currentFolder = currentFolder.parent;
  }
  return false;
}
