# Nhật ký thi công — Vận chuyển Đợt 7: cam kết "xe riêng" / "xe tối thiểu N chỗ" trên chặng đưa đón (ADR-0056 VK3-A)

Kế hoạch: `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-07-xe-rieng-so-cho.md`. ADR: `docs/adr/ADR-0056-van-chuyen-kernel-luot-3.md` (VK3-A).
Làn này không gọi trợ lý con; người kiểm độc lập chỉ đọc chạy SAU ở phiên khác (CLAUDE.md §3, N8).

## Nền và số đã chốt (Task 0, 2026-10-05)
- Nhánh `van-chuyen-dot-7`, HEAD lúc nhận `dc1ef1fe` (đã gộp Đợt 1–5; `main` = `origin/main`).
- Migration: `migrations/` ở HEAD tới `0076_xe_dang_chay` (nhánh chưa gộp lớn nhất `0050`, theo sổ điều phối) ⇒ **`0077_cam_ket_chang.sql`** (C1).
- Mã kiểm định kỳ: mã `R-VC` lớn nhất trong `scripts/audit-checks.mjs` là **`R-VC-24`** (:697, Đợt 5 D5.3a) ⇒ C2 = **`R-VC-25`** (mã do điều phối cấp).
- Bản phát hành: **1.81** (1.80 là bản gần nhất, nhật ký thay đổi tài xế bổ sung tên).
- Lời chủ: câu 7.1, 7.2 chủ đồng ý tối 2/10 ⇒ đã thay mọi dấu "chờ chủ xác nhận" trong kế hoạch bằng "(chủ đồng ý 2/10)" (4 chỗ: dòng 31, 33, 354, 372) và sửa "Cần chủ" câu 1 thành đã trả lời.

## Bảng đo dòng thật (HEAD `dc1ef1fe`)
| Điểm chạm | Dòng thật |
|---|---|
| `kiemTaoSuaChuyen` / `KiemTaoSuaChuyenVao` / `KetQuaTaoSua` | `src/shared/dieu-phoi-kiem.ts` :99 / :73 / :97 |
| `kiemXep` / `kiemXuatBen` | `dieu-phoi-kiem.ts` :249 / :331 |
| `MA_LUAT_PHA_LE` | `src/shared/dieu-phoi-kieu.ts` :84 = `["MOC_TOI_THIEU", "KHOANG_NGHI"]` (chưa có `THIEU_GIA`) |
| `ChangVao` / `ChuyenVao` | `dieu-phoi-kieu.ts` :189 / :267; `ChuyenVao.thue` :285, `coNguonGia` :287 (cờ, không tiền) |
| `MA_GIU` / `AI_XU_LY` | `src/shared/ly-do-giu.ts` :18 / :7 = `["VAN_PHONG","QUAN_TRI","TOAN_QUYEN"]`; `MOC_TOI_THIEU` :58 và `KHOANG_NGHI` :59 (QUAN_TRI); `THIEU_GIA` :56 (QUAN_TRI) |
| `THONG_BAO_409` / `MA_LOI_THEO_GIU` / `loiKiem` | `src/modules/van-chuyen/dieu-phoi-route.ts` :33 / :65 / :79 (`loiKiem` vẫn chỉ lọc `MOC_TOI_THIEU`/`KHOANG_NGHI` :88) |
| `phaLeCua` và các lệnh | `dieu-phoi-lenh.ts` :36; `lenhSuaChuyen` :49, `lenhXep` :136, `lenhThemDiemDangChay` :231, `lenhBaoHuy` :279, `lenhBoSungTen` :307, `lenhRut` :330, `lenhDoi` :357, `lenhHuy` :425, `lenhCapNhatDiem` :452, `lenhCapNhatKhach` :520, `dungLichNgay` :566; `kiemXepVao` :190 |
| `lenhXuatBen` | `dieu-phoi-tien-do.ts` :59 (gọi `kiemXuatBen` :77) |
| Lô (cổng/nhật ký/câu/trạng thái cuối) | `dieu-phoi.ts`: `loTaoChuyen` :138, `loSuaChuyen` :167, `loXep` :200, `loRut` :224, `loDoi` :252, `loHuy` :284, `loCapNhatDiem` :315, `loThemDiemDangChay` :349, `loBaoHuy` :370, `loBoSungTen` :394, `loCapNhatKhach` :414, `loXuatBen` :475; `congDangChayVersion` :77 |
| `TripRow` / `COT_CHUYEN` | `chuyen-repo.ts` :11 / sau :43; có `rented` :34, `route_code` :36, `co_nguon_gia` :38 |
| `chuyenVao` / `changVao` | `dieu-phoi-doc.ts` :84 / :97 |
| Thân lệnh | `dieu-phoi-than.ts`: `TaoChuyenThan` :35, `SuaChuyenThan` :51, `XepThan` :102, `RutThan` :133, `DoiThan` :146, `HuyThan` :155 |
| `lichChungChang` / `hanhKhachChoChuyen` / kiểu | `src/modules/orders/index.ts` :357 / :280 / `ChangLichChung` :312, `ChangChoChuyen` :256; route gọi ở `van-chuyen/index.ts` :1105, :1113–1114, :1183–1184, :1205–1206, :1234–1242 |
| `ChangHopLe` / `ChangDaLuu` / `oPhu` | `src/shared/chang-dua-don.ts` :67 / :81 / :106 (trả `Pick<ChangHopLe, "flightCode" \| "paxOverride">`); `toGhi` :276 |
| `giaiOPhuNhap` / chặn ô phụ trong `updateTrip` | `src/modules/orders/service-rules.ts` :406 / :328–329 |
| `planSuaChang` / `moTaVao` | `service.ts` `moTaVao` :100 (dùng ở :152, :200, :233, :253) |
| `LEG_SET_O_PHU` | `chang-hanh-khach-repo.ts` :195, dùng ở :200, :210. **Đã dùng tham số `?17`–`?20`**: hai cột mới phải nhận `?21`–`?24`. `legTripRows` :526, `legLichChungRows` :573 |
| `chepDatGapNhap` | `src/modules/orders/dat-gap.ts` :35 |
| Bảng `MAU` | `thu-tu-lo.test.ts` :41 (có `loTaoChuyen` :42, `loSuaChuyen` :49, `loXep` :56, `loRut` :57, `loDoi` :58, `loHuy` :62, `loCapNhatDiem` :63, `loCapNhatKhach` :65, `loXuatBen` :66, `loThemDiemDangChay` :81, `loBaoHuy` :88, `loBoSungTen` :90 …); `loTaoChuyen` đã mang `thue: 1, tuyen: "T001"` |

