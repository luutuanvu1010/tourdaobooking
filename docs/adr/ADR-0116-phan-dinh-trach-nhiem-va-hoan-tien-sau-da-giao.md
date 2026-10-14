# ADR-0116 — Phân định trách nhiệm và hoàn tiền sau "Đã giao" (thi hành ADR-0088 điều 9)

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-13: *"duyệt ADR-0115 và 0116 phương án A"*.
  - Chủ duyệt văn bản đề xuất `docs/superpowers/specs/2026-10-13-de-xuat-adr-hc-4-2-va-adr-0088-d9/de-xuat-adr-0088-d9.md` (commit `7781df7f`, nhánh `worktree-agent-a68034ae1a8783c97`), chọn **A ở Q3**, và để nguyên phần "Áp theo khuyến nghị nếu bạn không nói gì".
  - Phụ lục kỹ thuật (quy tắc 1–10, trang ghép, tiêu chí nghiệm thu, ca vàng `SV-PD-01…06`, migration dự kiến) nằm ở tệp đề xuất trên; **tệp này là bản ghi quyết định, tệp kia là chi tiết thi công**. Lệch giữa hai nơi: ADR này thắng.
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Chưa có người kiểm độc lập đọc văn bản; người kiểm đọc sau khi thi công.
- **Ngày:** 2026-10-13.
- **Số:** 0116 (xem ADR-0115 về cách kiểm số).
- **Quan hệ với ADR cũ:** không đổi quyết định nào của ADR-0088. Điều 9 đã **accepted** (lời chủ 2026-10-02 *"ai làm người đó phải chịu"*, bảng T1–T11, Quản trị hoặc Toàn quyền phân định, người ghi ≠ người phân định, 3 ngày làm việc để bên chịu phản hồi, quá 7 ngày công ty tạm chịu và hiện đỏ). ADR này chỉ thêm **cơ chế tối thiểu** để điều 9 chạy được. Không sửa thân ADR-0088.
- **Loại:** việc lớn (tiền, dữ liệu, quyền). Dữ liệu ghi theo luật này là chỉ-thêm (cửa một chiều về dữ liệu); luật và mã đảo được. Cần người kiểm độc lập sau khi thi công.
- **Đóng:** phần còn mở của `TNV-G3` trong `docs/quyen-hoan.json` (hạn 2026-10-31): "đ9 phân định trách nhiệm" và "tin báo người thu cũ / mới". Mục sổ hoãn chỉ do chủ sửa hoặc xoá, khi mã đã lên.
- **Xây trên lỗ đang hở:** TNV-G3 (chính lỗ này), TNV-G4 (phần tin báo Đ5d, cùng hạ tầng tin). Không đi qua đường điều chỉnh tay của HC-4.2 (xem ADR-0115), nên không thêm lỗ HC-4.2.

## Quyết định

1. **Lệnh ba bước, chỉ-thêm:** *Đề nghị* (ai thấy sai sót mở phiếu: đơn, số tiền, lý do) → *Phân định* (Quản trị hoặc Toàn quyền chọn trường hợp T4, T6–T11, bên chịu, số giảm trừ, có tiền ra khách hay không) → *Ghi sổ* (Kế toán, hoặc Toàn quyền nếu không phải người đã phân định, ghi trong **một lô**: khoản giảm trừ, nợ của bên chịu với công ty, và nếu công ty phải trả tiền cho khách thì lần chi hoàn ngay trong lô đó). Đảo bằng dòng đảo, không sửa dòng cũ.
2. **Q3 = A — ai mở phiếu đề nghị:** Kế toán, Quản trị hoặc Toàn quyền (ô mới `attribution.request`). Ai phân định: Quản trị, Toàn quyền (ô mới `attribution.decide`, QT2 đã duyệt). Ghi sổ: `ledger.write`, kèm `payment.refund` nếu có tiền ra.
3. **Người ghi ≠ người phân định**, kiểm theo tài khoản ở máy chủ **và** trigger. Bên chịu là hồ sơ có thật (nhân viên, nhà xe, nhà cung cấp, đại lý) hoặc công ty chủ; **không bao giờ là khách**. Không thêm luật "bên chịu ≠ người ghi" (làm kẹt công ty một Kế toán một chủ).
4. **Bất biến I1 (ADR-0088 đ1) giữ mọi lúc:** sau lô ghi, đã thu ròng = `due_snapshot` − Σ giảm trừ đã phân định. Tiền hoàn cho khách = **đúng** số giảm trừ của lô, và ≤ đã thu ròng trước lô, và không vượt số khách đã trả cho đơn đó. T4 (khách thật sự chưa trả): lần thu trên sổ phải đã đúng thực tế (Thay lần thu trước), nếu không lô bị từ chối.
5. **"Phải thu hiện hành" ở một hàm duy nhất** (Hiến chương 5.4, mở rộng `phaiThuLucGiao`); R-BIL-1 và máy chủ đọc hàm đó; bài `phai-thu-mot-ham.test.ts` vẫn xanh.
6. **Áp theo khuyến nghị:** không đặt hạn chặn (khác hoàn cọc), chỉ nhắc khi đơn đã giao quá 60 ngày chưa xử lý — hiện ở danh sách và ô đếm, không đẩy tin; đơn đã "Hoàn thành" hoặc tháng đã khoá vẫn phân định được, dòng ghi vào tháng đang mở và ngày thật ở ghi chú (như "Thay lần thu"); T9 (đại lý) chỉ ghi nợ, chưa trừ hoa hồng vì sổ đại lý đợt 2 chưa mở; T11 quá 7 ngày hiện đỏ; tin báo cho bên chịu có tài khoản.
7. **Câu chặn cũ `refund_after_delivered` giữ làm hàng rào** cho `POST /api/ledger/refunds`; chỉ đổi đuôi câu chỉ tới màn "Phân định trách nhiệm". Lần trả khách sau Đã giao chỉ được chèn khi có `attribution_id` hợp lệ. Ba trigger của migration `0083` được dựng lại (migration mới, không sửa tệp cũ).
8. **Ngoài phạm vi:** bồi thường cao hơn số khách đã trả cho đơn (chưa có khái niệm "chi bồi thường ngoài đơn"); Nền tảng **không tự trừ lương** — việc khấu trừ lương theo quy chế công ty và pháp luật lao động, ghi chú pháp lý chưa kiểm của ADR-0088 vẫn nguyên giá trị.

## Điều phải nói thẳng

Kế toán vắng thì chủ không ghi thay được (chủ đã phân định): phiếu nằm chờ. Hạn 7 ngày của T11 chỉ nhắc, không tự gán ai. Chưa kiểm: mọi nhà cung cấp trong dữ liệu thật có hồ sơ tổ chức chưa; hệ thống có hàm đếm ngày làm việc chưa.

## Việc kế tiếp (không thuộc ADR này)

Kế hoạch thi công, ca vàng mới (số do AI đề xuất, **cần Kế toán hoặc chủ xác nhận**), dòng mới ở `docs/SO-HANG-RAO.md`, `docs/data-dictionary.json`. Nên thi công **sau** ADR-0115 đợt công nợ (cùng bảng `bil_posting`; tránh hai migration đụng nhau). Hạn 31/10 của `TNV-G3` có thể không kịp: nếu không kịp thì chủ gia hạn bằng diff có lý do.
