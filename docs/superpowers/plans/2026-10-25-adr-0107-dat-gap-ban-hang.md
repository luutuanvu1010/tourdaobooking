# ADR-0107 — Bán hàng tự đặt gấp; dấu chỉ ghi lên chặng đang dưới mốc — kế hoạch thi công và tiêu chí nghiệm thu

- **Ngày:** 2026-10-25. **Nhánh:** `claude/adr-0107-dat-gap-ban-hang`, dựng trên `main` @ `4d071324` (production bản 2.30).
- **Căn cứ:** `docs/adr/ADR-0107-ban-hang-dat-gap-sat-gio.md` (accepted 2026-10-08, chủ chọn "Duyệt cả hai ý"); phán quyết G11, G15, G16 ở `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`.
- **Loại việc:** việc lớn (quyền) — thi công đỏ → xanh, xong có người kiểm độc lập chỉ-đọc (`CLAUDE.md` §3). Không migration, không đổi mã quyền, `EXTERNAL_PERMISSIONS` và trigger LC-1 không đổi.
- **Đã kiểm trước khi làm (2026-10-25):** không nhánh nào có `short_notice_not_needed` (chưa ai làm); không trigger hay bất biến nào buộc `short_notice_by` là Quản trị (migration `0040` chỉ có CHECK "đủ năm cột", `scripts/audit-checks.mjs` không nhắc); sổ dừng dây chuyền `docs/quyen-hoan.json` có sáu mục HIGH, không mục nào thuộc chặng đưa đón hay đặt gấp → **xây trên lỗ đang hở: không**.

## Thiết kế (Hướng A của ADR, Quyết định mục 4)

1. **Một chỗ canh:** `xetDatGapSua` (orders/index.ts) trả về "giấy đặt gấp" gồm lý do đã kiểm (cho đuôi nhật ký) và hàm `dauCho(giờ mới của chặng)` — dấu chỉ có khi giờ SAU lệnh của chặng dưới mốc, không thì `null` (dấu cũ bỏ, I16). Thứ tự trong hàm khi thân có `datGap`: ô (403) → lý do (400) → cổng `duoiMoc` sai → 409 `short_notice_not_needed`. Vắng `datGap` mà `duoiMoc` → 409 `short_notice_required` (như cũ).
2. **Năm cửa** đều đi qua hàm này: nút Đặt gấp (cổng = giờ hiện tại của chặng; giữ 403 ở đầu thân), sửa chặng (cổng = giờ cũ hoặc mới; bỏ ép `!chiOPhu &&`; giữ nhánh `giuDatGap` khi chỉ đổi ô phụ mà vắng `datGap`), thêm chặng, thay chặng, `PUT …/trip` (cổng chung của lệnh như hôm nay; dấu xét từng chặng — G11, `updateTrip` nhận dấu theo từng thao tác thay cho một `datGap` chung).
3. **Máy chặn đường vòng:** kiểu danh nghĩa — dấu mới (`DauDatGapMoi`) chỉ `xetDatGapSua` dựng được; dấu chép khi lưu lại đơn nháp (`DauChepNhap`) chỉ `datGapCuaDong` dựng được (ngoại lệ có tên `chepDatGapNhap`, giữ nguyên). Các câu ghi năm cột chỉ nhận hai kiểu này, nên `npm run typecheck` đỏ nếu một đường mới tự dựng dấu; bài tĩnh khoá chỗ ép kiểu.
4. **Đuôi nhật ký (G16, đóng mục "Chưa kiểm" của ADR):** hàm đọc tin `phanDoiCuaTin` chỉ BÓC đuôi " · đặt gấp: …" (`bocDatGap`, tin-doi-don.ts), không suy ra "chặng có dấu" → giữ đúng đuôi cũ. Đuôi đi theo LÝ DO của lệnh, không theo dấu: lệnh dời chặng dưới mốc ra xa kèm `datGap` → 200, chặng không dấu, nhật ký vẫn có lý do.

## Tiêu chí nghiệm thu (hành vi kiểm được)

Bài mới ở `src/modules/orders/dat-gap-sat-gio.test.ts` (chạy cả ứng dụng trên SQLite thật, mốc THẬT 360 phút) trừ khi ghi khác. Số trong ngoặc là mục "Bài kiểm" của ADR.

