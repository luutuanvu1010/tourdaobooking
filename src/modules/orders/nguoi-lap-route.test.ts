// ADR-0067 (chủ duyệt 30/9): `GET /api/orders/nguoi-lap` — danh sách NHỮNG NGƯỜI ĐÃ TỪNG LẬP ĐƠN cho ô "Người lập" của bộ lọc danh sách đơn. Chạy CẢ ứng
// dụng trên SQLite thật (khung tests/audit/harness.mjs). Bài ghim:
//  (a) chín quyền + tài khoản lai: 200 chỉ cho người xem MỌI đơn (ba ô order.view / money.view / contact.view KHÔNG ngữ cảnh);
//  (b) phản hồi chỉ có khoá `id`, `ten`, `ganNhat` (không SĐT, email, trạng thái nghỉ, vai, số đơn, tiền) — bài liệt kê khoá;
//  (c) tập = người đã lập ít nhất một đơn (mọi trạng thái), kể cả người đã nghỉ (chủ: "Hiện, không đánh dấu") và Đối tác ("Chung, không nhãn");
//      xếp theo đơn gần nhất (mới trước) rồi theo tên; `ganNhat` = ngày dân sự giờ Việt Nam của đơn gần nhất;
//  (d) BÀI GHIM HÀNH VI trên cả 512 tập con quyền: route mới 200 ⇔ `GET /api/orders` đi nhánh "xem mọi đơn" (nhận diện bằng KẾT QUẢ: thấy đơn người
//      khác lập mà không ai phụ trách). Thấy chặn thật 30/9 (docs/SO-HANG-RAO.md): đổi tạm `money.view` ACCOUNTING = "own" trong src/shared/permissions.ts
//      (khung thử bundle lại từ mã nguồn) VÀ bỏ câu hỏi `money.view` khỏi route mới → đỏ; hoàn nguyên → xanh. Chỉ một trong hai sửa thì vẫn xanh (hai tập
//      đều đổi theo) — đúng ý bài: nó ghép hai CỬA, không ghép giá trị ô.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES } from "../../shared/permissions.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES_B = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const DRIVER = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const DRIVER_P = "66666666-6666-4666-8666-bbbbbbbbbbbb";
const LAI_SALES_HDV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // SALES + FIELD
const LAI_HDV_TT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // FIELD + INTERN
const NGHI = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"; // Bán hàng đã nghỉ việc
const CHUA_LAP = "ffffffff-ffff-4fff-8fff-ffffffffffff"; // Bán hàng chưa lập đơn nào

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES_B, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000006", name: "Tài xế", perms: ["DRIVER"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác Hoa", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  seedStaff(w.sqlite, { id: DRIVER_P, phone: "0900000010", name: "Tài xế đối tác", perms: ["DRIVER_PARTNER"] });
  seedStaff(w.sqlite, { id: LAI_SALES_HDV, phone: "0900000011", name: "Lai Bán Hướng", perms: ["SALES", "FIELD"] });
  seedStaff(w.sqlite, { id: LAI_HDV_TT, phone: "0900000012", name: "Lai Hướng Tập", perms: ["FIELD", "INTERN"] });
  seedStaff(w.sqlite, { id: NGHI, phone: "0900000013", name: "Cường", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: CHUA_LAP, phone: "0900000014", name: "Dung", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
async function donMoi(w: any, as: string, extra: Record<string, unknown> = {}): Promise<string> {
  const r = await w.call("POST", "/api/orders", {
    as,
    body: { customerName: "Khách Người Lập", customerPhone: "0912345678", services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }], ...extra },
  });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id;
}
const datGio = (w: any, id: string, iso: string) => w.sqlite.prepare("UPDATE orders SET created_at = ? WHERE id = ?").run(iso, id);

