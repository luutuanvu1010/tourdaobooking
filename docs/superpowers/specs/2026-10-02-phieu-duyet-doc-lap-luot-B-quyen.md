# Phiếu duyệt độc lập — Lượt duyệt B (ADR-0090 PIN tạm, ADR-0091 Bán hàng phá lệ mốc 6 giờ)

- **Văn bản được duyệt:** `docs/superpowers/specs/2026-10-02-luot-duyet-B-quyen-sau-thu-nghiep-vu.md` (157 dòng), nhánh `worktree-quyet-dinh-thu-nghiep-vu` @ `968ecfdb`.
- **Người duyệt:** trợ lý duyệt độc lập, chỉ đọc. Không sửa tệp nào trong kho. **Không duyệt thay chủ** (Hiến pháp N3): mọi kết luận dưới đây là đề xuất.
- **Mốc mã:** mọi `tệp:dòng` là của `968ecfdb`. Nhánh này **chậm 19 commit** so với `main`; `main` có Vận chuyển đợt 1 (bản 1.65), chạm module `van-chuyen`. Đã đối chiếu riêng ba chỗ trên `main`: `reset-pin` vẫn ở `accounts/index.ts:655`; `permissions.ts:83` và `:171` không đổi; `commitment_override` không có trên `main`. Khi lập kế hoạch phải kiểm lại số dòng trên `main`.
- **Nguồn bằng chứng đã mở:**
  - báo cáo thử nghiệp vụ `~/Documents/danh-gia-ux/2026-10-01/BAO-CAO.md` (G7, G8, G9, §6, §9);
  - kết quả chạy thật `kich-ban/vai-qt.ket-qua.jsonl` dòng 2 (QT02) và dòng 4 (QT04);
  - đánh giá kiến trúc `~/Documents/danh-gia-kien-truc/2026-10-01/BAO-MAT.md` (GD-P-01 :117–140, GD-S-01 :253–275);
  - các ADR, mã và migration nêu ở từng dòng.

---

## (A) Soát sự thật

Nhãn: **ĐÚNG** / **SAI** / **THIẾU** (đúng nhưng bỏ mất phần làm đổi kết luận) / **KHÔNG KIỂM ĐƯỢC** (không suy được từ mã).

