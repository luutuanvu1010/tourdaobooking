# Phiếu tổng hợp kiểm độc lập: lượt duyệt 8c (2026-10-08)

## 0. Kết luận chung

Lượt này **chưa trình chủ được**. Tệp 03 không đạt, vì ý 1 dựa trên một tiền đề sai: bảng "Sửa thông tin chuyến" của bản hiện nay không bỏ được chặng. Ba hộp hỏi ở 00:20-37 cũng phải viết lại hết. Sau khi sửa các mục CAO dưới đây, lượt có thể trình **hai câu** (Tổng âm, Thứ tự điểm). Phần báo tài xế khi đổi ngày thì điều phối tự áp, theo điều kiện ở mục 3. Câu 3 (Sửa chuyến) chỉ nên hỏi nếu chủ có số liệu cho thấy còn nhiều máy dùng bản cũ, xem mục 4. Không có lỗi CHẶN.

Mốc mã: `git diff --stat b8927c27 HEAD -- src web migrations` rỗng, nên mọi `tệp:dòng` của ba người kiểm vẫn đúng.

---

## 1. Phân xử chỗ hai góc nói khác nhau

**1.1. Tệp 03: góc quy trình chấm ĐẠT CÓ ĐIỀU KIỆN, góc chuyến chấm KHÔNG ĐẠT. Kết luận: KHÔNG ĐẠT.**
- `src/shared/trip-form.ts:111-120` (`tripPayload`) bỏ hai khoá `pickupTime`/`pickupPlace`. `web/trip-sheet.ts:133-134` là nơi duy nhất gọi `PUT /trip`.
- `src/shared/chang-dua-don.ts:335` trả `boChieuDi: null` khi hai khoá vắng, nên không sinh lệnh `close`.
- Chỉ thân kiểu cũ mới có hai khoá đó (`laThanTripCu`, `than-cu.ts:20`; được đếm ở `orders/index.ts:876`). `CAU_CAP_NHAT_APP` chưa được dùng ở đâu, nghĩa là đường cũ chưa bị cắt.
- Hôm nay nút "Cập nhật khách theo đơn" bỏ qua chặng đã đóng (`dieu-phoi-lenh.ts:623`). Vì vậy câu "ghế nằm trên xe cho tới khi người xếp xe bấm nút" (03:9) chỉ đúng sau khi Đ2.11 thi công.
- Các hộp hỏi góc quy trình soạn lại cho câu 3 vẫn dựa trên tiền đề sai này, nên không dùng.

**1.2. Câu "từ hai chỗ sai trở lên mới kẹt" (02:9, :17, :54; 00:30, :115). Góc chuyến đúng.**
- `thanDoiThuTu` chỉ đổi chỗ hai điểm chờ liền kề (`src/shared/tien-do-man.ts:100-106`). `daoMoiSauDoi` chỉ tính chỗ đảo mới (`src/shared/thu-tu-diem.ts:72-81`).
- Thử với A(1), X(2), B(3) và một suất đón ở B, trả ở A: mọi cách đổi một bước đều còn A đứng trước B. Đọc theo đúng chữ thì chuyến kẹt dù chỉ có **một** chỗ sai.
- Hộp góc quy trình soạn cho câu 2 lặp lại câu sai này, nên không dùng.
- Phần "phải làm công cụ mới" bị nói quá. Máy chủ đã nhận trọn danh sách điểm (`dieu-phoi-lenh.ts:96-100`, `dieu-phoi-tien-do.ts:225-232`) và `sapDonTruocTra` đã có sẵn, nên phần thiếu chủ yếu là giao diện.

**1.3. Nhãn "xây trên lỗ đang hở". Góc tiền chấm THẤP, góc quy trình chấm CAO. Kết luận: CAO, không CHẶN.**
- `CLAUDE.md:34` ghi nguyên văn: "chạm vùng đang hở phải ghi 'xây trên lỗ đang hở: <mã>' và không được duyệt trước khi lỗ được vá hoặc chủ dự án gia hạn có ghi lý do".
- TNV-G1 (`docs/quyen-hoan.json`) trích đúng `hoan-tat.ts:9-18`, tức đúng hàm mà (a) sửa.
- TNV-G3 nói về vùng Đã giao → Hoàn thành mà (a) mở cho đơn tổng âm. Tệp 01 §8 và 00 §6 không phân tích TNV-G3.
- Điều kiện "lỗ được vá" đã thoả ở mức mã: `git ls-tree main migrations/` có `0078`, `0079`, `0083`. Nhưng bản vá chưa lên production, và hai mục còn mở tới 2026-10-31. Vì vậy chỉ cần sửa nhãn và kèm điều kiện thứ tự phát hành, như tiền lệ ADR-0063 dòng 7 mà chủ đã duyệt.
- Nếu điều phối hiểu "vá" là "đã lên production" thì mục này thành CHẶN và cần chủ gia hạn có ghi lý do.

