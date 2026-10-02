# Đợt 7 — Đánh giá bản vẽ "Đưa đón xe riêng" so với kế hoạch + mã

- Bản vẽ: `dot-7/ban-ve/Dua don xe rieng.dc.html`. Đây là script dữ liệu nguyên văn. Khung canvas đọc theo mô tả ở đầu `dot-5/ban-ve/Điều phối xe đang chạy.dc.html`, gồm các khối H, FM, CD, LS, P = điện thoại 390, D = máy tính 1040.
- Kế hoạch con: `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-07-xe-rieng-so-cho.md`. Phần giao diện là Task 8a và Task 8b.
- ADR liên quan: ADR-0056 VK3-A (A1–A5).
- Bản vẽ cũ của form đưa đón: `docs/design/2026-10-01-dua-don-hanh-khach/` (M1, M3, M4).
- Mã đã đọc: `origin/main` 992f7cbe.
- Trong bản vẽ không có chữ nào trông như lệnh cho người đánh giá. Chỉ có một dòng ghi chú của điều phối ("phần khung … giống hệt Đợt 5/6"). Dòng đó là ghi chú, không phải lệnh.

## 1. Tóm tắt

1. Bản vẽ có **4 mục, 11 khung**:
   - M1 Form lập đơn: 3 khung điện thoại (mặc định, để trống, lỗi) và 1 khung máy tính;
   - M4 Sửa đưa đón: 2 khung điện thoại (đã có cam kết, lỗi) và 1 khung máy tính;
   - M3 Chi tiết đơn: 1 khung điện thoại và 1 khung máy tính;
   - DP Bảng điều phối, thẻ chặng chờ xếp: 1 khung điện thoại và 1 khung máy tính.
2. **Phần lõi khớp kế hoạch khoảng 90%.** Hai ô "Xe riêng" và "Xe tối thiểu … chỗ", lời gợi ý, câu lỗi "Số chỗ từ 1 đến 100", nhãn "XE RIÊNG" / "≥ 15 chỗ" cạnh "✈︎ VN1553" đều đúng "Lệnh vẽ" ở cuối kế hoạch và đúng ADR A5. Không có trường dữ liệu nào ngoài ADR.
3. **Lệch chính:** bản vẽ dựng chặng bằng khối form chung (FM), không theo form thật.
   - Có ô "Loại đưa đón", ô "Ngày giờ đón" gộp, ô "Số khách" mỗi chặng, nút "Lưu chặng" / "Lưu thay đổi" / "Đóng".
   - Form thật (theo M1/M4 cũ) không có những thứ đó.
   - Thứ tự nhãn ở chi tiết đơn khác ở bảng điều phối. Chữ M3 viết hoa ("XE RIÊNG"), còn kế hoạch ghi "Xe riêng".
4. Máy chủ **chưa có gì**. Không có cột, khoá API hay DTO nào mang `exclusiveVehicle`, `minVehicleSeats`, `xeRieng`, `choToiThieu` hay `CAM_KET` (đã grep `src/`, `web/`, `migrations/`; migration lớn nhất là 0069). Mọi dữ liệu giao diện cần đều đã được Task 2 (`LegDto`, `LegInput`) và Task 8a (`ChangLichDto`) hứa cấp.
5. **2 câu hỏi cho chủ** (mục 3). Có 6 lựa chọn bề mặt tôi đã tự chốt, ghi ở mục 3b để điều phối xem.

## 2. Bảng màn / trạng thái

Quy ước cột "Loại": BM = bề mặt, theo bản vẽ; DL = chạm dữ liệu / quyền, cần hỏi chủ; TH = bản vẽ thiếu, làm theo khuôn có sẵn; KHUNG = phần do khối vẽ chung sinh ra, không phải yêu cầu.

