// Góp ý YC-0020 (24/10) — khối chỉ-đọc «Hoa hồng hiện hành» trên hồ sơ đại lý: GET /api/pricing/ho-so/:id/hoa-hong.
// Chỉ ĐỌC: cho biết hồ sơ đang mang loại đối tác nào, loại đó gắn mức TA nào ở hôm nay, có dòng riêng đè lên mức không, có hai mức khác nhau (đơn sẽ bị giữ) không.
// Không đổi cách tính tiền (cách tính vẫn là `chonMuc`). Khuôn: muc-ta.test.ts. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SA = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác
const HR = "77777777-7777-4777-8777-777777777777";
const KP = "99999999-9999-4999-8999-999999999990"; // tài khoản lai Kế toán + Đối tác
const AT = "2026-10-01T00:00:00.000Z";
const ORG = "dda00000-0000-4000-8000-0000000000a1";
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [HR, "0900000009", "Hà Nhân Sự", ["HR"]], [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(ORG, "Lữ hành Sao Biển", AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(ORG, AT, AT);
  return w;
}
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};
const themLoai = async (w: W, ten: string): Promise<string> => (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten } }), 201, `loại ${ten}`)).json.loai.code as string;
const taoMuc = async (w: W, ten: string): Promise<string> => (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `mức ${ten}`)).json.muc.code as string;
const dongMuc = (w: W, code: string, tyLeBp: number) =>
  ok(w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as: KT, body: { phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", tyLeBp } }), 201, `dòng ${tyLeBp}`);
const ganMuc = (w: W, loai: string, muc: string) => ok(w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai, muc, tuNgay: "2026-01-01" } }), 201, `gắn ${loai}→${muc}`);
const ganHoSo = (w: W, code: string) => ok(w.call("POST", `/api/parties/${ORG}/roles`, { as: ADM, body: { roleTypeCode: code } }), 201, `gắn loại ${code} cho hồ sơ`);
const xem = (w: W, as: string, id = ORG) => w.call("GET", `/api/pricing/ho-so/${id}/hoa-hong`, { as });

test("YC-0020: hồ sơ mang loại có gắn mức ⇒ báo đúng loại, mức, nguồn «theo loại»", async () => {
  const w = setup();
  const loai = await themLoai(w, "Lữ hành thử");
  const muc = await taoMuc(w, "TA1");
  await dongMuc(w, muc, 1000);
  await ganMuc(w, loai, muc);
  await ganHoSo(w, loai);
  const r = await ok(xem(w, KT), 200, "Kế toán xem");
  assert.equal(r.json.laNguoiHuong, true);
  assert.equal(r.json.xungDot, false);
  assert.equal(r.json.vai.length, 1);
  assert.equal(r.json.vai[0].loai.code, loai);
  assert.equal(r.json.vai[0].loai.ten, "Lữ hành thử");
  assert.equal(r.json.vai[0].muc.code, muc);
  assert.equal(r.json.vai[0].muc.ten, "TA1");
  assert.equal(r.json.dongRiengLoai, 0);
  assert.equal(r.json.dongRiengDoiTac, 0);
});

test("YC-0020: loại được hưởng nhưng chưa gắn mức ⇒ muc = null (khối nhắc «chưa gắn mức»)", async () => {
  const w = setup();
  const loai = await themLoai(w, "Loại chưa mức");
  await ganHoSo(w, loai);
  const r = await ok(xem(w, ADM), 200);
  assert.equal(r.json.laNguoiHuong, true);
  assert.equal(r.json.vai[0].muc, null);
  assert.equal(r.json.xungDot, false);
});

test("YC-0020: hồ sơ không mang loại được hưởng ⇒ laNguoiHuong = false, vai rỗng", async () => {
  const w = setup();
  const r = await ok(xem(w, SA), 200);
  assert.equal(r.json.laNguoiHuong, false);
  assert.deepEqual(r.json.vai, []);
});

test("YC-0020: hai loại gắn hai mức KHÁC nhau ⇒ xungDot = true (đơn sẽ bị giữ RULE_CONFLICT)", async () => {
  const w = setup();
  const l1 = await themLoai(w, "Loại một");
  const l2 = await themLoai(w, "Loại hai");
  const m1 = await taoMuc(w, "TA1");
  const m2 = await taoMuc(w, "TA2");
  await dongMuc(w, m1, 1000);
  await dongMuc(w, m2, 800);
  await ganMuc(w, l1, m1);
  await ganMuc(w, l2, m2);
  await ganHoSo(w, l1);
  await ganHoSo(w, l2);
  const r = await ok(xem(w, KT), 200);
  assert.equal(r.json.vai.length, 2);
  assert.equal(r.json.xungDot, true);
});

test("YC-0020: hai loại gắn CÙNG một mức ⇒ không xung đột", async () => {
  const w = setup();
  const l1 = await themLoai(w, "Loại một");
  const l2 = await themLoai(w, "Loại hai");
  const m1 = await taoMuc(w, "TA1");
  await dongMuc(w, m1, 1000);
  await ganMuc(w, l1, m1);
  await ganMuc(w, l2, m1);
  await ganHoSo(w, l1);
  await ganHoSo(w, l2);
  assert.equal((await ok(xem(w, KT), 200)).json.xungDot, false);
});

test("YC-0020: dòng riêng của loại và dòng riêng của đối tác được ĐẾM (chúng thắng mức TA)", async () => {
  const w = setup();
  const loai = await themLoai(w, "Lữ hành riêng");
  const muc = await taoMuc(w, "TA1");
  await dongMuc(w, muc, 1000);
  await ganMuc(w, loai, muc);
  await ganHoSo(w, loai);
  // dòng riêng của loại (bậc 4–6) rồi dòng riêng của đối tác (bậc 1–3)
  await ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "VAI", code: loai }, phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", tyLeBp: 700 } }), 201, "dòng riêng loại");
  await ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "DOI_TAC", partyId: ORG }, phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", tyLeBp: 1200 } }), 201, "dòng riêng đối tác");
  const r = await ok(xem(w, KT), 200);
  assert.equal(r.json.dongRiengLoai, 1);
  assert.equal(r.json.dongRiengDoiTac, 1);
});

test("YC-0020: quyền — Bán hàng, Kế toán, Quản trị, Toàn quyền xem được; HDV, Nhân sự, Đối tác, tài khoản lai bị chặn", async () => {
  const w = setup();
  for (const as of [SALES, KT, ADM, SA]) await ok(xem(w, as), 200, `người ${as}`);
  for (const as of [HDV, HR, DT, KP]) await ok(xem(w, as), 403, `người ${as}`);
});

test("YC-0020: mã hồ sơ sai dạng ⇒ 400; chỉ đọc — không ghi nhật ký", async () => {
  const w = setup();
  await ok(w.call("GET", "/api/pricing/ho-so/@@@/hoa-hong", { as: KT }), 400);
  const truoc = Number(w.q("SELECT COUNT(*) AS n FROM audit_log")[0].n);
  await ok(xem(w, KT), 200);
  assert.equal(Number(w.q("SELECT COUNT(*) AS n FROM audit_log")[0].n), truoc);
});
