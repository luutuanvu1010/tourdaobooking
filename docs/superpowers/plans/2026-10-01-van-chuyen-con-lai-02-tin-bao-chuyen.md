# Đợt 2 — Tin báo + Bảng tin khi chuyến xe đổi (ADR-0052 D6): Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khi một chuyến xe đổi (xếp tài xế, đổi tài xế, sửa giờ/xe, huỷ, kết thúc giữa chừng, khách vắng), đúng người làm được việc nhận tin ở chuông + điện thoại; mọi màn Điều phối / Chi tiết chuyến / Cuốc của tài xế đang mở tự tải lại — không lộ tên, SĐT khách, không tới người hết quyền.

**Architecture:** Tin chuyến là **hình chiếu nhật ký** (ADR-0034 khuôn, không bảng `ntf_` mới): view công bố mới `v_aud_trip_event` của `audit`; dữ kiện chuyến (mã, ngày, khoảng lái của từng tài xế, đơn của suất vắng) tới `thongbao` và gốc lắp ráp qua **hàm tiêm** (`ctx.chuyenChoTin`) — không module nào import `van-chuyen`. Ai nhận = **một hàm thuần** `tinChuyenCho()` ở `src/shared/tin-chuyen.ts`, dùng chung cho hộp thông báo, gõ cửa màn hình khoá và nhãn Bảng tin. Route `van-chuyen` gọi `ctx.baoThayDoiChuyen` sau lô thành công (bắn-và-quên); gốc lắp ráp phát Bảng tin (mọi lệnh chuyến) và gõ cửa (chỉ hành động có tin).

**Tech Stack:** Cloudflare Worker + D1, Durable Object `BangTin`, Web Push (đã có), TypeScript, `node --test`, khung thử `tests/audit/dieu-phoi-khung.mjs`, e2e `tests/e2e/*.mjs`, kịch bản Chrome.

**Spec:** `docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md` §D6 (dòng 144–178), "Tiêu chí nghiệm thu" mục 11–13 (dòng 250–252), "Điểm cho người kiểm" mục 3, 5 (dòng 281, 283). Nền: ADR-0034 (tin = hình chiếu nhật ký), ADR-0045 (chỉ báo khi xác nhận; nháp không sinh tin), ADR-0022 (Bảng tin, điều 3–4), ADR-0036/0039 (gõ cửa), ADR-0007 điều 4(b) (hàm tiêm). Kế hoạch mẹ: `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md` (Đợt 2, Review Focus dòng 4).

## Hiện trạng đã đo (2026-10-01, HEAD `0ba370d6`)

| Thứ | Ở đâu | Ghi chú cho người thi công |
|---|---|---|
| Hộp thông báo | `src/modules/thongbao/index.ts` `hop()` (dòng ~38), luật lọc `locHopThongBao` ở `src/shared/thong-bao.ts` | tin đơn đọc `v_aud_order_event` (`migrations/0025_thong_bao.sql:53`) |
| Gõ cửa | `dayGoCua(env, tin, giaoLo)` `thongbao/index.ts:~60`; chọn người `nguoiNhanDay` `src/shared/web-push.ts:75` (bọc `locHopThongBao`) | thoát sớm khi thiếu khoá VAPID / không máy |
| Bảng tin | `nhanKetNoi`, `nhanSuKien`, `SuKienDon`, `laSuKienHopLe` ở `src/shared/bang-tin.ts`; `phatDon` `src/modules/bangtin/index.ts`; trạm `tram.ts:90 phat(suKien: SuKienDon, nhan)` | module `bangtin` là lá, không đọc DB |
| Gốc lắp ráp | `src/index.ts` `APP_OPTIONS.injected` (`baoThayDoi`, `mocToiThieu`, `nhanNhanVien`…) | router đưa vào `ctx` ở `src/shared/router.ts:294-322`; kiểu `Ctx` dòng 54–140, `AppOptions.injected` dòng 206–239 |
| Nhật ký chuyến | `nhatKy()` `src/modules/van-chuyen/dieu-phoi.ts:53`: **id nhật ký = id lệnh = id `vc_trip_event`**, `targetType "trip"`, `targetId` = chuyến, `order_id` NULL | `vc_trip_event.request_id` UNIQUE; `vc_trip_driver.valid_from_at/valid_to_at` = **cùng** `lucIso` với nhật ký của lệnh đổi tài xế (`loSuaChuyen` dòng 131–149) |
| Hành động `trip_*` đang có | `src/shared/audit-actions.ts:101-123` | `trip_created`, `trip_edited` (gồm đổi tài xế/xe/giờ), `trip_cancelled`, `trip_allocated`, `trip_allocation_removed`, `trip_allocation_moved`, `trip_stops_synced`, `trip_passengers_synced`, `trip_departed`, `trip_stop_arrived`, `trip_passenger_boarded`, `trip_passenger_no_show`, `trip_passenger_cancelled_at_stop`, `trip_passenger_dropped`, `trip_stops_reordered`, `trip_ended`, `trip_ended_interrupted`, `trip_appt_called`, `trip_appt_call_undone` |
| Route lệnh chuyến | `src/modules/van-chuyen/index.ts:817-1405` (9 văn phòng kế hoạch + 9 tài xế tiến độ + 9 văn phòng bấm thay) | mỗi route: `if (!(await eventByRequest(…))) { const r = await lenhX(…); if (r) return r; }` |
| Ô quyền | `src/shared/permissions.ts:169-179` | `trip.view` SALES/ACC/ADMIN/SA `any`, DRIVER `assigned`, DRIVER_PARTNER `none`; `trip.dispatch` SALES/ADMIN/SA `any` |
| Cạnh module | `src/architecture.test.ts:53` `thongbao: ["audit","orders","dispatch","staff"]`; dòng 840 "không module nào import van-chuyen" | không cạnh mới |
| Màn | `web/dieu-phoi.ts` `nap()` dòng 55; `web/chuyen.ts` `nap()`+`ve()` dòng 39/43; `web/cuoc-chuyen.ts` `nap()` dòng 50; `web/cuoc.ts` chỉ có `main()` | chưa trang nào nghe Bảng tin cho chuyến |

## Quyết định cho đợt này

- **Ô quyền mới: KHÔNG.** Người nhận suy từ ô có sẵn (`trip.view`, `trip.dispatch`) qua `can()` — không tệp đề xuất luật.
- **Migration: CÓ, một tệp, chỉ thêm một VIEW** `v_aud_trip_event` (không bảng, không trigger, không cột). Số migration lấy lúc thi công theo L2 của lộ trình: lớn nhất trong `migrations/` của `main` **và mọi nhánh chưa gộp** (`git ls-tree --name-only <nhánh> migrations/`) + 1. Dưới đây ghi `NNNN`.
- **Giao diện:** không màn mới. Thêm biểu tượng loại tin "chuyến" vào hộp thông báo có sẵn; bốn trang Vận chuyển có sẵn nghe sự kiện Bảng tin để tự tải lại.

### Tự chốt khi lập kế hoạch (bề mặt / hai chiều — ghi lại, không hỏi)

| # | Điều | Chốt | Vì sao |
|---|---|---|---|
| T1 | Chữ ký hàm tiêm (ADR ghi `{ tripId, action }` và `chuyenLienQuan(staffId, tuLuc)`) | `ctx.baoThayDoiChuyen({ tripId, requestId })`; `ctx.chuyenChoTin({ tripIds, suKienIds })` | gốc lắp ráp tự đọc hành động từ nhật ký theo `request_id` (không tin chữ route truyền — một nguồn); tra theo id bằng một truy vấn mảng JSON (khuôn `ordersWithHandler`). ADR-0052 xếp "hàm tiêm" ở cửa **hai chiều** (dòng 211) |
| T2 | Phạm vi sự kiện | **Bảng tin** (làm mới màn): MỌI lệnh chuyến thành công (xếp, rút, dời, sửa, huỷ, cập nhật, xuất bến, tới điểm, đón, vắng, trả, đổi thứ tự, kết thúc). **Hộp thông báo + điện thoại**: chỉ danh sách D6.1 đã có hôm nay: `trip_created`, `trip_edited`, `trip_cancelled`, `trip_ended_interrupted`, `trip_passenger_no_show` | D6.4 "màn đang mở tự tải lại"; D6.1 liệt kê hành động sinh TIN. Sự kiện của D4/D5/ADR-0053 thêm sau bằng một phần tử mảng + một nhánh |
| T3 | Sự kiện Bảng tin chuyến | đúng **4 khoá**: `loai: "chuyen"`, `maChuyen`, `thayDoi`, `luc` — **không** `tripId` | ADR-0022 điều 4 bổ sung (ADR-0052 dòng 198) "chỉ mã chuyến, loại thay đổi, thời điểm". Mã chuyến chỉ duy nhất trong một ngày ⇒ trùng mã khác ngày chỉ gây một lần tải lại thừa (vô hại) |
| T4 | Thông báo nổi (toast) cho sự kiện chuyến | **Không** — chỉ làm mới màn | tin đã ở chuông + điện thoại; tránh nhân đôi |
| T5 | Ngăn hộp | tin chuyến luôn `cuaToi: true` (ở cả hai ngăn của người nhận), **không** hiện ở ngăn "Tất cả" của người không nhận | D6.2 "không bao giờ gắn `tat-ca`" |
| T6 | Đường dẫn khi bấm tin | tài xế: `/cuoc-chuyen?id=<chuyến>`; tin "không còn lái" / "chuyến huỷ": `/cuoc` (chi tiết sẽ 404); văn phòng: `/chuyen?id=<chuyến>` | bề mặt |
| T7 | MQ-07 (giờ hẹn chặng đổi khi đã xếp — `order_leg_updated`) | **tách khỏi đợt này** — xem "Cần chủ" mục 3 | nhật ký `order_leg_updated` không ghi chặng nào (`orders/repository.ts:1352` không `targetId`), có hai đường ghi (sửa đơn, sửa chặng); không xác định được "giờ hẹn đổi" mà không đọc `detail` (cấm — D6.1). Văn phòng đã có danh sách "Nhắc gọi báo khách" (ADR-0051) |

### Câu chữ tin (đề xuất — chủ duyệt bề mặt, xem "Cần chủ" mục 1)

`{c}` = `chuyến <mã> ngày <dd/mm>` (vd "chuyến CX-1103-02 ngày 11/03"). Không tên, không SĐT, không nơi.

| Loại | Ai nhận | Câu |
|---|---|---|
| `xep_lai` | tài xế vừa được xếp (tạo chuyến / đổi sang mình) | Bạn được xếp lái {c} |
| `go_lai` | tài xế vừa bị đổi ra | Bạn không còn lái {c} |
| `doi_chuyen` | tài xế đang lái, văn phòng sửa giờ / xe / điểm | Văn phòng vừa sửa {c} — mở để xem giờ, xe, điểm |
| `huy_chuyen` | tài xế đang lái lúc huỷ | {C} đã bị huỷ |
| `gian_doan` | người có `trip.dispatch` (Bán hàng, Quản trị, Toàn quyền) | {C} kết thúc giữa chừng — cần xếp xe cho khách còn lại |
| `khach_vang` | người lập / người phụ trách đơn **có `trip.view`** | Có khách vắng ở {c} (đơn <mã đơn>) |

## Global Constraints

- Tiếng Việt CÓ DẤU ở mọi chữ người dùng thấy, commit, tài liệu; không lộ mã thô (`trip_edited`, `xep_lai`, `PASSENGER_NO_SHOW`…).
- Tin, sự kiện Bảng tin, dòng log **không** chứa tên/năm sinh/SĐT khách, chữ nơi tự do, khoá `place_key` (`L:…`/`T:…`), số giấy tờ; không dãy ≥ 8 chữ số (Hiến chương 5.12; ADR-0052 tiêu chí 12).
- **Không đọc `audit_log.detail`** để tìm người nhận hay dựng câu (ADR-0030 điều 3, ADR-0052 D6.1).
- Mọi người nhận qua `can(…)` **hiện hành lúc đọc/gửi**; tài xế: dòng lái mở ≤ t và (còn mở hoặc đóng ≥ t). Tài khoản chỉ-`DRIVER_PARTNER`, chỉ-`FIELD`/`PARTNER`/`INTERN` không nhận tin chuyến nào (D6.2).
- Tin chuyến không bao giờ mang nhãn `tat-ca`, `noi-bo`, `cho-nhan`.
- `thongbao`, `bangtin` **không** import `van-chuyen`; không cạnh mới trong `ALLOWED_EDGES`; `src/shared/` không import `src/modules/`; import nội bộ `src/shared/` kèm đuôi `.ts`.
- SQL module nghiêm qua `defineSql`, câu tĩnh; danh sách giá trị truyền bằng tham số JSON (`json_each`), không ghép chuỗi.
- Bắn-và-quên: lỗi tin không bao giờ đổi mã trả về / làm chậm lệnh; không gọi khi 400/403/404/409 hoặc khi lệnh lặp (`requestId` đã có).
- Ngày dân sự giờ VN; mốc thời gian so **bằng chuỗi** ISO `toISOString()` (đủ mili-giây) — `lucIso` của lệnh.
- Giao diện: không `innerHTML` (dựng bằng `h()`); không giá trị CSS mới ngoài token; chạy kịch bản Chrome 390 + 1040.
- Mỗi task: test đỏ trước → xanh sau; cuối đợt `npm test`, `npm run typecheck` 0 lỗi, `npm run test:e2e` đủ bộ, `node scripts/audit-invariants.mjs --db local`.
- Lệnh cấm AI tự chạy (CLAUDE.md §8) giữ nguyên; chủ chạy `npm run day-len -- <nhánh>` rồi `npm run trien-khai`.
- Việc lớn (dữ liệu cá nhân + quyền đọc) ⇒ người kiểm độc lập chỉ đọc sau Task 7; người thi công không tự nghiệm thu.

## Review Focus

