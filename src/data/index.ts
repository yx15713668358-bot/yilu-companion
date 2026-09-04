import rawComps from './comps.json';
import fileManifest from './asset-manifest.json';
import type { Comp } from './types';

const imageModules = import.meta.glob('../assets/game/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const imageByName = Object.fromEntries(
  Object.entries(imageModules).map(([filePath, url]) => [filePath.split('/').at(-1), url]),
);

export const comps = rawComps as unknown as Comp[];

export function assetUrl(key: string): string {
  const fileName = (fileManifest as Record<string, string>)[key];
  return fileName ? imageByName[fileName] ?? '' : '';
}

export type { Comp, ItemHolder, ItemRef, Loadout, PostCapPlan, TransitionStage, UnitRef } from './types';
