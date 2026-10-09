# ADR-0112 — Báo tài xế khi văn phòng bấm "Cập nhật khách / điểm theo đơn" lúc xe chưa chạy

- **Trạng thái:** **accepted** 2026-10-09 — chủ dự án trả lời hộp hỏi duyệt duy nhất của bản đề xuất ("Bạn có duyệt ADR-0112 không? …"), nhãn đã chọn nguyên văn: **"Duyệt (Recommended)"**. Trước đó, cùng ngày, chủ chọn câu 2 của trang trình Bảng sự kiện Vận chuyển (`docs/superpowers/specs/2026-10-09-bang-su-kien-van-chuyen/00-trang-trinh.md`) với nhãn **"Có, soạn quyết định mới (Recommended)"**; ghi ở `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-danh-sach-viec.md`, dòng việc 6b. AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-10-09.
- **Văn bản trình duyệt:** `docs/superpowers/specs/2026-10-09-bang-su-kien-van-chuyen/02-de-xuat-adr-0112.md` @ `ba7fdcc8` (hồ sơ có ngày, đóng băng). Thân dưới đây chép từ bản đó, bỏ đoạn "Cho chủ dự án" và câu hỏi duyệt.
- **Mốc đo mã:** nhánh `claude/van-chuyen-goi-a-c` @ `6499745e`.
- **Một quyết định**, chạm danh sách tin (một chiều nhẹ), không chạm dữ liệu / quyền / tiền: không vượt trần 3 của `CLAUDE.md` §9; bảng dùng chung không nhận loại dữ liệu mới nên không cần trang ghép.
- **Xây trên lỗ đang hở:** không. Sáu mục HIGH ở `docs/quyen-hoan.json` (TNV-G1, G3, G4, HC-4.2, HC-5.19, HC-5.11): không mục nào chạm tin chuyến; HC-5.11 không áp vì người bấm nút là người thật, nhật ký mang `staff_id` của họ.

## Bối cảnh

Danh sách việc nhật ký sinh tin chuyến là cửa một chiều, chỉ mở thêm bằng văn bản (ADR-0052 `:210`; ADR-0104 mục "Cửa một chiều" `:248-250`). Hôm nay:
- `trip_passengers_synced` (nút "Cập nhật khách theo đơn", `POST …/cap-nhat-khach`, chỉ chạy trên chuyến chưa chạy — xe đang chạy trả 409) **không** nằm trong `HANH_DONG_TIN_CHUYEN`. Việc máy làm đúng điều đó (`trip_order_synced`) thì có tin `khach_doi` (ADR-0104 Đ2.10).
- `trip_stops_synced` (nút "Cập nhật điểm theo đơn", `POST …/cap-nhat-diem`) **đã** nằm trong danh sách, nhưng `loaiCho` (`src/shared/tin-chuyen.ts`) chỉ trả tin khi chuyến đã xuất bến lúc sự kiện (ADR-0052 D6.1, D6.2 chỉ nói "xe đang chạy").
- Bảng sự kiện ghi hai chỗ này là lệch quy tắc QT1: `N-CAP-NHAT-KHACH`, `N-CAP-NHAT-DIEM` trong `CHO_LECH` (`src/shared/bang-su-kien-van-chuyen.ts`).

## Quyết định

**Đ1. Cập nhật khách:** thêm `trip_passengers_synced` vào `HANH_DONG_TIN_CHUYEN`, thuộc nhóm tin thường (`HANH_DONG_TIN_THUONG`), **không** thuộc ba lệnh khách (`HANH_DONG_TIN_KHACH`). Loại tin `khach_doi`, câu nguyên văn của máy đồng bộ:
> `Đơn vừa đổi khách ở chuyến <mã> ngày <dd/mm> — mở để xem` — liên kết `/cuoc-chuyen?id=<chuyến>`

**Đ2. Cập nhật điểm, xe chưa chạy:** `trip_stops_synced` trên chuyến chưa xuất bến lúc sự kiện cũng sinh tin, câu nguyên văn đang gửi khi xe chạy:
> `Văn phòng vừa đổi điểm đón ở chuyến <mã> ngày <dd/mm> — mở để xem` — liên kết `/cuoc-chuyen?id=<chuyến>`

Mã loại tin (`LoaiTinChuyen`) chỉ dùng trong mã và bài kiểm, không ra giao diện hay CSDL: người thi công chọn dùng chung `xe_chay_doi` (bỏ điều kiện `khi` ở dòng bảng) hoặc tách loại mới; đổi lại được.

