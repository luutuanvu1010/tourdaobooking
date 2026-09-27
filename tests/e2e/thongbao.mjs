// Hộp thông báo (ADR-0034): tin về đơn là hình chiếu của nhật ký; K1 ẩn tên; E3; hai ngăn; số chưa đọc = danh sách.
// Task 5 chưa có route GỬI (Task 6) nên tin thủ công được SEED THẲNG bằng sql() — không có route gửi không có nghĩa là không kiểm
// được hộp đọc: seed để "Của tôi" không rỗng, nếu không các phép so KHỚP (tom-tat === danh sách, mở hộp = đọc hết, tài khoản mới = 0)
// đều đúng một cách vô nghĩa trên tập rỗng (advisor review 2026-09-27: "check it first: I expect all three to be 0 on a fresh D1").
//
// Ca "lập đơn kèm HDV → đúng một tin lap, không giao, không cho_nhan" (mục "Phụ thuộc ADR-0030" điểm 4 của kế hoạch) CHƯA thêm ở đây:
// ADR-0030 Task 1.3 (chọn HDV lúc lập ghi created + order_handler_changed CÙNG mốc) chưa lên main. Thêm khi nhánh đó gộp.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, call, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows } from "./lib.mjs";

const A = await session(ACCOUNTS.salesA), B = await session(ACCOUNTS.salesB), KT = await session(ACCOUNTS.accountant), TQ = await session(ACCOUNTS.superAdmin);
assert.equal((await call(null, "GET", "/api/thong-bao")).status, 401);

const idOf = async (phone) => (await sqlRows(`SELECT id FROM staff WHERE phone = '${phone}'`))[0].id;
const tqId = await idOf(ACCOUNTS.superAdmin.phone);
const ktId = await idOf(ACCOUNTS.accountant.phone);

/** Seed thẳng một tin thủ công (không qua route gửi — Task 6). `tag`: 'noi-bo' hoặc 'quyen:<QUYỀN>'. */
const seedNotice = async ({ quanTrong = 1, createdAt = new Date().toISOString(), tag = "noi-bo" } = {}) => {
  const id = randomUUID();
  await sql(`INSERT INTO ntf_notice (id, tieu_de, noi_dung, quan_trong, client_request_id, created_at, created_by, updated_at, updated_by)
    VALUES ('${id}', 'Kiểm tin e2e', 'Nội dung kiểm tra thongbao.mjs', ${quanTrong ? 1 : 0}, '${randomUUID()}', '${createdAt}', '${tqId}', '${createdAt}', '${tqId}')`);
  await sql(`INSERT INTO ntf_notice_target (notice_id, tag, created_at, created_by, updated_at, updated_by)
    VALUES ('${id}', '${tag}', '${createdAt}', '${tqId}', '${createdAt}', '${tqId}')`);
  return id;
};
const revoke = (id) => sql(`UPDATE ntf_notice SET valid_to = '${new Date().toISOString()}' WHERE id = '${id}'`);

// A lập đơn (không chọn người phụ trách) trên danh mục giả.
await ensureFakeCatalog();
const taoDon = async (cookie) => {
  const x = await call(cookie, "POST", "/api/orders", orderInput());
  assert.equal(x.status, 201, JSON.stringify(x.body));
  return x.body.order; // có .id và .orderCode
};
const don = await taoDon(A);
const tatKT = (await call(KT, "GET", "/api/thong-bao?ngan=tat-ca")).body;
const tin = tatKT.tin.find((t) => t.maDon === don.orderCode);
assert.ok(tin && tin.cau.startsWith(ACCOUNTS.salesA.name + " vừa lập đơn"), "Kế toán thấy tên người lập");
assert.equal(tin.cuaToi, false);
const tatB = await call(B, "GET", "/api/thong-bao?ngan=tat-ca");
const tinB = tatB.body.tin.find((t) => t.maDon === don.orderCode);
assert.ok(tinB, "B thấy tin lập đơn ở ngăn Tất cả");
// Chỉ kiểm tin của ĐÚNG đơn này: dữ liệu e2e cũ (dispatch.mjs, orders.mjs) có đơn A lập mà B phụ trách → B được thấy tên A hợp lệ ở đó.
assert.ok(!JSON.stringify(tinB).includes(ACCOUNTS.salesA.name), "K1: Bán hàng B không thấy tên A ở đơn không phải của mình");
const tuA = (await call(A, "GET", "/api/thong-bao?ngan=tat-ca")).body;
assert.ok(!tuA.tin.some((t) => t.maDon === don.orderCode), "E3: A không thấy tin của chính mình");
console.log("✓ tin về đơn: K1, E3");

