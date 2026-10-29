Mất mạng có hai trường hợp: trang đã có dữ liệu cũ → chỉ hiện dải `ngoai-mang` (DaiTren); trang chưa mở lần nào trên máy → thân là `.trang-thai[data-loai=mat-mang-chua-nap]` (hình `history`, «Không có kết nối mạng», câu giải thích, «Nền tảng tự thử lại khi có mạng.», nút «Thử lại») và dải chỉ còn «Đang ngoài mạng».

**Trong mã:** `web/dai.ts` (`hienDaiNgoaiMang`, `veThanNgoaiMang`), `web/trang-thai-he-thong.ts`, trang `/ngoai-mang` (`web/ngoai-mang.ts`); có mạng lại thì tự tải lại.

## Đừng
Không để khung xương nhấp nháy mãi khi mất mạng; không câu lỗi đỏ cho mất mạng (tông Cát).
