// Lớp XEM TRƯỚC đợt A, vẽ lại 24/11/2026 theo ADR-0234 (chỉ chạy trong trang lúc chụp, KHÔNG phải mã của Nền tảng). Đi cùng tệp kiểu đề xuất
// (kich-ban/va-tep-kieu.py, chụp bằng --thay-css). Đổi phần tử cũ của Tạo / Sửa đơn và Đơn chờ xác nhận sang lớp của khung gốc (ADR-0222) — khối, hai cột,
// thanh nút của trang và thanh dính đáy, cặp nhãn–số, danh sách dòng, khuôn trạng thái — và đưa nút về cấp của bảng động từ (src/shared/cap-nut.ts).
// Giữ nguyên mọi id, data-action, data-buoc-khoi; chữ nút, nhãn không đổi (trừ khuôn trạng thái chung, dùng chữ có sẵn của nó).
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const tao = (the, lop, thuoc = {}) => { const e = document.createElement(the); if (lop) e.className = lop; for (const [k, v] of Object.entries(thuoc)) e.setAttribute(k, v); return e; };
const NS = "http://www.w3.org/2000/svg";
const HINH = {
  lock: [["rect", { x: 5, y: 11, width: 14, height: 9, rx: 2 }], ["path", { d: "M8 11V8a4 4 0 0 1 8 0v3" }]],
  clock: [["circle", { cx: 12, cy: 12.5, r: 8.5 }], ["path", { d: "M12 7.5v5l3.5 2" }]],
  alertCircle: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 8v5M12 16v.01" }]],
  minus: [["path", { d: "M5 12h14" }]],
};
const hinh = (ten, co) => { const s = document.createElementNS(NS, "svg"); for (const [k, v] of Object.entries({ width: co, height: co, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) s.setAttribute(k, String(v)); for (const [t, a] of HINH[ten]) { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); s.append(e); } return s; };
const huyHieu = (tong, ten, chu) => { const e = tao("span", "huy-hieu", { "data-tong": tong }); e.append(hinh(ten, 14), chu); return e; };
const nut = (el, cap) => { if (!el) return; el.classList.remove("btn", "btn-link", "btn-primary", "btn-block", "btn-accent", "pill-btn"); el.classList.add("nut"); if (cap) el.dataset.cap = cap; };
const dauKhoi = (khoi, h2) => { if (!h2) return null; const hd = tao("header", "khoi-dau"); h2.className = h2.className.replace(/\b(owner-title|cx-tieu-de)\b/g, "").trim(); h2.replaceWith(hd); hd.append(h2); khoi.prepend(hd); return hd; };
/** Khuôn trạng thái chung (web/trang-thai-he-thong.ts): vòng hình, câu chính, câu phụ, một nút. */
const trangThai = (loai, ten, cau, nutChu, href) => { const s = tao("section", "trang-thai", { "data-loai": loai }); const v = tao("div", "vong"); v.append(hinh(ten, 28)); const h2 = tao("h2", "trang-thai-tieu-de"); h2.textContent = cau; s.append(v, h2); if (nutChu) { const a = tao("a", "nut", { "data-cap": "chinh", href }); a.textContent = nutChu; s.append(a); } return s; };
const toanTrang = (s) => { document.body.dataset.trangThai = "403"; for (const e of $$(".topbar-search")) e.remove(); $("main").replaceChildren(s); };
const body = document.body;
const main = $("main");
const vungHep = () => { const s = getComputedStyle(main); return main.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) < 560; };

