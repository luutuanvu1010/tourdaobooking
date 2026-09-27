# Đặc tả (bản nháp): Thông báo hệ thống — chuông, hộp thông báo, tin của Toàn quyền, thông báo màn hình khoá

- **Trạng thái:** **lượt 1 ĐÃ DUYỆT** (chủ trả lời "Duyệt" trong chat 2026-09-27 — đặc tả §1–§8, §12 và ADR-0034 accepted); lượt 2 (§9, ADR-0036) chờ duyệt riêng. Bước kế: bản mẫu giao diện (E1) → kế hoạch thi công. Chủ đã trả lời **đủ các câu hỏi** trong chat 2026-09-27 (§2). **Duyệt làm hai lượt** (CLAUDE.md §9: tối đa 3 quyết định chạm quyền/dữ liệu mỗi lượt):
  - **Lượt 1** — hộp thông báo + tin thủ công: `docs/adr/ADR-0034-thong-bao-he-thong-hop-thong-bao.md` (proposed). Ba quyết định chạm quyền/dữ liệu: (1) hộp là hình chiếu của sổ nhật ký, (2) bảng tin thủ công + xác nhận đã hiểu + mốc đã đọc, (3) ô quyền `notice.send`.
  - **Lượt 2** — thông báo màn hình khoá: `docs/adr/ADR-0036-thong-bao-man-hinh-khoa.md` (proposed). Ba quyết định: (1) lưu địa chỉ nhận của máy, (2) khoá bí mật mới + cú gõ cửa không nội dung, (3) luật tự tắt.
