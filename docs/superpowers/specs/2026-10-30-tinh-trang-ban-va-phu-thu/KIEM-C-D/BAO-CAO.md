# Báo cáo kiểm độc lập (chỉ đọc) — Lượt C (Lịch mùa) và Lượt D (Phụ thu mùa vụ)

- **Người kiểm:** subagent kiểm độc lập, chỉ đọc. Không sửa tệp nào ngoài tệp này. Không chạy lệnh chạm production.
- **Ngày:** 2026-10-30. **Mã đối chiếu:** worktree `.claude/worktrees/tinh-trang-ban`, nhánh `claude/tinh-trang-ban-va-phu-thu`, HEAD `a129d3d` (đã kiểm bằng `git log -1`).
- **Đối tượng:** `CD-lich-mua-va-phu-thu/` — `C-DE-XUAT-ADR.md`, `C-TRANG-GHEP.md`, `D-DE-XUAT-ADR.md`, `D-TRANG-GHEP.md`, `D-CA-VANG-DE-XUAT.md`.
- **Đầu vào chốt dùng để so:** `00-dau-vao/QUYET-DINH-CHU-2026-10-30-LUOT-3-PHU-THU-VA-DAC-DIEM.md` (thắng tệp cũ; P-1…P-5, GĐ-1…GĐ-4), `QUYET-DINH-CHU-2026-10-30-TINH-TRANG-BAN-VA-GIA-MUA.md`, `BO-SUNG-…`; `CLAUDE.md` §3, §7, §9; `docs/ARCHITECTURE.md` Phần I (5.4, 5.5, 5.6, 5.17); `docs/quyen-hoan.json`; ADR-0146, ADR-0147, ADR-0148; bản B (`B-dong-ban/DE-XUAT-ADR.md`) và A (`A-dac-diem-dich-vu/DE-XUAT-ADR.md`) để kiểm nhất quán (chỉ đọc, không chấm A/B).
- **Quy ước:** «[đã mở tệp]» = tôi đã mở đúng tệp:dòng và thấy như ghi; «[suy luận]» = kết luận rút từ mã đã đọc nhưng chưa chạy thử.

## Kết luận

| Đề xuất | Kết luận | CHẶN | NÊN SỬA | GHI NHẬN |
|---|---|:-:|:-:|:-:|
| C (`C-DE-XUAT-ADR.md` + `C-TRANG-GHEP.md`) — Lịch mùa | **ĐẠT CÓ ĐIỀU KIỆN** (điều kiện: sửa C-1) | 1 | 3 | 6 |
| D (`D-DE-XUAT-ADR.md` + `D-TRANG-GHEP.md`) — Phụ thu mùa vụ | **KHÔNG ĐẠT** (hai lỗ tiền chưa được thiết kế) | 2 | 10 | 5 |
| Ca vàng (`D-CA-VANG-DE-XUAT.md`) | **ĐẠT CÓ ĐIỀU KIỆN** — tính tay lại 24 ca/biến thể: **không ca nào sai số**; điều kiện: thêm các ca ở V-1 | 0 | 1 | 1 |

---

## Phần 1 — Lượt C (Lịch mùa, không chạm tiền)

### Khẳng định hiện trạng đã đối chiếu

| Khẳng định của C | Kết quả |
|---|---|
| Không có «âm lịch / lunar / holiday» trong `src/`, `web/`, `scripts/` | **Đúng** [đã chạy `grep -rilE` — rỗng] |
| `package.json` không có khoá `dependencies` | **Đúng** [grep rỗng] |
| `migrations/` lớn nhất `0127_dua_don_theo_dich_vu.sql` | **Đúng** [`ls migrations`] |
| `order_service.depart_date` ở `0008_order_service.sql:17` | **Đúng** [đã mở tệp] |
| `rules.ts:153` `sameDepartDate`; `service-rules.ts:366` `tripUpdateKeepsOneDate`; `trip-rules.ts:12-30` | **Đúng** [đã mở tệp] |
| `PUT /api/orders/:id/trip` ở `orders/index.ts:1289-1344`, khoảng ngày `service-rules.ts:360` | **Đúng** [đã mở tệp; kiểm khoảng ngày ở dòng 361] |
| `ALLOWED_EDGES`: `catalog: ["audit"]`, `orders: [… "pricing"]`, `pricing: ["parties","catalog","audit"]` | **Đúng** [đã mở `src/architecture.test.ts:20-75`] |
| `admin.manage: quanTri()` ở `permissions.ts:185`; `quanTri` = ADMIN + SUPER_ADMIN | **Đúng** [đã mở dòng 58, 185] |
| ADR-0147 Đ2 khuôn «điều kiện (khoá, giá trị) + bảng tra cứu + danh sách đăng ký» | **Đúng** [đã mở `docs/adr/ADR-0147…md:61-64`] |
| «Lượt B chưa có văn bản lúc soạn» | **Nay đã sai**: `B-dong-ban/DE-XUAT-ADR.md` đã có (xem C-1) |

### Phát hiện

**C-1 — CHẶN — Đ4.1, Đ4.4, trang ghép mục 1, 2, 3, 5.1, 5.6: tên bảng, ô quyền, hàm cổng và cạnh phụ thuộc lệch bản B đã có văn bản.**
- Bằng chứng [đã mở tệp]: B chốt bảng **`ctl_sale_suspension`** ở `catalog` (`B-dong-ban/DE-XUAT-ADR.md:101`), và nói rõ tên `cat_stop_sale` **sẽ làm bài kiến trúc đỏ** vì tiền tố `ctl_` thuộc `catalog` (B dòng 75, dẫn `src/architecture.test.ts:212`). Ô quyền của B là **`catalog.sale.suspend`** / **`catalog.sale.resume`** (B dòng 326-332), không phải `catalog.availability.write` như C-trang ghép mục 2. Hàm cổng chung của B là **`congBanDuoc` đặt ở `orders`** (B dòng 201), gọi `catalog` qua `index.ts`; B cấm `orders` nhắc tên bảng `ctl_sale_suspension` (B dòng 191, 399).
- Hệ quả: C xin chủ duyệt **nới hàng rào** (Điều 9.4) bằng câu điều kiện «`catalog → lich-mua` nếu B đặt ở `catalog`». Nay B đã chọn: bảng ở `catalog`, hàm xét ở `orders`. Ai tính điều kiện mùa (hàm của `catalog` được `orders` gọi, hay `orders` tự đọc view mùa)? Từ đó mới biết cạnh cần nới là `catalog → lich-mua`, `orders → lich-mua`, hay cả hai. DTO `GET /api/catalog/for-order` (thuộc `catalog`) cũng cần biết mùa để làm mờ dịch vụ theo ngày (trang ghép C mục 3), nên rất có thể cần `catalog → lich-mua` và `catalog` vẫn còn LEGACY (SQL mới chỉ ở tệp nửa nghiêm). Trang ghép là điều kiện đủ của lượt duyệt (`CLAUDE.md` §9), nên không được mang tên sai.
- Sửa đề nghị: viết lại Đ4.1, Đ4.4 và trang ghép mục 1–3, 5 theo B: bảng con `ctl_sale_suspension_condition` (hoặc tên tạm khác có tiền tố `ctl_`) với `suspension_id` → `ctl_sale_suspension.id`; ô của B là `catalog.sale.suspend/resume`; nêu **đích danh** cạnh cần nới (đề nghị: `catalog → lich-mua` cho bộ tính điều kiện và DTO danh mục; `pricing → lich-mua` cho D). Bỏ mọi câu «nếu B…».

**C-2 — NÊN SỬA — Đ2.2, trang ghép mục 2: chọn ô quyền ngược với lựa chọn B vừa ghi.**
C cho luật **có điều kiện** dùng `admin.manage` và «nhận thêm nghĩa». B lại **bác** việc dùng `admin.manage` cho mở lại, với lý do ô đó gom quá nhiều việc (B dòng 340). Hai bản sẽ cùng ghi một bảng (`ctl_sale_suspension` và bảng con của C), nên phải dùng cùng một logic chọn ô. Sửa: hoặc dùng ô của B (ví dụ `catalog.sale.resume` cho cả ghi và kết thúc luật có điều kiện, vì cùng tập Quản trị + Toàn quyền), hoặc thêm ô riêng `catalog.sale.condition.write` (thao tác mới, không phải mã quyền mới). Tránh mở rộng nghĩa `admin.manage`.

**C-3 — NÊN SỬA — Đ4 với B Đ6 (thông báo) và B7 (lý do bắt buộc): chưa nói luật có điều kiện kế thừa gì của B.**
B đòi `reason` bắt buộc (`CHECK` 1–200, B dòng 113). B6 báo cho người có nháp hoặc đơn chờ chứa dịch vụ bị đóng. C không nói: một điều kiện thường trực như «không chạy thứ Tư» khi thêm vào có phát thông báo B6 cho mọi người có nháp không, và lý do lấy từ đâu. Trong C-trang ghép mục 3, nhãn mờ cũng đổi nghĩa thành «phụ thuộc ngày đi đang chọn», tức là đổi hợp đồng DTO `for-order` của B. Sửa: thêm một mục «C ↔ B6/B7» trong trang ghép.

**C-4 — NÊN SỬA — Tiêu chí nghiệm thu 6 và 2.**
- Tiêu chí 6 («bài: đếm tệp đổi = 0 ngoài dữ liệu») không kiểm được bằng máy theo nghĩa của P20. Đề nghị viết lại: «thêm mùa `LE_LUAT` neo dương 24/11 qua route; hàm gợi ý trả khoảng 24/11 năm sau; không có hằng ngày lễ nào trong mã chạy (bài quét của tiêu chí 7)».
- Tiêu chí 2 phụ thuộc B. Nên ghi rõ phần kiểm ở mức hàm thuần làm được ngay, và phần e2e làm khi B thi công.

