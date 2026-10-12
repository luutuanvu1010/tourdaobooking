// Sổ tiền lượt 1 — route billing chạy trên KHUNG THỬ (tests/audit/harness.mjs: CẢ ứng dụng thật + SQLite thật, lô `db.batch()` là một giao dịch như D1).
// Kế hoạch Task 6: NT-Q2, Q3, Q4, Q5; NT-F1, F3, F4, F5, F6, F6b, F8, F11 (phần máy chủ); NT-S1, S2, S3, S5, S8, S9.
// Các ca CHEN GIỮA lúc máy chủ đọc và lúc ghi (F4, F5, F6b) làm TẤT ĐỊNH bằng cách bọc `env.DB.batch` của khung thử: chạy một câu SQL "của người khác" NGAY
// TRƯỚC lô — không móc thử nghiệm nào vào mã chạy thật. (Kế hoạch ghi các ca này ở e2e; e2e không xen kẽ được tất định — chênh ghi ở sổ thi công.)
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const HDV2 = "22222222-2222-4222-8222-222222222223";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666";
const AT = "2026-09-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const vnNgay = (d: number) => new Date(Date.now() + 7 * 3600_000 + d * 86400_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [HDV2, "0900000003", "Bình HDV", ["FIELD"]],
    [ADMIN, "0900000004", "Quản Trị", ["ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [SA, "0900000006", "Toàn Quyền", ["SUPER_ADMIN"]],
    [DT, "0900000007", "Đối Tác", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN (tổng `total`, một dịch vụ ngày đi `depart`) của `owner`, người phụ trách = hồ sơ của `handler` (null = chưa ai). */
function donDaXacNhan(w: W, o: { total?: number; depart?: string; owner?: string; handler?: string | null; booker?: string | null } = {}): string {
  const id = uuid();
  const total = o.total ?? 1_000_000;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, o.owner ?? SALES, total, total, total, o.booker ?? null, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, o.depart ?? vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, total, total);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  const h = o.handler === undefined ? HDV : o.handler;
  if (h) {
    w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${h}`, AT, AT, AT);
  }
  return id;
}
const thu = (w: W, as: string, orderId: string, body: Record<string, unknown>) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body });
const tienMat = (soTien: number, nguoiThu: unknown = "toi", extra: Record<string, unknown> = {}) => ({ soTien, hinhThuc: "CASH", nguoiThu, ...extra });
const giao = (w: W, as: string, orderId: string, body: Record<string, unknown> = {}) => w.call("POST", `/api/orders/${orderId}/delivered`, { as, body });
const one = (w: W, sql: string, ...a: unknown[]) => w.q(sql, ...a)[0] as Record<string, unknown> | undefined;
const dem = (w: W, sql: string, ...a: unknown[]) => Number(one(w, sql, ...a)!.n);
const trangThai = (w: W, id: string) => one(w, "SELECT delivered_at, completed_at FROM orders WHERE id = ?", id)!;
const nhatKy = (w: W, id: string, action: string) => dem(w, "SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = ?", id, action);
/** Bọc lô ghi: chạy `truoc` (câu "của người khác") ngay trước lô KẾ TIẾP rồi gỡ bọc. */
function chenTruocLo(w: W, truoc: () => void) {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: unknown[]) => {
    w.env.DB.batch = goc;
    truoc();
    return goc(stmts);
  };
}

test("GET /api/orders/:id/payments: HDV đang phụ trách xem được (còn thiếu, lý do + ai xử lý); HDV khác → 404; Đối tác đơn người khác → 403", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  const r = await w.call("GET", `/api/orders/${id}/payments`, { as: HDV });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([r.json.phaiThu, r.json.daThu, r.json.conLai, r.json.coTheGhiThu, r.json.coTheGiao], [1_000_000, 0, 1_000_000, true, false]);
  assert.deepEqual([r.json.lyDoChuaGiao.ma, r.json.lyDoChuaGiao.aiXuLy], ["underpaid", "Hướng dẫn viên"]);
  assert.equal((await w.call("GET", `/api/orders/${id}/payments`, { as: HDV2 })).status, 404);
  assert.equal((await w.call("GET", `/api/orders/${id}/payments`, { as: DT })).status, 403);
});

test("NT-Q4 / NT-S9: ghi lần thu — người thu = mình hoặc Công ty; người khác → 400 (trừ Kế toán); Đối tác đơn người khác → 403; thu cho luôn là công ty chủ", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  assert.equal((await thu(w, HDV, id, tienMat(100_000, { partyId: `pty-${HDV2}` }))).status, 400);
  assert.equal((await thu(w, DT, id, tienMat(100_000))).status, 403);
  assert.equal((await thu(w, HDV2, id, tienMat(100_000))).status, 403, "HDV không phụ trách đơn");
  assert.equal((await thu(w, HDV, id, tienMat(0))).status, 400);
  assert.equal((await thu(w, HDV, id, { soTien: 5, hinhThuc: "BITCOIN", nguoiThu: "toi" })).status, 400);
  assert.equal((await thu(w, HDV, id, tienMat(300_000))).status, 201);
  assert.equal((await thu(w, KT, id, tienMat(200_000, { partyId: `pty-${HDV2}` }))).status, 201, "Kế toán ghi thay người khác");
  const cho = w.q("SELECT DISTINCT collected_for_party_id AS p FROM bil_payment_receipt WHERE order_id = ?", id) as { p: string }[];
  const congTy = one(w, "SELECT party_id FROM v_pty_owner_company")!.party_id;
  assert.deepEqual(cho.map((x) => x.p), [congTy]);
  const giu = w.q("SELECT debtor_party_id AS d, amount FROM bil_debt_line WHERE order_id = ? ORDER BY rowid", id) as { d: string; amount: number }[];
  assert.deepEqual(giu.map((x) => [x.d, x.amount]), [[`pty-${HDV}`, 300_000], [`pty-${HDV2}`, 200_000]]);
  assert.equal(nhatKy(w, id, "payment_recorded"), 2);
});

test("NT-S8: ngày phát sinh — HDV chọn ngày khác hôm nay → 400; Kế toán chọn được; mặc định hôm nay giờ VN", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  assert.equal((await thu(w, HDV, id, tienMat(1, "toi", { ngayPhatSinh: vnNgay(-3) }))).status, 400);
  assert.equal((await thu(w, KT, id, tienMat(1, "cong_ty", { ngayPhatSinh: vnNgay(-3) }))).status, 201);
  assert.equal((await thu(w, HDV, id, tienMat(2))).status, 201);
  assert.deepEqual((w.q("SELECT occurred_date AS d FROM bil_payment_receipt WHERE order_id = ? ORDER BY rowid", id) as { d: string }[]).map((x) => x.d), [vnNgay(-3), vnHomNay()]);
});

test("NT-F1 / NT-F2 / NT-F3: Đã giao — thiếu → 409 câu tiếng Việt; nhập lần thu cuối ngay ở bước này → thành công đúng MỘT phiếu + MỘT nhật ký; bấm lần hai → 409; ghi lần thu sau Đã giao → 409 (NT-S3)", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  assert.equal((await thu(w, HDV, id, tienMat(600_000))).status, 201);
  const thieu = await giao(w, HDV, id);
  assert.equal(thieu.status, 409, thieu.text);
  assert.equal(thieu.json.error.message, "Còn thiếu 400.000 ₫ — ghi thêm lần thu hoặc sửa đơn trước.");
  const ok = await giao(w, HDV, id, { lanThu: tienMat(400_000) });
  assert.equal(ok.status, 200, ok.text);
  assert.ok(trangThai(w, id).delivered_at);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id), 1);
  assert.equal(one(w, "SELECT due_snapshot FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id)!.due_snapshot, 1_000_000);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ? AND stage_code = 'AT_DELIVERY'", id), 1);
  assert.equal(nhatKy(w, id, "order_delivered"), 1);
  const lai = await giao(w, HDV, id);
  assert.equal(lai.status, 409);
  assert.equal(lai.json.error.code, "order_delivered");
  const sau = await thu(w, HDV, id, tienMat(1));
  assert.equal(sau.status, 409);
  assert.equal(sau.json.error.code, "order_delivered");
  assert.equal(nhatKy(w, id, "order_delivered"), 1, "đúng MỘT dòng nhật ký order_delivered");
  const xem = await w.call("GET", `/api/orders/${id}/payments`, { as: HDV });
  assert.deepEqual([xem.json.daThu, xem.json.conLai, xem.json.coTheGhiThu, xem.json.banDangGiu], [1_000_000, 0, false, 1_000_000]);
});

test("NT-F3: hai người bấm cùng lúc (HDV + Quản trị) → đúng MỘT thắng, bên thua không để lại dòng sổ / nhật ký nào", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(1_000_000));
  const [a, b] = await Promise.all([giao(w, HDV, id), giao(w, ADMIN, id)]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id), 1);
  assert.equal(nhatKy(w, id, "order_delivered"), 1);
});

test("NT-Q2: Đã giao — HDV không phụ trách → 403; Bán hàng ĐANG phụ trách → 403; Kế toán → 403; Quản trị / Toàn quyền → được", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(1_000_000));
  assert.equal((await giao(w, HDV2, id)).status, 403);
  assert.equal((await giao(w, KT, id)).status, 403);
  const banPT = donDaXacNhan(w, { handler: SALES });
  await thu(w, SALES, banPT, tienMat(1_000_000));
  assert.equal((await giao(w, SALES, banPT)).status, 403, "Bán hàng đang phụ trách không bấm được (ADR-0025 đ2 — chủ chọn A)");
  assert.equal((await giao(w, ADMIN, banPT)).status, 200);
  assert.equal((await giao(w, SA, id)).status, 200);
});

test("NT-F1: trước ngày đi muộn nhất → 409; bên đặt mang vai nhóm bên ngoài (M1 = A) → 409; còn lần thu chưa rõ → 409 (Kế toán xử lý)", async () => {
  const w = setup();
  const som = donDaXacNhan(w, { depart: vnNgay(2) });
  await thu(w, HDV, som, tienMat(1_000_000));
  const r1 = await giao(w, HDV, som);
  assert.equal(r1.status, 409);
  assert.match(r1.json.error.message, /^Chưa tới ngày đi/);
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ctv', 'PERSON', 'Cộng Tác Viên', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ctv', 'pty-ctv', 'COLLABORATOR', '2026-01-01', '${AT}', '${AT}')`);
  const dt = donDaXacNhan(w, { booker: "pty-ctv" });
  await thu(w, HDV, dt, tienMat(1_000_000));
  const r2 = await giao(w, HDV, dt);
  assert.equal(r2.status, 409);
  assert.match(r2.json.error.message, /^Đơn của đối tác/);
  const cu = donDaXacNhan(w);
  w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
    occurred_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', 1000000, NULL, 'UNKNOWN', 'OTHER', (SELECT party_id FROM v_pty_owner_company), 'PREPAID', '2026-09-01', ?, 'he-thong', ?, 'he-thong')`)
    .run(uuid(), cu, AT, AT);
  const r3 = await giao(w, HDV, cu);
  assert.equal(r3.status, 409);
  assert.match(r3.json.error.message, /chưa rõ người thu/);
  for (const d of [som, dt, cu]) assert.equal(nhatKy(w, d, "order_delivered"), 0);
});

test("NT-F4: người phụ trách bị đổi GIỮA lúc máy chủ đọc và lúc ghi → lô không áp gì (không mốc, không phiếu, không lần thu, không nhật ký)", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(600_000));
  chenTruocLo(w, () => {
    w.sqlite.prepare("UPDATE dsp_assignment SET valid_to_at = ?, updated_at = ? WHERE order_id = ? AND valid_to_at IS NULL").run("2026-09-02T00:00:00.000Z", "2026-09-02T00:00:00.000Z", id);
    w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, 'HANDLE', ?, 'PENDING', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z', NULL, '2026-09-02T00:00:00.000Z', NULL)`).run(uuid(), id, `pty-${HDV2}`);
  });
  const r = await giao(w, HDV, id, { lanThu: tienMat(400_000) });
  assert.equal(r.status, 409, r.text);
  assert.equal(trangThai(w, id).delivered_at, null);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'", id), 0);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id), 1, "lần thu nhập ở bước này KHÔNG được lưu");
  assert.equal(nhatKy(w, id, "order_delivered"), 0);
  assert.equal(nhatKy(w, id, "payment_recorded"), 1, "chỉ dòng của lần thu trước đó");
});

