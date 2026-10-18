# Rà soát ngôn ngữ giao diện toàn Nền tảng (2026-10-18)

- **Loại:** hồ sơ có ngày (đóng băng sau khi chủ duyệt; có gì mới thì viết bản mới trỏ về đây).
- **Nêu bởi:** chủ dự án, nguyên văn: *"kiểm tra lại ngữ nghĩa, giải thích trong Đơn hàng đối với "Thay lần thu", "Đảo", Ghi lần thu. Đây là những cụm từ rất tối nghĩa và không phổ thông. Chúng ta cần rà soát lại toàn bộ dự án về giao diện để đảm bảo ngôn ngữ là chuẩn mực, dễ hiểu và phổ thông trong ngành"*.
- **Cách làm:** ba trợ lý chỉ đọc quét song song ba mảng (tiền/kế toán; đơn hàng/vận chuyển; quản trị/tài khoản/trợ giúp), đọc mã thật để nói đúng nghĩa từng nhãn. Chưa có người kiểm lại kết quả quét.
- **Trạng thái:** `đề xuất, chờ chủ chọn tên`.
- **Liên quan:** `docs/BACKLOG.md` §25 (chủ đã chốt 2026-10-08: "lần thu" → "khoản thu", chưa làm); ADR-0025, ADR-0026, ADR-0088 (đặt tên "Thay lần thu", câu báo "Dùng 'Thay lần thu'"), ADR-0095 (đảo dòng chi phí xe).

## 1. Ba nút trên trang Đơn hàng: bấm thì máy làm gì

Cả ba nằm ở thẻ Thanh toán của trang đơn (`web/order.ts`: `nutGhiThu`, `nutKeToanLanThu`).

**"Ghi lần thu"** — ghi lại một lần khách trả tiền cho đơn. Ai được thu tiền đơn này đều thấy (Bán hàng/Thực tập với đơn của mình, HDV với đơn được giao, Đối tác với đơn của mình, Kế toán/Quản trị/Toàn quyền với mọi đơn), khi đơn chưa "Đã giao". Form hỏi số tiền, hình thức (mặc định Chuyển khoản), ai nhận tiền (Công ty / Tôi thu); Kế toán có thêm ngày và mã giao dịch ngân hàng. Bấm "Ghi" thì máy ghi một dòng thu vào sổ; nếu nhân viên tự cầm tiền thì máy ghi thêm "nhân viên đang giữ tiền của công ty"; nếu nhân viên khai khách chuyển khoản vào công ty thì dòng đó chờ Kế toán bấm "Xác nhận đã nhận".

**"Đảo"** — huỷ một lần thu ghi sai. Chỉ Kế toán và Toàn quyền thấy, chỉ trước "Đã giao". Máy không xoá dòng cũ (luật không xoá cứng) mà ghi thêm một dòng ngược cùng số tiền, để tổng đã thu trở về như chưa ghi; các khoản "nhân viên đang giữ" sinh ra từ dòng đó cũng được ghi ngược. Không ghi khoản thu mới nào thay thế. Bắt buộc ghi lý do.

**"Thay lần thu"** — sửa một lần thu ghi sai (sai số tiền, sai hình thức, sai người thu). Chỉ Kế toán và Toàn quyền thấy, cả trước lẫn sau "Đã giao" (sau "Đã giao" đây là cách sửa duy nhất, ADR-0088). Máy làm hai việc trong một lần ghi không tách rời: huỷ dòng cũ như nút "Đảo", và ghi dòng đúng. Nếu đơn đã giao thì tổng đã thu sau khi sửa phải giữ nguyên bằng số phải thu. Lý do ít nhất 10 ký tự.

Ngoài ba nút này còn **"Ghi bù lần thu"** (đơn đã giao mà còn thiếu tiền: chỉ thêm, không huỷ gì).

Vì sao khó hiểu: "lần thu" là chữ tự đặt (ngành gọi là khoản thu / phiếu thu); "Đảo" là cách nói tắt của "ghi bút toán đảo", người không làm kế toán không hiểu, lại trùng chữ "Tour Đảo"; trước "Đã giao" hai nút "Thay" và "Đảo" nằm cạnh nhau mà không chữ nào nói khi nào dùng nút nào; dòng ngược hiện số dương, không dấu trừ, nên trông như khách trả hai lần.

## 2. Quyết định cần chủ (lượt 1 — chữ tiền trên trang Đơn hàng)

| # | Hiện tại | Đề xuất (khuyến nghị đứng đầu) | Ghi chú |
|---|---|---|---|
| Q1 | "Đảo" / "Ghi dòng đảo" / "(dòng đảo)" / "(đã đảo)"; chi phí xe: "Đảo dòng" | **"Huỷ khoản thu"** (nút xác nhận "Huỷ khoản này"; dòng gốc ghi "(đã huỷ)", dòng ngược ghi "Huỷ khoản thu trên" kèm dấu trừ) · "Ghi giảm khoản thu" · "Bút toán đảo" (giữ thuật ngữ kế toán) | Sổ vẫn không xoá dòng nào; chỉ đổi chữ và hiện dấu trừ |
| Q2 | "lần thu" → "khoản thu" | **Áp đúng tên chủ đã chốt 8/10**: "Ghi khoản thu", "Sửa khoản thu đã ghi", "Ghi bù khoản thu" | Không hỏi lại; phương án khác trợ lý nêu: "Ghi nhận thanh toán", "phiếu thu" (phiếu thu là chứng từ tiền mặt mẫu 01-TT, dùng cho chuyển khoản không đúng) |
| Q3 | Luật chung cho chữ giao diện | **Bảng từ chuẩn một nơi + bài kiểm tự quét chặn từ đã loại** (`npm test` đỏ nếu chữ cũ quay lại giao diện, trợ giúp, câu lỗi) · chỉ ghi bảng từ, không bài kiểm | Theo "Khuôn trước, việc sau"; bảng từ là tài liệu sống, ADR mới ghi lại các tên đổi so với chữ trong ADR-0088 |

