# ADR-0133 (BẢN NHÁP) — Chiết khấu theo loại khách: người lớn, trẻ em, người cao tuổi

- **Trạng thái:** **proposed** — chưa duyệt. AI soạn, không tự duyệt (Hiến pháp N3). Số 0133 vì 0132 đã có; kiểm lại số trước khi duyệt.
- **Ngày:** 2026-10-19. **Loại:** việc lớn (tiền + dữ liệu + luật). Cần trang ghép, sổ vàng và người kiểm độc lập.
- **Xây trên lỗ đang hở:** chưa kiểm.

## Hiện trạng (đã đọc mã)
Mỗi dòng mức hoa hồng/chiết khấu có đúng một kiểu: `RATE` (phần trăm trên thành tiền dòng) hoặc `PER_PAX` (một số tiền cố định × số khách tính). Số khách tính = người lớn + trẻ em + người cao tuổi, không em bé (ADR-0077 H7). Hệ quả: `PER_PAX` trả cùng một số tiền cho cả ba loại; `RATE` đã tự theo giá từng loại vì giá bán đã tách bốn loại.

## Ba quyết định cần chủ chọn
**Q1. Có tách số tiền theo loại khách không?**
- A (khuyến nghị): thêm kiểu `PER_PAX_TYPE` — mỗi dòng mức khai riêng số tiền cho người lớn, trẻ em, người cao tuổi (em bé luôn 0). Kiểu `RATE` và `PER_PAX` cũ giữ nguyên.
- B: giữ nguyên, chỉ ghi quy tắc vào tài liệu (không cần ADR này).

**Q2. Loại khách bỏ trống số tiền thì sao?**
- A (khuyến nghị): bỏ trống = 0 đồng, và giao diện hiện rõ "0 đ" để Kế toán không nhầm.
- B: bỏ trống = lấy bằng số tiền người lớn.

**Q3. Đơn đã xác nhận có đổi theo không?**
- A (khuyến nghị): không. Mức được chụp lúc Xác nhận (ADR-0077 H5), gồm cả ba số tiền; đổi mức sau này chỉ áp cho đơn mới. Sửa số khách sau xác nhận (ADR-0063) tính lại theo mức đã chụp.
- B: tính lại theo mức hiện hành (trái nguyên tắc chụp tại mốc 5.6 — không khuyến nghị).

## Phạm vi ảnh hưởng (phải làm nếu duyệt)
Thêm cột/bảng cho ba số tiền (migration mới, expand-contract); sửa `hoaHongDong` và bản chụp trong `src/shared/hoa-hong-dong.ts`; màn khai mức ở `web/hoa-hong.ts`; cập nhật `docs/data-dictionary.json`; thêm ca vào sổ vàng (Kế toán xác nhận đáp án đúng đến đồng) — Hiến chương 5.17; e2e và `audit-invariants`.

## Trang ghép (tối thiểu)
Bảng chạm vào: dòng mức hoa hồng của đại lý, đối tác theo loại, mức TA (ADR-0117). Quyền: giữ nguyên người được khai mức (chưa kiểm ô cụ thể). Giao diện: chỗ hiện số hoa hồng cho đối tác/đại lý phải hiện đúng theo kiểu mới.

## Chưa kiểm
Cấu trúc bảng `prc_commission_rule` hiện tại; ADR-0117 lần 2 và ADR-0132 có chốt điều gì về loại khách hay không; ô quyền khai mức.
