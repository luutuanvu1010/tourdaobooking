// Nút «Sửa» mức hoa hồng (ADR-0148 Đ1, lượt 1; migration 0126; kế hoạch docs/superpowers/plans/2026-10-29-sua-muc-luot-1-ke-hoach.md, Task 6) trên D1 local THẬT (wrangler dev):
//  1) ví dụ của chủ: dòng 2027-01-01 → 2028-01-01 chưa có đơn ⇒ xem trước «huỷ–thay»; Sửa cách tính + giữ hai ngày ⇒ dòng cũ đã huỷ (D1: voided_at, voided_by, ngày giữ nguyên),
//     dòng mới mang replaces_id + change_reason; Thử tra ngày đầu khoảng ra dòng mới; nhật ký không chép lý do; sửa lại dòng đã huỷ ⇒ 400;
//  2) xác nhận đơn rồi Sửa (đường thật): đơn chụp hôm nay theo dòng mọi dịch vụ của loại ⇒ xem trước «từ ngày mai»; Sửa từ hôm nay / giữ ngày bắt đầu cũ ⇒ 400 (không huỷ được
//     dòng đã có đơn); từ ngày mai ⇒ 200, dòng cũ đóng hết hôm nay, đơn giữ nguyên bản chụp; R-PRC-7 (câu SQL của scripts/audit-checks.mjs) = 0;
//  3) thiếu lý do ⇒ 400; Bán hàng 403; tài khoản Đối tác (dùng một lần, gieo SQL) 403 ở bảng mức và ở đường Sửa — không thấy dòng nào, kể cả dòng đã huỷ;
//  4) gắn loại ↔ chính sách và chính sách riêng của một hồ sơ: Sửa huỷ–thay qua HTTP ⇒ 200, dòng cũ đã huỷ, dòng mới mang dòng cũ + lý do (D1).
// Dùng accountant / admin / salesA (không đổi tài khoản dùng chung). Loại, chính sách, hồ sơ dùng một lần (hậu tố chữ suy từ Date.now()). KHÔNG gắn mức cho vai có sẵn,
// KHÔNG đổi công ty chủ, KHÔNG đụng tài khoản của `passkey`. Chạy sau 2027 thì ví dụ chủ dời sang hôm nay + 30 → + 395 (cùng hình dạng).
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const A = await session(ACCOUNTS.salesA);
const HOM_NAY = vnDate(0);
const MAI = vnDate(1);
const CHU = String(Date.now()).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // hậu tố chỉ gồm chữ
const LY_DO = "Nhập sai giá đại lý của vé tiêu chuẩn";
const [TU_VD, DEN_VD] = HOM_NAY < "2027-01-01" ? ["2027-01-01", "2028-01-01"] : [vnDate(30), vnDate(395)];
const ngayVN = (iso) => iso.split("-").reverse().join("/");
const thongBao = (r) => r.body?.error?.message ?? "";
const phai = (r, status, nhan) => {
  assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
};
const { CHECKS } = await import("../../scripts/audit-checks.mjs");
const R_PRC_7 = CHECKS.find((c) => c.code === "R-PRC-7");
assert.ok(R_PRC_7, "scripts/audit-checks.mjs có R-PRC-7");
const demR7 = async () => Number(Object.values((await sqlRows(R_PRC_7.sql))[0])[0]);

const congTyTruoc = (await sqlRows("SELECT party_id FROM v_pty_owner_company")).map((x) => x.party_id);
assert.equal(congTyTruoc.length, 1, "D1 phải có đúng một công ty chủ");

// ---- dựng: loại mới (dùng một lần) + hồ sơ tổ chức mang loại
const themLoai = async (ten) => phai(await call(ACC, "POST", "/api/pricing/loai-doi-tac", { ten }), 201, `thêm loại ${ten}`).loai.code;
const taoToChuc = async (ten, loai) => {
  const p = phai(await call(ACC, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: ten }), 201, `Kế toán tạo hồ sơ tổ chức ${ten}`).party;
  phai(await call(ADM, "POST", `/api/parties/${p.id}/roles`, { roleTypeCode: loai }), 201, "Quản trị gắn loại cho hồ sơ");
  return p;
};
const LOAI = await themLoai(`Lễ tân sửa mức ${CHU}`);
const ORG = await taoToChuc(`Khách sạn Sửa Mức E2E ${CHU}`, LOAI);
const thuTra = async (ngay) => phai(await call(ACC, "GET", `/api/pricing/thu-tra?doiTac=${ORG.id}&dichVu=ZE1&ngay=${ngay}`), 200, "thử tra").ketQua;
const xemSua = (duong, id, c = ACC) => call(c, "GET", `/api/pricing/${duong}/${id}/sua`);
const sua = (duong, id, body, c = ACC) => call(c, "POST", `/api/pricing/${duong}/${id}/sua`, body);

