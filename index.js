const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const path = require("path");
const fs = require("fs");
const http = require("http");
const url = require("url");

// ============================================================
// One Pace Türkçe Altyazı Stremio Addon'u
// .ass altyazıları otomatik VTT'ye dönüştürüp Stremio'ya sunar
// ============================================================

const PORT = process.env.PORT || 7000;

// Altyazı dosyalarının bulunduğu klasör
const SUBTITLES_DIR = path.join(
  __dirname,
  "One Pace Türkçe [Sadece Altyazı] [_17]"
);

// ============================================================
// Hibrit Bölüm Eşleştirme Haritası (Stremio & fedew04 Uyumlu)
// ============================================================

const folderToFedewSeason = {
  1: 1,   // Romance Dawn
  2: 2,   // Orange Town
  3: 3,   // Syrup Village
  4: 4,   // Gaimon
  5: 5,   // Baratie
  6: 6,   // Arlong Park
  7: 7,   // The Adventures of Buggy's Crew
  8: 8,   // Loguetown
  9: 9,   // Reverse Mountain
  10: 10, // Whisky Peak
  11: 11, // Koby-Meppo
  12: 12, // Little Garden
  13: 13, // Drum Island
  14: 14, // Alabasta
  15: 15, // Jaya
  16: 16, // Skypiea
  17: 17, // Long Ring Long Land
  18: 18, // Water Seven
  19: 18, // Enies Lobby
  20: 18, // Post-Enies Lobby
  21: 19, // Thriller Bark
  22: 20, // Sabaody Archipelago
  23: 21, // Amazon Lily
  24: 22, // Impel Down
  25: 23, // Straw Hats Adventures
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
  18: 0,  // Water Seven
  19: 20, // Enies Lobby
  20: 45  // Post-Enies Lobby
};

