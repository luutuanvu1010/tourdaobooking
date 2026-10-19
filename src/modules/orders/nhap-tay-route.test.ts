// ADR-0061 (accepted 2026-09-30) — "Dịch vụ nhập tay" có công tắc của Toàn quyền, mặc định TẮT; Đối tác (kể cả tài khoản lai) luôn bị chặn. Chạy trên khung
// thử (ỨNG DỤNG THẬT + SQLite dựng từ migrations): tiêu chí nghiệm thu 1–5 của ADR, mã lỗi từng ca, cả POST lẫn PUT /api/orders; route công tắc
// GET/POST /api/cai-dat/nhap-tay (ghi cần settings.ops = chỉ Toàn quyền, nhật ký không gắn đơn). Bản e2e trên API thật: tests/e2e/nhap-tay-va-gia-doi-tac.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), ADMIN = U(2), SUPER = U(3), FIELD = U(4), INTERN = U(5), PARTNER = U(6), LAI_SALES = U(7), LAI_FIELD = U(8), KE_TOAN = U(9);
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const catalogSvc = () => ({ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) });
const manualSvc = (unitPrice = 400000, extra: Record<string, unknown> = {}) =>
  ({ kind: "manual", pickupChoice: "KHONG_DON", name: "Xe đưa đón riêng", pax: { adult: 2 }, departDate: inDays(3), items: [{ description: "Xe 7 chỗ", detail: "2 chiều", quantity: 2, unitPrice }], ...extra });
const donBody = (services: unknown[], extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services, ...extra });

