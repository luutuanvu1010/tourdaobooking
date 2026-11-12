# Kế hoạch kiểm và thi công giao diện toàn diện, hướng tới lên kho ứng dụng (13/11/2026)

> **Trạng thái: BẢN NHÁP — chờ chủ chốt** (ba câu ở mục 7). Chưa kiểm, chưa thi công. Chốt xong thì ghi lời chủ vào mục 8 và đổi dòng này.
> Lời chủ (nguyên văn): «tôi cần Audit toàn diện về giao diện, trong đó ưu tiên việc hiển thị mạch lạc, chuyên nghiệp cho toàn bộ ứng dụng ở cả bản web
> và bản mobile, hướng tới sẽ đẩy lên các kho ứng dụng như Appstore và CH Play. Việc này vô cùng quan trọng, hãy cùng thống nhất kế hoạch trước khi
> triển khai việc audit cũng như thi công.»
> Phần lên kho tách riêng: `docs/superpowers/specs/2026-11-13-len-kho-ung-dung-phuong-an.md` (cần ADR chủ duyệt).

## 1. Đây là mở lại việc cũ, không phải việc mới

Chương trình thiết kế lại giao diện đã chạy 27–30/10 rồi chủ tạm gác (`docs/BACKLOG.md` §55). Kế hoạch này **nối tiếp lộ trình cũ**
(`docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/LO-TRINH.md`), không viết lộ trình chồng lên.

| Phần | Tình trạng (kiểm 13/11 trên `main` = bản 2.96) |
|---|---|
| Đánh giá Chặng 1 (63 phát hiện), cổng 1 / 2a / 2b | Xong, trên `main` |
| Bộ Design System v2 (R7vYe6) | Xong; lệch mã từ 7c (BACKLOG §54) |
| Đợt 0 khung chung | Trên production từ 2.47 |
| Luật khung 30/10 (sửa lỗi hiển thị, bảng Đơn hàng máy tính) | Trên `main` (bản 2.51), khối «Luật khung 30/10» cuối `public/app.css` |
| Đợt 0b khung tải (nhánh `dot-0b-khung-tai`, 17 lần lưu) | Chưa gộp; trượt tiêu chí tốc độ 11.4; cũ từ 30/10 |
| Chặng 3 lưới bố cục (đề bài 1b) | Chưa gửi Claude Design |
| Câu treo `2026-10-29-tai-cau-truc-giao-dien/BAN-GIAO.md` mục 5 | Chủ chưa trả lời (hỏi lại ở câu 3, mục 7) |

Mọi số đo cũ lấy ở bản 2.47–2.48, đã cách gần 50 bản ⇒ **phải đo lại trước khi kết luận gì**.

**Tự quyết, ghi lại (không hỏi):** đợt 0b giữ gác. Bước 0 đo lại tốc độ trên `main`; chỉ khi tốc độ thành điểm chặn lên kho mới mở lại 0b
(gộp `main` vào nhánh rồi đo lại). Lý do: 0b không đạt tiêu chí tốc độ của chính nó, gộp vội làm mở trang lần đầu chậm hơn.

## 2. Phạm vi kiểm

- **Trang:** đủ 61 trang trong `PAGES` (`src/shared/sw-policy.ts`), cộng ảnh gửi khách (biên nhận) và hộp thoại / bảng trượt mở từ trang.
- **Vai:** không chạy 61 × 11. Lấy cặp (trang, vai) **mở được thật** từ bảng `TRANG` (`src/shared/muc-giao-dien.ts`) và kịch bản
  `ma-tran-quyen.mjs` của đợt 27/10; mỗi trang thêm **một** vai bị từ chối để chụp màn không có quyền.
- **Khổ:** ảnh bằng chứng ở **390** (iPhone) và **1280** (máy tính); quét thêm 360 / 430 / 768 / 1024 / 1440 chỉ để bắt khoảng trống
  và tràn ở mốc chuyển (lời chê «khoảng trống vô lý»).