test("NT-F5 (R3): số khách bị sửa (dòng điều chỉnh mới) giữa lúc đọc và lúc ghi → lô thua, không nhật ký order_delivered", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(1_000_000));
  chenTruocLo(w, () => {
    w.sqlite.prepare("INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, 1, '[]', '[]', 1000000, 1000000)").run(uuid(), id);
  });
  const r = await giao(w, ADMIN, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(trangThai(w, id).delivered_at, null);
  assert.equal(nhatKy(w, id, "order_delivered"), 0);
});

test("NT-F6b (C1): một lần thu CHEN VÀO giữa lúc đọc và lúc ghi → trigger bil_posting_delivered_paid từ chối phiếu → CẢ lô huỷ (đơn không khoá, không phiếu, không nhật ký)", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(1_000_000));
  chenTruocLo(w, () => {
    w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', 50000, ?, 'STAFF', 'CASH', (SELECT party_id FROM v_pty_owner_company), 'PREPAID', '2026-09-01', ?, NULL, ?, NULL)`)
      .run(uuid(), id, `pty-${HDV2}`, AT, AT);
  });
  const r = await giao(w, HDV, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "not_deliverable");
  assert.equal(trangThai(w, id).delivered_at, null, "câu orders đứng ĐẦU lô cũng quay lại");
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_posting WHERE order_id = ?", id), 1, "chỉ phiếu RECEIPT của lần thu trước");
  assert.equal(nhatKy(w, id, "order_delivered"), 0);
});

