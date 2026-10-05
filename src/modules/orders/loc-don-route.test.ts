// Bộ lọc danh sách đơn nhiều điều kiện (góp ý T4 / YC-0008, YC-0012): `GET /api/orders?tu=&den=&dichVu=&status=&nguoiLap=` — chạy CẢ ứng dụng trên SQLite
// thật (khung tests/audit/harness.mjs). Bài ghim: (a) mỗi điều kiện lọc đúng và AND với nhau; (b) bộ lọc KHÔNG BAO GIỜ nới phạm vi xem của vai (Đối tác /
// Thực tập chỉ đơn mình lập, HDV chỉ đơn mình phụ trách); (c) tham số sai → 400 câu tiếng Việt, nhưng 403 luôn đứng TRƯỚC 400.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES_B = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const DRIVER = "66666666-6666-4666-8666-666666666666";

const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const D3 = inDays(3);
const D4 = inDays(4);
const D6 = inDays(6);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES_B, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000010", name: "Tài xế", perms: ["DRIVER"] });
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES
    ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01'),
    ('ZA2', 'Lặn biển', 'perPax', 300000, 1, '2026-01-01', '2026-01-01')`);
  return w;
}
const svc = (code: string, price: number, departDate: string) =>
  ({ kind: "catalog", catalogCode: code, pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: price }, departDate });
async function donMoi(w: any, as: string, code: "ZA1" | "ZA2", departDate: string, extra: Record<string, unknown> = {}): Promise<string> {
  const r = await w.call("POST", "/api/orders", {
    as, body: { customerName: "Khách Lọc", customerPhone: "0912345678", services: [svc(code, code === "ZA1" ? 500000 : 300000, departDate)], depositAmount: 0, depositMethod: "cash", ...extra },
  });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id;
}
const ids = async (w: any, as: string, qs: string): Promise<Set<string>> => {
  const r = await w.call("GET", `/api/orders?limit=100&${qs}`, { as });
  assert.equal(r.status, 200, `${qs}: ${r.text}`);
  return new Set(r.json.orders.map((o: any) => o.id));
};

async function duLieu() {
  const w = setup();
  const a3 = await donMoi(w, SALES, "ZA1", D3); // An, Tour đảo, D3, nháp
  const a4 = await donMoi(w, SALES, "ZA2", D4); // An, Lặn biển, D4 → xác nhận
  const b6 = await donMoi(w, SALES_B, "ZA1", D6); // Bình, Tour đảo, D6 → huỷ
  const f4 = await donMoi(w, SALES_B, "ZA1", D4, { handlerStaffId: FIELD }); // Bình, Tour đảo, D4, HDV phụ trách
  const p3 = await donMoi(w, PARTNER, "ZA1", D3); // Đối tác lập
  assert.equal((await w.call("POST", `/api/orders/${a4}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${b6}/status`, { as: SALES_B, body: { status: "cancelled", lyDo: "KHACH_DOI_Y", reason: "Khách đổi ý" } })).status, 200);
  return { w, a3, a4, b6, f4, p3 };
}

test("lọc: không tham số → như cũ (mọi đơn cho người xem mọi đơn)", async () => {
  const { w, a3, a4, b6, f4, p3 } = await duLieu();
  assert.deepEqual(await ids(w, ADM, ""), new Set([a3, a4, b6, f4, p3]));
});

test("lọc: khoảng ngày đi (một đầu, hai đầu, một ngày) theo ngày dịch vụ", async () => {
  const { w, a3, a4, b6, f4, p3 } = await duLieu();
  assert.deepEqual(await ids(w, ADM, `tu=${D3}&den=${D3}`), new Set([a3, p3]), "đúng một ngày");
  assert.deepEqual(await ids(w, ADM, `tu=${D4}`), new Set([a4, f4, b6]), "chỉ đầu Từ");
  assert.deepEqual(await ids(w, ADM, `den=${D4}`), new Set([a3, p3, a4, f4]), "chỉ đầu Đến");
  assert.deepEqual(await ids(w, ADM, `tu=${inDays(10)}`), new Set(), "không đơn nào");
});

test("lọc: dịch vụ chọn nhiều, trạng thái chọn nhiều, người lập — AND với nhau và với ngày đi", async () => {
  const { w, a3, a4, b6, f4, p3 } = await duLieu();
  assert.deepEqual(await ids(w, ADM, "dichVu=ZA2"), new Set([a4]));
  assert.deepEqual(await ids(w, ADM, "dichVu=ZA2&dichVu=ZA1"), new Set([a3, a4, b6, f4, p3]));
  assert.deepEqual(await ids(w, ADM, "status=confirmed&status=cancelled"), new Set([a4, b6]));
  assert.deepEqual(await ids(w, ADM, `nguoiLap=${SALES_B}`), new Set([b6, f4]));
  assert.deepEqual(await ids(w, ADM, `nguoiLap=${SALES_B}&dichVu=ZA1&tu=${D4}&den=${D4}`), new Set([f4]), "AND bốn điều kiện");
  assert.deepEqual(await ids(w, ADM, `dichVu=ZA1&status=draft&tu=${D3}&den=${D3}`), new Set([a3, p3]));
  assert.deepEqual(await ids(w, ADM, "status=draft&q=0912345678"), new Set([a3, f4, p3]), "ô tìm vẫn chạy cùng bộ lọc");
});

test("lọc KHÔNG nới phạm vi: Đối tác / Thực tập lọc người lập khác → rỗng; HDV lọc người lập khác chỉ trong đơn mình phụ trách", async () => {
  const { w, f4, p3 } = await duLieu();
  assert.deepEqual(await ids(w, PARTNER, `nguoiLap=${SALES}`), new Set(), "Đối tác không thấy đơn An lập dù lọc đúng tên An");
  assert.deepEqual(await ids(w, PARTNER, `tu=${D3}&den=${D6}`), new Set([p3]), "Đối tác lọc ngày chỉ trong đơn mình");
  assert.deepEqual(await ids(w, INTERN, `nguoiLap=${SALES_B}`), new Set(), "Thực tập không lập đơn nào → rỗng");
  assert.deepEqual(await ids(w, FIELD, `nguoiLap=${SALES_B}`), new Set([f4]), "HDV: chỉ đơn mình phụ trách, không lòi đơn khác của Bình");
  assert.deepEqual(await ids(w, FIELD, "dichVu=ZA1"), new Set([f4]));
  assert.deepEqual(await ids(w, SALES_B, `nguoiLap=${SALES}&dichVu=ZA2`), new Set([(await ids(w, ADM, "dichVu=ZA2")).values().next().value]), "Bán hàng xem mọi đơn — lọc người khác được");
});

test("lọc: tham số sai → 400 câu tiếng Việt; tài khoản không xem đơn → 403 ĐỨNG TRƯỚC 400", async () => {
  const w = setup();
  const sai: [string, RegExp][] = [
    ["tu=2026-02-30", /Ngày đi/],
    [`tu=${D6}&den=${D3}`, /Từ ngày/],
    ["status=xong", /Trạng thái/],
    ["dichVu=" + encodeURIComponent("a b"), /Mã dịch vụ/],
    ["nguoiLap=" + encodeURIComponent("x' OR 1=1"), /Người lập/],
    [Array.from({ length: 21 }, (_, i) => `dichVu=M${i}`).join("&"), /tối đa 20/],
  ];
  for (const [qs, re] of sai) {
    const r = await w.call("GET", `/api/orders?${qs}`, { as: SALES });
    assert.equal(r.status, 400, `${qs}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
    assert.match(r.json.error.message, re, qs);
    const t = await w.call("GET", `/api/orders?${qs}`, { as: DRIVER });
    assert.equal(t.status, 403, `tài xế ${qs}: ${t.text}`);
  }
});
