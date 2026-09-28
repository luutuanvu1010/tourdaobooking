# ADR-0043 — Đổi "công ty chủ": Toàn quyền đổi được sang hồ sơ tổ chức khác, không bao giờ có lúc trống (thay bổ sung 6.5(ii) của ADR-0024); "người liên hệ" của công ty chủ giữ cho Quản trị

- **Trạng thái:** **accepted** — chủ dự án trả lời 2026-09-28 trong phiên điều phối, hai câu hỏi gom một lần.
  - **Câu 1** (nhãn "công ty chủ" có được gỡ hoặc chuyển sang hồ sơ khác không). Nguyên văn: *"Cho super Admin đổi, để sau này tôi có thể dùng cái khung, mã nguồn cho 1 doanh nghiệp khác nữa"*. Chủ ghi kèm số tài khoản Toàn quyền của mình; số đó không chép vào đây.
  - **Câu 2** (ai được thêm/bớt "người liên hệ của Tour Đảo"). Chủ chọn *"2A: Quản trị làm được"*.
  - Chủ quyết **nguyên tắc**: đổi được, không có lúc trống, giữ lịch sử. **Cơ chế kỹ thuật** ở điều 2 do AI đề xuất và đã thử trên SQLite nháp.
  - **Người kiểm độc lập:**
    - Lượt 1 (6af320a): ĐẠT CÓ ĐIỀU KIỆN. Đã sửa hai điểm: ngày bắt đầu khi đổi phải là hôm nay, và nhãn 6.5(i).
    - Lượt 2 (16d952e): ĐẠT CÓ ĐIỀU KIỆN. Quy tắc ngày khi ấy mới chặn ở máy chủ, chưa đủ hai lớp (Hiến chương 5.1). Đã thêm trigger (d) ở cơ sở dữ liệu và sửa câu báo lỗi. Vì thế không cần khai lệch 5.1.
- **Ngày:** 2026-09-28   **Loại:** **hai chiều**. Trigger và cách chặn ở máy chủ đổi được bằng migration hay ADR sau. Dòng lịch sử vai không bị xoá hay sửa lùi.
- **Liên quan:**
  - **ADR-0024 điều 6, bổ sung 6.5(ii) — THAY** (không sửa nội dung ADR-0024 đã duyệt; câu dưới đây thắng từ khi ADR-0043 có hiệu lực).
    - Nguyên văn cũ: *"(ii) Ở cơ sở dữ liệu: chỉ mục duy nhất một phần trên `pty_party_role(role_type_code)` cho dòng đang mở của mã vai này, cộng trigger cấm đóng vai khi không có dòng mở thay thế trong cùng lô."*
    - Nay thay bằng điều 2 dưới đây.
    - Lý do phải thay: trên SQLite, chỉ mục duy nhất và trigger cấm đóng kiểm ngay từng câu lệnh. Vì vậy không có thứ tự nào trong cùng một lô vừa đóng dòng cũ vừa mở dòng mới được. Điều phối đã thử năm cách, cả năm đều bị chặn:
      - (1) đóng cũ trước, mở mới sau;
      - (2) mở mới trước, đóng cũ sau;
      - (3) chèn dòng mới ở dạng đã đóng, rồi một câu `UPDATE` đảo cả hai dòng;
      - (4) chỉ đóng;
      - (5) chỉ mở thêm dòng thứ hai.
    - Tức là vai sẽ không bao giờ đổi được, trái ý chủ ở câu 1. Người kiểm độc lập đã tái hiện độc lập cả năm cách.
  - **ADR-0024 6.5(i)** (route gán và route kết thúc vai từ chối, trừ khi người gọi có `company.legal.write`):
    - **giữ vế "gán"**;
    - **vế "kết thúc" bị thay bởi điều 2**: không ai kết thúc được vai "công ty chủ", kể cả người có `company.legal.write`; muốn đổi thì gán cho hồ sơ khác.
  - **ADR-0024 6.4 và ADR-0038 điều 7** (ô `company.legal.write`, chỉ Toàn quyền): **giữ**.
  - **Hiến chương** (`docs/ARCHITECTURE.md` Phần I):
    - **5.1** (bất biến hai lớp): **giữ**. Mọi luật ở điều 2 đều có cả lớp cơ sở dữ liệu (trigger a–d) lẫn lớp máy chủ, kể cả luật "ngày bắt đầu = hôm nay".
    - **5.2 và 5.5** (hiệu lực theo ngày, không xoá cứng): **giữ**. Đổi = đóng dòng cũ + mở dòng mới, lịch sử còn nguyên. Ngày bắt đầu bắt buộc là hôm nay, nên không ghi lùi lịch sử.
  - **ADR-0042** (Toàn quyền là vai ẩn): chữ người khác nhìn thấy không nói "Toàn quyền".
  - **`src/CLAUDE.md`** (ngày dân sự do máy chủ truyền vào, không dùng `date('now')` trong SQL): **giữ**. Trigger (d) chỉ đổi `created_at` do máy chủ ghi sang ngày giờ Việt Nam; không đọc giờ hiện tại trong SQL. Độ lệch `'+7 hours'` là bản sao của `VN_OFFSET_MS` (`src/shared/vn-date.ts`). Người kiểm độc lập đã chứng minh hai công thức tương đương, và Việt Nam không có giờ mùa hè; migration 0012 đã dùng cùng độ lệch.

