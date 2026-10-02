# Đánh giá bản vẽ Đợt 6: Tài xế nhà xe đối tác (Từ chối chuyến, Báo bận, dải "Tài xế bận")

Bản vẽ: `ban-ve/Tai xe tu choi va bao ban.dc.html`. Đây là bản lưu của điều phối: khung canvas theo mô tả ở đầu tệp Đợt 5, script dữ liệu giữ nguyên văn. Token lấy ở `../colors.css`.
Đã đối chiếu với: kế hoạch con `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-06-tai-xe-doi-tac.md` (Task 1–10), ADR-0053 D7–D9, và mã hiện có `web/cuoc-chuyen.ts`, `web/cuoc.ts`, `web/tai-xe.ts`, `web/shell.ts`, `web/dieu-phoi.ts`, `web/chuyen-sua.ts`, `web/dieu-phoi-ui.ts`, `src/shared/contracts.ts` (`CuocChiTietResponse`, `TaiXeChonDto`), `src/shared/start-page.ts`, `public/app.css`. Kho mã ở HEAD `e577ba13`, tôi chỉ đọc, không sửa gì.
Không có chữ nào trong bản vẽ giống lệnh gửi cho người đánh giá. Chú thích đầu tệp là của điều phối.

---

## 1. Tóm tắt

1. Bản vẽ có **3 màn, 12 bảng**. Màn A, Từ chối chuyến của tài xế đối tác: 5 trạng thái trên điện thoại + 1 bảng máy tính. Màn B, Báo bận của tôi: 5 trạng thái + 1 bảng máy tính. Màn C, dải "Tài xế bận" và câu chặn ở văn phòng: 1 bảng máy tính + 1 bảng điện thoại.
2. **Khớp kế hoạch khoảng 80%.** Bản vẽ phủ đủ 4 + 4 + 1 ý của lệnh vẽ Task 10. Phần lệch là bề mặt, cộng 4 chỗ chạm dữ liệu hoặc phạm vi, cộng các trạng thái lỗi/đang tải mà bản vẽ thiếu.
3. **Máy chủ chưa có gì cho đợt này.** Chưa có `vc_unavailability`, chưa có ô `trip.refuse` hay `unavailability.self`, chưa có route `tu-choi` hay `ban*`, chưa có khoá `hanTuChoi`/`tuChoiDuoc`/`thayKhachTu`. `DRIVER_PARTNER` hôm nay chưa vào được "Cuốc của tôi" (`coCuocCuaToi` chỉ nhận `DRIVER`).
4. **Soi người ngoài:** Màn A và B **không có số tiền nào, không có mã đơn, không có tên hay SĐT khách** trước khung xem khách, nên đạt. Có hai điểm phải hỏi chủ: thẻ của tài xế ghi "Số khách 9 (6 NL · 3 TE)", trường tách người lớn / trẻ em này DTO tài xế chưa có và ADR chưa nói tới; và việc dải văn phòng không hiện lý do bận. Phần "nhà xe Phúc Thành" ở Màn C **không phải lộ mới**: văn phòng đã thấy nhà xe của tài xế qua `TaiXeChonDto.nhaXe`.
5. **4 câu hỏi cho chủ**: số NL/TE, lý do bận, số điện thoại "Gọi văn phòng", kéo chuyến vào tài xế. Có **19 việc sửa kế hoạch con** và **13 trạng thái bản vẽ thiếu**.

---

## 2. Bảng màn / trạng thái → task → route/DTO → lệch → loại

Chú thích loại: **BM** = bề mặt (làm theo bản vẽ). **DL** = chạm dữ liệu, quyền hoặc tiền (hỏi chủ). **TH** = bản vẽ thiếu. **KH** = kế hoạch phải sửa để có dữ liệu cho bản vẽ.

### Màn A: Tài xế đối tác, Từ chối chuyến (trong `/cuoc-chuyen?id=`)

