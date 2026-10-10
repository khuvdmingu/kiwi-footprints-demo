// leaves.js — 물 위에 떠다니는 단풍 (가을 호숫가, v17)
//  그림 판에서는 물 위 낙엽을 지우고, 낱장 그림(assets/leaves.webp, 4×2 칸, 투명 배경)을 따로 띄운다.
//  떠내려오는 병·상자(items.js Drifters)와 같은 문법: 물가선(beach.edge)을 기준으로 떠 있고, 위아래로 까딱이며, 동그란 물결을 낸다.
//  잎마다 "물가선 아래 깊이"(d)가 있어서, 파도가 밀려오면 물가 쪽 잎일수록 많이 밀려 올라갔다가 물이 빠지면 같이 끌려 내려간다.

export class Leaves {
  constructor() { this.list = []; this.sprites = []; }

  setSheet(im) {   // 칸마다 잘라 둔다
    const cw = im.naturalWidth / 4, ch = im.naturalHeight / 2;
    this.sprites = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      cv.getContext('2d').drawImage(im, c * cw, r * ch, cw, ch, 0, 0, cw, ch);
      this.sprites.push(cv);
    }
  }

  reset(beach, on) {
    this.list = [];
    if (!on) return;
    const { W, u } = beach, n = Math.round(Math.max(5, Math.min(12, W / (110 * u))));
    for (let i = 0; i < n; i++) this.list.push(this.make(beach, (i + Math.random() * 0.8) * W / n));
  }

  make(beach, x) {
    const u = beach.u, r = Math.random;
    return {
      x, y: null, d: 0.05 + r() * 0.85, s: Math.floor(r() * 8),   // 깊이는 고르게 (물가에 한 줄로 늘어서지 않게)
      size: (34 + r() * 22) * u, rot: r() * 6.28, vr: (r() - 0.5) * 0.08,
      vx: (1.5 + r() * 3) * u, ph: r() * 6.28,
    };
  }

  // 놓일 자리: 물가선 바로 아래(병·상자처럼 7u) ~ 화면 아래 끝 사이, 깊이 비율 d 만큼
  home(beach, f) {
    const top = beach.edge(f.x) + 7 * beach.u + f.size * 0.35;
    return top + f.d * Math.max(0, beach.H + f.size - top);
  }

  update(dt, beach, wind = 0) {
    const { W, t, u } = beach;
    for (const f of this.list) {
      // 옆으로: 느린 물살 + 바람, 그리고 물결 따라 좌우로 살랑
      f.x += (f.vx * (1 + wind * 2.5) + Math.sin(t * 0.35 + f.ph) * 2.5 * u) * dt;
      // 위아래: 물을 따라간다 — 물이 밀려오면 바로, 빠질 때는 조금 늦게 끌려간다(물에 젖은 잎의 끌림)
      const want = this.home(beach, f);
      if (f.y === null) f.y = want;
      const dy = want - f.y, k = dy < 0 ? 6 : 2.2;
      const vy = dy * Math.min(1, dt * k) / Math.max(dt, 1e-3);
      f.y += dy * Math.min(1, dt * k);
      // 움직이는 만큼 살짝 돈다 (밀려올 때 잎이 비틀린다) + 아주 느린 자전
      f.rot += (f.vr + vy * 0.0012 / u * Math.sign(Math.sin(f.ph))) * dt;
      if (f.x > W + f.size) Object.assign(f, this.make(beach, -f.size));
    }
  }

  draw(ctx, beach) {
    if (!this.sprites.length) return;
    const { H, u, t } = beach;
    for (const f of this.list) {
      if (f.y === null || f.y - f.size > H) continue;
      const bob = Math.sin(t * 1.8 + f.ph) * 2.2 * u, tilt = Math.sin(t * 1.3 + f.ph) * 0.1;
      const im = this.sprites[f.s], k = f.size / Math.max(im.width, im.height) * 1.25;
      ctx.save();
      // 동그란 물결 두 겹 (병·상자와 같은 박자, 잎이라 조금 옅게)
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.1 * u;
      for (let j = 0; j < 2; j++) {
        const ph = (t * 0.45 + j * 0.5 + f.ph) % 1;
        ctx.globalAlpha = (1 - ph) * 0.45;
        ctx.beginPath(); ctx.ellipse(f.x, f.y + 3 * u, f.size * (0.42 + ph * 0.45), f.size * (0.2 + ph * 0.18), 0, 0, 6.29); ctx.stroke();
      }
      // 물에 비친 그림자 — 까딱일 때 잎만 뜨고 그림자는 물에 남는다
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#0b2b3a';
      ctx.beginPath(); ctx.ellipse(f.x + 3 * u, f.y + 5 * u, f.size * 0.36, f.size * 0.22, f.rot, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.translate(f.x, f.y + bob); ctx.rotate(f.rot + tilt);
      ctx.scale(k, k * (1 - Math.abs(Math.sin(t * 1.3 + f.ph)) * 0.06));   // 기울 때 살짝 납작 (물결에 얹힌 느낌)
      ctx.drawImage(im, -im.width / 2, -im.height / 2);
      ctx.restore();
    }
  }
}
