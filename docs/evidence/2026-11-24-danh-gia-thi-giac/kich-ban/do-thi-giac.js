// Đoạn đo CHẠY TRONG TRANG (Runtime.evaluate): đếm ngôn ngữ thị giác đang thật sự hiện trên màn — màu, cỡ chữ, độ đậm, giãn dòng, bo góc, viền, bóng,
// khoảng cách ngoài thang, tương phản, vùng chạm, dáng nút, dáng thẻ, biểu tượng, cách viết tiền, chuyển động. Chỉ đọc getComputedStyle, không đổi gì trên trang.
// Trả một đối tượng JSON; máy gom ở tong-hop.mjs. Thang khoảng cách là bảy bậc của ADR-0222 Đ1 (4, 8, 12, 16, 24, 32, 48).
(() => {
  const THANG = new Set([0, 4, 8, 12, 16, 24, 32, 48]);
  const dem = (o, k, ky = 0) => { const x = (o[k] ??= { n: 0, ky: 0 }); x.n++; x.ky += ky; };
  const px = (s) => { const v = parseFloat(s); return Number.isFinite(v) ? Math.round(v * 2) / 2 : null; };
  const tach = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c ?? ""); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("") + (c.a < 0.995 ? `@${Math.round(c.a * 100)}` : "");
  const tron = (tr, duoi) => ({ r: tr.r * tr.a + duoi.r * (1 - tr.a), g: tr.g * tr.a + duoi.g * (1 - tr.a), b: tr.b * tr.a + duoi.b * (1 - tr.a), a: 1 });
  const sang = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const tiLe = (a, b) => { const x = sang(a), y = sang(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const vung = (el) => el.closest("#topbar") ? "thanh-tren" : el.closest("#sidebar") ? "thanh-ben" : el.closest("#tabbar") ? "thanh-duoi" : el.closest("dialog, [role=dialog], .sheet, .bang-truot") ? "lop-noi" : "noi-dung";
  const nenThat = (el) => { // nền hiệu lực dưới chữ: đi lên tới khi gặp nền đặc, trộn các lớp trong suốt
    const lop = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = tach(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { lop.push(c); if (c.a >= 0.995) break; } }
    let nen = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = lop.length - 1; i >= 0; i--) nen = tron(lop[i], nen);
    return nen;
  };
  const moTa = (el) => `${el.localName}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
  const mobile = innerWidth < 641;
  const ra = { duong: location.pathname, rong: innerWidth, cao: innerHeight, caoTrang: document.documentElement.scrollHeight, khungGoc: document.body.dataset.khungGoc ?? null, tieuDe: document.title,
    soPhanTu: 0, mauChu: {}, mauNen: {}, mauVien: {}, coChu: {}, doDam: {}, phong: {}, gianDong: {}, boGoc: {}, beVien: {}, bong: {}, khoangCach: {}, ngoaiThang: {},
    nut: {}, the: {}, oNhap: {}, huyHieu: {}, bieuTuong: {}, tien: {}, chuyenDong: {}, vietHoa: 0, gianChu: {}, hinhAnh: 0, kyHieuHinh: {}, coChuTheoVung: {}, tpDuoi: 0, tpMau: [], chamNho: 0, chamTong: 0, chamMau: [], tieuDeTrang: null, nutChinh: [], tranNgang: document.documentElement.scrollWidth > innerWidth + 1, chuBop: 0, chuBopMau: [], khungChung: null, nutTheoChu: {} };
  const h1 = document.querySelector("main h1, h1"); if (h1) { const cs = getComputedStyle(h1); ra.tieuDeTrang = { chu: h1.textContent.trim().slice(0, 60), co: px(cs.fontSize), dam: cs.fontWeight, hien: h1.getBoundingClientRect().height > 0 }; }
  const TUONG_TAC = "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=link], [role=switch], [role=checkbox], summary";
  for (const el of document.body.querySelectorAll("*")) {
    if (["SCRIPT", "STYLE", "LINK", "META", "TEMPLATE", "NOSCRIPT"].includes(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
    ra.soPhanTu++;
    const v = vung(el);
    // ---- chữ
    let ky = 0; for (const n of el.childNodes) if (n.nodeType === 3) ky += n.nodeValue.trim().length;
    if (ky > 0) {
      const fg0 = tach(cs.color), nen = nenThat(el), fg = fg0 ? (fg0.a < 0.995 ? tron(fg0, nen) : fg0) : null;
      const co = px(cs.fontSize), dam = +cs.fontWeight;
      if (fg0) dem(ra.mauChu, hex(fg0), ky);
      dem(ra.coChu, co, ky); dem(ra.doDam, dam, ky); dem(ra.phong, cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(), ky);
      dem((ra.coChuTheoVung[v] ??= {}), `${co}/${dam}`, ky);
      const lh = parseFloat(cs.lineHeight); dem(ra.gianDong, Number.isFinite(lh) && co ? (Math.round((lh / co) * 20) / 20).toFixed(2) : "normal", ky);
      if (cs.textTransform === "uppercase") ra.vietHoa++;
      // chữ bị bóp: đoạn từ 8 ký tự mà bề rộng chỉ còn chừng hai chữ và cao hơn ba dòng (kiểu lỗi cột tên khách 1.100–1.199 ngày 21/11)
      if (ky >= 8 && r.width < co * 2.4 && Number.isFinite(lh) && r.height > lh * 3) { ra.chuBop++; if (ra.chuBopMau.length < 6) ra.chuBopMau.push({ pt: moTa(el), chu: el.textContent.trim().slice(0, 24), rong: Math.round(r.width), cao: Math.round(r.height) }); }
      if (cs.letterSpacing !== "normal" && parseFloat(cs.letterSpacing) !== 0) dem(ra.gianChu, cs.letterSpacing);
      if (fg) {
        const t = tiLe(fg, nen), lon = co >= 24 || (co >= 18.5 && dam >= 700);
        if (t < (lon ? 3 : 4.5)) { ra.tpDuoi++; if (ra.tpMau.length < 25) ra.tpMau.push({ chu: el.textContent.trim().slice(0, 32), ti: +t.toFixed(2), mauChu: hex(fg), nen: hex(nen), co, dam, vung: v, pt: moTa(el) }); }
      }
      const chuTrucTiep = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(" ");
      if (/\d[\d.,]*\s?(₫|đ)(?![\p{L}])/u.test(chuTrucTiep)) dem(ra.tien, `${co}/${dam} ${fg0 ? hex(fg0) : "?"} ${/tabular/.test(cs.fontVariantNumeric) ? "số đều cột" : "số tỉ lệ"} ${cs.textAlign}`);
      const hinh = chuTrucTiep.match(/\p{Extended_Pictographic}/gu); if (hinh) for (const k of hinh) dem(ra.kyHieuHinh, k);
    }
    // ---- nền, viền, bo góc, bóng
    const bg = tach(cs.backgroundColor); const coNen = bg && bg.a > 0;
    if (coNen) dem(ra.mauNen, hex(bg));
    if (cs.backgroundImage !== "none" && /gradient/.test(cs.backgroundImage)) dem(ra.mauNen, "chuyển màu");
    let coVien = false;
    for (const c of ["Top", "Right", "Bottom", "Left"]) { const w = px(cs[`border${c}Width`]); if (w > 0 && cs[`border${c}Style`] !== "none") { coVien = true; const bc = tach(cs[`border${c}Color`]); if (bc && bc.a > 0) dem(ra.mauVien, hex(bc)); dem(ra.beVien, w); } }
    const coBong = cs.boxShadow !== "none";
    if (coBong) dem(ra.bong, cs.boxShadow.replace(/\s+/g, " "));
    if (coNen || coVien || coBong) { const g = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map((x) => (parseFloat(x) >= 400 || /%/.test(x) ? "tròn" : String(px(x)))); const k = g.every((x) => x === g[0]) ? g[0] : g.join(" "); if (k !== "0") dem(ra.boGoc, k); }
    // ---- khoảng cách
    const kc = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginBottom", "marginLeft", "marginRight"];
    if (/flex|grid/.test(cs.display)) kc.push("rowGap", "columnGap");
    for (const k of kc) { const x = px(cs[k]); if (x === null || x <= 0) continue; dem(ra.khoangCach, x); if (!THANG.has(x)) dem(ra.ngoaiThang, x); }
    // ---- thành phần
    const laNut = el.matches("button, a.btn, a.nut, .nut, [role=button], input[type=submit], input[type=button]");
    if (laNut) {
      const k = `cao ${Math.round(r.height)} | bo ${cs.borderTopLeftRadius} | nền ${coNen ? hex(bg) : "không"} | chữ ${hex(tach(cs.color) ?? { r: 0, g: 0, b: 0, a: 1 })} | ${px(cs.fontSize)}/${cs.fontWeight} | viền ${px(cs.borderTopWidth) > 0 ? hex(tach(cs.borderTopColor) ?? { r: 0, g: 0, b: 0, a: 1 }) : "không"}`;
      dem((ra.nut[v] ??= {}), k);
      // cùng một động từ trên nút thì đang mang những màu nào (ví dụ «Thêm …» lúc san hô, lúc biển đậm, lúc xanh nhạt)
      const dt = /^\+?\s*(Thêm|Lưu|Sửa|Tạo|Huỷ|Xoá|Ngừng)(?![\p{L}])/u.exec(el.textContent.trim());
      if (dt && v === "noi-dung") dem((ra.nutTheoChu[dt[1]] ??= {}), coNen && bg.a >= 0.5 ? `nền ${hex(bg)}` : px(cs.borderTopWidth) > 0 && (tach(cs.borderTopColor)?.a ?? 0) > 0 ? `viền ${hex(tach(cs.borderTopColor))}` : `chỉ chữ ${hex(tach(cs.color) ?? { r: 0, g: 0, b: 0, a: 1 })}`);
      if (v === "noi-dung" && coNen && bg.a >= 0.995 && sang(bg) < 0.35 && r.width > 60) ra.nutChinh.push({ chu: el.textContent.trim().slice(0, 30), nen: hex(bg), x: Math.round(r.left), y: Math.round(r.top + scrollY), rong: Math.round(r.width), cao: Math.round(r.height) });
    }
    if (el.matches("input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=submit]):not([type=button]):not([type=file]), select, textarea")) dem(ra.oNhap, `cao ${Math.round(r.height)} | bo ${cs.borderTopLeftRadius} | viền ${px(cs.borderTopWidth)} ${hex(tach(cs.borderTopColor) ?? { r: 0, g: 0, b: 0, a: 1 })} | nền ${coNen ? hex(bg) : "không"} | ${px(cs.fontSize)}`);
    if (!laNut && ky > 0 && coNen && r.height <= 32 && r.width <= 220 && parseFloat(cs.borderTopLeftRadius) > 0 && el.children.length <= 1) dem(ra.huyHieu, `cao ${Math.round(r.height)} | bo ${parseFloat(cs.borderTopLeftRadius) >= 400 ? "tròn" : cs.borderTopLeftRadius} | nền ${hex(bg)} | chữ ${hex(tach(cs.color) ?? { r: 0, g: 0, b: 0, a: 1 })} | ${px(cs.fontSize)}/${cs.fontWeight}`);
    if (!laNut && v === "noi-dung" && (coNen || coVien) && parseFloat(cs.borderTopLeftRadius) > 0 && r.width >= 200 && r.height >= 60 && !el.matches("input, select, textarea, main, body")) dem(ra.the, `đệm ${px(cs.paddingTop)}/${px(cs.paddingLeft)} | bo ${cs.borderTopLeftRadius} | viền ${coVien ? px(cs.borderTopWidth) + " " + hex(tach(cs.borderTopColor) ?? { r: 0, g: 0, b: 0, a: 1 }) : "không"} | bóng ${coBong ? "có" : "không"} | nền ${coNen ? hex(bg) : "không"}`);
    if (el.localName === "svg") dem(ra.bieuTuong, `${Math.round(r.width)}×${Math.round(r.height)} | nét ${cs.strokeWidth} | ${cs.fill !== "none" && cs.stroke === "none" ? "đặc" : cs.stroke !== "none" && cs.fill === "none" ? "nét" : "lẫn"}`);
    if (el.localName === "img") ra.hinhAnh++;
    const td = cs.transitionDuration.split(",").map((x) => parseFloat(x) * (/ms/.test(x) ? 1 : 1000)).filter((x) => x > 0);
    if (td.length) dem(ra.chuyenDong, `chuyển ${Math.max(...td)}ms`);
    if (cs.animationName !== "none") dem(ra.chuyenDong, `hoạt ảnh ${cs.animationName}`);
    // ---- vùng chạm (chỉ khổ điện thoại)
    if (mobile && el.matches(TUONG_TAC) && !el.disabled) {
      let rc = r; if (el.matches("input[type=checkbox], input[type=radio]")) { const lb = el.closest("label"); if (lb) rc = lb.getBoundingClientRect(); }
      ra.chamTong++;
      if (Math.min(rc.width, rc.height) < 44) { ra.chamNho++; if (ra.chamMau.length < 20) ra.chamMau.push({ pt: moTa(el), chu: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 28), rong: Math.round(rc.width), cao: Math.round(rc.height), vung: v }); }
    }
  }
  // ---- khung chung chiếm bao nhiêu chiều cao khung nhìn (đo lúc trang ở đầu): thanh trên, dải nhắc, thanh dưới, thanh dính đáy của trang
  const caoCua = (sel) => { const e = document.querySelector(sel); if (!e || getComputedStyle(e).display === "none") return 0; return Math.round(e.getBoundingClientRect().height); };
  let dinhDay = 0;
  for (const el of document.body.querySelectorAll("*")) { const cs = getComputedStyle(el); if (cs.position !== "fixed" && cs.position !== "sticky") continue; if (el.closest("#tabbar, #topbar, #sidebar")) continue; const r = el.getBoundingClientRect(); if (r.height > 30 && r.width > innerWidth * 0.6 && Math.abs(r.bottom - innerHeight) < 4) dinhDay = Math.max(dinhDay, Math.round(r.height)); }
  ra.khungChung = { thanhTren: caoCua("#topbar"), dai: caoCua("#strips"), thanhDuoi: caoCua("#tabbar"), dinhDay, khungNhin: innerHeight };
  return ra;
})()
