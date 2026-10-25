# Đặc tả máy chủ — Hoa hồng đối tác + Hỗ trợ (thiết kế lại 25/10/2026)

**Trạng thái: chờ chủ duyệt** (sau QA1). Nguồn: `BAN-GIAO.md` mục 5 và 6 (chủ duyệt 25/10). Đặc tả giao diện: `DAC-TA.md`. Quyền: `DE-XUAT-ADR-cong-tim-nguoi-huong.md`. Trang ghép: `TRANG-GHEP.md`.

- **Việc lớn** (quyền, tiền — mức hoa hồng, dữ liệu): thi công xong phải có người kiểm độc lập chỉ đọc.
- **Không migration.** Không bảng, cột, trigger mới. Mọi thay đổi là route mới hoặc trường thêm vào phản hồi cũ.
- **Phát hành trước giao diện, độc lập.** Giao diện cũ vẫn chạy với máy chủ mới: các thay đổi đều là *thêm* (trường mới, tham số tuỳ chọn, cổng rộng hơn, `code` thành tuỳ chọn). Hoàn tác: `wrangler rollback`.
- **Xây cạnh lỗ đang hở:** HC-4.2, TNV-G4 (sổ tiền, hạn 30/11) — đặc tả này không chạm đường ghi sổ tiền hay bản chụp `ord_service_terms`.
- Chỗ đặc tả này **khác** bàn giao: ghi «Lệch bàn giao» kèm lý do ngay tại chỗ.

## A. Hoa hồng (`src/modules/pricing`)

### A1. Nới cổng tìm người hưởng — `GET /api/pricing/nguoi-huong`

Theo đề xuất ADR (Đ1, Đ2): cổng `(order.create || partner.commission.write) && !holdsPartner`, một hàm dùng chung ở `src/shared/` mà route gọi. `coTheTimDoiTac` (`src/shared/hoa-hong-hien-thi.ts`) gọi lại hàm đó. `coODatQuaDoiTac` (`src/shared/phan-doi-tac-hien-thi.ts`) **giữ nguyên** — **lệch bàn giao 5.1** (bàn giao bảo gom hai hàm): hàm đó còn quyết ô «Đặt qua đối tác» trên trang chi tiết đơn (`web/order.ts`), Kế toán mở được trang đơn, gộp lại thì Kế toán thấy ô đổi bên đặt. Phản hồi, giới hạn 20 dòng, SQL `TIM_HUONG` không đổi.

### A2. Tra theo loại — `GET /api/pricing/thu-tra?loai=<code>`

- Nhận **đúng một** trong hai: `doiTac=<partyId>` (như nay) hoặc `loai=<mã loại>` (mẫu như mã vai). Có cả hai hoặc không có cái nào → 400 «Chọn một đối tác hoặc một loại đối tác, dịch vụ và ngày hợp lệ.» Cổng như nay (`partner.commission.view`, chặn `holdsPartner`).
- `loai` phải nằm trong danh sách loại được hưởng **đang bật** (cùng nghĩa `dangBat` của `GET /api/pricing/loai-doi-tac`). Không có hoặc đã tắt → 400 «Loại đối tác này không có trong danh sách được hưởng hoa hồng hoặc đã tắt.»
- Tính: gọi `docBangChoChup` với `bookerPartyId: null` — hàm **đã** nhận giá trị này (bỏ đọc vai và `ganRieng`, vẫn đọc mức, gắn loại↔chính sách và nhóm ở `ngay`; đã đọc mã 25/10), không cần biến thể mới; bỏ `nguoiHuong` hàm trả về, gọi **cùng** `chonMuc` với người hưởng dựng sẵn `{ loai: "HUONG", partyId: <chuỗi không khớp hồ sơ nào>, vai: [loai] }` và `ganRieng: []`. Nhờ vậy bậc 1–3 và 10–12 không bao giờ khớp, chỉ còn bậc 4–9; không viết luật chọn mức thứ hai.
- Phản hồi `ThuTraResponse` thêm trường tuỳ chọn `theoLoai?: { code: string; ten: string }` (có khi tra theo loại). `nguoiHuong` = `{ loai: "HUONG", vai: [code] }`. `ketQua` như nay (NONE không xảy ra khi tra theo loại; SET với `bac` 4–9; MISSING với `lyDo` của `NHAN_LY_DO_THIEU`, ví dụ xung đột mức ở cùng bậc).
- Không trả dòng về nhì, không trả cờ «bị che».

