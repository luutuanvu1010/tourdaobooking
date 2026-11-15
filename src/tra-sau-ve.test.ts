// Vé của đơn Trả sau mở TRƯỚC khi thu tiền (ADR-0168 Đ3 mục 1; kế hoạch Task 5): bốn route vé (`GET /api/ve/anh/:id`, `POST /api/ve/giao`, `POST /api/ve/duong-dan`,
// `GET /api/ve/don/:orderId`) chỉ hỏi MỘT hàm `moVeDuoc`. Đơn Trả trước chưa thu: vẫn khoá như cũ. Đơn Trả sau quá hạn còn nợ: vé CHƯA mở bị chặn, vé ĐÃ mở vẫn xem được.
// Khung thử điều phối (đồng hồ giả 2027-03-11, kho R2 giả). Tên, mã vé là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, SALES, SUP, batDongHo, don, setup } from "../tests/audit/dieu-phoi-khung.mjs";
import { seedStaff } from "../tests/audit/harness.mjs";
import { cachBayGio, datMocTraSau, datQuaHan } from "../tests/audit/tra-sau-moc.mjs";

const DT = "88888888-8888-4888-8888-888888888801";
const BEN = `pty-${DT}`;
const AT = "2027-01-01T00:00:00.000Z";
const NGAY = "2027-03-11";
const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return u; };
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");

async function nhapKho(w: any, soVe: number) {
  const lo = await w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo" } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: b64(PNG(i + 1)), maVe: `BI.MAT.${i + 1}`, tuNgay: "2027-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: SALES, body: { ve } })).json.themDuoc, soVe);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: SALES, body: {} })).status, 200);
}
function dung() {
  const w = setup();
  seedStaff(w.sqlite, { id: DT, phone: "0900000031", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  return w;
}
/** Đơn Trả sau đã xác nhận: 2 người lớn ZA1 (777.000 × 2 = 1.554.000), bên đặt BEN, hạn mức đủ rộng. */
async function donTraSau(w: any): Promise<{ id: string; phaiThu: number }> {
  const hm = await w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: 10_000_000, gioTra: 168, gioAnHan: 0, lyDo: "thử" } });
  assert.equal(hm.status, 201, hm.text);
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: BEN, paymentTerm: "CREDIT",
      services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY, pickupChoice: "KHONG_DON", legs: [] }],
    },
  });
  assert.equal(r.status, 201, r.text);
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  const phaiThu = (await w.call("GET", `/api/orders/${r.json.order.id}`, { as: SALES })).json.order.total as number;
  return { id: r.json.order.id, phaiThu };
}
const phanBo = (w: any, id: string) => w.q("SELECT id, revealed_at FROM vdt_allocation WHERE order_id = ? AND released_at IS NULL ORDER BY slot_no", id) as { id: string; revealed_at: string | null }[];
const thu = (w: any, id: string, soTien: number) => w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
const anh = (w: any, a: string) => w.call("GET", `/api/ve/anh/${a}`, { as: SALES });
const giao = (w: any, orderId: string) => w.call("POST", "/api/ve/giao", { as: SALES, body: { orderId, requestId: crypto.randomUUID() } });
const duongDan = (w: any, orderId: string) => w.call("POST", "/api/ve/duong-dan", { as: SALES, body: { orderId } });
const lietKe = (w: any, orderId: string) => w.call("GET", `/api/ve/don/${orderId}`, { as: SALES });
const dayHanQuaKhu = (w: any, id: string) => datQuaHan(w.sqlite, id); // hết ân hạn từ hai ngày trước (theo đồng hồ giả của bài)

test("đơn Trả sau đã xác nhận, chưa thu đồng nào: xem ảnh, giao vé, tạo đường dẫn, danh sách vé đều mở", async () => {
  const tat = batDongHo();
  try {
    const w = dung();
    await nhapKho(w, 3);
    const d = await donTraSau(w);
    const ds = phanBo(w, d.id);
    assert.equal(ds.length, 2, "đơn giữ 2 vé");
    const ds0 = await lietKe(w, d.id);
    assert.equal(ds0.status, 200, ds0.text);
    assert.equal(ds0.json.veXem.length, 2, "danh sách vé hiện đủ mã phân bổ để xem");
    assert.equal((await anh(w, ds[0]!.id)).status, 200, "xem ảnh");
    assert.equal((await giao(w, d.id)).status, 200, "giao vé");
    assert.equal((await duongDan(w, d.id)).status, 200, "tạo đường dẫn");
  } finally { tat(); }
});

