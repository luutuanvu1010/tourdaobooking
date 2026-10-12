// Sổ đại lý đợt 1 (ADR-0077, ADR-0078 B1; đặc tả docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md §5–§7) trên D1 local THẬT (wrangler dev):
// mức hoa hồng (Kế toán thêm / trùng 409 / Bán hàng 403 / HDV 403) → Bán hàng lập đơn qua đại lý (dự kiến) → xác nhận chụp mức trong lô (đối chiếu SQL) → đóng mức + thêm mức riêng
// của đại lý: đơn đã xác nhận GIỮ mức đã chụp (A-3), đơn nháp mới theo mức mới → khách lẻ không người hưởng → đổi bên đặt sau xác nhận qua route thật (đại lý khác / tổ chức không được
// hưởng / để trống / về lại đại lý — câu `? IS NULL OR …` của changeBooker trên D1 thật) → ghi mức tay rồi đổi bên đặt (khoá hành vi hiện tại: mức tay bị chụp lại đè — chủ ghi nợ 2026-10-12) → ghi mức tay cho dòng thiếu mức → hai lần
// Xác nhận cùng lúc (khoá phiên bản Task 4b) và Xác nhận đua với Lưu nháp.
// Dùng accountant / admin / hr / salesA / field (không đổi tài khoản dùng chung; Nhân sự chỉ tạo hai tài khoản Đối tác dùng một lần). Hồ sơ đại lý dùng một lần (tên theo Date.now()). KHÔNG đóng dòng điều khoản gieo sẵn `prc-st-goc-all`, KHÔNG đổi
// công ty chủ (D1 dùng chung — đặc tả §13). Mức theo vai TRAVEL_AGENCY · mọi dịch vụ chỉ thêm được một lần mỗi ngày trên cùng một D1 (dòng đã đóng ở hôm nay vẫn chồng hiệu lực
// hôm nay) — run.mjs dựng D1 mới mỗi lần nên không vướng; chạy lẻ lại trên server có sẵn trong cùng ngày thì bước 2 sẽ 409.
// Lệch brief Task 13 bước 1 (ghi ở sổ thi công): route gán vai của Danh bạ là ô `admin.manage` (Kế toán 403) VÀ từ chối mọi vai nhóm bên ngoài (409 `role_via_account`), nên
// hồ sơ TỔ CHỨC không có đường thật nào để mang vai "Công ty lữ hành" — kịch bản gieo vai đó bằng SQL cho đại lý tổ chức (xem mục 1), còn đại lý cá nhân đi đường tạo tài khoản thật.
// Ca đua (mục 10) chỉ chứng minh "không ai nhận 500, đúng một bên thắng, D1 chỉ có một thế hệ bản chụp" — `wrangler dev` cục bộ thường chạy hai yêu cầu nối đuôi, nên KHÔNG chứng minh
// khoá `updated_at` của câu xác nhận (bài khung thử src/modules/orders/chup-xac-nhan.test.ts ghim khoá đó).
import assert from "node:assert/strict";
import { ACCOUNTS, FAKE_CATALOG, call, catalogService, ensureFakeCatalog, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const HR = await session(ACCOUNTS.hr);
const A = await session(ACCOUNTS.salesA);
const F = await session(ACCOUNTS.field);
const HOM_NAY = vnDate(0);
const T = Date.now();
const maLoi = (r) => r.body?.error?.code;
/** Làm tròn nửa lên của tu / mau (số nguyên không âm) — viết lại ở đây, độc lập với src/shared/hoa-hong-dong.ts. */
const lamTronNuaLen = (tu, mau) => Math.floor((2 * tu + mau) / (2 * mau));

const congTyTruoc = (await sqlRows("SELECT party_id FROM v_pty_owner_company")).map((x) => x.party_id);
assert.equal(congTyTruoc.length, 1, "D1 phải có đúng một công ty chủ");

// ---- 1) Hồ sơ đại lý. LỖ ĐÃ GHI (Task 13, 2026-10-12): KHÔNG có đường nào của Nền tảng gán vai được hưởng (nhóm "bên ngoài": Công ty lữ hành, Lễ tân khách sạn…) cho hồ sơ
// TỔ CHỨC — route vai của Danh bạ (POST /api/parties/:id/roles, ô admin.manage) trả 409 `role_via_account` cho mọi vai nhóm bên ngoài, còn tài khoản chỉ gắn hồ sơ CÁ NHÂN.
// Vì vậy: (a) đại lý TỔ CHỨC `DL` — Kế toán tạo hồ sơ qua route thật, rồi vai "Công ty lữ hành" gieo THẲNG bằng SQL trên D1 tạm (cùng cách bài khung thử ben-dat-doi-tac.test.ts),
// để thử đường tổ chức mới của resolveBooker / BOOKER_VALUE (Task 6); (b) đại lý CÁ NHÂN `DL2` và lễ tân `KS` đi đường thật: Nhân sự tạo tài khoản Đối tác theo vai.
const taoToChuc = async (ten) => {
  const r = await call(ACC, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: ten });
  assert.equal(r.status, 201, `Kế toán tạo hồ sơ tổ chức "${ten}": ${JSON.stringify(r.body)}`);
  return r.body.party;
};
const DL = await taoToChuc(`Đại lý E2E ${T}`);
assert.equal((await call(ACC, "POST", `/api/parties/${DL.id}/roles`, { roleTypeCode: "TRAVEL_AGENCY" })).status, 403, "Kế toán không giữ ô admin.manage nên không gán vai được");
const ganToChuc = await call(ADM, "POST", `/api/parties/${DL.id}/roles`, { roleTypeCode: "TRAVEL_AGENCY" });
console.log(`ℹ 1) Quản trị gán vai «Công ty lữ hành» cho hồ sơ TỔ CHỨC qua route Danh bạ: ${ganToChuc.status} ${maLoi(ganToChuc) ?? ""} «${ganToChuc.body?.error?.message ?? ""}» — không có đường thật nào cho tổ chức mang vai được hưởng`);
await sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('e2e-sdl-${T}', '${DL.id}', 'TRAVEL_AGENCY', NULL, '${HOM_NAY}', '${new Date().toISOString()}', '${new Date().toISOString()}')`);
assert.ok((await call(ACC, "GET", `/api/parties/${DL.id}`)).body.party.roleCodes.includes("TRAVEL_AGENCY"), "hồ sơ tổ chức mang vai Công ty lữ hành (gieo SQL)");
const CHU = String(T).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // tên người không chứa chữ số
const taoDoiTac = async (fullName, vai) => {
  const r = await call(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName, phone: randomPhone(), roles: [vai] });
  assert.equal(r.status, 201, `Nhân sự tạo tài khoản Đối tác vai ${vai}: ${JSON.stringify(r.body)}`);
  assert.deepEqual(r.body.staff.permissions, ["PARTNER"]);
  const p = (await call(ACC, "GET", `/api/parties/${r.body.staff.partyId}`)).body.party;
  assert.ok(p.roleCodes.includes(vai), `hồ sơ mang vai ${vai}`);
  return p;
};
const DL2 = await taoDoiTac(`Đại Lý Hai ${CHU}`, "TRAVEL_AGENCY");
const KS = await taoDoiTac(`Lễ Tân ${CHU}`, "HOTEL_RECEPTION"); // mang vai được hưởng nhưng KHÔNG có mức nào ⇒ dòng thiếu mức
const KHONG = await taoToChuc(`Tổ chức không hưởng E2E ${T}`); // không mang vai được hưởng
console.log("✓ 1) Kế toán tạo hồ sơ tổ chức (gán vai: Kế toán 403); đại lý tổ chức mang vai gieo SQL (lỗ ở dòng ℹ); Nhân sự tạo hai tài khoản Đối tác theo vai «Công ty lữ hành», «Lễ tân khách sạn»");

// ---- 2) Mức hoa hồng: Kế toán thêm 10% cho "Công ty lữ hành" · mọi dịch vụ từ hôm nay ⇒ 201 + Location; trùng ⇒ 409; Bán hàng thêm ⇒ 403; HDV đọc ⇒ 403
const thanMuc = { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: HOM_NAY };
let r = await call(ACC, "POST", "/api/pricing/hoa-hong", thanMuc);
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.headers.get("location"), "/hoa-hong");
const MUC_VAI = r.body.dong;
assert.deepEqual([MUC_VAI.doiTuong.loai, MUC_VAI.doiTuong.code, MUC_VAI.phamVi, MUC_VAI.kieu, MUC_VAI.tyLeBp, MUC_VAI.tuNgay, MUC_VAI.denNgay, MUC_VAI.conHieuLuc],
  ["VAI", "TRAVEL_AGENCY", "ALL", "RATE", 1000, HOM_NAY, null, true]);
r = await call(ACC, "POST", "/api/pricing/hoa-hong", thanMuc);
assert.equal(r.status, 409, `thêm trùng phải 409: ${JSON.stringify(r.body)}`);
assert.equal(maLoi(r), "prc_overlap");
assert.doesNotMatch(r.body.error.message, /prc_|overlap/, "câu báo không lộ mã thô");
assert.equal((await call(A, "POST", "/api/pricing/hoa-hong", { ...thanMuc, tuNgay: vnDate(30) })).status, 403, "Bán hàng không ghi được bảng mức");
assert.equal((await call(F, "GET", "/api/pricing/hoa-hong")).status, 403, "Hướng dẫn viên không xem được bảng mức");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM prc_commission_rule WHERE target_role_code = 'TRAVEL_AGENCY' AND scope = 'ALL'`))[0].n, 1, "D1 chỉ có MỘT dòng mức");
console.log("✓ 2) Kế toán thêm mức 10% «Công ty lữ hành» · mọi dịch vụ ⇒ 201 + Location /hoa-hong; trùng ⇒ 409 prc_overlap (câu tiếng Việt); Bán hàng ghi ⇒ 403; HDV đọc ⇒ 403");

