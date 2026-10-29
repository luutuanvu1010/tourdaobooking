# Bàn giao: tái cấu trúc toàn diện giao diện Nền tảng — phiên 29/10/2026 (đang hỏi ý chủ, CHƯA có thiết kế)

> **Hồ sơ có ngày: không sửa.** Có gì mới thì viết tệp mới trỏ về tệp này. Phiên viết: nhánh `claude/ban-giao-tai-cau-truc-giao-dien` (dựng từ main `25f127d1`). Chỉ tài liệu + ảnh, không sửa mã, không chạm production.

## 0. Tóm tắt

Chủ dự án chê trang «Hoa hồng đối tác» khó hiểu, rồi mở rộng yêu cầu thành **tái cấu trúc toàn diện giao diện** trên nền Design System, token và kiến trúc thiết kế, vì giao diện «nhìn không được mạch lạc, có những khoảng trống vô lý». Phiên này đã: (1) phân tích sâu trang Hoa hồng và soạn prompt Claude Design cho riêng trang đó; (2) đọc lại chương trình thiết kế lại đang chạy (bộ v2, khung chung, lộ trình năm họ màn); (3) đo và đánh dấu bảy chỗ bố cục vô lý trên sáu trang máy tính; (4) phát lại cách hiểu đầu tiên cho chủ. **Chủ chưa xác nhận cách hiểu, chưa có thiết kế, chưa có kế hoạch.** Đang ở bước hỏi đáp của `superpowers:brainstorming` — cổng cứng: chưa vẽ, chưa viết mã.

## 1. Lời chủ (nguyên văn, theo thứ tự)

1. «tôi cần thiết kế lại giao diện của trang Hoa hồng đối tác, giao diện hiện tại nhìn quá khó hiểu và không thân thiện, hãy xem ảnh màn hình mới nhất. Cho tôi 1 phân tích sâu sắc, sau đó là Prompt để tôi gửi cho Claude Design nhé»
2. «tôi cần làm ở cấp độ tổng quát và chi tiết hơn, không chỉ vẽ lại 1 trang Hoa hồng đâu, mà là tái cấu trúc lại toàn bộ, dựa trên Design System, design token, kiến trúc thiết kế,.... hãy cùng phân tích và chốt bản kế hoạch chuẩn mực,»
3. Trả lời câu «điều gì ở lộ trình đang chạy làm bạn chưa yên tâm»: «giao diện nhìn không được mạch lạc, có những khoảng trống vô lý trong giao diện nên tôi muón làm lại trên cơ sở tái cấu trúc toàn diện»
4. «soạn handoff liên quan đến redesign giao diện và đóng phiên»

## 2. Hiện trạng chương trình thiết kế lại (đọc ngày 29/10, kiểm lại trước khi dùng)

- Hồ sơ gốc: `docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/` — `BAO-CAO.md`, `HE-THONG-HOP-NHAT.md` (đề cương bộ v2: điều hướng, **năm khuôn trang**, thành phần, đáp ứng 390/768/1040/1440, từ vựng trạng thái, thang nút ba cấp, token ba tầng), `LO-TRINH.md` (thứ tự bước/cổng; mục 2 = năm đề bài họ màn: Danh sách, Chi tiết, Biểu mẫu, Trang chủ & bảng điều khiển, Thiết lập), `QUYET-DINH-CONG-1.md`, `QUYET-DINH-CONG-2A-2026-10-28.md`, `QUYET-DINH-CONG-2B-2026-10-28.md`, `QUYET-DINH-2026-10-28-AI-DUNG-BO-V2.md`.
- Bộ «Island Booking System — Design System v2» đã duyệt (cổng 2a); bản xuất từ Claude Design ở `~/Desktop/Khung chung design system/` (dự án Claude Design đã nối kho GitHub, có khuôn `ThanThietLap`, `ThanDanhSach`, `ThanChiTiet`, `ThanBieuMau`, `ThanBangDieuKhien`).
- **Đợt 0 khung chung ĐÃ LÊN production bản 2.47** (29/10, main `25f127d1`); tờ so sánh trước/sau `docs/evidence/2026-10-29-dot-0-so-sanh/`.
- **Ba nhánh tối 29/10 chưa gộp main** (một phiên khác — «Main session» — viết lúc 20:21–20:39; phiên đó KHÔNG hiện trong `list_sessions` của phiên này):
  - `7c-dong-bo-bo-v2` (`331cc8d4`): đồng bộ bộ v2 từ mã main@25f127d1, máy kiểm bộ khớp mã trong `npm test`.
  - `bien-ban-cong-phat-hanh-dot-0` (`d8577cb7`): biên bản cổng phát hành đợt 0; «Chủ dự án 29/10: mở 7c và đợt 0b khung tải — ADR-0143 accepted».
  - `dac-ta-dot-0b` (`dfffb5ee`): đặc tả đợt 0b (khung tải) bản 2, đã vá QA1 lần 1.
  Đợt 0b là việc **tốc độ tải**, độc lập với bố cục — không cần dừng. Trước bước tốn công: `git branch -a --sort=-committerdate`, đọc lại MEMORY.md (bài học 27/10: hai phiên cùng làm đánh giá UX).
