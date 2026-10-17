# ADR-0117 — Loại đối tác là dữ liệu; mức TA dùng chung; nhân viên nội bộ không mang loại được hưởng hoa hồng

- **Trạng thái:** **accepted — lần 1 và lần 2.** Lần 1: chủ dự án, chat 2026-10-14: *"duyệt gắn vai làm ADR-0117"* (đã lên production bản 1.96). Lần 2: chủ dự án, chat 2026-10-14: *"duyệt lần 2, bắt đầu thi công"*; **đã lên production bản 2.4 lúc 2026-10-16 00:15** (migration `0096`, `0097` đã áp, kiểm độc lập đạt). *Dòng này được cập nhật ngày 2026-10-17 theo lệnh của chủ trong chat; các gạch đầu dòng bên dưới là bản ghi lúc duyệt lần 1 và giữ nguyên.*
  - Chủ duyệt văn bản đề xuất `docs/superpowers/specs/2026-10-13-gan-vai-voi-muc-chiet-khau/de-xuat-adr.md` (bản 4, commit `48d0583e`, nhánh `worktree-agent-a455127a0bb5509fe`; đã qua ba lượt đọc của người kiểm độc lập, lượt cuối kết luận đủ điều kiện trình duyệt) **cùng các lựa chọn đã chốt trong chat 2026-10-13**: loại đối tác là dữ liệu; mức TA là bộ hoa hồng có tên dùng chung theo nhóm dịch vụ; một đối tác mang nhiều loại, mâu thuẫn thì thiếu mức; Kế toán, Quản trị, Toàn quyền quản lý bằng ô `partner.commission.write` có sẵn (không thêm ô quyền); nhân viên nội bộ không mang loại được hưởng; vá khe "Đã giao" tách riêng (đã lên production ở bản 1.92); giữ thứ tự chọn mức hiện tại kèm cảnh báo khi xung đột.
  - **Hai điều chủ chốt ngay lúc duyệt** (chat 2026-10-13, trả lời bốn câu): luật «hồ sơ nội bộ» là phương án **(a)** — hồ sơ coi là nội bộ nếu có vai nhóm INTERNAL đang mở, hoặc vai cũ `STAFF`/`SALES` đang mở, hoặc tài khoản mang ít nhất một quyền không thuộc nhóm bên ngoài; đối tác thuần có tài khoản Đối tác vẫn được mang nhãn; vai cũ `GUIDE`/`AGENT` **không** tính là nội bộ (mặc định an toàn).
  - **Phạm vi duyệt: chỉ lần 1** (không dựng lại bảng nào). **Lần 2** (mức TA dùng chung, dựng lại bảng `prc_commission_rule` — ngoại lệ ADR-0003 điều 10, cửa một chiều về dữ liệu) **CHƯA được duyệt**: chủ quyết riêng, sau khi lần 1 xong; bước 0 của lần 2 có quyền dừng và cần điểm Time Travel. Nếu chưa duyệt lần 2 thì mọi chỗ trong tệp đề xuất nói về mức TA dùng chung chưa có hiệu lực.
  - Phụ lục kỹ thuật (điều 1–9, trang ghép, tiêu chí nghiệm thu N-1…N-19, ca vàng `SV-TA-01…06`, migration dự kiến, bảng "Sửa câu") nằm ở tệp đề xuất trên; **tệp này là bản ghi quyết định, tệp kia là chi tiết thi công**. Lệch giữa hai nơi: ADR này thắng.
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Người kiểm độc lập đọc lại văn bản sau mỗi lần phát hành.
- **Ngày:** 2026-10-14.
- **Số:** 0117. Đã kiểm số tại thời điểm soạn: 0116 là số lớn nhất đã dùng; migration kế tiếp từ `0095` (0094 đã áp production ở bản 1.92).
- **Loại:** việc lớn (dữ liệu, tiền, quyền). Dòng loại và dòng gắn mức là dữ liệu chỉ-thêm/đóng nên một chiều về dữ liệu; luật và mã đảo được. Cần người kiểm độc lập, chỉ đọc, sau mỗi lần phát hành.
- **Sửa/bổ sung:** ADR-0077 điều 2, 3, 4, 6 và ADR-0079 điều 5 (bảng "Sửa câu" ở tệp đề xuất; điều 4 và 6 chỉ có hiệu lực khi lần 2 được duyệt). Không sửa thân ADR cũ. Lời chủ 8/10 "không hạng đại lý" được nới đúng một điểm: mức TA là hạng có tên gắn theo loại đối tác (vẫn không theo doanh số, không giá net).
- **Xây trên lỗ đang hở:** lần 1 không ghi dòng sổ tiền nào và không dựng lại bảng; nhận định này **chưa rà từng mã sổ hoãn** — người lập kế hoạch thi công rà `docs/quyen-hoan.json` và ghi "xây trên lỗ đang hở: <mã>" nếu có. Khe "Đã giao" đã vá riêng và lên production (bản 1.92); lần 1 chỉ giữ rào đó và thêm ca cho loại nhóm OTHER.