## Bối cảnh

- T2b (ADR-0024 điều 6) biến Tour Đảo thành một hồ sơ tổ chức mang vai "công ty chủ". Trang đăng nhập và biên nhận đọc tên, mã số thuế, địa chỉ qua **một** hàm của `parties`.
- Khi lập kế hoạch thi công, thử trên SQLite nháp thì thấy 6.5(ii) như đã duyệt làm vai "công ty chủ" không bao giờ đóng hay chuyển được, kể cả Toàn quyền. Điều phối hỏi chủ; chủ muốn Toàn quyền đổi được, để dùng lại khung cho doanh nghiệp khác.

## Quyết định

1. **Toàn quyền đổi được "công ty chủ"** sang một hồ sơ **tổ chức** khác ngay trên app.
   - Đổi = gán vai "công ty chủ" cho hồ sơ mới. Hồ sơ cũ tự thôi vai trong **cùng câu lệnh**, nên không bao giờ có lúc không có công ty chủ.
   - Lịch sử (hồ sơ nào là công ty chủ, từ ngày nào tới ngày nào) giữ nguyên trong `pty_party_role`.
   - Việc đổi ghi nhật ký, không ghi mã số thuế, SĐT hay email.
2. **Hai lớp chặn** (Hiến chương 5.1):
   - **Cơ sở dữ liệu**, bốn trigger trên `pty_party_role` (tên `pty_…`):
     - (a) sau khi chèn một dòng "công ty chủ" đang mở: tự đóng mọi dòng "công ty chủ" đang mở khác;
     - (b) cấm đóng dòng "công ty chủ" đang mở **cuối cùng**;
     - (c) cấm mở lại dòng "công ty chủ" đã đóng;
     - (d) trước khi chèn một dòng "công ty chủ" đang mở: `valid_from_date` phải bằng ngày giờ Việt Nam của `created_at` (tức `date(created_at, '+7 hours')`), nếu không thì từ chối. Điều phối đã thử nháp các ca: ngày lùi, ngày tới, lấy nhầm ngày UTC, hai mốc sát nửa đêm giờ Việt Nam, và vai khác không bị chạm.
     - **Không** dùng chỉ mục duy nhất một phần, vì nó chặn chính việc đổi.
     - Migration gieo dòng "công ty chủ" đầu tiên phải thoả trigger (d): gieo trước khi tạo trigger, hoặc ghi `valid_from_date` và `created_at` cùng một thời điểm.
   - **Quy ước ngày:**
     - `valid_to_date` là ngày cuối còn hiệu lực (tính cả ngày đó), cùng quy ước với route "kết thúc vai" hiện có (`src/modules/parties/rules.ts`).
     - Dòng cũ đóng ở ngày trước ngày bắt đầu của dòng mới. Nếu dòng cũ cũng bắt đầu đúng hôm nay thì đóng ở chính ngày bắt đầu của nó.
     - Hai ca bị trigger chống trùng khoảng có sẵn (`migrations/0011`) chặn. Máy chủ báo **riêng** từng ca bằng câu tiếng Việt, không dùng câu chung "trùng khoảng thời gian":
       - gán cho **chính hồ sơ đang là công ty chủ**: luôn bị chặn; báo "Hồ sơ này đang là công ty chủ";
       - quay lại một hồ sơ **vừa bắt đầu làm công ty chủ trong chính hôm nay** (dòng cũ của nó đóng ở hôm nay): bị chặn tới hết ngày; báo "Hồ sơ này vừa thôi làm công ty chủ hôm nay, gán lại vào ngày mai".
       - Đổi sang hồ sơ khác thì vẫn được ngay.
   - **Máy chủ:**
     - Gán vai "công ty chủ" chỉ cho người có `company.legal.write`, và chỉ cho hồ sơ tổ chức; người khác nhận 403.
     - **Ngày bắt đầu khi gán (đổi) luôn là hôm nay theo giờ Việt Nam.** Máy chủ tự điền ngày này, không nhận ngày khác; `valid_from_date` và `created_at` lấy từ cùng một thời điểm. Lý do: ngày lùi làm trigger (a) đóng lùi dòng cũ, tức ghi sai lịch sử. Ngày tới làm hồ sơ mới hiện ngay trên trang đăng nhập và biên nhận từ hôm nay, vì hàm đọc chỉ xét dòng đang mở.
     - "Kết thúc vai công ty chủ" **luôn** bị từ chối, kể cả Toàn quyền. Câu báo tiếng Việt hướng dẫn "muốn đổi thì gán cho hồ sơ khác"; không lộ lỗi thô của cơ sở dữ liệu.
   - **Kiểm định kỳ:** `audit-invariants` kiểm đúng một hồ sơ đang mở vai "công ty chủ".
