# Đặc tả ngắn: bảng luật trùng dùng chung — cho Đ6a (và phần cảnh báo chéo đơn của Đ6) của ADR-0092

> Bắt nguồn từ ba câu hỏi chủ đồng ý 2026-10-06, sau khi nhánh năm lỗi tiền báo cáo.

**Xây trên lỗ đang hở:** TNV-G4, TNV-VP01 (sổ dừng dây chuyền `docs/quyen-hoan.json`, mức HIGH, hạn 2026-10-31 — cả hai đang hở).

**Bối cảnh:** trên nhánh năm lỗi tiền (`worktree-agent-a705a660a33db03ca`, chưa gộp `main`), AI thi công đã làm xong Đ1, Đ3, Đ4, Đ5a–c của ADR-0092 nhưng **dừng ở Đ6 (mã giao dịch ngân hàng) và Đ6a (cảnh báo trùng tiền mặt)**, vì cả hai điều này đòi đi qua một "bảng luật trùng dùng chung" mà kho chưa có.

**Đã có đề xuất cũ, không làm lại từ đầu.** `docs/superpowers/specs/2026-10-02-lop-chong-ghi-trung-chung-de-xuat.md` §4 đã vẽ hướng: một bảng khai báo (mỗi loại dữ liệu một dòng: khoá chặn cứng + khoá cảnh báo + ai được bỏ qua + có bắt lý do không), một hàm `kiemTrung(loại, dữ liệu)` mà route gọi trước khi ghi, một hộp thoại chung "Có thể trùng với …: Xem bản cũ / Vẫn ghi", và một bài kiểm kiến trúc buộc route phải gọi hàm này. Tài liệu đó là **lớp nghiệp vụ**, tách khỏi lớp chống gửi trùng kỹ thuật đã thành ADR-0094 (ADR-0094 tự ghi rõ: "ADR-0092 đ6, đ6a thuộc lớp nghiệp vụ, không thuộc ADR này"). Đặc tả này **chỉ bổ sung phần còn thiếu để đóng được Đ6a**, không vẽ lại §4.

## Phần đã rõ, chỉ cần khai hai dòng vào bảng (không migration — đây chỉ là cảnh báo, không khoá CSDL)

| Cột | Dòng "lần thu tiền mặt giống nhau" (Đ6a) | Dòng "mã giao dịch khác đơn" (Đ6, phần cảnh báo) |
|---|---|---|
| Phạm vi so trùng | cùng đơn + cùng số tiền + cùng ngày (giờ Việt Nam) + hình thức tiền mặt | cùng mã giao dịch đã chuẩn hoá + **khác** đơn |
| Loại | cảnh báo (không chặn) | cảnh báo (không chặn) |
| Ai bỏ qua được | người đang ghi lần thu đó | Kế toán (ADR-0092 đ6 viết đúng chữ "Kế toán bỏ qua được") |
| Bắt lý do | có (CT4) | có (ADR-0092 đ6) |
| Nội dung cảnh báo | "Có thể trùng với [lần thu cũ]: Xem bản cũ / Vẫn ghi" | như trên, kèm **tổng số tiền đã gắn mã đó** trên các đơn khác |
| Ghi nhật ký khi bỏ qua | lý do + người bỏ qua | lý do + người bỏ qua |

Cả hai dòng dùng **cùng** hộp thoại, đúng câu ADR-0092 đã chốt ("Cảnh báo ở đ6 … đi qua cùng bảng luật và cùng hộp thoại" với đ6a).

## Hai điểm nối với hạ tầng đã có, cần ghi rõ để người lập kế hoạch không nhầm

