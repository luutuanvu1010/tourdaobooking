# ADR-0106 — Mốc chụp khoảng nghỉ của chuyến xe

- **Trạng thái:** **accepted** 2026-10-08 — chủ dự án trả lời câu 3 của hộp hỏi lượt duyệt 8b, chọn **"Duyệt đúng như mã đang làm (Recommended)"**; nguyên văn câu hỏi và phương án ở mục "Lời chủ dự án". Ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, mục "Lượt duyệt 8b" (nhánh `claude/van-chuyen-goi-a-c` @ `19de847a`). "Mã đang làm" ở đây là mã @ `19de847a`, mô tả ở mục "Bối cảnh mã". AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-10-08.
- **Văn bản trình duyệt:** `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/04-moc-chup-khoang-nghi.md`; trang ghép `docs/superpowers/specs/2026-10-08-luot-duyet-van-chuyen/00-trang-ghep.md` (hai hồ sơ có ngày, đóng băng).
- **Sửa:** ADR-0049 D2 "Khoảng nghỉ" (`:171`, câu "Chụp vào …"). Chốt chỗ tự mâu thuẫn của đặc tả `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md` (`:159`, `:1327` "lúc tạo chuyến" ↔ `:373` "tạo/sửa chuyến, gán tài xế"): theo `:373`.
- **Mốc đo mã:** mọi `tệp:dòng` đo lại trên `claude/van-chuyen-goi-a-c` @ `19de847a` (văn bản trình duyệt đo @ `809918d5`; chỗ lệch ở mục cuối).
- **Xây trên lỗ đang hở:** không.
- **Cửa:** hai chiều (luật ở mã, không đổi dữ liệu cũ); không migration.

## Lời chủ dự án

- Lượt duyệt 8b, câu 3 (2026-10-08). Nguyên văn câu hỏi:

  > Lượt 8b, câu 3 — Bạn có duyệt quy tắc chép khoảng nghỉ vào chuyến không? Máy chép số phút nghỉ tối thiểu của tài xế vào chuyến lúc tạo, và chép lại khi sửa chuyến đổi giờ bắt đầu, giờ kết thúc, xe hoặc tài xế; các kiểu sửa khác giữ số cũ. Mã đang chạy đúng như vậy, chỉ thiếu quyết định ghi thành văn.

  - Chủ chọn: **"Duyệt đúng như mã đang làm (Recommended)"** — "Ghi thành quyết định chính thức; không đổi gì trong mã."
  - Không chọn: "Chỉ chép lúc tạo chuyến" — "Sửa chuyến không chép lại số nghỉ mới; phải gỡ bản sửa lỗi gần đây, chuyến sửa giờ có thể giữ số nghỉ cũ đã lỗi thời."
- Câu duyệt gợi ý của tệp 04: *"Duyệt ADR-0106: khoảng nghỉ chép vào chuyến lúc tạo, và chép lại khi sửa chuyến đổi giờ bắt đầu, giờ kết thúc, xe hoặc đổi sang tài xế khác; các lệnh sửa khác giữ số cũ."*

## Bối cảnh

- **Luật:** Hiến chương 5.6 (`docs/ARCHITECTURE.md:101`): chính sách được chụp vào đối tượng "tại **một mốc cố định do ADR của nghiệp vụ đó quy định**"; đổi mốc đã ghi trong ADR đã duyệt phải bằng ADR mới. ADR-0049 `:171` chỉ ghi "Chụp vào `vc_trip.rest_minutes_snapshot`", không ghi mốc.
- **Đặc tả 2026-09-29 tự mâu thuẫn:** `:159` "chụp lúc tạo chuyến" và bảng 5.6 ở `:1327` "lúc tạo chuyến (khoảng nghỉ)", trong khi dòng CH-02 `:373` ghi "tạo/sửa chuyến, gán tài xế; chụp vào `vc_trip.rest_minutes_snapshot`". Mã theo `:373` (sổ thi công, mục "Nợ / để sau").
- **Nguồn việc:** báo cáo đánh giá ERP 2026-10-07 (N3); thi công `8a9e8d73`, bài thêm `c8cb9248`; kiểm độc lập vòng 1 ĐẠT CÓ ĐIỀU KIỆN, vòng 2 ĐẠT phần bài giữ (sổ thi công, bảng Giai đoạn 1, dòng N3).

