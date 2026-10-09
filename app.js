const { firebaseConfig, STORE } = window.APP_CONFIG;

const CATEGORIES = window.APP_CONFIG.CATEGORIES || ["كابينة", "متوسطة", "كبيرة", "حقائب ظهر", "أطقم"];
const STATUSES = ["جديد", "قيد التجهيز", "تم الشحن", "تم التسليم", "ملغي"];
const DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("YOUR");

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Number(n || 0).toLocaleString("ar-EG") + " " + STORE.currency;
const toEnDigits = (s) => String(s).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const safeColor = (c) => (/^#[0-9a-f]{6}$/i.test(c) ? c : "#2F6FED");
const safeImg = (u) => (/^(https:\/\/|data:image\/)/i.test(u || "") ? u : "");

function bagSVG(color, category) {
  const c = safeColor(color);
  const dk = "#16233B", sun = "#FFC428", rib = "rgba(0,0,0,.18)";
  const suitcase = (x, y, w, h, fill) =>
    `<rect x='${x + w * .32}' y='${y - 26}' width='${w * .36}' height='28' rx='9' fill='none' stroke='${dk}' stroke-width='8'/>` +
    `<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='22' fill='${fill}'/>` +
    `<g stroke='${rib}' stroke-width='6' stroke-linecap='round'>${[.28, .5, .72].map((k) => `<path d='M${x + w * k} ${y + 24}v${h - 56}'/>`).join("")}</g>` +
    `<circle cx='${x + w * .25}' cy='${y + h + 12}' r='8' fill='${dk}'/><circle cx='${x + w * .75}' cy='${y + h + 12}' r='8' fill='${dk}'/>`;
  let art;
  if (category === "حقائب ظهر") {
    art = `<path d='M112 70q38-44 76 0' fill='none' stroke='${dk}' stroke-width='9' stroke-linecap='round'/>` +
      `<rect x='72' y='62' width='156' height='196' rx='46' fill='${c}'/>` +
      `<rect x='98' y='168' width='104' height='70' rx='22' fill='rgba(0,0,0,.16)'/>` +
      `<rect x='128' y='186' width='44' height='10' rx='5' fill='${sun}'/>` +
      `<path d='M72 120q-22 40 0 90M228 120q22 40 0 90' fill='none' stroke='${dk}' stroke-width='10' stroke-linecap='round'/>`;
  } else if (category === "أطقم") {
    art = suitcase(30, 130, 80, 110, c) + suitcase(110, 100, 90, 140, c) + suitcase(198, 70, 74, 170, c);
  } else {
    const big = category === "كبيرة", mid = category === "متوسطة";
    const w = big ? 190 : mid ? 176 : 150, h = big ? 206 : mid ? 192 : 160;
    art = suitcase((300 - w) / 2, 270 - h - 22, w, h, c) + `<rect x='${150 - 18}' y='${270 - h + 10}' width='36' height='14' rx='5' fill='${sun}'/>`;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><rect width='300' height='300' fill='#EEF2F6'/>${art}</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
const imgOf = (p) => safeImg(p.image) || bagSVG(p.color, p.category);

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

/* ---------- data layer (Firebase أو وضع تجريبي) ---------- */
let fb = null;
const LS = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

const SEED = (window.SAMPLE_PRODUCTS || []).map((p, i) => ({ ...p, id: "demo" + i, createdAt: Date.now() - i * 1000 }));

async function initData() {
  if (DEMO) { $("#demoBar").hidden = false; return; }
  const base = "https://www.gstatic.com/firebasejs/10.12.2/";
  const [app, fs] = await Promise.all([
    import(base + "firebase-app.js"),
    import(base + "firebase-firestore.js"),
  ]);
  const a = app.initializeApp(firebaseConfig);
  fb = { fs, db: fs.getFirestore(a) };
}

const api = {
  async products() {
    if (DEMO) { if (!localStorage.getItem("sf_products2")) LS.set("sf_products2", SEED); return LS.get("sf_products2", []); }
    const { fs, db } = fb;
    const snap = await fs.getDocs(fs.query(fs.collection(db, "products"), fs.orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async createOrder(o) {
    if (DEMO) { const list = LS.get("sf_orders", []); const id = "o" + Date.now(); list.unshift({ ...o, id }); LS.set("sf_orders", list); return id; }
    const ref = await fb.fs.addDoc(fb.fs.collection(fb.db, "orders"), o);
    return ref.id;
  },
};

/* ---------- state ---------- */
const state = {
  products: [],
  cat: "الكل",
  q: "",
  sort: "new",
  cart: LS.get("sf_cart", []), // [{id, qty}]
};
const byId = (id) => state.products.find((p) => p.id === id);
const saveCart = () => { LS.set("sf_cart", state.cart); renderCartCount(); };

/* ---------- storefront ---------- */
function renderChips() {
  $("#chips").innerHTML = ["الكل", ...CATEGORIES]
    .map((c) => `<button class="chip" role="tab" aria-selected="${c === state.cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
}

function visibleProducts() {
  let list = state.products.filter((p) =>
    (state.cat === "الكل" || p.category === state.cat) &&
    (!state.q || (p.name + " " + (p.desc || "")).toLowerCase().includes(state.q.toLowerCase())));
  if (state.sort === "low") list.sort((a, b) => a.price - b.price);
  if (state.sort === "high") list.sort((a, b) => b.price - a.price);
  return list;
}

function renderGrid() {
  const list = visibleProducts();
  $("#grid").innerHTML = list.length
    ? list.map((p) => `
      <article class="card">
        <div class="card-img"><img src="${esc(imgOf(p))}" alt="${esc(p.name)}" loading="lazy">${p.stock <= 0 ? '<span class="sold">نفدت الكمية</span>' : ""}</div>
        <div class="card-body">
          <span class="cat">${esc(p.category)}</span>
          <h3>${esc(p.name)}</h3>
          <p class="desc">${esc(p.desc)}</p>
          <div class="card-foot">
            <span class="price">${fmt(p.price)}</span>
            <button class="btn btn-sun btn-sm" data-add="${esc(p.id)}" ${p.stock <= 0 ? "disabled" : ""}>أضف للسلة</button>
          </div>
        </div>
      </article>`).join("")
    : `<div class="empty">مفيش حقائب مطابقة. جرّب تصنيف تاني أو كلمة بحث مختلفة.</div>`;
}

function renderHero() {
  const p = state.products.find((x) => x.stock > 0);
  $("#heroTag").innerHTML = p
    ? `<article class="tag">
         <img src="${esc(imgOf(p))}" alt="${esc(p.name)}">
         <div class="tag-info"><b>${esc(p.name)}</b><span class="price">${fmt(p.price)}</span></div>
         <button class="btn btn-primary" data-add="${esc(p.id)}">أضف للسلة</button>
       </article>`
    : "";
}

/* ---------- cart ---------- */
function renderCartCount() {
  const n = state.cart.reduce((s, i) => s + i.qty, 0);
  const b = $("#cartCount");
  b.textContent = n.toLocaleString("ar-EG");
  b.hidden = n === 0;
}
function cartLines() {
  return state.cart.map((i) => ({ ...i, p: byId(i.id) })).filter((l) => l.p);
}
function renderCart() {
  const lines = cartLines();
  $("#cartItems").innerHTML = lines.length
    ? lines.map((l) => `
      <div class="cart-row">
        <img src="${esc(imgOf(l.p))}" alt="">
        <div><b>${esc(l.p.name)}</b><span class="price">${fmt(l.p.price)}</span>
          <div class="qty"><button data-dec="${esc(l.id)}" aria-label="تقليل">−</button><span>${l.qty.toLocaleString("ar-EG")}</span><button data-inc="${esc(l.id)}" aria-label="زيادة">+</button></div></div>
        <button class="icon-btn" data-rm="${esc(l.id)}" aria-label="حذف">✕</button>
      </div>`).join("")
    : `<p class="empty" style="margin-top:24px">السلة فاضية. ضيف شنطة تعجبك وهتظهر هنا.</p>`;
  $("#cartTotal").textContent = fmt(lines.reduce((s, l) => s + l.p.price * l.qty, 0));
  $("#goCheckout").disabled = !lines.length;
}
function openCart() { renderCart(); $("#cart").hidden = false; $("#scrim").hidden = false; }
function closeCart() { $("#cart").hidden = true; $("#scrim").hidden = true; }

function addToCart(id) {
  const p = byId(id);
  if (!p || p.stock <= 0) return;
  const line = state.cart.find((i) => i.id === id);
  if (line) { if (line.qty >= p.stock) return toast("وصلت لأقصى كمية متاحة"); line.qty++; }
  else state.cart.push({ id, qty: 1 });
  saveCart();
  toast("اتضافت للسلة");
}

/* ---------- checkout ---------- */
async function submitOrder(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const phone = toEnDigits(f.get("phone")).replace(/\s|-/g, "");
  const err = $("#orderError");
  err.hidden = true;
  if (!/^01[0125]\d{8}$/.test(phone)) { err.textContent = "رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01."; err.hidden = false; return; }
  const lines = cartLines();
  if (!lines.length) return;
  const order = {
    name: String(f.get("name")).trim(),
    phone,
    city: String(f.get("city")).trim(),
    address: String(f.get("address")).trim(),
    notes: String(f.get("notes") || "").trim(),
    items: lines.map((l) => ({ id: l.id, name: l.p.name, price: l.p.price, qty: l.qty })),
    total: lines.reduce((s, l) => s + l.p.price * l.qty, 0),
    status: "جديد",
    createdAt: Date.now(),
  };
  const btn = $("#submitOrder");
  btn.disabled = true; btn.textContent = "جاري إرسال الطلب...";
  try {
    const id = await api.createOrder(order);
    state.cart = []; saveCart(); closeCart();
    $("#checkout").close(); e.target.reset();
    $("#doneText").textContent = `رقم طلبك ${id.slice(-6).toUpperCase()}. هنكلمك على ${phone} لتأكيد التوصيل.`;
    $("#done").showModal();
  } catch (x) {
    console.error(x);
    err.textContent = "معرفناش نبعت الطلب. اتأكد من النت وجرّب تاني.";
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "تأكيد الطلب";
  }
}

/* ---------- routing ---------- */
function route() {
  if (location.hash !== "#shop") window.scrollTo(0, 0);
}

async function loadProducts() {
  try { state.products = await api.products(); }
  catch (e) { console.error(e); toast("مقدرناش نحمّل المنتجات. اتأكد من إعدادات Firebase."); state.products = []; }
  renderHero(); renderGrid();
}

/* ---------- events ---------- */
function bind() {
  document.addEventListener("click", async (e) => {
    const t = e.target.closest("button,a");
    if (!t) return;
    const d = t.dataset;
    if (d.add) addToCart(d.add);
    if (d.inc) { const l = state.cart.find((i) => i.id === d.inc); if (l && l.qty < (byId(d.inc)?.stock ?? 0)) { l.qty++; saveCart(); renderCart(); } }
    if (d.dec) { const l = state.cart.find((i) => i.id === d.dec); if (l) { l.qty--; if (l.qty <= 0) state.cart = state.cart.filter((i) => i !== l); saveCart(); renderCart(); } }
    if (d.rm) { state.cart = state.cart.filter((i) => i.id !== d.rm); saveCart(); renderCart(); }
    if (d.cat) { state.cat = d.cat; renderChips(); renderGrid(); }
  });
  $("#openCart").onclick = openCart;
  $("#closeCart").onclick = closeCart;
  $("#scrim").onclick = closeCart;
  $("#goCheckout").onclick = () => { closeCart(); $("#checkout").showModal(); };
  $("#orderForm").onsubmit = submitOrder;
  $("#search").oninput = (e) => { state.q = e.target.value.trim(); renderGrid(); };
  $("#sort").onchange = (e) => { state.sort = e.target.value; renderGrid(); };

  window.addEventListener("hashchange", route);
  // أي منتج جديد من صفحة add.html يظهر هنا لوحده
  window.addEventListener("storage", (e) => { if (e.key === "sf_products2") loadProducts(); });
  window.addEventListener("focus", () => { loadProducts(); });
}

/* ---------- init ---------- */
(async function init() {
  $("#brandName").textContent = STORE.name;
  $("#footName").textContent = "© " + STORE.name;
  $("#waLink").href = "https://wa.me/" + STORE.whatsapp;
  $("#telLink").href = "tel:" + STORE.phone;
  $("#telLink").textContent = "اتصل بينا: " + STORE.phone;
  document.title = STORE.name;
  renderChips(); renderCartCount(); bind();
  try { await initData(); } catch (e) { console.error(e); toast("فشل تحميل Firebase. راجع الإعدادات."); }
  await loadProducts();
  route();
})();
