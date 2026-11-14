# Kế hoạch kiểm và thi công giao diện toàn diện, hướng tới lên kho ứng dụng (13/11/2026)

> **Trạng thái: ĐÃ CHỐT 13/11/2026** (lời chủ ở mục 8). Chưa kiểm, chưa thi công.
> Lời chủ (nguyên văn): «tôi cần Audit toàn diện về giao diện, trong đó ưu tiên việc hiển thị mạch lạc, chuyên nghiệp cho toàn bộ ứng dụng ở cả bản web
> và bản mobile, hướng tới sẽ đẩy lên các kho ứng dụng như Appstore và CH Play. Việc này vô cùng quan trọng, hãy cùng thống nhất kế hoạch trước khi
> triển khai việc audit cũng như thi công.»
> Phần lên kho tách riêng: `docs/superpowers/specs/2026-11-13-len-kho-ung-dung-phuong-an.md` (cần ADR chủ duyệt).

## 1. Đây là mở lại việc cũ, không phải việc mới

Chương trình thiết kế lại giao diện đã chạy 27–30/10 rồi chủ tạm gác (`docs/BACKLOG.md` §55). Chủ 13/11 cho **mở lại**. Kế hoạch này **nối tiếp
lộ trình cũ** (`docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/LO-TRINH.md`), không viết lộ trình chồng lên.

| Phần | Tình trạng (kiểm 13/11 trên `main` = bản 2.96) |
|---|---|
| Đánh giá Chặng 1 (63 phát hiện), cổng 1 / 2a / 2b | Xong, trên `main` |
| Bộ Design System v2 (R7vYe6) | Xong; lệch mã từ 7c (BACKLOG §54) |
| Đợt 0 khung chung | Trên production từ 2.47 |
| Luật khung 30/10 (sửa lỗi hiển thị, bảng Đơn hàng máy tính) | Trên `main` (bản 2.51), khối «Luật khung 30/10» cuối `public/app.css` |
| Đợt 0b khung tải (nhánh `dot-0b-khung-tai`, 17 lần lưu) | Chưa gộp; trượt tiêu chí tốc độ 11.4; cũ từ 30/10 |
| Chặng 3 lưới bố cục (đề bài 1b) | Chưa gửi Claude Design |
| Câu treo `2026-10-29-tai-cau-truc-giao-dien/BAN-GIAO.md` mục 5 | Đã trả lời 13/11: phong cách Oracle, không sao chép (mục 8) |

Mọi số đo cũ lấy ở bản 2.47–2.48, đã cách gần 50 bản ⇒ **phải đo lại trước khi kết luận gì**.

**Tự quyết, ghi lại (không hỏi):** đợt 0b giữ gác. Bước 0 đo lại tốc độ trên `main`; chỉ khi tốc độ thành điểm chặn lên kho mới mở lại 0b
(gộp `main` vào nhánh rồi đo lại). Lý do: 0b không đạt tiêu chí tốc độ của chính nó, gộp vội làm mở trang lần đầu chậm hơn.

## 2. Phạm vi kiểm (mức toàn diện — chủ 13/11 nâng cấp)

Cách AI hiểu «nâng cấp lên mức toàn diện hơn» (giả định, chủ sửa được): không chỉ nhìn hình từng trang, mà kiểm **mọi thứ một người dùng thấy và
chạm vào**, theo bốn chuẩn đối chiếu công khai, cộng **điều kiện của hai kho ở dạng công khai**.

**Bốn chuẩn đối chiếu:** Apple Human Interface Guidelines (iPhone, iPad); Material Design (Android); WCAG 2.2 mức AA (trợ năng);
mười nguyên tắc dễ dùng của Nielsen. **Phong cách tham chiếu:** Oracle Redwood — học nguyên tắc, không chép (mục 8).

**Tám lớp kiểm:**
1. **Thị giác:** bố cục, khoảng trống, lưới, phân cấp chữ, màu, biểu tượng, tính nhất quán thành phần (so với bộ v2).
2. **Luồng thao tác:** hành trình đầu–cuối của **mọi** vai (11 quyền + bộ lai thường gặp), đếm số chạm, chỗ kẹt, chỗ phải đoán.
3. **Chữ:** nhãn, câu báo, câu lỗi, trạng thái rỗng — đúng bảng tham chiếu từ ngữ, không chữ Anh, không mã thô, không câu dài khó hiểu.
4. **Trạng thái:** rỗng / ít / nhiều, đang tải, lỗi máy chủ, không quyền, không có trang, ngoài mạng, phiên hết hạn, bảo trì.
5. **Trợ năng:** axe; đi bằng bàn phím; **VoiceOver** (iPhone) và TalkBack (Android) đọc đúng; phóng chữ cỡ lớn của máy không vỡ bố cục.
6. **Thiết bị và khổ:** 360 / 390 / 430 (điện thoại), **iPad đứng và nằm**, 1024 / 1280 / 1440 (máy tính); xoay ngang điện thoại; tai thỏ,
   thanh home, bàn phím ảo.