## 3. Việc tôi tự làm trong lượt 1 (đã có luật hoặc đúng sai rõ, đảo ngược được)

- Sửa câu lặp "Đơn đã Đã giao…" (khoảng 8 chỗ).
- Đổi "app"/"App" còn sót trong Trợ giúp và giao diện thành "Nền tảng" (khoảng 90 chỗ; luật chủ đã chốt 2026-10-02). Tên riêng "Island Booking System", "Tour Đảo Booking" giữ nguyên.
- Trợ giúp chỉ sai nút: gọi nút trợ lý là [[Hỗ trợ]] (nút thật là "Trợ lý"); mục gộp hồ sơ ghi "chưa có ở bản này" (đã có); "tạm khoá hoặc cho nghỉ việc" (nút thật là "Ngưng"); "Danh mục lý do" (trang thật là "Lý do điều phối"); "Sáu phần" (trang Trợ lý có bảy mục). Thêm hướng dẫn nút "Sửa khoản thu đã ghi" cho Kế toán (đang thiếu hẳn).
- Một nút một tên: "Xác nhận đã nhận" / "Công ty đã nhận" (câu máy chủ chỉ tới tên thứ hai); "Người nhận tiền" / "Người thu".
- "Bỏ dấu" → "Bỏ đánh dấu" (trang nhập phần mềm kế toán; "bỏ dấu" dễ hiểu là bỏ dấu thanh).
- "Giữ đơn" (nút trong hộp huỷ, nghĩa là không huỷ) → "Không huỷ".

## 4. Để lượt 2 (tên khái niệm lớn, mỗi tên đụng nhiều màn — chủ chọn sau, tối đa 3 tên mỗi lượt)

Tiền / kế toán: "giữ hộ", "đang giữ" (3 nghĩa: nhân viên cầm tiền công ty, công ty giữ tiền khách, đơn bị chặn); tiền trả trước có 4 tên (Thanh toán trước / trả trước / thu trước / tiền cọc); trả lại khách có 5 tên (Ghi hoàn, Ghi chi hoàn, Hoàn khách, Trả lại khách, Đã hoàn ngoài hệ thống); "Đã giao – đã thu đủ"; "Mức TA" (chữ Anh); "Quyết toán (nộp / trả)"; "Bên được nợ"; câu khoá tháng "khôi phục cả cơ sở dữ liệu".

Đơn hàng / vận chuyển: "chuyến" dùng cho cả lịch đi tour của đơn lẫn chuyến xe; "chặng" (đề xuất "lượt đón"); "mốc" gánh 4 nghĩa, một cài đặt hai tên hai đơn vị ("Mốc tối thiểu (giờ)" / "Mốc ra lệnh (phút)"); "xuất bến" (dễ hiểu là bến tàu); "suất"; "Tải 12/16"; "Lên kế hoạch"; "Bị giữ"; "Phá lệ"; "Bác" (từ chối); "Kết thúc gián đoạn"; "Thu hồi xuất bến"; "Dòng tiền" (nghĩa kế toán là cash flow); nút đóng hộp có 6 tên (Huỷ / Huỷ bỏ / Thôi / Đóng / Quay lại / Giữ nguyên); "Chờ xác nhận" và "Đơn nháp" cho cùng trạng thái; "chưa ai nhận" có 5 tên; "Nhà xe" / "Chủ xe"; "đối tác" dùng cho 3 loại.

Quản trị / tài khoản: "vai" (đề xuất "chức danh"); "phiên" (đề xuất "máy đang đăng nhập"); "hiệu lực"; "Tổ chức", "Công ty chủ"; "Ghi đè" giá; "Hỗ trợ / Trợ lý / Góp ý / Trợ giúp" lẫn nhau; "Ngưng / tạm khoá / Ngừng dùng / Tắt / Đóng / Kết thúc" cho cùng việc thôi dùng; "Tôi" / "Của tôi"; câu lỗi lộ tên trường lập trình (expectedUpdatedAt, PERSON, YYYY-MM-DD… khoảng 60 chỗ).

## 5. Lỗi logic phát hiện kèm (không phải chữ; chạm tiền ⇒ việc lớn, làm riêng)

- Nút "Thay lần thu" hiện trên khoản chuyển khoản còn chờ xác nhận, mà máy chủ luôn từ chối.
- Nút "Đảo" hiện cả trên dòng hoàn tiền và trên đơn huỷ.
- Câu hỏi "công ty đã nhận … vào tài khoản?" hiện cả với khoản tiền mặt nhân viên khai "Công ty thu".
- Sơ đồ trang cho Trợ lý Mai thiếu các nút dựng bằng hộp xác nhận (Đảo, Thay lần thu, Xác nhận đã nhận…).
- Nhật ký hiện mã hồ sơ thô ("đối tác <mã>") ở dòng mức hoa hồng.

Chính tả: dự án theo kiểu "huỷ, xoá, khoá, hoà, tuỳ" và nhất quán tuyệt đối (0 chỗ "hủy/xóa/khóa"); giữ nguyên kiểu này.