**1.4. Phần báo tài xế của câu 3. Góc quy trình muốn điều phối quyết, góc chuyến nghiêng mạnh là mã lệch ADR. Kết luận: tự áp, có điều kiện (mục 3).**

**1.5. Sửa chữ ADR-0079 có tính là quyết định thứ tư không. Kết luận: chấp nhận coi là hệ quả của quyết định #1**, với điều kiện thân câu hỏi 1 nói rõ bằng lời thường (hộp ở mục 4 đã nói). Nếu bỏ câu 3 thì lượt chỉ còn hai quyết định, và câu hỏi về cách đếm không còn ý nghĩa.

---

## 2. Kết luận từng tệp

### Tệp 00-trang-ghep.md: ĐẠT CÓ ĐIỀU KIỆN

Phần #1 và #2 đúng với mã. Bản đồ quyền §3 khớp `permissions.ts` từng cột, cả giá trị lẫn thứ tự vai. Có đủ ba phần mà `CLAUDE.md` §9 đòi.

**PHẢI sửa (CAO):**

1. **00:20-37, ba hộp hỏi.** Thay toàn bộ bằng các hộp ở mục 4. Đưa "Ghi chú cho điều phối" (00:37) ra ngoài khối dán vào hộp.
2. **00:132.** Đổi "#1: không xây trên lỗ đang hở (tệp 01 §8). Sát TNV-G1 …" thành:
   > "#1: xây trên lỗ đang hở: TNV-G1 (cùng hàm `phaiThuCua`, `hoan-tat.ts:9-18`) và TNV-G3 (mở đường Đã giao → Hoàn thành cho đơn tổng âm). Bản vá mã của cả hai đã ở `main` (`0078`–`0079`, `0083`) nhưng chưa lên production; điều kiện: chỉ phát hành sau Sổ tiền, cùng A2. Đơn huỷ không đổi số (`rules.ts:76-80`)."
3. **00:12, câu về quyết định thứ ba.** Nếu bỏ câu 3, đổi thành:
   > "Việc thứ ba không cần bạn chọn: bảng 'Sửa thông tin chuyến' đổi ngày đi mà chưa báo tài xế. Đây là chỗ Nền tảng làm thiếu so với quyết định về tin báo ngày 30/9, nên tôi sửa theo quyết định đó. Còn việc bỏ chặng qua bảng này chỉ còn ở máy chưa cập nhật bản mới, nên tôi giữ như quyết định 8/10."

   Nếu vẫn hỏi câu 3, viết theo thân câu hỏi 3 ở mục 4. Sửa §1 (00:45-49) cho khớp số quyết định thật.
4. **00:127, dòng "#3 tin + tin đơn đổi".** Đổi cột "Chặn bởi" thành:
   > "hộp thư: cùng lô ⇒ tối đa một tin (`thong-bao.ts:144`, `:174-190`); gõ cửa màn hình khoá: CHƯA bảo đảm — `doiVuaGhi` chỉ đọc một dòng (`thongbao/repository.ts:39-41`, `LIMIT 1`), phải sửa kèm (mục 3 phiếu tổng hợp)."

   00:37 thì đổi "tự áp được mà không cần hỏi" thành "tự áp theo ADR-0052 D6.2, kèm điều kiện ở mục 3 phiếu tổng hợp".
5. **00:115.** Đổi "⇒ chuyến có từ hai chỗ đảo khoá hết nút" thành:
   > "⇒ chuyến mà một bước không gỡ hết đảo (≥ 2 suất đảo, hoặc 1 suất đảo có điểm khác chen giữa) khoá hết nút".

**THẤP (ghi lại, không chặn):**
- Phần "Cho chủ" (00:10-18) thiếu một câu về điều chưa kiểm. Nên thêm: "Người kiểm đã chạy thử cách khuyến nghị trên bản sao của mã; chưa ai xem bản chạy thật có bao nhiêu đơn tổng âm."
- 00:14 "tôi không thấy lỗ mới" nên kèm câu về TNV-G1/G3.
- §3 cột "Áp cho" mới ghi số quyết định, chưa tách theo loại đơn (bán lẻ, đại lý, Thực tập).
- §7 thiếu R-BIL-14 (`ADR-0079:98`) và ADR-0081 (`giamGiaMinhChiu`). Nếu chọn phương án tự trả ghế thì §7 còn thiếu ADR-0104 Đ2.2 (`:130`).
- 00:116: `OrderResponse` (`contracts.ts:490`) không có trường mang câu nhắc "Báo huỷ", và `web/trip-sheet.ts:134` bỏ kết quả trả về. Mục này chỉ còn ý nghĩa nếu chọn tự trả ghế.
- 00:81 "nghĩa rộng ra ở (a)" chỉ đúng nếu chọn tự trả ghế.

