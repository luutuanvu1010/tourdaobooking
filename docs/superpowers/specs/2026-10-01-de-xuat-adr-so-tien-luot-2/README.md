# Đề xuất ADR — Sổ tiền lượt 2 (đại lý / đối tác, nhà cung cấp, quyết toán tháng, khoá kỳ, đối tác xem sổ)

- **Ngày:** 2026-10-01. **Vai:** lập kế hoạch (AI soạn nháp, không thi công, không tự duyệt — Hiến pháp N3, Điều 7.2).
- **Trạng thái:** **bản nháp — chưa qua người kiểm độc lập.** Bước tiếp: người kiểm độc lập chỉ-đọc (việc lớn: tiền + dữ liệu + quyền + luật kiến trúc) → sửa → trình chủ theo bốn lượt dưới đây.
- **Vì sao có:** chủ 1/10 xếp "phân hệ theo dõi tiền (đại lý đối tác và HDV tại cảng nợ công ty và/hoặc ngược lại)" vào phần **bắt buộc để xe chạy**, và chọn **U3** (ghi nợ từng đơn, chốt tháng, bù trừ, khoá sổ tháng) + **U4** (đối tác xem sổ của mình) — `docs/superpowers/specs/2026-10-01-uu-tien-xe-chay-quyet-dinh.md`. Hôm nay đơn của đại lý **bị chặn "Đã giao"** (`src/modules/billing/rules.ts:179-181`, ADR-0026 M1 = A).
- **Mốc mã:** nhánh `worktree-doi-chieu-phieu-giam-doc` @`8f647226`; `main` @`0c4309cd` (bản 1.50).
- **Xây trên lỗ đang hở:** **không** (`docs/quyen-hoan.json` `phat_hien = []` ở `main` @`0c4309cd`, đọc 1/10).

## Số hiệu

Năm ADR dùng **số giữ chỗ** `ADR-00xx-A` … `ADR-00xx-E` để tham chiếu chéo không vỡ. **Số thật chốt lúc gộp:** dự kiến từ **0071** trở đi — trên các nhánh đã có ADR-0068 (`gop-ho-so-ca-nhan`), 0069 (trợ lý), 0070 (trợ lý hiểu cấu trúc app); `docs/adr/README.md` trên `main` còn ghi "kế tiếp là 0068" (cũ); một phiên khác có thể đang soạn ADR "nơi trả mặc định theo dịch vụ". **Migration:** từ **0057**, chốt lúc gộp (`0056` giữ cho phần máy chủ ô chặng). **Lưu ý cho người gộp:** trên các nhánh đang có **hai** tệp `0055_*` (`0055_nhom_dich_vu` ở `main`, `0055_gop_ho_so` ở nhánh khác).

## Mục lục

| Tệp | Nội dung | Quyết định chạm quyền/dữ liệu | Lượt |
|---|---|---|---|
| [ADR-00xx-A](ADR-00xx-A-chinh-sach-hoa-hong-va-chup-luc-xac-nhan.md) | **D4** — module `pricing`; bảng mức hoa hồng theo vai được hưởng × nhóm dịch vụ (ADR-0058), mức riêng đối tác, % hoặc số mỗi khách; người hưởng suy từ danh sách vai được hưởng (không còn "mọi vai bên ngoài"); **chụp lúc Xác nhận** (sửa ADR-0018 điều 11); thiếu mức ⇒ giữ, không lấy 0 | 3 | **2a** |
| [ADR-00xx-B](ADR-00xx-B-dieu-khoan-cung-ung-va-nha-cung-cap.md) | **D5** — điều khoản cung ứng (người bán, nhà cung cấp, a%); vai "Nhà cung cấp"; người thu là bên đặt / nhà cung cấp; biên nhận chia phần theo người bán; X3 | 2 | **2b** |
| [ADR-00xx-C](ADR-00xx-C-phieu-da-giao-thuong-mai.md) | Phiếu "Đã giao" sinh dòng hoa hồng / giảm giá bên đặt chịu / giá vốn; **mở "Đã giao" cho đơn đại lý**; đơn cũ khi lên bản; trần giảm giá theo người hưởng (gỡ lệch 5.8 ADR-0029); lệch có tên L-C1 | 2 | **2c** |
| [ADR-00xx-D](ADR-00xx-D-quyet-toan-thang-va-khoa-ky.md) | Quyết toán tháng (bù trừ hai chiều nhiều đơn một phiếu); **khoá kỳ tháng** ở module nhỏ `ky-so` dùng chung cho sổ và chi phí chuyến (không đặt sẵn Q12 của ADR-0057) | 2 | **2d** |
| [ADR-00xx-E](ADR-00xx-E-doi-tac-xem-so.md) | Đối tác xem sổ của mình — `ledger.view` PARTNER `own`, DTO danh sách trắng riêng; đề xuất 4 hàng rào cho `docs/SO-HANG-RAO.md` | 1 | **2c** |
| [trang-ghep.md](trang-ghep.md) | Trang ghép `CLAUDE.md` §9: bảng chứa ai; ô quyền nào chạm bảng nào; cổng nào canh cửa nào; ngoài phạm vi | — | mọi lượt |
| [cau-hoi-chu.md](cau-hoi-chu.md) | 8 câu chưa có lời chủ (C1–C8), khuyến nghị đứng đầu; bảng "đã chốt" | — | trả lời cùng lượt duyệt chứa câu đó |

