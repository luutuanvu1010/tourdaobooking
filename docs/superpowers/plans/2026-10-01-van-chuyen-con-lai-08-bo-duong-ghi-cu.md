# Đợt 8 — Bỏ đường ghi chặng kiểu cũ (ADR-0047 §6, Phần C — phát hành 2): Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Máy chủ ngừng nhận thân yêu cầu kiểu cũ (giờ đón / nơi đón gửi thẳng trên dịch vụ, không có `legs`) và ngừng ghi kép hai cột `order_service.pickup_time/pickup_place`; hai cột thành cột chết có bài canh — **chỉ sau khi** bộ đếm trên production cho thấy không còn máy nào gửi thân cũ.

**Architecture:** Hai lần phát hành. **Lần A (đo):** một hàm nhận diện thân cũ + một dòng nhật ký `client_outdated_body` (không dữ liệu cá nhân, không gắn đơn) mỗi lần máy chủ nhận thân cũ; không đổi hành vi. Đề xuất gộp vào Đợt 1. **Cổng:** chủ chạy lệnh chỉ-đọc, 7 ngày liền = 0. **Lần B (cắt):** cùng hàm nhận diện → 409 `client_outdated` trước mọi ghi; gỡ `tronChangCu`, gỡ ghi kép + câu đồng bộ cột cũ của route chặng + kiểm định kỳ R-ORD-7 (cùng commit); khai `deprecatedColumns`; bài quét "không ai đọc/ghi hai cột cũ". **Không migration** (Ruling R11 của ADR-0047 đã chốt: không làm trigger khoá cột — giữ khả năng lùi Worker).

**Tech Stack:** Cloudflare Worker + D1, TypeScript, `node --test` (khung `tests/audit/harness.mjs` = cả ứng dụng trên SQLite thật), e2e `tests/e2e/*.mjs`.

**Spec:** `docs/adr/ADR-0047-chang-dua-don-va-danh-sach-hanh-khach.md` (mục 6 / Hệ quả — phát hành 2); kế hoạch gốc `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md:1072-1110` (Phần C, C0–C5) và tiêu chí 25, 26 (dòng 538–539); nhật ký `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong-nhat-ky.md` (R11 dòng 98: không `0036`); lộ trình mẹ `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md` (Đợt 8, Review Focus 5).

---

## Hiện trạng đã đo (2026-10-01, HEAD `0ba370d6`) — người thi công đo lại lúc nhận

**Ai còn ĐỌC hai cột cũ `order_service.pickup_time/pickup_place`:** không ai. Mọi bề mặt đọc giá trị DẪN XUẤT từ chặng (`chieuDiDau`, Ruling R2a đã làm ở phát hành 1).

| Chỗ | Đọc gì thật | Việc ở Đợt 8 |
|---|---|---|
| `src/modules/orders/repository.ts:76-77` `SERVICE_SELECT` (chi tiết đơn, biên nhận `receipt/rules.ts:22`, xác nhận `order-confirmation.ts:198`, thẻ dịch vụ) | không chọn hai cột; DTO `pickupTime/pickupPlace` lấy từ chặng (`repository.ts:180-202`, `derivedPickupByService` :254) | không đổi |
| `repository.ts:380-393` `summaryRows` (danh sách đơn `web/orders.ts:94`, Trang chủ `web/home.ts:108`, hàng chờ HDV `pool.ts`, `web/viec-cua-toi.ts`) | SELECT không có hai cột; gắn khoá TS tên `pickup_time/pickup_place` = dẫn xuất | **đổi tên khoá** sang `pickupTime/pickupPlace` (Task 6) để bài quét không cần cho phép yếu |
| `repository.ts:613-645` "Chuyến đón hôm nay" | dẫn xuất từ chặng (chú thích còn nhắc `os2.pickup_time` cũ) | sửa chú thích (Task 6) |
| `src/modules/orders/index.ts:283,359,368,374`, `dat-gap.ts:39`, `chang-hanh-khach-repo.ts` | cột **cùng tên của `ord_transfer_leg`** (chặng), không phải `order_service` | giữ; cho phép có tên ở bài quét |
| `scripts/audit-checks.mjs:720-735` R-ORD-7 | **đọc** hai cột cũ để so với chặng (kiểm ghi kép) | **gỡ** cùng commit ngừng ghi kép (Task 5) |
| `scripts/audit-checks.mjs:427-429,788` | `l.pickup_*` của chặng | giữ |
| View trong `migrations/` | không view nào chọn từ `order_service` (đã quét `CREATE VIEW`); trigger `0044` chỉ khoá đã giao | — |
| `SELECT *` / `os.*` trên `order_service` | 0 chỗ (`src/`, `scripts/`) | bài quét chặn từ nay (Task 6) |
| Xuất Excel | không có tính năng này trong mã | — |

**Ai còn GHI hai cột cũ (ghi kép R3):** `repository.ts:785-806` (`SERVICE_COLS`/`serviceInserts` — lập đơn, lưu nháp), `repository.ts:1242-1249` (`updateTrip` — `PUT /trip`), `chang-hanh-khach-repo.ts:~370-376` (`SERVICE_MIRROR_UPDATE_GUARDED` — thêm/sửa/bỏ chặng, số người chiều về; tham số `mirror` ở `service.ts:133-255`). `src/architecture.test.ts:167` có tên `orders.service_mirror_update_guarded` trong nợ `DOC_AUDIT_LOG_WONGUARD`.

**Ai còn GỬI thân cũ:**
- Giao diện hiện tại: **không**. Chỉ hai chỗ gửi thân ghi đơn: `web/order-form.ts:443-444` → `collect()` → `toServiceInput` (`src/shared/service-form.ts:375-377` bỏ `pickupTime/pickupPlace`, LUÔN có `legs`); `web/trip-sheet.ts:133-134` → `tripPayload` (`src/shared/trip-form.ts:113-117` bỏ hai khoá). Màn HDV (`web/viec-cua-toi.ts`) không gửi thân đơn.
- PWA cũ trong bộ nhớ đệm (trước bản 1.62): còn gửi. Đây là thứ phải đo.
- e2e: `tests/e2e/lib.mjs:164` `catalogService` **không có `legs`** ⇒ mọi đơn e2e đang đi đường cũ; 11 tệp gửi `pickupTime/pickupPlace` (`bangtin`, `chang-hanh-khach`, `dieu-phoi-chay-dua`, `dua-don-dau-cuoi`, `dieu-phoi`, `dispatch`, `nhap-tay-va-gia-doi-tac`, `orders`, `tai-xe-cuoc`, `trip`, `xe-tren-don`).
- Bài đơn vị: `src/shared/chang-dua-don.test.ts` (tronChangCu), `src/modules/orders/trip-chang.test.ts`, `luu-nhap-chang.test.ts`, `rules.test.ts`, … — danh sách đủ lấy bằng cách cắt thử (Task 3 bước 4).

**Đường nhận thân cũ hôm nay:** `src/modules/orders/rules.ts:51-83` (`withLegs`, nhánh `else` gọi `tronChangCu`), `service.ts:66-89` (`keHoachChangTrip` + `cu`), `service-rules.ts:300-306` (`TripUpdate.updates[].cu`), `src/shared/chang-dua-don.ts:283-316` (`tronChangCu`), `src/shared/contracts.ts:281-289,424-427` (kiểu cho phép hai khoá).

**Máy khách cũ hiểu `client_outdated`:** `src/shared/order-errors.ts:76` → băng "Trang đã cũ. Hãy tải lại trang." có từ 2026-09-20 (`git log -S` → `7ebc87aa`), tức mọi bản PWA còn chạy đều hiện băng này.

## Global Constraints

- Tiếng Việt CÓ DẤU ở chữ người dùng thấy, commit, tài liệu; không lộ mã thô (`client_outdated_body` chỉ trong mã; nhãn "Máy dùng app bản cũ").
- Nhật ký không ghi SĐT/email/MST/tên khách: dòng đếm chỉ có người thao tác (`staff_id`), nhãn màn hình, giờ — `order_id` NULL (không vào lịch sử đơn).
- Không xoá cứng, **không xoá cột** (D1/SQLite; CLAUDE.md "phát hành 2: cột chết"); dữ liệu cũ trong hai cột giữ nguyên, không sửa.
- Migration: **không** (R11). Nếu chủ đổi ý về trigger khoá cột → Task 8 tuỳ chọn, số `<NNNN>` = lớn nhất trong `migrations/` của `main` và mọi nhánh chưa gộp + 1.
- Số phiên bản `<1.NN>` = lớn nhất ở `origin/main` + 1 lúc gộp (lộ trình L2).
- Mỗi lần phát hành: `npm test`, `npm run typecheck` 0 lỗi, `npm run test:e2e` đủ bộ, mục `src/shared/changelog.ts`.
- Việc lớn (dữ liệu + hợp đồng API) ⇒ người kiểm độc lập chỉ đọc sau Lần B (và sau Lần A nếu phát hành riêng).
- AI không chạy lệnh remote; mọi lệnh đọc production ở đây do **chủ** chạy.

## Review Focus

