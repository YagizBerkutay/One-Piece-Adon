const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

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
console.log(`Toplam Türkçe .ass dosya sayısı: ${allAssFiles.length}`);

// We will test parsing metadata from EVERY relative file path:
const superMap = {};

allAssFiles.forEach(relPath => {
  // Pattern 1: Folder structure like "21 - Thriller Bark/Bölüm 3 - Görünmez Adam (Manga 446-448) (Ep. 340-343)/TR-subtitle.ass"
  const folderMatch = relPath.match(/(\d+)\s*-\s*[^/]+[/]Bölüm\s*(\d+)(?:\s*-[^/(]+)?(?:\s*\([^)]*\))*\s*(?:\(Ep\.\s*([\d,\s-]+)\))?/i);

  if (folderMatch) {
    const folderSeason = parseInt(folderMatch[1]);
    const episode = parseInt(folderMatch[2]);
    const epRangeStr = folderMatch[3]; // e.g. "340-343"

    // 1. Folder Season:Episode (e.g. "21:3")
    superMap[`${folderSeason}:${episode}`] = relPath;

    // 2. fedew04 Season:Episode
    const folderToFedewSeason = {
      1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
      11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17,
      18: 18, 19: 18, 20: 18,
      21: 19, 22: 20, 23: 21, 24: 22, 25: 23, 26: 24, 27: 25, 28: 26, 29: 27, 30: 28, 31: 29, 32: 30, 33: 31, 34: 32, 35: 33
    };
    const fedewEpisodeOffsets = { 18: 0, 19: 20, 20: 45 };

    if (folderSeason in folderToFedewSeason) {
      const fedewSeason = folderToFedewSeason[folderSeason];
      let fedewEp = episode;
      if (folderSeason in fedewEpisodeOffsets) {
        fedewEp += fedewEpisodeOffsets[folderSeason];
      }
      superMap[`${fedewSeason}:${fedewEp}`] = relPath;
    }

    // 3. Anime Episode numbers (e.g. 340, 341, 342, 343) -> map "1:340", "340", etc.
    if (epRangeStr) {
      const animeEps = epRangeStr.split(',').flatMap(p => {
        const parts = p.split('-').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        if (parts.length === 1) return [parts[0]];
        if (parts.length === 2) {
          const arr = [];
          for (let i = parts[0]; i <= parts[1]; i++) arr.push(i);
          return arr;
        }
        return [];
      });

      animeEps.forEach(epNum => {
        superMap[`1:${epNum}`] = relPath; // IMDb season 1 + anime episode
        superMap[`${epNum}`] = relPath;
      });
    }
  }

  // Pattern 2: Top level files like "Bolum 389 - tr sub [Wano 01].ass"
  const topMatch = relPath.match(/Bolum\s*(\d+)\s*-\s*tr sub\s*\[([^\]]+)\s*(\d+)\]/i);
  if (topMatch) {
    const totalBolum = parseInt(topMatch[1]);
    const arcName = topMatch[2].trim();
    const arcEp = parseInt(topMatch[3]);

    superMap[`${totalBolum}`] = relPath;
    superMap[`0:${totalBolum}`] = relPath;
    
    // Wano (Arc 35 -> fedew Season 33, folder Season 35)
    if (arcName.toLowerCase().startsWith("wano")) {
      superMap[`35:${arcEp}`] = relPath;
      superMap[`33:${arcEp}`] = relPath;
    }
  }
});

console.log(`Oluşturulan Toplam Anahtar Sayısı: ${Object.keys(superMap).length}`);
console.log("21:3 (Folder S21E03 - Thriller Bark 3) ->", superMap["21:3"]);
console.log("19:3 (fedew S19E03 - Thriller Bark 3) ->", superMap["19:3"]);
console.log("1:340 (Anime Ep 340) ->", superMap["1:340"]);
console.log("340 (Raw Anime Ep 340) ->", superMap["340"]);
console.log("29:10 (Folder S29E10 - Fishman 10) ->", superMap["29:10"]);
console.log("27:10 (fedew S27E10 - Fishman 10) ->", superMap["27:10"]);
console.log("35:1 (Folder S35E01 - Wano 1) ->", superMap["35:1"]);
console.log("33:1 (fedew S33E01 - Wano 1) ->", superMap["33:1"]);
