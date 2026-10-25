// Hoa hồng «Đổi chính sách» của một loại (Task 5, PR máy chủ): POST /api/pricing/muc-ta/gan/:id/doi và trường `ganRieng` của GET /api/pricing/muc-ta, trên SQLite thật
// (tests/audit/harness.mjs). Luật ngày: kiemDoi (doi-muc.test.ts). Đặc tả A3 (docs/superpowers/specs/2026-10-25-hoa-hong-ho-tro-thiet-ke-lai/DAC-TA-MAY-CHU.md). Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, ngayDayDu, vnToday } from "../../shared/vn-date.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác
const KP = "99999999-9999-4999-8999-999999999990"; // lai Kế toán + Đối tác
const AT = "2026-10-01T00:00:00.000Z";
const ORG = "dda00000-0000-4000-8000-0000000000a1";
const ORG2 = "dda00000-0000-4000-8000-0000000000a2";
const ORG3 = "dda00000-0000-4000-8000-0000000000a3";
let seq = 0;
const HOM_NAY = () => vnToday(new Date());
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]], [ADM, "0900000006", "Quản Trị", ["ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '${AT}', '${AT}')`);
  for (const [id, ten] of [[ORG, "Spa Hoa Sen"], [ORG2, "Spa Lá Trà"], [ORG3, "Spa Đã Ngừng"]] as const) {
    w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
    w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, AT, AT);
  }
  return w;
}
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => { const r = await p; assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`); return r; };
const nhatKy = (w: W, action: string): { detail: string }[] => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action);
const demGan = (w: W): number => Number(w.q("SELECT count(*) AS n FROM prc_role_tier")[0].n);
const demNhatKy = (w: W): number => Number(w.q("SELECT count(*) AS n FROM audit_log")[0].n);
const ganRow = (w: W, id: string): any => w.q("SELECT * FROM prc_role_tier WHERE id = ?", id)[0];
async function loaiMoi(w: W): Promise<string> {
  return (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: `Loại thử ${++seq}` } }), 201, "tạo loại")).json.loai.code as string;
}
async function mucMoi(w: W, ten: string, tyLeBp: number): Promise<string> {
  const code = (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `tạo mức ${ten}`)).json.muc.code as string;
  await ok(w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as: KT, body: { phamVi: "ALL", kieu: "RATE", tyLeBp, tuNgay: "2026-01-01" } }), 201, `dòng ${ten}`);
  return code;
}
async function ganLoai(w: W, loai: string, muc: string, tuNgay: string): Promise<string> {
  return (await ok(w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai, muc, tuNgay } }), 201, "gắn loại")).json.gan.id as string;
}
const doi = (w: W, id: string, body: Record<string, unknown>, as = KT) => w.call("POST", `/api/pricing/muc-ta/gan/${id}/doi`, { as, body });
/** Loại L gắn TA1 từ `tu`; TA2 (12%) chưa gắn. */
async function nen(w: W, tu: string) {
  const loai = await loaiMoi(w);
  const ta1 = await mucMoi(w, `TA1-${seq}`, 1000);
  const ta2 = await mucMoi(w, `TA2-${seq}`, 1200);
  const gan = await ganLoai(w, loai, ta1, tu);
  return { loai, ta1, ta2, gan };
}

test("Đổi chính sách từ hôm nay: gắn cũ ngừng hôm qua, gắn mới L→TA2 từ hôm nay, thử tra ra dòng của TA2", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const { loai, ta1, ta2, gan } = await nen(w, addDays(hn, -10));
  const k0 = nhatKy(w, "prc_role_tier_closed").length, s0 = nhatKy(w, "prc_role_tier_set").length;
  const r = await ok(doi(w, gan, { muc: ta2, tuNgay: hn }), 200, "đổi");
  assert.equal(r.json.gan.muc.code, ta2);
  assert.equal(r.json.gan.loai.code, loai);
  assert.equal(r.json.gan.tuNgay, hn);
  assert.equal(r.json.gan.denNgay, null);
  assert.deepEqual(r.json.dongRieng, []);
  const cu = ganRow(w, gan), moi = ganRow(w, r.json.gan.id);
  assert.equal(cu.valid_to_date, addDays(hn, -1));
  assert.equal(cu.tier_code, ta1);
  assert.equal(moi.role_type_code, loai);
  assert.equal(moi.tier_code, ta2);
  assert.equal(moi.valid_from_date, hn);
  assert.equal(moi.valid_to_date, null);
  assert.equal(nhatKy(w, "prc_role_tier_closed").length, k0 + 1);
  assert.equal(nhatKy(w, "prc_role_tier_set").length, s0 + 1);
  const tra = await ok(w.call("GET", `/api/pricing/thu-tra?loai=${loai}&dichVu=ZA1&ngay=${hn}`, { as: SALES }), 200, "thử tra");
  assert.match(tra.text, /1200/, tra.text);
  assert.doesNotMatch(tra.text, /"tyLeBp":1000/, tra.text);
});

test("Đổi chính sách: cùng mức → 400; mức đã tắt → 409 đúng câu; mức không có → 404; thân sai → 400", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const { ta1, ta2, gan } = await nen(w, addDays(hn, -10));
  const truoc = demGan(w);
  const r1 = await doi(w, gan, { muc: ta1, tuNgay: hn });
  assert.equal(r1.status, 400, r1.text);
  assert.equal(r1.json.error.message, "Mức mới giống hệt mức đang gắn.");
  await ok(w.call("POST", `/api/pricing/muc-ta/${ta2}/tat`, { as: KT, body: {} }), 200, "tắt TA2");
  const a1 = demNhatKy(w);
  const r2 = await doi(w, gan, { muc: ta2, tuNgay: hn });
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.message, "Mức TA này đã tắt — bật lại trước khi gắn loại hay thêm dòng.");
  assert.equal(ganRow(w, gan).valid_to_date, null, "gắn cũ còn nguyên (lô bị huỷ)");
  const r3 = await doi(w, gan, { muc: "MT_KHONGCO1", tuNgay: hn });
  assert.equal(r3.status, 404, r3.text);
  assert.equal((await doi(w, gan, { tuNgay: hn })).status, 400);
  assert.equal(demGan(w), truoc);
  assert.equal(demNhatKy(w), a1);
});

test("Đổi chính sách: bốn câu của kiemDoi, nguyên văn, không ghi gì", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const loai = await loaiMoi(w);
  const ta1 = await mucMoi(w, "Mức A", 1000);
  const ta2 = await mucMoi(w, "Mức B", 1200);
  const daNgung = await ganLoai(w, loai, ta1, addDays(hn, -10));
  await ok(w.call("POST", `/api/pricing/muc-ta/gan/${daNgung}/ket-thuc`, { as: KT, body: { denNgay: addDays(hn, 20) } }), 200, "ngừng");
  const loai2 = await loaiMoi(w);
  const sapToi = await ganLoai(w, loai2, ta1, addDays(hn, 30));
  const loai3 = await loaiMoi(w);
  const moiHomNay = await ganLoai(w, loai3, ta1, hn);
  const loai4 = await loaiMoi(w);
  const dangMo = await ganLoai(w, loai4, ta1, addDays(hn, -10));
  const truoc = demGan(w), a0 = demNhatKy(w);
  const ca: [string, string, Record<string, unknown>, string][] = [
    ["câu 1", daNgung, { muc: ta2, tuNgay: hn }, "Dòng này đã có ngày ngừng nên không đổi được. Thêm mức mới bắt đầu sau ngày ngừng."],
    ["câu 2", sapToi, { muc: ta2, tuNgay: addDays(hn, 31) }, "Mức này chưa tới ngày áp dụng nên không đổi được."],
    ["câu 3", dangMo, { muc: ta2, tuNgay: addDays(hn, -1) }, "Ngày bắt đầu của mức mới không được trước hôm nay."],
    ["câu 4", moiHomNay, { muc: ta2, tuNgay: hn }, `Mức cũ bắt đầu từ ${ngayDayDu(hn)} nên không đổi được từ ngày ${ngayDayDu(hn)}. Dùng Ngừng cho mức cũ, rồi Thêm mức mới.`],
  ];
  for (const [ten, id, than, cau] of ca) {
    const r = await doi(w, id, than);
    assert.equal(r.status, 400, `${ten}: ${r.text}`);
    assert.equal(r.json.error.message, cau, ten);
  }
  assert.equal(demGan(w), truoc);
  assert.equal(demNhatKy(w), a0);
});

test("Hai lần cùng Đổi (tuần tự): lần hai 400 câu 1, một gắn mới", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const { ta2, gan } = await nen(w, addDays(hn, -10));
  const truoc = demGan(w);
  await ok(doi(w, gan, { muc: ta2, tuNgay: hn }), 200, "lần 1");
  const r2 = await doi(w, gan, { muc: ta2, tuNgay: hn });
  assert.equal(r2.status, 400, r2.text);
  assert.equal(r2.json.error.message, "Dòng này đã có ngày ngừng nên không đổi được. Thêm mức mới bắt đầu sau ngày ngừng.");
  assert.equal(demGan(w), truoc + 1);
});

test("Đua thật qua route: gắn cũ bị đóng NGAY TRƯỚC lô ghi ⇒ 409 stale đúng câu, không gắn mới, không nhật ký", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const { ta2, gan } = await nen(w, addDays(hn, -10));
  const n0 = demGan(w), a0 = demNhatKy(w);
  let chen = false;
  w.chenTruocLo((s: { sql: string }[]) => s.some((x) => /INSERT INTO prc_role_tier/.test(x.sql) && /CASE WHEN changes\(\) > 0 THEN \?4/.test(x.sql)), () => {
    chen = true;
    w.sqlite.prepare("UPDATE prc_role_tier SET valid_to_date = ? WHERE id = ?").run(addDays(hn, 3), gan);
  });
  const r = await doi(w, gan, { muc: ta2, tuNgay: hn });
  assert.ok(chen, "khung thử đã chen lệnh đóng trước lô");
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal(r.json.error.message, "Gắn này vừa được người khác kết thúc hoặc đổi. Tải lại trang.");
  assert.equal(demGan(w), n0, "không gắn mới");
  assert.equal(demNhatKy(w), a0, "không nhật ký");
});

test("Đổi chính sách trả dongRieng khi loại còn mức riêng", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const { loai, ta2, gan } = await nen(w, addDays(hn, -10));
  await ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "VAI", code: loai }, phamVi: "ALL", kieu: "RATE", tyLeBp: 900, tuNgay: "2026-01-01" } }), 201, "mức riêng loại");
  const r = await ok(doi(w, gan, { muc: ta2, tuNgay: hn }), 200, "đổi");
  assert.equal(r.json.dongRieng.length, 1);
  assert.equal(r.json.dongRieng[0].tyLeBp, 900);
});

test("Đổi chính sách: Bán hàng, Đối tác, tài khoản lai → 403; gắn không có → 404", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const { ta2, gan } = await nen(w, addDays(hn, -10));
  const truoc = demGan(w);
  for (const ai of [SALES, DT, KP]) assert.equal((await doi(w, gan, { muc: ta2, tuNgay: hn }, ai)).status, 403, ai);
  assert.equal(demGan(w), truoc);
  assert.equal((await doi(w, crypto.randomUUID(), { muc: ta2, tuNgay: hn })).status, 404);
});

test("GET muc-ta có ganRieng đang và sắp hiệu lực, không SĐT/email", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const loaiHuong = await loaiMoi(w);
  for (const o of [ORG, ORG2, ORG3]) await ok(w.call("POST", `/api/parties/${o}/roles`, { as: ADM, body: { roleTypeCode: loaiHuong } }), 201, "gắn loại cho hồ sơ");
  const ta1 = await mucMoi(w, "Mức RA", 1000), ta2 = await mucMoi(w, "Mức RB", 1200);
  const rieng = (org: string, muc: string, tu: string) => ok(w.call("POST", `/api/pricing/ho-so/${org}/muc-rieng`, { as: KT, body: { muc, tuNgay: tu } }), 201, "gắn riêng");
  await rieng(ORG, ta1, hn);
  await rieng(ORG2, ta2, addDays(hn, 3));
  await rieng(ORG3, ta1, addDays(hn, -10));
  const id3 = (w.q("SELECT id FROM prc_party_tier WHERE party_id = ?", ORG3)[0] as any).id as string;
  await ok(w.call("POST", `/api/pricing/muc-rieng/${id3}/ket-thuc`, { as: KT, body: { denNgay: addDays(hn, -1) } }), 200, "ngừng hôm qua");
  const r = await ok(w.call("GET", "/api/pricing/muc-ta", { as: KT }), 200, "đọc");
  const g = r.json.ganRieng as any[];
  assert.equal(g.length, 2, r.text);
  assert.deepEqual(g.map((x) => [x.partyId, x.ten, x.muc, x.tenMuc, x.tuNgay, x.denNgay]), [
    [ORG, "Spa Hoa Sen", ta1, "Mức RA", hn, null],
    [ORG2, "Spa Lá Trà", ta2, "Mức RB", addDays(hn, 3), null],
  ]);
  for (const x of g) assert.deepEqual(Object.keys(x).sort(), ["denNgay", "id", "muc", "partyId", "ten", "tenMuc", "tuNgay"]);
});
