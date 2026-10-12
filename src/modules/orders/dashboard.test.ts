// getDashboard() (Trang chủ mới) chạy trên SQLite thật (node:sqlite), schema dựng từ migrations/*.sql — cùng khuôn với dispatch/service.test.ts.
// Trọng tâm: đúng bài học Đợt B (số tiền HIỆN HÀNH, không phải cột gốc) + ngữ nghĩa "chuyến đón hôm nay" (ngày SỚM NHẤT trong các dịch vụ CÓ ngày,
// không phải "có ít nhất một dịch vụ trùng hôm nay") + "chưa có người phụ trách" đếm cả đơn nháp, tập đơn đang có người CHỈ lấy qua hàm tiêm
// (`ctx.ordersWithHandler`, gốc lắp ráp nối vào `dispatch` — ADR-0030 S20-13): `orders` không tự đọc dữ liệu phân công.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";
import { gieoLyDoHuy } from "../../../tests/audit/huy-don.mjs";
import { gieoDongTienKhop } from "../../../tests/audit/dong-tien.mjs";

const DIR = new URL("../../../migrations/", import.meta.url);
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const HERE = new URL("./", import.meta.url).pathname;

type Mod = typeof import("./repository.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    stdin: { contents: 'export * from "./repository";', resolveDir: HERE, loader: "ts" },
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Mod;
}
const { getDashboard } = await loadModule();

/**
 * D1 giả: như thật, `prepare(sql)` TỰ nó đã có `first()`/`all()` (dùng được khi câu không tham số — vài chỗ trong `repository.ts` làm vậy,
 * vd `SELECT COUNT(*) …`), và `bind()` để gắn tham số trước khi gọi `first()`/`all()`. `getDashboard` không dùng `batch()` (chỉ đọc).
 */
interface FakeStatement {
  bind: (...args: SupportedValueType[]) => FakeStatement;
  first: () => Promise<unknown>;
  all: () => Promise<{ results: unknown[] }>;
}
function fakeD1(sqlite: DatabaseSync): D1Database {
  const stmt = (sql: string, bound: SupportedValueType[]): FakeStatement => ({
    bind: (...args: SupportedValueType[]) => stmt(sql, args),
    first: async () => {
      const row = sqlite.prepare(sql).get(...bound);
      return row ? { ...row } : null;
    },
    all: async () => ({ results: sqlite.prepare(sql).all(...bound).map((r) => ({ ...r })) }),
  });
  const db = { prepare: (sql: string) => stmt(sql, []) };
  return db as unknown as D1Database;
}

/** Schema đầy đủ; hai tài khoản (An = s-a, Bình = s-b) được `0012` backfill thành hồ sơ `pty-s-a`/`pty-s-b` (dùng làm party_id người phụ trách). */
function seed(): DatabaseSync {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES.filter((x) => x.slice(0, 4) <= "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  sqlite.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-a', 'Nguyễn Văn An', '0901000001', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z'),
    ('s-b', 'Trần Thị Bình', '0901000002', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z')`);
  for (const f of FILES.filter((x) => x.slice(0, 4) > "0011")) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  return sqlite;
}

const money = { subtotal: 1_000_000, discount: 0, total: 1_000_000, depositAmount: 0, remainingAmount: 1_000_000 };

/** Đơn NHÁP (order_service chỉ chèn được khi đơn còn nháp — trigger `order_service_frozen_insert`, migration 0008).
 * `deposit_method = 'cash'` LUÔN đặt (kể cả cọc 0): trigger `orders_money_insert` (0007) chặn cọc > 0 mà không có phương thức. */
function insertDraftOrder(sqlite: DatabaseSync, o: { id: string; staffId: string; createdAt: string; m?: Partial<typeof money> }): void {
  const m = { ...money, ...o.m };
  sqlite
    .prepare(
      `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, deposit_amount, deposit_method, remaining_amount, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', 'Khách', '0900000000', ?, ?, ?, ?, 'cash', ?, ?, ?)`,
    )
    .run(o.id, `TD-${o.id}`, o.staffId, m.subtotal, m.discount, m.total, m.depositAmount, m.remainingAmount, o.createdAt, o.createdAt);
}

/** Dịch vụ của một đơn còn nháp (chèn trước khi xác nhận). `pickupPlace` có tham số riêng — trước đây hàm này KHÔNG gán được cột này nên
 * mọi ca test có `pickupPlace: null` "pass hờ" (không phân biệt được "đọc đúng dòng" với "luôn null", kiểm độc lập vòng gộp phát hiện). */
function insertService(sqlite: DatabaseSync, s: { id: string; orderId: string; sortOrder?: number; departDate?: string | null; pickupTime?: string | null; pickupPlace?: string | null; name?: string }): void {
  sqlite
    .prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date, pickup_time, pickup_place) VALUES (?, ?, ?, NULL, ?, 'manual', 1, ?, ?, ?)`)
    .run(s.id, s.orderId, s.sortOrder ?? 0, s.name ?? "Dịch vụ", s.departDate ?? null, s.pickupTime ?? null, s.pickupPlace ?? null);
  // ADR-0047 (R2a, R3): giờ/nơi đón nay ĐỌC từ chặng đưa đón — cột cũ chỉ là bản sao ghi kép. Có dữ liệu đón thì gieo luôn một chặng chiều đi (đúng như
  // migration 0034 chép: ngày đón = ngày đi, nơi trống → "(chưa ghi nơi đón)").
  if (s.pickupTime != null || s.pickupPlace != null) {
    sqlite
      .prepare(
        `INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_time, pickup_place, created_at, updated_at)
         VALUES (?, ?, ?, 'OUT', ?, ?, ?, '2026-09-24T00:00:00.000Z', '2026-09-24T00:00:00.000Z')`,
      )
      .run(`leg-${s.id}`, s.orderId, s.id, s.departDate ?? null, s.pickupTime ?? null, s.pickupPlace ?? "(chưa ghi nơi đón)");
  }
}

/**
 * Dịch vụ TỪ DANH MỤC (đủ `catalog_code` + một dòng `order_item` có `catalog_price`), CHÈN LÚC ĐƠN CÒN NHÁP (như `insertService`) — cần cho các
 * ca kiểm "đơn có điều chỉnh tiền" (Đợt E task 7): sau bản sửa, tiền hiệu lực của một đơn CÓ điều chỉnh được TỰ TÍNH LẠI từ order_service/order_item
 * GỐC (`getServicesForSubtotal`/`effectiveSubtotal`, KHÔNG còn đọc cột `subtotal_after` đã lưu) — dịch vụ NHẬP TAY (`insertService`) không bao giờ
 * được `recomputeService` chấp nhận (catalogCode null), nên KHÔNG đổi tiền được qua điều chỉnh; muốn mô phỏng "tiền đổi sau khi FIELD sửa số khách"
 * phải dùng dịch vụ danh mục như hàm này, kèm `after: [{serviceId, pax}]` tương ứng ở `insertAdjustment`. `priceAdult` × pax ban đầu (mặc định 1) =
 * thành tiền GỐC của dịch vụ; muốn đổi sang tiền MỚI thì đặt lại `pax.adult` trong `after` của điều chỉnh (CÙNG giá `priceAdult` — giá "chụp lúc lập
 * đơn", không đổi qua điều chỉnh, chỉ số khách đổi — đúng Q11).
 */
function insertCatalogService(sqlite: DatabaseSync, s: { id: string; orderId: string; sortOrder?: number; departDate?: string | null; priceAdult: number; paxAdult?: number; name?: string }): void {
  const paxAdult = s.paxAdult ?? 1;
  sqlite
    .prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, ?, 'CAT', ?, 'perPax', ?, ?)`)
    .run(s.id, s.orderId, s.sortOrder ?? 0, s.name ?? "Dịch vụ danh mục", paxAdult, s.departDate ?? null);
  sqlite
    .prepare(
      `INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, detail, quantity, unit_price, catalog_price, line_total, sort_order)
       VALUES (?, ?, ?, 'CAT', 'adult', ?, NULL, ?, ?, ?, ?, 0)`,
    )
    .run(`${s.id}-it`, s.orderId, s.id, s.name ?? "Dịch vụ danh mục", paxAdult, s.priceAdult, s.priceAdult, paxAdult * s.priceAdult);
}

