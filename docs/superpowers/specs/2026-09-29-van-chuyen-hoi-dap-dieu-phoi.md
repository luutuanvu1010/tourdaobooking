# Vận chuyển — hỏi đáp với chủ về chuyến xe và bảng điều phối (2026-09-28 khuya → 29/9)

- **Mục đích:** ghi NGUYÊN VĂN câu trả lời của chủ dự án (trực tiếp với phiên điều phối) để người thiết kế "Bảng điều phối chung" và ADR chuyến xe (đề xuất 1b lượt duyệt 2, B1–B3) dùng làm căn cứ. Đây là tài liệu mô tả, ghi lời chủ, chưa phải ADR.
- **Trạng thái đề xuất 1b lượt duyệt 2 (B1–B3):** chủ **CHƯA duyệt**; chủ nói *"hãy hỏi tôi thêm để thiết kế tính năng và kiến trúc thật chuẩn nhé"*.

## Đã trả lời (câu của đề xuất 1b)

| Câu | Chủ chọn |
|---|---|
| Q1: ai xếp xe | **Bán hàng + Quản trị** (và Toàn quyền); Kế toán chỉ xem; HDV, Đối tác không thấy lịch xe |
| Q2: tài xế tự bấm Xuất bến / Đã đón / Khách vắng / Kết thúc | **Có** (giờ theo máy chủ; văn phòng bấm thay được, ghi ai bấm) |
| Q3: tài xế thấy SĐT người liên hệ | **Có, chỉ trong ngày chạy**, chỉ đơn có khách trên chuyến mình |

## Cách xe chạy thật (lời chủ)

1. **Hình chuyến:** đón **nhiều khách sạn → nhiều điểm đến** (cảng Vinpearl, Bến Tàu Du lịch, cáp treo, sân bay…).
2. **Giờ đón:** văn phòng hẹn lúc lập đơn, nhưng **có thể thay đổi giờ đón hoặc lịch trình trước và trong lúc chạy**. Nguyên văn:
   > "xe A có lịch đón tại khách sạn Sheraton -> Amiana- > Mường Thanh rồi đưa đến cangr Vinpearl, và 1 nhóm khách đến Bến Tàu Du lịch. Xe B có lịch đón : INtercontinential-> AB Square-> Alibu. Nhưng vì lý do nào đó (kẹt xe, thêm khách bổ sung trong lịch so với ban đầu,...) thì lại có sự thay đổi của A và B trước-trong lúc đi đón/trả khách. LÚc này, Xe A có thể đón Sheraton-> Amiana-> Alibu. Xe B lại đón Intercontinential -Absquare-Mường Thanh. . Tóm lại, có những thứ được tuỳ chọn qua cấu hình, có những luồng cố định (lõi) , có những luồng quyết định trong logic. Hãy bàn thêm nhé"
3. **Chiều về:** tuỳ dịch vụ → **khai theo từng dịch vụ trong danh mục** (không đưa đón / một chiều / hai chiều; lập đơn tự tạo đúng số chặng, sửa tay được).
4. **Lúc xếp xe:** *"Xếp xe bất cứ lúc nào, nhưng tối thiểu phải là 6 giờ trước giờ khởi hành"*.
5. **Mốc 6 giờ:** chặn, có ngoại lệ (người có quyền phá lệ kèm lý do). Áp **cả hai** lúc: lúc khách đặt (biểu mẫu) và lúc xếp xe. Nguyên văn thêm:
   > "luật này đưọc ghép điều kiện chung với TOur/dịch vụ. Nghĩa là : nếu khách đặt vé đi Vinpearl mà yêu cầu đón thì giờ đón trên biểu mẫu đặt tour chính là giờ đón được gán cho lịch chung. Căn cứ lịch chung đó, có 1 worker/module để điều phối chung cho xe."
6. **Bộ điều phối chung** (nguyên văn):
   > "Nghĩ thật kỹ bộ điều phối chung này giúp mình, đây vừa là bảng điều khiển, vừa là nơi để xử lý tính toán một cách logic và trực quan hoá luồng dữ liêụ của phân hệ Vận Chuyển"
7. **Chuyển điểm đón giữa hai xe khi xe đang chạy:** văn phòng chỉ thêm điểm đón; **tài xế đề nghị với nhau**. Nguyên văn:
   > "Tôi nghĩ về phương án B, bảng điều phối chung sẽ nhận được thống tin này, tự động kích hoạt các logic có sẵn để tính toán, Ưu tiên luồng B nhận -> Điều phối xác nhận tự động"
