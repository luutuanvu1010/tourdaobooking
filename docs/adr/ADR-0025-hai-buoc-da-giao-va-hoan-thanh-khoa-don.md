# ADR-0025 — Hai bước chốt đơn: "Đã giao – đã thu đủ" (hướng dẫn viên, khoá mọi thứ + ghi sổ trong cùng một lô) rồi "Hoàn thành" (Kế toán, khi mọi khoản phải thu của công ty đã về)

- **Trạng thái:** **proposed** — AI soạn 2026-09-25 (vai lập kế hoạch) từ các câu trả lời của chủ dự án H2, H2', H6, Q1, Q6 (bản tổng hợp `docs/superpowers/specs/2026-09-25-hoan-tat-phan-bien-tong-hop.md` §10; đặc tả gốc `docs/superpowers/specs/2026-09-25-hoan-tat-don-va-so-ke-toan.md` §10). AI đã nhắc một lần (P18, đặc tả gốc §1) rằng yêu cầu này đảo câu Q9 của đặc tả mô hình vai (24/9); chủ đã nghe và vẫn quyết. AI **không tự duyệt** (N3, Điều 7.2). Sau khi accepted chỉ sửa dòng trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-25   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Lượt duyệt:** **lượt 1 của "Hoàn tất đơn"** (cùng ADR-0024, ADR-0026; trang ghép `docs/superpowers/specs/2026-09-25-luot1-hoan-tat-trang-ghep.md`). **Chỉ trình khi ADR-0019 đã lên production.**
- **Loại quyết định:** **cửa một chiều** cho dữ liệu: đơn đã "Đã giao" bị khoá vĩnh viễn và các dòng sổ đã ghi theo nó không rút lại được (chỉ đảo bằng dòng mới — ADR-0026). Các ô quyền mới là hai chiều.
- **Xây trên lỗ đang hở: `money.view`, `contact.view`** — người bấm "Đã giao" phải thấy số phải thu và tiền đã thu; hai ô phải đã được máy chủ hỏi (ADR-0019) trước khi duyệt. **Và `DK-T4-02`** (HIGH, hạn 2026-10-05 — `docs/quyen-hoan.json` (mục `phat_hien`, đã trên `main`)): hướng dẫn viên huỷ đơn đã xác nhận bằng 2 chạm, không hỏi lại, kể cả tour đã đi — cùng người, cùng đơn, cùng giai đoạn với nút "Đã giao"; phải vá trước (hộp xác nhận "không thể hoàn tác" dùng chung cho cả hai nút). **Và `DK-T3-02`** (HIGH, cùng hạn): Quản trị/Toàn quyền tự đặt lại PIN không cần PIN cũ ⇒ một phiên bỏ quên của Toàn quyền bấm được "Đã giao"/"Hoàn thành" (khoá vĩnh viễn) — phải vá trước. **Phụ thuộc bản vá `DK-T2-01`** (tính lại dịch vụ đã lưu theo **đơn giá đã thoả thuận**, không theo giá niêm yết — đã vá và **đã lên production bản 1.13 ngày 2026-09-25** (commit `6a0301f`/`9f18125` trên `main`, kiểm bằng `GET /api/auth/config` → `"version":"1.13"`)): điều kiện "đã thu = phải thu" (điều 3d) dựa vào số phải thu hiện hành đúng, bản vá đã có — điều kiện này **đã thoả**.
- **Phụ thuộc:** ADR-0024 (cột mốc trên `orders`, view `v_ord_order_state`, luật trigger, cạnh `billing → dispatch`); ADR-0026 (lần thu, sổ); ADR-0022 (Bảng tin). Không phụ thuộc ADR-0020/0023 (đang proposed): hôm nay hướng dẫn viên đã làm người phụ trách được khi Bán hàng/Quản trị giao (`checkAssignee` chấp nhận `order.money.edit` phạm vi `assigned`, ADR-0014 điều 6).

## Nguồn (chủ dự án, phiên chat 2026-09-25)

