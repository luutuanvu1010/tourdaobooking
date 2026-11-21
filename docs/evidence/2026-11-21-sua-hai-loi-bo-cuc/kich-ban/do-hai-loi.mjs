// Đo hai lỗi bố cục sửa ngày 21/11/2026 trên MÁY CHỦ THỬ cục bộ (không chạm bản chạy thật):
//   (1) màn Đơn hàng: cột tên khách bị bóp khi vùng nội dung hẹp; (2) Chính sách điều phối ở điện thoại: nút lưu trong thẻ bị giấu dù không có thanh nút đáy thay nó
//       (Quản trị mất «Lưu hạn chốt»; thẻ Hạn mức Từ chối của Toàn quyền mất «Lưu cài đặt»).
// Chạy từ GỐC kho, máy chủ thử đang chạy (xem README.md ở thư mục cha):
//   node docs/evidence/2026-11-21-sua-hai-loi-bo-cuc/kich-ban/do-hai-loi.mjs --nhan truoc                (bản chưa sửa: lưu số đo và ảnh làm mốc; KHÔNG ghi gì)
//   node docs/evidence/2026-11-21-sua-hai-loi-bo-cuc/kich-ban/do-hai-loi.mjs --nhan sau --so truoc --luu (bản đã sửa: đo lại, so với mốc, bấm lưu thật, tự chấm; có ✗ thì thoát 1)
// Tuỳ chọn: --base http://127.0.0.1:8841   --ra ~/tourdao-sua-hai-loi-2026-11-21   --tk ~/tourdao-danh-gia-2026-11-20/tai-khoan.json   --khong-anh
//           --cham-lai (không mở trình duyệt: đọc lại số đo đã lưu của --nhan rồi chấm và so lại)
// Phần đo chỉ đăng nhập và đọc. Chỉ khi có --luu kịch bản mới bấm lưu, SAU khi đo xong mọi thứ: mỗi nút lưu một lần đổi số rồi một lần lưu trả số cũ.
// Lần lưu GHI vào kho dữ liệu của máy chủ thử (thêm bản chính sách vào lịch sử): chỉ chạy trên bản chép riêng của kho thử. Hai lượt «truoc» / «sau» phải đo trên
// cùng một trạng thái dữ liệu thì phép so mới có nghĩa (lịch sử bản dài thêm làm cột lịch sử ở máy tính cao lên).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { dangNhap, moChrome, sleep } from "../../../../scripts/giao-dien/cdp.mjs";

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const co = (k) => process.argv.includes(k);
const nha = (p) => resolve(p.replace(/^~/, homedir()));
const base = lay("--base", "http://127.0.0.1:8841");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ đo trên máy chủ thử cục bộ."); process.exit(2); }
const nhan = lay("--nhan", "sau");
const ra = nha(lay("--ra", "~/tourdao-sua-hai-loi-2026-11-21"));
const thuMucAnh = resolve(ra, "anh", nhan);
const thuMucSo = resolve(ra, "so-do");
mkdirSync(thuMucAnh, { recursive: true });
mkdirSync(thuMucSo, { recursive: true });
const KHOA_TK = { SALES: "sales", INTERN: "intern", ACCOUNTING: "ketoan", ADMIN: "quantri", FIELD: "hdv", PARTNER: "ctv", SUPER_ADMIN: "toanquyen" };
const dsTk = Object.fromEntries(JSON.parse(readFileSync(nha(lay("--tk", "~/tourdao-danh-gia-2026-11-20/tai-khoan.json")), "utf8")).taiKhoan.map((t) => [t.khoa, t]));

// Cột tên khách của bảng phải còn ít nhất chừng này điểm (cùng con số với bài kiểm src/don-hang-bang-theo-vung.test.ts).
const TEN_TOI_THIEU = 98;
const BO_DON = ["SALES", "ACCOUNTING", "INTERN", "FIELD", "PARTNER"];
const RONG_DAY_DU = [390, 768, 1040, 1090, 1100, 1130, 1199, 1200, 1250, 1255, 1256, 1280, 1366, 1440, 1920]; // 1.255 / 1.256: hai bên mốc bật bảng (vùng nội dung 959 / 960)
const RONG_GON = [390, 1130, 1280, 1440];
const RONG_PHAI_LA_BANG = [1280, 1366, 1440, 1920];
const RONG_PHAI_LA_THE = [390, 768, 1040, 1090];
const RONG_CHUP = [390, 1130, 1280];