| # | Khẳng định trong nháp | Kết quả | Bằng chứng |
|---|---|---|---|
| A1 | Mã đặt lại PIN ở `src/modules/accounts/index.ts:643-656` | **SAI số dòng** | Ở `968ecfdb` và cả `main`, route `POST /api/staff/:id/reset-pin` nằm ở `:655`, trả PIN ở `:675`. Số 643–656 chép từ BAO-MAT.md :125, viết trên mốc mã cũ. |
| A2 | QT04: Quản trị đặt lại PIN Kế toán, thấy PIN, phiên Kế toán bị đá, đăng nhập thay, xác nhận 200, hoàn 201, nhật ký mang tên Kế toán, chỉ Toàn quyền thấy dấu vết | **ĐÚNG nhưng THIẾU** | `vai-qt.ket-qua.jsonl` dòng 4 khớp từng bước. Cùng bản ghi còn có: *"Biến thể: Quản trị cấp thêm quyền Kế toán cho Bán hàng cấp dưới 200 → ["SALES","ACCOUNTING"]"*. Nháp bỏ qua biến thể này, mà nó làm sai kết luận của đ4 (xem B1). |
| A3 | GD-P-01: Nhân sự tạo tài khoản cũng biết PIN đầu | **ĐÚNG nhưng THIẾU** | Route trả PIN ở `accounts/index.ts:426` và `:456`. BAO-MAT.md :132 ghi nguyên văn "Nhân sự tạo một tài khoản Bán hàng hoặc **Kế toán** (SĐT mới), cầm PIN". Đ4 không chặn vế Kế toán. |
| A4 | Bảng "Thay câu nào", ADR-0042: "Quản trị đặt lại PIN mọi cấp dưới" | **Không nguyên văn** | ADR-0042 đ1 (`:15`): "Quản trị lấy lại việc đăng nhập của cấp dưới: `account.access.manage` = ADMIN + SUPER_ADMIN … Quản trị không tác động được tài khoản Quản trị khác hay Toàn quyền." Các ADR khác đều chép "nguyên văn → mới"; nên chép đúng câu này. |
| A5 | Bảng "Thay câu nào", ADR-0071: "PIN đầu do người tạo đặt" | **SAI nghĩa nhẹ, không nguyên văn** | ADR-0071 điều 1f (`:33`): "**PIN đầu tiên** khi HCNS tạo tài khoản: như Quản trị hiện nay (**máy chủ sinh**, hiện một lần cho người tạo)". Máy chủ sinh PIN; người tạo không đặt. |
| A6 | Q-B2, phương án "thêm ADMIN, tức chỉ Toàn quyền đặt lại PIN của Quản trị" | **SAI tiền đề** | Điều này đã đúng hôm nay. `reset-pin` gọi `mayManage` (`accounts/index.ts:662`). `canManageAccount` (`roles.ts:63-67`) chặn mọi đích giữ quyền trong `SUPER_ADMIN_GRANTED` = ADMIN, SUPER_ADMIN, HR (`roles.ts:56`). ADR-0042 đ1 ghi cùng điều đó. Như vậy "SUPER_ADMIN" trong đ4 cũng thừa, và **tác dụng thật duy nhất của đ4 là ACCOUNTING**. |
| A7 | Đ3 định nghĩa "quyền tiền" = ACCOUNTING hoặc ô `ledger.write`/`payment.refund`; đ4 định nghĩa = ACCOUNTING, SUPER_ADMIN | **Hai định nghĩa cho một khái niệm** | Hôm nay hai tập trùng nhau: `payment.refund` (`permissions.ts:105`) và `ledger.write` (`:114`) chỉ mở cho ACCOUNTING và SUPER_ADMIN. Nhưng hai định nghĩa là hai luật, sẽ lệch khi bản đồ quyền đổi. |
| A8 | Đặt gấp nhầm không gỡ được (DELETE 405); dấu tự mất khi chặng đổi | **ĐÚNG** | QT02 (dòng 2): "DELETE …/short-notice → 405". `orders/index.ts:88`: "vắng và không dưới mốc → null (nội dung đổi thì dấu cũ bỏ — I16)". |
| A9 | "Đặt gấp" và "phá lệ" chỉ ADMIN, SUPER_ADMIN (`permissions.ts:83,171`) | **ĐÚNG** | `permissions.ts:83`, `:171`. |
| A10 | Ô `trip.dispatch` gồm Bán hàng, Quản trị, Toàn quyền | **ĐÚNG** | `permissions.ts:170`. |
| A11 | Ứng dụng không có vai "Điều phối" riêng; người xếp xe hằng ngày là Bán hàng | **ĐÚNG một phần / KHÔNG KIỂM ĐƯỢC** | Đúng là mã không có mã quyền hay vai tên "Điều phối". Nhưng có vai **"Điều hành chung"** (`roles.ts:29`, quyền mặc định ADMIN), người giữ vai này đặt gấp và phá lệ được. Câu "người xếp xe hằng ngày là Bán hàng" là sự thật vận hành; mã chỉ cho biết Bán hàng **được** xếp. |
| A12 | "Thêm mã ô (không phải mã quyền) không nhân đôi bài tập con quyền" | **ĐÚNG**, cần nói thêm | Bài tập con chạy trên 2^(số mã quyền), hiện là **1024** chứ không còn 512 như CLAUDE.md §10 ghi: `start-page.test.ts:78`, `handler-view.test.ts:127`, `permissions.test.ts:290`, `price-guards.test.ts:119`. Thêm một ô chỉ tốn thêm tuyến tính. Nhưng thêm ô phải sửa ít nhất 7 chỗ: bảng ADR chép độc lập (`permissions.test.ts:87`); bài SUPER_ADMIN = any (`:91-93`); ghim hàng DRIVER (`:334`), DRIVER_PARTNER (`:363`), HR (`:388`), PARTNER (`orders/xem-don-theo-quyen.test.ts:297`); tên ô cho trợ lý (`tro-ly-cau-truc.test.ts:38-39`); hàng rào "ô phải được máy chủ hỏi" (`permission-enforcement.test.ts`). |
| A13 | Ô mới `order.leg.short_notice.exception` "chỉ SALES" | **KHÔNG THỂ** | `permissions.test.ts:91-93` (ADR-0014 điều 2) bắt SUPER_ADMIN = any ở **mọi** ô. Vì vậy cần luật ưu tiên khi một người giữ cả hai ô (C3). |
| A14 | `order.leg.short_notice.view` = SALES, ACCOUNTING, ADMIN, SUPER_ADMIN; "FIELD xem nhãn trên đơn được giao (đề xuất)" | **ĐÚNG**; phần đề xuất **đổi một lời chủ đã ghim** | Ô ở `permissions.ts:87`, bị ghim bởi `permissions.test.ts:406-407` theo lời chủ H4/N-14. Mặt khác, HDV, Đối tác và Thực tập **đã** nhận cờ hẹp `{ daDuyet: true }` (`orders/dat-gap.ts:81-85`). Lịch sử của họ ghi "Đặt gấp — Quản trị đã duyệt" (`:95`) và người làm là "Quản trị" (`:107`). |
| A15 | Nhánh `datGap` của lệnh sửa chặng là nơi **duy nhất** ghi năm cột (I16, `0040:4`) | **THIẾU** | `migrations/0040_dat_gap_chang.sql:3-4` nói "**route đặt gấp và** nhánh `datGap` … là NƠI DUY NHẤT", tức hai lối ghi: route `orders/index.ts:887` và hàm `xetDatGapSua`. Lệnh "gỡ" ở đ5 sẽ là lối ghi thứ ba, nên I16 phải sửa. |
| A16 | Mốc vẫn không tắt được (CSDL chặn 0) | **ĐÚNG** | Chú thích đầu `src/shared/moc-toi-thieu.ts`: "Mốc luôn > 0 — KHÔNG tắt được … CHECK ở CSDL + `kiemChinhSachMoi`". |
| A17 | Cổng xếp xe: `kiemMocXep` → `canPhaLe` cần `trip.override` | **ĐÚNG về ý, THIẾU phạm vi** | Hàm thuần chỉ báo "cần phá lệ". Route hỏi `trip.override` khi thân yêu cầu có `phaLe` (`van-chuyen/index.ts:822, 873, 892, 916, 936, 958`). Hàm `loiKiem` tách MOC_TOI_THIEU khỏi KHOANG_NGHI (`van-chuyen/dieu-phoi-route.ts:71-80`). Có **bảy** lệnh bị khoá theo mốc (`moc-toi-thieu.ts:65`), cộng đổi xe hoặc tài xế khi sửa chuyến (`dieu-phoi-kiem.ts:127`). Nháp không liệt kê lệnh nào được phá lệ. |
| A18 | Trang ghép §1: `vc_trip` có "cột phá lệ cam kết (ADR-0056)"; 0091 thêm cột người làm vào `vc_trip` | **SAI** | `git grep commitment_override` rỗng cả ở HEAD lẫn `main`: ADR-0056 đã duyệt nhưng phần cột này chưa thi công. Phá lệ lúc xếp hôm nay được ghi thành **sự kiện** `vc_trip_event` (`override_rule_code`, `override_reason_code`, `created_by` — `migrations/0042_chuyen_xe.sql:164-175`). Đây là bảng chỉ-thêm. |
| A19 | Trang ghép §1: bảng "thông báo (`thongbao`)" | **SAI** | Không có bảng `thongbao`. Hộp thông báo là **hình chiếu `audit_log`** (ADR-0034 điều 1, `:21`). Tin thủ công nằm ở `ntf_notice` / `ntf_notice_target`, đăng ký gõ cửa ở `ntf_push_sub`. Thêm "loại tin mới" nghĩa là sửa danh sách hành động nguồn của ADR-0034 điều 1, nên phải có dòng trong "Thay câu nào". |
| A20 | Trang ghép §1: `aut_session` — "phiên mở bằng PIN tạm mang dấu 'chỉ đổi PIN'" | **Mâu thuẫn với đ1** | Đ1 đặt cờ trên `staff`; trang ghép lại đặt dấu trên phiên. Cột `method` có CHECK đóng (`0065_aut_session.sql:8`), thêm giá trị phải dựng lại bảng. Đề xuất: bỏ dòng này (B4). |
| A21 | Trang ghép §3: router trả 403 cho mọi thứ "trừ đổi PIN và đăng xuất" | **THIẾU** | Vỏ trang cần `GET /api/auth/me` (`auth/index.ts:338`, cổng `staff`). Đăng xuất là route `public`, vốn không đi qua cổng (`router.ts:281`). |
| A22 | Nút "Đặt gấp" ở `web/dat-gap-ui.ts:106`, hiện theo `order.leg.short_notice` | **ĐÚNG** | Nơi gọi quyết: `web/order.ts:252, 701, 836`, `web/order-form.ts:599`. |
| A23 | "Dòng 7b 'Xếp xe gấp cần Quản trị duyệt' đổi chữ" | **SAI nhãn** | `web/dat-gap-ui.ts:101`: câu "Xếp xe gấp cần Quản trị duyệt đặt gấp." là dòng **7a**, hiện cho người **có** ô. Dòng **7b** cho Bán hàng là "Lưu nháp được. Xác nhận cần Quản trị duyệt đặt gấp." Cả hai câu đều phải đổi. |
| A24 | ADR-0049 D2/D3: "đặt gấp và phá lệ chỉ Quản trị, Toàn quyền" | **ĐÚNG** | ADR-0049 `:162` (dòng Xếp), `:201` (ô). |
| A25 | Bảng "Thay câu nào" có dòng "ADR-0051 (đặt gấp) — không có lệnh gỡ" | **SAI** | ADR-0051 là "nhắc gọi báo khách khi giờ hẹn đổi"; tìm "đặt gấp" trong tệp không ra kết quả nào. Đặt gấp nằm ở ADR-0049 D2/D3, migration 0040. |
| A26 | QT02: đơn xác nhận lúc còn hơn 6 giờ, tới lúc xếp đã vào mốc, Bán hàng nhận 409 | **ĐÚNG** | `vai-qt.ket-qua.jsonl` dòng 2: "Bán hàng xếp chặng (không dấu đặt gấp) vào chuyến trong mốc → 409 can_pha_le \| QT xếp kèm phá lệ … → 200". |
| A27 | Số ADR 0088–0091 còn trống | **ĐÚNG** | Chỉ xuất hiện ở commit `968ecfdb`. 0086 và 0087 đã dùng ở nhánh khác. `docs/adr/README.md` trên nhánh này vẫn ghi "kế tiếp 0086", nên ghi giữ chỗ. |
| A28 | Trang ghép §4: 0090 và 0091 không chạm cùng bảng hay cùng ô | **ĐÚNG về bảng và ô** | Nhưng cả hai cùng thêm hành động vào nguồn hộp thông báo (ADR-0034 đ1). |
| A29 | (Nháp không nêu) ADR-0049 đã ghi "Bán hàng tự phá lệ mốc 6 giờ" là **phương án bị loại** | **THIẾU** | ADR-0049 `:365`: "Bán hàng tự phá lệ mốc 6 giờ: chủ chọn chỉ Quản trị, Toàn quyền (ĐP3)". ADR-0091 đảo ngược đúng phương án chủ đã loại ngày 29/9. |

