# Đề xuất ADR-0115: Điều chỉnh sổ tiền cần người thứ hai duyệt; trần điều chỉnh tính cộng dồn

- **Trạng thái:** **proposed**, chờ chủ dự án chọn hai quyết định (Q1, Q2) và nói "duyệt". Soạn 13/10/2026 trên mốc `483b3aa0` (bản 1.90). Chưa có người kiểm độc lập đọc văn bản này.
- **Sửa/bổ sung:** ADR-0092 đ5 (đ5e "lượt này không làm luồng duyệt hai người"; đ5b "trần tính từng lệnh"). Không sửa thân ADR-0092; khi duyệt thì thêm dòng trỏ ở dòng trạng thái của nó.
- **Đóng:** mục `HC-4.2` trong `docs/quyen-hoan.json` (hạn 31/10/2026) và mục C-2 của hồ sơ kiểm 13/10 (`friendly-franklin-4c7098/docs/superpowers/specs/2026-10-13-kiem-toan-truoc-su-dung/phu-luc/C-tien-hoa-hong.md`).
- **Loại:** việc lớn (tiền, quyền, dữ liệu). Cần người kiểm độc lập, chỉ đọc, sau khi thi công.
- **Xây trên lỗ đang hở:** HC-4.2 (chính lỗ này; ADR này là bản vá của nó). Phần tin báo "người bị đổi số dư" dùng lại chỗ ADR-0092 Đ5d còn chờ (mục TNV-G4); thi công cùng đợt, không chờ riêng.
- **Hiến chương áp dụng:** hệ thống 4.2 ("bút toán do người lập được coi là một sự kiện khi có chứng từ, người duyệt và nhật ký"); dự án 5.1 (hai lớp chặn), 5.5 (chỉ-thêm), 5.8 (quyền theo vai trên đối tượng), 5.14 (ngày phát sinh, khoá kỳ), 6.1. **Một lệch hẹp cần chủ duyệt:** xem mục "Lệch có chủ ý" ở phụ lục.

## Phần cho chủ (đọc phần này là đủ)

**Chuyện gì đang xảy ra.** Hôm nay một Kế toán hoặc Toàn quyền gửi lệnh "điều chỉnh" là số dư công nợ của đơn đổi ngay, chỉ cần gõ lý do mười ký tự trở lên. Không ai khác phải đồng ý. Luật chung của hệ thống đòi người lập bút toán và người duyệt phải khác nhau. Hồ sơ kiểm 13/10 còn cho thấy một lỗi đi kèm: mức trần của lệnh chỉ tính từng lệnh một. Đơn phải thu 500.000, khách đã trả 300.000: hai lệnh "tăng nợ 500.000" đều qua, số dư thành 1.000.000, gấp đôi mức cho phép.

**Đề xuất.** Lệnh điều chỉnh không đổi số dư ngay nữa, mà thành một **yêu cầu chờ duyệt**. Người thứ hai (khác người tạo) xem, rồi bấm duyệt hoặc từ chối. Chỉ lúc duyệt số dư mới đổi, và máy kiểm lại mọi giới hạn ở lúc đó. Yêu cầu quá 7 ngày không ai duyệt thì tự hết hạn, không bao giờ tự duyệt. Người tạo rút lại được khi chưa ai duyệt. Mức trần được tính cộng dồn: mọi lệnh tăng nợ đã có trên đơn, cộng các yêu cầu đang chờ, cộng lệnh mới, không được vượt trần.

**Hai điều bạn chọn:**

*Q1. Ai được duyệt?*
- A (khuyến nghị): Toàn quyền, Quản trị hoặc Kế toán, miễn khác người tạo. Công ty một Kế toán và một chủ: Kế toán tạo thì chủ duyệt, chủ tạo thì Kế toán duyệt. Cần thêm một quyền mới "duyệt điều chỉnh sổ tiền" cho ba nhóm này; Quản trị chỉ thấy các yêu cầu chờ duyệt, không thấy cả sổ.
- B: Toàn quyền và Quản trị (như hoàn cọc). Chủ tạo mà chưa có Quản trị thì kẹt.
- C: Chỉ Toàn quyền. Mọi lệnh của Kế toán đều chờ một mình chủ.

*Q2. Áp cho lệnh nào?*
- A (khuyến nghị): Điều chỉnh công nợ và điều chỉnh chi phí chuyến xe, hai đợt thi công. Đóng hết mục HC-4.2.
- B: Chỉ công nợ; chi phí chuyến xin gia hạn, vì sổ hạn ghi cả hai nơi.
- C: Thêm đảo lần thu, đảo dòng, "Thay lần thu". Không khuyến nghị.