| # | Màn / trạng thái (bản vẽ) | Task kế hoạch | Route / DTO cần (hiện trạng) | Lệch | Loại |
|---|---|---|---|---|---|
| 1 | M1 · Tạo đơn · "Có hai ô mới": Xe riêng **Bật**, Xe tối thiểu **15 chỗ** (390) | 8b (`web/khoi-dua-don.ts`, `src/shared/chang-form.ts`) | `POST/PUT /api/orders`, `LegInput.exclusiveVehicle?`, `minVehicleSeats?` (Task 2, **chưa có**) | Vị trí hai ô: bản vẽ đặt ngay sau "Số hiệu chuyến bay", cùng lưới. Form thật có lưới phụ `.dd-luoi-phu` (`web/khoi-dua-don.ts:176-203`) gồm ô số hiệu (chỉ khi nơi đón/trả là sân bay) và "Số người chiều về" (chỉ chiều về). Hai ô mới chen vào **cuối** lưới này, có ở **mọi** chặng. | BM |
| 2 | Ô "Xe riêng": nhãn trên, khung 44px viền có công tắc 44×26 + chữ "Bật"/"Tắt", gợi ý "Không ghép khách đơn khác" | 8b | — | Form đơn chưa có công tắc. Khuôn có sẵn là `.dp-switch` (`web/chinh-sach-dieu-phoi.ts:91`, `role="switch"`), nhưng dạng dòng ngang. Bản vẽ dùng dạng "ô có nhãn trên" giống các ô bên cạnh. Màu tắt bản vẽ `#9FB3C4` ≠ `.dp-switch` tắt `--c-border` (xem mục 5). | BM |
| 3 | Ô "Xe tối thiểu": có giá trị thì chữ "chỗ" nằm phải trong ô; gợi ý "Không kể tài xế (xe 16 chỗ nhập 15)" | 8b | `minVehicleSeats: number \| null` | Kế hoạch gọi là "Xe tối thiểu … chỗ"; bản vẽ đặt nhãn "Xe tối thiểu" và hậu tố "chỗ" trong ô. Cần lớp CSS hậu tố mới, khuôn chồng chữ giống `.dd-gio-mo`. | BM |
| 4 | M1 · "Để trống = không yêu cầu": Xe riêng **Tắt**, ô số trống, chữ mờ "Để trống = không yêu cầu", không hậu tố | 8b (`rong`, `tuMau` → `false` / `""`) | — | Khớp kế hoạch. Chữ mờ là `placeholder`, màu `--c-placeholder`. Đây cũng là trạng thái mặc định của chặng mới và chặng tạo từ mẫu. | BM |
| 5 | M1 · "Lỗi số chỗ" (120) và M4 · "Lỗi số chỗ" (0): viền đỏ 2px, câu "Số chỗ từ 1 đến 100", **ẩn** gợi ý | 8b (`loiChang`) | Máy chủ báo câu dài hơn: "…số nguyên từ 1 đến 100 (không kể tài xế)" (Task 2) | (a) Câu ở ô lấy **đúng bản vẽ**: "Số chỗ từ 1 đến 100". Kế hoạch chưa chốt câu phía máy khách. (b) Viền 2px của bản vẽ khác khuôn lỗi khối Đưa đón (`.dd-chang [aria-invalid]` chỉ đổi màu viền, `.field-error` có biểu tượng). Xem 3b-2. (c) Khi lỗi thì ẩn gợi ý: bản vẽ vẽ rõ. | BM |
| 6 | M1 máy tính 1040: form mặc định và form lỗi đặt cạnh nhau | 8b | — | Chỉ là cách trình bày hai trạng thái, không phải bố cục thật. | KHUNG |
| 7 | M1/M4: ô "Loại đưa đón ▾", "Ngày giờ đón" gộp, "Điểm đón"/"Điểm trả", **"Số khách" mỗi chặng**, nút "Lưu chặng"/"Huỷ", "Lưu thay đổi"/"Đóng"; tiêu đề M4 "TD-… · Chặng 1" | không (kế hoạch: "giữ nguyên mọi thứ đang có") | "Số khách" mỗi chặng **không có** trong `LegInput`. Chỉ chiều về có `paxOverride`, và chỉ văn phòng ghi. | Form thật (M1/M4 cũ đã thi công): "Ngày đón" + "Giờ đón" tách, "Nơi đón"/"Nơi trả", không có ô loại hay số khách mỗi chặng, không có nút lưu từng chặng. Bảng "Sửa đưa đón" theo **dịch vụ** (nút "Huỷ"/"Lưu", `web/sheet-dua-don.ts:45-46`), không theo chặng. | DL → **Câu 1** |
| 8 | M4 · "Bảng sửa, đã có cam kết": hai ô hiện giá trị đang lưu (Bật, 15) | 8b (`web/sheet-dua-don.ts` gửi hai khoá; `changTuDto`) | `PUT /api/orders/:id/legs/:legId`, `POST …/legs` (ô `order.trip.edit`); `LegDto.exclusiveVehicle`, `minVehicleSeats` (Task 2, **chưa có**) | Khớp. Bảng sửa dùng chung `khoiDuaDon` (`che: "bang"`), nên hai ô tự có. Lệnh **chỉ** đổi cam kết không xét mốc 6 giờ (Task 2) nên không bật khung đặt gấp. | BM |
| 9 | M3 · Chặng 1 có nhãn **[XE RIÊNG] [≥ 15 chỗ] [✈︎ VN1553]**; Chặng 2 chỉ [✈︎] | 8b (`web/order.ts` `dongChang`, `:179-200`) | `LegDto` hai khoá (Task 2) | (a) Thứ tự: hai nhãn mới **trước** nhãn chuyến bay. (b) Chữ "XE RIÊNG" **viết hoa**, kế hoạch Task 8b ghi "Xe riêng". (c) Màu: "XE RIÊNG" nền đặc `--c-primary` chữ trắng; "≥ 15 chỗ" nền `--c-primary-soft` chữ `--c-primary`. | BM |
| 10 | M3: thẻ chặng có các hàng "Giờ đón / Điểm đón / Điểm trả / **Số khách 9 (6 NL · 3 TE)**", tiêu đề "Chặng 1 · Đón sân bay" | không | — | Trang đơn thật hiện một dòng mỗi chặng (`dongChang`: chiều · ngày · giờ · nhãn; "nơi đón → nơi trả"), không có hàng "Số khách" mỗi chặng. Đây là khối CD chung của khung vẽ. | KHUNG, gộp vào **Câu 1** |
| 11 | M3: ai thấy nhãn cam kết (bản vẽ chỉ vẽ vai Bán hàng) | 8b; Task 2 thêm vào `LegDto`, không lọc theo vai | `GET /api/orders/:id` (mọi người xem được đơn) | ADR chỉ nói hàm hẹp của Vận chuyển và "DTO tài xế: không cần". ADR không nói Kế toán / Hướng dẫn viên / Đối tác có thấy cam kết trên trang đơn hay không. | DL → **Câu 2** |
| 12 | DP · "Chặng chờ xếp": thẻ có **[✈︎ VN1553] [XE RIÊNG] [≥ 15 chỗ]**; thẻ chỉ có [≥ 15 chỗ]; thẻ chỉ có [XE RIÊNG]; thẻ không nhãn; chú thích "Nhãn ngắn cạnh chuyến bay cho biết…" | 8a (`ChangLichDto.xeRieng`, `choToiThieu`), 8b (`web/dieu-phoi.ts` `theChang`, `:162-176`) | `GET /api/van-chuyen/lich?ngay=` → `ChangLichDto` (Task 8a, **chưa có**) | (a) Thứ tự trên bảng: chuyến bay **trước**, rồi XE RIÊNG, rồi ≥ N chỗ. Ở M3 thì ngược lại (xem 3b-4). (b) Mã thật đặt nhãn trạng thái (`chipChang`: Sát mốc, Thiếu tên…) trước nhãn chuyến bay. Hai nhãn mới đứng **sau** nhãn chuyến bay. (c) `aria-label` thêm ", xe riêng", ", tối thiểu 15 chỗ" (kế hoạch đã ghi). | BM |
| 13 | DP: nhãn "Chờ xếp" (vàng) ở cột phải mỗi dòng, tiêu đề "Chặng chờ xếp", dòng chú 13px | không | — | Bảng thật có cột "Chưa xếp" (`veChuaXep`), thẻ không có nhãn "Chờ xếp" riêng. Đây là khối LS chung. Dòng chú "Nhãn ngắn cạnh chuyến bay…" là chú thích cho người xem bản vẽ, **không** đưa vào màn. | KHUNG |
| 14 | Hộp phá lệ khi 409 `can_pha_le_cam_ket`; câu "Cần Quản trị cho phép" khi người dùng không có `trip.override` | 8a (khuôn hộp `moPhaLe` có sẵn, C10: "không cần vẽ") | `POST …/phan-bo`, `POST …/doi`, `PUT …/chuyen/:id` thêm `camKetPhaLe` (Task 4) | Bản vẽ không vẽ. Đúng ý kế hoạch. | TH |
| 15 | Chuyến bị **giữ** vì cam kết (lịch chung, Chi tiết chuyến "Điều kiện xuất bến", Cần xử lý) | 3 (lý do `CAM_KET` vào `MA_GIU`, lời "Trái cam kết xe riêng / số chỗ tối thiểu"), 5 | `kiemXuatBen` → lý do giữ hiển thị qua khuôn có sẵn | Bản vẽ không vẽ. Hiện bằng khuôn lý do giữ có sẵn (`dieuKienXuatBen`, `viecCanXuLy`). | TH |
| 16 | Đối tác / Thực tập lập nháp có bật xe riêng | 2 (bài 4), 8b (`legInput` **luôn** gửi hai khoá) | `order.modify` | Bản vẽ chỉ vẽ Bán hàng. ADR A1 đã chốt Đối tác và Thực tập **được ghi**, nên hai ô **không** chuyển sang chỉ xem như "Số người chiều về" ở M1-e cũ. | TH |
| 17 | Chiều về (có "Số người chiều về"), chặng không có sân bay (không có ô số hiệu), nhiều chặng | 8b | — | Bản vẽ chỉ vẽ chặng đón sân bay. Theo luật ở #1: hai ô mới luôn đứng cuối lưới phụ. | TH |
| 18 | Đang tải / lỗi mạng / người khác vừa sửa (409 cũ) / Kế toán chỉ xem bảng điều phối | — | — | Không vẽ. Dùng khuôn có sẵn: Kế toán thấy thẻ là `div`, vẫn có nhãn (`theChang` khi `!co.dieuPhoi`). | TH |
| 19 | Trang tài xế, DTO tài xế | ngoài phạm vi (ADR: "không cần") | — | Bản vẽ không vẽ. Đúng. | — |

