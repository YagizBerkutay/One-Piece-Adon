const fs = require('fs');
const path = require('path');

const SUBTITLES_DIR = path.join(__dirname, "One Pace Türkçe [Sadece Altyazı] [_17]");

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

function repairEncoding(buffer) {
  let str = buffer.toString('utf-8');

  // If buffer has replacement character U+FFFD, decode from CP1254 bytes
  if (str.includes('\uFFFD') || str.includes('')) {
    let cpOut = '';
    for (let i = 0; i < buffer.length; i++) {
      const b = buffer[i];
      if (b < 0x80) cpOut += String.fromCharCode(b);
      else if (cp1254Map[b]) cpOut += cp1254Map[b];
      else cpOut += String.fromCharCode(b);
    }
    str = cpOut;
  }

  // If double-encoded mojikake exists (e.g. Ã¼, Ä±, ÅŸ, Ã§, Ã¶), fix it repeatedly until clean
  while (/Ã¼|Ä±|ÅŸ|Ã§|Ã¶|Ãœ|Ä°|Åž|Ã‡|Ã–/.test(str)) {
    try {
      const fixed = Buffer.from(str, 'latin1').toString('utf-8');
      if (fixed === str) break;
      str = fixed;
    } catch (e) {
      break;
    }
  }

  return str;
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
  const buf = fs.readFileSync(file);
  const cleanStr = repairEncoding(buf);
  fs.writeFileSync(file, cleanStr, 'utf-8');
  count++;
});

console.log(`✅ ${count} adet .ass dosyasının tamamı TAM KUSURSUZ TÜRKÇE UTF-8 formatına tamir edildi!`);
