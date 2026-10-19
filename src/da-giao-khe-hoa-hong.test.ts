// Bài canh khe «Đã giao không có hoa hồng» (BACKLOG mục 29, mã BL-HH-DA-GIAO-KHE; chủ quyết vá riêng 2026-10-13).
// Lỗi cũ: điều kiện câu «Đã giao» chỉ chặn khi bên đặt ĐANG mang vai nhóm bên ngoài. Đối tác đặt đơn → đơn xác nhận, bản chụp có người hưởng; sau đó vai bên ngoài
// của tài khoản đó bị kết thúc (đổi sang vai nhân viên bằng PUT /api/staff/:id/roles) → «Đã giao» lọt, sổ KHÔNG có dòng hoa hồng, rồi tiền đơn bị khoá.
// Cách vá (lượt 1, 2026-10-13): điều kiện chặn còn ghim vào BẢN CHỤP của chính đơn (bản hiện hành mang người hưởng) — vai đổi sau đó không gỡ được chỗ chặn.
// ĐẢO CÓ CHỦ ĐÍCH (sổ đại lý đợt 2, Task 4 — ADR-0079 điều 1–2, đặc tả P1): «Đã giao» nay MỞ cho đơn có người hưởng, và lô «Đã giao» GHI dòng hoa hồng cho người
// hưởng của BẢN CHỤP (không phải vai hiện tại của bên đặt). Khe cũ («Đã giao» mà sổ không có dòng hoa hồng) vẫn đóng, theo nghĩa mới: đơn có người hưởng đã «Đã giao»
// ⇒ sổ CÓ dòng HOA_HONG cho đúng người hưởng đã chụp; đơn thiếu mức / chưa chụp ⇒ vẫn 409 (`terms_missing`). Bài 0, 1, 2, 4, 7, 8 (nửa sau), 9 đổi kỳ vọng theo đó.
// Chạy trên khung thử thật (tests/audit/harness.mjs: cả ứng dụng + SQLite với đủ migration), không mạng, không đụng D1.
// Ghi nhận ĐÃ BIẾT, KHÔNG thuộc bài này (ADR-0077 điều 9): đổi bên đặt sang khách lẻ bằng PUT /booker làm máy chụp lại bản «không người hưởng» → «Đã giao» qua — thiết kế.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff, fakeD1 } from "../tests/audit/harness.mjs";
import { datGiaoStatement } from "./modules/orders/hoan-tat-repo.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const SUPER = "33333333-3333-4333-8333-333333333333";
const ADMIN = "55555555-5555-4555-8555-555555555555";
const HR = "77777777-7777-4777-8777-777777777777";
const PT = "66666666-6666-4666-8666-666666666666";
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

