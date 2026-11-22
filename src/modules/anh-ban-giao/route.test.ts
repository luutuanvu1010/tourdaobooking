// ADR-0232 «Ảnh bàn giao» qua ROUTE THẬT (tests/audit/harness.mjs + kho R2 giả `w.r2AnhBanGiao`). Mục «Bài kiểm» của ADR: ma trận vai (HDV phụ trách, tài xế
// công ty của chuyến, Kế toán xem, Đối tác / Thực tập sinh bị chặn), tải (415 Exif, 413, 409 đơn nháp, 409 chưa chính sách), xem (nhật ký trước, no-store), ẩn /
// xoá chỉ Toàn quyền, hạn giữ, biến thể 7B qua lô Thực hiện phiếu xoá của parties. Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const SA = "77777777-7777-4777-8777-777777777777";
const HDV = "33333333-3333-4333-8333-333333333333";
const HDV2 = "33333333-3333-4333-8333-333333333334";
const TX = "88888888-8888-4888-8888-888888888888";
const TX2 = "88888888-8888-4888-8888-888888888889";
const DT = "71717171-7171-4171-8171-717171717171";
const TTS = "66666666-6666-4666-8666-666666666666";
const AT = "2026-11-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `95959595-9595-4595-8595-${String(++seq).padStart(12, "0")}`;

/** JPEG tối giản sạch (JFIF, không Exif). `exif` = thêm đoạn APP1 Exif. */
function jpeg(exif = false, pad = 20): Uint8Array {
  const b = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  if (exif) b.push(0xff, 0xe1, 0x00, 0x0e, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8);
  b.push(0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0);
  for (let i = 0; i < pad; i++) b.push(0x22);
  b.push(0xff, 0xd9);
  return new Uint8Array(b);
}
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const than = (o: Record<string, unknown> = {}) => ({ anhNho: b64(jpeg()), anhXem: b64(jpeg(false, 40)), loaiViec: "GIAO_KHACH", ...o });

type W = ReturnType<typeof world>;
function setup(soNam: number | null = 5): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000004", "Lan Kế Toán", ["ACCOUNTING"]], [ADM, "0900000005", "Quản Trị", ["ADMIN"]],
    [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]], [HDV, "0900000003", "Hướng Dẫn", ["FIELD"]], [HDV2, "0900000013", "Hướng Dẫn Hai", ["FIELD"]],
    [TX, "0900000008", "Tài Xế", ["DRIVER"]], [TX2, "0900000018", "Tài Xế Hai", ["DRIVER"]], [DT, "0900000071", "Đối Tác", ["PARTNER"]], [TTS, "0900000006", "Thực Tập", ["INTERN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, photo_retention_years)
    VALUES ('pp1', 1, 'Mục đích', 'Nội dung', ?, ?, ?, ?, ?, ?)`).run(AT, AT, SA, AT, SA, soNam);
  return w;
}
/** Đơn ĐÃ XÁC NHẬN có một dịch vụ, một lượt đón; HDV phụ trách; tài xế TX lái chuyến chở lượt đón đó. */
function don(w: W, o: { status?: "draft" | "confirmed" } = {}): { id: string; leg: string; svc: string } {
  const id = uuid();
  const svc = `${id}-s`;
  const leg = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?)`).run(id, `TD-${seq}`, SALES, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, ?)`).run(svc, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1000000, 1000000)`).run(`${id}-i`, id, svc);
  w.sqlite.prepare(`INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES (?, ?, ?, 'OUT', ?, 'Khách sạn', ?, ?)`)
    .run(leg, id, svc, vnHomNay(), AT, AT);
  if ((o.status ?? "confirmed") === "confirmed") {
    w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
    gieoBanChup(w.sqlite, id);
  }
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  // Chuyến xe thô (bỏ khoá ngoại và trigger của bảng chuyến chỉ cho phần dựng — không phải điều đang kiểm): tài xế TX lái, chở lượt đón `leg`.
  w.sqlite.exec("PRAGMA foreign_keys = OFF");
  for (const t of w.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name LIKE 'vc\\_trip%' ESCAPE '\\'").all() as { name: string }[]) w.sqlite.exec(`DROP TRIGGER ${t.name}`);
  const trip = uuid();
  const ms = Date.now();
  w.sqlite.prepare(`INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, status, last_cmd_id, created_at, updated_at)
    VALUES (?, ?, 'xe-1', 'p-cty', ?, ?, ?, ?, 30, 'PLANNED', ?, ?, ?)`).run(trip, `CX-${seq}`, vnHomNay(), ms, ms + 3_600_000, ms, "c".repeat(36), AT, AT);
  w.sqlite.prepare("INSERT INTO vc_trip_driver (id, trip_id, driver_party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(uuid(), trip, `pty-${TX}`, AT, AT, AT);
  w.sqlite.prepare(`INSERT INTO vc_trip_allocation (id, trip_id, kind, leg_id, board_stop_id, status, valid_from_at, created_at, updated_at) VALUES (?, ?, 'PASSENGER', ?, 'st-x', 'WAITING', ?, ?, ?)`)
    .run(uuid(), trip, leg, AT, AT, AT);
  w.sqlite.exec("PRAGMA foreign_keys = ON");
  return { id, leg, svc };
}
const tai = (w: W, as: string, orderId: string, body: unknown = than()) => w.call("POST", `/api/anh-ban-giao/don/${orderId}`, { as, body });
const ds = (w: W, as: string, orderId: string) => w.call("GET", `/api/anh-ban-giao/don/${orderId}`, { as });
const xem = (w: W, as: string, anhId: string) => w.call("GET", `/api/anh-ban-giao/anh/${anhId}`, { as });
const n = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);
const soAnh = (w: W) => n(w, "SELECT count(*) AS n FROM abg_photo");
const soNhatKy = (w: W, action: string) => n(w, "SELECT count(*) AS n FROM audit_log WHERE action = ?", action);

