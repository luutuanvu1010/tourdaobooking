// Route ĐẶC ĐIỂM DỊCH VỤ qua khung thử (ADR-0152 Đ1, Đ3, Đ4 nhật ký, Đ5; tiêu chí 1–4, 6, 7, 12, 13 (máy chủ), 17b (máy chủ), 18, 19; kế hoạch 2026-10-30 T7; chủ chọn Q-2 (a)).
// Đặc điểm, giá trị, nhóm, gắn nhóm, luật bán tạo bằng ROUTE thật; dịch vụ danh mục chèn thẳng `catalog_item` (không có route tạo dịch vụ ngoài đồng bộ Sheet — tiêu chí 7 dùng
// đồng bộ thật với Sheet giả). Bài chỉ ĐỌC ba bảng `ctl_attribute*` để đếm dòng (bài kiểm không phải mã chạy — hàng rào (f) chỉ quét mã chạy).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const DT = "55555555-5555-4555-8555-555555555555";
const HR = "66666666-6666-4666-8666-666666666666";
const SA = "77777777-7777-4777-8777-777777777777";
const SP = "88888888-8888-4888-8888-888888888888"; // tài khoản lai: Bán hàng + Đối tác
const TT = "99999999-9999-4999-8999-999999999999"; // Thực tập
const CU = "2026-09-01T00:00:00.000Z";
type W = ReturnType<typeof world>;