## 3. Câu hỏi cho chủ

### Câu 1. Bản vẽ vẽ chặng khác form thật: chỉ chen hai ô mới, hay làm lại form theo bản vẽ?

Bản vẽ Đợt 7 dựng chặng bằng khung form chung. Khung này có:
- ô "Loại đưa đón";
- ô "Ngày giờ đón" gộp;
- ô **"Số khách" cho từng chặng**;
- nút "Lưu chặng" riêng từng chặng;
- ở trang đơn có thêm hàng "Số khách 9 (6 NL · 3 TE)" mỗi chặng.

Form thật đang chạy (theo bản vẽ M1/M4 anh đã duyệt hôm 1/10) không có những thứ này.

- **Khuyến nghị (đặt đầu): chỉ chen hai ô "Xe riêng" và "Xe tối thiểu … chỗ" vào cuối hàng ô phụ của mỗi chặng. Mọi thứ khác giữ như form hiện tại.**
- **Lý do:**
  - "Lệnh vẽ" gửi Claude Design ghi rõ "giữ nguyên mọi thứ đang có".
  - Các ô khác trong bản vẽ chỉ là khung minh hoạ để đặt hai ô mới vào.
  - Ô "Số khách" từng chặng chạm dữ liệu: hiện chỉ chiều về có "số người riêng", và chỉ văn phòng được sửa.