- Lộ trình cũ còn bước 7–12: năm đề bài họ màn (Chặng 3) rồi «phát hành 2» bỏ bí danh token. Chưa họ màn nào bắt đầu.

## 3. Phát hiện của phiên này

### 3.1 Bố cục — «khoảng trống vô lý» (lý do chủ đưa ra)

Gốc: **không có lưới bố cục chung.** Bộ v2 chuẩn hoá màu, chữ, nút, khuôn trang, nhưng chưa có luật «đặt cái gì ở đâu, rộng bao nhiêu»; mỗi trang tự quyết. Số đo trên `public/app.css` (main `25f127d1`):

- 100 token bề rộng `--w-*`; 119 khai báo `grid-template-columns` (kiểu phổ biến: `minmax(0,1fr)` ×16, `1fr 1fr` ×12, `minmax(0,1fr) auto` ×10…).
- Bề rộng nội dung tối đa có sáu mức theo trang: 420 `--w-narrow`, 640 `--w-vc-form`, 720 `--w-vc-mine`, 900 `--w-thiet-lap-max`, 1120 `--w-form`, 1280 `--w-noi-dung-max` (= `--w-main`).
- Thang khoảng cách chỉ một: `--s1`…`--s7` = 4, 8, 12, 16, 24, 32, 48 px (tốt, giữ).

Bảy chỗ đánh dấu trên ảnh `anh/khoang-trong-7-cho-1040.jpg` (ghép sáu ảnh «sau» 1040×800 của `docs/evidence/2026-10-29-dot-0-so-sanh/anh/`: ACCOUNTING-hoa-hong, SUPER_ADMIN-catalog, SUPER_ADMIN-staff, ACCOUNTING-so-cong-no, SALES-parties, SUPER_ADMIN-giao-dien), gom bốn kiểu lặp:

| # | Trang | Chỗ | Kiểu |
|---|---|---|---|
| 1 | Dịch vụ — Nhóm dịch vụ | tên nhóm trái, «0 dịch vụ · Đổi tên · Lên · Xuống · Tắt» dạt mép phải, khoảng trống lớn giữa | chữ một đầu, nút một đầu (`space-between`) |
| 2 | Quản lý tài khoản — Thêm tài khoản | hai ô Họ tên / SĐT ngắn, nửa phải khung trống | ô không rộng theo dữ liệu |
| 3 | Sổ công nợ | ngăn chi tiết phải chiếm nửa màn chỉ để ghi «Chọn một bên…» | vùng trống chiếm chỗ |
| 4 | Hoa hồng — Tra nhanh | ô «— Chọn dịch vụ —» rơi xuống dòng riêng dưới ô gõ; chữ gợi ý bị cắt | ô không theo lưới |
| 5 | Hoa hồng (và nhiều trang) | tên trang hiện hai lần: thanh trên + tiêu đề lớn | lặp — **lệch quyết định 2 cổng 2b** (tiêu đề chỉ ở thanh trên, 18/600); chưa kiểm vì sao (có thể chờ họ màn) |
| 6 | Danh bạ | cột «Công việc hôm nay» gần như trống vẫn chiếm ~¼ bảng | vùng trống chiếm chỗ |
| 7 | Thanh bên | mục đang mở «Hoa hồng đối tác» bị lớp mờ mép dưới che | che — chưa kiểm là lỗi đợt 0 hay do khổ 800 |

Thêm (ảnh chủ `anh/hoa-hong-thiet-lap-1..3.jpg`, production 29/10 ~20:09): hàng nút ở thẻ chính sách — chữ trái, «Ngừng áp dụng» trôi giữa, «Sửa» mép phải; ba kiểu xếp nút khác nhau giữa hai khối; viền xanh 2 px quanh vùng nội dung (giống vành tiêu điểm của `main`) — **chưa kiểm**.

### 3.2 Nghĩa — trang Hoa hồng cho thấy dùng đúng thành phần vẫn chưa đủ

`BAO-CAO.md` 27/10 khen Hoa hồng là một trong ba màn mẫu đáng nhân rộng, nhưng 29/10 chủ thấy nó khó hiểu nhất ⇒ chương trình thiếu tầng **mô hình đối tượng + ngữ pháp hành động**, không chỉ thiếu thành phần. Năm gốc (chi tiết và luật nghiệp vụ trong `PROMPT-CLAUDE-DESIGN-HOA-HONG.md` mục 2–3):

