// HÀNH TRÌNH THẬT (đánh giá UX 27/10/2026, mục 6.3 đề bài): mỗi bộ quyền một hành trình từ màn Đăng nhập tới việc chính của vai, trên Chrome headless khổ 390×844
// (mặc định; --kho 1040 cho khổ máy tính). Đếm CHẠM (mỗi lần bấm hay chạm vào một ô = 1; gõ chữ đếm riêng), CUỘN (số màn phải cuộn để thấy phần tử trước khi bấm,
// cộng dồn), ĐOÁN (bước mà nhãn không nói rõ việc — do người viết kịch bản đánh dấu `doan`, cộng mỗi lần máy KHÔNG TÌM THẤY nhãn mong đợi và phải tìm cách khác).
// Bấm bằng toạ độ thật (Input.dispatchTouchEvent ở khổ di động, dispatchMouseEvent ở máy tính) sau khi cuộn tới — phần tử bị phủ thì bấm trượt, đó cũng là phát hiện.
// Mỗi bước một ảnh màn đầu. Hành trình GHI dữ liệu (tạo đơn, tạo tài khoản, xuất bến…) → chỉ chạy trên máy chủ thử, SAU khi các lượt quét đã xong (đăng nhập mới
// đá phiên cũ — luật một máy ADR-0075). Chạy từ GỐC kho:
//   node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/hanh-trinh.mjs --base http://localhost:8795 [--kho 390] [--bo SALES,…]
// Ảnh: ~/tourdao-ux-2026-10-27-v2/anh/hanh-trinh/<kho>/<bo>/<n>-<viec>.jpg; số liệu: so-lieu/hanh-trinh-<kho>.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { moChrome, sleep } from "./cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://localhost:8795");
const KHO = Number(arg("--kho", "390"));
const MOBILE = KHO < 700;
const CHI_BO = arg("--bo") ? arg("--bo").split(",") : null;
const ANH = arg("--anh", join(homedir(), "tourdao-ux-2026-10-27-v2", "anh", "hanh-trinh", String(KHO)));
const tho = JSON.parse(readFileSync(arg("--tk", join(HERE, "tai-khoan.json")), "utf8"));
const dsTk = Array.isArray(tho) ? tho : tho.taiKhoan;
const tkTheoBo = {};
for (const t of dsTk) { const bo = String(t.bo).split("+")[0]; if (!tkTheoBo[bo]) tkTheoBo[bo] = t; }
const ngay = (congNgay) => { const d = new Date(Date.now() + congNgay * 86400000 + 7 * 3600000); return d.toISOString().slice(0, 10); };
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** Tìm phần tử thấy được khớp mô tả: "css:<bộ chọn>" | "re:<regex trên chữ>" | "<chữ đầu>" (startsWith). Ưu tiên phần tử có chữ ngắn nhất (tránh bấm thẻ cha). */
const TIM = (mo, thu) => `(() => {
  const mo = ${JSON.stringify(mo)}, thu = ${thu};
  const thay = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(el); return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0; };
  const chu = (el) => (el.getAttribute("aria-label") || el.innerText || el.value || "").trim().replace(/\\s+/g, " ");
  let ds;
  if (mo.startsWith("css:")) ds = [...document.querySelectorAll(mo.slice(4))].filter(thay);
  else { const rx = mo.startsWith("re:") ? new RegExp(mo.slice(3)) : null; ds = [...document.querySelectorAll("button, a[href], [role=button], [role=tab], [role=link], label, summary, input[type=submit], [tabindex]:not([tabindex='-1']), li, tr, .catalog-pick, .card")].filter(thay).filter((el) => { const t = chu(el); return rx ? rx.test(t) : t.startsWith(mo); }); ds.sort((a, b) => chu(a).length - chu(b).length); }
  const el = ds[thu] ?? null;
  if (!el) return { co: false, soKhop: ds.length };
  const r = el.getBoundingClientRect();
  return { co: true, soKhop: ds.length, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width), chu: chu(el).slice(0, 50), the: el.tagName, lop: String(el.className || "").slice(0, 60) };
})()`;
const DANG_TAI = `(() => { const t = document.body ? document.body.innerText : ""; const sk = [...document.querySelectorAll("[class*=skeleton], [aria-busy=true]")].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden"; }); return sk || /Đang tải|Đang mở/.test(t); })()`;

