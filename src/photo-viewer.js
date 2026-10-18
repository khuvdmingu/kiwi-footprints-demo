// 사진 원본 한 장을 전체 화면에 맞추고 확대한다. 별도 캔버스/복제 Blob은 만들지 않는다.
export function photoSize(iw, ih, vw, vh, zoom = 1) {
  const fit = Math.min(vw / iw, vh / ih);
  return { width: iw * fit * zoom, height: ih * fit * zoom };
}

export function mountPhotoViewer(root) {
  const image = root.querySelector('img'), stage = root.querySelector('.photoViewport');
  const plus = root.querySelector('[data-photo="in"]'), minus = root.querySelector('[data-photo="out"]');
  const reset = root.querySelector('[data-photo="fit"]'), close = root.querySelector('[data-photo="close"]');
  const title = root.querySelector('h2');
  let zoom = 1, back = null, drag = null;
  function layout() {
    if (!root.open || !image.naturalWidth || !stage.clientWidth || !stage.clientHeight) return;
    const s = photoSize(image.naturalWidth, image.naturalHeight, stage.clientWidth, stage.clientHeight, zoom);
    image.style.width = `${s.width}px`; image.style.height = `${s.height}px`;
    root.dataset.zoomed = String(zoom > 1);
    minus.disabled = zoom <= 1; plus.disabled = zoom >= 4;
    reset.textContent = zoom === 1 ? '화면 맞춤' : `${Math.round(zoom * 100)}% · 맞춤`;
    reset.setAttribute('aria-label', `현재 화면 맞춤의 ${Math.round(zoom * 100)}퍼센트, 화면에 맞추기`);
  }
  function setZoom(next) {
    const old = zoom, cx = stage.scrollLeft + stage.clientWidth / 2, cy = stage.scrollTop + stage.clientHeight / 2;
    zoom = Math.max(1, Math.min(4, next)); layout();
    stage.scrollLeft = cx * zoom / old - stage.clientWidth / 2;
    stage.scrollTop = cy * zoom / old - stage.clientHeight / 2;
  }
  function dismiss() { if (root.open) root.close(); }
  plus.addEventListener('click', () => setZoom(zoom + 0.5));
  minus.addEventListener('click', () => setZoom(zoom - 0.5));
  reset.addEventListener('click', () => setZoom(1));
  close.addEventListener('click', dismiss);
  image.addEventListener('load', layout);
  image.addEventListener('dragstart', e => e.preventDefault());
  image.addEventListener('dblclick', () => setZoom(zoom === 1 ? 2 : 1));
  // 터치는 브라우저의 스크롤/핀치 확대를 유지한다. 마우스에서도 끌어서 옮길 수 있다.
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || zoom <= 1) return;
    drag = { x: e.clientX, y: e.clientY, left: stage.scrollLeft, top: stage.scrollTop };
    stage.setPointerCapture(e.pointerId); e.preventDefault();
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    stage.scrollLeft = drag.left + drag.x - e.clientX; stage.scrollTop = drag.top + drag.y - e.clientY;
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(ev, () => { drag = null; });
  root.addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') { setZoom(zoom + 0.5); e.preventDefault(); }
    if (e.key === '-') { setZoom(zoom - 0.5); e.preventDefault(); }
    if (e.key === '0') { setZoom(1); e.preventDefault(); }
    e.stopPropagation();
  });
  root.addEventListener('close', () => {
    image.removeAttribute('src'); image.alt = ''; drag = null;
    if (back?.isConnected) back.focus(); back = null;
  });
  new ResizeObserver(layout).observe(stage);
  return {
    get open() { return root.open; }, close: dismiss,
    show(url, description) {
      back = document.activeElement; zoom = 1; title.textContent = description || '집중 사진';
      image.alt = description || '집중 사진'; image.src = url;
      root.showModal(); stage.scrollTo(0, 0); layout(); close.focus();
    },
  };
}