### Tệp 01-de-xuat-adr-0109-tong-tien-am.md: ĐẠT CÓ ĐIỀU KIỆN

Mọi con số và `tệp:dòng` đều khớp mã. Góc tiền đã chạy (a) trên bản sao: hoàn 200.000 thì Đã giao trả 200, `due_snapshot` = 0, Hoàn thành trả 200. Chỉ kẹp ở `effectiveMoney` thì Đã giao vẫn trả 409, đúng như yêu cầu "kẹp ở nguồn". (a) không đổi số của đơn không âm, và không cần migration.

**PHẢI sửa (CAO):**

1. **01:9.** Đổi "Xây trên lỗ đang hở: không (mục 8)." thành cùng câu với 00:132 ở trên.
2. **01 §8 (:116-120).** Thêm một gạch:
   > "TNV-G3: (a) cho đơn tổng âm qua phiếu Đã giao với `due_snapshot` = 0 rồi Hoàn thành (I1 = 0); đảo / thay lần thu sau Đã giao đi đường `0083` như mọi đơn. Không đổi mã vùng đó, nhưng dựa vào bản vá chưa lên production ⇒ phát hành sau Sổ tiền."
3. **01 "Cho chủ" (sau :32).** Thêm một câu:
   > "Việc này đụng vào cùng chỗ tính tiền với hai lỗi đã biết (tiền đơn huỷ và sửa sai sau 'Đã giao'); bản sửa hai lỗi đó đã làm xong nhưng chưa lên bản chạy thật, nên phần này chỉ phát hành sau đợt Sổ tiền."

**THẤP:**
- **§6 (:95-104) thiếu năm chỗ sẽ sai hoặc đỏ sau (a).**
  - `tests/e2e/sua-so-khach.mjs:80-89` (CA 3 đang khoá total −50000).
  - `src/shared/huong-dan-ke-toan.ts:86` (dạy Kế toán "chưa bấm được Đã giao…"; kho trợ lý sinh từ đây). Có thể đây là V-3 hoặc V-5, chưa chứng minh.
  - `src/so-vang-sua-so-khach.test.ts:87`.
  - `src/modules/orders/money-adjustment.test.ts:175-177` (thêm ca kẹp).
  - Mục nhật ký thay đổi `src/shared/changelog.ts`.

  Thêm "chạy lại e2e sua-so-khach" vào kế hoạch.
- **Biên nhận.** `ReceiptDto` không có trường giảm giá hiệu lực (`receipt/rules.ts:29-31` chép nguyên `discount`/`total`; bài `bien-nhan.test.ts:34` khoá đúng danh sách khoá). Kế hoạch phải chọn một trong hai: thêm trường (đổi hợp đồng) hoặc suy ra subtotal − total (thêm chỗ tính thứ hai). Thêm `receipt/rules.ts` và `contracts.ts` vào danh sách phải sửa. "Hiển thị tiền" là việc lớn, nên hộp hỏi 1 đã nêu phần này.
- **01:25, :67, :93, cách mô tả (a)/(b) với D1.4.** Viết lại là "cả hai đều giữ số giảm giá đã ghi; (a) chỉ đổi đơn đang âm, (b) đổi mọi đơn đã sửa số khách". Thêm vào cách 1: "người khách còn lại không phải trả gì, Kế toán hoàn hết số đã nhận".
- **01:26 và :49 mâu thuẫn với :19.** Đổi "Kế toán cũng không có đường tay nào để gỡ" thành "Không có đường gỡ đúng sự thật; chỉ còn tăng số khách trở lại, tức ghi sai thực tế". 00:25 sửa tương tự.
- **01:10 và :108, chữ "Cửa: hai chiều".** Đổi thành "hai chiều trước khi có đơn nào đi qua; sau đó đổi lại sẽ làm khối Thanh toán của các đơn đã giao ấy hiện dư giả" (`billing/service.ts:170`, `:188`). Ý này suy từ mã, chưa chạy.
- **§5 thiếu R-BIL-14** (`ADR-0079:98`, "đúng một dòng `GIAM_GIA_BEN_DAT` khi discount > 0"). Dòng "Sửa:" (:8) nên ghi thêm ADR-0081.
- §4 có thể nêu thêm "Việc của tôi" của HDV (`orders/index.ts:544` → `web/viec-cua-toi.ts:533`). Bề mặt này đi qua `applyAdjustmentToOrder` nên vẫn đúng.
- Phần "Cho chủ" dài khoảng 700 từ và còn mã nội bộ ("SV-SK-04", "A2" ở :32). Nên rút còn khoảng 350 từ và thêm một câu "chưa kiểm" (production có bao nhiêu đơn tổng âm).
- 01:6 ghi "cuối README", thật ra là `docs/adr/README.md:113` trên tổng 135 dòng. README của nhánh QR còn ghi "kế tiếp là 0103", nên phải đối chiếu số khi gộp. Số 0109/0110/0111 hiện không trùng.