**Tóm lại:** về hiện trạng mã, nháp đúng phần lớn. Có **6 chỗ sai cần chữa**: A1, A6, A18, A19, A23, A25. Có **4 chỗ thiếu làm đổi kết luận**: A2, A3, A17, A29.

---

## (B) Lỗ trong điều khoản và đề xuất sửa

Mức: **Phải sửa** (không sửa thì văn bản sai hoặc để hở đúng điều nó định đóng), **Nên sửa**, **Gợi ý**.

### B0. Sự thật — **Phải sửa**
Chữa sáu chỗ sai ở bảng A: A1, A6, A18, A19, A23, A25. Riêng A6 phải viết lại Q-B2 (xem C).

### ADR-0090 — PIN tạm

**B1. Đ4 không "chặn từ gốc" như lời lý do — Phải sửa.** Ngoài đường đặt lại PIN còn hai đường cùng loại, và cả hai đều có bằng chứng:
- **(a) Gán thêm quyền Kế toán.** Quản trị (và Nhân sự) có ô `account.edit`, nên gán được vai "Kế toán" hoặc cộng tay ACCOUNTING cho tài khoản cấp dưới. QT04 ghi nhận lệnh này trả 200. Mã cho phép vì `ACCOUNTANT.superAdminOnly = false` (`roles.ts:33`), còn `roleAssignmentProblem` và `highPermissionProblem` chỉ chặn vai chỉ-Toàn-quyền và nhóm ADMIN/SUPER_ADMIN/HR (`roles.ts:56`, `:186-199`).
  - Ghép với đ5: Quản trị đặt lại PIN một tài khoản Bán hàng (đ5 vẫn cho phép), dùng PIN tạm đổi sang PIN mình biết, rồi gán thêm quyền Kế toán. Kết quả là một tài khoản giữ tiền do Quản trị điều khiển.
- **(b) Tạo tài khoản Kế toán mới.** Nhân sự tạo được tài khoản mang vai Kế toán (ADR-0071 1a: "mọi tài khoản") và biết PIN tạm. Đổi PIN xong là có ngay `ledger.write` toàn công ty.
- **Câu sửa đề xuất** cho đ4 (dùng định nghĩa "tài khoản có quyền tiền" ở B6, nay là một phần của chỗ phải sửa này): *"Tài khoản có quyền tiền chỉ Toàn quyền được: (i) đặt lại PIN; (ii) gán vai Kế toán hoặc cộng tay quyền Kế toán; (iii) tạo tài khoản mang quyền đó; (iv) tắt bảo mật hai lớp khi ADR-0074 thi công. Quản trị và Nhân sự nhận 403."*
- Nếu chủ chọn phương án này (Q-B2 A), bảng "Thay câu nào" của ADR-0090 phải thêm:
  - ADR-0071 điều 1a (Nhân sự tạo mọi loại tài khoản);
  - ADR-0042 đ1 và lời chủ trích ở đó (Quản trị gán vai thường);
  - danh sách LC-4 của ADR-0018 điều 5 (chỉ Toàn quyền cấp: ADMIN, SUPER_ADMIN, HR) và cờ `ACCOUNTANT.superAdminOnly`;
  - ADR-0074 điều 5 (B9a).
- Nếu chủ không chọn chặn (ii) và (iii), văn bản phải ghi rõ đó là **rủi ro còn lại**, kèm tin báo cho Toàn quyền mỗi lần có người được cấp quyền Kế toán. Đồng thời phải sửa câu "chặn từ gốc" ở đ4 và câu "điều kiện cho lượt A" ở trang ghép §4.

**B2. Tài khoản cũ vẫn để người đặt PIN biết PIN dài hạn — Phải sửa (câu hỏi mới Q-B6).**
- Cột mới mặc định là "không tạm". Mọi PIN do người khác đặt trước ngày phát hành mà chủ tài khoản chưa tự đổi vẫn nằm trong tay người đặt: Quản trị (trước ADR-0071), Nhân sự, hoặc kịch bản nạp ban đầu.
- Với quyền đặt chính sách "nhiều máy" (ADR-0085), đăng nhập bằng PIN đó **không đá ai**, tức hoàn toàn im lặng. Đây chính là điều câu 4 muốn đóng ("người đặt lại PIN không được biết PIN dùng lâu dài").
- **Câu thêm đề xuất (đ6):** *"Lúc phát hành, tài khoản nội bộ nào chưa có lần tự đổi PIN (`pin_changed` hoặc `pin_set_by_passkey` của chính mình) sau lần `staff_created` / `pin_reset` gần nhất thì bị đánh dấu PIN tạm, không hạn. Lần đăng nhập tới phải đổi PIN."*
- Việc này chạm dữ liệu thật, nên chủ phải quyết. Số tài khoản bị ảnh hưởng: **chưa kiểm**, cần lệnh chỉ đọc trên dữ liệu thật do chủ chạy. Nhật ký thời nạp ban đầu có đủ hay không cũng **chưa kiểm**.

