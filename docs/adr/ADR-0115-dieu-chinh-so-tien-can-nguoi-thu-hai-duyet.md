# ADR-0115 — Điều chỉnh sổ tiền cần người thứ hai duyệt; trần điều chỉnh tính cộng dồn

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-13: *"duyệt ADR-0115 và 0116 phương án A"*.
  - Chủ duyệt văn bản đề xuất `docs/superpowers/specs/2026-10-13-de-xuat-adr-hc-4-2-va-adr-0088-d9/de-xuat-hc-4-2.md` (commit `7781df7f`, nhánh `worktree-agent-a68034ae1a8783c97`), chọn **A ở cả Q1 và Q2**, và để nguyên phần "Áp theo khuyến nghị nếu bạn không nói gì" cùng mục "Lệch có chủ ý" (trần cộng dồn chỉ có lớp máy chủ, không có lớp CSDL).
  - Phụ lục kỹ thuật (quy tắc 1–10, trang ghép, tiêu chí nghiệm thu, ca vàng, migration dự kiến) nằm ở tệp đề xuất trên; **tệp này là bản ghi quyết định, tệp kia là chi tiết thi công**. Lệch giữa hai nơi: ADR này thắng.
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Văn bản chưa có người kiểm độc lập đọc; người kiểm đọc sau khi thi công.
- **Ngày:** 2026-10-13.
- **Số:** 0115. Đã kiểm mọi nhánh tại thời điểm soạn: 0114 giữ cho đề xuất "sửa số khách" (chưa duyệt), không nơi nào dùng 0115.
- **Loại:** việc lớn (tiền, quyền, dữ liệu). Dữ liệu ghi theo luật này là chỉ-thêm, nên là cửa một chiều về dữ liệu; luật và mã đảo được. Cần người kiểm độc lập, chỉ đọc, sau mỗi đợt thi công.
- **Sửa/bổ sung:** ADR-0092 đ5 — đ5e ("lượt này không làm luồng duyệt hai người") được thay bằng luật dưới đây; đ5b ("trần tính từng lệnh") thay bằng trần cộng dồn. Không sửa thân ADR-0092.
- **Đóng:** mục `HC-4.2` trong `docs/quyen-hoan.json` (hạn 2026-10-31) và mã C-2 của hồ sơ kiểm 2026-10-13. Mục sổ hoãn chỉ do chủ sửa hoặc xoá, khi mã đã lên.
- **Xây trên lỗ đang hở:** HC-4.2 (chính lỗ này).

## Quyết định

1. **Lệnh điều chỉnh không đổi số dư ngay.** Nó thành một *yêu cầu chờ duyệt*. Người thứ hai, **khác người tạo (so theo tài khoản)**, duyệt hoặc từ chối (từ chối phải ghi lý do). Chỉ lúc duyệt, số dư mới đổi, và máy chủ kiểm lại mọi giới hạn ở lúc đó. Yêu cầu quá 7 ngày không ai duyệt thì tự hết hạn (tính lúc đọc), không bao giờ tự duyệt. Người tạo rút được khi chưa ai quyết.
2. **Q1 = A — ai duyệt:** Toàn quyền, Quản trị hoặc Kế toán, miễn khác người tạo. Thêm một ô quyền mới `ledger.adjust.approve` cho ba nhóm này. Quản trị chỉ thấy danh sách yêu cầu chờ duyệt, không thấy cả sổ.
3. **Q2 = A — áp cho lệnh nào:** lệnh `dieu_chinh` của công nợ (`POST /api/ledger/adjustments`) **và** lệnh điều chỉnh chi phí chuyến xe (`POST …/chi-phi/dieu-chinh`), làm thành **hai đợt thi công nối nhau** (công nợ trước, chi phí chuyến sau; đợt trước đóng hẳn mới sang đợt sau). Không áp cho đảo lần thu, đảo dòng, Thay lần thu, đảo/chụp lại chi phí chuyến, giá thoả thuận (các lệnh này sinh dòng bằng luật cố định từ một dòng gốc; ghi là *dựa vào kỷ luật*, không phải hàng rào máy).
4. **Trần điều chỉnh tính cộng dồn:** mọi lệnh tăng nợ đã có trên đơn + các yêu cầu tăng nợ đang chờ + lệnh mới ≤ trần của Đ5b. Lệnh giảm nợ giữ Đ5a (không đổi dấu) và kiểm lại theo số dư *lúc duyệt*. Công thức ở một hàm duy nhất (Hiến chương 5.4). Kiểm cả lúc tạo và lúc duyệt.
5. **Giữ nguyên các quy tắc áp theo khuyến nghị:** ngày phát sinh phải thuộc tháng còn mở lúc duyệt (tháng đã khoá thì 409 và người tạo tạo lại); sửa nhầm một lệnh đã duyệt bằng lệnh "đảo dòng" sẵn có; tin báo cho người duyệt, người tạo và bên bị đổi số dư (đóng ADR-0092 Đ5d); mọi lệnh mới đi qua lớp chống ghi trùng ADR-0094.
6. **Không có ngưỡng "dưới X thì tự duyệt".** Hiến chương hệ thống 4.2 đòi người duyệt riêng; dự án không được nới ba văn bản nền.
7. **Lệch có chủ ý đã chủ duyệt:** trần cộng dồn không có lớp CSDL (trigger `billing` chỉ đọc bảng `bil_`, ADR-0024 đ5; phải thu nằm ở `orders`). Lớp bù: kiểm lại lúc duyệt ở máy chủ và một quy tắc kiểm định kỳ mới trong `audit-invariants`. Không tệ hơn ADR-0092 Đ5b hiện nay.

## Điều phải nói thẳng (rủi ro vận hành đã chủ biết khi duyệt)

Kế toán không còn "sửa là xong ngay". Công ty chỉ có một Kế toán và một chủ thì chủ vắng là lệnh đứng tới khi hết hạn 7 ngày (số dư giữ nguyên, không mất tiền). Luật tách theo **tài khoản**, không theo người thật: một người giữ hai tài khoản thì tự duyệt cho mình được và máy không phát hiện.

## Việc kế tiếp (không thuộc ADR này)

Kế hoạch thi công hai đợt, ca vàng mới (`SV-DC-01…05`, số do AI đề xuất, **cần Kế toán hoặc chủ xác nhận**), dòng mới ở `docs/SO-HANG-RAO.md` khi quan sát chặn thật, cập nhật `docs/data-dictionary.json`. Thi công sau ADR-0116 hoặc cùng ngày thì tránh cùng số migration (cả hai chạm `bil_posting`). Hạn 31/10 của `HC-4.2` có thể không kịp hai đợt: nếu không kịp thì chủ gia hạn bằng diff có lý do, không bỏ mục.