test("NT-F6: câu thứ 3 của lô bị RAISE (trigger tạm cài trên CSDL thử) → KHÔNG câu nào được lưu", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(600_000));
  // Lô của HDV kèm lần thu: [bảo vệ, orders, lần thu, nhật ký lần thu, phiếu RECEIPT, dòng, phiếu Đã giao, nhật ký] — câu thứ 3 = lần thu.
  w.sqlite.exec(`CREATE TRIGGER thu_tam_raise BEFORE INSERT ON bil_payment_receipt WHEN NEW.stage_code = 'AT_DELIVERY' BEGIN SELECT RAISE(ABORT, 'thu_tam'); END`);
  // Router ghi một dòng log lỗi 500 (kèm stack dài) — tắt log trong đúng lời gọi này cho bảng kết quả gọn.
  const [log, err] = [console.log, console.error];
  console.log = console.error = () => {};
  try {
    await assert.rejects(giao(w, HDV, id, { lanThu: tienMat(400_000) }).then((r) => { if (r.status >= 500) throw new Error(r.text); return r; }));
  } finally {
    [console.log, console.error] = [log, err];
  }
  w.sqlite.exec("DROP TRIGGER thu_tam_raise");
  assert.equal(trangThai(w, id).delivered_at, null);
  assert.equal(dem(w, "SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = ?", id), 1);
  assert.equal(nhatKy(w, id, "order_delivered"), 0);
});

