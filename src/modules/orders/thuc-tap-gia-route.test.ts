// ADR-0100 (accepted 2026-10-03; K-B-1 của kiểm toán toàn Nền tảng 12/10) — tài khoản có quyền Thực tập (INTERN) theo luật giá R2/R3 của Đối tác (ADR-0027 Đ2):
// đơn giá mọi dòng = giá danh mục, giảm giá cấp đơn = 0, ở CẢ BA cổng (lập đơn POST, sửa nháp PUT, xác nhận POST …/status), KỂ CẢ khi kèm quyền nội bộ khác
// ("có quyền Thực tập là áp"). Chạy trên khung thử (ỨNG DỤNG THẬT + SQLite dựng từ migrations). Trước bản vá, máy chủ chỉ xét `holdsPartner`: Thực tập lập đơn
// giá 100.000 cho dịch vụ danh mục 500.000, giảm thêm, tự xác nhận → 201 rồi 200 (người kiểm độc lập tái hiện 12/10); Đối tác cùng thao tác → 403.
// Bản e2e trên API thật: tests/e2e/nhap-tay-va-gia-doi-tac.mjs (mục ADR-0100). Luật thuần: price-guards.test.ts, src/shared/permissions.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), ADMIN = U(2), SUPER = U(3), PARTNER = U(4), INTERN = U(5), INTERN_SALES = U(6), INTERN_ADMIN = U(7), INTERN_FIELD = U(8), PARTNER_INTERN = U(9);
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const GIA = 500000; // giá danh mục người lớn của ZA1
const catalogSvc = (unitPrice?: number) => ({
  kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: GIA }, departDate: inDays(3),
  ...(unitPrice === undefined ? {} : { unitPrices: { adult: unitPrice } }),
});
const donBody = (services: unknown[], extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services, ...extra });

const CAU_THUC_TAP = "Tài khoản Thực tập chỉ dùng giá danh mục, không giảm giá — nhờ nhân viên Bán hàng nếu cần giá khác.";
const CAU_GIA_DOI_TAC = "Tài khoản đối tác dùng đúng giá bán lẻ theo danh mục; muốn giá khác, nhờ văn phòng.";
const CAU_GIAM_DOI_TAC = "Tài khoản đối tác chưa được giảm giá: mức giảm tối đa bằng mức chiết khấu Tour Đảo dành cho đối tác, mà mức này chưa được thiết lập. Muốn giảm cho khách, nhờ văn phòng.";

