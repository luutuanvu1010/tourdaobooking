# ADR-0109 — Phải thu của đơn không xuống dưới 0 khi bớt khách làm tiền dịch vụ nhỏ hơn giảm giá

- **Trạng thái:** **accepted** 2026-10-08 — chủ dự án trả lời câu 1 (tiêu đề `Tổng âm`) của hộp hỏi lượt duyệt 8c, chọn **"Phải thu không âm (Recommended)"**, tức phương án (a) của văn bản trình duyệt. Nguyên văn câu hỏi và phương án ở mục "Lời chủ dự án". Ghi ở sổ thi công `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`, mục "Lượt duyệt 8c" (`:72`; nhánh `claude/van-chuyen-goi-a-c` @ `6b0b826e`). Việc sửa chữ ADR-0063 D1.12 và ADR-0079 (đại lý chịu giảm giá hiệu lực) là hệ quả của câu này, không phải quyết định riêng: thân câu hỏi đã nói rõ cả hai bằng lời thường (phiếu kiểm tổng hợp mục 1.5). Phần ADR-0081 (`:20`) và các dòng ★ ở mục "Câu ADR bị thay" do người soạn bản chép thêm vì thiếu thì ADR đã duyệt tự mâu thuẫn với ADR này. AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. **Hiệu lực:** ADR này xây trên lỗ đang hở TNV-G1, TNV-G3 (dòng "Xây trên lỗ đang hở"), nên theo `CLAUDE.md` §3 chỉ có hiệu lực khi chủ dự án ghi câu cho phép có lý do. Câu cho phép của chủ: <chờ>.
- **Ngày:** 2026-10-08.
- **Văn bản trình duyệt:** `docs/superpowers/specs/2026-10-08-luot-duyet-8c/01-de-xuat-adr-0109-tong-tien-am.md`; trang ghép `docs/superpowers/specs/2026-10-08-luot-duyet-8c/00-trang-ghep.md`; phiếu kiểm độc lập tổng hợp `docs/superpowers/specs/2026-10-08-luot-duyet-8c/phieu-kiem-tong-hop.md` (ba hồ sơ có ngày, đóng băng).
- **Thuộc lượt:** lượt duyệt 8c — hai quyết định trình chủ (ADR này và ADR-0110), dưới trần 3 (`CLAUDE.md` §9).
- **Sửa:** ADR-0063 D1.12 (`:43`); ADR-0079 `:26`–`:27`, `:43`, `:57` (iv), `:75`, `:96` (R-BIL-2), `:98` (R-BIL-14); ADR-0081 `:20`. Từng câu ở mục "Câu ADR bị thay".
- **Mốc đo mã:** mọi `tệp:dòng` đo trên `claude/van-chuyen-goi-a-c` @ `6b0b826e`. Văn bản trình duyệt đo @ `b8927c27`; `git diff --stat b8927c27 6b0b826e -- src web migrations scripts golden tests` rỗng, nên số dòng mã không dời.
- **Xây trên lỗ đang hở:** TNV-G1 (cùng hàm `phaiThuCua`, `hoan-tat.ts:9-18`) và TNV-G3 (mở đường Đã giao → Hoàn thành cho đơn tổng âm). Bản vá mã của cả hai đã ở `main` (`0078`–`0079`, `0083`) nhưng chưa lên production theo `docs/HANDOFF-N1.md` (production tới migration 0077); chưa kiểm bằng lệnh. Theo `docs/quyen-hoan.json` (`:51`, `:60`), hai mục còn mở (hạn 2026-10-31) và phần "CÒN CHỜ để đóng" của cả hai gồm triển khai. Theo `CLAUDE.md` §3, ADR này chỉ có hiệu lực khi chủ dự án ghi câu cho phép xây trên lỗ đang hở, có lý do (chỗ điền ở dòng Trạng thái). Điều kiện: chỉ phát hành sau Sổ tiền, cùng A2. Đơn huỷ: số cọc, còn lại, dư không đổi (`rules.ts:76-80`); Tổng cộng và phải thu của đơn huỷ từng bị bớt khách tới âm đổi từ âm sang 0 (Quyết định 1).
- **Cửa:** hai chiều trước khi có đơn nào đi qua; sau đó đổi lại sẽ làm khối Thanh toán của các đơn đã giao ấy hiện dư giả (`src/modules/billing/service.ts:170`, `:188`; suy từ mã, chưa chạy). Không migration.

## Lời chủ dự án

