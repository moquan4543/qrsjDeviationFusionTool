
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
}