function buildSubtitleMap() {
  const map = {};
  
  // 1. Statik harita (subtitle-map.json)
  try {
    const staticMap = JSON.parse(
      fs.readFileSync(path.join(__dirname, "subtitle-map.json"), "utf-8")
    );
    for (const [key, val] of Object.entries(staticMap)) {
      map[key] = val.filename;
    }
  } catch (err) {
    console.error("⚠️ static map error:", err.message);
  }

  // 2. Rekürsif tatarak alt klasörlerdeki Türkçe altyazıları hem Klasör Sezonu hem Stremio (fedew04) Sezonuna bağla
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

          // Klasör Sezon Key (örn. 21:3)
          map[`${folderSeason}:${episode}`] = relPath;

          // Stremio / fedew04 Sezon Key (örn. 19:3 Thriller Bark için)
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

const subtitleMap = buildSubtitleMap();
console.log(`✅ Toplam ${Object.keys(subtitleMap).length} Sezon:Bölüm eşleştirmesi yüklendi.`);

// ============================================================
// ASS → VTT Dönüştürücü
// ============================================================

function convertAssToVtt(assContent) {
  const lines = assContent.split(/\r?\n/);
  let vttOutput = "WEBVTT\n\n";
  let dialogueIndex = 0;

  // [Events] bölümünü bul
  let inEvents = false;
  let formatFields = [];

  for (const line of lines) {
    if (line.trim().toLowerCase() === "[events]") {
      inEvents = true;
      continue;
    }

    if (line.trim().startsWith("[") && line.trim() !== "[Events]") {
      if (inEvents) break; // Events bölümü bitti
      continue;
    }

    if (!inEvents) continue;

    // Format satırını parse et
    if (line.startsWith("Format:")) {
      formatFields = line
        .replace("Format:", "")
        .split(",")
        .map((f) => f.trim().toLowerCase());
      continue;
    }

    // Dialogue satırlarını parse et
    if (line.startsWith("Dialogue:")) {
      const dialoguePart = line.substring("Dialogue:".length).trim();
      const parts = dialoguePart.split(",");

      if (formatFields.length === 0 || parts.length < formatFields.length)
        continue;

      const startIdx = formatFields.indexOf("start");
      const endIdx = formatFields.indexOf("end");
      const textIdx = formatFields.indexOf("text");

      if (startIdx === -1 || endIdx === -1 || textIdx === -1) continue;

      const startTime = convertAssTime(parts[startIdx].trim());
      const endTime = convertAssTime(parts[endIdx].trim());
      // Text alanı son alan olduğu için virgüllerle birleştirilmeli
      const rawText = parts.slice(textIdx).join(",").trim();
      const cleanText = cleanAssText(rawText);

      if (cleanText.trim().length === 0) continue;

      dialogueIndex++;
      vttOutput += `${dialogueIndex}\n`;
      vttOutput += `${startTime} --> ${endTime}\n`;
      vttOutput += `${cleanText}\n\n`;
    }
  }

  return vttOutput;
}

// ASS zaman formatını VTT'ye dönüştür (H:MM:SS.CC → HH:MM:SS.mmm)
function convertAssTime(assTime) {
  const match = assTime.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
  if (!match) return "00:00:00.000";

  const hours = match[1].padStart(2, "0");
  const minutes = match[2];
  const seconds = match[3];
  const centiseconds = match[4];
  const milliseconds = (parseInt(centiseconds) * 10)
    .toString()
    .padStart(3, "0");

  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// ASS biçimlendirme etiketlerini temizle
function cleanAssText(text) {
  // Override tag'leri kaldır: {\tags}
  let cleaned = text.replace(/\{[^}]*\}/g, "");
  // \N ve \n → satır sonu
  cleaned = cleaned.replace(/\\N/g, "\n");
  cleaned = cleaned.replace(/\\n/g, "\n");
  // Kalan ters slash temizliği
  cleaned = cleaned.replace(/\\h/g, " ");
  return cleaned.trim();
}

// ============================================================
// Stremio Addon Tanımı
// ============================================================

const manifest = {
  id: "community.onepace.tr.subtitles",
  version: "1.1.6",
  name: "One Pace TR Altyazı",
  description:
    "One Pace için Türkçe altyazı addon'u. Tüm 35 Sezon (Fishman Island, Marineford, Wano vs.) desteklenir.",
  logo: "https://i.pinimg.com/originals/4c/46/ee/4c46ee47e0710a6d928454f68fc4ee17.png",
  resources: [
    {
      name: "subtitles",
      types: ["series", "movie", "other"],
      idPrefixes: [
        "pp", "tt", "1", "0",
        "RD", "OT", "SY", "GA", "BA", "AP", "BU", "LT", "RM", "WP", "KM", "LG", "DI", "AL", "JA", "SK", "LR", "WS", "EL", "PE", "TB", "SA", "AM", "ID", "SH", "MF", "PW", "RS", "FI", "PH", "DR", "ZO", "WC", "RE", "WA",
        "ROMA", "ORA", "SYR", "GAI", "BAR", "ARL", "BUG", "LOG", "REV", "WHI", "KOB", "LIT", "DRU", "ALA", "JAY", "SKY", "LON", "WAT", "ENI", "POS", "THR", "SAB", "AMA", "IMP", "STR", "MAR", "POW", "RET", "FIS", "PUN", "DRE", "ZOU", "WCI", "REV", "WAN",
        "RTS", "LRLL", "PEL", "TASH", "TABC", "TTKM", "FMI"
      ]
    }
  ],
  types: ["series", "movie", "other"],
  catalogs: [],
};

const builder = new addonBuilder(manifest);

// ============================================================
// Evrensel 35 Sezon Haritalandırma Tanımları
// ============================================================

const arcDefinitions = [
  { folderSeason: 1,  codes: ["RD", "ROMA"],                 keywords: ["romance", "dawn"] },
  { folderSeason: 2,  codes: ["OT", "ORA"],                  keywords: ["orange", "town"] },
  { folderSeason: 3,  codes: ["SY", "SYR"],                  keywords: ["syrup", "village"] },
  { folderSeason: 4,  codes: ["GA", "GAI"],                  keywords: ["gaimon"] },
  { folderSeason: 5,  codes: ["BA", "BAR"],                  keywords: ["baratie"] },
  { folderSeason: 6,  codes: ["AP", "ARL"],                  keywords: ["arlong", "park"] },
  { folderSeason: 7,  codes: ["BU", "BUG", "TABC"],          keywords: ["buggy"] },
  { folderSeason: 8,  codes: ["LT", "LOG"],                  keywords: ["loguetown"] },
  { folderSeason: 9,  codes: ["RM", "REV"],                  keywords: ["reverse", "mountain"] },
  { folderSeason: 10, codes: ["WP", "WHI"],                  keywords: ["whisky", "peak"] },
  { folderSeason: 11, codes: ["KM", "KOB", "TTKM"],          keywords: ["koby", "meppo"] },
  { folderSeason: 12, codes: ["LG", "LIT"],                  keywords: ["little", "garden"] },
  { folderSeason: 13, codes: ["DI", "DRU"],                  keywords: ["drum", "island"] },
  { folderSeason: 14, codes: ["AL", "ALA"],                  keywords: ["alabasta"] },
  { folderSeason: 15, codes: ["JA", "JAY"],                  keywords: ["jaya"] },
  { folderSeason: 16, codes: ["SK", "SKY"],                  keywords: ["skypiea"] },
  { folderSeason: 17, codes: ["LR", "LL", "LON", "LRLL"],    keywords: ["long", "ring"] },
  { folderSeason: 18, codes: ["WS", "WAT"],                  keywords: ["water", "seven"] },
  { folderSeason: 19, codes: ["EL", "ENI"],                  keywords: ["enies", "lobby"] },
  { folderSeason: 20, codes: ["PE", "POS", "PEL"],            keywords: ["post-enies", "post enies"] },
  { folderSeason: 21, codes: ["TB", "THR"],                  keywords: ["thriller", "bark"] },
  { folderSeason: 22, codes: ["SA", "SAB"],                  keywords: ["sabaody", "archipelago"] },
  { folderSeason: 23, codes: ["AM", "AZ", "AMA"],            keywords: ["amazon", "lily"] },
  { folderSeason: 24, codes: ["ID", "IMP"],                  keywords: ["impel", "down"] },
  { folderSeason: 25, codes: ["SH", "STR", "TASH"],          keywords: ["straw", "hats"] },
  { folderSeason: 26, codes: ["MF", "MAR"],                  keywords: ["marineford"] },
  { folderSeason: 27, codes: ["PW", "POW"],                  keywords: ["post-war", "post war"] },
  { folderSeason: 28, codes: ["RS", "RET", "RTS"],            keywords: ["return", "sabaody"] },
  { folderSeason: 29, codes: ["FI", "FIS", "FMI"],            keywords: ["fishman", "island"] },
  { folderSeason: 30, codes: ["PH", "PUN"],                  keywords: ["punk", "hazard"] },
  { folderSeason: 31, codes: ["DR", "DRE"],                  keywords: ["dressrosa"] },
  { folderSeason: 32, codes: ["ZO", "ZOU"],                  keywords: ["zou"] },
  { folderSeason: 33, codes: ["WC", "WCI"],                  keywords: ["whole", "cake"] },
  { folderSeason: 34, codes: ["RE", "REV"],                  keywords: ["reverie"] },
  { folderSeason: 35, codes: ["WA", "WAN"],                  keywords: ["wano"] }
];

const fedewSeasonToFolderSeason = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17,
  18: 18, 19: 21, 20: 22, 21: 23, 22: 24, 23: 25, 24: 26, 25: 27,
  26: 28, 27: 29, 28: 30, 29: 31, 30: 32, 31: 33, 32: 34, 33: 35
};