async function chayHanhTrinh(chrome, bo, dinhNghia) {
  const tk = tkTheoBo[bo];
  const HT = { bo, ten: dinhNghia.ten, kho: KHO, taiKhoan: tk?.ten, cham: 0, go: 0, cuon: 0, doan: 0, khongThay: 0, buoc: [], loiConsole: [] };
  if (!tk) { HT.loi = "thiếu tài khoản"; return HT; }
  const dir = join(ANH, bo); mkdirSync(dir, { recursive: true });
  const ngan = await chrome.moNgan();
  await ngan.khung(KHO, MOBILE ? 844 : 800, MOBILE);
  let n = 0;
  const buoc = (viec, them = {}) => { const b = { n: ++n, viec, cham: 0, cuon: 0, doan: false, ...them }; HT.buoc.push(b); return b; };
  const anhBuoc = async (b) => { const p = join(dir, `${String(b.n).padStart(2, "0")}-${slug(b.viec)}.jpg`); await ngan.ev("0").catch(() => {}); await ngan.chup(p, false).catch(() => {}); b.anh = p.replace(homedir(), "~"); b.url = await ngan.ev("location.pathname + location.search").then((u) => u.replace(/id=[^&]+/, "id=…")).catch(() => "?"); if (ngan.loi.length) { b.loiConsole = ngan.loi.slice(0, 2); HT.loiConsole.push(...ngan.loi.splice(0)); } };
  const lang = async (max = 9000) => { const het = Date.now() + max; let ok = 0; for (;;) { await sleep(250); const r = await ngan.ev("document.readyState").catch(() => ""); const dt = r === "complete" ? await ngan.ev(DANG_TAI).catch(() => true) : true; ok = !dt ? ok + 250 : 0; if (ok >= 600 || Date.now() > het) break; } await sleep(250); };
  const vh = MOBILE ? 844 : 800;
  const H = {
    async di(duong, ghi) { const b = buoc(`mở ${duong}`, { ghi }); await ngan.di(BASE + duong); await lang(); await anhBuoc(b); },
    async anh(viec) { const b = buoc(`nhìn: ${viec}`); await anhBuoc(b); },
    async co(mo) { const t = await ngan.ev(TIM(mo, 0)).catch(() => ({ co: false })); return t.co; },
    async thay(chu) { return ngan.ev(`(document.body.innerText || "").includes(${JSON.stringify(chu)})`).catch(() => false); },
    /** Cuộn tới phần tử / chữ, chỉ để nhìn (đếm cuộn, không đếm chạm). */
    async cuonToi(mo, ghi) { const b = buoc(`cuộn tới «${mo}»`, { ghi }); const t = await ngan.ev(TIM(mo, 0)); if (!t.co) { const y = await ngan.ev(`(() => { const r = document.createRange(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let nd; while ((nd = w.nextNode())) if (nd.textContent.includes(${JSON.stringify(mo.replace(/^re:/, ""))})) { r.selectNode(nd); const bb = r.getBoundingClientRect(); return bb.top + scrollY; } return null; })()`).catch(() => null); if (y == null) { b.ketQua = "KHÔNG THẤY"; HT.khongThay++; HT.doan++; b.doan = true; await anhBuoc(b); return false; } const sy = await ngan.ev("scrollY"); await ngan.ev(`scrollTo(0, ${Math.max(0, y - vh / 3)})`); await sleep(300); b.cuon = +(Math.abs(Math.max(0, y - vh / 3) - sy) / vh).toFixed(1); HT.cuon += b.cuon; await anhBuoc(b); return true; } const sy = await ngan.ev("scrollY"); const dich = Math.max(0, t.top - vh / 3); if (Math.abs(dich - sy) > 8) { await ngan.ev(`scrollTo(0, ${dich})`); await sleep(300); b.cuon = +(Math.abs(dich - sy) / vh).toFixed(1); HT.cuon += b.cuon; } await anhBuoc(b); return true; },
    /** Bấm phần tử khớp mô tả (thứ `thu`, từ 0). Trả false nếu không thấy (đếm đoán). */
    async bam(mo, { thu = 0, doan = false, ghi = "", viec } = {}) {
      const b = buoc(viec ?? `bấm «${mo.replace(/^(css|re):/, "")}»`, { ghi, doan });
      let t = await ngan.ev(TIM(mo, thu)).catch(() => ({ co: false }));
      if (!t.co) { b.ketQua = `KHÔNG TÌM THẤY (khớp ${t.soKhop ?? 0})`; b.doan = true; HT.doan++; HT.khongThay++; await anhBuoc(b); return false; }
      if (doan) HT.doan++;
      // Cuộn cho phần tử vào giữa màn nếu đang ngoài màn.
      if (t.y < 0 || t.y > vh - 4) { const sy = await ngan.ev("scrollY"); const dich = Math.max(0, t.top - vh / 2); await ngan.ev(`scrollTo(0, ${dich})`); await sleep(300); b.cuon = +(Math.abs(dich - sy) / vh).toFixed(1); HT.cuon += b.cuon; t = await ngan.ev(TIM(mo, thu)); }
      b.phanTu = `${t.the.toLowerCase()}.${t.lop.split(" ")[0]} «${t.chu}» ${t.w}×${t.h}`;
      const phu = await ngan.ev(`(() => { const e = document.elementFromPoint(${t.x}, ${t.y}); if (!e) return null; const c = String(e.className || e.tagName).slice(0, 50); return c; })()`).catch(() => null);
      const khop = await ngan.ev(`(() => { const e = document.elementFromPoint(${t.x}, ${t.y}); const ds = [...document.querySelectorAll("*")]; const m = ${JSON.stringify(mo)}; return !!e; })()`).catch(() => false);
      b.hitTest = phu;
      if (MOBILE) { await ngan.s("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: t.x, y: t.y }] }); await ngan.s("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
      else { await ngan.s("Input.dispatchMouseEvent", { type: "mouseMoved", x: t.x, y: t.y }); await ngan.s("Input.dispatchMouseEvent", { type: "mousePressed", x: t.x, y: t.y, button: "left", clickCount: 1 }); await ngan.s("Input.dispatchMouseEvent", { type: "mouseReleased", x: t.x, y: t.y, button: "left", clickCount: 1 }); }
      b.cham = 1; HT.cham++;
      await lang(); await anhBuoc(b); void khop;
      return true;
    },
    /** Chạm vào ô rồi gõ chữ (1 chạm + số ký tự). */
    async go(sel, chu, nhan) {
      const b = buoc(`gõ «${chu}» vào ${nhan ?? sel}`);
      const t = await ngan.ev(TIM(`css:${sel}`, 0)).catch(() => ({ co: false }));
      if (!t.co) { b.ketQua = "KHÔNG CÓ Ô"; b.doan = true; HT.doan++; HT.khongThay++; await anhBuoc(b); return false; }
      if (t.y < 0 || t.y > vh - 4) { const sy = await ngan.ev("scrollY"); const dich = Math.max(0, t.top - vh / 2); await ngan.ev(`scrollTo(0, ${dich})`); await sleep(250); b.cuon = +(Math.abs(dich - sy) / vh).toFixed(1); HT.cuon += b.cuon; }
      await ngan.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.focus(); e.select && e.select(); return 1; })()`);
      await ngan.s("Input.insertText", { text: chu });
      await ngan.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.dispatchEvent(new Event("input", { bubbles: true })); return 1; })()`).catch(() => {});
      b.cham = 1; HT.cham++; b.go = chu.length; HT.go += chu.length;
      await sleep(350); await anhBuoc(b);
      return true;
    },
    /** Đặt giá trị cho ô ngày / giờ / chọn (iPhone mở bánh xe: tính 1 chạm + 1 đoán nếu `doan`). */
    async dat(sel, gia, nhan, { doan = false } = {}) {
      const b = buoc(`chọn «${gia}» ở ${nhan ?? sel}`, { doan });
      const ok = await ngan.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.scrollIntoView({ block: "center" }); e.focus(); e.value = ${JSON.stringify(gia)}; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); return e.value === ${JSON.stringify(gia)} ? true : "giá trị không nhận: " + e.type; })()`).catch((e) => String(e));
      if (ok !== true) { b.ketQua = ok === false ? "KHÔNG CÓ Ô" : String(ok); if (ok === false) { HT.khongThay++; HT.doan++; b.doan = true; } }
      if (doan) HT.doan++;
      b.cham = 1; HT.cham++; await sleep(350); await anhBuoc(b);
      return ok === true;
    },
    async choDuong(duong, max = 8000) { const het = Date.now() + max; for (;;) { const d = await ngan.ev("location.pathname").catch(() => null); if (d === duong || Date.now() > het) { const b = buoc(`tới ${duong}`); b.ketQua = d === duong ? "đúng" : `KHÔNG, đang ở ${d}`; if (d !== duong) { HT.doan++; b.doan = true; } await lang(); await anhBuoc(b); return d === duong; } await sleep(200); } },
    ghi(chu) { const b = HT.buoc.at(-1); if (b) b.ghi = (b.ghi ? b.ghi + "; " : "") + chu; },
    /** Đăng nhập bằng màn hình thật: SĐT, PIN, nút. */
    async dangNhap() {
      await H.di("/login"); await H.go("#phone", tk.sdt, "Số điện thoại"); await H.go("#pin", tk.pin, "Mã PIN"); await H.bam("css:#submit", { viec: "bấm «Đăng nhập»" }); await sleep(600); await lang();
      const b = buoc("sau đăng nhập"); await anhBuoc(b);
      // Ghi các mục điều hướng đang thấy (bù cho cột nav của do-trong-trang.js dùng bộ chọn .tabbar/.topbar không có thật): thanh tab (390) hoặc thanh bên (1040), mục nào sáng.
      HT.dieuHuong = await ngan.ev(`(() => { const thay = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; const muc = (sel) => [...document.querySelectorAll(sel)].filter(thay).map((el) => ({ ten: (el.getAttribute("aria-label") || el.innerText || "").trim().replace(/\\s+/g, " ").slice(0, 30), sang: el.getAttribute("aria-current") === "page" || el.classList.contains("active") || el.classList.contains("is-active") })); return { tab: muc("#tabbar a, #tabbar button"), ben: muc("#sidebar .sidebar-item, #sidebar a"), tren: muc("#topbar a, #topbar button") }; })()`).catch(() => null);
      b.ghi = HT.dieuHuong ? `thanh tab: ${HT.dieuHuong.tab.map((m) => (m.sang ? "*" : "") + m.ten).join(" · ") || "(không)"}; thanh bên: ${HT.dieuHuong.ben.length} mục` : "không đọc được điều hướng";
    },
    ngay, tk,
  };
  try { await dinhNghia.buoc(H); } catch (e) { HT.loi = String(e).slice(0, 300); const b = buoc("LỖI KỊCH BẢN"); b.ketQua = HT.loi; await anhBuoc(b); }
  await ngan.dong().catch(() => {});
  return HT;
}

/** Điền biểu mẫu Tạo đơn (dùng chung cho Bán hàng / Thực tập / Đối tác). */
async function dienDon(H, { soDichVu = 3, ten = "Khách Thử Hành Trình", sdt = "0911222333" } = {}) {
  await H.dat("#orderDate", H.ngay(2), "Ngày khởi hành", { doan: false });
  await H.go("#customerName", ten, "Tên khách");
  await H.go("#customerPhone", sdt, "SĐT khách");
  for (let i = 0; i < soDichVu; i++) {
    if (!(await H.co("css:.catalog-pick"))) { if (await H.co("css:.catalog-nut-nhom")) await H.bam("css:.catalog-nut-nhom", { thu: 0, viec: "bấm nhóm dịch vụ đầu tiên", doan: true }); else if (await H.co("css:#catalog-q")) await H.go("#catalog-q", "a", "ô tìm dịch vụ"); }
    const ok = await H.bam("css:.catalog-pick", { thu: i, viec: `chọn dịch vụ thứ ${i + 1} trong danh mục` });
    if (!ok) break;
    if (await H.co("css:.sheet-root, [role=dialog]")) { if (!(await H.bam("re:^(Thêm|Xong|Áp dụng|Chọn|Lưu)$", { viec: "xác nhận trong bảng trượt dịch vụ" }))) await H.bam("re:^(Đóng|Huỷ)$", { viec: "đóng bảng trượt" }); }
  }
  await H.cuonToi("re:Thanh toán|Tóm tắt", "xem phần tiền trước khi lưu");
  if (await H.co("css:#sum-mo")) await H.bam("css:#sum-mo", { viec: "mở chi tiết tiền ở chân màn", doan: true });
  const luu = await H.bam("re:^(Lưu, chờ xác nhận|Lưu|Gửi)", { viec: "bấm nút lưu ở chân biểu mẫu" });
  if (luu) await H.choDuong("/order");
}

const HANH_TRINH = {
  SALES: { ten: "Bán hàng: đăng nhập → Trang chủ → Tạo đơn ba dịch vụ cho khách mới → lưu chờ xác nhận → xem lại ở Đơn hàng và Trang chủ", async buoc(H) {
    await H.dangNhap();
    const co = await H.bam("Tạo đơn", { viec: "bấm «Tạo đơn» ở Trang chủ" }); if (!co) await H.di("/order-form", "không thấy lối «Tạo đơn», gõ địa chỉ");
    await H.choDuong("/order-form");
    await dienDon(H, { soDichVu: 3 });
    await H.di("/orders", "xem lại đơn ở danh sách"); await H.di("/", "hôm sau mở Trang chủ: đơn có hiện không?");
  } },
  INTERN: { ten: "Thực tập: đăng nhập → Đơn hàng → Tạo đơn một dịch vụ (không được chọn người phụ trách) → lưu", async buoc(H) {
    await H.dangNhap();
    const co = await H.bam("re:^\\+? ?Tạo đơn", { viec: "bấm «+ Tạo đơn» ở Đơn hàng" }); if (!co) await H.di("/order-form");
    await H.choDuong("/order-form");
    H.ghi((await H.thay("Người phụ trách")) ? "có khối Người phụ trách" : "KHÔNG có khối Người phụ trách (đúng luật Thực tập)");
    await dienDon(H, { soDichVu: 1, ten: "Khách Thực Tập Thử", sdt: "0911222334" });
  } },
  ACCOUNTING: { ten: "Kế toán: đăng nhập → Đơn chờ xác nhận → kiểm vé một đơn → Còn vé → Sổ công nợ → mở một bên để đối chiếu", async buoc(H) {
    await H.dangNhap();
    await H.di("/cho-xac-nhan", "danh sách chờ kiểm vé");
    const ok = await H.bam("Kiểm vé", { viec: "bấm «Kiểm vé» đơn đầu tiên" });
    if (ok) { await H.choDuong("/order"); const xn = await H.bam("re:^Xác nhận( đơn)?$", { viec: "bấm «Xác nhận đơn»" }); if (xn) await H.bam("re:^Còn vé", { viec: "chọn «Còn vé»" }); }
    await H.di("/so-cong-no", "sổ công nợ");
    await H.bam("css:#scn-ds a, #scn-ds button, #scn-ds li, #scn-ds [role=button]", { thu: 0, viec: "mở bên đầu tiên trong danh sách", doan: true });
  } },
  ADMIN: { ten: "Quản trị: đăng nhập → Điều phối xe → chọn một lượt đưa đón → xếp vào chuyến / tạo chuyến → quay về Đơn hàng → mở đơn → Sửa thông tin chuyến", async buoc(H) {
    await H.dangNhap();
    await H.di("/dieu-phoi", "bảng điều phối");
    await H.bam("css:#dp-ds input[type=checkbox], .dp-chon input[type=checkbox], main input[type=checkbox]", { thu: 0, viec: "đánh dấu một lượt đưa đón", doan: true });
    const x = await H.bam("re:^(Xếp vào chuyến|Tạo chuyến)", { viec: "bấm «Xếp vào chuyến» / «Tạo chuyến»" });
    if (x) { await H.anh("hộp / bảng sau khi bấm"); await H.bam("re:^(Đóng|Huỷ|Thôi|Quay lại|Bỏ chọn)$", { viec: "đóng hộp" }); }
    await H.di("/orders", "danh sách đơn");
    await H.bam("css:#list a[href^='/order'], #list .card, #list article, #list li", { thu: 0, viec: "mở đơn đầu tiên", doan: true });
    await H.choDuong("/order");
    const s = await H.bam("Sửa thông tin chuyến", { viec: "bấm «Sửa thông tin chuyến»" });
    if (s) await H.bam("re:^(Đóng|Huỷ|Thôi|Quay lại)$", { viec: "đóng bảng trượt" });
  } },
  FIELD: { ten: "Hướng dẫn viên: đăng nhập → Đơn hàng (trang đầu) → Tôi → khối «Việc của tôi» → mở đơn được giao → Xác nhận đã nhận", async buoc(H) {
    await H.dangNhap();
    await H.di("/account", "trang Tôi");
    await H.cuonToi("Việc của tôi", "tìm khối Việc của tôi");
    const ok = await H.bam("css:a[href^='/order?id=']", { thu: 0, viec: "mở đơn đầu tiên trong Việc của tôi", doan: true });
    if (ok) { await H.choDuong("/order"); if (await H.co("Xác nhận đã nhận")) await H.bam("Xác nhận đã nhận"); else H.ghi("không có nút «Xác nhận đã nhận» ở đơn này"); }
  } },
  PARTNER: { ten: "Đối tác: đăng nhập → Đơn hàng → Tạo đơn cho khách của mình (một dịch vụ) → gửi → xem trạng thái ở Đơn hàng → Tôi (hoa hồng?)", async buoc(H) {
    await H.dangNhap();
    const co = await H.bam("re:^\\+? ?Tạo đơn", { viec: "bấm «+ Tạo đơn»" }); if (!co) await H.di("/order-form");
    await H.choDuong("/order-form");
    await dienDon(H, { soDichVu: 1, ten: "Khách Của Đối Tác Thử", sdt: "0911222335" });
    await H.di("/orders", "xem trạng thái đơn vừa gửi");
    await H.di("/account", "trang Tôi: có thấy hoa hồng / chính sách bán không?");
    await H.cuonToi("re:[Hh]oa hồng", "tìm chữ hoa hồng");
  } },
  SUPER_ADMIN: { ten: "Toàn quyền: đăng nhập → Quản lý tài khoản → Thêm tài khoản qua màn hình (tên, SĐT, một quyền) → nhận PIN → Hỗ trợ → nhận một vé", async buoc(H) {
    await H.dangNhap();
    await H.di("/staff", "quản lý tài khoản");
    await H.cuonToi("Thêm tài khoản", "tìm khung Thêm tài khoản");
    await H.go("#add-name", "Tài Khoản Thử Màn Hình", "Họ tên");
    await H.go("#add-phone", "0900000912", "Số điện thoại");
    await H.bam("css:#add-perms label.check", { thu: 0, viec: "đánh dấu quyền đầu tiên" });
    await H.bam("Tạo tài khoản", { viec: "bấm «Tạo tài khoản»" });
    H.ghi((await H.thay("PIN")) ? "thấy PIN sau khi tạo" : "KHÔNG thấy PIN");
    await H.bam("re:^(Đóng|Đã ghi lại)", { viec: "đóng khung PIN" });
    await H.di("/feedback", "Hỗ trợ");
    const v = await H.bam("css:a[href*='/feedback?id='], .ht-ds a, .ht-ds li, main li a", { thu: 0, viec: "mở vé đầu tiên", doan: true });
    if (v) await H.bam("re:^Nhận việc", { viec: "bấm «Nhận việc»" });
  } },
  DRIVER: { ten: "Tài xế công ty: đăng nhập → Cuốc của tôi → mở chuyến → Xuất bến → Đã đón → Đã trả → Kết thúc chuyến", async buoc(H) {
    await H.dangNhap();
    const ok = await H.bam("css:a[href^='/cuoc-chuyen']", { thu: 0, viec: "mở chuyến đầu tiên trong Cuốc của tôi" });
    if (!ok) return;
    await H.choDuong("/cuoc-chuyen");
    if (await H.bam("re:^Xuất bến", { viec: "bấm «Xuất bến»" })) { if (await H.co("re:^(Xuất bến|Xác nhận|Đồng ý)")) await H.bam("re:^(Xuất bến|Xác nhận|Đồng ý)", { viec: "xác nhận xuất bến" }); }
    if (await H.co("re:^Đã đón")) await H.bam("re:^Đã đón", { viec: "bấm «Đã đón»" });
    if (await H.co("re:^Đã trả")) await H.bam("re:^Đã trả", { viec: "bấm «Đã trả»" });
    if (await H.co("re:^Kết thúc chuyến")) { await H.bam("re:^Kết thúc chuyến"); if (await H.co("re:^(Kết thúc|Xác nhận|Đồng ý)$")) await H.bam("re:^(Kết thúc|Xác nhận|Đồng ý)$", { viec: "xác nhận kết thúc" }); }
  } },
  DRIVER_PARTNER: { ten: "Tài xế đối tác: đăng nhập → Trang đầu tài xế → Xem cuốc → mở chuyến → Báo bận của tôi → ghi một khung bận", async buoc(H) {
    await H.dangNhap();
    await H.di("/tai-xe", "trang đầu tài xế");
    await H.bam("re:Xem cuốc|Cuốc của tôi", { viec: "bấm «Xem cuốc của tôi»" });
    await H.bam("css:a[href^='/cuoc-chuyen']", { thu: 0, viec: "mở chuyến đầu tiên" });
    await H.di("/ban", "Báo bận của tôi");
    await H.dat("#bb-tu", `${H.ngay(3)}T08:00`, "Từ", { doan: true });
    await H.dat("#bb-den", `${H.ngay(3)}T12:00`, "Đến", { doan: true });
    if (await H.co("css:#bb-ly-do, [name=lyDo], #bb-form textarea, #bb-form input[type=text]")) await H.go("#bb-ly-do, [name=lyDo], #bb-form textarea, #bb-form input[type=text]", "Bận việc riêng (thử)", "Lý do");
    await H.bam("re:^(Lưu khung bận|Ghi khung bận|Lưu)", { viec: "bấm «Lưu khung bận»" });
  } },
  HR: { ten: "Nhân sự: đăng nhập → Quản lý tài khoản → Thêm tài khoản (tên, SĐT, một quyền) → nhận PIN → đóng", async buoc(H) {
    await H.dangNhap();
    await H.cuonToi("Thêm tài khoản", "tìm khung Thêm tài khoản");
    await H.go("#add-name", "Nhân Viên Mới Thử", "Họ tên");
    await H.go("#add-phone", "0900000913", "Số điện thoại");
    await H.bam("css:#add-perms label.check", { thu: 0, viec: "đánh dấu quyền đầu tiên" });
    await H.bam("Tạo tài khoản", { viec: "bấm «Tạo tài khoản»" });
    H.ghi((await H.thay("PIN")) ? "thấy PIN sau khi tạo" : "KHÔNG thấy PIN");
    await H.bam("re:^(Đóng|Đã ghi lại)", { viec: "đóng khung PIN" });
  } },
};

const chrome = await moChrome();
const ketQua = [];
try {
  for (const [bo, dn] of Object.entries(HANH_TRINH)) {
    if (CHI_BO && !CHI_BO.includes(bo)) continue;
    const ht = await chayHanhTrinh(chrome, bo, dn);
    ketQua.push(ht);
    console.log(`${bo.padEnd(14)} chạm ${String(ht.cham).padStart(2)}  gõ ${String(ht.go).padStart(3)} ký tự  cuộn ${ht.cuon.toFixed(1)} màn  đoán ${ht.doan}  không thấy ${ht.khongThay}  bước ${ht.buoc.length}${ht.loi ? "  LỖI: " + ht.loi : ""}`);
    for (const b of ht.buoc) if (b.ketQua || b.doan || b.ghi) console.log(`   ${String(b.n).padStart(2)}. ${b.viec} → ${b.ketQua ?? ""}${b.doan ? " [đoán]" : ""}${b.ghi ? " — " + b.ghi : ""}`);
  }
} finally {
  await chrome.tat();
  mkdirSync(join(EVID, "so-lieu"), { recursive: true });
  const ra = join(EVID, "so-lieu", `hanh-trinh-${KHO}${CHI_BO ? "-" + CHI_BO.join("_") : ""}.json`);
  writeFileSync(ra, JSON.stringify({ luc: new Date().toISOString(), base: BASE, kho: KHO, ketQua }, null, 1));
  console.log(`Ghi ${ra}`);
}
