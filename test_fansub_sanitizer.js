const fs = require('fs');

function sanitizeFansubText(text) {
  let s = text;
  // Fix ASS override tags
  s = s.replace(/\{[^}]*\}/g, "");
  // Fix newlines
  s = s.replace(/\\N/g, " ").replace(/\\n/g, " ").replace(/\\h/g, " ");
  s = s.replace(/\\/g, "");

  // Fix old Turkish fansub ASCII font substitutions if non-standard characters exist
  // Old Turkish subtitle font mappings:
  // '1' inside Turkish words -> 'ı'
  // '_' inside words -> 'ş'
  // '^' at start of words -> 'Ş'
  // '' or invalid bytes -> mapped to Turkish characters
  
  // Specific word fixes for opening song & common dialogue
  s = s.replace(/D[\uFFFD]nyan1n/g, "Dünyanın");
  s = s.replace(/D[\uFFFD]nyan/g, "Dünyan");
  s = s.replace(/naram1z1/g, "naramızı");
  s = s.replace(/y[\uFFFD]kselterek/g, "yükselterek");
  s = s.replace(/Karar1n1/g, "Kararını");
  s = s.replace(/b1rak/g, "bırak");
  s = s.replace(/kalk1_/g, "kalkış");
  s = s.replace(/[\uFFFD]al1ns1n/g, "Çalınsın");
  s = s.replace(/ka[\uFFFD]abildik/g, "kaçabildik");
  s = s.replace(/g[\uFFFD]k/g, "gök");
  s = s.replace(/s1n1r/g, "sınır");
  s = s.replace(/\^imdi/g, "Şimdi");
  s = s.replace(/k[\uFFFD]rek/g, "kürek");
  s = s.replace(/[\uFFFD]ekerek/g, "çekerek");
  s = s.replace(/a[\uFFFD]1yoruz/g, "açıyoruz");
  s = s.replace(/karanl1k/g, "karanlık");
  s = s.replace(/do ru/g, "doğru");

  // General regex replacements for old fansub font artifacts
  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])1([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, "$1ı$2");
  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])1\b/g, "$1ı");
  s = s.replace(/\b1([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, "ı$1");
  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])_([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, "$1ş$2");
  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])_\b/g, "$1ş");

  // Remove any remaining replacement characters or invalid bytes
  s = s.replace(/[\uFFFD]/g, "");
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

  return s.trim();
}

const sampleAssPath = "One Pace Türkçe [Sadece Altyazı] [_17]/21 - Thriller Bark/Bölüm 6 - 900 Numara？ Lola'nın Peşinden ve Mırıldanan Kılıç Ustası (Manga 453-454) (Ep. 347-348)/TR-subtitle.ass";
const buf = fs.readFileSync(sampleAssPath, 'utf-8');
const lines = buf.split(/\r?\n/);

console.log("=== SANITIZED DIALOGUE LINES ===");
lines.forEach(line => {
  if (line.startsWith("Dialogue:")) {
    const parts = line.substring("Dialogue:".length).trim().split(",");
    if (parts.length >= 9) {
      const rawText = parts.slice(9).join(",").trim();
      const cleanText = sanitizeFansubText(rawText);
      console.log(cleanText);
    }
  }
});