- **Ngày:** 2026-09-27. **Người soạn:** AI (phiên lập kế hoạch; không thi công trong phiên này — P15).
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` rỗng (kiểm 2026-09-27).
- **Số đã giữ:** migration `0025_*` (số lớn nhất ở `main` và mọi nhánh cục bộ là 0024; `0019` dành cho B5). ADR-0034, ADR-0036 (0030–0032 dành cho Đơn tự do, 0033 đã dùng, **0035 đã dùng** ở nhánh chưa gộp `worktree-toi-uu-tai-trang` — `ADR-0035-khung-app-nam-san-tren-may.md`).
- **Cổng trước thi công giao diện:** bản mẫu bấm thử được (iPhone + máy tính) do AI vẽ, **chủ duyệt** rồi mới làm, làm đúng 100% bản mẫu (§2 E1; bài học Đợt D). **ĐÃ DUYỆT** — chủ trả lời *"duyệt"* trong chat 2026-09-27 cho bản mẫu `docs/design/thong-bao-mockup/ban-mau-thong-bao.html` (commit 261b74a; bản đăng https://claude.ai/artifact/6oyms74ZYFvosY5YAYAHk7). Bản mẫu là chuẩn nghiệm thu giao diện: vị trí chuông, hai ngăn, câu chữ, màu dải tin (cát), màn Gửi thông báo, bước xác nhận thu hồi.

## 0. Bài toán bằng lời thường

Hôm nay app có **thông báo nổi** (Bảng tin, ADR-0022): hiện chốc lát trên màn hình **đang mở** khi đơn đổi trạng thái; không lưu, tắt app là lỡ. Admin không có cách gửi tin cho mọi người.

Chủ muốn: một **chuông** có số chưa đọc; bấm vào ra **hộp thông báo** gồm (a) tin do Toàn quyền soạn (có loại quan trọng phải bấm "Đã hiểu"), (b) tin tự động khi **trạng thái đơn đổi**, kèm tên người làm ("Hùng vừa nhận đơn DH-123"); và **thông báo lên màn hình khoá** iPhone cho nhân viên nội bộ.

## 1. Hiện trạng (đã rà mã, `main` a74048e)

- Bảng tin: module `bangtin` hạng `KHONG_DB`, sự kiện đúng 5 khoá, không tên người (`src/shared/bang-tin.ts:12`). Điểm phát `ctx.baoThayDoi` sau khi ghi (`src/index.ts:37-49`). Thông báo nổi chỉ 5 loại, không cho Đối tác/Thực tập (`src/shared/bang-tin.ts:80-110`). Đóng kết nối khi ngưng tài khoản/đổi PIN/đổi quyền: `dongBangTin` (`src/modules/accounts/index.ts:182,266,282,319,500,532,593,614,633` — rà lại đủ mọi điểm gọi khi thi công).
- **Sổ nhật ký `audit_log`** ghi **cùng lô** với mọi thao tác đơn (`auditStatement`, `src/modules/audit/index.ts:19`), có người làm (`staff_id`), đơn (`order_id`), hành động, giờ. Hành động về đơn: `created`, `confirmed`, `cancelled`, `order_cancelled_by_field`, `order_handler_changed` (`src/shared/audit-actions.ts:18-25`). `order_handler_changed` **không** phân biệt "tự nhận" với "được giao" (`src/modules/dispatch/service.ts:25-31`: chi tiết là câu chữ có tên, không có mã người mới).
- View công bố: `v_ord_order_label` chỉ `id, order_code` (`migrations/0009_orders_label_view.sql`) — **không** có người lập; `v_dsp_order_handler` có `order_id, staff_id` (`migrations/0014_dispatch.sql:64`); `v_stf_staff_label` (tên nhân viên).
- Mẫu "đã xem": cột `*_seen_at` của Góp ý (`migrations/0016_feedback.sql`), chấm đếm `GET /api/feedback/badge`.
- Service worker `web/sw/sw.ts`: chưa có `push`. Đăng xuất `POST /api/auth/logout` là route công khai, chỉ xoá cookie (`src/modules/auth/index.ts:171`).
- `SUPER_ADMIN` = `any` ở mọi thao tác (`src/shared/permissions.ts:40`).

## 2. Quyết định của chủ (chat 2026-09-27)

| # | Câu hỏi | Chủ chọn | Căn cứ đã nêu khi hỏi |
|---|---|---|---|
| H1 | Hình thức | Chuông + hộp thông báo; vẫn giữ thông báo nổi | |
| H2 | Tin thủ công gửi cho ai | Toàn công ty **hoặc** theo nhóm quyền | |
| H3 | Ai nhận tin về đơn nào | Giữ đúng luật "ai thấy" của thông báo nổi | |
| H4 | Màn hình khoá | Làm luôn đợt này | |
| Q1 | Ai gửi tin thủ công | **Chỉ Toàn quyền** | |
| Q2 | Tin về đơn có tên người làm | **Có tên** | |
| Q3 | Tin về đơn phải chắc chắn hay được lỡ | **Chắc chắn** | |
| N1 | Tin về đơn lấy từ đâu | **Đọc lại từ sổ nhật ký** — hộp là hình chiếu | Hiến chương 1.4, 4.1, K16; Hiến pháp P6 |
| N2 | Làm ngay hay chờ sau sổ tiền | **Làm ngay**; thông báo không bao giờ kích hoạt tiền | Hiến chương 5.13, 5.10; Hiến pháp P3 |
| N3 | Tin quan trọng | **Có**, bắt bấm "Đã hiểu", Toàn quyền xem ai đã/chưa | Hiến pháp P5 |
| N4 | Lỡ thông báo màn hình khoá | **Chấp nhận lỡ** (hộp vẫn giữ đủ) | Hiến chương 5.16 |
| E1 | Thiết kế giao diện | **AI vẽ bản mẫu, chủ duyệt**, làm đúng 100% | bài học Đợt D |
| E2 | Khi nào "đã đọc" | **Mở hộp là đọc hết** (trừ tin quan trọng) | |
| E3 | Việc của chính mình | **Không hiện** cho chính người làm | |
| E4 | Chống ngợp | **Hai ngăn "Của tôi" / "Tất cả"**; số đỏ chỉ đếm "Của tôi" | Hiến pháp P11 |
| M1 | Rung máy cho tin nào | **Chỉ ngăn "Của tôi"** | |
| M2 | Giờ yên lặng | **22:00–06:00 giờ Việt Nam**, trừ tin quan trọng | |
| M3 | Máy còn nhận khi đăng xuất/đổi PIN/đổi quyền/ngưng | **Tự tắt, phải bật lại** | |
| M4 | Đối tác nhận trên màn hình khoá | **Chưa — đợt này chỉ nội bộ** | |
| X1 | "Mới có HDV xác nhận" là gì | **HDV bấm nhận đơn** (`nhan`) | Hôm nay chỉ Bán hàng, Quản trị, Toàn quyền có `dispatch.claim` (`src/shared/permissions.ts:59`); HDV nhận được đơn khi Đơn tự do/GĐ2 cấp quyền — tin "vừa nhận đơn" tự áp cho HDV từ lúc đó, không cần sửa thông báo. |
| X2 | Tin chờ nhận đã có người nhận | **Mờ đi, ghi "đã có người nhận"** | |
| X3 | Nhắc tin quan trọng chưa hiểu | **Dải ở đầu mọi trang** | |
| X4 | Giữ tin bao lâu | **30 ngày**; tin quan trọng chưa "Đã hiểu" giữ tới khi bấm | |
| K3 | "Toàn công ty" có tới ~1.000 tài khoản Đối tác không (phát hiện của trợ lý đọc hộ — văn bản cũ tự mâu thuẫn) | **Chỉ nội bộ**; muốn gửi Đối tác thì tick riêng nhóm Đối tác | Hiến pháp P8 |
| K4 | HDV thấy tên người làm trên đơn mình dẫn không | **Giữ ẩn tên** đợt này (`order.history.view` của FIELD = none); mở sau bằng quyết định quyền riêng | |
| K5 | Thực tập bật được thông báo màn hình khoá không | **Có — coi là nội bộ** (lượt 2) | |
| K6 | Người gửi tin thủ công có thấy tin của chính mình trong hộp không | **Không** (theo E3) — xem tin đã gửi ở màn "Gửi thông báo". AI nêu khi trình bản mẫu; chủ duyệt bản mẫu 2026-09-27 | |
| K7 | HDV bấm "Từ chối" đơn (`order_handler_refused`, ADR-0030) có lên chuông không | **Chưa — để sau.** Lượt 1 không đưa `order_handler_refused` vào `v_aud_order_event`; thêm ở lượt sau khi ADR-0030 đã lên production (chủ trả lời trong chat 2026-09-27 khi duyệt kế hoạch). Không đổi ADR-0034 (đã duyệt): danh sách loại tin của điều 2 giữ nguyên. | |
| K2 | Quản trị có thấy dòng nhật ký `notice_*` qua nhật ký chung `GET /api/audit` (`admin.manage`) không (phát hiện kiểm độc lập vòng 2) | **Được thấy** — giữ lệ Quản trị xem mọi dòng nhật ký; dòng chỉ có mã tin + ai + lúc nào; màn "ai đã/chưa hiểu" vẫn chỉ Toàn quyền | CLAUDE.md §9 bước ghép |
| K1 | Tên người làm khi người xem không được xem lịch sử đơn (phát hiện của người kiểm độc lập) | **Ẩn tên** nếu `order.history.view` của người xem sai với đơn đó — câu không tên như thông báo nổi hôm nay | ranh giới quyền ADR-0007/0009; Hiến pháp P8 |

Cảnh báo đã nói với chủ (P18, mỗi điều một lần): (a) theo H3, khi ADR-0017 (HDV xem mọi đơn) thi công ở GĐ2, **mọi HDV có tin về mọi đơn** ở ngăn "Tất cả" (ngăn "Của tôi" không đổi); (b) H4 đưa sớm "giai đoạn 6" của ADR-0018; (c) thông báo là tầng xây sau cùng (5.13) — chủ chọn làm ngay (N2).

## 3. Phạm vi

**Có:** chuông + số chưa đọc ở khung mọi trang; hộp thông báo hai ngăn; tin tự động về đơn kèm tên người làm; màn "Gửi thông báo" cho Toàn quyền (soạn, đánh dấu quan trọng, xem đã gửi, xem ai đã/chưa "Đã hiểu", thu hồi); dải nhắc tin quan trọng; thông báo màn hình khoá cho tài khoản nội bộ (lượt 2).

**Không (YAGNI):** đánh dấu đọc từng tin thường; tin có ảnh/tệp; hẹn giờ gửi; chọn đích danh từng người; email; mỗi người tự chọn loại tin; giờ yên lặng tuỳ người; màn hình khoá cho Đối tác (cần hàng đợi — đợt sau); tin về đơn cho Đối tác/Thực tập (ADR-0014 điều 12 giữ).

## 4. Tin về đơn — hình chiếu của sổ nhật ký (N1)

### 4.1 Không ghi gì thêm

Tin về đơn **không có bảng riêng**. Hộp thông báo đọc các dòng `audit_log` về đơn trong 30 ngày qua view công bố của module `audit`. Vì nhật ký đã ghi cùng lô với thao tác (Hiến chương 4.1), tin **không thể lệch hay mất** so với việc thật (Q3 thoả mà không sửa lô ghi nào); tên người làm có sẵn (`staff_id` → `v_stf_staff_label`).

| Loại | Lấy từ hành động nhật ký | Câu hiển thị (mẫu; chữ cuối cùng duyệt ở bản mẫu) |
|---|---|---|
| Lập đơn | `created` | Lan vừa lập đơn mới DH-… |
| Lập đơn, **lúc lập** chưa có người phụ trách | `created` + (§4.2 X2) | Lan vừa lập đơn DH-…, chưa có người phụ trách |
| HDV/nhân viên tự nhận | `order_claimed` (**hành động nhật ký mới** — §4.3) | Hùng vừa nhận đơn DH-… |
| Giao/đổi người phụ trách | `order_handler_changed` | Lan vừa giao đơn DH-… cho người khác phụ trách |
| Xác nhận | `confirmed` | Lan vừa xác nhận đơn DH-… |
| Huỷ | `cancelled`, `order_cancelled_by_field` | Hùng vừa huỷ đơn DH-… |

Các hành động khác (`updated`, `trip_updated`, tiền…) không vào hộp. Người làm là hệ thống (`staff_id` NULL) → câu không tên ("Đơn DH-… vừa …").

**Tên người làm chỉ hiện khi người xem được xem lịch sử của đơn đó (K1):** `can(người xem, "order.history.view", { ownerId: người lập, assigned: người xem là người phụ trách hiện tại })` — cùng lời hỏi route `GET /api/orders/:id` dùng để trả/giấu lịch sử (`src/modules/orders/index.ts:244`). Sai → câu **không tên** (vd "Đơn DH-… vừa bị huỷ", "Đơn DH-… vừa có người nhận"). Hôm nay: Bán hàng thấy tên ở đơn mình lập/phụ trách; Kế toán, Quản trị, Toàn quyền thấy tên ở mọi đơn; Hướng dẫn viên (`order.history.view` = none) **không** thấy tên kể cả đơn mình phụ trách; Đối tác/Thực tập không có tin về đơn. Tên không bao giờ được gửi cho trình duyệt khi lời hỏi sai (máy chủ dựng câu).

### 4.2 Ai thấy — theo trạng thái HIỆN TẠI của đơn và quyền HIỆN TẠI của người xem

Lúc đọc, với mỗi dòng nhật ký, tính nhãn bằng `nhanSuKien` (ADR-0022) trên **trạng thái hiện tại**: người lập (view của `orders` — §6.2), người phụ trách hiện tại (`v_dsp_order_handler`); `handlerTruoc` = không rõ. Người xem T thấy tin khi:
1. một nhãn nằm trong `nhanKetNoi(T)` tính theo quyền hiện tại; **và**
2. T qua điều kiện "được thấy tin về đơn" — **tách** từ `thongBaoNoi` thành hàm dùng chung trong `src/shared/bang-tin.ts` (văn phòng hoặc HDV; loại chờ nhận cần `dispatch.claim`); `thongBaoNoi` gọi lại hàm đó, không đổi hành vi; **và**
3. T **không** phải người làm (E3).

**Nhãn `cho-nhan` chỉ áp cho dòng `created`** (tin "đơn mới chờ nhận"); các dòng khác của đơn (xác nhận, huỷ, giao…) **không** mang nhãn `cho-nhan` dù đơn hiện chưa có người — tránh đẩy mọi tin của đơn chưa có người vào ngăn "Của tôi" của người nhận được đơn. (AI tự chốt, thu hẹp — đúng bảng câu §4.1; phát hiện kiểm độc lập 2026-09-27 #4.)

Hệ quả có chủ ý (chủ đã nghe ở N1): người **vừa bị chuyển khỏi** đơn không còn thấy tin về đơn đó; người **mới** phụ trách thấy cả tin cũ của đơn; ai bị rút quyền thì tin cũ tự ẩn.

**Tin chờ nhận đã có người (X2):** dòng `created` của đơn **lúc lập** chưa có người phụ trách mà nay đã có → vẫn hiện, **mờ đi**, thêm chữ "đã có người nhận". "Lúc lập chưa có người" suy từ lịch sử phân công qua view công bố của `dispatch` (§6.2).

### 4.3 Hành động nhật ký mới `order_claimed`

`handlerChangeStatements` (`src/modules/dispatch/service.ts:25`) ghi `order_claimed` khi người làm tự đặt mình vào đơn **chưa có** người phụ trách (cùng luật `thayDoiCuaHandler`, `src/shared/bang-tin.ts`), còn lại vẫn `order_handler_changed`. Thêm một dòng vào `src/shared/audit-actions.ts` và truyền tín hiệu "tự nhận" vào `handlerChangeStatements` — thay đổi **nội bộ module `dispatch`**: route đã gọi `handlerChangeStatements` (`src/modules/dispatch/index.ts:135`) và `thayDoiCuaHandler` (`:153`) trong cùng tệp; chỉ cần tính tín hiệu trước khi dựng lô; không migration (CHECK liệt kê đã bỏ ở 0007). Dòng nhật ký cũ trước ngày phát hành vẫn là `order_handler_changed` → hiện là "giao" (chấp nhận, chỉ ảnh hưởng tin ≤ 30 ngày quanh lúc phát hành).

### 4.4 Hai ngăn (E4)

- **"Của tôi"** = tin thủ công gửi tới mình + tin về đơn có nhãn `nguoi:<mình>` (mình lập / mình phụ trách) + tin chờ nhận (nếu mình nhận được).
- **"Tất cả"** = "Của tôi" + tin về đơn nhãn `tat-ca`.
- **Số đỏ trên chuông chỉ đếm "Của tôi"**, tin có thời điểm sau mốc đã đọc (E2), hiện tối đa "9+". Số và danh sách đi qua **cùng một** hàm lọc (tiêu chí §8).
- Mở hộp (bất kỳ ngăn) = đặt mốc đã đọc = giờ máy chủ.

## 5. Tin thủ công (Toàn quyền)

- Trường: **tiêu đề** (≤ 120 ký tự), **nội dung** (chữ thường ≤ 2000 ký tự, giữ xuống dòng, không định dạng), **quan trọng** (có/không), **người nhận**: "Toàn công ty" hoặc tick ≥ 1 nhóm quyền (`SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, INTERN, SUPER_ADMIN`, nhãn tiếng Việt từ `PERMISSION_LABELS`). **"Toàn công ty" = tài khoản nội bộ** (có ít nhất một quyền khác `PARTNER`; K3) — **không** tới tài khoản chỉ-Đối-tác; muốn gửi Đối tác phải tick riêng nhóm Đối tác. Nhãn lưu: `noi-bo` hoặc `quyen:<MÃ>`. T thấy tin khi (tin nhắm `noi-bo` và T là nội bộ) hoặc T **đang** có một trong các quyền được chọn. Màn gửi ghi rõ dưới lựa chọn: "Toàn công ty (nhân viên nội bộ, không gồm Đối tác)".
- **Tin quan trọng (N3, X3):** hiện **dải nổi bật ở đầu mọi trang** tới khi T bấm vào đọc và bấm **"Đã hiểu"**; vẫn thao tác app bình thường. Mỗi lần "Đã hiểu" ghi một dòng (ai, lúc nào) — chỉ-thêm. Toàn quyền xem danh sách **đã hiểu / chưa hiểu** trong số người **hiện** thuộc nhóm nhận. Tin quan trọng chưa "Đã hiểu" giữ trong hộp quá 30 ngày (X4) và không bị mốc đã đọc tắt.
- **Thu hồi:** ẩn khỏi hộp và dải của mọi người (đặt `valid_to`, không xoá). Không sửa sau khi gửi (thu hồi rồi gửi tin mới).
- **Nhật ký:** `notice_sent`, `notice_revoked`, `notice_acknowledged` (nhóm mới `notice` trong `src/shared/audit-actions.ts`) — chỉ mã tin, không chép nội dung (nội dung có thể chứa SĐT — CLAUDE.md §7, Hiến chương 5.12).
- Tin thủ công **là** thực thể (có vòng đời: đã gửi → đã thu hồi) — có bảng riêng, không phải hình chiếu.

## 6. Kiến trúc và dữ liệu (cho người lập kế hoạch)

### 6.1 Module và cạnh

- **Module mới `thongbao`**, tiền tố `ntf_`, hạng **STRICT** (SQL qua `defineSql`). Chỉ `thongbao` ghi bảng `ntf_*`.
- Cạnh: `thongbao → audit` (view sự kiện đơn + `auditStatement`), `thongbao → orders` (view người lập), `thongbao → dispatch` (view phân công), `thongbao → staff` (`v_stf_staff_label`). **Không** module nào import `thongbao` (gốc lắp ráp gọi hàm của nó cho màn hình khoá — lượt 2) → không vòng. Khai `ALLOWED_EDGES` trong `src/architecture.test.ts`.
- **Không sửa lô ghi nào của `orders`**; `dispatch` chỉ đổi mã hành động nhật ký (§4.3).

### 6.2 View công bố cần thêm (migration `0025`)

- `audit`: view sự kiện đơn (vd `v_aud_order_event`: `id, order_id, staff_id, action, created_at` cho đúng các hành động ở bảng §4.1). `VIEW_PREFIX` trong `src/architecture.test.ts` chưa có tiền tố cho `audit` — thêm cùng commit.
- `orders`: người lập của đơn — view mới `v_ord_order_owner (id, staff_id)` (không sửa `v_ord_order_label` đang được đọc).
- `dispatch`: "lúc lập đơn đã có người phụ trách chưa" (X2) — nếu `v_dsp_order_handler` (chỉ dòng đang mở) không đủ, thêm view mới (vd `v_dsp_first_handler_at (order_id, since)`). Người lập kế hoạch chọn, ghi vào kế hoạch.
- Đo: ~30 ngày × vài chục dòng nhật ký/ngày → vài nghìn dòng lọc bằng JS mỗi lần mở hộp; nếu chậm (> 200 ms CPU), lọc sơ bằng SQL theo hành động + thời gian trước. Đo **cả** route tóm tắt (chuông + dải) — gọi ở mọi lần tải trang và mỗi tin Bảng tin, thường hơn mở hộp.

### 6.3 Bảng mới (migration `0025_thong_bao.sql`; cập nhật `docs/data-dictionary.json` + `npm run dict`)

- `ntf_notice` — `id TEXT PK`, `tieu_de`, `noi_dung`, `quan_trong INTEGER` (0/1), `created_at`, `created_by`, `valid_to TEXT NULL` (thu hồi), `updated_at`, `updated_by`.
- `ntf_notice_target` — `notice_id`, `tag` (`noi-bo` | `quyen:<MÃ>`); PK (`notice_id`, `tag`).
- `ntf_ack` — `notice_id`, `staff_id`; PK (`notice_id`, `staff_id`); chỉ-thêm (trigger cấm UPDATE/DELETE).
- `ntf_read_mark` — `staff_id TEXT PK`, `doc_den_luc` (mốc do chính tài khoản đặt; id lấy từ phiên).
- **Mọi bảng trên** (và `ntf_push_sub` ở lượt 2) có đủ 4 cột dấu vết `created_at`/`updated_at` NOT NULL, `created_by`/`updated_by` `TEXT NULL` không khoá ngoại — bài kiểm "ADR-0003: bảng mới…" trong `src/architecture.test.ts` bắt buộc, kể cả bảng chỉ-thêm (tiền lệ `fbk_message`, `migrations/0016_feedback.sql`).
- Không `CHECK` liệt kê; không xoá cứng (luật dự án).

### 6.4 Route (mọi route khai `access`; ghi cần `Origin` cùng site)

| Route | Cổng | Kiểm trong thân |
|---|---|---|
| `GET /api/thong-bao?ngan=cua-toi\|tat-ca` | `staff` | lọc §4.2 + §5 |
| `GET /api/thong-bao/tom-tat` → `{ soChuaDoc, quanTrongChuaHieu[] }` (chuông + dải) | `staff` | cùng hàm lọc |
| `POST /api/thong-bao/da-doc` | `staff` | mốc của chính mình |
| `POST /api/thong-bao/:id/da-hieu` | `staff` | T phải thuộc nhóm nhận của tin, tin chưa thu hồi |
| `GET /api/thong-bao/da-gui`, `GET /api/thong-bao/:id/nguoi-da-hieu`, `POST /api/thong-bao`, `POST /api/thong-bao/:id/thu-hoi` | `admin` | `can(staff,"notice.send")` **trước mọi truy vấn** |

> **2026-09-27 (thi công Task 5):** hai đường ghi tự phục vụ ở trên thực ra là `POST /api/account/thong-bao/da-doc` và `POST /api/account/thong-bao/:id/da-hieu` (tiền tố `/api/account/*`) — hàng rào `src/route-write-guard.test.ts` chỉ nhận mục "ngoại lệ" dưới tiền tố đó. Cổng (`staff`), hành vi, quyền không đổi; chỉ đường dẫn khác chữ ở bảng trên (tài liệu mô tả, không phải quyết định mới).

### 6.5 Quyền

Thao tác mới `notice.send` = `row("none","none","none","none","none","any","none")` (Q1). Dòng mới trong `docs/SO-HANG-RAO.md` cho chốt chặn này, kèm ngày quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên).

### 6.6 Luật thuần và giao diện

- `src/shared/thong-bao.ts` (+ `.test.ts`): hàm lọc duy nhất (ngăn, nhãn, người làm, quan trọng), câu hiển thị, kiểm đầu vào tin thủ công, giờ yên lặng (lượt 2, giờ Việt Nam như `vnToday`).
- `web/thong-bao.ts` (hộp) và `web/gui-thong-bao.ts` (Toàn quyền) khai `PAGES` + `build:web`; chuông + dải trong `web/shell.ts`; tải lại số khi Bảng tin báo có thay đổi (không thêm loại sự kiện Bảng tin — ADR-0022 giữ). Dựng bằng `h()`, nội dung tin bằng `textContent`; CSS qua token; ô gõ 16px. **Làm đúng bản mẫu đã duyệt** (E1).
- Tài liệu mô tả cùng commit: `SYSTEM-DESIGN.md` (§5, §7, §8, §9), `CHANGE-GUIDE.md` (công thức "thêm loại tin về đơn" = thêm hành động vào view + bảng câu).

> **2026-09-27 (thi công Task 7):** hộp thông báo (chuông, hai ngăn, dải tin quan trọng) không có trang riêng `web/thong-bao.ts` — đúng bản mẫu, hộp là một NGĂN THẢ XUỐNG/TOÀN MÀN HÌNH dựng ngay trong khung app (`web/thong-bao-ui.ts`, gắn vào `web/shell.ts` qua `ganThongBao()`), không phải một trang có URL riêng. `web/gui-thong-bao.ts` (Toàn quyền) vẫn là trang riêng `/gui-thong-bao` như đã ghi.

## 7. Ca biên

- Thao tác đơn thất bại / bị chặn tranh chấp → không có dòng nhật ký → không có tin (tự nhiên).
- Đơn lập rồi bị huỷ: hai tin cùng hiện; bấm vào thấy trạng thái hiện tại.
- Người phụ trách là hồ sơ không có tài khoản: không có nhãn `nguoi:` (giống Bảng tin).
- Tài khoản đổi quyền: tin thủ công theo nhóm và tin nhãn `tat-ca` hiện/ẩn theo quyền mới ở lần tải tiếp; danh sách "chưa hiểu" của Toàn quyền tính theo nhóm hiện tại.
- Hai Toàn quyền thu hồi cùng lúc: lần hai 409 "Tin đã được thu hồi". Bấm "Đã hiểu" hai lần: lần hai không ghi thêm (PK), trả OK.
- Nội dung chứa `<script>`: hiện nguyên văn là chữ.
- Chế độ bảo trì: tài khoản bị chặn không gọi được API → không thấy gì.

## 8. Tiêu chí nghiệm thu lượt 1 (hành vi kiểm được)

1. Bán hàng A lập đơn → Kế toán B thấy "A vừa lập đơn mới DH-…" ở ngăn "Tất cả", **không** ở "Của tôi", số đỏ của B không tăng; A **không** thấy tin của chính mình. Bán hàng C (không lập, không phụ trách) thấy tin đó ở "Tất cả" **không có tên A** (phản hồi JSON không chứa tên A — K1).
2. Đối tác P lập đơn (chưa ai phụ trách) → Bán hàng S1, S2 (có `dispatch.claim`) thấy tin chờ nhận ở "Của tôi", số đỏ +1; Đối tác khác, Thực tập, HDV (hôm nay `dispatch.claim` = none) **không** thấy. S1 nhận đơn → S2 thấy tin chờ nhận **mờ, "đã có người nhận"**; Kế toán thấy "S1 vừa nhận đơn DH-…" ở ngăn "Tất cả"; **P không thấy** tin nào về đơn (ADR-0014 điều 12, §3).
3. Lô ghi đơn bị làm hỏng giữa chừng (test) → không có tin (không dòng nhật ký).
4. Toàn quyền gửi tin thường cho nhóm "Kế toán" → Kế toán thấy, Bán hàng không; tài khoản Bán hàng + Kế toán thấy. Gửi "Toàn công ty" → mọi tài khoản nội bộ (kể cả Thực tập) thấy; tài khoản **chỉ-Đối-tác không** thấy (K3).
5. Tin quan trọng → dải hiện ở mọi trang của người nhận; bấm "Đã hiểu" → dải tắt, `ntf_ack` có dòng, `audit_log` có `notice_acknowledged` không chứa nội dung; Toàn quyền thấy người đó ở cột "đã hiểu".
6. Quản trị (không Toàn quyền) gọi `POST /api/thong-bao` → 403, không có dòng mới; curl thiếu `Origin` → 403.
7. Thu hồi → tin biến khỏi hộp và dải của mọi người; nhật ký `notice_revoked`.
8. Số đỏ luôn bằng số tin chưa đọc ở ngăn "Của tôi" (test luật thuần cùng bộ dữ liệu; e2e so hai route).
9. Rút quyền văn phòng của B → tin `tat-ca` biến khỏi hộp B. Chuyển người phụ trách từ C sang D → D thấy tin cũ của đơn, C không còn.
10. Tin > 30 ngày không hiện, trừ tin quan trọng chưa "Đã hiểu".
11. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e` xanh; `audit-invariants --db local` đạt; kịch bản Chrome nhiều khổ màn (390, 768 dựng đứng, 1040, 1440) đối chiếu **từng khối** với bản mẫu đã duyệt, ảnh vào `docs/evidence/`.
12. Việc lớn (dữ liệu + quyền): báo cáo người kiểm độc lập chỉ đọc.

## 9. Lượt 2 — thông báo màn hình khoá (Web Push)

### 9.1 Cách hoạt động

- Trang Tài khoản có nút **"Bật thông báo trên màn hình khoá"** — chỉ cho **tài khoản nội bộ** (M4, K5: tài khoản có ít nhất một quyền khác `PARTNER` — gồm Thực tập). iPhone: chỉ hiện khi app đã **cài ra màn hình chính** (iOS 16.4+), nếu chưa thì hiện hướng dẫn cài. Xin quyền ngay trong cú chạm.
- Có tin mới thuộc ngăn **"Của tôi"** của người đó (M1) → máy chủ gửi **cú gõ cửa không nội dung**; service worker **tự hỏi** `GET /api/thong-bao/tom-tat` (cookie phiên cùng nguồn; lượt 2 thêm trường `moiNhat: { cau, lienKet }` vào phản hồi) rồi hiện câu của tin mới nhất. Hỏi không được (401, mất mạng) → **vẫn** hiện "Tour Đảo: bạn có thông báo mới" (iOS bắt buộc mỗi lần đẩy phải hiện; không thì Safari thu hồi quyền). Không nội dung nào đi qua máy chủ Apple/Google.
- **Giờ yên lặng 22:00–06:00 giờ Việt Nam** (M2): không gửi, trừ tin quan trọng. Tin vẫn vào hộp.
- Gửi **sau** khi lô ghi thành công (`ctx.waitUntil`; tin về đơn móc vào điểm phát `baoThayDoi` có sẵn ở gốc lắp ráp, tin thủ công sau `POST /api/thong-bao`). Được phép lỡ (N4, Hiến chương 5.16) — hộp vẫn giữ đủ.
- Máy chủ nhận 410 từ dịch vụ đẩy → đánh dấu địa chỉ hết hiệu lực; 404 chỉ ghi log.
- **Tự tắt (M3):** đăng xuất (trình duyệt huỷ đăng ký + gọi route huỷ trước khi xoá cookie), đổi PIN, đổi quyền/vai, ngưng tài khoản, đổi SĐT → đánh dấu mọi địa chỉ của tài khoản hết hiệu lực — đặt cùng chỗ đang gọi `dongBangTin`. Người dùng phải bấm bật lại.

### 9.2 Dữ liệu và bí mật

- `ntf_push_sub` — `id`, `staff_id`, `endpoint`, `thiet_bi` (chuỗi ngắn để người dùng nhận ra máy), `revoked_at NULL`, `revoke_reason NULL`, cộng đủ 4 cột dấu vết `created_at`/`updated_at`/`created_by`/`updated_by` (§6.3). Không lưu khoá mã hoá của máy (không gửi nội dung — tối thiểu dữ liệu). Không xoá cứng.
- Bí mật mới `VAPID_PRIVATE_KEY` — **chủ** đặt bằng `wrangler secret put` (CLAUDE.md §8); khoá công khai trong `vars`. Ký JWT ES256 bằng Web Crypto (chữ ký r‖s 64 byte dùng thẳng), không thư viện ngoài.
- Route: `POST /api/thong-bao/may` (đăng ký), `POST /api/thong-bao/may/huy` — cổng `staff`, chỉ cho chính mình, chỉ tài khoản nội bộ.

### 9.3 Kết quả tra cứu (2026-09-27, tài liệu chính thức; chưa thử máy thật)

- iOS 16.4+, app đã cài màn hình chính, xin quyền trong cú chạm; **không có đẩy im lặng** — mỗi lần đẩy phải `showNotification`, không thì bị thu hồi (webkit.org/blog/13878, webkit.org/blog/12945, developer.apple.com "Sending web push notifications in web apps and browsers").
- Thân rỗng được phép (Apple: payload rỗng thì bỏ `Content-Encoding`) — xác nhận gián tiếp, **chưa thử gửi thật**. `TTL` bắt buộc; `Authorization: vapid t=<JWT>, k=<khoá công khai>`; JWT `exp` ≤ 24 giờ, làm mới ≤ 1 lần/giờ.
- Mã Apple: 410 hết hạn; 404 đường dẫn sai; 403 xác thực; 429 quá nhiều.
- Cookie trong service worker: `fetch` cùng nguồn mặc định gửi cookie, `SameSite=Lax` không chặn — **iOS thật chưa có văn bản → phải thử iPhone thật**.
- Worker gói trả phí: 10.000 lần gọi ra ngoài/lượt; `waitUntil` sống 30 giây sau phản hồi, 6 kết nối chờ cùng lúc → ~30 máy nội bộ gửi thẳng được; ~1000 máy Đối tác cần hàng đợi (lý do M4).
- Bẫy triển khai: service worker mới chỉ tới máy sau khi nhân viên mở app một lần (như Turnstile).

### 9.4 Tiêu chí nghiệm thu lượt 2

1. Tài khoản nội bộ bật thông báo trên iPhone thật (đã cài) → Toàn quyền gửi tin cho nhóm của họ → màn hình khoá hiện đúng câu trong ≤ 1 phút.
2. Tin chỉ thuộc ngăn "Tất cả" → **không** rung.
3. 22:30 giờ VN: tin thường không rung, tin quan trọng rung (test luật thuần với giờ giả).
4. Đổi PIN / đổi quyền / ngưng / đăng xuất → địa chỉ có `revoked_at`, lần gửi sau không tới máy đó.
5. Phiên hết hạn → vẫn hiện "bạn có thông báo mới" (test service worker với 401).
6. Tài khoản chỉ-Đối-tác gọi route đăng ký → 403.
7. Khoá bí mật chỉ nằm trong `wrangler secret` / `.dev.vars`; `git grep` không thấy khoá.

## 10. Giả định (bề mặt, đảo được — chữ và vị trí cuối cùng chốt ở bản mẫu)

- Tên mục "Thông báo"; màn gửi "Gửi thông báo" (nhóm Quản trị, chỉ Toàn quyền thấy).
- Chuông ở thanh trên của khung; "9+"; tin mới trong lần mở tô nền khác.
- (Định nghĩa "nội bộ" đã chuyển thành quyết định K3/K5 ở §2 — không còn là giả định.)

## 11. Phụ thuộc và thứ tự

1. Chủ duyệt đặc tả + ADR-0034 (lượt 1) → 2. AI vẽ bản mẫu, chủ duyệt → 3. kế hoạch + thi công lượt 1 (người kiểm độc lập) → 4. chủ duyệt ADR-0036 → 5. thi công lượt 2 + thử iPhone thật → phát hành.
- Không phụ thuộc GĐ2 hay Đơn tự do; khi các việc đó thêm hành động nhật ký về đơn (vd HDV từ chối), muốn có tin thì thêm hành động vào view sự kiện đơn + bảng câu (ghi ở `CHANGE-GUIDE.md`).
- §4.3 chạm `dispatch/service.ts` — kiểm nhánh GĐ2/Đơn tự do trước khi thi công để tránh xung đột.

## 12. Trang ghép (CLAUDE.md §9)

**(1) Bảng/view chứa loại thực thể nào**

| Bảng / view | Chứa |
|---|---|
| `audit_log` (đọc qua view sự kiện đơn) | dòng nhật ký về đơn — **nguồn** của tin về đơn; không đổi bảng, chỉ thêm view + hành động `order_claimed` |
| `v_ord_order_owner` (mới) | người lập của đơn |
| `ntf_notice` | tin thủ công (thường / quan trọng) |
| `ntf_notice_target` | nhóm nhận của tin thủ công: `noi-bo`, `quyen:<MÃ>` |
| `ntf_ack` | ai đã bấm "Đã hiểu" tin quan trọng nào, lúc nào |
| `ntf_read_mark` | mốc đã đọc mỗi tài khoản |
| (lượt 2) `ntf_push_sub` | địa chỉ nhận thông báo của từng máy, theo tài khoản nội bộ |

**(2) Dòng bản đồ quyền chạm các bảng này, áp cho loại nào**

| Ô quyền | Áp cho | Dùng ở |
|---|---|---|
| `notice.send` (mới; chỉ `SUPER_ADMIN`) | ghi/thu hồi `ntf_notice`, `ntf_notice_target`; đọc đã gửi + `ntf_ack` của mọi người | 4 route cổng `admin` |
| `order.view` (không ngữ cảnh) | tin về đơn nhãn `tat-ca` (ngăn "Tất cả") — qua `nhanKetNoi` | đọc hộp |
| `dispatch.claim` | tin chờ nhận — qua `nhanKetNoi` + hàm điều kiện tách từ `thongBaoNoi` | đọc hộp |
| `isOffice` / `FIELD` | điều kiện chung của tin về đơn (Đối tác/Thực tập không thấy) | đọc hộp |
| `order.history.view` (ngữ cảnh đơn: người lập, người xem có đang phụ trách) | **tên người làm** trong tin về đơn — sai thì câu không tên (K1) | đọc hộp (máy chủ dựng câu) |
| mã quyền đang có | tin thủ công nhắm `quyen:<MÃ>`; quyền "Đã hiểu" | đọc hộp, `POST …/da-hieu` |
| (không ô; chính mình) | `ntf_read_mark`, `ntf_ack` của mình, (lượt 2) `ntf_push_sub` của mình — id lấy từ phiên | `staff` |
| (không ô) | tin về đơn **không có đường ghi riêng** — chỉ sinh từ nhật ký của thao tác đơn đã qua kiểm quyền của chính nó | — |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Kiểm trong thân |
|---|---|---|
| đọc hộp, tóm tắt, đã đọc, đã hiểu | `staff` | hàm lọc duy nhất theo quyền hiện tại; đã hiểu: phải thuộc nhóm nhận |
| gửi, thu hồi, đã gửi, người đã hiểu | `admin` | `can(staff,"notice.send")` trước mọi truy vấn |
| nhật ký chung `GET /api/audit` (có sẵn) — nay chứa thêm `notice_sent/revoked/acknowledged` | `admin` | `can(staff,"admin.manage")` (Quản trị + Toàn quyền) — chủ chấp nhận (K2); không chứa nội dung tin |
| (lượt 2) đăng ký/huỷ máy | `staff` | chỉ chính mình, chỉ tài khoản nội bộ |
