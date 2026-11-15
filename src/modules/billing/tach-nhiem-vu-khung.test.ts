// ADR-0187 Đ3 mức (a) «đánh dấu, không chặn» — hành vi qua ROUTE THẬT trên khung thử (tests/audit/harness.mjs: cả ứng dụng + SQLite, migration 0150 áp thật).
// Tiêu chí nghiệm thu ở docs/superpowers/specs/2026-11-08-tach-nhiem-vu-muc-a-design.md §5: dấu tự điền ở nhật ký (insertStatement) và phiếu sổ (?10 + người lập);
// luồng thường của Bán hàng không dấu; «Đã soát» chỉ người KHÁC người ghi có ledger.write (403 tu_soat / 201 / 409 / 404); trigger CSDL kiểm lại; danh sách và số đếm. Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666";
const HDV = "22222222-2222-4222-8222-222222222222";
const LAI_KT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // kiêm Bán hàng + Kế toán: vừa lập đơn vừa ghi tiền
const AT = "2026-09-01T00:00:00.000Z";
const vnNgay = (d: number) => new Date(Date.now() + 7 * 3600_000 + d * 86400_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [SA, "0900000006", "Toàn Quyền", ["SUPER_ADMIN"]],
    [DT, "0900000007", "Đối Tác", ["PARTNER"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [LAI_KT, "0900000010", "Kiêm Bán Kế", ["SALES", "ACCOUNTING"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN của `owner`; `hdv` = người phụ trách đang mở (cần cho «Đã giao»). */
function donDaXacNhan(w: W, owner: string, total = 2_000_000, hdv?: string, ngayDi = vnNgay(30)): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, owner, total, total, total, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, ngayDi);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, total, total);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  gieoBanChup(w.sqlite, id); // 0112: thiếu bản chụp mức thì trigger chặn «Đã giao»
  if (hdv) w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${hdv}`, AT, AT, AT);
  return id;
}
const danhDau = (w: W, as: string, id: string) => w.call("POST", `/api/orders/${id}/nhap-ke-toan`, { as, body: { daNhap: true, soHoaDon: `HD-${++seq}`, truocDo: null } });
const thu = (w: W, as: string, orderId: string, soTien: number) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu: "toi" } });
const huy = (w: W, as: string, orderId: string) => w.call("POST", `/api/orders/${orderId}/status`, { as, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
const soat = (w: W, as: string, auditId: string) => w.call("POST", `/api/ledger/tu-ghi/${auditId}/da-soat`, { as });
const rows = <T,>(xs: unknown[]): T[] => xs.map((x) => ({ ...(x as object) }) as T);
const nhatKy = (w: W, orderId: string, action: string) => rows<{ id: string; staff_id: string; dau: number | null }>(w.q(`SELECT id, staff_id, tu_ghi_don_minh_lap AS dau FROM audit_log WHERE order_id = ? AND action = ? ORDER BY created_at`, orderId, action));
const phieu = (w: W, orderId: string) => w.q(`SELECT kind_code AS kind, created_by, tu_ghi_don_minh_lap AS dau FROM bil_posting WHERE order_id = ? ORDER BY created_at`, orderId) as { kind: string; created_by: string; dau: number | null }[];

test("tiêu chí 1–2: Kế toán kiêm Bán hàng đánh dấu nhập kế toán cho ĐƠN MÌNH LẬP → 200 kèm cờ, dòng nhật ký mang dấu; Kế toán khác làm cho đơn người khác → không cờ, không dấu", async () => {
  const w = setup();
  const minh = donDaXacNhan(w, LAI_KT);
  const r = await danhDau(w, LAI_KT, minh);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.tuGhiDonMinhLap, true, "thân phản hồi mang cờ");
  assert.deepEqual(nhatKy(w, minh, "order_accounting_entry_marked").map((x) => x.dau), [1], "nhật ký mang dấu (insertStatement tự điền)");

  const khac = donDaXacNhan(w, SALES);
  const r2 = await danhDau(w, KT, khac);
  assert.equal(r2.status, 200, r2.text);
  assert.equal("tuGhiDonMinhLap" in r2.json, false, "không gửi cờ false — thân cũ không đổi");
  assert.deepEqual(nhatKy(w, khac, "order_accounting_entry_marked").map((x) => x.dau), [null]);

  // Kế toán kiêm làm cho đơn NGƯỜI KHÁC lập → cũng không dấu (dấu theo người lập, không theo mã quyền)
  const khac2 = donDaXacNhan(w, SALES);
  const r3 = await danhDau(w, LAI_KT, khac2);
  assert.equal(r3.status, 200, r3.text);
  assert.equal("tuGhiDonMinhLap" in r3.json, false);
  assert.deepEqual(nhatKy(w, khac2, "order_accounting_entry_marked").map((x) => x.dau), [null]);
});

test("tiêu chí 3 (phiếu sổ): luồng thu thường của người lập KHÔNG dấu; thu lên đơn đã huỷ (việc của ô ledger.write) do chính người lập ghi → phiếu mang dấu, nhật ký payment_recorded không dấu (đặc tả §3)", async () => {
  const w = setup();
  const id = donDaXacNhan(w, LAI_KT);
  const a = await thu(w, LAI_KT, id, 500_000);
  assert.equal(a.status, 201, a.text);
  assert.equal("tuGhiDonMinhLap" in a.json, false, "thu bình thường (payment.receive) không phải việc của nhóm ghi tiền");
  assert.deepEqual(phieu(w, id).map((p) => [p.kind, p.dau]), [["RECEIPT", null]]);
  assert.equal((await huy(w, LAI_KT, id)).status, 200);
  const b = await thu(w, LAI_KT, id, 100_000);
  assert.equal(b.status, 201, b.text);
  assert.equal(b.json.tuGhiDonMinhLap, true);
  const ps = phieu(w, id);
  assert.deepEqual(ps.filter((p) => p.kind === "RECEIPT").map((p) => p.dau), [null, 1], "phiếu thứ hai mang dấu, phiếu đầu không");
  assert.deepEqual(nhatKy(w, id, "payment_recorded").map((x) => x.dau), [null, null], "payment_recorded không thuộc HANH_DONG_GHI_TIEN");
  // Kế toán KHÁC thu lên đơn huỷ của người khác → không dấu
  const id2 = donDaXacNhan(w, SALES);
  assert.equal((await huy(w, SALES, id2)).status, 200);
  const c = await thu(w, KT, id2, 100_000);
  assert.equal(c.status, 201, c.text);
  assert.deepEqual(phieu(w, id2).map((p) => p.dau), [null]);
});

test("tiêu chí 4–6: «Đã soát» — chính người ghi 403 tu_soat; Bán hàng / Đối tác 403; Kế toán khác 201 + nhật ký; soát lại 409; id lạ hoặc dòng không dấu 404; trigger CSDL kiểm lại", async () => {
  const w = setup();
  const id = donDaXacNhan(w, LAI_KT);
  assert.equal((await danhDau(w, LAI_KT, id)).status, 200);
  const [dong] = nhatKy(w, id, "order_accounting_entry_marked");
  assert.ok(dong && dong.dau === 1);

  const tu = await soat(w, LAI_KT, dong.id);
  assert.equal(tu.status, 403, tu.text);
  assert.equal(tu.json.error.code, "tu_soat");
  assert.equal((await soat(w, SALES, dong.id)).status, 403, "không có ledger.write");
  assert.equal((await soat(w, DT, dong.id)).status, 403, "Đối tác");
  assert.equal((await soat(w, SA, "99999999-9999-4999-8999-ffffffffffff")).status, 404, "id lạ");
  const [khongDau] = w.q(`SELECT id FROM audit_log WHERE tu_ghi_don_minh_lap IS NULL LIMIT 1`) as { id: string }[];
  assert.ok(khongDau, "phải có dòng nhật ký không dấu để thử");
  assert.equal((await soat(w, KT, khongDau!.id)).status, 404, "dòng nhật ký không dấu → 404");
  assert.equal(w.q(`SELECT count(*) AS n FROM bil_soat_tu_ghi`)[0].n, 0, "chưa dòng soát nào");

  const ok = await soat(w, KT, dong.id);
  assert.equal(ok.status, 201, ok.text);
  assert.equal(ok.headers.get("location"), `/order?id=${id}`);
  assert.deepEqual(rows(w.q(`SELECT soat_boi, order_id FROM bil_soat_tu_ghi`)), [{ soat_boi: KT, order_id: id }]);
  const nk = rows(w.q(`SELECT staff_id, target_id, tu_ghi_don_minh_lap AS dau FROM audit_log WHERE action = 'ledger_self_write_reviewed'`));
  assert.deepEqual(nk, [{ staff_id: KT, target_id: dong.id, dau: null }], "nhật ký soát trỏ về dòng gốc, bản thân không mang dấu");
  const lai = await soat(w, SA, dong.id);
  assert.equal(lai.status, 409, lai.text);
  assert.equal(lai.json.error.code, "da_soat");

  // Trigger 0150 (lớp CSDL, Hiến chương 5.1): chèn thẳng dòng soát sai luật phải bị chặn
  const id2 = donDaXacNhan(w, LAI_KT);
  assert.equal((await danhDau(w, LAI_KT, id2)).status, 200);
  const [dong2] = nhatKy(w, id2, "order_accounting_entry_marked");
  const chen = (auditId: string, boi: string) => w.sqlite.prepare(`INSERT INTO bil_soat_tu_ghi (audit_id, order_id, soat_boi, soat_luc, created_at, created_by, updated_at, updated_by) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`).run(auditId, boi, AT, AT, boi, AT, boi);
  assert.throws(() => chen(dong2!.id, LAI_KT), /bil_soat_tu_ghi_khac_nguoi/, "chính người ghi");
  const [khongDau2] = w.q(`SELECT id FROM audit_log WHERE tu_ghi_don_minh_lap IS NULL LIMIT 1`) as { id: string }[];
  assert.throws(() => chen(khongDau2!.id, KT), /bil_soat_tu_ghi_khac_nguoi/, "dòng không dấu");
  assert.throws(() => w.sqlite.prepare(`UPDATE bil_soat_tu_ghi SET soat_boi = ? WHERE audit_id = ?`).run(SA, dong.id), /bil_append_only/);
  assert.throws(() => w.sqlite.prepare(`DELETE FROM bil_soat_tu_ghi WHERE audit_id = ?`).run(dong.id), /bil_append_only/);
  assert.throws(() => w.sqlite.prepare(`UPDATE audit_log SET tu_ghi_don_minh_lap = 0 WHERE id = ?`).run(dong2!.id), /CHECK|append|constraint/i, "cột dấu chỉ nhận 1 hoặc NULL");
});

test("tiêu chí 7: danh sách và số đếm — Kế toán / Toàn quyền xem; Bán hàng, Đối tác 403; dòng đã soát mang tên người soát; soChuaSoat khớp", async () => {
  const w = setup();
  const a = donDaXacNhan(w, LAI_KT);
  const b = donDaXacNhan(w, LAI_KT);
  assert.equal((await danhDau(w, LAI_KT, a)).status, 200);
  assert.equal((await danhDau(w, LAI_KT, b)).status, 200);
  const [dongA] = nhatKy(w, a, "order_accounting_entry_marked");
  assert.equal((await soat(w, KT, dongA!.id)).status, 201);

  for (const as of [SALES, DT]) {
    assert.equal((await w.call("GET", "/api/ledger/tu-ghi", { as })).status, 403, as);
    assert.equal((await w.call("GET", "/api/ledger/tu-ghi/dem", { as })).status, 403, as);
  }
  const ds = await w.call("GET", "/api/ledger/tu-ghi", { as: SA });
  assert.equal(ds.status, 200, ds.text);
  assert.equal(ds.json.soChuaSoat, 1);
  assert.equal(ds.json.dong.length, 2);
  const [chua, roi] = ds.json.dong;
  assert.equal(chua.orderId, b, "chưa soát xếp trước");
  assert.deepEqual([chua.nguoiGhi, chua.nguoiGhiId, chua.hanhDong, chua.nguoiSoat, chua.soatLuc], ["Kiêm Bán Kế", LAI_KT, "Đánh dấu đã nhập phần mềm kế toán", null, null]);
  assert.equal(roi.orderId, a);
  assert.equal(roi.nguoiSoat, "Lan Kế Toán");
  assert.ok(roi.soatLuc);
  assert.ok(chua.maDon.startsWith("TD-"));
  for (const d of ds.json.dong) assert.deepEqual(Object.keys(d).sort(), ["auditId", "hanhDong", "luc", "maDon", "nguoiGhi", "nguoiGhiId", "nguoiSoat", "orderId", "soatLuc"], "không số tiền, không SĐT");
  const dem = await w.call("GET", "/api/ledger/tu-ghi/dem", { as: KT });
  assert.equal(dem.status, 200);
  assert.deepEqual(dem.json, { chuaSoat: 1 });
  // Kế toán kiêm cũng xem được danh sách (có ledger.view) — chỉ không tự soát dòng của mình
  assert.equal((await w.call("GET", "/api/ledger/tu-ghi", { as: LAI_KT })).status, 200);
});

test("tiêu chí 2 (đường chính — bổ sung theo kiểm độc lập 8/11): Kế toán kiêm Bán hàng bấm Hoàn thành cho ĐƠN MÌNH LẬP → cờ, nhật ký order_completed và phiếu COMPLETED mang dấu; phiếu thu (payment.receive) không dấu", async () => {
  const w = setup();
  const id = donDaXacNhan(w, LAI_KT, 1_000_000, HDV, vnNgay(-1)); // ngày đi hôm qua: «Đã giao» bấm được
  // Khách chuyển khoản về công ty — người có ledger.write khai phải kèm mã giao dịch (C1); đây vẫn là ô payment.receive ⇒ không dấu
  const a = await w.call("POST", `/api/orders/${id}/payments`, { as: LAI_KT, body: { soTien: 1_000_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: "FTTNV0001", soThucChuyen: 1_000_000 } });
  assert.equal(a.status, 201, a.text);
  assert.equal("tuGhiDonMinhLap" in a.json, false);
  const giao = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
  assert.equal(giao.status, 200, giao.text);
  const ht = await w.call("POST", `/api/orders/${id}/completed`, { as: LAI_KT });
  assert.equal(ht.status, 200, ht.text);
  assert.equal(ht.json.tuGhiDonMinhLap, true, "thân Hoàn thành mang cờ");
  assert.deepEqual(nhatKy(w, id, "order_completed").map((x) => x.dau), [1], "nhật ký Hoàn thành mang dấu");
  const ps = phieu(w, id);
  assert.deepEqual(ps.filter((p) => p.kind === "COMPLETED").map((p) => p.dau), [1], "phiếu Hoàn thành mang dấu (giữ `ghiTien` của hoanThanh và ?11 của POSTING_IF_COMPLETED_AT)");
  assert.deepEqual(ps.filter((p) => p.kind !== "COMPLETED").map((p) => p.dau), ps.filter((p) => p.kind !== "COMPLETED").map(() => null), "phiếu của luồng thu / giao không dấu");
  const ds = await w.call("GET", "/api/ledger/tu-ghi", { as: KT });
  assert.deepEqual(ds.json.dong.filter((d: { orderId: string }) => d.orderId === id).map((d: { hanhDong: string }) => d.hanhDong), ["Hoàn thành"]);

  // Cùng luồng do Kế toán KHÁC làm cho đơn của Bán hàng (Bán hàng khai CK → chờ xác nhận → Kế toán xác nhận) → không dấu ở đâu
  const id2 = donDaXacNhan(w, SALES, 1_000_000, HDV, vnNgay(-1)); // ngày đi hôm qua: «Đã giao» bấm được
  assert.equal((await w.call("POST", `/api/orders/${id2}/payments`, { as: SALES, body: { soTien: 1_000_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" } })).status, 201);
  const so2 = await w.call("GET", "/api/ledger", { as: KT });
  const xn = await w.call("POST", `/api/ledger/company-receipts/${so2.json.choXacNhan[0].receiptId}/confirm`, { as: KT, body: { maGiaoDich: "FTTNV0002", soThucChuyen: 1_000_000 } });
  assert.equal(xn.status, 200, xn.text);
  assert.equal("tuGhiDonMinhLap" in xn.json, false);
  assert.equal((await w.call("POST", `/api/orders/${id2}/delivered`, { as: HDV, body: {} })).status, 200);
  const ht2 = await w.call("POST", `/api/orders/${id2}/completed`, { as: KT });
  assert.equal(ht2.status, 200, ht2.text);
  assert.equal("tuGhiDonMinhLap" in ht2.json, false);
  assert.ok(phieu(w, id2).every((p) => p.dau === null));
  assert.deepEqual(nhatKy(w, id2, "order_completed").map((x) => x.dau), [null]);
  assert.deepEqual(nhatKy(w, id2, "ledger_company_received").map((x) => x.dau), [null]);
});

test("tiêu chí 2b (lai Kế toán + Đối tác — bổ sung theo kiểm độc lập 8/11): ba route tu-ghi* từ chối tài khoản lai giữ Đối tác dù có ledger.view/ledger.write", async () => {
  const w = setup();
  const LAI_DT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  seedStaff(w.sqlite, { id: LAI_DT, phone: "0900000011", name: "Kiêm Kế Đối", perms: ["ACCOUNTING", "PARTNER"] });
  const id = donDaXacNhan(w, LAI_KT);
  assert.equal((await danhDau(w, LAI_KT, id)).status, 200);
  const [dong] = nhatKy(w, id, "order_accounting_entry_marked");
  for (const [m, p] of [["GET", "/api/ledger/tu-ghi"], ["GET", "/api/ledger/tu-ghi/dem"], ["POST", `/api/ledger/tu-ghi/${dong!.id}/da-soat`]] as const) {
    const r = await w.call(m, p, { as: LAI_DT });
    assert.equal(r.status, 403, `${m} ${p}: ${r.text}`);
  }
  assert.equal(w.q(`SELECT count(*) AS n FROM bil_soat_tu_ghi`)[0].n, 0);
});
