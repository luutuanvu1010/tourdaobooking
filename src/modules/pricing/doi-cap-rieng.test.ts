// ADR-0151 «Đổi cấp riêng» của một đối tác: POST /api/pricing/muc-rieng/:id/doi trên SQLite thật (tests/audit/harness.mjs), khuôn doi-chinh-sach.test.ts. Tiêu chí 1 của ADR-0151:
// đổi từ hôm nay, các câu từ chối, bước xét trước X1/X2 ở route và bài ghim hai phía X1/X2 ⇔ kiemDoi (quyết định 12). Ngày dựng theo hôm nay thật. Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, ngayDayDu, vnToday } from "../../shared/vn-date.ts";
import { kiemDoi } from "./rules.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const AT = "2026-10-01T00:00:00.000Z";
const ORG = "dda00000-0000-4000-8000-0000000000c1";
const LY_DO = "Bấm nhầm Đổi cấp, đưa về cấp cũ";
let seq = 0;
const H = () => vnToday(new Date());
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

/** ADR-0151 Đ3 — hai câu xét trước, nguyên văn. */
const CAU_X1 = "Cấp riêng này đã có ngày ngừng nên không đổi được. Muốn đổi cấp thì dùng Sửa.";
const cauX2 = (tu: string) => `Cấp riêng cũ bắt đầu từ ${ngayDayDu(tu)} nên cấp mới phải bắt đầu sau ngày đó. Chọn ngày bắt đầu muộn hơn, hoặc dùng Sửa.`;
/** Hai câu của kiemDoi (rules.ts) mà bước xét trước phải bắt trước. */
const KD_DA_NGUNG = "Dòng này đã có ngày ngừng nên không đổi được. Thêm mức mới bắt đầu sau ngày ngừng.";
const KD_BAT_DAU = /^Mức cũ bắt đầu từ \d\d\/\d\d\/\d{4} nên không đổi được từ ngày .* Dùng Ngừng cho mức cũ, rồi Thêm mức mới\.$/;
const CAU_DA_HUY = "Dòng này đã huỷ — sửa dòng thay cho nó.";
const CAU_CHUA_TOI = "Mức này chưa tới ngày áp dụng nên không đổi được.";
const CAU_TRUOC_HOM_NAY = "Ngày bắt đầu của mức mới không được trước hôm nay.";
const CAU_MUC_TAT = "Cấp đại lý này đang khoá — mở lại cấp trước khi áp dụng cho loại, đặt cấp riêng hay thêm mức.";
const cauDaChup = (x: string, som: string) => `Đã có đơn dùng mức này tới ngày ${ngayDayDu(x)} — mức mới chỉ áp được từ ngày ${ngayDayDu(som)}.`;

function setup(tuyChon: Record<string, unknown> = {}): W {
  const w = world(tuyChon);
  for (const [id, phone, name, perms] of [[SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [ADM, "0900000006", "Quản Trị", ["ADMIN"]]] as const) {
    seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  }
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '${AT}', '${AT}')`);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Spa Hoa Sen', 1, ?, ?)").run(ORG, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(ORG, AT, AT);
  return w;
}
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => { const r = await p; assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`); return r; };
const dem = (w: W): [number, number] => [Number(w.q("SELECT count(*) AS n FROM prc_party_tier")[0].n), Number(w.q("SELECT count(*) AS n FROM audit_log")[0].n)];
const dongRieng = (w: W, id: string): any => w.q("SELECT * FROM prc_party_tier WHERE id = ?", id)[0];
const nhatKy = (w: W, action: string): string[] => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action).map((x: { detail: string }) => x.detail);
async function taoMuc(w: W, ten: string, tyLeBp: number): Promise<string> {
  const code = (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `tạo cấp ${ten}`)).json.muc.code as string;
  await ok(w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as: KT, body: { phamVi: "ALL", kieu: "RATE", tyLeBp, tuNgay: "2026-01-01" } }), 201, `dòng của ${ten}`);
  return code;
}
/** Hồ sơ ORG mang một loại được hưởng; hai cấp TA1 (10%), TA2 (12%); cấp riêng ORG → TA1 từ `tu` (đến `den` nếu có). */
async function nen(w: W, tu: string, den?: string) {
  const loai = (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: `Loại thử ${++seq}` } }), 201, "tạo loại")).json.loai.code as string;
  await ok(w.call("POST", `/api/parties/${ORG}/roles`, { as: ADM, body: { roleTypeCode: loai } }), 201, "gắn loại cho hồ sơ");
  const ta1 = await taoMuc(w, `TA1-${seq}`, 1000);
  const ta2 = await taoMuc(w, `TA2-${seq}`, 1200);
  await ok(w.call("POST", `/api/pricing/ho-so/${ORG}/muc-rieng`, { as: KT, body: { muc: ta1, tuNgay: tu, ...(den === undefined ? {} : { denNgay: den }) } }), 201, "đặt cấp riêng");
  const rieng = String(w.q("SELECT id FROM prc_party_tier WHERE party_id = ? AND voided_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1", ORG)[0].id);
  return { loai, ta1, ta2, rieng };
}
const doi = (w: W, id: string, body: Record<string, unknown>, as = KT) => w.call("POST", `/api/pricing/muc-rieng/${id}/doi`, { as, body });
const thuTra = async (w: W, ngay: string) => (await ok(w.call("GET", `/api/pricing/thu-tra?doiTac=${ORG}&dichVu=ZA1&ngay=${ngay}`, { as: KT }), 200, "thử tra")).json.ketQua;

