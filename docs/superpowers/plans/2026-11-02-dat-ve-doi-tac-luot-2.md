# Đặt vé của đối tác, lượt 2 — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đối tác đặt vé không phải nhập giờ đón, văn phòng chốt giờ ở bảng Còn vé; Toàn quyền có công tắc ẩn thông tin khách, đơn lập lúc bật được miễn luật thiếu tên; Quản lý tài khoản có cột «Cấp độ đại lý» xem và đặt nhanh.

**Architecture:** Luật thuần nằm ở `src/shared/`, máy chủ quyết, giao diện chỉ hiện theo. Cờ «cần chốt giờ» và dấu miễn danh sách chụp một lần vào hai cột mới chỉ thêm; công tắc là bảng chính sách chỉ thêm khuôn `ord_confirm_policy`. Không đổi `tinhCanXacNhan`, `lyDoThieuTen`, `v_ord_order_flag`. Cột cấp gọi đúng `tomTatHoaHongHoSo`, đọc số câu cố định, ghi qua ba route sẵn có.

**Tech Stack:** TypeScript, Cloudflare Worker + D1, giao diện thuần qua `h()`, `node --test` chạy trực tiếp `.ts`, khung thử SQLite thật `tests/audit/*.mjs`.

**Spec:** `docs/adr/ADR-0154-doi-tac-khong-nhap-gio-don-va-cong-tac-an-thong-tin-khach.md` (accepted 2026-11-02), `docs/adr/ADR-0155-vai-doc-lap-voi-tai-khoan-va-cot-cap-o-quan-ly-tai-khoan.md` **chỉ Đ2** (accepted 2026-11-02; Đ1 vẫn là đề xuất, chờ, không thuộc kế hoạch này), đặc tả `docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md` §5 QĐ-B, C2, §8, §9 (ADR thắng đặc tả), trang ghép `docs/superpowers/specs/2026-11-02-trang-ghep-dat-ve-luot-2.md`, kết quả kiểm `docs/superpowers/specs/2026-11-02-ket-qua-kiem-adr-0154-0155.md`. Khuôn: `docs/superpowers/plans/2026-11-02-dat-ve-doi-tac-luot-1.md`.

## Câu đã áp theo khuyến nghị

ADR chưa nói rõ hoặc khác mã. **Điều phối 2026-11-02 áp cả bảy câu theo khuyến nghị** (lời chủ 2026-10-02: «đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa»): không câu nào đổi chữ ADR đã duyệt, đụng tiền của khách, nới luật tách nhiệm vụ hay hoà giải hai văn bản chuẩn tắc; câu 5 đúng chữ đặc tả §5 B1. Báo chủ trong báo cáo để bác nếu muốn; chủ bác câu nào thì sửa đúng task nêu ở cuối câu đó.

1. **«Chặng đầu tiên của dịch vụ» là chặng nào?** ADR dùng chữ này, nhưng `s.legs` xếp bằng `xepChang` (`src/shared/chang-dua-don.ts`): giờ có trước giờ trống. Đơn hai chiều cùng ngày, chiều đi trống giờ, chiều về có giờ gợi ý thì `legs[0]` là chiều về và luật không chạy, đúng ca phổ biến ADR muốn chặn. **Khuyến nghị:** xếp riêng, chiều đi trước chiều về, rồi ngày (trống sau), giờ có trước trống, giờ, id; máy chủ, giao diện và kiểm định kỳ dùng cùng thứ tự, có bài tương đương. *(Điều phối đổi 2026-11-02 sau người kiểm, phát hiện N-3: bản đầu xếp ngày trước chiều, nên người xét chỉ đổi ngày đi của đơn nhiều ngày thì lọt cổng giờ.)* *(Task 1.2, 1.4, 3.1, 3.3)*
2. **Tiêu chí (i) «409 với người không có ô» khi có kèm `datGap`.** `xetDatGapSua` trả 403 `CANNOT_SHORT_NOTICE` ở cả năm cửa của ADR-0107. **Khuyến nghị:** không kèm `datGap` (đường giao diện của Kế toán, HDV nội bộ) trả 409 `short_notice_required` đúng chữ ADR; kèm qua API trả 403 như năm cửa kia; bài ghim cả hai, cả hai không ghi gì. *(Task 1.3)*
3. **Đ1.6 biết «đơn do tài khoản Đối tác lập» bằng cách nào?** ADR chỉ cho hai cột mới, không có cột người lập là đối tác. **Khuyến nghị:** đọc quyền hiện hành của người lập qua view công bố `v_stf_quyen_mo`, không thêm cột. Hệ quả chấp nhận: người lập đã thôi quyền thì ghi chú không bị che. *(Task 1.4)*
4. **Phạm vi `R-ORD-17w`.** Chữ ADR «đơn đã xác nhận mà chặng đầu có Đón không giờ» sẽ báo cả đơn văn phòng hợp lệ (tiêu chí j). **Khuyến nghị:** khoanh đơn tạo sau mốc phát hành (`MIN(created_at)` của bảng chính sách mới) có người lập từng giữ `PARTNER`, kể cả dòng đã đóng; mức `warn`. *(Task 1.4)*
5. **Giờ gợi ý chiều về khi form đối tác không còn ô giờ.** `changMacDinh` và `themChieuVe` đặt sẵn `returnTimeHint` vào chiều về, đối tác không còn thấy. Nếu bỏ chiều đi («Bỏ lượt»), dịch vụ chỉ còn chiều về mang giờ đối tác chưa từng thấy và thoát nhánh A. **Khuyến nghị:** form đối tác luôn gửi trống giờ của **lượt đầu** dịch vụ; giữ giờ gợi ý ở chiều về đi sau chiều đi, vì văn phòng thấy và sửa được ở bảng Còn vé, còn nếu bỏ thì lượt về trống giờ, không xếp xe được (`CHUA_CO_GIO`) tới khi có người ghi. **Cách khác:** gửi trống mọi lượt (an toàn hơn về «không có giờ đối tác chưa thấy», đổi lại văn phòng ghi thêm giờ về). Máy chủ không ép, đúng ADR Đ1.7. *(Task 3.1)*
6. **Tiêu chí (e) «phí đón theo nơi vẫn đúng» chưa có mã để kiểm.** ADR-0147 đã duyệt nhưng tìm trong `src/`, `web/`, `migrations/` và nhánh trong máy không thấy mã phí đón. **Khuyến nghị:** ghim điều kiện cần: form đối tác vẫn gửi Nơi đón, Nơi trả; đơn Đón không giờ và đơn cùng nơi có giờ ra cùng `total`, cùng nơi lưu. Khi ADR-0147 thi công, bài của nó phủ tiền; ghi nợ vào `docs/BACKLOG.md` theo lệnh chủ. *(Task 1.2)*
7. **`PUT` nháp lúc BẬT có bỏ `newBooker`, `bookerPartyId` không?** ADR chỉ nói giữ bốn trường, bỏ `passengers`. Không bỏ thì đối tác vẫn tạo được hồ sơ khách qua `PUT`, trái lý do của T9. **Khuyến nghị:** bỏ cả hai; luật ép và «giữ bên đặt cũ» ở `noBookerKeys` chạy như hôm nay. *(Task 2.1)*

**Giả định bề mặt đã áp, ghi lại, không chờ:**

- Dòng tài khoản giữ quyền Đối tác mà `partyId = null` hiện «Chưa có vai trò».
- Cấp riêng đã hẹn ngày ngừng hoặc đang có cấp riêng sắp áp dụng thì ô trỏ sang trang Hoa hồng (Đ2.4 «cấp không đổi được»).
- Sau «Dùng cấp theo vai trò», ô ghi thêm «Theo vai trò từ <ngày mai>» để người bấm không tưởng lệnh hỏng, vì hôm nay cấp riêng vẫn áp dụng.
- Không đổi chữ nút Gọi khách ở `web/viec-cua-toi.ts:565`; hệ quả số là của đối tác ghi ở hướng dẫn.
- Màn tài xế với đơn có dấu giữ nguyên câu «Đủ điều kiện cho xe chạy» (`dongDieuKienTaiXe`): ADR Đ3.3 chỉ nói Chi tiết chuyến, câu đó đúng và không lộ thêm gì.

**Lệch chữ mẫu theo lệnh điều phối, chờ chủ xem ảnh (không phải câu hỏi):** dòng «Đủ tên khách» của đơn có dấu ghi **«Không cần danh sách khách»** thay «Miễn danh sách» ở ADR-0154 Đ3.3, vì chữ mẫu chưa rõ nghĩa. ADR thắng về luật; chữ giao diện trong ADR là chữ mẫu.

## Global Constraints

- **Chữ hiển thị mới** phải theo tên chủ đã chọn ở `src/shared/bang-tu-giao-dien.ts` và qua `src/bang-tu-giao-dien.test.ts`: «lượt đưa đón», không «chặng»; «hạn chốt», không «mốc 6 giờ»; «cho xe chạy», không «xuất bến»; «khoản thu», không «lần thu»; «vai trò», không «vai» đứng một mình. Áp cả câu lỗi máy chủ ở `src/modules/`, `aria-label`, hướng dẫn. Lời chủ: «phải phổ thông, đơn nghĩa». Mã nội bộ không đổi theo. Tên mới chưa có trong bảng thì trình ảnh, không tự thêm dòng vào bảng. Chữ giao diện ghi trong ADR là chữ mẫu; riêng «Miễn danh sách» ở ADR-0154 Đ3.3 chưa rõ nghĩa nên dùng «Không cần danh sách khách», ghi là lệch chữ mẫu, chờ chủ xem ảnh.
- **Nhánh:** cắt nhánh mới từ đầu `claude/ticket-booking-subsystem-rebuild-d8d049` (lúc viết `0c934ba4`, chứa `f32cb3e3`), để lượt 1 nhập được độc lập. Sửa trong worktree riêng. Không `git push`, không merge `main`, không `wrangler` lên remote, không lệnh nào lên production.
- **Migration:** số dự kiến `0133` (2026-11-02: nhánh này tới `0131`, `claude/ve-dien-tu-qr-tran-lo` giữ `0132`, không có số cao hơn ở mọi `refs/heads`, `refs/remotes`). Chạy lại trước khi đặt tên: `git for-each-ref --format='%(refname:short)' refs/heads refs/remotes | while read b; do git ls-tree --name-only "$b" migrations/; done | sort -u | tail -3`. Chỉ thêm tệp mới. Cột, bảng mới phải vào `docs/data-dictionary.json` (kể cả `hangDuLieu`) rồi `npm run dict`.
- **`orders` còn LEGACY:** SQL mới chỉ ở `src/modules/orders/xac-nhan-repo.ts` hoặc `chang-hanh-khach-repo.ts`, bằng `defineSql`, câu tĩnh, chịu bài EXPLAIN. Riêng câu ghi năm cột đặt gấp chỉ được ở `chang-hanh-khach-repo.ts` (bài tĩnh ADR-0107). `orders` không import `van-chuyen`, `dispatch`, không đọc `bil_*`.
- **Lô:** một lệnh một lô (`CHANGE-GUIDE` z11). Câu mới của Còn vé mang cùng `CON_MO` với câu xác nhận. Không chèn câu giữa câu chốt và câu nhật ký `changes() > 0`.
- **Không thêm** `confirm(`, `alert(` (`src/ratchet-confirm-alert.test.ts`), `innerHTML`; giá trị CSS đi vào token; ô gõ 16px. Tránh thêm hình vào `web/icons.ts`; mã cột cấp không nằm trong tệp mà trang Đơn hàng nhập (`src/goi-trang-nhe.test.ts`).
- **Không tự thêm tên vào `src/shared/lan-gui-no.ts`.** Đỏ `H5` của e2e có sẵn từ `main`, gồm Gửi đơn và Còn vé, là việc riêng. Báo ra trong báo cáo, không sửa ở đây.
- **Bộ kiểm dài** (`npm test`, `npm run test:e2e`, kịch bản Chrome) chỉ chạy ở Đợt 5. Trong các đợt khác chỉ chạy đúng tệp bài nêu ở task, kèm `npm run typecheck` và khi đụng giao diện `npm run build:web`. Tệp `*.test.ts` không được typecheck phủ, phải tự đọc lại.
- **Tài liệu luật:** `src/CLAUDE.md`, `web/CLAUDE.md` chỉ đề xuất bằng công cụ sửa tệp để chủ được hỏi (N9). Không sửa ADR đã duyệt, không sửa `playbook/`.
- **Mỗi đợt:** có người kiểm riêng, chỉ đọc, đọc mã thật, không phải người thi công (N8). Ghi kết quả và ruling vào sổ `docs/superpowers/plans/2026-11-02-dat-ve-doi-tac-luot-2-thi-cong-nhat-ky.md`; lỗi nhỏ gom vào đó, sửa một lần ở cuối đợt.
- **Commit:** tiếng Việt có dấu, tiêu đề nói việc, thân nói vì sao, cuối thân: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Mẫu hai chiều có giờ gợi ý chiều về, chiều đi trống: phải vào nhánh A. Đối tác bỏ chiều đi rồi gửi: giờ gợi ý không làm đơn thoát nhánh A. *(Task 1.2, 3.1)*
2. Đơn nhiều dịch vụ, người xét chỉ ghi giờ một dịch vụ rồi bấm Còn vé: 409, không ghi gì. *(Task 1.3)*
3. Đổi ngày đi cùng lúc ghi giờ ở Còn vé: hạn chốt và dấu đặt gấp tính theo ngày mới. *(Task 1.3)*
4. Đối tác rút lại, sửa, gửi lại: cờ tính lại đúng trạng thái mới, cả hai chiều. *(Task 1.2)*
5. Bản giao diện cũ trong bộ nhớ đệm PWA gửi `passengers`, `newBooker`, tên giả khi công tắc BẬT: máy chủ vẫn bỏ. *(Task 2.1)*

