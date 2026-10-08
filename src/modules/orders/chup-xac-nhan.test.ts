// Chụp mức trong lô Xác nhận (đặc tả §5, §12 tiêu chí 3; Review Focus 1, 5). Route thật qua khung thử.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const AT = "2026-10-01T00:00:00.000Z";
// Ngày đi = hôm nay (giờ VN): cửa sổ xác nhận chỉ nhận dịch vụ có ngày đi từ hôm nay trở đi (câu `order_confirm`).
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-dla', 'ORGANIZATION', 'Đại lý A', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dla', 'pty-dla', 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(AT, AT);
  return w;
}
/** Đơn NHÁP của SALES, bên đặt `booker`, các dịch vụ [mã | null (nhập tay), thành tiền]. */
function nhap(w: W, booker: string | null, dv: [string | null, number][]): string {
  const id = uuid();
  const tong = dv.reduce((s, [, t]) => s + t, 0);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, booker, AT, AT);
  dv.forEach(([code, t], i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`).run(s, id, i, code, `DV ${i}`, code ? "perPax" : "manual", vnHomNay());
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, ?, 'Người lớn', 1, ?, ?, ?)`)
      .run(`${s}-i`, id, s, code, code ? "adult" : null, t, code ? t : null, t);
  });
  return id;
}
const xacNhan = (w: W, id: string, as = SALES) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const muc = (w: W, body: Record<string, unknown>) => w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", ...body } });
const chup = (w: W, id: string) => w.q("SELECT * FROM ord_service_terms WHERE order_id = ? ORDER BY order_service_id", id);
/** Chạy `truoc()` đúng một lần ngay trước lô đầu tiên có câu khớp `re` (mô phỏng "người khác ghi giữa lúc route đọc và lúc route ghi"). */
function chenTruocLo(w: W, re: RegExp, truoc: () => void): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) { w.env.DB.batch = goc; truoc(); }
    return goc(stmts);
  };
}

test("xác nhận đơn đại lý ⇒ mọi dòng có bản chụp AUTO cùng lô; nhật ký order_terms_captured một dòng", async () => {
  const w = setup();
  await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 });
  const id = nhap(w, "pty-dla", [["HONTAM", 2_000_000], [null, 300_000]]);
  const r = await xacNhan(w, id);
  assert.equal(r.status, 200, r.text);
  const ds = chup(w, id);
  assert.equal(ds.length, 2);
  assert.equal(ds[0].commission_status, "SET");
  assert.equal(ds[0].commission_rate_bp, 1000);
  assert.equal(ds[0].source, "AUTO");
  assert.equal(ds[1].commission_status, "MISSING");
  assert.equal(ds[1].missing_reason, "MANUAL_LINE");
  assert.equal(ds[1].supply_status, "MISSING", "dòng nhập tay: người bán thiếu (A-14)");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'order_terms_captured'", id)[0].n), 1);
});

test("đơn khách lẻ (bên đặt trống) ⇒ bản chụp NONE, người bán = công ty", async () => {
  const w = setup();
  const id = nhap(w, null, [["HONTAM", 1_000_000]]);
  assert.equal((await xacNhan(w, id)).status, 200);
  const [c] = chup(w, id);
  assert.equal(c.commission_status, "NONE");
  assert.equal(c.supply_status, "SET");
  assert.equal(c.supplier_party_id, null);
});

test("câu chụp hỏng ⇒ cả lô rơi: đơn vẫn nháp, không nhật ký confirmed, không bản chụp (tiêu chí 3)", async () => {
  const w = setup();
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  w.sqlite.exec(`CREATE TRIGGER hong_cu_y BEFORE INSERT ON ord_service_terms WHEN NEW.order_id = '${id}' BEGIN SELECT RAISE(ABORT, 'hong_cu_y'); END;`);
  const r = await xacNhan(w, id);
  assert.notEqual(r.status, 200);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'confirmed'", id)[0].n), 0);
  assert.equal(chup(w, id).length, 0);
});