8. **Bớt/huỷ điểm đón khi xe đang chạy:** nguyên văn:
   > "Được, kèm lý do, nhưng mặc định là tài xế hoàn thành điểm đón (trên thực tế có thể không đón được khách đã huỷ nhưng tài xế đang đến đó và không làm được việc khác.)"
9. **Không** tự báo khách khi đổi giờ đón: hệ thống ghi giờ mới, nhắc người phụ trách / tài xế gọi.

## Nguyên tắc chủ nhấn mạnh (28/9 tối, đã vào ADR-0047/0048)

- Vận chuyển vừa là dịch vụ độc lập vừa là thành phần chuỗi dịch vụ → một khái niệm "chặng".
- Phương tiện là thực thể độc lập, tài sản công ty hoặc đối tác; xe và tài xế có hồ sơ riêng.
- Đúng Hiến pháp và triết lý Oracle.

## Ba tầng điều phối đã trình chủ (chủ chưa phản đối; chờ duyệt trong thiết kế)

- **Lõi cố định:** mỗi khách tại một thời điểm ở đúng một xe; tổng người ≤ số chỗ mọi lúc (kể cả sau chuyển điểm); xe/tài xế không chồng giờ; mọi thay đổi ghi thêm (ai, lúc nào, vì sao), không sửa đè; qua cổng mới xuất bến; chuyến kết thúc không sửa; tài xế chỉ thấy chuyến mình.
- **Cấu hình (có ngày hiệu lực):** mốc tối thiểu 6 giờ; khoảng nghỉ; điều kiện xuất bến; danh sách lý do đổi; chiều về theo dịch vụ; bảng hạng bằng ↔ số khách.
- **Máy tự quyết theo luật (người quyết cuối, trừ luồng tự xác nhận chủ đã chọn):** gợi ý xe/tài xế; kiểm lại cả hai xe khi chuyển điểm; cảnh báo trùng giờ, sát mốc 6 giờ.

## Trả lời lần 2 (29/9, câu ĐP của bản thiết kế Bảng điều phối)

| Câu | Chủ chọn |
|---|---|
| ĐP2 mốc 6 giờ | **"Theo 4 khuyến nghị"**: (i) lúc xếp tính tới giờ xe xuất bến của chuyến; (ii) chặng đã phá lệ lúc đặt thì lúc xếp không ghi lý do lần nữa; (iii) trong 6 giờ chỉ khoá "ai đi xe nào", đổi xe, đổi tài xế (chỉnh thứ tự điểm, giờ xe tới vẫn làm được, có ghi); (iv) kiểm lại mốc lúc xác nhận đơn và khi sửa nơi đón/trả |
| ĐP3 ai phá lệ mốc 6 giờ và khoảng nghỉ | **"Chỉ Quản trị, Toàn quyền"** (cả lúc đặt lẫn lúc xếp — chặt hơn khuyến nghị) |
| ĐP6 người xếp xe đổi giờ hẹn khách trên đơn người khác | **"Không, nhắc người phụ trách"** |
| ĐP7 hợp đồng vận chuyển + ĐP8 cách xử lý nhiều người cùng thao tác | **"Đồng ý cả hai"**: hợp đồng để lượt riêng sau (công tắc khoá ở tắt); kiểm và ghi ngay trong một lần, đụng nhau thì tải lại (không trạm theo ngày, không hàng đợi) |

## Trả lời lần 3 (29/9, câu của hai kế hoạch thi công ADR-0047 và ADR-0048)

