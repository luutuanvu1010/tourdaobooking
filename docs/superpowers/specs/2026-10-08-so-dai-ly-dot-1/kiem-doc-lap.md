# Báo cáo kiểm độc lập (chỉ đọc) — Đặc tả "Sổ đại lý đợt 1"

- Tệp kiểm: `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md` (nhánh `claude/so-tien-luot-2-dai-ly`, HEAD `cc008538`, dựng từ `main` @`43857d7a`; nhánh chỉ thêm đúng tệp này, 239 dòng).
- Người kiểm: AI, vai kiểm độc lập, không tham gia soạn đặc tả. Ngày 2026-10-08. Không sửa tệp nào của repo.
- Luật kiểm: một vòng; CHẶN = sai sự thật có thể làm chủ quyết sai; còn lại NHỎ.

## Kết luận

**ĐẠT CÓ ĐIỀU KIỆN.** Có **một** lỗi CHẶN, nằm ở Phần A: câu "Đơn của đại lý vẫn chưa bấm được Đã giao" mô tả sai hiện trạng. Hôm nay đơn Đối tác tự lập vẫn bấm "Đã giao" được, và chính đợt 1 mới tạo ra lệnh chặn này. Sửa xong một câu đó (và cho chủ thấy phương án) thì trình chủ được. Ngoài ra có 18 phát hiện NHỎ; sáu mục đánh dấu * (N1–N5, N15) nên sửa trước khi lập kế hoạch. Bảng ô quyền, ví dụ số A-1, A-5 và hầu hết khẳng định về mã đều đúng.

## Bằng chứng tự chạy

1. `npm run typecheck`: thoát 0 (cả ba tsconfig).
2. `npm test`: bước 1 có 3445 bài, 3443 đạt, 0 hỏng, 2 todo; bước 2 (bài đo giờ) 1/1 đạt; tổng thoát 0. Nhánh chỉ có tệp đặc tả nên kết quả này chỉ xác nhận nền đang xanh.
3. Phép thử riêng (CSDL tạm trong thư mục scratchpad, dựng bằng `sqlite3` từ toàn bộ `migrations/*.sql` của worktree, không chạm D1 nào). Tạo ba hồ sơ làm bên đặt rồi hỏi đúng biểu thức chặn "Đã giao" của `src/modules/orders/hoan-tat-repo.ts:16` và `:76`, cùng biểu thức `BOOKER_VALUE` của `src/modules/orders/repository.ts:786`:

| Bên đặt | Bị chặn "Đã giao" | `BOOKER_VALUE` hôm nay ghi |
|---|---|---|
| khách (vai `CUSTOMER`, nhóm `OTHER`) — kiểu đơn Đối tác tự lập hôm nay | **0 (không chặn)** | id hồ sơ |
| hồ sơ tổ chức vai `TRAVEL_AGENCY` — kiểu bên đặt của đợt 1 | **1 (chặn)** | NULL (tổ chức bị loại) |
| cá nhân vai `DRIVER_EXTERNAL` | 1 (chặn) | id hồ sơ |

4. Phép thử LC-1 trên cùng CSDL tạm: tài khoản gắn hồ sơ Công ty lữ hành, chèn quyền `PARTNER` được, chèn thêm `SALES` thì bị trigger từ chối: `lc1_external_account_permission: tài khoản có vai bên ngoài chỉ giữ quyền bên ngoài`.
5. Rà migration các nhánh chưa gộp: `main` lớn nhất `0088`; `adr-0104-d1` giữ `0084`–`0086`, `adr-0104-d2` giữ `0085`, `0086`, `0089`, khớp §1 dòng 53. Bốn tệp `0084`, `0085`, `0086`, `0089` không tạo bảng tiền nào có `occurred_date`, nên danh sách bốn bảng khoá tháng của §3 vẫn đủ.

## Phát hiện CHẶN

### C1 — Phần A dòng 28: "Đơn của đại lý **vẫn** chưa bấm được Đã giao"

