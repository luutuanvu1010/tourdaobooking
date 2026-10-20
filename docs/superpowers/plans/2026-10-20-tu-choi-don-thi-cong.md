# Nút «Từ chối» đơn của người đang phụ trách (ADR-0030 lượt 2, điều 1) — Kế hoạch thi công

> **Vai của tệp:** kế hoạch (người lập kế hoạch, phiên 2026-10-20, worktree `tu-choi-han-muc` tách từ `origin/main` e309acf3). Không thi công trong phiên này.
> **Thay cho** phần "Lượt 2" (Task 2.1–2.12) của `docs/superpowers/plans/2026-09-27-tu-choi-huy-hdv-thi-cong.md` — kế hoạch đó viết trên mã ngày 27/9, nay cũ 3 tuần; không thi công theo văn bản cũ nữa. Lượt 1 của kế hoạch cũ đã thi công xong (bảng đối chiếu mục 1).
> **Việc lớn** (quyền: ô mới `dispatch.refuse`; dữ liệu: đường đóng dòng phụ trách mới, dòng nhật ký chỉ-thêm). Bắt buộc người kiểm độc lập chỉ đọc (CLAUDE.md §3).
> **Ngoài phạm vi:** bộ đếm + hạn mức số lần Từ chối (ADR-0032, bản nháp `docs/superpowers/specs/2026-10-20-han-muc-tu-choi/ADR-0032-nhap.md`, phiên khác soạn). Kế hoạch này chỉ chừa chỗ (mục 3).
> **Mọi số dòng** dưới đây đọc trên `main` e309acf3 (2026-10-20). Người thi công kiểm lại số dòng khi bắt đầu (nhánh khác có thể đã gộp).

**Xây trên lỗ đang hở: không.** Đã đối chiếu `docs/quyen-hoan.json` trên e309acf3:
- `thao_tac` còn hoãn: `task.progress`, `dispatch.guides.view` (hạn 2026-11-30), `invoice.request`, `invoice.issue` — Từ chối không hỏi, không đổi ô nào trong số này (`dispatch.guides.view` là danh sách hướng dẫn viên cho Đối tác, chưa có route; không liên quan đóng/mở dòng phụ trách).
- `cua_ghi`: chỉ ngoại lệ tự phục vụ `/api/account/*` — route mới KHÔNG thêm mục hoãn nào (ô mới vào `MATRIX` cùng commit với route hỏi nó).
- `phat_hien` mở mức HIGH: TNV-G1 (đơn huỷ còn tiền), TNV-G3 (sửa sai sau "Đã giao"), TNV-G4 (sổ tiền thiếu ràng buộc), HC-5.19 (diễn tập khôi phục), HC-5.11 (định danh tác vụ tự động), HC-4.2 (duyệt bút toán điều chỉnh). Từ chối không huỷ đơn, không chạm tiền, không ghi sổ; chỉ ĐỌC cờ "Đã giao" để chặn (409) — không đi vào vùng hở nào.

---

## 1. Bảng đối chiếu ADR-0030 lượt 2 và kế hoạch cũ ↔ mã thật trên `main`

Ký hiệu: **CÓ** = đã có trên `main` (dẫn chứng tệp:dòng) · **LÀM** = còn phải làm, thuộc phạm vi lần này · **NGOÀI** = còn phải làm nhưng không thuộc nút Từ chối · **THAY** = bị ADR sau thay (dẫn ADR:dòng) · **HỎI** = xung đột/khoảng trống thật, cần chủ quyết (mục 6).

### 1a. Điều khoản ADR-0030 lượt 2 (D4, D5, S23-9) và các mục đi kèm

