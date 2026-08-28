const fs = require('fs');

function decodePristineAssFile(buffer) {
  const rawStr = buffer.toString('utf-8');
  try {
    const unmojikake = Buffer.from(rawStr, 'latin1').toString('utf-8');
    if (unmojikake.includes('Dünyanın') || unmojikake.includes('Görünmez') || unmojikake.includes('bölüm') || unmojikake.includes('Bölüm') || unmojikake.includes('bir')) {
      return unmojikake;
    }
  } catch (e) {}
  return rawStr;
}

const sampleAssPath = "One Pace Türkçe [Sadece Altyazı] [_17]/21 - Thriller Bark/Bölüm 6 - 900 Numara？ Lola'nın Peşinden ve Mırıldanan Kılıç Ustası (Manga 453-454) (Ep. 347-348)/TR-subtitle.ass";
const buf = fs.readFileSync(sampleAssPath);
const decoded = decodePristineAssFile(buf);

console.log("Decoded pristine ASS text sample:");
const dialogueLines = decoded.split('\n').filter(l => l.startsWith('Dialogue:'));
console.log(dialogueLines.slice(0, 10).join('\n'));
