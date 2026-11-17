// Lời mời vào tổ chức theo số điện thoại (ADR-0213 Đ7.1–Đ7.4; mốc B2 đợt 2 đăng ký, Task 15) qua route thật (tests/audit/harness.mjs, SQLite thật dựng từ migrations/). Mọi giá trị là GIẢ.
// Tạo (cùng câu, cùng mã trạng thái dù số có tài khoản hay chưa; trần theo tổ chức nói thật, trần theo số trung tính, không mã), huỷ, người được mời xem / nhận (mã gõ hoa thường,
// khoảng trắng; dùng lần hai, quá hạn, khác số ⇒ từ chối; người mời mất quyền ⇒ 409; gõ sai tính trần), tác nhân dọn (hết hạn, ẩn danh 30 ngày). Không số điện thoại trong nhật ký, phản hồi.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
// @ts-expect-error tệp .mjs không có khai kiểu
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";

/** Bản băm viết LẠI độc lập theo đặc tả (HMAC-SHA256, khoá = HMAC(SESSION_SECRET, "td-ma-vao-to-chuc-v1"), hex) — không gọi hàm của mã đang thử. */
async function bamMaVao(secret: string, ma: string): Promise<string> {
  const enc = new TextEncoder();
  const hmac = async (k: Uint8Array, d: string) => new Uint8Array(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), enc.encode(d)));
  return Array.from(await hmac(await hmac(enc.encode(secret), "td-ma-vao-to-chuc-v1"), ma), (b) => b.toString(16).padStart(2, "0")).join("");
}

const QLBH = "11111111-1111-4111-8111-111111111110";
const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const AT = "2026-11-01T00:00:00.000Z";
const SO_DT = /(?<![\w-])0\d{9}(?!\d)/;
const MA_RE = /\b[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}\b/;
const CAU_RE = /^Đã tạo lời mời\. Mã: [A-Z0-9]{4}-[A-Z0-9]{4}, dùng được tới \d{2}\/\d{2}\/\d{4}\. Hãy gửi mã này cho người được mời\.$/;