- **Câu trong đặc tả:** "Đơn của đại lý vẫn chưa bấm được 'Đã giao' … Vì vậy đơn đại lý mới tạo sau đợt 1 sẽ dừng ở bước 'Đã giao' cho tới khi đợt 2 lên. Bạn đã nói dữ liệu hiện tại chỉ là dữ liệu thử, nên tôi chấp nhận khoảng chờ này." (cùng ý ở §7 dòng 175).
- **Mâu thuẫn ngay trong đặc tả:** §1 dòng 45 viết "Đơn do tài khoản Đối tác lập ghi bên đặt là khách cuối do form gửi, hoặc trống". Bên đặt là khách thì mang vai nhóm `OTHER`; bên đặt trống thì `EXISTS (… party_id = NULL)` cho kết quả sai. Cả hai trường hợp đều không bị chặn. Phần A dòng 28 trái với §1 dòng 45.
- **Sự thật (mã):** hôm nay đơn do tài khoản Đối tác tự lập có bên đặt là khách (hồ sơ có sẵn, hoặc hồ sơ mới mang vai `CUSTOMER` do `resolveBooker` tạo — `src/modules/orders/service.ts:400-410`), hoặc trống. Vai `CUSTOMER` thuộc nhóm `OTHER`, mà view `v_pty_open_role_group` chỉ trả nhóm `INTERNAL`/`EXTERNAL` (`migrations/0024_vai_quyen_mac_dinh.sql:26-30`). Vì vậy cả hai lớp chặn (`src/modules/orders/hoan-tat-repo.ts:16`, `:76`; `src/modules/billing/rules.ts:458-460`) **không** chặn các đơn này: chúng bấm "Đã giao" được, tính như khách lẻ (phép thử 3 ở trên, dòng "khách" = 0). Hiện chỉ đơn nhân viên lập với bên đặt là cá nhân mang vai bên ngoài mới bị chặn. Đợt 1 (§7 dòng 160: máy chủ đặt bên đặt = hồ sơ của tài khoản Đối tác) mới là bước **tạo ra** lệnh chặn cho đơn Đối tác tự lập (dòng "Công ty lữ hành" = 1).
- **Hậu quả nếu không sửa:** chủ chấp nhận "khoảng chờ" vì tưởng đây là hiện trạng, trong khi thực ra đợt 1 làm dừng một luồng đang chạy được. Từ lúc đợt 1 lên tới khi đợt 2 lên, mọi đơn Đối tác tự lập sẽ kẹt ở "Đã giao", nên không "Hoàn thành" được và sổ của đơn treo. Nếu chủ định mời đại lý thật dùng thử sau đợt 1 (vì đã thấy được hoa hồng), quyết định sẽ khác.
- **Đề xuất (không tự sửa):** viết lại câu cho đúng, ví dụ: "Hôm nay đơn đại lý tự lập vẫn bấm Đã giao được (bên đặt đang ghi là khách, tính như khách lẻ, không hoa hồng). Sau đợt 1, bên đặt của các đơn này là chính đại lý, nên chúng bị giữ ở Đã giao cho tới đợt 2." Kèm hai phương án cho chủ chọn:
  - (a) Chấp nhận khoảng chờ, vì hiện chỉ có dữ liệu thử. Đây là khuyến nghị hiện tại của người soạn.
  - (b) Dời riêng phần "tài khoản Đối tác ⇒ bên đặt = chính mình" sang đợt 2. Như vậy đơn Đối tác tự lập vẫn bấm Đã giao được như hôm nay, vẫn tính như khách lẻ; lô Xác nhận vẫn chụp, nhưng bản chụp ghi "không người hưởng" (`NONE`). Đánh đổi: sang đợt 2, các đơn này phải vào danh sách "cần chuyển bên đặt" rồi chụp lại, nên danh sách đơn cũ của đợt 2 dài thêm. Đơn nào đã "Đã giao" trong khoảng chờ thì bị khoá, không chụp lại được; muốn trả hoa hồng cho đơn đó phải ghi phiếu điều chỉnh.

## Phát hiện NHỎ (không chặn; đánh dấu * là nên sửa trước khi lập kế hoạch)

