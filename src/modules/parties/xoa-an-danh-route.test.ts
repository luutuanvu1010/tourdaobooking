// ADR-0126 đ2 (lát H-5 Gói 2, việc 4): người dùng tự GỬI và RÚT yêu cầu xoá dữ liệu ở "Hồ sơ của tôi", qua route thật (tests/audit/harness.mjs, SQLite thật trong bộ nhớ — không chạm D1 thật).
// Mọi giá trị (tên, ngày sinh, địa chỉ, số giấy tờ) là GIẢ. Phạm vi own = staff.partyId của PHIÊN; mã hồ sơ từ thân / đường dẫn bị bỏ qua.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { CHECKS } from "../../../scripts/audit-checks.mjs";
import { anDanhStatements, hanGiuPhienNgay, quyetPhieuXoaStatement } from "./repository.ts";
import { DAU_TEN, dauSoGiayTo } from "./xoa-an-danh.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const ADM2 = "88888888-8888-4888-8888-888888888888";
const PARTNER = "55555555-5555-4555-8555-555555555555";
const DRVP = "66666666-6666-4666-8666-666666666666";
const HR = "99999999-9999-4999-8999-999999999999";
const ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const NOP = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const GOP = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const AT = "2026-10-17T00:00:00.000Z";
const pty = (id: string) => `pty-${id}`;
const MUC_DICH = "Thử: xác minh danh tính, điền sẵn hoá đơn.";
const UUID36 = /^[0-9a-f-]{36}$/;

function setup(tuyChon: Record<string, unknown> = {}) {
  const w = world(tuyChon);
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000008", name: "Quản Trị Hai", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000010", name: "Đối Tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DRVP, phone: "0900000011", name: "Tài Xế Đối Tác", perms: ["DRIVER_PARTNER"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000013", name: "Nhân Sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: ORG, phone: "0900000020", name: "Công Ty Thử", perms: ["PARTNER"] });
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('org-1', 'ORGANIZATION', 'Công Ty Lữ Hành Thử', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES ('org-1', '${AT}', '${AT}')`);
  w.sqlite.prepare("UPDATE staff SET party_id = 'org-1' WHERE id = ?").run(ORG);
  seedStaff(w.sqlite, { id: NOP, phone: "0900000021", name: "Chưa Hồ Sơ", perms: ["SALES"] });
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(NOP);
  seedStaff(w.sqlite, { id: GOP, phone: "0900000022", name: "Đã Gộp", perms: ["SALES"] });
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('gop-dich', 'PERSON', 'Hồ Sơ Chính', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('gop-dich', 'Hồ Sơ Chính', '${AT}', '${AT}')`);
  w.sqlite.prepare("UPDATE pty_party SET active = 0, merged_into_id = 'gop-dich', merged_at = ?, updated_at = ? WHERE id = ?").run(AT, AT, pty(GOP));
  return w;
}
// biome-ignore lint/suspicious/noExplicitAny: khung thử .mjs không có khai kiểu
type W = any;
const dang = (w: W, body: Record<string, unknown> = {}) => w.call("POST", "/api/parties/chinh-sach-rieng-tu", { as: SUP, body: { mucDich: MUC_DICH, noiDung: "Toàn văn chính sách THỬ", ...body } });
const cuaToi = async (w: W, as: string) => {
  const r = await w.call("GET", "/api/parties/cua-toi", { as });
  assert.equal(r.status, 200, r.text);
  return r.json;
};
const gui = (w: W, as: string, body: unknown = { xacNhan: true }) => w.call("POST", "/api/parties/cua-toi/phieu-xoa", { as, body });
const rut = (w: W, as: string, id: string) => w.call("POST", `/api/parties/cua-toi/phieu-xoa/${id}/rut`, { as });
// w.q trả dòng mang prototype rỗng — nhân bản để so sâu được.
const Q = (w: W, sql: string, ...a: unknown[]) => w.q(sql, ...a).map((r: object) => ({ ...r }));
const dem = (w: W, bang: string) => Number(Q(w, `SELECT count(*) n FROM ${bang}`)[0].n);
const dongY = (w: W, as: string, chinhSachId: string, quyetDinh = "DONG_Y") => w.call("POST", "/api/parties/cua-toi/dong-y", { as, body: { chinhSachId, quyetDinh } });

test("(u1) Đối tác, Tài xế đối tác, Nhân sự, Bán hàng gửi được: 201 + Location, đúng một phiếu CHO_XU_LY của hồ sơ phiên; nhật ký chỉ 'phiếu <mã>', không tên / SĐT", async () => {
  const w = setup();
  for (const as of [PARTNER, DRVP, HR, SALES]) {
    const r = await gui(w, as);
    assert.equal(r.status, 201, `${as}: ${r.text}`);
    assert.equal(r.headers.get("location"), "/account");
    assert.match(r.json.id, UUID36);
    const dong = Q(w, "SELECT party_id, status, created_by FROM pty_erasure_request WHERE id = ?", r.json.id);
    assert.deepEqual(dong, [{ party_id: pty(as), status: "CHO_XU_LY", created_by: as }]);
    const nk = Q(w, "SELECT detail, staff_id FROM audit_log WHERE action = 'party_erasure_requested' AND staff_id = ?", as);
    assert.equal(nk.length, 1);
    assert.match(nk[0].detail, /^phiếu [0-9a-f-]{36}$/);
    assert.doesNotMatch(nk[0].detail, /090000|Đối Tác|An\b/);
  }
  assert.equal(dem(w, "pty_erasure_request"), 4);
});

test("(u2) chưa có chính sách, hoặc đã RÚT đồng ý ⇒ vẫn gửi được 201 (policy_id, due_at rỗng); GET cua-toi: han null", async () => {
  const w = setup();
  let r = await gui(w, PARTNER);
  assert.equal(r.status, 201, r.text);
  let dong = Q(w, "SELECT policy_id, due_at FROM pty_erasure_request WHERE id = ?", r.json.id)[0];
  assert.deepEqual(dong, { policy_id: null, due_at: null });
  let d = await cuaToi(w, PARTNER);
  assert.equal(d.phieuXoa.length, 1);
  assert.equal(d.phieuXoa[0].han, null);
  // Có chính sách (không số ngày), đồng ý rồi RÚT đồng ý, rồi gửi.
  assert.equal((await rut(w, PARTNER, r.json.id)).status, 200);
  const cs = (await dang(w)).status;
  assert.equal(cs, 201);
  const csId = (await cuaToi(w, DRVP)).chinhSach.id as string;
  assert.equal((await dongY(w, DRVP, csId)).status, 200);
  assert.equal((await dongY(w, DRVP, csId, "RUT")).status, 200);
  r = await gui(w, DRVP);
  assert.equal(r.status, 201, r.text);
  dong = Q(w, "SELECT policy_id, due_at FROM pty_erasure_request WHERE id = ?", r.json.id)[0];
  assert.equal(dong.policy_id, csId, "chụp phiên bản chính sách hiện hành lúc gửi");
  assert.equal(dong.due_at, null, "chính sách không số ngày ⇒ không hạn");
  d = await cuaToi(w, DRVP);
  assert.equal(d.phieuXoa[0].han, null);
});

test("(u3) hai phiếu tự khai đang chờ ⇒ cùng lô cả hai RUT (decided_by = người gửi); sau đó gửi phiếu tự khai mới → 409 erasure_open, 0 dòng mới", async () => {
  const w = setup();
  await dang(w);
  const csId = (await cuaToi(w, PARTNER)).chinhSach.id as string;
  assert.equal((await dongY(w, PARTNER, csId)).status, 200);
  const tk = (body: Record<string, unknown>) => w.call("POST", "/api/parties/cua-toi/phieu", { as: PARTNER, body: { chinhSachId: csId, ...body } });
  assert.equal((await tk({ loai: "NGAY_SINH", ngaySinh: "1977-07-17" })).status, 201);
  assert.equal((await tk({ loai: "DIA_CHI", diaChi: "88 Đường Thử, Nha Trang" })).status, 201);
  assert.equal(dem(w, "pty_self_submission WHERE status = 'CHO_XAC_MINH'"), 2);
  const r = await gui(w, PARTNER);
  assert.equal(r.status, 201, r.text);
  const phieu = Q(w, "SELECT status, decided_by FROM pty_self_submission ORDER BY created_at");
  assert.deepEqual(phieu, [{ status: "RUT", decided_by: PARTNER }, { status: "RUT", decided_by: PARTNER }]);
  const nk = Q(w, "SELECT detail FROM audit_log WHERE action = 'party_erasure_requested'")[0].detail as string;
  assert.match(nk, /^phiếu [0-9a-f-]{36} · rút 2 phiếu tự khai đang chờ$/);
  const moi = await tk({ loai: "NGAY_SINH", ngaySinh: "1980-01-01" });
  assert.equal(moi.status, 409);
  assert.equal(moi.json.error.code, "erasure_open");
  assert.equal(moi.json.error.message, "Bạn đang có yêu cầu xoá dữ liệu chờ xử lý — chưa gửi được thông tin mới.");
  assert.equal(dem(w, "pty_self_submission"), 2);
});