const codeToSubMap = {};
const seasonEpToSubMap = {};
const keyToRelativePathMap = {};

function buildSubtitleMaps() {
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

          const key = `${folderSeason}_${episode}`;
          seasonEpToSubMap[`${folderSeason}:${episode}`] = relPath;
          keyToRelativePathMap[key] = relPath;

          const arcDef = arcDefinitions.find(a => a.folderSeason === folderSeason);
          if (arcDef) {
            arcDef.codes.forEach(code => {
              codeToSubMap[`${code}_${episode}`] = relPath;
              keyToRelativePathMap[`${code}_${episode}`] = relPath;
            });
          }
        }
      }
    }
  }

  scanDir(SUBTITLES_DIR);

  try {
    const files = fs.readdirSync(SUBTITLES_DIR);
    for (const file of files) {
      if (file.endsWith(".ass") && !file.includes("EN-subtitle")) {
        const topMatch = file.match(/Bolum\s*(\d+)\s*-\s*tr sub\s*\[([^\]]+)\s*(\d+)\]/i);
        if (topMatch) {
          const arcName = topMatch[2].trim().toLowerCase();
          const ep = parseInt(topMatch[3]);
          if (arcName.startsWith("wano")) {
            codeToSubMap[`WA_${ep}`] = file;
            codeToSubMap[`WAN_${ep}`] = file;
            seasonEpToSubMap[`35:${ep}`] = file;
            keyToRelativePathMap[`35_${ep}`] = file;
            keyToRelativePathMap[`WA_${ep}`] = file;
          }
        }
      }
    }
  } catch (e) {}
}

