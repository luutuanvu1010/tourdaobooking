# Hướng dẫn viên xem, nhận, Từ chối, Huỷ đơn — ADR-0030 lượt 1 + lượt 2 — Kế hoạch thi công

> **Cho người thi công (AI):** BẮT BUỘC dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans, làm lần lượt từng task. Các bước có ô `- [ ]`. Đây là **việc lớn** theo `CLAUDE.md` §3: đụng quyền (`src/shared/permissions.ts`), dữ liệu phân công (`dsp_assignment`), nhật ký chỉ-thêm, và đổi hợp đồng `orders`↔`dispatch`. Người thi công KHÔNG tự nghiệm thu. Mỗi lượt phát hành có một task riêng cho người kiểm độc lập chỉ đọc.

**Mục tiêu:**
- **Lượt 1 (R1 — D1, D2, D3):**
  - Hướng dẫn viên (HDV) thấy **đơn chờ nhận** ở dạng phần hẹp (không SĐT, không tiền, không lịch sử) và thấy **đơn mình đang phụ trách** (đủ thông tin, kể cả đơn chưa chốt).
  - HDV bấm **Nhận** được. Không ai Nhận được đơn đã huỷ hoặc đã qua ngày đi. Tài khoản lai (có quyền Đối tác) bị chặn ở bốn cửa.
  - Đơn mới **không tự gắn người lập**. Người lập (Bán hàng, Quản trị, Toàn quyền) chọn HDV ngay trong form, và việc chọn có hiệu lực ngay.
  - Bảng tin báo cho HDV về đơn chờ nhận mà không lộ đơn người khác.
  - Nhãn mới: "Chờ xác nhận" thay "Nháp"; "Chờ nhận" và "HDV: <tên>".
- **Lượt 2 (R2 — D4, D5, và phần S23-9 của D6):**
  - Người đang phụ trách **Từ chối** đơn của chính mình, đơn về hàng chờ (thay LC-8).
  - **Mọi lần Từ chối/Huỷ phải chọn lý do** trong danh sách đóng.
  - HDV **huỷ được đơn chưa chốt** mình phụ trách.
  - Lý do sửa số khách của HDV thành danh sách đóng (S23-9).

**Kiến trúc:**
- Không migration, không bảng, không cột (ADR-0030 Hệ quả "Dữ liệu").
- `orders` **không** đọc view `v_dsp_*` ở bất kỳ chỗ mới nào. Câu đếm "Chưa phụ trách" hiện có (`src/modules/orders/repository.ts:476-479`) được chuyển sang dùng hàm do gốc lắp ráp tiêm vào `ctx` (S20-13, T3a).
- Gốc lắp ráp (`src/index.ts`) tiêm thêm hai hàm tra cứu của `dispatch` vào `ctx`. Đường tiêm `defaultHandlerStatement` đổi dạng: nhận **người được chọn**, không mặc định người lập (Q-C).
- Route mới:
  - lượt 1: `GET /api/orders/pool` (hàng chờ nhận, module `orders`, cổng `orders`);
  - lượt 2: `POST /api/orders/:id/handler-refuse` (Từ chối, module `dispatch`, cổng `orders`).
- Ô quyền mới: `order.pool.view` (lượt 1), `dispatch.refuse` (lượt 2).
- Danh sách lý do là hằng trong mã, ở **một** tệp thuần `src/shared/` dùng chung máy chủ và giao diện.

**Công nghệ:** TypeScript, Cloudflare Worker + D1, `node --test` (Node 22 chạy `.ts` trực tiếp), esbuild, SQLite thật qua `node:sqlite` (khuôn `src/modules/dispatch/service.test.ts`, `src/modules/orders/dashboard.test.ts`, khung `tests/audit/harness.mjs`), e2e `tests/e2e/run.mjs`, kịch bản Chrome qua CDP.

**Quyết định gốc (nguồn chuẩn, KHÔNG sửa):**
- `docs/adr/ADR-0030-tu-choi-don-ly-do-huy-va-hdv-huy-don-chua-chot.md` — **accepted**, chủ dự án duyệt cả hai lượt trong phiên chat 2026-09-27. Hiện tệp chỉ nằm trên nhánh `worktree-agent-a9441c370e4ac49ff`, **chưa có trên `main`**; Task 0 bước 1 chặn điều này.
  - Lượt 1 (D1–D3): S20-2…5, 8, 9, 13 và S23-1…5, 8.
  - Lượt 2 (D4–D6): điều 1, điều 2, S23-9.
- Hai bản nháp mà ADR-0030 sửa: `docs/adr/ADR-0020-don-moi-cho-huong-dan-vien-nhan.md` và `docs/adr/ADR-0023-huong-dan-vien-thay-don-cho-nhan-va-sua-don-da-nhan.md` (trên `main` hôm nay vẫn **proposed**; xem Task 0 bước 2).
- Đặc tả `docs/superpowers/specs/2026-09-26-don-tu-do-hdv-nhan-tu-choi-design.md` (bản đã sửa theo mã 1.18, trên cùng nhánh ADR-0030).
- ADR-0019 (accepted, đã lên 1.18), ADR-0022 (accepted, 1.16), ADR-0027 điều 3 (mốc "đã qua ngày đi"), ADR-0029 (mẫu khai "lệch có chủ ý"), ADR-0033 (accepted, đã gộp `main` a74048e).

**Mốc mã:** mọi số dòng trong kế hoạch này đã đối chiếu với `main` **a74048e** (bản 1.19 đang chạy production, theo lời điều phối — AI chưa tự kiểm production). Số dòng trong ADR-0030 viết theo dc4b4f9; chỗ nào lệch, dùng số ở đây. Người thi công vẫn `grep` lại trước khi sửa.

**Nhánh thi công:** mỗi lượt một worktree mới từ `origin/main` mới nhất lúc bắt đầu lượt đó:
- `<nhánh-R1>`: Task 0 + lượt 1;
- `<nhánh-R2>`: lượt 2, chỉ tạo sau khi R1 đã lên production.

Tên nhánh do người thi công đặt theo lệnh chủ dự án. Không dùng nhánh kế hoạch này (`ke-hoach-tu-choi-huy-hdv`).

## Ràng buộc chung

- **Ngôn ngữ:** giao diện, thông báo lỗi, nhật ký, tài liệu, commit đều bằng **tiếng Việt có dấu**. Không lộ mã thô cho người dùng (`FIELD`, `cancelled`, `draft`, mã lý do…).
- **Cách kiểm quyền:**
  - Kiểm quyền là lời gọi `can(staff, "<ô>", …)` viết thẳng trong thân handler, chuỗi ô viết tường minh, kết quả dẫn tới `return` từ chối (hàng rào 2, `src/route-write-guard.test.ts`).
  - Không thêm tên vào `GUARDS` (thêm tên = nới hàng rào, cấm — Điều 9.4/N9).
  - Kiểm quyền đứng **trước** đọc thân yêu cầu và trước mọi câu ghi: 403 không đứng sau 400.
- **Ô quyền mới** vào `MATRIX` **cùng commit** với route hỏi nó (hàng rào 1, `src/permission-enforcement.test.ts`). Không thêm mục hoãn vào `docs/quyen-hoan.json`.
- **Ranh giới module:**
  - `orders` không import `dispatch`. Mọi thứ `orders` cần biết về phân công đi qua hàm tiêm vào `ctx` (ADR-0007 điều 4(b)).
  - `orders` **không** có SQL chứa `v_dsp_` (Task 1.2 dựng hàng rào cho điều này).
  - `src/shared/` và `web/` không import `src/modules/`.
- **Thứ tự câu trong lô:** `changes() > 0` luôn nói về câu **ngay trước** nó (`src/modules/dispatch/repository.ts:5-7`, `docs/CHANGE-GUIDE.md` công thức f). Câu chốt thắng/thua đứng đầu lô.
- **Nhật ký** không ghi SĐT/email/MST; chi tiết nhật ký chỉ ghi **nhãn lý do** lấy từ danh sách đóng, không bao giờ ghi chữ người dùng gõ.
- **Giao diện:**
  - Không `innerHTML`; dựng bằng `h()`; ô gõ 16px; giá trị CSS vào token (`web/CLAUDE.md`).
  - Sửa tệp giao diện nào thì chạy lại đúng kịch bản Chrome ghi ở bảng của `web/CLAUDE.md`, kèm ảnh.
  - **Bố cục và chữ của màn mới chờ bản thiết kế của chủ** (ADR-0030 Hệ quả "Giao diện"; bài học Đợt D). Không tự vẽ màn mới.
- **TDD:** mỗi hành vi mới có test **đỏ trước, xanh sau**; chép dòng đỏ vào nhật ký thi công.
- **Hàng rào mới:** mỗi cơ chế chặn mới phải **thấy chặn thật một lần** (sửa cố ý → đỏ → hoàn nguyên → xanh) và có dòng ở `docs/SO-HANG-RAO.md` (P16, luật sổ hàng rào). Dòng dự kiến: mục "Sổ hàng rào — dòng dự kiến".
- **Bài đỏ có chủ ý:** mỗi bài ở mục "Bài kiểm đổi kỳ vọng" chỉ đổi trong **đúng lượt** ghi ở đó, cùng commit với mã làm nó đổi. Chủ đã duyệt ADR-0030 nên các bài này là đảo có chủ đích. Bài nào đỏ mà không có trong bảng là **lỗi**: dừng, báo điều phối, không sửa cho xanh.
- **AI không** push, không merge `main`, không deploy, không chạy gì `--remote`.
  - Commit nhỏ: tiêu đề nói việc, thân nói vì sao.
  - Commit kết thúc bằng hai dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` và `Claude-Session: https://claude.ai/code/session_018o7rRhSKvk4H2Fs8S8yTzt` (hoặc dòng do môi trường của phiên thi công yêu cầu).
  - Shell của phiên chặn heredoc: commit bằng nhiều cờ `-m`.
- **Tệp luật** (`CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`, `.claude/`, ADR): người thi công **chỉ đề xuất** bằng commit riêng ghi rõ "ĐỀ XUẤT — chủ duyệt" (N9). Riêng Task 0 bước 2 do điều phối làm, theo lời duyệt đã có của chủ.

## Ngoài phạm vi (không làm trong kế hoạch này)

- **ADR-0023 điều 3, 5, 6, 7, 8** (HDV thêm/bớt dịch vụ, sửa cả đơn nháp, lịch sử "tăng/giảm so với bản đã xác nhận", nhãn "Đã sửa", thông báo nổi cho người lập + Kế toán). Chúng thuộc D6 nhưng cần kế hoạch riêng, có thể cần migration (ADR-0023 Hệ quả gạch 3). Kế hoạch này chỉ làm **S23-9** của D6: lý do sửa số khách thành danh sách đóng trên route `handler-money-edit` **hiện có**. Hệ quả: sửa số khách đơn nháp vẫn 409 sau R2 (`tests/e2e/dispatch.mjs:416-418` giữ nguyên). Đây là điểm cần điều phối xác nhận (mục "Điểm cần điều phối quyết").
- **ADR-0031** (quy tắc 6 giờ, Đơn bổ sung, ngày/giờ bắt buộc, tiền tố `ord_`) và **ADR-0032** (bộ đếm + hạn mức Từ chối, trang cài đặt). Cam kết duy nhất ở đây: lô Từ chối viết sao cho ADR-0032 chèn được câu `REFUSE` có điều kiện lên đầu lô (Task 2.4 bước 3).
- **T3b** (đăng ký tiền tố `ord_`, khoá danh sách bảng `legacy`): ADR-0030 không thêm bảng nào, nên T3b không bắt buộc ở đây. Đăng ký `ord_` là sửa ADR-0002 điều 2 (accepted) nên thuộc ADR-0031 (ADR-0030 điều 5). Task 0 bước 6 đặt luật DỪNG.
- **Nút "gỡ người phụ trách"** cho văn phòng (B2) — chủ: không.
- **Hạn nhận 15 phút, "đề nghị nhận", Web Push** — giai đoạn 5 mô hình vai.
- **Nâng câu kiểm LC-8 lên mức "vi phạm"**: cần chủ chạy một truy vấn chỉ đọc trên hệ thống thật trước. Kế hoạch này chỉ đặt mức cảnh báo.
- **Đối tác/Thực tập gọi `GET /api/dispatch/handlers` → 403** ("chưa tải được người phụ trách" — lỗi đã biết từ bản 1.15): không sửa ở đây. Task 1.6 chỉ mở cho người **đang phụ trách** mọi đơn được hỏi.

## Tiêu chí nghiệm thu (viết TRƯỚC khi làm — P20)

**Chung mọi lượt:**
- `npm test` xanh (mốc 945/945 ở a74048e);
- `npm run typecheck` 0 lỗi;
- `node --test "tests/audit/*.test.mjs"` xanh (KHÔNG nằm trong `npm test`);
- `npm run test:e2e` xanh (cần mạng);
- `node scripts/audit-invariants.mjs --db local` sau e2e: đạt;
- kịch bản Chrome của các tệp giao diện đã sửa: xanh, có ảnh;
- người kiểm độc lập chỉ đọc báo **ĐẠT**.

**Task 0 — điều kiện tiên quyết (T1d: khoá lạc quan câu huỷ):**
- T0-1. `cancelOrder` (`src/modules/orders/repository.ts:716-723`) chỉ ghi khi `status = <trạng thái đã đọc>` **và** `updated_at = <mốc đã đọc>`.
  - Bài SQLite thật gọi `cancelOrder` với mốc cũ, sau khi `updated_at` đã đổi (mô phỏng `PUT /trip` chen giữa) → trả `false`, đơn vẫn nguyên trạng thái, **không** có dòng nhật ký.
  - Bài đó **đỏ trên mã a74048e** (hôm nay trả `true`).
- T0-2. Hai đường dùng chung hàm đều có khoá, kiểm bằng khung harness hoặc e2e:
  - `POST /api/orders/:id/status` → 409 `invalid_transition` (RACED);
  - `POST /api/orders/:id/handler-cancel` → 409 `stale` (HANDLER_RACED).
- T0-3. Ba chú thích khẳng định nhầm "đã có khoá" nay nói đúng sự thật mới: `src/modules/dispatch/index.ts:159-163`, `src/modules/orders/index.ts:59-61`, `src/modules/orders/index.ts:85-89`.

**Lượt 1 (R1):**
- L1-1. **Chốt Nhận (S20-5, N-2).** "Nhận" = người gọi tự đặt mình khi đơn chưa có ai (cùng nghĩa `thayDoiCuaHandler` = `nhan`).
  - Nhận đơn **đã huỷ** → 409 "Đơn đã huỷ". Nhận đơn **đã qua ngày đi** (`tripDeparted`) → 409 "Tour đã qua ngày đi". Áp **mọi người**, kể cả Toàn quyền.
  - **Giao** cho người khác trên đơn đã huỷ vẫn 200.
  - Tài khoản lai (có `PARTNER` + quyền khác) Nhận → 403.
  - `checkAssignee` từ chối tài khoản lai → giao cho người đó → 400 `invalid_assignee`.
- L1-2. **Đơn mới (S20-2…4, ADR-0020 điều 1).**
  - Bán hàng, Quản trị, Toàn quyền, Thực tập, Đối tác lập đơn **không chọn HDV** → không có dòng `HANDLE` nào; nhật ký chỉ có `created`.
  - Bán hàng lập đơn **có chọn** HDV hợp lệ → **một lô**: đơn + một dòng `HANDLE` mở cho người được chọn + nhật ký `order_handler_changed` ("từ chưa có người phụ trách sang <tên>").
  - Chọn người không đủ điều kiện (`checkAssignee` sai, kể cả tài khoản lai) → 400 `invalid_assignee`, **không có đơn nào được tạo** (đếm `orders` trước/sau bằng nhau).
  - Thực tập hoặc Đối tác gửi kèm người được chọn → 403, không tạo đơn.
  - Bảng tin phát `tao` (gốc lắp ráp tự đổi thành `tao_cho_nhan` khi không có ai), không bao giờ phát `giao` cho đơn vừa lập.
- L1-3. **Tách ba đường (S23-1…4), e2e.**
  - (a) HDV A gọi `GET /api/orders` → 200, **chỉ** các đơn A đang phụ trách.
  - (b) `GET /api/orders/pool` → chỉ đơn không có dòng `HANDLE` mở, chưa huỷ, chưa qua ngày đi, ở dạng phần hẹp.
  - (c) A mở chi tiết đơn HDV B đang phụ trách, hoặc một đơn chờ nhận → **404** cả hai.
  - (d) A mở chi tiết đơn mình phụ trách → 200, kèm tiền, SĐT, lịch sử.
- L1-4. **Phần hẹp (S23-2).**
  - Mỗi đơn trong hàng chờ chỉ có các khoá thuộc danh sách trường được phép: mã đơn, ngày đi, tên dịch vụ, số khách, nơi đón, giờ đón. Kiểm bằng `Object.keys` so với danh sách chép tay trong test.
  - Không có tên/SĐT/email khách, tiền, ghi chú, lịch sử, id người lập.
  - Nơi đón "Đón ở 0905 123.456 cổng sau" → mọi dãy từ 8 chữ số trở lên (đếm sau khi bỏ dấu cách, chấm, gạch) bị che.
  - Test thuần: một đơn điền **đủ mọi trường** → không trường nào ngoài danh sách lọt ra.
- L1-5. **Ai thấy hàng chờ.** HDV, Toàn quyền → 200. Bán hàng, Kế toán, Quản trị, Đối tác, Thực tập → 403. Tài khoản lai HDV + Đối tác → 403.
- L1-6. **Nhận (e2e).** HDV Nhận đơn chờ nhận → 200, thành người phụ trách, đơn biến khỏi hàng chờ, hiện ở "Việc của tôi".
  - HDV Nhận đơn đã có người → 409 `stale`.
  - HDV **giao** cho người khác → 403.
  - Kế toán, Đối tác, Thực tập Nhận → 403.
  - **Đua:** hai HDV (hoặc HDV và Bán hàng) cùng Nhận một đơn → đúng một 200 + một 409, đúng một dòng `HANDLE` mở.
- L1-7. **"Việc của tôi" (S23-8).**
  - `GET /api/dispatch/mine` trả **cả đơn nháp** HDV đang phụ trách (vẫn không trả đơn đã huỷ).
  - Mỗi mục có trường trạng thái đơn.
  - Giao diện **không** hiện "Huỷ đơn này" và "Lưu số khách mới" với đơn nháp. Kiểm bằng hàm thuần ẩn/hiện nút và kịch bản Chrome.
- L1-8. **Trang khởi đầu (S23-4).** Tài khoản chỉ-HDV mở "/" → được chuyển sang `/orders` và thấy danh sách, không phải trang lỗi 403. Phát hành cùng lần với L1-3(a).
- L1-9. **Bảng tin (S20-8, S20-9, Q-M), hàm thuần + e2e `tests/e2e/bangtin.mjs`.**
  - HDV A **không nhận khung tin nào** về đơn HDV B đang phụ trách khi văn phòng xác nhận, sửa, sửa chuyến, đổi tiền, huỷ đơn đó.
  - **Ngoại lệ duy nhất:** đúng một tin lúc đơn **rời** hàng chờ (C vừa nhận hoặc vừa được giao) → đơn biến khỏi hàng chờ của A.
  - Đơn lập **kèm** HDV B: A không nhận tin nào.
  - Kết nối của tài khoản lai Đối tác + HDV không có nhãn `cho-nhan` và không hiện thông báo nổi về đơn chờ nhận.
  - Luật mới thay NT-3 là hàm thuần suy từ `MATRIX`, chạy trên cả 128 tập con quyền.