## Bối cảnh mã (đo @ `19de847a`)

| Điểm | Hiện trạng | Nguồn |
|---|---|---|
| Lệnh tạo chuyến | chụp `rest_minutes` của chính sách hiện hành; không có dòng chính sách thì `0` | `src/modules/van-chuyen/index.ts:1170` (`nghiChup: chung.chinhSach?.rest_minutes ?? 0`); ghi qua `loTaoChuyen` `src/modules/van-chuyen/dieu-phoi.ts:168` → `TRIP_INSERT` `src/modules/van-chuyen/chuyen-repo.ts:320-323` |
| "Chính sách hiện hành" | dòng `vc_dispatch_policy` đang hiệu lực ở giờ máy chủ lúc lệnh chạy (không phải giờ của chuyến) | `docChung` → `chinhSachHienHanh` `src/modules/van-chuyen/repository.ts:271` |
| Lệnh sửa chuyến (`PUT /chuyen/:id`) | `doiXe` `:112`; `doiGio`, `doiKetThuc`, `doiTaiXe` `:127-129`; `nghiChup` `:133` = chính sách hiện hành khi `doiGio ‖ doiKetThuc ‖ doiXe ‖ doiTaiXe`, ngược lại giữ `rest_minutes_snapshot`; không có dòng chính sách thì giữ số cũ | `src/modules/van-chuyen/dieu-phoi-lenh.ts` |
| Kiểm lúc sửa | luật khoảng nghỉ xét theo **đúng số sẽ ghi** (`restMinutes: nghiChup`) | `src/modules/van-chuyen/dieu-phoi-lenh.ts:139` |
| Ghi | `loSuaChuyen` → `TRIP_UPDATE_PLAN` (`rest_minutes_snapshot = ?14`) | `src/modules/van-chuyen/dieu-phoi.ts:211`; `src/modules/van-chuyen/chuyen-repo.ts:371-375` |
| Đổi tài xế | thân `taiXePartyId: null` → 400 "Chọn tài xế."; vắng → giữ tài xế cũ; lệnh tạo bắt buộc có tài xế | `src/modules/van-chuyen/dieu-phoi-than.ts:73`, `:41`; `dieu-phoi-lenh.ts:87` |
| Xuất bến | đọc số đã chụp; ghi số đã dùng vào bản chụp xuất bến (`rest_minutes_used`) | `src/modules/van-chuyen/dieu-phoi-doc.ts:86`; `src/shared/dieu-phoi-kiem.ts:501, :511`; `src/modules/van-chuyen/dieu-phoi-tien-do.ts:116` |
| Đường ghi khác | không có: `rest_minutes_snapshot` chỉ được ghi ở `TRIP_INSERT` và `TRIP_UPDATE_PLAN` | tìm trong `src/` (trừ bài kiểm) @ `19de847a` |
| Bài kiểm | `src/modules/van-chuyen/nghi-chup-lai.test.ts`: hạ khoảng nghỉ rồi dời B ⇒ chụp số mới và xuất bến được `:50`; nâng khoảng nghỉ ⇒ dời bị chặn theo số mới, chỉ đổi giờ kết thúc cũng chụp lại `:71` (vế giờ kết thúc `:84-89`); lệnh không đổi giờ / xe / tài xế giữ số, lý do phá lệ giữ nguyên khi dời sau đó `:95`; kiểm lúc sửa theo số sẽ ghi `:119`; chỉ đổi xe `:149`; chỉ đổi tài xế `:166`; chỉ đổi giờ bắt đầu `:183` | — |
| Sổ hàng rào | dòng "Chụp lại khoảng nghỉ khi sửa chuyến, từng vế": đã quan sát đỏ khi bỏ riêng `doiXe`, `doiTaiXe`, `doiGio`; cột cuối ghi "Mốc chụp CHỜ CHỦ XÁC NHẬN" | `docs/SO-HANG-RAO.md:423` |

## Quyết định

