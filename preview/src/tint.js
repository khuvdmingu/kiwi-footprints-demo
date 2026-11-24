// 같은 작은 색조 그림을 HTML 배경으로 표시한다.
// 가속 canvas 자체를 multiply 층으로 합성할 때 일부 iPad에서 아래 풍경이 가려졌다.
// PNG는 색/화면 비율이 바뀔 때만 만들며, 사진에는 인코딩 전의 같은 canvas를 쓴다.
const surfaces = new WeakMap();
export const tintSnapshot = el => surfaces.get(el)?.canvas || null;

export function renderTint(el, stops, W, H) {
  const tw = 160, th = Math.max(1, Math.round(160 * H / Math.max(1, W)));
  const key = stops.join('|') + '|' + th;
  let state = surfaces.get(el);
  if (state?.key === key) return state.canvas;
  if (!state) { state = { canvas: document.createElement('canvas') }; surfaces.set(el, state); }
  const canvas = state.canvas;
  if (canvas.width !== tw || canvas.height !== th) { canvas.width = tw; canvas.height = th; }
  const c = canvas.getContext('2d'), cx = tw * 0.55, cy = th * 0.45, rx = tw * 0.75, ry = th * 0.62;
  c.setTransform(rx, 0, 0, ry, cx, cy);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgb(${stops[0]})`); g.addColorStop(0.55, `rgb(${stops[1]})`); g.addColorStop(1, `rgb(${stops[2]})`);
  c.fillStyle = g; c.fillRect(-cx / rx, -cy / ry, tw / rx, th / ry);
  el.style.backgroundImage = `url("${canvas.toDataURL('image/png')}")`;
  state.key = key;
  return canvas;
}
