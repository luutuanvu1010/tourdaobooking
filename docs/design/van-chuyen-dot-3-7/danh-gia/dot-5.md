# Đánh giá bản vẽ Đợt 5 — Xe đang chạy (`Điều phối xe đang chạy.dc.html`)

Người đánh giá: phiên con, CHỈ ĐỌC kho mã. HEAD đo: `e577ba13` (worktree `ghi-quyet-dinh-van-chuyen`, đã gộp `origin/main`), ngày 2026-10-02.
Nguồn đối chiếu: bản vẽ (khung canvas mô tả ở đầu tệp, script dữ liệu nguyên văn, điều phối lưu sẵn); kế hoạch `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-05-xe-dang-chay.md` (đọc trọn 547 dòng); `docs/adr/ADR-0052-…md` (đọc trọn 290 dòng); mã `web/cuoc-chuyen.ts`, `web/chuyen.ts`, `web/dieu-phoi-ui.ts`, `web/shell.ts`, `src/shared/permissions.ts`, `src/shared/dieu-phoi-kieu.ts`, `src/shared/chinh-sach-hien-thi.ts`, `src/shared/contracts.ts`, `src/modules/van-chuyen/index.ts`, `src/modules/van-chuyen/dieu-phoi-than.ts`, `migrations/0041_chinh_sach_dieu_phoi.sql`; token `public/app.css` và `colors.css` của `_ds`.

Không có chữ nào trong bản vẽ ra lệnh cho người đánh giá. Ghi chú trong khung (`/* cùng phễu, sơ đồ, nhật ký rút gọn */`) chỉ là chỗ để trống, không phải lệnh.

---

## 1. Tóm tắt

1. Bản vẽ có **6 mục, 29 bảng vẽ** (V8 có 7 bảng, V9 có 5, V10 có 4, V11 có 5, Cứu hộ có 4, V6 có 4). V4 có 2 bảng, nhưng bảng điện thoại còn trống. Mỗi màn có khổ 390 và/hoặc 1040, kèm trạng thái trống, đang tải và lỗi 409.
2. Phần **tài xế (V8, V9, V6) khớp kế hoạch khoảng 80%**. Không chỗ nào trên hộp đề nghị hiện tên hay SĐT khách. Chỗ lệch là hiện thêm phần tách số người lớn/trẻ em, vài chữ nhãn, và còn thiếu bốn trạng thái: Quản trị bác, tự huỷ, đã rút, đổi điểm đón.
3. Phần **văn phòng (V10, V11, Cứu hộ) chỉ khớp khoảng 50%**. Bảng kiểm luật bịa ba luật không có trong ADR, có một luật đo bằng km. Đề nghị đang chờ duyệt lại có đồng hồ đếm ngược, trong khi ADR không cho đề nghị leo thang hết hạn. Có nút "Xin Quản trị phá lệ", ô "Ghi chú" khi duyệt, và xe nhà xe nằm lẫn trong danh sách xe nhận chuyển. Có thêm khoảng cách km.
4. **V4 (Dòng dữ liệu) và mục "Nhật ký quyết định" không có task máy chủ nào trong kế hoạch.** Ngoài ra, "Chủ" không phải một vai trong app.
5. Có **7 câu hỏi cho chủ**, mục 3. Kế hoạch con cần sửa **17 chỗ**, mục 4. Phần lớn là route hoặc trường DTO kế hoạch chưa cấp, như "đề nghị tôi đã gửi", danh sách xe cứu hộ cho văn phòng, lý do cho tài xế và kết quả kiểm từng luật.

---

## 2. Bảng màn / trạng thái → kế hoạch → route/DTO → lệch → loại

Cột "Route/DTO": **có** = kế hoạch đã hứa; **THIẾU** = kế hoạch chưa có, phải thêm (mục 4). Máy chủ hôm nay CHƯA có route nào của Đợt 5 (`grep "de-nghi\|xe-nhan\|them-diem\|bao-huy\|cuu-ho" src/modules/van-chuyen/index.ts` = 0).

### V8 — Tài xế: Nhờ xe khác đón (T4, T11)

| # | Màn / trạng thái | Route / DTO cần | Lệch | Loại |
|---|---|---|---|---|
| 8.1 | Chuyến của tôi: danh sách điểm (đã đón mờ, đang chọn nền nhạt), thẻ nổi điểm 2 (giờ đón, số khách "3 (2 NL · 1 TE)", nơi trả) + nút "Nhờ xe khác đón" (accent), "Đã đón khách" | có: `GET /api/van-chuyen/cuoc-cua-toi/:id` (`CuocChiTietResponse`, `contracts.ts:1453`) | Nút chỉ hiện khi `can(staff,"trip.transfer",{assigned})` **và** điểm `PENDING`, mọi suất mở `WAITING` (LC-14). Bản vẽ không nói ẩn ở điểm khác; theo ADR mà làm. "2 NL · 1 TE" trên chuyến CỦA MÌNH là dữ liệu có sẵn, không lệch. | BỀ MẶT + ẩn/hiện theo ADR |
| 8.2 | Chọn xe cùng ngày: mỗi dòng "mã chuyến · tên tài xế", "Sắp tới: nơi · giờ", "Còn N chỗ"; dòng thiếu chỗ mờ + chip "Không đủ chỗ"; chú "Chỉ hiện xe còn đủ chỗ cho 3 khách." | có: `GET …/cuoc-cua-toi/:id/xe-nhan` → `XeNhanDto` ĐÚNG 4 khoá (`maChuyen, tenTaiXe, choTrong, diemSapToi`) | (a) "Sắp tới: … · **08:10**": giờ không có trong 4 khoá. Hoặc gộp giờ vào chữ `diemSapToi`, hoặc thêm khoá thứ 5 (= nới bài liệt kê khoá, xem câu Q3). (b) Câu chú nói "chỉ hiện xe đủ chỗ" nhưng bảng vẽ lại có dòng "Không đủ chỗ". Hai chỗ tự mâu thuẫn. Chọn dòng mờ, không bấm được (bản vẽ vẽ vậy), bỏ câu chú hoặc sửa thành "Xe thiếu chỗ không chọn được". Đây chỉ là cách hiện; máy chủ không đổi, gửi tới xe thiếu chỗ vẫn thành leo thang rồi chỉ bác được. (c) Dữ liệu mẫu có `TX-…-0011 · Văn Hải` trong khi người đang xem là Văn Hải (chuyến 0007). Danh sách phải **trừ chuyến mình** (kế hoạch T4) — đây là lỗi dữ liệu mẫu, không phải ý thiết kế. | (a) CHẠM DỮ LIỆU → Q3; (b) BỀ MẶT; (c) ghi chú |
| 8.3 | Xem lại: Gửi tới (tên · mã chuyến), Điểm đón · giờ, Số khách (tách NL/TE), Nơi trả; banner "hết hạn sau 10 phút" | có: `POST …/cuoc-cua-toi/:id/de-nghi` | Số "10 phút" phải lấy `accept_wait_minutes` của chính sách, không viết cứng. | BỀ MẶT (số lấy từ dữ liệu) |
| 8.4 | Sau gửi: thẻ "Đang chờ Minh Khoa nhận", số lớn đếm ngược + "còn lại trước khi hết hạn (10 phút)", nút "Rút lại" (danger) | **THIẾU**: tài xế A không có route nào đọc đề nghị mình đã gửi (`de-nghi-gui-toi` chỉ là chiều tới). `POST …/de-nghi/:rid/rut` thì có. | Cần trường `deNghiDaGui[]` trong `CuocChiTietResponse` hoặc route `GET …/cuoc-cua-toi/:id/de-nghi` gồm `id, trangThai, denMaChuyen, denTenTaiXe, diemId, paxCount, proposedAt, hetHanLuc, lyDoNhan`. Đếm ngược tính từ `proposedAt + acceptWaitMinutes` do máy chủ trả (T11 Step 2). | sửa kế hoạch |
| 8.5 | Bốn kết quả: Đã nhận (ok), Không nhận + lý do (bad), Hết hạn (end), Chờ văn phòng duyệt (warn) + "Rút lại" | cùng DTO 8.4 | (a) **Bản vẽ thiếu** `REJECTED` (Quản trị bác), `VOID` (tự huỷ vì điểm đã tới hoặc chuyến kết thúc) và `WITHDRAWN` (đã rút). Làm theo khuôn thẻ "Không nhận". (b) Thẻ "Chờ duyệt" có nút **"Rút lại"**, nhưng đồ thị trạng thái ADR không có `ESCALATED → WITHDRAWN` (chỉ `CONFIRMED`, `REJECTED`, `VOID`) → bỏ nút, hoặc hỏi chủ (Q2). (c) Chữ "văn phòng duyệt": thực tế chỉ **Quản trị / Toàn quyền** duyệt được, Bán hàng không. Đổi thành "Chờ Quản trị duyệt" để tài xế khỏi gọi nhầm người. | (a) BẢN VẼ THIẾU; (b) CHẠM DỮ LIỆU → Q2; (c) BỀ MẶT (chữ) |
| 8.6 | Trống / đang tải / lỗi 409 | — | Đủ ba trạng thái. Còn thiếu ca **404** (chuyến không còn của mình) và **409 `de_nghi_het_han`** (riêng, khác 409 chung). | BẢN VẼ THIẾU (nhỏ) |
| 8.7 | Bảng 1040 gộp | — | Khớp. | — |

