// Phí đưa đón, Đợt A + B (ADR-0147 Đ1–Đ2, ADR-0203 ĐB1–ĐB2; kế hoạch 2026-11-14 Task 9) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) quyền: chưa đăng nhập 401; Bán hàng 403 ở MỌI route phí đưa đón và ở route khu vực đón;
//   (2) khu vực đón: tạo, xếp một địa điểm vào, đếm số địa điểm; mã lạ khi xếp → 400;
//   (3) bảng phí: đầu vào sai 400; mức chung cho mọi khu vực đang bật; mức theo cấp; trùng cùng điều kiện cùng khoảng ngày 409;
//       cảnh báo «cấp trả cao hơn mức không cấp» ra đúng số; Thử tra ra đúng số, dòng thắng, dòng thua; thiếu mức không bao giờ là 0 đồng;
//   (4) đổi mức nguyên tử `thayCho` (đóng dòng cũ ngày liền trước, thêm dòng mới); mốc cũ → 409 `stale`;
//   (5) đặt ngày bắt đầu áp: ĐỔI CÓ CHỦ ĐÍCH 16/11 (ADR-0214 thay ADR-0203 ĐB1 — bảng không còn dùng cho đơn): khu vực đang bật thiếu mức chung vẫn đặt được (200);
//       mốc đọc cũ → 409; khi đang áp kết thúc được mức chung cuối của một khu vực (trước đây 409); ĐỔI mức chung bằng `thayCho` vẫn được;
//   (6) nhật ký: có dòng theo từng lần ghi, không lộ số điện thoại;
//   (7) từ Đợt C (Task 3, sửa có chủ đích tiêu chí cũ «chưa đơn nào bị đổi tiền»): với phí ĐANG ÁP, đơn có chặng đưa đón mang MỘT dòng phí theo mức VĂN PHÒNG CHỌN (ADR-0214, không theo bảng) (cộng vào tạm tính, không lẫn
//       vào dòng dịch vụ); đơn không chặng không có phí; dòng dịch vụ của hai đơn như nhau.
// Dữ liệu dùng một lần: khu vực đón và cấp đại lý mang hậu tố theo Date.now(); mọi ngày của bảng phí rơi vào QUÁ KHỨ xa (từ 2000, mỗi lần chạy sau lần trước ≥ 40 ngày) nên không đụng
// ngày nào của đơn thật và mức của lần chạy trước không chồng ngày với lần này. Ở `finally`: ĐẶT LẠI ngày bắt đầu áp = tắt, kết thúc mọi mức đã thêm (bảng chỉ
// thêm, không xoá), đưa địa điểm thử ra khỏi khu vực rồi ngưng khu vực thử — để kịch bản sau trên D1 chung không bị «khu vực đang bật thiếu mức chung» chặn.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant); // chỉ để tạo cấp đại lý (quyền hoa hồng)
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin); // trang Nhật ký chỉ Toàn quyền (ADR-0038)
await ensureFakeCatalog();