## Ba nơi gọi `soanXacNhan`

Định nghĩa ở `src/modules/orders/repository.ts:1087`. Chữ ký và thân không đổi.

| Nơi gọi | Đường | Đổi gì | Bài ghim |
|---|---|---|---|
| `confirmOrder` `src/modules/orders/repository.ts:1078`, từ `POST /api/orders/:id/status` `src/modules/orders/index.ts:1741` | Văn phòng tự xác nhận; tài khoản đã thôi quyền Đối tác | **Không đổi.** `tinhCanXacNhan` (`:1735`) và `phaiGuiDon` (`:1705`) giữ nguyên | (j), (l) ở Task 1.2 |
| `src/modules/orders/xac-nhan-route.ts:166`, nhánh B của `gui-don` | Đối tác, đơn không cần chờ | **Thân lô không đổi.** Điều kiện rẽ nhánh đứng trước có thêm vế `canChot`, nên ít đơn tới đây hơn | (b), (k), (q) ở Task 1.2 |
| `src/modules/orders/xac-nhan-route.ts:339`, Còn vé | Người xét | **Lời gọi không đổi.** Thêm cổng 409 trước lô và thêm câu vào `cauDau` (giờ, dấu đặt gấp, ghi kép), đứng trước `xn.cau` | (c), (i), (j) ở Task 1.3 |

Đơn văn phòng không đổi hành vi: bài `(j)` ở Task 1.3 và bài `văn phòng không bao giờ mang cờ` ở Task 1.2.

## Bảng phủ tiêu chí

| Tiêu chí | Bài (tên bắt đầu bằng mã tiêu chí) | Task |
|---|---|---|
| §8 (a) đối tác không thấy ô giờ; Đón không giờ luôn nhánh A | `gui-don-chot-gio.test.ts` (a); `chang-form.test.ts` form gọn; Chrome bước 1 | 1.2, 3.1, 5.2 |
| (b) Không đón: nhánh như cũ | `gui-don-chot-gio.test.ts` (b) | 1.2 |
| (c) Còn vé thiếu giờ 409; có giờ dưới hạn chốt: cổng chặn như cũ | `con-ve-chot-gio.test.ts` (c) | 1.3 |
| (d) đơn nháp đối tác không xác nhận qua đường khác | `gui-don-chot-gio.test.ts` (d) | 1.2 |
| (e) phí đón theo nơi (xem câu đã áp số 6) | `gui-don-chot-gio.test.ts` (e) | 1.2 |
| (f) TẮT: như hôm nay | `an-khach-route.test.ts` (f) | 2.1 |
| (g) BẬT: tên giả, `passengers`, quyền đổi, nhật ký | `an-khach-route.test.ts` (g) | 2.1 |
| (h) đơn lúc BẬT: biên nhận, tài xế, xếp xe, cho xe chạy; đơn khác vẫn giữ; đổi công tắc không đổi dấu; P16 | `mien-danh-sach.test.ts` (h); `dieu-phoi-kiem.test.ts` | 2.2, 5.2 |
| (i) đặt gấp ở Còn vé | `con-ve-chot-gio.test.ts` (i) | 1.3 |
| (j) đơn văn phòng có cờ, không giờ | `con-ve-chot-gio.test.ts` (j) | 1.3 |
| (k) chỉ chiều về | `gui-don-chot-gio.test.ts` (k) | 1.2 |
| (l) thôi quyền khi còn nháp | `gui-don-chot-gio.test.ts` (l); `audit-invariants.test.ts` R-ORD-17w | 1.2, 1.4 |
| (m) khung của người xét | `khung-gio-nguoi-xet.test.ts` (m) | 1.4 |
| (n) `newBooker`, không hồ sơ, `PUT`, form hiện lại | `an-khach-route.test.ts` (n); `an-thong-tin-khach.test.ts` hiện lại; Chrome | 2.1, 3.1 |
| (o) «Không cần danh sách khách», không ghi đạt | `dieu-phoi-man.test.ts` (o); `mien-danh-sach.test.ts` (o) | 2.2, 3.4 |
| (p) không nhận SĐT khi chờ; Ghi chú trống vẫn lưu | `che-ghi-chu-nguoi-xet.test.ts` (p); `gui-don-chot-gio.test.ts` (p) | 1.2, 1.4 |
| (q) tài khoản lai | `an-khach-route.test.ts` (q); `gui-don-chot-gio.test.ts` (q) | 1.2, 2.1 |
| QĐ-C (e) quyền cột cấp | `cap-hien-hanh-route.test.ts` (e) | 4.1 |
| QĐ-C (f) khớp `GET /api/pricing/ho-so/:id/hoa-hong` | `cap-hien-hanh-route.test.ts` (f) | 4.1 |
| QĐ-C (g) đơn đã xác nhận không đổi hoa hồng | `cap-hien-hanh-route.test.ts` (g); `tests/e2e/so-dai-ly.mjs` | 4.1, 5.2 |
| ADR-0155 (k) năm trạng thái, ngày mặc định, từ ngày mai, bảng từ | `cap-hien-hanh-hien-thi.test.ts` (k); Chrome | 4.2, 5.2 |
| Chung | `npm test`, typecheck, e2e, Chrome, tài liệu, sổ hàng rào, người kiểm độc lập | 5.1–5.4 |

---

# Đợt 1 — Dữ liệu và máy chủ Đ1 (giờ đón)

Người kiểm đợt kiểm: migration trên SQLite thật, ba nơi gọi `soanXacNhan`, thứ tự cổng ở Còn vé, bài đua, chữ câu lỗi.

## Task 1.1: Migration và kho

**Files:**
- Create: `migrations/0133_chot_gio_va_an_thong_tin_khach.sql`, `src/migrations-an-thong-tin-khach.test.ts`
- Modify: `src/modules/orders/xac-nhan-repo.ts:12-52`, `:132-149`, `docs/data-dictionary.json` (khối bảng `:262`, `:299`, `:311`; `hangDuLieu` `:1481`, `:1483`, `:1492`), `docs/DATA-DICTIONARY.md` (sinh)

**Interfaces:**
- Produces, cột: `ord_confirm_request.pickup_time_required INTEGER NOT NULL DEFAULT 0 CHECK (… IN (0,1))`; `orders.manifest_exempt INTEGER NOT NULL DEFAULT 0 CHECK (… IN (0,1))`.
- Produces, bảng: `ord_partner_customer_policy` đúng khuôn `ord_confirm_policy` ở `migrations/0119_yeu_cau_xac_nhan.sql`, cột cờ `hide_customer_info`, gieo một dòng `0` (TẮT).
- Produces, trigger: `ord_confirm_request_pickup_time_required_immutable`, `orders_manifest_exempt_immutable` (cấm đổi sau khi chèn), hai trigger chỉ-thêm raise `ord_policy_append_only`.
- Produces, kho: `YeuCauRow.pickup_time_required: number`; `cauMoYeuCau(db, v & { canChotGio: boolean })`; `anKhachBat(db, luc: string): Promise<boolean>`; `anKhachMoiNhat(db): Promise<string | null>`; `cauThemAnKhach(db, { id, bat, at, by })`; `thongTinKhachDangLuu(db, orderId): Promise<{ customerName: string; customerPhone: string; customerEmail: string | null; customerNote: string | null } | null>`; `nguoiLapGiuDoiTac(db, staffId): Promise<boolean>` (đọc `v_stf_quyen_mo`, `permission_code = 'PARTNER'`, câu đã áp số 3). Thêm `export` cho `CON_MO`.

- [ ] **Step 1: Viết bài đỏ** khuôn `src/migrations-xac-nhan.test.ts`, `src/migrations-nhap-tay.test.ts`:
  - `(a) đơn và yêu cầu cũ mang giá trị 0 sau khi áp` — chèn trước khi áp `0133` bằng `upTo`, đọc lại `0`.
  - `(b) hai cột không đổi được` — `UPDATE` ra giá trị khác ném lỗi; `UPDATE` cột khác của cùng dòng vẫn được.
  - `(c) bảng chính sách chỉ thêm, gieo TẮT` — đúng một dòng `hide_customer_info = 0`; `UPDATE`, `DELETE` ném `ord_policy_append_only`.
- [ ] **Step 2:** `node --test src/migrations-an-thong-tin-khach.test.ts`. Kỳ vọng: FAIL, chưa có cột.
- [ ] **Step 3: Viết migration và kho.** Câu đọc khuôn `CHINH_SACH_HIEN_HANH`; không có dòng thì TẮT.
- [ ] **Step 4:** Cập nhật `docs/data-dictionary.json`, `npm run dict`.
- [ ] **Step 5:** `node --test src/migrations-an-thong-tin-khach.test.ts src/migrations-xac-nhan.test.ts src/architecture.test.ts && npm run typecheck`. Kỳ vọng: PASS, 0 lỗi.
- [ ] **Step 6: Commit** `feat(don): thêm cờ chốt giờ, dấu miễn danh sách, bảng công tắc ẩn thông tin khách (0133)`.

## Task 1.2: Lượt đầu và nhánh Gửi đơn

**Files:**
- Modify: `src/shared/chang-dua-don.ts`, `src/shared/contracts.ts:2933`, `src/shared/xac-nhan-hien-thi.ts:18`, `src/modules/orders/xac-nhan-route.ts:26`, `:27`, `:44-64`, `:77-96`, `:139-179`, `src/modules/orders/xac-nhan-chung.ts:209-228`
- Test: `src/shared/chang-dua-don.test.ts`, Create `src/modules/orders/gui-don-chot-gio.test.ts`

**Interfaces:**
- Produces (`src/shared/chang-dua-don.ts`):
  ```ts
  export function changDauCuaDichVu<T extends { id: string; direction: "OUT" | "RETURN"; pickupDate: string | null; pickupTime: string | null }>(legs: readonly T[]): T | null;
  export function thieuGioChangDau<T extends Parameters<typeof changDauCuaDichVu>[0][number]>(dichVu: readonly { id: string; legs: readonly T[] }[]): { serviceId: string; legId: string }[];
  ```
  Thứ tự: `OUT` trước `RETURN` → ngày (trống sau) → giờ có trước trống → giờ → id. **Không dùng `legs[0]`, không dùng `xepChang`.**
- Produces: `LyDoCanXacNhan` thêm `"CHOT_GIO"` (không đụng kiểu của `canXacNhan` ở `src/shared/xac-nhan-don.ts`). Chữ: `xac-nhan-route.ts` `NHAN_VI.CHOT_GIO = "có lượt đưa đón chưa có giờ đón"`; `xac-nhan-hien-thi.ts` `NHAN_VI.CHOT_GIO = "Có lượt đưa đón chưa có giờ đón, văn phòng cần ghi giờ."`.
- Produces: `viCuaYeuCau(y: YeuCauRow, viTinh: LyDoCanXacNhan[]): LyDoCanXacNhan[]` trong `xac-nhan-chung.ts`, thêm `CHOT_GIO` khi cờ = 1; dùng ở danh sách chờ và `xacNhanTrenDon`. `tinhCanXacNhan` không đổi.
- Consumes: `cauMoYeuCau` của Task 1.1. `moYeuCau` nhận thêm `canChotGio: boolean`; `gui-xac-nhan` (`:129`) truyền `false`.