## Ghi chú: điểm khác kế hoạch (do Đợt 4, 5 đã gộp)
1. `kiemXep` nay có **ba nơi gọi** trong `dieu-phoi-lenh.ts`: `lenhXep` :151 (lệnh `"XEP"`), `lenhThemDiemDangChay` :242 (lệnh `"THEM_KHI_CHAY"`, Đợt 5 D5.1) và `lenhDoi` :384. Task 3/4 phải quyết `kiemCamKet` có áp cho `THEM_KHI_CHAY` (xe đang chạy) hay không — kế hoạch viết trước Đợt 5 nên chưa nhắc. Đề xuất: áp (cùng luật xếp), nhưng đây là điểm Task 3 phải chốt và ghi Ruling.
2. Lô mới của Đợt 5 (`loThemDiemDangChay`, `loBaoHuy`, `loBoSungTen`) dùng `congDangChayVersion` thay cổng thường khi xe đang chạy; `lenhThemDiemDangChay` ghi phá lệ qua `phaLeCua(…"MOC_TOI_THIEU"…)` :257. Cam kết chỉ cần tính khi lệnh THÊM khách vào chuyến (`lenhXep`, `lenhDoi` chuyến đích, `lenhThemDiemDangChay`, `lenhSuaChuyen` đổi xe); `lenhBaoHuy`, `lenhBoSungTen`, cứu hộ không thêm khách ⇒ theo C7 không bị chặn.
3. Cứu hộ (`src/modules/van-chuyen/cuu-ho.ts`) chỉ là hàm đọc `cuuHoTu` (GET `/chuyen/:id/cuu-ho`), không gọi `kiemXep`/`kiemTaoSuaChuyen`/`changVao`; chuyến cứu hộ tạo bằng `lenhTaoChuyen` thường ⇒ không chạm hàm Đợt 7 sửa.
4. Ô `trip.passenger.add` (`permissions.ts` :188: `SUPER_ADMIN` any, `DRIVER` assigned) thuộc lệnh `lenhBoSungTen`; không gọi `kiemXep`, không chạm `ChangVao`/`ChuyenVao`. Đợt 7 không thêm ô quyền mới.
5. `MA_GIU` đã có `THIEU_GIA` (Đợt 4); `MA_LUAT_PHA_LE` KHÔNG có `THIEU_GIA` (đúng kế hoạch). `ChuyenVao` đã mang `thue`/`coNguonGia` ⇒ mọi bộ dựng mẫu `ChuyenVao` đã phải có hai trường này; thêm trường cam kết bắt buộc sẽ cần sửa tay cùng chỗ.
6. Số mã R-VC: kế hoạch ghi "hôm nay là R-VC-20"; thật là **R-VC-24** ⇒ dùng **R-VC-25**.
7. `AI_XU_LY` chỉ có `VAN_PHONG | QUAN_TRI | TOAN_QUYEN` ⇒ C9 dùng `QUAN_TRI` (đúng như `MOC_TOI_THIEU`).

## Task 1 — migration `0077_cam_ket_chang.sql`
- Đỏ trước: `node --test src/migrations-cam-ket.test.ts` → 5 bài đỏ (chưa có tệp / "no column named exclusive_vehicle"). Sau migration: 5/5 xanh.
- Ruling: SQLite (node:sqlite) VÀ D1 local nhận CHECK nhắc cột khác (`commitment_override_key` nhắc `commitment_override_reason_code`) ngay trong `ALTER TABLE … ADD COLUMN` ⇒ KHÔNG cần trigger dự phòng; dùng đúng văn bản kế hoạch — vì bài TC-3 xanh và `npm run db:migrate:local` áp được — nếu sai: thay bằng hai trigger BEFORE INSERT/UPDATE ON vc_trip (migration mới, không sửa 0077 đã áp).
- Ruling: bài TC-4 dùng chuyến CANCELLED (`HUY_KHAC`) thay ENDED vì cùng trigger `vc_trip_final_frozen` (LC-06) mà dựng gọn hơn (không cần chạy cả lô xuất bến/kết thúc) — nếu sai: thêm một ca ENDED ở bài khuôn `migrations-chuyen-xe.test.ts` đã có sẵn.
- Không bài nào liệt kê migration theo tên cần thêm tên mới (`npm test` xanh, 0 đỏ, không sửa `migrations-n1.test.ts`).
- Từ điển dữ liệu: bảng chưa có mục theo cột, nên thêm `note` cho `ord_transfer_leg` và `vc_trip` ở `docs/data-dictionary.json` rồi `npm run dict`.


## Task 2 — orders nhận / lưu / trả hai ô cam kết
- Đỏ trước: `node --test` bốn tệp (cam-ket-chang, lich-chung-chang, ham-cong-bo, chang-dua-don) → 14 đỏ / 20. Xanh sau mã: 47/47; `npm test` 0 đỏ (3169 xanh + 1 todo có sẵn), typecheck 0 lỗi.
- Đột biến P16 (2026-10-05): đổi `(old?.exclusiveVehicle ?? false)` trong `giaiOPhuNhap` thành `false` → bài 2 và 3 của `cam-ket-chang.test.ts` ĐỎ; hoàn nguyên → xanh.
- Ruling: hai cột mới của `LEG_SET_O_PHU` nhận `?22`–`?25` (không phải `?21`–`?24` như ghi chú Task 0), vì `?21` là cờ giữ dấu đặt gấp — vì dồn vào sau để không đánh số lại tham số cũ — nếu sai: đổi số trong `oPhuBinds` và hai hằng SET.
- Ruling: `LEG_INSERT_GUARDED` dời id nhật ký từ `?17` sang `?19` và năm cột đặt gấp sang `?20`–`?24` (hai cột cam kết chen vào `?17`, `?18`) — vì cột chèn đứng cùng nhóm với hai ô phụ — nếu sai: đặt hai cột cuối danh sách chèn.
- Ruling: `kiemChang` từ chối `exclusiveVehicle: null` (chỉ `true`/`false`) — vì kế hoạch ghi "đúng kiểu boolean" — nếu sai: cho `null` = false.
- Ruling: chặng đổi chiều trong lưu nháp vẫn GIỮ cam kết của chặng cùng id (khác `paxOverride` chỉ gắn chiều về) — vì cam kết không gắn với chiều — nếu sai: đặt NULL khi đổi chiều.

