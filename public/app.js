'use strict';
/* Kiko Housee — frontend (tanpa inline handler, kompatibel CSP ketat) */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = { me: null, settings: {}, oauth: {}, minWait: 10 };
const PLAT = {
  youtube: ['YouTube', 'Subscribe', 'YT'], instagram: ['Instagram', 'Follow', 'IG'], tiktok: ['TikTok', 'Follow', 'TT'],
  twitter: ['X / Twitter', 'Follow', 'X'], facebook: ['Facebook', 'Follow', 'FB'], twitch: ['Twitch', 'Follow', 'TW'],
  github: ['GitHub', 'Follow', 'GH'], discord: ['Discord', 'Join', 'DC'], telegram: ['Telegram', 'Join', 'TG'], other: ['Lainnya', 'Buka', '••']
};
const isOwner = () => S.me && S.me.role === 'owner';
const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const fmtDate = t => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const pad = n => String(n).padStart(2, '0');
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200); }

async function api(url, o = {}) {
  const init = { method: o.method || 'GET', headers: { 'x-kh': '1' }, credentials: 'same-origin' };
  if (o.body) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(o.body); }
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Terjadi kesalahan'); e.status = r.status; throw e; }
  return j;
}
/* ----------------------------- routing ----------------------------- */
function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [p, q] = raw.split('?');
  return { parts: p.split('/').filter(Boolean), q: new URLSearchParams(q || '') };
}
const go = h => { location.hash = h; };
window.addEventListener('hashchange', render);

async function boot() {
  try { Object.assign(S, await api('/api/bootstrap')); }
  catch (e) { chrome([]); $('#app').innerHTML = `<div class="box narrow"><h2>Situs belum siap</h2><p class="mut">${esc(e.message)}</p></div>`; return; }
  render();
}
async function render() {
  const { parts, q } = parse();
  chrome(parts);
  const app = $('#app');
  app.classList.remove('fade'); void app.offsetWidth; app.classList.add('fade');
  window.scrollTo(0, 0);
  try {
    const [a, b, c] = parts;
    if (!a) return await pgHome();
    if (a === 'file') return await pgFile(b, q);
    if (a === 'kabar') return await pgKabar();
    if (a === 'discord') return pgDiscord();
    if (a === 'masuk') return pgLogin();
    if (a === 'admin') {
      if (!isOwner()) return go('/masuk');
      if (b === 'files' && c) return await pgEdit(c);
      if (b === 'members') return await pgMembers();
      if (b === 'settings') return pgSettings();
      return await pgAdminFiles();
    }
    go('/');
  } catch (e) { app.innerHTML = `<div class="empty"><p>${esc(e.message)}</p><a class="btn" href="#/">Ke beranda</a></div>`; }
}
function chrome(parts) {
  const a = parts[0] || '';
  const L = (h, t, on, cls = '') => `<a href="#/${h}" class="${on ? 'on' : ''} ${cls}">${t}</a>`;
  $('#top').innerHTML = `<a class="brand" href="#/"><i></i>${esc(S.settings.siteName || 'Kiko Housee')}</a>
    <nav class="nav">${L('', 'Index', a === '')}${L('kabar', 'Kabar', a === 'kabar')}${L('discord', 'Discord', a === 'discord')}
    ${isOwner() ? L('admin', 'Kelola', a === 'admin', 'own') : ''}<span class="sep"></span>
    ${S.me ? `<a href="#" data-act="logout" class="btn-nav">Keluar · ${esc(S.me.username)}</a>` : `<a href="#/masuk" class="btn-nav ${a === 'masuk' ? 'on' : ''}">Masuk</a>`}</nav>`;
  $('#foot').innerHTML = `<div><div class="big">${esc(S.settings.siteName || 'Kiko Housee')}</div><div class="mono">© ${new Date().getFullYear()} — semua file dibagikan gratis</div></div>
    <div class="mono">Ngobrol di <a href="${esc(S.settings.discord || '#')}" target="_blank" rel="noopener">Discord ↗</a></div>`;
}