### Tệp 02-hai-cho-ma-lech-adr-0096.md: ĐẠT CÓ ĐIỀU KIỆN

Chữ ADR (`ADR-0096:36-37`) và §16 (`SYSTEM-DESIGN.md:1282-1283`) trích đúng. Luồng mã đúng. Khuyến nghị giữ mã vững.

**PHẢI sửa (CAO):**

1. **02:9.** Đổi "Lý do là nút chỉ đổi chỗ hai điểm cạnh nhau, nên chuyến có hai chỗ sai thì sau bước đầu vẫn còn một chỗ, và máy chặn." thành:
   > "Lý do là nút chỉ đổi chỗ hai điểm cạnh nhau, nên lần bấm nào không sửa hết chỗ sai sẽ bị chặn: chuyến có hai chỗ sai, hoặc chỉ một chỗ sai mà điểm đón và điểm trả của khách đó không đứng cạnh nhau, đều kẹt."
2. **02:17.** Đổi "Mất: chuyến có từ hai chỗ sai trở lên bị kẹt, và muốn gỡ phải làm thêm một công cụ mới, …" thành:
   > "Mất: chuyến mà một lần bấm không sửa hết chỗ sai sẽ kẹt, kể cả chỉ một chỗ sai khi hai điểm không đứng cạnh nhau; muốn gỡ phải làm thêm phần màn hình như nút 'Sắp lại tự động' hoặc kéo-thả (máy chủ đã nhận được cả danh sách thứ tự và đã có hàm sắp lại)."
3. **02:54.** Đổi "Phải kèm một đường gỡ cho chuyến có từ hai chỗ đảo" thành:
   > "Phải kèm một đường gỡ cho chuyến mà một bước ↑ ↓ không gỡ hết đảo (≥ 2 suất đảo, hoặc 1 suất đảo có điểm chen giữa — ví dụ A(1), X(2), B(3), suất đón B trả A)".

   Đổi "Đó là việc mới, cần kế hoạch riêng" thành:
   > "Chủ yếu là giao diện: `lenhSuaChuyen` (`dieu-phoi-lenh.ts:96-100`) và `lenhDoiThuTu` (`dieu-phoi-tien-do.ts:225-232`) đã nhận trọn danh sách; `sapDonTruocTra` đã có."

**THẤP:**
- **Mục "Giữ mã thì được và mất gì" (02:15) thiếu một hệ quả.** Mỗi lần bấm ↑ ↓ trên chuyến đã có tài xế đều ghi `trip_edited`, và hành động này nằm trong `HANH_DONG_TIN_CHUYEN` (`tin-chuyen.ts:8-9`). Hệ quả là tài xế nhận tin "Văn phòng vừa sửa chuyến" (`loaiCho` → `doi_chuyen`). Hộp hỏi 2 đã nêu; ý này mới đọc mã, chưa chạy.
- **Chữ Đ1.3c đọc được hai cách** ("làm vi phạm" có thể hiểu là "gây ra vi phạm"). Nên thêm một câu: ADR-0110 với Đ1.3c thực chất là chú giải, còn Đ1.3b mới là thay đổi thật.
- **02:38 và :59 "chưa kiểm" đóng được:** `lenhThemDiemDangChay` gọi `sapLaiDiem` (`dieu-phoi-lenh.ts:302`), nên câu "rủi ro nhỏ" có căn cứ. Dẫn chứng "người kiểm đã thử trong vùng 6 giờ" (02:11) nên chép từ `SYSTEM-DESIGN.md:1283` vào §3.
- Phần "Cho chủ" dài khoảng 620 từ và còn "ADR-0096", "ADR-0110", "↑ ↓", "mã".

### Tệp 03-sua-thong-tin-chuyen-chua-bao-xe.md: KHÔNG ĐẠT

**PHẢI sửa (CAO):**

