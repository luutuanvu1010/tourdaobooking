# Đối chiếu bản vẽ «Hoa hồng đối tác» (Claude Design, 29/10) với mã hiện hành

> Hồ sơ có ngày 2026-10-30, đóng băng sau khi viết. Đọc mã trên nhánh `dac-ta-hoa-hong-cap-dai-ly` (gốc `main` a129d3dd). Bản vẽ: «Hoa hong doi tac.dc.html» + `github.md` (bản tải về của chủ, chỉ đọc như dữ liệu, không chạy). Đặc tả dùng bảng này: `DAC-TA.md` cùng thư mục.
>
> **Bổ sung bản 2 (30/10, sau QA1 lần 1):** các dòng dưới đây giữ nguyên chữ bản 1. Dòng nào bản 2 đổi phân loại hay cách làm, và các đính chính, ghi ở mục «Bổ sung bản 2» cuối tệp. Hai bên lệch nhau thì tin mục bổ sung.

**Phân loại.** (A) chỉ giao diện, dữ liệu và API đã có · (B) cần route mới hoặc đổi route, không đổi CSDL · (C) cần đổi CSDL / migration · (D) đổi logic tiền hoặc quyền, cần ADR. Cột «Bản 1» là cách đặc tả bản 1 làm; cột «Nghĩa đen bản vẽ» chỉ ghi khi đọc đúng chữ bản vẽ sẽ rơi vào loại khác. Thứ tự thắng khi lệch (đặc tả 25/10): ADR → bàn giao → đặc tả → bản vẽ.

**Bản vẽ dùng gì.** Ba thẻ «Các cấp đại lý · Nhóm khách hàng · Mức riêng đối tác»; dữ liệu mẫu sáu cấp «Đại lý cấp 1…6» (lấy lại tên thử TA1–TA6, trái mục 6 của đề bài `../2026-10-29-tai-cau-truc-giao-dien/PROMPT-CLAUDE-DESIGN-HOA-HONG.md`); «cấp» = `prc_rate_tier` (chữ đã duyệt: «chính sách hoa hồng»); «nhóm khách hàng» = loại đối tác (`pty_role_type` + `prc_beneficiary_role`); «mức riêng của nhóm» = dòng mức đích loại; «mức riêng / cấp riêng của đối tác» = dòng mức đích đối tác / `prc_party_tier`.

