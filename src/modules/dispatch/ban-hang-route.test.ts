// ADR-0142 Task 5 — bài Node (SQLite thật, cả ứng dụng) cho các ca mà e2e KHÔNG làm được vì cần thời gian trôi: lời mời đã HẾT ưu tiên (gieo thẳng dòng có hạn trong quá khứ — bảng cho chèn, chỉ cấm
// sửa), thẻ cảnh báo (hạ mốc phát hành về 2020 bằng cách gỡ trigger CHỈ trong cơ sở dữ liệu thử), tự mời chính mình, ý định mời trên nháp (vắng giữ, null xoá, sai 400).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, B, H, LAI, PARTNER, SUP, datCo, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const pty = (id: string) => `pty-${id}`;
const Y = "11111111-1111-4111-8111-333333333333";
const goi = (w: any, id: string, as: string, duong: string, body: unknown = {}) => w.call("POST", `/api/orders/${id}/${duong}`, { as, body });
const loiMoi = (w: any, id: string) => w.q("SELECT outcome o, closed_at c FROM dsp_sales_invite WHERE order_id = ? ORDER BY recorded_at, rowid", id).map((r: any) => ({ o: r.o, c: r.c }));
const chuO = (w: any, id: string) => w.q("SELECT party_id p FROM dsp_sales_owner WHERE order_id = ? AND valid_to_at IS NULL", id)[0]?.p ?? null;
const moi = (w: any, id: string, x: string, hanPhut: number) => {
  const luc = new Date().toISOString();
  w.sqlite.prepare("INSERT INTO dsp_sales_invite (id, order_id, invitee_party_id, invited_by, recorded_at, priority_until_at, created_at, created_by, updated_at, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(crypto.randomUUID(), id, pty(x), A, luc, new Date(Date.now() + hanPhut * 60_000).toISOString(), luc, A, luc, A);
};
async function xacNhan(w: any, as = A, extra: Record<string, unknown> = {}) {
  const o = await lap(w, as, [svc("ZB1", inDays(3))], extra);
  assert.equal((await goi(w, o.id, as, "status", { status: "confirmed" })).status, 200);
  return o;
}
function themY(w: any) {
  // một Bán hàng thứ ba (khung dựng sẵn chỉ có A, B); dùng cùng cách seedStaff
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-${Y}', 'PERSON', 'Yên', 1, '2026-01-01', '2026-01-01')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('pty-${Y}', 'Yên', '2026-01-01', '2026-01-01')`);
  w.sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${Y}', '', '0900000010', 'x', 'sales', 1, '2026-01-01', 'pty-${Y}')`);
  w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${Y}-SALES', '${Y}', 'SALES', '2026-01-01', '2026-01-01', '2026-01-01')`);
}

test("lời mời đã HẾT ưu tiên: Bán hàng khác Nhận được (NGUOI_KHAC), X Nhận vẫn được (NHAN); trong ưu tiên Bán hàng khác 409 dang_cho_nguoi_khac", async () => {
  const w = setup();
  themY(w);
  const o1 = await xacNhan(w);
  moi(w, o1.id, B, -5); // hạn đã qua
  const r1 = await goi(w, o1.id, Y, "ban-hang/nhan");
  assert.equal(r1.status, 200, r1.text);
  assert.equal(chuO(w, o1.id), pty(Y));
  assert.deepEqual(loiMoi(w, o1.id).map((x: any) => x.o), ["NGUOI_KHAC"]);
  const o2 = await xacNhan(w);
  moi(w, o2.id, B, -5);
  assert.equal((await goi(w, o2.id, B, "ban-hang/nhan")).status, 200);
  assert.deepEqual(loiMoi(w, o2.id).map((x: any) => x.o), ["NHAN"]);
  const o3 = await xacNhan(w);
  moi(w, o3.id, B, +10);
  const r3 = await goi(w, o3.id, Y, "ban-hang/nhan");
  assert.equal(r3.status, 409, r3.text);
  assert.equal(r3.json.error.code, "dang_cho_nguoi_khac");
  assert.match(r3.json.error.message, /Đơn đang chờ .+ trả lời, còn \d+ phút\./);
  assert.equal(chuO(w, o3.id), null);
});

test("tài khoản lai Còn vé trên đơn chờ có lời mời đã hết ưu tiên: đơn xác nhận, KHÔNG ô, lời mời giữ nguyên mở (R4); Bán hàng thường Còn vé cùng ca → có ô + NGUOI_KHAC", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const tao = async () => {
    const o = await lap(w, A, [svc("ZA1", inDays(3))]);
    assert.equal((await goi(w, o.id, A, "gui-xac-nhan")).status, 201);
    moi(w, o.id, B, -5);
    return o;
  };
  const quyet = (id: string, as: string) => {
    const yc = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0].id;
    return goi(w, id, as, "quyet-dinh", { ketQua: "CON_VE", yeuCauId: yc, updatedAt: w.q("SELECT updated_at u FROM orders WHERE id = ?", id)[0].u });
  };
  const lai = await tao();
  const r = await quyet(lai.id, LAI);
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT status s FROM orders WHERE id = ?", lai.id)[0].s, "confirmed");
  assert.equal(chuO(w, lai.id), null, "lai không giữ ô");
  assert.deepEqual(loiMoi(w, lai.id), [{ o: null, c: null }], "lời mời giữ nguyên");
  const nhanLai = await goi(w, lai.id, LAI, "ban-hang/nhan");
  assert.equal(nhanLai.status, 403, "lai không Nhận được");
  const thuong = await tao();
  assert.equal((await quyet(thuong.id, ADM)).status, 200);
  assert.equal(chuO(w, thuong.id), pty(ADM));
  assert.deepEqual(loiMoi(w, thuong.id).map((x: any) => x.o), ["NGUOI_KHAC"]);
});

