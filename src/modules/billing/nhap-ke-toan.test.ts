// ADR-0060 — dấu "đã nhập phần mềm kế toán": route ghi / đọc (module billing), nhãn + bộ lọc ở danh sách đơn (module orders, qua hàm tiêm
// `ctx.nhapKeToanCuaDon`), lịch sử đơn lọc theo ô `accounting.entry.view`. Chạy CẢ ứng dụng thật trên SQLite (tests/audit/harness.mjs). Tên, SĐT GIẢ.
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
  if (o.status && o.status !== "draft") w.sqlite.prepare(`UPDATE orders SET status = ?, confirmed_at = ?, updated_at = ? WHERE id = ?`).run(o.status, created, created, id);
  if (o.hdv) {
    w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(`a-${id}`, id, `pty-${o.hdv}`, AT, AT, AT);
  }
  return id;
}

const danhDau = (w: any, as: string, id: string, body: Record<string, unknown>) => w.call("POST", `/api/orders/${id}/nhap-ke-toan`, { as, body });
const doc = (w: any, as: string, id: string) => w.call("GET", `/api/orders/${id}/nhap-ke-toan`, { as });
const soDong = (w: any, id: string) => w.q("SELECT count(*) AS n FROM bil_accounting_entry WHERE order_id = ?", id)[0].n as number;

