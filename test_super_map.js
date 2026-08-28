const fs = require('fs');
const path = require('path');

const HARITA_PATH = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]", "Harita.md");
const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

const content = fs.readFileSync(HARITA_PATH, 'utf-8');
const lines = content.split('\n');

const superMap = {};

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

function findAssFile(folderSeason, episode) {
  for (const rel of allAssFiles) {
    const match = rel.match(/(\d+)\s*-\s*[^/]+[/]Bölüm\s*(\d+)/i);
    if (match) {
      if (parseInt(match[1]) === folderSeason && parseInt(match[2]) === episode) {
        return rel;
      }
    }
  }
  return null;
}

let count = 0;
lines.forEach(line => {
  if (!line.includes('#S')) return;
  const parts = line.split(/\s*-{2,}\s*/).map(s => s.trim());
  if (parts.length >= 6) {
    const onePaceNum = parseInt(parts[0]);
    const animeEpStr = parts[3];
    const sId = parts[4]; // e.g. #S21E03

    const sMatch = sId.match(/#S(\d+)E(\d+)/i);
    if (sMatch) {
      const folderSeason = parseInt(sMatch[1]);
      const episode = parseInt(sMatch[2]);

      const assFile = findAssFile(folderSeason, episode);
      if (assFile) {
        count++;
        // Folder season key: "21:3"
        superMap[`${folderSeason}:${episode}`] = assFile;

        // One Pace number keys: "175", "0:175"
        if (!isNaN(onePaceNum)) {
          superMap[`${onePaceNum}`] = assFile;
          superMap[`0:${onePaceNum}`] = assFile;
        }

        // Anime episode numbers: e.g. "340", "1:340", "340-343"
        if (animeEpStr) {
          const nums = animeEpStr.split(',').flatMap(p => {
            const range = p.split('-').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
            if (range.length === 1) return [range[0]];
            if (range.length === 2) {
              const res = [];
              for (let i = range[0]; i <= range[1]; i++) res.push(i);
              return res;
            }
            return [];
          });
          nums.forEach(ep => {
            superMap[`1:${ep}`] = assFile;
            superMap[`${ep}`] = assFile;
          });
        }
      }
    }
  }
});

console.log(`Harita.md'den tam eşleşen bölüm sayısı: ${count}`);
console.log(`Süper Haritadaki Toplam Anahtar Sayısı: ${Object.keys(superMap).length}`);
console.log("21:3 (Folder) ->", superMap["21:3"]);
console.log("1:340 (Anime Ep 340) ->", superMap["1:340"]);
console.log("1:341 (Anime Ep 341) ->", superMap["1:341"]);
console.log("340 (Raw Anime Ep) ->", superMap["340"]);