**N1\* — Tài khoản lai Đối tác + nội bộ (§7 dòng 176, §14 dòng 237): hệ quả bị giấu.** Đặc tả ghi "tài khoản lai cũng theo luật trên, đúng chữ ADR-0077 điều 3 (i)". Sự thật: trigger LC-1 (`migrations/0024_vai_quyen_mac_dinh.sql:75-79`, tạo lại ở `migrations/0037_tai_xe_doi_tac.sql:10-15`) không cho tài khoản có hồ sơ mang vai bên ngoài giữ quyền nội bộ (phép thử 4). Vì vậy hồ sơ của tài khoản lai không bao giờ mang vai được hưởng. Áp luật này thì mọi đơn tài khoản lai lập sẽ có bên đặt = hồ sơ của chính nhân viên đó, ra `NONE` (không hoa hồng), và tài khoản lai mất cách gắn hồ sơ khách. Trang đơn sẽ hiện "Hồ sơ khách: <tên nhân viên>". Luật không đem lại gì mà làm mất một chức năng. Đề xuất: nói rõ hệ quả này cho chủ, hoặc thu hẹp luật thành "chỉ ghi đè bên đặt khi hồ sơ của tài khoản mang vai được hưởng; còn lại giữ như hôm nay". Cách thu hẹp lệch chữ ADR-0077 (i), nên phải để chủ duyệt. Chưa kiểm: LC-1 chỉ canh lúc chèn quyền, chiều "gán vai bên ngoài sau khi đã có quyền nội bộ" tôi chưa rà trong mã.

**N2\* — §8 dòng 182 "Ngày mặc định vẫn là `vnToday()` … luồng thường không bao giờ gặp lỗi này": sai với chi phí xe thuê.** Ngày mặc định của dòng điều chỉnh chi phí chuyến là **ngày chạy** hoặc **ngày huỷ**, ADR-0095 Q4 ghi rõ "KHÔNG dùng 'hôm nay'" (`src/modules/van-chuyen/tien-xe.ts:104-111`, dùng ở `src/modules/van-chuyen/tien-xe-chi-phi.ts:108`). Dòng chụp giá tự động cũng mang ngày chạy (`src/modules/van-chuyen/tien-xe-lo.ts:102-103`, tham số `kh.chup.ngayChay`). Sau khi khoá tháng 10, ghi điều chỉnh cho một chuyến chạy ngày 31/10 mà để ngày mặc định sẽ nhận 409. Chụp lại giá cho chuyến còn "lập kế hoạch" có ngày chạy trong tháng đã khoá thì làm rơi cả lô đang chứa nó. Đề xuất: trong đặc tả hoặc kế hoạch, ghi luật "tháng của ngày mặc định đã khoá thì dùng hôm nay" (cùng tinh thần `ngayGhiDao`, ADR-0080 đ5), hoặc chấp nhận 409 kèm hướng dẫn; đồng thời sửa câu "không bao giờ".

**N3\* — §5 dòng 114 "khuôn lính gác của dự án" có thể buộc nới hàng rào thứ tư.** Khuôn lính gác ghi trong luật là `wonGuard` đọc `audit_log` (`src/CLAUDE.md:28`). Ở tệp nửa nghiêm của `orders`, mỗi câu đọc `audit_log` phải có tên trong danh sách nợ `DOC_AUDIT_LOG_WONGUARD` (`src/architecture.test.ts:164-180`). Thêm tên vào đó là NỚI hàng rào (Điều 9.4), ngoài "chỉ đúng ba mục" của §10 dòng 194. Đề xuất: ghim cách không cần nới là nối chuỗi `changes() > 0`, như câu nhật ký trong `confirmOrder` (`src/modules/orders/repository.ts:1021-1025`). Không nên gác bằng `confirmed_at = ?at`: hai lệnh xác nhận đọc cùng `updated_at` sẽ nhận cùng mốc từ `nextStamp`, nên lệnh thua vẫn qua lính gác đó và chỉ bị trigger "một bản hiện hành" chặn, trả 500 thay vì 409 RACED. Nếu vẫn chọn `wonGuard` thì liệt kê thành mục nới thứ tư để chủ duyệt.