- L1-10. **Trang chủ (S20-13, M1 = A).**
  - Ô "Chưa phụ trách" đếm **cả đơn nháp lẫn đã xác nhận** chưa có người phụ trách đang mở (không đếm đơn huỷ); chữ phụ "Chờ người nhận".
  - `grep -n "v_dsp_" src/modules/orders/` → **không còn dòng nào** (có hàng rào máy, Task 1.2).
- L1-11. **Nhãn (điều 3, lượt 1 phần bề mặt).**
  - Đơn đã lưu chưa chốt hiện **"Chờ xác nhận"** ở mọi màn: huy hiệu trạng thái, bộ lọc `/orders`, ô Trang chủ. Không còn chữ "Nháp" nào.
  - Người phụ trách hiện **"HDV: <tên>"**; đơn chưa có ai hiện **"Chờ nhận"**.
  - Không lộ mã thô.
- L1-12. **Quyền và cổng (S23-1, S23-5, S20-6/12).**
  - `FIELD`: `order.view`, `money.view`, `order.history.view` = `assigned`; `contact.view` giữ `assigned`; `dispatch.claim` = `any`.
  - `order.pool.view` mới: `FIELD` `any`, `SUPER_ADMIN` `any`, còn lại `none`.
  - `ORDERS_GATE` có `FIELD`; `OFFICE_GATE` **không**.
  - Mọi ô của `PARTNER` không đổi (bài ghim nguyên dòng).
  - HDV gọi `GET /api/catalog/for-order` → 403 **ở thân** route (lời báo của `can(order.create)`); gọi `GET /api/catalog` → 403 ở cổng `office`.
- L1-13. **Không đổi:** e2e quyền hiện có của Thực tập, Đối tác, Kế toán vẫn xanh. Đối tác mở đơn người khác vẫn **403** (không phải 404).
- L1-14. **Lệch có chủ ý 5.1 của S20-5** có một dòng ở `docs/SYSTEM-DESIGN.md` §16, theo mẫu dòng ADR-0029, trỏ về ADR-0030 S20-5.

**Lượt 2 (R2):**
- L2-1. **Từ chối (e2e).**
  - Không lý do, hoặc lý do ngoài danh sách → 400.
  - Có lý do → 200. Đơn không còn dòng `HANDLE` mở. Có **đúng một** dòng `order_handler_refused`, chi tiết là tên người trả + nhãn lý do, không SĐT.
  - HDV (chỉ quyền `FIELD`) vừa trả mở chi tiết → 404, và thấy đơn ở hàng chờ dạng phần hẹp.
  - Bán hàng vừa trả mở chi tiết → 200.
- L2-2. **Ai được Từ chối.**
  - Toàn quyền **không** đang phụ trách → 403.
  - Bán hàng không phụ trách → 403.
  - Kế toán, Đối tác, Thực tập → 403.
  - Toàn quyền **đang** phụ trách → 200.
- L2-3. **Khi nào được Từ chối.**
  - Đơn đã huỷ → 409.
  - Ngày đi là hôm nay hoặc ngày mai (giờ VN) → 409 "Gọi văn phòng để đổi người". "Ngày đi" = ngày khởi hành lớn nhất; đơn cũ có ngày [hôm nay, ngày kia] → 200.
  - Đã qua ngày đi → 409.
  - Ngày đi là ngày kia → 200.
  - Đơn chưa có ngày đi nào → 200.
  - Luật ngày là hàm thuần nhận "hôm nay" làm tham số (đồng hồ tiêm được); e2e dùng ngày tương đối.
- L2-4. **Đua.**
  - Văn phòng đổi người đúng lúc HDV Từ chối → một bên thắng, bên kia 409 `stale`; không dòng nhật ký thừa; tối đa một dòng `HANDLE` mở.
  - HDV khác Nhận đúng lúc Từ chối → lệnh tới trước thắng.
- L2-5. **Chrome, hai tài khoản.** HDV A Từ chối → trong ≤ 5 giây đơn hiện ở hàng chờ của HDV B, kèm thông báo "Đơn TD-… vừa được trả lại, đang chờ người nhận".
- L2-6. **Bảng tin (hàm thuần).**
  - Sự kiện `tu_choi` gắn `cho-nhan` + `nguoi:<người trả>`.
  - `THAY_DOI` có 10 giá trị.
  - Tài khoản lai không hiện thông báo nổi `tu_choi`.
- L2-7. **Huỷ.**
  - `POST /api/orders/:id/status` → `cancelled` không lý do, hoặc lý do ngoài danh sách → 400. Lời báo có câu "hãy tải lại ứng dụng để chọn lý do huỷ".
  - Có lý do → chi tiết nhật ký `cancelled` là nhãn lý do đó.
  - Người không có quyền huỷ vẫn nhận **403** (không phải 400): `tests/e2e/orders.mjs:97,122` giữ nguyên.
  - HDV huỷ **đơn nháp** mình phụ trách với một trong hai lý do → 200, đơn `cancelled`, nhật ký `order_cancelled_by_field`.
  - HDV huỷ với lý do khác → 400. HDV huỷ đơn đã qua ngày đi → 409 (giữ).
  - Khoá lạc quan của T0 vẫn đúng cho đơn nháp.
- L2-8. **Lý do sửa số khách (S23-9).** `handler-money-edit` chỉ nhận mã lý do trong danh sách đóng ("Khách thêm người", "Khách bớt người", "Đổi dịch vụ", "Khác" — không ô chữ). Chữ tự do → 400. Nhật ký/dòng điều chỉnh ghi nhãn.
- L2-9. **Nhãn (điều 3, phần dựng từ nhật ký).**
  - Chi tiết đơn và màn HDV hiện "Chờ nhận · được trả lại" khi lần đóng gần nhất là Từ chối.
  - Đơn huỷ hiện "Đã huỷ · <lý do>"; HDV huỷ hiện "Đã huỷ · HDV huỷ: <lý do>".
  - Nhãn dựng theo **mã hành động** nhật ký, không phân tích chữ trong chi tiết.
  - Danh sách đơn văn phòng giữ "Đã huỷ" (xem Task 2.8).
- L2-10. **Bảng chọn người** hiện "đã từ chối lúc … — <lý do>" cạnh người vừa trả đơn đó. Dữ liệu đọc qua hàm công bố của module `audit`: `dispatch` không đọc thẳng `audit_log`.
- L2-11. **LC-8 (phát hiện, không chặn).**
  - Câu kiểm mới ở `scripts/audit-checks.mjs`: đơn từng có dòng `HANDLE`, nay không có dòng mở, thì phải có `order_handler_refused` sau lần đóng cuối.
  - Mức `warn-unless-strict`: cảnh báo trên hệ thống thật, đỏ khi `--strict`.
  - Xanh trên D1 local sau e2e, vì `dropHandler` của `tests/e2e/dispatch.mjs` đã được thay bằng thao tác thật.
- L2-12. **Hàng rào.**
  - `dispatch.refuse` vào `MATRIX` cùng commit với route hỏi nó; hàng rào 1 và 2 xanh.
  - Route Từ chối được **thêm tay** vào `expected` của `src/bang-tin-guard.test.ts:204-215`.
  - "Mọi đường ghi đơn phải báo" xanh.
- L2-13. **Lệch có chủ ý 5.1 của điều 4** mở rộng dòng §16 của L1-14: nêu đủ (a) LC-8 mới, (b) chặn Từ chối đơn đã huỷ + hạn Q-E, (c) lý do bắt buộc.

## Điểm dễ hỏng mà task chưa tự nhiên phủ (Review Focus)

1. **`GET /api/orders` nhánh lọc thứ ba** (`src/modules/orders/index.ts:185-205`, `ownerId` ở :189, hỏi tiền/liên hệ ở :192-193).
   - Hôm nay `can(staff, "order.view")` không ngữ cảnh sai ⇒ lọc "người lập = tôi". Với FIELD = `assigned`, không sửa thì HDV nhận **403**.
   - Nhánh mới lấy tập đơn HDV đang phụ trách qua `ctx`, rồi hỏi `money.view`/`contact.view` với `{ assigned: true }`.
   - Tài khoản ghép (vd FIELD + INTERN) thấy **hợp** hai tập "mình lập" và "mình phụ trách"; mỗi tập hỏi ô với đúng ngữ cảnh.
   - Người kiểm đọc lại từng nhánh. (Task 1.5)
2. **Chi tiết 404 hay 403.** 404 **chỉ** cho tài khoản mà mọi ô `order.view` của nó là `none` hoặc `assigned` (hôm nay: chỉ-FIELD). Đối tác và Thực tập mở đơn người khác vẫn **403** (e2e hiện có giữ nguyên, L1-13). (Task 1.5)
3. **Thứ tự khai route.** `GET /api/orders/pool` phải khai **trước** `GET /api/orders/:id`: router khớp theo vị trí đoạn, `:id` cũng khớp chữ "pool". Cùng khuôn với `GET /api/orders/dashboard` (`src/modules/orders/index.ts:170-176`). Test: `GET /api/orders/pool` của HDV không bao giờ trả 404 "Không tìm thấy đơn". (Task 1.5)
4. **`GET /api/dispatch/handlers` với HDV** (`src/modules/dispatch/index.ts:72-84` hỏi `can(order.view)` không ngữ cảnh) — **ruling điều phối: KHÔNG mở route này cho HDV**, vẫn 403 như hôm nay.
   - Sau S23, HDV nhận 403 ở `web/orders.ts:69`, `web/order.ts:75` và `web/confirmation-dialog.ts:44` → "chưa tải được người phụ trách". Ba nơi này với HDV không cần gọi route: chính người phụ trách chỉ cần thấy tên mình, đọc từ phiên đăng nhập ở giao diện (Task 1.6). Không thêm bề mặt route mới cho một nhu cầu nhỏ.
5. **Bảng tin lộ tin qua `handlerTruoc`.**
   - Chỉ route **thật sự biết** trạng thái trước mới truyền `handlerTruoc`: `PUT …/handler` hôm nay, route Từ chối ở lượt 2.
   - `POST /api/orders` **không** truyền `handlerTruoc`. Truyền "trước chưa ai" thì luật (b) của S20-8 sẽ gắn `cho-nhan` cho đơn lập kèm HDV, và mọi HDV thấy mã đơn đó.
   - Mặc định ở `src/index.ts:47` đổi thành **"không biết"**, và "không biết" không bao giờ sinh `cho-nhan`.
   - Người kiểm đột biến: đổi mặc định về "trước chưa ai" → bài thay NT-3 phải đỏ. (Task 1.4)
6. **Hàng rào Bảng tin với `POST /api/orders` dạng mới** (`src/bang-tin-guard.test.ts`, chú thích dòng 6-15).
   - `baoThayDoi(` vẫn đúng **một** lần, đứng giữa `return` áp chót và `return` cuối.
   - Callback truyền vào `createOrder` phải là arrow có khối `{}` hoặc biểu thức, mà bộ bóc đã hiểu. Khuôn `{` lạ làm hàng rào đỏ có chủ đích.
   - Thêm `return` 400/403 mới trước khi tạo đơn: được.
   - (Task 1.3)
7. **Tài khoản lai trong `handlerAccountEligible`** (`scripts/audit-checks.mjs:19-20`). Loại tài khoản lai khỏi câu này làm R-DSP-2a (`warn-unless-strict`) có thể cảnh báo trên hệ thống thật, nếu đang có tài khoản lai làm người phụ trách, và **đỏ** ở e2e `--strict` nếu kịch bản nào để tài khoản lai đứng tên. Người thi công rà `tests/e2e/*.mjs` tìm tài khoản `PARTNER` kèm quyền khác được giao phụ trách. (Task 1.1)
8. **Đơn chưa có người và ảnh xác nhận gửi khách.**
   - `web/confirmation-dialog.ts` dùng **tên người lập** khi không có người phụ trách (chú thích dòng 4).
   - Từ R1 mọi đơn lập không chọn HDV rơi vào nhánh này ngay lúc lập, nên biên nhận ghi tên người lập như "nhân viên phụ trách".
   - ADR-0020 điều 9 (chủ chọn A 25/9: ghi "Chưa có người phụ trách", lỗi thì bỏ dòng) **không nằm trong danh sách lượt 1** của ADR-0030. Kế hoạch **không tự làm**; điều phối quyết (mục "Điểm cần điều phối quyết").
9. **Lời báo 403 cũ nhắc "nhân viên bán hàng".** `FORBIDDEN` ở `src/modules/dispatch/index.ts:27-28` nói "…thì nhân viên bán hàng nhận cho chính mình được". Sau R1, HDV cũng nhận được: sửa chữ thành "…thì nhân viên bán hàng hoặc hướng dẫn viên nhận cho chính mình được". (Task 1.5)
10. **Đơn nháp HDV đang phụ trách.** HDV không xác nhận được (`order.modify` FIELD `none`), nên trang đơn không được hiện nút "Xác nhận" cho HDV (`canModify` = false). Người kiểm mở một đơn nháp HDV đang phụ trách bằng tài khoản HDV. (Task 1.8)
11. **Nhãn "HDV: <tên>" khi người phụ trách là Bán hàng.** ADR-0030 điều 3 ghi đúng chữ "HDV: <tên>" cho mọi người phụ trách. Kế hoạch áp nguyên văn và nêu một lần ở đây: một nhân viên Bán hàng đang lo đơn cũng hiện "HDV: <tên>". (Task 1.7)
12. **Ứng dụng cũ trong bộ nhớ đệm (PWA) sau R2.**
    - Bản cũ gọi `/status` huỷ không kèm lý do → 400; lời báo phải nói bằng lời thường "hãy tải lại ứng dụng để chọn lý do huỷ".
    - Bản cũ không biết loại `tu_choi`, nên bỏ qua (`laSuKienHopLe`, `src/shared/bang-tin.ts:113-125`). Không tự làm mới cho tới khi tải bản mới.
    - Cả hai ghi vào mục nhật ký thay đổi. (Task 2.2, 2.4, 2.12)
13. **Nhánh thất bại của `handler-cancel`** (`src/modules/dispatch/index.ts:175-178`): hôm nay đọc lại và so `status === "confirmed"`. Từ R2 đơn nháp huỷ được, nên nhánh này phải phân biệt "đã huỷ" (→ 409 `not_editable`) với "còn nháp/đã xác nhận nhưng thua khoá" (→ 409 `stale`). (Task 2.3)

## Bài kiểm đổi kỳ vọng theo lượt (đảo có chủ đích — không phải lỗi)

Mỗi dòng dưới đây **phải** đổi trong đúng lượt ghi ở cột 3, cùng commit với mã làm nó đổi. Dòng nào đổi ở lượt khác là dấu hiệu sai.

`tests/audit/*.test.mjs` **KHÔNG nằm trong `npm test`**: người thi công và **mọi người kiểm độc lập** phải tự chạy `node --test "tests/audit/*.test.mjs"`. Phần e2e và kịch bản Chrome dưới đây là **suy từ đọc mã a74048e, chưa chạy**.

