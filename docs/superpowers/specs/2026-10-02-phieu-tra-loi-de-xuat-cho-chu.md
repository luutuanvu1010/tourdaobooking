# Phiếu trả lời đề xuất cho chủ dự án — bản 5 (2026-10-02)

> **Phiếu này để làm gì:** gom mọi câu còn mở vào **một lần trả lời**. Mỗi câu có đề xuất kèm lý do.
>
> Quyết định chỉ có hiệu lực khi chủ trả lời (Hiến pháp N3).
>
> **Cách trả lời nhanh:** "Đồng ý tất cả đề xuất, trừ: …".

## Đã xong theo lời chủ
- **ADR-0089 (accepted):** đơn huỷ và cọc.
  - Cọc là tiền trả trước; khách huỷ thì mặc định không hoàn.
  - Quản trị duyệt hoàn, Kế toán chi; không ai vừa duyệt vừa chi.
  - Hạn 60 ngày chỉ chặn duyệt mới, và chỉ cho đơn khách huỷ.
  - Công ty huỷ thì hoàn toàn bộ hoặc dời lịch, không thu thêm, và chỉ nhắc.
  - Đại lý cầm cọc thì trừ vào đối soát.
  - Nhãn tiền: chưa giao là "Khách hàng đã trả trước"; đã giao là "Đã thu"; khách huỷ là "Cọc giữ lại".
  - Điều khoản huỷ ngắn in trên ảnh xác nhận, in luôn đường dẫn chính sách.
  - **Lời chủ lần 5** đã chọn:
    - chuyển tiền sang đơn mới cần Quản trị duyệt;
    - chỉ Quản trị, Toàn quyền chọn "công ty huỷ";
    - huỷ để lập lại không bị hạn chặn;
    - đơn cũ đã hoàn tay thì Toàn quyền ghi bổ sung "đã hoàn ngoài hệ thống" (QH5).
- **ADR-0090 (accepted):** chỉ Toàn quyền đặt lại PIN, gán quyền và tạo tài khoản Kế toán.
- **Luật mới trong CLAUDE.md:** gọi hệ thống là **"Nền tảng"**, không gọi "App".
- **Bảng 11 trường hợp trách nhiệm** (ADR-0088): đã có lời chủ.
- **Cảnh báo lần thu tiền mặt giống nhau** (CT3, CT4): chỉ cảnh báo, người đang ghi bỏ qua được với lý do bắt buộc. Ghi ở ADR-0092 đ6a (nháp lượt 2b).
- **Lớp chống ghi trùng chung**, ba câu V1–V3:
  - giữ vé **365 ngày**, Toàn quyền chọn được;
  - gửi lại thì báo "đã ghi" và mở trang kết quả;
  - bắt buộc từ từ.

  Đã soạn thành **ADR-0094 (proposed)**.

---

## Còn chờ chủ trả lời

### 1. Duyệt văn bản ADR-0094 — lớp chống ghi trùng chung (gấp: F-02 hạn 15/10)
Tệp: `docs/adr/ADR-0094-lop-chong-ghi-trung-chung.md`. Phần chính đã theo lời chủ, và đã qua người kiểm độc lập hai vòng (vòng 1: 3 chỗ chặn, 8 chỗ nên sửa; vòng 2: 4 chỗ nên sửa; đã sửa hết). Có **11 điểm AI tự thêm** khi soạn, chờ chủ. Riêng A-3 và A-4 phải có số thì ADR mới có hiệu lực:

