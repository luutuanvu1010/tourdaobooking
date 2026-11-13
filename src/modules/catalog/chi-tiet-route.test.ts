// Chi tiết dịch vụ (ADR-0199 Đ1) qua ứng dụng THẬT: tên hiển thị thắng tên Sheet ở danh mục, đơn cũ giữ tên đã chụp, đồng bộ Sheet không chạm, chỉ `admin.manage` ghi.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, PARTNER, SALES, SUP, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

const URL_CT = "/api/catalog/ZA1/chi-tiet";
const luu = (w: any, body: unknown, as = ADM) => w.call("PUT", URL_CT, { as, body });
const nk = (w: any) => w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'service_detail_changed'")[0].n as number;
const bang = (w: any) => w.q("SELECT count(*) AS n FROM ctl_service_detail")[0].n as number;
const tenForOrder = async (w: any, as = SALES) => (await w.call("GET", "/api/catalog/for-order", { as })).json.items.find((i: any) => i.code === "ZA1")?.name;

test("GET: dịch vụ chưa có chi tiết trả tên Sheet, tên hiển thị và mô tả null", async () => {
  const w = setup();
  const r = await w.call("GET", URL_CT, { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ma: "ZA1", tenSheet: "Tour đảo", tenHienThi: null, moTa: null, cauTenSheetDoi: null, anh: null });
});

test("lưu tên hiển thị + mô tả: có nhật ký chỉ mã; tên hiển thị thắng tên Sheet ở danh mục lập đơn (cả Đối tác) và màn quản trị", async () => {
  const w = setup();
  const r = await luu(w, { tenHienThi: "  Tour 4 đảo cao cấp ", moTa: "Đi cano, ăn trưa trên đảo." });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { ma: "ZA1", tenSheet: "Tour đảo", tenHienThi: "Tour 4 đảo cao cấp", moTa: "Đi cano, ăn trưa trên đảo.", cauTenSheetDoi: null, anh: null });
  assert.deepEqual([bang(w), nk(w)], [1, 1]);
  const dong = w.q("SELECT target_type, target_id, detail FROM audit_log WHERE action = 'service_detail_changed'")[0];
  assert.equal(dong.target_id, "ZA1");
  assert.doesNotMatch(dong.detail, /cano/, "nhật ký không chép nội dung mô tả");
  assert.equal(await tenForOrder(w, SALES), "Tour 4 đảo cao cấp");
  assert.equal(await tenForOrder(w, PARTNER), "Tour 4 đảo cao cấp");
  const ad = (await w.call("GET", "/api/catalog/admin", { as: ADM })).json.items.find((i: any) => i.code === "ZA1");
  assert.equal(ad.name, "Tour đảo", "màn quản trị: name vẫn là tên Sheet");
  assert.equal(ad.tenHienThi, "Tour 4 đảo cao cấp");
  assert.equal(ad.moTa, "Đi cano, ăn trưa trên đảo.");
});

test("gửi đúng giá trị đang có: 200, không ghi; gửi null xoá được, danh mục quay về tên Sheet", async () => {
  const w = setup();
  assert.equal((await luu(w, { tenHienThi: null, moTa: null })).status, 200);
  assert.deepEqual([bang(w), nk(w)], [0, 0], "chưa có dòng mà gửi rỗng: không ghi");
  assert.equal((await luu(w, { tenHienThi: "Tên mới", moTa: null })).status, 200);
  assert.equal((await luu(w, { tenHienThi: "Tên mới", moTa: null }, SUP)).status, 200);
  assert.deepEqual([bang(w), nk(w)], [1, 1]);
  assert.equal((await luu(w, { tenHienThi: null, moTa: null })).status, 200);
  assert.deepEqual([bang(w), nk(w)], [2, 2]);
  assert.equal(await tenForOrder(w), "Tour đảo");
});