test("đổi từ hôm nay: cũ ngừng hôm qua, mới mở từ hôm nay; Thử tra ra bậc 10–12 của cấp mới; 200 HoaHongHoSoResponse", async () => {
  const w = setup();
  const hn = H();
  const { ta1, ta2, rieng } = await nen(w, addDays(hn, -10));
  const r = await ok(doi(w, rieng, { muc: ta2, tuNgay: hn }), 200, "đổi");
  assert.equal(r.json.homNay, hn);
  assert.equal(r.json.laNguoiHuong, true);
  assert.equal(r.json.mucRieng.muc.code, ta2);
  assert.equal(r.json.mucRieng.tuNgay, hn);
  assert.equal(r.json.mucRieng.denNgay, null);
  assert.equal(r.json.ganRieng.length, 2);
  const cu = dongRieng(w, rieng), moi = dongRieng(w, r.json.mucRieng.id);
  assert.deepEqual([cu.tier_code, cu.valid_from_date, cu.valid_to_date, cu.voided_at], [ta1, addDays(hn, -10), addDays(hn, -1), null]);
  assert.deepEqual([moi.party_id, moi.tier_code, moi.valid_from_date, moi.valid_to_date, moi.replaces_id, moi.change_reason], [ORG, ta2, hn, null, null, null]);
  assert.deepEqual(nhatKy(w, "prc_party_tier_closed"), [`mức riêng TA1-${seq} · đến ${addDays(hn, -1)}`]);
  assert.deepEqual(nhatKy(w, "prc_party_tier_set"), [`mức riêng TA1-${seq} · từ ${addDays(hn, -10)}`, `mức riêng TA2-${seq} · từ ${hn}`]);
  const nay = await thuTra(w, hn);
  assert.equal(nay.trangThai, "SET");
  assert.ok([10, 11, 12].includes(nay.bac), `bậc ${nay.bac}`);
  assert.deepEqual([nay.muc.doiTuong.loai, nay.muc.doiTuong.code, nay.muc.tyLeBp], ["MUC", ta2, 1200]);
  const homQua = await thuTra(w, addDays(hn, -1));
  assert.ok([10, 11, 12].includes(homQua.bac), `bậc hôm qua ${homQua.bac}`);
  assert.deepEqual([homQua.muc.doiTuong.code, homQua.muc.tyLeBp], [ta1, 1000]);
});

test("cấp trùng 400; cấp khoá 409 muc_tat đúng câu mới §6.1 :72; cấp không có 404; thân sai 400; không ghi gì", async () => {
  const w = setup();
  const hn = H();
  const { ta1, ta2, rieng } = await nen(w, addDays(hn, -10));
  await ok(w.call("POST", `/api/pricing/muc-ta/${ta2}/tat`, { as: KT, body: {} }), 200, "khoá TA2");
  const truoc = dem(w); // [prc_party_tier, audit_log] sau khi khoá TA2 — mọi lệnh đổi dưới đây không ghi gì ở cả hai bảng
  const r1 = await doi(w, rieng, { muc: ta1, tuNgay: hn });
  assert.deepEqual([r1.status, r1.json.error.message], [400, "Cấp mới giống hệt cấp đang áp dụng."]);
  const r2 = await doi(w, rieng, { muc: ta2, tuNgay: hn });
  assert.deepEqual([r2.status, r2.json.error.code, r2.json.error.message], [409, "muc_tat", CAU_MUC_TAT]);
  assert.equal(dongRieng(w, rieng).valid_to_date, null, "dòng cũ còn nguyên (cả lô huỷ)");
  const r3 = await doi(w, rieng, { muc: "MT_KHONGCO1", tuNgay: hn });
  assert.deepEqual([r3.status, r3.json.error.message], [404, "Không tìm thấy cấp đại lý này."]);
  const r4 = await doi(w, rieng, { tuNgay: hn });
  assert.deepEqual([r4.status, r4.json.error.message], [400, "Chọn cấp đại lý."]);
  const r5 = await doi(w, crypto.randomUUID(), { muc: ta1, tuNgay: hn });
  assert.deepEqual([r5.status, r5.json.error.message], [404, "Không tìm thấy cấp riêng này."]);
  assert.equal((await doi(w, "khong-phai-ma", { muc: ta1, tuNgay: hn })).status, 404);
  assert.deepEqual(dem(w), truoc);
});

