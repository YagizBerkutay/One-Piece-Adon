const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

function getAllAssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllAssFiles(filePath, fileList);
    } else if (file.endsWith(".ass")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allAss = getAllAssFiles(SUBTITLES_DIR);

console.log("Bulunan tüm .ass dosyaları:");
allAss.forEach(f => {
  const rel = path.relative(SUBTITLES_DIR, f);
  if (rel.includes("Thriller Bark") || rel.includes("Fishman") || rel.includes("Wano")) {
    console.log(rel);
  }
});
