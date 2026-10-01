// Route gộp hồ sơ trên CẢ ứng dụng (khung thử tests/audit/harness.mjs, SQLite thật) — ADR-0068, đặc tả G1–G3, G7, G9–G13, G16 + Review Focus 2, 4
// + hợp đồng lỗi của lô (phán quyết điều phối: không bao giờ 500 — merge_lost_race / merge_order_invalid / merge_stale).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const ADM2 = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const DRIVER = "12121212-1212-4121-8121-121212121212";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const AT = "2026-09-01T00:00:00.000Z";
const SO_X = "0912000111";
const TEN = "Nguyễn Tiền Phương";
const HOM_NAY = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

function nen() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "Bán Hàng", ["SALES"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]], [ADM2, "0900000006", "Quản Trị Hai", ["ADMIN"]],
    [SUP, "0900000007", "Chủ", ["SUPER_ADMIN"]], [FIELD, "0900000004", "Hướng Dẫn", ["FIELD"]], [ACC, "0900000005", "Kế Toán", ["ACCOUNTING"]],
    [PARTNER, "0900000008", "Đối Tác", ["PARTNER"]], [INTERN, "0900000009", "Thực Tập", ["INTERN"]], [DRIVER, "0900000010", "Tài Xế", ["DRIVER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Hồ sơ phụ A: khách có SĐT chính X + công việc "Lái cano" ở bến LOC. */
async function taoA(w: any, ten = TEN, so = SO_X): Promise<string> {
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: ten, contacts: [{ kind: "PHONE", value: so }] } });
  assert.equal(r.status, 201, r.text);
  const id = r.json.party.id as string;
  assert.equal((await w.call("POST", `/api/parties/${id}/roles`, { as: ADM, body: { roleTypeCode: "BOAT_CAPTAIN", locationId: LOC } })).status, 201);
  return id;
}
/** Hồ sơ chính B: tài khoản "Nhân viên kinh doanh" không SĐT liên hệ. Trả { staffId, partyId }. */
async function taoB(w: any, ten = TEN, phone = "0900000055"): Promise<{ staffId: string; partyId: string }> {
  const r = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: ten, phone, roles: ["SALES_STAFF"], taoHoSoMoi: true } });
  assert.equal(r.status, 201, r.text);
  return { staffId: r.json.staff.id, partyId: r.json.staff.partyId };
}
const gop = (w: any, as: string, a: string, b: string, xacNhan: string = TEN) => w.call("POST", `/api/parties/${a}/merge`, { as, body: { intoPartyId: b, xacNhan } });
const xemTruoc = (w: any, as: string, a: string, b: string) => w.call("POST", `/api/parties/${a}/merge/preview`, { as, body: { intoPartyId: b } });
function donCua(w: any, id: string, booker: string, trangThai: "draft" | "confirmed" | "delivered" | "cancelled") {
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at, booker_party_id)
    VALUES (?, ?, ?, 'draft', 'Khách', '0900000099', 100000, 100000, 100000, ?, ?, ?)`).run(id, `TD-${id.slice(-4)}`, SALES, AT, AT, booker);
  w.sqlite.prepare("INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, '2026-12-10')").run(`sv-${id}`, id);
  if (trangThai === "cancelled") w.sqlite.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);
  if (trangThai !== "draft" && trangThai !== "cancelled") w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?").run(AT, id);
  if (trangThai === "delivered") w.sqlite.prepare("UPDATE orders SET delivered_at = ?, delivered_by = ? WHERE id = ?").run(AT, SUP, id);
}
/** Chạy `f` và thu các dòng console.error (không in ra). */
async function thuLog<T>(f: () => Promise<T>): Promise<{ kq: T; log: string[] }> {
  const log: string[] = [];
  const goc = console.error;
  console.error = (...a: unknown[]) => void log.push(a.map(String).join(" "));
  try {
    return { kq: await f(), log };
  } finally {
    console.error = goc;
  }
}
/** Chặn lô GỘP (câu lật có `merged_into_id = (SELECT`) để giả lập việc xảy ra giữa lúc tính kế hoạch và lúc ghi. Lô khác đi thẳng. */
function chanLoGop(w: any, lam: (goc: (s: unknown[]) => Promise<unknown>, stmts: any[]) => Promise<unknown>) {
  const goc = w.env.DB.batch.bind(w.env.DB);
  w.env.DB.batch = (stmts: any[]) => (stmts.some((s) => String(s.sql).includes("merged_into_id = (SELECT")) ? lam(goc, stmts) : goc(stmts));
}

test("G1 + G10: xem trước không ghi gì; gộp chuyển SĐT (chính) + Lái cano ở bến từ hôm nay; A ngưng, trỏ B; dòng của A đóng hôm nay; quyền tài khoản B không đổi", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const quyenTruoc = w.q("SELECT permission_type_code c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c", B.staffId);
  const soDongTruoc = w.q("SELECT (SELECT count(*) FROM pty_contact_point) a, (SELECT count(*) FROM pty_party_role) b, (SELECT count(*) FROM audit_log) c")[0];
  const p = await xemTruoc(w, ADM, A, B.partyId);
  assert.equal(p.status, 200, p.text);
  assert.deepEqual(p.json.chan, []);
  assert.deepEqual(p.json.chuyen.map((x: any) => [x.loai, x.ghiChu]), [["LIEN_HE", "liên hệ chính"], ["CONG_VIEC", null]]);
  assert.match(p.json.chuyen[0].nhan, new RegExp(SO_X));
  assert.deepEqual([p.json.donDoi, p.json.donGiu, p.json.dongNoGiu], [0, 0, 0]);
  assert.deepEqual(w.q("SELECT (SELECT count(*) FROM pty_contact_point) a, (SELECT count(*) FROM pty_party_role) b, (SELECT count(*) FROM audit_log) c")[0], soDongTruoc, "xem trước không ghi");

  const r = await gop(w, ADM, A, B.partyId);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.party.id, B.partyId);
  assert.deepEqual(w.q("SELECT value_normalized v, is_primary p, valid_from_date f FROM pty_contact_point WHERE party_id = ? AND valid_to_date IS NULL", B.partyId).map((x: any) => ({ ...x })),
    [{ v: SO_X, p: 1, f: HOM_NAY }]);
  assert.deepEqual(w.q("SELECT role_type_code c, location_id l, valid_from_date f FROM pty_party_role WHERE party_id = ? AND role_type_code = 'BOAT_CAPTAIN' AND valid_to_date IS NULL", B.partyId)
    .map((x: any) => ({ ...x })), [{ c: "BOAT_CAPTAIN", l: LOC, f: HOM_NAY }]);
  assert.deepEqual({ ...w.q("SELECT active, merged_into_id m FROM pty_party WHERE id = ?", A)[0] }, { active: 0, m: B.partyId });
  assert.deepEqual(w.q("SELECT valid_to_date t FROM pty_contact_point WHERE party_id = ? UNION ALL SELECT valid_to_date FROM pty_party_role WHERE party_id = ?", A, A).map((x: any) => x.t),
    [HOM_NAY, HOM_NAY]);
  assert.deepEqual(w.q("SELECT permission_type_code c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c", B.staffId), quyenTruoc);
});

test("G2 + G3 + Đ7: tra SĐT chỉ ra B; danh sách (kể cả gồm hồ sơ ngưng) không có A; A trả mergedInto, chỉ đọc; B trả mergedFrom", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  assert.equal((await gop(w, ADM, A, B.partyId)).status, 200);
  const tra = await w.call("GET", `/api/parties/lookup?phone=${SO_X}`, { as: SALES });
  assert.deepEqual(tra.json.matches.map((m: any) => m.id), [B.partyId]);
  const ds = await w.call("GET", `/api/parties?q=${encodeURIComponent("Tiền Phương")}&includeInactive=1`, { as: SALES });
  assert.ok(!ds.json.parties.some((x: any) => x.id === A));
  const ctA = (await w.call("GET", `/api/parties/${A}`, { as: ADM })).json.party;
  assert.deepEqual([ctA.mergedInto.id, ctA.mergedInto.displayName, ctA.editable], [B.partyId, TEN, false]);
  assert.deepEqual(ctA.mergedFrom, []);
  const ctB = (await w.call("GET", `/api/parties/${B.partyId}`, { as: ADM })).json.party;
  assert.deepEqual(ctB.mergedFrom.map((x: any) => x.id), [A]);
  assert.equal(ctB.mergedInto, null);
});

test("G7 + Review Focus 2: đơn nháp / đã xác nhận chưa giao đổi người đặt sang B và updated_at tăng; đã giao / đã huỷ giữ A", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const ids = ["00000000-0000-4000-8000-00000000d001", "00000000-0000-4000-8000-00000000d002", "00000000-0000-4000-8000-00000000d003", "00000000-0000-4000-8000-00000000d004"];
  donCua(w, ids[0]!, A, "draft"); donCua(w, ids[1]!, A, "confirmed"); donCua(w, ids[2]!, A, "delivered"); donCua(w, ids[3]!, A, "cancelled");
  const cu = w.q("SELECT updated_at u FROM orders WHERE id = ?", ids[0])[0].u as string;
  const p = await xemTruoc(w, ADM, A, B.partyId);
  assert.deepEqual([p.json.donDoi, p.json.donGiu], [2, 2]);
  assert.equal((await gop(w, ADM, A, B.partyId)).status, 200);
  assert.deepEqual(ids.map((id) => w.q("SELECT booker_party_id b FROM orders WHERE id = ?", id)[0].b), [B.partyId, B.partyId, A, A]);
  assert.ok((w.q("SELECT updated_at u FROM orders WHERE id = ?", ids[0])[0].u as string) > cu);
  assert.equal(w.sqlite.prepare("UPDATE orders SET customer_name = 'Ghi đè' WHERE id = ? AND updated_at = ?").run(ids[0], cu).changes, 0, "lần lưu mang mốc cũ bị chặn");
});

test("G9: đúng HAI dòng party_merged (A và B), chỉ tên + số dòng — không SĐT, không email (A có liên hệ email)", async () => {
  const w = nen();
  const A = await taoA(w);
  // F21: có email thật ở A để câu "không email" có nghĩa — email chuyển sang B trong lô.
  assert.equal((await w.call("POST", `/api/parties/${A}/contacts`, { as: ADM, body: { kind: "EMAIL", value: "phuong.danhdau@example.com" } })).status, 201);
  const B = await taoB(w);
  const r = await gop(w, ADM, A, B.partyId);
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'EMAIL' AND valid_to_date IS NULL", B.partyId)[0].n, 1, "email đã sang B");
  const rows = w.q("SELECT target_id t, detail d FROM audit_log WHERE action = 'party_merged' ORDER BY target_id");
  assert.deepEqual(rows.map((x: any) => x.t).sort(), [A, B.partyId].sort());
  for (const x of rows) {
    assert.match(x.d, new RegExp(TEN));
    assert.match(x.d, /liên hệ 2/);
    assert.doesNotMatch(x.d, /\d{6,}|@|danhdau/);
  }
});

test("G11 qua route: hồ sơ phụ có tài khoản; hai bên có tài khoản; cùng hồ sơ; tổ chức; A đang phụ trách đơn → 409 kèm mã, không đổi gì", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const B2 = await taoB(w, "Người Thứ Hai", "0900000056");
  const org = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "ORGANIZATION", displayName: "Đại Lý Thử" } })).json.party.id;
  const ca: [string, string, string][] = [
    [B.partyId, A, "merge_source_has_account"], [B.partyId, B2.partyId, "merge_both_accounts"], [A, A, "merge_same"], [org, B.partyId, "merge_not_person"],
  ];
  for (const [a, b, code] of ca) {
    const r = await gop(w, ADM, a, b, "bất kỳ");
    assert.equal(r.status, 409, `${code}: ${r.text}`);
    assert.equal(r.json.error.code, code);
  }
  const don = "00000000-0000-4000-8000-00000000d101";
  donCua(w, don, A, "draft");
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES ('h1', ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)`)
    .run(don, A, AT, AT, AT);
  const r = await gop(w, ADM, A, B.partyId);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "merge_source_busy");
  assert.equal(w.q("SELECT active FROM pty_party WHERE id = ?", A)[0].active, 1);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'party_merged'")[0].n, 0);
});

