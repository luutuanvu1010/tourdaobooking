# ADR-0189 — Tài xế không còn thấy khách của chuyến quên bấm «Kết thúc» từ hết ngày hôm sau ngày xuất bến (phát hiện Q-05, phần khoá xem)

- **Trạng thái:** proposed 2026-11-09 — AI soạn theo kế hoạch `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` (chủ duyệt kế hoạch 9/11, Phần V mục 2.2), thuộc **ADR lượt A** (trang ghép `docs/superpowers/specs/2026-11-09-trang-ghep-adr-luot-a.md`). Người kiểm độc lập chỉ đọc kiểm một vòng bản nháp: ĐẠT. Chưa có mã.
- **Số:** 0189 (soát như ADR-0188).
- **Nguồn:** hồ sơ rà soát `docs/superpowers/specs/2026-11-07-ra-soat-truoc-launch-lan-2/` (Q-05, mục cũ E-1: đồng hồ giả, 9 ngày sau tài xế vẫn thấy khách). Lời chủ lượt 1 ngày 8/11, phương án chọn: «ADR khoá + tự kết thúc». Kế hoạch Phần I điều 3, chủ duyệt theo khuyến nghị 9/11: **làm phần khoá xem trước, tách phần tự kết thúc thành quyết định sau**. Dẫn chứng mã đọc lại trên `main` @`fa3fd859a`.
- **Ngày:** 2026-11-09. **Loại:** việc lớn (quyền đọc dữ liệu cá nhân) — người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều (chỉ bớt thấy; đổi một hàm thuần và chữ màn tài xế; không migration, không Cron).
- **Sửa:** ADR-0053 D7.2, vế «chuyến đang `RUNNING` và ngày VN của giờ xuất bến ≥ ngày chạy» (đã được ADR-0096 giữ nguyên nghĩa, ADR-0105 mở rộng cho chuỗi chỉ đường). Không sửa nguyên văn các ADR đó.
- **Xây trên lỗ đang hở:** không. Các mục còn mở của `docs/quyen-hoan.json` thuộc sổ tiền, khôi phục dữ liệu, bút toán điều chỉnh và hai ô quyền hoãn — ô `task.progress` hoãn không phải ô tiến độ chuyến (`trip.progress`) mà ADR này dùng.
- **Số quyết định chạm quyền/dữ liệu:** 1.

## Bối cảnh

Khung xem khách của mọi tài xế là MỘT hàm thuần `trongNgayChay` / `trongKhungXemKhach` (`src/shared/dieu-phoi-kiem.ts`), gọi ở máy chủ duy nhất qua `khungCuaNguoiGoi` (`src/modules/van-chuyen/index.ts`). Vế «đang chạy» hôm nay không có hạn: chuyến xuất bến rồi quên bấm «Kết thúc» thì tài xế còn thấy họ tên, năm sinh khách, tên và SĐT người liên hệ, mã đơn (tài xế đối tác, ADR-0053 D7.3), chuỗi chỉ đường (ADR-0105) nhiều ngày sau. Cờ `trongNgayChay` của DTO tài xế mang nghĩa «trong khung», và giao diện đọc nó ở bốn chỗ: tên khách dưới thẻ điểm, khối «Suất của khách» để bổ sung tên (`suatCuaKhach`), giữ chuỗi chỉ đường (`giuChiDuong`), khách trước khi cho xe chạy (`khachTruocChay`).

Phần tự kết thúc chuyến **không** thuộc ADR này: lệnh duy nhất máy đóng chuyến được là «Kết thúc gián đoạn», ghi mọi khách chưa xong thành «chuyến bị gián đoạn» — ghi sai kết quả khách. Đó là quyết định riêng sau (kế hoạch Phần I điều 3).

## Quyết định

1. **Vế «đang chạy» có hạn.** Chuyến `RUNNING` chỉ còn trong khung tới **hết ngày (giờ Việt Nam) kế sau ngày VN của giờ xuất bến**. Điều kiện cũ «ngày VN của giờ xuất bến ≥ ngày chạy» giữ nguyên. Vế «hôm nay là ngày chạy» và vế hạn Từ chối của tài xế đối tác giữ nguyên. Một hàm cho mọi tài xế (công ty và đối tác), vẫn không nơi nào tự tính khung.
   Ví dụ: xuất bến ngày D lúc 12:35 → trong khung D và D+1, ngoài khung từ 00:00 D+2. Xuất bến D+1 lúc 00:30 (chuyến qua nửa đêm của ngày chạy D) → trong khung tới hết D+2. Xuất bến tối D−1 (ngày chạy D) → chỉ ngày D (như hôm nay).