- 2026-09-29: "Không chặn, chờ hoàn" — khách trả dư thành khoản chờ hoàn (chú thích `src/modules/billing/rules.ts:62`; ADR-0063 D1.11).
- 2026-10-08, lượt 8a: chủ chọn "Duyệt (Recommended)" cho câu duyệt có vế "tổng tiền âm thì cảnh báo, không chặn" (ADR-0063 D1.12; chú thích `src/shared/so-khach-van-phong.ts:50-51`) (vế này có trong câu duyệt gợi ý của tệp 01 lượt 8a; nguyên văn hộp 8a không lưu).
- Hiến chương 5.9 (`docs/ARCHITECTURE.md:107`, chủ duyệt): khi đối tượng giảm giá trị sau khi đã thu tiền, không chặn thao tác phản ánh thực tế; phần dư thành khoản chờ hoàn.
- Lượt duyệt 8c, câu 1 (2026-10-08), tiêu đề hộp `Tổng âm`. Nguyên văn câu hỏi (phiếu kiểm tổng hợp `:177`):

  > Khi văn phòng bớt khách, tiền dịch vụ có thể còn nhỏ hơn số giảm giá đã cho: ví dụ đơn 2 người, mỗi người 500.000, giảm giá 800.000, khách đã trả 200.000, bớt còn 1 người thì tổng tiền thành âm 300.000. Hôm nay đơn như vậy bị kẹt, vì Kế toán hoàn hết 200.000 mà Nền tảng vẫn báo khách còn dư 300.000, nên không bấm được "Đã giao". Hai cách sửa đều phải đổi chữ hai quyết định bạn đã duyệt: quyết định sửa số khách ngày 8/10 (đoạn nói tổng âm thì khách được ghi dư nhiều hơn số đã trả) và quyết định sổ đại lý ngày 1/10 (đoạn nói đại lý chịu đúng số giảm giá đã cho; phần này chưa làm nên hôm nay chưa có số nào đổi). Bạn muốn Nền tảng tính tiền khách phải trả thế nào?

  - Chủ chọn: **"Phải thu không âm (Recommended)"** — "Được: đơn gỡ được bằng một lần hoàn (ở ví dụ người khách còn lại không phải trả gì, Kế toán hoàn đủ 200.000), giảm giá vẫn lưu 800.000, trang đơn vẫn cảnh báo, và đơn không âm không đổi đồng nào; mất: 300.000 giảm giá vượt coi như bỏ, biên nhận gửi khách ghi giảm giá 500.000 thay vì 800.000, và với đơn đại lý thì đại lý chịu 500.000 chứ không phải 800.000."
  - Không chọn: "Giảm giá theo số khách" — "Được: khách vẫn trả một phần (ở ví dụ giảm giá co còn 400.000, khách trả 100.000 và được hoàn 100.000); mất: tiền của mọi đơn có giảm giá từng sửa số khách đều đổi, kể cả đơn cũ và đơn đã giao (khối thanh toán của đơn đã giao sẽ lệch số đã chốt), phải thêm luật làm tròn, và trái thêm câu "giảm giá giữ nguyên" bạn duyệt ngày 8/10."
  - Không chọn: "Giữ như hôm nay" — "Được: không đổi gì và không sửa quyết định nào; mất: đơn tổng âm kẹt mãi không lên "Đã giao", và cách gỡ duy nhất là tăng số khách trở lại, tức ghi sai thực tế."
- Câu duyệt gợi ý của tệp 01 (hồ sơ, không phải câu chủ trả lời): *"Duyệt ADR-0109: phải thu của đơn không dưới 0, tính ở một hàm cho mọi màn; giảm giá giữ số đã ghi; trang đơn cảnh báo khi giảm giá lớn hơn tiền dịch vụ; đơn đại lý chịu phần giảm giá thực dùng; ca SV-SK-04 đổi đáp án theo."*

## Bối cảnh

- **Ca kẹt (SV-SK-04).** Đơn 2 người lớn, mỗi người 500.000, giảm giá 800.000, khách đã trả 200.000. Văn phòng bớt còn 1 người: tạm tính 500.000, phải thu tính ra −300.000, sổ báo khách dư 500.000 — nhiều hơn số khách thật đã trả. Kế toán chỉ hoàn được 200.000 (trần hoàn = đã thu), hoàn xong vẫn còn "dư" 300.000, nên "Đã giao" bị giữ `overpaid` mãi; phiếu Đã giao cũng không ghi được vì `due_snapshot` phải ≥ 0. Đường gỡ duy nhất hôm nay là tăng số khách trở lại, tức ghi sai thực tế.
- **Nguồn của tổng âm:** lúc lập đơn đã chặn `discount > subtotal` (`src/modules/orders/rules.ts:175`); sau xác nhận cột tiền của đơn bị khoá (`migrations/0081_khoa_tien_don_xac_nhan.sql:20-22`). Tổng âm chỉ sinh ra từ dòng điều chỉnh số khách, ở cả route văn phòng (ADR-0063 D1) lẫn route HDV `handler-money-edit` (`src/modules/dispatch/index.ts:247`). Kiểm toán 24/9 đã chứng minh ca này trên route HDV (DK-T2-02, `docs/AUDIT-2026-09-24-DIEM-KHUAT.md:177-190`).
- **Kiểm độc lập (phiếu tổng hợp mục 2, tệp 01):** người kiểm góc tiền chạy (a) trên bản sao của mã: hoàn 200.000 thì Đã giao trả 200, `due_snapshot` = 0, Hoàn thành trả 200. Chỉ kẹp ở `effectiveMoney` (không sửa `phaiThuCua`) thì Đã giao vẫn trả 409 — vì vậy phải kẹp ở nguồn, cả hai chỗ.