test("ADR-0060 tiêu chí 2: chỉ Kế toán, Toàn quyền (và lai có Kế toán) ghi được; Quản trị, Bán hàng, HDV, Đối tác, Thực tập, Tài xế, lai SALES+PARTNER → 403", async () => {
  const w = dung();
  const id = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed", hdv: ID.HDV });
  for (const as of [ID.ADMIN, ID.SALES, ID.HDV, ID.PARTNER, ID.INTERN, ID.DRIVER, ID.SP, ID.PF]) {
    const r = await danhDau(w, as, id, { daNhap: true, soHoaDon: "HD-1", truocDo: null });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.equal(soDong(w, id), 0);
  const r = await danhDau(w, ID.ADMACC, id, { daNhap: true, soHoaDon: "HD-000123", truocDo: null });
  assert.equal(r.status, 200, r.text);
  const g = await doc(w, ID.SA, id);
  const r2 = await danhDau(w, ID.SA, id, { daNhap: true, soHoaDon: "HD-000124", truocDo: g.json.hienTai.id });
  assert.equal(r2.status, 200, r2.text);
  assert.equal(soDong(w, id), 2);
});

test("ADR-0060 tiêu chí 1 + A-13 + Q-2: ai thấy dấu ở chi tiết (GET) — Đối tác một mình 403; lai SALES+PARTNER thấy; HDV đơn đang phụ trách thấy, đơn khác 404; Thực tập đơn mình", async () => {
  const w = dung();
  const cuaDoiTac = donMoi(w, { owner: ID.PARTNER, ngay: "2026-10-05", status: "confirmed" });
  const cuaThucTap = donMoi(w, { owner: ID.INTERN, ngay: "2026-10-05", status: "confirmed" });
  const hdvPhuTrach = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed", hdv: ID.HDV });
  const pfPhuTrach = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed", hdv: ID.PF });
  const cuaSP = donMoi(w, { owner: ID.SP, ngay: "2026-10-05", status: "confirmed" });
  for (const id of [cuaDoiTac, cuaThucTap, hdvPhuTrach, pfPhuTrach, cuaSP]) {
    assert.equal((await danhDau(w, ID.ACC, id, { daNhap: true, soHoaDon: "HD-000123", truocDo: null })).status, 200);
  }
  // Đối tác một mình: đơn CỦA MÌNH vẫn 403 (ô xem none).
  assert.equal((await doc(w, ID.PARTNER, cuaDoiTac)).status, 403);
  // Lai SALES + PARTNER: ô SALES any cho qua — thấy (chấp nhận có chủ ý).
  const sp = await doc(w, ID.SP, cuaSP);
  assert.equal(sp.status, 200, sp.text);
  assert.equal(sp.json.hienTai.soHoaDon, "HD-000123");
  assert.equal(sp.json.truocDo, null, "không có ô ghi → không thấy các dòng trước (A-7)");
  // HDV: đơn đang phụ trách thấy; đơn không phụ trách 404 (như /payments).
  assert.equal((await doc(w, ID.HDV, hdvPhuTrach)).status, 200);
  assert.equal((await doc(w, ID.HDV, cuaDoiTac)).status, 404);
  // Lai PARTNER + FIELD: theo ô FIELD assigned — đơn đang phụ trách thấy; đơn không phụ trách (dù là của Đối tác khác) không.
  assert.equal((await doc(w, ID.PF, pfPhuTrach)).status, 200);
  assert.equal((await doc(w, ID.PF, hdvPhuTrach)).status, 403);
  // Thực tập: đơn mình lập thấy; đơn người khác 403.
  assert.equal((await doc(w, ID.INTERN, cuaThucTap)).status, 200);
  assert.equal((await doc(w, ID.INTERN, hdvPhuTrach)).status, 403);
  // Tài xế: không qua cổng đơn.
  assert.equal((await doc(w, ID.DRIVER, hdvPhuTrach)).status, 403);
  // Văn phòng any.
  for (const as of [ID.SALES, ID.ADMIN, ID.ACC, ID.SA]) assert.equal((await doc(w, as, cuaDoiTac)).status, 200, as);
});

test("ADR-0060 tiêu chí 3 + A-4 + A-7: bỏ dấu không lý do → 400; có lý do → dòng mới, dấu mất, dòng cũ còn (Kế toán xem được, Bán hàng không)", async () => {
  const w = dung();
  const id = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed" });
  const r1 = await danhDau(w, ID.ACC, id, { daNhap: true, soHoaDon: "HD-000123", truocDo: null });
  assert.equal(r1.status, 200);
  const hien = (await doc(w, ID.ACC, id)).json.hienTai;
  assert.equal(hien.daNhap, true);
  assert.equal(hien.nguoiBam, "Kế Toán");
  const khongLyDo = await danhDau(w, ID.ACC, id, { daNhap: false, truocDo: hien.id });
  assert.equal(khongLyDo.status, 400);
  assert.match(khongLyDo.json.error.message, /phải ghi lý do/);
  const coSo = await danhDau(w, ID.ACC, id, { daNhap: false, lyDo: "x", soHoaDon: "HD-9", truocDo: hien.id });
  assert.equal(coSo.status, 400);
  const bo = await danhDau(w, ID.ACC, id, { daNhap: false, lyDo: "nhập nhầm đơn", truocDo: hien.id });
  assert.equal(bo.status, 200, bo.text);
  const sau = (await doc(w, ID.ACC, id)).json;
  assert.equal(sau.hienTai.daNhap, false);
  assert.equal(sau.hienTai.lyDo, "nhập nhầm đơn");
  assert.equal(sau.truocDo.length, 1);
  assert.equal(sau.truocDo[0].soHoaDon, "HD-000123");
  assert.equal((await doc(w, ID.SALES, id)).json.truocDo, null);
  assert.equal(soDong(w, id), 2);
  const nk = w.q("SELECT action, detail FROM audit_log WHERE order_id = ? AND action LIKE 'order_accounting_entry_%' ORDER BY rowid", id);
  assert.deepEqual(nk.map((r: any) => [r.action, r.detail]), [
    ["order_accounting_entry_marked", "Đã nhập phần mềm kế toán · HD-000123"],
    ["order_accounting_entry_unmarked", "Bỏ đánh dấu đã nhập phần mềm kế toán — lý do: nhập nhầm đơn"],
  ]);
});

test("ADR-0060 A-3: đơn nháp / đã huỷ → đánh dấu 409 (không dòng); bỏ dấu đơn đã huỷ được; gửi trùng trạng thái → 200 không thêm dòng", async () => {
  const w = dung();
  const nhap = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05" });
  const r = await danhDau(w, ID.ACC, nhap, { daNhap: true, truocDo: null });
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "order_not_confirmed");
  assert.equal(soDong(w, nhap), 0);
  const id = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed" });
  assert.equal((await danhDau(w, ID.ACC, id, { daNhap: true, soHoaDon: "HD-1", truocDo: null })).status, 200);
  const cur = (await doc(w, ID.ACC, id)).json.hienTai.id;
  const trung = await danhDau(w, ID.ACC, id, { daNhap: true, soHoaDon: "HD-1", truocDo: cur });
  assert.equal(trung.status, 200);
  assert.equal(trung.json.doi, false);
  assert.equal(soDong(w, id), 1);
  gieoLyDoHuy(w.sqlite, id);
  w.sqlite.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?").run(AT, id);
  assert.equal((await danhDau(w, ID.ACC, id, { daNhap: true, soHoaDon: "HD-2", truocDo: cur })).status, 409);
  const bo = await danhDau(w, ID.ACC, id, { daNhap: false, lyDo: "đơn đã huỷ", truocDo: cur });
  assert.equal(bo.status, 200, bo.text);
  assert.equal(soDong(w, id), 2);
});