**N4\* — `R-ORD-T1` (§9 dòng 190) tự tắt đúng lúc cần.** Mốc = "bản chụp AUTO sớm nhất + 15 phút; chưa có bản chụp nào thì không xét". Nếu mã chụp không chạy (đúng loại lỗi bất biến này phải bắt) thì không bao giờ có bản AUTO, nên bài kiểm xanh mãi. Thêm một lỗ vận hành: nếu hoàn tác (rollback) Worker về mã cũ sau khi đã có bản chụp, các đơn mã cũ xác nhận sau mốc sẽ báo **lỗi** và đỏ mãi tới đợt 2 (đợt 1 không có chụp bù); runbook (§13) chưa nhắc. Đề xuất: neo mốc lỗi vào thời điểm migration (tiền lệ bảng mốc `bil_audit_cutoff`, `migrations/0080_bil_khong_doi_dau.sql:34-48`, hoặc `created_at` của dòng `prc_supply_term` gieo sẵn) cộng một khoảng ân hạn dài hơn quãng migration → deploy. Giữ "AUTO đầu + 15 phút" để chia vùng cảnh báo. Thêm ca kiểm "có đơn xác nhận sau mốc migration + ân hạn mà không có bản chụp AUTO nào ⇒ lỗi", và một dòng runbook về hoàn tác. Thêm một lưu ý: khung thử e2e chèn thẳng đơn `confirmed` bằng SQL sau bản chụp đầu sẽ làm `audit-invariants` cuối e2e đỏ.

**N5\* — Câu báo lý do giữ "Đã giao" sẽ hiện sai sau đợt 1 (mục 4 của việc kiểm).** `src/modules/billing/rules.ts:459`: "Đơn của đối tác (có người hưởng hoa hồng) — chưa bấm Đã giao được cho tới khi có phần hoa hồng.", người xử lý "Văn phòng". Sau đợt 1 đã có khối "Phần đối tác", và Văn phòng không làm gì được để gỡ. Bảng §7 dòng 170 ghi "giữ nguyên". Đề xuất: đổi chữ trong đợt 1 (không đổi luật), ví dụ "… chưa bấm được cho tới bản cập nhật sổ đại lý (đợt 2)".

**N6 — `O_GHI_TIEN` (§6 dòng 156).** ADR-0090 đ0 liệt kê **đúng bốn** ô (`docs/adr/ADR-0090-tai-khoan-quyen-tien-chi-toan-quyen.md:22-24`), và bài `src/shared/permissions.test.ts:502` ghim đúng bốn ô đó. Thêm `ledger.period.close` tức là đổi danh sách của một ADR đã duyệt, dù theo chiều siết và `MA_QUYEN_TIEN` không đổi. Đặc tả đang trình bày việc này như "áp ADR-0090". Đề xuất: bỏ bước này, hoặc ghi rõ là đề xuất bổ sung ADR-0090 để chủ duyệt.

**N7 — Ví dụ A-5 (Phần A dòng 31) không thử được luật "nửa lên".** Phần lẻ ,875 lớn hơn nửa, nên mọi cách làm tròn tới số gần nhất đều ra 125.000. Ví dụ chỉ phân biệt "gần nhất" với "xuống". Phép tính A-5 đúng (999.999 × 1250 / 10000 = 124.999,875). Đề xuất: thêm một ca đúng ,5, ví dụ 12,5% × 1.000.004 = 125.000,5, ra 125.001 nếu nửa lên và 125.000 nếu nửa chẵn.

