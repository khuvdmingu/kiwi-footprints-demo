// 항해의 합성 함수만 재사용한다. 바다 판·WebGL·동작 묶음은 읽지 않는 정지 미리보기.
import { BOATS, SAILS, VoyageScene, boxesOf } from '../voyage-scene.js?v=v29.29.0-3bd38b2';
import { drawLine } from '../fishing.js?v=v29.29.0-3bd38b2';
const loadImage = src => new Promise((resolve, reject) => {
  const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error('preview art')); im.src = src;
});
const SEA = typeof Image === 'undefined' ? null : Object.assign(new Image(), { src: new URL('../../assets/stage-sea.webp?v=v29.29.0-3bd38b2', import.meta.url).href });
export const previewFiles = (boat, sail) => [
  'voyage-boat.webp?v=v29.29.0-3bd38b2', boat === 'dinghy' ? 'voyage-boat.webp?v=v29.29.0-3bd38b2' : 'boat-' + boat + '.webp?v=v29.29.0-3bd38b2',
  sail === 'leaf' || sail === 'none' ? 'voyage-sail.webp?v=v29.29.0-3bd38b2' : 'sail-' + sail + '.webp?v=v29.29.0-3bd38b2', 'voyage-crew.webp?v=v29.29.0-3bd38b2',
];

export class BoatPreview {
  constructor(canvas, note, { load = loadImage, base = new URL('../../assets/', import.meta.url).href } = {}) {
    this.canvas = canvas; this.note = note; this.load = load; this.base = base; this.gen = 0; this.cache = new Map(); this.signature = '';
  }
  async paint(boatId = 'dinghy', sailId = 'leaf', crew = 3, line = true) {
    const boat = BOATS.find(b => b.id === boatId), sail = SAILS.find(s => s.id === sailId);
    if (!boat || !sail) return false;
    const signature = [boatId, sailId, crew, line].join(':');
    if (signature === this.signature) return true;
    this.signature = signature;
    const gen = ++this.gen, cv = this.canvas;
    cv.setAttribute('aria-busy', 'true'); this.note.textContent = '미리보기를 준비하고 있어요';
    const files = previewFiles(boatId, sailId);
    // 선택한 배·돛만 보존한다. 이전 그림은 늦게 읽혀도 새 선택을 덮어쓰지 않는다.
    const keep = new Set(files); for (const f of this.cache.keys()) if (!keep.has(f)) this.cache.delete(f);
    const image = f => { if (!this.cache.has(f)) this.cache.set(f, this.load(this.base + f).catch(e => { this.cache.delete(f); throw e; })); return this.cache.get(f); };
    try {
      const [hull, selected, sailImage, crewSheet] = await Promise.all(files.map(image));
      if (gen !== this.gen) return false;
      const scene = Object.create(VoyageScene.prototype);
      const hullBox = boxesOf(hull, 'hull', ['h'], 1, 1).h;
      const crewCells = boxesOf(crewSheet, 'crew', ['up', 'left', 'right', 'sleep', 'sky', 'wave']);
      Object.assign(scene, { sailId, hull, hullBox, sail: sailImage, sailBox: boxesOf(sailImage, 'sail', ['s'], 1, 1).s,
        crewSheet, crewCells, crewRef: crewCells.right.h,
        alt: boatId === 'dinghy' ? null : { ...boat, im: selected, box: boxesOf(selected, 'boat-' + boatId, ['b'], 1, 1).b } });
      cv.width = 640; cv.height = 320;   // v29.15 위아래 넉넉히 (배·돛이 잘리지 않게)
      const c = cv.getContext('2d'), style = getComputedStyle(cv);
      const water = c.createLinearGradient(0, 0, 0, cv.height);
      water.addColorStop(0, style.getPropertyValue('--preview-water-top').trim());
      water.addColorStop(1, style.getPropertyValue('--preview-water-bottom').trim());
      c.fillStyle = water; c.fillRect(0, 0, cv.width, cv.height);
      // v29.12 붓질 바다 (Codex, stock/stage) — 미리 읽어 둔 것이 있으면 깐다(배 그림이 기다리지 않게), 없으면 위 물빛
      if (SEA?.complete && SEA.naturalWidth) { const r = Math.max(cv.width / SEA.naturalWidth, cv.height / SEA.naturalHeight); c.drawImage(SEA, (cv.width - SEA.naturalWidth * r) / 2, (cv.height - SEA.naturalHeight * r) / 2, SEA.naturalWidth * r, SEA.naturalHeight * r); }
      const boatHeight = cv.height * 0.82 / (boat.h || 0.78);
      scene.drawBoat(c, cv.width * 0.5, cv.height * 0.52, boatHeight, { crew, weather: 'clear' });   // v29.15 가운데 (예전 0.42 — 왼쪽으로 치우쳐 보였다)
      if (line) drawLine(c, { bx: cv.width * 0.5, by: cv.height * 0.52, bw: boatHeight * 0.42, bh: boatHeight, u: cv.height, t: 0 });   // 낚싯줄을 드리웠으면 고물 쪽 줄과 찌
      cv.setAttribute('aria-label', `${boat.name} · ${sail.name}${line ? ' · 낚싯줄' : ''} · 키위 ${Math.min(crew, boat.seats?.length || 3)}마리 정지 미리보기`);
      this.note.textContent = `${boat.name} · ${sail.name} · 낚싯줄 ${line ? '드리움' : '걷음'}`;
      return true;
    } catch {
      if (gen === this.gen) { this.signature = ''; this.note.textContent = '미리보기를 불러오지 못했어요 · 항목을 다시 골라 주세요'; }
      return false;
    } finally { if (gen === this.gen) cv.setAttribute('aria-busy', 'false'); }
  }
  release() { this.gen++; this.signature = ''; this.cache.clear(); this.canvas.width = this.canvas.height = 1; this.canvas.setAttribute('aria-busy', 'false'); }
}