1. **Thân cũ sau khi cắt** (PWA chưa cập nhật gửi đơn không `legs`, hoặc `PUT /trip` có `pickupTime`) ⇒ 409 `client_outdated`, câu "cập nhật app"; chặng đang lưu **không đổi một byte**, `orders.updated_at` không đổi, không dòng nhật ký `created`/`updated`/`trip_updated`; dòng đếm vẫn ghi. — Task 4 (bài khung + e2e).
2. **Màn hình hiện tại bị đếm nhầm là "cũ"** (một chỗ trải `d.trip` lọt hai khoá) ⇒ số đếm không bao giờ về 0 hoặc màn đó vỡ sau cắt. Kỳ vọng: thân dựng bởi `toServiceInput`/`tripPayload` không bị nhận là cũ. — Task 1 bước 1.
3. **Bộ đếm hỏng làm hỏng yêu cầu** (D1 lỗi khi chèn dòng đếm) ⇒ yêu cầu vẫn chạy như không có bộ đếm. — Task 1 (try/catch + bài).
4. **Lùi Worker sau khi cắt** ⇒ bản cũ chạy lại bình thường (không migration); dòng ghi trong lúc chạy bản mới có hai cột cũ NULL — không ai đọc nên không sai hiển thị. — Task 7 (mục Hoàn tác).
5. **Hai cột cũ bị đọc lại lén** (một câu `SELECT *`/`os.*` trên `order_service`, hoặc ai đó viết `pickup_time` của dịch vụ) ⇒ bài quét đỏ. — Task 6 (P16 ba ca).

---

## Task 1 (Lần A — phát hành trước): Bộ đếm thân cũ

**Đề xuất:** gộp task này vào nhánh **Đợt 1** (`…-01-viec-nho.md`) để đồng hồ 7 ngày chạy sớm; nếu Đợt 1 đã gộp thì phát hành riêng (không migration). Không sửa tệp kế hoạch Đợt 1 — người điều phối quyết khi giao.

**Files:**
- Create: `src/modules/orders/than-cu.ts`
- Create: `src/modules/orders/than-cu.test.ts`
- Create: `src/modules/orders/than-cu-route.test.ts`
- Modify: `src/shared/audit-actions.ts` (thêm một hành động, nhóm `system`)
- Modify: `src/modules/orders/index.ts` (route `POST /api/orders` ~:667, `PUT /api/orders/:id` ~:733, `PUT /api/orders/:id/trip` ~:791)
- Modify: `docs/SO-HANG-RAO.md` (dòng bộ đếm — Step 10b)

**Interfaces:**
- Produces: `laThanDonCu(body: unknown): boolean`, `laThanTripCu(body: unknown): boolean`, `demThanCu(db: D1Database, staffId: string, loai: LoaiThanCu): Promise<void>`, `type LoaiThanCu = "lap_don" | "luu_nhap" | "sua_chuyen"`, `CAU_CAP_NHAT_APP: string` (dùng ở Task 4); hành động nhật ký `client_outdated_body`.

**Tập được đếm = đúng tập sẽ bị cắt ở Task 4:** thân đơn có ≥1 dịch vụ **không có khoá `legs`** (dù có hay không `pickupTime` — thân cũ nào cũng thiếu `legs`), và thân `PUT /trip` có dịch vụ mang khoá `pickupTime` hoặc `pickupPlace`.

- [ ] **Step 1: Viết bài đỏ cho hàm nhận diện** — `src/modules/orders/than-cu.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { laThanDonCu, laThanTripCu } from "./than-cu.ts";
import { newManualDraft, toServiceInput } from "../../shared/service-form.ts";
import { emptyTrip, tripPayload } from "../../shared/trip-form.ts";

const svcCu = { kind: "catalog", catalogCode: "ZA1", pax: { adult: 1 }, departDate: "2026-10-10", pickupTime: "07:00", pickupPlace: "Khách sạn A" };

test("thân đơn cũ: có dịch vụ thiếu khoá legs (kể cả không có pickupTime) → cũ; mọi dịch vụ có legs → không", () => {
  assert.equal(laThanDonCu({ services: [svcCu] }), true);
  const { pickupTime: _a, pickupPlace: _b, ...khongGio } = svcCu;
  assert.equal(laThanDonCu({ services: [khongGio] }), true);
  assert.equal(laThanDonCu({ services: [{ ...khongGio, legs: [] }, khongGio] }), true);
  assert.equal(laThanDonCu({ services: [{ ...khongGio, legs: [] }] }), false);
  for (const rac of [null, undefined, "x", 1, [], {}, { services: "x" }, { services: [null, 1] }]) assert.equal(laThanDonCu(rac), false, JSON.stringify(rac));
});

test("thân PUT /trip cũ: dịch vụ có khoá pickupTime HOẶC pickupPlace (kể cả rỗng) → cũ", () => {
  const base = { id: "s1", departDate: "2026-10-10", departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  assert.equal(laThanTripCu({ expectedUpdatedAt: "x", services: [{ ...base, pickupTime: "" }] }), true);
  assert.equal(laThanTripCu({ expectedUpdatedAt: "x", services: [{ ...base, pickupPlace: "A" }] }), true);
  assert.equal(laThanTripCu({ expectedUpdatedAt: "x", services: [base] }), false);
  for (const rac of [null, {}, { services: {} }]) assert.equal(laThanTripCu(rac), false);
});

test("Review Focus 2: thân do giao diện HIỆN TẠI dựng (toServiceInput, tripPayload) KHÔNG bị nhận là cũ", () => {
  const d = newManualDraft("k1");
  const tripCoGio = { ...emptyTrip(), departDate: "2026-10-10", pickupTime: "07:00", pickupPlace: "Khách sạn A" };
  assert.equal(laThanDonCu({ services: [toServiceInput({ ...d, trip: tripCoGio })] }), false);
  assert.equal(laThanTripCu(tripPayload([{ id: "s1", trip: tripCoGio }], "2026-10-01T00:00:00.000Z")), false);
});
```

(Nếu `newManualDraft` không có trường `trip`/`legs` đúng tên thì sửa bước dựng nháp theo `src/shared/service-form.test.ts:152` — bài "Phần B: toServiceInput LUÔN có khoá legs". Ý giữ nguyên: dựng bằng hàm thật của giao diện, nháp CÓ giờ đón trong `trip`.)

- [ ] **Step 2: Chạy, thấy đỏ** — `node --test src/modules/orders/than-cu.test.ts` → FAIL "Cannot find module './than-cu.ts'".

- [ ] **Step 3: Viết `src/modules/orders/than-cu.ts`**

```ts
// ADR-0047 §6 (Phần C — Đợt 8 lộ trình Vận chuyển): nhận diện thân yêu cầu KIỂU CŨ (PWA chưa tải bản ≥ 1.62) và ĐẾM mỗi lần nhận, để chủ dự án biết
// lúc nào không còn máy cũ (cổng trước khi cắt). Dòng đếm = một dòng audit_log `client_outdated_body`: người thao tác + nhãn màn hình, KHÔNG gắn đơn,
// KHÔNG nội dung thân. Đếm hỏng KHÔNG được làm hỏng yêu cầu (nuốt lỗi, một dòng log không dữ liệu cá nhân).
import { auditStatement } from "../audit";

export type LoaiThanCu = "lap_don" | "luu_nhap" | "sua_chuyen";
const NHAN: Record<LoaiThanCu, string> = { lap_don: "Lập đơn", luu_nhap: "Lưu nháp", sua_chuyen: "Sửa thông tin chuyến" };

/** Câu trả về máy cũ khi đã cắt (Task 4). Máy cũ hiện băng riêng của nó ("Trang đã cũ…"); câu này cho máy khác / nhật ký Worker. */
export const CAU_CAP_NHAT_APP =
  "Ứng dụng trên máy này là bản cũ nên chưa lưu được giờ đón, nơi đón kiểu mới. Hãy đóng hẳn ứng dụng rồi mở lại (hoặc tải lại trang) để cập nhật, rồi làm lại.";

const laDoiTuong = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const dichVu = (body: unknown): Record<string, unknown>[] =>
  laDoiTuong(body) && Array.isArray(body.services) ? body.services.filter(laDoiTuong) : [];

/** Thân `POST /api/orders` / `PUT /api/orders/:id` kiểu cũ: có dịch vụ KHÔNG có khoá `legs`. */
export const laThanDonCu = (body: unknown): boolean => dichVu(body).some((s) => !("legs" in s));

/** Thân `PUT /api/orders/:id/trip` kiểu cũ: có dịch vụ mang khoá `pickupTime` hoặc `pickupPlace`. */
export const laThanTripCu = (body: unknown): boolean => dichVu(body).some((s) => "pickupTime" in s || "pickupPlace" in s);

/** Ghi MỘT dòng đếm. Không ném lỗi. */
export async function demThanCu(db: D1Database, staffId: string, loai: LoaiThanCu): Promise<void> {
  try {
    await auditStatement(db, { staffId, action: "client_outdated_body", at: new Date().toISOString(), targetType: "system", detail: NHAN[loai] }).run();
  } catch {
    console.log(JSON.stringify({ level: "warn", event: "dem_than_cu_loi", loai }));
  }
}
```

- [ ] **Step 4: Thêm hành động nhật ký** — `src/shared/audit-actions.ts`, trong nhóm `system` (sau `tro_ly_settings_changed`):

```ts
  // ADR-0047 §6 (Đợt 8): máy còn gửi thân đơn / thông tin chuyến KIỂU CŨ — dòng ĐẾM cho cổng cắt; order_id NULL, detail = nhãn màn hình, không nội dung thân.
  client_outdated_body: { label: "Máy dùng app bản cũ", group: "system" },
```