| Tệp:dòng (mã `a74048e`) | Hôm nay khẳng định | Đổi ở | Kỳ vọng mới |
|---|---|---|---|
| `src/shared/permissions.test.ts:10-13`, `:21` (bảng `ADR`) | FIELD `order.view`/`money.view`/`order.history.view` = none; `dispatch.claim` FIELD = none | **R1** (Task 1.5) | `assigned` ×3; `dispatch.claim` FIELD `any`; thêm dòng `order.pool.view` |
| `src/shared/permissions.test.ts:40` (tên bài) | 26 thao tác | **R1** → 27; **R2** → 28 | đổi số trong tên bài |
| `src/shared/permissions.test.ts:72-79` (ADR-0014 điều 6/11: FIELD không xem đơn) | FIELD không xem | **R1** | xem được khi `assigned` |
| `src/shared/permissions.test.ts:81-89` (`canAccessOrders` FIELD) | `false` (:87) | **R1** | `true` |
| `src/shared/permissions.test.ts:114-126` | mọi ô × mọi ngữ cảnh | **R1**, **R2** | theo bảng mới |
| `src/shared/permissions.test.ts:147-156` (`dispatch.claim`: "ACCOUNTING và FIELD không") | FIELD không | **R1** | FIELD nhận được; ACCOUNTING vẫn không |
| `src/shared/permissions.test.ts:177-184` (`ADMIN_NONE_OPS`) | 4 thao tác ADMIN `none` | **R1**: thêm `order.pool.view` (quyết định "Quản trị không có ô này", S23-1); **R2**: `dispatch.refuse` ADMIN = `assigned` ⇒ bài hỏi `{ ownerId: "x" }` sẽ đỏ | R2: thêm danh sách riêng các thao tác ADMIN = `assigned` (hỏi với `{ assigned: true }`), không nhét vào `ADMIN_NONE_OPS` |
| `src/shared/permissions.test.ts:181` | FIELD `assigned` hỏi không ngữ cảnh → sai | — | **vẫn xanh** (không đổi) |
| `src/shared/cong-quyen.test.ts:8-12` (khoá `ORDERS_GATE`) | không có FIELD | **R1** | có FIELD, đúng thứ tự `PERMISSION_CODES` |
| `src/shared/cong-quyen.test.ts:27-35` (mọi mã qua cổng orders xem được giá đơn mình lập) | đúng với mọi mã | **R1** | thêm **ngoại lệ có tên** cho FIELD (`order.create` = none, không lập đơn) |
| `src/shared/cong-quyen.test.ts:37-47` ("phần B không đổi hành vi") | `canAccessOrders` mới = công thức cũ | **R1** | chỉ đổi đúng tổ hợp có FIELD mà không có mã nào khác của `ORDERS_GATE` cũ (liệt kê tường minh) |
| `src/modules/catalog/danh-muc-lap-don.test.ts:80-91` | chỉ-HDV → 403 ở **cổng** `orders` | **R1** | 403 ở **thân** (`can(order.create)`), lời báo đổi |
| `src/shared/bang-tin.test.ts:30-40` (128 tập con) | `cho-nhan` ⇔ `can(dispatch.claim)` | **R1** | ⇔ `can(dispatch.claim) && !holdsPartner` |
| `src/shared/bang-tin.test.ts:42-53` (ảnh chụp `nhanKetNoi`) | FIELD chỉ `nguoi:` | **R1** | FIELD có `cho-nhan` |
| `src/shared/bang-tin.test.ts:55-65` (**NT-3**) | mọi mã có `dispatch.claim` đều `order.view = any` | **R1** (Task 1.4 đỏ trước có chủ ý) | thay bằng luật S20-9 |
| `src/shared/bang-tin.test.ts:67-102` (`nhanSuKien`) | `handlerTruoc` luôn biết | **R1** | thêm "không biết"; luật (b) |
| `src/shared/bang-tin.test.ts:164-173` (`thongBaoNoi`) | HDV thấy `tao_cho_nhan` chỉ khi có `dispatch.claim` | **R1** | thêm ca tài khoản lai → `null` |
| `src/shared/bang-tin.test.ts:169-173` (liên kết thông báo nổi của HDV = `/account`) | `/account` | **R1** chỉ khi bản thiết kế đặt màn HDV ở chỗ khác (Task 1.8 bước 3) | liên kết theo thiết kế |
| `src/shared/bang-tin.test.ts:18-20` (`THAY_DOI` 9) | 9 giá trị | **R2** | 10 (`tu_choi`) |
| `src/modules/dispatch/rules.test.ts:79-86` (xếp nhóm được giao) | lai PARTNER+FIELD đủ điều kiện | **R1** | lai → không |
| `src/modules/dispatch/rules.test.ts:87-111` (`defaultHandlerPartyId`) | có đường tự gắn | **R1** | gỡ cùng hàm |
| `src/modules/dispatch/rules.test.ts:145-153`, `:169-185` (FIELD không nhận) | FIELD `forbidden` | **R1** | FIELD `allow` khi nhận cho chính mình |
| `src/shared/handler-view.test.ts:34-41` (ca `:40` `buttons(FIELD, null)`) | `[false, false]` | **R1** | `[false, true]` |
| `src/shared/handler-view.test.ts:54-57` (chữ) | "Phụ trách: <tên>", "Chưa có người phụ trách" | **R1** | "HDV: <tên>", "Chờ nhận" |
| `src/shared/router.test.ts:102-111` (cổng `orders`: chỉ-HDV không) | 403 | **R1** | qua cổng |
| `src/shared/router.test.ts` (đối tượng `injected` giả) | có `defaultHandlerStatement` | **R1** | hình dạng hook mới |
| `src/passkey-off.test.ts:59` (ngữ cảnh giả) | `defaultHandlerStatement: () => null` | **R1** | hook mới |
| `src/shared/start-page.test.ts:26-32` | chỉ-FIELD → `null` (banner lỗi); FIELD+PARTNER → `/orders` | **R1** | chỉ-FIELD → `/orders`; FIELD+PARTNER giữ `/orders` |
| `src/route-access.test.ts:176` (73 route) | 73 | **R1** → 74 (`GET /api/orders/pool`); **R2** → 75 (`POST …/handler-refuse`) | sửa `SNAPSHOT` cùng commit |
| `src/modules/orders/dashboard.test.ts:285-301` (`unassignedCount`) | chỉ đơn confirmed, qua `v_dsp_order_handler` | **R1** | cả nháp; tập đơn có người truyền vào từ ngoài (không view) |
| `src/modules/orders/repository.test.ts` (ca mới T0) | — | **Task 0** | đỏ trước → xanh |
| `src/bang-tin-guard.test.ts:204-215` (8 route) | 8 | **R2** | 9 — **thêm tay** `POST /api/orders/:id/handler-refuse` (không tự đỏ) |
| `tests/audit/redteam.test.mjs:73` (R3b `handlers[o.id].name === "An"`) | tự gắn người lập | **R1** | thêm bước Nhận sau khi lập, hoặc khẳng định `null` |
| `tests/audit/redteam.test.mjs:114` (R4, đúng 1 dòng mở) | tự gắn | **R1** | 0 lúc lập, hoặc Nhận trước khi đếm |
| `tests/audit/redteam.test.mjs:117-…` (R5, FIELD `GET /api/orders` → 403) | 403 | **R1** | 200 (chỉ đơn mình phụ trách); FIELD `/api/parties` giữ 403 |
| `tests/audit/doi-tac.test.mjs` (ca P4, FIELD `GET /api/orders*` → 403) | 403 | **R1** | danh sách 200; chi tiết đơn không phụ trách 404 |
| `tests/audit/redteam.test.mjs` (5 lời gọi `status: "cancelled"`) | huỷ không lý do | **R2** | kèm lý do |
| `tests/e2e/dispatch.mjs:55-76` (bước 1: người lập là người phụ trách) | có dòng `HANDLE` | **R1** | không có dòng nào; thêm ca lập kèm HDV |
| `tests/e2e/dispatch.mjs:51-52` + các lời gọi `dropHandler` (:200, :220, :223, :268…) | giả "chưa có người" bằng SQL | **R1**: thay bằng đơn mới (tự nhiên chưa có người); **R2**: lời gọi còn lại thay bằng Từ chối thật | không còn `dropHandler` sau R2 |
| `tests/e2e/dispatch.mjs:151-164` (FIELD nhận đơn đã có người → 403) | 403 | **R1** | 409 `stale` |
| `tests/e2e/dispatch.mjs:198-225` (mục 8 "SALES/ADMIN nhận") | FIELD không nhận | **R1** | thêm ca FIELD nhận 200 |
| `tests/e2e/dispatch.mjs:306-316` (HDV huỷ đơn nháp → 409) | 409 `not_editable` | **R2** | 200 |
| `tests/e2e/dispatch.mjs:416-418` (sửa số khách đơn nháp → 409) | 409 | — | **giữ nguyên** (D6 ngoài phạm vi) |
| `tests/e2e/dispatch.mjs:686-705` ("Việc của tôi" không có đơn nháp o10; khoá DTO đúng 5 trường ở :696) | loại nháp; 5 khoá | **R1** | có o10; 6 khoá (thêm trạng thái) |
| `tests/e2e/dispatch.mjs` (2 lời gọi `status: "cancelled"`) | không lý do | **R2** | kèm lý do |
| `tests/e2e/permissions.mjs:28-41` (`fieldDenied`) | FIELD 403 mọi bề mặt đơn | **R1** | `GET /api/orders` 200; `GET /api/orders/pool` 200; chi tiết đơn không phụ trách 404; hồ sơ/danh mục/quản trị/ghi đơn giữ 403 |
| `tests/e2e/permissions.mjs:89-91`, `:104` | FIELD không đổi người phụ trách | — | giữ (FIELD vẫn không **giao**) |
| `tests/e2e/orders.mjs:264` (FIELD mở đơn → 403) | 403 | **R1** | 404 |
| `tests/e2e/orders.mjs:97`, `:122` (người ngoài huỷ → 403) | 403 | — | **giữ 403** (403 đứng trước 400) |
| `tests/e2e/orders.mjs`, `booker.mjs`, `trip.mjs`, `permissions.mjs` (lời gọi `status: "cancelled"` thành công) | không lý do | **R2** | kèm lý do |
| `src/modules/orders/money-adjustment.test.ts` (lời gọi huỷ) | không lý do | **R2** nếu đi qua route | kèm lý do |
| `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs:44` | huy hiệu "Nháp" | **R1** | "Chờ xác nhận" |
| `docs/evidence/2026-09-20-a2/kich-ban/a2-evidence.mjs`, `a2-smoke-order.mjs`, `docs/evidence/2026-09-21-v1-0/kich-ban/v1-xac-nhan-png.mjs` (huỷ) | không lý do | **R2** | kèm lý do |
| `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs` | đơn mới có người phụ trách = người lập; chữ "Phụ trách:" | **R1** | "Chờ nhận"; "HDV: <tên>" |
| `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` (ô "Chưa phụ trách", ô "Đơn nháp") | chỉ đơn confirmed; chữ "Đơn nháp" | **R1** | đếm cả nháp; chữ mới |

## Thứ tự phát hành

| Lần | Gồm | Điều kiện trước | Migration |
|---|---|---|---|
| **R1** | **Task 0** (T1d + điều kiện) → **Lượt 1** (Task 1.1–1.9) → **Task 1.10** kiểm độc lập → **Task 1.11** phát hành | ADR-0030 + dòng mục lục + đặc tả đã sửa có trên `main`; ADR-0020/ADR-0023 đã ghi "accepted phần tương ứng" (Task 0 bước 1–2); bản thiết kế màn HDV + chọn HDV trong form của chủ (chỉ chặn Task 1.8) | không |
| **R2** | **Lượt 2** (Task 2.1–2.10) → **Task 2.11** kiểm độc lập → **Task 2.12** phát hành | R1 đã lên production; bản thiết kế hộp Từ chối + hộp Huỷ có lý do của chủ (chỉ chặn Task 2.9) | không |

- **Task 0 đi trong nhánh R1**, là các commit đầu tiên. Không phát hành riêng, để chủ chỉ gộp/đẩy/triển khai hai lần.
  - Khoá lạc quan cần có trước khi HDV Nhận được đơn: rủi ro "Nhận rồi huỷ" có từ lượt 1 (ADR-0030 Rủi ro P18).
  - ADR-0030 chỉ đòi khoá trước khi mở huỷ đơn chưa chốt, nên làm sớm hơn vẫn đúng ADR.
- Trong R1, **thứ tự task là thứ tự an toàn**:
  - chốt Nhận và chặn tài khoản lai (1.1) đứng **trước** khi mở `dispatch.claim` cho HDV (1.5);
  - Bảng tin (1.4) đứng trước 1.5, để HDV có nhãn `cho-nhan` với luật đã đúng.
- **R1 cần giao diện** (Task 1.8): không có màn hàng chờ thì HDV không bấm Nhận được, vì HDV mở chi tiết đơn chờ nhận nhận 404. Task 1.1–1.7 làm được trong lúc chờ bản thiết kế. **Không phát hành R1 thiếu Task 1.8.**
- **R2 không chung nhánh với R1.** Nhánh R2 tạo từ `origin/main` **sau khi** R1 lên production.

## Sơ đồ tệp

| Tệp | Việc | Task |
|---|---|---|
| `src/modules/orders/repository.ts` (`cancelOrder` :716-723), `repository.test.ts` | khoá `updated_at` | 0.1 |
| `src/modules/orders/index.ts` (chú thích :59-61, :85-89), `src/modules/dispatch/index.ts` (chú thích :159-163) | sửa chú thích sai | 0.1 |
| `src/modules/dispatch/index.ts` (`PUT /api/orders/:id/handler` :108-157, chú thích :122-123), `rules.ts` (`checkAssignee` :50-58), `rules.test.ts`, `scripts/audit-checks.mjs` (:15-20), `src/audit-invariants.test.ts` | chốt Nhận, chặn tài khoản lai | 1.1 |
| `src/modules/orders/repository.ts` (`getDashboard`, câu :476-479, kiểu :384-385), `dashboard.test.ts`, `src/shared/router.ts` (`Ctx`, `injected`), `src/index.ts`, `src/modules/dispatch/index.ts` (hàm công bố mới), `src/architecture.test.ts` (hàng rào "orders không chứa `v_dsp_`"), `web/home.ts:77` | S20-13, hook tra cứu | 1.2 |
| `src/modules/orders/index.ts` (`POST /api/orders` :207-231), `repository.ts` (`createOrder` :613-657), `src/modules/dispatch/index.ts` (`defaultHandlerStatement` :54-64 → dạng mới), `rules.ts` (`defaultHandlerPartyId` :60-71 — gỡ), `src/shared/router.ts`, `src/index.ts`, `src/shared/router.test.ts`, `src/passkey-off.test.ts:59`, `src/shared/contracts.ts` (thân lập đơn), `tests/e2e/dispatch.mjs`, `tests/audit/redteam.test.mjs`, `src/CLAUDE.md:15` (**chỉ đề xuất**) | đơn mới + chọn HDV lúc lập | 1.3 |
| `src/shared/bang-tin.ts` (`nhanKetNoi` :30-35, `nhanSuKien` :42-53, `thongBaoNoi` :100-108), `bang-tin.test.ts`, `src/index.ts:47`, `src/shared/router.ts` (kiểu `handlerTruoc`), `tests/e2e/bangtin.mjs` | S20-8, S20-9, Q-M | 1.4 |
| `src/shared/permissions.ts` (`MATRIX` :47-74, `ORDERS_GATE` :122, hàm mới "chỉ xem việc được giao"), `permissions.test.ts`, `cong-quyen.test.ts`, `src/modules/orders/index.ts` (`GET /api/orders` :185-205, `GET /api/orders/:id` :233-246, route mới `GET /api/orders/pool`), `src/modules/orders/pool.ts` (mới, thuần) + `pool.test.ts`, `src/modules/orders/repository.ts` (`listOrders` :347, câu ứng viên hàng chờ), `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/contracts.ts` (`PoolOrderDto`), `src/shared/start-page.ts`, `start-page.test.ts`, `src/shared/router.test.ts`, `src/route-access.test.ts`, `src/modules/catalog/danh-muc-lap-don.test.ts`, `src/modules/dispatch/index.ts:27-28` | quyền HDV, hàng chờ, ba đường | 1.5 |
| `src/modules/orders/index.ts` (`getMyAssignments` :134-166), `src/shared/contracts.ts` (`MyAssignmentDto` :432-438), `src/shared/handler-view.ts` (hàm ẩn/hiện nút "Việc của tôi"), `web/account.ts` (hiện tên chính mình, không gọi `handlers`) + test | "Việc của tôi" có nháp; không mở route `handlers` | 1.6 |
| `web/format.ts:23`, `public/orders.html:10`, `web/home.ts:77`, `src/shared/handler-view.ts` (:8, :10) + test, kịch bản Chrome | nhãn lượt 1 | 1.7 |
| `web/account.ts` (:339-460 "Việc của tôi"), `public/account.html` (nếu cần), `web/order-form.ts` (chọn HDV), `web/handler-sheet.ts` (tái dùng bảng chọn), `web/shell.ts` (điều hướng HDV), `public/app.css` (token), kịch bản Chrome mới `docs/evidence/2026-09-2x-tu-choi-huy-hdv/kich-ban/hdv-smoke.mjs` | giao diện lượt 1 (chờ thiết kế) | 1.8 |
| `tests/e2e/*.mjs`, `tests/e2e/lib.mjs` (thêm tài khoản HDV thứ hai), `tests/audit/*.test.mjs`, `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md` (§6–§8, §16), `docs/CHANGE-GUIDE.md`, `src/shared/changelog.ts`, nhật ký thi công | e2e, tài liệu lượt 1 | 1.9 |
| `src/shared/ly-do.ts` (mới, thuần) + `ly-do.test.ts`, `src/modules/dispatch/rules.ts` (`CANCEL_REASONS` :73-87 → dùng tệp chung) | danh sách lý do | 2.1 |
| `src/modules/orders/index.ts` (`POST …/status` :324-358), `repository.ts` (`cancelOrder` nhận `detail`), `web/order.ts` (:284, :336-343), form/hộp huỷ của Đối tác/Thực tập, e2e + kịch bản có huỷ | huỷ có lý do | 2.2 |
| `src/modules/orders/index.ts` (`cancelOrderByHandler` :90-92), `src/modules/dispatch/index.ts` (`handler-cancel` :164-181), `web/account.ts` | HDV huỷ đơn nháp | 2.3 |
| `src/shared/permissions.ts` (`dispatch.refuse`), `src/modules/dispatch/index.ts` (route Từ chối), `service.ts` (`refuseStatements`), `service.test.ts`, `src/shared/audit-actions.ts` (`order_handler_refused`), `src/shared/trip-rules.ts` (luật Q-E) + test, `src/shared/bang-tin.ts` (`tu_choi`), `src/bang-tin-guard.test.ts`, `src/route-access.test.ts` | Từ chối | 2.4 |
| `scripts/audit-checks.mjs` (câu LC-8), `src/audit-invariants.test.ts`, `tests/e2e/dispatch.mjs` (bỏ `dropHandler`) | LC-8 phát hiện | 2.5 |
| `src/modules/audit/index.ts` (hàm công bố đọc lần Từ chối gần nhất), `src/modules/dispatch/index.ts` (`GET /api/dispatch/assignees` :88-95), `src/shared/contracts.ts` (`AssigneeDto`), `web/handler-sheet.ts` | "đã từ chối lúc …" | 2.6 |
| `src/modules/orders/money-adjustment.ts` (:82-87), `money-adjustment.test.ts`, `web/account.ts` (:353 ô chữ lý do) | S23-9 | 2.7 |
| `web/order.ts`, màn HDV, `src/shared/handler-view.ts` (hàm nhãn từ mã hành động) + test | nhãn lượt 2 | 2.8 |
| `web/account.ts`, `web/order.ts`, kịch bản Chrome | giao diện lượt 2 (chờ thiết kế) | 2.9 |
| `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md` (§6–§8, §16), `docs/CHANGE-GUIDE.md` công thức f, `src/shared/changelog.ts`, nhật ký thi công | tài liệu lượt 2 | 2.10 |

---

### Task 0: Điều kiện trước + khoá lạc quan câu huỷ (T1d)

- [ ] **Bước 1 — ADR-0030 trên `main`.** Kiểm trên `origin/main`:
  - có `docs/adr/ADR-0030-tu-choi-don-ly-do-huy-va-hdv-huy-don-chua-chot.md` với dòng "Trạng thái: **accepted**";
  - có dòng 0030 ở `docs/adr/README.md`;
  - đặc tả `docs/superpowers/specs/2026-09-26-don-tu-do-hdv-nhan-tu-choi-design.md` là bản đã sửa (dòng 3 nhắc "ADR-0030 đã soạn").

  Hôm nay ba thứ này chỉ ở nhánh `worktree-agent-a9441c370e4ac49ff` (9 commit, eed5fd5). Thiếu thì **DỪNG toàn bộ**, báo điều phối để chủ gộp nhánh đó.
- [ ] **Bước 2 — ADR-0020/ADR-0023 ghi trạng thái** (ADR-0030 dòng 19, "Đã áp dụng nguyên tắc đã duyệt" điểm 2). Kiểm trên `origin/main`:
  - ADR-0020 và ADR-0023 đã chuyển "accepted phần tương ứng" theo lời duyệt 2026-09-27;
  - đã **chép nguyên** các dòng "nguyên văn → mới" của Mục S20 vào ADR-0020 và của Mục S23 vào ADR-0023;
  - dòng mục lục của hai ADR đã cập nhật.

  Việc này do **điều phối** làm trong một commit riêng (không thêm nội dung mới, chỉ trạng thái + chép dòng), vì đó là ghi lại quyết định của chủ, không phải việc của người thi công. Chưa có thì **DỪNG lượt 1** (bước 3–5 và Task 0.1 vẫn làm được).

  Phạm vi dòng trạng thái của ADR-0023 phần sửa (điều 3–8, D6) ghi theo quyết định của điều phối (mục "Điểm cần điều phối quyết", điểm 2).
- [ ] **Bước 3 — Worktree và mốc test.**
  - Worktree mới `<nhánh-R1>` từ `origin/main` mới nhất; `npm ci`; `npm test`; `npm run typecheck`; `node --test "tests/audit/*.test.mjs"`.
  - Ghi số test làm mốc vào nhật ký thi công (a74048e: 945/945).
  - Ca đo CPU của `src/claude-guard.test.ts` đỏ do máy bận: ghi `uptime`, chạy lại riêng tệp đó khi máy rảnh. Không sửa tệp đó.
- [ ] **Bước 4 — Nhánh chưa gộp chạm cùng tệp.**
  - Chạy `git branch -r --no-merged origin/main`.
  - Với từng nhánh: `git diff --stat origin/main...<nhánh> -- src/shared/permissions.ts src/shared/bang-tin.ts src/shared/router.ts src/index.ts src/modules/dispatch src/modules/orders web/account.ts web/order.ts web/order-form.ts`.
  - Ghi vào nhật ký để chủ biết thứ tự gộp. Không sửa nhánh khác.
- [ ] **Bước 5 — Nhật ký thi công.** Tạo `docs/superpowers/plans/2026-09-27-tu-choi-huy-hdv-thi-cong-nhat-ky.md` theo khuôn `docs/superpowers/plans/2026-09-25-gd2-thi-cong-nhat-ky.md`.
- [ ] **Bước 6 — T3b: không áp dụng, có luật DỪNG.**
  - ADR-0030 không thêm bảng hay cột nào (Hệ quả "Dữ liệu"). Không đăng ký tiền tố `ord_`: đó là sửa ADR-0002 điều 2, thuộc ADR-0031 (ADR-0030 điều 5).
  - **Luật DỪNG:** task nào phát hiện cần bảng, cột hoặc migration → dừng, báo điều phối. Việc đó phải đi qua ADR-0031 + T3b trước, không làm trong kế hoạch này.
  - Ghi dòng "T3b: không áp dụng — ADR-0030 không thêm bảng" vào nhật ký thi công.

