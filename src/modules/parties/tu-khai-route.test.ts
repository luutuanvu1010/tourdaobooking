// ADR-0124, ADR-0126 đ1 (lát H-3 Gói 2): chính sách riêng tư + đồng ý + "Hồ sơ của tôi" qua route thật (tests/audit/harness.mjs, SQLite thật). Phạm vi own = staff.partyId.
// Task 4 thêm phần phiếu ở cuối tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "55555555-5555-4555-8555-555555555555";
const DRVP = "66666666-6666-4666-8666-666666666666";
const HYB = "88888888-8888-4888-8888-888888888888";
const HR = "99999999-9999-4999-8999-999999999999";
const DRV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const NOP = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const GOP = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const AT = "2026-10-17T00:00:00.000Z";
const pty = (id: string) => `pty-${id}`;
const MUC_DICH = "Thử: xác minh danh tính, điền sẵn hoá đơn.";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000010", name: "Đối Tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DRVP, phone: "0900000011", name: "Tài Xế Đối Tác", perms: ["DRIVER_PARTNER"] });
  seedStaff(w.sqlite, { id: HYB, phone: "0900000012", name: "Lai Bán Đối", perms: ["SALES", "PARTNER"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000013", name: "Nhân Sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: DRV, phone: "0900000014", name: "Tài Xế", perms: ["DRIVER"] });
  // Tài khoản gắn hồ sơ TỔ CHỨC (ADR-0018 đ9), tài khoản chưa gắn hồ sơ, tài khoản có hồ sơ đã gộp (ADR-0068) — gieo thẳng (Review Focus 5).
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
const dang = (w: any, noiDung = "Toàn văn chính sách THỬ") => w.call("POST", "/api/parties/chinh-sach-rieng-tu", { as: SUP, body: { mucDich: MUC_DICH, noiDung } });
const cuaToi = async (w: any, as: string) => {
  const r = await w.call("GET", "/api/parties/cua-toi", { as });
  assert.equal(r.status, 200, r.text);
  return r.json;
};
const dongY = (w: any, as: string, chinhSachId: string, quyetDinh = "DONG_Y") => w.call("POST", "/api/parties/cua-toi/dong-y", { as, body: { chinhSachId, quyetDinh } });
const dem = (w: any, bang: string) => Number(w.q(`SELECT count(*) n FROM ${bang}`)[0].n);

test("chưa có chính sách: GET 200 chinhSach null, coTheGui false + câu 'Chưa có chính sách…'; đồng ý → 409 no_privacy_policy; không dòng nào", async () => {
  const w = setup();
  const d = await cuaToi(w, SALES);
  assert.equal(d.chinhSach, null);
  assert.equal(d.coTheGui, false);
  assert.equal(d.lyDoKhongGui, "Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau.");
  const r = await dongY(w, SALES, "khong-co");
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "no_privacy_policy");
  assert.equal(dem(w, "pty_consent"), 0);
});

test("đăng chính sách: Bán hàng / Đối tác 403 (cổng admin), Quản trị 403 (ô); Toàn quyền 201 phiên bản 1 rồi 2; thân sai 400; nhật ký chỉ 'phiên bản n'", async () => {
  const w = setup();
  for (const as of [SALES, PARTNER, ADM]) assert.equal((await w.call("POST", "/api/parties/chinh-sach-rieng-tu", { as, body: { mucDich: "x", noiDung: "y" } })).status, 403, as);
  assert.equal((await w.call("POST", "/api/parties/chinh-sach-rieng-tu", { as: SUP, body: { mucDich: "", noiDung: "y" } })).status, 400);
  let r = await dang(w);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.phienBan, 1);
  r = await dang(w, "Toàn văn chính sách THỬ bản hai");
  assert.equal(r.json.phienBan, 2);
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'privacy_policy_published' ORDER BY rowid").map((x: any) => x.detail);
  assert.deepEqual(nk, ["phiên bản 1", "phiên bản 2"]);
  assert.equal((await cuaToi(w, SALES)).chinhSach.phienBan, 2, "phiên bản hiện hành = bản mới nhất");
});