Điều phối hỏi chủ trực tiếp, rồi chuyển lại cho người thi công; ghi ở đây để có một nơi lưu bền (nhật ký thi công của từng nhánh cũng có).

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| Khi đơn còn là NHÁP, sửa phần đưa đón / danh sách hành khách thì máy làm theo cách nào? (hỏi lại lần hai cho rõ, sau khi chủ đề nghị "Hãy hỏi lại và rõ ý hơn") | **"Cách 1: chỉ giữ bản cuối"** — đơn nháp xoá hẳn rồi ghi lại chặng + danh sách khách cùng lô khi lưu; đơn đã xác nhận cấm xoá (ADR-0047 kế hoạch Q0) |
| Ngày đón được cách ngày đi của tour/dịch vụ bao xa? | **"Sớm 1 ngày, muộn 7 ngày"** — ngày đón trong [ngày đi − 1, ngày đi + 7], ngoài khoảng máy chặn. Đây là con số điền cho câu "khoảng cho phép (luật đổi được, ở mã)" mà ADR-0047 để cho mã, không phải sửa câu ADR (ADR-0047 kế hoạch Q2) |
| Khi đã thêm xe, có sửa được "chủ xe" (công ty ↔ nhà xe, hoặc nhà xe A → B) không? | **"Sửa được, ghi nhật ký"** — sửa nhập nhầm, nhật ký ghi "chủ xe A → B" (ADR-0048 kế hoạch Q1) |
| Hai chuyện giao diện, gộp: (a) "Chuyến đón hôm nay" ở Trang chủ vẫn lấy theo ngày đi như hiện nay; (b) không làm màn riêng "Nhà xe" — tìm nhà xe ở Danh bạ bằng ô lọc, danh sách xe lọc theo chủ xe. Đồng ý? | **"Đồng ý cả hai"** (ADR-0047 kế hoạch Q3; ADR-0048 kế hoạch Q2) |

## Trả lời lần 4 (29/9, câu ĐP2(v) và lời duyệt ADR-0049)

Người kiểm nhanh đề xuất ADR-0049 chỉ ra: ĐP2(iv) chưa hỏi trường hợp đơn có giờ hẹn ĐÃ dưới mốc 6 giờ ngay từ lúc gõ. Điều phối hỏi riêng, kèm lưu ý phương án khuyến nghị lỏng hơn câu "áp cả lúc khách đặt (biểu mẫu)" của chủ ngày 28/9.

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| ĐP2(v): "Nhân viên lập đơn lúc 2 giờ 20 sáng cho khách cần đón lúc 6 giờ 30 (chỉ còn hơn 4 giờ, dưới mốc 6 giờ). Bấm Lưu nháp thì máy làm gì?" — hai phương án: "Cho lưu nháp, chặn ở Xác nhận" / "Chặn ngay từ lúc lưu" | **"Cho lưu nháp, chặn ở Xác nhận"** — đơn nháp lưu được (hiện cảnh báo), xác nhận bị chặn tới khi Quản trị / Toàn quyền bấm "Đặt gấp" kèm lý do |
| "Duyệt quyết định Bảng điều phối chung, lượt 1 (9 điểm ở trên)?" — tóm tắt 9 điểm trình trong chat | **"Duyệt, ghi theo câu 1"** — điều kiện điều phối đã nêu: người kiểm xem lại bản cuối rồi mới ghi thành ADR-0049 chính thức |

Kết quả điều kiện: người kiểm xem bản cuối (đỉnh `dcea833`) ĐẠT 8/8 mục → điều phối ghi `docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md` (accepted, 29/9).

## Trả lời lần 5 (29/9, duyệt hai tệp đề xuất sửa luật của ADR-0047 và ADR-0048)

Hỏi sau khi người kiểm độc lập Phần A của cả hai nhánh báo: ADR-0048 (đỉnh `3d8f4b0`) ĐẠT; ADR-0047 (đỉnh `6bb67c8`) ĐẠT CÓ ĐIỀU KIỆN — điều kiện duy nhất là chủ duyệt bốn mục nới luật trước khi gộp. Điều phối xếp lượt: ba mục chạm dữ liệu/quyền (0047 mục 2, 0047 mục 3, 0048 mục 1) + hai mục chỉ là quy tắc đặt tên (0047 mục 1, mục 7) — trong trần 3 của `CLAUDE.md` §9.

