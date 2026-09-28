// Hộp thông báo (ADR-0034): tin về đơn là hình chiếu của nhật ký; K1 ẩn tên; E3; hai ngăn; số chưa đọc = danh sách.
// Phần đọc hộp (Task 5, phía đầu tệp) SEED THẲNG tin thủ công bằng sql() thay vì qua route GỬI — route thật (Task 6, phía dưới, "Toàn
// quyền gửi…") giờ đã có, nhưng seed vẫn giữ vì cần đặt created_at/quan_trong tuỳ ý (tin cũ 40 ngày, mốc thiếu mili-giây…) mà route
// không cho phép backdate. Không seed thì "Của tôi" rỗng và các phép so KHỚP (tom-tat === danh sách, mở hộp = đọc hết, tài khoản mới = 0)
// đều đúng một cách vô nghĩa trên tập rỗng (advisor review 2026-09-27: "check it first: I expect all three to be 0 on a fresh D1").
//
// Ca "lập đơn kèm HDV → đúng một tin lap, không giao, không cho_nhan" (mục "Phụ thuộc ADR-0030" điểm 4 của kế hoạch) CHƯA thêm ở đây:
// ADR-0030 Task 1.3 (chọn HDV lúc lập ghi created + order_handler_changed CÙNG mốc) chưa lên main. Thêm khi nhánh đó gộp.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, BASE, call, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows } from "./lib.mjs";

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

