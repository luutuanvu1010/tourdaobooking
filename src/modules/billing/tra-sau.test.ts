// Hạn mức và số nợ Trả sau ở `billing` (ADR-0168 Đ1, Đ2; kế hoạch 2026-11-05 Task 2). Khung thử thật (tests/audit/harness.mjs). Tên người / hồ sơ là GIẢ.
// Đơn Trả sau trong bài này được dựng bằng SQL (hình thức CREDIT khi còn nháp, rồi xác nhận qua route thường): cổng xác nhận là việc của Task 3.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { addDays, vnToday } from "../../shared/vn-date.ts";
import { cachBayGio, datMocTraSau } from "../../../tests/audit/tra-sau-moc.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const PT = "66666666-6666-4666-8666-666666666666"; // đại lý A — vai TRAVEL_AGENCY
const PT2 = "66666666-6666-4666-8666-666666666667"; // đại lý B
const ADMIN = "77777777-7777-4777-8777-777777777777";
const INTERN = "88888888-8888-4888-8888-888888888888";
const HR = "99999999-9999-4999-8999-999999999999";
const AT = "2026-10-01T00:00:00.000Z";
const HOM_NAY = () => vnToday(new Date());
let seq = 0;
const uuid = () => `98989898-9898-4989-8989-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

async function setup(): Promise<W> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [PT, "0900000008", "Đại Lý A", ["PARTNER"]], [PT2, "0900000018", "Đại Lý B", ["PARTNER"]], [ADMIN, "0900000010", "Quản Trị", ["ADMIN"]],
    [INTERN, "0900000011", "Thực Tập", ["INTERN"]], [HR, "0900000012", "Nhân Sự", ["HR"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
const datHanMuc = (w: W, partyId: string, hanMuc = 50_000_000, gioTra = 168, as = SUPER, gioAnHan = 0) =>
  w.call("POST", "/api/tra-sau/han-muc", { as, body: { partyId, hanMuc, gioTra, gioAnHan, lyDo: "đại lý lâu năm" } });
const danhSach = async (w: W, as = KT) => (await w.call("GET", "/api/tra-sau/han-muc", { as })).json.danhSach as { partyId: string; hanMuc: number | null; dangNo: number; conDuocDung: number | null; soDonQuaHan: number; soDonAnHan: number; soDonNo: number }[];
const dongCua = async (w: W, partyId: string) => (await danhSach(w)).find((d) => d.partyId === partyId);
const donNo = async (w: W, partyId: string) => (await w.call("GET", `/api/tra-sau/han-muc/${partyId}/don`, { as: KT })).json.don as { orderId: string; maDon: string; hanTra: string | null; no: number; trangThai: string }[];

/** Đơn Trả sau đã xác nhận của `booker`: tổng `tong`, hạn trả `han`, hết ân hạn `het` (mốc ISO; mặc định 7 ngày nữa, ân hạn 0). */
async function donTraSau(w: W, o: { booker?: string; tong?: number; han?: string; het?: string; chuDon?: string } = {}): Promise<string> {
  const id = uuid();
  const tong = o.tong ?? 1_000_000;
  const booker = o.booker ?? `pty-${PT}`;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, payment_term, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, 0, ?, ?, ?, 'CREDIT', ?, ?)`).run(id, `TD-TS-${seq}`, SALES, tong, tong, tong, booker, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'HONTAM', 'Tour đảo', 'perPax', 1, ?)`).run(`${id}-s`, id, addDays(HOM_NAY(), 30));
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, ?, ?, ?)`)
    .run(`${id}-i`, id, `${id}-s`, tong, tong, tong);
  const xn = await w.xacNhanDon(id, SALES);
  assert.equal(xn.status, 200, xn.text);
  const han = o.han ?? cachBayGio(168);
  datMocTraSau(w.sqlite, id, han, o.het ?? han);
  if (o.chuDon) w.sqlite.prepare("UPDATE orders SET staff_id = ? WHERE id = ?").run(o.chuDon, id); // đơn của đối tác: để đối tác tự ghi «Tôi thu»
  return id;
}
const thu = (w: W, as: string, orderId: string, body: unknown) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body });