| # | Bảng / thành phần bản vẽ | Task | Route / DTO cần (máy chủ CHƯA có) | Lệch kế hoạch / ADR / mã hiện có | Loại |
|---|---|---|---|---|---|
| A0 | Thanh menu tài xế: "Cuốc của tôi" (biểu tượng `assign`), "Báo bận của tôi" (`clock`), "Tôi". Không có "Trang chủ" | 9, 10 | `coCuocCuaToi` gồm `DRIVER_PARTNER` (Task 9); hiện tab theo `can(staff,"unavailability.self")` | Mã hiện có: tab "Trang chủ" (/tai-xe) + "Cuốc của tôi" (biểu tượng `clock`) + "Tôi". Bản vẽ bỏ "Trang chủ" và chuyển `clock` sang Báo bận, "Cuốc" dùng `assign`. Bản vẽ Đợt 5 gọi tab là "**Chuyến** của tôi", còn Đợt 6 gọi "**Cuốc** của tôi": hai bản vẽ lệch nhau | BM (điều phối chốt nhãn chung) |
| A0b | Tiêu đề trang "TR-0123", dòng phụ "Cuốc của tôi · 06:00 02/10 · 79A-123.45" | 10 | có sẵn (`chuyen.ma`, `gioBatDau`, `bienSo`) | Mã đặt thanh trên "Xuất bến TR-0123" + dòng meta "biển số · ngày giờ · N khách" (theo bản vẽ 06) | BM |
| A1 | **1 · Còn hạn từ chối:** dải xanh "Bạn có thể từ chối chuyến này đến 18:00 hôm nay" + thẻ "Chuyến của tôi" (Giờ đón, Điểm đón, Biển số, Số khách) + nút "Xuất bến" (chính) và "Từ chối chuyến" (phụ) | 3, 9, 10 | `GET /api/van-chuyen/cuoc-cua-toi/:id` thêm `hanTuChoi`, `tuChoiDuoc`, `thayKhachTu` (Task 3, P6-8); `can(trip.refuse)` (Task 5) | (a) **"Số khách 9 (6 NL · 3 TE)"**: DTO tài xế không có tách NL/TE, ADR D7.3 chỉ cho "số người mỗi điểm" → **Câu hỏi 1**. (b) Thẻ "Chuyến của tôi" chỉ có **một** "Điểm đón". Mã hiện có liệt kê mọi điểm + thẻ "Điều kiện xuất bến" + nút Xuất bến dính đáy. Phải giữ các khối đó, chỉ thêm phần mới (xem mục 4). (c) Nút "Xuất bến" trong bản vẽ màu `primary` (xanh đậm), mã hiện có dùng `btn-accent` (san hô) theo bản vẽ 06. (d) Chữ "hôm nay" cần ngày của hạn để so (kế hoạch trả chuỗi "HH:mm dd/MM") | DL (a); BM (b, c); KH (d) |
| A2 | **1 · Tấm chọn lý do:** "Từ chối chuyến TR-0123" + danh sách 4 lý do (một dòng "Đã chọn") + chú "Bắt buộc chọn một lý do." + dải vàng "Từ chối xong bạn không xem lại được chuyến này" + "Xác nhận từ chối" (đỏ đặc) / "Quay lại" | 5, 10 | `POST …/cuoc-cua-toi/:id/tu-choi` `{ lyDo, requestId }`; **danh sách lý do nhóm `TU_CHOI_CHUYEN`**: kế hoạch KHÔNG có trường nào trả danh sách này cho màn (`CuocChiTietResponse.lyDo` hiện là lý do kết thúc gián đoạn) | Thiếu trường `lyDoTuChoi` → KH. Chữ lý do khớp gieo ở Task 2. Không có ô gõ chữ, khớp ADR-0030 điều 2 | KH + BM |
| A3 | **2 · Đã qua hạn:** dải vàng "Đã quá hạn từ chối — muốn đổi người hãy gọi văn phòng" + nút "Gọi văn phòng" + thẻ chỉ còn "Xuất bến" | 3, 10 | `tuChoiDuoc=false`; **số điện thoại văn phòng: hệ thống chưa có** (chỉ có "Hỗ trợ kỹ thuật" viết cứng ở `public/login.html:38`) | Nút gọi cần một số điện thoại → **Câu hỏi 3** | DL |
| A4 | **3 · Chưa tới khung xem khách:** thẻ "Khách trên chuyến" (nền xám) "Thấy danh sách khách từ 00:00 ngày 02/10" | 3, 9 | `thayKhachTu` (P6-8, máy chủ tính) | Bản vẽ ghép dải "còn hạn" với thẻ **không có** nút Từ chối. Đây là mâu thuẫn trong bản vẽ: còn hạn thì `tuChoiDuoc=true`, nút phải hiện. Ngược lại, bảng A1 (còn hạn) lại thiếu dòng "Thấy danh sách khách từ …", trong khi còn hạn thì **luôn** chưa thấy khách (P6-2). Theo luật: nút hiện theo `tuChoiDuoc`, dòng "thấy từ" hiện khi không có `hoTen` mà có `thayKhachTu` | BM (ghi rõ cho người code) |
| A5 | **4 · Lỗi: văn phòng vừa đổi tài xế:** dải đỏ "Văn phòng vừa đổi tài xế chuyến này", "Chuyến không còn thuộc về bạn…", nút "Về cuốc của tôi" + khung chờ (skeleton) | 5, 10 | 409 `stale` từ `tu-choi` | Kế hoạch: 409 `stale` không kèm câu. Màn phải tự gắn câu của bản vẽ. Sau 409, GET chi tiết sẽ trả **404** (không còn dòng lái), nên màn phải giữ dải này chứ không rơi về lỗi chung "không tìm thấy". Chỉ hiện dải khi vừa nhận 409 từ lệnh Từ chối, **không** đoán từ một 404 bất kỳ (404 không được nói lý do) | BM + KH |
| A6 | Bảng máy tính 1040: xếp chồng mọi khối trên | 10 | như trên | Chỉ là bảng trưng bày, không phải bố cục thật | BM |