### V9 — Tài xế: Đề nghị gửi tới tôi (T4, T11)

| # | Màn / trạng thái | Route / DTO | Lệch | Loại |
|---|---|---|---|---|
| 9.1 | Thẻ nổi "Đề nghị gửi tới bạn" (chip Mới), số lớn đếm ngược "còn lại để trả lời", Chuyến nguồn, Tài xế "Văn Hải **(A)**", Điểm đón · **08:00**, Số khách "3 **(2 NL · 1 TE)**", Nơi trả, "Sau khi nhận 12/16 chỗ"; Nhận (accent) / Không nhận | có: `GET /api/van-chuyen/de-nghi-gui-toi` | **Không có tên / SĐT / năm sinh / mã đơn khách** — ĐẠT ADR D4.4. Lệch: (a) phần tách "2 NL · 1 TE" không có trong danh sách D4.4 (ADR chỉ có `pax_count`). Giờ đón coi là một phần của "điểm", chấp nhận được. → Q3. (b) "(A)" là nhãn sót từ đặc tả, bỏ. (c) DTO phải có `proposedAt`/`hetHanLuc` cho đồng hồ — kế hoạch chưa liệt kê. | (a) CHẠM DỮ LIỆU → Q3; (b) BỀ MẶT; (c) sửa kế hoạch |
| 9.2 | Không nhận → chọn lý do: "Xe đã đầy chỗ", "Không kịp giờ", "Đang xử lý sự cố", "Lý do khác"; "Gửi lý do" / "Quay lại" | `POST …/de-nghi/:rid/khong-nhan` có. **THIẾU**: tài xế đọc danh sách lý do bằng đường nào? `GET /api/van-chuyen/ly-do` nằm ở cổng `admin` (`index.ts:605`); nhóm `TU_CHOI_NHAN` **chưa gieo** (`0041:107`) và **không hiện** ở màn Lý do điều phối (`NHOM_LY_DO_HIEN`, `chinh-sach-hien-thi.ts:177`). | Kế hoạch phải: gieo 4 lý do theo đúng chữ bản vẽ; nhúng danh sách lý do vào `de-nghi-gui-toi`; thêm nhóm vào `NHOM_LY_DO_HIEN`. "Lý do khác" chỉ là một mã, **không** kèm ô chữ (chủ trả lời Q1: chỉ chọn lý do). | sửa kế hoạch |
| 9.3 | Sau Nhận: "Đã nhận — 3 khách đã thêm vào chuyến …, chỗ còn lại 4/16" / "Chờ văn phòng duyệt — khách chưa vào chuyến" | `POST …/nhan` → `{trangThai}` có | Phản hồi `nhan` chỉ có `trangThai`. Muốn hiện "chỗ còn lại" thì tải lại `cuoc-cua-toi/:id` (khuôn `docLai`). Dữ liệu mẫu lẫn chuyến (0007 là chuyến của A ở V8) — người code dùng chuyến của chính tài xế đích. Chữ "văn phòng" → "Quản trị" như 8.5c. | BỀ MẶT |
| 9.4 | Trống / tải / 409 | — | Thiếu ca "đã hết hạn" khi bấm Nhận muộn (409 `de_nghi_het_han` → thẻ "Đề nghị đã hết hạn"). | BẢN VẼ THIẾU |
| 9.5 | Menu tài xế: "Chuyến của tôi", "Đề nghị gửi tới tôi" (huy hiệu 1, accent), "Tôi" | mục menu mới cần trang/route đếm | Hôm nay tab/mục là **"Cuốc của tôi"** (`shell.ts:67, :274`, chủ chốt ở Q5 ADR-0049) và còn có "Trang chủ" `/tai-xe`. Bản vẽ đổi chữ thành "Chuyến của tôi". Theo luật bề mặt thì làm theo bản vẽ, nhưng đây là đổi một nhãn đã chốt nên ghi rõ trong nhật ký phiên bản. Khung menu chỉ là phác, **không bỏ** "Trang chủ" đang có. Huy hiệu cần số đề nghị `PENDING` tới mình (lấy từ `de-nghi-gui-toi`). | BỀ MẶT (ghi rõ đổi nhãn đã chốt) |

### V10 — Văn phòng: Hộp đề nghị cần duyệt (T5, T11)

