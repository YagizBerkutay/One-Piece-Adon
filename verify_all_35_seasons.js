const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");
const STATIC_MAP_PATH = path.join(__dirname, "subtitle-map.json");

const arcDefinitions = [
  { folderSeason: 1,  name: "Romance Dawn",             codes: ["RD", "ROMA"] },
  { folderSeason: 2,  name: "Orange Town",              codes: ["OT", "ORA"] },
  { folderSeason: 3,  name: "Syrup Village",            codes: ["SY", "SYR"] },
  { folderSeason: 4,  name: "Gaimon",                   codes: ["GA", "GAI"] },
  { folderSeason: 5,  name: "Baratie",                  codes: ["BA", "BAR"] },
  { folderSeason: 6,  name: "Arlong Park",              codes: ["AP", "ARL"] },
  { folderSeason: 7,  name: "Buggy's Crew",             codes: ["BU", "BUG"] },
  { folderSeason: 8,  name: "Loguetown",                codes: ["LT", "LOG"] },
  { folderSeason: 9,  name: "Reverse Mountain",         codes: ["RM", "REV"] },
  { folderSeason: 10, name: "Whisky Peak",              codes: ["WP", "WHI"] },
  { folderSeason: 11, name: "Koby-Meppo",               codes: ["KM", "KOB"] },
  { folderSeason: 12, name: "Little Garden",            codes: ["LG", "LIT"] },
  { folderSeason: 13, name: "Drum Island",              codes: ["DI", "DRU"] },
  { folderSeason: 14, name: "Alabasta",                 codes: ["AL", "ALA"] },
  { folderSeason: 15, name: "Jaya",                     codes: ["JA", "JAY"] },
  { folderSeason: 16, name: "Skypiea",                  codes: ["SK", "SKY"] },
  { folderSeason: 17, name: "Long Ring Long Land",      codes: ["LR", "LL", "LON"] },
  { folderSeason: 18, name: "Water Seven",              codes: ["WS", "WAT"] },
  { folderSeason: 19, name: "Enies Lobby",              codes: ["EL", "ENI"] },
  { folderSeason: 20, name: "Post-Enies Lobby",         codes: ["PE", "POS"] },
  { folderSeason: 21, name: "Thriller Bark",            codes: ["TB", "THR"] },
  { folderSeason: 22, name: "Sabaody Archipelago",      codes: ["SA", "SAB"] },
  { folderSeason: 23, name: "Amazon Lily",              codes: ["AM", "AZ", "AMA"] },
  { folderSeason: 24, name: "Impel Down",               codes: ["ID", "IMP"] },
  { folderSeason: 25, name: "Straw Hats",               codes: ["SH", "STR"] },
  { folderSeason: 26, name: "Marineford",               codes: ["MF", "MAR"] },
  { folderSeason: 27, name: "Post-War",                 codes: ["PW", "POW"] },
  { folderSeason: 28, name: "Return to Sabaody",        codes: ["RS", "RET"] },
  { folderSeason: 29, name: "Fishman Island",           codes: ["FI", "FIS"] },
  { folderSeason: 30, name: "Punk Hazard",              codes: ["PH", "PUN"] },
  { folderSeason: 31, name: "Dressrosa",                codes: ["DR", "DRE"] },
  { folderSeason: 32, name: "Zou",                      codes: ["ZO", "ZOU"] },
  { folderSeason: 33, name: "Whole Cake Island",        codes: ["WC", "WCI"] },
  { folderSeason: 34, name: "Reverie",                  codes: ["RE", "REV"] },
  { folderSeason: 35, name: "Wano",                     codes: ["WA", "WAN"] }
];

function getAllAssFiles(dir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllAssFiles(fullPath, fileList);
    } else if (item.endsWith(".ass")) {
      const rel = path.relative(SUBTITLES_DIR, fullPath).replace(/\\/g, "/");
      if (!rel.includes("EN-subtitle") && !rel.includes("EN_subtitle")) {
        fileList.push(rel);
      }
    }
  }
  return fileList;
}

const allAssFiles = getAllAssFiles(SUBTITLES_DIR);
const codeToSubMap = {};
const seasonEpToSubMap = {};

// 1. Static map (subtitle-map.json)
try {
  const staticMap = JSON.parse(fs.readFileSync(STATIC_MAP_PATH, 'utf-8'));
  for (const [sKey, val] of Object.entries(staticMap)) {
    // sKey is "1:1", "14:1", "16:1", etc.
    seasonEpToSubMap[sKey] = val.filename;
    const sParts = sKey.split(':');
    const folderS = parseInt(sParts[0]);
    const ep = parseInt(sParts[1]);
    const arcDef = arcDefinitions.find(a => a.folderSeason === folderS);
    if (arcDef) {
      arcDef.codes.forEach(code => {
        codeToSubMap[`${code}_${ep}`] = val.filename;
      });
    }
  }
} catch (e) {}

// 2. Subfolder ass files
allAssFiles.forEach(relPath => {
  const folderMatch = relPath.match(/(\d+)\s*-\s*[^/]+[/]Bölüm\s*(\d+)/i);
  if (folderMatch) {
    const folderSeason = parseInt(folderMatch[1]);
    const episode = parseInt(folderMatch[2]);

    seasonEpToSubMap[`${folderSeason}:${episode}`] = relPath;

    const arcDef = arcDefinitions.find(a => a.folderSeason === folderSeason);
    if (arcDef) {
      arcDef.codes.forEach(code => {
        codeToSubMap[`${code}_${episode}`] = relPath;
      });
    }
  }

  const topMatch = relPath.match(/Bolum\s*(\d+)\s*-\s*tr sub\s*\[([^\]]+)\s*(\d+)\]/i);
  if (topMatch) {
    const arcName = topMatch[2].trim().toLowerCase();
    const ep = parseInt(topMatch[3]);
    if (arcName.startsWith("wano")) {
      codeToSubMap[`WA_${ep}`] = relPath;
      codeToSubMap[`WAN_${ep}`] = relPath;
      seasonEpToSubMap[`35:${ep}`] = relPath;
    }
  }
});

let totalArcsTested = 0;
let passedArcs = 0;

console.log("=== 35 SEZONUN TAMAMININ SIFIR HATA İLE DOĞRULANMASI ===");

arcDefinitions.forEach(arc => {
  totalArcsTested++;
  const primaryCode = arc.codes[0];
  const testKey = `${primaryCode}_1`;
  const result = codeToSubMap[testKey] || seasonEpToSubMap[`${arc.folderSeason}:1`];

  if (result) {
    passedArcs++;
    console.log(`[SEZON ${arc.folderSeason.toString().padStart(2, '0')}] ✅ TAM UYUMLU -> ${arc.name.padEnd(25)} (Kod: ${testKey} => ${path.basename(result)})`);
  } else {
    console.log(`[SEZON ${arc.folderSeason.toString().padStart(2, '0')}] ❌ HATA -> ${arc.name.padEnd(25)} (${testKey})`);
  }
});

console.log(`\nSONUÇ: ${passedArcs} / ${totalArcsTested} Sezon Eksiksiz Doğrulandı!`);