## Quyết định (lần 1)

1. **Loại đối tác là dữ liệu, không là mã.** Kế toán, Quản trị, Toàn quyền thêm, tắt/bật loại đối tác trên màn hình; loại mới là một dòng `pty_role_type` nhóm `OTHER` (đánh dấu `is_partner_label = 1`) cộng một dòng `prc_beneficiary_role`; không sửa mã, không cấp quyền đăng nhập. «Tắt loại» đặt cả hai cờ trong một lô.
2. **Một đối tác mang nhiều loại như hôm nay;** hai loại cho hai mức khác nhau ở cùng bậc thì dòng "thiếu mức", đơn bị giữ, không bao giờ tự lấy 0. Khác bậc thì dòng cụ thể hơn thắng.
3. **Ai làm gì:** thêm/tắt loại, tạo và gắn mức: Kế toán, Quản trị, Toàn quyền, ô `partner.commission.write` hiện có; gắn loại cho hồ sơ: Quản trị, Toàn quyền ở Danh bạ. **Không thêm ô quyền.**
4. **Nhân viên nội bộ không mang loại được hưởng hoa hồng, chặn cả hai chiều, ở máy chủ và ở CSDL**, theo luật «nội bộ» phương án (a) nêu trên. Gồm cả đường gộp hồ sơ (ADR-0068), ánh xạ thông báo lỗi ở cả `parties` và `accounts` (không để rơi 500; người không có `party.view` không thấy tên loại), trigger bất biến cho nhãn, kiểm định kỳ mới `R-PRC-6`. Chỗ còn hở ở CSDL (gắn nhãn lên hồ sơ đã có tài khoản nội bộ mà không có vai nội bộ, bằng SQL thẳng) chỉ máy chủ và `R-PRC-6` canh được.
5. **Giữ rào "Đã giao" đã vá riêng** và thêm ca kiểm cho loại nhóm OTHER.
6. **Giữ thứ tự chọn mức hiện tại** (dòng riêng của loại thắng dòng TA); cảnh báo (không chặn) khi gắn TA cho loại còn dòng riêng đang hiệu lực — làm cùng lần 2.
7. **Bản chụp và đơn đã xác nhận không đổi** khi đổi/tắt loại hay đổi mức. Gộp hồ sơ (ADR-0068) là điểm **nghi ngờ**, tiêu chí N-11 yêu cầu bài chạy thật; nếu hành vi sai tiền thì mở việc riêng.

## Điều phải nói thẳng

Kế toán đặt mức nhưng không tự gắn loại cho hồ sơ được (chủ chọn không thêm ô quyền). Hồ sơ chỉ mang vai `STAFF`/`SALES` cũ là lỗ đã xác định, phương án (a) đóng nó mà không đụng dữ liệu cũ; luật có danh sách mã cũ trong mã (ghi rõ là tạm), và dữ liệu production chưa kiểm — chủ tự chạy lệnh đếm chỉ đọc ở tệp đề xuất. Lần 2 dựng lại một bảng tiền, đã chạy được trên SQLite trong bộ nhớ nhưng chưa trên D1 thật.

## Việc kế tiếp (không thuộc ADR này)

Kế hoạch thi công lần 1 (tiêu chí nghiệm thu đỏ trước, xanh sau; dòng mới ở `docs/SO-HANG-RAO.md` khi quan sát chặn thật), thi công sau khi chủ ra lệnh; chủ quyết lần 2 riêng; hỏi chủ trước khi làm đợt 2 sổ đại lý.
