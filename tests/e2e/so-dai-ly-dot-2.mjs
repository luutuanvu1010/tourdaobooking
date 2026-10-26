// Sổ đại lý đợt 2 — thử ĐẦU–CUỐI trên D1 local THẬT (wrangler dev), Task 13 của kế hoạch docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-ke-hoach.md.
// Số tiền lấy NGUYÊN từ ADR-0079 (ví dụ C-1) và golden/so-cong-no-luot-2.json (C-1), golden/hoan-tat-cong-no.json (SV-HT-03); lời khai / «Bên kia đã nhận» theo ADR-0132.
//  1) C-1 trọn đường: đại lý A (tài khoản Đối tác, mức riêng 10%) tự lập đơn tour 5.000.000, giảm 250.000 (≤ hoa hồng 500.000 — Đối tác là người hưởng của chính đơn
//     nên Xác nhận được; giảm 500.001 ⇒ 400 nêu trần), tự thu cọc 3.000.000 (BOOKER, nợ ngay), HDV thu 1.750.000 lúc «Đã giao» ⇒ HOA_HONG 500.000 + GIAM_GIA_BEN_DAT 250.000;
//     đại lý nợ 2.750.000, HDV nợ 1.750.000; «Hoàn thành» bị giữ tới khi nộp từng đơn đủ ⇒ Tour Đảo thu về 4.500.000.
//  2) SV-HT-03 có lời khai: lễ tân (Đối tác) tự thu 200.000; HDV khai «khách trả tại quầy i-resort» 400.000 ⇒ không dòng nợ, đơn ở ô chờ của Kế toán (sổ + thẻ «Chờ đối chiếu»),
//     «Đã giao» 409 «đang đối chiếu» ⇒ Kế toán «Bên kia đã nhận» ⇒ «Đã giao» ⇒ Tour Đảo nợ i-resort 80.000, lễ tân nợ 100.000.
//  3) Đơn khách lẻ thường: bản chụp NONE, chỉ dòng giữ hộ của HDV, nộp ⇒ «Hoàn thành».
//  4) Đơn đại lý xác nhận TRƯỚC khi có mức (chưa chụp — dựng bằng SQL như đơn cũ): bị giữ «chưa chụp mức» ⇒ «Chụp bù» khi chưa cài mức 409 ⇒ Kế toán cài mức ngày xác nhận ⇒
//     «Chụp bù» 200 ⇒ «Đã giao».
//  5) Đối tác, Bán hàng, HDV mở đơn sau «Đã giao»: Đối tác không thấy tên người thu khác (HDV, quầy) / tên nhà cung cấp / giá vốn / số dư nhà cung cấp; Bán hàng và HDV không
//     thấy giá vốn / số dư nhà cung cấp (tên quầy vẫn hiện với họ — R-94, chờ chủ; biên nhận nêu tên nhà cung cấp cho mọi người — R-85, ADR-0078 điều 10).
//  6) I-1 (người kiểm Task 7): Đối tác không được hưởng và tài khoản lai Bán hàng + Đối tác sửa / xác nhận đơn mà văn phòng đã gắn đại lý KHÁC, giảm đúng bằng hoa hồng của
//     đại lý kia ⇒ 403 câu cũ, không lộ số hoa hồng, đơn không đổi.
//  7) audit-invariants --strict trên chính D1 của nhóm ⇒ thoát 0 (run.mjs chỉ tự chạy khi chạy ĐỦ bộ).
// D1 dùng chung với so-dai-ly, nhap-tay-va-gia-doi-tac, loai-doi-tac, muc-ta… (run.mjs xếp theo nhóm): KHÔNG thêm mức theo VAI, KHÔNG thêm điều khoản người bán phạm vi ALL hay cho
// ZE1/ZE2, KHÔNG thêm loại đối tác, KHÔNG đếm toàn cục. Mọi hồ sơ / tài khoản dùng một lần (tên theo Date.now()); mức riêng (DOI_TAC) chỉ gắn hồ sơ của kịch bản này (mức riêng
// 10% mà nhap-tay 4b để lại trên hồ sơ P của nó không chạm tới đây); mã dịch vụ riêng ZSD2T, ZSD2I; mọi lời khai đều được xác nhận (không để khoản chờ cho kịch bản khác).
// Vai «Nhà cung cấp» cho hồ sơ tổ chức: thử route Danh bạ của Quản trị trước, chỉ gieo SQL khi route từ chối (in dòng ℹ) — như so-dai-ly gieo vai cho đại lý tổ chức.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, login, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const SUPER = await session(ACCOUNTS.superAdmin);
const A = await session(ACCOUNTS.salesA);
const F = await session(ACCOUNTS.field);
const HOM_NAY = vnDate(0);
const T = Date.now();
const CHU = String(T).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // tên người không chứa chữ số
const maLoi = (r) => r.body?.error?.code;
const me = async (c) => (await call(c, "GET", "/api/auth/me")).body.staff;
const HDV = await me(F);
assert.ok(HDV.partyId, "HDV có hồ sơ");
const congTy = (await sqlRows("SELECT party_id FROM v_pty_owner_company")).map((x) => x.party_id);
assert.equal(congTy.length, 1, "D1 phải có đúng một công ty chủ");
const CT = congTy[0];