Chạy `node --test src/shared/audit-actions.test.ts` (bài này có thể đòi mọi hành động có nhãn/nhóm hợp lệ — xanh là đủ).

- [ ] **Step 5: Chạy bài Step 1** → PASS.

- [ ] **Step 6: Bài đỏ cho route (đếm, không đổi hành vi)** — `src/modules/orders/than-cu-route.test.ts`

```ts
// ADR-0047 §6 (Đợt 8) — bộ đếm thân cũ ở ba route ghi đơn; Lần A KHÔNG đổi hành vi (thân cũ vẫn được nhận). Chạy cả ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const D = inDays(3);
const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: null, dropoffPlace: "" };
const SVC = { kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: D };

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const dem = (w: any) => w.sqlite.prepare("SELECT staff_id, order_id, target_type, detail FROM audit_log WHERE action = 'client_outdated_body' ORDER BY created_at").all();

test("thân mới (có legs) → không đếm", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, legs: [OUT] }] } });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(dem(w), []);
});

test("Lần A: thân đơn cũ (không legs) → vẫn 201 như trước, ghi ĐÚNG một dòng đếm 'Lập đơn', không gắn đơn", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, pickupTime: "07:00", pickupPlace: "Khách sạn A" }] } });
  assert.equal(r.status, 201, r.text); // Task 4 đổi dòng này thành 409
  assert.deepEqual(dem(w), [{ staff_id: SALES, order_id: null, target_type: "system", detail: "Lập đơn" }]);
});

test("Lần A: PUT /trip có pickupTime → đếm 'Sửa thông tin chuyến'; PUT /api/orders/:id nháp không legs → đếm 'Lưu nháp'", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, legs: [OUT] }] } })).json.order;
  const sid = o.services[0].id;
  const trip = { id: sid, departDate: D, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", pickupTime: "07:15", pickupPlace: "Khách sạn B" };
  await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, services: [trip] } });
  const o2 = (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order;
  await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: { expectedUpdatedAt: o2.updatedAt, customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, id: sid }] } });
  assert.deepEqual(dem(w).map((x: any) => x.detail), ["Sửa thông tin chuyến", "Lưu nháp"]);
});

test("Review Focus 3: chèn dòng đếm lỗi → yêu cầu vẫn chạy như không có bộ đếm", async () => {
  const w = setup();
  w.sqlite.exec(`CREATE TRIGGER tam_chan_dem BEFORE INSERT ON audit_log WHEN NEW.action = 'client_outdated_body' BEGIN SELECT RAISE(ABORT, 'thử hỏng'); END`);
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, pickupTime: "07:00" }] } });
  assert.equal(r.status, 201, r.text); // Task 4: 409 client_outdated (không phải 500)
});
```

- [ ] **Step 7: Chạy** `node --test src/modules/orders/than-cu-route.test.ts` → FAIL (chưa có dòng đếm: `[] !== [...]`).

- [ ] **Step 8: Gắn vào ba route** — `src/modules/orders/index.ts`. Thêm import `import { demThanCu, laThanDonCu, laThanTripCu } from "./than-cu";`. Vị trí: **SAU mọi cổng 403 (kể cả 403 phụ thuộc thân: `CANNOT_WRITE_PASSENGERS`, `CANNOT_PICK_HANDLER`)**, TRƯỚC mọi 400, PM-1, `validateOrder` — giữ luật thứ tự đã ghi ở chú thích route `POST /api/orders` ("403 … đứng TRƯỚC mọi 400 và mọi đọc CSDL"):

```ts
// POST /api/orders (~:667-671)
      const body = await readJson(request);
      if (hasPassengersKey(body) && !can(staff, "order.passenger.write", { ownerId: staff.id })) return CANNOT_WRITE_PASSENGERS();
      if (hasHandlerPick(body) && !can(staff, "dispatch.assign", { ownerId: staff.id })) return CANNOT_PICK_HANDLER();
      if (laThanDonCu(body)) await demThanCu(env.DB, staff.id, "lap_don"); // ADR-0047 §6 — đếm máy cũ (cổng Đợt 8); sau 403, trước 400
      const pick = parseHandlerPick(body);

// PUT /api/orders/:id (~:733-739)
      const body = await readJson(request);
      if (hasPassengersKey(body) && !can(staff, "order.passenger.write", { ownerId: meta.staffId, assigned })) return CANNOT_WRITE_PASSENGERS();
      if (laThanDonCu(body)) await demThanCu(env.DB, staff.id, "luu_nhap"); // trước PM-1
      const mocGui = body?.expectedUpdatedAt;

// PUT /api/orders/:id/trip (~:791)
      const tripBody = await readJson(request);
      if (laThanTripCu(tripBody)) await demThanCu(env.DB, staff.id, "sua_chuyen");
```

  Sau khi gắn: `grep -n "403\|thứ tự" src/modules/orders/don-moi-chon-hdv.test.ts src/modules/orders/hanh-khach-route.test.ts` — bài nào canh "403 trước mọi đọc/ghi CSDL" phải còn xanh (bộ đếm đứng sau các 403 đó).

- [ ] **Step 9: Chạy** bài Step 6 → PASS; `npm test`; `npm run typecheck` 0 lỗi; `npm run test:e2e` (e2e còn thân cũ ⇒ D1 tạm có dòng đếm — đúng, không bài nào đếm nhật ký toàn hệ thống theo số; nếu có bài đỏ vì thế, ghi nhật ký thi công và sửa bài đó cho lọc theo hành động).

- [ ] **Step 10: P16** — tạm đổi `laThanDonCu` thành `() => false` → bài Step 6 ca "Lần A: thân đơn cũ" đỏ; hoàn nguyên → xanh. Ghi kết quả vào nhật ký thi công.

- [ ] **Step 10b: Sổ hàng rào** — cổng "an toàn để cắt" dựa vào bộ đếm, nên bộ đếm phải có dòng ở `docs/SO-HANG-RAO.md` (CLAUDE.md §3):

```
| Bộ đếm máy còn gửi thân đơn kiểu cũ (`src/modules/orders/than-cu.ts`, dòng nhật ký `client_outdated_body`; **ADR-0047 §6**, từ <ngày>, Đợt 8) | Cắt thân cũ khi còn máy dùng PWA cũ (phiền: 409 "tải lại") | Ba route ghi đơn gọi `laThanDonCu`/`laThanTripCu` sau các cổng 403; mỗi lần nhận thân cũ ghi một dòng (không gắn đơn, không nội dung thân); chủ đếm bằng `wrangler d1 execute --remote --command` chỉ-đọc (kế hoạch Đợt 8 Task 2) | **<ngày>:** `laThanDonCu` tạm thành `() => false` → `<dòng not ok của Step 10>` → hoàn nguyên → xanh | Đếm = 0 ngay từ ngày đầu KHÔNG chứng minh không còn máy cũ (có thể bộ đếm không chạy trên production — AI không được gửi thân thử lên production) |
```

- [ ] **Step 11: Nhật ký phiên bản** (nếu phát hành riêng; gộp Đợt 1 thì thêm vào mục của Đợt 1) — `src/shared/changelog.ts`, mục `<1.NN>`:

```ts
      { kind: "doi", text: "Chuẩn bị cho bản sau: máy chủ ghi nhận máy nào còn dùng ứng dụng bản cũ khi lưu đơn (không ghi thông tin khách)." },
```

- [ ] **Step 12: Commit**

```bash
git add src/modules/orders/than-cu.ts src/modules/orders/than-cu.test.ts src/modules/orders/than-cu-route.test.ts src/shared/audit-actions.ts src/modules/orders/index.ts src/shared/changelog.ts docs/SO-HANG-RAO.md
git commit -m "Đếm thân yêu cầu kiểu cũ (giờ đón trên dịch vụ, không chặng) trước khi cắt — ADR-0047 §6

Cổng của Đợt 8: chỉ ngừng nhận thân cũ khi production không còn máy gửi.
Mỗi lần nhận ghi một dòng nhật ký không gắn đơn, không nội dung thân; đếm hỏng không làm hỏng yêu cầu."
```

---

## Task 2: CỔNG — chủ đo trên production (không có mã)

Chỉ làm Task 3 trở đi khi **cả bốn** điều dưới đạt. Lỗi khi cắt sớm chỉ là phiền (máy cũ nhận 409 "tải lại", không mất dữ liệu, không ghi nửa vời) — nên cổng giữ đơn giản.

- [ ] **2.1** Bản có bộ đếm (Task 1) đã lên production **≥ 7 ngày** — chủ xem ngày ở `docs/HANDOFF-N1.md` (TRẠNG THÁI TRIỂN KHAI) hoặc `node scripts/kiem-phien-ban.mjs` (GET công khai, AI chạy được).
- [ ] **2.2** **7 ngày gần nhất = 0 dòng đếm.** Chủ chạy (thư mục `tourdao-sales`, checkout gốc):

```bash
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT s.label AS nguoi, a.detail AS man_hinh, count(*) AS so_lan, max(a.created_at) AS lan_cuoi FROM audit_log a LEFT JOIN v_stf_staff_label s ON s.id = a.staff_id WHERE a.action = 'client_outdated_body' AND a.created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days') GROUP BY a.staff_id, a.detail ORDER BY lan_cuoi DESC"
```

