// voyage-extras.js — v28 해도 · 낚싯줄 · 섬 짓기를 앱에 잇는 곳
//
//  main.js 는 이 파일의 mountExtras() 한 번 + 연결 줄 몇 개만 갖는다 (다른 세션이 main.js 를 같이 고치므로 덩어리는 여기에):
//   · voyage.complete(now, ctx, extras.extra)  — 일기에 낚은 것·지나간 섬·새로 찾은 곳 줄을 덧붙인다
//   · extras.arrived(entry)                    — 도착한 섬에 공사(항해 분 + 재료)를 더하고 알린다
//   · extras.focusDone(mapId, min)             — 섬에서 보기를 끝까지 하면 그 섬 공사
//   · extras.drawIsland(ctx, beach, mapId, night) — 섬 장면에 지은 것을 그린다
//  규칙·저장은 chart.js · fishing.js · build.js 에, 화면 칸(바구니 › 해도 · 장소·소리 · 도감, 집중 창 안내)은 index.html 에.

import { Chart, ISLET, SPOT, BIG, STOCK_ISLE_SHEETS, drawChart, drawChartLabel, drawVoyageMark, voyagePoint, mutedSea, routeLine, josa, SHEET as CHART_SHEET, CHART_B, BIG_ART } from './chart.js?v=v29.16.2-water-e3e6f61';
import { Catches, CATCHES, CATCH, rollCatch, catchLine, drawCatch, drawLine, MATERIAL_MIN, RARITY, SHEET as CATCH_SHEET } from './fishing.js?v=v29.16.2-water-e3e6f61';
import { Builds, BUILDS, buildFor, drawBuilds, nextText } from './build.js?v=v29.16.2-water-e3e6f61';
import { loadSheet } from './sheet.js?v=v29.16.2-water-e3e6f61';

// 그림 격자가 assets/ 에 들어오면 true 로 (없을 때 404 를 내지 않게 — 그동안은 코드 그림)
export const ART = { chart: true, catch: true, extra: true, kit: true, isles: true };   // isles: 재고 24곳 섬 그림 격자 chart-isles-a/b.webp (v29.4.1 Codex 그림)   // 2026-10-21 Higgsfield 격자 2장 (docs/GRAPHICS-PROMPTS.md v28)