- Gốc: *"Hướng dẫn viên sau khi thay đổi đơn có thể bấm xác nhận để CHUYỂN TRẠNG THÁI ĐƠN LÀ HOÀN THÀNH. Lúc này đơn không thể thay đổi bất cứ thông tin nào, và là bất biến."*
- **H2:** *"việc HDV bấm Hoàn tất và Kế toán xác nhận đơn hoàn tất là khác nhau. Vì HDV giao vé và thu đủ số còn lại từ khách thì HDV đã hoàn tất, nhưng đơn chỉ thực sự hoàn tất khi công ty thu đủ tiền về."* + khuyến nghị đã đồng ý: chỉ bấm được khi **đã thu = phải thu**; giảm giá/bớt người → sửa đơn **trước**; không ghi "khách còn nợ".
- **H2':** (a) **khoá đơn và ghi sổ ngay khi HDV bấm "Đã giao – đã thu đủ"**; (b) **Kế toán bấm "Hoàn thành"** khi mọi khoản **người khác nợ công ty** của đơn đã về đủ; khoản công ty còn phải trả (hoa hồng, nhà cung cấp) theo dõi riêng trong sổ, **không chặn**.
- **H6:** khoá **tất cả** — sửa, huỷ, thêm điều chỉnh, **đổi người phụ trách**; chỉ bấm được **từ ngày đi trở đi**.
- **Q1:** Hoàn tất: **HDV đang phụ trách, Quản trị/Toàn quyền**; không nhảy thẳng từ Chờ xác nhận. **Q6:** đơn Hoàn thành **không mở lại**; Kế toán/Toàn quyền ghi bút toán điều chỉnh có lý do.

## Sửa những câu nào của quyết định đã duyệt

| Nguồn | Câu hiện hành | Sau ADR-0025 |
|---|---|---|
| Đặc tả mô hình vai (đã duyệt 24/9) §3 **Q9** | "…không thêm trạng thái 'đã hoàn thành' đợt này…" | Thêm hai bước **"Đã giao – đã thu đủ"** và **"Hoàn thành"** — là **mốc suy ra** trên đơn đã xác nhận (ADR-0024 điều 3), không phải giá trị mới của `orders.status`. Phần còn lại của Q9 (HDV tự nhận đơn chưa có người; hạn tiếp nhận) giữ. |
| Đặc tả mô hình vai §8, câu cuối | "Trạng thái đơn vẫn là `draft` / `confirmed` / `cancelled` — **không thêm trạng thái mới** (Q9)." | Cột `status` vẫn chỉ ba giá trị (không dựng lại bảng); **trạng thái hiển thị** thêm hai mốc trên. |
| Đặc tả mô hình vai §16 (ngoài phạm vi) | "…trạng thái 'đã hoàn thành'…" | Không còn ngoài phạm vi. |
| **ADR-0014 điều 11** (`FIELD` huỷ đơn đang phụ trách) và cách huỷ qua `order.modify` của mọi mức | huỷ được đơn đã xác nhận | **Không huỷ được** đơn đã "Đã giao" (route từ chối + trigger). Huỷ đơn chưa "Đã giao" giữ nguyên. |
| **ADR-0014 điều 6**, **ADR-0007 điều 2** (sửa số khách/dịch vụ/tiền sau xác nhận qua dòng điều chỉnh) | sửa được sau xác nhận, có lý do | **Chỉ tới trước "Đã giao".** Sau đó sai sót → bút toán điều chỉnh trong sổ (ADR-0026), đơn không đổi. |
| **ADR-0007 điều 1** dòng "Sửa thông tin vận hành sau xác nhận"; `order.trip.edit`; ADR-0011 (đổi người đặt đơn đã xác nhận) | sửa được | Không sửa được từ "Đã giao". |
| **ADR-0009**, **ADR-0020** (proposed), ô `dispatch.assign`/`dispatch.claim` | đổi/nhận người phụ trách bất kỳ lúc nào | Không đổi/nhận được từ "Đã giao" (trigger trên `dsp_assignment` đọc `v_ord_order_state`). |
| **ADR-0023** (**proposed**, chưa accepted) điều 3 | HDV sửa đơn mình phụ trách "ở mọi trạng thái trừ **đã huỷ**" | "…trừ đã huỷ **và từ 'Đã giao' trở đi**". |
| ADR-0023 (**proposed**) điều 7 | "Tập trạng thái sẽ đổi vì chủ thêm 'Hoàn thành'…" | Đổi theo ADR này: nhãn "Đã sửa" vẫn là nhãn, cạnh cả hai mốc mới. |
| **ADR-0022 điều 5** (hàng rào "mọi route ghi đơn đều báo") | "mọi route ghi của `orders`/`dispatch`" | Thêm hai route của `billing` ở điều 8. |

**Không đổi:** `migrations/0003` (`CHECK`), `0017` (luật chuyển trạng thái — trigger mới đứng cạnh, không sửa tệp cũ), luật xác nhận hiện hành, ADR-0017, ADR-0018 điều 7.

## Quyết định

