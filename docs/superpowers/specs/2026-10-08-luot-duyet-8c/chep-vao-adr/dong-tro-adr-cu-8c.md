# Dòng trỏ cho dòng Trạng thái của ADR cũ (bản chép lượt 8c, 2026-10-08)

> Người soạn chuẩn bị; **điều phối chép** bằng công cụ sửa tệp để chủ được hỏi. Theo khuôn `dong-tro-adr-cu-8b.md` của lượt 8b: **chỉ thêm câu vào cuối dòng Trạng thái** (dòng 3), thân ADR cũ không đổi (luật "từ mốc accepted chỉ sửa dòng trạng thái"). Dòng "Cũ" chép nguyên văn từ `docs/adr/` @ `6b0b826e` (nhánh `claude/van-chuyen-goi-a-c`) để làm chuỗi tìm khi thay; dòng "Mới" = dòng cũ + một dấu cách + câu trỏ.
>
> ADR đã duyệt bị hai ADR này sửa: **ADR-0063** (bởi 0109 — D1.12), **ADR-0079** (bởi 0109), **ADR-0081** (bởi 0109 — `:20`), **ADR-0096** (bởi 0110).
>
> Đã đối chiếu, **không** cần dòng trỏ: ADR-0077 (hoa hồng tính trước giảm giá cấp đơn, `:82-83` — không đổi số); ADR-0078 (giá vốn trước giảm, `:58`); ADR-0080 (`:70`, dòng điều chỉnh số khách không khoá theo kỳ); ADR-0088 (I1 = `due_snapshot` − giảm trừ đã phân định — vẫn đúng với `due_snapshot` 0); ADR-0089 (`:106` "Cần chi hoàn" — ADR-0109 chỉ làm số trả dư không vượt tiền thật); ADR-0049 (LC-19 do ADR-0096 thêm vào bảng luật lõi; ADR-0110 không đổi luật LC-19, chỉ đổi Đ1.3b, Đ1.3c của ADR-0096); ADR-0052 (ADR-0110 không thêm hành động vào danh sách tin chuyến; `trip_edited` đã có trong `HANH_DONG_TIN_CHUYEN`, `src/shared/tin-chuyen.ts:8-9`); ADR-0094 (lớp vé dùng như cũ).

## 1. ADR-0063 — bởi ADR-0109

Tệp `docs/adr/ADR-0063-sua-don-sau-xac-nhan.md`, dòng Trạng thái `:3`. Cũ (nguyên văn @ `6b0b826e`):

```
- **Trạng thái:** **accepted một phần** 2026-10-08: D1 (chủ, lượt 8a); phần đổi giờ tối đa 2 lần vẫn proposed. Chủ dự án trả lời câu hỏi chọn phương án của lượt duyệt 8a ngày 2026-10-08, nhãn đã chọn nguyên văn: **"Duyệt (Recommended)"**. Phương án này gồm lời xác nhận rằng mục sổ HC-4.2 "bút toán điều chỉnh phải có người duyệt" không áp cho việc sửa số khách trên đơn, và để phần "đổi giờ tối đa 2 lần" sang lượt sau. Ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, mục "Lượt duyệt 8a" (nhánh `claude/van-chuyen-goi-a-c` @ `4fd27fe1`). AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. D3 muốn có hiệu lực phải qua một lượt duyệt riêng.
```

Mới:

```
- **Trạng thái:** **accepted một phần** 2026-10-08: D1 (chủ, lượt 8a); phần đổi giờ tối đa 2 lần vẫn proposed. Chủ dự án trả lời câu hỏi chọn phương án của lượt duyệt 8a ngày 2026-10-08, nhãn đã chọn nguyên văn: **"Duyệt (Recommended)"**. Phương án này gồm lời xác nhận rằng mục sổ HC-4.2 "bút toán điều chỉnh phải có người duyệt" không áp cho việc sửa số khách trên đơn, và để phần "đổi giờ tối đa 2 lần" sang lượt sau. Ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, mục "Lượt duyệt 8a" (nhánh `claude/van-chuyen-goi-a-c` @ `4fd27fe1`). AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. D3 muốn có hiệu lực phải qua một lượt duyệt riêng. **Sửa câu bởi [ADR-0109](ADR-0109-phai-thu-khong-am.md)** (accepted 2026-10-08, lượt 8c câu 1): D1.12 (`:43`) — văn phòng bớt khách tới mức tiền dịch vụ nhỏ hơn giảm giá thì phải thu bằng 0 (không âm), dư chờ hoàn bằng đúng số khách đã trả; cảnh báo hiện khi giảm giá lớn hơn tạm tính hiện hành; vẫn không chặn; D1.4 "giảm giá của đơn giữ nguyên" không đổi; nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0109.
```