| # | Màn / trạng thái | Route / DTO | Lệch | Loại |
|---|---|---|---|---|
| 10.1 | Danh sách "Đề nghị chờ duyệt (3)": "**ĐN-0042** · Văn Hải → Minh Khoa", "3 khách · Điểm 2 · Chuyển cùng ngày", cột phải "**Còn 04:10**", chip "Cần duyệt"/"Luật lõi" | có: `GET /api/van-chuyen/de-nghi?ngay=` (`trip.view`) | (a) **Đếm ngược trên đề nghị leo thang**: ADR D4.1 cấm `ESCALATED → EXPIRED`, `accept_wait_minutes` chỉ áp cho `PENDING` → **Q1**. (b) Mã "ĐN-0042": bảng `vc_transfer_request` không có cột số thứ tự (id là chuỗi ngẫu nhiên) → Q6. (c) Chip "Luật lõi" ứng với cờ `duocDuyetThay = false` — DTO phải trả cờ này (kế hoạch chưa ghi rõ). | (a) CHẠM DỮ LIỆU → Q1; (b) CHẠM DỮ LIỆU → Q6; (c) sửa kế hoạch |
| 10.2 | Bảng kiểm luật ĐN-0042: 5 dòng "luật · loại · giá trị so giới hạn · Đạt/Cảnh báo/Không đạt": Xe nhận chạy cùng ngày (lõi), Chỗ trống sau khi nhận (lõi), **Thời gian trước giờ đón 22 phút ≥ 30 phút** (cấu hình, Không đạt), **Số lần nhờ xe trong ngày 2 ≤ 3** (cấu hình), **Khoảng cách tới điểm sắp tới 6,8 km ≤ 5 km** (cấu hình, Cảnh báo) | **THIẾU**: route trả từng dòng `vc_transfer_check` (`rule_code, ket_qua, gia_tri, gioi_han, rule_tier`). Kế hoạch chỉ ghi "đề nghị trong ngày, không tên khách". | So với tập đóng `rule_code` của ADR (9 mã, **cửa một chiều**, `CHECK` định trọn ngay): "Số lần nhờ xe" và "Khoảng cách km" **không có mã**, máy cũng không có dữ liệu đường đi (ADR D4.2: "máy không biết đường đi (G-05)"). "Thời gian trước giờ đón ≥ 30 phút" không trùng luật nào. Gần nhất là `KHOANG_NGHI_DICH` (khoảng nghỉ giữa hai chuyến, chính sách đang gieo `rest_minutes = 30`, `0041:32`), đổi nhãn thành "Khoảng nghỉ giữa hai chuyến". "Xe nhận chạy cùng ngày" là LC-14, chặn ngay **lúc gửi**, không phải một dòng kiểm. Ngoài ra `kiemChuyen` luôn trả **đủ 9 mã**: bảng phải hiện đủ, kể cả `SUC_CHUA_NGUON`, `TRUNG_GIO_DICH`, `HANG_BANG_DICH`, `GIAY_TO_DICH`, `KHONG_CHEO`, `DIEM_CHUA_TOI`, `MOC_TOI_THIEU`. → **Q4** | CHẠM DỮ LIỆU → Q4 |
| 10.3 | Form "Duyệt đề nghị": "Lý do duyệt" (bắt buộc), "**Ghi chú — Tuỳ chọn**"; nút Duyệt (accent) / Bác (danger) | có: `POST …/de-nghi/:rid/duyet`, `…/bac` (`trip.override`) | (a) Ô **Ghi chú**: không có cột trong `vc_transfer_request`, và **chủ đã trả lời Q1** (ghi ở `web/dieu-phoi-ui.ts:5`, `:108`): "phá lệ chỉ chọn lý do, không ô ghi chú". Áp luật đã chốt, **bỏ ô**, không hỏi lại. (b) **Bác cũng bắt buộc lý do** (`reject_reason_code`, ADR D4.2), nhưng bản vẽ không có ô chọn lý do bác, và ADR không nói lý do bác thuộc nhóm nào → Q5. (c) Dùng `moPhaLe` có sẵn (`dieu-phoi-ui.ts:107`) làm khuôn hộp chọn lý do. | (a) áp luật đã chốt; (b) BẢN VẼ THIẾU + CHẠM DỮ LIỆU → Q5 |
| 10.4 | ĐN-0040 luật lõi: banner danger "Không thể duyệt… văn phòng không được phá lệ. Chỉ có thể bác; tài xế gửi sẽ nhận thông báo." + nút Bác | như trên | Khớp ADR. Chữ "tài xế gửi sẽ nhận thông báo" đúng D6.2 nhưng thiếu một nửa: tin `REJECTED` đi tới **cả tài xế nguồn và tài xế đích**. Sửa thành "hai tài xế sẽ nhận thông báo". | BỀ MẶT |
| 10.5 | Ai thấy mục / nút | ô `trip.view` (danh sách), `trip.override` (Duyệt/Bác) | Bản vẽ gắn mục cho vai chung "Văn phòng" (Lan Anh), không phân Bán hàng / Kế toán / Quản trị. Nút Duyệt/Bác **chỉ** khi `can(staff,"trip.override")`, theo đúng ADR, không cần hỏi. Còn **mục menu + huy hiệu "3"** hiện cho ai thì cần chủ chốt → **Q7**. | CHẠM QUYỀN → Q7 |
| 10.6 | Trống / tải / 409 | — | Thiếu trạng thái **chỉ xem** (Bán hàng/Kế toán mở hộp mà không có nút) nếu Q7 chọn cho họ thấy; thiếu 409 "đề nghị vừa tự huỷ / đã được người khác duyệt" (dùng banner 409 chung). | BẢN VẼ THIẾU |

### V11 — Văn phòng: Xe đang chạy (T5, T11)

| # | Màn / trạng thái | Route / DTO | Lệch | Loại |
|---|---|---|---|---|
| 11.1 | Mục menu mới "Xe đang chạy" + trang chi tiết "TX-… · Đang chạy · biển số · 12/16 chỗ" | **THIẾU** trang danh sách: kế hoạch không có trang/route "xe đang chạy". Có thể dùng `GET /api/van-chuyen/lich?ngay=` (`index.ts:804`) lọc `RUNNING`. Chi tiết dùng `web/chuyen.ts` có sẵn. | Mục menu mới là bề mặt → làm theo bản vẽ: trang lọc chuyến `RUNNING` (theo công thức c của CHANGE-GUIDE: `public/*.html`, `PAGES`, `build:web`, `shell.ts`). Hôm nay "Điều phối xe" là mục con dưới "Vận chuyển" (`shell.ts:250`); bản vẽ gọi là "Bảng điều phối". Giữ chữ hiện có hay đổi: làm theo bản vẽ, ghi nhật ký. Mục hiện khi `can(staff,"trip.view")`. | BỀ MẶT + sửa kế hoạch |
| 11.2 | "Khách đang chờ": "Suất N · Điểm · nơi", "Chờ đón 08:40", link "Báo huỷ"; dòng đã báo huỷ: "Vẫn chiếm chỗ cho đến khi tài xế xác nhận" + chip "Văn phòng đã báo huỷ" | `CuocChiTiet`/`ChuyenChiTietResponse` phải có `officeCancel` theo suất — **THIẾU** trong kế hoạch (T5 chỉ có route ghi). | Link "Báo huỷ" chỉ trên suất `WAITING` chưa báo huỷ, chỉ khi `can(staff,"trip.dispatch")`. Không hiện tên khách: khớp (văn phòng thì vẫn được xem tên, bản vẽ chọn không hiện — bề mặt). | BỀ MẶT + sửa kế hoạch |
| 11.3 | "Việc của văn phòng": "Thêm điểm đón / thêm khách" (primary), "**Cứu hộ**" (danger) | them-diem (T5), cuu-ho (T16, **A-1b**) | Ẩn/hiện: Thêm theo `trip.dispatch`; Cứu hộ theo `trip.progress` (Bán hàng, Quản trị, Toàn quyền — **Kế toán không**), và chỉ có từ bản A-1b. | BỀ MẶT + ẩn/hiện theo ADR |
| 11.4 | Form thêm: Chặng chờ xếp, Điểm đón "Bến Cầu Đá · 09:10", Số khách "3"; nút "Thêm vào chuyến" (accent) + "**Xin Quản trị phá lệ**" (primary); banner "Cần Quản trị phá lệ — Điểm đón này nằm trong **mốc 30 phút trước giờ tới**…" | `POST …/chuyen/:id/them-diem` (thân `docXep`: `chang[].soSuat` có sẵn, `dieu-phoi-than.ts:96`) | (a) **Luật mốc bịa**: ADR D5.1 nói xe đang chạy **luôn** ở trong mốc 6 giờ; chặng "đặt gấp" thì qua, chặng khác cần Quản trị phá lệ. Không có "mốc 30 phút trước giờ tới của điểm sắp tới". (b) Nút **"Xin Quản trị phá lệ"** = luồng xin phép mới (không có bảng, không có tin "xin phá lệ" trong D6.2). Khuôn hiện có: Bán hàng thấy dòng khoá "Cần Quản trị phá lệ." (`dieu-phoi-man.ts:118, :209`), Quản trị thấy hộp "Phá lệ" chọn lý do. → **Q2**. (c) Ô "Điểm đón" phải là chữ chỉ đọc, suy từ chặng; ô Số khách ≤ số người của chặng (L-D1). | (a)(b) CHẠM DỮ LIỆU/QUYỀN → Q2; (c) BỀ MẶT |
| 11.5 | Báo huỷ một suất: lý do "Khách báo không đi", "Khách đổi lịch", "Khách không liên lạc được", "Lý do khác"; chú "Thẻ vẫn chiếm chỗ…"; Báo huỷ / Quay lại | `POST …/phan-bo/:aid/bao-huy` có | Nhóm `BAO_HUY_DIEM` **chưa gieo** và **không hiện** ở màn Lý do điều phối, giống 9.2. Phải gieo đúng 4 chữ trên và đưa danh sách vào `ChuyenChiTietResponse`. Hộp này không cần ô chữ. | sửa kế hoạch |
| 11.6 | Trống / tải / 409 | — | **Bản vẽ thiếu**: (1) nút/dải **"Cập nhật điểm theo đơn"** trên xe đang chạy (D5.3a, T5 mở cho RUNNING). Dùng nút có sẵn ở `web/chuyen.ts:425` + câu báo "bỏ qua N khách đã lên xe / điểm đã tới". (2) Trạng thái Bán hàng (dòng khoá) với Quản trị (hộp phá lệ) cho cùng form thêm. (3) Kế toán: chỉ xem, không có "Việc của văn phòng". (4) 409 "xe vừa kết thúc" (Review Focus 1). | BẢN VẼ THIẾU |