### Màn B: Tài xế đối tác, Báo bận của tôi (trang mới `/ban`)

| # | Bảng / thành phần | Task | Route / DTO cần | Lệch | Loại |
|---|---|---|---|---|---|
| B1 | **1 · Danh sách:** tiêu đề "Báo bận của tôi" / "Khung thời gian bạn không nhận chuyến"; thẻ "Báo bận" + chú + nút **accent** "Báo bận"; danh sách "Khung bận của tôi": dòng "02/10 06:00 → 03/10 18:00", "Lý do: Việc riêng", chip "Đang hiệu lực" (xanh lá) / "Sắp tới" (xanh) / "Đã rút" (xám, dòng mờ), nút "Rút"; chú "Văn phòng không xếp chuyến cho bạn trong các khung này." | 6, 10 | `GET /api/van-chuyen/ban/cua-toi` → `KhungBanDto { id, batDau, ketThuc, lyDo, daRut }` | Kế hoạch không có trạng thái "Đang hiệu lực / Sắp tới". Màn suy được từ `batDau` so với giờ hiện tại, hoặc máy chủ trả sẵn (khuyến nghị: máy chủ trả, cho đúng khuôn "màn không tự tính"). Nút "Báo bận" màu accent (san hô) trái chú thích token "accent CHỈ cho hành động chốt" nhưng vẫn làm theo bản vẽ, ghi lại | KH + BM |
| B2 | **1 · Trống:** "Bạn chưa báo bận lần nào. Bấm “Báo bận” khi cần nghỉ để văn phòng không xếp chuyến cho bạn." | 10 | — | Khớp | BM |
| B3 | **2 · Biểu mẫu:** "Báo bận", chú "Tối đa 14 ngày, không chọn ngày đã qua.", ô Bắt đầu / Kết thúc (ngày + giờ trong **một** ô) / Lý do (ô chọn), nút "Lưu khung bận" (chính) / "Đóng" | 6, 10 | `POST /api/van-chuyen/ban` `{ batDau, ketThuc, lyDo, requestId }` (giờ VN `YYYY-MM-DDTHH:mm`); **danh sách lý do `BAN_TAI_XE`: kế hoạch không có trường trả cho màn** | Thiếu nguồn danh sách lý do → KH. Ô ngày giờ gõ chữ cỡ 16px (`datetime-local`) | KH + BM |
| B4 | **3 · Hỏi lại khi rút:** dải vàng "Rút khung bận này?", "05/10 08:00 → 12:00 · Ốm. Văn phòng có thể xếp chuyến cho bạn lại." + "Rút khung bận" (đỏ đặc) / "Giữ lại" | 6, 10 | `POST /api/van-chuyen/ban/:id/rut` `{ requestId }` | Bản vẽ hỏi bằng **dải ngay trong trang**, không dùng tấm trượt | BM |
| B5 | **4 · Lỗi trùng chuyến:** biểu mẫu với dải lỗi "Bạn đang có chuyến TR-0123 lúc 06:00 02/10 — hãy Từ chối chuyến (nếu còn hạn) hoặc gọi văn phòng", liên kết "Mở chuyến TR-0123", "Đóng" | 6, 10 | 409 `khung_ban_chong_chuyen_tai_xe` kèm `chuyen: { ma, gio }[]` | **Liên kết cần `id` chuyến**, kế hoạch chỉ trả `ma, gio` → KH (đó là chuyến **của chính tài xế**, không lộ gì mới). Câu khớp ADR B9.2 | KH |
| B6 | Bảng máy tính 1040 | 10 | như trên | Trưng bày | BM |

### Màn C: Văn phòng, dải "Tài xế bận" trên lịch điều phối (`/dieu-phoi`)