**Ảnh hưởng tới người dùng.** Kế toán không còn "sửa là xong ngay": phải nhờ người thứ hai bấm duyệt. Hôm nay màn hình chưa có nút điều chỉnh tay công nợ (tôi tìm trong mã giao diện, chỉ thấy đảo lần thu, thay lần thu và hoàn khách), nên lỗ hổng này hiện chỉ mở ở đường gọi thẳng vào máy chủ, người dùng thường chưa gặp. Chi phí chuyến xe thì có nút "Lưu điều chỉnh" ở màn chi tiết chuyến, nút này sẽ đổi thành "Gửi duyệt". Đường sửa nhầm "Công ty đã nhận" (đã duyệt ở ADR-0092 Đ2b: tăng nợ người khai rồi mới ghi Nộp) cũng phải chờ duyệt, nên chậm hơn.

**Rủi ro vận hành phải nói thẳng.** (1) Công ty khoảng 30 nhân viên, nếu chỉ có một Kế toán và một chủ thì chủ là cổ chai: chủ vắng, lệnh đứng tới hết hạn. Cho cả Kế toán và Quản trị cùng duyệt (khuyến nghị A) giải được một phần: chủ vắng thì Quản trị hoặc một Kế toán khác duyệt thay. Nhưng nếu công ty chỉ có đúng một Kế toán và một chủ thì chủ vắng là lệnh đứng. Chưa kiểm số tài khoản Quản trị và Kế toán trên dữ liệu thật (tôi không đọc được dữ liệu thật). (2) Luật tách theo **tài khoản**, không theo người thật: một người giữ hai tài khoản thì tự duyệt cho mình được; máy không phát hiện. (3) Đảo dòng sổ và "Thay lần thu" vẫn một người làm một mình (theo Q2 nếu không chọn C); chúng chỉ trả lại đúng dòng cũ nên rủi ro thấp hơn, nhưng đây là điều dựa vào kỷ luật, không phải hàng rào máy.

**Áp theo khuyến nghị nếu bạn không nói gì:** hạn 7 ngày; số dư chỉ đổi sau duyệt; kiểm lại trần và "không đổi dấu" lúc duyệt; ngày phát sinh phải thuộc tháng còn mở lúc duyệt, nếu tháng đã khoá thì từ chối và người tạo tạo lại; người duyệt từ chối phải ghi lý do; sửa nhầm một lệnh đã duyệt bằng lệnh "đảo dòng" sẵn có; thêm tin báo cho người duyệt, người tạo và người bị đổi số dư.

---

## Phụ lục kỹ thuật (cho người kiểm và người thi công)

### 1. Quy tắc đề xuất