**N8 — Lý do của điều cần quyết A2 (Phần A dòng 32) dựa trên điều không kiểm được.** Câu "Quản trị cài xe đón cho cả tour có đón tại khách sạn … như vé i-resort trong ví dụ đã duyệt": `vc_leg_template` không có dòng gieo nào (`migrations/0059_mau_chang.sql`, chỉ `CREATE TABLE`), và các ví dụ B-1…B-5 của ADR-0078 không nhắc xe đón. Lý do kiểm được, đủ để loại cách "dịch vụ có cài xe đón", là ADR-0078 đ4 (`docs/adr/ADR-0078-dieu-khoan-cung-ung-va-nha-cung-cap.md:55`): đọc `van-chuyen` từ `pricing` là cạnh mới, trái ADR-0040 D1, nên phải dùng nhóm dịch vụ của `catalog`. Đề xuất: thay lý do. Nên nói thêm một câu đánh đổi: dịch vụ nhà cung cấp có kèm xe Tour Đảo đưa đón vẫn mang a% trên cả phần xe, nên tinh thần X3 chỉ được giữ ở nhóm "Thuê xe". Mã `SB*` thuộc `TXE` đã kiểm đúng (`migrations/0055_nhom_dich_vu.sql:87-88`).

**N9 — Đơn Đối tác không còn tạo hồ sơ khách mới (Phần A, §7).** Hôm nay form Đối tác có thể gửi `newBooker`, khi đó máy chủ tạo hồ sơ cá nhân mang vai `CUSTOMER` cho khách (`src/modules/orders/service.ts:400-410`). Đợt 1 bỏ qua bên đặt do trình duyệt gửi, nên khách của đại lý chỉ còn ở cột chụp tên/SĐT, không có hồ sơ. Quan hệ "khách của <đối tác>" (`CUSTOMER_OF`, ADR-0018 điều 10) chưa có trong mã (tìm trong `src`, `migrations`, `web` không ra kết quả nào). Thay đổi này có thể chấp nhận được, nhưng Phần A nên nói một câu để chủ biết.

**N10 — Phần A gọi cột tiền là "Giá niêm yết".** Ở ADR-0077 ví dụ A-1 cột này là "Thành tiền (trước giảm)" (`docs/adr/ADR-0077-chinh-sach-hoa-hong-va-chup-luc-xac-nhan.md:135`). §4 dòng 109 tính giá đại lý trên thành tiền dòng. Nhân viên được đặt giá khác danh mục (R2/R3 chỉ khoá Đối tác — `src/modules/orders/price-guards.ts`), nên "giá niêm yết" có thể khác số thật dùng để tính. Đề xuất đổi thành "Thành tiền".

**N11 — Phần A "Kế toán có hai bảng mới", "Kế toán ghi mức tay".** Theo ma trận §6, Quản trị và Toàn quyền cũng sửa được cả hai bảng và ghi mức tay. Không sai nghĩa, nhưng nên ghi đủ.

**N12 — Tiêu chí 10 lệch ADR-0080.** Đặc tả ghi "khoá tháng hiện tại ⇒ 409", còn ADR-0080 tiêu chí 3 ghi "Khoá tháng hiện tại / tương lai ⇒ 400 (mã)" (`docs/adr/ADR-0080-quyet-toan-thang-va-khoa-ky.md:156`). Đặc tả cũng thiếu ca "tháng tương lai". Ngoài ra tiêu chí 4 thiếu ca "sửa/xoá `ky_period_close` ⇒ chặn" và "khoá trùng ⇒ khoá chính chặn" của cùng tiêu chí ADR.

**N13 — Bảng kiểm trước khi khoá (§8 dòng 184) bớt một mục của ADR-0080 đ4.** Mục bị bớt là "đơn Đã giao thiếu dòng giá vốn (R-BIL-2 cảnh báo)" (`ADR-0080…:67`). Bớt là hợp lý vì R-BIL-2 chưa áp dụng (`scripts/audit-checks.mjs:1218`), nhưng nên ghi lý do để không thành sót lặng lẽ.

**N14 — Nhật ký của route bảng mức và điều khoản chưa được nêu tên.** ADR-0077 đ12 đặt tên `prc_commission_rule_added`, `prc_commission_rule_closed` (`ADR-0077…:90`). Đặc tả chỉ nêu nhật ký của phần chụp (§5) và `ledger_period_closed` (§8). Đề xuất liệt kê đủ, kể cả hai hành động thêm/đóng điều khoản cung ứng.