if (location.pathname === "/order-form") {
  body.dataset.khungGoc = "bieu-mau";
  const loi = $("#error");
  const cauLoi = loi && !loi.hidden ? loi.textContent.trim() : "";
  if (/không được lập đơn/.test(cauLoi)) toanTrang(trangThai("403", "lock", "Bạn không có quyền xem trang này.", "Về trang đầu của bạn", "/home"));
  else if (/Chỉ sửa được đơn chưa xác nhận|Chỉ người lập đơn/.test(cauLoi)) toanTrang(trangThai("403", "lock", cauLoi, "Về đơn", `/order?id=${new URLSearchParams(location.search).get("id")}`));
  else {
    main.classList.remove("form-page");
    const form = $("#order-form"); form.classList.add("vung-ve");
    const cols = $(".form-cols", form), fm = $(".form-main", form), fs = $(".form-side", form);
    const hc = tao("div", "hai-cot", { "data-phu": "sau" });
    fm.className = "cot-chinh"; fs.className = "cot-phu";
    cols.replaceWith(hc); hc.append(fm, fs);
    // Mọi thẻ cũ thành MỘT kiểu khối; thẻ người phụ trách bỏ viền đậm riêng
    for (const s of $$("section.card", form)) { s.classList.remove("card", "owner-card", "hk-card", "summary-card"); s.classList.add("khoi"); }
    // Khối Khách hàng: tên khối ở đầu khối, nút điền sẵn (lối chữ) ở đầu khối bên phải; «Ngày khởi hành» là ô đầu tiên dưới tên khối
    const kk = $('[data-buoc-khoi="khach"]', form);
    const kd = $(".khach-dau", kk), knut = $(".khach-dau-nut", kk);
    const hd = tao("header", "khoi-dau"); hd.append($("h2", kd));
    const viec = tao("div", "khoi-viec", { "data-cho": "dau" }); viec.append(...knut.children);
    kd.remove(); kk.prepend(hd, viec);
    for (const b of $$("button", viec)) nut(b, "loi");
    // Dịch vụ, Hành khách, Thanh toán, Tóm tắt: tên khối lên đầu khối
    for (const k of $$("section.khoi", form)) if (k !== kk) { const h2 = $(":scope > h2", k); if (h2) dauKhoi(k, h2); }
    // Người phụ trách, Hướng dẫn viên: đầu khối = tên + huy hiệu «Chờ … nhận»; câu giải thích như mô tả khối
    for (const k of $$("#ban-hang-card, #owner-card", form)) {
      const dau = $(".owner-head", k); if (!dau) continue;
      const h = tao("header", "khoi-dau"); const h2 = $("h2", dau); h2.classList.remove("owner-title"); h.append(h2);
      const chip = $(".chip", dau); if (chip) h.append(huyHieu("cat", "clock", chip.textContent));
      dau.replaceWith(h);
      const p = $(".owner-text", k); if (p) p.className = "khoi-mo-ta";
    }
    // Hai ô một hàng: lưới 12 cột, mỗi ô 6 cột
    for (const g of $$(".grid.two", form)) { g.classList.remove("grid", "two"); g.classList.add("luoi"); for (const c of g.children) c.dataset.cot = "6"; }
    // Hình thức thanh toán: nhóm chọn một của khung (bỏ khung viền của trình duyệt)
    const ts = $("#tra-sau-khoi"); if (ts) ts.className = "nhom-chon";
    // Nút về đúng cấp: lối chữ («Sửa giá đơn này»), nút phụ nền trắng («+ Dịch vụ nhập tay», «+ Thêm hành khách», «Điền tên khách đi tour»)
    nut($("#add-manual"), "phu");
    for (const b of $$(".svc-sua-gia", form)) nut(b, "loi");
    for (const b of $$(".pill-btn", form)) nut(b, "phu");
    // Tóm tắt: cặp nhãn – số; tổng là con số nổi duy nhất của khối; khối chỉ hiện khi vùng nội dung từ 560 (điện thoại: tóm tắt ở thanh dính đáy)
    const sc = $(".summary", form).closest("section"); sc.dataset.chi = "rong";
    $(".summary", sc).className = "";
    for (const kv of $$(".kv", sc)) { kv.classList.remove("kv"); kv.classList.add("cap"); kv.dataset.kieu = "so"; if (kv.classList.contains("strong")) { kv.classList.remove("strong"); kv.dataset.nhanManh = ""; } for (const s of $$(".muted", kv)) s.classList.remove("muted"); }
    const ghi = $(".summary-note", sc); if (ghi) ghi.className = "khoi-mo-ta";
    // Thanh nút của trang (vùng nội dung từ 560): «Quay lại» rồi «Lưu…» bên phải, dính đáy khi biểu mẫu dài hơn màn. Hẹp hơn: thanh dính đáy có tổng tiền + «Lưu…».
    // Câu cảnh báo và câu lỗi khi lưu luôn nằm ngay trên nút «Lưu…» (đi theo nút sang thanh đang hiện).
    const fa = $(".form-actions", form);
    const tom = $(".mobile-actions-summary", fa), canh = $("#sum-warning"), loiLuu = $("#save-error"), luu = $("#save"), ve = $('a[href="/orders"]', fa);
    nut(luu, "chinh"); nut(ve, "phu"); ve.dataset.chi = "rong"; ve.classList.add("day-phai");
    const tn = tao("div", "thanh-nut", { "data-kieu": "trang" }); const td = tao("div", "thanh-day thanh-hanh-dong-cuoi");
    td.append(tom);
    if (vungHep()) { td.append(canh, loiLuu, luu); tn.append(ve); } else tn.append(canh, loiLuu, ve, luu);
    fa.remove(); form.append(tn, td); // con của vùng vẽ (form), sau hai cột — không nằm trong cột phụ
  }
}

if (location.pathname === "/cho-xac-nhan") {
  body.dataset.khungGoc = "danh-sach";
  const loi = $("#error");
  if (loi && !loi.hidden && /không xét duyệt/.test(loi.textContent)) toanTrang(trangThai("403", "lock", "Bạn không có quyền xem trang này.", "Về trang đầu của bạn", "/home"));
  else {
    const dan = $(":scope > p.muted", main); dan.className = "doan-dan";
    const sec = $("#cx-noi-dung"); sec.classList.add("khoi"); sec.dataset.kieu = "bang";
    dauKhoi(sec, $("#cx-ds-tieu-de"));
    const ul = $("#cx-danh-sach"); ul.className = "ds-dong";
    const trong = $("#cx-trong");
    if (!trong.hidden) { trong.replaceWith(trangThai("rong", "minus", "Không có đơn nào đang chờ xác nhận.")); ul.hidden = true; }
    else trong.remove();
    for (const li of $$(".cx-the", ul)) {
      li.className = "dong cx-the";
      const [dv, meta, tong] = $$(":scope > .cx-the-dong:not([data-chu])", li).map((p) => p.textContent);
      const han = $('[data-chu="han"]', li);
      const ma = $(".cx-the-ma", li);
      const dau = tao("span", "cx-the-dau"); dau.append(ma);
      if ($(".cx-nhan-qua-han", li)) dau.append(huyHieu("do", "alertCircle", "Quá hạn"));
      const gap = $(".cx-nhan-gap", li); if (gap) dau.append(huyHieu("cat", "clock", gap.textContent));
      const chu = tao("div", "dong-chu");
      const sDv = tao("span"); sDv.textContent = dv;
      const sMeta = tao("span", "o-phu"); const tien = tao("span", "money-due"); tien.textContent = tong.replace(/^Tổng /, ""); sMeta.append(`${meta} · Tổng `, tien);
      const sHan = tao("span", "o-phu", { "data-chu": "han" }); sHan.textContent = han.textContent;
      chu.append(dau, sDv, sMeta, sHan);
      const a = $(".cx-ds-nut", li); nut(a, "phu"); a.classList.remove("cx-ds-nut");
      li.replaceChildren(chu, a);
    }
  }
}