test("NT-Q3 / NT-F8 / NT-S1: Hoàn thành — Quản trị → 403; còn HDV giữ tiền (kể cả 'Công ty thu – CK' chưa xác nhận) → 409; Kế toán xác nhận + ghi nộp → Hoàn thành được, một nhật ký", async () => {
  const w = setup();
  const id = donDaXacNhan(w, { total: 1_500_000 });
  await thu(w, HDV, id, tienMat(1_000_000));
  await thu(w, HDV, id, { soTien: 500_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" });
  const mine = async () => (await w.call("GET", "/api/ledger/mine", { as: HDV })).json.dangGiu;
  assert.equal(await mine(), 1_500_000, "khoản công ty thu do HDV khai vẫn tính vào HDV (H3)");
  assert.equal((await giao(w, HDV, id)).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${id}/completed`, { as: ADMIN })).status, 403);
  const chua = await w.call("POST", `/api/orders/${id}/completed`, { as: KT });
  assert.equal(chua.status, 409);
  assert.match(chua.json.error.message, /Nam HDV đang giữ 1\.500\.000 ₫/);
  const soCty = await w.call("GET", "/api/ledger", { as: KT });
  assert.equal(soCty.status, 200);
  assert.equal(soCty.json.choXacNhan.length, 1);
  assert.equal((await w.call("POST", `/api/ledger/company-receipts/${soCty.json.choXacNhan[0].receiptId}/confirm`, { as: KT, body: { maGiaoDich: "FTLG0001", soThucChuyen: 500_000 } })).status, 200);
  assert.equal(await mine(), 1_000_000);
  assert.equal((await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: `pty-${HDV}`, phanBo: [{ orderId: id, soTien: 1_000_000 }] } })).status, 201);
  assert.equal(await mine(), 0);
  assert.equal((await w.call("POST", `/api/orders/${id}/completed`, { as: KT })).status, 200);
  assert.ok(trangThai(w, id).completed_at);
  assert.equal(nhatKy(w, id, "order_completed"), 1);
  assert.equal((await w.call("POST", `/api/orders/${id}/completed`, { as: SA })).status, 409);
});

test("NT-S2: HDV A thu trước, đơn chuyển sang HDV B → A vẫn thấy nợ ở 'Sổ của tôi' (mã đơn, không tên/SĐT khách), không mở được đơn", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(300_000));
  w.sqlite.prepare("UPDATE dsp_assignment SET valid_to_at = ?, updated_at = ? WHERE order_id = ? AND valid_to_at IS NULL").run("2026-09-02T00:00:00.000Z", "2026-09-02T00:00:00.000Z", id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z', NULL, '2026-09-02T00:00:00.000Z', NULL)`).run(uuid(), id, `pty-${HDV2}`);
  const so = await w.call("GET", "/api/ledger/mine", { as: HDV });
  assert.equal(so.status, 200);
  assert.equal(so.json.dangGiu, 300_000);
  assert.ok(so.json.dong[0].maDon.startsWith("TD-"));
  assert.doesNotMatch(so.text, /Khách Giả|0900000099/);
  assert.equal((await w.call("GET", `/api/orders/${id}/payments`, { as: HDV })).status, 404);
});

test("NT-S5 (M2): khách trả dư → Đã giao bị giữ 'chờ Kế toán hoàn'; Quản trị ghi hoàn → 403; Kế toán ghi hoàn (người trả = HDV) → hết dư → Đã giao được", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(1_100_000));
  const du = await giao(w, HDV, id);
  assert.equal(du.status, 409);
  assert.equal(du.json.error.message, "Khách đã trả dư 100.000 ₫ — chờ Kế toán hoàn.");
  const hoan = { orderId: id, soTien: 100_000, hinhThuc: "CASH", nguoiTra: { partyId: `pty-${HDV}` } };
  assert.equal((await w.call("POST", "/api/ledger/refunds", { as: ADMIN, body: hoan })).status, 403);
  assert.equal((await w.call("POST", "/api/ledger/refunds", { as: KT, body: { ...hoan, soTien: 5_000_000 } })).status, 400, "không hoàn quá số đã thu");
  assert.equal((await w.call("POST", "/api/ledger/refunds", { as: KT, body: hoan })).status, 201);
  assert.equal((await w.call("GET", "/api/ledger/mine", { as: HDV })).json.dangGiu, 1_000_000);
  assert.equal((await giao(w, HDV, id)).status, 200);
});