test("HDV phụ trách gửi 2 ảnh ⇒ 201, đã lưu kho cả hai bản; hạn giữ = giờ tải + 5 năm (từ chính sách); nhật ký chỉ mã, không ghi chú", async () => {
  const w = setup();
  const { id } = don(w);
  const r1 = await tai(w, HDV, id, than({ ghiChu: "Giao vé ở sảnh khách sạn" }));
  assert.equal(r1.status, 201, r1.text);
  assert.equal(r1.json.daLuu, true);
  assert.equal((await tai(w, HDV, id)).status, 201);
  assert.equal(soAnh(w), 2);
  const row = w.q("SELECT created_at, retain_until, stored_at, thumb_key, view_key FROM abg_photo WHERE id = ?", r1.json.id)[0];
  assert.ok(row.stored_at);
  assert.equal(row.retain_until.slice(0, 4), String(Number(row.created_at.slice(0, 4)) + 5));
  assert.ok(w.r2AnhBanGiao.co(row.thumb_key) && w.r2AnhBanGiao.co(row.view_key), "hai đối tượng R2");
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'handover_photo_added'").map((x: any) => x.detail).join("|");
  assert.ok(!nk.includes("sảnh") && !nk.includes("abg/"), "nhật ký không mang ghi chú, khoá kho");
});

test("Kế toán, Quản trị, Bán hàng xem được danh sách kèm ảnh nhỏ; MỘT dòng nhật ký mỗi lượt; Đối tác, Thực tập sinh 403; HDV khác chỉ thấy ảnh mình gửi (không thấy gì)", async () => {
  const w = setup();
  const { id } = don(w);
  await tai(w, HDV, id);
  for (const as of [KT, ADM, SALES]) {
    const r = await ds(w, as, id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.anh.length, 1);
    assert.ok(r.json.anh[0].anhNho && r.json.anh[0].nguoiTai === "Hướng Dẫn");
    assert.ok(!JSON.stringify(r.json).includes("abg/"), "DTO không mang khoá kho");
  }
  assert.equal(soNhatKy(w, "handover_photo_list_viewed"), 3);
  assert.equal((await ds(w, DT, id)).status, 403);
  assert.equal((await ds(w, TTS, id)).status, 403);
  const k = await ds(w, HDV2, id);
  assert.equal(k.status, 200);
  assert.equal(k.json.anh.length, 0, "HDV khác không thấy ảnh người khác");
  assert.equal(soNhatKy(w, "handover_photo_list_viewed"), 3, "danh sách rỗng không ghi nhật ký");
});