## Task 3 — luật thuần `kiemCamKet`, nối vào ba hàm kiểm, nạp dữ liệu phía Vận chuyển
- Đỏ trước: `node --test src/shared/*.test.ts` → 11 đỏ / 1072 (`cam-ket-xe.test.ts` không nạp được — chưa có tệp; 8 bài mới của dieu-phoi-kiem / kieu / lich-chung / ly-do-giu; 2 bài so cả kết quả). `dieu-phoi-doc.test.ts` bài mapper mới đỏ (chưa có `camKetPhaLeKhoa`). Xanh sau mã: 1079/1079; `npm test` 0 đỏ (3186 xanh + 1 todo có sẵn); typecheck 0 lỗi.
- Đột biến P16 (2026-10-05): bỏ vế R-XR trong `kiemCamKet` (`c.xeRieng === true && false`) → 8 bài ĐỎ (cam-ket-xe 2, 3, 6; dieu-phoi-kiem tiêu chí 1, sửa chuyến, xuất bến 3/3b/3c, MỘT luật hai nơi; lịch chung Review Focus 3); hoàn nguyên → xanh.
- Đột biến thứ hai (2026-10-05): chạy bộ ca mẫu trên tệp `golden/dieu-phoi/xe-a-b-luot-1.json` CŨ (chưa có trường cam kết) → 7 đỏ (bài "đủ trường cam kết" + 6 bước xếp ném lỗi vì `changTrenChuyen` vắng); hoàn nguyên → xanh.
- Ruling (điều phối, ghi lại): `lenhThemDiemDangChay` (THEM_KHI_CHAY, Đợt 5) cũng gọi `kiemXep` ⇒ Task 3 truyền đầu vào cam kết thật (`changTrenChuyen`, `xeId`, `camKetPhaLeKhoa`) qua `kiemXepVao` — chung với `lenhXep`; `lenhDoi` truyền cho chuyến ĐÍCH. Route nhận `camKetPhaLe` / 403 / 409 của cả ba: Task 4.
- Ruling: ba dòng `phaLe = kq.canPhaLe.length > 0 ? phaLeCua(…MOC_TOI_THIEU…)` (lenhXep, lenhThemDiemDangChay, lenhDoi) đổi thành `kq.canPhaLe.some(ma === "MOC_TOI_THIEU")` — vì từ nay `canPhaLe` có thể chỉ chứa `CAM_KET`, điều kiện cũ sẽ ghi nhầm sự kiện phá lệ MỐC khi Quản trị gửi `phaLe`; điều kiện mới tương đương hành vi cũ (trước Task 3 `kiemXep.canPhaLe` chỉ có MOC) — nếu sai: Task 4 thay bằng thứ tự ưu tiên C6.
- Ruling: `kiemTaoSuaChuyen` khi đổi xe chạy CẢ `kiemCamKet` (không chỉ R-CX) — vì khoá mang id xe (C5): đổi xe trên chuyến đã phá lệ xe riêng làm khoá khác, cổng xuất bến sẽ giữ; chỉ xét R-CX thì lệnh sửa qua mà cổng giữ (lệch "MỘT luật") — nếu sai: lọc `viPham` theo `loai === "CX"` trong nhánh đổi xe.
- Ruling: `lenhSuaChuyen` nhận thêm tham số `lich`; route `PUT /api/van-chuyen/chuyen/:id` đọc `lichChungChang(nen.tu, nen.den)` trong khối `!eventByRequest` (sau `can()`), chỉ dùng khi đổi xe — vì luật cần chặng của khách đang trên chuyến; không đổi hành vi (một câu đọc thêm) — nếu sai: chỉ đọc khi `b.xeId !== t.vehicle_id`.
- Ruling: "chặng có suất khách mở trên chuyến" = suất mở + `PASSENGER` + có `leg_id`, giao với chặng của `lichChungChang`; chặng rơi khỏi lịch (đơn huỷ / chặng bỏ / ngoài khoảng ngày) bỏ qua ở luật cam kết — vì không có dữ liệu cam kết và đã có lý do giữ riêng (I38) — nếu sai: đọc cờ cam kết qua view cho chặng ngoài.
- Ruling: lời lý do: chặng xe riêng "ĐH-A xe riêng"; chặng đơn khác ghép vào "ĐH-B ghép vào xe riêng của ĐH-A"; số chỗ "ĐH-A cần ≥ 15 chỗ, xe 7 chỗ"; thứ tự vi phạm sắp theo dòng khoá (tất định cho bài "MỘT luật hai nơi") — chữ bề mặt — nếu sai: sửa `loiViPham`.
- Ruling: `kiemXep` chỉ đưa vào tập sau lệnh các `them` có `soSuatMoi > 0` — vì chặng 0 suất không có suất mở trên chuyến — nếu sai: bỏ bộ lọc.
- Ruling: tệp ca mẫu vàng `golden/dieu-phoi/xe-a-b-luot-1.json` thêm trường ĐẦU VÀO (`xeRieng: false`, `choToiThieu: null` mỗi chặng; `camKetPhaLeKhoa: null` mỗi chuyến xuất bến; `changTrenChuyen: []`, `xeId`, `camKetPhaLeKhoa: null` mỗi bước xếp) — KHÔNG đổi `dap_an` / `xac_nhan`; diff chỉ thêm chữ; thêm bài "đủ trường cam kết" (khuôn bài ADR-0050) — vì `kiemXep` sẽ ném lỗi khi `changTrenChuyen` vắng — nếu sai: hoàn tệp, bỏ bài.
- Ruling: bốn chuyến xuất bến của tệp ca mẫu vàng thêm `"thue": false, "coNguonGia": false` (phiếu việc Task 3: "mọi bộ dựng mẫu thử `kiemXuatBen` phải có đủ `thue`, `coNguonGia` cùng `camKetPhaLeKhoa`"); bài "đủ trường" đòi hai cờ là boolean (đỏ trên tệp trước sửa: 1 đỏ; sau: 28/28) — vì đáp án lượt 1 có trước ADR-0057, ca xe thuê đã có bài C5 riêng ở `dieu-phoi-kiem.test.ts`; `false` giữ nguyên `dap_an` — nếu sai: chủ xác nhận tệp vàng quyết giá trị.
- Ghi chú: `changTrenChuyen: []` ở bước xếp vào chuyến đã có khách là giản lược (chặng cũ không có cam kết nên kết quả như nhau).
- e2e (2026-10-05): `npm run test:e2e -- dieu-phoi xe-dang-chay tien-xe-thue` → 6/6 xanh; `npm run test:e2e -- van-chuyen khung-ban-xe dieu-phoi-chay-dua` → 6/6 xanh (route sửa chuyến PUT nay đọc thêm `lichChungChang` — phủ bởi khung-ban-xe, tien-xe-thue).
- Nợ (Task 4 — ĐÃ TRẢ ở Task 4, xem dưới): nối đầu vào cam kết ở lệnh chưa có bài máy chủ/e2e riêng — `loiKiem` vẫn LỌC MẤT `CAM_KET` nên lệnh xếp chưa bị chặn ở route (đúng kế hoạch); bài 2 của Task 4 phải đỏ trước. Cổng xuất bến đã giữ thật (`lyDo` không qua `loiKiem`).