| Mã | Đề xuất | Lý do |
|---|---|---|
| A-1 | Đếm **số lần gửi lặp** của mỗi vé | Chủ muốn dùng lịch sử để đánh giá; không đếm thì không biết một lệnh bị gửi lặp mấy lần |
| A-2 | Màn "Thời hạn giữ vé" dùng chung **ô cài đặt vận hành** của Toàn quyền (ô đang canh bảo trì, trợ lý) | Không phải thêm một dòng quyền mới |
| A-3 | **Sàn 90 ngày**; lựa chọn **90 / 180 / 365 (mặc định) / 730 ngày / Không dọn** | Sàn lớn hơn 30 ngày theo lời chủ; vẫn an toàn cho chống trùng |
| A-4 | **Rút ngắn** thời hạn: chờ **7 ngày** rồi mới xoá; kéo dài thì có tác dụng ngay | Lỡ tay rút ngắn thì vẫn kịp đổi lại, không mất dữ liệu |
| A-5 | Dọn **mỗi ngày một lần**, khoảng 2 giờ sáng, mỗi đêm tối đa 250.000 vé | Theo kịp lượng vé mới; nhật ký gọn (1–2 dòng mỗi ngày); sau một lần rút ngắn lớn thì khoảng 12 ngày là dọn xong |
| A-6 | Bản siết (bắt buộc có vé) bật sau **7 ngày** liên tiếp không còn máy cũ gửi thiếu vé | Đủ thời gian cho mọi người lên bản mới |
| A-7 | Tên kỹ thuật của bảng, ngoại lệ, nhật ký | Chỉ là tên |
| A-8 | Thêm một **khái niệm lõi** vào Hiến chương: "mỗi lệnh ghi chạy đúng một lần dù gửi lại" | Hiến chương chỉ chủ sửa được |
| A-9 | Đóng lỗi gửi lặp (F-02) khi **bản đầu** lên production và 6 kịch bản lỗi chạy lại đạt | Kịp hạn 15/10. Cách khác: chờ bản siết, an toàn hơn nhưng dễ trễ hạn |
| A-10 | Mọi lệnh tạo mới phải cho biết **địa chỉ trang kết quả**, để khi gửi lại Nền tảng mở thẳng trang đó (đơn vừa tạo…) | Không có địa chỉ thì "Lập đơn" gửi lại chỉ tải lại trang, thấy form trống |
| A-11 | Màn chỉnh thời hạn và việc dọn vé có thể ra **bản sau** (trước ngày thứ 90) | 90 ngày đầu chưa có vé nào cần dọn; bản đầu nhẹ hơn, dễ kịp hạn 15/10 |

**Kèm theo:**
- ADR-0094 cần **ngoại lệ thứ hai** cho luật "không xoá cứng", để dọn vé quá hạn (chỉ bảng vé, chỉ chạy theo lịch, có nhật ký).
- Khi triển khai, **bạn phải đặt một khoá bí mật trước**. Thiếu khoá thì mọi màn báo lỗi.
- Gửi lặp lệnh tạo tài khoản hay đặt lại PIN sẽ **không hiện lại PIN**; khi đó bấm đặt lại PIN lần nữa (Nhân sự không tự đặt lại được, phải nhờ Quản trị; tài khoản Kế toán thì nhờ Toàn quyền).
- **Lưu ý về dữ liệu:** tỷ lệ huỷ và hoàn của **đơn** vốn đã được giữ vĩnh viễn trong dữ liệu đơn và sổ tiền. Bảng vé chỉ thêm số liệu ở mức **lệnh** (bao nhiêu lần gửi lặp, bị từ chối, lỗi).

**Lưu ý hạn:** lỗi gửi lặp (F-02) có hạn **15/10**. Nếu không kịp thi công, bạn gia hạn kèm lý do.

### 2. Các lượt sau (chưa gấp)
- **Lượt 2b, sổ tiền:**
  - **Q-A1:** trần phiếu điều chỉnh; người bị đổi số nhận tin báo.
  - **Q-A2:** ô mã giao dịch ngân hàng: chặn trùng trong cùng đơn, cảnh báo khi trùng ở đơn khác.
  - **Đề xuất:** đồng ý cả hai.
- **Lượt 2a và 2b:** duyệt văn bản ADR-0088, ADR-0092.
- **Lượt 3, PIN tạm và ngoại lệ 6 giờ:** Q-B1, Q-B3–Q-B9 như phiếu bản 3. **Đề xuất:** đồng ý cả.

### 3. Việc ngoài Nền tảng
- Trang `tourdao.vn/chinh-sach-thanh-toan` đang là bản nháp. Chủ đã biết và chấp nhận in luôn đường dẫn.