test("tài xế công ty: tải được khi chọn lượt đón của chuyến mình lái; không chọn lượt đón / tài xế khác ⇒ 403; HDV không phụ trách ⇒ 403; Đối tác ⇒ 403", async () => {
  const w = setup();
  const { id, leg } = don(w);
  assert.equal((await tai(w, TX, id, than({ changId: leg, loaiViec: "GIAO_TAI_XE" }))).status, 201);
  assert.equal((await tai(w, TX, id)).status, 403, "tài xế không chọn lượt đón");
  assert.equal((await tai(w, TX2, id, than({ changId: leg }))).status, 403, "tài xế không lái chuyến này");
  assert.equal((await tai(w, HDV2, id)).status, 403);
  assert.equal((await tai(w, DT, id)).status, 403);
  assert.equal((await tai(w, TTS, id)).status, 403);
  assert.equal((await tai(w, KT, id)).status, 403, "Kế toán chỉ xem");
  assert.equal(soAnh(w), 1);
  const r = await ds(w, TX, id);
  assert.equal(r.json.anh.length, 1, "tài xế xem lại ảnh mình gửi");
});

test("tải: JPEG còn Exif ⇒ 415; không phải JPEG ⇒ 415; thân quá cỡ ⇒ 413; đơn nháp ⇒ 409; đơn không có ⇒ 404; dịch vụ của đơn khác ⇒ 400; chưa có chính sách số năm ⇒ 409", async () => {
  const w = setup();
  const a = don(w);
  const b = don(w);
  assert.equal((await tai(w, SALES, a.id, than({ anhXem: b64(jpeg(true)) }))).status, 415);
  assert.equal((await tai(w, SALES, a.id, than({ anhNho: b64(new TextEncoder().encode("<html></html>xxxx")) }))).status, 415);
  assert.equal((await tai(w, SALES, a.id, than({ anhXem: b64(jpeg(false, 620_000)) }))).status, 413);
  const nhap = don(w, { status: "draft" });
  assert.equal((await tai(w, SALES, nhap.id)).status, 409);
  assert.equal((await tai(w, SALES, "95959595-9595-4595-8595-999999999999")).status, 404);
  assert.equal((await tai(w, SALES, a.id, than({ dichVuId: b.svc }))).status, 400);
  assert.equal(soAnh(w), 0);
  const w2 = setup(null);
  const c = don(w2);
  const r = await tai(w2, SALES, c.id);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "no_photo_policy");
});

test("xem ảnh lớn: nhật ký TRƯỚC khi đọc kho, no-store + nosniff + CSP sandbox; Đối tác 403; HDV khác 403; mã lạ 404", async () => {
  const w = setup();
  const { id } = don(w);
  const anhId = (await tai(w, HDV, id)).json.id;
  const r = await xem(w, KT, anhId);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.match(r.headers.get("content-security-policy") ?? "", /sandbox/);
  assert.equal(soNhatKy(w, "handover_photo_viewed"), 1);
  assert.equal((await xem(w, DT, anhId)).status, 403);
  assert.equal((await xem(w, HDV2, anhId)).status, 403);
  assert.equal((await xem(w, HDV, anhId)).status, 200, "người tải xem lại ảnh mình");
  assert.equal((await xem(w, KT, "95959595-9595-4595-8595-999999999999")).status, 404);
  // Kho thiếu đối tượng: nhật ký vẫn ghi trước (đã kiểm quyền), trả 404.
  const key = w.q("SELECT view_key FROM abg_photo WHERE id = ?", anhId)[0].view_key;
  await w.r2AnhBanGiao.delete(key);
  assert.equal((await xem(w, KT, anhId)).status, 404);
});

