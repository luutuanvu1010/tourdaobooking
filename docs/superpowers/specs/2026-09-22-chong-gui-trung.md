# Chống gửi trùng khi lập đơn (khoá theo lần gửi)

> Ngày 2026-09-22. Trạng thái: **bản thảo chờ chủ dự án duyệt** (câu hỏi ở §6), chưa có mã. Chưa qua kiểm độc lập.
> Nguồn: kiểm toán kiến trúc `docs/AUDIT-2026-09-22-KIEN-TRUC.md` F-02 (việc sửa số 1 của §22); chủ dự án đồng ý thứ tự ba việc sửa ngày 2026-09-22.
> Bằng chứng: `tests/audit/redteam.test.mjs` R1 (gửi lặp → 2 đơn), R2 (kèm khách mới → 2 hồ sơ), R11 (Góp ý đã chống được — khuôn để dùng lại).
> Loại việc: **việc lớn** (dữ liệu: cột + chỉ mục mới trên `orders`; hợp đồng API) → thi công xong phải có người kiểm độc lập chỉ-đọc (CLAUDE.md §3).

## 1. Vấn đề

Nhân viên bấm **Lưu** hai lần, hoặc điện thoại mất sóng đúng lúc máy chủ đã lưu xong nhưng chưa kịp trả lời rồi gửi lại, thì hệ thống tạo **hai đơn**. Nếu đơn có tạo hồ sơ khách mới thì cũng ra **hai hồ sơ** cho cùng một người.

Hôm nay đây là việc phiền, dọn tay được. Khi có sổ thu tiền (N3, ADR-0004), cùng khuôn "gửi là ghi" sẽ thành **ghi thu tiền hai lần**. Vì vậy cơ chế phải có và đã được kiểm **trước** N3.

Hệ thống đã có lời giải cho đúng vấn đề này ở module Góp ý: mỗi lần gửi mang một mã do thiết bị sinh (`clientRequestId`). Gửi lại cùng mã thì máy chủ trả lại yêu cầu cũ, không tạo mới (`fbk_ticket_request_uq`, `web/feedback.ts:18`). Việc này dùng lại khuôn đó cho đơn hàng.

**Khác với đặc tả "cảnh báo đơn trùng"** (nhánh `canh-bao-don-trung`, chờ chủ): đặc tả đó hỏi người dùng khi **cùng một khách** có đơn khác trong 7 ngày, tức là trùng **do người**. Việc này chặn **cùng một lần bấm** bị gửi nhiều lần, tức là trùng **do máy/mạng**, và không hỏi ai. Hai việc bổ sung cho nhau, không thay nhau.

## 2. Hành vi mong muốn (lời thường)

- Mở màn lập đơn mới → thiết bị sinh một mã. Mọi lần bấm Lưu và mọi lần gửi lại của **lần lập đơn đó** mang cùng mã.
- Máy chủ nhận mã **đã thấy** (cùng người lập) → trả lại đúng đơn đã tạo, không tạo đơn hay hồ sơ nào thêm, không ghi nhật ký lần hai.
- Máy chủ nhận mã **mới** → lập đơn như hôm nay.
- Không có mã (tab/PWA cũ còn trong bộ nhớ đệm) → lập đơn như hôm nay. Không làm hỏng máy chưa cập nhật.
- Mã chỉ có nghĩa **trong phạm vi một người lập**: hai nhân viên vô tình trùng mã vẫn ra hai đơn.

## 3. Thiết kế kỹ thuật (quyết định của người soạn, để lập kế hoạch)

**Dữ liệu (migration mới, chỉ thêm).** Số hiệu lấy lúc thi công: số lớn nhất trong `migrations/` + 1, sau khi liệt kê migration của mọi nhánh chưa gộp. Hiện số `0019` đang được giữ cho B5 (`docs/HANDOFF-N1.md`).

