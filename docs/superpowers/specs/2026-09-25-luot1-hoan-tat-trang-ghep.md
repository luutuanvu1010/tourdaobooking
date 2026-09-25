# Trang ghép — lượt duyệt 1 của "Hoàn tất đơn" (ADR-0024, ADR-0025, ADR-0026)

- **Ngày:** 2026-09-25 · **Người soạn:** AI (vai lập kế hoạch, nhánh `thong-bao-tuc-thi`) · **Trạng thái:** bản nháp, **chưa trình**.
- **Vì sao có trang này:** luật "bước ghép khi duyệt" (`CLAUDE.md` §9): lượt duyệt có ≥ 2 quyết định chạm quyền/dữ liệu, và bảng dùng chung (`pty_party`, `orders`) nhận thêm loại dữ liệu/ý nghĩa mới ⇒ phải có trang ghép; tối đa 3 quyết định mỗi lượt.
- **Quyết định trong lượt (đúng 3):** **ADR-0024** (D0 — đồ thị module, hai cột mốc trên `orders`, luật trigger, hồ sơ Tour Đảo), **ADR-0025** (D1 — "Đã giao – đã thu đủ" + khoá, "Hoàn thành"), **ADR-0026** (D2 — lần thu, sổ công nợ, nộp/trả/hoàn, ba cột cọc, biên nhận danh sách trắng). Người hưởng = bên đặt (H1) **không** là quyết định riêng.
- **Chỉ trình khi ADR-0019 đã lên production** (dừng dây chuyền). **Xây trên lỗ đang hở:** `money.view`, `contact.view` (cả ba ADR); `DK-T3-01` (ADR-0024, ADR-0026 — biên nhận); `DK-T4-02` (ADR-0025 — huỷ 2 chạm của HDV); `DK-T3-02` (ADR-0025, ADR-0026 — phiên Toàn quyền bỏ quên). Ba mục `DK-*` ở `docs/quyen-hoan.json` (mục `phat_hien`, đã trên `main`), hạn 2026-10-05. **Phụ thuộc** bản vá `DK-T2-01` (đơn giá thoả thuận) — **đã lên production bản 1.13 ngày 2026-09-25**.
- **Không thuộc lượt này:** D4 (chiết khấu/hoa hồng theo vai), D5 (người bán, nhà cung cấp, a%, vai Nhà cung cấp) — **lượt 2**. ADR-0020, ADR-0023 (proposed) được nhắc vì ADR ở đây sửa câu của chúng, không được duyệt kèm.
- **Nguồn:** `docs/superpowers/specs/2026-09-25-hoan-tat-phan-bien-tong-hop.md` (§10 = trả lời của chủ), `docs/superpowers/specs/2026-09-25-hoan-tat-don-va-so-ke-toan.md` (§10).

Ký hiệu: **L1** = sau lượt 1; **L2** = đổi thêm ở lượt 2 (chỉ ghi để thấy trước). Tên bảng/route/mã là **đề xuất**, chốt ở kế hoạch.

## (1) Các bảng bị chạm chứa những loại thực thể nào

