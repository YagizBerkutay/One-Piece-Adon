const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

const folderSeasonToArcCode = {
  1: "RD", 2: "OT", 3: "SY", 4: "GA", 5: "BA",
  6: "AP", 7: "BU", 8: "LT", 9: "RM", 10: "WP",
  11: "KM", 12: "LG", 13: "DI", 14: "AL", 15: "JA",
  16: "SK", 17: "LR", 18: "WS", 19: "EL", 20: "PE",
  21: "TB", 22: "SA", 23: "AM", 24: "ID", 25: "SH",
  26: "MF", 27: "PW", 28: "RS", 29: "FI", 30: "PH",
  31: "DR", 32: "ZO", 33: "WC", 34: "RE", 35: "WA"
};

const fedewSeasonToFolderSeason = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17,
  18: 18, // Water Seven
  19: 21, // Thriller Bark
  20: 22, // Sabaody
  21: 23, // Amazon Lily
  22: 24, // Impel Down
  23: 25, // Straw Hats
  24: 26, // Marineford
  25: 27, // Post-War
  26: 28, // Return to Sabaody
  27: 29, // Fishman Island
  28: 30, // Punk Hazard
  29: 31, // Dressrosa
  30: 32, // Zou
  31: 33, // Whole Cake
  32: 34, // Reverie
  33: 35  // Wano
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

const arcCodeMap = {};
const folderMap = {};

allAssFiles.forEach(relPath => {
  const folderMatch = relPath.match(/(\d+)\s*-\s*[^/]+[/]Bölüm\s*(\d+)/i);
  if (folderMatch) {
    const folderSeason = parseInt(folderMatch[1]);
    const episode = parseInt(folderMatch[2]);

    // 1. Direct folder key "21:3"
    folderMap[`${folderSeason}:${episode}`] = relPath;

    // 2. Arc code key "TB_3"
    if (folderSeason in folderSeasonToArcCode) {
      const code = folderSeasonToArcCode[folderSeason];
      arcCodeMap[`${code}_${episode}`] = relPath;
    }
  }

  // Top level files like Bolum 389 - tr sub [Wano 01].ass
  const topMatch = relPath.match(/Bolum\s*(\d+)\s*-\s*tr sub\s*\[([^\]]+)\s*(\d+)\]/i);
  if (topMatch) {
    const arcName = topMatch[2].trim().toLowerCase();
    const ep = parseInt(topMatch[3]);
    if (arcName.startsWith("wano")) {
      arcCodeMap[`WA_${ep}`] = relPath;
      folderMap[`35:${ep}`] = relPath;
    }
  }
});

console.log("TB_3 ->", arcCodeMap["TB_3"]);
console.log("AM_3 ->", arcCodeMap["AM_3"]);
console.log("FI_10 ->", arcCodeMap["FI_10"]);
console.log("WA_1 ->", arcCodeMap["WA_1"]);
