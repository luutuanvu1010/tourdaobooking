// ĐOẠN SẮP LẠI PHẦN TỬ cho bản xem trước khung gốc giao diện (21/11/2026). Chạy TRONG trang đang mở (kich-ban/chup.mjs bọc trong một hàm), sau khi trang tải xong.
// Việc của nó: gắn <body data-kg="…">, đổi phần tử của trang cũ sang lớp của khung (khối, lưới, cặp nhãn – giá trị, thanh nút…) và dời chỗ vài phần tử,
// để ảnh chụp đúng hình mà hàm dựng của khung sẽ cho ra ở bước 3. KHÔNG phải mã của Nền tảng; không gọi máy chủ; chữ trên nút, nhãn giữ nguyên.
const main = document.querySelector("main");
if (!main) return;
const tao = (the, lop, ...con) => { const e = document.createElement(the); if (lop) e.className = lop; e.append(...con.filter(Boolean)); return e; };
/** Đổi một nút cũ (.btn, .vc-btn, .pill-btn) sang nút của bộ thành phần chung. */
const nut = (e, cap) => { if (!e) return e; e.className = "nut"; if (cap) e.dataset.cap = cap; return e; };
/** Đổi một thẻ cũ thành khối của khung: tiêu đề vào đầu khối, nút của khối vào chỗ «việc của khối». */
const khoi = (sec, viec = []) => {
  if (!sec) return null;
  sec.classList.remove("card", "vc-card", "handler-card", "table-wrap", "totals", "card-col");
  sec.classList.add("khoi");
  const h = sec.querySelector(":scope > h2");
  if (h) { const dau = tao("header", "khoi-dau"); h.before(dau); dau.append(h); }
  const ds = viec.filter(Boolean);
  if (ds.length) { const v = tao("div", "khoi-viec", ...ds); const dau = sec.querySelector(":scope > .khoi-dau"); if (dau) dau.after(v); else sec.prepend(v); }
  return sec;
};
/** Đổi cặp nhãn – giá trị cũ (.kv) trong một vùng. */
const cap = (goc, kieu) => { for (const k of goc.querySelectorAll(".kv")) { const manh = k.classList.contains("strong"); k.className = "cap" + [...k.classList].filter((c) => /^kv-/.test(c)).map((c) => " " + c).join(""); if (kieu) k.dataset.kieu = kieu; if (manh) k.dataset.nhanManh = ""; } };
const rongNoiDung = main.clientWidth - parseFloat(getComputedStyle(main).paddingLeft) - parseFloat(getComputedStyle(main).paddingRight);
const duong = location.pathname;

// ---------- Đơn hàng (khuôn Danh sách) ----------
if (duong === "/orders") {
  document.body.dataset.kg = "danh-sach";
  const tb = main.querySelector(".toolbar"); tb.className = "thanh-loc";
  document.getElementById("q").classList.add("o");
  nut(document.getElementById("loc-mo"));
  // Nút «+ Tạo đơn» trong thân trang giữ nguyên: máy tính đã có ở thanh trên, điện thoại đã có ở thanh tab (luật khung 30/10 mục 15).
  const dau = main.querySelector(".don-bang-dau"); dau.className = "bang-dau";
  const k = tao("section", "khoi"); k.dataset.kieu = "bang"; k.dataset.theDong = "";
  dau.before(k);
  const them = document.getElementById("more"); nut(them, "loi"); them.classList.add("bang-them");
  k.append(dau, document.getElementById("list"), document.getElementById("empty"), them);
}