| Bảng | Module | Chứa | Lượt này thêm loại / ý nghĩa mới? |
|---|---|---|---|
| `orders` | orders | đơn do nội bộ lập (Bán hàng, Quản trị, Toàn quyền, Thực tập) và do Đối tác lập; nháp / đã xác nhận / đã huỷ | **Có — ý nghĩa mới:** hai cột mốc `delivered_at` ("Đã giao – đã thu đủ", khoá đơn) và `completed_at` ("Hoàn thành"); `status` giữ ba giá trị. Ba cột cọc **thôi mang nghĩa** (ADR-0026 điều 9). |
| `order_service`, `order_item` | orders | dịch vụ, số khách, thông tin chuyến, dòng tiền | Không thêm loại. **Khoá mọi thay đổi** từ "Đã giao" (kể cả trường vận hành). |
| `order_money_adjustment` | orders | dòng điều chỉnh số khách/tiền sau xác nhận | Không thêm loại. **Cấm chèn** từ "Đã giao". |
| `dsp_assignment` | dispatch | người phụ trách (`HANDLE`) + lịch sử; nhiệm vụ | Không thêm loại. **Cấm chèn/đổi** dòng của đơn từ "Đã giao". |
| `pty_party` (+ `pty_organization`, `pty_party_role`) | parties | khách, nhân viên nội bộ, đối tác cá nhân, tổ chức đối tác, HDV/tài xế chưa có tài khoản | **Có — loại mới: "công ty chủ" (Tour Đảo)**, một hồ sơ tổ chức đánh dấu bằng một mã vai mới (ADR-0024 điều 6). L2 thêm vai "Nhà cung cấp". |
| `pty_role_type` | parties | mã vai (11 vai + mã cũ) | Thêm **một** mã: công ty chủ. |
| `bil_payment_receipt` (**mới**) | billing | lần thu của khách / trả lại khách | Người thu có thể là: **Tour Đảo** (công ty), **nhân viên nội bộ** (HDV, Bán hàng…), **đối tác bên đặt**, **chưa rõ** (chỉ cọc cũ); L2: **nhà cung cấp**. |
| `bil_posting` (**mới**) | billing | phiếu sổ: lần thu, Đã giao, xác nhận công ty đã nhận, quyết toán, hoàn khách, điều chỉnh, đảo | mới |
| `bil_debt_line` (**mới**) | billing | dòng nợ hai chân | Bên nợ/bên được nợ có thể là: **Tour Đảo**, **nhân viên nội bộ**, **đối tác bên đặt** (người thu trước); L2: đối tác với tư cách người hưởng, **nhà cung cấp**. **Không bao giờ là khách** (khách hết nợ khi đã thu = phải thu — H2). |
| Bảng tra cứu `bil_*` (**mới**) | billing | hình thức thu, vai người thu, loại phiếu, loại dòng | mới |
| `audit_log` | audit | nhật ký chỉ-thêm | Thêm hành động `order_delivered`, `order_completed`, các hành động sổ (không ghi SĐT, không ghi chi tiết số bí mật). |

## (2) Dòng bản đồ quyền chạm các bảng này, áp cho loại nào (sau L1)

Chỉ liệt kê ô **mới**, **đổi**, hoặc **có nghĩa mới** trong lượt này. Phạm vi như `src/shared/permissions.ts`: `own` = của mình (đơn mình lập; với `ledger.view` = sổ của **chính hồ sơ mình**), `assigned` = đơn mình đang phụ trách.

