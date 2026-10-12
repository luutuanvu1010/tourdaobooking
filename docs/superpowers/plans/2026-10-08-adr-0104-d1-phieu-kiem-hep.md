# Phiếu kiểm hẹp lượt sửa Đ1, bản tổng hợp

Nhánh `adr-0104-d1`, đoạn `df99a773..45731dea` (HEAD `45731dea3c8f5b613be26cd8ef4531b8702610a4`). Hai góc kiểm chỉ đọc: **tin** (hộp thông báo, tin cho tài xế) và **nhan-bai** (nhãn, bài ghim, sổ hàng rào). Ngày 2026-10-08.

## 1. Kết luận: GỘP ĐƯỢC SAU KHI SỬA

Mã máy chủ của lượt sửa đúng ở mọi chỗ hai người kiểm đã chạy:
- CAO-1 không đổi kết quả cho phép hay chặn nào.
- Tài xế chuyến nguồn nhận tin đúng, không thừa không thiếu, trừ một ca hẹp nêu ở CAO-C.
- Hồi quy hộp tin sau Đ1 có thật: ở `df99a773`, 3001 dòng xếp mới hơn làm mất tin huỷ chuyến. Ở `45731dea` lỗi này đã sửa đúng, hộp đọc y như trước Đ1.
- Không có chỗ nới kỳ vọng nào làm yếu hàng rào mà không được nêu tên.

Chưa gộp được vì hai lời khai trong sổ hàng rào sai hoặc rộng hơn điều đã có bài giữ (CAO-A, CAO-B). Sửa cả hai chỉ cần thêm bài và sửa chữ, không đổi mã sản phẩm. CAO-C là chỗ mã lệch chữ ADR-0104 (đã duyệt). Chủ phải quyết trước khi **phát hành**, nhưng việc này **không chặn gộp**. Điều kiện là ghi nó vào danh sách "Chặn PHÁT HÀNH" của sổ thi công, để gộp xong không bị quên.

