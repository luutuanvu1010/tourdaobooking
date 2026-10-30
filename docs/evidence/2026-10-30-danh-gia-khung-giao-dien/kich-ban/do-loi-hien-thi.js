// Dò lỗi hiển thị trong trang (phiên đánh giá khung giao diện 30/10/2026). Trả về JSON; chạy bằng page.evaluate.
// Bốn phép dò, chỉ xét phần tử đang thấy:
//  cat   — chữ bị cắt: phần tử có chữ trực tiếp, overflow ẩn/ellipsis hoặc -webkit-line-clamp, và scrollWidth > clientWidth + 1
//          (hoặc scrollHeight > clientHeight + 2 khi có line-clamp). Ghi chữ đầy đủ để biết người dùng mất gì.
//  che   — phần tử bấm được (a, button, input, select, [role=button]) nằm TRỌN trong khung nhìn ở vị trí cuộn cuối trang mà
//          điểm giữa của nó bị một phần tử cố định/dính khác đè (elementFromPoint không phải chính nó/con nó).
//  tran  — phần tử thò ra ngoài mép phải khung nhìn (bỏ vùng cuộn ngang có chủ đích).
//  rong  — khối rộng ≥ 60% main mà phần có chữ/ô/nút chỉ chiếm ≤ 35% bề rộng (khối «một đầu»): ghi tỉ lệ.
(() => {
  const vw = innerWidth, vh = innerHeight;
  const thay = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity !== 0; };
  const ten = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id; const c = [...el.classList].slice(0, 3).join("."); if (c) s += "." + c; return s; };
  const chu = (el) => (el.innerText || el.value || "").replace(/\s+/g, " ").trim();
  const cuonNgang = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
  const kq = { cat: [], che: [], tran: [], rong: [] };

  for (const el of document.querySelectorAll("body *")) {
    if (!thay(el) || el.closest("svg, script, style, [aria-hidden=true]")) continue;
    const s = getComputedStyle(el);
    const coChuTrucTiep = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (coChuTrucTiep && !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
      const clamp = s.webkitLineClamp && s.webkitLineClamp !== "none";
      const anNgang = s.overflow === "hidden" || s.overflowX === "hidden" || s.textOverflow === "ellipsis";
      if ((anNgang && el.scrollWidth > el.clientWidth + 1) || (clamp && el.scrollHeight > el.clientHeight + 2)) {
        kq.cat.push({ el: ten(el), chu: chu(el).slice(0, 80), rong: Math.round(el.clientWidth), can: Math.round(el.scrollWidth) });
      }
    }
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && !cuonNgang(el) && s.position !== "fixed") kq.tran.push({ el: ten(el), phai: Math.round(r.right), vw });
  }

  // che: cuộn xuống cuối trang, xét phần tử bấm được nằm trọn trong khung nhìn
  scrollTo(0, document.documentElement.scrollHeight);
  for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button]")) {
    if (!thay(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw) continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const tren = document.elementFromPoint(x, y);
    if (tren && tren !== el && !el.contains(tren) && !tren.contains(el)) {
      let p = tren, coDinh = null;
      for (; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === "fixed" || ps === "sticky") { coDinh = p; break; } }
      if (coDinh && !coDinh.contains(el)) kq.che.push({ el: ten(el), chu: chu(el).slice(0, 50), biChe: ten(coDinh), y: Math.round(y) });
    }
  }
  scrollTo(0, 0);

  // rong: khối «một đầu»
  const main = document.querySelector("main");
  if (main) {
    const mw = main.getBoundingClientRect().width;
    for (const el of main.querySelectorAll("section, article, .the, .card, li, div")) {
      if (!thay(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 0.6 * mw || r.height > 400 || r.height < 24) continue;
      if (el.children.length < 2 || el.children.length > 8) continue;
      // tổng bề rộng phần nội dung thật (chữ, ô, nút, ảnh) theo trục ngang, hợp các đoạn
      const doan = [];
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (n.nodeType === 3) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) if (q.width > 0) doan.push([q.left, q.right]); }
        else if (/^(INPUT|SELECT|TEXTAREA|BUTTON|IMG|svg|CANVAS)$/i.test(n.tagName) && thay(n)) { const q = n.getBoundingClientRect(); doan.push([q.left, q.right]); }
      }
      if (!doan.length) continue;
      doan.sort((a, b) => a[0] - b[0]);
      let phu = 0, [a0, b0] = doan[0];
      for (const [a, b] of doan.slice(1)) { if (a > b0) { phu += b0 - a0; [a0, b0] = [a, b]; } else b0 = Math.max(b0, b); }
      phu += b0 - a0;
      const tiLe = phu / r.width;
      if (tiLe <= 0.35) kq.rong.push({ el: ten(el), rong: Math.round(r.width), noiDung: Math.round(phu), tiLe: Math.round(tiLe * 100), chu: chu(el).slice(0, 60) });
    }
    // giữ khối ngoài cùng: bỏ khối nằm trong một khối «rong» khác đã ghi
    kq.rong = kq.rong.slice(0, 12);
  }
  return kq;
})()
