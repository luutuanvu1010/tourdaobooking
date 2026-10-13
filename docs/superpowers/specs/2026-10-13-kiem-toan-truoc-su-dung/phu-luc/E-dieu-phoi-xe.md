# Phụ lục E — Điều phối xe và tài xế

> Mốc `483b3aa0`. Người kiểm chỉ đọc mã; chạy lại `thu-tu-lo.test.ts` (12/12 xanh). E-1, E-2, E-3 **chưa dựng lại bằng khung thử**, chỉ suy từ mã.

## Phát hiện

| Mã | Mức | Chuyện gì | Đường tái hiện (suy từ mã) | Tệp:dòng | Xử lý |
|---|---|---|---|---|---|
| E-1 | Medium | Chuyến quên bấm "Kết thúc" thì tài xế vẫn thấy tên, năm sinh, SĐT liên hệ của khách nhiều ngày sau. | Chuyến ở RUNNING; vế "xuất bến từ ngày chạy trở đi" không có cận trên. Tài xế gọi `GET /api/van-chuyen/cuoc-cua-toi/:id` → `trongKhung=true` mọi ngày sau đó. Không có tác vụ tự kết thúc, không có kiểm định kỳ R-VC nào xét RUNNING quá hạn. | `shared/dieu-phoi-kiem.ts:534-540`; `van-chuyen/index.ts:173-189, 1658-1664` | Cận trên cho vế RUNNING (ngày VN ≤ ngày chạy + 1) + kiểm định kỳ "RUNNING quá N giờ". Cần chủ duyệt thiết kế. Vừa. |
| E-2 | Medium | Tài xế đối tác thấy tên tài xế công ty và điểm đón sắp tới của mọi chuyến công ty cùng ngày. | `DRIVER_PARTNER` (ô `trip.transfer = assigned`) đang có chuyến RUNNING gọi `GET …/cuoc-cua-toi/:id/xe-nhan`: nhận chuyến PLANNED/RUNNING của tài xế công ty cùng ngày với `tripId`, mã chuyến, `tenTaiXe`, chỗ trống, `diemSapToi` (chữ tự do, chỉ che dãy ≥ 8 chữ số). ADR-0111 Đ4 chỉ duyệt cho tài xế công ty; ADR-0113 Đ5 chờ chủ. | `van-chuyen/index.ts:1669-1685`; `cuu-ho.ts:44-50`; `permissions.ts:219,224` | Bỏ `diemSapToi` và `tenTaiXe` khỏi DTO cho `DRIVER_PARTNER`; ghi vào quyết định Đ5. Nhỏ-vừa. |
| E-3 | Low | Đổi ngày hoặc bỏ chặng bằng đường cũ không tự gỡ khách khỏi xe. | `PUT /api/orders/:id/trip` dời mọi chặng sang ngày khác (hoặc thân cũ có `pickupTime/pickupPlace` rỗng đóng chặng đi) không qua máy đồng bộ chuyến. Suất khách còn trên chuyến ngày cũ; sai lệch hiện thành lý do giữ (`GIO_HEN_NGOAI_CHUYEN`, `CHANG_DA_DONG`) và chặn xuất bến, không mất khách. | `orders/index.ts:1018-1060`; `orders/service.ts:81-110`; ADR-0104 mục 4 | Gọi `dongBoChuyen` ở route này hoặc ghi vào BL-VC-MQ07-HO. Vừa. |

## Trạng thái mục đã biết (vùng E)

ADR-0113: mã khớp Đ1–Đ3, đã ghi sổ hàng rào ("dựa vào máy chủ", `SO-HANG-RAO.md:530`); không có mã R-VC canh định kỳ điều "không từ chối khi có khách chuyển vào" (R-VC-26/27 chỉ xét người đóng và giờ xuất bến) — coi là đã biết. ADR-0111: hành vi khớp; một `db.batch` nguyên tử cho chuyển khách, có trigger LC-01 và LC-02; không thấy tình huống khách mất hoặc nhân đôi trong các đường đã đọc. BACKLOG mục 22 (BL-VC-A5-NO, THAY-CHANG, MQ07-HO, MA-LENH): nợ đã ghi, không kiểm lại. Mốc 6 giờ có lối "Đặt gấp": đúng thiết kế.

## Đã kiểm, sạch

- **Mốc 6 giờ**: chỉ một câu `SET status='confirmed'` trong `src/` (`orders/chang-hanh-khach-repo.ts:382`), không có `INSERT … 'confirmed'`. Route thêm/sửa/thay chặng và `PUT /trip` đều kiểm `duoiMocKhiSua` (`orders/index.ts:1040-1048, 1076-1079, 1155-1156, 1001`). Không có đường xác nhận hàng loạt, đường HDV hay Cron. Chặng đón định dạng `HH:MM` do CHECK `0034:15`; múi giờ cộng cứng +7h (`shared/vn-date.ts`). Lưu ý: **mốc chỉ nằm trong WHERE câu xác nhận** + `CHECK min_lead_minutes BETWEEN 1 AND 2880` (`0041:16`), không có trigger CSDL chặn xác nhận dưới mốc — đúng thiết kế đã duyệt (CLAUDE.md §10 nói "CSDL chặn 0" chỉ cho giá trị mốc, không cho hành vi xác nhận).
- **Thứ tự lô**: `thu-tu-lo.test.ts` tự suy mọi `export function` của `dieu-phoi.ts` (gồm `loGuiDeNghi`, `loXacNhanDeNghi`, `loTuChoi` 0092, `loCapNhatKhach`, `loDongBoChuyen`) — 12/12; mọi lệnh chuyến (kể cả `chuyen-khach-lenh.ts`, `tu-choi.ts`) đi qua `chayLo` → `db.batch` một lô. Hai người điều phối bấm cùng lúc: khoá `version` + `last_cmd_id`, UNIQUE `request_id`, xử lý lệnh lặp (`dieu-phoi-route.ts:268-295`).
- **Chồng giờ**: trigger `vc_trip_overlap_ins/upd`, `vc_trip_driver_overlap_ins` (`0042:352-382`), `vc_trip_driver_one_running`.
- **Giấy tờ xe/GPLX hết hạn** chặn xuất bến phía máy chủ (`dieu-phoi-kiem.ts:28-70, 398+`); giờ lái chỉ cảnh báo đúng ADR-0055.
- **Giờ tiến độ**: `gio-xay-ra.ts` kẹp khoảng; tài xế tự bấm thì giờ xảy ra = giờ máy chủ; mọi chuỗi giờ ghi CSDL là `toISOString()`, không có `toLocale`/`datetime('now')` so với chuỗi ISO.
- **DTO tài xế**: `tai-xe-dto.ts` dựng từng khoá; tên/năm sinh/SĐT chỉ trong khung xem khách ở GET chi tiết; phản hồi lệnh tiến độ truyền `hk=[]`, `lienHe=null` (`index.ts:1810-1812`). Tài xế đối tác không thấy chuyến nhà xe khác (`dangLai` so `driver_party_id`). Chuyến huỷ thì dòng lái bị đóng (`DRIVER_CLOSE` trong `loHuy`). Route nhận/rút/không nhận đề nghị kiểm quyền sở hữu chuyến.
