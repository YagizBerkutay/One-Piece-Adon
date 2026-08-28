const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

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

const allAssFiles = getAllAssFiles(SUBTITLES_DIR);
console.log(`Toplam ${allAssFiles.length} .ass dosyası taranıyor...`);

let invalidUtf8Files = 0;

allAssFiles.forEach(file => {
  const buf = fs.readFileSync(file);
  const str = buf.toString('utf-8');
  if (str.includes('')) {
    invalidUtf8Files++;
    console.log(`[BOZUK UTF-8] ${path.relative(SUBTITLES_DIR, file)}`);
  }
});

console.log(`\nToplam Bozuk UTF-8 Karakter İçeren Dosya Sayısı: ${invalidUtf8Files} / ${allAssFiles.length}`);