test("Review Focus 5: dòng mức bị đóng giữa lúc đọc và lúc ghi ⇒ 409 'Bảng mức vừa đổi — thử lại', đơn vẫn nháp", async () => {
  const w = setup();
  const m = (await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 })).json.dong.id;
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  chenTruocLo(w, /INSERT INTO ord_service_terms/, () => w.sqlite.prepare("UPDATE prc_commission_rule SET valid_to_date = '2026-01-02' WHERE id = ?").run(m));
  const r = await xacNhan(w, id);
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /Bảng mức vừa đổi — thử lại/);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
});

test("Review Focus 1: hai người bấm Xác nhận cùng lúc ⇒ một 200, một 409, không 500, đúng một bộ bản chụp", async () => {
  const w = setup();
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  await w.token(SALES); // mở phiên trước: khung thử chưa chịu hai lời gọi ĐẦU TIÊN của cùng tài khoản chèn phiên đồng thời (UNIQUE aut_session.staff_id)
  const [a, b] = await Promise.all([xacNhan(w, id), xacNhan(w, id)]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(chup(w, id).length, 1);
});

// ---- Bổ sung của người thi công (Task 4): các ca brief không viết ra nhưng hàng rào cần ----

/** Như `chenTruocLo`, nhưng CHỜ `truoc()` xong (không đồng bộ) rồi mới chạy lô — để một lệnh xác nhận THẬT chen vào giữa. */
function chenTruocLoCho(w: W, re: RegExp, truoc: () => Promise<void>): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) { w.env.DB.batch = goc; await truoc(); }
    return goc(stmts);
  };
}

test("Review Focus 1 (xác định): lệnh xác nhận thứ hai chạy trọn VẸN trước lô của lệnh thứ nhất ⇒ lệnh thứ nhất 409, không 500, đúng một bộ bản chụp, một nhật ký", async () => {
  const w = setup();
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000], [null, 200_000]]);
  let thuHai: { status: number } | null = null;
  // Lô xác nhận của lệnh đầu đã đọc xong bảng mức và dựng sẵn câu chụp; trước khi nó chạy, một lệnh xác nhận khác chạy xong cả đường.
  chenTruocLoCho(w, /UPDATE orders SET status = 'confirmed'/, async () => { thuHai = await xacNhan(w, id); });
  const dau = await xacNhan(w, id);
  assert.equal(thuHai!.status, 200, "lệnh chen vào thắng");
  assert.equal(dau.status, 409, dau.text);
  assert.equal(chup(w, id).length, 2, "đúng một bộ bản chụp cho hai dòng dịch vụ");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'confirmed'", id)[0].n), 1);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'order_terms_captured'", id)[0].n), 1);
});

test("Review Focus 5 (bấm lại): sau 409 'Bảng mức vừa đổi' đơn vẫn nháp; bấm lại thì xác nhận được và bản chụp theo bảng MỚI (mức đã đóng ⇒ thiếu mức)", async () => {
  const w = setup();
  const m = (await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 })).json.dong.id;
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  chenTruocLo(w, /INSERT INTO ord_service_terms/, () => w.sqlite.prepare("UPDATE prc_commission_rule SET valid_to_date = '2026-01-02' WHERE id = ?").run(m));
  assert.equal((await xacNhan(w, id)).status, 409);
  assert.equal(chup(w, id).length, 0, "lần đầu rơi cả lô: chưa có bản chụp nào");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action IN ('confirmed', 'order_terms_captured')", id)[0].n), 0);
  const lai = await xacNhan(w, id);
  assert.equal(lai.status, 200, lai.text);
  const [c] = chup(w, id);
  assert.equal(c.commission_status, "MISSING");
  assert.equal(c.missing_reason, "NO_RULE");
});

