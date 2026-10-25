# Sổ điều phối — Hoa hồng + Hỗ trợ thiết kế lại (từ 25/10/2026)

Đặc tả: `docs/superpowers/specs/2026-10-25-hoa-hong-ho-tro-thiet-ke-lai/`. Kế hoạch: ba tệp `2026-10-25-hoa-hong-ho-tro-{1-may-chu,2-giao-dien-hoa-hong,3-giao-dien-ho-tro}.md` cùng thư mục.

## Bảng việc

| # | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| 0 | Chủ duyệt hai đặc tả + đề xuất ADR; cấp số ADR, chuyển vào `docs/adr/` | chủ nói «duyệt» | ADR **xong**: ADR-0141 accepted 25/10 («duyệt đề xuất ADR»); hai đặc tả: chủ chọn cách thi công (coi là đồng ý làm, ruling R1b sổ SDD) |
| 1 | PR 1 máy chủ (Task 1 chờ việc 0) | PR gộp + `trien-khai` + kiểm độc lập đạt | chưa làm |
| 2 | PR 2 giao diện Hoa hồng + bảng từ lượt 3 | như trên + chủ duyệt ảnh | chưa làm |
| 3 | PR 3 giao diện Hỗ trợ + bảng từ lượt 4 | như trên + chủ duyệt ảnh | chưa làm |

## Ruling (quyết định trong lúc làm)

- R1 (25/10, chủ): Q1 = đổi họ từ hiệu lực ở mọi màn cùng nghĩa; Q2 = người gửi không thấy dòng hệ thống.
- R2 (25/10, người lập kế hoạch): bàn giao gọi hai lượt bảng từ là «lượt 1, lượt 2» của đợt này; trong `src/shared/bang-tu-giao-dien.ts` đã có lượt 1 và lượt 2 (18/10), nên ghi là **lượt 3** (hoa hồng) và **lượt 4** (hỗ trợ).
- R3 (25/10, người lập kế hoạch): bài hàng rào `o-dat-qua-noi-cong.test.ts` không nới thành «⇒»; đổi vế phải thành «route 200 và giữ `order.create`» + ca có tên Kế toán (đề xuất ADR tiêu chí 3b).
- R4 (25/10, người lập kế hoạch): bỏ ca kiểm «Đổi chồng một dòng sắp áp dụng khác» (QA1 mục 6) vì không xảy ra được — dòng cũ đang mở thì trigger chống chồng đã cấm dòng cùng khoá phía sau.

## Nợ / để sau

- «Lịch sử» của một dòng mức / một loại (cần nhật ký có mã đích; ADR-0131).
- Sự kiện đổi trạng thái / ưu tiên trong luồng hỗ trợ (cần ADR mới).
- «Đổi» cho chính sách riêng của đối tác (màn Danh bạ).
- Trùng tên «Hỗ trợ»: `BACKLOG BL-VE-TRUNG-TEN`.