1. **«Tắt» hai nghĩa ngược nhau** — đã đọc mã: tắt LOẠI ⇒ `KHONG_HUONG`, đơn bị giữ (`src/modules/pricing/rules.ts`, Q1 = A; `index.ts` `doiTrangThaiLoai` lật cả hai cờ); tắt CHÍNH SÁCH ⇒ vẫn áp cho gắn đang có (`repository.ts`, chú thích N-23, gắn theo loại và gắn riêng). Nút ghi hành động chứ không ghi tình trạng.
2. **Một sự thật ở ba nơi**, mỗi nơi một bộ nút: gắn loại↔chính sách có nút ở `web/hoa-hong-thiet-lap.ts` (`mucLoai`, `theChinhSach`/`lanApDung`) và `web/hoa-hong-bang.ts` (dòng mở rộng theo loại).
3. **Bức tường nút** ngang hàng; bốn động từ na ná Đổi / Sửa / Ngừng áp dụng / Tắt (nghĩa thật: `src/shared/hoa-hong-hien-thi.ts`, ADR-0148).
4. **Chỗ nguy in như chú thích**: chính sách rỗng hoặc loại không chính sách, không mức riêng ⇒ `chonMuc` trả `NO_RULE` ⇒ giữ đơn, nhưng thẻ Thiết lập in chữ xám; nhãn «Có sẵn» lại tô vàng.
5. **Bố cục + dữ liệu thử** lẫn thật (CTV TA5, TA1… trên production).

Hai lỗi nhỏ thấy khi đọc mã, **chưa bấm thử, chưa sửa**: (a) «Đổi chính sách» ở loại đã tắt gần như chắc luôn lỗi — trigger `prc_role_tier_role_ok` (`migrations/0096_muc_ta_bang_moi.sql`) chặn INSERT; (b) nút Tắt loại gửi lệnh ngay, không hỏi lại (`nutBatTat` → `guiNhanh` trong `web/hoa-hong-hop.ts`), dù hậu quả là giữ đơn. Chủ chưa trả lời câu «sửa ngay hay gộp vào bản vẽ mới» (câu đã hỏi ở khung cuối lượt) — nêu lại **một lần**, mặc định gộp vào lần làm lại; riêng (b) là rủi ro thật nên đáng sửa sớm.

### 3.3 Prompt Claude Design cho riêng Hoa hồng

`PROMPT-CLAUDE-DESIGN-HOA-HONG.md` (cùng thư mục): đã gửi chủ dạng tệp; **không rõ chủ đã dán cho Claude Design chưa** — hỏi. Nếu chương trình tái cấu trúc mới được duyệt, prompt này nên thành đầu vào (luật nghiệp vụ mục 3, dữ liệu mẫu mục 6) cho đề bài họ màn chứa Hoa hồng, không gửi riêng lẻ (nguyên tắc «khung trước, màn sau» của `LO-TRINH.md` mục 0).

## 4. Cách hiểu đã phát lại cho chủ (PHỎNG ĐOÁN — chủ chưa xác nhận)

Chủ không muốn vá từng trang; muốn dựng lại theo **ba tầng**:

1. **Nền:** token (có) **+ lưới bố cục (mới)** — số cột, bề rộng nội dung theo loại trang, khoảng cách, luật căn hàng (nút đứng cạnh thứ nó tác động; ô rộng theo độ dài dữ liệu; ngăn chi tiết chỉ mở khi có nội dung).
2. **Khuôn:** thành phần + khuôn trang (có) **+ khuôn đối tượng nghiệp vụ (mới)** — mỗi đối tượng (đơn, đối tác, chính sách, xe…) hiện một khuôn; mỗi động từ một nghĩa trên toàn Nền tảng; một sự thật một nơi; việc nguy nói hậu quả. Ứng viên khuôn chung: **bản ghi có hiệu lực theo ngày** (Đang / Sắp / Đã ngừng / Đã huỷ) — gặp ở hoa hồng, vai Danh bạ, giấy tờ xe, giá xe.
3. **Trang:** mọi trang dựng lại từ khuôn, không trang nào tự đặt bề rộng; **rào máy** cấm token bề rộng / lưới riêng theo trang.

Giữ bộ v2 và khung chung; thay «năm họ màn vẽ lần lượt» bằng «dựng lưới + khuôn đối tượng trước, rồi làm lại tất cả trang».

## 5. Câu đang treo và vùng còn phải hỏi