| # | Điều/ý (ADR-0030) | Trạng thái | Chứng minh / ghi chú |
|---|---|---|---|
| 1.1 | Điều 1 — ô `dispatch.refuse` (`SALES`/`ADMIN`/`FIELD` = `assigned`, `SUPER_ADMIN` = `any`, còn lại `none`) | **LÀM** | Không có trong `src/shared/permissions.ts` (grep `dispatch.refuse` rỗng); các ô dispatch hiện có ở `permissions.ts:114-116`. Bảng nay **10 cột** (`PERMISSION_CODES` `permissions.ts:5`): thêm `DRIVER`, `DRIVER_PARTNER`, `HR` = `none`. |
| 1.2 | Điều 1 — route Từ chối + chốt "người gọi đang phụ trách" (cả Toàn quyền) | **LÀM** | Không có route `handler-refuse` (route của dispatch: `src/modules/dispatch/index.ts:109,127,142,157,218,249`). |
| 1.3 | Điều 1 — chặn đơn đã huỷ (409) | **LÀM** | Khuôn chặn có sẵn ở Nhận: `dispatch/index.ts:180` (`CLAIM_CANCELLED`). |
| 1.4 | Điều 1 — Q-E: ngày đi (lớn nhất) ≤ ngày mai → 409 "Gọi văn phòng để đổi người" | **LÀM** | Chưa có hàm; có `tripDeparted` (`src/shared/trip-rules.ts:38`), `addDays` (`trip-rules.ts:59`, `vn-date.ts:59`), `findOrderDepartDates` (`orders/index.ts:334`). |
| 1.5 | Điều 1 — "sau này, từ Đã giao" | **CÓ cơ chế, LÀM chốt** | ADR-0025 đã lên: `orderDelivered` (`dispatch/repository.ts:103-106`), 409 `order_delivered` (`dispatch/index.ts:49`), trigger chặn đóng dòng `HANDLE` của đơn đã giao (`migrations/0044_orders_da_giao.sql:102-104`). Route mới phải hỏi `orderDelivered` trước lô. |
| 1.6 | Điều 1 — lô: đóng `HANDLE` của người gọi (khuôn `CLOSE_HANDLER`), không mở dòng mới, + nhật ký `order_handler_refused` `changes() > 0`; thua đua → 409 `stale` | **LÀM** | `CLOSE_HANDLER` có sẵn `dispatch/repository.ts:46-51`, `closeHandlerStatement` `:86-87`; khuôn lô `dispatch/service.ts:28-32`. Hành động `order_handler_refused` chưa có ở `src/shared/audit-actions.ts` (cạnh `order_claimed` `:105`). |
| 1.7 | Điều 1 — sau Từ chối: HDV mở chi tiết → 404; Bán hàng vẫn xem đủ | **CÓ (tự đúng)** | `order.view` của `FIELD` = `assigned` (`permissions.ts:88`), chi tiết đơn không phụ trách → 404 (`seesOnlyAssignedOrders` `permissions.ts:397`; bài `src/modules/orders/xem-don-theo-quyen.test.ts`). Chỉ cần ca kiểm mới sau Từ chối. |
| 1.8 | Điều 1 — bảng chọn người hiện "đã từ chối lúc … — <lý do>" (đọc qua hàm công bố của `audit`) | **HỎI (Q3)** | Chưa có. **Xung đột với ADR-0131** (accepted 18/10): "lớp người khác thấy chỉ trả lời đơn đã đổi gì … không bao giờ cho biết ai bấm" (`docs/adr/ADR-0131-nhat-ky-kiem-toan-chi-toan-quyen-doc-du.md:25`), tên người làm chỉ cho `audit.view` (Toàn quyền). Dòng này đọc nhật ký để nói "người X đã từ chối" cho Bán hàng/Quản trị. |
| 1.9 | Điều 1 — Bảng tin loại `tu_choi`, gắn `cho-nhan` + `nguoi:<người trả>`, câu nổi "Đơn TD-… vừa được trả lại, đang chờ người nhận" | **LÀM** | `THAY_DOI` nay **11** giá trị (`src/shared/bang-tin.ts:13`), câu nổi `bang-tin.ts:141-146`, luật nổi `thongBaoNoi` `:180-191`; `nhanSuKien` `:96-107` đã gắn đúng nhãn khi truyền `handlerTruoc` thật. Bảng `HANH_DONG_CUA_THAY_DOI` của Web Push (`src/shared/web-push.ts:54-66`) là `Record<ThayDoiDon,…>` → typecheck bắt thêm dòng. |
| 1.10 | Điều 1 — không nút "gỡ người phụ trách" cho văn phòng; không đếm/hạn mức | giữ nguyên | Không làm (ADR-0030 điều 1, điều 5). |
| 2.1 | Điều 2 — lý do Từ chối: "Bận lịch khác", "Ốm / việc riêng", "Không phù hợp tuyến/dịch vụ", "Khác" (không ô chữ) | **LÀM** | Chưa có danh sách. ADR-0037 chỉ mở ô chữ cho HDV **huỷ**, không cho Từ chối (`docs/adr/ADR-0030-…md:445`). |
| 2.2 | Điều 2 — Huỷ qua `/status` bắt buộc lý do (danh sách đóng 4 mục, "Khác" không chữ) | **CÓ + THAY** | Đã có: `orders/index.ts:1589-1592` (`docLyDoHuy`), danh sách `src/shared/ly-do-huy.ts:25-41`. **ADR-0089 đ8 thay** danh sách (thêm nhóm "Công ty huỷ" chỉ Quản trị/Toàn quyền, "Khác" **bắt** ghi chú, chặn SĐT): `docs/adr/ADR-0089-…md:93,152`; mã `ly-do-huy.ts:57-79`. Không làm gì thêm. |
| 2.3 | Điều 2 — HDV huỷ giữ hai lý do (+ "Khác" của ADR-0037) | **CÓ** | `dispatch/rules.ts:72-90`; route `dispatch/index.ts:227-234`; ánh xạ nhóm `ly-do-huy.ts:82-86` (ADR-0089). |
| 2.4 | Điều 2 — Q-G: HDV huỷ được **đơn chưa chốt** | **THAY (cần chủ xác nhận — Q1)** | Mã vẫn chặn: `dispatch/index.ts:225` (`NOT_CONFIRMED`), `orders/index.ts:547` (gắn cứng `"confirmed"`). **ADR-0135** (accepted 19/10) Đ2: *"Mọi route ghi lên đơn nháp … chỉ người lập … Huỷ và sửa tiền của HDV đã chặn nháp sẵn (`NOT_CONFIRMED`)"* (`ADR-0135-…md:23`), Đ5: người phụ trách chọn sẵn không đọc/ghi nháp (`:26`). ADR-0135 không ghi tên Q-G trong mục "Quan hệ với ADR cũ" (`:9-15`) — nên ghi vào câu hỏi để chủ xác nhận "không làm". |
| 2.5 | Điều 2 — điều kiện tiên quyết: khoá lạc quan `updated_at` của câu huỷ | **CÓ** | `orders/repository.ts:1084-1119` (`cancelOrder`/`soanHuyDon`, khoá `status` + `updated_at`); bài `src/modules/orders/cancel-lock.test.ts`. |
| 2.6 | S23-9 — lý do HDV sửa số khách thành danh sách đóng | **NGOÀI** | Chưa làm: `orders/money-adjustment.ts:86-92` vẫn nhận chữ tự do (chặn dãy số dài). Đã ghi lệch ở `docs/SYSTEM-DESIGN.md` §16 (dòng ADR-0030 S23-9). Đường văn phòng đã đóng theo ADR-0063 đ7. Không thuộc nút Từ chối → để việc riêng. |
| 3.1 | Điều 3 — nhãn "Chờ nhận" / "HDV: <tên>" / "Chờ xác nhận" | **CÓ** | `src/shared/handler-view.ts:9-11`; "Chờ xác nhận" theo lượt 1. |
| 3.2 | Điều 3 — "Chờ nhận · được trả lại" khi lần đóng gần nhất là Từ chối (dựng theo mã hành động, không phân tích chữ) | **LÀM** | Chưa có. Chỉ ở chi tiết đơn (văn phòng) và màn HDV (hàng chờ) — G2; danh sách đơn văn phòng giữ nguyên. |
| 3.3 | Điều 3 — "Đã huỷ · <lý do>", "Đã huỷ · HDV huỷ: <lý do>" | **NGOÀI** | Không thuộc nút Từ chối; lý do huỷ nay có bảng riêng `ord_cancel_reason` (ADR-0089) — nhãn đơn huỷ là việc của luồng huỷ. |
| 4.1 | Điều 4 — lệch có chủ ý 5.1: luật (a) chỉ người phụ trách tự đóng không mở, (b) chặn đơn huỷ + Q-E, (c) lý do bắt buộc — chỉ ở mã máy chủ | **LÀM (tài liệu)** | `docs/SYSTEM-DESIGN.md` §16 hiện có dòng lệch 5.1 cho **S20-5** (chốt Nhận). Phải mở rộng dòng đó (hoặc thêm dòng) cho (a)(b)(c). |
| 4.2 | Điều 4 — câu kiểm LC-8 mới ở `audit-invariants` (mức cảnh báo trước) | **LÀM** | `scripts/audit-checks.mjs:1484-1520` có R-DSP-1/2a/2b/3, chưa có LC-8. `dropHandler` của e2e **đã không còn** (grep `tests/e2e` rỗng) — không phải gỡ. |
| 5 | Điều 5 — cam kết: lô Từ chối để ADR-0032 đặt câu chèn `REFUSE` có điều kiện **lên đầu lô** mà không phá khuôn `changes()` | **LÀM** | Xem mục 3. Bản nháp ADR-0032 điều 5 đã viết đúng giả định này (`ADR-0032-nhap.md:40`). |
| H | Hệ quả — `bang-tin-guard` phải **thêm tay** route | **LÀM** | Danh sách `expected` ở `src/bang-tin-guard.test.ts:206-217` (8 route). |
| H | Hệ quả — tin "được trả lại" ở **hộp thông báo / điện thoại** | **HỎI (Q4)** | ADR-0030 chỉ nói Bảng tin nổi. Hộp thông báo (ADR-0034, có sau) là hình chiếu nhật ký qua view có **danh sách đóng** `migrations/0025_thong_bao.sql:53-56` + `src/shared/thong-bao.ts:10`; thêm `order_handler_refused` = migration mới + sửa ADR-0034. Nhật ký thi công cũ đã nêu treo câu này (`…-thi-cong-nhat-ky.md:231`). |
| H | ADR-0131 — mọi hành động nhật ký mới phải xếp loại ở lớp rút gọn (typecheck đỏ nếu thiếu) | **HỎI (Q2)** | `src/shared/lich-su-noi-bo.ts:13` (hàng rào máy), danh sách chủ duyệt `:19-…`; lớp Đối tác `src/shared/lich-su-doi-tac.ts:94-95`. Chữ chi tiết "<tên người trả> — <lý do>" (ADR-0030 Hệ quả `:244`) luôn nêu chính người bấm → theo ADR-0131 đ2c phải "bỏ chữ" như `order_claimed` (`lich-su-noi-bo.ts:37`). |

### 1b. Task cũ 2.1–2.10 (kế hoạch 27/9)

| Task cũ | Trạng thái | Ghi chú |
|---|---|---|
| 2.1 Danh sách lý do dùng chung (`src/shared/ly-do.ts`) | **CÓ một phần / LÀM phần Từ chối** | Huỷ văn phòng + HDV đã có ở `src/shared/ly-do-huy.ts` (ADR-0089) và `dispatch/rules.ts:72-90`. Phần Từ chối → Task T1 dưới đây (tệp riêng `ly-do-tu-choi.ts`). Phần sửa số khách → NGOÀI (S23-9). |
| 2.2 Huỷ `/status` bắt buộc lý do | **CÓ, THAY bởi ADR-0089 đ8** | `orders/index.ts:1589-1599`. |
| 2.3 HDV huỷ đơn chưa chốt | **THAY bởi ADR-0135 Đ2/Đ5** (chờ chủ xác nhận, Q1) | Không làm. |
| 2.4 Từ chối: ô + route + Bảng tin | **LÀM** | Task T3, T4. Khác văn bản cũ: 10 cột quyền; chốt "Đã giao"; số route 363 → 364; `THAY_DOI` 11 → 12; thêm mục vào `NGOAI_PHAM_VI_ROUTE` của bảng sự kiện vận chuyển; Web Push. |
| 2.5 LC-8 + bỏ `dropHandler` | **LÀM phần câu kiểm; `dropHandler` đã không còn** | Task T6. |
| 2.6 Bảng chọn người "đã từ chối lúc …" | **HỎI (Q3)** | Khuyến nghị hoãn sang ADR-0032 (đọc bảng sự kiện nghiệp vụ, không đọc nhật ký). |
| 2.7 Lý do sửa số khách đóng (S23-9) | **NGOÀI** | Việc riêng. |
| 2.8 Nhãn lượt 2 | **LÀM phần "được trả lại"** | Task T5. Nhãn đơn huỷ: NGOÀI. |
| 2.9 Giao diện (chờ bản thiết kế của chủ) | **HỎI (Q5)** | Không có bản vẽ Từ chối trong `docs/design/` (bản HDV `docs/design/tour-o-booking-hdv/` không có nút này). |
| 2.10 e2e, tài liệu, sổ hàng rào | **LÀM** | Task T9, T10. |

### 1c. ADR / quyết định sau 27/9 đã đối chiếu

