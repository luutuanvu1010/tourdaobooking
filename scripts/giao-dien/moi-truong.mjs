// Dựng MÔI TRƯỜNG THỬ TẠM cho lệnh đo giao diện (do-man.mjs): D1 tạm + `wrangler dev` (startEnv của a2-cdp.mjs) + Chrome ẩn riêng có ngăn cookie cho từng bộ quyền,
// tài khoản thử theo bộ quyền, và vài đơn gieo qua API thật. Không chạm bản chạy thật: mọi thứ ở 127.0.0.1 và thư mục tạm.
// Mục tiêu dọn dẹp: KHÔNG BAO GIỜ để lại `wrangler dev` hay Chrome mồ côi — dung() idempotent, có SIGINT/SIGTERM, đồng hồ tự dừng, và cuối cùng giết mọi tiến trình con cháu còn sót.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOC_KHO = resolve(HERE, "..", "..");
const A2 = join(GOC_KHO, "docs", "evidence", "2026-09-20-a2", "kich-ban", "a2-cdp.mjs");

// Chép từ docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/ma-tran-quyen.mjs (BO_QUYEN) — không import trực tiếp vì tệp đó in ra màn hình khi nạp.
export const BO_QUYEN = {
  SALES: ["SALES"], INTERN: ["INTERN"], ACCOUNTING: ["ACCOUNTING"], ADMIN: ["ADMIN"], FIELD: ["FIELD"], PARTNER: ["PARTNER"],
  SUPER_ADMIN: ["ADMIN", "SUPER_ADMIN"], DRIVER: ["DRIVER"], DRIVER_PARTNER: ["DRIVER_PARTNER"], HR: ["HR"], SALES_MANAGER: ["SALES", "SALES_MANAGER"],
};
// Vai hồ sơ cho hai bộ quyền bên ngoài (ADR-0185): Đối tác phải có vai đối tác; Tài xế đối tác thử kèm vai DRIVER_EXTERNAL.
const VAI_BO = { PARTNER: "TRAVEL_AGENCY", DRIVER_PARTNER: "DRIVER_EXTERNAL" };
const SDT_BO = { SALES: "0900000301", INTERN: "0900000302", ACCOUNTING: "0900000303", ADMIN: "0900000304", FIELD: "0900000305", PARTNER: "0900000306", SUPER_ADMIN: "0900000307", DRIVER: "0900000308", DRIVER_PARTNER: "0900000309", HR: "0900000310", SALES_MANAGER: "0900000311" };
const PIN_THU = "531642"; // chỉ có nghĩa trên D1 tạm của lần chạy này
const TEN_BO = { SALES: "Bán Hàng", INTERN: "Thực Tập", ACCOUNTING: "Kế Toán", ADMIN: "Quản Trị", FIELD: "Hiện Trường", PARTNER: "Đối Tác", SUPER_ADMIN: "Toàn Quyền", DRIVER: "Tài Xế Công Ty", DRIVER_PARTNER: "Tài Xế Đối Tác", HR: "Nhân Sự", SALES_MANAGER: "Quản Lý Bán Hàng" };

const nghi = (ms) => new Promise((r) => setTimeout(r, ms));

/** Mọi tiến trình con cháu của tiến trình này (theo cây ppid) — dùng làm lưới cuối để không để mồ côi. */
function conChau() {
  let ds;
  try { ds = execFileSync("ps", ["-axo", "pid=,ppid="], { encoding: "utf8" }); } catch { return []; }
  const cha = new Map();
  for (const dong of ds.split("\n")) { const [p, pp] = dong.trim().split(/\s+/).map(Number); if (p) cha.set(p, pp); }
  const ra = new Set([process.pid]);
  for (let doi = true; doi;) { doi = false; for (const [p, pp] of cha) if (!ra.has(p) && ra.has(pp)) { ra.add(p); doi = true; } }
  ra.delete(process.pid);
  return [...ra];
}
async function gietConChau() {
  for (const sig of ["SIGTERM", "SIGKILL"]) {
    const ds = conChau();
    if (!ds.length) return;
    for (const p of ds) { try { process.kill(p, sig); } catch { /* đã thoát */ } }
    if (sig === "SIGTERM") await nghi(1500);
  }
}