| # | Bảng / thành phần | Task | Route / DTO cần | Lệch | Loại |
|---|---|---|---|---|---|
| C1 | Tiêu đề "Lịch điều phối", "02/10/2026"; menu văn phòng "Bảng điều phối / Đề nghị cần duyệt (3) / Xe đang chạy" | — | — | Trang thật tên "Điều phối xe". Menu này thuộc Đợt 5, không đổi ở Đợt 6 | BM (không làm ở đợt này) |
| C2 | Danh sách "Tài xế bận": "Hoàng Nam · nhà xe Phúc Thành" / "02/10 06:00 → 03/10 18:00" / chip "Bận" (vàng); dòng thứ hai là khung **05/10** khi đang xem ngày 02/10; chú "Chỉ hiện tên và giờ. Lý do không hiển thị với người không xếp xe." | 6, 10 | `GET /api/van-chuyen/ban-tai-xe?tu=&den=` (cổng office, `can(trip.dispatch)`) → `KhungBanTaiXeDto { …KhungBanDto, taiXeId, tenTaiXe }` | (a) **Tên nhà xe:** DTO kế hoạch không có. Văn phòng đã thấy nhà xe qua `TaiXeChonDto.nhaXe: string[]` (`contracts.ts:1160`), nên **không lộ mới** → KH thêm `nhaXe: string[]` (hoặc màn ghép từ danh sách tài xế). (b) **Lý do:** DTO kế hoạch có `lyDo`, ADR D9.2 ngầm cho người xếp xe thấy, còn bản vẽ không hiện cho ai → **Câu hỏi 2**. (c) Khoảng ngày: bản vẽ hiện cả khung **sắp tới** (05/10), kế hoạch chưa chốt `tu/den` → KH | KH (a, c); DL (b) |
| C3 | "Kéo xếp chuyến": "TR-0131 · 07:00 02/10 — Đang kéo vào Hoàng Nam — Bị chặn" (dòng chọn), "TR-0132 · 09:30 02/10 — Chưa xếp tài xế — Chờ xếp" | 6, 10 | 409 `TRUNG_GIO_TAI_XE` (đã có mã lý do ở `ly-do-giu.ts:45`; vòng khung bận chưa có) | **Lịch hiện có không có thao tác kéo chuyến vào tài xế.** Kéo thả hôm nay là kéo **chặng vào chuyến** (`web/dieu-phoi.ts:170-259`), còn tài xế chọn ở ô chọn của `chuyen-sua`. Bản vẽ vẽ một thao tác mới → **Câu hỏi 4** | DL/phạm vi |
| C4 | Dải đỏ "Không thể xếp: tài xế đang bận" / "Hoàng Nam bận từ 06:00 02/10 đến 18:00 03/10. Chọn tài xế khác hoặc đổi giờ chuyến TR-0131." | 6, 10 | 409 `TRUNG_GIO_TAI_XE` | Kế hoạch ghi câu 409 là "lịch tài xế bận: <lý do> <khoảng giờ>". Bản vẽ **không có lý do**, có tên + khoảng giờ + mã chuyến → theo Câu hỏi 2; câu viết theo bản vẽ | BM + DL |
| C5 | Bảng điện thoại 390 | 10 | như trên | Lịch trên điện thoại có 3 thẻ (Chưa xếp / Xe / Cần xử lý), bản vẽ không nói dải nằm ở thẻ nào | TH |

---

## 3. Câu hỏi cho chủ

**Câu 1. Thẻ chuyến của tài xế đối tác có ghi tách "6 người lớn · 3 trẻ em" không?**
- **Khuyến nghị: Không, chỉ ghi tổng "9 khách" như màn tài xế hiện nay.**
- Lý do: ADR-0053 D7.3 chỉ cho tài xế đối tác thấy "số người mỗi điểm". Dữ liệu tài xế hôm nay không có phần tách người lớn / trẻ em; muốn có phải lấy thêm từ đơn hàng, mà tài xế đối tác là người ngoài và thấy cả **trước** giờ xem khách. Mức lộ thấp (không chỉ ra được ai) nhưng là trường mới chưa có trong ADR.
- Nếu chọn khác (hiện tách NL/TE): cần thêm một dòng vào ADR-0053 D7.3, thêm trường DTO, thêm bài kiểm "không lộ". Việc thêm cỡ nửa ngày. Lợi ích: tài xế biết trước cần ghế trẻ em.

**Câu 2. Người xếp xe có thấy lý do bận ("Ốm", "Việc riêng") của tài xế đối tác không?**
- **Khuyến nghị: Không. Làm như bản vẽ: dải chỉ có tên + nhà xe + giờ; câu chặn cũng không có lý do. Bỏ luôn lý do khỏi dữ liệu văn phòng nhận.**
- Lý do: người xếp xe chỉ cần biết "bận từ … đến …". "Ốm" là thông tin sức khoẻ của người ngoài công ty, càng ít người thấy càng tốt. Bản vẽ đã vẽ đúng hướng này.
- Nếu chọn khác (giữ như ADR D9.2 cho người xếp xe thấy lý do): giữ trường `lyDo` trong dữ liệu văn phòng, và cần vẽ thêm chỗ hiện lý do trên dải (bản vẽ hiện không có).