## Task 4 — lệnh xếp / sửa chuyến / dời / thêm khi xe chạy có phá lệ cam kết (`CAM_KET`)
- Đỏ trước: 6 bài mới `dieu-phoi.test.ts` (Đợt 7 bài 2–3, 4, 5, khuôn nghiPhaLe, 6, dời) → 6/6 đỏ (bài 2: `expected 409, actual 200` vì `loiKiem` lọc mất `CAM_KET`; bài 4: `expected 403, actual 200`); bài THEM_KHI_CHAY `xe-dang-chay-route.test.ts` → đỏ (`expected 409, actual 200`); bài thứ tự lô `thu-tu-lo.test.ts` (nhãn CAM_KET_PHA_LE) → đỏ. Xanh sau mã: 40/40 (bốn tệp kể cả `orders-cong-bo.test.ts`); `npm test` 3194 xanh + 1 todo, 0 đỏ; typecheck 0 lỗi; e2e `dieu-phoi xe-dang-chay van-chuyen dieu-phoi-chay-dua` 7/7 xanh.
- Đột biến P16 (2026-10-05) — hàng rào 1: bỏ vế `(l.ma === "CAM_KET" && !co.camKet)` khỏi `loiKiem` → 5 bài Đợt 7 ĐỎ (bài 2–3, 5, 6, dời, THEM_KHI_CHAY); hoàn nguyên → xanh.
- Đột biến P16 (2026-10-05) — hàng rào 2: bỏ `b.camKetPhaLe` khỏi điều kiện 403 của route `POST …/doi` → bài 4 ĐỎ (`invalid_input` thay vì 403); hoàn nguyên → xanh.
- Kiểm lại hai việc Task 3 làm sẵn: (a) `.some(MOC_TOI_THIEU)` ở xếp / thêm khi chạy / dời — khớp C6 (MOC đứng đầu; nay thêm nhánh `?? ck.phaLe` cho CAM_KET); (b) route PUT đọc `lichChungChang` sau `can()` — giữ, nay luôn dùng (kiểm cam kết cả khi không đổi xe, xem Ruling dưới) ⇒ M2 của người kiểm Task 3 không còn là truy vấn thừa.
- Ruling (điều phối): Global Constraints cấm "undefined → không cam kết" ⇒ `kiemCamKet` dùng thẳng `c.xeRieng`, `ch.choToiThieu` (bỏ `=== true`, `?? null`, `typeof … !== "number"`; R-CX bỏ qua khi `choToiThieu === null`) — kiểu đã bắt buộc — nếu sai: thêm ném lỗi khi `typeof xeRieng !== "boolean"`.
- Ruling: thứ tự mã 409 khi thiếu nhiều phá lệ theo C6: `can_pha_le` (mốc) > `chua_du_nghi` > `can_pha_le_cam_ket`; `lyDo` mang đủ mọi mã còn thiếu — vì C6 đã chốt thứ tự ưu tiên ghi sự kiện, dùng cùng thứ tự cho mã lỗi — nếu sai: đổi một dòng trong `loiKiem`.
- Ruling: lệnh không thể sinh CAM_KET (rút, huỷ, tạo chuyến) truyền `co.camKet: true` (như `nghi: true` có sẵn) — C7 — nếu sai: không ảnh hưởng (canPhaLe của ba lệnh này không bao giờ có CAM_KET).
- Ruling: `lenhSuaChuyen` kiểm cam kết trên chuyến SAU lệnh ở MỌI lần sửa (không đổi xe: `kiemCamKet` trực tiếp, KHÔNG đưa vào `canPhaLe` nên không chặn); dùng để (i) Quản trị gửi CHỈ `camKetPhaLe` phá lệ vi phạm sinh do sửa đơn (khuôn `nghiPhaLe`; lệnh "không đổi gì" vẫn chạy khi có câu ghi cam kết, detail "phá lệ cam kết"), (ii) xoá cột khi hết vi phạm kèm một thay đổi khác. Sửa chỉ-không-đổi-gì mà chỉ có việc xoá cột cũ thì vẫn KHÔNG ghi — vì "không đổi gì — không ghi" là hành vi cũ — nếu sai: thêm điều kiện xoá vào lối thoát sớm.
- Ruling: `camKetPhaLe` gửi khi khoá hiện tại ĐÃ khớp cột → bỏ qua (giữ lý do cũ, không ghi sự kiện) — cùng tinh thần C8 — nếu sai: cho ghi đè lý do.
- Ruling: lệnh dời — chuyến NGUỒN xử lý luôn ở Task 4 (kế hoạch Task 4 và Task 5 cùng ghi; điều phối giao Task 4): chỉ tính khi nguồn đang có cột; hết vi phạm → câu xoá trong cùng lô (gác chuyến ĐÍCH, như mọi câu sau cổng đôi), nhật ký "<mã nguồn>: hết vi phạm cam kết — bỏ phá lệ cam kết"; còn vi phạm → giữ cột (C7). Task 5 chỉ còn rút / cập nhật khách / cập nhật điểm / cổng xuất bến.
- Ruling: câu `TRIP_CAM_KET_PHA_LE` gác bằng `EXISTS (… id = ?5 AND last_cmd_id = ?2)` (không `WHERE id = ?1 AND last_cmd_id = ?2`) để câu xoá chuyến nguồn của lệnh dời qua luật 3 của bài thứ tự lô (gác chuyến ĐÍCH); vị trí: `loSuaChuyen` sau câu điểm, TRƯỚC câu chụp giá (chụp vẫn cuối — bài ADR-0057 C4); `loXep`/`loThemDiemDangChay` cuối lô; `loDoi` sau câu bỏ điểm nguồn (xoá nguồn rồi ghi đích).
- Ruling: chữ nhật ký: ghi `· phá lệ cam kết: <nhãn lý do>`; xoá `· hết vi phạm cam kết — bỏ phá lệ cam kết`; `phaLeNhatKy` đổi sang bảng ba nhãn (trước đây CAM_KET sẽ in nhầm "khoảng nghỉ") — chữ bề mặt — nếu sai: sửa `TEN_LUAT_PHA_LE`.
- Luồng L: không thêm route ⇒ H2 không đổi; lớp chống ghi trùng băm cả thân ⇒ khoá thân mới `camKetPhaLe` tự vào vân tay, không cần sửa (e2e: "lớp vé … ghi nhiều lần ở 0 route").
- Nợ (Task 8b): giao diện chưa gửi `camKetPhaLe` (hộp phá lệ nối mã `CAM_KET` — C10). DTO nhật ký chuyến có `phaLe.luat` thô (`CAM_KET`), nhưng `web/` hiện không hiển thị `luat` (grep `.luat` ở `web/` rỗng) — nếu 8b hiển thị thì cần nhãn.
- Ghi chú (Task 4): `scripts/audit-checks.mjs` không có câu nào liệt kê `override_rule_code` / `MOC_TOI_THIEU` / `KHOANG_NGHI` (grep rỗng) ⇒ sự kiện mang `CAM_KET` không làm đỏ kiểm định kỳ hiện có. Tài liệu mô tả (`docs/SYSTEM-DESIGN.md` bảng route `PUT /chuyen/:id`, `phan-bo`, `doi`, `them-diem` chưa nhắc `camKetPhaLe` / 409 `can_pha_le_cam_ket`) để lại cho bước tài liệu của kế hoạch (dòng 388–389) — chưa sửa ở Task 4.
- Chưa kiểm (Task 4): câu `TRIP_CAM_KET_PHA_LE` mới chạy trên SQLite của khung thử; e2e bốn bộ điều phối chạy trên D1 local nhưng không kịch bản nào gửi `camKetPhaLe` ⇒ câu chưa chạy trên D1 thật.

