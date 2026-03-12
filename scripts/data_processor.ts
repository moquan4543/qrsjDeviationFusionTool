import fs from 'fs';
import path from 'path';

interface Skill {
  id: string;
  name: string;
  description: string;
  cooldown?: string;
}

function parseCSV(csvText: string) {
  const lines = csvText.trim().split('\n');
  const results: string[][] = [];
  
  for (let line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    results.push(row);
  }
  return results;
}

async function main() {
  const dataDir = path.join(process.cwd(), 'src/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 1. Parse skills.csv (Detailed skills with cooldown)
  const skillsCsvPath = path.join(process.cwd(), 'skills.csv');
  const skillsCsvContent = fs.readFileSync(skillsCsvPath, 'utf-8');
  const skillRows = parseCSV(skillsCsvContent);
  
  const skillsMap: Map<string, Skill> = new Map();
  
  // Headers: 戰技,冷卻(秒),描述
  skillRows.slice(1).forEach((row, index) => {
    const [name, cd, desc] = row;
    if (!name) return;
    skillsMap.set(name, {
      id: `skill_${index}`,
      name,
      cooldown: cd,
      description: desc || '暫無描述'
    });
  });

  // 2. Parse skillsList.csv (Abnormalities and their specific skills)
  const listCsvPath = path.join(process.cwd(), 'skillsList.csv');
  const listCsvContent = fs.readFileSync(listCsvPath, 'utf-8');
  const listRows = parseCSV(listCsvContent);
  
  const abnormalities: any[] = [];
  
  listRows.slice(1).forEach((row, index) => {
    const name = row[0];
    if (!name) return;
    
    const learnable = row.slice(1, 7).filter(s => s && s !== ',');
    const ultName = row[7];
    const ultDesc = row[8];
    const passiveName = row[9];
    const passiveDesc = row[10];
    
    // Add or update Ultimate
    if (ultName && !skillsMap.has(ultName)) {
      skillsMap.set(ultName, { id: `ult_${index}`, name: ultName, description: ultDesc });
    } else if (ultName && skillsMap.has(ultName)) {
       // Merge description if missing or use list description if it's more specific
       const existing = skillsMap.get(ultName)!;
       if (!existing.description || existing.description === '暫無描述') {
         existing.description = ultDesc;
       }
    }
    
    // Add or update Passive
    if (passiveName && !skillsMap.has(passiveName)) {
      skillsMap.set(passiveName, { id: `pas_${index}`, name: passiveName, description: passiveDesc });
    } else if (passiveName && skillsMap.has(passiveName)) {
       const existing = skillsMap.get(passiveName)!;
       if (!existing.description || existing.description === '暫無描述') {
         existing.description = passiveDesc;
       }
    }
    
    // Ensure learnable skills are in the map
    learnable.forEach(s => {
      if (!skillsMap.has(s)) {
        skillsMap.set(s, { id: `lrn_${s}`, name: s, description: '暫無描述' });
      }
    });
    
    abnormalities.push({
      id: `A${(index + 1).toString().padStart(3, '0')}`,
      name,
      mainSkill: `${ultName} / ${passiveName}`,
      ultimateId: ultName,
      passiveId: passiveName,
      learnableSkills: learnable,
      traitSlots: Math.floor(Math.random() * 3) + 3,
      weight: 1
    });
  });
  
  fs.writeFileSync(path.join(dataDir, 'abnormalities.json'), JSON.stringify(abnormalities, null, 2));
  fs.writeFileSync(path.join(dataDir, 'skills.json'), JSON.stringify(Array.from(skillsMap.values()), null, 2));
  
  console.log('Data processing complete with enriched skill info.');
}

main().catch(console.error);