1. **Tiền đề ý 1 sai** (03:7, :9, :30, :42; kéo theo :13-16, :18, :22).
   - 03:7: thay câu "Nó cũng bỏ được chặng đón chiều đi nếu người sửa xoá cả giờ lẫn nơi đón." bằng:
     > "Bản mới của bảng không gửi giờ, nơi đón nên không bỏ được chặng. Chỉ máy chưa cập nhật bản mới, hoặc lời gọi thẳng vào máy chủ, mới còn bỏ được chặng qua đường này; đường đó sẽ mất khi Nền tảng ngừng nhận bản cũ."
   - 03:9: thay cả đoạn ý 1 bằng:
     > "Ý 1 — bản cũ bỏ chặng mà ghế trên xe vẫn còn. Trên máy chưa cập nhật bản mới, bảng này còn bỏ được chặng đón; khi đó ghế vẫn nằm trên xe và chuyến bị giữ 'có chặng đã bỏ còn khách' cho tới khi người xếp xe gỡ tay (nút 'Cập nhật khách theo đơn' chỉ xử lý chặng đã bỏ sau khi đợt Đồng bộ chuyến thi công). Ở bản mới, bỏ chặng là nút 'Bỏ chặng', và nút này sẽ tự trả ghế."
   - 03:30: thêm "(chỉ khi thân có khoá `pickupTime`/`pickupPlace` — `chang-dua-don.ts:335`, `:339`; bảng hiện nay bỏ hai khoá, `trip-form.ts:111-120`; thân cũ đếm ở `orders/index.ts:876`; `CAU_CAP_NHAT_APP` chưa dùng)".
   - 03:42, hàng "Bỏ chặng qua route này": thêm "chỉ thân cũ".
   - 03:13-16 và :22: khuyến nghị đảo thành "giữ như ADR-0104", theo hộp 3 ở mục 4.
   - 03:18: xoá đoạn "Về thời điểm … nên quyết ngay". Thay bằng:
     > "Không còn gấp. Chỉ khi chọn 'tự trả ghế' mới phải quyết trước khi đợt Đồng bộ chuyến viết migration view."
2. **Cách báo tài xế chưa bảo đảm gõ cửa màn hình khoá** (03:50). Thay câu "Cách gợi ý: … cho mỗi chặng đã xếp bị đổi ngày hoặc giờ đón …" bằng:
   > "Cách gợi ý: `updateTrip` ghi thêm một dòng `order_leg_updated` (`target_id` = id chặng, khuôn `detail` chặng có nhãn ngày/giờ đón mà `phanDoiCuaTin` đọc) cho **mỗi chặng bị đổi ngày hoặc giờ đón**, cùng mốc giờ với `trip_updated`; phía đọc (`ganChuyenCuaChang`) tự lọc chặng có suất mở — `orders` không đọc trạng thái xếp. Cách này phủ hộp thư. Gõ cửa màn hình khoá đi qua `dayGoCuaDoi`, mà `doiVuaGhi` chỉ đọc một dòng (`thongbao/repository.ts:39-41`, `LIMIT 1`, thứ tự phụ `e.id`), nên phải sửa kèm để ưu tiên / đọc mọi dòng `order_leg_updated` của request, có bài kiểm 'tài xế đang lái được gõ cửa'."

   03:20 và §4 (:52-55) thì sửa theo kết luận ở mục 3.

**THẤP:**
- 03:11 "Chuyến vẫn bị giữ" chỉ đúng khi dời từ 2 ngày trở lên. Dời ±1 ngày thì chặng vẫn trong khoảng đọc (`dieu-phoi-doc.ts:130-131`), nên chỉ có cảnh báo ở lịch chung. Ca này làm việc báo tài xế càng cần.
- Chưa nêu giới hạn số câu mỗi `db.batch` khi `updateTrip` ghi thêm tối đa khoảng 200 dòng nhật ký.
- §4 thiếu hai ý: D6.1 (`ADR-0052:148`) gọi danh sách hành động là "một chiều"; và ghi thêm dòng nhật ký là chạm dữ liệu, cần người kiểm.
- Phần "Cho chủ" dài khoảng 680 từ.

---

## 3. Quyết riêng: "báo tài xế khi đổi ngày" (câu 3, ý 2)

**Kết luận: đây là mã lệch ADR đã duyệt. Điều phối tự áp và không hỏi chủ.** Cách sửa dưới đây không đổi chữ ADR nào, nên đúng nguyên tắc "tài liệu chuẩn tắc thắng mã" (`CLAUDE.md` §2).

Căn cứ (góc chuyến, tôi đã mở lại từng chỗ):
- `ADR-0052:163` (D6.2) nói theo sự kiện: "giờ hẹn chặng đổi khi đã xếp (MQ-07)", người nhận gồm người lập / phụ trách và "tài xế đang lái chuyến có suất của chặng".
- `ADR-0052:195` ghi phần hẹn của ADR-0051 ("tin … khi giờ hẹn đổi (tới người phụ trách, tài xế)") được thi hành bằng dòng MQ-07.
- `ADR-0096:59` ghi "tài xế được báo qua tin MQ-07".
- Mã tự coi ngày là một phần của giờ hẹn: `NHAN_GIO_CHANG` gồm `legPickupDate` (`src/shared/tin-doi-don.ts:251`, `:331`).
- `PUT /trip` dời ngày đón của chặng (`doiNgayChang`, `chang-dua-don.ts:304-311` → `legUpdateGuarded`), nhưng chỉ ghi một dòng `trip_updated` có `leg_id` NULL (`repository.ts:1279`; `0086:10-15`). Vì vậy MQ-07 không bao giờ sinh ra.
- D6.1 (`ADR-0052:148`) ghi tên hành động `order_leg_updated` trong danh sách một chiều. Dùng đúng tên này là thoả cả cách đọc hẹp lẫn cách đọc rộng.
- Người kiểm A3 từng xếp việc này là câu hỏi cho chủ (sổ :77). Tôi không theo, vì cách sửa dưới đây không mở danh sách và không đổi chữ quyết định nào.