### Task 0.1: Khoá lạc quan cho câu huỷ (T1d — sửa lỗi nền)

**Tệp:** `src/modules/orders/repository.ts` (`cancelOrder` :716-723), `src/modules/orders/repository.test.ts` (hoặc tệp SQLite thật cùng khuôn), `src/modules/orders/index.ts` (chú thích :59-61, :85-89), `src/modules/dispatch/index.ts` (chú thích :159-163).

- [ ] **Bước 1: Đỏ trước.** Bài SQLite thật (dựng schema từ `migrations/*.sql`, như `dashboard.test.ts`):
  - tạo một đơn `confirmed`, đọc `updated_at` = M1;
  - đổi `updated_at` thành M2 bằng câu `UPDATE` (mô phỏng `PUT /trip` chen giữa);
  - gọi `cancelOrder(db, id, staff, "confirmed", M1)`. Kỳ vọng: trả `false`, `status` vẫn `confirmed`, **0** dòng `audit_log` mới.
  - Thêm ca tương tự cho `action: "order_cancelled_by_field"`.

  Chạy → **đỏ** (hôm nay trả `true` và đơn bị huỷ). Chép dòng đỏ vào nhật ký.
- [ ] **Bước 2: Mã.** Câu UPDATE thêm `AND updated_at = ?` (bind `prevUpdatedAt`). Giữ `nextStamp(prevUpdatedAt)` và nhật ký `changes() > 0`. Không đổi chữ ký hàm ở task này.
- [ ] **Bước 3: Chú thích.** Sửa ba chỗ khẳng định nhầm (T0-3) cho khớp mã mới: nói rõ khoá theo `status` **và** `updated_at`.
- [ ] **Bước 4: Hai đường route.** Ca harness (`tests/audit/harness.mjs`) hoặc e2e cho T0-2 là tuỳ chọn, vì chen giữa đọc và ghi ở mức HTTP khó tái hiện ổn định. Tối thiểu: đọc lại hai route, xác nhận nhánh thất bại trả đúng mã (`/status` → RACED 409; `handler-cancel` → đọc lại `confirmed` → HANDLER_RACED 409). Ghi vào nhật ký.
- [ ] **Bước 5: Thấy chặn thật.** Bỏ tạm `AND updated_at = ?` → bài bước 1 đỏ → hoàn nguyên → xanh. Ghi vào nhật ký (dòng sổ hàng rào ghi ở Task 1.9).
- [ ] **Bước 6:** `npm test`, `npm run typecheck`, `npm run test:e2e -- orders dispatch trip`. Commit "Huỷ đơn: thêm khoá lạc quan updated_at vào câu huỷ (T1d, điều kiện tiên quyết của ADR-0030)".

---

## Lượt 1 (R1) — HDV xem, Nhận; đơn mới chờ nhận; chọn HDV lúc lập (D1–D3)

### Task 1.1: Chốt Nhận (N-2) và chặn tài khoản lai (S20-5)

**Tệp:** `src/modules/dispatch/index.ts` (route `PUT /api/orders/:id/handler` :108-157, chú thích :122-123), `src/modules/dispatch/rules.ts` (`checkAssignee` :50-58), `rules.test.ts`, `scripts/audit-checks.mjs` (`handlerAccountEligible` :15-20), `src/audit-invariants.test.ts`, khung harness hoặc `tests/e2e/dispatch.mjs`.

- [ ] **Bước 1: Đỏ trước.**
  - `rules.test.ts`: `checkAssignee` với tài khoản `["PARTNER","FIELD"]` và `["PARTNER","SALES"]` có hồ sơ, đang hoạt động → `ok: false`, lời báo tiếng Việt ("Tài khoản có quyền Đối tác không làm người phụ trách được."). Đỏ hôm nay: lai + FIELD đang qua nhánh cấp hẹp.
  - Harness (tệp mới `src/modules/dispatch/nhan-don.test.ts` trên `tests/audit/harness.mjs`, tài khoản như `src/modules/orders/xem-don-theo-quyen.test.ts`):
    - Bán hàng Nhận một đơn **đã huỷ** chưa có người → 409 (hôm nay 200);
    - Bán hàng Nhận đơn có ngày đi **hôm qua** (giờ VN) → 409;
    - Quản trị **giao** Bán hàng B cho đơn đã huỷ → 200 (giữ);
    - tài khoản lai SALES+PARTNER Nhận → 403.

  Chạy → đỏ.
- [ ] **Bước 2: Mã.**
  - `checkAssignee`: thêm `!holdsPartner(who)` (import từ `src/shared/permissions.ts`), đứng sau kiểm hồ sơ.
  - Route `PUT …/handler`, **sau** `handlerChangeVerdict` = `allow` và trước khi đọc tài khoản đích: nếu đây là "Nhận" (`current === null && input.staffId === staff.id`):
    - `holdsPartner(staff)` → 403;
    - `order.status === "cancelled"` → 409 `cancelled` "Đơn đã huỷ, không nhận được.";
    - `tripDeparted(await findOrderDepartDates(…), vnToday(new Date()))` → 409 `departed` "Tour đã qua ngày đi, không nhận được.".
  - Giao (đích ≠ người gọi, hoặc đơn đã có người) không đổi.
  - Sửa chú thích :122-123 ("CỐ Ý không xét trạng thái đơn") thành đúng luật mới + dẫn ADR-0030 S20-5 (lệch có chủ ý 5.1).
- [ ] **Bước 3: Kiểm dữ liệu.** `handlerAccountEligible` loại tài khoản đang có quyền `PARTNER` còn hiệu lực (khớp `checkAssignee` mới). `src/audit-invariants.test.ts` thêm ca: dòng `HANDLE` mở của tài khoản lai → R-DSP-2a đếm 1. Rà `tests/e2e/*.mjs` xem có kịch bản nào để tài khoản lai đứng tên người phụ trách không (Review Focus 7); có thì sửa kịch bản.
- [ ] **Bước 4: Xanh + thấy chặn thật.** `npm test`, `npm run typecheck`, `node --test "tests/audit/*.test.mjs"`.
  - Đột biến 1: bỏ dòng chặn đơn đã huỷ → ca "Nhận đơn đã huỷ" đỏ → hoàn nguyên.
  - Đột biến 2: bỏ `!holdsPartner` trong `checkAssignee` → ca lai đỏ → hoàn nguyên.
  - Ghi vào nhật ký.
- [ ] **Bước 5: Tài liệu lệch.** `docs/SYSTEM-DESIGN.md` §16 thêm một dòng theo mẫu dòng ADR-0029 (§16 dòng ~797): "Hiến chương 5.1 — chốt Nhận đơn đã huỷ/đã qua ngày đi chỉ ở mã máy chủ (không trigger); LỆCH CÓ CHỦ Ý — ADR-0030 S20-5; lưới dữ liệu còn: chỉ mục duy nhất một dòng mở mỗi đơn (`migrations/0014_dispatch.sql:58-59`); điều kiện gỡ lệch ở ADR-0030 điều 4". Đây là tài liệu mô tả, được sửa cùng mã.
- [ ] **Bước 6: Commit** "Chốt Nhận: không nhận đơn đã huỷ/đã qua ngày đi; tài khoản có quyền Đối tác không làm người phụ trách (ADR-0030 S20-5)".

### Task 1.2: Trang chủ đếm "Chưa phụ trách" không đọc view của dispatch (S20-13, T3a) + hàm tra cứu tiêm vào `ctx`

**Tệp:** `src/modules/dispatch/index.ts` (hàm công bố mới), `src/shared/router.ts` (`Ctx` :15-50, `AppOptions.injected` :117-130, dòng tiêm :180-189), `src/index.ts` (:30-51), `src/shared/router.test.ts` (đối tượng `injected` giả), `src/passkey-off.test.ts` (ngữ cảnh giả, nếu `Ctx` đổi), `src/modules/orders/repository.ts` (`getDashboard` :401, câu :476-479, kiểu `unassignedCount` :384-385), `src/modules/orders/index.ts` (route dashboard :177-183), `dashboard.test.ts` (:285-301), `src/architecture.test.ts`, `web/home.ts:77`.

**Phạm vi:**
- T3a là việc của gói "dọn nền" trong báo cáo rà cấu trúc 2026-09-27. **Chủ chưa duyệt riêng gói đó.**
- Task này chỉ làm đúng phạm vi S20-13, đã được duyệt cùng lượt 1: sửa **một** câu đếm hiện có ở `orders/repository.ts:476-479`, để không lặp lại lỗi `orders` đọc view của `dispatch`. Không dọn thêm chỗ nào khác của T3a.
- Bài kiến trúc mới "`orders` không chứa `v_dsp_`" là **siết** hàng rào của chính mình (được phép theo Điều 9.4). Nó không mở rộng phạm vi T3a: chỉ khoá lại kết quả của đúng câu đếm này.

**Thiết kế (đổi hợp đồng `orders`↔`dispatch`, ADR-0007 điều 4(b) — test đỏ trước):**
- `dispatch` công bố `ordersWithHandler(db, orderIds): Promise<Set<string>>`, dùng lại câu `HANDLERS_OF_ORDERS` (json_each). Không thêm SQL mới nếu không cần.
- `dispatch` công bố `handledOrderIdsOf(db, staffId): Promise<string[]>`, dùng lại `findHandledOrderIds`.
- Router tiêm hai hàm vào `ctx`: `ctx.ordersWithHandler(ids)` và `ctx.myHandledOrderIds()` (người gọi lấy từ phiên). Gốc lắp ráp nối vào `dispatch`.
- `getDashboard` **không** chạy câu đọc `v_dsp_order_handler` nữa, mà dùng một trong hai cách (người thi công chọn, ghi lý do vào commit):
  - (a) đọc id các đơn `status IN ('draft','confirmed')`, hỏi `ctx.ordersWithHandler(ids)`, lấy hiệu hai tập;
  - (b) nhận thẳng tập đơn đang có người (mảng id) làm tham số, rồi đếm bằng `NOT IN (SELECT value FROM json_each(?))`.
- **Giới hạn đã biết**, ghi vào chú thích và nhật ký: cả hai cách truyền một mảng id lớn dần theo số đơn (hôm nay vài trăm). Khi số đơn chưa huỷ vượt vài nghìn thì phải xem lại. Đo độ dài chuỗi JSON trên D1 local có 2 000 đơn giả nếu làm được; không đo được thì ghi "chưa đo".

- [ ] **Bước 1: Đỏ trước.**
  - `dashboard.test.ts`: ca mới "đơn **nháp** chưa có người được đếm; đơn huỷ không đếm; đơn nháp có người không đếm" → đỏ (hôm nay chỉ đếm confirmed). Ca cũ :285-301 đổi theo chữ ký mới.
  - `src/architecture.test.ts`: bài mới "không tệp nào trong `src/modules/orders/` chứa chuỗi `v_dsp_`" (sau khi che chú thích bằng `scripts/source-mask-lib.mjs`) → **đỏ** hôm nay vì `repository.ts:478`.
- [ ] **Bước 2: Mã.** Thêm hàm công bố, tiêm `ctx`, sửa `getDashboard` và route dashboard. Đổi chú thích `unassignedCount` (:384) và chú thích :476. `web/home.ts:77`: chữ phụ ô "Chưa phụ trách" thành "Chờ người nhận" (ADR-0020 M1 = A).
- [ ] **Bước 3: Xanh.** `npm test`, `npm run typecheck`. Sửa đối tượng `injected` giả ở `src/shared/router.test.ts` và ngữ cảnh giả ở `src/passkey-off.test.ts` nếu `Ctx` đổi.
- [ ] **Bước 4: Thấy chặn thật** (hàng rào mới). Chèn tạm một câu chứa `v_dsp_order_handler` vào `orders/repository.ts` → bài kiến trúc đỏ, nêu đúng tệp → hoàn nguyên → xanh.
- [ ] **Bước 5:** chạy kịch bản `trang-chu-smoke.mjs` (theo bảng `web/CLAUDE.md`), sửa kỳ vọng ô "Chưa phụ trách" nếu kịch bản đếm số. Commit "Trang chủ: 'Chưa phụ trách' đếm cả đơn nháp, lấy tập đơn có người qua dispatch — orders không đọc view v_dsp_ (ADR-0030 S20-13, ADR-0020 M1)".

### Task 1.3: Đơn mới không tự gắn người lập; chọn HDV ngay lúc lập (S20-2…4, ADR-0020 điều 1, Q-C)

**Tệp:** `src/modules/orders/index.ts` (`POST /api/orders` :207-231), `src/modules/orders/repository.ts` (`createOrder` :613-657 — tham số `alsoCreate` giữ nguyên), `src/modules/dispatch/index.ts` (`defaultHandlerStatement` :54-64 → hàm mới), `src/modules/dispatch/rules.ts` (`defaultHandlerPartyId` :60-71 — gỡ), `rules.test.ts` (:87-111 — gỡ ca tương ứng), `src/shared/router.ts`, `src/index.ts:32`, `src/shared/router.test.ts`, `src/passkey-off.test.ts:59`, `src/shared/contracts.ts` (thân lập đơn), `src/modules/orders/rules.ts` (`validateOrder` — nếu trường mới đi qua đây), `tests/e2e/dispatch.mjs`, `tests/audit/redteam.test.mjs`.

**Thiết kế:**
- Thân `POST /api/orders` có thêm trường tuỳ chọn `handlerStaffId` (UUID hoặc vắng/`null`). Form cũ trong bộ nhớ đệm không gửi trường này, nên đơn không có người phụ trách: không vỡ.
- Hook tiêm thay `defaultHandlerStatement`, gợi ý `ctx.newOrderHandler(staffId)` → `Promise<{ ok: true; statements: (orderId, at) => D1PreparedStatement[] } | { ok: false; message: string }>`.
  - `dispatch` đọc tài khoản (`getStaffAccount`) rồi chạy `checkAssignee`, đã có chặn lai từ Task 1.1.
  - Khi đạt, `statements` gồm: câu mở dòng `HANDLE` (`insertHandlerStatement`) và nhật ký `order_handler_changed` với chi tiết `describeHandlerChange(null, <tên>)`, `changes() > 0`.
  - Đổi **tên** hook là tuỳ người thi công. Nếu đổi tên, `src/CLAUDE.md:15` nhắc tên cũ ⇒ commit **riêng** "ĐỀ XUẤT — chủ duyệt: src/CLAUDE.md dòng 15 theo tên hook mới". Tiêu chí chấp nhận dòng cũ còn lại cho tới khi chủ duyệt.
- Thứ tự trong route:
  1. `can(order.create)` → 403.
  2. Nếu có `handlerStaffId`: `can(staff, "dispatch.assign", { ownerId: staff.id })` sai → 403, trước khi đọc thêm gì. Đây là G4: Thực tập, Đối tác không chọn được.
  3. `validateOrder`, `priceGuard`, `resolveBooker` như cũ.
  4. Nếu có `handlerStaffId`: gọi hook; `ok: false` → 400 `invalid_assignee`, **không** gọi `createOrder`.
  5. `createOrder(…, alsoCreate = hook.statements ?? () => [])`.
  6. `baoThayDoi({ orderId, thayDoi: "tao" })` **không** kèm `handlerTruoc` (Review Focus 5).

- [ ] **Bước 1: Đỏ trước.**
  - Harness (tệp mới `src/modules/orders/don-moi-chon-hdv.test.ts`):
    - Bán hàng, Quản trị, Toàn quyền, Thực tập, Đối tác lập đơn không chọn → `count(*) FROM dsp_assignment WHERE order_id = ?` = 0; nhật ký chỉ `created`. Đỏ với Bán hàng/Quản trị/Toàn quyền.
    - Bán hàng lập kèm HDV hợp lệ → đúng 1 dòng mở mang hồ sơ HDV, nhật ký `created` + `order_handler_changed`.
    - Kèm HDV đã ngưng, chưa có hồ sơ, hoặc tài khoản lai → 400, số đơn không đổi.
    - Thực tập kèm `handlerStaffId` → 403, số đơn không đổi.
  - `tests/e2e/dispatch.mjs` bước 1 (:55-76) đảo như bảng "Bài kiểm đổi kỳ vọng". Thêm ca lập kèm HDV. Các bước sau dựa vào "người lập là người phụ trách" thêm lời gọi Nhận/Giao tường minh ngay sau `newOrder`. Lời gọi `dropHandler` dùng để giả "đơn mới chưa có người" thay bằng đơn mới.
  - `tests/audit/redteam.test.mjs:73`, `:114`: sửa theo bảng.
- [ ] **Bước 2: Mã** theo thiết kế. Gỡ `defaultHandlerPartyId` cùng ca test riêng của nó. Sửa chú thích đầu `src/modules/dispatch/index.ts` (:1-7), `src/index.ts` (:2-3), `src/modules/orders/index.ts` (:216-217) và `repository.ts` (:609-610) cho đúng Q-C.
- [ ] **Bước 3: Xanh.** `npm test` (gồm `src/bang-tin-guard.test.ts` — Review Focus 6), `npm run typecheck`, `node --test "tests/audit/*.test.mjs"`, `npm run test:e2e -- dispatch orders bangtin`.
- [ ] **Bước 4: Thấy chặn thật.** Đổi tạm để hook "không đạt" vẫn gọi `createOrder` → ca "400, số đơn không đổi" đỏ → hoàn nguyên.
- [ ] **Bước 5: Commit** "Đơn mới không tự gắn người lập; người lập chọn HDV ngay trong lô tạo đơn (ADR-0030 S20-4, ADR-0020 điều 1)". Commit đề xuất `src/CLAUDE.md` (nếu đổi tên hook) tách riêng.

### Task 1.4: Bảng tin — nhãn `cho-nhan` cho HDV không lộ đơn người khác (S20-8, S20-9, Q-M)

**Tệp:** `src/shared/bang-tin.ts` (`nhanKetNoi` :30-35, `nhanSuKien` :42-53, `thongBaoNoi` :100-108), `bang-tin.test.ts`, `src/shared/router.ts` (kiểu `handlerTruoc` :48, :129), `src/index.ts:47`, `tests/e2e/bangtin.mjs`, `tests/e2e/lib.mjs` (tài khoản HDV thứ hai nếu chưa có — hôm nay chỉ có `field`, :19).

**Thiết kế:**
- `nhanKetNoi`: `cho-nhan` khi `can(staff, "dispatch.claim") && !holdsPartner(staff)`.
- `nhanSuKien`: `handlerTruoc` nhận thêm giá trị **"không biết"** (gợi ý: `null`). Gắn `cho-nhan` khi:
  - (a) `!handlerSau.coNguoi`; hoặc
  - (b) `handlerTruoc` **biết** và `!handlerTruoc.coNguoi`.

  "Không biết" không bao giờ sinh `cho-nhan`, và không thêm `nguoi:` cho người phụ trách trước.