- [ ] **Step 1: Bài luật thuần đỏ** ở `chang-dua-don.test.ts`:
  ```ts
  test("changDauCuaDichVu: chiều đi trống giờ đứng trước chiều về có giờ gợi ý cùng ngày", () => {
    const di = { id: "b", direction: "OUT", pickupDate: "2027-01-01", pickupTime: null };
    const ve = { id: "a", direction: "RETURN", pickupDate: "2027-01-01", pickupTime: "16:00" };
    assert.equal(changDauCuaDichVu([ve, di])!.id, "b");
  });
  ```
  Thêm: chỉ chiều về → chiều về; chiều đi đứng trước chiều về dù ngày muộn hơn; ngày trống xếp sau; hai chiều đi có giờ → giờ sớm; rỗng → `null`; `thieuGioChangDau` chỉ liệt kê dịch vụ có lượt đầu trống giờ.
- [ ] **Step 2: Bài route đỏ** ở `gui-don-chot-gio.test.ts`, dùng `A, ACC, LAI, PARTNER, inDays, lap, leg, setup, svc` của `tests/audit/xac-nhan-khung.mjs`, `ZB1` không đánh dấu cần xác nhận. `RET = (d, t) => ({ ...leg(d, t), direction: "RETURN" })`.
  - `(a) đối tác, Đón không giờ, dịch vụ thường → 201 nhánh A, vi gồm CHOT_GIO, cờ = 1, đơn vẫn nháp`.
  - `(a2) Review Focus 1: chiều đi trống, chiều về 16:00 cùng ngày → nhánh A`.
  - `(b) Không đón → 200 nhánh B, không mở yêu cầu, đúng đơn đối chứng của gui-don-route.test.ts (2)`.
  - `(k) chỉ chiều về, không giờ → nhánh A`.
  - `(q) tài khoản lai Bán hàng + Đối tác, Đón không giờ → nhánh A`.
  - `(q2) lượt đầu có giờ qua API (> 6 giờ) → nhánh B, cờ không có` (ADR Đ1.7).
  - `(d) đơn nháp đối tác đã vào nhánh A: người lập /status 409 partner_submit_required; Bán hàng khác /status 404; Toàn quyền /status 404`.
  - `(e) Đón không giờ và đơn cùng nơi có giờ: cùng total, cùng pickup_place, dropoff_place` (câu đã áp số 6).
  - `(l) tài khoản lai thôi PARTNER khi đơn còn nháp, Đón không giờ: /status 200, confirmed`; cùng đơn vế trước khi thôi quyền: `/status` 409 `partner_submit_required`.
  - `(p) đối tác lưu nháp có Đón, Ghi chú trống → 201, không 400`.
  - `văn phòng không bao giờ mang cờ: Bán hàng gui-xac-nhan đơn cờ dịch vụ không giờ → cờ = 0, vi không có CHOT_GIO`.
  - `Review Focus 4: nhánh A, Rút lại, PUT Không đón, gửi lại → nhánh B; ngược lại Không đón → sửa Đón không giờ → gửi lại nhánh A, yêu cầu mới cờ = 1`.
  - `dịch vụ cờ cần xác nhận + Đón không giờ: vi đúng ["DICH_VU","CHOT_GIO"]`.
  - `khoản thu đã có: nhánh A chặn như gui-don-route.test.ts`, không rơi sang B.
- [ ] **Step 3:** `node --test src/shared/chang-dua-don.test.ts src/modules/orders/gui-don-chot-gio.test.ts`. Kỳ vọng: FAIL.
- [ ] **Step 4: Thi công.** Ở `gui-don`, sau `tinhCanXacNhan`: `const canChot = holdsPartner(staff) && thieuGioChangDau(order.services).length > 0; if (canXN.can || canChot) { … moYeuCau(… vi: canChot ? [...canXN.vi, "CHOT_GIO"] : canXN.vi, canChotGio: canChot …) }`. Không đưa vào `tinhCanXacNhan`.
- [ ] **Step 5:** Chạy lại lệnh Step 3 thêm `src/modules/orders/gui-don-route.test.ts src/modules/orders/gui-don-dong-duong-cu.test.ts src/modules/orders/xac-nhan-doc.test.ts src/shared/xac-nhan-hien-thi.test.ts`, rồi `npm run typecheck`. Kỳ vọng: PASS. Bài cũ mà đơn đối tác có Đón không giờ đi nhánh B thì sửa có chủ đích, ghi vào sổ.
- [ ] **Step 6: Commit** `feat(gui-don): đơn đối tác có đón chưa có giờ luôn chờ văn phòng chốt (ADR-0154 Đ1.2)`.

## Task 1.3: Còn vé: cổng giờ, đặt gấp theo lượt, ghi kép

**Files:**
- Modify: `src/modules/orders/xac-nhan-route.ts:74`, `:260-357`, `src/modules/orders/index.ts:131-151`, `:801`, `src/modules/orders/dat-gap.ts`, `src/modules/orders/chang-hanh-khach-repo.ts:360-387`, `src/shared/chang-dua-don.ts:~308`, `src/shared/contracts.ts:2972`
- Test: Create `src/modules/orders/con-ve-chot-gio.test.ts`; Modify `src/modules/orders/dat-gap-sat-gio.test.ts:445-470`

**Interfaces:**
- `xacNhanRoutes` đổi từ mảng thành hàm: `export const xacNhanRoutes = (xetDatGap: XetDatGapSua) => [ … ]`; `index.ts:801` gọi `...xacNhanRoutes(xetDatGapSua)`. Vì `xac-nhan-route.ts` không import được `index.ts`, còn bài tĩnh ADR-0107 (`dat-gap-sat-gio.test.ts:445`) ép `as DauDatGapMoi` đúng một lần trong thân `xetDatGapSua` ở `index.ts`. **Không dời hàm**, không nới bài.
- Dời **kiểu** `GiayDatGap` sang `dat-gap.ts`, thêm `export type XetDatGapSua = (staff: PermissionHolder & { id: string }, body: unknown, duoiMoc: boolean, moc: MocToiThieu, nowMs: number) => { ok: true; value: GiayDatGap } | { ok: false; res: Response }`.
- `QuyetDinhXacNhanInput.gioDon[]` thêm `datGap?: { lyDo: string; ghiChu?: string | null }`.
- `chang-hanh-khach-repo.ts`: `export const legShortNoticeConVe = (db: D1Database, v: { legId: string; orderId: string; d: DauDatGapMoi; gio: { pickupDate: string | null; pickupTime: string | null }; yeuCauId: string; prevUpdatedAt: string }): D1PreparedStatement`, câu `leg_short_notice_decide_guarded`: năm cột như `LEG_SHORT_NOTICE`, thêm `CON_MO` import từ `xac-nhan-repo.ts`. Chạy **sau** câu đổi ngày, đổi giờ trong lô nên điều kiện `pickup_date IS`, `pickup_time IS` khớp giờ mới. Chặng giờ không đổi vẫn phải có câu dấu.
- Ghi kép (ADR «Để lại», `R-ORD-7`): giữ nguyên `cauGhiKepGio`, **chỉ ghi `pickup_time`**, đổi cách gọi. `src/shared/chang-dua-don.ts` tách `export function changDiDau<T>(legs: readonly T[]): T | null` (lượt đi đầu theo `somHon`), `chieuDiDau` dựa vào nó. Với mỗi dịch vụ có đổi ngày giờ: tính lượt đi đầu **trước** và **sau khi áp** giờ mới; giờ khác nhau thì một câu `cauGhiKepGio` theo lượt đi đầu sau khi áp, kể cả lượt đó không nằm trong `gioDon`. `legsMoi` thêm `direction`. Đã biết, giữ như hôm nay: lượt đi đầu đổi sang lượt khác nơi thì cột cũ `pickup_place` lệch, `R-ORD-7` cảnh báo.
- Sửa chú thích của `xetDatGapSua` (`index.ts:134`) từ năm cửa thành sáu cửa, thêm Còn vé.
- Mã lỗi mới: 409 `pickup_time_required`, câu `"Còn lượt đưa đón chưa có giờ đón. Ghi giờ đón rồi bấm Còn vé."`, kèm `legs: { legId: string }[]`.

**Thứ tự cổng trong Còn vé (mới in đậm):** đọc `ngayDi`, `gioDon` → `congLuatBan` → `congNhomTatDuaDon` → `legsMoi` → **`y.pickup_time_required = 1` mà `thieuGioChangDau` trên `legsMoi` còn thiếu ⇒ 409** → **với mỗi `gioDon[i].datGap` có mặt: `xetDatGap(staff, gioDon[i], duoiMocKhiSua(null, gioMoiCuaLuot, nowMs, moc.phut), moc, nowMs)`** → `canhBaoMocCua(legsMoi, daDatGap ∪ lượt có dấu mới, …)` → `kiemCongXacNhan` → lô. Không có `datGap` thì đi đúng đường hôm nay, không gọi `xetDatGap`. `lý do` ghi nối vào `detail` bằng `ghiDatGapNhatKy`; mỗi dấu kèm dòng nhật ký `order_leg_short_notice` ngay sau câu dấu, `changes() > 0`.

- [ ] **Step 1: Bài đỏ** `con-ve-chot-gio.test.ts`, khuôn `src/modules/orders/xac-nhan-quyet-dinh.test.ts` (`qd`, `q`, `chang`, `nhatKy`), đơn sát giờ dựng bằng `vnSau`:
  - `(c) yêu cầu mang cờ, không gửi giờ → 409 pickup_time_required; đơn nháp, chặng NULL, yêu cầu còn mở, không dòng nhật ký`.
  - `(c2) mang cờ, gửi giờ cho lượt đầu → 200, confirmed, chặng có giờ, order_service.pickup_time đúng`.
  - `(c3) có giờ dưới hạn chốt, không datGap → 409 short_notice_required như cũ, không ghi gì`.
  - `(c4) Hết vé, Huỷ trên yêu cầu mang cờ không cần giờ → 200`.
  - `(i) đi trong ngày, giờ còn 2 tiếng, Bán hàng kèm datGap → 200; năm cột dấu có giá trị, short_notice_lead_minutes = mốc; nhật ký order_leg_short_notice; confirmed`.
  - `(i2) Kế toán không kèm datGap → 409 short_notice_required; Kế toán kèm datGap → 403 forbidden (CANNOT_SHORT_NOTICE)`; cả hai không ghi gì (câu đã áp số 2).
  - `(i3) giờ trên 6 tiếng, không datGap → 200, cả năm cột NULL; kèm datGap → 409 short_notice_not_needed, không ghi gì`.
  - `(i4) chặng đã có giờ không đổi, dưới hạn chốt, kèm datGap → 200, có dấu` (vế `continue` hiện tại).
  - `(j) đơn Bán hàng có cờ dịch vụ, không giờ, không gửi giờ → 200 như hôm nay, chặng vẫn NULL`.
  - `Review Focus 2: hai dịch vụ cùng mang lượt đầu trống, chỉ gửi giờ một dịch vụ → 409, không dịch vụ nào đổi`.
  - `Review Focus 3: đổi ngày đi sang hôm nay + giờ còn 2 tiếng: thiếu datGap 409; đổi ngày đi sang sau 3 ngày + cùng giờ: 200, không dấu`.
  - `chặng khác không bắt buộc: lượt đầu có giờ gửi lên, chiều về vẫn NULL → 200`.
  - `T6: hai chiều đi cùng nơi, 09:30 và trống, gửi 08:00 cho chặng sau → order_service.pickup_time = 08:00; gửi 10:00 → giữ 09:30; R-ORD-7 đếm 0` (chạy `CHECKS` như `src/modules/van-chuyen/bo-sung-ten.test.ts`).
  - `đua: yêu cầu vừa khép trước lô → không dấu, không giờ` (khuôn bài đua của `xac-nhan-quyet-dinh.test.ts`).