Điều kiện khi tự áp:
1. Ghi `order_leg_updated` (`target_id` = chặng) cho **mỗi chặng bị đổi ngày/giờ**, trong cùng lô `updateTrip`, cùng mốc giờ. **Không** thêm `trip_updated` vào `HANH_DONG_TIN_GIO_HEN` (`tin-chuyen.ts:110`), vì việc đó là mở danh sách một chiều và cần ADR (tiền lệ ADR-0097, ADR-0104 Đ2.10).
2. Chốt khuôn `detail` trong kế hoạch, theo đúng khuôn chặng mà `phanDoiCuaTin` đọc (tiền tố chiều + nhãn ngày/giờ đón), vì `detail` là hợp đồng với ADR-0062. Cần bài kiểm `gioHen === true` cho ca chỉ đổi ngày.
3. **Sửa đường gõ cửa** (`doiVuaGhi` LIMIT 1 → `dayGoCuaDoi`, `thongbao/index.ts:85`) để không bỏ sót dòng chặng. Cần bài kiểm cho ba điều: tài xế đang lái được gõ cửa, người làm không nhận, người lập nhận đúng một tin.
4. Kiểm trần số câu mỗi `db.batch` của `updateTrip` sau khi thêm dòng.
5. Đây là việc lớn vì chạm dữ liệu nhật ký chỉ-thêm. Ghi sổ thi công như sau: "V3 của A3: sửa mã cho khớp ADR-0052 D6.2, không đổi chữ ADR". Kế hoạch đi đỏ → xanh, có người kiểm độc lập chỉ-đọc, chạy cả e2e.
6. Trong báo cáo cuối lượt cho chủ, nói một câu: "tài xế sẽ được báo khi văn phòng đổi ngày đi, theo quyết định ngày 30/9".

---

## 4. Ba câu hỏi nguyên văn (dán thẳng vào hộp hỏi)

Nhãn đếm theo khoảng trắng: nhãn khuyến nghị có ≤ 4 từ trước " (Recommended)", nhãn khác ≤ 5 từ. Tiêu đề ≤ 12 ký tự.

**Câu 1**
- Tiêu đề: `Tổng âm`
- Câu hỏi: Khi văn phòng bớt khách, tiền dịch vụ có thể còn nhỏ hơn số giảm giá đã cho: ví dụ đơn 2 người, mỗi người 500.000, giảm giá 800.000, khách đã trả 200.000, bớt còn 1 người thì tổng tiền thành âm 300.000. Hôm nay đơn như vậy bị kẹt, vì Kế toán hoàn hết 200.000 mà Nền tảng vẫn báo khách còn dư 300.000, nên không bấm được "Đã giao". Hai cách sửa đều phải đổi chữ hai quyết định bạn đã duyệt: quyết định sửa số khách ngày 8/10 (đoạn nói tổng âm thì khách được ghi dư nhiều hơn số đã trả) và quyết định sổ đại lý ngày 1/10 (đoạn nói đại lý chịu đúng số giảm giá đã cho; phần này chưa làm nên hôm nay chưa có số nào đổi). Bạn muốn Nền tảng tính tiền khách phải trả thế nào?
- Phương án 1, nhãn `Phải thu không âm (Recommended)`. Mô tả: Được: đơn gỡ được bằng một lần hoàn (ở ví dụ người khách còn lại không phải trả gì, Kế toán hoàn đủ 200.000), giảm giá vẫn lưu 800.000, trang đơn vẫn cảnh báo, và đơn không âm không đổi đồng nào; mất: 300.000 giảm giá vượt coi như bỏ, biên nhận gửi khách ghi giảm giá 500.000 thay vì 800.000, và với đơn đại lý thì đại lý chịu 500.000 chứ không phải 800.000.
- Phương án 2, nhãn `Giảm giá theo số khách`. Mô tả: Được: khách vẫn trả một phần (ở ví dụ giảm giá co còn 400.000, khách trả 100.000 và được hoàn 100.000); mất: tiền của mọi đơn có giảm giá từng sửa số khách đều đổi, kể cả đơn cũ và đơn đã giao (khối thanh toán của đơn đã giao sẽ lệch số đã chốt), phải thêm luật làm tròn, và trái thêm câu "giảm giá giữ nguyên" bạn duyệt ngày 8/10.
- Phương án 3, nhãn `Giữ như hôm nay`. Mô tả: Được: không đổi gì và không sửa quyết định nào; mất: đơn tổng âm kẹt mãi không lên "Đã giao", và cách gỡ duy nhất là tăng số khách trở lại, tức ghi sai thực tế.

