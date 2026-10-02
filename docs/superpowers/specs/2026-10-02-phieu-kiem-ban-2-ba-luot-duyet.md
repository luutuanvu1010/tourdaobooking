# Phiếu kiểm độc lập bản 2 — ba lượt duyệt (2026-10-02)

- **Người kiểm:** trợ lý con vai "người kiểm độc lập", chỉ đọc. Không phải người soạn bản 1 hay bản 2.
- **Đối tượng:** bản 2 của lượt 1, 2, 3 và `docs/quyen-hoan.json`, trên nhánh `worktree-quyet-dinh-thu-nghiep-vu` (đã gộp `main` ở `63c422e3`).
- **Kết luận:** **trình được sau khi sửa 11 chỗ nhỏ** (6 nội dung, 5 chữ). Không có lỗi nghiêm trọng.
- **Kiểm chạy:** `node --test src/phat-hien-han.test.ts` đạt 2/2. Thử phá trên bản sao tạm: đặt hạn 2026-10-01 thì bài 2 đỏ, nêu F-02 và TNV-G1. Cây thật không bị đụng.
- **Soát sự thật:** hơn 30 khẳng định mới, so trên `968ecfdb`. Số ADR 0088–0093 và R-BIL-8 còn trống.

## Đối chiếu với hai phiếu duyệt
- **Phiếu A (tiền):**
  - Đã sửa: B2, B4, B5, B6, B7, B8, B10.
  - Sửa một phần: B1 (cách (i)/(ii) của phí huỷ chưa ghi đọc lại 0089 đ1), B3 (hệ quả hoàn sau Đã giao, xem M1), B9 (trần §9).
- **Phiếu B (quyền):**
  - Đã sửa: B1+B6, C1, B3, C2, C3, C4, C5.
  - B2 đã sửa nhưng sinh mâu thuẫn mới (M2).
  - B0: sót vị trí H3.

## Sai sự thật trong bản 2
1. 0088 đ4(i): H3 ở ADR-0026 `:30`, không phải `:31`.
2. 0093, bảng "Thay câu nào": ADR-0071 `:33` ghi máy chủ sinh PIN; bản 2 ghi người tạo đặt PIN.
3. 0091 đ5: lệnh gỡ là lối ghi **thứ ba**, không phải thứ hai, vì `0040:3-4` và `orders/index.ts:887` đã là hai lối.
4. 0092 đ2: R-BIL-13 chưa có mã; bản 2 ghi "nâng mức". 0088 đ7 nhắc "bỏ R-BIL-10 cũ", nhưng R-BIL-10 chưa từng có.

## Mâu thuẫn và chỗ hở
- **M1:** hoàn sau Đã giao vẫn được (KT09), trong khi R-BIL-1 xét mọi lúc ở mức lỗi. Lần hoàn đầu tiên sẽ làm bộ kiểm đỏ và chặn phát hành. Cần một luật tạm.
- **M2:** cột "hết hạn lúc", với NULL = không tạm, không biểu diễn được trạng thái "PIN tạm không hạn" của đ6.
- **M3:** luật "đặt gấp thì qua" gồm cả XEP và DOI_DEN, trái với "chỉ mở XEP".
- **M4:** ADR-0034 điều 4 định nghĩa "Của tôi" theo quan hệ với đơn. Các tin mới (0088, 0090, 0091, 0092, 0093) thiếu dòng ADR-0034.
- **M5:** trong `quyen-hoan.json`:
  - TNV-G3 vẫn ghi theo bản 1;
  - F-02 gồm cả lập đơn và ghi lần thu, nhưng bản 2 chỉ cam kết lệnh hoàn, nộp, Thay;
  - F-03 không có lượt nào xử lý.
- **M6:** lượt 1 §4 trái 0092 đ7(ii). Trần "hoàn ≤ đang giữ" chỉ có từ lượt 2, trong khi nút hoàn mặc định người giữ đã có từ lượt 1. Câu "ứng tiền túi" mơ hồ.

## Trần §9
- **Đếm theo số ADR:** mỗi lượt 2, trong trần 3.
- **Đếm theo quyết định con:** lượt 2 khoảng 6, vượt trần.
- Đây là câu cho chủ, người kiểm không tự kết luận.

## Phiên chính đã sửa (2026-10-02)
Đã sửa cả 11 chỗ:
- **Sự thật 1–4:** sửa đúng vị trí và cách gọi.
- **M1:** thêm 0088 đ4(iv), luật tạm cho hoàn sau Đã giao, gắn với Q-A5.
- **M2:** hai cột `pin_tam`, `pin_tam_het_han_luc`.
- **M3:** luật miễn mốc theo loại dấu; dấu "Ngoại lệ 6 giờ" chỉ miễn XEP.
- **M4:** thêm dòng ADR-0034 điều 1, 4 ở cả năm ADR.
- **M5:**
  - TNV-G3 cập nhật theo 0088 bản 2;
  - F-02: điều kiện duyệt đặc tả 22/9, mở rộng cho thu, hoàn, nộp, Thay (Q-F02 ở phiếu trả lời);
  - F-03: ghi là việc thi công siết theo luật đã có, không cần ADR.
- **M6:** trần "hoàn ≤ đang giữ" đưa vào lượt 1 (0089 đ3b); câu ứng tiền túi viết rõ (0092 đ3); lượt 1 §4 nói rõ hai nhánh (i)/(ii).
- **Trần §9:** lượt 2 duyệt làm hai lần, 2a và 2b.