1. **Tài xế bị đổi ra** thấy tin "không còn lái" nhưng **không** thấy tin nào của chuyến đó sau mốc đổi; tài khoản **bị gỡ quyền Tài xế** không còn thấy cả tin cũ (người nhận tính lúc đọc). → Task 1 (bảng ca) + Task 3 (khung thử qua route thật).
2. **Tin, sự kiện Bảng tin không chứa** tên, năm sinh, SĐT, chữ nơi tự do có dãy số, khoá nơi. → Task 1 (khoá DTO), Task 7 (quét toàn tuyến + e2e).
3. **Bấm hai lần / 409 / lệnh lặp** không bắn tin lần hai và không bắn khi bị từ chối. → Task 5.
4. **Người tự làm không tự nhận tin của mình** (văn phòng vừa huỷ chuyến mà chính họ đang lái; tài xế tự bấm "Kết thúc giữa chừng" mà cũng có `trip.dispatch`). → Task 1.
5. **Kết nối Bảng tin của người không có `trip.view`** (HDV, Đối tác, Thực tập, Tài xế đối tác) không nhận sự kiện chuyến; tài xế chỉ nhận sự kiện của chuyến mình lái lúc đó. → Task 4.

---

### Task 1: Hàm thuần người nhận + câu tin (`src/shared/tin-chuyen.ts`)

**Files:**
- Create: `src/shared/tin-chuyen.ts`
- Test: `src/shared/tin-chuyen.test.ts`

**Interfaces:**
- Consumes: `can`, `PermissionHolder`, `PERMISSION_CODES` (`src/shared/permissions.ts`); `ThayDoiChuyen`, `SuKienChuyen` (Task 4 thêm vào `src/shared/bang-tin.ts` — Task 1 tự khai `THAY_DOI_CHUYEN` ở `bang-tin.ts` ngay bước 3 để không phụ thuộc thứ tự).
- Produces (các task sau dùng đúng tên):
  ```ts
  export const HANH_DONG_TIN_CHUYEN: readonly ["trip_created","trip_edited","trip_cancelled","trip_ended_interrupted","trip_passenger_no_show"];
  export function laHanhDongTinChuyen(a: string): boolean;
  export type LoaiTinChuyen = "xep_lai" | "go_lai" | "doi_chuyen" | "huy_chuyen" | "gian_doan" | "khach_vang";
  export interface KhoangLai { partyId: string; tu: string; den: string | null }
  export interface DonCuaTin { orderId: string; maDon: string; ownerId: string; handlerStaffId: string | null }
  export interface DongChuyenTho { id: string; tripId: string; actorId: string | null; action: string; luc: string }
  export interface ChuyenChoTin { chuyen: { tripId: string; ma: string; ngayChay: string; lai: KhoangLai[] }[]; vang: { suKienId: string; orderId: string }[] }
  export interface DongChuyen extends DongChuyenTho { maChuyen: string; ngayChay: string; lai: KhoangLai[]; don: DonCuaTin[] }
  export interface NguoiNhanChuyen extends PermissionHolder { readonly partyId: string | null }
  export function laiLucSuKien(lai: readonly KhoangLai[], partyId: string, luc: string): KhoangLai | null;
  export function tinChuyenCho(nguoi: NguoiNhanChuyen, d: DongChuyen): { loai: LoaiTinChuyen; cau: string; lienKet: string } | null;
  export function dungDongChuyen(tho: readonly DongChuyenTho[], f: ChuyenChoTin, don: readonly DonCuaTin[]): DongChuyen[];
  export function taiXeNhanSuKien(taiKhoan: readonly NguoiNhanChuyen[], lai: readonly KhoangLai[], luc: string): string[];
  export function thayDoiCuaHanhDongChuyen(action: string): ThayDoiChuyen;
  ```

- [ ] **Step 1: Viết bài đỏ** — `src/shared/tin-chuyen.test.ts`:

```ts
// TIN CHUYẾN (ADR-0052 D6.2) — bảng ca theo vai + mọi tập con quyền (khuôn NT-3, suy kỳ vọng từ can(), không chép tay) + khoá không lộ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, can, type PermissionCode } from "./permissions.ts";
import {
  HANH_DONG_TIN_CHUYEN, dungDongChuyen, laiLucSuKien, taiXeNhanSuKien, thayDoiCuaHanhDongChuyen, tinChuyenCho,
  type DongChuyen, type NguoiNhanChuyen,
} from "./tin-chuyen.ts";

const T0 = "2027-03-11T01:00:00.000Z", T1 = "2027-03-11T02:00:00.000Z", T2 = "2027-03-11T03:00:00.000Z";
const nguoi = (id: string, permissions: PermissionCode[], partyId: string | null = null): NguoiNhanChuyen => ({ id, permissions, partyId });
const dong = (v: Partial<DongChuyen>): DongChuyen => ({
  id: "ev", tripId: "t1", maChuyen: "CX-1103-02", ngayChay: "2027-03-11", action: "trip_edited", actorId: "sales", luc: T1,
  lai: [{ partyId: "p-a", tu: T0, den: T1 }, { partyId: "p-b", tu: T1, den: null }], don: [], ...v,
});
const TX_A = nguoi("tx-a", ["DRIVER"], "p-a"), TX_B = nguoi("tx-b", ["DRIVER"], "p-b");

test("đổi tài xế (trip_edited cùng mốc): A nhận 'không còn lái', B nhận 'được xếp'; văn phòng khác không nhận", () => {
  const d = dong({});
  assert.equal(tinChuyenCho(TX_A, d)?.loai, "go_lai");
  assert.equal(tinChuyenCho(TX_B, d)?.loai, "xep_lai");
  assert.equal(tinChuyenCho(nguoi("sales2", ["SALES"]), d), null);
  assert.equal(tinChuyenCho(nguoi("kt", ["ACCOUNTING"]), d), null);
});

test("tài xế bị gỡ KHÔNG thấy tin sau mốc gỡ; tài xế đang lái thấy 'văn phòng vừa sửa'", () => {
  const sau = dong({ id: "ev2", luc: T2 });
  assert.equal(tinChuyenCho(TX_A, sau), null);
  assert.equal(tinChuyenCho(TX_B, sau)?.loai, "doi_chuyen");
});

test("tạo chuyến → tài xế được xếp; huỷ → tài xế có dòng lái đóng ĐÚNG mốc huỷ nhận 'đã bị huỷ'", () => {
  assert.equal(tinChuyenCho(TX_B, dong({ action: "trip_created", lai: [{ partyId: "p-b", tu: T1, den: null }] }))?.loai, "xep_lai");
  assert.equal(tinChuyenCho(TX_B, dong({ action: "trip_cancelled", luc: T2, lai: [{ partyId: "p-b", tu: T1, den: T2 }] }))?.loai, "huy_chuyen");
});

test("hết quyền: tài khoản mất quyền DRIVER (hoặc chỉ DRIVER_PARTNER) không nhận dù có dòng lái", () => {
  assert.equal(tinChuyenCho(nguoi("tx-b", [], "p-b"), dong({})), null);
  assert.equal(tinChuyenCho(nguoi("tx-dt", ["DRIVER_PARTNER"], "p-b"), dong({})), null);
});

test("người tự làm không tự nhận (E3)", () => {
  assert.equal(tinChuyenCho(nguoi("tx-b", ["DRIVER"], "p-b"), dong({ actorId: "tx-b" })), null);
  assert.equal(tinChuyenCho(nguoi("adm", ["ADMIN"]), dong({ action: "trip_ended_interrupted", actorId: "adm" })), null);
});

test("kết thúc gián đoạn → mọi người có trip.dispatch (Bán hàng, Quản trị, Toàn quyền), không Kế toán, không tài xế", () => {
  const d = dong({ action: "trip_ended_interrupted", actorId: "tx-b" });
  for (const p of ["SALES", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(tinChuyenCho(nguoi("x", [p]), d)?.loai, "gian_doan", p);
  assert.equal(tinChuyenCho(nguoi("kt", ["ACCOUNTING"]), d), null);
  assert.equal(tinChuyenCho(nguoi("tx-a2", ["DRIVER"], "p-b"), d), null);
});

test("khách vắng → người lập / người phụ trách CÓ trip.view; HDV, Đối tác, Thực tập (không trip.view) không", () => {
  const d = dong({ action: "trip_passenger_no_show", actorId: "tx-b", don: [{ orderId: "o1", maDon: "DH-0001", ownerId: "lap", handlerStaffId: "pt" }] });
  assert.equal(tinChuyenCho(nguoi("lap", ["SALES"]), d)?.loai, "khach_vang");
  assert.equal(tinChuyenCho(nguoi("pt", ["ADMIN"]), d)?.loai, "khach_vang");
  assert.equal(tinChuyenCho(nguoi("khac", ["SALES"]), d), null);
  for (const p of ["FIELD", "PARTNER", "INTERN"] as const) {
    assert.equal(tinChuyenCho(nguoi("lap", [p]), d), null, `người lập ${p}`);
    assert.equal(tinChuyenCho(nguoi("pt", [p]), d), null, `người phụ trách ${p}`);
  }
  assert.match(tinChuyenCho(nguoi("lap", ["SALES"]), d)!.cau, /DH-0001/);
});

// Mọi tập con quyền (1024): bất biến suy từ can(), không chép tay bảng.
function moiTapCon<T>(m: readonly T[]): T[][] {
  if (m.length === 0) return [[]];
  const [dau, ...con] = m;
  const c = moiTapCon(con);
  return [...c, ...c.map((t) => [dau as T, ...t])];
}
test("mọi tập con quyền × mọi hành động: nhận ⇒ qua can(trip.view) (tài xế: assigned + có dòng lái lúc đó); chỉ-DRIVER_PARTNER không bao giờ", () => {
  const tap = moiTapCon(PERMISSION_CODES as readonly PermissionCode[]);
  assert.equal(tap.length, 1024);
  for (const permissions of tap) {
    for (const action of [...HANH_DONG_TIN_CHUYEN, "trip_allocated", "trip_departed"]) {
      for (const partyId of ["p-b", null]) {
        const n = { id: "lap", permissions, partyId };
        const d = dong({ action, actorId: "khac", don: [{ orderId: "o1", maDon: "DH-1", ownerId: "lap", handlerStaffId: null }] });
        const t = tinChuyenCho(n, d);
        if (!t) continue;
        const laiDung = partyId !== null && laiLucSuKien(d.lai, partyId, d.luc) !== null && can(n, "trip.view", { assigned: true });
        assert.ok(laiDung || can(n, "trip.view"), `nhận mà không có trip.view: ${JSON.stringify(permissions)} ${action}`);
        assert.ok((HANH_DONG_TIN_CHUYEN as readonly string[]).includes(action), `hành động ngoài danh sách D6.1 sinh tin: ${action}`);
        assert.notDeepEqual(permissions, ["DRIVER_PARTNER"]);
      }
    }
  }
});

test("câu tin không chứa gì ngoài mã chuyến, ngày, mã đơn — khoá DongChuyen không có trường tên/SĐT/nơi", () => {
  const d = dong({ action: "trip_passenger_no_show", don: [{ orderId: "o1", maDon: "DH-0001", ownerId: "lap", handlerStaffId: null }] });
  const t = tinChuyenCho(nguoi("lap", ["SALES"]), d)!;
  assert.equal(t.cau, "Có khách vắng ở chuyến CX-1103-02 ngày 11/03 (đơn DH-0001)");
  assert.deepEqual(Object.keys(d).sort(), ["action", "actorId", "don", "id", "lai", "luc", "maChuyen", "ngayChay", "tripId"]);
  assert.doesNotMatch(t.cau, /\d{8,}/);
});

test("đường dẫn: tài xế → /cuoc-chuyen?id=; không còn lái / huỷ → /cuoc; văn phòng → /chuyen?id=", () => {
  assert.equal(tinChuyenCho(TX_B, dong({}))!.lienKet, "/cuoc-chuyen?id=t1");
  assert.equal(tinChuyenCho(TX_A, dong({}))!.lienKet, "/cuoc");
  assert.equal(tinChuyenCho(nguoi("s", ["SALES"]), dong({ action: "trip_ended_interrupted", actorId: "x" }))!.lienKet, "/chuyen?id=t1");
});

test("dungDongChuyen: ghép mã/ngày/khoảng lái theo chuyến, đơn theo sự kiện vắng; chuyến không có dữ kiện thì bỏ", () => {
  const r = dungDongChuyen(
    [{ id: "e1", tripId: "t1", actorId: "a", action: "trip_passenger_no_show", luc: T1 }, { id: "e2", tripId: "lạ", actorId: "a", action: "trip_created", luc: T1 }],
    { chuyen: [{ tripId: "t1", ma: "CX-1", ngayChay: "2027-03-11", lai: [] }], vang: [{ suKienId: "e1", orderId: "o1" }] },
    [{ orderId: "o1", maDon: "DH-1", ownerId: "lap", handlerStaffId: null }],
  );
  assert.equal(r.length, 1);
  assert.deepEqual(r[0]!.don.map((x) => x.maDon), ["DH-1"]);
});

test("taiXeNhanSuKien: chỉ tài khoản có dòng lái lúc t VÀ qua can(trip.view, assigned)", () => {
  const lai = [{ partyId: "p-a", tu: T0, den: T1 }, { partyId: "p-b", tu: T1, den: null }];
  assert.deepEqual(taiXeNhanSuKien([TX_A, TX_B, nguoi("dt", ["DRIVER_PARTNER"], "p-b")], lai, T2), ["tx-b"]);
});

test("thayDoiCuaHanhDongChuyen: mọi trip_* có loại thay đổi; hành động lạ → 'sua'", () => {
  assert.equal(thayDoiCuaHanhDongChuyen("trip_allocated"), "xep");
  assert.equal(thayDoiCuaHanhDongChuyen("trip_passenger_no_show"), "tien_do");
  assert.equal(thayDoiCuaHanhDongChuyen("trip_zzz"), "sua");
});
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/shared/tin-chuyen.test.ts`
Expected: FAIL — `Cannot find module './tin-chuyen.ts'`.

- [ ] **Step 3: Thêm loại thay đổi Bảng tin chuyến vào `src/shared/bang-tin.ts`** (đặt sau `SuKienDon`):

```ts
/** ADR-0052 D6.4 + bổ sung ADR-0022 điều 4: sự kiện CHUYẾN — đúng 4 khoá (mã chuyến, loại thay đổi, thời điểm). Không tripId (tự chốt T3). */
export const THAY_DOI_CHUYEN = ["tao", "sua", "xep", "rut", "doi", "huy", "cap_nhat", "xuat_ben", "tien_do", "ket_thuc", "gian_doan"] as const;
export type ThayDoiChuyen = (typeof THAY_DOI_CHUYEN)[number];
export interface SuKienChuyen {
  loai: "chuyen";
  maChuyen: string;
  thayDoi: ThayDoiChuyen;
  luc: string;
}
```