test("quyền (ADR-0172 Đ1): Toàn quyền đặt; Quản trị chưa có mức tối đa thì không đặt; Kế toán, Quản trị xem được; Bán hàng, Nhân sự, Thực tập, Đối tác không đặt và không xem", async () => {
  const w = await setup();
  assert.equal((await datHanMuc(w, `pty-${PT}`)).status, 201);
  const d = await dongCua(w, `pty-${PT}`);
  assert.deepEqual([d?.hanMuc, d?.dangNo, d?.conDuocDung], [50_000_000, 0, 50_000_000]);
  for (const as of [KT, SALES, ADMIN, HR, INTERN, PT]) assert.equal((await datHanMuc(w, `pty-${PT2}`, 1_000_000, 72, as)).status, 403, `đặt: ${as}`);
  assert.equal(await dongCua(w, `pty-${PT2}`), undefined, "chống bài rỗng: không ai trong số bị từ chối đặt được");
  assert.equal((await w.call("GET", "/api/tra-sau/han-muc", { as: SUPER })).status, 200);
  assert.equal((await w.call("GET", "/api/tra-sau/han-muc", { as: ADMIN })).status, 200, "Quản trị xem được (ADR-0172 trang ghép (2))");
  for (const as of [SALES, HR, INTERN, PT]) {
    const r = await w.call("GET", "/api/tra-sau/han-muc", { as });
    assert.equal(r.status, 403, `xem: ${as}`);
    assert.doesNotMatch(r.text, /50000000/);
  }
  assert.equal((await w.call("GET", `/api/tra-sau/han-muc/pty-${PT}/don`, { as: PT })).status, 403);
  assert.equal((await w.call("POST", `/api/tra-sau/han-muc/pty-${PT}/ngung`, { as: KT, body: {} })).status, 403);
});

test("hồ sơ nội bộ bị từ chối 409; đầu vào sai 400; hồ sơ lạ 404", async () => {
  const w = await setup();
  assert.equal((await datHanMuc(w, `pty-${SALES}`)).status, 409);
  assert.equal((await datHanMuc(w, `pty-${PT}`, 0)).status, 400);
  assert.equal((await datHanMuc(w, `pty-${PT}`, 1000, 8761)).status, 400, "thời hạn quá 365 ngày");
  assert.equal((await datHanMuc(w, `pty-${PT}`, 1000, 0)).status, 400, "thời hạn 0 giờ");
  assert.equal((await datHanMuc(w, `pty-${PT}`, 1000, 36, SUPER, -1)).status, 400, "ân hạn âm");
  assert.equal((await datHanMuc(w, `pty-${PT}`, 1000, 36, SUPER, 8761)).status, 400, "ân hạn quá 365 ngày");
  assert.equal((await w.call("POST", "/api/tra-sau/han-muc", { as: SUPER, body: { partyId: `pty-${PT}`, hanMuc: 1000, gioTra: 36 } })).status, 400, "thiếu ân hạn");
  assert.equal((await datHanMuc(w, `pty-${PT}`, 1.5)).status, 400);
  assert.equal((await datHanMuc(w, "khong-co-ho-so")).status, 404);
  assert.equal(w.q("SELECT count(*) AS n FROM bil_credit_limit")[0].n, 0);
});

test("đổi hạn mức trong cùng ngày: dòng cũ đóng, dòng mới áp; ngừng thì hết hạn mức; nhật ký không có số điện thoại", async () => {
  const w = await setup();
  assert.equal((await datHanMuc(w, `pty-${PT}`, 50_000_000, 168)).status, 201);
  assert.equal((await datHanMuc(w, `pty-${PT}`, 20_000_000, 36, SUPER, 12)).status, 201);
  assert.deepEqual([(await dongCua(w, `pty-${PT}`))?.hanMuc], [20_000_000]);
  assert.equal(w.q("SELECT count(*) AS n FROM bil_credit_limit")[0].n, 2, "chỉ thêm, không ghi đè");
  assert.equal((await w.call("POST", `/api/tra-sau/han-muc/pty-${PT}/ngung`, { as: SUPER, body: {} })).status, 200);
  assert.equal((await dongCua(w, `pty-${PT}`))?.hanMuc ?? null, null, "hết hạn mức ⇒ chỉ trả trước");
  assert.equal((await w.call("POST", `/api/tra-sau/han-muc/pty-${PT}/ngung`, { as: SUPER, body: {} })).status, 404, "không còn hạn mức để ngừng");
  const nk = w.q("SELECT action, detail FROM audit_log WHERE action IN ('credit_limit_set', 'credit_limit_stopped') ORDER BY rowid");
  assert.deepEqual(nk.map((x) => x.action), ["credit_limit_set", "credit_limit_set", "credit_limit_stopped"]);
  assert.doesNotMatch(JSON.stringify(nk), /09\d{8}|@/);
});