test("ADR-0060 tiêu chí 6: sau 'Đã giao' và sau 'Hoàn thành', Kế toán vẫn đánh dấu / sửa số được (route billing, không thuộc NT-F7)", async () => {
  const w = dung();
  const id = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed" });
  w.sqlite.prepare(`UPDATE orders SET delivered_at = ?, delivered_by = ?, updated_at = ? WHERE id = ?`).run(AT, ID.SA, AT, id);
  const r1 = await danhDau(w, ID.ACC, id, { daNhap: true, soHoaDon: "HD-1", truocDo: null });
  assert.equal(r1.status, 200, r1.text);
  w.sqlite.prepare(`UPDATE orders SET completed_at = ?, completed_by = ?, updated_at = ? WHERE id = ?`).run(AT, ID.ACC, AT, id);
  const cur = (await doc(w, ID.ACC, id)).json.hienTai.id;
  const r2 = await danhDau(w, ID.ACC, id, { daNhap: true, soHoaDon: "HD-2", truocDo: cur });
  assert.equal(r2.status, 200, r2.text);
  assert.equal((await doc(w, ID.ACC, id)).json.hienTai.soHoaDon, "HD-2");
});

test("ADR-0060: khoá lạc quan — truocDo lệch → 409 stale; ĐUA (người khác ghi ngay trước lô) → một bên 409, không dòng thừa, không nhật ký thừa", async () => {
  const w = dung();
  const id = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed" });
  assert.equal((await danhDau(w, ID.ACC, id, { daNhap: true, soHoaDon: "HD-1", truocDo: null })).status, 200);
  const cu = await danhDau(w, ID.SA, id, { daNhap: true, soHoaDon: "HD-2", truocDo: null });
  assert.equal(cu.status, 409);
  assert.equal(cu.json.error.code, "stale");
  const cur = (await doc(w, ID.ACC, id)).json.hienTai.id;
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: unknown[]) => {
    w.env.DB.batch = goc;
    w.sqlite.prepare(`INSERT INTO bil_accounting_entry (id, order_id, entered, invoice_number, reason, created_at, created_by, updated_at, updated_by)
      VALUES ('30000000-0000-4000-8000-000000000001', ?, 1, 'HD-KHAC', NULL, ?, ?, ?, ?)`).run(id, AT, ID.SA, AT, ID.SA);
    return goc(stmts);
  };
  const thua = await danhDau(w, ID.ACC, id, { daNhap: true, soHoaDon: "HD-3", truocDo: cur });
  assert.equal(thua.status, 409, thua.text);
  assert.equal(thua.json.error.code, "stale");
  assert.equal(soDong(w, id), 2);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND detail LIKE '%HD-3%'", id)[0].n, 0);
});

test("ADR-0060 điều 3 (ii): lịch sử đơn bỏ dòng order_accounting_entry_* với người không qua ô xem — Đối tác một mình không thấy; lai SALES+PARTNER, Quản trị thấy", async () => {
  const w = dung();
  const cuaDoiTac = donMoi(w, { owner: ID.PARTNER, ngay: "2026-10-05", status: "confirmed" });
  const cuaSP = donMoi(w, { owner: ID.SP, ngay: "2026-10-05", status: "confirmed" });
  for (const id of [cuaDoiTac, cuaSP]) assert.equal((await danhDau(w, ID.ACC, id, { daNhap: true, soHoaDon: "HD-000123", truocDo: null })).status, 200);
  const coDong = (r: any) => r.json.history.some((e: any) => e.action.startsWith("order_accounting_entry_"));
  const p = await w.call("GET", `/api/orders/${cuaDoiTac}`, { as: ID.PARTNER });
  assert.equal(p.status, 200, p.text);
  assert.equal(coDong(p), false, "Đối tác một mình không thấy dòng kế toán trong lịch sử");
  assert.doesNotMatch(p.text, /HD-000123|phần mềm kế toán/);
  const sp = await w.call("GET", `/api/orders/${cuaSP}`, { as: ID.SP });
  assert.equal(coDong(sp), true);
  const s = await w.call("GET", `/api/orders/${cuaDoiTac}`, { as: ID.ADMIN }); // Bán hàng chỉ thấy lịch sử đơn mình (order.history.view ownOrAssigned)
  const dong = s.json.history.find((e: any) => e.action === "order_accounting_entry_marked");
  assert.equal(dong.detail, "Đã nhập phần mềm kế toán · HD-000123");
});

