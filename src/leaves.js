// leaves.js — 물 위에 떠다니는 단풍 (가을 호숫가, v17)
//  그림 판에서는 물 위 낙엽을 지우고, 낱장 그림(assets/leaves.webp, 4×2 칸, 투명 배경)을 따로 띄운다.
//  잎마다 "물가선 아래 얼마나 깊이"(d, 0~1)를 갖고 있어서, 파도가 밀려오면 물가 쪽 잎이 같이 올라갔다 내려온다.

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
      x, d: 0.08 + r() * 0.85, s: Math.floor(r() * 8),
      size: (34 + r() * 22) * u, rot: r() * 6.28, vr: (r() - 0.5) * 0.22,
      vx: (2.5 + r() * 4) * u, ph: r() * 6.28,
    };
  }

  // 바람이 불면 빨리 흘러간다. 오른쪽 끝을 넘으면 왼쪽에서 새 잎으로 들어온다.
  update(dt, beach, wind = 0) {
    const { W, t } = beach;
    for (const f of this.list) {
      f.x += (f.vx * (1 + wind * 2.5) + Math.sin(t * 0.4 + f.ph) * 3 * beach.u) * dt;
      f.rot += f.vr * (1 + wind) * dt;
      if (f.x > W + f.size) Object.assign(f, this.make(beach, -f.size));
    }
  }

  draw(ctx, beach) {
    if (!this.sprites.length) return;
    const { H, u, t } = beach;
    for (const f of this.list) {
      // 물가 거품 줄 아래에서만: 큰 파도의 얇은 물 막 위로는 안 올라가고(그려진 물가선이 상한), 물이 빠지면 같이 내려간다
      const top = Math.max(beach.edge(f.x), beach.shoreAt(f.x)) + 24 * u + f.size * 0.5;
      if (top > H) continue;
      const y = top + f.d * (H + f.size - top) + Math.sin(t * 1.2 + f.ph) * 1.6 * u;
      const im = this.sprites[f.s], k = f.size / Math.max(im.width, im.height) * 1.25;
      ctx.save();
      // 물에 비친 그림자 · 가끔 동그란 물결
      ctx.globalAlpha = 0.2; ctx.fillStyle = '#0b2b3a';
      ctx.beginPath(); ctx.ellipse(f.x + 3 * u, y + 4 * u, f.size * 0.38, f.size * 0.26, f.rot, 0, 6.29); ctx.fill();
      const ph = (t * 0.25 + f.ph) % 1;
      ctx.globalAlpha = (1 - ph) * 0.3; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1 * u;
      ctx.beginPath(); ctx.ellipse(f.x, y, f.size * (0.4 + ph * 0.5), f.size * (0.22 + ph * 0.3), 0, 0, 6.29); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.translate(f.x, y); ctx.rotate(f.rot); ctx.scale(k, k * (1 + Math.sin(t * 1.7 + f.ph) * 0.04));
      ctx.drawImage(im, -im.width / 2, -im.height / 2);
      ctx.restore();
    }
  }
}
