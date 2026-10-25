// Hoa hồng + Hỗ trợ, PR máy chủ Task 2 — «Thử tra» theo LOẠI đối tác: GET /api/pricing/thu-tra?loai=<mã> (đặc tả DAC-TA-MAY-CHU A2).
// Cùng MỘT `chonMuc` với tra theo đối tác, nhưng người hưởng dựng sẵn (không hồ sơ) ⇒ chỉ còn bậc 4–9. Khuôn: muc-ta.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác
const KP = "99999999-9999-4999-8999-999999999990"; // lai: Kế toán + Đối tác
const AT = "2026-10-01T00:00:00.000Z";
const ORG = "dda00000-0000-4000-8000-0000000000a1";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [ADM, "0900000006", "Quản Trị", ["ADMIN"]],
    [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(ORG, "Spa Hoa Sen", AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(ORG, AT, AT);
  return w;
}
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};
const themLoai = async (w: W, ten: string): Promise<string> => (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten } }), 201, `thêm loại ${ten}`)).json.loai.code as string;
const taoMuc = async (w: W, ten: string): Promise<string> => (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `tạo mức ${ten}`)).json.muc.code as string;
const dongTyLe = (w: W, code: string, tyLeBp: number) =>
  ok(w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as: KT, body: { phamVi: "SERVICE", catalogCode: "ZA1", kieu: "RATE", tuNgay: "2026-01-01", tyLeBp } }), 201, `dòng ${tyLeBp} cho ${code}`);
const ganOk = (w: W, loai: string, muc: string) => ok(w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai, muc, tuNgay: "2026-01-01" } }), 201, `gắn ${loai} → ${muc}`);
const mucVai = (w: W, code: string, tyLeBp: number) =>
  ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "VAI", code }, phamVi: "SERVICE", catalogCode: "ZA1", kieu: "RATE", tyLeBp, tuNgay: "2026-01-01" } }), 201, `dòng riêng loại ${code}`);
const ganHoSo = (w: W, partyId: string, code: string) => ok(w.call("POST", `/api/parties/${partyId}/roles`, { as: ADM, body: { roleTypeCode: code } }), 201, `gắn loại ${code}`);
const traLoai = (w: W, loai: string, as = SALES) => w.call("GET", `/api/pricing/thu-tra?loai=${loai}&dichVu=ZA1&ngay=${vnHomNay()}`, { as });

test("tra theo loại: dòng riêng của loại thắng chính sách (bậc 4)", async () => {
  const w = setup();
  const L = await themLoai(w, "Spa Đối Tác");
  await mucVai(w, L, 900);
  const m = await taoMuc(w, "Chính sách A");
  await dongTyLe(w, m, 1000);
  await ganOk(w, L, m);
  const r = await ok(traLoai(w, L), 200, "tra");
  assert.equal(r.json.ketQua.trangThai, "SET");
  assert.equal(r.json.ketQua.bac, 4);
  assert.equal(r.json.theoLoai.code, L);
  assert.equal(r.json.theoLoai.ten, "Spa Đối Tác");
  assert.deepEqual(r.json.nguoiHuong, { loai: "HUONG", vai: [L] });
});

test("tra theo loại: chỉ chính sách → bậc 7", async () => {
  const w = setup();
  const L = await themLoai(w, "Spa Đối Tác");
  const m = await taoMuc(w, "Chính sách A");
  await dongTyLe(w, m, 1000);
  await ganOk(w, L, m);
  const r = await ok(traLoai(w, L), 200, "tra");
  assert.equal(r.json.ketQua.trangThai, "SET");
  assert.equal(r.json.ketQua.bac, 7);
});

test("tra theo loại: đối tác có mức riêng không ảnh hưởng", async () => {
  const w = setup();
  const L = await themLoai(w, "Spa Đối Tác");
  await ganHoSo(w, ORG, L);
  const m = await taoMuc(w, "Chính sách A");
  await dongTyLe(w, m, 1000);
  await ganOk(w, L, m);
  await ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "DOI_TAC", partyId: ORG }, phamVi: "SERVICE", catalogCode: "ZA1", kieu: "RATE", tyLeBp: 1500, tuNgay: "2026-01-01" } }), 201, "dòng đối tác");
  const m2 = await taoMuc(w, "Chính sách riêng");
  await dongTyLe(w, m2, 1800);
  await ok(w.call("POST", `/api/pricing/ho-so/${ORG}/muc-rieng`, { as: KT, body: { muc: m2, tuNgay: "2026-01-01" } }), 201, "mức riêng");
  const r = await ok(traLoai(w, L), 200, "tra");
  assert.equal(r.json.ketQua.trangThai, "SET");
  assert.equal(r.json.ketQua.bac, 7);
  // đối chứng: tra theo hồ sơ thì dòng riêng của hồ sơ thắng (bậc 1–3)
  const dt = await ok(w.call("GET", `/api/pricing/thu-tra?doiTac=${ORG}&dichVu=ZA1&ngay=${vnHomNay()}`, { as: SALES }), 200, "tra hồ sơ");
  assert.ok([1, 2, 3].includes(dt.json.ketQua.bac), `bậc ${dt.json.ketQua.bac}`);
});

test("tra theo loại: loại đã tắt → 400", async () => {
  const w = setup();
  const L = await themLoai(w, "Spa Đối Tác");
  await ok(w.call("POST", `/api/pricing/loai-doi-tac/${L}/tat`, { as: KT }), 200, "tắt");
  const r = await traLoai(w, L);
  assert.equal(r.status, 400);
  assert.match(r.text, /không có trong danh sách được hưởng hoa hồng hoặc đã tắt/);
  assert.equal((await traLoai(w, "LD_KHONGCO1")).status, 400);
});

test("tra: gửi cả doiTac lẫn loai, hoặc không cái nào → 400", async () => {
  const w = setup();
  const L = await themLoai(w, "Spa Đối Tác");
  const cau = "Chọn một đối tác hoặc một loại đối tác, dịch vụ và ngày hợp lệ.";
  const ca = await w.call("GET", `/api/pricing/thu-tra?doiTac=${ORG}&loai=${L}&dichVu=ZA1`, { as: SALES });
  assert.equal(ca.status, 400);
  assert.ok(ca.text.includes(cau), ca.text);
  const khong = await w.call("GET", "/api/pricing/thu-tra?dichVu=ZA1", { as: SALES });
  assert.equal(khong.status, 400);
  assert.ok(khong.text.includes(cau), khong.text);
});

test("tra theo loại: Đối tác và lai → 403", async () => {
  const w = setup();
  const L = await themLoai(w, "Spa Đối Tác");
  assert.equal((await traLoai(w, L, DT)).status, 403);
  assert.equal((await traLoai(w, L, KP)).status, 403);
});