```sql
ALTER TABLE orders ADD COLUMN client_request_id TEXT
  CHECK (client_request_id IS NULL OR length(client_request_id) = 36);
CREATE UNIQUE INDEX orders_client_request_uq ON orders(staff_id, client_request_id)
  WHERE client_request_id IS NOT NULL;
```

Cột có thể trống: đơn cũ và máy cũ không có mã. Không dựng lại `orders`, nên các trigger `orders_*` (0007, 0008, 0017) giữ nguyên. Cập nhật `docs/data-dictionary.json` và chạy `npm run dict`.

**Máy chủ (`POST /api/orders`, module `orders`).**
1. Đọc `clientRequestId` từ thân yêu cầu. Nếu có mà sai dạng UUID thì trả 400.
2. **Trước khi kiểm dữ liệu và trước khi so đơn trùng** (khi đặc tả cảnh báo đơn trùng được làm): nếu đã có đơn `(staff_id = người đang đăng nhập, client_request_id = mã)` thì trả **200** kèm đơn đó (cùng dạng `OrderResponse`) và dừng. Thứ tự này bắt buộc: lần gửi lại sau khi đã lưu thành công không được hiện hộp thoại "có thể trùng đơn".
3. Nếu chưa có đơn nào: chạy luồng tạo như hôm nay, ghi thêm `client_request_id` trong câu `INSERT INTO orders`.
4. Hai lần gửi **đồng thời**: lần thua đụng chỉ mục duy nhất. D1 chạy cả batch như một giao dịch nên **mọi câu trong batch đều bị huỷ**, kể cả câu tạo hồ sơ khách mới (`booker.before`) đứng trước. Bắt đúng lỗi `UNIQUE constraint failed: orders.staff_id, orders.client_request_id` (phân biệt với lỗi trùng `order_code`, là lỗi vòng thử lại hiện có của `createOrder` đang bắt), đọc đơn của lần thắng và trả 200. Lời giải cho R2 nằm ở tính nguyên tử này, không cần sửa module `parties`.
5. Không so thân của lần gửi lại với thân lần đầu. Nếu khác nhau vẫn trả đơn của lần đầu, vì cùng mã nghĩa là cùng một lần bấm. Ghi rõ giới hạn này trong chú thích.

**Giao diện (`web/order-form.ts`).** Sinh `crypto.randomUUID()` một lần khi mở màn **lập đơn mới**; gửi kèm trong thân `POST`; giữ nguyên qua các lần thử lại. Lưu thành công thì trang đã chuyển đi (`location.replace`) nên không cần sinh lại. Màn **sửa đơn** không gửi mã, vì `PUT` đã có khoá theo mốc cập nhật (xem §5). Thêm kiểu trường vào `src/shared/contracts.ts`.

**Luật cho các việc sau (đề xuất ghi vào `docs/ARCHITECTURE.md`, cần chủ duyệt vì là tài liệu chuẩn tắc).** Mọi route **tạo** bản ghi tiền (thu, hoàn, yêu cầu hoá đơn — `bil_*` ở N3) **bắt buộc** nhận `clientRequestId` (thiếu thì 400) và bảng có chỉ mục duy nhất `(người tạo, client_request_id)`. Cưỡng chế bằng máy: `src/architecture.test.ts` đỏ nếu một bảng `bil_*` thiếu cột `client_request_id` hoặc thiếu chỉ mục duy nhất trên nó (P16). Ở đơn hàng, mã chỉ là **tuỳ chọn**, để máy cũ vẫn chạy.

## 4. Tiêu chí nghiệm thu (viết trước khi làm, kiểm được)