function setup() {
  const w = world();
  const ai: [string, string, string[]][] = [
    [SALES, "0900000001", ["SALES"]], [ADMIN, "0900000002", ["ADMIN"]], [SUPER, "0900000003", ["SUPER_ADMIN"]], [PARTNER, "0900000004", ["PARTNER"]],
    [INTERN, "0900000005", ["INTERN"]], [INTERN_SALES, "0900000006", ["SALES", "INTERN"]], [INTERN_ADMIN, "0900000007", ["ADMIN", "INTERN"]],
    [INTERN_FIELD, "0900000008", ["FIELD", "INTERN"]], [PARTNER_INTERN, "0900000009", ["PARTNER", "INTERN"]],
  ];
  for (const [id, phone, perms] of ai) seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-1)}`, perms });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
type W = ReturnType<typeof setup>;
const soDon = (w: W) => w.q("SELECT count(*) AS n FROM orders")[0].n as number;
const tao = (w: W, as: string, svc = catalogSvc(), extra: Record<string, unknown> = {}) => w.call("POST", "/api/orders", { as, body: donBody([svc], extra) });
const sua = (w: W, as: string, don: any, svc = catalogSvc(), extra: Record<string, unknown> = {}) =>
  w.call("PUT", `/api/orders/${don.id}`, { as, body: donBody([svc], { expectedUpdatedAt: don.updatedAt, ...extra }) });
const xacNhan = (w: W, as: string, id: string) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const trangThai = (w: W, id: string) => w.q("SELECT status FROM orders WHERE id = ?", id)[0].status as string;
/** Làm lệch đơn NHÁP đã lưu bằng SQL — đúng như một đơn nháp CŨ lập trước bản vá (API ngày nay không nhận). */
const lamLechGia = (w: W, id: string, donGia: number) => {
  w.sqlite.prepare("UPDATE order_item SET unit_price = ?, line_total = quantity * ? WHERE order_id = ?").run(donGia, donGia, id);
  w.sqlite.prepare("UPDATE orders SET subtotal = ?, total = ? - discount, remaining_amount = ? - discount - deposit_amount WHERE id = ?").run(2 * donGia, 2 * donGia, 2 * donGia, id);
};
const lamCoGiamGia = (w: W, id: string, giam: number) =>
  w.sqlite.prepare("UPDATE orders SET discount = ?, total = subtotal - ?, remaining_amount = subtotal - ? - deposit_amount WHERE id = ?").run(giam, giam, giam, id);

/** Mọi tài khoản BỊ áp luật giá của Thực tập: [tên, id, câu báo mong đợi]. Có quyền Thực tập là áp, kể cả kèm quyền nội bộ; kèm Đối tác thì câu của Đối tác. */
const BI_AP: [string, string, { gia: string; giam: string }][] = [
  ["Thực tập", INTERN, { gia: CAU_THUC_TAP, giam: CAU_THUC_TAP }],
  ["Thực tập + Bán hàng", INTERN_SALES, { gia: CAU_THUC_TAP, giam: CAU_THUC_TAP }],
  ["Thực tập + Quản trị", INTERN_ADMIN, { gia: CAU_THUC_TAP, giam: CAU_THUC_TAP }],
  ["Thực tập + HDV", INTERN_FIELD, { gia: CAU_THUC_TAP, giam: CAU_THUC_TAP }],
  ["Thực tập + Đối tác", PARTNER_INTERN, { gia: CAU_GIA_DOI_TAC, giam: CAU_GIAM_DOI_TAC }],
];
const chan = (r: { status: number; json: any; text: string }, cau: string, ten: string) => {
  assert.equal(r.status, 403, `${ten}: ${r.text}`);
  assert.equal(r.json.error.code, "forbidden", ten);
  assert.equal(r.json.error.message, cau, ten);
};

test("(i)(ii)(v) lập đơn: Thực tập (đứng một mình hoặc kèm Bán hàng / Quản trị / HDV) — đơn giá thấp hơn hoặc cao hơn danh mục, hoặc giảm giá > 0 → 403, KHÔNG lưu đơn", async () => {
  const w = setup();
  for (const [ten, who, cau] of BI_AP) {
    chan(await tao(w, who, catalogSvc(100000)), cau.gia, `${ten}: đơn giá 100.000 (danh mục 500.000)`);
    chan(await tao(w, who, catalogSvc(GIA + 10000)), cau.gia, `${ten}: đơn giá cao hơn danh mục`);
    chan(await tao(w, who, catalogSvc(), { discount: 50000 }), cau.giam, `${ten}: đúng giá + giảm 50.000`);
    chan(await tao(w, who, catalogSvc(), { discount: 1 }), cau.giam, `${ten}: giảm 1₫`);
    chan(await tao(w, who, catalogSvc(100000), { discount: 50000 }), cau.gia, `${ten}: lệch giá + giảm — giá được xét trước`);
  }
  assert.equal(soDon(w), 0, "bị chặn thì không lưu đơn nào");
});

test("(vi) lập đơn: Thực tập đúng giá danh mục, giảm 0 (mặc định hoặc gửi tường minh) vẫn 201 — làm được việc đúng; tiền do máy chủ tính", async () => {
  const w = setup();
  for (const [ten, who] of BI_AP) {
    for (const [cach, svc, extra] of [["mặc định", catalogSvc(), {}], ["đơn giá tường minh = giá danh mục, giảm 0", catalogSvc(GIA), { discount: 0 }]] as [string, ReturnType<typeof catalogSvc>, Record<string, unknown>][]) {
      const r = await tao(w, who, svc, extra);
      assert.equal(r.status, 201, `${ten} (${cach}): ${r.text}`);
      assert.deepEqual([r.json.order.subtotal, r.json.order.discount, r.json.order.total], [2 * GIA, 0, 2 * GIA], `${ten} (${cach})`);
    }
  }
  assert.equal(soDon(w), BI_AP.length * 2);
});

test("(iii)(v) sửa nháp: Thực tập sửa sang giá lệch hoặc thêm giảm giá → 403, đơn KHÔNG đổi; giữ giá + không giảm, đổi ghi chú → 200", async () => {
  const w = setup();
  for (const [ten, who, cau] of BI_AP) {
    const t = await tao(w, who);
    assert.equal(t.status, 201, `${ten}: ${t.text}`);
    const don = t.json.order;
    chan(await sua(w, who, don, catalogSvc(100000)), cau.gia, `${ten}: PUT hạ đơn giá`);
    chan(await sua(w, who, don, catalogSvc(GIA + 1)), cau.gia, `${ten}: PUT nâng đơn giá`);
    chan(await sua(w, who, don, catalogSvc(), { discount: 50000 }), cau.giam, `${ten}: PUT thêm giảm giá`);
    const nay = w.q("SELECT updated_at, discount, subtotal FROM orders WHERE id = ?", don.id)[0];
    assert.deepEqual([nay.updated_at, nay.discount, nay.subtotal], [don.updatedAt, 0, 2 * GIA], `${ten}: bị từ chối thì đơn không đổi`);
    const ok = await sua(w, who, don, catalogSvc(), { discount: 0, customerNote: "sửa ghi chú" });
    assert.equal(ok.status, 200, `${ten}: ${ok.text}`);
  }
});

test("(iv)(v) xác nhận: đơn nháp CŨ của Thực tập có dòng lệch giá, hoặc giảm giá đã lưu > 0 (chèn thẳng bằng SQL) → 403, đơn vẫn nháp; sửa về đúng thì xác nhận 200", async () => {
  const w = setup();
  for (const [ten, who, cau] of BI_AP) {
    const lech = (await tao(w, who)).json.order;
    lamLechGia(w, lech.id, 10000);
    chan(await xacNhan(w, who, lech.id), cau.gia, `${ten}: xác nhận nháp cũ lệch giá`);
    assert.equal(trangThai(w, lech.id), "draft", `${ten}: vẫn là nháp`);

    const giam = (await tao(w, who)).json.order;
    lamCoGiamGia(w, giam.id, 5000);
    chan(await xacNhan(w, who, giam.id), cau.giam, `${ten}: xác nhận nháp cũ có giảm giá đã lưu`);
    assert.equal(trangThai(w, giam.id), "draft", `${ten}: vẫn là nháp`);
    // Cách gỡ: sửa giảm giá về 0 (PUT) rồi xác nhận.
    const luu = (await w.call("GET", `/api/orders/${giam.id}`, { as: who })).json.order;
    const sua0 = await sua(w, who, luu, { ...catalogSvc(), id: luu.services[0].id }, { discount: 0 });
    assert.equal(sua0.status, 200, `${ten}: ${sua0.text}`);
    const xn = await xacNhan(w, who, giam.id);
    assert.equal(xn.status, 200, `${ten}: ${xn.text}`);
    assert.equal(trangThai(w, giam.id), "confirmed");
  }
});

test("(vi) xác nhận: Thực tập tự xác nhận đơn mình lập đúng giá danh mục, không giảm → 200 (ADR-0100 Đ5: giữ nguyên việc tự xác nhận)", async () => {
  const w = setup();
  for (const [ten, who] of BI_AP) {
    const t = await tao(w, who);
    assert.equal(t.status, 201, `${ten}: ${t.text}`);
    const xn = await xacNhan(w, who, t.json.order.id);
    assert.equal(xn.status, 200, `${ten}: ${xn.text}`);
  }
});

test("(vii) đối chứng: Bán hàng, Quản trị, Toàn quyền vẫn đặt giá thoả thuận và giảm giá (201, sửa 200, xác nhận 200); Đối tác vẫn 403 với câu của Đối tác", async () => {
  const w = setup();
  for (const [ten, who] of [["Bán hàng", SALES], ["Quản trị", ADMIN], ["Toàn quyền", SUPER]] as [string, string][]) {
    const r = await tao(w, who, catalogSvc(400000), { discount: 50000 });
    assert.equal(r.status, 201, `${ten}: ${r.text}`);
    assert.deepEqual([r.json.order.subtotal, r.json.order.discount, r.json.order.total], [800000, 50000, 750000], ten);
    const luu = r.json.order;
    const s = await sua(w, who, luu, { ...catalogSvc(300000), id: luu.services[0].id }, { discount: 100000 });
    assert.equal(s.status, 200, `${ten}: ${s.text}`);
    const xn = await xacNhan(w, who, luu.id);
    assert.equal(xn.status, 200, `${ten}: ${xn.text}`);
  }
  chan(await tao(w, PARTNER, catalogSvc(100000)), CAU_GIA_DOI_TAC, "Đối tác: lệch giá");
  chan(await tao(w, PARTNER, catalogSvc(), { discount: 1 }), CAU_GIAM_DOI_TAC, "Đối tác: giảm giá");
  const dt = (await tao(w, PARTNER)).json.order;
  chan(await sua(w, PARTNER, dt, catalogSvc(), { discount: 1000 }), CAU_GIAM_DOI_TAC, "Đối tác: PUT giảm giá");
  lamLechGia(w, dt.id, 10000);
  chan(await xacNhan(w, PARTNER, dt.id), CAU_GIA_DOI_TAC, "Đối tác: xác nhận nháp cũ lệch giá");
  assert.equal(soDon(w), 3 + 1, "ba đơn nội bộ + một đơn nháp của Đối tác");
});
