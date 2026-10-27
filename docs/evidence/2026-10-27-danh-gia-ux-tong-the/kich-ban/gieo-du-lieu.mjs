// Gieo DỮ LIỆU GIẢ cho cuộc đánh giá UX 27/10/2026 — CHỈ trên máy chủ thử cục bộ (may-chu.mjs, cổng 8790, kho ~/tourdao-ux-2026-10-27/d1). KHÔNG BAO GIỜ trỏ vào production.
// Mọi lệnh GHI đi qua API thật (route, quyền, trigger, tiền tính ở máy chủ); SQL chỉ dùng để ĐỌC kiểm (sqlRows, SELECT).
// Chạy từ GỐC kho, máy chủ đang bật:
//   node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/gieo-du-lieu.mjs --chang tai-khoan|it|nhieu
// Chặng tai-khoan: tạo tài khoản mỗi bộ quyền (ghi tai-khoan.json). Chặng it: dữ liệu ít. Chặng nhieu: nâng lên ~40 đơn.
// Mỗi chặng tự kiểm kho đang ở đúng trạng thái trước (đếm đơn/tài khoản) để chạy lại không nhân đôi dữ liệu.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:8790";
const PERSIST = "/Users/tuanbao/tourdao-ux-2026-10-27/d1";
process.env.E2E_BASE_URL = BASE;
process.env.E2E_PERSIST_TO = PERSIST; // để sqlRows (chỉ đọc) đọc ĐÚNG kho của máy chủ thử, không phải .wrangler mặc định
if (!BASE.startsWith("http://127.0.0.1")) throw new Error("Chỉ chạy trên máy chủ thử cục bộ");
const L = await import("../../../../tests/e2e/lib.mjs");
const { call: callRaw, login, vnDate, sqlRows } = L; // KHÔNG dùng sql()/ensureFakeCatalog/gieoTaiKhoanLai (ghi SQL)

const HERE = dirname(fileURLToPath(import.meta.url));
const TK_FILE = join(HERE, "tai-khoan.json");
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const CHANG = arg("--chang");
if (!["tai-khoan", "it", "nhieu"].includes(CHANG ?? "")) { console.error("Dùng: --chang tai-khoan|it|nhieu"); process.exit(2); }

// ---- Nhật ký gieo: mọi lệnh ghi + kết quả, để viết GIEO-DU-LIEU.md
const LOG = [];
const loiGap = []; // lệnh bị từ chối: mã + câu lỗi nguyên văn (phát hiện UX)
const uuid = () => randomUUID();
const nghi = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(cookie, method, path, body, viec = "") {
  for (let lan = 1; ; lan++) {
    try {
      const r = await callRaw(cookie, method, path, body);
      if (method !== "GET") {
        LOG.push({ viec, method, path, status: r.status, ...(r.status >= 400 ? { loi: r.body?.error ?? r.body } : {}) });
        if (r.status >= 400) loiGap.push({ viec, method, path, status: r.status, code: r.body?.error?.code, message: r.body?.error?.message, lyDo: r.body?.error?.lyDo });
      }
      return r;
    } catch (e) {
      const m = String(e?.cause?.code ?? e?.message ?? e);
      if (lan < 4 && /ECONNRESET|UND_ERR_SOCKET|fetch failed|other side closed/.test(m)) { await nghi(500 * lan); continue; }
      if (/^H7/.test(String(e?.message))) { // 201 thiếu Location: ghi lại như phát hiện, không dừng
        loiGap.push({ viec, method, path, status: 201, code: "H7", message: e.message });
        return { status: 201, body: null, h7: true };
      }
      throw e;
    }
  }
}
const ok = (r, ma, viec) => {
  const dung = Array.isArray(ma) ? ma.includes(r.status) : r.status === ma;
  console.log(`${dung ? "✓" : "✗"} ${viec}: ${r.status}${dung ? "" : " " + JSON.stringify(r.body?.error ?? r.body).slice(0, 400)}`);
  return dung;
};
const docSo = async (q) => Number((await sqlRows(q))[0]?.n ?? 0);

// ---- Tài khoản
const TOAN_QUYEN = { bo: "SUPER_ADMIN+ADMIN", vai: "(chưa gán)", ten: "Toàn Quyền Thử", sdt: "0900000900", pin: "739184" };
const DS_TK = [
  { khoa: "sales", bo: "SALES", vai: "SALES_STAFF", ten: "Bán Hàng Thử", sdt: "0900000901" },
  { khoa: "sales2", bo: "SALES", vai: "SALES_STAFF", ten: "Bán Hàng Hai", sdt: "0900000902" },
  { khoa: "intern", bo: "INTERN", vai: "INTERN", ten: "Thực Tập Thử", sdt: "0900000903" },
  { khoa: "ketoan", bo: "ACCOUNTING", vai: "ACCOUNTANT", ten: "Kế Toán Thử", sdt: "0900000904" },
  { khoa: "quantri", bo: "ADMIN", vai: "DIRECTOR", ten: "Quản Trị Thử", sdt: "0900000905" },
  { khoa: "hdv", bo: "FIELD", vai: "GUIDE_INTERNAL", ten: "Hướng Dẫn Thử", sdt: "0900000906" },
  { khoa: "ctv", bo: "PARTNER", vai: "COLLABORATOR", ten: "Cộng Tác Thử", sdt: "0900000907" },
  { khoa: "luhanh", bo: "PARTNER", vai: "TRAVEL_AGENCY", ten: "Lữ Hành Thử", sdt: "0900000908" },
  { khoa: "taixe", bo: "DRIVER", vai: "DRIVER_INTERNAL", ten: "Tài Xế Công Ty Thử", sdt: "0900000909" },
  { khoa: "taixedt", bo: "DRIVER_PARTNER", vai: "DRIVER_EXTERNAL", ten: "Tài Xế Đối Tác Thử", sdt: "0900000910" },
  { khoa: "nhansu", bo: "HR", vai: "HR_STAFF", ten: "Nhân Sự Thử", sdt: "0900000911" },
];

