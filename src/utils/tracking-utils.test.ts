/// <reference types="jest" />
import { type App, TFile } from 'obsidian';
import type { PluginSettings } from 'types/settings';
import { getTrackingUrlBases, isTrackedReadwiseNote, parseTrackedReadwiseId } from 'utils/tracking-utils';
import { DEFAULT_SETTINGS } from '../constants';

const settingsWith = (overrides: Partial<PluginSettings>): PluginSettings => ({ ...DEFAULT_SETTINGS, ...overrides });

const appWithFrontmatter = (frontmatter: Record<string, unknown> | undefined): App =>
  ({ metadataCache: { getFileCache: () => (frontmatter ? { frontmatter } : null) } }) as unknown as App;

const file = new TFile();

describe('getTrackingUrlBases', () => {
  it('accepts only readwise.io for the default API URL', () => {
    expect(getTrackingUrlBases(settingsWith({}))).toEqual(['https://readwise.io/bookreview/']);
  });

  it('adds the origin of a custom API URL', () => {
    expect(getTrackingUrlBases(settingsWith({ apiBaseUrl: 'https://proxy.example/api/v2' }))).toEqual([
      'https://readwise.io/bookreview/',
      'https://proxy.example/bookreview/',
    ]);
  });

  it('falls back to readwise.io for an unusable API URL', () => {
    expect(getTrackingUrlBases(settingsWith({ apiBaseUrl: 'not a url' }))).toEqual(['https://readwise.io/bookreview/']);
  });
});

describe('parseTrackedReadwiseId', () => {
  const settings = settingsWith({ apiBaseUrl: 'https://proxy.example/api/v2' });

  it('extracts the id from a readwise.io URL', () => {
    expect(parseTrackedReadwiseId('https://readwise.io/bookreview/42', settings)).toBe(42);
  });

  it('extracts the id from a custom-origin URL', () => {
    expect(parseTrackedReadwiseId('https://proxy.example/bookreview/42', settings)).toBe(42);
  });

  it.each([
    'https://other.example/bookreview/42',
    'https://proxy.example/bookreview/abc',
    'https://proxy.example/bookreview/',
    42,
    undefined,
  ])('rejects %p', (value) => {
    expect(parseTrackedReadwiseId(value, settings)).toBeUndefined();
  });
});

describe('isTrackedReadwiseNote', () => {
  const settings = settingsWith({ apiBaseUrl: 'https://proxy.example/api/v2', trackingProperty: 'uri' });

  it('recognises a note tracked on a custom origin', () => {
    const app = appWithFrontmatter({ uri: 'https://proxy.example/bookreview/7' });
    expect(isTrackedReadwiseNote(file, app, settings)).toBe(true);
  });

  it('still recognises a readwise.io note', () => {
    const app = appWithFrontmatter({ uri: 'https://readwise.io/bookreview/7' });
    expect(isTrackedReadwiseNote(file, app, settings)).toBe(true);
  });

  it('rejects a note from another host, a missing property and a missing cache', () => {
    expect(
      isTrackedReadwiseNote(file, appWithFrontmatter({ uri: 'https://other.example/bookreview/7' }), settings)
    ).toBe(false);
    expect(isTrackedReadwiseNote(file, appWithFrontmatter({}), settings)).toBe(false);
    expect(isTrackedReadwiseNote(file, appWithFrontmatter(undefined), settings)).toBe(false);
  });
});