**Câu 3. Nút "Gọi văn phòng" (khi quá hạn từ chối) gọi số nào?**
- **Khuyến nghị: thêm một ô "Số điện thoại điều phối" vào Chính sách điều phối, Toàn quyền nhập. Màn tài xế nhận số đó. Khi chưa nhập số thì ẩn nút, chỉ giữ câu "hãy gọi văn phòng".**
- Lý do: hệ thống chưa có số văn phòng nào. Số duy nhất đang có là "Hỗ trợ kỹ thuật" viết cứng ở trang đăng nhập, mà số đó không phải người xếp xe. Một ô có tên, do Toàn quyền đặt, thì đổi được mà không cần sửa mã.
- Nếu chọn khác: (a) viết cứng một số vào mã thì mỗi lần đổi số phải phát hành lại; (b) bỏ nút, chỉ giữ chữ thì lệch bản vẽ, tài xế phải tự tìm số.

**Câu 4. Câu chặn "Không thể xếp: tài xế đang bận" hiện khi nào: phải làm thêm "kéo chuyến thả vào tài xế" như bản vẽ không?**
- **Khuyến nghị: Không làm thao tác kéo mới ở đợt này. Câu chặn (đúng chữ và màu của bản vẽ) hiện ở chỗ đang chọn tài xế (màn Tạo / sửa chuyến) khi máy chủ từ chối. Ô chọn tài xế ghi thêm "Bận" cạnh tên người đang có khung bận. Dải "Tài xế bận" vẫn đặt trên lịch như bản vẽ.**
- Lý do: lịch hiện xếp theo **xe**, không có hàng tài xế để thả chuyến vào. Kéo thả hôm nay là kéo chặng vào chuyến. Làm thêm kéo chuyến vào tài xế là một tính năng mới (luật chọn đích, bàn phím, điện thoại), vượt Đợt 6.
- Nếu chọn khác (làm đúng kéo thả như bản vẽ): cần thêm hàng tài xế trên lịch và một bản vẽ cho thao tác đó trên điện thoại; đợt kéo dài thêm vài ngày.

---

## 4. Sửa kế hoạch con (để người code theo bản vẽ)

1. **Task 3, `CuocChiTietResponse`:** đổi `hanTuChoi?: string` ("HH:mm dd/MM") thành `hanTuChoi?: GioVnDto` (`{ ngay, gio }`), để màn viết được "đến 18:00 **hôm nay**" hoặc "đến 18:00 ngày 01/10". Làm tương tự cho `thayKhachTu` (bản vẽ: "từ 00:00 ngày 02/10").
2. **Task 5, `CuocChiTietResponse`:** thêm `lyDoTuChoi: { code, nhan }[]` (nhóm `TU_CHOI_CHUYEN` đang dùng; chỉ khi `tuChoiDuoc`). Bản vẽ A2 cần danh sách này, kế hoạch chưa có nguồn.
3. **Task 5, ánh xạ lỗi trên màn:** 409 `stale` → dải đỏ A5, giữ dải sau khi đọc lại ra 404, nút "Về cuốc của tôi" → `/cuoc`. 409 `refuse_deadline_passed` → chuyển sang trạng thái A3 (đóng tấm, hiện dải vàng). 409 "đã xuất bến / kết thúc / huỷ" → đọc lại chi tiết.
4. **Task 6, `GET /ban/cua-toi`:** trả thêm `lyDo: { code, nhan }[]` (nhóm `BAN_TAI_XE`) cho ô chọn của biểu mẫu B3. `KhungBanDto` thêm `trangThai: "DANG" | "SAP" | "DA_RUT"` để vẽ chip "Đang hiệu lực / Sắp tới / Đã rút".
5. **Task 6, 409 `khung_ban_chong_chuyen_tai_xe`:** `chuyen: { id, ma, gio }[]` (thêm `id`) cho liên kết "Mở chuyến TR-0123" (B5). Đây là chuyến của chính người gọi.
6. **Task 6, `KhungBanTaiXeDto`:** thêm `nhaXe: string[]` (cùng nguồn `taiXeChoDieuPhoi`). Bỏ `lyDo` nếu chủ chọn khuyến nghị Câu 2.
7. **Task 6, câu 409 `TRUNG_GIO_TAI_XE` vì khung bận:** dùng chữ của bản vẽ "<Tên> bận từ <giờ ngày> đến <giờ ngày>. Chọn tài xế khác hoặc đổi giờ chuyến <mã>.", tiêu đề "Không thể xếp: tài xế đang bận". Không có lý do (Câu 2).
8. **Task 6/10, khoảng ngày của dải C2:** `tu` = ngày đang xem, `den` = ngày đang xem + 6 (bản vẽ hiện cả khung sắp tới). Dải chỉ hiện khi `can(staff,"trip.dispatch")`. Kế toán không gọi route (403), không thấy dải. Danh sách rỗng thì ẩn dải.
9. **Task 9/10, màn A giữ khung hiện có của `veXuatBen`** (meta, các điểm, thẻ "Điều kiện xuất bến", nút "Xuất bến" dính đáy) và chỉ **thêm** các khối mới:
   - dải info hạn ở đầu (`banner-info`);
   - nút "Từ chối chuyến" (`vc-btn vc-btn-ghost-primary`, phụ) đặt cạnh "Xuất bến" ở thanh đáy, hiện khi `tuChoiDuoc && can(staff,"trip.refuse")`;
   - dải vàng quá hạn kèm "Gọi văn phòng" (Câu 3);
   - thẻ "Khách trên chuyến" nền xám với dòng "Thấy danh sách khách từ …", hiện khi không có `hoTen` mà có `thayKhachTu`. Thẻ này hiện ở **cả** trạng thái còn hạn (bản vẽ A1 thiếu, A4 thiếu nút; theo luật dữ liệu chứ không theo từng bảng).
   - Thẻ "Chuyến của tôi" của bản vẽ là bản rút gọn, **không** thay danh sách điểm.