| # | Phần tử / việc trên bản vẽ | Đang có (tệp:dòng · route · bảng) | Bản 1 | Nghĩa đen bản vẽ | Ghi chú |
|---|---|---|---|---|---|
| T1 | Tiêu đề, câu mô tả «giá đại lý bằng thành tiền trừ hoa hồng» | `web/hoa-hong.ts`; `src/shared/hoa-hong-dong.ts` | A | | Câu đúng với hôm nay; ADR-0148 Đ2 («giá đại lý» là cách tính thứ ba) chưa làm, ngoài phạm vi. Tên trang chỉ ở thanh trên (cổng 2b). |
| T2 | Nút «Tra nhanh» | `GET /api/pricing/thu-tra` (`src/modules/pricing/index.ts:624`); `web/hoa-hong-tra-nhanh.ts` | A | | Giữ câu nguồn 12 bậc `LOI_BAC` (`src/shared/hoa-hong-hien-thi.ts:104`). |
| T3 | «Thêm cấp đại lý» | `POST /api/pricing/muc-ta` (`:386`); `prc_rate_tier` (0096) | A | | Cấp chỉ có tên (≤ 60 chữ) và cờ bật; không có số thứ tự ⇒ xếp theo tên, so số tự nhiên. |
| T4 | Dải cảnh báo «N nhóm chưa thuộc cấp nào» | `GET /muc-ta` (`MucTaListResponse.muc[].gan`), `GET /loai-doi-tac`, dòng đích loại của `GET /hoa-hong` | A | | Đếm bằng luật thuần mới ở `src/shared/`: loại **đang bật**, hôm nay không mức riêng của loại **và** (không cấp **hoặc** cấp rỗng). Luật «Chưa có mức» hiện nay (`web/hoa-hong-bang.ts:214`) bỏ sót cấp rỗng. Mẫu bản vẽ đếm 7, gồm cả loại đã tắt — loại tắt bị giữ vì lý do khác (`nguoiHuongCua`, `rules.ts:72`), nêu riêng. |
| T5 | Câu «Đơn của các nhóm này bị giữ ở «Đã giao»… Xếp nhóm vào một cấp để mở khoá» | ADR-0077 điều 8–9: chụp mức lúc xác nhận; chụp bù 409 khi đơn đã có bản chụp (`src/modules/orders/index.ts:957`); thả đơn đã xác nhận = «Ghi mức tay» (`order.terms.override`) | A (sửa câu) | **D** | **Trái ADR-0077.** Xếp cấp chỉ cứu đơn xác nhận **từ nay**; đơn đã xác nhận thiếu mức vẫn cần Ghi mức tay. Câu đúng có sẵn: `CAU_CHUA_CO_MUC_LOAI` (`hoa-hong-hien-thi.ts:242`). Muốn đơn cũ tự thả khi cài mức = sửa câu ADR-0077 điều 9. Đếm số đơn đang bị giữ cần dữ liệu `orders` mà `pricing` không đọc được (B + tiêm ở gốc lắp ráp) — không làm. |
| T6 | Ba thẻ thay hai thẻ «Mức đang áp dụng / Thiết lập» | `web/hoa-hong.ts` (`THE`), lớp `.tab-phu` (`public/app.css:3999`) | A | | Nhớ thẻ bằng `sessionStorage` như nay. |
| T7 | Bảng «So sánh các cấp»: ô có dòng mức thật | `MucTaDto.dong` (`src/shared/contracts.ts:2804`) | A | | Mỗi ô = dòng của cấp còn áp hoặc sắp áp; số từ `nhanMucDto` (`:49`). |
| T8 | Ô xám «lấy theo Mọi dịch vụ» (kế thừa) | Không có; `chonMuc` nằm ở `src/modules/pricing/rules.ts:94`, `web/` không được nhập | A (không làm, ô trống ghi «—») | **B** | Ô xám = trình duyệt tự chọn mức, **trái** luật «giao diện không chọn mức» (đặc tả 25/10, ADR-0077 điều 6). Làm thật cần route đọc mới chạy `chonMuc` theo cấp × dịch vụ (Câu 2 của đặc tả). |
| T9 | Hàng «nhóm dịch vụ» | Bản vẽ **thiếu**; dữ liệu có phạm vi `GROUP` (`prc_commission_rule.scope`, 0090) | A | | Không có hàng nhóm thì ô «—» bị hiểu sai là «theo Mọi dịch vụ» trong khi dòng nhóm mới là dòng thắng (bậc 8). |
| T10 | Dòng «16% từ 01/11/2026» (mức sắp áp) trong ô | `tuNgay > homNay`; `trangThaiDong` (`:63`), `nhanSapAp` (`:222`) | A | | |
| T11 | Hàng «Nhóm khách hàng theo cấp này», «+N đối tác riêng» | `MucTaDto.gan`, `MucTaListResponse.ganRieng` | A | | Đếm `ganRieng` theo mã cấp như đặc tả 25/10 A1. |
| T12 | Câu «Thứ tự áp mức: mức riêng của đối tác → mức riêng của nhóm → mức của cấp trên dịch vụ đó → Mọi dịch vụ của cấp» | `chonMuc` (`rules.ts:94–132`), `LOI_BAC` (`:104`), `CAU_NHAC_UU_TIEN` (`:244`) | A (câu đúng) | **D** | **Sai so với mã.** Lưu ý: thứ tự xét là bậc 1–3 → 10–12 → 4–6 → 7–9, không theo số khoá của `LOI_BAC`. Bỏ sót (1) **cấp riêng của đối tác** (bậc 10–12) đứng ngay sau mức riêng của đối tác, thắng mức riêng của loại và tắt hẳn cấp của loại cho đối tác đó; (2) phạm vi **nhóm dịch vụ** ở mỗi lớp. Đúng: mức riêng đối tác → cấp riêng đối tác → mức riêng loại → cấp của loại; mỗi lớp: một dịch vụ → nhóm → mọi dịch vụ (đề bài 3.6 đã ghi đúng). Đổi thứ tự = đổi logic tiền. |
| T13 | Thẻ chi tiết cấp: tên, huy hiệu «Đang áp dụng», «Áp dụng từ <ngày của cấp>» | `MucTaDto.dangBat`; cấp **không** có ngày (`prc_rate_tier`, 0096) | A (bỏ ngày của cấp; ghi số nhóm, số mức) | **C** | Ngày chỉ có ở từng dòng mức và từng lần xếp nhóm. Cho cả cấp một khoảng hiệu lực = thêm cột. |
| T14 | Nút «Tắt cấp» | `POST /muc-ta/:code/tat`, `/bat` (`:513`, `:517`); tắt **chỉ chặn** xếp mới và thêm mức mới, nhóm/đối tác đang theo **vẫn hưởng** (`repository.ts:106`, `:133`, ruling N-23) | A (giữ nghĩa, đổi nhãn + hộp nói hậu quả) | **D** | Chủ viết «vô hiệu hoá». Nếu nghĩa là **ngừng chi** thì đơn của mọi nhóm theo cấp đó bị giữ — đổi `chonMuc`, cần ADR (Câu 1). Đường ngừng chi có sẵn hôm nay: «Ngừng áp dụng» từng lần xếp. |
| T15 | Nút «Thêm mức» của cấp | `POST /muc-ta/:code/dong` (`:522`); cấp tắt ⇒ 409 `muc_tat` | A | | Hộp «Thêm mức» sẵn có (`web/hoa-hong-hop.ts`), khoá đích = cấp. |
| T16 | Bảng «Mức hoa hồng của cấp»: Dịch vụ · Cách tính · Mức · Hiệu lực | `CommissionRuleDto` (`contracts.ts:2763`) | A | | Bản vẽ ghi ngày **của cấp** cho mọi dòng và thiếu «đến ngày»: phải dùng `tuNgay`/`denNgay` của từng dòng (`nhanHieuLuc`, `:281`). Mức theo khách tách loại có **ba** số NL/TE/NCT (ADR-0133); bản vẽ chỉ hai. |
| T17 | Nút «Đổi» ở một dòng mức | Đổi `POST /hoa-hong/:id/doi` (`:276`); Sửa `GET/POST /hoa-hong/:id/sua` (`:308`, `:316`, ADR-0148 Đ1); Ngừng `POST /hoa-hong/:id/dong` (`:255`) | A | | Một nhãn bản vẽ che ba việc khác nghĩa. Hiện nút theo luật có sẵn `nutDoiNgung` (`:193`), `nutSua` (`:205`), `coQuyenSua` (`:226`). |
| T18 | Vô hiệu hoá **một mức** | Ngừng (`/dong`), huỷ-thay qua Sửa khi chưa đơn nào chụp (0126) | A | | Bản vẽ không vẽ nút; đưa vào menu «⋯» của dòng, hộp hỏi lại nói hậu quả. |
| T19 | Ngày hiệu lực từ/đến; mức «sắp» áp | Cột `valid_from_date`/`valid_to_date`, `voided_at` (0090, 0126) | A | | Bốn tình trạng `NHAN_TRANG_THAI` (`:58`). Mốc là **ngày xác nhận đơn**, không phải ngày đi (ADR-0077 điều 8). |
| T20 | Danh sách nhóm thuộc cấp, «Theo cấp này từ …» | `GanLoaiMucDto` (`contracts.ts:2799`) | A | | |
| T21 | «Đổi cấp» của một nhóm | `POST /muc-ta/gan/:id/doi` (`:442`), `/sua` (`:473`, `:481`), `/ket-thuc` (`:420`) | A | | Loại đã tắt: không đổi/xếp được (máy chủ từ chối) ⇒ không vẽ nút. |
| T22 | «Xếp nhóm vào cấp» | `POST /muc-ta/gan` (`:399`); `prc_role_tier` (0096): một loại tối đa một cấp tại một ngày | A | | Trả `dongRieng` để cảnh báo mức riêng của loại thắng cấp (giữ khung vàng hiện có). |
| T23 | «N đối tác dùng riêng cấp này» | `ganRieng` | A | | |
| T24 | Thẻ Nhóm: tên + nguồn «Loại gốc / Do Kế toán thêm» | `LoaiDoiTacDto.coSan` (`contracts.ts:2792`) | A | | Chữ đã chốt cho loại gốc là «Có sẵn». |
| T25 | Cột «Cấp đại lý», «Áp dụng từ» | `chinhSachCuaLoai` (`:288`) | A | | |
| T26 | Cột «Mức riêng của nhóm» | dòng `doiTuong.loai = "VAI"` của `GET /hoa-hong` | A | | |
| T27 | Trạng thái «Đang áp dụng / Chưa có mức / Đã tắt» | `LoaiDoiTacDto.dangBat`, luật T4 | A | | «Chưa có mức» phải xét cả mức riêng của loại và cấp rỗng, không chỉ «có cấp». |
| T28 | Nút «Xếp cấp» / «Đổi cấp» ở từng nhóm | như T21–T22 | A | | |
| T29 | Tắt / bật một nhóm (bản vẽ chỉ hiện trạng thái) | `POST /loai-doi-tac/:code/tat`, `/bat` (`:368`, `:372`); loại có sẵn không tắt được | A | | Tắt loại = **giữ đơn** mọi đối tác của loại (`BOOKER_NOT_BENEFICIARY`) ⇒ hộp hỏi lại nói hậu quả; nhìn và đọc khác hẳn T14 (đề bài 3.7–3.8). |
| T30 | Thẻ «Mức riêng đối tác»: danh sách gộp | `ghepDoiTacRieng` (`:257`) | A | | |
| T31 | **Chuyển cấp đại lý cho từng đối tác** («Theo cấp riêng») | `POST /ho-so/:id/muc-rieng` (`:549`), `POST /muc-rieng/:id/sua` (`:595`, nhận cấp mới, ADR-0148), `/ket-thuc` (`:566`); tìm đối tác `GET /nguoi-huong` (`:702`); `prc_party_tier` (0118) | A | | Hôm nay chỉ làm ở Danh bạ (`web/parties.ts:803–823`); bản 1 thêm lối vào trên trang này, cùng route. Một đối tác tối đa một cấp riêng tại một ngày; đối tác phải đang mang loại được hưởng. |
| T32 | Mức riêng của một đối tác (thêm / đổi) | `POST /hoa-hong` đích đối tác (`:236`), Đổi/Sửa/Ngừng như T17 | A | | |
| T33 | Đối tác mang hai loại ra hai mức khác nhau | `HoaHongHoSoResponse.xungDot`; `RULE_CONFLICT` | A | | Bản vẽ một cột «Nhóm» che mất ca này; dòng đối tác phải ghi «xung đột mức». |
| T34 | Ẩn/hiện nút ghi (`quyenGhi`) | `partner.commission.view` / `.write` (`src/shared/permissions.ts:161–162`), `holdsPartner` | A | | Không đổi quyền. Bán hàng đã xem được mọi cấp (ô `view` = any). |
| T35 | Khung v2 và thành phần (Nút, Huy hiệu, Dải thông báo, Tab, Bảng) | `.nut`, `.huy-hieu`, `.dai`, `.tab-phu`, `.bang` (`public/app.css:3946–4011`) | A | | Bản vẽ dùng tên token của bộ v2 (`--c-chinh-nhat`, `--c-nen-phu`, `--c-chu-phu`); ánh xạ sang token sẵn có (`--c-primary-soft`, `--c-surface-alt`, `--c-text-muted`), không thêm token màu. |
| T36 | Chữ «Cấp đại lý», «Nhóm khách hàng» | Bảng từ lượt 3 (`src/shared/bang-tu-giao-dien.ts:35–53`): «Chính sách hoa hồng», «Chính sách riêng», «loại đối tác» | A (chữ; chờ chủ chọn) | | Đổi tên = lượt bảng từ mới, ≤ 3 tên, chủ chọn; một nghĩa một chữ trên mọi màn (Q1 = A ngày 25/10) ⇒ lan sang Danh bạ, Hướng dẫn, Trợ lý (Câu 3). «Nhóm» đã mang nghĩa **nhóm dịch vụ**. |

