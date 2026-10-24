// voyage-extras.js — v28 해도 · 낚싯줄 · 섬 짓기를 앱에 잇는 곳
//
//  main.js 는 이 파일의 mountExtras() 한 번 + 연결 줄 몇 개만 갖는다 (다른 세션이 main.js 를 같이 고치므로 덩어리는 여기에):
//   · voyage.complete(now, ctx, extras.extra)  — 일기에 낚은 것·지나간 섬·새로 찾은 곳 줄을 덧붙인다
//   · extras.arrived(entry)                    — 도착한 섬에 공사(항해 분 + 재료)를 더하고 알린다
//   · extras.focusDone(mapId, min)             — 섬에서 보기를 끝까지 하면 그 섬 공사
//   · extras.drawIsland(ctx, beach, mapId, night) — 섬 장면에 지은 것을 그린다
//  규칙·저장은 chart.js · fishing.js · build.js 에, 화면 칸(바구니 › 해도 · 장소·소리 · 도감, 집중 창 안내)은 index.html 에.

import { Chart, ISLET, SPOT, BIG, drawChart, routeLine, josa, SHEET as CHART_SHEET, CHART_B, BIG_ART } from './chart.js?v=v29.0.0';
import { Catches, CATCHES, CATCH, rollCatch, catchLine, drawCatch, drawLine, MATERIAL_MIN, RARITY, SHEET as CATCH_SHEET } from './fishing.js?v=v29.0.0';
import { Builds, BUILDS, buildFor, drawBuilds, nextText } from './build.js?v=v29.0.0';
import { loadSheet } from './sheet.js?v=v29.0.0';

// 그림 격자가 assets/ 에 들어오면 true 로 (없을 때 404 를 내지 않게 — 그동안은 코드 그림)
export const ART = { chart: true, catch: true, extra: true, kit: true };   // 2026-10-21 Higgsfield 격자 2장 (docs/GRAPHICS-PROMPTS.md v28)

