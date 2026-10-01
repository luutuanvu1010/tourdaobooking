# Đề xuất ADR — Sổ tiền lượt 2 (đại lý / đối tác, nhà cung cấp, quyết toán tháng, khoá kỳ, đối tác xem sổ)

- **Ngày:** 2026-10-01. **Vai:** lập kế hoạch (AI soạn nháp, không thi công, không tự duyệt — Hiến pháp N3, Điều 7.2).
- **Trạng thái:** bản nháp đã commit ở `a434dc08`; **người kiểm độc lập vòng 1: ĐẠT CÓ ĐIỀU KIỆN** (4 CAO, 11 VỪA, 6 THẤP) — **đã sửa theo cả 21 mục** (bản sửa chưa commit, **chưa được kiểm lại**). Bước tiếp: người kiểm vòng 2 → trình chủ theo bốn lượt dưới đây.
- **Vì sao có:** chủ 1/10 xếp "phân hệ theo dõi tiền (đại lý đối tác và HDV tại cảng nợ công ty và/hoặc ngược lại)" vào phần **bắt buộc để xe chạy**, và chọn **U3** (ghi nợ từng đơn, chốt tháng, bù trừ, khoá sổ tháng) + **U4** (đối tác xem sổ của mình) — `docs/superpowers/specs/2026-10-01-uu-tien-xe-chay-quyet-dinh.md`. Hôm nay đơn của đại lý **bị chặn "Đã giao"** ở **hai lớp**: mã (`src/modules/billing/rules.ts:179-181`) và câu SQL của `orders` (`src/modules/orders/hoan-tat-repo.ts:16`, `:76`) — ADR-0026 M1 = A.
- **Mốc mã:** nhánh `worktree-doi-chieu-phieu-giam-doc` @`8f647226`; `main` @`0c4309cd` (bản 1.50).
- **Cập nhật 2026-10-01 tối:** người kiểm ĐẠT vòng 3; chủ trả lời **C1–C13 = A** ("cả 13 theo khuyến nghị" — `cau-hoi-chu.md`). **Lượt 2a (ADR-A) CHỦ ĐÃ DUYỆT 2026-10-01** (hộp chọn "Duyệt lượt 2a"). **Lượt 2b (ADR-B) CHỦ ĐÃ DUYỆT 2026-10-01** (sau khi hỏi ví dụ i-resort + đại lý tự giảm 20.000 — ví dụ B-5). **Lượt 2c (ADR-C, gồm lệch có tên L-C1) CHỦ ĐÃ DUYỆT 2026-10-01** (sau khi xem ví dụ C-1, C-3, đơn kẹt chụp bù, trần C-5, giải nghĩa L-C1). **Lượt 2d (ADR-D + ADR-E, gồm nới ba hàng rào C12) CHỦ ĐÃ DUYỆT 2026-10-01** ⇒ **đủ bốn lượt**. Bước tiếp: chép vào `docs/adr/` với số thật, lập kế hoạch thi công. Số ADR dự kiến (chốt lúc gộp): **0077–0081** cho A–E (0073 trợ lý, 0074–0075 đã có nhánh khác giữ, 0076 dành cho ADR nơi trả mặc định); migration từ **0060**.
- **Xây trên lỗ đang hở:** **không** (`docs/quyen-hoan.json` `phat_hien = []` ở `main` @`0c4309cd`, đọc 1/10).

## Số hiệu

- **ADR:** số giữ chỗ `ADR-00xx-A` … `ADR-00xx-E` để tham chiếu chéo không vỡ. Số thật dự kiến từ **0073** (0071, 0072 đã có phiên khác giữ — cập nhật 1/10 chiều), chốt lúc gộp — trên các nhánh đã có ADR-0068 (`gop-ho-so-ca-nhan`), 0069, 0070 (trợ lý); `docs/adr/README.md` trên `main` còn ghi "kế tiếp là 0068" (cũ); một phiên khác có thể đang soạn ADR "nơi trả mặc định".
- **Migration:** dự kiến từ **0060**, chốt lúc gộp — `0056` là `0056_gop_ho_so` (nhánh `worktree-gop-ho-so`), `0057`–`0059` đã dùng ở kế hoạch máy chủ ô chặng; người gộp rà mọi nhánh chưa gộp trước khi đặt số.

## Mục lục

