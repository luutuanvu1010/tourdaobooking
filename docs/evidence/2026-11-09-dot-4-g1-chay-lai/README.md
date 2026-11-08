# Chạy lại điều kiện 5 của TNV-G1 (ADR-0089) trên `main` — 9/11/2026

Một trợ lý chạy, 9/11 khoảng 00:29–00:40 giờ VN (máy chạy múi +07; giờ tệp `may/k09.json` 00:29, `nhat-ky/audit-kt.log` 00:39). **Chưa có người kiểm thứ hai.** Không sửa tệp nào trong kho, không commit, không đụng D1 thật, không deploy, không push.

## Mã đã chạy
- `git archive main` = **fa3fd859a6fd9888ed51751fa4e289abd19d8d06** (trùng `origin/main` trong kho, không fetch). Commit: «Gộp main mới nhất (ô «Có vé») vào nhánh sửa bài xác minh tự khai», 8/11 21:10.
- Đã kiểm phần sửa G1 của nhánh 28/10 có trong mã: `web/home.ts` có `taiThuTruoc`, có `src/shared/thong-bao-duyet-hoan.test.ts`, route `GET /api/ledger/coc`, `/coc/dem`, `POST /api/orders/:id/coc/duyet|chi`, mã lỗi `coc_needs_approval` trong `src/modules/billing/service.ts`. (Nhánh `claude/nostalgic-aryabhata-066936` không còn tên trong kho nên không so tổ tiên bằng git được.)
- `npm ci` + `npm run build:web` trong bản chép `ma/`. Bảy máy thử, mỗi máy một D1 cục bộ tạm (`d1/<tên>`, migration áp `--local --persist-to`), một cổng, `wrangler dev --local`; `.dev.vars` khoá ngẫu nhiên (SESSION_SECRET, LAN_GUI_SECRET, MFA_ENCRYPTION_KEY), **không** Turnstile. Tài khoản thử nạp như `tests/e2e/run.mjs` (`insertStaffSql` của `ACCOUNTS`). Khung máy thử: `may-chu.mjs`, lệnh chạy: `chay.sh`.

## Kết quả 8 ca (chấm theo mã HTTP và số tiền trong `thuc_te`, không theo nhãn `ket_luan`)