// ---- Tiện ích đơn
const HAI_DONG = () => [
  catalogService({ pax: { adult: 2, child: 1 }, departDate: vnDate(10) }), // 2 × 100.000 + 1 × 50.000 = 250.000
  catalogService({ catalogCode: "ZE2", pax: { adult: 3 }, catalogPriceSeen: { ...FAKE_CATALOG.ZE2.prices }, unitPrices: { adult: 33333 }, departDate: vnDate(10) }), // 3 × 33.333 = 99.999 (lẻ)
];
const lapDon = async (extra = {}) => {
  const res = await call(A, "POST", "/api/orders", orderInput({ customerName: "Khách Đi Tour E2E", customerPhone: "0901 234 567", services: HAI_DONG(), ...extra }));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.order;
};
const xacNhan = async (id) => {
  const res = await call(A, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
  assert.equal(res.status, 200, `xác nhận: ${JSON.stringify(res.body)}`);
  return res.body.order;
};
const docDon = async (id) => (await call(A, "GET", `/api/orders/${id}`)).body.order;
const thuongMai = async (c, id) => {
  const res = await call(c, "GET", `/api/orders/${id}/thuong-mai`);
  assert.equal(res.status, 200, `phần thương mại: ${JSON.stringify(res.body)}`);
  return res.body;
};
/** Thành tiền TRƯỚC giảm giá cấp đơn của từng dòng dịch vụ, tự cộng từ DTO đơn (Σ lineTotal của dòng tiền). */
const thanhTienDong = (don) => new Map(don.services.map((s) => [s.id, s.items.reduce((t, it) => t + it.lineTotal, 0)]));
/** Bản chụp HIỆN HÀNH (chưa bị bản nào trỏ supersedes_id tới) của đơn, theo dòng dịch vụ. */
const banChup = async (orderId) => sqlRows(`SELECT t.id, t.order_service_id AS sid, t.beneficiary_party_id AS ben, t.commission_status AS st, t.missing_reason AS mr,
  t.commission_rate_bp AS bp, t.commission_rule_id AS rule, t.supply_status AS sst, t.seller_party_id AS seller, t.supply_term_id AS term, t.source, t.reason, t.supersedes_id AS sup
  FROM ord_service_terms t WHERE t.order_id = '${orderId}' AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id) ORDER BY t.order_service_id`);
const demChup = async (orderId) => (await sqlRows(`SELECT count(*) AS n FROM ord_service_terms WHERE order_id = '${orderId}'`))[0].n;
const demNhatKy = async (orderId, action) => (await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${orderId}' AND action = '${action}'`))[0].n;
/** Khẳng định từng dòng của DTO văn phòng: hoa hồng = làm tròn nửa lên (tỷ lệ × thành tiền), giá đại lý = thành tiền − hoa hồng; tổng cộng đúng. */
function khopTyLe(vp, tt, bp, nhan) {
  let tong = 0;
  for (const d of vp.dong) {
    const hh = lamTronNuaLen(bp * tt.get(d.serviceId), 10000);
    assert.equal(d.thanhTien, tt.get(d.serviceId), `${nhan}: thành tiền dòng ${d.ten}`);
    assert.equal(d.hoaHong, hh, `${nhan}: hoa hồng dòng ${d.ten} = làm tròn nửa lên ${bp / 100}% × ${d.thanhTien}`);
    assert.equal(d.giaDaiLy, d.thanhTien - hh, `${nhan}: giá đại lý dòng ${d.ten}`);
    assert.equal(d.thieu, null, `${nhan}: dòng ${d.ten} không thiếu mức`);
    tong += hh;
  }
  assert.equal(vp.tong.hoaHong, tong, `${nhan}: tổng hoa hồng`);
  assert.equal(vp.tong.thanhTien, [...tt.values()].reduce((a, b) => a + b, 0), `${nhan}: tổng thành tiền`);
  assert.equal(vp.tong.giaDaiLy, vp.tong.thanhTien - tong, `${nhan}: tổng giá đại lý`);
  return tong;
}

// ---- 3) Bán hàng lập đơn với bên đặt = đại lý ⇒ 201; phần thương mại của đơn nháp = dự kiến theo bảng hôm nay
const don1 = await lapDon({ bookerPartyId: DL.id });
assert.equal(don1.bookerPartyId, DL.id, "bên đặt là đại lý (tổ chức mang vai được hưởng)");
assert.equal(don1.customerName, "Khách Đi Tour E2E", "tên khách đi tour giữ nguyên (không bị tên đại lý đè)");
assert.equal((await docDon(don1.id)).bookerLaDoiTac, true, "cờ bookerLaDoiTac do máy chủ tính");
const tt1 = thanhTienDong(don1);
assert.deepEqual([...tt1.values()].sort((a, b) => a - b), [99999, 250000], "thành tiền hai dòng như dựng");
let tm = await thuongMai(A, don1.id);
assert.ok(tm.vanPhong, "Bán hàng nhận DTO văn phòng");
assert.equal(tm.vanPhong.duKien, true, "đơn nháp: số dự kiến");
assert.equal(tm.vanPhong.nguoiHuong?.ten, DL.displayName);
khopTyLe(tm.vanPhong, tt1, 1000, "đơn nháp dự kiến");
assert.equal(await demChup(don1.id), 0, "đơn nháp không lưu bản chụp");
console.log("✓ 3) Bán hàng lập đơn qua đại lý ⇒ 201, tên khách giữ nguyên, bookerLaDoiTac = true; đơn nháp: duKien = true, 10% dự kiến, 0 dòng bản chụp trên D1");

// ---- 4) Xác nhận ⇒ chụp mức trong cùng lô; hoa hồng = làm tròn nửa lên (1000 × thành tiền / 10000), duKien = false. Đối chiếu SQL bản chụp.
await xacNhan(don1.id);
tm = await thuongMai(A, don1.id);
assert.equal(tm.vanPhong.duKien, false, "đơn đã xác nhận: không còn dự kiến");
const hh1 = khopTyLe(tm.vanPhong, tt1, 1000, "đơn đã xác nhận");
assert.equal(hh1, 25000 + 10000, "250.000 × 10% = 25.000; 99.999 × 10% = 9.999,9 → 10.000 (nửa lên)");
let bc = await banChup(don1.id);
assert.equal(bc.length, don1.services.length, "mỗi dòng dịch vụ đúng một bản chụp hiện hành");
for (const x of bc) {
  assert.deepEqual([x.source, x.st, x.bp, x.rule, x.ben, x.sst, x.seller, x.term, x.sup], ["AUTO", "SET", 1000, MUC_VAI.id, DL.id, "SET", congTyTruoc[0], "prc-st-goc-all", null],
    `bản chụp dòng ${x.sid}`);
}
assert.equal(await demNhatKy(don1.id, "order_terms_captured"), 1, "một dòng nhật ký «chụp mức» cho cả đơn");
console.log(`✓ 4) Xác nhận ⇒ 200; hoa hồng ${hh1.toLocaleString("vi-VN")}đ (làm tròn nửa lên theo dòng), duKien = false; D1: ${bc.length} bản chụp AUTO trỏ đúng dòng mức, người hưởng = đại lý, người bán = công ty chủ (prc-st-goc-all); một dòng nhật ký`);

// ---- 5) Đóng mức (đến hôm nay) ⇒ đơn đã xác nhận GIỮ mức đã chụp. Đóng ở hôm nay vẫn còn hiệu lực hôm nay, nên thêm MỨC RIÊNG 15% cho chính đại lý (bậc 3 thắng bậc 6)
// để phép thử phân biệt được: tính lại từ bảng sẽ ra 15%, đọc bản chụp vẫn ra 10% (A-3).
r = await call(ACC, "POST", `/api/pricing/hoa-hong/${MUC_VAI.id}/dong`, { denNgay: HOM_NAY });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.dong.denNgay, HOM_NAY);
assert.equal((await call(ACC, "POST", `/api/pricing/hoa-hong/${MUC_VAI.id}/dong`, { denNgay: HOM_NAY })).status, 409, "đóng lần hai ⇒ 409");
r = await call(ACC, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "DOI_TAC", partyId: DL.id }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1500, tuNgay: HOM_NAY, ghiChu: "Mức riêng E2E" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const MUC_RIENG = r.body.dong;
tm = await thuongMai(A, don1.id);
assert.equal(khopTyLe(tm.vanPhong, tt1, 1000, "đơn đã xác nhận sau khi đổi bảng"), hh1, "A-3: đơn đã xác nhận giữ 10% đã chụp");
assert.equal(await demChup(don1.id), don1.services.length, "đổi bảng không chụp lại");
const thu = await call(ACC, "GET", `/api/pricing/thu-tra?doiTac=${DL.id}&dichVu=ZE1&ngay=${HOM_NAY}`);
assert.equal(thu.status, 200, JSON.stringify(thu.body));
assert.deepEqual([thu.body.ketQua.trangThai, thu.body.ketQua.bac, thu.body.ketQua.muc?.id, thu.body.ketQua.muc?.tyLeBp], ["SET", 3, MUC_RIENG.id, 1500], "Thử tra: mức riêng của đại lý thắng ở bậc 3");
const don2 = await lapDon({ bookerPartyId: DL.id });
tm = await thuongMai(A, don2.id);
assert.equal(tm.vanPhong.duKien, true);
khopTyLe(tm.vanPhong, thanhTienDong(don2), 1500, "đơn nháp mới sau khi đổi bảng");
console.log("✓ 5) Đóng mức đến hôm nay ⇒ 200 (lần hai 409); thêm mức riêng 15% cho đại lý; đơn đã xác nhận vẫn 10% (bản chụp, A-3); Thử tra ra bậc 3; đơn nháp mới dự kiến 15%");

// ---- 6) Đơn khách lẻ (không bên đặt) xác nhận ⇒ không người hưởng
const don3 = await lapDon();
await xacNhan(don3.id);
tm = await thuongMai(A, don3.id);
assert.equal(tm.vanPhong.nguoiHuong, null, "khách lẻ: nguoiHuong = null");
// Không người hưởng (NONE) ⇒ hoa hồng 0, giá đại lý = thành tiền, không mức, không cờ thiếu (tinhDongDoiTac: NONE → 0; chỉ MISSING mới null).
assert.ok(tm.vanPhong.dong.every((d) => d.hoaHong === 0 && d.giaDaiLy === d.thanhTien && d.muc === null && d.thieu === null), `khách lẻ: hoa hồng 0, không mức, không cờ thiếu: ${JSON.stringify(tm.vanPhong)}`);
assert.ok((await banChup(don3.id)).every((x) => x.st === "NONE" && x.ben === null), "bản chụp NONE, không người hưởng");
console.log("✓ 6) Đơn khách lẻ xác nhận ⇒ nguoiHuong = null, bản chụp NONE");

// ---- 7) Đổi bên đặt sau xác nhận qua route THẬT (nợ T6 vòng sửa 1: vế `? IS NULL OR <BOOKER_VALUE> IS NOT NULL` của changeBooker chưa từng chạy trên D1 thật)
const doiBenDat = async (don, bookerPartyId) => {
  const cur = await docDon(don.id);
  return call(A, "PUT", `/api/orders/${don.id}/booker`, { customerName: cur.customerName, customerPhone: cur.customerPhone, bookerPartyId, expectedUpdatedAt: cur.updatedAt });
};
const benDatTrenD1 = async (id) => (await sqlRows(`SELECT booker_party_id AS b FROM orders WHERE id = '${id}'`))[0].b;
{
  const cu = await banChup(don1.id);
  // (a) sang đại lý khác đang được hưởng ⇒ 200, chụp lại theo bên đặt mới + bảng hôm nay (mức theo vai 10% đóng ở hôm nay vẫn hiệu lực hôm nay)
  r = await doiBenDat(don1, DL2.id);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.order.bookerPartyId, DL2.id);
  assert.equal(await benDatTrenD1(don1.id), DL2.id, "cột booker_party_id trên D1 ĐÚNG là đại lý mới (không NULL lặng lẽ)");
  const moi = await banChup(don1.id);
  assert.equal(moi.length, don1.services.length);
  for (const x of moi) {
    assert.deepEqual([x.source, x.st, x.ben, x.rule, x.bp], ["AUTO", "SET", DL2.id, MUC_VAI.id, 1000], `bản chụp lại dòng ${x.sid}`);
    assert.equal(x.sup, cu.find((y) => y.sid === x.sid).id, "bản mới trỏ supersedes_id về bản cũ");
  }
  assert.equal(await demChup(don1.id), 2 * don1.services.length, "bản cũ còn nguyên làm lịch sử");
  assert.equal(await demNhatKy(don1.id, "order_terms_recaptured"), 1);
  assert.equal((await thuongMai(A, don1.id)).vanPhong.nguoiHuong?.ten, DL2.displayName);
  // (b) sang tổ chức KHÔNG mang vai được hưởng ⇒ 400 (resolveBooker từ chối TRƯỚC lô — vế mới của UPDATE không chạy), không đổi gì
  r = await doiBenDat(don1, KHONG.id);
  assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.equal(r.body.error.message, "Hồ sơ tổ chức này không phải đối tác được hưởng hoa hồng.");
  assert.equal(await benDatTrenD1(don1.id), DL2.id);
  assert.equal(await demChup(don1.id), 2 * don1.services.length, "400 ⇒ không bản chụp mới");
  // (c) để trống ⇒ 200, bên đặt rỗng, chụp lại NONE (vế `? IS NULL` đúng)
  r = await doiBenDat(don1, null);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.order.bookerPartyId, null);
  assert.equal(await benDatTrenD1(don1.id), null);
  assert.ok((await banChup(don1.id)).every((x) => x.st === "NONE" && x.ben === null && x.source === "AUTO"), "bỏ bên đặt ⇒ bản chụp lại NONE");
  assert.equal((await thuongMai(A, don1.id)).vanPhong.nguoiHuong, null);
  // (d) về lại đại lý đầu ⇒ chụp lại theo bảng HÔM NAY: mức riêng 15% (bậc 3), không phải 10% đã chụp lúc xác nhận
  r = await doiBenDat(don1, DL.id);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(await benDatTrenD1(don1.id), DL.id);
  assert.ok((await banChup(don1.id)).every((x) => x.st === "SET" && x.ben === DL.id && x.rule === MUC_RIENG.id && x.bp === 1500), "chụp lại theo bảng hôm nay");
  khopTyLe((await thuongMai(A, don1.id)).vanPhong, tt1, 1500, "sau khi đổi bên đặt về đại lý đầu");
  assert.equal(await demNhatKy(don1.id, "order_terms_recaptured"), 3, "ba lần đổi bên đặt thật ⇒ ba dòng nhật ký chụp lại");
}
console.log("✓ 7) Đổi bên đặt sau xác nhận qua route thật: đại lý khác ⇒ 200, cột bên đặt đúng, bản chụp mới trỏ bản cũ; tổ chức không hưởng ⇒ 400 đúng câu, không đổi gì; để trống ⇒ 200, NONE; về lại đại lý ⇒ chụp theo bảng hôm nay (15%)");

