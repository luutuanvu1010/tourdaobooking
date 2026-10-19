# Đề xuất sửa luật — câu sổ vàng ở `docs/ARCHITECTURE.md` (sổ đại lý đợt 2, Task 11)

> Hồ sơ có ngày (2026-10-19). Chỉ là **đề xuất**: `docs/ARCHITECTURE.md` là tài liệu chuẩn tắc, AI không tự sửa (CLAUDE.md §3, Hiến pháp N9). Chủ dự án duyệt thì người được giao chép diff vào. Nối tiếp mục 4b của `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/de-xuat-luat.md` (đề xuất cùng câu, viết trước khi có mã sổ).

## 1. Dòng 5.17 của bảng thi hành

Câu hôm nay mô tả luật kiểm cũ («tổng thu = giá bán») và ghi «chưa chạy trên mã sổ». Cả hai không còn đúng sau Task 11: luật kiểm lớp 1 đã đổi sang công thức của `R-BIL-2` (ADR-0079 mục «Sổ vàng / bài kiểm» đòi việc này), và các ca đã xác nhận chạy qua chính luật sinh dòng của sổ (`sinhDongLanThu`, `sinhPhieuDaGiao`, `soDuTheoBen`).

```diff
-| 5.17 Sổ vàng | `golden/` + `src/so-vang.test.ts` (kiểm **nhất quán nội tại** của từng ca: tổng thu = giá bán, nợ mỗi bên = đã thu − được hưởng, phần Tour Đảo giữ = giá bán − giá vốn − hoa hồng); test hành vi tiền hiện có (`gia-thoa-thuan.test.ts`…) | các ca **chờ chủ/Kế toán xác nhận**; **chưa chạy trên mã sổ** (sổ công nợ chưa có) | Enterprise OS |
+| 5.17 Sổ vàng | `golden/` + `src/so-vang.test.ts` (lớp 1 — **nhất quán nội tại** của từng ca theo công thức `R-BIL-2`: tổng thu = giá lẻ trước giảm − mọi giảm giá, nợ mỗi bên = đã thu − được hưởng + giảm giá bên đó chịu, phần Tour Đảo giữ = giá lẻ trước giảm − giảm giá Tour Đảo chịu − giá vốn − hoa hồng; lớp 2 — ca **đã xác nhận** chạy trên **mã sổ thật** `sinhDongLanThu` / `sinhPhieuDaGiao` / `soDuTheoBen`) + `src/so-vang-so-dai-ly.test.ts` (sổ cái C-1…C-5, ADR-0078 B-5, SV-SK-04 bản đại lý); test hành vi tiền hiện có (`gia-thoa-thuan.test.ts`…) | các ca **chờ chủ/Kế toán xác nhận** chỉ chạy dạng `todo` có chẩn đoán | Enterprise OS, ADR-0079 |
```

**Vì sao:** câu cũ sai ngay khi đơn đại lý có giảm giá do đại lý chịu (ADR-0079 ví dụ C-1: tổng thu 4.750.000 < giá lẻ 5.000.000). Đổi luật kiểm là **siết** (bài cũ vẫn đúng cho mọi ca không giảm giá — bảy ca SV-HT cho đúng số cũ), nhưng câu nằm trong tệp luật nên cần chủ duyệt.

## 2. Một điểm lệch chữ ADR cần chủ biết (không phải diff cho `ARCHITECTURE.md`)

ADR-0079 mục «Bất biến» viết `R-BIL-2` so «tổng dòng … trên phiếu "Đã giao" (**cộng phiếu điều chỉnh của đơn**)» với số tính lại từ bản chụp. Kiểm định kỳ thi công ở Task 10 **không cộng** phiếu điều chỉnh cho đơn sau mốc (sổ thi công, Ruling R-100), vì ví dụ D-3 của ADR-0080: Kế toán sửa hoa hồng sai bằng phiếu điều chỉnh có duyệt sau «Đã giao» là đúng luật, mà bản chụp thì đóng băng — cộng điều chỉnh vào thì đơn D-3 bị báo lỗi mãi mãi. Phần trước mốc (`R-BIL-2w`, cảnh báo) vẫn cộng điều chỉnh, đúng M1 = A.

Đây là cách đọc của người thi công, chưa phải quyết định của chủ. Hai lựa chọn:

1. **Giữ cách đọc của Task 10** (khuyến nghị): ghi một dòng lịch sử / ADR nhỏ nói rõ «R-BIL-2 so riêng phiếu "Đã giao"; phiếu điều chỉnh có duyệt do người duyệt thứ hai canh (ADR-0080)». Được: D-3 không báo nhầm. Mất: một phiếu điều chỉnh sai (đã qua duyệt) không bị kiểm định kỳ bắt.
2. **Theo đúng chữ ADR-0079**: đổi kiểm sang cộng điều chỉnh, và chấp nhận mỗi đơn D-3 thành một cảnh báo phải giải thích tay. Được: khớp chữ. Mất: báo nhầm lặp lại mỗi lần chạy.
