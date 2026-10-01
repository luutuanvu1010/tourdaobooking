# Trang ghép — Sổ tiền lượt 2 (ADR-00xx-A…E)

- **Loại:** trang ghép theo `CLAUDE.md` §9 "Bước ghép khi duyệt" (bảng dùng chung nhận thêm loại dữ liệu mới; mỗi lượt ≤ 3 quyết định chạm quyền/dữ liệu). Bản nháp của người soạn (AI), 2026-10-01; **sửa vòng 1 theo người kiểm độc lập** (ĐẠT CÓ ĐIỀU KIỆN), bản sửa chưa được kiểm lại.
- **Mốc mã:** nhánh `worktree-doi-chieu-phieu-giam-doc` @`8f647226`; `main` @`0c4309cd`. Thứ tự cột quyền: `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER` (`src/shared/permissions.ts:44-48`).
- **Xây trên lỗ đang hở:** **không.** `docs/quyen-hoan.json` `phat_hien = []` ở `main` @`0c4309cd` và @`8f647226` (đọc 2026-10-01). Mục `thao_tac` đang hoãn (`task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue`) không ô nào thuộc lượt này.

## 0. Đếm trần 3 — bốn lượt duyệt, **một** bản phát hành

| Lượt | ADR | Quyết định chạm quyền / dữ liệu | Số |
|---|---|---|---|
| **2a** | A — hoa hồng + chụp | (1) module `pricing` + bảng `prc_commission_rule` + nguồn "loại dịch vụ" = nhóm ADR-0058 (view mới `v_ctl_service_group`) + ô `partner.commission.view/write`; (2) **đổi cách suy người hưởng**: từ "bên đặt có vai nhóm `EXTERNAL`" sang danh sách `prc_beneficiary_role` (view mới `v_pty_open_role`; đường để hồ sơ tổ chức / tài khoản Đối tác thành bên đặt; sửa ADR-0026 điều 1); (3) chụp lúc **Xác nhận** vào `ord_service_terms` (**sửa ADR-0018 điều 11**) + ô `order.terms.view` + ô **mới đề xuất** `order.terms.override` + chụp lại khi đổi bên đặt | **3** |
| **2b** | B — cung ứng | (4) vai `SUPPLIER` + bảng `prc_supply_term` + cột cung ứng trên `ord_service_terms` + ô `supply.terms.view/write` + X3; (5) người thu `BOOKER`/`SUPPLIER` ghi mới, **nới ADR-0026 điều 2** (khai người cầm tiền là bên đặt / nhà cung cấp — nợ ở người khai tới khi Kế toán xác nhận, C6) + `collected_for` + biên nhận chia phần | **2** |
| **2c** | C — Đã giao thương mại | (6) loại dòng mới + mở "Đã giao" cho đơn có người hưởng (đổi cả lớp SQL `hoan-tat-repo.ts:16, :76`) + lý do giữ mới + trigger `terms_missing`; (7) ai chịu giảm giá / trần giảm giá theo người hưởng (gỡ lệch 5.8, **kéo dài lệch 5.1** của ADR-0029 — C11); (8) **lệch có chủ ý L-C1** (5.1) + lớp CSDL một phần (C10) | **3** |
| **2d** | D — quyết toán + khoá kỳ; E — đối tác xem sổ | (9) module `ky-so` + bảng khoá kỳ + trigger ở `billing` và `van-chuyen` + ô `ledger.period.close` — **nới hàng rào đã duyệt** (Điều 9.4: `ALLOWED_EDGES`, `TABLE_PREFIX`/`VIEW_PREFIX`, `VIEW_CHO_TRIGGER_VC` — `de-xuat-luat.md`, C12); (10) phiếu bù trừ hai chiều nhiều đơn; (11) ô **mới** `ledger.partner.view` + DTO riêng (E) | **3** |

- **Thứ tự duyệt bắt buộc:** 2a → 2b → 2c (C dùng bản chụp của A và người bán / người thu của B). 2d sau 2c (E đọc dòng do C sinh và bảng kê tháng / cờ khoá của D).
- **Phát hành: một bản duy nhất** cho cả năm ADR. Lý do: ADR-0026 (bổ sung khi duyệt, 5.14) đặt hạn "**khoá kỳ có trong cùng bản phát hành với lượt 2 (D4/D5)**"; ADR-0057 L-T1 buộc khoá kỳ áp cho chi phí chuyến cùng lúc. Phát hành A/B mà thiếu D là **lỡ hạn đã duyệt**. Duyệt tách lượt chỉ để mỗi lượt đọc được.
- **Migration:** một (hoặc vài) tệp chỉ thêm, số dự kiến **từ `0060`** — `0056` là `0056_gop_ho_so` (nhánh `worktree-gop-ho-so`), `0057`–`0059` đã dùng ở kế hoạch máy chủ ô chặng; **chốt lúc gộp** theo luật "số lớn nhất trên `main` + 1", rà mọi nhánh chưa gộp trước khi đặt số.

