# Đề xuất ADR-0116: Phân định trách nhiệm và hoàn tiền sau "Đã giao" (thi hành ADR-0088 điều 9)

- **Trạng thái:** **proposed**, chờ chủ dự án chọn một quyết định (Q3) và nói "duyệt". Soạn 13/10/2026 trên mốc `483b3aa0` (bản 1.90). Chưa có người kiểm độc lập đọc văn bản này.
- **Quan hệ với ADR cũ:** không đổi quyết định nào. ADR-0088 điều 9 đã **accepted**: lời chủ 2/10 ("ai làm người đó phải chịu"), bảng T1–T11, Quản trị hoặc Toàn quyền phân định, người ghi ≠ người phân định, 3 ngày làm việc để bên chịu phản hồi, quá 7 ngày công ty tạm chịu và hiện đỏ. ADR này chỉ thêm **cơ chế tối thiểu** để điều 9 chạy được. Không sửa thân ADR-0088.
- **Đóng:** phần còn mở của `TNV-G3` trong `docs/quyen-hoan.json` (hạn 31/10/2026): "đ9 phân định trách nhiệm" và "tin báo người thu cũ / mới".
- **Loại:** việc lớn (tiền, dữ liệu, quyền). Cần người kiểm độc lập sau khi thi công.
- **Xây trên lỗ đang hở:** TNV-G3 (chính lỗ này), TNV-G4 (phần tin báo Đ5d, cùng hạ tầng tin). **Không** đi qua đường điều chỉnh tay của HC-4.2 (xem mục 1.9), nên không thêm lỗ HC-4.2.
- **Hiến chương áp dụng:** 4.2 (sổ sinh từ sự kiện, có người làm/duyệt), 5.1, 5.4 (một hàm tính phải thu hiện hành), 5.5 (chỉ-thêm, đảo), 5.14 (ngày phát sinh); sổ vàng 5.17.

## Phần cho chủ (đọc phần này là đủ)

**Chuyện gì đang xảy ra.** Bạn đã duyệt nguyên tắc "ai gây ra thì người đó chịu" và bảng 11 trường hợp, nhưng Nền tảng chưa có chỗ nào thi hành. Nên sau khi đơn "Đã giao", mọi lệnh hoàn tiền bị chặn (câu báo "báo Quản trị"). Khách đòi hoàn sau chuyến, hoặc Kế toán ghi nhầm mà không đòi lại được tiền của khách, thì đơn không thể "Hoàn thành" và hệ thống không có đường xử lý; việc phải làm ngoài hệ thống.

**Đề xuất.** Thêm một lệnh ba bước, đúng như điều 9 đã duyệt. (1) **Đề nghị**: ai thấy sai sót thì mở phiếu, nêu đơn, số tiền, lý do. (2) **Phân định**: Quản trị hoặc Toàn quyền chọn trường hợp T4, T6–T11, bên chịu, số tiền. (3) **Ghi sổ**: Kế toán (hoặc Toàn quyền, nếu không phải người đã phân định) ghi trong một lần: khoản khách không phải trả hoặc được bồi thường (gọi là "giảm trừ"), nợ của bên chịu với công ty, và nếu công ty phải trả tiền cho khách thì lần chi hoàn ngay trong lần ghi đó. Số tiền hoàn luôn **bằng đúng** số giảm trừ, nên quy tắc "đã thu ròng = phải thu" vẫn đúng sau lần ghi. Sổ không sửa dòng cũ, chỉ thêm dòng mới và dòng đảo. Bên chịu có tài khoản nhận tin và có 3 ngày làm việc để phản hồi.

**Trường hợp nào dùng cơ chế mới:** T4 (ghi nhầm, không đòi lại được khách), T6 (lỗi nhân viên), T7 (lỗi nhà xe), T8 (lỗi nhà cung cấp), T9 (lỗi đại lý, chỉ ghi nợ, chưa trừ hoa hồng), T10 (bất khả kháng, công ty chịu), T11 (chưa rõ ai, công ty tạm chịu, 7 ngày). T1, T2, T3, T5 đã có đường sẵn (Thay lần thu, người khai giữ hộ, số đang giữ), không đụng.

**Một điều bạn chọn:**