// ---- phép đo chạy trong trang (chuỗi mẫu: không viết dấu huyền trong khối này) ----
const DO_DON = String.raw`(() => {
  const q = (s, g = document) => g.querySelector(s);
  const hop = (e) => { if (!e || e.getClientRects().length === 0) return null; const r = e.getBoundingClientRect(); return [r.left, r.top + scrollY, r.width, r.height].map((v) => Math.round(v * 100) / 100); };
  const main = q("main"); const ms = getComputedStyle(main); const dau = q(".don-bang-dau"); const list = q("#list");
  const the = [...list.querySelectorAll(":scope > .order-card")];
  const bop = []; const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let x = w.nextNode(); x; x = w.nextNode()) { const t = x.textContent.trim(); if (t.length < 6) continue; const p = x.parentElement; const s = getComputedStyle(p); if (s.visibility === "hidden" || s.display === "none") continue;
    const rg = document.createRange(); rg.selectNodeContents(x); const r = rg.getBoundingClientRect(); const dong = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4; if (r.width > 0 && r.width < 24 && r.height > dong * 3) bop.push(t.slice(0, 24)); }
  const ten = the.map((t) => q(".order-row-name", t)).filter(Boolean).map((e) => e.getBoundingClientRect());
  const sb = q("#sidebar");
  return {
    vw: innerWidth, thanhBen: sb && getComputedStyle(sb).display !== "none" ? Math.round(sb.getBoundingClientRect().width) : 0,
    noiDung: Math.round(main.getBoundingClientRect().width - parseFloat(ms.paddingLeft) - parseFloat(ms.paddingRight)),
    cheDo: the.length === 0 ? "rong" : getComputedStyle(q(".order-row", the[0])).gridTemplateColumns.trim().split(/\s+/).length === 6 ? "bang" : "the",
    dauHien: !!dau && getComputedStyle(dau).display !== "none", soThe: the.length, bop: bop.length, vd: bop.slice(0, 2),
    tranNgang: document.documentElement.scrollWidth > innerWidth + 1,
    tenMin: ten.length ? Math.round(Math.min(...ten.map((r) => r.width)) * 10) / 10 : null, tenCaoMax: ten.length ? Math.round(Math.max(...ten.map((r) => r.height))) : null,
    caoTrang: document.documentElement.scrollHeight,
    hop: { thanhLoc: hop(q(".toolbar")), chip: hop(q("#loc-chip")), dau: hop(dau), list: hop(list), rong: hop(q("#empty")), them: hop(q("#more")),
      the: the.slice(0, 5).map((t) => ({ the: hop(t), khi: hop(q(".order-row-when", t)), ten: hop(q(".order-row-name", t)), sdt: hop(q(".order-row-phone", t)), khach: hop(q(".order-row-pax", t)), tien: hop(q(".order-row-remaining", t)), tt: hop(q(".order-row-top .badge", t)), mo: hop(q(".order-card-toggle", t)) })) },
  };
})()`;
const DO_CS = String.raw`(() => {
  const q = (s, g = document) => g.querySelector(s);
  const hien = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
  const hopKhung = (e) => { if (!hien(e)) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 100) / 100); };
  const hopTrang = (e) => { if (!hien(e)) return null; const r = e.getBoundingClientRect(); return [r.left, r.top + scrollY, r.width, r.height].map((v) => Math.round(v * 100) / 100); };
  const main = q("main");
  const nut = [...main.querySelectorAll("button")].filter((b) => /^(Lưu|Đang lưu)/.test(b.textContent.trim())).map((b) => {
    const r = b.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const trongKhung = hien(b) && cy > 0 && cy < innerHeight && cx > 0 && cx < innerWidth;
    const trung = trongKhung ? document.elementFromPoint(cx, cy) : null;
    return { chu: b.textContent.trim(), noi: b.closest("#cs-bottom") ? "thanh-day" : b.closest("#cs-form") ? "the-chinh-sach" : b.closest("#hm-the") ? "the-han-muc" : "khac", hien: hien(b), trongKhung, bamDuoc: !!trung && (trung === b || b.contains(trung)), hop: b.closest("#cs-bottom") ? hopKhung(b) : hopTrang(b) };
  });
  const tab = q("#tabbar");
  return { vw: innerWidth, vh: innerHeight, coForm: hien(q("#cs-form .dp-cs-nums")), nut,
    nutChinhSach: nut.filter((n) => n.hien && (n.noi === "thanh-day" || n.noi === "the-chinh-sach")).length, nutHanMuc: nut.filter((n) => n.hien && n.noi === "the-han-muc").length,
    coFormHanMuc: hien(q("#hm-the .hm-form")), thanhTab: hien(tab) ? hopKhung(tab) : null, tranNgang: document.documentElement.scrollWidth > innerWidth + 1, caoTrang: document.documentElement.scrollHeight,
    hop: { khung: hopTrang(q("#cs-layout")), the: hopTrang(q("#cs-form")), lichSu: hopTrang(q("#cs-lich-su")), hanMuc: hopTrang(q("#hm-the")), formHanMuc: hopTrang(q("#hm-the .hm-form")), thanhDay: hopKhung(q("#cs-bottom")) } };
})()`;