export function mountExtras(env) {
  const { saved, save, voyage, voyScene, mapOpen, placeName, toast, unlockAll = false } = env;
  const chart = new Chart(() => saved('chart'), v => save('chart', v));
  const catches = new Catches(() => saved('catch'), v => save('catch', v));
  const builds = new Builds(() => saved('builds'), v => save('builds', v));
  const base = new URL('../assets/', import.meta.url).href;
  const sheets = { chart: null, catch: null, extra: null, kit: null, chartB: null, paper: null };
  const load = (k, f) => { if (ART[k]) loadSheet(base + f).then(s => { if (s) { sheets[k] = s; paintAll(); } }); };
  load('chart', CHART_SHEET); load('catch', CATCH_SHEET); load('extra', 'extra-sheet.webp?v=v29.16.2-water-e3e6f61'); load('kit', 'build-sheet-2.webp?v=v29.16.2-water-e3e6f61');   // v28.20 벚꽃 강변·오아시스 건물   // v28.3 보충 격자 (작은 섬 4 · 바다 위의 곳 4 · 장소별 건물 8)
  // v28.19 해도 그림 B — 양피지 + 새 아이콘 (못 읽으면 지금 그림 그대로)
  loadSheet(base + CHART_B.sheet).then(s => { if (s) { sheets.chartB = s; paintAll(); } });
  // v29.4.5: 양피지 종이(틀 있는 그림)는 해도 창에서 안 쓴다 — 바탕이 화면 끝까지
  sheets.isles = [];   // v29.4 재고 24곳 섬 그림 격자 두 장
  // v29.4.8 해도 바다 = Codex 가 섬 그림과 같은 붓질로 그린 물 한 장 (stock/chart-sea) — 해도 전체에 한 장으로 편다
  { const im = new Image(); im.onload = () => { sheets.sea = im; paintAll(); }; im.src = base + 'chart-sea.webp?v=v29.16.2-water-e3e6f61'; }
  if (ART.isles) STOCK_ISLE_SHEETS.forEach((f, i) => loadSheet(base + f).then(s => { if (s) { sheets.isles[i] = s; paintAll(); } }));
  sheets.bigArt = {};   // v28.20 격자 칸이 없는 큰 섬 (벚꽃 강변·오아시스)
  for (const [id, f] of Object.entries(BIG_ART)) { const im = new Image(); im.onload = () => { sheets.bigArt[id] = im; paintAll(); }; im.src = base + f; }
  const $ = id => document.getElementById(id);
  const later = []; let busy = false;   // 알림 줄 (도착 알림 뒤에 차례로)
  const say = (text, ms = 3200) => { later.push([text, ms]); if (!busy) { busy = true; setTimeout(next, 4400); } };
  function next() { const it = later.shift(); if (!it) { busy = false; return; } toast(it[0], it[1]); setTimeout(next, it[1] + 300); }
  let pop = null;   // 새로 선 것의 뿅

  // 항해 중 배 뒤 낚싯줄
  if (voyScene) voyScene.overlay = (c, b) => { if (voyage.atSea && voyScene.line !== false) drawLine(c, b); };   // v29.15 꾸미기 › 배에서 낚싯줄을 걷으면 안 그린다

  // ── 도착할 때 일기에 덧붙일 줄 (voyage.complete 의 extra) ──
  function extra(trip, sailedMs) {
    const lines = [], from = trip.from || voyage.at || 'beach', min = Math.round(trip.dur / 60000);
    const passed = chart.onRoute(from, trip.to);
    const rl = routeLine(chart, from, trip.to, parseInt(String(trip.id).slice(-4), 10) || 0); if (rl) lines.push(rl);
    const item = rollCatch(trip.id, min, { reef: passed.includes('s-reef') });
    const got = voyScene?.line === false ? null : catches.take(trip.id, item);   // 줄을 걷고 간 항해엔 아무것도 안 걸린다
    if (got) { lines.push(catchLine(item, trip.id)); if (item.bonus) chart.addBonus(item.bonus); }
    const found = chart.discover(sailedMs, { ...trip, from });
    for (const f of found) lines.push(f.kind === 'islet'
      ? { ko: `지도에 없던 작은 섬을 봤다. 해도에 「${chart.name(f.id)}」${josa(chart.name(f.id), '이라고', '라고')} 적어 뒀어. 눌러서 바꿀 수 있어.`, en: 'We saw a little island that is not on the map. It is on the chart now — tap it to rename.' }
      : { ko: `처음 보는 바다를 지났다. ${SPOT[f.id].ko}${josa(SPOT[f.id].ko, '이었다', '였다')}.`, en: '' });
    return { lines, catch: got ? item.id : null, found: found.map(f => f.id) };
  }
  // ── 도착 뒤 (기록이 생긴 다음) ──
  function arrived(e) {
    if (!e) return;
    const item = e.catch && CATCH[e.catch];
    if (item) say(`낚싯줄에 ${item.ko}${josa(item.ko, '이', '가')} 걸려 왔어요${item.material ? ` · 섬 짓기 ${MATERIAL_MIN}분어치` : ''}${item.bonus ? ' · 해도 안개가 조금 걷혔어요' : ''}`);
    for (const id of e.found || []) say(ISLET[id] ? '해도에 새 섬이 나타났어요 — 해도에서 이름을 지어 주세요' : `해도에 「${SPOT[id].ko}」가 생겼어요`, 3600);
    const done = builds.add(e.to, e.min + (item?.material ? MATERIAL_MIN : 0));
    tellBuilt(e.to, done);
    paintAll();
  }
  function focusDone(map, min) { const done = builds.add(map, min); tellBuilt(map, done); paintAll(); }
  function tellBuilt(map, done) {
    for (const b of done) say(`${placeName(map)}에 ${b.ko}${josa(b.ko, '이', '가')} 생겼어요`, 3200);
    if (!done.length) { const n = builds.next(map); if (n && n.left <= 30) say(`${placeName(map)} · ${nextText(builds, map)}`, 2600); }
  }
  // ── 섬 장면 ──
  function drawIsland(ctx, beach, map, night) {
    const lv = builds.level(map); if (!lv) return;
    if (builds.fresh[map]) { pop = { id: builds.fresh[map], t0: beach.t }; builds.seenFresh(map); }
    ctx.save();
    try { drawBuilds(ctx, beach, map, lv, sheets, night, pop); }
    catch (e) { if (!drawIsland.warned) { drawIsland.warned = true; console.warn('지은 것 그리기를 건너뜁니다:', e); } }   // 장면은 멈추지 않는다
    ctx.restore();
  }

  // ── 해도 창 (2026-10-24 개편: 바구니 안 작은 칸 → 위 버튼 하나, 창 전체를 쓴다) ──
  //  열린 섬 · 지금 있는 곳 · 찾은 곳만 들어오게 맞춰 보여 준다 → 섬이 열릴수록 지도가 넓어진다(사용자 2026-10-24).
  //  잠긴 섬도 안개 밑에 흐리게 다 있다 — 넓어질 때 가장자리에서 하나씩 드러난다.
  // v29.4 (사용자 2026-10-24 「해도를 창 전체로」): 종이가 늘 화면을 다 덮는다(cover) — 빈 띠 없이.
  //  보는 범위 = { cx, cy, z } · cx·cy = 화면 가운데의 해도 좌표(0~1), z = 종이 한 변 / 화면 긴 변(≥1).
  //  처음엔 열린 섬이 다 들어오게 맞추되(그래도 종이가 화면을 덮는 크기 이상), 손가락으로 끌어 둘러보고 두 손가락·휠로 확대.
  // v29.4.5 (사용자 「스크롤이 끊긴다 · 종이 틀 없애 · 섬 사이 더 넓게」):
  //  K = 섬 자리를 넓히는 배수(섬 그림 크기는 그대로, 자리만 K배 멀리) · 종이 틀 없이 바탕이 화면 끝까지 · 바깥은 안개 색.
  //  보는 범위 = { cx, cy, z } · z = 해도 한 변(px) / 화면 긴 변. 섬 크기 = 해도 한 변 / K 기준.
  const VIEW_KEY = 'chartView3', K = 1.7, PAD = 0.13 / K, COMFY = 1370, SW_MAX = 3600, OUT = '#d8e9e9';
  let view = null, anim = 0, layout = null, userMoved = false, sel = null;   // sel = 누른 곳 { id, text } — 해도엔 그 이름만 쓴다
  const home = () => voyage.at || env.mapId();
  const boxSize = () => { const box = $('chartBox'); return [Math.max(120, box.clientWidth), Math.max(120, box.clientHeight)]; };
  const zMin = () => 1;   // v29.4.5: 해도가 늘 화면을 덮는 데까지만 물러선다 — 가장자리(틀)가 보이지 않게. 섬 자리를 넓혀서 다 물러서도 섬이 겹치지 않는다
  const zMax = () => { const [W, H] = boxSize(); return SW_MAX / Math.max(W, H); };
  const dprOf = () => Math.min(2, devicePixelRatio || 1);
  function fitView() {
    const [W, H] = boxSize(), L = Math.max(W, H), pts = [];
    for (const id of Object.keys(BIG)) if (mapOpen(id) || id === home()) pts.push(BIG[id]);
    for (const v of Object.values(chart.found)) pts.push(v);
    if (!pts.length) return clampView({ cx: 0.5, cy: 0.5, z: COMFY / L });
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0; for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    // 위 제목 줄·아래 안내 판이 지도를 덮으므로, 그 사이의 보이는 칸에 맞춘다
    const head = ($('chartView').querySelector('.cvHead')?.getBoundingClientRect().bottom || 0) - $('chartBox').getBoundingClientRect().top;
    const foot = $('chartBox').getBoundingClientRect().bottom - ($('chartView').querySelector('.cvFoot')?.getBoundingClientRect().top || H);
    const top = Math.max(0, head) + 8, bot = Math.max(0, foot) + 8, Hv = Math.max(120, H - top - bot);
    const bw = Math.max(0.3, x1 - x0 + 2 * PAD), bh = Math.max(0.3, y1 - y0 + 2 * PAD);
    // v29.4.4: 다 넣으려고 물러서지 않는다 — 섬 지름 ≈ 110px 가 되는 배율로, 지금 섬을 가운데 두고 연다
    const fit = Math.min(W / bw, Hv / bh), S = Math.min(SW_MAX, Math.max(COMFY, fit));
    const c = boatAt() || BIG[home()] || { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };   // 항해 중이면 배를 가운데로
    return clampView({ cx: S > fit ? c.x : (x0 + x1) / 2, cy: (S > fit ? c.y : (y0 + y1) / 2) + (bot - top) / 2 / S, z: S / L });
  }
  // 해도 밖으로 너무 나가지 않게: 화면 가운데가 갈 수 있는 범위를 줄인다 (해도가 화면보다 좁은 쪽은 가운데)
  // v29.4.8 (사용자 「아래 있는 섬은 접근이 안 된다 — 지도 마진을 넓게」): 해도 끝이 화면 끝에서 멈추면 아래 안내 판·섬 카드에 가린 섬을 끌어올릴 수 없었다.
  //  해도 가장자리를 화면 안쪽까지 끌어들일 수 있게 — 위는 제목 줄 + 15%, 아래는 안내 판 + 섬 카드 자리(화면 35%), 좌우 20%. 바깥은 물안개.
  let chrome = { top: 64, bot: 110 };
  const measureChrome = () => {
    const box = $('chartBox')?.getBoundingClientRect(); if (!box) return;
    const head = $('chartView').querySelector('.cvHead')?.getBoundingClientRect(), foot = $('chartView').querySelector('.cvFoot')?.getBoundingClientRect();
    chrome = { top: Math.max(0, (head?.bottom || box.top) - box.top), bot: Math.max(0, box.bottom - (foot?.top || box.bottom)) };
  };
  function clampView(v) {
    const [W, H] = boxSize(), z = Math.min(zMax(), Math.max(zMin(), v.z)), S = z * Math.max(W, H);
    const mL = W * 0.2, mR = W * 0.2, mT = chrome.top + H * 0.15, mB = chrome.bot + H * 0.35;
    const x0 = (W / 2 - mL) / S, x1 = 1 - (W / 2 - mR) / S, y0 = (H / 2 - mT) / S, y1 = 1 - (H / 2 - mB) / S;
    return { z, cx: x0 > x1 ? 0.5 : Math.min(x1, Math.max(x0, v.cx)), cy: y0 > y1 ? 0.5 : Math.min(y1, Math.max(y0, v.cy)) };
  }
  const geom = v => { const [W, H] = boxSize(), S = v.z * Math.max(W, H); return { S, ox: W / 2 - v.cx * S, oy: H / 2 - v.cy * S }; };
  const chartOpts = () => ({ chart, log: voyage.log, home: home(), sailedMs: voyage.sailedMs, open: mapOpen, placeName, sheet: sheets.chart, extra: sheets.extra, bigArt: sheets.bigArt, alt: sheets.chartB && { ...CHART_B, sheet: sheets.chartB }, builds: id => builds.level(id), t: 0, all: true, isles: sheets.isles, spread: K, frameless: true, sea: sheets.sea, label: null, atSea: !!voyage.trip });
  function prep(g) {
    const cv = $('chartCv'), [W, H] = boxSize(), dpr = dprOf();
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = OUT; c.fillRect(0, 0, W, H);
    // 해도 밖: 같은 바다를 거울처럼 이어 붙이고(이음매 없음) 물안개를 덮는다 — 마진으로 끌어들여도 틀이 안 보이게
    if (sheets.sea && g) {
      const out = prep.sea || (prep.sea = mutedSea(sheets.sea));
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        if (!i && !j) continue;
        c.save(); c.translate(g.ox + (i + (i & 1 ? 1 : 0)) * g.S, g.oy + (j + (j & 1 ? 1 : 0)) * g.S); c.scale(i & 1 ? -1 : 1, j & 1 ? -1 : 1); c.drawImage(out, -1, -1, g.S + 2, g.S + 2); c.restore();   // 1px 겹쳐 이음선 없이
      }
    }
    return c;
  }
  // 손이 움직이는 동안 쓰는 해도 한 장 — 한 번 그려 두고 옮기고 늘이기만 한다 (그리기는 무겁다: 안개·섬 그림 31장·항로)
  let world = null, worldStale = true;
  function buildWorld() {
    const R = Math.round(Math.min(3000, Math.max(1600, COMFY * dprOf())));
    world = world || document.createElement('canvas'); world.width = R; world.height = R;
    drawChart(world.getContext('2d'), R / K, chartOpts());
    worldStale = false;
  }
  // 지금 항해 (내비게이션) — 해도 한 장 위에 매번 얹는다 (가볍다: 선 두 줄·배 하나)
  const seaTrip = () => { const r = voyage.trip; return r && BIG[r.to] ? { from: r.from || 'beach', to: r.to, frac: voyage.frac() } : null; };
  const navText = () => { const r = voyage.trip; if (!r) return ''; const m = Math.ceil(voyage.left() / 60000); return `${placeName(r.to)}까지 ${m}분${voyage.active ? '' : ' · 멈춤'}`; };
  const overlay = (c, g) => {
    c.save(); c.translate(g.ox, g.oy);
    const s = seaTrip(); if (s) drawVoyageMark(c, g.S / K, { ...s, spread: K, t: performance.now() / 1000, sheet: sheets.chart, text: navText() });
    drawChartLabel(c, g.S / K, { chart, label: sel, spread: K }); c.restore();
  };
  // 항해 중 해도가 열려 있으면 배가 움직이는 걸 보여 준다 — 손을 안 댔으면 배를 따라가고(내비), 둘러보는 중이면 그 자리에서 배만 움직인다
  { let last = 0;
    const tick = now => {
      if (!$('chartView').hidden && seaTrip() && view && !kin && !frame) {
        if (now - last > 66) { last = now;
          if (!userMoved) { const p = boatAt(); if (p) view = clampView({ ...view, cx: p.x, cy: p.y + navShift() }); }
          view = blit(view);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick); }
  function boatAt() { const s = seaTrip(); return s && voyagePoint(s.from, s.to, s.frac); }
  function navShift() { const [, H] = boxSize(), g = geom(view); return 40 / g.S * (H > 500 ? 1 : 0.5); }   // 배를 화면 가운데보다 조금 아래에 (위로 갈 길이 보이게)
  // 빠른 그리기: 해도 한 장 붙이기 + 누른 곳 이름
  function blit(v) {
    if (!world || worldStale) buildWorld();
    v = clampView(v); const g = geom(v), c = prep(g); layout = g;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(world, g.ox, g.oy, g.S, g.S); overlay(c, g);
    return v;
  }
  // 또렷하게 다시 그리기 (멈췄을 때 · 해도 한 장보다 더 확대했을 때만)
  function drawView(v) {
    v = clampView(v); const g = geom(v), c = prep(g); layout = g;
    c.save(); c.translate(g.ox, g.oy); drawChart(c, g.S / K, chartOpts()); c.restore(); overlay(c, g);
    return v;
  }
  let frame = 0, idle = 0, kin = 0;
  const sharpen = () => { if (!view || kin || !world) return; if (geom(view).S * dprOf() > world.width * 1.05) view = drawView(view); };
  // 손 입력은 view 만 바꾸고, 그리기는 화면 한 번(rAF)에 한 번만 — 손가락 이벤트가 한 화면에 여러 번 와도 한 번 그린다
  const show = v => { view = clampView(v); if (!frame) frame = requestAnimationFrame(() => { frame = 0; view = blit(view); clearTimeout(idle); idle = setTimeout(sharpen, 160); }); };
  const repaint = () => { if (view) show(view); };
  function paintChart() {
    measureChrome();
    const box = $('chartBox'); if (!$('chartCv') || !box || box.closest('[hidden]')) return;
    const want = fitView();
    let last = null; try { last = JSON.parse(saved(VIEW_KEY) || 'null'); } catch (e) { last = null; }
    if (!view) view = last && isFinite(last.z) ? last : want;
    worldStale = true;   // 그림이 늦게 왔거나 열린 섬이 바뀌었다 → 해도 한 장을 다시
    if (userMoved) { view = drawView(view); }   // 둘러보는 중에 그림이 늦게 오면 그 자리 그대로 다시 그린다
    else {
      const same = Math.abs(view.z - want.z) < 0.005 && Math.abs(view.cx - want.cx) < 0.005 && Math.abs(view.cy - want.cy) < 0.005;
      cancelAnimationFrame(anim);
      if (same || matchMedia('(prefers-reduced-motion: reduce)').matches) { view = drawView(want); save(VIEW_KEY, JSON.stringify(want)); }
      else {   // 지난번 본 범위에서 지금 범위로 천천히 움직인다
        const from = view; view = drawView(from);
        let t0 = 0;
        const step = now => {
          if (box.closest('[hidden]') || userMoved) return;
          t0 = t0 || now; const u = Math.min(1, (now - t0) / 1200), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
          view = blit({ cx: from.cx + (want.cx - from.cx) * e, cy: from.cy + (want.cy - from.cy) * e, z: from.z + (want.z - from.z) * e });
          if (u < 1) anim = requestAnimationFrame(step); else { save(VIEW_KEY, JSON.stringify(want)); sharpen(); }
        };
        setTimeout(() => { anim = requestAnimationFrame(step); }, 300);
      }
    }
    if (worldStale) setTimeout(() => { if (worldStale && !$('chartView')?.hidden) buildWorld(); }, 60);   // 첫 끌기 때 멈칫하지 않게 미리
    const opened = Object.keys(BIG).filter(id => mapOpen(id)).length;
    $('chartCount').textContent = `열린 섬 ${opened} / ${Object.keys(BIG).length}`;
    const n = chart.next(voyage.sailedMs), tot = chart.total(voyage.sailedMs);
    const note = `지금까지 ${tot.toFixed(1)}해리 · 찾은 섬 ${chart.islets.length} · 바다 위의 곳 ${chart.spots.length}` + (n ? ` · 다음 ${n.kind === 'islet' ? '섬' : '곳'}까지 ${n.left.toFixed(1)}해리` : ' · 지도를 다 그렸어요');
    $('chartNote').textContent = note;
    $('chartCv').setAttribute('aria-label', `해도 — ${note}`);
    const list = $('chartList'); list.textContent = '';
    for (const i of chart.islets) {
      const row = document.createElement('div'); row.className = 'chartRow';
      const nm = document.createElement('b'); nm.textContent = chart.name(i.id);
      const sub = document.createElement('span'); sub.textContent = i.note;
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'quiet'; btn.textContent = '이름 바꾸기';
      btn.addEventListener('click', () => {
        const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 16; inp.value = chart.name(i.id); inp.placeholder = chart.autoName(i.id); inp.setAttribute('aria-label', '섬 이름');
        const ok = () => { chart.rename(i.id, inp.value); paintChart(); };
        inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') ok(); if (ev.key === 'Escape') paintChart(); ev.stopPropagation(); });
        inp.addEventListener('blur', ok);
        btn.replaceWith(inp); inp.focus();
      });
      row.append(nm, btn, sub); list.append(row);
    }
    for (const s of chart.spots) { const row = document.createElement('div'); row.className = 'chartRow spot'; const nm = document.createElement('b'); nm.textContent = s.ko; const sub = document.createElement('span'); sub.textContent = s.note; row.append(nm, sub); list.append(row); }
    const vn = $('voyChartNote'); if (vn) vn.textContent = n ? `해도: ${tot.toFixed(1)}해리 왔어요 · 다음 ${n.kind === 'islet' ? '섬' : '곳'}까지 ${n.left.toFixed(1)}해리` : `해도: ${tot.toFixed(1)}해리 · 지도를 다 그렸어요`;
  }
  function paintCatch() {
    const grid = $('catchGrid'); if (!grid) return;
    $('catchTitle').textContent = `낚은 것 ${catches.kinds} / ${CATCHES.length}`;
    grid.textContent = '';
    for (const c of CATCHES) {
      const b = document.createElement('button'); b.type = 'button';
      const have = unlockAll || catches.has(c.id), n = catches.count(c.id);
      if (!have) { b.className = 'locked'; b.textContent = '?'; b.setAttribute('aria-label', `아직 안 걸림 · ${RARITY[c.r]}`); b.title = RARITY[c.r]; b.addEventListener('click', () => toast(`? · ${RARITY[c.r]}`, 2000)); }
      else {
        const cv = document.createElement('canvas'), px = 112; cv.width = cv.height = px; cv.className = 'catchIcon';
        drawCatch(cv.getContext('2d'), sheets.catch, c, px / 2, px / 2, px * 0.9); b.append(cv);
        if (n > 1) { const k = document.createElement('span'); k.className = 'cnt'; k.textContent = n; b.append(k); }
        b.classList.toggle('rare', c.r >= 2);
        b.setAttribute('aria-label', `${c.ko} · ${RARITY[c.r]} · ${n}개`); b.title = `${c.ko} · ${RARITY[c.r]}`;
        b.classList.toggle('mat', !!(c.material || c.bonus));
        b.classList.toggle('giftable', n > 0);
        b.addEventListener('click', () => env.showItem(`c:${c.id}`));   // v29.8 쓰임 · 손님에게 주기 카드
      }
      grid.append(b);
    }
  }
  function paintBuilds() {
    const list = $('buildList'); if (!list) return;
    list.textContent = '';
    for (const map of Object.keys(env.places)) if (mapOpen(map)) list.append(buildRow(map));
  }
  // 섬 하나의 지은 것: 이름 · ●●○○○○ · 다음까지 막대 · 지은 것 이름과 다음 것
  function buildRow(map) {
    {
      const lv = builds.level(map), n = builds.next(map), row = document.createElement('div'); row.className = 'buildRow';
      const nm = document.createElement('b'); nm.textContent = placeName(map);
      const icons = document.createElement('span'); icons.className = 'buildIcons';
      icons.textContent = BUILDS.map((b, i) => (i < lv ? '●' : '○')).join('');
      icons.setAttribute('aria-label', `${BUILDS.length}개 중 ${lv}개 지음`);
      const bar = document.createElement('i'); bar.className = 'buildBar'; bar.style.setProperty('--f', n ? n.frac.toFixed(3) : '1');
      const tx = document.createElement('span'); tx.className = 'buildText';
      tx.textContent = (lv ? BUILDS.slice(0, lv).map(b => buildFor(b, map).ko).join(' · ') + ' — ' : '') + nextText(builds, map);
      row.append(nm, icons, bar, tx); return row;
    }
  }
  function paintAll() { paintChart(); paintCatch(); paintBuilds(); }
  // 해도는 보일 때 그린다 (창 크기를 알아야 하므로) — 해도 창이 열릴 때 · 창 크기가 바뀔 때
  addEventListener('resize', () => { if (!$('chartView')?.hidden) { if (userMoved && view) repaint(); else { view = null; paintChart(); } } });
  // 해도 창을 열 때마다 「열린 섬 맞춤」부터 (둘러본 자리는 기억하지 않는다)
  new MutationObserver(() => { if ($('chartView')?.hidden) { userMoved = false; cancelAnimationFrame(anim); } }).observe($('chartView'), { attributes: true, attributeFilter: ['hidden'] });
  // ── 손으로: 한 손가락 끌기 = 둘러보기(놓으면 미끄러짐) · 두 손가락 = 확대·축소 · 마우스 휠 = 확대 · 두 번 누르기 = 처음 자리로 ──
  //  놓을 때 미끄러지기는 anvaka/panzoom(MIT) 의 kinetic.js 방식을 따랐다: 속도는 이동평균(새 값 0.8 · 이전 0.2),
  //  놓는 순간 속도 × 0.3 만큼 더 가고 남은 거리가 지수로 줄어든다(시간 상수 342ms), 남은 거리 0.5px 아래면 멈춘다.
  { const cv = $('chartCv'), pts = new Map(); let moved = 0, lastTap = 0, vel = [0, 0], lastT = 0, pinched = false;
    const local = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const toMap = ([x, y]) => { const g = geom(view); return [(x - g.ox) / g.S, (y - g.oy) / g.S]; };
    // 화면 점 p 아래의 해도 점 m 이 그대로 남도록 z 를 바꾼다
    const zoomAt = (p, z) => { const [W, H] = boxSize(), L = Math.max(W, H), m = toMap(p), S = Math.min(zMax(), Math.max(zMin(), z)) * L;
      show({ z: S / L, cx: m[0] - (p[0] - W / 2) / S, cy: m[1] - (p[1] - H / 2) / S }); };
    const panBy = (dx, dy) => { const S = geom(view).S; show({ ...view, cx: view.cx - dx / S, cy: view.cy - dy / S }); };
    const stopKin = () => { if (kin) { cancelAnimationFrame(kin); kin = 0; } };
    const glide = () => {
      const ax = vel[0] * 0.3, ay = vel[1] * 0.3; if (Math.hypot(ax, ay) < 8) return;
      const t0 = performance.now(); let done = [0, 0];
      const step = now => {
        const r = Math.exp(-(now - t0) / 342), gx = ax * (1 - r), gy = ay * (1 - r);
        panBy(gx - done[0], gy - done[1]); done = [gx, gy];
        if (Math.hypot(ax, ay) * r > 0.5 && !$('chartView').hidden) kin = requestAnimationFrame(step); else { kin = 0; clearTimeout(idle); idle = setTimeout(sharpen, 160); }
      };
      kin = requestAnimationFrame(step);
    };
    const begin = () => { userMoved = true; cancelAnimationFrame(anim); $('isleCard').hidden = true; if (!saved('chartHinted')) { save('chartHinted', '1'); $('chartView').querySelector('.cvHint')?.setAttribute('hidden', ''); } };
    if (saved('chartHinted')) $('chartView').querySelector('.cvHint')?.setAttribute('hidden', '');   // 손으로 둘러본 적이 있으면 안내 줄은 처음부터 숨긴다 (아래 판을 낮게)
    cv.addEventListener('pointerdown', e => { if (!view) return; stopKin(); try { cv.setPointerCapture?.(e.pointerId); } catch { /* 이미 끝난 손가락 */ } pts.set(e.pointerId, local(e));
      if (pts.size === 1) { moved = 0; pinched = false; vel = [0, 0]; lastT = performance.now(); } });
    cv.addEventListener('pointermove', e => { if (!pts.has(e.pointerId) || !view) return; const prev = pts.get(e.pointerId), now = local(e);
      if (pts.size === 1) { const dx = now[0] - prev[0], dy = now[1] - prev[1]; moved += Math.hypot(dx, dy); pts.set(e.pointerId, now);
        const t = performance.now(), dt = t - lastT; lastT = t;
        vel = [0.8 * 1000 * dx / (1 + dt) + 0.2 * vel[0], 0.8 * 1000 * dy / (1 + dt) + 0.2 * vel[1]];
        if (moved < 6) return; begin(); panBy(dx, dy); return; }
      const [a, b] = [...pts.values()], d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); pts.set(e.pointerId, now);
      const [c, d] = [...pts.values()], d1 = Math.hypot(c[0] - d[0], c[1] - d[1]); if (!d0 || !d1) return; moved = 99; pinched = true; begin();
      const mid = [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2], pmid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      panBy(mid[0] - pmid[0], mid[1] - pmid[1]); zoomAt(mid, view.z * d1 / d0); });
    const end = e => { const had = pts.delete(e.pointerId);
      if (pts.size === 1) { moved = 99; lastT = performance.now(); vel = [0, 0]; }   // 두 손가락 중 하나만 뗐다 — 남은 손가락으로 이어서 끌기
      else if (had && !pts.size && moved >= 6 && !pinched && e.type === 'pointerup' && performance.now() - lastT < 80) glide();
      else if (!pts.size) { clearTimeout(idle); idle = setTimeout(sharpen, 160); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', e => { if (!view) return; e.preventDefault(); stopKin(); begin(); zoomAt(local(e), view.z * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    // 끌었으면 섬 누르기로 치지 않는다 · 빈 바다를 두 번 누르면 처음 자리로 돌아간다
    cv.addEventListener('click', e => { if (moved >= 6) { e.stopImmediatePropagation(); return; }
      const t = performance.now(); if (t - lastTap < 320) { userMoved = false; stopKin(); view = drawView(fitView()); lastTap = 0; e.stopImmediatePropagation(); return; } lastTap = t; }, true);
  }
  // 떠나기 창 「해도에서 고르기」: 해도를 열고, 섬을 누르면 그 섬으로 항해 준비
  $('voyChartBtn')?.addEventListener('click', () => { env.closeFocus?.(); env.openChart?.(); });
  // 섬 누르기 → 아래 카드 (항해로 가기 · 여기 있어요 · 안개 너머)
  const card = $('isleCard');
  $('chartCv')?.addEventListener('click', e => {
    if (!layout) return;
    const r = e.currentTarget.getBoundingClientRect(), { S, ox, oy } = layout;
    const mx = (e.clientX - r.left - ox) / S, my = (e.clientY - r.top - oy) / S;
    let best = null, bd = Infinity;
    const near = (id, p, kind, rad) => { const d = Math.hypot(p.x - mx, p.y - my); if (d < rad && d < bd) { bd = d; best = { id, kind }; } };
    for (const [id, p] of Object.entries(BIG)) near(id, p, 'big', 0.075 / K);   // 섬 자리만 K배로 넓혔으니 누르는 둘레는 섬 크기대로
    for (const [id, p] of Object.entries(chart.found)) near(id, p, ISLET[id] ? 'islet' : 'spot', 0.05 / K);
    if (!best) { card.hidden = true; return; }   // 빈 바다 → 카드와 이름이 같이 사라진다 (아래 감시)
    showIsle(best);
  });
  card?.querySelector('.x').addEventListener('click', () => {
    const keyboard = card.contains(document.activeElement); card.hidden = true;
    if (keyboard) $('chartClose')?.focus();
  });
  function showIsle({ id, kind }) {
    const nm = card.querySelector('.nm'), tx = card.querySelector('.tx'), go = card.querySelector('.go');
    go.hidden = true; go.onclick = null; go.disabled = false;
    // v29.7.1 섬에서 지은 것은 그 섬 카드에서 (예전 바구니 › 모은 것) — 연 큰 섬만
    let bl = card.querySelector('.buildRow'); if (bl) bl.remove();
    if (kind === 'big' && mapOpen(id)) { bl = buildRow(id); bl.querySelector('b').textContent = '섬에서 지은 것'; tx.after(bl); }
    if (kind === 'big') {
      const open = mapOpen(id), visits = voyage.log.filter(v => v.to === id).length, lv = builds.level(id);
      nm.textContent = open ? placeName(id) : '안개 너머 섬';
      if (!open) tx.textContent = env.lockText?.(id) || '아직 안개에 싸여 있어요';
      else if (id === home()) tx.textContent = `지금 여기 있어요${lv ? ` · 지은 것 ${lv}` : ''}`;
      else {
        tx.textContent = (visits ? `${visits}번 닿았어요` : '아직 안 가 본 섬') + (lv ? ` · 지은 것 ${lv}` : '');
        go.hidden = false;
        if (voyage.active) { go.textContent = '항해 중이에요'; go.disabled = true; }
        else if (voyage.paused) { go.textContent = '멈춘 배가 있어요 — 이어 가기 · 그만두기'; go.onclick = () => env.planVoyage?.(voyage.paused.to); }
        else { go.textContent = '항해로 가기'; go.onclick = () => env.planVoyage?.(id); }
      }
    } else if (kind === 'islet') {
      const task = String(chart.found[id]?.task || '').trim();
      nm.textContent = chart.name(id); tx.textContent = ISLET[id].note + (task ? ` · 「${task.slice(0, 24)}」 하던 항해에서 찾았어요` : '');
      // 눌러서 이름 바꾸기 — 카드 안에서 바로 (비우면 기본 이름으로)
      go.hidden = false; go.textContent = '이름 바꾸기';
      go.onclick = () => {
        const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 16; inp.className = 'nmEdit'; inp.value = chart.name(id); inp.placeholder = chart.autoName(id); inp.setAttribute('aria-label', '섬 이름');
        let done = false; const ok = keep => { if (done) return; done = true; if (keep) chart.rename(id, inp.value); inp.replaceWith(nm); paintChart(); if (!card.hidden) showIsle({ id, kind }); };
        inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') ok(true); if (ev.key === 'Escape') ok(false); ev.stopPropagation(); });
        inp.addEventListener('blur', () => ok(true));
        nm.replaceWith(inp); inp.focus(); inp.select();
      };
    }
    else { nm.textContent = SPOT[id].ko; tx.textContent = SPOT[id].note; }
    sel = { id, text: nm.textContent }; card.hidden = false; repaint();
  }
  // 카드가 닫히면(✕·빈 바다·끌기·창 닫기) 지도 위 이름도 지운다
  new MutationObserver(() => { if (card.hidden && sel) { sel = null; repaint(); } }).observe(card, { attributes: true, attributeFilter: ['hidden'] });
  // v29.4.7: 예전에 찾은 작은 섬엔 작업명이 안 적혀 있다 — 같은 때 끝난 항해 기록에서 찾아 채운다 (없으면 기본 이름 그대로)
  { let fill = false;
    for (const [id, f] of Object.entries(chart.found)) {
      if (!ISLET[id] || 'task' in f) continue;
      const e = voyage.log.filter(v => Math.abs((v.at || 0) - (f.at || 0)) < 120000).sort((a, b) => Math.abs(a.at - f.at) - Math.abs(b.at - f.at))[0];
      f.task = String(e?.reason || '').trim().slice(0, 80); fill = true;
    }
    if (fill) chart.store(); }
  paintAll();
  // v29.6 답장 선물 고르기 칸에 쓰는 낚은 것 그림
  const catchIcon = (id, px = 112) => { const cv = document.createElement('canvas'); cv.width = cv.height = px; cv.className = 'catchIcon'; drawCatch(cv.getContext('2d'), sheets.catch, CATCH[id], px / 2, px / 2, px * 0.9); return cv; };
  return { chart, catches, builds, extra, arrived, focusDone, drawIsland, paintAll, paintChart, catchIcon };
}