// ---------- Chi tiết đơn (khuôn Chi tiết) ----------
if (duong === "/order") {
  document.body.dataset.kg = "chi-tiet";
  const hep = rongNoiDung < 560;
  const thanh = main.querySelector(".thanh-cong-cu-don");
  const gui = document.getElementById("send"), viec = document.getElementById("actions");
  const nutGui = nut(gui.querySelector("button"), "chinh");
  const huy = viec.querySelector(".huy-don"); const nutHuy = huy ? nut(huy.querySelector("button"), "nguy-hiem") : null;
  const phu = [...viec.querySelectorAll(":scope > .btn")].map((b) => nut(b, "phu"));
  const cau = [...viec.querySelectorAll(":scope > p")];
  const tv = tao("div", "thanh-viec");
  thanh.replaceWith(tv);
  const bang = document.getElementById("order");
  if (hep) {
    // Điện thoại: tóm tắt trước; việc phụ xếp dọc dưới dòng ghi chú khoá; việc nguy hiểm ở cuối trang; việc chính dính đáy.
    tv.dataset.xep = "doc"; tv.append(...phu, ...cau);
    const khoa = bang.querySelector(".lock-note") ?? bang.querySelector(":scope > p.muted") ?? bang.querySelector(".order-summary-band");
    khoa.after(tv);
    if (nutHuy) { nutHuy.classList.add("nguy-hiem"); main.append(tao("div", "thanh-viec", nutHuy)); main.lastElementChild.dataset.xep = "doc"; }
    if (nutGui) main.append(tao("div", "thanh-day thanh-hanh-dong-cuoi", nutGui));
  } else {
    if (nutGui) tv.append(nutGui);
    tv.append(...phu, ...cau);
    if (nutHuy) { nutHuy.classList.add("nguy-hiem"); tv.append(nutHuy); }
  }
  const bc = bang.querySelector(".order-layout"); bc.className = "hai-cot";
  const chinh = bc.children[0], cotPhu = bc.querySelector(".side");
  chinh.className = "cot-chinh"; cotPhu.className = "cot-phu";
  // Hai khối «ai lo đơn này» đứng cạnh nhau khi cột chính đủ rộng.
  const bh = chinh.querySelector('[data-khoi="ban-hang-phu-trach"]'), hdv = chinh.querySelector('section[aria-labelledby="handler-title"]');
  for (const s of [bh, hdv]) if (s) { const b = s.querySelector(".handler-actions"); const ns = b ? [...b.querySelectorAll("button")].map((x) => nut(x, "phu")) : []; b?.remove(); khoi(s, ns); }
  if (bh && hdv) { const l = tao("div", "luoi"); l.dataset.can = "deu"; bh.before(l); l.append(bh, hdv); bh.dataset.cot = "6"; hdv.dataset.cot = "6"; }
  for (const s of chinh.querySelectorAll(":scope > section.card")) {
    const ns = [...s.querySelectorAll(':scope > button.btn, :scope > .dd-nut > .btn, :scope > .dd-nut > button')].map((x) => nut(x, "phu"));
    for (const b of s.querySelectorAll(":scope > .dd-nut")) if (!b.querySelector(".hint")) b.remove();
    khoi(s, ns); cap(s);
  }
  // Dịch vụ: một khối, mỗi dịch vụ một mục con (thay thẻ lồng trong nhóm).
  const dv = chinh.querySelector("section.services");
  if (dv) { khoi(dv); for (const a of dv.querySelectorAll("article.svc")) { a.classList.add("muc-con"); a.classList.remove("svc"); a.querySelector(".svc-lines")?.classList.add("vung-phu"); } cap(dv); }
  const pdt = document.getElementById("phan-doi-tac");
  if (pdt && !pdt.hidden) for (const a of pdt.querySelectorAll("article.pdt-dong")) a.classList.add("muc-con");
  // Cột phụ: tiền (số canh phải) và trạng thái nhập kế toán.
  for (const s of cotPhu.querySelectorAll(":scope > section")) {
    const b = s.querySelector(":scope > .handler-actions");
    if (b) { b.className = "thanh-nut"; for (const x of b.querySelectorAll("button")) nut(x, "phu"); for (const w of b.querySelectorAll(".pay-inline")) w.replaceWith(...w.childNodes); }
    khoi(s); cap(s, "so");
  }
  const ls = [...bang.querySelectorAll(":scope > section.card")].pop();
  if (ls) { khoi(ls); chinh.append(ls); }
}