| Mã | Hành vi | Bài |
|---|---|---|
| T1 (1) | Nút Đặt gấp: Bán hàng, chặng dưới mốc của đơn người khác lập → 200, đủ năm cột; chặng trên mốc → 409 `short_notice_not_needed` cho Quản trị và Toàn quyền, không ghi; chặng chưa chốt giờ → 409; Kế toán, HDV, Đối tác, Thực tập → 403 | `dat-gap-sat-gio` "bài 1" + sửa TC-22 ở `dat-gap.test.ts` |
| T2 (2) | Sửa chặng: Bán hàng (đơn mình lập) dời giờ vào dưới mốc kèm `datGap` → 200, có dấu; cũ và mới đều trên mốc kèm `datGap` → 409 `short_notice_not_needed`; chặng còn 150 phút dời 5 ngày sau kèm `datGap` → 200, KHÔNG dấu (Bán hàng và Quản trị), nhật ký vẫn có " · đặt gấp: <lý do>" (G16); dời ra xa vắng `datGap` → 409 `short_notice_required`; chỉ đổi ô phụ kèm `datGap`: dưới mốc → 200 dấu mới, trên mốc → 409; chỉ đổi ô phụ vắng `datGap` → giữ dấu cũ | "bài 2" |
| T3 (3) | `PUT …/trip`: không chặng nào dưới mốc kèm `datGap` → 409; dời ngày đi để chặng A vào dưới mốc và chặng B vẫn xa, kèm `datGap` → 200, chỉ A có dấu, B không dấu (dấu cũ gieo sẵn bị bỏ); chặng dưới mốc dời ra xa kèm `datGap` → 200, không dấu, nhật ký có lý do | "bài 3" |
| T4 (4) | Thêm chặng: mới dưới mốc kèm `datGap` → 201, có dấu; trên mốc kèm `datGap` → 409, không ghi | "bài 4" |
| T5 (5) | Thay chặng: cũ hoặc mới dưới mốc kèm `datGap` → 200; cả hai trên mốc → 409, chặng cũ vẫn mở; thay chặng dưới mốc bằng chặng xa kèm `datGap` → 200, chặng mới không dấu | "bài 5" + sửa ca (a) C14 ở `thay-chang-route.test.ts` |
| T6 (6) | Bán hàng sửa chặng đơn người khác mà không phụ trách → 403 (ô `order.trip.edit` không đổi) | "bài 6" |
| T7 (7) | Bài tĩnh: ép kiểu `DauDatGapMoi` đúng một chỗ (trong `xetDatGapSua`), `DauChepNhap` đúng một chỗ (trong `datGapCuaDong`); câu ghi năm cột chỉ nhận hai kiểu đó. Bài hành vi: Đối tác và Thực tập lưu lại nháp của mình có chặng Bán hàng đã đặt gấp, không đổi giờ, nơi → 200, dấu còn nguyên. Quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên) + dòng `docs/SO-HANG-RAO.md` | "bài 7" |
| T8 (8) | Chỉ nới đúng sáu bài ghim ADR nêu tên: `permissions.test.ts` (bảng ô, bài "CHỈ ADMIN + SUPER_ADMIN", bài `can()` mọi ô), TC-22 + TC-24 ở `dat-gap.test.ts`, Q-B ở `o-moi-chang.test.ts`, ca (a) C14 ở `thay-chang-route.test.ts`, `tro-ly-cau-truc.test.ts`, e2e `chang-hanh-khach.mjs` (9). Bài khác đỏ vì Quản trị đặt gấp chặng còn xa chỉ đổi dữ liệu gieo cho chặng dưới mốc | diff bài |
| T9 (9) | Nhãn: người chỉ thấy cờ thấy "Điều chỉnh khẩn cấp (văn phòng)" trên chặng và trong lịch sử đơn, không tên; văn phòng thấy "Điều chỉnh khẩn cấp — <lý do> — <người> <giờ>"; thẻ chặng lịch chung "Điều chỉnh khẩn cấp"; đuôi nhật ký không đổi (bài khứ hồi ADR-0062 xanh) | `dat-gap-hien-thi.test.ts` (hai tệp), `dieu-phoi-man.test.ts` |
| T10 (10) | Kịch bản Chrome `dua-don-smoke` và `dat-gap-smoke` (đỏ sẵn từ 1.80 — sửa hoặc ghi rõ chưa chạy được), có `AXE_JS` | log ở `docs/evidence/2026-10-25-adr-0107/` |
| T11 (11) | `npm test`, `npm run typecheck` 0 lỗi, e2e `chang-hanh-khach` + `tai-xe-cuoc` xanh | lệnh |
| T12 (12) | `GET /api/van-chuyen/lich`: Bán hàng nhận `nhapChoDatGap` có đơn nháp chờ đặt gấp; Kế toán (có `trip.view`) nhận mảng rỗng; dòng việc "Ai xử lý: Bán hàng, Quản trị" | "bài 12" |
| T13 | Mọi câu "chỉ / cần Quản trị (hoặc Toàn quyền) đặt gấp" trên giao diện, câu lỗi, hướng dẫn, trợ lý được sửa; có câu tiếng Việt cho 409 `short_notice_not_needed` ở `order-errors.ts` | tìm chữ + bài `order-errors` |

## Giả định bề mặt (tự áp, đảo ngược được)

- Chữ theo từ vựng hiện hành ("lượt đưa đón", "hạn chốt" — rà soát ngôn ngữ lượt 2, bản 2.19) thay chữ cũ trong ADR: 403 "Bạn không có quyền đặt gấp lượt đưa đón."; 409 `short_notice_required` "Lượt đưa đón có giờ đón đã qua hạn chốt — cần kèm lý do đặt gấp."; 409 mới "Lượt đưa đón chưa qua hạn chốt — không cần đặt gấp."
- Người chỉ thấy cờ (Đối tác, Thực tập) đọc "Cần văn phòng đặt gấp"; dòng phụ của dải cảnh báo cho người có ô: "Chọn lý do đặt gấp thì xác nhận và xếp xe được.".
- Nút trong khung "Duyệt đặt gấp" giữ nguyên (ADR chỉ đổi nhãn của dấu, tên nút "Đặt gấp" giữ).
- Nhật ký thay đổi: số **2.31 tạm**, ngày dự kiến 2026-10-26 (phiên phát hành kiểm lại ở bước A.0).

## Ngoài phạm vi (nói với chủ một lần)

Dấu Quản trị đã đóng trước nhiều ngày trên production (trước ADR này) KHÔNG bị dọn: chúng còn miễn mốc lúc xếp cho tới khi chặng bị sửa (I16 bỏ dấu khi nội dung đổi). Đếm và dọn là việc riêng, cần chủ quyết (đọc D1 remote).
