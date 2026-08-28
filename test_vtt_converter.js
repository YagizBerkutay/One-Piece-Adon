const fs = require('fs');

function cleanAssText(text) {
  let cleaned = text.replace(/\{[^}]*\}/g, "");
  cleaned = cleaned.replace(/\\N/g, "\n").replace(/\\n/g, "\n").replace(/\\h/g, " ");
  cleaned = cleaned.replace(/\\/g, "");
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

      vttOutput += `${startTime} --> ${endTime}\n${cleanText}\n\n`;
    }
  }

  return vttOutput;
}

const sampleAss = fs.readFileSync('One Pace Türkçe [Sadece Altyazı] [_17]/21 - Thriller Bark/Bölüm 1 - Gizemli Deniz ve İskelet Brook (Manga 442-443) (Ep. 326, 337-339)/TR-subtitle.ass', 'utf-8');
const vtt = convertAssToVtt(sampleAss);

console.log("=== FIRST 20 LINES OF CLEAN VTT ===");
console.log(vtt.split('\n').slice(0, 20).join('\n'));