- [ ] **Step 4: Viết `src/shared/tin-chuyen.ts`**

```ts
// TIN CHUYẾN XE (ADR-0052 D6.2) — MỘT hàm thuần người nhận, dùng chung hộp thông báo (locHopThongBao), gõ cửa màn hình khoá (nguoiNhanDay) và nhãn
// Bảng tin (taiXeNhanSuKien). Không I/O. Không đọc `detail` nhật ký. Dữ kiện chỉ gồm khoá + mã chuyến, ngày chạy, mã đơn — không tên, SĐT, nơi.
// Thêm sự kiện D4/D5/ADR-0053: thêm phần tử HANH_DONG_TIN_CHUYEN + một nhánh trong `loaiCho` + một dòng CAU (bảng hai chiều — ADR-0052 dòng 211).
import { can, type PermissionHolder } from "./permissions.ts";
import type { ThayDoiChuyen } from "./bang-tin.ts";

export const HANH_DONG_TIN_CHUYEN = ["trip_created", "trip_edited", "trip_cancelled", "trip_ended_interrupted", "trip_passenger_no_show"] as const;
export const laHanhDongTinChuyen = (a: string): boolean => (HANH_DONG_TIN_CHUYEN as readonly string[]).includes(a);
export type LoaiTinChuyen = "xep_lai" | "go_lai" | "doi_chuyen" | "huy_chuyen" | "gian_doan" | "khach_vang";

export interface KhoangLai { partyId: string; tu: string; den: string | null }
export interface DonCuaTin { orderId: string; maDon: string; ownerId: string; handlerStaffId: string | null }
/** Một dòng `v_aud_trip_event` (chỉ khoá — không detail). `id` = id lệnh = id sự kiện `vc_trip_event`. */
export interface DongChuyenTho { id: string; tripId: string; actorId: string | null; action: string; luc: string }
/** Dữ kiện `van-chuyen` cấp qua hàm tiêm (`ctx.chuyenChoTin`) — thongbao không đọc bảng vc_. */
export interface ChuyenChoTin {
  chuyen: { tripId: string; ma: string; ngayChay: string; lai: KhoangLai[] }[];
  vang: { suKienId: string; orderId: string }[];
}
export interface DongChuyen extends DongChuyenTho { maChuyen: string; ngayChay: string; lai: KhoangLai[]; don: DonCuaTin[] }
export interface NguoiNhanChuyen extends PermissionHolder { readonly partyId: string | null }

/** Dòng lái của `partyId` bao mốc `luc`: mở ≤ t và (còn mở hoặc đóng ≥ t) — so CHUỖI ISO (cùng `lucIso` của lệnh). */
export function laiLucSuKien(lai: readonly KhoangLai[], partyId: string, luc: string): KhoangLai | null {
  return lai.find((k) => k.partyId === partyId && k.tu <= luc && (k.den === null || k.den >= luc)) ?? null;
}

function loaiCho(n: NguoiNhanChuyen, d: DongChuyen): LoaiTinChuyen | null {
  if (d.actorId === n.id) return null; // E3: không tự nhận tin của mình
  const k = n.partyId === null ? null : laiLucSuKien(d.lai, n.partyId, d.luc);
  if (k && can(n, "trip.view", { assigned: true })) {
    if (d.action === "trip_created") return "xep_lai";
    if (d.action === "trip_cancelled") return "huy_chuyen";
    if (d.action === "trip_edited") return k.tu === d.luc ? "xep_lai" : k.den === d.luc ? "go_lai" : "doi_chuyen";
  }
  if (!can(n, "trip.view")) return null; // không ngữ cảnh = ô any (văn phòng). DRIVER (assigned) / FIELD / PARTNER / INTERN / DRIVER_PARTNER dừng ở đây.
  if (d.action === "trip_ended_interrupted" && can(n, "trip.dispatch")) return "gian_doan";
  if (d.action === "trip_passenger_no_show" && d.don.some((x) => x.ownerId === n.id || x.handlerStaffId === n.id)) return "khach_vang";
  return null;
}

const ngayNgan = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const hoa = (s: string) => s.charAt(0).toLocaleUpperCase("vi-VN") + s.slice(1);

export function tinChuyenCho(n: NguoiNhanChuyen, d: DongChuyen): { loai: LoaiTinChuyen; cau: string; lienKet: string } | null {
  const loai = loaiCho(n, d);
  if (!loai) return null;
  const c = `chuyến ${d.maChuyen} ngày ${ngayNgan(d.ngayChay)}`;
  const id = encodeURIComponent(d.tripId);
  switch (loai) {
    case "xep_lai": return { loai, cau: `Bạn được xếp lái ${c}`, lienKet: `/cuoc-chuyen?id=${id}` };
    case "go_lai": return { loai, cau: `Bạn không còn lái ${c}`, lienKet: "/cuoc" };
    case "doi_chuyen": return { loai, cau: `Văn phòng vừa sửa ${c} — mở để xem giờ, xe, điểm`, lienKet: `/cuoc-chuyen?id=${id}` };
    case "huy_chuyen": return { loai, cau: `${hoa(c)} đã bị huỷ`, lienKet: "/cuoc" };
    case "gian_doan": return { loai, cau: `${hoa(c)} kết thúc giữa chừng — cần xếp xe cho khách còn lại`, lienKet: `/chuyen?id=${id}` };
    case "khach_vang": {
      const ma = d.don.find((x) => x.ownerId === n.id || x.handlerStaffId === n.id)!.maDon;
      return { loai, cau: `Có khách vắng ở ${c} (đơn ${ma})`, lienKet: `/chuyen?id=${id}` };
    }
  }
}

/** Ghép dòng nhật ký với dữ kiện van-chuyen + đơn. Chuyến không có dữ kiện (đã lạ) → bỏ dòng (không đoán). */
export function dungDongChuyen(tho: readonly DongChuyenTho[], f: ChuyenChoTin, don: readonly DonCuaTin[]): DongChuyen[] {
  const chuyen = new Map(f.chuyen.map((c) => [c.tripId, c]));
  const donTheoId = new Map(don.map((x) => [x.orderId, x]));
  const out: DongChuyen[] = [];
  for (const t of tho) {
    const c = chuyen.get(t.tripId);
    if (!c) continue;
    const ds = f.vang.filter((v) => v.suKienId === t.id).map((v) => donTheoId.get(v.orderId)).filter((x): x is DonCuaTin => x !== undefined);
    out.push({ ...t, maChuyen: c.ma, ngayChay: c.ngayChay, lai: c.lai, don: ds });
  }
  return out;
}

/** Bảng tin: id tài khoản tài xế có dòng lái bao mốc `luc` và qua can(trip.view, assigned). Người gọi đưa danh sách ĐANG HOẠT ĐỘNG. */
export function taiXeNhanSuKien(taiKhoan: readonly NguoiNhanChuyen[], lai: readonly KhoangLai[], luc: string): string[] {
  return taiKhoan
    .filter((t) => t.partyId !== null && laiLucSuKien(lai, t.partyId, luc) !== null && can(t, "trip.view", { assigned: true }))
    .map((t) => t.id);
}

const THAY_DOI_CUA: Record<string, ThayDoiChuyen> = {
  trip_created: "tao", trip_edited: "sua", trip_allocated: "xep", trip_allocation_removed: "rut", trip_allocation_moved: "doi", trip_cancelled: "huy",
  trip_stops_synced: "cap_nhat", trip_passengers_synced: "cap_nhat", trip_departed: "xuat_ben", trip_stop_arrived: "tien_do",
  trip_passenger_boarded: "tien_do", trip_passenger_no_show: "tien_do", trip_passenger_cancelled_at_stop: "tien_do", trip_passenger_dropped: "tien_do",
  trip_stops_reordered: "tien_do", trip_ended: "ket_thuc", trip_ended_interrupted: "gian_doan",
};
export const thayDoiCuaHanhDongChuyen = (action: string): ThayDoiChuyen => THAY_DOI_CUA[action] ?? "sua";
```

- [ ] **Step 5: Chạy, xác nhận xanh**

Run: `node --test src/shared/tin-chuyen.test.ts src/shared/bang-tin.test.ts`
Expected: PASS (bang-tin.test.ts chưa đổi hành vi).

- [ ] **Step 6: Đột biến quan sát chặn thật (P16)** — tạm xoá dòng `if (!can(n, "trip.view")) return null;` → chạy lại → bài "khách vắng … HDV, Đối tác, Thực tập" và "mọi tập con" ĐỎ → hoàn nguyên → xanh. Ghi câu đỏ quan sát được vào nhật ký thi công.

- [ ] **Step 7: Commit**

```bash
git add src/shared/tin-chuyen.ts src/shared/tin-chuyen.test.ts src/shared/bang-tin.ts
git commit -m "Tin chuyến: một hàm thuần chọn người nhận + câu tin (ADR-0052 D6.2)

Vì sao: hộp thông báo, gõ cửa và Bảng tin phải dùng chung MỘT luật người nhận,
tính bằng can() lúc đọc; tài xế theo khoảng lái bao mốc sự kiện."
```

---

### Task 2: View nhật ký chuyến + hàm đọc công bố của `van-chuyen` và `thongbao`

**Files:**
- Create: `migrations/NNNN_tin_chuyen.sql`
- Modify: `src/modules/van-chuyen/chuyen-repo.ts` (thêm 4 câu + 2 hàm), `src/modules/van-chuyen/index.ts` (xuất 2 hàm công bố), `src/modules/thongbao/repository.ts` (3 câu + 3 hàm), `docs/data-dictionary.json` (+ `npm run dict`), `src/architecture.test.ts` (bài siết khuôn dòng 881)
- Test: `src/modules/thongbao/tin-chuyen-doc.test.ts`

**Interfaces:**
- Consumes: `ChuyenChoTin`, `DongChuyenTho`, `DonCuaTin`, `HANH_DONG_TIN_CHUYEN` (Task 1).
- Produces:
  ```ts
  // van-chuyen/index.ts (CHỈ gốc lắp ráp gọi — bài siết)
  export async function suKienTheoYeuCau(db: D1Database, requestId: string): Promise<{ id: string; tripId: string; relatedTripId: string | null } | null>;
  export async function chuyenChoTinTheoId(db: D1Database, q: { tripIds: readonly string[]; suKienIds: readonly string[] }): Promise<ChuyenChoTin>;
  // thongbao/repository.ts
  export async function listTinChuyen(db: D1Database, tu: string): Promise<DongChuyenTho[]>;   // chỉ HANH_DONG_TIN_CHUYEN, 30 ngày
  export async function tinChuyenTheoId(db: D1Database, id: string): Promise<DongChuyenTho | null>; // MỌI trip_* (cho Bảng tin)
  export async function donChoTin(db: D1Database, orderIds: readonly string[]): Promise<DonCuaTin[]>;
  ```

- [ ] **Step 1: Đặt số migration** — chạy:

```bash
ls migrations | tail -5
for b in $(git branch --format='%(refname:short)'); do git ls-tree --name-only "$b" migrations/ | tail -1; done | sort -u | tail -3
```
Lấy số lớn nhất + 1 làm `NNNN`. Ghi số vào nhật ký thi công.

- [ ] **Step 2: Viết bài đỏ** — `src/modules/thongbao/tin-chuyen-doc.test.ts` (khung thử SQLite thật):

```ts
// ADR-0052 D6.1: nguồn tin chuyến = v_aud_trip_event (chỉ khoá) + dữ kiện van-chuyen theo id (hàm công bố). Chạy CẢ ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app } from "../../../tests/audit/harness.mjs";
import { DRIVER, DRIVER2, SALES, batDongHo, chuyenSan, setup, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

test("v_aud_trip_event: đúng 5 cột khoá, không detail; mỗi lệnh chuyến một dòng, id = id vc_trip_event", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const cot = w.q("SELECT name FROM pragma_table_info('v_aud_trip_event')").map((x: any) => x.name);
    assert.deepEqual(cot, ["id", "trip_id", "staff_id", "action", "created_at"]);
    const dong = w.q("SELECT e.action FROM v_aud_trip_event e JOIN vc_trip_event v ON v.id = e.id WHERE e.trip_id = ? ORDER BY e.created_at", a.id).map((x: any) => x.action);
    assert.deepEqual(dong, ["trip_created", "trip_allocated"]);
  } finally {
    tat();
  }
});

test("chuyenChoTinTheoId: mã, ngày, khoảng lái (cả dòng đã đóng); suất vắng → đơn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 2 });
    const c = (await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES })).json;
    const doi = await w.call("PUT", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), taiXePartyId: `pty-${DRIVER2}` } });
    assert.equal(doi.status, 200, doi.text);
    const f = await app.chuyenChoTinTheoId(w.env.DB, { tripIds: [a.id], suKienIds: [] });
    assert.equal(f.chuyen[0].ma, a.ma);
    assert.deepEqual(f.chuyen[0].lai.map((k: any) => [k.partyId, k.den === null]).sort(), [[`pty-${DRIVER}`, false], [`pty-${DRIVER2}`, true]]);
    assert.ok(!JSON.stringify(f).includes("Khách Dò Tìm"));
  } finally {
    tat();
  }
});
```

Bước kèm (khung thử): `tests/audit/harness.mjs` dòng 37–39 — thêm vào chuỗi export của bản dựng: `export { chuyenChoTinTheoId, suKienTheoYeuCau } from "./modules/van-chuyen";` (cùng khuôn `listAll`). `world()` đã trả `env` (dòng 157). Không thêm cửa sau nào khác.

- [ ] **Step 3: Chạy, xác nhận đỏ**

Run: `node --test src/modules/thongbao/tin-chuyen-doc.test.ts`
Expected: FAIL — `no such table: v_aud_trip_event` / hàm chưa có.

- [ ] **Step 4: Viết migration** `migrations/NNNN_tin_chuyen.sql`:

