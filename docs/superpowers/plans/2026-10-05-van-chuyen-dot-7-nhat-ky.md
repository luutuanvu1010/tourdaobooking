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

## Task 1 — migration `0077` (ruling và kết quả ghi bên dưới khi làm)