**B3. Phiên PIN tạm phải có danh sách mở ghi nguyên văn, kể cả điều bị chặn — Phải sửa.**
- **Được mở:** `GET /api/auth/me` (vỏ trang cần, `auth/index.ts:338`), `POST /api/account/change-pin` (`accounts/index.ts:202`), đăng xuất (route public).
- **Phải ghi rõ là bị chặn:** bật Face ID (`POST /api/account/passkeys/options`, `accounts/index.ts:228`) và đặt PIN bằng Face ID. Route bật Face ID chỉ đòi "PIN hiện tại", mà PIN tạm thoả điều đó.
- Nếu lọt, người đặt lại đăng nhập bằng PIN tạm, gắn Face ID máy mình, rồi đưa PIN tạm cho chủ thật. Chủ thật đổi PIN xong, Face ID kia **vẫn vào được**: một cửa sau dài hạn, cùng loại với chuỗi rủi ro đã ghi ở ADR-0016 (`:130-135`).
- Kèm hai việc:
  - bài kiểm "đỏ trước": phiên PIN tạm gọi bật Face ID phải bị 403;
  - một lưới an toàn: đổi PIN tạm thành công thì gỡ mọi Face ID còn hiệu lực (bình thường là 0, vì `reset-pin` đã gỡ hết ở `accounts/index.ts:669`).

**B4. Một nguồn cho cờ PIN tạm — Nên sửa.**
- Chỉ dùng cột trên `staff`: một cột "PIN tạm hết hạn lúc", NULL nghĩa là không tạm. Router đọc cờ qua hồ sơ người dùng ở mỗi yêu cầu.
- Bỏ dòng `aut_session` ở trang ghép §1 (A20).
- Lý do: cờ đặt theo **tài khoản** thì chặn được mọi kiểu phiên, kể cả Face ID và Google lát 2 sau này, mà không phải đụng sổ phiên vừa ổn định ở ADR-0085.

**B5. Lý do ở đ5 nói quá; tin của đ3 không tới người thật — Nên sửa.**
- "Chủ thật bị khoá ngoài nên mạo danh lộ ra ngay" **đã đúng từ hôm nay**: đặt lại PIN vốn đá phiên và làm PIN cũ hỏng (QT04). Giá trị thật của đ1–2 là **người đặt không giữ được PIN dài hạn**, tức chặn kiểu đăng nhập lặng lẽ về sau.
- Tin "cho chính chủ trong hộp thông báo" ở đ3 nằm trong chính tài khoản. Khi kẻ mạo danh đang giữ tài khoản, chủ thật không đọc được. Gõ cửa trên máy cũ cũng đã bị tắt khi đặt lại PIN (`dongBangTin({ tatThongBao: true })` trong `reset-pin`).
- **Câu sửa đề xuất** cho đ3: *"Ngay sau khi chủ tài khoản tự đặt PIN mới, màn hình hiện: 'Tài khoản được đặt lại PIN lúc … Từ đó tới nay có N lần đăng nhập hoặc đổi PIN trên các máy: …. Không phải bạn thì báo người phụ trách hệ thống.'"* Màn này đọc sổ phiên của chính mình, đã có route `GET /api/account/sessions`. Đây là đường duy nhất báo được tới **người thật**.
- Giữ tin cho Toàn quyền.

**B6. Một định nghĩa "tài khoản có quyền tiền" — Phải sửa, đi cùng B1.**
- Thêm đ0: *"Tài khoản có quyền tiền = giữ ít nhất một ô ghi tiền mà Quản trị không có: `ledger.write`, `payment.refund`, `order.complete`, `accounting.entry.mark`."* Bốn ô ở `permissions.ts:114, 105, 110, 120`.
- Định nghĩa là một hàm suy từ bảng quyền, dùng chung cho đ3, đ4 và giao diện. Hôm nay hàm này cho ra đúng ACCOUNTING và SUPER_ADMIN.

**B7. Hạn PIN tạm đụng giới hạn của Nhân sự — Nên sửa (xem Q-B1).** Nhân sự không làm hỗ trợ đăng nhập (ADR-0071 1e, `:32`). PIN tạm khi tạo tài khoản mà hết hạn thì phải nhờ Quản trị, hoặc Toàn quyền nếu là tài khoản Kế toán. Với khoảng 1.000 tài khoản đối tác, hạn 24 giờ sẽ dồn việc lên Quản trị.

**B8. Định nghĩa "hết hạn" — Nên sửa.**
- Hạn tính tới lúc **đổi PIN**, không phải tới lần đăng nhập đầu.
- Đăng nhập bằng PIN tạm đã hết hạn nhận câu riêng: "Mã PIN tạm đã hết hạn — nhờ người quản lý cấp lại". Câu này chỉ hiện khi PIN đúng, nên không lộ việc tài khoản tồn tại.
- Lần nhập sai vẫn tính vào bộ chống dò.

**B9. Quan hệ với ADR-0074 (đã duyệt, chưa thi công) — Nên sửa.**
- **(a)** ADR-0074 điều 5 (`:22`) cho Quản trị "Tắt bảo mật hai lớp" của mọi tài khoản không giữ Quản trị/Toàn quyền, tức có cả Kế toán. Để đ4 nhất quán, việc này với tài khoản quyền tiền cũng chỉ Toàn quyền làm. Cần thêm dòng vào "Thay câu nào".
- **(b)** Ghi thứ tự lần đăng nhập đầu: PIN tạm → đổi PIN → đăng ký lớp hai.
- **(c)** Hướng về sau: khi có Zalo ZNS (ADR-0074 đợt 2), gửi PIN tạm thẳng cho người dùng để người đặt không thấy. Cách này đóng hẳn GD-P-01.

**B10. Gợi ý.** Trên danh sách tài khoản, người đặt lại thấy trạng thái "Đang chờ đổi PIN tạm" hoặc "Đã đổi lúc …", không kèm thiết bị hay IP. Việc hỗ trợ dễ hơn mà không lộ gì.

**B11. Gợi ý.**
- Nút "Đặt lại PIN" ẩn hay hiện theo một cờ máy chủ tính cho **từng dòng**, như `datLaiPinDuoc` ở `accounts/index.ts:735`. Giao diện như vậy không phải chép lại luật quyền tiền.
- Cờ đó phải dùng chung một hàm với cổng của route.

**B12. Gợi ý.** Lỗi 403 do PIN tạm nên có mã riêng, ví dụ `pin_tam_phai_doi`, để vỏ trang chuyển màn theo mã, không phải dò câu chữ.

**B13. Gợi ý.**
- ADR-0042 điều 2 (`:16`, kẽ hở đổi SĐT) dựa trên tiền đề "Quản trị vốn đặt lại PIN được". Với tài khoản Kế toán, tiền đề này không còn đúng.
- Đổi SĐT làm mới bộ đếm chống dò theo SĐT. Rủi ro nhỏ vì vẫn còn giới hạn theo IP, nhưng nên ghi một câu là đã xét.

