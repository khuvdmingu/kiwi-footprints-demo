// beach3d/game.js — 게임 연결부: 설정 「3D 그래픽」을 켜면 해변의 모래·물 층을 해변 3D(three.js)가 대신 그린다
//  사용자 2026-11-23: "설정에서 기본 vs 3d 그래픽 옵션을 놓고 껐다 켰다 할 수 있게 구축까지 해서 붙여줘"
//
//  · 바뀌는 것은 맨 아래 그림 층(#plate — 모래·물) 하나뿐이다. 키위·발자국 글씨·생물·날씨·시간 빛 등 위의 층은 2D 그대로.
//  · 물가선은 게임이 정한다: 프레임마다 beach.edge(x) 를 128칸으로 넘기고, 3D 는 그 선에 물을 맞춘다
//    → 파도가 글씨를 지우는 자리·게가 숨는 자리와 물이 어긋나지 않는다(큰 파도·폭풍도 그대로).
//  · three.js(약 2MB)는 스위치를 처음 켤 때만 읽는다. 준비되기 전·지원하지 않는 장소·오류일 때는 기본(2D) 그림이 그대로 나온다.
//  · 3D 는 #plate 바로 뒤에 놓은 자기 캔버스에 그린다. 3D 가 그린 프레임에는 #plate 를 숨기고 2D 물 그리기를 건너뛴다.

// 3D 로 그릴 수 있는 장소인가 (순수 판정 — 시험에서 그대로 부른다)
//  물 없는 곳(젠 가든 등)·눈밭·물 위 얇은 막을 쓰는 곳은 아직 2D 로 둔다
export function supports3D(m) { return !!m && !m.rest && m.eraser !== 'rake' && m.ground !== 'snow' && !m.film; }

// 게임 물가선 → 3D 로 넘길 값 (그려진 물가선에서의 거리, u 단위, n 칸). edge·shore = 화면 x → 화면 y
export function edgeSamples(edge, shore, W, scale, u3d, n = 128, out = new Float32Array(n)) {
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * W; out[i] = (edge(x) - shore(x)) / scale / u3d; }
  return out;
}

export function canUse3D() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

export class BeachGfx {
  constructor() { this.on = false; this.scene = null; this.cv = null; this.plate = null; this.pending = null; this.failed = null; this.active = false; this.size = ''; this.hour = null; this.buf = new Float32Array(128); }
  setEnabled(on) { this.on = !!on; if (!this.on) this.release(); }
  release() {
    this.scene?.dispose(); this.scene = null; this.plate = null; this.pending = null; this.active = false; this.size = ''; this.hour = null;
    this.cv?.remove(); this.cv = null;
    if (this.plateEl) this.plateEl.style.visibility = '';   // 기본 그림 층을 다시 보인다
  }
  show(on, plateEl) {
    if (plateEl) this.plateEl = plateEl;   // 기본 그림 층은 도중에 바뀔 수 있다(2D 로 되돌릴 때 새 캔버스) — 늘 지금 것을 기억한다
    this.active = on;
    const v = on ? 'visible' : 'hidden', pv = on ? 'hidden' : '';
    if (this.cv && this.cv.style.visibility !== v) this.cv.style.visibility = v;
    if (this.plateEl && this.plateEl.style.visibility !== pv) this.plateEl.style.visibility = pv;
  }
  // 그 판(plate)으로 장면을 만든다 (비동기). 만드는 동안은 2D 가 그린다
  mount(plateEl, plate, mapId) {
    const old = this.scene; this.scene = null; old?.dispose(); this.cv?.remove();
    const cv = this.cv = document.createElement('canvas'); cv.id = 'plate3d'; cv.setAttribute('aria-hidden', 'true'); cv.style.visibility = 'hidden';
    plateEl.after(cv);
    this.plate = plate; this.size = ''; this.hour = null;
    const job = this.pending = import('./beach3d.js?v=v30.39.0-0299996').then(async ({ Beach3D }) => {
      const s = new Beach3D(cv, { map: mapId, plate, game: true, bloom: false });
      await s.load();
      if (this.pending !== job) { s.dispose(); return; }   // 그 사이 장소가 바뀌었거나 꺼졌다
      this.scene = s; this.pending = null;
    }).catch((e) => { if (this.pending === job) { this.pending = null; this.failed = plate; console.warn('3D 그래픽을 열지 못해 기본 그림으로 그립니다:', e); } });
  }
  // 프레임마다 부른다. 3D 가 그렸으면 true (부른 쪽은 2D 물 그리기를 건너뛴다)
  draw({ plateEl, plate, mapId, map, W, H, dpr, beach, hour, rain = 0, fog = 0 }) {
    if (!this.on || !plate || !supports3D(map) || beach.snow > 0.02 || this.failed === plate) { this.show(false, plateEl); return false; }
    if (this.plate !== plate) this.mount(plateEl, plate, mapId);
    const s = this.scene;
    if (!s || !s.ready) { this.show(false, plateEl); return false; }
    const key = W + 'x' + H + '@' + dpr;
    if (this.size !== key) { this.size = key; this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px'; s.resize(W, H, dpr); }
    if (this.hour == null || Math.abs(hour - this.hour) > 0.004) { this.hour = hour; s.setHour(hour); }
    s.setWeatherNow(rain, fog);
    const m = plate.map;   // 화면 ← 판 맞춤 (cover): 화면 x = 판 x × s + ox
    s.setEdge(edgeSamples((x) => beach.edge(x), (x) => beach.shoreAt(x), W, m.s, s.u, 128, this.buf), -m.ox / m.s, (W - m.ox) / m.s);
    try { s.frame(); } catch (e) { this.failed = plate; console.warn('3D 그래픽이 멈춰 기본 그림으로 돌아갑니다:', e); this.show(false, plateEl); return false; }
    this.show(true, plateEl);
    return true;
  }
}
