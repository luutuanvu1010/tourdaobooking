# Cảnh báo đơn trùng của cùng một khách

> Ngày 2026-09-22. Trạng thái: **bản thảo chờ chủ dự án duyệt** (câu hỏi ở §6), chưa có mã. Đã qua một lượt kiểm độc lập chỉ-đọc (2026-09-22); bản này sửa theo kết quả kiểm đó.
> Nguồn: chủ dự án (2026-09-22) — "khách hầu hết chỉ đi 1 lần, nhưng việc kiểm tra liệu có trùng đơn của cùng 1 khách là quan trọng để cảnh báo kịp thời"; đề xuất ở trang "Bản đồ dữ liệu Tour Đảo Booking".
> Quyết định của chủ dự án (2026-09-22): (1) trùng = **trong vòng 1 tuần**; (2) **cùng dịch vụ**; (3) **cảnh báo, hỏi lại, vẫn cho lưu**.
> Nền: N2 lát 1 (`orders.booker_party_id`, đã lên production 2026-09-22), ADR-0001 mục 8 (nhận dạng theo SĐT), ADR-0011.

## 1. Vấn đề

Hai nhân viên có thể cùng nhận một khách, hoặc khách gọi đặt lại khi đơn cũ vẫn còn. Hệ thống hiện không báo gì: đơn thứ hai lưu bình thường, chỉ phát hiện khi đi đón. Khách phần lớn chỉ đi một lần, nên giá trị chính của hồ sơ khách là **bắt đơn trùng lúc đang lập**.

## 2. Định nghĩa "đơn trùng"

Đơn đang lưu **B** có thể trùng đơn **A** khi đủ cả bốn điều:

1. **A chưa huỷ** (nháp hoặc đã xác nhận) và A khác B.
2. **Cùng khách:** cùng hồ sơ người đặt (khi cả hai đơn đã gắn), **hoặc** cùng SĐT khách sau khi chuẩn hoá bằng `normalizePhone` (`src/shared/phone.ts`); số không chuẩn hoá được (số nước ngoài) thì so sau khi bỏ dấu cách/chấm/gạch.
3. **Cùng dịch vụ:** một dịch vụ của A và một dịch vụ của B cùng **mã danh mục**. Dịch vụ nhập tay (không có mã) không so (§6 câu 3).
4. **Trong vòng 1 tuần:** ngày khởi hành của hai dịch vụ đó cách nhau **không quá 7 ngày, cả hai phía** — *chờ chủ xác nhận cách tính ngày (§6 câu 1)*. Dịch vụ chưa có ngày khởi hành không so.

Với đơn B đang sửa: "khách" là hồ sơ người đặt **sẽ được lưu** (kể cả khi giữ nguyên hồ sơ cũ vì dữ liệu gửi lên không có trường người đặt); nếu B tạo hồ sơ mới thì chỉ so theo SĐT.

## 3. Luồng

1. Nhân viên bấm **Lưu** (lập đơn mới, hoặc sửa đơn nháp).
2. Máy chủ tìm đơn trùng. Không có → lưu như bình thường.
3. Có → **chưa lưu**, trả danh sách. Giao diện mở hộp thoại, **mỗi đơn cũ một dòng** (gộp các dịch vụ trùng của cùng đơn):
   > **Khách này có thể đã có đơn:** TD-20260925-0012 · Tour 3 đảo · khởi hành 25/9 · Đã xác nhận · phụ trách: NV Bán A (người lập: NV Bán A)
   > [Vẫn lưu đơn này] [Quay lại sửa]
   Không có nút "Mở đơn đó": rời trang lúc này làm mất dữ liệu đang gõ (và trên app iPhone, mở thẻ mới sẽ bật sang Safari). Hộp thoại đã đủ thông tin để nhận ra đơn cũ; lưu xong có thể tìm đơn cũ theo mã.