test("(u4) gửi lần hai khi đang chờ → 409 erasure_pending_exists; hồ sơ tổ chức → 409 erasure_person_only; không hồ sơ → 409; thân thiếu xacNhan → 400; hồ sơ đã gộp → 409", async () => {
  const w = setup();
  assert.equal((await gui(w, SALES)).status, 201);
  let r = await gui(w, SALES);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "erasure_pending_exists");
  r = await gui(w, ORG);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "erasure_person_only");
  r = await gui(w, NOP);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "no_party");
  r = await gui(w, GOP);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "party_merged");
  for (const thanSai of [{}, { xacNhan: false }, { xacNhan: "true" }, { xacNhan: 1 }, null]) {
    r = await gui(w, PARTNER, thanSai);
    assert.equal(r.status, 400, JSON.stringify(thanSai));
    assert.equal(r.json.error.code, "invalid_input");
  }
  assert.equal(dem(w, "pty_erasure_request"), 1, "chỉ phiếu hợp lệ đầu tiên");
  // Không đăng nhập: 401.
  assert.equal((await w.call("POST", "/api/parties/cua-toi/phieu-xoa", { body: { xacNhan: true } })).status, 401);
});

test("(u5) mã hồ sơ từ thân bị bỏ qua: phiếu vẫn của staff.partyId", async () => {
  const w = setup();
  const r = await gui(w, PARTNER, { xacNhan: true, partyId: pty(SALES), party_id: pty(SALES) });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(Q(w, "SELECT party_id FROM pty_erasure_request"), [{ party_id: pty(PARTNER) }]);
});

test("(u6) rút: chính chủ → 200 RUT (decided_by = chính chủ); phiếu của người khác → 404; phiếu đã xử lý → 409 erasure_not_pending; mã lạ → 404", async () => {
  const w = setup();
  const a = (await gui(w, PARTNER)).json.id as string;
  const b = (await gui(w, SALES)).json.id as string;
  let r = await rut(w, PARTNER, b);
  assert.equal(r.status, 404, "phiếu người khác như không tồn tại");
  assert.equal(Q(w, "SELECT status FROM pty_erasure_request WHERE id = ?", b)[0].status, "CHO_XU_LY");
  r = await rut(w, PARTNER, "khong-phai-ma");
  assert.equal(r.status, 404);
  r = await rut(w, PARTNER, a);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { id: a, trangThai: "RUT" });
  assert.deepEqual(Q(w, "SELECT status, decided_by FROM pty_erasure_request WHERE id = ?", a), [{ status: "RUT", decided_by: PARTNER }]);
  const nk = Q(w, "SELECT detail FROM audit_log WHERE action = 'party_erasure_withdrawn'");
  assert.deepEqual(nk, [{ detail: `phiếu ${a}` }]);
  r = await rut(w, PARTNER, a);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "erasure_not_pending");
  assert.equal(dem(w, "audit_log WHERE action = 'party_erasure_withdrawn'"), 1, "rút lần hai không ghi nhật ký");
  // Gửi lại được sau khi rút.
  assert.equal((await gui(w, PARTNER)).status, 201);
});

test("(u7) chính sách có số ngày: phiếu gửi sau có due_at = lúc gửi + số ngày; bản mới bỏ trống ⇒ phiếu cũ GIỮ hạn cũ; số sai → 400", async () => {
  const w = setup();
  for (const sai of [0, -1, 1.5, "7"]) {
    const r = await dang(w, { hanXuLyXoaNgay: sai });
    assert.equal(r.status, 400, `hanXuLyXoaNgay=${JSON.stringify(sai)}`);
    const r2 = await dang(w, { hanGiuPhienNgay: sai });
    assert.equal(r2.status, 400, `hanGiuPhienNgay=${JSON.stringify(sai)}`);
  }
  assert.equal(dem(w, "pty_privacy_policy"), 0);
  const p = await dang(w, { hanXuLyXoaNgay: 7, hanGiuPhienNgay: 30 });
  assert.equal(p.status, 201, p.text);
  assert.deepEqual(Q(w, "SELECT erasure_days, session_retention_days FROM pty_privacy_policy"), [{ erasure_days: 7, session_retention_days: 30 }]);
  // Nhật ký đăng chính sách vẫn chỉ 'phiên bản n' (không số ngày — vô hại nhưng giữ khuôn).
  assert.deepEqual(Q(w, "SELECT detail FROM audit_log WHERE action = 'privacy_policy_published'"), [{ detail: "phiên bản 1" }]);
  let d = await cuaToi(w, PARTNER);
  assert.equal(d.chinhSach.hanXuLyXoaNgay, 7);
  assert.equal(d.chinhSach.hanGiuPhienNgay, 30);
  assert.equal(await hanGiuPhienNgay(w.env.DB), 30, "hàm tiêm của auth/accounts đọc cùng số với GET (bản mới nhất = bản hiện hành)");
  const r = await gui(w, PARTNER);
  assert.equal(r.status, 201, r.text);
  const dong = Q(w, "SELECT created_at, due_at FROM pty_erasure_request WHERE id = ?", r.json.id)[0];
  assert.equal(dong.due_at, new Date(Date.parse(dong.created_at) + 7 * 24 * 3600 * 1000).toISOString());
  d = await cuaToi(w, PARTNER);
  assert.equal(d.phieuXoa[0].han, dong.due_at);
  // Bản mới bỏ trống ⇒ chính sách hiện hành không số; phiếu cũ giữ hạn cũ (R6); phiếu mới (sau khi rút phiếu cũ) không hạn.
  assert.equal((await dang(w)).status, 201);
  assert.deepEqual(Q(w, "SELECT due_at FROM pty_erasure_request WHERE id = ?", r.json.id), [{ due_at: dong.due_at }]);
  d = await cuaToi(w, PARTNER);
  assert.equal(d.chinhSach.hanXuLyXoaNgay, null);
  assert.equal(d.chinhSach.hanGiuPhienNgay, null);
  assert.equal(await hanGiuPhienNgay(w.env.DB), null);
  assert.equal(d.phieuXoa[0].han, dong.due_at);
  assert.equal((await rut(w, PARTNER, r.json.id)).status, 200);
  const r2 = await gui(w, PARTNER);
  assert.equal(Q(w, "SELECT due_at FROM pty_erasure_request WHERE id = ?", r2.json.id)[0].due_at, null);
});

test("(u8) sau khi phiếu DA_THUC_HIEN: GET cua-toi không lộ dấu ẩn danh — ngày sinh null, hồ sơ daXoa, giấy tờ không còn dòng nào; phiếu tự khai giá trị null + daXoa; phieuXoa có phanGiuLai", async () => {
  const w = setup();
  await dang(w);
  const csId = (await cuaToi(w, PARTNER)).chinhSach.id as string;
  assert.equal((await dongY(w, PARTNER, csId)).status, 200);
  w.sqlite.prepare("UPDATE pty_person SET birth_date = '1977-07-17' WHERE party_id = ?").run(pty(PARTNER));
  w.sqlite.prepare(
    `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_date, issued_place, expiry_date, created_at, created_by, updated_at, updated_by)
     VALUES ('doc-1', ?, 'CCCD', '079000000999', '079000000999', '2020-01-01', 'Nơi cấp thử', '2035-01-01', ?, 'x', ?, 'x')`,
  ).run(pty(PARTNER), AT, AT);
  // Một phiếu tự khai đã xử lý (RUT) có giá trị thật: ẩn danh hoá phải thay bằng dấu, DTO trả null + daXoa.
  const t = await w.call("POST", "/api/parties/cua-toi/phieu", { as: PARTNER, body: { chinhSachId: csId, loai: "DIA_CHI", diaChi: "88 Đường Thử, Nha Trang" } });
  assert.equal(t.status, 201, t.text);
  const truoc = await cuaToi(w, PARTNER);
  assert.equal(truoc.hoSo.ngaySinh, "1977-07-17");
  assert.equal(truoc.hoSo.daXoa, false);
  assert.equal(truoc.phieu[0].daXoa, false);
  const g = await gui(w, PARTNER);
  assert.equal(g.status, 201, g.text);
  // Lô thực hiện của việc 2, chạy trực tiếp trong DB thử (route Thực hiện là việc 5): quyết phiếu rồi tám câu ẩn danh; Quản trị là người xử lý.
  const D = w.env.DB;
  const QUYET = "2026-10-17T10:00:00.000Z";
  await D.batch([
    quyetPhieuXoaStatement(D, { id: g.json.id, actorId: ADM, at: QUYET, giuTen: false, phanGiuLai: "SO_TIEN,LAN_THU" }),
    ...anDanhStatements(D, { id: g.json.id, partyId: pty(PARTNER), actorId: ADM, at: QUYET, homNay: "2026-10-17" }),
  ]);
  assert.equal(Q(w, "SELECT status FROM pty_erasure_request WHERE id = ?", g.json.id)[0].status, "DA_THUC_HIEN");
  const sau = await cuaToi(w, PARTNER);
  assert.equal(sau.hoSo.daXoa, true);
  assert.equal(sau.hoSo.ngaySinh, null);
  assert.deepEqual(sau.hoSo.diaChi, []);
  assert.deepEqual(sau.hoSo.dienThoai, []);
  assert.deepEqual(sau.hoSo.email, []);
  assert.deepEqual(sau.hoSo.giayTo, [], "giấy tờ đã ẩn danh không còn là dòng hiện hành");
  assert.equal(sau.phieu.length, 1);
  assert.equal(sau.phieu[0].daXoa, true);
  assert.equal(sau.phieu[0].diaChi, null);
  assert.equal(sau.phieu[0].ngaySinh, null);
  assert.equal(sau.phieu[0].giayTo, null);
  assert.equal(sau.phieuXoa.length, 1);
  assert.equal(sau.phieuXoa[0].trangThai, "DA_THUC_HIEN");
  assert.ok(sau.phieuXoa[0].phanGiuLai.length > 0, "phanGiuLai không rỗng khi đã thực hiện");
  assert.equal(sau.coTheGuiXoa, true, "đã xong phiếu cũ thì có thể gửi phiếu mới (dữ liệu khai thêm sau này)");
  // Không dấu ẩn danh lộ ra như dữ liệu trong toàn bộ phản hồi.
  assert.doesNotMatch(JSON.stringify(sau.hoSo) + JSON.stringify(sau.phieu), /1900-01-01|Đã xoá|XOA[0-9A-F]{8}/);
});