*Q3. Ai được mở phiếu đề nghị?*
- A (khuyến nghị): Kế toán, Quản trị hoặc Toàn quyền. Kế toán là người thấy sai sót đầu tiên nên cần tự mở được phiếu.
- B: Chỉ Quản trị và Toàn quyền. Kế toán phải báo miệng cho họ mở.
- C: Thêm hướng dẫn viên phụ trách đơn. Nhiều người hơn, không khuyến nghị vì thêm phạm vi.

**Ảnh hưởng tới người dùng.** Quản trị và Toàn quyền có thêm một danh sách "chờ phân định". Kế toán có thêm nút "Ghi theo phân định" ở đơn đã giao. Nhân viên bị gán trách nhiệm thấy khoản nợ trong "Sổ của tôi" và nhận một tin. Nền tảng **không tự trừ lương**; việc khấu trừ lương vẫn theo quy chế công ty và pháp luật lao động (ghi chú pháp lý chưa kiểm của ADR-0088 vẫn nguyên giá trị).

**Rủi ro vận hành phải nói thẳng.** (1) Công ty một Kế toán một chủ: Kế toán đề nghị, chủ phân định, Kế toán ghi: chạy được, kể cả khi bên chịu chính là Kế toán, vì người ghi chỉ thi hành số do chủ quyết. Tôi không thêm luật "bên chịu không được tự ghi" vì nó làm kẹt đúng trường hợp này. (2) Nhưng nếu Kế toán vắng thì chủ không ghi thay được (chủ đã phân định); phiếu nằm chờ. (3) Hạn 7 ngày của T11 chỉ nhắc, không tự gán ai. (4) Bồi thường cao hơn số khách đã trả cho đơn nằm **ngoài** đề xuất này: Nền tảng chưa có khái niệm "chi bồi thường ngoài đơn"; nếu cần, ghi vào danh sách việc để sau.

**Áp theo khuyến nghị nếu bạn không nói gì:** không đặt hạn chặn (khác hoàn cọc, vì đây là lỗi của công ty chứ không phải chính sách giữ cọc), chỉ nhắc khi đơn đã giao quá 60 ngày mà chưa xử lý; tiền hoàn cho khách không vượt số khách đã trả; đơn đã "Hoàn thành" hoặc tháng đã khoá vẫn phân định được, dòng ghi vào tháng đang mở và ngày thật ghi ở ghi chú (như "Thay lần thu"); T9 chưa trừ hoa hồng.

---

## Phụ lục kỹ thuật (cho người kiểm và người thi công)

### 1. Quy tắc đề xuất