- `src/index.ts:47`: mặc định `e.handlerTruoc ?? <không biết>` (thay `{ coNguoi: false, staffId: null }`).
- `thongBaoNoi`: tài khoản có quyền Đối tác không hiện `tao_cho_nhan` (lượt 2: cả `tu_choi`).
- **Luật thay NT-3 (S20-9)**, hàm thuần suy từ `MATRIX`, chạy trên 128 tập con quyền: với mọi kết nối **không** có `tat-ca`, và mọi sự kiện dựng bằng `nhanSuKien` từ mọi tổ hợp (người lập, trước ∈ {không biết, chưa ai, có người X, có người Y}, sau ∈ {chưa ai, có người X, có người Y}), kết nối đó nhận sự kiện qua nhãn `cho-nhan` **chỉ khi** đơn đang ở hàng chờ (sau = chưa ai) hoặc vừa rời hàng chờ (trước = chưa ai, **biết**). Không bao giờ nhận sự kiện "đơn đang có người khác phụ trách, trước không biết".

- [ ] **Bước 1: Đỏ trước.**
  - Viết bài thay NT-3 trước.
  - Chứng minh bài bắt được lỗi: đặt tạm `dispatch.claim` FIELD = `any` (bản sao, không commit) với `nhanSuKien`/mặc định **cũ** → bài mới **đỏ** (tin "xác nhận" về đơn HDV B lọt tới HDV A). Chép dòng đỏ, hoàn nguyên bản sao.
  - Bài cũ NT-3 (:55-65) gỡ **cùng commit** thay bằng bài mới. Ghi rõ trong commit: "đỏ có chủ ý, chủ đã duyệt S20-9".
  - Ca `nhanKetNoi` tài khoản lai; ca `thongBaoNoi` lai → `null`; ca "không biết".
- [ ] **Bước 2: Mã** theo thiết kế.
- [ ] **Bước 3: e2e `tests/e2e/bangtin.mjs`** (đặc tả §12 mục 3, L1-9). Chạy được đủ **sau** Task 1.5 (HDV mới có `cho-nhan`): viết ở đây, chạy lại ở Task 1.9. Cần hai tài khoản HDV: thêm vào `tests/e2e/lib.mjs` nếu chưa có.
- [ ] **Bước 4:** `npm test`, `npm run typecheck`. Thấy chặn thật: đổi tạm mặc định ở `src/index.ts:47` về "trước chưa ai", với bài thuần mô phỏng đúng đường đó → đỏ → hoàn nguyên.
- [ ] **Bước 5: Commit** "Bảng tin: hướng dẫn viên nhận tin đơn chờ nhận, không nhận tin đơn người khác; trạng thái trước mặc định 'không biết' (ADR-0030 S20-8, S20-9)".

### Task 1.5: Quyền HDV, hàng chờ nhận, ba đường xem (S23-1…5, S20-6, S20-12)

**Tệp:** xem sơ đồ tệp, dòng Task 1.5.

**Thiết kế:**
- **Ô:**
  - `FIELD`: `order.view` `none`→`assigned`, `money.view` `none`→`assigned`, `order.history.view` `none`→`assigned`; `contact.view` giữ `assigned`; `dispatch.claim` `none`→`any`; `dispatch.assign` giữ `none`.
  - Thao tác mới `order.pool.view` = `row("none","none","none","any","none","any","none")`, chú thích dẫn ADR-0030 S23-1 và ngoại lệ có tên của chú thích `contact.view` (:51).
  - `ORDERS_GATE` thêm `"FIELD"` (giữ thứ tự `PERMISSION_CODES`); `OFFICE_GATE` không đổi.
- **Hàm thuần mới** ở `permissions.ts`, gợi ý `seesOnlyAssignedOrders(who)`: mọi ô `order.view` của các quyền người đó ∈ {`none`, `assigned`} và có ít nhất một `assigned`. Có test trên 128 tập con.
- **`GET /api/orders/pool`** (module `orders`, cổng `orders`, khai **trước** `GET /api/orders/:id`):
  1. `if (!can(staff, "order.pool.view") || holdsPartner(staff)) return 403` — trước mọi đọc.
  2. Lấy ứng viên: đơn `status IN ('draft','confirmed')`, chưa qua ngày đi (theo `tripDeparted`; đơn chưa có ngày nào thì giữ).
  3. Bỏ đơn có người qua `ctx.ordersWithHandler(ids)`.
  4. Dựng phần hẹp bằng hàm thuần ở `src/modules/orders/pool.ts`: **danh sách trường được phép** (`PoolOrderDto`: `orderId`, `orderCode`, `departDate`, `services: [{ name, pax, pickupPlace, pickupTime }]`) + `maskLongDigits(text)` (che mọi dãy ≥ 8 chữ số, đếm sau khi bỏ dấu cách/chấm/gạch).
  - Cách che (thay chữ số bằng dấu gì) là bề mặt: người thi công chọn, ghi vào commit.
- **`GET /api/orders`** nhánh lọc thứ ba (Review Focus 1):
  - `can(staff, "order.view")` đúng → như cũ.
  - Sai mà `can(staff, "order.view", { assigned: true })` đúng → danh sách = đơn `ctx.myHandledOrderIds()` (hợp với "mình lập" nếu `can(order.view, { ownerId: staff.id })`). Hỏi `money.view`/`contact.view` với đúng ngữ cảnh từng phần, trước khi đọc tham số.
  - `listOrders` nhận thêm bộ lọc id (json_each). Còn lại như cũ.
- **`GET /api/orders/:id`:** `!can(order.view, scope)` → `seesOnlyAssignedOrders(staff) ? 404 : 403`.
- **`homeRedirect`** không cần sửa mã (`!seesAllOrders && canAccessOrders` tự đúng khi FIELD vào `ORDERS_GATE`). Chỉ sửa chú thích đầu tệp (:10-11) và test.
- `src/modules/dispatch/index.ts:27-28`: sửa lời báo (Review Focus 9).

- [ ] **Bước 1: Đỏ trước** — trong `src/modules/orders/xem-don-theo-quyen.test.ts` (harness) và `pool.test.ts` (thuần):
  - L1-3 (a)(b)(c)(d), L1-4, L1-5, L1-12 (FIELD `GET /api/catalog/for-order` → 403 thân; `GET /api/catalog` → 403 cổng `office`);
  - ghim nguyên dòng `PARTNER` của mọi thao tác;
  - Đối tác mở đơn người khác → 403 (không phải 404);
  - `GET /api/orders/pool` của HDV không bao giờ là 404 (Review Focus 3);
  - `pool.test.ts`: đơn đủ mọi trường → khoá đúng danh sách; nơi đón có SĐT dạng "0905 123.456", "+84-905-123-456" → bị che; dãy 7 chữ số giữ nguyên.

  Chạy → đỏ.
- [ ] **Bước 2: Mã, commit (a).** Thao tác `order.pool.view` + route `GET /api/orders/pool` + `pool.ts` + `PoolOrderDto` + câu ứng viên, **cùng commit** (hàng rào 1). FIELD chưa qua cổng `orders` ở commit này: chỉ Toàn quyền gọi được. `src/route-access.test.ts:176` → 74 route. Commit "Hàng chờ nhận: phần hẹp dựng từ danh sách trường được phép, che dãy số ở nơi đón (ADR-0030 S23-1, S23-2)".
- [ ] **Bước 3: Mã, commit (b)** — một commit, vì phải phát hành cùng nhau (S23-4):
  - bốn ô `FIELD` + `dispatch.claim` + `ORDERS_GATE`;
  - nhánh lọc thứ ba;
  - chi tiết 404;
  - `seesOnlyAssignedOrders`;
  - `start-page.test.ts`, `router.test.ts:102-111`, `cong-quyen.test.ts` (ba bài theo bảng, gồm ngoại lệ có tên cho FIELD ở :27-35), `permissions.test.ts` (theo bảng), `danh-muc-lap-don.test.ts:80-91`, `rules.test.ts` (FIELD nhận), `handler-view.test.ts:40`.
- [ ] **Bước 4: Xanh.** `npm test`, `npm run typecheck`, `node --test "tests/audit/*.test.mjs"` (R5, P4 sửa theo bảng).
- [ ] **Bước 5: Thấy chặn thật.**
  - Đột biến 1: `money.view` FIELD tạm `none` → HDV mở đơn mình phụ trách 403 và `cong-quyen.test.ts` đỏ → hoàn nguyên.
  - Đột biến 2: thêm `customerPhone` vào `PoolOrderDto` trong `pool.ts` → bài danh sách trường đỏ → hoàn nguyên.
  - Đột biến 3: bỏ `holdsPartner` ở route pool → ca lai đỏ → hoàn nguyên.
  - Ghi vào nhật ký.
- [ ] **Bước 6: Commit (b)** "Hướng dẫn viên: xem đơn mình phụ trách (đủ) và hàng chờ (phần hẹp), bấm Nhận; đơn khác 404 (ADR-0030 S23-1…5, S20-6, S20-12)".

### Task 1.6: "Việc của tôi" có đơn nháp; HDV thấy tên mình ở bề mặt, không mở route `handlers` (S23-8)

**Ruling điều phối (2026-09-27):** KHÔNG mở `GET /api/dispatch/handlers` cho HDV. Route đó vốn phục vụ bảng chọn người phụ trách (nhiều tên, nhiều đơn) của văn phòng; mở thêm một ngữ cảnh `assigned` chỉ để lấy đúng tên của chính mình là thêm một bề mặt route mới cho một nhu cầu nhỏ, trong khi HDV luôn đã biết mình là ai (không cần tra ngược). Cách an toàn hơn và ít việc hơn: giao diện tự hiện "HDV: <tên đăng nhập>" cho chính người xem, không gọi route nào thêm.

**Tệp:** `src/modules/orders/index.ts` (`getMyAssignments` :134-166), `src/shared/contracts.ts` (`MyAssignmentDto` :432-438), `src/shared/handler-view.ts` (hàm mới) + test, `web/account.ts` (khối "Việc của tôi"), `tests/e2e/dispatch.mjs:686-705`.

- [ ] **Bước 1: Đỏ trước.**
  - HDV nhận một đơn **nháp** → `GET /api/dispatch/mine` có đơn đó, trường trạng thái = nháp. Đơn đã huỷ vẫn không có.
  - Hàm thuần gợi ý `myJobActions({ status, departed })` → `{ cancel, editPax }`: nháp → `{ false, false }` ở lượt 1; đã xác nhận chưa qua ngày đi → `{ true, true }`; đã qua ngày đi → `{ false, true }` (giữ DK-T4-02).
- [ ] **Bước 2: Mã.**
  - `getMyAssignments`: lọc `status !== "cancelled"` thay cho `=== "confirmed"`; thêm trường trạng thái vào `MyAssignmentDto` (tên gợi ý `status`). Đổi hợp đồng `orders`↔`dispatch`: test đỏ trước.
  - Chú thích `MyAssignmentDto` và `getMyAssignments` (:126-133) sửa cho đúng: HDV nay xem tiền của đơn mình phụ trách ở chi tiết đơn; "Việc của tôi" vẫn không trả tiền (phạm vi route, không phải điều cấm).
  - `web/account.ts`: khối "Việc của tôi" hiện dòng "HDV: <tên của chính người đang xem>" lấy từ phiên đăng nhập (`staff.name`/hồ sơ hiện có), KHÔNG gọi `GET /api/dispatch/handlers`. Không đổi route đó, không đổi ô quyền nào.
- [ ] **Bước 3:** `tests/e2e/dispatch.mjs:686-705`: o10 (nháp) nay có trong danh sách; khoá DTO thêm trường trạng thái (:696). `npm test`, `npm run typecheck`, `npm run test:e2e -- dispatch`.
- [ ] **Bước 4: Commit** "Việc của tôi có cả đơn nháp kèm trạng thái; hiện tên chính mình ở bề mặt, không mở thêm route (ADR-0030 S23-8)".

### Task 1.7: Nhãn lượt 1 — "Chờ xác nhận", "Chờ nhận", "HDV: <tên>" (điều 3, Q-A2)

**Tệp:** `web/format.ts:23`, `public/orders.html:10`, `web/home.ts:77` (tiêu đề ô "Đơn nháp chưa xác nhận"/"Đơn nháp"), `src/shared/handler-view.ts` (`NO_HANDLER_TEXT` :8, `handlerText` :10), `handler-view.test.ts:54-57`, `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs:44`, `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs`, `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs`.

- [ ] **Bước 1: Đỏ trước.** `handler-view.test.ts`: "HDV: An", "Chờ nhận". Bài thuần mới: `STATUS_LABEL.draft === "Chờ xác nhận"`, cùng chữ `src/shared/order-confirmation.ts:72`.
  - Nếu `web/format.ts` không nạp được bằng `node --test`, chuyển `STATUS_LABEL` sang `src/shared/` (tệp thuần) và cho `web/` import.
  - Chạy → đỏ.
- [ ] **Bước 2: Mã.** Đổi chữ. Ô Trang chủ: tiêu đề chữ mới không còn "nháp" (gợi ý "Đơn chờ xác nhận"). Bộ lọc `/orders`: option `draft` hiện "Chờ xác nhận". `grep -rn "Nháp" web public src/shared` → không còn chữ hiện ra người dùng (chú thích mã không tính).
- [ ] **Bước 3:** `npm run build:web`; chạy lại `a2-smoke-order.mjs`, `v1-nguoi-phu-trach.mjs`, `trang-chu-smoke.mjs`, sửa kỳ vọng đúng các dòng ở bảng "Bài kiểm đổi kỳ vọng"; ảnh 390px + 1040px. Commit "Nhãn: 'Chờ xác nhận' thay 'Nháp'; người phụ trách hiện 'HDV: <tên>' / 'Chờ nhận' (ADR-0030 điều 3, Q-A2)".

### Task 1.8: Giao diện lượt 1 — màn HDV, chọn HDV trong form lập đơn (**chờ bản thiết kế của chủ**)

> **Điều kiện:** có bản thiết kế của chủ (Claude Design) cho (1) màn HDV gồm "Đơn chờ nhận" (phần hẹp, nút Nhận) và "Đơn của tôi" (có nút Huỷ, sửa số khách; ẩn hai nút với đơn nháp — S23-8), (2) chỗ chọn HDV trong form lập đơn. Chưa có thì **không** làm task này, và **không** phát hành R1. Làm đúng 100% bản thiết kế, không tự thêm.

**Tệp:** `web/account.ts` (khối "Việc của tôi" :339-460) hoặc trang mới theo thiết kế (trang mới thì làm theo `docs/CHANGE-GUIDE.md` công thức c: `PAGES`, `build:web`, `initShell`, `web/shell.ts`), `web/order-form.ts` (chọn HDV; gọi `GET /api/dispatch/assignees`, ẩn khi `!can(staff, "dispatch.assign", { ownerId: staff.id })`), `web/handler-sheet.ts` (tái dùng bảng chọn), `web/shell.ts` (:334 — điều hướng của HDV theo thiết kế), `public/app.css` (token nhóm "Riêng của Tour Đảo Booking").

- [ ] **Bước 1:** Màn HDV gọi `GET /api/orders/pool` và `GET /api/dispatch/mine`.
  - Nút Nhận gọi `PUT /api/orders/:id/handler { staffId: <mình> }`.
  - Thua đua (409 `stale`) → câu "Đơn vừa có người khác nhận" rồi tải lại (`handlerFailure` đã có).
  - Tự làm mới theo Bảng tin: loại `tao_cho_nhan`, `nhan`, `giao`, `huy`, `xac_nhan`, `sua`, `chuyen`.
  - Nút theo `myJobActions`; không hiện tiền trong "Việc của tôi".
- [ ] **Bước 2:** Form lập đơn gửi `handlerStaffId` khi đã chọn. Lỗi 400 `invalid_assignee` hiện đúng chữ máy chủ, không mất dữ liệu đã nhập.
- [ ] **Bước 3:** Trang đơn của HDV: không có nút "Xác nhận" với đơn nháp (Review Focus 10); không có nút "Chọn người phụ trách".
  - Thông báo nổi của HDV hôm nay dẫn tới `/account` (`src/shared/bang-tin.ts:107`, test `bang-tin.test.ts:169-173`). Nếu thiết kế đặt màn HDV ở chỗ khác, đổi liên kết và test đó trong task này (đảo có chủ đích).
- [ ] **Bước 4: Kịch bản Chrome** `docs/evidence/2026-09-2x-tu-choi-huy-hdv/kich-ban/hdv-smoke.mjs` (mới; ngày thật khi làm), 390px + 1040px, gồm:
  - (a) HDV mở "/" → sang `/orders`, thấy danh sách (L1-8);
  - (b) hàng chờ không có SĐT/tiền; nơi đón bị che;
  - (c) bấm Nhận → đơn sang "Đơn của tôi";
  - (d) đơn nháp trong "Đơn của tôi" không có nút Huỷ/Lưu số khách (S23-8);
  - (e) Bán hàng lập đơn kèm HDV → trang đơn hiện "HDV: <tên>";
  - (f) kiểm axe.

  Chạy lại các kịch bản ở bảng `web/CLAUDE.md` cho mọi tệp đã sửa (`dot-c-smoke.mjs`, `va3-smoke.mjs`, ba `a2-smoke-*.mjs`, `doi-tac-lap-don-smoke.mjs`, `v1-nguoi-phu-trach.mjs`). Nhớ: trang của tài khoản nào mở **sau cùng**.
- [ ] **Bước 5:** `npm run build:web`, `npm test`, `npm run typecheck`. Commit "Giao diện hướng dẫn viên: hàng chờ nhận + đơn của tôi; chọn HDV khi lập đơn (theo bản thiết kế của chủ)".

### Task 1.9: e2e, audit, tài liệu, sổ hàng rào (lượt 1)

- [ ] **Bước 1: e2e.**
  - Sửa `tests/e2e/permissions.mjs:28-41`, `orders.mjs:264`, `dispatch.mjs` theo bảng.
  - Thêm khối "hướng dẫn viên nhận đơn" (L1-6, gồm đua hai HDV) và "tách ba đường" (L1-3).
  - Chạy `tests/e2e/bangtin.mjs` của Task 1.4.
  - Chạy `npm run test:e2e` đủ bộ, rồi `node scripts/audit-invariants.mjs --db local`.
- [ ] **Bước 2: `docs/SO-HANG-RAO.md`** — thêm các dòng lượt 1 ở mục "Sổ hàng rào — dòng dự kiến", mỗi dòng có ngày + đột biến + dòng đỏ đã quan sát. Bổ sung dòng T1d của Task 0.1.
- [ ] **Bước 3: Tài liệu mô tả** (thua mã, sửa cùng lượt):
  - `docs/SYSTEM-DESIGN.md` §6 (luồng lập đơn: không tự gắn; chọn HDV lúc lập; Nhận có chốt), §7 (route `GET /api/orders/pool`; thân `POST /api/orders` có `handlerStaffId`; `GET /api/dispatch/handlers` cho người phụ trách), §8 (ô `FIELD`, `order.pool.view`, `ORDERS_GATE` có `FIELD`), §16 (dòng Task 1.1 bước 5);
  - `docs/CHANGE-GUIDE.md`: bẫy "đơn mới không có người phụ trách"; bẫy "orders không đọc v_dsp_ — dùng hook ctx".
- [ ] **Bước 4: Nhật ký thay đổi** (`src/shared/changelog.ts`, một mục mới đầu tệp). Số phiên bản = số ở mục đầu **trên `origin/main` lúc đó** + 1 phần sau dấu chấm (a74048e là 1.19 → dự kiến 1.20, kiểm lại). Lời thường, ví dụ: "Đơn mới chưa có người phụ trách — hướng dẫn viên thấy đơn chờ nhận (không có số điện thoại, không có tiền) và bấm Nhận. Khi lập đơn, bạn chọn được hướng dẫn viên ngay. Đơn đã lưu mà chưa chốt nay ghi 'Chờ xác nhận' thay cho 'Nháp'. Người đang lo đơn hiện 'HDV: <tên>'."
- [ ] **Bước 5:** `npm test`, `npm run typecheck`, `node --test "tests/audit/*.test.mjs"`, `npm run test:e2e`. Commit "Tài liệu, sổ hàng rào, nhật ký thay đổi cho lượt 1 ADR-0030".