test("(u9) GET cua-toi: coTheGuiXoa / lyDoKhongGuiXoa theo hồ sơ — cá nhân gửi được (kể cả chưa có chính sách); tổ chức, không hồ sơ, đang chờ thì có câu tiếng Việt", async () => {
  const w = setup();
  let d = await cuaToi(w, DRVP);
  assert.equal(d.coTheGuiXoa, true);
  assert.equal(d.lyDoKhongGuiXoa, null);
  assert.deepEqual(d.phieuXoa, []);
  assert.equal(d.coTheGui, false, "việc tự khai vẫn đòi chính sách — quyền xoá không phụ thuộc đồng ý");
  for (const as of [ORG, NOP, GOP]) {
    d = await cuaToi(w, as);
    assert.equal(d.coTheGuiXoa, false, as);
    assert.equal(typeof d.lyDoKhongGuiXoa, "string", as);
    assert.match(d.lyDoKhongGuiXoa, /[à-ỹ]/);
  }
  assert.equal((await gui(w, DRVP)).status, 201);
  d = await cuaToi(w, DRVP);
  assert.equal(d.coTheGuiXoa, false);
  assert.match(d.lyDoKhongGuiXoa, /chờ xử lý/);
  assert.equal(d.phieuXoa[0].trangThai, "CHO_XU_LY");
  assert.deepEqual(Object.keys(d.phieuXoa[0]).sort(), ["guiLuc", "han", "id", "lyDoTuChoi", "phanGiuLai", "trangThai", "xuLyLuc"]);
});

// ======================================================================================================================================================
// Việc 5 (lát H-5, ADR-0126 đ2, đ3, đ7, đ8): ô party.erasure.process + hàng chờ / xem trước / thực hiện / từ chối / chạy lại, trên CẢ ứng dụng (SQLite thật trong bộ nhớ).
// Mọi giá trị (tên, số giấy tờ, SĐT, địa chỉ, IP) là GIẢ. Ẩn danh hoá là cửa một chiều: bài chỉ chạy trên DB thử của khung thử, không D1 thật.
// ======================================================================================================================================================
const ACC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const PHIEU = "/api/parties/phieu-xoa";
const SDT_THAT = "0912345678";
const CCCD_THAT = "079000000999";
const DIA_CHI_THAT = "88 Đường Thử, Nha Trang";
const NGAY_SINH_THAT = "1977-07-17";
const IP_THAT = "203.0.113.9";
const UA_THAT = "UA-thu-rieng-1";
const hangCho = (w: W, as: string) => w.call("GET", PHIEU, { as });
const xemTruoc = (w: W, as: string, id: string) => w.call("GET", `${PHIEU}/${id}`, { as });
const thucHien = (w: W, as: string, id: string, body: unknown = { xacNhan: true }) => w.call("POST", `${PHIEU}/${id}/thuc-hien`, { as, body });
const tuChoi = (w: W, as: string, id: string, body: unknown) => w.call("POST", `${PHIEU}/${id}/tu-choi`, { as, body });
const chayLai = (w: W, as: string) => w.call("POST", `${PHIEU}/chay-lai`, { as });
const batBien = (w: W, ma: string): number => {
  const c = (CHECKS as { code: string; sql: string }[]).find((x) => x.code === ma);
  assert.ok(c, `thiếu bất biến ${ma}`);
  return Number(Object.values(w.sqlite.prepare(c.sql).get() as Record<string, unknown>)[0]);
};
const docIdCua = (as: string) => `0b1e5c2a-0000-4000-8000-${as.slice(0, 12)}`;
const KHOA_TEP = (as: string) => `pty/${as.replace(/-/g, "").slice(0, 31)}1`;

/** Hồ sơ đầy đủ của `as`: ngày sinh, CCCD, liên hệ SĐT, một phiếu tự khai (địa chỉ), một tệp ảnh nối CCCD có đối tượng trong kho giả, phiên đăng nhập mang IP / User-Agent. */
async function gieoDayDu(w: W, as: string, so: string = CCCD_THAT) {
  const p = pty(as);
  if (Q(w, "SELECT 1 FROM pty_privacy_policy").length === 0) assert.equal((await dang(w)).status, 201);
  const csId = (await cuaToi(w, as)).chinhSach.id as string;
  assert.equal((await dongY(w, as, csId)).status, 200);
  const tk = await w.call("POST", "/api/parties/cua-toi/phieu", { as, body: { chinhSachId: csId, loai: "DIA_CHI", diaChi: DIA_CHI_THAT } });
  assert.equal(tk.status, 201, tk.text);
  w.sqlite.prepare("UPDATE pty_person SET birth_date = ? WHERE party_id = ?").run(NGAY_SINH_THAT, p);
  const docId = docIdCua(as);
  w.sqlite.prepare(
    `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_date, issued_place, expiry_date, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, 'CCCD', ?, ?, '2020-01-01', 'Nơi cấp thử', '2035-01-01', ?, 'x', ?, 'x')`,
  ).run(docId, p, so, so, AT, AT);
  w.sqlite.prepare(
    `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, valid_to_date, created_at, updated_at)
     VALUES (?, ?, 'PHONE', ?, ?, 'Nhãn thử', 1, '2026-09-01', NULL, ?, ?)`,
  ).run(`lh-${as.slice(0, 8)}`, p, SDT_THAT, SDT_THAT, AT, AT);
  const tepId = `tep-${as.slice(0, 8)}`;
  const khoa = KHOA_TEP(as);
  w.sqlite.prepare(
    `INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, stored_at, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, 'jpg', 3, ?, ?, ?, 'x', ?, 'x')`,
  ).run(tepId, p, khoa, "a".repeat(64), AT, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'PERSON_DOCUMENT', ?, ?, 'x', ?, 'x')").run(tepId, docId, AT, AT);
  await w.r2.put(khoa, new Uint8Array([1, 2, 3]));
  await w.token(as);
  w.sqlite.prepare("UPDATE aut_session SET ip = ?, user_agent = ? WHERE staff_id = ?").run(IP_THAT, UA_THAT, as);
  return { csId, docId, tepId, khoa, p, so };
}
/** Gieo đầy đủ rồi gửi phiếu xoá; trả mã phiếu. */
async function guiDayDu(w: W, as: string, so: string = CCCD_THAT) {
  const g = await gieoDayDu(w, as, so);
  const r = await gui(w, as);
  assert.equal(r.status, 201, r.text);
  return { ...g, phieuId: r.json.id as string };
}
const khoaHopLe = (o: object): string[] => Object.keys(o).sort();

test("(p1) Bán hàng, Kế toán, Nhân sự, Đối tác, Tài xế đối tác: cả năm route xử lý phiếu xoá → 403; Quản trị, Toàn quyền → 200 (đọc)", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: ACC, phone: "0900000009", name: "Kế Toán", perms: ["ACCOUNTING"] });
  const gia = "0b1e5c2a-0000-4000-8000-0000000000ff";
  for (const as of [SALES, ACC, HR, PARTNER, DRVP]) {
    for (const [m, d, body] of [["GET", PHIEU, undefined], ["GET", `${PHIEU}/${gia}`, undefined], ["POST", `${PHIEU}/${gia}/thuc-hien`, { xacNhan: true }],
      ["POST", `${PHIEU}/${gia}/tu-choi`, { lyDo: "CAN_GIU_THEO_LUAT" }], ["POST", `${PHIEU}/chay-lai`, undefined]] as const) {
      const r = await w.call(m, d, { as, body });
      assert.equal(r.status, 403, `${as} ${m} ${d}: ${r.text}`);
    }
  }
  for (const as of [ADM, SUP]) assert.equal((await hangCho(w, as)).status, 200, as);
  assert.equal((await hangCho(w, ADM)).headers.get("cache-control")?.includes("no-store"), true);
});

