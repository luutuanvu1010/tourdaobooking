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
- Nợ (Task 4): nối đầu vào cam kết ở lệnh chưa có bài máy chủ/e2e riêng — `loiKiem` vẫn LỌC MẤT `CAM_KET` nên lệnh xếp chưa bị chặn ở route (đúng kế hoạch); bài 2 của Task 4 phải đỏ trước. Cổng xuất bến đã giữ thật (`lyDo` không qua `loiKiem`).
