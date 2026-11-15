// ADR-0175 Đ2.6, Đ3.8 (kế hoạch vé Tour Đảo Task 8): tách chặn huỷ theo mục đích. Qua ứng dụng THẬT (khung thử xac-nhan-khung, SQLite tạm). Tên, SĐT là GIẢ.
//   • Văn phòng huỷ đơn Trả sau còn nợ: chỉ vé HÃNG NGOÀI đã mở mới chặn (ADR-0168 Đ3 mục 3 bỏ vé Tour Đảo — huỷ thì vé chết, hết nợ, không mất gì).
//   • Tài khoản giữ quyền Đối tác: vé đã mở loại nào cũng chặn tự huỷ / tự sửa số khách (ADR-0170 Đ3, ADR-0171 Đ1 giữ nguyên).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { A, H, LAI, PARTNER, SUP, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const AT = "2026-10-01T00:00:00.000Z";
const DT = "88888888-8888-4888-8888-888888888801"; // bên đặt có hạn mức Trả sau
const BEN = `pty-${DT}`;
const PF = "88888888-8888-4888-8888-888888888889"; // Đối tác + Hướng dẫn viên (tài khoản lai)
const CAU_CHAN_DOI_TAC = "Đơn đã mở vé nên bạn không tự huỷ được. Liên hệ văn phòng.";
type Nguon = "HANG_NGOAI" | "TOUR_DAO";