// A lập đơn KÈM chọn chính mình làm người phụ trách (ADR-0030 Task 1.3, đã lên main): "created" + "order_handler_changed" cùng mốc → MỘT tin
// "lap" (không "cho_nhan" — lập đơn KHÔNG chọn ai mới ra loại đó, chỉ tài khoản có dispatch.claim mới thấy, xem loaiTinDon).
await ensureFakeCatalog();
const aId = await idOf(ACCOUNTS.salesA.phone);
const taoDon = async (cookie, handlerStaffId = aId) => {
  const x = await call(cookie, "POST", "/api/orders", orderInput({ handlerStaffId }));
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
assert.equal(r1.status, 201, JSON.stringify(r1.body));
assert.equal(r2.status, 200, JSON.stringify(r2.body));
assert.ok(r1.body.id, "lần gửi đầu phải trả id");
assert.equal(r1.body.id, r2.body.id, "gửi lại cùng clientRequestId → cùng tin (chống bấm hai lần / mạng chậm)");
assert.equal(
  (await sqlRows(`SELECT COUNT(*) AS n FROM ntf_notice WHERE client_request_id = '${b.clientRequestId}'`))[0].n,
  1,
  "chỉ một dòng ntf_notice dù gửi hai lần cùng clientRequestId",
);
assert.equal((await call(TQ, "POST", "/api/thong-bao", than({ tieuDe: "" }))).status, 400);
// Mối lo 4 (điều phối, rà soát Task 6): hai yêu cầu gửi THẬT SỰ ĐỒNG THỜI (không tuần tự như ca trên) cùng clientRequestId vẫn chỉ một tin.
const dong = than({ tieuDe: "Tin đồng thời", quanTrong: false });
const [pa, pb] = await Promise.all([call(TQ, "POST", "/api/thong-bao", dong), call(TQ, "POST", "/api/thong-bao", dong)]);
assert.equal(pa.body.id, pb.body.id, "hai yêu cầu gửi đồng thời cùng clientRequestId → cùng một tin");
assert.deepEqual([pa.status, pb.status].sort(), [200, 201], "đúng một lần 201 (tạo mới) và một lần 200 (gửi lại), không lỗi 500");
assert.equal(
  (await sqlRows(`SELECT COUNT(*) AS n FROM ntf_notice WHERE client_request_id = '${dong.clientRequestId}'`))[0].n,
  1,
  "chỉ một dòng ntf_notice dù hai yêu cầu chạy đồng thời",
);
console.log("✓ gửi: chỉ Toàn quyền, chống trùng (tuần tự lẫn đồng thời), kiểm đầu vào");

const tt = (await call(A, "GET", "/api/thong-bao/tom-tat")).body;
const qt = tt.quanTrongChuaHieu.find((x) => x.tieuDe === "Đổi cổng đón Cầu Đá");
assert.ok(qt, "Bán hàng thấy tin quan trọng ở dải");
const guiHieu1 = await call(A, "POST", `/api/account/thong-bao/${qt.id}/da-hieu`);
assert.equal(guiHieu1.status, 200);
assert.ok(!(await call(A, "GET", "/api/thong-bao/tom-tat")).body.quanTrongChuaHieu.some((x) => x.id === qt.id), "bấm Đã hiểu → dải tắt");
// Bấm lại (lần hai) vẫn OK, cùng mốc lần đầu (đặc tả §7).
const guiHieu2 = await call(A, "POST", `/api/account/thong-bao/${qt.id}/da-hieu`);
assert.equal(guiHieu2.status, 200);
assert.equal(guiHieu2.body.luc, guiHieu1.body.luc, "bấm lại vẫn trả đúng mốc đã hiểu lần đầu, không đổi");
// K6 (mục 3, người kiểm độc lập): người GỬI (Toàn quyền) bấm Đã hiểu trên chính tin mình gửi → 404.
assert.equal((await call(TQ, "POST", `/api/account/thong-bao/${qt.id}/da-hieu`)).status, 404, "K6: người gửi bấm Đã hiểu trên tin của chính mình → 404");
// Người không thuộc nhóm nhận (Đối tác thuần, tin "noi-bo") bấm → 404.
assert.equal((await call(DT, "POST", `/api/account/thong-bao/${qt.id}/da-hieu`)).status, 404, "Đối tác thuần không thuộc nhóm nhận 'noi-bo' → 404");
const ai = (await call(TQ, "GET", `/api/thong-bao/${qt.id}/nguoi-da-hieu`)).body;
assert.ok(ai.daHieu.some((x) => x.ten === ACCOUNTS.salesA.name));
assert.equal((await call(ADMIN, "GET", `/api/thong-bao/${qt.id}/nguoi-da-hieu`)).status, 403);
// m1 (rà soát độc lập lượt 2, rẻ): soNguoiNhan ở da-gui đếm đúng nhóm nhận 'noi-bo', KHÔNG tính người GỬI (TQ) — đếm lại thẳng từ CSDL
// (mọi tài khoản active giữ ít nhất một quyền khác PARTNER, trừ chính TQ) để không phụ thuộc số tài khoản seed sẵn có thể đổi.
const noiBoKhacTQ = (
  await sqlRows(
    `SELECT COUNT(DISTINCT s.id) AS n FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.valid_to_at IS NULL
     WHERE s.active = 1 AND p.permission_type_code != 'PARTNER' AND s.id != '${tqId}'`,
  )
)[0].n;
const guiQt = (await call(TQ, "GET", "/api/thong-bao/da-gui")).body.tin.find((x) => x.id === qt.id);
assert.equal(guiQt.soNguoiNhan, noiBoKhacTQ, "soNguoiNhan không tính người gửi (TQ)");
assert.equal(guiQt.soDaHieu, 1, "đúng một người (Sales A) đã bấm Đã hiểu lúc này");
const logGui = await sql(`SELECT detail FROM audit_log WHERE action LIKE 'notice_%'`);
assert.ok(!JSON.stringify(logGui).includes("cổng số 2"), "nhật ký không chép nội dung tin");
console.log("✓ đã hiểu (kể cả bấm lại), ai đã hiểu, người ngoài nhóm nhận → 404, nhật ký không chứa nội dung");

// I-1 (Important, người kiểm độc lập, lượt sửa cuối): da-gui/nguoi-da-hieu phải loại NGƯỜI GỬI khỏi nhóm nhận, KHÔNG phải người
// đang XEM. Ca trên (TQ vừa gửi vừa xem) không bắt được lỗi này vì hai id trùng nhau — cần Toàn quyền THỨ HAI (Y) gửi, TQ (X) xem.
const yPhone = randomPhone();
let ry = await call(TQ, "POST", "/api/staff", { fullName: `Toàn Quyền Y ${Date.now().toString(36)}`, phone: yPhone, permissions: ["SUPER_ADMIN"] });
assert.equal(ry.status, 201, JSON.stringify(ry.body));
const Y = (await login(yPhone, ry.body.pin)).cookie;
const guiY = await call(Y, "POST", "/api/thong-bao", than({ tieuDe: "Tin của Y", quanTrong: false, clientRequestId: randomUUID() }));
assert.equal(guiY.status, 201, JSON.stringify(guiY.body));
const aiY = (await call(TQ, "GET", `/api/thong-bao/${guiY.body.id}/nguoi-da-hieu`)).body;
const tenTrongDanhSach = [...aiY.daHieu, ...aiY.chuaHieu].map((x) => x.ten);
assert.ok(tenTrongDanhSach.includes(ACCOUNTS.superAdmin.name), "X (người xem, khác người gửi) phải nằm trong danh sách vì X là người nhận thật");
assert.ok(!tenTrongDanhSach.some((t) => t.startsWith("Toàn Quyền Y")), "Y (người gửi) không được xuất hiện trong đã hiểu/chưa hiểu — Y không tự nhận tin của chính mình");
console.log("✓ I-1: da-gui/nguoi-da-hieu loại đúng người gửi (không phải người xem)");

// K3: Đối tác thuần không nhận "Toàn công ty"
assert.ok(!(await call(DT, "GET", "/api/thong-bao?ngan=cua-toi")).body.tin.some((x) => x.id === qt.id));
console.log("✓ K3: Đối tác không nhận tin Toàn công ty");

assert.equal((await call(TQ, "POST", `/api/thong-bao/${qt.id}/thu-hoi`)).status, 200);
assert.equal((await call(TQ, "POST", `/api/thong-bao/${qt.id}/thu-hoi`)).status, 409);
assert.ok(!(await call(B, "GET", "/api/thong-bao?ngan=cua-toi")).body.tin.some((x) => x.id === qt.id), "thu hồi → biến khỏi hộp");
const s = (await call(TQ, "GET", "/api/thong-bao/da-gui")).body.tin.find((x) => x.id === qt.id);
assert.ok(s.thuHoiLuc);
console.log("✓ thu hồi");

// ---- Web Push màn hình khoá (ADR-0036, Task 1): đăng ký/huỷ máy tự phục vụ + GET moi-nhat ---------------------------------
// (a) chưa đăng nhập → 401
assert.equal((await call(null, "GET", "/api/account/thong-bao/may")).status, 401);
assert.equal((await call(null, "GET", "/api/thong-bao/moi-nhat")).status, 401);
// (b) POST không Origin (và không Sec-Fetch-Site) → 403 (CSRF, trước khi vào handler — dùng DT vì đã có phiên hợp lệ)
const khongOrigin = await fetch(`${BASE}/api/account/thong-bao/may`, {
  method: "POST",
  headers: { cookie: DT, "content-type": "application/json" },
  body: JSON.stringify({ endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, thietBi: "Không Origin" }),
});
assert.equal(khongOrigin.status, 403, "POST không Origin → cross_origin 403");
console.log("✓ Web Push: chưa đăng nhập → 401 (may, moi-nhat); POST không Origin → 403");

// (c) tài khoản CHỈ Đối tác đăng ký được (ADR-0036 điều 1) → 200, soMay = 1
const ep1 = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
assert.equal((await call(DT, "GET", "/api/account/thong-bao/may")).body.soMay, 0, "trước khi đăng ký: soMay = 0");
const bat1 = await call(DT, "POST", "/api/account/thong-bao/may", { endpoint: ep1, thietBi: "iPhone của Đối tác" });
assert.equal(bat1.status, 200, JSON.stringify(bat1.body));
assert.equal((await call(DT, "GET", "/api/account/thong-bao/may")).body.soMay, 1, "Đối tác đăng ký được, soMay = 1");
// (d) đăng ký lại CÙNG endpoint (cùng người) → không đổi
assert.equal((await call(DT, "POST", "/api/account/thong-bao/may", { endpoint: ep1, thietBi: "iPhone của Đối tác" })).status, 200);
assert.equal((await call(DT, "GET", "/api/account/thong-bao/may")).body.soMay, 1, "đăng ký lại cùng máy → soMay không đổi");
// (e) tài khoản khác (B) đăng ký CÙNG endpoint (máy dùng chung đổi chủ) → soMay của DT về 0
const soMayBTruoc = (await call(B, "GET", "/api/account/thong-bao/may")).body.soMay;
const batB = await call(B, "POST", "/api/account/thong-bao/may", { endpoint: ep1, thietBi: "Máy dùng chung" });
assert.equal(batB.status, 200, JSON.stringify(batB.body));
assert.equal((await call(DT, "GET", "/api/account/thong-bao/may")).body.soMay, 0, "B đăng ký cùng endpoint → DT mất máy đó");
assert.equal((await call(B, "GET", "/api/account/thong-bao/may")).body.soMay, soMayBTruoc + 1, "B có thêm một máy đang bật");
assert.equal((await call(B, "POST", "/api/account/thong-bao/may/huy", { endpoint: ep1 })).status, 200); // dọn, không ảnh hưởng kịch bản sau
console.log("✓ Web Push: Đối tác đăng ký được; đăng ký lại idempotent; máy dùng chung đổi chủ đúng người");

// (g) endpoint không thuộc dịch vụ đẩy thật → 400
assert.equal((await call(DT, "POST", "/api/account/thong-bao/may", { endpoint: "https://example.com/x", thietBi: "Máy lạ" })).status, 400);
console.log("✓ Web Push: endpoint ngoài danh sách dịch vụ đẩy → 400");

// (f) huỷ {tatCa:true} → soMay = 0; KHÔNG xoá cứng (dòng vẫn còn, revoke_reason = dang-xuat)
const ep2 = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
assert.equal((await call(DT, "POST", "/api/account/thong-bao/may", { endpoint: ep1, thietBi: "Máy 1" })).status, 200); // ep1 vừa được B trả lại
assert.equal((await call(DT, "POST", "/api/account/thong-bao/may", { endpoint: ep2, thietBi: "Máy 2" })).status, 200);
assert.equal((await call(DT, "GET", "/api/account/thong-bao/may")).body.soMay, 2);
assert.equal((await call(DT, "POST", "/api/account/thong-bao/may/huy", { tatCa: true })).status, 200);
assert.equal((await call(DT, "GET", "/api/account/thong-bao/may")).body.soMay, 0, "huỷ tatCa → soMay = 0");
const dtId = (await sqlRows(`SELECT id FROM staff WHERE phone = '${dtPhone}'`))[0].id;
const conLai = await sqlRows(`SELECT endpoint, revoke_reason FROM ntf_push_sub WHERE staff_id = '${dtId}' AND revoke_reason = 'dang-xuat'`);
assert.equal(conLai.length, 2, "huỷ tatCa KHÔNG xoá cứng — 2 dòng vẫn còn, chỉ đổi revoked_at/revoke_reason");
console.log("✓ Web Push: huỷ tatCa → soMay = 0, không xoá cứng (revoke_reason = dang-xuat)");

// (h) moi-nhat = câu của tin CHƯA ĐỌC mới nhất ở ngăn "Của tôi"; sau khi Toàn quyền gửi tin cho nhóm PARTNER (nhóm của DT)
await call(DT, "POST", "/api/account/thong-bao/da-doc"); // mở hộp trước để mốc đọc sạch, không lẫn tin cũ
await new Promise((r) => setTimeout(r, 20)); // đảm bảo tin gửi sau strictly > mốc đọc (so chuỗi, cùng mili-giây sẽ không tính là mới)
const tieuDeDT = `Tin cho Đối tác ${Date.now().toString(36)}`;
const guiDT = await call(TQ, "POST", "/api/thong-bao", {
  tieuDe: tieuDeDT, noiDung: "Nội dung riêng cho Đối tác.", nguoiNhan: ["PARTNER"], quanTrong: false, clientRequestId: randomUUID(),
});
assert.equal(guiDT.status, 201, JSON.stringify(guiDT.body));
const moiNhat1 = (await call(DT, "GET", "/api/thong-bao/moi-nhat")).body;
assert.equal(moiNhat1.tin?.cau, tieuDeDT, "moi-nhat: cau = tiêu đề của tin thủ công chưa đọc mới nhất");
// ADR-0039: imLang = đang giờ yên lặng (22:00–06:00 giờ VN) VÀ tin không quan trọng (tin gửi ở trên quanTrong=false). Tính
// lại giờ VN ngay ở đây (KHÔNG import src/shared/web-push.ts — kịch bản e2e gọi API thật, không tái dùng luật server) để so.
const vnHourNay = new Date(Date.now() + 7 * 3600_000).getUTCHours();
const trongGioYenLangNay = vnHourNay >= 22 || vnHourNay < 6;
assert.equal(typeof moiNhat1.imLang, "boolean", "moi-nhat: imLang phải là boolean");
assert.equal(moiNhat1.imLang, trongGioYenLangNay, "moi-nhat: imLang khớp giờ yên lặng VN hiện tại (tin không quan trọng)");
assert.equal((await call(DT, "POST", "/api/account/thong-bao/da-doc")).status, 200);
const moiNhat2 = (await call(DT, "GET", "/api/thong-bao/moi-nhat")).body;
assert.equal(moiNhat2.tin, null, "sau da-doc: moi-nhat trả tin: null");
assert.equal(moiNhat2.imLang, trongGioYenLangNay, "moi-nhat: không có tin cụ thể vẫn theo giờ yên lặng (coi như không quan trọng)");
console.log("✓ Web Push: moi-nhat trả câu của tin chưa đọc mới nhất; null sau khi đã đọc; imLang khớp giờ yên lặng VN (ADR-0039)");

// (i) I-2 (vòng rà 2026-09-28): "mayNay" (đang bật ĐÚNG MÁY NÀY) chỉ đúng theo endpoint của CHÍNH tài khoản gọi — không suy từ
// soMay (tổng theo tài khoản, có thể nhiều máy), và không lộ máy của tài khoản khác dù hỏi đúng endpoint của họ.
const epI1 = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
const epI2 = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
assert.equal((await call(DT, "POST", "/api/account/thong-bao/may", { endpoint: epI1, thietBi: "Máy I1" })).status, 200);
assert.equal((await call(DT, "POST", "/api/account/thong-bao/may", { endpoint: epI2, thietBi: "Máy I2" })).status, 200);
assert.equal((await call(DT, "GET", "/api/account/thong-bao/may")).body.mayNay, false, "không hỏi endpoint → mayNay = false");
assert.equal((await call(DT, "GET", `/api/account/thong-bao/may?endpoint=${encodeURIComponent(epI1)}`)).body.mayNay, true, "epI1 đang bật → true");
assert.equal((await call(DT, "GET", `/api/account/thong-bao/may?endpoint=${encodeURIComponent(epI2)}`)).body.mayNay, true, "epI2 đang bật → true");
const epLa = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
assert.equal((await call(DT, "GET", `/api/account/thong-bao/may?endpoint=${encodeURIComponent(epLa)}`)).body.mayNay, false, "endpoint chưa từng đăng ký → false");
assert.equal((await call(DT, "POST", "/api/account/thong-bao/may/huy", { endpoint: epI1 })).status, 200);
assert.equal((await call(DT, "GET", `/api/account/thong-bao/may?endpoint=${encodeURIComponent(epI1)}`)).body.mayNay, false, "đã tắt epI1 → mayNay = false");
assert.equal((await call(DT, "GET", `/api/account/thong-bao/may?endpoint=${encodeURIComponent(epI2)}`)).body.mayNay, true, "epI2 chưa tắt → vẫn true");
assert.equal((await call(B, "GET", `/api/account/thong-bao/may?endpoint=${encodeURIComponent(epI2)}`)).body.mayNay, false, "tài khoản khác (B) hỏi đúng endpoint của DT → false, không lộ");
assert.equal((await call(DT, "POST", "/api/account/thong-bao/may/huy", { tatCa: true })).status, 200); // dọn
console.log("✓ I-2: mayNay đúng theo endpoint của CHÍNH tài khoản, không suy từ soMay, không lộ máy người khác");

// ---- Web Push (ADR-0036, Task 3): tự tắt máy ở cùng chỗ đóng Bảng tin; bảo trì không tắt; e2e KHÔNG có khoá VAPID (run.mjs ép rỗng) ----
/** Số máy đang bật của một tài khoản — đọc thẳng D1 (phiên của tài khoản đó có thể vừa bị thu hồi). */
const soMayCua = async (id) => (await sqlRows(`SELECT COUNT(*) AS n FROM ntf_push_sub WHERE staff_id = '${id}' AND revoked_at IS NULL`))[0].n;
/** Việc tắt máy chạy trong waitUntil SAU phản hồi → thăm dò tới 3 giây. */
const choSoMay = async (id, muon) => {
  const han = Date.now() + 3000;
  for (;;) {
    const n = await soMayCua(id);
    if (n === muon || Date.now() > han) return n;
    await new Promise((r) => setTimeout(r, 100));
  }
};
const taoTaiKhoan = async (permissions) => {
  const phone = randomPhone();
  const r = await call(ADMIN, "POST", "/api/staff", { fullName: `Máy ${Date.now().toString(36)}`, phone, permissions });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return { id: await idOf(phone), pin: r.body.pin, cookie: (await login(phone, r.body.pin)).cookie };
};
const batMay = async (cookie) => {
  const r = await call(cookie, "POST", "/api/account/thong-bao/may", { endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, thietBi: "Máy thử" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
};

// (a) đổi PIN của chính mình → mọi máy của người đó tắt (lý do tai-khoan-doi, không xoá cứng)
{
  const X = await taoTaiKhoan(["SALES"]);
  await batMay(X.cookie);
  assert.equal(await soMayCua(X.id), 1);
  const r = await call(X.cookie, "POST", "/api/account/change-pin", { currentPin: X.pin, newPin: X.pin === "582913" ? "582914" : "582913" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(await choSoMay(X.id, 0), 0, "đổi PIN → soMay = 0 trong 3 giây");
  const dong = await sqlRows(`SELECT revoke_reason, updated_by FROM ntf_push_sub WHERE staff_id = '${X.id}'`);
  assert.deepEqual(dong.map((d) => d.revoke_reason), ["tai-khoan-doi"], "không xoá cứng; lý do tai-khoan-doi");
  assert.equal(dong[0].updated_by, null, "tắt kèm khi tài khoản đổi = hệ thống (updated_by NULL), không ghi chủ máy");
}
console.log("✓ Web Push: đổi PIN → máy của người đó tự tắt");

// (b) Toàn quyền ngưng tài khoản có máy → tắt; bật lại tài khoản → máy KHÔNG tự bật lại
{
  const Y = await taoTaiKhoan(["SALES"]);
  await batMay(Y.cookie);
  assert.equal((await call(TQ, "PATCH", `/api/staff/${Y.id}`, { active: false })).status, 200);
  assert.equal(await choSoMay(Y.id, 0), 0, "ngưng tài khoản → soMay = 0");
  const dongY = await sqlRows(`SELECT updated_by FROM ntf_push_sub WHERE staff_id = '${Y.id}'`);
  assert.deepEqual(dongY.map((d) => d.updated_by), [null], "Toàn quyền ngưng → updated_by NULL (hệ thống), không ghi chủ máy");
  assert.equal((await call(TQ, "PATCH", `/api/staff/${Y.id}`, { active: true })).status, 200);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await soMayCua(Y.id), 0, "bật lại tài khoản → máy vẫn tắt (người dùng tự bật lại)");
}
console.log("✓ Web Push: ngưng tài khoản → máy tắt; bật lại không tự bật máy");

// (c) bật rồi tắt bảo trì → máy KHÔNG đổi (dongBangTin("tat-ca") chỉ đóng Bảng tin). Cách đặt SĐT được phép như bangtin.mjs ca 10.
{
  const Z = await taoTaiKhoan(["SALES"]);
  await batMay(Z.cookie);
  const SEED_ALLOWED = "0989929373";
  try {
    await sql(`UPDATE mnt_setting SET allowed_phones = '${ACCOUNTS.superAdmin.phone}' WHERE id = 'default'`);
    const r = await call(TQ, "PUT", "/api/maintenance", { on: true, endsAt: new Date(Date.now() + 30 * 60_000).toISOString() });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal((await call(TQ, "PUT", "/api/maintenance", { on: false })).status, 200);
  } finally {
    await call(TQ, "PUT", "/api/maintenance", { on: false }).catch(() => {});
    await sql(`UPDATE mnt_setting SET enabled = 0, ends_at = NULL, allowed_phones = '${SEED_ALLOWED}' WHERE id = 'default'`);
  }
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(await soMayCua(Z.id), 1, "bật/tắt bảo trì KHÔNG tắt máy");
}
console.log("✓ Web Push: bật/tắt bảo trì không tắt máy");

// (d) KHÔNG có khoá VAPID: có máy nhận mà gửi tin thủ công / lập đơn vẫn 201 như cũ, máy không bị đụng (thoát sớm trước mọi lần đọc D1 —
// run.mjs còn kiểm log máy chủ không có dòng `day_loi` nào sau cả lượt).
{
  const W = await taoTaiKhoan(["SALES"]);
  await batMay(W.cookie);
  const g = await call(TQ, "POST", "/api/thong-bao", { tieuDe: "Gõ cửa không khoá", noiDung: "Kiểm e2e.", nguoiNhan: ["SALES"], quanTrong: true, clientRequestId: randomUUID() });
  assert.equal(g.status, 201, JSON.stringify(g.body));
  await taoDon(W.cookie, null); // không chọn ai — loại tin không quan trọng ở ca này, chỉ cần 201 và không đụng máy
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await soMayCua(W.id), 1, "thiếu khoá → không gửi, không đánh dấu hết hiệu lực");
}
console.log("✓ Web Push: thiếu khoá VAPID → gửi tin / lập đơn vẫn 201, máy không bị đụng");

// (e) ADR-0046 (thay ADR-0036 điều 6): đổi quyền KHÔNG tắt máy; đăng xuất ({ endpoint, dangXuat: true }) chỉ tắt ĐÚNG máy đó, máy kia vẫn bật.
{
  const V = await taoTaiKhoan(["SALES"]);
  const epA = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
  const epB = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
  for (const [ep, ten] of [[epA, "Máy A"], [epB, "Máy B"]]) {
    const r = await call(V.cookie, "POST", "/api/account/thong-bao/may", { endpoint: ep, thietBi: ten });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  assert.equal(await soMayCua(V.id), 2);
  const doiQuyen = await call(ADMIN, "PUT", `/api/staff/${V.id}/permissions`, { permissions: ["SALES", "ACCOUNTING"] });
  assert.equal(doiQuyen.status, 200, JSON.stringify(doiQuyen.body));
  await new Promise((r) => setTimeout(r, 500)); // dongBangTin là bắn-và-quên — cho nó chạy xong trước khi đếm
  assert.equal(await soMayCua(V.id), 2, "ADR-0046: đổi quyền KHÔNG tắt máy");
  // Đổi quyền không đụng phiên đăng nhập (không "touch" credentials) → cookie cũ của V vẫn dùng được.
  const dx = await call(V.cookie, "POST", "/api/account/thong-bao/may/huy", { endpoint: epA, dangXuat: true });
  assert.equal(dx.status, 200, JSON.stringify(dx.body));
  const dongV = await sqlRows(`SELECT endpoint, revoke_reason FROM ntf_push_sub WHERE staff_id = '${V.id}' ORDER BY endpoint`);
  const theo = Object.fromEntries(dongV.map((d) => [d.endpoint, d.revoke_reason]));
  assert.equal(theo[epA], "dang-xuat", "máy đăng xuất: lý do dang-xuat");
  assert.equal(theo[epB], null, "ADR-0046: máy kia của cùng tài khoản vẫn bật");
  await call(V.cookie, "POST", "/api/account/thong-bao/may/huy", { tatCa: true }); // dọn
}
console.log("✓ Web Push (ADR-0046): đổi quyền không tắt máy; đăng xuất chỉ tắt đúng máy đó");

console.log("THONGBAO OK");
