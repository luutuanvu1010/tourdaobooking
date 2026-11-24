// Chụp các «trạng thái hay bị quên» của giao diện cho lượt đánh giá thị giác 24/11/2026: khung xương lúc tải, lọc không ra, mất mạng, trang không có,
// không đủ quyền, lỗi biểu mẫu, bảng trượt, menu, chuông, hộp xác nhận (chỉ MỞ rồi ĐÓNG), bàn phím ảo (xấp xỉ bằng khung thấp hơn), tiêu điểm bàn phím, di chuột.
// Chỉ GET, đăng nhập và bấm mở/đóng lớp nổi. Mọi lời gọi ghi (POST/PUT/PATCH/DELETE) tới /api/ (trừ đăng nhập) bị chặn ngay trong trang bằng một lớp bọc fetch.
// Chạy từ GỐC kho: node docs/evidence/2026-11-24-danh-gia-thi-giac/kich-ban/trang-thai.mjs [--base http://127.0.0.1:8851] [--ra ~/tourdao-thi-giac-2026-11-24] [--chi ma1,ma2]
// Ghi: <ra>/anh/trang-thai/<mã>-<rộng>.jpg và <ra>/anh/trang-thai/ket-qua.json (mỗi ô: chụp được / không chụp được + ghi chú).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const GOC = process.cwd();
const lay = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const base = lay("--base") ?? "http://127.0.0.1:8851";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ chụp trên máy chủ thử cục bộ."); process.exit(2); }
const ra = resolve((lay("--ra") ?? join(homedir(), "tourdao-thi-giac-2026-11-24")).replace(/^~/, homedir()));
const rel = relative(resolve(GOC), ra);
if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) { console.error(`--ra (${ra}) nằm trong kho.`); process.exit(2); }
const chi = lay("--chi") ? new Set(lay("--chi").split(",")) : null;
const anhDir = join(ra, "anh", "trang-thai");
mkdirSync(anhDir, { recursive: true });

const { moChrome, dangNhap, sleep } = await import(pathToFileURL(join(GOC, "scripts/giao-dien/cdp.mjs")).href);
const tk = Object.fromEntries(JSON.parse(readFileSync(join(ra, "tai-khoan.json"), "utf8")).taiKhoan.map((t) => [t.khoa, t]));
const DON = "e7ee8ad3-713f-4ef4-a8c9-2d74dbac531a"; // màn số 18 của bảng màn 20/11

let KET_QUA = {};
try { KET_QUA = JSON.parse(readFileSync(join(anhDir, "ket-qua.json"), "utf8")); } catch { /* lần đầu */ }
const ghiKq = () => writeFileSync(join(anhDir, "ket-qua.json"), JSON.stringify(KET_QUA, null, 1));

// Lớp bọc chặn mọi lời gọi ghi (an toàn thêm); chạy trong trang sau mỗi lần tải.
const CHAN_GHI = `(() => { if (window.__chanGhi) return 0; window.__chanGhi = 1; const f = window.fetch; window.__daChan = []; window.fetch = function (u, o) { const m = String((o && o.method) || (u && u.method) || "GET").toUpperCase(); const url = String((u && u.url) || u); if (m !== "GET" && m !== "HEAD" && url.includes("/api/") && !url.includes("/api/auth/login")) { window.__daChan.push(m + " " + url); return Promise.reject(new TypeError("chặn ghi khi chụp")); } return f.apply(this, arguments); }; return 1; })()`;

const KHUNG = (w, h) => (w < 641 ? { w, h: h ?? 844, mobile: true, dpr: 2 } : { w, h: h ?? 800, mobile: false, dpr: 1 });
const ngans = new Map();
let chrome;
async function lamNgan(khoa) {
  if (ngans.has(khoa)) return ngans.get(khoa);
  const n = await chrome.moNgan();
  if (khoa !== "khach") await n.cookie(await dangNhap(base, tk[khoa].sdt, tk[khoa].pin), base);
  ngans.set(khoa, n);
  return n;
}
async function chup(n, ma, w) {
  const r = await n.s("Page.captureScreenshot", { format: "jpeg", quality: 82, captureBeyondViewport: false });
  if (!r.result?.data) throw new Error("chụp ảnh lỗi");
  writeFileSync(join(anhDir, `${ma}-${w}.jpg`), Buffer.from(r.result.data, "base64"));
}
async function vaoTrang(n, w, url, cho = 1100, h) {
  const k = KHUNG(w, h);
  await n.khung(k.w, k.h, k.mobile, k.dpr);
  await n.di(base + url);
  await sleep(cho);
  await n.ev(CHAN_GHI);
}
/** Bấm phần tử đầu tiên khớp bộ chọn (và chữ nếu có); trả mô tả hoặc null. */
const bam = (n, chon, chu) => n.ev(`(() => { const ds = [...document.querySelectorAll(${JSON.stringify(chon)})].filter((e) => e.getClientRects().length); const e = ds.find((x) => !${JSON.stringify(chu ?? "")} || (x.innerText || x.textContent || "").trim() === ${JSON.stringify(chu ?? "")}); if (!e) return null; e.click(); return e.tagName + "|" + (e.innerText || "").trim().slice(0, 30); })()`);
const moTa = (n) => n.ev(`(() => { const lop = document.querySelector('dialog[open], [role=dialog], .bang-truot, .sheet, .hop-thoai, .menu-tk, [role=menu]'); const nut = lop ? [...lop.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 25)) : []; return JSON.stringify({ lop: lop ? lop.tagName + '.' + String(lop.className).slice(0, 40) : null, nut, chan: window.__daChan || [] }); })()`);

