const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

function cleanAssText(text) {
  let cleaned = text.replace(/\{[^}]*\}/g, "");
  cleaned = cleaned.replace(/\\N/g, " ").replace(/\\n/g, " ").replace(/\\h/g, " ");
  cleaned = cleaned.replace(/\\/g, "");
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Control characters
  return cleaned.trim();
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

function convertAssToVttStrict(assContent) {
  const lines = assContent.split(/\r?\n/);
  const cues = [];

  for (const line of lines) {
    if (line.startsWith("Dialogue:")) {
      const dialoguePart = line.substring("Dialogue:".length).trim();
      const parts = dialoguePart.split(",");
      if (parts.length < 9) continue;

      const startObj = convertAssTime(parts[1].trim());
      const endObj = convertAssTime(parts[2].trim());
      if (!startObj || !endObj) continue;

      // Skip invalid durations (end <= start)
      if (endObj.totalMs <= startObj.totalMs) continue;

      const rawText = parts.slice(9).join(",").trim();
      const cleanText = cleanAssText(rawText);

      if (cleanText.length === 0) continue;

      cues.push({
        startStr: startObj.str,
        endStr: endObj.str,
        startMs: startObj.totalMs,
        endMs: endObj.totalMs,
        text: cleanText
      });
    }
  }

  // SORT CUES STRICTLY BY START TIME (Crucial for ExoPlayer / Android TV!)
  cues.sort((a, b) => a.startMs - b.startMs);

  let vttOutput = "WEBVTT\n\n";
  cues.forEach(cue => {
    vttOutput += `${cue.startStr} --> ${cue.endStr}\n${cue.text}\n\n`;
  });

  return vttOutput;
}

const sampleAss = fs.readFileSync('One Pace Türkçe [Sadece Altyazı] [_17]/21 - Thriller Bark/Bölüm 6 - 900 Numara？ Lola\'nın Peşinden ve Mırıldanan Kılıç Ustası (Manga 453-454) (Ep. 347-348)/TR-subtitle.ass');

// Check CP1254 decode + VTT convert
function decodeCp1254(buffer) {
  const utf8Str = buffer.toString("utf-8");
  if (!utf8Str.includes("") && !utf8Str.includes("\uFFFD")) return utf8Str;

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
    if (b < 0x80) out += String.fromCharCode(b);
    else if (cp1254Map[b]) out += cp1254Map[b];
    else out += String.fromCharCode(b);
  }
  return out;
}

const assText = decodeCp1254(sampleAss);
const strictVtt = convertAssToVttStrict(assText);
console.log("Strict VTT Head:\n", strictVtt.slice(0, 300));
