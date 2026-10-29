// Kế thừa từ kịch bản cùng tên của phiên a45f9ae5 (nhánh worktree-danh-gia-ux-tong-the, 27/10/2026); phiên này (v2) đổi cổng 8805 + kho ~/tourdao-ux-dot-0 và bổ sung theo đề bài bản mới.
// Gieo DỮ LIỆU GIẢ cho cuộc đánh giá UX 27/10/2026 — CHỈ trên máy chủ thử cục bộ (may-chu.mjs, cổng 8805, kho ~/tourdao-ux-dot-0/d1). KHÔNG BAO GIỜ trỏ vào production.
// Mọi lệnh GHI đi qua API thật (route, quyền, trigger, tiền tính ở máy chủ); SQL chỉ dùng để ĐỌC kiểm (sqlRows, SELECT).
// Chạy từ GỐC kho, máy chủ đang bật:
//   node docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/gieo-du-lieu.mjs --chang tai-khoan|it|nhieu
// Chặng tai-khoan: tạo tài khoản mỗi bộ quyền (ghi tai-khoan.json). Chặng it: dữ liệu ít. Chặng nhieu: nâng lên ~40 đơn.
// Mỗi chặng tự kiểm kho đang ở đúng trạng thái trước (đếm đơn/tài khoản) để chạy lại không nhân đôi dữ liệu.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.UX_BASE ?? "http://127.0.0.1:8805"; // UX_BASE: máy chủ khác (vd kho rỗng ở cổng 8797)
const PERSIST = process.env.UX_PERSIST ?? "/Users/tuanbao/tourdao-ux-dot-0/d1";
process.env.E2E_BASE_URL = BASE;
process.env.E2E_PERSIST_TO = PERSIST; // để sqlRows (chỉ đọc) đọc ĐÚNG kho của máy chủ thử, không phải .wrangler mặc định
if (!BASE.startsWith("http://127.0.0.1")) throw new Error("Chỉ chạy trên máy chủ thử cục bộ");
const L = await import("../../../../tests/e2e/lib.mjs");
const { call: callRaw, login, vnDate, sqlRows } = L; // KHÔNG dùng sql()/ensureFakeCatalog/gieoTaiKhoanLai (ghi SQL)

const HERE = dirname(fileURLToPath(import.meta.url));
const TK_FILE = process.env.UX_TK_FILE ?? join(HERE, "tai-khoan.json");
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
const TOAN_QUYEN = { bo: "SUPER_ADMIN+ADMIN", vai: "(chưa gán)", ten: "Toàn Quyền Thử", sdt: "0900000010", pin: "739164" };
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

