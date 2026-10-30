# Bàn giao — Diễn tập khôi phục dữ liệu (lỗ HC-5.19, hạn 05/11/2026)

> Hồ sơ có ngày 30/10/2026. Viết cho **một phiên riêng**, không gộp với phiên thi công ADR-0146 + ADR-0151. Loại việc: vận hành. **Mọi lệnh có `--remote` do chủ tự chạy**; AI chỉ chuẩn bị lệnh, đọc kết quả chủ dán lại, rồi ghi sổ.

## Vì sao gấp

- `docs/quyen-hoan.json`, mục HC-5.19 (HIGH): «chưa từng diễn tập khôi phục dữ liệu», hạn **2026-11-05**.
- Bài `src/phat-hien-han.test.ts` đỏ khi hạn < hôm nay (giờ Việt Nam). Vậy từ **06/11** `npm test` đỏ ở mọi nhánh, và `npm run trien-khai` không phát hành được.
- Chủ chọn ngày 30/10: **diễn tập trước 05/11; không kịp thì gia hạn có ghi lý do.**

## Đã có

- Đặc tả: `docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md`. Đây là **bản thảo chờ duyệt** từ 22/09, có ba câu hỏi ở §6 (mục tiêu RPO/RTO, cách nhắc sao lưu hằng tuần, nơi cất tệp). Công cụ `scripts/tach-ban-xuat-d1.mjs` có sẵn.
- `docs/HANDOFF-N1.md`: điểm khôi phục, phần Hoàn tác, và mục 7 (dòng ~178) yêu cầu thêm bước đối chiếu kho `HO_SO` tiền tố `xoa/` với `pty_erasure_request` sau khôi phục.

## Việc của phiên nhận

1. Cập nhật đặc tả cho hiện trạng: số migration mới nhất, các bảng mới từ 22/09, bước kho `HO_SO` ở trên. **Không khôi phục đè lên D1 production.** Đích khôi phục là D1 cục bộ hoặc D1 tạm.
2. Trình chủ ba câu ở §6, kèm khuyến nghị, theo lời thường (`CLAUDE.md` §4). Chủ trả lời rồi mới chạy.
3. Đưa chủ **từng lệnh**, đánh số, nói rõ thư mục cần đứng, chép-dán chạy được. Đọc kết quả chủ dán lại: đếm bảng; chạy `scripts/audit-invariants.mjs` trên bản khôi phục (thoát 2 = không chạy được, không phải sạch); ghi thời gian thật (RTO).
4. Ghi kết quả vào `docs/SO-HANG-RAO.md` và `docs/HANDOFF-N1.md`. Đề xuất diff đóng mục HC-5.19 trong `docs/quyen-hoan.json` để chủ duyệt.
5. Nếu tới 04/11 vẫn chưa diễn tập được: trình chủ diff gia hạn HC-5.19 có ghi lý do, để chủ duyệt trước 06/11.

## «Xong» là gì

Một lần khôi phục thật từ bản xuất production vào nơi không phải production, có số đếm bảng và kết quả `audit-invariants` khớp bản gốc, thời gian ghi lại; mục HC-5.19 được chủ duyệt đóng. Hoặc, nếu không kịp, chủ đã duyệt gia hạn trước 06/11.