| Ô | Áp cho | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | Nguồn |
|---|---|---|---|---|---|---|---|---|---|
| **`order.handover`** (mới) | bấm "Đã giao – đã thu đủ" trên đơn đã xác nhận, từ ngày đi | none | none | any | **assigned** | none | any | none | ADR-0025 điều 2 (Q1: HDV đang phụ trách, Quản trị/Toàn quyền) |
| **`order.complete`** (mới) | bấm "Hoàn thành" trên đơn đã "Đã giao" | none | **any** | none | none | none | any | none | ADR-0025 điều 6 (H2'; Q6) |
| `payment.receive` | ghi lần thu (trả trước) trên đơn **chưa** "Đã giao" | own (giữ) | any | any | none → **assigned** | none → **own** | any | none → **own** | ADR-0026 điều 10 — giữ năng lực đặt cọc trên form hôm nay |
| `payment.refund` | ghi "đã hoàn khách" (kể cả phần khách trả dư — ADR-0026 M2) | none | any | any → **none** | none | none | any | none | ADR-0026 điều 10 (H4: Kế toán ghi) |
| **`ledger.view`** (mới) | xem sổ công nợ: `any` = mọi bên; `own` = sổ của chính mình | own | **any** | own | own | none (L2: own) | any | own | ADR-0026 điều 7, 10 |
| **`ledger.write`** (mới) | xác nhận "công ty đã nhận" (H3), nộp/trả (H4), điều chỉnh/đảo (Q6) | none | **any** | none | none | none | any | none | ADR-0026 điều 5, 8, 10 |
| `money.view` | nay **thêm nghĩa**: xem tiền đã thu / còn lại (từ sổ) của đơn, biên nhận | không đổi giá trị (sau GĐ2) | | | | | | | ADR-0026 điều 9 |
| `contact.view` | biên nhận (tên/SĐT khách) | không đổi giá trị | | | | | | | ADR-0026 điều 11 |
| `order.modify`, `order.trip.edit`, `order.money.edit`, `order.cancel`, `dispatch.assign`, `dispatch.claim` | đơn | **không đổi giá trị**, nhưng **mất tác dụng** trên đơn đã "Đã giao" (route từ chối + trigger) | | | | | | | ADR-0025 điều 5 |
| `party.write`, gộp hồ sơ | hồ sơ **không gắn tài khoản** | không đổi giá trị; **trừ hồ sơ công ty chủ** (chỉ `admin.manage`) | | | | | | | ADR-0024 điều 6 |

**Điểm dễ trượt nhất:**
- **`PARTNER` chỉ đổi đúng một ô** (`payment.receive` → `own`), để đối tác vẫn ghi được "đã thu trước" như ô cọc hôm nay. Bài kiểm ghim: đối tác ghi lần thu cho đơn **người khác** → 403; đối tác chỉ ghi được **chính mình** hoặc **Công ty** làm người thu; `ledger.view` của đối tác vẫn `none`.
- **`FIELD` có `payment.receive` = `assigned`** nhưng chỉ tới trước "Đã giao"; sau đó chỉ Kế toán ghi phiếu.
- Bốn ô mới (`order.handover`, `order.complete`, `ledger.view`, `ledger.write`) phải có route hỏi chúng **trong cùng bản phát hành** — không thì vào `docs/quyen-hoan.json` (bài kiểm "mỗi ô được máy chủ hỏi" đỏ). Hai mục hoãn `payment.receive`, `payment.refund` phải gỡ khỏi tệp đó khi có route.
- `ADMIN` **không** có `order.complete`, `ledger.write`, `payment.refund` (siết theo H2'/H4) nhưng **có** `order.handover` (Q1). Đây là bất đối xứng có chủ đích.

## (3) Cổng nào canh cửa nào (sau L1)

| Cửa (tên route đề xuất) | Cổng 1 (router, ADR-0019) | Cổng 2 (thân xử lý — ô của bảng) | Canh thêm (CSDL / hàng rào) |
|---|---|---|---|
| `POST /api/orders/:id/delivered` — "Đã giao – đã thu đủ" (module `billing`) | `staff` (hướng dẫn viên chưa chắc có mặt ở cổng `orders` lúc phát hành) | `can(order.handover, { assigned: ctx.isAssigned(id) })`; ngày đi; đã thu = phải thu; không lần thu "chưa rõ"; lượt 1: không có người hưởng (M1) | lô ghi: `UPDATE orders … WHERE status='confirmed' AND delivered_at IS NULL AND updated_at=?` + câu bảo vệ người phụ trách của `dispatch` + câu `billing` có `EXISTS v_ord_order_state`; hàng rào Bảng tin |
| `POST /api/orders/:id/completed` — "Hoàn thành" | `office` | `can(order.complete)` | lô ghi: điều kiện "không ai còn nợ công ty" trên `bil_` do `billing` kiểm; câu `orders` chỉ đặt `completed_at` từ `NULL` (trigger khoá cho phép đúng câu này) |
| Mọi route sửa/huỷ/điều chỉnh/đổi người phụ trách hiện có (`orders`, `dispatch`) | không đổi | không đổi; **thêm** từ chối sớm khi `delivered_at` có | **trigger khoá** trên `orders`, `order_service`, `order_item`, `order_money_adjustment` (module `orders`), `dsp_assignment` (module `dispatch`, đọc `v_ord_order_state`) |
| `POST /api/orders/:id/payments` — ghi lần thu | `staff` | `can(payment.receive, { ownerId, assigned })`; người thu ∈ {chính mình, Công ty} trừ Kế toán/Toàn quyền; đơn chưa "Đã giao" | trigger chỉ-thêm; `CHECK amount > 0` |
| `GET /api/orders/:id/payments` — đã thu / còn lại / danh sách lần thu | `staff` | `can(order.view, …) && can(money.view, { ownerId, assigned })` | — |
| `POST /api/ledger/company-receipts/:paymentId/confirm` — "Công ty đã nhận" | `office` | `can(ledger.write)` | dòng đảo trỏ dòng giữ hộ gốc (I3) |
| `POST /api/ledger/settlements` — nộp / trả | `office` | `can(ledger.write)`; phân bổ theo đơn | trigger chỉ-thêm |
| `POST /api/ledger/refunds` — hoàn khách | `office` | `can(payment.refund)` | trigger chỉ-thêm |
| `POST /api/ledger/adjustments` — điều chỉnh / đảo | `office` | `can(ledger.write)`; lý do bắt buộc | I3 |
| `GET /api/ledger` — sổ mọi bên | `office` | `can(ledger.view)` (không ngữ cảnh ⇒ chỉ `any`) | — |
| `GET /api/ledger/mine` — "Sổ của tôi" | `staff` | `can(ledger.view, { ownerId: chính mình })`; chỉ hồ sơ của phiên | không trả tên/SĐT khách |
| `GET /api/orders/:id/receipt` — biên nhận (module `receipt`) | `staff` | `can(order.view, …) && can(money.view, …) && can(contact.view, …)` cùng `{ ownerId, assigned }` | `ReceiptDto` danh sách trắng; test số lạ 480.017; **chờ vá `DK-T3-01`** |
| `/api/parties*` sửa/gộp | không đổi (`office` / `admin`) | không đổi + **từ chối hồ sơ công ty chủ** ngoài `admin.manage` | `R-BIL-7`: đúng một hồ sơ công ty chủ |
| **CSDL** | — | — | luật trigger mới (ADR-0024 điều 5): thân trigger chỉ đọc bảng cùng module hoặc view công bố; bài kiểm kiến trúc đỏ khi cài tạm trigger `orders` đọc `bil_` |
| **Kiểm định kỳ** | — | — | `scripts/audit-invariants.mjs`: `R-BIL-1`, `-3`, `-4`, `-6`, `-7` từ L1; `R-BIL-2`, `-5` từ L2 |

## (4) Hệ quả chéo đã thấy khi ghép

1. **Loại mới trong bảng hồ sơ** (ADR-0024 điều 6 × ô `party.write` hiện hành): hồ sơ Tour Đảo không gắn tài khoản ⇒ nếu không chặn thì Bán hàng/Kế toán sửa/gộp được nó. Đã đưa vào ADR-0024 điều 6 (chỉ `admin.manage`).
2. **Người phụ trách cũ vs sổ** (ADR-0023 điều 1, proposed × ADR-0026 điều 7): HDV không còn thấy đơn đã bị chuyển đi, nhưng tiền mình thu trước vẫn là nợ của mình ⇒ "Sổ của tôi" đi theo **hồ sơ**, không theo đơn.
3. **Đổi người phụ trách không chạm `orders.updated_at`** (ADR-0025 × `dispatch`): khoá lạc quan của đơn không bắt được ⇒ câu bảo vệ của `dispatch` trong lô "Đã giao" (cạnh mới `billing → dispatch`, ADR-0024 điều 2).
4. **Ba cột cọc × form lập đơn** (ADR-0026 điều 9 × ADR-0011/0014): "đã thu trước" không còn đi cùng lô tạo đơn ⇒ hai bước; và vì đối tác/thực tập hôm nay đặt được cọc trên form, ô `payment.receive` của họ phải mở `own` để không mất năng lực.
5. **Đơn huỷ có cọc** (ADR-0014 điều 11 × ADR-0026): cọc cũ chuyển thành lần thu "chưa rõ" kể cả trên đơn đã huỷ ⇒ Kế toán thấy khoản cần hoàn trong sổ thay cho dấu nhắc ngoài hệ thống.
6. **"Còn lại" âm** (việc MỞ, `docs/CHANGE-GUIDE.md` §4 mục 32 × ADR-0025 điều 3d × ADR-0026 M2): không chặn sửa số khách; phần dư chờ Kế toán hoàn; đơn chưa "Đã giao" được tới lúc đó.
7. **Bảng tin** (ADR-0022 × ADR-0025): hai route mới ở `billing` (không phải `orders`/`dispatch`) phải nằm trong hàng rào "mọi route ghi đơn đều báo"; báo **sau** khi lô ghi xong, không bao giờ kích hoạt ghi tiền.
8. **Thời điểm chụp** (ADR-0018 điều 11 "lúc gửi đơn" × H5 "lúc Xác nhận"): đổi ở ADR của D4 (lượt 2); ADR-0026 đã ghi để không lọt.
9. **`receipt` và hạng module** (kế hoạch Bảng tin × ADR-0024): hạng `KHONG_DB` cấm nhắc `env.DB`; `receipt` cần chuyển tay cầm cho module khác ⇒ hạng mới `KHONG_BANG`, không nới hạng đã duyệt.
10. **Nút "Đã giao" cạnh nút huỷ của HDV** (ADR-0025 × `DK-T4-02`): cả hai đều không hoàn tác được ⇒ dùng chung một hộp xác nhận; vá `DK-T4-02` trước.
11. **Mâu thuẫn hai ADR đã duyệt, chưa hoà giải:** ADR-0003 (cột WHO, cấm `CASCADE`) × bảng `order_money_adjustment` (`0021`, theo ADR-0007 điều 2). Không chặn lượt 1 (bảng mới theo đúng ADR-0003); trình chủ riêng (ADR-0026 "Câu hỏi mở").