**C-5 — GHI NHẬN — Đếm trần 3.** Tôi tự đếm lại và ra **3**: Đ1 dữ liệu, Đ2 quyền, Đ4 dữ liệu (bảng mới đặt trong phân hệ của B). Đ3 chỉ là mã thuần, cột gợi ý đã nằm trong Đ1. Việc nới `ALLOWED_EDGES` là luật hàng rào (Điều 9.4), không chạm quyền hay dữ liệu. Tôi không cộng nó vào trần, nhưng nó **bắt buộc** phải là một dòng chủ duyệt đích danh (C-1). C đã đưa việc này vào Đ1 và C-Q5, nên chấp nhận được.

**C-6 — GHI NHẬN — Âm lịch.** Tôi đã kiểm Đ3.2: không dùng dependency runtime, thuật toán thuần ở `src/shared/`. Các ngày Tết 2027 = 06/02/2027, Tết 2028 = 26/01/2028, Giỗ Tổ 2026 = 26/04/2026 và 2027 = 16/04/2027 do người soạn tự tính. **Chưa đối chiếu nguồn chính thức.** Tôi cũng không đối chiếu: trí nhớ của tôi khớp với các ngày này, nhưng đó không phải bằng chứng. Bài test để `todo` cho tới khi có người xác nhận (tiêu chí 5) là đúng. Phép tính khoảng gợi ý 05/02–09/02/2027 (neo 06/02, lệch −1, 5 ngày) đúng số học.

**C-7 — GHI NHẬN — `lm_season` cho `UPDATE` tên và ưu tiên (Đ1.2), không theo 5.5 «chỉ thêm».** Ưu tiên quyết định mùa nào thắng ở D, tức là quyết định phụ thu của nháp. Đơn đã xác nhận không bị ảnh hưởng vì đã chụp dòng, và có nhật ký trước→sau nên vẫn truy được. Chấp nhận như bảng tra cứu, nhưng D nên ghi rằng dòng phụ thu chỉ truy được quy tắc, không truy được ưu tiên tại lúc tính.

**C-8 — GHI NHẬN — Logic khoá cứng nhỏ:** mốc nhắc «từ 1/10 năm Y−1» (Đ3.4) là hằng trong mã. Đây là bề mặt, đảo ngược được; nên ghi «[người soạn], đổi bằng mã». Nguyên tắc của chủ «logic nghiệp vụ là dữ liệu» không bị phạm nặng.

**C-9 — GHI NHẬN — «Đặc điểm nếu lượt A duyệt» (Đ4.1).** Bảng của B chỉ có phạm vi `SERVICE`/`GROUP` (B dòng 106), không có phạm vi theo đặc điểm. Đặc điểm của A chỉ gắn vào luật bán `prc_sales_block` (A dòng 93). Câu của C gợi ý một phạm vi B không có, nên bỏ câu đó hoặc ghi «không thuộc lượt này».

**C-10 — GHI NHẬN — Hai sổ khoá điều kiện.** ADR-0147 Đ2 (phí đón) đã có một danh sách khoá điều kiện, và chính ADR đó dự kiến thêm khoá «mùa» sau (ADR-0147:63). C dựng danh sách khoá thứ hai trong `catalog`. Không sai luật, nhưng lệch hướng «một ngữ pháp» của `KHUNG-CHINH-SACH-CHUNG`. Nên nói một câu vì sao không dùng chung.

**C — «Xây trên lỗ đang hở»:** C ghi «không». Tôi đã đọc `docs/quyen-hoan.json`: sáu mục HIGH đang mở (TNV-G1, TNV-G3, TNV-G4, HC-5.19 hạn 05/11, HC-5.11, HC-4.2). C không chạm tiền, sổ hay Cron. **Đồng ý.**

---

## Phần 2 — Lượt D (Phụ thu mùa vụ, CHẠM TIỀN)

### Khẳng định hiện trạng đã đối chiếu (từng chỗ người điều phối yêu cầu soi)

| Khẳng định của D | Kết quả |
|---|---|
| R2 `retailPricesOnly` `price-guards.ts:110-111`: mọi dòng phải có `catalogPrice ≠ null` và `unitPrice = catalogPrice` | **Đúng** [đã mở tệp]. `viPhamGiaDanhMuc` ở `:151-154` |
| Xác nhận đọc dòng **đã lưu** ở `xac-nhan-chung.ts:91` | **Đúng** [đã mở tệp]: `viPhamGiaDanhMuc(actor, order.services.flatMap((s) => s.items))`. Dòng phụ thu `catalog_price NULL` ⇒ mọi đơn Đối tác/Thực tập có phụ thu nhận 403. Tiêu chí 3 (đỏ trước) **đúng** |
| `tienChoHoaHong` `xac-nhan-chung.ts:55-59` cộng `lineTotal` mọi dòng | **Đúng** [đã mở tệp]. Nơi gọi: `xac-nhan-chung.ts:111`, `orders/index.ts:310` (trần giảm giá lúc lập/sửa), `:754` (`phanThuongMaiCuaDon`), `:1635` (đổi bên đặt). D chỉ nêu `:55-59` và `:751`; xem D-12 |
| `soKhachTinhHoaHong` `pricing/rules.ts:147-149` cộng `quantity` mọi dòng | **Đúng, chỉ với dịch vụ nhóm** [đã mở tệp]: dịch vụ theo người đếm `payingGuests(pax)`, không đọc dòng. D ghi đúng «bắt buộc với dịch vụ nhóm» |
| `storedUnitPrices` `service-rules.ts:162-169` ghi đè theo `pax_code` ⇒ «đơn giá người lớn bị thay bằng số phụ thu» khi sửa số khách | **Đúng về mã, sai về hậu quả mô tả** [đã mở tệp]: trên đường sửa số khách, `snapshotService` (`service-rules.ts:146-155`) chạy **trước** và trả `null` ngay khi gặp dòng `catalogPrice === null` (dòng 151). Kết quả thật là **từ chối** («không sửa được qua đường này» — `money-adjustment.ts:27`, `service-rules.ts:183`), không phải tính sai giá. Chỗ ghi đè **thật sự gây sai tiền** nằm ở chỗ khác (D-2) |
| Sổ công nợ `gross` = Σ thành tiền dịch vụ (`billing/service.ts:334-339`); giảm giá bên đặt chịu = `max(0, gross − phải thu)` (`:578`); `grossSnapshot: tm.gross` (`:587`) | **Đúng** [đã mở tệp] |
| Trigger 0112 (iii) hoa hồng + giá vốn ≤ `gross_snapshot`; (iv) `GIAM_GIA_BEN_DAT` = `gross − due` | **Đúng** [đã mở `migrations/0112_so_dai_ly_dot_2.sql:58-75`]. Nhận xét «(iv) không bắt được vì so với chính `gross_snapshot` sai» **đúng**: khi `max(0,…) = 0` thì không chèn dòng nào, trigger không chạy |
| H1 `order_item` (0003:25-34), trigger `line_total` (0007), `service_id/catalog_price/pax_code` (0008:31-33) | **Đúng** [đã mở tệp] |
| H2/H3 trigger 0081 (khoá dòng tiền, tạm tính = Σ dòng lúc xác nhận) | **Đúng** [đã mở tệp] |
| H4 `createOrder :957`, `updateDraftOrder :1014`, `DELETE FROM order_item :1051` | **Đúng** [đã mở tệp] |
| H5 dịch vụ nhóm: một dòng, `quantity = ⌈khách/N⌉`, `pax = adult`, chỉ một ô số khách | **Đúng** [đã mở `order-lines.ts:102-123`] |
| H7 ba cửa qua `kiemCongXacNhan`; Gửi xác nhận chốt riêng | **Đúng** [đã mở `xac-nhan-route.ts:100-128, 150, 309`; `index.ts:1703`] |
| H13/H14/H15 `sinhPhieuDaGiao`, `nhaCungCapCuaDon :533-541`, `chiaPhanBienNhan receipt/rules.ts:45`, danh sách trắng `:117` | **Đúng** [đã mở tệp] |
| H16 `prc_beneficiary_role` (0090:19), `pricing/repository.ts:76/86` | **Đúng** [đã mở tệp]; xem D-9 |
| H17 `partner.commission.view/write` `permissions.ts:161-162` đúng tập G6 | **Đúng** [đã mở tệp; thứ tự cột ở dòng 45-48] |
| H9 `hoa-hong-dong.ts` một nguồn; hàng rào `hoa-hong-mot-nguon.test.ts` | **Đúng tệp**, nhưng D dùng sai hàng rào (D-5) |
| H18 `KieuMuc = "RATE" \| "PER_PAX"`; ADR-0147 «loại dòng mới» của `order_item` | **Đúng** [`hoa-hong-dong.ts:6`; `ADR-0147…md:73`] |

### Chỗ cộng dòng tiền của dịch vụ mà D bỏ sót (tôi tự rà `src/`, `web/`, `scripts/`)