| Ca | Cũ 28/10 (trong ngoặc: lỗi gốc 2/10) | Nay 9/11 | Kết luận |
|---|---|---|---|
| kiem-lai-09 (máy k09) | còn lại 0, dư 0; nhãn «Thu trước giữ lại – khách huỷ», còn giữ 50.000; ảnh huỷ không có «Còn lại»; BS3/BS4 403, BS6 409 `coc_needs_approval`, BS8 201, BS13 409 `coc_same_person`, BS14 409 `coc_exceeds_paid` (2/10: còn lại 150.000) | Đơn 200.000 thu 50.000 → huỷ (KHACH_DOI_Y) 200: /payments còn lại **0**, dư 0; biên nhận còn lại **0**, nhãn «Thu trước giữ lại – khách huỷ», hạn 12/01/2027 (= ngày đi + 60), còn giữ 50.000; ảnh gửi khách «THÔNG BÁO HUỶ…» không có dòng «Còn lại». Bán hàng/Quản trị thu thêm vào đơn huỷ **403**; Kế toán thu CK muộn 400 `bank_txn_required` (thiếu mã giao dịch — đúng); Kế toán hoàn tự do **409 `coc_needs_approval`**; Bán hàng duyệt 403; Quản trị duyệt 20.000 **201**; Quản trị tự chi 403; chi vượt duyệt 409 `coc_exceeds_approved`; Kế toán chi 20.000 201; Toàn quyền duyệt 10.000 201 rồi tự chi 409 `coc_same_person`; duyệt vượt tiền còn giữ 409 `coc_exceeds_paid`; sổ thu trước: donHuyGiuCoc còn giữ 30.000, canChi 10.000, conNguoiGiu «NV Bán A» 50.000; Bán hàng đọc sổ 403; huỷ không lý do 400; Bán hàng chọn «Thời tiết» 403; Quản trị «Thời tiết» 200 → nhóm Công ty huỷ, còn lại 0 | **hết** |
| 09 nhóm 1 (n1) | còn lại 0; Bán hàng thu sau huỷ 403; hoàn tự do 409 `coc_needs_approval` (2/10: còn lại 180.000; thu sau huỷ 201; hoàn tự do 201) | thu trên nháp 409 `order_draft_no_payment`, sau xác nhận 201; huỷ 200; đơn huỷ: phải thu 230.000, đã thu 50.000, còn lại **0**, dư 0; biên nhận huỷ còn lại **0**; Bán hàng thu thêm sau huỷ **403**; Kế toán hoàn tự do **409 `coc_needs_approval`**; sổ thu trước có đơn (còn giữ 50.000, người giữ NV Bán A) | **hết** (phần G1) |
| 26 nhóm 3 (n3) | còn lại 0 ở ba nơi; sổ thu trước có đơn, còn giữ 60.000; thu thêm 403; hoàn 403 / 409 (2/10: còn lại 140.000; thu thêm 201; hoàn 201) | huỷ không lý do 400; có lý do 200; còn lại **0** ở /payments, thẻ danh sách, biên nhận; sổ thu trước có đơn, còn giữ 60.000, người giữ NV Bán A; Bán hàng thu thêm **403**; Bán hàng hoàn 403; Quản trị hoàn 403; Kế toán hoàn (vượt và đúng số) **409 `coc_needs_approval`** | **hết** |
| HD06 (hd) | còn lại 0; nhóm Khách huỷ; sổ có đơn và người giữ tiền; không đẩy tin (2/10: còn lại 300.000, Kế toán không thấy) | HDV huỷ «Không liên hệ được» 200: còn lại **0**, dư 0; nhóm Khách huỷ; sổ thu trước có đơn (300.000) và người giữ «NV Bán A» 300.000; HDV xem không thấy tên người giữ; tin Kế toán 0 → 0 (đúng đ5: không đẩy tin). Nhánh giảm khách: dư 100.000, Đã giao 409 | **hết** |
| HD08 (hd) | còn lại 0; nhóm Chưa kết luận; CK chưa xác nhận không tính vào đã trả (khối coc 50.000 + đang đối chiếu 50.000); /payments đã thu 100.000 (2/10: còn lại 100.000) | HDV huỷ lý do Khác 200: nhóm **Chưa kết luận**, còn lại **0**; coc: đã trả 50.000, đang đối chiếu 50.000 (khoản CK chưa xác nhận), còn giữ 50.000; sổ thu trước: donHuyGiuCoc 50.000, doiChieu CK 50.000; ảnh gửi khách «Khách hàng đã trả trước=50.000 ₫; Đang đối chiếu=50.000 ₫»; trang đơn với đơn huỷ vẽ từ khối `coc` (`web/order.ts` hàm `tienCard` bỏ dòng «Đã thu/Còn lại» khi có `coc`, ô tóm tắt dùng `coc.daTra`, thêm dòng «Đang đối chiếu») → **CK chưa xác nhận không tính vào đã trả** ở trang đơn, biên nhận (khối huy) và ảnh. Riêng số thô `/payments daThu` và `receipt.daTra` cấp ngoài vẫn = 100.000 — giống 28/10, không phải chỗ người dùng đọc cho đơn huỷ. Biến thể HDV thu 80.000 rồi huỷ: còn lại 0, sổ có đơn, người giữ = HDV | **hết** (phần G1); G9 chưa kiểm (Từ chối `busy` vẫn 400) |
| QT05 (qt) | còn lại 0; Quản trị hoàn tự do 403, duyệt hoàn 201 (2/10: Quản trị không có đường hoàn) | huỷ không lý do 400, có lý do 200; còn lại **0**; Quản trị hoàn tự do **403**; sổ thu trước có đơn 200.000 + người giữ; Quản trị **duyệt hoàn 200.000 → 201**; sau duyệt canChi 200.000, ô đếm canChi = 1; ảnh gửi khách có dòng «Tour Đảo hoàn (chậm nhất 10/01/2027)=200.000 ₫». Xuất bến 409 vì ngoài cửa sổ; suất của đơn huỷ đã tự rút (nhãn tự sinh «xe vẫn xuất bến» là SAI như 28/10) | **hết** |
| DT04 (dt) | còn lại 0; Kế toán thấy đối tác giữ 60.000; Đối tác không thấy tên người giữ (2/10: còn lại 140.000) | xác nhận thẳng 409 `partner_submit_required` → Gửi đơn 200 nhánh B; thu 60.000 201; huỷ không lý do 400, có lý do 200; còn lại **0**; Đối tác xem: `nguoiGiu = null` (**không thấy tên người giữ**); Kế toán thấy người giữ «Lữ Hành Biển Xanh…» 60.000, sổ thu trước có đơn | **hết** |
| KT01 Đ5 (kt) | còn lại 0; sổ có Đ5; ô đếm người giữ tiền = 1 (2/10: thẻ còn lại 140.000; sổ không có mục) | thẻ Đ5 còn lại **0**, dư 0, đã thu 60.000; sổ thu trước có Đ5 (60.000) và người giữ; ô đếm conNguoiGiu = 1; Bán hàng xem không thấy tên người giữ; ô «Còn thiếu tiền» tăng đúng 2 đơn / 350.000 | **hết** cho G1 |