| Tệp | Nội dung | Quyết định chạm quyền/dữ liệu | Lượt |
|---|---|---|---|
| [ADR-00xx-A](ADR-00xx-A-chinh-sach-hoa-hong-va-chup-luc-xac-nhan.md) | **D4** — module `pricing`; bảng mức hoa hồng theo vai được hưởng × nhóm dịch vụ (view mới `v_ctl_service_group`), mức riêng đối tác, % hoặc số mỗi khách; người hưởng suy từ danh sách vai được hưởng (view mới `v_pty_open_role`) + đường để đại lý / công ty lữ hành thành bên đặt; **chụp lúc Xác nhận** (sửa ADR-0018 điều 11); thiếu mức ⇒ giữ, không lấy 0 | 3 | **2a** |
| [ADR-00xx-B](ADR-00xx-B-dieu-khoan-cung-ung-va-nha-cung-cap.md) | **D5** — điều khoản cung ứng (người bán, nhà cung cấp, a%); vai "Nhà cung cấp"; người thu là bên đặt / nhà cung cấp (khai hộ ⇒ nợ ở người khai tới khi Kế toán xác nhận); biên nhận chia phần theo người bán; X3 | 2 | **2b** |
| [ADR-00xx-C](ADR-00xx-C-phieu-da-giao-thuong-mai.md) | Phiếu "Đã giao" sinh dòng hoa hồng / giảm giá bên đặt chịu / giá vốn; **mở "Đã giao" cho đơn đại lý** (cả lớp mã lẫn lớp SQL); đơn cũ khi lên bản; ai chịu giảm giá + trần; lệch có tên **L-C1** + lớp CSDL một phần | 3 | **2c** |
| [ADR-00xx-D](ADR-00xx-D-quyet-toan-thang-va-khoa-ky.md) | Quyết toán tháng (bù trừ hai chiều nhiều đơn một phiếu); **khoá kỳ tháng** ở module nhỏ `ky-so` (trigger chỉ kiểm liền kề trong bảng của nó) dùng chung cho sổ và chi phí chuyến; **nới hàng rào** (Điều 9.4) | 2 | **2d** |
| [ADR-00xx-E](ADR-00xx-E-doi-tac-xem-so.md) | Đối tác xem sổ của mình — **ô mới `ledger.partner.view`** (giữ `ledger.view` PARTNER `none`), chỉ các loại dòng phía đối tác, DTO danh sách trắng riêng; 4 hàng rào đề xuất | 1 | **2d** |
| [de-xuat-luat.md](de-xuat-luat.md) | Diff đề xuất cho tệp luật: `src/architecture.test.ts` (`ALLOWED_EDGES`, `STRICT`, `TABLE_PREFIX`/`VIEW_PREFIX`, `VIEW_CHO_TRIGGER_VC`), `docs/ARCHITECTURE.md` bảng thi hành 5.14 / 5.17, dòng sổ hàng rào — **chưa duyệt** | — | 2a, 2d |
| [trang-ghep.md](trang-ghep.md) | Trang ghép `CLAUDE.md` §9: đếm trần 3; bảng chứa ai; ô quyền nào chạm bảng nào (hai nghĩa "của mình"); cổng nào canh cửa nào; ngoài phạm vi | — | mọi lượt |
| [cau-hoi-chu.md](cau-hoi-chu.md) | **13 câu** chưa có lời chủ (C1–C13), khuyến nghị đứng đầu, lời thường; bảng "đã chốt" | — | theo lượt |

## Thứ tự lượt duyệt (mỗi lượt ≤ 3 quyết định — `CLAUDE.md` §9)

1. **Lượt 2a — ADR-00xx-A** (3). Câu kèm: **C2, C3, C4, C9, C13**. Phần diff `VIEW_PREFIX` thêm `ctl` của `de-xuat-luat.md` mục 2.
2. **Lượt 2b — ADR-00xx-B** (2). Câu kèm: **C5, C6**.
3. **Lượt 2c — ADR-00xx-C** (3: dòng thương mại + mở chặn; ai chịu giảm giá / trần; lệch L-C1). Câu kèm: **C1, C8, C10, C11**. Sau 2a, 2b.
4. **Lượt 2d — ADR-00xx-D + ADR-00xx-E** (2 + 1 = 3). Câu kèm: **C7, C12**. Sau 2c (E đọc dòng của C và bảng kê / cờ khoá của D).

**C12 là câu riêng về nới hàng rào** (Điều 9.4): duyệt ADR-D **không** tự động là duyệt nới — chủ trả lời C12 (lời thường) cho đúng ba điểm ở `de-xuat-luat.md` mục 1–3; mục 2 phần `ctl` (view nhóm dịch vụ) thuộc lượt 2a và được hỏi gộp trong C12 để chủ thấy mọi chỗ nới ở một nơi. Nếu C12 = B hoặc C thì ADR-D phải sửa trước khi duyệt.