## Task 5 — lệnh giảm khách + cổng xuất bến: xoá hoặc giữ phá lệ cam kết (C7)
- Đỏ trước: `cam-ket-xe.test.ts` bài ném lỗi → 1 đỏ (`Missing expected exception: xeRieng undefined`); `cam-ket-giam-khach.test.ts` (mới) → 3 đỏ / 7 (rút hết vi phạm, xuất bến hết vi phạm, cập nhật khách/điểm hết vi phạm: cột còn khoá thay vì NULL; 4 bài còn lại — giữ / không chặn — đã xanh nhờ Task 3–4, giữ làm lưới); `thu-tu-lo.test.ts` → 2 đỏ (bài Task 4 mở rộng danh sách + bài Task 5). Xanh sau mã: 46/46 bốn tệp; `npm test` 3203 xanh + 1 todo, 0 đỏ; typecheck 0 lỗi; e2e `dieu-phoi xe-dang-chay van-chuyen dieu-phoi-chay-dua` 7/7 xanh (không có bộ tên `chuyen`).
- Đột biến P16 (2026-10-05): (a) `lenhRut` truyền `camKet: null` thay `ck.lo` → bài 3c (rút) ĐỎ; hoàn nguyên → xanh. (b) `xoaCamKet = false && …` trong `lenhXuatBen` → bài "hết vi phạm do sửa đơn — xuất bến xoá cột" ĐỎ; hoàn nguyên → xanh.
- Ruling (điều phối): `kiemCamKet` NÉM lỗi khi `xeRieng` không phải boolean hoặc `choToiThieu` không phải null / số nguyên (Global Constraints) — `npm test` xanh nên không bộ dựng mẫu nào còn thiếu trường; `web/` không import luật này (grep rỗng) nên không có đường làm sập màn — nếu sai: hạ thành lý do giữ.
- Ruling: gộp `camKetNguonSauDoi` (Task 4) thành MỘT hàm `camKetSauGiam(db, trip, legIdsSau, lich, chung)` cho bốn nơi: rút, nguồn của dời, cập nhật khách, cập nhật điểm; chỉ gọi `camKetSauLenh(…, null)` nên KHÔNG BAO GIỜ ghi phá lệ mới, chỉ xoá; định nghĩa "chặng có khách mở" tách thành `legKhachMo` dùng chung với `changTrenChuyen` — vì một luật một chỗ — nếu sai: tách lại từng lệnh.
- Ruling: không đọc được xe của chuyến ⇒ GIỮ cột (chú thích một dòng tại chỗ) — vì không đủ dữ liệu để kết luận "hết vi phạm"; cổng xuất bến tự kiểm lại.
- Ruling: lối thoát "không có việc" giữ nguyên (`cập nhật điểm` / `cập nhật khách` không suất nào lệch → 0, không ghi — I42): KHÔNG thêm lô chỉ-để-xoá cột — vì đổi hành vi "không đổi gì — không ghi" đã khoá; cổng xuất bến là lưới (thấy hết vi phạm thì tự xoá trong lô xuất bến) — nếu sai: thêm điều kiện xoá vào lối thoát.
- Ruling: `cập nhật điểm` trên xe ĐANG CHẠY (Đợt 5 D5.3a) KHÔNG chạm cột — vì cột lúc đó là dấu phá lệ đã cho xe xuất bến, kiểm định kỳ Task 6 đọc chuyến đang / đã chạy — nếu sai: bỏ điều kiện `chay`.
- Ruling: lô xuất bến đặt câu xoá (`CAM_KET_PHA_LE`, tham số null) SAU bản chốt, TRƯỚC câu sang RUNNING; bài thứ tự lô kiểm riêng vì câu sang RUNNING mang nhãn `GHI` (không phải `TRANG_THAI_CUOI`); nhật ký xuất bến nối `· hết vi phạm cam kết — bỏ phá lệ cam kết` — chữ bề mặt.
- Ruling: bài route Task 5 ở tệp MỚI `src/modules/van-chuyen/cam-ket-giam-khach.test.ts` (không chép vào `dieu-phoi.test.ts`) — vì xuất bến cần đồng hồ giả của `tests/audit/dieu-phoi-khung.mjs` (Kiểm định + Bảo hiểm, GPLX đã gieo); mỗi ca một thế giới, đồng hồ chỉ tiến tới 12:40 SAU mọi lệnh kế hoạch (trong 6 giờ rút / ghép đòi phá lệ mốc) — nếu sai: chuyển bài.
- Ruling: tiêu chí 3b vế "bật xe riêng ở chặng khác" thử bằng bật xe riêng ở chặng của đơn B (đơn khác trên chuyến) — vì khung đơn một chặng; ca "chặng thứ hai của A" đã có ở bài luật thuần `cam-ket-xe.test.ts` ("bật xe riêng ở chặng thứ hai của A … khoá khác") — nếu sai: thêm ca đơn hai chặng cùng chuyến.
- Sửa đơn trong bài đi đường thật `PUT /api/orders/:id/legs/:legId` (Bán hàng, ô `order.trip.edit`); phá lệ đi đường thật Task 4 (Quản trị gửi `camKetPhaLe` khi xếp). Không còn câu SQL thẳng vào `ord_transfer_leg` ở bài Task 5; bài "khuôn nghiPhaLe" của Task 4 (`dieu-phoi.test.ts`, từng ghi "đường route: Task 5") nay cũng bật xe riêng qua `PUT /legs` (commit sau). Hai chỗ SQL thẳng còn lại (`orders/lich-chung-chang.test.ts`, `van-chuyen/xe-dang-chay-route.test.ts`) là gieo dữ liệu của bài đọc / xe đang chạy, không thuộc Task 5 — giữ.
- Chưa kiểm (Task 5): câu xoá trong lô rút / cập nhật / xuất bến chạy trên SQLite của khung thử; e2e không có kịch bản cam kết ⇒ chưa chạy trên D1 local thật. Tài liệu mô tả (`docs/SYSTEM-DESIGN.md`) để bước tài liệu.