const chupPng = async (ngan, tep) => { if (co("--khong-anh")) return; const r = await ngan.s("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); if (r.result?.data) writeFileSync(tep, Buffer.from(r.result.data, "base64")); };
const khung = (ngan, w) => (w < 641 ? ngan.khung(w, 844, true, 2, "iphone") : ngan.khung(w, 820, false, 1, "may-tinh"));
const cho = async (ngan, bieuThuc, moTa, han = 8000) => { const het = Date.now() + han; for (;;) { if (await ngan.ev(bieuThuc).catch(() => false)) return true; if (Date.now() > het) { console.log(`  (hết giờ chờ: ${moTa})`); return false; } await sleep(150); } };
const moDon = async (ngan, duoi = "") => { await ngan.di(base + "/orders" + duoi); await cho(ngan, `document.querySelector("#loading")?.hidden === true && (document.querySelectorAll("#list > .order-card").length > 0 || document.querySelector("#empty")?.hidden === false)`, "danh sách đơn"); await sleep(700); };
const moCs = async (ngan) => { await ngan.di(base + "/chinh-sach-dieu-phoi"); await cho(ngan, `!!document.querySelector("#cs-form .dp-cs-nums")`, "form chính sách"); await cho(ngan, `document.querySelector("#hm-the")?.hidden === false`, "thẻ hạn mức", 6000); await sleep(700); };
const moNganCua = async (chrome, bo) => { const tk = dsTk[KHOA_TK[bo]]; const ngan = await chrome.moNgan(); await ngan.cookie(await dangNhap(base, tk.sdt, tk.pin), base); return ngan; };
const cham = async (ngan, x, y, diDong) => {
  if (diDong) { await ngan.s("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }); await ngan.s("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
  else { for (const type of ["mousePressed", "mouseReleased"]) await ngan.s("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); }
};
/**
 * Đổi số ở ô `o` (cộng 1), chạm đúng nút lưu ĐANG NHÌN THẤY mà `nutJs` tìm ra, chờ câu báo `baoJs` hiện; rồi lưu trả số cũ theo cùng cách.
 * Chạm bằng toạ độ thật (cảm ứng ở điện thoại, chuột ở máy tính), không gọi .click(): nút bị che hay bị giấu thì không lưu được.
 * Hai lần lưu diễn ra LIỀN NHAU trên cùng một trang, không tải lại: đây cũng là phép thử cho lỗi «lưu lần hai không gửi gì» của biểu mẫu chính sách đầy đủ
 * (Toàn quyền), tìm thấy và sửa ngày 21/11/2026 — trước khi sửa, lần lưu trả số cũ của Toàn quyền hết giờ chờ vì không có lệnh nào được gửi đi.
 */
async function luuThu(ngan, { o, nutJs, baoJs, diDong, tepAnh }) {
  const cu = await ngan.ev(`document.querySelector(${JSON.stringify(o)})?.value ?? null`);
  if (cu === null || !/^\d+$/.test(cu)) return { thu: false, lyDo: `không đọc được ô ${o}` };
  const docBao = `(() => { const e = ${baoJs}; return e && !e.hidden && e.getClientRects().length > 0 ? e.textContent.trim() : ""; })()`;
  // Câu báo «nhìn thấy được»: nằm trọn trong khung nhìn và không bị thanh dính nào che (thử ở sát mép trên và sát mép dưới của nó).
  const thayBao = `(() => { const e = ${baoJs}; if (!e || e.hidden || e.getClientRects().length === 0) return false; const r = e.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) return false;
    return [r.top + 4, r.bottom - 4].every((y) => { const t = document.elementFromPoint(r.left + r.width / 2, y); return !!t && (t === e || e.contains(t)); }); })()`;
  const timNut = `(() => { const b = ${nutJs}; if (!b || b.getClientRects().length === 0) return null; b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y);
    return { x: Math.round(x), y: Math.round(y), chu: b.textContent.trim(), bamDuoc: !!t && (t === b || b.contains(t)), tat: b.disabled }; })()`;
  const bam = async (giaTri) => {
    await ngan.ev(`(() => { const e = document.querySelector(${JSON.stringify(o)}); e.focus(); e.value = ${JSON.stringify(giaTri)}; e.dispatchEvent(new Event("input", { bubbles: true })); e.blur(); const b = ${baoJs}; if (b) b.hidden = true; })()`);
    await sleep(250);
    if (!(await ngan.ev(timNut))) return { coNut: false };
    await sleep(400); // chờ cuộn xong rồi mới lấy toạ độ
    const n = await ngan.ev(timNut);
    if (!n || !n.bamDuoc || n.tat) return { coNut: !!n, bamDuoc: false, nut: n };
    await cham(ngan, n.x, n.y, diDong);
    const daLuu = await cho(ngan, docBao, `câu báo đã lưu sau khi chạm «${n.chu}»`, 7000);
    await sleep(300);
    return { coNut: true, bamDuoc: true, nut: n, daLuu, bao: await ngan.ev(docBao), baoThay: await ngan.ev(thayBao), soSauLuu: await ngan.ev(`document.querySelector(${JSON.stringify(o)})?.value ?? null`) };
  };
  const kq1 = { thu: true, soCu: cu, soMoi: String(Number(cu) + 1) };
  kq1.lan1 = await bam(kq1.soMoi);
  if (kq1.lan1.daLuu) { if (tepAnh) await chupPng(ngan, tepAnh); kq1.traLai = await bam(cu); }
  kq1.dat = kq1.lan1.daLuu === true && kq1.lan1.soSauLuu === kq1.soMoi && kq1.traLai?.daLuu === true && kq1.traLai.soSauLuu === cu;
  kq1.thayBao = kq1.lan1.baoThay === true && kq1.traLai?.baoThay === true;
  return kq1;
}
const NUT_CHINH_SACH = `[...document.querySelectorAll("#cs-form button, #cs-bottom button")].find((b) => b.getClientRects().length > 0 && /^Lưu/.test(b.textContent.trim()))`;
const NUT_HAN_MUC = `[...document.querySelectorAll("#hm-the .hm-form button")].find((b) => b.getClientRects().length > 0 && /^Lưu/.test(b.textContent.trim()))`;
const BAO_CHINH_SACH = `document.querySelector("#cs-ok")`;
const BAO_HAN_MUC = `document.querySelector("#hm-the .alert.ok")`;

let kq = { nhan, luc: new Date().toISOString(), base, don: [], chinhSach: [], luu: [] };
const tepSo = resolve(thuMucSo, `do-hai-loi-${nhan}.json`);
const chamLai = co("--cham-lai");
const chrome = chamLai ? null : await moChrome();
if (chamLai) kq = JSON.parse(readFileSync(tepSo, "utf8"));
else try {
  // ---- (1) Đơn hàng: năm bộ quyền, nhiều bề rộng (chỉ đọc) ----
  for (const bo of BO_DON) {
    const ngan = await moNganCua(chrome, bo);
    for (const w of bo === "SALES" ? RONG_DAY_DU : RONG_GON) {
      await khung(ngan, w); await moDon(ngan);
      const o = { bo, rong: w, canh: "mac-dinh", ...(await ngan.ev(DO_DON)) }; kq.don.push(o);
      console.log(`Đơn hàng ${bo.padEnd(10)} @${String(w).padStart(4)}  nội dung ${String(o.noiDung).padStart(4)}  ${o.cheDo.padEnd(4)}  cột tên hẹp nhất ${String(o.tenMin).padStart(6)}  tên cao nhất ${String(o.tenCaoMax).padStart(3)}  bóp ${o.bop}${o.tranNgang ? "  TRÀN NGANG" : ""}`);
      if (RONG_CHUP.includes(w) && (bo === "SALES" || (bo === "PARTNER" && w !== 390))) await chupPng(ngan, resolve(thuMucAnh, `don-hang-${bo}-${w}.png`));
    }
    if (bo === "SALES") {
      // các cảnh phụ: đang tìm, không có kết quả, đang lọc (có hàng chip) — để soát khoảng cách quanh bảng
      for (const w of [390, 1280]) {
        await khung(ngan, w);
        for (const [canh, duoi] of [["tim", "?q=Kh%C3%A1ch"], ["khong-co", "?q=zzzz-khong-co"]]) { await moDon(ngan, duoi); kq.don.push({ bo, rong: w, canh, ...(await ngan.ev(DO_DON)) }); }
        await ngan.ev(`localStorage.setItem("td.locDon.v1", JSON.stringify({ tu: null, den: null, dichVu: [], trangThai: ["confirmed"], nguoiLap: null, nhapKeToan: null, phuTrach: null })); 0`);
        await moDon(ngan); kq.don.push({ bo, rong: w, canh: "dang-loc", ...(await ngan.ev(DO_DON)) });
        await ngan.ev(`localStorage.removeItem("td.locDon.v1"); 0`);
      }
    }
    await ngan.dong();
  }

  // ---- (2) Chính sách điều phối: Quản trị và Toàn quyền, điện thoại 390 và máy tính 1280 (chỉ đọc) ----
  for (const bo of ["ADMIN", "SUPER_ADMIN"]) {
    const ngan = await moNganCua(chrome, bo);
    for (const w of [390, 1280]) {
      await khung(ngan, w); await moCs(ngan);
      const o = { bo, rong: w, ...(await ngan.ev(DO_CS)) };
      await chupPng(ngan, resolve(thuMucAnh, `chinh-sach-${bo}-${w}.png`));
      if (w === 390) {
        if (o.coFormHanMuc) {
          await ngan.ev(`document.querySelector("#hm-the .hm-o-so")?.scrollIntoView({ block: "start" }); 0`); await sleep(400); await chupPng(ngan, resolve(thuMucAnh, `chinh-sach-${bo}-${w}-han-muc.png`));
          // Đứng ở biểu mẫu cài đặt hạn mức (cuộn cuối biểu mẫu vào giữa màn): những nút lưu nào đang nằm trong khung nhìn?
          await ngan.ev(`(document.querySelector("#hm-the .hm-form .dp-cs-actions") ?? document.querySelector("#hm-the .hm-o-so"))?.scrollIntoView({ block: "center" }); 0`); await sleep(400);
          o.taiHanMuc = (await ngan.ev(DO_CS)).nut.filter((n) => n.trongKhung);
        }
        await ngan.ev(`scrollTo(0, document.documentElement.scrollHeight); 0`); await sleep(400); o.cuoiTrang = await ngan.ev(DO_CS); await ngan.ev(`scrollTo(0, 0); 0`); await sleep(300);
      }
      kq.chinhSach.push(o);
      const ke = (n) => `«${n.chu}» ${n.noi}`;
      console.log(`Chính sách ${bo.padEnd(11)} @${String(w).padStart(4)}  nút lưu của biểu mẫu chính sách đang thấy: ${o.nutChinhSach} (${o.nut.filter((n) => n.hien && n.noi !== "the-han-muc").map(ke).join("; ") || "không có"}); của thẻ hạn mức: ${o.coFormHanMuc ? o.nutHanMuc : "không có biểu mẫu"}; thanh tab ${o.thanhTab ? "hiện" : "ẩn"}`);
    }
    await ngan.dong();
  }

  // ---- (3) Bấm lưu thật (chỉ khi có --luu; sau khi đã đo xong mọi thứ) ----
  if (co("--luu")) {
    const VIEC = [
      { bo: "ADMIN", rong: 390, ten: "Quản trị ở 390 lưu hạn chốt", o: "#cs-moc-phut", nutJs: NUT_CHINH_SACH, baoJs: BAO_CHINH_SACH },
      { bo: "ADMIN", rong: 1280, ten: "Quản trị ở 1.280 lưu hạn chốt", o: "#cs-moc-phut", nutJs: NUT_CHINH_SACH, baoJs: BAO_CHINH_SACH },
      { bo: "SUPER_ADMIN", rong: 390, ten: "Toàn quyền ở 390 lưu cài đặt hạn mức", o: "#hm-moi-tuan", nutJs: NUT_HAN_MUC, baoJs: BAO_HAN_MUC },
      { bo: "SUPER_ADMIN", rong: 390, ten: "Toàn quyền ở 390 lưu chính sách bằng thanh đáy", o: "#cs-nghiPhut", nutJs: NUT_CHINH_SACH, baoJs: BAO_CHINH_SACH },
      { bo: "SUPER_ADMIN", rong: 1280, ten: "Toàn quyền ở 1.280 lưu chính sách", o: "#cs-nghiPhut", nutJs: NUT_CHINH_SACH, baoJs: BAO_CHINH_SACH },
    ];
    let ngan = null, boDangMo = null;
    for (const [i, v] of VIEC.entries()) {
      if (boDangMo !== v.bo) { if (ngan) await ngan.dong(); ngan = await moNganCua(chrome, v.bo); boDangMo = v.bo; }
      await khung(ngan, v.rong); await moCs(ngan);
      const r = await luuThu(ngan, { ...v, diDong: v.rong < 641, tepAnh: resolve(thuMucAnh, `da-luu-${i + 1}-${v.bo}-${v.rong}.png`) });
      kq.luu.push({ ...v, nutJs: undefined, baoJs: undefined, ...r });
      console.log(`Bấm lưu — ${v.ten}: ${r.dat ? `ĐƯỢC («${r.lan1.nut.chu}» → «${r.lan1.bao}»; đã lưu trả số cũ; câu báo ${r.thayBao ? "nằm trong khung nhìn, không bị che" : "KHÔNG nằm trọn trong khung nhìn hoặc bị che"})` : r.thu === false ? `KHÔNG THỬ ĐƯỢC (${r.lyDo})` : r.lan1?.coNut === false ? "KHÔNG CÓ NÚT ĐANG NHÌN THẤY" : r.lan1?.bamDuoc === false ? "NÚT BỊ CHE HOẶC BỊ KHOÁ" : `KHÔNG ĐƯỢC (${JSON.stringify(r.lan1)})`}`);
    }
    if (ngan) await ngan.dong();
  }
} finally { await chrome.tat(); }

if (!chamLai) writeFileSync(tepSo, JSON.stringify(kq, null, 1));
console.log(`\nSố đo: ${tepSo}${chamLai ? " (chấm lại, không đo)" : ""}\nẢnh:   ${thuMucAnh}`);

// ---- tự chấm ----
const loi = []; const dat = [];
const xet = (ok, cau) => (ok ? dat : loi).push(cau);
const macDinh = kq.don.filter((d) => d.canh === "mac-dinh");
xet(macDinh.every((d) => d.bop === 0), `Đơn hàng: không đoạn chữ nào bị bóp dọc ở ${macDinh.length} ô (bộ quyền × bề rộng)${macDinh.some((d) => d.bop) ? " — dính: " + macDinh.filter((d) => d.bop).map((d) => `${d.bo}@${d.rong}`).join(", ") : ""}`);
xet(kq.don.every((d) => !d.tranNgang), "Đơn hàng: không ô nào tràn ngang");
xet(macDinh.filter((d) => RONG_PHAI_LA_BANG.includes(d.rong)).every((d) => d.cheDo === "bang" && d.dauHien), "Đơn hàng: ở 1.280 trở lên vẫn là bảng thẳng cột, có hàng tiêu đề cột");
xet(macDinh.filter((d) => RONG_PHAI_LA_THE.includes(d.rong)).every((d) => d.cheDo === "the" && !d.dauHien), "Đơn hàng: ở 1.090 trở xuống (kể cả điện thoại 390) vẫn là thẻ");
xet(macDinh.filter((d) => d.cheDo === "bang").every((d) => d.tenMin >= TEN_TOI_THIEU), `Đơn hàng: đã là bảng thì cột tên khách rộng ít nhất ${TEN_TOI_THIEU} điểm (hẹp nhất đo được: ${Math.min(...macDinh.filter((d) => d.cheDo === "bang").map((d) => d.tenMin))})${macDinh.some((d) => d.cheDo === "bang" && d.tenMin < TEN_TOI_THIEU) ? " — hẹp hơn: " + macDinh.filter((d) => d.cheDo === "bang" && d.tenMin < TEN_TOI_THIEU).map((d) => `${d.bo}@${d.rong}=${d.tenMin}`).join(", ") : ""}`);
const cs = (bo, rong) => kq.chinhSach.find((c) => c.bo === bo && c.rong === rong);
const motNut = (c) => c?.nutChinhSach === 1 && (c.cuoiTrang?.nutChinhSach ?? 1) === 1;
xet(motNut(cs("ADMIN", 390)) && cs("ADMIN", 390).nut.find((n) => n.hien && n.noi !== "the-han-muc")?.bamDuoc === true, `Chính sách điều phối, Quản trị ở 390: biểu mẫu có đúng một nút lưu nhìn thấy, không bị che (thấy ${cs("ADMIN", 390)?.nutChinhSach})`);
xet(motNut(cs("SUPER_ADMIN", 390)), `Chính sách điều phối, Toàn quyền ở 390: biểu mẫu chính sách có đúng một nút lưu, không thành hai (đầu trang ${cs("SUPER_ADMIN", 390)?.nutChinhSach}, cuối trang ${cs("SUPER_ADMIN", 390)?.cuoiTrang?.nutChinhSach})`);
xet(cs("ADMIN", 1280)?.nutChinhSach === 1 && cs("SUPER_ADMIN", 1280)?.nutChinhSach === 1, "Chính sách điều phối ở máy tính 1.280: biểu mẫu chính sách của mỗi vai có đúng một nút lưu");
xet(kq.chinhSach.filter((c) => c.coFormHanMuc).every((c) => c.nutHanMuc === 1), `Thẻ Hạn mức Từ chối (Toàn quyền): biểu mẫu cài đặt có đúng một nút lưu nhìn thấy ở mọi khổ (${kq.chinhSach.filter((c) => c.coFormHanMuc).map((c) => `${c.rong}: ${c.nutHanMuc}`).join(", ")})`);
const tq390 = cs("SUPER_ADMIN", 390);
if (tq390?.taiHanMuc) xet(tq390.taiHanMuc.length === 1 && tq390.taiHanMuc[0].noi === "the-han-muc" && tq390.taiHanMuc[0].bamDuoc, `Toàn quyền ở 390, đứng ở biểu mẫu cài đặt hạn mức: trong khung nhìn chỉ có một nút lưu là «Lưu cài đặt», không bị thanh dính che (đang thấy: ${tq390.taiHanMuc.map((n) => `«${n.chu}» ${n.noi}${n.bamDuoc ? "" : " BỊ CHE"}`).join("; ") || "không nút nào"})`);
xet(kq.chinhSach.every((c) => !c.tranNgang), "Chính sách điều phối: không tràn ngang");
for (const l of kq.luu) {
  xet(l.dat === true, `Bấm lưu thật — ${l.ten}: đổi số, chạm nút đang nhìn thấy, có câu báo đã lưu, rồi lưu trả số cũ ngay trên cùng trang${l.dat ? ` («${l.lan1.bao}»)` : ""}`);
  xet(l.thayBao === true, `Bấm lưu thật — ${l.ten}: sau khi chạm, câu báo nằm trọn trong khung nhìn, không bị thanh dính che`);
}

// ---- so với mốc (chỉ so các ô không đổi chế độ) ----
const tenMoc = lay("--so", null);
if (tenMoc) {
  const moc = JSON.parse(readFileSync(resolve(thuMucSo, `do-hai-loi-${tenMoc}.json`), "utf8"));
  const lech = (a, b, duong, ra2) => {
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") { if (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) > 0.5 : a !== b) ra2.push(`${duong}: ${JSON.stringify(b)} → ${JSON.stringify(a)}`); return; }
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) lech(a[k] ?? null, b[k] ?? null, `${duong}.${k}`, ra2);
  };
  let giu = 0; const doi = []; const khac = [];
  for (const d of kq.don) {
    const m = moc.don.find((x) => x.bo === d.bo && x.rong === d.rong && x.canh === d.canh); if (!m) continue;
    if (m.cheDo !== d.cheDo) { doi.push(`${d.bo}@${d.rong}${d.canh === "mac-dinh" ? "" : "/" + d.canh}: ${m.cheDo} → ${d.cheDo}`); continue; }
    const r = []; lech({ hop: d.hop, caoTrang: d.caoTrang, soThe: d.soThe }, { hop: m.hop, caoTrang: m.caoTrang, soThe: m.soThe }, `${d.bo}@${d.rong}/${d.canh}`, r);
    if (r.length) khac.push(...r.slice(0, 6)); else giu++;
  }
  console.log(`\nSo với mốc «${tenMoc}» — Đơn hàng: ${giu} ô giữ nguyên từng điểm; ${doi.length} ô đổi chế độ: ${doi.join("; ") || "không"}`);
  xet(khac.length === 0, `Đơn hàng: ${giu} ô không đổi chế độ giữ nguyên vị trí và kích thước mọi phần tử đã đo${khac.length ? " — lệch:\n      " + khac.slice(0, 20).join("\n      ") : ""}`);
  xet(doi.every((x) => /bang → the$/.test(x)), `Đơn hàng: ${doi.length} ô đổi chế độ đều là từ bảng sang thẻ`);
  // Chính sách điều phối: máy tính phải y nguyên; điện thoại chỉ được khác đúng chỗ nút lưu trong thẻ hiện ra.
  const soCs = (bo, rong, boQua = []) => { const c = cs(bo, rong), m = moc.chinhSach.find((x) => x.bo === bo && x.rong === rong); const r = []; if (c && m) { const theoCho = (ds) => Object.fromEntries(ds.map((n) => [`${n.noi}«${n.chu}»`, { hien: n.hien, hop: n.hop }])); lech({ hop: c.hop, caoTrang: c.caoTrang, tab: c.thanhTab, nut: theoCho(c.nut) }, { hop: m.hop, caoTrang: m.caoTrang, tab: m.thanhTab, nut: theoCho(m.nut) }, `${bo}@${rong}`, r); } return r.filter((x) => !boQua.some((re) => re.test(x))); };
  const mayTinh = [...soCs("ADMIN", 1280), ...soCs("SUPER_ADMIN", 1280)];
  xet(mayTinh.length === 0, `Chính sách điều phối ở máy tính 1.280 (Quản trị, Toàn quyền): vị trí các thẻ, mọi nút lưu, chiều cao trang giữ nguyên so với mốc${mayTinh.length ? " — lệch:\n      " + mayTinh.slice(0, 12).join("\n      ") : ""}`);
  const lechTq390 = soCs("SUPER_ADMIN", 390, [/\.hop\.hanMuc\.(1|3):/, /\.hop\.formHanMuc\.(1|3):/, /\.caoTrang:/, /\.nut\.the-han-muc«Lưu cài đặt»\./]);
  xet(lechTq390.length === 0, `Chính sách điều phối, Toàn quyền ở 390 (đầu trang): biểu mẫu chính sách và thanh nút đáy giữ nguyên; chỗ khác chỉ ở thẻ Hạn mức phía dưới (dời xuống, có thêm nút «Lưu cài đặt»)${lechTq390.length ? " — lệch ngoài dự kiến:\n      " + lechTq390.slice(0, 12).join("\n      ") : ""}`);
  const qt390 = soCs("ADMIN", 390, [/\.hop\.(khung|the|lichSu)\.3:/, /\.hop\.hanMuc\.1:/, /\.caoTrang:/, /\.nut\.the-chinh-sach«Lưu hạn chốt»\./]);
  xet(qt390.length === 0, `Chính sách điều phối, Quản trị ở 390: chỗ khác duy nhất là nút «Lưu hạn chốt» hiện ra ở cuối thẻ (thẻ cao thêm, phần dưới dời xuống)${qt390.length ? " — lệch ngoài dự kiến:\n      " + qt390.slice(0, 12).join("\n      ") : ""}`);
}
console.log(`\nTự chấm (${nhan}): ${dat.length} đạt, ${loi.length} không đạt`);
for (const c of dat) console.log(`  ✓ ${c}`);
for (const c of loi) console.log(`  ✗ ${c}`);
if (loi.length && nhan !== "truoc") process.exitCode = 1;
