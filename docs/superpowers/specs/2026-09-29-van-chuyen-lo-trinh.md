# Phân hệ Vận chuyển — lộ trình và trạng thái (2026-09-29, sau khi bản 1.37 lên production)

- **Loại:** tài liệu MÔ TẢ (không chuẩn tắc). Nguồn: ADR-0040, 0047, 0048, 0049 (`docs/adr/`); bản thiết kế Bảng điều phối `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md` §6.4 (chia lượt); đề xuất lượt 2, lượt 3 ngày 28/9 (`docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-luot-2.md`, `…-luot-3.md`); lời chủ `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`; trạng thái production `docs/HANDOFF-N1.md`.
- **Trả lời câu chủ hỏi 29/9 "kế hoạch cho toàn Module Vận chuyển đã hoàn tất chưa?":** **CHƯA.** Có ADR đã duyệt + kế hoạch thi công chi tiết cho 4 phần; 4 lượt sau của Bảng điều phối mới ở mức bản thiết kế (chưa trình duyệt); phần tiền và hợp đồng vận chuyển để sau; 4 ý mới từ tài liệu tham khảo Transportation Kernel: lượt 1 đã duyệt (ADR-0050, 29/9), lượt 2–3 đề xuất xong chờ chủ mở.

| # | Phần | Quyết định (ADR) | Kế hoạch thi công | Thi công | Production |
|---|---|---|---|---|---|
| 1 | **Lượt 1a** — xe, giấy tờ xe, giấy tờ của người, tài xế công ty có tài khoản, giấy tờ sắp hết hạn | ADR-0040 duyệt | có | xong | **1.35** (28/9) |
| 2 | **Nhà xe đối tác + tài xế đối tác** (lượt 2, lượt duyệt I) | ADR-0048 duyệt | có | xong | **1.37** (29/9) |
| 3 | **Chặng đưa đón + danh sách hành khách** (1b lượt 1) | ADR-0047 duyệt | có (2 lần phát hành) | máy chủ xong + kiểm độc lập ĐẠT CÓ ĐIỀU KIỆN (điều kiện đã có); **giao diện chờ chủ vẽ màn** (`docs/superpowers/specs/2026-09-29-adr-0047-man-hinh-can-ve.md`) | chưa |
| 4 | **Bảng điều phối lượt 1** — chuyến xe, suất, điểm dừng, lịch chung, mốc 6 giờ, cổng xuất bến, quyền + route tài xế công ty | ADR-0049 duyệt; ADR-0050 (Kernel lượt 1) duyệt 29/9 sửa thêm | có, bản áp ADR-0050 người kiểm ĐẠT (22 task máy chủ + giao diện 8 màn) | nhánh `thi-cong-adr-0049-song-song`: 8/22 task máy chủ, kiểm giữa chừng ĐẠT CÓ ĐIỀU KIỆN. Nhánh tiếp `thi-cong-adr-0049-tiep` (cập nhật 29/9 tối): đã gộp nền phần 3 (ADR-0047 Phần A) + kế hoạch; xong A0 bước 14–16, A1b, A7b, A2b; đang A4b, A8b, A9–A11 rồi dừng cho người kiểm giữa chừng; sau đó A12+ (bảng chuyến xe, migration 0042). **Giao diện chờ chủ vẽ 8 màn** (`docs/superpowers/specs/2026-09-29-bang-dieu-phoi-luot-1-man-hinh-can-ve.md`) | chưa |
| 5 | **Bảng điều phối lượt 2** — D4 chuyển điểm đón giữa hai xe (tài xế đề nghị → xe kia nhận → máy tự xác nhận theo luật), D5 thay đổi khi xe đang chạy (văn phòng thêm / báo huỷ điểm, cứu hộ xe hỏng, tài xế tự bổ sung tên khách), D6 thông báo + Bảng tin cho chuyến | chưa trình | — | — | — |
| 6 | **Bảng điều phối lượt 3** — D7 tài xế đối tác dùng app cho chuyến, D8 Từ chối chuyến, D9 Báo bận | chưa trình (thay lượt duyệt II của ADR-0048) | — | — | — |
| 7 | **Bảng điều phối lượt 4** — D10 chiều về theo dịch vụ (lập đơn tự tạo chặng về) | chưa trình (độc lập, trình lúc nào cũng được) | — | — | — |
| 8 | **Tiền** — chi phí nhà xe, công nợ nhà xe | đề xuất lượt 3 ($) 28/9 **chưa duyệt, chưa có người kiểm**; phụ thuộc ADR-0026 (proposed) | — | — | — |
| 9 | **Hợp đồng vận chuyển** | để sau (chủ chọn ĐP7); công tắc `require_contract` khoá ở 0 | — | — | — |
| 10 | **Bốn ý từ Transportation Kernel** (chủ chọn 29/9): giờ xảy ra thật khi văn phòng bấm thay; xe riêng / hạng xe hứa khách; lịch bận xe + giờ lái tối đa; số hiệu chuyến bay | **Lượt 1 → ADR-0050 duyệt 29/9** (giờ xảy ra thật khi văn phòng khai thay, kẹp lùi 180 phút; điểm dừng của chuyến bám theo đơn; cổng xuất bến mặc định Kiểm định + Bảo hiểm). **Lượt 2** (khung bận của xe, giờ lái tối đa bản nhẹ, số hiệu chuyến bay — `2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-2.md`) và **lượt 3** (xe riêng / hạng xe hứa khách — `…-kernel-luot-3.md`): đề xuất xong, người kiểm ĐẠT CÓ ĐIỀU KIỆN, **chờ chủ mở lượt** | lượt 1: gộp vào kế hoạch phần 4 | lượt 1: cùng phần 4; kiểm dữ liệu K-01 (giấy tờ xe song song), K-05 (ngày kết thúc ở tương lai) đã vào `main`, production 0/0 | — |

**Câu chủ chưa trả lời (sẽ hỏi theo từng lượt):** ĐP4, ĐP9 (lượt 2 — chuyển điểm, tự xác nhận); ĐP5, ĐP13 (lượt 2 — thay đổi khi xe chạy); ĐP11, ĐP12 + Q1/Q2/Q3/Q7 cũ của đề xuất lượt 2 (lượt 3 — tài xế đối tác, Từ chối, Báo bận); ĐP1, ĐP10 (lượt 4 — chiều về); các câu của đề xuất tiền.

**Việc đang chặn (của chủ):** vẽ màn cho phần 3 và 8 màn cho phần 4 trên Claude Design.

**Thứ tự đề nghị:** phần 3 → phần 4 (cùng ý "giờ xảy ra thật" của phần 10, phải chốt trước khi bảng chuyến xe được viết) → lượt 2 → lượt 3 → lượt 4 (hoặc sớm hơn, độc lập) → tiền.