1. **Luồng:** Chờ xác nhận → **Đã xác nhận** → *(người phụ trách)* **Đã giao – đã thu đủ** → *(Kế toán)* **Hoàn thành**. Huỷ được từ Chờ xác nhận hoặc Đã xác nhận; **không** từ hai mốc sau. Không nhảy cóc (Đã giao chỉ từ Đã xác nhận; Hoàn thành chỉ từ Đã giao). **Không có nút mở lại** ở bất kỳ mốc nào.
2. **Ai bấm "Đã giao – đã thu đủ"** — ô mới `order.handover`: `FIELD` = `assigned`; `ADMIN` = `any`; `SUPER_ADMIN` = `any`; `SALES`, `ACCOUNTING`, `PARTNER`, `INTERN` = `none`. *Cách đọc:* "HDV đang phụ trách" (Q1) đọc theo nghĩa chữ là mức **Hướng dẫn viên** đang phụ trách; Bán hàng đang phụ trách **không** bấm được (Quản trị bấm thay). Muốn gồm cả Bán hàng đang phụ trách = đổi **một ô** (hai chiều).
3. **Điều kiện của "Đã giao – đã thu đủ"** (máy chủ kiểm, trình duyệt chỉ ẩn/hiện):
   - (a) `status = 'confirmed'`, `delivered_at IS NULL`.
   - (b) **Từ ngày đi trở đi:** `vnToday()` ≥ **ngày khởi hành muộn nhất** trong các dịch vụ của đơn (`order_service.depart_date`; ADR-0021 chỉ ép một ngày ở giao diện, máy chủ chưa ép — lấy ngày muộn nhất để mọi dịch vụ đều đã tới ngày). *Giả định bề mặt của AI, đảo được bằng một dòng mã; ghi để chủ thấy.*
   - (c) Người bấm (mức `FIELD`) là **người phụ trách đang mở** của đơn — kiểm bằng `ctx.isAssigned` trước **và** bằng câu bảo vệ của `dispatch` **trong** lô ghi (ADR-0024 điều 2).
   - (d) **Đã thu = phải thu** (H2): tổng các lần thu còn hiệu lực (kể cả lần thu nhập ngay ở bước này, trừ hoàn tiền và dòng đảo — ADR-0026) **bằng đúng** tổng khách phải trả hiện hành (sau điều chỉnh, máy chủ tính — `effectiveMoney`). Thiếu → từ chối ("Còn thiếu X ₫ — ghi thêm lần thu hoặc sửa đơn trước"). **Thừa** (khách bớt người sau khi đã trả trước; hôm nay `remainingAmount` có thể âm — `src/modules/orders/money-adjustment.ts:215-218`, mới đọc mã, chưa chạy thử) → từ chối cho tới khi Kế toán ghi "đã hoàn khách" (H4, ADR-0026) — không ghi "công ty nợ khách" (H2). "Còn lại" âm hôm nay là **việc MỞ** (`docs/CHANGE-GUIDE.md` §4 mục 32, nhánh `va-gia-thoa-thuan`), giao cho phần hoàn tiền của ADR-0026 (câu mở M2); ADR này **không** chặn việc sửa số khách.
   - (e) Không còn lần thu nào có người thu **"chưa rõ"** (cọc cũ chuyển sang — ADR-0026 điều 9).
   - (f) Điều kiện riêng của lượt 1 cho đơn có người hưởng / dịch vụ "làm đại lý" — ADR-0026 điều 12 và câu hỏi mở M1 ở đó.
4. **Một lô ghi, đúng quyền sở hữu** (ADR-0024 điều 4): route ở `billing` gộp trong **một** `db.batch()`:
   1. câu **chưa chạy** từ `orders/index.ts`: `UPDATE orders SET delivered_at = ?, delivered_by = ?, updated_at = ? WHERE id = ? AND status = 'confirmed' AND delivered_at IS NULL AND updated_at = ?` (khoá lạc quan: chống bấm hai lần, chống "đang có người sửa" — sửa số khách có đổi `updated_at`, `orders/repository.ts:916`);
   2. câu bảo vệ của `dispatch`: người bấm vẫn là người phụ trách đang mở (với mức `FIELD`);
   3. nhật ký `audit_log` (`order_delivered`, không ghi SĐT/số tiền chi tiết);
   4. các câu của `billing`: lần thu nhập ở bước này, phiếu sổ "Đã giao" và dòng nợ (ADR-0026) — mỗi câu có điều kiện `EXISTS (SELECT 1 FROM v_ord_order_state WHERE id = ? AND delivered_at = ?)` với mốc do request sinh (lưới thứ hai).
   - **Chưa kiểm, phải chứng minh trước khi dựa vào:** "một câu hỏng thì cả lô D1 huỷ" — e2e **cố ý làm hỏng câu thứ 3** và kiểm không câu nào được lưu.
   - Màn xác nhận trước khi bấm hiện: "Bạn đang giữ X ₫ của công ty" (số máy chủ tính từ sổ).
