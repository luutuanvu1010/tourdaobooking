# Phiếu tổng hợp kiểm độc lập: bản chép ADR-0109 và ADR-0110 (lượt 8c), 2026-10-08

Thư mục gốc của các tệp được kiểm là `…/worktrees/agent-a697a34adc000d80e/docs/superpowers/specs/2026-10-08-luot-duyet-8c/chep-vao-adr/`. Trong phiếu, các tệp được gọi tắt là ADR-0109, ADR-0110, README (tức `README-dong-moi-8c.md`) và dong-tro (tức `dong-tro-adr-cu-8c.md`).

Có hai góc kiểm: góc lời chủ (`loi-chu`), kết luận ĐẠT, và góc tiền và mã (`tien-ma`), kết luận ĐẠT CÓ ĐIỀU KIỆN. Hai góc không mâu thuẫn nhau về sự thật nào, chỉ khác nhau ở phạm vi kiểm. Người tổng hợp đã tự mở lại mã để xác nhận mục CAO (xem mục 2) và mục `booker_partner` (mục 5). Người tổng hợp không chạy test.

## 1. Kết luận từng tệp

| Tệp | Kết luận | Vì sao |
|---|---|---|
| ADR-0109 | **ĐẠT CÓ ĐIỀU KIỆN** | Có một câu sai sự thật về tiền (đơn huỷ), nằm ở ba chỗ `:9`, `:55`, `:142`. Phải sửa trước khi chép vì thân ADR sẽ đóng băng. Các mục còn lại là THẤP. |
| ADR-0110 | **ĐẠT** | Chỉ có mục THẤP: nhãn "chú giải", câu "bài hiện có là rào", cụm `trip.dispatch` bị lặp, dòng Trạng thái chưa nhắc dòng ★. |
| README-dong-moi-8c.md | **ĐẠT** | Dòng cũ trùng từng ký tự với `docs/adr/README.md:115-116` ở ba mốc. Dòng "kế tiếp là 0111" giữ đủ ghi chú cũ. Riêng §16 thì **chọn Cách B, không theo Cách A** mà tệp gọi là đề xuất chính (mục 4). |
| dong-tro-adr-cu-8c.md | **ĐẠT** | Bốn dòng "Cũ" trùng dòng 3 của ADR gốc. "Mới" đúng bằng dòng cũ cộng một dấu cách cộng câu trỏ. Có một mục THẤP về chữ "chú giải" ở `:64`. |

## 2. Việc PHẢI sửa trước khi chép (CAO)

**C-1. Câu "đơn huỷ không đổi" sai với Tổng cộng và phải thu của đơn huỷ từng bị bớt khách tới âm** (ADR-0109 `:9`, `:55`, `:142`).

- **Bằng chứng do người tổng hợp tự đọc lại.** `applyAdjustmentToOrder` và `effectiveMoney` (`src/modules/orders/money-adjustment.ts:219-229`) không xét trạng thái đơn. `dungBienNhan` (`src/modules/receipt/rules.ts:6`, `:29-31`) chép nguyên `total`. Chỉ có `conLai` (`src/modules/billing/rules.ts:73-83`) là có nhánh riêng cho đơn huỷ.
- **Bằng chứng của góc tiền và mã.** Ca thử là đơn 2 khách × 500.000, giảm 800.000, đã thu 200.000, bớt còn 1 khách rồi huỷ. Trước khi kẹp, total và phaiThu đều là −300.000. Sau khi kẹp, cả hai về 0. Cọc, còn lại và dư không đổi.
- **Không cần hỏi chủ.** Thay đổi này là hệ quả của Quyết định 1 và 4: một số dùng cho mọi màn, kể cả biên nhận. Hộp hỏi cũng chỉ hứa "đơn **không âm** không đổi đồng nào". Câu sai hiện nay còn mâu thuẫn với chính Quyết định 1 của ADR này.

Câu thay cụ thể:

- **`:9`**, câu cuối của dòng "Xây trên lỗ đang hở":
  - Cũ: "Đơn huỷ không đổi số (`rules.ts:76-80`)."
  - Mới: "Đơn huỷ: số cọc, còn lại, dư không đổi (`rules.ts:76-80`); Tổng cộng và phải thu của đơn huỷ từng bị bớt khách tới âm đổi từ âm sang 0 (Quyết định 1)."
- **`:55`**, Quyết định 5:
  - Cũ: "**Đơn huỷ không đổi:** `conLai` đã trả 0/0 cho đơn huỷ (`rules.ts:76-80`)."
  - Mới: "**Đơn huỷ:** số cọc, còn lại, dư không đổi, vì `conLai` trả 0/0 cho đơn huỷ (`rules.ts:76-80`); Tổng cộng và phải thu hiển thị của đơn huỷ từng bị bớt khách tới âm đổi từ âm sang 0 ở trang đơn, danh sách và biên nhận huỷ, vì cùng một hàm (Quyết định 1, 4)."
- **`:142`**:
  - Cũ: "…nhưng đơn huỷ đi nhánh huỷ của `conLai` (0/0) nên không đổi gì cho đơn huỷ."
  - Mới: "…đơn huỷ đi nhánh huỷ của `conLai` (0/0) nên số cọc, còn lại, dư không đổi; chỉ Tổng cộng và phải thu hiển thị của đơn huỷ từng âm đổi thành 0."
- **`:124`**, bài 6, sửa thêm nếu muốn:
  - Cũ: "**Đơn huỷ:** không đổi số cọc."
  - Mới: "**Đơn huỷ:** không đổi số cọc; đơn huỷ từng âm hiện Tổng cộng 0 trên trang đơn và biên nhận huỷ."

Không có mục nào ở mức CHẶN.

## 3. Dòng ★: giữ tất cả, không có câu hỏi riêng cho chủ

Có hai loại dòng ★, cần tách bạch:

- **★ ở bảng "Câu ADR bị thay"** là chữ quyết định. Gồm ADR-0079 `:26-27`, `:96` (R-BIL-2), `:98` (R-BIL-14), ADR-0081 `:20` (ADR-0109 `:101`, `:105-107`) và ADR-0096 `:84` (ADR-0110 `:77`).
- **★ ở mục "Hệ quả"** (ADR-0109 `:81-87`) là danh sách việc phải làm: e2e, bài kiểm, hướng dẫn Kế toán, biên nhận, nhật ký thay đổi. Đây không phải chữ quyết định nên giữ nguyên.

Cả năm dòng ★ chữ quyết định đều là hệ quả tất yếu của phương án chủ chọn, và cả hai góc kiểm đều đồng ý. Lý do từng dòng:

| Dòng ★ | Giữ? | Lý do |
|---|---|---|
| ADR-0079 `:26-27` | Giữ | Hộp hỏi đã nói "đại lý chịu 500.000 chứ không phải 800.000". Để chữ cũ ("+ giảm giá họ cho") thì công thức cho 800.000, lệch với `:43`. |
| ADR-0079 `:96` R-BIL-2 | Giữ | Đẳng thức trên mọi đơn đã giao, kể cả đơn khách lẻ. Ví dụ phải thu kẹp ở 0 với giảm giá 800.000 cho vế trái 500.000 − 800.000 = −300.000, lệch đúng 300.000 so với thực giữ. Góc tiền đã tính tay ca đại lý và thấy cân. R-BIL-2 hiện mới nằm trong danh sách "chưa áp dụng" (`scripts/audit-checks.mjs:1226`). |
| ADR-0079 `:98` R-BIL-14 | Giữ | Đây **không phải ca lý thuyết**. Góc tiền đã chạy qua route thật và thấy tạm tính về được 0: chỉ cần dịch vụ có giá em bé bằng 0 và bớt đơn còn mỗi em bé. |
| ADR-0081 `:20` | Giữ, nhưng là dòng yếu nhất | Dòng này chỉ cho chữ khớp với `:74` và đẳng thức `:43`. Có thể chuyển sang nhóm "đọc theo" mà không cần hỏi chủ. Khuyến nghị giữ nguyên ★. |
| ADR-0096 `:84` | Giữ | Dòng này chỉ lặp lại Đ1.3b mới ("không thêm route") ở mục Cửa của cùng ADR. |

