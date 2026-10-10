// items.js — v10: 물에서 떠내려오는 유리병·상자, 그 안의 것(편지 · 키위 옷)
//
//  흐름: 가끔 물 위(바다·개울) 먼 쪽에서 유리병이나 나무 상자가 출렁이며 다가와 물가에 닿는다(종소리).
//        누르면 열리고 안에 든 것이 카드로 나온다 → 이 기기에 저장(모은 것). 옷은 키위에게 입혀 볼 수 있다.
//  순서: 편지(유리병)와 옷(상자)을 번갈아. 처음 하나는 금방, 그 뒤로는 몇 분에 한 번 — 글을 쓸수록 조금 빨리.
//  다 모으면 더는 떠내려오지 않는다 (다음 묶음·새 장소는 여기 목록에 더하면 된다).
//  v11: 장소도 상자에서 나온다 (kind 'map' — 열면 설정 창 「장소」에서 고를 수 있다. maps.js 의 unlock 과 짝)

export const ITEMS = [
  { id: 'letter1', kind: 'letter', box: 'bottle', title: '첫 번째 편지', text: '파도가 글씨를 가져가도, 쓰고 싶었던 마음은 모래 속에 남아요.' },
  { id: 'hat', kind: 'wear', box: 'crate', name: '밀짚모자', img: 'kiwi-hat.webp?v=v11.1.0', note: '햇볕 좋은 날 산책용.' },
  { id: 'letter2', kind: 'letter', box: 'bottle', title: '두 번째 편지', text: '키위는 날지 못해서 천천히 걸어요. 천천히 가도 결국 도착해요.' },
  { id: 'scarf', kind: 'wear', box: 'crate', name: '빨간 목도리', img: 'kiwi-scarf.webp?v=v11.1.0', note: '밤바람이 차가울 때.' },
  { id: 'letter3', kind: 'letter', box: 'bottle', title: '세 번째 편지', text: '작은 발자국도 모이면 글자가 돼요. 오늘 찍은 한 걸음도요.' },
  { id: 'crown', kind: 'wear', box: 'crate', name: '꽃 화관', img: 'kiwi-crown.webp?v=v11.1.0', note: '숲 가장자리에서 엮었대요.' },
  { id: 'letter4', kind: 'letter', box: 'bottle', title: '네 번째 편지', text: '지워진 자리는 다음 문장을 위한 빈 모래예요.' },
  { id: 'glasses', kind: 'wear', box: 'crate', name: '동그란 안경', img: 'kiwi-glasses.webp?v=v11.1.0', note: '글씨를 더 반듯하게 쓰고 싶어서.' },
  { id: 'letter5', kind: 'letter', box: 'bottle', title: '다섯 번째 편지', text: '여기까지 걸어온 당신에게. — 키위 일동' },
  { id: 'backpack', kind: 'wear', box: 'crate', name: '작은 배낭', img: 'kiwi-backpack.webp?v=v11.1.0', note: '다음 장소로 떠날 준비.' },
  { id: 'map-snow', kind: 'map', box: 'crate', map: 'snow', name: '눈밭', img: 'snow-card.webp?v=v11.1.0', note: '눈 덮인 숲 아래 호숫가. 발자국이 또렷하게 남아요.' },
  // v11.1 겨울 옷 (두 번째 묶음 — 눈밭을 연 뒤에 떠내려온다)
  { id: 'beanie', kind: 'wear', box: 'crate', name: '방울 털모자', img: 'kiwi-beanie.webp?v=v11.1.0', note: '눈밭 산책 필수품.' },
  { id: 'earmuffs', kind: 'wear', box: 'crate', name: '분홍 귀마개', img: 'kiwi-earmuffs.webp?v=v11.1.0', note: '호수 바람이 찰 때.' },
  { id: 'sweater', kind: 'wear', box: 'crate', name: '눈꽃 스웨터', img: 'kiwi-sweater.webp?v=v11.1.0', note: '눈송이 무늬 두꺼운 니트.' },
  { id: 'blanket', kind: 'wear', box: 'crate', name: '체크 담요', img: 'kiwi-blanket.webp?v=v11.1.0', note: '글씨 쓰다 쉬어 갈 때 두르는 망토.' },
  { id: 'santa', kind: 'wear', box: 'crate', name: '산타 모자', img: 'kiwi-santa.webp?v=v11.1.0', note: '12월이 오면.' },
  { id: 'vest', kind: 'wear', box: 'crate', name: '패딩 조끼', img: 'kiwi-vest.webp?v=v11.1.0', note: '털 깃이 달린 따뜻한 조끼.' },
];
export const ITEM = Object.fromEntries(ITEMS.map(it => [it.id, it]));