1. **Mốc chụp khoảng nghỉ của chuyến** (`vc_trip.rest_minutes_snapshot`, Hiến chương 5.6):
   - **lúc tạo chuyến:** khoảng nghỉ của chính sách hiện hành;
   - **chụp lại** khi lệnh sửa chuyến đổi ít nhất một trong: giờ bắt đầu, giờ kết thúc, xe, hoặc đặt một tài xế khác tài xế đang lái;
   - **mọi lệnh khác giữ số đã chụp**, gồm: lệnh sửa chuyến chỉ đổi tuyến, thứ tự điểm, giờ xe tới điểm, hoặc chỉ gửi phá lệ khoảng nghỉ / cam kết; mọi lệnh khách (xếp, rút, dời, thêm khách khi xe chạy, cập nhật khách theo đơn, kể cả lệnh khách lớp "Điều chỉnh khẩn cấp" và "Đồng bộ chuyến theo đơn" của ADR-0104); lệnh tiến độ; lệnh điều chỉnh có lý do (ADR-0097).
2. **"Chính sách hiện hành"** = dòng `vc_dispatch_policy` đang hiệu lực ở giờ máy chủ lúc lệnh chạy, như lệnh tạo đọc.
3. **Lý do phá lệ khoảng nghỉ** (`rest_override_reason_code`) không đổi theo lần chụp lại.
4. **Một con số cho kiểm và ghi:** lệnh sửa kiểm khoảng nghỉ theo đúng số sẽ ghi; cổng xuất bến đọc số đã chụp và ghi số đã dùng vào bản chụp xuất bến. Cổng xuất bến không đổi.
5. **Không đổi:** con số `rest_minutes`; ai được vượt khoảng nghỉ (ADR-0049 `:171` đã được ADR-0104 Đ1 thay: chuyến dưới mốc Bán hàng, Quản trị, Toàn quyền; ngoài mốc Quản trị, Toàn quyền); khoảng nghỉ lúc xuất bến tính bằng giờ xảy ra (ADR-0050 `:261`).

## Hệ quả và rủi ro

- Đổi chính sách khoảng nghỉ sau khi chuyến đã tạo không đổi chuyến đó, **trừ khi** người xếp xe sửa giờ, xe hoặc tài xế của chuyến; khi đó chuyến nhận số mới và có thể bị chặn theo số mới (bài `:71`).
- Ghép với ADR-0104 Đ1: lệnh sửa chuyến **chỉ đổi giờ** kèm vượt khoảng nghỉ (ca 3 ở ADR-0104 Đ1 mục 5) chụp lại số mới rồi mới xét vượt; lệnh khách lớp khẩn cấp không chụp lại.
- **Chỗ lệch nhỏ đã biết, không thuộc quyết định này:** khi bảng chính sách không có dòng nào, lệnh tạo chụp `0` (`index.ts:1170`) còn lệnh sửa giữ số cũ (`dieu-phoi-lenh.ts:133`). Thực tế không xảy ra vì bảng có dòng gieo ngày 2026-09-01 và chỉ thêm (sổ thi công, kiểm độc lập A1). Đồng nhất cách xử lý (ví dụ chặn khi thiếu chính sách như mốc tối thiểu) là việc riêng.
- **Ngoài phạm vi (đã ghi nợ ở sổ thi công, mục "Nợ / để sau"):**
  - dời chuyến A sát chuyến B thì B không chụp lại — thuộc B4, cần ADR riêng;
  - nhật ký sửa chuyến không ghi số nghỉ cũ → mới khi chụp lại (truy vết qua `policy_id` của sự kiện).
- Nợ liên quan, không phải câu hỏi cho chủ: khung đọc chuyến lân cận `tripsTouching(batDau − 1 ngày, ketThuc + 1 ngày)` theo giờ kế hoạch, trong khi luật nghỉ so giờ thật — mã lệch luật đã duyệt, sửa mã riêng (sổ thi công, mục "Kiểm cuối Giai đoạn 2").

## Câu ADR bị thay / bổ sung (không sửa tệp ADR cũ)