// Seed một tin thủ công "noi-bo", quan trọng, người gửi TQ (superAdmin) — làm hộp "Của tôi" của KT không rỗng.
const tin1 = await seedNotice();
const tqTat = (await call(TQ, "GET", "/api/thong-bao?ngan=tat-ca")).body;
assert.ok(!tqTat.tin.some((t) => t.id === tin1), "K6: người gửi (TQ) không thấy tin thủ công của chính mình");
console.log("✓ K6: người gửi không thấy tin của chính mình");

// Số chưa đọc = số tin cuaToi&&chuaDoc; mở hộp = đọc hết. KIỂM TRƯỚC là hộp có nội dung thật (advisor: tránh bài kiểm vô nghĩa trên tập rỗng).
const ttKtTruoc = (await call(KT, "GET", "/api/thong-bao/tom-tat")).body;
assert.ok(ttKtTruoc.soChuaDoc >= 1, "hộp của KT phải có ít nhất tin1 chưa đọc trước khi kiểm các phép so khớp bên dưới");
for (const c of [A, B, KT]) {
  const tt = (await call(c, "GET", "/api/thong-bao/tom-tat")).body;
  const cua = (await call(c, "GET", "/api/thong-bao?ngan=cua-toi")).body;
  assert.equal(tt.soChuaDoc, cua.tin.filter((t) => t.chuaDoc).length);
}
assert.equal((await call(KT, "POST", "/api/account/thong-bao/da-doc")).status, 200);
assert.equal((await call(KT, "GET", "/api/thong-bao/tom-tat")).body.soChuaDoc, 0);
console.log("✓ số chưa đọc khớp danh sách (không vô nghĩa: trước ≥ 1, sau = 0); mở hộp = đọc hết");

// Tài khoản mới tạo sau khi có tin: không đổ dồn tin cũ (mốc = ngày tạo tài khoản) — Review Focus 4.
// Đối chứng ÂM đi kèm (advisor): created_at CŨ hơn tin đã seed phải cho lại số > 0, chứng minh ca dương ở trên không phải luôn-luôn-0.
await sql(`UPDATE staff SET created_at = '${new Date().toISOString()}' WHERE phone = '${ACCOUNTS.accountant.phone}'`);
await sql(`DELETE FROM ntf_read_mark WHERE staff_id = '${ktId}'`);
assert.equal((await call(KT, "GET", "/api/thong-bao/tom-tat")).body.soChuaDoc, 0, "tài khoản 'mới' (created_at = now) không thấy tin cũ");
await sql(`UPDATE staff SET created_at = '2026-01-01T00:00:00.000Z' WHERE phone = '${ACCOUNTS.accountant.phone}'`);
await sql(`DELETE FROM ntf_read_mark WHERE staff_id = '${ktId}'`);
assert.ok(
  (await call(KT, "GET", "/api/thong-bao/tom-tat")).body.soChuaDoc >= 1,
  "đối chứng: created_at cũ hơn tin1 → phải thấy lại tin chưa đọc (chứng minh ca 'tài khoản mới' ở trên có ý nghĩa)",
);
console.log("✓ tài khoản mới không bị đổ dồn tin cũ (kèm đối chứng âm)");