test("NT-S4: điều chỉnh / đảo — lý do bắt buộc; đảo lần thu chưa rõ rồi Kế toán ghi lại đúng người thu → Đã giao được", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  const rid = uuid();
  w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
    occurred_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', 300000, NULL, 'UNKNOWN', 'OTHER', (SELECT party_id FROM v_pty_owner_company), 'PREPAID', '2026-09-01', ?, 'he-thong', ?, 'he-thong')`).run(rid, id, AT, AT);
  assert.equal((await w.call("GET", "/api/ledger", { as: KT })).json.chuaRo.length, 1);
  assert.equal((await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: rid } })).status, 400, "thiếu lý do");
  assert.equal((await w.call("POST", "/api/ledger/adjustments", { as: SALES, body: { loai: "dao_lan_thu", receiptId: rid, lyDo: "x" } })).status, 403);
  assert.equal((await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: rid, lyDo: "cọc cũ do HDV Nam thu" } })).status, 201);
  assert.equal((await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: rid, lyDo: "lần hai" } })).status, 409);
  assert.equal((await thu(w, KT, id, tienMat(300_000, { partyId: `pty-${HDV}` }))).status, 201);
  assert.equal((await thu(w, HDV, id, tienMat(700_000))).status, 201);
  assert.equal((await giao(w, HDV, id)).status, 200);
  assert.equal((await w.call("GET", "/api/ledger/mine", { as: HDV })).json.dangGiu, 1_000_000);
  // Đảo một dòng nợ: cùng số, đổi chỗ, trỏ gốc. ADR-0092 Đ4 (0082): dòng GIỮ HỘ của lần thu còn hiệu lực không đảo riêng được — đảo dòng NỘP.
  const hdvParty = `pty-${HDV}`;
  const giu = one(w, "SELECT id FROM bil_debt_line WHERE order_id = ? AND kind_code = 'HELD' ORDER BY rowid LIMIT 1", id)!;
  assert.equal((await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_dong", lineId: giu.id, lyDo: "ghi nhầm" } })).json.error.code, "held_single_reversal");
  assert.equal((await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: hdvParty, phanBo: [{ orderId: id, soTien: 100_000 }] } })).status, 201);
  const l = one(w, "SELECT id, amount, debtor_party_id, creditor_party_id FROM bil_debt_line WHERE order_id = ? AND kind_code = 'SETTLEMENT' ORDER BY rowid LIMIT 1", id)!;
  assert.equal((await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_dong", lineId: l.id, lyDo: "ghi nhầm" } })).status, 201);
  const d = one(w, "SELECT amount, debtor_party_id, creditor_party_id FROM bil_debt_line WHERE reverses_line_id = ?", l.id)!;
  assert.deepEqual([d.amount, d.debtor_party_id, d.creditor_party_id], [l.amount, l.creditor_party_id, l.debtor_party_id]);
});