test("(p2) hàng chờ: Quản trị thấy phiếu Đối tác / Bán hàng / Tài xế đối tác, KHÔNG thấy phiếu của Quản trị / Nhân sự / Toàn quyền; Toàn quyền thấy hết; quá hạn lên đầu (nhãn qua_han), không hạn thì chua_co_han", async () => {
  const w = setup();
  const id: Record<string, string> = {};
  // Chưa có chính sách ⇒ phiếu không hạn.
  for (const as of [DRVP, ADM2, HR, SUP]) {
    const r = await gui(w, as);
    assert.equal(r.status, 201, `${as}: ${r.text}`);
    id[as] = r.json.id;
    await new Promise((xong) => setTimeout(xong, 5)); // created_at khác mili-giây ⇒ thứ tự "cũ trước" không dựa mã ngẫu nhiên (vòng sửa 1, I-4)
  }
  // Chính sách có số ngày ⇒ phiếu Bán hàng còn hạn; phiếu Đối tác chèn thẳng với hạn đã qua (hạn không sửa được sau khi gửi — trigger nội dung phiếu).
  assert.equal((await dang(w, { hanXuLyXoaNgay: 7 })).status, 201);
  await new Promise((xong) => setTimeout(xong, 5));
  const r = await gui(w, SALES);
  assert.equal(r.status, 201, r.text);
  id[SALES] = r.json.id;
  const csId = Q(w, "SELECT id FROM pty_privacy_policy")[0].id as string;
  id[PARTNER] = "0b1e5c2a-0000-4000-8000-0000000000e1";
  w.sqlite.prepare(`INSERT INTO pty_erasure_request (id, party_id, policy_id, due_at, status, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, '2026-01-01T00:00:00.000Z', 'CHO_XU_LY', ?, ?, ?, ?)`).run(id[PARTNER], pty(PARTNER), csId, new Date().toISOString(), PARTNER, AT, PARTNER);
  const qt = await hangCho(w, ADM);
  assert.equal(qt.status, 200, qt.text);
  assert.deepEqual(khoaHopLe(qt.json), ["daXuLy", "phieu"]);
  assert.deepEqual(qt.json.phieu.map((x: { id: string }) => x.id), [id[PARTNER], id[DRVP], id[SALES]], "quá hạn trước; rồi cũ trước; ngoài cấp bậc bị lọc");
  assert.deepEqual(qt.json.phieu.map((x: { trangThaiHan: string }) => x.trangThaiHan), ["qua_han", "chua_co_han", "con_han"]);
  assert.deepEqual(khoaHopLe(qt.json.phieu[0]), ["guiLuc", "han", "id", "lyDoKhong", "tenHoSo", "trangThaiHan", "xuLyDuoc"]);
  assert.equal(qt.json.phieu[0].tenHoSo, "Đối Tác");
  assert.equal(qt.json.phieu.every((x: { xuLyDuoc: boolean; lyDoKhong: unknown }) => x.xuLyDuoc === true && x.lyDoKhong === null), true);
  const sp = await hangCho(w, SUP);
  assert.deepEqual(sp.json.phieu.map((x: { id: string }) => x.id), [id[PARTNER], id[DRVP], id[ADM2], id[HR], id[SUP], id[SALES]]);
  const cuaSup = sp.json.phieu.find((x: { id: string }) => x.id === id[SUP]);
  assert.equal(cuaSup.xuLyDuoc, false, "phiếu của chính mình");
  assert.match(cuaSup.lyDoKhong, /người gửi/);
  assert.doesNotMatch(JSON.stringify(sp.json), /erasure_self|nguoi_gui/);
});

test("(p2b) hàng chờ: số truy vấn D1 mỗi dòng ≤ 3 (không hỏi số dòng nợ, không hỏi công ty chủ theo từng dòng) — vòng sửa 1, m-1", async () => {
  const w = setup();
  for (const as of [DRVP, ADM2, HR, SUP, SALES]) assert.equal((await gui(w, as)).status, 201, as);
  let n = 0;
  const goc = w.env.DB.prepare.bind(w.env.DB);
  w.env.DB.prepare = (sql: string) => { n++; return goc(sql); };
  const r = await hangCho(w, SUP);
  w.env.DB.prepare = goc;
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.phieu.length, 5);
  // Toàn bộ lời gọi: phần chung (phiên, quyền, danh sách tài khoản, chính sách, hai danh sách phiếu, nhãn) + mỗi dòng không quá 3.
  assert.ok(n <= 5 * 3 + 8, `số truy vấn ${n} vượt 5 dòng × 3 + 8 phần chung (đo 21; bản cũ 31)`);
});

test("(p3) xem trước: CHỈ số đếm, tập khoá đúng hợp đồng, không chuỗi nào khớp số giấy tờ / SĐT / ngày sinh / địa chỉ, no-store; ngoài cấp bậc → 404; mã lạ → 404", async () => {
  const w = setup();
  const { phieuId } = await guiDayDu(w, PARTNER);
  const hr = (await gui(w, HR)).json.id as string;
  const r = await xemTruoc(w, ADM, phieuId);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.headers.get("cache-control")?.includes("no-store"), true);
  assert.deepEqual(khoaHopLe(r.json), ["giuTen", "guiLuc", "han", "hoSoGopVao", "id", "lyDoKhong", "phanGiuLai", "seXoa", "tenHoSo", "trangThaiHan", "xuLyDuoc"]);
  assert.deepEqual(khoaHopLe(r.json.seXoa), ["giayTo", "lienHe", "ngaySinh", "phienDangNhap", "phieuTuKhai", "tep"]);
  assert.deepEqual(r.json.seXoa, { giayTo: 1, phieuTuKhai: 1, lienHe: 1, ngaySinh: true, tep: 1, phienDangNhap: true });
  assert.equal(r.json.giuTen, false);
  assert.equal(r.json.xuLyDuoc, true);
  assert.equal(r.json.hoSoGopVao, 0);
  assert.equal(r.json.trangThaiHan, "chua_co_han");
  assert.ok(r.json.phanGiuLai.includes("SDT_DANG_NHAP") && !r.json.phanGiuLai.includes("TEN_HO_SO"));
  for (const gt of [CCCD_THAT, SDT_THAT, "1977", NGAY_SINH_THAT, DIA_CHI_THAT, "Đường Thử", IP_THAT, UA_THAT]) assert.ok(!r.text.includes(gt), `lộ "${gt}"`);
  assert.equal((await xemTruoc(w, ADM, hr)).status, 404, "Nhân sự ngoài cấp bậc của Quản trị");
  assert.equal((await xemTruoc(w, SUP, hr)).status, 200);
  assert.equal((await xemTruoc(w, ADM, "0b1e5c2a-0000-4000-8000-0000000000ff")).status, 404);
  assert.equal((await xemTruoc(w, ADM, "khong-phai-ma")).status, 404);
  assert.equal(dem(w, "audit_log WHERE action = 'party_erased'"), 0, "xem trước không ghi gì");
});

test("(p4) thực hiện: 200; mọi giá trị đúng dấu; tên thay DAU_TEN; phiên mất IP / User-Agent; nhật ký không chứa tên / số / SĐT; R-PTY-17..20 = 0; ảnh không tải được nữa; kho đã xoá", async () => {
  const w = setup();
  const { phieuId, docId, tepId, khoa, p } = await guiDayDu(w, PARTNER);
  assert.deepEqual(Q(w, "SELECT ip, user_agent FROM aut_session WHERE staff_id = ?", PARTNER), [{ ip: IP_THAT, user_agent: UA_THAT }], "đã gieo thật");
  assert.equal(w.r2.co(khoa), true);
  const r = await thucHien(w, ADM, phieuId);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true, conChoXoaKho: 0, chuaChepNgoai: false });
  const ph = Q(w, "SELECT status, decided_by, name_kept, retained_codes, offsite_at FROM pty_erasure_request WHERE id = ?", phieuId)[0];
  assert.equal(ph.status, "DA_THUC_HIEN");
  assert.equal(ph.decided_by, ADM);
  assert.equal(ph.name_kept, 0);
  assert.ok(String(ph.retained_codes).includes("SDT_DANG_NHAP") && !String(ph.retained_codes).includes("TEN_HO_SO"));
  assert.notEqual(ph.offsite_at, null);
  assert.deepEqual(Q(w, "SELECT birth_date, family_name, middle_name, given_name FROM pty_person WHERE party_id = ?", p), [{ birth_date: null, family_name: null, middle_name: null, given_name: DAU_TEN }]);
  assert.equal(Q(w, "SELECT display_name FROM pty_party WHERE id = ?", p)[0].display_name, DAU_TEN);
  const dg = Q(w, "SELECT document_number, number_key, issued_place, erased_at FROM pty_person_document WHERE id = ?", docId)[0];
  assert.equal(dg.document_number, dauSoGiayTo(docId));
  assert.equal(dg.number_key, dauSoGiayTo(docId));
  assert.equal(dg.issued_place, null);
  assert.notEqual(dg.erased_at, null);
  const lh = Q(w, "SELECT value, value_normalized, label, valid_to_date FROM pty_contact_point WHERE party_id = ?", p)[0];
  assert.deepEqual([lh.value, lh.value_normalized, lh.label], ["Đã xoá", "XOA", null]);
  assert.notEqual(lh.valid_to_date, null);
  const tk = Q(w, "SELECT address_value, erased_at FROM pty_self_submission WHERE party_id = ?", p)[0];
  assert.equal(tk.address_value, "Đã xoá");
  assert.notEqual(tk.erased_at, null);
  assert.deepEqual(Q(w, "SELECT ip, user_agent FROM aut_session WHERE staff_id = ?", PARTNER), [{ ip: null, user_agent: null }]);
  const tp = Q(w, "SELECT purged_at, purge_reason, r2_deleted_at FROM pty_attachment WHERE id = ?", tepId)[0];
  assert.deepEqual([tp.purge_reason, tp.purged_at !== null, tp.r2_deleted_at !== null], ["PHIEU_XOA", true, true]);
  assert.equal(w.r2.co(khoa), false, "kho đã xoá đối tượng");
  const nk = Q(w, "SELECT detail, staff_id, target_id FROM audit_log WHERE action = 'party_erased'");
  assert.equal(nk.length, 1);
  assert.deepEqual([nk[0].detail, nk[0].staff_id, nk[0].target_id], [`phiếu ${phieuId} · giấy tờ 1 · phiếu tự khai 1 · liên hệ 1 · tệp 1`, ADM, p]);
  const tatCaNhatKy = JSON.stringify(Q(w, "SELECT detail FROM audit_log"));
  for (const gt of [CCCD_THAT, SDT_THAT, NGAY_SINH_THAT, DIA_CHI_THAT, IP_THAT, UA_THAT]) assert.ok(!tatCaNhatKy.includes(gt), `nhật ký lộ "${gt}"`);
  for (const ma of ["R-PTY-17", "R-PTY-18", "R-PTY-19", "R-PTY-20", "R-PTY-12"]) assert.equal(batBien(w, ma), 0, ma);
  // Toàn quyền mở ảnh / danh sách ảnh của giấy tờ đã ẩn danh: không còn ảnh nào để tải.
  assert.equal((await w.call("GET", `/api/parties/${p}/documents/${docId}/tep/${tepId}`, { as: SUP })).status, 404);
  const ds = await w.call("GET", `/api/parties/${p}/documents/${docId}/tep`, { as: SUP });
  assert.deepEqual(ds.json?.tep ?? [], []);
  // Phiếu đã xử lý không còn trong hàng chờ; có ở "đã xử lý" (không tên, không giá trị).
  const hc = await hangCho(w, SUP);
  assert.deepEqual(hc.json.phieu.map((x: { id: string }) => x.id), []);
  assert.deepEqual(hc.json.daXuLy.map((x: { id: string; ketQua: string; chuaChepNgoai: boolean }) => [x.id, x.ketQua, x.chuaChepNgoai]), [[phieuId, "DA_THUC_HIEN", false]]);
  assert.deepEqual(khoaHopLe(hc.json.daXuLy[0]), ["chuaChepNgoai", "id", "ketQua", "luc", "lyDo", "nguoiXuLy"]);
});