test("đơn Trả trước chưa thu: bốn đường vẫn khoá như cũ (ADR-0153 Đ3)", async () => {
  const tat = batDongHo();
  try {
    const w = dung();
    await nhapKho(w, 3);
    const d = await don(w, { soNguoi: 2 });
    const ds = phanBo(w, d.id);
    assert.equal((await anh(w, ds[0]!.id)).status, 403);
    assert.equal((await giao(w, d.id)).status, 403);
    assert.equal((await duongDan(w, d.id)).status, 403);
    assert.equal((await lietKe(w, d.id)).json.veXem.length, 0);
  } finally { tat(); }
});

test("đơn Trả sau quá hạn còn nợ: vé CHƯA mở bị chặn ở cả bốn đường; vé ĐÃ mở vẫn xem được", async () => {
  const tat = batDongHo();
  try {
    const w = dung();
    await nhapKho(w, 3);
    const d = await donTraSau(w);
    const [a1, a2] = phanBo(w, d.id);
    assert.equal((await anh(w, a1!.id)).status, 200, "mở một vé khi còn trong hạn");
    dayHanQuaKhu(w, d.id);
    assert.equal((await anh(w, a1!.id)).status, 200, "vé đã mở vẫn xem được dù quá hạn");
    const chan = await anh(w, a2!.id);
    assert.equal(chan.status, 403, chan.text);
    assert.equal((await giao(w, d.id)).status, 403, "giao: còn vé chưa mở");
    assert.equal((await duongDan(w, d.id)).status, 403, "đường dẫn: còn vé chưa mở");
    assert.deepEqual((await lietKe(w, d.id)).json.veXem.map((x: { id: string }) => x.id), [a1!.id], "danh sách chỉ đưa mã phân bổ của vé ĐÃ mở");
    // Trả hết nợ: mở lại
    assert.equal((await thu(w, d.id, d.phaiThu)).status, 201);
    assert.equal((await anh(w, a2!.id)).status, 200, "trả hết thì mở lại");
  } finally { tat(); }
});

test("ADR-0173 tiêu chí 2: đơn quá hạn được «Ân hạn» thì vé chưa mở mở lại", async () => {
  const tat = batDongHo();
  try {
    const w = dung();
    await nhapKho(w, 3);
    const d = await donTraSau(w);
    dayHanQuaKhu(w, d.id);
    const a = phanBo(w, d.id)[0]!;
    assert.equal((await anh(w, a.id)).status, 403, "quá hạn: vé chưa mở bị chặn");
    const r = await w.call("POST", `/api/tra-sau/don/${d.id}/an-han`, { as: SUP, body: { hanMoi: cachBayGio(24), lyDo: "Đại lý hẹn trả mai" } });
    assert.equal(r.status, 200, r.text);
    assert.equal((await anh(w, a.id)).status, 200, "lùi hạn xong: vé mở lại");
  } finally { tat(); }
});

test("ADR-0172 Đ3 mục 3: qua hạn trả nhưng còn trong ân hạn thì chưa chặn — vé chưa mở vẫn mở được", async () => {
  const tat = batDongHo();
  try {
    const w = dung();
    await nhapKho(w, 3);
    const d = await donTraSau(w);
    datMocTraSau(w.sqlite, d.id, cachBayGio(-1), cachBayGio(11));
    assert.equal((await anh(w, phanBo(w, d.id)[0]!.id)).status, 200);
  } finally { tat(); }
});

test("«Đã giao»: cả hai nơi gọi lyDoChuaGiaoDuoc ở billing (màn đơn và route Đã giao) truyền traSau; luật thuần ở src/modules/billing/tra-sau-giao.test.ts", () => {
  // Đơn Trả sau của đối tác hưởng hoa hồng còn bị giữ vì «thiếu mức hoa hồng» trước khi tới lý do tiền, nên bài route không thấy được câu mới; nối dây canh bằng đọc mã.
  const sv = readFileSync(new URL("./modules/billing/service.ts", import.meta.url), "utf8");
  const goi = [...sv.matchAll(/lyDoChuaGiaoDuoc\(\{[\s\S]*?\n  \}\);/g)].map((m) => m[0]);
  assert.equal(goi.length, 2, "hai nơi gọi");
  // Route Đã giao nhận `traSau` từ route (traSauCuaDon — tra-sau.ts đã import service.ts nên không gọi ngược); màn đơn đọc thẳng.
  for (const g of goi) assert.match(g, /traSau: (\(await donTraSauTheoId\(|input\.traSau !== null)/, "truyền cờ Trả sau");
  // Chủ dự án 12/11 «Chặn tới khi nộp»: cả hai nơi truyền số cọc còn ở tay đối tác.
  for (const g of goi) assert.match(g, /cocConGiu: (quyen\.cocConGiu|input\.traSau\?\.cocConGiu)/, "truyền số cọc");
});