// ===================================================================================================================================================
// Dùng chung chặng it / nhieu
const BEN_TAU = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (danh mục địa điểm gieo sẵn, migration 0010)
const gioVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 16);
const congPhut = (hhmm, phut) => { const [h, m] = hhmm.split(":").map(Number); const t = h * 60 + m + phut; return t >= 24 * 60 || t < 0 ? null : `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
const lamTron10 = (hhmm) => { if (!hhmm) return null; const [h, m] = hhmm.split(":").map(Number); return congPhut(`${String(h).padStart(2, "0")}:00`, Math.ceil(m / 10) * 10); };
let DANH_MUC = null;
async function danhMuc(cookie) {
  if (DANH_MUC) return DANH_MUC;
  const r = await call(cookie, "GET", "/api/catalog");
  DANH_MUC = (r.body?.items ?? []).filter((x) => x.supported && x.unit === "perPax" && (x.prices?.adult ?? 0) > 0);
  if (DANH_MUC.length < 6) throw new Error(`Danh mục thật quá ít (${DANH_MUC.length}) — máy chủ chưa tải được Sheet dịch vụ?`);
  return DANH_MUC;
}
const dm = (code) => { const x = DANH_MUC.find((i) => i.code === code); if (!x) throw new Error(`Không có mã ${code} trong danh mục`); return x; };
/** Một dịch vụ danh mục thật. `don` = { ngay, gio, noi } → có chặng đón (OUT) tới bến tàu. */
function dichVu(code, ngay, pax, don = null) {
  const it = dm(code);
  // Chỉ gửi giá đã thấy cho hạng khách có giá (dịch vụ không có giá trẻ em → trẻ em tính vào người lớn), như form thật.
  const gia = Object.fromEntries(Object.entries(it.prices).filter(([, v]) => Number.isInteger(v)));
  const p = { adult: 0, child: 0, senior: 0, infant: 0, ...pax };
  for (const kx of ["child", "senior", "infant"]) if (p[kx] && !(kx in gia)) { p.adult += p[kx]; p[kx] = 0; }
  return {
    kind: "catalog", catalogCode: code, pax: p, catalogPriceSeen: gia, departDate: ngay,
    pickupChoice: don ? "DON" : "KHONG_DON",
    legs: don ? [{ direction: "OUT", pickupDate: ngay, pickupTime: don.gio, pickupLocationId: null, pickupPlace: don.noi, dropoffLocationId: BEN_TAU, dropoffPlace: "" }] : [],
  };
}
async function lapDon(cookie, viec, { ten, sdt, services, passengers = [], bookerPartyId, handlerStaffId, discount = 0, note = "" }) {
  const body = { customerName: ten, customerPhone: sdt, customerEmail: "", customerNote: note, discount, paymentNote: "", services, passengers };
  if (bookerPartyId) body.bookerPartyId = bookerPartyId;
  if (handlerStaffId) body.handlerStaffId = handlerStaffId;
  const r = await call(cookie, "POST", "/api/orders", body, viec);
  return ok(r, 201, viec) ? r.body.order : null;
}
const xacNhan = async (cookie, o, viec) => !!o && ok(await call(cookie, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" }, viec), 200, viec);
const khach = (ten, n, namSinh = 1980) => Array.from({ length: n }, (_, i) => ({ fullName: n === 1 ? ten : `${ten} ${i + 1}`, birthYear: namSinh + i, paxCode: null }));
async function taoXe(cookie, viec, { bien, khung, ten, cho, chu, hanKiemDinh, hanBaoHiem }) {
  const r = await call(cookie, "POST", "/api/van-chuyen/xe", { plateNumber: bien, chassisNumber: khung, name: ten, passengerCapacity: cho, ...(chu ? { ownerPartyId: chu } : {}) }, viec);
  if (!ok(r, 201, viec)) return null;
  const id = r.body.vehicle.id;
  for (const [typeCode, han] of [["INSPECTION", hanKiemDinh], ["TPL_INSURANCE", hanBaoHiem]]) {
    if (!han) continue;
    const v = `${viec}: giấy tờ ${typeCode}`;
    ok(await call(cookie, "POST", `/api/van-chuyen/xe/${id}/giay-to`, { typeCode, number: `${typeCode === "INSPECTION" ? "KD" : "BH"}-${khung.slice(-6)}`, expiryDate: han }, v), 201, v);
  }
  return id;
}
async function taoChuyen(cookie, viec, { xeId, taiXePartyId, ngay, tu, den, chang }) {
  let c = await call(cookie, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId, batDau: { ngay, gio: tu }, ketThuc: { ngay, gio: den } }, viec);
  if (!ok(c, 201, viec)) return null;
  const id = c.body.chuyen.id;
  if (chang?.length) {
    c = await call(cookie, "POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { version: c.body.chuyen.version, requestId: uuid(), chang }, `${viec}: xếp khách`);
    ok(c, 200, `${viec}: xếp khách`);
  }
  return id;
}
async function taoHoSo(cookie, viec, than) {
  const r = await call(cookie, "POST", "/api/parties", than, viec);
  return ok(r, 201, viec) ? r.body.party : null;
}
async function datMucHoaHong(cookie, code, bp, viec) {
  return ok(await call(cookie, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code }, phamVi: "ALL", kieu: "RATE", tyLeBp: bp, tuNgay: vnDate(0) }, viec), 201, viec);
}
/** Giờ đón HÔM NAY ngoài mốc 6 giờ (+40 phút dư), hoặc null nếu đã quá 23:00 (khi đó dùng Đặt gấp). */
async function gioDonHomNay(cookie) {
  const moc = (await call(cookie, "GET", "/api/orders/moc-toi-thieu")).body?.mocToiThieuPhut ?? 360;
  const g = lamTron10(congPhut(gioVn(), moc + 40));
  return g && g <= "23:00" ? g : null;
}
// id đơn / xe / hồ sơ: chặng it ghi du-lieu-gieo-it.json; chặng nhieu ĐỌC tệp đó (không sửa) và ghi du-lieu-gieo-nhieu.json — chạy lại nhieu sau khi chép lại d1-it vẫn đúng.
const TT_IT = join(HERE, "du-lieu-gieo-it.json"), TT_NHIEU = join(HERE, "du-lieu-gieo-nhieu.json");
const TRANG_THAI = CHANG === "nhieu" && existsSync(TT_IT) ? JSON.parse(readFileSync(TT_IT, "utf8")) : {};
const luuTrangThai = () => writeFileSync(CHANG === "it" ? TT_IT : TT_NHIEU, JSON.stringify(TRANG_THAI, null, 2) + "\n");

// ===================================================================================================================================================
// Chặng "it": dữ liệu ÍT
async function changIt(tk) {
  if ((await docSo("SELECT count(*) AS n FROM staff")) !== 12 || (await docSo("SELECT count(*) AS n FROM orders")) !== 0) throw new Error("Kho phải ở trạng thái d1-tai-khoan (12 tài khoản, 0 đơn).");
  const TQ = await phien(tk.toanquyen), QT = await phien(tk.quantri), KT = await phien(tk.ketoan), BH = await phien(tk.sales);
  const CTV = await phien(tk.ctv);
  await danhMuc(BH);
  const ma = DANH_MUC.map((x) => x.code);
  console.log(`Danh mục thật: ${ma.length} dịch vụ theo người — ${ma.slice(0, 15).join(", ")}…`);
  const pick = (pref, i) => (ma.includes(pref) ? pref : ma[i % ma.length]);
  const DV = { duThuyen: pick("DTE1", 0), bus: pick("BCT4", 1), atv: pick("ATV", 2), dem: pick("BFN1", 3), bus24: pick("BCT24", 4) };
  TRANG_THAI.dichVu = DV;

  // 1) Cờ «cần xác nhận» cho MỘT dịch vụ (để có đơn «chờ xác nhận»)
  ok(await call(TQ, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: DV.duThuyen, canXacNhan: true }, `cờ cần xác nhận cho ${DV.duThuyen}`), 200, `cờ cần xác nhận cho ${DV.duThuyen}`);
  // 2) Mức hoa hồng theo vai (Kế toán) — TRƯỚC khi xác nhận đơn của Đối tác
  await datMucHoaHong(KT, "COLLABORATOR", 1000, "mức hoa hồng 10% Cộng tác viên");
  await datMucHoaHong(KT, "TRAVEL_AGENCY", 1200, "mức hoa hồng 12% Công ty lữ hành");

  // 3) Danh bạ: 5 khách lẻ, 1 đại lý tổ chức (không gán được vai — xem GIEO-DU-LIEU.md), 1 nhà xe đối tác
  const KHACH_LE = [["Nguyễn Thị Lan Anh", "0912000101"], ["Trần Văn Bình", "0912000102"], ["Lê Hoàng Châu", "0912000103"], ["Phạm Minh Đức", "0912000104"], ["Võ Thị Hồng Nhung", "0912000105"]];
  TRANG_THAI.khachLe = [];
  for (const [ten, sdt] of KHACH_LE) {
    const p = await taoHoSo(BH, `hồ sơ khách lẻ ${ten}`, { kind: "PERSON", fullName: ten, contacts: [{ kind: "PHONE", value: sdt, label: "Zalo" }] });
    if (p) TRANG_THAI.khachLe.push({ id: p.id, ten, sdt });
  }
  const daiLy = await taoHoSo(QT, "hồ sơ đại lý tổ chức", { kind: "ORGANIZATION", displayName: "Đại lý Biển Xanh Thử", legalName: "Công ty TNHH Du lịch Biển Xanh Thử", taxCode: "0312 000 111", invoiceEmail: "ketoan@bienxanh-thu.vn", address: "12 Trần Phú, Nha Trang" });
  if (daiLy) {
    const g = await call(QT, "POST", `/api/parties/${daiLy.id}/roles`, { roleTypeCode: "TRAVEL_AGENCY" }, "gán vai Công ty lữ hành cho hồ sơ TỔ CHỨC");
    ok(g, [201, 409], "gán vai Công ty lữ hành cho hồ sơ tổ chức (mong 409 — lỗ đã biết)");
    TRANG_THAI.daiLyToChuc = { id: daiLy.id, ganVai: g.status, loi: g.body?.error };
  }
  const nhaXe = await taoHoSo(QT, "hồ sơ nhà xe đối tác", { kind: "ORGANIZATION", displayName: "Nhà xe Hải Âu Thử", address: "45 Lê Hồng Phong, Nha Trang" });
  if (nhaXe) {
    ok(await call(QT, "POST", `/api/parties/${nhaXe.id}/roles`, { roleTypeCode: "CARRIER" }, "gán vai Nhà xe đối tác"), 201, "gán vai Nhà xe đối tác");
    ok(await call(QT, "POST", `/api/parties/${nhaXe.id}/relationships`, { fromPartyId: tk.taixedt.partyId, toPartyId: nhaXe.id, relationshipTypeCode: "DRIVES_FOR" }, "Tài xế đối tác → Tài xế của nhà xe"), 201, "Tài xế đối tác thuộc nhà xe");
    ok(await call(QT, "POST", `/api/parties/${nhaXe.id}/contacts`, { kind: "PHONE", value: "0912000199", label: "Điều hành" }, "liên hệ nhà xe"), 201, "liên hệ nhà xe");
    TRANG_THAI.nhaXe = nhaXe.id;
  }
  // 4) Bằng lái cho hai tài xế
  for (const [t, so, hang] of [[tk.taixe, "790123456781", "D1"], [tk.taixedt, "790123456782", "D2"]]) {
    ok(await call(QT, "POST", `/api/parties/${t.partyId}/documents`, { typeCode: "GPLX", number: so, classCode: hang, expiryDate: vnDate(500) }, `GPLX ${t.ten}`), 201, `GPLX ${t.ten}`);
  }
  // 5) Xe: 2 xe công ty đủ giấy tờ, 1 xe giấy tờ sắp hết hạn
  TRANG_THAI.xe = {};
  TRANG_THAI.xe.xe1 = await taoXe(QT, "xe công ty 1", { bien: "79B-123.45", khung: "RLUX16CHO000001", ten: "Ford Transit 16 chỗ", cho: 16, hanKiemDinh: vnDate(300), hanBaoHiem: vnDate(250) });
  TRANG_THAI.xe.xe2 = await taoXe(QT, "xe công ty 2", { bien: "79B-234.56", khung: "RLUX29CHO000002", ten: "Hyundai County 29 chỗ", cho: 29, hanKiemDinh: vnDate(200), hanBaoHiem: vnDate(320) });
  TRANG_THAI.xe.xe3 = await taoXe(QT, "xe công ty 3 (giấy tờ sắp hết hạn)", { bien: "79B-345.67", khung: "RLUX07CHO000003", ten: "Toyota Innova 7 chỗ", cho: 7, hanKiemDinh: vnDate(9), hanBaoHiem: vnDate(20) });

  // 6) Đơn
  TRANG_THAI.don = {};
  const KL = TRANG_THAI.khachLe;
  // 6a) Nháp
  const nhap = await lapDon(BH, "đơn nháp", { ten: KL[0].ten, sdt: KL[0].sdt, bookerPartyId: KL[0].id, services: [dichVu(DV.bus, vnDate(3), { adult: 2, child: 1 })], note: "Khách hỏi giờ xe buýt chiều" });
  TRANG_THAI.don.nhap = nhap?.id;
  // 6b) Chờ xác nhận (dịch vụ mang cờ)
  const cho = await lapDon(BH, "đơn chờ xác nhận", { ten: KL[1].ten, sdt: KL[1].sdt, bookerPartyId: KL[1].id, services: [dichVu(DV.duThuyen, vnDate(4), { adult: 2 })] });
  if (cho) ok(await call(BH, "POST", `/api/orders/${cho.id}/gui-xac-nhan`, {}, "gửi xác nhận"), [200, 201], "gửi xác nhận đơn du thuyền");
  TRANG_THAI.don.choXacNhan = cho?.id;
  // 6c) Đã xác nhận, BA dịch vụ, có chặng đón ngày mai, gán HDV
  const ba = await lapDon(BH, "đơn ba dịch vụ đã xác nhận (gán HDV)", {
    ten: KL[2].ten, sdt: KL[2].sdt, bookerPartyId: KL[2].id, handlerStaffId: tk.hdv.id,
    services: [dichVu(DV.bus, vnDate(1), { adult: 3 }, { gio: "08:00", noi: "Khách sạn Mường Thanh Luxury, 60 Trần Phú" }), dichVu(DV.atv, vnDate(1), { adult: 2, child: 1 }), dichVu(DV.dem, vnDate(1), { adult: 3 })],
    passengers: khach("Lê Hoàng Châu", 3, 1985),
  });
  await xacNhan(BH, ba, "xác nhận đơn ba dịch vụ");
  TRANG_THAI.don.baDichVu = ba?.id;
  // 6d) Đơn chạy HÔM NAY (cho Trang tài xế / Cuốc có dữ liệu trong ngày chạy)
  let gio = await gioDonHomNay(BH);
  const datGap = !gio;
  if (datGap) gio = "23:30";
  TRANG_THAI.gioDonHomNay = { gio, datGap };
  const homNay = await lapDon(BH, "đơn đưa đón hôm nay", {
    ten: KL[3].ten, sdt: KL[3].sdt, bookerPartyId: KL[3].id,
    services: [dichVu(DV.dem, vnDate(0), { adult: 4 }, { gio, noi: "Khách sạn Novotel, 50 Trần Phú" })], passengers: khach("Phạm Minh Đức", 4, 1975),
  });
  if (homNay && datGap) ok(await call(BH, "POST", `/api/orders/${homNay.id}/legs/${homNay.services[0].legs[0].id}/short-notice`, { lyDo: "KHACH_DOAN_GOI_GAP" }, "đặt gấp chặng hôm nay"), 200, "đặt gấp chặng hôm nay");
  await xacNhan(BH, homNay, "xác nhận đơn hôm nay");
  TRANG_THAI.don.homNay = homNay?.id;
  // 7) Chuyến hôm nay: xe 1 + tài xế công ty, xếp đủ 4 khách
  if (homNay && TRANG_THAI.xe.xe1) {
    const tu = congPhut(gio, -20) ?? gio, den = congPhut(gio, 100) ?? "23:59";
    TRANG_THAI.chuyenHomNay = await taoChuyen(BH, "chuyến hôm nay (tài xế công ty)", { xeId: TRANG_THAI.xe.xe1, taiXePartyId: tk.taixe.partyId, ngay: vnDate(0), tu, den, chang: [{ legId: homNay.services[0].legs[0].id, soSuat: 4 }] });
  }
  // 8) Đơn do Đối tác (Cộng Tác Thử) gửi — nhánh B (dịch vụ thường) → đã xác nhận
  const dt = await lapDon(CTV, "đơn của Đối tác (Cộng tác viên)", { ten: "Đặng Quốc Huy", sdt: "0912000106", services: [dichVu(DV.bus24, vnDate(5), { adult: 2, senior: 1 })] });
  if (dt) ok(await call(CTV, "POST", `/api/orders/${dt.id}/gui-don`, {}, "Đối tác gửi đơn"), [200, 201], "Đối tác gửi đơn");
  TRANG_THAI.don.doiTac = dt?.id;
  // 9) Một vé Hỗ trợ / Góp ý (Bán hàng → nhóm Điều hành)
  ok(await call(BH, "POST", "/api/feedback", { kind: "QUESTION", title: "Xe đón khách đoàn sáng mai đã có tài xế chưa?", body: "Khách đoàn 3 người ở Mường Thanh hỏi giờ xe tới đón, nhờ Điều hành xác nhận giúp.", teamId: "fbk-team-dieu-hanh", clientRequestId: uuid(), context: { path: "/" } }, "vé hỗ trợ"), 201, "vé hỗ trợ (Bán hàng → Điều hành)");
  // 10) Một thông báo hệ thống (Toàn quyền → mọi nhân viên nội bộ)
  ok(await call(TQ, "POST", "/api/thong-bao", { tieuDe: "Lịch họp giao ban thứ Sáu", noiDung: "Mời các bộ phận họp giao ban lúc 8 giờ sáng thứ Sáu tại văn phòng Trần Phú.", nguoiNhan: ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "INTERN", "HR", "DRIVER"], quanTrong: false, clientRequestId: uuid() }, "thông báo hệ thống"), 201, "thông báo hệ thống");
  luuTrangThai();
}

// ===================================================================================================================================================
// Chặng "nhieu": nâng lên ~40 đơn, ~25 hồ sơ Danh bạ, 6 xe, vài chuyến, công nợ + điều chỉnh, chuyển khách, báo bận, vài vé
async function changNhieu(tk) {
  if ((await docSo("SELECT count(*) AS n FROM orders")) !== 5) throw new Error("Kho phải ở trạng thái d1-it (5 đơn).");
  if (!TRANG_THAI.don) throw new Error("Thiếu du-lieu-gieo.json của chặng it");
  const TQ = await phien(tk.toanquyen), QT = await phien(tk.quantri), KT = await phien(tk.ketoan);
  const BH = await phien(tk.sales), BH2 = await phien(tk.sales2), TT = await phien(tk.intern), HDV = await phien(tk.hdv);
  const CTV = await phien(tk.ctv), LH = await phien(tk.luhanh), TX = await phien(tk.taixe), TXDT = await phien(tk.taixedt), NS = await phien(tk.nhansu);
  await danhMuc(BH);
  const ma = DANH_MUC.map((x) => x.code);
  const DV = TRANG_THAI.dichVu;
  const congTy = (await sqlRows("SELECT party_id AS id FROM v_pty_owner_company"))[0]?.id; // đọc
  const ketQua = { donTheoViec: [] };

  // 1) Danh bạ thêm: 16 khách lẻ + 1 khách sạn (tổ chức) + 1 công ty lữ hành không tài khoản
  const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
  const TEN = ["Minh Khang", "Thu Hà", "Quốc Bảo", "Ngọc Trâm", "Gia Huy", "Thanh Tâm", "Hữu Phước", "Mỹ Linh", "Đức Anh", "Khánh Vy", "Tuấn Kiệt", "Bảo Ngọc", "Văn Sơn", "Thị Mai", "Hải Đăng", "Phương Thảo"];
  for (let i = 0; i < 16; i++) {
    const ten = `${HO[i]} ${TEN[i]}`, sdt = `09${String(12 + (i % 3)).padStart(2, "0")}000${String(200 + i).padStart(3, "0")}`;
    const p = await taoHoSo(i % 2 ? BH2 : BH, `hồ sơ khách lẻ ${ten}`, { kind: "PERSON", fullName: ten, contacts: [{ kind: "PHONE", value: sdt }] });
    if (p) TRANG_THAI.khachLe.push({ id: p.id, ten, sdt });
  }
  await taoHoSo(QT, "hồ sơ khách sạn", { kind: "ORGANIZATION", displayName: "Khách sạn Sao Biển Thử", address: "88 Trần Phú, Nha Trang" });
  await taoHoSo(KT, "hồ sơ công ty lữ hành (chưa tài khoản)", { kind: "ORGANIZATION", displayName: "Lữ hành Phương Nam Thử", legalName: "Công ty CP Lữ hành Phương Nam Thử", taxCode: "0312 000 222", address: "5 Lê Lợi, TP Hồ Chí Minh" });

  // 2) Xe: thêm 3 (tổng 6) — 1 xe 45 chỗ, 1 xe của nhà xe đối tác, 1 xe 16 chỗ chưa có giấy tờ
  TRANG_THAI.xe.xe4 = await taoXe(QT, "xe công ty 4 (45 chỗ)", { bien: "79B-456.78", khung: "RLUX45CHO000004", ten: "Thaco Universe 45 chỗ", cho: 45, hanKiemDinh: vnDate(150), hanBaoHiem: vnDate(180) });
  TRANG_THAI.xe.xe5 = await taoXe(QT, "xe của nhà xe đối tác", { bien: "79H-567.89", khung: "RLUX16NXE000005", ten: "Ford Transit 16 chỗ (Hải Âu)", cho: 16, chu: TRANG_THAI.nhaXe, hanKiemDinh: vnDate(120), hanBaoHiem: vnDate(90) });
  TRANG_THAI.xe.xe6 = await taoXe(QT, "xe công ty 6 (chưa có giấy tờ)", { bien: "79B-678.90", khung: "RLUX16CHO000006", ten: "Hyundai Solati 16 chỗ", cho: 16 });

  // 3) Đơn: trải nhiều người lập, nhiều ngày (−14 … +14), nhiều trạng thái
  const KL = TRANG_THAI.khachLe;
  const dvThuong = ma.filter((c) => c !== DV.duThuyen);
  let k = 0;
  const kh = () => KL[(k++) % KL.length];
  const dsDon = [];
  const lap = async (who, ten, viec, ngay, extra = {}) => {
    const c = kh();
    const code = extra.code ?? dvThuong[(dsDon.length * 7) % dvThuong.length];
    const pax = extra.pax ?? { adult: 1 + (dsDon.length % 4), child: dsDon.length % 3 === 0 ? 1 : 0 };
    const services = extra.services ?? [dichVu(code, ngay, pax, extra.don ?? null)];
    const o = await lapDon(who, `${viec} (${ten}, ngày ${ngay})`, { ten: extra.ten ?? c.ten, sdt: extra.sdt ?? c.sdt, bookerPartyId: extra.khongHoSo ? undefined : c.id, services, passengers: extra.passengers ?? [], handlerStaffId: extra.handler });
    if (o) dsDon.push({ id: o.id, ten, viec, ngay });
    return o;
  };
  const huy = async (who, o, viec) => o && ok(await call(who, "POST", `/api/orders/${o.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" }, viec), 200, viec);
  const homNay = vnDate(0);

  // 3a) Nháp (8): mỗi người lập vài cái
  for (const [who, ten, d] of [[BH, "Bán Hàng Thử", 2], [BH, "Bán Hàng Thử", 9], [BH2, "Bán Hàng Hai", 6], [BH2, "Bán Hàng Hai", 12], [TT, "Thực Tập Thử", 3], [TT, "Thực Tập Thử", 7], [CTV, "Cộng Tác Thử", 8], [LH, "Lữ Hành Thử", 10]]) {
    await lap(who, ten, "đơn nháp", vnDate(d), who === CTV || who === LH ? { khongHoSo: true } : {});
  }
  // 3b) Chờ xác nhận (3): dịch vụ mang cờ (du thuyền) — Bán hàng «Gửi xác nhận», Đối tác «Gửi đơn» (nhánh A)
  for (const [who, ten, d, lenh] of [[BH2, "Bán Hàng Hai", 6, "gui-xac-nhan"], [TT, "Thực Tập Thử", 5, "gui-xac-nhan"], [LH, "Lữ Hành Thử", 9, "gui-don"]]) {
    const o = await lap(who, ten, "đơn chờ xác nhận", vnDate(d), { code: DV.duThuyen, pax: { adult: 2 }, ...(who === LH ? { khongHoSo: true } : {}) });
    if (o) ok(await call(who, "POST", `/api/orders/${o.id}/${lenh}`, {}, `${lenh} (${ten})`), [200, 201], `${lenh} (${ten})`);
  }
  // 3c) Đã xác nhận (16): tương lai gần, một số có chặng đón, một số do Đối tác gửi (nhánh B)
  const xacNhanTL = [];
  const NOI = ["Khách sạn Sheraton, 26 Trần Phú", "Khách sạn Liberty Central, 9 Biệt Thự", "Homestay Hòn Chồng, 12 Nguyễn Đình Chiểu", "Khách sạn InterContinental, 32 Trần Phú"];
  for (let i = 0; i < 12; i++) {
    const [who, ten] = [[BH, "Bán Hàng Thử"], [BH2, "Bán Hàng Hai"], [TT, "Thực Tập Thử"]][i % 3];
    const d = 1 + (i % 14);
    const coDon = i % 3 === 0;
    const so = 1 + (i % 4);
    const o = await lap(who, ten, "đơn đã xác nhận", vnDate(d), {
      pax: { adult: so }, don: coDon ? { gio: ["07:30", "08:00", "13:30", "14:00"][i % 4], noi: NOI[i % 4] } : null,
      // Thực tập sinh không được chọn người phụ trách khi lập (403 — ghi ở GIEO-DU-LIEU.md) ⇒ chỉ Bán hàng gán HDV.
      passengers: coDon ? khach(`Khách Đoàn ${i + 1}`, so, 1970 + i) : [], handler: i % 4 === 1 && who !== TT ? tk.hdv.id : undefined,
    });
    if (await xacNhan(who, o, `xác nhận đơn ${ten} ngày ${vnDate(d)}`)) xacNhanTL.push({ o, who, d, coDon, so, coHdv: i % 4 === 1 && who !== TT });
  }
  for (const [who, ten, d] of [[CTV, "Cộng Tác Thử", 4], [CTV, "Cộng Tác Thử", 11], [LH, "Lữ Hành Thử", 6], [LH, "Lữ Hành Thử", 13]]) {
    const o = await lap(who, ten, "đơn Đối tác gửi (nhánh B)", vnDate(d), { khongHoSo: true, ten: `Khách của ${ten} ${d}`, sdt: `0913000${String(300 + d).padStart(3, "0")}` });
    if (o) ok(await call(who, "POST", `/api/orders/${o.id}/gui-don`, {}, `gửi đơn (${ten})`), [200, 201], `gửi đơn (${ten})`);
  }
  // 3d) Quá khứ gần: thử lập + xác nhận đơn ngày đi đã qua (để có đơn Hoàn thành / Đã huỷ ở quá khứ)
  const quaKhu = [];
  for (const [who, ten, d] of [[BH, "Bán Hàng Thử", -2], [BH2, "Bán Hàng Hai", -5], [BH, "Bán Hàng Thử", -9], [BH2, "Bán Hàng Hai", -13]]) {
    const o = await lap(who, ten, "đơn quá khứ", vnDate(d), { handler: tk.hdv.id, pax: { adult: 2 } });
    if (await xacNhan(who, o, `xác nhận đơn quá khứ ngày ${vnDate(d)}`)) quaKhu.push({ o, who, d });
    else if (o) quaKhu.push({ o, who, d, chuaXacNhan: true });
  }
  // 3e) Hoàn thành: Kế toán ghi công ty thu đủ → HDV «Đã giao» → Kế toán «Hoàn thành». Đơn ngày đi đã qua KHÔNG xác nhận được (409 incomplete_trip, lý do
  // past_date — lần chạy đầu) ⇒ dùng đơn ngày đi HÔM NAY (không chặng đón, nên không vướng mốc 6 giờ), HDV phụ trách. Ba đơn: hai Hoàn thành, một chỉ Đã giao.
  const homNayHt = [];
  for (const [who, ten] of [[BH, "Bán Hàng Thử"], [BH2, "Bán Hàng Hai"], [BH, "Bán Hàng Thử"]]) {
    const o = await lap(who, ten, "đơn hôm nay để Hoàn thành", homNay, { handler: tk.hdv.id, pax: { adult: 2 } });
    if (await xacNhan(who, o, "xác nhận đơn hôm nay (Hoàn thành)")) homNayHt.push({ o, who, d: 0 });
  }
  ketQua.hoanThanh = [];
  for (const [j, q] of homNayHt.entries()) {
    const pay = (await call(KT, "GET", `/api/orders/${q.o.id}/payments`)).body;
    const con = pay?.conLai ?? q.o.total;
    if (con > 0) ok(await call(KT, "POST", `/api/orders/${q.o.id}/payments`, { soTien: con, hinhThuc: "CASH", nguoiThu: "cong_ty" } /* chuyển khoản đòi mã giao dịch + số tiền sao kê (400 bank_txn_required, lần chạy trước) */, "Kế toán ghi công ty thu đủ"), 201, "Kế toán ghi công ty thu đủ");
    const g = ok(await call(HDV, "POST", `/api/orders/${q.o.id}/delivered`, {}, "HDV Đã giao"), 200, "HDV Đã giao");
    const h = g && j < 2 && ok(await call(KT, "POST", `/api/orders/${q.o.id}/completed`, {}, "Kế toán Hoàn thành"), 200, "Kế toán Hoàn thành");
    ketQua.hoanThanh.push({ id: q.o.id, ngay: vnDate(q.d), daGiao: g, hoanThanh: !!h });
  }
  // 3f) Đã huỷ (5): một đơn quá khứ còn lại + 4 đơn mới huỷ (nháp và đã xác nhận)
  const conLai = quaKhu.filter((x) => !ketQua.hoanThanh.some((h) => h.id === x.o.id));
  for (const q of conLai) await huy(q.who, q.o, `huỷ đơn quá khứ ngày ${vnDate(q.d)}`);
  for (const [who, ten, d, xn] of [[BH, "Bán Hàng Thử", 3, true], [BH2, "Bán Hàng Hai", 5, false], [TT, "Thực Tập Thử", 8, false], [BH, "Bán Hàng Thử", 10, true]]) {
    const o = await lap(who, ten, "đơn sẽ huỷ", vnDate(d));
    if (xn) await xacNhan(who, o, "xác nhận trước khi huỷ");
    await huy(who, o, `huỷ đơn ${ten} ngày ${vnDate(d)}`);
  }

  // 4) Chuyến các ngày
  TRANG_THAI.chuyen = TRANG_THAI.chuyen ?? {};
  // 4a) Ngày mai: đơn ba dịch vụ (chặng 08:00) trên xe 2, tài xế công ty
  const ba = (await call(BH, "GET", `/api/orders/${TRANG_THAI.don.baDichVu}`)).body?.order;
  const legBa = ba?.services?.flatMap((s) => s.legs ?? [])[0];
  // Tài xế công ty có bằng D1 (tới 16 chỗ) ⇒ chỉ lái xe 1 (16 chỗ); xe 29 / 45 chỗ bị chặn «Hạng bằng lái không đủ» (lần chạy đầu, ghi ở GIEO-DU-LIEU.md).
  if (legBa) TRANG_THAI.chuyen.mai = await taoChuyen(BH, "chuyến ngày mai (đơn ba dịch vụ)", { xeId: TRANG_THAI.xe.xe1, taiXePartyId: tk.taixe.partyId, ngay: vnDate(1), tu: "07:30", den: "09:30", chang: [{ legId: legBa.id, soSuat: 3 }] });
  // 4b) Các đơn đã xác nhận có chặng đón: xếp lên chuyến theo ngày (xe 4, tài xế công ty; hoặc xe nhà xe + tài xế đối tác)
  for (const [i, x] of xacNhanTL.filter((y) => y.coDon).entries()) {
    const leg = x.o.services[0].legs[0];
    const tu = congPhut(leg.pickupTime, -30), den = congPhut(leg.pickupTime, 120);
    const doiTac = i % 2 === 0; // ngày mai 07:30 tài xế công ty đã chạy chuyến đơn ba dịch vụ → chuyến đầu giao nhà xe
    const id = await taoChuyen(BH, `chuyến ngày ${vnDate(x.d)} (${doiTac ? "nhà xe đối tác" : "xe công ty"})`, { xeId: doiTac ? TRANG_THAI.xe.xe5 : TRANG_THAI.xe.xe1, taiXePartyId: doiTac ? tk.taixedt.partyId : tk.taixe.partyId, ngay: vnDate(x.d), tu, den, chang: [{ legId: leg.id, soSuat: x.so }] });
    TRANG_THAI.chuyen[`ngay${x.d}`] = id;
  }
  // 4c) Chuyển khách: hai chuyến HÔM NAY chạy ngay (đặt gấp vì dưới mốc 6 giờ), tài xế công ty nhờ xe nhà xe nhận một điểm đón
  const bayGio = gioVn();
  if (bayGio < "18:30") {
    const gA = lamTron10(congPhut(bayGio, 40)), gB = congPhut(gA, 10);
    const don2 = [];
    for (const [g, noi, so] of [[gA, "Khách sạn Havana, 38 Trần Phú", 2], [gB, "Khách sạn Vinpearl Beachfront, 78 Trần Phú", 2]]) {
      const o = await lap(BH, "Bán Hàng Thử", "đơn đưa đón gấp hôm nay", homNay, { pax: { adult: so }, don: { gio: g, noi }, passengers: khach(`Khách Gấp ${g}`, so, 1990) });
      if (!o) continue;
      const leg = o.services[0].legs[0];
      ok(await call(BH, "POST", `/api/orders/${o.id}/legs/${leg.id}/short-notice`, { lyDo: "KHACH_DOAN_GOI_GAP" }, "đặt gấp chặng hôm nay"), [200, 409], "đặt gấp chặng hôm nay");
      if (await xacNhan(BH, o, "xác nhận đơn gấp hôm nay")) don2.push({ o, leg, so });
    }
    if (don2.length === 2) {
      const tuA = congPhut(gA, -20), denA = congPhut(gA, 90);
      const cA = await taoChuyen(BH, "chuyến gấp hôm nay A (tài xế công ty, xe 1)", { xeId: TRANG_THAI.xe.xe1, taiXePartyId: tk.taixe.partyId, ngay: homNay, tu: tuA, den: denA, chang: [{ legId: don2[0].leg.id, soSuat: 2 }] });
      const cB = await taoChuyen(BH, "chuyến gấp hôm nay B (tài xế đối tác, xe nhà xe)", { xeId: TRANG_THAI.xe.xe5, taiXePartyId: tk.taixedt.partyId, ngay: homNay, tu: tuA, den: denA, chang: [{ legId: don2[1].leg.id, soSuat: 2 }] });
      TRANG_THAI.chuyen.gapA = cA; TRANG_THAI.chuyen.gapB = cB;
      if (cA && cB) {
        const xa = ok(await call(TX, "POST", `/api/van-chuyen/cuoc-cua-toi/${cA}/xuat-ben`, { requestId: uuid() }, "tài xế công ty xuất bến"), 200, "tài xế công ty xuất bến");
        // Chuyến xe thuê (xe nhà xe) phải có giá trước khi chạy (lần chạy đầu: 409 THIEU_GIA) ⇒ Kế toán nhập giá thoả thuận.
        const cp = (await call(KT, "GET", `/api/van-chuyen/chuyen/${cB}/chi-phi`)).body;
        ok(await call(KT, "POST", `/api/van-chuyen/chuyen/${cB}/chi-phi/gia-thoa-thuan`, { requestId: uuid(), phienBanChiPhi: cp?.chiPhi?.phienBanChiPhi, soTien: 900000, ghiChu: "Giá thoả thuận chuyến gấp với nhà xe Hải Âu" }, "giá thoả thuận chuyến xe thuê"), [200, 201],"Kế toán nhập giá thoả thuận chuyến xe thuê");
        const xb = ok(await call(TXDT, "POST", `/api/van-chuyen/cuoc-cua-toi/${cB}/xuat-ben`, { requestId: uuid() }, "tài xế đối tác xuất bến"), 200, "tài xế đối tác xuất bến");
        if (xa && xb) {
          const ct = (await call(TX, "GET", `/api/van-chuyen/cuoc-cua-toi/${cA}`)).body;
          const diem = ct?.diem?.find((d) => d.loai === "PICKUP");
          const nhan = await call(TX, "GET", `/api/van-chuyen/cuoc-cua-toi/${cA}/xe-nhan?phamVi=STOP`);
          console.log(`  xe nhận được: ${JSON.stringify(nhan.body?.xe?.map((x) => x.tripId === cB) ?? nhan.body)}`);
          if (diem) {
            const r = await call(TX, "POST", `/api/van-chuyen/cuoc-cua-toi/${cA}/de-nghi`, { requestId: uuid(), denChuyenId: cB, phamVi: "STOP", diemId: diem.id }, "đề nghị chuyển khách");
            ok(r, [200, 201], "đề nghị chuyển khách (tài xế công ty → xe nhà xe)");
            ketQua.deNghi = { status: r.status, ketQua: r.body?.ketQua, trangThai: r.body?.deNghi?.trangThai, loi: r.body?.error };
          }
        }
      }
    }
  } else console.log(`- bỏ qua chuyển khách: đã ${bayGio} giờ VN`);

  // 5) Báo bận của tài xế (ngày +3 và +4)
  // Tài xế CÔNG TY không tự báo bận được (ô unavailability.self chỉ mở cho Tài xế đối tác; lần chạy đầu 403 «Tài khoản này không báo bận được.»).
  ok(await call(TXDT, "POST", "/api/van-chuyen/ban", { batDau: { ngay: vnDate(4), gio: "06:00" }, ketThuc: { ngay: vnDate(4), gio: "12:00" }, lyDo: "BTX_OM" }, "tài xế đối tác báo bận"), [200, 201], "tài xế đối tác báo bận");

  // 6) Công nợ của Đối tác + điều chỉnh (Kế toán gửi; Quản trị duyệt một cái)
  const dtDon = TRANG_THAI.don.doiTac;
  ketQua.congNo = {};
  if (dtDon) {
    const o = (await call(CTV, "GET", `/api/orders/${dtDon}`)).body?.order;
    ketQua.congNo.bookerPartyId = o?.bookerPartyId ?? null;
    const thu = await call(CTV, "POST", `/api/orders/${dtDon}/payments`, { soTien: Math.min(500000, o?.total ?? 500000), hinhThuc: "CASH", nguoiThu: "toi" }, "Đối tác tự ghi đã thu tiền khách");
    ok(thu, 201, "Đối tác tự ghi đã thu tiền khách (đối tác nợ công ty)");
    const ctvParty = tk.ctv.partyId;
    // Hai dạng thân thử lần lượt (dạng trong dieu-chinh-duyet.mjs): giảm nợ (công ty «nợ» đối tác, SETTLEMENT) rồi tăng nợ (đối tác nợ công ty, HELD).
    const MAU = [
      { benNo: congTy, benDuocNo: ctvParty, loaiDong: "SETTLEMENT", nhan: "giảm nợ (SETTLEMENT)" },
      { benNo: ctvParty, benDuocNo: congTy, loaiDong: "HELD", nhan: "tăng nợ (HELD)" },
    ];
    let mau = null, r1 = null;
    for (const m of MAU) {
      r1 = await call(KT, "POST", "/api/ledger/adjustments", { loai: "dieu_chinh", orderId: dtDon, benNo: m.benNo, benDuocNo: m.benDuocNo, loaiDong: m.loaiDong, soTien: 50000, lyDo: "Đối tác đã chuyển khoản trước 50.000 đ, ghi bù" }, `điều chỉnh công nợ đối tác — ${m.nhan}`);
      if (ok(r1, 201, `Kế toán gửi điều chỉnh (chờ duyệt) — ${m.nhan}`)) { mau = m; break; }
    }
    ketQua.congNo.yeuCau1 = { status: r1?.status, id: r1?.body?.yeuCauId, dang: mau?.nhan, loi: r1?.body?.error };
    const r2 = mau ? await call(KT, "POST", "/api/ledger/adjustments", { loai: "dieu_chinh", orderId: dtDon, benNo: mau.benNo, benDuocNo: mau.benDuocNo, loaiDong: mau.loaiDong, soTien: 30000, lyDo: "Bù trừ tiền vé trẻ em đối tác đã trả hộ" }, "điều chỉnh công nợ thứ hai") : { status: 0, body: null };
    ok(r2, 201, "Kế toán gửi điều chỉnh thứ hai");
    ketQua.congNo.yeuCau2 = { status: r2.status, id: r2.body?.yeuCauId, loi: r2.body?.error };
    if (r2.body?.yeuCauId) {
      const d = await call(QT, "POST", `/api/ledger/adjustment-requests/${r2.body.yeuCauId}/approve`, undefined, "Quản trị duyệt điều chỉnh thứ hai");
      ok(d, 201, "Quản trị duyệt điều chỉnh thứ hai (luật hai người)");
      ketQua.congNo.duyet2 = { status: d.status, loi: d.body?.error };
    }
  }
  // 6b) HDV giữ tiền khách (đơn đã xác nhận do HDV phụ trách) → thêm một dòng công nợ nội bộ
  const donHdv = xacNhanTL.find((x) => x.coHdv) ?? null;
  if (donHdv) ok(await call(HDV, "POST", `/api/orders/${donHdv.o.id}/payments`, { soTien: 200000, hinhThuc: "CASH", nguoiThu: "toi" }, "HDV thu cọc tiền mặt"), 201, "HDV thu cọc tiền mặt");

  // 7) Vài vé Hỗ trợ / Góp ý
  const ve = [
    [HDV, { kind: "BUG", title: "Nút Đã giao không bấm được trên iPhone", body: "Tôi bấm Đã giao ở đơn khách đoàn nhưng không thấy gì xảy ra.", context: { path: "/order" } }],
    [TT, { kind: "IDEA", title: "Cho phép tìm khách theo số phòng khách sạn", body: "Khách hay đọc số phòng thay vì tên, đề nghị thêm ô tìm theo số phòng." }],
    [KT, { kind: "QUESTION", title: "Đối soát công nợ Cộng tác viên tháng 10", body: "Nhờ bộ phận Kế toán kiểm lại khoản 500.000 đ của Cộng Tác Thử.", teamId: "fbk-team-ke-toan" }],
    [CTV, { kind: "BUG", title: "Không thấy đơn vừa gửi trong danh sách", body: "Tôi gửi đơn xong nhưng phải tải lại trang mới thấy." }],
    [TX, { kind: "QUESTION", title: "Đổi ca chạy chiều thứ Năm", body: "Tôi bận việc riêng chiều thứ Năm, nhờ Điều hành xếp người khác.", teamId: "fbk-team-dieu-hanh" }],
  ];
  for (const [who, than] of ve) ok(await call(who, "POST", "/api/feedback", { ...than, clientRequestId: uuid(), context: than.context ?? { path: "/" } }, `vé: ${than.title}`), 201, `vé: ${than.title}`);
  // 8) Thông báo thứ hai (quan trọng, cho Bán hàng + Đối tác)
  ok(await call(TQ, "POST", "/api/thong-bao", { tieuDe: "Tạm ngưng tour du thuyền ngày mưa bão", noiDung: "Nếu có cảnh báo thời tiết, tour du thuyền sẽ tạm ngưng; vui lòng báo khách trước.", nguoiNhan: ["SALES", "PARTNER"], quanTrong: true, clientRequestId: uuid() }, "thông báo quan trọng"), 201, "thông báo quan trọng");
  void NS;
  TRANG_THAI.nhieu = { ...ketQua, donMoi: dsDon.length };
  luuTrangThai();
}

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
