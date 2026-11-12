import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(size) {
  // Background #0a0d12, emergency medical motif:
  // Red cross #ef4444 with subtle blue pulse #3b82f6
  const width = size;
  const height = size;
  const buffer = Buffer.alloc(height * (1 + width * 4));

  const center = size / 2;
  const radius = size * 0.38; // 80% safe zone for maskable

  let offset = 0;
  for (let y = 0; y < height; y++) {
    buffer[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background #0a0d12
      let r = 10, g = 13, b = 18, a = 255;

      // Outer circular badge
      if (dist <= radius) {
        // Base badge color #111620
        r = 17; g = 22; b = 32;

        // Border glow
        if (dist >= radius - 2) {
          r = 59; g = 130; b = 246; // #3b82f6
        }

        // Medical Cross / Syringe emblem
        const armW = size * 0.1;
        const armL = size * 0.26;
        const inH = Math.abs(dy) <= armW && Math.abs(dx) <= armL;
        const inV = Math.abs(dx) <= armW && Math.abs(dy) <= armL;

        if (inH || inV) {
          // Emergency Red #ef4444
          r = 239; g = 68; b = 68;

          // Inner cross highlight #fca5a5
          if (Math.abs(dx) <= armW * 0.4 && Math.abs(dy) <= armL * 0.8 ||
              Math.abs(dy) <= armW * 0.4 && Math.abs(dx) <= armL * 0.8) {
            r = 254; g = 202; b = 202;
          }
        }
      }

      buffer[offset++] = r;
      buffer[offset++] = g;
      buffer[offset++] = b;
      buffer[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(buffer);

  // Build PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve(process.cwd(), 'public/icons');
fs.mkdirSync(outDir, { recursive: true });

const sizes = [48, 72, 96, 128, 192, 384, 512];
for (const s of sizes) {
  const buf = createPNG(s);
  const fileName = `maskable_icon_x${s}.png`;
  fs.writeFileSync(path.join(outDir, fileName), buf);
  console.log(`Generated ${fileName} (${s}x${s})`);
}

// Also create apple-touch-icon.png (180x180) and icon-192/512 in public
fs.writeFileSync(path.resolve(process.cwd(), 'public/apple-touch-icon.png'), createPNG(180));
fs.writeFileSync(path.resolve(process.cwd(), 'public/pwa-192x192.png'), createPNG(192));
fs.writeFileSync(path.resolve(process.cwd(), 'public/pwa-512x512.png'), createPNG(512));
console.log('All icons generated successfully.');