| ADR | Ảnh hưởng tới nút Từ chối |
|---|---|
| ADR-0025 (Đã giao, khoá) | Phải chặn Từ chối khi đơn đã "Đã giao" (409 `order_delivered`, như `dispatch/index.ts:175`); trigger `0044:102-104` là lưới cuối — bắt lỗi trigger thành 409, không để 500. |
| ADR-0034, 0045, 0062 (hộp thông báo, tin lúc xác nhận, tin đổi sau xác nhận) | Hộp thông báo đọc danh sách hành động đóng (`thong-bao.ts:10`, view `0025:53-56`) → không tự có tin "được trả lại" (Q4). Từ chối không đổi nội dung đơn → không sinh tin ADR-0062. |
| ADR-0037 (HDV huỷ "Khác") | Chỉ áp cho `handler-cancel`; Từ chối "Khác" vẫn không ô chữ. |
| ADR-0053 (tài xế đối tác Từ chối **chuyến**, ô `trip.refuse`) | Khác hẳn (chuyến xe, module `van-chuyen`, `van-chuyen/index.ts:2063-2090`). Dùng làm **khuôn giao diện/chữ** ("Từ chối chuyến" → "Từ chối đơn", "Xác nhận từ chối" đã có trong mã). Không dùng chung ô. |
| ADR-0063 (văn phòng sửa số khách) | Không liên quan. |
| ADR-0089 (lý do huỷ có nhóm) | Đã thay điều 2 phần huỷ (1a dòng 2.2). |
| ADR-0099 (Bán hàng ghi khoản thu đơn đang phụ trách) | Sau khi Bán hàng tự Từ chối đơn KHÔNG phải của mình, họ mất quyền ghi thu đơn đó — đúng nghĩa, không cần làm gì. |
| ADR-0104 (đồng bộ chuyến theo đơn, `dongBoChuyen`) | **Không đồng bộ.** Máy đồng bộ chỉ xét **suất khách theo chặng** (`src/shared/dong-bo-chuyen.ts:5-12`, danh sách hành động cổng `:23-25`); người phụ trách đơn không nằm trong chuyến. "Người đi kèm" của chuyến là hồ sơ HDV do văn phòng chọn tay (`src/index.ts:185-189`), không gắn với dòng `HANDLE`. Route Từ chối KHÔNG gọi `dongBoChuyen`, phải có mục ở `NGOAI_PHAM_VI_ROUTE` (`src/shared/bang-su-kien-van-chuyen.ts:425-458`), không thì bài (d) `src/bang-su-kien-van-chuyen.test.ts:240` đỏ. Giới hạn đã biết: HDV vừa trả đơn mà đang là người đi kèm của chuyến chở khách đơn đó thì vẫn đứng tên đi kèm — văn phòng đổi tay (ghi vào hướng dẫn Quản trị). |
| ADR-0131 (nhật ký chỉ Toàn quyền đọc đủ) | Q2, Q3. |
| ADR-0135 (nháp riêng tư; **chưa lên mã**, phát hành cùng ADR-0136) | Q1. Hàng chờ chỉ đơn đã xác nhận (Đ4); hôm nay `listPoolSources` còn lấy cả nháp (`orders/repository.ts:602-608`). |
| Mốc 6 giờ / đặt gấp (ADR-0049) | Không liên quan: Từ chối không đổi chặng, không xác nhận đơn. Hạn Q-E (hôm nay/ngày mai) là luật riêng của Từ chối, tính theo **ngày**. |
| Nhánh `origin/worktree-xac-nhan-don-2` (bước Xác nhận đơn) | Không thêm giá trị mới cho `orders.status` (kế hoạch `docs/superpowers/plans/2026-10-19-xac-nhan-don.md:7`: "Chờ xác nhận" = nháp + bảng `ord_confirm_request`). Đợt 1 đã trên `main` (`migrations/0115_chon_don_khung_gio.sql`). Rủi ro va chạm: mục 7. |

---

## 2. Phạm vi lần này

**Làm:**
1. Danh sách lý do Từ chối (luật thuần dùng chung máy chủ ↔ giao diện).
2. Luật hạn Q-E (luật thuần dùng chung).
3. Hành động nhật ký `order_handler_refused` + xếp loại ở hai lớp lịch sử rút gọn (theo câu trả lời Q2).
4. Lô ghi Từ chối ở `dispatch/service.ts` (đúng khuôn `changes()`, chừa chỗ ADR-0032).
5. Ô `dispatch.refuse` + route `POST /api/orders/:id/handler-refuse` (cổng `orders`) + Bảng tin `tu_choi` — **cùng một commit** (hàng rào 1 `src/permission-enforcement.test.ts`).
6. Nhãn "Chờ nhận · được trả lại": hàng chờ của HDV + khối Người phụ trách ở trang đơn của văn phòng.
7. Câu kiểm LC-8 (`R-DSP-4`) ở `audit-invariants`, mức cảnh báo (đỏ khi `--strict`).
8. Giao diện: nút "Từ chối đơn" + bảng chọn lý do — ở thẻ "Đơn của tôi" (HDV) và khối "Người phụ trách" của trang đơn (mọi người đang phụ trách: Bán hàng, Quản trị, HDV, Toàn quyền). Ẩn khi hạn Q-E đóng, đơn đã huỷ, đã giao (theo Q1: cả đơn nháp).
9. Hướng dẫn trong Nền tảng (`src/shared/huong-dan-hdv.ts`, `huong-dan-ban-hang.ts`, `huong-dan-quan-tri.ts`).
10. Tài liệu: `docs/SYSTEM-DESIGN.md` §6, §7, §8, §16; `docs/CHANGE-GUIDE.md` (công thức lô Từ chối); `src/shared/changelog.ts` (mục mới, lời thường); `docs/SO-HANG-RAO.md`.

**Không làm (đã nêu lý do ở mục 1):** bảng chọn người "đã từ chối lúc…" (chờ Q3 — khuyến nghị hoãn sang ADR-0032); tin ở hộp thông báo / điện thoại (chờ Q4 — khuyến nghị không làm lượt này); HDV huỷ đơn nháp (ADR-0135); lý do sửa số khách đóng (S23-9); nhãn đơn huỷ; đếm và hạn mức (ADR-0032); trigger chặn ở CSDL (lệch 5.1 có chủ ý); migration (không cần).

**Van-chuyen:** KHÔNG đồng bộ chuyến khi đơn mất người phụ trách (lý do ở 1c dòng ADR-0104). Chỉ thêm một mục ngoài phạm vi vào bảng sự kiện vận chuyển.

**Không migration, không bảng, không cột** (đúng ADR-0030 Hệ quả `:242`). Nếu chủ chọn Q4 (b) thì mới có migration — tách thành task riêng sau khi chủ trả lời.

---

## 3. Chừa chỗ cho ADR-0032 (cam kết ADR-0030 điều 5)

### 3a. Lô Từ chối hôm nay

`refuseStatements(db, { orderId, partyId, actorId, at, lyDo })` ở `src/modules/dispatch/service.ts` trả:

| Chỉ số | Câu | Vai |
|---|---|---|
| [0] | `closeHandlerStatement(db, orderId, partyId, at, actorId)` — SQL `CLOSE_HANDLER` có sẵn (`dispatch/repository.ts:46-51`): chỉ đóng dòng `HANDLE` đang mở **mang `party_id` của người gọi** | **Câu chốt.** Không phụ thuộc câu nào trước nó. `changes() = 0` ⇔ người gọi không còn phụ trách (thua đua). |
| [1] | `auditStatement(db, { action: "order_handler_refused", orderId, staffId: actorId, at, detail }, "changes() > 0")` | Chỉ ghi khi [0] đã đóng một dòng. |

Không có câu mở dòng mới. Thắng/thua **không** đọc thẳng `results[0]` ở route: `service.ts` xuất hàm `tuChoiThang(kq: readonly D1Result[]): boolean` (hôm nay đọc `kq[0]`). Route chỉ gọi hàm này (khuôn `daHuy`, `orders/repository.ts:1119`).

### 3b. Chỗ ADR-0032 sẽ chen vào (không làm bây giờ)

| Chỉ số | Câu (sau ADR-0032) |
|---|---|
| [0] **mới** | `INSERT INTO dsp_release_event (… 'REFUSE', <mã lý do>) SELECT … WHERE <chuỗi/tuần còn dưới mức> AND EXISTS (SELECT 1 FROM dsp_assignment WHERE order_id = ? AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL AND party_id = ?)` — câu chốt mới |
| [1] | Câu đóng: **biến thể mới** `CLOSE_HANDLER_SAU_CHOT` = `CLOSE_HANDLER` + `AND changes() > 0` (defineSql mới). **Không sửa** `CLOSE_HANDLER`: `handlerChangeStatements` dùng nó làm câu chốt đứng đầu (`service.ts:31`). |
| [2] | nhật ký `changes() > 0` (không đổi) |

ADR-0032 chỉ sửa `refuseStatements` + `tuChoiThang` (đọc `kq[1]`). Route không đổi dòng nào. Mã lý do của dòng `REFUSE` = **mã** của `ly-do-tu-choi.ts` (T1) — vì vậy mã phải coi là hợp đồng, không đổi tên sau khi phát hành.

Bài minh hoạ khuôn (Task T3): trong `service.test.ts`, trên SQLite thật, dựng một câu đầu lô giả (chèn có điều kiện vào bảng tạm khai ngay trong bài) + biến thể câu đóng có `AND changes() > 0` viết ngay trong tệp bài kiểm (không đăng ký vào `sql-registry`), chứng minh: câu đầu không chèn → câu đóng không đóng → không có nhật ký; câu đầu chèn → đủ ba câu. Ghi chú "khuôn cho ADR-0032".