| Chỗ | Đọc dòng thế nào | D có nêu? | Hậu quả nếu không lọc dòng phụ thu |
|---|---|---|---|
| `src/shared/service-form.ts:139-187` (`snapshotItem`, `draftFromDto` — **form sửa nháp ở trình duyệt**) | `saved[it.paxCode] = it.unitPrice` (dòng 166, ghi đè); `snapshotItem` trả null khi `catalogPrice === null` | **Không** | Sai tiền (D-2) |
| `src/modules/orders/service-rules.ts:146-155, 203` (`snapshotService`, Q11 «giữ bản chụp» khi lưu nháp) | trả null khi gặp dòng không có giá danh mục | **Không** | Mất bản chụp Q11 ⇒ tra danh mục hiện hành, `catalog_changed` / `catalog_unavailable` trên nháp cũ (D-2) |
| `money-adjustment.ts:27, 140` (`editablePaxCodesOf` — «Việc của tôi» của HDV) | qua `snapshotService` | **Không** | HDV mất ô sửa số khách của dịch vụ có phụ thu |
| `xac-nhan-route.ts:257-316` (**Còn vé kèm đổi ngày đi**) | cổng xét theo `order` ngày cũ; lô xác nhận đổi `depart_date` | **Không** | Chụp phụ thu sai mùa (D-1) |
| `scripts/audit-thuong-mai.mjs:45-53` + `scripts/audit-checks.mjs:121-127` (R-BIL-2, R-ORD-DC1 — **kiểm định kỳ**) | `thanhTien` = Σ `lineTotal` mọi dòng; `soKhachTinhHoaHong` trên mọi dòng | **Không** (D chỉ thêm kiểm mới) | Báo vi phạm giả sau đơn có phụ thu đầu tiên; `audit-invariants --db remote` trong `npm run trien-khai` đỏ (D-6) |
| `orders/index.ts:310`, `:1635` (`tienChoHoaHong` cho trần giảm giá lúc lập/sửa và đổi bên đặt) | mọi dòng | Gộp chung «mọi nơi», không nêu đích danh | Trần R3 sai nếu đường đó đọc dòng đã lưu (D-12) |
| `src/shared/order-confirmation.ts:201-208` (biên nhận và ảnh xác nhận dựng ở trình duyệt), `web/confirmation-image.ts` | mỗi dòng một hàng; «Tạm tính» của dịch vụ = Σ mọi dòng khi ≥ 2 dòng | Có nêu, nhưng ghi «chưa kiểm» | Dòng phụ thu tự hiện dưới dịch vụ (G5 tự đạt). Tạm tính từng dịch vụ gồm cả phụ thu. Phần Tour Đảo/nhà cung cấp chỉ đúng nếu `receipt/rules.ts:45` lọc [đã mở tệp] |
| `orders/rules.ts:173-177` (tạm tính lúc lập) | Σ dòng dịch vụ | Ngầm (Đ2.2 «cộng vào subtotal») | Kiểm «giảm giá ≤ tạm tính» chạy trước khi có phụ thu (chặt hơn, không lỗ) [suy luận] |
| Hoàn/huỷ, phải thu (`hoan-tat.ts:phaiThuCua`, `computeEffectiveMoney`) | qua `effectiveSubtotal` | Có (vùng TNV-G1) | `effectiveService` lùi về «own» khi tính lại lỗi. Nếu lọc làm dở thì tổng danh sách sai im lặng [suy luận] |
| Bảng kê / xuất báo cáo | Không thấy route xuất tiền đơn (grep `text/csv`, `xlsx`, `bang-ke` chỉ ra `van-chuyen` — tiền xe) | — | Không áp dụng |

### Phát hiện

**D-1 — CHẶN — Đ2.3, Đ2.4, trang ghép mục 3: bỏ sót cửa «Còn vé kèm đổi ngày đi», chụp phụ thu sai mùa.**
- Bằng chứng [đã mở tệp]: `POST /api/orders/:id/quyet-dinh` nhận `body.ngayDi` (`xac-nhan-route.ts:263-267`). Cửa này gọi `kiemCongXacNhan(…, order, …)` với `order` mang **ngày cũ** (`:309`), rồi **trong cùng lô xác nhận** đổi `order_service.depart_date` (`cauDoiNgayDichVu`, `:313-316`; câu `UPDATE` ở `xac-nhan-repo.ts:83`), sau đó `soanXacNhan` khoá dòng tiền.
- Cổng phụ thu D đặt trong `kiemCongXacNhan` sẽ so «phụ thu mong đợi theo ngày đang lưu» với dòng đã lưu, nên khớp và cho qua. Đơn được xác nhận với ngày mới (có thể rơi vào Tết) nhưng mang phụ thu của ngày cũ (có thể là 0), hoặc ngược lại. Sau đó 0081 khoá dòng, G4 giữ nguyên. Kết quả: công ty mất phụ thu, hoặc khách bị thu phụ thu của mùa không đi.
- Sửa đề nghị: thêm vào Đ2.3: «Còn vé kèm `ngayDi`: tính phụ thu mong đợi theo **ngày mới**; khác dòng đã lưu ⇒ 409 `surcharge_changed`, câu cho người xét duyệt (chọn Hết vé / Huỷ, hoặc Còn vé không đổi ngày; người lập Rút lại, sửa ngày, Lưu)». Thêm vào trang ghép mục 3 và một ca vàng (V-1). B đã xử lý đúng cửa này cho đóng bán (B dòng 235, tiêu chí 9), nên D phải theo cùng thứ tự.

**D-2 — CHẶN — Đ2.6, Hệ quả, tiêu chí 10: danh sách «mọi chỗ đọc `order_item` phải tách hai loại» thiếu chỗ ghi đè đơn giá thật sự gây sai tiền, và mô tả bẫy `storedUnitPrices` sai hậu quả.**
- Bằng chứng [đã mở tệp]: form sửa nháp ở trình duyệt `draftFromDto` (`src/shared/service-form.ts:164-176`) chạy `for (const it of dto.items) if (it.paxCode !== null) saved[it.paxCode] = it.unitPrice;`. Dòng phụ thu mang `pax_code = adult` và đứng sau dòng dịch vụ (`ITEM_SELECT … ORDER BY sort_order`, `repository.ts:91`), nên `saved.adult` = **số phụ thu**. `snapshotItem` (`:140-149`) trả null vì `catalogPrice === null`, nên thẻ dùng `unitPrices: { ...defaultPrices(liveItem), ...saved }` (`:176`): đơn giá người lớn của dịch vụ = số phụ thu.
- Bằng chứng [suy luận]:
  - Bán hàng mở lại một nháp có phụ thu rồi bấm Lưu: máy chủ nhận đơn giá thỏa thuận người lớn = 100.000 thay cho 1.050.000 (văn phòng được bán lệch giá), và **hạ giá dịch vụ im lặng**, chỉ có nhãn «Khác giá danh mục».
  - Đối tác mở lại nháp của mình: 403 R2, không lưu được.
  - Phía máy chủ: `snapshotService` (`service-rules.ts:146-155`) trả null nên mất bản chụp Q11 (`:203`), nháp cũ bị đối chiếu lại với giá danh mục hiện hành (`catalog_changed`/`catalog_unavailable`). `editablePaxCodesOf` (`money-adjustment.ts:140`) trả rỗng, và `planMoneyEdit` từ chối.
  - Tiêu chí 10 «đỏ trước: `storedUnitPrices` ghi đè» sẽ không quan sát được: bài đỏ thật là «từ chối sửa số khách».
- Sửa đề nghị:
  - Đ2.1/Đ2.6 ghi rõ: DTO đơn (`OrderServiceDto.items`) **tách** dòng phụ thu ra trường riêng (ví dụ `phuThu[]`), hoặc mọi hàm dựng bản chụp/đơn giá đọc qua **một** hàm «là dòng dịch vụ».
  - Thêm vào «Hệ quả»: `snapshotService` (server), `snapshotItem` + `draftFromDto` (`service-form.ts`), `editablePaxCodesOf`, `web/service-card.ts`.
  - Viết lại tiêu chí 10 thành hai bài đỏ trước: (a) sửa số khách đơn có phụ thu ⇒ hôm nay bị từ chối; (b) mở lại nháp có phụ thu trên form rồi Lưu ⇒ hôm nay đơn giá người lớn của dịch vụ đổi thành số phụ thu (bài thuần trên `draftFromDto` + `toBody`).
  - Thêm một ca vàng (V-1).

**D-3 — NÊN SỬA — «Chia lượt» (dòng 7): D1 phát hành được mà không có D2, trái P-4 đã chốt.**
P-4 là quyết định **đã chốt**: «có đối tác sẽ được miễn phụ thu». D viết «D2 duyệt sau D1, có thể phát hành cùng **hoặc sau**». Nếu D1 có hiệu lực cho một mùa thật trước D2, đối tác đáng được miễn sẽ bị thu, và đơn đã xác nhận thì giữ phụ thu (G4, 0081). Sửa: «D1 không được có hiệu lực cho mùa thật (không có khoảng mùa nào gắn quy tắc phụ thu) trước khi D2 phát hành; hoặc phát hành D1 + D2 cùng lần». Đây là điều kiện phát hành, không thêm quyết định.

**D-4 — NÊN SỬA — Mục «Đếm»: số 3 của D1 dựa vào việc gộp; chủ nên được nói rõ.**
Đếm theo «điều» như D viết: D1 = 3, D2 = 1, gộp = 4. **Tôi đồng ý cách tách D1/D2.** Nhưng Đ2 gộp ít nhất ba thay đổi độc lập, mỗi cái chạm dữ liệu hoặc quyền ở ba phân hệ:
- loại dòng mới trong `order_item` (`orders`);
- R2 đổi phạm vi xét: luật giá theo quyền của Đối tác/Thực tập;
- **đổi nghĩa cột sổ** `bil_posting.gross_snapshot` (`billing`, trang ghép D mục 1 tự ghi «đổi nghĩa cột»).

Đ1 cũng gộp bảng mới với ô quyền mới **và** đổi nghĩa ô `partner.commission.view` (D-Q9). Nếu tách đổi nghĩa `gross_snapshot` thành điều riêng thì D1 = 4. Sửa: tách «Sổ công nợ: `gross_snapshot` gồm phụ thu» thành một dòng riêng trong bảng đếm, kèm khuyến nghị. Có thể chuyển nó sang D2 (D2 thành 2), vì D1 không phát hành một mình được (D-3). Hoặc ghi rõ «gộp có chủ ý, chủ chấp nhận». Bài học F-01 ở `CLAUDE.md` §9 chính là ba thay đổi đúng riêng lẻ nhưng sai khi ghép.

