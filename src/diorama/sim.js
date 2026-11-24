// diorama/sim.js — 디오라마의 땅(ground.js 식)으로 공용 모래·물 시뮬레이션(src/sandsim)을 돌린다
import { Sim as SandSim, SIM } from '../sandsim/sim.js?v=lab-40a1952';
import { N, CELL, SEA_Z, SIZE, groundH } from './ground.js?v=lab-40a1952';
export { SIM };

export function dioramaBase() {   // 칸 가운데의 처음 땅 높이 (줄 = z, 뭍 쪽부터)
  const a = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) a[j * N + i] = groundH((i + 0.5) * CELL - SIZE / 2, (j + 0.5) * CELL - SIZE / 2);
  return a;
}
export class Sim extends SandSim { constructor(renderer) { super(renderer, { nx: N, nz: N, cell: CELL, seaZ: SEA_Z }, dioramaBase()); } }
