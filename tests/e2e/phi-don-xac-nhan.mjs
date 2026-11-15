// Phí đưa đón LÚC XÁC NHẬN (Đợt C, Task 4; ADR-0147 Đ2–Đ3, ADR-0203 ĐB2; trang ghép 2026-10-28 §3; sổ vàng SV-PD-14, 17, 20, 21, 22) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) xác nhận THÀNH CÔNG đơn có phí (`/status`): phí tính lại theo bảng ngày xác nhận (mức đổi sau khi lưu nháp), dòng phí chụp trong CÙNG lô với câu đổi trạng thái; câu chốt
//       `ord_xac_nhan_phi_gac` bị trigger bỏ qua trên D1 thật (RAISE(IGNORE) trong `db.batch`) — đơn đã xác nhận, nhật ký `confirmed` và `order_terms_captured` vẫn ghi, bảng chốt rỗng;
//   (2) SV-PD-20/21: đổi mức SAU khi xác nhận ⇒ đơn cũ giữ nguyên dòng phí; đơn xác nhận sau đó lấy mức đang hiệu lực ngày xác nhận;
//   (3) SV-PD-17: khu vực chưa có mức ⇒ `/status` 409 `transfer_fee_missing` (câu nêu tên khu vực), đơn ở lại nháp;
//   (4) văn phòng «Gửi kiểm vé» đơn thiếu mức ⇒ 409 cùng câu, không mở yêu cầu;
//   (5) SV-PD-14: đối tác mang hai vai trò gán hai cấp, chưa có cấp riêng ⇒ 409 «Cần gán cấp riêng cho đối tác …»; Kế toán gán cấp riêng ⇒ xác nhận được, dòng phí theo mức của cấp đó;
//   (6) SV-PD-22: đổi cấp riêng sau khi xác nhận ⇒ `fee_tier_code` và tiền của đơn cũ giữ nguyên;
//   (7) Đối tác «Gửi đơn» thiếu mức ⇒ 201 nhánh A, yêu cầu mang cờ thiếu phí (lý do PHI_DON); Quản trị đặt mức; văn phòng «Còn vé» ⇒ đơn xác nhận có dòng phí.
// Ngày xét = HÔM NAY giờ Việt Nam (mọi mức quanh hôm nay). Dữ liệu dùng một lần (hậu tố theo Date.now()): hai khu vực + hai địa điểm, hai cấp, hai loại đối tác, một hồ sơ tổ chức,
// một mã danh mục ZPX1 (cờ «cần xác nhận»), một tài khoản Đối tác. Ở `finally`: TẮT phí, kết thúc mọi mức đã thêm, đưa địa điểm ra khỏi khu vực rồi ngưng khu vực (như phi-don-don.mjs).
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const SUPER = await session(ACCOUNTS.superAdmin);
await ensureFakeCatalog();

const S = String(Date.now()).slice(-6);
const CHU = S.replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // tên không được chứa dãy số dài
const ZONE = `E2E_PXN${S}`;
const ZONE2 = `E2E_PXT${S}`;
const TEN_ZONE2 = `Khu vực chưa mức ${CHU}`;
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
const HOM_NAY = vnDate(0);
const HOM_QUA = vnDate(-1);
const NGAY_MAI = vnDate(1);
const MUC = 100_000;
const MUC_DOI = 110_000;
const MUC_CAP1 = 80_000;
const MUC_CAP2 = 60_000;

