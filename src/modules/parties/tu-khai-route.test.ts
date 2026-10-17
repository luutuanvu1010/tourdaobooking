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
  // M-2 (vòng sửa 1): rút đồng ý khi KHÔNG có phiếu đang chờ ⇒ không dòng nhật ký "rút phiếu" (ghim điều kiện changes() > 0).
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'self_submission_withdrawn'")[0].n, 0, "không phiếu nào bị rút thì không có nhật ký rút phiếu");
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
    assert.deepEqual(Object.keys(d).sort(), ["chinhSach", "coTheGui", "coTheGuiXoa", "dongY", "dongYPhienBan", "hangGplx", "hoSo", "loaiGiayTo", "lyDoKhongGui", "lyDoKhongGuiXoa", "phieu", "phieuXoa"], as);
    assert.deepEqual(Object.keys(d.hoSo).sort(), ["daXoa", "diaChi", "dienThoai", "email", "giayTo", "hoTen", "loai", "ngaySinh"], as);
    assert.deepEqual(Object.keys(d.chinhSach).sort(), ["hanGiuPhienNgay", "hanXuLyXoaNgay", "hieuLucTu", "id", "mucDich", "noiDung", "phienBan"], as);
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

// ==== Phiếu tự khai (Task 4) ========================================================================================================================
const SO_KHAC = "079222333444"; // số GIẢ đã thuộc hồ sơ Quản trị (Review Focus 3)
async function sanSang(w: any, as: string): Promise<string> {
  if (!w.q("SELECT 1 FROM pty_privacy_policy").length) await dang(w);
  const cs = (await cuaToi(w, as)).chinhSach.id as string;
  assert.equal((await dongY(w, as, cs)).status, 200);
  return cs;
}
const gui = (w: any, as: string, body: Record<string, unknown>) => w.call("POST", "/api/parties/cua-toi/phieu", { as, body });
const rut = (w: any, as: string, pid: string) => w.call("POST", `/api/parties/cua-toi/phieu/${pid}/rut`, { as });

test("gửi ba loại phiếu: 201; giá trị HIỆN HÀNH không đổi (5.23); danh sách phiếu chỉ chứa số che; nhật ký chỉ mã + nhãn", async () => {
  const w = setup();
  const cs = await sanSang(w, PARTNER);
  let r = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
  assert.equal(r.status, 201, r.text);
  r = await gui(w, PARTNER, { chinhSachId: cs, loai: "DIA_CHI", diaChi: "86420 Đường Phiếu, Nha Trang" });
  assert.equal(r.status, 201, r.text);
  r = await gui(w, PARTNER, { chinhSachId: cs, loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: "079 111 222 333", issuedDate: "2021-01-01", issuedPlace: "NOI CAP PHIEU THU", expiryDate: "2036-01-01" } });
  assert.equal(r.status, 201, r.text);
  // 5.23: hồ sơ hiện hành, nhãn, giấy tờ không đổi
  assert.equal(w.q("SELECT birth_date b FROM pty_person WHERE party_id = ?", pty(PARTNER))[0].b, null);
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'ADDRESS'", pty(PARTNER))[0].n, 0);
  assert.equal(w.q("SELECT count(*) n FROM pty_person_document WHERE party_id = ?", pty(PARTNER))[0].n, 0);
  assert.equal(w.q("SELECT display_name n FROM v_pty_party_label WHERE id = ?", pty(PARTNER))[0].n, "Đối Tác");
  const hs = await w.call("GET", `/api/parties/${pty(PARTNER)}`, { as: SUP });
  assert.equal(hs.json.party.birthDate, null);
  assert.doesNotMatch(hs.text, /86420|1991-02-03|079111222333/);
  const d = await cuaToi(w, PARTNER);
  assert.deepEqual(d.phieu.map((p: any) => [p.loai, p.trangThai]), [["GIAY_TO", "CHO_XAC_MINH"], ["DIA_CHI", "CHO_XAC_MINH"], ["NGAY_SINH", "CHO_XAC_MINH"]]);
  for (const p of d.phieu) assert.deepEqual(Object.keys(p).sort(), ["daXoa", "diaChi", "giayTo", "guiLuc", "id", "loai", "ngaySinh", "trangThai", "xuLyLuc"]);
  assert.deepEqual(d.phieu[0].giayTo, { loai: "Căn cước công dân (CCCD)", soChe: "••••2333", ngayCap: "2021-01-01", noiCap: "NOI CAP PHIEU THU", hetHan: "2036-01-01" });
  assert.doesNotMatch(JSON.stringify(d), /079111222333|079 111/);
  const nk = JSON.stringify(w.q("SELECT action, detail FROM audit_log WHERE action LIKE 'self_submission_%'"));
  assert.match(nk, /Giấy tờ · Căn cước công dân/);
  assert.doesNotMatch(nk, /86420|1991-02-03|079111|NOI CAP PHIEU/);
});