## Bối cảnh mã (đo @ `6b0b826e`)

| Điểm | Hiện trạng | Nguồn |
|---|---|---|
| Phải thu công bố | `effectiveMoney` = `subtotal − discount`, không kẹp; chi tiết đơn qua `applyAdjustmentToOrder` (`:219`) | `src/modules/orders/money-adjustment.ts:227-229` |
| Danh sách, doanh thu tuần | `computeEffectiveMoney`; `toSummaryDtos` `:410-417`; cộng doanh thu tuần `:725-735` (cộng cả số âm) | `src/modules/orders/repository.ts:1179-1197` |
| Đường tính thứ hai | `phaiThuCua` tự trừ `effectiveSubtotal(...) - r.discount` ở `:15`, không gọi `effectiveMoney`; hôm nay hai đường cho cùng số | `src/modules/orders/hoan-tat.ts:9-18` |
| Chỗ khác trừ `discount` (trừ bài kiểm) | chỉ phép tính lúc lập / lưu nháp, nơi giảm giá đã bị chặn ≤ tạm tính (`src/modules/orders/rules.ts:176`, `src/shared/service-form.ts:411`), và một kiểm dữ liệu đã lưu (`src/modules/orders/nguoi-dat-gop-repo.ts:10`) | tìm trong `src`, `web`, `scripts` |
| Hàng rào 5.4 hiện có | chỉ canh `buildLines`, không bắt `hoan-tat.ts:15` | `src/buildlines-guard.test.ts`; `docs/SO-HANG-RAO.md:28` |
| Còn lại / dư | `conLai = max(0, phaiThu − daThu)`, `du = max(0, daThu − phaiThu)`; đơn huỷ trả 0/0 (`:76-80`) | `src/modules/billing/rules.ts:73-83` |
| Hoàn tối đa | `ghiHoanKhach` chặn `so.value > daThu` ("Không hoàn quá số khách đã trả"); lưới CSDL trigger `refund_exceeds_paid` (`migrations/0045_billing_so_cong_no.sql:216`) | `src/modules/billing/service.ts:456-457` |
| "Đã giao" | `lyDoChuaGiaoDuoc` trả `overpaid` khi `du > 0` (`rules.ts:467`); `daGiao` (`service.ts:252`) ghi `dueSnapshot: info.phaiThu` (`:278`) lấy từ `thongTinGiaoDon` → `phaiThuCua`; trigger `bil_posting_delivered_paid` (`0045:234-241`); `CHECK (due_snapshot IS NULL OR due_snapshot >= 0)` (`0045:103`) | `src/modules/billing/` |
| "Hoàn thành" | kiểm đã thu = `due_snapshot` | `migrations/0083_bil_thay_lan_thu.sql:27-51` |
| Cảnh báo | `canhBaoTongAm(total)` = `CAU_TONG_AM` khi `total < 0`; hiện ở phản hồi route (`src/modules/orders/index.ts:1087`, `:1096`), khối Thanh toán (`web/order.ts:456-457`), dải sau khi lưu (`:1082`); nút "Ghi hoàn cho khách" ở khối Kế toán cùng trang (`web/order.ts:787-797`) | `src/shared/so-khach-van-phong.ts:49-55` |
| Bài khoá hiện trạng | TC8 (ghim dư 500.000) `:311-328`; "TC8 — HIỆN TRẠNG CHỜ CHỦ QUYẾT" (ghim Đã giao 409) `:330-348` | `src/modules/orders/so-khach-van-phong-route.test.ts` |
| Biên nhận | `ReceiptDto` chép nguyên `subtotal`, `discount`, `total` của đơn; bài `bien-nhan.test.ts:34` khoá danh sách khoá | `src/modules/receipt/rules.ts:29-31` |

## Quyết định