1. **Phạm vi "bút toán điều chỉnh" (Q2 = A):** lệnh `dieu_chinh` của `POST /api/ledger/adjustments` (phiếu `ADJUSTMENT`, `billing`) và lệnh `POST /api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh` (dòng `ADJUSTMENT` của `vc_trip_cost_line`, `van-chuyen`). **Loại trừ có tên**: `dao_lan_thu`, `dao_dong`, Thay lần thu (ADR-0088), `…/chi-phi/dao`, `…/chi-phi/chup-lai`, `…/gia-thoa-thuan`. Lý do: các lệnh này sinh dòng bằng luật cố định từ một dòng gốc (`sinhDongDao`); chỉ lệnh điều chỉnh cho người gõ hai bên và số tiền tuỳ ý. Phần loại trừ ghi là "dựa vào kỷ luật", không phải hàng rào.
2. **Hai bước, chỉ-thêm.** Bảng yêu cầu (tên dự kiến `bil_adjustment_request`; bên chuyến xe `vc_trip_cost_request`, vì chỉ module chủ ghi bảng của mình, ADR-0002): dòng `REQUEST` (đơn hoặc chuyến, hai bên, loại dòng, số tiền, lý do ≥ 10 ký tự, ngày phát sinh) và dòng quyết định `APPROVE` / `REJECT` / `WITHDRAW` trỏ về dòng gốc, **mỗi yêu cầu đúng một quyết định** (`target_id` UNIQUE) — cùng khuôn `bil_outside_refund` của `0079`. Hết hạn **không có dòng**: tính lúc đọc (`created_at` + 7 ngày), không cần Cron.
3. **Số dư không đổi cho tới khi duyệt.** Phiếu `ADJUSTMENT` và dòng nợ chỉ sinh **trong lô duyệt** (một `db.batch`: dòng quyết định → phiếu → dòng nợ → nhật ký, thứ tự cổng → nhật ký → ghi, như `thu-tu-lo.test.ts`). Sổ không bao giờ chứa dòng "đang chờ".
4. **Người duyệt ≠ người tạo**, so theo `staff.id`: máy chủ 409 và trigger (`created_by` của dòng quyết định so với `created_by` của dòng yêu cầu), như `bil_payment_receipt_coc_same_person`. Trigger trên `bil_posting` cấm chèn `kind = 'ADJUSTMENT'` mới nếu không có yêu cầu đã `APPROVE` trỏ tới (cột mới `request_id`).
5. **Trần cộng dồn (C-2).** Tăng nợ: Σ(điều chỉnh tăng nợ còn hiệu lực của đơn) + Σ(yêu cầu tăng nợ đang chờ, chưa hết hạn) + số mới ≤ `max(phải thu, đã thu ròng)`. Giảm nợ: giữ Đ5a (không đổi dấu) và kiểm lại **theo số dư lúc duyệt**: hai yêu cầu giảm 300.000 cùng trên khoản nợ 300.000, duyệt cái thứ hai thì 409. Kiểm cả lúc tạo và lúc duyệt. Công thức nằm ở **một hàm** (`kiemDieuChinh`, mở rộng), Hiến chương 5.4.
6. **Phân biệt hai nửa của C-2.** Nửa "hai lệnh tăng cộng dồn" do trần cộng dồn chặn. Nửa "một lệnh 300.000 xoá nợ giữ hộ của nhân viên" là lệnh **giảm nợ** mà Đ5a cho phép; chỉ bước người thứ hai chặn được nó (và nhật ký/tin báo làm nó lộ ra). Tôi không đọc thêm bài tái hiện nên lấy mô tả nguyên văn của hồ sơ kiểm.
7. **Hết hạn 7 ngày, rút, từ chối.** Rút: chỉ người tạo, khi chưa có quyết định. Từ chối: người có ô duyệt, lý do bắt buộc. Hết hạn: người tạo tạo lại.
8. **Tin báo** (ADR-0034, tin là hình chiếu `audit_log`): hành động mới `ledger_adjustment_requested` (cho người có ô duyệt, trừ người tạo), `…_approved` / `…_rejected` / `…_withdrawn` (cho người tạo), và khi duyệt xong: tin "điều chỉnh đổi số dư của bạn" cho bên bị đổi nếu là nhân viên có tài khoản (đóng Đ5d). Nhật ký ghi số dư trước và sau như hôm nay; không ghi SĐT, email, MST.
9. **Chống ghi trùng:** mọi lệnh mới đi qua lớp vé của ADR-0094 (mỗi lệnh một lô, `Idempotency-Key`).
10. **Khoá kỳ:** ngày phát sinh khai lúc tạo; lúc duyệt, nếu tháng đó đã khoá thì 409 (lớp CSDL hôm nay: trigger `0090` trên `occurred_date`).

### 2. Trang ghép (CLAUDE.md §9)

**(1) Bảng nào chứa loại thực thể nào**

| Bảng | Chứa | Thay đổi |
|---|---|---|
| `bil_adjustment_request` (mới, `billing`) | yêu cầu điều chỉnh công nợ và quyết định về nó | mới; chỉ-thêm; trigger cấm sửa/xoá |
| `bil_posting`, `bil_debt_line` | phiếu `ADJUSTMENT` đã duyệt và dòng nợ | `bil_posting` thêm cột `request_id`; trigger yêu cầu đã duyệt |
| `vc_trip_cost_request` (mới, `van-chuyen`; đợt hai) | yêu cầu điều chỉnh chi phí chuyến và quyết định | mới; chỉ-thêm |
| `vc_trip_cost_line` | dòng `ADJUSTMENT` đã duyệt | trigger yêu cầu đã duyệt |
| `audit_log` | nhật ký + nguồn tin ADR-0034 | thêm hành động mới |

Hồ sơ khách và đại lý không bị chạm; bên liên quan chỉ là mã hồ sơ trong hai cột bên nợ / bên được nợ.

**(2) Từng dòng bản đồ quyền chạm bảng này** (cột: Bán hàng, Kế toán, Quản trị, HDV, Đối tác, Toàn quyền, …)