Kỳ vọng: bảng rỗng. Có dòng ⇒ nhắn đúng người đó "đóng hẳn app rồi mở lại", đếm lại 7 ngày từ lần cuối.
Xem cả quá trình theo ngày (để biết bộ đếm có từng bắt được máy cũ — nếu từ ngày đầu đã 0 thì không phân biệt được "không còn máy cũ" với "bộ đếm không chạy"; khi đó dựa vào bài Task 1 + e2e):

```bash
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT substr(datetime(created_at, '+7 hours'), 1, 10) AS ngay_vn, detail AS man_hinh, count(*) AS so_lan, count(DISTINCT staff_id) AS so_nguoi FROM audit_log WHERE action = 'client_outdated_body' GROUP BY 1, 2 ORDER BY 1 DESC"
```

(Dùng `--command` từng câu, không `--file` — `--file` đi cổng nhập và bị từ chối với đăng nhập OAuth.)
- [ ] **2.3** Cột "Đăng nhập gần nhất" ở Quản lý tài khoản: mọi tài khoản còn làm việc đã đăng nhập SAU ngày bản 1.62 lên (khuôn chế độ bảo trì, CLAUDE.md §10). Tài khoản lâu không vào ⇒ chấp nhận (máy đó sẽ nhận 409 "tải lại" — phiền, không mất dữ liệu) hoặc nhắn trước.
- [ ] **2.4** Chủ chạy kiểm bất biến chỉ-đọc:

```bash
node scripts/audit-invariants.mjs --db remote
```

Kỳ vọng `R-ORD-7` = 0 (thoát 2 = không chạy được, không phải sạch). Khác 0 ⇒ mở và lưu lại các đơn lệch trước (lưu = máy chủ ghi lại hai cột dẫn xuất).

Kết quả bốn mục chép vào nhật ký thi công `docs/superpowers/plans/<ngày>-van-chuyen-dot-8-nhat-ky.md` (ngày, số dòng, người chạy). Nhánh Lần B: `van-chuyen-dot-8-cat-than-cu`, tạo từ `main` **sau** cổng.

---

## Task 3: Chuyển mọi bài thử sang thân mới (còn xanh trên máy chủ cũ)

Làm TRƯỚC khi cắt để từng bước giữ xanh: máy chủ hiện nhận cả hai kiểu, nên đổi bài sang kiểu mới không đỏ.

**Files:**
- Modify: `tests/e2e/lib.mjs:164` (+ hàm `voiChang`)
- Modify: 11 tệp e2e liệt kê ở phần Hiện trạng
- Modify: bài đơn vị dùng thân cũ (danh sách lấy ở bước 4)

**Interfaces:**
- Produces: `voiChang(sv)` trong `tests/e2e/lib.mjs` — chuyển `pickupTime/pickupPlace` của một dịch vụ thành `legs: [{ direction: "OUT", … }]`, bỏ hai khoá; không có giờ/nơi → `legs: []`.

- [ ] **Step 1: Sửa helper e2e**

```js
/**
 * ADR-0047 §6 (Đợt 8): máy chủ chỉ nhận thân MỚI — mỗi dịch vụ có `legs`. Bài cũ viết `pickupTime`/`pickupPlace` trên dịch vụ được dịch sang MỘT chặng
 * chiều đi (ngày đón trống = ngày đi; nơi trả trống). Có giờ mà không nơi → nơi "(chưa ghi nơi đón)" như tronChangCu cũ, để bài giữ nguyên kỳ vọng.
 */
export function voiChang(sv) {
  if ("legs" in sv) return sv;
  const { pickupTime, pickupPlace, ...rest } = sv;
  const gio = pickupTime ?? "", noi = pickupPlace ?? "";
  if (gio === "" && noi === "") return { ...rest, legs: [] };
  return { ...rest, legs: [{ direction: "OUT", pickupDate: "", pickupTime: gio, pickupLocationId: null, pickupPlace: noi || "(chưa ghi nơi đón)", dropoffLocationId: null, dropoffPlace: "" }] };
}
export const catalogService = (extra = {}) => voiChang({ kind: "catalog", catalogCode: "ZE1", pax: { adult: 1 }, catalogPriceSeen: { ...FAKE_CATALOG.ZE1.prices }, departDate: vnDate(7), ...extra });
```

(Kiểm lại chữ tạm đúng bằng hằng `NOI_DON_CHUA_GHI` ở `src/shared/chang-dua-don.ts`; `kiemChang` có thể từ chối chữ tạm từ thân — khi đó dùng nơi giả "Điểm thử" và sửa kỳ vọng của bài liên quan.)

- [ ] **Step 2: Sửa từng tệp e2e** — mọi chỗ dựng dịch vụ tay (không qua `catalogService`) bọc `voiChang(...)`; mọi thân `PUT /trip` bỏ `pickupTime/pickupPlace` (giờ/nơi đón đổi qua `PUT /api/orders/:id/legs/:legId`). Bài nào **cố ý** thử thân cũ (`trip.mjs`, `chang-hanh-khach.mjs`, `orders.mjs:50-74`) — để nguyên, đánh dấu `// THÂN CŨ — Task 4 đổi kỳ vọng thành 409`; ghi danh sách vào nhật ký thi công.

- [ ] **Step 3: Chạy** `npm run test:e2e` → xanh đủ bộ (máy chủ chưa cắt).

- [ ] **Step 4: Lấy danh sách bài đơn vị dùng thân cũ** — cắt thử tạm thời: trong `rules.ts:withLegs` thêm dòng đầu `if (!rawServices.every((r) => !!r && typeof r === "object" && "legs" in (r as object))) return fail("CẮT THỬ");`, chạy `npm test 2>&1 | grep "^not ok"`, chép danh sách; **hoàn nguyên**. Mỗi bài trong danh sách: dựng thân mới (`legs`) nếu bài không nhằm thử thân cũ; nếu nhằm thử thân cũ → đánh dấu như Step 2.

- [ ] **Step 5: Chạy** `npm test` → xanh. **Commit**

```bash
git commit -am "Bài thử dựng thân đơn kiểu mới (chặng) — chuẩn bị ngừng nhận thân cũ, ADR-0047 §6

Máy chủ hiện còn nhận cả hai kiểu nên đổi bài trước giữ xanh; bài cố ý thử thân cũ được đánh dấu để bước cắt đổi kỳ vọng."
```

---

## Task 4 (Lần B): Cắt — thân cũ nhận 409 `client_outdated`, gỡ đường trộn cũ

**Files:**
- Modify: `src/modules/orders/index.ts` (ba route — sau dòng đếm của Task 1)
- Modify: `src/modules/orders/rules.ts:44-83,200` (`withLegs`, `legsGiven`)
- Modify: `src/modules/orders/service.ts:60-89` (`keHoachChangTrip` bỏ `cu`)
- Modify: `src/modules/orders/service-rules.ts:300-330` (`TripUpdate.updates[].cu`)
- Modify: `src/shared/chang-dua-don.ts:283-316` (gỡ `tronChangCu`; thêm `chepDangGhi`)
- Modify: `src/shared/contracts.ts:281-289,424-427` (`legs` bắt buộc; bỏ `Partial<Pick<TripInput, "pickupTime" | "pickupPlace">>`)
- Modify: `src/modules/orders/than-cu-route.test.ts` (đổi kỳ vọng Lần A → 409)
- Create: `tests/e2e/than-cu-chang.mjs`
- Modify: bài đơn vị/e2e đánh dấu "THÂN CŨ" ở Task 3; `src/shared/chang-dua-don.test.ts` (gỡ bài `tronChangCu`)

**Interfaces:**
- Consumes: `laThanDonCu`, `laThanTripCu`, `demThanCu`, `CAU_CAP_NHAT_APP` (Task 1).
- Produces: `chepDangGhi(stored: readonly ChangDaLuu[]): ChangHopLe[]` ở `src/shared/chang-dua-don.ts` (= `stored.map(toGhi)` — thay chỗ `tronChangCu` trả `legs` khi khoá vắng); `keHoachChangTrip(stored, updates: { id: string; trip: ValidTrip }[])`.

**Chọn thứ tự:** cắt **ngay sau dòng đếm, TRƯỚC PM-1** (kiểm mốc) và trước `validateOrder` — thân cũ luôn nhận câu "cập nhật app", không lẫn với 409 "đơn vừa đổi".

- [ ] **Step 1: Đổi bài Lần A thành bài cắt (đỏ)** — trong `than-cu-route.test.ts`: ca "Lần A: thân đơn cũ" → kỳ vọng `409`, `r.json.error.code === "client_outdated"`, số đơn trong `orders` không đổi (đếm trước/sau), dòng đếm vẫn đúng một; ca "Review Focus 3" → kỳ vọng `409` `client_outdated`. Thêm bài **Review Focus 1** (bắt buộc):

