# Kế hoạch thi công ADR-0229 — Giá mùa vụ (Việc 10)

> **Loại tệp:** kế hoạch (hồ sơ có ngày). **Ngày:** 22/11/2026. **Người lập:** phiên Việc 10 (`claude/modest-goldstine-a52295`).
> **Căn cứ:** `docs/adr/ADR-0229-gia-mua-vu.md` (chủ duyệt 22/11, «Duyệt đề xuất»); sổ vàng `docs/superpowers/specs/2026-11-21-so-vang-gia-mua-vu.md` + `src/shared/gia-mua-vu.so-vang.json`.
> **Điều kiện bắt đầu T1 trở đi:** (1) nhánh ADR-0218 `claude/redesign-pricing-subsystem-50496b` đã vào `main` (điều phối báo); (2) Kế toán xác nhận sổ vàng **trước khi nhận mã tiền** (Hiến chương 5.17 — mã có thể viết trước, nhưng chưa coi là xong). **Lượt nhập:** CUỐI CÙNG trong 16 việc (sau Việc 1).
> **Loại:** việc lớn (tiền, quyền, dữ liệu) ⇒ người kiểm độc lập sau thi công; giao diện ⇒ người đánh giá giao diện. Bộ kiểm nặng chạy MỘT LẦN ở cuối với khoá `~/.cache/tourdao-kiem-nang.lock`.

## Tiêu chí xong (từ ADR, viết trước khi làm)
ADR-0229 mục «Tiêu chí nghiệm thu» 1–9 (gồm 1b, 1c, 1d) đều có bài kiểm tự động; sổ vàng qua 100 %; `npm test`, `npm run typecheck`, e2e, kịch bản Chrome xanh; người kiểm độc lập «đạt».

## Các task (mỗi task: bài đỏ trước → mã → xanh → một lần lưu)

**T0 — Chuẩn bị.** Gộp `main` mới nhất (đã có ADR-0218) vào nhánh; `npm ci`. Kiểm lại số 0188, 0189 còn trống trên mọi nhánh chưa gộp (`git ls-tree --name-only <nhánh> migrations/`). Grep lại các khẳng định mã của ADR Đ10 (năm nơi gọi `tienChoHoaHong`, ba nơi gọi `tinhDongDoiTac`) vì ADR-0218 và các việc 2–8 có thể đã đổi.

**T1 — Hàm thuần `src/shared/gia-mua-vu.ts`.** `tinhGiaMuaVu`, `kiemQuyTacMoi`, `kiemChongNgay`, `coSoHoaHong`, `cungMua`, kiểu `QuyTacMuaVu`. Không I/O, không import `src/modules/`. Bài đỏ đã có: `src/shared/gia-mua-vu.test.ts` (giá C1–C19, nhập V1–V11, chồng ngày O1–O6, hoa hồng H1–H11, cùng mùa M1–M10). Quan sát đỏ thật một lần (sửa cố ý làm tròn → đỏ → hoàn nguyên) rồi thêm dòng sổ hàng rào. Không nhân/chia 10000 trong tệp này (hàng rào `src/hoa-hong-mot-nguon.test.ts`).

**T2 — Migration 0188** (`ctl_seasonal_price` + `ctl_seasonal_price_cap`), khuôn 0180: CHECK phạm vi; `pct` nguyên 0…100; `amount` ≥ 0; ít nhất một > 0; `approved_by <> created_by`; trigger cấm xoá; trigger chỉ cho đặt `approved_at/by` một lần và `ended_at` một lần; trigger chồng ngày (cùng `scope` + cùng mã, quy tắc chưa kết thúc, kể cả chờ duyệt). Bảng trần chỉ-thêm theo `valid_from`, gieo một dòng 30. Bài `src/migrations-gia-mua-vu.test.ts` (trigger chặn thật). `docs/data-dictionary.json` + `npm run dict`.

**T3 — Migration 0189** — `order_item.base_price`, `seasonal_rule_id`, `seasonal_increase` (NULL được, `seasonal_increase` ≥ 0); trigger khoá ba cột khi đơn không còn nháp (0081 không tự phủ). Bài migration + từ điển dữ liệu. Thêm vào danh sách xoá–chèn nháp nếu có (ADR-0047).

**T4 — Quyền, nhật ký, từ ngữ.** `src/shared/permissions.ts`: `catalog.seasonal.write`, `catalog.seasonal.approve` = `keToanQuanLy()`; `catalog.seasonal.cap` = chỉ SUPER_ADMIN. KHÔNG thêm vào `O_GHI_TIEN` (bài canh có sẵn). Ghim từng ô ở `permissions.test.ts`; `route-access.test.ts`, `route-write-guard.test.ts`. Ba hành động `audit-actions.ts` (đặt, duyệt, kết thúc) + nhãn. Tên nút, nhãn: tra `docs/BANG-THAM-CHIEU.md`, chưa có thì đưa 2–3 tên về điều phối (đề xuất «Giá mùa vụ»).

**T5 — Phân hệ danh mục.** Tệp nửa nghiêm `catalog/gia-mua-vu-repo.ts` (`defineSql`, khuôn `ngung-ban-ngay-repo.ts`), `gia-mua-vu-route.ts`: `GET` danh sách (ô write), `POST` đặt, `POST …/:id/duyet` (ô approve, người khác người đặt, kiểm lại trần + chồng ngày + ngày cuối + chưa kết thúc), `POST …/:id/ket-thuc`, `GET/POST` trần (ô cap). Đối tác bị từ chối dù tài khoản lai. Công bố qua `catalog/index.ts`: `quyTacMuaVuDangAp(db, codes)` (đã duyệt, chưa kết thúc) và `quyTacMuaVuTheoId(db, ids)` (cho Đ6, kể cả đã kết thúc). Bài route thật khuôn `orders/ngung-ban-ngay-cong-route.test.ts` (tiêu chí 5, 6, 7, 9).