async function duLieu() {
  const w = setup();
  const a1 = await donMoi(w, SALES);
  const a2 = await donMoi(w, SALES);
  const b1 = await donMoi(w, SALES_B, { handlerStaffId: FIELD });
  const p1 = await donMoi(w, PARTNER);
  const n1 = await donMoi(w, NGHI);
  assert.equal((await w.call("POST", `/api/orders/${a2}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y", reason: "Khách đổi ý" } })).status, 200);
  // Mốc lập đơn cố định (đơn huỷ vẫn tính — danh sách đơn của người xem mọi đơn cũng gồm đơn huỷ): An gần nhất = a2, 29/9 18:30 UTC = 30/9 giờ VN.
  datGio(w, a1, "2026-09-20T03:00:00.000Z");
  datGio(w, a2, "2026-09-29T18:30:00.000Z");
  datGio(w, b1, "2026-09-28T10:00:00.000Z");
  datGio(w, p1, "2026-09-28T10:00:00.000Z"); // cùng mốc với Bình → xếp theo tên: "Bình" trước "Đối tác Hoa"
  datGio(w, n1, "2026-08-01T01:00:00.000Z");
  w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${NGHI}'`); // Cường nghỉ việc SAU khi đã lập đơn
  return w;
}

test("ADR-0067: người xem mọi đơn → 200 với đúng tập người đã lập đơn (kể cả Đối tác, người đã nghỉ), xếp theo đơn gần nhất rồi theo tên", async () => {
  const w = await duLieu();
  for (const as of [SALES, ACC, ADM, SUP, LAI_SALES_HDV]) {
    const r = await w.call("GET", "/api/orders/nguoi-lap", { as });
    assert.equal(r.status, 200, `${as}: ${r.text}`);
    assert.deepEqual(r.json.nguoiLap, [
      { id: SALES, ten: "An", ganNhat: "2026-09-30" },
      { id: SALES_B, ten: "Bình", ganNhat: "2026-09-28" },
      { id: PARTNER, ten: "Đối tác Hoa", ganNhat: "2026-09-28" },
      { id: NGHI, ten: "Cường", ganNhat: "2026-08-01" },
    ], `${as}: tập và thứ tự`);
  }
});

test("ADR-0067: HDV, Đối tác, Thực tập, lai HDV + Thực tập → 403 forbidden (bảng quyền); Tài xế, Tài xế đối tác → 403 ở cổng; chưa đăng nhập → 401", async () => {
  const w = await duLieu();
  for (const as of [FIELD, PARTNER, INTERN, LAI_HDV_TT, DRIVER, DRIVER_P]) {
    const r = await w.call("GET", "/api/orders/nguoi-lap", { as });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden");
    assert.doesNotMatch(r.text, /An|Bình|Cường/, "403 không kèm tên");
  }
  assert.equal((await w.call("GET", "/api/orders/nguoi-lap", {})).status, 401);
});

test("ADR-0067: phản hồi CHỈ có khoá id, ten, ganNhat — không SĐT, email, trạng thái nghỉ, vai, số đơn, tiền; người chưa lập đơn không có mặt", async () => {
  const w = await duLieu();
  const r = await w.call("GET", "/api/orders/nguoi-lap", { as: ACC });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json), ["nguoiLap"]);
  for (const x of r.json.nguoiLap) {
    assert.deepEqual(Object.keys(x).sort(), ["ganNhat", "id", "ten"], JSON.stringify(x));
    assert.match(x.ganNhat, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.doesNotMatch(r.text, /09000000|0912345678|active|permission|role|SALES|PARTNER/i, "không SĐT, không cờ nghỉ, không mã quyền/vai");
  assert.ok(!r.json.nguoiLap.some((x: any) => x.id === CHUA_LAP), "người chưa lập đơn nào không có mặt");
});

test("ADR-0067: route khớp trước /api/orders/:id — chưa ai lập đơn thì 200 với danh sách rỗng (không phải 404 'không tìm thấy đơn')", async () => {
  const w = setup();
  const r = await w.call("GET", "/api/orders/nguoi-lap", { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { nguoiLap: [] }, "chưa ai lập đơn → danh sách rỗng");
});

test("ADR-0067 bài ghim hành vi: trên cả 1024 tập con quyền — /api/orders/nguoi-lap 200 ⇔ GET /api/orders đi nhánh 'xem mọi đơn'", async () => {
  const w = world();
  // Tập con của HÀM THUẦN, không phải tài khoản hợp lệ: LC-1b (ADR-0048) cấm DRIVER_PARTNER đi cùng quyền khác ở tầng CSDL — gỡ trigger trên SQLite TẠM
  // của bài này để đi được mọi tập (đúng khuôn bài 512 tập ở src/shared/permissions.test.ts).
  w.sqlite.exec("DROP TRIGGER lc1b_stf_permission_driver_partner_alone");
  const LAP = "12121212-1212-4121-8121-121212121212";
  seedStaff(w.sqlite, { id: LAP, phone: "0900009999", name: "Người Lập Chứng", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  const chung = await donMoi(w, LAP); // đơn "chứng": người khác lập, KHÔNG ai phụ trách → chỉ nhánh "xem mọi đơn" thấy
  let soXemMoi = 0;
  let soKhong = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const perms = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const id = `00000000-0000-4000-8000-${mask.toString(16).padStart(12, "0")}`;
    seedStaff(w.sqlite, { id, phone: `07${String(mask).padStart(8, "0")}`, name: `Tập ${mask}`, perms });
    const ten = perms.join("+") || "(không quyền)";
    const ds = await w.call("GET", "/api/orders?limit=100", { as: id });
    const nl = await w.call("GET", "/api/orders/nguoi-lap", { as: id });
    // 500 không được lẩn vào vế "không 200" của cả hai bên.
    assert.ok([200, 403].includes(ds.status), `${ten}: GET /api/orders → ${ds.status} ${ds.text}`);
    assert.ok([200, 403].includes(nl.status), `${ten}: GET /api/orders/nguoi-lap → ${nl.status} ${nl.text}`);
    const xemMoi = ds.status === 200 && ds.json.orders.some((o: any) => o.id === chung);
    assert.equal(nl.status === 200, xemMoi, `${ten}: route người lập ${nl.status} nhưng danh sách đơn ${xemMoi ? "ĐI" : "KHÔNG đi"} nhánh xem mọi đơn`);
    if (xemMoi) {
      soXemMoi++;
      assert.deepEqual(nl.json.nguoiLap.map((x: any) => x.id), [LAP], `${ten}: danh sách người lập`);
    } else soKhong++;
  }
  assert.equal(soXemMoi + soKhong, 1024); // 10 mã quyền (ADR-0071 thêm HR)
  assert.ok(soXemMoi > 0 && soKhong > 0, `bài không rỗng hai vế (xem mọi: ${soXemMoi}, không: ${soKhong})`);
});
