# ADR-0085 — Chính sách đăng nhập: Toàn quyền chọn quyền app nào "một máy" / "nhiều máy" (sửa ADR-0075 điều 3)

- **Trạng thái:** **proposed** (bản nháp, chờ chủ duyệt). Khi duyệt: chép sang `docs/adr/ADR-0085-chinh-sach-dang-nhap.md` + mục lục.
- **Ngày:** 2026-10-01.
- **Số:** 0085 — 0084 do nhánh chưa gộp `tro-ly-mai` giữ (kiểm `git log --all` 2026-10-01). Kiểm lại ngay trước khi chép vào `docs/adr/`.
- **Đặc tả:** `docs/superpowers/specs/2026-10-01-chinh-sach-dang-nhap-dac-ta.md` (trang ghép §13). Lượt duyệt gồm 3 quyết định chạm quyền/dữ liệu (Q1–Q3 dưới) = trần 3.
- **Xây trên lỗ đang hở:** không.
- **Liên quan:** ADR-0075 (sửa điều 3; làm rõ lý do ngoại lệ ở điều 7), ADR-0074 (Phần B — thi công tuần tự), ADR-0018 điều 3 (quyền là điều kiện cho phép), ADR-0038/0044 (Toàn quyền, vai IT, nhật ký im lặng), ADR-0046 (tắt thông báo khi thao tác bảo mật), ADR-0071 (Nhân sự), ADR-0083 (chặn tài khoản lai), ADR-0014 (~1000 đối tác), Hiến chương 5.2, 5.6.

## Bối cảnh

Bản 1.58 (ADR-0075) cài cứng: mọi tài khoản một máy, trừ Toàn quyền và vai IT. Chủ dự án muốn Toàn quyền tự chỉnh luật này theo nhóm người dùng (2026-10-01) và đã chọn: theo quyền app; một quyền "nhiều máy" là đủ; siết thì đăng xuất ngay giữ máy mới nhất; Toàn quyền/IT khoá cứng; bỏ công tắc chung. Một lượt kiểm độc lập thiết kế chỉ ra mã hiện tại cài cứng "miễn = giữ Toàn quyền" trong câu SQL, và việc mở rộng người gián tiếp đăng xuất máy người khác — chủ đã quyết các điểm này.

## Quyết định

**Q1 — Mô hình chính sách**
1. Bảng `aut_session_policy` (module `auth`): mỗi **quyền app đặt được** (9 mã, trừ `SUPER_ADMIN`) một dòng hiện hành `multi` 0/1, hiệu lực theo `valid_from_at/valid_to_at`, không xoá cứng, không JSON. Bảng trống = "một máy" cho mọi quyền (hành vi bản 1.58).
2. **Thay ADR-0075 điều 3:** tài khoản **được nhiều máy** khi giữ `SUPER_ADMIN`, **hoặc** vai `IT` còn hiệu lực, **hoặc** ít nhất một quyền hiệu lực (`stf_permission` còn hiệu lực) mà chính sách hiện hành đặt "nhiều máy". Toàn quyền và vai IT khoá cứng, chính sách không đổi được. Vai IT là điều kiện trực tiếp — lệch chữ ADR-0018 điều 3 **kế thừa** từ ADR-0075, không mở rộng.
3. Ô quyền mới `auth.session.policy` — chỉ `SUPER_ADMIN` (10 cột). Route `GET/PUT /api/sessions/policy` (+ xem trước) kiểm `can()` trong handler; giao diện hỏi đúng ô này (luật 1.52). Quản trị, Nhân sự không thấy, không sửa.
4. Chính sách đọc từ D1 ở mỗi lần cấp phiên; không lưu đệm trong Worker. Lưu có kiểm phiên bản: lần lưu dựa trên bản cũ → 409.
5. Cột `aut_session.single` là **trạng thái thi hành** của phiên, không phải bản chụp theo Hiến chương 5.6: siết được phép đổi nó trên phiên đang sống (có chủ ý).

