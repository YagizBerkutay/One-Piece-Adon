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
  6: 6,   // Arlong Park & Buggy's Crew
  7: 6,   // Buggy's Crew
  8: 7,   // Loguetown
  9: 8,   // Reverse Mountain
  10: 9,  // Whisky Peak
  11: 9,  // The Trials of Koby-Meppo (Ep 1 -> S9E3)
  12: 10, // Little Garden
  13: 11, // Drum Island
  14: 12, // Alabasta
  15: 13, // Jaya
  16: 14, // Skypiea
  17: 15, // Long Ring Long Land
  18: 16, // Water Seven
  19: 17, // Enies Lobby
  20: 18, // Post-Enies Lobby
  21: 19, // Thriller Bark
  22: 20, // Sabaody Archipelago
  23: 21, // Amazon Lily
  24: 22, // Impel Down (Eps 1-10)
  25: 22, // Straw Hats Adventures (Ep 1 -> S22E11)
  26: 23, // Marineford (Eps 1-17)
  27: 24, // Post-War (Eps 1-8)
  28: 25, // Return to Sabaody (Eps 1-3)
  29: 26, // Fishman Island (Eps 1-24)
  30: 27, // Punk Hazard (Eps 1-22)
  31: 28, // Dressrosa (Eps 1-48)
  32: 29, // Zou (Eps 1-10)
  33: 30, // Whole Cake Island (Eps 1-39)
  34: 31, // Reverie (Eps 1-3)
  35: 32  // Wano (Eps 1-55)
};

// ============================================================
// Evrensel 35 Sezon Haritalandırma Tanımları
// ============================================================

const arcDefinitions = [
  { folderSeason: 1,  codes: ["RO", "RD", "ROMA"],                 keywords: ["romance", "dawn"] },
  { folderSeason: 2,  codes: ["OR", "OT", "ORA"],                  keywords: ["orange", "town"] },
  { folderSeason: 3,  codes: ["SY", "SYR"],                        keywords: ["syrup", "village"] },
  { folderSeason: 4,  codes: ["GA", "GAI"],                        keywords: ["gaimon"] },
  { folderSeason: 5,  codes: ["BA", "BAR"],                        keywords: ["baratie"] },
  { folderSeason: 6,  codes: ["AR", "AP", "ARL"],                  keywords: ["arlong", "park"] },
  { folderSeason: 7,  codes: ["BUGGYS_CREW", "BU", "BUG", "TABC"], keywords: ["buggy"] },
  { folderSeason: 8,  codes: ["LO", "LT", "LOG"],                  keywords: ["loguetown"] },
  { folderSeason: 9,  codes: ["RM", "REV"],                        keywords: ["reverse", "mountain"] },
  { folderSeason: 10, codes: ["WH", "WP", "WHI"],                  keywords: ["whisky", "peak"] },
  { folderSeason: 11, codes: ["COVER_KOBYMEPPO", "KM", "KOB", "TTKM"], keywords: ["koby", "meppo"] },
  { folderSeason: 12, codes: ["LI", "LG", "LIT"],                  keywords: ["little", "garden"] },
  { folderSeason: 13, codes: ["DI", "DRU"],                        keywords: ["drum", "island"] },
  { folderSeason: 14, codes: ["AL", "ALA"],                        keywords: ["alabasta"] },
  { folderSeason: 15, codes: ["JA", "JAY"],                        keywords: ["jaya"] },
  { folderSeason: 16, codes: ["SK", "SKY"],                        keywords: ["skypiea"] },
  { folderSeason: 17, codes: ["LR", "LL", "LON", "LRLL"],          keywords: ["long", "ring"] },
  { folderSeason: 18, codes: ["WS", "WAT"],                        keywords: ["water", "seven"] },
  { folderSeason: 19, codes: ["EN", "EL", "ENI"],                  keywords: ["enies", "lobby"] },
  { folderSeason: 20, codes: ["PEN", "PE", "POS", "PEL"],          keywords: ["post-enies", "post enies"] },
  { folderSeason: 21, codes: ["TB", "THR"],                        keywords: ["thriller", "bark"] },
  { folderSeason: 22, codes: ["SAB", "SA"],                        keywords: ["sabaody", "archipelago"] },
  { folderSeason: 23, codes: ["AM", "AZ", "AMA"],                  keywords: ["amazon", "lily"] },
  { folderSeason: 24, codes: ["IM", "ID", "IMP"],                  keywords: ["impel", "down"] },
  { folderSeason: 25, codes: ["COVER_SHSS", "SH", "STR", "TASH"],  keywords: ["straw", "hats"] },
  { folderSeason: 26, codes: ["MA", "MF", "MAR"],                  keywords: ["marineford"] },
  { folderSeason: 27, codes: ["PW", "POW"],                        keywords: ["post-war", "post war"] },
  { folderSeason: 28, codes: ["RTS", "RS", "RET"],                 keywords: ["return", "sabaody"] },
  { folderSeason: 29, codes: ["FI", "FIS", "FMI"],                  keywords: ["fishman", "island"] },
  { folderSeason: 30, codes: ["PH", "PUN"],                        keywords: ["punk", "hazard"] },
  { folderSeason: 31, codes: ["DR", "DRE"],                        keywords: ["dressrosa"] },
  { folderSeason: 32, codes: ["ZO", "ZOU"],                        keywords: ["zou"] },
  { folderSeason: 33, codes: ["WC", "WCI"],                        keywords: ["whole", "cake"] },
  { folderSeason: 34, codes: ["REV", "RE"],                        keywords: ["reverie"] },
  { folderSeason: 35, codes: ["WA", "WAN"],                        keywords: ["wano"] }
];