| Câu (điều phối hỏi, tóm đúng nội dung đã hiện cho chủ) | Chủ chọn |
|---|---|
| ADR-0047, tệp `docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md`: "cho phép 4 ngoại lệ luật để gộp được không? (1) bảng mới của phần Đơn đặt tên bắt đầu bằng 'ord_'; (2) đơn còn NHÁP: lưu lại thì xoá hẳn chặng + tên khách cũ rồi ghi mới (đúng câu bạn chọn 'chỉ giữ bản cuối'), đơn đã xác nhận máy vẫn cấm xoá; (3) tạm cho phần Đơn đọc sổ nhật ký để biết 'lần lưu này có thắng không' như đang làm, hạn tới 31/3/2027; (4) cột họ tên khách tên 'full_name' trùng chữ với một cột bỏ đi của bảng nhân viên — cho đúng một tệp được nhắc chữ này, có bài kiểm bảo đảm không đụng bảng nhân viên. Kèm ghi 4 điều vào tài liệu luật cho khớp máy." — ba phương án: "Duyệt cả 4" / "Duyệt 1–3, đổi tên cột" / "Chưa, giải thích thêm" | **"Duyệt cả 4"** — tức mục 1, 2 (kể cả 2b, 2c sửa `docs/ARCHITECTURE.md`), 3 (hạn `2027-03-31`), 7 của tệp đề xuất, và mục 4a, 4b (tài liệu luật). **Chưa hỏi:** 4c (`web/CLAUDE.md`, điền ở Phần B), 4d (dòng bẫy tuỳ chọn ở `CLAUDE.md` §10), mục 6 (phát hành 2) — hỏi khi tới |
| ADR-0048, tệp `docs/superpowers/plans/2026-09-29-adr-0048-de-xuat-luat.md`: "duyệt đề xuất luật? Gồm: mở hàng rào 'tài khoản người ngoài chỉ giữ quyền Đối tác' thành 'Đối tác HOẶC Tài xế đối tác' (… kèm luật siết mới: Tài xế đối tác không giữ thêm quyền nào khác …), và ghi tài liệu luật cho khớp (Hiến chương phần kỹ thuật, luật thư mục mã, CLAUDE.md: 8 → 9 quyền). … Riêng dòng bảng kịch bản giao diện sẽ hỏi sau khi xong giao diện." — hai phương án: "Duyệt" / "Chưa duyệt" | **"Duyệt"** — tức mục 1 (1a–1d), 3, 4, 6 (6a, 6b). **Chưa hỏi:** mục 5 (`web/CLAUDE.md`, điền ở Phần B) |

Cách áp (theo bài học 28/9: việc NỚI do phiên nhận lời chủ TRỰC TIẾP làm): điều phối áp các diff sửa tệp luật lúc gộp (Task K3 của từng kế hoạch), mỗi tệp một commit, chủ bấm Đồng ý ở hộp hỏi quyền; đổi chú thích "CHỜ CHỦ DUYỆT" trong `src/architecture.test.ts` thành "đã duyệt 2026-09-29"; người kiểm so khớp phần áp.

## Trả lời lần 6 (29/9, ba câu của kế hoạch thi công ADR-0049 — mốc 6 giờ, "Đặt gấp")

Kế hoạch `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md` mục 12 (Q1, Q2) + câu T-9/I14 mà người kiểm độc lập kế hoạch (ĐẠT CÓ ĐIỀU KIỆN) đề nghị đưa lên chủ vì là câu song sinh của Q1 (điều phối đặt là Q3). Mỗi câu chỉ chặn một bước thi công.

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| Q1: "Đơn NHÁP sát giờ đã được Quản trị bấm "Đặt gấp". Sau đó người bán sửa đơn nháp đó (ví dụ thêm tên khách) rồi bấm Lưu. Dấu "Đặt gấp" còn giữ không?" — "Còn, nếu không đổi giờ/nơi" / "Mất sau mọi lần lưu" | **"Còn, nếu không đổi giờ/nơi"** — chặng không đổi ngày, giờ, nơi đón, nơi trả thì giữ dấu; chặng nào đổi thì mất, phải nhờ Quản trị bấm lại |
| Q3 (T-9): "Đơn ĐÃ XÁC NHẬN, chặng đã "Đặt gấp" và đang dưới mốc 6 giờ. Khách đổi khách sạn nên cần sửa nơi đón (hoặc ngày, giờ, nơi trả) của chặng đó. Ai được sửa?" — "Chỉ Quản trị, Toàn quyền" / "Bán hàng tự sửa được" | **"Chỉ Quản trị, Toàn quyền"** — mỗi lần sửa ghi lý do; "Đặt gấp" chỉ duyệt đúng giờ/nơi lúc đó, đổi thì duyệt lại (điều phối diễn giải, không phải lời chủ — cách đọc chặt của ADR-0049: câu thay ADR-0047 A1 thắng vế "trừ khi chặng mang đặt gấp" của D2 đối với việc SỬA; vế đó vẫn áp cho việc XÁC NHẬN và XẾP) |
| Q2: "Đã trong vòng 6 giờ trước giờ xe chạy, Bán hàng có được TẠO một chuyến xe mới (chọn xe, tài xế) không?" — "Được, chỉ cho khách đặt gấp" / "Không, cần Quản trị phá lệ" | **"Được, chỉ cho khách đặt gấp"** — chuyến mới trong 6 giờ chỉ xếp được chặng đã "Đặt gấp"; xếp khách khác vẫn cần Quản trị/Toàn quyền phá lệ |