**Câu 2**
- Tiêu đề: `Thứ tự điểm`
- Câu hỏi: Quyết định ngày 3/10 về thứ tự điểm đón, điểm trả có hai chỗ Nền tảng đang làm khác chữ. Chỗ thứ nhất: chữ ghi lần đổi thứ tự nào làm sai luật cũng bị từ chối, còn Nền tảng chỉ từ chối lần đổi tạo ra chỗ sai mới, nên chuyến đã sai từ trước vẫn sửa dần được bằng nút lên/xuống. Chỗ thứ hai: chữ ghi nút lên/xuống của chuyến chưa chạy là một lệnh riêng, còn Nền tảng dùng lại lệnh "Sửa chuyến" có sẵn. Hai cách đầu đều phải ghi một quyết định mới sửa chữ ngày 3/10; bạn chọn cách nào?
- Phương án 1, nhãn `Giữ cách đang làm (Recommended)`. Mô tả: Được: không chuyến nào kẹt vì thứ tự, không phải làm thêm gì, và chuyến chưa chạy vẫn không xuất bến được khi còn chỗ sai; mất: chuyến đang chạy mà sai từ trước chỉ bị phát hiện qua lượt kiểm tra định kỳ chứ không bị chặn, và hai điều mới đọc mã chưa chạy thử là tài xế đã được xếp sẽ nhận một tin "chuyến vừa sửa" sau mỗi lần bấm, còn một lần bấm có thể bị từ chối vì lỗi khác của chuyến như trùng giờ hay giấy tờ tài xế.
- Phương án 2, nhãn `Lệnh riêng cho nút`. Mô tả: Được: vẫn sửa dần được, nhật ký ghi đúng "đổi thứ tự" và nút không vướng lỗi khác của chuyến; mất: phải làm thêm một lệnh mới cùng các bài kiểm, và chỗ thứ nhất vẫn cần quyết định mới sửa chữ.
- Phương án 3, nhãn `Sửa theo đúng chữ`. Mô tả: Được: Nền tảng khớp từng chữ quyết định 3/10 và không cần quyết định mới; mất: chuyến nào mà một lần bấm không sửa hết chỗ sai sẽ kẹt, kể cả chuyến chỉ có một chỗ sai khi điểm đón và điểm trả của khách đó không đứng cạnh nhau, nên phải làm thêm nút "Sắp lại tự động" hoặc kéo-thả trên màn hình và một lệnh riêng cho nút lên/xuống.

**Câu 3**

Khuyến nghị: **bỏ câu này khỏi hộp**. Phương án khuyến nghị không đổi gì so với quyết định 8/10, nên theo luật "đừng hỏi câu chủ nên đồng ý", điều phối ghi sổ "G8 đóng: tiền đề sai; giữ ADR-0104 Đ2.4; đường thân cũ mất khi cắt máy cũ (ADR-0047 §6)" và báo chủ một dòng. Chỉ hỏi nếu chủ chạy lệnh đếm và thấy số dòng `client_outdated_body` loại `sua_chuyen` gần đây còn đáng kể. Lệnh đó là đọc D1 remote, AI không được tự chạy. Nếu vẫn hỏi, dùng nguyên văn sau:

- Tiêu đề: `Sửa chuyến`
- Câu hỏi: Trên máy chưa cập nhật bản mới, bảng "Sửa thông tin chuyến" của đơn vẫn bỏ được chặng đón (xoá cả giờ lẫn nơi đón), kể cả khi khách đã được xếp lên xe; bản mới không còn làm việc này mà dùng nút "Bỏ chặng". Bỏ chặng theo đường cũ thì ghế trên xe chưa được trả, chuyến bị giữ với lý do "có chặng đã bỏ còn khách" cho tới khi người xếp xe gỡ tay, trong khi nút "Bỏ chặng" sẽ tự trả ghế sau đợt "Đồng bộ chuyến theo đơn" bạn duyệt ngày 8/10. Việc báo tài xế khi đổi ngày đi qua bảng này sẽ được sửa theo quyết định về tin báo ngày 30/9, bạn không cần chọn. Bạn muốn xử lý đường cũ này thế nào?
- Phương án 1, nhãn `Giữ như đã duyệt (Recommended)`. Mô tả: Được: không sửa quyết định 8/10 và không làm thêm việc cho một đường sẽ mất khi Nền tảng ngừng nhận bản cũ; mất: trong lúc còn người dùng bản cũ, chặng bỏ theo đường này để ghế lại trên xe tới khi người xếp xe gỡ tay.
- Phương án 2, nhãn `Tự trả ghế`. Mô tả: Được: bỏ chặng bằng đường nào cũng trả ghế như nhau; mất: phải sửa quyết định 8/10 (đưa bảng này vào nhóm tự trả ghế), thêm việc và bài kiểm cho một đường sắp bỏ, và phải quyết trước khi đợt Đồng bộ chuyến viết phần cơ sở dữ liệu.