### 3c. Các lô khác ADR-0032 sẽ ghi sự kiện (chỉ chỉ chỗ, không sửa)

| Sự kiện | Lô ở đâu | Thứ tự hôm nay | Chỗ đặt câu sự kiện (gợi ý cho ADR-0032) |
|---|---|---|---|
| `CLAIM` / `ASSIGN` (Nhận, Giao, đổi người) | `handlerChangeStatements` — `src/modules/dispatch/service.ts:28-32`; gọi từ route `PUT /api/orders/:id/handler` `dispatch/index.ts:191-201`; thắng/thua đọc `results[0]` `:206` | [đóng (chốt), mở sau đóng, nhật ký] hoặc [mở nếu chưa có (chốt), nhật ký] | **cuối lô**, `WHERE changes() > 0` (sau câu nhật ký) — không đổi chỉ số câu chốt. Loại (`CLAIM`/`ASSIGN`) đã có sẵn: `tuNhan` (`service.ts:18`, `:53`). |
| `ASSIGN` lúc lập đơn (người lập chọn HDV) | `newOrderHandlerStatements` — `dispatch/service.ts:42-45`, đi qua `newOrderHandler` `dispatch/index.ts:87-92` → `ctx.newOrderHandler` → `orders/index.ts:1109-1111` → `createOrder` (lô tạo đơn của `orders`) | [mở `HANDLE`, nhật ký `changes() > 0`] nằm sau câu `INSERT` đơn + `created` | cuối mảng do dispatch trả, `changes() > 0`. Không đổi hợp đồng `orders` (mảng câu do dispatch dựng). |
| `ABORT` (HDV huỷ) | route `dispatch/index.ts:218-242` → `cancelOrderByHandler` `orders/index.ts:542-550` → `soanHuyDon` `orders/repository.ts:1102-1117` | [dòng lý do, đổi trạng thái (thắng = `kq[1]`, `daHuy` `:1119`), nhật ký `changes() > 0`] rồi khúc chuyến của `dongBoChuyen` | ngay **sau câu nhật ký, trước khúc chuyến**, `changes() > 0`. Cần tham số mới cho `cancelOrderByHandler` (câu chưa chạy do dispatch dựng) = **đổi hợp đồng `orders`↔`dispatch`** (ADR-0007 đ4(b)), đỏ trước. |
| Mọi đường mở `HANDLE` | chỉ ba câu `INSERT_HANDLER*` ở `dispatch/repository.ts:30-39` (+ gieo lịch sử `migrations/0014_dispatch.sql:79`) | — | ADR-0032 khoá danh sách này bằng bài kiểm (bản nháp `ADR-0032-nhap.md:68`). |

---

## 4. Tiêu chí nghiệm thu (viết TRƯỚC khi làm — P20)

Mã lỗi dùng dưới đây là đề xuất của kế hoạch (bề mặt, đảo được): `forbidden`, `not_found`, `cancelled`, `order_delivered`, `order_not_confirmed`, `too_late`, `invalid_input`, `stale`.

**TC-1 Từ chối thành công (harness + e2e).** HDV (chỉ `FIELD`) đang phụ trách đơn đã xác nhận, ngày đi = ngày kia, gửi `{ lyDo: "BAN_LICH" }` → **200** `{ ok: true }`. Sau đó: đơn **không** còn dòng `HANDLE` mở; dòng cũ có `valid_to_at` = mốc lệnh, `updated_by` = người gọi; **đúng một** dòng `audit_log` `order_handler_refused` của đơn, `staff_id` = người gọi, `detail` không chứa chuỗi 8+ chữ số, không email, đúng khuôn theo Q2. Không có dòng `HANDLE` mới.

**TC-2 Sau Từ chối.** HDV vừa trả: `GET /api/orders/:id` → **404**; `GET /api/orders/pool` có đơn đó với `traLai: true`; `GET /api/dispatch/mine` không còn đơn đó. Bán hàng vừa trả (`order.view = any`): `GET /api/orders/:id` → **200**. Văn phòng `PUT /api/orders/:id/handler` giao lại cho chính người vừa trả → **200**.

**TC-3 Ai.** Toàn quyền **không** đang phụ trách → **403**; Bán hàng không phụ trách → **403**; Quản trị không phụ trách → **403**; Kế toán, Thực tập, Đối tác → **403** (sàng sớm, trước mọi đọc CSDL); Tài xế, Nhân sự → **403** ở cổng `orders`. Toàn quyền **đang** phụ trách → 200. Bán hàng, Quản trị đang phụ trách → 200. Đơn do Đối tác lập, HDV đang phụ trách → 200.

**TC-4 Khi nào.** Đơn đã huỷ → **409** `cancelled`. Đơn "Đã giao" → **409** `order_delivered`. Ngày đi = hôm nay → **409** `too_late`, câu "…Gọi văn phòng để đổi người."; = ngày mai → **409** `too_late`; = ngày kia → 200; đã qua ngày đi → **409** `too_late`; đơn cũ có ngày [hôm nay, ngày kia] (lấy ngày lớn nhất) → 200; đơn chưa có ngày nào → 200. Đơn nháp → theo Q1 (khuyến nghị **409** `order_not_confirmed`). Ngày tính bằng `vnToday(new Date())`; bài kiểm dùng ngày tương đối (khuôn `inDays` của `nhan-don.test.ts:23`).

**TC-5 Lý do.** Thiếu `lyDo`, mã lạ, kiểu sai → **400**; có thêm khoá chữ (`ghiChu`, `note`, `reason`) → **400** (không ô chữ, kể cả "Khác"); không dòng nào thay đổi. Câu báo liệt kê bốn lựa chọn bằng tiếng Việt.

**TC-6 Đua.** (a) Văn phòng đổi người A→B đúng lúc A Từ chối (lặp 10 vòng `Promise.all`): mỗi vòng đúng một bên 200, bên kia 409 `stale`; tối đa một dòng `HANDLE` mở; không dòng nhật ký thừa. (b) HDV B bấm Nhận đúng lúc A Từ chối: lệnh tới trước thắng — Nhận chạy khi A còn phụ trách → Nhận **409** `stale` (đơn đã có người), Từ chối vẫn 200; Từ chối chạy trước → Nhận sau **200**. Mọi thứ tự: tối đa một dòng `HANDLE` mở, nhật ký khớp đúng các lệnh thắng.

**TC-7 Bảng tin (hàm thuần).** Sự kiện `tu_choi` với `handlerTruoc = {coNguoi: true, staffId: A}` và sau "không ai" → nhãn đúng `["cho-nhan", "nguoi:A", "nguoi:<người lập>", "tat-ca"]`. `thongBaoNoi`: HDV khác (chỉ `FIELD`) → câu "Đơn TD-… vừa được trả lại, đang chờ người nhận"; Kế toán → có câu; tài khoản lai (có quyền Đối tác) → `null`; Đối tác, Thực tập → `null`. Câu không chứa mã thô. `THAY_DOI` đúng 12 giá trị. `laSuKienHopLe` nhận `tu_choi`. Route gọi `baoThayDoi` đúng một lần, chỉ ở nhánh thắng (bài `bang-tin-guard`).

**TC-8 Nhãn.** Hàm thuần: lần thay đổi phụ trách gần nhất là `order_handler_refused` → "Chờ nhận · được trả lại"; là `order_claimed`/`order_handler_changed` hoặc chưa từng có ai → "Chờ nhận". Không phân tích chữ `detail`. Trang đơn (văn phòng) và thẻ hàng chờ (HDV) hiện đúng chữ; danh sách đơn văn phòng **không đổi**.

**TC-9 LC-8.** `R-DSP-4` = 0 trên D1 local sau `npm run test:e2e`; đột biến: chèn tay một dòng `HANDLE` đã đóng không có `order_handler_refused` → `node scripts/audit-invariants.mjs --db local --strict` thoát 1 nêu `R-DSP-4` → hoàn nguyên. Không `--strict` → chỉ cảnh báo.

