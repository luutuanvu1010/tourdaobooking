// Loại đối tác là DỮ LIỆU (ADR-0117 lần 1; migration 0095; kế hoạch docs/superpowers/plans/2026-10-14-adr-0117-lan-1-ke-hoach.md) trên D1 local THẬT (wrangler dev):
//  1) Kế toán thêm loại «Nhân viên spa …» ⇒ 201 + Location; danh sách có năm loại có sẵn (coSan) và loại mới; trùng (khác dấu / hoa thường) ⇒ 409; tên có số điện thoại ⇒ 400;
//     Bán hàng đọc được (200) nhưng không ghi (403); Hướng dẫn viên 403;
//  2) Quản trị gắn loại cho hồ sơ TỔ CHỨC ⇒ 201 (khác năm vai bên ngoài có sẵn: loại mới nhóm «khác» nên đi qua route Danh bạ); Kế toán gắn ⇒ 403 (ô admin.manage);
//     gắn cho hồ sơ NHÂN VIÊN Bán hàng ⇒ 409 role_partner_label_conflict (luật «nội bộ», câu tiếng Việt, không mã thô); không có dòng loại nào lọt vào hồ sơ đó;
//  3) Kế toán đặt mức 15% theo loại mới ⇒ 201; Bán hàng lập đơn với bên đặt là tổ chức đó, xác nhận ⇒ bản chụp SET đúng 15%, đúng người hưởng (đối chiếu SQL);
//  4) Kế toán TẮT loại ⇒ 200, hai cờ cùng tắt; gắn mới ⇒ 409 role_type_inactive; đơn đã xác nhận GIỮ bản chụp (ADR điều 7); đơn xác nhận SAU khi tắt ⇒ bản chụp MISSING, không 0;
//     /tat lần hai ⇒ 409 stale; /tat một vai có sẵn ⇒ 404; Bán hàng /tat ⇒ 403; BẬT lại ⇒ 200 và gắn mới được.
// Dùng accountant / admin / salesA / field (không đổi tài khoản dùng chung). Tên loại và hồ sơ tổ chức dùng một lần (hậu tố chữ suy từ Date.now() — tên loại không được chứa dãy ≥ 8 chữ số).
// Mức theo loại dùng mã loại sinh mới mỗi lần nên không vướng "mọi dịch vụ chỉ thêm được một lần mỗi ngày". KHÔNG đổi công ty chủ, KHÔNG đụng tài khoản của `passkey`.
import assert from "node:assert/strict";
import { ACCOUNTS, FAKE_CATALOG, call, catalogService, ensureFakeCatalog, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const A = await session(ACCOUNTS.salesA);
const F = await session(ACCOUNTS.field);
const HOM_NAY = vnDate(0);
const T = Date.now();
const CHU = String(T).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // hậu tố chỉ gồm chữ
const TEN = `Nhân viên spa ${CHU}`;
const maLoi = (r) => r.body?.error?.code;
const thongBao = (r) => r.body?.error?.message ?? "";
const lamTronNuaLen = (tu, mau) => Math.floor((2 * tu + mau) / (2 * mau));
const MA_THO = /\b(role_\w+|stale|loai_trung|invalid_input|forbidden|LD_[A-Z]{8})\b/;

const congTyTruoc = (await sqlRows("SELECT party_id FROM v_pty_owner_company")).map((x) => x.party_id);
assert.equal(congTyTruoc.length, 1, "D1 phải có đúng một công ty chủ");

// ---- 1) Thêm loại
const COSAN = ["TRAVEL_AGENCY", "HOTEL_RECEPTION"]; // hai trong năm vai bên ngoài có sẵn; danh sách phải có đủ năm, đều coSan
let r = await call(ACC, "GET", "/api/pricing/loai-doi-tac");
assert.equal(r.status, 200, JSON.stringify(r.body));
const truoc = r.body.loai;
assert.equal(truoc.filter((x) => x.coSan).length, 5, `năm loại có sẵn: ${JSON.stringify(truoc)}`);
assert.ok(truoc.every((x) => x.coSan && x.dangBat), "trước khi thêm: chỉ có năm loại có sẵn, đều đang dùng");
for (const code of COSAN) assert.ok(truoc.some((x) => x.code === code), `có loại có sẵn ${code}`);
r = await call(ACC, "POST", "/api/pricing/loai-doi-tac", { ten: TEN });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.headers.get("location"), "/hoa-hong");
const MA = r.body.loai.code;
assert.match(MA, /^LD_[A-Z]{8}$/);
assert.deepEqual(r.body.loai, { code: MA, ten: TEN, coSan: false, dangBat: true });
r = await call(ACC, "GET", "/api/pricing/loai-doi-tac");
assert.equal(r.body.loai.length, 6);
assert.deepEqual(r.body.loai.filter((x) => !x.coSan), [{ code: MA, ten: TEN, coSan: false, dangBat: true }]);
// DB: một dòng loại vai (nhóm «khác», nhãn), một dòng danh sách được hưởng, một dòng nhật ký không số / @
const dongLoai = await sqlRows(`SELECT role_group AS g, is_partner_label AS n, active AS a FROM pty_role_type WHERE code = '${MA}'`);
assert.deepEqual(dongLoai.map((x) => [x.g, x.n, x.a]), [["OTHER", 1, 1]]);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM prc_beneficiary_role WHERE role_type_code = '${MA}' AND active = 1`))[0].n, 1);
const nkThem = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'prc_partner_type_added' AND detail = '${TEN}'`);
assert.equal(nkThem.length, 1, "một dòng nhật ký thêm loại, ghi đúng tên");
// trùng / sai tên / quyền
r = await call(ACC, "POST", "/api/pricing/loai-doi-tac", { ten: TEN.toLowerCase().replace("nhân viên", "nhan vien") });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(maLoi(r), "loai_trung");
assert.doesNotMatch(thongBao(r), MA_THO, "câu báo trùng không lộ mã thô");
r = await call(ACC, "POST", "/api/pricing/loai-doi-tac", { ten: "Gọi 0901234567" });
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.doesNotMatch(thongBao(r), MA_THO);
assert.equal((await call(A, "GET", "/api/pricing/loai-doi-tac")).status, 200, "Bán hàng xem được");
assert.equal((await call(A, "POST", "/api/pricing/loai-doi-tac", { ten: `Loại Bán hàng ${CHU}` })).status, 403, "Bán hàng không thêm được");
assert.equal((await call(F, "GET", "/api/pricing/loai-doi-tac")).status, 403, "Hướng dẫn viên không xem được");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM pty_role_type WHERE is_partner_label = 1`))[0].n, 1, "D1 chỉ có MỘT loại do người dùng thêm");
console.log("✓ 1) Kế toán thêm loại ⇒ 201 + Location /hoa-hong (mã LD_ + 8 chữ do máy chủ sinh); danh sách = 5 có sẵn + 1 mới; D1: nhóm OTHER, nhãn, 1 dòng được hưởng, 1 dòng nhật ký; trùng 409 loai_trung; tên có SĐT 400; Bán hàng đọc 200 / ghi 403; HDV 403");

// ---- 2) Gắn loại cho hồ sơ
const taoToChuc = async (ten) => {
  const x = await call(ACC, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: ten });
  assert.equal(x.status, 201, `Kế toán tạo hồ sơ tổ chức "${ten}": ${JSON.stringify(x.body)}`);
  return x.body.party;
};
const SPA = await taoToChuc(`Spa Hoa Sen E2E ${CHU}`);
const SPA2 = await taoToChuc(`Spa Lá Trà E2E ${CHU}`);
assert.equal((await call(ACC, "POST", `/api/parties/${SPA.id}/roles`, { roleTypeCode: MA })).status, 403, "Kế toán không giữ ô admin.manage nên không gắn loại cho hồ sơ được");
r = await call(ADM, "POST", `/api/parties/${SPA.id}/roles`, { roleTypeCode: MA });
assert.equal(r.status, 201, `Quản trị gắn loại cho hồ sơ tổ chức: ${JSON.stringify(r.body)}`);
assert.ok(r.body.party.roleCodes.includes(MA), "hồ sơ tổ chức mang loại mới");
const idBanHang = (await sqlRows(`SELECT party_id AS id FROM staff WHERE phone = '${ACCOUNTS.salesA.phone}'`))[0].id;
const nVaiTruoc = (await sqlRows(`SELECT count(*) AS n FROM pty_party_role WHERE party_id = '${idBanHang}'`))[0].n;
r = await call(ADM, "POST", `/api/parties/${idBanHang}/roles`, { roleTypeCode: MA });
assert.equal(r.status, 409, `gắn loại đối tác cho nhân viên Bán hàng phải 409: ${JSON.stringify(r.body)}`);
assert.equal(maLoi(r), "role_partner_label_conflict");
assert.match(thongBao(r), /nội bộ/, "câu tiếng Việt nói rõ lý do");
assert.doesNotMatch(thongBao(r), MA_THO, "câu báo không lộ mã thô");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM pty_party_role WHERE party_id = '${idBanHang}'`))[0].n, nVaiTruoc, "hồ sơ nhân viên không có dòng vai mới");
console.log("✓ 2) Quản trị gắn loại cho hồ sơ tổ chức ⇒ 201 (Kế toán 403); gắn cho hồ sơ nhân viên Bán hàng ⇒ 409 role_partner_label_conflict bằng câu tiếng Việt, không có dòng vai nào lọt vào");

