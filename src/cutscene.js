// cutscene.js — v28.18 부두 장면: 출항 때 「승선」, 도착 때 「도착」 짧은 영상을 화면 위에 한 번
//
//  영상(Higgsfield Kling, 재고 stock/dock 2026-10-22 → 960px 무음 다시 인코딩): assets/cut-board.mp4 · cut-arrive.mp4 (각 10초)
//  · 어디를 누르거나 Esc 면 바로 건너뛴다 · 1.25배로 돌려 약 8초 · 영상을 못 읽거나 멈추면 조용히 넘어간다
//  · 움직임 줄이기(prefers-reduced-motion)를 켰거나 ?cut=0 이면 보여 주지 않는다
//  그 아래에서 항해·도착은 그대로 진행된다 (영상은 가림막일 뿐 — 기다리지 않는다)

const FILES = { board: 'cut-board', arrive: 'cut-arrive' };
const RATE = 1.25, MAX_MS = 11000;

export class Cutscene {
  constructor(root, { enabled = true } = {}) {
    this.root = root; this.enabled = enabled; this.timer = 0; this.done = null;
    this.video = root.querySelector('video');
    const skip = () => this.close();
    root.addEventListener('pointerdown', skip);
    root.querySelector('button')?.addEventListener('click', skip);
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) skip(); });
    this.video.addEventListener('ended', skip);
    this.video.addEventListener('error', skip);
  }
  get off() { return !this.enabled || matchMedia('(prefers-reduced-motion: reduce)').matches; }
  // v28.21 드문 순간: file(assets 안 이름, 확장자 없이) · rate · maxMs 를 따로 줄 수 있다
  play(kind, { caption = '', file = null, rate = RATE, maxMs = MAX_MS } = {}) {
    const f = file || FILES[kind];
    if (!f || this.off) return Promise.resolve(false);
    this.close();
    const v = this.video;
    v.poster = `assets/${f}.webp?v=v29.3.3`; v.src = `assets/${f}.mp4`; v.muted = true; v.playsInline = true;
    const cap = this.root.querySelector('.cutCaption'); if (cap) cap.textContent = caption;
    this.root.hidden = false; this.root.classList.remove('out');
    v.playbackRate = rate;
    v.play().then(() => { v.playbackRate = rate; }).catch(() => this.close());
    this.timer = setTimeout(() => this.close(), maxMs);
    return new Promise(res => { this.done = res; });
  }
  close() {
    clearTimeout(this.timer);
    if (this.root.hidden) return;
    const v = this.video; this.root.classList.add('out');
    setTimeout(() => { this.root.hidden = true; v.pause(); v.removeAttribute('src'); v.load(); }, 350);
    const d = this.done; this.done = null; d?.(true);
  }
}