### Cứu hộ — Xe hỏng, chuyển khách (T16, T17 — bản A-1b, sau Đợt 4 T2)

| # | Màn / trạng thái | Route / DTO | Lệch | Loại |
|---|---|---|---|---|
| CH.1 | Tài xế: banner "Xe hỏng — chuyển khách… 12 khách… **Văn phòng sẽ được báo ngay**"; "Chọn xe cứu hộ": 2 chuyến cùng ngày + "**4,2 km / 6,0 km**" + dòng "**Xe nhà xe Phúc Thành — Xe thuê ngoài · cần giá thoả thuận**" (chip Cần giá); "Nơi gặp" (chữ tự do); "Gửi cứu hộ" | `POST …/cuoc-cua-toi/:id/de-nghi` `scope:"ONBOARD"` có; danh sách xe = `xe-nhan` có (4 khoá) | (a) **km**: không có trong `XeNhanDto`, máy không có đường đi → Q4. (b) **Xe nhà xe trong danh sách của tài xế**: đề nghị cần `to_trip_id` là chuyến có tài xế đang mở và dùng app; xe nhà xe chưa có chuyến/tài xế dùng app (lượt A-2). Đường đúng theo ADR D5c là: kết thúc gián đoạn → văn phòng tạo chuyến cứu hộ mới. → **Q2b**. (c) "Văn phòng sẽ được báo ngay": D6.2 **không** có dòng báo văn phòng khi có đề nghị `ONBOARD`; chỉ tài xế đích nhận tin, văn phòng nhận khi "kết thúc gián đoạn". Câu hứa sai → Q2b. (d) **Bản vẽ thiếu nút vào** "Xe hỏng — chuyển khách" trên màn chuyến (bảng bắt đầu từ banner). | (a) → Q4; (b)(c) CHẠM DỮ LIỆU/QUYỀN → Q2; (d) BẢN VẼ THIẾU |
| CH.2 | Văn phòng: "Cứu hộ TX-… · 12 khách cần chuyển", cùng danh sách xe + km + xe nhà xe, form "**Nhập giá thoả thuận**" (Số tiền ₫ "900.000", Ghi chú thoả thuận), Lưu giá | **THIẾU**: văn phòng không có route đọc danh sách xe nhận (kế hoạch chỉ có `xe-nhan` dưới `cuoc-cua-toi`, cổng `staff`, ô `trip.transfer` — văn phòng không có ô này). `POST …/chuyen/:id/cuu-ho` (`trip.progress`) có. Giá: route của Đợt 4 T2 (`transport.cost.adjust`), chưa có trong `permissions.ts`. | (a) **Tiền**: Bán hàng bấm được Cứu hộ (`trip.progress`) nhưng **không** được nhập giá. Giá chỉ cho Quản trị / Kế toán / Toàn quyền (`transport.cost.adjust`, ADR D5c, ADR-0057), mà Kế toán lại không có `trip.progress`. Bản vẽ đặt form giá ngay trong luồng cứu hộ, không phân vai → Q2b. (b) Ô "Ghi chú thoả thuận" bắt buộc: trường thuộc Đợt 4 (ADR-0057). Đối chiếu ở Đợt 4, Đợt 5 không thêm. (c) Xe nhà xe = chuyến **mới** (lượt 1), không phải đề nghị. | CHẠM TIỀN/QUYỀN → Q2 |
| CH.3 | Trống / tải / 409 tài xế | — | Thiếu: "không xe nào nhận được → bấm Kết thúc gián đoạn" (ADR D5c dòng "không xe nào nhận được"), trạng thái chờ C nhận, kết quả leo thang. Dùng lại khuôn thẻ 8.4/8.5. | BẢN VẼ THIẾU |

### V6 bổ sung — Màn chuyến của tài xế (T11 thẻ; T15, T17 cho "Bổ sung tên" — A-1b)