**D-5 — NÊN SỬA — Đ2.2, Hệ quả, trang ghép mục 6: dùng sai hàng rào `hoa-hong-mot-nguon` — sẽ thành nới hàng rào.**
Bằng chứng [đã mở `src/hoa-hong-mot-nguon.test.ts:1-8, 38-44`]: `PHAN_VAN_DA_RA` chỉ dành cho chỗ **đã rà là KHÔNG phải công thức tiền**. Chú thích ghi nguyên văn «Chỗ nào thật sự tính hoa hồng / giá vốn / làm tròn tiền thì KHÔNG được thêm vào đây: đưa về `hoa-hong-dong.ts`». D đề xuất thêm `src/shared/phu-thu.ts` (tính phần trăm và làm tròn tiền) vào chính danh sách đó. Như vậy là **nới** một hàng rào đã có (Điều 9.4), không phải «công thức phần vạn ở một tệp». Tiêu chí 16 của D cũng tự mâu thuẫn với việc này. Sửa: (a) đặt hàm làm tròn phụ thu vào `src/shared/hoa-hong-dong.ts` (tệp nguồn `NGUON`); `phu-thu.ts` chỉ gọi hàm đó để sinh dòng. Hoặc (b) đổi hàng rào thành «hai tệp nguồn có tên» và ghi đây là sửa hàng rào cần chủ duyệt. Ghi thêm: phụ thu làm tròn **lên** tới 1.000 ₫ (P-3), còn hoa hồng làm tròn **nửa lên** tới đồng. Hai luật làm tròn khác nhau thì càng nên ở cùng một tệp.

**D-6 — NÊN SỬA — Hệ quả, «Kiểm định kỳ»: kiểm định kỳ hiện có sẽ báo vi phạm giả.**
Bằng chứng [đã mở tệp]: `scripts/audit-thuong-mai.mjs:45-53` tính `thanhTien` = Σ `lineTotal` và `soKhachTinhHoaHong` trên **mọi** dòng của dịch vụ, lấy từ `scripts/audit-checks.mjs:121-127` (`COT_DICH_VU`, JSON mọi dòng `order_item` của dịch vụ). Đây là dữ liệu cho R-BIL-2 và R-ORD-DC1, dùng để so hoa hồng đã ghi với hoa hồng tính lại. Có phụ thu thì số tính lại lệch: dương giả với `RATE`, gấp đôi lượt với `PER_PAX` nhóm. `audit-invariants --db remote` chạy trong `npm run trien-khai`, nên lần phát hành sau đơn có phụ thu đầu tiên sẽ đỏ. Sửa: thêm vào Hệ quả «`COT_DICH_VU` lọc `line_kind IS NULL` (hoặc dùng hàm "là dòng dịch vụ")», kèm bài `src/audit-invariants.test.ts` có ca phụ thu.

**D-7 — NÊN SỬA — «Xây trên lỗ đang hở» TNV-G3 không theo luật nhị phân của «dừng dây chuyền».**
Bằng chứng [đã mở `docs/quyen-hoan.json`]: TNV-G1 và TNV-G3 HIGH, hạn 30/11. Mỗi mục có `xay_tren_cho_phep` riêng cho QR, sổ đại lý đợt 2, phí đón; **không có câu nào cho phụ thu**.
- TNV-G1: D ghi đúng «xây trên lỗ đang hở: TNV-G1», «không được duyệt trước khi lỗ được vá hoặc chủ ghi cho xây», và đưa vào D-Q8. **Đạt** `CLAUDE.md` §3.
- TNV-G3: D ghi «chạm gần … ghi để chủ quyết», nhưng D-Q8 **chỉ hỏi TNV-G1**. Luật §3 đòi ghi «xây trên lỗ đang hở: <mã>» khi chạm vùng đang hở; không có hạng «chạm gần». D tự nói Đ2.9 đổi cách tính `gross_snapshot` trên phiếu «Đã giao», tức là đúng phiếu mà lệnh Thay lần thu của TNV-G3 xử lý sau khi giao.
- Sửa: ghi «xây trên lỗ đang hở: TNV-G1, TNV-G3» và mở rộng D-Q8 cho cả hai.
- Nên ghi thêm: tiền lệ gần nhất về đổi sổ «Đã giao» (sổ đại lý đợt 2, 18/10) chủ đặt điều kiện «chỉ phát hành sau diễn tập khôi phục» (HC-5.19). Khuyến nghị «không đặt điều kiện diễn tập» của D-Q8 viện tiền lệ phí đón, nhưng phí đón không đổi nghĩa cột sổ. Cần nói rõ khác biệt này cho chủ.

**D-8 — NÊN SỬA — Đ2.11, Đ1.3, trang ghép mục 2: Đối tác và Thực tập không gọi được «Thử tính» để xem «Phụ thu (dự kiến)» trên form.**
D cho form lập đơn lấy số dự kiến từ route «Thử tính» (Đ1.5), nhưng gắn route đó vào `partner.commission.view` (Bán hàng, Kế toán, Quản trị, Toàn quyền — trang ghép mục 2). Ô này không có PARTNER và INTERN, trong khi Đối tác là người lập đơn chính. Nếu thiếu cửa, Đối tác sẽ thấy tạm tính không gồm phụ thu rồi bị thu thêm, hoặc phải thêm một route/ô mới. Đó là một quyết định quyền chưa được kể. Sửa: nói rõ form dùng route nào và ô nào. Đề nghị: phản hồi của lưu nháp, hoặc một route «xem trước phụ thu của đơn này» dưới ô `order.create`, chỉ trả dòng của chính đơn, không trả danh sách quy tắc. Ghi vào trang ghép mục 2 và 3b.

**D-9 — NÊN SỬA — Đ4.1 so với Đ4.2: khoá ngoại `target_role_code → prc_beneficiary_role` mâu thuẫn với «không phụ thuộc cờ được hưởng hoa hồng».**
Bằng chứng [đã mở tệp]: `prc_beneficiary_role` là «danh sách vai được hưởng hoa hồng» (`0090:18-25`). ADR-0146 cũng trỏ vào đó (`ADR-0146…md:44`). Đ4.2 lại xét loại của bên đặt theo «vai mở có nhãn loại đối tác» (`is_partner_label`). Loại đối tác không nằm trong `prc_beneficiary_role` sẽ không đặt được phụ thu riêng hay miễn. Sửa: chọn một. Hoặc khoá ngoại tới `pty_role_type` + trigger đòi `is_partner_label = 1` (qua view công bố `v_pty_role_type`), hoặc giữ khoá ngoại như ADR-0146 và bỏ câu «không phụ thuộc cờ…», thay bằng «chỉ loại có trong danh sách loại đối tác của giá».

**D-10 — NÊN SỬA — Đ3.3 với Đ4.3: chưa định nghĩa «quy tắc khớp» khi mùa ưu tiên cao chỉ có quy tắc cho loại hoặc hồ sơ **khác** bên đặt.**
Đ3.3 nói «mùa đầu tiên có quy tắc khớp thắng», D2 nói «đối tượng chỉ xét bên trong mùa thắng». Ví dụ: Lễ hội (20) chỉ có quy tắc cho loại Z; bên đặt là khách lẻ; Cao điểm (10) có quy tắc «mọi bên đặt». Lễ hội có «khớp» không? Nếu có thì khách lẻ được 0; nếu không thì trả theo Cao điểm. Đây là tiền, và chưa có ca vàng. Sửa: định nghĩa «khớp = có dòng hiệu lực mà đối tượng (hồ sơ / loại / mọi bên đặt) áp được cho **bên đặt này**», và thêm ca PT-D2-06.

**D-11 — NÊN SỬA — Đ2.3: câu 409 ở Còn vé không làm theo được.**
Câu «Bấm Lưu để cập nhật rồi xác nhận lại» không hợp với người xét duyệt ở Còn vé: nháp đang chờ bị khoá sửa (`khoaKhiCho`), và người xét duyệt không phải người lập. Sửa: câu theo cửa, như `cuaDuaDon: "xet-duyet"` đã làm (`xac-nhan-chung.ts:96`): người xét duyệt chọn Hết vé/Huỷ, hoặc báo người lập Rút lại rồi Lưu.

**D-12 — NÊN SỬA — Đ2.7, Hệ quả: nêu đích danh mọi nơi gọi `tienChoHoaHong` và mọi nơi dựng `thanhTien`.**
Nêu thêm `orders/index.ts:310` (trần R3 lúc lập/sửa), `:1635` (đổi bên đặt), `xac-nhan-chung.ts:111`, `scripts/audit-thuong-mai.mjs:53`. Lời chung «mọi nơi» đã từng để lọt lỗi ở dự án này (chú thích `money-adjustment.ts:153-160`, tái phát lần 4).

**D-13 — NÊN SỬA — Đánh số lệch nội bộ.** Dòng 17 (`D-DE-XUAT-ADR.md`) ghi «Đ2.8 đổi cách tính cột `gross_snapshot`», còn trong thân ADR mục đó là Đ2.9 (Đ2.8 là bẫy 0148). Trang ghép D mục 4 ghi đúng Đ2.9. Sửa dòng 17.

**D-14 — GHI NHẬN — Không phạm điều đã chốt.**
- Tôi đã soát: D **không** đưa lại «giá mới hẳn» (bác ở «Phương án bị bác» dòng 155) và **không** đặt hoa hồng mùa bắt buộc.
- P-1: hoa hồng và giá đại lý chỉ trên thành tiền dịch vụ (`tinhDongDoiTac`, `hoa-hong-dong.ts:61-70`, giá đại lý = thành tiền − hoa hồng — đã mở tệp).
- P-2: hai cách × hai dạng, quy về ba phương pháp; D-Q2 nêu đúng là chỉ bằng nhau **khi** làm tròn theo từng đơn vị (GĐ-3).
- P-3: làm tròn lên tới 1.000 ₫ theo đơn vị.
- P-4: ở D2.
- G4, G5, G6, GĐ-1…GĐ-4: áp đúng.
- Không có tên dịch vụ, nhóm, mùa hay loại đối tác nào trong mã. Thứ tự xét (mùa → phạm vi → đối tượng) và cách làm tròn là «cách tính tiền», thuộc phần mã được giữ theo nguyên tắc của chủ.

