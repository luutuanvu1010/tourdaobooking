# ADR-0177 — Nợ Trả sau sau «Xong và đủ tiền»: khớp sổ đại lý

- **Trạng thái:** **accepted** 2026-11-07 — chủ bấm «Theo khuyến nghị» trong chat (phiên `claude/partner-type-ta-oracle-18-efd687`) sau báo cáo kiểm độc lập toàn phần Trả sau ngày 7/11; khuyến nghị điểm 1 của báo cáo là «bạn duyệt ADR-0177». Trước đó: **proposed** 2026-11-06 — chủ chọn hướng «Khớp sổ đại lý» trong chat (hộp hỏi, phiên `claude/festive-payne-7371a2`).
- **Loại:** việc lớn (tiền). **Cửa:** hai chiều (không đổi dữ liệu, không migration).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt:** 1.
- **Quan hệ với ADR cũ:** **làm rõ** ADR-0168 Đ2 mục 2, câu «Tính trên toàn bộ tiền phải thu, không trừ hoa hồng». **Làm rõ nghĩa «thu đủ»** ở ADR-0173 Đ3 mục 1 và tiêu chí 5 («đơn công nợ còn nợ thì hoa hồng chưa được trả hay đối trừ; thu đủ thì vào»): «thu đủ» là **đã ghi đủ phải thu** (cổng «Xong và đủ tiền» như cũ), kể cả khi tiền còn ở tay đối tác, chứ không phải đã nộp về công ty. Trả lời câu treo «nợ đơn Trả sau có được trừ vào hoa hồng không». Không đổi ADR-0168 Đ3, ADR-0170, ADR-0172.

## Bối cảnh

Bài e2e vé của đơn Trả sau (kế hoạch 2026-11-05 Task 5 Step 1) chạy đơn 200.000 ₫, hoa hồng 10 %. Đối tác ghi đủ tiền khách trả, mới nộp 1.000 ₫. Trước «Xong và đủ tiền» nợ là 199.000 ₫. Bấm «Xong và đủ tiền» thì sổ ghi dòng hoa hồng 20.000 ₫ công ty trả đối tác, và nợ còn 179.000 ₫.

Người thi công thử sửa cho nợ giữ 199.000 ₫. Sổ đại lý (đợt 2, từ tháng 10) từ chối đối tác nộp quá 179.000 ₫ (`settlement_exceeds_held`), vì sổ vốn cho đối tác giữ hoa hồng từ tiền đang cầm. Giữ 199.000 ₫ thì đối tác nộp hết vẫn treo 20.000 ₫ nợ mãi, bị chặn Trả sau oan. Phần sửa đã hoàn lại.

## Quyết định

1. **Trước «Xong và đủ tiền»:** nợ của đơn tính trên toàn bộ phải thu, không trừ hoa hồng (hoa hồng chưa ghi sổ). Đây là nghĩa của câu «không trừ hoa hồng» ở ADR-0168 Đ2 mục 2.
2. **Từ «Xong và đủ tiền»:** nợ của đơn bằng phần đối tác còn giữ theo sổ đại lý, đã bù dòng hoa hồng của chính đơn đó. Máy giữ nguyên cách đang làm: `noTheoDon` gọi `soChuaVeCongTy` với đủ dòng sổ của đơn.
3. Không đổi cổng mở vé, cổng «Xong và đủ tiền», hạn mức, mốc giờ.

## Phương án đã cân nhắc

- **Hoa hồng trả riêng, nợ giữ 199.000 ₫:** phải đổi cách sổ đại lý ghi hoa hồng cho mọi đơn Trả sau, vì hiện sổ nhận nộp tối đa phần còn giữ sau khi bù. Việc lớn, cần kế hoạch riêng. Chủ không chọn.

## Hệ quả

- Hạn mức khả dụng của đối tác trống ra thêm đúng phần hoa hồng ngay khi đơn sang «Xong và đủ tiền», dù tiền chưa nộp. Đây là «đối trừ» mà ADR-0173 tiêu chí 5 nói tới, nay được phép từ bước «Xong và đủ tiền»; trước bước đó vẫn cấm (bài `src/tra-sau-xac-nhan.test.ts` ca chưa ghi đồng nào, e2e mục 5 ca đã ghi đủ chưa nộp).
- Đường ngược lại: dòng hoa hồng bị huỷ hay điều chỉnh sau «Xong và đủ tiền» (phân định, điều chỉnh sổ) làm nợ của đơn tăng trở lại và có thể vượt hạn mức. Các đường đó đã gác phiên bản bên đặt (`cauTangChoDon`) nhưng không có cổng hạn mức; chỉ có cảnh báo R-CRD-3 (dựa vào người xem). Giữ như vậy: người duyệt điều chỉnh sổ là Kế toán / Toàn quyền, thấy cảnh báo.
- Hàng rào: phần 5 của `tests/e2e/tra-sau.mjs` khoá con số 179.000 ₫ sau «Xong và đủ tiền», nộp 179.001 ₫ bị 409, nộp 179.000 ₫ thì hết nợ.

## Trang ghép

(1) Bảng chạm: `bil_ledger_line` (dòng `HOA_HONG`, `HELD`, `SETTLEMENT`) của đơn `CREDIT`; không thêm loại dữ liệu. (2) Bản đồ quyền: không đổi ô nào. (3) Cửa: không cổng máy chủ hay chỗ giao diện ẩn/hiện nào đổi nghĩa; chỉ con số nợ hiển thị ở «Hạn mức trả sau» và «Trả sau của tôi» sau «Xong và đủ tiền» là số đã bù hoa hồng.