10. **Task 10, tấm Từ chối:** dùng `moBangTruot` + `nhomChon` có sẵn. Tiêu đề "Từ chối chuyến <mã>", phụ "<giờ ngày> · <biển số>", dải vàng nhắc, nút "Xác nhận từ chối" `vc-btn-danger` (khoá tới khi chọn lý do) / "Quay lại". Không ô chữ.
11. **Task 10, trang `/ban`:** `public/ban.html` + `web/ban.ts`, khai `PAGES` ở `src/shared/sw-policy.ts`, thêm vào script `build:web`. Hỏi lại khi rút bằng **dải ngay trong trang** (B4), không dùng tấm. Ô ngày giờ `datetime-local` cỡ 16px.
12. **Task 9/10, menu tài xế (`web/shell.ts`):** thêm "Báo bận của tôi" (biểu tượng `clock`) cho tài khoản "chỉ tài xế" có `can(staff,"unavailability.self")`. Không hiện cho Toàn quyền: ô `any` của Toàn quyền là quyền trên máy chủ, còn menu này là màn của tài xế. "Cuốc của tôi" đổi biểu tượng sang `assign` theo bản vẽ.
13. **Điều phối chốt giữa Đợt 5 và Đợt 6:** nhãn tab "Cuốc của tôi" (Đợt 6, khớp mã) hay "Chuyến của tôi" (Đợt 5). Có bỏ tab "Trang chủ" (/tai-xe) của tài xế không (cả hai bản vẽ đều không có). Thanh tab cuối cùng: Cuốc / Đề nghị (Đợt 5) / Báo bận / Tôi là 4 tab.
14. **Màu nút "Xuất bến":** bản vẽ 6 vẽ `primary`, bản vẽ 06 (đã thi công) vẽ `accent`. Khuyến nghị giữ `accent` vì Đợt 6 không vẽ lại màn Xuất bến. Điều phối xác nhận.
15. **Task 10, câu chặn C4** hiện ở `web/chuyen-sua.ts` (và hộp xếp nếu có), theo Câu 4. Ô chọn tài xế ghi "Bận" cạnh tên có khung bận trong giờ chuyến (dữ liệu lấy từ `ban-tai-xe`, không thêm route).
16. **Task 10, chip:** `Đang hiệu lực` → `chip('…','ok')`, `Sắp tới` / `Đã chọn` → `'unit'`, `Đã rút` → `'muted'` (+ dòng mờ), `Bận` → `'warn'`, `Bị chặn` → `'danger'`, `Chờ xếp` → `'unit'`.
17. **Task 10, `web/CLAUDE.md`:** thêm dòng bảng "trang ↔ kịch bản" cho `/ban` và phần Từ chối của `cuoc-chuyen` (đã có trong mục 5 của tệp đề xuất luật Task 4). Kịch bản Chrome 390 + 1040 chạy theo thứ tự Tài xế đối tác → Bán hàng → Kế toán (Kế toán không thấy dải).
18. **Task 11:** cập nhật Trợ giúp tài xế `src/shared/huong-dan-tai-xe.ts` (Từ chối, Báo bận, "Gọi văn phòng"), và bỏ câu cũ "tài xế đối tác chưa dùng chuyến" ở `web/tai-xe.ts:20-23`.
19. **"Cần chủ" của kế hoạch:** thêm Câu 1–4 ở trên. Câu 2 sửa nghĩa ADR-0053 D9.2 (bớt thấy, là siết), cần một dòng chủ duyệt.