### A3. «Đổi» một bước — dòng mức (mức riêng, dòng của chính sách)

`POST /api/pricing/hoa-hong/:id/doi`, ô `partner.commission.write`, chặn `holdsPartner`. Một route cho cả dòng mức riêng (đích loại hoặc đối tác) lẫn dòng của chính sách (đích mức TA), vì chúng cùng bảng `prc_commission_rule` và cùng route đóng `/:id/dong` hôm nay.

- **Thân:** `{ kieu, tyLeBp? | moiKhach?, theoLoai?, tuNgay, denNgay?, ghiChu? }` — cùng luật kiểm như phần tương ứng của `kiemThanMuc` (kể cả ADR-0133: ba số theo loại khách đều bắt buộc khi tách). **Đối tượng, phạm vi, dịch vụ/nhóm KHÔNG nhận từ thân**: chép từ dòng cũ ở máy chủ (trigger chống chồng xét «cùng đối tượng, cùng phạm vi»; đổi phạm vi không còn là đổi mức mà là thêm mức khác).
- **Điều kiện, sai thì 400 tiếng Việt (không ghi gì):**
  - dòng cũ tồn tại (không → 404), và `valid_to_date IS NULL` — trigger `prc_commission_rule_close_only` chỉ cho đóng **một lần**, dòng đã có ngày kết thúc thì không đổi được: «Dòng này đã có ngày ngừng nên không đổi được. Thêm mức mới bắt đầu sau ngày ngừng.»
  - `tuNgay` là ngày hợp lệ và `tuNgay ≥ hôm nay` (giờ Việt Nam, `vnToday`): «Ngày bắt đầu của mức mới không được trước hôm nay.»
  - dòng cũ **đang áp dụng**: `valid_from_date ≤ hôm nay` — dòng sắp áp dụng không đổi được qua máy chủ, khớp nút giao diện (QA1 mục 3): «Mức này chưa tới ngày áp dụng nên không đổi được.»
  - `valid_from_date` của dòng cũ `< tuNgay` (để dòng cũ đóng được tới ngày liền trước): câu mới mở rộng `CAU_DOI_MUC_TRONG_NGAY` — «Mức cũ bắt đầu từ <ngày> nên không đổi được từ ngày <tuNgay>. Dùng Ngừng cho mức cũ, rồi Thêm mức mới.»
  - mức mới khác mức cũ (cùng kiểu, cùng số, cùng ba số theo loại khách) → «Mức mới giống hệt mức cũ.» *(người soạn thêm, để khỏi sinh dòng thừa.)*
- **Một `db.batch`, thứ tự cố định:**
  1. `UPDATE prc_commission_rule SET valid_to_date = <tuNgay − 1 ngày>, updated_* … WHERE id = ? AND valid_to_date IS NULL`;
  2. `INSERT … SELECT … WHERE changes() > 0` — dòng mới chép đối tượng/phạm vi/dịch vụ từ dòng cũ, `valid_from_date = tuNgay`. **Bắt buộc có điều kiện**: nếu người khác vừa đóng dòng cũ (câu 1 không đổi gì) mà câu 2 vẫn chèn, trigger chống chồng **không** bắt được (dòng cũ đóng sớm hơn) và sinh ra một dòng không ai muốn;
  3. hai câu nhật ký, cũng `changes() > 0`, dùng lại hai hành động hiện có `prc_commission_rule_closed` rồi `prc_commission_rule_added` (chi tiết ghi «đổi mức», mã dòng cũ/mới; không tên liên hệ).
  Sau lô: `res[0].meta.changes === 0` → 409 `stale` («Dòng này vừa được người khác ngừng hoặc đổi. Tải lại trang.»). Lỗi trigger → câu của `loiBang` như nay.
- Một lô duy nhất ⇒ **không** vào `GHI_NHIEU_LAN`; vé chống ghi trùng (ADR-0094) tự gắn ở router.
- **Phản hồi 200:** `{ cu: CommissionRuleDto, moi: CommissionRuleDto }`.
- **Đơn đã xác nhận không đổi** (ADR-0117 điều 7): bản chụp giữ mức cũ. Đổi từ hôm nay ⇒ đơn đã chụp sáng nay trỏ dòng nay có ngày ngừng là hôm qua; trigger bản chụp chỉ kiểm lúc chèn, không có bất biến nào (`scripts/audit-checks.mjs`) so lại sau — đã kiểm 25/10. Hành vi này giống hệt cách làm tay hôm nay («ngừng tới hôm qua rồi thêm từ hôm nay»).