```sql
-- ADR-0052 D6.1 (lượt A-1, đã duyệt 2026-09-30): nguồn TIN CHUYẾN = hình chiếu audit_log (khuôn v_aud_order_event, 0025). Chỉ THÊM một view công bố của
-- module audit. CHỈ KHOÁ — không detail (không tên, không nơi). id = id lệnh = id vc_trip_event. Mọi hành động trip_* (Bảng tin cần mọi lệnh; hộp thông
-- báo lọc theo HANH_DONG_TIN_CHUYEN ở mã — src/shared/tin-chuyen.ts).
CREATE VIEW v_aud_trip_event AS
  SELECT id, target_id AS trip_id, staff_id, action, created_at FROM audit_log
  WHERE target_type = 'trip' AND target_id IS NOT NULL AND action LIKE 'trip\_%' ESCAPE '\';
```

- [ ] **Step 5: Câu SQL + hàm của `van-chuyen`** — cuối `src/modules/van-chuyen/chuyen-repo.ts`:

```ts
// ---- TIN CHUYẾN (ADR-0052 D6.3): dữ kiện cho thongbao / gốc lắp ráp qua hàm tiêm — chỉ khoá, mã chuyến, ngày, khoảng lái, đơn của suất vắng. ----
const SU_KIEN_THEO_YEU_CAU = defineSql("van-chuyen", "su_kien_theo_yeu_cau", `SELECT id, trip_id, related_trip_id FROM vc_trip_event WHERE request_id = ?1`);
const CHUYEN_CHO_TIN = defineSql("van-chuyen", "chuyen_cho_tin",
  `SELECT t.id AS trip_id, t.code AS ma, t.service_date AS ngay_chay FROM vc_trip t WHERE t.id IN (SELECT value FROM json_each(?1))`);
const LAI_CHO_TIN = defineSql("van-chuyen", "lai_cho_tin",
  `SELECT d.trip_id, d.driver_party_id AS party_id, d.valid_from_at AS tu, d.valid_to_at AS den FROM vc_trip_driver d WHERE d.trip_id IN (SELECT value FROM json_each(?1))`);
const VANG_CHO_TIN = defineSql("van-chuyen", "vang_cho_tin", `
  SELECT e.id AS su_kien_id, k.order_id FROM vc_trip_event e
  JOIN vc_trip_allocation a ON a.id = e.allocation_id JOIN v_ord_leg_key k ON k.id = a.leg_id
  WHERE e.id IN (SELECT value FROM json_each(?1)) AND e.kind = 'PASSENGER_NO_SHOW'`);

export async function suKienTheoYeuCau(db: D1Database, requestId: string): Promise<{ id: string; tripId: string; relatedTripId: string | null } | null> {
  const r = await db.prepare(SU_KIEN_THEO_YEU_CAU).bind(requestId).first<{ id: string; trip_id: string; related_trip_id: string | null }>();
  return r ? { id: r.id, tripId: r.trip_id, relatedTripId: r.related_trip_id } : null;
}
export async function chuyenChoTinTheoId(db: D1Database, q: { tripIds: readonly string[]; suKienIds: readonly string[] }): Promise<ChuyenChoTin> {
  const tj = JSON.stringify([...new Set(q.tripIds)]);
  const [t, l, v] = await Promise.all([
    db.prepare(CHUYEN_CHO_TIN).bind(tj).all<{ trip_id: string; ma: string; ngay_chay: string }>(),
    db.prepare(LAI_CHO_TIN).bind(tj).all<{ trip_id: string; party_id: string; tu: string; den: string | null }>(),
    q.suKienIds.length ? db.prepare(VANG_CHO_TIN).bind(JSON.stringify([...new Set(q.suKienIds)])).all<{ su_kien_id: string; order_id: string }>() : Promise.resolve({ results: [] }),
  ]);
  return {
    chuyen: t.results.map((c) => ({ tripId: c.trip_id, ma: c.ma, ngayChay: c.ngay_chay,
      lai: l.results.filter((x) => x.trip_id === c.trip_id).map((x) => ({ partyId: x.party_id, tu: x.tu, den: x.den })) })),
    vang: v.results.map((x) => ({ suKienId: x.su_kien_id, orderId: x.order_id })),
  };
}
```
(import type `ChuyenChoTin` từ `../../shared/tin-chuyen.ts`.) Trong `src/modules/van-chuyen/index.ts`, thêm vào dòng xuất công bố (cạnh `mocToiThieuHienHanh`, `viecXeCuaNguoi`): `export { chuyenChoTinTheoId, suKienTheoYeuCau } from "./chuyen-repo";` và bổ sung câu chú thích đầu tệp "ngoài AppModule xuất BỐN hàm công bố cho gốc lắp ráp".

- [ ] **Step 6: Câu SQL + hàm của `thongbao`** — `src/modules/thongbao/repository.ts`:

```ts
// ADR-0052 D6.1: tin chuyến đọc v_aud_trip_event (audit) — chỉ khoá; danh sách hành động truyền bằng tham số JSON từ HANH_DONG_TIN_CHUYEN (một nguồn).
const LIST_TIN_CHUYEN = defineSql("thongbao", "list_tin_chuyen", `
  SELECT e.id, e.trip_id, e.staff_id AS actor_id, e.action, e.created_at AS luc FROM v_aud_trip_event e
  WHERE e.created_at >= ?1 AND e.action IN (SELECT value FROM json_each(?2)) ORDER BY e.created_at DESC LIMIT 3000`);
const TIN_CHUYEN_THEO_ID = defineSql("thongbao", "tin_chuyen_theo_id",
  `SELECT e.id, e.trip_id, e.staff_id AS actor_id, e.action, e.created_at AS luc FROM v_aud_trip_event e WHERE e.id = ?1`);
const DON_CHO_TIN = defineSql("thongbao", "don_cho_tin", `
  SELECT o.id AS order_id, o.order_code AS ma_don, w.staff_id AS owner_id, h.staff_id AS handler_staff_id
  FROM v_ord_order_label o JOIN v_ord_order_owner w ON w.id = o.id LEFT JOIN v_dsp_order_handler h ON h.order_id = o.id
  WHERE o.id IN (SELECT value FROM json_each(?1))`);

interface TinChuyenRow { id: string; trip_id: string; actor_id: string | null; action: string; luc: string }
const tho = (r: TinChuyenRow): DongChuyenTho => ({ id: r.id, tripId: r.trip_id, actorId: r.actor_id, action: r.action, luc: r.luc });
export async function listTinChuyen(db: D1Database, tu: string): Promise<DongChuyenTho[]> {
  return (await db.prepare(LIST_TIN_CHUYEN).bind(tu, JSON.stringify(HANH_DONG_TIN_CHUYEN)).all<TinChuyenRow>()).results.map(tho);
}
export async function tinChuyenTheoId(db: D1Database, id: string): Promise<DongChuyenTho | null> {
  const r = await db.prepare(TIN_CHUYEN_THEO_ID).bind(id).first<TinChuyenRow>();
  return r ? tho(r) : null;
}
export async function donChoTin(db: D1Database, orderIds: readonly string[]): Promise<DonCuaTin[]> {
  if (orderIds.length === 0) return [];
  const r = (await db.prepare(DON_CHO_TIN).bind(JSON.stringify([...new Set(orderIds)])).all<{ order_id: string; ma_don: string; owner_id: string; handler_staff_id: string | null }>()).results;
  return r.map((x) => ({ orderId: x.order_id, maDon: x.ma_don, ownerId: x.owner_id, handlerStaffId: x.handler_staff_id }));
}
```
Sửa chú thích đầu tệp: thêm `v_aud_trip_event (audit)` vào danh sách view được đọc.

- [ ] **Step 7: Từ điển dữ liệu** — `docs/data-dictionary.json`, mục view, thêm (cạnh `v_aud_order_event`):

```json
{ "name": "v_aud_trip_event", "module": "audit", "columns": ["id", "trip_id", "staff_id", "action", "created_at"] }
```
(theo đúng khuôn trường của mục `v_aud_order_event`; nếu mục đó có `description` thì ghi: "Nhật ký chuyến xe (trip_*) chỉ khoá — nguồn tin chuyến, ADR-0052 D6.1".) Chạy `npm run dict`.

- [ ] **Step 8: Bài siết nơi gọi** — `src/architecture.test.ts`, sau bài dòng 881 (khuôn y hệt):

```ts
test("ADR-0052 D6.3 (siết): chỉ gốc lắp ráp (src/index.ts) và module van-chuyen nhắc `suKienTheoYeuCau` / `chuyenChoTinTheoId` (bỏ chú thích)", () => {
  const problems: string[] = [];
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file);
    if (rel === "src/index.ts" || rel.startsWith("src/modules/van-chuyen/") || rel.endsWith(".test.ts")) continue;
    if (/\b(suKienTheoYeuCau|chuyenChoTinTheoId)\b/.test(maskSource(readFileSync(file, "utf8")))) problems.push(rel);
  }
  assert.deepEqual(problems, [], "thongbao nhận dữ kiện chuyến qua ctx.chuyenChoTin — không gọi thẳng hàm công bố của van-chuyen");
});
```
(dùng lại đúng hàm `walk`/`maskSource` mà bài dòng 881 đang dùng — đọc bài đó trước và chép tên hàm thật.)

- [ ] **Step 9: Chạy, xác nhận xanh**

Run: `node --test src/modules/thongbao/tin-chuyen-doc.test.ts src/architecture.test.ts` rồi `npm test`
Expected: PASS (bài EXPLAIN của `sql-registry` nhận 7 câu mới).

- [ ] **Step 10: Commit**

```bash
git add migrations/NNNN_tin_chuyen.sql src/modules/van-chuyen/chuyen-repo.ts src/modules/van-chuyen/index.ts src/modules/thongbao/repository.ts src/modules/thongbao/tin-chuyen-doc.test.ts src/architecture.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md tests/audit/harness.mjs
git commit -m "View nhật ký chuyến + hàm đọc dữ kiện tin chuyến (ADR-0052 D6.1, D6.3)

Vì sao: tin chuyến là hình chiếu nhật ký, chỉ khoá; thongbao không đọc bảng vc_
nên dữ kiện chuyến đi qua hàm công bố do gốc lắp ráp nối."
```

---

### Task 3: Hộp thông báo hiện tin chuyến (hàm tiêm `ctx.chuyenChoTin`)

**Files:**
- Modify: `src/shared/router.ts` (Ctx + injected + dispatch), `src/index.ts` (tiêm), `src/shared/contracts.ts:1017` (`LoaiTin` thêm `"chuyen"`), `src/shared/thong-bao.ts` (`locHopThongBao`), `src/modules/thongbao/index.ts` (`hop()` + ba route gọi `hop`)
- Test: `src/modules/thongbao/tin-chuyen-hop.test.ts`, bổ sung ca ở `src/shared/thong-bao.test.ts`

**Interfaces:**
- Consumes: Task 1 (`tinChuyenCho`, `dungDongChuyen`, `DongChuyen`), Task 2 (`listTinChuyen`, `donChoTin`, `chuyenChoTinTheoId`).
- Produces:
  ```ts
  // Ctx (router.ts)
  chuyenChoTin: (q: { tripIds: readonly string[]; suKienIds: readonly string[] }) => Promise<ChuyenChoTin | null>;
  // AppOptions.injected
  chuyenChoTin: (env: Env, q: { tripIds: readonly string[]; suKienIds: readonly string[] }) => Promise<ChuyenChoTin>;
  // thong-bao.ts
  locHopThongBao(staff: PermissionHolder & { partyId?: string | null }, vao: { don; thuCong; chuyen?: DongChuyen[]; docDenLuc; now; ngan })
  // thongbao/index.ts
  export async function ghepTinChuyen(db: D1Database, tho: readonly DongChuyenTho[], noi: (q) => Promise<ChuyenChoTin | null>): Promise<DongChuyen[]>;
  ```

- [ ] **Step 1: Bài đỏ (luật thuần)** — thêm vào `src/shared/thong-bao.test.ts`:

```ts
test("tin chuyến: chỉ ở hộp của người nhận (cuaToi), loại 'chuyen', không ở ngăn Tất cả của người khác; quá 30 ngày thì bỏ", () => {
  const now = "2027-03-11T05:00:00.000Z";
  const d = { id: "ev", tripId: "t1", maChuyen: "CX-1103-02", ngayChay: "2027-03-11", action: "trip_created", actorId: "s", luc: "2027-03-11T04:00:00.000Z",
    lai: [{ partyId: "p-b", tu: "2027-03-11T04:00:00.000Z", den: null }], don: [] };
  const tx = locHopThongBao({ id: "tx", permissions: ["DRIVER"], partyId: "p-b" }, { don: [], thuCong: [], chuyen: [d], docDenLuc: "2027-03-01T00:00:00.000Z", now, ngan: "cua-toi" });
  assert.equal(tx.tin.length, 1);
  assert.equal(tx.tin[0]!.loai, "chuyen");
  assert.equal(tx.soChuaDoc, 1);
  const kt = locHopThongBao({ id: "kt", permissions: ["ACCOUNTING"], partyId: null }, { don: [], thuCong: [], chuyen: [d], docDenLuc: now, now, ngan: "tat-ca" });
  assert.equal(kt.tin.length, 0);
  const cu = locHopThongBao({ id: "tx", permissions: ["DRIVER"], partyId: "p-b" }, { don: [], thuCong: [], chuyen: [{ ...d, luc: "2027-01-01T00:00:00.000Z", lai: [{ partyId: "p-b", tu: "2027-01-01T00:00:00.000Z", den: null }] }], docDenLuc: now, now, ngan: "cua-toi" });
  assert.equal(cu.tin.length, 0);
});
```

- [ ] **Step 2: Bài đỏ (qua route thật)** — `src/modules/thongbao/tin-chuyen-hop.test.ts`:

```ts
// ADR-0052 D6.2 qua route thật GET /api/thong-bao: đổi tài xế, huỷ, gián đoạn, khách vắng; tài khoản bị gỡ quyền không còn thấy tin cũ. Tên/SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, DRIVER2, DRIVER_PARTNER, FIELD, SALES, SUP, batDongHo, chuyenSan, denGio, setup, tienDo, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

const hopCua = async (w: any, as: string) => (await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as })).json.tin.filter((t: any) => t.loai === "chuyen");

test("đổi tài xế: A thấy 'không còn lái', B thấy 'được xếp'; sau đó huỷ: chỉ B thấy 'đã bị huỷ'; Kế toán, HDV, Tài xế đối tác không thấy gì; người bấm không tự nhận", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    let c = (await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES })).json;
    assert.equal((await w.call("PUT", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), taiXePartyId: `pty-${DRIVER2}` } })).status, 200);
    c = (await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES })).json;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } })).status, 200);
    const cauA = (await hopCua(w, DRIVER)).map((t: any) => t.cau);
    const cauB = (await hopCua(w, DRIVER2)).map((t: any) => t.cau);
    assert.ok(cauA.some((x: string) => x.startsWith("Bạn không còn lái")), JSON.stringify(cauA));
    assert.ok(!cauA.some((x: string) => x.includes("đã bị huỷ")), "A đã bị gỡ trước khi huỷ");
    assert.ok(cauB.some((x: string) => x.startsWith("Bạn được xếp lái")) && cauB.some((x: string) => x.includes("đã bị huỷ")), JSON.stringify(cauB));
    for (const as of [ACC, FIELD, DRIVER_PARTNER, SALES]) assert.deepEqual(await hopCua(w, as), [], `người ${as} không nhận`);
  } finally {
    tat();
  }
});

test("kết thúc giữa chừng (tài xế bấm) → Bán hàng, Quản trị, Toàn quyền nhận; khách vắng → người lập (Bán hàng) nhận kèm mã đơn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 2 });
    denGio("12:40");
    for (const [d, body] of [["xuat-ben", {}], [`diem/${a.diemDon}/da-toi`, {}], [`phan-bo/${a.suat[0]}/vang`, {}]] as const) assert.equal((await tienDo(w, "tai-xe", a.id, d, body)).status, 200, d);
    const vang = await hopCua(w, SALES);
    assert.ok(vang.some((t: any) => t.cau.startsWith("Có khách vắng") && t.cau.includes(a.don.maDon ?? "")), JSON.stringify(vang));
    assert.equal((await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" })).status, 200);
    for (const as of [SALES, ADM, SUP]) assert.ok((await hopCua(w, as)).some((t: any) => t.cau.includes("kết thúc giữa chừng")), `người ${as}`);
    assert.ok(!(await hopCua(w, ACC)).some((t: any) => t.cau.includes("kết thúc giữa chừng")));
  } finally {
    tat();
  }
});

test("gỡ quyền Tài xế → tin cũ biến mất khỏi hộp (người nhận tính lúc đọc)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await chuyenSan(w, { taiXe: DRIVER2 });
    assert.ok((await hopCua(w, DRIVER2)).length > 0);
    // Gỡ quyền DRIVER, cho quyền INTERN (tài khoản vẫn đăng nhập được). Mốc lấy trước giờ giả nhưng ≥ valid_from_at của dòng gieo (CHECK ở 0012).
    const gio = new Date().toISOString();
    w.sqlite.exec(`UPDATE stf_permission SET valid_to_at = '${gio}' WHERE staff_id = '${DRIVER2}' AND permission_type_code = 'DRIVER'`);
    w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${DRIVER2}-INTERN', '${DRIVER2}', 'INTERN', '${gio}', '${gio}', '${gio}')`);
    const r = await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as: DRIVER2 });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.tin.filter((t: any) => t.loai === "chuyen"), []);
  } finally {
    tat();
  }
});
```
Ghi chú: mã lý do `GIAN_DOAN_XE_HONG` (nhóm `KET_THUC_GIAN_DOAN`, `migrations/0041_chinh_sach_dieu_phoi.sql:126`) và cột `stf_permission.valid_to_at` (`0012:22`) đã đo. `a.don.maDon` lấy theo trường thật của `don()` (`tests/audit/dieu-phoi-khung.mjs:84`) — nếu `don()` không trả mã đơn thì đọc `SELECT order_code FROM orders WHERE id = ?` và thay `?? ""` bằng mã thật (không để bài khớp chuỗi rỗng).

- [ ] **Step 3: Chạy, xác nhận đỏ**

Run: `node --test src/shared/thong-bao.test.ts src/modules/thongbao/tin-chuyen-hop.test.ts`
Expected: FAIL — `chuyen` không có trong `LoaiTin` / không có tin chuyến.

- [ ] **Step 4: `LoaiTin`** — `src/shared/contracts.ts:1017`: `export type LoaiTin = "thu_cong" | "lap" | "cho_nhan" | "nhan" | "giao" | "xac_nhan" | "huy" | "chuyen";`

- [ ] **Step 5: `locHopThongBao`** — `src/shared/thong-bao.ts`: đổi kiểu tham số `staff: PermissionHolder & { partyId?: string | null }`, thêm `chuyen?: DongChuyen[]` vào `vao`, và thêm vòng sau vòng `vao.don`:

```ts
  // ADR-0052 D6.2: tin CHUYẾN — người nhận do MỘT hàm (tinChuyenCho); luôn ở "Của tôi" của người nhận, không bao giờ tat-ca.
  const nguoiChuyen = { id: staff.id, permissions: staff.permissions, partyId: staff.partyId ?? null };
  for (const d of vao.chuyen ?? []) {
    if (d.luc < moc) continue;
    const t = tinChuyenCho(nguoiChuyen, d);
    if (!t) continue;
    tat.push({
      id: d.id, loai: "chuyen", cau: t.cau, maDon: null, noiDung: null, nguoiGui: null, nhomNhan: null, quanTrong: false, daHieuLuc: null,
      lienKet: t.lienKet, luc: d.luc, cuaToi: true, chuaDoc: d.luc > vao.docDenLuc, mo: false,
    });
  }
```
(import `tinChuyenCho`, `type DongChuyen` từ `./tin-chuyen.ts`.)

- [ ] **Step 6: Router** — `src/shared/router.ts`: import type `ChuyenChoTin` từ `./tin-chuyen` (khuôn dòng import type `./contracts` không đuôi — ngoại lệ đã ghi); thêm vào `Ctx`:

```ts
  /**
   * TIN CHUYẾN (ADR-0052 D6.3) — dữ kiện chuyến theo id (mã, ngày, khoảng lái, đơn của suất vắng) do gốc lắp ráp tiêm (`van-chuyen.chuyenChoTinTheoId`;
   * thongbao không import van-chuyen). Một lần gọi = ba truy vấn mảng JSON. `null` = môi trường không tiêm (khung thử cố ý) ⇒ không có tin chuyến.
   */
  chuyenChoTin: (q: { tripIds: readonly string[]; suKienIds: readonly string[] }) => Promise<ChuyenChoTin | null>;
```
vào `AppOptions.injected`: `chuyenChoTin: (env: Env, q: { tripIds: readonly string[]; suKienIds: readonly string[] }) => Promise<ChuyenChoTin>;` (chú thích "BẮT BUỘC trong mã chạy thật"), và trong `dispatch()`:

```ts
      chuyenChoTin: (q) =>
        typeof opts.injected.chuyenChoTin !== "function" ? Promise.resolve(null) : q.tripIds.length === 0 ? Promise.resolve({ chuyen: [], vang: [] }) : opts.injected.chuyenChoTin(env, q),
```

- [ ] **Step 7: Gốc lắp ráp** — `src/index.ts`: import `chuyenChoTinTheoId` từ `./modules/van-chuyen`; thêm vào `injected` (cạnh `mocToiThieu`):

```ts
    // TIN CHUYẾN (ADR-0052 D6.3): thongbao không đọc bảng vc_ — gốc lắp ráp là NƠI DUY NHẤT gọi hàm công bố của van-chuyen (bài siết architecture.test.ts).
    chuyenChoTin: (env, q) => chuyenChoTinTheoId(env.DB, q),
```

- [ ] **Step 8: `hop()`** — `src/modules/thongbao/index.ts`:

```ts
/** Ghép dòng nhật ký chuyến với dữ kiện van-chuyen (hàm tiêm) + đơn của suất vắng. Không tiêm → []. */
export async function ghepTinChuyen(db: D1Database, tho: readonly DongChuyenTho[], noi: (q: { tripIds: readonly string[]; suKienIds: readonly string[] }) => Promise<ChuyenChoTin | null>): Promise<DongChuyen[]> {
  if (tho.length === 0) return [];
  const f = await noi({ tripIds: tho.map((t) => t.tripId), suKienIds: tho.filter((t) => t.action === "trip_passenger_no_show").map((t) => t.id) });
  if (!f) return [];
  return dungDongChuyen(tho, f, await donChoTin(db, f.vang.map((v) => v.orderId)));
}

async function hop(db: D1Database, staff: StaffProfile, ngan: "cua-toi" | "tat-ca", chuyenChoTin: Ctx["chuyenChoTin"]): Promise<HopThongBaoResponse> {
  const now = new Date().toISOString();
  const tu = new Date(Date.now() - NGAY_GIU_TIN * 86400000).toISOString();
  // Chỉ người có thể nhận tin chuyến mới đọc nhật ký chuyến (văn phòng có trip.view, hoặc tài xế có hồ sơ) — người khác không tốn truy vấn.
  const coTheNhan = can(staff, "trip.view") || (staff.partyId !== null && can(staff, "trip.view", { assigned: true }));
  const [don, thuCong, mark, choTho] = await Promise.all([listDon(db, tu), listThuCong(db, tu, staff.id), getMark(db, staff.id), coTheNhan ? listTinChuyen(db, tu) : Promise.resolve([])]);
  const chuyen = await ghepTinChuyen(db, choTho, chuyenChoTin);
  const docDenLuc = chuanHoaMocGio(mark ?? (await getStaffAccount(db, staff.id))?.createdAt ?? now);
  return locHopThongBao(staff, { don, thuCong, chuyen, docDenLuc, now, ngan });
}
```
Ba route gọi `hop(...)` (`/api/thong-bao/tom-tat`, `/api/thong-bao/moi-nhat`, `/api/thong-bao`) lấy thêm `chuyenChoTin` từ ctx và truyền vào. Import `type Ctx` từ router, `can` đã có.

Lưu ý hiệu năng: `tom-tat` được gọi mỗi lần mở trang — tài khoản văn phòng nay thêm 1 truy vấn nhật ký + (nếu có dòng) 3–4 truy vấn mảng. Chấp nhận ở quy mô 30 nhân viên; ghi vào nhật ký thi công số truy vấn đo được.

- [ ] **Step 9: Chạy, xác nhận xanh**

Run: `node --test src/shared/thong-bao.test.ts src/modules/thongbao/tin-chuyen-hop.test.ts src/modules/thongbao/may-theo-phien.test.ts` rồi `npm run typecheck`
Expected: PASS, 0 lỗi.

- [ ] **Step 10: Commit**

```bash
git add src/shared/router.ts src/index.ts src/shared/contracts.ts src/shared/thong-bao.ts src/shared/thong-bao.test.ts src/modules/thongbao/index.ts src/modules/thongbao/tin-chuyen-hop.test.ts
git commit -m "Hộp thông báo hiện tin chuyến xe cho đúng người nhận (ADR-0052 D6.2, D6.3)