const CAC_O = []; // { ma, rong[], tk, cach, chay(n, w) -> ghi chú | { khong: lý do } }
const o = (ma, rong, tkKhoa, cach, chay) => CAC_O.push({ ma, rong, tkKhoa, cach, chay });

// 1. Đang tải: khung xương. Tải một lần cho nóng bộ đệm rồi bật độ trễ 2,5 s và điều hướng bằng Page.navigate.
for (const [ma, url] of [["tai-trang-chu", "/"], ["tai-don-hang", "/orders"], ["tai-chi-tiet-don", `/order?id=${DON}`]]) {
  o(ma, [390, 1280], "sales", `Mở trang một lần cho nóng bộ đệm, bật độ trễ mạng 2,5 s, Page.navigate tới ${url.replace(/id=.+/, "id=…")}, chụp sau ~1 s`, async (n, w) => {
    await vaoTrang(n, w, url, 1200);
    await n.s("Network.emulateNetworkConditions", { offline: false, latency: 2500, downloadThroughput: -1, uploadThroughput: -1 });
    try {
      await n.s("Page.navigate", { url: base + url });
      await sleep(1000);
      await chup(n, ma, w);
      const thay = await n.ev(`JSON.stringify({ khungXuong: document.querySelectorAll('[class*=skel],[class*=khung-xuong],[aria-busy=true]').length, chu: (document.body.innerText || '').trim().length })`).catch(() => "trang đang đổi");
      return `đo lúc chụp: ${thay}`;
    } finally { await n.s("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await sleep(3500); }
  });
}
// 2. Lọc không ra
o("loc-khong-ra", [390, 1280], "sales", "Đơn hàng, gõ «zzzzqqq» vào ô tìm", async (n, w) => {
  await vaoTrang(n, w, "/orders");
  await n.ev(`(() => { const i = document.getElementById('q'); i.focus(); i.value = 'zzzzqqq'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(1800);
  await chup(n, "loc-khong-ra", w);
  return "";
});
// 3. Mất mạng
o("mat-mang", [390, 1280], "sales", "Đơn hàng, tắt mạng giả lập, bấm sang Danh bạ (máy tính) hoặc tab khác (điện thoại)", async (n, w) => {
  await vaoTrang(n, w, "/orders");
  await n.matMang(true);
  try {
    const b = await n.ev(`(() => { const ds = [...document.querySelectorAll('a.sidebar-item, a.tab')].filter((a) => a.getClientRects().length); const e = ds.find((a) => /Danh bạ/.test(a.innerText)) || ds.find((a) => !a.classList.contains('active') && a.getAttribute('aria-current') !== 'page'); if (!e) return null; const t = (e.innerText || '').trim(); e.click(); return t; })()`);
    await sleep(2500);
    await chup(n, "mat-mang", w);
    return `đã bấm «${b}»; đường dẫn sau đó ${await n.ev("location.pathname").catch(() => "?")}`;
  } finally { await n.matMang(false); await sleep(800); }
});
// 4. Không tồn tại
o("khong-ton-tai-trang", [390, 1280], "sales", "Mở /dia-chi-khong-co", async (n, w) => { await vaoTrang(n, w, "/dia-chi-khong-co"); await chup(n, "khong-ton-tai-trang", w); return `đường dẫn cuối ${await n.ev("location.pathname")}`; });
o("khong-ton-tai-don", [390, 1280], "sales", "Mở /order?id=khong-ton-tai", async (n, w) => { await vaoTrang(n, w, "/order?id=khong-ton-tai", 1800); await chup(n, "khong-ton-tai-don", w); return `đường dẫn cuối ${await n.ev("location.pathname + location.search")}`; });
// 5. Không quyền
o("khong-quyen-intern", [390, 1280], "intern", "Thực tập sinh mở /staff", async (n, w) => { await vaoTrang(n, w, "/staff", 1800); await chup(n, "khong-quyen-intern", w); return `đường dẫn cuối ${await n.ev("location.pathname")}`; });
o("khong-quyen-doi-tac", [390, 1280], "ctv", "Đối tác mở /so-cong-no", async (n, w) => { await vaoTrang(n, w, "/so-cong-no", 1800); await chup(n, "khong-quyen-doi-tac", w); return `đường dẫn cuối ${await n.ev("location.pathname")}`; });
// 6. Lỗi biểu mẫu đăng nhập
o("loi-bieu-mau-dang-nhap", [390, 1280], "khach", "/login chưa đăng nhập, bấm Đăng nhập khi hai ô trống", async (n, w) => {
  await vaoTrang(n, w, "/login", 1200);
  const b = await bam(n, "#submit");
  await sleep(700);
  await chup(n, "loi-bieu-mau-dang-nhap", w);
  return b ? "" : { khong: "không thấy nút #submit" };
});
// 7. Lỗi biểu mẫu tạo đơn (lớp bọc fetch chặn mọi lời gọi ghi; kiểm tại chỗ chạy trước lời gọi)
o("loi-bieu-mau-tao-don", [390, 1280], "sales", "/order-form chờ 9 s rồi bấm nút Lưu đơn khi chưa điền gì", async (n, w) => {
  await vaoTrang(n, w, "/order-form", 9000);
  const b = await bam(n, "#save");
  await sleep(900);
  await chup(n, "loi-bieu-mau-tao-don", w);
  const url = await n.ev("location.pathname");
  const chan = await n.ev("JSON.stringify(window.__daChan || [])");
  if (url !== "/order-form" || chan !== "[]") return { khong: `thao tác có vẻ đã gửi (url ${url}, chặn ${chan})` };
  return b ? `đã bấm «${b}»` : { khong: "không thấy nút #save" };
});
// 8. Bảng trượt, menu, chuông
o("bang-truot-loc-don", [390, 1280], "sales", "Đơn hàng, bấm nút «Lọc»", async (n, w) => { await vaoTrang(n, w, "/orders"); const b = await bam(n, "#loc-mo"); await sleep(900); await chup(n, "bang-truot-loc-don", w); return b ? await moTa(n) : { khong: "không thấy #loc-mo" }; });
o("bang-truot-dia-diem", [390, 1280], "quantri", "/locations, bấm «Thêm địa điểm» (không bấm Thêm)", async (n, w) => { await vaoTrang(n, w, "/locations", 1500); const b = await bam(n, "#add-mo"); await sleep(900); await chup(n, "bang-truot-dia-diem", w); return b ? await moTa(n) : { khong: "không thấy #add-mo" }; });
o("menu-tai-khoan", [390, 1280], "sales", "Bấm tên tài khoản ở thanh bên (1280) hoặc avatar ở thanh trên (390)", async (n, w) => { await vaoTrang(n, w, "/orders"); const b = await bam(n, w < 641 ? ".bar-avatar" : ".sidebar-user"); await sleep(700); await chup(n, "menu-tai-khoan", w); return b ? await moTa(n) : { khong: "không thấy nút tài khoản" }; });
o("chuong-thong-bao", [390, 1280], "sales", "Bấm chuông ở thanh trên", async (n, w) => { await vaoTrang(n, w, "/orders"); const b = await bam(n, ".bell"); await sleep(1500); await chup(n, "chuong-thong-bao", w); return b ? await moTa(n) : { khong: "không thấy chuông" }; });
// 9. Hộp xác nhận: chỉ mở rồi đóng, tuyệt đối không bấm nút xác nhận
o("hop-xac-nhan-huy-don", [390, 1280], "sales", "Chi tiết đơn (màn 18), bấm «Huỷ đơn» để mở hộp hỏi, chụp, đóng bằng Escape", async (n, w) => {
  await vaoTrang(n, w, `/order?id=${DON}`, 1500);
  await n.ev("(() => { const e = document.getElementById('huy-cuoi'); if (e) e.scrollIntoView({ block: 'center' }); })()"); await sleep(400);
  const b = await bam(n, "button", "Huỷ đơn");
  await sleep(900);
  await chup(n, "hop-xac-nhan-huy-don", w);
  const mt = b ? await moTa(n) : null;
  await n.ev("scrollTo(0, document.documentElement.scrollHeight); 0"); await sleep(500);
  await chup(n, "hop-xac-nhan-huy-don-cuon", w); // ảnh phụ: cuộn hết cỡ để thấy phần dưới của khung hỏi
  await n.phim("Escape", "Escape", 27); await sleep(400);
  return b ? mt : { khong: "không thấy nút «Huỷ đơn»" };
});
o("hop-dang-xuat", [1280], "sales", "Kiểm cách Đăng xuất hoạt động (không bấm)", async () => ({ khong: "đăng xuất không có hộp hỏi: nút «Đăng xuất» (menu tài khoản, trang Tôi) gọi logout() ngay rồi chuyển /login; không bấm để khỏi mất phiên" }));
// 10. Bàn phím ảo (xấp xỉ): khung thấp hơn 336 px
o("ban-phim-dang-nhap", [390], "khach", "Khung 390×508 (844 trừ ~336 bàn phím ảo), tiêu điểm vào ô số điện thoại ở /login", async (n, w) => {
  await vaoTrang(n, w, "/login", 1200, 508);
  await n.ev("document.getElementById('phone').focus()"); await sleep(700);
  await chup(n, "ban-phim-dang-nhap", w);
  return "xấp xỉ, không phải bàn phím thật";
});
o("ban-phim-tao-don", [390], "sales", "Khung 390×508, tiêu điểm vào ô tên khách ở /order-form", async (n, w) => {
  await vaoTrang(n, w, "/order-form", 9000, 508);
  await n.ev("(() => { const e = document.getElementById('customerName'); e.focus(); e.scrollIntoView({ block: 'center' }); })()"); await sleep(800);
  await chup(n, "ban-phim-tao-don", w);
  return "xấp xỉ, không phải bàn phím thật";
});
// 11. Tiêu điểm bàn phím, di chuột
o("tieu-diem-ban-phim", [1280], "sales", "Đơn hàng, bấm Tab 6 lần", async (n, w) => {
  await vaoTrang(n, w, "/orders");
  for (let i = 0; i < 6; i++) await n.phim("Tab", "Tab", 9);
  await sleep(300);
  await chup(n, "tieu-diem-ban-phim", w);
  return `phần tử đang giữ tiêu điểm: ${await n.ev("(() => { const e = document.activeElement; return e.tagName + '.' + String(e.className).slice(0, 30) + '|' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30); })()")}`;
});
o("di-chuot-dong", [1280], "sales", "Đơn hàng, đưa chuột lên dòng đơn thứ ba", async (n, w) => {
  await vaoTrang(n, w, "/orders");
  const p = await n.ev(`(() => { const r = [...document.querySelectorAll('a.order-row')][2]; if (!r) return null; r.scrollIntoView({ block: 'center' }); const b = r.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
  if (!p) return { khong: "không thấy dòng đơn" };
  await n.s("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x - 40, y: p.y }); await n.s("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
  await sleep(500);
  await chup(n, "di-chuot-dong", w);
  return "";
});
// 12. Thông báo nổi
o("thong-bao-noi", [1280], "sales", "Tìm thao tác không ghi mà hiện toast", async () => ({ khong: "không có thao tác an toàn: mọi chỗ gọi hienBaoNgan() trong web/ đều sau một lệnh ghi hoặc đổi trạng thái; các nút «chép» (hai-lop-ui, ve-don) đổi chữ nút hoặc hiện dòng riêng, không ra toast" }));

try {
  chrome = await moChrome();
  for (const c of CAC_O) {
    if (chi && !chi.has(c.ma)) continue;
    for (const w of c.rong) {
      const kq = { ma: c.ma, rong: w, taiKhoan: c.tkKhoa, cach: c.cach };
      for (let lan = 1; lan <= 3; lan++) {
        try {
          const n = await lamNgan(c.tkKhoa);
          const r = await Promise.race([c.chay(n, w), new Promise((_, rej) => setTimeout(() => rej(new Error("hết giờ 90 s")), 90000))]);
          if (r && typeof r === "object") { kq.ketQua = "không chụp được"; kq.lyDo = r.khong; } else { kq.ketQua = "chụp được"; kq.ghiChu = r || ""; }
          kq.loiConsole = [...(n.loi ?? [])].slice(0, 3);
          break;
        } catch (e) {
          kq.ketQua = "không chụp được"; kq.lyDo = `lỗi lần ${lan}: ${String(e.message).slice(0, 160)}`;
          await sleep(1500);
        }
      }
      KET_QUA[`${c.ma}-${w}`] = kq;
      ghiKq();
      console.error(`${kq.ketQua === "chụp được" ? "✓" : "✗"} ${c.ma}-${w} ${kq.lyDo ?? kq.ghiChu ?? ""}`);
    }
  }
} finally { if (chrome) await chrome.tat(); }
console.log(`Xong. Kết quả: ${join(anhDir, "ket-qua.json")}`);