1. **Phải thu hiện hành = `max(0, tạm tính hiện hành − giảm giá)`**, kẹp trong **một** hàm (`effectiveMoney`). `phaiThuCua` (`hoan-tat.ts:15`) đổi sang gọi hàm đó. Mọi bề mặt dùng số này: trang đơn, danh sách, doanh thu tuần, `conLai`, phiếu Đã giao (`due_snapshot`), biên nhận ("kẹp ở nguồn", Hiến chương 5.4 `docs/ARCHITECTURE.md:97`).
2. **Giảm giá đã lưu không đổi** (`orders.discount`, khoá bởi `0081`). **Giảm giá hiệu lực** = `min(giảm giá, tạm tính hiện hành)` là số dẫn xuất, do cùng hàm trả về. Khi tạm tính còn ≥ giảm giá thì giảm giá hiệu lực bằng giảm giá đã lưu, nên đơn không âm không đổi đồng nào.
3. **Cảnh báo** đổi điều kiện từ `total < 0` sang **giảm giá > tạm tính hiện hành**, vì sau khi kẹp thì tổng không còn âm và câu cũ sẽ im lặng biến mất. Câu gợi ý (chữ bề mặt, kế hoạch chốt): "Giảm giá (X) lớn hơn tiền dịch vụ sau khi bớt khách (Y) — phải thu tính bằng 0, phần giảm giá vượt (Z) không dùng tới. Khách đã trả bao nhiêu thì hoàn bấy nhiêu." Cảnh báo hiện ở cùng ba chỗ như hôm nay.
4. **Biên nhận gửi khách:** dòng "Giảm giá" (`src/shared/order-confirmation.ts:214-216`) hiện giảm giá hiệu lực, để tạm tính − giảm giá = tổng cộng (ví dụ: 500.000 thay vì 800.000 — đúng mô tả phương án chủ chọn). Trang đơn nội bộ vẫn ghi giảm giá đã lưu kèm cảnh báo. Cách đưa số này tới biên nhận (thêm trường vào `ReceiptDto` hay suy ra `subtotal − total`) do kế hoạch chốt (mục "Chưa kiểm").
5. **Đơn huỷ:** số cọc, còn lại, dư không đổi, vì `conLai` trả 0/0 cho đơn huỷ (`rules.ts:76-80`); Tổng cộng và phải thu hiển thị của đơn huỷ từng bị bớt khách tới âm đổi từ âm sang 0 ở trang đơn, danh sách và biên nhận huỷ, vì cùng một hàm (Quyết định 1, 4).
6. **Không chặn thao tác** — giữ lời chủ 8/10 và phần "không chặn" của ADR-0063 D1.12. Không thêm trần "giảm giá ≤ tạm tính" cho lệnh sửa số khách.
7. **Đơn có người hưởng (ADR-0079, chưa thi công):** dòng `GIAM_GIA_BEN_DAT` ghi **giảm giá hiệu lực** — đại lý chịu tối đa phần giảm giá thực dùng (ví dụ SV-SK-04 nếu là đơn đại lý: 500.000 thay vì 800.000). Chốt theo (iv) của ADR-0079 (`:57`: `GIAM_GIA_BEN_DAT` = `gross_snapshot − due_snapshot`), vì giữ số đầy đủ thì công ty thu của đại lý nhiều hơn giá dịch vụ và luật cân đối R-BIL-2 (`ADR-0079:96`) sai. Màn "Sổ của tôi" của đại lý (ADR-0081) theo cùng số.
8. **Không đổi số:** hoa hồng `RATE` tính trên thành tiền dòng **trước** giảm giá cấp đơn, `PER_PAX` theo số khách (ADR-0077 `:82-83`); giá vốn tính trước giảm giá (ADR-0078 `:58`); dòng điều chỉnh số khách không khoá theo kỳ (ADR-0080 `:70`); dấu "đã nhập phần mềm kế toán" (ADR-0060, `src/modules/billing/nhap-ke-toan.ts`) không xuất số tiền nào.
9. **Phát hành:** cùng A2 (phần sửa số khách văn phòng, đang chặn phát hành chờ câu này), sau Sổ tiền (mục "Sổ dừng dây chuyền").

## Số trên báo cáo và Sổ tiền đổi gì

- Trang chủ "Doanh thu tuần" (`src/modules/orders/repository.ts:725-735`): đơn tổng âm cộng 0 thay cho số âm.
- Danh sách đơn, Hôm nay (`repository.ts:417`): "Tổng cộng" 0.
- Khối Thanh toán (`GET /api/orders/:id/payments`): phải thu 0, dư bằng số đã thu.
- Ô "Còn thiếu tiền" (`src/modules/billing/index.ts:256`): không đổi, vì còn lại vốn đã là 0.
- Phiếu "Đã giao": `due_snapshot` = 0 (hôm nay không ghi được). I1 của ADR-0088 vẫn đúng.
- Sổ công nợ: không sinh dòng mới, ngoài dòng hoàn khách khi người trả không phải công ty (như mọi lần hoàn).
- Trần điều chỉnh sổ (ADR-0092 Đ5b, `billing/rules.ts:166-178`): không đổi, vì trần = max(phải thu, đã thu).
- ADR-0089 `:106` ("Cần chi hoàn" gồm trả dư của đơn không huỷ): mã hôm nay chỉ liệt khoản duyệt (`src/modules/billing/coc-repo.ts:109`). Khi làm phần trả dư, ADR này bảo đảm số trả dư không vượt tiền thật.

