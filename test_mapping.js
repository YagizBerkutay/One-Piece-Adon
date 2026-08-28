const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

function buildSubtitleMap() {
  const map = {};
  
  // 1. Load static map
  try {
    const staticMap = JSON.parse(fs.readFileSync(path.join(__dirname, "subtitle-map.json"), "utf-8"));
    for (const [key, val] of Object.entries(staticMap)) {
      map[key] = val.filename;
    }
  } catch (e) {}

  // 2. Recursive scan for subfolder subtitles
  function scanDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith(".ass")) {
        const relPath = path.relative(SUBTITLES_DIR, fullPath).replace(/\\/g, "/");
        if (relPath.includes("EN-subtitle") || relPath.includes("EN_subtitle")) continue;

        const folderMatch = relPath.match(/(\d+)\s*-\s*[^/]+[/]Bölüm\s*(\d+)/i);
        if (folderMatch) {
          const season = parseInt(folderMatch[1]);
          const episode = parseInt(folderMatch[2]);
          map[`${season}:${episode}`] = relPath;
        }
      }
    }
  }

  scanDir(SUBTITLES_DIR);
  return map;
}

const map = buildSubtitleMap();
console.log(`Toplam haritalanan Sezon:Bölüm sayısı: ${Object.keys(map).length}`);
console.log("Fishman Island (29:1) ->", map["29:1"]);
console.log("Fishman Island (29:10) ->", map["29:10"]);
console.log("Enies Lobby (19:1) ->", map["19:1"]);
console.log("Wano (35:1) ->", map["35:1"]);
console.log("Romance Dawn (1:1) ->", map["1:1"]);
