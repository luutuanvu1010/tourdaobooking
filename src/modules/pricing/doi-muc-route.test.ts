// Hoa hồng «Đổi mức một bước» (Task 4, PR máy chủ): route POST /api/pricing/hoa-hong/:id/doi trên SQLite thật (tests/audit/harness.mjs). Tệp riêng (không chung doi-muc.test.ts) vì
// tệp kia là bài luật thuần chạy nhanh, không dựng cả ứng dụng. Luật thuần: doi-muc.test.ts. Đặc tả A3 (docs/superpowers/specs/2026-10-25-hoa-hong-ho-tro-thiet-ke-lai/DAC-TA-MAY-CHU.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, vnToday } from "../../shared/vn-date.ts";
import { cauDoiMuc } from "./repository.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác
const KP = "99999999-9999-4999-8999-999999999990"; // lai Kế toán + Đối tác
const AT = "2026-10-01T00:00:00.000Z";
let seq = 0;
const HOM_NAY = () => vnToday(new Date());
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '${AT}', '${AT}')`);
  return w;
}
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => { const r = await p; assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`); return r; };
const dem = (w: W): number => Number(w.q("SELECT count(*) AS n FROM prc_commission_rule")[0].n);
const nhatKy = (w: W, action: string): { detail: string }[] => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action);
const dong = (w: W, id: string): any => w.q("SELECT * FROM prc_commission_rule WHERE id = ?", id)[0];
/** Dòng loại đối tác (route thêm mức) bắt đầu `tu`, tỷ lệ 1000 (10%). */
async function dongLoai(w: W, tu: string, them: Record<string, unknown> = {}): Promise<string> {
  const loai = (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: `Loại thử ${++seq}` } }), 201, "tạo loại")).json.loai.code as string;
  const r = await ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "VAI", code: loai }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: tu, ...them } }), 201, "tạo dòng loại");
  return r.json.dong.id as string;
}
const doi = (w: W, id: string, body: Record<string, unknown>, as = KT) => w.call("POST", `/api/pricing/hoa-hong/${id}/doi`, { as, body });

test("Đổi từ hôm nay: dòng cũ ngừng hôm qua, dòng mới từ hôm nay, cùng đích và phạm vi", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const id = await dongLoai(w, addDays(hn, -10));
  const k0 = nhatKy(w, "prc_commission_rule_closed").length, a0 = nhatKy(w, "prc_commission_rule_added").length;
  const r = await ok(doi(w, id, { kieu: "RATE", tyLeBp: 1200, tuNgay: hn }), 200, "đổi");
  assert.equal(r.json.cu.id, id);
  assert.equal(r.json.cu.denNgay, addDays(hn, -1));
  assert.equal(r.json.moi.tuNgay, hn);
  assert.equal(r.json.moi.tyLeBp, 1200);
  const cu = dong(w, id), moi = dong(w, r.json.moi.id);
  assert.equal(cu.valid_to_date, addDays(hn, -1));
  assert.equal(moi.valid_from_date, hn);
  assert.equal(moi.valid_to_date, null);
  for (const c of ["target_role_code", "target_party_id", "target_tier_code", "scope", "catalog_code", "group_code"]) assert.equal(moi[c], cu[c], c);
  assert.equal(nhatKy(w, "prc_commission_rule_closed").length, k0 + 1);
  assert.equal(nhatKy(w, "prc_commission_rule_added").length, a0 + 1);
  assert.equal(nhatKy(w, "prc_commission_rule_added").at(-1)!.detail, `đổi mức · dòng ${id} → ${moi.id} · từ ${hn}`);
});

test("Đổi từ ngày tương lai: dòng cũ ngừng trước ngày đó một hôm", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const id = await dongLoai(w, addDays(hn, -10));
  const r = await ok(doi(w, id, { kieu: "RATE", tyLeBp: 1500, tuNgay: addDays(hn, 5) }), 200, "đổi");
  assert.equal(dong(w, id).valid_to_date, addDays(hn, 4));
  assert.equal(dong(w, r.json.moi.id).valid_from_date, addDays(hn, 5));
});

test("Đổi dòng của chính sách (đích mức TA): dòng mới giữ target_tier_code", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const code = (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten: "Mức thử đổi" } }), 201, "tạo mức")).json.muc.code as string;
  const id = (await ok(w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as: KT, body: { phamVi: "ALL", kieu: "RATE", tyLeBp: 800, tuNgay: "2026-01-01" } }), 201, "dòng mức")).json.dong.id as string;
  const r = await ok(doi(w, id, { kieu: "RATE", tyLeBp: 900, tuNgay: hn }), 200, "đổi");
  assert.equal(dong(w, r.json.moi.id).target_tier_code, code);
  assert.equal(r.json.moi.doiTuong.loai, "MUC");
});

test("Đổi dòng theo loại khách (đ/khách): dòng phụ theo loại của dòng mới đúng số mới, dòng cũ giữ số cũ", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const id = await dongLoai(w, addDays(hn, -10), { kieu: "PER_PAX", tyLeBp: undefined, moiKhach: 50000, theoLoai: { treEm: 30000, nguoiCaoTuoi: 20000 } });
  const r = await ok(doi(w, id, { kieu: "PER_PAX", moiKhach: 60000, theoLoai: { treEm: 35000, nguoiCaoTuoi: 25000 }, tuNgay: hn }), 200, "đổi");
  assert.deepEqual(r.json.moi.theoLoai, { nguoiLon: 60000, treEm: 35000, nguoiCaoTuoi: 25000 });
  assert.deepEqual(r.json.cu.theoLoai, { nguoiLon: 50000, treEm: 30000, nguoiCaoTuoi: 20000 });
});

