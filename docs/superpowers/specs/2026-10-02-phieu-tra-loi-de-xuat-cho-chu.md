# Phiếu trả lời đề xuất cho chủ dự án — bản 3 (2026-10-02)

> **Phiếu này để làm gì:** gom mọi câu còn mở vào **một lần trả lời**. Mỗi câu có đề xuất kèm lý do; chi tiết và phương án khác nằm ở văn bản từng lượt.
>
> **Đề xuất** đến từ người duyệt độc lập và nghiên cứu khung Oracle. Quyết định chỉ có hiệu lực khi chủ trả lời (Hiến pháp N3).
>
> **Cách trả lời nhanh:** "Đồng ý tất cả đề xuất, trừ: …".

## Đã có lời chủ (chat 2026-10-02) — đã viết vào văn bản

| Câu | Lời chủ | Ghi ở |
|---|---|---|
| Cọc khi khách huỷ | mặc định không hoàn; công ty có thể hoàn, không bắt buộc; tối đa 60 ngày sau ngày khởi hành dự kiến | ADR-0089 đ1–đ4 |
| Thiếu tiền hoặc bồi thường sau "Đã giao" | ai làm người đó chịu, phân định rạch ròi | ADR-0088 đ9 |
| Chống gửi trùng | mọi lệnh ghi đều phải có, theo khung Oracle | đặc tả 22/9 (đã duyệt) + đặc tả mở rộng |
| QH1 — cọc là gì | **cọc là tiền trả trước** | ADR-0089 đ2 |
| QH2 — công ty huỷ | **hoàn toàn bộ tiền đã trả trước, hoặc dời lịch; khách không phải trả thêm** | ADR-0089 đ8 |
| QH3 — ai duyệt hoàn cọc | **Quản trị** | ADR-0089 đ3 |
| QH4 — huỷ vì nhập sai hoặc trùng đơn | **ok**; cơ chế chống đặt trùng làm **về sau** | ADR-0089 đ8 |
| QH6 — hạn 60 ngày chỉ chặn duyệt mới | **ok** | ADR-0089 đ4 |
| QH8 — in điều khoản huỷ lên xác nhận đơn | **có, ngắn gọn**, trỏ tới chính sách bán hàng trên website | ADR-0089 đ5a |
| QT1–QT4 — bảng 11 trường hợp trách nhiệm | **ok** | ADR-0088 đ9 |
| Bán hàng phá lệ 6 giờ | cho phép, có nhãn riêng | ADR-0091 |

---

## Còn chờ chủ trả lời

### A. Hai "cách hiểu" — giải thích lại cho dễ hiểu

**A1. Màn Danh bạ có cần chống tạo trùng hồ sơ khách không?**
- **Chuyện có thể xảy ra:** ở màn Danh bạ (không phải lúc lập đơn), nhân viên bấm **"Tạo hồ sơ khách"**. Mạng chập chờn khiến điện thoại gửi hai lần, nên ra **hai hồ sơ giống hệt nhau** cho cùng một khách.
- **Bạn đã nói** "đều phải có cơ chế chống trùng". AI hiểu là chặn **cả ở màn này**, nhưng muốn bạn xác nhận cho chắc.
- **Đề xuất: Có, chặn luôn.**
- **Lý do:** đúng ý "mọi lệnh ghi"; tốn khoảng nửa ngày công; tránh phải gộp hồ sơ bằng tay về sau.

**A2. Cọc công ty giữ lại thì ghi vào sổ sách kế toán như thế nào: để Kế toán quyết?**
- **Chuyện cần quyết:** khách huỷ, công ty giữ cọc. Trong **sổ sách kế toán của công ty** (không phải trong app), khoản này có thể ghi theo hai cách:
  - ghi **ngay** thành thu nhập;
  - ghi là **tạm giữ** trong 60 ngày (vì còn có thể hoàn), hết hạn mới thành thu nhập.
- Đây là nghiệp vụ kế toán, không phải việc của app. App chỉ cần hiện đủ số: đã trả, đã duyệt hoàn, đã hoàn, còn giữ, hạn.
- **Đề xuất: để Kế toán của công ty quyết.** App không tự gắn nhãn kế toán.

### B. Lượt 1a — đơn huỷ và cọc (gấp, hạn 15/10)
| Mã | Câu hỏi | Đề xuất | Lý do |
|---|---|---|---|
| **QH5** | Đơn cũ **đã hoàn tay** trước khi có sổ | Toàn quyền **ghi bù một lần**, có lý do, **không áp hạn 60 ngày** | Sổ phải ghi đúng việc đã xảy ra |
| **QH7** | Đơn của **đối tác mà đại lý cầm cọc** | Cọc là của công ty; đại lý **nộp về** hoặc **bù trừ** ở kỳ đối soát đại lý | Thống nhất với cách tính hoa hồng sắp làm |
| **QH9** (mới) | Hoàn cho nhóm **"công ty huỷ"** có bị hạn 60 ngày chặn không | **Không chặn**, chỉ nhắc khi quá hạn | Đây là nghĩa vụ của công ty với khách, không phải hoàn tuỳ ý |
| **Trang chính sách** | Ngày 2/10, AI **không tìm thấy** trang chính sách bán hàng trên tourdao.vn: trang chủ không có liên kết, các đường dẫn thường gặp đều báo không tồn tại | Bạn gửi đường dẫn nếu đã có. Nếu chưa có, cần **tạo trang trên website** trước; trong lúc đó dòng điều khoản trên ảnh xác nhận chưa in đường dẫn | Không in đường dẫn dẫn tới trang không tồn tại |
| **Duyệt văn bản** | Duyệt văn bản **lượt 1a** (ADR-0089) và **lượt 1b** (ADR-0090: chỉ Toàn quyền cấp quyền tiền, tạo tài khoản Kế toán, đặt lại PIN của họ) | **Duyệt**, để chuyển vào quyết định chính thức và bắt đầu thi công | Hạn 15/10 |

