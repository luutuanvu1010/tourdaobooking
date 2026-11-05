// ADR-0142 Đ7 qua ROUTE THẬT + SQLite thật (tests/audit/harness.mjs): lời mời → X (kể cả khi đơn còn NHÁP chờ xác nhận), X Nhận → người lập, X Từ chối → người lập, Đổi → người mới + người lập,
// Hoàn thành → Bán hàng phụ trách + người lập, và «yêu cầu xác nhận có X ⇒ chỉ X trong thời gian ưu tiên». Hộp thư đọc `v_dsp_sales_owner` / `v_dsp_sales_invite_open` qua câu LIST_DON.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ADM, B, SUP, datCo, inDays, lap, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const hop = async (w: any, as: string, ma: string) => (await w.call("GET", "/api/thong-bao?ngan=tat-ca", { as })).json.tin.filter((t: any) => t.maDon === ma);
const loai = (tin: any[]) => tin.map((t) => t.loai).sort();
const Y = "11111111-1111-4111-8111-333333333333";
function themY(w: any) { // Bán hàng thứ ba (khung dựng sẵn chỉ có A, B) — cùng cách ban-hang-route.test.ts
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-${Y}', 'PERSON', 'Yên', 1, '2026-01-01', '2026-01-01')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-${Y}', 'Yên', '2026-01-01', '2026-01-01')`);
  w.sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${Y}', '', '0900000010', 'x', 'sales', 1, '2026-01-01', 'pty-${Y}')`);
  w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${Y}-SALES', '${Y}', 'SALES', '2026-01-01', '2026-01-01', '2026-01-01')`);
}
const goi = (w: any, id: string, as: string, duong: string, body: unknown = {}) => w.call("POST", `/api/orders/${id}/${duong}`, { as, body });

test("đơn NHÁP gửi kiểm vé có mời B: B có tin lời mời VÀ tin chờ xác nhận; Quản trị / Toàn quyền KHÔNG có tin chờ trong thời gian ưu tiên; người lập không có tin nào của chính mình", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A, [svc("ZA1", inDays(3))], { banHangMoiStaffId: B });
  assert.equal((await goi(w, o.id, A, "gui-xac-nhan")).status, 201);
  const bTin = await hop(w, B, o.orderCode);
  assert.deepEqual(loai(bTin), ["cho_xac_nhan", "moi_ban_hang"], JSON.stringify(bTin));
  assert.equal(bTin.find((t: any) => t.loai === "moi_ban_hang").cau, `Đơn ${o.orderCode}: bạn được mời làm người phụ trách`);
  assert.equal(bTin.find((t: any) => t.loai === "moi_ban_hang").cuaToi, true);
  for (const as of [ADM, SUP, A]) assert.deepEqual(loai(await hop(w, as, o.orderCode)).filter((l) => l === "cho_xac_nhan" || l === "moi_ban_hang"), [], as);
});

test("đơn không cần kiểm có mời B: B có tin mời; B Nhận → người lập có tin «đã có người phụ trách», B không tự nhận tin; Quản trị Đổi sang Y → người mới + người lập có tin Đổi, B (người cũ) không", async () => {
  const w = setup();
  themY(w);
  const o = await lap(w, A, [svc("ZB1", inDays(3))], { banHangMoiStaffId: B });
  assert.equal((await goi(w, o.id, A, "status", { status: "confirmed" })).status, 200);
  assert.deepEqual(loai(await hop(w, B, o.orderCode)).filter((l) => l === "moi_ban_hang"), ["moi_ban_hang"]);
  assert.equal((await goi(w, o.id, B, "ban-hang/nhan")).status, 200);
  const a = await hop(w, A, o.orderCode);
  assert.ok(a.some((t: any) => t.loai === "ban_hang_nhan" && t.cuaToi && t.cau === `Đơn ${o.orderCode} đã có người phụ trách`), JSON.stringify(a));
  assert.ok(!(await hop(w, B, o.orderCode)).some((t: any) => t.loai === "ban_hang_nhan"));
  const doi = await w.call("PUT", `/api/orders/${o.id}/ban-hang`, { as: ADM, body: { staffId: Y } });
  assert.equal(doi.status, 200, doi.text);
  assert.ok((await hop(w, Y, o.orderCode)).some((t: any) => t.loai === "doi_ban_hang" && t.cuaToi), "người mới");
  assert.ok((await hop(w, A, o.orderCode)).some((t: any) => t.loai === "doi_ban_hang" && t.cuaToi), "người lập");
  assert.ok(!(await hop(w, B, o.orderCode)).some((t: any) => t.loai === "doi_ban_hang"), "người cũ không có dòng hộp thư");
});

test("B Từ chối lời mời: người lập có tin; Hoàn thành (dòng nhật ký order_completed) tới Bán hàng phụ trách + người lập, không tới người khác", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", inDays(3))], { banHangMoiStaffId: B });
  assert.equal((await goi(w, o.id, A, "status", { status: "confirmed" })).status, 200);
  assert.equal((await goi(w, o.id, B, "ban-hang/tu-choi")).status, 200);
  assert.ok((await hop(w, A, o.orderCode)).some((t: any) => t.loai === "ban_hang_tu_choi" && t.cuaToi));
  assert.ok(!(await hop(w, B, o.orderCode)).some((t: any) => t.loai === "ban_hang_tu_choi"));
  assert.equal((await goi(w, o.id, ADM, "ban-hang/nhan")).status, 200); // Quản trị nhận phụ trách (sau từ chối)
  // Hoàn thành thật cần giao + thu đủ; ở đây khoá ĐƯỜNG ĐỌC: dòng nhật ký `order_completed` do Kế toán ghi (khác người nhận).
  w.sqlite.prepare("INSERT INTO audit_log (id, order_id, staff_id, action, created_at) VALUES (?, ?, ?, 'order_completed', ?)").run(crypto.randomUUID(), o.id, "55555555-5555-4555-8555-555555555555", new Date().toISOString());
  for (const as of [A, ADM]) assert.ok((await hop(w, as, o.orderCode)).some((t: any) => t.loai === "hoan_thanh" && t.cuaToi && t.cau === `Đơn ${o.orderCode} đã Hoàn thành`), as);
  for (const as of [B, SUP]) assert.ok(!(await hop(w, as, o.orderCode)).some((t: any) => t.loai === "hoan_thanh"), as);
});