const codeToSubMap = {};
const seasonEpToSubMap = {};
const keyToRelativePathMap = {};

function buildSubtitleMaps() {
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory() && /^\d+/.test(item)) {
        const folderSeason = parseInt(item);
        const eps = fs.readdirSync(fullPath);
        for (const e of eps) {
          const epDir = path.join(fullPath, e);
          if (fs.statSync(epDir).isDirectory()) {
            const m = e.match(/[Bb].l.m\s*(\d+)/i);
            if (m) {
              const episode = parseInt(m[1]);
              const subFiles = fs.readdirSync(epDir);
              for (const sf of subFiles) {
                if (sf.endsWith(".ass") && !sf.includes("EN-") && !sf.includes("EN_")) {
                  const relPath = path.join(item, e, sf).replace(/\\/g, "/");

                  // 1. Klasör Sezon:Bölüm eşleştirmesi
                  seasonEpToSubMap[`${folderSeason}:${episode}`] = relPath;
                  keyToRelativePathMap[`${folderSeason}_${episode}`] = relPath;

                  // 2. Ark Kodları
                  const arcDef = arcDefinitions.find(a => a.folderSeason === folderSeason);
                  if (arcDef) {
                    arcDef.codes.forEach(code => {
                      codeToSubMap[`${code}_${episode}`] = relPath;
                      keyToRelativePathMap[`${code}_${episode}`] = relPath;
                    });
                  }

                  // 3. Fedew04 Stremio Sezon:Bölüm eşleştirmesi
                  let fedewSeason = folderToFedewSeason[folderSeason];
                  let fedewEpisode = episode;
                  if (folderSeason === 11 && episode === 1) {
                    fedewEpisode = 3;
                    codeToSubMap["COVER_KOBYMEPPO_1"] = relPath;
                    keyToRelativePathMap["COVER_KOBYMEPPO_1"] = relPath;
                  }
                  if (folderSeason === 25 && episode === 1) {
                    fedewEpisode = 11;
                    codeToSubMap["COVER_SHSS_1"] = relPath;
                    keyToRelativePathMap["COVER_SHSS_1"] = relPath;
                  }
                  if (fedewSeason) {
                    seasonEpToSubMap[`${fedewSeason}:${fedewEpisode}`] = relPath;
                    keyToRelativePathMap[`${fedewSeason}_${fedewEpisode}`] = relPath;
                  }
                }
              }
            }
          }
        }
      } else if (item.endsWith(".ass") && !item.includes("EN-") && !item.includes("EN_")) {
        // Kök Klasör Dosyaları (Wano, Alabasta, Skypiea, Jaya, Romance Dawn vs.)
        const relPath = item.replace(/\\/g, "/");
        const m = item.match(/\[(.*?)\]/);
        if (m) {
          const inside = m[1];
          const numM = inside.match(/(\d+)/);
          const epNum = numM ? parseInt(numM[1]) : 1;
          const arcDef = arcDefinitions.find(a => inside.toLowerCase().includes(a.keywords[0]));
          if (arcDef) {
            arcDef.codes.forEach(code => {
              codeToSubMap[`${code}_${epNum}`] = relPath;
              keyToRelativePathMap[`${code}_${epNum}`] = relPath;
            });
            seasonEpToSubMap[`${arcDef.folderSeason}:${epNum}`] = relPath;
            keyToRelativePathMap[`${arcDef.folderSeason}_${epNum}`] = relPath;

            const fedewS = folderToFedewSeason[arcDef.folderSeason] || arcDef.folderSeason;
            seasonEpToSubMap[`${fedewS}:${epNum}`] = relPath;
            keyToRelativePathMap[`${fedewS}_${epNum}`] = relPath;
          }
        }
      }
    }
  }

  scanDir(SUBTITLES_DIR);
}

