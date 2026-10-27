// Biểu thức đo CHẠY TRONG TRANG (đánh giá UX 27/10/2026). Trả một đối tượng số liệu; đo bằng getComputedStyle + hit-test (elementFromPoint),
// không tin thuộc tính `hidden` hay class. `mobile` do kịch bản truyền vào qua window.__UX_MOBILE.
(() => {
  const mobile = !!window.__UX_MOBILE;
  const vw = innerWidth, vh = innerHeight;
  const cs = (el) => getComputedStyle(el);
  const thay = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const st = cs(el);
    if (st.visibility === "hidden" || st.display === "none" || Number(st.opacity) === 0) return false;
    return true;
  };
  // Có thật chạm được không: tâm phần tử (cuộn tới nếu ngoài màn) trả về chính nó hoặc con của nó.
  const chamDuoc = (el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (y < 0 || y > vh || x < 0 || x > vw) return null; // ngoài màn: không kết luận
    const t = document.elementFromPoint(x, y);
    return !!t && (t === el || el.contains(t) || t.contains(el) && t.tagName === "LABEL");
  };
  const ten = (el) => (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("title") || el.getAttribute("placeholder") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
  const lop = (el) => (typeof el.className === "string" ? el.className : "").trim().split(/\s+/).filter(Boolean).slice(0, 3).join(".");

  const tuongTac = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=link], summary, [tabindex]:not([tabindex='-1'])")].filter(thay);
  const nhoHon44 = [];
  for (const el of tuongTac) {
    const r = el.getBoundingClientRect();
    // Ô chọn/ô đánh dấu bọc trong <label>: tính theo nhãn.
    const nhan = (el.type === "checkbox" || el.type === "radio") ? el.closest("label") : null;
    const rr = nhan ? nhan.getBoundingClientRect() : r;
    if (rr.height < 44 || (mobile && rr.width < 44)) {
      const c = chamDuoc(el);
      if (c === false) continue; // bị phủ: không phải vùng chạm thật
      nhoHon44.push({ ten: ten(el), lop: lop(el), w: Math.round(rr.width), h: Math.round(rr.height), the: el.tagName.toLowerCase() });
    }
  }

  const oGo = [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea")].filter(thay);
  const oGoNho = oGo.filter((el) => parseFloat(cs(el).fontSize) < 16).map((el) => ({ ten: ten(el), co: cs(el).fontSize }));
  const oGoKieu = oGo.map((el) => { const st = cs(el); return `${Math.round(el.getBoundingClientRect().height)}h|r${st.borderTopLeftRadius}|b${st.borderTopWidth} ${st.borderTopColor}|bg${st.backgroundColor}|${st.fontSize}`; });

  // Nhãn luôn thấy: ô gõ không có <label> thấy được, aria-label hay aria-labelledby.
  const oKhongNhan = oGo.filter((el) => {
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
    const l = (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest("label");
    return !(l && thay(l) && l.innerText.trim());
  }).map(ten);

  const nut = [...document.querySelectorAll("button, a[role=button], a[class*=btn], input[type=submit], input[type=button]")].filter(thay);
  const nutKieu = nut.map((el) => { const st = cs(el); const r = el.getBoundingClientRect(); return { lop: lop(el), ten: ten(el), sig: `${Math.round(r.height)}h|r${st.borderTopLeftRadius}|bg${st.backgroundColor}|c${st.color}|b${st.borderTopWidth} ${st.borderTopStyle}|${st.fontSize}/${st.fontWeight}` }; });
  // Nút "chính" = nền đặc có màu (không trong suốt, không trắng/xám nhạt).
  const laNenDac = (bg) => { const m = bg.match(/rgba?\(([^)]+)\)/); if (!m) return false; const [r, g, b, a = 1] = m[1].split(",").map(Number); if (a < 0.5) return false; const sang = (r + g + b) / 3; const bao = Math.max(r, g, b) - Math.min(r, g, b); return sang < 200 || bao > 60; };
  const nutChinhTrongManDau = nut.filter((el) => { const r = el.getBoundingClientRect(); return r.top < vh && r.bottom > 0 && laNenDac(cs(el).backgroundColor) && !el.closest(".sidebar, .tabbar, nav"); }).map(ten);

  const huyHieu = [...document.querySelectorAll("[class*=badge], [class*=pill], [class*=chip], [class*=tag], [class*=status], [class*=trang-thai]")].filter(thay).filter((el) => el.innerText.trim().length > 0 && el.innerText.trim().length < 40 && el.children.length <= 2);
  const huyHieuKieu = huyHieu.map((el) => { const st = cs(el); return { chu: el.innerText.trim().replace(/\s+/g, " "), lop: lop(el), sig: `r${st.borderTopLeftRadius}|bg${st.backgroundColor}|c${st.color}|${st.fontSize}/${st.fontWeight}|b${st.borderTopWidth}` }; });

  const the = [...document.querySelectorAll("[class*=card], [class*=panel], [class*=tile], [class*=box], section, article")].filter(thay).filter((el) => el.getBoundingClientRect().height > 40);
  const theKieu = the.map((el) => { const st = cs(el); return { lop: lop(el), sig: `r${st.borderTopLeftRadius}|bg${st.backgroundColor}|b${st.borderTopWidth} ${st.borderTopColor}|sh${st.boxShadow === "none" ? 0 : 1}|p${st.paddingTop}` }; }).filter((t) => !t.sig.includes("bgrgba(0, 0, 0, 0)|b0px"));

  const h1 = [...document.querySelectorAll("h1")].filter(thay).map((el) => ({ chu: el.innerText.trim().slice(0, 60), co: cs(el).fontSize, dam: cs(el).fontWeight, lop: lop(el), cha: lop(el.parentElement) }));
  const h2 = [...document.querySelectorAll("h2, h3")].filter(thay).map((el) => `${el.tagName}|${cs(el).fontSize}/${cs(el).fontWeight}`);

  // Chữ bị cắt: phần tử có ellipsis hoặc overflow hidden mà nội dung rộng hơn hộp.
  const catChu = [...document.querySelectorAll("body *")].filter((el) => el.children.length === 0 && el.innerText && thay(el)).filter((el) => { const st = cs(el); return (st.textOverflow === "ellipsis" || st.overflow === "hidden" || st.overflowX === "hidden") && el.scrollWidth > el.clientWidth + 1; }).map((el) => el.innerText.trim().slice(0, 50)).slice(0, 15);

  // Tràn ngang: phần tử thò ra ngoài màn.
  const tranNgang = document.documentElement.scrollWidth > vw + 1;
  const thoRa = tranNgang ? [...document.querySelectorAll("body *")].filter((el) => thay(el) && el.getBoundingClientRect().right > vw + 2 && cs(el).position !== "fixed").map(lop).filter(Boolean).slice(0, 8) : [];

  // Chữ Anh / mã thô lộ ra (bỏ tên riêng được phép).
  const DUOC = /Island Booking System|Tour Đảo Booking|Harbour|Vinwonders|VinWonders|Zalo|Google|Face ID|iPhone|Safari|Chrome|PIN|QR|OK|Email|email|PNG|VNĐ|GPLX|CCCD|MST|Wi-Fi|IT|SĐT|Gmail|OTP|Booking|Cloudflare/g;
  const chuTrang = (document.body.innerText || "").replace(DUOC, " ");
  const tuAnh = [...new Set((chuTrang.match(/\b(?:draft|confirmed|cancelled|pending|completed|error|loading|null|undefined|NaN|true|false|admin|sales|partner|driver|status|submit|cancel|save|delete|edit|view|login|logout|dashboard|settings|home|search|filter|ticket|feedback|order|trip|vehicle|[a-z]+_[a-z_]+|[A-Z]{2,}_[A-Z_]+)\b/gi) || []))].slice(0, 20);

  // Điều hướng: mục đang thấy và mục sáng.
  const nav = [...document.querySelectorAll(".sidebar-item, .tabbar .tab, .topbar a, .topbar button")].filter(thay).map((el) => ({ ten: ten(el), sang: el.classList.contains("active") || el.getAttribute("aria-current") === "page" }));
  const coSidebar = !!document.querySelector(".sidebar") && thay(document.querySelector(".sidebar"));
  const coTabbar = !!document.querySelector(".tabbar") && thay(document.querySelector(".tabbar"));
  // Vùng dính (chân dính / thanh dính).
  const dinh = [...document.querySelectorAll("body *")].filter((el) => { const p = cs(el).position; return (p === "sticky" || p === "fixed") && thay(el); }).map((el) => `${lop(el) || el.tagName}:${cs(el).position}:${Math.round(el.getBoundingClientRect().top)}`).slice(0, 12);

  const rong = [...document.querySelectorAll("[class*=empty], [class*=rong], [class*=trong]")].filter(thay).map((el) => el.innerText.trim().slice(0, 100));
  const bang = [...document.querySelectorAll("table")].filter(thay).map((t) => ({ lop: lop(t), cot: t.querySelectorAll("thead th").length, dong: t.querySelectorAll("tbody tr").length, soCanhPhai: [...t.querySelectorAll("tbody td")].filter((td) => /^[\d.\s]+(đ|₫)?$/.test(td.innerText.trim()) && td.innerText.trim()).map((td) => cs(td).textAlign).reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {}) }));
  const phong = cs(document.body).fontFamily.split(",")[0];

  return {
    vw, vh, caoTrang: document.documentElement.scrollHeight, soManCuon: +(document.documentElement.scrollHeight / vh).toFixed(1), tranNgang, thoRa,
    tieuDe: document.title, h1, h2: [...new Set(h2)], soTuongTac: tuongTac.length, nhoHon44: nhoHon44.slice(0, 40), soNhoHon44: nhoHon44.length,
    oGoNho, oGoKieu: [...new Set(oGoKieu)], oKhongNhan: oKhongNhan.slice(0, 15), nutKieu, nutChinhTrongManDau, huyHieuKieu: huyHieuKieu.slice(0, 40), theKieu: theKieu.slice(0, 40),
    catChu, tuAnh, nav, coSidebar, coTabbar, dinh, rong, bang, phong, chuDau: (document.querySelector("main") || document.body).innerText.trim().slice(0, 400),
  };
})()