## Hệ quả và rủi ro

- **Mất:** phần giảm giá vượt tiền dịch vụ (300.000 ở ví dụ) coi như bỏ; biên nhận ghi giảm giá 500.000 thay vì 800.000; đơn đại lý thì đại lý chịu 500.000 chứ không phải 800.000 (đúng mô tả phương án chủ chọn).
- **Một con số dùng ở nhiều màn:** trang đơn, biên nhận, doanh thu tuần, sổ tiền cùng đổi trên đơn đang âm; đơn không âm không đổi.
- **Câu cảnh báo phải đổi điều kiện cùng lần** (Quyết định 3); giữ điều kiện cũ thì câu biến mất âm thầm.
- **Chữ, bài, sổ vàng phải sửa theo** (đo @ `6b0b826e`):
  - `CAU_TONG_AM`, `canhBaoTongAm` (`src/shared/so-khach-van-phong.ts:49-55`) và bài `src/shared/so-khach-van-phong.test.ts:77-79`;
  - kiểu phản hồi `MoneyEditResponse` (`src/shared/contracts.ts:500-503`), route `src/modules/orders/index.ts:1087`, `:1096`, giao diện `web/order.ts:456-457`, `:1082`;
  - bài TC8 (`so-khach-van-phong-route.test.ts:311-328`) và TC8 HIỆN TRẠNG (`:330-348`), đảo thành "hoàn 200.000 rồi Đã giao trả 200";
  - sổ vàng `golden/sua-so-khach-van-phong.json`: `quy_uoc.phai_thu` (`:8`, đang ghi "có thể ÂM"), `quy_uoc.canh_bao_tong_am` (`:11`), ca SV-SK-04 (`:80-101`); bài `src/so-vang-sua-so-khach.test.ts:87`, `:147`;
  - ★ e2e `tests/e2e/sua-so-khach.mjs:80-89` (CA 3 đang khoá total −50000) — chạy lại e2e `sua-so-khach` sau khi sửa;
  - ★ `src/modules/orders/money-adjustment.test.ts:175-177` (thêm ca kẹp);
  - ★ `src/shared/huong-dan-ke-toan.ts:86` (dạy Kế toán "Tổng cộng thành số âm…"; kho trợ lý sinh từ đây);
  - ★ biên nhận: `src/modules/receipt/rules.ts:29-31`, `src/shared/contracts.ts` (nếu thêm trường), `src/modules/receipt/bien-nhan.test.ts:34`;
  - `docs/CHANGE-GUIDE.md:1075` (bẫy 64, đang cấm kẹp khi chưa có chủ duyệt); `docs/SYSTEM-DESIGN.md:680` (thêm "phải thu ≥ 0");
  - kịch bản Chrome `docs/evidence/2026-10-08-a2-so-khach/kich-ban/sua-so-khach-smoke.mjs:110-127` (đang khoá "Tổng cộng −650.000");
  - ★ mục nhật ký thay đổi `src/shared/changelog.ts` (lời thường, lần phát hành).
  - Dòng ★ là phiếu kiểm độc lập nêu thêm (tệp 01 §6 thiếu).
- **Sổ vàng SV-SK-04, đáp án mới:** `sau` = { tam_tinh 500.000, phai_thu 0, con_lai 0, du 200.000 }; `canh_bao_tong_am` true (giảm giá 800.000 > tạm tính 500.000); `truoc` giữ nguyên. Thêm ca SV-SK-08: hoàn 200.000 → "Đã giao" được, `due_snapshot` 0. Kế toán xác nhận lại theo đáp án mới (Hiến chương 5.17); AI không tự xác nhận.
- **V-3, V-5 của phiếu kiểm A2:** sổ chỉ ghi "V-3, V-5 sửa khi chủ quyết tổng âm"; phiếu đó không có trong kho. Điều phối đối chiếu với danh sách trên.
- **Việc lớn (tiền):** kế hoạch riêng, mỗi task đỏ → xanh, người kiểm độc lập chỉ-đọc.

## Câu ADR bị thay (nguyên văn → mới; không sửa thân ADR cũ)