**TC-10 Hàng rào.** `dispatch.refuse` vào `MATRIX` cùng commit với route; `src/permission-enforcement.test.ts`, `src/route-write-guard.test.ts` xanh; route có trong `expected` của `bang-tin-guard`; mục `NGOAI_PHAM_VI_ROUTE` có; `src/route-access.test.ts` 364 route. Mỗi hàng rào mới có dòng `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật (đột biến → đỏ → hoàn nguyên).

**TC-11 Giao diện (Chrome 390 + 1040).** HDV A bấm "Từ chối đơn" ở thẻ "Đơn của tôi", chọn lý do, bấm xác nhận → thẻ biến mất, đơn xuất hiện ở "Đơn chờ nhận" của HDV B trong ≤ 5 giây kèm thông báo nổi "vừa được trả lại" và chip "được trả lại". Nút không hiện khi ngày đi ≤ ngày mai, đơn đã huỷ, đã giao, (theo Q1) đơn nháp. Trang đơn: Bán hàng đang phụ trách thấy nút ở khối "Người phụ trách"; người không phụ trách không thấy. 409 `too_late` hiện đúng câu; thua đua → tải lại. Không lộ mã thô. Ẩn/hiện hỏi `can(staff, "dispatch.refuse", { assigned: true })` (bài `src/giao-dien-hoi-bang-quyen.test.ts`).

**TC-12 Hướng dẫn.** Không còn câu "chưa có nút trả đơn" (`huong-dan-hdv.ts:125`) và "HDV từ chối đơn: chưa có nút này" (`huong-dan-ban-hang.ts:183`); mọi `[[Tên nút]]` mới có nguyên văn trong `web/` (`src/shared/huong-dan.test.ts` A2).

**TC-13 Không đổi.** e2e quyền hiện có của Thực tập, Đối tác, Kế toán vẫn xanh; Nhận/Giao/HDV huỷ cũ không đổi hành vi; `GET /api/dispatch/handlers` cũ vẫn đọc được (trường mới chỉ thêm).

**TC-14 Lệnh.** `npm test` xanh, `npm run typecheck` 0 lỗi, `npm run build:web`, `npm run test:e2e` xanh, `node scripts/audit-invariants.mjs --db local --strict` đạt; **người kiểm độc lập chỉ đọc báo ĐẠT**.

---

## 5. Danh sách task (mỗi task đỏ trước → xanh sau)

Thứ tự: T0 → T1, T2 (song song được) → T3 → T4 → T5, T6 (song song được) → T7 → T8 → T9 → T10 → T11 → T12.
**Phụ thuộc câu trả lời của chủ:** T2 (Q2), T4 bước chặn nháp (Q1), T7 (Q5). T1, T3, T5, T6 không phụ thuộc — làm trước khi chờ.

### T0 — Chuẩn bị
- Worktree riêng từ `origin/main` mới nhất (`.claude/worktrees/<tên>`), không sửa checkout gốc.
- Tạo sổ `docs/superpowers/plans/2026-10-20-tu-choi-don-thi-cong-nhat-ky.md` (ruling, nợ, câu trả lời của chủ nguyên văn).
- Chạy `npm test`, `npm run typecheck` làm mốc. `git log --oneline origin/main..origin/worktree-xac-nhan-don-2` và các nhánh khác chạm tệp ở mục 7 — ghi vào sổ.
- Kiểm lại mọi số dòng của kế hoạch này.

### T1 — Luật thuần: lý do Từ chối + hạn Q-E
**Tệp:** `src/shared/ly-do-tu-choi.ts` (mới, import kèm đuôi `.ts`), `src/shared/ly-do-tu-choi.test.ts` (mới), `src/shared/trip-rules.ts` (+ `tuChoiQuaMuon`), `src/shared/trip-rules.test.ts`.
- **Đỏ trước:**
  - `LY_DO_TU_CHOI` đúng bốn mục, đúng thứ tự, nhãn nguyên văn ADR-0030 điều 2: `BAN_LICH` "Bận lịch khác", `OM_VIEC_RIENG` "Ốm / việc riêng", `KHONG_PHU_HOP` "Không phù hợp tuyến/dịch vụ", `OTHER` "Khác" (mã là hợp đồng với ADR-0032 — mục 3b).
  - `docLyDoTuChoi(body)`: `{ lyDo: <mã> }` → ok; thiếu / mã lạ / không phải chuỗi → lỗi; có bất kỳ khoá nào khác ngoài `lyDo` → lỗi (không ô chữ); lời báo liệt kê bốn nhãn.
  - `tuChoiQuaMuon(dates, today)`: ngày lớn nhất tồn tại và ≤ `addDays(today, 1)` → true; [hôm nay] true, [ngày mai] true, [ngày kia] false, [hôm qua] true, [hôm nay, ngày kia] false, [] / [null] false.
- **Mã:** viết hai hàm thuần; `tuChoiQuaMuon` dùng lại `addDays` và cùng định nghĩa "ngày đi = ngày lớn nhất" với `tripDeparted` (`trip-rules.ts:38`).
- **Lệnh:** `node --test src/shared/ly-do-tu-choi.test.ts src/shared/trip-rules.test.ts`; `npm run typecheck`.
- **Thấy chặn thật:** đổi `≤ ngày mai` thành `< hôm nay` → ca "ngày mai" đỏ → hoàn nguyên.

### T2 — Hành động nhật ký + xếp loại lịch sử rút gọn (phụ thuộc Q2)
**Tệp:** `src/shared/audit-actions.ts` (cạnh `order_claimed` `:105`), `src/shared/audit-actions.test.ts`, `src/shared/lich-su-noi-bo.ts` (+ `lich-su-noi-bo.test.ts` — danh sách chủ duyệt), `src/shared/lich-su-doi-tac.ts` (`LICH_SU_DOI_TAC_AN` `:51-…`), `src/lich-su-don-khong-ten.test.ts`, `src/lich-su-don-doi-tac.test.ts`.
- **Đỏ trước:** thêm `order_handler_refused: { label: "Trả đơn (Từ chối)", group: "order" }` → `npm run typecheck` đỏ ở `_phanLoaiNoiBoDay` / `_phanLoaiDay` (đây là hàng rào ADR-0131 — ghi lại là đã thấy chặn thật).
- **Mã (theo Q2, khuyến nghị (a)):** `detail` = **chỉ nhãn lý do** (vd "Bận lịch khác"); lớp nội bộ xếp `"giu"`; lớp Đối tác xếp **ẩn** (cùng nhóm với `order_handler_changed`, `order_claimed` ở `lich-su-doi-tac.ts:54`). Nếu chủ chọn (b): `detail` = "<tên> — <lý do>", lớp nội bộ `"bo"`.
- Bài mới: dòng `order_handler_refused` tới người không qua `audit.view` không có tên/mã người làm (khuôn ADR-0131 TC-1).
- **Lệnh:** `node --test src/shared/audit-actions.test.ts src/shared/lich-su-noi-bo.test.ts src/lich-su-don-khong-ten.test.ts src/lich-su-don-doi-tac.test.ts`; `npm run typecheck`.

### T3 — Lô ghi Từ chối (SQLite thật)
**Tệp:** `src/modules/dispatch/service.ts` (+ `refuseStatements`, `tuChoiThang`), `src/modules/dispatch/service.test.ts`.
- **Đỏ trước** (SQLite thật, khuôn bài hiện có của `service.test.ts`):
  - lô đóng đúng dòng của `party_id` người gọi, không mở dòng mới, đúng 1 dòng nhật ký với `detail` đúng khuôn T2;
  - người phụ trách đã đổi (party khác) → `tuChoiThang` = false, không dòng nào đổi, không nhật ký;
  - hai lô chạy nối tiếp (Từ chối của A, đổi người A→B) theo cả hai thứ tự → tối đa một dòng mở, đúng một bên thắng;
  - bài "khuôn cho ADR-0032" (mục 3b).
- **Mã:** dựng mảng hai câu như mục 3a; KHÔNG thêm SQL mới (dùng `closeHandlerStatement`); không đọc `audit_log`.
- **Lệnh:** `node --test src/modules/dispatch/service.test.ts`; `npm test` (bài kiến trúc: dispatch là module nghiêm).

### T4 — Ô `dispatch.refuse` + route + Bảng tin (MỘT commit)
**Tệp:** `src/shared/permissions.ts` (cạnh `:114-116`), `src/shared/permissions.test.ts`, `src/modules/dispatch/index.ts` (route mới), `src/modules/dispatch/tu-choi.test.ts` (harness mới, khuôn `nhan-don.test.ts` + `tests/audit/harness.mjs`), `src/shared/bang-tin.ts`, `src/shared/bang-tin.test.ts`, `src/shared/web-push.ts` (`:54-66`), `src/shared/web-push.test.ts` (nếu đếm), `src/bang-tin-guard.test.ts` (`:206-217`), `src/route-access.test.ts`, `src/shared/bang-su-kien-van-chuyen.ts` (`NGOAI_PHAM_VI_ROUTE` `:425-458`).
- **Ô:** `"dispatch.refuse": row("assigned", "none", "assigned", "assigned", "none", "any", "none", "none", "none", "none")` — chú thích: ADR-0030 điều 1; chỉ tự trả đơn của mình, chốt "đang phụ trách" ở route áp cả Toàn quyền; route `POST /api/orders/:id/handler-refuse`.
- **Route** `route("POST", "/api/orders/:id/handler-refuse", "orders", …)` ở module `dispatch`, thứ tự:
  1. `!can(staff, "dispatch.refuse", { assigned: true })` → **403** (sàng sớm, trước mọi đọc — khuôn `dispatch/index.ts:158`);
  2. id sai dạng → 404;
  3. đọc song song `findOrderOwner` + `findHandlerOf`; không có đơn → 404;
  4. (theo Q1, khuyến nghị) `order.status === "draft"` → **409** `order_not_confirmed` "Đơn chưa xác nhận — báo người lập đơn đổi người phụ trách.";
  5. `current?.staff_id !== staff.id` → **403** "Chỉ người đang phụ trách đơn mới trả được đơn này." — chú thích: NGOẠI LỆ có chủ ý so với `handler-money-edit` (`dispatch/index.ts:258-259`, Toàn quyền qua được ở đó), ADR-0030 điều 1;
  6. `order.status === "cancelled"` → **409** `cancelled`;
  7. `orderDelivered` → **409** `order_delivered` (dùng lại `DA_GIAO`, `:49`);
  8. `tuChoiQuaMuon(await findOrderDepartDates(…), vnToday(new Date()))` → **409** `too_late` "Đơn đi hôm nay hoặc ngày mai — không trả được nữa. Gọi văn phòng để đổi người.";
  9. `docLyDoTuChoi(await readJson(request))` lỗi → **400** `invalid_input`;
  10. `env.DB.batch(refuseStatements(…))`; lỗi trigger "order_delivered:" → 409 `order_delivered`; `!tuChoiThang(kq)` → **409** `stale` (dùng lại `STALE`, `:35`);
  11. `baoThayDoi({ orderId, thayDoi: "tu_choi", handlerTruoc: { coNguoi: true, staffId: staff.id } })` — chỉ nhánh thắng, đúng một lần, đứng sau return áp chót;
  12. `json({ ok: true } satisfies HandlerRefuseResponse)` (DTO mới ở `src/shared/contracts.ts`, không kèm dữ liệu đơn).
- **Bảng tin:** `THAY_DOI` thêm `"tu_choi"` (cuối mảng); `CAU_THONG_BAO.tu_choi = (maDon) => \`Đơn ${maDon} vừa được trả lại, đang chờ người nhận\``; `thongBaoNoi`: với `tu_choi`, `holdsPartner(staff)` → `null`, còn lại theo `duocThayTinDon(staff, false)` (Q-F (a): mọi người nhận tin nổi; ADR-0030 TC-6: lai không hiện). Web Push: `tu_choi: null` (không gõ cửa — theo Q4 (a)).
- **Bài đổi kỳ vọng cùng commit** (mục 5b).
- **Đỏ trước:** harness `tu-choi.test.ts` phủ TC-1…TC-5 ở mức route (đọc thẳng `dsp_assignment`, `audit_log`); `bang-tin.test.ts` phủ TC-7; `permissions.test.ts` bảng thêm dòng → đỏ khi chưa có ô.
- **Lệnh:** `node --test src/modules/dispatch/tu-choi.test.ts src/shared/permissions.test.ts src/shared/bang-tin.test.ts src/bang-tin-guard.test.ts src/route-access.test.ts src/permission-enforcement.test.ts src/route-write-guard.test.ts src/bang-su-kien-van-chuyen.test.ts`; rồi `npm test`, `npm run typecheck`.
- **Thấy chặn thật (ghi sổ hàng rào):** (1) bỏ bước 5 → ca "Toàn quyền không phụ trách → 403" đỏ; (2) xoá `baoThayDoi(` → `bang-tin-guard` đỏ nêu đúng route; (3) bỏ dòng ô khỏi `MATRIX` (giữ route) → typecheck/`permission-enforcement` đỏ; (4) bỏ mục `NGOAI_PHAM_VI_ROUTE` → bài (d) đỏ. Mỗi lần hoàn nguyên.