test("tự mời chính mình: đơn không cần kiểm → thành Bán hàng phụ trách ngay, không có lời mời; đơn cần kiểm → lời mời mở, tự quyết (công tắc BẬT) → ô + NHAN", async () => {
  const w = setup();
  const a = await xacNhan(w, A, { banHangMoiStaffId: A });
  assert.equal(chuO(w, a.id), pty(A));
  assert.deepEqual(loiMoi(w, a.id), []);
  datCo(w, "SERVICE", "ZA1", true);
  const o = await lap(w, A, [svc("ZA1", inDays(3))], { banHangMoiStaffId: A });
  assert.equal((await goi(w, o.id, A, "gui-xac-nhan")).status, 201);
  assert.deepEqual(loiMoi(w, o.id), [{ o: null, c: null }]);
  const yc = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", o.id)[0].id;
  const r = await goi(w, o.id, A, "quyet-dinh", { ketQua: "CON_VE", yeuCauId: yc, updatedAt: w.q("SELECT updated_at u FROM orders WHERE id = ?", o.id)[0].u });
  assert.equal(r.status, 200, r.text);
  assert.equal(chuO(w, o.id), pty(A));
  assert.deepEqual(loiMoi(w, o.id).map((x: any) => x.o), ["NHAN"]);
});