**N15\* — Đơn xác nhận TRƯỚC đợt 1 khi đổi bên đặt hoặc ghi mức tay chưa có luật.** §5 dòng 115 nói đổi bên đặt sau xác nhận thì "chụp lại mọi dòng theo … bảng ở ngày đổi". Áp vào đơn cũ chưa có bản chụp, bước này tự tạo bản chụp **đầu tiên** theo bảng hôm nay, tức là chụp bù trước, giành mất việc chụp bù theo C4 = A (theo mức ở **ngày xác nhận**, Kế toán bấm — đợt 2) và lệch thứ tự ở tiêu chí 7 của ADR-0077 (`ADR-0077…:188`: "Văn phòng chuyển bên đặt … + Kế toán chụp bù"). Ghi mức tay (§5 dòng 116): "phần không gửi chép từ bản hiện hành", nhưng đơn cũ không có bản hiện hành. Đề xuất: nêu luật rõ, ví dụ đơn chưa có bản chụp thì đổi bên đặt không chụp, còn ghi mức tay phải gửi đủ hai phần; hoặc chấp nhận có ghi lại.

**N16 — "Phát hành chung một bản" của các ADR.** ADR-0077, 0078, 0080 dòng 6 đều ghi phát hành chung một bản với A–E. Lời chủ 8/10 (ba đợt) thay câu này. Đặc tả có dòng "Lộ trình" nhưng chưa nói rõ đó là thay câu nào. Hạn "khoá kỳ cùng bản với D4/D5" (ADR-0026, ADR-0057 L-T1) vẫn được giữ, vì khoá tháng lên ngay đợt 1. Đề xuất thêm một dòng ghi việc thay câu cho hồ sơ.

**N17 — Đổi công ty chủ làm dòng điều khoản gieo sẵn lệch.** Dòng `ALL` gieo sẵn trỏ người bán = công ty chủ **lúc migration**. Nếu sau này đổi công ty chủ (đường có thật, ADR-0024 6.4, `migrations/0030_ho_so_cong_ty_chu.sql:54-64`), dòng này có người bán ≠ công ty chủ mà không có a%, nên `R-PRC-3` (§9) báo lỗi và mọi bản chụp mới ghi người bán là công ty cũ. Chuyện hiếm (CLAUDE.md §10 đã cảnh báo đổi công ty chủ), nhưng nên ghi vào rủi ro hoặc thành một ruling.

**N18 — Lỗ HC-5.19 (chưa diễn tập khôi phục) chưa được nêu.** Dòng 7 liệt kê bốn lỗ đang hở. Đợt 1 thêm một thao tác một chiều (khoá tháng không mở lại); khoá nhầm thì chỉ còn đường khôi phục Time Travel, mà đường này chưa từng diễn tập (`docs/quyen-hoan.json`, mục `HC-5.19`, hạn 2026-10-31). Đề xuất nêu ở §13 (rủi ro) hoặc ở dòng "xây trên lỗ đang hở".

## Điều đặc tả làm đúng (đã kiểm bằng mã thật)

**Ví dụ số.** A-1: 2.000.000 × 12% = 240.000; 3.000.000 × 15% = 450.000; 1.000.000 × 10% = 100.000; cộng 790.000; 6.000.000 − 790.000 = 5.210.000. Khớp ADR-0077:133-140. Nhóm "Du thuyền" (`DTH`) có thật (`migrations/0055_nhom_dich_vu.sql:53`). A-5 tính đúng (xem N7 về khả năng phân biệt).

**Bảng ô quyền (§6), 7/7 hàng khớp ADR.** Thứ tự cột khớp `PERMISSION_CODES` (`src/shared/permissions.ts:5`). Bốn hàng khớp ADR-0077:94-99, hai hàng khớp ADR-0078:76-79, một hàng khớp ADR-0080:84-86; cột `HR` = `none` ở cả bảy, đúng ADR-0071. `order.terms.view` trùng đúng hàng `money.view` (`permissions.ts:75`); `SUPER_ADMIN` = `any` ở mọi ô (ADR-0014 đ2). Bài tập con 2^10 = 1024 đúng với 10 quyền. `order.trip.edit` cột PARTNER = `none` (`permissions.ts:80`), nên Đối tác không tự đổi bên đặt sau xác nhận được; không có đường lách hoa hồng.

