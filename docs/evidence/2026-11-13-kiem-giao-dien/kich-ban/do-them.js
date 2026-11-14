// Phép đo THÊM cho kiểm giao diện toàn diện 13/11/2026 (bước 0), chạy trong trang, trả JSON. Bổ sung cho do-trong-trang.js (27/10) và do-loi-hien-thi.js (30/10).
//  t3   — T3 «phần tử nổi / dính đè nút hay số tiền»: cuộn TỪNG phần tử bấm được và TỪNG chữ số tiền (… đ / ₫) vào GIỮA khung nhìn (scrollIntoView center), rồi
//         elementFromPoint ở tâm. Chỉ tính khi thứ đè là phần tử position fixed/sticky KHÔNG chứa nó — tức là ở vị trí cuộn tốt nhất vẫn không chạm/đọc được.
//         (Khác phép «che» 30/10 đo ở cuối trang — phép đó đếm cả thanh dính trôi qua khi cuộn, README 30/10 ghi phần lớn là giả.)
//         Bỏ qua phần tử nằm trong khối cuộn riêng (thanh bên, bảng trượt) khi cả khối đó cố định — thanh bên dài hơn màn là chuyện của «soi-thanh-ben».
//  t7   — T7 khoảng trống: bề rộng <main>, mép trái/phải còn trống trong khung nhìn, bề rộng phần có nội dung thật (hợp các hộp con trực tiếp của main).
//  chong — chữ chồng chữ: hai phần tử lá có chữ (đang thấy, trong màn đầu và 3 màn tiếp) mà hộp chữ giao nhau > 4 px mỗi chiều. Dùng cho T16 và T2.
//  coChu — số cỡ chữ khác nhau trên phần tử có chữ đang thấy (T6), kèm 8 cỡ hay gặp nhất.
//  donVi — cỡ chữ gốc của <html> và <body> (T16: chữ đặt bằng px thì không theo cỡ chữ của máy).
(() => {
  const vw = innerWidth, vh = innerHeight;
  // Phần tử trong <details> đang ĐÓNG vẫn có hộp (Chrome giữ bố cục, ẩn bằng content-visibility) — coi là không thấy (lượt đầu 13/11 đếm nhầm ô quyền ở /staff).
  const thay = (el) => { if (el.closest("details:not([open]) > :not(summary)")) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity !== 0; };
  const ten = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id; const c = [...el.classList].slice(0, 3).join("."); if (c) s += "." + c; return s; };
  const chu = (el) => (el.getAttribute?.("aria-label") || el.innerText || el.value || "").replace(/\s+/g, " ").trim();
  const coDinhCha = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === "fixed" || ps === "sticky") return p; } return null; };
  const kq = { t3: [], t3Xet: 0, t7: null, chong: [], coChu: null, donVi: null };

  // ---- T3
  const TIEN = /\d{1,3}(?:\.\d{3})+\s?(?:đ|₫)/;
  const bam = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab]")].filter(thay);
  const tien = [...document.querySelectorAll("body *")].filter((el) => thay(el) && [...el.childNodes].some((n) => n.nodeType === 3 && TIEN.test(n.textContent)));
  const dsXet = [...bam.map((el) => ["nút", el]), ...tien.map((el) => ["tiền", el])].slice(0, 400);
  const yCu = scrollY;
  for (const [loai, el] of dsXet) {
    if (el.matches(".bo-qua, .skip-link, [class*=visually-hidden]")) continue; // liên kết «Bỏ qua tới nội dung chính»: chỉ hiện khi được Tab tới — không phải nút bị che
    const fixedCuaNo = coDinhCha(el);
    if (fixedCuaNo && getComputedStyle(fixedCuaNo).position === "fixed") continue; // chính nó ở thanh cố định: không xét (thanh bên/thanh tab tự lo)
    kq.t3Xet++;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const x = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(vh - 1, Math.max(0, r.top + r.height / 2));
    const tren = document.elementFromPoint(x, y);
    if (!tren || tren === el || el.contains(tren) || tren.contains(el)) continue;
    const de = coDinhCha(tren);
    if (de && !de.contains(el)) kq.t3.push({ loai, el: ten(el), chu: chu(el).slice(0, 50), biDeBoi: ten(de), y: Math.round(y), vh });
  }
  scrollTo(0, yCu);

  // ---- T7
  const main = document.querySelector("main") || document.querySelector("#app") || document.body;
  if (main) {
    const m = main.getBoundingClientRect();
    let trai = Infinity, phai = -Infinity;
    for (const c of main.children) { if (!thay(c)) continue; const r = c.getBoundingClientRect(); if (r.width < 2) continue; trai = Math.min(trai, r.left); phai = Math.max(phai, r.right); }
    kq.t7 = { mainRong: Math.round(m.width), mainTrai: Math.round(m.left), mainPhaiTrong: Math.round(vw - m.right), noiDungTrai: Number.isFinite(trai) ? Math.round(trai) : null, noiDungRong: Number.isFinite(trai) ? Math.round(phai - trai) : null, vw };
  }

  // ---- chồng chữ (trong 4 màn đầu)
  const la = [...document.querySelectorAll("body *")].filter((el) => {
    if (!thay(el) || el.closest("svg, [aria-hidden=true], .visually-hidden, .sr-only, .bo-qua")) return false;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
    const r = el.getBoundingClientRect();
    return r.top + scrollY < 4 * vh && r.width > 2 && r.height > 2;
  }).slice(0, 500);
  const hop = la.map((el) => {
    // Hộp của CHỮ (Range), không phải hộp phần tử — phần tử có đệm rộng không tính là chồng.
    const rg = document.createRange(); rg.selectNodeContents(el);
    const rs = [...rg.getClientRects()].filter((q) => q.width > 1 && q.height > 1);
    return { el, rs };
  });
  outer: for (let i = 0; i < hop.length; i++) for (let j = i + 1; j < hop.length; j++) {
    const a = hop[i], b = hop[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    // Chữ trôi DƯỚI thanh cố định/dính khi cuộn là bình thường: bỏ cặp mà chỉ MỘT bên nằm trong khối fixed/sticky (hoặc hai bên ở hai khối cố định khác nhau).
    const fa = coDinhCha(a.el), fb = coDinhCha(b.el);
    if (fa !== fb) continue;
    for (const p of a.rs) for (const q of b.rs) {
      const ox = Math.min(p.right, q.right) - Math.max(p.left, q.left), oy = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (ox > 4 && oy > 4) {
        // chỉ tính khi chữ trên thật sự che chữ dưới (một trong hai là phần tử trên cùng tại điểm giao)
        kq.chong.push({ a: ten(a.el), chuA: chu(a.el).slice(0, 40), b: ten(b.el), chuB: chu(b.el).slice(0, 40), ox: Math.round(ox), oy: Math.round(oy) });
        if (kq.chong.length >= 20) break outer;
        break;
      }
    }
  }

  // ---- cỡ chữ
  const dem = {};
  for (const { el } of hop) { const c = getComputedStyle(el).fontSize; dem[c] = (dem[c] || 0) + 1; }
  kq.coChu = { so: Object.keys(dem).length, hay: Object.entries(dem).sort((a, b) => b[1] - a[1]).slice(0, 8) };
  kq.donVi = { html: getComputedStyle(document.documentElement).fontSize, body: getComputedStyle(document.body).fontSize };
  return kq;
})()