test("ẩn: chỉ Toàn quyền, BẮT BUỘC lý do; ẩn rồi biến khỏi danh sách của Kế toán, Toàn quyền vẫn thấy (có nhãn) và mở được; ẩn hai lần 409; tệp vẫn còn trong kho", async () => {
  const w = setup();
  const { id } = don(w);
  const anhId = (await tai(w, HDV, id)).json.id;
  assert.equal((await w.call("POST", `/api/anh-ban-giao/anh/${anhId}/an`, { as: ADM, body: { lyDo: "Chụp nhầm đơn" } })).status, 403);
  assert.equal((await w.call("POST", `/api/anh-ban-giao/anh/${anhId}/an`, { as: SA, body: {} })).status, 400);
  assert.equal((await w.call("POST", `/api/anh-ban-giao/anh/${anhId}/an`, { as: SA, body: { lyDo: "Chụp nhầm đơn" } })).status, 200);
  assert.equal((await w.call("POST", `/api/anh-ban-giao/anh/${anhId}/an`, { as: SA, body: { lyDo: "Chụp nhầm đơn" } })).status, 409);
  assert.equal((await ds(w, KT, id)).json.anh.length, 0);
  assert.equal((await xem(w, KT, anhId)).status, 404);
  const sa = await ds(w, SA, id);
  assert.equal(sa.json.anh.length, 1);
  assert.equal(sa.json.anh[0].daAn, true);
  assert.equal((await xem(w, SA, anhId)).status, 200);
  const row = w.q("SELECT view_key, purged_at FROM abg_photo WHERE id = ?", anhId)[0];
  assert.equal(row.purged_at, null);
  assert.ok(w.r2AnhBanGiao.co(row.view_key));
});

test("xoá: chỉ Toàn quyền; HET_HAN trước hạn ⇒ 409 (trigger hạn giữ); ảnh lọt giấy tờ ⇒ xoá ngay, kho sạch; khách báo qua kênh liên hệ ⇒ xoá ngay, có yêu cầu nguồn KHACH", async () => {
  const w = setup();
  const { id } = don(w);
  const a1 = (await tai(w, HDV, id)).json.id;
  const a2 = (await tai(w, HDV, id)).json.id;
  const xoa = (as: string, anh: string, body: unknown) => w.call("POST", `/api/anh-ban-giao/anh/${anh}/xoa`, { as, body });
  assert.equal((await xoa(ADM, a1, { lyDo: "GIAY_TO_CHUP_NHAM", ghiChu: "Lọt căn cước của khách" })).status, 403);
  const hh = await xoa(SA, a1, { lyDo: "HET_HAN", ghiChu: "Thử xoá sớm" });
  assert.equal(hh.status, 409, hh.text);
  assert.equal(hh.json.error.code, "retention_hold");
  assert.equal((await xoa(SA, a1, { lyDo: "GIAY_TO_CHUP_NHAM" })).status, 400, "thiếu ghi chú");
  const keys1 = w.q("SELECT thumb_key, view_key FROM abg_photo WHERE id = ?", a1)[0];
  assert.equal((await xoa(SA, a1, { lyDo: "GIAY_TO_CHUP_NHAM", ghiChu: "Lọt căn cước của khách" })).status, 200);
  assert.ok(!w.r2AnhBanGiao.co(keys1.thumb_key) && !w.r2AnhBanGiao.co(keys1.view_key));
  assert.ok(w.q("SELECT r2_deleted_at FROM abg_photo WHERE id = ?", a1)[0].r2_deleted_at);
  assert.equal(w.q("SELECT purge_note FROM abg_photo WHERE id = ?", a1)[0].purge_note, "Lọt căn cước của khách", "lý do chữ ở cột N3 của dòng ảnh");
  assert.equal((await xoa(SA, a2, { lyDo: "XOA_THEO_YEU_CAU", ghiChu: "Khách gọi hotline 22/11, đã đối chiếu mã đơn" })).status, 400, "thiếu nguồn");
  assert.equal((await xoa(SA, a2, { lyDo: "XOA_THEO_YEU_CAU", nguon: "KHACH", ghiChu: "Khách gọi hotline 22/11, đã đối chiếu mã đơn" })).status, 200);
  assert.equal(n(w, "SELECT count(*) AS n FROM abg_erasure_request WHERE source = 'KHACH' AND executed_at IS NOT NULL"), 1);
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'handover_photo_purged'").map((x: any) => x.detail).join("|");
  assert.ok(!nk.includes("hotline") && !nk.includes("căn cước"), "chữ tự do (kênh của khách, lý do xoá) không vào nhật ký — chỉ mã");
  assert.equal((await ds(w, KT, id)).json.anh.length, 0);
});

