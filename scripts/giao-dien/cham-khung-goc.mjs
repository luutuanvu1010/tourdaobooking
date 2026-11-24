// Khung gốc giao diện (ADR-0222 Đ7b) — phần THUẦN của lệnh đo trên trang thật: đoạn đo chạy trong trang (`DO_TRONG_TRANG`) và hàm chấm một ô đo (`chamO`).
// Lệnh `npm run do-khung` (scripts/giao-dien/do-khung-goc.mjs) mở từng màn đã chuyển khuôn ở mọi bề rộng 360 tới 1.920 rồi gọi hai thứ này.
// Bài `src/khung-do.test.ts` chấm thử các ô đo dựng tay, để biết máy chấm bắt đúng từng loại lỗi.

/** Bảy bậc khoảng cách của thang (và 0). Khoảng cách dọc giữa các khối của trang phải thuộc tập này. */
export const THANG = [0, 4, 8, 12, 16, 24, 32, 48];

/** Sáu điều lệnh đo kiểm cho mỗi ô (màn × bề rộng) — đúng danh sách của ADR-0222 Đ7(b), cộng một điều kỹ thuật (không phần tử fixed trong vùng nội dung). */
export const DIEU_DO = ["tràn ngang", "chữ bị bóp", "khối lệch mép", "phần tử thò ra ngoài khối", "nhiều kiểu vỏ khối", "khoảng cách ngoài thang", "nút chính sai chỗ", "phần tử fixed trong vùng nội dung",
  "chữ đậm vượt trần", "nút nền đặc vượt trần", "số tiền lệch màu", "khối có bóng"];

/**
 * Bốn phép đo của ngôn ngữ thị giác (ADR-0234 Đ5b). TRẦN CHỈ ĐƯỢC HẠ theo từng đợt khung gốc; không ghi cứng một con số đích.
 * - tiLeDam: tỉ lệ đoạn chữ trong vùng nội dung có độ đậm LỚN HƠN chữ thân của trang (so với độ đậm của body, nên đứng được khi chủ chỉnh núm độ đậm);
 * - nutDac: số nút nền đặc (nền đậm, chữ sáng) đang hiện trong vùng nội dung, không tính thanh dính đáy;
 * - tienLech: số đoạn số tiền có màu khác --c-tien, --c-text-muted (tiền đã đủ) và chữ trên nền đậm (--c-on-summary, --c-on-dark);
 * - bongKhoi: số phần tử trong vùng nội dung (không tính lớp dính, lớp nổi) có bóng mờ.
 * Đo ở đợt gốc 24/11/2026 trên bốn màn mẫu, 360 tới 1.920 (máy thử, bộ núm của bản chạy thật): chữ đậm cao nhất theo khuôn Danh sách 41 %, Chi tiết 58 %,
 * Biểu mẫu 53 %, Thiết lập 28 %; nút nền đặc 1; tiền lệch màu 0; khối có bóng 0. Khuôn chưa có màn mẫu dùng mức cao nhất. Bài `src/khung-do.test.ts` khoá:
 * trần không được cao hơn lúc lập.
 */
export const TRAN_THI_GIAC = { tiLeDam: { "danh-sach": 0.41, "chi-tiet": 0.58, "bieu-mau": 0.53, "thiet-lap": 0.28 }, nutDac: 1, tienLech: 0, bongKhoi: 0 };
/** Trần chữ đậm của một khuôn (khuôn chưa có màn mẫu: mức cao nhất của bảng). */
export const tranDam = (tran, khuon) => tran.tiLeDam[khuon] ?? Math.max(...Object.values(tran.tiLeDam));

