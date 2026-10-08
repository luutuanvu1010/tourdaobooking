// QR thanh toán + mã giao dịch ngân hàng (ADR-0108; đặc tả docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md §8; ADR-0092 Đ6) trên D1 local THẬT (wrangler dev):
// Toàn quyền cài tài khoản nhận tiền (Kế toán / Quản trị / Bán hàng 403; khoá lạc quan) → Bán hàng lập đơn → QR mặc định = còn lại, số khác, số gõ lạ 400 → phạm vi xem QR
// → HDV khai "Khách đã chuyển khoản" → Kế toán xác nhận: thiếu mã 400, có mã 200 (mã gõ lẫn dấu cách / gạch được chuẩn hoá) → khai trùng cùng mã 409 → số thực chuyển lệch
// 409 mang số đã ghi → tổng vượt số thực chuyển 409 → HAI lệnh cùng lúc trên MỘT khoản (một 200, một 409, không 500) và hai khoản cùng một mã (tổng không vượt số
// thực chuyển ở D1 thật) → Kế toán tự ghi cần mã (ô mã miễn luật 8 chữ số, ghi chú vẫn chặn) → chỉ Kế toán thấy mã → tìm đơn bằng nội dung chuyển khoản → nhật ký không
// chép mã hay số tài khoản.
// Dùng superAdmin, salesA/salesB, admin, accountant, field/fieldB (không đổi tài khoản dùng chung). Mọi mã giao dịch (kể cả mã thuần số 12 chữ số) sinh từ Date.now() nên chạy lại trên cùng D1 không va chạm.
// Hai ca đua (mục 7) chỉ chứng minh "không ai nhận 500, đúng một người thắng, D1 chỉ có một dòng nối" — KHÔNG chứng minh hai yêu cầu thật sự đan xen: trên `wrangler dev` cục bộ hai yêu cầu
// thường chạy nối đuôi nhau (người kiểm đã thử: bỏ trigger chống trùng mà không chèn độ trễ thì bài vẫn xanh; chèn trễ ~500ms mới đỏ). Lớp CSDL được ghim ở chỗ khác:
// src/migrations-ma-giao-dich.test.ts (từng trigger) và src/modules/billing/ma-giao-dich-may-chu.test.ts (kiểm trước lô của máy chủ đứng riêng).
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const SA = await session(ACCOUNTS.superAdmin);
const A = await session(ACCOUNTS.salesA);
const B = await session(ACCOUNTS.salesB);
const ADM = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const F = await session(ACCOUNTS.field);
const FB = await session(ACCOUNTS.fieldB);
const me = async (c) => (await call(c, "GET", "/api/auth/me")).body.staff;
const fld = await me(F);

const T = Date.now().toString(36).toUpperCase(); // mỗi lần chạy một dãy mã riêng
const MA = (s) => `E2EQR${T}${s}`;
const MA_SO = String(Date.now()).slice(-12); // mã thuần số 12 chữ số (ô mã được miễn luật chặn dãy ≥ 8 chữ số) — cũng riêng cho mỗi lần chạy
const SO_TAM = "0987654321012";
const SO_THAT = "0011001234567";
const TEN_TK = "CONG TY TNHH TOUR DAO";