const phai = (r, status, nhan) => {
  assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
};
const bang = async () => (await call(ADMIN, "GET", "/api/pricing/phi-don?ngay=0001-01-01")).body;
const datBatDau = async (ngay) => {
  const tuLuc = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.tuLuc;
  phai(await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay, tuLucDaDoc: tuLuc }), 200, `đặt ngày bắt đầu áp ${ngay}`);
};
const dongPhiDb = async (id) => sqlRows(`SELECT fee_zone_code, fee_tier_code, quantity, unit_price, line_total FROM order_item WHERE order_id = '${id}' AND line_kind = 'TRANSFER_FEE' ORDER BY sort_order`);
const tienDb = async (id) => (await sqlRows(`SELECT status, subtotal, total, remaining_amount FROM orders WHERE id = '${id}'`))[0];
const soNhatKy = async (id, action) => (await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${id}' AND action = '${action}'`))[0].n;
const xacNhan = (id) => call(SALES, "POST", `/api/orders/${id}/status`, { status: "confirmed" });

const da = { diaDiem: [], mucDaThem: [], vung: [] };
const themMuc = async (dieuKien, amount, validFrom = HOM_QUA, thayCho) => {
  const muc = phai(await call(ADMIN, "POST", "/api/pricing/phi-don", { kind: "PER_PAX", amount, validFrom, validTo: null, note: "e2e phi-don-xac-nhan", dieuKien, ...(thayCho ? { thayCho } : {}) }), 201, `mức ${JSON.stringify(dieuKien)}`).muc;
  da.mucDaThem.push(muc.id);
  return muc;
};
const taoVungVaDiem = async (code, ten, sortOrder) => {
  phai(await call(ADMIN, "POST", "/api/location-zones", { code, name: ten, sortOrder }), 201, `khu vực ${code}`);
  da.vung.push(code);
  const ks = phai(await call(ADMIN, "POST", "/api/locations", { code: `${code}_KS`, name: `Khách sạn ${ten}`, locationTypeCode: "HOTEL", address: null, sortOrder: 95 }), 201, "địa điểm").location;
  da.diaDiem.push(ks.id);
  phai(await call(ADMIN, "PUT", `/api/locations/${ks.id}`, { name: ks.name, locationTypeCode: ks.locationTypeCode, address: ks.address, sortOrder: ks.sortOrder, active: ks.active, zoneCode: code, expectedUpdatedAt: ks.updatedAt }), 200, "xếp địa điểm vào khu vực");
  return ks;
};
const DON = (ksId) => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: ksId, pickupPlace: "", dropoffLocationId: BEN, dropoffPlace: "" });
const lap = async (phien, ksId, extra = {}, ma = "ZE1") => phai(await call(phien, "POST", "/api/orders", orderInput({
  services: [catalogService({ catalogCode: ma, catalogPriceSeen: { adult: 100_000 }, pax: { adult: 2 }, legs: [DON(ksId)] })], ...extra,
})), 201, "lập đơn").order;