**Đ3. Người nhận (cả hai nút) — đúng nhánh của máy đồng bộ** (`loaiCho`: dòng lái bao lúc sự kiện **và** `can(trip.view, { assigned: true })`):
- nhận: người có dòng lái chuyến đó mở ≤ lúc sự kiện và (còn mở hoặc đóng ≥ lúc đó) — trong bảng là `TX_LUC` (đang lái, vừa xếp, vừa gỡ đúng lúc);
- không nhận: người bấm (không tự nhận tin của mình), văn phòng (Bán hàng, Kế toán, Quản trị, Toàn quyền — trừ khi chính người đó đang được xếp lái chuyến này, vì máy chọn theo dòng lái chứ không theo vai), HDV, Đối tác, Thực tập;
- **Tài xế đối tác: không nhận**, vì ô `trip.view` của `DRIVER_PARTNER` hôm nay là `none` (`src/shared/permissions.ts`, dòng `"trip.view"`) — giống hệt tin máy. Nếu sau này ô đó mở, họ tự nhận qua cùng hàm, không cần văn bản mới cho phần này.

**Đ4. Không đổi:** xe đang chạy giữ nguyên (cập nhật điểm vẫn câu và loại cũ; cập nhật khách vẫn 409). Câu tin không có tên khách, SĐT, nơi đón (luật Điều phối xe, `CLAUDE.md` §10) — chỉ mã chuyến và ngày. Gõ cửa màn hình khoá đi đường sẵn có: route đã gọi `baoThayDoiChuyen` khi có ghi, gốc lắp ráp gõ cửa khi `dongCoTheSinhTin` đúng. Nút bấm mà không có gì lệch thì không ghi, không tin; lệnh lặp (`requestId` cũ) trả kết quả cũ, không tin mới.

**Đ5. Tin cũ không hiện lại:** hộp thông báo tính lại từ nhật ký 30 ngày, nên nếu không chặn, các lần bấm trước ngày phát hành sẽ hiện ra thành tin cũ. Tin MỚI của quyết định này (cập nhật khách; cập nhật điểm khi xe chưa chạy) chỉ tính cho sự kiện **từ mốc phát hành** trở đi (khuôn `MOC_TIN_DOI` của ADR-0062 Đ1); tin cập nhật điểm khi xe đang chạy giữ như cũ.

**Đ6. Nới bài kiểm có tên (Hiến pháp Điều 9.4):** bài *"Đợt 5: cập nhật điểm trên chuyến CHƯA chạy … → không ai nhận tin"* ở `src/shared/tin-chuyen.test.ts` được viết lại thành bài ngược (tài xế đang lái nhận đúng câu Đ2). Đã quét mọi `src/**/*.test.ts` @ `79b06a39`: chỉ bài này khoá hành vi cũ. Các bài của Bảng sự kiện (`src/bang-su-kien-van-chuyen.test.ts`) sẽ đỏ theo thiết kế và được sửa bằng dòng bảng (mục Hệ quả), không phải nới; bài 1024 tập con quyền và bài loại thay đổi Bảng tin ở `tin-chuyen.test.ts` vẫn xanh.

## Hệ quả