### C. Chống trùng — đặc tả mở rộng theo Oracle
| Mã | Câu hỏi | Đề xuất | Lý do |
|---|---|---|---|
| **CT1** | Cùng mã lần gửi nhưng **khác nội dung**, ở lệnh tiền | **Báo lỗi 409** "lần gửi trước đã ghi với nội dung khác, tải lại để xem" | Không lặng lẽ bỏ số mới, không ghi hai lần |
| **CT2** | Thứ tự phát hành | Giao diện gửi mã trước, máy chủ nhận tuỳ chọn; khi mọi người đã lên bản mới thì **bắt buộc** | Máy còn bản app cũ không bị lỗi bất ngờ |
| **CT3** | Cảnh báo lần thu **tiền mặt** giống nhau (cùng đơn, số tiền, ngày) | **Có**, chỉ cảnh báo; người ghi bấm "vẫn ghi" kèm lý do | Hai lần thu thật cùng số vẫn có thể xảy ra |
| **CT4** | Ai được bỏ qua cảnh báo trùng | **Người đang ghi**, lý do bắt buộc, ghi nhật ký; Kế toán thấy danh sách đã bỏ qua | Cách của Oracle: người nhập tự quyết nhưng có dấu vết |
| **CT5–CT8** | Thuộc phần "cảnh báo đơn trùng", bạn đã nói **làm về sau** | Để sau, cùng đợt "chống đặt trùng" | Theo lời bạn ở câu 4 |

### D. Lượt 2b — sổ tiền
| Mã | Câu hỏi | Đề xuất | Lý do |
|---|---|---|---|
| **Q-A1** | Trần phiếu điều chỉnh | Giảm nợ của ai thì không quá số người đó đang nợ; tăng nợ có trần; lý do ≥ 10 ký tự; **người bị đổi số nhận tin báo** | Lần thử mất tiền là xoá 100.000 tiền mặt với lý do một dấu chấm |
| **Q-A2** | Ô mã giao dịch ngân hàng | **Có**: chặn trùng trong cùng đơn; cảnh báo khi trùng ở đơn khác; tổng các lần thu gắn cùng mã ≤ số tiền chuyển | Lần thử: hai người khai cùng một khoản chuyển, công ty mất 100.000 |

### E. Lượt 3 — PIN tạm và ngoại lệ 6 giờ
| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| **Q-B1** | Hạn PIN tạm | Đặt lại 24 giờ; tạo tài khoản mới 7 ngày |
| **Q-B6** | Tài khoản cũ có PIN do người khác đặt | Khoảng 30 tài khoản nội bộ đổi PIN một lần; đối tác không bắt |
| **Q-B3** | Giờ được phá lệ | Mọi giờ, chỉ khi đơn đang thật sự bị mốc chặn; Quản trị có ô đếm theo người |
| **Q-B4** | Báo Quản trị | Chỉ hộp thông báo, không đẩy ra điện thoại |
| **Q-B5** | Ai **không** được phá lệ | Đối tác, HDV, Thực tập, Kế toán |
| **Q-B7** | Lệnh nào được phá lệ | Xác nhận, sửa giờ hoặc nơi dưới mốc, đưa khách chưa có xe lên xe, thêm điểm khi xe chạy; chưa cho đổi xe hay tài xế |
| **Q-B8** | Đối tác thấy nhãn không | Thấy loại nhãn, không thấy ai làm, vì sao |
| **Q-B9** | Toàn quyền nhận tin ở đâu | Ngăn "Tất cả" |

---

## Sau khi chủ trả lời
1. **Kiểm cuối:** một người kiểm độc lập soát văn bản cuối của lượt 1a, 1b. AI chép lời chủ nguyên văn, đổi trạng thái sang đã duyệt, chuyển vào `docs/adr/`. Bước này cần chủ bấm đồng ý khi máy hỏi quyền sửa ADR.
2. **Thi công theo thứ tự:**
   - **lượt 1a + 1b**, cùng chống trùng cho mọi lệnh ghi đang có (hạn 15/10; không kịp thì chủ gia hạn có lý do);
   - rồi **2a, 2b** (hạn 31/10);
   - rồi **3**;
   - "chống đặt trùng" (cảnh báo đơn trùng) làm về sau, theo lời chủ.
3. Mỗi lượt có người kiểm độc lập. Kịch bản thử thật đêm 1→2/10 chuyển thành bài kiểm tự động.
