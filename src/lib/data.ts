
import abnormalities from '@/data/abnormalities.json';
import skills from '@/data/skills.json';
import { Abnormality, Skill } from '@/types';

export function getAbnormalities(): Abnormality[] {
  return abnormalities as Abnormality[];
}

export function getSkills(): Skill[] {
  return skills as Skill[];
}

export function getSkillById(id: string): Skill | undefined {
  return (skills as Skill[]).find(s => s.id === id || s.name === id);
}

export function getAbnormalityById(id: string): Abnormality | undefined {
  return (abnormalities as Abnormality[]).find(a => a.id === id);
}

export function filterAbnormalities(targetSkills: string[], excludeSkills: string[]): Abnormality[] {
  return (abnormalities as Abnormality[]).filter(ab => {
    // Check if it has all target skills
    const hasTarget = targetSkills.every(ts => ab.learnableSkills.includes(ts));
    // Check if it has any exclude skills
    const hasExclude = excludeSkills.some(es => ab.learnableSkills.includes(es));
    
    return hasTarget && !hasExclude;
  });
}
