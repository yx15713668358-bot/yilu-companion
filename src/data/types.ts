export type Position = [number, number];

export interface ItemRef {
  asset: string;
  name: string;
}

export interface UnitRef {
  asset: string;
  name: string;
  cost?: number;
  role: string;
  pos: Position;
  slotCost?: number;
}

export interface Loadout {
  label: string;
  items: ItemRef[];
}

export interface Substitute {
  slot: string;
  options: Array<{ asset: string; name: string; band: string }>;
}

export interface ItemHolder {
  type: string;
  holder: string;
  holderAsset: string;
  items: ItemRef[];
  target: string;
  targetAsset: string;
  transferAt: string;
}

export interface TransitionStage {
  stage: string;
  level: number;
  goldGoal: string;
  rollAction: string;
  boardUnits: UnitRef[];
  mustHold: string[];
  temporaryUnits: string[];
  substitutes: Substitute[];
  itemHolders: ItemHolder[];
  sellWhen: string;
  nextTarget: string;
  pivotWarning: string;
  transitionSource: string;
}

export interface PostCapUnit {
  asset: string;
  name: string;
  reason: string;
}

export interface PostCapPlan {
  stableAt: string;
  stayAndRollWhen: string[];
  goNineWhen: string[];
  level9Adds: PostCapUnit[];
  removeFirst: PostCapUnit[];
  priority: string[];
  extraItems: string[];
  cannotNine: string;
  source: string;
}

export interface PrototypeCopy {
  headline: string;
  brief: string;
  itemPriority: string[];
  flexibleItems: string;
  avoidItem: string;
  keyUnitNames: string[];
}

export interface Comp {
  id: string;
  name: string;
  goal: 'climb' | 'chicken' | 'conditional';
  currentTier: string;
  consensus: string;
  trend: string;
  style: string;
  difficulty: string;
  damage: string;
  traits: string;
  updateNote: string;
  suitable: string;
  avoid: string;
  pivot: string;
  roll: string;
  threeStar: string;
  boardNote: string;
  requirements: string[];
  augments: string[][];
  units: UnitRef[];
  loadouts: Loadout[];
  transitionStages: TransitionStage[];
  postCapPlan: PostCapPlan;
  sourceStats: Array<{
    source: string;
    rating: string;
    updated: string;
    note: string;
    games?: number;
    avg?: number;
    top4?: string;
    win?: string;
  }>;
  prototype: PrototypeCopy;
}