function item(w: W, code: string, o: { inSheet?: number; firstSeen?: string } = {}) {
  w.sqlite.prepare(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES (?, ?, 'perPax', 300000, NULL, NULL, NULL, 1, ?, ?, ?)`).run(code, `Dịch vụ ${code}`, o.inSheet ?? 1, o.firstSeen ?? CU, CU);
}
async function setup() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [DT, "0900000006", "Đại Lý A", ["PARTNER"]], [HR, "0900000008", "Hà Nhân Sự", ["HR"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
    [SP, "0900000009", "Sơn Lai Bán", ["SALES", "PARTNER"]], [TT, "0900000010", "Tú Thực Tập", ["INTERN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  item(w, "DVA");
  item(w, "DVB", { firstSeen: new Date().toISOString() });
  item(w, "DVC");
  item(w, "DVROI", { inSheet: 0 });
  item(w, "DVAN");
  assert.equal((await w.call("PATCH", "/api/catalog/DVAN", { as: ADM, body: { hidden: true } })).status, 200);
  const g = await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Nhóm đảo thử" } });
  assert.equal(g.status, 201, g.text);
  const nhom = g.json.group.code as string;
  assert.equal((await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["DVB", "DVC"], groupCode: nhom } })).status, 200);
  const t = await w.call("POST", "/api/catalog/dac-diem", { as: ADM, body: { ten: "Vận chuyển cảng–đảo", giaTri: [{ ten: "Gồm" }, { ten: "Không gồm" }] } });
  assert.equal(t.status, 201, t.text);
  const dd = t.json.dacDiem;
  return { w, nhom, attr: dd.code as string, x1: dd.giaTri[0].code as string, x2: dd.giaTri[1].code as string };
}
const dem = (w: W, action: string) => Number(w.q("SELECT count(*) AS n FROM audit_log WHERE action = ?", action)[0].n);
const gan = (w: W, as: string, code: string, attr: string, giaTri: string | null, dangThay: string | null) =>
  w.call("PUT", `/api/catalog/${code}/dac-diem/${attr}`, { as, body: { giaTri, dangThay } });
const ganNhom = (w: W, as: string, nhom: string, attr: string, giaTri: string | null, dangThay: string | null) =>
  w.call("PUT", `/api/catalog/groups/${nhom}/dac-diem/${attr}`, { as, body: { giaTri, dangThay } });
async function hieuLuc(w: W, code: string, attr: string) {
  const r = await w.call("GET", "/api/catalog/dac-diem", { as: SALES });
  assert.equal(r.status, 200, r.text);
  return r.json.dichVu.find((d: { code: string }) => d.code === code).giaTri[attr] ?? null;
}

test("ADR-0152 tiêu chí 1: Quản trị tạo đặc điểm hai giá trị ⇒ 201 + đúng HAI dòng nhật ký (đặc điểm; các giá trị); Bán hàng, Kế toán, Đối tác, Thực tập, Nhân sự, lai ⇒ 403; trùng tên ⇒ 409", async () => {
  const { w } = await setup();
  assert.equal(dem(w, "ctl_attribute_created"), 1);
  assert.equal(dem(w, "ctl_attribute_value_created"), 1);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE action LIKE 'ctl_attribute%'")[0].n), 2);
  assert.equal(w.q("SELECT detail FROM audit_log WHERE action = 'ctl_attribute_value_created'")[0].detail, "Vận chuyển cảng–đảo: Gồm, Không gồm");
  const than = { ten: "Đặc điểm khác", giaTri: [{ ten: "A" }] };
  for (const as of [SALES, KT, DT, TT, HR, SP]) assert.equal((await w.call("POST", "/api/catalog/dac-diem", { as, body: than })).status, 403, as);
  const trung = await w.call("POST", "/api/catalog/dac-diem", { as: SA, body: { ten: "Vận chuyển cảng–đảo", giaTri: [{ ten: "A" }] } });
  assert.equal(trung.status, 409, trung.text);
  for (const body of [{ ten: "Thiếu giá trị", giaTri: [] }, { ten: "", giaTri: [{ ten: "A" }] }, { ten: "Hai giá trị trùng", giaTri: [{ ten: "A" }, { ten: "A" }] }])
    assert.equal((await w.call("POST", "/api/catalog/dac-diem", { as: ADM, body })).status, 400, JSON.stringify(body));
});

test("ADR-0152 tiêu chí 2 + 3: Bán hàng gắn cho dịch vụ 200 + nhật ký «chưa khai → …»; Kế toán, Đối tác, Thực tập, Nhân sự, lai 403; Bán hàng gắn theo nhóm 403; riêng thắng chung qua đường thật", async () => {
  const { w, nhom, attr, x1, x2 } = await setup();
  const r = await gan(w, SALES, "DVA", attr, x1, null);
  assert.equal(r.status, 200, r.text);
  const d = String(w.q("SELECT detail FROM audit_log WHERE action = 'ctl_service_attribute_set'")[0].detail);
  assert.ok(d.includes("DVA") && d.includes("chưa khai → Gồm") && d.includes("Vận chuyển cảng–đảo"), d);
  for (const as of [KT, DT, TT, HR, SP]) assert.equal((await gan(w, as, "DVC", attr, x1, null)).status, 403, as);
  assert.equal((await ganNhom(w, SALES, nhom, attr, x2, null)).status, 403, "gắn theo nhóm: cổng quản trị (A-C1)");
  // Tiêu chí 3: nhóm có x2 ⇒ DVB theo nhóm; đặt riêng x1 ⇒ SERVICE; bỏ riêng ⇒ lại x2 từ nhóm.
  assert.equal((await ganNhom(w, ADM, nhom, attr, x2, null)).status, 200);
  assert.equal(dem(w, "ctl_group_attribute_set"), 1);
  assert.deepEqual(await hieuLuc(w, "DVB", attr), { valueCode: x2, nguon: "GROUP" });
  assert.equal((await gan(w, SALES, "DVB", attr, x1, null)).status, 200);
  assert.deepEqual(await hieuLuc(w, "DVB", attr), { valueCode: x1, nguon: "SERVICE" });
  assert.equal((await gan(w, SALES, "DVB", attr, null, x1)).status, 200);
  assert.deepEqual(await hieuLuc(w, "DVB", attr), { valueCode: x2, nguon: "GROUP" });
  const cuoi = String(w.q("SELECT detail FROM audit_log WHERE action = 'ctl_service_attribute_set' ORDER BY rowid DESC LIMIT 1")[0].detail);
  assert.ok(cuoi.includes("Gồm → theo nhóm"), cuoi);
  // Mã lạ / giá trị không thuộc đặc điểm.
  assert.equal((await gan(w, SALES, "KHONGCO", attr, x1, null)).status, 404);
  assert.equal((await gan(w, SALES, "DVC", "a000000000000", x1, null)).status, 404);
});

test("ADR-0152 tiêu chí 4: hai lệnh cùng giá trị đang thấy ⇒ một 200, một 409 stale; đúng MỘT dòng mở; không đổi gì ⇒ 200 không nhật ký", async () => {
  const { w, attr, x1, x2 } = await setup();
  assert.equal((await gan(w, SALES, "DVA", attr, x1, null)).status, 200);
  const thua = await gan(w, ADM, "DVA", attr, x2, null);
  assert.deepEqual([thua.status, thua.json.error.code], [409, "stale"]);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM ctl_attribute_assignment WHERE service_code = 'DVA' AND valid_to_at IS NULL")[0].n), 1);
  const truoc = dem(w, "ctl_service_attribute_set");
  assert.equal((await gan(w, SALES, "DVA", attr, x1, x1)).status, 200);
  assert.equal(dem(w, "ctl_service_attribute_set"), truoc);
});

test("ADR-0152 tiêu chí 6 + 17b (máy chủ): tắt giá trị / đặc điểm còn dòng gắn ⇒ 409 attribute_in_use; bỏ hết rồi tắt ⇒ 200; bật lại ⇒ 200 có nhật ký; luật trỏ giá trị tắt ⇒ «không phủ», bật lại ⇒ phủ lại", async () => {
  const { w, attr, x1 } = await setup();
  const loai = (await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: "Loại thử đặc điểm" } })).json.loai.code;
  const luat = await w.call("POST", "/api/pricing/luat-ban", { as: SALES, body: { loai, phamVi: "ATTRIBUTE", attributeCode: attr, valueCode: x1 } });
  assert.equal(luat.status, 201, luat.text);
  assert.equal(luat.json.luat.khongPhu, false);
  assert.equal(luat.json.luat.tenDacDiem, "Vận chuyển cảng–đảo");
  assert.equal((await gan(w, SALES, "DVA", attr, x1, null)).status, 200);
  const ds = (await w.call("GET", "/api/catalog/dac-diem", { as: ADM })).json.dacDiem[0];
  const gtX1 = ds.giaTri.find((g: { code: string }) => g.code === x1);
  const tat = await w.call("PATCH", `/api/catalog/dac-diem/gia-tri/${x1}`, { as: ADM, body: { expectedUpdatedAt: gtX1.capNhatLuc, dangDung: false } });
  assert.deepEqual([tat.status, tat.json.error.code], [409, "attribute_in_use"]);
  const tatDD = await w.call("PATCH", `/api/catalog/dac-diem/${attr}`, { as: ADM, body: { expectedUpdatedAt: ds.capNhatLuc, dangDung: false } });
  assert.deepEqual([tatDD.status, tatDD.json.error.code], [409, "attribute_in_use"]);
  assert.equal((await gan(w, SALES, "DVA", attr, null, x1)).status, 200);
  const tat2 = await w.call("PATCH", `/api/catalog/dac-diem/gia-tri/${x1}`, { as: ADM, body: { expectedUpdatedAt: gtX1.capNhatLuc, dangDung: false } });
  assert.equal(tat2.status, 200, tat2.text);
  // Tắt giá trị còn luật trỏ tới: CHO PHÉP (ADR-0152, trang ghép 3b) — luật thành «không phủ dịch vụ nào».
  assert.equal((await w.call("GET", "/api/pricing/luat-ban", { as: SALES })).json.luat[0].khongPhu, true);
  assert.equal((await gan(w, SALES, "DVA", attr, x1, null)).status, 409, "giá trị đang tắt: không gắn được");
  const capNhat = (await w.call("GET", "/api/catalog/dac-diem", { as: ADM })).json.dacDiem[0].giaTri.find((g: { code: string }) => g.code === x1).capNhatLuc;
  const bat = await w.call("PATCH", `/api/catalog/dac-diem/gia-tri/${x1}`, { as: ADM, body: { expectedUpdatedAt: capNhat, dangDung: true } });
  assert.equal(bat.status, 200, bat.text);
  assert.ok(String(w.q("SELECT detail FROM audit_log WHERE action = 'ctl_attribute_value_updated' ORDER BY rowid DESC LIMIT 1")[0].detail).includes("đã tắt → đang dùng"));
  assert.equal((await w.call("GET", "/api/pricing/luat-ban", { as: SALES })).json.luat[0].khongPhu, false);
  assert.equal((await gan(w, SALES, "DVA", attr, x1, null)).status, 200, "gắn lại sau khi bật");
  // Mốc cũ ⇒ 409 stale (khoá lạc quan).
  assert.equal((await w.call("PATCH", `/api/catalog/dac-diem/gia-tri/${x1}`, { as: ADM, body: { expectedUpdatedAt: capNhat, ten: "Gồm cả xe" } })).status, 409);
});

test("ADR-0152 tiêu chí 13 (máy chủ, + siết KĐL-1): luật trỏ giá trị tắt / giá trị không thuộc đặc điểm / giá trị dưới đặc điểm đang tắt ⇒ 409 sales_block_value_inactive, không ghi", async () => {
  const { w, attr, x1, x2 } = await setup();
  const loai = (await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: "Loại thử 13" } })).json.loai.code;
  const y = (await w.call("POST", "/api/catalog/dac-diem", { as: ADM, body: { ten: "Có hướng dẫn viên", giaTri: [{ ten: "Có" }] } })).json.dacDiem;
  const luat = (body: object) => w.call("POST", "/api/pricing/luat-ban", { as: SALES, body: { loai, phamVi: "ATTRIBUTE", ...body } });
  const lech = await luat({ attributeCode: y.code, valueCode: x1 });
  assert.deepEqual([lech.status, lech.json.error.code], [409, "sales_block_value_inactive"], "x1 thuộc đặc điểm khác");
  const gt = (await w.call("GET", "/api/catalog/dac-diem", { as: ADM })).json.dacDiem.find((d: { code: string }) => d.code === attr).giaTri.find((g: { code: string }) => g.code === x2);
  assert.equal((await w.call("PATCH", `/api/catalog/dac-diem/gia-tri/${x2}`, { as: ADM, body: { expectedUpdatedAt: gt.capNhatLuc, dangDung: false } })).status, 200);
  assert.equal((await luat({ attributeCode: attr, valueCode: x2 })).json.error.code, "sales_block_value_inactive", "giá trị đang tắt");
  // Siết sau KĐL-1: đặc điểm cha tắt (không còn dòng gắn) mà giá trị con vẫn bật.
  assert.equal((await w.call("PATCH", `/api/catalog/dac-diem/${y.code}`, { as: ADM, body: { expectedUpdatedAt: y.capNhatLuc, dangDung: false } })).status, 200);
  const cha = await luat({ attributeCode: y.code, valueCode: y.giaTri[0].code });
  assert.deepEqual([cha.status, cha.json.error.code], [409, "sales_block_value_inactive"], "đặc điểm cha đang tắt");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM prc_sales_block")[0].n), 0);
  assert.equal((await luat({ attributeCode: attr, valueCode: x1 })).status, 201);
});

test("ADR-0152 tiêu chí 12, 18, 19: danh sách «chưa khai» (bỏ dịch vụ ẩn, rời Sheet), số đếm huy hiệu, «mới, đang theo nhóm»; đọc: Bán hàng, Quản trị, Toàn quyền 200 — Kế toán, Đối tác, lai 403", async () => {
  const { w, nhom, attr, x1 } = await setup();
  const ds0 = (await w.call("GET", "/api/catalog/dac-diem", { as: SALES })).json;
  assert.deepEqual(ds0.dacDiem[0].chuaKhai, ["DVA", "DVB", "DVC"], "mọi dịch vụ đang bán chưa khai; DVAN (ẩn), DVROI (rời Sheet) không có");
  assert.equal((await w.call("GET", "/api/catalog/dac-diem/dem-chua-khai", { as: SALES })).json.soChuaKhai, 3);
  assert.equal((await ganNhom(w, ADM, nhom, attr, x1, null)).status, 200);
  const ds1 = (await w.call("GET", "/api/catalog/dac-diem", { as: SALES })).json;
  assert.deepEqual(ds1.dacDiem[0].chuaKhai, ["DVA"]);
  assert.deepEqual(ds1.moiTheoNhom, [{ catalogCode: "DVB", attributeCode: attr }], "DVB thấy lần đầu hôm nay, theo nhóm; DVC cũ");
  assert.equal((await w.call("GET", "/api/catalog/dac-diem/dem-chua-khai", { as: ADM })).json.soChuaKhai, 1);
  assert.equal(ds1.nhom.find((g: { code: string }) => g.code === nhom).giaTri[attr], x1);
  for (const as of [SALES, ADM, SA]) assert.equal((await w.call("GET", "/api/catalog/dac-diem", { as })).status, 200, as);
  for (const as of [KT, DT, SP, TT, HR]) {
    assert.equal((await w.call("GET", "/api/catalog/dac-diem", { as })).status, 403, as);
    assert.equal((await w.call("GET", "/api/catalog/dac-diem/dem-chua-khai", { as })).status, 403, as);
  }
});

test("ADR-0152 tiêu chí 7: đồng bộ Sheet (thêm, đổi, mất dịch vụ) không đổi dòng nào của ba bảng ctl_attribute*", async () => {
  const { w, nhom, attr, x1 } = await setup();
  await gan(w, SALES, "DVA", attr, x1, null);
  await ganNhom(w, ADM, nhom, attr, x1, null);
  const chup = () => ["ctl_attribute", "ctl_attribute_value", "ctl_attribute_assignment"].map((t) => JSON.stringify(w.q(`SELECT * FROM ${t} ORDER BY 1`)));
  const truoc = chup();
  const HEADER = "Mã tour,Tên tour,Khoá giá,Đường dẫn,Đơn vị,Giá người lớn,Giá trẻ em,Ghi chú trẻ em,Giá người cao tuổi,Ghi chú người cao tuổi,Giá em bé,Ghi chú em bé,Ghi chú nội bộ";
  const csv = [HEADER, "DVA,Dịch vụ A đổi tên,k,d,perPax,350000,,,,,,,", "DVB,Dịch vụ DVB,k,d,perPax,300000,,,,,,,", "DVMOI,Dịch vụ mới,k,d,perPax,100000,,,,,,,"].join("\n");
  const fetchGoc = globalThis.fetch;
  w.env.SERVICES_SHEET_ID = "s".repeat(30);
  globalThis.fetch = (async () => new Response(csv, { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } })) as typeof fetch;
  try {
    const r = await w.call("POST", "/api/catalog/sync", { as: ADM, body: { force: true } });
    assert.equal(r.status, 200, r.text);
    assert.ok(r.json.added >= 1 && r.json.changed >= 1 && r.json.hidden >= 1, r.text);
  } finally {
    globalThis.fetch = fetchGoc;
  }
  assert.deepEqual(chup(), truoc);
});