test("NT-Q5: GET /api/ledger chỉ ledger.view = any (Kế toán, Toàn quyền); Bán hàng / Quản trị → 403; 'Sổ của tôi' Đối tác → 403", async () => {
  const w = setup();
  assert.equal((await w.call("GET", "/api/ledger", { as: KT })).status, 200);
  assert.equal((await w.call("GET", "/api/ledger", { as: SA })).status, 200);
  assert.equal((await w.call("GET", "/api/ledger", { as: SALES })).status, 403);
  assert.equal((await w.call("GET", "/api/ledger", { as: ADMIN })).status, 403);
  assert.equal((await w.call("GET", "/api/ledger/mine", { as: SALES })).status, 200);
  assert.equal((await w.call("GET", "/api/ledger/mine", { as: DT })).status, 403);
});

test("POST /api/ledger/balances: chỉ trả đơn người gọi được xem tiền (HDV: đơn đang phụ trách; Bán hàng: mọi đơn); ô 'Còn thiếu tiền' của Trang chủ", async () => {
  const w = setup();
  const a = donDaXacNhan(w);
  const b = donDaXacNhan(w, { handler: HDV2 });
  await thu(w, HDV, a, tienMat(400_000));
  const hdv = await w.call("POST", "/api/ledger/balances", { as: HDV, body: { orderIds: [a, b] } });
  assert.equal(hdv.status, 200);
  assert.deepEqual(Object.keys(hdv.json.balances), [a]);
  assert.equal(hdv.json.balances[a].conLai, 600_000);
  const ban = await w.call("POST", "/api/ledger/balances", { as: SALES, body: { orderIds: [a, b] } });
  assert.deepEqual(Object.keys(ban.json.balances).sort(), [a, b].sort());
  const tom = await w.call("GET", "/api/ledger/unpaid-summary", { as: SALES });
  assert.deepEqual([tom.status, tom.json.count, tom.json.total], [200, 2, 1_600_000]);
  assert.equal((await w.call("GET", "/api/ledger/unpaid-summary", { as: DT })).status, 403);
});

test("T-3 (kiểm độc lập): hai Kế toán cùng ghi hoàn — lần hoàn CHEN VÀO giữa lúc đọc và lúc ghi → trigger canh 'không hoàn quá số đã thu' TRONG lô → 409, tổng hoàn không vượt số đã thu", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(1_100_000));
  const hoan = { orderId: id, soTien: 700_000, hinhThuc: "CASH", nguoiTra: "cong_ty" };
  // Kế toán thứ hai ghi hoàn 700.000 ngay trước lô của người thứ nhất (máy chủ người thứ nhất đã đọc "đã thu 1.100.000").
  chenTruocLo(w, () => {
    w.sqlite.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_REFUND', 700000, (SELECT party_id FROM v_pty_owner_company), 'COMPANY', 'CASH', (SELECT party_id FROM v_pty_owner_company), 'PREPAID', '2026-09-01', ?, ?, ?, ?)`)
      .run(uuid(), id, AT, KT, AT, KT);
  });
  const r = await w.call("POST", "/api/ledger/refunds", { as: KT, body: hoan });
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /Không hoàn quá số khách đã trả/);
  const tong = one(w, "SELECT COALESCE(SUM(amount), 0) AS n FROM bil_payment_receipt WHERE order_id = ? AND kind_code = 'CUSTOMER_REFUND' AND reverses_id IS NULL", id)!.n;
  assert.equal(tong, 700_000, "chỉ lần hoàn chen vào được lưu; lô thua huỷ trọn");
  assert.equal(nhatKy(w, id, "ledger_refund"), 0, "lô thua không để lại nhật ký");
});