test("ý định mời trên nháp: vắng khoá GIỮ, null XOÁ, mã sai 400 và không lưu; người lập thấy banHangMoi", async () => {
  const w = setup();
  const o = await lap(w, A, [svc("ZB1", inDays(3))], { banHangMoiStaffId: B });
  const doc = async () => (await w.call("GET", `/api/orders/${o.id}`, { as: A })).json;
  assert.equal((await doc()).banHangMoi.staffId, B);
  const luu = async (extra: Record<string, unknown>) => {
    const d = await doc();
    return w.call("PUT", `/api/orders/${o.id}`, { as: A, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], expectedUpdatedAt: d.order.updatedAt, ...extra } });
  };
  assert.equal((await luu({})).status, 200);
  assert.equal((await doc()).banHangMoi.staffId, B, "vắng khoá ⇒ giữ");
  const sai = await luu({ banHangMoiStaffId: ACC });
  assert.deepEqual([sai.status, sai.json.error.code], [400, "invalid_invitee"]);
  assert.equal((await doc()).banHangMoi.staffId, B, "mã sai ⇒ không lưu");
  assert.equal((await luu({ banHangMoiStaffId: null })).status, 200);
  assert.equal((await doc()).banHangMoi, null, "null ⇒ xoá");
  assert.equal((await luu({ banHangMoiStaffId: SUP })).status, 400, "Toàn quyền không giữ Bán hàng ⇒ không mời được");
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: B })).status, 404, "nháp của người lập: X không thấy");
});