// chuanHoaMocGio: staff.createdAt thiếu mili-giây vẫn phải so đúng thứ tự với một sự kiện xảy ra rất gần sau đó, CÙNG GIÂY.
// Cả hai mốc là CHUỖI CỐ ĐỊNH do kịch bản viết — không phụ thuộc thời gian trôi qua thật, không chập chờn.
const giayTron = new Date(); giayTron.setUTCMilliseconds(0);
const thieuMs = giayTron.toISOString().replace(/\.\d{3}Z$/, "Z"); // "…T…:SSZ" — dạng staff.createdAt có thể thiếu mili-giây
const sau500ms = new Date(giayTron.getTime() + 500).toISOString(); // cùng giây, 500ms sau
await sql(`UPDATE staff SET created_at = '${thieuMs}' WHERE phone = '${ACCOUNTS.accountant.phone}'`);
await sql(`DELETE FROM ntf_read_mark WHERE staff_id = '${ktId}'`);
const tinChuan = await seedNotice({ quanTrong: false, createdAt: sau500ms });
const cuaSauChuan = (await call(KT, "GET", "/api/thong-bao?ngan=cua-toi")).body;
const dongChuan = cuaSauChuan.tin.find((t) => t.id === tinChuan);
assert.ok(
  dongChuan && dongChuan.chuaDoc === true,
  "chuanHoaMocGio: tin 500ms SAU mốc thiếu mili-giây phải hiện CHƯA đọc (thiếu chuẩn hoá sẽ so chuỗi sai — 'Z' > '.' — và báo ĐÃ đọc)",
);
console.log("✓ chuanHoaMocGio: mốc thiếu mili-giây vẫn so đúng thứ tự thời gian thật");