Vì sao: tài xế cần biết mình được xếp / bị đổi / chuyến huỷ; văn phòng cần biết
chuyến gián đoạn, khách vắng — người nhận tính lúc đọc nên ai hết quyền là hết tin."
```

---

### Task 4: Gốc lắp ráp `baoThayDoiChuyen` — Bảng tin `dieu-xe` + gõ cửa màn hình khoá

**Files:**
- Modify: `src/shared/bang-tin.ts` (`nhanKetNoi`, `nhanSuKienChuyen`, `laSuKienChuyenHopLe`), `src/shared/bang-tin.test.ts` (kỳ vọng mới theo ADR), `src/modules/bangtin/index.ts` (`phatChuyen`), `src/modules/bangtin/tram.ts:90` (kiểu tham số), `src/shared/web-push.ts` (`nguoiNhanDay` nhận `{ chuyen }`), `src/modules/thongbao/index.ts` (`dayGoCua` nhận `{ chuyen }`; xuất `dongChuyenTheoId`), `src/shared/router.ts` (Ctx + injected `baoThayDoiChuyen`; `ghiLoiBangTin` thêm `"bao_chuyen"`), `src/index.ts`
- Test: `src/shared/bang-tin.test.ts`, `src/shared/web-push.test.ts` (ca mới)

**Interfaces:**
- Consumes: Task 1–3.
- Produces:
  ```ts
  // bang-tin.ts
  export const NHAN_DIEU_XE = "dieu-xe";
  export function nhanSuKienChuyen(taiXeStaffIds: readonly string[]): string[];   // ["dieu-xe", ...nguoi:<id>] sắp xếp, không tat-ca
  export function laSuKienChuyenHopLe(x: unknown): x is SuKienChuyen;              // đúng 4 khoá
  // bangtin/index.ts
  export async function phatChuyen(env: Env, suKien: SuKienChuyen, nhan: string[]): Promise<void>;
  // router.ts Ctx
  baoThayDoiChuyen: (e: { tripId: string; requestId: string }) => void;
  // AppOptions.injected
  baoThayDoiChuyen: (env: Env, actor: StaffProfile, e: { tripId: string; requestId: string }) => Promise<void>;
  // thongbao/index.ts
  export async function dongChuyenTheoId(db: D1Database, id: string, noi: (q) => Promise<ChuyenChoTin | null>): Promise<DongChuyen | null>;
  dayGoCua(env, tin: ({ don } | { thuCong } | { chuyen: DongChuyen }) & { quanTrong: boolean }, giaoLo)
  ```

- [ ] **Step 1: Bài đỏ** — `src/shared/bang-tin.test.ts`:
  - Bài "nhanKetNoi: mọi tập con quyền (1024)": thêm dòng `if (can(staff, "trip.view")) ky_vong.add("dieu-xe");` (kỳ vọng mới theo ADR-0052 D6.4 — đã duyệt; ghi chú này vào câu mô tả bài).
  - Bài "bảng ảnh chụp theo từng quyền đơn lẻ": SALES, ACCOUNTING, ADMIN, SUPER_ADMIN có thêm `"dieu-xe"`; DRIVER, DRIVER_PARTNER, FIELD, PARTNER, INTERN, HR không.
  - Thêm:

```ts
test("ADR-0052 D6.4: kết nối có trip.view KHÔNG ngữ cảnh mới mang 'dieu-xe'; tài xế (assigned), HDV, Đối tác, Thực tập, Tài xế đối tác thì không", () => {
  for (const p of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) assert.ok(nhanKetNoi({ id: "x", permissions: [p] }).includes("dieu-xe"), p);
  for (const p of ["DRIVER", "DRIVER_PARTNER", "FIELD", "PARTNER", "INTERN", "HR"] as const) assert.ok(!nhanKetNoi({ id: "x", permissions: [p] }).includes("dieu-xe"), p);
});
test("nhanSuKienChuyen: luôn dieu-xe + nguoi:<tài xế>; KHÔNG BAO GIỜ tat-ca / cho-nhan / noi-bo", () => {
  assert.deepEqual(nhanSuKienChuyen(["b", "a", "a"]), ["dieu-xe", "nguoi:a", "nguoi:b"]);
  assert.deepEqual(nhanSuKienChuyen([]), ["dieu-xe"]);
});
test("laSuKienChuyenHopLe: đúng 4 khoá (loai, maChuyen, thayDoi, luc) — thêm tripId / tên → từ chối", () => {
  const e = { loai: "chuyen", maChuyen: "CX-1", thayDoi: "huy", luc: "2027-03-11T00:00:00.000Z" };
  assert.ok(laSuKienChuyenHopLe(e));
  assert.ok(!laSuKienChuyenHopLe({ ...e, tripId: "t" }));
  assert.ok(!laSuKienChuyenHopLe({ ...e, thayDoi: "zzz" }));
  assert.ok(!laSuKienHopLe(e), "sự kiện chuyến không lọt vào nhánh sự kiện đơn");
});
```

  Và `src/shared/web-push.test.ts`:

```ts
test("nguoiNhanDay { chuyen }: đúng người tinChuyenCho chọn — tài xế được xếp; người bấm và Kế toán không", () => {
  const d = { id: "ev", tripId: "t1", maChuyen: "CX-1", ngayChay: "2027-03-11", action: "trip_created", actorId: "s", luc: "2027-03-11T04:00:00.000Z",
    lai: [{ partyId: "p-b", tu: "2027-03-11T04:00:00.000Z", den: null }], don: [] };
  const tk = [{ id: "tx", permissions: ["DRIVER" as const], partyId: "p-b" }, { id: "s", permissions: ["SALES" as const], partyId: null }, { id: "kt", permissions: ["ACCOUNTING" as const], partyId: null }];
  assert.deepEqual(nguoiNhanDay(tk, { chuyen: d }, "2027-03-11T05:00:00.000Z"), ["tx"]);
});
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/shared/bang-tin.test.ts src/shared/web-push.test.ts`
Expected: FAIL — thiếu `dieu-xe`, thiếu hàm.

- [ ] **Step 3: `bang-tin.ts`**

```ts
/** ADR-0052 D6.4: nhãn kết nối của người xem được MỌI chuyến (`can(trip.view)` không ngữ cảnh = ô any). */
export const NHAN_DIEU_XE = "dieu-xe";
// trong nhanKetNoi, trước return:
  if (can(staff, "trip.view")) nhan.add(NHAN_DIEU_XE);

/** Nhãn của một sự kiện CHUYẾN: nhóm điều xe + tài xế có dòng lái lúc sự kiện (người gọi tính bằng taiXeNhanSuKien). Không bao giờ tat-ca. */
export function nhanSuKienChuyen(taiXeStaffIds: readonly string[]): string[] {
  return [...new Set([NHAN_DIEU_XE, ...taiXeStaffIds.map((id) => `nguoi:${id}`)])].sort();
}
const KHOA_SU_KIEN_CHUYEN = ["loai", "maChuyen", "thayDoi", "luc"] as const;
export function laSuKienChuyenHopLe(x: unknown): x is SuKienChuyen {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const khoa = Object.keys(x);
  if (khoa.length !== KHOA_SU_KIEN_CHUYEN.length || !KHOA_SU_KIEN_CHUYEN.every((k) => khoa.includes(k))) return false;
  const v = x as Record<string, unknown>;
  return v.loai === "chuyen" && typeof v.maChuyen === "string" && typeof v.luc === "string" && (THAY_DOI_CHUYEN as readonly string[]).includes(v.thayDoi as string);
}
```
Sửa chú thích đầu tệp (điều 3 bổ sung: "sự kiện chuyến — nhóm `dieu-xe` + `nguoi:<tài xế>`").

- [ ] **Step 4: `bangtin`** — `tram.ts:90`: `async phat(suKien: SuKienDon | SuKienChuyen, nhan: string[])` (import type `SuKienChuyen`); `bangtin/index.ts`:

```ts
/** ADR-0052 D6.4: phát một sự kiện CHUYẾN (đúng 4 khoá) tới kết nối mang một nhãn trong `nhan` (gốc lắp ráp tính bằng nhanSuKienChuyen). Không trạm → thôi. */
export async function phatChuyen(env: Env, suKien: SuKienChuyen, nhan: string[]): Promise<void> {
  if (!env.BANG_TIN) return;
  await env.BANG_TIN.getByName(TEN_TRAM).phat(suKien, nhan);
}
```

- [ ] **Step 5: Gõ cửa** — `src/shared/web-push.ts` `nguoiNhanDay(taiKhoan: (PermissionHolder & { partyId?: string | null })[], tin: { don: DongDon } | { thuCong: DongThuCong } | { chuyen: DongChuyen }, now)`: thêm `const chuyen = "chuyen" in tin ? [tin.chuyen] : [];` và truyền `chuyen` vào `locHopThongBao`. `thongbao/index.ts` `dayGoCua`: mở rộng kiểu `tin` cùng union (thân hàm không đổi — `listStaffAccounts` trả `StaffAccount` có `partyId`). Thêm:

```ts
/** Gốc lắp ráp: dựng DongChuyen của MỘT dòng nhật ký chuyến (mọi trip_*, kể cả hành động không sinh tin — dùng cho Bảng tin). */
export async function dongChuyenTheoId(db: D1Database, id: string, noi: (q: { tripIds: readonly string[]; suKienIds: readonly string[] }) => Promise<ChuyenChoTin | null>): Promise<DongChuyen | null> {
  const t = await tinChuyenTheoId(db, id);
  return t ? ((await ghepTinChuyen(db, [t], noi))[0] ?? null) : null;
}
```

- [ ] **Step 6: Router** — `Ctx`:

```ts
  /**
   * TIN CHUYẾN (ADR-0052 D6.3) — route van-chuyen báo "lệnh chuyến vừa ghi xong" SAU lô thành công; KHÔNG gọi khi 4xx hay lệnh lặp. Kiểu `void`: bắn-và-quên
   * (router bọc waitUntil + bắt lỗi → một dòng `bang_tin_loi` viec "bao_chuyen"). Gốc lắp ráp tự đọc hành động từ nhật ký theo `requestId` (không tin chữ route).
   */
  baoThayDoiChuyen: (e: { tripId: string; requestId: string }) => void;
```
`injected`: `baoThayDoiChuyen: (env: Env, actor: StaffProfile, e: { tripId: string; requestId: string }) => Promise<void>;`; `ghiLoiBangTin(viec: "bao" | "dong" | "bao_chuyen", …)`; `dispatch()`:

```ts
      baoThayDoiChuyen: (e) => {
        if (!who || typeof opts.injected.baoThayDoiChuyen !== "function") return;
        exec.waitUntil(Promise.resolve().then(() => opts.injected.baoThayDoiChuyen(env, who, e)).catch((err) => ghiLoiBangTin("bao_chuyen", err)));
      },
```

- [ ] **Step 7: Gốc lắp ráp** — `src/index.ts` (import `phatChuyen` từ bangtin; `dayGoCua`, `dongChuyenTheoId` từ thongbao; `listStaffAccounts` từ staff; `suKienTheoYeuCau`, `chuyenChoTinTheoId` từ van-chuyen; `nhanSuKienChuyen` từ shared/bang-tin; `laHanhDongTinChuyen`, `taiXeNhanSuKien`, `thayDoiCuaHanhDongChuyen` từ shared/tin-chuyen):

```ts
    // TIN CHUYẾN (ADR-0052 D6.3, D6.4). Bảng tin: MỌI lệnh chuyến (màn đang mở tự tải lại) — chuyến nguồn và chuyến liên quan (dời khách); gõ cửa: chỉ
    // hành động sinh tin (HANH_DONG_TIN_CHUYEN). Hai việc độc lập. Kiểm TRƯỚC mọi lần đọc D1: không trạm VÀ không khoá gõ cửa (khung thử, e2e) → thôi.
    baoThayDoiChuyen: async (env, _actor, e) => {
      if (!env.BANG_TIN && !khoaVapid(env)) return;
      const ev = await suKienTheoYeuCau(env.DB, e.requestId);
      if (!ev || (ev.tripId !== e.tripId && ev.relatedTripId !== e.tripId)) return;
      const noi = (q: { tripIds: readonly string[]; suKienIds: readonly string[] }) => chuyenChoTinTheoId(env.DB, q);
      const tripIds = ev.relatedTripId ? [ev.tripId, ev.relatedTripId] : [ev.tripId];
      const [dong, f, taiKhoan] = await Promise.all([dongChuyenTheoId(env.DB, ev.id, noi), noi({ tripIds, suKienIds: [] }), listStaffAccounts(env.DB)]);
      if (!dong) return;
      const dangHoatDong = taiKhoan.filter((s) => s.active);
      const thayDoi = thayDoiCuaHanhDongChuyen(dong.action);
      await nemNeuLoi([
        ["tram", Promise.all(f.chuyen.map((c) => phatChuyen(env, { loai: "chuyen", maChuyen: c.ma, thayDoi, luc: dong.luc }, nhanSuKienChuyen(taiXeNhanSuKien(dangHoatDong, c.lai, dong.luc)))))],
        ["day", laHanhDongTinChuyen(dong.action) ? dayGoCua(env, { chuyen: dong, quanTrong: false }, (ds) => xepHangDay(env, ds)) : null],
      ]);
    },