## 2. ADR-0079 — bởi ADR-0109

Tệp `docs/adr/ADR-0079-phieu-da-giao-thuong-mai.md`, dòng Trạng thái `:3`. Cũ (nguyên văn @ `6b0b826e`):

```
- **Trạng thái:** **accepted** — chủ dự án 2026-10-01 trong chat: trả lời 13 câu *"cả 13 theo khuyến nghị"* (C1–C13 = A, `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`), rồi duyệt lượt **2c** bằng "duyệt lượt 2c" (sau khi xem ví dụ đại lý giữ cọc, cộng tác viên, đơn kẹt chụp bù, trần giảm giá, giải nghĩa L-C1). Người kiểm độc lập: ĐẠT vòng 3 (bản nháp). Bản nháp + lịch sử sửa: `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/`.
```

Mới:

```
- **Trạng thái:** **accepted** — chủ dự án 2026-10-01 trong chat: trả lời 13 câu *"cả 13 theo khuyến nghị"* (C1–C13 = A, `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`), rồi duyệt lượt **2c** bằng "duyệt lượt 2c" (sau khi xem ví dụ đại lý giữ cọc, cộng tác viên, đơn kẹt chụp bù, trần giảm giá, giải nghĩa L-C1). Người kiểm độc lập: ĐẠT vòng 3 (bản nháp). Bản nháp + lịch sử sửa: `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/`. **Sửa câu bởi [ADR-0109](ADR-0109-phai-thu-khong-am.md)** (accepted 2026-10-08, lượt 8c câu 1): giảm giá bên đặt chịu = **giảm giá hiệu lực** = min(`orders.discount`, tạm tính hiện hành) — bằng số giảm giá khi tạm tính còn ≥ giảm giá, nhỏ hơn khi bớt khách làm tiền dịch vụ nhỏ hơn giảm giá — ở `:26`–`:27`, `:43` (`GIAM_GIA_BEN_DAT`), `:57` (iv), `:75`, `:96` (R-BIL-2), `:98` (R-BIL-14); nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0109.
```

## 3. ADR-0081 — bởi ADR-0109

Tệp `docs/adr/ADR-0081-doi-tac-xem-so.md`, dòng Trạng thái `:3`. Cũ (nguyên văn @ `6b0b826e`):

```
- **Trạng thái:** **accepted** — chủ dự án 2026-10-01 trong chat: trả lời 13 câu *"cả 13 theo khuyến nghị"* (C1–C13 = A, `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`), rồi duyệt lượt **2d** bằng hộp chọn "Duyệt lượt 2d (Recommended)" (quyết toán tháng + khoá sổ tháng; đại lý xem "Sổ của tôi"; gồm nới ba hàng rào C12). Người kiểm độc lập: ĐẠT vòng 3 (bản nháp). Bản nháp + lịch sử sửa: `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/`.
```

Mới:

```
- **Trạng thái:** **accepted** — chủ dự án 2026-10-01 trong chat: trả lời 13 câu *"cả 13 theo khuyến nghị"* (C1–C13 = A, `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`), rồi duyệt lượt **2d** bằng hộp chọn "Duyệt lượt 2d (Recommended)" (quyết toán tháng + khoá sổ tháng; đại lý xem "Sổ của tôi"; gồm nới ba hàng rào C12). Người kiểm độc lập: ĐẠT vòng 3 (bản nháp). Bản nháp + lịch sử sửa: `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/`. **Sửa câu bởi [ADR-0109](ADR-0109-phai-thu-khong-am.md)** (accepted 2026-10-08, lượt 8c câu 1): `:20` — cột giảm giá của từng đơn là giảm giá mình chịu = giảm giá hiệu lực (nhỏ hơn số đã cho khách khi bớt khách làm tiền dịch vụ nhỏ hơn giảm giá); `giamGiaMinhChiu` (`:42`) theo cùng số; nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0109.
```

