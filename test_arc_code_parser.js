const arcCodeToFolderSeason = {
  "RD": 1,  "OT": 2,  "SY": 3,  "GA": 4,  "BA": 5,
  "AP": 6,  "BU": 7,  "LT": 8,  "RM": 9,  "WP": 10,
  "KM": 11, "LG": 12, "DI": 13, "AL": 14, "JA": 15,
  "SK": 16, "LR": 17, "LL": 17, "WS": 18, "EL": 19,
  "PE": 20, "TB": 21, "SA": 22, "AM": 23, "AZ": 23,
  "ID": 24, "SH": 25, "MF": 26, "PW": 27, "RS": 28,
  "FI": 29, "PH": 30, "DR": 31, "ZO": 32, "WC": 33,
  "RE": 34, "WA": 35
};

function parseStremioId(idStr, extra = {}) {
  let season = null;
  let episode = null;

  // 1. Check for Arc Code format like "TB_3" or "FI_10" or "WA_1"
  const arcMatch = idStr.match(/^([A-Z]{2})_(\d+)/i);
  if (arcMatch) {
    const code = arcMatch[1].toUpperCase();
    const ep = parseInt(arcMatch[2]);
    if (code in arcCodeToFolderSeason) {
      season = arcCodeToFolderSeason[code];
      episode = ep;
      return `${season}:${episode}`;
    }
  }

  // 2. Check for standard S:E format like "21:3" or "pp_onepace:21:3"
  const parts = idStr.split(":");
  if (parts.length >= 3) {
    season = parseInt(parts[parts.length - 2]);
    episode = parseInt(parts[parts.length - 1]);
  } else if (parts.length === 2) {
    season = parseInt(parts[0]);
    episode = parseInt(parts[1]);
  }

  if (!isNaN(season) && !isNaN(episode)) {
    return `${season}:${episode}`;
  }

  // 3. Fallback: Parse filename parameter if passed (e.g. "[One Pace][446-448] Thriller Bark 03 [720p]...")
  const fn = extra.filename || idStr;
  const fnMatch = fn.match(/(Thriller Bark|Fishman|Wano|Dressrosa|Whole Cake|Punk Hazard|Marineford|Enies Lobby|Water Seven|Skypiea|Alabasta|Arlong Park|Baratie|Syrup Village|Orange Town|Romance Dawn)\s*0*(\d+)/i);
  if (fnMatch) {
    const arcName = fnMatch[1].toLowerCase();
    const ep = parseInt(fnMatch[2]);
    for (const [code, sNum] of Object.entries(arcCodeToFolderSeason)) {
      if (arcName.includes("thriller") && sNum === 21) return `21:${ep}`;
      if (arcName.includes("fishman") && sNum === 29) return `29:${ep}`;
      if (arcName.includes("wano") && sNum === 35) return `35:${ep}`;
    }
  }

  return null;
}

console.log("TB_3 (Stremio fedew04 Thriller Bark 3) ->", parseStremioId("TB_3"));
console.log("FI_10 (Stremio fedew04 Fishman 10) ->", parseStremioId("FI_10"));
console.log("WA_1 (Stremio fedew04 Wano 1) ->", parseStremioId("WA_1"));
console.log("pp_onepace:21:3 ->", parseStremioId("pp_onepace:21:3"));