type W = ReturnType<typeof setup>;
function dung(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: PF, phone: "0900000018", name: "Lai PF", perms: ["PARTNER", "FIELD"] });
  return w;
}
const hanMuc = (w: W) => w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: 5_000_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } });
/** Đơn Trả sau đã xác nhận (còn nợ 600.000) của BEN, do A lập. */
async function donTS(w: W): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: "CREDIT", services: [svc("ZB1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const x = await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: A, body: { status: "confirmed" } });
  assert.equal(x.status, 200, x.text);
  return r.json.order.id as string;
}
/** Đơn do tài khoản Đối tác lập (Gửi đơn, nhánh xác nhận thẳng). */
async function donDoiTac(w: W): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as: PARTNER, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", inDays(3))] } });
  assert.equal(r.status, 201, r.text);
  const x = await w.call("POST", `/api/orders/${r.json.order.id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(x.status, 200, x.text);
  assert.equal(trangThai(w, r.json.order.id), "confirmed");
  return r.json.order.id as string;
}
const svcId = (w: W, orderId: string): string => w.q("SELECT id FROM order_service WHERE order_id = ?", orderId)[0].id;
let n = 0;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
/** Gieo một vé đang giữ cho đơn, thuộc lô nguồn `nguon`; `mo` = đã đóng dấu lộ. Trả mã vé (dòng vdt_ticket). */
function gieoVe(w: W, orderId: string, nguon: Nguon, mo: boolean): string {
  const k = ++n;
  const code = w.q("SELECT catalog_code AS c FROM order_service WHERE order_id = ?", orderId)[0].c;
  w.sqlite.prepare("INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, source, created_at, updated_at) VALUES (?, ?, 'ADULT', 'Vé thử', 'ACTIVE', ?, ?, ?)").run(`lo-${k}`, code, nguon, AT, AT);
  w.sqlite.prepare(
    `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, stored_at, status, created_at, updated_at)
     VALUES (?, ?, ?, '2026-01-01', '2099-12-31', ?, 'image/png', 10, ?, ?, 'AVAILABLE', ?, ?)`,
  ).run(`ve-${k}`, `lo-${k}`, nguon === "TOUR_DAO" ? `TD1.${B32[k % 32]!.repeat(25)}${B32[(k * 7) % 32]}` : `BI.MAT.${k}`, `k-${k}`, `h-${k}`, AT, AT, AT);
  w.sqlite.prepare("UPDATE vdt_ticket SET status = 'ALLOCATED' WHERE id = ?").run(`ve-${k}`);
  w.sqlite.prepare(
    `INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, revealed_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'ADULT', ?, ?, ?, ?, ?)`,
  ).run(`pb-${k}`, `ve-${k}`, orderId, svcId(w, orderId), k, AT, mo ? AT : null, AT, AT);
  return `ve-${k}`;
}
const trangThai = (w: W, id: string) => String(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status);
const trangThaiVe = (w: W, veId: string) => String(w.q("SELECT status FROM vdt_ticket WHERE id = ?", veId)[0].status);
const huy = (w: W, id: string, as: string) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });

test("văn phòng huỷ đơn Trả sau còn nợ, chỉ có vé Tour Đảo đã mở: 200, vé thành VOID (vé chết)", async () => {
  const w = dung();
  assert.equal((await hanMuc(w)).status, 201);
  const id = await donTS(w);
  const ve = gieoVe(w, id, "TOUR_DAO", true);
  const r = await huy(w, id, A);
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, id), "cancelled");
  assert.equal(trangThaiVe(w, ve), "VOID");
});

test("văn phòng huỷ đơn Trả sau còn nợ có vé hãng ngoài đã mở (kèm vé Tour Đảo): 409 tra_sau_con_no_da_mo_ve, đơn giữ nguyên", async () => {
  const w = dung();
  assert.equal((await hanMuc(w)).status, 201);
  const id = await donTS(w);
  gieoVe(w, id, "TOUR_DAO", true);
  gieoVe(w, id, "HANG_NGOAI", true);
  const r = await huy(w, id, A);
  assert.deepEqual([r.status, r.json.error?.code], [409, "tra_sau_con_no_da_mo_ve"], r.text);
  assert.equal(trangThai(w, id), "confirmed");
});

test("đường Hướng dẫn viên (handler-cancel): đơn Trả sau còn nợ chỉ có vé Tour Đảo đã mở huỷ được", async () => {
  const w = dung();
  assert.equal((await hanMuc(w)).status, 201);
  const id = await donTS(w);
  assert.equal((await w.call("PUT", `/api/orders/${id}/handler`, { as: A, body: { staffId: H } })).status, 200);
  gieoVe(w, id, "TOUR_DAO", true);
  const r = await w.call("POST", `/api/orders/${id}/handler-cancel`, { as: H, body: { reason: "customer_requested" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, id), "cancelled");
});

test("văn phòng huỷ đơn Trả sau còn nợ, vé Tour Đảo được mở chen giữa lúc kiểm và lúc ghi: lô vẫn qua (câu bảo vệ chỉ canh vé hãng ngoài)", async () => {
  const w = dung();
  assert.equal((await hanMuc(w)).status, 201);
  const id = await donTS(w);
  const ve = gieoVe(w, id, "TOUR_DAO", false);
  w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /ord_cancel_reason/.test(s.sql)), () => {
    w.sqlite.prepare("UPDATE vdt_allocation SET revealed_at = ? WHERE ticket_id = ?").run(AT, ve);
  });
  const r = await huy(w, id, A);
  assert.equal(r.status, 200, r.text);
  assert.equal(trangThai(w, id), "cancelled");
});

test("tài khoản Đối tác: đơn chỉ có vé Tour Đảo đã mở vẫn không tự huỷ được (cả /status và handler-cancel), không tự sửa số khách được", async () => {
  const w = dung();
  const id = await donDoiTac(w);
  gieoVe(w, id, "TOUR_DAO", true);
  const r = await huy(w, id, PARTNER);
  assert.deepEqual([r.status, r.json.error?.code, r.json.error?.message], [409, "don_da_mo_ve", CAU_CHAN_DOI_TAC], r.text);
  assert.equal(trangThai(w, id), "confirmed");
  // sửa số khách (cổng văn phòng): tài khoản lai Bán hàng + Đối tác, đơn của chính nó (dữ liệu cũ, Bán hàng xác nhận thay — ADR-0185)
  const rl = await w.call("POST", "/api/orders", { as: LAI, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", inDays(3))] } });
  assert.equal(rl.status, 201, rl.text);
  const idl = rl.json.order.id as string;
  assert.equal((await w.xacNhanDonCu(idl, LAI, A)).status, 200);
  gieoVe(w, idl, "TOUR_DAO", true);
  const sua = await w.call("POST", `/api/orders/${idl}/money-edit`, { as: LAI, body: { lyDo: "BOT_NGUOI", services: [{ id: svcId(w, idl), pax: { adult: 1, child: 0, senior: 0, infant: 0 } }] } });
  assert.equal(sua.status, 409, sua.text);
  assert.equal(sua.json.error.code, "don_da_mo_ve");
  // đường Hướng dẫn viên: tài khoản lai Đối tác + Hướng dẫn viên đang phụ trách đơn văn phòng lập
  const r2 = await w.call("POST", "/api/orders", { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZA1", inDays(3))] } });
  const id2 = r2.json.order.id as string;
  assert.equal((await w.call("POST", `/api/orders/${id2}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  w.sqlite.prepare("INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?)").run(crypto.randomUUID(), id2, `pty-${PF}`, AT, AT, AT);
  gieoVe(w, id2, "TOUR_DAO", true);
  const h = await w.call("POST", `/api/orders/${id2}/handler-cancel`, { as: PF, body: { reason: "customer_requested" } });
  assert.deepEqual([h.status, h.json.error?.code], [409, "don_da_mo_ve"], h.text);
  assert.equal(trangThai(w, id2), "confirmed");
});