/* ----------------------------- pages ----------------------------- */
async function pgHome() {
  const [{ links, hidden }, { items }] = await Promise.all([api('/api/links'), api('/api/announcements')]);
  const last = items[0];
  const tape = Array.from({ length: 2 }, () => ['Arsip file', 'Gratis', 'Follow dulu', 'Unduh', 'Komunitas'].map((t, i) => `<span class="${i % 2 ? 'd' : ''}">${t}</span>`).join('<span class="d">/</span>')).join('<span class="d">/</span>');
  $('#app').innerHTML = `
    <section class="hero">
      <div class="mono mut">Arsip file / Indonesia</div>
      <h1>Kiko <em>Housee</em></h1>
      <div class="hero-foot">
        <p class="lede">${esc(S.settings.tagline || '')}</p>
        <div class="hero-meta"><div><b>${pad(links.length)}</b><span class="mono mut">File tersedia</span></div>
          <div><b>${pad(links.reduce((a, l) => a + (l.downloads || 0), 0))}</b><span class="mono mut">Total unduhan</span></div></div>
      </div>
    </section>
    <div class="tape"><div>${tape}</div></div>
    ${last ? `<a class="note" href="#/kabar"><span class="mono">Kabar</span><span><b>${esc(last.title)}</b> — ${esc(last.body).slice(0, 110)}${last.body.length > 110 ? '…' : ''}</span></a>` : ''}
    <section class="sec"><div class="sec-h"><h2>Index</h2><span class="mono mut">(${pad(links.length)})</span></div>
    ${links.length ? links.map((l, i) => `<a class="row-item" href="#/file/${l.id}">
      <span class="no">${pad(i + 1)}</span>
      <span class="ttl">${esc(l.title)}<small>${esc(l.desc || '')}</small></span>
      <span class="c3 mono mut">${l.type === 'file' ? esc((l.fileName || '').split('.').pop()) + ' · ' + fmtSize(l.size) : 'Link eksternal'}</span>
      <span class="c4">${l.access === 'member' ? '<span class="pill acc">Member</span>' : '<span class="pill">Publik</span>'}</span>
      <span class="c5 mono">${l.progress.done}/${l.progress.total}</span><span class="arr">→</span></a>`).join('')
      : `<div class="empty"><p>Belum ada file di sini.</p>${isOwner() ? '<a class="btn fill" href="#/admin/files/new">Unggah file pertama</a>' : ''}</div>`}
    ${hidden ? `<p class="mono mut" style="margin-top:18px">+ ${hidden} file khusus member — <a href="#/masuk">masuk untuk melihat</a></p>` : ''}
    </section>
    <section class="sec"><div class="sec-h"><h2>Tentang</h2><span class="mono mut">(info)</span></div>
      <p style="font:400 clamp(24px,3vw,34px)/1.25 var(--serif);max-width:32ch;margin:26px 0 0">${esc(S.settings.about || '')}</p></section>`;
}

const pending = {}; // reqId -> {t, left}
const markLeft = () => Object.values(pending).forEach(p => p.left = true);
document.addEventListener('visibilitychange', () => { if (document.hidden) markLeft(); });
window.addEventListener('blur', markLeft);
let tickT, curFile;