buildSubtitleMaps();
console.log(`✅ Evrensel harita yüklendi: ${Object.keys(codeToSubMap).length} Ark Kodu, ${Object.keys(keyToRelativePathMap).length} Anahtar Eşleşmesi.`);

// ============================================================
// ExoPlayer/VLC Uyumlu ASS → VTT Dönüştürücü (Kronolojik Sıralamalı)
// ============================================================

function unmojikake(str) {
  let text = str;
  while (/Ã|Ä|Å/.test(text)) {
    try {
      const fixed = Buffer.from(text, "latin1").toString("utf-8");
      if (fixed === text) break;
      text = fixed;
    } catch (e) {
      break;
    }
  }
  return text;
}

function cleanAssText(text) {
  let s = unmojikake(text);
  s = s.replace(/\{[^}]*\}/g, "");
  s = s.replace(/\\N/g, " ").replace(/\\n/g, " ").replace(/\\h/g, " ");
  s = s.replace(/\\/g, "");


  // Kalan bozuk Unicode ve kontrol karakterlerini temizle
  s = s.replace(/[\uFFFD]/g, "");
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

  return s.split("\n").map(l => l.trim()).filter(l => l.length > 0).join("\n").trim();
}

function convertAssTime(assTime) {
  const match = assTime.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
  if (!match) return null;
  const hours = match[1].padStart(2, "0");
  const minutes = match[2];
  const seconds = match[3];
  const centiseconds = match[4];
  const milliseconds = (parseInt(centiseconds) * 10).toString().padStart(3, "0");
  const totalMs = parseInt(hours) * 3600000 + parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(milliseconds);
  return {
    str: `${hours}:${minutes}:${seconds}.${milliseconds}`,
    totalMs
  };
}

function convertAssToVtt(assContent) {
  // Alt satırsız birleşmiş Dialogue: bloklarını da tam ayrıştırır
  const dialogueBlocks = assContent.split(/(?=Dialogue:)/);
  const cues = [];

  for (const block of dialogueBlocks) {
    const trimmed = block.trim();
    if (trimmed.startsWith("Dialogue:")) {
      const dLine = trimmed.split(/\r?\n/)[0];
      const dialoguePart = dLine.substring("Dialogue:".length).trim();
      const parts = dialoguePart.split(",");
      if (parts.length < 9) continue;

      const startObj = convertAssTime(parts[1].trim());
      const endObj = convertAssTime(parts[2].trim());
      if (!startObj || !endObj) continue;

      if (endObj.totalMs <= startObj.totalMs) continue;

      const rawText = parts.slice(9).join(",").trim();
      const cleanText = cleanAssText(rawText);

      if (cleanText.length === 0) continue;

      cues.push({
        startStr: startObj.str,
        endStr: endObj.str,
        startMs: startObj.totalMs,
        text: cleanText
      });
    }
  }

  // ExoPlayer / Stremio TV için altyazıları kesin kronolojik sıraya diz
  cues.sort((a, b) => a.startMs - b.startMs);

  let vttOutput = "WEBVTT\n\n";
  cues.forEach((cue, index) => {
    vttOutput += `${index + 1}\n${cue.startStr} --> ${cue.endStr}\n${cue.text}\n\n`;
  });

  return vttOutput;
}