1. **Ba bước, chỉ-thêm.** Bảng phân định (tên dự kiến `bil_attribution`, `billing`): dòng `REQUEST` (đơn, số tiền đề nghị, lý do, trường hợp gợi ý) → `RULING` (trường hợp T4/T6–T11, bên chịu, số giảm trừ, cờ "có tiền ra khách", lý do; trỏ `REQUEST`, **mỗi đề nghị đúng một phân định**) → `POSTED` (ghi sổ; trỏ `RULING`, mỗi phân định đúng một lần ghi) → `REVERSAL` (đảo). "Giảm trừ đã phân định" của một đơn = tổng số của các dòng `POSTED` chưa bị đảo. Chi tiết cột để thi công đặt; không lưu số căn cước, SĐT, email.
2. **Người:** người ghi ≠ người phân định (điều 9 đã duyệt), kiểm theo tài khoản ở máy chủ **và** trigger (khuôn `bil_payment_receipt_coc_same_person`). Bên chịu phải là hồ sơ có thật (nhân viên, nhà xe, nhà cung cấp, đại lý) hoặc công ty chủ; **không bao giờ là khách** (H2). Không thêm luật "bên chịu ≠ người ghi" (xem rủi ro 1).
3. **Lô ghi** (một `db.batch`, thứ tự cổng → nhật ký → ghi → trạng thái cuối, như `thu-tu-lo.test.ts`): dòng `POSTED`; phiếu sổ loại mới (tên dự kiến `ATTRIBUTION`) kèm dòng nợ loại mới **"bên chịu → công ty", gắn theo đơn** (T7 nhà xe cũng theo đơn, không theo chuyến, đúng ADR-0088 bảng "Thay câu nào"); nếu có tiền ra: **một lần trả lại khách** (`CUSTOMER_REFUND`, người trả = công ty, hoặc người đang giữ tiền và ≤ số họ đang giữ, luật `kiemHoanNguoiGiu` sẵn có) gắn `attribution_id` (cột mới, giống `approval_id` của cọc); nhật ký với `changes() > 0`. Bên chịu là công ty (T10, T11 tạm): không có dòng nợ.
4. **Bất biến giữ I1 mọi lúc (ADR-0088 đ1):** sau lô, đã thu ròng = `due_snapshot` − Σ giảm trừ đã phân định. Suy ra trần: Σ giảm trừ ≤ `due_snapshot`; tiền ra = đúng số giảm trừ của lô và ≤ đã thu ròng trước lô; **không có tiền ra** (T4: khách thật sự chưa trả) thì lần thu trên sổ phải đã đúng thực tế (làm "Thay lần thu" trước), nếu không lô bị từ chối với câu "Sửa lần thu trước".
5. **Hàm một nguồn (Hiến chương 5.4):** "phải thu hiện hành" = `due_snapshot` − giảm trừ (ADR-0088 đ1) nằm ở **một** hàm trong `billing` (mở rộng `phaiThuLucGiao`); R-BIL-1 và máy chủ đọc hàm đó. Đơn đã khoá (ADR-0025 đ5) nên không phải đường tính thứ hai; bài kiểm "phải thu một hàm" (`phai-thu-mot-ham.test.ts`) phải vẫn xanh.
6. **Đảo và sửa:** (a) đổi bên chịu = phân định mới: đảo dòng nợ cũ + dòng nợ mới cùng số; giảm trừ và tiền đã trả khách không đổi. (b) T4 đòi được khách: ghi lần thu mới và đảo giảm trừ cùng nợ **trong cùng lô**, I1 vẫn đúng. (c) T11: ghi ngay giảm trừ với bên chịu = công ty; phân định xong thì ghi nợ bên chịu cùng số, không đụng giảm trừ. Không dòng cũ nào bị sửa.
7. **Nhật ký và tin (ADR-0034):** hành động mới `attribution_requested` (cho người có ô phân định), `attribution_ruled` (cho người đề nghị và người ghi), `attribution_posted` (cho bên chịu có tài khoản, đóng thêm phần "tin báo" của TNV-G3). Lý do tự do chịu luật chặn dãy số dài giống số điện thoại (ADR-0037). Nhật ký không ghi tên khách, SĐT, email, MST.
8. **Hạn:** không chặn. Phiếu `RULING` T11 quá 7 ngày hiện đỏ ở danh sách (điều 9, QT4). Nhắc đơn đã giao quá 60 ngày chưa xử lý: hiện ở danh sách và ô đếm, **không đẩy tin** (tin là hình chiếu nhật ký — khuôn ADR-0089 đ5). Bên chịu phản hồi trong 3 ngày làm việc: phản hồi là ghi chú vào nhật ký; **chưa kiểm** hệ thống có hàm đếm ngày làm việc sẵn chưa.
9. **Ranh giới với HC-4.2 (ADR-0115):** chuỗi đề nghị → phân định → ghi đã có hai người khác nhau từ đầu và số tiền bị ràng bởi I1, nên **không** đi qua luồng "yêu cầu chờ duyệt" của ADR-0115; không có lối nào để dùng lệnh `dieu_chinh` thay cho nó. Nếu ADR-0115 duyệt trước, lệnh `dieu_chinh` cần yêu cầu đã duyệt, còn phiếu `ATTRIBUTION` thì không; trigger của ADR-0115 chỉ áp cho `kind_code = 'ADJUSTMENT'`.
10. **Câu báo cũ** `refund_after_delivered` ("Đơn đã Đã giao — hoàn cho khách cần phân định trách nhiệm trước; báo Quản trị") **giữ làm hàng rào** cho route `POST /api/ledger/refunds`; chỉ đổi đuôi câu chỉ tới màn "Phân định trách nhiệm". Lần trả khách sau Đã giao chỉ được chèn khi có `attribution_id` hợp lệ.

### 2. Trang ghép (CLAUDE.md §9)

**(1) Bảng nào chứa loại thực thể nào**

| Bảng | Chứa | Thay đổi |
|---|---|---|
| `bil_attribution` (mới) | đề nghị, phân định, ghi sổ, đảo của một khoản trách nhiệm | mới; chỉ-thêm |
| `bil_posting` | thêm loại phiếu `ATTRIBUTION` (và đảo của nó) | thêm giá trị loại phiếu |
| `bil_debt_line` | thêm loại dòng nợ "bên chịu → công ty" gắn theo đơn | thêm giá trị bảng tra |
| `bil_payment_receipt` | lần trả lại khách thuộc một phân định | thêm cột `attribution_id` |
| `audit_log` | nhật ký + nguồn tin | hành động mới |