async function dangNhap(sdt, pin) {
  for (let lan = 1; ; lan++) {
    try {
      return await login(sdt, pin);
    } catch (e) {
      if (lan < 4) { await nghi(500 * lan); continue; }
      throw e;
    }
  }
}

async function changTaiKhoan() {
  const daCo = await docSo("SELECT count(*) AS n FROM staff");
  if (daCo !== 1) throw new Error(`Kho phải chỉ có 1 tài khoản (Toàn quyền) — đang có ${daCo}. Chép lại từ d1-rong rồi chạy lại.`);
  const lg = await dangNhap(TOAN_QUYEN.sdt, TOAN_QUYEN.pin);
  if (lg.status !== 200) throw new Error(`Không đăng nhập được Toàn quyền: ${lg.status} ${JSON.stringify(lg.body)}`);
  const TQ = lg.cookie;
  const me = lg.body.staff;
  const ketQua = [];
  for (const t of DS_TK) {
    const r = await call(TQ, "POST", "/api/staff", { taoHoSoMoi: true, fullName: t.ten, phone: t.sdt, roles: [t.vai] }, `tạo tài khoản ${t.ten}`);
    if (!ok(r, 201, `tạo ${t.ten} (${t.vai})`)) { ketQua.push({ ...t, loiTao: r.body?.error }); continue; }
    ketQua.push({ ...t, pin: r.body.pin, id: r.body.staff.id, partyId: r.body.staff.partyId, permissions: r.body.staff.permissions, roles: r.body.staff.roles });
  }
  // Gán vai IT cho Toàn quyền (IT = Quản trị + Toàn quyền: quyền không đổi ⇒ được tự gán)
  const it = await call(TQ, "PUT", `/api/staff/${me.id}/roles`, { roles: ["IT"] }, "gán vai IT cho Toàn Quyền Thử");
  ok(it, 200, "gán vai IT cho Toàn Quyền Thử");
  const tq = { khoa: "toanquyen", ...TOAN_QUYEN, vai: it.status === 200 ? "IT" : "(không gán được IT)", id: me.id, partyId: me.partyId, permissions: me.permissions, ganIT: it.status === 200 ? "đã gán" : it.body?.error };
  // Đăng nhập thử từng tài khoản một lần
  for (const t of ketQua) {
    if (!t.pin) continue;
    const x = await dangNhap(t.sdt, t.pin);
    t.dangNhapThu = { status: x.status, code: x.body?.error?.code ?? null, message: x.body?.error?.message ?? null, khoaTraVe: x.body ? Object.keys(x.body) : [] };
    if (x.status === 200) {
      const m = await call(x.cookie, "GET", "/api/auth/me");
      t.dangNhapThu.me = { status: m.status, khoa: m.body ? Object.keys(m.body) : [], staffKhoa: m.body?.staff ? Object.keys(m.body.staff) : [] };
    }
    console.log(`  đăng nhập ${t.ten}: ${x.status} ${x.body?.error?.code ?? ""} ${JSON.stringify(x.body).slice(0, 200)}`);
  }
  writeFileSync(TK_FILE, JSON.stringify({ ghiChu: "DỮ LIỆU GIẢ, chỉ cho máy chủ thử cục bộ của cuộc đánh giá UX 27/10/2026. PIN do máy chủ sinh khi tạo (route không cho chọn PIN).", taiKhoan: [tq, ...ketQua] }, null, 2) + "\n");
  console.log(`Đã ghi ${TK_FILE}`);
}

// ---- Dùng chung cho chặng it / nhieu
function docTaiKhoan() {
  if (!existsSync(TK_FILE)) throw new Error("Chưa có tai-khoan.json — chạy --chang tai-khoan trước");
  return Object.fromEntries(JSON.parse(readFileSync(TK_FILE, "utf8")).taiKhoan.map((t) => [t.khoa, t]));
}
const PHIEN = new Map();
async function phien(t) {
  if (PHIEN.has(t.khoa)) return PHIEN.get(t.khoa);
  const x = await dangNhap(t.sdt, t.pin);
  if (x.status !== 200) throw new Error(`Không đăng nhập được ${t.ten}: ${x.status} ${JSON.stringify(x.body)}`);
  PHIEN.set(t.khoa, x.cookie);
  return x.cookie;
}

// @@CHANG_IT@@

// @@CHANG_NHIEU@@

async function ghiNhatKy() {
  const f = join(HERE, `nhat-ky-gieo-${CHANG}.json`);
  writeFileSync(f, JSON.stringify({ chang: CHANG, luc: new Date().toISOString(), soLenhGhi: LOG.length, loiGap, lenh: LOG }, null, 2) + "\n");
  console.log(`Nhật ký: ${f} — ${LOG.length} lệnh ghi, ${loiGap.length} lệnh bị từ chối`);
}

try {
  if (CHANG === "tai-khoan") await changTaiKhoan();
  else if (CHANG === "it") await changIt(docTaiKhoan());
  else await changNhieu(docTaiKhoan());
} finally {
  await ghiNhatKy();
}