## Trả lời lần 7 (29/9, mục 4 đề xuất luật ADR-0049 — lượt riêng, một quyết định)

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| "Luật kỹ thuật chung (Hiến chương phần II, đứng trên mọi ADR) dạy một cách chống hai người sửa cùng lúc: xem "giờ sửa cuối" và tra sổ nhật ký. Bảng điều phối (ADR-0049 bạn đã duyệt) dùng cách khác: "số phiên bản" + "dấu lệnh" ghi ngay trên chuyến xe, vì phần Vận chuyển theo luật không được đọc sổ nhật ký. Hai chỗ viết khác nhau nên phải sửa một bên. Chọn cách nào?" — "Sửa luật chung cho khớp" / "Giữ luật chung, đổi Bảng điều phối" | **"Sửa luật chung cho khớp"** = phương án (a) mục 4 của `docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md` (đỉnh `5a7eb71`): diff `docs/ARCHITECTURE.md:194`, `:215` và `src/CLAUDE.md:26` — điều phối áp lúc gộp ADR-0049, mỗi tệp một commit. Mục 1–3 (nới) của tệp đó CHƯA hỏi — trình lúc gộp |

## Kết quả truy vấn chỉ đọc của chủ (29/9, ADR-0047 kế hoạch mục 10 bước 3 — câu Q1)

Chủ tự chạy `~/.claude/jobs/32bcd96e/tmp/kiem-q1-chang.sh` (`wrangler d1 execute … --remote`, chỉ `SELECT` đếm) và dán kết quả vào chat:

| trang_thai | so_dich_vu_co_don | co_gio_khong_noi | chua_co_ngay_di | chua_co_noi_tra |
|---|---|---|---|---|
| cancelled | 18 | 2 | 0 | 18 |
| confirmed | 27 | 0 | 0 | 27 |

(Không có dòng `draft`: không đơn nháp nào có dữ liệu đón cũ.)

Điều phối kết luận (không phải lời chủ):
- **Q1 không cần chủ quyết:** "giờ không nơi" chỉ có 2 dịch vụ, đều thuộc đơn ĐÃ HUỶ; đơn đã xác nhận = 0. Giữ mặc định (a) "(chưa ghi nơi đón)" đang có trong `0034` (hằng `NOI_DON_CHUA_GHI`, giả định G10). Đảo ngược được: `0034` chưa áp remote.
- **Ngày đi:** đủ ở mọi dịch vụ ⇒ không chặng chép nào thiếu ngày.
- **Nơi trả:** 45/45 dịch vụ chưa có ⇒ sau phát hành, mọi chặng chép từ dữ liệu cũ mang "nơi trả chưa chốt" — `audit-invariants` báo CẢNH BÁO R-ORD-8 (không phải vi phạm, không chặn triển khai); nhân viên bổ sung khi cần.

## Trả lời lần 8 (29/9, mục 5 đề xuất luật ADR-0048 — điều kiện cuối của người kiểm K2)

Người kiểm độc lập cuối ADR-0048 (K2, đỉnh `5a024b4`): ĐẠT CÓ ĐIỀU KIỆN — điều kiện duy nhất là chủ duyệt mục 5. Hai chỉnh THẤP người kiểm đề nghị đã sửa ở `f575ffb` (thêm `public/xe.html` vào dòng B3; ghi chú `dot-a-smoke` đỏ sẵn từ ADR-0038).

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| "Nhà xe + tài xế đối tác: ghi thêm 4 dòng vào luật giao diện (web/CLAUDE.md) — mỗi dòng nói "sửa màn này thì phải chạy lại bài kiểm trình duyệt nào": (1) ô chọn vai "Tài xế đối tác" và khoá chéo; (2) quan hệ "Tài xế của" + vai "Nhà xe đối tác" ở Danh bạ; (3) ô "Chủ xe", nhãn "Nhà xe: …", ô lọc chủ xe ở màn Xe; (4) nhãn nhà xe ở Giấy tờ sắp hết hạn + trang của tài khoản Tài xế đối tác. Chỉ siết (bắt kiểm nhiều hơn), không nới gì. Kèm 2 chỉnh nhỏ người kiểm đề nghị (thêm một tệp màn Xe vào dòng 3; ghi chú một bài kiểm đang đỏ sẵn từ trước). Đây là điều kiện cuối để gộp và phát hành bản 1.37." — "Duyệt" / "Chưa duyệt" | **"Duyệt"** — mục 5 (bản ở `f575ffb`). Cùng mục 1, 3, 4, 6 đã duyệt ở lần 5 ⇒ toàn bộ tệp đề xuất luật ADR-0048 đã duyệt; điều phối áp ở nhánh phát hành 1.37 |

