// —— Utilities ——
const STORAGE_KEY = 'bookmarkGroups.v3'; // new schema: groups keyed by random id
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
const uid = () => (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));

function parseURL(u){ try{ return new URL(u); }catch{ return null; } }
function hostFrom(url){ const u = parseURL(url); return u ? u.hostname : ''; }

// Highlighter
function escapeHtml(s){ return (s||'').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function makeHighlighter(query){
  const tokens = (query||'').trim().toLowerCase().split(/\s+/).filter(Boolean).map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  if(tokens.length===0) return (s)=>escapeHtml(s||'');
  const rx = new RegExp('(' + tokens.join('|') + ')','ig');
  return (s)=> escapeHtml(s||'').replace(rx, m=>`<mark>${escapeHtml(m)}</mark>`);
}

// —— Data Layer ——
/**
 * groups: {
 *   [groupId]: { id, title, desc, links:[{id,url,title,note,createdAt,host}], tags:Set<string>, createdAt }
 * }
 */
const store = { groups: {} };

// Migrations (v1 -> v2 -> v3)
function migrateFromV2IfAny(){
  if (localStorage.getItem(STORAGE_KEY)) return;
  const v2 = localStorage.getItem('bookmarkGroups.v2');
  if(!v2) return migrateFromV1IfAny();
  try{
    const d = JSON.parse(v2);
    const migrated = { groups: {} };
    for(const oldId in d.groups){
      const g = d.groups[oldId];
      const newId = uid();
      migrated.groups[newId] = {
        id: newId,
        title: g.title || g.host || 'Untitled',
        desc: g.desc || '',
        tags: g.tags || [],
        createdAt: Date.now(),
        links: (g.links||[]).map(l => ({...l, host: hostFrom(l.url)})),
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  }catch(e){ console.warn('v2 migration failed', e); }
}
function migrateFromV1IfAny(){
  const v1 = localStorage.getItem('bookmarkGroups.v1');
  if(!v1) return;
  try{
    const d = JSON.parse(v1);
    const migrated = { groups: {} };
    for(const oldId in d.groups){
      const g = d.groups[oldId];
      const newId = uid();
      migrated.groups[newId] = {
        id: newId,
        title: g.title || g.host || 'Untitled',
        desc: '',
        tags: g.tags || [],
        createdAt: Date.now(),
        links: (g.links||[]).map(l => ({...l, host: hostFrom(l.url)})),
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  }catch(e){ console.warn('v1 migration failed', e); }
}

function load(){
  migrateFromV2IfAny();
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  try{
    const data = JSON.parse(raw);
    if(data && data.groups){
      for(const gId in data.groups){
        const g = data.groups[gId];
        g.tags = new Set(g.tags || []);
      }
      Object.assign(store, data);
    }
  }catch(e){ console.warn('Failed to load data', e); }
}
function save(){
  const serializable = { groups: {} };
  for(const k in store.groups){
    const g = store.groups[k];
    serializable.groups[k] = { ...g, tags: [...(g.tags||new Set())] };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

function newCard({ title, desc }){
  const id = uid();
  store.groups[id] = { id, title: title || 'Untitled', desc: desc || '', links: [], tags: new Set(), createdAt: Date.now() };
  save();
  return store.groups[id];
}

function addLink({ groupId, url, title = '', note = '' }){
  if(!store.groups[groupId]) throw new Error('Invalid destination card.');
  const g = store.groups[groupId];
  const exists = g.links.some(l => l.url === url);
  if(exists) return { added:false, reason:'duplicate' };
  const link = { id: uid(), url, title: title || url, note, createdAt: Date.now(), host: hostFrom(url) };
  g.links.unshift(link);
  note.split(',').map(s=>s.trim()).filter(Boolean).forEach(t => g.tags.add(t));
  save();
  return { added:true, link, group: g };
}

function removeLink(groupId, linkId){
  const g = store.groups[groupId]; if(!g) return;
  g.links = g.links.filter(l => l.id !== linkId);
  // Don't auto-delete empty card anymore
  save();
}

function updateLink(groupId, linkId, patch){
  const g = store.groups[groupId]; if(!g) return;
  const idx = g.links.findIndex(l => l.id === linkId); if(idx===-1) return;
  const next = { ...g.links[idx], ...patch };
  if(patch.url) next.host = hostFrom(patch.url);
  g.links[idx] = next;
  if(patch.note){ patch.note.split(',').map(s=>s.trim()).filter(Boolean).forEach(t => g.tags.add(t)); }
  save();
}

function updateCard(groupId, patch){
  const g = store.groups[groupId]; if(!g) return;
  store.groups[groupId] = { ...g, ...patch };
  save();
}

function deleteGroup(groupId){ delete store.groups[groupId]; save(); }

function exportJSON(){
  const blob = new Blob([localStorage.getItem(STORAGE_KEY) || '{"groups":{}}'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bookmarks-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1500);
}

function importJSON(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        if(!data || !data.groups) throw new Error('Invalid backup format');
        for(const id in data.groups){
          const g = data.groups[id];
          const destId = g.id || id || uid();
          if(!store.groups[destId]) store.groups[destId] = { id: destId, title: g.title||'Untitled', desc: g.desc||'', links: [], tags: new Set(), createdAt: g.createdAt||Date.now() };
          const dest = store.groups[destId];
          const urls = new Set(dest.links.map(l=>l.url));
          (g.links||[]).forEach(l=>{ if(!urls.has(l.url)) dest.links.push({ ...l, host: l.host || hostFrom(l.url) }); });
          (g.tags||[]).forEach(t=>dest.tags.add(t));
        }
        save(); resolve();
      }catch(e){ reject(e); }
    };
    reader.readAsText(file);
  });
}

// —— Rendering ——
const grid = $('#cardGrid');
const empty = $('#emptyState');
const stats = $('#searchStats');

const linkModal = $('#linkModal');
const linkForm = $('#linkForm');
const mCard = $('#mCard');
const mUrl = $('#mUrl');
const mTitle = $('#mTitle');
const mNote = $('#mNote');
const modalTitle = $('#modalTitle');

const cardModal = $('#cardModal');
const cardForm = $('#cardForm');
const cTitle = $('#cTitle');
const cDesc = $('#cDesc');
const cardModalTitle = $('#cardModalTitle');

const confirmModal = $('#confirmModal');
const confirmTitle = $('#confirmTitle');
const confirmMessage = $('#confirmMessage');
const confirmForm = $('#confirmForm');

let currentQuery = '';
let highlighter = makeHighlighter('');

function render(){
  grid.innerHTML = '';
  const groups = Object.values(store.groups).sort((a,b)=> (a.title||'').localeCompare(b.title||''));
  if(groups.length === 0){ empty.classList.remove('hidden'); stats.textContent=''; return; } else { empty.classList.add('hidden'); }
  let totalLinkMatches = 0;

  groups.forEach(g => {
    const { node, cardMatch, linkMatchesCount } = renderCard(g);
    if(currentQuery){
      if(cardMatch || linkMatchesCount > 0){
        grid.appendChild(node);
        totalLinkMatches += linkMatchesCount;
      }
    } else {
      grid.appendChild(node);
    }
  });

  if(currentQuery){
    const cardsShown = grid.children.length;
    stats.textContent = `${cardsShown} card${cardsShown!==1?'s':''} • ${totalLinkMatches} matching link${totalLinkMatches!==1?'s':''}`;
  } else {
    stats.textContent = '';
  }
}

function renderCard(g){
  const node = document.importNode($('#cardTpl').content, true).firstElementChild;
  node.dataset.groupId = g.id;

  const titleText = g.title || '';
  const descText = g.desc || '';

  const titleMatch = currentQuery && titleText.toLowerCase().includes(currentQuery.toLowerCase());
  const descMatch = currentQuery && descText.toLowerCase().includes(currentQuery.toLowerCase());

  $('.title', node).innerHTML = currentQuery ? highlighter(titleText) : escapeHtml(titleText);
  $('.desc', node).innerHTML = currentQuery ? highlighter(descText) : escapeHtml(descText);

  const list = $('.links', node);
  let linkMatches = 0;
  g.links.forEach(l => {
    const combo = [l.title || '', l.url || '', l.note || '', l.host || ''].join(' ').toLowerCase();
    const isMatch = currentQuery ? combo.includes(currentQuery.toLowerCase()) : true;
    if(isMatch){ list.appendChild(renderLink(g, l)); linkMatches++; }
  });

  const details = $('.linkBlock', node);
  const pill = details.querySelector('[data-role="match-pill"]');
  if(currentQuery){
    if(linkMatches > 0){
      details.open = true;
      pill.textContent = `${linkMatches} match${linkMatches!==1?'es':''}`;
      pill.classList.remove('hidden');
    } else {
      pill.classList.add('hidden');
      details.open = false;
    }
  } else {
    pill.classList.add('hidden');
    details.open = false;
  }

  $('.deleteCard', node).addEventListener('click', async () => {
    const ok = await confirmDialog('Delete card', `Delete “${g.title || 'this card'}”? This removes ${g.links.length} link(s).`);
    if(ok){ deleteGroup(g.id); render(); }
  });

  $('.addInCard', node).addEventListener('click', () => {
    openLinkModal({ mode:'add', groupId: g.id });
  });

  $('.editCard', node).addEventListener('click', () => {
    openCardModal({ mode:'edit', group: g });
  });

  return { node, cardMatch: !!(titleMatch || descMatch), linkMatchesCount: linkMatches };
}

function renderLink(g, l){
  const node = document.importNode($('#linkTpl').content, true).firstElementChild;
  node.dataset.linkId = l.id;
  const a = $('.anchor', node);

  const aTitle = l.title || l.url;
  a.href = l.url;
  a.innerHTML = currentQuery ? highlighter(aTitle) : escapeHtml(aTitle);

  const when = new Date(l.createdAt || Date.now());
  const metaParts = [l.host || hostFrom(l.url), when.toLocaleString()];
  if(l.note) metaParts.push(l.note);
  const metaText = metaParts.join(' • ');
  $('.meta', node).innerHTML = currentQuery ? highlighter(metaText) : escapeHtml(metaText);

  $('.removeLink', node).addEventListener('click', async () => {
    const ok = await confirmDialog('Remove link', 'Remove this link?');
    if(ok){ removeLink(g.id, l.id); render(); }
  });

  $('.editLink', node).addEventListener('click', () => {
    openLinkModal({ mode:'edit', groupId: g.id, link: l });
  });

  return node;
}

// —— Modal helpers ——
function populateCardSelect(selectedId=''){
  mCard.innerHTML = '';
  const opt = document.createElement('option');
  opt.value = ''; opt.textContent = '— Choose a card —';
  mCard.appendChild(opt);
  Object.values(store.groups).sort((a,b)=> (a.title||'').localeCompare(b.title||'')).forEach(g => {
    const o = document.createElement('option');
    o.value = g.id; o.textContent = g.title || 'Untitled';
    if(g.id === selectedId) o.selected = true;
    mCard.appendChild(o);
  });
}

function openLinkModal({ mode, groupId='', link=null }){
  linkForm.dataset.mode = mode;
  linkForm.dataset.groupId = groupId || '';
  linkForm.dataset.linkId = link?.id || '';
  populateCardSelect(groupId);
  if(mode === 'add'){
    modalTitle.textContent = 'Add Link';
    mUrl.value = ''; mTitle.value = ''; mNote.value = '';
  } else {
    modalTitle.textContent = 'Edit Link';
    mUrl.value = link?.url || '';
    mTitle.value = link?.title || '';
    mNote.value = link?.note || '';
  }
  linkModal.showModal();
  (mUrl).focus();
}

function openCardModal({ mode, group=null }){
  cardForm.dataset.mode = mode;
  cardForm.dataset.groupId = group?.id || '';
  if(mode === 'add'){
    cardModalTitle.textContent = 'New Card';
    cTitle.value = ''; cDesc.value = '';
  } else {
    cardModalTitle.textContent = 'Edit Card';
    cTitle.value = group?.title || '';
    cDesc.value = group?.desc || '';
  }
  cardModal.showModal();
  cTitle.focus();
}

function confirmDialog(title, message){
  return new Promise(resolve=>{
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmModal.showModal();
    const onClose = () => {
      confirmModal.close();
      confirmForm.removeEventListener('submit', onSubmit);
      confirmForm.removeEventListener('reset', onReset);
    };
    const onSubmit = (e) => { e.preventDefault(); onClose(); resolve(true); };
    const onReset = (e) => { e.preventDefault(); onClose(); resolve(false); };
    confirmForm.addEventListener('submit', onSubmit, { once:true });
    confirmForm.addEventListener('reset', onReset, { once:true });
  });
}

// —— Interactions ——
$('#openAddModal').addEventListener('click', () => openLinkModal({ mode:'add' }));
$('#newCardBtn').addEventListener('click', () => openCardModal({ mode:'add' }));

linkForm.addEventListener('reset', ()=> linkModal.close());
cardForm.addEventListener('reset', ()=> cardModal.close());

linkForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const mode = linkForm.dataset.mode;
  let groupId = linkForm.dataset.groupId || mCard.value;
  const linkId = linkForm.dataset.linkId;
  const url = mUrl.value.trim();
  if(!parseURL(url)) { alert('Please enter a valid URL'); return; }
  const title = mTitle.value.trim();
  const note = mNote.value.trim();

  if(mode === 'add'){
    if(!groupId){
      // If no destination chosen, create a quick card named by host
      const card = newCard({ title: hostFrom(url) || 'New Card', desc: '' });
      groupId = card.id;
    }
    const res = addLink({ groupId, url, title, note });
    if(!res.added && res.reason==='duplicate') alert('This exact URL already exists in the destination card.');
  } else {
    updateLink(groupId, linkId, { url, title, note });
  }
  linkModal.close();
  render();
});

cardForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const mode = cardForm.dataset.mode;
  const groupId = cardForm.dataset.groupId;
  const title = cTitle.value.trim();
  const desc = cDesc.value.trim();
  if(!title){ alert('Title is required.'); return; }
  if(mode === 'add'){
    newCard({ title, desc });
  } else {
    updateCard(groupId, { title, desc });
  }
  cardModal.close();
  render();
});

$('#exportBtn').addEventListener('click', exportJSON);

$('#importFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0]; if(!file) return;
  try{ await importJSON(file); alert('Backup restored and merged.'); render(); }
  catch(err){ alert('Failed to restore: '+ err.message); }
  e.target.value = '';
});

$('#clearAllBtn').addEventListener('click', async () => {
  const ok = await confirmDialog('Clear all', 'This will remove ALL cards and links. Continue?');
  if(ok){
    localStorage.removeItem(STORAGE_KEY);
    store.groups = {}; render();
  }
});

// Debounced live search
const searchInput = $('#searchInput');
let t;
searchInput.addEventListener('input', () => {
  const val = searchInput.value;
  clearTimeout(t);
  t = setTimeout(()=>{
    currentQuery = val.trim();
    highlighter = makeHighlighter(currentQuery);
    render();
  }, 120);
});

// —— Init ——
load();
render();