5. **Khoá (lưới cuối ở CSDL, ADR-0003 điều 5)** — trigger mới, mỗi trigger chỉ đọc bảng cùng module hoặc view công bố (ADR-0024 điều 5). Khi đơn có `delivered_at IS NOT NULL`:
   - `orders`: mọi `UPDATE` bị chặn **trừ** đúng một lần đặt `completed_at`/`completed_by`/`updated_at` từ `NULL` (bước Hoàn thành); `delivered_at` không đặt lại/xoá được; `status` không đổi được (không huỷ).
   - `order_service`, `order_item`: chặn `INSERT`/`UPDATE`/`DELETE` — **kể cả trường vận hành** (ngày giờ, đón, check-in, ghi chú), khác `0008` hôm nay chỉ khoá thành phần.
   - `order_money_adjustment`: chặn **`INSERT`** (hôm nay `0021` chỉ chặn sửa/xoá).
   - `dsp_assignment` (trigger của `dispatch`, đọc `v_ord_order_state`): chặn chèn dòng mới và đổi dòng `HANDLE` của đơn đó. Luồng nào hôm nay tự đóng phân công (vd khi ngưng tài khoản) phải bỏ qua đơn đã "Đã giao" — kế hoạch rà.
   - Thông báo lỗi có tiền tố mã (`order_delivered: …`), route dịch ra tiếng Việt, không lộ mã thô.