### T5 — Nhãn "được trả lại"
**Tệp:** `src/modules/audit/repository.ts` + `src/modules/audit/index.ts` (hàm công bố mới, gợi ý `donDuocTraLai(db, orderIds): Promise<Set<string>>` — đơn mà, trong các hành động `order_claimed`, `order_handler_changed`, `order_handler_refused`, dòng **mới nhất** là `order_handler_refused`; một tham số JSON `json_each` như `findHandlersOf`), test SQLite thật cạnh tệp; `src/modules/orders/pool.ts` + `pool.test.ts` + route `GET /api/orders/pool` (`orders/index.ts:889-894`) — `PoolOrderDto.traLai: boolean` (`contracts.ts:654-659`); `GET /api/dispatch/handlers` (`dispatch/index.ts:109-121`) thêm trường `traLai: string[]` vào `HandlersResponse` (`contracts.ts:795`, chỉ thêm — bản giao diện cũ bỏ qua); `src/shared/handler-view.ts` (+ hàm nhãn `nhanChoNhan(traLai)` → "Chờ nhận" / "Chờ nhận · được trả lại") + test.
- Cạnh `orders → audit` và `dispatch → audit` đã có (`src/architecture.test.ts` `ALLOWED_EDGES`: `dispatch` `:41`, `orders` `:54`) — không cạnh mới. Dispatch không đọc `audit_log` trực tiếp (chỉ gọi hàm công bố).
- Chỉ trả cờ, **không** tên, không lý do (ADR-0131).
- **Đỏ trước:** TC-8 ở hàm thuần + bài SQL (ba chuỗi sự kiện: nhận→từ chối = có; nhận→từ chối→nhận = không; đổi người = không).
- **Lệnh:** `node --test src/modules/audit/*.test.ts src/modules/orders/pool.test.ts src/shared/handler-view.test.ts`; `npm test`.

### T6 — Câu kiểm LC-8 (`R-DSP-4`)
**Tệp:** `scripts/audit-checks.mjs` (sau R-DSP-3 `:1510-1520`), `src/audit-invariants.test.ts`.
- **Đỏ trước** (SQLite thật): (a) đơn có dòng `HANDLE` đã đóng, không dòng mở, không `order_handler_refused` sau lần đóng cuối → 1; (b) có `order_handler_refused` cùng mốc lần đóng → 0; (c) đơn chưa từng có `HANDLE` → 0; (d) đơn đang có dòng mở → 0.
- **Mã:** `what` = "đơn từng có người phụ trách mà nay không có ai phải do chính người phụ trách Từ chối (LC-8 mới, ADR-0030 điều 1)"; mức `warn-unless-strict`, `note` "cảnh báo — nâng lên vi phạm chỉ sau khi chủ dự án chạy truy vấn chỉ đọc trên hệ thống thật (ADR-0030 Hệ quả)". **Bẫy:** `valid_to_at = max(at, valid_from_at)` (`dispatch/repository.ts:49`) có thể lớn hơn mốc nhật ký khi đồng hồ lệch — so mốc nhật ký với **`updated_at`** của dòng đóng cuối (= `at` đúng), không với `valid_to_at`.
- Bài "danh sách kiểm" (`src/audit-invariants.test.ts:111`) cập nhật mức.
- **Lệnh:** `node --test src/audit-invariants.test.ts`; sau T9: `node scripts/audit-invariants.mjs --db local --strict`.

### T7 — Giao diện (phụ thuộc Q5)
**Tệp:** `web/tu-choi-sheet.ts` (mới — bảng trượt dùng chung, khuôn `openCancelSheet` `web/viec-cua-toi.ts:237-315`: mỗi lý do một nút, nút xác nhận chỉ bật khi đã chọn, chữ "Xác nhận từ chối"), `web/viec-cua-toi.ts` (nút ở thẻ "Đơn của tôi" `:519`; chip "được trả lại" ở thẻ hàng chờ), `web/order.ts` (khối "Người phụ trách" `:407-430`: nút "Từ chối đơn" khi `handlerControls(...).refuse`; nhãn `nhanChoNhan`), `src/shared/handler-view.ts` (`MyJobActions.refuse`, `HandlerControls.refuse` dùng `can(staff, "dispatch.refuse", { assigned: handler.staffId === staff.id })` + `tuChoiQuaMuon` + trạng thái đơn + `deliveredAt`; `handlerFailure` thêm kiểu `"refuse"`: 409 `too_late` / `cancelled` / `order_not_confirmed` → giữ câu máy chủ, không tải lại; `stale`/403 → tải lại), `src/shared/handler-view.test.ts`, khối CSS (chỉ token, khối sau mốc PWA).
- **Đỏ trước:** `handler-view.test.ts` — `myJobActions({ status, departed, quaMuon })`/`handlerControls` cho từng ca TC-11; 1024 tập con quyền không ai ngoài người đang phụ trách thấy nút.
- Chữ: tránh từ đã loại ở `src/shared/bang-tu-giao-dien.ts` (bài `src/bang-tu-giao-dien.test.ts`); không lộ mã thô.
- **Lệnh:** `npm run build:web`; `node --test src/shared/handler-view.test.ts src/giao-dien-hoi-bang-quyen.test.ts src/bang-tu-giao-dien.test.ts`; Chrome: `hdv-viec-cua-toi-smoke.mjs` (thêm bước TC-11, hai tài khoản HDV, ≤ 5 giây) ở `docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/`, `v1-nguoi-phu-trach.mjs`, ba `a2-smoke-*.mjs` (`docs/evidence/2026-09-20-a2/kich-ban/`), `dot-c-smoke.mjs` nếu chạm bố cục trang Tôi; ảnh 390 + 1040 vào `docs/evidence/2026-10-20-tu-choi-don/`. Kịch bản: trang tài khoản nào mở sau cùng (chung kho cookie).