test("(p5) thực hiện lần hai (người khác) → 409 erasure_not_pending, đúng một dòng party_erased; người dùng rút rồi Quản trị bấm → 409, không đổi dữ liệu; thua cuộc đua với 'rút' → 409, không đổi", async () => {
  const w = setup();
  const a = await guiDayDu(w, PARTNER);
  assert.equal((await thucHien(w, ADM, a.phieuId)).status, 200);
  const hai = await thucHien(w, ADM2, a.phieuId);
  assert.equal(hai.status, 409);
  assert.equal(hai.json.error.code, "erasure_not_pending");
  assert.equal(dem(w, "audit_log WHERE action = 'party_erased'"), 1);
  // Người dùng rút (SALES) rồi Quản trị bấm.
  const b = await guiDayDu(w, SALES, "079000000998");
  assert.equal((await rut(w, SALES, b.phieuId)).status, 200);
  const truoc = JSON.stringify(Q(w, "SELECT * FROM pty_contact_point WHERE party_id = ?", b.p)) + JSON.stringify(Q(w, "SELECT * FROM pty_person_document WHERE party_id = ?", b.p));
  const sau = await thucHien(w, ADM, b.phieuId);
  assert.equal(sau.status, 409);
  assert.equal(sau.json.error.code, "erasure_not_pending");
  assert.equal(JSON.stringify(Q(w, "SELECT * FROM pty_contact_point WHERE party_id = ?", b.p)) + JSON.stringify(Q(w, "SELECT * FROM pty_person_document WHERE party_id = ?", b.p)), truoc);
  assert.equal(Q(w, "SELECT birth_date FROM pty_person WHERE party_id = ?", b.p)[0].birth_date, NGAY_SINH_THAT);
  assert.equal(dem(w, "audit_log WHERE action = 'party_erased'"), 1);
  // Cuộc đua thật: người dùng rút NGAY TRƯỚC lô của route (sau khi route đã đọc phiếu còn chờ).
  const c = await guiDayDu(w, DRVP, "079000000997");
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /UPDATE pty_erasure_request SET status = 'DA_THUC_HIEN'/.test(s.sql)), async () => {
    w.sqlite.prepare("UPDATE pty_erasure_request SET status = 'RUT', decided_at = ?, decided_by = ?, updated_at = ?, updated_by = ? WHERE id = ?").run(AT, DRVP, AT, DRVP, c.phieuId);
  });
  const dua = await thucHien(w, ADM, c.phieuId);
  assert.equal(dua.status, 409, dua.text);
  assert.equal(dua.json.error.code, "erasure_not_pending");
  // Vòng sửa 1, I-1: lô thua (người dùng đã RÚT) thì câu sổ phiên của auth cũng không chạy — IP / User-Agent của họ còn nguyên.
  assert.deepEqual(Q(w, "SELECT ip, user_agent FROM aut_session WHERE staff_id = ?", DRVP), [{ ip: IP_THAT, user_agent: UA_THAT }], "lô thua ⇒ phiên không bị ẩn danh");
  assert.equal(Q(w, "SELECT birth_date FROM pty_person WHERE party_id = ?", c.p)[0].birth_date, NGAY_SINH_THAT, "ngày sinh nguyên: lô thua thì mọi câu ẩn danh changes = 0");
  assert.equal(Q(w, "SELECT erased_at FROM pty_person_document WHERE id = ?", c.docId)[0].erased_at, null);
  assert.equal(Q(w, "SELECT value FROM pty_contact_point WHERE party_id = ?", c.p)[0].value, SDT_THAT);
  assert.equal(Q(w, "SELECT purged_at FROM pty_attachment WHERE id = ?", c.tepId)[0].purged_at, null);
  assert.equal(w.r2.co(c.khoa), true, "kho nguyên: lô thua thì không chạm kho");
  assert.equal(dem(w, "audit_log WHERE action = 'party_erased'"), 1);
});

