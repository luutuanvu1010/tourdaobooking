// Góp ý YC-0013 (24/10): bộ lọc «Chưa có người phụ trách» ở danh sách đơn — `GET /api/orders?phuTrach=chua`.
// Cùng nghĩa với ô «Chưa phụ trách» của Trang chủ: đơn NHÁP hoặc ĐÃ XÁC NHẬN chưa có người phụ trách đang mở; tập «đang có người» hỏi qua
// `ctx.ordersWithHandler` (gốc lắp ráp nối vào dispatch — orders không đọc dữ liệu phân công). Chỉ người xem MỌI đơn (cùng ba ô của Trang chủ) dùng được.
// Khung gieo chép từ src/modules/billing/nhap-ke-toan.test.ts (khuôn ADR-0060 điều 5: tập ứng viên → hàm tiêm → lọc + phân trang).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoLyDoHuy } from "../../../tests/audit/huy-don.mjs";

const ID = {
  SALES: "10000000-0000-4000-8000-000000000001",
  ACC: "10000000-0000-4000-8000-000000000002",
  ADMIN: "10000000-0000-4000-8000-000000000003",
  HDV: "10000000-0000-4000-8000-000000000004",
  PARTNER: "10000000-0000-4000-8000-000000000005",
  SA: "10000000-0000-4000-8000-000000000006",
  INTERN: "10000000-0000-4000-8000-000000000007",
  DRIVER: "10000000-0000-4000-8000-000000000008",
  SP: "10000000-0000-4000-8000-000000000009", // lai SALES + PARTNER
  PF: "10000000-0000-4000-8000-00000000000a", // lai PARTNER + FIELD
  ADMACC: "10000000-0000-4000-8000-00000000000b", // lai ADMIN + ACCOUNTING
  HDV2: "10000000-0000-4000-8000-00000000000c",
};
const AT = "2026-09-01T00:00:00.000Z";

function dung() {
  const w = world();
  const s = (id: string, phone: string, name: string, perms: string[]) => seedStaff(w.sqlite, { id, phone, name, perms });
  s(ID.SALES, "0900000001", "Bán Hàng", ["SALES"]);
  s(ID.ACC, "0900000002", "Kế Toán", ["ACCOUNTING"]);
  s(ID.ADMIN, "0900000003", "Quản Trị", ["ADMIN"]);
  s(ID.HDV, "0900000004", "Nam HDV", ["FIELD"]);
  s(ID.PARTNER, "0900000005", "Đối Tác", ["PARTNER"]);
  s(ID.SA, "0900000006", "Toàn Quyền", ["SUPER_ADMIN"]);
  s(ID.INTERN, "0900000007", "Thực Tập", ["INTERN"]);
  s(ID.DRIVER, "0900000008", "Tài Xế", ["DRIVER"]);
  s(ID.SP, "0900000009", "Lai Bán Đối", ["SALES", "PARTNER"]);
  s(ID.PF, "0900000010", "Lai Đối HDV", ["PARTNER", "FIELD"]);
  s(ID.ADMACC, "0900000011", "Lai QT KT", ["ADMIN", "ACCOUNTING"]);
  s(ID.HDV2, "0900000012", "HDV Hai", ["FIELD"]);
  return w;
}