```
Cập nhật chú thích đầu `src/index.ts` (đoạn BẢNG TIN / WEB PUSH) thêm một câu về tin chuyến.

- [ ] **Step 8: Chạy, xác nhận xanh**

Run: `node --test src/shared/bang-tin.test.ts src/shared/web-push.test.ts src/modules/bangtin/*.test.ts src/router.test.ts` rồi `npm run typecheck`
Expected: PASS, 0 lỗi. (Tên tệp bài router có thể là `src/shared/router.test.ts` — chạy đúng tệp có thật.)

- [ ] **Step 9: Đột biến quan sát chặn thật** — tạm đổi `nhanSuKienChuyen` thêm `"tat-ca"` → bài "KHÔNG BAO GIỜ tat-ca" đỏ → hoàn nguyên. Ghi vào nhật ký thi công.

- [ ] **Step 10: Commit**

```bash
git add src/shared/bang-tin.ts src/shared/bang-tin.test.ts src/shared/web-push.ts src/shared/web-push.test.ts src/modules/bangtin/index.ts src/modules/bangtin/tram.ts src/modules/thongbao/index.ts src/shared/router.ts src/index.ts
git commit -m "Gốc lắp ráp phát Bảng tin chuyến (nhóm điều xe + tài xế) và gõ cửa tin chuyến (ADR-0052 D6.3, D6.4)

Vì sao: màn điều phối và màn tài xế đang mở phải tự tải lại khi chuyến đổi; tin
cần xử lý tới điện thoại đúng người, không bao giờ tới mọi người."
```

---

### Task 5: Route `van-chuyen` gọi `ctx.baoThayDoiChuyen` sau lô thành công

**Files:**
- Modify: `src/modules/van-chuyen/index.ts:817-1405` (27 route lệnh chuyến), `tests/audit/harness.mjs:94` (`GHI_DE_DUOC_PHEP` thêm `"baoThayDoiChuyen"`)
- Test: `src/modules/van-chuyen/bao-thay-doi-chuyen.test.ts`

**Interfaces:**
- Consumes: `ctx.baoThayDoiChuyen` (Task 4).
- Produces: hành vi — mỗi lệnh chuyến ghi thành công (lần đầu theo `requestId`) gọi đúng một lần `baoThayDoiChuyen({ tripId: <chuyến của route>, requestId: <requestId của thân> })`.

- [ ] **Step 1: Bài đỏ** — `src/modules/van-chuyen/bao-thay-doi-chuyen.test.ts`:

```ts
// ADR-0052 tiêu chí 11 (ý cuối): route gọi baoThayDoiChuyen ĐÚNG MỘT LẦN sau lô thành công; không gọi khi 409 / 403 / lệnh lặp. + bài quét đủ tuyến.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, SALES, batDongHo, chuyenSan, setup, tienDo, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

function voiGoi() {
  const goi: { tripId: string; requestId: string }[] = [];
  const w = setup({ ghiDe: { baoThayDoiChuyen: async (_env: unknown, _a: unknown, e: { tripId: string; requestId: string }) => void goi.push(e) } });
  return { w, goi };
}
const xong = () => new Promise((r) => setImmediate(r));

test("tạo chuyến 201 → 1 lời gọi; gửi lại cùng requestId (200) → không thêm; huỷ thiếu version đúng (409) → không thêm", async () => {
  const tat = batDongHo();
  try {
    const { w, goi } = voiGoi();
    const a = await chuyenSan(w); // tạo + xếp = 2 lệnh
    await xong();
    assert.equal(goi.length, 2);
    assert.ok(goi.every((g) => g.tripId === a.id));
    const sai = await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/huy`, { as: SALES, body: { version: 999, requestId: uuid(), lyDo: "HUY_KHAC" } });
    assert.equal(sai.status, 409, sai.text);
    const ktBam = await tienDo(w, "van-phong", a.id, "ket-thuc", {}, ACC);
    assert.equal(ktBam.status, 403);
    await xong();
    assert.equal(goi.length, 2, "409 / 403 không bắn tin");
    const rid = uuid();
    const c = (await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES })).json;
    for (let i = 0; i < 2; i++) await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: rid, lyDo: "HUY_KHAC" } });
    await xong();
    assert.equal(goi.filter((g) => g.requestId === rid).length, 1, "lệnh lặp không bắn lần hai");
  } finally {
    tat();
  }
});

test("bài quét: MỌI route POST/PUT lệnh chuyến của van-chuyen gọi baoThayDoiChuyen, và lời gọi nằm SAU `if (r) return r` / `if (!r.ok) return r.res`", () => {
  const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  const routes = [...src.matchAll(/route\("(POST|PUT)", "(\/api\/van-chuyen\/(?:chuyen|cuoc-cua-toi)[^"]*)"[\s\S]*?\n    \}\),/g)];
  const lenh = routes.filter((m) => !/\/chang\//.test(m[2]!));
  assert.ok(lenh.length >= 27, `chỉ thấy ${lenh.length} route lệnh chuyến`);
  for (const m of lenh) {
    const than = m[0];
    const i = than.indexOf("baoThayDoiChuyen(");
    assert.ok(i > 0, `${m[1]} ${m[2]} chưa gọi baoThayDoiChuyen`);
    const chan = Math.max(than.lastIndexOf("if (r) return r", i), than.lastIndexOf("return r.res", i), than.lastIndexOf("if (r instanceof Response) return r", i));
    assert.ok(chan > 0 && chan < i, `${m[1]} ${m[2]}: lời gọi phải đứng sau nhánh trả lỗi của lệnh`);
  }
});
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/modules/van-chuyen/bao-thay-doi-chuyen.test.ts`
Expected: FAIL — `world({ ghiDe })` từ chối `baoThayDoiChuyen`; bài quét: "chưa gọi".

- [ ] **Step 3: Khung thử** — `tests/audit/harness.mjs:94`: `const GHI_DE_DUOC_PHEP = ["dongBangTin", "baoThayDoiChuyen"];` (chỉ cho bài NHÌN lời gọi hàm tiêm — không nới luật nghiệp vụ).

- [ ] **Step 4: Sửa 27 route** — khuôn chung (lấy `baoThayDoiChuyen` từ ctx của route):

```ts
      if (!(await eventByRequest(env.DB, b.requestId))) {
        const r = await lenhHuy(env.DB, nen, b, staff, bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
```
Ngoại lệ theo route:
  - `POST /api/van-chuyen/chuyen` (tạo): sau vòng `for` (sau `break`), trong `if (!lap) { … }`: `baoThayDoiChuyen({ tripId: id, requestId: t.requestId });`
  - `cap-nhat-diem`, `cap-nhat-khach`: chỉ khi `r > 0` (không suất lệch = không ghi gì): `daCapNhat = r; if (r > 0) baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId });`
  - Route tài xế `cuoc-cua-toi/:id/…` và văn phòng bấm thay `chuyen/:id/<tiến độ>`: `requestId` = `than.value.requestId`.
  - `doi` (dời khách): một lời gọi với chuyến của route; gốc lắp ráp tự phát cho cả chuyến liên quan (`related_trip_id`).
  - Không đụng route `/api/van-chuyen/chang/:legId/…` (gọi báo — không phải lệnh chuyến).

- [ ] **Step 5: Chạy, xác nhận xanh**

Run: `node --test src/modules/van-chuyen/bao-thay-doi-chuyen.test.ts src/modules/van-chuyen/thu-tu-lo.test.ts src/modules/van-chuyen/bam-thay.test.ts src/modules/van-chuyen/dieu-phoi.test.ts`
Expected: PASS.

- [ ] **Step 6: Đột biến quan sát chặn thật** — chuyển lời gọi ở route `huy` lên TRƯỚC `if (r) return r;` → bài "409 không bắn tin" + bài quét đỏ → hoàn nguyên.

- [ ] **Step 7: Commit**

```bash
git add src/modules/van-chuyen/index.ts src/modules/van-chuyen/bao-thay-doi-chuyen.test.ts tests/audit/harness.mjs
git commit -m "Lệnh chuyến xe báo thay đổi sau khi ghi xong (ADR-0052 D6.3)

Vì sao: tin và Bảng tin chỉ được nảy ra khi lệnh thật sự ghi; bị từ chối hoặc
bấm lặp thì không báo."
```

---

### Task 6: Màn có sẵn tự tải lại + biểu tượng tin chuyến

**Files:**
- Modify: `web/bangtin-logic.ts` (`taoBoGop` thành generic; `Phu.khiDotChuyen`; nhánh `onmessage`), `web/bangtin.ts` (phát `chuyen-thay-doi`), `web/dieu-phoi.ts`, `web/chuyen.ts`, `web/cuoc.ts`, `web/cuoc-chuyen.ts`, `web/thong-bao-ui.ts` (`KIND_ICON.chuyen = "truck"`)
- Test: `src/bang-tin-web.test.ts` (ca mới)
- Chrome: `docs/evidence/<ngày thi công>-tin-chuyen/kich-ban/tin-chuyen-smoke.mjs`; thêm dòng vào bảng `web/CLAUDE.md`

**Interfaces:**
- Consumes: `laSuKienChuyenHopLe`, `SuKienChuyen` (Task 4); `taoBoLamMoi` (`web/lam-moi-logic.ts`).
- Produces: sự kiện cửa sổ `chuyen-thay-doi` (`CustomEvent<SuKienChuyen[]>`), gộp 1 giây như `don-thay-doi`.

- [ ] **Step 1: Bài đỏ** — `src/bang-tin-web.test.ts` (dùng socket giả có sẵn trong tệp):

```ts
test("sự kiện chuyến: gộp thành MỘT đợt 'chuyen-thay-doi', không vào nhánh đơn, không thông báo nổi", () => {
  const dotChuyen: unknown[][] = [], dotDon: unknown[][] = [], noi: unknown[] = [];
  const { phu, socket, chayHen } = phuGia({ khiDotChuyen: (ds) => dotChuyen.push(ds), khiDot: (ds) => dotDon.push(ds), khiSuKien: (e) => noi.push(e) });
  const bo = taoBoDieuKhien(phu);
  bo.batDau();
  socket().mo();
  socket().nhan(JSON.stringify({ loai: "chuyen", maChuyen: "CX-1", thayDoi: "huy", luc: "2027-03-11T00:00:00.000Z" }));
  socket().nhan(JSON.stringify({ loai: "chuyen", maChuyen: "CX-1", thayDoi: "sua", luc: "2027-03-11T00:00:01.000Z" }));
  chayHen();
  assert.equal(dotChuyen.length, 1);
  assert.equal((dotChuyen[0] as unknown[]).length, 2);
  assert.deepEqual(dotDon, []);
  assert.deepEqual(noi, []);
});
```
(Tên `phuGia`/`socket().mo()`/`nhan`/`chayHen` là khung giả đang có trong `src/bang-tin-web.test.ts` — đọc tệp, dùng đúng tên thật; nếu khung giả chưa nhận `khiDotChuyen` thì thêm tham số mặc định `() => {}`.)

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/bang-tin-web.test.ts`
Expected: FAIL — `khiDotChuyen` không được gọi.

- [ ] **Step 3: `web/bangtin-logic.ts`**

```ts
// taoBoGop: đổi chữ ký thành generic
export function taoBoGop<T>(phat: (ds: T[]) => void, hen: (fn: () => void, ms: number) => unknown, huyHen: (id: unknown) => void) { let dem: T[] = []; /* thân giữ nguyên */ }
// Phu: thêm
  /** Một đợt sự kiện CHUYẾN đã gộp (phát `chuyen-thay-doi`) — ADR-0052 D6.4; không thông báo nổi (tự chốt T4). */
  khiDotChuyen(ds: SuKienChuyen[]): void;
// taoBoDieuKhien: cạnh `gop`
  const gopChuyen = taoBoGop<SuKienChuyen>(phu.khiDotChuyen, phu.hen, phu.huyHen);
// onmessage: thay hai dòng cuối
      if (laSuKienHopLe(x)) {
        phu.khiSuKien(x);
        gop.them(x);
      } else if (laSuKienChuyenHopLe(x)) gopChuyen.them(x);
// dung(): cạnh gop.huy()
      gopChuyen.huy();
```

- [ ] **Step 4: `web/bangtin.ts`** — trong `taoBoDieuKhien({ … })` thêm:

```ts
    khiDotChuyen: (ds) => window.dispatchEvent(new CustomEvent<SuKienChuyen[]>("chuyen-thay-doi", { detail: ds })),
```

- [ ] **Step 5: Bốn trang nghe sự kiện**

`web/dieu-phoi.ts` (cuối tệp):
```ts
// ADR-0052 D6.4: chuyến nào đổi cũng tải lại lịch đang xem (gộp, không chạy hai lần song song); nối lại Bảng tin → tải lại.
const lamMoi = taoBoLamMoi(nap);
window.addEventListener("chuyen-thay-doi", () => void lamMoi.yeuCau());
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
```
`web/chuyen.ts` (sau `await main();`):
```ts
const lamMoi = taoBoLamMoi(async () => { await nap(); ve(); });
window.addEventListener("chuyen-thay-doi", (ev) => {
  if ((ev as CustomEvent<SuKienChuyen[]>).detail.some((e) => e.maChuyen === duLieu?.chuyen.ma)) void lamMoi.yeuCau();
});
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
```
`web/cuoc-chuyen.ts` (trong `main()` sau `ve();`): như `web/chuyen.ts`, so `e.maChuyen === duLieu?.ma` (đọc trường mã thật của `CuocChiTietResponse`).
`web/cuoc.ts`: tách phần từ `const homNay = …` tới hết `replaceChildren(…)` của `main()` thành `async function veDanhSach(): Promise<void>`; `main()` gọi `initShell` + kiểm `coCuocCuaToi` rồi `await veDanhSach()`; thêm sau `await main();`:
```ts
const lamMoi = taoBoLamMoi(veDanhSach);
window.addEventListener("chuyen-thay-doi", () => void lamMoi.yeuCau());
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
```
`web/thong-bao-ui.ts`: `KIND_ICON` thêm `chuyen: "truck"` (không thêm lớp màu — giữ `.ntf-badge` mặc định). Câu ghi chú `MINE_NOTE` đổi thành: `"Tin công ty gửi bạn, đơn bạn lập hoặc phụ trách, đơn chờ nhận, chuyến xe liên quan tới bạn."` (bề mặt, hai chiều).

- [ ] **Step 6: Chạy, xác nhận xanh**

Run: `node --test src/bang-tin-web.test.ts src/lam-moi-web.test.ts && npm run typecheck && npm run build:web`
Expected: PASS, 0 lỗi, build xong.

- [ ] **Step 7: Kịch bản Chrome** `tin-chuyen-smoke.mjs` (khuôn `docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs` + `dp-lib.mjs`; D1 tạm, không cần mạng ngoài; 390 + 1040). Lệnh ghi đi bằng phiên Node riêng của **Bán hàng B** (không qua trình duyệt) để trình duyệt chỉ giữ MỘT tài khoản mỗi bước (bẫy chung kho cookie, CLAUDE.md §10):
  1. Trình duyệt đăng nhập **Tài xế** → mở `/cuoc`; Node (Bán hàng B) tạo chuyến gán tài xế này → trong ≤ 3 giây thẻ chuyến hiện ra **không bấm tải lại**; chuông có số đỏ; mở chuông thấy "Bạn được xếp lái chuyến …" với biểu tượng xe; chụp ảnh.
  2. Mở `/cuoc-chuyen?id=…`; Node sửa giờ chuyến → màn tự cập nhật giờ; hộp có "Văn phòng vừa sửa chuyến …".
  3. Node đổi tài xế sang người khác → hộp tài xế có "Bạn không còn lái …"; bấm tin → về `/cuoc`, thẻ chuyến đã biến mất.
  4. Đăng xuất; trình duyệt đăng nhập **Bán hàng A** → mở `/dieu-phoi`; Node (Bán hàng B) xếp khách vào một chuyến → khối chuyến tự đổi số khách; **không** có thông báo nổi.
  5. Mở `/chuyen?id=…` của một chuyến khác; Node sửa chuyến KHÁC → màn này không tải lại (kiểm bằng đếm request `GET /api/van-chuyen/chuyen/` qua CDP).
  6. Đăng xuất; đăng nhập **Kế toán** → mở chuông: không có tin chuyến nào.
  Mỗi bước 390 và 1040; ảnh vào `docs/evidence/<ngày>-tin-chuyen/`. Thêm dòng vào bảng `web/CLAUDE.md`: "Tin chuyến + tự tải lại (ADR-0052 D6): `web/bangtin-logic.ts` (nhánh chuyến), `web/bangtin.ts`, phần nghe `chuyen-thay-doi` của `web/dieu-phoi.ts`/`web/chuyen.ts`/`web/cuoc.ts`/`web/cuoc-chuyen.ts`, `KIND_ICON.chuyen` của `web/thong-bao-ui.ts` | `tin-chuyen-smoke.mjs` (6 bước, 390 + 1040; Tài xế → Bán hàng → Kế toán) + `cuoc-smoke.mjs` + `dieu-phoi-smoke.mjs` + `chuyen-smoke.mjs`". Chạy lại cả ba kịch bản cũ đó (chạm cùng tệp).

- [ ] **Step 8: Commit**

```bash
git add web/bangtin-logic.ts web/bangtin.ts web/dieu-phoi.ts web/chuyen.ts web/cuoc.ts web/cuoc-chuyen.ts web/thong-bao-ui.ts src/bang-tin-web.test.ts web/CLAUDE.md docs/evidence/
git commit -m "Màn điều phối, chi tiết chuyến, cuốc tài xế tự tải lại khi chuyến đổi (ADR-0052 D6.4)