test("(p6) người gửi tự bấm → 409 erasure_self (Quản trị và Toàn quyền); Đối tác còn đơn chưa giao → 409 erasure_busy (Toàn quyền cũng chịu), dữ liệu nguyên", async () => {
  const w = setup();
  const m = (await gui(w, ADM)).json.id as string;
  const t1 = await thucHien(w, ADM, m);
  assert.equal(t1.status, 409);
  assert.equal(t1.json.error.code, "erasure_self");
  const s = (await gui(w, SUP)).json.id as string;
  assert.equal((await thucHien(w, SUP, s)).json.error.code, "erasure_self");
  assert.equal(dem(w, "audit_log WHERE action = 'party_erased'"), 0);
  // Đơn nháp mà người đặt là hồ sơ Đối tác (một đơn THẬT, gieo như bài gộp hồ sơ): đang bận.
  const b = await guiDayDu(w, PARTNER);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at, booker_party_id)
    VALUES ('don-ban', 'TD-BAN1', ?, 'draft', 'Khách', '0900000099', 100000, 100000, 100000, ?, ?, ?)`).run(SALES, AT, AT, b.p);
  w.sqlite.prepare("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('sv-ban', 'don-ban', 'Vé', 'perPax', 1, '2026-12-10')").run();
  for (const as of [ADM, SUP]) {
    const r = await thucHien(w, as, b.phieuId);
    assert.equal(r.status, 409, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, "erasure_busy");
  }
  const xt = await xemTruoc(w, ADM, b.phieuId);
  assert.equal(xt.json.xuLyDuoc, false);
  assert.match(xt.json.lyDoKhong, /việc đang mở/);
  assert.equal(Q(w, "SELECT birth_date FROM pty_person WHERE party_id = ?", b.p)[0].birth_date, NGAY_SINH_THAT);
  assert.equal(Q(w, "SELECT status FROM pty_erasure_request WHERE id = ?", b.phieuId)[0].status, "CHO_XU_LY");
});

test("(p7) kho lỗi khi xoá → vẫn 200, conChoXoaKho = số tệp, R-PTY-12 thấy; chạy lại sau khi kho hết lỗi xoá hết. Kho lỗi khi chép bản ngoài → chuaChepNgoai; chạy lại chép đúng ba khoá", async () => {
  const w = setup();
  const a = await guiDayDu(w, PARTNER);
  w.r2.hong.delete = true;
  const r = await thucHien(w, ADM, a.phieuId);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true, conChoXoaKho: 1, chuaChepNgoai: false });
  assert.equal(w.r2.co(a.khoa), true);
  assert.equal(batBien(w, "R-PTY-12"), 1);
  const cho = await w.call("GET", "/api/parties/tep-cho-xoa", { as: SUP });
  assert.deepEqual(cho.json.tep.map((x: { id: string; trangThai: string; lyDo: string }) => [x.id, x.trangThai, x.lyDo]), [[a.tepId, "CHO_XOA", "PHIEU_XOA"]]);
  w.r2.hong.delete = false;
  const cl = await chayLai(w, ADM);
  assert.equal(cl.status, 200, cl.text);
  assert.deepEqual(cl.json, { daChep: 0, daXoaKho: 1, conLoi: 0 });
  assert.equal(w.r2.co(a.khoa), false);
  assert.equal(batBien(w, "R-PTY-12"), 0);
  assert.deepEqual(Q(w, "SELECT detail FROM audit_log WHERE action = 'party_erasure_retried'"), [{ detail: "chép 0 · xoá kho 1 · còn 0" }]);
  // Không còn việc ⇒ chạy lại không ghi nhật ký.
  assert.deepEqual((await chayLai(w, ADM)).json, { daChep: 0, daXoaKho: 0, conLoi: 0 });
  assert.equal(dem(w, "audit_log WHERE action = 'party_erasure_retried'"), 1);
  // Bản ngoài D1.
  const b = await guiDayDu(w, SALES, "079000000998");
  w.r2.hong.put = true;
  const r2 = await thucHien(w, ADM, b.phieuId);
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual(r2.json, { ok: true, conChoXoaKho: 0, chuaChepNgoai: true });
  assert.equal(Q(w, "SELECT offsite_at FROM pty_erasure_request WHERE id = ?", b.phieuId)[0].offsite_at, null);
  assert.equal((await hangCho(w, ADM)).json.daXuLy.find((x: { id: string }) => x.id === b.phieuId).chuaChepNgoai, true);
  w.r2.hong.put = false;
  const cl2 = await chayLai(w, ADM);
  assert.deepEqual(cl2.json, { daChep: 1, daXoaKho: 0, conLoi: 0 });
  const obj = await w.r2.get(`xoa/${b.phieuId}.json`);
  assert.ok(obj, "có bản ngoài");
  const noiDung = JSON.parse(await new Response(obj.body).text()) as Record<string, string>;
  assert.deepEqual(khoaHopLe(noiDung), ["hoSo", "luc", "phieu"]);
  assert.equal(noiDung.phieu, b.phieuId);
  assert.equal(noiDung.hoSo, b.p);
  assert.notEqual(Q(w, "SELECT offsite_at FROM pty_erasure_request WHERE id = ?", b.phieuId)[0].offsite_at, null);
  assert.equal(batBien(w, "R-PTY-19"), 0);
});

test("(p8) khung thử KHÔNG tiêm cauAnDanhPhien ⇒ Thực hiện trả 503 erasure_unavailable, không đổi gì (phiếu của chủ có tài khoản)", async () => {
  const w = setup({ khongTiemAnDanhPhien: true });
  const a = await guiDayDu(w, PARTNER);
  const r = await thucHien(w, ADM, a.phieuId);
  assert.equal(r.status, 503, r.text);
  assert.equal(r.json.error.code, "erasure_unavailable");
  assert.equal(Q(w, "SELECT status FROM pty_erasure_request WHERE id = ?", a.phieuId)[0].status, "CHO_XU_LY");
  assert.equal(Q(w, "SELECT birth_date FROM pty_person WHERE party_id = ?", a.p)[0].birth_date, NGAY_SINH_THAT);
  assert.deepEqual(Q(w, "SELECT ip, user_agent FROM aut_session WHERE staff_id = ?", PARTNER), [{ ip: IP_THAT, user_agent: UA_THAT }]);
  assert.equal(dem(w, "audit_log WHERE action = 'party_erased'"), 0);
  // Phiếu của hồ sơ KHÔNG có tài khoản (Toàn quyền xử lý) không cần phần sổ phiên ⇒ vẫn thực hiện được.
  const khach = "pty-khach-1";
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${khach}', 'PERSON', 'Khách Thử', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${khach}', 'Khách Thử', '${AT}', '${AT}')`);
  w.sqlite.prepare(`INSERT INTO pty_erasure_request (id, party_id, status, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CHO_XU_LY', ?, ?, ?, ?)`)
    .run("0b1e5c2a-0000-4000-8000-0000000000e2", khach, AT, SALES, AT, SALES);
  const k = await thucHien(w, SUP, "0b1e5c2a-0000-4000-8000-0000000000e2");
  assert.equal(k.status, 200, k.text);
});

test("(p9) từ chối: lý do ngoài danh sách / có khoá lạ → 400; hợp lệ → TU_CHOI, nhật ký có mã lý do, dữ liệu nguyên; người dùng thấy nhãn lý do; người gửi tự từ chối → 409", async () => {
  const w = setup();
  const a = await guiDayDu(w, PARTNER);
  for (const sai of [{}, { lyDo: "TUY_Y" }, { lyDo: "CAN_GIU_THEO_LUAT", ghiChu: "Nguyễn Văn A" }, { lyDo: 1 }, null]) {
    const r = await tuChoi(w, ADM, a.phieuId, sai);
    assert.equal(r.status, 400, JSON.stringify(sai));
  }
  assert.equal(Q(w, "SELECT status FROM pty_erasure_request WHERE id = ?", a.phieuId)[0].status, "CHO_XU_LY");
  const r = await tuChoi(w, ADM, a.phieuId, { lyDo: "CAN_GIU_THEO_LUAT" });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ok: true });
  assert.deepEqual(Q(w, "SELECT status, reason_code, decided_by FROM pty_erasure_request WHERE id = ?", a.phieuId), [{ status: "TU_CHOI", reason_code: "CAN_GIU_THEO_LUAT", decided_by: ADM }]);
  assert.deepEqual(Q(w, "SELECT detail, staff_id FROM audit_log WHERE action = 'party_erasure_rejected'"), [{ detail: `phiếu ${a.phieuId} · CAN_GIU_THEO_LUAT`, staff_id: ADM }]);
  assert.equal(Q(w, "SELECT birth_date FROM pty_person WHERE party_id = ?", a.p)[0].birth_date, NGAY_SINH_THAT, "từ chối không đổi dữ liệu");
  assert.equal(w.r2.co(a.khoa), true);
  const d = await cuaToi(w, PARTNER);
  assert.equal(d.phieuXoa[0].trangThai, "TU_CHOI");
  assert.match(d.phieuXoa[0].lyDoTuChoi, /pháp luật/);
  assert.doesNotMatch(JSON.stringify(d.phieuXoa), /CAN_GIU_THEO_LUAT/);
  // Lần hai: không còn chờ.
  const hai = await tuChoi(w, ADM, a.phieuId, { lyDo: "CAN_GIU_THEO_LUAT" });
  assert.equal(hai.status, 409);
  assert.equal(hai.json.error.code, "erasure_not_pending");
  // Người gửi tự từ chối phiếu của mình; phiếu ngoài cấp bậc → 404.
  const m = (await gui(w, ADM)).json.id as string;
  const tm = await tuChoi(w, ADM, m, { lyDo: "CAN_GIU_THEO_LUAT" });
  assert.equal(tm.status, 409);
  assert.equal(tm.json.error.code, "erasure_self");
  const hr = (await gui(w, HR)).json.id as string;
  assert.equal((await tuChoi(w, ADM, hr, { lyDo: "CAN_GIU_THEO_LUAT" })).status, 404);
  assert.equal((await tuChoi(w, SUP, hr, { lyDo: "NGUOI_DUNG_HUY_QUA_KENH_KHAC" })).status, 200);
});

test("(p10) năm route đọc sau khi thực hiện: cua-toi, chi tiết hồ sơ, danh sách giấy tờ (số che null + daXoa), xem đủ số → 409 document_erased không ghi nhật ký, xác minh 'đã xử lý' không có giá trị", async () => {
  const w = setup();
  const a = await guiDayDu(w, PARTNER);
  assert.equal((await thucHien(w, ADM, a.phieuId)).status, 200);
  const ct = await cuaToi(w, PARTNER);
  assert.equal(ct.hoSo.daXoa, true);
  assert.equal(ct.hoSo.ngaySinh, null);
  const hs = await w.call("GET", `/api/parties/${a.p}`, { as: ADM });
  assert.equal(hs.status, 200, hs.text);
  for (const gt of [CCCD_THAT, SDT_THAT, NGAY_SINH_THAT, DIA_CHI_THAT, "XOA0B1E"]) assert.ok(!hs.text.includes(gt), `GET hồ sơ lộ "${gt}"`);
  const lh = hs.json.party.contacts as { value: string; validTo: string | null; isPrimary: boolean }[];
  assert.deepEqual(lh.map((c) => [c.value, c.validTo !== null]), [["Đã xoá", true]], "liên hệ đã xoá hiện đúng chữ 'Đã xoá' và đã đóng");
  assert.equal(hs.json.party.primaryPhone, null);
  const ds = await w.call("GET", `/api/parties/${a.p}/documents`, { as: ADM });
  assert.equal(ds.status, 200, ds.text);
  assert.equal(ds.json.documents.length, 1);
  assert.equal(ds.json.documents[0].maskedNumber, null);
  assert.equal(ds.json.documents[0].daXoa, true);
  assert.equal(ds.json.documents[0].current, false);
  assert.ok(!ds.text.includes("XOA0B1E") && !ds.text.includes(CCCD_THAT));
  const rv = await w.call("POST", `/api/parties/${a.p}/documents/${a.docId}/reveal`, { as: SUP });
  assert.equal(rv.status, 409, rv.text);
  assert.equal(rv.json.error.code, "document_erased");
  assert.equal(rv.json.error.message, "Giấy tờ này đã được xoá theo yêu cầu.");
  assert.ok(!rv.text.includes("XOA0B1E"));
  assert.equal(dem(w, "audit_log WHERE action = 'party_document_number_viewed'"), 0, "không ghi nhật ký xem số");
  const dxl = await w.call("GET", "/api/parties/xac-minh?trang=da-xu-ly", { as: ADM });
  assert.equal(dxl.status, 200, dxl.text);
  for (const x of dxl.json.phieu) assert.deepEqual(khoaHopLe(x), ["coChamTaiKhoan", "id", "ketLuan", "loai", "luc", "lyDo", "nguoiXuLy"]);
  assert.ok(!dxl.text.includes(DIA_CHI_THAT) && !dxl.text.includes("Đã xoá"));
  const cho = await w.call("GET", "/api/parties/xac-minh", { as: ADM });
  assert.ok(!cho.text.includes(a.p.replace("pty-", "")) || cho.json.phieu.length === 0);
  assert.deepEqual(cho.json.phieu, [], "phiếu tự khai đã ẩn danh không còn trong hàng chờ xác minh");
});