// ---- Danh mục riêng (UPSERT — đồng bộ Sheet đặt in_sheet = 0 cho mã không có trên Sheet)
const AT0 = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZSD2T','Tour đảo đợt hai','perPax',5000000,NULL,NULL,NULL,NULL,NULL,NULL,96,1,${AT0},${AT0}),
  ('ZSD2I','Vé tắm bùn đợt hai','perPax',300000,NULL,NULL,NULL,NULL,NULL,NULL,97,1,${AT0},${AT0})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, unit = excluded.unit, price_adult = excluded.price_adult, price_child = excluded.price_child, in_sheet = 1`);
const dv = (code, nguoiLon, extra = {}) => ({ kind: "catalog", catalogCode: code, pax: { adult: nguoiLon }, catalogPriceSeen: { adult: code === "ZSD2T" ? 5000000 : 300000 }, departDate: HOM_NAY, pickupChoice: "KHONG_DON", ...extra });

// ---- Tiện ích
/** Tài khoản Đối tác theo vai (Toàn quyền tạo — ADR-0071), đăng nhập thật. Trả { cookie, partyId, ten }. */
async function taoDoiTac(fullName, vai) {
  const phone = randomPhone();
  const r = await call(SUPER, "POST", "/api/staff", { taoHoSoMoi: true, fullName, phone, roles: [vai] });
  assert.equal(r.status, 201, `tạo tài khoản Đối tác vai ${vai}: ${JSON.stringify(r.body)}`);
  assert.deepEqual(r.body.staff.permissions, ["PARTNER"]);
  const lg = await login(phone, r.body.pin);
  assert.equal(lg.status, 200, `đăng nhập Đối tác: ${JSON.stringify(lg.body)}`);
  return { cookie: lg.cookie, partyId: r.body.staff.partyId, ten: fullName };
}
const mucRieng = async (partyId, than) => {
  const r = await call(ACC, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "DOI_TAC", partyId }, ...than });
  assert.equal(r.status, 201, `mức riêng: ${JSON.stringify(r.body)}`);
  return r.body.dong;
};
const lapDon = async (who, body) => {
  const r = await call(who, "POST", "/api/orders", body);
  assert.equal(r.status, 201, `lập đơn: ${JSON.stringify(r.body)}`);
  return r.body.order;
};
const xacNhan = (who, id) => call(who, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
const ganHdv = async (orderId) => {
  const r = await call(ADM, "PUT", `/api/orders/${orderId}/handler`, { staffId: HDV.id });
  assert.equal(r.status, 200, `Quản trị gắn HDV: ${JSON.stringify(r.body)}`);
};
const thu = (who, id, soTien, nguoiThu, them = {}) => call(who, "POST", `/api/orders/${id}/payments`, { soTien, hinhThuc: "CASH", nguoiThu, ...them });
const giao = (who, id, body = {}) => call(who, "POST", `/api/orders/${id}/delivered`, body);
const tien = async (who, id) => {
  const r = await call(who, "GET", `/api/orders/${id}/payments`);
  assert.equal(r.status, 200, `GET payments: ${JSON.stringify(r.body)}`);
  return r.body;
};
const nop = (partyId, orderId, soTien) => call(ACC, "POST", "/api/ledger/settlements", { chieu: "nop", partyId, phanBo: [{ orderId, soTien }] });
/** Dòng sổ của đơn (SQL), theo thứ tự ghi. */
const dongSo = async (orderId) => sqlRows(`SELECT l.kind_code AS loai, l.debtor_party_id AS no, l.creditor_party_id AS co, l.amount AS so, l.receipt_id AS lt, p.kind_code AS phieu
  FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE l.order_id = '${orderId}' ORDER BY l.rowid`);
/** Số dư của `partyId` trên đơn (dương = nợ Tour Đảo, âm = Tour Đảo nợ) — tự cộng từ dòng sổ, độc lập với src/modules/billing/rules.ts. */
const soDu = async (orderId, partyId) => (await sqlRows(`SELECT COALESCE(SUM(CASE WHEN debtor_party_id = '${partyId}' THEN amount ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN creditor_party_id = '${partyId}' THEN amount ELSE 0 END), 0) AS n FROM bil_debt_line WHERE order_id = '${orderId}'`))[0].n;
const lanThuCuoi = async (orderId) => (await sqlRows(`SELECT id, collector_role_code AS vai, collector_party_id AS nguoi, collected_for_party_id AS cho FROM bil_payment_receipt
  WHERE order_id = '${orderId}' AND reverses_id IS NULL ORDER BY rowid DESC LIMIT 1`))[0];
const dau = async (receiptId) => (await sqlRows(`SELECT kind_code AS k FROM bil_receipt_recon WHERE receipt_id = '${receiptId}' ORDER BY rowid`)).map((x) => x.k);
const banChup = async (orderId) => sqlRows(`SELECT t.order_service_id AS sid, t.commission_status AS st, t.missing_reason AS mr, t.commission_rate_bp AS bp, t.commission_per_pax AS pp,
  t.beneficiary_party_id AS ben, t.supply_status AS sst, t.seller_party_id AS seller, t.source FROM ord_service_terms t
  WHERE t.order_id = '${orderId}' AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)`);
const demNhatKy = async (orderId, action) => (await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${orderId}' AND action = '${action}'`))[0].n;
const tron = (dsDong) => dsDong.map((d) => `${d.loai}:${d.no === CT ? "cty" : d.no}→${d.co === CT ? "cty" : d.co}:${d.so}`).sort();