test("đồng ý cho MỌI loại tài khoản (Bán hàng, Đối tác, Tài xế đối tác, lai Bán hàng + Đối tác, Nhân sự, Tài xế): đồng ý → coTheGui; lặp → 409 consent_unchanged; rút → dongY false", async () => {
  const w = setup();
  await dang(w);
  for (const as of [SALES, PARTNER, DRVP, HYB, HR, DRV]) {
    const truoc = await cuaToi(w, as);
    assert.equal(truoc.dongY, false, as);
    assert.equal(truoc.lyDoKhongGui, "Bạn cần đọc và đồng ý chính sách riêng tư hiện hành trước khi gửi thông tin.", as);
    let r = await dongY(w, as, truoc.chinhSach.id);
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    const sau = await cuaToi(w, as);
    assert.equal(sau.dongY, true, as);
    assert.equal(sau.coTheGui, true, as);
    assert.equal(sau.lyDoKhongGui, null, as);
    r = await dongY(w, as, truoc.chinhSach.id);
    assert.equal(r.status, 409, as);
    assert.equal(r.json.error.code, "consent_unchanged", as);
    r = await dongY(w, as, truoc.chinhSach.id, "RUT");
    assert.equal(r.status, 200, as);
    assert.equal((await cuaToi(w, as)).dongY, false, as);
  }
  assert.equal(w.q("SELECT count(*) n FROM pty_consent WHERE created_by = ? AND party_id <> ?", PARTNER, pty(PARTNER))[0].n, 0, "dòng đồng ý luôn gắn hồ sơ của PHIÊN");
  assert.equal((await dongY(w, SALES, "khong-co", "BAT_KY")).status, 400);
});

test("Review Focus 1: có phiên bản mới trong lúc đang mở trang — đồng ý bằng mã phiên bản cũ ⇒ 409 policy_changed, không ghi", async () => {
  const w = setup();
  const cu = (await dang(w)) && (await cuaToi(w, PARTNER)).chinhSach.id;
  await dang(w, "Toàn văn chính sách THỬ bản hai");
  const truoc = dem(w, "pty_consent");
  const r = await dongY(w, PARTNER, cu);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "policy_changed");
  assert.equal(dem(w, "pty_consent"), truoc);
});