test("Đổi bị từ chối: dòng đã ngừng / sắp áp dụng / ngày sai / cùng ngày bắt đầu / mức giống hệt / thân có phạm vi — số dòng không đổi", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const daNgung = await dongLoai(w, addDays(hn, -10), { denNgay: addDays(hn, 20) });
  const sapToi = await dongLoai(w, addDays(hn, 30));
  const moiHomNay = await dongLoai(w, hn);
  const dangMo = await dongLoai(w, addDays(hn, -10), { tyLeBp: 700 });
  const truoc = dem(w);
  const ca: [string, string, Record<string, unknown>, string][] = [
    ["câu 1", daNgung, { kieu: "RATE", tyLeBp: 1200, tuNgay: hn }, "Dòng này đã có ngày ngừng nên không đổi được. Thêm mức mới bắt đầu sau ngày ngừng."],
    ["câu 2", sapToi, { kieu: "RATE", tyLeBp: 1200, tuNgay: addDays(hn, 31) }, "Mức này chưa tới ngày áp dụng nên không đổi được."],
    ["câu 3", dangMo, { kieu: "RATE", tyLeBp: 1200, tuNgay: addDays(hn, -1) }, "Ngày bắt đầu của mức mới không được trước hôm nay."],
    ["câu 4", moiHomNay, { kieu: "RATE", tyLeBp: 1200, tuNgay: hn }, ""],
    ["giống hệt", dangMo, { kieu: "RATE", tyLeBp: 700, tuNgay: hn }, "Mức mới giống hệt mức cũ."],
    ["thân có phạm vi", dangMo, { kieu: "RATE", tyLeBp: 1200, tuNgay: hn, phamVi: "ALL" }, "Đổi mức không đổi được đối tượng hay dịch vụ."],
  ];
  for (const [ten, id, than, cau] of ca) {
    const r = await doi(w, id, than);
    assert.equal(r.status, 400, `${ten}: ${r.text}`);
    if (cau) assert.equal(r.json.error.message, cau, ten); else assert.ok(r.json.error.message.startsWith("Mức cũ bắt đầu từ"), `${ten}: ${r.json.error.message}`);
    assert.equal(dem(w), truoc, `${ten}: số dòng không đổi`);
  }
  assert.equal(dong(w, dangMo).valid_to_date, null);
});

test("Hai người Đổi cùng dòng (tuần tự): lần hai thấy dòng đã ngừng ⇒ 400 câu 1; tổng đúng một dòng mới", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const id = await dongLoai(w, addDays(hn, -10));
  const truoc = dem(w);
  await ok(doi(w, id, { kieu: "RATE", tyLeBp: 1200, tuNgay: hn }), 200, "lần 1");
  const r2 = await doi(w, id, { kieu: "RATE", tyLeBp: 1300, tuNgay: hn });
  assert.equal(r2.status, 400, r2.text);
  assert.equal(r2.json.error.message, "Dòng này đã có ngày ngừng nên không đổi được. Thêm mức mới bắt đầu sau ngày ngừng.");
  assert.equal(dem(w), truoc + 1);
});

test("Hàng rào câu chèn có điều kiện: dòng cũ đã đóng bằng SQL tay ngay trước lô ⇒ lô bị huỷ, KHÔNG có dòng mới", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const id = await dongLoai(w, addDays(hn, -10));
  w.sqlite.prepare("UPDATE prc_commission_rule SET valid_to_date = ? WHERE id = ?").run(addDays(hn, -5), id);
  const truoc = dem(w);
  const moiId = crypto.randomUUID();
  const lo = cauDoiMuc(w.env.DB, id, moiId, addDays(hn, -1), { targetPartyId: null, targetRoleCode: dong(w, id).target_role_code, targetTierCode: null, scope: "ALL", catalogCode: null, groupCode: null }, { kind: "RATE", rateBp: 1200, perPaxAmount: null, theoLoai: null, validFrom: hn, validTo: null, note: null }, AT, KT);
  await assert.rejects(() => w.env.DB.batch(lo), /NOT NULL constraint failed: prc_commission_rule\.valid_from_date/, "câu chèn từ chối vì câu đóng không đóng được dòng nào");
  assert.equal(dem(w), truoc, "không có dòng mới");
  assert.equal(dong(w, moiId), undefined);
  assert.equal(dong(w, id).valid_to_date, addDays(hn, -5), "dòng cũ giữ ngày ngừng của đường kia");
});

test("Đổi: Bán hàng, Đối tác, tài khoản lai → 403; không tìm thấy → 404", async () => {
  const w = setup();
  const hn = HOM_NAY();
  const id = await dongLoai(w, addDays(hn, -10));
  const truoc = dem(w);
  for (const ai of [SALES, DT, KP]) assert.equal((await doi(w, id, { kieu: "RATE", tyLeBp: 1200, tuNgay: hn }, ai)).status, 403, ai);
  assert.equal(dem(w), truoc);
  assert.equal((await doi(w, crypto.randomUUID(), { kieu: "RATE", tyLeBp: 1200, tuNgay: hn })).status, 404);
});