3. **Giao diện tối thiểu.** Lựa chọn "Công ty chủ" chỉ hiện với người có `company.legal.write`, chỉ trên hồ sơ tổ chức, kèm câu xác nhận: trang đăng nhập và biên nhận sẽ dùng thông tin của hồ sơ này từ hôm nay. Người khác không thấy lựa chọn đó.
4. **Không khoá thêm các cách sửa tay thẳng vào cơ sở dữ liệu**: đổi mã vai, chuyển dòng vai sang hồ sơ khác, xoá dòng, tự ghi `created_at` giả, sửa `valid_from_date` của dòng đã tạo (app không có câu `UPDATE` nào cho cột này; người kiểm độc lập đã xác nhận). Chỉ người vào thẳng được dữ liệu mới làm được những việc này; giữ như phần đã duyệt.
5. **"Người liên hệ của" hồ sơ công ty chủ** (quan hệ `CONTACT_OF`): Quản trị thêm/bớt được như với hồ sơ khác (`admin.manage`), theo câu 2 = 2A. Điều này khớp chữ của 6.4 và ADR-0038 điều 7, vì hai chỗ đó không liệt kê quan hệ.

## Trang ghép (CLAUDE.md §9)

| Hỏi | Trả lời |
|---|---|
| `pty_party_role` chứa gì liên quan? | Dòng vai của mọi hồ sơ, trong đó **đúng một** dòng "công ty chủ" đang mở, cộng các dòng "công ty chủ" đã đóng (lịch sử đổi). |
| Quyền nào chạm các dòng "công ty chủ"? | Gán (tức đổi): `company.legal.write`, chỉ Toàn quyền, ngày bắt đầu = hôm nay. Kết thúc: **không ai**. Sửa định danh, điểm liên hệ: `company.legal.write` (6.4). Quan hệ "người liên hệ của": `admin.manage` (điều 5). |
| Cổng nào canh? | Route gán vai (kiểm quyền, loại hồ sơ, tự điền ngày = hôm nay) và route kết thúc vai (luôn từ chối vai này) kiểm trong thân route. Bốn trigger (a)–(d) ở điều 2. `audit-invariants` kiểm định kỳ. |

## Hệ quả

- **Thi công trong T2b** theo kế hoạch `docs/superpowers/plans/2026-09-28-t2b-ho-so-tour-dao.md`: Task 3 làm theo điều 2, Task 9 (khoá route quan hệ) bỏ. Mỗi trigger (a)–(d) có bước thấy chặn thật (P16) và dòng ở `docs/SO-HANG-RAO.md`. Việc lớn (dữ liệu + quyền): người kiểm độc lập chỉ-đọc ở cuối.
- **Dùng lại cho doanh nghiệp khác** (mục đích chủ nêu). Sau T2b, định danh công ty nằm ở dữ liệu. Còn lại **để sau**, không làm trong T2b:
  - chữ dự phòng tĩnh ở trang đăng nhập (`public/login.html`) vẫn là của Tour Đảo;
  - tên app và biểu tượng PWA cũng vậy.
  Khi dùng cho doanh nghiệp khác phải thay các chỗ này.

## Phương án bị loại

- **Giữ 6.5(ii) như đã duyệt** (vai khoá vĩnh viễn): chủ không chọn.
- **Giữ chỉ mục duy nhất một phần, bỏ trigger cấm đóng, đổi bằng một lô [đóng cũ, mở mới]:** thử nháp thấy cơ sở dữ liệu để lọt ca "chỉ đóng, không mở". Như vậy "không có lúc trống" chỉ còn một lớp chặn.
- **Chuyển dòng vai sang hồ sơ mới bằng `UPDATE party_id`:** mất lịch sử (trái Hiến chương 5.2).
- **Cho chọn ngày bắt đầu tuỳ ý khi đổi:** ghi lùi lịch sử (ngày quá khứ), hoặc hiện hồ sơ mới trước ngày hiệu lực (ngày tương lai). Người kiểm độc lập đã tái hiện cả hai ca.
- **Chỉ chặn ngày ở máy chủ và khai lệch 5.1 theo khuôn ADR-0029:** không cần nữa, vì trigger (d) cho lớp cơ sở dữ liệu mà không phải đọc giờ hiện tại trong SQL.
- **Trigger dùng `date('now', '+7 hours')`:** trái `src/CLAUDE.md` (ngày dân sự do máy chủ truyền vào).