### Task 1.10: Người kiểm độc lập lượt 1 (chỉ đọc) — bắt buộc

- [ ] **Bước 1:** Gọi subagent `nguoi-kiem-doc-lap` với yêu cầu sau:

  > Kiểm Task 0, 0.1 và lượt 1 của `docs/superpowers/plans/2026-09-27-tu-choi-huy-hdv-thi-cong.md` trên nhánh `<nhánh-R1>`, theo tiêu chí T0-1…T0-3, L1-1…L1-14 và "Chung".
  >
  > **Tự chạy:** `npm test`, `npm run typecheck`, `node --test "tests/audit/*.test.mjs"`, `npm run test:e2e` (nếu có mạng), `node scripts/audit-invariants.mjs --db local`.
  >
  > **Đọc thân handler:**
  > - `GET /api/orders` (ba nhánh lọc);
  > - `GET /api/orders/:id` (404/403);
  > - `GET /api/orders/pool` (vị trí khai trước `:id`, danh sách trường, che số);
  > - `POST /api/orders` từ đầu tới `db.batch`;
  > - `PUT /api/orders/:id/handler` (chốt Nhận);
  > - `GET /api/dispatch/mine` (`GET /api/dispatch/handlers` KHÔNG đổi — ruling điều phối, xem Task 1.6).
  >
  > **Đọc từng dòng `MATRIX` đã đổi:** đúng cột `FIELD`, dòng `PARTNER` nguyên vẹn, `ORDERS_GATE`/`OFFICE_GATE`.
  >
  > **Xác nhận:** `grep -rn "v_dsp_" src/modules/orders` rỗng; `cancelOrder` có `updated_at`.
  >
  > **Tự làm ít nhất ba đột biến**, xác nhận đỏ rồi hoàn nguyên: một ô bảng, `handlerTruoc` mặc định về "chưa ai", thêm trường vào phần hẹp.
  >
  > **Đối chiếu bảng "Bài kiểm đổi kỳ vọng":** đúng các dòng R1 đã đổi, không dòng nào khác.
  >
  > **Xem ảnh** kịch bản Chrome.
  >
  > Chỉ báo cáo, không sửa.
- [ ] **Bước 2:** Có phát hiện Critical/Important → người thi công sửa, gọi lại người kiểm. Ghi mọi vòng vào nhật ký thi công.
- [ ] **Bước 3:** Chỉ báo "đạt" khi báo cáo của người kiểm nói ĐẠT **và** test xanh.

### Task 1.11: Phát hành R1 (chủ dự án tự chạy — AI chuẩn bị)

- [ ] **Bước 1 (AI):** Theo `docs/QUY-TRINH-PHAT-HANH.md`:
  - chạy `npm test`, `npm run typecheck`, `npm run test:e2e`;
  - báo tên nhánh;
  - đưa chủ lệnh `npm run day-len -- <nhánh-R1>` kèm dòng "**cần** chạy `npm run trien-khai` sau đó (đổi app)".
- [ ] **Bước 2 (chủ dự án):** `npm run day-len -- <nhánh-R1>`, rồi `npm run trien-khai`. **Không có migration.**
- [ ] **Bước 3 (AI, sau khi chủ báo đã deploy):**
  - kiểm bằng GET công khai (số phiên bản ở trang đăng nhập);
  - ghi trạng thái vào `docs/HANDOFF-N1.md`;
  - nhắc chủ: một HDV thật đăng nhập trên iPhone, mở hàng chờ, bấm Nhận một đơn thử; một nhân viên Bán hàng lập đơn kèm HDV.
  - **Từ lúc này HDV đọc được SĐT/tiền của đơn mình nhận** (cửa một chiều, chủ đã nghe trong ADR-0030; không nhắc lại).

---

## Lượt 2 (R2) — Từ chối, lý do bắt buộc, HDV huỷ đơn chưa chốt (D4, D5, S23-9)

> Chỉ bắt đầu khi R1 **đã lên production** (Task 1.11 bước 3 xong). Worktree mới `<nhánh-R2>` từ `origin/main` mới nhất; lặp lại Task 0 bước 3–5 (mốc test mới, nhánh chạm cùng tệp, nhật ký dùng chung tệp của lượt 1 với mục mới).

### Task 2.1: Danh sách lý do dùng chung (điều 2, Q-H, S23-9)

**Tệp:** `src/shared/ly-do.ts` (mới, thuần, import kèm đuôi `.ts`), `src/shared/ly-do.test.ts`, `src/modules/dispatch/rules.ts` (`CANCEL_REASONS`, `CANCEL_REASON_LABEL`, `parseCancelReason` :73-87), `rules.test.ts:113-127`, `web/account.ts:341-345` (bản chép tay `CANCEL_REASONS`).

- [ ] **Bước 1: Đỏ trước.** Bốn danh sách đóng, mỗi mục một mã + nhãn tiếng Việt **đúng nguyên văn** ADR-0030 điều 2 và S23-9:
  - **Từ chối:** "Bận lịch khác", "Ốm / việc riêng", "Không phù hợp tuyến/dịch vụ", "Khác".
  - **Huỷ qua `/status`:** "Khách đổi ý", "Khách đặt trùng", "Sai thông tin — lập lại đơn", "Khác".
  - **HDV huỷ:** giữ đúng hai lý do và **đúng hai mã** hiện có (`not_reachable`, `customer_requested`), để app cũ vẫn chạy.
  - **Sửa số khách:** "Khách thêm người", "Khách bớt người", "Đổi dịch vụ", "Khác".

  Hàm `parse…Reason(body)` cho từng danh sách:
  - thiếu, sai kiểu, chữ tự do, mã lạ → lỗi kèm lời báo liệt kê các lựa chọn;
  - không danh sách nào có ô chữ.
- [ ] **Bước 2: Mã.** `dispatch/rules.ts` dùng lại hằng HDV huỷ từ tệp chung (không chép). `web/account.ts` import từ `../src/shared/ly-do` (không đuôi), bỏ bản chép tay.
- [ ] **Bước 3:** `npm test`, `npm run typecheck`. Commit "Danh sách lý do đóng dùng chung cho Từ chối, Huỷ, HDV huỷ, sửa số khách (ADR-0030 điều 2, S23-9)".

### Task 2.2: Huỷ qua `/status` bắt buộc lý do (điều 2)

**Tệp:** `src/modules/orders/index.ts` (`POST /api/orders/:id/status` :324-358), `src/modules/orders/repository.ts` (`cancelOrder` — `detail` đã có trong `opts`), `web/order.ts` (:284, `change()` :336-343), chỗ huỷ ở form/trang của Đối tác và Thực tập (nếu có, grep `"cancelled"` trong `web/`), mọi lời gọi `status: "cancelled"` ở `tests/e2e/orders.mjs`, `booker.mjs`, `trip.mjs`, `permissions.mjs`, `dispatch.mjs`, `tests/audit/redteam.test.mjs`, `src/modules/orders/money-adjustment.test.ts`, `docs/evidence/2026-09-20-a2/kich-ban/a2-evidence.mjs`, `a2-smoke-order.mjs`, `docs/evidence/2026-09-21-v1-0/kich-ban/v1-xac-nhan-png.mjs`.

- [ ] **Bước 1: Đỏ trước** (harness hoặc e2e):
  - Bán hàng huỷ đơn mình không `reason` → 400, lời báo có câu "hãy tải lại ứng dụng để chọn lý do huỷ";
  - `reason` lạ → 400;
  - `reason` hợp lệ → 200, nhật ký `cancelled` có chi tiết = nhãn;
  - Đối tác, Thực tập huỷ đơn của mình có lý do → 200;
  - người không có quyền (Bán hàng khác) huỷ không lý do → **403** (không phải 400).

  Chạy → đỏ.
- [ ] **Bước 2: Mã.** Thứ tự: 404 → 403 (`can(order.modify)`) → 409 (`canTransition`) → **400 lý do** (chỉ khi `to === "cancelled"`) → ghi. Truyền `{ detail: <nhãn> }` vào `cancelOrder`. Không đổi nhánh `confirmed`.
- [ ] **Bước 3:** Sửa mọi lời gọi huỷ ở tệp liệt kê trên (thêm `reason`). Grep lại `status: "cancelled"` trên toàn repo, không sót.
- [ ] **Bước 4 (chờ thiết kế — Task 2.9):** hộp huỷ có lý do + hỏi lại "không thể hoàn tác" ở `web/order.ts` và chỗ huỷ của Đối tác/Thực tập.
- [ ] **Bước 5:** `npm test`, `npm run typecheck`, `node --test "tests/audit/*.test.mjs"`, `npm run test:e2e`. Thấy chặn thật: bỏ dòng kiểm lý do → ca 400 đỏ → hoàn nguyên. Commit "Huỷ đơn qua /status phải chọn lý do; nhật ký ghi nhãn lý do (ADR-0030 điều 2)".

### Task 2.3: HDV huỷ đơn chưa chốt mình phụ trách (điều 2, Q-G)

**Tệp:** `src/modules/orders/index.ts` (`cancelOrderByHandler` :85-92), `src/modules/dispatch/index.ts` (`handler-cancel` :159-181, `NOT_CONFIRMED` :34), `tests/e2e/dispatch.mjs:302-352`, `src/shared/handler-view.ts` (`myJobActions`) + test.

- [ ] **Bước 1: Đỏ trước.**
  - HDV huỷ đơn **nháp** mình phụ trách với lý do đóng → 200, `status = cancelled`, nhật ký `order_cancelled_by_field` (hôm nay 409).
  - HDV huỷ đơn nháp đã qua ngày đi → 409 `departed`.
  - Đơn đã huỷ → 409 `not_editable`.
  - Khoá lạc quan với đơn nháp (khuôn Task 0.1, mức hàm) → `false`.
  - `myJobActions({ status: "draft", departed: false })` → `cancel: true` (editPax vẫn `false`, D6 ngoài phạm vi).
- [ ] **Bước 2: Mã (đổi hợp đồng `orders`↔`dispatch`, ADR-0007 điều 4(b) — cùng commit, test đỏ trước).**
  - `cancelOrderByHandler(db, id, staffId, from: "draft" | "confirmed", prevUpdatedAt, reasonLabel)`.
  - Route bỏ 409 "chưa xác nhận" (:170), chỉ chặn `status === "cancelled"`, giữ chặn đã qua ngày đi (:171).
  - Nhánh thất bại (:175-178) theo Review Focus 13.
  - Sửa chú thích :159-163 và `NOT_CONFIRMED` (đổi tên/chữ cho khớp: "Đơn đã huỷ, không huỷ lại được.").
  - Ô `order.cancel` không đổi.
- [ ] **Bước 3:** `tests/e2e/dispatch.mjs:306-316` đảo theo bảng (409 → 200). `npm test`, `npm run typecheck`, `npm run test:e2e -- dispatch`. Commit "Hướng dẫn viên huỷ được đơn chưa chốt mình phụ trách, giữ hai lý do (ADR-0030 điều 2, Q-G)".

### Task 2.4: Từ chối (điều 1, D4) — ô `dispatch.refuse` + route + Bảng tin

**Tệp:** `src/shared/permissions.ts`, `permissions.test.ts`, `src/modules/dispatch/index.ts` (route mới), `src/modules/dispatch/service.ts` (`refuseStatements`), `service.test.ts`, `src/shared/audit-actions.ts` (`order_handler_refused`, nhãn "Trả đơn (Từ chối)"), `src/shared/trip-rules.ts` (luật Q-E) + test, `src/shared/bang-tin.ts` (`THAY_DOI`, `CAU_THONG_BAO`, `thongBaoNoi`), `bang-tin.test.ts`, `src/bang-tin-guard.test.ts:204-215`, `src/route-access.test.ts:176`, harness `src/modules/dispatch/tu-choi.test.ts` (mới).

**Thiết kế:**
- **Ô:** `"dispatch.refuse": row("assigned","none","assigned","assigned","none","any","none")`, chú thích dẫn ADR-0030 điều 1: chỉ tự trả đơn của mình, kể cả Toàn quyền.
- **Route** `POST /api/orders/:id/handler-refuse` (module `dispatch`, cổng `orders`). Thứ tự:
  1. UUID sai → 404.
  2. Đọc `findOrderOwner` + `findHandlerOf`; không có đơn → 404.
  3. `assigned = current?.staff_id === staff.id`.
  4. `if (!assigned || !can(staff, "dispatch.refuse", { assigned })) return 403` — chốt "đang phụ trách" áp cả Toàn quyền. Đây là ngoại lệ có chủ ý so với `handler-money-edit` (:196); ghi trong chú thích.
  5. `order.status === "cancelled"` → 409 `cancelled`.
  6. Luật Q-E `refuseWindowClosed(departDates, vnToday(new Date()))` (ngày khởi hành lớn nhất tồn tại và ≤ ngày mai) → 409 `too_late` "Gọi văn phòng để đổi người."
  7. Lý do (Task 2.1) sai → 400.
  8. Lô `refuseStatements`.
  9. Thua → 409 `stale`.
  10. `baoThayDoi({ orderId, thayDoi: "tu_choi", handlerTruoc: { coNguoi: true, staffId: staff.id } })`.
  11. `json({ ok: true })`.
- **Lô** `refuseStatements(db, { orderId, partyId: current.party_id, actorId, at, detail })` ở `service.ts`:
  - [câu **đóng** dòng `HANDLE` theo `party_id` của người gọi (`closeHandlerStatement`, khuôn `CLOSE_HANDLER` :46-51) — câu chốt, **không** mở dòng mới; nhật ký `order_handler_refused` với `changes() > 0`];
  - chi tiết = `<tên người trả> — <nhãn lý do>`.
  - **Cam kết cho ADR-0032:** câu đóng là câu chốt đứng độc lập, không phụ thuộc câu nào trước nó. Một câu chèn `REFUSE` có điều kiện đặt lên đầu lô sau này chỉ cần thêm `WHERE changes() > 0` vào câu đóng. Viết bài `service.test.ts` minh hoạ chuỗi đó bằng một câu đầu giả, chỉ trong test, và ghi chú "khuôn cho ADR-0032".
- **Bảng tin:**
  - `THAY_DOI` thêm `tu_choi` (10 giá trị);
  - `CAU_THONG_BAO.tu_choi = "Đơn ${maDon} vừa được trả lại, đang chờ người nhận"`;
  - `thongBaoNoi`: tài khoản có quyền Đối tác không hiện `tu_choi`;
  - HDV hiện nổi (Q-F (a)).
- `src/bang-tin-guard.test.ts`: **thêm tay** `"POST /api/orders/:id/handler-refuse"` vào `expected` (L2-12) — không tự đỏ.
- `src/route-access.test.ts:176` → 75 route.

- [ ] **Bước 1: Đỏ trước.**
  - `trip-rules.test.ts`: `refuseWindowClosed` với các ca L2-3 (tham số "hôm nay" cố định).
  - `service.test.ts` (SQLite thật):
    - lô Từ chối đóng đúng dòng của người gọi, không mở dòng mới, nhật ký 1 dòng;
    - người phụ trách đã đổi → `changes = 0`, không nhật ký;
    - hai lô song song (Từ chối và đổi người) → tối đa một dòng mở.
  - Harness `tu-choi.test.ts`: L2-1, L2-2, L2-3 ở mức route.
  - `bang-tin.test.ts`: `tu_choi` gắn `cho-nhan` + `nguoi:<người trả>`; `THAY_DOI` 10; lai không hiện.

  Chạy → đỏ.
- [ ] **Bước 2: Mã, cùng một commit** (hàng rào 1): ô + route + service + hành động nhật ký + luật Q-E + Bảng tin + hai bài hàng rào. `permissions.test.ts`: bảng thêm dòng, tên bài 27 → 28, bài `ADMIN_NONE_OPS` thêm danh sách thao tác ADMIN = `assigned` (bảng "Bài kiểm đổi kỳ vọng").
- [ ] **Bước 3: Xanh.** `npm test`, `npm run typecheck`.
- [ ] **Bước 4: Thấy chặn thật.**
  - Đột biến 1: bỏ `!assigned ||` → ca "Toàn quyền không đang phụ trách → 403" đỏ → hoàn nguyên.
  - Đột biến 2: đổi điều kiện Q-E thành `< hôm nay` → ca "ngày mai → 409" đỏ → hoàn nguyên.
  - Đột biến 3: xoá `baoThayDoi(` của route → `bang-tin-guard` đỏ nêu đúng route → hoàn nguyên.
- [ ] **Bước 5: Commit** "Từ chối: người đang phụ trách trả đơn của chính mình, đơn về Chờ nhận, lý do bắt buộc (ADR-0030 điều 1, thay LC-8)".

### Task 2.5: LC-8 — câu kiểm phát hiện + bỏ `dropHandler` (điều 4, Hệ quả "Kiểm dữ liệu")

**Tệp:** `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts`, `tests/e2e/dispatch.mjs` (`dropHandler` :51-52 và mọi lời gọi còn lại).

- [ ] **Bước 1: Đỏ trước.** `src/audit-invariants.test.ts` ca mới (SQLite thật):
  - (a) đơn có một dòng `HANDLE` đã đóng, không dòng mở, không nhật ký `order_handler_refused` sau lần đóng → vi phạm 1;
  - (b) có `order_handler_refused` với `at` ≥ `valid_to_at` của lần đóng cuối → 0;
  - (c) đơn chưa từng có dòng `HANDLE` → 0.
- [ ] **Bước 2: Mã.** Câu mới, mã gợi ý `R-DSP-4`, `what` = "đơn từng có người phụ trách mà nay không có ai phải do chính người phụ trách Từ chối (LC-8 mới, ADR-0030 điều 1)". Mức `warn-unless-strict`, kèm `note` "cảnh báo — nâng lên 'vi phạm' chỉ sau khi chủ dự án chạy truy vấn chỉ đọc trên hệ thống thật (ADR-0030 Hệ quả)". e2e gọi audit với `--strict` (`tests/e2e/run.mjs:114`, đã đọc ở a74048e), nên vi phạm làm e2e đỏ; hệ thống thật chạy không `--strict` (`scripts/release-lib.mjs:310`), nên chỉ cảnh báo.
- [ ] **Bước 3:** Thay mọi lời gọi `dropHandler` còn lại bằng Từ chối thật, qua route mới, bằng tài khoản đang phụ trách. Gỡ hàm `dropHandler`.
- [ ] **Bước 4:** `npm run test:e2e` đủ bộ, rồi `node scripts/audit-invariants.mjs --db local --strict` → đạt. Thấy chặn thật: chèn tạm một `dropHandler` ở cuối `dispatch.mjs` → audit `--strict` đỏ nêu `R-DSP-4` → hoàn nguyên. Commit "Kiểm dữ liệu LC-8: đơn mất người phụ trách phải do Từ chối (mức cảnh báo); e2e bỏ dropHandler (ADR-0030)".

### Task 2.6: Bảng chọn người hiện "đã từ chối lúc … — <lý do>" (điều 1, "Sau Từ chối")

