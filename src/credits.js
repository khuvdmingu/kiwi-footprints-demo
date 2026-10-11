// credits.js — 작품 설명의 소리·곡 크레딧을 카탈로그(src/tracks/)에서 만든다
//  곡을 붙이면 크레딧도 저절로 바뀐다. index.html 의 #audio-credits 안 글은 JS 가 없을 때의 대체 문구.
import { credits, LICENSES } from './tracks/index.js?v=v18.4.0';

const el = document.getElementById('audio-credits');
if (el) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const link = (t, label) => t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(label)}</a>` : esc(label);
  const parts = credits().map(g => {
    const lic = LICENSES[g.license]?.name || g.license;
    // 발자국·자연 배경처럼 한 출처에서 여럿 받은 것은 출처 이름만, 곡은 곡마다 제목(작가)
    const songs = g.list.filter(t => t.kind === 'song'), sounds = g.list.filter(t => t.kind !== 'song');
    const bits = [];
    if (sounds.length) bits.push(`소리 ${sounds.length}개(${[...new Set(sounds.map(t => t.credit.author).filter(Boolean))].map(esc).join(', ') || esc(g.source)})`);
    if (songs.length) bits.push('곡 ' + songs.map(t => `${link(t.credit, t.credit.title)}(${esc(t.credit.author || '작자 미상')})`).join(', '));
    return `${esc(g.source)} · ${esc(lic)} — ${bits.join(' · ')}`;
  });
  if (parts.length) el.innerHTML = `모아서 받는 소리·곡은 오픈 라이선스 녹음입니다: ${parts.join(' / ')}`;
}