```ts
const chup = (w: any, id: string) => ({
  legs: w.sqlite.prepare("SELECT * FROM ord_transfer_leg WHERE order_id = ? ORDER BY id").all(id),
  svc: w.sqlite.prepare("SELECT * FROM order_service WHERE order_id = ? ORDER BY sort_order").all(id),
  updatedAt: w.sqlite.prepare("SELECT updated_at FROM orders WHERE id = ?").get(id).updated_at,
  nhatKy: w.sqlite.prepare("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action IN ('created','updated','trip_updated')").get(id).n,
});

test("Review Focus 1: sau cắt, thân cũ (nháp không legs; PUT /trip có pickupTime) → 409 client_outdated, KHÔNG đổi chặng/dịch vụ/mốc/nhật ký đơn; vẫn đếm", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, legs: [OUT] }] } })).json.order;
  const sid = o.services[0].id;
  const truoc = chup(w, o.id);

  // mốc ĐÚNG — để chắc 409 là vì thân cũ, không phải vì mốc cũ
  const r1 = await w.call("PUT", `/api/orders/${o.id}`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, id: sid, pickupTime: "09:00", pickupPlace: "Nơi khác" }] } });
  assert.equal(r1.status, 409, r1.text);
  assert.equal(r1.json.error.code, "client_outdated");
  assert.match(r1.json.error.message, /cập nhật/);

  const trip = { id: sid, departDate: D, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", pickupTime: "09:00", pickupPlace: "Nơi khác" };
  const r2 = await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, services: [trip] } });
  assert.equal(r2.status, 409, r2.text);
  assert.equal(r2.json.error.code, "client_outdated");

  // PUT /trip: chỉ cần CÓ khoá cũ (kể cả rỗng) là bị cắt — xem bài laThanTripCu ở than-cu.test.ts
  assert.deepEqual(chup(w, o.id), truoc);
  assert.deepEqual(dem(w).map((x: any) => x.detail), ["Lưu nháp", "Sửa thông tin chuyến"]);
});

test("Review Focus 1: thân hỗn hợp (một dịch vụ có legs, một không) → 409 client_outdated, không tạo đơn", async () => {
  const w = setup();
  const n0 = w.sqlite.prepare("SELECT count(*) AS n FROM orders").get().n;
  const r = await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, legs: [OUT] }, { ...SVC }] } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "client_outdated");
  assert.equal(w.sqlite.prepare("SELECT count(*) AS n FROM orders").get().n, n0);
});
```

Đổi kỳ vọng của mọi bài đánh dấu "THÂN CŨ" (Task 3) thành 409 `client_outdated` (hoặc xoá bài nếu nó chỉ thử luật trộn `tronChangCu` — ghi tên bài đã xoá vào nhật ký thi công).

- [ ] **Step 2: Chạy** `node --test src/modules/orders/than-cu-route.test.ts` → FAIL (201/200 thay vì 409).

- [ ] **Step 3: Cắt ở route** — `src/modules/orders/index.ts`: import thành `import { CAU_CAP_NHAT_APP, demThanCu, laThanDonCu, laThanTripCu } from "./than-cu";`, đổi ba dòng của Task 1 **tại đúng chỗ của chúng** (sau mọi 403, kể cả 403 phụ thuộc thân; trước 400/PM-1/`validateOrder`/`validateTripUpdate`):

```ts
// POST /api/orders  (sau CANNOT_PICK_HANDLER, trước parseHandlerPick)
      if (laThanDonCu(body)) { await demThanCu(env.DB, staff.id, "lap_don"); return error(409, "client_outdated", CAU_CAP_NHAT_APP); } // ADR-0047 §6
// PUT /api/orders/:id  (sau CANNOT_WRITE_PASSENGERS, trước PM-1)
      if (laThanDonCu(body)) { await demThanCu(env.DB, staff.id, "luu_nhap"); return error(409, "client_outdated", CAU_CAP_NHAT_APP); }
// PUT /api/orders/:id/trip  (sau FORBIDDEN/DA_GIAO/CANCELLED, ngay sau readJson, trước validateTripUpdate)
      if (laThanTripCu(tripBody)) { await demThanCu(env.DB, staff.id, "sua_chuyen"); return error(409, "client_outdated", CAU_CAP_NHAT_APP); }
```

Thứ tự kết quả: 403 luôn thắng 409 `client_outdated`; 409 `client_outdated` thắng 409 "đơn vừa đổi" (PM-1) và mọi 400.

- [ ] **Step 4: Gỡ nhánh trộn ở luật (phòng thủ hai lớp)** — `src/modules/orders/rules.ts:withLegs`:

```ts
function withLegs(rawServices: readonly unknown[], services: ValidService[], ctx: ServiceContext): { ok: true; services: ValidService[] } | Failure {
  // ADR-0047 §6 (phát hành 2): MỌI dịch vụ phải có khoá `legs`. Thiếu ở bất kỳ dịch vụ nào = máy bản cũ (route đã chặn trước; đây là lớp thứ hai).
  if (!rawServices.every((raw) => !!raw && typeof raw === "object" && "legs" in (raw as object))) {
    return { ok: false, code: "client_outdated", message: CAU_CAP_NHAT_APP };
  }
  const out: ValidService[] = [];
  for (const [i, sv] of services.entries()) {
    // … giữ NGUYÊN thân nhánh `if (legsGiven) { … }` cũ, bỏ `if`/`else` …
  }
  return { ok: true, services: out };
}
```

Gỡ trường `legsGiven` (rules.ts:40, :200) nếu `grep -rn legsGiven src` không còn ai đọc ngoài rules.ts (đo 1/10: không ai). Bỏ import `tronChangCu`, `doiNgayChang` nếu không còn dùng trong tệp. Import `CAU_CAP_NHAT_APP` từ `./than-cu`.

- [ ] **Step 5: Gỡ `cu` ở `PUT /trip`** — `service-rules.ts`: `TripUpdate.updates` thành `{ id: string; trip: ValidTrip }[]`; trong `validateTripUpdate` bỏ chỗ dựng `cu` (người thi công đọc hàm, xoá đúng nhánh đọc `pickupTime/pickupPlace` từ thân); thêm phòng thủ:

```ts
  if (b.services.some((x) => !!x && typeof x === "object" && ("pickupTime" in x || "pickupPlace" in x))) {
    return { ok: false, message: "Giờ đón, nơi đón nay sửa ở từng chặng đưa đón — hãy tải lại trang." }; // route đã trả 409 trước; lớp thứ hai
  }
```

`service.ts:keHoachChangTrip`:

```ts
export function keHoachChangTrip(
  stored: readonly StoredServiceRow[],
  updates: readonly { id: string; trip: ValidTrip }[],
): { updates: { id: string; trip: ValidTrip }[]; ops: LegOp[] } {
  const ops: LegOp[] = [];
  const out = updates.map((u) => {
    const st = stored.find((s) => s.id === u.id)!;
    // ADR-0047 R4e: đổi ngày đi → dời MỌI chặng cùng số ngày. Không còn trộn giờ/nơi cũ (§6 — phát hành 2).
    const legs = chepDangGhi(doiNgayChang(st.legs, st.trip.departDate, u.trip.departDate));
    for (const l of legs) if (!sameFields(st.legs.find((x) => x.id === l.id)!, l)) ops.push({ kind: "update", legId: l.id!, fields: fieldsOf(l) });
    // `trip.pickupTime/pickupPlace` = dẫn xuất từ chặng sau khi dời — CHỈ để `describeTripUpdates` so "trước → sau" (không còn ghi vào cột cũ — Task 5).
    const labelled = legs.map((l) => ({ id: l.id!, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLabel: st.legs.find((x) => x.id === l.id)!.pickupLabel }));
    return { id: u.id, trip: { ...u.trip, ...chieuDiDau(labelled) } };
  });
  return { updates: out, ops };
}
```

Đường này không còn sinh thao tác `insert`/`close`; nếu `grep` cho thấy `updateTrip` (repository.ts ~:1252-1256) là nơi DUY NHẤT xử lý hai loại đó từ `keHoachChangTrip` thì giữ nguyên nhánh trong `updateTrip` (vô hại) và ghi nhật ký thi công — không mở rộng phạm vi.

- [ ] **Step 6: Gỡ `tronChangCu`** — `src/shared/chang-dua-don.ts`: xoá hàm `tronChangCu` (:283-316) và chú thích dòng 7, 45 nhắc nó; thêm

```ts
/** Chặng đang lưu → dạng ghi (ô phụ CHÉP nguyên). Thay `tronChangCu` khi khoá cũ vắng (ADR-0047 §6). */
export const chepDangGhi = (stored: readonly ChangDaLuu[]): ChangHopLe[] => stored.map(toGhi);
```

**Giữ** `NOI_DON_CHUA_GHI` và R-ORD-12 (dòng chuyển dữ liệu cũ ở `0034` vẫn mang chữ tạm). Xoá năm bài `tronChangCu` ở `src/shared/chang-dua-don.test.ts` (:142, :159-195, :295-300); bài :295 (ô phụ được chép) chuyển thành bài cho `chepDangGhi`.

- [ ] **Step 7: Kiểu hợp đồng** — `src/shared/contracts.ts`: `ServiceInput.legs: LegInput[]` (bắt buộc; sửa chú thích); bỏ `& Partial<Pick<TripInput, "pickupTime" | "pickupPlace">>` ở `ServiceInput` và `TripUpdateInput`. `TripInput` (trạng thái form) và các DTO đọc (`TripInfoDto`, `OrderSummaryTripDto`, `PoolServiceDto`, `ReceiptServiceDto`) **giữ** — chúng là dẫn xuất từ chặng. `npm run typecheck` chỉ ra chỗ phải sửa.

