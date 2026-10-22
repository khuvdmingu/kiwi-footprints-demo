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

// 파일 하나의 앞머리(30바이트)와 끝 목록 한 줄(46바이트). size·crc 만 있으면 된다 — 내용은 따로 붙인다
function headers(name, size, crc, at, off) {
  const { time, date } = dos(at ?? Date.now());
  const h = new DataView(new ArrayBuffer(30));
  h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
  h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
  h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
  const c = new DataView(new ArrayBuffer(46));
  c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
  c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true);
  c.setUint16(28, name.length, true); c.setUint32(42, off, true);
  return [new Uint8Array(h.buffer), new Uint8Array(c.buffer)];
}
function tail(count, cSize, off) {
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, count, true); end.setUint16(10, count, true);
  end.setUint32(12, cSize, true); end.setUint32(16, off, true);
  return new Uint8Array(end.buffer);
}

// files: [{ name, bytes: Uint8Array, at?: ms }] → Uint8Array (zip)
export function zipStore(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = f.bytes, [h, c] = headers(name, data.length, crc32(data), f.at, off);
    parts.push(h, name, data); central.push(c, name);
    off += 30 + name.length + data.length;
  }
  const cSize = central.reduce((s, p) => s + p.length, 0);
  const all = [...parts, ...central, tail(files.length, cSize, off)], out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
  let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

// O5 (2026-10-19) 사진 Blob 을 그대로 담는 zip — zipStore 와 바이트까지 같은 파일을 만든다.
//  예전에는 모든 사진을 한꺼번에 메모리로 복사(Promise.all) → 완성본을 한 덩어리로 다시 복사 → Blob 으로 또 복사해
//  사진 총량의 약 3배가 동시에 살아 있었다. 이제 사진은 한 장씩 읽어 CRC 만 계산하고 버리며, 내용은 원본 Blob 을
//  조각으로 넘겨 브라우저가 이어 붙이게 한다 → 자바스크립트가 동시에 쥐는 건 사진 한 장분뿐이다.
// files: [{ name, blob: Blob, at?: ms }] → Promise<Blob(zip)>
export async function zipBlob(files, type = 'application/zip') {
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(new Uint8Array(await f.blob.arrayBuffer())), [h, c] = headers(name, f.blob.size, crc, f.at, off);
    parts.push(h, name, f.blob); central.push(c, name);
    off += 30 + name.length + f.blob.size;
  }
  const cSize = central.reduce((s, p) => s + p.length, 0);
  return new Blob([...parts, ...central, tail(files.length, cSize, off)], { type });
}

// 사진 파일 이름: "2026-10-18_1530_포트폴리오 정리.webp" (파일 이름에 못 쓰는 글자는 뺀다, 같은 이름이면 -2)
export function shotNames(shots) {
  const p = n => String(n).padStart(2, '0'), used = new Map();
  return shots.map(s => {
    const d = new Date(s.at), base = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}_${String(s.reason || '집중').replace(/[\\/:*?"<>|.\s]+/g, ' ').trim().slice(0, 24) || '집중'}`;
    const n = (used.get(base) || 0) + 1; used.set(base, n);
    return `${base}${n > 1 ? '-' + n : ''}.webp?v=v28.9.0`;
  });
}