function convertAssToSrt(assContent) {
  const dialogueBlocks = assContent.split(/(?=Dialogue:)/);
  const cues = [];

  for (const block of dialogueBlocks) {
    const trimmed = block.trim();
    if (trimmed.startsWith("Dialogue:")) {
      const dLine = trimmed.split(/\r?\n/)[0];
      const dialoguePart = dLine.substring("Dialogue:".length).trim();
      const parts = dialoguePart.split(",");
      if (parts.length < 9) continue;

      const sMatch = parts[1].trim().match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
      const eMatch = parts[2].trim().match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
      if (!sMatch || !eMatch) continue;

      const sStr = `${sMatch[1].padStart(2, "0")}:${sMatch[2]}:${sMatch[3]},${(parseInt(sMatch[4]) * 10).toString().padStart(3, "0")}`;
      const eStr = `${eMatch[1].padStart(2, "0")}:${eMatch[2]}:${eMatch[3]},${(parseInt(eMatch[4]) * 10).toString().padStart(3, "0")}`;
      const sMs = parseInt(sMatch[1]) * 3600000 + parseInt(sMatch[2]) * 60000 + parseInt(sMatch[3]) * 1000 + parseInt(sMatch[4]) * 10;
      const eMs = parseInt(eMatch[1]) * 3600000 + parseInt(eMatch[2]) * 60000 + parseInt(eMatch[3]) * 1000 + parseInt(eMatch[4]) * 10;
      if (eMs <= sMs) continue;

      const rawText = parts.slice(9).join(",").trim();
      const cleanText = cleanAssText(rawText);
      if (cleanText.length === 0) continue;

      cues.push({
        startStr: sStr,
        endStr: eStr,
        startMs: sMs,
        text: cleanText,
      });
    }
  }

  cues.sort((a, b) => a.startMs - b.startMs);

  let srtOutput = "";
  cues.forEach((cue, index) => {
    srtOutput += `${index + 1}\r\n${cue.startStr} --> ${cue.endStr}\r\n${cue.text}\r\n\r\n`;
  });

  return srtOutput;
}

// ============================================================
// Stremio Addon Tanımı
// ============================================================

const manifest = {
  id: "community.onepace.tr.subtitles",
  version: "1.4.0",
  name: "One Pace TR Altyazı",
  description:
    "One Pace için Türkçe altyazı addon'u. Tüm 35 Sezon (Fishman Island, Marineford, Wano vs.) desteklenir.",
  logo: "https://i.pinimg.com/originals/4c/46/ee/4c46ee47e0710a6d928454f68fc4ee17.png",
  resources: ["subtitles"],
  types: ["series", "movie", "anime", "other"],
  catalogs: [],
};

const builder = new addonBuilder(manifest);

// ============================================================
// Subtitle Handler (Çok Katmanlı Evrensel Çözücü)
// ============================================================

