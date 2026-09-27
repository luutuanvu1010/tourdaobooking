# ADR-0043 — Đổi "công ty chủ": Toàn quyền đổi được sang hồ sơ tổ chức khác, không bao giờ có lúc trống (thay bổ sung 6.5(ii) của ADR-0024); "người liên hệ" của công ty chủ giữ cho Quản trị

- **Trạng thái:** **accepted** — chủ dự án trả lời 2026-09-28 trong phiên điều phối, hai câu hỏi gom một lần.
  - **Câu 1** (nhãn "công ty chủ" có được gỡ hoặc chuyển sang hồ sơ khác không). Nguyên văn: *"Cho super Admin đổi, để sau này tôi có thể dùng cái khung, mã nguồn cho 1 doanh nghiệp khác nữa"*. Chủ ghi kèm số tài khoản Toàn quyền của mình; số đó không chép vào đây.
  - **Câu 2** (ai được thêm/bớt "người liên hệ của Tour Đảo"). Chủ chọn *"2A: Quản trị làm được"*.
  - Chủ quyết **nguyên tắc**: đổi được, không có lúc trống, giữ lịch sử. **Cơ chế kỹ thuật** ở điều 2 do AI đề xuất và đã thử trên SQLite nháp; người kiểm độc lập soát lại khi thi công T2b.
- **Ngày:** 2026-09-28   **Loại:** **hai chiều**. Trigger và cách chặn ở máy chủ đổi được bằng migration hay ADR sau. Dòng lịch sử vai không bị xoá hay sửa.
- **Liên quan:**
  - **ADR-0024 điều 6, bổ sung 6.5(ii) — THAY** (không sửa nội dung ADR-0024 đã duyệt; câu dưới đây thắng từ khi ADR-0043 có hiệu lực).
    - Nguyên văn cũ: *"(ii) Ở cơ sở dữ liệu: chỉ mục duy nhất một phần trên `pty_party_role(role_type_code)` cho dòng đang mở của mã vai này, cộng trigger cấm đóng vai khi không có dòng mở thay thế trong cùng lô."*
    - Nay thay bằng điều 2 dưới đây.
    - Lý do phải thay: trên SQLite, chỉ mục duy nhất và trigger cấm đóng kiểm ngay từng câu lệnh. Vì vậy không có thứ tự nào trong cùng một lô vừa đóng dòng cũ vừa mở dòng mới được. Điều phối đã thử năm cách, cả năm đều bị chặn. Tức là vai sẽ không bao giờ đổi được, trái ý chủ ở câu 1.
  - **ADR-0024 6.5(i)** (route từ chối trừ khi có `company.legal.write`): **giữ**, nói rõ thêm ở điều 2.
  - **ADR-0024 6.4 và ADR-0038 điều 7** (ô `company.legal.write`, chỉ Toàn quyền): **giữ**.
  - **Hiến chương** (`docs/ARCHITECTURE.md` Phần I):
    - **5.1** (bất biến hai lớp): **giữ**, xem điều 2.
    - **5.2 và 5.5** (hiệu lực theo ngày, không xoá cứng): **giữ**. Đổi = đóng dòng cũ + mở dòng mới, nên lịch sử còn nguyên.
  - **ADR-0042** (Toàn quyền là vai ẩn): chữ người khác nhìn thấy không nói "Toàn quyền".

## Bối cảnh

- T2b (ADR-0024 điều 6) biến Tour Đảo thành một hồ sơ tổ chức mang vai "công ty chủ". Trang đăng nhập và biên nhận đọc tên, mã số thuế, địa chỉ qua **một** hàm của `parties`.
- Khi lập kế hoạch thi công, thử trên SQLite nháp thì thấy 6.5(ii) như đã duyệt làm vai "công ty chủ" không bao giờ đóng hay chuyển được, kể cả Toàn quyền. Điều phối hỏi chủ; chủ muốn Toàn quyền đổi được, để dùng lại khung cho doanh nghiệp khác.

## Quyết định

1. **Toàn quyền đổi được "công ty chủ"** sang một hồ sơ **tổ chức** khác ngay trên app.
   - Đổi = gán vai "công ty chủ" cho hồ sơ mới. Hồ sơ cũ tự thôi vai trong **cùng câu lệnh**, nên không bao giờ có lúc không có công ty chủ.
   - Lịch sử (hồ sơ nào là công ty chủ, từ ngày nào tới ngày nào) giữ nguyên trong `pty_party_role`.
   - Việc đổi ghi nhật ký, không ghi mã số thuế, SĐT hay email.