4. **Vẫn lưu** → gửi lại kèm danh sách đơn vừa xem. Máy chủ lưu nếu không có đơn trùng **mới** ngoài danh sách đó; có đơn mới thì hỏi lại.
5. Nhật ký của đơn (dòng "Tạo đơn" / "Sửa đơn") ghi thêm "lưu dù có thể trùng với TD-…" — chỉ mã đơn, **không SĐT**.
6. Không gửi báo cho ai khác (giả định §5.1).

## 4. Thiết kế kỹ thuật (quyết định của người soạn, để lập kế hoạch)

- **Nơi đặt:** module `orders`. Luật thuần ở `src/modules/orders/` (có test): "hai dịch vụ có trùng không", "hai khách có trùng không", hằng `7` ngày một chỗ.
- **Cách tìm — một nguồn cho luật SĐT:** câu SQL chỉ lọc sơ ứng viên theo `catalog_code IN (…)`, `depart_date` trong ±7 ngày, `status <> 'cancelled'`, `id <> B`; phần "cùng khách" lọc bằng TypeScript với chính `normalizePhone` và `booker_party_id`. Không viết lại luật chuẩn hoá SĐT bằng SQL, không thêm cột, **không migration**. Số ứng viên cỡ vài chục tới vài trăm dòng.
- **Hợp đồng API:** `POST /api/orders` và `PUT /api/orders/:id` nhận trường `acknowledgedDuplicates: string[]` (id đơn đã xem). Giao diện mới **luôn gửi** trường này (`[]` ở lần đầu). Có đơn trùng chưa xem → **409 `possible_duplicate`**, thân lỗi `duplicates: [{ id, orderCode, services: [{ name, departDate }], statusLabel, handlerName, staffName }]` (nhãn trạng thái bằng tiếng Việt). Thêm nhánh vào `failure()` của route và kiểu mới trong `contracts.ts`, như `catalog_changed`.
- **App cũ còn trong bộ nhớ đệm iPhone:** không gửi `acknowledgedDuplicates` (vắng trường, khác `[]`). Nếu vắng trường mà có đơn trùng → **409 `client_outdated`**, dùng sẵn banner "Trang đã cũ. Hãy tải lại trang." Nhờ vậy không ai bị kẹt vòng lặp.
- **Không hỏi lại vô ích khi sửa nháp:** `PUT` chỉ kiểm khi so với bản đã lưu có đổi SĐT khách, người đặt, mã dịch vụ hoặc ngày khởi hành.
- **Giao diện:** `src/shared/order-errors.ts` nhận biết `possible_duplicate`; `web/order-form.ts` mở hộp thoại (khuôn modal như bảng sửa chuyến) và gửi lại khi bấm "Vẫn lưu".
- **Tên người phụ trách** đọc qua view công bố `v_dsp_order_handler` của `dispatch` (orders được đọc view công bố, không import `dispatch`).
- **Quyền:** không đổi. Mọi nhân viên văn phòng đã xem được mọi đơn (`order.view` ở `src/shared/permissions.ts`), nên danh sách trùng không lộ gì mới. Kế toán không lập/sửa đơn nên không gặp hộp thoại.

## 5. Giả định và giới hạn chấp nhận (chủ sửa nếu sai)

1. Chỉ **người đang lập/sửa đơn** thấy cảnh báo.
2. Đơn **nháp** cũng tính là có thể trùng.
3. **Hai người lưu cùng lúc** cả hai có thể không thấy nhau (việc kiểm chạy trước khi ghi). Chấp nhận vì đây chỉ là cảnh báo.
4. **Báo nhầm có thể xảy ra** khi một số dùng chung (người nhà, hotline) hoặc một người có hai hồ sơ — chấp nhận, người lập bấm "Vẫn lưu".
5. Sửa lại chính đơn đó không báo trùng với chính nó. Sau khi B được lưu "dù trùng", sửa A sẽ báo trùng với B — chấp nhận.