test("điều khoản người bán là nhà cung cấp ⇒ bản chụp mang a% và mã điều khoản; điều khoản bị đóng giữa chừng ⇒ 409 (terms_term_stale)", async () => {
  const w = setup();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ncc', 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ncc', 'pty-ncc', 'SUPPLIER', '2026-01-01', ?, ?)").run(AT, AT);
  w.sqlite.prepare(`INSERT INTO prc_supply_term (id, scope, catalog_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, created_at, updated_at)
    VALUES ('st-ncc', 'SERVICE', 'HONTAM', 'pty-ncc', 'pty-ncc', 8000, '2026-01-01', ?, ?)`).run(AT, AT);
  const id = nhap(w, null, [["HONTAM", 1_000_000]]);
  assert.equal((await xacNhan(w, id)).status, 200);
  const [c] = chup(w, id);
  assert.equal(c.supply_status, "SET");
  assert.equal(c.seller_party_id, "pty-ncc");
  assert.equal(c.supplier_party_id, "pty-ncc");
  assert.equal(c.cost_rate_bp, 8000);
  assert.equal(c.supply_term_id, "st-ncc");

  const id2 = nhap(w, null, [["HONTAM", 1_000_000]]);
  chenTruocLo(w, /INSERT INTO ord_service_terms/, () => w.sqlite.prepare("UPDATE prc_supply_term SET valid_to_date = '2026-01-02' WHERE id = 'st-ncc'").run());
  const r = await xacNhan(w, id2);
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /Bảng mức vừa đổi — thử lại/);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id2)[0].status, "draft");
});

test("thứ tự lô xác nhận cố định: điền ngày chặng → UPDATE orders → nhật ký confirmed → mỗi dòng một câu chụp → nhật ký order_terms_captured (results[1] vẫn là UPDATE)", async () => {
  const w = setup();
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000], [null, 200_000]]);
  const goc = w.env.DB.batch;
  let thuTu: string[] = [];
  w.env.DB.batch = async (stmts: { sql: string; args: unknown[] }[]) => {
    if (stmts.some((s) => /UPDATE orders SET status = 'confirmed'/.test(s.sql))) {
      thuTu = stmts.map((s) => /UPDATE orders SET status = 'confirmed'/.test(s.sql) ? "UPDATE orders" : /INSERT INTO audit_log/.test(s.sql) ? `nhật ký ${String(s.args[3])}`
        : /INSERT INTO ord_service_terms/.test(s.sql) ? "chụp" : "khác");
    }
    return goc(stmts);
  };
  assert.equal((await xacNhan(w, id)).status, 200);
  assert.deepEqual(thuTu, ["khác", "UPDATE orders", "nhật ký confirmed", "chụp", "chụp", "nhật ký order_terms_captured"]);
});

test("nhật ký order_terms_captured chỉ đếm dòng: không tỷ lệ, không tiền, không tên đối tác", async () => {
  const w = setup();
  await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1234 });
  const id = nhap(w, "pty-dla", [["HONTAM", 2_000_000], [null, 300_000]]);
  assert.equal((await xacNhan(w, id)).status, 200);
  const d = String(w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = 'order_terms_captured'", id)[0].detail);
  assert.equal(d, "2 dòng: 1 có mức, 1 thiếu mức");
});

test("người khác lưu nháp giữa lúc đọc và lúc ghi (dịch vụ xoá–chèn lại với mã mới) ⇒ 409 'vừa được sửa', đơn vẫn nháp; bấm lại thì xác nhận và chụp đúng dịch vụ mới", async () => {
  const w = setup();
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  chenTruocLo(w, /INSERT INTO ord_service_terms/, () => {
    // Việc lưu nháp làm: xoá dòng tiền + dịch vụ cũ, chèn lại với mã dịch vụ mới (`serviceInserts`).
    w.sqlite.prepare("DELETE FROM order_item WHERE order_id = ?").run(id);
    w.sqlite.prepare("DELETE FROM order_service WHERE order_id = ?").run(id);
    w.sqlite.prepare("INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, 'HONTAM', 'DV 0', 'perPax', 1, ?)").run(`${id}-moi`, id, vnHomNay());
    w.sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, 1000000, 1000000, 1000000)").run(`${id}-moi-i`, id, `${id}-moi`);
  });
  const r = await xacNhan(w, id);
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /vừa được người khác sửa/);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
  assert.equal(chup(w, id).length, 0);
  assert.equal((await xacNhan(w, id)).status, 200);
  const ds = chup(w, id);
  assert.equal(ds.length, 1);
  assert.equal(ds[0].order_service_id, `${id}-moi`);
});

// ---- Task 4b: khoá phiên bản đơn ở câu Xác nhận (lời chủ 2026-10-08: "Báo tải lại, bấm lại") ----