2. **Hai lớp chặn** (Hiến chương 5.1):
   - **Cơ sở dữ liệu**, ba trigger trên `pty_party_role` (tên `pty_…`):
     - (a) sau khi chèn một dòng "công ty chủ" đang mở: tự đóng mọi dòng "công ty chủ" đang mở khác;
     - (b) cấm đóng dòng "công ty chủ" đang mở **cuối cùng**;
     - (c) cấm mở lại dòng "công ty chủ" đã đóng.
     - **Không** dùng chỉ mục duy nhất một phần, vì nó chặn chính việc đổi.
     - Ngày đóng theo đúng quy ước ngày của route "kết thúc vai" hiện có (giờ Việt Nam).
   - **Máy chủ:**
     - Gán vai "công ty chủ" chỉ cho người có `company.legal.write`, và chỉ cho hồ sơ tổ chức; người khác nhận 403.
     - "Kết thúc vai công ty chủ" **luôn** bị từ chối, kể cả Toàn quyền. Câu báo tiếng Việt hướng dẫn "muốn đổi thì gán cho hồ sơ khác"; không lộ lỗi thô của cơ sở dữ liệu.
   - **Kiểm định kỳ:** `audit-invariants` kiểm đúng một hồ sơ đang mở vai "công ty chủ".
3. **Giao diện tối thiểu.** Lựa chọn "Công ty chủ" chỉ hiện với người có `company.legal.write`, chỉ trên hồ sơ tổ chức, kèm câu xác nhận: trang đăng nhập và biên nhận sẽ dùng thông tin của hồ sơ này. Người khác không thấy lựa chọn đó.
4. **Không khoá thêm các cách sửa tay thẳng vào cơ sở dữ liệu**: đổi mã vai, chuyển dòng vai sang hồ sơ khác, xoá dòng. Chỉ người vào thẳng được dữ liệu mới làm được những việc này; giữ như phần đã duyệt.
5. **"Người liên hệ của" hồ sơ công ty chủ** (quan hệ `CONTACT_OF`): Quản trị thêm/bớt được như với hồ sơ khác (`admin.manage`), theo câu 2 = 2A. Điều này khớp chữ của 6.4 và ADR-0038 điều 7, vì hai chỗ đó không liệt kê quan hệ.

## Trang ghép (CLAUDE.md §9)

| Hỏi | Trả lời |
|---|---|
| `pty_party_role` chứa gì liên quan? | Dòng vai của mọi hồ sơ, trong đó **đúng một** dòng "công ty chủ" đang mở, cộng các dòng "công ty chủ" đã đóng (lịch sử đổi). |
| Quyền nào chạm các dòng "công ty chủ"? | Gán (tức đổi): `company.legal.write`, chỉ Toàn quyền. Kết thúc: **không ai**. Sửa định danh, điểm liên hệ: `company.legal.write` (6.4). Quan hệ "người liên hệ của": `admin.manage` (điều 5). |
| Cổng nào canh? | Route gán vai và route kết thúc vai kiểm trong thân route. Ba trigger ở điều 2. `audit-invariants` kiểm định kỳ. |

## Hệ quả

- **Thi công trong T2b** theo kế hoạch `docs/superpowers/plans/2026-09-28-t2b-ho-so-tour-dao.md`: Task 3 làm theo điều 2, Task 9 (khoá route quan hệ) bỏ. Mỗi trigger có bước thấy chặn thật (P16) và dòng ở `docs/SO-HANG-RAO.md`. Việc lớn (dữ liệu + quyền): người kiểm độc lập chỉ-đọc ở cuối.
- **Dùng lại cho doanh nghiệp khác** (mục đích chủ nêu). Sau T2b, định danh công ty nằm ở dữ liệu. Còn lại **để sau**, không làm trong T2b:
  - chữ dự phòng tĩnh ở trang đăng nhập (`public/login.html`) vẫn là của Tour Đảo;
  - tên app và biểu tượng PWA cũng vậy.
  Khi dùng cho doanh nghiệp khác phải thay các chỗ này.

## Phương án bị loại

- **Giữ 6.5(ii) như đã duyệt** (vai khoá vĩnh viễn): chủ không chọn.
- **Giữ chỉ mục duy nhất một phần, bỏ trigger cấm đóng, đổi bằng một lô [đóng cũ, mở mới]:** thử nháp thấy cơ sở dữ liệu để lọt ca "chỉ đóng, không mở". Như vậy "không có lúc trống" chỉ còn một lớp chặn.
- **Chuyển dòng vai sang hồ sơ mới bằng `UPDATE party_id`:** mất lịch sử (trái Hiến chương 5.2).