### T8 — Hướng dẫn trong Nền tảng
**Tệp:** `src/shared/huong-dan-hdv.ts` (`:125` thay bằng cách bấm [[Từ chối đơn]], khi nào không bấm được, đơn quay về Chờ nhận, chọn lý do), `src/shared/huong-dan-ban-hang.ts` (`:183` "HDV từ chối đơn: thẻ đơn về [[Chờ nhận]] kèm chữ được trả lại…"; thêm mục người phụ trách Bán hàng tự trả đơn), `src/shared/huong-dan-quan-tri.ts` (gần `:112`: đơn "được trả lại" → giao lại; người đi kèm chuyến không tự đổi), `src/shared/huong-dan.test.ts` (nếu cần thêm ca).
- **Đỏ trước:** bài mới "không còn câu 'chưa có nút trả đơn'"; A2 đỏ khi `[[Từ chối đơn]]` chưa có trong `web/`.
- **Lệnh:** `node --test src/shared/huong-dan.test.ts`.

### T9 — e2e
**Tệp:** `tests/e2e/dispatch.mjs` (khối Từ chối: TC-1…TC-6, đua 10 vòng như mục đua hiện có), `tests/e2e/bangtin.mjs` (sự kiện `tu_choi` tới HDV khác có nhãn `cho-nhan`, không tới tài khoản lai), `tests/e2e/permissions.mjs` (403 cho Kế toán/Thực tập/Đối tác nếu bảng ma trận ở đó liệt kê route).
- **Lệnh:** `npm run test:e2e -- dispatch bangtin permissions`, rồi đủ bộ `npm run test:e2e` (cần mạng; tắt `wrangler dev` mồ côi trước), `node scripts/audit-invariants.mjs --db local --strict`.

### T10 — Tài liệu, nhật ký thay đổi, sổ hàng rào
- `docs/SYSTEM-DESIGN.md`: §6 (luồng Từ chối, LC-8 mới), §7 (route mới; trường `traLai` của hai phản hồi), §8 (ô `dispatch.refuse`, chốt "đang phụ trách"), §16 (mở rộng dòng lệch 5.1 S20-5 thành đủ (a)(b)(c) của ADR-0030 điều 4).
- `docs/CHANGE-GUIDE.md`: công thức lô Từ chối (thứ tự câu, `tuChoiThang`, chỗ ADR-0032 chen câu đầu lô — mục 3); bẫy: ô `dispatch.refuse` = `assigned` nhưng route đòi đúng người phụ trách.
- `src/shared/changelog.ts`: mục mới, số = mục đầu trên `origin/main` lúc gộp + 1 (hôm nay 2.26 → 2.27, kiểm lại); lời thường, ví dụ: "Người đang lo một đơn (hướng dẫn viên, nhân viên bán hàng…) bấm «Từ chối đơn» để trả đơn — đơn quay về danh sách Chờ nhận. Phải chọn lý do. Không trả được khi đơn đi hôm nay hoặc ngày mai: gọi văn phòng."
- `docs/SO-HANG-RAO.md`: dòng cho chốt "đang phụ trách", hạn Q-E, lý do đóng, `R-DSP-4`, mục `bang-tin-guard` mới — mỗi dòng kèm ngày + đột biến + dòng đỏ.
- **Lệnh:** `node --test src/shared/changelog.test.ts`; `npm test`; `npm run typecheck`.

