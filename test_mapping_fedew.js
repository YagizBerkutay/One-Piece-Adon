const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

// Folder season -> fedew04 Stremio season mapping
// In fedew04: Water Seven, Enies Lobby, Post-Enies Lobby are merged into Season 18.
// So Folder 18 (Water Seven), Folder 19 (Enies Lobby), Folder 20 (Post-Enies Lobby) all belong to Season 18 in fedew04.
// Water Seven = 18x01 to 18x20
// Enies Lobby = 18x21 to 18x45
// Post-Enies Lobby = 18x46 to 18x50
// Folder 21 (Thriller Bark) -> fedew04 Season 19
// Folder 22 (Sabaody) -> fedew04 Season 20
// Folder 23 (Amazon Lily) -> fedew04 Season 21
// Folder 24 (Impel Down) -> fedew04 Season 22
// Folder 25 (Straw Hats) -> fedew04 Season 23
// Folder 26 (Marineford) -> fedew04 Season 24
// Folder 27 (Post-War) -> fedew04 Season 25
// Folder 28 (Return to Sabaody) -> fedew04 Season 26
// Folder 29 (Fishman Island) -> fedew04 Season 27
// Folder 30 (Punk Hazard) -> fedew04 Season 28
// Folder 31 (Dressrosa) -> fedew04 Season 29
// Folder 32 (Zou) -> fedew04 Season 30
// Folder 33 (Whole Cake) -> fedew04 Season 31
// Folder 34 (Reverie) -> fedew04 Season 32
// Folder 35 (Wano) -> fedew04 Season 33

const folderToFedewSeason = {
  18: 18, // Water Seven
  19: 18, // Enies Lobby (offset episode by +20)
  20: 18, // Post-Enies Lobby (offset episode by +45)
  21: 19, // Thriller Bark
  22: 20, // Sabaody Archipelago
  23: 21, // Amazon Lily
  24: 22, // Impel Down
  25: 23, // The Adventures of the Straw Hats
  26: 24, // Marineford
  27: 25, // Post-War
  28: 26, // Return to Sabaody
  29: 27, // Fishman Island
  30: 28, // Punk Hazard
  31: 29, // Dressrosa
  32: 30, // Zou
  33: 31, // Whole Cake Island
  34: 32, // Reverie
  35: 33  // Wano
};

const fedewEpisodeOffsetsForSeason18 = {
  18: 0,  // Water Seven: Bölüm 1 -> 18:1 ... Bölüm 20 -> 18:20
  19: 20, // Enies Lobby: Bölüm 1 -> 18:21 ... Bölüm 25 -> 18:45
  20: 45  // Post-Enies Lobby: Bölüm 1 -> 18:46 ... Bölüm 5 -> 18:50
};

function buildSubtitleMap() {
  const map = {};

  // 1. Static map (subtitle-map.json)
  try {
    const staticMap = JSON.parse(fs.readFileSync(path.join(__dirname, "subtitle-map.json"), "utf-8"));
    for (const [key, val] of Object.entries(staticMap)) {
      map[key] = val.filename;
    }
  } catch (e) {}

  // 2. Recursive scan for subfolder subtitles
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
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
          const folderSeason = parseInt(folderMatch[1]);
          const episode = parseInt(folderMatch[2]);

          // Direct Folder Key (e.g. 21:3 for Thriller Bark 3)
          map[`${folderSeason}:${episode}`] = relPath;

          // fedew04 Stremio Key (e.g. 19:3 for Thriller Bark 3)
          if (folderSeason in folderToFedewSeason) {
            const fedewSeason = folderToFedewSeason[folderSeason];
            let fedewEpisode = episode;
            if (folderSeason in fedewEpisodeOffsetsForSeason18) {
              fedewEpisode = episode + fedewEpisodeOffsetsForSeason18[folderSeason];
            }
            map[`${fedewSeason}:${fedewEpisode}`] = relPath;
          }
        }
      }
    }
  }

  scanDir(SUBTITLES_DIR);
  return map;
}

const map = buildSubtitleMap();

console.log("=== TEST MAPPINGS ===");
console.log("Thriller Bark 3 (Folder 21:3) ->", map["21:3"]);
console.log("Thriller Bark 3 (fedew04 19:3) ->", map["19:3"]);
console.log("Fishman Island 10 (Folder 29:10) ->", map["29:10"]);
console.log("Fishman Island 10 (fedew04 27:10) ->", map["27:10"]);
console.log("Enies Lobby 1 (Folder 19:1) ->", map["19:1"]);
console.log("Enies Lobby 1 (fedew04 18:21) ->", map["18:21"]);