Kết luận chung: cả 8 ca cho đúng số như 28/10 trên mã `main` hiện tại; không thấy ca nào hỏng lại.

## Chỗ đã sửa trong bản chép kịch bản (`kich-ban/`; bản gốc ở `~/Documents/danh-gia-ux/2026-10-01/kich-ban/` không bị ghi)
Chung mọi tệp:
1. Đổi đường dẫn tuyệt đối: `lib.mjs`, `src/shared/order-confirmation.ts`, `REPO` (vai-kt) trỏ về bản chép `ma/`; tệp kết quả (`OUT`) trỏ về `ket-qua/` — để không xoá tệp gốc (kịch bản gọi `writeFileSync(OUT, "")` lúc bắt đầu).
2. Lọc ca: thêm `CHI_CA` vào `tinhHuong`/`chay` (nhom-1, nhom-3, vai-dt); vai-hd, vai-qt, vai-kt dùng sẵn đối số dòng lệnh. Chạy riêng được vì mỗi ca tự dựng dữ liệu của mình và đều chạy tới cuối không lỗi (không grep riêng biến dùng chung giữa các ca).
3. Thêm `g1.mjs` (chỉ đọc): /payments (khối `coc`, `nguoiGiu`), biên nhận (`conLai`, `huy`), ảnh gửi khách dựng bằng `buildConfirmation`, `GET /api/ledger/coc` lọc theo đơn, `/coc/dem`. Thay cho các bước `[g1-rerun]` của bản chép 28/10 đã mất. `xem-don.mjs`: xem lại một đơn theo mã (dùng một lần cho HD08).

Theo README 28/10 mục 3:
4. Huỷ ở văn phòng thêm `lyDo: "KHACH_DOI_Y"` (kiem-lai-09, nhom-1 09, nhom-3 26, vai-qt QT05 cả biến thể, vai-dt DT04, hàm `huy` của vai-kt); trước đó thêm một lần huỷ KHÔNG lý do để quan sát 400 (26, QT05, DT04).
5. Ghi thu chuyển ra SAU xác nhận (ADR-0135 Đ7): nhom-1 09 (giữ lần thu trên nháp để quan sát 409), nhom-3 26, HD06 (cả biến thể), HD08, KT01 (Đ2, Đ3, Đ5; Đ4 nháp đổi `thuOk` → `thu` để ghi nhận 409 thay vì ném). QT05 vốn thu sau xác nhận. `tienOk` của nhom-1 09 so `daTra` ở biên nhận đã xác nhận thay vì nháp.
6. `pickupChoice: "KHONG_DON"` (ADR-0134) cho hàm `dv()` của nhom-1; các tệp khác dùng `L.catalogService` của lib mới đã tự đặt.
7. Đối tác dùng «Gửi đơn» (ADR-0136) ở DT04.
8. Khoá máy thử: đặt ở `.dev.vars` của bản chép (đã xoá sau khi chạy), không đưa vào kịch bản.
9. kiem-lai-09: viết lại phần BỔ SUNG ADR-0089 (BS1–BS19) theo nhật ký 28/10 (`g1-chay-lai/nhat-ky/kiem-lai-09.log`), cùng thân lệnh `coc/duyet {loai, soTien, lyDo}`, `coc/chi {duyetId, soTien, hinhThuc, nguoiTra}`.