### Trạng thái bản vẽ THIẾU (code theo khuôn có sẵn)

| # | Thiếu | Khuôn dùng |
|---|---|---|
| T1 | Đang tải danh sách Báo bận | khung chờ như `/cuoc` |
| T2 | Lỗi mạng / lỗi chung khi tải `/ban` | `showError(errorEl, loiCua(e))` |
| T3 | Đang gửi Từ chối / Lưu khung bận / Rút (nút khoá, tấm bận) | `bang.setBusy`, `taoLenh` cùng `requestId` |
| T4 | 409 quá hạn **giữa lúc** đang mở tấm Từ chối | đóng tấm → trạng thái A3 |
| T5 | 409 chuyến đã xuất bến / huỷ khi Từ chối | `dai("danger", …)` + đọc lại |
| T6 | 400 biểu mẫu: quá 14 ngày, bắt đầu đã qua, kết thúc ≤ bắt đầu, thiếu lý do | `vc-field-error` dưới từng ô |
| T7 | 409 rút khung đã rút (bằng `requestId` khác) | dải + tải lại danh sách |
| T8 | 409 CSDL `khung_ban_chong_chuyen_tai_xe_csdl` "Bạn vừa được xếp chuyến trùng giờ này — tải lại để xem chuyến." | dải đỏ + "Tải lại" |
| T9 | Khung đã hết giờ (không rút): có hiện không | máy chủ không trả (chỉ "còn hiệu lực + đã rút 30 ngày"), không vẽ |
| T10 | Tài xế công ty mở chuyến: không có nút Từ chối, không có dải hạn, không có menu Báo bận | `tuChoiDuoc=false`, `can()` false → màn như cũ |
| T11 | Kế toán ở lịch: không có dải | `can(trip.dispatch)` false → không gọi route |
| T12 | Dải "Tài xế bận" rỗng | ẩn dải |
| T13 | Vị trí dải trên điện thoại (3 thẻ của lịch) | khuyến nghị: đầu thẻ "Xe" |

---

## 5. Ánh xạ token (bản vẽ `_ds` → `public/app.css`)

`_ds/colors.css` ghi rõ "exact values from tourdaobooking public/app.css :root", nên các màu trùng tên trùng giá trị. Không nhập CSS `_ds`.