test("Review Focus 2: DTO 'Hồ sơ của tôi' đúng DANH SÁCH CHO PHÉP cho Đối tác, Tài xế đối tác, tài khoản lai, Bán hàng — không vai, quan hệ, gộp, tài khoản, mốc tạo", async () => {
  const w = setup();
  await dang(w);
  w.sqlite.prepare("UPDATE pty_person SET birth_date = '1988-04-23' WHERE party_id = ?").run(pty(DRV));
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, expiry_date, created_at, updated_at)
    VALUES ('doc-drv', ?, 'CCCD', '079 333 444 555', '079333444555', '2035-01-01', ?, ?)`).run(pty(DRV), AT, AT);
  for (const as of [PARTNER, DRVP, HYB, SALES, DRV]) {
    const d = await cuaToi(w, as);
    assert.deepEqual(Object.keys(d).sort(), ["chinhSach", "coTheGui", "dongY", "hangGplx", "hoSo", "loaiGiayTo", "lyDoKhongGui", "phieu"], as);
    assert.deepEqual(Object.keys(d.hoSo).sort(), ["diaChi", "dienThoai", "email", "giayTo", "hoTen", "loai", "ngaySinh"], as);
    assert.deepEqual(Object.keys(d.chinhSach).sort(), ["hieuLucTu", "id", "mucDich", "noiDung", "phienBan"], as);
    assert.doesNotMatch(JSON.stringify(d), /"(roles|relationships|mergedFrom|mergedInto|accountLinked|editable|createdAt|updatedAt|createdBy|staffId|partyId)"/, as);
  }
  const drv = await cuaToi(w, DRV);
  assert.equal(drv.hoSo.ngaySinh, "1988-04-23", "chính chủ thấy ngày sinh của mình");
  assert.deepEqual(drv.hoSo.giayTo, [{ loai: "Căn cước công dân (CCCD)", soChe: "••••4555", hetHan: "2035-01-01" }]);
  assert.deepEqual(Object.keys(drv.hoSo.giayTo[0]).sort(), ["hetHan", "loai", "soChe"]);
  assert.doesNotMatch(JSON.stringify(drv), /079333444555|079 333/, "số đủ không bao giờ ra DTO");
});

test("Review Focus 5: tài khoản tổ chức / chưa hồ sơ / hồ sơ đã gộp — GET 200 với câu lời thường; đồng ý 409 đúng mã; không dòng pty_consent", async () => {
  const w = setup();
  const cs = (await dang(w)).json && (await cuaToi(w, SALES)).chinhSach.id;
  for (const [as, ma, cau] of [
    [ORG, "self_person_only", "Hồ sơ tổ chức chưa tự khai được trên Nền tảng. Hãy báo quản trị viên để cập nhật."],
    [NOP, "no_party", "Tài khoản này chưa gắn hồ sơ nên chưa tự khai được. Hãy báo quản trị viên."],
    [GOP, "party_merged", "Hồ sơ của bạn đã được gộp vào hồ sơ khác. Hãy báo quản trị viên."],
  ] as const) {
    const d = await cuaToi(w, as);
    assert.equal(d.coTheGui, false, as);
    assert.equal(d.lyDoKhongGui, cau, as);
    if (as === NOP) assert.equal(d.hoSo, null);
    if (as === ORG) assert.deepEqual([d.hoSo.loai, d.hoSo.ngaySinh, d.hoSo.diaChi, d.hoSo.giayTo], ["ORGANIZATION", null, [], []]);
    const r = await dongY(w, as, cs);
    assert.equal(r.status, 409, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, ma, as);
  }
  assert.equal(dem(w, "pty_consent"), 0);
});

test("ruling Q2: rút đồng ý rút luôn MỌI phiếu đang chờ trong cùng lô (bất biến R-PTY-13); phiếu đã xong không bị đụng", async () => {
  const w = setup();
  await dang(w);
  const cs = (await cuaToi(w, PARTNER)).chinhSach.id;
  await dongY(w, PARTNER, cs);
  const chen = (id: string, kind: string, extra: string) =>
    w.sqlite.prepare(`INSERT INTO pty_self_submission (id, party_id, subject_kind, policy_id, ${extra}, status, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, 'CHO_XAC_MINH', ?, ?, ?, ?)`).run(id, pty(PARTNER), kind, cs, kind === "NGAY_SINH" ? "1990-01-01" : "1 Đường Thử", AT, PARTNER, AT, PARTNER);
  chen("ph-a", "NGAY_SINH", "birth_date");
  chen("ph-b", "DIA_CHI", "address_value");
  w.sqlite.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', decided_at = ?, decided_by = ?, reason_code = 'THU', updated_at = ? WHERE id = 'ph-b'").run(AT, ADM, AT);
  const r = await dongY(w, PARTNER, cs, "RUT");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(w.q("SELECT id, status, decided_by FROM pty_self_submission ORDER BY id").map((x: any) => ({ ...x })), [
    { id: "ph-a", status: "RUT", decided_by: PARTNER },
    { id: "ph-b", status: "TU_CHOI", decided_by: ADM },
  ]);
  assert.deepEqual(w.q("SELECT action FROM audit_log WHERE action IN ('privacy_consent_withdrawn', 'self_submission_withdrawn') ORDER BY rowid").map((x: any) => x.action).sort(), ["privacy_consent_withdrawn", "self_submission_withdrawn"]);
});