async function pgFile(id, q) {
  let l;
  try { l = await api('/api/links/' + id); }
  catch (e) {
    if (e.status === 403) { $('#app').innerHTML = `<div class="box narrow"><h2>Khusus member</h2><p class="mut">File ini hanya untuk member. Akun member dibuat oleh Owner.</p><div class="actions"><a class="btn fill" href="#/masuk">Masuk</a></div></div>`; return; }
    throw e;
  }
  curFile = l;
  const done = l.reqs.filter(r => r.done).length, all = done === l.reqs.length;
  const v = q.get('v');
  const msg = { ok: ['ok', 'Terverifikasi otomatis. Bagus!'], fail: ['', 'Belum terdeteksi. Pastikan akun yang dipakai sudah join/subscribe, lalu coba lagi.'], err: ['', 'Verifikasi gagal diproses. Coba lagi sebentar lagi.'] }[v];
  $('#app').innerHTML = `
    <a class="back" href="#/">← Kembali ke index</a>
    <div class="f-head"><span class="pill ${l.access === 'member' ? 'acc' : ''}">${l.access === 'member' ? 'Khusus member' : 'Publik'}</span>
      <h1>${esc(l.title)}</h1><p>${esc(l.desc || '')}</p>${msg ? `<div class="alert ${msg[0]}">${msg[1]}</div>` : ''}</div>
    <div class="meta">
      <div><span class="mono mut">Tipe</span><b>${l.type === 'file' ? esc((l.fileName || '').split('.').pop().toUpperCase() || 'FILE') : 'Link'}</b></div>
      <div><span class="mono mut">Ukuran</span><b>${l.type === 'file' ? fmtSize(l.size) : '—'}</b></div>
      <div><span class="mono mut">Diunggah</span><b>${fmtDate(l.created)}</b></div>
      <div><span class="mono mut">Diunduh</span><b>${l.downloads}×</b></div></div>
    <section class="sec"><div class="sec-h"><h2>Langkah</h2><span class="mono mut">(${done}/${l.reqs.length})</span></div>
    <ol class="steps">${l.reqs.map((r, i) => stepHtml(l, r, i)).join('') || '<p class="mut">Tidak ada langkah untuk file ini.</p>'}</ol>
    <div class="dl ${all ? '' : 'locked'}"><div><div class="mono mut">${all ? 'Siap' : 'Terkunci'}</div><h3>${all ? 'Silakan unduh' : 'Selesaikan semua langkah dulu'}</h3></div>
      <button class="btn fill" data-act="download" ${all ? '' : 'disabled'}>Unduh ${l.type === 'file' ? fmtSize(l.size) : 'link'} ↓</button></div></section>`;
  if (v) history.replaceState(null, '', '#/file/' + id);
  clearInterval(tickT);
  tickT = setInterval(tick, 400); tick();
}
function stepHtml(l, r, i) {
  const [name, verb, ab] = PLAT[r.platform] || PLAT.other;
  const real = r.mode !== 'timer';
  let acts;
  if (r.done) acts = '<span class="tick">Terverifikasi</span>';
  else if (real) {
    const path = r.mode === 'discord' ? '/auth/discord' : '/auth/google';
    acts = `<a class="btn sm" href="${esc(r.url)}" target="_blank" rel="noopener">${verb} ↗</a>
      <a class="btn sm acc" href="${path}?link=${l.id}&req=${r.id}">Cek otomatis</a>`;
  } else if (!pending[r.id]) acts = `<button class="btn sm fill" data-act="start" data-r="${r.id}">${verb} sekarang ↗</button>`;
  else acts = `<button class="btn sm acc" data-act="verify" data-r="${r.id}" id="vb${r.id}" disabled>Verifikasi</button>`;
  return `<li class="step ${r.done ? 'done' : ''}"><span class="n">${pad(i + 1)}</span>
    <div><h3>${esc(r.label || name + ' — ' + verb)}</h3><span class="plat ${real ? 'real' : ''}">${ab} · ${name} · ${real ? 'verifikasi otomatis' : 'verifikasi waktu'}</span></div>
    <div class="acts">${acts}</div></li>`;
}
function tick() {
  if (!curFile || !location.hash.startsWith('#/file/')) { clearInterval(tickT); return; }
  for (const [rid, p] of Object.entries(pending)) {
    const b = document.getElementById('vb' + rid); if (!b) continue;
    const left = Math.ceil(S.minWait - (Date.now() - p.t) / 1000);
    if (left > 0) { b.disabled = true; b.textContent = 'Tunggu ' + left + ' dtk'; }
    else if (!p.left) { b.disabled = true; b.textContent = 'Buka tab tugas dulu'; }
    else { b.disabled = false; b.textContent = 'Verifikasi'; }
  }
}