**D-15 — GHI NHẬN — D không dùng «đặc điểm dịch vụ» của A.** A tự cảnh báo: nếu D dùng đặc điểm cho tiền thì phải xét lại ô gắn đặc điểm và chụp giá trị (A dòng 142, 167, 271). D không dùng (phạm vi chỉ `SERVICE`/`GROUP`). Đây là lựa chọn an toàn, nhưng nên viết một câu «không dùng đặc điểm làm phạm vi phụ thu ở lượt này» cho chuỗi khép kín.

**D-16 — GHI NHẬN — Thứ tự cổng trong `kiemCongXacNhan` khớp B.** D: luật bán → R2 (lọc) → phụ thu → … B: hàm cổng chung `congBanDuoc` (luật bán, rồi đóng bán) đứng đầu, và gọi thêm trước `tinhCanXacNhan` ở `/status` và Gửi xác nhận (B dòng 201, 228). Không mâu thuẫn. Người thi công cần đặt cổng phụ thu **sau** `congBanDuoc` ở cả hai chỗ.

**D-17 — GHI NHẬN — Không dùng khuôn điều kiện (khoá, giá trị) của ADR-0147.** ADR-0147:63 dự kiến thêm khoá «mùa». D dùng cột `season_code` riêng. Không sai, nhưng nên nói lý do (mùa là trục bắt buộc của phụ thu, không phải điều kiện tuỳ chọn).

**D-18 — GHI NHẬN — Chia phần biên nhận và trần «thu cho» phải cùng một phép.** `nhaCungCapCuaDon` (`billing/rules.ts:533-541`) chia trên `phan.dichVu[].thanhTien`; `chiaPhanBienNhan` (`receipt/rules.ts:45`) chia trên Σ `items` của dịch vụ. Hai đường đọc hai nguồn khác nhau, mà Ruling R-154 đòi chúng bằng nhau. D đổi cả hai (Đ2.10), nhưng phải ghi rõ phụ thu cộng vào phần Tour Đảo **trước** khi trừ giảm giá (R-81: giảm giá trừ phần Tour Đảo trước), và có ca vàng (V-1).

---

## Phần 3 — Ca vàng (`D-CA-VANG-DE-XUAT.md`): tính tay lại

Luật áp: D-Đ3.4. Phần trăm: ⌈giá niêm yết × rate_bp / 10.000.000⌉ × 1.000 mỗi đơn vị rồi nhân số lượng (GĐ-3). Em bé 0. Dịch vụ nhóm: số lượt/phòng = ⌈khách/N⌉. Hoa hồng chỉ trên dịch vụ (P-1).

| Ca | Tôi tính | Đáp án đề xuất | Kết quả |
|---|---|---|---|
| PT-01 | Dịch vụ 2×1.050.000 + 800.000 = 2.900.000; phụ thu 200.000 + 50.000 = 250.000; tổng 3.150.000 | 3.150.000 | ✔ |
| PT-02 | 131.250 → 132.000 × 3 = 396.000; NCT 100.000; dịch vụ 3.950.000; tổng 4.446.000. Biến thể làm tròn trên tổng: 493.750 → 494.000 ⇒ 4.444.000 | như vậy | ✔ |
| PT-03 | ⌈5/2⌉ = 3 phòng; 3.450.000 + 900.000 = 4.350.000 | 4.350.000 | ✔ |
| PT-03b | 172.500 → 173.000 × 3 = 519.000; 3.969.000 | 3.969.000 | ✔ |
| PT-03c | 5 × 100.000 = 500.000; 3.950.000 | 3.950.000 | ✔ (đúng bảng Đ3.4: dịch vụ nhóm có một ô số khách — `order-lines.ts:103-106`) |
| PT-04 | Hoa hồng 10% × 2.900.000 = 290.000; giá đại lý 2.610.000; P nợ 3.150.000 − 290.000 = 2.860.000 = 2.610.000 + 250.000; trần giảm giá 290.000 (`tranGiamGiaDon`, người hưởng là chính P) | như vậy | ✔ |
| PT-04b | gross 3.150.000; phải thu 3.050.000; giảm giá bên đặt chịu 100.000 (chiều: Tour Đảo là bên được nợ — trigger (ii) 0112:58); P nợ 3.050.000 − 290.000 + 100.000 = 2.860.000. Đối chứng: max(0, 2.900.000 − 3.050.000) = 0 ⇒ 2.760.000, hụt 100.000 | như vậy | ✔ |
| PT-04c | ⌈7/5⌉ = 2 lượt; 5.000.000 + 400.000 = 5.400.000; hoa hồng 150.000 × 2 = 300.000. Đối chứng: Σ quantity = 4 ⇒ 600.000 | như vậy | ✔ |
| PT-06 | 12/06 thuộc Cao điểm (10) và Lễ hội (20); Lễ hội thắng: 105.000 × 2 = 210.000 ⇒ 2.310.000. Ngày 20/06: 100.000 ⇒ 2.200.000 | như vậy | ✔ |
| PT-06b | Lễ hội chỉ có quy tắc dịch vụ A; A2 rơi về Cao điểm nhóm G1: 100.000; 1.000.000 + 100.000 = 1.100.000. Biến thể 1.000.000 | như vậy | ✔ |
| PT-06c | Lễ hội nhóm G1 10%: 210.000 ⇒ 2.310.000. Biến thể 400.000 ⇒ 2.500.000 | như vậy | ✔ |
| PT-07 | A 300.000 + 80.000; A2 200.000; phụ thu 580.000; dịch vụ 3.900.000; tổng 4.480.000 | 4.480.000 | ✔ |
| PT-08 | 15/02 ngoài khoảng Tết 05–09/02 ⇒ (a) 2.900.000; (b)(c)(d) 3.150.000 | như vậy | ✔ |
| PT-09 | 3×1.050.000 + 800.000 = 3.950.000; 300.000 + 50.000 = 350.000; 4.300.000 | 4.300.000 | ✔ |
| PT-09b | ⌈7/2⌉ = 4 phòng; 4.600.000 + 692.000 = 5.292.000 | 5.292.000 | ✔ |
| PT-10 | 264.000 ⇒ 2.164.000; biến thể 118.750 → 119.000 × 2 = 238.000 ⇒ 2.138.000 | như vậy | ✔ |
| PT-11 | Dịch vụ 2.100.000 + 800.000 + 800.000 + 0 = 3.700.000; 4 đơn vị × 80.000 = 320.000; 4.020.000 | 4.020.000 | ✔ |
| PT-12 | 2.100.000 + 500.000 + 200.000 = 2.800.000 | 2.800.000 | ✔ |
| PT-13 | Giá vốn 90% × 2.900.000 = 2.610.000 (`giaVonDong` trên thành tiền dịch vụ); phần S 2.900.000, phần Tour Đảo 250.000; Tour Đảo giữ 3.150.000 − 2.610.000 = 540.000 | như vậy | ✔ |
| PT-D2-01 | 0 ⇒ 2.900.000 | 2.900.000 | ✔ |
| PT-D2-02 | 2×50.000 + 30.000 = 130.000 ⇒ 3.030.000 | 3.030.000 | ✔ |
| PT-D2-03 | (a) 0 ⇒ 2.900.000; (b) 380.000 ⇒ 3.280.000; biến thể (a) 3.280.000 | như vậy | ✔ |
| PT-D2-04 | 409; biến thể «thấp hơn» 0 ⇒ 2.900.000 | như vậy | ✔ |
| PT-D2-05 | giữ 250.000 ⇒ 3.150.000 | 3.150.000 | ✔ |

**Không có ca nào sai số.** Mọi ca phù hợp với luật D-Đ3 và quyết định chốt (P-1, P-3, GĐ-1…GĐ-4). Ca nào phụ thuộc câu chưa chốt đều đã ghi biến thể.

**V-1 — NÊN SỬA — Thêm ca để phủ các lỗ trên** (chủ chỉ xác nhận được cái có trên giấy):
- **PT-14 (D-1):** nháp như PT-01 ngày 15/02/2027 (không phụ thu), đã Gửi xác nhận; người xét duyệt bấm Còn vé kèm `ngayDi = 07/02/2027` ⇒ 409, tổng giữ 2.900.000, không ghi gì. Đáp án ngược: ngày 07/02 → 15/02.
- **PT-15 (D-2):** nháp PT-01 đã lưu (3.150.000), văn phòng mở lại và lưu không đổi gì ⇒ dịch vụ vẫn 2.900.000, phụ thu 250.000. Đối chứng lỗi: đơn giá người lớn thành 100.000 ⇒ dịch vụ 1.000.000.
- **PT-16 (D-18):** PT-13 có giảm giá 300.000 (lớn hơn phụ thu 250.000) ⇒ phần Tour Đảo sau giảm = 0, phần S = 2.900.000 − 50.000 = 2.850.000 theo R-81. Chủ xác nhận cách trừ.
- **PT-D2-06 (D-10):** Lễ hội (20) chỉ có quy tắc loại Z; Cao điểm (10) có quy tắc «mọi bên đặt»; bên đặt là khách lẻ ⇒ đáp án theo định nghĩa «khớp» chủ chọn.

**V-2 — GHI NHẬN:** ca đơn huỷ có phụ thu được ghi «không có trong bộ này», kèm lý do (TNV-G1). Đúng cách «không xanh rỗng».

---

## Tóm tắt các phát hiện CHẶN

1. **C-1** — Đ4 và trang ghép của C mang tên giả định (`cat_stop_sale`, `catalog.availability.write`, «phân hệ của B») trong khi B đã có văn bản: `ctl_sale_suspension` ở `catalog`, ô `catalog.sale.suspend/resume`, hàm cổng `congBanDuoc` ở `orders`. Cạnh phụ thuộc phải nới (Điều 9.4) đang viết dạng «nếu…», nên chủ không duyệt đích danh được.
2. **D-1** — Cửa «Còn vé kèm đổi ngày đi» (`xac-nhan-route.ts:263-316`) xét cổng theo ngày cũ rồi đổi ngày trong cùng lô xác nhận. Cổng phụ thu đặt trong `kiemCongXacNhan` cho qua, đơn bị khoá với phụ thu của mùa sai.
3. **D-2** — Danh sách chỗ phải lọc dòng phụ thu thiếu form sửa nháp ở trình duyệt `draftFromDto` (`service-form.ts:164-176`). Ở đó đơn giá người lớn bị ghi đè bằng số phụ thu, nên văn phòng lưu lại nháp là hạ giá dịch vụ im lặng, còn Đối tác bị 403. Thiếu cả `snapshotService` (mất bản chụp Q11, HDV mất ô sửa số khách). Bẫy `storedUnitPrices` được mô tả sai hậu quả, nên tiêu chí 10 không đỏ đúng chỗ.