Ghi chú: ADR-0081 chưa thi công (tìm `giamGiaMinhChiu` trong `src`, `web` @ `6b0b826e` không gặp). Câu trỏ này thêm so với văn bản trình duyệt (tệp 01 §4 chỉ ghi "theo cùng số hiệu lực"); phiếu kiểm tổng hợp (tệp 01, mục THẤP) đề nghị ghi ADR-0081 vào dòng "Sửa:". Điều phối quyết có chép hay không.

## 4. ADR-0096 — bởi ADR-0110

Tệp `docs/adr/ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md`, dòng Trạng thái `:3`. Cũ (nguyên văn @ `6b0b826e`):

```
- **Trạng thái:** **accepted** — chủ dự án duyệt trong chat 2026-10-03: *"Duyệt A1, A2, A3 (A3: 12 giờ là mặc định trong bảng chính sách, không viết cứng, không có phá lệ)."* và *"HT-06: chặn, gộp vào ADR-0096."* AI soạn (đợt V0 của lộ trình `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §2.3) và ghi lại; Đ3 (HT-06) do AI viết thành chữ **sau** lời chủ, theo đúng khuôn Đ1–Đ2 — chủ chưa đọc chữ Đ3, sửa được bằng một dòng "Sửa: …". Trang ghép: `docs/superpowers/specs/2026-10-03-v0-luot-duyet/LUOT-A-TRANG-GHEP.md` (Đ1, Đ2) và `LUOT-C-TRANG-GHEP.md` (Đ3). Người kiểm độc lập chỉ-đọc 3/10: ĐẠT CÓ ĐIỀU KIỆN, đã sửa theo phiếu (bản sửa chưa được kiểm lại). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. Bản nháp: `docs/superpowers/specs/2026-10-03-v0-luot-duyet/A3-ADR-0096-thu-tu-diem-dung-va-cua-so-xuat-ben.md`.
```

Mới:

```
- **Trạng thái:** **accepted** — chủ dự án duyệt trong chat 2026-10-03: *"Duyệt A1, A2, A3 (A3: 12 giờ là mặc định trong bảng chính sách, không viết cứng, không có phá lệ)."* và *"HT-06: chặn, gộp vào ADR-0096."* AI soạn (đợt V0 của lộ trình `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §2.3) và ghi lại; Đ3 (HT-06) do AI viết thành chữ **sau** lời chủ, theo đúng khuôn Đ1–Đ2 — chủ chưa đọc chữ Đ3, sửa được bằng một dòng "Sửa: …". Trang ghép: `docs/superpowers/specs/2026-10-03-v0-luot-duyet/LUOT-A-TRANG-GHEP.md` (Đ1, Đ2) và `LUOT-C-TRANG-GHEP.md` (Đ3). Người kiểm độc lập chỉ-đọc 3/10: ĐẠT CÓ ĐIỀU KIỆN, đã sửa theo phiếu (bản sửa chưa được kiểm lại). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. Bản nháp: `docs/superpowers/specs/2026-10-03-v0-luot-duyet/A3-ADR-0096-thu-tu-diem-dung-va-cua-so-xuat-ben.md`. **Sửa câu bởi [ADR-0110](ADR-0110-doi-thu-tu-diem-chi-chan-dao-moi.md)** (accepted 2026-10-08, lượt 8c câu 2): Đ1.3b (`:36`) — nút ↑/↓ của chuyến kế hoạch đi qua lệnh sửa chuyến sẵn có `PUT /api/van-chuyen/chuyen/:id` (thân `diem`), không có route mới; Đ1.3c (`:37`, sửa chữ theo cách đọc hẹp) — lệnh đổi thứ tự chỉ bị từ chối 409 khi làm một suất chờ lên bị đảo **mới**, suất đảo từ trước sửa dần được bằng ↑/↓; `:84` (cửa) theo đó; nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0110.
```