test("hồ sơ thôi mang loại được hưởng ⇒ 400, không ghi gì", async () => {
  const w = setup();
  const hn = H();
  const { loai, ta2, rieng } = await nen(w, addDays(hn, -10));
  await ok(w.call("POST", `/api/pricing/loai-doi-tac/${loai}/tat`, { as: KT, body: {} }), 200, "tắt loại");
  const truoc = dem(w);
  const r = await doi(w, rieng, { muc: ta2, tuNgay: hn });
  assert.deepEqual([r.status, r.json.error.message], [400, "Hồ sơ này không mang vai trò được hưởng hoa hồng."]);
  assert.deepEqual(dem(w), truoc);
  assert.equal(dongRieng(w, rieng).valid_to_date, null);
});

test("đã có đơn chụp tới X ⇒ tuNgay ≤ X bị chặn, câu nguyên văn kiemDoi", async () => {
  const hn = H();
  const x = addDays(hn, 2);
  const w = setup({ ngayChupGia: x });
  const { ta2, rieng } = await nen(w, addDays(hn, -10));
  const truoc = dem(w);
  for (const tu of [hn, addDays(hn, 1), x]) {
    const r = await doi(w, rieng, { muc: ta2, tuNgay: tu });
    assert.deepEqual([r.status, r.json.error.message], [400, cauDaChup(x, addDays(x, 1))], tu);
  }
  assert.deepEqual(dem(w), truoc);
  await ok(doi(w, rieng, { muc: ta2, tuNgay: addDays(x, 1) }), 200, "đổi từ ngày sau X");
  assert.equal(dongRieng(w, rieng).valid_to_date, x);
});

test("thiếu hàm tiêm đã chụp chưa ⇒ 503 chua_kiem_chup", async () => {
  const w = setup({ khongTiemDaChup: true });
  const hn = H();
  const { ta2, rieng } = await nen(w, addDays(hn, -10));
  const truoc = dem(w);
  const r = await doi(w, rieng, { muc: ta2, tuNgay: hn });
  assert.deepEqual([r.status, r.json.error.code], [503, "chua_kiem_chup"]);
  assert.deepEqual(dem(w), truoc);
});

test("cấp cũ đang khoá: đổi sang cấp khác 200; Sửa dòng mới về cấp cũ đang khoá ⇒ 409 muc_tat (giới hạn Đ8)", async () => {
  const w = setup();
  const hn = H();
  const { ta1, ta2, rieng } = await nen(w, addDays(hn, -10));
  await ok(w.call("POST", `/api/pricing/muc-ta/${ta1}/tat`, { as: KT, body: {} }), 200, "khoá TA1");
  const r = await ok(doi(w, rieng, { muc: ta2, tuNgay: hn }), 200, "đổi ra khỏi cấp khoá");
  const moiId = r.json.mucRieng.id as string;
  assert.equal(dongRieng(w, rieng).valid_to_date, addDays(hn, -1));
  const truoc = dem(w);
  const s = await w.call("POST", `/api/pricing/muc-rieng/${moiId}/sua`, { as: KT, body: { muc: ta1, tuNgay: hn, lyDo: LY_DO } });
  assert.deepEqual([s.status, s.json.error.code, s.json.error.message], [409, "muc_tat", CAU_MUC_TAT]);
  assert.deepEqual(dem(w), truoc);
  assert.equal(dongRieng(w, moiId).voided_at, null);
});