function setup(): W {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUPER, phone: "0900000003", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ADMIN, phone: "0900000006", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000007", name: "Nhân sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: PT, phone: "0900000008", name: "Đối tác Lan", perms: ["PARTNER"] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-66666666-6666-4666-8666-6666666666aa', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${PT}`, AT, AT);
  return w;
}
function nhap(w: W, booker: string | null, tong = 2_000_000): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, booker, AT, AT);
  const s = `${id}-s0`;
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'HONTAM', 'DV 0', 'perPax', 1, ?)`).run(s, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, ?, ?, ?)`).run(`${s}-i`, id, s, tong, tong, tong);
  return id;
}
async function datMuc(w: W, doiTuong: { loai: string; code: string }): Promise<void> {
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(m.status, 201, m.text);
}
async function xacNhan(w: W, id: string): Promise<void> {
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
}
/** Đơn của đối tác, ĐÃ xác nhận (bản chụp có người hưởng). `coMuc` = có đặt mức hoa hồng cho vai đại lý lữ hành trước khi xác nhận. */
async function donDoiTacDaXacNhan(w: W, coMuc = true): Promise<string> {
  if (coMuc) await datMuc(w, { loai: "VAI", code: "TRAVEL_AGENCY" });
  const id = nhap(w, `pty-${PT}`);
  await xacNhan(w, id);
  return id;
}
const thuDu = async (w: W, id: string): Promise<void> => {
  const t = await w.call("POST", `/api/orders/${id}/payments`, { as: SUPER, body: { soTien: 2_000_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(t.status, 201, t.text);
};
const daGiao = (w: W, id: string) => w.call("POST", `/api/orders/${id}/delivered`, { as: SUPER, body: {} });
const chup = (w: W, id: string): { commission_status: string; beneficiary_party_id: string | null }[] =>
  w.q("SELECT commission_status, beneficiary_party_id FROM ord_service_terms WHERE order_id = ?", id);
const doiVai = (w: W, actor: string, roles: string[]) => w.call("PUT", `/api/staff/${PT}/roles`, { as: actor, body: { roles } });
/** Dòng thương mại của phiếu «Đã giao» (kind, bên được nợ, số) — hoa hồng 10% × 2.000.000 = 200.000. */
const dongHoaHong = (w: W, id: string): [string, string, number][] =>
  w.q("SELECT l.kind_code, l.creditor_party_id, l.amount FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE l.order_id = ? AND p.kind_code = 'DELIVERED' ORDER BY l.rowid", id)
    .map((x: { kind_code: string; creditor_party_id: string; amount: number }) => [x.kind_code, x.creditor_party_id, x.amount]);

test("0 — đối chứng: vai bên ngoài còn mở, bản chụp có người hưởng đủ mức ⇒ «Đã giao» 200 và sổ có HOA_HONG cho người hưởng (ĐẢO CÓ CHỦ ĐÍCH — Task 4: trước là 409)", async () => {
  const w = setup();
  const id = await donDoiTacDaXacNhan(w);
  assert.equal(chup(w, id)[0]!.commission_status, "SET");
  await thuDu(w, id);
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(dongHoaHong(w, id), [["HOA_HONG", `pty-${PT}`, 200_000]]);
});

for (const [ten, actor] of [["Quản trị", ADMIN], ["Toàn quyền", SUPER], ["Nhân sự", HR]] as const) {
  test(`1 — ${ten} đổi tài khoản đối tác sang vai nhân viên bán hàng sau khi đơn đã chụp ⇒ «Đã giao» 200, hoa hồng vẫn về người hưởng ĐÃ CHỤP (ĐẢO CÓ CHỦ ĐÍCH — Task 4)`, async () => {
    const w = setup();
    const id = await donDoiTacDaXacNhan(w);
    const r = await doiVai(w, actor, ["SALES_STAFF"]);
    assert.equal(r.status, 200, r.text); // đường đổi vai là đường hợp lệ (không phải thứ phải chặn ở đây)
    assert.deepEqual(w.q("SELECT role_type_code FROM pty_party_role WHERE party_id = ? AND valid_to_date IS NULL", `pty-${PT}`).map((x: { role_type_code: string }) => x.role_type_code), ["SALES_STAFF"]);
    await thuDu(w, id);
    const g = await daGiao(w, id);
    assert.equal(g.status, 200, g.text);
    // Khe cũ (BL-HH-DA-GIAO-KHE) đóng theo nghĩa mới: «Đã giao» ⇒ sổ CÓ dòng hoa hồng; đổi vai sau khi chụp không đổi người hưởng (ghim ở bản chụp).
    assert.deepEqual(dongHoaHong(w, id), [["HOA_HONG", `pty-${PT}`, 200_000]], `KHE: «Đã giao» mà sổ không có dòng hoa hồng cho người hưởng đã chụp (${g.text})`);
  });
}

test("2 — đổi vai bên ngoài sang vai bên ngoài khác (đại lý → hướng dẫn viên tự do) ⇒ «Đã giao» 200, hoa hồng theo bản chụp (ĐẢO CÓ CHỦ ĐÍCH — Task 4: trước là 409)", async () => {
  const w = setup();
  const id = await donDoiTacDaXacNhan(w);
  const r = await doiVai(w, ADMIN, ["GUIDE_FREELANCE"]);
  assert.equal(r.status, 200, r.text);
  await thuDu(w, id);
  assert.equal((await daGiao(w, id)).status, 200);
  assert.deepEqual(dongHoaHong(w, id), [["HOA_HONG", `pty-${PT}`, 200_000]]);
});

test("3 — đối tác CHƯA có mức hoa hồng (bản chụp «thiếu mức» nhưng vẫn có người hưởng), vai đã đổi ⇒ vẫn 409 (không để lọt sổ thiếu dòng hoa hồng)", async () => {
  const w = setup();
  const id = await donDoiTacDaXacNhan(w, false);
  assert.equal(chup(w, id)[0]!.commission_status, "MISSING");
  assert.equal((await doiVai(w, ADMIN, ["SALES_STAFF"])).status, 200);
  await thuDu(w, id);
  const g = await daGiao(w, id);
  assert.equal(g.status, 409);
  assert.equal(g.json.error.message, "Thiếu mức hoa hồng / người bán cho DV 0 — Kế toán ghi mức tay cho dòng này.", "Task 4: câu lời thường của lý do terms_missing");
  assert.equal(w.q("SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id)[0].n, 0);
});

test("4 — loại đối tác nhóm OTHER (tương lai) có người hưởng: bản chụp SET ⇒ «Đã giao» 200 và HOA_HONG cho người hưởng đó dù không thuộc nhóm bên ngoài (ĐẢO CÓ CHỦ ĐÍCH — Task 4)", async () => {
  const w = setup();
  w.sqlite.exec(`INSERT INTO pty_role_type (code, name, sort_order, role_group, is_partner_label) VALUES ('NHAN_VIEN_SPA','Nhân viên spa',99,'OTHER',1)`);
  w.sqlite.exec(`INSERT INTO prc_beneficiary_role (role_type_code, active, created_at, updated_at) VALUES ('NHAN_VIEN_SPA',1,'${AT}','${AT}')`);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ?, 'NHAN_VIEN_SPA', '2026-01-01', ?, ?)").run(`pty-${SALES}`, AT, AT);
  await datMuc(w, { loai: "VAI", code: "NHAN_VIEN_SPA" });
  const id = nhap(w, `pty-${SALES}`);
  await xacNhan(w, id);
  assert.equal(chup(w, id)[0]!.commission_status, "SET");
  await thuDu(w, id);
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(dongHoaHong(w, id), [["HOA_HONG", `pty-${SALES}`, 200_000]], "KHE loại OTHER: sổ phải có dòng hoa hồng");
});

test("5 — không chặn quá tay: đơn KHÁCH LẺ (bản chụp «không người hưởng») đủ điều kiện ⇒ «Đã giao» 200", async () => {
  const w = setup();
  const id = nhap(w, null);
  await xacNhan(w, id);
  assert.equal(chup(w, id)[0]!.commission_status, "NONE");
  await thuDu(w, id);
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, g.text);
});

test("6 — đơn nội bộ bình thường (bên đặt là nhân viên bán hàng, không hoa hồng) ⇒ «Đã giao» 200, rồi «Hoàn thành» 200", async () => {
  const w = setup();
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', ?, 'SALES_STAFF', '2026-01-01', ?, ?)").run(`pty-${SALES}`, AT, AT);
  await datMuc(w, { loai: "VAI", code: "TRAVEL_AGENCY" }); // có bảng mức nhưng bên đặt nội bộ không được hưởng
  const id = nhap(w, `pty-${SALES}`);
  await xacNhan(w, id);
  assert.equal(chup(w, id)[0]!.commission_status, "NONE");
  await thuDu(w, id);
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, g.text);
  const h = await w.call("POST", `/api/orders/${id}/completed`, { as: KT, body: {} });
  assert.equal(h.status, 200, h.text);
});

// Lớp SQL của chính câu «Đã giao» (không qua bước kiểm trước của route). ĐẢO CÓ CHỦ ĐÍCH (Task 4): vế cũ «có người hưởng» (`CO_NGUOI_HUONG`) được thay bằng «không thiếu
// bản chụp» (`THIEU_BAN_CHUP`: v_ord_terms_missing + v_ord_terms_uncaptured) — đơn có người hưởng ĐỦ mức ⇒ 1 dòng đổi; đơn thiếu mức ⇒ 0; đơn khách lẻ ⇒ 1.
async function chayCauDaGiao(w: W, id: string): Promise<number> {
  const o = w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0] as { updated_at: string };
  const kq = await datGiaoStatement(fakeD1(w.sqlite) as unknown as D1Database, {
    orderId: id, at: new Date().toISOString(), by: SUPER, expectedUpdatedAt: o.updated_at, expectedAdjSeq: 0, homNay: vnHomNay(), sauCauBaoVe: false,
  }).run();
  return (kq.meta as { changes: number }).changes;
}
test("7 — lớp SQL của câu «Đã giao»: đơn có bản chụp người hưởng THIẾU mức ⇒ câu UPDATE không đổi dòng nào; đủ mức (vai đã đổi) ⇒ 1 dòng; khách lẻ ⇒ 1 dòng (ĐẢO CÓ CHỦ ĐÍCH — Task 4)", async () => {
  const w = setup();
  const thieu = await donDoiTacDaXacNhan(w, false);
  assert.equal(chup(w, thieu)[0]!.commission_status, "MISSING");
  assert.equal(await chayCauDaGiao(w, thieu), 0, "câu UPDATE lọt: thiếu vế «không thiếu bản chụp» trong DAT_GIAO_DIEU_KIEN");
  assert.equal(w.q("SELECT delivered_at FROM orders WHERE id = ?", thieu)[0].delivered_at, null);
  await datMuc(w, { loai: "VAI", code: "TRAVEL_AGENCY" });
  const id = nhap(w, `pty-${PT}`);
  await xacNhan(w, id);
  assert.equal((await doiVai(w, ADMIN, ["SALES_STAFF"])).status, 200);
  assert.equal(await chayCauDaGiao(w, id), 1, "đơn đủ mức: lớp 1 không còn chặn đơn có người hưởng (đợt 2)");
  const le = nhap(w, null);
  await xacNhan(w, le);
  assert.equal(await chayCauDaGiao(w, le), 1);
});

// ---- Hai vế cũ của `CO_NGUOI_HUONG` (bổ sung sau lượt kiểm độc lập 2026-10-13). Task 4 thay cả hai: «bản chụp HIỆN HÀNH» nay ở `v_ord_terms_missing` và ở
// `phanThuongMaiCuaDon` (chỉ đọc bản hiện hành); vế dự phòng «vai bên ngoài» thay bằng `v_ord_terms_uncaptured` (đơn chưa chụp bị giữ bất kể vai) ----
function themKhachLe(w: W): string {
  const K = "dda00000-0000-4000-8000-000000000004";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Khách lẻ', 1, ?, ?)").run(K, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Khách lẻ', ?, ?)").run(K, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-dda00000-0000-4000-8000-0000000000aa', ?, 'CUSTOMER', '2026-01-01', ?, ?)").run(K, AT, AT);
  return K;
}