/**
 * Đoạn đo chạy trong trang (biểu thức trả về một đối tượng). Không viết dấu huyền trong chuỗi này.
 * - tranNgang: trang cuộn ngang được;
 * - bop: số đoạn chữ bị bóp dọc (hộp chữ hẹp hơn 24 điểm mà cao hơn ba dòng), vd: vài ví dụ;
 * - lech: số khối cấp ngoài cùng không kín vùng nội dung (sai số 1 điểm);
 * - tho: số phần tử thò ra ngoài khối chứa nó theo bề ngang;
 * - vo: các kiểu vỏ khối khác nhau (đệm, bo góc, bóng); khối bảng không đệm ghi «bang»;
 * - nhip: các khoảng cách dọc giữa những phần tử con đang hiện của vùng nội dung;
 * - coDinh: số phần tử `position: fixed` đang hiện trong vùng nội dung;
 * - loiNut: các câu mô tả nút chính đứng sai chỗ của khuôn.
 * Phần nằm trong `.vung-tu-do` (ngoại lệ có tên trong sổ) không bị đo bóp chữ, thò ra ngoài hay vỏ khối.
 */
export const DO_TRONG_TRANG = String.raw`(() => {
  const main = document.querySelector("main"); const ms = getComputedStyle(main); const m = main.getBoundingClientRect();
  const cl = m.left + parseFloat(ms.paddingLeft), cr = m.right - parseFloat(ms.paddingRight); const rongTrang = cr - cl;
  const khuon = document.body.dataset.khungGoc ?? null;
  const hien = (el) => { if (el.closest("[hidden], details:not([open]) > :not(summary)")) return false; const r = el.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) return false; const s = getComputedStyle(el); return s.visibility !== "hidden" && s.display !== "none"; };
  const tuDo = (el) => !!el.closest(".vung-tu-do");
  let bop = 0; const vd = []; const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let x = w.nextNode(); x; x = w.nextNode()) { const t = x.textContent.trim(); if (t.length < 6) continue; const p = x.parentElement; if (!hien(p) || tuDo(p)) continue; const s = getComputedStyle(p); const rg = document.createRange(); rg.selectNodeContents(x); const r = rg.getBoundingClientRect(); const dong = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4; if (r.width > 0 && r.width < 24 && r.height > dong * 3) { bop++; if (vd.length < 3) vd.push(t.slice(0, 24)); } }
  const khoi = [...main.querySelectorAll(".khoi")].filter(hien);
  const coNen = (k) => getComputedStyle(k).backgroundColor !== "rgba(0, 0, 0, 0)";
  const lech = khoi.filter((k) => !k.parentElement.closest(".khoi") && !k.closest(".hai-cot, .luoi") && coNen(k)).filter((k) => { const r = k.getBoundingClientRect(); return Math.abs(r.left - cl) > 1 || Math.abs(cr - r.right) > 1; }).length;
  let tho = 0; const vdTho = []; for (const k of khoi) { const kr = k.getBoundingClientRect(); for (const e of k.querySelectorAll("*")) { if (!hien(e) || e.closest("svg") || tuDo(e)) continue; const r = e.getBoundingClientRect(); if (r.right > kr.right + 1 || r.left < kr.left - 1) { tho++; if (vdTho.length < 2) vdTho.push(e.tagName.toLowerCase() + "." + [...e.classList].slice(0, 2).join(".")); } } }
  const vo = [...new Set(khoi.filter(coNen).map((k) => { const s = getComputedStyle(k); return [s.paddingTop, s.paddingLeft, s.borderTopLeftRadius, s.boxShadow === "none" ? "khong-bong" : "bong"].join("/"); }).map((x) => x.replace(/^0px\/0px/, "bang")))];
  // Thanh dính đáy chỉ tính khoảng cách khi nó đang nằm ở chỗ tự nhiên (trang ngắn hơn màn); lúc đang dính thì nó đè lên nội dung, không có khoảng cách để đo.
  const choTuNhien = (e) => { const s = getComputedStyle(e); if (s.position !== "sticky") return true; const d = parseFloat(s.bottom); return Number.isNaN(d) || e.getBoundingClientRect().bottom < innerHeight - d - 1; };
  const con = [...main.children].flatMap((e) => getComputedStyle(e).display === "contents" ? [...e.children] : [e]).filter((e) => hien(e) && !/^(fixed|absolute)$/.test(getComputedStyle(e).position) && choTuNhien(e));
  const thuTu = con.map((e) => [e, Number(getComputedStyle(e).order) || 0]).sort((a, b) => a[1] - b[1] || a[0].getBoundingClientRect().top - b[0].getBoundingClientRect().top).map((x) => x[0]);
  const nhip = new Set(); for (let i = 1; i < thuTu.length; i++) { const d = Math.round(thuTu[i].getBoundingClientRect().top - thuTu[i - 1].getBoundingClientRect().bottom); if (d >= 0) nhip.add(d); }
  const coDinh = [...main.querySelectorAll("*")].filter((e) => getComputedStyle(e).position === "fixed" && hien(e)).length;
  // ---- Nút chính đúng chỗ của khuôn ----
  const loiNut = []; const loi = (c) => { if (!loiNut.includes(c)) loiNut.push(c); };
  const ds = (sel, goc) => [...(goc || main).querySelectorAll(sel)].filter(hien);
  const CHINH = '.nut[data-cap="chinh"], .nut[data-tong="san-ho"]';
  const chinhTrang = ds(CHINH).filter((e) => !e.closest(".khoi"));
  const mepTrong = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { trai: r.left + parseFloat(s.paddingLeft), phai: r.right - parseFloat(s.paddingRight), tren: r.top, duoi: r.bottom }; };
  const dayHien = ds(".thanh-day")[0] || null;
  const soatDay = () => { if (chinhTrang.length && (!dayHien || !chinhTrang.every((e) => dayHien.contains(e)))) loi("vùng nội dung hẹp hơn 560: nút chính của trang không nằm trong thanh dính đáy"); if (dayHien) { const b = dayHien.getBoundingClientRect().bottom; if (b > innerHeight + 1) loi("thanh dính đáy nằm ngoài màn hình"); else if (document.documentElement.scrollHeight > innerHeight + 1 && Math.abs(b - innerHeight) > 1) loi("thanh dính đáy không nằm sát đáy màn hình"); } };
  if (khuon === "bieu-mau") {
    if (rongTrang >= 560) {
      const thanh = ds('.thanh-nut[data-kieu="trang"]')[0] || null;
      if (dayHien) loi("vùng nội dung từ 560 mà thanh dính đáy vẫn hiện");
      if (chinhTrang.length && !thanh) loi("nút chính của trang không nằm trong thanh nút cuối biểu mẫu");
      if (thanh) { const mt = mepTrong(thanh); const c = ds(CHINH, thanh); if (c.length !== 1) loi("thanh nút cuối biểu mẫu có " + c.length + " nút chính (cần đúng một)"); else if (Math.abs(c[0].getBoundingClientRect().right - mt.phai) > 1) loi("nút chính không ở mép phải thanh nút cuối biểu mẫu"); const nh = ds('.nut[data-cap="nguy-hiem"]', thanh)[0]; if (nh && Math.abs(nh.getBoundingClientRect().left - mt.trai) > 1) loi("việc nguy hiểm không ở mép trái thanh nút cuối biểu mẫu"); }
    } else soatDay();
  } else if (khuon === "chi-tiet") {
    if (rongTrang >= 560) {
      const tv = ds(".thanh-viec[data-len-dau]")[0] || null;
      if (dayHien) loi("vùng nội dung từ 560 mà thanh dính đáy vẫn hiện");
      if (chinhTrang.length && (!tv || !chinhTrang.some((e) => tv.contains(e)))) loi("nút chính của trang không nằm trong thanh việc đầu trang");
      if (tv) { const tr = tv.getBoundingClientRect(); const c = ds(CHINH, tv)[0]; if (c && Math.abs(c.getBoundingClientRect().left - cl) > 1) loi("nút chính không ở mép trái thanh việc"); const nh = ds('.nut[data-cap="nguy-hiem"]', tv)[0]; if (nh && Math.abs(nh.getBoundingClientRect().right - cr) > 1) loi("việc nguy hiểm không ở mép phải thanh việc"); const khoiDau = Math.min(...khoi.map((k) => k.getBoundingClientRect().top)); if (khoi.length && tr.top > khoiDau) loi("thanh việc không đứng trên các khối"); }
    } else soatDay();
  } else if (khuon === "danh-sach") {
    for (const c of chinhTrang) { if (!c.closest(".thanh-loc, .dau-trang")) loi("nút chính của trang không nằm ở đầu trang (thanh tìm và lọc)"); else if (Math.abs(c.getBoundingClientRect().right - cr) > 1) loi("nút chính của trang không ở mép phải đầu trang"); }
  } else if (khuon === "thiet-lap") {
    for (const k of khoi) { const v = [...k.children].find((e) => e.classList.contains("khoi-viec") && hien(e)); const d = [...k.children].find((e) => e.classList.contains("khoi-dau") && hien(e)); if (!v || !d) continue; const oDau = v.dataset.cho === "dau" || k.getBoundingClientRect().width - 2 * parseFloat(getComputedStyle(k).paddingLeft || "0") >= 560; if (!oDau) continue; const vr = v.getBoundingClientRect(), dr = d.getBoundingClientRect(), kr = k.getBoundingClientRect(); const nutCuoi = ds(".nut", v).pop(); const demPhai = parseFloat(getComputedStyle(v).paddingRight) + parseFloat(getComputedStyle(k).paddingRight); if (nutCuoi && Math.abs(nutCuoi.getBoundingClientRect().right - (kr.right - demPhai)) > 1) loi("nút của khối không ở mép phải đầu khối"); if (Math.abs((vr.top + vr.bottom) / 2 - (dr.top + dr.bottom) / 2) > 8) loi("nút của khối không cùng hàng với tên khối"); }
  }
  // ---- Ngôn ngữ thị giác (ADR-0234 Đ5b) ----
  const damThan = Number(getComputedStyle(document.body).fontWeight) || 400;
  let tongChu = 0, chuDam = 0; const w2 = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let x = w2.nextNode(); x; x = w2.nextNode()) { if (!x.textContent.trim()) continue; const p = x.parentElement; if (!hien(p) || tuDo(p) || p.closest("svg")) continue; tongChu++; if (Number(getComputedStyle(p).fontWeight) > damThan) chuDam++; }
  const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const sang = (c) => { const [r, g, b] = rgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  const dac = (e) => { const s = getComputedStyle(e); const n = rgb(s.backgroundColor); return (n[3] === undefined || n[3] === 1) && sang(s.backgroundColor) < 0.5 && sang(s.color) > 0.7; };
  const nutDac = [...main.querySelectorAll("button, a, [role=button]")].filter((e) => hien(e) && !e.closest(".thanh-day") && dac(e)).length;
  const mau = (v) => { const t = document.createElement("span"); t.style.color = "var(" + v + ")"; document.body.append(t); const c = getComputedStyle(t).color; t.remove(); return c; };
  const mauTien = new Set(["--c-tien", "--c-text-muted", "--c-on-summary", "--c-on-dark"].map(mau));
  let tienLech = 0; const vdTien = [];
  for (const e of main.querySelectorAll("*")) { if (!hien(e) || tuDo(e)) continue; const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""); if (!/\d[\d.,]*\s?(₫|đ)(?![\p{L}])/u.test(t)) continue; const c = getComputedStyle(e).color; if (!mauTien.has(c)) { tienLech++; if (vdTien.length < 3) vdTien.push(t.trim().slice(0, 16) + " " + c); } }
  const coMo = (bs) => bs !== "none" && bs.split(/,(?![^(]*\))/).some((p) => !/inset/.test(p) && (p.replace(/rgba?\([^)]*\)/g, "").match(/-?[\d.]+px/g) || []).map(parseFloat)[2] > 0);
  const bongKhoi = [...main.querySelectorAll("*")].filter((e) => hien(e) && !tuDo(e) && !/^(sticky|fixed)$/.test(getComputedStyle(e).position) && !e.closest('.thanh-day, .thanh-nut[data-kieu="trang"], [role=dialog], [role=menu]') && coMo(getComputedStyle(e).boxShadow)).length;
  return { khuon, tiLeDam: tongChu ? Math.round((chuDam / tongChu) * 100) / 100 : 0, nutDac, tienLech, vdTien, bongKhoi, noiDung: Math.round(rongTrang), tranNgang: document.documentElement.scrollWidth > innerWidth + 1, bop, vd, lech, tho, vdTho, vo, nhip: [...nhip].sort((a, b) => a - b), soKhoi: khoi.length, coDinh, loiNut };
})()`;