- **Câu đang treo (chủ chưa trả lời):** chỗ nào trong cách hiểu ở mục 4 sai; và có phần mềm nào chủ từng dùng nhìn mạch lạc mà muốn Nền tảng gọn giống như thế không. (Bộ v2 đã ghi phong cách Oracle Redwood / SAP Fiori; Trang chủ điện thoại từng theo kiểu MoMo.)
- Vùng còn phải đi qua (theo `superpowers:brainstorming`: mỗi lượt một câu mở; khi dùng AskUserQuestion thì gom tối đa 4 câu, phương án an toàn «(Recommended)» lên đầu — `~/.claude/CLAUDE.md`): phạm vi (mọi trang? Đăng nhập giữ bản 24/9 «tuân thủ 100 %»; trang tài xế và đối tác bên ngoài); tiêu chí thành công đo được (bộ đo Chặng 1 + chỉ số mới cho khoảng trống / độ lệch lưới); phi mục tiêu; nhịp phát hành (mọi đợt qua «cổng phát hành» của cổng 2b mục B: bản local + tờ so sánh + chủ duyệt); quan hệ với năm đề bài họ màn (thay hay giữ khung); ai vẽ (quyết định 28/10: Claude Design dựng, Claude Code trích sự thật từ mã + kiểm).
- Khi bàn bố cục: đề nghị «visual companion» của skill (một tin riêng), vì chủ hiểu bằng hình nhanh hơn chữ.

## 6. Ràng buộc đã chốt — áp dụng, không hỏi lại

- Cổng 2b: khổ 641–899 dùng bố cục điện thoại; tiêu đề trang ở thanh trên (18/600); hộp thoại giữa màn từ 641; **mọi đợt** thi công qua cổng phát hành (local + tờ so sánh trước/sau theo bộ đo Chặng 1 + chủ duyệt) trước day-len.
- 28/10 chia đôi: Claude Design dựng bộ / bản vẽ; Claude Code trích sự thật từ mã và kiểm giá trị. Sau 7c: `public/app.css` là nguồn duy nhất, bộ trên Claude là tấm gương.
- Token theo expand–contract (phát hành 1 thêm tên + bí danh, phát hành 2 bỏ bí danh); không đổi giá trị nhóm tourdaovn.
- Mỗi lượt duyệt tối đa 3 quyết định chạm quyền/dữ liệu; bảng từ ADR-0130 tối đa 3 tên mỗi lượt; chủ chọn tên.
- Giao diện không tự tính «mức nào thắng» (ADR-0077 điều 6).
- Thi công là **việc lớn** (nhiều trang, giao diện tiền): đặc tả → kế hoạch → subagent kiểm độc lập chỉ đọc → kịch bản Chrome đúng bảng `web/CLAUDE.md` + kịch bản đo của Chặng 1.
- Trả lời chủ: tiếng Việt có dấu, kết luận trước, lời thường, «Nền tảng» không «App».

## 7. Việc kế cho phiên sau (theo thứ tự)

1. Đọc tệp này, `LO-TRINH.md`, `QUYET-DINH-CONG-2B-2026-10-28.md`; kiểm ba nhánh ở mục 2 đã lên main chưa; tìm «Main session» qua commit của các nhánh đó.
2. Hỏi lại câu đang treo (mục 5), tiếp `superpowers:brainstorming` tới khi đủ viết thiết kế.
3. Đề xuất một lượt **đo lưới** bằng kịch bản (mở rộng `docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/do-trang.mjs`): mỗi trang dùng bề rộng nào, bao nhiêu hàng `space-between` có khoảng trống > N px, ô nhập lệch độ dài dữ liệu — để có số trước/sau.
4. Viết thiết kế `docs/superpowers/specs/<ngày>-tai-cau-truc-giao-dien-design.md` → subagent «builder check» của skill → chủ duyệt → `superpowers:writing-plans`. Có thể kèm đề xuất ADR nếu đổi lộ trình đã duyệt (năm họ màn) hoặc thêm rào máy cấm bề rộng riêng.
5. Nêu lại hai lỗi nhỏ Hoa hồng (mục 3.2) một lần; hỏi chủ đã gửi prompt Hoa hồng cho Claude Design chưa.

## 8. Tệp trong thư mục này

- `BAN-GIAO.md` — tệp này.
- `PROMPT-CLAUDE-DESIGN-HOA-HONG.md` — prompt riêng trang Hoa hồng (mục 2: vì sao thất bại; mục 3: luật nghiệp vụ đã đối chiếu mã; mục 6: dữ liệu mẫu).
- `anh/khoang-trong-7-cho-1040.jpg` — sáu trang máy tính sau đợt 0, đánh số bảy chỗ (mục 3.1).
- `anh/hoa-hong-thiet-lap-1.jpg`, `-2.jpg`, `-3.jpg` — ảnh chủ chụp thẻ Thiết lập trang Hoa hồng trên production 29/10 ~20:09 (thu nhỏ 1600 px).