## Trả lời lần 9 (29/9 chiều, sau khi 1.37 lên production)

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| "Chế độ bảo trì trên mạng thật đang BẬT tới 14:16 ngày 2/10 (sáng nay còn tắt). Trong lúc bật, nhân viên không có trong danh sách cho phép KHÔNG vào được app. Bạn bật có chủ ý không?" | **"Có chủ ý, giữ nguyên"** |
| Q-A4-1 (người thi công ADR-0049 tìm ra, người kiểm giữa chừng xác nhận rộng hơn — cả đổi xe/tài xế lẫn xếp/rút/đổi/huỷ có khách): "Kẽ hở mốc 6 giờ: trong 6 giờ trước giờ xe chạy, Bán hàng không được đổi xe/tài xế hay xếp/rút khách. Nhưng họ có thể dời giờ xuất bến ra xa (được phép) → đổi → dời giờ về, lách được mốc. Bịt thế nào?" — "Khoá "dính"" / "Khoá luôn việc dời giờ" / "Giữ như ADR, không bịt" | **"Khoá "dính""** — chuyến đã vào vùng 6 giờ thì giữ khoá dù giờ bị dời ra xa; Bán hàng vẫn dời giờ được; thêm một cột trên bảng chuyến (chưa lên production) |
| GA-5: "Toàn quyền đặt mốc tối thiểu = 0 thì mốc 6 giờ TẮT HẲN (không ai cần xin phá lệ nữa, chỉ một dòng nhật ký lúc đặt). Cho phép không?" — "Không cho tắt" / "Cho tắt bằng 0" | **"Không cho tắt"** — mốc phải lớn hơn 0; muốn nới thì đổi con số |
| "Từ tài liệu Transportation Kernel, bạn muốn tôi soạn đề xuất (để bạn duyệt) cho ý nào?" (chọn nhiều) — "Giờ xảy ra thật khi bấm thay" / "Xe riêng / hạng xe hứa khách" / "Lịch bận xe + giờ lái tối đa" / "Số hiệu chuyến bay" | **Cả bốn**, kèm lời chủ nguyên văn: *"chúng ta cần chạy 1 subagent để đối chiếu transportation-kernel-travel-erp.md với hệ thống, với phương châm bịt ngay những lỗ hổng và thừa kế lõi có thể áp dụng"* |

## Trả lời lần 10 (29/9, đề xuất Vận chuyển — thừa kế Transportation Kernel, lượt duyệt 1 → ADR-0050)

Đề xuất `docs/superpowers/specs/2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-1.md` (bản sửa theo người kiểm, đỉnh `73d3c2d`). Người kiểm độc lập: lần 1 ĐẠT CÓ ĐIỀU KIỆN (8 lỗ có thật + 3 lỗ thêm trong VK1), bản sửa kiểm lại **ĐẠT**. Điều phối chốt R-K1 (mã đóng suất mới `STOP_CHANGED`, không dùng lại `MOVED`).

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| Q-L1-1: "Tài xế gọi báo "đón xong lúc 7:31", văn phòng bấm "Đã đón" giúp lúc 7:45. Máy ghi giờ đón là mấy giờ?" — "Sửa được giờ thật" / "Ghi để xem, luật tính lúc bấm" / "Giữ cũ: chỉ giờ lúc bấm" | **"Sửa được giờ thật"** — văn phòng sửa thành giờ thật, lùi tối đa 3 giờ, không sớm hơn lần sửa lịch xe cuối; máy vẫn nhớ ai bấm, bấm lúc nào. **Thay câu chủ chọn trước** (Q2 "giờ theo máy chủ") cho trường hợp văn phòng bấm thay; tài xế tự bấm vẫn theo giờ máy chủ |
| Q-L1-2: "Xe đã được xếp đón khách ở Sheraton. Sau đó khách đổi sang Amiana và người bán sửa trên đơn. Máy làm gì với chuyến xe?" — "Giữ chuyến tới khi cập nhật" / "Chỉ báo đỏ, vẫn cho chạy" / "Máy tự đổi điểm đón" | **"Giữ chuyến tới khi cập nhật"** — không cho xuất bến tới khi người xếp xe bấm "Cập nhật điểm theo đơn"; không cần Quản trị duyệt kể cả sát giờ; xe đã chạy thì chỉ báo đỏ |
| Q-L1-3: "Lúc xe xuất bến, máy có kiểm giấy tờ của XE không? (Hiện máy chỉ kiểm bằng lái của tài xế.)" — "Kiểm định + Bảo hiểm" / "Kiểm đủ mọi giấy (bảng 27/9)" / "Không kiểm sẵn, tự bật sau" | **"Kiểm định + Bảo hiểm"** — gieo sẵn Kiểm định và Bảo hiểm TNDS cho mọi xe; giấy khác chủ tự bật khi có người chuyên môn xác nhận; phải đếm và dọn xe có hai bản giấy cùng loại trước khi bật |
| "Duyệt ghi lượt 1 này thành quyết định chính thức ADR-0050 theo 3 câu trả lời trên? (Tôi chỉ ghi sau khi người kiểm độc lập xem bản cuối và báo đạt.)" | **"Duyệt, ghi theo 3 câu"** — người kiểm đã báo bản cuối ĐẠT trước khi ghi |