**T6 — Dựng dòng đơn (Đ4, Đ5, Đ6 nháp, Đ7).** `catalogService`: lấy quy tắc của ngày đi dịch vụ, dựng `CatalogService` đã cộng mùa vụ rồi gọi `buildLines` (số lời gọi không đổi — `buildlines-guard`); chụp `base_price`, `seasonal_rule_id`, `seasonal_increase`; điều kiện `kept` thêm «ngày đi không đổi» (`ctx.storedTrips`). `GET /api/catalog/for-order` nhận ngày đi, trả giá đã cộng; văn phòng nhận thêm %/số tiền, Đối tác không. `GET /api/catalog` giữ giá gốc. BK5 so giá đã cộng. Bài: tiêu chí 2, 4, 1d.

**T7 — Đ7b.** `catalogStatusOf` nhận quy tắc + ngày đi, so với `tinhGiaMuaVu`; hai nơi dùng (`orders/service.ts` cờ nháp, `xac-nhan-chung.ts` `congGiaDanhMucDoi`) truyền xuống. Bài tiêu chí 1c (Đối tác chặn, văn phòng chỉ cờ).

**T8 — Đ6 đơn đã chụp.** Hàm cổng `congCungMua` ở `orders` (khuôn `congNgungBanNgay` trong `orders/cong-ban.ts`), gọi `cungMua` cho từng dòng có mã ở sáu cửa đổi ngày của `CUA_NGUNG_BAN_NGAY` (trừ `POST /api/orders`). Bài lưới «mỗi cửa gọi cổng» (khuôn `src/ngung-ban-ngay-moi-cua.test.ts`), quan sát đỏ thật. Bài route tiêu chí 3.

**T9 — Đ10 hoa hồng.** `tinhDongDoiTac` nhận `coSoHoaHong` bắt buộc; `tienChoHoaHong` nhận `unitPrice` + `seasonalIncrease`, trả `coSoHoaHong`; năm nơi gọi; câu đọc (`ITEM_SELECT`, `thuong-mai-repo.ts`, `docGiaDaiLyNhieu`), `StoredService.items`, `snapshotService` / nhánh tính lại ở `gia-dai-ly.ts`; `chenhGiamGiaSauGhiTay` nhận cơ sở; `cauXemTruocGiaDaiLy` để nguyên kèm chú thích. DTO Đối tác không chứa bốn trường (bài kiểm). Bài canh mọi lời gọi truyền cơ sở. Bài tiêu chí 1b (thương mại, giá đại lý, ghi tay, «Đã giao», trần 90.000). Đối chiếu Việc 6 đọc giá đại lý từ cùng chỗ.

**T10 — Giao diện.** Màn Dịch vụ & giá + chỗ «Giá theo mùa» ở Chi tiết dịch vụ: danh sách (chờ duyệt / đang áp / đã kết thúc), đặt, Duyệt (ẩn trên quy tắc mình đặt), Kết thúc, trần (Toàn quyền). Form lập đơn gửi ngày đi khi đọc danh mục, đổi ngày thì đọc lại; dòng «Giá mùa vụ» chỉ văn phòng. Dựng bằng `h()`, token CSS, ô gõ 16px, khung gốc nếu màn đã chuyển. `npm run build:web`; đo trần gói trang, trình điều phối **một con số**. Người đánh giá giao diện (390 + 1280).

**T11 — Tài liệu sống.** `SYSTEM-DESIGN` §5–§7, `CHANGE-GUIDE` (công thức giá mùa vụ + bẫy «catalog_price đã gồm mùa vụ»), bảng tham chiếu, sổ hàng rào (sổ vàng; mỗi cửa cùng mùa; mọi lời gọi truyền cơ sở hoa hồng — kèm ngày quan sát đỏ), mục nhật ký thay đổi (số tạm, đổi lúc nhập).

**T12 — Kiểm cuối.** Lấy khoá; `npm test`, `npm run typecheck`, `npm run test:e2e`, kịch bản Chrome liên quan; nhả khoá. Người kiểm độc lập (tiền, quyền, dữ liệu) — chỉ báo «đạt» dựa trên báo cáo đó + bài kiểm. Gộp `main` mới nhất, đổi số nhật ký thay đổi, đo lại trần gói trang, rồi trình điều phối lệnh `npm run day-len` (không tự nhập, không push). Triển khai có migration 0188–0189 ⇒ chủ chạy `npm run trien-khai`.

## Thứ tự và phụ thuộc
T0 → T1 → (T2, T3, T4 song song được) → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12. T9 đụng `billing` và các nơi Việc 6 đọc: nếu Việc 6 đã vào `main` thì gộp trước T9.

## Rủi ro đã biết
- ADR-0218 và các việc 2–8 cùng sửa `orders/` và `catalog/`: xung đột khi gộp — T0 grep lại mọi khẳng định mã.
- Trần gói trang Đơn hàng đang sát: T10 phải đo thật.
- HC-5.19: hai bảng mới chưa có diễn tập khôi phục — chủ đã chấp nhận rủi ro (dòng `xay_tren_cho_phep_adr_0229`).