- [ ] **Step 2: Siết bài tĩnh** ở `dat-gap-sat-gio.test.ts`: thêm `assert.match(repo, /export const legShortNoticeConVe = \(db: D1Database, v: \{[^}]*d: DauDatGapMoi/)`; `moi[0].tep` vẫn là `modules/orders/index.ts`.
- [ ] **Step 3:** `node --test src/modules/orders/con-ve-chot-gio.test.ts src/modules/orders/dat-gap-sat-gio.test.ts`. Kỳ vọng: FAIL.
- [ ] **Step 4: Thi công** theo Interfaces.
- [ ] **Step 5:** Chạy lại Step 3 thêm `src/modules/orders/xac-nhan-quyet-dinh.test.ts src/modules/orders/soan-xac-nhan.test.ts src/modules/orders/dat-gap.test.ts src/modules/orders/dua-don-nhom-cua-xac-nhan.test.ts`, rồi `npm run typecheck`. Kỳ vọng: PASS.
- [ ] **Step 6: Commit** `feat(xac-nhan): Còn vé bắt buộc ghi giờ với yêu cầu mang cờ, nhận đặt gấp theo từng lượt (ADR-0154 Đ1.3, Đ1.4)`.

## Task 1.4: Khung của người xét, che ghi chú, danh sách chờ, kiểm định kỳ

**Files:**
- Modify: `src/modules/orders/index.ts:842-856`, `:1190-1192`, `:1525`, `src/modules/orders/xac-nhan-chung.ts:202`, `src/modules/orders/xac-nhan-route.ts:77-96`, `scripts/audit-checks.mjs`, `src/modules/orders/chon-don-route.test.ts:150-151`, `src/audit-invariants.test.ts`
- Create: `src/modules/orders/khung-gio-nguoi-xet.test.ts`, `src/modules/orders/che-ghi-chu-nguoi-xet.test.ts`

**Interfaces:**
- `export const catChoXetDuyet = (o: OrderDetailDto, tuyChon: { cheGhiChu: boolean }): OrderDetailDto`, tham số bắt buộc để hai nơi gọi không quên; `cheGhiChu` thì `services[].note` qua `maskLongDigits`. Hai nơi gọi tính `await nguoiLapGiuDoiTac(env.DB, order.staffId)`.
- Route khung: `if (!can(staff, "order.create") && !can(staff, "order.confirm.review")) return 403`, câu đổi thành `"Tài khoản này không dùng khung giờ đón."`.
- Danh sách chờ: yêu cầu mang cờ thì `gioDon: null`, dù chiều về có giờ gợi ý.
- `scripts/audit-checks.mjs`: `R-ORD-17w`, `level: "warn"`. Lượt đầu bằng câu con `ORDER BY (l2.direction <> 'OUT'), (l2.pickup_date IS NULL), l2.pickup_date, (l2.pickup_time IS NULL), l2.pickup_time, l2.id LIMIT 1`, đúng thứ tự `changDauCuaDichVu`; `EXISTS stf_permission` không lọc `valid_to_at`; `o.created_at >= (SELECT MIN(created_at) FROM ord_partner_customer_policy)` (câu đã áp số 4).

- [ ] **Step 1: Bài đỏ:**
  - `(m) Kế toán, HDV nội bộ đọc đúng khung đang cài; Toàn quyền đổi khung: Kế toán đọc khung mới, Còn vé theo khung mới 200, khung cũ 400 doi_gio_khong_hop_le`.
  - Đảo có chủ đích `chon-don-route.test.ts:150-151`: `PARTNER` 200 giữ, `FIELD` nay 200; thêm `DRIVER` 403 khuôn `src/so-dai-ly-quyen-route.test.ts`.
  - `(p) đơn đối tác đang chờ: Kế toán nhận customerName "", customerPhone "", customerEmail null, ghi chú "Gọi 0912345678" đã che; sau Còn vé Kế toán có contact.view thấy số trên đơn`.
  - `(p2) đơn Bán hàng đang chờ: ghi chú nguyên văn`. `(p3) người lập đối tác xem đơn của mình: nguyên văn`. `(p4) phản hồi POST short-notice cho người xét: đã che`.
  - `R-ORD-17w: đơn lai đã thôi PARTNER xác nhận qua /status, lượt đầu Đón không giờ → 1 (warn, thoát 0); đơn văn phòng có cờ không giờ → 0; đơn trước mốc → 0; có giờ → 0; chiều về có giờ nhưng chiều đi trống → 1` khuôn `src/audit-invariants.test.ts:2659`.
  - `R-ORD-17w và changDauCuaDichVu chọn cùng lượt trên bộ ca của Task 1.2`.
  - `danh sách chờ: yêu cầu mang cờ, chiều về 16:00 → gioDon null, vi có CHOT_GIO`.
- [ ] **Step 2:** `node --test src/modules/orders/khung-gio-nguoi-xet.test.ts src/modules/orders/che-ghi-chu-nguoi-xet.test.ts src/modules/orders/chon-don-route.test.ts src/audit-invariants.test.ts`. Kỳ vọng: FAIL ở các bài mới.
- [ ] **Step 3: Thi công** theo Interfaces.
- [ ] **Step 4:** Chạy lại Step 2 thêm `src/modules/orders/xac-nhan-doc.test.ts`, rồi `npm run typecheck`. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(xac-nhan): người xét đọc khung đang cài, ghi chú đơn đối tác đã che, thêm kiểm R-ORD-17w (ADR-0154 Đ1.5–Đ1.7)`.

---

# Đợt 2 — Máy chủ Đ2, Đ3 (công tắc, miễn thiếu tên)

Người kiểm đợt kiểm: máy chủ không tin trình duyệt, dấu chụp đúng một lần, `THIEU_SUAT` và `KHACH_DA_DOI` vẫn giữ, P16 đã thấy đỏ.

## Task 2.1: Công tắc, ép trường, chụp dấu

**Files:**
- Create: `src/shared/an-thong-tin-khach.ts`, `src/shared/an-thong-tin-khach.test.ts`, `src/modules/orders/an-thong-tin-khach.ts`, `src/modules/orders/an-khach-route.test.ts`
- Modify: `src/modules/orders/xac-nhan-route.ts` (cạnh `/api/cai-dat/xac-nhan-don`, `:363`), `src/modules/orders/index.ts:180-195`, `:1125-1168`, `:1243-1262`, `src/modules/orders/repository.ts:957-1000`, `:166` (`toDto`), `src/shared/contracts.ts:222`, `:343`, `src/shared/audit-actions.ts:284-288`, `src/shared/lich-su-doi-tac.ts:86`, `src/shared/lich-su-noi-bo.ts:97`, `src/route-access.test.ts:296-301`, `src/modules/billing/sau-da-giao.test.ts:26`

**Interfaces:**
- `apCongTacAnKhach(who: Pick<PermissionHolder, "permissions">): boolean` = `holdsPartner(who) && who.permissions.every(isExternalPermission)` (câu C2).
- `thanLapDonKhiAn(body: unknown, tk: { fullName: string; phone: string }): unknown`: ghi đè `customerName`, `customerPhone`; `customerEmail`, `customerNote` rỗng; xoá `passengers`, `newBooker`, `bookerPartyId`. Thân không phải đối tượng trả nguyên để `validateOrder` báo lỗi.
- `thanNhapKhiAn(body: unknown, luu: NonNullable<Awaited<ReturnType<typeof thongTinKhachDangLuu>>>): unknown`: ghi đè bốn trường từ `luu`; xoá ba khoá trên (câu đã áp số 7).
- `POST /api/orders`: sau `can order.create`, **trước** `hasPassengersKey`: đọc công tắc đúng một lần, `const an = apCongTacAnKhach(staff) && (await anKhachBat(env.DB, nowIso));`. `an && staff.partyId === null` ⇒ `PARTNER_NO_PARTY()` (rút hằng từ câu ở `:191`). `createOrder(…, booker.write, an)`: thêm tham số thứ sáu `manifestExempt = false`, ghi `orders.manifest_exempt`.
- `PUT /api/orders/:id`: trước `hasPassengersKey` ở `:1255`.
- `GET /api/cai-dat/an-thong-tin-khach`, cổng `orders`, hỏi `order.create`, `AnThongTinKhachResponse { bat: boolean; apChoToi: boolean; doiDuoc: boolean }`. `POST` cùng đường, cổng `admin`, hỏi `settings.ops`, thân `{ bat: boolean }`, một lô: `cauThemAnKhach` + nhật ký `partner_customer_policy_changed`; `at = lanSau(await anKhachMoiNhat(env.DB))`; UNIQUE ⇒ 409 `stale`. Khuôn `/api/cai-dat/xac-nhan-don`; `lanSau` hiện là hàm cục bộ ở `xac-nhan-route.ts:372`, rút ra dùng chung trong tệp.
- `AUDIT_ACTIONS.partner_customer_policy_changed = { label: "Đổi công tắc ẩn thông tin khách", group: "system" }`; xếp vào `LICH_SU_DOI_TAC_AN`, `LICH_SU_NOI_BO_AN` (`CHANGE-GUIDE` f, bước 7, 7b).
- `OrderDetailDto.manifestExempt: boolean` (Task 2.2 và 3.4 dùng).

- [ ] **Step 1: Bài đỏ.** Luật thuần: `apCongTacAnKhach` bảng ca `PARTNER` đúng; `PARTNER+DRIVER_PARTNER` đúng; `SALES+PARTNER` sai; `SALES`, `DRIVER_PARTNER` sai. Route, trên khung `tests/audit/xac-nhan-khung.mjs` (`bat(w)` gọi route thật):
  - `(f) TẮT: đối tác gửi tên, SĐT, passengers → lưu đúng, manifest_exempt 0`.
  - `(g) BẬT: đối tác gửi tên giả → customer_name, customer_phone là của tài khoản; email, ghi chú rỗng; passengers bị bỏ, ord_passenger rỗng, không 403; manifest_exempt 1`.
  - `(g2) Quản trị POST 403, Bán hàng POST 403; Toàn quyền POST 200, có nhật ký; đọc lại bat đúng; POST trùng mốc 409 stale`.
  - `(n) BẬT: newBooker bị bỏ, không thêm dòng pty_party`.
  - `(n2) BẬT: tài khoản không hồ sơ → 409 partner_no_party, không đơn`.
  - `(n3) BẬT: PUT nháp gửi tên khác, passengers, newBooker → bốn trường giữ nguyên, hành khách giữ, không hồ sơ mới; nháp lập lúc TẮT vẫn không dấu`.
  - `(n4) đối tác có hồ sơ được hưởng: booker_party_id = hồ sơ của mình theo luật ép; đối tác không được hưởng gửi bookerPartyId khách → NULL`.
  - `(n5) POST /passengers nháp 409 use_order_form; sau xác nhận đối tác bổ sung được; đổi tên liên hệ 403` (Đ2.4, T10).
  - `(n7) nháp lập lúc BẬT, PUT lúc TẮT: tên mới và passengers được lưu, manifest_exempt vẫn 1`.
  - `(q) BẬT, tài khoản lai: apChoToi false; tên gửi lên giữ nguyên; manifest_exempt 0`.
  - `Review Focus 5: thân kiểu cũ đủ passengers, newBooker, bookerPartyId, tên giả, BẬT → 201, giống hệt (g), không 403`.
  - `Bán hàng, Thực tập khi BẬT: như hôm nay, không dấu`.
- [ ] **Step 2:** `node --test src/shared/an-thong-tin-khach.test.ts src/modules/orders/an-khach-route.test.ts`. Kỳ vọng: FAIL.
- [ ] **Step 3: Thi công** theo Interfaces. Thêm hai dòng vào `SNAPSHOT` của `src/route-access.test.ts`, mục `MIEN` của `sau-da-giao.test.ts` có lý do «đổi công tắc toàn hệ thống, không ghi đơn nào».
- [ ] **Step 4:** Chạy lại Step 2 thêm `src/route-access.test.ts src/modules/billing/sau-da-giao.test.ts src/shared/audit-actions.test.ts src/shared/lich-su-noi-bo.test.ts src/lich-su-don-doi-tac.test.ts src/lan-gui-location.test.ts`, rồi `npm run typecheck`. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(don): công tắc ẩn thông tin khách, máy chủ ép trường và chụp dấu lúc lập (ADR-0154 Đ2, Đ3.1)`.

## Task 2.2: Miễn thiếu tên, nhắc, đường đọc