- **Bảng sự kiện:** dòng `cap-nhat-khach` có `tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "khach_doi" }] }`; dòng `cap-nhat-diem` cho `TX_LUC` nhận ở cả hai trạng thái chuyến (bỏ `khi: "xe_dang_chay"` hoặc thêm phần tử cho xe chưa chạy, theo lựa chọn ở Đ2). Xoá hai mục `N-CAP-NHAT-KHACH`, `N-CAP-NHAT-DIEM` khỏi `CHO_LECH`; cột `nguon` hai dòng thêm "ADR-0112". Tệp `01-bang-day-du.md` là hồ sơ có ngày, không sinh lại.
- **Đỏ trước, xanh sau** (thứ tự): (1) bài thuần mới ở `tin-chuyen.test.ts` cho từng hành động: tài xế đang lái nhận đúng câu; tài xế bị gỡ trước sự kiện, người bấm, SALES / ADMIN / ACCOUNTING / SUPER_ADMIN, `DRIVER_PARTNER` nhận `null`; `trip_passengers_synced` thuộc THUONG, không thuộc KHACH; sự kiện trước mốc Đ5 không ra tin; (2) bài route theo khuôn `tinKhachDoi` (`src/modules/van-chuyen/dong-bo-chuyen-route.test.ts`): bấm một lần → tài xế có đúng một tin; bấm lần hai không còn lệch → không thêm tin; (3) sửa mã → bài đối chiếu bảng (`src/bang-su-kien-van-chuyen.test.ts`) đỏ → sửa hai dòng → bài (e) đỏ vì hai mục `CHO_LECH` thừa → xoá; (4) đổi đầu ra API nên chạy cả e2e.
- **Migration: không.** View `v_aud_trip_event` (`migrations/0070_tin_chuyen.sql`) đã lấy mọi `trip_*`; danh sách hành động truyền bằng tham số từ mã.
- **Trần hộp thông báo** (không phải trần hằng ngày): nhóm thường đọc 3000 dòng gần nhất của cả công ty trong 30 ngày (`LIST_TIN_CHUYEN`, `src/modules/thongbao/repository.ts`). Cập nhật điểm: không đổi (đã trong nhóm). Cập nhật khách: thêm dòng vào nhóm thường, không đụng trần 1000 của ba lệnh khách. Nút chỉ ghi khi có lệch nên dự kiến ít; **chưa đo lượng thật**.
- **Bảng tin và chuông:** không đổi. Cả hai việc trên xe chưa chạy mang loại `cap_nhat`; từ ADR-0104 Đ2.10 máy có quyền Tài xế đã gọi lại sau `cap_nhat`, máy văn phòng không.

## Câu ADR bị thay (nguyên văn → mới; không sửa thân ADR cũ)

| Chỗ | Nguyên văn | Mới |
|---|---|---|
| ADR-0052 `:148` (D6.1) | "**cập nhật điểm theo đơn trên xe đang chạy (`trip_stops_synced`, D5.3a …)**" | "cập nhật điểm theo đơn (`trip_stops_synced`; xe chưa chạy: ADR-0112) …; **cập nhật khách theo đơn (`trip_passengers_synced`, ADR-0112)**" |
| ADR-0052 `:157` (D6.2) | "**cập nhật điểm theo đơn khi xe đang chạy** ("đổi điểm đón X → Y")" | "cập nhật điểm theo đơn, xe chạy hay chưa ("Văn phòng vừa đổi điểm đón ở chuyến … — mở để xem"; câu không mang nơi cũ → mới); cập nhật khách theo đơn khi xe chưa chạy" |
| ADR-0104 `:173` (Đ2.11) | (không nói tin) | "+ Tin: như Đ2.10 (`khach_doi`, tài xế có dòng lái lúc sự kiện) — ADR-0112" |

## Phương án đã loại

- **Giữ như hôm nay (nút tay không báo):** tài xế đã xếp lái có thể tới nhầm điểm hoặc thiếu khách mà không biết; hai đường cùng một việc báo khác nhau.
- **Câu riêng cho nút tay** ("Văn phòng vừa cập nhật khách…"): chủ đã chọn cùng câu; thêm câu là thêm chỗ phải giữ đồng bộ.
- **Báo cả văn phòng:** văn phòng là người bấm hoặc đã thấy trên bảng điều phối; trái nguyên tắc "tin chỉ tới người làm được việc đó" (ADR-0052 D6.2).

## Điều chưa chắc

- **Trùng tin:** không có trùng cho cùng một thay đổi — máy đã đồng bộ thì nút không còn lệch để ghi; máy và nút chạy sát nhau thì cổng phiên bản chuyến chỉ cho một bên ghi. Có thể có **hai tin hợp lệ** cho một lần sửa đơn: máy đồng bộ một phần rồi văn phòng bấm nút cho phần còn lại; hoặc sửa chặng đổi cả giờ lẫn nơi (tin "đổi giờ đón" lúc sửa đơn, tin "đổi điểm đón" lúc bấm nút). Sửa chỉ nơi thì tin giờ hẹn không ra (`phanDoiCuaTin` đặt `gioHen` theo trường ngày / giờ), trừ khi chữ nhật ký không đọc được (máy chọn câu chung, coi như có đổi giờ) — chưa kiểm bằng bài.
- **Đ5 (mốc phát hành)** là chi tiết AI thêm để tránh tin cũ; chủ duyệt cả ADR gồm Đ5.
- Lượng dòng thật của hai nút trên production: chưa đo.