/** Chuyển đơn (đã có đủ dịch vụ hợp lệ — mọi dịch vụ có ngày + >=1 khách) sang xác nhận, đúng luồng trigger 0008/0017 cho phép. */
function confirm(sqlite: DatabaseSync, id: string, at = "2026-09-24T00:00:00.000Z"): void {
  gieoDongTienKhop(sqlite, id); // 0081 (F-03): xác nhận cần tạm tính = Σ dòng tiền
  sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(at, at, id);
}

/** Đơn ĐÃ xác nhận NGAY từ đầu (INSERT trực tiếp, không qua UPDATE — trigger `orders_confirm_requires_trip`/`order_service_frozen_insert` chỉ bắt UPDATE),
 * KHÔNG có dịch vụ nào — mô phỏng "đơn không có dịch vụ nào có ngày đón" một cách hợp lệ ở tầng CSDL (không cần gỡ trigger). */
function insertConfirmedOrderNoServices(sqlite: DatabaseSync, o: { id: string; staffId: string; createdAt: string; m?: Partial<typeof money> }): void {
  const m = { ...money, ...o.m };
  sqlite
    .prepare(
      `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, deposit_amount, deposit_method, remaining_amount, created_at, updated_at, confirmed_at)
       VALUES (?, ?, ?, 'confirmed', 'Khách', '0900000000', ?, ?, ?, ?, 'cash', ?, ?, ?, ?)`,
    )
    .run(o.id, `TD-${o.id}`, o.staffId, m.subtotal, m.discount, m.total, m.depositAmount, m.remainingAmount, o.createdAt, o.createdAt, o.createdAt);
}

function insertAdjustment(sqlite: DatabaseSync, o: { id: string; orderId: string; seq: number; subtotalAfter: number; subtotalBefore?: number; after?: { serviceId: string; pax: { adult: number; child: number; senior: number; infant: number } }[] }): void {
  sqlite
    .prepare(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, ?, '[]', ?, ?, ?)`)
    .run(o.id, o.orderId, o.seq, JSON.stringify(o.after ?? []), o.subtotalBefore ?? money.subtotal, o.subtotalAfter);
}

function insertHandler(sqlite: DatabaseSync, o: { id: string; orderId: string; partyId: string; from: string; to?: string | null }): void {
  sqlite
    .prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, valid_to_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, ?, ?)`)
    .run(o.id, o.orderId, o.partyId, o.from, o.to ?? null, o.from, o.from);
}