- [ ] **Step 8: e2e Review Focus 1** — `tests/e2e/than-cu-chang.mjs` (khuôn đăng nhập `login()`/`session()` của `tests/e2e/lib.mjs`; khai tên kịch bản ở chỗ `npm run test:e2e` liệt kê nếu có danh sách):
  1. tạo đơn nháp bằng thân mới (có `legs`), đọc chi tiết → lưu `legs`, `updatedAt`;
  2. `PUT /api/orders/:id` với dịch vụ không `legs`, mốc đúng → 409 `client_outdated`;
  3. `PUT /api/orders/:id/trip` có `pickupTime` → 409 `client_outdated`;
  4. `POST /api/orders` không `legs` → 409, rồi `GET /api/orders` không có đơn mới với tên khách của bài;
  5. đọc lại chi tiết → `legs` và `updatedAt` **bằng hệt** bước 1.

- [ ] **Step 9: Chạy** `node --test src/modules/orders/than-cu-route.test.ts` → PASS; `npm test`; `npm run typecheck`; `npm run test:e2e` → xanh.

- [ ] **Step 10: P16** — (1) tạm bỏ dòng cắt ở `PUT /api/orders/:id` (bỏ luôn dòng đếm đi kèm), giữ lớp `rules.ts` → bài Review Focus 1 vẫn qua `r1.status === 409` + mã `client_outdated` (lớp hai chặn, `failure()` trả 409) nhưng đỏ ở khẳng định số dòng đếm (`["Sửa thông tin chuyến"]` ≠ `["Lưu nháp", "Sửa thông tin chuyến"]`) — đúng kỳ vọng, ghi; (2) bỏ CẢ hai lớp → đỏ ngay ở `r1.status` (`200 !== 409`); hoàn nguyên → xanh. Ghi nhật ký thi công.

- [ ] **Step 11: Commit**

```bash
git commit -am "Ngừng nhận thân đơn kiểu cũ: thiếu chặng hoặc gửi giờ đón trên dịch vụ → 409 cập nhật app (ADR-0047 §6)

Cổng đo 7 ngày đã đạt (nhật ký Đợt 8). Cắt trước kiểm mốc để máy cũ luôn nhận đúng câu; không ghi gì, chặng giữ nguyên.
Gỡ luật trộn tronChangCu — không còn đường nào ghi chặng từ hai khoá cũ."
```

---

## Task 5 (Lần B): Ngừng ghi kép hai cột cũ; gỡ R-ORD-7 cùng commit

**Files:**
- Modify: `src/modules/orders/repository.ts:785-806` (`SERVICE_COLS`, `serviceInserts`), `:1242-1249` (`updateTrip`), `:1307-1356` (`addLeg`/`changeLeg` bỏ `serviceMirrorUpdateGuarded`, bỏ `mirror` khỏi kiểu tham số)
- Modify: `src/modules/orders/service.ts:110-255` (bỏ `Pickup`, `dauSau`, trường `mirror` của `AddLegPlan`/`EditLegPlan`/`PaxNhapPlan`/`CloseLegPlan`)
- Modify: `src/modules/orders/chang-hanh-khach-repo.ts:~365-376` (xoá `SERVICE_MIRROR_UPDATE_GUARDED` + `serviceMirrorUpdateGuarded`, bỏ tên khỏi danh sách tên câu ~:372)
- Modify: `src/architecture.test.ts:167` (bỏ `"orders.service_mirror_update_guarded"` khỏi `DOC_AUDIT_LOG_WONGUARD.ten` — **siết**, được phép)
- Modify: `scripts/audit-checks.mjs:720-735` (xoá R-ORD-7), `src/audit-invariants.test.ts:930-…` (xoá bài R-ORD-7; nếu có bài liệt kê bộ mã kiểm thì bỏ `R-ORD-7`)
- Modify: `src/modules/orders/index.ts` (chỗ `resolveLegPlaces` "đặt hai khoá cũ = dẫn xuất … ghi kép" — giữ nếu `describeTripUpdates`/nhật ký còn dùng, chỉ sửa chú thích)
- Create/Modify: bài tiêu chí 25 trong `src/modules/orders/than-cu-route.test.ts`

- [ ] **Step 1: Bài đỏ — tiêu chí 25**

```ts
const cotCu = (w: any, id: string) =>
  w.sqlite.prepare("SELECT pickup_time AS t, pickup_place AS p FROM order_service WHERE order_id = ? ORDER BY sort_order").all(id);

test("tiêu chí 25: lập đơn có chặng, sửa chặng, đổi ngày qua PUT /trip → hai cột cũ của order_service LUÔN NULL (không ghi kép)", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ ...SVC, legs: [OUT] }] } })).json.order;
  assert.deepEqual(cotCu(w, o.id), [{ t: null, p: null }]);
  const sid = o.services[0].id;
  const trip = { id: sid, departDate: inDays(4), departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  assert.equal((await w.call("PUT", `/api/orders/${o.id}/trip`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, services: [trip] } })).status, 200);
  assert.deepEqual(cotCu(w, o.id), [{ t: null, p: null }]);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  const doc = async () => (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order;

  // Bốn loại lệnh chặng từng mang `mirror` — mỗi lệnh PHẢI 200 (không chấp nhận 409: 409 thì câu đồng bộ cột cũ không chạy, bài không kiểm gì).
  // Bài không thử mốc 6 giờ ⇒ dùng mốc giả của khung thử như chang-route.test.ts (CLAUDE.md §10: bài không kiểm mốc dùng hàm tiêm giả); ngày đón D = +3 ngày.
  let o2 = await doc();
  const add = await w.call("POST", `/api/orders/${o.id}/legs`, { as: SALES, body: { expectedUpdatedAt: o2.updatedAt, serviceId: sid, leg: { direction: "RETURN", pickupDate: inDays(5), pickupTime: "16:00", pickupLocationId: null, pickupPlace: "Bến tàu", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm" } } });
  assert.equal(add.status, 200, add.text);
  assert.deepEqual(cotCu(w, o.id), [{ t: null, p: null }], "thêm chặng");

  o2 = await doc();
  const out = o2.services[0].legs.find((l: any) => l.direction === "OUT");
  const sua = await w.call("PUT", `/api/orders/${o.id}/legs/${out.id}`, { as: SALES, body: { expectedUpdatedAt: out.updatedAt, leg: LEG_EDIT(out, { pickupTime: "07:45" }) } });
  assert.equal(sua.status, 200, sua.text);
  assert.deepEqual(cotCu(w, o.id), [{ t: null, p: null }], "sửa chặng — ĐỎ TRƯỚC: còn ghi kép thì ra { t: '07:45', … }");

  o2 = await doc();
  const ret = o2.services[0].legs.find((l: any) => l.direction === "RETURN");
  const dong = await w.call("POST", `/api/orders/${o.id}/legs/${ret.id}/close`, { as: SALES, body: { expectedUpdatedAt: ret.updatedAt, reasonCode: "NOT_NEEDED" } });
  assert.equal(dong.status, 200, dong.text);
  assert.deepEqual(cotCu(w, o.id), [{ t: null, p: null }], "bỏ chặng");

  // DTO vẫn có giờ đón dẫn xuất từ chặng
  assert.equal((await doc()).services[0].pickupTime, "07:45");
});
```

`LEG_EDIT` và cách gieo mốc giả: chép đúng từ `src/modules/orders/chang-route.test.ts` (`LEG_EDIT` :50, phần `setup()`/mốc của tệp đó). Lệnh "số người chiều về" (`paxNhap`, route đặt ở `chang-route.test.ts`/`o-moi-chang.test.ts`) cũng mang `mirror` — thêm một bước cùng khuôn (200 + cột cũ NULL) nếu route đó áp cho đơn đã xác nhận; nếu chỉ áp cho nháp thì ghi nhật ký thi công là không áp.

- [ ] **Step 2: Chạy** → FAIL ở bước lập đơn (`{ t: '06:30', p: 'Khách sạn Dò Tìm' }`). Đỏ-trước riêng cho đường chặng: tạm thời bỏ ghi ở `serviceInserts` trước (Step 3 ý 1) rồi chạy lại → phải còn đỏ ở "sửa chặng" (`'07:45'`) — chứng minh bài canh được câu đồng bộ của route chặng; sau đó làm tiếp Step 3.

- [ ] **Step 3: Ngừng ghi**
  - `SERVICE_COLS`: bỏ `"pickup_time", "pickup_place"`; `serviceInserts`: bỏ `t.pickupTime, t.pickupPlace` khỏi mảng giá trị; sửa chú thích (hai cột mặc định NULL — `0008` không NOT NULL).
  - `updateTrip`: câu thành `UPDATE order_service SET depart_date = ?, depart_time = ?, checkin_date = ?, checkin_time = ?, checkin_place = ?, note = ? WHERE id = ? AND order_id = ? AND ${guard.sql}` với `.bind(t.departDate, t.departTime, t.checkinDate, t.checkinTime, t.checkinPlace, t.note, id, orderId, ...guard.binds)`; xoá chú thích "ghi kép".
  - `addLeg`/`changeLeg` (repository.ts ~:1307-1356): xoá phần tử `serviceMirrorUpdateGuarded(...)` khỏi lô; xoá `mirror` khỏi kiểu `plan`. Thứ tự các câu còn lại trong lô **không đổi**.
  - `service.ts`: xoá `type Pickup`, `dauSau`, mọi `mirror` trong bốn kế hoạch và chỗ gán.
  - `chang-hanh-khach-repo.ts`: xoá `SERVICE_MIRROR_UPDATE_GUARDED`, `serviceMirrorUpdateGuarded` và tên trong danh sách.
  - `src/architecture.test.ts:167`: bỏ `"orders.service_mirror_update_guarded"`.
  - `scripts/audit-checks.mjs`: xoá khối R-ORD-7 (:720-735); `src/audit-invariants.test.ts`: xoá bài R-ORD-7.