type Ca = { ten: string; tu: number; den?: number; huy?: boolean; tuNgay: (h: string) => string; chup?: boolean; mong: "X1" | "X2" | "200" | ((h: string) => string) };
const CA: Ca[] = [
  { ten: "a đã huỷ, không ngày ngừng", tu: -5, huy: true, tuNgay: (h) => h, mong: () => CAU_DA_HUY },
  { ten: "b đã huỷ, có ngày ngừng", tu: -5, den: 10, huy: true, tuNgay: (h) => h, mong: () => CAU_DA_HUY },
  { ten: "c có ngày ngừng", tu: -5, den: 10, tuNgay: (h) => addDays(h, 1), mong: "X1" },
  { ten: "d chưa tới ngày", tu: 3, tuNgay: (h) => addDays(h, 5), mong: () => CAU_CHUA_TOI },
  { ten: "e ca giao nhau: chưa tới ngày, H ≤ tuNgay ≤ validFrom", tu: 3, tuNgay: (h) => addDays(h, 1), mong: () => CAU_CHUA_TOI },
  { ten: "e2 chưa tới ngày, tuNgay = validFrom", tu: 3, tuNgay: (h) => addDays(h, 3), mong: () => CAU_CHUA_TOI },
  { ten: "f tuNgay sai dạng", tu: -5, tuNgay: () => "abc", mong: () => CAU_TRUOC_HOM_NAY },
  { ten: "g tuNgay trước hôm nay", tu: -5, tuNgay: (h) => addDays(h, -1), mong: () => CAU_TRUOC_HOM_NAY },
  { ten: "h bắt đầu hôm nay, đổi từ hôm nay", tu: 0, tuNgay: (h) => h, mong: "X2" },
  { ten: "i bắt đầu hôm nay, đổi từ mai", tu: 0, tuNgay: (h) => addDays(h, 1), mong: "200" },
  { ten: "j hợp lệ", tu: -5, tuNgay: (h) => h, mong: "200" },
  { ten: "k đã chụp hôm nay, đổi từ hôm nay", tu: -5, tuNgay: (h) => h, chup: true, mong: (h) => cauDaChup(h, addDays(h, 1)) },
  { ten: "l đã chụp hôm nay, đổi từ mai", tu: -5, tuNgay: (h) => addDays(h, 1), chup: true, mong: "200" },
];

test("ghim hai phía X1/X2 ⇔ kiemDoi", async (t) => {
  const hn = H();
  // Mỗi ca một bài con: ca đỏ nào cũng được báo, không dừng ở ca đỏ đầu tiên.
  for (const ca of CA) await t.test(ca.ten, async () => {
    const w = setup(ca.chup ? { ngayChupGia: hn } : {});
    const { ta2, rieng } = await nen(w, addDays(hn, ca.tu), ca.den === undefined ? undefined : addDays(hn, ca.den));
    if (ca.huy) w.sqlite.prepare("UPDATE prc_party_tier SET voided_at = ?, voided_by = ? WHERE id = ?").run(AT, KT, rieng);
    const row = dongRieng(w, rieng);
    const cu = { validFrom: row.valid_from_date as string, validTo: row.valid_to_date as string | null, daHuy: row.voided_at !== null };
    const tuNgay = ca.tuNgay(hn);
    const kd = kiemDoi({ cu, tuNgay, homNay: hn, ngayChup: ca.chup ? hn : null });
    const truoc = dem(w);
    const r = await doi(w, rieng, { muc: ta2, tuNgay });
    // Phía 1 — hai phía khớp nhau: hai lý do «sai đường» của kiemDoi ⇔ X1 / X2; lý do khác ⇒ đúng câu kiemDoi; kiemDoi cho qua ⇒ 200.
    if (kd.ok) assert.equal(r.status, 200, `${ca.ten}: ${r.text}`);
    else {
      assert.equal(r.status, 400, `${ca.ten}: ${r.text}`);
      const mongRoute = kd.error === KD_DA_NGUNG ? CAU_X1 : KD_BAT_DAU.test(kd.error) ? cauX2(cu.validFrom) : kd.error;
      assert.equal(r.json.error.message, mongRoute, ca.ten);
      assert.deepEqual(dem(w), truoc, `${ca.ten}: không ghi gì`);
    }
    // Phía 2 — đúng ca của bảng (tự đứng, không dựa vào kiemDoi).
    if (ca.mong === "200") assert.equal(r.status, 200, ca.ten);
    else if (ca.mong === "X1") assert.equal(r.json.error.message, CAU_X1, ca.ten);
    else if (ca.mong === "X2") assert.equal(r.json.error.message, cauX2(cu.validFrom), ca.ten);
    else assert.equal(r.json.error.message, ca.mong(hn), ca.ten);
  });
});