**Khẳng định về mã ở §1, §7, đều đúng:**
- `confirmOrder` gửi một `db.batch` ba câu: điền ngày chặng → `UPDATE orders` (quyết định thắng thua, `results[1]`) → nhật ký `changes() > 0` (`src/modules/orders/repository.ts:1010-1026`). Tiền lệ `alsoCreate` ở `repository.ts:889-899`, `:933`.
- `resolveBooker` chỉ nhận cá nhân, câu "Chưa gắn được đại lý vào đơn ở bản này." (`src/modules/orders/service.ts:383-398`); `BOOKER_VALUE` chỉ `PERSON` (`repository.ts:786`). Đổi bên đặt qua `PUT /api/orders/:id/booker`, ô `order.trip.edit` (`src/modules/orders/index.ts:997-1018`).
- Hai lớp chặn "Đã giao": `src/modules/billing/rules.ts:435-460` (mã `booker_partner`), `src/modules/orders/hoan-tat-repo.ts:16`, `:72-76`.
- `changeBooker` ghi `customer_name`, `customer_phone` lấy từ thân yêu cầu cùng lúc với bên đặt (`repository.ts:1384-1402`). Thân bắt buộc có tên + SĐT (`validateBookerChange`, `src/modules/orders/rules.ts:213-222`), bảng đổi khách luôn gửi kèm (`web/booker-sheet.ts:80-82`).
- `web/booker-picker.ts` tra theo SĐT (`:62`) và điền tên hồ sơ vào ô tên khách (`:73-74`). Lý do không dùng ô này để chọn đại lý là đúng.
- Biên nhận lấy `customerName` của đơn, không đọc bên đặt (`src/modules/receipt/rules.ts:14`).
- `ngayGhiDao(goc, { homNay, kyDaKhoa? })` có ở `src/modules/van-chuyen/tien-xe.ts:100-102`. Ba nơi gọi (`tien-xe-chi-phi.ts:140`, `tien-xe-lo.ts:66`, `:87`) hôm nay đều **không** truyền `kyDaKhoa`, nên kế hoạch phải sửa đủ ba nơi.
- `O_GHI_TIEN` / `MA_QUYEN_TIEN` (`permissions.ts:221-222`): đúng là danh sách cố định và suy từ đó (xem N6).
- Bốn bảng có `occurred_date`: `bil_payment_receipt` (`0045:79`), `bil_posting` (`0045:100`), `bil_outside_refund` (`0079:50`), `vc_trip_cost_line` (`0073:48`). Không bảng nào khác trong `migrations/` có cột này. Dòng xác nhận/từ chối hoàn ngoài lấy ngày hôm nay (`src/modules/billing/coc.ts:373`), nên không kẹt khi tháng của dòng ghi đã khoá.
- `SB16D`, `SB7D`, `SB4D`, `SB16T`, `SB4T`, `SB7T` thuộc `TXE` "Thuê xe"; "Buýt City Tour" là nhóm `BUS` riêng (`0055:60-61`, `:87-88`).
- `vc_leg_template` chỉ có `CREATE TABLE`, không có dòng gieo trong bất kỳ migration nào.
- Vai `SUPPLIER` chưa có; năm vai được hưởng có ở `0024`. Ô "thêm vai" của hồ sơ tự liệt kê các vai nhóm `OTHER` đang dùng (`src/modules/parties/repository.ts:119`), nên gieo `SUPPLIER` `active = 1` là gán được, không cần sửa màn.

## Mục 4 — Chỗ đọc bên đặt (`booker_party_id`, `bookerPartyId`, `bookerName`, `booker_name`)