**Không cần hộp hỏi nào.**

## 4. Đóng §16 của `docs/SYSTEM-DESIGN.md`: chọn Cách B

Nên xoá hai dòng `:1282-1283` và thêm dấu trỏ ở `:609`, không theo Cách A. Lý do:

1. `CLAUDE.md:17` chỉ cho giữ một dòng ở §16 khi "tài liệu chuẩn tắc lệch" và còn chờ ra ADR. Khi ADR-0110 đã nằm trong `docs/adr/` thì điều kiện giữ không còn.
2. Cách A chép nội dung ADR-0110 vào tài liệu sống, trái nguyên tắc mỗi sự thật một nơi. Cột "Câu sai" của dòng A còn trích chữ ADR-0096 mà ADR-0110 đã thay. README `:57` cũng tự nhận §16 chưa có dòng nào kiểu "đã đóng".
3. Người tổng hợp đã đọc `docs/SYSTEM-DESIGN.md:609` và thấy đoạn này đã tả đúng mã ("đảo cũ sửa dần được", "`PUT /chuyen/:id` thân `diem`"), nên chỉ cần thêm dấu trỏ.

Cách B đi kèm hai việc bắt buộc:

- Ở `:609`, thêm " — ADR-0110" sau "(đảo cũ sửa dần được)" và thêm " (ADR-0110)" sau "…đi qua `PUT /chuyen/:id` thân `diem`", đúng như README `:55`.
- Gỡ hai dòng §16 trong **cùng commit** với lần chép ADR-0110 vào `docs/adr/`. Chép ADR trước, sửa SYSTEM-DESIGN sau.

Góc lời chủ còn nói lịch sử §16 từng gỡ hẳn các dòng đã xử lý (ví dụ ADR-0015 900px). Người tổng hợp chưa tự kiểm câu này nên chỉ ghi là lời của người kiểm.

## 5. THẤP (ghi lại)

### 5a. Chữ trong thân ADR và các dòng đi kèm (rẻ, nên sửa cùng lượt vì thân sẽ đóng băng, nhưng không chặn)

1. **Nhãn "chú giải, không đổi điều đã cấm" của Đ1.3c nhẹ hơn điều hộp hỏi đã nói với chủ.** Hộp nói "hai cách đầu đều phải ghi một quyết định mới sửa chữ ngày 3/10". Nhãn này xuất hiện ở bốn chỗ, nên sửa đồng loạt:
   - ADR-0110 `:8`: "Đ1.3c (`:37`, chú giải: …)" → "Đ1.3c (`:37`, sửa chữ theo cách đọc hẹp: "làm vi phạm" = "gây ra vi phạm mới")".
   - ADR-0110 `:53`: tiêu đề "**Đ1.3c (chú giải):**" → "**Đ1.3c (sửa chữ, đọc hẹp):**". Câu cuối "đây là chú giải, không đổi điều đã cấm" → "đọc theo nghĩa rộng của chữ ngày 3/10 thì đây là chỗ thu hẹp điều bị cấm (lệnh để lại đảo cũ nay được qua); hộp hỏi 8c đã nói đây là chỗ mã khác chữ và chủ chọn giữ mã."
   - README `:17`: "Đ1.3c (chú giải)" → "Đ1.3c (sửa chữ, đọc hẹp)".
   - dong-tro `:64`: "Đ1.3c (`:37`, chú giải)" → "Đ1.3c (`:37`, sửa chữ theo cách đọc hẹp)".
2. **"Kế toán hoàn hết là đơn lên Đã giao được" quá rộng với đơn có người hưởng.** Người tổng hợp đã tự kiểm: `src/modules/billing/rules.ts:458-459` vẫn giữ đơn bằng mã `booker_partner`. Câu này có ở hai chỗ:
   - ADR-0109 `:99`, cột Mới: "…Kế toán hoàn hết là đơn lên "Đã giao" được." → "…Kế toán hoàn hết thì đơn không còn bị giữ "Đã giao" vì khách trả dư."
   - README `:16`: "nên Kế toán hoàn hết là đơn lên "Đã giao"" → "nên Kế toán hoàn hết thì đơn không còn bị giữ vì trả dư".