### T11 — Người kiểm độc lập (chỉ đọc) — bắt buộc
Giao `nguoi-kiem-doc-lap`: kiểm TC-1…TC-14; tự chạy `npm test`, `npm run typecheck`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local --strict`; đọc route từ đầu tới `baoThayDoi` (thứ tự 403 sàng → 404 → 409/403 → 409 → 400 → ghi), `refuseStatements`/`tuChoiThang`; kiểm không chữ người gõ nào vào nhật ký, `dispatch` không đọc `audit_log`, `grep -rn "v_dsp_" src/modules/orders` rỗng; tự làm ít nhất ba đột biến (bỏ chốt đang phụ trách, đổi mốc Q-E, xoá `baoThayDoi`); xem ảnh Chrome. Chỉ báo cáo. Chỉ báo "đạt" khi người kiểm nói ĐẠT **và** test xanh.

### T12 — Phát hành (chủ dự án tự chạy — AI chuẩn bị)
AI: chạy lại đủ lệnh, đưa nguyên lệnh `npm run day-len -- <nhánh>` và ghi "**cần** chạy `npm run trien-khai` sau đó" (không migration). Sau deploy: kiểm phiên bản bằng GET công khai; ghi `docs/HANDOFF-N1.md`; nhắc chủ: một HDV thật thử trả một đơn thử, thấy đơn quay lại Chờ nhận. Nếu chủ muốn phát hành chung với ADR-0032 thì giữ nhánh tới khi ADR-0032 xong (bản nháp ADR-0032 `:6` cho phép).

### 5b. Bài kiểm sẽ đổi kỳ vọng (đã grep trên e309acf3)

| Bài | Chỗ | Đổi gì |
|---|---|---|
| `src/shared/permissions.test.ts` | bảng `ADR` (cạnh `:49-51`) | thêm dòng `dispatch.refuse` 10 cột |
| `src/shared/permissions.test.ts` | `ADMIN_NONE_OPS` `:278-297`, chú thích `:267` | thêm `dispatch.refuse` (ô Quản trị = `assigned`; bài `:299-303` hỏi không ngữ cảnh → `false`) |
| `src/shared/permissions.test.ts` | tên bài `:121` | (đã có ADR-0030) — không đổi |
| `src/route-access.test.ts` | `SNAPSHOT` cạnh `:165-167`; tên bài `:500` "363 route"; chú thích đếm `:504-…` | thêm `{ method: "POST", path: "/api/orders/:id/handler-refuse", access: "orders" }`; 363 → **364** |
| `src/shared/bang-tin.test.ts` | `:24-25` | 11 → **12** giá trị, thêm `"tu_choi"` |
| `src/bang-tin-guard.test.ts` | `:206-217` (tên bài "8 route") | thêm tay `"POST /api/orders/:id/handler-refuse"`; 8 → 9 |
| `src/shared/web-push.ts` (+ `web-push.test.ts` nếu đếm) | `:54-66` | `tu_choi: null` (typecheck bắt) |
| `src/shared/bang-su-kien-van-chuyen.ts` (bài `src/bang-su-kien-van-chuyen.test.ts:240`) | `NGOAI_PHAM_VI_ROUTE` `:425-458` | thêm `"POST /api/orders/:id/handler-refuse": "trả đơn — không đổi khách / chặng; người phụ trách không ở trong chuyến"` |
| `src/shared/audit-actions.test.ts`, `src/shared/lich-su-noi-bo.test.ts`, `src/lich-su-don-khong-ten.test.ts`, `src/lich-su-don-doi-tac.test.ts` | danh sách xếp loại | thêm `order_handler_refused` (theo Q2) |
| `src/shared/handler-view.test.ts` | `:100-116` (`myJobActions`), `:24-53` (`handlerControls`) | thêm trường `refuse` |
| `src/modules/orders/pool.test.ts` | DTO phần hẹp (danh sách trường được phép) | thêm `traLai` |
| `src/audit-invariants.test.ts` | `:111` + ca mới | thêm `R-DSP-4` |
| `src/shared/huong-dan.test.ts` | A2 | nút mới phải có nguyên văn trong `web/` |
| `src/shared/changelog.test.ts` | mục mới | theo khuôn |
| **Phải xanh, không đổi kỳ vọng** | `src/permission-enforcement.test.ts`, `src/route-write-guard.test.ts`, `src/architecture.test.ts`, `src/giao-dien-hoi-bang-quyen.test.ts`, `src/bang-tu-giao-dien.test.ts`, `src/muc-hien-mo-duoc-1/2/3.test.ts` (không thêm mục điều hướng/trang mới), `src/modules/dispatch/nhan-don.test.ts`, `huy-don-khac.test.ts` | chạy lại xác nhận |
| e2e | `tests/e2e/dispatch.mjs`, `bangtin.mjs`, `permissions.mjs` | thêm ca (mục T9) |

---

## 6. Câu hỏi cho chủ dự án (gom một lần; mỗi câu một khuyến nghị)

> Viết lời thường để điều phối chuyển nguyên cho chủ. Không hỏi lại điều ADR-0030 đã chốt (ai được trả, hạn hôm nay/ngày mai, bốn lý do, không ô chữ, đơn về Chờ nhận, không đếm ở lượt này).

**Q1. Trả đơn chưa xác nhận (nháp).** Quyết định "nháp riêng tư" ngày 19/10 nói đơn nháp chỉ người lập được đụng vào, và hàng chờ chỉ có đơn đã xác nhận. Nút Từ chối nên:
- (a) **chỉ dùng cho đơn đã xác nhận**; đơn nháp thì người lập tự đổi người phụ trách — *khuyến nghị*: khớp quyết định 19/10, đơn trả về luôn vào được hàng chờ.
- (b) dùng cho cả nháp như văn bản 27/9 — đơn nháp bị trả sẽ "lơ lửng" vì không vào được hàng chờ.
- Cùng câu này, xin chủ xác nhận: việc "hướng dẫn viên huỷ được đơn chưa xác nhận" (duyệt 27/9) **coi như đã bị quyết định 19/10 thay**, không làm.

**Q2. Dòng nhật ký Từ chối ghi gì, ai đọc được.** Từ 18/10 chỉ Toàn quyền thấy *ai* đã làm gì; người khác chỉ thấy *đơn đã đổi gì*.
- (a) Dòng ghi **chỉ lý do** ("Bận lịch khác"); Bán hàng/Kế toán/Quản trị thấy dòng "Trả đơn (Từ chối): Bận lịch khác" ở Lịch sử đơn, không tên; Toàn quyền thấy cả tên — *khuyến nghị*.
- (b) Dòng ghi "tên người trả — lý do" như văn bản 27/9; người khác chỉ thấy "Trả đơn (Từ chối)", không thấy lý do.

**Q3. Dòng "đã từ chối lúc … — lý do" trong bảng chọn người khi văn phòng giao đơn.** Dòng này cho văn phòng biết *người nào* vừa từ chối — đúng loại thông tin mà quyết định 18/10 chỉ cho Toàn quyền.
- (a) **Hoãn sang lượt hạn mức Từ chối** (làm ngay sau), lấy từ sổ đếm lượt Từ chối (sổ nghiệp vụ, không phải nhật ký) — *khuyến nghị*: không làm hai lần, không đụng quyết định 18/10.
- (b) Làm ngay, chỉ Toàn quyền thấy.
- (c) Làm ngay cho mọi người giao được đơn — cần một quyết định mới làm ngoại lệ cho quy định 18/10.

**Q4. Báo "đơn vừa được trả lại" ở đâu.** Văn bản 27/9 chỉ có thông báo nổi khi Nền tảng đang mở.
- (a) **Lượt này chỉ thông báo nổi** (đúng văn bản 27/9, không đổi cơ sở dữ liệu) — *khuyến nghị*.
- (b) Thêm vào chuông thông báo và thông báo trên điện thoại: cần sửa cơ sở dữ liệu và một quyết định bổ sung cho hộp thông báo; làm sau nếu cần.

**Q5. Giao diện.** Chưa có bản vẽ của chủ cho nút Từ chối.
- (a) **Dùng lại đúng kiểu hộp "Huỷ đơn này" đang có** (bảng trượt từ dưới lên, mỗi lý do một nút, nút "Xác nhận từ chối"), ở thẻ đơn của hướng dẫn viên và ở khối "Người phụ trách" của trang đơn; chủ xem ảnh chụp điện thoại + máy tính trước khi phát hành — *khuyến nghị*.
- (b) Chờ bản vẽ của chủ rồi mới làm phần giao diện (phần máy chủ vẫn làm trước).

---

## 7. Rủi ro va chạm với nhánh khác

**Nhánh `origin/worktree-xac-nhan-don-2` (bước Xác nhận đơn; Đợt 1 đã trên `main`, Đợt 2–5 chưa làm — `docs/superpowers/plans/2026-10-19-xac-nhan-don-thi-cong-nhat-ky.md` trên nhánh đó).** Không chờ nhánh này; người thi công gộp `origin/main` trước khi trình kiểm. Va chạm dự kiến:

| Tệp | Nhánh xác nhận đơn định làm | Cách gộp |
|---|---|---|
| `src/modules/dispatch/index.ts` | Nhận đơn nháp → 409 `order_not_confirmed` (`PUT …/handler`, kế hoạch `:144`); "Việc của tôi" bỏ nháp với người không lập (ADR-0135 Đ5) | Dùng **cùng mã lỗi** `order_not_confirmed` cho Từ chối đơn nháp (Q1 (a)) để giao diện xử lý một kiểu. Route mới ở cuối mảng `routes` để giảm xung đột dòng. |
| `src/shared/bang-tin.ts`, `bang-tin.test.ts`, `src/shared/web-push.ts` | thêm loại `cho_xac_nhan` (kế hoạch `:217`) và nhãn `xet-duyet` | `THAY_DOI` hai bên cùng thêm vào **cuối** mảng → xung đột chắc chắn ở `bang-tin.ts:13` và bài đếm `bang-tin.test.ts:24-25`: gộp = cộng cả hai (12 hoặc 13 giá trị). Luật tin nháp chỉ người lập (ADR-0135 Đ6) không ảnh hưởng Từ chối nếu Q1 (a). |
| `src/shared/permissions.ts`, `permissions.test.ts` | ô mới `order.confirm.review` | Cộng cả hai dòng; `ADMIN_NONE_OPS` xem lại theo giá trị ô của họ. |
| `src/route-access.test.ts` | +3 route (gửi / rút / quyết định xác nhận) | Đếm route cộng cả hai phía (363 + 1 + 3). |
| `src/shared/audit-actions.ts`, `lich-su-noi-bo.ts`, `lich-su-doi-tac.ts` | thêm `order_confirm_requested`… | Cộng cả hai; hàng rào typecheck bắt nếu sót. |
| `src/shared/contracts.ts` | DTO xác nhận | Hai bên thêm kiểu khác nhau — xung đột văn bản, không xung đột nghĩa. |
| `src/modules/orders/repository.ts` (`listPoolSources` `:602-608`) | chỉ lấy `confirmed` (ADR-0135 Đ4) | T5 chỉ thêm cờ `traLai` ở `pool.ts`/route; không sửa câu SQL nguồn → tránh xung đột. |
| `src/modules/orders/index.ts` (`cancelOrderByHandler` `:542-550`) | gửi thư khi huỷ (ADR-0137) | Kế hoạch này không sửa hàm đó. ADR-0032 (sau) sẽ sửa → báo phiên ADR-0032. |
| `tests/e2e/dispatch.mjs`, `tests/e2e/lib.mjs` | Đợt 1 đã sửa dữ liệu gieo (gửi lựa chọn đón tường minh) — đã trên `main` | Đơn gieo ở khối Từ chối phải theo dữ liệu gieo mới (chọn Đón/Không đón) để xác nhận được. |
| `src/shared/huong-dan-*.ts`, `src/shared/changelog.ts`, `docs/SYSTEM-DESIGN.md` | chữ hướng dẫn trả trước, mục nhật ký thay đổi | Số phiên bản: lấy theo `origin/main` lúc gộp. |

**Phiên ADR-0032 (hạn mức):** bản nháp đã giả định đúng mục 3 (câu `REFUSE` đầu lô, `stale` như ADR-0030). Hai phiên dùng chung `dispatch/service.ts`, `dispatch/index.ts`, `permissions.ts` (ô `settings.ops`/`admin.manage` có sẵn — không ô mới). Mã lý do của `ly-do-tu-choi.ts` là hợp đồng chung — báo phiên ADR-0032 bốn mã ở T1.

---

## 8. Đếm quyết định / trang ghép

Lượt thi công này chỉ áp **D4** (đã duyệt 27/9, ADR-0030 điều 1 + điều 4) và phần Từ chối của **D5** (danh sách lý do). Trang ghép đã có ở ADR-0030 (`:313-353`); cập nhật hiện trạng cho dòng Từ chối:

| Bảng | Từ chối đổi gì | Ô quyền | Cổng / chốt | Giao diện ẩn/hiện |
|---|---|---|---|---|
| `dsp_assignment` (dispatch; chỉ dòng `HANDLE` hạt đơn) | đóng dòng của chính người gọi, không mở dòng mới | `dispatch.refuse` (mới) | cổng `orders` (nay có `FIELD`, `permissions.ts:380`) + sàng `can(dispatch.refuse, {assigned:true})` + đúng người phụ trách (cả Toàn quyền) + chưa huỷ + chưa giao + Q-E + (Q1) đã xác nhận + lý do; lưới dữ liệu: câu đóng theo `party_id`, chỉ mục duy nhất `0014:58-59`, trigger đã giao `0044:102-104`, câu kiểm `R-DSP-4` (phát hiện) | nút "Từ chối đơn" ở thẻ "Đơn của tôi" và khối "Người phụ trách" — hỏi `can(staff, "dispatch.refuse", {assigned})` |
| `audit_log` (audit) | thêm `order_handler_refused` (chỉ nhãn lý do theo Q2) | — (đọc qua `order.history.view` lớp rút gọn / `audit.view` lớp đủ — ADR-0131) | xếp loại hai lớp (typecheck) | Lịch sử đơn |
| Hàng chờ / trang đơn | đọc cờ "được trả lại" qua hàm công bố của `audit` | `order.pool.view`, `order.view` (không đổi) | không lộ tên, không lý do | chip "được trả lại" |

Câu hỏi Q2–Q4 nếu chủ chọn phương án khác khuyến nghị (Q2 (b), Q3 (b)/(c), Q4 (b)) là **quyết định mới chạm quyền/dữ liệu** → cần ADR riêng do chủ duyệt, không gộp vào kế hoạch này.