test("Thao tác Kế toán trên trang đơn (điều phối 30/9): GET payments trả khối `keToan` CHỈ cho Kế toán — ai đang giữ bao nhiêu vì ĐƠN NÀY + lần thu 'Công ty thu – CK' chờ xác nhận; người khác → null", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(400_000));
  assert.equal((await thu(w, SALES, id, { soTien: 250_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201);
  const ck = one(w, "SELECT id FROM bil_payment_receipt WHERE order_id = ? AND collector_role_code = 'COMPANY'", id)!.id as string;
  const kt = (await w.call("GET", `/api/orders/${id}/payments`, { as: KT })).json;
  assert.ok(kt.keToan, "Kế toán thấy khối keToan");
  assert.deepEqual(kt.keToan.choXacNhan, [ck]);
  const giu = Object.fromEntries(kt.keToan.dangGiu.map((d: { partyId: string; soTien: number }) => [d.partyId, d.soTien]));
  assert.deepEqual(giu, { [`pty-${HDV}`]: 400_000, [`pty-${SALES}`]: 250_000 });
  assert.ok(kt.keToan.dangGiu.every((d: { ten: string }) => typeof d.ten === "string" && d.ten.length > 0));
  // Kế toán xác nhận CK + ghi HDV nộp — khối cập nhật theo sổ.
  assert.equal((await w.call("POST", `/api/ledger/company-receipts/${ck}/confirm`, { as: KT, body: { maGiaoDich: "FTLG0002", soThucChuyen: 250_000 } })).status, 200);
  assert.equal((await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: `pty-${HDV}`, phanBo: [{ orderId: id, soTien: 400_000 }] } })).status, 201);
  const sau = (await w.call("GET", `/api/orders/${id}/payments`, { as: KT })).json.keToan;
  assert.deepEqual([sau.choXacNhan, sau.dangGiu], [[], []]);
  for (const ai of [SALES, HDV, ADMIN]) assert.equal((await w.call("GET", `/api/orders/${id}/payments`, { as: ai })).json.keToan, null, `không phải Kế toán (${ai})`);
});

test("Kiểm độc lập vòng 2 (V-B): ghi nộp / xác nhận 'Công ty đã nhận' — Quản trị, Bán hàng → 403, sổ không đổi; tài khoản LAI (Bán hàng + Đối tác) xem tiền đơn của mình → keToan = null", async () => {
  const w = setup();
  const LAI = "66666666-6666-4666-8666-666666666699";
  seedStaff(w.sqlite, { id: LAI, phone: "0900000099", name: "Lai Hai Quyền", perms: ["SALES", "PARTNER"] });
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(400_000));
  assert.equal((await thu(w, SALES, id, { soTien: 250_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201);
  const ck = one(w, "SELECT id FROM bil_payment_receipt WHERE order_id = ? AND collector_role_code = 'COMPANY'", id)!.id as string;
  const soDong = () => one(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id)!.n;
  const truoc = soDong();
  const nop = { chieu: "nop", partyId: `pty-${HDV}`, phanBo: [{ orderId: id, soTien: 400_000 }] };
  for (const ai of [ADMIN, SALES]) {
    assert.equal((await w.call("POST", "/api/ledger/settlements", { as: ai, body: nop })).status, 403, `settlements ${ai}`);
    assert.equal((await w.call("POST", `/api/ledger/company-receipts/${ck}/confirm`, { as: ai, body: {} })).status, 403, `confirm ${ai}`);
  }
  assert.equal(soDong(), truoc, "không dòng nợ nào được ghi");
  assert.equal(nhatKy(w, id, "ledger_settlement") + nhatKy(w, id, "ledger_company_received"), 0, "không nhật ký");
  const idLai = donDaXacNhan(w, { owner: LAI });
  const r = await w.call("GET", `/api/orders/${idLai}/payments`, { as: LAI });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.keToan, null, "tài khoản lai không phải Kế toán");
  assert.equal(r.json.laKeToan, false);
});

// ---- TNV-VP01 / ADR-0092 Đ2, Đ2b (năm lỗi tiền V2): một dòng giữ hộ tất toán MỘT lần, bằng một trong hai đường; nộp / trả không đổi dấu số dư ----
const soCuaToi = async (w: W, as: string) => (await w.call("GET", "/api/ledger/mine", { as })).json.dangGiu as number;
const nopVe = (w: W, orderId: string, soTien: number, partyId = `pty-${HDV}`) =>
  w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId, phanBo: [{ orderId, soTien }] } });
// ADR-0092 Đ6 (C1): xác nhận khoản CK – Công ty thu từ mốc cắt đòi mã giao dịch + số thực chuyển (= số của khoản).
const xacNhanCk = (w: W, receiptId: string, soTien = 1_000_000, ma = "FTLG0003") =>
  w.call("POST", `/api/ledger/company-receipts/${receiptId}/confirm`, { as: KT, body: { maGiaoDich: ma, soThucChuyen: soTien } });