### A4. «Đổi chính sách» của một loại — `POST /api/pricing/muc-ta/gan/:id/doi`

Cùng khuôn A3 cho bảng `prc_role_tier` (trigger `prc_role_tier_close_only` cũng đóng một lần). Thân `{ muc, tuNgay }`; loại lấy từ gắn cũ. Điều kiện: gắn cũ đang áp dụng (`valid_from_date ≤ hôm nay`) và chưa có ngày kết thúc, `tuNgay ≥ hôm nay`, gắn cũ bắt đầu trước `tuNgay`, `muc` khác mức cũ và đang bật (trigger `prc_tier_inactive`). Lô: đóng gắn cũ tới `tuNgay − 1` → chèn gắn mới `WHERE changes() > 0` → hai nhật ký `prc_role_tier_closed`, `prc_role_tier_set`. Phản hồi `GanLoaiMucResponse` như route gắn hiện có — kèm `dongRieng` (cảnh báo vàng, không chặn).

**Không làm** «Đổi» cho chính sách riêng của đối tác (`prc_party_tier`, ADR-0138): màn đó ở Danh bạ, ngoài đợt (bàn giao mục 3, điểm e).

### A5. Liệt kê chính sách riêng theo đối tác — thêm vào `GET /api/pricing/muc-ta`

`MucTaListResponse` thêm `ganRieng: { id; partyId; ten; muc: string; tenMuc: string; tuNgay; denNgay: string | null }[]` — các dòng `prc_party_tier` có `valid_to_date IS NULL OR valid_to_date ≥ hôm nay`, tên đọc qua view `v_pty_party_label` (đọc xuyên module chỉ qua view). Không thêm route. Mức riêng của đối tác (bậc 1–3) đã có ở `GET /api/pricing/hoa-hong` (`doiTuong.loai = "DOI_TAC"`).

### A6. Không làm

«Lịch sử» của một dòng / một loại (nhật ký pricing chỉ có câu chữ, không có mã đích, và chỉ Toàn quyền đọc đủ — ADR-0131). Để đợt sau.

## B. Hỗ trợ (`src/modules/feedback`)

### B1. Sự kiện của một yêu cầu (ba loại đã lưu)

- `GET /api/feedback/:id` (chi tiết) thêm `suKien: FeedbackEventDto[]`; `GET /api/feedback/:id/messages?since=` thêm `suKien` có `at > since` (cùng mốc, cùng trần `MESSAGES_SINCE_LIMIT`), để luồng tự làm mới thấy «X đã nhận việc» mà không tải lại. **Lệch nhẹ bàn giao 6(a)** (bàn giao gợi route riêng `/events` *hoặc* gộp): chọn gộp — không thêm route, cùng cổng đọc phiếu `quyenPhieu(...).doc`, không đọc được ⇒ 404 như nay.
- `FeedbackEventDto = { id; loai: "CLAIMED" | "ASSIGNED" | "TEAM_CHANGED"; at; nguoi: string /* tên người làm */; tu: string | null; den: string | null }` — `tu`/`den` là **tên** (người xử lý cũ/mới, hoặc tên nhóm cũ/mới) do máy chủ đổi từ **id** (`from_value`, `to_value` lưu id nhân viên hoặc id nhóm, không phải mã nhóm). Người/nhóm không còn → tên vẫn đọc được từ bảng gốc (không xoá cứng).
- Ai thấy — **mặc định an toàn, chờ chủ ở câu Q2 của `DAC-TA.md`:** chỉ người **xử lý được** phiếu (`quyenPhieu(...).xuLy`: thành viên nhóm, Toàn quyền) nhận `suKien`; người gửi không xử lý nhận `suKien: []`. Lý do (QA1 mục 1): sự kiện mang cả người nhận việc **trước đó** và tên nhóm **cũ**, trong khi người gửi hôm nay chỉ thấy người và nhóm *hiện tại*; tài khoản bên ngoài (Đối tác, Tài xế đối tác — ADR-0119 điều 6 chỉ cho chọn nhóm Kỹ thuật) sẽ thấy tên nhân viên và nhóm nội bộ chưa từng thấy. Người gửi vẫn thấy «ai đang xử lý» qua `assigneeName` như nay. Bài kiểm: người gửi bên ngoài sau một lần chuyển nhóm và một lần giao lại → `suKien` rỗng. **Lý do chuyển nhóm không nằm trong sự kiện** (nó là ghi chú nội bộ gắn nhóm mới, vẫn lọc theo `TIN_CHO_NGUOI_XEM` như nay).
- Chỉ đọc bảng `fbk_ticket_event` (chỉ-thêm). Không thêm loại sự kiện (đổi trạng thái / ưu tiên cần ADR mới — ngoài đợt).