## Trả lời lần 11 (29/9 tối, câu GA-25 của người thi công ADR-0049 — người kiểm giữa chừng đề nghị hỏi thẳng)

Người kiểm độc lập giữa chừng (nhánh `thi-cong-adr-0049-tiep` @ `9105306`): ĐẠT CÓ ĐIỀU KIỆN; điều kiện duy nhất trước khi nối luật vào route là câu này. Hàm `kiemGioXayRa` (`src/shared/gio-xay-ra.ts`) có thêm vế "đã tới điểm trả ≤ đã trả", chặt hơn chữ ADR-0050 dòng 113–121 (dòng 46 chỉ là câu tóm tắt "không đảo thứ tự các bước").

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| "Khi văn phòng khai giờ thay tài xế: giờ "xe đã tới điểm trả" có bắt buộc phải sớm hơn (hoặc bằng) giờ "đã trả khách" ở điểm đó không? Ví dụ: đã ghi "trả khách 9:00", sau đó khai "xe tới điểm trả 9:05" → máy có chặn không?" — "Chặn" / "Không chặn" | **"Chặn"** — xe phải tới nơi rồi mới trả khách; khai ngược thứ tự thì máy báo lỗi. Giữ nguyên mã đang có (GA-25 thành quyết định của chủ). Áp cho cách hiểu ADR-0050 vế 3 "thứ tự trong chuyến"; không sửa ADR (ADR đã duyệt), ghi ở đây và nhật ký thi công |

## Trả lời lần 12 (29/9 tối, bốn câu từ đối chiếu bản vẽ Bảng điều phối lượt 1)

Bản vẽ chủ xuất từ Claude Design 29/9 19:54 (8 màn). Phiên đối chiếu (vai kiểm, chỉ đọc) báo: 12 chỗ trái quyết định đã duyệt (người thi công sửa theo căn cứ), ~10 khoảng hở dữ liệu (điều phối ruling R-P12…R-P18), 4 câu cần chủ. Toàn văn: `docs/design/van-chuyen-dieu-phoi/DOI-CHIEU-2026-09-29.md` (người thi công giao diện chép vào repo). Chủ đã được báo trước khi hỏi rằng màn Xuất bến của tài xế chỉ hiện giấy tờ còn thiếu, chặng đã đặt gấp xếp thẳng, danh mục Lý do bỏ nhóm "Đặt gấp"/"Bỏ chặng" — theo quyết định đã duyệt, khác bản vẽ.

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| "Bản vẽ có ô ghi chú gõ tự do trong chuyến xe ("Ghi chú cho tài xế", ghi chú khi phá lệ, khi kết thúc gián đoạn). Lượt này có làm không?" — "Chưa làm" / "Làm, có che số" | **"Chưa làm"** — chỉ chọn lý do có sẵn; ghi `docs/BACKLOG.md` mục 5 |
| "Cột "Cần xử lý" trong bản vẽ có nút "Đã gọi báo" và dòng "Giờ hẹn đổi 09:00 → 09:15". Lượt này có làm không?" — "Để lượt sau" (khuyến nghị) / "Làm ngay lượt này" | **"Làm ngay lượt này"** — trái khuyến nghị; chủ đã được nói "thêm dữ liệu "đã gọi" và giờ hẹn cũ; lượt 1 dài thêm, có thể cần quyết định bổ sung". Là dữ liệu mới ngoài ADR-0049 → điều phối cho soạn quyết định bổ sung (ADR mới, số kế tiếp 0051) trình chủ duyệt trước khi làm |
| "Trang Chính sách điều phối: bản mới có hiệu lực ngay khi lưu, hay cho hẹn ngày hiệu lực (bản vẽ có ô ngày và bản "Đang soạn")?" — "Hiệu lực ngay" / "Hẹn ngày được" | **"Hiệu lực ngay"** — giữ kế hoạch I28 (`valid_from_at` = lúc máy chủ ghi); bỏ ô ngày và dòng "Đang soạn" của bản vẽ |
| "Trên trang chi tiết đơn, nhãn "Đặt gấp — lý do — người duyệt" hiện cho ai? (Đơn còn được Đối tác, Hướng dẫn viên, Thực tập xem.)" — "Văn phòng đủ, ngoài gọn" / "Chỉ văn phòng thấy" / "Ai xem đơn cũng thấy đủ" | **"Văn phòng đủ, ngoài gọn"** — Bán hàng, Kế toán, Quản trị, Toàn quyền thấy lý do + người duyệt + lúc + ghi chú (đã che số); Đối tác, Hướng dẫn viên, Thực tập chỉ thấy "Đặt gấp — Quản trị đã duyệt". Gỡ nợ N-14 |