## Điều tôi chưa kiểm

- Không chạy `node --test` hay e2e: các hậu quả ở D-2, D-6 là [suy luận] từ mã đã đọc, chưa tái hiện bằng bài thử.
- Không đối chiếu ngày Tết/Giỗ Tổ với nguồn chính thức (C-6), và không kiểm văn bản Bộ luật Lao động / Nghị quyết 28/2026/QH16.
- Không chấm bản A/B (người kiểm khác ở `KIEM-A-B`). Chỉ đọc A/B để so tên bảng, ô quyền, hàm cổng.

---

# Vòng 2 — soát «Bản sửa 1» (30/10)

- **Đối tượng:** `CD-lich-mua-va-phu-thu/` bản có dòng «Bản sửa 1»: `C-DE-XUAT-ADR.md`, `C-TRANG-GHEP.md`, `D-DE-XUAT-ADR.md`, `D-TRANG-GHEP.md`, `D-CA-VANG-DE-XUAT.md`. So với `B-dong-ban/DE-XUAT-ADR.md` bản mới nhất (dòng 7: «Vòng 2 … đã sửa thêm R2B-1…R2B-4»). Mã vẫn ở HEAD `a129d3d`. Chỉ đọc, không chạy test.

## Kết luận vòng 2

| Đề xuất | Kết luận | CHẶN còn lại | NÊN SỬA | GHI NHẬN |
|---|---|:-:|:-:|:-:|
| C | **ĐẠT CÓ ĐIỀU KIỆN** (điều kiện: sửa R2-C1) | 1 (mới — đếm trần) | 1 | 3 |
| D | **ĐẠT CÓ ĐIỀU KIỆN** | 0 | 4 | 3 |
| Ca vàng | **ĐẠT CÓ ĐIỀU KIỆN** (điều kiện: sửa số đối chứng PT-15) | 0 | 1 | 0 |

## 1. Ba CHẶN của vòng 1

| Mã | Trạng thái | Bằng chứng |
|---|---|---|
| **C-1** | **Đã đóng** | C nay dùng đúng tên B: `ctl_sale_suspension` ở `catalog` (B dòng 99-107); `dongBanTrung`/`dongBanChoForm` (B dòng 180-181); `congBanDuoc` ở `orders` (B dòng 211); `catalog.sale.suspend/resume` (B dòng 352-353). Bảng con `ctl_sale_suspension_condition` gắn khoá ngoại vào bảng của B. Hai cạnh nêu đích danh (`catalog → lich-mua`, `pricing → lich-mua`), có lý do vì sao **không** cần `orders → lich-mua`: điều kiện tính trong `catalog`, `orders` gọi qua cạnh `orders → catalog` sẵn có. Tiêu chí 13 canh việc này. |
| **D-1** | **Đã đóng** | Đ2.3: ở `quyet-dinh` có `ngayDi`, gọi `kiemPhuThu(order, ngayDi mới)` trước `kiemCongXacNhan` (`xac-nhan-route.ts:309`). Khác dòng đã lưu ⇒ 409, không ghi gì, yêu cầu vẫn mở. Có câu riêng cho người xét duyệt, tiêu chí 7 và ca PT-14. |
| **D-2** | **Đã đóng** (đổi cách: tách ở tầng đọc) | `items` chỉ còn dòng dịch vụ, dòng phụ thu sang `phuThu[]`. Như vậy `draftFromDto`/`snapshotItem` (trình duyệt), `snapshotService`, `storedUnitPrices`, Q11, `editablePaxCodesOf`, `planMoneyEdit`, R2 lúc xác nhận, bốn nơi gọi `tienChoHoaHong`, `COT_DICH_VU` đều tự không thấy phụ thu. Hậu quả nếu không tách đã mô tả đúng (Đ2.6 a, b), tiêu chí 10 viết lại thành hai bài đỏ đúng chỗ. |

## 2. Tách ở tầng đọc có phủ hết không

**Tôi tự rà lại mọi câu SQL đọc `order_item`** (`grep -rn "order_item"` trên `src/`, `scripts/`, `migrations/`, bỏ chú thích và test):

| Chỗ đọc | Cách đọc | Sau khi tách |
|---|---|---|
| `orders/repository.ts:91` `ITEM_SELECT` — dùng ở `findOrder` (`:311`) **và** `getStoredServices` (`:346`) | mọi dòng của đơn | được tách (D gọi đây là «ba câu»; thực tế là **hai** chuỗi SQL ở `repository.ts` (`:91`, `:1262`), cộng `COT_DICH_VU`, chia qua ba hàm ghép `groupItems`, `getStoredServices`, `buildSubtotalServices`) |
| `orders/repository.ts:1262` (`getServicesForSubtotal`) | mọi dòng | được tách |
| `scripts/audit-checks.mjs:126` (`COT_DICH_VU`, cho R-BIL-2, R-ORD-DC1) | JSON mọi dòng của dịch vụ | được tách |
| `scripts/audit-checks.mjs:655-664` (tạm tính = Σ dòng) | `SUM(line_total)` cả đơn | **phải giữ không lọc** (tạm tính gồm phụ thu). D ghi đúng (H6) |
| `migrations/0081` (tạm tính lúc xác nhận), `0044` (khoá khi Đã giao) | trigger | đúng khi không lọc |
| Phân hệ khác (`billing`, `receipt`, `dispatch`, `van-chuyen`…) | **không** có SQL đọc `order_item` (đi qua hàm công bố của `orders`) | phủ |
| Đường ghi: `serviceInserts` (`repository.ts:885`), `DELETE` nháp (`:1051`) | ghi | lưu nháp xoá–chèn lại cả dòng phụ thu, máy chủ sinh lại — đúng |

Bảng kê / xuất báo cáo tiền đơn: vẫn không có (vòng 1). **Kết luận: không có đường ghi hay đọc SQL nào lọt.**

Tách ở tầng đọc đổi hướng rủi ro: chỗ mới **mặc định không thấy** phụ thu. Rủi ro còn lại vì thế ở các chỗ **phải cộng thêm** `phuThu` mà chưa được nêu (R2-D3).

## 3. Phát hiện vòng 2

### C

**R2-C1 — CHẶN (mới; tôi rút lại ghi nhận C-5 của vòng 1) — «Đếm»: theo tiền lệ đã duyệt, nới cạnh phụ thuộc được tính vào trần, nên lượt C là 4.**
- Bằng chứng [đã mở tệp]: `docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md:81-82` (chủ duyệt 30/9) ghi nguyên văn: «Tính: mục 1 (nới cạnh kiến trúc — dữ liệu), mục 2 …, mục 3 … ⇒ 3 = đúng trần». Mục 1 chính là nới `ALLOWED_EDGES` (`:114`).
- Ở vòng 1 tôi viết «không cộng vào trần» (C-5) mà chưa tra tiền lệ này — **đó là sai của tôi**. C hiện dẫn đúng câu sai đó («Người kiểm độc lập đếm giống vậy», C dòng 78) để khuyến nghị «không tính».
- Theo tiền lệ: Đ1 + Đ2 + Đ4 + nới cạnh = **4 > 3**.
- Phương án dự phòng của C (C2 = Đ4 + cạnh `catalog → lich-mua`; C1 = Đ1, Đ2, cạnh `pricing → lich-mua`) còn lệch một chỗ: Đ2 gồm cả `catalog.sale.condition.write`, mà ô này chỉ có nghĩa cùng Đ4.
- Sửa đề nghị: đổi **mặc định** thành hai lượt đúng tiền lệ:
  - **C1** = Đ1 (lịch mùa) + `season.write` + cạnh `pricing → lich-mua` — 3;
  - **C2** = Đ4 (điều kiện bán) + `catalog.sale.condition.write` + cạnh `catalog → lich-mua` — 3;
  - mỗi lượt kèm trang ghép của nó.

  Hoặc giữ một lượt nhưng hỏi chủ «cho vượt trần», dẫn rõ tiền lệ 30/9. Viết lại C-Q5 và mục «Đếm», bỏ câu dẫn báo cáo vòng 1.

**Cạnh `pricing → lich-mua` có cần thật không** [đã mở `src/architecture.test.ts:334`]: có, với thiết kế hiện tại. Bài kiến trúc đòi khoá ngoại xuyên phân hệ đi đúng chiều cạnh, và D có `prc_surcharge_rule.season_code → lm_season` cộng việc `pricing` đọc `v_lm_season_day_range`.
- Phương án không cần cạnh: bỏ khoá ngoại, để gốc lắp ráp tiêm danh sách khoảng mùa vào lời gọi (khuôn `ctx.mocToiThieu`). Cái giá là mất ràng buộc CSDL cho mã mùa.
- Tôi khuyến nghị giữ cạnh. Vì nó chỉ phục vụ D, đặt nó ở C1 (còn chỗ) là hợp lý.

**R2-C2 — NÊN SỬA — Đ4.1 «điều kiện chỉ được chèn cùng lô với dòng đóng cha»: trigger không thấy được «lô».**
Hiến chương 5.1 đòi bất biến ở cả CSDL lẫn mã. Đề nghị viết dạng trigger kiểm được, ví dụ: `BEFORE INSERT ON ctl_sale_suspension_condition` từ chối khi dòng cha đã mở lại (`reopened_at IS NOT NULL`), hoặc khi `NEW.created_at <> cha.created_at` (cùng mốc `at` của lô). Nếu không, một lần đóng **trơn** do Bán hàng tạo có thể bị gắn điều kiện về sau bằng SQL, và đổi luôn ô quyền áp cho nó.