test("G12: Bán hàng / Kế toán / HDV / Đối tác / Thực tập / Tài xế → 403 ở cả hai route; Quản trị gộp vào hồ sơ của Quản trị khác → 403; Toàn quyền → được", async () => {
  const w = nen();
  const A = await taoA(w);
  for (const as of [SALES, ACC, FIELD, PARTNER, INTERN, DRIVER]) {
    assert.equal((await xemTruoc(w, as, A, `pty-${ADM2}`)).status, 403, `xem trước ${as}`);
    assert.equal((await gop(w, as, A, `pty-${ADM2}`)).status, 403, `gộp ${as}`);
  }
  const r = await gop(w, ADM, A, `pty-${ADM2}`);
  assert.equal(r.status, 403, r.text);
  assert.equal((await xemTruoc(w, ADM, A, `pty-${ADM2}`)).status, 403);
  assert.equal(w.q("SELECT active FROM pty_party WHERE id = ?", A)[0].active, 1);
  // Tên hồ sơ của ADM2 là "Quản Trị Hai" — xác nhận gõ lại tên hồ sơ PHỤ (A).
  assert.equal((await gop(w, SUP, A, `pty-${ADM2}`)).status, 200);
});

test("Kế hoạch R4 (bên thứ ba): A có quan hệ với hồ sơ C gắn tài khoản Quản trị KHÁC → Quản trị gộp A → 403 ở cả xem trước lẫn gộp, không dòng nào đổi; Toàn quyền → được", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const C = `pty-${ADM2}`;
  // Chèn thẳng: route quan hệ tự chặn Quản trị nối tới hồ sơ của Quản trị khác — ở đây cần dòng có sẵn (như do Toàn quyền tạo).
  w.sqlite.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-ben3', ?, ?, 'CONTACT_OF', '2026-09-01', ?, ?)")
    .run(A, C, AT, AT);
  const anh = () => JSON.stringify([
    w.q("SELECT * FROM pty_party WHERE id IN (?, ?, ?) ORDER BY id", A, B.partyId, C),
    w.q("SELECT * FROM pty_party_relationship ORDER BY id"),
    w.q("SELECT * FROM pty_contact_point ORDER BY id"),
    w.q("SELECT * FROM pty_party_role ORDER BY id"),
    w.q("SELECT count(*) n FROM audit_log WHERE action = 'party_merged'"),
  ]);
  const truoc = anh();
  const xt = await xemTruoc(w, ADM, A, B.partyId);
  assert.equal(xt.status, 403, xt.text);
  const r = await gop(w, ADM, A, B.partyId);
  assert.equal(r.status, 403, r.text);
  assert.equal(anh(), truoc, "không dòng nào đổi");
  // Đối chứng: Toàn quyền quản được Quản trị → gộp được, quan hệ chuyển sang B.
  assert.equal((await gop(w, SUP, A, B.partyId)).status, 200);
  assert.equal(w.q("SELECT count(*) n FROM pty_party_relationship WHERE from_party_id = ? AND to_party_id = ? AND valid_to_date IS NULL", B.partyId, C)[0].n, 1);
});

