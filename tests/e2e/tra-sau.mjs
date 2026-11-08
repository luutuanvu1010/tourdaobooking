// Trả sau theo hạn mức (ADR-0168; kế hoạch docs/superpowers/plans/2026-11-05-tra-sau-han-muc-ke-hoach.md Task 6) trên D1 local THẬT (wrangler dev):
//  1) Quyền (ADR-0172 Đ1): Quản trị, Toàn quyền đặt / ngừng; Kế toán xem được nhưng không ghi (403); Bán hàng, Hướng dẫn viên không vào màn hạn mức (403);
//  2) Quản trị chưa có «Mức tối đa Quản trị được cấp» ⇒ 403; Toàn quyền đặt mức tối đa; Quản trị vượt mức ⇒ 403, trong mức ⇒ 201 (hồ sơ có vai hưởng hoa hồng);
//     thời hạn trả và ân hạn tính bằng GIỜ (168 giờ, ân hạn 0); đường hẹp `con-duoc-dung` cho người lập đơn thấy đúng số còn được dùng;
//  3) Đơn Trả sau: xác nhận trong hạn mức ⇒ 200 và có hạn trả; đơn thứ hai vượt hạn mức ⇒ 409 bằng câu tiếng Việt; thu tiền thì xác nhận được lại;
//  4) Huỷ đơn đang nợ ⇒ nợ về 0, hạn mức trống ra; ngừng hạn mức ⇒ đơn Trả sau mới không xác nhận được (409), đơn Trả trước vẫn qua.
//  5) Vé của đơn Trả sau (kế hoạch 2026-11-05 Task 5 Step 1; ADR-0168 Đ3, ADR-0170 Đ2 mục 6, ADR-0171 Đ2): đối tác gửi đơn Trả sau ⇒ xác nhận, giữ vé; đối tác mở
//     và gửi đường dẫn khi chưa trả đồng nào; ghi «Công ty thu» đủ rồi Kế toán nộp một phần ⇒ vẫn còn nợ đúng số; đường dẫn khách thấy đủ vé; Quản trị không huỷ được
//     (còn nợ, vé đã mở); bước «Khách đã trả đủ» qua khi đã ghi đủ phải thu, nợ vẫn đếm tới khi nộp đủ. Gieo kho vé theo `moLo` / `themVe` của tests/e2e/ve-dien-tu.mjs, mã danh mục RIÊNG ZTS1.
// Hạn mức dùng số nhỏ (500.000) vì đơn thử ZE1 chỉ 100.000 mỗi người lớn; luật không đổi theo cỡ số. Luật vé chi tiết (quá hạn, ân hạn) nằm ở src/tra-sau-ve.test.ts.
// Dùng salesA / accountant / superAdmin / field / admin (không đổi tài khoản dùng chung). Hồ sơ đối tác tạo mới mỗi lần chạy.
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const SA = await session(ACCOUNTS.superAdmin);
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const A = await session(ACCOUNTS.salesA);
const F = await session(ACCOUNTS.field);
const T = Date.now();
const TEN = `Đại Lý Trả Sau ${String(T).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d])}`;
const HAN_MUC = 500_000;
const MA_THO = /\b(credit_\w+|CREDIT|PREPAID|forbidden|invalid_input|stale)\b/;
const thongBao = (r) => r.body?.error?.message ?? "";

// ---- 1) Quyền
let r = await call(A, "GET", "/api/tra-sau/han-muc");
assert.equal(r.status, 403, "Bán hàng không xem được màn hạn mức");
assert.equal((await call(F, "GET", "/api/tra-sau/han-muc")).status, 403, "Hướng dẫn viên không xem được");
r = await call(ACC, "GET", "/api/tra-sau/han-muc");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.coQuyenSua, false, "Kế toán chỉ xem");
r = await call(SA, "GET", "/api/tra-sau/han-muc");
assert.equal(r.status, 200);
assert.equal(r.body.coQuyenSua, true, "Toàn quyền sửa được");
assert.equal(r.body.coQuyenDatMucToiDa, true, "Toàn quyền đặt được mức tối đa");
r = await call(ADM, "GET", "/api/tra-sau/han-muc");
assert.equal(r.status, 200, "Quản trị xem được (ADR-0172 trang ghép)");
assert.equal(r.body.coQuyenSua, true, "Quản trị sửa được");
assert.equal(r.body.coQuyenDatMucToiDa, false, "Quản trị không đặt mức tối đa");
console.log("✓ 1) Quyền: Quản trị, Toàn quyền sửa; Kế toán chỉ xem; Bán hàng và Hướng dẫn viên 403");

