/**
 * Tạo icon-192.png và icon-512.png cho PWA
 * Chạy: node generate-icons.js
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPNG(size) {
  const width = size;
  const height = size;

  // Màu nền: #0c1e3a (navy blue)
  const bgR = 0x0c, bgG = 0x1e, bgB = 0x3a;
  // Màu icon: #ef4444 (red - cứu hộ)
  const iconR = 0xef, iconG = 0x44, iconB = 0x44;
  // Màu trắng
  const wR = 0xff, wG = 0xff, wB = 0xff;

  // Tạo pixel data
  const rows = [];
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.38;
  const crossW = width * 0.08;
  const crossH = width * 0.22;

  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Vẽ hình tròn đỏ
      if (dist <= radius) {
        // Vẽ dấu cộng trắng (chữ thập y tế)
        const inHorizBar = Math.abs(dy) <= crossW * 0.6 && Math.abs(dx) <= crossH;
        const inVertBar  = Math.abs(dx) <= crossW * 0.6 && Math.abs(dy) <= crossH;
        if (inHorizBar || inVertBar) {
          row.push(wR, wG, wB);
        } else {
          row.push(iconR, iconG, iconB);
        }
      } else {
        row.push(bgR, bgG, bgB);
      }
    }
    rows.push(row);
  }

  // Tạo raw image data (filter byte 0 trước mỗi row)
  const rawData = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (const row of rows) {
    rawData[offset++] = 0; // filter type None
    for (const byte of row) {
      rawData[offset++] = byte;
    }
  }

  // Compress
  const compressed = zlib.deflateSync(rawData);

  // PNG chunks
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf = Buffer.concat([typeBytes, data]);
    const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, typeBytes, data, crcVal]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, 'frontend/public');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPNG(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPNG(512));
console.log('✅ Đã tạo icon-192.png và icon-512.png');