---

## 1. Bảng bị chạm chứa những loại thực thể nào (bài học F-01)

| Bảng / view | Module | Chứa (sau lượt 2) | ADR | Chạm thế nào |
|---|---|---|---|---|
| `pty_party` | `parties` | hồ sơ **người** và **tổ chức**: nhân viên, tài xế công ty, đối tác (5 vai), tài xế đối tác, khách, khách của đối tác, công ty chủ, nhà xe, **nhà cung cấp (mới)** | B | chỉ được trỏ tới |
| `pty_party_role` / `pty_role_type` | `parties` | vai có hiệu lực theo ngày; nhóm `INTERNAL` / `EXTERNAL` / `OTHER`. `EXTERNAL` = 5 vai đối tác **+ `DRIVER_EXTERNAL`** (`0037:6`) | A, B | + mã `SUPPLIER` (nhóm `OTHER`) |
| `prc_beneficiary_role` (mới) | `pricing` | **danh sách vai được hưởng** — 5 vai đối tác; **không** `DRIVER_EXTERNAL`, `CARRIER`, `SUPPLIER`, vai nội bộ | A | tạo + gieo |
| `prc_commission_rule` (mới) | `pricing` | mức hoa hồng; **áp cho** đúng một: một **vai được hưởng** **hoặc** một **hồ sơ đối tác** (người hoặc tổ chức) | A | tạo |
| `prc_supply_term` (mới) | `pricing` | điều khoản cung ứng theo **dịch vụ / nhóm / mọi dịch vụ**; người bán = **công ty chủ** hoặc hồ sơ vai **`SUPPLIER`** | B | tạo + gieo dòng `ALL` → công ty chủ |
| `ctl_group`, `ctl_service_group` | `catalog` | nhóm dịch vụ (ADR-0058) | A, B | **chỉ đọc** qua view công bố mới `v_ctl_service_group` (nới `VIEW_PREFIX` thêm `ctl`; ADR-0058 hẹn "thêm `v_ctl_*` bằng ADR") |
| `v_pty_open_role` (view mới) | `parties` | `(party_id, role_type_code)` vai đang mở — **mọi** nhóm, kể cả `OTHER` (`SUPPLIER`, `CARRIER`) | A, B | tạo; `v_pty_open_role_group` cũ chỉ có nhóm nên không phân biệt được Tài xế đối tác / Nhà cung cấp |
| `orders` | `orders` | đơn: khách lẻ / bên đặt là đối tác / bên đặt nội bộ / bên đặt là hồ sơ khác (tài xế đối tác, nhà xe, nhà cung cấp…); `discount` cấp đơn | A, C | đọc `booker_party_id`, `discount`; **không** thêm cột |
| `order_service`, `order_item` | `orders` | dòng dịch vụ: **danh mục** / **nhập tay** (ADR-0061) / **đưa đón** (X3) | A, B | chỉ đọc (thành tiền, số khách theo hạng) |
| `ord_service_terms` (mới) | `orders` | **bản chụp** mỗi dòng dịch vụ: hoa hồng (`NONE`/`SET`/`MISSING`), người bán, nhà cung cấp, a%; nguồn `AUTO`/`MANUAL`; chuỗi thay thế | A, B | tạo; chỉ-thêm; khoá sau Đã giao |
| `bil_payment_receipt` | `billing` | lần thu: người thu **Công ty / Nhân viên / Bên đặt (mới bật) / Nhà cung cấp (mới bật) / Chưa rõ**; "thu cho" = công ty chủ **hoặc nhà cung cấp (mới)** | B, D | ghi mới hai vai; trigger khoá kỳ |
| `bil_posting` | `billing` | phiếu: Lần thu, Đã giao, Hoàn thành, Công ty đã nhận, Quyết toán (**+ bù trừ hai chiều**), Hoàn khách, Điều chỉnh, Đảo | C, D | trigger `terms_missing`, khoá kỳ |
| `bil_debt_line` | `billing` | dòng nợ hai chân giữa: công ty chủ ↔ **nhân viên** (giữ hộ, quyết toán, hoàn) ↔ **đối tác** (giữ hộ, **hoa hồng**, **giảm giá bên đặt chịu**, quyết toán) ↔ **nhà cung cấp** (giữ hộ, **giá vốn**, quyết toán); dòng nguồn **chuyến** (nhà xe) vẫn bị chặn | C, D | + 3 loại dòng (phương án A — câu C1) |
| `bil_debt_kind`, `bil_collector_role` | `billing` | tra cứu | B, C | thêm / bật dòng |
| `ky_period_close` (mới) | `ky-so` (mới) | tháng đã khoá — **một loại** | D | tạo |
| `vc_trip_cost_line` (ADR-0057 T2, **chưa có trên `main`**) | `van-chuyen` | chi phí xe thuê theo chuyến | D | trigger khoá kỳ (khi bảng có) |
| `v_bil_party_balance` | `billing` | số dư (bên, đối bên, đơn) | E | đọc, lọc theo hồ sơ của tài khoản |