**Files:**
- Modify: `src/modules/orders/chang-hanh-khach-repo.ts` (`LEG_LICH_CHUNG`, `LegLichChungRow`), `src/modules/orders/index.ts:459`, `:508-530`, `src/shared/dieu-phoi-kieu.ts:221`, `:372`, `src/modules/van-chuyen/dieu-phoi-doc.ts:104`, `src/shared/dieu-phoi-kiem.ts:415-497`, `src/modules/van-chuyen/dieu-phoi-route.ts:374`, `:395`, `:430-438`, `src/shared/contracts.ts:1792`, `src/shared/dieu-phoi-man.ts:324-345`, `src/shared/canh-bao-xac-nhan.ts:18`, `:31`, `src/shared/bang-su-kien-van-chuyen.ts` (dòng `xuat-ben`)
- Test: `src/shared/dieu-phoi-kiem.test.ts` (kể cả `chang()` ở `:133`, `changCK` ở `:599`), `src/shared/dieu-phoi-man.test.ts`, `src/shared/canh-bao-xac-nhan.test.ts`, `src/modules/orders/lich-chung-chang.test.ts:57`, `:146` (đổi có chủ đích, khoá mới `mienDanhSach`), Create `src/modules/van-chuyen/mien-danh-sach.test.ts`; Modify `tests/audit/dieu-phoi-khung.mjs` (thêm hàm)

**Interfaces:**
- `ChangVao.mienDanhSach: boolean` **bắt buộc**, để typecheck bắt nơi dựng phía máy chủ; `ChangLichChung.mienDanhSach: boolean`. Dựng trong `lichChungChang` từ `o.manifest_exempt`. Không qua `v_ord_order_flag`.
- `export interface NhacXuatBen { ma: "KHONG_CAN_DANH_SACH"; orderCode: string; legId: string; thieu: number }`; `KetQuaXuatBen.nhac: NhacXuatBen[]`.
- `kiemXuatBen`, đúng chỗ `src/shared/dieu-phoi-kiem.ts:497`: `lyDoThieuTen` có kết quả và `ch.mienDanhSach` ⇒ đẩy vào `nhac`, không đẩy `lyDo`. **Không sửa `lyDoThieuTen`, `kiemXep`.** `KHACH_DA_DOI`, `THIEU_SUAT` không đổi.
- `dieu-phoi-route.ts`: tách `duPhongXuatBen(…): { lyDo: LyDoGiu[]; nhac: NhacXuatBen[] }`, `lyDoGiuDuPhong` gọi nó; `ChuyenChiTietResponse.nhacDieuKien: { ma: "KHONG_CAN_DANH_SACH"; maDon: string }[]`, gộp theo mã đơn, chỉ chi tiết chuyến của văn phòng. Không vào DTO tài xế.
- `dieuKienXuatBen(lyDoGiu, nhac: readonly { ma: string; maDon: string }[] = [])` trả `{ nhan: string; dat: boolean; chiTiet: string; khongCan: boolean }[]`. Dòng «Đủ tên khách»: có `THIEU_TEN` hoặc `KHACH_DA_DOI` thì `dat: false, khongCan: false`, chi tiết như cũ và nối thêm mã đơn được miễn; không có lý do mà có nhắc thì **`dat: false, khongCan: true`, `chiTiet: "Không cần danh sách khách: <mã đơn>"`**. Đặt `dat: false` để mọi chỗ chỉ đọc `dat` không thể ghi đạt giả.
- `cauThieuTen(n: number, khongCan = false)`: `khongCan` ⇒ `Còn ${n} khách chưa có tên. Đơn này không cần đủ tên để xe chạy.`; `canhBaoXacNhan(services, nguoiCuaDon, khongCan = false)`.
- `tests/audit/dieu-phoi-khung.mjs`: `donDoiTacCoDau(w, v)`: đi đường thật, BẬT công tắc → đối tác `POST /api/orders` → `gui-don` → người xét `quyet-dinh` `CON_VE` kèm giờ. Trigger cấm `UPDATE` dấu, nên không gieo tắt.

- [ ] **Step 1: Bài đỏ:**
  - Thuần: `(h) chặng mienDanhSach thiếu tên, requireManifest: dat true, không THIEU_TEN, nhac 1 dòng`; `(h2) cùng chặng có THIEU_SUAT vẫn giữ`; `(h3) KHACH_DA_DOI vẫn giữ`; `(h4) requireManifest false: không nhắc`; `(h5) kiemXep trên chặng mienDanhSach vẫn cảnh báo THIEU_TEN`; bài `MỘT luật hai nơi` (`dieu-phoi-kiem.test.ts:487`) giữ các ca cũ, thêm **ngoại lệ có tên**: chặng `mienDanhSach` lúc xếp vẫn cảnh báo, cho xe chạy không giữ, kèm một dòng `nhac`.
  - Màn: `(o) chỉ nhắc: khongCan true, dat false, chiTiet chứa "Không cần danh sách khách"`; `(o2) chuyến trộn: một đơn có dấu, một đơn không dấu thiếu tên: dòng chưa đạt, khongCan false`; `(o3) đơn có dấu kèm KHACH_DA_DOI: chưa đạt`; `(o4) chiTiet của dòng khongCan không chứa "đạt", "Đủ"`.
  - Route `mien-danh-sach.test.ts`, khuôn `src/modules/van-chuyen/bo-sung-ten.test.ts`, đồng hồ giả:
    - `(h6) P16 đổi công tắc không đổi dấu: O1 lập lúc BẬT, O2 lập lúc TẮT; BẬT lại, TẮT lại; manifest_exempt vẫn 1, 0; cho xe chạy: chuyến của O1 200, chuyến của O2 giữ THIEU_TEN`.
    - `(h7) O1 xếp xe được khi trống tên, vc_trip_manifest đúng, R-VC-4, R-VC-10 đếm 0`.
    - `(h8) màn tài xế (GET /api/van-chuyen/cuoc-cua-toi/:id) và biên nhận (GET /api/orders/:id/receipt) của O1 không lỗi khi thiếu hành khách, số liên hệ là của đối tác`.
    - `(h9) đơn Bán hàng thiếu tên vẫn giữ THIEU_TEN khi công tắc BẬT`.
    - `(o5) GET chi tiết chuyến của O1: nhacDieuKien có mã đơn; lyDoGiu không có THIEU_TEN`.
  - Bảng sự kiện: `src/bang-su-kien-van-chuyen.test.ts` vẫn xanh sau khi cột `luat` dòng `xuat-ben` ghi rõ `«đủ tên khách, trừ đơn mang dấu miễn danh sách»`.
- [ ] **Step 2:** `node --test src/shared/dieu-phoi-kiem.test.ts src/shared/dieu-phoi-man.test.ts src/shared/canh-bao-xac-nhan.test.ts src/modules/orders/lich-chung-chang.test.ts src/modules/van-chuyen/mien-danh-sach.test.ts`. Kỳ vọng: FAIL ở các bài mới.
- [ ] **Step 3: Thi công** theo Interfaces.
- [ ] **Step 4:** Chạy lại Step 2 thêm `src/bang-su-kien-van-chuyen.test.ts src/modules/van-chuyen/dieu-phoi-doc.test.ts src/modules/van-chuyen/dieu-phoi-route.test.ts src/orders-cong-bo.test.ts src/shared/dieu-phoi-lich-chung.test.ts`, rồi `npm run typecheck`. Kỳ vọng: PASS, 0 lỗi; typecheck đỏ ở nơi dựng `ChangVao` nào thì đó là chỗ phải sửa.
- [ ] **Step 5: P16, bắt buộc.** Chép tạm, sửa cố ý, quan sát, hoàn nguyên, không commit phần sửa. Ghi dòng lệnh, tên bài đỏ, ngày vào sổ thi công để Task 5.2 đưa vào `docs/SO-HANG-RAO.md`:
  - (i) `lichChungChang` đọc `anKhachBat` hiện hành thay `manifest_exempt` ⇒ `(h6)` đỏ.
  - (ii) `gui-don` dùng `s.legs[0]` thay `changDauCuaDichVu` ⇒ `(a2)` đỏ.
  - (iii) Bỏ cổng `pickup_time_required` ⇒ `(c)` đỏ.
  - (iv) `POST /api/orders` bỏ `thanLapDonKhiAn` ⇒ `(g)` đỏ.
  - `git diff --stat` sau hoàn nguyên phải sạch phần đã sửa cố ý.
- [ ] **Step 6: Commit** `feat(van-chuyen): đơn mang dấu không bị giữ thiếu tên, chi tiết chuyến ghi rõ (ADR-0154 Đ3)`.

---

# Đợt 3 — Giao diện ADR-0154

Người kiểm đợt kiểm: chữ theo bảng từ, form không gửi trường đã ẩn, Còn vé không gửi giờ thừa, không dấu đạt giả, dựng DOM bằng `h()`. Kịch bản Chrome viết ở đây, **chạy ở Đợt 5**.

## Task 3.1: Form đối tác: bỏ giờ, ẩn khối khách, hiện lại

**Files:**
- Modify: `web/khoi-dua-don.ts:38-64`, `:298-405`, `:~488`, `web/service-card.ts:166`, `web/order-form.ts:520-521`, `:~545-560`, `:791-796`, `:836-844`, `:858`, `:887`, `:941`, `:969-971`, `:991`, `src/shared/chang-form.ts`
- Test: `src/shared/chang-form.test.ts`, `src/form-dat-ve-noi-day.test.ts`, `src/shared/an-thong-tin-khach.test.ts`

**Interfaces:**
- `KhoiDuaDonOptions.anGio?: boolean`: bỏ `hangKhung`, ô `gio`, dòng cảnh báo hạn chốt; giữ Đón / Không đón, Nơi đón, Nơi trả, «Khác ngày», «Bỏ lượt», «+ Thêm chiều về». `service-card.ts` truyền `anGio: o.formGonDoiTac`. `tomTatChang` với `anGio` hiện `Văn phòng sẽ báo giờ đón`.
- `export function legsGuiFormGon<T extends ChangNhap>(legs: readonly T[], ngayDi: string): T[]` ở `src/shared/chang-form.ts` (câu đã áp số 5). Lượt của form dùng `""` và chưa có `id`, nên phải chuẩn hoá **trước** khi xếp, để trình duyệt và máy chủ chọn cùng một lượt: `{ id: l.key, direction: l.direction, pickupDate: l.pickupDate || ngayDi || null, pickupTime: l.pickupTime || null }` (máy chủ cũng điền ngày đi vào ngày trống, R4b). Rồi **lặp**: lượt đầu theo `changDauCuaDichVu` còn giờ thì xoá `pickupTime`, `pickupSlotEnd`, xét lại, vì «giờ có trước trống» làm lượt khác có giờ nhảy lên đầu. Dừng khi lượt đầu trống giờ. Lượt còn lại giữ nguyên.
- `web/order-form.ts`: `formGon` thì không gọi `layKhung`. Đọc `GET /api/cai-dat/an-thong-tin-khach` một lần lúc mở; `anKhach = r.apChoToi`; lỗi mạng thì `anKhach = false` (máy chủ vẫn quyết). `anKhach` ẩn `.khach-dau`, `#don-cua-slot`, `.grid.two`, `#canh-bao-slot`, `#khach-them`, `#booker-slot`, `#hk-card`; giữ `.khach-ngay`. `collect()` không có sáu khoá khách; `need("customerName")`, `need("customerPhone")` bỏ qua.
- Thêm vào `src/shared/an-thong-tin-khach.ts`: `canHienLaiKhoiKhach(v: { dangAn: boolean; loi: { status: number }; apChoToi: boolean }): boolean`.
- Hiện lại: gửi lỗi mà `canHienLaiKhoiKhach({ dangAn: anKhach, loi, apChoToi })` đúng (đọc lại công tắc) ⇒ `anKhach = false`, hiện các khối, đặt tiêu điểm vào `#customerName`, giữ câu lỗi. Áp khi `loi.status === 400` và công tắc nay không còn áp cho tài khoản; lỗi khác không đọc lại.