/** CRC-16/CCITT-FALSE (đa thức 0x1021, khởi đầu 0xFFFF) — tự viết lại ở đây, độc lập với mã của máy chủ. */
const crc16 = (s) => {
  let c = 0xffff;
  for (const ch of Buffer.from(s, "ascii")) {
    c ^= ch << 8;
    for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
};

/** Đơn ĐÃ XÁC NHẬN `soNguoi` × 100.000 do salesA lập, người phụ trách = HDV field. */
async function donXacNhan(soNguoi) {
  const r = await call(A, "POST", "/api/orders", { ...orderInput({ services: [catalogService({ pax: { adult: soNguoi }, departDate: vnDate(10) })] }), handlerStaffId: fld.id });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await call(A, "POST", `/api/orders/${r.body.order.id}/status`, { status: "confirmed" })).status, 200);
  assert.equal(r.body.order.total, soNguoi * 100000);
  return r.body.order;
}
const qr = (c, id, soTien) => call(c, "GET", `/api/orders/${id}/qr-thanh-toan${soTien === undefined ? "" : `?soTien=${encodeURIComponent(soTien)}`}`);
const khai = (c, id, soTien, extra = {}) => call(c, "POST", `/api/orders/${id}/payments`, { soTien, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", ...extra });
const choXacNhan = async (orderId) => (await call(ACC, "GET", "/api/ledger")).body.choXacNhan.filter((x) => x.orderId === orderId).map((x) => x.receiptId);
const xacNhan = (c, rid, body) => call(c, "POST", `/api/ledger/company-receipts/${rid}/confirm`, body);
const maLoi = (r) => r.body?.error?.code;

const ct = (await sqlRows("SELECT party_id FROM v_pty_owner_company LIMIT 1"))[0].party_id;
const urlTk = `/api/parties/${ct}/tai-khoan-nhan-tien`;

// ---- 1) Chưa cài tài khoản ⇒ QR 409 đúng câu (chỉ khi chưa ai cài trên D1 này)
const don1 = await donXacNhan(3); // 300.000
let cur = (await call(SA, "GET", urlTk)).body;
if (!cur.hienTai) {
  const r = await qr(A, don1.id);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.message, "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống.");
  console.log("✓ chưa cài tài khoản ⇒ QR 409 đúng câu, không dùng tài khoản nào khác");
}

// ---- 2) Cài tài khoản: chỉ Toàn quyền; khoá lạc quan; một dòng hiện hành; nhật ký không chép số
const thanTk = (so, truocDo) => ({ maNganHang: "VCB", soTaiKhoan: so, chuTaiKhoan: TEN_TK, truocDo });
for (const [ten, c] of [["Kế toán", ACC], ["Quản trị", ADM], ["Bán hàng", A]]) {
  assert.equal((await call(c, "GET", urlTk)).status, 403, `${ten} đọc`);
  assert.equal((await call(c, "PUT", urlTk, thanTk(SO_TAM, cur.hienTai?.id ?? null))).status, 403, `${ten} ghi`);
}
const cai1 = await call(SA, "PUT", urlTk, thanTk(SO_TAM, cur.hienTai?.id ?? null));
assert.equal(cai1.status, 200, JSON.stringify(cai1.body));
const cu = await call(SA, "PUT", urlTk, thanTk(SO_THAT, null)); // truocDo = null khi đã có tài khoản ⇒ đã cũ
assert.equal(cu.status, 409);
assert.equal(maLoi(cu), "stale");
cur = (await call(SA, "GET", urlTk)).body;
const cai2 = await call(SA, "PUT", urlTk, thanTk(SO_THAT, cur.hienTai.id));
assert.equal(cai2.status, 200, JSON.stringify(cai2.body));
const dongTk = await sqlRows(`SELECT account_number, valid_to FROM pty_bank_account WHERE party_id = '${ct}' ORDER BY created_at`);
assert.equal(dongTk.filter((x) => x.valid_to === null).length, 1, "đúng một dòng hiện hành");
assert.equal(dongTk.find((x) => x.valid_to === null).account_number, SO_THAT);
assert.ok(dongTk.some((x) => x.account_number === SO_TAM && x.valid_to !== null), "dòng cũ được đóng, giữ làm lịch sử");
console.log("✓ cài tài khoản nhận tiền: Kế toán/Quản trị/Bán hàng 403; thân cũ 409 stale; đúng một dòng hiện hành, dòng cũ đóng");

// ---- 3) QR: mặc định = còn lại; nội dung = mã đơn bỏ gạch; số khác; số gõ lạ ⇒ 400
assert.equal((await call(A, "POST", `/api/orders/${don1.id}/payments`, { soTien: 50000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
const q = await qr(A, don1.id);
assert.equal(q.status, 200, JSON.stringify(q.body));
const x = q.body.qr;
assert.deepEqual(Object.keys(x).sort(), ["chuTaiKhoan", "conLai", "congTy", "maDon", "nganHang", "noiDung", "payload", "soTaiKhoan", "soTien"], "DTO là danh sách trắng");
const noiDung = don1.orderCode.replace(/[^A-Z0-9]/g, "");
assert.deepEqual([x.soTien, x.conLai, x.noiDung, x.maDon, x.soTaiKhoan, x.chuTaiKhoan], [250000, 250000, noiDung, don1.orderCode, SO_THAT, TEN_TK]);
assert.match(x.payload, /^000201010212.*6304[0-9A-F]{4}$/);
assert.equal(x.payload.slice(-4), crc16(x.payload.slice(0, -4)), "CRC-16 của payload khớp bản tự tính");
assert.ok(x.payload.includes("5406250000"), "tag 54 mang đúng số tiền");
assert.ok(x.payload.includes(`08${String(noiDung.length).padStart(2, "0")}${noiDung}`), "tag 62/08 mang nội dung chuyển khoản");
assert.ok(x.payload.includes(SO_THAT), "payload mang số tài khoản");
assert.doesNotMatch(JSON.stringify(q.body), /hoa hồng|giá vốn|commission|CASH|người thu|NV Bán|Hiện Trường/i, "không lộ hoa hồng / giá vốn / người thu");
assert.equal((await qr(A, don1.id, "100000")).body.qr.soTien, 100000);
for (const so of ["250001", "0", "-1", "1e5", "100000.0", " 100000", "+5", "0x10", "abc", "020000"]) {
  const r = await qr(A, don1.id, so);
  assert.equal(r.status, 400, `soTien="${so}" phải 400, nhận ${r.status} ${JSON.stringify(r.body)}`);
}
console.log("✓ QR mặc định bằng còn lại, nội dung = mã đơn bỏ gạch, CRC khớp; số nhỏ hơn được; 10 dạng số lạ đều 400");

// ---- 4) Phạm vi xem QR
assert.equal((await qr(F, don1.id)).status, 200, "HDV phụ trách xem được");
assert.equal((await qr(FB, don1.id)).status, 404, "HDV khác: 404 như biên nhận");
assert.equal((await qr(B, don1.id)).status, 200, "Bán hàng thấy mọi đơn (ô order.view = any), nên QR cũng thấy"); // phạm vi theo ô quyền, không phải theo người lập
assert.equal((await qr(ACC, don1.id)).status, 200, "Kế toán xem được");
console.log("✓ phạm vi xem QR theo ô quyền: HDV phụ trách 200, HDV khác 404, Bán hàng và Kế toán 200");

// ---- 5) HDV khai "Khách đã chuyển khoản" ⇒ Kế toán xác nhận: thiếu mã 400, có mã 200 (chuẩn hoá)
const ma1 = MA("1");
{
  assert.equal((await khai(F, don1.id, x.soTien)).status, 201, "HDV khai Công ty thu – CK đúng số trên QR");
  const [rid] = await choXacNhan(don1.id);
  assert.ok(rid, "khoản nằm trong danh sách chờ xác nhận");
  const thieu = await xacNhan(ACC, rid, {});
  assert.equal(thieu.status, 400);
  assert.equal(maLoi(thieu), "bank_txn_required");
  assert.equal((await xacNhan(ACC, rid, { maGiaoDich: ma1 })).status, 400, "có mã mà thiếu số thực chuyển");
  assert.equal((await xacNhan(ACC, rid, { maGiaoDich: "ab", soThucChuyen: x.soTien })).status, 400, "mã dưới 4 ký tự");
  assert.equal((await xacNhan(ACC, rid, { maGiaoDich: "Đ12345", soThucChuyen: x.soTien })).status, 400, "chữ có dấu không thuộc [A-Z0-9]");
  assert.equal((await xacNhan(ACC, rid, { maGiaoDich: "--..", soThucChuyen: x.soTien })).status, 400, "toàn dấu phân cách");
  // mã gõ lẫn dấu cách / gạch / chữ thường ⇒ chuẩn hoá về đúng ma1, không bị cắt lặng lẽ
  const go = ` ${ma1.slice(0, 5).toLowerCase()}-${ma1.slice(5, 9)}.${ma1.slice(9)} `;
  const ok = await xacNhan(ACC, rid, { maGiaoDich: go, soThucChuyen: x.soTien });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal((await sqlRows(`SELECT txn_code FROM bil_receipt_bank_txn WHERE receipt_id = '${rid}'`))[0].txn_code, ma1, "mã được chuẩn hoá khi lưu");
  const pk = JSON.stringify((await call(ACC, "GET", `/api/orders/${don1.id}/payments`)).body);
  assert.ok(pk.includes(ma1), "Kế toán thấy mã");
  for (const [ten, c] of [["Bán hàng", A], ["HDV", F]]) assert.ok(!JSON.stringify((await call(c, "GET", `/api/orders/${don1.id}/payments`)).body).includes(ma1), `${ten} không thấy mã`);
  // đơn đã thu đủ ⇒ QR 409 đúng câu
  const du = await qr(A, don1.id);
  assert.equal(du.status, 409);
  assert.equal(du.body.error.message, "Đơn không còn tiền cần thu.");
}
console.log("✓ Kế toán xác nhận: thiếu mã 400, mã/số thực chuyển sai dạng 400, mã gõ lẫn dấu được chuẩn hoá và lưu, chỉ Kế toán thấy mã; thu đủ ⇒ QR 409");

// ---- 6) Khai trùng cùng mã, số thực chuyển lệch, tổng vượt
{
  const don2 = await donXacNhan(2); // 200.000
  assert.equal((await khai(F, don2.id, 150000)).status, 201);
  const [r2] = await choXacNhan(don2.id);
  const lech = await xacNhan(ACC, r2, { maGiaoDich: ma1, soThucChuyen: 100000 });
  assert.equal(lech.status, 409, JSON.stringify(lech.body));
  assert.deepEqual([maLoi(lech), lech.body.error.soThucChuyen], ["bank_txn_amount_mismatch", 250000], "lệch số ⇒ 409 mang số đã ghi để giao diện điền sẵn");
  const vuot = await xacNhan(ACC, r2, { maGiaoDich: ma1.toLowerCase(), soThucChuyen: 250000 }); // chữ thường vẫn là CÙNG mã
  assert.equal(vuot.status, 409, JSON.stringify(vuot.body));
  assert.equal(maLoi(vuot), "bank_txn_over", "250.000 đã dùng hết cho đơn 1, thêm 150.000 là vượt");
  const nhan = await xacNhan(ACC, r2, { maGiaoDich: MA("2"), soThucChuyen: 150000 });
  assert.equal(nhan.status, 200, JSON.stringify(nhan.body));

  // khai hai lần cùng một khoản trên MỘT đơn: lần xác nhận thứ hai cùng mã bị chặn
  const don3 = await donXacNhan(4); // 400.000
  assert.equal((await khai(F, don3.id, 100000)).status, 201);
  assert.equal((await khai(F, don3.id, 100000)).status, 201);
  const [r3a, r3b] = await choXacNhan(don3.id);
  assert.equal((await xacNhan(ACC, r3a, { maGiaoDich: MA("3"), soThucChuyen: 100000 })).status, 200);
  const trung = await xacNhan(ACC, r3b, { maGiaoDich: MA("3"), soThucChuyen: 100000 });
  assert.equal(trung.status, 409, JSON.stringify(trung.body));
  assert.equal(maLoi(trung), "bank_txn_duplicate", "cùng mã trên cùng đơn");
  assert.equal((await xacNhan(ACC, r3b, { maGiaoDich: MA("3B"), soThucChuyen: 100000 })).status, 200, "khoản thứ hai có mã khác thì xác nhận được");
}
console.log("✓ khai trùng cùng mã trên một đơn 409 bank_txn_duplicate; số thực chuyển lệch 409 mang số đã ghi; tổng vượt 409 bank_txn_over");

// ---- 7) Đua thật trên D1
{
  // (a) hai Kế toán / Toàn quyền cùng bấm "Công ty đã nhận" cho MỘT khoản ⇒ một 200, một 409, không ai nhận 500
  const don4 = await donXacNhan(1);
  assert.equal((await khai(F, don4.id, 100000)).status, 201);
  const [r4] = await choXacNhan(don4.id);
  const kq = await Promise.all([xacNhan(ACC, r4, { maGiaoDich: MA("4"), soThucChuyen: 100000 }), xacNhan(SA, r4, { maGiaoDich: MA("4"), soThucChuyen: 100000 })]);
  assert.deepEqual(kq.map((r) => r.status).sort(), [200, 409], `hai lệnh cùng một khoản: ${JSON.stringify(kq.map((r) => [r.status, r.body]))}`);
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM bil_receipt_bank_txn WHERE receipt_id = '${r4}'`))[0].n, 1, "chỉ một dòng nối mã");

  // (b) hai khoản của HAI đơn cùng một mã, mỗi khoản đúng bằng số thực chuyển ⇒ chỉ một khoản được nối (tổng không vượt số thực chuyển)
  const [don5, don6] = [await donXacNhan(1), await donXacNhan(1)];
  for (const d of [don5, don6]) assert.equal((await khai(F, d.id, 100000)).status, 201);
  const [r5] = await choXacNhan(don5.id);
  const [r6] = await choXacNhan(don6.id);
  const kq2 = await Promise.all([xacNhan(ACC, r5, { maGiaoDich: MA("56"), soThucChuyen: 100000 }), xacNhan(SA, r6, { maGiaoDich: MA("56"), soThucChuyen: 100000 })]);
  assert.deepEqual(kq2.map((r) => r.status).sort(), [200, 409], `hai khoản một mã: ${JSON.stringify(kq2.map((r) => [r.status, r.body]))}`);
  assert.equal(maLoi(kq2.find((r) => r.status === 409)), "bank_txn_over");
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM bil_receipt_bank_txn WHERE txn_code = '${MA("56")}'`))[0].n, 1, "tổng theo mã không vượt số thực chuyển");
}
console.log("✓ đua thật: hai lệnh một khoản ⇒ 200 + 409; hai khoản một mã ⇒ 200 + 409 bank_txn_over, D1 chỉ có một dòng nối");

// ---- 8) Kế toán tự ghi (đường 2): CK – Công ty thu cần mã; ô mã miễn luật 8 chữ số, ghi chú vẫn chặn; tiền mặt không cần
{
  const don7 = await donXacNhan(5); // 500.000
  const thieu = await khai(ACC, don7.id, 300000);
  assert.equal(thieu.status, 400);
  assert.equal(maLoi(thieu), "bank_txn_required");
  assert.equal((await khai(ACC, don7.id, 1000, { maGiaoDich: MA("7X"), soThucChuyen: 1000, ghiChu: `sao kê ${MA_SO}` })).status, 400, "ghi chú vẫn chặn chuỗi ≥ 8 chữ số");
  const muoiHai = await khai(ACC, don7.id, 300000, { maGiaoDich: MA_SO, soThucChuyen: 300000 }); // mã thuần số 12 chữ số: ô mã được miễn
  assert.equal(muoiHai.status, 201, JSON.stringify(muoiHai.body));
  assert.equal((await call(ACC, "POST", `/api/orders/${don7.id}/payments`, { soTien: 100000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201, "Công ty thu tiền mặt: không cần mã");
}
console.log("✓ Kế toán tự ghi CK – Công ty thu: thiếu mã 400, ô mã nhận 12 chữ số, ghi chú vẫn chặn; tiền mặt không cần mã");

// ---- 9) Tìm đơn bằng nội dung chuyển khoản (có hay không gạch, hoa hay thường)
for (const chuoi of [noiDung, noiDung.toLowerCase(), don1.orderCode, don1.orderCode.toLowerCase()]) {
  const tim = await call(A, "GET", `/api/orders?limit=10&q=${encodeURIComponent(chuoi)}`);
  assert.equal(tim.status, 200, JSON.stringify(tim.body));
  assert.deepEqual(tim.body.orders.map((o) => o.id), [don1.id], `q="${chuoi}"`);
}
console.log("✓ tìm đơn bằng nội dung chuyển khoản (4 cách gõ) ra đúng một đơn");

// ---- 10) Nhật ký không chép mã giao dịch hay số tài khoản
{
  const biMat = [MA("1"), MA("2"), MA("3"), MA("3B"), MA("4"), MA("56"), MA_SO, SO_TAM, SO_THAT];
  const cot = "coalesce(detail,'') || '|' || coalesce(target_id,'') || '|' || coalesce(target_type,'')";
  const lo = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE ${biMat.map((s) => `instr(${cot}, '${s}') > 0`).join(" OR ")}`);
  assert.equal(lo[0].n, 0, "nhật ký không chứa mã giao dịch hay số tài khoản");
  const nk = await sqlRows("SELECT action, count(*) AS n FROM audit_log WHERE action IN ('ledger_bank_txn_linked', 'party_bank_account_changed') GROUP BY action");
  const dem = Object.fromEntries(nk.map((r) => [r.action, r.n]));
  assert.ok(dem.ledger_bank_txn_linked >= 6 && dem.party_bank_account_changed >= 2, `phải có dòng nhật ký (kiểm trên cột rỗng thì "sạch" vô nghĩa): ${JSON.stringify(dem)}`);
}
console.log("✓ nhật ký có dòng gắn mã và đổi tài khoản, không dòng nào chép mã giao dịch hay số tài khoản");
