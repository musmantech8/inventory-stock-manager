// Inventory & Stock Manager — front-end demo
// Mirrors the Oracle tables in /sql (INV_PRODUCTS, INV_STOCK_MOVEMENTS). Data is kept in localStorage.

const STORE_KEY = 'inv-data-v1';
const CATEGORIES = ['Accessories', 'Computers', 'Furniture', 'Networking', 'Stationery'];

const SEED_PRODUCTS = [
  { sku: 'ACC-101', name: 'Wireless keyboard', category: 'Accessories', price: 4500, qty: 34, reorder: 15, supplier: 'TechLink' },
  { sku: 'ACC-102', name: 'USB-C hub', category: 'Accessories', price: 6200, qty: 8, reorder: 10, supplier: 'TechLink' },
  { sku: 'ACC-103', name: 'Laptop sleeve', category: 'Accessories', price: 2800, qty: 17, reorder: 10, supplier: 'BagHouse' },
  { sku: 'CMP-201', name: 'Business laptop 14"', category: 'Computers', price: 185000, qty: 6, reorder: 5, supplier: 'CompuMart' },
  { sku: 'CMP-202', name: '24" monitor', category: 'Computers', price: 42000, qty: 12, reorder: 6, supplier: 'CompuMart' },
  { sku: 'FUR-301', name: 'Monitor stand', category: 'Furniture', price: 5500, qty: 52, reorder: 20, supplier: 'OfficeCo' },
  { sku: 'FUR-302', name: 'Ergonomic chair', category: 'Furniture', price: 38000, qty: 3, reorder: 5, supplier: 'OfficeCo' },
  { sku: 'NET-401', name: 'Wi-Fi router', category: 'Networking', price: 14500, qty: 0, reorder: 4, supplier: 'NetPro' },
  { sku: 'NET-402', name: 'Cat6 cable 3m', category: 'Networking', price: 650, qty: 140, reorder: 50, supplier: 'NetPro' },
  { sku: 'STA-501', name: 'A4 paper ream', category: 'Stationery', price: 1450, qty: 60, reorder: 30, supplier: 'PaperPlus' },
].map((p, i) => ({ id: i + 1, ...p }));

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const SEED_MOVES = [
  { productId: 2, type: 'OUT', qty: 6, date: daysAgo(0), note: 'Issued to IT department' },
  { productId: 6, type: 'IN', qty: 30, date: daysAgo(1), note: 'Purchase order #1042' },
  { productId: 8, type: 'OUT', qty: 4, date: daysAgo(2), note: 'New branch setup' },
  { productId: 7, type: 'OUT', qty: 2, date: daysAgo(3), note: 'Finance office' },
  { productId: 9, type: 'IN', qty: 100, date: daysAgo(5), note: 'Purchase order #1038' },
].map((m, i) => ({ id: i + 1, ...m }));

const $ = (s) => document.querySelector(s);
const fmt = new Intl.NumberFormat('en-PK');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);

let { products, moves } = load();
let sort = { key: 'sku', dir: 1 };

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    if (d && Array.isArray(d.products)) return d;
  } catch { /* ignore */ }
  return { products: structuredClone(SEED_PRODUCTS), moves: structuredClone(SEED_MOVES) };
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify({ products, moves })); } catch { /* ignore */ } }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

// Same rule as the INV_LOW_STOCK_V view
const level = (p) => (p.qty <= 0 ? 'out' : p.qty <= p.reorder ? 'low' : 'ok');
const levelBadge = (p) => ({ ok: '<span class="badge b-green">In stock</span>', low: '<span class="badge b-amber">Low</span>', out: '<span class="badge b-red">Out</span>' }[level(p)]);
const value = (p) => p.qty * p.price;

function renderKpis() {
  const total = products.reduce((s, p) => s + value(p), 0);
  const low = products.filter((p) => level(p) !== 'ok').length;
  const units = products.reduce((s, p) => s + Number(p.qty), 0);
  const todayMoves = moves.filter((m) => m.date === today()).length;
  $('#kpis').innerHTML = [
    ['Products', products.length, `${fmt.format(units)} units on hand`],
    ['Stock value', `₨ ${fmt.format(total)}`, 'at unit price'],
    ['Need reorder', low, low ? 'low or out of stock' : 'all levels healthy'],
    ['Movements today', todayMoves, `${moves.length} recorded in total`],
  ].map(([l, v, s]) => `<div class="kpi"><span>${l}</span><strong>${v}</strong><em>${s}</em></div>`).join('');
}