try {
  // ---- dựng: khu vực thử + mức chung (và mức chung cho khu vực đang bật còn thiếu — điều kiện bật phí); hai cấp + mức theo cấp; hai loại đối tác gán hai cấp; hồ sơ mang cả hai loại
  const ks = await taoVungVaDiem(ZONE, `Khu vực xác nhận ${CHU}`, 8);
  const b0 = await bang();
  assert.equal(b0.batDauAp.ngay, null, "đầu kịch bản: phí đang tắt (kịch bản trước đã dọn)");
  const coMucChung = (vung) => b0.muc.some((m) => m.dieuKien.vung === vung && m.dieuKien.cap === null && m.dieuKien.dichVu === null && m.dieuKien.nhom === null
    && m.dieuKien.chieu === null && m.dieuKien.xeRieng === false && m.tuNgay <= HOM_NAY && (m.denNgay === null || m.denNgay >= NGAY_MAI));
  let mucChung = null;
  for (const v of b0.vung.map((x) => x.code)) {
    if (v !== ZONE && coMucChung(v)) continue;
    const m = await themMuc([{ khoa: "ZONE", giaTri: v }], v === ZONE ? MUC : 20_000);
    if (v === ZONE) mucChung = m;
  }
  const CAP1 = phai(await call(ACC, "POST", "/api/pricing/muc-ta", { ten: `Cấp phí một ${CHU}` }), 201, "cấp 1").muc.code;
  const CAP2 = phai(await call(ACC, "POST", "/api/pricing/muc-ta", { ten: `Cấp phí hai ${CHU}` }), 201, "cấp 2").muc.code;
  await themMuc([{ khoa: "ZONE", giaTri: ZONE }, { khoa: "TIER", giaTri: CAP1 }], MUC_CAP1);
  await themMuc([{ khoa: "ZONE", giaTri: ZONE }, { khoa: "TIER", giaTri: CAP2 }], MUC_CAP2);
  const LOAI1 = phai(await call(ACC, "POST", "/api/pricing/loai-doi-tac", { ten: `Lễ tân phí ${CHU}` }), 201, "loại 1").loai.code;
  const LOAI2 = phai(await call(ACC, "POST", "/api/pricing/loai-doi-tac", { ten: `Hướng dẫn phí ${CHU}` }), 201, "loại 2").loai.code;
  phai(await call(ACC, "POST", "/api/pricing/muc-ta/gan", { loai: LOAI1, muc: CAP1, tuNgay: HOM_QUA }), 201, "gán loại 1 → cấp 1");
  phai(await call(ACC, "POST", "/api/pricing/muc-ta/gan", { loai: LOAI2, muc: CAP2, tuNgay: HOM_QUA }), 201, "gán loại 2 → cấp 2");
  const TEN_ORG = `Lữ hành Hai Cấp E2E ${CHU}`;
  const ORG = phai(await call(ACC, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: TEN_ORG }), 201, "hồ sơ tổ chức").party;
  for (const loai of [LOAI1, LOAI2]) phai(await call(ADMIN, "POST", `/api/parties/${ORG.id}/roles`, { roleTypeCode: loai }), 201, `gắn loại ${loai}`);
  // Mã danh mục riêng có cờ «cần xác nhận» (đi qua Gửi kiểm vé); đặt lại cờ mỗi lần chạy (idempotent).
  await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,in_sheet,first_seen_at,updated_at) VALUES ('ZPX1','Dịch vụ phí xác nhận','perPax',100000,1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z')
    ON CONFLICT(code) DO UPDATE SET in_sheet = 1, price_adult = 100000`);
  phai(await call(SUPER, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "ZPX1", canXacNhan: true }), 200, "cờ cần xác nhận ZPX1");
  await datBatDau(HOM_NAY);
  // Khu vực thứ hai tạo SAU khi bật phí (route bật phí chặn khu vực đang bật thiếu mức chung) — chưa có mức.
  const ks2 = await taoVungVaDiem(ZONE2, TEN_ZONE2, 9);

  // ---- (1) xác nhận thành công có phí; mức đổi sau khi lưu nháp ⇒ chụp mức của ngày xác nhận
  const o1 = await lap(SALES, ks.id);
  assert.deepEqual((await dongPhiDb(o1.id)).map((d) => d.line_total), [2 * MUC], "nháp: phí dự kiến theo mức cũ");
  await themMuc([{ khoa: "ZONE", giaTri: ZONE }], MUC_DOI, HOM_NAY, { id: mucChung.id, expectedUpdatedAt: mucChung.updatedAt });
  const r1 = phai(await xacNhan(o1.id), 200, "xác nhận có phí");
  assert.deepEqual(await dongPhiDb(o1.id), [{ fee_zone_code: ZONE, fee_tier_code: null, quantity: 2, unit_price: MUC_DOI, line_total: 2 * MUC_DOI }], "chụp mức của NGÀY XÁC NHẬN, không dòng dự kiến của nháp");
  assert.deepEqual(await tienDb(o1.id), { status: "confirmed", subtotal: 200_000 + 2 * MUC_DOI, total: 200_000 + 2 * MUC_DOI, remaining_amount: 200_000 + 2 * MUC_DOI });
  assert.equal(await soNhatKy(o1.id, "confirmed"), 1, "nhật ký confirmed ghi (câu chốt đứng sau chuỗi changes())");
  assert.equal(await soNhatKy(o1.id, "order_terms_captured"), 1, "nhật ký bản chụp ghi");
  assert.equal((await sqlRows("SELECT count(*) AS n FROM ord_xac_nhan_phi_gac"))[0].n, 0, "bảng chốt không giữ dòng (RAISE(IGNORE) trên D1 thật)");
  assert.equal(r1.order.phiDuaDon.duKien, false);
  console.log("✓ (1) xác nhận có phí trên D1 thật: phí tính lại theo mức ngày xác nhận, chụp trong cùng lô; câu chốt bị bỏ qua, nhật ký confirmed + bản chụp đủ");

  // ---- (2) SV-PD-20/21: đổi mức sau xác nhận ⇒ đơn cũ giữ; đơn xác nhận sau lấy mức đang hiệu lực
  const o2 = await lap(SALES, ks.id);
  const mucDoi = (await bang()).muc.find((m) => m.dieuKien.vung === ZONE && m.dieuKien.cap === null && m.denNgay === null);
  await themMuc([{ khoa: "ZONE", giaTri: ZONE }], 130_000, NGAY_MAI, { id: mucDoi.id, expectedUpdatedAt: mucDoi.updatedAt });
  assert.deepEqual((await dongPhiDb(o1.id)).map((d) => d.line_total), [2 * MUC_DOI], "SV-PD-20: đơn đã xác nhận giữ nguyên phí");
  assert.equal((await tienDb(o1.id)).total, 200_000 + 2 * MUC_DOI);
  phai(await xacNhan(o2.id), 200, "xác nhận đơn 2");
  assert.deepEqual((await dongPhiDb(o2.id)).map((d) => [d.unit_price, d.line_total]), [[MUC_DOI, 2 * MUC_DOI]], "SV-PD-21: đơn xác nhận hôm nay lấy mức hiệu lực hôm nay (mức mới từ ngày mai chưa áp)");
  console.log("✓ (2) SV-PD-20/21: đổi mức sau xác nhận không đổi đơn cũ; đơn mới theo mức của ngày xác nhận");

  // ---- (3) SV-PD-17: khu vực chưa có mức ⇒ /status 409, ở lại nháp
  const CAU_THIEU = `Quản trị cần đặt phí đưa đón cho khu vực ${TEN_ZONE2} trước khi xác nhận.`;
  const o3 = await lap(SALES, ks2.id);
  let r = await xacNhan(o3.id);
  assert.deepEqual([r.status, r.body?.error?.code, r.body?.error?.message], [409, "transfer_fee_missing", CAU_THIEU], JSON.stringify(r.body));
  assert.equal((await tienDb(o3.id)).status, "draft");
  assert.equal(await soNhatKy(o3.id, "confirmed"), 0);
  console.log("✓ (3) SV-PD-17: thiếu mức ⇒ /status 409 transfer_fee_missing, đơn ở lại nháp");

  // ---- (4) văn phòng Gửi kiểm vé thiếu mức ⇒ 409 cùng câu
  const o4 = await lap(SALES, ks2.id, {}, "ZPX1");
  r = await call(SALES, "POST", `/api/orders/${o4.id}/gui-xac-nhan`, {});
  assert.deepEqual([r.status, r.body?.error?.code, r.body?.error?.message], [409, "transfer_fee_missing", CAU_THIEU], JSON.stringify(r.body));
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = '${o4.id}'`))[0].n, 0, "không mở yêu cầu");
  console.log("✓ (4) Gửi kiểm vé (văn phòng) thiếu mức ⇒ 409 cùng câu, không mở yêu cầu");

  // ---- (5) SV-PD-14: đối tác hai cấp ⇒ 409; gán cấp riêng ⇒ xác nhận theo mức của cấp
  const o5 = await lap(SALES, ks.id, { bookerPartyId: ORG.id });
  r = await xacNhan(o5.id);
  assert.deepEqual([r.status, r.body?.error?.code, r.body?.error?.message], [409, "transfer_fee_missing", `Cần gán cấp riêng cho đối tác ${TEN_ORG} trước khi xác nhận.`], JSON.stringify(r.body));
  assert.equal((await tienDb(o5.id)).status, "draft");
  phai(await call(ACC, "POST", `/api/pricing/ho-so/${ORG.id}/muc-rieng`, { muc: CAP1, tuNgay: HOM_NAY }), 201, "Kế toán gán cấp riêng");
  phai(await xacNhan(o5.id), 200, "xác nhận sau khi có cấp riêng");
  assert.deepEqual(await dongPhiDb(o5.id), [{ fee_zone_code: ZONE, fee_tier_code: CAP1, quantity: 2, unit_price: MUC_CAP1, line_total: 2 * MUC_CAP1 }]);
  console.log("✓ (5) SV-PD-14: hai cấp ⇒ 409 «Cần gán cấp riêng…»; gán cấp riêng ⇒ xác nhận, dòng phí theo mức của cấp");

  // ---- (6) SV-PD-22: đổi cấp riêng sau xác nhận ⇒ đơn cũ giữ mã cấp và tiền
  const [rieng] = await sqlRows(`SELECT id FROM prc_party_tier WHERE party_id = '${ORG.id}' AND valid_to_date IS NULL`);
  phai(await call(ACC, "POST", `/api/pricing/muc-rieng/${rieng.id}/doi`, { muc: CAP2, tuNgay: NGAY_MAI }), 200, "đổi cấp riêng từ ngày mai");
  assert.deepEqual(await dongPhiDb(o5.id), [{ fee_zone_code: ZONE, fee_tier_code: CAP1, quantity: 2, unit_price: MUC_CAP1, line_total: 2 * MUC_CAP1 }], "fee_tier_code giữ nguyên");
  assert.equal((await tienDb(o5.id)).total, 200_000 + 2 * MUC_CAP1);
  console.log("✓ (6) SV-PD-22: đổi cấp sau xác nhận ⇒ đơn cũ giữ mã cấp và tiền");

  // ---- (7) Đối tác Gửi đơn thiếu mức ⇒ nhánh A + cờ; Quản trị đặt mức; Còn vé ⇒ xác nhận có phí
  const DT = await gieoTaiKhoanLai(`Đối tác phí xác nhận ${CHU}`, ["PARTNER"]);
  const o7 = await lap(DT.cookie, ks2.id);
  const g = phai(await call(DT.cookie, "POST", `/api/orders/${o7.id}/gui-don`, {}), 201, "gửi đơn thiếu mức");
  assert.equal(g.nhanh, "A");
  assert.ok(g.yeuCau.vi.includes("PHI_DON"), JSON.stringify(g.yeuCau));
  assert.equal((await sqlRows(`SELECT transfer_fee_missing AS f FROM ord_confirm_request WHERE order_id = '${o7.id}'`))[0].f, 1, "yêu cầu mang cờ thiếu phí");
  const xem = async () => phai(await call(ADMIN, "GET", `/api/orders/${o7.id}`), 200, "Quản trị xem đơn chờ");
  assert.ok((await xem()).xacNhan.yeuCau.vi.includes("PHI_DON"));
  await themMuc([{ khoa: "ZONE", giaTri: ZONE2 }], 50_000);
  const v = await xem();
  phai(await call(ADMIN, "POST", `/api/orders/${o7.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: v.xacNhan.yeuCau.id, updatedAt: v.order.updatedAt }), 200, "Còn vé");
  assert.deepEqual(await dongPhiDb(o7.id), [{ fee_zone_code: ZONE2, fee_tier_code: null, quantity: 2, unit_price: 50_000, line_total: 100_000 }]);
  assert.deepEqual(await tienDb(o7.id), { status: "confirmed", subtotal: 300_000, total: 300_000, remaining_amount: 300_000 });
  assert.equal(await soNhatKy(o7.id, "confirmed"), 1);
  console.log("✓ (7) Gửi đơn thiếu mức ⇒ nhánh A, cờ PHI_DON; Quản trị đặt mức; Còn vé ⇒ xác nhận có phí");
} finally {
  // Dọn theo đúng thứ tự: TẮT phí → kết thúc mọi mức đã thêm → đưa địa điểm ra khỏi khu vực → ngưng khu vực. Mỗi bước tự bắt lỗi: dọn dở cũng không che lỗi gốc.
  const thu = async (ten, f) => { try { await f(); } catch (e) { console.error(`dọn «${ten}» lỗi: ${e?.message ?? e}`); } };
  await thu("tắt ngày bắt đầu áp", async () => {
    const ap = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp;
    if (ap.ngay !== null) phai(await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: null, tuLucDaDoc: ap.tuLuc }), 200, "tắt phí");
    assert.equal((await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.ngay, null, "cuối kịch bản: ngày bắt đầu áp = tắt");
  });
  await thu("kết thúc mức", async () => {
    // Chỉ kết thúc mức của KHU VỰC THỬ (Đợt C, Task 5): mức chung đã thêm cho khu vực đang bật còn thiếu để MỞ — phí đã tắt nên không đổi tiền đơn nào; kết thúc nó (ngày cuối = ngày đầu
    // = hôm qua) làm kịch bản phí sau trên CÙNG D1 không thêm lại được mức từ hôm qua (409 prc_overlap — đã gặp khi chạy nối phi-don-don → phi-don-xac-nhan).
    const mo = (await bang()).muc.filter((m) => da.mucDaThem.includes(m.id) && m.denNgay === null && da.vung.includes(m.dieuKien.vung));
    for (const m of mo) await call(ADMIN, "POST", `/api/pricing/phi-don/${m.id}/ket-thuc`, { validTo: m.tuNgay, expectedUpdatedAt: m.updatedAt });
  });
  await thu("đưa địa điểm ra khỏi khu vực", async () => {
    const ds = (await call(ADMIN, "GET", "/api/locations")).body.locations;
    for (const id of da.diaDiem) {
      const l = ds.find((x) => x.id === id);
      if (l) await call(ADMIN, "PUT", `/api/locations/${l.id}`, { name: l.name, locationTypeCode: l.locationTypeCode, address: l.address, sortOrder: l.sortOrder, active: false, zoneCode: null, expectedUpdatedAt: l.updatedAt });
    }
  });
  await thu("ngưng khu vực thử", async () => {
    const zs = (await call(ADMIN, "GET", "/api/locations")).body.zones;
    for (const code of da.vung) {
      const z = zs.find((x) => x.code === code);
      if (z && z.active) await call(ADMIN, "PUT", `/api/location-zones/${code}`, { name: z.name, sortOrder: z.sortOrder, active: false, expectedUpdatedAt: z.updatedAt });
    }
  });
}
console.log("E2E PHI-DON-XAC-NHAN OK");