- [ ] **Step 1: Bài đỏ:**
  - `(a) form gọn không dựng ô giờ`: bài nối dây: `web/service-card.ts` truyền `anGio`; `web/khoi-dua-don.ts` chỉ dựng `hangKhung` khi `!o.anGio`.
  - `legsGuiFormGon`: `chiều đi 09:00 + chiều về 16:00 → chiều đi trống, chiều về 16:00`; `chỉ chiều về 16:00 (đã bỏ chiều đi) → trống`; `pickupSlotEnd` trống theo.
  - `legsGuiFormGon: chiều đi «Khác ngày» sau ngày đi, chiều về ngày "" giờ gợi ý 16:00 → chiều đi trống giờ, chiều về giữ 16:00; kết quả qua changDauCuaDichVu với ngày máy chủ điền cho cùng lượt`.
  - `legsGuiFormGon: hai chiều đi 08:00, 09:00 → cả hai trống`; `nháp lượt 1 đã lưu giờ lượt đầu, lưu lại bằng form gọn → giờ bị xoá`.
  - `(n6) canHienLaiKhoiKhach: 400 + công tắc vừa tắt → đúng; 400 + vẫn bật → sai; 409 → sai; không ẩn → sai`.
  - `web/order-form.ts` không còn gọi `need("customerName")` vô điều kiện; `collect` nối dây với `anKhach`.
- [ ] **Step 2:** `node --test src/shared/chang-form.test.ts src/form-dat-ve-noi-day.test.ts src/shared/an-thong-tin-khach.test.ts`. Kỳ vọng: FAIL.
- [ ] **Step 3: Thi công** theo Interfaces. CSS đi vào token.
- [ ] **Step 4:** Chạy lại Step 2 thêm `src/bang-tu-giao-dien.test.ts src/goi-trang-nhe.test.ts`, rồi `npm run typecheck && npm run build:web`. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(form): form đối tác bỏ giờ đón, ẩn khối khách khi công tắc bật (ADR-0154 Đ1.1, Đ2.2, Đ2.3)`.

## Task 3.2: Khối công tắc ở trang Tôi

**Files:**
- Create: `web/an-khach-cai-dat.ts`
- Modify: `public/account.html:18-19`, `web/account.ts:853`, `docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs:130`, `:144` (`domOrder` thêm phần tử mới), `src/shared/so-do-trang.ts` (sinh)

**Interfaces:** `ganCaiDatAnKhach(el: HTMLElement): Promise<void>`, khuôn `web/nhap-tay-cai-dat.ts`. `<section id="an-khach-cai-dat" class="card" aria-labelledby="an-khach-heading" hidden>` ngay sau `#nhap-tay-cai-dat`. Chỉ gọi khi `can(staff, "settings.ops")`. Chữ mẫu, chủ xem ảnh: tiêu đề `Ẩn thông tin khách khi đối tác đặt vé`; `Đang bật.` / `Đang tắt.`; nút `Bật ẩn thông tin khách` / `Tắt ẩn thông tin khách`; gợi ý `Khi bật, đối tác không nhập tên, số điện thoại và danh sách khách khi lập đơn. Đơn lập lúc bật không cần danh sách khách để xe chạy; tắt công tắc không đổi các đơn đó.`