/** Chấm một ô đo: trả các câu lỗi (mảng rỗng = đạt). `khuonKhai` là khuôn khai ở tệp HTML của trang. */
export function chamO(o, khuonKhai, tran = TRAN_THI_GIAC) {
  const loi = [];
  if (o.loi) return [`không đo được: ${o.loi}`];
  if (o.khuon !== khuonKhai) loi.push(`trang đang chạy khai khuôn «${o.khuon ?? "(không)"}», tệp HTML khai «${khuonKhai}»: máy thử đang chạy bản cũ?`);
  if (o.soKhoi === 0) loi.push("không thấy khối nào của khung: trang chưa dựng xong lúc đo, hoặc chưa dựng bằng khung");
  if (o.tranNgang) loi.push("tràn ngang");
  if (o.bop) loi.push(`chữ bị bóp ${o.bop} đoạn (${(o.vd ?? []).join(" | ")})`);
  if (o.lech) loi.push(`khối lệch mép vùng nội dung: ${o.lech}`);
  if (o.tho) loi.push(`phần tử thò ra ngoài khối: ${o.tho} (${(o.vdTho ?? []).join(", ")})`);
  const voThuong = (o.vo ?? []).filter((v) => !v.startsWith("bang"));
  if (voThuong.length > 1) loi.push(`nhiều kiểu vỏ khối: ${voThuong.join(" ; ")}`);
  const nhipLa = (o.nhip ?? []).filter((d) => !THANG.includes(d));
  if (nhipLa.length) loi.push(`khoảng cách ngoài thang: ${nhipLa.join(", ")}`);
  if (o.coDinh) loi.push(`phần tử fixed trong vùng nội dung: ${o.coDinh}`);
  for (const c of o.loiNut ?? []) loi.push(`nút chính sai chỗ: ${c}`);
  // Ngôn ngữ thị giác (ADR-0234 Đ5b): ô đo cũ không có trường thì bỏ qua (máy chấm vẫn dùng được cho số đo trước đợt gốc).
  if (o.tiLeDam > tranDam(tran, khuonKhai)) loi.push(`chữ đậm vượt trần: ${Math.round(o.tiLeDam * 100)} % > ${Math.round(tranDam(tran, khuonKhai) * 100)} %`);
  if (o.nutDac > tran.nutDac) loi.push(`nút nền đặc vượt trần: ${o.nutDac} > ${tran.nutDac}`);
  if (o.tienLech > tran.tienLech) loi.push(`số tiền lệch màu: ${o.tienLech} (${(o.vdTien ?? []).join(" | ")})`);
  if (o.bongKhoi > tran.bongKhoi) loi.push(`khối có bóng: ${o.bongKhoi}`);
  return loi;
}

/** Dãy bề rộng cửa sổ cần quét. */
export function dayBeRong(tu = 360, den = 1920, buoc = 20) {
  if (!(tu > 0 && den >= tu && buoc > 0)) throw new Error("khoảng bề rộng không hợp lệ");
  const ra = [];
  for (let w = tu; w <= den; w += buoc) ra.push(w);
  return ra;
}

/** Đối chiếu bảng màn cần đo với các trang đã khai khuôn: trang đã chuyển mà không có dòng nào trong bảng là ĐO THIẾU. */
export function trangDoThieu(trangDaChuyen, bangMan) {
  const duong = new Set(bangMan.map((m) => m.trang.split("?")[0]));
  return trangDaChuyen.filter((t) => !duong.has(t));
}