async function pgKabar() {
  const [{ items }, { links }] = await Promise.all([api('/api/announcements'), isOwner() ? api('/api/admin/links') : Promise.resolve({ links: [] })]);
  $('#app').innerHTML = `<div class="page-h"><span class="mono mut">Update</span><h1>Kabar</h1><p>Info file baru dan pengumuman dari Kiko.</p></div>
    ${isOwner() ? `<div class="box" style="margin-bottom:30px"><h2>Kirim pengumuman</h2>
      <label class="f">Judul</label><input id="a_t" maxlength="120">
      <label class="f">Isi</label><textarea id="a_b" rows="3"></textarea>
      <label class="f">Kaitkan dengan file (opsional)</label>
      <select id="a_l"><option value="">— tidak ada —</option>${links.map(l => `<option value="${l.id}">${esc(l.title)}</option>`).join('')}</select>
      <div class="actions"><button class="btn fill" data-act="postann">Kirim</button></div></div>` : ''}
    ${items.length ? items.map(a => `<article class="post"><div class="mono mut">${fmtDate(a.created)}</div><div>
      <h3>${esc(a.title)}</h3><p>${esc(a.body)}</p>
      <div class="actions" style="margin:0">${a.linkId ? `<a class="btn sm" href="#/file/${a.linkId}">Buka: ${esc(a.linkTitle || 'file')} →</a>` : ''}
      ${isOwner() ? `<button class="btn sm red" data-act="delann" data-id="${a.id}">Hapus</button>` : ''}</div></div></article>`).join('')
      : '<div class="empty">Belum ada pengumuman.</div>'}`;
}
function pgDiscord() {
  $('#app').innerHTML = `<div class="disc-hero"><span class="mono" style="color:#b9b1a2">Komunitas</span>
    <h2>Gabung<br>di <em>Discord.</em></h2><p>Info file baru lebih cepat, tanya-jawab, dan ngobrol bareng member lain.</p>
    <div><a class="btn disc" href="${esc(S.settings.discord)}" target="_blank" rel="noopener">Join server ↗</a></div></div>`;
}
function pgLogin() {
  $('#app').innerHTML = `<div class="box narrow"><h2>Masuk</h2>
    <p class="mut" style="margin:0">Untuk Owner dan Member. Akun member dibuat oleh Owner. Tanpa akun pun kamu tetap bisa mengunduh file publik.</p>
    <label class="f">Username</label><input type="text" id="l_u" autocomplete="username">
    <label class="f">Password</label><input type="password" id="l_p" autocomplete="current-password">
    <div class="actions"><button class="btn fill" data-act="login">Masuk</button><a class="btn" href="#/">Lanjut sebagai tamu</a></div></div>`;
  $('#l_p').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

/* ----------------------------- admin ----------------------------- */
function subnav(a) {
  return `<div class="page-h"><span class="mono mut">Panel Owner</span><h1>Kelola</h1></div><div class="subnav">
    ${[['files', 'File & link'], ['members', 'Member'], ['settings', 'Pengaturan']].map(([k, t]) => `<a class="btn sm ${a === k ? 'fill' : ''}" href="#/admin/${k === 'files' ? '' : k}">${t}</a>`).join('')}
    <a class="btn sm" href="#/kabar">Kabar →</a></div>`;
}
async function pgAdminFiles() {
  const { links } = await api('/api/admin/links');
  $('#app').innerHTML = subnav('files') + `<div class="actions" style="margin:0 0 10px"><a class="btn fill" href="#/admin/files/new">+ Tambah file / link</a></div>
    <div class="scroll"><table class="tbl"><tr><th>Judul</th><th>Tipe</th><th>Akses</th><th>Langkah</th><th>Unduh</th><th></th></tr>
    ${links.map(l => `<tr><td><b>${esc(l.title)}</b></td><td class="mono">${l.type === 'file' ? fmtSize(l.size) : 'URL'}</td>
      <td>${l.access === 'member' ? '<span class="pill acc">Member</span>' : '<span class="pill">Publik</span>'}</td><td>${l.reqs.length}</td><td>${l.downloads}</td>
      <td class="act"><a class="btn sm" href="#/admin/files/${l.id}">Edit</a><button class="btn sm red" data-act="dellink" data-id="${l.id}">Hapus</button></td></tr>`).join('')
      || '<tr><td colspan="6" class="mut">Belum ada file.</td></tr>'}</table></div>`;
}
let E = null; // editor state
async function pgEdit(id) {
  let l = null;
  if (id !== 'new') l = (await api('/api/admin/links')).links.find(x => String(x.id) === id);
  E = { id: l ? l.id : null, file: null, hasFile: !!(l && l.fileName), reqs: l ? l.reqs.map(r => ({ ...r })) : [{ id: null, platform: 'youtube', label: '', url: '', target_id: '' }] };
  $('#app').innerHTML = `<a class="back" href="#/admin/">← Kembali</a><div class="page-h" style="padding-bottom:6px"><h1>${l ? 'Edit' : 'Tambah'} file</h1></div>
    <div class="box"><label class="f">Judul</label><input id="e_t" maxlength="140" value="${esc(l ? l.title : '')}">
      <label class="f">Deskripsi</label><textarea id="e_d" maxlength="600">${esc(l ? l.desc : '')}</textarea>
      <div class="grid2"><div><label class="f">Sumber</label><select id="e_type" data-change="type"><option value="file" ${!l || l.type === 'file' ? 'selected' : ''}>Unggah file</option><option value="url" ${l && l.type === 'url' ? 'selected' : ''}>Link eksternal</option></select></div>
      <div><label class="f">Siapa yang bisa akses</label><select id="e_acc"><option value="all" ${!l || l.access === 'all' ? 'selected' : ''}>Semua orang (tamu + member)</option><option value="member" ${l && l.access === 'member' ? 'selected' : ''}>Member saja</option></select></div></div>
      <div id="e_file"><label class="f">File (maks ${S.maxMb} MB) ${l && l.fileName ? '· sekarang: ' + esc(l.fileName) + ' — pilih baru untuk mengganti' : ''}</label><input type="file" id="e_f" data-change="file"></div>
      <div id="e_url" hidden><label class="f">URL tujuan unduhan</label><input type="url" id="e_u" placeholder="https://" value="${esc(l && l.url ? l.url : '')}"></div>
      <div class="sec-h" style="margin-top:34px"><h2 style="font-size:32px">Langkah follow / subscribe</h2></div><div id="e_reqs" style="margin-top:14px"></div>
      <button class="btn sm" data-act="addreq">+ Tambah langkah</button>
      ${!l ? '<label class="check"><input type="checkbox" id="e_ann" checked> Kirim pengumuman otomatis</label>' : ''}
      <div class="actions"><button class="btn fill" data-act="savelink">Simpan</button><a class="btn" href="#/admin/">Batal</a></div></div>`;
  typeSw(); drawReqs();
}
function typeSw() { const u = $('#e_type').value === 'url'; $('#e_file').hidden = u; $('#e_url').hidden = !u; }
function drawReqs() {
  $('#e_reqs').innerHTML = E.reqs.map((r, i) => {
    const auto = (r.platform === 'discord' && S.oauth.discord) || (r.platform === 'youtube' && S.oauth.google);
    const hint = r.platform === 'discord' ? 'ID server Discord (aktifkan Developer Mode → klik kanan server → Copy Server ID)'
      : r.platform === 'youtube' ? 'ID channel YouTube (diawali UC…, ada di youtube.com/account_advanced)' : '';
    return `<div class="reqbox"><div class="g">
      <div><label class="f" style="margin-top:0">Platform</label><select data-i="${i}" data-f="platform">${Object.entries(PLAT).map(([k, v]) => `<option value="${k}" ${r.platform === k ? 'selected' : ''}>${v[0]} — ${v[1]}</option>`).join('')}</select></div>
      <div><label class="f" style="margin-top:0">Label tombol</label><input data-i="${i}" data-f="label" placeholder="Subscribe channel kami" value="${esc(r.label)}"></div>
      <div><label class="f" style="margin-top:0">URL profil / channel / invite</label><input data-i="${i}" data-f="url" placeholder="https://" value="${esc(r.url)}"></div></div>
      <div class="g3">${hint ? `<div><label class="f">${hint}</label><input data-i="${i}" data-f="target_id" value="${esc(r.target_id)}" placeholder="${auto ? 'Isi untuk verifikasi otomatis' : 'Opsional (server belum diatur untuk OAuth)'}"></div>` : '<div class="mono mut">Verifikasi waktu (10 detik + pindah tab)</div>'}
      <button class="btn sm red" data-act="delreq" data-i="${i}">Hapus</button></div></div>`;
  }).join('');
}
async function saveLink(btn) {
  const type = $('#e_type').value;
  const data = { title: $('#e_t').value, desc: $('#e_d').value, type, access: $('#e_acc').value, url: $('#e_u').value, announce: !!($('#e_ann') && $('#e_ann').checked), reqs: E.reqs, file: null };
  const label = btn.textContent; btn.disabled = true;
  try {
    if (type === 'file' && E.file) {
      if (E.file.size > S.maxMb * 1048576) throw new Error(`File terlalu besar (maks ${S.maxMb} MB)`);
      btn.textContent = 'Mengunggah…';
      const u = await api('/api/admin/upload-url', { method: 'POST', body: { size: E.file.size } });
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
      const sb = createClient(u.url, u.anonKey, { auth: { persistSession: false } });
      const { error } = await sb.storage.from(u.bucket).uploadToSignedUrl(u.key, u.token, E.file);
      if (error) throw new Error('Gagal mengunggah: ' + error.message);
      data.file = { key: u.key, name: E.file.name, size: E.file.size };
    }
    btn.textContent = 'Menyimpan…';
    await api('/api/admin/links' + (E.id ? '/' + E.id : ''), { method: E.id ? 'PUT' : 'POST', body: data });
    toast('Tersimpan'); go('/admin/');
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = label; }
}
async function pgMembers() {
  const { members } = await api('/api/admin/members');
  $('#app').innerHTML = subnav('members') + `<div class="box" style="margin-bottom:28px"><h2>Buat akun member</h2>
    <div class="grid2"><div><label class="f">Username</label><input id="m_u" autocomplete="off"></div><div><label class="f">Password (min 6)</label><input id="m_p" autocomplete="off"></div></div>
    <div class="actions"><button class="btn fill" data-act="addmember">Buat member</button></div></div>
    <div class="scroll"><table class="tbl"><tr><th>Username</th><th>Dibuat</th><th></th></tr>
    ${members.map(m => `<tr><td><b>${esc(m.username)}</b></td><td class="mono">${fmtDate(m.created)}</td><td class="act"><button class="btn sm" data-act="resetpw" data-id="${m.id}">Reset password</button><button class="btn sm red" data-act="delmember" data-id="${m.id}">Hapus</button></td></tr>`).join('')
      || '<tr><td colspan="3" class="mut">Belum ada member.</td></tr>'}</table></div>`;
}
function pgSettings() {
  const s = S.settings;
  $('#app').innerHTML = subnav('settings') + `<div class="grid2"><div class="box"><h2>Situs</h2>
      <label class="f">Nama situs</label><input id="s_n" value="${esc(s.siteName)}">
      <label class="f">Tagline</label><input id="s_t" value="${esc(s.tagline)}">
      <label class="f">Tentang</label><textarea id="s_a" rows="3">${esc(s.about)}</textarea>
      <label class="f">Link Discord</label><input id="s_d" value="${esc(s.discord)}">
      <div class="actions"><button class="btn fill" data-act="savesettings">Simpan</button></div></div>
    <div class="box"><h2>Ganti password</h2>
      <label class="f">Password lama</label><input type="password" id="p_o" autocomplete="current-password">
      <label class="f">Password baru (min 8)</label><input type="password" id="p_n" autocomplete="new-password">
      <div class="actions"><button class="btn fill" data-act="chgpw">Ganti password</button></div>
      <p class="mono mut" style="margin-top:26px">Verifikasi otomatis · Discord: ${S.oauth.discord ? 'aktif' : 'belum diatur'} · YouTube: ${S.oauth.google ? 'aktif' : 'belum diatur'}</p></div></div>`;
}

/* ----------------------------- actions ----------------------------- */
async function doLogin() {
  try { const r = await api('/api/login', { method: 'POST', body: { username: $('#l_u').value, password: $('#l_p').value } }); S.me = r.me; toast('Selamat datang, ' + r.me.username); go(r.me.role === 'owner' ? '/admin/' : '/'); render(); }
  catch (e) { toast(e.message); }
}
const val = id => $('#' + id).value;
const A = {
  async login() { await doLogin(); },
  async logout() { await api('/api/logout', { method: 'POST' }); S.me = null; toast('Sudah keluar'); go('/'); render(); },
  async start(el) {
    const rid = el.dataset.r, r = curFile.reqs.find(x => String(x.id) === rid);
    await api(`/api/links/${curFile.id}/reqs/${rid}/start`, { method: 'POST' });
    pending[rid] = { t: Date.now(), left: false };
    window.open(r.url, '_blank', 'noopener');
    document.querySelector(`[data-r="${rid}"]`).closest('.step').outerHTML = stepHtml(curFile, r, curFile.reqs.indexOf(r));
    tick();
  },
  async verify(el) {
    const rid = el.dataset.r;
    try { await api(`/api/links/${curFile.id}/reqs/${rid}/verify`, { method: 'POST', body: { left: !!(pending[rid] && pending[rid].left) } }); delete pending[rid]; toast('Langkah terverifikasi'); await pgFile(curFile.id, new URLSearchParams()); }
    catch (e) { toast(e.message); }
  },
  async download() {
    try { const r = await api(`/api/links/${curFile.id}/download`, { method: 'POST' }); if (r.external) window.open(r.url, '_blank', 'noopener'); else location.href = r.url; toast('Unduhan dimulai'); }
    catch (e) { toast(e.message); }
  },
  async postann() { try { await api('/api/admin/announcements', { method: 'POST', body: { title: val('a_t'), body: val('a_b'), linkId: val('a_l') } }); toast('Terkirim'); await pgKabar(); } catch (e) { toast(e.message); } },
  async delann(el) { if (!confirm('Hapus pengumuman ini?')) return; await api('/api/admin/announcements/' + el.dataset.id, { method: 'DELETE' }); await pgKabar(); },
  async dellink(el) { if (!confirm('Hapus file ini beserta file di server?')) return; await api('/api/admin/links/' + el.dataset.id, { method: 'DELETE' }); await pgAdminFiles(); },
  addreq() { E.reqs.push({ id: null, platform: 'instagram', label: '', url: '', target_id: '' }); drawReqs(); },
  delreq(el) { E.reqs.splice(+el.dataset.i, 1); drawReqs(); },
  savelink: el => saveLink(el),
  async addmember() { try { await api('/api/admin/members', { method: 'POST', body: { username: val('m_u'), password: val('m_p') } }); toast('Member dibuat'); await pgMembers(); } catch (e) { toast(e.message); } },
  async resetpw(el) { const p = prompt('Password baru (min 6):'); if (!p) return; try { await api('/api/admin/members/' + el.dataset.id, { method: 'PUT', body: { password: p } }); toast('Password diubah'); } catch (e) { toast(e.message); } },
  async delmember(el) { if (!confirm('Hapus member ini?')) return; await api('/api/admin/members/' + el.dataset.id, { method: 'DELETE' }); await pgMembers(); },
  async savesettings() {
    try { await api('/api/admin/settings', { method: 'PUT', body: { siteName: val('s_n'), tagline: val('s_t'), about: val('s_a'), discord: val('s_d') } }); Object.assign(S, await api('/api/bootstrap')); toast('Tersimpan'); render(); }
    catch (e) { toast(e.message); }
  },
  async chgpw() { try { await api('/api/admin/password', { method: 'PUT', body: { current: val('p_o'), password: val('p_n') } }); toast('Password diganti'); $('#p_o').value = $('#p_n').value = ''; } catch (e) { toast(e.message); } }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = A[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  Promise.resolve(fn(el, e)).catch(err => toast(err.message));
});
document.addEventListener('input', e => {
  const t = e.target; if (t.dataset.f !== undefined && E) E.reqs[+t.dataset.i][t.dataset.f] = t.value;
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.f === 'platform' && E) { E.reqs[+t.dataset.i].platform = t.value; drawReqs(); }
  else if (t.dataset.change === 'type') typeSw();
  else if (t.dataset.change === 'file') E.file = t.files[0] || null;
});

boot();