const TIEN_TO_TAM = ["tourdao-a2-", "ux-chrome-"];
const lietKeTam = () => { try { return new Set(readdirSync(tmpdir()).filter((t) => TIEN_TO_TAM.some((p) => t.startsWith(p)))); } catch { return new Set(); } };
/** Xoá thư mục tạm MỚI sinh ra từ lúc `truoc` mà không còn tiến trình nào nhắc tới (an toàn khi có phiên khác chạy song song). */
function donThuMucTam(truoc) {
  let lenh = "";
  try { lenh = execFileSync("ps", ["-axo", "command="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); } catch { return; }
  for (const t of lietKeTam()) {
    if (truoc.has(t) || lenh.includes(t)) continue;
    try { rmSync(join(tmpdir(), t), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* bỏ */ }
  }
}

/**
 * `bo`: danh sách bộ quyền cần tài khoản (KHACH không cần). Chạy từ GỐC kho (startEnv của a2-cdp dùng process.cwd()).
 * Trả { base, persist, taiKhoan: { [bo]: { phone, pin } }, id: { order, orderTheoBo, donDaXacNhan, donNhap }, loiGieo, boChayDuoc, chrome, dung }.
 */
export async function dungMoiTruong({ bo, hanPhut = 20 }) {
  let goc, cwd;
  try { goc = realpathSync(GOC_KHO); cwd = realpathSync(process.cwd()); } catch { goc = GOC_KHO; cwd = process.cwd(); }
  if (goc !== cwd) throw new Error(`Phải chạy từ GỐC kho (${goc}), đang ở ${cwd}: startEnv dùng thư mục chạy làm gốc kho.`);
  if (!existsSync(A2)) throw new Error(`Thiếu thư viện dựng bản thử: ${A2}`);
  const cacBo = [...new Set(bo)].filter((b) => b !== "KHACH");
  for (const b of cacBo) if (!BO_QUYEN[b]) throw new Error(`chưa hỗ trợ bộ quyền ${b}: không có trong BO_QUYEN`);

  const tamTruoc = lietKeTam();
  let env = null, chrome = null, dangDung = null, dongHo = null;
  // Gọi nhiều lần (tín hiệu bắt, đồng hồ, finally) đều chờ CÙNG một lần dọn: tín hiệu tới giữa lúc đang dọn không được thoát sớm bỏ lại wrangler dev.
  const dung = () => (dangDung ??= dungThat());
  const dungThat = async () => {
    clearTimeout(dongHo);
    try { await chrome?.tat(); } catch { /* bỏ */ }
    try { await env?.stop(); } catch { /* bỏ */ }
    await gietConChau(); // lưới cuối: wrangler dev / workerd / Chrome còn sót (cả khi startEnv hỏng giữa chừng)
    donThuMucTam(tamTruoc); // D1 tạm và hồ sơ Chrome mà startEnv/moChrome chưa kịp xoá
  };
  const khiBiGiet = (sig) => { console.error(`Nhận ${sig}: dọn môi trường thử rồi thoát.`); dung().finally(() => process.exit(sig === "SIGINT" ? 130 : 143)); };
  process.on("SIGINT", khiBiGiet); process.on("SIGTERM", khiBiGiet);
  dongHo = setTimeout(() => { console.error(`Quá ${hanPhut} phút: tự dừng và dọn môi trường thử.`); dung().finally(() => process.exit(2)); }, hanPhut * 60_000);
  dongHo.unref?.();

  try {
    // Chrome do startEnv bật cũng đi qua bộ bọc tự đóng khi tiến trình cha chết (a2-cdp đọc CHROME_BIN lúc nạp).
    process.env.CHROME_BIN ??= join(GOC_KHO, "scripts", "chrome-tu-dong-dong.sh");
    const a2 = await import(pathToFileURL(A2).href);
    env = await a2.startEnv();

    // ---- tài khoản thử cho từng bộ quyền
    const taiKhoan = {}, boChayDuoc = [];
    for (const b of cacBo) {
      const tk = { name: `${TEN_BO[b]} Thử`, phone: SDT_BO[b], pin: PIN_THU, permissions: BO_QUYEN[b], ...(VAI_BO[b] ? { vai: VAI_BO[b] } : {}) };
      try {
        const sqlTao = await a2.insertStaffSqlThu(tk);
        let loi = null;
        for (let lan = 0; lan < 4; lan++) { try { env.sql(sqlTao); loi = null; break; } catch (e) { loi = e; if (!/SQLITE_BUSY|database is locked/i.test(String(e?.stderr ?? e?.message ?? e))) break; await nghi(800); } }
        if (loi) throw loi;
        // đăng nhập thử một lần để biết tài khoản dùng được thật
        await env.login(tk);
      } catch (e) {
        throw new Error(`chưa hỗ trợ bộ quyền ${b}: ${String(e?.stderr ?? e?.message ?? e).trim().slice(0, 600)}`);
      }
      taiKhoan[b] = { phone: tk.phone, pin: tk.pin };
      boChayDuoc.push(b);
    }

    // ---- gieo đơn qua API thật (họ màn Lập đơn – Đơn hàng – Chi tiết đơn)
    const loiGieo = [];
    const id = { order: null, orderTheoBo: {}, donDaXacNhan: [], donNhap: [] };
    process.env.E2E_BASE_URL = env.base;
    process.env.E2E_PERSIST_TO = env.persist;
    const L = await import(pathToFileURL(join(GOC_KHO, "tests", "e2e", "lib.mjs")).href);
    const thu = async (viec, f) => { try { return await f(); } catch (e) { loiGieo.push({ viec, loi: String(e?.message ?? e).slice(0, 400) }); return null; } };
    const lap = (cookie, viec, input) => thu(viec, async () => {
      const r = await L.call(cookie, "POST", "/api/orders", input);
      if (r.status !== 201) { loiGieo.push({ viec, status: r.status, loi: JSON.stringify(r.body?.error ?? r.body).slice(0, 300) }); return null; }
      return r.body.order;
    });
    const xacNhan = (cookie, viec, o) => o && thu(viec, async () => {
      const r = await L.call(cookie, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
      if (r.status !== 200) { loiGieo.push({ viec, status: r.status, loi: JSON.stringify(r.body?.error ?? r.body).slice(0, 300) }); return false; }
      return true;
    });
    await thu("danh mục giả", () => L.ensureFakeCatalog());
    if (taiKhoan.SALES) {
      const ck = await thu("đăng nhập Bán hàng", () => L.session(taiKhoan.SALES));
      if (ck) {
        const nhap = await lap(ck, "đơn nháp", L.orderInput({ customerName: "Khách Thử Một", customerPhone: "0901 234 567" }));
        if (nhap) id.donNhap.push(nhap.id);
        const hai = await lap(ck, "đơn hai (sẽ xác nhận)", L.orderInput({ customerName: "Khách Thử Hai", customerPhone: "0902 345 678", services: [L.catalogService({ pax: { adult: 2, child: 1 } })] }));
        if (hai && (await xacNhan(ck, "xác nhận đơn hai", hai))) id.donDaXacNhan.push(hai.id);
        const ba = await lap(ck, "đơn ba (sẽ xác nhận)", L.orderInput({ customerName: "Khách Thử Ba", customerPhone: "0903 456 789", services: [L.catalogService({ pax: { adult: 3 } }), L.catalogService({ catalogCode: "ZE2", catalogPriceSeen: { adult: 50000 }, pax: { adult: 3 } })] }));
        if (ba && (await xacNhan(ck, "xác nhận đơn ba", ba))) id.donDaXacNhan.push(ba.id);
        id.orderTheoBo.SALES = id.donDaXacNhan[0] ?? id.donNhap[0] ?? null;
        id.order = id.orderTheoBo.SALES;
      }
    }
    if (taiKhoan.PARTNER) {
      const ck = await thu("đăng nhập Đối tác", () => L.session(taiKhoan.PARTNER));
      if (ck) {
        const dt = await lap(ck, "đơn của Đối tác", L.orderInput({ customerName: "Khách Của Đối Tác", customerPhone: "0904 567 890" }));
        if (dt) { id.orderTheoBo.PARTNER = dt.id; id.order ??= dt.id; }
      }
    }
    for (const b of cacBo) if (b !== "SALES" && b !== "PARTNER") id.orderTheoBo[b] ??= id.order; // bộ khác mở chi tiết đơn của Bán hàng (có thể bị 403: đó là kết quả đo)

    // ---- Chrome riêng, ngăn cookie riêng cho từng bộ quyền (cdp.mjs); tín hiệu do dung() lo
    const { moChrome } = await import(pathToFileURL(join(HERE, "cdp.mjs")).href);
    chrome = await moChrome({ tuXuLyTinHieu: false });

    return { base: env.base, persist: env.persist, taiKhoan, id, loiGieo, boChayDuoc, chrome, dung };
  } catch (e) {
    await dung();
    throw e;
  }
}