Nhắc lại: e2e đủ bộ và `audit-invariants` do điều phối chạy riêng, không thuộc phiếu này. Sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md:125` ghi điều phối đã chạy trên `45731dea`: 52/53, `phien` chạy riêng 4/4. Phiếu này không kiểm lại con số đó.

## 2. CHẶN, CAO

**Không có mục CHẶN.**

### CAO-A (góc nhan-bai): lời khai "đột biến tương đương" C0f/C0g là SAI

**Vị trí:**
- `docs/SO-HANG-RAO.md:450`, phần đuôi "Chi tiết cuốc và 'Cuốc của tôi' (C0f / C0g): KHÔNG bài nào bắt được — đột biến tương đương … kết quả như nhau".
- Chú thích bài `src/modules/van-chuyen/nghi-cua-so-rong.test.ts:99-101`.
- Mã liên quan: `src/modules/van-chuyen/dieu-phoi-route.ts:434` (chi tiết cuốc) và `:463` ("Cuốc của tôi").

**Vì sao sai:** câu `trips_touching` (`src/modules/van-chuyen/chuyen-repo.ts:57-63`) có vế `t.planned_start_ms < ?2`. Vế này loại chuyến C được lên kế hoạch sau chuyến B hơn 24 giờ, kể cả khi C chạy sớm trong cửa sổ xuất bến và vừa kết thúc thật vài phút trước. Chỉ `trips_ended_between` đọc được chuyến này. Tôi đã đọc lại câu SQL và xác nhận vế đó có thật. Lập luận "cách hơn 24 giờ" của người thi công chỉ xét chiều chuyến kết thúc trước giờ khởi hành dự kiến trừ 1 ngày.

**Ca thật:** cửa sổ xuất bến lớn hơn 24 giờ (tối đa 2880 phút; bài của nhánh dùng 48 giờ). Màn tài xế báo "Đủ điều kiện", còn máy chủ trả 409 `NGHI_THIEU`. Không có lỗ an toàn vì máy chủ vẫn chặn.

**Mức CAO** vì sổ đang khai sai sự thật về một hàng rào. Điều này khác `:457` (THẤP-1 ở mục 3): `:457` tả đúng mã, chỉ có phần chưa có bài giữ.

**Sửa (người thi công):**
1. Thêm bài thứ năm vào `src/modules/van-chuyen/nghi-cua-so-rong.test.ts`, theo phép thử `probe-c0fg.test.ts`:
   - Cửa sổ 48 giờ.
   - B: tài xế DRIVER, ngày NGAY, 10:00–11:00.
   - C: cùng tài xế, xe khác, ngày NGAY_SAU, 12:00–13:00. C xuất bến 08:00 (200), kết thúc 09:50 (200).
   - Đọc lúc 09:55: cả chi tiết cuốc lẫn "Cuốc của tôi" phải có `NGHI_THIEU`. Xuất bến B lúc 10:00 phải ra 409 `["NGHI_THIEU"]`.
2. Quan sát đỏ hai lần:
   - C0f: bỏ `bayGioMs` ở `:434`, phải đỏ ở chi tiết cuốc.
   - C0g: bỏ đối số ở `:463`, phải đỏ ở "Cuốc của tôi".
3. Ghi ngày quan sát vào `:450`. Gỡ câu "đột biến tương đương" ở `:450` và ở chú thích `:99-101`.
4. Nếu không thêm bài thì `:450` phải ghi đúng: "chưa có bài; ca phản ví dụ: chuyến lên kế hoạch sau B hơn 24 giờ chạy sớm trong cửa sổ > 24 giờ".

Mã phép thử (thư mục tạm, nên chép sớm): `/private/tmp/claude-501/-Users-tuanbao-Documents-Projects-ctytnhhtourdao-tourdao-sales--claude-worktrees-tourdaobooking-erp-assessment-34c6a7/a13ec2b1-8084-4c3f-8239-30cb86b1716a/scratchpad/ban-sao-nhan-ghim-so-log/probe-luu/probe-c0fg.test.ts`.

### CAO-B (góc nhan-bai): thứ tự luật trên một lệnh sửa chuyến chưa có bài ghim

**Vị trí:**
- `src/modules/van-chuyen/dieu-phoi-lenh.ts:190`: nhánh `MOC_TOI_THIEU` đứng trước `nghiViPham`.
- `src/modules/van-chuyen/dieu-phoi-lenh.ts:212`: `phaLe: phaLe ?? ck.phaLe`, tức `KHOANG_NGHI` đứng trước `CAM_KET`.
- `docs/SO-HANG-RAO.md:454`.

**Thực trạng:**
- Mã đúng thứ tự ADR-0104 `:85` (`MOC_TOI_THIEU` > `KHOANG_NGHI` > `CAM_KET`).
- Đảo một trong hai chỗ thì cả 56 tệp, 510 bài vẫn xanh.
- Tổ hợp "dưới mốc và vượt nghỉ thật trên cùng một lệnh sửa" chỉ tới được từ CAO-1, nên đây là cạnh mới do chính lượt sửa mở ra.
- Hậu quả nếu sau này có người đảo `:190`: Bán hàng đổi xe dưới mốc kèm vượt nghỉ sẽ mất nhãn "Điều chỉnh khẩn cấp". Sổ `:454` đang khai đúng lỗi này là bị chặn.

**Sửa:**
1. Thêm hai ca vào `src/modules/van-chuyen/nhan-khan-cap.test.ts`:
   - Ca theo `probe-thutu.test.ts`: Bán hàng PUT đổi xe dưới mốc, kèm `phaLe` và `nghiPhaLe`, giờ mới 10:10 sát chuyến trước. Phải ra luật `["MOC_TOI_THIEU"]`, `khanCap: true`.
   - Ca theo `probe-thutu2.test.ts`: Quản trị PUT khi chuyến ngoài mốc, đổi xe 16 chỗ sang 15 chỗ, chặng đòi 16 chỗ, giờ sát chuyến trước cùng xe. Phải ra `["KHOANG_NGHI"]`.
2. Quan sát đỏ bằng hai đột biến: đảo thứ tự ở `:190`, và đổi `:212` thành `ck.phaLe ?? phaLe`. Ghi ngày vào `:454`.
3. Nếu không thêm bài thì ghi vào cột Ghi chú của `:454`: "thứ tự luật trên một lệnh sửa: dựa vào kỷ luật".

Hai tệp phép thử nằm cùng thư mục `probe-luu/` nêu ở CAO-A.

### CAO-C (góc tin): tin cho tài xế bám mã luật `MOC_TOI_THIEU`, không bám lớp `KHAN_CAP`. Chủ quyết trước phát hành, không chặn gộp

**Vị trí:**
- `src/shared/tin-chuyen.ts:95`.
- `src/modules/van-chuyen/chuyen-repo.ts:836-838` (`KHAN_CAP_CHO_TIN` lọc `override_rule_code = 'MOC_TOI_THIEU'`).
- Bài ghim hiện trạng `src/tin-khan-cap.test.ts:159`.

**Chữ ADR-0104 (accepted 2026-10-08):**
- `:95`: "Lệnh khách lớp `KHAN_CAP` (xếp, rút, dời) … → tin tới tài xế đang lái".
- `:232`: dòng thay D6.1, "chỉ chuyến có tài xế".
- `:201`: "tài xế nhận tin" là một lớp bù cho quyền mới của Bán hàng.

**ADR tự mâu thuẫn:** `:95` chỉ định cơ chế lấy cờ "từ cột `override_rule_code` và loại sự kiện". Cơ chế đó không biểu diễn được lớp khi sự kiện chỉ mang `CAM_KET`. Lưu lớp vào sự kiện thì `:90` đã hoãn (cần cột mới và migration). Đây cùng gốc với ca 2 trong bốn ca lệch nhãn đã chấp nhận ở `:85-90` ("xếp chặng đã đặt gấp kèm vượt cam kết"). Nhưng `:85-90` chỉ nói về nhãn, không nói về tin.

**Ca lọt:** Bán hàng xếp hoặc dời chặng đặt gấp vào chuyến dưới mốc, chỉ kèm `camKetPhaLe`. Lệnh trả 200, sự kiện mang `CAM_KET`, tài xế không được báo.
- Xếp: đã ghim ở `:159`.
- Dời: mới chạy bằng bài nháp NHAP-7 trên bản sao (đã xoá), chưa có bài ghim.
- Rút: không dính.

**Hồ sơ ghi nhận:**
- Sổ hàng rào `:455` đã ghi trung thực ("Tin bám mã luật `MOC_TOI_THIEU`, không bám lớp").
- `docs/SYSTEM-DESIGN.md:301` tả đúng mã.
- `docs/SYSTEM-DESIGN.md` §16 chưa có dòng nào cho chỗ lệch này.

**Việc của điều phối:**
1. Thêm mục 9 vào "Chặn PHÁT HÀNH" ở sổ thi công: "ADR-0104 Đ1.6: tin khẩn cấp không tới tài xế khi lệnh lớp `KHAN_CAP` chỉ mang `CAM_KET` — chờ chủ chọn".
2. Đưa vào lần hỏi chủ kế tiếp, gom chung với các câu khác. Theo CLAUDE.md §2 "không tự hoà giải", AI không tự chọn. Ba phương án do người kiểm nêu:
   - (1) Ghi lệch có chủ ý vào `docs/SYSTEM-DESIGN.md` §16 và trình ADR hoặc dòng lịch sử: "tin chỉ theo mốc". Không đổi mã. Cùng cách ADR đã xử lý chỗ lệch nhãn ở `:85-90`.
   - (2) Tin cho xếp/dời khi `override_rule_code IS NOT NULL`. Đổi mã ít, không mất tin, nhưng ồn hơn: Quản trị phá lệ ngoài mốc cũng báo tài xế.
   - (3) Lưu lớp vào sự kiện. Cần cột mới, migration và ADR, vì `:90` đã hoãn việc này.
3. Nên làm cùng lượt sửa CAO-A, CAO-B: thêm bài ghim ca **dời** vào `src/tin-khan-cap.test.ts`, theo NHAP-7:
   - Nguồn 12:30–16:00 (ngoài mốc), đích 11:00–15:00 (dưới mốc), chặng đặt gấp, `min_vehicle_seats = 30`.
   - Bán hàng `POST /doi` chỉ kèm `camKetPhaLe`.
   - Kỳ vọng: 200, luật `["CAM_KET"]`, tài xế đích và tài xế nguồn đều không có tin.

   Có bài này thì chủ chọn phương án nào, bài cũng đổi màu cho thấy.

## 3. THẤP

1. **Sổ `:457` tả rộng hơn điều có bài giữ** (góc tin). Ba đột biến sống qua bộ đầy đủ 3650 bài:
   - K9: trần nhóm cũ ở `src/modules/thongbao/repository.ts:232` đổi từ 3000 xuống 30.
   - K10: `ORDER BY created_at DESC` ở `:237` đổi thành `ASC`, tức hộp giữ 1000 dòng **cũ** nhất của nhóm ba lệnh khách.
   - K5: thêm `|| thayDoiCoTheCoTin(e.thayDoi, true)` ngay sau lời gọi đúng ở `web/thong-bao-ui.ts:240`. Bài quét chuỗi `src/shared/tin-chuyen.test.ts:298-308` chỉ thấy lời gọi đúng còn đó.

   `:457` ghi cơ chế "nhóm cũ … trần 3000; ba lệnh khách … 1000" mà không nói phần nào dựa vào kỷ luật. Cụm "như trước" mà người kiểm trích không có ở `:457` (chỉ có ở `:344`). Trích dẫn đó không chính xác, nhưng nội dung phát hiện vẫn đúng.

   Sửa, nên làm cùng lượt: thêm bài chèn 1001 dòng thường **cũ hơn** một lệnh khẩn cấp thật, rồi khẳng định tin khẩn cấp vẫn còn (chặn K10). Thêm một bài khoá trần 3000 (chặn K9). Hoặc ghi "dựa vào kỷ luật" cho K5, K9, K10 ở `:457`.

2. **Điều kiện chuông `coTheLai` lệch hai chiều** (góc tin). Vị trí: `web/thong-bao-ui.ts:195`, `:240`; `src/shared/tin-chuyen.ts:230-235`; `src/shared/roles.ts:40`, `:133`.
   - Rộng hơn: máy có quyền Tài xế, kể cả tài khoản Bán hàng + Tài xế, vẫn gọi lại `/tom-tat` sau mọi lệnh xếp/rút/dời thường trên chuyến mình lái.
   - Hẹp hơn: tài khoản có dòng lái mà thiếu quyền `DRIVER` (bị bớt tay quyền) thì con số trên chuông chậm tới lần làm mới. Hộp và gõ cửa vẫn tới.

   `:457` đã khai chiều hẹp. Không cần sửa mã ngay. Nếu muốn khít thì lấy đúng điều kiện `coTheNhan` của `hop()` ở `src/modules/thongbao/index.ts`.

3. **Trần 1000 cắn chính tin khẩn cấp** (góc tin). Bài nháp NHAP-1: còn tin khi n=999, mất tin khi n=1000. Không phải hồi quy, vì loại tin này mới có từ Đ1, và `:457` đã khai.

   Hai việc còn lại của CAO-3 phiếu trước chưa làm: lệnh đếm chỉ-đọc số dòng xếp/rút/dời 30 ngày trên D1 thật (để chủ chạy), và ghi rủi ro vào mục "Việc còn treo" của `docs/HANDOFF-N1.md` (diff `df99a773..45731dea` không chạm tệp này). Sổ thi công `:122` giao CAO-3 với câu "không chờ số đếm production", nên đây là **việc trước phát hành**, không phải điều kiện gộp. Thêm vào "Chặn PHÁT HÀNH": nếu số đếm gần 1000 dòng trong 30 ngày thì tách trần hoặc thu hẹp theo người (cần ADR nếu đổi hợp đồng).

4. **Chi phí đọc gần gấp đôi** (góc tin). Mỗi lần mở hộp hoặc gọi `/tom-tat` chạy hai câu đọc `v_aud_trip_event` (`repository.ts:248-253`). Tham số JSON khoảng 39 KB, bind 4 lần (`chuyen-repo.ts:819-824`, `:839-870`). Câu `LAI_CHO_TIN` quét cả bảng `vc_trip_driver`, nhưng đã quét như vậy từ trước Đ1. Ghi nợ: đo `rows_read` và độ trễ `/tom-tat` sau phát hành; nếu cần thì thêm chỉ mục `vc_trip_driver(trip_id)` bằng migration mới.

5. **Người lái cả chuyến nguồn lẫn chuyến đích chỉ nhận MỘT tin** (chuyến đích, "chuyển khách tới"), ở `src/shared/tin-chuyen.ts:127-129`. Đúng thiết kế, có bài giữ. Nên để chủ biết.

6. **Chưa có mục nhật ký thay đổi cho Đ1** (`src/shared/changelog.ts`, bước A.0 của phát hành). Mục 7 của "Chặn PHÁT HÀNH" đã bao việc này.

7. **Mục hỏi-đáp mới trong `src/shared/huong-dan-tai-xe.ts:87-88`** nằm trong nhóm áp cho cả `DRIVER_PARTNER` (`:7`), nhưng tài xế đối tác không bao giờ nhận loại tin này. Sửa: thêm "(tài xế công ty)", hoặc ghi nợ nhỏ.

8. **Số "not ok N" trong cột quan sát của `:454` đã lệch** sau khi chèn bài THẤP-6 (ví dụ NT-4 "lệch đã biết" nay là bài 5). Tên bài vẫn đúng. Không cần sửa vì đây là ảnh chụp có ngày; lần sau ghi bằng tên bài.

9. **Bất đối xứng:** route **tạo** chuyến (`src/modules/van-chuyen/index.ts:1179`) đóng dấu `KHOANG_NGHI` mỗi khi có gửi cờ nghỉ, dù không vi phạm. Route **sửa** (`dieu-phoi-lenh.ts:189`) chỉ đóng dấu khi vi phạm thật. Có từ trước Đ1. Ghi nợ, xét lại khi có ADR lưu lớp vào sự kiện.

## 4. Hàng rào người kiểm tự quan sát chặn thật (2026-10-08, người kiểm, đã hoàn nguyên)

Ghi vào cột "Đã thấy chặn thật" theo **tên bài**, không theo số "not ok N", vì số thứ tự phụ thuộc tập tệp của mỗi lần chạy.

| Dòng sổ | Đột biến | Bài đỏ (tên) | Góc |
|---|---|---|---|
| `:450` | C0a: bỏ `'ENDED_INTERRUPTED'` khỏi `trips_ended_between` (`chuyen-repo.ts`) | "CAO-4 (C0a): chuyến A cùng tài xế KẾT THÚC GIỮA CHỪNG …" (3/4 xanh, hoàn nguyên 4/4) | nhan-bai |
| `:450` | C0b: bỏ `NGHI_TOI_DA_PHUT` khỏi `LUI_KET_THUC_THAT_MS` (`dieu-phoi-doc.ts:153`) | "CAO-4 (C0b): A kết thúc thật 06:50 — NGOÀI cửa sổ 48 giờ của B …" | nhan-bai |
| `:453` | M13 (bỏ cổng ở rút), M14 (bỏ `if (cam) return cam;` ở huỷ), M15 (bỏ cổng ở thêm khi chạy), V1c (bỏ cờ cam kết ở thêm khi chạy), biến thể `if (cam) void cam;` | "Phiếu D1 THẤP-4: mỗi lệnh nhận cờ vượt gọi chanCoVuot …" (`lop-vuot.test.ts`; mỗi lần 57 xanh, 1 đỏ; bài hành vi vẫn xanh như sổ khai) | nhan-bai |
| `:453` | ORD: cổng cờ vượt đặt trước 409 trạng thái ở `lenhXepLo` | "Phiếu D1 THẤP-3 …" | nhan-bai |
| `:453` | Bỏ nhánh lệnh lặp ở route xếp | "Phiếu D1 THẤP-2 …" | nhan-bai |
| `:453` | M16: bỏ `can(staff, "trip.dispatch")` ở route huỷ chuyến | "NT-1: Kế toán (không có ô xếp xe) → 403 …" | nhan-bai |
| `:453` | V1b: thêm khi chạy dùng `dangChay: false` | "Phiếu D1 THẤP-5 (N4) …" (kèm "Đợt 7 (THEM_KHI_CHAY …)") | nhan-bai |
| `:454` | M-A: `nghiViPham = false` (`dieu-phoi-lenh.ts:189`) | "NT-4 lệch đã biết ADR-0104 Đ1.5 (bốn ca) …" và "Phiếu D1 CAO-1 … Quản trị sửa chuyến NGOÀI mốc …" (trên 510 bài chỉ 2 đỏ) | nhan-bai |
| `:454` | M-B: `nghiViPham = b.nghiPhaLe !== null` | "Phiếu D1 CAO-1: sửa chuyến gửi nghiPhaLe mà KHÔNG vi phạm …" (trên 510 bài chỉ 1 đỏ) | nhan-bai |
| `:454` | M-D: dùng `kq.canPhaLe` (kiểm nghỉ có tính cờ) | Hai bài như M-A | nhan-bai |
| `:454` | T6: bỏ vế `e.related_trip_id === t.id` (`dieu-phoi-dto.ts`) | "Phiếu D1 THẤP-6 (ADR-0104 Đ1 mục 5, GA-35) …" (xác nhận lời khai của người thi công) | tin |
| `:454` | Ba đột biến chữ THẤP-11: câu 400 cũ ở lệnh, câu 400 cũ ở tạo chuyến, đầu dòng nhật ký lặp tên luật | "NT-1 …" (kèm "Phiếu D1 THẤP-3"); "NT-1 … khoảng nghỉ — tạo chuyến …"; "NT-4 lệch đã biết …" | nhan-bai |
| `:455` | K1: bỏ vế `can(n,'trip.view',{assigned:true})` khỏi `tinNguonCho`; K2: bỏ `d.actorId === n.id`; K3: gọi `tinNguonCho` trước `loaiCho`; K4: thay `laiLucSuKien` bằng `g.lai.some(...)` | Đều đỏ "CAO-2: dời khẩn cấp — tài xế đang lái chuyến NGUỒN …" (`src/shared/tin-chuyen.test.ts:324`). Lưu ý cho sổ: **chỉ bài thuần này chặn**, các bài máy chủ không chặn | tin |
| `:457` | K6: `THAY_DOI_CHI_TAI_XE` chỉ gồm xep, rut (thiếu doi) | "CAO-3: thayDoiCoTheCoTin — tập CỤ THỂ …" | tin |
| `:457` | K7: `HANH_DONG_TIN_THUONG` bỏ `trip_departure_revoked`; K8: bỏ `trip_passenger_no_show` | K7: "ADR-0097 Đ3 (HT-03): thu hồi xuất bến …"; K8: "kết thúc giữa chừng … khách vắng → người lập nhận" | tin |
| `:457` | (i) nhóm cũ đọc luôn ba lệnh khách, gộp một trần; (ii) gõ cửa vô điều kiện; (iii) chuông truyền hằng `true` | (i) "Phiếu D1 CAO-3 (a) …" (cộng NT-11 tin trùng); (ii) "CAO-3: dongCoTheSinhTin …"; (iii) "CAO-3: thayDoiCoTheCoTin — tập CỤ THỂ …" | nhan-bai |

**Đột biến tương đương, không phải quan sát chặn** (ghi để sổ khỏi bị hiểu nhầm):
- M-C, bỏ vế `b.nghiPhaLe !== null`: tương đương thật, vì `phaLeCua(..., null)` trả null.
- XB2, `lyDoLuc(lai.lyDo)` → `lai.lyDo` ở `dieu-phoi-tien-do.ts`: chấp nhận là tương đương, nên câu ở `:456` đứng được.

**Đột biến sống sót, KHÔNG tương đương** (đã chuyển thành phát hiện ở mục 2 và 3, không ghi vào cột quan sát):
- C0f, C0g → CAO-A.
- Đảo thứ tự ở `:190` và `:212` → CAO-B.
- K5, K9, K10 → THẤP-1.

## 5. Bốn câu riêng

**Góc tin (a): có tin nào trước Đ1 có mà nay mất không?** Không mất. Nhóm tin cũ đọc y như trước Đ1: cùng tập 10 hành động, cùng `LIMIT 3000`, hai nhóm tách rời nhau.
- Bằng chứng tập hành động: so ba bản `tin-chuyen.ts` thì `THUONG == trước Đ1: true`, hai nhóm không giao nhau, hợp lại đúng tập mới.
- Bằng chứng hộp: bài nháp SO-2 và SO-3 chạy trên ba mốc cho kết quả còn tin (trước Đ1), mất hết `[]` (`df99a773`), còn tin (`45731dea`).
- Máy không có quyền Tài xế: chuông giống hệt trước Đ1, 0 khác biệt trên 13 loại × 17 hành động.

Hai điểm khác trước Đ1 nhưng không làm mất tin: máy có quyền Tài xế vẫn gọi lại `/tom-tat` sau xếp/rút/dời thường, và mỗi lần mở hộp đọc thêm một câu. Tin khẩn cấp (loại mới) vẫn rơi khỏi hộp khi có từ 1000 dòng xếp/rút/dời mới hơn (THẤP-3).

**Góc tin (b): tài xế chuyến nguồn có nhận tin đúng, không thừa không thiếu?**

Người nhận: chỉ ai có dòng lái mở trên chuyến nguồn lúc sự kiện và qua `can(trip.view, assigned)`. Họ nhận đúng một tin "… (chuyển khách đi) — mở để xem", có liên kết sang chuyến nguồn, và được gõ cửa.

Người không nhận:
- người làm lệnh;
- văn phòng không có dòng lái;
- Đối tác, Thực tập, Tài xế đối tác, dù hồ sơ có dòng lái;
- tài xế đã bị gỡ khỏi chuyến nguồn trước sự kiện;
- mọi người, khi lệnh dời không vượt mốc.

Thông tin phụ:
- Người lái cả hai chuyến chỉ nhận một tin.
- Không thêm hành động, không thêm dòng nhật ký.
- JSON không lộ `khanCapNguon`, `nguon`, `partyId`, tên khách hay SĐT.

Thiếu: dời chặng đặt gấp chỉ kèm `camKetPhaLe` thì không ai được báo (CAO-C). Riêng ca "nguồn ngoài mốc, đích dưới mốc, tài xế nguồn vẫn nhận" mới suy từ mã, chưa chạy.

**Góc nhan-bai (a): CAO-1 có đổi kết quả cho phép hay chặn nào không?** Không. `nghiViPham` được tính sau khi `chan` và cổng cờ vượt đã quyết. Biến này chỉ đi vào ba chỗ: `phaLe` của sự kiện `UPDATED`, `nghiNhatKy` và đuôi nhật ký. Nó gọi lại đúng hàm thuần `kiemTaoSuaChuyen`, chỉ tắt cờ nghỉ, không có luật nghỉ thứ hai.
- Ép `nghiViPham` về `false`: trên 56 tệp, 510 bài chỉ 2 bài nhãn đỏ.
- Ép về `!== null`: chỉ 1 bài nhãn đỏ.
- Không bài kiểm mã trạng thái 200/403/409 nào đổi.

Thứ tự luật đúng trong mã nhưng chưa có bài ghim (CAO-B).

**Góc nhan-bai (b): có chỗ nới kỳ vọng nào không được nêu tên không?** Không có chỗ nới nào làm yếu hàng rào mà không được nêu tên. Một số thay đổi không nêu tên nhưng cũng không nới:
- `haiChuyen` trong `nghi-cua-so-rong.test.ts` được tham số hoá, giá trị mặc định cho đúng hành vi cũ.
- Đổi tên bài trong `dieu-chinh-khan-cap.test.ts`.
- Đổi thông điệp `assert` ở ca 3 của `nhan-khan-cap.test.ts`; vẫn so `false`.
- Sửa chú thích đầu tệp.

Các chỗ nới đã nêu tên khớp với diff. Không có `skip`, `only` hay `todo` mới. Diff của `.claude`, `scripts`, `playbook`, `docs/adr`, `package.json` và `migrations` đều rỗng.

## 6. Lệnh đã chạy (nguyên dòng tổng kết)

**Góc nhan-bai, trong worktree thật `…/agent-ab1511956f3ec7f56`:**
- `npm run typecheck` → thoát 0.
- `npm test` → bước 1: `# tests 3650 / # suites 0 / # pass 3647 / # fail 0 / # cancelled 0 / # skipped 0 / # todo 3`; bước 2: `# tests 1 / # pass 1 / # fail 0`; dòng cuối `── npm test: bước 1 thoát 0, bước 2 thoát 0`. `git status --short` rỗng trước và sau.
- `node --test src/shared/huong-dan.test.ts` → pass 10, fail 0.
- Bản sao riêng `ban-sao-nhan-ghim-so` (`git archive 45731dea`, đã xoá): `nghi-cua-so-rong.test.ts` gốc 4/4; 56 tệp, 510 bài gốc 510/510; module `van-chuyen` 368/368 (XB2). Mọi lần hoàn nguyên đã `diff` với `git show 45731dea:` và giống.