let dem = 0;
/** Đơn thẳng bằng SQL: `owner` = người lập, một dịch vụ ngày `ngay`, trạng thái `status`; `hdv` = người phụ trách đang mở (tuỳ chọn). */
function donMoi(w: any, o: { owner: string; ngay: string; status?: "draft" | "confirmed" | "cancelled"; hdv?: string; created?: string }): string {
  dem++;
  const id = `20000000-0000-4000-8000-${String(dem).padStart(12, "0")}`;
  const created = o.created ?? new Date(Date.parse(AT) + dem * 1000).toISOString();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 100000, 100000, 100000, ?, ?)`).run(id, `TD-NK${dem}`, o.owner, created, created);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, ?)`).run(`sv-${id}`, id, o.ngay);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 100000, 100000)`)
    .run(`it-${id}`, id, `sv-${id}`);
  if (o.status === "cancelled") gieoLyDoHuy(w.sqlite, id);
  if (o.status && o.status !== "draft") w.sqlite.prepare(`UPDATE orders SET status = ?, confirmed_at = ?, updated_at = ? WHERE id = ?`).run(o.status, created, created, id);
  if (o.hdv) {
    w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(`a-${id}`, id, `pty-${o.hdv}`, AT, AT, AT);
  }
  return id;
}

const ds = (w: any, as: string, qs: string) => w.call("GET", `/api/orders?${qs}`, { as });
const ids = (r: any): string[] => r.json.orders.map((o: any) => o.id).sort();

test("YC-0013: phuTrach=chua chỉ trả đơn nháp / đã xác nhận CHƯA có người phụ trách; không đơn huỷ, không đơn đã có người", async () => {
  const w = dung();
  const nhapTrong = donMoi(w, { owner: ID.SALES, ngay: "2026-11-01" });
  const xnTrong = donMoi(w, { owner: ID.SALES, ngay: "2026-11-02", status: "confirmed" });
  donMoi(w, { owner: ID.SALES, ngay: "2026-11-03", status: "confirmed", hdv: ID.HDV });
  donMoi(w, { owner: ID.SALES, ngay: "2026-11-04", status: "cancelled" });
  for (const as of [ID.ACC, ID.SALES, ID.ADMIN, ID.SA]) {
    const r = await ds(w, as, "phuTrach=chua");
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.deepEqual(ids(r), [nhapTrong, xnTrong].sort(), as);
  }
});

test("YC-0013: kết hợp với trạng thái — chỉ đã xác nhận; chọn riêng «Đã huỷ» thì rỗng", async () => {
  const w = dung();
  donMoi(w, { owner: ID.SALES, ngay: "2026-11-01" });
  const xn = donMoi(w, { owner: ID.SALES, ngay: "2026-11-02", status: "confirmed" });
  donMoi(w, { owner: ID.SALES, ngay: "2026-11-04", status: "cancelled" });
  assert.deepEqual(ids(await ds(w, ID.ACC, "phuTrach=chua&status=confirmed")), [xn]);
  assert.deepEqual(ids(await ds(w, ID.ACC, "phuTrach=chua&status=cancelled")), []);
});

test("YC-0013: kết hợp với khoảng ngày đi và với lọc nhập kế toán", async () => {
  const w = dung();
  const a = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed" });
  const b = donMoi(w, { owner: ID.SALES, ngay: "2026-10-06", status: "confirmed" });
  donMoi(w, { owner: ID.SALES, ngay: "2026-12-30", status: "confirmed" });
  donMoi(w, { owner: ID.SALES, ngay: "2026-10-07", status: "confirmed", hdv: ID.HDV }); // trong khoảng nhưng đã có người
  assert.deepEqual(ids(await ds(w, ID.ACC, "phuTrach=chua&tu=2026-10-01&den=2026-10-31")), [a, b].sort());
  const dau = await w.call("POST", `/api/orders/${a}/nhap-ke-toan`, { as: ID.ACC, body: { daNhap: true, soHoaDon: "HD-1", truocDo: null } });
  assert.equal(dau.status, 200, dau.text);
  assert.deepEqual(ids(await ds(w, ID.ACC, "phuTrach=chua&nhapKeToan=chua&tu=2026-10-01&den=2026-10-31")), [b]);
});

test("YC-0013: người không xem được MỌI đơn (HDV, Thực tập, Đối tác, lai Đối tác + HDV) dùng tham số → 403 — lai Bán hàng + Đối tác xem mọi đơn như Trang chủ nên được; giá trị lạ → 400", async () => {
  const w = dung();
  for (const as of [ID.HDV, ID.INTERN, ID.PARTNER, ID.PF]) assert.equal((await ds(w, as, "phuTrach=chua")).status, 403, as);
  assert.equal((await ds(w, ID.SP, "phuTrach=chua")).status, 200, "lai Bán hàng + Đối tác: cùng ba ô của Trang chủ");
  assert.equal((await ds(w, ID.ACC, "phuTrach=co")).status, 400);
});

test("YC-0013: phân trang trên tập ĐÃ LỌC (limit/offset/hasMore đúng, mới lập trước)", async () => {
  const w = dung();
  const tat: string[] = [];
  for (let i = 0; i < 5; i++) tat.push(donMoi(w, { owner: ID.SALES, ngay: "2026-11-05", status: "confirmed", ...(i === 2 ? { hdv: ID.HDV } : {}) }));
  const moiTruoc = [...tat].reverse().filter((x) => x !== tat[2]);
  const t1 = await ds(w, ID.ACC, "phuTrach=chua&limit=2");
  assert.deepEqual(t1.json.orders.map((o: any) => o.id), moiTruoc.slice(0, 2));
  assert.equal(t1.json.hasMore, true);
  const t2 = await ds(w, ID.ACC, "phuTrach=chua&limit=2&offset=2");
  assert.deepEqual(t2.json.orders.map((o: any) => o.id), moiTruoc.slice(2, 4));
  assert.equal(t2.json.hasMore, false);
});

test("YC-0013 bài canh trần: đúng LOC_NHAP_TOI_DA_UNG_VIEN đơn → lọc được; thêm một đơn → 400 «chọn thêm khoảng ngày đi» (không cắt lặng lẽ)", async () => {
  const { LOC_NHAP_TOI_DA_UNG_VIEN } = await import("../../shared/nhap-ke-toan.ts");
  const w = dung();
  const insO = w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1, 1, 1, ?, ?)`);
  const insS = w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, '2026-10-05')`);
  w.sqlite.exec("BEGIN");
  for (let i = 0; i < LOC_NHAP_TOI_DA_UNG_VIEN; i++) {
    const id = `40000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    insO.run(id, `TD-CAP${i}`, ID.SALES, AT, AT);
    insS.run(`svc-${id}`, id);
  }
  w.sqlite.exec("COMMIT");
  const ok = await ds(w, ID.ACC, "phuTrach=chua&limit=5");
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.orders.length, 5);
  assert.equal(ok.json.hasMore, true);
  donMoi(w, { owner: ID.SALES, ngay: "2026-10-05" });
  const vuot = await ds(w, ID.ACC, "phuTrach=chua&limit=5");
  assert.equal(vuot.status, 400, vuot.text);
  assert.match(vuot.json.error.message, /chọn thêm khoảng ngày đi/);
});
