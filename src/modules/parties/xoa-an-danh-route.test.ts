// ADR-0126 đ2 (lát H-5 Gói 2, việc 4): người dùng tự GỬI và RÚT yêu cầu xoá dữ liệu ở "Hồ sơ của tôi", qua route thật (tests/audit/harness.mjs, SQLite thật trong bộ nhớ — không chạm D1 thật).
// Mọi giá trị (tên, ngày sinh, địa chỉ, số giấy tờ) là GIẢ. Phạm vi own = staff.partyId của PHIÊN; mã hồ sơ từ thân / đường dẫn bị bỏ qua.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { anDanhStatements, hanGiuPhienNgay, quyetPhieuXoaStatement } from "./repository.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
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

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
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