- [ ] **Step 1: Bài đỏ** ở `src/giao-dien-hoi-bang-quyen.test.ts`: `web/account.ts` chỉ gọi `ganCaiDatAnKhach` sau `can(staff, "settings.ops")`.
- [ ] **Step 2:** `node --test src/giao-dien-hoi-bang-quyen.test.ts`. Kỳ vọng: FAIL.
- [ ] **Step 3: Thi công**, rồi `node scripts/sinh-so-do-trang.mjs`, `git add` tệp sinh nếu đổi (`npm test` thoát khác 0 khi tệp sinh chưa commit).
- [ ] **Step 4:** `node --test src/giao-dien-hoi-bang-quyen.test.ts src/bang-tu-giao-dien.test.ts src/shared/tro-ly-cau-truc.test.ts && npm run typecheck && npm run build:web`. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(toi): khối công tắc ẩn thông tin khách cho Toàn quyền (ADR-0154 Đ2.1)`.

## Task 3.3: Bảng Còn vé và danh sách chờ

**Files:**
- Modify: `web/xac-nhan-don-ui.ts:94-105`, `:125-165`, `web/cho-xac-nhan.ts:22`, `src/shared/xac-nhan-hien-thi.ts`
- Test: `src/shared/xac-nhan-hien-thi.test.ts`

**Interfaces:**
- `export function dongGioConVe(services: readonly Pick<OrderServiceDto, "id" | "name" | "note" | "legs">[], viCoChotGio: boolean): { serviceId: string; ghiChu: string | null; luot: { leg: LegDto; batBuoc: boolean; nhanChieu: string }[] }[]` ở `xac-nhan-hien-thi.ts`. Liệt kê mọi lượt mở; `batBuoc` chỉ khi `viCoChotGio` và là lượt đầu theo `changDauCuaDichVu` và `pickupTime === null`.
- Bảng: mỗi dịch vụ một khối. Ghi chú đứng **trên** khối giờ, nhãn `Ghi chú · <tên dịch vụ>`. Lượt bắt buộc: select `Chọn giờ đón` + các khung + `Giờ khác`, chọn `Giờ khác` hiện ô `type="time"` 16px; nhãn `Giờ đón · <chiều> · <tên dịch vụ> (bắt buộc)`. Lượt có giờ giữ `Giữ nguyên (…)`. Lượt không bắt buộc, chưa giờ: `Chưa có giờ`. Thiếu lượt bắt buộc thì báo tại chỗ `Chọn giờ đón cho lượt này.`, không gọi máy chủ.
- Đặt gấp: chọn giờ làm `canhBaoChangForm` có câu dưới hạn chốt. Người có `order.leg.short_notice`: hiện `taoKhungDatGap({ onDuyet, nutDuyetPhu: true })` của `web/dat-gap-ui.ts`, giữ giấy trong bảng, gửi kèm `gioDon[i].datGap`. Người không có ô: câu `Giờ này đã qua hạn chốt. Nhờ Bán hàng hoặc Quản trị bấm Còn vé kèm đặt gấp.`
- `layKhung` giữ đường dự phòng chỉ cho lỗi mạng.

- [ ] **Step 1: Bài đỏ** `dongGioConVe`: `yêu cầu mang cờ: chiều đi trống batBuoc, chiều về 16:00 không`; `không cờ: không lượt nào bắt buộc nhưng vẫn liệt kê lượt trống giờ`; `đơn hai dịch vụ: mỗi dịch vụ một lượt bắt buộc`; `ghi chú đúng dịch vụ`. Bài nối dây: `web/xac-nhan-don-ui.ts` không còn `l.pickupTime !== null`; không `confirm(`.
- [ ] **Step 2:** `node --test src/shared/xac-nhan-hien-thi.test.ts`. Kỳ vọng: FAIL.
- [ ] **Step 3: Thi công** theo Interfaces.
- [ ] **Step 4:** Chạy lại Step 2 thêm `src/bang-tu-giao-dien.test.ts src/ratchet-confirm-alert.test.ts src/goi-trang-nhe.test.ts`, rồi `npm run typecheck && npm run build:web`. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(xac-nhan): bảng Còn vé hiện ghi chú, ô giờ bắt buộc, đặt gấp theo từng lượt (ADR-0154 Đ1.3, Đ1.4)`.

## Task 3.4: Chi tiết chuyến, trang đơn, kịch bản Chrome

**Files:**
- Create: `docs/evidence/<ngày thi công>-dat-ve-luot-2/kich-ban/luot-2-smoke.mjs`
- Modify: `web/chuyen.ts:253-262`, `:364`, `web/order.ts:292`, `:~1324`, các kịch bản Chrome có sẵn nếu chúng khẳng định hàng khung giờ ở form đối tác (`docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/doi-tac-lap-don-smoke.mjs`)
- Test: `src/shared/dieu-phoi-man.test.ts`

**Interfaces:**
- `web/chuyen.ts` là nơi duy nhất đọc kết quả này: `dieuKienXuatBen(c.lyDoGiu, <phản hồi chi tiết chuyến>.nhacDieuKien)` ở cả hai nơi gọi; `soChua = dk.filter((x) => !x.dat && !x.khongCan).length`. Dòng `khongCan` ở `:259-260` có dấu riêng (không ✓, không ✕), `aria-label="Không cần"`, `data-khong-can="true"`. Câu `Đạt đủ ${dk.length} điều kiện cho xe chạy` ở `:364` phải đếm `dk.filter((x) => x.dat).length`, thêm `Không cần danh sách khách: <mã đơn>` nếu có.
- `web/order.ts`: bỏ chữ chép tay ở `:292`, gọi `cauThieuTen(mau - du, order.manifestExempt)`; `canhBaoXacNhan(…, order.manifestExempt)` ở `:1324`.
- `luot-2-smoke.mjs` khuôn `docs/evidence/2026-10-26-xac-nhan-don/kich-ban/xac-nhan-smoke.mjs`, `dp-lib.mjs`, 390 + 1040. Bước:
  1. Đối tác: form không có ô giờ, gửi đơn có đón → câu A.
  2. Kế toán `/cho-xac-nhan`: `Chưa có giờ đón`.
  3. Kế toán mở đơn: ghi chú đã che, thiếu giờ báo tại chỗ, chọn khung → đã xác nhận.
  4. Đơn đi trong ngày: Bán hàng đặt gấp ngay ở bảng; Kế toán thấy câu nhờ.
  5. Toàn quyền bật công tắc ở trang Tôi; Quản trị không thấy khối.
  6. Đối tác: không khối Khách hàng, Hành khách; Ngày khởi hành còn; lập đơn được.
  7. Công tắc vừa tắt khi form đang ẩn: lỗi rồi khối tự hiện.
  8. Tài khoản lai: vẫn thấy hai khối.
  9. Chi tiết chuyến đơn có dấu: «Không cần danh sách khách», không ✓, không tính «chưa đạt»; chuyến chỉ vướng dòng này thì nút «Cho xe chạy» bấm được (`web/chuyen.ts:124-125` đọc `lyDoGiu`, không đọc `dat`, không cần sửa).
  10. Trang đơn đổi câu.

  Dùng `axe`, `noOverflowX`, `noCode`.

- [ ] **Step 1: Bài đỏ** nối dây: `web/chuyen.ts` không còn `dk.length} điều kiện`; `web/order.ts` không còn chuỗi `cần đủ trước khi xe chạy`. Đặt ở `src/shared/dieu-phoi-man.test.ts`.
- [ ] **Step 2:** `node --test src/shared/dieu-phoi-man.test.ts`. Kỳ vọng: FAIL.
- [ ] **Step 3: Thi công**; màn tài xế giữ nguyên theo giả định bề mặt.
- [ ] **Step 4:** Chạy lại Step 2 thêm `src/bang-tu-giao-dien.test.ts`, rồi `npm run typecheck && npm run build:web`. Kỳ vọng: PASS. Kịch bản Chrome chưa chạy ở bước này.
- [ ] **Step 5: Commit** `feat(chuyen): dòng «Không cần danh sách khách» và câu thiếu tên theo dấu của đơn (ADR-0154 Đ3.3)`.

---

# Đợt 4 — ADR-0155 Đ2: cột «Cấp độ đại lý» ở Quản lý tài khoản

Độc lập với ADR-0155 Đ1 và với các đợt trên: bài chỉ dùng đối tác có tài khoản; không đụng `role_via_account`, `accountLinked`, `web/parties.ts`, `src/shared/booker.ts`; không migration. Công ty lữ hành không tài khoản vẫn đặt cấp ở trang Hoa hồng.

Người kiểm đợt kiểm: số câu cố định, đối chiếu với route hồ sơ, ngày mặc định không rơi 400, không tính luật thứ hai, tài khoản lai bị chặn cả hai phía.

## Task 4.1: Route đọc `GET /api/pricing/cap-hien-hanh`

**Files:**
- Modify: `src/modules/pricing/repository.ts:73-78`, `src/modules/pricing/rules.ts:~457`, `src/modules/pricing/index.ts:~778`, `src/shared/contracts.ts:~2860`, `src/route-access.test.ts`
- Create: `src/modules/pricing/cap-hien-hanh-route.test.ts`

**Interfaces:**
- Repo: `openBeneficiaryRolesAll(db): Promise<{ party_id: string; role_type_code: string }[]>`, `defineSql("pricing", "open_beneficiary_roles_all", …)`, nối `v_pty_open_role` với `prc_beneficiary_role` `active = 1`, có bài EXPLAIN.
- DTO:
  ```ts
  export type NguonCap = "RIENG" | "THEO_VAI" | "XUNG_DOT" | "CHUA_CO";
  export interface CapHienHanhDto {
    partyId: string; nguon: NguonCap; cap: { code: string; ten: string } | null; coMucRieng: boolean;
    rieng: { id: string; tuNgay: string; denNgay: string | null } | null; sapApTu: string | null; doiDuoc: boolean;
  }
  export interface CapHienHanhResponse { homNay: string; hoSo: CapHienHanhDto[] }
  ```
  Lệch đặc tả có ghi: bỏ `?ids=` và ép một câu theo ADR-0155; `rieng`, `doiDuoc` thay `ganId`, `nutDoi`, `nutNgung`. Không tên, không SĐT.
- Luật: `capHienHanhCuaHoSo(t: TomTatHoaHongHoSo, v: { partyId: string; homNay: string; tenCuaMuc: ReadonlyMap<string, string>; ganCuaHoSo: readonly GanRiengRow[] }): CapHienHanhDto`, gọi từ kết quả của đúng `tomTatHoaHongHoSo`, không viết luật thứ hai. `coMucRieng = dongRiengDoiTac > 0 || (nguon === "THEO_VAI" && dongRiengLoai > 0)`. `doiDuoc = sapApTu === null && (rieng === null || nutDoiNgung({ tuNgay, denNgay, conHieuLuc: true }, homNay).hien)`.
- Route: cổng `office`, `if (!can(staff, "partner.commission.view") || holdsPartner(staff)) return FORBIDDEN();`. Câu đọc đúng sáu, song song: `openBeneficiaryRolesAll`, `beneficiaryRoles`, `roleTiersOn`, `rulesOn`, `partyTiersCurrent`, `rateTiers`. Rồi `tomTatHoaHongHoSo` từng hồ sơ trong bộ nhớ.

- [ ] **Step 1: Bài đỏ**, khuôn `src/modules/pricing/ho-so-hoa-hong.test.ts` (`SALES, SA, KT, ADM, DT, HR, KP`):
  - `(e) HR 403; Đối tác 403; tài khoản lai Kế toán + Đối tác 403; Quản trị, Toàn quyền 200; Bán hàng GET /api/staff 403 nên không vào được trang`.
  - `(e2) Quản trị đặt, đổi, ngừng qua ba route có sẵn 2xx, đọc lại đúng; HR, tài khoản lai 403` (`POST /api/pricing/ho-so/:id/muc-rieng`, `POST /api/pricing/muc-rieng/:id/doi`, `POST /api/pricing/muc-rieng/:id/ket-thuc`).
  - `(f) đối chiếu: bộ ca bốn nguồn (cấp riêng; theo vai trò; hai vai trò khác cấp; chưa có cấp), có và không có mức riêng của hồ sơ, của vai trò: mỗi hồ sơ khớp GET /api/pricing/ho-so/:id/hoa-hong (mucRieng, vai, xungDot, dongRiengDoiTac, dongRiengLoai)`.
  - `(f2) hồ sơ không mang vai được hưởng không có trong kết quả`.
  - `(f3) số câu cố định: bọc prepare của w.env.DB, 1 hồ sơ và 5 hồ sơ cùng số câu`.
  - `(f4) phản hồi không có tên hồ sơ, SĐT`.
  - `(g) đơn đã xác nhận rồi đổi cấp riêng: ord_service_terms của đơn giống từng byte; đơn xác nhận sau ngày hiệu lực dùng cấp mới`, khuôn `src/modules/orders/chup-xac-nhan.test.ts`.
  - `doiDuoc: cấp riêng đã hẹn ngày ngừng → false; có cấp riêng sắp áp dụng → false; cấp riêng mở → true; không cấp riêng → true`.
- [ ] **Step 2:** `node --test src/modules/pricing/cap-hien-hanh-route.test.ts`. Kỳ vọng: FAIL.
- [ ] **Step 3: Thi công** theo Interfaces. Thêm `{ method: "GET", path: "/api/pricing/cap-hien-hanh", access: "office" }` vào `SNAPSHOT`.
- [ ] **Step 4:** Chạy lại Step 2 thêm `src/route-access.test.ts src/architecture.test.ts src/modules/pricing/ho-so-hoa-hong.test.ts src/bang-tu-giao-dien.test.ts`, rồi `npm run typecheck`. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(hoa-hong): route đọc cấp hiện hành của mọi hồ sơ được hưởng (ADR-0155 Đ2.5)`.

## Task 4.2: Cột, thẻ điện thoại, bảng bấm

**Files:**
- Create: `src/shared/cap-hien-hanh-hien-thi.ts`, `src/shared/cap-hien-hanh-hien-thi.test.ts`, `web/cot-cap-dai-ly.ts`, `src/cot-cap-dai-ly-noi-day.test.ts`
- Modify: `public/staff.html:27`, `web/staff.ts:149`, `:206`, `:329-336`, `:508-521`

**Interfaces:**
- `thayCotCap(s: PermissionHolder): boolean` = `can(s, "partner.commission.view") && !holdsPartner(s)`; `suaDuocCot(s): boolean` = `can(s, "partner.commission.write") && !holdsPartner(s)`.
- `oCapCuaDong(dong: Pick<StaffAccount, "permissions" | "partyId">, v: CapHienHanhDto | undefined): { chu: string; moBang: boolean; coMucRieng: boolean; theoVaiTu: string | null; troHoaHong: boolean } | null`. Dòng không giữ `PARTNER` ⇒ `null` (ô trống). Không có `v` hoặc `partyId = null` ⇒ `Chưa có vai trò`, `moBang: false`. `RIENG` ⇒ `<ten> (cấp riêng)`. `THEO_VAI` ⇒ `<ten> (theo vai trò)`. `CHUA_CO` ⇒ `Chưa có cấp`. `XUNG_DOT` ⇒ `Hai vai trò khác cấp`. `theoVaiTu` = ngày sau `rieng.denNgay` khi có. `troHoaHong = !v.doiDuoc`.
- `macDinhBangCap(v: CapHienHanhDto, homNay: string, xem: SuaXemTruocResponse | null): { kieu: "DAT" | "DOI"; tuNgay: string; dungTheoVaiDuoc: boolean }`. Không cấp riêng ⇒ `DAT`, `homNay`. Cấp riêng ⇒ `DOI`; `HUY_THAY` ⇒ `ngayDoiSomNhat(rieng.tuNgay, homNay)`; `TU_NGAY` ⇒ ngày lớn hơn của giá trị đó và `tuNgaySomNhat`. `dungTheoVaiDuoc` = có cấp riêng, `rieng.tuNgay <= homNay`, và với `TU_NGAY` thì `addDays(tuNgaySomNhat, -1) <= homNay`.
- `web/cot-cap-dai-ly.ts`, **chỉ `web/staff.ts` nhập**: `taiCapHienHanh(): Promise<Map<string, CapHienHanhDto> | null>`, `oCap(dong, v, suaDuoc, lamMoi): HTMLElement`. Bấm mở `moBangTruot` (`web/bang-truot.ts`): nhãn `Cấp độ đại lý`, chọn cấp từ `GET /api/pricing/muc-ta` (`muc` đang bật), ô `Từ ngày` có `min`, nút `Lưu`, nút `Dùng cấp theo vai trò` kèm câu `Có hiệu lực từ ngày mai.`. Cấp riêng: mở bảng thì gọi `GET /api/pricing/muc-rieng/:id/sua` lấy ngày; 400 của route này ⇒ không cho sửa, trỏ trang Hoa hồng. Không gọi route hàng loạt `hoiDaChup`: danh sách không đọc theo từng dòng.
- Ghi: `DAT` `POST /api/pricing/ho-so/:id/muc-rieng` `{ muc, tuNgay }`; `DOI` `POST /api/pricing/muc-rieng/:id/doi` `{ muc, tuNgay }`; `Dùng cấp theo vai trò` `POST /api/pricing/muc-rieng/:id/ket-thuc` `{ denNgay: homNay }`. Xong gọi lại `taiCapHienHanh`, `ve()`.
- Nhãn `có mức riêng` khi `coMucRieng`, là liên kết trang Hoa hồng. `Theo vai trò từ <ngày>` khi `theoVaiTu`. `troHoaHong` ⇒ ô là liên kết `Sửa ở trang Hoa hồng`.
- `public/staff.html:27` thêm `<th id="cot-cap" hidden>Cấp độ đại lý</th>`, cạnh cột Vai trò / quyền. `load()`: `thayCotCap` mới gọi route; lỗi route không chặn bảng, ô hiện `—`. Thẻ điện thoại có đúng ô đó.

- [ ] **Step 1: Bài đỏ** `cap-hien-hanh-hien-thi.test.ts`:
  - `(k) đủ năm trạng thái đúng chữ ADR, chỉ moBang false ở «Chưa có vai trò»`.
  - `(k2) dòng không giữ PARTNER → null`; `partyId null → «Chưa có vai trò»`.
  - `(k3) có mức riêng: dongRiengDoiTac > 0 mọi nguồn; dongRiengLoai > 0 chỉ khi theo vai trò`.
  - `(k4) ngày mặc định qua được luật máy chủ`: bảng ca (cấp riêng bắt đầu hôm qua; bắt đầu hôm nay; đã chụp tới hôm nay; đã chụp tới ngày mai; không chụp): `kiemDoi` của `src/modules/pricing/rules.ts` và `xetTruocDoiCapRieng` qua route đều nhận `macDinhBangCap(...).tuNgay`.
  - `(k5) Dùng cấp theo vai trò: kiemNgung nhận denNgay = hôm nay khi dungTheoVaiDuoc; đã chụp tới ngày mai → dungTheoVaiDuoc false; cấp riêng bắt đầu ngày mai → false`.
  - `(k6) bảng từ: mọi chữ qua viPham`.
  - Route, thêm vào `cap-hien-hanh-route.test.ts`: `(k7) Dùng cấp theo vai trò hôm nay: valid_to_date = hôm nay; hôm nay vẫn nguon RIENG, ngày mai THEO_VAI`.
  - Nối dây: `(e3) public/staff.html có th id cot-cap hidden; web/staff.ts hỏi thayCotCap trước khi gọi route; không tệp nào ngoài web/staff.ts nhập web/cot-cap-dai-ly.ts; web/orders.ts không kéo tệp này`.
- [ ] **Step 2:** `node --test src/shared/cap-hien-hanh-hien-thi.test.ts src/cot-cap-dai-ly-noi-day.test.ts`. Kỳ vọng: FAIL.
- [ ] **Step 3: Thi công** theo Interfaces. Thêm bước vào `luot-2-smoke.mjs`:
  11. Quản trị 1040: đủ năm trạng thái, đặt cấp, đổi cấp, dùng theo vai trò.
  12. 390: thẻ có ô đó.
  13. Hành chính nhân sự: không cột, không gọi route (bộ đếm `fetch` gắn trong trang).
- [ ] **Step 4:** Chạy lại Step 2 thêm `src/modules/pricing/cap-hien-hanh-route.test.ts src/bang-tu-giao-dien.test.ts src/goi-trang-nhe.test.ts src/giao-dien-hoi-bang-quyen.test.ts`, rồi `npm run typecheck && npm run build:web`. Kỳ vọng: PASS.
- [ ] **Step 5: Commit** `feat(tai-khoan): cột Cấp độ đại lý ở Quản lý tài khoản, xem và đặt nhanh (ADR-0155 Đ2)`.

---

# Đợt 5 — Đóng: tài liệu, bộ kiểm dài, ảnh thật, kiểm độc lập

## Task 5.1: Tài liệu

**Files:** Modify đủ danh sách sau; không sửa ADR đã duyệt.

| Tệp | Việc |
|---|---|
| `src/shared/huong-dan-doi-tac.ts` | Viết lại «Lập đơn cho khách» (bước 2 khi công tắc bật; bước 5 bỏ «Khung giờ có thể để trống»: có đón thì văn phòng báo giờ), «Xác nhận đơn» (có đón thì luôn chờ; bỏ «giờ đón quá gần» phía đối tác) |
| `src/shared/huong-dan-ke-toan.ts`, `src/shared/huong-dan-ban-hang.ts`, `src/shared/huong-dan-hdv.ts` | Bảng Còn vé: ghi chú, ô giờ bắt buộc, đặt gấp ngay ở bảng (Bán hàng, Quản trị), nhờ người có quyền (Kế toán, HDV nội bộ); gọi số trên đơn báo giờ; công tắc bật thì số là của đối tác |
| `src/shared/huong-dan-quan-tri.ts` | Công tắc cạnh «Dịch vụ nhập tay» (`:193`); cột Cấp độ đại lý; dòng «Không cần danh sách khách»; `Tình huống hay gặp` thêm đặt gấp ở bảng Còn vé |
| `src/shared/tro-ly-kien-truc.ts` | Đoạn `:20`, `:29`: đơn đối tác có đón chờ văn phòng chốt giờ; câu chữ qua `viPhamChu`, `viPhamKyThuat`. Kho tự sinh: `node scripts/sinh-so-do-trang.mjs` |
| `src/shared/changelog.ts` | Mục đầu `2.56`, số tạm, lời thường, không số điện thoại; nêu nháp đối tác đã có giờ, lưu lại thì giờ lượt đầu bị bỏ và đơn chờ văn phòng chốt |
| `docs/SYSTEM-DESIGN.md` | Bảng dữ liệu `:297-300`, migration `:~577`, luồng `:689`, API `:967` (ba route mới) |
| `docs/CHANGE-GUIDE.md` | d (số kế tiếp), z (công thức chặng: lượt đầu), z3 (miễn thiếu tên), z6 (khối cạnh công tắc), z27 (luật chốt giờ, `pickup_time_required`), công thức mới «Công tắc ẩn thông tin khách», «Cột Cấp độ đại lý», §3 ma trận `:1182`, §4 bẫy `:1265` (không dùng `legs[0]` làm lượt đầu; `xacNhanRoutes` là hàm) |
| `docs/SO-HANG-RAO.md` | Dòng ở Task 5.2 |
| `docs/BACKLOG.md` | Nợ (e) khi ADR-0147 thi công; ghi kép cột cũ khi phát hành 2 |
| `tests/e2e/README.md` | Chỉ nếu thêm tệp e2e mới |
| `src/CLAUDE.md`, `web/CLAUDE.md` | **Đề xuất qua công cụ sửa tệp, chủ duyệt (N9):** dòng `luot-2-smoke.mjs` ở bảng kịch bản; `cap-hien-hanh` ở phần pricing |

- [ ] **Step 1:** Sửa danh sách trên. Chữ qua bảng từ, «Nền tảng» không «App».
- [ ] **Step 2:** `node --test src/shared/huong-dan.test.ts src/shared/huong-dan-doi-tac-gui-don.test.ts src/shared/changelog.test.ts src/bang-tu-giao-dien.test.ts src/shared/tro-ly-cau-truc.test.ts && npm run typecheck`. Kỳ vọng: PASS.
- [ ] **Step 3: Commit** `docs: cập nhật hướng dẫn và tài liệu cho đặt vé đối tác lượt 2`.

## Task 5.2: Bộ kiểm dài và sổ hàng rào

**Files:** Modify `tests/e2e/gui-don.mjs`, `tests/e2e/xac-nhan-don.mjs`, `tests/e2e/so-dai-ly.mjs`, `docs/SO-HANG-RAO.md`.

- [ ] **Step 1: Thêm khối e2e.**
  - `gui-don.mjs`: `✓ (a)(k)` nhánh A, cờ; `✓ công tắc: (g)(n)(q)` BẬT rồi **tự TẮT ở cuối**, vì D1 chung.
  - `xac-nhan-don.mjs`: `✓ (c)(i)(j)(m)(p)`.
  - `so-dai-ly.mjs`: `✓ cột cấp (e)(f)(g)`, đối tác có tài khoản.
  - Nếu chạy được, thêm một đơn có dấu đi tới cho xe chạy ở `tests/e2e/dieu-phoi.mjs`.
- [ ] **Step 2: Chạy một lần:** `npm test`. Kỳ vọng: xanh; ghi số bài, số bỏ qua.
- [ ] **Step 3:** `npm run typecheck`. Kỳ vọng: 0 lỗi.
- [ ] **Step 4:** Tắt `wrangler dev` mồ côi, `npm run build:web`, `npm run test:e2e`. Kỳ vọng: chỉ đỏ `H5` có sẵn từ `main`, không thêm route nào; so danh sách route đỏ với `main`. **Không thêm tên vào `src/shared/lan-gui-no.ts`.** Đỏ khác thì sửa và chạy lại đúng kịch bản đó.
- [ ] **Step 5: Kịch bản Chrome** từ gốc kho, mỗi kịch bản kèm `AXE_JS=/Users/tuanbao/.claude/jobs/967a607e/tmp/axe.min.js CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh`: `luot-2-smoke.mjs`; `docs/evidence/2026-10-26-xac-nhan-don/kich-ban/xac-nhan-smoke.mjs`; `docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/doi-tac-lap-don-smoke.mjs`; ba `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-*.mjs`; `chuyen-smoke.mjs`, `dat-gap-smoke.mjs`, `cuoc-smoke.mjs` ở `docs/evidence/2026-09-29-adr-0049/kich-ban/`; `docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs`; `vai-smoke.mjs` ở `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/` và `va3-smoke.mjs` ở `docs/evidence/2026-09-26-va-3-loi-kiem-toan/kich-ban/` (cho `web/staff.ts`). Dòng nào `web/CLAUDE.md` ghi «thay bằng» thì chạy bản ở `docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/`. «SMOKE OK» phải kèm kiểm màu, không phải bỏ qua vì thiếu `AXE_JS`.
- [ ] **Step 6: Sổ hàng rào.** Thêm vào `docs/SO-HANG-RAO.md` (5 cột), ngày là ngày đã thấy đỏ ở Task 2.2:

  | Hàng rào | Chặn cái gì | Cơ chế | Sửa cố ý |
  |---|---|---|---|
  | Dấu miễn danh sách chụp lúc lập | Đơn cũ đổi trạng thái miễn theo công tắc | `orders.manifest_exempt`, trigger, `mien-danh-sach.test.ts` (h6) | Đọc công tắc hiện hành |
  | Lượt đầu của dịch vụ | Đơn đối tác có giờ gợi ý chiều về thoát nhánh A | `changDauCuaDichVu`, `gui-don-chot-gio.test.ts` (a2) | Dùng `legs[0]` |
  | Cổng chốt giờ ở Còn vé | Xác nhận đơn thiếu giờ | 409 `pickup_time_required`, `con-ve-chot-gio.test.ts` (c) | Bỏ cổng |
  | Công tắc do máy chủ ép | Trình duyệt cũ gửi tên giả, `passengers`, `newBooker` | `thanLapDonKhiAn`, `an-khach-route.test.ts` (g) | Bỏ lời gọi |
  | `R-ORD-17w` (cảnh báo, lớp bù lệch 5.1) | Đơn đã xác nhận mà lượt đầu Đón không giờ | `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | Bỏ vế `PARTNER` trong SQL, bài ca (j) đỏ |
  | Cột cấp chặn tài khoản giữ quyền Đối tác | Đối tác đọc cấp của mọi hồ sơ | `holdsPartner` ở route, `cap-hien-hanh-route.test.ts` (e) | Bỏ vế `holdsPartner` |

  Hai dòng cuối tự làm sửa cố ý ở bước này, hoàn nguyên, ghi ngày.
- [ ] **Step 7: Commit** `test: e2e đặt vé đối tác lượt 2, ghi sổ hàng rào đã thấy chặn thật`.

## Task 5.3: Ảnh thật trình chủ

**Files:** Create `docs/evidence/<ngày chụp>-dat-ve-luot-2/README.md`, `docs/evidence/<ngày chụp>-dat-ve-luot-2/kich-ban/chup-anh.mjs`, ảnh `.png`. Thư mục mới: bộ của lượt 1 là hồ sơ có ngày, không sửa.

**Interfaces:** khuôn `docs/evidence/2026-11-02-dat-ve-luot-1/kich-ban/chup-anh.mjs`, `README.md` cùng thư mục: D1 tạm, Chrome thật, không production, mỗi cảnh hai khổ 390 (tỷ lệ 2) và 1280 (tỷ lệ 1), có ảnh cắt sát chữ mới.

| Tệp | Cảnh, chữ mới phải đọc được |
|---|---|
| `form-doi-tac-tat-*` | Form đối tác khi TẮT: Đưa đón không còn ô giờ |
| `form-doi-tac-bat-*` | Khi BẬT: chỉ còn Ngày khởi hành, không khối Khách hàng, Hành khách |
| `cong-tac-*` | Trang Tôi, Toàn quyền: tên công tắc, gợi ý, nút |
| `cho-xac-nhan-*` | Danh sách chờ: «Chưa có giờ đón», nhãn lý do |
| `con-ve-bat-buoc-*`, `con-ve-dat-gap-*`, `con-ve-nho-*` | Ghi chú trên khối giờ; «(bắt buộc)»; Bán hàng đặt gấp; câu nhờ của Kế toán |
| `chi-tiet-chuyen-*` | Dòng «Đủ tên khách» ghi **«Không cần danh sách khách»** |
| `trang-don-co-dau-*` | Câu «Đơn này không cần đủ tên để xe chạy.» |
| `cot-cap-*`, `cot-cap-bang-*` | Năm trạng thái, «có mức riêng», «Theo vai trò từ …», bảng bấm, «Dùng cấp theo vai trò» |

README ghi: cách chụp; bảng ảnh; lỗi thấy trong ảnh và đã sửa; điều thấy mà chưa sửa; **lệch chữ mẫu «Miễn danh sách» → «Không cần danh sách khách», chờ chủ xem**.

- [ ] **Step 1:** `npm run build:web`, rồi `CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/<ngày chụp>-dat-ve-luot-2/kich-ban/chup-anh.mjs`. Kỳ vọng: đủ ảnh, không lỗi.
- [ ] **Step 2:** Mở từng ảnh bằng công cụ đọc ảnh, đối chiếu chữ với `src/shared/bang-tu-giao-dien.ts`. Lỗi thấy được thì sửa, chạy lại đúng kịch bản liên quan, chụp lại.
- [ ] **Step 3: Commit** `docs(evidence): ảnh thật các chữ mới của đặt vé đối tác lượt 2`.
- [ ] **Step 4: Trình chủ.** Đưa ảnh và danh sách chữ mới bằng lời thường, kèm câu «Miễn danh sách». **Chưa coi là xong khi chủ chưa xem.** Chủ đổi chữ thì sửa, chạy lại bài bảng từ và kịch bản liên quan, chụp lại vào cùng thư mục.

## Task 5.4: Kiểm độc lập cả nhánh

- [ ] **Step 1: Giao `nguoi-kiem-doc-lap`** (chỉ đọc), kèm đường dẫn ADR-0154, ADR-0155 Đ2, trang ghép, kế hoạch này; không kèm kết luận của người thi công. Yêu cầu:
  - Đối chiếu từng tiêu chí của bảng phủ với bài thật, tự chạy lại đúng các tệp bài.
  - Kiểm ba nơi gọi `soanXacNhan`, đơn văn phòng không đổi.
  - Thử Review Focus trên bản chép; thử ADR-0155 Đ2 không phụ thuộc Đ1 (không đụng `role_via_account`).
  - Đọc `R-ORD-17w`, thứ tự lượt đầu hai phía.
  - Đọc P16 trong sổ. So đỏ `H5` với `main`.
  - Kiểm chữ trong ảnh với bảng từ.
- [ ] **Step 2:** Sửa phát hiện, giao lại người kiểm đọc phần đã sửa. Chỉ báo đạt dựa trên báo cáo đó cùng kết quả bộ kiểm.
- [ ] **Step 3: Báo cáo chủ:** bốn mục theo `CLAUDE.md` §4. Lệnh nhập do chủ tự chạy (`npm run day-len`), nói rõ có cần triển khai không: có, vì có migration `0133` và mã mới. Công tắc mặc định TẮT nên phát hành không đổi gì ở Đ2, Đ3; **Đ1 có hiệu lực ngay**.

## Chưa kiểm

Lúc viết kế hoạch chỉ đọc mã, không chạy bài nào. Chưa xác minh bằng chạy thử: tên khoá kết quả của khung thử ở `tests/audit/dieu-phoi-khung.mjs` với đơn do đối tác lập; cách bọc `prepare` của `w.env.DB` để đếm câu; số dòng có dấu `~` là gần đúng, tìm theo tên. `kiemNgung` với cấp riêng có `ngayChup` ở tương lai mới đọc mã. Chưa kiểm production: tài khoản lai, `require_manifest`, số nháp đang mở của đối tác. Pháp lý xe hợp đồng chưa có luật sư xác nhận (ADR-0154, rủi ro chủ đã chấp nhận).