## Task 6 — kiểm định kỳ R-VC-25 + bốn dòng sổ hàng rào
- Đỏ trước: `node --test src/audit-invariants.test.ts` → 1 đỏ / 118 ("phải có đúng một kiểm R-VC-25"). Xanh sau câu SQL: 118/118; `npm test` 3204 xanh + 1 todo, 0 đỏ; typecheck 0 lỗi.
- Đột biến P16 (2026-10-05): R-VC-25 đổi `commitment_override_reason_code IS NULL` thành `IS NOT NULL` → bài R-VC-25 ĐỎ; hoàn nguyên → xanh. Hàng rào 6: thêm khoá thừa `ghiChuNoiBo` vào `lichChungChang` → TC-20 ĐỎ; hoàn nguyên. Hàng rào 2: bỏ `|| b.camKetPhaLe` ở TỪNG trong bốn route → bài "Đợt 7 bài 4" ĐỎ mỗi lần; hoàn nguyên. Hàng rào 1: dùng đột biến Task 3/4 đã ghi ở trên.
- Ruling: "bản chụp xuất bến" = lần kiểm `vc_trip_departure_check` có `ket_qua = 'DAT'` mới nhất (cột `passenger_capacity`); chuyến không có bản chụp ĐẠT thì vế số chỗ không đếm — vì không có số chỗ để so — nếu sai: so với số chỗ hiện tại của xe.
- Ruling: "khách mở lúc xuất bến" = suất PASSENGER có `valid_to_at IS NULL OR > departed_at` (đúng kế hoạch, không lọc `valid_from_at`) nên suất thêm SAU xuất bến mà chưa đóng cũng tính — vì phá lệ khi chạy đã phải để lại dấu cột — nếu sai: thêm `valid_from_at <= departed_at`.
- Ghi chú: `node scripts/audit-invariants.mjs --db local` thoát 1 chỉ vì `R-N1-5` (D1 local không có quản trị viên đang hoạt động, không liên quan Đợt 7); dòng R-VC-25 ✓.
- Không có tài liệu liệt kê mã kiểm định kỳ (grep `R-VC-24` chỉ ra sổ hàng rào, CHANGE-GUIDE mô tả, nhật ký, bài) nên không sửa thêm; `docs/SYSTEM-DESIGN.md` để bước tài liệu.

## Task 7 — e2e `tests/e2e/cam-ket-xe.mjs`
- Kịch bản mới trên D1 local thật (Đối tác dùng một lần lập nháp xe riêng; xếp A, B, C; 409 / 403 / 200; rút B và C → hai cột trống đọc D1; minVehicleSeats 30 trên xe 15 chỗ → xuất bến 409 CAM_KET). Thêm tên vào `ALL` và `THOI_GIAN` của `run.mjs` (sau `khung-ban-xe`).
- Chạy: `npm run test:e2e -- cam-ket-xe` 4/4 xanh; đủ bộ `npm run test:e2e` 50/50 xanh (3 nhóm, 406 giây, audit-invariants đạt).
- Ruling: lập nháp của Đối tác trả 201 (không phải 200 như phiếu việc ghi) — vì route tạo đơn trả 201 — nếu sai: không ảnh hưởng.
- Ruling: đơn A của Đối tác do Quản trị xác nhận (Bán hàng không phải người phụ trách) — vì không dựa vào ô `ownOrAssigned` — nếu sai: đổi người xác nhận.
- Ghi chú: bài e2e đầu tiên chạy là xanh ngay (máy chủ đã đúng từ Task 2–6); hàng rào của bài là các đột biến đã ghi ở Task 3–6.