test("ADR-0060 A-12: nhãn trên thẻ danh sách — chỉ đơn đang đã nhập và người xem qua ô xem; Đối tác một mình VẮNG khoá; HDV chỉ đơn phụ trách", async () => {
  const w = dung();
  const cuaDoiTac = donMoi(w, { owner: ID.PARTNER, ngay: "2026-10-05", status: "confirmed" });
  const hdv = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed", hdv: ID.PF });
  const chuaNhap = donMoi(w, { owner: ID.PARTNER, ngay: "2026-10-05", status: "confirmed" });
  for (const id of [cuaDoiTac, hdv]) assert.equal((await danhDau(w, ID.ACC, id, { daNhap: true, truocDo: null })).status, 200);
  const nhan = async (as: string) => {
    const r = await w.call("GET", "/api/orders", { as });
    assert.equal(r.status, 200, r.text);
    return Object.fromEntries(r.json.orders.map((o: any) => [o.id, "nhapKeToan" in o ? o.nhapKeToan : "VANG"]));
  };
  const sales = await nhan(ID.SALES);
  assert.equal(sales[cuaDoiTac], true);
  assert.equal(sales[hdv], true);
  assert.equal(sales[chuaNhap], "VANG");
  const partner = await nhan(ID.PARTNER);
  assert.equal(partner[cuaDoiTac], "VANG", "Đối tác một mình: vắng khoá (không gửi false)");
  // Lai PARTNER + FIELD: đơn mình lập (ô PARTNER own — none cho dấu) vắng; đơn đang phụ trách (ô FIELD assigned) có nhãn.
  const pf = await nhan(ID.PF);
  assert.equal(pf[hdv], true);
});

test("ADR-0060 tiêu chí 5 + A-6: lọc nhapKeToan — thiếu khoảng ngày → 400; > 92 ngày → 400; HDV/Thực tập/Đối tác gửi tham số → 403 (TRƯỚC 400); chua/da đúng; phạm vi không đổi", async () => {
  const w = dung();
  const a = donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed" });
  const b = donMoi(w, { owner: ID.SALES, ngay: "2026-10-06", status: "confirmed" });
  const ngoai = donMoi(w, { owner: ID.SALES, ngay: "2026-12-30", status: "confirmed" });
  assert.equal((await danhDau(w, ID.ACC, a, { daNhap: true, soHoaDon: "HD-1", truocDo: null })).status, 200);
  const ds = (as: string, qs: string) => w.call("GET", `/api/orders?${qs}`, { as });
  for (const qs of ["nhapKeToan=chua", "nhapKeToan=chua&tu=2026-10-01", "nhapKeToan=chua&den=2026-10-31"]) {
    const r = await ds(ID.ACC, qs);
    assert.equal(r.status, 400, qs);
  }
  assert.equal((await ds(ID.ACC, "nhapKeToan=chua&tu=2026-10-01&den=2026-12-31")).status, 200, "đúng 92 ngày (tính cả hai đầu) được");
  assert.equal((await ds(ID.ACC, "nhapKeToan=chua&tu=2026-10-01&den=2027-01-01")).status, 400, "93 ngày bị chặn");
  assert.equal((await ds(ID.ACC, "nhapKeToan=khac&tu=2026-10-01&den=2026-10-31")).status, 400);
  for (const as of [ID.HDV, ID.INTERN, ID.PARTNER, ID.PF]) assert.equal((await ds(as, "nhapKeToan=chua")).status, 403, as);
  const chua = await ds(ID.ACC, "nhapKeToan=chua&tu=2026-10-01&den=2026-10-31");
  assert.deepEqual(chua.json.orders.map((o: any) => o.id), [b]);
  const da = await ds(ID.SALES, "nhapKeToan=da&tu=2026-10-01&den=2026-10-31");
  assert.deepEqual(da.json.orders.map((o: any) => o.id), [a]);
  assert.equal(da.json.orders[0].nhapKeToan, true);
  const tatCa = await ds(ID.ACC, "nhapKeToan=chua&tu=2026-10-01&den=2026-12-31");
  assert.deepEqual(tatCa.json.orders.map((o: any) => o.id).sort(), [b, ngoai].sort());
  // Bỏ dấu có lý do → quay lại "chưa nhập" (e2e mô tả ở ADR).
  const cur = (await doc(w, ID.ACC, a)).json.hienTai.id;
  assert.equal((await danhDau(w, ID.ACC, a, { daNhap: false, lyDo: "nhầm", truocDo: cur })).status, 200);
  const lai = await ds(ID.ACC, "nhapKeToan=chua&tu=2026-10-01&den=2026-10-31");
  assert.deepEqual(lai.json.orders.map((o: any) => o.id).sort(), [a, b].sort());
});