**"Bảng này nay chứa ai" — các chỗ dễ thành lỗ:**
- **Người hưởng suy từ vai.** Lượt 1 suy "bên đặt có vai `EXTERNAL`". Nhóm `EXTERNAL` hôm nay có cả **Tài xế đối tác** (ADR-0048). Nếu giữ cách suy đó, văn phòng chọn một tài xế đối tác làm bên đặt ⇒ người đó thành người hưởng hoa hồng. **Chặn:** người hưởng chỉ suy từ `prc_beneficiary_role` (A điều 2–3); vai `EXTERNAL` ngoài danh sách ⇒ giữ đơn (`booker_not_beneficiary`); mức chỉ đặt được cho vai trong danh sách, và mức riêng chỉ đặt được cho hồ sơ đang mở một vai trong danh sách (trigger + `R-PRC-2`, `R-PRC-5`). Lớp chặn đơn đại lý của lượt 1 nằm **cả** ở câu SQL `hoan-tat-repo.ts:76` (và cột `co_nguoi_huong` `:16`) — ADR-C đổi cả hai để không còn đọc nhóm `EXTERNAL`.
- **`bil_debt_line` nay chứa nợ của đối tác và nhà cung cấp**, không chỉ nhân viên. Màn "Sổ của tôi" của nhân viên (ADR-0026 điều 7) và `GET /api/ledger` (Kế toán) phải **không** trộn: "Sổ của tôi" vẫn lọc theo hồ sơ của tài khoản; route Đối tác dùng DTO riêng (E).
- **Một hồ sơ có thể vừa là nhà cung cấp vừa là bên đặt** (vd i-resort tự đặt hộ khách). `SUPPLIER` nhóm `OTHER` nên **không** thành người hưởng trừ khi cũng mở một vai được hưởng; khi đó số dư **toàn hồ sơ** gộp cả giá vốn lẫn hoa hồng. Chặn lộ giá vốn: sổ Đối tác chỉ tính **các loại dòng phía đối tác** trên đơn hồ sơ là bên đặt (E điều 3) — không lấy `v_bil_party_balance` nguyên khối; cùng một đơn vừa bên đặt vừa nhà cung cấp ⇒ giữ `RULE_CONFLICT` (A điều 3). Ca số lạ `470.019` (E).
- **Tài khoản lai Đối tác + nội bộ** (ADR-0027): trần giảm giá (C điều 9) xét theo **người hưởng của đơn**, không theo tài khoản ⇒ không còn lọt; sổ Đối tác và "Sổ của tôi" là hai route riêng với hai ô riêng (`ledger.partner.view` / `ledger.view`).

---

## 2. Dòng bản đồ quyền nào chạm bảng này, áp cho loại nào