## 6. Câu hỏi cho chủ dự án

1. **"1 tuần" tính theo ngày nào?** (a) **Ngày khởi hành** của hai dịch vụ cách nhau không quá 7 ngày (vd đơn cũ đi 25/9 thì báo cho đơn mới đi từ 18/9 tới 2/10). **Khuyến nghị** — cái hại thật là hai lần đón cho cùng một chuyến. (b) Đơn cũ **được lập** trong 7 ngày gần đây, bất kể ngày đi.
2. **Đơn đã xác nhận, khi đổi ngày ở "Sửa thông tin chuyến" hoặc đổi khách ở "Đổi khách", có cảnh báo không?** (a) **Có**, cùng hộp thoại. **Khuyến nghị** — đổi phút cuối là lúc dễ trùng nhất; tốn thêm việc ở hai bảng đó. (b) Không — chỉ kiểm lúc lập và sửa đơn nháp; hai đường kia bỏ qua cảnh báo.
3. **Dịch vụ nhập tay** (không chọn từ danh mục) có so không? (a) **Không** — chỉ so dịch vụ có mã danh mục. **Khuyến nghị** (so theo tên gõ tay dễ báo nhầm). (b) So khi tên dịch vụ giống hệt nhau.

Câu hỏi đã có câu trả lời của người soạn (chủ đổi được): hộp thoại hiện **cả người phụ trách hiện tại lẫn người lập** của đơn cũ.

## 7. Tiêu chí nghiệm thu (kiểm được)

**Luật (test thuần, mỗi luật có lần làm đỏ cố ý — vd đổi 7 thành 6 thì ca "cách 7 ngày" phải đỏ):**
- Cùng khách: cùng hồ sơ dù SĐT gõ khác; cùng SĐT viết khác kiểu (`0901 234 567` / `+84901234567` / `84901234567`); số nước ngoài giống nhau sau khi bỏ phân cách; khác số và khác hồ sơ → không.
- Cùng dịch vụ + trong 7 ngày: cách 7 ngày → trùng; cách 8 ngày → không; khác mã → không; nhập tay → không; không có ngày → không.
- Đơn nhiều dịch vụ, chỉ một cặp khớp → trùng, liệt kê đúng dịch vụ đó; nhiều dịch vụ của cùng đơn cũ → một dòng.

**API (e2e):**
- Đơn sau nhận 409 `possible_duplicate` với đúng đơn trước; đơn trước đã huỷ → không báo.
- Gửi lại kèm `acknowledgedDuplicates` đúng → lưu; nhật ký có "lưu dù có thể trùng với TD-…", không chứa SĐT.
- `acknowledgedDuplicates` thiếu một đơn trùng mới → hỏi lại; chứa id lạ → bỏ qua id lạ, không lỗi.
- **Vắng hẳn trường** (app cũ) mà có trùng → 409 `client_outdated`.
- `PUT` đơn nháp: đổi ngày vào vùng trùng → báo; chỉ sửa ghi chú → không báo; không báo trùng với chính nó.
- Nhãn trạng thái trả về là tiếng Việt.
- (Nếu §6 câu 2 = (a)) đổi ngày ở sửa chuyến / đổi khách của đơn đã xác nhận → báo như trên.

**Giao diện:** thêm bước kiểm hộp thoại vào kịch bản Chrome `a2-smoke-form.mjs` (hiện hộp thoại, "Quay lại sửa", "Vẫn lưu"), và chạy lại các kịch bản Chrome theo bảng ở `web/CLAUDE.md`.
**Chung:** `npm test`, `npm run typecheck`, `npm run test:e2e` xanh; có người kiểm độc lập chỉ-đọc sau thi công (việc chạm logic đơn).

## 8. Ngoài phạm vi

Chặn cứng không cho lưu; gộp đơn tự động; gửi báo cho người phụ trách đơn cũ; so theo tên khách; cảnh báo ở danh sách đơn.