7. **Cảm giác ứng dụng và tốc độ:** mở lần đầu / mở lại, chuyển trang, nhảy bố cục, phản hồi khi bấm, màn chờ khi mở, thanh trạng thái.
8. **Bề mặt ngoài trang:** hộp thoại, bảng trượt, thông báo nhanh, ảnh biên nhận gửi khách, trang Đăng nhập, trang 404 / ngoài mạng,
   biểu tượng, tên dưới biểu tượng.

**Cộng thêm cho kho công khai:** trang chính sách quyền riêng tư và trang hỗ trợ công khai; lối xin xoá tài khoản; màn đầu cho người chưa có tài
khoản; tài khoản thử cho người duyệt; ảnh giới thiệu trên kho (danh sách đầy đủ ở tờ phương án, mục 5).

**Ma trận:** đủ 61 trang trong `PAGES` (`src/shared/sw-policy.ts`); cặp (trang, vai) lấy từ bảng `TRANG` (`src/shared/muc-giao-dien.ts`) và
kịch bản `ma-tran-quyen.mjs` của 27/10, mỗi trang thêm một vai bị từ chối. Ảnh bằng chứng ở 390, iPad và 1280; các khổ khác chỉ quét số.
**Máy thật:** iPhone của chủ (danh sách 15 mục `docs/PWA-IPHONE.md` + VoiceOver + chữ cỡ lớn); Android và iPad: «chưa kiểm» tới khi có máy.
**Không thuộc phạm vi:** đổi nghiệp vụ, quyền, cách tính tiền. **Chế độ tối:** không làm (Nền tảng chỉ có giao diện sáng; kho không bắt buộc).

## 3. Tiêu chí «mạch lạc, chuyên nghiệp» viết thành hành vi kiểm được

Máy đo tự động, trừ dòng ghi «tay». Ngưỡng do AI đặt (bề mặt, đảo ngược được), chủ có thể sửa.

| # | Hành vi | Ngưỡng đạt | Đo bằng |
|---|---|---|---|
| T1 | Không cuộn ngang | 0 trang ở mọi khổ | `do-trang.mjs` |
| T2 | Không cắt chữ thông tin chính (tên khách, mã đơn, số tiền, số khách) | 0 chỗ | `do-loi.py` (30/10) |
| T3 | Không phần tử nổi / dính đè nút hay số tiền | 0 chỗ | thử điểm chạm (`elementFromPoint`) |
| T4 | Vùng chạm ở điện thoại | mọi nút, liên kết ≥ 44 × 44 | `do-trang.mjs` |
| T5 | Một tiêu đề và tối đa một nút chính mỗi màn | 100 % trang | `do-trang.mjs` |
| T6 | Ít kiểu dáng: số hình nút / huy hiệu / cỡ chữ khác nhau mỗi màn | ≤ 3 hình nút, ≤ 5 cỡ chữ; huy hiệu cùng nghĩa cùng hình | `dem-kieu.py`, `dem-token.mjs` |
| T7 | Khoảng trống: nội dung không giãn hai mép, không hố trống giữa | bề rộng nội dung theo lưới chung (Chặng 3) | quét mốc khổ |
| T8 | Trợ năng tự động | axe 0 lỗi mức nặng / nghiêm trọng; tương phản đạt AA | axe-core |
| T9 | Trạng thái chuẩn (lớp 4) | dùng khối chung đợt 0; không lộ mã thô hay chữ Anh | `do-trang.mjs` + ảnh |
| T10 | Không nhảy bố cục khi dữ liệu về | CLS < 0,1 | `do-toc-do.mjs` |
| T11 | Tốc độ | mở lại ≤ 1 giây; mở lần đầu đo và báo | `do-toc-do.mjs` |
| T12 | Hộp hỏi của hệ điều hành (`confirm`/`alert`) | 0 (hiện 16, có bài khoá trần) | `src/ratchet-confirm-alert.test.ts` |
| T13 | Cảm giác ứng dụng: vùng an toàn, thanh trạng thái, bàn phím không che nút lưu, xoay ngang không vỡ | đạt trên iPhone thật | tay |
| T14 | Hành trình mọi vai tới đích | 100 % (27/10: 8/10) | `hanh-trinh.mjs` |
| T15 | Bộ đọc màn hình đọc được mọi nút, ô, trạng thái | 0 nút không tên; thứ tự đọc đúng | quét nhãn trợ năng + tay VoiceOver |
| T16 | Chữ cỡ lớn của máy (200 %) | không cắt, không chồng chữ | quét ở cỡ chữ 200 % |
| T17 | Chữ trên giao diện khớp bảng tham chiếu | 0 lệch (đã có bài khoá chữ nút; mở rộng sang nhãn, câu báo) | bài sẵn có + quét |
| T18 | Điểm theo mười nguyên tắc Nielsen cho từng họ màn | không họ nào dưới 7/10 | đánh giá chuyên gia, có ảnh kèm |
| T19 | Điều kiện kho công khai (tờ phương án mục 5) | đủ từng mục | danh sách |

