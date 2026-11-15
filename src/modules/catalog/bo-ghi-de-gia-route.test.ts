// ADR-0166 câu 2: «Bỏ ghi đè giá» (`DELETE /api/catalog/:code/override`) chỉ bỏ GIÁ ghi đè — dấu «Ngừng bán» (hidden) được giữ nguyên.
// Trước đây route xoá cả dòng `catalog_override` nên dịch vụ đang ngừng bán hiện lại và bán được ngoài ý Quản trị.
// Chạy CẢ ứng dụng trên SQLite thật qua tests/audit/harness.mjs (cùng khuôn danh-muc-lap-don.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { CAU_HOI_BO_GHI_DE_GIA } from "../../shared/catalog-nut.ts";

const ADM = "33333333-3333-4333-8333-333333333333";
const NOW = "2026-09-01T00:00:00.000Z";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  for (const [ma, ten, gia, dong] of [["PHAO", "Phao chuối", 1500000, 1], ["TOUR4DAO", "Tour 4 đảo", 500000, 2]] as const) {
    w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
      VALUES ('${ma}', '${ten}', 'perPax', ${gia}, NULL, NULL, NULL, ${dong}, 1, '${NOW}', '${NOW}')`);
  }
  return w;
}
const dong = async (w: ReturnType<typeof setup>, ma: string) => (await w.call("GET", "/api/catalog/admin", { as: ADM })).json.items.find((i: any) => i.code === ma);
const soDongGhiDe = (w: ReturnType<typeof setup>, ma: string): number => (w.sqlite.prepare("SELECT COUNT(*) AS n FROM catalog_override WHERE code = ?").get(ma) as { n: number }).n;

test("vừa ngừng bán vừa ghi đè giá: bỏ ghi đè giá xong vẫn ngừng bán, giá về Sheet", async () => {
  const w = setup();
  assert.equal((await w.call("PATCH", "/api/catalog/PHAO", { as: ADM, body: { prices: { adult: 2000000 } } })).status, 200);
  assert.equal((await w.call("PATCH", "/api/catalog/PHAO", { as: ADM, body: { hidden: true } })).status, 200);
  const truoc = await dong(w, "PHAO");
  assert.equal(truoc.hidden, true);
  assert.equal(truoc.prices.adult, 2000000);
  const r = await w.call("DELETE", "/api/catalog/PHAO/override", { as: ADM });
  assert.equal(r.status, 200, r.text);
  const sau = await dong(w, "PHAO");
  assert.equal(sau.hidden, true, "dấu Ngừng bán phải còn");
  assert.equal(sau.prices.adult, 1500000, "giá về giá Sheet");
  assert.deepEqual(sau.overridden, [], "không còn loại khách nào bị ghi đè giá");
  assert.equal(r.json.item.hidden, true, "phản hồi cũng nói vẫn ngừng bán");
  const bh = await w.call("GET", "/api/catalog/for-order", { as: ADM });
  assert.equal(bh.json.items.some((i: any) => i.code === "PHAO"), false, "bên bán hàng vẫn không thấy dịch vụ ngừng bán");
  const nk = w.sqlite.prepare("SELECT action, detail FROM audit_log WHERE action = 'catalog_override_cleared' ORDER BY rowid DESC LIMIT 1").get() as { action: string; detail: string };
  assert.match(nk.detail, /giá/, "nhật ký nói đúng việc: bỏ giá");
  assert.doesNotMatch(nk.detail, /ẩn/, "nhật ký không nói bỏ cả dấu ẩn");
});

test("dịch vụ không ngừng bán: bỏ ghi đè giá xong không còn dòng ghi đè nào", async () => {
  const w = setup();
  assert.equal((await w.call("PATCH", "/api/catalog/TOUR4DAO", { as: ADM, body: { prices: { adult: 450000 } } })).status, 200);
  assert.equal(soDongGhiDe(w, "TOUR4DAO"), 1);
  const r = await w.call("DELETE", "/api/catalog/TOUR4DAO/override", { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.equal(soDongGhiDe(w, "TOUR4DAO"), 0, "không ẩn thì dòng ghi đè được xoá hẳn như trước");
  const sau = await dong(w, "TOUR4DAO");
  assert.equal(sau.hidden, false);
  assert.equal(sau.prices.adult, 500000);
});

test("dịch vụ chỉ ngừng bán, không ghi đè giá: bấm bỏ ghi đè giá không đổi gì, vẫn ngừng bán", async () => {
  const w = setup();
  assert.equal((await w.call("PATCH", "/api/catalog/PHAO", { as: ADM, body: { hidden: true } })).status, 200);
  const r = await w.call("DELETE", "/api/catalog/PHAO/override", { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.equal((await dong(w, "PHAO")).hidden, true);
});

test("câu hỏi trước khi bỏ: nói chuyện giá; dịch vụ đang ngừng bán thì nói vẫn ngừng bán", () => {
  assert.match(CAU_HOI_BO_GHI_DE_GIA("PHAO", false), /^Bỏ giá ghi đè của PHAO, quay về giá theo Sheet\?$/);
  assert.match(CAU_HOI_BO_GHI_DE_GIA("PHAO", true), /vẫn ngừng bán/);
});
