
export interface Skill {
  id: string;
  name: string;
  description: string;
  cooldown?: string;
}

export interface Abnormality {
  id: string;
  name: string;
  mainSkill: string;
  ultimateId: string;
  passiveId: string;
  learnableSkills: string[];
  traitSlots: number;
  weight: number;
  wishingStatues: string[];
  wayToGet: string[];
  type: string;
}

export type DeviantType = '造物' | '領地' | '戰鬥';
export type TraitCategory = '通用' | '係數' | '造物' | '領地' | '戰鬥' | '非正常' | '混沌' | '變異';

export interface Trait {
  id: string;
  name: string;
  category: TraitCategory;
  description: string;
  boundSpecies?: string;
  isFusable: boolean;
}

export interface UserInventoryDeviant {
  id: string;
  abnormalityId: string;
  ability: number;
  activity: number;
  traits: string[];
  count: number;
}

export interface GoalConfiguration {
  targetAbnormalityId: string;
  desiredTraitIds: string[];
}

export interface MissingRequirement {
  type: 'species' | 'trait' | 'blank_55_fodder';
  name: string;
  purpose: string;
}

export interface SolverResult {
  steps: any; // Keep as any or FusionStep for now to avoid circular deps in types
  missingElements: MissingRequirement[];
  isPossible: boolean;
}
