import fs from 'fs';
import zlib from 'zlib';

function makePNG(size, bgR, bgG, bgB) {
  const width = size;
  const height = size;
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const r = size / 2;
      const dx = x - r;
      const dy = y - r;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r * 0.85) {
        rawData[px] = bgR;
        rawData[px + 1] = bgG;
        rawData[px + 2] = bgB;
        rawData[px + 3] = 255;
      } else {
        rawData[px] = 158;
        rawData[px + 1] = 183;
        rawData[px + 2] = 229;
        rawData[px + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const chunkType = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([chunkType, data]));
    crc.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, chunkType, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflated
  ihdr[11] = 0; // no filter
  ihdr[12] = 0; // non-interlaced

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

fs.writeFileSync('public/pwa-192x192.png', makePNG(192, 214, 199, 229));
fs.writeFileSync('public/pwa-512x512.png', makePNG(512, 214, 199, 229));
fs.writeFileSync('public/apple-touch-icon.png', makePNG(180, 158, 183, 229));
console.log('PWA PNG icons created successfully!');