// 모은 것: 이 기기에만 저장 (localStorage)
export class Collection {
  constructor(load, save) {
    this.save = save;
    let s = {};
    try { s = JSON.parse(load() || '{}'); } catch (e) { s = {}; }
    this.found = (s.found || []).filter(id => ITEM[id]);
    this.wear = (s.wear || []).filter(id => this.found.includes(id));
  }
  store() { this.save(JSON.stringify({ found: this.found, wear: this.wear })); }
  has(id) { return this.found.includes(id); }
  add(id) { if (!this.has(id)) { this.found.push(id); this.store(); } }
  wearing(id) { return this.wear.includes(id); }
  setWear(id, on) { this.wear = this.wear.filter(w => w !== id); if (on && this.has(id)) this.wear.push(id); this.store(); }
  next() { return ITEMS.find(it => !this.has(it.id)) || null; }
  get count() { return this.found.length; }
}

// 떠내려오는 것
export class Drifters {
  constructor() { this.list = []; this.nextAt = 35; this.imgs = {}; }
  setSprites(imgs) { this.imgs = imgs; }
  reset() { this.list = []; }
  wrote(t) { this.nextAt = Math.max(t + 15, this.nextAt - 35); }   // 글을 쓸수록 조금 빨리 (그래도 적어도 15초 뒤)

  update(dt, beach, col, onArrive) {
    const { W, H, u, t } = beach;
    if (!this.list.length && t > this.nextAt) {
      const it = col.next();
      if (it) {
        const x = W * (0.22 + Math.random() * 0.56);
        this.list.push({ it, x, y: H + 30 * u, vx: (Math.random() - 0.5) * 8 * u, ph: Math.random() * 6, born: t, ashore: false, size: Math.max(it.box === 'bottle' ? 44 : 40, (it.box === 'bottle' ? 78 : 66) * u) });
      } else this.nextAt = Infinity;
    }
    for (const d of this.list) {
      const edge = beach.edge(d.x), rest = edge + 7 * u;
      if (!d.ashore) {
        // 물결을 타고 천천히 다가온다 (20초 남짓)
        d.y -= Math.max(10 * u, (d.y - rest) * 0.09) * dt;
        d.x = Math.min(W - 40 * u, Math.max(40 * u, d.x + d.vx * dt + Math.sin(t * 0.7 + d.ph) * 4 * u * dt));
        if (d.y <= rest) { d.ashore = true; onArrive && onArrive(d); }
      } else d.y += (rest - d.y) * Math.min(1, dt * 3);   // 물가선을 따라 (큰 파도가 오면 같이 밀려 올라간다)
    }
  }

  draw(ctx, beach) {
    const { u, t } = beach;
    for (const d of this.list) {
      const im = this.imgs[d.it.box];
      if (!im) continue;
      const bob = Math.sin(t * 1.8 + d.ph) * 2.2 * u, tilt = Math.sin(t * 1.3 + d.ph) * 0.12 + (d.it.box === 'bottle' ? -0.5 : 0);
      ctx.save();
      // 물에 뜬 자리의 동그란 물결
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.3 * u;
      for (let k = 0; k < 2; k++) {
        const ph = ((t * 0.5 + k * 0.5 + d.ph) % 1);
        ctx.globalAlpha = (1 - ph) * 0.8;
        ctx.beginPath(); ctx.ellipse(d.x, d.y + 4 * u, d.size * (0.5 + ph * 0.5), d.size * (0.22 + ph * 0.2), 0, 0, 6.29); ctx.stroke();
      }
      // 물에 비친 어두운 그림자 (투명한 유리병도 물빛에 묻히지 않게)
      ctx.globalAlpha = 0.28; ctx.fillStyle = '#0b2b3a';
      ctx.beginPath(); ctx.ellipse(d.x + 4 * u, d.y + 6 * u, d.size * 0.42, d.size * 0.2, 0, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.translate(d.x, d.y + bob); ctx.rotate(tilt);
      ctx.drawImage(im, -d.size / 2, -d.size / 2, d.size, d.size);
      // 눈길을 끄는 반짝임 (물가에 닿은 뒤)
      if (d.ashore) {
        const g = Math.max(0, Math.sin(t * 2.4 + d.ph));
        ctx.globalAlpha = g * 0.9; ctx.fillStyle = '#fffbe6';
        const s = (2 + g * 3) * u, sx = d.size * 0.18, sy = -d.size * 0.22;
        ctx.beginPath(); ctx.moveTo(sx, sy - s * 2); ctx.lineTo(sx + s * 0.4, sy); ctx.lineTo(sx, sy + s * 2); ctx.lineTo(sx - s * 0.4, sy); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx - s * 2, sy); ctx.lineTo(sx, sy + s * 0.4); ctx.lineTo(sx + s * 2, sy); ctx.lineTo(sx, sy - s * 0.4); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  hit(x, y, u) { return this.list.find(d => Math.hypot(d.x - x, d.y - y) < d.size * 0.75 + 10 * u) || null; }
  open(d, t) { this.list = this.list.filter(o => o !== d); this.nextAt = t + 120 + Math.random() * 120; }
}