Điều phối tự chốt (bề mặt, theo bản vẽ, ghi ở đây để chủ xem lại): thẻ "Xe" trên điện thoại giữ dòng thời gian cuộn ngang như bản vẽ (sửa chữ bị cắt); tài xế có tab "Cuốc của tôi" làm trang mở đầu như bản vẽ. Danh sách lý do đặt gấp theo bản vẽ (R-P18): "Khách đoàn gọi gấp", "Chuyến bay đổi giờ", "Đơn bù cho khách bị lỡ chuyến", "Lý do khác" — thay 3 lý do tạm trong mã, trước khi migration 0040 lên production.

## Trả lời lần 13 (29/9 tối, câu A12 của người thi công ADR-0049 — khoá ngoại 0042 sang bảng `ord_*`)

Người thi công (nhánh `thi-cong-adr-0049-tiep`) báo: khoá ngoại của 0042 `vc_trip_allocation.leg_id → ord_transfer_leg`, `vc_trip_allocation.passenger_key → ord_passenger`, `vc_trip_manifest.passenger_row_id → ord_passenger` (kế hoạch mục 1.3) làm bài EXPLAIN ranh giới (`src/architecture.test.ts`, ADR-0002 điều 8(b)) đỏ ở 4 câu orders nửa nghiêm (`leg_insert_guarded`, `leg_delete_draft`, `passenger_insert_guarded`, `passenger_delete_draft`), vì SQLite tự quét bảng con khi xoá / chèn nhiều dòng vào bảng cha. (A) bỏ ba khoá ngoại, giữ toàn vẹn bằng trigger LC-09/LC-10 đọc view, trigger `ord_*_no_delete`, kiểm định kỳ R-VC-10 — không nới hàng rào. (B) giữ khoá ngoại, sửa bộ phân tích nhận "quét bảng con vì khoá ngoại" — nới hàng rào, cần chủ duyệt. ADR-0002 điều 5 CHO PHÉP khoá ngoại xuyên module đúng chiều nhưng không bắt buộc; ADR-0049 D1 không bắt buộc.

| Câu (nguyên văn điều phối hỏi) | Chủ chọn |
|---|---|
| "Bảng chuyến xe cần "gắn" vào chặng đón và danh sách hành khách của đơn. Gắn bằng móc nối cứng của cơ sở dữ liệu thì một hàng rào kiểm kiến trúc báo đỏ (nó tưởng phần Đơn hàng đọc trộm bảng của phần Vận chuyển). Chọn cách nào?" — "Bỏ móc nối cứng" / "Giữ móc nối, sửa hàng rào" | **"Bỏ móc nối cứng"** — ruling R-P19 = (A). Chủ đã được nói điều mất: "danh sách khách của xe trỏ tới người không còn" do máy chủ và kiểm định kỳ bắt, không phải cơ sở dữ liệu tự chặn. Người thi công phải có trigger thay thế đọc view + P16 + dòng sổ hàng rào; `docs/data-dictionary.json` ghi "tham chiếu logic, không khoá ngoại (R-P19)" |