Dòng có dấu ★ là thêm so với văn bản trình duyệt (tệp 01 §5), vì thiếu thì ADR đã duyệt tự mâu thuẫn với ADR này. Dòng trỏ ở dòng Trạng thái của từng ADR cũ: `dong-tro-adr-cu-8c.md` cùng thư mục.

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0063 D1.12 (`docs/adr/ADR-0063-sua-don-sau-xac-nhan.md:43`), câu đầu sau tiêu đề in đậm | "Đơn có giảm giá lớn mà văn phòng bớt khách tới mức tiền dịch vụ nhỏ hơn số giảm giá thì tổng ra số âm (`effectiveMoney` = `subtotal − discount`, `money-adjustment.ts:227-228`), và sổ báo "dư chờ hoàn" lớn hơn số khách thật đã trả." | "Đơn có giảm giá lớn mà văn phòng bớt khách tới mức tiền dịch vụ nhỏ hơn số giảm giá thì phải thu bằng 0 (`max(0, tạm tính hiện hành − giảm giá)`, một hàm — ADR-0109); dư chờ hoàn bằng đúng số khách đã trả, Kế toán hoàn hết thì đơn không còn bị giữ "Đã giao" vì khách trả dư." |
| ADR-0063 D1.12 (`:43`), câu "Cảnh báo hiện ở trang đơn và trong màn hoàn của Kế toán." | "Cảnh báo hiện ở trang đơn và trong màn hoàn của Kế toán." | "Cảnh báo hiện khi giảm giá lớn hơn tạm tính hiện hành (ADR-0109), ở trang đơn và trong màn hoàn của Kế toán." |
| ★ ADR-0079 `:26`–`:27` (tóm tắt cho chủ, ý 1–2) | "đại lý **nợ Tour Đảo phần giảm giá** họ đã cho khách" … "Số đại lý còn phải trả = tiền họ đang giữ + giảm giá họ cho − hoa hồng." | "đại lý **nợ Tour Đảo phần giảm giá** thực dùng (giảm giá hiệu lực — ADR-0109; bằng số đã cho khách trừ khi bớt khách làm tiền dịch vụ nhỏ hơn giảm giá)" … "Số đại lý còn phải trả = tiền họ đang giữ + giảm giá hiệu lực − hoa hồng." |
| ADR-0079 `:43` | "**người hưởng nợ Tour Đảo** đúng số giảm giá cấp đơn (`orders.discount`)" | "**người hưởng nợ Tour Đảo** đúng giảm giá hiệu lực = min(`orders.discount`, tạm tính hiện hành) (ADR-0109), tức `gross_snapshot − due_snapshot` như (iv)" |
| ADR-0079 `:57` (iv) | "(giảm giá cấp đơn là phần chênh duy nhất giữa hai số)" | "(giảm giá **hiệu lực** là phần chênh duy nhất giữa hai số — ADR-0109)" |
| ADR-0079 `:75`, câu cuối | "Dòng `GIAM_GIA_BEN_DAT` vẫn ghi đúng số giảm giá." | "Dòng `GIAM_GIA_BEN_DAT` ghi đúng giảm giá hiệu lực = min(giảm giá, tạm tính hiện hành) (ADR-0109); bằng số giảm giá khi tạm tính còn ≥ giảm giá." |
| ★ ADR-0079 `:96` (R-BIL-2) | "**phần Tour Đảo giữ = Σ giá lẻ trước giảm − giảm giá Tour Đảo chịu − giá vốn − hoa hồng**" | "**phần Tour Đảo giữ = Σ giá lẻ trước giảm − giảm giá hiệu lực Tour Đảo chịu − giá vốn − hoa hồng** (ADR-0109)" |
| ★ ADR-0079 `:98` (R-BIL-14) | "`R-BIL-14`: đơn có người hưởng ⇒ không dòng `GIAM_GIA_BEN_DAT` nào khi `orders.discount = 0`, và đúng một khi > 0." | "`R-BIL-14`: đơn có người hưởng ⇒ không dòng `GIAM_GIA_BEN_DAT` nào khi giảm giá hiệu lực = 0 (gồm `orders.discount = 0`), và đúng một khi giảm giá hiệu lực > 0 (ADR-0109)." |
| ★ ADR-0081 `:20` | "giảm giá mình đã cho khách" | "giảm giá mình chịu (giảm giá hiệu lực — ADR-0109; nhỏ hơn số đã cho khách khi bớt khách làm tiền dịch vụ nhỏ hơn giảm giá)" |

R-BIL-2 là đẳng thức trên đơn đã giao; sau khi phải thu kẹp ở 0 thì vế giảm giá phải là giảm giá hiệu lực, cho cả đơn lẻ lẫn đơn đại lý. R-BIL-14 chỉ khác khi tạm tính về 0 — ca này có thật: người kiểm bản chép chạy qua route thật và thấy tạm tính về được 0 khi dịch vụ có giá em bé bằng 0 và đơn bớt còn mỗi em bé; câu R-BIL-14 mới phủ ca này.