- [ ] **Step 4: Chạy** bài Step 1 → PASS; `npm test` (bài thứ tự lô `thu-tu-lo.test.ts`, bài `DOC_AUDIT_LOG_WONGUARD` "mỗi tên đang đăng ký" phải xanh); `npm run typecheck`; `node scripts/audit-invariants.mjs --db local` (sau `npm run db:migrate:local`) không còn R-ORD-7; `npm run test:e2e`.

- [ ] **Step 5: Commit** (R-ORD-7 PHẢI cùng commit — tách ra thì kiểm định kỳ báo lệch cho mọi đơn mới)

```bash
git commit -am "Ngừng ghi kép giờ đón / nơi đón vào dịch vụ; gỡ kiểm định kỳ R-ORD-7 cùng lúc (ADR-0047 §6)

Mọi bề mặt đã đọc từ chặng từ phát hành 1; hai cột cũ chỉ còn được ghi để tương thích, nay hết lý do.
R-ORD-7 so hai cột với chặng — giữ lại thì mọi đơn mới thành vi phạm."
```

---

## Task 6 (Lần B): Cột chết + bài canh "không ai đọc / ghi hai cột cũ"

**Files:**
- Modify: `docs/data-dictionary.json` (bảng `order_service`, ~:147) → `npm run dict` (sinh `docs/DATA-DICTIONARY.md`)
- Modify: `src/modules/orders/repository.ts:80-93,123,380-393,573-574,613-616` (đổi tên khoá dẫn xuất `pickup_time/pickup_place` → `pickupTime/pickupPlace` trong `ServiceSummaryRow`; sửa chú thích "Chuyến đón hôm nay")
- Modify: `src/modules/orders/repository.test.ts`, `src/modules/orders/dashboard.test.ts`, `pool.test.ts` (dữ liệu dựng `ServiceSummaryRow` — đổi tên khoá theo)
- Create: `src/pickup-cu-khong-doc.test.ts`
- Modify: `docs/SO-HANG-RAO.md` (một dòng mới)

- [ ] **Step 1: Khai cột chết** — `docs/data-dictionary.json`, bảng `order_service`: thêm `"deprecatedColumns": ["pickup_time", "pickup_place"]` (khuôn dòng :157 của `orders`); mô tả cột ghi "cột chết từ phát hành 2 ADR-0047 — giờ đón/nơi đón ở `ord_transfer_leg`; dòng cũ còn giá trị lịch sử, không ai đọc". `npm run dict`. Bài `sổ dữ liệu: cột đánh dấu chết có thật trong bảng` (architecture.test.ts:762) xanh.

- [ ] **Step 2: Đổi tên khoá dẫn xuất** trong `ServiceSummaryRow` (và `summarizeServices`, `summaryRows`, `listPoolSources`) sang `pickupTime`/`pickupPlace`; sửa bài dựng dữ liệu. `npm test` xanh.

- [ ] **Step 3: Viết bài canh (đỏ nếu còn sót)** — `src/pickup-cu-khong-doc.test.ts`