| Ô | Giá trị (9 cột) | Áp cho loại thực thể | ADR | Đổi? |
|---|---|---|---|---|
| `partner.commission.view` | any, any, any, none, none, any, none, none, none | đọc `prc_commission_rule` (mọi đối tác) + thử tra | A | **mới** |
| `partner.commission.write` | none, any, any, none, none, any, none, none, none | ghi `prc_commission_rule` | A | **mới** (tên ô có ở đặc tả §5 / LC-5 — đã chốt) |
| `order.terms.view` | any, any, any, assigned, own, any, own, none, none | đọc phần **hoa hồng** của `ord_service_terms` theo phạm vi đơn; PARTNER chỉ đơn mình | A | **mới**; khoá ⊆ `money.view` |
| `order.terms.override` | none, any, any, none, none, any, none, none, none | ghi bản chụp `MANUAL` (thả "thiếu mức", sửa trước Đã giao) | A | **mới — đề xuất, KHÔNG phải điều đã chốt** (đặc tả chỉ có một ô `partner.commission.write`; tách ô = câu bị thay ở ADR-A) |
| `supply.terms.view` | none, any, any, none, none, any, none, none, none | đọc `prc_supply_term` + phần **a% / giá vốn** của bản chụp | B | **mới** |
| `supply.terms.write` | none, any, any, none, none, any, none, none, none | ghi `prc_supply_term` | B | **mới** (câu C5) |
| `payment.receive` | own, any, any, assigned, own, any, own, none, none | ghi `bil_payment_receipt`; nay thêm người thu `BOOKER` (Đối tác = chính mình) và — nếu C6 = A — người có ô này **khai** người thu là bên đặt / nhà cung cấp của đơn, **dòng nợ nằm trên người khai** tới khi Kế toán xác nhận (khuôn H3) | B | ô **không đổi**; **luật sau ô đổi** (nới ADR-0026 điều 2) |
| `order.handover` | none, none, any, assigned, none, any, none, none, none | phiếu Đã giao (nay có dòng thương mại) | C | không đổi |
| `order.complete` | none, any, none, none, none, any, none, none, none | phiếu Hoàn thành (kiểm từng đơn) | C, D | không đổi |
| `order.create` / `order.modify` | (không đổi) | **trần giảm giá** của đơn có người hưởng — xét theo người hưởng, áp mọi người sửa (C8 = A) | C | ô không đổi; luật đổi |
| `ledger.write` | none, any, none, none, none, any, none, none, none | quyết toán (+ `bu_tru`), điều chỉnh, đảo | D | không đổi |
| `ledger.period.close` | none, any, none, none, none, any, none, none, none | ghi `ky_period_close` | D | **mới** |
| `ledger.view` | own, any, own, own, none, any, own, none, none | đọc `bil_debt_line`/số dư: `any` mọi bên; `own` = "Sổ của tôi" nhân viên | — | **không đổi** (PARTNER giữ `none` như ADR-0026 điều 10) |
| `ledger.partner.view` | none, none, none, none, own, any, none, none, none | đọc sổ phía đối tác (chỉ các loại dòng phía đối tác, trên đơn hồ sơ là bên đặt — ADR-E điều 3) | E | **mới**; `SUPER_ADMIN` = `any` theo luật ADR-0014 điều 2 (không chọn được bên ⇒ không mở thêm dữ liệu) |
| `money.view` | any, any, any, assigned, own, any, own, none, none | trần trên của `order.terms.view` | — | không đổi |
| `admin.manage` | none, none, any, none, none, any, none, none, none | gán vai `SUPPLIER` cho hồ sơ | B | không đổi |

**Hai nghĩa "của mình" (`own`) — có chủ ý, ghi để người kiểm và người thi công không gộp nhầm:**
- Ô **đơn** (`order.view`, `order.terms.view`, `payment.receive`… cột PARTNER `own`): "của mình" = đơn **mình lập** (`ownerId` = người lập).
- Ô **sổ đối tác** (`ledger.partner.view` cột PARTNER `own`): "của mình" = dòng sổ phía đối tác trên đơn mà **hồ sơ gắn tài khoản** là **bên đặt**.
- Hệ quả: đơn **nhân viên lập** với bên đặt là đại lý A ⇒ hiện trong **sổ** của A (mã đơn + số), nhưng A **không** mở được đơn và route phần thương mại của đơn đó (ADR-00xx-E điều 2, ADR-00xx-A điều 11).

**Route hiện có hỏi `ledger.view`** (`GET /api/ledger/mine` `billing/index.ts:173`, `GET /api/ledger` `:180`): **không đổi** — vì ô `ledger.view` không đổi; Đối tác đi ô riêng (người kiểm vòng 1, CAO-2: mở `ledger.view` PARTNER `own` thì route Đối tác cũng mở cho HDV / Bán hàng, và `/mine` phải có luật tay ngược).

**Cột `DRIVER`, `DRIVER_PARTNER`:** `none` ở mọi ô trên (bài ghim cả hàng của ADR-0040 / ADR-0048 phải vẫn xanh).
**Mỗi ô mới có route hỏi nó trong cùng bản phát hành** — không mục hoãn mới trong `docs/quyen-hoan.json`.

---

## 3. Cổng nào canh cửa nào