builder.defineSubtitlesHandler(async (args) => {
  console.log(`📝 Altyazı isteği: type=${args.type}, id=${args.id}`);

  let filename = null;
  let subKey = null;
  const decodedId = decodeURIComponent(args.id);

  // 1. Ark Kod Kontrolü (örn: IM_1, MA_1, AM_1, TB_6, COVER_SHSS_1, COVER_KOBYMEPPO_1, BUGGYS_CREW_1)
  const codeMatch = decodedId.match(/([A-Z_]+)_(\d+)/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const ep = parseInt(codeMatch[2]);
    subKey = `${code}_${ep}`;
    if (codeToSubMap[subKey]) filename = codeToSubMap[subKey];
  }
  if (!filename && codeToSubMap[decodedId.toUpperCase()]) {
    subKey = decodedId.toUpperCase();
    filename = codeToSubMap[subKey];
  }

  // 2. Sezon:Bölüm Format Kontrolü (örn: 22:1, 23:1, pp_onepace:22:1, series:22:1)
  if (!filename) {
    const parts = decodedId.split(":");
    if (parts.length >= 2) {
      const s = parseInt(parts[parts.length - 2]);
      const ep = parseInt(parts[parts.length - 1]);
      if (!isNaN(s) && !isNaN(ep)) {
        subKey = `${s}_${ep}`;
        if (seasonEpToSubMap[`${s}:${ep}`]) {
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

  const host = "one-piece-adon.onrender.com";
  const srtUrl = `https://${host}/vtt/sub_${subKey}.srt`;
  const vttUrl = `https://${host}/vtt/sub_${subKey}.vtt`;

  // Haritaya kaydet ki VTT/SRT endpoint'i subKey ile alabilsin
  keyToRelativePathMap[`sub_${subKey}`] = filename;

  return {
    subtitles: [
      {
        id: srtUrl,
        url: srtUrl,
        lang: "tur",
      },
      {
        id: vttUrl,
        url: vttUrl,
        lang: "tr",
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
  // UTF-8 BOM kontrolü (EF BB BF)
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.toString("utf-8");
  }

  // UTF-8 geçerlilik kontrolü: decode edip tekrar encode et, aynıysa UTF-8'dir
  const utf8Str = buffer.toString("utf-8");
  if (!utf8Str.includes("\uFFFD") && Buffer.from(utf8Str, "utf-8").equals(buffer)) {
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

// TV Oynatıcı Uyumlu ASCII Türkçe Harf Dönüştürücü (Font eksikliği olan TV'ler için)
function convertToAsciiTurkish(text) {
  let s = text;
  s = s.replace(/ş/g, "s").replace(/Ş/g, "S");
  s = s.replace(/ğ/g, "g").replace(/Ğ/g, "G");
  s = s.replace(/ç/g, "c").replace(/Ç/g, "C");
  s = s.replace(/ö/g, "o").replace(/Ö/g, "O");
  s = s.replace(/ü/g, "u").replace(/Ü/g, "U");
  s = s.replace(/İ/g, "I");
  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜiIsSgGcCoOuU])x\b/g, "$1s");
  return s;
}

// VTT / SRT altyazı endpoint'i - Temiz ASCII subKey veya bağıntılı yol ile dosya sunar
app.get("/vtt/*", (req, res) => {
  let relPath = req.params[0];
  let isAsciiMode = false;
  let isSrtFormat = false;

  if (relPath.endsWith(".vtt")) {
    relPath = relPath.slice(0, -4);
  } else if (relPath.endsWith(".srt")) {
    isSrtFormat = true;
    relPath = relPath.slice(0, -4);
  }

  if (relPath.endsWith("_ascii")) {
    isAsciiMode = true;
    relPath = relPath.slice(0, -6);
  }
  relPath = decodeURIComponent(relPath);

  // 1. subKey haritasından bak (örn: sub_TB_5 -> 21 - Thriller Bark/Bölüm 5...)
  if (keyToRelativePathMap[relPath]) {
    relPath = keyToRelativePathMap[relPath];
  }

  const filePath = path.join(SUBTITLES_DIR, relPath);

  console.log(`🎬 Altyazı dönüştürme isteği: ${relPath} (ascii=${isAsciiMode}, srt=${isSrtFormat})`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ Dosya bulunamadı: ${filePath}`);
    return res.status(404).send("Subtitle file not found");
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const assContent = decodeCp1254(buffer);

    let outputContent = "";
    let mimeType = "text/vtt; charset=utf-8";

    if (isSrtFormat) {
      outputContent = convertAssToSrt(assContent);
      mimeType = "text/plain; charset=utf-8";
    } else {
      outputContent = convertAssToVtt(assContent);
    }

    if (isAsciiMode) {
      outputContent = convertToAsciiTurkish(outputContent);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(outputContent);
    console.log(`   ✅ Altyazı başarıyla gönderildi (${outputContent.length} byte, format=${isSrtFormat ? 'SRT' : 'VTT'})`);
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