**Tệp:** `src/modules/audit/index.ts` (hàm công bố mới, gợi ý `findLatestByOrderAndAction(db, orderId, action)` → `{ staffId, at, detail }[]`), `src/modules/dispatch/index.ts` (`GET /api/dispatch/assignees` :88-95 nhận `?orderId=` tuỳ chọn), `src/shared/contracts.ts` (`AssigneeDto` thêm trường tuỳ chọn gợi ý `lastRefused: { at; detail } | null`), `web/handler-sheet.ts`, harness.

- [ ] **Bước 1: Đỏ trước.** HDV A Từ chối đơn X; Quản trị gọi `GET /api/dispatch/assignees?orderId=X` → mục của A có `lastRefused` với chi tiết **đúng nguyên văn** dòng nhật ký; người khác `null`. Không `orderId` → như cũ. `orderId` sai dạng → 400. Kiểm quyền (`can(dispatch.assign, { ownerId: staff.id })`) đứng trước đọc tham số.
- [ ] **Bước 2: Mã.** `dispatch` gọi hàm công bố của `audit` (cạnh `dispatch → audit` đã có). Không SQL đọc `audit_log` trong `dispatch`: bài kiến trúc canh cạnh module sẽ bắt.
  - Chọn dòng `order_handler_refused` **mới nhất** của đúng người đó với đúng đơn đó, **theo mã hành động** và người thao tác.
  - Hiện **nguyên văn** chi tiết đã lưu (dạng `<tên> — <nhãn>`; lặp tên cũng không sao) cùng giờ.
  - **Không** tách hay phân tích chữ trong chi tiết (ADR-0030 điều 3: "dựng theo mã hành động … hiện nguyên nhãn lý do đã lưu. Không phân tích chữ trong chi tiết").
- [ ] **Bước 3 (chờ thiết kế — Task 2.9):** `web/handler-sheet.ts` hiện dòng phụ dưới tên.
- [ ] **Bước 4:** `npm test`, `npm run typecheck`. Commit "Bảng chọn người: hiện lần Từ chối gần nhất của người đó với đơn này (ADR-0030 điều 1)".

### Task 2.7: Lý do sửa số khách thành danh sách đóng (S23-9)

**Tệp:** `src/modules/orders/money-adjustment.ts` (`parseMoneyEditInput` :82-100), `money-adjustment.test.ts`, `money-edit-plan.test.ts`, `src/modules/dispatch/index.ts` (route `handler-money-edit` :186-206 — chỉ lời báo), `web/account.ts:353` (ô chữ "Lý do sửa (bắt buộc)"), mọi lời gọi `handler-money-edit` ở `tests/e2e/dispatch.mjs` (thân có `reason` chữ tự do).

- [ ] **Bước 1: Đỏ trước.** `reason: "tour đã đi — …"` (chữ tự do) → lỗi; `reason: "<mã Khách thêm người>"` → ok, `plan.reason` = nhãn.
- [ ] **Bước 2: Mã.** `parseMoneyEditInput` dùng `parseMoneyEditReason` (Task 2.1). Giá trị ghi vào dòng điều chỉnh/nhật ký là **nhãn**. Route giữ nguyên thứ tự kiểm.
- [ ] **Bước 3:** Sửa mọi lời gọi e2e (`reason` → mã). `:416-418` (đơn nháp → 409) **giữ nguyên**. `npm test`, `npm run test:e2e -- dispatch`.
- [ ] **Bước 4 (chờ thiết kế — Task 2.9):** thay ô chữ bằng các nút lý do.
- [ ] **Bước 5:** Thấy chặn thật: cho tạm chữ tự do lọt qua → ca đỏ → hoàn nguyên. Commit "Sửa số khách: lý do chọn từ danh sách đóng, không ô chữ (ADR-0030 S23-9)".

### Task 2.8: Nhãn lượt 2 — "được trả lại", "Đã huỷ · <lý do>", "Đã huỷ · HDV huỷ: <lý do>" (điều 3, G2)

**Tệp:** `src/shared/handler-view.ts` (hoặc tệp thuần mới) — hàm dựng nhãn từ **mã hành động** nhật ký, `web/order.ts` (chi tiết đơn — `history` đã có trong `OrderDetailResponse` với người được xem lịch sử), `src/modules/orders/pool.ts` (cờ "được trả lại" trong `PoolOrderDto`, đọc qua hàm công bố của `audit` — cạnh `orders → audit` đã có), màn HDV.

- [ ] **Bước 1: Đỏ trước** (hàm thuần):
  - lần cuối là `order_handler_refused` → "Chờ nhận · được trả lại";
  - đơn huỷ có `cancelled` chi tiết "Khách đổi ý" → "Đã huỷ · Khách đổi ý";
  - `order_cancelled_by_field` "Khách yêu cầu huỷ" → "Đã huỷ · HDV huỷ: Khách yêu cầu huỷ";
  - `cancelled` không chi tiết (đơn cũ) → "Đã huỷ";
  - không lộ mã thô.
- [ ] **Bước 2: Mã.** Nhãn chỉ ở **chi tiết đơn và màn HDV** (G2).
  - **Danh sách đơn văn phòng giữ "Đã huỷ"**: hiện lý do ở danh sách cần đọc nhật ký cho mỗi trang, hoặc thêm cột (thêm cột phải có ADR riêng — ADR-0030 điều 3).
  - Kế hoạch chọn "không hiện ở danh sách" cho lượt này; người thi công ghi quyết định vào nhật ký. Bề mặt, đảo được.
- [ ] **Bước 3:** `npm test`; kịch bản Chrome ở Task 2.9. Commit "Nhãn đơn huỷ/được trả lại dựng từ mã hành động nhật ký ở chi tiết đơn và màn hướng dẫn viên (ADR-0030 điều 3)".

### Task 2.9: Giao diện lượt 2 (**chờ bản thiết kế của chủ**)

> **Điều kiện:** có bản thiết kế của chủ cho (1) nút Từ chối + chọn lý do ở màn HDV (và trang đơn của người phụ trách Bán hàng/Quản trị nếu thiết kế có), (2) hộp Huỷ có lý do + hỏi lại "không thể hoàn tác" cho văn phòng, Đối tác, Thực tập, (3) nút lý do sửa số khách, (4) dòng "đã từ chối lúc …" trong bảng chọn người. Chưa có thì không làm và không phát hành R2.

- [ ] **Bước 1:**
  - Từ chối: mỗi lý do một nút; chỉ gửi khi đã chọn.
  - 409 `too_late` → hiện đúng "Gọi văn phòng để đổi người".
  - Ẩn nút Từ chối khi luật `refuseWindowClosed` đúng: cùng hàm thuần với máy chủ, không chép tay.
  - Thua đua → tải lại.
- [ ] **Bước 2:** Hộp Huỷ có lý do ở `web/order.ts` và chỗ huỷ của Đối tác/Thực tập. "Việc của tôi" mở nút Huỷ cho đơn nháp (`myJobActions`).
- [ ] **Bước 3:** Kịch bản Chrome:
  - thêm vào `hdv-smoke.mjs` ca L2-5 (hai tài khoản HDV, ≤ 5 giây, thông báo "vừa được trả lại");
  - chạy lại `va3-smoke.mjs` (vùng huỷ "Việc của tôi"), ba `a2-smoke-*.mjs`, `v1-nguoi-phu-trach.mjs`, `dot-c-smoke.mjs`;
  - ảnh 390px + 1040px.
- [ ] **Bước 4:** `npm run build:web`, `npm test`, `npm run typecheck`. Commit "Giao diện Từ chối và Huỷ có lý do (theo bản thiết kế của chủ)".

### Task 2.10: e2e, tài liệu, sổ hàng rào, lệch có chủ ý (lượt 2)

- [ ] **Bước 1: e2e.** Khối Từ chối trong `tests/e2e/dispatch.mjs`: L2-1…L2-4, gồm đua "văn phòng đổi người ↔ HDV Từ chối" và "HDV khác Nhận ↔ Từ chối" bằng `Promise.all` lặp 10 vòng như mục 10 hiện có. `tests/e2e/bangtin.mjs`: sự kiện `tu_choi` tới HDV khác. Chạy đủ bộ, rồi `audit-invariants --db local --strict`.
- [ ] **Bước 2: `docs/SO-HANG-RAO.md`:** các dòng lượt 2 ở mục "Sổ hàng rào — dòng dự kiến", kèm ngày + đột biến + dòng đỏ.
- [ ] **Bước 3: Tài liệu mô tả.**
  - `docs/SYSTEM-DESIGN.md` §6 (Từ chối, huỷ có lý do, HDV huỷ đơn nháp), §7 (route Từ chối; thân `/status` có `reason`; `assignees?orderId=`), §8 (`dispatch.refuse`), §16 (mở rộng dòng Task 1.1 bước 5 thành đủ ba luật (a)(b)(c) của điều 4 — L2-13).
  - `docs/CHANGE-GUIDE.md` công thức f: thứ tự câu trong lô Từ chối + chỗ ADR-0032 chèn câu đầu lô.
- [ ] **Bước 4: Nhật ký thay đổi.** Mục mới, số phiên bản = mục đầu trên `origin/main` + 1. Lời thường, ví dụ: "Hướng dẫn viên (và nhân viên đang lo đơn) bấm 'Từ chối' để trả đơn mình đang lo — đơn quay về danh sách chờ nhận. Mọi lần Từ chối hay Huỷ đều phải chọn lý do. Hướng dẫn viên huỷ được cả đơn chưa chốt mình đang lo. Nếu bấm Huỷ mà báo lỗi, hãy tải lại ứng dụng." (Review Focus 12.)
- [ ] **Bước 5:** `npm test`, `npm run typecheck`, `node --test "tests/audit/*.test.mjs"`, `npm run test:e2e`. Commit.

### Task 2.11: Người kiểm độc lập lượt 2 (chỉ đọc) — bắt buộc