export function mountExtras(env) {
  const { saved, save, voyage, voyScene, mapOpen, placeName, toast, unlockAll = false } = env;
  const chart = new Chart(() => saved('chart'), v => save('chart', v));
  const catches = new Catches(() => saved('catch'), v => save('catch', v));
  const builds = new Builds(() => saved('builds'), v => save('builds', v));
  const base = new URL('../assets/', import.meta.url).href;
  const sheets = { chart: null, catch: null, extra: null, kit: null, chartB: null, paper: null };
  const load = (k, f) => { if (ART[k]) loadSheet(base + f).then(s => { if (s) { sheets[k] = s; paintAll(); } }); };
  load('chart', CHART_SHEET); load('catch', CATCH_SHEET); load('extra', 'extra-sheet.webp?v=v29.0.0'); load('kit', 'build-sheet-2.webp?v=v29.0.0');   // v28.20 벚꽃 강변·오아시스 건물   // v28.3 보충 격자 (작은 섬 4 · 바다 위의 곳 4 · 장소별 건물 8)
  // v28.19 해도 그림 B — 양피지 + 새 아이콘 (못 읽으면 지금 그림 그대로)
  loadSheet(base + CHART_B.sheet).then(s => { if (s) { sheets.chartB = s; paintAll(); } });
  { const im = new Image(); im.onload = () => { sheets.paper = im; paintAll(); }; im.src = base + CHART_B.paper; }
  sheets.bigArt = {};   // v28.20 격자 칸이 없는 큰 섬 (벚꽃 강변·오아시스)
  for (const [id, f] of Object.entries(BIG_ART)) { const im = new Image(); im.onload = () => { sheets.bigArt[id] = im; paintAll(); }; im.src = base + f; }
  const $ = id => document.getElementById(id);
  const later = []; let busy = false;   // 알림 줄 (도착 알림 뒤에 차례로)
  const say = (text, ms = 3200) => { later.push([text, ms]); if (!busy) { busy = true; setTimeout(next, 4400); } };
  function next() { const it = later.shift(); if (!it) { busy = false; return; } toast(it[0], it[1]); setTimeout(next, it[1] + 300); }
  let pop = null;   // 새로 선 것의 뿅

  // 항해 중 배 뒤 낚싯줄
  if (voyScene) voyScene.overlay = (c, b) => { if (voyage.atSea) drawLine(c, b); };

  // ── 도착할 때 일기에 덧붙일 줄 (voyage.complete 의 extra) ──
  function extra(trip, sailedMs) {
    const lines = [], from = trip.from || voyage.at || 'beach', min = Math.round(trip.dur / 60000);
    const passed = chart.onRoute(from, trip.to);
    const rl = routeLine(chart, from, trip.to, parseInt(String(trip.id).slice(-4), 10) || 0); if (rl) lines.push(rl);
    const item = rollCatch(trip.id, min, { reef: passed.includes('s-reef') });
    const got = catches.take(trip.id, item);
    if (got) { lines.push(catchLine(item, trip.id)); if (item.bonus) chart.addBonus(item.bonus); }
    const found = chart.discover(sailedMs, { ...trip, from });
    for (const f of found) lines.push(f.kind === 'islet'
      ? { ko: '지도에 없던 작은 섬을 봤다. 이름은 네가 지어 줘.', en: 'We saw a little island that is not on the map. You can name it.' }
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
  const VIEW_KEY = 'chartView', MIN_SPAN = 0.46;
  let view = null, anim = 0, layout = null;
  const home = () => voyage.at || env.mapId();
  function fitView() {
    const pts = [];
    for (const id of Object.keys(BIG)) if (mapOpen(id) || id === home()) pts.push(BIG[id]);
    for (const v of Object.values(chart.found)) pts.push(v);
    if (!pts.length) return { cx: 0.5, cy: 0.5, span: 1 };
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0; for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const span = Math.min(1, Math.max(MIN_SPAN, Math.max(x1 - x0, y1 - y0) + 0.26));
    const c = (a, b) => Math.min(1 - span / 2, Math.max(span / 2, (a + b) / 2));
    return { cx: span >= 1 ? 0.5 : c(x0, x1), cy: span >= 1 ? 0.5 : c(y0, y1), span };
  }
  // 한 장 그리기: 상자 크기(가로·세로 아무거나)에 v 범위를 맞춘다
  function drawView(v) {
    const cv = $('chartCv'), box = $('chartBox');
    const W = Math.max(120, box.clientWidth), H = Math.max(120, box.clientHeight), dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
    const S = Math.min(W, H) / v.span, ox = W / 2 - v.cx * S, oy = H / 2 - v.cy * S;
    layout = { S, ox, oy };
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#e2cfa6'; c.fillRect(0, 0, W, H);   // 종이 밖 (넓게 볼 때 가장자리)
    c.translate(ox, oy);
    drawChart(c, S, { chart, log: voyage.log, home: home(), sailedMs: voyage.sailedMs, open: mapOpen, placeName, sheet: sheets.chart, extra: sheets.extra, paper: sheets.paper, bigArt: sheets.bigArt, alt: sheets.chartB && { ...CHART_B, sheet: sheets.chartB }, builds: id => builds.level(id), t: 0, all: true });
  }
  function paintChart() {
    const box = $('chartBox'); if (!$('chartCv') || !box || box.closest('[hidden]')) return;
    const want = fitView();
    if (!view) { try { view = JSON.parse(saved(VIEW_KEY) || 'null'); } catch (e) { view = null; } if (!view || !isFinite(view.span)) view = want; }
    const same = Math.abs(view.span - want.span) < 0.005 && Math.abs(view.cx - want.cx) < 0.005 && Math.abs(view.cy - want.cy) < 0.005;
    cancelAnimationFrame(anim);
    if (same || matchMedia('(prefers-reduced-motion: reduce)').matches) { view = want; drawView(view); save(VIEW_KEY, JSON.stringify(want)); }
    else {   // 지난번 본 범위에서 지금 범위로 천천히 물러난다 (새 섬이 열린 걸 눈으로 보게)
      const from = view; drawView(from);
      let t0 = 0;
      const step = now => {
        if (box.closest('[hidden]')) return;
        t0 = t0 || now; const u = Math.min(1, (now - t0) / 1500), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        view = { cx: from.cx + (want.cx - from.cx) * e, cy: from.cy + (want.cy - from.cy) * e, span: from.span + (want.span - from.span) * e };
        drawView(view);
        if (u < 1) anim = requestAnimationFrame(step); else save(VIEW_KEY, JSON.stringify(want));
      };
      setTimeout(() => { anim = requestAnimationFrame(step); }, 400);
    }
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
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'quiet'; btn.textContent = chart.named(i.id) ? '이름 바꾸기' : '이름 짓기';
      btn.addEventListener('click', () => {
        const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 16; inp.value = chart.named(i.id) ? chart.name(i.id) : ''; inp.placeholder = i.ko; inp.setAttribute('aria-label', '섬 이름');
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
        b.addEventListener('click', () => toast(`${c.ko} · ${c.note}`, 2600));
      }
      grid.append(b);
    }
  }
  function paintBuilds() {
    const list = $('buildList'); if (!list) return;
    list.textContent = '';
    for (const map of Object.keys(env.places)) {
      if (!mapOpen(map)) continue;
      const lv = builds.level(map), n = builds.next(map), row = document.createElement('div'); row.className = 'buildRow';
      const nm = document.createElement('b'); nm.textContent = placeName(map);
      const icons = document.createElement('span'); icons.className = 'buildIcons';
      icons.textContent = BUILDS.map((b, i) => (i < lv ? '●' : '○')).join('');
      icons.setAttribute('aria-label', `${BUILDS.length}개 중 ${lv}개 지음`);
      const bar = document.createElement('i'); bar.className = 'buildBar'; bar.style.setProperty('--f', n ? n.frac.toFixed(3) : '1');
      const tx = document.createElement('span'); tx.className = 'buildText';
      tx.textContent = (lv ? BUILDS.slice(0, lv).map(b => buildFor(b, map).ko).join(' · ') + ' — ' : '') + nextText(builds, map);
      row.append(nm, icons, bar, tx); list.append(row);
    }
  }
  function paintAll() { paintChart(); paintCatch(); paintBuilds(); }
  // 해도는 보일 때 그린다 (창 크기를 알아야 하므로) — 해도 창이 열릴 때 · 창 크기가 바뀔 때
  addEventListener('resize', () => { if (!$('chartView')?.hidden) { view = null; paintChart(); } });
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
    for (const [id, p] of Object.entries(BIG)) near(id, p, 'big', 0.075);
    for (const [id, p] of Object.entries(chart.found)) near(id, p, ISLET[id] ? 'islet' : 'spot', 0.05);
    if (!best) { card.hidden = true; return; }
    showIsle(best);
  });
  card?.querySelector('.x').addEventListener('click', () => { card.hidden = true; });
  function showIsle({ id, kind }) {
    const nm = card.querySelector('.nm'), tx = card.querySelector('.tx'), go = card.querySelector('.go');
    go.hidden = true; go.onclick = null; go.disabled = false;
    if (kind === 'big') {
      const open = mapOpen(id), visits = voyage.log.filter(v => v.to === id).length, lv = builds.level(id);
      nm.textContent = open ? placeName(id) : '안개 너머 섬';
      if (!open) tx.textContent = env.lockText?.(id) || '아직 안개에 싸여 있어요';
      else if (id === home()) tx.textContent = `지금 여기 있어요${lv ? ` · 지은 것 ${lv}` : ''}`;
      else {
        tx.textContent = (visits ? `${visits}번 닿았어요` : '아직 안 가 본 섬') + (lv ? ` · 지은 것 ${lv}` : '');
        go.hidden = false;
        if (voyage.active) { go.textContent = '항해 중이에요'; go.disabled = true; }
        else if (voyage.paused) { go.textContent = '멈춘 배 먼저 — 떠나기 창'; go.onclick = () => env.planVoyage?.(voyage.paused.to); }
        else { go.textContent = '항해로 가기'; go.onclick = () => env.planVoyage?.(id); }
      }
    } else if (kind === 'islet') { nm.textContent = chart.name(id); tx.textContent = ISLET[id].note + (chart.named(id) ? '' : ' · 아래 목록에서 이름을 지어 주세요'); }
    else { nm.textContent = SPOT[id].ko; tx.textContent = SPOT[id].note; }
    card.hidden = false;
  }
  paintAll();
  return { chart, catches, builds, extra, arrived, focusDone, drawIsland, paintAll, paintChart };
}