**Góc tin:**
- Worktree thật: `npm run typecheck` thoát 0. `node --test src/shared/tin-chuyen.test.ts src/tin-khan-cap.test.ts src/modules/thongbao/*.test.ts src/hanh-khach-khong-lo-ten.test.ts` → `tests 58 / pass 58 / fail 0 / skipped 0`.
- Bản sao: các tệp trên cộng `src/tien-xe-tin-chuyen.test.ts` → 60/60. `src/architecture.test.ts` cùng `src/sql-registry.test.ts` → 46/46.
- Bộ 33 tệp tin/hộp/thông báo → nền 454/454.
- Toàn bộ bước 1 trên bản sao không có `.git` → `tests 3650 / pass 3646 / fail 1 / todo 3`.

**Đối chiếu số liệu, không mâu thuẫn:** bài đỏ duy nhất của góc tin là bài `.gitattributes … git check-attr`. Bài này đỏ vì bản sao dựng bằng `git archive` không có `.git`, và đỏ giống hệt ở nền lẫn các lần đột biến. 3646 + 1 = 3647, khớp với lần chạy trong worktree thật. Con số có hiệu lực là của worktree thật: 3647 xanh, 0 đỏ.

**Diff:** `git diff --stat df99a773..45731dea -- migrations .claude playbook docs/adr docs/HANDOFF-N1.md` → rỗng.