test("(p12) hồ sơ phụ đã gộp: xem trước hoSoGopVao = 1; thực hiện phủ cả hồ sơ phụ (liên hệ, giấy tờ)", async () => {
  const w = setup();
  const q = "pty-phu-q";
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${q}', 'PERSON', 'Hồ Sơ Phụ', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, birth_date, created_at, updated_at) VALUES ('${q}', 'Hồ Sơ Phụ', '1980-02-02', '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, valid_to_date, created_at, updated_at)
    VALUES ('lh-phu', '${q}', 'EMAIL', 'phu@thu.vn', 'phu@thu.vn', NULL, 0, '2026-09-01', NULL, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_date, issued_place, expiry_date, created_at, created_by, updated_at, updated_by)
    VALUES ('0b1e5c2a-0000-4000-8000-0000000000aa', '${q}', 'CCCD', '079000000777', '079000000777', '2020-01-01', 'Nơi cấp thử', '2035-01-01', '${AT}', 'x', '${AT}', 'x')`);
  w.sqlite.prepare("UPDATE pty_party SET active = 0, merged_into_id = ?, merged_at = ?, updated_at = ? WHERE id = ?").run(pty(PARTNER), AT, AT, q);
  const a = await guiDayDu(w, PARTNER);
  const xt = await xemTruoc(w, ADM, a.phieuId);
  assert.equal(xt.json.hoSoGopVao, 1);
  assert.deepEqual(xt.json.seXoa, { giayTo: 2, phieuTuKhai: 1, lienHe: 2, ngaySinh: true, tep: 1, phienDangNhap: true });
  assert.equal((await thucHien(w, ADM, a.phieuId)).status, 200);
  assert.deepEqual(Q(w, "SELECT value, value_normalized FROM pty_contact_point WHERE party_id = ?", q), [{ value: "Đã xoá", value_normalized: "XOA" }]);
  assert.notEqual(Q(w, "SELECT erased_at FROM pty_person_document WHERE party_id = ?", q)[0].erased_at, null);
  assert.equal(Q(w, "SELECT birth_date FROM pty_person WHERE party_id = ?", q)[0].birth_date, null);
  assert.equal(batBien(w, "R-PTY-18"), 0);
});

// ======================================================================================================================================================
// Việc 6 (lát H-5, ADR-0126 đ6): danh sách ảnh HẾT lý do giữ để người có quyền bấm xoá. Đọc danh sách KHÔNG ghi; bấm xoá = lô (đặt chờ xoá + nhật ký) rồi xoá kho.
// ======================================================================================================================================================
const ANH = "/api/parties/anh-can-xoa";
const KHONG_TK = "pty-khong-tai-khoan";
const dsAnh = (w: W, as: string) => w.call("GET", ANH, { as });
const xoaAnh = (w: W, as: string, ids: unknown) => w.call("POST", `${ANH}/xoa`, { as, body: { ids } });
let boDemAnh = 0;
const uuidAnh = () => `0b1e5c2a-1111-4000-8000-${(++boDemAnh).toString(16).padStart(12, "0")}`;
/** Hồ sơ không có tài khoản. */
function hoSoKhongTaiKhoan(w: W): string {
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${KHONG_TK}', 'PERSON', 'Khách Không Tài Khoản', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${KHONG_TK}', 'Khách Không Tài Khoản', '${AT}', '${AT}')`);
  return KHONG_TK;
}
function vaiMo(w: W, party: string): void {
  if (Q(w, "SELECT 1 FROM pty_party_role WHERE party_id = ?", party).length > 0) return;
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, 'CUSTOMER', NULL, '2026-01-01', NULL, ?, ?)")
    .run(`vai-${party}`, party, AT, AT);
}
/** Một tệp ảnh có đối tượng trong kho giả; `han` khác undefined ⇒ nối vào một giấy tờ sức khoẻ (không số) có ngày hết hạn đó. */
async function gieoAnh(w: W, party: string, x: { han?: string } = {}): Promise<{ tepId: string; docId: string | null; khoa: string }> {
  vaiMo(w, party);
  const tepId = uuidAnh();
  const khoa = `pty/${tepId.replace(/-/g, "")}`;
  w.sqlite.prepare(
    `INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, stored_at, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, 'jpg', 3, ?, ?, ?, 'x', ?, 'x')`,
  ).run(tepId, party, khoa, "b".repeat(64), AT, AT, AT);
  await w.r2.put(khoa, new Uint8Array([1, 2, 3]));
  let docId: string | null = null;
  if (x.han !== undefined) {
    docId = uuidAnh();
    w.sqlite.prepare(
      `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_date, issued_place, expiry_date, created_at, created_by, updated_at, updated_by)
       VALUES (?, ?, 'HEALTH_CHECK', NULL, NULL, '2020-01-01', NULL, ?, ?, 'x', ?, 'x')`,
    ).run(docId, party, x.han, AT, AT);
    w.sqlite.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'PERSON_DOCUMENT', ?, ?, 'x', ?, 'x')").run(tepId, docId, AT, AT);
  }
  return { tepId, docId, khoa };
}
const tepMo = (w: W, as: string, party: string, t: { tepId: string; docId: string | null }) => w.call("GET", `/api/parties/${party}/documents/${t.docId}/tep/${t.tepId}`, { as });

test("(a1) danh sách đúng các ca hết lý do giữ (hết hạn, không nối đâu); ca còn lý do giữ / đã quyết xoá không hiện; DTO đúng khoá, không mã thô; đọc KHÔNG ghi gì", async () => {
  const w = setup();
  const het = await gieoAnh(w, pty(PARTNER), { han: "2020-01-01" });
  const khongNoi = await gieoAnh(w, pty(PARTNER));
  const con = await gieoAnh(w, pty(PARTNER), { han: "2099-01-01" });
  const daXoa = await gieoAnh(w, pty(PARTNER), { han: "2020-01-01" });
  w.sqlite.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'PHIEU_XOA', content_hash = NULL WHERE id = ?").run(AT, daXoa.tepId);
  const truoc = JSON.stringify([Q(w, "SELECT * FROM pty_attachment ORDER BY id"), Q(w, "SELECT count(*) n FROM audit_log")]);
  const r = await dsAnh(w, SUP);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.headers.get("cache-control")?.includes("no-store"), true);
  assert.deepEqual(khoaHopLe(r.json), ["anh"]);
  const theoId = new Map(r.json.anh.map((x: { id: string }) => [x.id, x]));
  assert.deepEqual([...theoId.keys()].sort(), [het.tepId, khongNoi.tepId].sort());
  assert.ok(!theoId.has(con.tepId) && !theoId.has(daXoa.tepId));
  const a = theoId.get(het.tepId) as Record<string, unknown>;
  assert.deepEqual(khoaHopLe(a), ["id", "loaiGiayTo", "lyDo", "taiLuc", "tenHoSo"]);
  assert.equal(a.lyDo, "HET_HAN");
  assert.equal(a.tenHoSo, "Đối Tác");
  assert.equal(typeof a.loaiGiayTo, "string");
  assert.doesNotMatch(String(a.loaiGiayTo), /^[A-Z_]+$/, "nhãn lời thường, không mã thô");
  assert.equal(a.taiLuc, AT);
  const b = theoId.get(khongNoi.tepId) as Record<string, unknown>;
  assert.equal(b.lyDo, "KHONG_NOI");
  assert.equal(b.loaiGiayTo, null);
  assert.ok(!r.text.includes("pty/"), "không lộ khoá kho");
  assert.equal(JSON.stringify([Q(w, "SELECT * FROM pty_attachment ORDER BY id"), Q(w, "SELECT count(*) n FROM audit_log")]), truoc, "đọc danh sách không ghi gì");
});