3. **"Chưa lên production" là khẳng định trạng thái production dựa vào tài liệu**, điều `CLAUDE.md` §8 cấm. Chỗ này ở ADR-0109 `:9` và `:141`. Nên đổi thành "chưa lên production theo `docs/HANDOFF-N1.md` (production tới migration 0077); chưa kiểm bằng lệnh". Điều kiện "chỉ phát hành sau Sổ tiền, cùng A2" giữ nguyên.
4. **ADR-0109 `:160` đã có câu trả lời.** Góc tiền đã đo được rằng tạm tính về được 0 khi dịch vụ có giá em bé bằng 0. Nên chuyển mục này từ "Chưa kiểm" thành sự thật, kèm ghi rằng câu R-BIL-14 mới phủ ca này.
5. **ADR-0109 `:111-112`, danh sách "Không đổi / đọc theo" còn thiếu hai chỗ:**
   - Thêm "ADR-0079 `:75` hai câu đầu: chữ "giảm giá" đọc là giảm giá hiệu lực khi hai số khác nhau". Ví dụ cho thấy cần thêm: cảnh báo "đại lý chịu phần này" sẽ nói đại lý chịu 700.000, trong khi sổ ghi đại lý chịu ròng 400.000.
   - Thêm `:100` của ADR-0063 vào danh sách các chỗ còn gọi "tổng âm".
   - Đổi "`giamGiaMinhChiu` tính từ dòng sổ" thành "suy ra từ đẳng thức ở ADR-0081 `:43`".
6. **ADR-0109 `:95`**, thêm một câu dưới bảng: "R-BIL-2 là đẳng thức trên đơn đã giao; sau khi phải thu kẹp ở 0 thì vế giảm giá phải là giảm giá hiệu lực, cho cả đơn lẻ lẫn đơn đại lý. R-BIL-14 chỉ khác khi tạm tính về 0."
7. **ADR-0109 `:15`**, thêm vào cuối: "(vế này có trong câu duyệt gợi ý của tệp 01 lượt 8a; nguyên văn hộp 8a không lưu)".
8. **ADR-0109 `:61-69`**, thêm dòng "Trần điều chỉnh sổ (ADR-0092 Đ5b, `billing/rules.ts:166-178`): không đổi, vì trần = max(phải thu, đã thu)."
9. **ADR-0109 `:43`**: "`0045:232-241`" → "`0045:234-241`".
10. **ADR-0110 `:3`**, thêm một câu giống ADR-0109 `:3`: "Dòng ★ ở mục "Câu ADR bị thay" (ADR-0096 `:84`) do người soạn bản chép thêm vì thiếu thì ADR-0096 tự mâu thuẫn với ADR này."
11. **ADR-0110 `:75`**, cột Mới: bỏ cụm "ô `trip.dispatch`, " vì câu gốc ADR-0096 `:36` đã có cụm này, để sau khi thay câu không bị lặp.
12. **ADR-0110 `:83` nói quá mức.**
    - Đổi "Bài hiện có là rào của quyết định này" thành "Bài hiện có chỉ rào một phần: chỉ luật thuần `thu-tu-diem.test.ts:61`".
    - Ở `:85`, thêm cách phá thứ hai: cổng `chanDaoMoi` bỏ gọi `daoMoiSauDoi`. Góc tiền đã thử đột biến M2 và thấy 341 bài van-chuyen vẫn xanh, tức không bài nào bắt.

### 5b. Ghi cho kế hoạch thi công (không sửa bản chép)