// ---- 8) Ghi mức tay rồi đổi bên đặt (Review Focus): mức tay BỊ bản chụp tự động đè (đặc tả §5: "chụp lại MỌI dòng theo bên đặt mới") — khoá bằng assert hành vi hiện tại
// (chủ quyết «Chưa đổi, ghi nợ» 2026-10-12)
{
  const don4 = await lapDon({ bookerPartyId: DL.id });
  await xacNhan(don4.id);
  const tt4 = thanhTienDong(don4);
  const sid = don4.services[0].id;
  const thanTay = { hoaHong: { kieu: "RATE", tyLeBp: 2000 }, lyDo: "Thoả thuận riêng với đại lý cho đoàn này" };
  assert.equal((await call(A, "POST", `/api/orders/${don4.id}/thuong-mai/${sid}`, thanTay)).status, 403, "Bán hàng không ghi mức tay");
  assert.equal((await call(ACC, "POST", `/api/orders/${don4.id}/thuong-mai/${sid}`, { ...thanTay, lyDo: "ngắn" })).status, 400, "lý do dưới 10 ký tự ⇒ 400");
  r = await call(ACC, "POST", `/api/orders/${don4.id}/thuong-mai/${sid}`, thanTay);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const dTay = r.body.vanPhong.dong.find((d) => d.serviceId === sid);
  assert.deepEqual([dTay.ghiTay, dTay.hoaHong], [true, lamTronNuaLen(2000 * tt4.get(sid), 10000)], "dòng ghi tay 20%");
  const sauTay = (await banChup(don4.id)).find((x) => x.sid === sid);
  assert.deepEqual([sauTay.source, sauTay.bp, sauTay.rule, sauTay.reason], ["MANUAL", 2000, null, thanTay.lyDo]);
  assert.equal(await demNhatKy(don4.id, "order_terms_manual"), 1);
  // đổi bên đặt sang đại lý khác rồi về lại: quan sát bản hiện hành của dòng đã ghi tay
  r = await doiBenDat(don4, DL2.id);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const quaDL2 = (await banChup(don4.id)).find((x) => x.sid === sid);
  r = await doiBenDat(don4, DL.id);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const veDL = (await banChup(don4.id)).find((x) => x.sid === sid);
  const conTay = (await sqlRows(`SELECT count(*) AS n FROM ord_service_terms WHERE order_service_id = '${sid}' AND source = 'MANUAL'`))[0].n;
  assert.equal(conTay, 1, "dòng ghi tay còn trong chuỗi lịch sử (chỉ-thêm)");
  assert.equal((await banChup(don4.id)).length, don4.services.length, "mỗi dòng vẫn đúng một bản hiện hành");
  const dSau = (await thuongMai(A, don4.id)).vanPhong.dong.find((d) => d.serviceId === sid);
  const ghiTayCon = dSau.ghiTay;
  console.log(`ℹ 8) ghi mức tay 20% rồi đổi bên đặt: sang đại lý thứ hai ⇒ bản hiện hành ${quaDL2.source} ${quaDL2.bp / 100}% (người hưởng ${quaDL2.ben === DL2.id ? "đại lý thứ hai" : quaDL2.ben}); về lại đại lý đầu ⇒ ${veDL.source} ${veDL.bp / 100}%, cờ «ghi tay» trên khối = ${ghiTayCon}; dòng MANUAL còn ${conTay} trong lịch sử`);
  // HÀNH VI HIỆN TẠI, chủ quyết ghi nợ 2026-10-12 («Chưa đổi, ghi nợ»): đổi bên đặt trên đơn đã xác nhận chụp lại MỌI dòng bằng mức TỰ ĐỘNG theo bên đặt mới
  // và bảng hôm nay (đặc tả §5), kể cả dòng Kế toán đã ghi tay — mức tay chỉ còn trong bản chụp cũ (lịch sử). Nếu sau này đổi cách xử lý thì sửa assert này theo quyết định mới.
  assert.deepEqual([quaDL2.source, quaDL2.st, quaDL2.ben, quaDL2.rule, quaDL2.bp, quaDL2.reason, quaDL2.sup], ["AUTO", "SET", DL2.id, MUC_VAI.id, 1000, null, sauTay.id],
    "hành vi hiện tại: sang đại lý thứ hai ⇒ bản hiện hành của dòng ghi tay là AUTO 10% theo mức vai, không lý do, trỏ supersedes_id về bản MANUAL");
  assert.deepEqual([veDL.source, veDL.st, veDL.ben, veDL.rule, veDL.bp, veDL.reason, veDL.sup], ["AUTO", "SET", DL.id, MUC_RIENG.id, 1500, null, quaDL2.id],
    "hành vi hiện tại: về lại đại lý đầu ⇒ AUTO 15% theo mức riêng hôm nay (KHÔNG trở lại mức tay 20%)");
  assert.deepEqual([dSau.ghiTay, dSau.hoaHong], [false, lamTronNuaLen(1500 * tt4.get(sid), 10000)], "hành vi hiện tại: khối «Phần đối tác» không còn cờ «ghi tay», hoa hồng theo 15%");
  const banTay = (await sqlRows(`SELECT id, commission_rate_bp AS bp, reason FROM ord_service_terms WHERE order_service_id = '${sid}' AND source = 'MANUAL'`))[0];
  assert.deepEqual([banTay.id, banTay.bp, banTay.reason], [sauTay.id, 2000, thanTay.lyDo], "hành vi hiện tại: bản MANUAL 20% (có lý do) còn nguyên trong lịch sử, chỉ không còn hiệu lực");
  console.log("✓ 8) Ghi mức tay: Bán hàng 403, lý do ngắn 400, Kế toán 200 (bản MANUAL có lý do, một dòng nhật ký); đổi bên đặt sau đó (hành vi hiện tại, chủ ghi nợ 12/10): dòng ghi tay bị chụp lại AUTO 10% rồi AUTO 15%, mất cờ «ghi tay»; bản MANUAL còn trong lịch sử; mỗi dòng một bản hiện hành");
}