**Mức của mỗi phát hiện:** *Chặn kho* (kho có thể từ chối, hoặc làm hỏng việc) · *Nặng* (thấy ngay, làm người dùng nghi ngờ) · *Nhỏ*.

## 4. Cách thu bằng chứng

- Máy chủ thử cục bộ, D1 tạm, dữ liệu gieo (không đụng production). Dùng lại kịch bản ở
  `docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/` và `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/`; viết thêm phần
  còn thiếu (T3, T7, T15, T16, iPad). Áp tệp giao diện công ty giống production trước khi chụp (bài học 30/10).
- Ảnh thật mỗi trang ở 390, iPad, 1280; một trang so sánh cho chủ xem (lưới ảnh theo họ màn, mỗi ảnh gắn mã phát hiện).
- Số liệu thô và bộ ảnh đầy đủ để ngoài kho; trong kho chỉ giữ ảnh đại diện + số liệu tóm tắt ở `docs/evidence/2026-11-13-kiem-giao-dien/`.
- Bộ kiểm dài (`npm test`, e2e, kịch bản Chrome) chạy **một lần** ở cuối mỗi đợt.

## 5. Thứ tự

| Bước | Việc | Nối lộ trình cũ | Cổng chủ |
|---|---|---|---|
| 0 | Kiểm toàn diện trên `main` theo mục 2–4; báo cáo một trang + danh sách phát hiện xếp mức | Chặng 1 đo lại, mở rộng tám lớp | Chủ đọc, chọn đợt |
| 0' | Song song: soạn ADR lên kho công khai (tờ phương án) | mới | Chủ duyệt ADR |
| 1 | Sửa lỗi hệ thống ở khung chung (tràn, che, vùng chạm, trạng thái, hộp hỏi hệ điều hành, trợ năng chung) | nợ đợt 0 (§53), §54 | Ảnh trước / sau |
| 2 | Lưới bố cục chung theo phong cách Oracle Redwood (sửa đề bài 1b cho đúng mục 8, gửi Claude Design, Claude Code kiểm so mã) | Chặng 3 | Ảnh trước / sau |
| 3 | Theo họ màn, nhiều người dùng trước: Lập đơn – Đơn hàng – Chi tiết đơn → Tài xế, Vận chuyển → Tiền (Sổ công nợ, Hoa hồng) → Quản trị, Danh mục → Màn của đối tác bên ngoài | năm đề bài họ màn | Mỗi họ một lần duyệt ảnh |
| 4 | Sẵn sàng kho công khai (theo ADR đã duyệt) | mới | ADR |

Mỗi đợt: xem trước bằng ảnh thật (lớp CSS tiêm tạm) → chủ duyệt → thi công trên nhánh riêng → kiểm độc lập → chủ tự nhập bản chính và
triển khai. Bước 1–3 không chạm dữ liệu, quyền, tiền; riêng chỗ **hiển thị tiền** ở bước 3 tính là việc lớn. Bước 4 có chạm tài khoản
(tài khoản thử, xin xoá tài khoản) nên là việc lớn.

## 6. Người kiểm độc lập

- Mỗi đợt thi công: một trợ lý kiểm **chỉ đọc** (vai `nguoi-kiem-doc-lap`), khác phiên thi công, đọc mã thật, chạy lại kịch bản đo, so ảnh
  trước / sau với tiêu chí mục 3. Báo «đạt» chỉ dựa vào báo cáo đó + bài kiểm.
- Bước 0 không tự nghiệm thu: một trợ lý khác đọc lại báo cáo, lấy mẫu 10 phát hiện, chạy lại đo để xác nhận.
- Chủ thử iPhone thật ở cuối bước 1 và cuối bước 3.

## 7. Câu hỏi đã hỏi (13/11)

1. Mở lại việc thiết kế lại đã gác 30/10? 2. Bản trên kho dành cho ai? 3. Phần mềm mẫu nào?

## 8. Lời chủ chốt (13/11/2026, nguyên văn)

1. «Mở lại, nhưng nâng cấp độ lên mức toàn diện hơn» ⇒ mở lại BACKLOG §55; phạm vi nâng lên tám lớp + bốn chuẩn đối chiếu (mục 2).
   Cách hiểu «toàn diện hơn» là giả định của AI, ghi ở mục 2; chủ sửa được.
2. «Công khai» ⇒ hai kho phát hành công khai. AI đã nói một lần rủi ro bị Apple từ chối vì ứng dụng chỉ người có tài khoản công ty mới dùng được
   (tờ phương án mục 4); chủ quyết, ADR soạn theo hướng công khai, có đường lùi.
3. «Mang phong cách Orcale, không sao chép» ⇒ Oracle Redwood là tham chiếu **nguyên tắc** (bố cục, phân cấp, mật độ thông tin, cách sắp nút
   và trạng thái) cho cả máy tính lẫn điện thoại. **Không** chép hình, biểu tượng, phông, tên thành phần hay màu của Oracle; giữ màu, phông,
   biểu tượng của Tour Đảo và bộ v2.