1. Gửi cùng thân và cùng mã hai lần, lần lượt → lần 1 trả 201, lần 2 trả 200 với **cùng id đơn**; bảng `orders` có 1 dòng; `audit_log` có 1 dòng `created`; `dsp_assignment` có 1 dòng người phụ trách.
2. Như (1) nhưng kèm `newBooker` → chỉ **1** hồ sơ khách mới (`pty_party`, `pty_contact_point`, `pty_party_role`) và 1 dòng `party_created`.
3. Gửi 10 lần **song song** cùng mã (e2e trên `wrangler dev`, như `admin-race.mjs`) → đúng 1 đơn; cả 10 phản hồi là 200/201 với cùng id đơn; không có phản hồi 500.
4. Không gửi mã → hành vi y như hôm nay: hai lần gửi = hai đơn (khẳng định lại ca R1 cũ cho đường không mã).
5. Hai nhân viên gửi cùng một mã → hai đơn, mỗi người một đơn.
6. Mã sai dạng → 400, không ghi gì.
7. Gửi lại có mã sau khi đơn đã được **xác nhận hoặc huỷ** → trả 200 với đơn đó ở trạng thái hiện tại, không tạo đơn mới.
8. Ca R1 và R2 trong `tests/audit/redteam.test.mjs` **đổi sang đỏ** khi gửi kèm mã. Chuyển hai ca đó thành test hồi quy thật (khẳng định đảo ngược) ở `tests/e2e/orders.mjs` hoặc một test esbuild + SQLite ở `src/modules/orders/`, rồi xoá khỏi `tests/audit/`.
9. `npm test`, `npm run typecheck`, `npm run test:e2e` xanh; `audit-invariants --strict` xanh.
10. Kịch bản Chrome: mở màn lập đơn, chặn mạng ngay sau khi bấm Lưu (DevTools offline), bật lại mạng, bấm Lưu lần nữa → chỉ có 1 đơn trong danh sách.

## 5. Giả định và giới hạn chấp nhận (chủ sửa nếu sai)

1. **Sửa đơn nháp (`PUT`) không đổi.** Lần gửi lại của một lần sửa đã thành công hiện nhận 409 "Đơn vừa được người khác sửa", tức báo nhầm nhưng **không hỏng dữ liệu**. Chấp nhận ở việc này; sửa sau nếu nhân viên phàn nàn.
2. **Đổi trạng thái, đổi chuyến, đổi khách, đổi người phụ trách không đổi.** Các thao tác này đã có điều kiện trong câu ghi: gửi lặp lần hai trả 409 và không ghi gì (R7).
3. **Tạo hồ sơ độc lập (`POST /api/parties`) chưa làm ở việc này** (xem câu hỏi 2).
4. Mã được giữ **vĩnh viễn** trên đơn (không có hạn 24 giờ như cổng thanh toán): chỉ 36 ký tự mỗi đơn, không cần dọn.

## 6. Câu hỏi cho chủ dự án

1. **Đồng ý làm việc này trước đặc tả "cảnh báo đơn trùng" không?** (a) **Làm trước — khuyến nghị**: việc nhỏ hơn, không cần bạn trả lời thêm câu nào, và đặc tả cảnh báo đơn trùng chỉ cần thêm một dòng "tra mã trước khi so trùng". (b) Làm cùng một lần: ít lần phát hành hơn, nhưng phải chờ bạn trả lời 3 câu của đặc tả kia.
2. **Có áp cùng cơ chế cho nút "Tạo hồ sơ" ở màn Hồ sơ không?** (a) **Chưa — khuyến nghị**: bấm đôi ở màn đó chỉ ra một hồ sơ thừa, gộp tay được, và chưa thấy xảy ra. (b) Có: thêm một cột và một chỉ mục ở bảng hồ sơ, khoảng nửa ngày công.
3. **Ghi luật "thu tiền bắt buộc có mã chống gửi trùng" vào tài liệu kiến trúc ngay bây giờ, hay khi bắt đầu N3?** (a) **Ngay bây giờ — khuyến nghị**: luật có trước thì thiết kế N3 phải theo từ đầu. (b) Khi làm N3.

## 7. Ngoài phạm vi

Chống gửi trùng cho `PUT` đơn nháp; hồ sơ độc lập (trừ khi chủ chọn 2b); hạn dùng của mã; so khớp thân yêu cầu; các lệnh thu tiền (chưa tồn tại — chỉ đặt luật ở §3).