6. **Ai bấm "Hoàn thành"** — ô mới `order.complete`: `ACCOUNTING` = `any`, `SUPER_ADMIN` = `any`; mọi mức khác `none` (kể cả `ADMIN` — H2' chỉ nói Kế toán; Q6 nói Kế toán/Toàn quyền).
7. **Điều kiện của "Hoàn thành"** (H2' b): `delivered_at IS NOT NULL`, `completed_at IS NULL`, và **với từng bên** có dòng nợ trên đơn: số họ nợ Tour Đảo − số Tour Đảo nợ họ (kể cả dòng quyết toán, dòng đảo) **≤ 0**. Tức: không còn ai **nợ công ty** vì đơn này; khoản **công ty còn phải trả** (hoa hồng, nhà cung cấp, trả lại khách) **không chặn**. Khoản "Công ty thu – chuyển khoản" chưa được Kế toán xác nhận vẫn là nợ của người khai (H3, ADR-0026) ⇒ chặn cho tới khi xác nhận. Kiểm trong lô ghi của `billing` (câu có điều kiện trên `bil_`, rồi câu `UPDATE orders SET completed_at …` của `orders` nối qua câu bảo vệ — ADR-0024 điều 4). Nhật ký `order_completed`.
8. **Bảng tin:** hai route mới báo `ctx.baoThayDoi` **chỉ ở nhánh thành công, sau khi lô ghi xong** (ADR-0022 điều 5) — Bảng tin **không bao giờ** kích hoạt ghi tiền. Hàng rào "mọi route ghi đơn đều báo" mở rộng phủ hai route này (phải thấy chặn thật một lần). Loại thông báo: **chỉ làm mới màn hình** (hai loại mới không nằm trong danh sách hiện nổi của ADR-0022 Q-B) — *giả định bề mặt, đảo được; chủ muốn hiện nổi cho người lập/Kế toán thì thêm một dòng.*
9. **Hiển thị:** nhãn "Đã giao – đã thu đủ", "Hoàn thành" ở danh sách, chi tiết đơn, Trang chủ, biên nhận; không lộ mã (`delivered`, `completed`). Nhãn "Đã sửa" (ADR-0023) vẫn là nhãn.
10. **Sai sót phát hiện sau "Đã giao"** (Q6): đơn **không mở lại**; Kế toán/Toàn quyền ghi **phiếu điều chỉnh / dòng đảo** có lý do trong sổ (ADR-0026 điều 8).

## Lý do

- Đúng hai sự thật chủ tách (H2): "HDV đã xong việc với khách" khác "công ty đã thu đủ về". Khoá ở bước HDV (H2' a) vì từ lúc đó sổ đã ghi theo số trên đơn — sửa đơn sau đó làm sổ lệch lặng lẽ.
- Mốc suy ra (không thêm giá trị `status`) tránh dựng lại `orders` (ADR-0003 điều 10), đúng như Q9 muốn tránh.
- Một lô ghi + khoá lạc quan + câu bảo vệ người phụ trách: không bao giờ có "đơn đã khoá mà sổ chưa ghi", không có hai người cùng bấm, không có người phụ trách cũ ghi sổ sau khi đã bị đổi.
- Trigger khoá ở **năm** bảng vì hôm nay đơn đã xác nhận vẫn huỷ được (`migrations/0017:10-11`), vẫn sửa chuyến, vẫn **thêm** dòng điều chỉnh (`0021` chỉ khoá sửa/xoá), vẫn đổi người phụ trách; khoá tiền sau xác nhận hôm nay **chỉ ở mã** (bản tổng hợp §6).

## Phương án bị loại

- **Một bước "Hoàn tất" duy nhất do HDV bấm** (đặc tả gốc) — chủ tách hai bước (H2).
- **Khoá và ghi sổ ở bước Kế toán** (H2' a, phương án không được chọn) — giữa hai bước đơn vẫn sửa được trong khi HDV đã rời khách.
- **"Hoàn thành" chờ cả khoản công ty phải trả** — chủ chọn không chặn (H2' b); đơn sẽ treo vì hoa hồng trả theo kỳ.
- **Cho "Đã giao" khi còn thiếu và ghi "khách còn nợ"** — chủ bác (H2).
- **Nút mở lại cho Quản trị** — trái H6/Q6; sai sót sửa bằng sổ.
- **Dùng Bảng tin/sự kiện để kích hoạt ghi sổ** — có thể lỡ tin (ADR-0022 điều 7).

## Hệ quả

- **Mã:** `src/shared/permissions.ts` thêm `order.handover`, `order.complete` (việc lớn — quyền); route "Đã giao" và "Hoàn thành" ở `src/modules/billing/`; `src/modules/orders/index.ts` công bố hai câu `UPDATE` chưa chạy + hàm "phải thu hiện hành"; `src/modules/dispatch/index.ts` công bố câu bảo vệ người phụ trách; mọi route sửa/huỷ/điều chỉnh/đổi người phụ trách từ chối sớm đơn đã "Đã giao" (thông điệp tiếng Việt); `web/` nút, hộp xác nhận, nhãn.
- **Dữ liệu (một migration, chỉ thêm):** trigger khoá trên `orders`, `order_service`, `order_item`, `order_money_adjustment` (module `orders`) và `dsp_assignment` (module `dispatch`); test migration cho từng trigger (SQL chạy tay bị chặn).
- **Tiêu chí nghiệm thu (e2e + test, đỏ trước xanh sau):**
  1. `FIELD` không phải người phụ trách → 403; người phụ trách trước ngày đi → từ chối; đã thu ≠ phải thu (thiếu, thừa) → từ chối; còn lần thu "chưa rõ" → từ chối.
  2. Thành công → `delivered_at` có, đúng một phiếu sổ "Đã giao" (I4 của ADR-0026), Bảng tin báo sau khi ghi.
  3. Bấm lần hai → 409; hai người bấm cùng lúc → một thắng.
  4. Sau "Đã giao": sửa nháp/sửa chuyến/đổi người đặt/điều chỉnh số khách/thêm dịch vụ/huỷ/đổi người phụ trách/nhận → route từ chối **và** SQL chạy tay bị trigger chặn.
  5. Người phụ trách bị đổi giữa lúc mở màn và lúc bấm → lô ghi huỷ, không dòng sổ nào.
  6. Cố ý làm hỏng câu thứ 3 của lô → không câu nào được lưu.
  7. `order.complete`: Quản trị → 403; Kế toán khi còn bên nợ công ty (kể cả khoản chuyển khoản chưa xác nhận) → từ chối; sau khi quyết toán → thành công; khoản công ty phải trả còn mở **không** chặn.
  8. `audit-invariants`: `completed_at` có ⇒ `delivered_at` có; `delivered_at` có ⇒ `status = 'confirmed'`.
  9. Hàng rào Bảng tin đỏ khi bỏ `baoThayDoi` khỏi một trong hai route mới (thấy chặn thật một lần).
- **Tài liệu (mô tả, sửa cùng commit thi công):** `docs/SYSTEM-DESIGN.md` §6 (luồng), `docs/CHANGE-GUIDE.md`, `docs/data-dictionary.json`; **nhật ký thay đổi** lời thường: "Hướng dẫn viên bấm 'Đã giao – đã thu đủ' sau chuyến; từ đó đơn không sửa được. Kế toán bấm 'Hoàn thành' khi tiền đã về công ty."
- **Việc lớn** (dữ liệu + quyền + tiền): người kiểm độc lập chỉ-đọc sau thi công.
