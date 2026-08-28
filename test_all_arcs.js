const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

const arcDefinitions = [
  { folderSeason: 1,  codes: ["RD", "ROMA"],       keywords: ["romance", "dawn"] },
  { folderSeason: 2,  codes: ["OT", "ORA"],        keywords: ["orange", "town"] },
  { folderSeason: 3,  codes: ["SY", "SYR"],        keywords: ["syrup", "village"] },
  { folderSeason: 4,  codes: ["GA", "GAI"],        keywords: ["gaimon"] },
  { folderSeason: 5,  codes: ["BA", "BAR"],        keywords: ["baratie"] },
  { folderSeason: 6,  codes: ["AP", "ARL"],        keywords: ["arlong", "park"] },
  { folderSeason: 7,  codes: ["BU", "BUG"],        keywords: ["buggy"] },
  { folderSeason: 8,  codes: ["LT", "LOG"],        keywords: ["loguetown"] },
  { folderSeason: 9,  codes: ["RM", "REV"],        keywords: ["reverse", "mountain"] },
  { folderSeason: 10, codes: ["WP", "WHI"],        keywords: ["whisky", "peak"] },
  { folderSeason: 11, codes: ["KM", "KOB"],        keywords: ["koby", "meppo"] },
  { folderSeason: 12, codes: ["LG", "LIT"],        keywords: ["little", "garden"] },
  { folderSeason: 13, codes: ["DI", "DRU"],        keywords: ["drum", "island"] },
  { folderSeason: 14, codes: ["AL", "ALA"],        keywords: ["alabasta"] },
  { folderSeason: 15, codes: ["JA", "JAY"],        keywords: ["jaya"] },
  { folderSeason: 16, codes: ["SK", "SKY"],        keywords: ["skypiea"] },
  { folderSeason: 17, codes: ["LR", "LL", "LON"],  keywords: ["long", "ring"] },
  { folderSeason: 18, codes: ["WS", "WAT"],        keywords: ["water", "seven"] },
  { folderSeason: 19, codes: ["EL", "ENI"],        keywords: ["enies", "lobby"] },
  { folderSeason: 20, codes: ["PE", "POS"],        keywords: ["post-enies", "post enies"] },
  { folderSeason: 21, codes: ["TB", "THR"],        keywords: ["thriller", "bark"] },
  { folderSeason: 22, codes: ["SA", "SAB"],        keywords: ["sabaody", "archipelago"] },
  { folderSeason: 23, codes: ["AM", "AZ", "AMA"],  keywords: ["amazon", "lily"] },
  { folderSeason: 24, codes: ["ID", "IMP"],        keywords: ["impel", "down"] },
  { folderSeason: 25, codes: ["SH", "STR"],        keywords: ["straw", "hats"] },
  { folderSeason: 26, codes: ["MF", "MAR"],        keywords: ["marineford"] },
  { folderSeason: 27, codes: ["PW", "POW"],        keywords: ["post-war", "post war"] },
  { folderSeason: 28, codes: ["RS", "RET"],        keywords: ["return", "sabaody"] },
  { folderSeason: 29, codes: ["FI", "FIS"],        keywords: ["fishman", "island"] },
  { folderSeason: 30, codes: ["PH", "PUN"],        keywords: ["punk", "hazard"] },
  { folderSeason: 31, codes: ["DR", "DRE"],        keywords: ["dressrosa"] },
  { folderSeason: 32, codes: ["ZO", "ZOU"],        keywords: ["zou"] },
  { folderSeason: 33, codes: ["WC", "WCI"],        keywords: ["whole", "cake"] },
  { folderSeason: 34, codes: ["RE", "REV"],        keywords: ["reverie"] },
  { folderSeason: 35, codes: ["WA", "WAN"],        keywords: ["wano"] }
];

const fedewSeasonToFolderSeason = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17,
  18: 18, 19: 21, 20: 22, 21: 23, 22: 24, 23: 25, 24: 26, 25: 27,
  26: 28, 27: 29, 28: 30, 29: 31, 30: 32, 31: 33, 32: 34, 33: 35
};

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

function resolveSubtitle(idStr, rawUrl = "") {
  const decodedUrl = decodeURIComponent(rawUrl || idStr);

  // 1. Code match (e.g. SAB_4, TB_3, FI_10, WAN_1)
  const codeMatch = idStr.match(/([A-Z]{2,4})_(\d+)/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const ep = parseInt(codeMatch[2]);
    const key = `${code}_${ep}`;
    if (codeToSubMap[key]) return codeToSubMap[key];
  }

  // 2. fedewSeason / folderSeason match (e.g. 20:4 or 22:4)
  const parts = idStr.split(":");
  if (parts.length >= 2) {
    const s = parseInt(parts[parts.length - 2]);
    const ep = parseInt(parts[parts.length - 1]);
    if (!isNaN(s) && !isNaN(ep)) {
      if (s in fedewSeasonToFolderSeason) {
        const folderS = fedewSeasonToFolderSeason[s];
        if (seasonEpToSubMap[`${folderS}:${ep}`]) return seasonEpToSubMap[`${folderS}:${ep}`];
      }
      if (seasonEpToSubMap[`${s}:${ep}`]) return seasonEpToSubMap[`${s}:${ep}`];
    }
  }

  // 3. Fallback to keyword search in decoded URL
  const epMatch = decodedUrl.match(/(?:Bölüm|Episode|Sabaody Archipelago|Thriller Bark|Fishman Island|Wano|Dressrosa|Whole Cake|Punk Hazard|Marineford|Enies Lobby|Water Seven|Skypiea|Alabasta|Arlong Park|Baratie|Syrup Village|Orange Town|Romance Dawn)\s*0*(\d{1,3})/i);
  if (epMatch) {
    const ep = parseInt(epMatch[1]);
    for (const arcDef of arcDefinitions) {
      for (const kw of arcDef.keywords) {
        if (decodedUrl.toLowerCase().includes(kw)) {
          const key = `${arcDef.folderSeason}:${ep}`;
          if (seasonEpToSubMap[key]) return seasonEpToSubMap[key];
          const codeKey = `${arcDef.codes[0]}_${ep}`;
          if (codeToSubMap[codeKey]) return codeToSubMap[codeKey];
        }
      }
    }
  }

  return null;
}

console.log("SAB_4 ->", resolveSubtitle("SAB_4"));
console.log("TB_3 ->", resolveSubtitle("TB_3"));
console.log("FI_10 ->", resolveSubtitle("FI_10"));
console.log("PUN_1 ->", resolveSubtitle("PUN_1"));
console.log("WAN_1 ->", resolveSubtitle("WAN_1"));
console.log("Raw URL decoding test ->", resolveSubtitle("SAB_4", "/subtitles/series/SAB_4/filename=%5BOne%20Pace%5D%5B496-497%5D%20Sabaody%20Archipelago%2004%20%5B720p%5D%5B76D21468%5D.mkv&videoSize=299748049&videoHash=5411ae0c4a1698da.json"));