// ---- 3) Đặt mức 15% theo loại mới; Bán hàng lập đơn, xác nhận ⇒ bản chụp
r = await call(ACC, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: MA }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1500, tuNgay: HOM_NAY });
assert.equal(r.status, 201, JSON.stringify(r.body));
const MUC = r.body.dong;
assert.deepEqual([MUC.doiTuong.loai, MUC.doiTuong.code, MUC.doiTuong.ten ?? TEN, MUC.tyLeBp], ["VAI", MA, TEN, 1500]);
r = await call(ACC, "GET", "/api/pricing/hoa-hong");
assert.ok(r.body.vai.some((v) => v.code === MA && v.ten === TEN), "ô «Loại đối tác» của biểu mẫu mức thấy loại mới (cùng tên)");
const lapDon = async (bookerPartyId) => {
  const x = await call(A, "POST", "/api/orders", orderInput({ customerName: "Khách Đi Spa E2E", customerPhone: "0901 234 567", bookerPartyId, services: [catalogService({ pax: { adult: 2 }, departDate: vnDate(10) })] }));
  assert.equal(x.status, 201, JSON.stringify(x.body));
  return x.body.order;
};
const xacNhan = async (id) => {
  const x = await call(A, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
  assert.equal(x.status, 200, `xác nhận: ${JSON.stringify(x.body)}`);
};
const thuongMai = async (id) => {
  const x = await call(A, "GET", `/api/orders/${id}/thuong-mai`);
  assert.equal(x.status, 200, JSON.stringify(x.body));
  return x.body.vanPhong;
};
const banChup = async (orderId) => sqlRows(`SELECT t.order_service_id AS sid, t.beneficiary_party_id AS ben, t.commission_status AS st, t.missing_reason AS mr, t.commission_rate_bp AS bp, t.commission_rule_id AS rule, t.source
  FROM ord_service_terms t WHERE t.order_id = '${orderId}' AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id) ORDER BY t.order_service_id`);
const don1 = await lapDon(SPA.id);
assert.equal(don1.bookerPartyId, SPA.id);
assert.equal((await call(A, "GET", `/api/orders/${don1.id}`)).body.order.bookerLaDoiTac, true, "tổ chức mang loại mới là đối tác (cờ do máy chủ tính)");
let vp = await thuongMai(don1.id);
assert.equal(vp.duKien, true);
assert.equal(vp.nguoiHuong?.ten, SPA.displayName);
await xacNhan(don1.id);
vp = await thuongMai(don1.id);
assert.equal(vp.duKien, false);
const thanhTien = FAKE_CATALOG.ZE1.prices.adult * 2;
const hh = lamTronNuaLen(1500 * thanhTien, 10000);
assert.deepEqual([vp.tong.thanhTien, vp.tong.hoaHong, vp.tong.giaDaiLy], [thanhTien, hh, thanhTien - hh], "15% làm tròn nửa lên, giá đại lý = thành tiền − hoa hồng");
const chup1 = await banChup(don1.id);
assert.equal(chup1.length, 1);
assert.deepEqual([chup1[0].source, chup1[0].st, chup1[0].bp, chup1[0].rule, chup1[0].ben], ["AUTO", "SET", 1500, MUC.id, SPA.id]);
console.log(`✓ 3) Kế toán đặt mức 15% theo loại mới ⇒ 201; Bán hàng lập đơn bên đặt = tổ chức (bookerLaDoiTac = true), xác nhận ⇒ hoa hồng ${hh.toLocaleString("vi-VN")}đ; D1: bản chụp AUTO/SET 1500 trỏ đúng dòng mức, người hưởng = tổ chức`);

// ---- 4) Tắt loại
const don2 = await lapDon(SPA.id); // đơn NHÁP lập TRƯỚC khi tắt loại; xác nhận SAU khi tắt
r = await call(ACC, "POST", `/api/pricing/loai-doi-tac/${MA}/tat`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.loai, { code: MA, ten: TEN, coSan: false, dangBat: false });
assert.deepEqual((await sqlRows(`SELECT active AS a FROM pty_role_type WHERE code = '${MA}' UNION ALL SELECT active FROM prc_beneficiary_role WHERE role_type_code = '${MA}'`)).map((x) => x.a), [0, 0], "tắt đặt CẢ HAI cờ");
r = await call(ADM, "POST", `/api/parties/${SPA2.id}/roles`, { roleTypeCode: MA });
assert.equal(r.status, 409, `gắn loại đã tắt phải 409: ${JSON.stringify(r.body)}`);
assert.equal(maLoi(r), "role_type_inactive");
assert.doesNotMatch(thongBao(r), MA_THO, "câu báo không lộ mã thô");
assert.deepEqual(await banChup(don1.id), chup1, "đơn đã xác nhận GIỮ bản chụp sau khi tắt loại (ADR điều 7)");
vp = await thuongMai(don1.id);
assert.equal(vp.tong.hoaHong, hh, "hoa hồng của đơn đã xác nhận không đổi");
r = await call(ACC, "GET", "/api/pricing/loai-doi-tac");
assert.equal(r.body.loai.find((x) => x.code === MA).dangBat, false, "danh sách báo loại đã tắt");
// đơn mới lập sau khi tắt: bên đặt là hồ sơ mang loại đã tắt ⇒ 400 bằng câu tiếng Việt (không còn là đối tác được hưởng)
r = await call(A, "POST", "/api/orders", orderInput({ customerName: "Khách Đi Spa E2E", customerPhone: "0901 234 567", bookerPartyId: SPA.id, services: [catalogService({ pax: { adult: 2 }, departDate: vnDate(10) })] }));
assert.equal(r.status, 400, `lập đơn mới với bên đặt mang loại đã tắt: ${JSON.stringify(r.body)}`);
assert.doesNotMatch(thongBao(r), MA_THO);
// đơn nháp lập TRƯỚC khi tắt, xác nhận SAU khi tắt: bản chụp thiếu mức (có người hưởng), KHÔNG 0 lặng lẽ
await xacNhan(don2.id);
const chup2 = await banChup(don2.id);
assert.equal(chup2.length, 1);
assert.deepEqual([chup2[0].st, chup2[0].mr, chup2[0].bp, chup2[0].ben], ["MISSING", "BOOKER_NOT_BENEFICIARY", null, SPA.id], "xác nhận sau khi tắt ⇒ MISSING, không 0");
// /tat lần hai, vai có sẵn, quyền
r = await call(ACC, "POST", `/api/pricing/loai-doi-tac/${MA}/tat`, {});
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(maLoi(r), "stale");
assert.doesNotMatch(thongBao(r), MA_THO);
r = await call(ACC, "POST", "/api/pricing/loai-doi-tac/TRAVEL_AGENCY/tat", {});
assert.equal(r.status, 404, `loại có sẵn không tắt được: ${JSON.stringify(r.body)}`);
assert.equal((await sqlRows("SELECT active AS a FROM pty_role_type WHERE code = 'TRAVEL_AGENCY'"))[0].a, 1, "vai có sẵn không bị đổi");
assert.equal((await call(A, "POST", `/api/pricing/loai-doi-tac/${MA}/bat`, {})).status, 403, "Bán hàng không bật được");
// bật lại
r = await call(ACC, "POST", `/api/pricing/loai-doi-tac/${MA}/bat`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.loai, { code: MA, ten: TEN, coSan: false, dangBat: true });
assert.equal((await call(ADM, "POST", `/api/parties/${SPA2.id}/roles`, { roleTypeCode: MA })).status, 201, "bật lại ⇒ gắn mới được");
assert.equal((await call(ACC, "POST", `/api/pricing/loai-doi-tac/${MA}/bat`, {})).status, 409, "/bat lần hai ⇒ stale");
const nk = await sqlRows(`SELECT action, count(*) AS n FROM audit_log WHERE action IN ('prc_partner_type_off', 'prc_partner_type_on') GROUP BY action ORDER BY action`);
assert.deepEqual(nk.map((x) => [x.action, x.n]), [["prc_partner_type_off", 1], ["prc_partner_type_on", 1]], "mỗi lần đổi thật một dòng nhật ký; lần thua (409) không ghi");
console.log("✓ 4) Tắt loại ⇒ 200, hai cờ cùng tắt; gắn mới 409 role_type_inactive; đơn đã xác nhận giữ bản chụp 15%; đơn mới với bên đặt mang loại đã tắt ⇒ 400; đơn nháp lập trước, xác nhận sau khi tắt ⇒ MISSING / BOOKER_NOT_BENEFICIARY; /tat lần hai 409 stale; vai có sẵn 404; Bán hàng 403; bật lại ⇒ 200 và gắn mới được");

// ---- 5) Không đổi công ty chủ
assert.deepEqual((await sqlRows("SELECT party_id FROM v_pty_owner_company")).map((x) => x.party_id), congTyTruoc, "công ty chủ không đổi");
console.log("✓ 5) Công ty chủ không đổi");
console.log("E2E OK");