## Task 8a — hộp phá lệ nhận mã cam kết + DTO lịch chung
- Đỏ trước: `lich-chung-cam-ket.test.ts` → đỏ (`xeRieng` undefined). Xanh sau `changLichDto` + `ChangLichDto`. Bài danh sách trắng khoá `GET /lich` (`dieu-phoi.test.ts`) phải sửa có chủ đích thêm `xeRieng`, `choToiThieu`.
- Hàm thuần `thanPhaLe` (`src/shared/dieu-phoi-man.ts`) dựng thân gửi lại theo MÃ lý do của 409: `CAM_KET` → `camKetPhaLe`, không bao giờ qua `phaLe`. Nối ở: xếp (`web/dieu-phoi.ts`), thêm điểm khi xe đang chạy + rút + dời (`web/chuyen.ts`), sửa chuyến (`web/chuyen-sua.ts`).
- Đột biến P16 (2026-10-05): vô hiệu dòng `CAM_KET → camKetPhaLe` trong `thanPhaLe` → bài `thanPhaLe` ĐỎ (28/29); hoàn nguyên → xanh.
- Ruling: đường xếp / dời / thêm điểm giữ `phaLe` cho mọi mã khác cam kết (kể cả danh sách mã rỗng) — vì hành vi cũ — nếu sai: đổi cờ `rieng` thành true ở ba nơi gọi.
- Ruling: `moPhaLe` không đổi; lời cam kết hiện qua dòng tóm tắt (`l.lyDo` → `loiNhan`) — vì khuôn có sẵn — nếu sai: thêm khối riêng ở hộp.
- Kịch bản Chrome: `docs/evidence/2026-10-05-cam-ket-xe/kich-ban/cam-ket-xe-smoke.mjs` (5 bước, 1040 + 390, Bán hàng → Quản trị), ảnh ở `docs/evidence/2026-10-05-cam-ket-xe/anh/`. `dieu-phoi-smoke` 11/11, `chuyen-smoke` 9/9, `chuyen-sua-smoke` 13/13 xanh.

## Task 8b — giao diện hai ô cam kết và nhãn (2026-10-05)

- Ruling: `--w-dd-phu` 140px → 170px — vì ảnh 1040 cho thấy ô "Xe tối thiểu" cắt chữ gợi ý ("Để trống = khôn…") và chữ gợi ý ép nhiều dòng khi lưới chia hai cột trong thẻ hẹp; 170px cho lưới một cột trong thẻ hẹp, còn ở 390 vốn một cột. Ảnh hưởng cả ô "Số hiệu chuyến bay" và "Số người chiều về" (cũng xuống một cột ở thẻ hẹp) — nếu sai: trả 140px.
- Ruling: đối chứng "đổi giờ dưới mốc" của kịch bản dùng tài khoản Bán hàng nên bị dải lỗi mốc chặn (không có khung đặt gấp, vì Bán hàng không có ô duyệt); điều cần chứng minh (chỉ đổi cam kết thì KHÔNG bị mốc chặn, KHÔNG gửi `datGap`) vẫn đạt.
- Nợ: kịch bản cũ `dat-gap-smoke` (bước 3, 7, 8, 10) và `a2-smoke-order` / `a2-smoke-form` đỏ sẵn do `call()` đăng nhập lại làm phiên trình duyệt hết hạn (sổ phiên một máy, ADR-0075) hoặc kịch bản cũ chưa biết khối "Hành khách" — không do Task 8b.
- Bằng chứng "đỏ sẵn" (vòng sửa 8b): chạy `a2-smoke-form`, `a2-smoke-order`, `dat-gap-smoke` trên `dc1ef1fe` (trước Đợt 7) cho ĐÚNG các bước đỏ như ở nhánh Đợt 7 (a2-smoke-form: deep-equal thứ tự thẻ; a2-smoke-order: hết giờ "form mở lại đơn"; dat-gap-smoke: ✗ 3, 7, 8, 10). Không phải hồi quy của Đợt 7.

## Task 9 — tài liệu, nhật ký phiên bản 1.81, câu Trợ giúp (2026-10-05)
- Tài liệu mô tả: `docs/SYSTEM-DESIGN.md` (cột mới ở bảng `ord_transfer_leg` / `vc_trip`, dòng migration `0077`, năm dòng route — sửa chuyến, xếp, dời, thêm điểm, xuất bến — cộng ô `trip.override`, DTO lịch chung, một đoạn "Cam kết xe riêng / số chỗ" ở §6 gồm R-XR, R-CX, R-VC-25); `docs/CHANGE-GUIDE.md` (công thức **z13** "thêm một luật phá lệ được", dòng ở bảng §1, bẫy **60** gồm bẫy C6 một ô phá lệ trên sự kiện); thiết kế `2026-09-29-bang-dieu-phoi-chung-design.md` dòng 166 sửa đúng câu "Mới" của bảng "Câu ADR bị thay" (ADR-0056 không sửa).
- Nhật ký phiên bản `changelog.ts` mục **1.81** (main hiện 1.80), `app-info.test.ts` đo 1.81. Trợ giúp: một câu cho Bán hàng (bước 5 phần Đưa đón, nút `[[Xe riêng]]`, `[[Xe tối thiểu]]`) và một câu cho Quản trị (mục "Phá lệ khi điều xe"). Hai nhóm đang sát trần 30 phút (còn 1 và 2 chữ) nên CẮT chữ chỗ khác, không nới ngưỡng: Bán hàng bỏ hai gạch của "Thiếu thông tin chuyến" (trùng câu ở phần xác nhận); Quản trị bỏ ví dụ Đặt gấp và một câu hỏi thường gặp trùng ý. Sau cắt: Bán hàng còn 10, Quản trị còn 21 chữ. Không đụng `tro-ly-cau-truc-ten.ts` nên không chạy lại `sinh-so-do-trang.mjs`.
- Ruling: lời nhật ký phiên bản mô tả luôn cả phần máy (chặn / phá lệ / tự bỏ dấu phá lệ / kiểm định kỳ) vì cùng một bản phát hành 1.81 (máy chủ + giao diện) — nếu sai: bỏ dòng thứ ba.
- Ruling: số công thức z13 và bẫy 60 đặt theo số lớn nhất hiện có + 1 (z12 đã có; bẫy 59 là lớn nhất) — nếu một nhánh khác đã lấy, đánh lại lúc gộp.
- Đề xuất cho chủ (KHÔNG tự sửa — CLAUDE.md thuộc luật, N9): (a) `web/CLAUDE.md` bảng kịch bản Chrome (dòng ~68, ~70) thêm `docs/evidence/2026-10-05-cam-ket-xe/kich-ban/cam-ket-xe-smoke.mjs`; (b) CLAUDE.md gốc không có số migration hay tên tệp lệch vì Đợt 7 (`0077`), nên chưa cần đổi.