1. **Phân biệt hai mã 409.** Lớp chống gửi trùng kỹ thuật (ADR-0094) đã dùng `409 dang_xu_ly` cho "đang xử lý, chờ chút" — `api()` **tự động** gửi lại cùng vé khi gặp mã này. Cảnh báo trùng nghiệp vụ phải dùng một mã **khác** (ví dụ `409 co_the_trung`, đúng tên đã nêu ở đặc tả cũ §4), để `api()` không tự lặng lẽ gửi lại mà hiện hộp thoại cho người dùng chọn.
2. **"Vẫn ghi" là một ý định mới.** Vì thân yêu cầu lúc "Vẫn ghi" có thêm trường "đã xem cảnh báo X" so với lần gửi đầu, vân tay của lớp chống gửi trùng kỹ thuật tự động đổi — **không cần can thiệp gì thêm**, chỉ cần người viết mã biết để không cố tình giữ nguyên vé.

## Việc không làm ở đây (tách riêng vì không cần bảng trùng)

Theo đúng chỉ dẫn của phần giao việc: **ô mã giao dịch ngân hàng** (Đ6) — thêm cột trên lần thu, miễn luật "chuỗi ≥ 8 chữ số", **chặn cứng** khi trùng (mã, đơn) bằng UNIQUE, và kiểm "tổng các lần thu gắn cùng mã ≤ số tiền thực chuyển" — không cần bảng luật trùng dùng chung, vì đó là một cột + một UNIQUE + một phép tính tổng, làm thẳng trong `billing` như mọi trường dữ liệu khác. Đây là "nợ có tên" riêng, nên làm thành một việc nhỏ riêng khi chủ muốn, không gộp vào đây.

## Có dùng lại được cho đơn/thanh toán trùng ở nơi khác không

**Có, đó chính là lý do bảng phải "dùng chung".** Đặc tả cũ (§4, §5.1) đã liệt các dòng tương lai sẽ khai vào cùng bảng này: cảnh báo đơn trùng (cùng khách, ngày dịch vụ gần nhau — câu hỏi C1–C3 của tệp Oracle vẫn đang chờ chủ), cảnh báo hồ sơ khách trùng khi tạo ở màn Hồ sơ (C3), cảnh báo hoàn/nộp/trả giống nhau. **Không thiết kế các dòng đó ở đây** — chỉ dựng đúng cơ chế (bảng khai, hàm `kiemTrung`, hộp thoại, bài kiểm) đủ tổng quát để nạp thêm dòng sau mà không sửa lại cơ chế.

## Chưa chắc — cần chủ xác nhận trước khi chuyển sang kế hoạch

1. **Khi cảnh báo hiện ra cho Bán hàng/HDV (người ghi lần thu qua `payment.receive`, không phải Kế toán), hộp thoại có hiện tên và chi tiết của lần thu cũ hay không?** ADR-0089 chỉ cho `ledger.view` phạm vi `any` thấy tên người giữ tiền — nếu áp đúng luật đó, Bán hàng/HDV sẽ thấy cảnh báo "có thể trùng" nhưng **không** thấy lần thu cũ là của ai, chỉ xác nhận hay huỷ mù. Cần chủ xác nhận cách hiện phù hợp.

**Giả định đã ghi, không hỏi lại:**
- Lý do bắt buộc ở CT4 dài tối thiểu **≥ 10 ký tự**, cùng mức các lý do khác của ADR-0092 (đ5c) — ADR-0092 đ6a không ghi số, nhưng dùng chung một mức cho nhất quán là lựa chọn bề mặt, đảo được.
- Bảng khai báo, kiểu dữ liệu và hợp đồng hộp thoại đặt ở một tệp thuần `src/shared/` (không bảng CSDL riêng, vì đ6a/đ6-chéo-đơn chỉ cảnh báo, không cần khoá CSDL để chặn) — đúng luật "`shared/` không import `modules/`". **Câu truy vấn tìm ứng viên trùng** (đọc `bil_payment_receipt`) vẫn nằm trong `billing`, vì đó là module chủ của bảng; `shared/` chỉ giữ phần so sánh thuần và hợp đồng, không tự đi đọc CSDL.
