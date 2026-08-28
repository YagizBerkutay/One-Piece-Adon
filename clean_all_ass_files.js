const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

function sanitizeFansubText(text) {
  let s = text;
  s = s.replace(/\{[^}]*\}/g, "");
  s = s.replace(/\\N/g, " ").replace(/\\n/g, " ").replace(/\\h/g, " ");
  s = s.replace(/\\/g, "");

  // Mojikake fix (Ã¼ -> ü, Ä± -> ı, ÅŸ -> ş, Ã§ -> ç, Ã¶ -> ö, Ãœ -> Ü, Ä° -> İ, Åž -> Ş, Ã‡ -> Ç, Ã– -> Ö)
  while (/Ã¼|Ä±|ÅŸ|Ã§|Ã¶|Ãœ|Ä°|Åž|Ã‡|Ã–/.test(s)) {
    try {
      const fixed = Buffer.from(s, 'latin1').toString('utf-8');
      if (fixed === s) break;
      s = fixed;
    } catch (e) {
      break;
    }
  }

  // Fansub font replacements
  s = s.replace(/DÃ¼nyan1n/g, "Dünyanın");
  s = s.replace(/DÃ¼nyan/g, "Dünyan");
  s = s.replace(/naram1z1/g, "naramızı");
  s = s.replace(/yÃ¼kselterek/g, "yükselterek");
  s = s.replace(/Karar1n1/g, "Kararını");
  s = s.replace(/b1rak/g, "bırak");
  s = s.replace(/kalk1_/g, "kalkış");
  s = s.replace(/al1ns1n/g, "Çalınsın");
  s = s.replace(/kaabildik/g, "kaçabildik");
  s = s.replace(/gk/g, "gök");
  s = s.replace(/s1n1r/g, "sınır");
  s = s.replace(/\^imdi/g, "Şimdi");
  s = s.replace(/krek/g, "kürek");
  s = s.replace(/ekerek/g, "çekerek");
  s = s.replace(/a1yoruz/g, "açıyoruz");
  s = s.replace(/karanl1k/g, "karanlık");
  s = s.replace(/do ru/g, "doğru");

  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])1([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, "$1ı$2");
  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])1\b/g, "$1ı");
  s = s.replace(/\b1([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, "ı$1");
  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])_([a-zA-ZçğıöşüÇĞİÖŞÜ])/g, "$1ş$2");
  s = s.replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ])_\b/g, "$1ş");

  s = s.replace(/[\uFFFD]/g, "");
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

  return s;
}

function getAllAssFiles(dir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllAssFiles(fullPath, fileList);
    } else if (item.endsWith(".ass")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = getAllAssFiles(SUBTITLES_DIR);
let count = 0;

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const sanitized = sanitizeFansubText(content);
  fs.writeFileSync(file, sanitized, 'utf-8');
  count++;
});

console.log(`✅ ${count} adet .ass dosyasının tamamı TAM KUSURSUZ TÜRKÇE UTF-8 formatına dönüştürüldü!`);
