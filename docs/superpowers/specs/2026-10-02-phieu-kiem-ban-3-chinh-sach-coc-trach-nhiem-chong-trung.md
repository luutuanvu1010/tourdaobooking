# Phiếu kiểm độc lập bản 3 — chính sách cọc, phân định trách nhiệm, chống trùng (2026-10-02)

- **Người kiểm:** trợ lý con, vai "người kiểm độc lập", chỉ đọc. Không phải người soạn.
- **Đối tượng:** các thay đổi sau lời chủ ngày 2/10 về cọc, trách nhiệm và chống trùng (trước commit bản 3.1).
- **Kết luận:** **trình được sau khi sửa 9 chỗ**.
  - Lõi chính sách cọc (ADR-0089 đ1–đ4) khớp lời chủ.
  - Không còn sót logic cũ "chờ hoàn = đã thu".
- **Kiểm chạy:**
  - `node --test src/phat-hien-han.test.ts`: 2/2 đạt.
  - `docs/quyen-hoan.json` là JSON hợp lệ, có 5 mục HIGH.
- **Sự thật đã kiểm đúng:** hơn 14 khẳng định, cộng 5/5 trích dẫn Oracle, kiểm bằng curl.

## Chín chỗ phải sửa và cách đã sửa ở bản 3.1
| # | Phát hiện | Đã sửa |
|---|---|---|
| A1 | ADR-0088 tự mâu thuẫn: phải thu = `due_snapshot` nhưng đ9 có giảm trừ, chi hoàn sau Đã giao | I1 = `due_snapshot` − giảm trừ đã phân định (đ1, đ5, trigger, bảng Thay câu); T4 đi qua giảm trừ + nợ bên chịu, không dùng lần thu giả |
| A2 | ADR-0089 đặt phép tính ở `phaiThuCua` của `orders`, mà hàm này không được đọc `bil_*` | Tính ở `billing.conLai` với cờ đơn huỷ (đ1, Thay câu, trang ghép, `quyen-hoan.json` TNV-G1) |
| A3 | Bất biến "tổng duyệt ≤ cọc giữ lại (ròng)" sai khi đã chi một phần | Tách "đã trả" (gộp) và "còn giữ" (ròng); bất biến: tổng chi ≤ tổng duyệt ≤ đã trả |
| A4 | "Công ty huỷ" là thêm mới; route huỷ không đọc lý do; chưa có mặc định khi chưa phân loại; huỷ vì nhập sai hay trùng đơn mà giữ cọc thì khách bị thu hai lần | Ba nhóm lý do, bắt buộc chọn; nhóm "chưa kết luận" dùng câu trung tính; thêm QH4 |
| A5 | F-02 hạn 15/10 gồm mọi lệnh tiền, nhưng phiếu chỉ đưa vài lệnh vào đợt 1 | `quyen-hoan.json` F-02 và phiếu trả lời: đợt 1 gồm mọi lệnh ghi; không kịp thì chủ gia hạn |
| B6 | Viện dẫn sai "Hiến chương 4.4 (tách duyệt và chi)" | 4.4 chỉ dùng cho danh sách trắng chứng từ; tách nhiệm vụ dẫn ADR-0072 đ1, ADR-0026 H4 |
| B7 | "Không nhận nhập tay từ 26/9" sai: ADR-0061 đã mở lại bằng công tắc | Phiếu: câu 3 của đặc tả cảnh báo đơn trùng thành CT8 |
| B8 | Chữ cũ (phí huỷ ở lượt 2; F-02, TNV-G3, TNV-G4 trong sổ còn ghi "bản 2", "chờ Q-A5") | Đã dọn |
| C9 | Đặc tả 22/9 ghi câu 2 = (b) như lời chủ, trong khi đó là cách hiểu; đặc tả Oracle còn "chưa làm"; câu 3 "áp ngay ARCHITECTURE.md" chưa có diff | Gắn nhãn "cách hiểu, chờ chủ xác nhận"; thêm bảng đối chiếu mã câu; ghi rõ diff Hiến chương chưa làm, cần chủ duyệt (N9) |

## Các chỗ trung thành với lời chủ (đã gắn "(đề xuất)" + câu hỏi)
- **Cách hạch toán "thu nhập khác":** suy luận, Kế toán chốt.
- **Ngoại lệ dữ liệu cũ** không áp hạn 60 ngày: QH5.
- **Hạn 60 ngày** chỉ chặn duyệt mới: QH6.
- **Đại lý cầm cọc:** QH7.
- **In điều khoản huỷ** lên xác nhận đơn: QH8.
- **T11 quá 7 ngày:** QT4.
- **T7** gắn nợ theo đơn, vì trigger `0045:219` chặn dòng gắn chuyến.
- **Va chạm đ9 với ADR-0026 đ10** (Quản trị bị bỏ khỏi ô hoàn): ghi ở trang ghép lượt 2, nhắc một lần (P18).