Bên chịu trỏ hồ sơ trong `pty_` qua mã; **chưa kiểm** mọi nhà cung cấp trong dữ liệu thật có hồ sơ tổ chức chưa (loại vai `SUPPLIER` có từ `0090`; `CARRIER` đã dùng ở `0048`).

**(2) Từng dòng bản đồ quyền chạm bảng này** (cột: Bán hàng, Kế toán, Quản trị, HDV, Đối tác, Toàn quyền, …)

| Ô | Hôm nay | Đề xuất (Q3 = A) |
|---|---|---|
| `attribution.request` (**mới**) | — | Kế toán, Quản trị, Toàn quyền |
| `attribution.decide` (**mới**) | — | Quản trị, Toàn quyền (QT2 đã duyệt) |
| `ledger.write` | Kế toán, Toàn quyền | ô **ghi** lô; ghi có tiền ra cần thêm `payment.refund` (cùng hai nhóm giữ cả hai) |
| `payment.refund` | Kế toán, Toàn quyền | không đổi; route `/api/ledger/refunds` vẫn chặn sau Đã giao |
| `ledger.view` | Kế toán, Toàn quyền `any`; Quản trị `own` | không đổi; người có ô đề nghị / phân định thấy danh sách phiếu của mình và phiếu chờ; bên chịu thấy khoản nợ của mình qua `GET /api/ledger/mine` (cổng `staff`) |

`O_GHI_TIEN` và ADR-0090 không đổi (không thêm ô tiền); thêm hai ô mới nhân đôi mọi bài "tập con quyền" (CLAUDE.md §10), đã tính vào thi công. Q3 = B chỉ đổi hàng `attribution.request`.

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Giao diện |
|---|---|---|
| mở phiếu đề nghị (mới) | `attribution.request`; đơn đã Đã giao | nút "Đề nghị phân định" ở trang đơn đã giao, hiện theo `attribution.request` |
| phân định (mới) | `attribution.decide`; người phân định ≠ người sẽ ghi (kiểm ở bước ghi) | danh sách "Chờ phân định", hiện theo `attribution.decide`; huy hiệu đếm chỉ khi có nguồn thật |
| ghi sổ (mới) | `ledger.write` (+ `payment.refund` nếu có tiền ra); người ghi ≠ người phân định; trigger | nút "Ghi theo phân định" ở trang đơn, hiện theo `ledger.write`; khối thẻ đơn Kế toán (`web/order.ts`, nhánh `keToan`) |
| `POST /api/ledger/refunds` sau Đã giao | giữ chặn 409 | nút "Hoàn khách" của `web/order.ts` vẫn ẩn sau Đã giao; thêm đường chỉ sang màn phân định |
| trigger `bil_receipt_after_delivered`, `bil_posting_replacement_check`, `bil_posting_completed_due` (migration `0083`) | dựng lại: trừ giảm trừ khỏi `due_snapshot`; cho lần trả khách có `attribution_id` hợp lệ | — |
| bên chịu | `GET /api/ledger/mine` | "Sổ của tôi": khoản nợ mới và nút phản hồi trong 3 ngày làm việc |

### 3. Tiêu chí nghiệm thu (P20)