**Quyết định gom nhiều thứ** (người kiểm xin chủ đọc kỹ — một lần "duyệt" kéo theo cả gói): ADR-A quyết định (1) gồm bảng mức + nguồn nhóm dịch vụ + view `v_ctl_service_group` + hai ô; (2) gồm danh sách vai được hưởng + view `v_pty_open_role` + đường để đại lý thành bên đặt (tách câu riêng C13); (3) gồm bảng chụp + chụp lại khi đổi bên đặt + hai ô (một ô là đề xuất mới). ADR-B (5) gồm nới ADR-0026 điều 2 + phiếu `COUNTERPARTY_CONFIRMED` + `collected_for` + biên nhận chia phần. ADR-C (6) gồm loại dòng mới + đổi lớp SQL lượt 1 + lý do giữ mới. ADR-D (9) gồm module mới + trigger ở hai module + ô mới + nới hàng rào (tách câu riêng C12).

**Một bản phát hành cho cả năm ADR.** ADR-0026 đặt hạn "khoá kỳ phải có **trong cùng bản phát hành** với lượt 2 (D4/D5)", ADR-0057 L-T1 kéo theo khoá kỳ cho chi phí xe thuê. Phát hành A/B mà thiếu D là lỡ hạn chủ đã duyệt. Thi công theo lát được, gộp `main` và triển khai một lần.

## Sau khi chủ duyệt (việc của người sau)

- Đổi số giữ chỗ → số thật; chép từng ADR vào `docs/adr/` (luật repo bắt hỏi quyền khi sửa `docs/adr/`); dòng mục lục ở `docs/adr/README.md`; dòng "bị sửa bởi" vào Trạng thái của ADR-0018, ADR-0026, ADR-0027, ADR-0029, ADR-0057, ADR-0058.
- Áp `de-xuat-luat.md` (chú thích "CHỜ CHỦ DUYỆT" → "đã duyệt <ngày>").
- Kế hoạch thi công `docs/superpowers/plans/` (tiêu chí nghiệm thu viết trước — P20), rà **mọi** đường lập/sửa đơn để đại lý thành bên đặt (ADR-A điều 3); sổ vàng `golden/so-cong-no-luot-2.json` + xác nhận SV-HT-01…05 của chủ/Kế toán **trước** khi nhận mã tiền (5.17); đổi luật kiểm của `src/so-vang.test.ts` (giảm giá do bên đặt chịu).
- Màn hình (bảng mức, điều khoản nhà cung cấp, quyết toán, khoá tháng, sổ Đối tác, "Sổ của tôi" — nợ N-4 của lượt 1): **chờ bản vẽ Claude Design của chủ**.

## Chỗ người soạn không chắc (người kiểm vòng 2 xin xem kỹ)

- **C1:** phương án A viết lại danh sách loại dòng ADR-0026 điều 3 đã duyệt; B khớp lời chủ 25/9. Số dư như nhau.
- **L-C1 + lớp CSDL một phần (C10):** trigger (iii) "cộng dồn ≤ `gross_snapshot`" và (iv) "giảm giá = gross − due" dựa trên việc chụp thêm `gross_snapshot` — chưa thử trên D1.
- **Module `ky-so`:** route khoá tháng đặt ở `billing` (vì cần đọc `bil_`); `ky-so` chỉ có bảng + câu chưa chạy. "Tháng đầu ≤ dòng sổ sớm nhất" không xét chi phí chuyến (`billing` không đọc `vc_`).
- **`ledger.partner.view` cột `SUPER_ADMIN` = `any`** (không phải `none` như yêu cầu sửa): luật "Toàn quyền `any` ở mọi ô" (ADR-0014 điều 2) có bài ghim; route không chọn được bên nên `any` không mở thêm dữ liệu.
- **Đường để đại lý thành bên đặt** (`resolveBooker` chỉ nhận cá nhân; đơn Đối tác tự lập không tự gắn bên đặt) — **chưa kiểm hết** các đường lập/sửa đơn; thiếu đường này thì đơn đại lý bị tính như khách lẻ.
- **Dịch vụ nhập tay trên đơn khách lẻ** bị giữ "thiếu người bán" đúng chữ ADR-0061 A-14 — thêm một bước cho Kế toán.
- **Nhận biết dịch vụ đưa đón cho X3** mà không mở cạnh vào `van-chuyen` — chốt ở kế hoạch.
- **`SALES` xem bảng mức hoa hồng** — giả định bề mặt; **cách làm tròn** — ca A-5 để sổ vàng chốt.