Vì sao: tài xế và văn phòng đang mở màn không phải bấm tải lại mới thấy chuyến
vừa được xếp / sửa / huỷ."
```

---

### Task 7: Hàng rào không lộ + e2e + tài liệu + nhật ký phiên bản

**Files:**
- Modify: `src/hanh-khach-khong-lo-ten.test.ts` (khối van-chuyen: quét hộp thông báo), `tests/e2e/run.mjs:42` (`ALL` thêm `"tin-chuyen"`), `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md` (đoạn Bảng tin dòng ~77, đoạn Thông báo dòng ~283, bảng migration dòng ~366), `docs/CHANGE-GUIDE.md` (công thức f "Thêm hành động nhật ký": thêm mục "nếu là lệnh chuyến"; bảng §1 thêm "Thêm một loại tin chuyến → `src/shared/tin-chuyen.ts`"), `src/shared/changelog.ts` + `src/shared/app-info.test.ts`
- Create: `tests/e2e/tin-chuyen.mjs`, `docs/superpowers/plans/<ngày>-van-chuyen-dot-2-nhat-ky.md`

**Interfaces:**
- Consumes: mọi task trên.
- Produces: bằng chứng tiêu chí nghiệm thu 11–13 của ADR-0052 (phần D6).

- [ ] **Step 1: Bài đỏ "không lộ"** — thêm vào khối VAN-CHUYỂN cuối `src/hanh-khach-khong-lo-ten.test.ts`:

```ts
test("ADR-0052 tiêu chí 12 (D6): sau đổi tài xế, khách vắng, gián đoạn với nơi đón chữ tự do có dãy số + tên khách đánh dấu → hộp thông báo của MỌI tài khoản không chứa tên, năm sinh, dãy ≥ 8 số, khoá nơi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 2, noiDon: "Khách sạn Dò Tìm 0905123456" });
    denGio("12:40");
    for (const d of ["xuat-ben", `diem/${a.diemDon}/da-toi`, `phan-bo/${a.suat[0]}/vang`]) assert.equal((await tienDo(w, "tai-xe", a.id, d)).status, 200, d);
    assert.equal((await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" })).status, 200);
    let thayTin = 0;
    for (const as of [SALES, ADM, ACC, DRIVER, DRIVER2, FIELD]) {
      const txt = (await w.call("GET", "/api/thong-bao?ngan=tat-ca", { as })).text;
      thayTin += (JSON.parse(txt).tin as any[]).filter((t) => t.loai === "chuyen").length;
      assert.doesNotMatch(txt, /Khách Dò Tìm|199\d|0905123456|\d{8,}|"[LT]:/, `tài khoản ${as}`);
    }
    assert.ok(thayTin >= 3, "chống bài rỗng: phải có tin chuyến để quét");
  } finally {
    tat();
  }
});
```
(`chuyenSan` nhận `noiDon` qua `don()` — nếu chưa truyền xuống thì thêm `noiDon: v.noiDon` vào lời gọi `don(...)` trong `chuyenSan` của `tests/audit/dieu-phoi-khung.mjs`. `\d{8,}` có thể khớp nhầm mốc giờ ISO? Không — ISO tách bằng `-`/`:`; nếu có id số dài thì loại theo khoá trước khi quét.)

- [ ] **Step 2: Chạy, xác nhận** — chạy bài trên ở commit TRƯỚC Task 3 (`git stash` cấm — dùng `git worktree add /tmp/kiem-dot2 <sha-trước-Task-3>` và chép tệp bài sang) → đỏ ở "chống bài rỗng"; ở HEAD → xanh. Ghi kết quả hai lần chạy vào nhật ký thi công.

Run: `node --test src/hanh-khach-khong-lo-ten.test.ts`
Expected (HEAD): PASS.

- [ ] **Step 3: e2e** — `tests/e2e/tin-chuyen.mjs` (khuôn đầu tệp `tests/e2e/tai-xe-cuoc.mjs:1-60`: tạo hai tài khoản `DRIVER_INTERNAL` + một `DRIVER_EXTERNAL` bằng Toàn quyền, GPLX, xe, đơn đã xác nhận, chuyến với TX). Các ca:

```js
// 1. Tạo chuyến cho TX → TX thấy "Bạn được xếp lái"; Bán hàng (người tạo) không thấy; Kế toán không thấy; Tài xế đối tác không thấy.
// 2. PUT đổi tài xế sang TX2 → TX "Bạn không còn lái", TX2 "Bạn được xếp lái".
// 3. Huỷ (lyDo "HUY_KHAC") → chỉ TX2 "đã bị huỷ"; TX không có tin huỷ.
// 4. Bảng tin: moBangTin(cookie TX2) và moBangTin(cookie Kế toán) mở TRƯỚC bước 3 → TX2 nhận khung {loai:"chuyen", thayDoi:"huy"} đúng 4 khoá;
//    Kế toán (trip.view any) nhận khung (nhóm dieu-xe); moBangTin(cookie TX) KHÔNG nhận khung huỷ (đã bị gỡ).
// 5. Không lộ: JSON hộp + mọi khung không khớp /Khách Cuốc|0913579246|Liên Hệ Cuốc|\d{8,}/.
const hop = async (cookie) => (await call(cookie, "GET", "/api/thong-bao?ngan=cua-toi")).body.tin.filter((t) => t.loai === "chuyen");
```
Viết đủ thân theo năm ca trên bằng `call`, `session`, `moBangTin`, `cho` của `tests/e2e/lib.mjs` (nếu `moBangTin(...).tin` chỉ giữ khung sự kiện đơn thì đọc `.raw` rồi `JSON.parse` và lọc `loai === "chuyen"`). Thêm `"tin-chuyen"` vào `ALL` ở `tests/e2e/run.mjs:42` (sau `"tai-xe-cuoc"`).

Run: `npm run test:e2e -- tin-chuyen` rồi `npm run test:e2e`
Expected: PASS đủ bộ; `audit-invariants` cuối e2e thoát 0.

- [ ] **Step 4: Sổ hàng rào** — `docs/SO-HANG-RAO.md`, bốn dòng mới (cột "Đã thấy chặn thật" ghi ngày + phép đột biến + câu đỏ đã quan sát ở Task 1 bước 6, Task 4 bước 9, Task 5 bước 6, Task 7 bước 2):
  1. "Tin chuyến chỉ tới người qua `can(trip.view)` lúc đọc" — `src/shared/tin-chuyen.test.ts` (mọi tập con) + `src/modules/thongbao/tin-chuyen-hop.test.ts`.
  2. "Sự kiện Bảng tin chuyến không bao giờ `tat-ca`, đúng 4 khoá" — `src/shared/bang-tin.test.ts`.
  3. "Lệnh chuyến chỉ báo sau lô thành công, đủ tuyến" — `src/modules/van-chuyen/bao-thay-doi-chuyen.test.ts`.
  4. "Tin chuyến không lộ tên/SĐT/nơi" — `src/hanh-khach-khong-lo-ten.test.ts` khối D6 + `tests/e2e/tin-chuyen.mjs`.
  Và một dòng cho bài siết `architecture.test.ts` (Task 2 bước 8): đột biến = thêm một dòng gọi `chuyenChoTinTheoId` trong `src/modules/thongbao/index.ts` → đỏ → hoàn nguyên.

- [ ] **Step 5: Tài liệu mô tả** — `docs/SYSTEM-DESIGN.md`: đoạn Bảng tin thêm "sự kiện chuyến (4 khoá) tới nhóm `dieu-xe` + tài xế liên quan"; đoạn Thông báo thêm "tin chuyến = hình chiếu `v_aud_trip_event` + dữ kiện qua `ctx.chuyenChoTin`, người nhận ở `src/shared/tin-chuyen.ts`"; bảng migration thêm dòng `NNNN_tin_chuyen.sql`. `docs/CHANGE-GUIDE.md`: bảng §1 dòng "Thêm / đổi người nhận tin chuyến → `src/shared/tin-chuyen.ts` (`HANH_DONG_TIN_CHUYEN`, `loaiCho`, câu) + bài mọi tập con"; công thức f thêm: "hành động `trip_*` mới: thêm vào `THAY_DOI_CUA` (Bảng tin); nếu sinh tin thì thêm vào `HANH_DONG_TIN_CHUYEN`; route gọi `baoThayDoiChuyen` sau `if (r) return r` (bài quét bắt)".

- [ ] **Step 6: Nhật ký phiên bản** — `src/shared/changelog.ts`: mục mới (số phiên bản = lớn nhất ở `origin/main` + 1 lúc gộp — L2), lời thường: "Tài xế nhận thông báo khi được xếp lái, bị đổi sang người khác, chuyến bị sửa hoặc huỷ. Văn phòng nhận thông báo khi một chuyến kết thúc giữa chừng hoặc có khách vắng ở đơn mình lập / phụ trách. Màn Điều phối xe, Chi tiết chuyến và Cuốc của tôi tự cập nhật khi chuyến thay đổi." Cập nhật `src/shared/app-info.test.ts` cho khớp.

- [ ] **Step 7: Toàn bộ kiểm** — chạy và chép số liệu vào nhật ký thi công:

```bash
npm test
npm run typecheck
npm run test:e2e
node scripts/audit-invariants.mjs --db local
```
Expected: tất cả xanh; typecheck 0 lỗi; audit thoát 0.

- [ ] **Step 8: Commit**

```bash
git add src/hanh-khach-khong-lo-ten.test.ts tests/audit/dieu-phoi-khung.mjs tests/e2e/tin-chuyen.mjs tests/e2e/run.mjs docs/SO-HANG-RAO.md docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md src/shared/changelog.ts src/shared/app-info.test.ts docs/superpowers/plans/
git commit -m "Hàng rào không lộ cho tin chuyến, e2e, sổ hàng rào, tài liệu, nhật ký phiên bản (ADR-0052 D6)

Vì sao: tin chuyến chạm dữ liệu cá nhân và quyền đọc — phải có bài quét toàn
tuyến và e2e trên API thật trước khi người kiểm độc lập nghiệm thu."
```

- [ ] **Step 9: Người kiểm độc lập** — giao subagent `nguoi-kiem-doc-lap` (chỉ đọc) kiểm: (a) tiêu chí 11–13 ADR-0052 phần D6; (b) "Điểm cho người kiểm" mục 3 (tin cần xử lý chỉ tới người làm được) và mục 5 (D6 không kéo thêm quyết định quyền ngoài bảng người nhận — không ô mới, không nới ghim); (c) Review Focus 1–5 ở đầu kế hoạch này có bài thật và đã thấy đỏ; (d) chạy lại `npm test`, `npm run typecheck`, `npm run test:e2e -- tin-chuyen thongbao bangtin tai-xe-cuoc`. Chỉ báo "đạt" khi có báo cáo ĐẠT.

---

## Tự rà theo đặc tả

| Mục ADR-0052 D6 | Task |
|---|---|
| D6.1 view `v_aud_trip_event`, chỉ khoá; không đọc `detail` | 2 (view), 1/3 (không đọc detail) |
| D6.1 danh sách hành động sinh tin — phần đã có hôm nay | 1 (`HANH_DONG_TIN_CHUYEN`); phần D4/D5 để đợt 5–6; MQ-07 tách (T7) |
| D6.2 bảng người nhận (xếp/gỡ, đổi giờ/huỷ, gián đoạn, khách vắng) | 1 |
| D6.2 mọi người nhận qua `can(trip.view)` lúc đọc; tài xế theo khoảng lái; không `tat-ca`; DRIVER_PARTNER không nhận | 1, 3, 4 |
| D6.2 không tin "quan trọng"; ADR-0045 giữ nguyên | 3 (`quanTrong: false`); đơn nháp không có chuyến |
| D6.3 hàm tiêm, không cạnh mới, không ai import van-chuyen | 2 (bài siết), 3, 4 |
| D6.3 gọi sau lô thành công, bắn-và-quên, không gọi khi 409 | 5 |
| D6.4 nhãn `dieu-xe` + `nguoi:<tài xế>`; sự kiện chỉ mã chuyến, loại, thời điểm; màn tự tải lại | 4, 6 |
| Tiêu chí 11, 12, 13 | 1, 3, 4, 5, 7 |

## Cần chủ (gom một lần hỏi)

1. **Câu chữ 6 loại tin** (bảng "Câu chữ tin" ở trên) — bề mặt, đổi được sau. Khuyến nghị: duyệt như đề xuất. Nếu chủ không trả lời, thi công dùng bản đề xuất và ghi lại.
2. **Tài xế có nhận tin khi văn phòng xếp / rút / dời khách trên chuyến của họ** (chưa xuất bến)? ADR-0052 D6.1 không liệt kê ⇒ kế hoạch này chỉ làm **màn tự tải lại**, không chuông / điện thoại. Phương án: (a) giữ như ADR (khuyến nghị — ít tin nhiễu, màn vẫn cập nhật); (b) thêm tin "Văn phòng vừa thêm / bớt khách trên chuyến …" cho tài xế — thêm người nhận tin ⇒ cần chủ đồng ý, sửa một dòng bảng.
3. **MQ-07 (giờ hẹn chặng đổi khi đã xếp xe → báo người lập và tài xế)** tách khỏi đợt này: nhật ký sửa chặng của đơn không ghi chặng nào và có hai đường ghi, không biết "giờ hẹn đổi" mà không đọc chữ nhật ký (bị cấm). Văn phòng đã có danh sách "Nhắc gọi báo khách". Phương án: (a) làm ở một lát riêng sau Đợt 5, khi soạn thêm cách ghi nhật ký chặng có khoá chặng (khuyến nghị); (b) làm ngay với tin rộng hơn "chặng đã xếp xe vừa sửa" (báo cả khi chỉ sửa nơi).

## Điều chưa chắc (người thi công đo lại lúc nhận)

- Tên khung giả trong `src/bang-tin-web.test.ts`, tên trường mã chuyến trong `CuocChiTietResponse`, mã lý do kết thúc gián đoạn, cột hiệu lực của `stf_permission`, trường mã đơn trả về từ `don()` của khung thử — kế hoạch ghi rõ chỗ phải đọc tệp thật trước khi chép mã.
- `moBangTin().tin` của e2e có lọc theo `laSuKienHopLe` không (nếu có: đọc `.raw`).
- Chi phí đọc thêm ở `GET /api/thong-bao/tom-tat` cho tài khoản văn phòng (1 truy vấn nhật ký + 3–4 truy vấn mảng khi có tin) — chưa đo trên D1 thật; ghi số đo vào nhật ký thi công.
- Bài quét Task 5 dựa vào khuôn mã `if (r) return r` / `return r.res` / `if (r instanceof Response) return r` của `index.ts` hôm nay; nếu đợt khác (Đợt 1, 3) đổi khuôn route trước khi gộp thì sửa regex của bài cho khớp, không nới điều kiện "sau nhánh lỗi".