// R5: route "đã hiểu" tra thẳng theo id, KHÔNG qua cửa sổ 30 ngày — tin quan trọng quá hạn giữ vẫn tìm được; bấm hai lần vẫn OK, cùng `luc`.
const cu40Ngay = new Date(Date.now() - 40 * 86400000).toISOString();
const tinCu = await seedNotice({ quanTrong: true, createdAt: cu40Ngay, tag: "quyen:ACCOUNTING" });
assert.equal((await call(A, "POST", `/api/account/thong-bao/${tinCu}/da-hieu`)).status, 404, "A (SALES) không thuộc nhóm nhận quyen:ACCOUNTING → 404");
const hieu1 = await call(KT, "POST", `/api/account/thong-bao/${tinCu}/da-hieu`);
assert.equal(hieu1.status, 200);
assert.equal(hieu1.body.ok, true);
const hieu2 = await call(KT, "POST", `/api/account/thong-bao/${tinCu}/da-hieu`);
assert.equal(hieu2.status, 200, "bấm lần hai với tin đã hiểu vẫn OK dù đã quá 30 ngày giữ (đặc tả §7) — không 404");
assert.equal(hieu2.body.luc, hieu1.body.luc, "lần hai trả lại đúng mốc đã hiểu lần đầu, không tạo ack mới");
assert.equal((await sqlRows(`SELECT COUNT(*) AS n FROM ntf_ack WHERE notice_id = '${tinCu}'`))[0].n, 1, "chỉ một dòng ack dù bấm hai lần");
assert.equal(
  (await sqlRows(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'notice_acknowledged' AND target_id = '${tinCu}'`))[0].n,
  1,
  "chỉ một dòng nhật ký notice_acknowledged dù bấm hai lần",
);
await revoke(tinCu);
assert.equal((await call(KT, "POST", `/api/account/thong-bao/${tinCu}/da-hieu`)).status, 404, "tin đã thu hồi (valid_to) → 404 dù trước đó đã 'Đã hiểu'");
console.log("✓ R5: đã hiểu tra thẳng theo id (không qua cửa sổ 30 ngày); bấm hai lần vẫn OK; thu hồi → 404");

// Đã hiểu: tin không tồn tại → 404
assert.equal((await call(A, "POST", `/api/account/thong-bao/${randomUUID()}/da-hieu`)).status, 404);

// Dọn tin quan trọng còn treo (chưa hiểu) để không lọt sang kịch bản chạy sau trong cùng D1 (thongbao đứng trước maintenance/roles/passkey).
await revoke(tin1);

// Task 6: Toàn quyền gửi, thu hồi, xem đã gửi, xem ai đã hiểu (ADR-0034 điều 5–9)
const ADMIN = await session(ACCOUNTS.admin);
// Tài khoản CHỈ Đối tác: tạo thẳng bằng permissions ["PARTNER"] (thay cách đổi vai — rà soát trước thi công, mục R6).
const dtPhone = randomPhone();
let rr = await call(ADMIN, "POST", "/api/staff", { fullName: `Đối Tác ${Date.now().toString(36)}`, phone: dtPhone, permissions: ["PARTNER"] });
assert.equal(rr.status, 201, JSON.stringify(rr.body));
const DT = (await login(dtPhone, rr.body.pin)).cookie;
const than = (o = {}) => ({
  tieuDe: "Đổi cổng đón Cầu Đá", noiDung: "Từ 01/10 đón ở cổng số 2.\nĐến sớm 15 phút.",
  nguoiNhan: "noi-bo", quanTrong: true, clientRequestId: randomUUID(), ...o,
});
assert.equal((await call(ADMIN, "POST", "/api/thong-bao", than())).status, 403, "Quản trị không gửi được (chỉ Toàn quyền)");
assert.equal((await call(TQ, "POST", "/api/thong-bao", than())).status, 201);
// R6: tin chống trùng gửi với quanTrong: false, không để lại dải nhắc trên DB dev.
const b = than({ tieuDe: "Tin chống trùng", quanTrong: false });
const r1 = await call(TQ, "POST", "/api/thong-bao", b), r2 = await call(TQ, "POST", "/api/thong-bao", b);
assert.equal(r1.body.id, r2.body.id, "gửi lại cùng clientRequestId → cùng tin (chống bấm hai lần / mạng chậm)");
assert.equal((await call(TQ, "POST", "/api/thong-bao", than({ tieuDe: "" }))).status, 400);
console.log("✓ gửi: chỉ Toàn quyền, chống trùng, kiểm đầu vào");

const tt = (await call(A, "GET", "/api/thong-bao/tom-tat")).body;
const qt = tt.quanTrongChuaHieu.find((x) => x.tieuDe === "Đổi cổng đón Cầu Đá");
assert.ok(qt, "Bán hàng thấy tin quan trọng ở dải");
assert.equal((await call(A, "POST", `/api/account/thong-bao/${qt.id}/da-hieu`)).status, 200);
assert.ok(!(await call(A, "GET", "/api/thong-bao/tom-tat")).body.quanTrongChuaHieu.some((x) => x.id === qt.id), "bấm Đã hiểu → dải tắt");
// Bấm lần hai vẫn OK, cùng mốc (đặc tả §7).
const hieuLai1 = await call(A, "POST", `/api/account/thong-bao/${qt.id}/da-hieu`);
assert.equal(hieuLai1.status, 200);
const hieuLai2 = await call(A, "POST", `/api/account/thong-bao/${qt.id}/da-hieu`);
assert.equal(hieuLai2.status, 200);
assert.equal(hieuLai2.body.luc, hieuLai1.body.luc, "bấm lại nhiều lần vẫn trả đúng mốc đã hiểu lần đầu");
// Người không thuộc nhóm nhận (Đối tác thuần, tin "noi-bo") bấm → 404.
assert.equal((await call(DT, "POST", `/api/account/thong-bao/${qt.id}/da-hieu`)).status, 404, "Đối tác thuần không thuộc nhóm nhận 'noi-bo' → 404");
const ai = (await call(TQ, "GET", `/api/thong-bao/${qt.id}/nguoi-da-hieu`)).body;
assert.ok(ai.daHieu.some((x) => x.ten === ACCOUNTS.salesA.name));
assert.equal((await call(ADMIN, "GET", `/api/thong-bao/${qt.id}/nguoi-da-hieu`)).status, 403);
const logGui = await sql(`SELECT detail FROM audit_log WHERE action LIKE 'notice_%'`);
assert.ok(!JSON.stringify(logGui).includes("cổng số 2"), "nhật ký không chép nội dung tin");
console.log("✓ đã hiểu (kể cả bấm lại), ai đã hiểu, người ngoài nhóm nhận → 404, nhật ký không chứa nội dung");

// K3: Đối tác thuần không nhận "Toàn công ty"
assert.ok(!(await call(DT, "GET", "/api/thong-bao?ngan=cua-toi")).body.tin.some((x) => x.id === qt.id));
console.log("✓ K3: Đối tác không nhận tin Toàn công ty");

assert.equal((await call(TQ, "POST", `/api/thong-bao/${qt.id}/thu-hoi`)).status, 200);
assert.equal((await call(TQ, "POST", `/api/thong-bao/${qt.id}/thu-hoi`)).status, 409);
assert.ok(!(await call(B, "GET", "/api/thong-bao?ngan=cua-toi")).body.tin.some((x) => x.id === qt.id), "thu hồi → biến khỏi hộp");
const s = (await call(TQ, "GET", "/api/thong-bao/da-gui")).body.tin.find((x) => x.id === qt.id);
assert.ok(s.thuHoiLuc);
console.log("✓ thu hồi");

console.log("THONGBAO OK");