Kết quả tìm trong `src`, `web`, trừ tệp test: `src/modules/orders/hoan-tat-repo.ts`, `index.ts`, `nguoi-dat-gop-repo.ts`, `repository.ts`, `rules.ts`, `src/shared/booker.ts`, `src/shared/contracts.ts`, `web/booker-sheet.ts`, `web/order-form.ts`, `web/order.ts`. Trong `migrations/`, chỉ `0018` (cột) và `0044` (khoá sau Đã giao) nhắc cột này; không view công bố nào đưa bên đặt ra module khác. Nhận định "Trợ lý, Bảng tin, thông báo, QR thanh toán không đọc bên đặt" đúng. Bảng §7 phủ đủ các tệp. Có hai điểm cần thêm:
- Chỗ hiện sai sau đợt 1: câu báo `billing/rules.ts:459` (N5). Tệp này không có trong kết quả tìm vì đọc qua cờ `coNguoiHuong` lấy từ `GIAO_STATE` (`hoan-tat-repo.ts:16`).
- `web/order-form.ts:522` nạp bên đặt đang lưu vào ô tra theo SĐT. Khi nhân viên mở nháp có bên đặt là đại lý, form phải nạp vào ô "Đặt qua đối tác" thay vì ô tra SĐT. Nên thành một ca trong kịch bản Chrome.

## Mục 5 — Khả thi so với luật kiến trúc

- Thân trigger của `orders` đọc `v_prc_*` hợp lệ: cạnh `orders → pricing` đã khai (`src/architecture.test.ts:47`), tiền tố view `prc` đã có (`:188`), luật thân trigger cho đọc view của module được phụ thuộc (`:1036-1050`).
- Thân trigger của `pricing` đọc `v_pty_open_role`, `v_pty_owner_company` hợp lệ (cạnh `pricing → parties`, `:51`). Đọc `v_ctl_service_group` cần thêm `ctl` vào `VIEW_PREFIX`, việc này nằm trong mục nới 2 đã duyệt (C12). Trigger `billing`/`vc_` đọc `v_ky_closed_period` nằm trong mục nới 1 và 3.
- `BOOKER_VALUE` đọc danh sách vai được hưởng của `pricing` từ SQL của `orders` hợp lệ nhờ cạnh `orders → pricing`. Chữ `v_pty_open_role` không rơi vào bài R-N1-12, vì bài này chỉ bắt chuỗi `pty_party_role` (`:548-553`).
- Chỗ có thể vượt "chỉ đúng ba mục nới": lính gác của các câu chụp (N3). Không thấy chỗ nào khác.

## Mục 6 — Mốc `R-ORD-T1`

Lập luận chính (mã cũ không bao giờ chụp, mã mới luôn chụp trong cùng lô, nên đơn mã cũ xác nhận trong quãng migration → deploy đều rơi trước bản chụp đầu) là đúng. `confirmed_at` được đặt bằng đúng mốc của lô (`chang-hanh-khach-repo.ts:366`). Ba lỗ: tự tắt khi không có bản AUTO nào; hoàn tác Worker làm đỏ kéo dài; khung thử e2e chèn đơn `confirmed` thẳng bằng SQL (chi tiết và đề xuất ở N4). Thêm một điều: đổi bên đặt trên đơn cũ cũng sinh bản chụp đầu (N15), có thể làm mốc sớm hơn dự tính. Việc này vô hại cho bài kiểm, nhưng nên biết.

## Không kiểm được (và vì sao)

- Lời chủ trong chat 2026-10-08: coi là sự thật như được giao, không đọc được.
- Dữ liệu production: có tài khoản lai Đối tác + nội bộ nào không (N1); Quản trị đã cài mẫu đưa đón cho vé i-resort chưa (N8); hồ sơ gắn tài khoản các công ty lữ hành là cá nhân hay tổ chức. Tôi không chạy lệnh nào lên D1 thật.
- `npm run test:e2e` và kịch bản Chrome: không chạy, vì nhánh chưa có mã và e2e cần mạng.
- Chiều "gán vai bên ngoài cho hồ sơ đã có quyền nội bộ" của LC-1: chưa rà trong mã `parties`/`roles.ts`.