/** Huỷ một đơn (nháp → huỷ hoặc đã xác nhận → huỷ — hai đường trigger `orders_status_transition`, 0017, cho phép). */
function cancel(sqlite: DatabaseSync, id: string, at = "2026-09-24T00:00:00.000Z"): void {
  gieoLyDoHuy(sqlite, id);
  sqlite.prepare(`UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(at, id);
}

/**
 * Giả hàm tiêm `ctx.ordersWithHandler` (ADR-0030 S20-13; bản thật: `dispatch` → `ordersWithHandler`, nối ở `src/index.ts`). `getDashboard` hỏi
 * "trong các đơn này, đơn nào ĐANG có người phụ trách" rồi đếm phần còn lại — `orders` không tự đọc dữ liệu phân công. `withHandler` = câu trả lời giả
 * của dispatch (chỉ trả những id có trong câu hỏi, như bản thật); `asked` ghi lại từng lần hỏi. Ngữ nghĩa "dòng đã đóng coi như chưa có ai", "hồ sơ
 * không tài khoản vẫn là có người" nay thuộc `dispatch` — bài kiểm ở `src/modules/dispatch/handler-of.test.ts`.
 */
function handlerLookup(withHandler: readonly string[] = []) {
  const asked: string[][] = [];
  const fn = async (orderIds: readonly string[]): Promise<Set<string>> => {
    asked.push([...orderIds]);
    return new Set(withHandler.filter((id) => orderIds.includes(id)));
  };
  return { fn, asked };
}
/** Cho các ca KHÔNG kiểm `unassignedCount`: không đơn nào có người phụ trách. */
const NO_HANDLERS = handlerLookup().fn;

const TODAY = "2026-09-24"; // thứ Năm
const YESTERDAY = "2026-09-23";
const TOMORROW = "2026-09-25";
const WEEK = { from: "2026-09-21", to: "2026-09-27" }; // thứ Hai .. Chủ nhật chứa TODAY

// ---- 1) "Chuyến đón hôm nay" ------------------------------------------------------------------------------------

test("today: chỉ đơn confirmed có dịch vụ SỚM NHẤT (trong các dịch vụ có ngày) = hôm nay — không phải 'có dịch vụ nào đó trùng hôm nay'", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);

  // o1: confirmed, một dịch vụ đúng hôm nay → CÓ trong today.
  insertDraftOrder(sqlite, { id: "o1", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "sv1", orderId: "o1", departDate: TODAY, pickupTime: "08:00" });
  confirm(sqlite, "o1");

  // o2: confirmed, dịch vụ ngày mai (không phải hôm nay) → KHÔNG có.
  insertDraftOrder(sqlite, { id: "o2", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "sv2", orderId: "o2", departDate: TOMORROW });
  confirm(sqlite, "o2");

  // o3: confirmed, 2 dịch vụ — MỘT đúng hôm nay, nhưng dịch vụ SỚM NHẤT là hôm qua → KHÔNG có (bẫy: không phải "EXISTS ngày = hôm nay").
  insertDraftOrder(sqlite, { id: "o3", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "sv3a", orderId: "o3", sortOrder: 0, departDate: YESTERDAY });
  insertService(sqlite, { id: "sv3b", orderId: "o3", sortOrder: 1, departDate: TODAY });
  confirm(sqlite, "o3");

  // o4: confirmed, 2 dịch vụ — SỚM NHẤT là hôm nay, dịch vụ còn lại ngày khác (mai) → VẪN có (không rơi rụng vì "còn dịch vụ khác ngày khác").
  insertDraftOrder(sqlite, { id: "o4", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "sv4a", orderId: "o4", sortOrder: 0, departDate: TODAY, pickupTime: "06:00", pickupPlace: "Khách sạn 4a" });
  insertService(sqlite, { id: "sv4b", orderId: "o4", sortOrder: 1, departDate: TOMORROW });
  confirm(sqlite, "o4");

  // o5: NHÁP, dịch vụ đúng hôm nay → KHÔNG có (chưa xác nhận).
  insertDraftOrder(sqlite, { id: "o5", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "sv5", orderId: "o5", departDate: TODAY });

  // o6: confirmed, KHÔNG có dịch vụ nào (mô phỏng "không dịch vụ nào có ngày đón") → KHÔNG có, không lỗi.
  insertConfirmedOrderNoServices(sqlite, { id: "o6", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.deepEqual(
    data.today.map((o) => o.id),
    ["o4", "o1"], // sắp theo giờ đón của dịch vụ hôm nay: o4 (06:00) trước o1 (08:00)
  );
  const o4 = data.today.find((o) => o.id === "o4")!;
  assert.deepEqual(o4.pax, { adult: 2, child: 0, senior: 0, infant: 0 }, "pax cộng dồn CẢ HAI dịch vụ của đơn");
  assert.deepEqual(o4.trip, { departDate: TODAY, pickupTime: "06:00", pickupPlace: "Khách sạn 4a" }, "trip lấy theo dịch vụ QUYẾT ĐỊNH hôm nay (sv4a — ngày sớm nhất có ngày đón; ở đây trùng với sort_order nhỏ nhất, KHÔNG phải quy tắc chung, xem test 'trip lấy theo dịch vụ QUYẾT ĐỊNH…' bên dưới)");
});

test("tomorrow / dayAfter (góp ý YC-0007, chủ chọn cách A 30/9): CÙNG luật chọn đơn như 'hôm nay' — ngày SỚM NHẤT có ngày = ngày mai / ngày kia, chỉ đơn confirmed, sắp theo giờ đón", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  const KIA = "2026-09-26";
  insertDraftOrder(sqlite, { id: "m1", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "svm1", orderId: "m1", departDate: TOMORROW, pickupTime: "09:00" });
  confirm(sqlite, "m1");
  insertDraftOrder(sqlite, { id: "m2", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "svm2", orderId: "m2", departDate: TOMORROW, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá" });
  confirm(sqlite, "m2");
  // m3: dịch vụ sớm nhất là HÔM NAY, một dịch vụ ngày mai → chỉ ở "hôm nay", không lặp ở "ngày mai".
  insertDraftOrder(sqlite, { id: "m3", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "svm3a", orderId: "m3", sortOrder: 0, departDate: TODAY });
  insertService(sqlite, { id: "svm3b", orderId: "m3", sortOrder: 1, departDate: TOMORROW });
  confirm(sqlite, "m3");
  // m4: nháp ngày mai → không vào. k1: ngày kia. x1: ngày sau ngày kia → không vào khối nào.
  insertDraftOrder(sqlite, { id: "m4", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "svm4", orderId: "m4", departDate: TOMORROW });
  insertDraftOrder(sqlite, { id: "k1", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "svk1", orderId: "k1", departDate: KIA, pickupTime: "06:45" });
  confirm(sqlite, "k1");
  insertDraftOrder(sqlite, { id: "x1", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "svx1", orderId: "x1", departDate: "2026-09-27" });
  confirm(sqlite, "x1");

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.deepEqual(data.today.map((o) => o.id), ["m3"]);
  assert.deepEqual(data.tomorrow.map((o) => o.id), ["m2", "m1"], "ngày mai: theo giờ đón, không có m3 (sớm nhất là hôm nay), không có nháp");
  assert.deepEqual(data.tomorrow[0]!.trip, { departDate: TOMORROW, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá" });
  assert.deepEqual(data.dayAfter.map((o) => o.id), ["k1"]);
});

test("today: đơn có điều chỉnh tiền → total trong danh sách hôm nay là số HIỆN HÀNH, không phải cột gốc (bài học Đợt B)", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  insertDraftOrder(sqlite, { id: "o1", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z", m: { subtotal: 1_000_000, total: 1_000_000, depositAmount: 200_000, remainingAmount: 800_000 } });
  // Dịch vụ DANH MỤC (không phải nhập tay): 10 khách × 100.000 = 1.000.000 gốc — chỉ dịch vụ danh mục mới TÍNH LẠI được qua điều chỉnh
  // (Đợt E task 7: tiền hiệu lực nay TỰ TÍNH LẠI từ order_service/order_item, không còn đọc cột `subtotal_after` đã lưu).
  insertCatalogService(sqlite, { id: "sv1", orderId: "o1", departDate: TODAY, priceAdult: 100_000, paxAdult: 10 });
  confirm(sqlite, "o1");
  // Điều chỉnh giảm còn 4 khách × 100.000 = 400.000 — số MỚI phải tự tính đúng bằng đó, KHÔNG đọc `subtotalAfter` đã lưu (đặt cố ý SAI/rác dưới
  // đây để chứng minh không còn đọc cột này: nếu mã cũ còn đọc, khẳng định dưới sẽ thấy 999 thay vì 400.000).
  insertAdjustment(sqlite, { id: "adj1", orderId: "o1", seq: 1, subtotalBefore: 1_000_000, subtotalAfter: 999, after: [{ serviceId: "sv1", pax: { adult: 4, child: 0, senior: 0, infant: 0 } }] });

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.equal(data.today.length, 1);
  assert.equal(data.today[0]!.total, 400_000, "total = TỰ TÍNH LẠI từ order_item + pax mới (4×100.000), không phải 1.000.000 gốc VÀ không phải cột subtotal_after đã lưu (cố ý đặt = 999 ở trên)");
  assert.ok(!("remainingAmount" in data.today[0]!), "sổ tiền lượt 1: thẻ Trang chủ không mang 'còn lại' (billing trả qua POST /api/ledger/balances)");
});

// Đợt E: sau khi HDV sửa số khách hậu xác nhận, /orders và "Chuyến đón hôm nay" của Trang chủ từng hiện đúng TIỀN nhưng vẫn hiện số khách CŨ
// (order_service.pax_* bị trigger 0008 đóng băng, gốc lỗi là toSummaryDtos() không đọc after_json). Ca này mô phỏng đúng bài học đó ở tầng DB thật.
test("today: đơn có điều chỉnh SỐ KHÁCH → pax trong danh sách hôm nay là số MỚI (after_json), không phải order_service gốc đã đóng băng (bài học Đợt E)", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  insertDraftOrder(sqlite, { id: "e1", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "sve1", orderId: "e1", departDate: TODAY }); // pax_adult mặc định = 1 (insertService)
  confirm(sqlite, "e1");
  insertAdjustment(sqlite, {
    id: "adje1", orderId: "e1", seq: 1, subtotalBefore: money.subtotal, subtotalAfter: money.subtotal,
    after: [{ serviceId: "sve1", pax: { adult: 5, child: 0, senior: 0, infant: 0 } }], // HDV sửa 1 → 5 khách
  });

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.equal(data.today.length, 1);
  assert.deepEqual(data.today[0]!.pax, { adult: 5, child: 0, senior: 0, infant: 0 }, "pax phải là số MỚI (5), không phải 1 (order_service gốc, đã đóng băng)");
});

// ---- 2) "Còn thiếu tiền" — RỜI Trang chủ của orders (sổ tiền lượt 1, ADR-0026 đ9): số đã thu là của billing ⇒ `GET /api/ledger/unpaid-summary`
// (bài ở src/modules/billing/lo-ghi.test.ts). Ở đây chỉ canh: getDashboard không còn trả khối này (orders không đọc bảng bil_).

test("unpaid: không còn trong dữ liệu Trang chủ của orders (chuyển sang billing — GET /api/ledger/unpaid-summary)", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.ok(!("unpaid" in data));
});

test("draftCount: đếm đúng số đơn nháp, không đếm đơn đã xác nhận/huỷ", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  insertDraftOrder(sqlite, { id: "d1", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertDraftOrder(sqlite, { id: "d2", staffId: "s-b", createdAt: "2026-09-20T01:00:00.000Z" });
  insertConfirmedOrderNoServices(sqlite, { id: "d3", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" }); // đã xác nhận, không phải nháp
  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.equal(data.draftCount, 2, "d1, d2 còn nháp; d3 đã xác nhận không tính");
});

// ---- 4) Chưa có người phụ trách --------------------------------------------------------------------------------

test("unassignedCount (ADR-0020 điều 7 M1 = A, ADR-0030 S20-13): đếm đơn NHÁP lẫn đã xác nhận chưa có người; đơn huỷ không đếm; đơn nháp có người không đếm", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  const at = "2026-09-20T01:00:00.000Z";
  insertConfirmedOrderNoServices(sqlite, { id: "c1", staffId: "s-a", createdAt: at }); // đã xác nhận, CÓ người → KHÔNG tính
  insertConfirmedOrderNoServices(sqlite, { id: "c2", staffId: "s-a", createdAt: at }); // đã xác nhận, chưa có người → TÍNH
  insertDraftOrder(sqlite, { id: "d1", staffId: "s-a", createdAt: at }); // nháp, chưa có người → TÍNH (mới: M1 = A)
  insertDraftOrder(sqlite, { id: "d2", staffId: "s-b", createdAt: at }); // nháp của người khác, chưa có người → TÍNH (số toàn công ty)
  insertDraftOrder(sqlite, { id: "d3", staffId: "s-a", createdAt: at }); // nháp, CÓ người → KHÔNG tính
  insertDraftOrder(sqlite, { id: "x1", staffId: "s-a", createdAt: at });
  cancel(sqlite, "x1"); // nháp → huỷ, chưa có người → KHÔNG tính
  insertConfirmedOrderNoServices(sqlite, { id: "x2", staffId: "s-a", createdAt: at });
  cancel(sqlite, "x2"); // đã xác nhận → huỷ, chưa có người → KHÔNG tính

  const lookup = handlerLookup(["c1", "d3"]);
  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, lookup.fn);
  assert.equal(data.unassignedCount, 3, "c2 (đã xác nhận) + d1, d2 (nháp) chưa có người; c1, d3 có người; x1, x2 đã huỷ");
  assert.deepEqual(
    lookup.asked.map((ids) => [...ids].sort()),
    [["c1", "c2", "d1", "d2", "d3"]],
    "hỏi dispatch ĐÚNG MỘT lần, đúng các đơn nháp + đã xác nhận — không hỏi đơn đã huỷ",
  );
});

test("unassignedCount: chỉ tin câu trả lời của hàm tiêm — dòng phân công THẬT trong CSDL không được đọc thẳng từ orders", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  const at = "2026-09-20T01:00:00.000Z";
  // Dữ liệu THẬT của dispatch cố ý NGƯỢC với câu trả lời giả: nếu `getDashboard` còn tự đọc bảng/view phân công, số đếm sẽ lệch.
  insertConfirmedOrderNoServices(sqlite, { id: "u1", staffId: "s-a", createdAt: at });
  insertHandler(sqlite, { id: "h1", orderId: "u1", partyId: "pty-s-a", from: "2026-09-20T02:00:00.000Z" }); // CSDL: có người; hàm tiêm: KHÔNG → TÍNH
  insertConfirmedOrderNoServices(sqlite, { id: "u2", staffId: "s-a", createdAt: at }); // CSDL: không có ai; hàm tiêm: CÓ người → KHÔNG tính
  insertDraftOrder(sqlite, { id: "u3", staffId: "s-a", createdAt: at });
  insertHandler(sqlite, { id: "h3", orderId: "u3", partyId: "pty-s-b", from: "2026-09-20T02:00:00.000Z" }); // CSDL: có người; hàm tiêm: KHÔNG → TÍNH

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, handlerLookup(["u2"]).fn);
  assert.equal(data.unassignedCount, 2, "u1, u3 (hàm tiêm nói chưa có người); u2 có người theo hàm tiêm");
});

// ---- 5) Doanh thu tuần --------------------------------------------------------------------------------------------

test("revenueWeek: đúng người (staff_id), đúng khoảng [đầu thứ Hai, đầu thứ Hai tuần sau) giờ VN, số HIỆN HÀNH", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  const FROM_ISO = "2026-09-20T17:00:00.000Z"; // 00:00 21/09 giờ VN
  const TO_ISO_EXCL = "2026-09-27T17:00:00.000Z"; // 00:00 28/09 giờ VN (đầu thứ Hai TUẦN SAU)

  insertConfirmedOrderNoServices(sqlite, { id: "r1", staffId: "s-a", createdAt: FROM_ISO, m: { subtotal: 100_000, total: 100_000, depositAmount: 0, remainingAmount: 100_000 } }); // đúng biên dưới → TÍNH

  const beforeIso = new Date(new Date(FROM_ISO).getTime() - 1).toISOString();
  insertConfirmedOrderNoServices(sqlite, { id: "r2", staffId: "s-a", createdAt: beforeIso, m: { subtotal: 999_999, total: 999_999, depositAmount: 0, remainingAmount: 999_999 } }); // trước biên dưới 1ms → KHÔNG tính

  const justBeforeToIso = new Date(new Date(TO_ISO_EXCL).getTime() - 1).toISOString();
  insertConfirmedOrderNoServices(sqlite, { id: "r3", staffId: "s-a", createdAt: justBeforeToIso, m: { subtotal: 200_000, total: 200_000, depositAmount: 0, remainingAmount: 200_000 } }); // đúng trước biên trên 1ms → TÍNH

  insertConfirmedOrderNoServices(sqlite, { id: "r4", staffId: "s-a", createdAt: TO_ISO_EXCL, m: { subtotal: 999_999, total: 999_999, depositAmount: 0, remainingAmount: 999_999 } }); // đúng biên trên → KHÔNG tính (nửa-mở)

  insertConfirmedOrderNoServices(sqlite, { id: "r5", staffId: "s-b", createdAt: FROM_ISO, m: { subtotal: 999_999, total: 999_999, depositAmount: 0, remainingAmount: 999_999 } }); // nhân viên khác → KHÔNG tính

  insertDraftOrder(sqlite, { id: "r6", staffId: "s-a", createdAt: FROM_ISO, m: { subtotal: 999_999, total: 999_999, depositAmount: 0, remainingAmount: 999_999 } });
  // r6 vẫn nháp → KHÔNG tính

  // Dịch vụ DANH MỤC 5×100.000=500.000 gốc, điều chỉnh tăng lên 9×100.000=900.000 — số HIỆN HÀNH phải là 900.000, không phải 500.000 gốc
  // (`insertConfirmedOrderNoServices` không dùng được ở đây: cần MỘT dịch vụ danh mục để có gì mà `effectiveSubtotal` tính lại được, order_service
  // chỉ chèn được lúc đơn còn nháp — trigger `order_service_frozen_insert`, nên phải qua `insertDraftOrder` + `confirm()` như các đơn khác).
  insertDraftOrder(sqlite, { id: "r7", staffId: "s-a", createdAt: FROM_ISO, m: { subtotal: 500_000, total: 500_000, depositAmount: 0, remainingAmount: 500_000 } });
  insertCatalogService(sqlite, { id: "svr7", orderId: "r7", departDate: "2026-10-01", priceAdult: 100_000, paxAdult: 5 });
  confirm(sqlite, "r7", FROM_ISO);
  insertAdjustment(sqlite, { id: "adjr7", orderId: "r7", seq: 1, subtotalBefore: 500_000, subtotalAfter: 999, after: [{ serviceId: "svr7", pax: { adult: 9, child: 0, senior: 0, infant: 0 } }] });

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.equal(data.revenueWeek.count, 3, "r1, r3, r7 (đúng người, đúng khoảng, đã xác nhận)");
  assert.equal(data.revenueWeek.total, 100_000 + 200_000 + 900_000);
});

// ---- 6) Doanh thu 7 ngày (Đợt D Task 2 — biểu đồ cột) -------------------------------------------------------------
// Ngày dùng giờ TRƯA (05:00 UTC = 12:00 giờ VN) để tránh mọi tranh cãi biên ngày — không phải mốc 00:00 VN đang thử ở test trên.
const WEEK_DATES = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"]; // T2..CN của WEEK

test("revenueWeek.daily: đơn rải ở NHIỀU NGÀY khác nhau trong tuần → đúng 7 phần tử T2..CN, đúng ngày, đúng số, tổng = revenueWeek.total", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);

  // da1: thứ Hai (21/09), của s-a.
  insertConfirmedOrderNoServices(sqlite, { id: "da1", staffId: "s-a", createdAt: "2026-09-21T05:00:00.000Z", m: { subtotal: 100_000, total: 100_000, depositAmount: 0, remainingAmount: 100_000 } });
  // da2: thứ Tư (23/09), của s-a.
  insertConfirmedOrderNoServices(sqlite, { id: "da2", staffId: "s-a", createdAt: "2026-09-23T05:00:00.000Z", m: { subtotal: 250_000, total: 250_000, depositAmount: 0, remainingAmount: 250_000 } });
  // da3: thứ Ba (22/09), NHƯNG của s-b (nhân viên khác) → KHÔNG được cộng vào daily của s-a.
  insertConfirmedOrderNoServices(sqlite, { id: "da3", staffId: "s-b", createdAt: "2026-09-22T05:00:00.000Z", m: { subtotal: 999_999, total: 999_999, depositAmount: 0, remainingAmount: 999_999 } });

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.equal(data.revenueWeek.daily.length, 7, `daily phải đúng 7 phần tử — thấy ${data.revenueWeek.daily.length}`);
  assert.deepEqual(data.revenueWeek.daily.map((d) => d.date), WEEK_DATES, "daily phải đúng thứ tự ngày T2..CN");
  assert.deepEqual(
    data.revenueWeek.daily.map((d) => d.total),
    [100_000, 0, 250_000, 0, 0, 0, 0],
    `daily phải đúng số theo ngày (21/09=100.000, 23/09=250.000, các ngày khác 0, KHÔNG cộng da3 của s-b) — ${JSON.stringify(data.revenueWeek.daily)}`,
  );
  assert.equal(
    data.revenueWeek.daily.reduce((sum, d) => sum + d.total, 0),
    data.revenueWeek.total,
    "tổng daily phải khớp revenueWeek.total (cùng tập đơn, cùng số hiện hành)",
  );
});

test("revenueWeek.daily: đơn có ĐIỀU CHỈNH tiền → daily dùng số HIỆN HÀNH, không phải subtotal gốc (bài học Đợt B)", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);

  // db1: thứ Ba (22/09), gốc 500.000 nhưng điều chỉnh lên 900.000 (dịch vụ danh mục 5→9 khách × 100.000, xem `insertCatalogService`).
  insertDraftOrder(sqlite, { id: "db1", staffId: "s-a", createdAt: "2026-09-22T05:00:00.000Z", m: { subtotal: 500_000, total: 500_000, depositAmount: 0, remainingAmount: 500_000 } });
  insertCatalogService(sqlite, { id: "svdb1", orderId: "db1", departDate: "2026-10-01", priceAdult: 100_000, paxAdult: 5 });
  confirm(sqlite, "db1", "2026-09-22T05:00:00.000Z");
  insertAdjustment(sqlite, { id: "adjdb1", orderId: "db1", seq: 1, subtotalBefore: 500_000, subtotalAfter: 999, after: [{ serviceId: "svdb1", pax: { adult: 9, child: 0, senior: 0, infant: 0 } }] });

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  const tuesday = data.revenueWeek.daily.find((d) => d.date === "2026-09-22");
  assert.ok(tuesday, `phải có phần tử ngày 2026-09-22 — ${JSON.stringify(data.revenueWeek.daily)}`);
  assert.equal(tuesday!.total, 900_000, `ngày 22/09 phải = 900.000 (số hiện hành sau điều chỉnh), không phải 500.000 gốc — ${JSON.stringify(data.revenueWeek.daily)}`);
  assert.equal(
    data.revenueWeek.daily.reduce((sum, d) => sum + d.total, 0),
    data.revenueWeek.total,
  );
});

test("ADR-0109 bài 7: đơn bớt khách tới giảm giá > tạm tính → thẻ 'hôm nay' Tổng cộng 0; doanh thu tuần và từng ngày cộng 0 (không trừ số âm vào đơn khác)", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  // oAm: 2 NL × 500.000 = 1.000.000, giảm 800.000 → 200.000; điều chỉnh còn 1 NL → max(0, 500.000 − 800.000) = 0. Lập thứ Ba.
  insertDraftOrder(sqlite, { id: "oAm", staffId: "s-a", createdAt: "2026-09-22T05:00:00.000Z", m: { subtotal: 1_000_000, discount: 800_000, total: 200_000, depositAmount: 0, remainingAmount: 200_000 } });
  insertCatalogService(sqlite, { id: "svAm", orderId: "oAm", departDate: TODAY, priceAdult: 500_000, paxAdult: 2 });
  confirm(sqlite, "oAm", "2026-09-22T05:00:00.000Z");
  insertAdjustment(sqlite, { id: "adjAm", orderId: "oAm", seq: 1, subtotalBefore: 1_000_000, subtotalAfter: 500_000, after: [{ serviceId: "svAm", pax: { adult: 1, child: 0, senior: 0, infant: 0 } }] });
  // oThuong: cùng ngày thứ Ba, 300.000 không điều chỉnh — doanh thu tuần phải đúng 300.000 (số âm cũ sẽ kéo xuống 0).
  insertDraftOrder(sqlite, { id: "oThuong", staffId: "s-a", createdAt: "2026-09-22T06:00:00.000Z", m: { subtotal: 300_000, total: 300_000, depositAmount: 0, remainingAmount: 300_000 } });
  insertService(sqlite, { id: "svThuong", orderId: "oThuong", departDate: "2026-10-01" });
  confirm(sqlite, "oThuong", "2026-09-22T06:00:00.000Z");

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.equal(data.today.find((o) => o.id === "oAm")?.total, 0, `thẻ hôm nay — ${JSON.stringify(data.today)}`);
  assert.equal(data.revenueWeek.total, 300_000, "doanh thu tuần cộng 0 cho đơn giảm giá vượt tạm tính");
  assert.equal(data.revenueWeek.daily.find((d) => d.date === "2026-09-22")?.total, 300_000);
  assert.ok(data.revenueWeek.daily.every((d) => d.total >= 0));
});

test("revenueWeek.daily: tuần KHÔNG có đơn nào → vẫn đúng 7 phần tử T2..CN, mỗi phần tử total = 0 (không bỏ trống)", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);
  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.equal(data.revenueWeek.daily.length, 7);
  assert.deepEqual(data.revenueWeek.daily.map((d) => d.date), WEEK_DATES);
  assert.deepEqual(
    data.revenueWeek.daily.map((d) => d.total),
    [0, 0, 0, 0, 0, 0, 0],
  );
});

// ---- Kiểm độc lập (fix round 1): `trip` của mảng `today` phải lấy từ dịch vụ QUYẾT ĐỊNH "hôm nay" (ngày sớm nhất có ngày đón),
// KHÔNG phải dịch vụ sort_order nhỏ nhất (đó là quy ước của summarizeServices(), dùng cho danh sách Đơn hàng — khác mục đích).
test("today: trip lấy theo dịch vụ QUYẾT ĐỊNH hôm nay (ngày sớm nhất có ngày), không phải theo sort_order nhỏ nhất", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);

  // o7: sort_order=0 là NGÀY MAI (giờ 20:00), sort_order=1 là HÔM NAY (giờ 09:00) — dịch vụ quyết định "hôm nay" là sort_order=1,
  // nhưng summarizeServices() (dùng cho listOrders) sẽ chọn sort_order=0 nếu bị dùng nhầm ở đây.
  insertDraftOrder(sqlite, { id: "o7", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "sv7a", orderId: "o7", sortOrder: 0, departDate: TOMORROW, pickupTime: "20:00", pickupPlace: "Khách sạn 7a" });
  insertService(sqlite, { id: "sv7b", orderId: "o7", sortOrder: 1, departDate: TODAY, pickupTime: "09:00", pickupPlace: "Khách sạn 7b" });
  confirm(sqlite, "o7");

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.deepEqual(
    data.today.map((o) => o.id),
    ["o7"],
    "o7 phải có trong today (dịch vụ có ngày sớm nhất = sv7b = hôm nay)",
  );
  const o7 = data.today.find((o) => o.id === "o7")!;
  assert.deepEqual(
    o7.trip,
    { departDate: TODAY, pickupTime: "09:00", pickupPlace: "Khách sạn 7b" },
    "trip phải là của sv7b (dịch vụ quyết định hôm nay), KHÔNG phải sv7a (sort_order nhỏ nhất, ngày mai lúc 20:00)",
  );
});

// ---- Kiểm độc lập (lượt gộp I-1): khoá phá hoà "dịch vụ nào quyết định hôm nay" khi 2 dịch vụ CÙNG ngày sớm nhất mà MỘT dịch vụ
// không nhập giờ đón (pickup_time IS NULL — trường TUỲ CHỌN, trigger xác nhận đơn không đòi, rất hay gặp thật). SQLite xếp NULL TRƯỚC:
// nếu khoá phá hoà chỉ là `pickup_time` thì dòng KHÔNG-CÓ-GIỜ thắng → trip mất cả giờ lẫn nơi đón. Đây là PROBE tái hiện đúng lỗi
// người kiểm đã báo (trip = {departDate, pickupTime: null, pickupPlace: null} dù có dịch vụ 06:15 thật cùng ngày).
test("today: 2 dịch vụ CÙNG ngày sớm nhất, một cái KHÔNG có giờ đón — dịch vụ CÓ giờ đón phải thắng khoá phá hoà (không phải NULL thắng)", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);

  insertDraftOrder(sqlite, { id: "o8", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  // sv8a: KHÔNG nhập giờ đón (tuỳ chọn, hợp lệ) — nếu là dòng thắng khoá phá hoà thì trip sẽ mất giờ/nơi đón.
  insertService(sqlite, { id: "sv8a", orderId: "o8", sortOrder: 0, departDate: TODAY, pickupTime: null, pickupPlace: null });
  // sv8b: CÓ giờ đón + nơi đón, CÙNG ngày hôm nay — phải là dịch vụ quyết định.
  insertService(sqlite, { id: "sv8b", orderId: "o8", sortOrder: 1, departDate: TODAY, pickupTime: "06:15", pickupPlace: "Bến Cầu Đá" });
  confirm(sqlite, "o8");

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.equal(data.today.length, 1, `o8 phải có trong today — ${JSON.stringify(data.today.map((o) => o.id))}`);
  const o8 = data.today.find((o) => o.id === "o8")!;
  assert.equal(o8.trip.pickupTime, "06:15", `trip.pickupTime PHẢI là 06:15 (sv8b, có giờ đón) — thấy ${JSON.stringify(o8.trip)}. Nếu null thì dịch vụ KHÔNG-CÓ-GIỜ đã thắng khoá phá hoà (bug I-1).`);
  assert.equal(o8.trip.pickupPlace, "Bến Cầu Đá", `trip.pickupPlace PHẢI là "Bến Cầu Đá" (sv8b) — thấy ${JSON.stringify(o8.trip)}`);
  assert.deepEqual(
    data.today.map((o) => o.id),
    ["o8"],
  );
});

// Danh sách hiển thị (ORDER BY ngoài): dòng KHÔNG có giờ đón không được nổi lên đầu danh sách "Chuyến đón hôm nay" — phải xuống CUỐI.
test("today: sắp xếp danh sách — đơn KHÔNG có giờ đón (trip.pickupTime null) phải đứng SAU đơn có giờ đón, không nổi lên đầu", async () => {
  const sqlite = seed();
  const db = fakeD1(sqlite);

  // o9: có giờ đón 07:00.
  insertDraftOrder(sqlite, { id: "o9", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "sv9", orderId: "o9", departDate: TODAY, pickupTime: "07:00" });
  confirm(sqlite, "o9");

  // o10: KHÔNG có giờ đón (dịch vụ quyết định duy nhất của đơn không nhập giờ).
  insertDraftOrder(sqlite, { id: "o10", staffId: "s-a", createdAt: "2026-09-20T01:00:00.000Z" });
  insertService(sqlite, { id: "sv10", orderId: "o10", departDate: TODAY, pickupTime: null });
  confirm(sqlite, "o10");

  const data = await getDashboard(db, "s-a", TODAY, WEEK.from, WEEK.to, NO_HANDLERS);
  assert.deepEqual(
    data.today.map((o) => o.id),
    ["o9", "o10"],
    `o9 (có giờ đón) phải đứng TRƯỚC o10 (không có giờ đón) — dòng "—" không được nổi lên đầu danh sách. Thấy thứ tự ${JSON.stringify(data.today.map((o) => o.id))}`,
  );
});
