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
  version: "1.0.6",
  name: "One Pace TR Altyazı",
  description:
    "One Pace için Türkçe altyazı addon'u. Tüm 35 Sezon (Fishman Island, Marineford, Wano vs.) desteklenir.",
  logo: "https://i.pinimg.com/originals/4c/46/ee/4c46ee47e0710a6d928454f68fc4ee17.png",
  resources: ["subtitles"],
  types: ["series", "movie", "other"],
  catalogs: [],
};

const builder = new addonBuilder(manifest);

// ============================================================
// Subtitle Handler
// ============================================================

builder.defineSubtitlesHandler(async (args) => {
  console.log(`📝 Altyazı isteği: type=${args.type}, id=${args.id}`);

  // ID formatlarından Sezon ve Bölüm numaralarını evrensel olarak çıkar (örn: pp_onepace:19:3, tt0388629:19:3, 19:3, 19x3)
  let season = null;
  let episode = null;

  // Pattern 1: ID içinde 2 veya 3 parçalı sayı dizisi (örn: pp:19:3 veya 19:3 veya tt0388629:19:3)
  const parts = args.id.split(":");
  if (parts.length >= 3) {
    season = parseInt(parts[parts.length - 2]);
    episode = parseInt(parts[parts.length - 1]);
  } else if (parts.length === 2) {
    season = parseInt(parts[0]);
    episode = parseInt(parts[1]);
  }

  // Pattern 2: Regex ile S19E03 veya 19x3 veya 19-3 bulma yedek kontrolü
  if (isNaN(season) || isNaN(episode)) {
    const match = args.id.match(/(?:S|Sezon\s*)?(\d+)[xX:E_-](\d+)/i);
    if (match) {
      season = parseInt(match[1]);
      episode = parseInt(match[2]);
    }
  }

  if (isNaN(season) || isNaN(episode)) {
    console.log(`   ⚠️ Geçersiz Sezon/Bölüm formatı: ${args.id}`);
    return { subtitles: [] };
  }

  const mapKey = `${season}:${episode}`;
  console.log(`   🔍 Aranan: Sezon ${season}, Bölüm ${episode} (key: ${mapKey})`);

  const filename = subtitleMap[mapKey];
  if (!filename) {
    console.log(`   ❌ Eşleştirme bulunamadı: ${mapKey}`);
    return { subtitles: [] };
  }

  console.log(`   ✅ Eşleşti: ${mapKey} → ${filename}`);

  // Altyazı dosyasının var olup olmadığını kontrol et
  const subtitlePath = path.join(SUBTITLES_DIR, filename);
  if (!fs.existsSync(subtitlePath)) {
    console.log(`   ❌ Dosya bulunamadı: ${subtitlePath}`);
    return { subtitles: [] };
  }

  // Addon'un kendi sunucusundaki VTT endpoint'ine yönlendir
  const baseUrl =
    process.env.BASE_URL || `http://localhost:${PORT}`;
  const vttUrl = `${baseUrl}/vtt/${encodeURIComponent(filename)}.vtt`;

  return {
    subtitles: [
      {
        id: `onepace-tr-${mapKey}-tur`,
        url: vttUrl,
        lang: "tur",
      },
      {
        id: `onepace-tr-${mapKey}-turkish`,
        url: vttUrl,
        lang: "Turkish",
      },
    ],
  };
});

// ============================================================
// Express Sunucusu (VTT dönüştürme endpoint'i & Logger dahil)
// ============================================================

const addonInterface = builder.getInterface();

// SDK'nın getRouter fonksiyonunu kullanarak Express router'ı oluştur
const { getRouter } = require("stremio-addon-sdk");
const express = require("express");
const app = express();

// İstek Günlüğü (Son 50 İsteği Kaydet)
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

// CORS headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// Canlı İstekleri Görme Endpoint'i
app.get("/recent-requests", (req, res) => {
  res.json(recentRequests);
});

// Ana sayfa (Landing Page & Install Button)
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

// VTT altyazı endpoint'i - .ass dosyasını VTT'ye dönüştürüp sunar
app.get("/vtt/*", (req, res) => {
  let relPath = req.params[0];
  if (relPath.endsWith(".vtt")) {
    relPath = relPath.slice(0, -4);
  }
  relPath = decodeURIComponent(relPath);
  const filePath = path.join(SUBTITLES_DIR, relPath);

  console.log(`🎬 VTT dönüştürme isteği: ${relPath}`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ Dosya bulunamadı: ${filePath}`);
    return res.status(404).send("Subtitle file not found");
  }

  try {
    const assContent = fs.readFileSync(filePath, "utf-8");
    const vttContent = convertAssToVtt(assContent);

    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400"); // 24 saat cache
    res.send(vttContent);
    console.log(`   ✅ VTT başarıyla gönderildi (${vttContent.length} byte)`);
  } catch (err) {
    console.error(`   ❌ Dönüştürme hatası:`, err);
    res.status(500).send("Conversion error");
  }
});

// Stremio addon route'larını bağla
const addonRouter = getRouter(addonInterface);
app.use("/", addonRouter);

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`\n🏴‍☠️ ════════════════════════════════════════════════`);
  console.log(`   One Pace Türkçe Altyazı Addon'u başlatıldı!`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`   Stremio'ya ekle: http://localhost:${PORT}/manifest.json`);
  console.log(`🏴‍☠️ ════════════════════════════════════════════════\n`);
});
