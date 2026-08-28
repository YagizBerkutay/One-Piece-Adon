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

// Bölüm eşleştirme dosyasını yükle
let subtitleMap = {};
try {
  subtitleMap = JSON.parse(
    fs.readFileSync(path.join(__dirname, "subtitle-map.json"), "utf-8")
  );
  console.log(
    `✅ ${Object.keys(subtitleMap).length} bölüm eşleştirmesi yüklendi.`
  );
} catch (err) {
  console.error("❌ subtitle-map.json yüklenemedi:", err.message);
  process.exit(1);
}

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
  version: "1.0.0",
  name: "One Pace TR Altyazı",
  description:
    "One Pace için Türkçe altyazı addon'u. fedew04 One Pace addon'u ile uyumludur.",
  logo: "https://i.pinimg.com/originals/4c/46/ee/4c46ee47e0710a6d928454f68fc4ee17.png",
  resources: [
    {
      name: "subtitles",
      types: ["series"],
      idPrefixes: ["pp"]
    }
  ],
  types: ["series"],
  idPrefixes: ["pp"],
  catalogs: [],
};

const builder = new addonBuilder(manifest);

// ============================================================
// Subtitle Handler
// ============================================================

builder.defineSubtitlesHandler(async (args) => {
  console.log(`📝 Altyazı isteği: type=${args.type}, id=${args.id}`);

  // ID formatı: pp_onepace:SEASON:EPISODE
  const parts = args.id.split(":");
  if (parts.length < 3) {
    console.log(`   ⚠️ Geçersiz ID formatı: ${args.id}`);
    return { subtitles: [] };
  }

  const season = parseInt(parts[1]);
  const episode = parseInt(parts[2]);
  const mapKey = `${season}:${episode}`;

  console.log(`   🔍 Aranan: Sezon ${season}, Bölüm ${episode} (key: ${mapKey})`);

  const entry = subtitleMap[mapKey];
  if (!entry) {
    console.log(`   ❌ Eşleştirme bulunamadı: ${mapKey}`);
    return { subtitles: [] };
  }

  console.log(`   ✅ Bulundu: Bolum ${entry.bolum} → ${entry.filename}`);

  // Altyazı dosyasının var olup olmadığını kontrol et
  const subtitlePath = path.join(SUBTITLES_DIR, entry.filename);
  if (!fs.existsSync(subtitlePath)) {
    console.log(`   ❌ Dosya bulunamadı: ${subtitlePath}`);
    return { subtitles: [] };
  }

  // Addon'un kendi sunucusundaki VTT endpoint'ine yönlendir
  const baseUrl =
    process.env.BASE_URL || `http://localhost:${PORT}`;
  const vttUrl = `${baseUrl}/subtitles/${encodeURIComponent(entry.filename)}.vtt`;

  return {
    subtitles: [
      {
        id: `onepace-tr-${mapKey}`,
        url: vttUrl,
        lang: "tur",
      },
    ],
  };
});

// ============================================================
// Express Sunucusu (VTT dönüştürme endpoint'i dahil)
// ============================================================

const addonInterface = builder.getInterface();

// SDK'nın getRouter fonksiyonunu kullanarak Express router'ı oluştur
const { getRouter } = require("stremio-addon-sdk");
const express = require("express");
const app = express();

// CORS headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
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
app.get("/subtitles/:filename.vtt", (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filePath = path.join(SUBTITLES_DIR, filename);

  console.log(`🎬 VTT dönüştürme isteği: ${filename}`);

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