2. **Ngoài khung thì mất theo khung** (như mọi lúc ngoài khung hôm nay, không luật mới): họ tên, năm sinh khách; tên, SĐT người liên hệ; mã đơn với tài xế có vế hạn; chuỗi chỉ đường; khối «Suất của khách» và route bổ sung tên khách của tài xế công ty (ô `trip.passenger.add` chỉ `DRIVER` có; `POST /api/van-chuyen/cuoc-cua-toi/:id/hanh-khach` trả «không có chuyến» như ngoài khung hôm nay).
3. **Vẫn làm được sau hạn:** các lệnh tiến độ của tài xế (đón, vắng, trả, tới điểm, Kết thúc …) không bị khung chặn — khung chỉ quyết cờ trong phản hồi và việc che mã đơn trong thân 409 của lệnh xuất bến, đổi thứ tự — nên tài xế vẫn bấm xong chuyến. Văn phòng không đổi gì (khung chỉ áp DTO tài xế).
4. **Dòng nhắc trên màn tài xế** khi chuyến đang chạy mà đã qua khung. Không đổi route hay DTO: giao diện suy từ dữ liệu đã có — chuyến `RUNNING`, cờ `trongNgayChay` tắt, và hôm nay (giờ VN) đã sau ngày chạy. (Vế «sau ngày chạy» để chuyến xuất bến tối hôm trước ngày chạy không hiện nhầm dòng nhắc.) Chữ — phương án (1), kế hoạch Phụ lục B mục B-15: «Chuyến chưa bấm Kết thúc — tên khách đã ẩn. Bấm Kết thúc khi xong hoặc báo văn phòng.»
5. **Không đổi:** khung của văn phòng, chi tiết chuyến của văn phòng, nhật ký, cách bấm thay của văn phòng, ô quyền.

## Câu ADR bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0053 D7.2, gạch thứ hai của «một trong hai» | «chuyến đang `RUNNING` **và** ngày VN của giờ xuất bến ≥ ngày chạy (chỉ để phủ chuyến qua nửa đêm).» | «chuyến đang `RUNNING` **và** ngày VN của giờ xuất bến ≥ ngày chạy **và hôm nay (ngày VN) không quá ngày kế sau ngày VN của giờ xuất bến** (chỉ để phủ chuyến qua nửa đêm; chuyến quên Kết thúc hết khung từ 00:00 ngày thứ hai sau ngày xuất bến — ADR-0189).» |
| ADR-0049 D3, «Trong ngày chạy» (bản đã sửa ở ADR-0053) | «… **hoặc** chuyến đang chạy **đã xuất bến từ ngày chạy trở đi**.» | «… **hoặc** chuyến đang chạy đã xuất bến từ ngày chạy trở đi, **tới hết ngày kế sau ngày xuất bến** (ADR-0189).» |

## Lý do

Một ngày dư sau ngày xuất bến đủ cho chuyến qua đêm và cho tài xế bấm nốt sáng hôm sau; quá đó, tên khách trên máy tài xế không còn phục vụ chuyến nào (Hiến chương 4.4 — tối thiểu dữ liệu cá nhân). Siết ở hàm thuần một chỗ: không Cron, không migration, không đổi trạng thái chuyến.

## Phương án bị loại

- **Tự kết thúc chuyến bằng Cron:** chỉ có «Kết thúc gián đoạn», ghi sai kết quả khách — để quyết định sau.
- **Đếm 24 hoặc 48 giờ từ giờ xuất bến:** khó nói cho tài xế («còn thấy tới mấy giờ?»), lệch cách tính theo ngày VN của cả hàm.
- **Hết khung ngay hết ngày xuất bến:** chuyến qua nửa đêm (đón sân bay chuyến khuya) mất tên khách giữa chừng.
- **Thêm cờ mới vào DTO cho dòng nhắc:** không cần; dữ liệu đã có đủ.

## Bài kiểm (đỏ trước, xanh sau)

- `src/shared/dieu-phoi-kiem.test.ts` thêm ca vào nhóm TC-18 có sẵn: xuất bến D 12:35 → D, D+1 đúng; D+2, D+9 sai. Xuất bến D+1 00:30 (ngày chạy D) → đúng tới hết D+2. Xuất bến tối D−1 → chỉ D đúng. Tài xế có vế hạn: cùng các ca, giao với hạn Từ chối.
- `src/shared/khung-xem-khach.test.ts` (ca DTO trong/ngoài khung theo ngày), bài route bằng `tests/audit/dieu-phoi-khung.mjs` (đồng hồ giả: D+2 không tên, lệnh Kết thúc vẫn 200).
- `src/hanh-khach-khong-lo-ten.test.ts`: thêm ca chuyến quên Kết thúc ở D+2 cho `DRIVER` và `DRIVER_PARTNER` — DTO không có khoá tên, liên hệ, chỉ đường.
- Bài thuần cho điều kiện hiện dòng nhắc (ba ca: trong khung; ngoài khung sau ngày chạy → hiện; xuất bến tối hôm trước → không hiện).
- Kịch bản Chrome `docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs`, `docs/evidence/2026-10-25-tai-xe-thay-khach/kich-ban/tai-xe-thay-khach-smoke.mjs`, ảnh 390 và 1280.

## Người dùng sẽ thấy

Tài xế (công ty và đối tác) có chuyến đã xuất bến mà quên bấm «Kết thúc»: từ 0 giờ ngày thứ hai sau ngày xe chạy, màn chuyến không còn tên, năm sinh, số liên hệ của khách, không còn nút chỉ đường và khối bổ sung tên; trên màn có dòng nhắc «Chuyến chưa bấm Kết thúc — tên khách đã ẩn. Bấm Kết thúc khi xong hoặc báo văn phòng.» Các nút đón, vắng, trả, Kết thúc vẫn bấm được. Văn phòng thấy như cũ.

## Hệ quả

- Quyết định sau (không thuộc ADR này): có tự kết thúc chuyến quên bấm không, và bằng lệnh nào để không ghi sai kết quả khách.
- Khi duyệt: dòng Trạng thái ADR-0053 thêm trỏ về ADR này.
- Trần gói trang Đơn hàng: không chạm (màn tài xế là trang khác). Chưa đo gói màn tài xế.
