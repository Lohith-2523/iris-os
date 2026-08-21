const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.resolve(__dirname, 'iris-feature-catalog-qa');
const files = fs.readdirSync(dir).filter(name => /^page-\d+\.png$/.test(name)).sort();
const cols = 4, rows = 4, thumbW = 204, thumbH = 264;
(async () => {
  for (let start = 0; start < files.length; start += cols * rows) {
    const slice = files.slice(start, start + cols * rows);
    const inputs = [];
    for (let i = 0; i < slice.length; i++) {
      const buffer = await sharp(path.join(dir, slice[i])).resize(thumbW, thumbH, { fit: 'fill' }).png().toBuffer();
      inputs.push({ input: buffer, left: (i % cols) * thumbW, top: Math.floor(i / cols) * thumbH });
    }
    await sharp({ create: { width: cols * thumbW, height: rows * thumbH, channels: 3, background: '#050506' } })
      .composite(inputs).png().toFile(path.join(dir, `contact-${String(start / (cols * rows) + 1).padStart(2, '0')}.png`));
  }
  console.log(`Created ${Math.ceil(files.length / (cols * rows))} contact sheets from ${files.length} pages.`);
})().catch(error => { console.error(error); process.exit(1); });