test("8 — «bản chụp HIỆN HÀNH»: đổi bên đặt sang khách lẻ (PUT /booker) làm máy chụp lại bản NONE ⇒ «Đã giao» 200, KHÔNG dòng hoa hồng từ bản cũ đã bị thay (ADR-0077 điều 9); đơn khác khôi phục vai ngoài ⇒ 200 + HOA_HONG (ĐẢO CÓ CHỦ ĐÍCH — Task 4: trước là 409)", async () => {
  const w = setup();
  const K = themKhachLe(w);
  const id = await donDoiTacDaXacNhan(w);
  assert.equal(chup(w, id).length, 1);
  const up = w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at as string;
  const r = await w.call("PUT", `/api/orders/${id}/booker`, { as: SALES, body: { bookerPartyId: K, customerName: "Khách Giả", customerPhone: "0900000099", expectedUpdatedAt: up } });
  assert.equal(r.status, 200, r.text);
  assert.equal(chup(w, id).length, 2, "bản chụp cũ giữ nguyên, bản mới thay thế");
  assert.equal(w.q("SELECT count(*) AS n FROM ord_service_terms o WHERE o.order_id = ? AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = o.id) AND o.commission_status = 'NONE'", id)[0].n, 1);
  await thuDu(w, id);
  const g = await daGiao(w, id);
  assert.equal(g.status, 200, `bản chụp hiện hành là NONE; bản cũ (SET) đã bị thay phải KHÔNG được tính: ${g.text}`);
  assert.deepEqual(dongHoaHong(w, id), [], "bản chụp SET đã bị thay không sinh dòng hoa hồng");
  // đối chiếu: đơn khác, vai ngoài đổi rồi KHÔI PHỤC — bản chụp vẫn là SET hiện hành ⇒ «Đã giao» ghi hoa hồng cho người hưởng đã chụp
  const id2 = nhap(w, `pty-${PT}`); // bảng mức đã đặt ở trên (một lần)
  await xacNhan(w, id2);
  assert.equal(chup(w, id2)[0]!.commission_status, "SET");
  assert.equal((await doiVai(w, ADMIN, ["SALES_STAFF"])).status, 200);
  assert.equal((await doiVai(w, ADMIN, ["TRAVEL_AGENCY"])).status, 200);
  await thuDu(w, id2);
  assert.equal((await daGiao(w, id2)).status, 200);
  assert.deepEqual(dongHoaHong(w, id2), [["HOA_HONG", `pty-${PT}`, 200_000]]);
});

