# Phụ lục 2 — Đối chiếu với tinh thần Oracle TCA và Hiến chương

## 1. Tinh thần đã duyệt, trích từ tài liệu của dự án (không trích bảng Oracle nào ngoài tài liệu)

Nguồn: `docs/Ref/Oracle-crm-triet-ly-va-checklist.md` (triết lý 1 và 5), `docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md` (§2 triết lý 1 và 5, §3 bốn lớp), ADR-0001 điều 2 và 4, ADR-0010, Hiến chương `docs/ARCHITECTURE.md` Phần I điều 2.1–2.3, 5.2, 5.6.

- **Định danh trước vai (triết lý 1; Hiến chương 2.1):** "Khách hàng", "Nhà cung cấp", "Đối tác" chỉ là vai/ngữ cảnh một hồ sơ đóng trong một khoảng thời gian, không phải định danh riêng.
- **Thêm loại vai = thêm một dòng dữ liệu (ADR-0001 điều 2):** "Loại vai trò là bảng tra cứu `pty_role_type` (…; thêm loại = thêm dòng)". Bảng tham chiếu Oracle ở dự án ghi vai/mối quan hệ là "usage/relationship", có hiệu lực theo thời gian.
- **Phép thử của Hiến chương (điều 2.2):** "thêm một giá trị mới mà không phải sửa mã → là dữ liệu (bảng tra cứu, dòng chính sách). Mã phải rẽ nhánh theo giá trị → tập đóng (`CHECK`) và đổi bằng ADR."
- **Cấu hình bằng dữ liệu có kiểu (điều 5.2; triết lý 5):** "Điều doanh nghiệp hay đổi (mức, tỷ lệ, người bán, loại hình) là dòng dữ liệu có ngày hiệu lực."
- **Điều khoản thương mại gắn vào vai/hồ sơ, không gắn vào tài khoản đăng nhập (điều 2.3; ADR-0018 điều 1).**
- **Vai không bao giờ là cổng cho phép (ADR-0001 điều 4; ADR-0018 điều 3):** quyền do hàm sinh quyền và bảng quyền quyết.
- **Chụp tại mốc (điều 5.6):** đổi chính sách sau mốc không đổi đối tượng đã chụp.

Giới hạn của tôi: tài liệu `docs/Ref/thiet-ke-party-relationship-tca.md` chỉ mô tả bảng Party, quan hệ/vai, tài khoản giao dịch, địa điểm; **không có phần nói về phân loại đối tác hay hạng**. Tôi không nêu tên bảng Oracle cụ thể nào cho "phân loại" vì chưa đối chiếu được từ tài liệu của dự án (chưa kiểm).

## 2. Phần của thiết kế hiện tại trái tinh thần "vai và phân loại là dữ liệu"

| # | Chỗ lệch | Bằng chứng | Trái điều nào |
|---|---|---|---|
| L1 | Thêm một **loại đối tác** buộc phải sửa mã (hai chỗ trong `roles.ts`) và viết migration, ngay cả khi loại đó chỉ để tính hoa hồng | `src/shared/roles.ts:7-10, 44-48`; không có câu `INSERT` vào `pty_role_type` / `prc_beneficiary_role` ngoài migration | Phép thử điều 2.2; ADR-0001 điều 2 ("thêm loại = thêm dòng") |
| L2 | **Phân loại kinh doanh và vai kỹ thuật bị gộp làm một.** Năm loại đối tác là vai EXTERNAL, nên "thuộc loại nào để tính hoa hồng" và "được cấp quyền Đối tác" là một sự kiện | `roles.ts:44-48` (cả năm sinh `PARTNER`); `parties/index.ts:197,200,1077` (loại EXTERNAL chỉ gán qua màn Tài khoản) | Điều 2.2 (vai theo ngữ cảnh ≠ chính sách); ADR-0018 điều 1 ("sáu lớp tách riêng") |
| L3 | **Hệ quả của L2: tổ chức không mang được loại đối tác.** Công ty lữ hành là hồ sơ tổ chức nhưng loại EXTERNAL chỉ gán cho tài khoản, mà tài khoản chỉ gắn hồ sơ cá nhân | `docs/BACKLOG.md:258` (BL-SDL-TO-CHUC); `tests/e2e/so-dai-ly.mjs:32` | Điều 2.1 (tổ chức và cá nhân cùng là hồ sơ, vai gán cho hồ sơ) |
| L4 | **Danh sách "được hưởng hoa hồng" là dữ liệu nhưng không có đường nào sửa ngoài migration** | `migrations/0090:19-36`; không có route ghi `prc_beneficiary_role` | Điều 5.2 (cấu hình là dữ liệu do người dùng đổi được) |
| L5 | **Mức hoa hồng gắn thẳng vào từng loại**, không có "mức có tên" dùng chung; hai loại cùng số phải nhập hai lần và đổi hai lần | `migrations/0090:39-60`; `pricing/rules.ts:71-91` | Không trái chữ điều nào; chỉ trái tinh thần "cấu hình hơn là tuỳ biến" (triết lý 5): thiếu một lớp cấu hình để mức là một thứ có tên, loại đối tác chỉ trỏ vào. Đây là nhận định của người soạn, không phải điều đã duyệt |
| L6 | **Chỗ chặn "Đã giao" khoá theo nhóm vai EXTERNAL** thay vì theo thực tế "bên đặt có hưởng hoa hồng" — nghĩa là luật tiền dựa vào cách phân vai tài khoản | `orders/hoan-tat-repo.ts:76`; `billing/rules.ts:459` | Điều 5.1 và 2.2 (luật phải đọc dữ liệu đúng nghĩa của nó, không đọc qua một vai kỹ thuật) |

Phần **không** lệch (giữ nguyên): mức hoa hồng đã có ngày hiệu lực, chỉ-thêm và đóng (đúng 5.2/5.5); chụp vào đơn tại mốc Xác nhận (đúng 5.6); mức không bao giờ tự lấy 0 (5.7); vai không là cổng quyền (ADR-0001 điều 4); ADR-0078 đã làm đúng khuôn "nhãn không sinh quyền" với `SUPPLIER` (nhóm OTHER).

## 3. Phần của ADR-0018 vẫn nên giữ, để khỏi hiểu nhầm là đang lật lại

ADR-0018 điều 2 giữ **bộ quyền mặc định của vai tài khoản cố định trong mã** và loại bỏ phương án "Toàn quyền sửa bảng vai → quyền ngay trong app" (mục "Phương án bị loại"). Đề xuất này **không đụng điều đó**: nhãn kinh doanh mới không có bộ quyền nào, nên không có gì để "sửa quyền trong app". Chỉ khi chọn phương án B (xem phụ lục 3) mới đi ngược điều đó.