**Không đổi:**
- ADR-0063 D1.4 "giảm giá của đơn giữ nguyên" (`:32`): số giảm giá đã ghi vẫn giữ nguyên; ADR này chỉ đổi phải thu của đơn đang âm.
- ADR-0063 D1.11 (`:42`, trả dư chờ hoàn, không chặn); tiêu đề D1.12 "Tổng tiền âm: cảnh báo, không chặn" và các chỗ còn gọi tình huống này là "tổng âm" (`:80`, `:93`, `:98`, `:100`, `:110`, `:116`) — đọc là "giảm giá lớn hơn tạm tính hiện hành".
- ADR-0079 `:75` hai câu đầu (không chặn; cảnh báo "Giảm giá đang lớn hơn hoa hồng…"): chữ "giảm giá" đọc là giảm giá hiệu lực khi hai số khác nhau. ADR-0079 `:137` (luật cân đối khái quát) đọc theo `:96` mới. ADR-0081 `:42`–`:43`: `giamGiaMinhChiu` suy ra từ đẳng thức ở ADR-0081 `:43`, nên tự theo số hiệu lực.
- Dòng README của ADR-0063 ("tổng tiền âm cảnh báo, không chặn") vẫn đúng.

## Bài kiểm / hàng rào

Mỗi rào quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md` kèm ngày.

1. **Nới rộng hàng rào 5.4 — bài tĩnh "một hàm phải thu":** ngoài `effectiveMoney` và hai chỗ lập / lưu nháp ở mục "Bối cảnh mã", mã chạy thật không chỗ nào trừ `discount`. Quan sát chặn thật: khôi phục cố ý `- r.discount` ở `hoan-tat.ts:15` → đỏ → hoàn nguyên → xanh. Thêm một dòng sổ hàng rào cạnh dòng `buildlines-guard`.
2. **SV-SK-04 mới:** phải thu 0, dư 200.000, có cảnh báo.
3. **Hoàn rồi giao:** hoàn 200.000 → "Đã giao" trả 200, `due_snapshot` 0; "Hoàn thành" trả 200.
4. **Đơn không âm không đổi:** SV-SK-02 và các ca sổ vàng còn lại giữ đáp án.
5. **Cảnh báo:** đơn có giảm giá > tạm tính vẫn có câu cảnh báo ở phản hồi route và trang đơn (điều kiện mới).
6. **Đơn huỷ:** không đổi số cọc; đơn huỷ từng âm hiện Tổng cộng 0 trên trang đơn và biên nhận huỷ.
7. **Doanh thu tuần:** cộng 0 cho đơn tổng âm.
8. **Biên nhận:** ba dòng tạm tính, giảm giá, tổng cộng khớp nhau trên đơn tổng âm.
9. **Route HDV** (`handler-money-edit`): cùng kết quả ≥ 0.
10. `npm test`, `npm run typecheck`, `npm run test:e2e` (gồm `sua-so-khach`), kịch bản Chrome `sua-so-khach-smoke`.

## Phương án bị loại

- **(b) Giảm giá co theo số khách:** đổi tiền của mọi đơn có giảm giá từng sửa số khách, kể cả đơn đã giao (khối Thanh toán lệch `due_snapshot` đã chốt, ADR-0088 `:25`); cần luật làm tròn; trái thêm câu "giảm giá giữ nguyên" duyệt 8/10. Chủ chọn (a).
- **(c) Giữ như hôm nay:** đơn tổng âm kẹt mãi không lên "Đã giao"; đường gỡ duy nhất là ghi sai số khách. Chủ chọn (a).
- **Chỉ kẹp phía sổ, trang đơn vẫn hiện số âm:** hai con số cho cùng một khái niệm (Hiến chương 5.4).
- **Chỉ kẹp ở `effectiveMoney`, để `phaiThuCua` tự tính:** người kiểm chạy thử thấy "Đã giao" vẫn 409 (phiếu tổng hợp, tệp 01).
- **Chặn trần "giảm giá ≤ tạm tính" ở lệnh sửa số khách:** trái lời chủ "không chặn" và Hiến chương 5.9; là luật tiền mới (ADR-0063 D1.12 câu cuối).
- **Biến thể "giảm giá tối đa bằng tạm tính mới":** ra đúng số tiền như (a), vì `tạm tính − min(giảm giá, tạm tính) = max(0, tạm tính − giảm giá)`; chỉ khác chữ trên biên nhận, đã gộp vào Quyết định 4.

## Sổ dừng dây chuyền (`docs/quyen-hoan.json`, đọc 2026-10-08)

- **Xây trên lỗ đang hở: TNV-G1, TNV-G3** (dòng đầu tệp). Hai mục còn mở, hạn 2026-10-31 (`docs/quyen-hoan.json:51`, `:60`); phần "CÒN CHỜ để đóng" của cả hai gồm triển khai. Bản vá mã đã ở `main` (`migrations/0078_ly_do_huy_don.sql`, `0079_billing_coc_don_huy.sql`, `0083_bil_thay_lan_thu.sql`) nhưng chưa lên production theo `docs/HANDOFF-N1.md` (production tới migration 0077); chưa kiểm bằng lệnh ⇒ chỉ phát hành sau Sổ tiền, cùng A2 (tiền lệ ADR-0063 dòng "Xây trên lỗ đang hở", `:8`).
- Theo `CLAUDE.md` §3, ADR này chỉ có hiệu lực khi chủ dự án ghi câu cho phép xây trên lỗ đang hở, có lý do; chỗ điền "Câu cho phép của chủ" ở dòng Trạng thái.
- TNV-G1 trích đúng `hoan-tat.ts:9-18`. ADR này sửa hàm đó; đơn huỷ đi nhánh huỷ của `conLai` (0/0) nên số cọc, còn lại, dư không đổi; chỉ Tổng cộng và phải thu hiển thị của đơn huỷ từng âm đổi thành 0.
- TNV-G3: đơn tổng âm qua phiếu Đã giao với `due_snapshot` = 0 rồi Hoàn thành (I1 = 0); đảo / thay lần thu sau Đã giao đi đường `0083` như mọi đơn. Không đổi mã vùng đó, nhưng dựa vào bản vá chưa lên production (theo `docs/HANDOFF-N1.md`; chưa kiểm bằng lệnh) ⇒ phát hành sau Sổ tiền.
- TNV-G4: ADR này làm "dư ≤ đã thu" luôn đúng, cùng hướng với "hoàn ≤ người trả đang giữ". Phần còn mở (Đ5d, Đ6, Đ6a) không nằm trên đường này.
- HC-4.2: không thêm bút toán điều chỉnh nào.

## Chỗ văn bản trình duyệt lệch mã HEAD (đo @ `6b0b826e`)

- Mã không đổi giữa `b8927c27` và `6b0b826e` (`src`, `web`, `migrations`, `scripts`, `golden`, `tests`), nên mọi `tệp:dòng` mã của tệp 01 còn đúng.
- Tệp 01 §4 ghi "Chưa kiểm ADR-0081 đã thi công tới đâu": tìm `giamGiaMinhChiu`, `GIAM_GIA_BEN_DAT`, `gross_snapshot` trong `src`, `web`, `migrations`, `scripts` @ `6b0b826e` không gặp; `git log --all -S "GIAM_GIA_BEN_DAT" -- src migrations scripts web` và `-S "giamGiaMinhChiu" -- src web` cũng rỗng (mọi nhánh trong máy, chưa `fetch`). Vậy phần đó của ADR-0079, ADR-0081 chưa thi công ở nhánh nào trong máy, và các câu thay ở ADR-0079, ADR-0081 chưa đổi số nào hôm nay.
- Tệp 01 §5 thiếu ADR-0079 `:26`–`:27`, `:96`, `:98` và ADR-0081 `:20` (dòng ★ ở mục "Câu ADR bị thay"); tệp 01 §6 thiếu năm chỗ phiếu kiểm nêu (dòng ★ ở mục "Hệ quả").

## Chưa kiểm

- **Production có bao nhiêu đơn tổng âm** (route HDV có từ trước). Muốn biết phải chạy một bước đọc dùng chính hàm tính tiền, không viết lại bằng SQL; lệnh đọc D1 remote do chủ chạy.
- **Biên nhận:** thêm trường giảm giá hiệu lực vào `ReceiptDto` (đổi hợp đồng, sửa bài `bien-nhan.test.ts:34`) hay suy ra `subtotal − total` ở chỗ dựng biên nhận (thêm một chỗ tính) — kế hoạch chốt; "hiển thị tiền" là việc lớn.
- **Năm chỗ sẽ sai hoặc đỏ** (mục "Hệ quả", dòng ★) và e2e `sua-so-khach` CA 3: mới suy từ số đang khoá, chưa chạy.
- (a) mới được người kiểm chạy trên bản sao của mã; chưa chạy trên cây thật, chưa typecheck cách thêm trường giảm giá hiệu lực hay đổi chữ ký `canhBaoTongAm`.
- `src/shared/huong-dan-ke-toan.ts:86` có phải là một trong V-3, V-5 của phiếu kiểm A2 hay không: phỏng đoán.
- Câu cảnh báo và nút "Ghi hoàn cho khách" đứng cạnh nhau thế nào trên màn hình (chưa xem ảnh).
- Có đơn đã giao nào nằm ngoài giả định "mốc Đã giao ra đời cùng Sổ tiền lượt 1" (phiếu tổng hợp mục 5).