- Bài tĩnh "một hàm phải thu" cần danh sách trắng cho `src/shared/order-confirmation.ts:215` (đổi dấu để hiển thị) và `web/order-form.ts:330` (phép so sánh).
- Sổ vàng cần thêm các ca sau:
  - Bớt khách tới âm khi khách **chưa trả đồng nào**. Hôm nay đơn này bị 409 `overpaid`, sau khi kẹp sẽ ra 200.
  - Tạm tính về 0 qua dịch vụ có em bé giá 0.
  - Đơn huỷ từng âm (Tổng cộng 0, cọc không đổi).
- Bài cảnh báo phải bắt được ca giảm giá > 0 trong khi tạm tính = 0.
- Cần thêm một bài route cho ADR-0110 với ví dụ A(1), X(2), B(3): mỗi bước ↑ ↓ trả 200. Bài này phải được quan sát đỏ với cả hai đột biến M1 và M2 rồi mới ghi dòng vào `docs/SO-HANG-RAO.md`.
- **TNV-G1/G3.** Việc này không chặn chép chữ, vì ADR đã ghi lỗ đang hở và điều kiện phát hành. Câu hỏi "vá" nghĩa là đã có ở `main` hay đã lên production thuộc về điều phối và chủ. Nếu "vá" nghĩa là lên production thì theo `CLAUDE.md` §3 cần chủ gia hạn có ghi lý do. Khi báo chủ, nên thêm một câu: "Phần này chỉ phát hành sau đợt Sổ tiền, vì nó đụng chỗ tính tiền của hai lỗi đã biết."

## 6. Chưa kiểm

- **Nguyên văn hộp hỏi 8c chủ thực sự thấy lúc bấm** không còn trong kho. Mới chứng minh được bản chép khớp với phiếu mục 4. Câu "hộp thật khớp phiếu" là lời khai của điều phối.
- **Nguyên văn hộp 8a** (có vế "tổng tiền âm thì cảnh báo, không chặn" hay không) không còn trong kho.
- **Trạng thái production** (0078–0083 và A2 đã lên chưa) chưa kiểm. Chưa chạy `wrangler d1 migrations list --remote`, việc này do chủ chạy.
- **Số đơn tổng âm trên production**, và có đơn đã giao nào nằm ngoài giả định mốc Đã giao không: cần đọc D1 remote, chủ chạy.
- **e2e `sua-so-khach` (CA 3) và kịch bản Chrome `sua-so-khach-smoke`** chưa chạy. Mới suy từ số đang khoá và từ bài route tương đương.
- **Ca đại lý** mới tính trên giấy, vì ADR-0079 và ADR-0081 chưa thi công (`GIAM_GIA_BEN_DAT`, trigger (iv), R-BIL-2, R-BIL-14).
- **Cách đưa giảm giá hiệu lực tới biên nhận** (thêm trường vào `ReceiptDto` hay suy ra) và chữ ký mới của `canhBaoTongAm`: kế hoạch chốt, chưa typecheck.
- **ADR-0110 `:63-64`** (tin "chuyến vừa sửa" gửi tài xế, lần bấm bị từ chối vì lỗi khác của chuyến) và đường thêm khách khi xe chạy (`sapLaiDiem`): mới đọc mã, chưa chạy đầu-cuối.
- **Danh sách mã commit ở README `:36`** (kết quả `git log --all -S`) chưa chạy lại. Mới kiểm rằng số 0109, 0110, 0111 không bị nhánh nào chiếm.
- **Câu "khách đã trả bao nhiêu thì hoàn bấy nhiêu"** (ADR-0109 Quyết định 3) có đúng khi người thu là đại lý hay HDV hay không: chưa kiểm. Đây là chữ bề mặt, kế hoạch chốt.
- **Câu "§16 từng gỡ hẳn dòng đã xử lý (ADR-0015 900px)"**: lời của góc lời chủ, người tổng hợp chưa tự kiểm.
- **Bộ kiểm.** Góc tiền và mã đã chạy `npm test` (0 đỏ) và `npm run typecheck` (0 lỗi) trên cây `tourdaobooking-erp-assessment-34c6a7` @ `bfc3ed6c`. Người tổng hợp không chạy lại, và không sửa tệp nào.