test("biến thể 7B, nguồn PHIEU: đánh dấu ảnh vào phiếu xoá còn chờ (chưa gỡ); lô Thực hiện phiếu của parties gỡ ảnh và xoá kho", async () => {
  const w = setup();
  const { id } = don(w);
  const anh = (await tai(w, HDV, id)).json.id;
  // Phiếu xoá của một người có tài khoản (cần chính sách + đồng ý — dựng thẳng dòng phiếu chờ cho gọn: phần đang kiểm là nối anh-ban-giao vào lô của parties).
  const pid = uuid();
  w.sqlite.prepare(`INSERT INTO pty_erasure_request (id, party_id, policy_id, due_at, status, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'pp1', NULL, 'CHO_XU_LY', ?, ?, ?, ?)`)
    .run(pid, `pty-${TTS}`, AT, TTS, AT, TTS); // người trong ảnh = Thực tập sinh (không có việc đang mở — HDV đang phụ trách đơn thì phiếu bị chặn «đang bận»)
  const xoa = (body: unknown) => w.call("POST", `/api/anh-ban-giao/anh/${anh}/xoa`, { as: SA, body });
  assert.equal((await xoa({ lyDo: "XOA_THEO_YEU_CAU", nguon: "PHIEU", phieuId: uuid(), ghiChu: "Theo phiếu xoá" })).status, 409, "phiếu không có");
  const r = await xoa({ lyDo: "XOA_THEO_YEU_CAU", nguon: "PHIEU", phieuId: pid, ghiChu: "Theo phiếu xoá" });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.daDanhDau, true);
  assert.equal(w.q("SELECT purged_at FROM abg_photo WHERE id = ?", anh)[0].purged_at, null, "chỉ đánh dấu, chưa gỡ");
  const keys = w.q("SELECT thumb_key, view_key FROM abg_photo WHERE id = ?", anh)[0];
  const th = await w.call("POST", `/api/parties/phieu-xoa/${pid}/thuc-hien`, { as: SA, body: { xacNhan: true } });
  assert.equal(th.status, 200, th.text);
  const row = w.q("SELECT purged_at, purge_reason, note, r2_deleted_at FROM abg_photo WHERE id = ?", anh)[0];
  assert.equal(row.purge_reason, "XOA_THEO_YEU_CAU");
  assert.ok(row.r2_deleted_at);
  assert.ok(!w.r2AnhBanGiao.co(keys.view_key));
  assert.equal(n(w, "SELECT count(*) AS n FROM abg_erasure_request WHERE phieu_id = ? AND executed_at IS NOT NULL", pid), 1);
});

test("tóm tắt cho nút ở trang đơn: số ảnh xem được + có được gửi không; không ghi nhật ký; Đối tác 403", async () => {
  const w = setup();
  const { id } = don(w);
  await tai(w, HDV, id);
  const r = await w.call("GET", `/api/anh-ban-giao/don/${id}/tom-tat`, { as: KT });
  assert.deepEqual(r.json, { soAnh: 1, coTheTai: false });
  const h = await w.call("GET", `/api/anh-ban-giao/don/${id}/tom-tat`, { as: HDV });
  assert.deepEqual(h.json, { soAnh: 1, coTheTai: true });
  assert.equal((await w.call("GET", `/api/anh-ban-giao/don/${id}/tom-tat`, { as: DT })).status, 403);
  assert.equal(soNhatKy(w, "handover_photo_list_viewed"), 0);
});