function renderCharts() {
  const byCat = CATEGORIES.map((c) => [c, products.filter((p) => p.category === c).reduce((s, p) => s + value(p), 0)]);
  const max = Math.max(1, ...byCat.map((c) => c[1]));
  $('#catBars').innerHTML = byCat.map(([c, v]) =>
    `<div class="bar-row"><span>${c}</span><div class="progress"><span style="width:${(v / max) * 100}%"></span></div><b style="width:auto">${v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.round(v / 1000) + 'k'}</b></div>`).join('');

  const low = products.filter((p) => level(p) !== 'ok').sort((a, b) => a.qty - b.qty);
  $('#lowStock').innerHTML = low.length ? low.map((p) =>
    `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
       <div><div class="cell-main">${esc(p.name)}</div><div class="cell-sub">${esc(p.sku)} · reorder at ${p.reorder}</div></div>
       <div style="display:flex;gap:8px;align-items:center">${levelBadge(p)}<button class="btn btn-sm" data-restock="${p.id}">Restock</button></div>
     </div>`).join('') : '<div class="cell-sub">All products are above their reorder level.</div>';
}

function filtered() {
  const q = $('#search').value.trim().toLowerCase();
  const cat = $('#catFilter').value;
  const lv = $('#levelFilter').value;
  const val = (p, k) => (k === 'value' ? value(p) : p[k]);
  return products
    .filter((p) => (!cat || p.category === cat) && (!lv || level(p) === lv))
    .filter((p) => !q || `${p.sku} ${p.name} ${p.supplier}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const va = val(a, sort.key), vb = val(b, sort.key);
      return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sort.dir;
    });
}

function renderTable() {
  const list = filtered();
  $('#count').textContent = list.length;
  $('#rows').innerHTML = list.length ? list.map((p) => `
    <tr>
      <td><b>${esc(p.sku)}</b></td>
      <td><div class="cell-main">${esc(p.name)}</div><div class="cell-sub">${esc(p.supplier || '—')}</div></td>
      <td>${esc(p.category)}</td>
      <td>${fmt.format(p.qty)}</td>
      <td>${fmt.format(p.price)}</td>
      <td>${fmt.format(value(p))}</td>
      <td>${levelBadge(p)}</td>
      <td><div class="actions">
        <button class="btn btn-sm" data-move="${p.id}">In / out</button>
        <button class="btn btn-sm" data-edit="${p.id}">Edit</button>
        <button class="btn btn-sm btn-danger" data-del="${p.id}">Delete</button>
      </div></td>
    </tr>`).join('') : '<tr><td colspan="8" class="empty">No products match your filters.</td></tr>';
  document.querySelectorAll('th[data-sort]').forEach((th) => {
    th.classList.toggle('asc', th.dataset.sort === sort.key && sort.dir === 1);
    th.classList.toggle('desc', th.dataset.sort === sort.key && sort.dir === -1);
  });
}

function renderMoves() {
  const recent = [...moves].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 8);
  $('#moves').innerHTML = recent.length ? recent.map((m) => {
    const p = products.find((x) => x.id === m.productId);
    return `<tr><td>${m.date}</td><td>${esc(p ? p.name : 'Deleted product')}</td>
      <td>${m.type === 'IN' ? '<span class="badge b-green">IN</span>' : '<span class="badge b-blue">OUT</span>'}</td>
      <td>${m.type === 'IN' ? '+' : '−'}${fmt.format(m.qty)}</td><td>${esc(m.note || '')}</td></tr>`;
  }).join('') : '<tr><td colspan="5" class="empty">No movements yet.</td></tr>';
}

function render() { renderKpis(); renderCharts(); renderTable(); renderMoves(); }

// ---------- Product form ----------
const modal = $('#modal');
const form = $('#form');

function openForm(p) {
  form.reset();
  $('#modalTitle').textContent = p ? 'Edit product' : 'Add product';
  const data = p || { qty: 0, reorder: 10, category: CATEGORIES[0] };
  for (const [k, v] of Object.entries(data)) if (form.elements[k]) form.elements[k].value = v;
  if (!p) form.elements.id.value = '';
  form.elements.qty.disabled = Boolean(p); // quantity changes go through stock movements
  modal.classList.add('open');
  form.elements.sku.focus();
}

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  d.sku = d.sku.trim().toUpperCase();
  ['price', 'reorder', 'qty'].forEach((k) => { if (k in d) d[k] = Number(d[k]); });
  if (products.some((p) => p.sku === d.sku && String(p.id) !== d.id)) { toast('That SKU already exists'); return; }
  if (d.id) {
    const p = products.find((x) => String(x.id) === d.id);
    Object.assign(p, { ...d, id: p.id, qty: p.qty });
    toast('Product updated');
  } else {
    const id = Math.max(0, ...products.map((p) => p.id)) + 1;
    products.push({ ...d, id });
    if (d.qty > 0) moves.push({ id: Math.max(0, ...moves.map((m) => m.id)) + 1, productId: id, type: 'IN', qty: d.qty, date: today(), note: 'Opening stock' });
    toast('Product added');
  }
  save(); modal.classList.remove('open'); render();
});

// ---------- Stock movement form ----------
const moveModal = $('#moveModal');
const moveForm = $('#moveForm');

function openMove(productId, type = 'IN') {
  moveForm.reset();
  moveForm.elements.productId.innerHTML = products.map((p) => `<option value="${p.id}">${esc(p.sku)} — ${esc(p.name)} (${p.qty} on hand)</option>`).join('');
  if (productId) moveForm.elements.productId.value = productId;
  moveForm.elements.type.value = type;
  moveModal.classList.add('open');
  moveForm.elements.qty.focus();
}

// Same rule as the INV_STOCK_MOVEMENTS_BI trigger: stock can never go below zero
moveForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const d = Object.fromEntries(new FormData(moveForm));
  const p = products.find((x) => x.id === Number(d.productId));
  const qty = Number(d.qty);
  if (d.type === 'OUT' && qty > p.qty) { toast(`Only ${p.qty} units of ${p.name} on hand`); return; }
  p.qty += d.type === 'IN' ? qty : -qty;
  moves.push({ id: Math.max(0, ...moves.map((m) => m.id)) + 1, productId: p.id, type: d.type, qty, date: today(), note: d.note.trim() });
  save(); moveModal.classList.remove('open'); render();
  toast(`${d.type === 'IN' ? 'Received' : 'Issued'} ${qty} × ${p.name}`);
  if (level(p) !== 'ok') setTimeout(() => toast(`${p.name} is now below its reorder level`), 2300);
});

// ---------- Events ----------
[modal, moveModal].forEach((m) => m.addEventListener('click', (ev) => {
  if (ev.target === m || ev.target.hasAttribute('data-close')) m.classList.remove('open');
}));
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { modal.classList.remove('open'); moveModal.classList.remove('open'); } });

document.body.addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  const id = Number(b.dataset.edit || b.dataset.del || b.dataset.move || b.dataset.restock);
  if (!id) return;
  const p = products.find((x) => x.id === id);
  if (b.dataset.move) openMove(id);
  if (b.dataset.restock) openMove(id, 'IN');
  if (b.dataset.edit) openForm(p);
  if (b.dataset.del && confirm(`Delete ${p.name}?`)) { products = products.filter((x) => x.id !== id); save(); render(); toast('Product deleted'); }
});

document.querySelectorAll('th[data-sort]').forEach((th) => th.addEventListener('click', () => {
  sort = { key: th.dataset.sort, dir: sort.key === th.dataset.sort ? -sort.dir : 1 };
  renderTable();
}));
['#search', '#catFilter', '#levelFilter'].forEach((s) => $(s).addEventListener('input', renderTable));
$('#addBtn').addEventListener('click', () => openForm());
$('#moveBtn').addEventListener('click', () => openMove());
$('#resetBtn').addEventListener('click', () => {
  products = structuredClone(SEED_PRODUCTS); moves = structuredClone(SEED_MOVES);
  save(); render(); toast('Demo data restored');
});

const opts = CATEGORIES.map((c) => `<option>${c}</option>`).join('');
$('#catFilter').insertAdjacentHTML('beforeend', opts);
form.elements.category.innerHTML = opts;

render();