test("VP-01 (Đ2b) thứ tự 1: HDV khai 'Công ty thu – CK' 1.000.000 → Kế toán ghi 'Đã nộp' 1.000.000 → 'Xác nhận đã nhận' → 409 kèm câu chỉ đường; sổ của HDV = 0 (không âm)", async () => {
  const w = setup();
  const id = donDaXacNhan(w, { total: 1_000_000 });
  assert.equal((await thu(w, HDV, id, { soTien: 1_000_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201);
  const ck = one(w, "SELECT id FROM bil_payment_receipt WHERE order_id = ? AND collector_role_code = 'COMPANY'", id)!.id as string;
  const kt0 = (await w.call("GET", `/api/orders/${id}/payments`, { as: KT })).json.keToan;
  assert.deepEqual(kt0.dangGiu.map((d: { soTien: number; choXacNhan: number }) => [d.soTien, d.choXacNhan]), [[1_000_000, 1_000_000]], "V2.6: số đang giữ gồm phần chuyển khoản chờ xác nhận");
  assert.equal((await nopVe(w, id, 1_000_000)).status, 201);
  const r = await xacNhanCk(w, ck);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "held_already_settled");
  assert.equal(r.json.error.message, "Khoản này đã được ghi nộp — nếu tiền cũng đã về tài khoản công ty thì đảo lần nộp trước rồi xác nhận.");
  assert.equal(await soCuaToi(w, HDV), 0, "sổ của HDV không âm");
  assert.deepEqual((await w.call("GET", `/api/orders/${id}/payments`, { as: KT })).json.keToan.choXacNhan, [], "V2.3: sau khi nộp, khoản không còn ở danh sách chờ xác nhận");
});

test("VP-01 (Đ2, Đ2b) thứ tự 2 (qua API): 'Xác nhận đã nhận' → 'Đã nộp' 1.000.000 → 409 vượt số đang giữ; sổ của HDV = 0", async () => {
  const w = setup();
  const id = donDaXacNhan(w, { total: 1_000_000 });
  assert.equal((await thu(w, HDV, id, { soTien: 1_000_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201);
  const ck = one(w, "SELECT id FROM bil_payment_receipt WHERE order_id = ? AND collector_role_code = 'COMPANY'", id)!.id as string;
  assert.equal((await xacNhanCk(w, ck)).status, 200);
  const r = await nopVe(w, id, 1_000_000);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "settlement_exceeds_held");
  assert.match(r.json.error.message, /vượt số người này đang giữ cho đơn/);
  assert.equal(await soCuaToi(w, HDV), 0);
});

test("Đ2: nộp một phần trong số đang giữ được; nộp cho người KHÔNG giữ → 409; công ty 'trả' quá số công ty đang nợ → 409", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(400_000));
  assert.equal((await nopVe(w, id, 150_000)).status, 201);
  assert.equal((await nopVe(w, id, 250_001)).status, 409);
  assert.equal((await nopVe(w, id, 250_000)).status, 201);
  assert.equal((await nopVe(w, id, 1, `pty-${HDV2}`)).json.error.code, "settlement_exceeds_held", "người không giữ tiền");
  const tra = await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "tra", partyId: `pty-${HDV}`, phanBo: [{ orderId: id, soTien: 1 }] } });
  assert.equal(tra.status, 409, tra.text);
  assert.equal(tra.json.error.code, "settlement_exceeds_owed");
  assert.equal(await soCuaToi(w, HDV), 0);
});

test("Đ2b: đảo một lần thu tiền mặt ĐÃ được nộp bù → 409 (đảo lần nộp trước); đảo lần nộp rồi đảo lần thu → được", async () => {
  const w = setup();
  const id = donDaXacNhan(w);
  await thu(w, HDV, id, tienMat(300_000));
  assert.equal((await nopVe(w, id, 300_000)).status, 201);
  const thuId = one(w, "SELECT id FROM bil_payment_receipt WHERE order_id = ? AND kind_code = 'CUSTOMER_PAYMENT'", id)!.id as string;
  const dao = (body: Record<string, unknown>) => w.call("POST", "/api/ledger/adjustments", { as: KT, body: { lyDo: "Ghi nhầm người thu", ...body } });
  const r = await dao({ loai: "dao_lan_thu", receiptId: thuId });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "held_already_settled");
  const nopLine = one(w, "SELECT id FROM bil_debt_line WHERE order_id = ? AND kind_code = 'SETTLEMENT'", id)!.id as string;
  assert.equal((await dao({ loai: "dao_dong", lineId: nopLine })).status, 201, "đảo lần nộp (sửa sai đường nhầm)");
  assert.equal((await dao({ loai: "dao_lan_thu", receiptId: thuId })).status, 201);
  assert.equal(await soCuaToi(w, HDV), 0);
});