test("thẻ cảnh báo «chưa có Bán hàng phụ trách»: ai thấy gì; đơn có ô, đơn cũ, đơn huỷ không vào thẻ; Kế toán chỉ thấy SỐ đơn chờ xác nhận", async () => {
  const w = setup();
  // hạ mốc phát hành về 2020 (CHỈ cơ sở dữ liệu thử: gỡ trigger chống sửa) để đơn thử "đã quá 15 phút" vào thẻ
  w.sqlite.exec("DROP TRIGGER dsp_sales_policy_no_update; UPDATE dsp_sales_policy SET created_at = '2020-01-01T00:00:00.000Z' WHERE id = 'gieo-ban-hang'");
  const xa = await xacNhan(w);
  const co = await xacNhan(w);
  w.sqlite.prepare("INSERT INTO dsp_sales_owner (id, order_id, party_id, valid_from_at, created_at, updated_at) VALUES ('so1', ?, ?, '2026-01-01', '2026-01-01', '2026-01-01')").run(co.id, pty(B));
  const huy = await xacNhan(w);
  assert.equal((await goi(w, huy.id, ADM, "status", { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 200);
  const cu = await xacNhan(w);
  w.sqlite.prepare("UPDATE orders SET confirmed_at = '2019-01-01T00:00:00.000Z' WHERE id = ?").run(cu.id);
  for (const id of [xa.id, co.id, huy.id]) w.sqlite.prepare("UPDATE orders SET confirmed_at = '2026-01-01T00:00:00.000Z' WHERE id = ?").run(id);
  datCo(w, "SERVICE", "ZA1", true);
  const cho = await lap(w, A, [svc("ZA1", inDays(3))]);
  assert.equal((await goi(w, cho.id, A, "gui-xac-nhan")).status, 201);
  for (const t of ["closed_final", "immutable", "close_complete", "ticket_rule"]) w.sqlite.exec(`DROP TRIGGER ord_confirm_request_${t}`); // CHỈ cơ sở dữ liệu thử: lùi giờ gửi để đơn chờ "đã quá 15 phút"
  w.sqlite.prepare("UPDATE ord_confirm_request SET submitted_at = '2026-01-01T00:00:00.000Z' WHERE order_id = ?").run(cho.id);
  const the = async (as: string) => (await w.call("GET", "/api/orders/chua-co-ban-hang", { as })).json;
  for (const as of [B, ADM, SUP]) {
    const t = await the(as);
    assert.deepEqual(t.don.map((d: any) => d.orderId).sort(), [xa.id, cho.id].sort(), `${as} thấy đơn đã xác nhận chưa có Bán hàng + đơn chờ`);
    assert.equal(t.soDonChoXacNhanAn, 0);
  }
  const ke = await the(ACC);
  assert.deepEqual(ke.don.map((d: any) => d.orderId), [xa.id], "Kế toán: đơn đã xác nhận thì đủ, đơn chờ chỉ là số");
  assert.equal(ke.soDonChoXacNhanAn, 1);
  assert.ok(!JSON.stringify(ke).includes(cho.id) && !JSON.stringify(ke).includes("Khách Thử"), "không lộ mã đơn chờ / tên khách");
  const ngoai = await w.call("GET", "/api/orders/chua-co-ban-hang", { as: H });
  assert.equal(ngoai.status, 403, "HDV không có thẻ");
  const doiTac = await the(PARTNER);
  assert.deepEqual(doiTac.don, [], "Đối tác không lập đơn nào ⇒ thẻ rỗng");
  const rieng = await the(A);
  assert.equal(rieng.don.every((d: any) => d.laCuaToi), true, "người lập thấy đơn của mình");
});

test("Nhận / Đổi / Từ chối: cổng quyền và trạng thái (403 Kế toán, HDV, Thực tập; 404 đơn lạ; Đổi nháp 409 don_nhap; Từ chối khi không được mời 409)", async () => {
  const w = setup();
  const o = await xacNhan(w);
  for (const as of [ACC, H]) assert.equal((await goi(w, o.id, as, "ban-hang/nhan")).status, 403, `${as} Nhận`);
  assert.equal((await goi(w, "00000000-0000-4000-8000-000000000000", B, "ban-hang/nhan")).status, 404);
  assert.equal((await goi(w, o.id, B, "ban-hang/tu-choi")).status, 409, "không có lời mời");
  assert.equal((await w.call("PUT", `/api/orders/${o.id}/ban-hang`, { as: B, body: { staffId: B } })).status, 403, "Bán hàng không Đổi");
  assert.equal((await w.call("PUT", `/api/orders/${o.id}/ban-hang`, { as: ADM, body: {} })).status, 400, "thiếu staffId");
  assert.equal((await w.call("PUT", `/api/orders/${o.id}/ban-hang`, { as: ADM, body: { staffId: ACC } })).status, 400, "Kế toán không làm Bán hàng phụ trách");
  const nhap = await lap(w, A, [svc("ZB1", inDays(3))]);
  assert.equal((await w.call("PUT", `/api/orders/${nhap.id}/ban-hang`, { as: ADM, body: { staffId: B } })).status, 404, "nháp riêng tư của người khác ⇒ 404 (ADR-0135)");
  datCo(w, "SERVICE", "ZA1", true);
  const cho = await lap(w, A, [svc("ZA1", inDays(3))]);
  assert.equal((await goi(w, cho.id, A, "gui-xac-nhan")).status, 201);
  const dn = await w.call("PUT", `/api/orders/${cho.id}/ban-hang`, { as: ADM, body: { staffId: B } });
  assert.deepEqual([dn.status, dn.json.error.code], [409, "don_nhap"], "đơn nháp đang chờ xác nhận: Quản trị thấy được ⇒ 409");
  assert.equal((await goi(w, nhap.id, B, "ban-hang/nhan")).status, 404, "nháp của người khác không chờ ⇒ 404");
  assert.equal((await goi(w, cho.id, B, "ban-hang/nhan")).json.error.code, "can_quyet_dinh", "đơn chờ xác nhận ⇒ phải quyết Còn vé / Hết vé");
});

test("GET ban-hang: đơn nháp đang chờ xác nhận của người khác chỉ người xét đọc được; Kế toán, HDV, Đối tác nhận rỗng, không lộ tên", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const cho = await lap(w, A, [svc("ZA1", inDays(3))]);
  assert.equal((await goi(w, cho.id, A, "gui-xac-nhan")).status, 201);
  moi(w, cho.id, B, +10);
  const doc = (as: string) => w.call("GET", `/api/dispatch/ban-hang?orderIds=${cho.id}`, { as });
  for (const as of [ACC, H, PARTNER]) {
    const r = await doc(as);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json, {}, `${as}: không được thấy đơn chờ của người khác`);
  }
  for (const as of [B, ADM, SUP]) {
    const r = await doc(as);
    assert.equal(r.status, 200, r.text);
    assert.ok(r.json[cho.id], `${as}: người xét đọc được`);
  }
});