**R2-C3 — GHI NHẬN — Nhất quán với B bản mới nhất** [đã mở B]:
- `CHECK (scope IN ('SERVICE','GROUP'))` (B dòng 107): C chỉ dùng hai giá trị này ✓.
- Trigger mở lại một lần, `CHECK (reopened_at IS NULL OR valid_to_at = reopened_at)`, cấm chèn sẵn `reopened_*` (B dòng 118-123, 158): C kết thúc luật có điều kiện bằng đúng cột mở lại của B ✓. Ca biên «đã quá kết thúc dự kiến ⇒ 409» của B (dòng 121) áp luôn cho dòng có điều kiện; C nên ghi một câu.
- Route mở lại 409 với dòng có điều kiện, và route đóng 403 khi thân có điều kiện mà thiếu ô mới: C có ghi (Đ2.2, trang ghép mục 2-3). Nhưng **văn bản B chưa ghi**: tiêu chí 2 của B («Quản trị mở lại → 200», B dòng 377) chỉ đúng cho lần đóng trơn. Người thi công B và C phải đọc cả hai.
- Còn vé: B nay chặn Còn vé cả khi kèm đổi ngày (B dòng 248, 287-288); C xét điều kiện theo cả hai ngày (C Đ4.2) ✓.
- Hàng rào (a) của B quét chuỗi `ctl_sale_suspension` (B dòng 426). Chuỗi này khớp luôn `ctl_sale_suspension_condition`, nên mọi SQL bảng con phải nằm trong cùng tệp nửa nghiêm của B, hoặc mẫu quét phải có ranh giới từ.

**R2-C4 — GHI NHẬN — Tin B6 với `DAT_TRUOC_DUOI`.** Mốc tin của B = muộn nhất của (tạo lần đóng, bắt đầu hiệu lực, lưu đơn) (B dòng 393). Nháp chỉ bắt đầu «trúng» khi qua ngày, nên tin hiện ra với mốc cũ hơn mốc «đã đọc»: không tăng số đỏ. C ghi «không lặp mỗi ngày» là đúng, nhưng mặt trái là người lập không được báo. Nên ghi để chủ biết.

**R2-C5 — GHI NHẬN — Đếm lại C:** theo điều 3; theo tiền lệ ADR-0049 là **4** (R2-C1).

### D

**R2-D1 — NÊN SỬA — Thứ tự cổng ở Còn vé (trang ghép D mục 3, dòng «quyet-dinh kèm ngayDi») trái B.**
Trang ghép đặt `congBanDuoc` **sau** chốt nhóm tắt (`:296`) và sau kiểm mốc (`:304`). B chốt gọi tường minh **trước** chốt nhóm tắt và **trước** kiểm mốc (B dòng 237, tiêu chí 14 dòng 293), để người xét duyệt không bị đẩy đi «đặt gấp» cho dịch vụ đang đóng. Sửa dòng đó thành: `congBanDuoc` (cả hai ngày) → nhóm tắt → mốc → `kiemPhuThu(order, ngayDi mới)` → `kiemCongXacNhan`. Người soạn có thể cân nhắc đặt `kiemPhuThu` trước mốc vì cùng lý do; nếu chọn vậy thì nói ra.

**R2-D2 — NÊN SỬA — Ca vàng PT-15, cột «Đối chứng lỗi», sai số** (xem mục 4).

**R2-D3 — NÊN SỬA — Danh sách «chỗ phải CỘNG thêm `phuThu`» (Đ2.1) còn thiếu hai chỗ.**
- `src/shared/order-view.ts:54-64` [đã mở tệp]: trang đơn dựng dòng và tạm tính từng dịch vụ từ `items`. Sau khi tách, dòng phụ thu **biến khỏi trang đơn** trong im lặng, dù tổng vẫn gồm phụ thu. Đ2.10 nêu «trang đơn» chung chung; cần nêu đích danh tệp này (và `web/order-services.ts` vẽ từ đó), kèm một bài khẳng định có dòng phụ thu.
- `scripts/audit-thuong-mai.mjs:177` [đã mở tệp]: giảm giá hiệu lực = `effectiveMoney(Σ thanhTien dịch vụ, giảm)`. Sau khi tách, Σ đó không còn là tạm tính của đơn. Kết quả lệch khi giảm giá > tiền dịch vụ (biên, nhưng là kiểm định kỳ R3 lúc đổi bên đặt). Cần cộng `phuThu`, hoặc lấy tạm tính hiệu lực từ cùng đường với `loadOrderView`.

**R2-D4 — NÊN SỬA — Bài quét «câu SQL mới đọc `order_item` phải lọc `line_kind`»: kiểm được, nhưng phải viết rõ.**
- Danh sách cho phép phải theo **tên hằng**: `ITEM_SELECT`, câu của `getServicesForSubtotal`, `COT_DICH_VU`. Thêm hai câu `SUM(line_total)` của `audit-checks.mjs:655-664`, là chỗ **phải không lọc**. Không cho phép theo cả tệp, vì cho cả `audit-checks.mjs` là để lọt kiểm mới.
- Ba câu được phép phải **chọn** `line_kind`. Ba hàm chia (`groupItems`, `getStoredServices`, `buildSubtotalServices`) cần bài đơn vị: dòng `PHU_THU` không bao giờ vào `items`.
- Ghi giới hạn theo khuôn `hoa-hong-mot-nguon` (lưới chống nhầm, không chống cố ý): SQL ghép nhiều mảnh, bí danh bảng, view mới trong migration.
- Quan sát chặn thật một lần (P16).

**R2-D5 — GHI NHẬN — Đếm lại D:** D1 = Đ1, Đ2, Đ3 = **3**; D2 = Đ4, Đ5 = **2** (đếm theo điều). Đ1 vẫn gộp ô ghi mới với đổi nghĩa `partner.commission.view`; Đ2 vẫn gộp R2 đổi phạm vi với một route mới mở cho PARTNER/INTERN. D tự ghi rõ việc này (dòng 393), nên chấp nhận được. Tách D1/D2 trong khi bắt buộc phát hành cùng lúc có tiền lệ ở B (B-lõi / B-hiển thị, B dòng 451).

**R2-D6 — GHI NHẬN — Route xem trước:** Thực tập không bị ép bên đặt (chỉ Đối tác bị — `benDatCuaToi`, `auth/index.ts:744`). Vì vậy Thực tập xem trước được mức phụ thu riêng (D2) của bất kỳ bên đặt nào. Cùng thông tin này họ đã lấy được bằng cách lưu nháp với bên đặt đó, nên rủi ro không tăng; chỉ ghi để khớp câu «Thực tập không đọc danh sách quy tắc» (Đ1.3).

**R2-D7 — GHI NHẬN — Các mục NÊN SỬA vòng 1 đã sửa** [đã đọc bản sửa]:
- D-3: phát hành cùng lúc.
- D-4: tách Đ5.
- D-5: `phuThuMoiDonVi` đặt trong `hoa-hong-dong.ts` + siết `GOI_HAM`; `PHAN_VAN_DA_RA` không đổi.
- D-6: `COT_DICH_VU`, tiêu chí 17.
- D-7: «xây trên lỗ đang hở: TNV-G1, TNV-G3», D-Q8 hỏi từng mã, khuyến nghị đặt điều kiện diễn tập.
- D-8: route xem trước dưới `order.create`.
- D-9: «bất kể cờ active».
- D-10: định nghĩa «áp được», D2-Q3, PT-D2-06.
- D-11: câu theo cửa.
- D-12: bốn nơi gọi.
- D-13: đánh số.

## 4. Ca vàng — tính tay lại ca mới và ca có sửa

Các ca PT-01 … PT-13 và PT-D2-01 … PT-D2-05 giữ nguyên chữ so với vòng 1 (đã so từng dòng), nên kết quả vòng 1 còn nguyên: đúng.

| Ca | Tôi tính | Đề xuất | Kết quả |
|---|---|---|---|
| PT-14 | Nháp 15/02 (ngoài Tết 05–09/02): phụ thu 0, tổng 2.900.000. Còn vé kèm 07/02: mong đợi 250.000 ≠ 0 ⇒ 409, tổng giữ 2.900.000. Chiều ngược: 07/02 → 15/02 thì mong đợi 0 ≠ 250.000 ⇒ 409, giữ 3.150.000 | như vậy | ✔ |
| PT-15 (đáp án chính) | Lưu lại không đổi: dịch vụ 2.900.000 + phụ thu 250.000 = 3.150.000 | như vậy | ✔ |
| PT-15 (**đối chứng lỗi**) | Nếu dòng phụ thu lọt vào `items` ở `draftFromDto` (`service-form.ts:166` ghi đè **mọi** `pax_code` có dòng phụ thu): NL ← 100.000 **và TE ← 50.000** (dòng phụ thu TE cũng đứng sau dòng dịch vụ TE theo `sort_order`). Dịch vụ = 2 × 100.000 + 1 × 50.000 + 0 = **250.000**; máy chủ sinh lại phụ thu 250.000 ⇒ tổng **500.000** | dịch vụ 1.000.000, tổng 1.250.000 (chỉ ghi đè người lớn) | **✘ sai số** — sửa thành 250.000 / 500.000. Đáp án chính không đổi; chỉ con số minh hoạ cho bài đỏ trước (tiêu chí 10b) sai |
| PT-16 | Phần Tour Đảo (phụ thu) 250.000, phần S 2.900.000; giảm 300.000 trừ Tour Đảo trước (`chiaPhanNguoiBan`, `src/shared/chia-phan-nguoi-ban.ts`, đã mở): Tour Đảo 0, S 2.850.000; tổng 2.850.000; giá vốn S = 90% × 2.900.000 = 2.610.000; trần «thu cho» S = 2.850.000 | như vậy | ✔ (chỉ đúng khi phụ thu là một «dòng phần Tour Đảo» đưa vào cùng `chiaPhanNguoiBan`, như Đ5.2 ghi) |
| PT-D2-06 | 12/06 thuộc Lễ hội (20) và Cao điểm (10). (a) Khách lẻ: Lễ hội chỉ có quy tắc loại Z, không áp được ⇒ Cao điểm 2 × 50.000 = 100.000 ⇒ 2.200.000. (b) Loại Z: 2 × 200.000 = 400.000 ⇒ 2.500.000. Biến thể (a): 0 ⇒ 2.100.000 | như vậy | ✔ |