| Cửa (route / lô ghi) | Cổng router (ADR-0019) | Ô hỏi trong thân | Lớp CSDL | ADR |
|---|---|---|---|---|
| `GET/POST /api/pricing/hoa-hong[…]`, `GET /api/pricing/thu-tra` | `office` | `partner.commission.view` / `.write` | trigger không chồng, chỉ đóng, vai trong danh sách | A |
| `GET/POST /api/pricing/cung-ung[…]` | `office` | `supply.terms.view` / `.write` | trigger vai `SUPPLIER`, a% ⇔ người bán ≠ công ty, X3 | B |
| Lô **Xác nhận** `POST /api/orders/:id/status` | `orders` | (ô xác nhận hiện có) + trần giảm giá theo bản chụp | chèn bản chụp cùng lô; mỗi dòng một bản hiện hành | A, C |
| Đổi bên đặt đơn đã xác nhận (`PUT /api/orders/:id`) | `orders` | ô sửa hiện có | chụp lại cùng lô | A |
| `GET /api/orders/:id/thuong-mai` | `orders` | `order.view` (phạm vi) → `order.terms.view` → (khối a%) `supply.terms.view` | — | A, B |
| `POST /api/orders/:id/thuong-mai/:serviceId` | `office` | `order.terms.override` | chỉ-thêm; chặn sau Đã giao | A |
| `POST /api/orders/:id/payments` | `orders` | `payment.receive` + luật người thu (B điều 7–8; khai bên đặt / nhà cung cấp ⇒ nợ ở người khai tới khi Kế toán xác nhận — C6) | trigger khoá kỳ | B, D |
| Xác nhận "bên kia đã nhận" (phiếu `COUNTERPARTY_CONFIRMED`) | `office` | `ledger.write` | dòng đảo khớp gốc (0045) + khoá kỳ | B |
| Lô **Đã giao** `POST /api/orders/:id/delivered` | `orders` | `order.handover` | **câu ghi của `orders`** (`hoan-tat-repo.ts:76` — đổi điều kiện "bên đặt không `EXTERNAL`" thành "đủ bản chụp, không `MISSING`") + `delivered_paid` (có) + **`delivered_terms`** (mới) + trigger L-C1 (i)–(iv) nếu C10 = A + khoá kỳ | C |
| `POST /api/orders/:id/completed` | `office` | `order.complete` | `completed_settled` (có, theo đơn) | C, D |
| `POST /api/ledger/settlements` (+ `bu_tru`) | `office` | `ledger.write` | khoá kỳ | D |
| `POST /api/ledger/ky/:period/khoa`, `GET /api/ledger/ky` (module `billing`, gọi câu chưa chạy của `ky-so`) | `office` | `ledger.period.close` / `ledger.view any` | trigger `ky-so`: chỉ-thêm, **liền kề** (chỉ đọc `ky_period_close`); "chỉ tháng đã qua", "tháng đầu ≤ dòng sổ sớm nhất": ở mã route | D |
| `GET /api/ledger/doi-tac` | `orders` | `ledger.partner.view` (own = hồ sơ của tài khoản) | — (đọc); hàng rào số lạ, khoá tên trường, không chọn bên | E |
| Ghi chi phí chuyến (ADR-0057 T2) | `office` | `transport.cost.*` (ADR-0057) | trigger khoá kỳ đọc `v_ky_closed_period` | D |
| Biên nhận `GET /api/orders/:id/receipt` | (hiện có) | (hiện có) | — ; bài số lạ mở rộng | B |

**Không cửa nào** cho `DRIVER`, `DRIVER_PARTNER`. **Không cạnh** `billing ↔ van-chuyen`, `billing → pricing` (một nguồn số qua `orders`).

---

## 4. Ngoài phạm vi lượt 2 (chủ đã đưa vào sổ tồn đọng hoặc chưa hỏi)

- Hoá đơn VAT, tính thuế, cổng thanh toán, đối soát ngân hàng (ADR-0004 "vẫn KHÔNG làm").
- Giá theo mùa; trần giảm giá cho nhân viên (đơn khách lẻ); "giá riêng từng đại lý" theo nghĩa **giá bán cho khách** khác nhau (trái ADR-0027) — phiếu Giám đốc câu 11–13, `docs/BACKLOG.md` mục 10.
- Nợ nhà xe vào sổ, trả dư nhà xe (ADR-0057 Q11, Q12) — câu C7 (khuyến nghị tách). Lượt 2 **chỉ** áp khoá kỳ cho chi phí chuyến (L-T1).
- Nhà cung cấp / nhà xe tự xem sổ; đối tác xem bảng mức của mình.
- Phiếu Giám đốc B9 "đại lý trả ngay từng đơn": **không trái U3** — quyết toán từng đơn vẫn làm được bất cứ lúc nào (D điều 8), chỉ là có thêm cách gộp tháng. Không hỏi lại.