test("đơn mới chụp tên hiển thị; đơn đã lập trước đó giữ tên cũ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const cu = await don(w, {});
    assert.equal((await luu(w, { tenHienThi: "Tour 4 đảo cao cấp", moTa: null })).status, 200);
    const moi = await don(w, {});
    const ten = (id: string) => w.q("SELECT name FROM order_service WHERE order_id = ?", id)[0].name;
    assert.equal(ten(cu.id), "Tour đảo");
    assert.equal(ten(moi.id), "Tour 4 đảo cao cấp");
  } finally { tat(); }
});

test("Sheet đổi tên sau khi đặt tên hiển thị: tên hiển thị giữ nguyên, GET báo câu tên Sheet đã đổi", async () => {
  const w = setup();
  assert.equal((await luu(w, { tenHienThi: "Tour đẹp", moTa: null })).status, 200);
  w.sqlite.exec("UPDATE catalog_item SET name = 'Tour đảo (mới)' WHERE code = 'ZA1'"); // giả lập lần đồng bộ Sheet đổi tên
  const r = await w.call("GET", URL_CT, { as: ADM });
  assert.equal(r.json.tenHienThi, "Tour đẹp");
  assert.equal(r.json.cauTenSheetDoi, "Tên trên Sheet đã đổi thành «Tour đảo (mới)» từ lúc đặt tên hiển thị.");
  assert.equal(await tenForOrder(w), "Tour đẹp");
});

test("quyền: Bán hàng, Kế toán, Đối tác 403 cả GET lẫn PUT, không ghi", async () => {
  const w = setup();
  for (const as of [SALES, ACC, PARTNER]) {
    assert.equal((await luu(w, { tenHienThi: "X", moTa: null }, as)).status, 403);
    assert.equal((await w.call("GET", URL_CT, { as })).status, 403);
  }
  assert.deepEqual([bang(w), nk(w)], [0, 0]);
});

test("thân sai / mã không có → 400 / 404, không ghi", async () => {
  const w = setup();
  for (const body of [{ tenHienThi: 5, moTa: null }, { tenHienThi: "A" }, { tenHienThi: "a".repeat(201), moTa: null }, { tenHienThi: null, moTa: "a".repeat(2001) }]) {
    assert.equal((await luu(w, body)).status, 400, JSON.stringify(body).slice(0, 60));
  }
  assert.equal((await w.call("PUT", "/api/catalog/KHONGCO/chi-tiet", { as: ADM, body: { tenHienThi: "A", moTa: null } })).status, 404);
  assert.equal((await w.call("GET", "/api/catalog/KHONGCO/chi-tiet", { as: ADM })).status, 404);
  assert.deepEqual([bang(w), nk(w)], [0, 0]);
});

test("hai lần lưu cùng mili-giây: đúng một lần ghi, lần kia 409 stale", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    let lanHai: any;
    w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((x) => /ctl_service_detail/.test(x.sql)), async () => { lanHai = await luu(w, { tenHienThi: "B", moTa: null }, SUP); });
    const lanDau = await luu(w, { tenHienThi: "A", moTa: null }, ADM);
    assert.equal(lanHai.status, 200, lanHai.text);
    assert.equal(lanDau.status, 409, lanDau.text);
    assert.equal(lanDau.json.error.code, "stale");
    assert.deepEqual([bang(w), nk(w)], [1, 1]);
  } finally { tat(); }
});

test("màn Đặc điểm dịch vụ và danh sách của Quản lý bán hàng cũng hiện tên hiển thị", async () => {
  const w = setup();
  assert.equal((await luu(w, { tenHienThi: "Tour đẹp", moTa: null })).status, 200);
  const qlb = await w.call("GET", "/api/catalog/quan-ly-ban", { as: ADM });
  assert.equal(qlb.status, 200, qlb.text);
  assert.equal(qlb.json.dichVu.find((d: any) => d.code === "ZA1").ten, "Tour đẹp");
  const dd = await w.call("GET", "/api/catalog/dac-diem", { as: ADM });
  assert.equal(dd.status, 200, dd.text);
  assert.equal(dd.json.dichVu.find((d: any) => d.code === "ZA1").ten, "Tour đẹp");
});