const S = String(Date.now()).slice(-6);
const CHU = S.replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // hậu tố chỉ gồm chữ (tên cấp)
const ZONE = `E2E_PD${S}`;
const ZONE2 = `E2E_PE${S}`;
const NGOAI = "NGOAI_VUNG";
const DV = "ZE1"; // dịch vụ danh mục giả, 100.000₫ / người lớn
const cong = (ngay, n) => new Date(Date.parse(`${ngay}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
// Mốc ngày D của lần chạy: SAU mọi ngày đã có trong bảng phí (+40 ngày) — mỗi lần chạy trên cùng D1 có khoảng ngày [D, D+20] riêng, không chồng với lần trước
// và cảnh báo «cấp trả cao hơn» (tính trên MỌI mức còn hiệu lực ngày đó) không lẫn mức của lần trước. Bảng trống thì bắt đầu từ 2000-01-01.
const cuoiBang = (await call(ADMIN, "GET", "/api/pricing/phi-don?ngay=0001-01-01")).body.muc.reduce((max, m) => [max, m.tuNgay, m.denNgay ?? m.tuNgay].reduce((a, b) => (b > a ? b : a)), "1999-11-20");
const D = cong(cuoiBang, 40);
const D10 = cong(D, 10);
const D20 = cong(D, 20);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
const KHONG_ID = "00000000-0000-0000-0000-000000000000";

const dk = (...cap) => cap.map(([khoa, giaTri]) => ({ khoa, giaTri }));
const muc = (dieuKien, amount, validFrom, extra = {}) => ({ kind: "PER_PAX", amount, validFrom, validTo: null, note: null, dieuKien, ...extra });
const tatCa = async () => (await call(ADMIN, "GET", "/api/pricing/phi-don?ngay=0001-01-01")).body;
const mucTheoId = async (id) => (await tatCa()).muc.find((m) => m.id === id);
const thuTra = (q) => call(ADMIN, "GET", `/api/pricing/phi-don/thu-tra?${new URLSearchParams(q)}`);
const them = async (nguoi, body) => {
  const r = await call(nguoi, "POST", "/api/pricing/phi-don", body);
  assert.equal(r.status, 201, `thêm mức: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
};

const da = { diaDiemId: null, mucDaThem: [], vungDaTao: [], capMa: null };
try {
  // ---- (1) quyền
  assert.equal((await call(null, "GET", "/api/pricing/phi-don")).status, 401);
  assert.equal((await call(null, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: null, tuLucDaDoc: null })).status, 401);
  for (const [m, p, b] of [
    ["GET", "/api/pricing/phi-don"],
    ["POST", "/api/pricing/phi-don", muc(dk(["ZONE", NGOAI]), 1000, D)],
    ["POST", `/api/pricing/phi-don/${KHONG_ID}/ket-thuc`, { validTo: D, expectedUpdatedAt: "x" }],
    ["POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: null, tuLucDaDoc: null }],
    ["GET", `/api/pricing/phi-don/thu-tra?vung=${NGOAI}&chieu=OUT&xeRieng=0&dichVu=${DV}&soKhach=1`],
    ["POST", "/api/location-zones", { code: ZONE, name: "Khu vực thử", sortOrder: 5 }],
  ]) assert.equal((await call(SALES, m, p, b)).status, 403, `Bán hàng ${m} ${p}`);
  assert.equal((await call(ACC, "GET", "/api/pricing/phi-don")).status, 403, "Kế toán không xem bảng phí đưa đón");
  console.log("✓ (1) quyền: 401 chưa đăng nhập, Bán hàng và Kế toán 403");

  // ---- (2) khu vực đón
  let r = await call(ADMIN, "POST", "/api/location-zones", { code: ZONE, name: `Khu vực thử ${S}`, sortOrder: 5 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  da.vungDaTao.push(ZONE);
  assert.equal(r.body.zone.soDiaDiem, 0);
  assert.equal((await call(ADMIN, "POST", "/api/location-zones", { code: ZONE, name: "Trùng mã" })).status, 409);
  r = await call(ADMIN, "POST", "/api/locations", { code: `PD_${S}`, name: `Điểm đón thử ${S}`, locationTypeCode: "HOTEL", address: null, sortOrder: 95 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const diem = r.body.location;
  da.diaDiemId = diem.id;
  const thanDiem = (l, them2 = {}) => ({ name: l.name, locationTypeCode: l.locationTypeCode, address: l.address, sortOrder: l.sortOrder, active: l.active, expectedUpdatedAt: l.updatedAt, ...them2 });
  assert.equal((await call(ADMIN, "PUT", `/api/locations/${diem.id}`, thanDiem(diem, { zoneCode: "KHONG_CO_VUNG_NAY" }))).status, 400, "mã khu vực lạ");
  r = await call(ADMIN, "PUT", `/api/locations/${diem.id}`, thanDiem(diem, { zoneCode: ZONE }));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.location.zoneCode, ZONE);
  r = await call(SALES, "GET", "/api/locations");
  assert.equal(r.body.zones.find((z) => z.code === ZONE).soDiaDiem, 1, "đếm một địa điểm trong khu vực thử");
  const ngoai = r.body.zones.find((z) => z.code === NGOAI);
  assert.ok(ngoai && ngoai.active === true, "khu vực «Ngoài khu vực» gieo sẵn, luôn bật");
  console.log("✓ (2) khu vực đón: tạo, xếp địa điểm, đếm, mã lạ 400");

  // cấp đại lý dùng một lần (Kế toán tạo, như muc-ta.mjs)
  r = await call(ACC, "POST", "/api/pricing/muc-ta", { ten: `Đại lý cấp 1 ${CHU}` });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const CAP = r.body.muc.code;
  da.capMa = CAP;

  // ---- (3) bảng phí
  r = await call(ADMIN, "GET", "/api/pricing/phi-don");
  assert.equal(r.status, 200);
  const zs = r.body.vung.map((v) => v.code);
  assert.ok(zs.includes(ZONE) && zs.includes(NGOAI), "danh sách khu vực đang bật có cả hai");
  assert.ok(r.body.cap.some((c) => c.code === CAP), "danh sách cấp có cấp vừa tạo");
  assert.ok(r.body.dichVu.some((d) => d.code === DV));
  assert.equal(r.body.muc.filter((m) => m.dieuKien.vung === ZONE).length, 0);
  for (const bad of [
    muc(dk(["ZONE", ZONE]), 1000, D, { kind: "PER_KHACH" }),
    muc(dk(["ZONE", ZONE]), -1, D),
    muc(dk(["ZONE", ZONE]), 10.5, D),
    muc(dk(["ZONE", ZONE]), 1000, "2000-13-45"),
    muc(dk(["TIER", CAP]), 1000, D), // thiếu khu vực
    muc(dk(["ZONE", "KHU_LA"]), 1000, D),
    muc(dk(["ZONE", ZONE], ["ZONE", ZONE]), 1000, D), // một khoá hai lần
    muc(dk(["ZONE", ZONE], ["SERVICE", DV], ["SERVICE_GROUP", "HTA"]), 1000, D), // vừa dịch vụ vừa nhóm
    muc(dk(["ZONE", ZONE], ["EXCLUSIVE", "1"]), 1000, D), // xe riêng mà theo khách
    muc(dk(["ZONE", ZONE]), 1000, D, { kind: "PER_TRIP" }), // theo chuyến mà không xe riêng
    muc(dk(["ZONE", ZONE], ["KHOA_LA", "x"]), 1000, D),
    muc(dk(["ZONE", ZONE], ["TIER", "CAP_KHONG_CO"]), 1000, D),
  ]) {
    r = await call(ADMIN, "POST", "/api/pricing/phi-don", bad);
    assert.equal(r.status, 400, JSON.stringify(bad));
  }
  const chungZ = (await them(ADMIN, muc(dk(["ZONE", ZONE]), 30_000, D, { note: "mức chung thử" }))).muc;
  const chungN = (await them(ADMIN, muc(dk(["ZONE", NGOAI]), 20_000, D))).muc;
  da.mucDaThem.push(chungZ.id, chungN.id);
  assert.equal(chungZ.tien, 30_000);
  assert.deepEqual(chungZ.dieuKien, { vung: ZONE, cap: null, dichVu: null, nhom: null, chieu: null, xeRieng: false });
  assert.equal((await call(ADMIN, "POST", "/api/pricing/phi-don", muc(dk(["ZONE", ZONE]), 31_000, D10))).status, 409, "cùng điều kiện, khoảng ngày chồng nhau");
  const mucCap = await them(ADMIN, muc(dk(["ZONE", ZONE], ["TIER", CAP]), 45_000, D));
  da.mucDaThem.push(mucCap.muc.id);
  // Một cảnh báo MỖI CHIỀU (đi, về): mức không nêu chiều áp cho cả hai (màn gộp khi hiển thị).
  assert.equal(mucCap.canhBao.length, 2, "cấp trả cao hơn mức không cấp ⇒ cảnh báo, mỗi chiều một mục");
  assert.deepEqual(mucCap.canhBao.map((c) => c.chieu).sort(), ["OUT", "RETURN"]);
  for (const c of mucCap.canhBao) assert.deepEqual([c.cap, c.vung, c.xeRieng, c.tienCap, c.tienKhongCap], [CAP, ZONE, false, 45_000, 30_000]);
  console.log("✓ (3a) bảng phí: đầu vào sai 400, mức chung, mức cấp, trùng 409, cảnh báo cấp trả cao hơn");

  // Thử tra — cùng hàm chọn mức và tính tiền với sổ vàng
  const base = { vung: ZONE, chieu: "OUT", xeRieng: "0", dichVu: DV, soKhach: "3", ngay: D };
  r = await thuTra(base);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.ketQua.trangThai, r.body.ketQua.mucId, r.body.ketQua.donGia, r.body.ketQua.soLuong, r.body.ketQua.tien], ["CO_MUC", chungZ.id, 30_000, 3, 90_000]);
  assert.deepEqual(r.body.thua, []);
  r = await thuTra({ ...base, cap: CAP });
  assert.deepEqual([r.body.ketQua.mucId, r.body.ketQua.donGia, r.body.ketQua.tien], [mucCap.muc.id, 45_000, 135_000], "có cấp ⇒ mức theo cấp thắng");
  assert.equal(r.body.thua.length, 1);
  assert.equal(r.body.thua[0].mucId, chungZ.id);
  assert.ok(r.body.thua[0].viSao.length > 0, "dòng thua có lý do bằng chữ");
  r = await thuTra({ ...base, soNguoiVe: "2" });
  assert.equal(r.body.ketQua.tien, 90_000, "chiều đi không dùng số người đón về");
  r = await thuTra({ ...base, chieu: "RETURN", soNguoiVe: "2" });
  assert.deepEqual([r.body.ketQua.soLuong, r.body.ketQua.tien], [2, 60_000], "chiều về: số người đón về kẹp số khách tính tiền");
  r = await thuTra({ ...base, xeRieng: "1" });
  assert.equal(r.body.ketQua.trangThai, "THIEU_MUC", "chưa có mức xe riêng ⇒ thiếu mức, KHÔNG là 0 đồng");
  assert.equal(r.body.ketQua.lyDo, "KHONG_CO_MUC");
  assert.equal(r.body.ketQua.tien, undefined);
  r = await thuTra({ ...base, ngay: cong(D, -1) });
  assert.equal(r.body.ketQua.trangThai, "THIEU_MUC", "trước ngày bắt đầu của mức ⇒ thiếu mức");
  r = await thuTra({ ...base, vung: NGOAI });
  assert.equal(r.body.ketQua.tien, 60_000, "khu vực khác: mức chung của nó");
  for (const sai of [{ chieu: "SAU" }, { xeRieng: "2" }, { soKhach: "0" }, { soKhach: "1.5" }, { soKhach: "" }, { vung: "KHU_LA" }, { dichVu: "KHONG_CO" }, { cap: "CAP_KHONG_CO" }, { ngay: "2000-02-31" }, { soNguoiVe: "0" }])
    assert.equal((await thuTra({ ...base, ...sai })).status, 400, JSON.stringify(sai));
  console.log("✓ (3b) Thử tra: đúng số, dòng thắng và dòng thua, thiếu mức không là 0 đồng, đầu vào sai 400");

  // ---- (4) đổi mức nguyên tử khi phí CHƯA áp
  const cuCap = await mucTheoId(mucCap.muc.id);
  assert.equal((await call(ADMIN, "POST", "/api/pricing/phi-don", { ...muc(dk(["ZONE", ZONE], ["TIER", CAP]), 25_000, D10), thayCho: { id: mucCap.muc.id } })).status, 400, "thiếu mốc của dòng cũ");
  assert.equal((await call(ADMIN, "POST", "/api/pricing/phi-don", { ...muc(dk(["ZONE", ZONE]), 25_000, D10), thayCho: { id: mucCap.muc.id, expectedUpdatedAt: cuCap.updatedAt } })).status, 400, "khác bộ điều kiện");
  assert.equal((await call(ADMIN, "POST", "/api/pricing/phi-don", { ...muc(dk(["ZONE", ZONE], ["TIER", CAP]), 25_000, D), thayCho: { id: mucCap.muc.id, expectedUpdatedAt: cuCap.updatedAt } })).status, 400, "ngày mới không sau ngày cũ");
  assert.equal((await call(ADMIN, "POST", "/api/pricing/phi-don", { ...muc(dk(["ZONE", ZONE], ["TIER", CAP]), 25_000, D10), thayCho: { id: KHONG_ID, expectedUpdatedAt: cuCap.updatedAt } })).status, 404);
  r = await call(ADMIN, "POST", "/api/pricing/phi-don", { ...muc(dk(["ZONE", ZONE], ["TIER", CAP]), 25_000, D10), thayCho: { id: mucCap.muc.id, expectedUpdatedAt: cuCap.updatedAt } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const moiCap = r.body.muc;
  da.mucDaThem.push(moiCap.id);
  assert.equal(r.body.canhBao.length, 0, "mức mới thấp hơn mức không cấp ⇒ hết cảnh báo");
  const cuDaDong = await mucTheoId(mucCap.muc.id);
  assert.equal(cuDaDong.denNgay, cong(D10, -1), "dòng cũ đóng ngày liền trước ngày bắt đầu của dòng mới");
  assert.equal(moiCap.tuNgay, D10);
  r = await call(ADMIN, "POST", "/api/pricing/phi-don", { ...muc(dk(["ZONE", ZONE], ["TIER", CAP]), 26_000, cong(D10, 5)), thayCho: { id: mucCap.muc.id, expectedUpdatedAt: cuCap.updatedAt } });
  assert.equal(r.status, 409, "mốc cũ của dòng đã bị đổi");
  assert.equal(r.body.error.code, "stale");
  assert.equal((await mucTheoId(moiCap.id))?.tien ?? 25_000, 25_000, "ca stale không ghi gì thêm");
  r = await thuTra({ ...base, cap: CAP, ngay: D10 });
  assert.equal(r.body.ketQua.mucId, moiCap.id);
  assert.equal(r.body.ketQua.tien, 75_000);
  console.log("✓ (4) đổi mức bằng thayCho: đóng dòng cũ ngày liền trước, thêm dòng mới, mốc cũ → 409 stale, lỗi đầu vào 400/404");

  // ---- (5) ngày bắt đầu áp
  const ap0 = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp;
  const vung2 = (await call(ADMIN, "POST", "/api/location-zones", { code: ZONE2, name: `Khu vực thiếu mức ${S}`, sortOrder: 6 })).body.zone;
  da.vungDaTao.push(ZONE2);
  for (const sai of [{ ngay: "2000-02-31", tuLucDaDoc: ap0.tuLuc }, { ngay: 5, tuLucDaDoc: ap0.tuLuc }, { ngay: D }])
    assert.equal((await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", sai)).status, 400, JSON.stringify(sai));
  assert.equal((await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: D, tuLucDaDoc: "mốc-sai" })).status, 409, "mốc đọc sai");
  // ADR-0214: khu vực ZONE2 đang bật, chưa có mức chung — vẫn đặt được ngày bắt đầu áp
  r = await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: D, tuLucDaDoc: ap0.tuLuc });
  assert.equal(r.status, 200, `khu vực thiếu mức chung vẫn đặt được (ADR-0214): ${JSON.stringify(r.body)}`);
  const ap1 = r.body.batDauAp;
  assert.equal(ap1.ngay, D);
  assert.equal((await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: D, tuLucDaDoc: ap0.tuLuc })).status, 409, "đọc cũ, người khác đã đặt");
  assert.equal((await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.ngay, D);
  // ADR-0214: đang áp, kết thúc mức chung CUỐI của ZONE2 (một dòng duy nhất) ⇒ 200 (trước đây 409 transfer_fee_general_required)
  const chungZ2Cuoi = (await them(ADMIN, muc(dk(["ZONE", ZONE2]), 15_000, D))).muc;
  da.mucDaThem.push(chungZ2Cuoi.id);
  r = await call(ADMIN, "POST", `/api/pricing/phi-don/${chungZ2Cuoi.id}/ket-thuc`, { validTo: cong(D, 5), expectedUpdatedAt: chungZ2Cuoi.updatedAt });
  assert.equal(r.status, 200, `kết thúc mức chung cuối khi đang áp (ADR-0214): ${JSON.stringify(r.body)}`);
  r = await call(ADMIN, "PUT", `/api/location-zones/${ZONE2}`, { name: vung2.name, sortOrder: 6, active: false, expectedUpdatedAt: vung2.updatedAt });
  assert.equal(r.status, 200, JSON.stringify(r.body)); // ngưng khu vực không có địa điểm
  console.log("✓ (5a) đặt ngày bắt đầu áp: khu vực thiếu mức chung vẫn đặt được (ADR-0214), mốc cũ 409; kết thúc được mức chung cuối khi đang áp");

  // khi ĐANG ÁP: đổi mức chung bằng thayCho vẫn được
  const ctZ = await mucTheoId(chungZ.id);
  assert.equal((await call(ADMIN, "POST", `/api/pricing/phi-don/${KHONG_ID}/ket-thuc`, { validTo: D, expectedUpdatedAt: ctZ.updatedAt })).status, 404);
  assert.equal((await call(ADMIN, "POST", `/api/pricing/phi-don/${chungZ.id}/ket-thuc`, { validTo: cong(D, 5) })).status, 400, "thiếu mốc cập nhật");
  assert.equal((await call(ADMIN, "POST", `/api/pricing/phi-don/${chungZ.id}/ket-thuc`, { validTo: cong(D, -1), expectedUpdatedAt: ctZ.updatedAt })).status, 400, "ngày kết thúc trước ngày bắt đầu");
  r = await call(ADMIN, "POST", "/api/pricing/phi-don", { ...muc(dk(["ZONE", ZONE]), 35_000, D20), thayCho: { id: chungZ.id, expectedUpdatedAt: ctZ.updatedAt } });
  assert.equal(r.status, 201, `đổi mức chung khi đang áp: ${JSON.stringify(r.body)}`);
  da.mucDaThem.push(r.body.muc.id);
  const chungZ2 = r.body.muc;
  assert.equal((await mucTheoId(chungZ.id)).denNgay, cong(D20, -1));
  r = await call(ADMIN, "POST", "/api/pricing/phi-don", { ...muc(dk(["ZONE", ZONE]), 36_000, cong(D20, 3)), thayCho: { id: chungZ.id, expectedUpdatedAt: ctZ.updatedAt } });
  assert.equal(r.status, 409, "mốc cũ của mức chung");
  assert.equal(r.body.error.code, "stale");
  const dang = await thuTra({ ...base, ngay: D20 });
  assert.deepEqual([dang.body.ketQua.mucId, dang.body.ketQua.tien], [chungZ2.id, 105_000]);
  // mức theo cấp (không phải mức chung) kết thúc được khi đang áp
  const mcMoi = await mucTheoId(moiCap.id);
  r = await call(ADMIN, "POST", `/api/pricing/phi-don/${moiCap.id}/ket-thuc`, { validTo: cong(D10, 2), expectedUpdatedAt: mcMoi.updatedAt });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.muc.denNgay, cong(D10, 2));
  assert.equal((await call(ADMIN, "POST", `/api/pricing/phi-don/${moiCap.id}/ket-thuc`, { validTo: cong(D10, 1), expectedUpdatedAt: mcMoi.updatedAt })).status, 409, "mốc cũ sau khi đã kết thúc");
  assert.equal((await call(ADMIN, "POST", `/api/pricing/phi-don/${moiCap.id}/ket-thuc`, { validTo: cong(D10, 5), expectedUpdatedAt: (await mucTheoId(moiCap.id)).updatedAt })).status, 400, "chỉ được rút ngắn");
  console.log("✓ (5b) đang áp: đổi mức chung bằng thayCho vẫn được, mức cấp kết thúc được");

  // mức nhiều điều kiện (khu vực + cấp + chiều + dịch vụ), chỉ một ngày: thắng mọi dòng ít điều kiện hơn; cũng là dữ liệu cho kiểm «chữ ký điều kiện» của audit-invariants (R-PRC-PD-1)
  const D30 = cong(D, 30);
  const nhieu = (await them(ADMIN, muc(dk(["SERVICE", DV], ["DIRECTION", "OUT"], ["TIER", CAP], ["ZONE", ZONE]), 99_000, D30, { validTo: D30 }))).muc;
  assert.deepEqual(nhieu.dieuKien, { vung: ZONE, cap: CAP, dichVu: DV, nhom: null, chieu: "OUT", xeRieng: false });
  r = await thuTra({ ...base, cap: CAP, ngay: D30 });
  assert.deepEqual([r.body.ketQua.mucId, r.body.ketQua.tien], [nhieu.id, 297_000]);
  assert.equal((await thuTra({ ...base, cap: CAP, ngay: D30, chieu: "RETURN" })).body.ketQua.tien, 105_000, "chiều về không khớp dòng nêu chiều đi ⇒ rơi về mức chung");
  console.log("✓ (5c) mức nhiều điều kiện thắng theo bậc");

  // ---- (7) phí đang áp (từ quá khứ xa): đơn có chặng mang dòng phí, đơn không chặng thì không (Đợt C, Task 3 — trước Đợt C tiêu chí này là «không dòng phí nào»)
  // Điều kiện đầu của (7): phí ĐANG ÁP và mức khu vực thử đúng 35.000 ngay hôm nay — thiếu một trong hai thì phép so thành vô nghĩa (đổi thứ tự kịch bản không được làm nó rỗng).
  const apNay = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp;
  assert.ok(apNay.ngay !== null && apNay.ngay <= vnDate(0), `phí phải đang áp trước khi lập đơn (ngày áp: ${apNay.ngay})`);
  r = await thuTra({ ...base, ngay: vnDate(0) });
  assert.deepEqual([r.body.ketQua.trangThai, r.body.ketQua.mucId, r.body.ketQua.donGia], ["CO_MUC", chungZ2.id, 35_000], "hôm nay khu vực thử có mức 35.000");
  const DON = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: diem.id, pickupPlace: "", dropoffLocationId: LOC, dropoffPlace: "" };
  const dichVuDon = (extra = {}) => catalogService({ pax: { adult: 2 }, departDate: vnDate(7), ...extra });
  // ĐỔI CÓ CHỦ ĐÍCH 16/11 (ADR-0214): phí trên đơn do văn phòng CHỌN (30.000 trong danh sách), KHÔNG theo bảng khu vực (35.000) — bảng không còn dùng cho đơn.
  r = await call(SALES, "POST", "/api/orders", orderInput({ services: [dichVuDon({ legs: [{ ...DON, doiPhi: { donGia: 30_000, lyDo: "Báo giá riêng" } }] })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const coChang = r.body.order;
  r = await call(SALES, "POST", "/api/orders", orderInput({ services: [dichVuDon({ legs: [] })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const khongChang = r.body.order;
  assert.equal(coChang.services[0].legs.length, 1, "đơn thử thật sự có chặng đưa đón");
  for (const d of [coChang, khongChang]) assert.equal((await call(SALES, "POST", `/api/orders/${d.id}/status`, { status: "confirmed" })).status, 200);
  const lay = async (id) => (await call(SALES, "GET", `/api/orders/${id}`)).body.order;
  const [a, b] = [await lay(coChang.id), await lay(khongChang.id)];
  assert.equal(a.status, "confirmed");
  assert.equal(b.total, 200_000, "2 người lớn × 100.000₫");
  assert.equal(a.total, b.total + 60_000, "đơn có chặng = dịch vụ + phí đưa đón văn phòng chọn 2 × 30.000₫ (không theo bảng 35.000₫)");
  assert.equal(a.subtotal, b.subtotal + 60_000);
  assert.deepEqual(a.phiDuaDon?.dong.map((d) => [d.zoneCode, d.nguon, d.direction, d.quantity, d.unitPrice, d.lineTotal]), [[null, "DOI_TAY", "OUT", 2, 30_000, 60_000]], "một dòng phí của chặng chiều đi");
  assert.equal(a.phiDuaDon.duKien, false, "đơn đã xác nhận: phí không còn «dự kiến»");
  assert.equal(b.phiDuaDon, null, "đơn không chặng: không phí");
  assert.equal(a.services[0].items.length, b.services[0].items.length, "dòng phí không lẫn vào dòng dịch vụ");
  assert.deepEqual(a.services[0].items.map((i) => i.lineTotal), b.services[0].items.map((i) => i.lineTotal));
  console.log("✓ (7) phí đang áp: đơn có chặng mang một dòng phí cộng vào tạm tính, đơn không chặng không phí, dòng dịch vụ như nhau");

  // ---- (6) nhật ký
  r = await call(TOAN_QUYEN, "GET", "/api/audit?action=prc_transfer_fee_added&limit=100");
  assert.equal(r.status, 200);
  for (const id of [chungZ.id, chungN.id, mucCap.muc.id, moiCap.id, chungZ2.id]) assert.ok(r.body.entries.some((e) => e.targetId === id), `nhật ký «thêm mức» cho ${id}`);
  assert.ok(r.body.entries.every((e) => e.targetType === "ledger"));
  const dongMoiCap = r.body.entries.find((e) => e.targetId === moiCap.id);
  assert.match(dongMoiCap.detail, new RegExp(`thay dòng ${mucCap.muc.id}`), "ghi dòng được thay");
  r = await call(TOAN_QUYEN, "GET", "/api/audit?action=prc_transfer_fee_ended&limit=100");
  for (const id of [mucCap.muc.id, chungZ.id, moiCap.id]) assert.ok(r.body.entries.some((e) => e.targetId === id), `nhật ký «kết thúc mức» cho ${id}`);
  assert.equal(r.body.entries.filter((e) => e.targetId === chungZ.id).length, 1, "ca bị chặn 409 và ca stale không để lại dòng nhật ký");
  r = await call(TOAN_QUYEN, "GET", "/api/audit?action=prc_transfer_fee_start_set&limit=100");
  assert.ok(r.body.entries.some((e) => e.detail.includes("áp dụng từ")), "nhật ký đặt ngày bắt đầu áp");
  r = await call(TOAN_QUYEN, "GET", "/api/audit?action=location_zone_created&limit=100");
  assert.ok(r.body.entries.some((e) => e.targetId === ZONE));
  const tat = JSON.stringify((await call(TOAN_QUYEN, "GET", "/api/audit?limit=200")).body.entries.filter((e) => String(e.action).startsWith("prc_transfer_fee") || String(e.action).startsWith("location_zone")));
  assert.doesNotMatch(tat, /0901\s?234\s?567/, "nhật ký phí đưa đón không có số điện thoại");
  console.log("✓ (6) nhật ký: từng lần ghi có dòng, ca thua không để lại dòng, không lộ số điện thoại");
} finally {
  // Dọn theo đúng thứ tự: TẮT phí → kết thúc mọi mức đã thêm → đưa địa điểm ra khỏi khu vực → ngưng khu vực thử. Mỗi bước tự bắt lỗi: dọn dở cũng không che lỗi gốc.
  const thu = async (ten, f) => { try { await f(); } catch (e) { console.error(`dọn «${ten}» lỗi: ${e?.message ?? e}`); } };
  await thu("tắt ngày bắt đầu áp", async () => {
    const ap = (await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp;
    if (ap.ngay !== null) {
      const r = await call(ADMIN, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: null, tuLucDaDoc: ap.tuLuc });
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    assert.equal((await call(ADMIN, "GET", "/api/pricing/phi-don")).body.batDauAp.ngay, null, "cuối kịch bản: ngày bắt đầu áp = tắt");
  });
  await thu("kết thúc mức", async () => {
    const mo = (await tatCa()).muc.filter((m) => da.mucDaThem.includes(m.id) && m.denNgay === null);
    for (const m of mo) await call(ADMIN, "POST", `/api/pricing/phi-don/${m.id}/ket-thuc`, { validTo: m.tuNgay, expectedUpdatedAt: m.updatedAt });
  });
  await thu("đưa địa điểm ra khỏi khu vực", async () => {
    if (!da.diaDiemId) return;
    const l = (await call(ADMIN, "GET", "/api/locations")).body.locations.find((x) => x.id === da.diaDiemId);
    await call(ADMIN, "PUT", `/api/locations/${l.id}`, { name: l.name, locationTypeCode: l.locationTypeCode, address: l.address, sortOrder: l.sortOrder, active: false, zoneCode: null, expectedUpdatedAt: l.updatedAt });
  });
  await thu("ngưng khu vực thử", async () => {
    for (const code of da.vungDaTao) {
      const z = (await call(ADMIN, "GET", "/api/locations")).body.zones.find((x) => x.code === code);
      if (z && z.active) await call(ADMIN, "PUT", `/api/location-zones/${code}`, { name: z.name, sortOrder: z.sortOrder, active: false, expectedUpdatedAt: z.updatedAt });
    }
  });
  const con = await sqlRows("SELECT count(*) AS n FROM loc_zone WHERE active = 1 AND code <> 'NGOAI_VUNG'").catch(() => null);
  if (con) console.log(`  (dọn xong; khu vực còn bật ngoài «Ngoài khu vực»: ${con[0].n})`);
}
console.log("E2E PHI-DON OK");