test("9 — đơn xác nhận TRƯỚC 0090, không có bản chụp: vai còn mở ⇒ 409 «Chụp bù»; vai đã đóng ⇒ VẪN 409 cùng câu (giới hạn cũ ĐÃ ĐÓNG — 0111 + lớp 1 Task 4)", async () => {
  const w = setup();
  const id = nhap(w, `pty-${PT}`);
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed', updated_at = ? WHERE id = ?").run(AT, id); // giả đơn cũ: xác nhận thẳng, KHÔNG qua route nên không có bản chụp
  assert.equal(chup(w, id).length, 0);
  await thuDu(w, id);
  const CHUP_BU = "Đơn xác nhận trước khi có bảng mức, chưa chụp mức — Kế toán cài mức rồi bấm Chụp bù.";
  const g = await daGiao(w, id);
  assert.equal(g.status, 409, g.text);
  assert.deepEqual([g.json.error.code, g.json.error.message], ["not_deliverable", CHUP_BU]);
  // Giới hạn cũ (đơn trước 0090 chưa có bản chụp chỉ còn vai hiện tại để canh; vai đã đóng ⇒ lọt) ĐÃ ĐÓNG ở lớp CSDL: migration 0111 (sổ đại lý đợt 2, ADR-0079
  // điều 5) — trigger `bil_posting_delivered_terms` chặn phiếu «Đã giao» của đơn còn dòng chưa chụp ⇒ cả lô huỷ, đơn không khoá, không phiếu. ĐẢO CÓ CHỦ ĐÍCH (Task 2):
  // câu trả lời lời thường (409 `terms_missing`, lớp 1 của orders + dịch mã `delivered_terms:`) do Task 4 làm — Task 4 đã siết dòng `notEqual(…, 200)` thành 409 đúng câu.
  assert.equal((await doiVai(w, ADMIN, ["SALES_STAFF"])).status, 200);
  const g2 = await daGiao(w, id);
  assert.equal(g2.status, 409, g2.text);
  assert.deepEqual([g2.json.error.code, g2.json.error.message], ["not_deliverable", CHUP_BU]);
  assert.equal(w.q("SELECT delivered_at FROM orders WHERE id = ?", id)[0].delivered_at, null);
  assert.equal(w.q("SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id)[0].n, 0);
});