const GIO_SAU = "2026-10-01T00:00:05.000Z"; // mốc `updated_at` của một lần lưu nháp chen vào (lớn hơn AT)
/** Đơn vẫn nháp, không bản chụp, không nhật ký xác nhận / chụp mức — dấu vết của một lô xác nhận KHÔNG ghi gì. */
function khongGhiGi(w: W, id: string): void {
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
  assert.equal(chup(w, id).length, 0, "không bản chụp nào");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action IN ('confirmed', 'order_terms_captured')", id)[0].n), 0, "không nhật ký xác nhận / chụp mức");
}
/** Câu báo 409 là tiếng Việt, không lộ mã trạng thái thô. */
function cauBaoSach(r: { json: { error: { message: string } } }): void {
  assert.match(r.json.error.message, /vừa được người khác sửa/);
  assert.doesNotMatch(r.json.error.message, /confirmed|draft/);
}

test("Task 4b ca A: lưu nháp đổi bên đặt thành trống ngay trước lô ⇒ 409 'vừa được sửa', đơn vẫn nháp, không bản chụp (khách lẻ không bị ghi hoa hồng đại lý); bấm lại thì chụp NONE", async () => {
  const w = setup();
  await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 });
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  chenTruocLo(w, /UPDATE orders SET status = 'confirmed'/, () => {
    // Việc lưu nháp (đổi bên đặt) làm: đổi bên đặt VÀ đẩy mốc `updated_at` của đơn.
    w.sqlite.prepare("UPDATE orders SET booker_party_id = NULL, updated_at = ? WHERE id = ?").run(GIO_SAU, id);
  });
  const r = await xacNhan(w, id);
  assert.equal(r.status, 409, r.text);
  cauBaoSach(r);
  khongGhiGi(w, id);
  const lai = await xacNhan(w, id);
  assert.equal(lai.status, 200, lai.text);
  const [c] = chup(w, id);
  assert.equal(c.commission_status, "NONE", "bấm lại: bên đặt trống ⇒ không hoa hồng");
  assert.equal(c.beneficiary_party_id, null);
});

test("Task 4b ca B: lưu nháp đổi dòng danh mục thành nhập tay (giữ mã dòng dịch vụ) ngay trước lô ⇒ 409, không bản chụp; bấm lại thì dòng nhập tay chụp 'thiếu mức'", async () => {
  const w = setup();
  await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 });
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  chenTruocLo(w, /UPDATE orders SET status = 'confirmed'/, () => {
    w.sqlite.prepare("UPDATE order_service SET catalog_code = NULL, unit = 'manual' WHERE order_id = ?").run(id);
    w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run(GIO_SAU, id);
  });
  const r = await xacNhan(w, id);
  assert.equal(r.status, 409, r.text);
  cauBaoSach(r);
  khongGhiGi(w, id);
  const lai = await xacNhan(w, id);
  assert.equal(lai.status, 200, lai.text);
  const [c] = chup(w, id);
  assert.equal(c.commission_status, "MISSING");
  assert.equal(c.missing_reason, "MANUAL_LINE");
});

test("Task 4b đối chứng: không ai chen vào ⇒ 200, mốc `updated_at` đơn tăng, đúng một bộ bản chụp như cũ", async () => {
  const w = setup();
  await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 });
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  const r = await xacNhan(w, id);
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "confirmed");
  assert.ok(String(w.q("SELECT updated_at FROM orders WHERE id = ?", id)[0].updated_at) > AT, "mốc mới lớn hơn mốc đã đọc");
  const ds = chup(w, id);
  assert.equal(ds.length, 1);
  assert.equal(ds[0].commission_status, "SET");
  assert.equal(ds[0].beneficiary_party_id, "pty-dla");
});

test("Task 4b: lưu nháp chen vào mà KHÔNG đổi gì liên quan chụp (chỉ đẩy `updated_at`) vẫn 409 — khoá theo phiên bản, không đoán nội dung; bấm lại xác nhận được", async () => {
  const w = setup();
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  chenTruocLo(w, /UPDATE orders SET status = 'confirmed'/, () => { w.sqlite.prepare("UPDATE orders SET updated_at = ? WHERE id = ?").run(GIO_SAU, id); });
  const r = await xacNhan(w, id);
  assert.equal(r.status, 409, r.text);
  cauBaoSach(r);
  khongGhiGi(w, id);
  assert.equal((await xacNhan(w, id)).status, 200);
  assert.equal(chup(w, id).length, 1);
});
