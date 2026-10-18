// zip.js — v23.1 집중 사진 전부 내려받기: 사진 여러 장을 zip 한 파일로 묶는다 (라이브러리 없이)
//
//  · 압축하지 않고 담기만 한다(STORE) — webp 는 이미 압축돼 있어서 다시 눌러도 거의 안 준다. 대신 코드가 작고 빠르다.
//  · 브라우저는 파일 여러 개를 한꺼번에 내려받으면 막거나 하나씩 묻는다 → 한 파일로 묶어 한 번에.
//  · 파일 이름은 UTF-8 (한글 이름 그대로, 일반 비트 11 켬).

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

// 날짜 → DOS 시각·날짜 (zip 안 파일 시각)
function dos(ms) {
  const d = new Date(ms), y = Math.max(1980, d.getFullYear());
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

// files: [{ name, bytes: Uint8Array, at?: ms }] → Uint8Array (zip)
export function zipStore(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = f.bytes, crc = crc32(data), { time, date } = dos(f.at ?? Date.now());
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  }
  const cSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cSize, true); end.setUint32(16, off, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)], out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
  let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

// 사진 파일 이름: "2026-10-18_1530_포트폴리오 정리.webp" (파일 이름에 못 쓰는 글자는 뺀다, 같은 이름이면 -2)
export function shotNames(shots) {
  const p = n => String(n).padStart(2, '0'), used = new Map();
  return shots.map(s => {
    const d = new Date(s.at), base = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}_${String(s.reason || '집중').replace(/[\\/:*?"<>|.\s]+/g, ' ').trim().slice(0, 24) || '집중'}`;
    const n = (used.get(base) || 0) + 1; used.set(base, n);
    return `${base}${n > 1 ? '-' + n : ''}.webp?v=v25.5.1`;
  });
}