| # | Màn / trạng thái | Route / DTO | Lệch | Loại |
|---|---|---|---|---|
| 6.1 | Banner info "Văn phòng vừa thêm điểm — Điểm 4 · Bến Cầu Đá · 09:10 · 3 khách" | **THIẾU** trong `CuocChiTietResponse`: cờ `themKhiChay` (`added_while_running`) theo điểm | Không có tên khách: khớp. Banner "mới" so với lần xem trước phải tính trên máy (cờ + thời điểm), không cần bảng mới. | sửa kế hoạch |
| 6.2 | Danh sách điểm: "Điểm 3 · 2 khách" chip "**Văn phòng đã báo huỷ — vẫn tới điểm**"; "Điểm 4" chip "Mới thêm" (tone bad) | **THIẾU**: cờ `vanPhongBaoHuy` theo suất | Báo huỷ là **theo suất** (D5.2), không phải theo điểm. Điểm có 2 khách mà mới 1 người bị báo huỷ thì chữ ở mức điểm thành sai. Hiện "1/2 khách văn phòng đã báo huỷ — vẫn tới điểm"; nút "Khách đã huỷ" của tài xế đã có sẵn. | BỀ MẶT (cách đếm) |
| 6.3 | "Suất của khách": "Suất N · Điểm · Đã có tên/Chưa có tên", chip Đủ tên/Thiếu tên, link "Bổ sung tên" | `CuocChiTietResponse.suat` có sẵn | Link chỉ khi `can(staff,"trip.passenger.add",{assigned})` (A-1b) và suất mở chưa tên. Không hiện tên — khớp. | BỀ MẶT + ẩn/hiện |
| 6.4 | Form "Bổ sung tên — Suất 2": "**Nhập khi khách đã lên xe.**", Họ tên*, Năm sinh*; Lưu / Đóng; banner 409 | `POST …/cuoc-cua-toi/:id/hanh-khach` có (`{requestId, suatId, fullName, birthYear, paxCode}`) | (a) Câu "Nhập khi khách đã lên xe" là luật ADR không có: D5b cho nhập **trong ngày chạy**, trên suất chưa tên, không đòi `BOARDED`. Đổi chữ thành "Nhập tên cho khách chưa có tên trong đơn". (b) Bản vẽ **thiếu ô loại khách** (`paxCode`); kế hoạch cho null → gửi null, hoặc lấy theo loại của suất. (c) Ô 16px: khớp luật `web/CLAUDE.md`. | (a) BỀ MẶT (chữ); (b) BẢN VẼ THIẾU (chấp nhận null) |
| 6.5 | Trống / tải / 409 | — | Thiếu tin **"Đổi điểm đón X → Y"** (D5.3a/D6.2) trên màn tài xế → dùng khuôn banner 6.1. | BẢN VẼ THIẾU |

### V4 — "Chủ": Dòng dữ liệu (T11 ghi V4, nhưng KHÔNG có task máy chủ)

| # | Màn / trạng thái | Route / DTO | Lệch | Loại |
|---|---|---|---|---|
| 4.1 | Menu "Chủ": "Dòng dữ liệu", "Nhật ký quyết định"; người dùng "Quản trị / Chủ" | **THIẾU hẳn**: không task, không route | "Chủ" không phải một vai (10 quyền app). Ai thấy? → **Q6**. Mục "Nhật ký quyết định" **không có bảng vẽ nào**. | CHẠM QUYỀN → Q6; BẢN VẼ THIẾU |
| 4.2 | Phễu chặng → chuyến (Chặng chờ xếp 48 / Đã xếp 41 / Đã xuất bến 38 / Đã trả 36, %); "Máy quyết theo luật nào" (Xếp chặng 1021 vào TX-0011 — luật…; **Duyệt ĐN-0042 — … duyệt bởi Lan Anh**; Bác ĐN-0040 — tự động); sơ đồ Xếp → Xuất bến → Chuyển xe → Trả | **THIẾU**: route đếm phễu theo ngày + route đọc nhật ký quyết định (`vc_transfer_check`, sự kiện chuyến, `decided_mode`) | (a) Dòng "Bác ĐN-0040 — **Tự động**": theo ADR, luật lõi không đạt thì đề nghị thành `ESCALATED`, rồi **người** bấm Bác (`REJECTED` do người có `trip.override`). Máy **không** tự bác. Sửa nhãn thành "Leo thang — luật lõi" hoặc "Bác bởi …". (b) Dòng "Xếp chặng … Tự động — luật cùng tuyến · còn chỗ · đủ giờ": lượt 1 **không có xếp tự động**; người xếp, máy chỉ kiểm. Nhãn "Tự động" sai nghĩa. (c) Bảng điện thoại để trống (chỉ có ghi chú) → BẢN VẼ THIẾU. | (a)(b) BỀ MẶT nhưng sai nghĩa dữ liệu — sửa chữ theo ADR; (c) BẢN VẼ THIẾU |

---

## 3. Câu hỏi cho chủ

Đã gom thành 7 câu. Mỗi câu nêu khuyến nghị trước. Những câu đã có lời chủ hoặc ADR (bỏ ô ghi chú khi duyệt, nút Duyệt chỉ cho Quản trị / Toàn quyền, xe đang chạy luôn ở trong mốc 6 giờ) thì tự áp, không hỏi lại.

**Q1. Đề nghị đang chờ Quản trị duyệt có hết hạn không?** (bản vẽ V10 ghi "Còn 04:10")
- **Khuyến nghị (Recommended): Không hết hạn, giữ đúng ADR-0052.** Thay đồng hồ đếm ngược bằng "Chờ từ 08:27".
- Lý do: ADR đã duyệt ghi rõ "Không có `ESCALATED → EXPIRED`", đề nghị leo thang chờ tới khi Quản trị duyệt hoặc bác, hoặc tự huỷ khi điểm đã tới hoặc chuyến kết thúc. Đồ thị trạng thái lại là cửa một chiều (trigger cấm đi lùi).
- Nếu chọn khác (có hạn): phải viết ADR mới để sửa đồ thị trạng thái trước khi tạo bảng; thêm cột hạn duyệt vào chính sách; và quyết luôn hết hạn thì khách đi xe nào.

**Q2. Văn phòng xử lý ca "cần phá lệ" và ca "xe hỏng" thế nào?** (ba chỗ trong bản vẽ)
- (a) Nút **"Xin Quản trị phá lệ"** ở form thêm điểm. **Khuyến nghị (Recommended): bỏ nút**, dùng khuôn đang chạy: Bán hàng thấy dòng khoá "Cần Quản trị phá lệ"; Quản trị / Toàn quyền thấy hộp "Phá lệ" chọn lý do. Câu "mốc 30 phút trước giờ tới" thay bằng câu ADR: "Khách không đặt gấp — cần Quản trị phá lệ." Lý do: "xin phá lệ" là một việc mới (bảng chờ, tin báo Quản trị) mà ADR không có. Nếu muốn giữ, cần ADR mới cho luồng xin và duyệt phá lệ.
- (b) **Xe nhà xe nằm trong danh sách "Chọn xe cứu hộ"**, cả màn tài xế lẫn văn phòng, kèm form nhập giá. **Khuyến nghị (Recommended): danh sách chỉ gồm chuyến cùng ngày có tài xế dùng app.** Xe nhà xe đi đường riêng là nút "Tạo chuyến cứu hộ" của văn phòng (tài xế A bấm Kết thúc gián đoạn trước). Bước "Nhập giá thoả thuận" đặt cạnh nút đó và **chỉ hiện cho Quản trị / Kế toán / Toàn quyền**. Tài xế không bao giờ thấy dòng xe nhà xe. Lý do: theo ADR D5c, đề nghị chuyển phải có tài xế đích bấm Nhận, mà xe nhà xe chưa dùng app (lượt A-2). Bán hàng bấm được Cứu hộ nhưng không có quyền nhập tiền. Nếu chọn khác: phải cho văn phòng "nhận thay" (ADR đã loại phương án này), và phải mở quyền tiền cho Bán hàng.
- (c) Câu **"Văn phòng sẽ được báo ngay"** khi tài xế gửi cứu hộ. **Khuyến nghị (Recommended): đổi chữ thành "Tài xế xe được chọn sẽ nhận tin; nếu không ai nhận, bấm Kết thúc gián đoạn để văn phòng xếp xe khác."** Lý do: bảng người nhận tin D6.2 không có dòng này. Nếu chủ muốn văn phòng được báo: thêm một dòng người nhận (người có `trip.dispatch`), là thay đổi hai chiều nhưng phải ghi vào danh sách hành động sinh tin trước dòng đầu.
- (d) Nút **"Rút lại"** trên thẻ "Chờ duyệt" (V8). **Khuyến nghị (Recommended): bỏ.** ADR không cho tài xế rút đề nghị đã leo thang. Nếu giữ: sửa đồ thị trạng thái (`ESCALATED → WITHDRAWN`), cửa một chiều.