- **Trạng thái dữ liệu:** rỗng / ít / nhiều, đang tải, lỗi máy chủ, ngoài mạng — như bộ dữ liệu gieo 27/10.
- **Máy thật:** iPhone của chủ theo danh sách 15 mục ở `docs/PWA-IPHONE.md`; Android: chưa có máy thật (ghi «chưa kiểm» tới khi có).
- **Không thuộc phạm vi:** đổi nghiệp vụ, quyền, cách tính tiền; câu chạm nghiệp vụ thấy khi kiểm ghi sổ riêng, chờ chủ.

## 3. Tiêu chí «mạch lạc, chuyên nghiệp» viết thành hành vi kiểm được

Máy đo tự động, trừ dòng ghi «tay». Ngưỡng do AI đặt (bề mặt, đảo ngược được), chủ có thể sửa.

| # | Hành vi | Ngưỡng đạt | Đo bằng |
|---|---|---|---|
| T1 | Không cuộn ngang | 0 trang ở mọi khổ | `do-trang.mjs` |
| T2 | Không cắt chữ thông tin chính (tên khách, mã đơn, số tiền, số khách) | 0 chỗ | `do-loi.py` (30/10) |
| T3 | Không phần tử nổi / dính đè nút hay số tiền | 0 chỗ | thử điểm chạm (`elementFromPoint`) |
| T4 | Vùng chạm ở 390 | mọi nút, liên kết ≥ 44 × 44 | `do-trang.mjs` |
| T5 | Một tiêu đề và tối đa một nút chính mỗi màn | 100 % trang | `do-trang.mjs` |
| T6 | Ít kiểu dáng: số hình nút / huy hiệu / cỡ chữ khác nhau mỗi màn | ≤ 3 hình nút, ≤ 5 cỡ chữ; huy hiệu cùng nghĩa cùng hình | `dem-kieu.py`, `dem-token.mjs` |
| T7 | Khoảng trống: nội dung không giãn hai mép, không hố trống giữa | bề rộng nội dung theo lưới chung (Chặng 3) | quét mốc khổ |
| T8 | Trợ năng | axe 0 lỗi mức nặng / nghiêm trọng; tương phản đạt AA | axe-core |
| T9 | Trạng thái chuẩn: rỗng, đang tải, lỗi, không quyền, không có trang, ngoài mạng | dùng khối chung đợt 0; không lộ mã thô hay chữ Anh | `do-trang.mjs` + ảnh |
| T10 | Không nhảy bố cục khi dữ liệu về | CLS < 0,1 | `do-toc-do.mjs` |
| T11 | Tốc độ | mở lại ≤ 1 giây; mở lần đầu đo và báo, chưa đặt ngưỡng chặn | `do-toc-do.mjs` |
| T12 | Hộp hỏi của hệ điều hành (`confirm`/`alert`) | 0 (hiện 16, có bài khoá trần) | `src/ratchet-confirm-alert.test.ts` |
| T13 | Cảm giác ứng dụng: vùng an toàn tai thỏ / thanh home, thanh trạng thái, bàn phím không che nút lưu | đạt trên iPhone thật | tay, `docs/PWA-IPHONE.md` |
| T14 | Hành trình thật của từng vai tới đích | 10/10 (27/10: 8/10) | `hanh-trinh.mjs` |

**Mức của mỗi phát hiện:** *Chặn kho* (kho có thể từ chối, hoặc làm hỏng việc) · *Nặng* (thấy ngay, làm người dùng nghi ngờ) · *Nhỏ*.

## 4. Cách thu bằng chứng

- Máy chủ thử cục bộ, D1 tạm, dữ liệu gieo (không đụng production). Dùng lại kịch bản đã có ở
  `docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/` và `docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/`; chỉ viết
  thêm phần còn thiếu (T3, T7). Áp tệp giao diện công ty giống production trước khi chụp (bài học 30/10).
- Ảnh thật 390 + 1280 mỗi trang; một trang so sánh cho chủ xem (lưới ảnh theo họ màn, mỗi ảnh gắn mã phát hiện).
- Số liệu thô và bộ ảnh đầy đủ để ngoài kho; trong kho chỉ giữ ảnh đại diện + số liệu tóm tắt ở `docs/evidence/2026-11-13-kiem-giao-dien/`.
- Bộ kiểm dài (`npm test`, e2e, kịch bản Chrome) chạy **một lần** ở cuối mỗi đợt, không lặp từng bước.