test("nợ: công ty thu thì giảm đúng số; trả dư ở đơn A không làm nhẹ đơn B; đơn nháp và đơn huỷ chưa mở vé không tính", async () => {
  const w = await setup();
  await datHanMuc(w, `pty-${PT}`);
  const a = await donTraSau(w, { tong: 1_000_000 });
  const b = await donTraSau(w, { tong: 2_000_000 });
  assert.equal((await dongCua(w, `pty-${PT}`))?.dangNo, 3_000_000);
  assert.equal((await thu(w, KT, a, { soTien: 400_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  let d = await dongCua(w, `pty-${PT}`);
  assert.deepEqual([d?.dangNo, d?.conDuocDung], [2_600_000, 47_400_000]);
  assert.equal((await thu(w, KT, a, { soTien: 900_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201, "trả dư 300.000 ở đơn A");
  d = await dongCua(w, `pty-${PT}`);
  assert.equal(d?.dangNo, 2_000_000, "đơn A hết nợ, phần dư không giảm nợ đơn B");
  assert.deepEqual((await donNo(w, `pty-${PT}`)).map((x) => [x.orderId, x.no]), [[b, 2_000_000]], "đơn hết nợ không nằm trong danh sách");
  const nhap = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, payment_term, created_at, updated_at)
    VALUES (?, 'TD-NHAP', ?, 'draft', 'K', '0900000099', 5000000, 0, 5000000, 5000000, ?, 'CREDIT', ?, ?)`).run(nhap, SALES, `pty-${PT}`, AT, AT);
  assert.equal((await dongCua(w, `pty-${PT}`))?.dangNo, 2_000_000, "đơn nháp không tính");
});

test("đối tác tự ghi «Tôi thu» không làm nợ trống ra; Kế toán ghi đối tác đã nộp thì nợ giảm đúng số; khoản đang đối chiếu chưa giảm nợ", async () => {
  const w = await setup();
  await datHanMuc(w, `pty-${PT}`);
  const a = await donTraSau(w, { tong: 1_000_000, chuDon: PT });
  assert.equal((await thu(w, PT, a, { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201, "đối tác tự thu đủ tiền đơn");
  assert.equal((await dongCua(w, `pty-${PT}`))?.dangNo, 1_000_000, "tiền còn ở tay đối tác: nợ nguyên");
  const nop = await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: `pty-${PT}`, phanBo: [{ orderId: a, soTien: 300_000 }] } });
  assert.equal(nop.status, 201, nop.text);
  assert.equal((await dongCua(w, `pty-${PT}`))?.dangNo, 700_000);
  // khoản chuyển khoản do người không phải Kế toán khai «Công ty thu» = đang đối chiếu
  const b = await donTraSau(w, { tong: 500_000 });
  assert.equal((await thu(w, SALES, b, { soTien: 500_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201);
  assert.equal(w.q("SELECT count(*) AS n FROM bil_receipt_recon WHERE kind_code = 'DECLARED'")[0].n, 1, "chống bài rỗng: khoản đang chờ đối chiếu");
  assert.equal((await dongCua(w, `pty-${PT}`))?.dangNo, 1_200_000, "đang đối chiếu chưa giảm nợ");
});

test("đơn đã giao mà tiền còn ở tay đối tác vẫn tính nợ", async () => {
  const w = await setup();
  await datHanMuc(w, `pty-${PT}`);
  const a = await donTraSau(w, { tong: 1_000_000, chuDon: PT });
  assert.equal((await thu(w, PT, a, { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ?, updated_at = ? WHERE id = ?").run(AT, SALES, AT, a);
  assert.equal((await dongCua(w, `pty-${PT}`))?.dangNo, 1_000_000);
});

test("quá hạn theo giờ (ADR-0172 Đ3 mục 3): trong hạn và trong ân hạn không tính quá hạn; hết ân hạn còn nợ mới tính", async () => {
  const w = await setup();
  await datHanMuc(w, `pty-${PT}`);
  await donTraSau(w, { han: cachBayGio(1), het: cachBayGio(13) });
  assert.deepEqual([(await dongCua(w, `pty-${PT}`))?.soDonQuaHan], [0]);
  await donTraSau(w, { han: cachBayGio(-1), het: cachBayGio(11) }); // qua hạn trả 1 giờ, còn 11 giờ ân hạn
  let d = await dongCua(w, `pty-${PT}`);
  assert.deepEqual([d?.soDonAnHan, d?.soDonQuaHan, d?.soDonNo], [1, 0, 2]);
  await donTraSau(w, { han: cachBayGio(-13), het: cachBayGio(-1) }); // hết ân hạn 1 giờ trước
  d = await dongCua(w, `pty-${PT}`);
  assert.deepEqual([d?.soDonAnHan, d?.soDonQuaHan, d?.soDonNo], [1, 1, 3]);
  assert.deepEqual((await donNo(w, `pty-${PT}`)).map((x) => x.trangThai).sort(), ["an_han", "qua_han", "trong_han"]);
  assert.match((await donNo(w, `pty-${PT}`))[0]!.hanTra!, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "hạn trả là mốc giờ đầy đủ");
});

test("đường đọc hẹp con-duoc-dung: Đối tác luôn bị ép về hồ sơ của mình; Kế toán và Nhân sự không dùng; không kèm danh sách đơn", async () => {
  const w = await setup();
  await datHanMuc(w, `pty-${PT}`, 10_000_000);
  await donTraSau(w, { tong: 4_000_000 });
  const cua = (as: string, q = "") => w.call("GET", `/api/tra-sau/con-duoc-dung${q}`, { as });
  let r = await cua(PT, `?benDat=pty-${PT2}`);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([r.json.coHanMuc, r.json.conDuocDung, r.json.coDonQuaHan], [true, 6_000_000, false], "bỏ qua benDat, đọc số của chính mình");
  assert.equal(Object.keys(r.json).sort().join(), "coDonQuaHan,coHanMuc,conDuocDung", "không lộ thêm trường nào");
  r = await cua(PT2, `?benDat=pty-${PT}`);
  assert.deepEqual([r.status, r.json.coHanMuc, r.json.conDuocDung], [200, false, 0], "đối tác B không thấy số của A");
  r = await cua(SALES, `?benDat=pty-${PT}`);
  assert.deepEqual([r.status, r.json.conDuocDung], [200, 6_000_000]);
  for (const as of [KT, HR]) assert.equal((await cua(as, `?benDat=pty-${PT}`)).status, 403, as);
  assert.equal((await cua(SALES, "?benDat=a%20b")).status, 400);
});

test("số câu truy vấn của đường đọc nợ không tăng theo số đơn", async () => {
  const w = await setup();
  await datHanMuc(w, `pty-${PT}`);
  const dem = async (): Promise<number> => {
    let n = 0;
    const goc = w.sqlite.prepare.bind(w.sqlite);
    w.sqlite.prepare = ((sql: string) => (n++, goc(sql))) as typeof w.sqlite.prepare;
    try {
      assert.equal((await w.call("GET", `/api/tra-sau/han-muc/pty-${PT}/don`, { as: KT })).status, 200);
    } finally {
      w.sqlite.prepare = goc;
    }
    return n;
  };
  await donTraSau(w);
  await dem(); // khởi động phiên đăng nhập của Kế toán (câu của phiên không tính)
  const mot = await dem();
  for (let i = 0; i < 5; i++) await donTraSau(w);
  assert.equal((await donNo(w, `pty-${PT}`)).length, 6, "chống bài rỗng: sáu đơn còn nợ");
  assert.equal(await dem(), mot, "số câu truy vấn không đổi khi số đơn tăng từ 1 lên 6");
});