**Q3. Tài xế thấy thêm gì ngoài 4 trường ĐP9?** (giờ đi kèm "Sắp tới" ở danh sách xe; "2 NL · 1 TE" trên hộp đề nghị gửi tới)
- **Khuyến nghị (Recommended): cho hiện giờ đón; KHÔNG hiện phần tách người lớn / trẻ em trước khi nhận**, chỉ hiện tổng "3 khách".
- Lý do: giờ là một phần của "điểm" và giúp tài xế quyết có kịp hay không. Phần tách loại khách thì ADR D4.4 không có (chỉ `pax_count`). Sau khi nhận, tài xế B thấy đủ trên chuyến của mình.
- Nếu cho hiện tách NL/TE: thêm khoá vào DTO và sửa bài liệt kê khoá (nới hàng rào, phải qua tệp đề xuất luật). Không lộ danh tính, nên rủi ro thấp.

**Q4. Ba "luật" mới trong bảng kiểm, và khoảng cách km** (V10: "Số lần nhờ xe trong ngày ≤ 3", "Khoảng cách tới điểm sắp tới ≤ 5 km", "Thời gian trước giờ đón ≥ 30 phút"; Cứu hộ: "4,2 km")
- **Khuyến nghị (Recommended): bỏ cả ba, bỏ km.** Bảng kiểm hiện **đúng 9 luật của ADR** với nhãn tiếng Việt. "Thời gian trước giờ đón 30 phút" thực ra là **khoảng nghỉ giữa hai chuyến** (chính sách hiện là 30 phút), đổi nhãn cho đúng.
- Lý do: tập mã luật là **cửa một chiều**, CSDL chốt ngay lúc tạo bảng. Km cần bản đồ hoặc toạ độ, mà ADR đã ghi "máy không biết đường đi". "Số lần nhờ xe" cần cột chính sách mới.
- Nếu muốn có: viết ADR mới **trước** migration Đợt 5, thêm mã vào `CHECK` ngay từ đầu (thêm sau là phải dựng lại bảng). Km còn kéo theo dịch vụ bản đồ (chi phí, độ chính xác).

**Q5. Bác đề nghị dùng nhóm lý do nào?** (ADR bắt buộc lý do khi bác, nhưng không nói nhóm; bản vẽ không vẽ ô chọn lý do khi bác)
- **Khuyến nghị (Recommended): dùng chung nhóm "Phá lệ"** (cùng hộp với Duyệt, bản vẽ đặt hai nút trong một form "Bắt buộc chọn lý do"), thêm lý do "Không đủ điều kiện chuyển". Không tạo nhóm mới.
- Lý do: một form, một danh sách, như bản vẽ. Nhóm lý do là mã trong code (`NHOM_LY_DO`), thêm nhóm phải sửa bài khoá.
- Nếu chọn nhóm riêng "Bác đề nghị": thêm mã nhóm và dòng gieo, đổi bài `dieu-phoi-kieu.test.ts`; việc này nhỏ, hai chiều.

**Q6. Mã đề nghị "ĐN-0042" và màn "Dòng dữ liệu" (V4)**
- (a) Mã đề nghị: **Khuyến nghị (Recommended): không thêm cột số thứ tự.** Hiện "Văn Hải → Minh Khoa · 08:27" làm tên đề nghị. Lý do: ADR không có cột này; một bộ đếm mới nghĩa là thêm cột và thêm luật cấp số. Nếu muốn có mã: thêm cột `ma` khi tạo bảng (một chiều, phải chốt trước migration).
- (b) V4 "Dòng dữ liệu" + "Nhật ký quyết định": **Khuyến nghị (Recommended): chỉ Toàn quyền thấy** (giống Nhật ký — ADR-0038). Làm **sau** A-1, bằng một kế hoạch nhỏ riêng (route đếm phễu + route đọc nhật ký quyết định, chỉ đọc). Gộp "Nhật ký quyết định" vào cùng màn vì chưa có bản vẽ riêng. Lý do: kế hoạch Đợt 5 chưa có máy chủ cho V4. "Chủ" không phải vai; ghi "duyệt bởi Lan Anh" là tên nhân viên, chỉ nên để người giữ toàn quyền đọc. Nếu cho cả Quản trị: đổi ô quyền của trang, cần ghi vào bản đồ quyền.

**Q7. Mục "Đề nghị cần duyệt" (và huy hiệu số) hiện cho ai?**
- **Khuyến nghị (Recommended): mục và huy hiệu chỉ cho Quản trị và Toàn quyền** (người có ô `trip.override`, cũng là người nhận tin leo thang). Bán hàng / Kế toán xem đề nghị của một chuyến ngay trong Chi tiết chuyến, chỉ xem.
- Lý do: tin "cần xử lý" chỉ tới người làm được (D6.2). Huy hiệu đếm việc mình không làm được là nhiễu, và ADR đã loại phương án "tin leo thang tới mọi người xếp xe".
- Nếu cho Bán hàng / Kế toán thấy mục: vẫn đúng quyền đọc (`trip.view`), nhưng cần thêm trạng thái "chỉ xem" cho hộp và không hiện huy hiệu.

---

## 4. Sửa kế hoạch con (để người code theo bản vẽ)