## 5. Thứ tự

| Bước | Việc | Nối lộ trình cũ | Cổng chủ |
|---|---|---|---|
| 0 | Đo lại toàn bộ trên `main` theo mục 2–4; báo cáo một trang + danh sách phát hiện xếp mức | Chặng 1 đo lại | Chủ đọc, chọn đợt nào làm |
| 1 | Sửa lỗi hệ thống ở khung chung (tràn, che, vùng chạm, trạng thái, hộp hỏi hệ điều hành) | nợ đợt 0 (§53), §54 | Ảnh trước / sau |
| 2 | Lưới bố cục chung (gửi đề bài 1b cho Claude Design, Claude Code kiểm so mã) | Chặng 3 | Ảnh trước / sau |
| 3 | Theo họ màn, nhiều người dùng trước: Lập đơn – Đơn hàng – Chi tiết đơn → Tài xế, Vận chuyển → Tiền (Sổ công nợ, Hoa hồng) → Quản trị, Danh mục → Màn của đối tác bên ngoài | năm đề bài họ màn | Mỗi họ một lần duyệt ảnh |
| 4 | Sẵn sàng kho (biểu tượng, màn chờ, ảnh giới thiệu, trang chính sách quyền riêng tư…) — chỉ sau khi ADR lên kho được duyệt | mới | ADR |

Mỗi đợt: xem trước bằng ảnh thật (lớp CSS tiêm tạm) → chủ duyệt → thi công trên nhánh riêng → kiểm độc lập → chủ tự nhập bản chính và
triển khai. Bước 1–3 không chạm dữ liệu, quyền, tiền; riêng chỗ **hiển thị tiền** ở bước 3 tính là việc lớn.

## 6. Người kiểm độc lập

- Mỗi đợt thi công: một trợ lý kiểm **chỉ đọc** (vai `nguoi-kiem-doc-lap`), khác phiên thi công, đọc mã thật, chạy lại kịch bản đo, so ảnh
  trước / sau với tiêu chí mục 3. Báo «đạt» chỉ dựa vào báo cáo đó + bài kiểm.
- Bước 0 (kiểm) không tự nghiệm thu chính nó: một trợ lý khác đọc lại báo cáo, lấy mẫu 10 phát hiện, chạy lại đo để xác nhận.
- Chủ thử iPhone thật ở cuối bước 1 và cuối bước 3.

## 7. Câu hỏi cho chủ (một lần)

1. **Mở lại việc thiết kế lại giao diện đã gác ngày 30/10**, nhập vào chương trình này và đi tiếp từ đo lại? *Khuyến nghị: mở lại.* Lý do: lời chê
   «không mạch lạc, khoảng trống» chính là phần lưới bố cục (Chặng 3) đang gác; không mở thì bước 2 không làm được.
2. **Bản trên kho dành cho ai?** *Khuyến nghị: chỉ nhân viên và đối tác, phát hành không công khai; lúc này chỉ soạn ADR so sánh, chưa đăng ký
   tài khoản nhà phát triển, chưa trả tiền.* Lý do: câu trả lời quyết hướng đóng gói và giấy tờ phải chuẩn bị (xem tờ phương án).
3. **Phần mềm mẫu:** có phần mềm nào bạn từng dùng thấy gọn, muốn Nền tảng giống? *Khuyến nghị: giữ hướng đã ghi trong bộ v2 (kiểu phần mềm
   doanh nghiệp Oracle / SAP cho máy tính, điện thoại theo kiểu ứng dụng Việt quen thuộc như MoMo).* Lý do: đây là câu treo từ 29/10; nó định
   «chuyên nghiệp» trông ra sao khi Claude Design vẽ lưới.

Không trả lời thì đi theo khuyến nghị; riêng câu 2 khi chưa trả lời chỉ soạn ADR, không làm gì tốn tiền.

## 8. Lời chủ chốt

(chưa có)