test("ADR-0060: phân trang trên tập ĐÃ LỌC (limit/offset/hasMore đúng, thứ tự mới lập trước)", async () => {
  const w = dung();
  const ids: string[] = [];
  for (let i = 0; i < 5; i++) ids.push(donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed" }));
  assert.equal((await danhDau(w, ID.ACC, ids[2]!, { daNhap: true, truocDo: null })).status, 200);
  const moiTruoc = [...ids].reverse().filter((x) => x !== ids[2]);
  const t1 = await w.call("GET", "/api/orders?nhapKeToan=chua&tu=2026-10-01&den=2026-10-31&limit=2", { as: ID.ACC });
  assert.deepEqual(t1.json.orders.map((o: any) => o.id), moiTruoc.slice(0, 2));
  assert.equal(t1.json.hasMore, true);
  const t2 = await w.call("GET", "/api/orders?nhapKeToan=chua&tu=2026-10-01&den=2026-10-31&limit=2&offset=2", { as: ID.ACC });
  assert.deepEqual(t2.json.orders.map((o: any) => o.id), moiTruoc.slice(2, 4));
  assert.equal(t2.json.hasMore, false);
});

test("ADR-0060 bài canh cỡ tập ứng viên: đúng LOC_NHAP_TOI_DA_UNG_VIEN đơn trong khoảng → lọc được; thêm một đơn → 400 'thu hẹp khoảng ngày' (không cắt lặng lẽ)", async () => {
  const { LOC_NHAP_TOI_DA_UNG_VIEN } = await import("../../shared/nhap-ke-toan.ts");
  const w = dung();
  const insO = w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1, 1, 1, ?, ?)`);
  const insS = w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, '2026-10-05')`);
  const insI = w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, 1, 1)`);
  w.sqlite.exec("BEGIN");
  for (let i = 0; i < LOC_NHAP_TOI_DA_UNG_VIEN; i++) {
    const id = `40000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    insO.run(id, `TD-CAP${i}`, ID.SALES, AT, AT);
    insS.run(`svc-${id}`, id);
    insI.run(`it-${id}`, id, `svc-${id}`);
  }
  // ADR-0135: Kế toán không thấy đơn nháp của người khác → cả tập ứng viên là đơn đã xác nhận.
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id LIKE '40000000-%'").run(AT);
  w.sqlite.exec("COMMIT");
  const qs = "/api/orders?nhapKeToan=chua&tu=2026-10-01&den=2026-10-31&limit=5";
  const ok = await w.call("GET", qs, { as: ID.ACC });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.orders.length, 5);
  assert.equal(ok.json.hasMore, true);
  donMoi(w, { owner: ID.SALES, ngay: "2026-10-05", status: "confirmed" });
  const vuot = await w.call("GET", qs, { as: ID.ACC });
  assert.equal(vuot.status, 400, vuot.text);
  assert.match(vuot.json.error.message, /thu hẹp khoảng ngày/);
});
