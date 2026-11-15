# Sổ thi công — đối tác xem và gửi vé (ADR-0170)

Kế hoạch: `2026-11-05-doi-tac-xem-ve.md`. Quyết định: ADR-0170. Thêm việc vào bảng phải hỏi chủ; phát hiện không chặn phát hành ghi vào mục Nợ.

## Nền đã chọn (Task 0)

- **Nền là `main` hiện tại.** Nhánh `claude/adr-0170-doi-tac-xem-ve` đã đứng trên đỉnh `origin/main` lúc 5/11 (hai commit tài liệu của ADR-0170 đứng trước, không commit nào của `main` bị bỏ). Bước đưa nhánh lên đỉnh đã chạy trước khi giao Task 1; lần kiểm lại `git rev-list --left-right --count HEAD...origin/main` = `2 0`, không có gì mới để đưa lên.
- **ADR-0168 (nhánh `claude/partner-type-ta-oracle-18-efd687`) CHƯA nhập `main`** (`git merge-base --is-ancestor` trả chưa). Chủ dự án 5/11: «Làm ngay», không chờ. Hệ quả cho thi công: không có `veMoDuoc` / `moVeDuoc` / `veDaMoCuaDon` trên nền này; cổng mở vé vẫn là `thuDu(tien)` ở `ve-dien-tu/rules.ts`, và Task 2 phải **thêm** hàm hỏi «đơn có vé đã mở không» (không dùng lại).
- **Việc nhánh ADR-0168 phải gộp khi nhập sau** (ghi để người nhập không bỏ sót): (1) chỗ nhánh đó viết lại cổng vé ở `src/modules/ve-dien-tu/index.ts` và `web/ve-don.ts` phải giữ nguyên lời gọi `tienDonVe` đã đổi ở Task 1 (trả thêm `choXacNhan`; `CHUA_THU_DU` nhận người xem); (2) `veMoDuoc` mới phải đọc số từ chính `tienDonVe` (một hàm duy nhất, ADR-0170 Đ2 mục 4), không viết hàm tính «đã về công ty» thứ hai; (3) Task 2 sẽ thêm hàm chặn huỷ — khi nhập ADR-0168 phải gộp về một hàm `veDaMoCuaDon`.

## Bảng việc

| Việc | Xong khi | Trạng thái |
|---|---|---|
| Task 0 Chốt nền | Sổ này có nền và lời chủ | xong 5/11 |
| Task 1 Đ2 tiền đã về công ty | Bài thuần, bài route xanh, đã thấy hàng rào chặn thật | xong 5/11; người kiểm tìm lỗ nộp một phần, sửa ở `b33973dd`, chờ đọc lại |
| Task 2 Đ3 không tự huỷ đơn đã mở vé | Hai đường huỷ chặn, khe đua bịt | xong 5/11, vòng sửa 1 xong |
| Task 3 Đ1 mở quyền, cổng route, giao diện | Bài đối tác mở vé đơn mình, đơn người khác 403/404 | xong 5/11, vòng sửa 1 xong |
| Task 4 Tài liệu, Hướng dẫn, bằng chứng giao diện | Tài liệu và ảnh đủ | xong 5/11 |

## Quyết định đã tự chọn

- **Tên trường `nguoiXemLaDoiTac`** (brief ghi `laNguoiLapDoiTac`): trường này nói NGƯỜI XEM giữ quyền Đối tác (`holdsPartner(staff)`), không phải người lập; đặt tên đúng nghĩa. Chủ dự án giao 5/11.
- **`choNop` của đơn do đối tác lập** là `nguoiLapGiu`: khoản khai đặt cọc (ADR-0159) và khoản người đang cầm được gộp thành MỘT danh sách không trùng id khoản thu rồi tính một lượt; mỗi khoản gắn với người đang cầm tiền (người nợ của dòng giữ hộ chưa đảo). Không dùng `max` nữa vì bỏ sót khi hai khoản do hai người cầm.
- **Quyền người lập** đọc bằng câu mới của `billing` (`order_creator_holds_partner`, view `v_stf_quyen_mo`); chủ đơn đọc qua `orderOwners` như `info.ownerId`; hồ sơ qua `hoSoNhanVien`. Không đọc được hồ sơ của người lập đang giữ quyền Đối tác ⇒ `tienDonVe` trả `null` (không mở); không đọc được chủ đơn ⇒ `null` (không mở).
- **Hai bài cũ đổi có chủ ý** (`src/modules/billing/dat-coc-route.test.ts`: «I-4 Tôi thu đủ tiền vẫn mở», «I-5 cọc Tôi thu chuyển…, vé mở»): ADR-0170 Đ2 đổi nghĩa — đối tác tự ghi «Tôi thu» thì khoá tới khi nộp. Đổi thành «khoá, nộp đủ thì mở».
- **Chữ mới chưa vào bảng tham chiếu:** câu «Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.» là thông báo, không phải nút hay khái niệm; bảng tham chiếu chỉ khai nút ghi, khái niệm có tên chủ chọn. Thêm một khái niệm cần chủ chọn tên (ADR-0130), nên để cho Task 3 (cùng lúc mở giao diện cho đối tác) hỏi chủ một lần.

## Bằng chứng quan sát chặn thật

- **Task 1, 5/11:** bỏ phần chờ xác nhận khỏi `soChuaVeCongTy` (nhân 0) ⇒ đỏ 5 bài (một bài thuần, bốn bài route); hoàn nguyên ⇒ xanh. Chi tiết ở `docs/SO-HANG-RAO.md`.

## Nợ

- Chưa có kịch bản Chrome cho câu thông báo mới (giao diện của đối tác chưa mở, Task 3).

## Sửa sau người kiểm (Task 1)

Lỗ: khoản «Công ty thu» có dòng giữ hộ rời diện chờ xác nhận ngay khi nộp MỘT PHẦN và vì người thu là Công ty nên không vào phần «người lập giữ»: tiền chưa về mà vé mở. Sửa trong `soChuaVeCongTy` (không đổi `khoanChoXacNhan`, màn Kế toán dùng nó): mỗi khoản gắn với người đang cầm và trừ theo số dư giữ hộ thực. Tự chọn: bên đặt khác người lập (đại lý khác) KHÔNG được miễn, vì tiền còn ở đại lý, ADR chỉ miễn nhân viên công ty cầm hộ (vai `STAFF`).