test("kho hỏng khi đặt ảnh: dòng ở «tải dở dang», R-ABG-1 thấy sau 1 giờ; hàng chờ của Toàn quyền thấy và chạy lại ⇒ gỡ TAI_LEN_LOI, R-ABG-1 về 0", async () => {
  const { CHECKS, demViPham } = await import("../../../scripts/audit-checks.mjs");
  const dem = (w: W, ma: string) => {
    const c = CHECKS.find((x: any) => x.code === ma);
    assert.ok(c, `có luật kiểm ${ma}`);
    return demViPham(c, w.sqlite.prepare(c.sql.replace(/\s+/g, " ").trim()).all());
  };
  const w = setup();
  const { id } = don(w);
  w.r2AnhBanGiao.hong.put = true;
  const r = await tai(w, HDV, id);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.daLuu, false);
  w.r2AnhBanGiao.hong.put = false;
  assert.equal(dem(w, "R-ABG-1"), 0, "chưa quá 1 giờ");
  const truoc = new Date(Date.now() - 2 * 3600_000).toISOString();
  w.sqlite.exec("DROP TRIGGER abg_photo_identity"); // chỉ để lùi giờ tải trong CSDL thử — không phải điều đang kiểm
  w.sqlite.prepare("UPDATE abg_photo SET created_at = ? WHERE id = ?").run(truoc, r.json.id);
  assert.equal(dem(w, "R-ABG-1"), 1);
  assert.equal((await w.call("GET", "/api/anh-ban-giao/cho-xoa", { as: KT })).status, 403);
  const cx = await w.call("GET", "/api/anh-ban-giao/cho-xoa", { as: SA });
  assert.equal(cx.json.anh[0].trangThai, "TAI_DO_DANG");
  assert.ok(!JSON.stringify(cx.json).includes("abg/"));
  const cl = await w.call("POST", "/api/anh-ban-giao/cho-xoa/chay-lai", { as: SA, body: {} });
  assert.equal(cl.status, 200, cl.text);
  assert.equal(w.q("SELECT purge_reason FROM abg_photo WHERE id = ?", r.json.id)[0].purge_reason, "TAI_LEN_LOI");
  assert.equal(dem(w, "R-ABG-1"), 0);
  assert.equal(dem(w, "R-ABG-2"), 0);
});

test("người không bao giờ gửi / xem được (Đối tác, Thực tập sinh) nhận 403 TRƯỚC mọi câu về đơn — mã đơn không có thật cũng 403, không 404", async () => {
  const w = setup();
  const lạ = "95959595-9595-4595-8595-999999999998";
  for (const as of [DT, TTS]) {
    assert.equal((await tai(w, as, lạ)).status, 403);
    assert.equal((await ds(w, as, lạ)).status, 403);
    assert.equal((await w.call("GET", `/api/anh-ban-giao/don/${lạ}/tom-tat`, { as })).status, 403);
  }
  assert.equal((await tai(w, SALES, lạ)).status, 404, "người có quyền thì vẫn biết đơn không có");
});

test("nhật ký không chứa giá trị cột hạng N3 nào của Ảnh bàn giao (khoá kho, băm, lý do ẩn, lý do xoá) — sau tải, xem, ẩn, xoá", async () => {
  const w = setup();
  const { id } = don(w);
  const a1 = (await tai(w, HDV, id)).json.id;
  const a2 = (await tai(w, HDV, id)).json.id;
  await tai(w, HDV, id);
  await ds(w, KT, id);
  await xem(w, KT, a1);
  assert.equal((await w.call("POST", `/api/anh-ban-giao/anh/${a1}/an`, { as: SA, body: { lyDo: "Chụp nhầm đơn khác của khách" } })).status, 200);
  assert.equal((await w.call("POST", `/api/anh-ban-giao/anh/${a2}/xoa`, { as: SA, body: { lyDo: "GIAY_TO_CHUP_NHAM", ghiChu: "Ảnh lọt căn cước số 012345678901" } })).status, 200);
  const k = doNhatKyHang(w.sqlite, ["abg_photo.content_hash", "abg_photo.thumb_key", "abg_photo.view_key", "abg_photo.hidden_reason", "abg_photo.purge_note"]);
  assert.deepEqual(k.rong, [], "bài rỗng: cột N3 phụ trách chưa có dữ liệu thật");
  assert.deepEqual(k.lo, [], "nhật ký chứa giá trị hạng N3");
});