| Bản vẽ dùng | Ở đâu trong bản vẽ | `public/app.css` | Ghi chú |
|---|---|---|---|
| `--c-primary` #0c4a6e | tiêu đề H, nút `primary`, chip `soon` (chữ), viền thẻ nổi | `--c-primary` | trùng |
| `--c-primary-soft` | chip `soon` nền, dòng chọn | `--c-primary-soft` | trùng (`.dp-chip-unit`) |
| `--c-accent` / `--c-accent-strong` | nút `accent` "Báo bận" | `--c-accent` (`.btn-accent`) | trùng |
| `--c-sand-soft` / `--c-sand-text` / `--c-sand-border` | chip `warn` "Bận", dải warning | cùng tên | `.dp-chip-warn`, `.banner-warning` |
| `--c-green-soft` / `--c-green-text` | chip `ok` "Đang hiệu lực" | cùng tên | `.dp-chip-ok` |
| `--c-danger` / `-text` / `-soft` / `-border` | nút `solid` (`.bsd`), chip `bad`, dải danger | cùng tên | nút → `.vc-btn-danger`; chip → `.dp-chip-danger`; dải → `.banner-danger` |
| `--c-text-muted` | chip `end` chữ, chú 13px | `--c-text-muted` | trùng |
| **`#E6EDF3`** (viết cứng) | chip `end` nền ("Đã rút", thẻ "Khách trên chuyến") | **không có**, dùng `--c-surface-alt` (#eaf2f8) qua `.dp-chip-muted` | lệch rất nhỏ, không thêm token |
| **`#EEF2F6`** `.sb-gray` | nền thanh bên khung canvas | **không có** | chỉ thuộc khung canvas, app dùng `--surface-sidebar`, không mang sang |
| `--c-surface` / `--c-card` / `--c-border` | thẻ trắng, viền | cùng tên | trùng |
| `--c-surface-alt` (`--surface-page`) | nền trang | `--c-surface-alt` | trùng |
| `--shadow-overlay` | thẻ `float` | `--shadow-overlay` | trùng |
| bo 12px (CD) | thẻ | `--radius-md` (đo lại; `.vc-card` dùng sẵn) | dùng lớp `.vc-card` |
| đệm 16, khe 16 | thẻ, lưới | `--s4` | trùng |
| nút 44px | mọi nút | `--tap-min` | trùng |
| ô 44px, chữ 16px | biểu mẫu | `--h-field`, `--fs-field` | ô gõ 16px đúng luật |
| chữ 22px 800 (H), 16px 800 (tiêu đề thẻ), 14/13px | chữ | `--fs-h1`/`--fs-title`/`--fs-ui`/`--fs-label` + `--fw-heavy` | đo lại cỡ khi code; không viết px |
| 12px 700 ls .08em (TAG) | nhãn | `--fs-badge` + `--ls-eyebrow` | trùng ý |
| lưới `minmax(340px,1fr)` | bảng máy tính | **không có** | chỉ của khung canvas, không mang sang |

Không cần token mới. Nếu muốn nền chip "Đã rút" đúng #E6EDF3 thì phải thêm token, nhưng khuyến nghị **không** thêm.

---

## 6. Tệp mã sẽ bị chạm (để điều phối biết chỗ đụng nhau giữa các đợt)

**Giao diện**
- `web/cuoc-chuyen.ts`: dải hạn, nút + tấm Từ chối, dải quá hạn, thẻ "thấy khách từ", lỗi 409. **Đụng Đợt 5** (nhờ đón, bổ sung tên trên cùng màn).
- `web/shell.ts`: tab/mục "Báo bận của tôi", biểu tượng "Cuốc", có thể bỏ "Trang chủ" tài xế. **Đụng Đợt 5** (tab "Đề nghị gửi tới tôi").
- `web/tai-xe.ts`: bỏ nhánh "chưa dùng chuyến"; `web/cuoc.ts` có thể không đổi.
- **Mới:** `web/ban.ts`, `public/ban.html`.
- `web/dieu-phoi.ts`: dải "Tài xế bận". **Đụng Đợt 3/4/5** (cùng màn lịch).
- `web/chuyen-sua.ts`: câu chặn + chữ "Bận" ở ô chọn tài xế. **Đụng Đợt 3** (khung bận xe), **Đợt 4** (giá thuê khi đổi xe).
- `web/dieu-phoi-ui.ts`: chỉ dùng lại `chip`, `dai`, `nhomChon`, có thể không sửa.
- `public/app.css`: khối `.dp-cc-*` (tấm Từ chối, dải hạn), khối mới `.ban-*` hoặc `.dp-ban-*` cho `/ban` và dải lịch, chỉ dùng token.

**Dùng chung / hợp đồng**
- `src/shared/contracts.ts`: `CuocChiTietResponse` (`hanTuChoi`, `tuChoiDuoc`, `thayKhachTu`, `lyDoTuChoi`, có thể thêm `soDienThoaiVanPhong` theo Câu 3), `KhungBanDto`, `KhungBanTaiXeDto` (+`nhaXe`, ±`lyDo`), thân lỗi 409 `chuyen[]`. **Đụng Đợt 3, 5** (cùng tệp).
- `src/shared/start-page.ts` (+test): `coCuocCuaToi`, `homeRedirect`.
- `src/shared/sw-policy.ts`: `PAGES` thêm `/ban`.
- `src/shared/permissions.ts` (+test): `trip.refuse`, `unavailability.self`, cột `DRIVER_PARTNER`. **Đụng Đợt 5** (`trip.transfer`, `trip.passenger.add`).
- `src/shared/huong-dan-tai-xe.ts`, `src/shared/changelog.ts`, `src/shared/app-info.test.ts`.
- `package.json` (script `build:web`).

**Máy chủ** (theo kế hoạch, không đổi vì bản vẽ, trừ các mục KH ở trên)
- `src/modules/van-chuyen/index.ts`, `tai-xe-dto.ts`, `khung-ban.ts` (Đợt 3), `chinh-sach.ts` + `repository.ts` (thêm cột số điện thoại nếu Câu 3 = khuyến nghị: **migration thêm cột, đụng thứ tự số migration với Đợt 3/4/5**).
- `docs/data-dictionary.json`.

**Tài liệu / kiểm**
- `web/CLAUDE.md` (đề xuất, chủ duyệt), `docs/evidence/<ngày>-van-chuyen-dot-6/kich-ban/*.mjs`.