// ---- 9) Dòng THIẾU MỨC (bên đặt mang vai được hưởng mà không có mức nào) ⇒ cờ thiếu; Kế toán ghi mức tay 15% ⇒ hết thiếu, cờ ghi tay
{
  const don5 = await lapDon({ bookerPartyId: KS.id });
  await xacNhan(don5.id);
  tm = await thuongMai(ACC, don5.id);
  assert.equal(tm.vanPhong.nguoiHuong?.ten, KS.displayName);
  assert.ok(tm.vanPhong.dong.every((d) => d.hoaHong === null && typeof d.thieu === "string" && d.thieu.length > 0), `mọi dòng thiếu mức: ${JSON.stringify(tm.vanPhong.dong)}`);
  assert.doesNotMatch(JSON.stringify(tm), /NO_RULE|MISSING|RATE/, "không lộ mã thô");
  assert.equal(tm.vanPhong.tong.hoaHong, null, "tổng hoa hồng chưa tính được khi còn dòng thiếu");
  const sid = don5.services[0].id;
  r = await call(ACC, "POST", `/api/orders/${don5.id}/thuong-mai/${sid}`, { hoaHong: { kieu: "RATE", tyLeBp: 1500 }, lyDo: "Kế toán ghi tay khi chưa cài mức khách sạn" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const d = r.body.vanPhong.dong.find((x) => x.serviceId === sid);
  assert.deepEqual([d.ghiTay, d.thieu, d.hoaHong], [true, null, lamTronNuaLen(1500 * thanhTienDong(don5).get(sid), 10000)]);
  assert.ok(r.body.vanPhong.dong.filter((x) => x.serviceId !== sid).every((x) => x.thieu !== null), "dòng còn lại vẫn thiếu");
}
console.log("✓ 9) Bên đặt «Lễ tân khách sạn» không có mức ⇒ mọi dòng có câu thiếu mức (không mã thô), tổng null; Kế toán ghi tay 15% một dòng ⇒ dòng đó hết thiếu, cờ ghi tay");

// ---- 10) Khoá phiên bản ở Xác nhận (Task 4b) trên D1 thật: (a) hai lần Xác nhận cùng phiên bản đơn cùng lúc; (b) Xác nhận lần nữa sau khi đã xác nhận; (c) Xác nhận đua với Lưu nháp
{
  const don6 = await lapDon({ bookerPartyId: DL.id });
  const kq = await Promise.all([1, 2].map(() => call(A, "POST", `/api/orders/${don6.id}/status`, { status: "confirmed" })));
  assert.deepEqual(kq.map((x) => x.status).sort(), [200, 409], `hai lần xác nhận cùng lúc: ${JSON.stringify(kq.map((x) => [x.status, x.body?.error]))}`);
  const thua = kq.find((x) => x.status === 409);
  assert.ok(["invalid_transition", "stale"].includes(maLoi(thua)), JSON.stringify(thua.body));
  assert.equal(await demChup(don6.id), don6.services.length, "đúng một thế hệ bản chụp (bên thua không chèn dòng nào)");
  assert.equal(await demNhatKy(don6.id, "order_terms_captured"), 1, "một dòng nhật ký chụp mức");
  assert.equal(await demNhatKy(don6.id, "confirmed"), 1, "một dòng nhật ký xác nhận");
  const lan3 = await call(A, "POST", `/api/orders/${don6.id}/status`, { status: "confirmed" });
  assert.equal(lan3.status, 409, JSON.stringify(lan3.body));
  assert.equal(await demChup(don6.id), don6.services.length);
  console.log(`ℹ 10a) bên thua của hai lần xác nhận cùng lúc: ${maLoi(thua)} «${thua.body.error.message}»`);
  console.log(`ℹ 10b) xác nhận lần nữa đơn đã xác nhận: ${maLoi(lan3)} «${lan3.body.error.message}»${/confirmed|draft/.test(lan3.body.error.message) ? " — CÂU LỘ MÃ TRẠNG THÁI THÔ (lỗi cũ của canTransition, ghi ở sổ thi công)" : ""}`);

  const ketQua = [];
  for (let i = 0; i < 3; i++) {
    const d = await lapDon({ bookerPartyId: DL.id });
    const [xn, luu] = await Promise.all([
      call(A, "POST", `/api/orders/${d.id}/status`, { status: "confirmed" }),
      call(A, "PUT", `/api/orders/${d.id}`, orderInput({ customerName: `Khách sửa giữa chừng ${i}`, customerPhone: "0901 234 567", bookerPartyId: DL.id, services: HAI_DONG(), expectedUpdatedAt: d.updatedAt })),
    ]);
    assert.ok(![xn.status, luu.status].some((s) => s >= 500), `không ai nhận 5xx: ${JSON.stringify([xn.status, xn.body, luu.status, luu.body])}`);
    const sau = await docDon(d.id);
    const chup = await banChup(d.id);
    if (sau.status === "confirmed") {
      assert.equal(xn.status, 200);
      assert.equal(chup.length, sau.services.length, "đã xác nhận ⇒ mỗi dòng HIỆN HÀNH một bản chụp");
      assert.deepEqual(new Set(chup.map((x) => x.sid)), new Set(sau.services.map((s) => s.id)), "bản chụp trỏ đúng dòng dịch vụ hiện hành");
    } else {
      assert.equal(sau.status, "draft");
      assert.equal(xn.status, 409, JSON.stringify(xn.body));
      assert.equal(await demChup(d.id), 0, "còn nháp ⇒ không bản chụp");
    }
    ketQua.push(`xác nhận ${xn.status}${xn.status === 409 ? ` ${maLoi(xn)}` : ""} / lưu nháp ${luu.status}${luu.status >= 400 ? ` ${maLoi(luu)}` : ""} ⇒ ${sau.status}`);
  }
  console.log(`ℹ 10c) Xác nhận đua Lưu nháp (3 lần): ${ketQua.join("; ")}`);
}
console.log("✓ 10) Hai lần Xác nhận cùng lúc ⇒ đúng [200, 409], một thế hệ bản chụp, một nhật ký; xác nhận lần nữa ⇒ 409; Xác nhận đua Lưu nháp: không 5xx, đơn xác nhận thì bản chụp khớp dòng hiện hành, đơn còn nháp thì 0 bản chụp");

// ---- 11) Không đóng dòng điều khoản gieo sẵn, không đổi công ty chủ (D1 dùng chung — đặc tả §13)
assert.equal((await sqlRows("SELECT valid_to_date AS d FROM prc_supply_term WHERE id = 'prc-st-goc-all'"))[0].d, null, "dòng điều khoản gieo sẵn còn mở");
assert.deepEqual((await sqlRows("SELECT party_id FROM v_pty_owner_company")).map((x) => x.party_id), congTyTruoc, "công ty chủ không đổi");
console.log("✓ 11) Dòng điều khoản gieo sẵn prc-st-goc-all còn mở; công ty chủ không đổi");
console.log("E2E OK");