### ADR-0091 — Bán hàng phá lệ mốc 6 giờ

**C1. Chỉ nhận ngoại lệ khi lệnh đang thật sự bị mốc chặn — Phải sửa.**
- Route đặt gấp không kiểm chặng có dưới mốc hay không. QT02 đã ghi: "đặt gấp NHẦM chặng 2026-10-05 08:00 (không dưới mốc) → 200" (`orders/index.ts:887-915`).
- Dấu đặt gấp trên chặng lại **miễn luôn mốc lúc xếp** cho lệnh XEP và DOI_DEN (`moc-toi-thieu.ts:67`; `dieu-phoi-kiem.ts:244`).
- Nếu Bán hàng đóng được dấu sớm vài ngày, họ bỏ qua mốc lúc xếp hoàn toàn. Nhãn có hiện, nhưng gắn vào một thời điểm chẳng có gì gấp.
- **Câu sửa đề xuất:** *"Máy chủ chỉ nhận ngoại lệ của Bán hàng khi, ngay lúc gửi, lệnh mà ngoại lệ mở khoá đang bị mốc chặn. Với xác nhận hay sửa chặng: giờ đón < bây giờ + mốc. Với xếp xe: chuyến đích trong mốc, tính theo giờ xuất bến sớm nhất từng có. Ngoài hai trường hợp này trả 409."*
- Lưu ý: hai phép đo dùng **hai đồng hồ khác nhau**. Lúc đặt đo tới giờ đón (`kiemMocDat`); lúc xếp đo tới giờ xuất bến (`kiemMocXep`). Một chặng có thể chưa dưới mốc theo giờ đón mà chuyến của nó đã vào mốc.

**C2. Liệt kê đủ những chỗ được phá lệ — Phải sửa (câu hỏi mới Q-B7).** Đ1 chỉ nêu "xác nhận" và "xếp xe trong mốc". Thực tế có bốn cổng:
- (a) **xác nhận đơn**;
- (b) **sửa ngày, giờ, nơi của chặng đã xác nhận khi dưới mốc** (I14, `orders/index.ts:84`). Lý do "Đổi giờ theo yêu cầu khách" ở đ2 ngầm hiểu là có, nhưng đ1 không ghi;
- (c) **lệnh nào** trong bảy lệnh khoá theo mốc (`moc-toi-thieu.ts:65`: XEP, RUT, DOI_DI, DOI_DEN, DOI_XE, DOI_TAI_XE, HUY_CO_KHACH), và đổi xe hay tài xế khi sửa chuyến (`dieu-phoi-kiem.ts:127`);
- (d) **thêm điểm đón khi xe đang chạy** cho chặng không đặt gấp (ADR-0052 `:29`, `:246`: "Bán hàng gọi phá lệ → 403").

Đề xuất mở (a), (b), (d); với (c) chỉ mở **XEP** (đưa chặng chưa có xe lên xe), đúng tình huống QT02. Đổi xe, đổi tài xế, rút khách, dời khách và huỷ chuyến còn khách trong mốc vẫn để Quản trị, **cho tới khi việc báo tài xế (G8) xong**. Lý do: đổi xe hay tài xế sát giờ chính là chỗ G8 cho thấy tài xế không được báo (KD08).

**C3. "Chỉ SALES" không làm được; cần luật ưu tiên và phạm vi — Phải sửa.**
- **Bắt buộc:** cột SUPER_ADMIN của ô mới = any (`permissions.test.ts:91-93`).
- **Luật ưu tiên:** người gửi giữ `order.leg.short_notice` (Quản trị, Toàn quyền, kể cả tài khoản kiêm Bán hàng) thì luôn ghi là "Đặt gấp" do Quản trị duyệt. Chỉ người có ô ngoại lệ mà **không** có ô đặt gấp mới ra nhãn "Ngoại lệ 6 giờ".
- **Phạm vi:** ghi rõ ô dùng "mọi đơn" (any) hay "đơn mình lập hoặc phụ trách" (ownOrAssigned). Đề xuất **any**. Lý do:
  - người trực đêm phải lo cả đơn của người khác và đơn đối tác;
  - lệnh xếp xe của Bán hàng vốn đã là any;
  - đặt gấp của Quản trị cũng không giới hạn phạm vi.
- Nếu muốn theo Hiến chương 5.8 (bước gắn với vai trên đối tượng) thì chọn ownOrAssigned cho cổng xác nhận và sửa chặng, any cho cổng xếp.

**C4. Nhãn hiển thị sai cho người không có ô xem đủ — Phải sửa.**
- `datGapTheoVai` (`dat-gap.ts:81-85`) trả cờ `{ daDuyet: true }`. `lichSuTheoVai` (`:101-107`) ghi "Đặt gấp — Quản trị đã duyệt" và người làm là "Quản trị" (`:95`, `:107`). Ba nhóm Đối tác, HDV, Thực tập đều thấy như vậy.
- Với ngoại lệ do Bán hàng làm, câu "Quản trị đã duyệt" là **sai sự thật**.
- **Câu sửa đề xuất:** *"Người không có ô xem đủ thấy **loại** dấu ('Đặt gấp' hoặc 'Ngoại lệ 6 giờ'), không thấy người làm, lý do, ghi chú. Câu rút gọn trong lịch sử đổi theo loại dấu."*
- Như vậy **không cần** mở ô `.view` cho HDV, vì cờ hẹp đã tới HDV. Nếu vẫn muốn mở ô `.view` cho HDV, đó là sửa lời chủ H4/N-14 (đã ghim ở `permissions.test.ts:406`), nên phải vào bảng "Thay câu nào".
- Đồng thời phải quyết **Đối tác có thấy nhãn trên đơn của mình không**; nháp im lặng về điều này. Đề xuất: Đối tác thấy loại dấu như hôm nay (Q-B8).

**C5. Bảng "Thay câu nào" sai và thiếu — Phải sửa.**
- **Bỏ** dòng ADR-0051 (A25).
- **Thêm** các dòng sau:
  - ADR-0049 `:365`, phương án bị loại "Bán hàng tự phá lệ". Phải nói rõ **một lần** với chủ (P18) rằng 0091 đảo ngược phương án chủ đã loại ngày 29/9;
  - ADR-0049 `:161-162` (hai dòng Đặt và Xếp), `:201` (ô quyền), `:266` (câu thay ADR-0047 A1 "chỉ Quản trị, Toàn quyền sửa"), `:30` (tóm tắt);
  - ADR-0052 `:29`, `:246`, nếu mở cổng (d);
  - ADR-0034 điều 1 (`:21`): hành động nguồn của hộp thông báo;
  - ADR-0050 `:260`: "cờ đặt gấp" trong hàm `lichChungChang` phải mang thêm loại dấu;
  - I16 của kế hoạch ADR-0049 và chú thích migration 0040: lệnh gỡ trở thành lối ghi thứ ba.