Bài đỏ trước, xanh sau; mỗi cổng mới có ngày quan sát chặn thật ở `docs/SO-HANG-RAO.md`.
1. Đơn Đã giao, T6: sau lô ghi, đã thu ròng = `due_snapshot` − giảm trừ; khách có đúng một lần trả lại bằng số giảm trừ; bên chịu có nợ cùng số; đơn "Hoàn thành" được; `audit-invariants` (R-BIL-1) xanh.
2. T4 không tiền ra: khi sổ còn "đủ" (chưa Thay lần thu) → lô bị từ chối; sau Thay lần thu → lô qua, không có lần trả khách.
3. Người ghi = người phân định → 409 ở máy chủ **và** trigger từ chối khi chèn thẳng.
4. Giảm trừ cộng dồn vượt `due_snapshot` → 409; tiền ra lớn hơn đã thu ròng → 409.
5. Trả khách sau Đã giao không có `attribution_id` (route cũ hoặc chèn thẳng) → bị chặn như hôm nay; có `attribution_id` của phân định đã `POSTED` mới qua.
6. Bên chịu là khách → từ chối; bên chịu không có hồ sơ → từ chối.
7. Tháng đã khoá: ngày phát sinh rơi vào tháng đang mở, ngày thật nằm ở ghi chú; đơn đã Hoàn thành vẫn ghi được, nợ hiện ở "Sổ của tôi".
8. Người ngoài ba nhóm (Bán hàng, Thực tập, Đối tác, HDV, tài xế) → 403 ở route mới; Quản trị không tự ghi.
9. T11: giảm trừ ghi với bên chịu = công ty; quá 7 ngày hiện đỏ; phân định xong thì thêm nợ, giảm trừ không đổi.
10. Đảo: đổi bên chịu = đảo nợ cũ + nợ mới; đòi được khách = lần thu mới + đảo giảm trừ cùng lô; I1 đúng sau mỗi bước.
11. Chỗ mã và bài đang giả định "đ9 chưa có ⇒ giảm trừ = 0" (`thay-lan-thu.ts`, `service.ts`, `scripts/audit-checks.mjs` R-BIL-1, và các bài `sau-da-giao.test.ts`, `thay-lan-thu.test.ts`, `migrations-billing.test.ts`; tìm lại bằng `grep` lúc thi công) cập nhật cho khớp hàm mới, không xoá bài nào để xanh.

### 4. Ca vàng mới cần Kế toán hoặc chủ xác nhận (số là ví dụ do tôi đề xuất, **chưa ai xác nhận**)

`SV-PD-01` (T6, có tiền ra): đơn phải thu 2.000.000 đã trả đủ, Đã giao; HDV quên đón, phân định HDV chịu 300.000: giảm trừ 300.000, trả khách 300.000, nợ HDV 300.000; đã thu ròng 1.700.000 = 2.000.000 − 300.000. `SV-PD-02` (T4, không tiền ra): đơn 1.000.000, Kế toán ghi nhầm lần thu 1.000.000 trong khi khách chỉ trả 700.000; Thay lần thu → 700.000; phân định Kế toán chịu 300.000: giảm trừ 300.000, nợ 300.000, không trả khách; 700.000 = 1.000.000 − 300.000. `SV-PD-03` (T10): đã trả 2.000.000, bão, hoàn một phần 500.000: giảm trừ 500.000, trả 500.000, không dòng nợ. `SV-PD-04`: hai phiếu 1.200.000 trên đơn 2.000.000, phiếu hai bị chặn. `SV-PD-05`: người ghi = người phân định, bị chặn. `SV-PD-06` (T11 rồi chuyển bên chịu). Thêm tệp mới vào `golden/`; không sửa ca đã xác nhận.

### 5. Migration dự kiến (chỉ nêu, không viết)

Chưa có migration nào ≥ 0094 ở nhánh nào; số thật kiểm lúc thi công. Một migration `billing`: bảng `bil_attribution` + trigger (chỉ-thêm, một phân định mỗi đề nghị, một lần ghi mỗi phân định, người ghi ≠ người phân định); loại phiếu và loại dòng nợ mới; cột `bil_payment_receipt.attribution_id`; **`DROP` rồi tạo lại ba trigger của `0083`** (SQLite không sửa trigger tại chỗ) theo hàm giảm trừ. Không sửa tệp `0083` (dù đã lên production hay chưa — chưa kiểm). Cập nhật `docs/data-dictionary.json` rồi `npm run dict`. `scripts/audit-checks.mjs` R-BIL-1 thôi dùng giả định giảm trừ = 0.

### 6. Việc lớn, người kiểm độc lập, thứ tự

Chạm tiền, dữ liệu, quyền và đổi ba trigger của luật I1: bắt buộc người kiểm độc lập, chỉ đọc, sau thi công. Nên thi công **sau** ADR-0115 đợt công nợ (cùng bảng `bil_posting`, tránh hai migration đụng nhau), hoặc ít nhất tránh cùng số migration. Mục `TNV-G3` chỉ do chủ sửa/xoá (N9).

### 7. Điều chưa kiểm hoặc chưa làm

Không viết mã, không migration, không chạy gì trên production. Chưa kiểm: mọi nhà cung cấp trong dữ liệu thật có hồ sơ tổ chức; hệ thống có hàm đếm ngày làm việc; trạng thái `0078–0088` trên production. Điều pháp lý về khấu trừ lương: giữ nguyên ghi chú của ADR-0088 (cần chuyên gia nhân sự hoặc pháp lý).