buildSubtitleMaps();
console.log(`✅ Evrensel harita yüklendi: ${Object.keys(codeToSubMap).length} Ark Kodu, ${Object.keys(seasonEpToSubMap).length} Klasör Sezonu.`);

// ============================================================
// ExoPlayer/VLC Uyumlu ASS → VTT Dönüştürücü
// ============================================================

function cleanAssText(text) {
  let cleaned = text.replace(/\{[^}]*\}/g, "");
  cleaned = cleaned.replace(/\\N/g, "\n").replace(/\\n/g, "\n").replace(/\\h/g, " ");
  cleaned = cleaned.replace(/\\/g, "");
  // Cümle içi boş satırları kesinlikle sil (Android TV çökmesini engeller)
  cleaned = cleaned.split("\n").map(l => l.trim()).filter(l => l.length > 0).join("\n");
  return cleaned.trim();
}

function convertAssTime(assTime) {
  const match = assTime.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
  if (!match) return "00:00:00.000";
  const hours = match[1].padStart(2, "0");
  const minutes = match[2];
  const seconds = match[3];
  const centiseconds = match[4];
  const milliseconds = (parseInt(centiseconds) * 10).toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function convertAssToVtt(assContent) {
  const lines = assContent.split(/\r?\n/);
  let vttOutput = "WEBVTT\n\n";

  for (const line of lines) {
    if (line.startsWith("Dialogue:")) {
      const dialoguePart = line.substring("Dialogue:".length).trim();
      const parts = dialoguePart.split(",");
      if (parts.length < 9) continue;

      const startTime = convertAssTime(parts[1].trim());
      const endTime = convertAssTime(parts[2].trim());
      const rawText = parts.slice(9).join(",").trim();
      const cleanText = cleanAssText(rawText);

      if (cleanText.length === 0) continue;

      // Standart W3C WebVTT formatı (Cue ID olmadan direkt zaman damgası)
      vttOutput += `${startTime} --> ${endTime}\n${cleanText}\n\n`;
    }
  }

  return vttOutput;
}

// ============================================================
// Subtitle Handler (Çok Katmanlı Evrensel Çözücü)
// ============================================================

builder.defineSubtitlesHandler(async (args) => {
  console.log(`📝 Altyazı isteği: type=${args.type}, id=${args.id}`);

  let filename = null;
  let subKey = null;
  const decodedId = decodeURIComponent(args.id);

  // 1. Ark Kod Kontrolü (örn: SAB_4, TB_3, FI_10, WAN_1, PUN_1)
  const codeMatch = decodedId.match(/([A-Z]{2,4})_(\d+)/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const ep = parseInt(codeMatch[2]);
    subKey = `${code}_${ep}`;
    if (codeToSubMap[subKey]) filename = codeToSubMap[subKey];
  }

  // 2. Sezon:Bölüm Format Kontrolü (örn: 20:4, 22:4, pp:22:4)
  if (!filename) {
    const parts = decodedId.split(":");
    if (parts.length >= 2) {
      const s = parseInt(parts[parts.length - 2]);
      const ep = parseInt(parts[parts.length - 1]);
      if (!isNaN(s) && !isNaN(ep)) {
        let folderS = s;
        if (s in fedewSeasonToFolderSeason) {
          folderS = fedewSeasonToFolderSeason[s];
        }
        subKey = `${folderS}_${ep}`;
        if (seasonEpToSubMap[`${folderS}:${ep}`]) {
          filename = seasonEpToSubMap[`${folderS}:${ep}`];
        } else if (seasonEpToSubMap[`${s}:${ep}`]) {
          filename = seasonEpToSubMap[`${s}:${ep}`];
        }
      }
    }
  }

  // 3. Fallback: Kelime + Bölüm Arama
  if (!filename) {
    const epMatch = decodedId.match(/(?:Bölüm|Episode|Sabaody Archipelago|Thriller Bark|Fishman Island|Wano|Dressrosa|Whole Cake|Punk Hazard|Marineford|Enies Lobby|Water Seven|Skypiea|Alabasta|Arlong Park|Baratie|Syrup Village|Orange Town|Romance Dawn)\s*0*(\d{1,3})/i);
    if (epMatch) {
      const ep = parseInt(epMatch[1]);
      for (const arcDef of arcDefinitions) {
        for (const kw of arcDef.keywords) {
          if (decodedId.toLowerCase().includes(kw)) {
            const key = `${arcDef.folderSeason}:${ep}`;
            subKey = `${arcDef.folderSeason}_${ep}`;
            if (seasonEpToSubMap[key]) {
              filename = seasonEpToSubMap[key];
              break;
            }
          }
        }
        if (filename) break;
      }
    }
  }

  if (!filename) {
    console.log(`   ❌ Eşleştirme bulunamadı: ${args.id}`);
    return { subtitles: [] };
  }

  if (!subKey) subKey = encodeURIComponent(args.id);

  console.log(`   ✅ Eşleşti: ${args.id} → ${filename}`);

  const subtitlePath = path.join(SUBTITLES_DIR, filename);
  if (!fs.existsSync(subtitlePath)) {
    console.log(`   ❌ Dosya bulunamadı: ${subtitlePath}`);
    return { subtitles: [] };
  }

  // Saf ASCII VTT URL'si (ExoPlayer TV çökmesini kesin olarak engeller)
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  const vttUrl = `${baseUrl}/vtt/sub_${subKey}.vtt`;

  // Haritaya kaydet ki VTT endpoint'i subKey ile alabilsin
  keyToRelativePathMap[`sub_${subKey}`] = filename;

  return {
    subtitles: [
      {
        id: `onepace-tr-${args.id}`,
        url: vttUrl,
        lang: "tur",
      },
    ],
  };
});

// ============================================================
// Express Sunucusu (VTT dönüştürme endpoint'i & Logger dahil)
// ============================================================

const addonInterface = builder.getInterface();

const { getRouter } = require("stremio-addon-sdk");
const express = require("express");
const app = express();

const recentRequests = [];
app.use((req, res, next) => {
  recentRequests.unshift({
    time: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.headers["x-forwarded-for"],
    userAgent: req.headers["user-agent"],
  });
  if (recentRequests.length > 50) recentRequests.pop();
  next();
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

app.get("/recent-requests", (req, res) => {
  res.json(recentRequests);
});

app.get("/", (req, res) => {
  const host = req.get("host");
  const protocol = req.protocol;
  const manifestUrl = `${protocol}://${host}/manifest.json`;
  const stremioUrl = manifestUrl.replace(/^https?:\/\//, "stremio://");

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${manifest.name}</title>
      <style>
        body { font-family: sans-serif; background: #0b0c10; color: #fff; text-align: center; padding: 50px; }
        .logo { width: 120px; border-radius: 10px; margin-bottom: 20px; }
        .btn { display: inline-block; background: #66fcf1; color: #0b0c10; font-weight: bold; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 18px; margin-top: 20px; }
        .btn:hover { background: #45a29e; }
        code { background: #1f2833; padding: 5px 10px; border-radius: 4px; color: #66fcf1; display: inline-block; margin-top: 15px; }
      </style>
    </head>
    <body>
      <img class="logo" src="${manifest.logo}" />
      <h1>${manifest.name}</h1>
      <p>${manifest.description}</p>
      <a class="btn" href="${stremioUrl}">Stremio'ya Yükle</a>
      <br/><br/>
      <p>Manuel Manifest URL:</p>
      <code>${manifestUrl}</code>
    </body>
    </html>
  `);
});

// Windows-1254 (CP1254 Türkçe ANSI) Otomatik Çözücü
function decodeCp1254(buffer) {
  const utf8Str = buffer.toString("utf-8");
  if (!utf8Str.includes("") && !utf8Str.includes("\uFFFD")) {
    return utf8Str;
  }

  const cp1254Map = {
    0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8A: 'Š', 0x8B: '‹', 0x8C: 'Œ',
    0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9A: 'š', 0x9B: '›', 0x9C: 'œ', 0x9F: 'Ÿ',
    0xA0: ' ', 0xA1: '¡', 0xA2: '¢', 0xA3: '£', 0xA4: '¤', 0xA5: '¥', 0xA6: '¦', 0xA7: '§', 0xA8: '¨', 0xA9: '©', 0xAA: 'ª', 0xAB: '«', 0xAC: '¬', 0xAD: '­', 0xAE: '®', 0xAF: '¯',
    0xB0: '°', 0xB1: '±', 0xB2: '²', 0xB3: '³', 0xB4: '´', 0xB5: 'µ', 0xB6: '¶', 0xB7: '·', 0xB8: '¸', 0xB9: '¹', 0xBA: 'º', 0xBB: '»', 0xBC: '¼', 0xBD: '½', 0xBE: '¾', 0xBF: '¿',
    0xC0: 'À', 0xC1: 'Á', 0xC2: 'Â', 0xC3: 'Ã', 0xC4: 'Ä', 0xC5: 'Å', 0xC6: 'Æ', 0xC7: 'Ç', 0xC8: 'È', 0xC9: 'É', 0xCA: 'Ê', 0xCB: 'Ë', 0xCC: 'Ì', 0xCD: 'Í', 0xCE: 'Î', 0xCF: 'Ï',
    0xD0: 'Ğ', 0xD1: 'Ñ', 0xD2: 'Ò', 0xD3: 'Ó', 0xD4: 'Ô', 0xD5: 'Õ', 0xD6: 'Ö', 0xD7: '×', 0xD8: 'Ø', 0xD9: 'Ù', 0xDA: 'Ú', 0xDB: 'Û', 0xDC: 'Ü', 0xDD: 'İ', 0xDE: 'Ş', 0xDF: 'ß',
    0xE0: 'à', 0xE1: 'á', 0xE2: 'â', 0xE3: 'ã', 0xE4: 'ä', 0xE5: 'å', 0xE6: 'æ', 0xE7: 'ç', 0xE8: 'è', 0xE9: 'é', 0xEA: 'ê', 0xEB: 'ë', 0xEC: 'ì', 0xED: 'í', 0xEE: 'î', 0xEF: 'ï',
    0xF0: 'ğ', 0xF1: 'ñ', 0xF2: 'ò', 0xF3: 'ó', 0xF4: 'ô', 0xF5: 'õ', 0xF6: 'ö', 0xF7: '÷', 0xF8: 'ø', 0xF9: 'ù', 0xFA: 'ú', 0xFB: 'û', 0xFC: 'ü', 0xFD: 'ı', 0xFE: 'ş', 0xFF: 'ÿ'
  };

  let out = "";
  for (let i = 0; i < buffer.length; i++) {
    const b = buffer[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (cp1254Map[b]) {
      out += cp1254Map[b];
    } else {
      out += String.fromCharCode(b);
    }
  }
  return out;
}

// VTT altyazı endpoint'i - Temiz ASCII subKey veya bağıntılı yol ile dosya sunar
app.get("/vtt/*", (req, res) => {
  let relPath = req.params[0];
  if (relPath.endsWith(".vtt")) {
    relPath = relPath.slice(0, -4);
  }
  relPath = decodeURIComponent(relPath);

  // 1. subKey haritasından bak (örn: sub_TB_5 -> 21 - Thriller Bark/Bölüm 5...)
  if (keyToRelativePathMap[relPath]) {
    relPath = keyToRelativePathMap[relPath];
  }

  const filePath = path.join(SUBTITLES_DIR, relPath);

  console.log(`🎬 VTT dönüştürme isteği: ${relPath}`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ Dosya bulunamadı: ${filePath}`);
    return res.status(404).send("Subtitle file not found");
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const assContent = decodeCp1254(buffer);
    const vttContent = convertAssToVtt(assContent);

    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(vttContent);
    console.log(`   ✅ VTT başarıyla gönderildi (${vttContent.length} byte)`);
  } catch (err) {
    console.error(`   ❌ Dönüştürme hatası:`, err);
    res.status(500).send("Conversion error");
  }
});

const addonRouter = getRouter(addonInterface);
app.use("/", addonRouter);

const https = require("https");
setInterval(() => {
  const keepAliveUrl = process.env.BASE_URL || "https://one-piece-adon.onrender.com";
  https.get(`${keepAliveUrl}/`, (res) => {
    console.log(`⏰ Keep-alive heartbeat status: ${res.statusCode}`);
  }).on("error", (err) => {
    console.log(`⚠️ Keep-alive heartbeat hatası: ${err.message}`);
  });
}, 4 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`\n🏴‍☠️ ════════════════════════════════════════════════`);
  console.log(`   One Pace Türkçe Altyazı Addon'u başlatıldı!`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`   Stremio'ya ekle: http://localhost:${PORT}/manifest.json`);
  console.log(`🏴‍☠️ ════════════════════════════════════════════════\n`);
});