```ts
// ADR-0047 §6 (phát hành 2 — Đợt 8): `order_service.pickup_time` / `pickup_place` là CỘT CHẾT (docs/data-dictionary.json deprecatedColumns). Giờ đón,
// nơi đón ở `ord_transfer_leg` (cột CÙNG TÊN). Quét mọi tệp chạy thật `src/**`, `web/**` (.ts trừ test) và `scripts/**` (.mjs) trên mã đã che chú thích:
//   (a) dòng có chữ `pickup_time`/`pickup_place` phải khớp danh sách cho phép (dòng chặng); mục cho phép thừa cũng đỏ;
//   (b) mọi chuỗi SQL có `order_service`: chữ `pickup_*` chỉ được đi sau bí danh của `ord_transfer_leg` trong CHÍNH chuỗi đó;
//   (c) không `SELECT *` / `<bí danh order_service>.*` trong chuỗi có `order_service` (đọc lén cột chết).
// Không canh: tên cột ghép động (`"pickup_" + x`) — dựa vào kỷ luật + rà mã (ghi ở docs/SO-HANG-RAO.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TEN = /\bpickup_(time|place)\b/;

const CHO_PHEP: { file: string; khuon: RegExp; lyDo: string }[] = [
  { file: "src/modules/orders/chang-hanh-khach-repo.ts", khuon: TEN, lyDo: "SQL + dòng của ord_transfer_leg (chặng); câu chạm order_service do (b) canh" },
  { file: "src/modules/orders/dat-gap.ts", khuon: /\br\.pickup_(time|place)\b/, lyDo: "dòng chặng (LegRow)" },
  { file: "src/modules/orders/index.ts", khuon: /\b[ln]\.pickup_(time|place)\b/, lyDo: "dòng chặng (lịch chung, tuyến chuyến, chặng nháp)" },
  { file: "scripts/audit-checks.mjs", khuon: /\bl\.pickup_(time|place)\b/, lyDo: "kiểm định kỳ trên ord_transfer_leg (bí danh l)" },
];

function walk(dir: string, duoi: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return walk(p, duoi);
    return p.endsWith(duoi) && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}
const tep = () => [...walk(join(ROOT, "src"), ".ts"), ...walk(join(ROOT, "web"), ".ts"), ...walk(join(ROOT, "scripts"), ".mjs")]
  .map((f) => ({ rel: relative(ROOT, f).split(sep).join("/"), src: maskSource(readFileSync(f, "utf8"), { strings: false, comments: true }) }));

/** Chuỗi SQL ứng viên: literal `…` / '…' / "…" chứa chữ order_service. */
const chuoiCoOrderService = (src: string): string[] =>
  [...src.matchAll(/`[^`]*`|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g)].map((m) => m[0]).filter((s) => /\border_service\b/.test(s));
const biDanh = (sql: string, bang: string): string[] =>
  [...sql.matchAll(new RegExp(`\\b${bang}\\s+(?:AS\\s+)?([a-z_][a-z0-9_]*)`, "gi"))].map((m) => m[1]!).filter((a) => !/^(where|join|left|on|order|group|set|values|limit)$/i.test(a));

test("(a) cột chết order_service.pickup_*: chữ chỉ ở dòng chặng đã cho phép; mục cho phép thừa → đỏ", () => {
  const hits: { file: string; line: number; text: string }[] = [];
  for (const { rel, src } of tep()) src.split("\n").forEach((l, i) => { if (TEN.test(l)) hits.push({ file: rel, line: i + 1, text: l.trim() }); });
  const lot = hits.filter((h) => !CHO_PHEP.some((c) => c.file === h.file && c.khuon.test(h.text)));
  assert.deepEqual(lot.map((h) => `${h.file}:${h.line}: ${h.text.slice(0, 140)}`), [], "giờ đón / nơi đón đọc từ chặng (ord_transfer_leg), không từ order_service");
  for (const c of CHO_PHEP) assert.ok(hits.some((h) => h.file === c.file && c.khuon.test(h.text)), `mục cho phép thừa: ${c.file} ${c.khuon}`);
});

test("(b) chuỗi SQL có order_service: pickup_* chỉ đi sau bí danh của ord_transfer_leg", () => {
  const sai: string[] = [];
  for (const { rel, src } of tep()) for (const sql of chuoiCoOrderService(src)) {
    const leg = biDanh(sql, "ord_transfer_leg");
    for (const m of sql.matchAll(/(?:\b([a-z_][a-z0-9_]*)\.)?\bpickup_(?:time|place)\b/gi)) if (!m[1] || !leg.includes(m[1])) sai.push(`${rel}: …${sql.slice(Math.max(0, m.index! - 60), m.index! + 30).replace(/\s+/g, " ")}…`);
  }
  assert.deepEqual(sai, []);
});

test("(c) không SELECT * / <bí danh order_service>.* trong chuỗi có order_service", () => {
  const sai: string[] = [];
  for (const { rel, src } of tep()) for (const sql of chuoiCoOrderService(src)) {
    const os = biDanh(sql, "order_service");
    if (/\bSELECT\s+\*/i.test(sql) || os.some((a) => new RegExp(`\\b${a}\\.\\*`).test(sql))) sai.push(`${rel}: ${sql.slice(0, 120).replace(/\s+/g, " ")}`);
  }
  assert.deepEqual(sai, []);
});
```

- [ ] **Step 4: Chạy** `node --test src/pickup-cu-khong-doc.test.ts`. Đỏ ⇒ đọc từng dòng: còn sót đọc/ghi cột cũ → sửa mã; dòng chặng hợp lệ chưa có trong `CHO_PHEP` → thêm mục **khuôn hẹp** + lý do (ghi nhật ký thi công). Bộ nhận bí danh (b)/(c) bắt nhầm từ khoá SQL → thêm từ khoá vào bộ loại. Xanh mới qua bước sau.

- [ ] **Step 5: P16 (ba ca, mỗi ca đỏ rồi hoàn nguyên)**
  1. thêm `const _tam = "SELECT pickup_time FROM order_service WHERE id = ?";` vào `chang-hanh-khach-repo.ts` → (b) đỏ;
  2. thêm `export const _tam = (r: { pickup_place: string }) => r.pickup_place;` vào `src/modules/orders/repository.ts` → (a) đỏ;
  3. thêm `const _tam = \`SELECT os.* FROM order_service os\`;` vào `repository.ts` → (c) đỏ.
  Hoàn nguyên → xanh. Chép dòng `not ok …` vào nhật ký thi công.

- [ ] **Step 6: Sổ hàng rào** — `docs/SO-HANG-RAO.md`, một dòng (khuôn dòng NT-R9 :260):

```
| Cột chết `order_service.pickup_time/pickup_place` không được đọc / ghi lại (`src/pickup-cu-khong-doc.test.ts`; **ADR-0047 §6**, từ <ngày>, Đợt 8) | Mã đọc giờ đón / nơi đón từ dịch vụ thay vì chặng (hai nguồn), `SELECT *` lén cột chết | Quét `src/**`, `web/**`, `scripts/**` trên mã che chú thích: (a) chữ cột chỉ ở dòng chặng cho phép; (b) chuỗi SQL có `order_service` thì `pickup_*` phải sau bí danh `ord_transfer_leg`; (c) không `SELECT *`/`os.*` | **<ngày>:** <ba dòng not ok của Step 5> → hoàn nguyên → xanh | Không canh tên cột ghép động — dựa vào kỷ luật. Thân cũ bị cắt: bài `than-cu-route.test.ts` (Review Focus 1) |
```

- [ ] **Step 7: Commit**

```bash
git commit -am "Hai cột giờ đón / nơi đón của dịch vụ thành cột chết, có bài canh không ai đọc lại (ADR-0047 §6)

Không xoá cột (D1, không xoá cứng); dữ liệu cũ giữ nguyên. Bài quét đã thấy chặn thật ba ca (P16)."
```

---

## Task 7 (Lần B): Tài liệu, nhật ký phiên bản, kiểm độc lập

**Files:** `docs/SYSTEM-DESIGN.md` §5 (cột chết `order_service`), `docs/CHANGE-GUIDE.md` (công thức chặng — bỏ "ghi kép", thêm bẫy "thân không `legs` = 409"; công thức a2 nếu nhắc), `docs/HANDOFF-N1.md` (runbook lần phát hành: mục Hoàn tác), `src/shared/changelog.ts` + `src/shared/app-info.test.ts`, nhật ký `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong-nhat-ky.md` (Phần C: xong, trỏ nhật ký Đợt 8), `docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md` (hoặc tệp đề xuất luật của Đợt 8) — **mục đề xuất sửa CLAUDE.md §10** (xem Cần chủ 3).

- [ ] **Step 1: Mục Hoàn tác** (HANDOFF-N1, runbook lần này): "Lùi Worker về bản trước được — không migration. Bản cũ nhận lại thân cũ và ghi kép như trước; dòng ghi trong lúc chạy bản mới có hai cột cũ NULL — không ai đọc nên không sai hiển thị; nếu chạy `audit-invariants` của **mã cũ** thì R-ORD-7 báo các dòng đó — mở và lưu lại đơn là khớp."
- [ ] **Step 2: Nhật ký phiên bản** `<1.NN>`:

```ts
      { kind: "doi", text: "Máy còn dùng ứng dụng bản cũ sẽ được nhắc cập nhật khi lưu đơn hoặc sửa thông tin chuyến, thay vì lưu giờ đón theo cách cũ." },
```

- [ ] **Step 3: Chạy đủ** `npm test`, `npm run typecheck`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`.
- [ ] **Step 4: Kiểm độc lập** — gọi người kiểm chỉ-đọc (`nguoi-kiem-doc-lap`) với: kế hoạch này, nhật ký Đợt 8, danh sách commit. Người kiểm tự chạy lại bài Review Focus 1, P16 của Task 4 và Task 6, `git grep -n "pickup_time\|pickup_place"` đối chiếu bảng "Hiện trạng". Chỉ báo "đạt" theo báo cáo đó.
- [ ] **Step 5: Commit tài liệu**; đưa chủ lệnh `npm run day-len -- van-chuyen-dot-8-cat-than-cu` kèm dòng "chạy `npm run trien-khai`" (đổi app).

---

## Task 8 (TUỲ CHỌN — mặc định KHÔNG làm, R11): trigger khoá cột chết

Chỉ khi chủ đổi ý về R11. Migration `<NNNN>_khoa_cot_don_cu.sql`: trigger `order_service_pickup_dead_ins` (BEFORE INSERT, `NEW.pickup_time IS NOT NULL OR NEW.pickup_place IS NOT NULL`) và `_upd` (BEFORE UPDATE OF hai cột, giá trị mới khác NULL) → `RAISE(ABORT, 'pickup_dead: giờ đón, điểm đón nay ở chặng đưa đón')`. Hệ quả phải ghi ở mục Hoàn tác: **sau khi áp, không lùi Worker về bản trước Lần B được** (bản cũ ghi kép sẽ bị trigger chặn mọi lần lập đơn). Bài + P16 + `db:migrate:local` + dòng sổ hàng rào + `docs/data-dictionary.json`.

---

## Tự chốt khi lập kế hoạch (ghi lại, không hỏi chủ)

| # | Điều | Chốt | Vì sao |
|---|---|---|---|
| D8-1 | Bộ đếm ở đâu | dòng `audit_log` (`client_outdated_body`, nhóm Hệ thống), không log Worker | D1 đọc được bằng một lệnh chỉ-đọc, giữ lâu; log Worker hết hạn sau vài ngày và không có lệnh đọc. Có `staff_id` để chủ nhắn đúng người |
| D8-2 | Đếm tập nào | thân đơn thiếu `legs` (kể cả không `pickupTime`) + `PUT /trip` có khoá cũ | phải đúng tập bị cắt; đề bài nói "có pickupTime mà không legs" là tập con |
| D8-3 | Vị trí đếm + cắt | sau MỌI 403 (kể cả 403 phụ thuộc thân), trước 400 và PM-1 | giữ luật "403 trước mọi 400 và mọi đọc CSDL" của route lập đơn; máy cũ có quyền luôn nhận một câu "cập nhật app" (không lẫn "đơn vừa đổi"). Mất đếm của máy cũ không có quyền — không đáng kể |
| D8-4 | Migration | không (giữ R11) | giữ khả năng lùi Worker |
| D8-5 | Dữ liệu cũ trong hai cột | giữ nguyên | không xoá cứng; không ai đọc |
| D8-6 | Đổi tên khoá dẫn xuất `ServiceSummaryRow.pickup_*` | đổi sang camelCase | để bài canh không cần mục cho phép yếu cho `repository.ts` |

## Cần chủ (gom một lần)

1. **Gộp bộ đếm (Task 1) vào Đợt 1** — khuyến nghị **có**: đồng hồ 7 ngày chạy sớm, chỉ thêm một loại dòng nhật ký "Máy dùng app bản cũ" (không thông tin khách). Phương án khác: phát hành riêng (thêm một lần triển khai).
2. **Ngưỡng cổng** — khuyến nghị **7 ngày liền không còn máy cũ** + mọi người đã đăng nhập sau bản 1.62. Phương án khác: 14 ngày (chắc hơn, chậm hơn). Cắt sớm chỉ gây phiền (máy cũ được nhắc tải lại), không mất dữ liệu.
3. **Dòng luật CLAUDE.md §10 "Giờ đón / điểm đón…"** (nói "phát hành 1: bản sao ghi kép") sẽ lỗi thời sau Lần B. AI không tự sửa (N9) — sẽ đưa câu mới trong tệp đề xuất luật để chủ duyệt: "Từ phát hành 2 (Đợt 8): hai cột cũ là cột chết, không ghi, không đọc (`src/pickup-cu-khong-doc.test.ts`); thân không `legs` → 409 `client_outdated`."

## Điều chưa chắc

- Nếu bộ đếm ra 0 ngay từ ngày đầu, không phân biệt được "không còn máy cũ" với "bộ đếm không chạy trên production" (AI không được gửi thân thử lên production). Dựa vào bài khung + e2e của Task 1.
- PWA đã cài trên iPhone có thể không lấy bản mới khi chỉ "tải lại" — câu nhắc ghi "đóng hẳn ứng dụng rồi mở lại"; máy cũ hiện băng của chính nó ("Trang đã cũ. Hãy tải lại trang.") chứ không hiện câu máy chủ. Chưa thử trên iPhone thật.
- `kiemChang` có nhận chữ tạm "(chưa ghi nơi đón)" từ thân hay không (Task 3 Step 1) — chưa đo; có phương án dự phòng trong bước.
- Vị trí đếm + cắt (sau mọi 403, trước 400/PM-1) là lựa chọn của kế hoạch để giữ luật thứ tự 403 (D8-3); máy cũ không đủ quyền sẽ không được đếm.
- Khung thử có hỗ trợ mốc giả cho route chặng như kế hoạch giả định (Task 5 Step 1) — người thi công chép từ `chang-route.test.ts`, chưa chạy thử.
- Số dòng/số hàm ở kế hoạch đo tại `0ba370d6`; các Đợt 1–7 sẽ đổi `repository.ts`, `index.ts`, `service.ts` — người thi công đo lại.
