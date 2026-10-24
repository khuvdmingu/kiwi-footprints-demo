// 저장 전 미리보기 중 종료돼도 다음 실행에서 마지막 저장 선택만 복원한다.
// 소유 아이템·새 무리 가입·음량은 유지하며, 복원이 끝난 뒤에만 복구 기록을 지운다.
export const MIX_PICKS = ['voice', 'stepPack', 'natStep', 'findPack', 'nature', 'song'];
const object = raw => { const v = JSON.parse(raw || '{}'); if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('저장 형식'); return v; };
const valid = d => d && Array.isArray(d.wear) && d.wear.every(v => typeof v === 'string') &&
  typeof d.boat === 'string' && typeof d.sail === 'string' && d.mix && MIX_PICKS.every(k => typeof d.mix[k] === 'string') &&
  Array.isArray(d.members) && d.members.every(m => m && ['id', 'name', 'wear'].every(k => typeof m[k] === 'string'));

export class WardrobeJournal {
  constructor(storage, prefix = 'kiwi-footprints.') { this.storage = storage; this.prefix = prefix; this.key = prefix + 'wardrobeDraft'; }
  begin(state) {
    if (!valid(state)) return false;
    try { if (this.storage.getItem(this.key)) return false; this.storage.setItem(this.key, JSON.stringify({ version: 1, state })); return true; } catch { return false; }
  }
  commit(state) {
    try {
      // 미리보기 중 모델의 개별 저장이 실패했어도 「저장」은 현재 선택 전체를 확인해서 쓴다.
      if (state) { if (!valid(state)) return false; this.writeState(state); }
      this.storage.removeItem(this.key); return true;
    } catch { return false; }
  }
  writeState(d) {
    const read = k => object(this.storage.getItem(this.prefix + k));
    const items = read('items'), flock = read('flock'), mix = read('mix');
    items.wear = d.wear;
    const members = new Map(d.members.map(m => [m.id, m]));
    if (Array.isArray(flock.members)) flock.members = flock.members.map(m => {
      const saved = members.get(m.id); return saved ? { ...m, name: saved.name, wear: saved.wear } : m;
    });
    for (const k of MIX_PICKS) mix[k] = d.mix[k];
    const writes = { items: JSON.stringify(items), flock: JSON.stringify(flock), mix: JSON.stringify(mix), boat: d.boat, sail: d.sail };
    for (const [k, value] of Object.entries(writes)) this.storage.setItem(this.prefix + k, value);
  }
  recover() {
    try {
      const raw = this.storage.getItem(this.key); if (!raw) return { ok: true, recovered: false };
      const entry = object(raw), d = entry.state;
      if (entry.version !== 1 || !valid(d)) return { ok: false, recovered: false };
      // 전체 값을 먼저 계산해 형식 오류 시에는 기존 저장을 건드리지 않는다.
      this.writeState(d);
      if (!this.commit()) return { ok: false, recovered: false };
      return { ok: true, recovered: true };
    } catch { return { ok: false, recovered: false }; }
  }
}