let n = 0;
const uuid = (): string => `bbbbbbbb-0000-4000-8000-${String(++n).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

function setup() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [QLBH, "0900000010", "Quản Lý Bán", ["SALES", "SALES_MANAGER"]], [SALES, "0900000001", "Bán Hàng", ["SALES"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
function toChuc(w: W, ten = "Khách sạn Sunrise"): string {
  const id = uuid();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', NULL, '2026-01-01', ?, ?)").run(uuid(), id, AT, AT);
  return id;
}
let soDt = 300;
/** Tài khoản Đối tác (hồ sơ mang vai riêng — khung thử dựng như vậy); `so` = số đăng nhập. */
function doiTac(w: W, ten: string, o: { so?: string; perms?: string[] } = {}) {
  const staffId = uuid();
  const so = o.so ?? `09${String(++soDt).padStart(8, "0")}`;
  seedStaff(w.sqlite, { id: staffId, phone: so, name: ten, perms: o.perms ?? ["PARTNER"] });
  return { staffId, partyId: `pty-${staffId}`, so };
}
function lienKet(w: W, person: string, org: string, loai: "MANAGER_OF" | "MEMBER_OF", tu = "2026-11-01"): string {
  const id = uuid();
  w.sqlite.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, person, org, loai, tu, AT, AT);
  return id;
}
/** Tổ chức có người quản lý CÓ HIỆU LỰC (tài khoản Đối tác đang bật). */
function toChucCoQuanLy(w: W, ten?: string) {
  const org = toChuc(w, ten);
  const ql = doiTac(w, `Quản Lý ${++n}`);
  lienKet(w, ql.partyId, org, "MANAGER_OF");
  return { org, ql };
}
const tao = (w: W, as: string, org: string, soDienThoai: string) => w.call("POST", `/api/to-chuc/${org}/loi-moi`, { as, body: { soDienThoai } });
const nhan = (w: W, as: string, body: Record<string, unknown>) => w.call("POST", "/api/to-chuc/loi-moi/nhan", { as, body });
const loiMoi = (w: W, id: string) => ({ ...w.q("SELECT * FROM pty_org_invite WHERE id = ?", id)[0] });
const mo = (w: W, org: string): [string, string][] =>
  w.q("SELECT person_party_id AS p, kind FROM v_pty_org_link WHERE org_party_id = ? ORDER BY kind, person_party_id", org).map((r: { p: string; kind: string }) => [r.p, r.kind]);
const nhatKy = (w: W) => w.q("SELECT action, staff_id, target_type, target_id, detail, acting_party_id FROM audit_log WHERE action LIKE 'org_invite_%' ORDER BY created_at, rowid");

test("Đ7.1: số CÓ tài khoản và số CHƯA có tài khoản ⇒ cùng mã trạng thái, cùng dạng câu, cùng khoá phản hồi; máy chỉ lưu bản băm; nhật ký, phản hồi không số điện thoại, không mã", async () => {
  const w = setup();
  const { org, ql } = toChucCoQuanLy(w);
  const coTk = doiTac(w, "Đã Có Tài Khoản");
  const a = await tao(w, ql.staffId, org, coTk.so);
  const b = await tao(w, ql.staffId, org, "0987 654 321");
  assert.equal(a.status, 201, a.text);
  assert.equal(b.status, a.status);
  assert.deepEqual(Object.keys(a.json).sort(), Object.keys(b.json).sort());
  assert.deepEqual(Object.keys(a.json.loiMoi).sort(), Object.keys(b.json.loiMoi).sort());
  for (const r of [a, b]) {
    assert.match(r.json.message, CAU_RE);
    assert.ok(r.json.message.includes(r.json.loiMoi.ma));
    assert.doesNotMatch(r.text, SO_DT, "phản hồi không số điện thoại");
    assert.match(r.json.loiMoi.id, /^MV_[A-Z]{8}$/);
  }
  // Mã không bao giờ nằm trong CSDL — chỉ bản băm có khoá của mã đã chuẩn hoá.
  const dong = loiMoi(w, a.json.loiMoi.id);
  assert.equal(dong.status, "MO");
  assert.equal(dong.phone_key, coTk.so);
  assert.equal(dong.code_hash, await bamMaVao(w.env.SESSION_SECRET, a.json.loiMoi.ma.replace("-", "")));
  const tatCa = JSON.stringify(w.q("SELECT * FROM pty_org_invite"));
  for (const r of [a, b]) assert.equal(tatCa.includes(r.json.loiMoi.ma.replace("-", "")), false, "mã không lưu ở đâu");
  const nk = nhatKy(w);
  assert.deepEqual(nk.map((x: { action: string }) => x.action), ["org_invite_created", "org_invite_created"]);
  for (const x of nk) {
    assert.equal(x.target_id, org);
    assert.equal(x.acting_party_id, org);
    assert.doesNotMatch(x.detail, SO_DT);
    assert.doesNotMatch(x.detail, MA_RE);
  }
  // Hiến chương 5.20: bản băm mã (N4) và số điện thoại của lời mời (N2) không lộ ở bất kỳ dòng nhật ký nào.
  assert.deepEqual(doNhatKyHang(w.sqlite, ["pty_org_invite.code_hash", "pty_org_invite.phone_key"], ["pty_org_invite.phone_key"]), { lo: [], rong: [] });
});

test("Quyền: người quản lý có hiệu lực, Quản lý bán hàng ⇒ tạo được; thành viên, Bán hàng, người lạ ⇒ 403; tổ chức không có ⇒ 403; số sai khuôn ⇒ 400", async () => {
  const w = setup();
  const { org, ql } = toChucCoQuanLy(w);
  const tv = doiTac(w, "Thành Viên");
  lienKet(w, tv.partyId, org, "MEMBER_OF");
  const la = doiTac(w, "Người Lạ");
  assert.equal((await tao(w, ql.staffId, org, "0911111111")).status, 201);
  assert.equal((await tao(w, QLBH, org, "0911111112")).status, 201);
  for (const as of [tv.staffId, SALES, la.staffId]) assert.equal((await tao(w, as, org, "0911111113")).status, 403, as);
  assert.equal((await tao(w, ql.staffId, uuid(), "0911111113")).status, 403);
  assert.equal((await tao(w, ql.staffId, org, "12345")).status, 400);
  assert.equal(w.q("SELECT count(*) n FROM pty_org_invite")[0].n, 2);
});

test("Đ7.3: vượt trần theo SỐ (3/ngày trên toàn Nền tảng) ⇒ 429 câu trung tính, không mã, không lời mời mới; vượt trần TỔ CHỨC theo ngày / đang mở ⇒ 409 câu nói thật", async () => {
  const w = setup();
  const so = "0933333333";
  for (let i = 0; i < 3; i++) {
    const { org, ql } = toChucCoQuanLy(w, `Tổ chức ${i}`);
    assert.equal((await tao(w, ql.staffId, org, so)).status, 201);
  }
  const t4 = toChucCoQuanLy(w, "Tổ chức 4");
  const r = await tao(w, t4.ql.staffId, t4.org, "+84 933 333 333");
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.message, "Chưa tạo được lời mời cho số này lúc này, hãy thử lại sau");
  assert.doesNotMatch(r.text, MA_RE);
  assert.equal(r.json.loiMoi, undefined);
  assert.equal(w.q("SELECT count(*) n FROM pty_org_invite WHERE org_party_id = ?", t4.org)[0].n, 0);
  // Trần tổ chức theo ngày: 10 lời mời hôm nay ⇒ lần 11 bị 409 nói rõ.
  const { org, ql } = toChucCoQuanLy(w, "Tổ chức đông");
  for (let i = 0; i < 10; i++) assert.equal((await tao(w, ql.staffId, org, `09400000${String(i).padStart(2, "0")}`)).status, 201, `lần ${i + 1}`);
  const r11 = await tao(w, ql.staffId, org, "0940000099");
  assert.equal(r11.status, 409, r11.text);
  assert.equal(r11.json.error.code, "invite_org_daily_limit");
  assert.match(r11.json.error.message, /10 lời mời trong hôm nay/);
  // Trần đang mở: 20 lời mời MỞ còn hạn tạo từ hôm qua (gieo thẳng) ⇒ 409, dù hôm nay chưa tạo cái nào.
  const t2 = toChucCoQuanLy(w, "Tổ chức nhiều lời mời cũ");
  const homQua = new Date(Date.now() - 86_400_000).toISOString();
  const han = new Date(Date.now() + 3 * 86_400_000).toISOString();
  for (let i = 0; i < 20; i++) {
    w.sqlite.prepare("INSERT INTO pty_org_invite (id, org_party_id, phone_key, code_hash, status, expires_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, 'MO', ?, ?, ?, ?, ?)")
      .run(`MV_CUAAAA${String.fromCharCode(65 + i)}A`, t2.org, `09500000${String(i).padStart(2, "0")}`, `bam-cu-${i}`, han, homQua, t2.ql.staffId, homQua, t2.ql.staffId);
  }
  const rMo = await tao(w, t2.ql.staffId, t2.org, "0950000099");
  assert.equal(rMo.status, 409, rMo.text);
  assert.equal(rMo.json.error.code, "invite_org_open_limit");
});

test("Đ7.4: người có tài khoản nhận bằng mã gõ thường / có khoảng trắng ⇒ một lô: đã dùng → «Thành viên của» → nhật ký; dùng lần hai, khác số, quá hạn ⇒ 400 trung tính; không số điện thoại", async () => {
  const w = setup();
  const { org, ql } = toChucCoQuanLy(w);
  const nguoi = doiTac(w, "Người Được Mời");
  const khac = doiTac(w, "Người Khác");
  const r = await tao(w, ql.staffId, org, nguoi.so);
  const ma: string = r.json.loiMoi.ma;
  // Người khác (số đăng nhập khác) cầm đúng mã ⇒ từ chối, không ghi gì.
  const sai = await nhan(w, khac.staffId, { ma });
  assert.equal(sai.status, 400, sai.text);
  assert.equal(sai.json.error.message, "Mã vào tổ chức không đúng hoặc không còn dùng được.");
  assert.deepEqual(mo(w, org), [[ql.partyId, "MANAGER"]]);
  // Đúng người, gõ thường + khoảng trắng.
  const ok = await nhan(w, nguoi.staffId, { ma: ` ${ma.toLowerCase().replace("-", " ")} ` });
  assert.equal(ok.status, 200, ok.text);
  assert.deepEqual(ok.json, { toChuc: { partyId: org, ten: "Khách sạn Sunrise" } });
  assert.deepEqual(new Set(mo(w, org).map((x) => x.join(" "))), new Set([`${ql.partyId} MANAGER`, `${nguoi.partyId} MEMBER`]));
  const dong = loiMoi(w, r.json.loiMoi.id);
  assert.equal(dong.status, "DA_DUNG");
  assert.equal(dong.used_by_staff_id, nguoi.staffId);
  const nk = nhatKy(w).filter((x: { action: string }) => x.action === "org_invite_accepted");
  assert.equal(nk.length, 1);
  assert.equal(nk[0].acting_party_id, org);
  assert.doesNotMatch(nk[0].detail, SO_DT);
  // Dùng lần hai ⇒ từ chối.
  assert.equal((await nhan(w, nguoi.staffId, { ma })).status, 400);
  // Quá hạn ⇒ từ chối.
  const r2 = await tao(w, ql.staffId, org, khac.so);
  w.sqlite.exec("DROP TRIGGER pty_org_invite_fixed"); // thử: đẩy hạn về quá khứ (đường thật: chờ qua 7 ngày)
  w.sqlite.prepare("UPDATE pty_org_invite SET expires_at = ? WHERE id = ?").run(new Date(Date.now() - 1000).toISOString(), r2.json.loiMoi.id);
  const qh = await nhan(w, khac.staffId, { loiMoiId: r2.json.loiMoi.id });
  assert.equal(qh.status, 400, qh.text);
  assert.equal(loiMoi(w, r2.json.loiMoi.id).status, "MO");
});

test("Đ7.4: người xem lời mời của CHÍNH số đăng nhập (người khác không thấy); nhận bằng mã định danh; người mời mất quyền ⇒ 409, không ghi; tài khoản không phải Đối tác ⇒ 403 ở cổng", async () => {
  const w = setup();
  const { org, ql } = toChucCoQuanLy(w);
  const nguoi = doiTac(w, "Người Được Mời");
  const khac = doiTac(w, "Người Khác");
  const r = await tao(w, ql.staffId, org, nguoi.so);
  const cua = await w.call("GET", "/api/to-chuc/loi-moi-cua-toi", { as: nguoi.staffId });
  assert.equal(cua.status, 200);
  assert.deepEqual(cua.json.loiMoi.map((x: { id: string }) => x.id), [r.json.loiMoi.id]);
  assert.equal(cua.json.loiMoi[0].toChuc.ten, "Khách sạn Sunrise");
  assert.doesNotMatch(cua.text, SO_DT);
  assert.deepEqual((await w.call("GET", "/api/to-chuc/loi-moi-cua-toi", { as: khac.staffId })).json, { loiMoi: [] });
  assert.equal((await nhan(w, khac.staffId, { loiMoiId: r.json.loiMoi.id })).status, 400, "lời mời của số khác");
  assert.equal((await nhan(w, SALES, { loiMoiId: r.json.loiMoi.id })).status, 403, "Bán hàng (lập đơn được, không giữ quyền Đối tác) ⇒ 403 ở cổng (Đ2.6 — vòng sửa 1)");
  const taiXe = doiTac(w, "Tài Xế", { perms: ["DRIVER"] });
  assert.equal((await nhan(w, taiXe.staffId, { loiMoiId: r.json.loiMoi.id })).status, 403, "tài khoản không lập đơn được ⇒ 403 ở cổng");
  // Người mời mất quyền: tài khoản người quản lý bị ngưng (không còn người quản lý có hiệu lực).
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(ql.staffId);
  const mat = await nhan(w, nguoi.staffId, { loiMoiId: r.json.loiMoi.id });
  assert.equal(mat.status, 409, mat.text);
  assert.equal(mat.json.error.code, "org_inviter_no_right");
  assert.equal(loiMoi(w, r.json.loiMoi.id).status, "MO");
  assert.equal(mo(w, org).length, 1);
  // Lời mời do văn phòng tạo: văn phòng còn ô ⇒ nhận được.
  const r2 = await tao(w, QLBH, org, nguoi.so);
  const ok = await nhan(w, nguoi.staffId, { loiMoiId: r2.json.loiMoi.id });
  assert.equal(ok.status, 200, ok.text);
});

test("Huỷ: người quản lý huỷ lời mời còn mở ⇒ nhận sau đó bị từ chối; huỷ lần hai ⇒ 409; lời mời của tổ chức khác ⇒ 404; thành viên huỷ ⇒ 403", async () => {
  const w = setup();
  const { org, ql } = toChucCoQuanLy(w);
  const khac = toChucCoQuanLy(w, "Tổ chức khác");
  const nguoi = doiTac(w, "Người Được Mời");
  const tv = doiTac(w, "Thành Viên");
  lienKet(w, tv.partyId, org, "MEMBER_OF");
  const r = await tao(w, ql.staffId, org, nguoi.so);
  const id = r.json.loiMoi.id;
  assert.equal((await w.call("POST", `/api/to-chuc/${org}/loi-moi/${id}/huy`, { as: tv.staffId, body: {} })).status, 403);
  assert.equal((await w.call("POST", `/api/to-chuc/${khac.org}/loi-moi/${id}/huy`, { as: khac.ql.staffId, body: {} })).status, 404);
  const h = await w.call("POST", `/api/to-chuc/${org}/loi-moi/${id}/huy`, { as: ql.staffId, body: {} });
  assert.equal(h.status, 200, h.text);
  assert.equal(loiMoi(w, id).status, "DA_HUY");
  assert.equal((await w.call("POST", `/api/to-chuc/${org}/loi-moi/${id}/huy`, { as: ql.staffId, body: {} })).status, 409);
  assert.equal((await nhan(w, nguoi.staffId, { ma: r.json.loiMoi.ma })).status, 400);
  // Màn tổ chức chỉ còn lời mời dùng được, không số điện thoại.
  const r2 = await tao(w, ql.staffId, org, "0966666666");
  const man = await w.call("GET", `/api/to-chuc/${org}`, { as: ql.staffId });
  assert.deepEqual(man.json.toChuc.loiMoi.map((x: { id: string }) => x.id), [r2.json.loiMoi.id]);
  assert.doesNotMatch(man.text, SO_DT);
  assert.deepEqual(nhatKy(w).map((x: { action: string }) => x.action), ["org_invite_created", "org_invite_cancelled", "org_invite_created"]);
});

test("Review Focus 3: gõ sai (kể cả sai khuôn) tính trần 5 lần mỗi giờ mỗi tài khoản — lần thứ 6 bị 429 dù mã ĐÚNG; gõ đúng không tốn lượt", async () => {
  const w = setup();
  const { org, ql } = toChucCoQuanLy(w);
  const nguoi = doiTac(w, "Người Được Mời");
  const r = await tao(w, ql.staffId, org, nguoi.so);
  const ma: string = r.json.loiMoi.ma;
  for (const sai of ["ZZZZ-ZZZZ", "abc", "ZZZZ ZZZY", "1111-1111", "OOOO-OOOO"]) assert.equal((await nhan(w, nguoi.staffId, { ma: sai })).status, 400, sai);
  const khoa = await nhan(w, nguoi.staffId, { ma });
  assert.equal(khoa.status, 429, khoa.text);
  assert.equal(loiMoi(w, r.json.loiMoi.id).status, "MO");
  // Tài khoản khác chưa sai lần nào: gõ đúng ⇒ không để lại dòng đếm nào.
  const w2 = setup();
  const t = toChucCoQuanLy(w2);
  const ng = doiTac(w2, "Người Thứ Hai");
  const r2 = await tao(w2, t.ql.staffId, t.org, ng.so);
  assert.equal((await nhan(w2, ng.staffId, { ma: r2.json.loiMoi.ma })).status, 200);
  assert.equal(w2.q("SELECT count(*) n FROM login_attempt WHERE key = ?", `moi:staff:${ng.staffId}`)[0].n, 0);
});

// Task 15 vòng sửa 1 (I1, người kiểm độc lập): lính gác `lm_dung` có bài quan sát — lời mời bị huỷ / đã dùng NGAY TRƯỚC lô nhận ⇒ CẢ lô tự huỷ.
for (const [ten, trangThai] of [["bị huỷ", "DA_HUY"], ["đã dùng", "DA_DUNG"]] as const) {
  test(`Đ7.4: lời mời ${ten} NGAY TRƯỚC lô nhận ⇒ lính gác làm CẢ lô hỏng: 400 trung tính, không «Thành viên của», không nhật ký nhận, dòng lời mời không bị đẩy`, async () => {
    const w = setup();
    const { org, ql } = toChucCoQuanLy(w);
    const nguoi = doiTac(w, "Người Được Mời");
    const r = await tao(w, ql.staffId, org, nguoi.so);
    const id: string = r.json.loiMoi.id;
    const LUC = "2026-11-02T03:04:05.000Z";
    w.chenTruocLo((stmts: any[]) => stmts.some((s) => /pty_org_invite/.test(s.sql) && /DA_DUNG/.test(s.sql)), async () => {
      if (trangThai === "DA_HUY") w.sqlite.prepare("UPDATE pty_org_invite SET status = 'DA_HUY', cancelled_by = ?, cancelled_at = ?, updated_at = ? WHERE id = ?").run(ql.staffId, LUC, LUC, id);
      else w.sqlite.prepare("UPDATE pty_org_invite SET status = 'DA_DUNG', used_by_staff_id = 'tk-khac', used_at = ?, updated_at = ? WHERE id = ?").run(LUC, LUC, id);
    });
    const kq = await nhan(w, nguoi.staffId, { loiMoiId: id });
    assert.equal(kq.status, 400, kq.text);
    assert.equal(kq.json.error.message, "Mã vào tổ chức không đúng hoặc không còn dùng được.");
    assert.deepEqual(mo(w, org), [[ql.partyId, "MANAGER"]], "không mở «Thành viên của»");
    assert.equal(nhatKy(w).filter((x: { action: string }) => x.action === "org_invite_accepted").length, 0, "không nhật ký nhận");
    const dong = loiMoi(w, id);
    assert.equal(dong.status, trangThai);
    assert.equal(dong.updated_at, LUC, "dòng đã kết thúc không bị lô thua đẩy mốc");
    assert.notEqual(dong.used_by_staff_id, nguoi.staffId);
  });
}

// Task 15 vòng sửa 1 (mục 3): cổng hai route của người được mời nói đúng Đ2.6 — ô `order.create` VÀ giữ quyền Đối tác. Tài khoản văn phòng có số đăng nhập TRÙNG số được mời ⇒ 403 ở cổng.
test("Đ2.6: tài khoản văn phòng có số trùng số được mời ⇒ 403 ở cổng ở cả xem lời mời của tôi lẫn nhận; lời mời không đổi", async () => {
  const w = setup();
  const { org, ql } = toChucCoQuanLy(w);
  const r = await tao(w, ql.staffId, org, "0900000001"); // số đăng nhập của SALES
  const xem = await w.call("GET", "/api/to-chuc/loi-moi-cua-toi", { as: SALES });
  assert.equal(xem.status, 403, xem.text);
  const kq = await nhan(w, SALES, { loiMoiId: r.json.loiMoi.id });
  assert.equal(kq.status, 403, kq.text);
  assert.equal(loiMoi(w, r.json.loiMoi.id).status, "MO");
  assert.deepEqual(mo(w, org), [[ql.partyId, "MANAGER"]]);
});