Thêm do mã đổi từ 28/10: **không cần sửa gì thêm** để đi tới bước tiền (ADR-0174, 0181, 0185, 0186 không làm hỏng 8 ca). Riêng vai-dt: bỏ lời gọi `GET /api/catalog/for-order` đầu tệp khi chạy có `CHI_CA` (lời gọi đó kéo Google Sheet thật, chỉ DT01 cần).

## audit-invariants (`node scripts/audit-invariants.mjs --db local --persist-to d1/<tên> --strict`, sau khi chạy kịch bản; không có tài khoản kiểu cũ cần ngưng)
| D1 | Thoát | Ghi chú |
|---|---|---|
| k09 | 0 | đạt, 1 cảnh báo R-CTL-1 (dịch vụ giả chưa phân nhóm) |
| n1 | 0 | đạt, 1 cảnh báo R-CTL-1 |
| n3 | 0 | đạt, 1 cảnh báo R-CTL-1 |
| hd | 0 | đạt, 1 cảnh báo R-CTL-1 |
| qt | 0 | đạt, 1 cảnh báo R-CTL-1 |
| dt | 0 | đạt, 1 cảnh báo R-CTL-1 |
| kt | 0 | đạt, 1 cảnh báo R-CTL-1 |
Nhật ký: `nhat-ky/audit-<tên>.log`.

## Điều chưa chạy / cần biết
- Máy `hd` có một lần chạy hỏng đầu tiên: lệnh vá kịch bản báo lỗi nhưng kịch bản chưa vá vẫn chạy, tạo thêm 4 đơn (ghi thu 409, một đơn bị HDV huỷ không tiền, một đơn HDV thu 80.000 rồi huỷ). Kết quả đó đã bỏ; chạy lại bản đã vá. Hệ quả duy nhất: «Sổ của tôi» của HDV A ở HD08 đi 80.000 → 160.000 (gồm 80.000 của lần hỏng). Không ảnh hưởng số của từng đơn.
- Không chạy giao diện / Chrome; chỉ tầng API như 28/10.
- Ngoài G1, ghi để người điều phối xem (không chặn): (a) HD08: số thô `receipt.daTra` cấp ngoài và `/payments daThu` = 100.000 (gồm CK chưa xác nhận) như 28/10; mọi chỗ hiển thị cho đơn huỷ (trang đơn, khối huy, ảnh) đã tách đúng — ghi để biết nếu sau này có màn mới đọc thẳng số thô. (b) Kế toán có `coTheDuyetChuyen = true` trên đơn huỷ (duyệt chuyển sang đơn mới, ADR-0120) — không thử. (c) Biên nhận nháp vẫn tiêu đề «XÁC NHẬN ĐƠN DỊCH VỤ [Chờ xác nhận]». (d) HD08 «Từ chối» gửi mã cũ `busy` → 400 (G9 chưa kiểm). (e) Mục (a) cũ của 28/10 (đơn KHÔNG huỷ trả dư không vào `canChi`) chưa kiểm lại.
- Tắt máy thử: đã `kill` cả bảy nhóm tiến trình đã ghi; kiểm lại không còn cổng nào của mình đang nghe, `pgrep workerd` rỗng.

## Tệp
- Kết quả: `ket-qua/*.ket-qua.jsonl`; nhật ký: `nhat-ky/*.log` (kể cả `wrangler-<tên>.log`).
- Bản chép kịch bản đã sửa: `kich-ban/`; khung: `may-chu.mjs`, `chay.sh`.