1. **T4 — route mới (THIẾU):** tài xế A đọc đề nghị đã gửi của chuyến mình. Thêm `deNghiDaGui[]` vào `CuocChiTietResponse` (khuyến nghị, đỡ thêm một route), gồm `id, trangThai, denMaChuyen, denTenTaiXe, diemId, paxCount, proposedAt, hetHanLuc, lyDoNhan`. Không có khoá khách. Thêm vào bài liệt kê khoá.
2. **T4 — `de-nghi-gui-toi`:** liệt kê đủ khoá: `id, maChuyenNguon, tenTaiXeNguon, tenDiem, gioDon, paxCount, noiTra, sauKhiNhan:{dung,soCho}, proposedAt, hetHanLuc, lyDo:[{code,nhan}]` (+ `phanLoai` chỉ khi Q3 cho). Bài khoá phải đỏ khi có `fullName`/`birthYear`/`maDon`.
3. **T4 — `xe-nhan`:** giữ 4 khoá. Giờ gộp vào chữ `diemSapToi` ("Bến du thuyền · 08:10"), trừ khi Q3 cho thêm khoá. Bỏ chuyến của mình.
4. **T5 — `GET /de-nghi?ngay=`:** trả thêm `kiem:[{luat, nhan, tang, ketQua, giaTri, gioiHan, donVi}]` (đủ 9 mã), `duocDuyetThay`, `proposedAt`, tên hai tài xế, mã hai chuyến. **Không** trả hạn hay đếm ngược cho `ESCALATED` (Q1).
5. **T2 — nhãn luật:** thêm bảng `NHAN_LUAT_CHUYEN` (9 mã → chữ, kèm đơn vị: "chỗ", "phút") vào `src/shared/dieu-phoi-kieu.ts`. `KHOANG_NGHI_DICH` = "Khoảng nghỉ giữa hai chuyến". Màn hình chỉ đọc nhãn từ đây.
6. **T1/T4 — gieo lý do:** migration Đợt 5 gieo `TU_CHOI_NHAN` (Xe đã đầy chỗ / Không kịp giờ / Đang xử lý sự cố / Lý do khác) và `BAO_HUY_DIEM` (Khách báo không đi / Khách đổi lịch / Khách không liên lạc được / Lý do khác), đúng chữ bản vẽ. Thêm hai nhóm vào `NHOM_LY_DO_HIEN` (`src/shared/chinh-sach-hien-thi.ts:177`, sửa bài `chinh-sach-hien-thi.test.ts:130`) để Quản trị sửa được. Nhóm cho lý do bác theo Q5.
7. **T4/T5 — đưa lý do ra màn:** tài xế (cổng `staff`) và Bán hàng không đọc được `GET /api/van-chuyen/ly-do` (cổng `admin`). Nhúng danh sách lý do vào `de-nghi-gui-toi`, `ChuyenChiTietResponse` (báo huỷ, phá lệ, bác).
8. **T5 — DTO chi tiết chuyến văn phòng + tài xế:** thêm `diem[].themKhiChay`, `suat[].vanPhongBaoHuy:{luc, lyDoNhan}|null`, và danh sách đề nghị của chuyến (cho Bán hàng / Kế toán xem, Q7).
9. **T5 — trang "Xe đang chạy"** (bản vẽ V11): trang lọc `RUNNING` dùng `GET /api/van-chuyen/lich` có sẵn; công thức c (`public/*.html`, `PAGES` ở `src/shared/sw-policy.ts`, `build:web`, `web/shell.ts`, `web/account.ts`). Ô `trip.view`.
10. **T5 — trang/khối "Đề nghị cần duyệt"** (V10): trang mới theo công thức c, ẩn/hiện theo Q7; huy hiệu đếm `ESCALATED` trong ngày.
11. **T16 — văn phòng chọn xe cứu hộ (THIẾU):** thêm `GET /api/van-chuyen/chuyen/:id/xe-nhan` (cổng `office`, ô `trip.progress`). Cùng hàm thuần `xeNhanDto`, cùng 4 khoá. Thêm vào bài liệt kê khoá và bài "không lộ tên".
12. **T17 — luồng xe nhà xe** theo Q2b: nút "Tạo chuyến cứu hộ" (khuôn tạo chuyến lượt 1) + bước giá thoả thuận ẩn/hiện bằng `can(staff,"transport.cost.adjust")` (ô Đợt 4). Không trộn vào danh sách đề nghị.
13. **T11 — chữ theo ADR:** mọi "văn phòng duyệt" → "Quản trị duyệt"; bỏ "(A)"; "Nhập khi khách đã lên xe" → "Nhập tên cho khách chưa có tên trong đơn"; "10 phút" lấy từ chính sách; banner luật lõi "hai tài xế sẽ nhận thông báo"; V4 bỏ "Tự động" ở dòng Xếp và Bác.
14. **T11 — trạng thái bản vẽ thiếu, làm theo khuôn có sẵn:** `REJECTED`, `VOID`, `WITHDRAWN` (khuôn thẻ "Không nhận"); 409 `de_nghi_het_han`; 404 chuyến không còn của mình; "Cập nhật điểm theo đơn" trên xe đang chạy (nút `web/chuyen.ts:425` + câu "bỏ qua N"); tin "Đổi điểm đón X → Y" ở màn tài xế (khuôn banner 6.1); Bán hàng (dòng khoá) với Quản trị (hộp `moPhaLe`); Kế toán chỉ xem; nút vào "Xe hỏng — chuyển khách"; trạng thái chờ C nhận khi cứu hộ.
15. **T11 — một đề nghị đang chờ mỗi điểm (chỉ ở màn hình):** bản vẽ thay nút "Nhờ xe khác đón" bằng thẻ chờ khi đã gửi → **ẩn nút** khi điểm có đề nghị `PENDING`. Máy chủ giữ như kế hoạch ("Điều chưa chắc" vẫn mở); nếu chủ muốn chặn ở máy chủ thì là luật mới.
16. **T11 — đổi nhãn menu tài xế** "Cuốc của tôi" → "Chuyến của tôi" (bản vẽ), thêm mục "Đề nghị gửi tới tôi" + huy hiệu. Giữ "Trang chủ" `/tai-xe`. Ghi vào `changelog.ts` vì đây là nhãn chủ từng chốt (Q5 ADR-0049). Cập nhật `tai-xe-trang-dau-smoke.mjs`, `cuoc-smoke.mjs`, `trang-chu-smoke.mjs` (đếm mục thanh bên).
17. **V4 tách khỏi Đợt 5** (Q6b): xoá V4 khỏi T11. Lập kế hoạch nhỏ riêng sau A-1, gồm route đếm phễu theo ngày và route đọc nhật ký quyết định, chỉ đọc, ô theo Q6b.

---

## 5. Ánh xạ token (bản vẽ `_ds` → `public/app.css`)

Giá trị `_ds/colors.css` ghi là "chép đúng từ app.css :root". Đã đối chiếu từng giá trị: khớp. Không nhập CSS `_ds`.