// ---- 2) Cấp hạn mức
const SO = { hanMuc: HAN_MUC, gioTra: 168, gioAnHan: 0 };
r = await call(ACC, "POST", "/api/tra-sau/han-muc", { partyId: "pty_khong_co", ...SO });
assert.equal(r.status, 403, "Kế toán không đặt được hạn mức");
r = await call(ACC, "POST", "/api/parties", { kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: "09" + String(T).slice(-8) }] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const BEN = r.body.party.id;
r = await call(SA, "POST", "/api/tra-sau/han-muc", { partyId: BEN, ...SO });
assert.equal(r.status, 409, `hồ sơ chưa mang Vai người dùng của đối tác thì không cấp được: ${JSON.stringify(r.body)}`);
assert.doesNotMatch(thongBao(r), MA_THO, "câu báo không lộ mã thô");
r = await call(ADM, "POST", `/api/parties/${BEN}/roles`, { roleTypeCode: "TRAVEL_AGENCY" });
assert.equal(r.status, 201, JSON.stringify(r.body));
// Mức tối đa là cài đặt chung chỉ-thêm: lần chạy trước trên cùng D1 có thể đã đặt. Đặt lại đúng số cần cho bài.
assert.equal((await call(ADM, "POST", "/api/tra-sau/muc-toi-da", { so: HAN_MUC })).status, 403, "Quản trị không đặt được mức tối đa");
r = await call(SA, "POST", "/api/tra-sau/muc-toi-da", { so: HAN_MUC - 1 });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(ADM, "POST", "/api/tra-sau/han-muc", { partyId: BEN, ...SO });
assert.equal(r.status, 403, `Quản trị vượt mức tối đa: ${JSON.stringify(r.body)}`);
assert.doesNotMatch(thongBao(r), MA_THO);
assert.equal((await call(SA, "POST", "/api/tra-sau/muc-toi-da", { so: HAN_MUC })).status, 201);
r = await call(ADM, "POST", "/api/tra-sau/han-muc", { partyId: BEN, ...SO, lyDo: "Đại lý quen, thử luồng" });
assert.equal(r.status, 201, `Quản trị đặt trong mức tối đa: ${JSON.stringify(r.body)}`);
r = await call(A, "GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { coHanMuc: true, conDuocDung: HAN_MUC, coDonQuaHan: false });
r = await call(ACC, "GET", "/api/tra-sau/han-muc");
const dong = r.body.danhSach.find((x) => x.partyId === BEN);
assert.ok(dong, "hồ sơ vừa cấp có trên màn hạn mức");
assert.deepEqual([dong.hanMuc, dong.gioTra, dong.gioAnHan, dong.dangNo, dong.conDuocDung, dong.soDonQuaHan, dong.soDonAnHan], [HAN_MUC, 168, 0, 0, HAN_MUC, 0, 0]);
console.log("✓ 2) Mức tối đa chặn Quản trị (vượt ⇒ 403), trong mức ⇒ 201 500.000 / 168 giờ (hồ sơ chưa là đối tác ⇒ 409); đường hẹp và màn hạn mức thấy đúng số");

// ---- 3) Đơn Trả sau
const lapDon = async (soNguoi, extra = {}) => {
  const x = await call(A, "POST", "/api/orders", orderInput({ bookerPartyId: BEN, services: [catalogService({ pax: { adult: soNguoi }, departDate: vnDate(10) })], ...extra }));
  assert.equal(x.status, 201, JSON.stringify(x.body));
  return x.body.order;
};
const xacNhan = (id) => call(A, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
const don1 = await lapDon(3, { paymentTerm: "CREDIT" });
assert.equal(don1.paymentTerm, "CREDIT");
r = await xacNhan(don1.id);
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(A, "GET", `/api/orders/${don1.id}`);
assert.equal(r.body.order.paymentTerm, "CREDIT");
{
  const o = r.body.order;
  assert.ok(o.confirmedAt && o.hanTra, JSON.stringify(o));
  assert.equal(Date.parse(o.hanTra) - Date.parse(o.confirmedAt), 168 * 3_600_000, "hạn trả = giờ xác nhận + 168 giờ (ADR-0172 Đ3 mục 2)");
  assert.equal(o.hetAnHan, o.hanTra, "ân hạn 0 giờ ⇒ hết ân hạn trùng hạn trả");
  assert.deepEqual(r.body.traSau, { no: 300_000, trangThai: "trong_han", coQuyenAnHan: false }, "Bán hàng thấy trạng thái, không có nút Ân hạn");
}
r = await call(A, "GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`);
assert.equal(r.body.conDuocDung, HAN_MUC - 300_000);
// Máy chủ chặn ngay lúc LƯU đơn Trả sau vượt hạn mức (cổng khi lưu), không đợi tới lúc xác nhận.
r = await call(A, "POST", "/api/orders", orderInput({ bookerPartyId: BEN, paymentTerm: "CREDIT", services: [catalogService({ pax: { adult: 3 }, departDate: vnDate(10) })] }));
assert.equal(r.status, 409, `đơn thứ hai vượt hạn mức: ${JSON.stringify(r.body)}`);
assert.match(thongBao(r), /hạn mức/);
assert.doesNotMatch(thongBao(r), MA_THO);
r = await call(ACC, "GET", `/api/tra-sau/han-muc/${BEN}/don`);
assert.equal(r.status, 200);
assert.deepEqual(r.body.don.map((d) => [d.orderId, d.no, d.trangThai]), [[don1.id, 300_000, "trong_han"]]);
r = await call(ACC, "POST", `/api/orders/${don1.id}/payments`, { soTien: 300_000, hinhThuc: "CASH", nguoiThu: "cong_ty" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const don2 = await lapDon(3, { paymentTerm: "CREDIT" });
r = await xacNhan(don2.id);
assert.equal(r.status, 200, `đã thu thì hạn mức trống ra: ${JSON.stringify(r.body)}`);
console.log("✓ 3) Đơn Trả sau xác nhận trong hạn mức có hạn trả; đơn vượt ⇒ 409 câu tiếng Việt; thu tiền xong xác nhận được");

// ---- 4) Huỷ và ngừng hạn mức
r = await call(A, "POST", `/api/orders/${don2.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(A, "GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`);
assert.equal(r.body.conDuocDung, HAN_MUC, "huỷ đơn đang nợ ⇒ nợ về 0");
const don3 = await lapDon(1, { paymentTerm: "CREDIT" }); // nháp Trả sau lưu được khi còn hạn mức
assert.equal((await call(ACC, "POST", `/api/tra-sau/han-muc/${BEN}/ngung`, {})).status, 403, "Kế toán không ngừng được");
assert.equal((await call(SA, "POST", `/api/tra-sau/han-muc/${BEN}/ngung`, {})).status, 200);
r = await call(A, "GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`);
assert.equal(r.body.coHanMuc, false);
r = await xacNhan(don3.id);
assert.equal(r.status, 409, `hạn mức hết giữa lúc lưu và lúc xác nhận ⇒ không xác nhận được: ${JSON.stringify(r.body)}`);
assert.match(thongBao(r), /hạn mức/);
assert.doesNotMatch(thongBao(r), MA_THO);
r = await call(A, "POST", "/api/orders", orderInput({ bookerPartyId: BEN, paymentTerm: "CREDIT", services: [catalogService({ pax: { adult: 1 }, departDate: vnDate(10) })] }));
assert.equal(r.status, 409, `hết hạn mức thì lưu đơn Trả sau mới cũng bị chặn: ${JSON.stringify(r.body)}`);
const don4 = await lapDon(1);
assert.equal((await xacNhan(don4.id)).status, 200, "đơn Trả trước vẫn xác nhận bình thường");
const nk = await sqlRows(`SELECT action FROM audit_log WHERE target_id = '${BEN}' AND action IN ('credit_limit_set','credit_limit_stopped') ORDER BY created_at, rowid`);
assert.deepEqual(nk.map((x) => x.action), ["credit_limit_set", "credit_limit_stopped"]);
console.log("✓ 4) Huỷ đơn nợ ⇒ nợ về 0; ngừng hạn mức ⇒ đơn Trả sau 409, Trả trước vẫn qua; nhật ký đủ hai dòng");

// ---- 5) Vé của đơn Trả sau trên D1 + R2 local THẬT
{
  const AT = "'2026-01-01T00:00:00.000Z'";
  await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
    ('ZTS1','Vé điện tử Trả sau thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,95,1,${AT},${AT})
    ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);
  const tag = Date.now().toString(36);
  const CHU = String(T).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]);
  // Nhúng `tag` vào ảnh và mã vé: ADR-0156 chặn ảnh / mã trùng giữa các lần chạy trên cùng D1.
  const PNG = (n) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); u.set(new TextEncoder().encode(`ts${tag}`), 20); return Buffer.from(u).toString("base64"); };
  const moLo = async () => { const x = await call(A, "POST", "/api/ve/lo", { catalogCode: "ZTS1", nhomKhach: "ADULT", tenSanPham: "Vé thử e2e Trả sau" }); assert.equal(x.status, 201, JSON.stringify(x.body)); return x.body.loId; };
  const themVe = (loId, ve) => call(A, "POST", `/api/ve/lo/${loId}/ve`, { ve });
  const veThu = (n) => ({ noiDung: PNG(n), maVe: `E2E.TS.${tag}.${n}`, tuNgay: vnDate(-1), denNgay: vnDate(60) });
  // ADR-0174: máy chỉ giữ vé cho dịch vụ Có vé — bật ô cho ZTS1 (gửi đúng giá trị đang có cũng 200, nên chạy lại trên cùng D1 vẫn được)
  assert.equal((await call(SA, "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma: "ZTS1", coVe: true })).status, 200);
  const lo = await moLo(); // 2 vé một lô: không vượt trần lô dù kịch bản khác để trần thấp
  assert.equal((await themVe(lo, [veThu(1), veThu(2)])).body?.themDuoc, 2);
  assert.equal((await call(A, "POST", `/api/ve/lo/${lo}/xac-nhan`, {})).status, 200);

  // Đối tác (vai «Công ty lữ hành» ⇒ quyền Đối tác), có cấp hoa hồng riêng TRƯỚC khi xác nhận (bản chụp lúc xác nhận; thiếu mức thì «Khách đã trả đủ» bị giữ vì lý do khác).
  const tk = await call(SA, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Đại Lý Vé Trả Sau ${CHU}`, phone: randomPhone(), roles: ["TRAVEL_AGENCY"] });
  assert.equal(tk.status, 201, JSON.stringify(tk.body));
  const DT = (await login(tk.body.staff.phone, tk.body.pin)).cookie;
  const BEN5 = (await sqlRows(`SELECT party_id AS p FROM staff WHERE phone = '${tk.body.staff.phone}'`))[0].p;
  const m = await call(ACC, "POST", "/api/pricing/muc-ta", { ten: `Cấp vé trả sau ${CHU}` });
  assert.equal(m.status, 201, JSON.stringify(m.body));
  assert.equal((await call(ACC, "POST", `/api/pricing/muc-ta/${m.body.muc.code}/dong`, { phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: vnDate(0) })).status, 201);
  r = await call(ACC, "POST", `/api/pricing/ho-so/${BEN5}/muc-rieng`, { muc: m.body.muc.code, tuNgay: vnDate(0) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  r = await call(SA, "POST", "/api/tra-sau/han-muc", { partyId: BEN5, hanMuc: 1_000_000, gioTra: 168, gioAnHan: 0 });
  assert.equal(r.status, 201, JSON.stringify(r.body));

  // Đối tác gửi đơn Trả sau 2 người lớn, đi hôm nay (để «Xác nhận khách đã trả đủ» bấm được ngay)
  r = await call(DT, "POST", "/api/orders", orderInput({ customerName: `Khách Vé Trả Sau ${CHU}`, customerPhone: "0913571360", paymentTerm: "CREDIT", services: [catalogService({ catalogCode: "ZTS1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: vnDate(0) })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const don = { id: r.body.order.id, total: r.body.order.total };
  assert.equal(don.total, 200_000);
  r = await call(DT, "POST", `/api/orders/${don.id}/gui-don`, {});
  assert.equal(r.status, 200, `gửi đơn Trả sau trong hạn mức ⇒ xác nhận: ${JSON.stringify(r.body)}`);
  assert.equal((await sqlRows(`SELECT status FROM orders WHERE id = '${don.id}'`))[0].status, "confirmed");
  assert.equal(Number((await sqlRows(`SELECT count(*) AS n FROM vdt_allocation WHERE order_id = '${don.id}' AND released_at IS NULL`))[0].n), 2, "đơn giữ 2 vé");

  // Chưa trả đồng nào: đối tác thấy đủ vé, mở ảnh, tạo đường dẫn gửi khách
  r = await call(DT, "GET", `/api/ve/don/${don.id}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.veXem.length, 2, `đơn Trả sau trong hạn: mở vé trước khi thu (${JSON.stringify(r.body)})`);
  assert.doesNotMatch(JSON.stringify(r.body), new RegExp(`E2E\\.TS\\.${tag}|vdt/`), "không lộ mã vé, khoá kho");
  assert.equal((await call(DT, "GET", `/api/ve/anh/${r.body.veXem[0].id}`)).status, 200, "đối tác mở ảnh vé");
  const dd = await call(DT, "POST", "/api/ve/duong-dan", { orderId: don.id });
  assert.equal(dd.status, 200, JSON.stringify(dd.body));
  const token = String(dd.body.duongDan).replace("/ve/", "");

  // Đối tác ghi «Công ty thu» đủ, Kế toán nộp MỘT PHẦN 1.000 ₫ ⇒ nợ còn 199.000 (lỗi nộp một phần của ADR-0170 cùng gốc `noTheoDon`)
  assert.equal((await call(DT, "POST", `/api/orders/${don.id}/payments`, { soTien: don.total, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  const nop = (soTien) => call(ACC, "POST", "/api/ledger/settlements", { chieu: "nop", partyId: BEN5, phanBo: [{ orderId: don.id, soTien }] });
  r = await nop(1000);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const noDon = async () => (await call(ACC, "GET", `/api/tra-sau/han-muc/${BEN5}/don`)).body.don.map((d) => [d.orderId, d.no]);
  assert.deepEqual(await noDon(), [[don.id, 199_000]], "nộp một phần: vẫn còn nợ đúng phần chưa về công ty");
  r = await call(DT, "GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN5}`);
  assert.equal(r.body.conDuocDung, 1_000_000 - 199_000, "hạn mức khả dụng không trống ra cả đơn");

  // Đường dẫn khách thấy đủ vé dù đơn còn nợ (trong hạn)
  const trang = await fetch(`${BASE}/ve/${token}`, { headers: { "cf-connecting-ip": `198.51.100.${Math.floor(Math.random() * 200) + 1}` } });
  const than = await trang.text();
  assert.equal(trang.status, 200);
  assert.deepEqual([...than.matchAll(/\/anh\/(\d+)"/g)].map((x) => Number(x[1])), [1, 2], "khách thấy cả hai vé");
  assert.doesNotMatch(than, /chưa sẵn sàng/);
  assert.equal((await call(undefined, "GET", `/api/ve-khach/${token}/anh/2`)).status, 200, "ảnh vé thứ hai tải được");

  // Còn nợ + vé đã mở ⇒ Quản trị không huỷ được, đơn giữ nguyên
  r = await call(ADM, "POST", `/api/orders/${don.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "tra_sau_con_no_da_mo_ve");
  assert.doesNotMatch(thongBao(r), MA_THO);
  assert.equal((await sqlRows(`SELECT status FROM orders WHERE id = '${don.id}'`))[0].status, "confirmed");

  // «Khách đã trả đủ» xét tiền ĐÃ GHI đủ phải thu (ADR-0168 Đ3 mục 2 giữ nguyên luật cũ), không xét tiền đã về công ty: đối tác ghi đủ
  // thì qua. Nợ vẫn đếm sau bước này (ADR-0168 Đ2 mục 2), nhưng dòng hoa hồng ghi lúc đó được bù vào phần đối tác đang giữ như sổ đại lý
  // đã làm từ đợt 2 (chủ chọn «Khớp sổ đại lý» 2026-11-06, ADR-0177): 199.000 − 20.000 = 179.000, và sổ chỉ nhận nộp đúng số đó.
  const hdv = (await call(F, "GET", "/api/auth/me")).body.staff;
  r = await call(ADM, "PUT", `/api/orders/${don.id}/handler`, { staffId: hdv.id });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(F, "POST", `/api/orders/${don.id}/delivered`, {});
  assert.equal(r.status, 200, `đã ghi đủ phải thu thì «Khách đã trả đủ»: ${JSON.stringify(r.body)}`);
  assert.ok((await call(ADM, "GET", `/api/orders/${don.id}`)).body.order.deliveredAt, "đơn đã ở bước Khách đã trả đủ");
  assert.deepEqual(await noDon(), [[don.id, 179_000]], "sau «Khách đã trả đủ» nợ còn phần đối tác giữ trừ hoa hồng của họ");
  // ADR-0181 Đ1 (migration 0146 trên D1 thật): đơn đã xong còn nợ 179.000 vẫn «Ân hạn» được; chỉ hạn trả đổi, khoá «đơn đã xong» giữ mọi cột khác.
  {
    const truoc = (await sqlRows(`SELECT credit_due_at AS h, credit_grace_until AS g, total, delivered_at AS d FROM orders WHERE id = '${don.id}'`))[0];
    const hanMoi = new Date(Date.parse(truoc.h) + 24 * 3_600_000).toISOString();
    const ah = await call(ADM, "POST", `/api/tra-sau/don/${don.id}/an-han`, { hanMoi, lyDo: "Đối tác hẹn nộp tiền" });
    assert.equal(ah.status, 200, `«Ân hạn» đơn đã xong còn nợ: ${JSON.stringify(ah.body)}`);
    const sau = (await sqlRows(`SELECT credit_due_at AS h, credit_grace_until AS g, total, delivered_at AS d FROM orders WHERE id = '${don.id}'`))[0];
    assert.deepEqual([sau.h, sau.total, sau.d], [hanMoi, truoc.total, truoc.d], "chỉ hạn trả đổi");
  }
  assert.equal((await nop(179_001)).status, 409, "sổ không nhận nộp quá phần còn giữ");
  { const x = await nop(179_000); assert.equal(x.status, 201, JSON.stringify(x.body)); }
  assert.deepEqual(await noDon(), [], "nộp đủ: hết nợ");
  console.log("✓ 5) Vé đơn Trả sau: gửi đơn ⇒ xác nhận + giữ vé; đối tác mở và gửi khi chưa thu; nộp một phần còn nợ 199.000; khách thấy đủ vé; huỷ 409; bước Khách đã trả đủ qua khi ghi đủ, nợ còn 179.000 (trừ hoa hồng) tới khi nộp đủ");
}