test("(a2) Bán hàng, Kế toán, Nhân sự, Đối tác, Tài xế đối tác: GET và POST → 403, không đổi gì; Quản trị, Toàn quyền → GET 200", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: ACC, phone: "0900000009", name: "Kế Toán", perms: ["ACCOUNTING"] });
  const t = await gieoAnh(w, pty(PARTNER), { han: "2020-01-01" });
  for (const as of [SALES, ACC, HR, PARTNER, DRVP]) {
    assert.equal((await dsAnh(w, as)).status, 403, `GET ${as}`);
    assert.equal((await xoaAnh(w, as, [t.tepId])).status, 403, `POST ${as}`);
  }
  assert.equal(Q(w, "SELECT purged_at FROM pty_attachment WHERE id = ?", t.tepId)[0].purged_at, null);
  for (const as of [ADM, SUP]) assert.equal((await dsAnh(w, as)).status, 200, as);
});

test("(a3) Quản trị chỉ thấy tệp của hồ sơ không tài khoản hoặc tài khoản mình quản được; không thấy / không xoá được tệp của Quản trị khác, Nhân sự; Toàn quyền thấy hết", async () => {
  const w = setup();
  const cuaDoiTac = await gieoAnh(w, pty(PARTNER), { han: "2020-01-01" });
  const cuaKhach = await gieoAnh(w, hoSoKhongTaiKhoan(w), { han: "2020-01-01" });
  const cuaQuanTri2 = await gieoAnh(w, pty(ADM2), { han: "2020-01-01" });
  const cuaNhanSu = await gieoAnh(w, pty(HR), { han: "2020-01-01" });
  const quanTri = await dsAnh(w, ADM);
  assert.deepEqual(quanTri.json.anh.map((x: { id: string }) => x.id).sort(), [cuaDoiTac.tepId, cuaKhach.tepId].sort());
  const toanQuyen = await dsAnh(w, SUP);
  assert.deepEqual(toanQuyen.json.anh.map((x: { id: string }) => x.id).sort(), [cuaDoiTac.tepId, cuaKhach.tepId, cuaQuanTri2.tepId, cuaNhanSu.tepId].sort());
  // Quản trị gửi cả mã ngoài cấp bậc: chỉ phần trong phạm vi được quyết, phần còn lại bị bỏ qua.
  const r = await xoaAnh(w, ADM, [cuaQuanTri2.tepId, cuaNhanSu.tepId, cuaDoiTac.tepId]);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { daQuyet: 1, boQua: 2, conChoXoaKho: 0 });
  assert.equal(Q(w, "SELECT purged_at FROM pty_attachment WHERE id = ?", cuaQuanTri2.tepId)[0].purged_at, null);
  assert.equal(Q(w, "SELECT purged_at FROM pty_attachment WHERE id = ?", cuaNhanSu.tepId)[0].purged_at, null);
  assert.notEqual(Q(w, "SELECT purged_at FROM pty_attachment WHERE id = ?", cuaDoiTac.tepId)[0].purged_at, null);
});

test("(a4) xoá 2 tệp hợp lệ + 1 tệp đã có lại lý do giữ ⇒ daQuyet = 2, boQua = 1; đúng 2 dòng nhật ký chỉ mã; tệp bị bỏ qua vẫn mở được; kho đã xoá hai tệp kia", async () => {
  const w = setup();
  const t1 = await gieoAnh(w, pty(PARTNER), { han: "2020-01-01" });
  const t2 = await gieoAnh(w, pty(PARTNER));
  const t3 = await gieoAnh(w, pty(PARTNER), { han: "2020-01-01" });
  const ds = await dsAnh(w, ADM);
  assert.deepEqual(ds.json.anh.map((x: { id: string }) => x.id).sort(), [t1.tepId, t2.tepId, t3.tepId].sort());
  // giữa lúc xem danh sách và lúc bấm: t3 được nối thêm sang giấy tờ còn hạn
  const dsau = uuidAnh();
  w.sqlite.prepare(
    `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_date, issued_place, expiry_date, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, 'HEALTH_CHECK', NULL, NULL, '2020-01-01', NULL, '2099-01-01', ?, 'x', ?, 'x')`,
  ).run(dsau, pty(PARTNER), AT, AT);
  w.sqlite.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'PERSON_DOCUMENT', ?, ?, 'x', ?, 'x')").run(t3.tepId, dsau, AT, AT);
  const r = await xoaAnh(w, ADM, [t1.tepId, t2.tepId, t3.tepId]);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { daQuyet: 2, boQua: 1, conChoXoaKho: 0 });
  const nk = Q(w, "SELECT detail, staff_id, target_id, target_type FROM audit_log WHERE action = 'party_attachment_purged' ORDER BY detail");
  assert.deepEqual(nk, [t1.tepId, t2.tepId].map((id) => `tệp ${id} · HET_LY_DO_GIU`).sort().map((detail) => ({ detail, staff_id: ADM, target_id: pty(PARTNER), target_type: "party" })));
  for (const t of [t1, t2]) {
    const d = Q(w, "SELECT purged_at, purge_reason, r2_deleted_at, content_hash FROM pty_attachment WHERE id = ?", t.tepId)[0];
    assert.deepEqual([d.purge_reason, d.purged_at !== null, d.r2_deleted_at !== null, d.content_hash], ["HET_LY_DO_GIU", true, true, null]);
    assert.equal(w.r2.co(t.khoa), false, "kho đã xoá");
  }
  const giu = Q(w, "SELECT purged_at, purge_reason FROM pty_attachment WHERE id = ?", t3.tepId)[0];
  assert.deepEqual([giu.purged_at, giu.purge_reason], [null, null]);
  assert.equal(w.r2.co(t3.khoa), true);
  assert.equal((await tepMo(w, SUP, pty(PARTNER), t3)).status, 200, "tệp bị bỏ qua vẫn mở được");
  const tatCa = JSON.stringify(Q(w, "SELECT detail FROM audit_log"));
  assert.ok(!tatCa.includes("Đối Tác"), "nhật ký không có tên");
  assert.equal(batBien(w, "R-PTY-12"), 0);
  // bấm lại hai tệp đã quyết: không đổi, không nhật ký mới
  const lai = await xoaAnh(w, ADM, [t1.tepId, t2.tepId]);
  assert.deepEqual(lai.json, { daQuyet: 0, boQua: 2, conChoXoaKho: 0 });
  assert.equal(dem(w, "audit_log WHERE action = 'party_attachment_purged'"), 2);
});

test("(a5) ids rỗng / 51 mã / mã sai khuôn / không phải mảng / thiếu thân → 400, không đổi gì", async () => {
  const w = setup();
  const t = await gieoAnh(w, pty(PARTNER), { han: "2020-01-01" });
  const tuoi = (n: number) => Array.from({ length: n }, () => uuidAnh());
  for (const ids of [[], tuoi(51), ["khong-phai-ma"], [t.tepId, 7], t.tepId, null, { 0: t.tepId }]) {
    const r = await xoaAnh(w, ADM, ids);
    assert.equal(r.status, 400, JSON.stringify(ids).slice(0, 60));
    assert.equal(r.json.error.code, "invalid_input");
  }
  assert.equal((await w.call("POST", `${ANH}/xoa`, { as: ADM })).status, 400);
  assert.equal(Q(w, "SELECT purged_at FROM pty_attachment WHERE id = ?", t.tepId)[0].purged_at, null);
  assert.equal(dem(w, "audit_log WHERE action = 'party_attachment_purged'"), 0);
  // đúng 50 mã (lạ) là hợp lệ: chỉ bị bỏ qua
  const du = await xoaAnh(w, ADM, tuoi(50));
  assert.deepEqual(du.json, { daQuyet: 0, boQua: 50, conChoXoaKho: 0 });
});

test("(a6) kho ném lỗi khi xoá ⇒ vẫn 200, conChoXoaKho = 2, hai tệp hiện ở tep-cho-xoa; tải về hai tệp → 404 NGAY; kho hết lỗi rồi chạy lại xoá hết", async () => {
  const w = setup();
  const t1 = await gieoAnh(w, pty(PARTNER), { han: "2020-01-01" });
  const t2 = await gieoAnh(w, pty(PARTNER), { han: "2020-01-01" });
  w.r2.hong.delete = true;
  const r = await xoaAnh(w, ADM, [t1.tepId, t2.tepId]);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { daQuyet: 2, boQua: 0, conChoXoaKho: 2 });
  assert.equal(w.r2.co(t1.khoa) && w.r2.co(t2.khoa), true, "đối tượng còn trong kho");
  for (const t of [t1, t2]) assert.equal((await tepMo(w, SUP, pty(PARTNER), t)).status, 404, "đã quyết xoá ⇒ 404 ngay dù kho còn");
  const cho = await w.call("GET", "/api/parties/tep-cho-xoa", { as: SUP });
  assert.deepEqual(cho.json.tep.map((x: { id: string; lyDo: string }) => [x.id, x.lyDo]).sort(), [[t1.tepId, "HET_LY_DO_GIU"], [t2.tepId, "HET_LY_DO_GIU"]].sort());
  assert.equal(batBien(w, "R-PTY-12"), 2);
  w.r2.hong.delete = false;
  const cl = await chayLai(w, ADM);
  assert.equal(cl.status, 200, cl.text);
  assert.deepEqual(cl.json, { daChep: 0, daXoaKho: 2, conLoi: 0 });
  assert.equal(batBien(w, "R-PTY-12"), 0);
  assert.equal(w.r2.co(t1.khoa) || w.r2.co(t2.khoa), false);
});