## 5. Tóm tắt CHẶN còn lại

1. **R2-C1** (lượt C) — mục «Đếm» không tính hai cạnh phụ thuộc mới vào trần. Tiền lệ chủ duyệt 30/9 (`2026-09-29-adr-0049-de-xuat-luat.md:81-82`) lại tính «nới cạnh kiến trúc» vào trần, nên C thực chất là 4 điều. Ghi nhận C-5 của tôi ở vòng 1 sai và C đang dẫn nó. Sửa: mặc định tách C1 (lịch mùa + `season.write` + cạnh `pricing → lich-mua`) / C2 (điều kiện bán + `catalog.sale.condition.write` + cạnh `catalog → lich-mua`), hoặc xin «cho vượt trần» có dẫn tiền lệ.

D không còn CHẶN.

---

# Vòng 3 — soát «Bản sửa 2» (30/10)

Chỉ đọc. Đối tượng: `C-DE-XUAT-ADR.md`, `C-TRANG-GHEP.md`, `D-DE-XUAT-ADR.md`, `D-TRANG-GHEP.md`, `D-CA-VANG-DE-XUAT.md` (bản 09:13–09:15). Văn bản B không đổi kể từ vòng 2 (`B-dong-ban/DE-XUAT-ADR.md` 08:59).

## Kết luận vòng 3

| Đề xuất | Kết luận | CHẶN | NÊN SỬA | GHI NHẬN |
|---|---|:-:|:-:|:-:|
| C (C1 + C2) | **ĐẠT** | 0 | 0 | 2 |
| D | **ĐẠT** | 0 | 0 | 2 |
| Ca vàng | **ĐẠT** | 0 | 0 | 0 |

## Từng điểm

1. **R2-C1 — đã đóng.** [đã đọc C dòng 7-9, 23, 82, 287, 300-312; trang ghép C dòng 1-8]
   - C1 = Đ1 + Đ2a `season.write` + cạnh `pricing → lich-mua` = 3.
   - C2 = Đ4 + Đ2b `catalog.sale.condition.write` (kèm B+1, B+2) + cạnh `catalog → lich-mua` = 3.
   - Cạnh được tính vào trần, dẫn đúng tiền lệ `2026-09-29-adr-0049-de-xuat-luat.md:81-82`. Đ3 (âm lịch) không tính, đúng.
   - Phương án «một lượt, cho vượt trần» đưa ra làm câu hỏi C-Q5, khuyến nghị (a) hai lượt.
   - Thứ tự duyệt hợp lý: C1 trước (D cần), C2 sau C1 và sau B.
   - Ghi chú nhỏ: tiền lệ 30/9 tính **hai** cạnh trong **một** mục. Ở đây mỗi lượt chỉ có một cạnh, nên đếm «mỗi cạnh một quyết định» không làm lệch kết quả.

2. **R2-C2 «cùng lô» — kiểm được, không chặn nhầm lô hợp lệ** [C dòng 163-169].
   - Trigger `BEFORE INSERT` so `NEW.created_at`/`created_by` với dòng cha, cộng điều kiện cha chưa mở lại. Cả ba vế đọc được trong thân trigger (bảng cùng phân hệ `catalog`).
   - Lô hợp lệ (cha + con một `db.batch`, một mốc `at`, một người) luôn qua, **với điều kiện** lô đóng của B ghi `created_at` bằng đúng mốc `at` của request, không dùng giờ CSDL hay một mốc khác. C có ghi yêu cầu này (dòng 167).
   - Ghi nhận R3-C1 bên dưới.

3. **«Bổ sung cho lượt B» B+1…B+5 — đúng với văn bản B hiện có** [đã đối chiếu B]:
   - B+1: route đóng hỏi `catalog.sale.suspend` (B dòng 356-358) ✓.
   - B+2: tiêu chí 2 của B «Quản trị, Toàn quyền mở lại → 200» (B dòng 377) ✓.
   - B+3: hàng rào (a) quét chuỗi `ctl_sale_suspension` (B dòng 426, cả dòng 201) ✓.
   - B+4: `src/shared/dong-ban.ts`, `dongBanTrung`/`dongBanChoForm`, `tamNgung` (B dòng 178-181, 312) ✓.
   - B+5: «Bài so khớp form ↔ máy chủ» đúng là tiêu chí 2 của B Đ4 (B dòng 331) ✓.
   - Ca biên «quá kết thúc dự kiến ⇒ 409» áp cho dòng có điều kiện (C Đ4.8, trang ghép C dòng 54) ✓.

4. **Bốn NÊN SỬA của D — đã đóng:**
   - R2-D1 thứ tự Còn vé: D Đ2.3 dòng 156-162, trang ghép D dòng 53. `congBanDuoc` nay đứng trước nhóm tắt (`:296`) và mốc (`:304`), đúng B dòng 237.
   - R2-D3: `src/shared/order-view.ts:54-64` và `scripts/audit-thuong-mai.mjs:177` đã vào danh sách «chỗ phải cộng», kèm tiêu chí (D dòng 136-137, 363).
   - R2-D4 bài quét: D Đ2.12 dòng 211-220.
     - Danh sách cho phép theo tên hằng: ba câu phải chọn `line_kind`, hai câu `SUM` được phép không lọc, `DELETE` nháp.
     - Có bài đơn vị cho ba hàm chia, ghi rõ giới hạn (SQL ghép nhiều mảnh, view trong migration, tên qua biến), và quan sát chặn thật một lần.
     - Kiểm được bằng máy theo khuôn `hoa-hong-mot-nguon`.
   - R2-D2 (PT-15): xem điểm 5.

5. **PT-15, cột đối chứng — đúng.** NL ← 100.000, TE ← 50.000: dịch vụ 2 × 100.000 + 1 × 50.000 + 0 = 250.000; máy chủ sinh lại phụ thu 250.000 ⇒ tổng 500.000. Khớp số tôi tính ở vòng 2. Các ca khác không đổi.

6. **Thứ tự cổng mới ở Còn vé kèm `ngayDi` — không thấy lỗi mới** [suy luận từ `xac-nhan-route.ts:257-316` đã đọc ở vòng 1-2]:
   - `kiemPhuThu(order, ngayDi mới)` đặt giữa nhóm tắt (`:296`) và kiểm mốc (`:304`). Cả hai chỗ đều trước mọi câu ghi (lô bắt đầu sau `:309`), nên 409 không để lại gì.
   - Việc bỏ lần `kiemPhuThu` theo ngày cũ bên trong `kiemCongXacNhan` khi có `ngayDi` là đúng: không bỏ thì đổi ngày từ mùa sang ngoài mùa sẽ bị chặn nhầm theo ngày cũ. Không mở lỗ, vì bước 3 đã kiểm theo ngày mới, và ngày mới chính là ngày lô sẽ ghi (`cauDoiNgayDichVu` đặt mọi dịch vụ về một ngày).
   - Điều kiện duy nhất: cờ «bỏ qua» chỉ được bật khi bước 3 thật sự đã chạy (xem R3-D1).

## Ghi nhận vòng 3

- **R3-C1 — GHI NHẬN — «Cùng lô».**
  - (a) Yêu cầu «lô đóng của B ghi `created_at` = mốc `at` của request» là ràng buộc lên phần thi công B. Nên thêm một dòng **B+6** vào bảng «Bổ sung cho lượt B», để người thi công B thấy ngay; nếu không, trigger của C sẽ chặn nhầm lô hợp lệ.
  - (b) Phần «Giới hạn» (C dòng 169) mới nêu trùng mốc mili-giây. Nên ghi thêm: SQL chạy tay **cố ý** chép đúng `created_at`/`created_by` của dòng cha thì vẫn qua. Trigger là lưới chống nhầm, không chống cố ý — theo khuôn ghi giới hạn của các hàng rào khác.
- **R3-C2 — GHI NHẬN.** C dòng 202 còn viết «Văn bản B (bản 30/10) chưa ghi những điều này». Đúng tại thời điểm soát (B không đổi từ 08:59). Nếu B sửa tiếp thì phải đối chiếu lại B+1…B+6.
- **R3-D1 — GHI NHẬN.** D Đ2.3 bước 5 cho `kiemCongXacNhan` «bỏ qua» `kiemPhuThu` khi có `ngayDi`. Kế hoạch nên chốt cờ này là tham số tường minh, chỉ cửa `quyet-dinh` truyền, và kèm một bài: gọi `kiemCongXacNhan` với cờ bỏ qua mà chưa chạy bước 3 ⇒ đỏ. Mục đích là không mở lối bỏ cổng ở cửa khác.
- **R3-D2 — GHI NHẬN.** D Đ2.6 (b) (dòng 189) vẫn tả `draftFromDto` chỉ «ghi đè `saved.adult`». Thực tế nó ghi đè **mọi** loại khách có dòng phụ thu, như PT-15 đã sửa. Câu chữ nên sửa cho khớp; không đổi thiết kế.

## CHẶN còn lại

**Không còn.** C (C1, C2), D (D1, D2) và ca vàng đủ điều kiện trình chủ. D vẫn ghi đúng «xây trên lỗ đang hở: TNV-G1, TNV-G3», nên D không được duyệt trước khi chủ trả lời D-Q8 (luật «dừng dây chuyền», `CLAUDE.md` §3). Đó là điều kiện quy trình đã nêu trong văn bản, không phải lỗi của đề xuất.