**C6. Chỗ ghi ngoại lệ lúc xếp — Nên sửa (đơn giản hoá).**
- Trang ghép định thêm cột vào `vc_trip`. Cột ADR-0056 mà nó dựa vào chưa có (A18). Phá lệ lúc xếp hôm nay là một **sự kiện chỉ-thêm**, nên "gỡ" ở đ5 không áp được.
- **Đề xuất:** một dấu duy nhất trên **chặng** (`ord_transfer_leg`: năm cột cũ cộng một cột "loại dấu") làm nguồn cho nhãn "Ngoại lệ 6 giờ".
  - Khi Bán hàng xếp kèm ngoại lệ, lệnh xếp ghi luôn dấu chặng trong cùng lô. Câu ghi do module `orders` cấp, đúng Hiến chương 5.3.
  - Luật sẵn có "xếp chính chặng đã đặt gấp thì qua" lo phần còn lại.
- Được:
  - không thêm cột vào `vc_trip`, không đổi `trip.override`;
  - thẻ đơn, trang đơn và lịch chung đọc nhãn ở một chỗ;
  - `orders` không phải đọc sự kiện của `van-chuyen`.
- Phải kiểm khi lập kế hoạch: hai đồng hồ (C1).

**C7. Lệnh gỡ (đ5) — Nên sửa.** Ghi rõ năm điểm:
- **(a) Gỡ cái gì:** chỉ dấu trên chặng.
- **(b) Khi nào:** chặng chưa có suất mở trên xe nào. "Chuyến chưa xuất bến" là tiêu chí sai, vì chặng có thể chưa thuộc chuyến nào.
- **(c) Hệ quả:** gỡ không đưa đơn về nháp. Sau khi gỡ, xác nhận, sửa và xếp dưới mốc lại bị chặn như thường.
- **(d) Ai gỡ:** Bán hàng chỉ gỡ dấu ngoại lệ của chính mình, không gỡ được "Đặt gấp" của Quản trị.
- **(e) Nhật ký:** giữ dòng cũ, lịch sử vẫn còn nhãn.

**C8. Danh sách lý do — Nên sửa.**
- Hôm nay đã có **hai** danh sách:
  - `LY_DO_DAT_GAP` trong mã (`chang-dua-don.ts:32-37`);
  - nhóm `PHA_LE` của `vc_reason` (dữ liệu).
- Nháp thêm danh sách thứ ba.
- **Đề xuất:** một danh sách cho mọi điểm phá lệ, ưu tiên dạng dữ liệu có kiểu (Hiến chương 5.2). Các mã mới thêm vào danh sách đó.
- Ghi chú khi chọn "Khác" (≥ 10 ký tự) vẫn che dãy số và không vào nhật ký (I18), như hôm nay.

**C9. Trang ghép §3 thiếu các chỗ đổi nghĩa — Nên sửa.**
- **Câu báo của máy chủ:**
  - `orders/index.ts:79` (CANNOT_SHORT_NOTICE), `:84` (SUA_DUOI_MOC), câu 409 lúc xác nhận;
  - `van-chuyen/dieu-phoi-route.ts:28` (CAN_PHA_LE) và câu "Ai xử lý: Quản trị".
- **Giao diện:**
  - `web/trip-sheet.ts` (khung đặt gấp khi sửa chặng);
  - `web/order-form.ts:599`;
  - lịch chung: `van-chuyen/index.ts:805` truyền `can(order.leg.short_notice)`.
- **Trợ lý Mai:** bảng tên ô quyền (`tro-ly-cau-truc-ten.ts:73-74`, `:169`) và hướng dẫn theo vai trong Trợ giúp. Không sửa thì Mai sẽ trả lời sai "chỉ Quản trị đặt gấp được".
- **ADR-0062:** hàm đọc đuôi nhật ký đang bỏ đuôi " · đặt gấp: …" khỏi câu tin. Đuôi mới phải được hàm đọc biết, kèm bài khứ hồi.

**C10. Tự duyệt và lạm dụng — Nên sửa.**
- **Không** đặt giới hạn cứng: giới hạn sẽ tái tạo đúng cảnh ban đêm bị chặn.
- Thay vào đó:
  - nhãn ghi thêm "tự duyệt" khi người phá lệ cũng là người lập hoặc phụ trách đơn;
  - Trang chủ của Quản trị có ô "Ngoại lệ 6 giờ trong 7 ngày: N — theo người";
  - bộ lọc theo người.
- Điều kiện xem lại: ở Q-B3.

**C11. Nói rõ phạm vi so với tình huống gốc — Nên sửa.**
- Đ1(a), tức Bán hàng tự đặt gấp lúc xác nhận, kể cả ban ngày, **rộng hơn** QT02 (xếp xe lúc đêm).
- Câu 5 hỏi "phá lệ mốc 6 giờ" nói chung, nên đọc rộng là hợp lý. Nhưng phần Bối cảnh phải cho chủ thấy mình đang duyệt cả ban ngày (gắn với Q-B3).

**C12. Gợi ý.**
- Tin báo đi vào ngăn "Của tôi" của Quản trị.
- Toàn quyền là vai kỹ thuật (ADR-0038, ADR-0072), còn ngoại lệ là việc kinh doanh. Để chủ chọn Toàn quyền nhận ở "Của tôi" hay chỉ ở "Tất cả".
- Ghi giờ đón vào phần chi tiết nhật ký, không kèm tên hay SĐT.

**C13. Gợi ý.** Đồng ý không hiện nhãn cho tài xế và không in lên ảnh xác nhận gửi khách.

**C14. Gợi ý.** Nếu ADR-0063 (proposed: đổi giờ tối đa 2 lần mỗi đơn) được duyệt, nên ghi một câu: ngoại lệ "Đổi giờ theo yêu cầu khách" vẫn tính vào số lượt đổi giờ.

---

## (C) Trả lời Q-B1 … Q-B5, câu thêm về đ4, và ba câu mới

### Q-B1 — Hạn PIN tạm
- **Đề xuất:** tách hai hạn. **Đặt lại PIN: 24 giờ. Tạo tài khoản mới: 7 ngày.** Cả hai tính tới lúc đổi PIN.
- **Lý do:**
  - Đặt lại PIN thường do chính người dùng nhờ, họ đang chờ và dùng ngay trong vài phút. HDV đi tour nhiều ngày cũng nhờ đặt lại lúc cần rồi dùng ngay, nên 24 giờ không vướng mà cửa sổ hở hẹp.
  - Tạo mới thì khác: nhân viên hay đối tác mới chưa chắc cài app ngay. Nhân sự lại không cấp lại được (ADR-0071 1e). Hạn 24 giờ cho khoảng 1.000 đối tác sẽ đẩy việc sang Quản trị.