| Bản vẽ dùng | Giá trị | app.css | Ghi chú |
|---|---|---|---|
| `--c-primary` (tiêu đề h1 `#0C4A6E`, chip "Chưa tới"/"Đã chọn", nền tone `run`) | #0c4a6e | `--c-primary` (:28) | `#0C4A6E` viết cứng ở h1 → dùng `var(--c-primary)` |
| `--c-primary-soft` (dòng đang chọn, chip soon) | #dcebf6 | `--c-primary-soft` (:30); lớp `.dp-chip-unit` | |
| `--c-green-soft` / `--c-green-text` (ok) | #dcfce7 / #166534 | cùng tên (:45–46); `.dp-chip-ok`, `.dp-banner-ok` | |
| `--c-sand-soft` / `--c-sand-text` (warn, huy hiệu "3" tone sand) | #fbe3b3 / #5a4109 | cùng tên (:35–36); `.dp-chip-warn`, `.banner-warning`, `sidebar-item-badge-sand` | |
| `--c-danger-soft` / `--c-danger-text` (bad, nền dòng "Không đạt") | #fde9ee / #8e0e2b | cùng tên (:67–69); `.dp-chip-danger`, `.banner-danger` | |
| `--c-accent-strong` (số lớn đếm ngược 32px) | #96271a | `--c-accent-strong` (:32) | ⚠ Luật màu san hô: "CHỈ hành động chốt và nhãn giá — không dùng cho lỗi". Đếm ngược không phải nhãn giá; bản vẽ dùng → làm theo (bề mặt), ghi lại cho chủ biết |
| Nút accent ("Nhờ xe khác đón", "Gửi", "Nhận", "Duyệt", "Thêm vào chuyến") | — | `--c-accent` (:31) | Đều là hành động chốt; riêng "Nhờ xe khác đón" chỉ mở luồng, vẫn làm theo bản vẽ |
| Huy hiệu tone accent ("Đề nghị gửi tới tôi" 1) | — | `sidebar-item-badge-accent` (đang dùng cho Góp ý) | |
| tone `end`: nền `#E6EDF3`, chữ `--c-text-muted` | #e6edf3 | **không có token**; gần nhất `--c-surface-alt` #eaf2f8 (`.dp-chip-muted`) | Dùng `.dp-chip-muted`; KHÔNG thêm màu mới (màu mới phải hỏi chủ). Chênh rất nhỏ |
| `#fff` (chữ trên tone run) | #ffffff | `--c-on-dark` (:121) | `.dp-chip-navy` có sẵn |
| Thanh bên xám `.sb-gray #EEF2F6` | #eef2f6 | **không có**; app dùng `--c-sidebar-bg` (= surface trắng) | Đây là khung canvas, không phải nội dung; không đổi thanh bên app |
| Bóng "float" overlay | — | `--shadow-overlay` (:53) | |
| Viền 2px `--c-primary` (thẻ float) | — | `--c-primary` | 2px ngoài vùng "chỉ 1px" của khối PWA → cần token độ dày mới ở nhóm "Riêng của Tour Đảo Booking" (vd `--bd-float: 2px`) hoặc dùng `box-shadow` 0 0 0 … bằng token |
| Bo 12 | 12px | `--radius-md` (:49) | |
| pad 16, gap 16 | 16px | `--s4` (:47) | |
| Lưới `minmax(340px,1fr)` | 340px | `--w-side` 340px có nhưng nghĩa khác | Thêm token mới `--w-dp-cot-the: 340px` ở nhóm riêng |
| Nút 44px / ô 44px | 44px | `--tap-min` (:122) | ⚠ Ô gõ app hiện cao `--h-field` 52px; bản vẽ 44 → giữ `--h-field` cho ô gõ (chủ chốt 52 ngày 24/9), nút dùng `--tap-min` |
| Chữ 22px (h1) / 32px (big) / 16 / 15 / 14 / 13 / 12 | — | `--fs-step-10` / `--fs-step-14` / `--fs-step-5` (`--fs-ui`) / `--fs-step-4` / `--fs-step-3` (`--fs-label`) / `--fs-step-2` / `--fs-step-1` (`--fs-badge`) | Token cỡ chữ theo vai phải trỏ `var(--fs-step-N)` (`src/phong-chu.test.ts`) |
| Độ đậm 600 / 700 / 800 | — | `--fw-semibold` / `--fw-bold` (đều 500 hiện hành) | ⚠ App cố ý đặt `--fw-bold: 500` (:351). Dùng token, KHÔNG viết 700/800; nếu chủ muốn đậm như bản vẽ thì đổi token chung (việc riêng) |
| Phông BVP | — | `--font-display` | |
| ls .08em (TAG) | — | không có token letter-spacing | TAG chỉ là nhãn khung canvas ("ĐANG TẢI", "TRỐNG"), không vào app |
| Skeleton | — | `.skeleton-list`/`.skeleton-row` (:550–551) | |
| Banner tone info/warning/danger | — | `.banner-info` / `.banner-warning` / `.banner-danger` (:953–955) | |

Biến không có tương đương: `#E6EDF3` (dùng `--c-surface-alt`), `#EEF2F6` (khung, bỏ qua), viền 2px (token mới), cột 340px (token mới), letter-spacing (không cần).

---

## 6. Tệp mã sẽ bị chạm (để điều phối biết chỗ đụng nhau)

**Giao diện (`web/`, `public/`):**
- `web/cuoc-chuyen.ts` (V8, V9 thẻ nổi, V6, cứu hộ tài xế) — **đụng Đợt 2** (tin báo) và Đợt 6 (tài xế đối tác).
- `web/cuoc.ts` (danh sách cuốc + huy hiệu đề nghị), `web/tai-xe.ts` (khối "Cuốc xe" nếu đổi nhãn).
- `web/chuyen.ts` (V11 chi tiết chuyến đang chạy, báo huỷ, thêm điểm, cứu hộ văn phòng, cập nhật điểm RUNNING) — **đụng Đợt 4** (giá xe thuê) và Đợt 3.
- `web/dieu-phoi.ts`, `web/dieu-phoi-ui.ts` (`moPhaLe`, hộp lý do Duyệt/Bác).
- Trang mới: `web/de-nghi.ts` + `public/de-nghi.html` (Đề nghị cần duyệt), `web/xe-dang-chay.ts` + `public/xe-dang-chay.html`, có thể `web/de-nghi-toi.ts` + `public/de-nghi-toi.html` (hoặc khối trong `/cuoc`). Tên tệp là gợi ý.
- `web/shell.ts`, `web/account.ts` (mục menu mới, đổi nhãn "Cuốc của tôi") — **điểm nóng**: mọi đợt có menu đều chạm.
- `web/ly-do-dieu-phoi.ts` (hiện hai nhóm mới).
- `public/app.css` (khối `.dp-*` mới + 2 token mới ở nhóm riêng) — **điểm nóng** chung mọi đợt.
- `package.json` (`build:web`).

**Dùng chung (`src/shared/`):**
- `src/shared/contracts.ts` (`CuocChiTietResponse` :1453, `ChuyenChiTietResponse`, DTO đề nghị mới) — **điểm nóng**: Đợt 2, 3, 4, 6 đều chạm.
- `src/shared/dieu-phoi-kieu.ts` (mã, nhãn luật, trạng thái đề nghị), `src/shared/dieu-phoi-chuyen-diem.ts` (mới), `src/shared/dieu-phoi-man.ts`, `src/shared/tien-do-man.ts`.
- `src/shared/chinh-sach-hien-thi.ts` (`NHOM_LY_DO_HIEN`) + test.
- `src/shared/permissions.ts`, `permissions.test.ts` (`trip.transfer`, `trip.passenger.add`) — **đụng Đợt 4** (`transport.cost.*`) và Đợt 6 (cột `DRIVER_PARTNER`).
- `src/shared/sw-policy.ts` (`PAGES`), `src/shared/start-page.ts` (nếu đổi nhãn/trang đầu tài xế), `src/shared/audit-actions.ts`, `src/shared/changelog.ts`, `src/shared/app-info.test.ts`.

**Máy chủ:** `src/modules/van-chuyen/index.ts` (route mới — **điểm nóng**), `chuyen-repo.ts`, `dieu-phoi.ts`, `dieu-phoi-lenh.ts`, `dieu-phoi-than.ts`, `chinh-sach.ts`, `chuyen-diem-lenh.ts` (mới); `src/modules/orders/chang-hanh-khach-repo.ts`, `orders/index.ts` (A-1b); `migrations/<N>_xe_dang_chay.sql` (số lấy lúc thi công — hiện lớn nhất ở main là `0069`); `scripts/audit-checks.mjs`; bài hàng rào `src/hanh-khach-khong-lo-ten.test.ts`, `src/giay-to-khong-lo-so.test.ts`, `src/route-write-guard.test.ts`, `src/giao-dien-hoi-bang-quyen.test.ts`.

**Kịch bản Chrome phải chạy lại** (theo bảng `web/CLAUDE.md`): `cuoc-smoke.mjs`, `chuyen-smoke.mjs`, `dieu-phoi-smoke.mjs`, `tai-xe-trang-dau-smoke.mjs`, `trang-chu-smoke.mjs` (đếm mục thanh bên), `chinh-sach-dieu-phoi-smoke.mjs` (Lý do điều phối), `cap-nhat-khach-smoke.mjs`; cộng kịch bản mới cho V8–V11.