**Đếm.** Bản 1: **36 A · 0 B · 0 C · 0 D**. Đọc nghĩa đen bản vẽ: **31 A · 1 B** (T8) **· 1 C** (T13) **· 3 D** (T5, T12, T14).

**Bản vẽ trái luật đã duyệt — chủ quyết, không tự hoà giải:** T5 (ADR-0077 điều 8–9, chụp lúc xác nhận), T8 (ADR-0077 điều 6 và đặc tả 25/10: giao diện không chọn mức), T12 (thứ tự 12 bậc của `chonMuc`), T14 (ruling N-23, ADR-0117 lần 2: tắt cấp vẫn chi), T36 (bảng từ lượt 3). Ngoài ra bản vẽ chưa có: ô tìm khi nhiều loại, gập mục đã tắt, «Lịch sử» (`web/hoa-hong-lich-su.ts`), khổ 390.

## Bổ sung bản 2 (2026-10-30, sau QA1 lần 1 và sáu quyết định của chủ)

Chỉ ghi dòng mà bản 2 đổi phân loại hay cách làm; các dòng khác giữ như trên. Cách làm chi tiết ở `DAC-TA.md` bản 2.

| # | Bản 1 | Bản 2 | Vì sao |
|---|---|---|---|
| T4, T27 | A, luật «không mức riêng **và** (không cấp **hoặc** cấp rỗng)» | A, luật phủ mức theo **từng dịch vụ** (`DAC-TA.md` §4), có bài đối chiếu với `chonMuc` | QA1 điểm chặn 3: một dòng SERVICE bất kỳ đã được tính «có mức» |
| T14 | A, «ruling N-23» | A, giữ nghĩa; nhãn «Khoá cấp» chờ chủ xác nhận chữ | N-23 chỉ là giả định kế hoạch; quyết định 1 (30/10) là lần đầu chủ chốt (QA1 điểm 6) |
| T30, T33 | A, có cột «Nhóm» và nhãn «xung đột mức» trên dòng | A, **bỏ** cột loại đối tác ở dòng; loại và xung đột chỉ hiện khi mở một đối tác (`GET /ho-so/:id/hoa-hong`) | QA1 điểm chặn 1: `ghepDoiTacRieng` không có loại, `xungDot` chỉ có trong khối một hồ sơ; không thêm route |
| T31 | A (đổi cấp đi nhờ `POST /muc-rieng/:id/sua`) | Đặt, sửa, ngừng: **A**. «Đổi cấp riêng»: **B**, route mới `POST /muc-rieng/:id/doi` theo ADR-0151 (proposed), chỉ làm sau khi chủ duyệt | QA1 điểm chặn 2; quyết định 5 |
| T36 | A (chữ; chờ chủ chọn) | A, chủ đã chọn (quyết định 3), kèm **đổi chuỗi chữ ở máy chủ** và hướng dẫn (quyết định 6; tiêu chí 9 nới đúng cho chuỗi chữ) | QA1 điểm chặn 4 |

**Đếm bản 2:** **35 A · 1 B** (T31, phần «Đổi cấp riêng») **· 0 C · 0 D**.

**Đính chính bản 1** (QA1 mục Ghi; không đổi phân loại):
- **Trỏ dòng trần.** Ở T12, `:104` và `:244` trỏ `src/shared/hoa-hong-hien-thi.ts`, không trỏ `rules.ts`. Ở T17, `:193`, `:205`, `:226` cũng trỏ `hoa-hong-hien-thi.ts`, không trỏ `index.ts`. Cùng kiểu ấy, các số `:49` (T7), `:63` và `:222` (T10), `:281` (T16), `:288` (T25), `:257` (T30) đều là dòng của `hoa-hong-hien-thi.ts`.
- **T35.** Khối `.nut` bắt đầu ở `public/app.css:3943`, không phải 3946.
- **T3.** Tên cấp dài **2–60** ký tự (`src/modules/pricing/rules.ts:374`), không phải «≤ 60».
- **T4.** «Mẫu bản vẽ đếm 7» chưa kiểm.
- **Ghi chú «Bản vẽ trái luật đã duyệt».** Ở mục này, «T14 (ruling N-23…)» đọc là «T14 (giả định N-23, chủ chốt 30/10)».