- **Phương án khác:**
  - Một con số 72 giờ cho cả hai. Đơn giản hơn; cái giá là PIN tạm nằm trong tin Zalo sống lâu hơn ở mọi trường hợp.
  - 24 giờ cho cả hai, và cho Nhân sự "cấp lại PIN tạm cho tài khoản chưa đăng nhập lần nào". Cái giá: thêm một việc hỗ trợ đăng nhập cho Nhân sự, phải sửa ADR-0071 1e.
- **Nên đổi ý khi:** số liệu cho thấy phần lớn tài khoản mới đổi PIN ngay trong ngày (rút về 24 giờ), hoặc nhiều tài khoản đối tác hết hạn (nới thêm, hoặc cho Nhân sự cấp lại).

### Q-B2 — Đ4 áp cho quyền nào
- **Viết lại câu hỏi.** "Thêm ADMIN" không phải một phương án, vì đã đúng từ hôm nay (A6). Câu hỏi thật là: **chặn những đường nào** dẫn tới một tài khoản giữ tiền do người khác điều khiển.
- **Đề xuất (A):** quyền Kế toán, theo định nghĩa ở B6, vào nhóm **"chỉ Toàn quyền cấp và hỗ trợ đăng nhập"**. Bốn việc chỉ Toàn quyền làm: đặt lại PIN; gán vai hoặc cộng tay quyền Kế toán; tạo tài khoản có quyền Kế toán; tắt lớp hai.
- **Lý do:**
  - QT04 chứng minh có cả đường đặt lại PIN lẫn đường cấp thêm quyền Kế toán.
  - Chủ đã nói nguyên tắc ở ADR-0072 điều 1: "Kế toán là quyền ghi sổ; tách nhiệm vụ … Toàn quyền cộng tay".
  - Công ty có 1–2 Kế toán, nên việc dồn lên Toàn quyền rất ít.
  - Không cần migration: cờ chỉ-Toàn-quyền của vai nằm trong mã (`roles.ts`).
- **Phương án khác:**
  - **(B)** Như nháp: chỉ chặn đặt lại PIN, cộng tin báo cho Toàn quyền mỗi lần có người được cấp quyền Kế toán. Cái giá: đường gán và đường tạo vẫn mở, chỉ phát hiện sau khi đã xảy ra; phải bỏ câu "chặn từ gốc".
  - **(C)** Đưa ACCOUNTING vào nhóm cấp bậc như Quản trị và Nhân sự (`SUPER_ADMIN_GRANTED`). Chỉ sửa một chỗ. Cái giá: Quản trị mất cả các việc vặt trên tài khoản Kế toán (mở khoá, đổi tên, ngưng).
- **Nên đổi ý khi:** công ty có nhiều Kế toán, hoặc Toàn quyền thường vắng dài ngày. Khi đó cân nhắc (B) kèm tin báo.

### Câu thêm — có nên siết đ4 hơn nữa (ví dụ cả ADMIN)?
- **Không cần thêm ADMIN:** luật cấp bậc đã chặn (A6).
- **Không nên mở rộng sang Bán hàng hay HDV:** Quản trị đã có mọi quyền tiền mà các tài khoản đó có (`payment.receive` any, `order.handover` any — `permissions.ts:103`, `:108`). Mạo danh họ không mở thêm quyền tiền nào, chỉ để đổ lỗi cho người khác. Đ1–3 cộng màn "từ lần đặt lại tới nay" ở B5 đủ để việc đó lộ ra.
- **Nên siết theo chiều khác:** gán quyền, tạo tài khoản và tắt lớp hai (B1, B9a).

### Q-B3 — Giới hạn giờ cho ngoại lệ
- **Đề xuất:** **mọi giờ**, như nháp, nhưng **phải kèm** C1 (chỉ nhận khi lệnh thật sự bị mốc chặn) và ô đếm trên Trang chủ của Quản trị (C10).
- **Lý do:**
  - Công ty nhỏ, ban ngày Quản trị (Giám đốc, Điều hành chung) cũng hay vắng.
  - Khung giờ cần một cài đặt "giờ trực" mà mã chưa có, và sinh ca biên (đơn xác nhận lúc 17:59).
  - Nhãn, tin báo và bộ lọc đủ để rà lại sau.
- **Phương án khác:** chỉ ngoài giờ hành chính.
  - Được: ban ngày giữ đúng điều chủ chọn ngày 29/9 (ĐP3).
  - Mất: thêm một cài đặt, và ban ngày Quản trị vắng thì lại kẹt.
- **Nhắc một lần (P18):** chọn "mọi giờ" là đảo ngược trọn phương án chủ đã loại ở ADR-0049, không chỉ vá ban đêm.
- **Nên đổi ý khi:** sau 2–4 tuần, phần lớn ngoại lệ rơi vào giờ hành chính, hoặc có sự cố do ngoại lệ. Khi đó chuyển sang khung giờ.

### Q-B4 — Báo Quản trị
- **Đề xuất:** chỉ hộp thông báo, ngăn "Của tôi" của Quản trị, **không gõ cửa điện thoại**. Thêm ô đếm trên Trang chủ.
- **Lý do:**
  - Mục đích của ngoại lệ là **không phải đánh thức** Quản trị. Gõ cửa ban đêm tái tạo đúng sự phụ thuộc đó.
  - Luật hiện hành (ADR-0045, ADR-0036) chỉ gõ cửa cho việc phải làm ngay. Ngoại lệ thì việc đã xong.
- **Phương án khác:** gõ cửa ngay. Cái giá: Quản trị bị đánh thức vì việc đã xong, dễ tắt thông báo luôn, và mất kênh cho việc quan trọng thật.
- **Phương án giữa (để sau):** chỉ gõ cửa khi đơn đã xác nhận dưới mốc mà chưa có xe.
- **Nên đổi ý khi:** có lần khách lỡ chuyến mà Quản trị biết quá muộn.

### Q-B5 — Đối tác, HDV có được phá lệ không
- **Đề xuất:** **không**. Ghi thêm **Thực tập** và **Kế toán** cũng không; nháp chưa nhắc hai nhóm này.
- **Lý do:**
  - HDV không xác nhận đơn và không xếp xe (`order.modify` và `trip.dispatch` của FIELD đều none), nên ô này với HDV không có tác dụng.
  - Đối tác là bên ngoài (khoảng 1.000 tài khoản) và đã tự xác nhận được đơn của mình (DT03). Cho họ tự phá lệ là để người ngoài tự bỏ qua khung vận hành của công ty.
  - Thực tập cần người kèm.
  - Đơn đối tác gấp ban đêm do Bán hàng trực xử lý, vì ô mới có phạm vi "mọi đơn".