## Thứ tự lượt duyệt (mỗi lượt ≤ 3 quyết định — `CLAUDE.md` §9)

1. **Lượt 2a — ADR-00xx-A** (3). Câu kèm: **C2, C3, C4** (C4 cũng thuộc C — trả lời một lần ở 2a).
2. **Lượt 2b — ADR-00xx-B** (2). Câu kèm: **C5, C6**.
3. **Lượt 2c — ADR-00xx-C + ADR-00xx-E** (2 + 1 = 3). Câu kèm: **C1, C8**. Chỉ trình sau khi 2a, 2b đã duyệt.
4. **Lượt 2d — ADR-00xx-D** (2). Câu kèm: **C7**. Độc lập, trình lúc nào cũng được.

**Một bản phát hành cho cả năm ADR.** ADR-0026 đã đặt hạn "khoá kỳ phải có **trong cùng bản phát hành** với lượt 2 (D4/D5)", ADR-0057 L-T1 kéo theo khoá kỳ cho chi phí xe thuê. Phát hành A/B mà thiếu D là lỡ hạn chủ đã duyệt. Thi công theo lát được, gộp `main` và triển khai một lần.

## Sau khi chủ duyệt (việc của người sau)

- Đổi số giữ chỗ → số thật; chép từng ADR vào `docs/adr/` (luật repo bắt hỏi quyền khi sửa `docs/adr/`); thêm dòng mục lục ở `docs/adr/README.md`; ghi dòng "bị sửa bởi" vào Trạng thái của ADR-0018, ADR-0026, ADR-0027, ADR-0029, ADR-0057 (khuôn ADR-0024 ↔ ADR-0043).
- Kế hoạch thi công `docs/superpowers/plans/` (tiêu chí nghiệm thu viết trước — P20), sổ vàng `golden/so-cong-no-luot-2.json` + xác nhận SV-HT-01…05 của chủ/Kế toán **trước** khi nhận mã tiền (5.17).
- Màn hình (bảng mức, điều khoản nhà cung cấp, quyết toán, khoá tháng, sổ Đối tác, "Sổ của tôi" — nợ N-4 của lượt 1): **chờ bản vẽ Claude Design của chủ** (tiền lệ U1, bài học Đợt D).
- Đề xuất diff tệp luật (`docs/ARCHITECTURE.md` danh sách module + bảng thi hành 5.14; `docs/SO-HANG-RAO.md` 4 dòng của ADR-00xx-E) — AI không tự sửa (N9).

## Chỗ người soạn không chắc (người kiểm xin xem kỹ)

- **Kiểu dòng sổ** (C1): phương án A khác danh sách loại dòng ADR-0026 điều 3 đã dự kiến; số dư như nhau nhưng đây là sửa câu đã duyệt.
- **L-C1**: số tiền dòng thương mại "đúng công thức" chỉ giữ ở mã + kiểm định kỳ (không đặt được trong trigger mà không tạo đường tính thứ hai) — lệch 5.1 có tên mới.
- **Module `ky-so`** để tránh đặt sẵn Q12 — thêm một module + ba cạnh; có thể chủ muốn cách khác (vd đặt khoá kỳ ở `billing` và chấp nhận Q12 = A ngay).
- **Dịch vụ nhập tay trên đơn khách lẻ** bị giữ "thiếu người bán" theo đúng chữ ADR-0061 A-14 — thêm một bước cho Kế toán so với lượt 1.
- **Nhận biết dịch vụ đưa đón cho X3** mà không mở cạnh vào `van-chuyen` — chốt ở kế hoạch.
- **`SALES` xem bảng mức hoa hồng**, **Đối tác không thấy % của chính mình** — giả định bề mặt, đảo được.
- **Cách làm tròn** (nửa lên, theo dòng) — giả định, sổ vàng xác nhận.