- **Nếu chọn làm theo bản vẽ:**
  - phải có ADR mới cho số khách từng chặng (ai sửa, tính tiền ra sao);
  - phải đổi cách lưu: lưu từng chặng thay vì lưu cả đơn hoặc cả bảng;
  - phải làm lại form M1/M4 đã thi công. Đợt 7 sẽ chậm lại nhiều.

### Câu 2. Ai thấy nhãn "XE RIÊNG" / "≥ 15 chỗ" ở trang chi tiết đơn?

- **Khuyến nghị (đặt đầu): mọi người xem được chặng đều thấy, gồm Kế toán, Hướng dẫn viên và Đối tác chủ đơn. Tài xế không nhận (theo ADR).**
- **Lý do:**
  - Đây là lời hứa với khách, không chứa tiền hay tên. Đối tác là người tự bật nó trên nháp.
  - Hướng dẫn viên cần biết đoàn có xe riêng.
  - Đây cũng là cách số hiệu chuyến bay đang được hiện.
  - Kế hoạch (Task 2) đã thêm hai khoá vào dữ liệu chặng chung, không lọc theo vai. Nếu chọn khác thì phải thêm luật lọc.
- **Nếu chọn chỉ văn phòng thấy:**
  - phải thêm luật che theo vai ở máy chủ, kèm bài test;
  - Đối tác sẽ không thấy lại lời hứa chính mình đã ghi. Ô trên form nháp vẫn hiện nên có thể gây rối.