test("G13 qua route: hai yêu cầu gộp cùng A cùng lúc → đúng một 200, một 409 merge_lost_race; B chỉ có MỘT dòng SĐT X", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const [r1, r2] = await Promise.all([gop(w, ADM, A, B.partyId), gop(w, ADM, A, B.partyId)]);
  assert.deepEqual([r1.status, r2.status].sort(), [200, 409]);
  const thua = r1.status === 409 ? r1 : r2;
  assert.equal(thua.json.error.code, "merge_lost_race", thua.text);
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND value_normalized = ? AND valid_to_date IS NULL", B.partyId, SO_X)[0].n, 1);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'party_merged'")[0].n, 2);
  // Bấm lại sau khi đã gộp (A đã trỏ B) cũng là "thua cuộc đua", không phải lỗi khác.
  const lai = await gop(w, ADM, A, B.partyId);
  assert.deepEqual([lai.status, lai.json.error.code], [409, "merge_lost_race"]);
});

test("Hợp đồng lỗi lô: dữ liệu đổi trong khe → 409 merge_stale; lỗi money_invariant → 409 merge_order_invalid; bên kia thắng rồi lô ném → 409 merge_lost_race; không 500, không đổi gì", async () => {
  // (a) B vừa có SĐT chính khác trong khe → chỉ mục liên hệ chính duy nhất huỷ cả lô.
  {
    const w = nen();
    const A = await taoA(w);
    const B = await taoB(w);
    chanLoGop(w, async (goc, stmts) => {
      w.sqlite.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
        VALUES ('ptc-khe', ?, 'PHONE', '0913000888', '0913000888', NULL, 1, '2026-09-01', ?, ?)`).run(B.partyId, AT, AT);
      return goc(stmts);
    });
    const { kq: r, log } = await thuLog(() => gop(w, ADM, A, B.partyId));
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "merge_stale");
    assert.equal(r.json.error.message, "Dữ liệu vừa thay đổi, hãy xem trước lại.");
    // Vòng sửa 1 (điểm 2): lỗi lạ có MỘT dòng log chỉ tên ràng buộc — không giá trị.
    assert.equal(log.length, 1, log.join("\n"));
    assert.equal(JSON.parse(log[0]!).event, "merge_batch_failed");
    assert.match(JSON.parse(log[0]!).constraint, /^UNIQUE constraint failed: pty_contact_point\./);
    assert.doesNotMatch(log[0]!, /\d{6,}|@/);
    assert.equal(w.q("SELECT active FROM pty_party WHERE id = ?", A)[0].active, 1);
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'party_merged'")[0].n, 0);
  }
  // (b) đơn nháp của A lệch ở CỘT CỌC CŨ (kế hoạch không đọc được — NT-R9) → trigger tiền 0007 huỷ lô → 409 merge_order_invalid NÊU MÃ ĐƠN (ADR-0068 Đ1 bước 5).
  {
    const w = nen();
    const A = await taoA(w);
    const B = await taoB(w);
    const don = "00000000-0000-4000-8000-00000000d201";
    donCua(w, don, A, "draft");
    const trg = w.q("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'orders_money_update'")[0].sql as string;
    w.sqlite.exec("DROP TRIGGER orders_money_update");
    w.sqlite.prepare("UPDATE orders SET remaining_amount = 5 WHERE id = ?").run(don); // dữ liệu cũ lệch (remaining ≠ total − cọc)
    w.sqlite.exec(trg);
    assert.deepEqual((await xemTruoc(w, ADM, A, B.partyId)).json.chan, [], "kế hoạch không thấy lệch ở cột cũ");
    const { kq: r, log } = await thuLog(() => gop(w, ADM, A, B.partyId));
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "merge_order_invalid");
    assert.match(r.json.error.message, /TD-d201/);
    assert.doesNotMatch(r.json.error.message, /money_invariant|SQLITE/);
    assert.deepEqual(log, []);
    assert.equal(w.q("SELECT active FROM pty_party WHERE id = ?", A)[0].active, 1);
    assert.equal(w.q("SELECT booker_party_id b FROM orders WHERE id = ?", don)[0].b, A);
  }
  // (b2) câu lỗi lạ chứa giá trị (SĐT, email) → log chỉ có tên ràng buộc, không chữ số dài, không '@'.
  {
    const w = nen();
    const A = await taoA(w);
    const B = await taoB(w);
    chanLoGop(w, async () => {
      throw new Error("D1_ERROR: party_role_overlap: 0912000111 phuong@example.com SQLITE_CONSTRAINT");
    });
    const { kq: r, log } = await thuLog(() => gop(w, ADM, A, B.partyId));
    assert.equal(r.json.error.code, "merge_stale", r.text);
    assert.equal(log.length, 1);
    assert.equal(JSON.parse(log[0]!).constraint, "party_role_overlap");
    assert.doesNotMatch(log[0]!, /\d{6,}|@/);
  }
  // (c) bên kia thắng (lô thật chạy xong), rồi lô của mình ném → đọc lại A đã gộp → merge_lost_race.
  {
    const w = nen();
    const A = await taoA(w);
    const B = await taoB(w);
    chanLoGop(w, async (goc, stmts) => {
      await goc(stmts);
      throw new Error("NOT NULL constraint failed: pty_person_document.party_id");
    });
    const r = await gop(w, ADM, A, B.partyId);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "merge_lost_race");
  }
  // (d) bên kia thắng ngay trước lô của mình (cùng câu lệnh chạy hai lần) → lính gác làm lô thứ hai 0 dòng, câu lật changes = 0 → merge_lost_race, không ghi thêm.
  {
    const w = nen();
    const A = await taoA(w);
    const B = await taoB(w);
    chanLoGop(w, async (goc, stmts) => {
      await goc(stmts);
      return goc(stmts);
    });
    const r = await gop(w, ADM, A, B.partyId);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "merge_lost_race");
    assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND valid_to_date IS NULL", B.partyId)[0].n, 1);
    assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'party_merged'")[0].n, 2);
  }
});

test("Vòng sửa 1 (điểm 3): A đã gộp vào C từ trước, yêu cầu gộp A → B → 409 merge_inactive (không phải merge_lost_race)", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const C = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Người Chính Khác", contacts: [] } })).json.party.id as string;
  assert.equal((await gop(w, ADM, A, C)).status, 200);
  const r = await gop(w, ADM, A, B.partyId);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "merge_inactive");
  assert.equal(w.q("SELECT merged_into_id m FROM pty_party WHERE id = ?", A)[0].m, C);
});

test("Hợp đồng lỗi lô (phán quyết Task 6 Minor 2, nhánh catch): lô ném sau khi A vừa bị gộp vào hồ sơ KHÁC (C) → 409 merge_inactive, không phải merge_lost_race", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const C = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Người Chính Khác", contacts: [] } })).json.party.id as string;
  chanLoGop(w, async () => {
    // Người khác vừa gộp A vào C trong khe (trigger không xét dòng mở — chỉ cần đích hợp lệ), rồi lô của mình bị huỷ.
    w.sqlite.prepare("UPDATE pty_party SET active = 0, merged_into_id = ?, merged_at = ?, updated_at = ? WHERE id = ?").run(C, AT, AT, A);
    throw new Error("party_merge_target: gộp phải từ hồ sơ cá nhân sang hồ sơ cá nhân đang dùng");
  });
  const { kq: r } = await thuLog(() => gop(w, ADM, A, B.partyId));
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "merge_inactive", r.text);
  assert.equal(w.q("SELECT merged_into_id m FROM pty_party WHERE id = ?", A)[0].m, C);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'party_merged'")[0].n, 0);
});

test("Review Focus 4 + xác nhận: gõ lại tên dạng NFD, chữ hoa, thừa khoảng trắng → được; gõ sai tên → 409 merge_confirm_mismatch, không đổi gì", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const sai = await gop(w, ADM, A, B.partyId, "Nguyễn Tiền");
  assert.equal(sai.status, 409);
  assert.equal(sai.json.error.code, "merge_confirm_mismatch");
  assert.equal(w.q("SELECT active FROM pty_party WHERE id = ?", A)[0].active, 1);
  assert.equal((await gop(w, ADM, A, B.partyId, `  ${TEN.normalize("NFD").toUpperCase()}  `)).status, 200);
});

test("G5 qua route: B đã có SĐT chính Y → X sang B không chính, Y giữ chính", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  w.sqlite.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, updated_at)
    VALUES ('ptc-y', ?, 'PHONE', '0913000999', '0913000999', NULL, 1, '2026-09-01', ?, ?)`).run(B.partyId, AT, AT);
  assert.equal((await gop(w, ADM, A, B.partyId)).status, 200);
  assert.deepEqual(w.q("SELECT value_normalized v, is_primary p FROM pty_contact_point WHERE party_id = ? AND valid_to_date IS NULL ORDER BY v", B.partyId).map((x: any) => ({ ...x })),
    [{ v: SO_X, p: 0 }, { v: "0913000999", p: 1 }]);
});

test("G16: sau gộp, mọi route ghi của parties trên hồ sơ phụ → 409 party_merged (kể cả giấy tờ gia hạn / sửa sai, kết thúc quan hệ, bật lại 'đang dùng'); quan hệ trỏ TỚI hồ sơ đã gộp cũng 409; tạo tài khoản trên A → 409 party_merged", async () => {
  const w = nen();
  const A = await taoA(w);
  const B = await taoB(w);
  const C = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "ORGANIZATION", displayName: "Công Ty Khách" } })).json.party.id;
  // Trước khi gộp: A có giấy tờ + quan hệ tới C (để có dòng thật cho route gia hạn / sửa sai / kết thúc quan hệ — F13).
  assert.equal((await w.call("POST", `/api/parties/${A}/documents`, { as: SUP, body: { typeCode: "HEALTH_CHECK", number: "SK1", expiryDate: "2030-01-01" } })).status, 201);
  assert.equal((await w.call("POST", `/api/parties/${A}/relationships`, { as: ADM, body: { fromPartyId: A, toPartyId: C, relationshipTypeCode: "CONTACT_OF" } })).status, 201);
  assert.equal((await gop(w, ADM, A, B.partyId)).status, 200);
  const cu = w.q("SELECT updated_at u FROM pty_party WHERE id = ?", A)[0].u;
  const cid = w.q("SELECT id FROM pty_contact_point WHERE party_id = ? LIMIT 1", A)[0].id;
  const rid = w.q("SELECT id FROM pty_party_role WHERE party_id = ? LIMIT 1", A)[0].id;
  const qid = w.q("SELECT id FROM pty_party_relationship WHERE from_party_id = ? LIMIT 1", A)[0].id;
  const did = w.q("SELECT id FROM pty_person_document WHERE party_id = ? LIMIT 1", A)[0].id;
  const ca: [string, string, unknown][] = [
    ["PUT", `/api/parties/${A}`, { fullName: "Đổi Tên", active: false, expectedUpdatedAt: cu }],
    // Task 1: bật lại "đang dùng" phải bị route chặn TRƯỚC trigger party_merge_no_reopen (không lỗi CSDL thô).
    ["PUT", `/api/parties/${A}`, { fullName: TEN, active: true, expectedUpdatedAt: cu }],
    ["POST", `/api/parties/${A}/contacts`, { kind: "PHONE", value: "0914000444" }],
    ["POST", `/api/parties/${A}/contacts/${cid}/end`, {}],
    ["POST", `/api/parties/${A}/roles`, { roleTypeCode: "GUIDE" }],
    ["POST", `/api/parties/${A}/roles/${rid}/end`, {}],
    ["POST", `/api/parties/${A}/relationships`, { fromPartyId: A, toPartyId: C, relationshipTypeCode: "CONTACT_OF" }],
    ["POST", `/api/parties/${C}/relationships`, { fromPartyId: A, toPartyId: C, relationshipTypeCode: "CONTACT_OF" }],
    ["POST", `/api/parties/${A}/relationships/${qid}/end`, {}],
    ["POST", `/api/parties/${A}/documents`, { typeCode: "HEALTH_CHECK", number: "SK2", expiryDate: "2030-01-01" }],
    ["POST", `/api/parties/${A}/documents/${did}/renew`, { expiryDate: "2031-01-01" }],
    ["POST", `/api/parties/${A}/documents/${did}/correct`, { huy: true, lyDo: "nhập nhầm" }],
  ];
  for (const [m, path, body] of ca) {
    const r = await w.call(m, path, { as: SUP, body });
    assert.equal(r.status, 409, `${m} ${path}: ${r.text}`);
    assert.equal(r.json.error.code, "party_merged", `${m} ${path}`);
  }
  const tk = await w.call("POST", "/api/staff", { as: SUP, body: { partyId: A, phone: "0900000077", roles: ["SALES_STAFF"] } });
  assert.equal(tk.status, 409, tk.text);
  assert.equal(tk.json.error.code, "party_merged", tk.text);
  assert.deepEqual({ ...w.q("SELECT active, merged_into_id m FROM pty_party WHERE id = ?", A)[0] }, { active: 0, m: B.partyId });
});