- **Phương án khác:** cho phép, có gắn nhãn. Cái giá: hàng nghìn người ngoài mở được lối này, và nhãn nhiều tới mức mất nghĩa "đáng chú ý".
- **Nên đổi ý khi:** đối tác lớn đặt gấp ban đêm thường xuyên mà không có Bán hàng trực. Khi đó cân nhắc cách "đối tác gửi yêu cầu ngoại lệ, Bán hàng trực bấm", không phải để đối tác tự phá lệ.

### Câu mới cần chủ trả lời (phát sinh khi duyệt)
- **Q-B6 (từ B2):** tài khoản cũ có PIN do người khác đặt mà chưa tự đổi lần nào có phải đổi PIN ở lần đăng nhập tới không?
  - **Khuyến nghị:** có, với **tài khoản nội bộ** (khoảng 30). Đối tác thì không bắt.
  - Mất: mỗi người nội bộ chưa đổi PIN phải đổi một lần.
- **Q-B7 (từ C2):** Bán hàng được phá lệ ở những lệnh nào?
  - **Khuyến nghị:** xác nhận đơn; sửa giờ hoặc nơi dưới mốc; đưa chặng chưa có xe lên xe; thêm điểm khi xe đang chạy.
  - **Chưa mở:** đổi xe, đổi tài xế, rút khách, dời khách, huỷ chuyến còn khách. Các lệnh này để sau khi việc báo tài xế (G8) xong.
- **Q-B8 (từ C4):** Đối tác có thấy nhãn "Ngoại lệ 6 giờ" trên đơn của mình không?
  - **Khuyến nghị:** thấy **loại** dấu như hôm nay, không thấy người làm và lý do.

Lượt B vẫn chỉ gồm 2 quyết định chạm quyền và dữ liệu, trong hạn 3 của CLAUDE.md §9. Q-B6 chạm dữ liệu thật, nên nằm trong ADR-0090 và cần chủ trả lời rõ.

---

## (D) Kết luận tổng

**Duyệt được sau khi sửa 9 chỗ "phải sửa".** Nguyên tắc chủ đã chọn được viết đúng hướng. Nhưng ở bản này, ADR-0090 không đóng được đúng đường mà QT04 đã chứng minh, và ADR-0091 để hở một lối bỏ qua mốc hoàn toàn. Chưa nên trình chủ duyệt văn bản trước khi sửa.

**Phải sửa (9), xếp theo mức nguy hiểm:**
1. **B1 + B6** — đ4 chưa chặn đường gán thêm quyền Kế toán và đường tạo tài khoản Kế toán (QT04 biến thể, GD-P-01). Viết lại đ4 và Q-B2, kèm một định nghĩa "tài khoản có quyền tiền" và các dòng "Thay câu nào" tương ứng.
2. **C1** — chỉ nhận ngoại lệ khi lệnh đang thật sự bị mốc chặn. Nếu không, Bán hàng đóng dấu trước và bỏ qua mốc lúc xếp.
3. **B3** — phiên PIN tạm phải chặn bật Face ID, có bài đỏ trước. Nếu không, người đặt lại giữ được cửa sau dài hạn. Danh sách mở phải có `/api/auth/me`.
4. **B2** — tài khoản cũ có PIN do người khác đặt (Q-B6).
5. **C2** — liệt kê đủ bốn cổng phá lệ và các lệnh xếp được mở (Q-B7).
6. **C4** — câu "Quản trị đã duyệt" sẽ sai với HDV, Đối tác, Thực tập. Nói rõ ai thấy gì (Q-B8). Việc đổi ô `.view` của HDV đưa vào "Thay câu nào".
7. **C3** — SUPER_ADMIN = any; luật ưu tiên khi giữ cả hai ô; phạm vi của ô.
8. **C5** — sửa và bổ sung bảng "Thay câu nào" (ADR-0049 phương án bị loại, :161-162, :201, :266; ADR-0034 đ1; ADR-0050; ADR-0052; I16), bỏ dòng ADR-0051.
9. **B0** — chữa sáu chỗ sai ở bảng A (số dòng, bảng `thongbao`, cột `vc_trip`, nhãn 7a/7b, dòng ADR-0051, tiền đề Q-B2).

**Nên sửa:** B4, B5, B7–B9, C6–C11. (B6 đi cùng B1, tính trong chỗ phải sửa số 1.) **Gợi ý:** B10–B13, C12–C14.

**Thứ tự thi công.** Đồng ý một nửa với nháp ("0090 trước hoặc cùng lượt A"). Đề xuất chia làm ba phần:
- **Lát 1 của 0090: đ4 mở rộng theo Q-B2 (A).**
  - Gồm đặt lại PIN, gán quyền và tạo tài khoản Kế toán chỉ Toàn quyền.
  - Nhỏ, không migration, nên làm **trước hoặc cùng** lượt A.
  - Lượt A thêm lệnh tiền mới đi qua đúng các ô `ledger.write` / `payment.refund` mà đ4 bảo vệ. Vá đ4 đóng đường mạo danh cho cả lệnh cũ lẫn lệnh mới.
- **Lát 2 của 0090: PIN tạm.**
  - Gồm migration, cổng router, vỏ trang, giao diện, và B2 nếu chủ chọn.
  - **Không được chặn lượt A.** Lượt A sửa các lỗi tiền đang trong sổ dừng dây chuyền, hạn 15/10 và 31/10 (`docs/quyen-hoan.json`: F-02, TNV-G1, F-03, TNV-G3, TNV-G4).
  - Rủi ro QT04 đã có từ trước. Lượt A không làm nó nặng thêm khi đ4 đã vá.
- **0091 làm sau lát 1.**
  - Phối hợp với lộ trình Vận chuyển: `main` đã có đợt 1 chạm `van-chuyen`, `dat-gap-ui`, lịch chung.
  - Lập kế hoạch trên `main` (nhánh này chậm 19 commit).
  - Cả hai ADR đều là **việc lớn**, cần người kiểm độc lập và dòng mới trong `docs/SO-HANG-RAO.md` cho cổng PIN tạm, có ngày quan sát chặn thật.

---

## (E) Lời thường cho chủ dự án (≤ 150 từ)

Hai quyết định đúng hướng bạn chọn, nhưng bản nháp cần sửa trước khi duyệt.

- **PIN tạm:** nháp chỉ cấm Quản trị đặt lại PIN Kế toán. Thử thật cho thấy Quản trị vẫn cấp thêm quyền Kế toán cho người khác được, Nhân sự tạo được tài khoản Kế toán mới. Đề nghị: việc cấp quyền Kế toán chỉ bạn làm.
- **PIN cũ** do người khác đặt vẫn nằm trong tay người đặt. Đề nghị nhân viên nội bộ đổi một lần.
- **Phá lệ 6 giờ:** phải chặn đóng dấu trước vài ngày; chỉ mở cho xác nhận, sửa giờ, xếp khách lên xe. Đổi xe, đổi tài xế sát giờ để sau.
- **Thứ tự:** phần chặn quyền Kế toán nhỏ, làm cùng đợt sửa tiền; PIN tạm làm sau.