// ---------- Sửa xe (khuôn Biểu mẫu) ----------
if (duong === "/xe-sua") {
  document.body.dataset.kg = "bieu-mau";
  main.querySelector(".vc-back")?.remove();
  const dt = main.querySelector(".vc-page-head"); if (dt) dt.replaceWith(...dt.childNodes);
  const form = document.getElementById("xe-form"); form.className = "khoi";
  const l = tao("div", "luoi");
  const cot = { "xe-plate": "6", "xe-chassis": "6", "xe-name": "12", "xe-owner": "12", "xe-seats-label": "6", "xe-status-label": "6" };
  for (const f of form.querySelectorAll(".vc-field")) {
    f.className = "truong";
    const moc = f.querySelector("input, select, .vc-label");
    f.dataset.cot = cot[moc?.id] ?? "12";
    for (const o of f.querySelectorAll(".vc-input")) { o.classList.remove("vc-input"); o.classList.add("o"); }
    for (const n of f.querySelectorAll(".vc-label")) { n.classList.remove("vc-label"); n.classList.add("nhan"); }
    for (const g of f.querySelectorAll(".vc-hint")) g.className = "truong-goi-y";
    l.append(f);
  }
  const nutCu = form.querySelector(".vc-form-actions");
  for (const g of form.querySelectorAll(".vc-grid-2")) g.remove();
  form.prepend(l);
  const [luu, huy, ngung] = [nutCu.querySelector('button[type="submit"]'), nutCu.querySelector("a"), nutCu.querySelector(".vc-btn-stop")];
  nutCu.remove();
  const day = document.getElementById("xe-bottom"), dung = document.getElementById("xe-stop");
  if (rongNoiDung < 560) {
    // Điện thoại: «Ngừng dùng xe» là khối riêng cuối biểu mẫu; «Lưu» dính đáy, kín bề ngang.
    dung.className = "khoi"; nut(dung.querySelector("button"), "nguy-hiem"); dung.querySelector(".vc-stop-note").className = "khoi-mo-ta";
    dung.prepend(dung.querySelector(".khoi-mo-ta"));
    day.className = "thanh-day thanh-hanh-dong-cuoi"; nut(day.querySelector("button"), "chinh");
  } else {
    dung.remove(); day.remove();
    const tn = tao("div", "thanh-nut", nut(ngung, "nguy-hiem"), nut(huy), nut(luu, "chinh")); tn.dataset.kieu = "trang";
    huy.classList.add("day-phai");
    form.after(tn);
  }
}

// ---------- Địa điểm (khuôn Thiết lập) ----------
if (duong === "/locations") {
  document.body.dataset.kg = "thiet-lap";
  const dan = main.querySelector(":scope > p.muted"); dan.className = "doan-dan";
  const dt = tao("div", "dau-trang"); dan.before(dt); dt.append(dan);
  const them = document.getElementById("add-card"), vung = document.getElementById("zone-card");
  // Khối danh sách chính: tên khối + nút mở biểu mẫu thêm (biểu mẫu thêm và sửa mở trong bảng trượt — không còn nằm sẵn trên trang).
  const bang = main.querySelector("section.table-wrap"); const tb = bang.querySelector("table"); tb.className = "bang";
  const nutThem = nut(tao("button", "", them.querySelector("h2").textContent), "chinh"); nutThem.type = "button";
  bang.prepend(tao("h2", "", document.querySelector("main > h1").textContent));
  khoi(bang, [nutThem]); bang.dataset.kieu = "bang"; bang.querySelector(".khoi-viec").dataset.cho = "dau";
  them.remove();
  // Cột: Mã (0) luôn gộp dưới Tên (1); Địa chỉ (4) là cột phụ, gộp dưới Tên khi vùng nội dung hẹp hơn 1040; Thứ tự (5), Chọn nhanh (6) là số.
  for (const r of tb.rows) {
    r.cells[0].dataset.an = ""; r.cells[1].dataset.dau = ""; r.cells[4].dataset.cotPhu = ""; r.cells[2].dataset.gon = "";
    for (const i of [5, 6]) r.cells[i].dataset.so = "";
    if (r.parentElement.tagName !== "TBODY") continue;
    const ma = r.cells[0].textContent.trim(), dc = r.cells[4].textContent.trim();
    r.cells[1].append(tao("span", "o-phu", ma));
    if (dc) { const d = tao("span", "o-phu", dc); d.dataset.cua = "dia-chi"; r.cells[1].append(d); }
    nut(r.querySelector(".row-actions button"), "loi");
  }
  const the = document.getElementById("list-cards"); the.className = "ds-dong"; bang.append(the);
  for (const c of the.children) { c.className = "dong" + (c.classList.contains("row-off") ? " row-off" : ""); c.firstElementChild.removeAttribute("style"); c.firstElementChild.className = "dong-chu"; nut(c.querySelector("button"), "loi"); }
  // Khối «Khu vực đón»: tên khối + nút thêm; các khu vực là danh sách dòng (không còn thẻ lồng trong thẻ).
  const nutVung = nut(tao("button", "", vung.querySelector("#zone-form button[type=submit]").textContent), "phu"); nutVung.type = "button";
  vung.querySelector("#zone-form").remove();
  khoi(vung, [nutVung]); vung.querySelector(".khoi-viec").dataset.cho = "dau";
  vung.querySelector(":scope > p.muted").className = "khoi-mo-ta";
  const dsVung = document.getElementById("zone-list"); dsVung.className = "ds-dong";
  for (const c of dsVung.children) { c.className = "dong"; c.firstElementChild.removeAttribute("style"); c.firstElementChild.className = "dong-chu"; nut(c.querySelector("button"), "phu"); }
  bang.after(vung);
}