- [ ] **Bước 1:** Gọi `nguoi-kiem-doc-lap` với yêu cầu sau:

  > Kiểm lượt 2 của kế hoạch trên `<nhánh-R2>` theo L2-1…L2-13 và "Chung".
  >
  > **Tự chạy:** `npm test`, `npm run typecheck`, `node --test "tests/audit/*.test.mjs"`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local --strict`.
  >
  > **Đọc:**
  > - route Từ chối từ đầu tới `baoThayDoi`: thứ tự 404 → 403 → 409 → 409 → 400 → ghi; chốt "đang phụ trách" áp cả Toàn quyền;
  > - `refuseStatements`: câu chốt, không mở dòng mới, `changes() > 0`;
  > - `/status` (403 trước 400);
  > - `handler-cancel` (nhánh thất bại);
  > - `parseMoneyEditInput`.
  >
  > **Kiểm:** không chỗ nào ghi chữ người dùng gõ vào nhật ký; `grep -rn "v_dsp_" src/modules/orders` rỗng; `dispatch` không đọc `audit_log`.
  >
  > **Tự làm ít nhất ba đột biến:** bỏ chốt đang phụ trách, đổi mốc Q-E, xoá `baoThayDoi`.
  >
  > Đối chiếu bảng "Bài kiểm đổi kỳ vọng" (dòng R2). Xem ảnh Chrome.
  >
  > Chỉ báo cáo.
- [ ] **Bước 2:** Vòng sửa như Task 1.10.
- [ ] **Bước 3:** Chỉ báo "đạt" khi người kiểm nói ĐẠT **và** test xanh.

### Task 2.12: Phát hành R2 (chủ dự án tự chạy — AI chuẩn bị)

- [ ] **Bước 1 (AI):** `npm test`, `npm run typecheck`, `npm run test:e2e`; đưa lệnh `npm run day-len -- <nhánh-R2>` kèm dòng "**cần** chạy `npm run trien-khai` sau đó".
- [ ] **Bước 2 (chủ dự án):** `npm run day-len -- <nhánh-R2>`, rồi `npm run trien-khai`. **Không có migration.**
- [ ] **Bước 3 (AI, sau deploy):**
  - GET công khai kiểm phiên bản; ghi `docs/HANDOFF-N1.md`;
  - nhắc chủ: một HDV thật bấm Từ chối một đơn thử và thấy đơn quay lại hàng chờ; một nhân viên huỷ một đơn thử có chọn lý do;
  - nhắc nhân viên **tải lại ứng dụng** (app cũ huỷ sẽ báo lỗi).
  - Rủi ro "gom SĐT rồi trả" chưa có rào tới khi ADR-0032 lên (chủ đã nghe trong ADR-0030; không nhắc lại).

---

## Trang ghép — lượt 1 (`CLAUDE.md` §9)

Nguồn: trang ghép của ADR-0030 (mục "Trang ghép"), chỉ giữ các dòng thuộc lượt 1. Số quyết định chạm quyền/dữ liệu của lượt 1 = **3** (D1, D2, D3), theo mục "Đếm quyết định" của ADR-0030. Kế hoạch không đếm lại.

**(1) Bảng chứa loại thực thể nào**

| Bảng (module chủ) | Chứa | Lượt 1 đổi gì |
|---|---|---|
| `dsp_assignment` (`dispatch`) | Dòng `HANDLE` hạt đơn: hồ sơ nội bộ có tài khoản, hoặc hồ sơ không tài khoản | Mở dòng ngay lúc lập cho **người được chọn** (S20-4); không còn dòng mặc định cho người lập. Không cột mới. |
| `orders` (`orders`) | Đơn do nội bộ, Đối tác, Thực tập lập | Không cột. Câu huỷ thêm khoá `updated_at` (Task 0.1). |
| `order_service` (`orders`) | Dịch vụ; `pickup_place` là chữ tự do có thể chứa SĐT | Không cột. Phần hẹp đọc và **che dãy ≥ 8 chữ số** (S23-2). |
| `audit_log` (`audit`) | Nhật ký chỉ-thêm | `order_handler_changed` lúc lập đơn kèm HDV. |

**(2) Dòng bản đồ quyền chạm các bảng trên**

| Ô | Hôm nay (a74048e) | Sau lượt 1 | Áp cho |
|---|---|---|---|
| `dispatch.claim` | `FIELD` `none` (`permissions.ts:59`) | `FIELD` `any` + chốt N-2 + `!holdsPartner` | Đơn không có dòng mở, chưa huỷ, chưa qua ngày đi |
| `dispatch.assign` | `SALES` `ownOrAssigned`, `ADMIN` `any` (:58) | giữ; dùng thêm lúc lập đơn | Đơn của mình lúc lập; mọi đơn (Quản trị); cả đơn đã huỷ (Giao) |
| `order.view` / `money.view` | `FIELD` `none` (:48-49) | `FIELD` `assigned` | Đơn HDV đang phụ trách |
| `order.history.view` | `FIELD` `none` (:50) | `FIELD` `assigned` | Đơn HDV đang phụ trách |
| `contact.view` | `FIELD` `assigned` (:51) | giữ | Đơn HDV đang phụ trách; **không** áp cho phần hẹp |
| `order.pool.view` (mới) | — | `FIELD` `any`, `SUPER_ADMIN` `any`, còn lại `none` | Phần hẹp của đơn đang chờ nhận |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Chốt trong thân | Lưới ở dữ liệu |
|---|---|---|---|
| Nhận / Giao (`PUT /api/orders/:id/handler`) | `orders` (`dispatch/index.ts:114`) | `handlerChangeVerdict` + chốt N-2 (chỉ Nhận) + `!holdsPartner` + `checkAssignee` | `NOT EXISTS` + chỉ mục duy nhất |
| Lập đơn kèm HDV (`POST /api/orders`) | `orders` | `can(order.create)` + `can(dispatch.assign, { ownerId: self })` + `checkAssignee` | Một lô: đơn + dòng `HANDLE` + nhật ký |
| Hàng chờ (`GET /api/orders/pool`) | `orders` | `can(order.pool.view)` + `!holdsPartner` | Danh sách trường được phép; chỉ đơn không có dòng mở, chưa huỷ, chưa qua ngày đi |
| Danh sách / chi tiết đơn | `orders` | `can(order.view/money.view/contact.view/order.history.view, { assigned })`; lọc theo người phụ trách qua hook `ctx` | Đơn khác → 404 (chỉ tài khoản chỉ-`assigned`) |
| "Đơn của tôi" (`GET /api/dispatch/mine`) | `staff` | `can(contact.view, { assigned: true })` (đã có) | Chỉ đơn của người gọi; thêm đơn nháp |
| Tên người phụ trách của chính mình | — (không route; giao diện đọc từ phiên đăng nhập) | — (ruling điều phối: không mở `GET /api/dispatch/handlers` cho HDV) | — |
| Bảng tin (`GET /api/bang-tin`) | `staff` | `nhanKetNoi` (không `cho-nhan` cho lai); `nhanSuKien` với "không biết" | — |
| Danh mục cho form lập đơn | `GET /api/catalog` cổng `office`; `/for-order` cổng `orders` | `/for-order`: `can(order.create)` → HDV 403 ở thân | — |

## Trang ghép — lượt 2 (`CLAUDE.md` §9)

Số quyết định chạm quyền/dữ liệu của lượt 2 = **3** (D4, D5, D6) theo ADR-0030. Kế hoạch này chỉ thi công phần S23-9 của D6 (mục "Ngoài phạm vi").

**(1) Bảng**

| Bảng | Lượt 2 đổi gì |
|---|---|
| `dsp_assignment` | Thêm cách **đóng mà không mở** (Từ chối), chỉ theo `party_id` của người gọi. Không cột mới. |
| `orders` | HDV huỷ từ `draft` (mới). Trạng thái chỉ đi tiến giữ nguyên. |
| `audit_log` | Thêm `order_handler_refused`; `cancelled` có nhãn lý do; `order_cancelled_by_field` thêm đơn chưa chốt. Chỉ nhãn từ danh sách đóng. |
| `order_money_adjustment` | Không cột; giá trị lý do nay là nhãn từ danh sách đóng (S23-9). |
| Bảng tra cứu lý do | **Không có** — hằng trong mã (`src/shared/ly-do.ts`). |

**(2) Ô quyền**

| Ô | Hôm nay | Sau lượt 2 | Áp cho |
|---|---|---|---|
| `dispatch.refuse` (mới) | — | `SALES`/`ADMIN`/`FIELD` `assigned`, `SUPER_ADMIN` `any`, còn lại `none`; + chốt "đang phụ trách" | Dòng `HANDLE` **của chính người gọi**, mọi loại đơn, chưa huỷ, ngoài hạn Q-E |
| `order.cancel` | `FIELD` `assigned`, `SUPER_ADMIN` `any` (:57) | giữ ô; route mở cho `draft` | Đơn HDV đang phụ trách, chưa huỷ, chưa qua ngày đi |
| `order.modify` | như hôm nay (:53) | giữ ô; huỷ qua `/status` phải có lý do | Mọi loại đơn |
| `order.money.edit` | `FIELD` `assigned` (:56) | giữ ô; lý do đóng (S23-9) | Đơn HDV đang phụ trách, đã xác nhận (như hôm nay) |

**(3) Cổng**

| Cửa | Cổng | Chốt trong thân | Lưới ở dữ liệu |
|---|---|---|---|
| Từ chối (`POST /api/orders/:id/handler-refuse`) | `orders` | đang phụ trách (cả Toàn quyền) + `can(dispatch.refuse, { assigned })` + chưa huỷ + Q-E + lý do | Câu đóng theo `party_id` người gọi; nhật ký `changes() > 0`; chỉ mục duy nhất; câu kiểm LC-8 (phát hiện) |
| HDV huỷ (`handler-cancel`) | `staff` (`dispatch/index.ts:164`) | `can(order.cancel, { assigned })` + chưa huỷ + `tripDeparted` + hai lý do | Trigger `0017`; khoá `updated_at` (Task 0.1) |
| Huỷ qua `/status` | `orders` | `can(order.modify, …)` + lý do | Trigger `0017`; khoá `updated_at` |
| Sửa số khách (`handler-money-edit`) | `staff` | như hôm nay + lý do đóng | Khoá lạc quan `seq` hiện có |
| Người được giao (`GET /api/dispatch/assignees?orderId=`) | `office` | `can(dispatch.assign, { ownerId: self })` trước đọc tham số | Đọc nhật ký qua hàm công bố của `audit` |
| Bảng tin | `staff` | `tu_choi` gắn `cho-nhan` + `nguoi:<người trả>`; lai không hiện nổi | — |

## Sổ hàng rào — dòng dự kiến (`docs/SO-HANG-RAO.md`)

Mỗi dòng chỉ được ghi **sau khi** thấy chặn thật: ngày + phép đột biến + thông báo đỏ.

| Hàng rào | Chặn cái gì | Cơ chế | Thấy chặn thật (task) |
|---|---|---|---|
| Khoá lạc quan câu huỷ | Huỷ đè lên đơn vừa bị người khác sửa | `cancelOrder` điều kiện `updated_at`; bài SQLite `repository.test.ts` | bỏ điều kiện → đỏ (Task 0.1) |
| Chốt Nhận | Nhận đơn đã huỷ / đã qua ngày đi | chốt ở route `PUT …/handler`; harness `nhan-don.test.ts` | bỏ chốt → đỏ (Task 1.1) |
| Tài khoản lai không làm người phụ trách | Tài khoản có quyền Đối tác thành người phụ trách | `checkAssignee` + `holdsPartner`; `rules.test.ts`; `R-DSP-2a` | bỏ điều kiện → đỏ (Task 1.1) |
| `orders` không đọc view `dispatch` | Lặp lại lệch H1/T3a | bài `src/architecture.test.ts` quét `v_dsp_` trong `src/modules/orders/` | chèn câu có `v_dsp_` → đỏ (Task 1.2) |
| Lập đơn kèm HDV không đạt thì không có đơn | Đơn lưu mà người được chọn sai | harness `don-moi-chon-hdv.test.ts` | cho gọi `createOrder` khi hook sai → đỏ (Task 1.3) |
| Bảng tin không lộ đơn người khác cho HDV (thay NT-3) | Tin về đơn HDV B lọt tới HDV A | hàm thuần 128 tập con, suy từ `MATRIX` + e2e `bangtin.mjs` | mặc định "trước chưa ai" + claim FIELD → đỏ (Task 1.4) |
| Phần hẹp của hàng chờ | SĐT/tiền/lịch sử lộ ở hàng chờ | danh sách trường được phép `pool.ts` + `pool.test.ts` + harness; **bài riêng** vì `cong-quyen.test.ts:19` không canh `order.pool.view` | thêm `customerPhone` → đỏ (Task 1.5) |
| HDV chỉ thấy đơn mình phụ trách | HDV xem đơn người khác | harness `xem-don-theo-quyen.test.ts` (404) + `money.view` FIELD | `money.view` FIELD `none` → 403 đỏ (Task 1.5) |
| Hàng chờ chặn tài khoản lai | Lai xem hàng chờ | `!holdsPartner` ở route pool | bỏ → đỏ (Task 1.5) |
| Lý do đóng — Huỷ `/status` | Huỷ không lý do / chữ tự do vào nhật ký | `parseOrderCancelReason`; harness | bỏ kiểm → đỏ (Task 2.2) |
| Chốt "đang phụ trách" của Từ chối (cả Toàn quyền) | Trả đơn thay người khác | route Từ chối; harness `tu-choi.test.ts` | bỏ `!assigned ||` → đỏ (Task 2.4) |
| Hạn Q-E | Từ chối sát ngày đi | `refuseWindowClosed` (thuần) + harness | đổi mốc → đỏ (Task 2.4) |
| Hàng rào Bảng tin cho route Từ chối | Quên báo | `bang-tin-guard.test.ts` (thêm tay vào `expected`) | xoá `baoThayDoi(` → đỏ (Task 2.4) |
| LC-8 phát hiện | Đơn mất người phụ trách không qua Từ chối | `R-DSP-4` (`warn-unless-strict`) | chèn `dropHandler` → `--strict` đỏ (Task 2.5) |
| Lý do đóng — sửa số khách | Chữ tự do vào dòng điều chỉnh | `parseMoneyEditInput` | cho chữ tự do lọt → đỏ (Task 2.7) |

## Việc của chủ dự án (gom một lần)

1. **Gộp nhánh ADR-0030 vào `main`.** Nhánh `worktree-agent-a9441c370e4ac49ff` gồm ADR-0030 (accepted), dòng mục lục và bản đặc tả đã sửa. Lệnh do điều phối đưa (`npm run day-len -- <nhánh>`). **Không cần triển khai** (chỉ tài liệu).
2. **Gộp commit ghi trạng thái ADR-0020/ADR-0023** ("accepted phần tương ứng" + chép dòng S20/S23) do điều phối soạn (Task 0 bước 2). **Không cần triển khai.**
3. **Bản thiết kế giao diện** (Claude Design), làm đúng 100%:
   - cho **R1:** (a) màn hướng dẫn viên: "Đơn chờ nhận" + "Đơn của tôi"; (b) chỗ chọn hướng dẫn viên trong form lập đơn;
   - cho **R2:** (c) nút Từ chối + chọn lý do; (d) hộp Huỷ có lý do (văn phòng, Đối tác, Thực tập); (e) nút lý do sửa số khách; (f) dòng "đã từ chối lúc …" trong bảng chọn người.
   - Phần máy chủ làm trước được; **không phát hành** khi chưa có giao diện.
4. **(Nếu người thi công đổi tên hook)** duyệt commit đề xuất sửa `src/CLAUDE.md` dòng 15.
5. **Phát hành hai lần**, mỗi lần theo `docs/QUY-TRINH-PHAT-HANH.md`: `npm run day-len -- <nhánh>` rồi `npm run trien-khai`.
   - R1 trước; R2 sau khi R1 đã chạy thật.
   - **Không có migration.**
   - **Không có truy vấn chỉ đọc nào (P1/P2…) phải chạy trước**, khác kế hoạch GĐ2: câu kiểm LC-8 mới chỉ để mức **cảnh báo**. Nâng lên "vi phạm" là việc sau, lúc đó mới cần bạn chạy một truy vấn chỉ đọc.
6. **Sau mỗi lần phát hành:** một hướng dẫn viên thật thử trên iPhone (R1: Nhận; R2: Từ chối). Nhắc nhân viên tải lại ứng dụng sau R2.

## Điểm cần điều phối quyết trước khi thi công

**Điều phối đã quyết cả 6 điểm (2026-09-27), không hỏi lại — ghi để người thi công theo:**

1. **ADR-0030 lên `main`:** làm ở Task 0 bước 1–2, người soạn ADR-0030 (nhánh `worktree-agent-a9441c370e4ac49ff`) chép nguyên các dòng "nguyên văn → mới" của Mục S20 vào chính `docs/adr/ADR-0020-*.md` (đổi dòng trạng thái: accepted phần điều 1–2, S20-13), và Mục S23 phần "xem" (điều 1–2, S23-1…5, S23-8) + S23-9 (điều 4, đã chủ duyệt cùng lượt 2) vào `docs/adr/ADR-0023-*.md` (đổi dòng trạng thái: accepted phần điều 1, 2, 4; điều 3, 5–8 GIỮ proposed — xem điểm 2). Gộp nhánh đó vào `main` bằng `day-len` TRƯỚC khi Task 1.1 bắt đầu (chỉ tài liệu, không cần triển khai).
2. **Phạm vi D6: đã quyết — chỉ làm S23-9** trên route `handler-money-edit` hiện có. ADR-0023 điều 3, 5–8 (thêm/bớt dịch vụ, lịch sử tăng/giảm, nhãn "Đã sửa", thông báo nổi) sang kế hoạch riêng, sau này. Dòng trạng thái ADR-0023 chỉ chuyển accepted cho điều 1, 2, 4.
3. **Giao diện chờ bản thiết kế của chủ:** giữ nguyên — Task 1.8 và 2.9 bị chặn tới khi chủ đưa bản thiết kế (theo tiền lệ đăng nhập kiểu mới). "Việc của chủ dự án" phải thêm dòng xin bản thiết kế cho hai màn: HDV (danh sách chờ nhận, Việc của tôi, nút Từ chối/Huỷ) và form lập đơn (chọn HDV).
4. **ADR-0020 điều 9 (biên nhận "Chưa có người phụ trách"):** LÀM KÈM R1, thêm một task nhỏ 1.6b (xem dưới, chèn sau Task 1.6) — câu trả lời M1=A đã được chủ chốt từ trước (ghi trong bộ nhớ dự án), không phải quyết định mới; R1 làm tăng hẳn số đơn không có người ngay khi lập, nên phải sửa cùng lúc, không để lộ tên người lập nhầm thành "nhân viên phụ trách".
5. **`GET /api/dispatch/handlers` cho HDV: đã quyết — KHÔNG mở** (xem Task 1.6, và các chỗ đã sửa ở trên). Giao diện tự hiện tên chính mình, không gọi route.
6. **T3b không áp dụng — đúng, giữ nguyên.** Không đăng ký `ord_` ở kế hoạch này.

### Task 1.6b (mới, chèn sau Task 1.6): Biên nhận đơn chưa có người phụ trách ghi đúng câu (ADR-0020 điều 9, M1=A)

**Tệp:** `web/confirmation-dialog.ts` (đầu tệp có chú thích "chưa có người thì dùng tên người lập"), test cạnh tệp, `docs/evidence/…` ảnh xác nhận nếu cần chụp lại.

- [ ] **Bước 1: Đỏ trước.** Đơn mới không chọn HDV (S20-2..4) → ảnh xác nhận gửi khách ghi đúng "Chưa có người phụ trách" (không phải tên người lập). Đơn có chọn HDV → ghi tên HDV như hôm nay.
- [ ] **Bước 2: Mã.** Bỏ nhánh "không có thì dùng tên người lập"; khi không có dòng `HANDLE` mở, in cố định "Chưa có người phụ trách". Chỉ đổi khi **máy chủ xác nhận** chưa có người (không đoán ở giao diện).
- [ ] **Bước 3:** `npm test`, `npm run build:web`, chạy lại kịch bản xác nhận gửi khách hiện có, sửa ảnh nếu cần. Commit "Biên nhận đơn chưa có người phụ trách ghi đúng câu, không dùng tên người lập (ADR-0020 điều 9, M1=A)".

## Tự rà kế hoạch (người lập kế hoạch, 2026-09-27)

**Phủ quyết định:**

| Quyết định | Task |
|---|---|
| ADR-0030 điều 1 (Từ chối, `dispatch.refuse`, chốt đang phụ trách, 409 đã huỷ/Q-E, lô, Bảng tin `tu_choi`, sau Từ chối 404/200, Giao lại + "đã từ chối lúc…") | 2.4, 2.5, 2.6, 2.9, 2.10 |
| điều 2 (lý do đóng cho mọi Từ chối/Huỷ; HDV huỷ đơn chưa chốt; điều kiện tiên quyết khoá `updated_at`) | 0.1, 2.1, 2.2, 2.3 |
| điều 3 (hai lớp; "Chờ xác nhận", "Chờ nhận", "HDV: <tên>"; "Đã huỷ · …"; "được trả lại"; danh sách văn phòng "đo rồi chọn") | 1.7, 2.8 |
| điều 4 (lệch 5.1; lưới dữ liệu còn giữ; câu kiểm LC-8) | 1.1 bước 5 (S20-5), 2.5, 2.10 bước 3 |
| điều 5 (ADR-0031/0032 ngoài phạm vi; cam kết cấu trúc lô) | "Ngoài phạm vi"; 2.4 thiết kế lô |
| S20-1 (LC-8 đổi bởi điều 1) | Task 0 bước 2 (chép dòng); 2.10 tài liệu |
| S20-2, S20-3 (Giao/đổi người có hiệu lực ngay) | không đổi mã — hôm nay đã hiệu lực ngay; e2e đổi người hiện có giữ xanh (1.3, 1.9) |
| S20-4 (giữ và đổi dạng đường tiêm; chọn lúc lập; 400 không tạo đơn; `tao` không `giao`) | 1.3 |
| S20-5 (chốt Nhận, lệch 5.1, chặn lai bốn cửa, `handlerAccountEligible`) | 1.1 (Nhận, `checkAssignee`, kiểm dữ liệu), 1.4 (Bảng tin), 1.5 (hàng chờ) |
| S20-6, S20-12 (`dispatch.claim` FIELD cùng lượt 1, thay Phần C+D GĐ2) | 1.5 |
| S20-7, S20-10, S20-11 (trạng thái / điều kiện đã thoả) | Task 0 bước 2 |
| S20-8 (`cho-nhan` cho HDV; "không biết") | 1.4 |
| S20-9 (thay NT-3) | 1.4 |
| S20-13 (đếm "Chưa phụ trách" qua `dispatch`/`ctx`; T3a phạm vi hẹp) | 1.2 |
| S23-1 (`order.pool.view`; bốn ô FIELD; ADMIN không có ô) | 1.5 |
| S23-2 (phần hẹp, danh sách trường, che số, bài kiểm riêng + sổ hàng rào) | 1.5, 1.9 |
| S23-3 (lịch sử cho đơn mình phụ trách) | 1.5 |
| S23-4 (404; nhánh lọc thứ ba; `homeRedirect` cùng lần) | 1.5 |
| S23-5 (`FIELD` vào cổng `orders`; `money.view` assigned; danh mục 403 ở thân) | 1.5 |
| S23-6, S23-7 (tách lượt; điều kiện đã thoả) | Task 0 bước 2 |
| S23-8 ("Việc của tôi" có nháp; trường trạng thái; ẩn hai nút) | 1.6, 1.8 |
| S23-9 (lý do sửa số khách đóng) | 2.1, 2.7 |
| ADR-0020 điều 1 (không tự gắn) / điều 7 (M1 = A) | 1.3 / 1.2 |
| ADR-0020 điều 9 (biên nhận) | **không làm** — điểm cần quyết 4 |
| ADR-0023 điều 3, 5–8 | **không làm** — điểm cần quyết 2 |

**Tên dùng xuyên task** (gợi ý, người thi công giữ nhất quán): `order.pool.view`, `dispatch.refuse`, `GET /api/orders/pool`, `POST /api/orders/:id/handler-refuse`, `PoolOrderDto`, `maskLongDigits`, `seesOnlyAssignedOrders`, `ctx.ordersWithHandler`, `ctx.myHandledOrderIds`, `ctx.newOrderHandler`, `handlerStaffId`, `myJobActions`, `refuseStatements`, `refuseWindowClosed`, `order_handler_refused`, `tu_choi`, `src/shared/ly-do.ts`, `R-DSP-4`, `hdv-smoke.mjs`.

**Đã kiểm trên mã `a74048e` (2026-09-27, bằng đọc tệp/grep):**
- `cancelOrder` chỉ có điều kiện `status` (`repository.ts:719`); ba chú thích sai ở `dispatch/index.ts:163`, `orders/index.ts:61`, `:88`.
- Câu đếm đọc `v_dsp_order_handler` ở `orders/repository.ts:476-479`, kiểu :384-385.
- `getMyAssignments` lọc `confirmed` ở `orders/index.ts:141`, DTO không có trạng thái (:144-164); `MyAssignmentDto` ở `contracts.ts:432-438`.
- `GET /api/orders` :185-205 (`ownerId` :189, tiền/liên hệ :192-193); chi tiết :233-246 (403 ở :241).
- `POST /api/orders` :207-231 với `defaultHandlerStatement` :222-225; `/status` :324-358 (huỷ :336-337).
- `PUT …/handler` :114-157 (chú thích "CỐ Ý không xét trạng thái" :122-123); `handler-cancel` :164-181 (409 chưa xác nhận :170, departed :171); `handler-money-edit` :186-206 (Toàn quyền qua :196).
- `MATRIX` :47-74, `ORDERS_GATE` :122, `holdsPartner` :140; `checkAssignee` `dispatch/rules.ts:50-58`, `CANCEL_REASONS` :73-87; `CLOSE_HANDLER` `dispatch/repository.ts:46-51`, `INSERT_HANDLER_IF_NONE` :34-39.
- `nhanKetNoi` `bang-tin.ts:30-35`, `nhanSuKien` :42-53, `THAY_DOI` :8 (9 giá trị); mặc định "trước chưa ai" `src/index.ts:47`.
- `handlerAccountEligible` `scripts/audit-checks.mjs:19-20`; R-DSP-2a mức `warn-unless-strict`; audit trên hệ thống thật chạy không `--strict` (`scripts/release-lib.mjs:310`), e2e chạy có `--strict` (`tests/e2e/run.mjs:114`).
- `route-access.test.ts:176` = 73 route; `bang-tin-guard.test.ts:204-215` = 8 route; `permissions.test.ts:40` = 26 thao tác, `ADMIN_NONE_OPS` :177.
- `start-page.ts:16` (`homeRedirect`); `web/shell.ts:334` ("Đơn hàng" theo `seesAllOrders`).
- "Nháp" ở `web/format.ts:23`, `public/orders.html:10`, `web/home.ts:77`, `a2-smoke-order.mjs:44`.
- `defaultHandlerStatement` ở 7 tệp (có `src/CLAUDE.md:15`, `src/passkey-off.test.ts`, `src/shared/router.test.ts`).
- e2e: `dispatch.mjs` bước 1 :55-76, `dropHandler` :51-52, huỷ nháp :306-316, sửa số khách nháp :416-418, "Việc của tôi" :686-705 (khoá DTO :696); `orders.mjs:264`, `:97`, `:122`; `permissions.mjs:28-41`; `redteam.test.mjs:73`, `:114`.
- `tests/e2e/lib.mjs:19` chỉ có một tài khoản HDV.
- Chỉ có 24 migration (`0024_vai_quyen_mac_dinh.sql` là số lớn nhất); kế hoạch không thêm migration.
- `npm test` trên cây này (nhánh `ke-hoach-tu-choi-huy-hdv` = a74048e + tệp kế hoạch): 945/945 xanh.

**Chưa kiểm:**
- Không chạy đoạn mã nào của kế hoạch (vai lập kế hoạch không thi công — P15).
- e2e và kịch bản Chrome: mọi kỳ vọng ở bảng "Bài kiểm đổi kỳ vọng" là suy từ đọc mã.
- Kích thước mảng id qua `json_each` trên D1 với vài nghìn đơn: chưa đo.
- `web/format.ts` nạp được bằng `node --test` không: chưa thử (Task 1.7 bước 1 có đường lui).
- Có tài khoản lai nào đang là người phụ trách trên hệ thống thật không: chưa kiểm, không truy vấn remote. Nếu có, R-DSP-2a cảnh báo sau R1.
- Kịch bản `nhap-tay-va-gia-doi-tac.mjs` có để tài khoản lai làm người phụ trách không: chưa đọc (Task 1.1 bước 3 rà).
- Trang/khối huỷ của Đối tác và Thực tập trong `web/` có đi qua `web/order.ts` hay chỗ khác: chưa rà hết (Task 2.2 grep).
