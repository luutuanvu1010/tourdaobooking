// ADR-0213 Đ2.4–Đ2.8, Đ6 (mốc B1 đợt 2 đăng ký, Task 10) qua route thật (tests/audit/harness.mjs, SQLite thật dựng từ migrations/). Mọi giá trị là GIẢ.
// Người quản lý có hiệu lực (đối chiếu R-TC-4); văn phòng (Quản lý bán hàng, Quản trị, Toàn quyền — ô partner.org.manager.write) giao, chuyển, gỡ người quản lý, gỡ thành viên;
// người quản lý gọi lệnh văn phòng ⇒ 403; thư báo người quản lý cũ (notice_state CHO → DA_GUI, gửi lại); hai lệnh chuyển cùng lúc. Ba route của người quản lý / thành viên
// (/api/to-chuc/:id/*, hàm kiểm vai trên đối tượng `quyenToChuc` — chủ duyệt 16/11 «Duyệt cả hai»): yêu cầu chuyển, gỡ thành viên, tự rời; người lạ, thành viên tổ chức khác,
// tài khoản văn phòng không liên kết đều bị từ chối.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
// @ts-expect-error tệp .mjs không có khai kiểu
import { CHECKS, demViPham } from "../../../scripts/audit-checks.mjs";

const QLBH = "11111111-1111-4111-8111-111111111110"; // Quản lý bán hàng (kèm Bán hàng — ADR-0169)
const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const HR = "99999999-9999-4999-8999-999999999999";
const AT = "2026-11-01T00:00:00.000Z";
const SO_DT = /(?<![\w-])0\d{9}(?!\d)/; // số điện thoại 10 số đứng riêng (không phải đoạn số trong mã hồ sơ)

let n = 0;
const uuid = (): string => `aaaaaaaa-0000-4000-8000-${String(++n).padStart(12, "0")}`;
type W = ReturnType<typeof world>;
type Thu = { to: string; subject: string; text?: string; html?: string };