### B2. Hàng đợi — `GET /api/feedback/queue`

- `status` nhận **danh sách** phân tách bằng dấu phẩy (`status=NEW,ACK,IN_PROGRESS`); mỗi mã phải hợp lệ, danh sách rỗng hoặc mã lạ → 400 như nay. Một mã như nay vẫn chạy (giao diện cũ).
- `q` (tuỳ chọn, cắt 60 ký tự): lọc theo mã yêu cầu (`YC-0007`) hoặc tiêu đề, `LIKE` qua `mauLikeChua`. **Người soạn thêm** (bàn giao có «ô tìm» ở hàng lọc nhưng không nêu ở máy chủ): lọc trên máy chỉ tìm trong 50 dòng đã tải, sai khi > 50 yêu cầu.
- Phản hồi thêm `dem: { chuaAiNhan: number; cuaToi: number; tatCa: number }` — đếm theo **đúng** điều kiện `WHERE` của `LIST_QUEUE_TEAM` (nhóm, loại trừ phiếu do chính người xem gửi, người giữ không còn hiệu lực ⇒ «chưa ai nhận»), áp `status` và `q` đang chọn, **bỏ qua** `loc` (để ba nút lọc cùng hiện số). Bài kiểm: số đếm = số dòng thật khi tải hết với từng `loc`.
- Phân trang `limit`/`offset` như nay. `stats` (8 tuần) giữ nguyên — giao diện lấy tuần hiện tại từ đây cho dòng «Tuần này: N yêu cầu mới».

### B3. Tạo nhóm không cần mã — `POST /api/feedback/admin/teams`

- `code` thành **tuỳ chọn**. Có gửi → kiểm `TEAM_CODE_RE` như nay. Không gửi → máy chủ sinh từ `name`: bỏ dấu tiếng Việt (`đ/Đ` → `D`), chữ HOA, mọi chuỗi ký tự ngoài `A-Z0-9` thành một `_`, cắt `_` hai đầu, tối đa 40 ký tự; rỗng → `NHOM`. Một hàm thuần ở `src/modules/feedback/rules.ts` có bài kiểm (ví dụ «Kế toán – Công nợ» → `KE_TOAN_CONG_NO`).
- Trùng mã (với nhóm còn hay đã ngưng — `INSERT … WHERE NOT EXISTS code` hôm nay) → 409. Mã do người gửi: giữ câu cũ «Mã nhóm đã có.» (`index.ts`, nhánh `duplicate`). Mã máy sinh: câu mới «Đã có nhóm mang mã <MÃ> (tự đặt theo tên). Đổi tên nhóm khác đi một chút rồi thử lại.» Không tự thêm hậu tố. Bài kiểm có ca trùng với nhóm đã ngưng.

### B4. `mailPending` ở chi tiết cho mọi người xử lý

`detail()` (`src/modules/feedback/index.ts`) đổi `toTicket(t, can(who, "feedback.triage"))` thành `toTicket(t, q.xuLy)`. Hàng đợi đã trả trường này cho cùng nhóm người (`toTicket(r, true)` sau cổng `q.xuLy`), nên không lộ thêm. Người gửi không xử lý vẫn không thấy.

### B5. Không làm

Sự kiện đổi trạng thái / ưu tiên; chat thời gian thực; cột lý do từ chối (lý do đi vào luồng ở giao diện — `DAC-TA.md`).

## C. Sổ sách bài kiểm phải sửa cùng (đỏ có chủ đích)