| Ô | Hôm nay | Đề xuất (Q1 = A) |
|---|---|---|
| `ledger.write` | Kế toán, Toàn quyền | không đổi giá trị; nghĩa đổi: chỉ **tạo yêu cầu** điều chỉnh công nợ, không còn ghi ngay |
| `transport.cost.adjust` | Kế toán, Quản trị, Toàn quyền | không đổi giá trị; chỉ **tạo yêu cầu** (Q2 = A) |
| `ledger.adjust.approve` (**mới**) | — | Kế toán, Quản trị, Toàn quyền; dùng cho cả hai loại; "khác người tạo" kiểm theo tài khoản, không theo ô |
| `ledger.view` | Kế toán, Toàn quyền `any`; Quản trị `own` | không đổi; người có ô duyệt thấy riêng danh sách **yêu cầu chờ duyệt** (số tiền, hai bên, lý do), không thấy cả sổ — đây là phần mở rộng tầm nhìn của Quản trị, nêu để chủ biết |
| `payment.refund`, `order.complete`, `accounting.entry.mark` | không đổi | không đổi |

Hệ quả: `O_GHI_TIEN` (bốn ô của ADR-0090) **không thêm** ô mới, nên ADR-0090 và bài `permissions.test.ts` (Quản trị = none ở bốn ô) không đổi; `deposit.refund.approve` của Quản trị đã là tiền lệ. Thêm ô mới là nhân đôi mọi bài "tập con quyền" (CLAUDE.md §10): đã tính vào ước lượng thi công. Q1 = B hoặc C chỉ đổi giá trị hàng của ô mới.

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Giao diện bị đổi nghĩa |
|---|---|---|
| `POST /api/ledger/adjustments` `dieu_chinh` | `ledger.write`; trả 201 "đã gửi chờ duyệt", **không đổi số dư** (đổi hợp đồng: bên gọi cũ mong số dư đổi ngay) | chưa có màn; màn mới hiện theo `ledger.write` |
| route duyệt / từ chối / rút (mới) | `ledger.adjust.approve` + khác người tạo; rút: người tạo | khối "Chờ duyệt" hiện theo `ledger.adjust.approve`; ô đếm trên Trang chủ cho Kế toán và Quản trị (huy hiệu chỉ hiện khi có nguồn dữ liệu thật, ADR-0015) |
| trigger `bil_posting` | không chèn `ADJUSTMENT` thiếu yêu cầu đã duyệt, hoặc người duyệt = người tạo | — |
| `POST …/chi-phi/dieu-chinh` | `transport.cost.adjust`; tạo yêu cầu | `web/chi-phi-chuyen.ts`: nút "Lưu điều chỉnh" (hiện theo `transport.cost.adjust`) đổi thành "Gửi duyệt"; tổng chi phí chuyến **không đổi** tới khi duyệt |
| route duyệt chi phí chuyến (mới) | `ledger.adjust.approve` | khối "Chờ duyệt" của màn chi tiết chuyến, hiện theo ô duyệt |

### 3. Tiêu chí nghiệm thu (đặt trước khi làm, P20)

Mỗi dòng là một bài kiểm; bài đỏ trước, xanh sau; mỗi cổng mới phải có ngày quan sát chặn thật ở `docs/SO-HANG-RAO.md` (sửa cố ý → đỏ → hoàn nguyên).
1. Kế toán gửi điều chỉnh → 201 "chờ duyệt", số dư và biên nhận **không đổi**.
2. Cùng tài khoản duyệt lệnh của mình → 409 ở máy chủ **và** chèn thẳng phiếu `ADJUSTMENT` thiếu yêu cầu đã duyệt, hoặc có yêu cầu do chính người ghi tạo → trigger từ chối.
3. Người khác có ô duyệt bấm duyệt → số dư đổi đúng bằng yêu cầu; nhật ký có người tạo, người duyệt, số trước/sau; bên bị đổi (nếu có tài khoản) nhận tin.
4. Ca C-2: đơn phải thu 500.000, đã thu 300.000. Yêu cầu tăng nợ 500.000 thứ nhất được tạo; yêu cầu thứ hai 500.000 bị từ chối ngay lúc tạo (cộng dồn kể cả yêu cầu chờ). Sau khi duyệt cái thứ nhất, số dư ở mức 500.000 và không thể vượt.
5. Hai yêu cầu giảm 300.000 cùng trên khoản nợ 300.000: duyệt cái đầu → 0; duyệt cái hai → 409 "không đổi dấu".
6. Yêu cầu tạo ngày D, duyệt ngày D+8 → 409 hết hạn, số dư không đổi. Tháng của ngày phát sinh đã khoá lúc duyệt → 409.
7. Người không có ô duyệt (Bán hàng, Thực tập, Đối tác, HDV, tài xế) → 403 ở mọi route mới; Quản trị chỉ thấy yêu cầu chờ duyệt, gọi `GET /api/ledger` vẫn như cũ.
8. Mọi bài hiện có chèn thẳng phiếu `ADJUSTMENT` (tìm bằng `grep` trong `src/`; ít nhất `migrations-so-khong-am`, `migrations-khong-doi-dau`, `audit-invariants`, `so-vang-chi-phi-xe`, `tien-xe-route`, `dieu-chinh-csdl`) phải chuyển sang đi qua yêu cầu; không bài nào bị xoá để xanh.
9. Một quy tắc kiểm định kỳ mới trong `audit-invariants`: tổng điều chỉnh tăng nợ còn hiệu lực của đơn ≤ trần; và không phiếu `ADJUSTMENT` nào thiếu yêu cầu đã duyệt (đếm 0 trên dữ liệu cũ vì ADJUSTMENT cũ phải được miễn bằng mốc ngày, khuôn `bil_audit_cutoff`).