// ---- 1) Ví dụ của chủ: dòng chưa có đơn ⇒ huỷ và thay
const CU = phai(await call(ACC, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: LOAI }, phamVi: "SERVICE", catalogCode: "ZE1", kieu: "RATE", tyLeBp: 1000, tuNgay: TU_VD, denNgay: DEN_VD }), 201, "dòng ví dụ chủ").dong;
assert.deepEqual(phai(await xemSua("hoa-hong", CU.id), 200, "xem trước"), { homNay: HOM_NAY, duong: "HUY_THAY" });
const S1 = phai(await sua("hoa-hong", CU.id, { kieu: "PER_PAX", moiKhach: 50_000, tuNgay: TU_VD, denNgay: DEN_VD, lyDo: LY_DO }), 200, "sửa ví dụ chủ");
assert.deepEqual([S1.duong, S1.cu.daHuy, S1.cu.conHieuLuc, S1.moi.thayCho, S1.moi.lyDoSua, S1.moi.kieu, S1.moi.moiKhach, S1.moi.tuNgay, S1.moi.denNgay],
  ["HUY_THAY", true, false, CU.id, LY_DO, "PER_PAX", 50_000, TU_VD, DEN_VD]);
const [dCu] = await sqlRows(`SELECT voided_at, voided_by, valid_from_date, valid_to_date, rate_bp FROM prc_commission_rule WHERE id = '${CU.id}'`);
assert.ok(dCu.voided_at && dCu.voided_by, `dòng cũ có dấu huỷ và người huỷ: ${JSON.stringify(dCu)}`);
assert.deepEqual([dCu.valid_from_date, dCu.valid_to_date, dCu.rate_bp], [TU_VD, DEN_VD, 1000], "dòng cũ giữ nguyên số và ngày (lịch sử)");
const [dMoi] = await sqlRows(`SELECT replaces_id, change_reason, voided_at FROM prc_commission_rule WHERE id = '${S1.moi.id}'`);
assert.deepEqual([dMoi.replaces_id, dMoi.change_reason, dMoi.voided_at], [CU.id, LY_DO, null]);
const t1 = await thuTra(TU_VD);
assert.deepEqual([t1.trangThai, t1.muc.id, t1.muc.moiKhach], ["SET", S1.moi.id, 50_000], "Thử tra ngày đầu khoảng: dòng mới, không bao giờ dòng huỷ");
assert.equal((await sqlRows("SELECT count(*) AS n FROM audit_log WHERE detail LIKE '%Nhập sai giá%'"))[0].n, 0, "nhật ký không chép lý do");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'prc_commission_rule_voided' AND detail LIKE '%${CU.id}%'`))[0].n, 1, "một dòng nhật ký huỷ");
let r = await sua("hoa-hong", CU.id, { kieu: "RATE", tyLeBp: 900, tuNgay: TU_VD, lyDo: LY_DO });
assert.deepEqual([r.status, thongBao(r)], [400, "Dòng này đã huỷ — sửa dòng thay cho nó."], "sửa lại dòng đã huỷ");
console.log("✓ 1) Ví dụ chủ (dòng 2027 → 2028 chưa có đơn): xem trước «huỷ–thay»; Sửa ⇒ dòng cũ đã huỷ (giữ ngày, có người huỷ), dòng mới mang dòng cũ + lý do; Thử tra ra dòng mới; nhật ký không chép lý do; sửa lại dòng huỷ ⇒ 400");

// ---- 2) Xác nhận đơn rồi Sửa (đường thật)
const R2 = phai(await call(ACC, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: LOAI }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1200, tuNgay: vnDate(-1) }), 201, "dòng mọi dịch vụ từ hôm qua").dong;
const don = phai(await call(A, "POST", "/api/orders", orderInput({ customerName: "Khách Sửa Mức E2E", customerPhone: "0901 234 567", bookerPartyId: ORG.id, services: [catalogService({ pax: { adult: 2 }, departDate: vnDate(10) })] })), 201, "lập đơn").order;
phai(await call(A, "POST", `/api/orders/${don.id}/status`, { status: "confirmed" }), 200, "xác nhận");
const banChup = async () => sqlRows(`SELECT t.id, t.commission_rule_id AS rule, t.commission_rate_bp AS bp, t.captured_date AS ngay, t.source FROM ord_service_terms t
  WHERE t.order_id = '${don.id}' AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id) ORDER BY t.order_service_id`);
const chup0 = await banChup();
assert.deepEqual([chup0.length, chup0[0].rule, chup0[0].bp, chup0[0].ngay, chup0[0].source], [1, R2.id, 1200, HOM_NAY, "AUTO"], "đơn chụp hôm nay theo dòng mọi dịch vụ");
assert.deepEqual(phai(await xemSua("hoa-hong", R2.id), 200, "xem trước dòng đã có đơn"), { homNay: HOM_NAY, duong: "TU_NGAY", tuNgaySomNhat: MAI, denNgayToiDa: null });
for (const tuNgay of [HOM_NAY, vnDate(-1)]) {
  r = await sua("hoa-hong", R2.id, { kieu: "RATE", tyLeBp: 1500, tuNgay, lyDo: LY_DO });
  assert.deepEqual([r.status, thongBao(r)], [400, `Đã có đơn dùng mức này — phần sửa chỉ áp được từ ngày ${ngayVN(MAI)}; đơn cũ giữ mức cũ.`], `Sửa từ ${tuNgay}`);
}
const S2 = phai(await sua("hoa-hong", R2.id, { kieu: "RATE", tyLeBp: 1500, tuNgay: MAI, lyDo: LY_DO }), 200, "sửa từ ngày mai");
assert.equal(S2.duong, "TU_NGAY");
const [cuR2] = await sqlRows(`SELECT valid_to_date, voided_at FROM prc_commission_rule WHERE id = '${R2.id}'`);
assert.deepEqual([cuR2.valid_to_date, cuR2.voided_at], [HOM_NAY, null], "dòng đã có đơn: đóng hết hôm nay, KHÔNG huỷ");
const [moiR2] = await sqlRows(`SELECT valid_from_date, replaces_id, rate_bp FROM prc_commission_rule WHERE id = '${S2.moi.id}'`);
assert.deepEqual([moiR2.valid_from_date, moiR2.replaces_id, moiR2.rate_bp], [MAI, R2.id, 1500]);
assert.deepEqual(await banChup(), chup0, "đơn giữ nguyên bản chụp (SQL trước / sau)");
assert.equal((await call(ACC, "GET", `/api/pricing/thu-tra?doiTac=${ORG.id}&dichVu=ZE2&ngay=${HOM_NAY}`)).body.ketQua.muc.id, R2.id, "hôm nay vẫn theo dòng cũ");
assert.equal((await call(ACC, "GET", `/api/pricing/thu-tra?doiTac=${ORG.id}&dichVu=ZE2&ngay=${MAI}`)).body.ketQua.muc.id, S2.moi.id, "ngày mai theo dòng sửa");
assert.equal(await demR7(), 0, "R-PRC-7: mọi bản chụp AUTO nằm trong khoảng ngày dòng mức chưa huỷ");
console.log("✓ 2) Xác nhận đơn rồi Sửa: xem trước «từ ngày mai»; Sửa từ hôm nay / giữ ngày cũ ⇒ 400; từ ngày mai ⇒ 200, dòng cũ đóng hết hôm nay (không huỷ), đơn giữ bản chụp; R-PRC-7 = 0");

// ---- 3) Lý do bắt buộc; Bán hàng và Đối tác không có đường Sửa
r = await sua("hoa-hong", S1.moi.id, { kieu: "RATE", tyLeBp: 900, tuNgay: TU_VD });
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.match(thongBao(r), /ít nhất 10 ký tự/);
assert.equal((await xemSua("hoa-hong", S1.moi.id, A)).status, 403, "Bán hàng xem trước Sửa ⇒ 403");
assert.equal((await sua("hoa-hong", S1.moi.id, { kieu: "RATE", tyLeBp: 900, tuNgay: TU_VD, lyDo: LY_DO }, A)).status, 403, "Bán hàng Sửa ⇒ 403");
const DT = await gieoTaiKhoanLai(`Đối Tác Sửa Mức ${CHU}`, ["PARTNER"]);
for (const duong of ["/api/pricing/hoa-hong", "/api/pricing/muc-ta", `/api/pricing/hoa-hong/${CU.id}/sua`, `/api/pricing/hoa-hong/${S1.moi.id}/sua`]) {
  assert.equal((await call(DT.cookie, "GET", duong)).status, 403, `Đối tác GET ${duong} ⇒ 403`);
}
assert.equal((await sua("hoa-hong", S1.moi.id, { kieu: "RATE", tyLeBp: 900, tuNgay: TU_VD, lyDo: LY_DO }, DT.cookie)).status, 403, "Đối tác Sửa ⇒ 403");
console.log("✓ 3) Thiếu lý do ⇒ 400; Bán hàng 403 (xem trước + Sửa); Đối tác 403 ở bảng mức, chính sách và đường Sửa — không thấy dòng nào, kể cả dòng đã huỷ");

// ---- 4) Gắn loại ↔ chính sách và chính sách riêng của hồ sơ: Sửa huỷ–thay
const taoChinhSach = async (ten, tyLeBp) => {
  const code = phai(await call(ACC, "POST", "/api/pricing/muc-ta", { ten }), 201, `tạo chính sách ${ten}`).muc.code;
  phai(await call(ACC, "POST", `/api/pricing/muc-ta/${code}/dong`, { phamVi: "ALL", kieu: "RATE", tyLeBp, tuNgay: vnDate(-1) }), 201, `dòng của ${ten}`);
  return code;
};
const TA1 = await taoChinhSach(`Sửa mức một ${CHU}`, 900);
const TA2 = await taoChinhSach(`Sửa mức hai ${CHU}`, 1100);
const LOAI2 = await themLoai(`Nhân viên sửa mức ${CHU}`);
const GAN = phai(await call(ACC, "POST", "/api/pricing/muc-ta/gan", { loai: LOAI2, muc: TA1, tuNgay: TU_VD }), 201, "gắn loại từ ví dụ chủ").gan;
assert.deepEqual(phai(await xemSua("muc-ta/gan", GAN.id), 200, "xem trước gắn"), { homNay: HOM_NAY, duong: "HUY_THAY" });
const S4 = phai(await sua("muc-ta/gan", GAN.id, { muc: TA2, tuNgay: TU_VD, lyDo: LY_DO }), 200, "sửa gắn loại");
assert.deepEqual([S4.duong, S4.cu.daHuy, S4.moi.muc.code, S4.moi.thayCho, S4.moi.lyDoSua], ["HUY_THAY", true, TA2, GAN.id, LY_DO]);
assert.ok((await sqlRows(`SELECT voided_at FROM prc_role_tier WHERE id = '${GAN.id}'`))[0].voided_at, "gắn cũ đã huỷ (D1)");
const ORG2 = await taoToChuc(`Lữ hành Sửa Mức E2E ${CHU}`, LOAI2);
phai(await call(ACC, "POST", `/api/pricing/ho-so/${ORG2.id}/muc-rieng`, { muc: TA1, tuNgay: TU_VD }), 201, "chính sách riêng cho hồ sơ");
const [rieng] = await sqlRows(`SELECT id FROM prc_party_tier WHERE party_id = '${ORG2.id}' AND voided_at IS NULL`);
assert.deepEqual(phai(await xemSua("muc-rieng", rieng.id), 200, "xem trước chính sách riêng"), { homNay: HOM_NAY, duong: "HUY_THAY" });
phai(await sua("muc-rieng", rieng.id, { muc: TA2, tuNgay: TU_VD, lyDo: LY_DO }), 200, "sửa chính sách riêng");
const sauRieng = await sqlRows(`SELECT id, tier_code, voided_at, replaces_id, change_reason FROM prc_party_tier WHERE party_id = '${ORG2.id}' ORDER BY created_at, rowid`);
assert.equal(sauRieng.length, 2);
assert.ok(sauRieng.find((x) => x.id === rieng.id).voided_at, "chính sách riêng cũ đã huỷ");
const moiRieng = sauRieng.find((x) => x.id !== rieng.id);
assert.deepEqual([moiRieng.tier_code, moiRieng.replaces_id, moiRieng.change_reason, moiRieng.voided_at], [TA2, rieng.id, LY_DO, null]);
console.log("✓ 4) Gắn loại ↔ chính sách và chính sách riêng của hồ sơ: Sửa huỷ–thay ⇒ 200, dòng cũ đã huỷ, dòng mới mang dòng cũ + lý do");

assert.deepEqual((await sqlRows("SELECT party_id FROM v_pty_owner_company")).map((x) => x.party_id), congTyTruoc, "công ty chủ không đổi");
console.log("✓ 5) Công ty chủ không đổi");
console.log("E2E OK");