test("chặn trước khi ghi: chưa đồng ý → 409 consent_required; phiên bản cũ → 409 policy_changed (Review Focus 1); thân sai → 400; không dòng nào", async () => {
  const w = setup();
  await dang(w);
  const cs = (await cuaToi(w, SALES)).chinhSach.id;
  let r = await gui(w, SALES, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1990-01-01" });
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "consent_required");
  await dongY(w, SALES, cs);
  await dang(w, "Toàn văn chính sách THỬ bản hai");
  r = await gui(w, SALES, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1990-01-01" });
  assert.equal(r.json.error.code, "policy_changed");
  const cs2 = (await cuaToi(w, SALES)).chinhSach.id;
  await dongY(w, SALES, cs2);
  for (const body of [{ chinhSachId: cs2, loai: "HO_TEN" }, { chinhSachId: cs2, loai: "NGAY_SINH", ngaySinh: "2099-01-01" }, { chinhSachId: cs2, loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: "123" } }]) {
    const x = await gui(w, SALES, body);
    assert.equal(x.status, 400, JSON.stringify(body));
  }
  assert.equal(dem(w, "pty_self_submission"), 0);
});

test("Review Focus 3: khai số CCCD đã thuộc người khác ⇒ 201 như mọi số, phản hồi không có chữ nào cho biết số đã có", async () => {
  const w = setup();
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at) VALUES ('doc-adm', ?, 'CCCD', ?, ?, ?, ?)`).run(pty(ADM), SO_KHAC, SO_KHAC, AT, AT);
  const cs = await sanSang(w, PARTNER);
  const r = await gui(w, PARTNER, { chinhSachId: cs, loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: SO_KHAC } });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(Object.keys(r.json), ["phieuId"]);
  assert.doesNotMatch(r.text, /đã có|trùng|khác/i);
});

test("Review Focus 4: một phiếu đang chờ mỗi loại; rút → khai lại được; rút hai lần / phiếu đã bị từ chối → 409; phiếu người khác / mã lạ → 404", async () => {
  const w = setup();
  const cs = await sanSang(w, PARTNER);
  const a = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
  const b = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-04" });
  assert.equal(b.status, 409);
  assert.equal(b.json.error.code, "submission_pending");
  assert.equal(dem(w, "pty_self_submission"), 1, "bấm hai lần chỉ sinh MỘT phiếu");
  const pid = a.json.phieuId;
  assert.equal((await rut(w, SALES, pid)).status, 404, "phiếu của người khác như không tồn tại");
  assert.equal((await rut(w, PARTNER, crypto.randomUUID())).status, 404);
  assert.equal((await rut(w, PARTNER, "khong-phai-uuid")).status, 404);
  let r = await rut(w, PARTNER, pid);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { phieuId: pid, trangThai: "RUT" });
  r = await rut(w, PARTNER, pid);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "submission_not_pending");
  const c = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-04" });
  assert.equal(c.status, 201, "đã rút thì khai lại được");
  w.sqlite.prepare("UPDATE pty_self_submission SET status = 'TU_CHOI', decided_at = ?, decided_by = ?, reason_code = 'THU', updated_at = ? WHERE id = ?").run(AT, ADM, AT, c.json.phieuId);
  assert.equal((await rut(w, PARTNER, c.json.phieuId)).json.error.code, "submission_not_pending");
});

test("own lấy từ PHIÊN: thân mang partyId / party_id của người khác bị bỏ qua — phiếu luôn gắn hồ sơ của người gọi", async () => {
  const w = setup();
  const cs = await sanSang(w, SALES);
  const r = await gui(w, SALES, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1990-01-01", partyId: pty(PARTNER), party_id: pty(PARTNER) });
  assert.equal(r.status, 201, r.text);
  assert.equal(w.q("SELECT party_id p, created_by c FROM pty_self_submission")[0].p, pty(SALES));
});

test("giống giá trị đang có (ruling R12): ngày sinh trùng / địa chỉ trùng (khác hoa thường) → 409 same_as_current", async () => {
  const w = setup();
  w.sqlite.prepare("UPDATE pty_person SET birth_date = '1988-04-23' WHERE party_id = ?").run(pty(SALES));
  w.sqlite.prepare("INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at) VALUES ('cp-1', ?, 'ADDRESS', '1 Đường Cũ', '1 đường cũ', 1, '2026-01-01', ?, ?)").run(pty(SALES), AT, AT);
  const cs = await sanSang(w, SALES);
  assert.equal((await gui(w, SALES, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1988-04-23" })).json.error.code, "same_as_current");
  assert.equal((await gui(w, SALES, { chinhSachId: cs, loai: "DIA_CHI", diaChi: "1 ĐƯỜNG CŨ" })).json.error.code, "same_as_current");
});

test("M-3 (vòng sửa 1): so trùng địa chỉ chỉ với địa chỉ ĐANG MỞ; giá trị đang lưu được chuẩn hoá NFC + gộp khoảng trắng trước khi so", async () => {
  const w = setup();
  const chen = (id: string, value: string, validTo: string | null) =>
    w.sqlite.prepare("INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, 'ADDRESS', ?, ?, 0, '2026-01-01', ?, ?, ?)")
      .run(id, pty(SALES), value, value.toLowerCase(), validTo, AT, AT);
  chen("cp-dong", "2 Đường Đã Đóng", "2026-02-01");
  chen("cp-nfd", "3  Đường  Lê Lợi".normalize("NFD"), null); // dòng cũ lưu dạng tổ hợp (NFD) và thừa khoảng trắng
  const cs = await sanSang(w, SALES);
  const dong = await gui(w, SALES, { chinhSachId: cs, loai: "DIA_CHI", diaChi: "2 Đường Đã Đóng" });
  assert.equal(dong.status, 201, `địa chỉ đã đóng không tính là "đang có": ${dong.text}`);
  await rut(w, SALES, dong.json.phieuId);
  const nfd = await gui(w, SALES, { chinhSachId: cs, loai: "DIA_CHI", diaChi: "3 đường lê lợi" });
  assert.equal(nfd.status, 409, nfd.text);
  assert.equal(nfd.json.error.code, "same_as_current");
});

test("lính gác trong câu ghi: đồng ý bị rút trong khe giữa lúc đọc và lúc ghi ⇒ 409 consent_required, không phiếu", async () => {
  const w = setup();
  const cs = await sanSang(w, PARTNER);
  const goc = w.env.DB.batch.bind(w.env.DB);
  w.env.DB.batch = async (stmts: any[]) => {
    if (stmts.some((s) => String(s.sql).includes("INSERT INTO pty_self_submission"))) {
      w.sqlite.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES ('c-khe', ?, ?, 'RUT', ?, ?, ?, ?)")
        .run(pty(PARTNER), cs, "2099-01-01T00:00:00.000Z", PARTNER, "2099-01-01T00:00:00.000Z", PARTNER);
    }
    return goc(stmts);
  };
  const r = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "consent_required");
  assert.equal(dem(w, "pty_self_submission"), 0);
});

test("M-4 (vòng sửa 2): hai quyết định đồng ý CÙNG mili-giây — 'mới nhất' theo rowid (dòng chèn sau thắng): dongY / dongYPhienBan / gửi phiếu đi đúng cả hai chiều", async () => {
  const w = setup();
  assert.equal((await dang(w)).status, 201);
  const cs = (await cuaToi(w, PARTNER)).chinhSach.id as string;
  // Chỉ mục pty_consent_party_ix (party_id, created_at) duyệt ngược đã tự cho hoà mili-giây ra rowid giảm dần — gỡ nó trong DB thử để bài ghim ORDER BY của câu.
  w.sqlite.exec("DROP INDEX pty_consent_party_ix");
  const T = "2026-10-17T05:00:00.000Z";
  const quyetDinh = (id: string, d: string) => w.sqlite.prepare("INSERT INTO pty_consent (id, party_id, policy_id, decision, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, pty(PARTNER), cs, d, T, PARTNER, T, PARTNER);
  quyetDinh("z-dong-y", "DONG_Y"); // mã chữ không theo thứ tự chèn — bài không dựa vào thứ tự mã
  quyetDinh("a-rut", "RUT"); // cùng mili-giây, chèn SAU ⇒ rút là quyết định mới nhất
  let d = await cuaToi(w, PARTNER);
  assert.equal(d.dongY, false, "rút chèn sau phải thắng");
  assert.deepEqual(d.dongYPhienBan, []);
  const r = await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "consent_required");
  quyetDinh("m-dong-y-lai", "DONG_Y"); // đồng ý lại, vẫn cùng mili-giây ⇒ đồng ý thắng
  d = await cuaToi(w, PARTNER);
  assert.equal(d.dongY, true, "đồng ý chèn sau phải thắng");
  assert.deepEqual(d.dongYPhienBan.map((p: any) => p.id), [cs]);
  assert.equal((await gui(w, PARTNER, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" })).status, 201);
});

test("Review Focus 5 (ghi): tài khoản tổ chức / chưa hồ sơ / đã gộp gửi phiếu → 409 đúng mã, không dòng", async () => {
  const w = setup();
  await dang(w);
  const cs = (await cuaToi(w, SALES)).chinhSach.id;
  for (const [as, ma] of [[ORG, "self_person_only"], [NOP, "no_party"], [GOP, "party_merged"]] as const) {
    const r = await gui(w, as, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1990-01-01" });
    assert.equal(r.status, 409, as);
    assert.equal(r.json.error.code, ma, as);
    assert.equal((await rut(w, as, crypto.randomUUID())).status, 404, as);
  }
  assert.equal(dem(w, "pty_self_submission"), 0);
});

test("Review Focus 4 (cùng vé — bấm 'Gửi' hai lần do mạng chập): lần hai được lớp vé phát lại kết quả lần một, vẫn MỘT phiếu, MỘT dòng nhật ký", async () => {
  const w = setup();
  const cs = await sanSang(w, PARTNER);
  const ve = crypto.randomUUID();
  const body = { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh: "1991-02-03" };
  const r1 = await w.call("POST", "/api/parties/cua-toi/phieu", { as: PARTNER, body, headers: { "idempotency-key": ve } });
  assert.equal(r1.status, 201, r1.text);
  assert.equal(r1.headers.get("location"), "/account");
  await w.choNen();
  const r2 = await w.call("POST", "/api/parties/cua-toi/phieu", { as: PARTNER, body, headers: { "idempotency-key": ve } });
  assert.deepEqual(r2.json, { da_ghi_truoc_do: true, ket_qua: "/account" });
  assert.equal(dem(w, "pty_self_submission"), 1);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'self_submission_created'")[0].n, 1);
});

test("ngày sinh tương lai / trước 1900 / sai khuôn bị MÁY CHỦ chặn (400) dù giao diện bị bỏ qua; câu lỗi không chép lại giá trị", async () => {
  const w = setup();
  const cs = await sanSang(w, SALES);
  for (const ngaySinh of ["2099-12-31", "1899-12-31", "31/12/1990", "1990-02-30"]) {
    const r = await gui(w, SALES, { chinhSachId: cs, loai: "NGAY_SINH", ngaySinh });
    assert.equal(r.status, 400, `${ngaySinh}: ${r.text}`);
    assert.ok(!r.text.includes(ngaySinh), ngaySinh);
  }
  assert.equal(dem(w, "pty_self_submission"), 0);
});

// ==== Vòng sửa 1 (ruling I-2 của điều phối): rút đồng ý một phiên bản CŨ vẫn đang đồng ý ===================================================================
test("I-2: đồng ý bản 1, gửi phiếu, Toàn quyền đăng bản 2 ⇒ rút bản 1 được (200): phiếu theo bản 1 thành đã rút, có dòng RUT mới; phiếu theo bản 2 không bị đụng", async () => {
  const w = setup();
  const cs1 = await sanSang(w, PARTNER);
  const p1 = await gui(w, PARTNER, { chinhSachId: cs1, loai: "NGAY_SINH", ngaySinh: "1991-02-03" });
  assert.equal(p1.status, 201, p1.text);
  await dang(w, "Toàn văn chính sách THỬ bản hai");
  let d = await cuaToi(w, PARTNER);
  assert.equal(d.dongY, false, "bản hiện hành (2) chưa đồng ý");
  assert.deepEqual(d.dongYPhienBan, [{ id: cs1, phienBan: 1 }], "GET kể các phiên bản ĐANG đồng ý");
  const cs2 = d.chinhSach.id as string;
  assert.equal((await dongY(w, PARTNER, cs2)).status, 200);
  const p2 = await gui(w, PARTNER, { chinhSachId: cs2, loai: "DIA_CHI", diaChi: "1 Đường Bản Hai" });
  assert.equal(p2.status, 201, p2.text);
  assert.deepEqual((await cuaToi(w, PARTNER)).dongYPhienBan.map((x: any) => x.phienBan), [2, 1]);

  const r = await dongY(w, PARTNER, cs1, "RUT");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { dongY: false });
  assert.deepEqual(w.q("SELECT id, status FROM pty_self_submission ORDER BY created_at").map((x: any) => [x.id, x.status]), [[p1.json.phieuId, "RUT"], [p2.json.phieuId, "CHO_XAC_MINH"]]);
  assert.deepEqual(w.q("SELECT decision FROM pty_consent WHERE party_id = ? AND policy_id = ? ORDER BY created_at, rowid", pty(PARTNER), cs1).map((x: any) => x.decision), ["DONG_Y", "RUT"]);
  d = await cuaToi(w, PARTNER);
  assert.equal(d.dongY, true, "đồng ý bản 2 còn nguyên");
  assert.deepEqual(d.dongYPhienBan, [{ id: cs2, phienBan: 2 }]);
  assert.deepEqual(w.q("SELECT detail FROM audit_log WHERE action = 'privacy_consent_withdrawn'").map((x: any) => x.detail), ["phiên bản 1"]);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'self_submission_withdrawn'")[0].n, 1);
  assert.equal(w.q(`SELECT count(*) n FROM pty_self_submission s WHERE s.status = 'CHO_XAC_MINH' AND COALESCE((SELECT c.decision FROM pty_consent c WHERE c.party_id = s.party_id
    AND c.policy_id = s.policy_id ORDER BY c.created_at DESC, c.rowid DESC LIMIT 1), '') <> 'DONG_Y'`)[0].n, 0, "bất biến R-PTY-13");

  // Rút lại bản 1 / rút bản chưa từng đồng ý / mã lạ ⇒ 409 consent_unchanged, không dòng mới. Đồng ý bản 1 (không còn hiện hành) ⇒ 409 policy_changed.
  const truoc = dem(w, "pty_consent");
  for (const id of [cs1, crypto.randomUUID()]) {
    const x = await dongY(w, PARTNER, id, "RUT");
    assert.equal(x.status, 409, x.text);
    assert.equal(x.json.error.code, "consent_unchanged");
  }
  assert.equal((await dongY(w, PARTNER, cs1)).json.error.code, "policy_changed");
  assert.equal(dem(w, "pty_consent"), truoc);
});

test("M-4: đồng ý / rút đồng ý với partyId, party_id của người khác trong thân ⇒ bị bỏ qua, dòng đồng ý luôn gắn hồ sơ của PHIÊN", async () => {
  const w = setup();
  await dang(w);
  const cs = (await cuaToi(w, SALES)).chinhSach.id;
  let r = await w.call("POST", "/api/parties/cua-toi/dong-y", { as: SALES, body: { chinhSachId: cs, quyetDinh: "DONG_Y", partyId: pty(PARTNER), party_id: pty(PARTNER) } });
  assert.equal(r.status, 200, r.text);
  r = await w.call("POST", "/api/parties/cua-toi/dong-y", { as: SALES, body: { chinhSachId: cs, quyetDinh: "RUT", partyId: pty(PARTNER), party_id: pty(PARTNER) } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(w.q("SELECT party_id, decision FROM pty_consent ORDER BY created_at, rowid").map((x: any) => [x.party_id, x.decision]), [[pty(SALES), "DONG_Y"], [pty(SALES), "RUT"]]);
  assert.equal((await cuaToi(w, PARTNER)).dongY, false, "hồ sơ người khác không bị ghi");
});