### 4. Ca vàng mới cần Kế toán hoặc chủ xác nhận (số là ví dụ do tôi đề xuất, **chưa ai xác nhận**; N8: AI không tự đánh dấu)

`SV-DC-01` đơn phải thu 500.000, đã thu 300.000: yêu cầu tăng nợ 500.000 → duyệt → số dư 500.000; yêu cầu thứ hai 500.000 → chặn. `SV-DC-02` nhân viên giữ hộ 300.000: Kế toán tạo giảm nợ 300.000, số dư vẫn 300.000; Kế toán tự duyệt → 409; Toàn quyền duyệt → 0, nhật ký "300.000 → 0". `SV-DC-03` hai yêu cầu giảm 300.000 trên nợ 300.000. `SV-DC-04` hết hạn ngày thứ 8. `SV-DC-05` chi phí chuyến: chuyến thuê xe giá thoả thuận 3.000.000, điều chỉnh −200.000 chờ → tổng vẫn 3.000.000; duyệt → 2.800.000 (số minh hoạ, Kế toán đặt số thật). Thêm vào thư mục `golden/` một tệp mới; không sửa ca đã xác nhận.

### 5. Migration dự kiến (chỉ nêu, không viết)

Chưa có migration nào ≥ 0094 ở bất kỳ nhánh nào tôi tìm được; số thật kiểm lại lúc thi công (CLAUDE.md §10). Dự kiến: một migration `billing` (bảng yêu cầu, cột `request_id`, trigger duyệt, trigger tách người; trần cộng dồn chỉ ở máy chủ, xem mục 7) và một migration `van-chuyen` (bảng `vc_trip_cost_request`, trigger). Không sửa tệp đã áp. Cập nhật `docs/data-dictionary.json` rồi `npm run dict`. Dòng `ADJUSTMENT` cũ trên production (nếu có) giữ nguyên, không đảo, không đòi duyệt lại (mốc ngày).

### 6. Việc lớn, người kiểm độc lập, thứ tự

Chạm tiền, quyền, dữ liệu: bắt buộc subagent kiểm độc lập, chỉ đọc, đọc mã thật và chạy lại lệnh sau khi thi công (CLAUDE.md §3); người thi công không tự nghiệm thu. Hai đợt: (1) công nợ, (2) chi phí chuyến. Mỗi đợt đóng hẳn trước khi sang đợt sau. Mục `HC-4.2` trong sổ hoãn chỉ do chủ dự án sửa hoặc xoá (N9); tôi chỉ đề xuất.

### 7. Lệch có chủ ý cần chủ duyệt, và điều chưa kiểm

- **Trần cộng dồn không có lớp CSDL.** Trần dựa trên phải thu (bảng `orders`), mà trigger của `billing` chỉ được đọc bảng `bil_` (ADR-0024 đ5). Lớp bù: kiểm lại lúc duyệt ở máy chủ và quy tắc kiểm định kỳ ở mục 3.9. Đây là lệch hẹp so với Hiến chương 5.1; ADR-0092 Đ5b hôm nay cũng chỉ ở máy chủ nên đề xuất này **không làm tệ hơn**, nhưng 6.1 đòi chủ duyệt lệch. Áp theo khuyến nghị nếu chủ không nói gì.
- Chưa kiểm: số tài khoản Quản trị / Kế toán trên dữ liệu thật; một người giữ hai tài khoản; migration `0080–0088` đã lên production chưa (không khẳng định trạng thái production từ tài liệu).
- Chưa làm: không viết mã, không migration, không chạy gì trên production.