function setup(o: { guiHong?: boolean } = {}) {
  const w = world();
  for (const [id, phone, name, perms] of [
    [QLBH, "0900000010", "Quản Lý Bán", ["SALES", "SALES_MANAGER"]], [SALES, "0900000001", "Bán Hàng", ["SALES"]], [KT, "0900000002", "Kế Toán", ["ACCOUNTING"]],
    [ADM, "0900000003", "Quản Trị", ["ADMIN"]], [SUP, "0900000007", "Chủ", ["SUPER_ADMIN"]], [HR, "0900000013", "Nhân Sự", ["HR"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  const thu: Thu[] = [];
  const bo = { hong: o.guiHong ?? false };
  w.env.FEEDBACK_MAIL_FROM = "no-reply@example.com";
  w.env.EMAIL = { send: async (m: Thu) => { if (bo.hong) throw new Error(`E_PROVIDER ${m.to}`); thu.push(m); } };
  return { w, thu, bo };
}

/** Tổ chức đối tác được hưởng (vai Công ty lữ hành). */
function toChuc(w: W, ten = "Khách sạn Sunrise"): string {
  const id = uuid();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', NULL, '2026-01-01', ?, ?)").run(uuid(), id, AT, AT);
  return id;
}
let soDt = 100;
/** Người có tài khoản Đối tác (hồ sơ mang vai đối tác riêng — khung thử dựng như vậy). Trả { staffId, partyId }. */
function doiTac(w: W, ten: string, o: { perms?: string[]; vai?: string; email?: boolean } = {}) {
  const staffId = uuid();
  seedStaff(w.sqlite, { id: staffId, phone: `09${String(++soDt).padStart(8, "0")}`, name: ten, perms: o.perms ?? ["PARTNER"], ...(o.vai ? { vai: o.vai } : {}) });
  const partyId = `pty-${staffId}`;
  if (o.email !== false) {
    w.sqlite.prepare("INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at) VALUES (?, ?, 'EMAIL', ?, ?, 1, '2026-01-01', ?, ?)")
      .run(uuid(), partyId, `${ten.toLowerCase().replace(/\s+/g, "-")}@example.com`, `${ten.toLowerCase().replace(/\s+/g, "-")}@example.com`, AT, AT);
  }
  return { staffId, partyId };
}
function lienKet(w: W, person: string, org: string, loai: "MANAGER_OF" | "MEMBER_OF", tu = "2026-11-01"): string {
  const id = uuid();
  w.sqlite.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, person, org, loai, tu, AT, AT);
  return id;
}
const mo = (w: W, org: string): [string, string][] =>
  w.q("SELECT person_party_id AS p, kind FROM v_pty_org_link WHERE org_party_id = ? ORDER BY kind, person_party_id", org).map((r: { p: string; kind: string }) => [r.p, r.kind]);
const LY_DO = "THEO_YEU_CAU_TO_CHUC";
/** Phiếu đăng ký đã duyệt, chưa kích hoạt, sinh ra tài khoản `staffId` (đi đúng chuỗi trạng thái của trigger dk_*; khuôn src/modules/dang-ky/thu-bao-tra-ve.test.ts). */
function daDuyetChuaKichHoat(w: W, staffId: string) {
  const id = "DK_TCKICHHO";
  if (w.q("SELECT 1 FROM pty_privacy_policy LIMIT 1").length === 0) {
    w.sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${AT}', '${AT}', '${SUP}', '${AT}', '${SUP}')`);
  }
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'TRAVEL_AGENCY', ?, ?)").run(id, AT, AT);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', 'tc-kich-hoat@example.com', 'tc-kich-hoat@example.com', ?, ?)").run(`ident-${id}`, id, AT, AT);
  w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, family_name, given_name, birth_date, address_value, phone_value, phone_key, policy_id, consented_at, created_at, updated_at)
    VALUES (?, ?, 1, 'Phạm', 'Chờ', '1990-05-06', '12 Đường Thử', '0912 345 678', '0912345678', 'pol', ?, ?, ?)`).run(`sub-${id}`, id, AT, AT, AT);
  w.sqlite.prepare("UPDATE dk_registration SET current_version = 1, submitted_at = ? WHERE id = ?").run(AT, id);
  for (const t of ["CHO_XAC_MINH", "CHO_DUYET"]) w.sqlite.prepare("UPDATE dk_registration SET status = ? WHERE id = ?").run(t, id);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'DA_DUYET', staff_id = ?, decided_at = ?, activation_deadline_at = '2099-01-01T00:00:00.000Z' WHERE id = ?").run(staffId, AT, id);
}
/** Người quản lý đang mở (mã hồ sơ) — màn hình «đang thấy» lúc bấm (vòng sửa 1, M-1). */
const quanLyMo = (w: W, org: string): string | null =>
  w.q("SELECT person_party_id AS p FROM v_pty_org_link WHERE org_party_id = ? AND kind = 'MANAGER'", org)[0]?.p ?? null;
/** Lệnh giao / chuyển; `nguoiQuanLyHienTai` vắng thì lấy người quản lý đang mở ĐÚNG LÚC GỌI (màn hình vừa tải). */
const giao = (w: W, as: string, org: string, body: Record<string, unknown>) =>
  w.call("POST", `/api/parties/${org}/to-chuc/nguoi-quan-ly`, { as, body: { lyDo: LY_DO, nguoiQuanLyHienTai: quanLyMo(w, org), ...body } });
const kiem = (w: W, code: string): unknown[] => {
  const c = CHECKS.find((x: { code: string }) => x.code === code);
  return w.q(c.sql.replace(/\s+/g, " ").trim()).map((r: Record<string, unknown>) => Object.values(r)[0]);
};
const nhatKy = (w: W, org: string) => w.q("SELECT action, staff_id, target_type, target_id, detail, acting_party_id FROM audit_log WHERE target_id = ? ORDER BY created_at, rowid", org);

test("Quyền (Đ6): Bán hàng, Kế toán, Nhân sự gọi giao người quản lý ⇒ 403; Quản lý bán hàng, Quản trị, Toàn quyền ⇒ được; người quản lý gọi chuyển ⇒ 403", async () => {
  const { w } = setup();
  for (const as of [SALES, KT, HR]) {
    const org = toChuc(w);
    const a = doiTac(w, "Nguyễn An");
    const r = await giao(w, as, org, { personPartyId: a.partyId });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.deepEqual(mo(w, org), []);
  }
  for (const as of [QLBH, ADM, SUP]) {
    const org = toChuc(w);
    const a = doiTac(w, "Trần Bình");
    const r = await giao(w, as, org, { personPartyId: a.partyId, lyDo: "GIAO_LAN_DAU" });
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.deepEqual(mo(w, org), [[a.partyId, "MANAGER"]]);
    assert.equal(r.json.toChuc.nguoiQuanLy.partyId, a.partyId);
    assert.equal(r.json.toChuc.nguoiQuanLy.coHieuLuc, true);
    const nk = nhatKy(w, org);
    assert.deepEqual(nk.map((x: { action: string }) => x.action), ["org_manager_assigned"]);
    assert.equal(nk[0].target_type, "party");
    assert.equal(nk[0].acting_party_id, org, "PF18: nhật ký quản trị tổ chức ghi tổ chức vào acting_party_id");
    // Người quản lý (có hiệu lực) gọi lệnh chuyển của văn phòng: không qua cổng.
    const b = doiTac(w, "Lê Cường");
    const r2 = await giao(w, a.staffId, org, { personPartyId: b.partyId });
    assert.equal(r2.status, 403, r2.text);
    assert.deepEqual(mo(w, org), [[a.partyId, "MANAGER"]]);
  }
  const org = toChuc(w);
  assert.equal((await w.call("GET", `/api/parties/${org}/to-chuc`, { as: SALES })).status, 403);
  assert.equal((await w.call("GET", `/api/parties/${org}/to-chuc`, { as: ADM })).status, 200);
});

test("Đ2.6: gắn tài khoản nội bộ, Tài xế đối tác, tài khoản ngưng hẳn, hồ sơ không tài khoản ⇒ 409, không ghi gì; tài khoản đã duyệt chưa kích hoạt ⇒ được", async () => {
  const { w } = setup();
  const org = toChuc(w);
  const noiBo = doiTac(w, "Nội Bộ", { perms: ["SALES"] });
  const taiXe = doiTac(w, "Tài Xế", { perms: ["DRIVER_PARTNER"], vai: "DRIVER_EXTERNAL" });
  const lai = doiTac(w, "Tài Khoản Lai", { perms: ["PARTNER", "SALES"] }); // dữ liệu cũ: giữ Đối tác KÈM quyền nội bộ (khung thử dựng hình dạng kiểu cũ)
  const ngung = doiTac(w, "Đã Ngưng");
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(ngung.staffId);
  const khongTk = uuid();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Không TK', 1, ?, ?)").run(khongTk, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Không TK', ?, ?)").run(khongTk, AT, AT);
  for (const p of [noiBo.partyId, taiXe.partyId, lai.partyId, ngung.partyId, khongTk]) {
    const r = await giao(w, ADM, org, { personPartyId: p });
    assert.equal(r.status, 409, `${p}: ${r.text}`);
    assert.doesNotMatch(r.text, SO_DT);
  }
  assert.deepEqual(mo(w, org), []);
  assert.deepEqual(nhatKy(w, org), []);
  // Đã duyệt từ phiếu, chưa kích hoạt (staff.active = 0 + dòng phiếu DA_DUYET chưa activated_at) ⇒ gắn được (ADR-0207 Đ7).
  const cho = doiTac(w, "Chờ Kích Hoạt");
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(cho.staffId);
  daDuyetChuaKichHoat(w, cho.staffId);
  const r = await giao(w, ADM, org, { personPartyId: cho.partyId, lyDo: "GIAO_LAN_DAU" });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.toChuc.nguoiQuanLy.coHieuLuc, false, "chưa kích hoạt ⇒ chưa có hiệu lực (Đ2.8)");
});

test("Đ2.4 chuyển: người mới đang là thành viên ⇒ một người quản lý mới, người cũ thành thành viên (mặc định), yêu cầu chuyển đang mở đóng; thư báo người cũ CHO → DA_GUI, không tên người mới, không số điện thoại", async () => {
  const { w, thu } = setup();
  const org = toChuc(w, "Khách sạn Sunrise Nha Trang");
  const a = doiTac(w, "Phạm Quản");
  const b = doiTac(w, "Võ Thành");
  const c = doiTac(w, "Đỗ Viên");
  const ra = lienKet(w, a.partyId, org, "MANAGER_OF");
  lienKet(w, b.partyId, org, "MEMBER_OF");
  lienKet(w, c.partyId, org, "MEMBER_OF");
  // Yêu cầu chuyển đang mở do người quản lý gửi (route của người quản lý chưa khai — gieo thẳng dòng như lô của route sẽ ghi).
  w.sqlite.prepare("INSERT INTO pty_org_transfer_request (id, org_party_id, requested_by_staff_id, proposed_person_party_id, status, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, 'MO', ?, ?, ?, ?)")
    .run(uuid(), org, a.staffId, b.partyId, AT, a.staffId, AT, a.staffId);
  const g0 = await w.call("GET", `/api/parties/${org}/to-chuc`, { as: ADM });
  assert.deepEqual(g0.json.toChuc.yeuCauChuyen.map((x: { nguoiDeXuat: { partyId: string } }) => x.nguoiDeXuat.partyId), [b.partyId]);
  assert.doesNotMatch(g0.text, SO_DT);
  const r = await giao(w, QLBH, org, { personPartyId: b.partyId });
  assert.equal(r.status, 200, r.text);
  await w.choNen();
  assert.deepEqual(mo(w, org), [[b.partyId, "MANAGER"], ...[[a.partyId, "MEMBER"], [c.partyId, "MEMBER"]].sort((x, y) => x[0]!.localeCompare(y[0]!))]);
  const cu = w.q("SELECT valid_to_date, replaced_by_id, notice_state FROM pty_party_relationship WHERE id = ?", ra)[0];
  assert.equal(cu.notice_state, "DA_GUI");
  assert.equal(w.q("SELECT relationship_type_code t FROM pty_party_relationship WHERE id = ?", cu.replaced_by_id)[0].t, "MANAGER_OF");
  assert.deepEqual(w.q("SELECT status FROM pty_org_transfer_request WHERE org_party_id = ?", org).map((x: { status: string }) => x.status), ["DA_XU_LY"]);
  assert.equal(thu.length, 1);
  assert.equal(thu[0]!.to, "phạm-quản@example.com");
  assert.match(thu[0]!.text!, /Khách sạn Sunrise Nha Trang/);
  assert.match(thu[0]!.text!, /không còn là người quản lý tổ chức này/);
  assert.doesNotMatch(`${thu[0]!.subject}${thu[0]!.text}${thu[0]!.html}`, /Võ Thành|0[0-9]{9}/);
  assert.deepEqual(kiem(w, "R-TC-1"), []);
  assert.deepEqual(kiem(w, "R-TC-2"), []);
  const nk = nhatKy(w, org);
  assert.deepEqual(nk.map((x: { action: string }) => x.action), ["org_manager_transferred"]);
  for (const x of nk) {
    assert.equal(x.acting_party_id, org);
    assert.doesNotMatch(String(x.detail ?? ""), SO_DT);
  }
  // Bỏ chọn «người cũ thành thành viên» ⇒ người cũ rời hẳn. Người mới không có email ⇒ lần sau KHONG_EMAIL.
  const org2 = toChuc(w);
  const d = doiTac(w, "Không Thư", { email: false });
  const e = doiTac(w, "Người Mới");
  const rd = lienKet(w, d.partyId, org2, "MANAGER_OF");
  const r2 = await giao(w, ADM, org2, { personPartyId: e.partyId, nguoiCuThanhThanhVien: false });
  assert.equal(r2.status, 200, r2.text);
  await w.choNen();
  assert.deepEqual(mo(w, org2), [[e.partyId, "MANAGER"]]);
  assert.equal(w.q("SELECT notice_state FROM pty_party_relationship WHERE id = ?", rd)[0].notice_state, "KHONG_EMAIL");
  assert.equal(thu.length, 1, "không email ⇒ không gửi");
});

test("Thư (Đ6, Ruling R5): thư giả lỗi ⇒ lô vẫn xong, dòng cũ vẫn CHO, GET thấy CHO; gửi lại khi đã sửa ⇒ DA_GUI; gửi lại lần nữa ⇒ 409", async () => {
  const { w, thu, bo } = setup({ guiHong: true });
  const org = toChuc(w);
  const a = doiTac(w, "Thư Hỏng");
  const b = doiTac(w, "Người Nhận");
  const ra = lienKet(w, a.partyId, org, "MANAGER_OF");
  const r = await giao(w, ADM, org, { personPartyId: b.partyId });
  assert.equal(r.status, 200, r.text);
  await w.choNen();
  assert.equal(w.q("SELECT notice_state FROM pty_party_relationship WHERE id = ?", ra)[0].notice_state, "CHO");
  const g = await w.call("GET", `/api/parties/${org}/to-chuc`, { as: ADM });
  assert.equal(g.json.toChuc.thu.trangThai, "CHO");
  assert.equal((await w.call("POST", `/api/parties/${org}/to-chuc/gui-lai-thu`, { as: SALES, body: {} })).status, 403);
  bo.hong = false;
  const gl = await w.call("POST", `/api/parties/${org}/to-chuc/gui-lai-thu`, { as: ADM, body: {} });
  assert.equal(gl.status, 200, gl.text);
  await w.choNen();
  assert.equal(w.q("SELECT notice_state FROM pty_party_relationship WHERE id = ?", ra)[0].notice_state, "DA_GUI");
  assert.equal(thu.length, 1);
  assert.equal((await w.call("POST", `/api/parties/${org}/to-chuc/gui-lai-thu`, { as: ADM, body: {} })).status, 409);
});

test("Review Focus 4: hai lệnh chuyển cùng lúc (cùng hoặc khác người mới) ⇒ đúng một thắng, người thua 409 rõ, tổ chức luôn đúng một người quản lý; R-TC-1, R-TC-2 sạch", async () => {
  for (const cungNguoi of [false, true]) {
    const { w } = setup();
    const org = toChuc(w);
    const a = doiTac(w, "Cũ");
    const b = doiTac(w, "Mới Một");
    const c = cungNguoi ? b : doiTac(w, "Mới Hai");
    lienKet(w, a.partyId, org, "MANAGER_OF");
    lienKet(w, doiTac(w, "Thành Viên").partyId, org, "MEMBER_OF");
    // Tất định: lệnh của Quản trị chạy TRỌN trong khe giữa lúc lệnh của Quản lý bán hàng đọc và lúc nó ghi.
    let thang: { status: number; text: string } | null = null;
    w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /UPDATE pty_party_relationship SET valid_to_date/.test(s.sql)), async () => {
      thang = await giao(w, ADM, org, { personPartyId: b.partyId });
    });
    const thua = await giao(w, QLBH, org, { personPartyId: c.partyId });
    assert.equal(thang!.status, 200, thang!.text);
    assert.equal(thua.status, 409, thua.text);
    assert.match(thua.json.error.message, /Người quản lý của tổ chức vừa thay đổi/);
    const ql = mo(w, org).filter(([, k]) => k === "MANAGER");
    assert.deepEqual(ql, [[b.partyId, "MANAGER"]], `cungNguoi=${cungNguoi}`);
    assert.deepEqual(kiem(w, "R-TC-1"), []);
    assert.deepEqual(kiem(w, "R-TC-2"), []);
    assert.equal(nhatKy(w, org).filter((x: { action: string }) => x.action === "org_manager_transferred").length, 1);
  }
  // Biến thể Promise.all (hai lệnh gửi cùng lúc): khung thử có thể chạy hai lệnh nối đuôi (lệnh sau đọc SAU khi lệnh trước ghi ⇒ hai lần chuyển hợp lệ nối nhau) hoặc xen kẽ
  // (một 409). Ca nào cũng: không 500, mỗi lệnh 200 là đúng một dòng nhật ký chuyển, và tổ chức luôn đúng một người quản lý. Ca xen kẽ chắc chắn là phần tất định ở trên.
  const { w } = setup();
  const org = toChuc(w);
  lienKet(w, doiTac(w, "Cũ").partyId, org, "MANAGER_OF");
  lienKet(w, doiTac(w, "Thành Viên").partyId, org, "MEMBER_OF");
  const [x, y] = await Promise.all([giao(w, ADM, org, { personPartyId: doiTac(w, "Một").partyId }), giao(w, SUP, org, { personPartyId: doiTac(w, "Hai").partyId })]);
  // Hai lệnh cùng «đang thấy» người cũ: dù khung thử chạy nối đuôi hay xen kẽ, chỉ một lệnh thắng (M-1 + lính gác).
  const st = [x.status, y.status].sort();
  assert.deepEqual(st, [200, 409], `${x.text} | ${y.text}`);
  assert.equal(nhatKy(w, org).filter((r: { action: string }) => r.action === "org_manager_transferred").length, st.filter((s) => s === 200).length);
  assert.equal(mo(w, org).filter(([, k]) => k === "MANAGER").length, 1);
  assert.deepEqual(kiem(w, "R-TC-1"), []);
  assert.deepEqual(kiem(w, "R-TC-2"), []);
});

test("Đ2.9: chuyển A → B rồi trả lại A trong cùng ngày ⇒ 409 câu rõ, không gì đổi", async () => {
  const { w } = setup();
  const org = toChuc(w);
  const a = doiTac(w, "An");
  const b = doiTac(w, "Bình");
  lienKet(w, a.partyId, org, "MANAGER_OF");
  assert.equal((await giao(w, ADM, org, { personPartyId: b.partyId })).status, 200);
  const truoc = w.q("SELECT * FROM pty_party_relationship WHERE to_party_id = ? ORDER BY id", org);
  const r = await giao(w, ADM, org, { personPartyId: a.partyId });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.message, "Không chuyển lại cho người vừa thôi quản lý trong cùng ngày.");
  assert.deepEqual(w.q("SELECT * FROM pty_party_relationship WHERE to_party_id = ? ORDER BY id", org), truoc);
});

test("Gỡ người quản lý: còn thành viên ⇒ 409; không còn ⇒ được (chỉ văn phòng); gỡ thành viên của văn phòng; người cũ nay không hợp lệ mà vẫn chọn giữ làm thành viên ⇒ 409", async () => {
  const { w } = setup();
  const org = toChuc(w);
  const a = doiTac(w, "Quản");
  const b = doiTac(w, "Viên");
  lienKet(w, a.partyId, org, "MANAGER_OF");
  lienKet(w, b.partyId, org, "MEMBER_OF");
  const go = (as: string) => w.call("POST", `/api/parties/${org}/to-chuc/go-nguoi-quan-ly`, { as, body: { lyDo: "NGUOI_QUAN_LY_NGHI_VIEC" } });
  const r = await go(ADM);
  assert.equal(r.status, 409, r.text);
  assert.equal((await go(SALES)).status, 403);
  const gv = await w.call("POST", `/api/parties/${org}/to-chuc/go-thanh-vien`, { as: ADM, body: { personPartyId: b.partyId, lyDo: "SAI_NGUOI" } });
  assert.equal(gv.status, 200, gv.text);
  assert.equal((await go(ADM)).status, 200);
  assert.deepEqual(mo(w, org), []);
  assert.deepEqual(nhatKy(w, org).map((x: { action: string }) => x.action), ["org_member_removed", "org_manager_removed"]);
  // Người quản lý cũ nay giữ quyền nội bộ (dữ liệu lệch): giữ làm thành viên sẽ làm R-TC-3 đỏ ⇒ 409; bỏ chọn thì chuyển được.
  const org2 = toChuc(w);
  const cu = doiTac(w, "Đổi Việc");
  lienKet(w, cu.partyId, org2, "MANAGER_OF");
  w.sqlite.prepare("UPDATE stf_permission SET valid_to_at = ? WHERE staff_id = ?").run(AT, cu.staffId);
  const moi = doiTac(w, "Kế Nhiệm");
  const r1 = await giao(w, ADM, org2, { personPartyId: moi.partyId });
  assert.equal(r1.status, 409, r1.text);
  assert.equal((await giao(w, ADM, org2, { personPartyId: moi.partyId, nguoiCuThanhThanhVien: false })).status, 200);
});

test("Đ2.8 đối chiếu R-TC-4: người quản lý có hiệu lực ⇔ R-TC-4 không liệt kê tổ chức — bốn ca không hiệu lực (tài khoản ngưng, mất PARTNER, hồ sơ gộp, tổ chức mất vai)", async () => {
  const { w } = setup();
  const lam: Record<string, (x: { staffId: string; partyId: string }, org: string) => void> = {
    ngung: (x) => w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(x.staffId),
    matDoiTac: (x) => w.sqlite.prepare("UPDATE stf_permission SET valid_to_at = ? WHERE staff_id = ? AND permission_type_code = 'PARTNER'").run(AT, x.staffId),
    gop: (x) => {
      const dich = uuid();
      w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Đích', 1, ?, ?)").run(dich, AT, AT);
      w.sqlite.prepare("UPDATE pty_party SET merged_into_id = ?, merged_at = ?, active = 0 WHERE id = ?").run(dich, AT, x.partyId);
    },
    matVai: (_x, org) => w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-11-02' WHERE party_id = ?").run(org),
  };
  for (const [ten, f] of [["coHieuLuc", null], ...Object.entries(lam)] as [string, ((x: { staffId: string; partyId: string }, org: string) => void) | null][]) {
    const org = toChuc(w);
    const a = doiTac(w, `Quản ${ten}`);
    lienKet(w, a.partyId, org, "MANAGER_OF");
    lienKet(w, doiTac(w, `Viên ${ten}`).partyId, org, "MEMBER_OF");
    f?.(a, org);
    const g = await w.call("GET", `/api/parties/${org}/to-chuc`, { as: ADM });
    // Tổ chức mất vai vẫn mở được màn tổ chức (hồ sơ tổ chức chưa gộp) — để văn phòng thấy và xử lý.
    assert.equal(g.status, 200, `${ten}: ${g.text}`);
    assert.equal(g.json.toChuc.nguoiQuanLy.partyId, a.partyId);
    const coHieuLuc = g.json.toChuc.nguoiQuanLy.coHieuLuc as boolean;
    assert.equal(coHieuLuc, f === null, `${ten}: coHieuLuc`);
    assert.equal(kiem(w, "R-TC-4").includes(org), !coHieuLuc, `${ten}: R-TC-4 phải liệt kê đúng khi và chỉ khi không có hiệu lực`);
  }
});

test("I-1 lính gác lô chuyển: văn phòng A GỠ người quản lý (tổ chức không còn thành viên) xen giữa lúc lệnh chuyển của văn phòng B đọc và lúc ghi ⇒ B 409 org_manager_changed, không mở dòng nào, không gửi thư", async () => {
  const { w, thu } = setup();
  const org = toChuc(w);
  const a = doiTac(w, "Bị Gỡ");
  const c = doiTac(w, "Định Giao");
  lienKet(w, a.partyId, org, "MANAGER_OF");
  let go: { status: number; text: string } | null = null;
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((x) => /INSERT INTO pty_party_relationship/.test(x.sql)), async () => {
    go = await w.call("POST", `/api/parties/${org}/to-chuc/go-nguoi-quan-ly`, { as: ADM, body: { lyDo: "NGUOI_QUAN_LY_NGHI_VIEC" } });
  });
  const r = await giao(w, QLBH, org, { personPartyId: c.partyId });
  await w.choNen();
  assert.equal(go!.status, 200, go!.text);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "org_manager_changed");
  assert.deepEqual(mo(w, org), [], "không mở người quản lý mới, người vừa bị gỡ không bị thêm lại làm thành viên");
  assert.equal(thu.length, 0, "không gửi thư cho người vừa bị gỡ");
  assert.equal(w.q("SELECT count(*) n FROM pty_party_relationship WHERE to_party_id = ? AND notice_state IS NOT NULL", org)[0].n, 0);
  assert.deepEqual(nhatKy(w, org).map((x: { action: string }) => x.action), ["org_manager_removed"]);
});

test("M-1: hai văn phòng mở cùng một màn cũ rồi bấm nối đuôi ⇒ lệnh đầu 200, lệnh sau 409 «Người quản lý của tổ chức vừa đổi, hãy tải lại.»; thiếu trường ⇒ 400; giao lần đầu với màn thấy người khác ⇒ 409", async () => {
  const { w } = setup();
  const org = toChuc(w);
  const a = doiTac(w, "Ban Đầu");
  lienKet(w, a.partyId, org, "MANAGER_OF");
  const r1 = await giao(w, ADM, org, { personPartyId: doiTac(w, "Một").partyId, nguoiQuanLyHienTai: a.partyId });
  assert.equal(r1.status, 200, r1.text);
  const r2 = await giao(w, SUP, org, { personPartyId: doiTac(w, "Hai").partyId, nguoiQuanLyHienTai: a.partyId });
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.message, "Người quản lý của tổ chức vừa đổi, hãy tải lại.");
  assert.equal(nhatKy(w, org).filter((x: { action: string }) => x.action === "org_manager_transferred").length, 1);
  const thieu = await w.call("POST", `/api/parties/${org}/to-chuc/nguoi-quan-ly`, { as: ADM, body: { lyDo: LY_DO, personPartyId: doiTac(w, "Ba").partyId } });
  assert.equal(thieu.status, 400, thieu.text);
  const org2 = toChuc(w);
  const r3 = await giao(w, ADM, org2, { personPartyId: doiTac(w, "Bốn").partyId, nguoiQuanLyHienTai: a.partyId });
  assert.equal(r3.status, 409, r3.text);
  assert.deepEqual(mo(w, org2), []);
});

test("Đ2.8 qua route của người quản lý: người quản lý không có hiệu lực (tài khoản ngưng, mất PARTNER, hồ sơ gộp, tổ chức mất vai) ⇒ yêu cầu chuyển và gỡ thành viên 403; R-TC-4 liệt kê tổ chức đó; có hiệu lực thì không", async () => {
  const { w } = setup();
  const lam: Record<string, (x: { staffId: string; partyId: string }, org: string) => void> = {
    ngung: (x) => w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(x.staffId),
    matDoiTac: (x) => w.sqlite.prepare("UPDATE stf_permission SET valid_to_at = ? WHERE staff_id = ? AND permission_type_code = 'PARTNER'").run(AT, x.staffId),
    gop: (x) => {
      const dich = uuid();
      w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Đích', 1, ?, ?)").run(dich, AT, AT);
      w.sqlite.prepare("UPDATE pty_party SET merged_into_id = ?, merged_at = ?, active = 0 WHERE id = ?").run(dich, AT, x.partyId);
    },
    matVai: (_x, org) => w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-11-02' WHERE party_id = ?").run(org),
  };
  for (const [ten, f] of [["coHieuLuc", null], ...Object.entries(lam)] as [string, ((x: { staffId: string; partyId: string }, org: string) => void) | null][]) {
    const org = toChuc(w);
    const a = doiTac(w, `Quản ${ten}`);
    const b = doiTac(w, `Viên ${ten}`);
    const c = doiTac(w, `Đề Xuất ${ten}`);
    lienKet(w, a.partyId, org, "MANAGER_OF");
    lienKet(w, b.partyId, org, "MEMBER_OF");
    lienKet(w, c.partyId, org, "MEMBER_OF"); // người được đề xuất chuyển quyền phải là thành viên đang có
    f?.(a, org);
    const yc = await w.call("POST", `/api/to-chuc/${org}/yeu-cau-chuyen`, { as: a.staffId, body: { personPartyId: c.partyId } });
    const gv = await w.call("POST", `/api/to-chuc/${org}/go-thanh-vien`, { as: a.staffId, body: { personPartyId: b.partyId } });
    const liet = kiem(w, "R-TC-4").includes(org);
    if (f === null) {
      assert.equal(yc.status, 201, yc.text);
      assert.equal(gv.status, 200, gv.text);
      assert.equal(liet, false);
    } else {
      // ngưng / mất PARTNER chặn cả ở cổng đăng nhập hay cổng route — cổng nào cũng là 401/403, không ghi gì.
      assert.ok([401, 403].includes(yc.status), `${ten}: ${yc.status} ${yc.text}`);
      assert.ok([401, 403].includes(gv.status), `${ten}: ${gv.status} ${gv.text}`);
      assert.equal(liet, true, `${ten}: R-TC-4 phải liệt kê`);
      assert.deepEqual(mo(w, org).map(([, k]) => k).sort(), ["MANAGER", "MEMBER", "MEMBER"]);
    }
  }
});

test("Người quản lý: một yêu cầu chuyển đang mở mỗi tổ chức (409 lần hai); không đề xuất chính mình; thành viên gửi yêu cầu, gỡ người khác ⇒ 403", async () => {
  const { w } = setup();
  const org = toChuc(w);
  const a = doiTac(w, "Quản");
  const b = doiTac(w, "Viên");
  const c = doiTac(w, "Viên Hai");
  lienKet(w, a.partyId, org, "MANAGER_OF");
  lienKet(w, b.partyId, org, "MEMBER_OF");
  lienKet(w, c.partyId, org, "MEMBER_OF");
  const yc = (as: string, p: string) => w.call("POST", `/api/to-chuc/${org}/yeu-cau-chuyen`, { as, body: { personPartyId: p } });
  assert.equal((await yc(a.staffId, a.partyId)).status, 400);
  assert.equal((await yc(b.staffId, c.partyId)).status, 403);
  assert.equal((await w.call("POST", `/api/to-chuc/${org}/go-thanh-vien`, { as: b.staffId, body: { personPartyId: c.partyId } })).status, 403);
  assert.equal((await yc(a.staffId, b.partyId)).status, 201);
  assert.equal((await yc(a.staffId, c.partyId)).status, 409);
  assert.equal(w.q("SELECT count(*) n FROM pty_org_transfer_request WHERE org_party_id = ? AND status = 'MO'", org)[0].n, 1);
  const g = await w.call("GET", `/api/parties/${org}/to-chuc`, { as: ADM });
  assert.equal(g.json.toChuc.yeuCauChuyen.length, 1);
  assert.equal(g.json.toChuc.yeuCauChuyen[0].nguoiDeXuat.partyId, b.partyId);
  assert.doesNotMatch(g.text, SO_DT);
});

test("Người quản lý: yêu cầu chuyển chỉ nhận THÀNH VIÊN đang có của chính tổ chức đó (người lạ, thành viên tổ chức khác, người đã rời ⇒ 409 not_org_member, không ghi gì)", async () => {
  const { w } = setup();
  const org = toChuc(w);
  const org2 = toChuc(w);
  const a = doiTac(w, "Quản");
  const b = doiTac(w, "Viên");
  const la = doiTac(w, "Người Lạ");
  const khac = doiTac(w, "Viên Tổ Chức Khác");
  const roi = doiTac(w, "Viên Đã Rời");
  lienKet(w, a.partyId, org, "MANAGER_OF");
  lienKet(w, b.partyId, org, "MEMBER_OF");
  lienKet(w, khac.partyId, org2, "MEMBER_OF");
  w.sqlite.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES ('rel-da-roi', ?, ?, 'MEMBER_OF', '2026-11-01', '2026-11-05', ?, ?)").run(roi.partyId, org, AT, AT);
  const yc = (p: string) => w.call("POST", `/api/to-chuc/${org}/yeu-cau-chuyen`, { as: a.staffId, body: { personPartyId: p } });
  for (const [ten, p] of [["người lạ", la.partyId], ["thành viên tổ chức khác", khac.partyId], ["người đã rời", roi.partyId]] as const) {
    const r = await yc(p);
    assert.equal(r.status, 409, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "not_org_member", ten);
  }
  assert.equal(w.q("SELECT count(*) n FROM pty_org_transfer_request WHERE org_party_id = ?", org)[0].n, 0, "không ghi yêu cầu nào");
  assert.equal((await yc(b.partyId)).status, 201);
});

test("PF14: thành viên tự rời ⇒ được (nhật ký org_member_left); người quản lý tự rời ⇒ 409 câu rõ; người không gắn ⇒ 404", async () => {
  const { w } = setup();
  const org = toChuc(w);
  const a = doiTac(w, "Quản");
  const b = doiTac(w, "Viên");
  const la = doiTac(w, "Người Lạ");
  lienKet(w, a.partyId, org, "MANAGER_OF");
  lienKet(w, b.partyId, org, "MEMBER_OF");
  const roi = (as: string) => w.call("POST", `/api/to-chuc/${org}/roi`, { as, body: {} });
  const ra = await roi(a.staffId);
  assert.equal(ra.status, 409, ra.text);
  assert.match(ra.json.error.message, /Người quản lý không tự rời tổ chức/);
  assert.equal((await roi(la.staffId)).status, 404);
  assert.equal((await roi(b.staffId)).status, 200);
  assert.deepEqual(mo(w, org), [[a.partyId, "MANAGER"]]);
  const nk = nhatKy(w, org);
  assert.deepEqual(nk.map((x: { action: string; staff_id: string }) => [x.action, x.staff_id]), [["org_member_left", b.staffId]]);
  assert.equal(nk[0].acting_party_id, org);
});

test("quyenToChuc từ chối: người lạ (Đối tác không liên kết), thành viên của tổ chức KHÁC, người quản lý của tổ chức KHÁC, tài khoản văn phòng không liên kết ⇒ yêu cầu chuyển, gỡ thành viên 403; tự rời 404; không ghi gì", async () => {
  const { w } = setup();
  const org = toChuc(w);
  const khac = toChuc(w, "Khách sạn Khác");
  const ql = doiTac(w, "Quản");
  const tv = doiTac(w, "Viên");
  lienKet(w, ql.partyId, org, "MANAGER_OF");
  lienKet(w, tv.partyId, org, "MEMBER_OF");
  const la = doiTac(w, "Người Lạ");
  const tvKhac = doiTac(w, "Viên Khác");
  lienKet(w, tvKhac.partyId, khac, "MEMBER_OF");
  const qlKhac = doiTac(w, "Quản Khác");
  lienKet(w, qlKhac.partyId, khac, "MANAGER_OF");
  const truoc = w.q("SELECT * FROM pty_party_relationship ORDER BY id");
  for (const [ten, as] of [["người lạ", la.staffId], ["thành viên tổ chức khác", tvKhac.staffId], ["người quản lý tổ chức khác", qlKhac.staffId], ["Quản trị", ADM], ["Toàn quyền", SUP], ["Quản lý bán hàng", QLBH]] as const) {
    const yc = await w.call("POST", `/api/to-chuc/${org}/yeu-cau-chuyen`, { as, body: { personPartyId: tv.partyId } });
    assert.equal(yc.status, 403, `${ten} yêu cầu chuyển: ${yc.text}`);
    const gv = await w.call("POST", `/api/to-chuc/${org}/go-thanh-vien`, { as, body: { personPartyId: tv.partyId } });
    assert.equal(gv.status, 403, `${ten} gỡ thành viên: ${gv.text}`);
    const roi = await w.call("POST", `/api/to-chuc/${org}/roi`, { as, body: {} });
    assert.equal(roi.status, 404, `${ten} tự rời: ${roi.text}`);
  }
  assert.deepEqual(w.q("SELECT * FROM pty_party_relationship ORDER BY id"), truoc);
  assert.equal(w.q("SELECT count(*) n FROM pty_org_transfer_request")[0].n, 0);
  assert.deepEqual(nhatKy(w, org), []);
});

test("Task 14: người quản lý đọc màn tổ chức của mình (GET /api/to-chuc/:id) và cấp độ đại lý của tổ chức; thành viên, văn phòng, người lạ ⇒ 403; không lộ số điện thoại", async () => {
  const { w } = setup();
  const org = toChuc(w);
  const khac = toChuc(w, "Công ty Khác");
  const ql = doiTac(w, "Quản");
  const tv = doiTac(w, "Viên");
  const la = doiTac(w, "Lạ");
  lienKet(w, ql.partyId, org, "MANAGER_OF");
  lienKet(w, tv.partyId, org, "MEMBER_OF");
  const g = await w.call("GET", `/api/to-chuc/${org}`, { as: ql.staffId });
  assert.equal(g.status, 200);
  assert.equal(g.json.toChuc.partyId, org);
  assert.equal(g.json.toChuc.nguoiQuanLy.partyId, ql.partyId);
  assert.deepEqual(g.json.toChuc.thanhVien.map((x: { partyId: string }) => x.partyId), [tv.partyId]);
  assert.doesNotMatch(g.text, SO_DT);
  for (const as of [tv.staffId, la.staffId, ADM, SUP]) assert.equal((await w.call("GET", `/api/to-chuc/${org}`, { as })).status, 403, `màn ${as}`);
  assert.equal((await w.call("GET", `/api/to-chuc/${khac}`, { as: ql.staffId })).status, 403);
  // Cấp độ đại lý: cùng cổng — người quản lý thấy (tổ chức mang loại được hưởng nhưng chưa gắn mức ⇒ cap null), người khác 403.
  const c = await w.call("GET", `/api/pricing/cap-cua-to-chuc/${org}`, { as: ql.staffId });
  assert.equal(c.status, 200);
  assert.equal(c.json.cap?.partyId ?? org, org);
  assert.equal((await w.call("GET", `/api/pricing/cap-cua-to-chuc/${khac}`, { as: ql.staffId })).status, 403);
  for (const as of [tv.staffId, la.staffId, ADM, SUP]) assert.equal((await w.call("GET", `/api/pricing/cap-cua-to-chuc/${org}`, { as })).status, 403, `cấp ${as}`);
});