### 3b. Lựa chọn bề mặt tôi đã tự chốt (điều phối xem lại; đảo ngược được)

| # | Câu | Đã chọn | Lý do | Cách hoàn tác |
|---|---|---|---|---|
| 3b-1 | Kiểu chữ nhãn (bản vẽ: 800 12px, giãn chữ .04em, đệm 2px 10px) | Dùng lớp `.chip` có sẵn của app | Khung vẽ áp kiểu này cho **mọi** nhãn, kể cả nhãn "✈︎" đang chạy. Đây là kiểu của hệ thiết kế chung, không phải yêu cầu riêng đợt này. Có lẽ Đợt 5/6 gặp đúng chỗ này nên điều phối nên chốt chung một lần. | Thêm biến thể `.chip` theo bản vẽ cho mọi nhãn |
| 3b-2 | Ô lỗi viền 2px (bản vẽ) hay khuôn lỗi khối Đưa đón (viền đỏ 1px + dòng lỗi có biểu tượng) | Khuôn có sẵn của khối Đưa đón | Hai ô nằm cùng lưới với ô "Số người chiều về", vốn đã có lỗi theo khuôn này. Lấy đúng **câu chữ** của bản vẽ. | Đổi `.dd-chang [aria-invalid]` sang `border-width: 2px` (ảnh hưởng mọi ô của khối) |
| 3b-3 | Màu công tắc khi tắt (`#9FB3C4`, không có token) | `--c-placeholder` (#94a3b8): token có sẵn, gần nhất | Không thêm màu mới (luật `web/CLAUDE.md`: màu mới phải hỏi chủ). `--c-border` của `.dp-switch` quá nhạt so với bản vẽ. | Thêm token mới nhóm "Riêng" nếu chủ muốn đúng mã màu |
| 3b-4 | Thứ tự nhãn khác nhau giữa hai màn | Theo bản vẽ **từng màn**: trang đơn [XE RIÊNG][≥ N chỗ][✈︎]; bảng điều phối [✈︎][XE RIÊNG][≥ N chỗ] | Luật chủ: bề mặt theo bản vẽ 100% | Đổi thứ tự ở một chỗ |
| 3b-5 | Lưới ô phụ ở 390px: bản vẽ mỗi ô một hàng (rộng 170px), mã thật `--w-dd-phu: 140px` (hai ô một hàng) | Giữ 140px; xem ảnh 390, nếu chữ gợi ý bị ép thì đổi token lên 170px | Lưới 140px đã duyệt theo M1 cũ. Đổi token thì ảnh hưởng cả ô số hiệu chuyến bay. | Đổi `--w-dd-phu` = 170px (một dòng) |
| 3b-6 | Chữ "Bật"/"Tắt" cạnh công tắc | Hiện như bản vẽ. Công tắc vẫn là `role="switch"` + `aria-checked`, chữ đặt `aria-hidden` để trình đọc màn hình không đọc hai lần. | Bản vẽ có | Bỏ chữ |

Không có câu hỏi nào phải để chủ tự quyết trong phần này.

## 4. Sửa kế hoạch con (để người code theo bản vẽ)

Sửa trong `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-07-xe-rieng-so-cho.md`, Task 8b, phần dẫn chiếu bản vẽ:

1. **Nguồn bản vẽ:** thêm "`Dua don xe rieng.dc.html` (Claude Design, dự án f0f47482) — mục M1, M4, M3, DP". Ghi rõ: các ô / nút khác trong khung (Loại đưa đón, Ngày giờ gộp, Số khách, Lưu chặng, hàng Số khách ở M3, nhãn "Chờ xếp") là **khung minh hoạ**, không làm. Phần này chờ chủ trả lời Câu 1.
2. **Vị trí:** hai ô thêm vào **cuối** `.dd-luoi-phu` của `changEl` (`web/khoi-dua-don.ts`), sau "Số hiệu chuyến bay" và "Số người chiều về". Hai ô có ở **mọi** chặng và mọi chiều, nên `phu` không bao giờ rỗng.
3. **Ô "Xe riêng":**
   - nhãn "Xe riêng";
   - khung ô cao như các ô khác, bên trong là công tắc `role="switch"` (khuôn `.dp-switch`) và chữ "Bật"/"Tắt";
   - gợi ý "Không ghép khách đơn khác".
4. **Ô "Xe tối thiểu":**
   - nhãn "Xe tối thiểu";
   - `input type="text" inputmode="numeric" maxLength=3`, chữ 16px;
   - chỉ nhận chữ số, theo khuôn ô `soVe` (gõ chữ khác thì trả lại giá trị đã lọc);
   - `placeholder` "Để trống = không yêu cầu";
   - có giá trị thì hiện hậu tố "chỗ" (`aria-hidden`) ở mép phải ô;
   - gợi ý "Không kể tài xế (xe 16 chỗ nhập 15)", **ẩn khi có lỗi**.
5. **Lỗi:**
   - câu dưới ô: **"Số chỗ từ 1 đến 100"**, ứng với 0 hoặc > 100;
   - dải lỗi chung của form (nếu có) dùng tiền tố khuôn `loiChang`: "Chặng N: số chỗ từ 1 đến 100.";
   - kế hoạch thêm trường `choToiThieu` vào `LoiChang` và `refs`;
   - câu 400 của máy chủ giữ như Task 2.
6. **Nhãn:** chữ là **"XE RIÊNG"** (viết hoa, **cả** trang đơn lẫn bảng điều phối, thay chữ "Xe riêng" ở Task 8b) và **"≥ {N} chỗ"**.
   - Màu: XE RIÊNG = nền đặc `--c-primary`, chữ `--c-on-dark` (lớp `dp-chip-navy` có sẵn; ở `web/order.ts` dùng `chip dp-chip-navy`). ≥ N chỗ = `chip-unit` / `dp-chip-unit`.
   - Thứ tự theo 3b-4.
   - Đề nghị thêm **một hàm thuần** ở `src/shared/` (ví dụ `nhanCamKet(xeRieng, choToiThieu): { nhan, tone }[]`) cho cả `web/order.ts` lẫn `web/dieu-phoi.ts` dùng chung chữ, kèm bài test. Tránh "hai luật" chữ nhãn.
7. **Trang đơn (M3):** chèn hai nhãn vào `.dd-dong-dau` của `dongChang`, trước nhãn "✈︎". Hiện cho mọi vai xem được đơn, chờ Câu 2.
8. **Bảng điều phối:** chèn vào `.dp-leg-top` của `theChang`, **sau** nhãn "✈︎". `aria-label` thêm ", xe riêng" / ", tối thiểu N chỗ". Chế độ chỉ xem (thẻ `div`) cũng hiện nhãn.
9. **Đối tác / Thực tập:** hai ô **sửa được** trên nháp (ADR A1). Không dùng khuôn "chỉ xem + ổ khoá" của "Số người chiều về".
10. **Kịch bản Chrome:** thêm các bước:
    - lỗi 0 và 120;
    - "Để trống" gửi `null`;
    - bảng "Sửa đưa đón" chỉ đổi cam kết dưới mốc 6 giờ mà không bật khung đặt gấp;
    - nhãn trên trang đơn và trên bảng (390 + 1040);
    - chạy lại `a2-smoke-*.mjs`, `dieu-phoi-smoke.mjs`, `dat-gap-smoke.mjs` theo bảng ở `web/CLAUDE.md`.
11. **Ngoài bản vẽ, không thêm:** câu nhắc trong "Sửa đưa đón" kiểu "chặng đã xếp xe — bật xe riêng có thể làm chuyến bị giữ". Bản vẽ không có, và bảng điều phối cùng cổng xuất bến đã báo "giữ". Nếu muốn thì ghi vào `docs/BACKLOG.md`.

## 5. Ánh xạ token (bản vẽ `_ds` → `public/app.css`)

| Bản vẽ dùng | Ở đâu | Tương đương trong `app.css` | Ghi chú |
|---|---|---|---|
| `--c-primary` | nền nhãn XE RIÊNG, công tắc bật, chữ nhãn ≥ N chỗ | `--c-primary` (#0c4a6e) | cùng giá trị |
| `#fff` (chữ nhãn `run`) | chữ XE RIÊNG | `--c-on-dark` | đã dùng trong `.dp-chip-navy` |
| `--c-primary-soft` | nền nhãn ≥ N chỗ | `--c-primary-soft` | cùng giá trị |
| `#E6EDF3` (nhãn `end`) | nền nhãn ✈︎ | **không có**; gần nhất `--c-surface-alt` (#eaf2f8), đang dùng ở `.chip-code` | giữ `.chip-code` có sẵn |
| `--c-text-muted` | chữ nhãn ✈︎, chữ phụ | `--c-text-muted` | cùng |
| `--c-sand-soft` / `--c-sand-text` | nhãn "Chờ xếp" (khung) | `--c-sand-soft` / `--c-sand-text` | cùng; nhãn này không làm |
| `--c-green-soft` / `--c-green-text`, `--c-danger-soft` / `--c-danger-text` | bảng `T` (không dùng ở đợt này ngoài lỗi) | cùng tên | cùng |
| `--c-danger` | viền ô lỗi | `--c-danger` | độ dày 2px → xem 3b-2 |
| `--c-danger-text` | câu lỗi 13px 700 | `--c-danger-text` (`.field-error`) | cỡ 13 → `.field-error` dùng `--fs-label` (14px), giữ khuôn |
| `--c-placeholder` | chữ mờ "Để trống = không yêu cầu" | `--c-placeholder` | cùng |
| `--c-text` | chữ ô | `--c-text` | cùng |
| `--c-border` | viền ô | `--c-border` | cùng |
| `#9FB3C4` | công tắc tắt | **không có**; chọn `--c-placeholder` (3b-3) | `.dp-switch` tắt hiện là `--c-border` |
| `#fff` (núm công tắc, nền ô) | | `--c-surface` | cùng |
| `#475569` (gợi ý 13px) | | `--c-text-muted` + `.hint` (`--fs-label`, 14px) | giữ `.hint` để đồng bộ ô bên cạnh |
| khung ô 44px | | ô của khối Đưa đón (giữ khuôn hiện có); chạm tối thiểu `--tap-min` 44px | |
| bo ô 8px | | `--radius-sm` | |
| đệm ô 0 12px | | `--s3` | |
| khe 4px nhãn–ô | | `--s1` | |
| chữ ô 16px | | `--fs-ui` | luật ô gõ 16px |
| công tắc 44×26, núm 20, lề 3 | | `--w-switch`, `--h-switch`, `--switch-knob`, `--switch-inset` | có sẵn (khối 08) |
| bo nhãn 999px | | `--radius-pill` | |
| nhãn 12px | | `--fs-badge` | độ đậm / giãn chữ → 3b-1 |
| khung vẽ: `#dfe8ef`, `.sb-gray #EEF2F6`, `#DCE4EC`, `#D3E1EC` | nền canvas, thanh bên xám | — | thuộc khung vẽ, **không** làm ở đợt này |
| Phông `Nunito` trong khối dựng | | `--font` (Be Vietnam Pro) | app dùng một phông, giữ như cũ |

Cần thêm **CSS mới**, chỉ dùng token, đặt sau mốc PWA:
- lớp khung ô công tắc trong `.dd-luoi-phu`;
- lớp hậu tố "chỗ" chồng trong ô;
- nếu dùng `--c-placeholder` cho công tắc tắt thì cần một biến thể `.dp-switch` cục bộ.

## 6. Tệp mã sẽ bị chạm (phần giao diện; phần máy chủ xem Task 1–7 của kế hoạch)

Đây là tệp **giao diện** (Task 8a / 8b):

| Tệp | Việc | Đụng đợt khác? |
|---|---|---|
| `web/khoi-dua-don.ts` | hai ô mới trong `changEl`, `refs`, lỗi | form đưa đón, nếu đợt khác chạm |
| `web/sheet-dua-don.ts` | không đổi bố cục; `changDaDoi` / `legInput` đã gửi hai khoá qua `chang-form` | — |
| `src/shared/chang-form.ts` (+ `.test.ts`) | `ChangNhap.xeRieng` / `choToiThieu`, `rong`, `changTuDto`, `tuMau`, `legInput` (luôn gửi), `changDaDoi`, `loiChang` / `LoiChang` | — |
| `src/shared/service-form.test.ts` | thân gửi có hai khoá | — |
| `web/order.ts` | `dongChang` thêm hai nhãn | **có thể đụng** đợt nào chạm trang đơn |
| `web/dieu-phoi.ts` | `theChang` thêm hai nhãn + `aria-label` | **có thể đụng Đợt 5/6** (bảng điều phối, xe đang chạy) |
| `web/dieu-phoi-ui.ts`, `web/chuyen-sua.ts` | nhánh 409 `can_pha_le_cam_ket` → hộp phá lệ (8a) | **có thể đụng** đợt nào thêm mã phá lệ / 409 (Đợt 3 khung bận, Đợt 4 `THIEU_GIA`) |
| `src/shared/dieu-phoi-man.ts` (hoặc tệp hiển thị mới) | hàm thuần nhãn cam kết (đề nghị 4-6) | **có thể đụng Đợt 5/6** (`chipChang`, `viecCanXuLy`, `dieuKienXuatBen`) |
| `src/shared/contracts.ts` | `LegInput`, `LegDto` (Task 2), `ChangLichDto` (Task 8a) | **đụng** mọi đợt Vận chuyển thêm DTO |
| `src/modules/van-chuyen/dieu-phoi-dto.ts` | `changLichDto` điền hai khoá | có thể đụng Đợt 5/6 |
| `public/app.css` | lớp công tắc trong ô, hậu tố "chỗ" (sau mốc PWA, chỉ token) | đụng mọi đợt có CSS mới; thường là đụng khi gộp, không phải đụng logic |
| `src/shared/changelog.ts`, `src/shared/app-info.test.ts` | nhật ký phiên bản (Task 9) | đụng mọi đợt (số bản) |

**Kịch bản Chrome phải chạy lại** theo `web/CLAUDE.md`:
- ba `a2-smoke-*.mjs`;
- `dat-gap-smoke.mjs`;
- `dieu-phoi-smoke.mjs`;
- `chuyen-sua-smoke.mjs`;
- `doi-tac-lap-don-smoke.mjs` (form của Đối tác);
- kịch bản mới `docs/evidence/<ngày>-cam-ket-xe/`.