**Q2 — Siết và ai kích hoạt được**
6. **Toàn quyền đổi chính sách** làm một số tài khoản thành "một máy" → trong cùng lô lưu: một câu theo tập kết thúc mọi phiên sống trừ phiên mới nhất (lý do "mất quyền nhiều máy") cho các tài khoản đó khi đang có ≥ 2 phiên sống; số câu không phụ thuộc số người. Nới → không ghi gì lên phiên. Màn hình xem trước số máy/số người trước khi lưu.
7. **Quản trị / Nhân sự / Toàn quyền đổi quyền hoặc vai** của một người làm người đó thành "một máy" theo chính sách hiện hành → máy thừa đăng xuất **ngay** (chủ chọn): đây là hệ quả của chính sách Toàn quyền đã đặt, ghi trong Trợ giúp. Câu phiên chạy ở **lô thứ hai, chỉ khi lô đổi quyền/vai đã thắng** câu chốt — thay điều kiện SQL cài cứng "không giữ Toàn quyền". Câu chốt thua → không phiên nào bị kết thúc.
8. Đăng nhập chạy đua với lần lưu chính sách: hở đã biết, tự lành ở lần đăng nhập sau; bất biến cảnh báo mới `R-AUT-SESSION-3` ("một máy theo chính sách mà có hơn một phiên sống").
9. Nhật ký `session_policy_changed` (im lặng, `SILENT_AUDIT_ACTIONS`): quyền đổi, giá trị mới, số phiên/số người bị kết thúc — không tên, SĐT, IP.
10. Tài khoản Đối tác / Tài xế đối tác đặt "nhiều máy": **không** bắt bảo mật hai lớp (ADR-0074 điều 1 giữ nguyên); màn chính sách hiện cảnh báo mất tín hiệu khi bị đăng nhập trộm, và nói rõ quyền Đối tác gồm 5 loại vai bên ngoài không tách được.

**Q3 — Hàng rào thông báo**
11. Máy bị kết thúc vì **lưu chính sách** tắt Bảng tin + thông báo màn hình khoá theo dạng hẹp **"chỉ-phiên"**: chỉ các phiên vừa kết thúc, một lần cho cả danh sách; không tắt máy giữ lại, không tắt đăng ký chưa gắn phiên. Đây là **ngoại lệ có chủ đích** thêm vào hàng rào ADR-0046 ("đổi quyền không tắt thông báo"), ghi ở `docs/SO-HANG-RAO.md` với ngày quan sát chặn thật. Hai route đổi quyền/vai giữ dạng "giữ-phiên" chủ đã duyệt (ADR-0075 điều 7, bổ sung 2026-10-01); lý do của bổ sung đó nay đọc là "mất miễn do chính sách hoặc do đổi Toàn quyền/IT".

## Hệ quả

- Một migration mới (chỉ thêm bảng); ô quyền mới; 3 route mới; sửa `isSingleDevice`/`issueLoginSession`/`exemptionChangeStatements`; viết lại dòng sổ hàng rào "mất miễn" (cơ chế đổi từ điều kiện SQL sang thứ tự lô) và quan sát chặn thật lại.
- Quản trị và Nhân sự có thể gián tiếp làm người khác bị đăng xuất khỏi máy thừa khi đổi vai/quyền — trước đây chỉ Toàn quyền.
- Trợ giúp "Mỗi tài khoản một máy" thành có điều kiện.
- Phần B (ADR-0074) thi công tuần tự với việc này (cùng đụng `issueLoginSession`).
- Quay lui về 1.58 an toàn: mã cũ bỏ qua bảng chính sách.

## Phương án đã cân nhắc

- **Theo vai / theo từng tài khoản:** chủ không chọn (vai không phải ai cũng có; từng người khó quản lý).
- **Mọi quyền phải "nhiều máy" mới được nhiều máy:** chặt hơn, chủ không chọn.
- **Áp từ lần đăng nhập sau thay vì đăng xuất ngay:** đơn giản hơn nhưng trễ tới 7 ngày; chủ không chọn.
- **Giữ công tắc chung:** trùng nghĩa với "tất cả nhiều máy", nhân đôi trạng thái; chủ chọn bỏ.
- **Chỉ Toàn quyền được đổi vai có kéo theo đổi số máy:** chặt nhất nhưng vướng việc của Nhân sự; chủ không chọn.