| Bài | Đổi |
|---|---|
| `src/modules/pricing/co-the-tim-doi-tac.test.ts` (có sẵn) | đối chiếu `coTheTimDoiTac` với cổng route trên mọi tập quyền — **dây an toàn chính** của A1; phải xanh khi cả hai gọi cùng hàm, và đỏ khi sửa cố ý một bên |
| `src/architecture.test.ts` | chạy lại sau khi thêm route / đọc view `v_pty_party_label` từ pricing |
| `src/route-access.test.ts` | `SNAPSHOT` thêm hai route `POST /api/pricing/hoa-hong/:id/doi`, `POST /api/pricing/muc-ta/gan/:id/doi` (access `office`); hai số đếm 373 → 375 |
| `src/lan-gui-phu-route.test.ts` | số route ghi đã đăng nhập 226 → 228, kèm chú thích |
| `src/route-write-guard.test.ts` | hai route mới gọi `can(...)` trong thân và dùng kết quả |
| `src/so-dai-ly-quyen-route.test.ts` | thêm hai route mới (Tài xế, Tài xế đối tác, Nhân sự → 403); thêm ca Kế toán → 200 ở `nguoi-huong` |
| `src/shared/hoa-hong-hien-thi.test.ts` | `coTheTimDoiTac` nay đúng cho ACCOUNTING |
| `src/modules/pricing/*.test.ts` | ca A2 (tra theo loại: bậc 4–9, loại tắt 400, cả hai tham số 400), ca A3/A4 (thành công hôm nay và ngày tương lai; dòng cũ đóng đúng `tuNgay − 1`; từ chối khi dòng cũ bắt đầu từ `tuNgay`; dòng đã có ngày ngừng; **dòng vừa bị đóng → 409, không có dòng mới**), ca A5 |
| `src/modules/feedback/*.test.ts` | B1 (người gửi thấy ba loại, không thấy lý do chuyển nhóm; `since` lọc đúng), B2 (đếm khớp danh sách, nhiều trạng thái, `q`), B3 (sinh mã, trùng 409), B4 |

Mỗi hàng rào mới (cổng A1, câu chèn có điều kiện ở A3) phải được quan sát chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên) rồi ghi dòng vào `docs/SO-HANG-RAO.md`.

**Chữ của máy chủ theo bảng từ** («mức TA», «dòng riêng» trong câu báo ở `src/modules/pricing`; nhãn nhật ký «Đóng mức hoa hồng», «Gắn loại đối tác vào mức TA», «Kết thúc gắn…» ở `src/shared/audit-actions.ts`) **đi cùng PR giao diện**, vì dòng chặn của bảng từ thêm ở đó (`DAC-TA.md` mục C). Chỉ đổi chữ, không đổi mã hành động.

## D. Tiêu chí nghiệm thu máy chủ (kiểm được, trước khi làm)

1. Kế toán tìm đối tác theo tên → 200; Đối tác / lai → 403; Bán hàng, Thực tập không đổi (đề xuất ADR mục 5).
2. Tra theo loại trả bậc 4–9 và `theoLoai`; không bao giờ trả bậc 1–3 hay 10–12.
3. «Đổi» dòng mức và gắn chính sách: thành công từ hôm nay và từ một ngày tương lai, dòng cũ ngừng đúng ngày liền trước; bị từ chối bằng câu tiếng Việt ở các điều kiện A3 (kể cả dòng sắp áp dụng); hai người bấm cùng lúc → đúng một dòng mới, người sau 409; «Đổi» từ một ngày tương lai mà chồng với một dòng sắp áp dụng khác cùng đích, cùng phạm vi → cả lô không ghi, câu chống chồng của `loiBang`, dòng cũ **không** bị đóng.
4. `GET /api/pricing/muc-ta` có `ganRieng`.
5. Chi tiết và luồng làm mới của yêu cầu có `suKien` ba loại đúng thứ tự thời gian, tên đã đổi từ id, cho người xử lý; người gửi không xử lý (kể cả tài khoản bên ngoài) nhận `suKien` rỗng (theo Q2).
6. Hàng đợi lọc nhiều trạng thái, tìm theo mã/tiêu đề, `dem` khớp danh sách khi > 50 yêu cầu.
7. Tạo nhóm không gửi mã → 201 với mã sinh từ tên; trùng → 409 tiếng Việt.
8. Thành viên nhóm (không phải Toàn quyền) thấy `mailPending` ở chi tiết.
9. Giao diện **cũ** chạy đủ với máy chủ mới (kịch bản Chrome hoa hồng, hỗ trợ, form đơn hiện có xanh trước khi sửa giao diện).
10. `npm test`, `npm run typecheck` xanh; `npm run test:e2e` xanh (chạm API).
11. `docs/SYSTEM-DESIGN.md` sửa cùng commit: §7 dòng route `nguoi-huong` (cổng mới), các dòng route pricing / feedback có trường hoặc route mới; §9 dòng «Hoa hồng đối tác» (bỏ câu «Kế toán chưa có… Ruling 26») và dòng «Ô «Đặt qua đối tác»» (ghi rõ ô vẫn theo `order.create` dù route đã rộng hơn).
