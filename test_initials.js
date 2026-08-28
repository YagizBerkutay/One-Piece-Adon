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
  { folderSeason: 7,  codes: ["BU", "BUG", "TABC"],keywords: ["buggy"] },
  { folderSeason: 8,  codes: ["LT", "LOG"],        keywords: ["loguetown"] },
  { folderSeason: 9,  codes: ["RM", "REV"],        keywords: ["reverse", "mountain"] },
  { folderSeason: 10, codes: ["WP", "WHI"],        keywords: ["whisky", "peak"] },
  { folderSeason: 11, codes: ["KM", "KOB", "TTKM"],keywords: ["koby", "meppo"] },
  { folderSeason: 12, codes: ["LG", "LIT"],        keywords: ["little", "garden"] },
  { folderSeason: 13, codes: ["DI", "DRU"],        keywords: ["drum", "island"] },
  { folderSeason: 14, codes: ["AL", "ALA"],        keywords: ["alabasta"] },
  { folderSeason: 15, codes: ["JA", "JAY"],        keywords: ["jaya"] },
  { folderSeason: 16, codes: ["SK", "SKY"],        keywords: ["skypiea"] },
  { folderSeason: 17, codes: ["LR", "LL", "LON", "LRLL"], keywords: ["long", "ring"] },
  { folderSeason: 18, codes: ["WS", "WAT"],        keywords: ["water", "seven"] },
  { folderSeason: 19, codes: ["EL", "ENI"],        keywords: ["enies", "lobby"] },
  { folderSeason: 20, codes: ["PE", "POS", "PEL"],  keywords: ["post-enies", "post enies"] },
  { folderSeason: 21, codes: ["TB", "THR"],        keywords: ["thriller", "bark"] },
  { folderSeason: 22, codes: ["SA", "SAB"],        keywords: ["sabaody", "archipelago"] },
  { folderSeason: 23, codes: ["AM", "AZ", "AMA"],  keywords: ["amazon", "lily"] },
  { folderSeason: 24, codes: ["ID", "IMP"],        keywords: ["impel", "down"] },
  { folderSeason: 25, codes: ["SH", "STR", "TASH"],keywords: ["straw", "hats"] },
  { folderSeason: 26, codes: ["MF", "MAR"],        keywords: ["marineford"] },
  { folderSeason: 27, codes: ["PW", "POW"],        keywords: ["post-war", "post war"] },
  { folderSeason: 28, codes: ["RS", "RET", "RTS"],  keywords: ["return", "sabaody"] },
  { folderSeason: 29, codes: ["FI", "FIS", "FMI"],  keywords: ["fishman", "island"] },
  { folderSeason: 30, codes: ["PH", "PUN"],        keywords: ["punk", "hazard"] },
  { folderSeason: 31, codes: ["DR", "DRE"],        keywords: ["dressrosa"] },
  { folderSeason: 32, codes: ["ZO", "ZOU"],        keywords: ["zou"] },
  { folderSeason: 33, codes: ["WC", "WCI"],        keywords: ["whole", "cake"] },
  { folderSeason: 34, codes: ["RE", "REV"],        keywords: ["reverie"] },
  { folderSeason: 35, codes: ["WA", "WAN"],        keywords: ["wano"] }
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
});

function resolveSubtitle(idStr, rawUrl = "") {
  const decodedUrl = decodeURIComponent(rawUrl || idStr);

  // 1. Code match (e.g. RTS_2, SAB_4, TB_3, FI_10, WAN_1)
  const codeMatch = idStr.match(/([A-Z]{2,4})_(\d+)/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const ep = parseInt(codeMatch[2]);
    const key = `${code}_${ep}`;
    if (codeToSubMap[key]) return codeToSubMap[key];
  }

  // 2. Fallback: Match keywords from rawUrl / decodedUrl
  const epMatch = decodedUrl.match(/(?:Bölüm|Episode|Sabaody Archipelago|Return to Sabaody|Post-War|Marineford|Straw Hats|Impel Down|Amazon Lily|Thriller Bark|Post-Enies|Enies Lobby|Water Seven|Long Ring|Skypiea|Jaya|Alabasta|Drum Island|Little Garden|Koby-Meppo|Whisky Peak|Reverse Mountain|Loguetown|Buggy|Arlong Park|Baratie|Gaimon|Syrup Village|Orange Town|Romance Dawn|Fishman Island|Punk Hazard|Dressrosa|Whole Cake|Reverie|Wano)\s*0*(\d{1,3})/i);
  if (epMatch) {
    const ep = parseInt(epMatch[1]);
    for (const arcDef of arcDefinitions) {
      for (const kw of arcDef.keywords) {
        if (decodedUrl.toLowerCase().includes(kw)) {
          const key = `${arcDef.folderSeason}:${ep}`;
          if (seasonEpToSubMap[key]) return seasonEpToSubMap[key];
        }
      }
    }
  }

  return null;
}

console.log("RTS_2 (Return to Sabaody 2) ->", resolveSubtitle("RTS_2"));
console.log("SAB_4 (Sabaody 4) ->", resolveSubtitle("SAB_4"));
console.log("TB_3 (Thriller Bark 3) ->", resolveSubtitle("TB_3"));
console.log("LRLL_1 (Long Ring 1) ->", resolveSubtitle("LRLL_1"));
console.log("PEL_2 (Post-Enies 2) ->", resolveSubtitle("PEL_2"));