**Người tổng hợp** (chỉ đọc, không sửa tệp nào):
- `git rev-parse HEAD` → `45731dea…`.
- Đọc ADR-0104 `:75-96`; `docs/SO-HANG-RAO.md:449-457`; `dieu-phoi-lenh.ts:180-215`; `chuyen-repo.ts:50-66`, `:815-840`; `tin-chuyen.ts:88-100`; `tin-khan-cap.test.ts:150-175`; `nghi-cua-so-rong.test.ts:95-103`; sổ thi công `:94-125`; phiếu trước `:73-85`.
- `ls` thư mục `probe-luu/`: có `probe-c0fg.test.ts`, `probe-rong.test.ts`, `probe-thutu.test.ts`, `probe-thutu2.test.ts`.
- Dòng 3 (Trạng thái) của ADR-0104 ở hai worktree đều là "accepted 2026-10-08".

Cả ba người (hai góc kiểm và người tổng hợp) không chạy e2e, `audit-invariants` hay wrangler, không commit, không push. Không người nào trong ba người thi công phần này (N8).

## 7. Chưa kiểm

- e2e đủ bộ và `audit-invariants`: thuộc điều phối. Con số 52/53 (`phien` chạy riêng 4/4) là ghi chép của sổ thi công, phiếu này không kiểm lại.
- Ma trận `docs/CHANGE-GUIDE.md` §3: chưa xem việc sửa ở CAO-A, CAO-B (chỉ thêm bài và sửa sổ) có cần chạy lại e2e không.
- Trình duyệt thật:
  - Chuông và chuỗi sự kiện `chuyen-thay-doi` (Chrome sau `build:web`).
  - Năm trong bảy kịch bản Chrome bị đổi chữ, cùng axe.
  - Web Push thật (khoá VAPID, iPhone).