## Kiểm độc lập toàn nhánh (2026-10-05)
- Kết luận: ĐẠT (người kiểm độc lập, chỉ đọc; báo cáo gốc `.superpowers/sdd/dot-7/kiem-doc-lap.md`). `npm run typecheck` 0 lỗi; `npm test` 3212 đạt / 0 đỏ / 1 todo; e2e đủ bộ 45/45; `audit-invariants --db local` chỉ R-N1-5 đỏ sẵn (dữ liệu local, không do Đợt 7).
- Bốn đột biến riêng người kiểm tự gây rồi hoàn nguyên, đều đỏ đúng chỗ: biên R-CX, 403 của route thêm điểm, khoá C5, và `&& !ghiCamKet`.
- `dat-gap-smoke` ở HEAD đỏ đúng các bước 3/7/8/10, y hệt bản trước Đợt 7 (`dc1ef1fe`) — đỏ sẵn, không phải hồi quy.
- Trợ giúp bị cắt chữ để giữ trần 30 phút: Bán hàng mất câu "Giờ đón sau giờ khởi hành" và câu về ngày khởi hành đã qua; Quản trị mất ví dụ Đặt gấp và câu "Chỉ Quản trị và Toàn quyền duyệt Đặt gấp" (ghi ở "Nợ / để sau").
- Minor đã sửa sau kiểm: ngưỡng số chỗ 1..100 ở `src/shared/chang-form.ts` nay dùng hằng `CHO_TOI_THIEU_MIN` / `CHO_TOI_THIEU_MAX` của `chang-dua-don.ts` (trùng máy chủ), kèm bài khoá ngưỡng trong `chang-form.test.ts`; thử đột biến đổi MAX thành 120 thì bộ bài đỏ, hoàn nguyên thì xanh.

## Nợ / để sau (gom từ các minor còn mở, Task 1–8b)
- Task 1: regex TC-3 lỏng `/constraint|commitment/` nên ghim "CHECK constraint failed"; đột biến P16 riêng cho migration chưa làm.
- Task 2: bài 3 thiếu ca `exclusiveVehicle: null` → 400; bài 4 ca 403 thiếu đối chứng; dòng `sau` trong `planEditLeg` dài; chú thích `LEG_SET_DAT_GAP` chưa nhắc cam kết.
- Task 3: route PUT đọc `lichChungChang` cả khi không đổi xe (nay đã dùng cho kiểm cam kết nên không còn thừa); lời "ghép vào xe riêng của X" phụ thuộc thứ tự chặng khi có hai đơn xe riêng.
- Task 4: sửa chuyến không đổi gì không xoá cột cũ dù hết vi phạm (cổng xuất bến xoá — lưới); chưa có bài thiếu nghỉ + trái cam kết cùng lúc; câu `TRIP_CAM_KET_PHA_LE` mới chạy trên SQLite khung thử và e2e (Task 7 đã phủ trên D1 local).
- Task 5: dòng `min_vehicle_seats` hỏng (SQL tay) làm `kiemCamKet` ném → 500 cả bảng điều phối (CHECK 0077 chặn đường thường); bài 3b vế 2 bật xe riêng ở chặng B thay vì chặng khác của A; cột phá lệ "mồ côi" trên chuyến PLANNED khi lệnh cập nhật thoát sớm (đã chấp nhận — Ruling Task 5).
- Task 6: bài thiếu ca "vế (b) có phá lệ" và "không có bản chụp ĐẠT"; bản chụp lệch nếu đổi xe giữa chuyến; suất thêm sau xuất bến chưa đóng vẫn tính mở.
- Task 7: không assert quyền PARTNER của tài khoản; không đếm suất B sau 403; 403 chỉ kiểm status, không `error.code`.
- Task 8a: bài DTO chưa phủ tiền tố `xe:`; tam phân trong `thanPhaLe` khó đọc; thiếu ca `KHOANG_NGHI` `rieng=false`; Chrome chưa phủ cam kết ở sửa chuyến / thêm điểm / dời.
- Task 8b: ngưỡng 1..100 trùng máy chủ chưa dùng chung hằng; ca đối chứng "đổi giờ dưới mốc" dùng Bán hàng yếu. Kịch bản cũ `dat-gap-smoke`, `a2-smoke-order`, `a2-smoke-form` đỏ sẵn trên bản trước Đợt 7 (không phải hồi quy).
- Khác: DTO nhật ký chuyến có `phaLe.luat` thô (`CAM_KET`), `web/` chưa hiển thị nhãn `luat`; chưa thử trên iPhone thật; chưa có người kiểm độc lập cho Task 9 (việc tài liệu, nhưng nhật ký + Trợ giúp chạm test chặn A2/A4).
- Số đo sống lại: `src/shared/tro-ly-van-nghia.test.ts` bài C4 (đo trên kho Trợ giúp thật) đỏ sau khi thêm / bớt chữ Trợ giúp — "than phiền" Bán hàng 15 → 17; theo chú thích của chính bài (đo lại, sửa số kèm lý do, không nới luật) đã sửa số và ghi lý do; hành vi (trần 12, đoạn chọn) không đổi.
- Kiểm độc lập toàn nhánh: Trợ giúp bị cắt chữ (trần 30 phút) — Bán hàng mất câu "Giờ đón sau giờ khởi hành" và câu ngày khởi hành đã qua; Quản trị mất ví dụ Đặt gấp và câu "Chỉ Quản trị và Toàn quyền duyệt Đặt gấp"; khôi phục khi nâng trần hoặc có chỗ khác trong Trợ giúp.