Dòng trỏ ở dòng Trạng thái của ADR-0049: `dong-tro-adr-cu-8b.md` cùng thư mục.

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0049 `:171` (Khoảng nghỉ), câu thứ hai | "Chụp vào `vc_trip.rest_minutes_snapshot`." | "Chụp vào `vc_trip.rest_minutes_snapshot` lúc tạo chuyến; chụp lại khi lệnh sửa chuyến đổi giờ bắt đầu, giờ kết thúc, xe hoặc đổi sang tài xế khác; lệnh khác giữ số đã chụp. Lý do phá lệ (`rest_override_reason_code`) không đổi theo lần chụp lại (ADR-0106)." |

Các câu còn lại của ADR-0049 `:171` đã có câu thay ở ADR khác và đọc cùng câu trên: câu "Xuất bến thì kiểm lại từ giờ kết thúc thật …" — ADR-0050 `:261` (giờ xảy ra); câu "Chỉ Quản trị, Toàn quyền phá lệ …" — ADR-0104 (bảng "Câu ADR bị thay", dòng ADR-0049 `:171`). Đặc tả 2026-09-29 là hồ sơ có ngày, không sửa; `:159` và `:1327` đọc theo ADR này.

## Bài kiểm / hàng rào

- Bài hiện có `src/modules/van-chuyen/nghi-chup-lai.test.ts` (bảy bài ở mục "Bối cảnh mã") là rào của quyết định này. Sổ hàng rào `docs/SO-HANG-RAO.md:423` đã có dòng; đã quan sát chặn thật ba vế (`doiXe`, `doiTaiXe`, `doiGio`).
- Vế `doiKetThuc` có bài (`:84-89`) nhưng sổ hàng rào chưa ghi lần quan sát đỏ riêng cho vế này: người thi công sau quan sát và ghi (bỏ riêng `doiKetThuc` → đỏ → hoàn nguyên).
- Sau khi chép: điều phối sửa cột cuối của `docs/SO-HANG-RAO.md:423` từ "Mốc chụp CHỜ CHỦ XÁC NHẬN" thành trỏ ADR-0106 (tài liệu sống).

## Phương án bị loại

- **Chỉ chụp lúc tạo** (đặc tả `:159`): chuyến dời giờ sau khi chính sách đổi vẫn kiểm theo số cũ — trái mục đích của chính sách mới (bài `:50` là ca ngược của báo cáo ERP C21).
- **Chụp lại ở mọi lệnh sửa:** đổi tuyến hay sửa giờ xe tới điểm cũng làm chuyến nhận số mới và có thể bị chặn bất ngờ (bài `:119`).
- **Không chụp, luôn đọc chính sách hiện hành:** trái Hiến chương 5.6.

## Sổ dừng dây chuyền

Không mục HIGH nào của `docs/quyen-hoan.json` thuộc vùng chuyến xe hay chính sách điều phối. Không xây trên lỗ đang hở.

## Chỗ văn bản trình duyệt lệch mã HEAD (đo @ `19de847a`)

- `dieu-phoi-lenh.ts`: tệp 04 ghi `nghiChup` ở `:123-129`, `doiXe` `:108`, `doiTaiXe` `:125`; nay `doiXe` `:112`, `doiGio`/`doiKetThuc`/`doiTaiXe` `:127-129`, `nghiChup` `:133` (dòng dời do gói A1 đã gộp).
- Tệp 04 ghi "Lệnh tạo chụp lúc tạo (`chuyen-repo.ts:323`)": đó là câu `INSERT`; chỗ quyết con số là `index.ts:1170`.
- Tệp 04 không nêu khác biệt `?? 0` (tạo) ↔ `?? số cũ` (sửa) khi thiếu chính sách — ghi ở mục "Hệ quả".

## Chưa kiểm

- Điều kiện của phiếu kiểm độc lập vòng 1 cho N3: người soạn chỉ đọc tóm tắt ở sổ thi công (vòng 2 ĐẠT phần bài giữ), chưa đọc phiếu gốc.
- Vế `doiKetThuc`: chưa ai ghi lần quan sát đỏ riêng.
- Production có chuyến nào đã chụp số khác chính sách hiện hành không (chưa chạy lệnh chỉ-đọc).
