// BÀI NỐI (Sửa 5 sau rà soát «Sổ đại lý đợt 2», Ruling R-156): bảng «Ghi mức tay» tính câu cảnh báo hạ mức TRƯỚC khi lưu bằng `canhBaoHaMucTay` (giao diện, dữ liệu =
// `GET /api/orders/:id/thuong-mai` + `giamGiaHieuLuc` của `GET /api/orders/:id`); máy chủ sau khi ghi trả tổng hoa hồng mới. Bài này chạy CẢ ứng dụng trên khung thử
// (tests/audit/harness.mjs) và đòi số giao diện báo trước = số máy chủ ra sau khi lưu (một đồng không lệch), và lưu vẫn được (cảnh báo, không chặn — ADR-0079 điều 8).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { canhBaoHaMucTay, docThanGhiTay, type FormGhiTay } from "../../shared/phan-doi-tac-hien-thi.ts";
import { chenhGiamGiaSauGhiTay } from "../../shared/hoa-hong-dong.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const SUPER = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const PT = "66666666-6666-4666-8666-666666666666";
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const vnd = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;
let seq = 0;
const uuid = () => `96969696-9696-4969-8969-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

async function setup(): Promise<W> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [SUPER, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [PT, "0900000008", "Đại Lý A", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-hm-dl', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${PT}`, AT, AT);
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(m.status, 201, m.text);
  return w;
}

/** Đơn đại lý A: Hòn Tằm 1.000.000 (1 khách), giảm `giam`; xác nhận qua route (máy chủ chụp 10% = 100.000). */
async function don(w: W, giam: number): Promise<{ id: string; svc: string }> {
  const id = uuid();
  const sub = 1_000_000;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?, ?)`).run(id, `TD-HM-${seq}`, SALES, sub, giam, sub - giam, sub - giam, `pty-${PT}`, AT, AT);
  const svc = `${id}-s0`;
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'HONTAM', 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(svc, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, ?, ?, ?)`)
    .run(`${svc}-i`, id, svc, sub, sub, sub);
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SUPER, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  return { id, svc };
}

const form = (p: Partial<FormGhiTay>): FormGhiTay => ({ kieu: "RATE", tyLe: "", moiKhach: "", nguoiBan: { loai: "KHONG_DOI" }, lyDo: "Hợp đồng mới với đại lý từ tháng này", ...p });

for (const [ten, f, tongMoi] of [
  ["hạ 10% xuống 5%", form({ tyLe: "5" }), 50_000],
  ["đổi sang 30.000 mỗi khách", form({ kieu: "PER_PAX", moiKhach: "30.000" }), 30_000],
] as const) {
  test(`R-156 bài nối (${ten}): đơn 1.000.000 hoa hồng 100.000 giảm 100.000 ⇒ giao diện báo trước chênh = giảm − tổng hoa hồng máy chủ ra sau khi lưu; lưu vẫn được (200)`, async () => {
    const w = await setup();
    const { id, svc } = await don(w, 100_000);
    const tm = await w.call("GET", `/api/orders/${id}/thuong-mai`, { as: KT });
    assert.equal(tm.status, 200, tm.text);
    const dto = tm.json.vanPhong;
    assert.equal(dto.tong.hoaHong, 100_000);
    const dh = await w.call("GET", `/api/orders/${id}`, { as: KT });
    assert.equal(dh.status, 200, dh.text);
    const giamGiaHieuLuc = dh.json.order.giamGiaHieuLuc as number;
    assert.equal(giamGiaHieuLuc, 100_000);
    const cau = canhBaoHaMucTay({ dto, serviceId: svc, form: f, giamGiaHieuLuc, dinhDang: vnd });
    assert.ok(cau, "phải cảnh báo trước khi lưu");
    const body = docThanGhiTay(f, null);
    assert.ok(body.ok);
    const truoc = chenhGiamGiaSauGhiTay({ dong: dto.dong, serviceId: svc, moi: body.body.hoaHong!, giamGiaHieuLuc });
    const ghi = await w.call("POST", `/api/orders/${id}/thuong-mai/${svc}`, { as: KT, body: body.body });
    assert.equal(ghi.status, 200, ghi.text);
    assert.equal(ghi.json.vanPhong.tong.hoaHong, tongMoi, "máy chủ ra tổng mới");
    assert.deepEqual(truoc, { tongHoaHong: tongMoi, chenh: 100_000 - tongMoi }, "giao diện tính trước đúng số máy chủ");
    assert.ok(cau.includes(vnd(100_000 - tongMoi)), cau);
    // Sau khi lưu, cùng mức nữa không vượt thêm — câu vẫn nói đúng tình trạng (không đổi gì thì vẫn chênh như cũ).
    assert.equal(canhBaoHaMucTay({ dto: ghi.json.vanPhong, serviceId: svc, form: form({ tyLe: "10" }), giamGiaHieuLuc, dinhDang: vnd }), null, "trả lại 10% ⇒ hết cảnh báo");
  });
}

test("R-156: đơn giảm 50.000 hạ xuống 5% (= 50.000) ⇒ không cảnh báo (bằng, không vượt)", async () => {
  const w = await setup();
  const { id, svc } = await don(w, 50_000);
  const dto = (await w.call("GET", `/api/orders/${id}/thuong-mai`, { as: KT })).json.vanPhong;
  assert.equal(canhBaoHaMucTay({ dto, serviceId: svc, form: form({ tyLe: "5" }), giamGiaHieuLuc: 50_000, dinhDang: vnd }), null);
  assert.ok(canhBaoHaMucTay({ dto, serviceId: svc, form: form({ tyLe: "4,99" }), giamGiaHieuLuc: 50_000, dinhDang: vnd }));
});