// ---- Hồ sơ dùng một lần
const DLA = await taoDoiTac(`Đại Lý Đợt Hai ${CHU}`, "TRAVEL_AGENCY");
const MUC_DLA = await mucRieng(DLA.partyId, { phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: HOM_NAY, ghiChu: "Mức riêng e2e đợt 2" });
const HUONG = await taoDoiTac(`Lễ Tân Hương ${CHU}`, "HOTEL_RECEPTION");
await mucRieng(HUONG.partyId, { phamVi: "SERVICE", catalogCode: "ZSD2I", kieu: "PER_PAX", moiKhach: 50000, tuNgay: HOM_NAY });
const tenNcc = `Quầy Tắm Bùn ${CHU}`;
const taoNcc = await call(ACC, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: tenNcc });
assert.equal(taoNcc.status, 201, JSON.stringify(taoNcc.body));
const NCC = taoNcc.body.party.id;
const vaiNcc = await call(ADM, "POST", `/api/parties/${NCC}/roles`, { roleTypeCode: "SUPPLIER" });
if (vaiNcc.status !== 201) {
  console.log(`ℹ Quản trị gán vai «Nhà cung cấp» qua route Danh bạ: ${vaiNcc.status} ${maLoi(vaiNcc) ?? ""} «${vaiNcc.body?.error?.message ?? ""}» — gieo vai bằng SQL trên D1 tạm`);
  const at = new Date().toISOString();
  await sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('e2e-sd2-ncc-${T}', '${NCC}', 'SUPPLIER', NULL, '2026-01-01', '${at}', '${at}')`);
}
const dk = await call(ACC, "POST", "/api/pricing/cung-ung", { phamVi: "SERVICE", catalogCode: "ZSD2I", nguoiBanPartyId: NCC, tyLeMuaBp: 8000, tuNgay: HOM_NAY });
assert.equal(dk.status, 201, `điều khoản người bán i-resort: ${JSON.stringify(dk.body)}`);
console.log(`✓ 0) Hồ sơ dùng một lần: đại lý A (Đối tác, mức riêng 10% mọi dịch vụ), lễ tân Hương (Đối tác, 50.000/khách cho ZSD2I), nhà cung cấp «${tenNcc}» bán ZSD2I, mua lại 80% (vai: ${vaiNcc.status === 201 ? "route Danh bạ" : "gieo SQL"})`);

// =====================================================================================================================================================
// 1) C-1 trọn đường tới «Hoàn thành» bằng nộp từng đơn
// =====================================================================================================================================================
let don1;
{
  const than = (giam) => orderInput({ customerName: `Khách Đoàn C Một ${CHU}`, customerPhone: "0901 234 567", services: [dv("ZSD2T", 1)], discount: giam });
  let r = await call(DLA.cookie, "POST", "/api/orders", than(500001));
  assert.equal(r.status, 400, `C-5 (trần): giảm 500.001 ⇒ 400: ${JSON.stringify(r.body)}`);
  assert.equal(maLoi(r), "discount_exceeds_commission");
  assert.equal(r.body.error.message, "Giảm tối đa 500.000 ₫ (bằng hoa hồng của đơn).");
  don1 = await lapDon(DLA.cookie, than(250000));
  assert.deepEqual([don1.bookerPartyId, don1.subtotal, don1.discount, don1.total], [DLA.partyId, 5000000, 250000, 4750000], "đơn của đại lý: bên đặt = chính đại lý, khách trả 4.750.000");
  r = await xacNhan(DLA.cookie, don1.id);
  assert.equal(r.status, 200, `Đối tác là người hưởng của chính đơn, giảm 250.000 ≤ hoa hồng 500.000 ⇒ Xác nhận được: ${JSON.stringify(r.body)}`);
  const bc = await banChup(don1.id);
  assert.deepEqual(bc.map((x) => [x.st, x.bp, x.ben, x.sst, x.seller]), [["SET", 1000, DLA.partyId, "SET", CT]], "bản chụp: mức riêng 10%, người bán Tour Đảo");
  await ganHdv(don1.id);

  // Đại lý tự ghi «tôi» 3.000.000 ⇒ BOOKER, nợ ngay trên chính đại lý, không dấu chờ (ADR-0132 điều 3)
  r = await thu(DLA.cookie, don1.id, 3000000, "toi");
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const rDl = await lanThuCuoi(don1.id);
  assert.deepEqual([rDl.vai, rDl.nguoi, rDl.cho], ["BOOKER", DLA.partyId, CT], "người thu = bên đặt (đại lý), thu cho Tour Đảo");
  assert.deepEqual(await dau(rDl.id), [], "đại lý tự ghi: không dấu chờ");
  assert.deepEqual(tron(await dongSo(don1.id)), [`HELD:${DLA.partyId}→cty:3000000`], "giữ hộ trên đại lý ngay");

  // «Hoàn thành» chưa được trước «Đã giao»; HDV bấm «Đã giao» kèm lần thu 1.750.000
  assert.equal((await call(ACC, "POST", `/api/orders/${don1.id}/completed`)).status, 409, "chưa Đã giao ⇒ không Hoàn thành");
  r = await giao(F, don1.id, { lanThu: { soTien: 1750000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(r.status, 200, `Đã giao: ${JSON.stringify(r.body)}`);
  const phieu = await sqlRows(`SELECT due_snapshot AS due, gross_snapshot AS gross FROM bil_posting WHERE order_id = '${don1.id}' AND kind_code = 'DELIVERED'`);
  assert.deepEqual(phieu.map((x) => [x.gross, x.due]), [[5000000, 4750000]], "phiếu Đã giao chụp thành tiền trước giảm 5.000.000, phải thu 4.750.000");
  assert.deepEqual(tron(await dongSo(don1.id)), [
    `GIAM_GIA_BEN_DAT:${DLA.partyId}→cty:250000`, `HELD:${DLA.partyId}→cty:3000000`, `HELD:${HDV.partyId}→cty:1750000`, `HOA_HONG:cty→${DLA.partyId}:500000`,
  ].sort(), "C-1: HOA_HONG 500.000 (trên giá TRƯỚC giảm) + GIAM_GIA_BEN_DAT 250.000 + hai dòng giữ hộ");
  assert.deepEqual([await soDu(don1.id, DLA.partyId), await soDu(don1.id, HDV.partyId)], [2750000, 1750000], "C-1: đại lý nợ 2.750.000; HDV nợ 1.750.000");
  const dangGiu = new Map((await tien(ACC, don1.id)).keToan.dangGiu.map((x) => [x.partyId, x.soTien]));
  assert.deepEqual([dangGiu.get(DLA.partyId), dangGiu.get(HDV.partyId)], [2750000, 1750000], "màn đơn của Kế toán cùng số với sổ");

  // Nộp từng đơn: HDV trước ⇒ còn đại lý giữ ⇒ 409; đại lý nộp 2.750.000 ⇒ Hoàn thành
  r = await nop(HDV.partyId, don1.id, 1750000);
  assert.ok([200, 201].includes(r.status), `HDV nộp: ${JSON.stringify(r.body)}`);
  r = await call(ACC, "POST", `/api/orders/${don1.id}/completed`);
  assert.equal(r.status, 409, `còn đại lý giữ tiền ⇒ chưa Hoàn thành: ${JSON.stringify(r.body)}`);
  assert.equal(maLoi(r), "not_completable");
  assert.equal((await nop(DLA.partyId, don1.id, 2750001)).status, 409, "nộp quá số đang giữ ⇒ 409");
  r = await nop(DLA.partyId, don1.id, 2750000);
  assert.ok([200, 201].includes(r.status), `đại lý nộp: ${JSON.stringify(r.body)}`);
  assert.deepEqual([await soDu(don1.id, DLA.partyId), await soDu(don1.id, HDV.partyId)], [0, 0], "nộp đủ ⇒ số dư 0");
  const thuVe = (await sqlRows(`SELECT COALESCE(SUM(amount), 0) AS n FROM bil_debt_line WHERE order_id = '${don1.id}' AND kind_code = 'SETTLEMENT'`))[0].n;
  assert.equal(thuVe, 4500000, "C-1: Tour Đảo thu về 4.500.000");
  r = await call(ACC, "POST", `/api/orders/${don1.id}/completed`);
  assert.equal(r.status, 200, `Hoàn thành: ${JSON.stringify(r.body)}`);
  assert.ok((await tien(ACC, don1.id)).completedAt, "mốc Hoàn thành");
  assert.equal(await demNhatKy(don1.id, "order_completed"), 1);
  console.log("✓ 1) C-1: Đối tác giảm 500.001 ⇒ 400 «Giảm tối đa 500.000 ₫…»; giảm 250.000 ⇒ lập + Xác nhận được (người hưởng của chính đơn); đại lý tự thu 3.000.000 (BOOKER, nợ ngay, không dấu); HDV thu 1.750.000 lúc Đã giao ⇒ HOA_HONG 500.000 + GIAM_GIA_BEN_DAT 250.000; đại lý nợ 2.750.000, HDV 1.750.000; nộp từng đơn (quá số 409) ⇒ thu về 4.500.000 ⇒ Hoàn thành");
}

// =====================================================================================================================================================
// 2) SV-HT-03 có lời khai: HDV khai «khách trả tại quầy» ⇒ ô chờ Kế toán ⇒ «đang đối chiếu» ⇒ «Bên kia đã nhận» ⇒ «Đã giao» ⇒ Tour Đảo nợ i-resort 80.000
// =====================================================================================================================================================
let don2;
{
  don2 = await lapDon(HUONG.cookie, orderInput({ customerName: `Khách Tắm Bùn ${CHU}`, customerPhone: "0901 234 567", services: [dv("ZSD2I", 2)] }));
  assert.deepEqual([don2.bookerPartyId, don2.total], [HUONG.partyId, 600000]);
  let r = await xacNhan(HUONG.cookie, don2.id);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const bc = await banChup(don2.id);
  assert.deepEqual(bc.map((x) => [x.st, x.pp, x.ben, x.sst, x.seller]), [["SET", 50000, HUONG.partyId, "SET", NCC]], "bản chụp: 50.000/khách cho lễ tân, người bán = i-resort");
  await ganHdv(don2.id);

  r = await thu(HUONG.cookie, don2.id, 200000, "toi");
  assert.equal(r.status, 201, `lễ tân thu trước 200.000: ${JSON.stringify(r.body)}`);
  const rHuong = await lanThuCuoi(don2.id);
  assert.equal(rHuong.vai, "BOOKER");
  const giuTruoc = (await tien(F, don2.id)).banDangGiu;
  r = await thu(F, don2.id, 400000, { nhaCungCapPartyId: NCC });
  assert.equal(r.status, 201, `HDV khai «khách trả tại quầy»: ${JSON.stringify(r.body)}`);
  const rq = await lanThuCuoi(don2.id);
  assert.deepEqual([rq.vai, rq.nguoi, rq.cho], ["SUPPLIER", NCC, NCC], "người thu = quầy nhà cung cấp, thu cho chính nhà cung cấp");
  assert.deepEqual(await dau(rq.id), ["DECLARED"], "lời khai có dấu DECLARED");
  assert.deepEqual(tron(await dongSo(don2.id)), [`HELD:${HUONG.partyId}→cty:200000`], "lời khai KHÔNG sinh dòng giữ hộ cho ai (ADR-0132 điều 1)");
  const tHdv = await tien(F, don2.id);
  assert.equal(tHdv.banDangGiu, giuTruoc, "HDV không cầm đồng nào");
  assert.equal(tHdv.lyDoChuaGiao?.ma, "reconciling", `giữ «đang đối chiếu»: ${JSON.stringify(tHdv.lyDoChuaGiao)}`);
  // Ô chờ của Kế toán: sổ (GET /api/ledger) và thẻ «Chờ đối chiếu» của Trang chủ (GET /api/ledger/coc), màn đơn (choBenKia)
  const so = (await call(ACC, "GET", "/api/ledger")).body.choXacNhan.filter((x) => x.orderId === don2.id);
  assert.deepEqual(so.map((x) => [x.receiptId, x.loai, x.benKia, x.soTien]), [[rq.id, "nha_cung_cap", tenNcc, 400000]], "đơn ở danh sách chờ của Kế toán");
  const the = (await call(ACC, "GET", "/api/ledger/coc")).body.doiChieu.filter((x) => x.orderId === don2.id);
  assert.deepEqual(the.map((x) => [x.receiptId, x.loai, x.benKia]), [[rq.id, "nha_cung_cap", tenNcc]], "đơn ở thẻ «Chờ đối chiếu»");
  const tKt = await tien(ACC, don2.id);
  assert.deepEqual([tKt.keToan.choBenKia, tKt.keToan.choXacNhan], [[rq.id], []]);
  assert.match(tKt.lyDoChuaGiao?.cau ?? "", new RegExp(`khách trả tại quầy ${tenNcc}`), `câu giữ của Kế toán nêu khoản: ${tKt.lyDoChuaGiao?.cau}`);
  r = await giao(F, don2.id);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(maLoi(r), "not_deliverable");
  // Bán hàng không bấm được «Bên kia đã nhận»; Kế toán bấm ⇒ một phiếu, một dòng giữ hộ quầy → Tour Đảo mang receipt_id gốc
  assert.equal((await call(A, "POST", `/api/ledger/counterparty-receipts/${rq.id}/confirm`, {})).status, 403, "Bán hàng 403");
  r = await call(ACC, "POST", `/api/ledger/counterparty-receipts/${rq.id}/confirm`, {});
  assert.equal(r.status, 200, `Bên kia đã nhận: ${JSON.stringify(r.body)}`);
  assert.deepEqual(await dau(rq.id), ["DECLARED", "CONFIRMED"]);
  const dongXn = (await dongSo(don2.id)).filter((d) => d.phieu === "COUNTERPARTY_CONFIRMED");
  assert.deepEqual(dongXn.map((d) => [d.loai, d.no, d.co, d.so, d.lt]), [["HELD", NCC, CT, 400000, rq.id]], "một dòng giữ hộ quầy → Tour Đảo mang receipt_id gốc");
  assert.equal(await demNhatKy(don2.id, "ledger_counterparty_confirmed"), 1);
  assert.equal((await call(ACC, "GET", "/api/ledger")).body.choXacNhan.filter((x) => x.orderId === don2.id).length, 0, "rời danh sách chờ");
  assert.equal((await call(ACC, "POST", `/api/ledger/counterparty-receipts/${rq.id}/confirm`, {})).status, 409, "xác nhận lần hai ⇒ 409");
  r = await giao(F, don2.id);
  assert.equal(r.status, 200, `Đã giao sau xác nhận: ${JSON.stringify(r.body)}`);
  assert.deepEqual(tron(await dongSo(don2.id)), [
    `GIA_VON:cty→${NCC}:480000`, `HELD:${HUONG.partyId}→cty:200000`, `HELD:${NCC}→cty:400000`, `HOA_HONG:cty→${HUONG.partyId}:100000`,
  ].sort(), "SV-HT-03: HOA_HONG 50.000 × 2 = 100.000; GIA_VON 80% × 600.000 = 480.000");
  assert.deepEqual([await soDu(don2.id, HUONG.partyId), await soDu(don2.id, NCC)], [100000, -80000], "SV-HT-03: lễ tân nợ 100.000; Tour Đảo nợ i-resort 80.000");
  console.log(`✓ 2) SV-HT-03: lễ tân tự thu 200.000 (BOOKER); HDV khai «khách trả tại quầy» 400.000 ⇒ DECLARED, 0 dòng mới, HDV giữ không đổi; ở danh sách chờ + thẻ «Chờ đối chiếu» của Kế toán; Đã giao 409 «đang đối chiếu»; Bán hàng 403; Kế toán «Bên kia đã nhận» ⇒ một HELD quầy → Tour Đảo (receipt gốc), lần hai 409; Đã giao ⇒ HOA_HONG 100.000 + GIA_VON 480.000; lễ tân nợ 100.000, Tour Đảo nợ i-resort 80.000`);
}

// =====================================================================================================================================================
// 3) Đơn khách lẻ thường
// =====================================================================================================================================================
{
  const o = await lapDon(A, { ...orderInput({ customerName: `Khách Lẻ Đợt Hai ${CHU}`, services: [catalogService({ pax: { adult: 2 }, departDate: HOM_NAY })] }), handlerStaffId: HDV.id });
  assert.deepEqual([o.bookerPartyId, o.total], [null, 200000]);
  let r = await xacNhan(A, o.id);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual((await banChup(o.id)).map((x) => [x.st, x.ben, x.sst, x.seller]), [["NONE", null, "SET", CT]], "khách lẻ: bản chụp NONE, người bán Tour Đảo");
  const tm = await call(A, "GET", `/api/orders/${o.id}/thuong-mai`);
  assert.equal(tm.status, 200, JSON.stringify(tm.body));
  assert.equal(tm.body.vanPhong?.nguoiHuong, null, "không người hưởng");
  r = await giao(F, o.id, { lanThu: { soTien: 200000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(tron(await dongSo(o.id)), [`HELD:${HDV.partyId}→cty:200000`], "khách lẻ: không HOA_HONG / GIA_VON / GIAM_GIA_BEN_DAT");
  assert.equal((await call(ACC, "POST", `/api/orders/${o.id}/completed`)).status, 409, "HDV còn giữ ⇒ chưa Hoàn thành");
  r = await nop(HDV.partyId, o.id, 200000);
  assert.ok([200, 201].includes(r.status), JSON.stringify(r.body));
  assert.equal((await call(ACC, "POST", `/api/orders/${o.id}/completed`)).status, 200, "nộp đủ ⇒ Hoàn thành");
  console.log("✓ 3) Khách lẻ thường: bản chụp NONE, Đã giao chỉ một dòng giữ hộ HDV 200.000 (không dòng thương mại), Hoàn thành giữ tới khi nộp ⇒ 200");
}

// =====================================================================================================================================================
// 4) Đơn đại lý xác nhận TRƯỚC khi có mức (chưa chụp) ⇒ bị giữ ⇒ cài mức + «Chụp bù» ⇒ «Đã giao»
// =====================================================================================================================================================
{
  const NGAY_XN = vnDate(-3); // trước mọi mức theo vai mà kịch bản khác cùng D1 thêm từ hôm nay
  const taoDl = await call(ACC, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Đại lý chưa chụp E2E ${T}` });
  assert.equal(taoDl.status, 201, JSON.stringify(taoDl.body));
  const DLC = taoDl.body.party.id;
  // Vai được hưởng cho hồ sơ TỔ CHỨC chỉ gieo được bằng SQL (lỗ đã ghi ở so-dai-ly.mjs mục 1); hiệu lực từ trước ngày xác nhận.
  const at = new Date().toISOString();
  await sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('e2e-sd2-dlc-${T}', '${DLC}', 'TRAVEL_AGENCY', NULL, '2026-01-01', '${at}', '${at}')`);
  const o = await lapDon(A, { ...orderInput({ customerName: `Khách Đơn Cũ ${CHU}`, services: [catalogService({ pax: { adult: 3 }, departDate: HOM_NAY })] }), bookerPartyId: DLC, handlerStaffId: HDV.id });
  assert.equal(o.bookerPartyId, DLC);
  // Đơn CŨ: đổi sang «đã xác nhận» bằng SQL (không qua route ⇒ không bản chụp) — như đơn thật xác nhận trước khi có bảng mức (khuôn src/chup-bu.test.ts `donCu`).
  await sql(`UPDATE orders SET status = 'confirmed', confirmed_at = '${NGAY_XN}T03:00:00.000Z' WHERE id = '${o.id}'`);
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM ord_service_terms WHERE order_id = '${o.id}'`))[0].n, 0, "đơn cũ chưa có bản chụp");
  const thuTra = await call(ACC, "GET", `/api/pricing/thu-tra?doiTac=${DLC}&dichVu=ZE1&ngay=${NGAY_XN}`);
  assert.equal(thuTra.status, 200, JSON.stringify(thuTra.body));
  assert.equal(thuTra.body.ketQua.trangThai, "MISSING", `D1 chưa có mức nào cho đại lý này ở ngày xác nhận (nếu đỏ: kịch bản khác cùng nhóm đã thêm mức hiệu lực từ ${NGAY_XN}): ${JSON.stringify(thuTra.body.ketQua)}`);

  // Bị giữ: «Đã giao» 409 câu «chưa chụp mức»; khai «khách trả cho đại lý» 400 câu Chụp bù
  const tHdv = await tien(F, o.id);
  assert.deepEqual([tHdv.lyDoChuaGiao?.ma, tHdv.lyDoChuaGiao?.cau], ["terms_missing", "Đơn xác nhận trước khi có bảng mức, chưa chụp mức — Kế toán cài mức rồi bấm Chụp bù."]);
  let r = await giao(F, o.id, { lanThu: { soTien: 300000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal((await dongSo(o.id)).length, 0, "bị giữ ⇒ không dòng sổ (lần thu kèm Đã giao cũng không ghi)");
  r = await thu(F, o.id, 100000, "ben_dat");
  assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.equal(r.body.error.message, "Đơn xác nhận trước khi có bảng mức, chưa chụp mức — Kế toán bấm Chụp bù rồi mới ghi được khoản khách trả cho đại lý.");
  const cho = (await call(ACC, "GET", "/api/orders/cho-chup-bu")).body.don.filter((x) => x.orderId === o.id);
  assert.equal(cho.length, 1, "đơn nằm trong danh sách «Chụp bù mức» của Kế toán");
  assert.equal(cho[0].ngayXacNhan, NGAY_XN);

  // Chụp bù khi chưa cài mức ⇒ 409, không ghi gì; Bán hàng ⇒ 403
  assert.equal((await call(A, "POST", `/api/orders/${o.id}/chup-bu`, {})).status, 403, "Bán hàng không chụp bù");
  r = await call(ACC, "POST", `/api/orders/${o.id}/chup-bu`, {});
  assert.equal(r.status, 409, `chụp bù khi còn thiếu mức: ${JSON.stringify(r.body)}`);
  assert.equal(maLoi(r), "chup_bu_thieu_muc");
  assert.match(r.body.error.message, /Còn thiếu mức cho .* — cài mức rồi bấm lại/);
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM ord_service_terms WHERE order_id = '${o.id}'`))[0].n, 0, "409 ⇒ không bản chụp");

  // Kế toán cài mức hiệu lực từ ngày xác nhận rồi bấm lại ⇒ 200; bản chụp theo NGÀY XÁC NHẬN; rời danh sách
  await mucRieng(DLC, { phamVi: "ALL", kieu: "RATE", tyLeBp: 1200, tuNgay: NGAY_XN });
  r = await call(ACC, "POST", `/api/orders/${o.id}/chup-bu`, {});
  assert.equal(r.status, 200, `chụp bù: ${JSON.stringify(r.body)}`);
  assert.deepEqual((await banChup(o.id)).map((x) => [x.st, x.bp, x.ben, x.sst, x.seller, x.source]), [["SET", 1200, DLC, "SET", CT, "AUTO"]], "bản chụp 12% theo mức vừa cài");
  assert.equal(await demNhatKy(o.id, "ord_terms_backfilled"), 1);
  assert.equal((await call(ACC, "GET", "/api/orders/cho-chup-bu")).body.don.filter((x) => x.orderId === o.id).length, 0, "rời danh sách");
  assert.equal(maLoi(await call(ACC, "POST", `/api/orders/${o.id}/chup-bu`, {})), "da_co_ban_chup", "chụp bù lần hai ⇒ 409");
  r = await giao(F, o.id, { lanThu: { soTien: 300000, hinhThuc: "CASH", nguoiThu: "toi" } });
  assert.equal(r.status, 200, `Đã giao sau chụp bù: ${JSON.stringify(r.body)}`);
  assert.deepEqual(tron(await dongSo(o.id)), [`HELD:${HDV.partyId}→cty:300000`, `HOA_HONG:cty→${DLC}:36000`].sort(), "HOA_HONG 12% × 300.000 = 36.000");
  console.log("✓ 4) Đơn đại lý xác nhận trước khi có mức: Đã giao 409 «chưa chụp mức — Kế toán cài mức rồi bấm Chụp bù», khai «khách trả cho đại lý» 400; nằm ở danh sách Chụp bù; Bán hàng 403; Chụp bù khi chưa có mức 409 chup_bu_thieu_muc (không ghi gì); cài mức từ ngày xác nhận ⇒ Chụp bù 200 (12%, một nhật ký, rời danh sách, lần hai 409) ⇒ Đã giao, HOA_HONG 36.000");
}

// =====================================================================================================================================================
// 5) Đối tác, Bán hàng, HDV mở đơn sau «Đã giao»: không lộ tên người thu / nhà cung cấp với Đối tác; không lộ giá vốn / số dư nhà cung cấp với ai ngoài văn phòng xem điều khoản
// =====================================================================================================================================================
{
  const beMat = async (cookie, orderId) => ({
    don: await call(cookie, "GET", `/api/orders/${orderId}`),
    tien: await call(cookie, "GET", `/api/orders/${orderId}/payments`),
    bienNhan: await call(cookie, "GET", `/api/orders/${orderId}/receipt`),
    thuongMai: await call(cookie, "GET", `/api/orders/${orderId}/thuong-mai`),
    soCuaToi: await call(cookie, "GET", "/api/ledger/mine"),
    soDu: await call(cookie, "POST", "/api/ledger/balances", { orderIds: [orderId] }),
  });
  const so = (n) => new RegExp(`(?<![\\d.])(${n}|${n.toLocaleString("vi-VN").replace(/\./g, "\\.")})(?![\\d])`);
  const GIA_VON = [so(480000), so(80000), /[Gg]iá vốn/, /80(,00)?\s?%/];
  // Đối chứng dương: Kế toán (giữ supply.terms.view) thấy đủ — cùng kim phải trúng ở đó, không thì kim sai và phép thử dưới vô nghĩa.
  const kt = await beMat(ACC, don2.id);
  const ktTien = JSON.stringify(kt.tien.body);
  const tenHdv = kt.tien.body.lanThu.find((x) => x.nguoiThuPartyId === HDV.partyId)?.nguoiThu
    ?? (await tien(ACC, don1.id)).lanThu.find((x) => x.nguoiThuPartyId === HDV.partyId)?.nguoiThu;
  assert.ok(tenHdv && tenHdv.length > 2, "đọc được tên HDV từ màn của Kế toán");
  assert.ok(ktTien.includes(tenNcc), "đối chứng: Kế toán thấy tên quầy trên khoản thu");
  assert.match(JSON.stringify(kt.thuongMai.body), so(480000), "đối chứng: Kế toán thấy giá vốn 480.000 ở phần thương mại");
  assert.ok((await tien(ACC, don1.id)).lanThu.some((x) => x.nguoiThu === tenHdv), "đối chứng: tên HDV trên khoản thu của đơn C-1");

  const kiem = (ai, bm, kim, boQua = []) => {
    const lo = [];
    for (const [ten, r] of Object.entries(bm)) {
      if (boQua.includes(ten) || r.status !== 200) continue;
      const s = JSON.stringify(r.body);
      for (const k of kim) if (typeof k === "string" ? s.includes(k) : k.test(s)) lo.push(`${ten} chứa ${k}`);
    }
    assert.deepEqual(lo, [], `${ai}: lộ ${lo.join("; ")}`);
    return Object.entries(bm).map(([ten, r]) => `${ten} ${r.status}`).join(", ");
  };

  // (a) Đối tác — lễ tân trên đơn SV-HT-03 của mình, đại lý A trên đơn C-1 của mình
  for (const [ai, dt, orderId] of [["Lễ tân (Đối tác)", HUONG, don2.id], ["Đại lý A (Đối tác)", DLA, don1.id]]) {
    const bm = await beMat(dt.cookie, orderId);
    for (const ten of ["don", "tien", "bienNhan"]) assert.equal(bm[ten].status, 200, `${ai}: ${ten} 200 ${JSON.stringify(bm[ten].body)}`);
    assert.ok(bm.tien.body.lanThu.some((x) => x.nguoiThu === "Người thu tiền khác"), `${ai}: khoản thu của người khác hiện «Người thu tiền khác»`);
    assert.ok(bm.tien.body.lanThu.every((x) => x.nguoiThuPartyId === null), `${ai}: không trả mã hồ sơ người thu`);
    // Biên nhận nêu tên nhà cung cấp cho mọi người (ngoại lệ có tên R-85, ADR-0078 điều 10) ⇒ chỉ kiểm tên HDV + giá vốn ở biên nhận.
    const trang = kiem(ai, bm, [tenHdv, tenNcc, ...GIA_VON], ["bienNhan"]);
    kiem(`${ai} — biên nhận`, { bienNhan: bm.bienNhan }, [tenHdv, ...GIA_VON]);
    console.log(`ℹ 5a) ${ai}: ${trang}`);
  }
  // (b) Bán hàng và HDV (không giữ supply.terms.view): không giá vốn, không số dư nhà cung cấp. Tên quầy vẫn hiện với họ (R-94, chờ chủ) — chỉ ghi ra.
  for (const [ai, c] of [["Bán hàng", A], ["HDV", F]]) {
    const bm = await beMat(c, don2.id);
    for (const ten of ["don", "tien", "bienNhan"]) assert.equal(bm[ten].status, 200, `${ai}: ${ten} 200 ${JSON.stringify(bm[ten].body)}`);
    const trang = kiem(ai, bm, GIA_VON, ["soCuaToi"]); // sổ của tôi gồm cả đơn khác của cùng người ⇒ chỉ kiểm kim số trên bề mặt của riêng đơn này
    const coTen = Object.entries(bm).filter(([, r]) => r.status === 200 && JSON.stringify(r.body).includes(tenNcc)).map(([ten]) => ten);
    console.log(`ℹ 5b) ${ai}: ${trang}; tên quầy hiện ở [${coTen.join(", ")}] (R-94 / R-85, chờ chủ)`);
  }
  console.log("✓ 5) Sau Đã giao: Đối tác (lễ tân, đại lý) không thấy tên HDV / tên quầy / giá vốn / số dư i-resort trên đơn, khoản thu, phần thương mại, sổ của tôi, số dư (biên nhận: không tên HDV, không giá vốn); Bán hàng và HDV không thấy giá vốn 480.000 / số dư 80.000 — đối chứng dương: Kế toán thấy đủ");
}

// =====================================================================================================================================================
// 6) I-1 (người kiểm Task 7): Đối tác không được hưởng / tài khoản lai Bán hàng + Đối tác trên đơn mà văn phòng gắn đại lý KHÁC ⇒ 403 câu cũ, không lộ số
// =====================================================================================================================================================
{
  const CAU_DOI_TAC = "Tài khoản đối tác không giảm giá được trên đơn này: chỉ đơn mà chính bạn được hưởng hoa hồng mới giảm được, tối đa bằng hoa hồng đó. Muốn giảm cho khách, nhờ văn phòng.";
  const tripOf = (sv) => ({
    departDate: sv.departDate ?? "", departTime: sv.departTime ?? "", pickupTime: sv.pickupTime ?? "", pickupPlace: sv.pickupPlace ?? "",
    checkinDate: sv.checkinDate ?? "", checkinTime: sv.checkinTime ?? "", checkinPlace: sv.checkinPlace ?? "", note: sv.note ?? "",
  });
  const daLuu = (sv) => ({
    id: sv.id, kind: "catalog", catalogCode: sv.catalogCode, pax: { ...sv.pax }, ...tripOf(sv),
    unitPrices: Object.fromEntries(sv.items.map((i) => [i.paxCode, i.unitPrice])), catalogPriceSeen: Object.fromEntries(sv.items.map((i) => [i.paxCode, i.catalogPrice])),
  });
  const docDon = async (who, id) => (await call(who, "GET", `/api/orders/${id}`)).body.order;
  const put = (who, o, extra = {}) => call(who, "PUT", `/api/orders/${o.id}`, orderInput({ customerName: o.customerName, customerPhone: o.customerPhone, services: o.services.map(daLuu), expectedUpdatedAt: o.updatedAt, ...extra }));
  const DT0 = await gieoTaiKhoanLai(`Đối Tác Không Hưởng ${CHU}`, ["PARTNER"]);
  const LAI = await gieoTaiKhoanLai(`Lai Bán Đối Tác ${CHU}`, ["SALES", "PARTNER"]);
  for (const [ai, who] of [["Đối tác không được hưởng", DT0.cookie], ["Tài khoản lai Bán hàng + Đối tác", LAI.cookie]]) {
    const o = await lapDon(who, orderInput({ customerName: `Khách I Một ${CHU}`, services: [dv("ZSD2T", 1, { departDate: vnDate(7) })] }));
    assert.equal(o.bookerPartyId, null, `${ai}: hồ sơ không mang vai được hưởng ⇒ đơn không bên đặt`);
    // Gắn bên đặt = đại lý A (mức riêng 10% ⇒ hoa hồng dự kiến 500.000) bằng SQL: từ ADR-0135 Đ2 đơn NHÁP là vùng riêng của người lập nên Quản trị không còn mở /
    // sửa được nháp của người khác (404) — tình huống «văn phòng gắn đại lý khác» được dựng trực tiếp ở CSDL.
    await sql(`UPDATE orders SET booker_party_id = '${DLA.partyId}' WHERE id = '${o.id}'`);
    assert.equal((await docDon(who, o.id)).bookerPartyId, DLA.partyId, `${ai}: bên đặt đã gắn đại lý A`);
    // Lưu nháp giảm ĐÚNG bằng hoa hồng của đại lý kia ⇒ 403 câu cũ, không số, đơn không đổi
    const truoc = await docDon(who, o.id);
    let r = await put(who, truoc, { bookerPartyId: DLA.partyId, discount: 500000 });
    assert.equal(r.status, 403, `${ai}, lưu nháp giảm 500.000: ${JSON.stringify(r.body)}`);
    assert.deepEqual([maLoi(r), r.body.error.message], ["forbidden", CAU_DOI_TAC]);
    assert.doesNotMatch(JSON.stringify(r.body), /500[.,]?000/, `${ai}: câu không lộ số hoa hồng của đại lý`);
    assert.deepEqual([(await docDon(who, o.id)).discount, (await docDon(who, o.id)).updatedAt], [0, truoc.updatedAt], `${ai}: đơn không đổi`);
    // Xác nhận đơn đã có giảm giá lưu sẵn (dựng bằng SQL như nhap-tay 6b) ⇒ 403 câu cũ, đơn vẫn nháp, không bản chụp
    await sql(`UPDATE orders SET discount = 500000, total = subtotal - 500000, remaining_amount = subtotal - 500000 - deposit_amount WHERE id = '${o.id}'`);
    r = await xacNhan(who, o.id);
    assert.equal(r.status, 403, `${ai}, xác nhận: ${JSON.stringify(r.body)}`);
    assert.deepEqual([maLoi(r), r.body.error.message], ["forbidden", CAU_DOI_TAC]);
    assert.doesNotMatch(JSON.stringify(r.body), /500[.,]?000/);
    assert.equal((await docDon(who, o.id)).status, "draft", `${ai}: vẫn nháp`);
    assert.equal((await sqlRows(`SELECT count(*) AS n FROM ord_service_terms WHERE order_id = '${o.id}'`))[0].n, 0);
    // Dọn: trả giảm giá về 0 bằng SQL (đơn nháp dùng một lần, không ai khác đọc)
    await sql(`UPDATE orders SET discount = 0, total = subtotal, remaining_amount = subtotal - deposit_amount WHERE id = '${o.id}'`);
  }
  console.log("✓ 6) I-1: Đối tác không được hưởng và tài khoản lai Bán hàng + Đối tác, đơn văn phòng gắn đại lý A (hoa hồng 500.000): lưu nháp giảm 500.000 ⇒ 403 câu cũ (không số, đơn không đổi); xác nhận đơn có giảm 500.000 ⇒ 403 câu cũ, vẫn nháp");
}

// =====================================================================================================================================================
// 7) audit-invariants --strict trên D1 của nhóm (thoát 0 = sạch; 1 = vi phạm; 2 = KHÔNG chạy được — không phải sạch)
// =====================================================================================================================================================
{
  const persist = process.env.E2E_PERSIST_TO;
  assert.ok(persist, "cần E2E_PERSIST_TO (run.mjs đặt) để chạy audit-invariants trên đúng D1 của máy chủ đang thử");
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  let ma = 0;
  let out = "";
  try {
    out = (await promisify(execFile)("node", [join(ROOT, "scripts", "audit-invariants.mjs"), "--db", "local", "--persist-to", persist, "--strict"], { encoding: "utf8", maxBuffer: 1 << 24 })).stdout;
  } catch (e) {
    ma = e.code ?? -1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  const tomTat = out.trim().split("\n").filter((l) => /^[✗⚠]|BỊ VI PHẠM|Mọi bất biến đạt/.test(l)).slice(-12).join("\n");
  assert.equal(ma, 0, `audit-invariants --strict thoát ${ma}${ma === 2 ? " (KHÔNG chạy được — không phải sạch)" : ""}:\n${tomTat || out.slice(-3000)}`);
  console.log(`✓ 7) audit-invariants --strict trên D1 của nhóm: thoát 0 —\n${tomTat}`);
}
console.log("E2E OK");