- D1 thật:
  - số dòng xếp/rút/dời trong 30 ngày;
  - độ trễ `/tom-tat`;
  - kích thước tham số JSON (khoảng 39 KB, bind 4 lần) so với giới hạn của D1;
  - `EXPLAIN` mới chạy trên SQLite cục bộ.
- Ca mới suy từ mã, chưa chạy:
  - "nguồn ngoài mốc, đích dưới mốc, sự kiện mang `MOC_TOI_THIEU`, tài xế nguồn vẫn nhận".
  - Tài khoản có dòng lái nhưng bị bớt tay quyền `DRIVER`, dựng bằng đường quản lý tài khoản thật (hiện mới gieo dữ liệu).
- CAO-A mới thử với cửa sổ 48 giờ. Chưa thử cửa sổ giữa 24 và 48 giờ. Với mặc định 720 phút, mới suy luận là không xảy ra.
- Đột biến của CAO-2 (`nguonTat`, `nguonKhongCo`, `nguonKhongNap`, `laiKhongNap`) chưa có ai chạy lại ngoài K1–K4. THẤP-1 ở mức route (chuỗi 403 → 200 của hai đường vòng) chưa chạy lại.
- Ngày quan sát trong sổ hiện ghi là của "người thi công". Người kiểm chỉ tái hiện được đột biến và câu đỏ, không xác nhận được ngày họ đã làm.
- Ngoài phạm vi hai góc: cổng quyền theo lớp, Đ2, nhóm bài ghim THẤP-1..5 và 8 ngoài các đột biến đã liệt kê ở mục 4.