function setup() {
  const w = world();
  const ai: [string, string, string[]][] = [
    [SALES, "0900000001", ["SALES"]], [ADMIN, "0900000002", ["ADMIN"]], [SUPER, "0900000003", ["SUPER_ADMIN"]], [FIELD, "0900000004", ["FIELD"]],
    [INTERN, "0900000005", ["INTERN"]], [PARTNER, "0900000006", ["PARTNER"]], [LAI_SALES, "0900000007", ["SALES", "PARTNER"]],
    [LAI_FIELD, "0900000008", ["PARTNER", "FIELD"]], [KE_TOAN, "0900000009", ["ACCOUNTING"]],
  ];
  for (const [id, phone, perms] of ai) seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-1)}`, perms });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const soDong = (w: any) => w.q("SELECT count(*) AS n FROM ord_manual_service_policy")[0].n as number;
const bat = (w: any, as: string, on: boolean) => w.call("POST", "/api/cai-dat/nhap-tay", { as, body: { batNhapTay: on } });

test("tiêu chí 1: sau migration công tắc TẮT — không ai (kể cả Toàn quyền) thêm được dịch vụ nhập tay (400 invalid_input, câu 'đang tắt'); GET báo tắt, không ai dùng được", async () => {
  const w = setup();
  for (const who of [SUPER, ADMIN, SALES]) {
    const r = await w.call("POST", "/api/orders", { as: who, body: donBody([catalogSvc(), manualSvc()]) });
    assert.equal(r.status, 400, r.text);
    assert.equal(r.json.error.code, "invalid_input");
    assert.match(r.json.error.message, /^Dịch vụ 2: dịch vụ nhập tay đang tắt/);
  }
  const g = await w.call("GET", "/api/cai-dat/nhap-tay", { as: SUPER });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(g.json, { batNhapTay: false, duocDung: false, doiDuoc: true });
  assert.deepEqual((await w.call("GET", "/api/cai-dat/nhap-tay", { as: SALES })).json, { batNhapTay: false, duocDung: false, doiDuoc: false });
  assert.equal(w.q("SELECT count(*) AS n FROM orders")[0].n, 0);
});

test("tiêu chí 4: Quản trị bật công tắc → 403 forbidden (không thêm dòng); Bán hàng → 403 (cổng quản trị); Toàn quyền → 200 + dòng mới + nhật ký không gắn đơn; gửi lại cùng trạng thái = không ghi", async () => {
  const w = setup();
  const q = await bat(w, ADMIN, true);
  assert.equal(q.status, 403, q.text);
  assert.equal(q.json.error.code, "forbidden");
  assert.equal((await bat(w, SALES, true)).status, 403);
  assert.equal(soDong(w), 1, "chỉ dòng gieo");
  assert.equal((await w.call("POST", "/api/cai-dat/nhap-tay", { as: SUPER, body: { batNhapTay: "có" } })).status, 400, "thân sai dạng");
  const r = await bat(w, SUPER, true);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { batNhapTay: true, duocDung: true, doiDuoc: true });
  assert.equal(soDong(w), 2);
  const nk = w.q("SELECT staff_id, order_id, detail FROM audit_log WHERE action = 'manual_service_policy_changed'");
  assert.deepEqual(nk.map((x: any) => ({ ...x })), [{ staff_id: SUPER, order_id: null, detail: "Bật dịch vụ nhập tay" }]);
  const lai = await bat(w, SUPER, true);
  assert.equal(lai.status, 200);
  assert.equal(soDong(w), 2, "cùng trạng thái: không thêm dòng, không ghi nhật ký");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'manual_service_policy_changed'")[0].n, 1);
  const g = await w.call("GET", "/api/cai-dat/nhap-tay", { as: LAI_SALES });
  assert.deepEqual(g.json, { batNhapTay: true, duocDung: false, doiDuoc: false }, "tài khoản lai Đối tác + Bán hàng: không dùng được");
  assert.equal((await w.call("GET", "/api/cai-dat/nhap-tay", { as: FIELD })).status, 403, "chỉ-HDV không lập đơn → không cần công tắc");
});

test("tiêu chí 2 + 3 (POST): công tắc BẬT — Bán hàng, Quản trị, Toàn quyền 201 (tổng tiền do máy chủ tính); chỉ-HDV 403; Kế toán 403; Thực tập, Đối tác, lai Đối tác+Bán hàng, lai Đối tác+HDV 400 invalid_input", async () => {
  const w = setup();
  assert.equal((await bat(w, SUPER, true)).status, 200);
  for (const who of [SALES, ADMIN, SUPER]) {
    const r = await w.call("POST", "/api/orders", { as: who, body: donBody([catalogSvc(), manualSvc()]) });
    assert.equal(r.status, 201, r.text);
    const o = r.json.order;
    assert.deepEqual([o.services[1].kind, o.services[1].catalogCode, o.subtotal, o.total], ["manual", null, 500000 + 2 * 400000, 1_300_000]);
  }
  const ca: [string, string, number, string, RegExp | null][] = [
    ["chỉ-HDV", FIELD, 403, "forbidden", null],
    ["Kế toán (chưa có tác dụng — không lập đơn)", KE_TOAN, 403, "forbidden", null],
    ["Thực tập", INTERN, 400, "invalid_input", /^Dịch vụ 2: tài khoản này không được dùng dịch vụ nhập tay/],
    ["Đối tác", PARTNER, 400, "invalid_input", /^Dịch vụ 2: tài khoản có quyền Đối tác không dùng được dịch vụ nhập tay/],
    ["lai Đối tác + Bán hàng", LAI_SALES, 400, "invalid_input", /^Dịch vụ 2: tài khoản có quyền Đối tác/],
    ["lai Đối tác + HDV", LAI_FIELD, 400, "invalid_input", /^Dịch vụ 2: tài khoản có quyền Đối tác/],
  ];
  for (const [ten, who, status, code, cau] of ca) {
    const r = await w.call("POST", "/api/orders", { as: who, body: donBody([catalogSvc(), manualSvc()]) });
    assert.equal(r.status, status, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, code, ten);
    if (cau) assert.match(r.json.error.message, cau, ten);
  }
  assert.equal(w.q("SELECT count(*) AS n FROM orders")[0].n, 3, "chỉ ba đơn của Bán hàng, Quản trị, Toàn quyền");
});

test("tiêu chí 3 (PUT sửa nháp): công tắc BẬT — cùng mã với người có order.modify: Thực tập, Đối tác, lai Đối tác+Bán hàng 400; Bán hàng thêm/sửa giá dịch vụ nhập tay 200", async () => {
  const w = setup();
  assert.equal((await bat(w, SUPER, true)).status, 200);
  for (const [ten, who, cau] of [
    ["Thực tập", INTERN, /không được dùng dịch vụ nhập tay/], ["Đối tác", PARTNER, /quyền Đối tác/], ["lai Đối tác + Bán hàng", LAI_SALES, /quyền Đối tác/],
  ] as [string, string, RegExp][]) {
    const tao = await w.call("POST", "/api/orders", { as: who, body: donBody([catalogSvc()]) });
    assert.equal(tao.status, 201, `${ten}: ${tao.text}`);
    const r = await w.call("PUT", `/api/orders/${tao.json.order.id}`, { as: who, body: donBody([catalogSvc(), manualSvc()], { expectedUpdatedAt: tao.json.order.updatedAt }) });
    assert.equal(r.status, 400, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input", ten);
    assert.match(r.json.error.message, cau, ten);
  }
  const tao = await w.call("POST", "/api/orders", { as: SALES, body: donBody([catalogSvc()]) });
  const them = await w.call("PUT", `/api/orders/${tao.json.order.id}`, { as: SALES, body: donBody([catalogSvc(), manualSvc()], { expectedUpdatedAt: tao.json.order.updatedAt }) });
  assert.equal(them.status, 200, them.text);
  const sv = them.json.order.services[1];
  const sua = await w.call("PUT", `/api/orders/${tao.json.order.id}`, {
    as: SALES, body: donBody([catalogSvc(), manualSvc(450000, { id: sv.id, name: "Xe đưa đón VIP" })], { expectedUpdatedAt: them.json.order.updatedAt }),
  });
  assert.equal(sua.status, 200, sua.text);
  assert.deepEqual([sua.json.order.services[1].name, sua.json.order.subtotal], ["Xe đưa đón VIP", 500000 + 2 * 450000]);
});

test("tiêu chí 5: Toàn quyền TẮT lại — đơn đã có dịch vụ nhập tay vẫn mở, gửi nguyên thì lưu được, xác nhận được; sửa tên/giá dòng đó → 400", async () => {
  const w = setup();
  assert.equal((await bat(w, SUPER, true)).status, 200);
  const tao = await w.call("POST", "/api/orders", { as: SALES, body: donBody([catalogSvc(), manualSvc()]) });
  assert.equal(tao.status, 201, tao.text);
  const tat = await bat(w, SUPER, false);
  assert.deepEqual([tat.status, tat.json.batNhapTay], [200, false]);
  assert.equal(w.q("SELECT detail FROM audit_log WHERE action = 'manual_service_policy_changed' ORDER BY rowid DESC LIMIT 1")[0].detail, "Tắt dịch vụ nhập tay");
  const id = tao.json.order.id;
  const sv = tao.json.order.services[1];
  const mo = await w.call("GET", `/api/orders/${id}`, { as: SALES });
  assert.equal(mo.status, 200, mo.text);
  const giaMoi = await w.call("PUT", `/api/orders/${id}`, { as: SALES, body: donBody([catalogSvc(), manualSvc(1, { id: sv.id })], { expectedUpdatedAt: tao.json.order.updatedAt }) });
  assert.equal(giaMoi.status, 400, giaMoi.text);
  assert.match(giaMoi.json.error.message, /^Dịch vụ 2: dịch vụ nhập tay đang tắt/);
  const giu = await w.call("PUT", `/api/orders/${id}`, { as: SALES, body: donBody([catalogSvc(), manualSvc(400000, { id: sv.id })], { expectedUpdatedAt: tao.json.order.updatedAt, customerNote: "giữ nguyên" }) });
  assert.equal(giu.status, 200, giu.text);
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
});

test("kiểm độc lập VỪA-2: hai Toàn quyền bật công tắc CÙNG LÚC (cùng mili-giây, cả hai đã đọc TẮT) — không 500; một 200, một 409 `stale` câu tiếng Việt; bảng đúng một dòng BẬT mới", async () => {
  const w = setup();
  // Đóng băng đồng hồ (ứng dụng chạy CÙNG tiến trình với bài): hai request đọc cùng "bây giờ" ⇒ cùng valid_from_at ⇒ va UNIQUE nếu máy chủ không xử lý.
  const ThatDate = Date;
  const CO_DINH = ThatDate.now() + 60_000;
  class DongHoDung extends ThatDate {
    constructor(...a: unknown[]) {
      if (a.length) super(...(a as [number]));
      else super(CO_DINH);
    }
    static now() {
      return CO_DINH;
    }
  }
  globalThis.Date = DongHoDung as DateConstructor;
  // Chặn lô ghi đầu tiên tới khi request thứ hai cũng tới bước ghi (cả hai đã ĐỌC công tắc = TẮT) — tái hiện đua thật, không phụ thuộc may rủi.
  const goc = w.env.DB.batch.bind(w.env.DB);
  let soLo = 0;
  let mo!: () => void;
  const cong = new Promise<void>((r) => (mo = r));
  const hetGio = setTimeout(() => mo(), 2000);
  w.env.DB.batch = async (cau: unknown[]) => {
    if (++soLo === 2) mo();
    if (soLo <= 2) await cong;
    return goc(cau);
  };
  let kq: { status: number; json: any; text: string }[];
  try {
    kq = await Promise.all([bat(w, SUPER, true), bat(w, SUPER, true)]);
  } finally {
    globalThis.Date = ThatDate;
    clearTimeout(hetGio);
    w.env.DB.batch = goc;
  }
  assert.equal(soLo, 2, "cả hai request đều tới bước ghi (đua thật)");
  const ma = kq.map((r) => r.status).sort();
  assert.ok(!ma.includes(500), `không lỗi thô 500: ${kq.map((r) => r.text).join(" | ")}`);
  assert.deepEqual(ma, [200, 409], `đua thật: một thắng, một 409 — ${kq.map((r) => r.text).join(" | ")}`);
  for (const r of kq.filter((x) => x.status === 409)) {
    assert.equal(r.json.error.code, "stale");
    assert.equal(r.json.error.message, "Công tắc vừa được đổi — tải lại rồi thử lại.");
  }
  assert.deepEqual(w.q("SELECT enabled FROM ord_manual_service_policy ORDER BY valid_from_at").map((x: any) => x.enabled), [0, 1], "đúng một dòng BẬT mới");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'manual_service_policy_changed'")[0].n, 1, "một dòng nhật ký");
});
