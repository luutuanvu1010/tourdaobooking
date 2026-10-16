# ADR-0126 — Quyền riêng tư: chính sách có phiên bản, đồng ý, yêu cầu xoá, ẩn danh hoá, lưu giữ

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-16: *"duyệt cả ba"* (lượt 4; văn bản đề xuất: `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/DE-XUAT-ADR.md`, mục ADR-H4; "H4" là số giữ chỗ, nay là 0126).
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Chưa có người kiểm độc lập đọc văn bản; người kiểm đọc sau khi thi công.
- **Ngày:** 2026-10-16.
- **Loại:** việc lớn (dữ liệu, quyền, pháp lý). **Cửa một chiều** (ẩn danh hoá không hoàn tác). Cần người kiểm độc lập; trang ghép `TRANG-GHEP.md`.
- **Quan hệ với ADR cũ:** thay **ADR-0075 đ9** ("Sổ phiên không xoá") chỉ ở phần IP và User-Agent (điều 8 dưới đây). Hiến chương 5.5 được nới có tên bởi 5.24 (đã duyệt cùng ngày).
- **Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục dữ liệu). Chủ **gia hạn có ghi lý do** ngày 2026-10-16 (hạn mới 2026-11-05, commit "Gia hạn HC-5.19 …"), nên ADR này đủ điều kiện duyệt theo luật dừng dây chuyền.
- **Hiến chương áp:** 5.5 (nới có tên bởi 5.24), 5.11, 5.20, 5.21, 5.24, 5.25.

## Quyết định
1. `pty_privacy_policy` (phiên bản, mục đích, hiệu lực; chỉ Toàn quyền đăng) và `pty_consent` chỉ-thêm. Chưa đồng ý phiên bản hiện hành thì không gửi phiếu tự khai (ADR-0124).
2. Phiếu `pty_erasure_request`: người dùng gửi; Quản trị (theo cấp bậc) hoặc Toàn quyền xử lý **trong thời hạn luật định, không quá 30 ngày** (lời chủ 16/10). Thời hạn là **dữ liệu chính sách**, mặc định đề xuất 20 ngày (NĐ 356/2025 Điều 5 theo bản tóm tắt của công ty luật, chưa đọc bản gốc). **Con số cuối cùng là điều kiện chặn của lát H-5: không đưa con số vào mã trước khi luật sư xác nhận;** mã chỉ đọc con số từ dữ liệu chính sách. Quá hạn chỉ cảnh báo, không Cron ghi (5.11).
3. Ẩn danh hoá là **một lệnh có tên** của `parties`: số thành dấu ẩn danh duy nhất theo dòng và `erased_at`; liên hệ đóng và thay giá trị; ngày sinh rỗng; tên giữ nếu hồ sơ dính sổ tiền hay đơn đã giao; ảnh `purged_at` rồi xoá R2. Migration chỉ thêm cột `erased_at` và tạo lại trigger `_superseded`, `_voided` với điều kiện miễn đúng chuyển này. Từ chối hồ sơ công ty chủ.
4. Phiếu trả lời liệt kê phần giữ lại: đơn kèm bản chụp khách, danh sách hành khách tối thiểu 3 năm, lần thu, sổ, bản chụp yêu cầu hoá đơn, họ tên trong nhật ký thao tác, nhật ký cũ có SĐT, dòng phiên đã bỏ IP, chữ tự do không rà. Căn cứ: **chưa luật sư hay kế toán xác nhận**; phiếu ghi rõ như vậy.
5. Dòng nhật ký của việc xác minh và xoá chỉ mang mã. Họ tên ở nhật ký khác là ngoại lệ đã có (5.20).
6. Thời hạn giữ ảnh (chủ chốt 16/10 "giữ khi giấy tờ còn hiệu lực"): giữ khi giấy tờ còn hạn, là dòng hiện hành **và** người đó còn quan hệ. Mất một điều kiện thì vào danh sách xoá ngay, Quản trị hay Toàn quyền bấm xoá (không Cron ghi). Giấy tờ không ghi hạn: giữ tới khi hết quan hệ. **Hết quan hệ = mọi vai** của hồ sơ (`pty_party_role`) đã đóng (`valid_to_date` đã qua theo giờ VN). Tài khoản bị ngưng **không** tính. Hệ quả biết trước: người đã nghỉ mà Quản trị chỉ ngưng tài khoản, chưa đóng vai, thì ảnh còn giữ. Phiếu bị từ chối hay rút cũng vào danh sách xoá. Quy tắc là dữ liệu chính sách (5.25).
7. Danh sách mã phiếu đã thực hiện giữ thêm một bản ngoài D1 (chỉ mã); runbook khôi phục có bước chạy lại phiếu xoá.
8. Sổ phiên: khi phiếu thực hiện, và với phiên đã kết thúc quá thời hạn giữ, thay `aut_session.ip` và `user_agent` bằng dấu ẩn danh, giữ dòng. Câu ghi do `auth` cấp, ghép lô ở gốc lắp ráp (5.3).
9. `staff.phone` của tài khoản đã ngưng: **giữ** cho tới khi chủ quyết riêng (vướng khoá `UNIQUE` và đăng nhập lại khi kích hoạt lại); phiếu ghi rõ.

## Nguồn pháp lý (chỉ đại ý, chưa đọc bản gốc, chưa luật sư xác nhận)
Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (hiệu lực 1/1/2026; Điều 14 các trường hợp xoá hay huỷ) và Nghị định 356/2025/NĐ-CP (hiệu lực 1/1/2026, thay Nghị định 13/2023): theo luatvietan.vn, Điều 5, xoá trong 20 ngày, 30 ngày khi có bên xử lý hay bên thứ ba.

## Tiêu chí nghiệm thu (P20)
- Bài đỏ trước, xanh sau, cho từng bảng, trigger, lệnh ẩn danh hoá.
- Ẩn danh hoá: số giấy tờ, liên hệ, ngày sinh và ảnh bị thay hay xoá; dòng nghiệp vụ và sổ tiền còn; từ chối hồ sơ công ty chủ; không đảo ngược được.
- Nhật ký của lệnh chỉ mang mã, không mang giá trị bị xoá.
- Thời hạn xử lý đọc từ dữ liệu chính sách; mã không chứa con số; quá hạn chỉ cảnh báo.
- Danh sách xoá ngay hiện đúng theo điều 6; không có Cron tự ghi.
- `audit-invariants` có bất biến mới; bài quét: không đường ghi nào khác ngoài lệnh có tên được ghi đè nội dung dòng đã khoá.