---

## 5. Điều chưa kiểm được (gộp ba góc và phần tổng hợp)

**Bản chạy thật.** Không ai chạm D1 remote, nên chưa biết:
- có bao nhiêu đơn tổng âm;
- có đơn đã giao nào nằm ngoài giả định "mốc Đã giao ra đời cùng Sổ tiền lượt 1";
- còn bao nhiêu thân cũ `sua_chuyen` (số này quyết định câu 3);
- có chặng đã xếp nào từng bị đóng qua `PUT /trip`;
- có chuyến đang chạy nào còn đảo (`R-VC-THU-TU` sau khi áp `0084`).

**Chưa chạy.**
- e2e: việc CA 3 của `sua-so-khach.mjs` đỏ sau (a) mới suy từ số đang khoá.
- typecheck trên bản sao (a): chưa thử cách thêm trường giảm giá hiệu lực vào DTO hay đổi chữ ký `canhBaoTongAm`.
- Toàn bộ `npm test` trên cây thật. Bộ 3602 bài chỉ chạy trên bản sao đã đột biến (đỏ đúng hai bài TC8; bài `.gitattributes` đỏ do bản sao không có `.git`).

**Chỉ đọc mã, chưa chạy đầu-cuối.**
- Gõ cửa màn hình khoá (`doiVuaGhi` LIMIT 1).
- Tin "chuyến vừa sửa" gửi tài xế sau mỗi lần ↑ ↓.
- Ca ↑ ↓ trên chuyến đang vướng lỗi khác.
- Đường thêm điểm khi xe chạy (chỉ thấy chỗ gọi `sapLaiDiem` ở `:302`).

**Chưa đọc kỹ hoặc chưa dựng.**
- `validateTripUpdate` với ca dời ngày vào quá khứ khi chuyến đã chạy.
- Khuôn `detail` của dòng `order_leg_updated` mới chưa dựng ca thật. Nhánh dự phòng trả `gioHen = true` khi lệch khuôn, nên khuôn sai không chặn tin, nhưng vẫn phải đúng khuôn.

**Chỉ kiểm được ở mức chữ ADR.** ADR-0079 và ADR-0081 chưa thi công.

**Không có trong kho.** V-3, V-5 của phiếu kiểm A2. Việc `huong-dan-ke-toan.ts:86` là một trong hai chỗ đó mới là phỏng đoán.

**Giao diện.** Chưa xem ảnh câu cảnh báo đặt cạnh nút "Ghi hoàn cho khách". Chưa thử hộp hỏi thật nên chưa biết giới hạn độ dài mô tả.

**Số ADR tạm.** Chỉ kiểm nhánh cục bộ, `origin/main` và các worktree trên máy, chưa `fetch`. README nhánh QR ghi "kế tiếp là 0103".

**Phần tổng hợp.** Tôi không chạy bài kiểm nào và không sửa tệp nào. Tôi tự mở lại các chỗ mà ba góc nói khác nhau:
- `trip-form.ts:111-120`, `chang-dua-don.ts:325-345`, `than-cu.ts:1-20`, `orders/index.ts:866-904`;
- `tien-do-man.ts:90-125`, `thu-tu-diem.ts:20-85`, `thongbao/repository.ts:30-45`, `:105-120`, `thongbao/index.ts:60-95`, `web-push.ts:70-95`;
- `tin-doi-don.ts:40-70`, `:230-340`, `tin-chuyen.ts:5-20`, `:55-92`, `dieu-phoi.ts:195-206`, `dieu-phoi-lenh.ts` (dòng gọi `sapLaiDiem`, `:618-626`);
- `ADR-0052:140-175`, `:195`, `ADR-0096:59`, `ADR-0104:145-150`, `ADR-0063:1-10`, `ADR-0079:98`;
- `CLAUDE.md:34`, `docs/quyen-hoan.json` (TNV-G1, TNV-G3), `git ls-tree main migrations/`;
- `huong-dan-ke-toan.ts:86`, `tests/e2e/sua-so-khach.mjs:78-90`, `receipt/rules.ts:26-33`, `SYSTEM-DESIGN.md:1280-1284`.

Trong lúc kiểm, cây làm việc xuất hiện một tệp chưa theo dõi `docs/adr/ADR-0106-moc-chup-khoang-nghi.md`. Tệp này không do tôi tạo, có lẽ là một phiên khác đang chép lượt 8b. Điều phối nên xác nhận nó thuộc việc nào.