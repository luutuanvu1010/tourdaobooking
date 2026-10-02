# Kế hoạch thi công — Đợt 1 khắc phục kiểm toán: đơn huỷ và cọc (ADR-0089)

- **Ngày:** 2026-10-02 · **Vai:** lập kế hoạch (P15). Không thi công, không sửa mã. Người thi công làm ở phiên khác. Người kiểm độc lập chỉ đọc, ở phiên khác nữa (N8).
- **Nguồn chuẩn tắc (accepted, không hỏi lại):**
  - `docs/adr/ADR-0089-don-huy-coc-mac-dinh-giu-hoan-tuy-chon.md`: đ1–đ16, X-1…X-4. X-4 chủ đã chọn: Toàn quyền ghi, Quản trị xác nhận. X-1…X-3 áp theo khuyến nghị.
  - Trang ghép: `docs/superpowers/specs/2026-10-02-luot-duyet-1-don-huy-va-quyen-tien.md:271-334`.
  - Hai ADR đi cùng (accepted): ADR-0094 (lớp chống ghi trùng), ADR-0090 (quyền tiền chỉ Toàn quyền).
  - Hiến chương `docs/ARCHITECTURE.md`: 4.2, 4.4, 5.1, 5.4, 5.9, 5.14, 5.17.
- **Mốc đo mã:** mọi `tệp:dòng` dưới đây đo trên `fc268abe`, tức nhánh `ke-hoach-khac-phuc-audit` = `main` lúc lập kế hoạch. **Task 0 đo lại sau khi Đợt 0 gộp `main`**, vì Đợt 0 sửa `src/shared/router.ts`, `web/api.ts`, `src/shared/permissions.ts`, `src/shared/roles.ts`.
- **Loại việc:** việc lớn (tiền, dữ liệu, quyền). Có một chỗ là cửa một chiều về dữ liệu: khoản duyệt, lần chi và dòng hoàn ngoài là dữ liệu chỉ-thêm. Mỗi phần A/B/C xong phải qua người kiểm độc lập chỉ đọc, rồi phần sau mới được dựa vào.
- **Xây trên lỗ đang hở: F-02** (`docs/quyen-hoan.json:51-58`, hạn 15/10). Mọi lệnh ghi **mới** của Đợt 1 đi qua lớp chống ghi trùng ADR-0094 (Đợt 0). Vì vậy **Task 0 là cổng: Đợt 0 phải đã gộp `main`.**
- **Ký hiệu:**
  - `NT-x`: tiêu chí nghiệm thu;
  - `SV-DH-x`: ca sổ vàng;
  - `Qx`: câu hỏi chủ (§7);
  - `GĐ`: giả định bề mặt, đảo được, ghi lại để chủ xem.
- **Cột "Kiểm bằng":**
  - U: `npm test`;
  - E: `npm run test:e2e`;
  - A: `audit-invariants`;
  - C: kịch bản Chrome;
  - T: `npm run typecheck`;
  - G: sổ vàng LỚP 2.

---

## 0. Thứ tự với Đợt 0 (bắt buộc)

| Bước | Việc | Ai | Điều kiện để Đợt 1 dùng |
|---|---|---|---|
| Đợt 0a | ADR-0094: module `lan-gui`, bảng `lg_lan_gui` + `lg_chinh_sach_giu`, router tự gắn vé cho mọi route ghi có đăng nhập, `web/api.ts` tự gửi vé | phiên khác | **Đã gộp `main`**. Bài H7 (route trả 201 phải có `Location`) đã chạy. Router **từ chối** lệnh ghi khi thiếu phần tiêm `lanGui` (ADR-0094 đ2) |
| Đợt 0b | ADR-0090: hàm "tài khoản có quyền tiền" (một hàm, suy từ bảng quyền); ba cửa đặt lại PIN, gán quyền tiền, tạo tài khoản quyền tiền chỉ còn Toàn quyền | phiên khác | **Đã gộp `main`**. Lý do: ADR-0089 tách người duyệt (Quản trị) và người chi (Kế toán), nên cần chặn Quản trị tự cấp quyền Kế toán cho mình (trang ghép §4 "Va chạm") |
| **Đợt 1** | Kế hoạch này | phiên khác | Bắt đầu Task 1 khi cả hai dòng trên đã gộp. **Ngoại lệ:** Phần A **có thể** bắt đầu trước Đợt 0a, vì Phần A không thêm lệnh ghi mới, chỉ đổi thân lệnh huỷ đang có (xem §6, phương án "cầm máu") |

- **Hệ quả của lớp ADR-0094 lên mọi route mới** (cột "ADR-0094" ở bảng route §3.4):
  - **(V1) Một lô ghi mỗi lệnh.** Mỗi lệnh ghi đúng **một** `db.batch`, vì router chỉ nối vé vào **lô ghi đầu tiên** (ADR-0094 đ2–đ3). Lệnh "Chuyển tiền sang đơn mới" ghi trên **hai đơn trong một lô**. Lệnh nào buộc phải ghi hai lô thì thành **nợ có tên** (đ3, H5), và phải báo điều phối trước khi viết.
  - **(V2) `Location` cho 201.** Route trả 201 gửi header `Location` trỏ trang đơn `/order?id=<id>`. Hiện `json()` có tham số `headers` (`src/shared/http.ts:6`). Khuôn: ADR-0094 A-10, bài H7.
  - **(V3) e2e gửi lặp.** Mỗi lệnh mới có ca e2e "gửi lại cùng vé → không ghi lần hai, nhận `Idempotent-Replayed: true`", cùng khuôn KT03 (`~/Documents/danh-gia-ux/2026-10-01/kich-ban/vai-kt.mjs`). Năm lệnh cần ca này: duyệt, huỷ duyệt, chi hoàn, chuyển tiền, ghi + xác nhận "đã hoàn ngoài hệ thống"; thêm phân loại lý do.

---

## 1. Tiêu chí nghiệm thu (viết trước — hành vi kiểm được)

### 1.1 Số tiền đơn huỷ (đ1–đ3, đ14)

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-1 | Đơn **huỷ** (mọi nhóm) có `GET /api/orders/:id/payments`, `POST /api/ledger/balances`, biên nhận trả `conLai = 0`, `du = 0` (đ1: "chờ hoàn" mặc định 0). Chạy lại kịch bản `kiem-lai-09.mjs`: đơn 200.000, cọc 50.000, huỷ → `conLai` 0, **không** còn 150.000 | U + E |
| NT-2 | Định nghĩa **một nơi** (`billing/rules.ts`):<br>• **Đã trả** = Σ lần thu `CUSTOMER_PAYMENT` còn hiệu lực **đã xác nhận**. "Công ty thu – CK" còn dòng giữ hộ chưa đảo **không** tính (đ2).<br>• **Đang đối chiếu** = phần chưa xác nhận đó.<br>• **Còn giữ** = đã trả − đã hoàn − đã chuyển − hoàn ngoài đã xác nhận.<br>• **Chờ chi** = đã duyệt − đã chi − đã chuyển. | U + G |
| NT-3 | Bài đối chiếu hai nơi (khuôn NT-R9): trên cùng dữ liệu mẫu, hàm TS và câu SQL của trigger/view `v_bil_coc_don` cho **cùng** đã trả, đã duyệt, đã chi, đã chuyển | U |
| NT-4 | NT-R9 còn xanh: chỉ `billing/rules.ts` tính đã thu, còn lại, dư, còn giữ. `orders/hoan-tat.ts` vẫn **không** đọc `bil_` (`hoan-tat.ts:1-3`; bài `src/architecture.test.ts:722-724`) | U |
| NT-5 | `src/modules/receipt/index.ts:31` hết dự phòng `conLai: order.total`. Thiếu số tiền thì 503 kèm câu tiếng Việt, **không đoán** | U + E |

### 1.2 Lý do huỷ (đ8, X-2)

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-L1 | `POST /api/orders/:id/status` với `to: "cancelled"` mà thiếu `lyDo` → 400 câu tiếng Việt. "Khác" mà thiếu ghi chú → 400. Ghi chú có dãy số giống SĐT → 400 (`hasLongDigitRun`, khuôn `dispatch/rules.ts:85-97`) | U + E |
| NT-L2 | Nhóm "Công ty huỷ": Bán hàng, Đối tác, Thực tập, Kế toán, HDV → **403**. Quản trị, Toàn quyền → được (Đ-2) | E |
| NT-L3 | Mỗi đơn huỷ có **đúng một** dòng lý do đang hiệu lực (nhóm, mã lý do, ngày huỷ VN). Trigger chặn `UPDATE orders SET status='cancelled'` khi thiếu dòng lý do của đơn. SQL chạy tay cũng bị chặn | U |
| NT-L4 | `handler-cancel` của HDV (`dispatch/index.ts:217-240`) cũng ghi dòng lý do. Ánh xạ nhóm: "Khách yêu cầu huỷ" → khách huỷ; "Khác" → chưa kết luận; "Không liên hệ được với khách" → **theo Q1** | U + E |
| NT-L5 | Đơn "chưa kết luận": duyệt hoàn / duyệt chuyển → **409**, máy chủ và trigger (X-2). Nút "Duyệt hoàn cọc" ẩn. Quản trị/Toàn quyền phân loại (lý do bắt buộc, có nhật ký) → duyệt được | U + E + C |
| NT-L6 | Phân loại **chỉ đi từ** "chưa kết luận" sang một nhóm khác. Đổi nhóm đã kết luận → 409 (GĐ theo chữ ADR "phân loại lý do 'chưa kết luận'") | E |
| NT-L7 | Migration gieo dòng lý do cho **mọi** đơn huỷ cũ:<br>• nhóm "chưa kết luận";<br>• ngày huỷ = ngày VN của dòng `audit_log` `cancelled` / `order_cancelled_by_field` mới nhất, không có thì từ `orders.updated_at`;<br>• `created_by = 'he-thong'`, cờ `legacy = 1`.<br>Số dòng gieo = số đơn `cancelled`. Mọi giá trị cột của `orders` không đổi | U (migration) |

### 1.3 Duyệt, chi, chuyển (đ4, đ6, đ7, X-1)

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-H1 | Duyệt hoàn: Quản trị, Toàn quyền → 201 kèm `Location`. Kế toán, Bán hàng, HDV, Đối tác → 403. Lý do bắt buộc. Duyệt được **nhiều lần, một phần** | E |
| NT-H2 | Tổng duyệt (hoàn + chuyển + hoàn ngoài đã xác nhận) > đã trả → 409. Kiểm ở **máy chủ** và ở **trigger**. Ca đua: hai Quản trị cùng duyệt phần cuối → đúng một thắng | U + E |
| NT-H3 | Chi hoàn: Kế toán, Toàn quyền, cần khoản duyệt còn số. Chi vượt phần duyệt còn lại → 409. **Người chi = người duyệt** → 409 ở bước chi (tài khoản kiêm Quản trị + Kế toán cũng bị). Có ở máy chủ và trigger | U + E |
| NT-H4 | Chi hoàn mà người trả không phải công ty → số chi ≤ số người đó đang giữ trên đơn (đ4b) → quá thì 409 | E |
| NT-H5 | `POST /api/ledger/refunds` (trả dư tự do, `billing/service.ts:400-449`) trên **đơn huỷ** → 409 "Đơn huỷ: hoàn qua Duyệt hoàn cọc rồi Ghi chi hoàn". Trigger cũng chặn `CUSTOMER_REFUND` không có `approval_id` trên đơn huỷ (đọc `v_ord_order_state`). Đơn **không** huỷ: trả dư như cũ (NT-S5 của lượt 1 vẫn xanh) | U + E |
| NT-H6 | Huỷ duyệt: chỉ huỷ **phần chưa chi**, lý do bắt buộc, mỗi khoản duyệt một lần. Huỷ quá phần chưa chi → 409 | U + E |
| NT-H7 | Duyệt chuyển: cùng ô duyệt hoàn (X-1), kèm mã đơn nhận. Đơn nhận phải chưa huỷ, chưa "Đã giao", khác đơn huỷ. Sai thì 409 | E |
| NT-H8 | Chuyển tiền: Kế toán, Toàn quyền (`ledger.write`), cần khoản duyệt chuyển còn số, **người chuyển ≠ người duyệt**. **Một lô** ghi: chi khỏi đơn huỷ (`CUSTOMER_REFUND` gắn khoản duyệt) + thu vào đơn mới (`CUSTOMER_PAYMENT` gắn cặp), cùng số, cùng người đang giữ. Nhật ký trên **cả hai đơn**. Chuyển hết → còn giữ đơn huỷ = 0, đã trả đơn mới tăng đúng số | U + E |
| NT-H9 | Chuyển khi tiền ở HDV X: số dư X trên đơn huỷ giảm, trên đơn mới tăng, **tổng X không đổi** (`soDuTheoBen`, `rules.ts:130-138`) | U + G |
| NT-H10 | Lần thu lên **đơn đã huỷ**: Kế toán, Toàn quyền → 201. Bán hàng, HDV, Đối tác, Quản trị → 403 (đ13; G1 tình huống 09: hôm nay 201) | E |

### 1.4 Hạn 60 ngày (đ5)

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-D1 | Hạn = ngày khởi hành muộn nhất của đơn + 60 ngày. Đơn nháp huỷ chưa có ngày đi → ngày huỷ + 60. Một hàm thuần (`billing/rules.ts`) và **cùng** biểu thức trong trigger. Bài đối chiếu hai nơi | U |
| NT-D2 | **Khách huỷ**, ngày duyệt (VN) > hạn → **409** "Đã quá hạn hoàn cọc (hạn: dd/mm/yyyy)". Ngày duyệt = hạn → được (biên) | U + E + G |
| NT-D3 | **Ca ngược, đều qua được sau hạn:** công ty huỷ; huỷ để lập lại / trùng đơn; dòng hoàn ngoài (đ16). Mỗi ca có test riêng | U + E + G |
| NT-D4 | Khoản **đã duyệt trước hạn** chi được sau hạn | E + G |
| NT-D5 | Nhắc (không đẩy tin):<br>• khoản duyệt chưa chi quá 7 ngày (mọi nhóm);<br>• còn ≤ 10 ngày tới hạn (chỉ khách huỷ, còn giữ > 0).<br>Có ở route danh sách và ô đếm | U + E |

### 1.5 Đã hoàn ngoài hệ thống (đ16, X-3, X-4)

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-N1 | `GET` danh sách đối chiếu: đơn huỷ **cũ** (dòng lý do `legacy = 1`) còn giữ > 0. Chỉ `ledger.view` `any` (Kế toán, Toàn quyền). Người khác → 403 | E |
| NT-N2 | Ghi "đã hoàn ngoài hệ thống":<br>• chỉ Toàn quyền; Quản trị, Kế toán → 403;<br>• lý do bắt buộc; số ≤ còn giữ;<br>• chỉ đơn có dòng lý do `legacy = 1` (X-3) → đơn huỷ sau phát hành nhận 409;<br>• **không** bị hạn chặn | U + E |
| NT-N3 | Mỗi đơn **một lần** (chỉ mục duy nhất ở CSDL + máy chủ). Lần hai → 409. Ý nghĩa "một lần" khi Quản trị không xác nhận: **Q2** | U + E |
| NT-N4 | Xác nhận: Quản trị, Toàn quyền. **Người xác nhận = người ghi** → 409. Chưa xác nhận: **không** tính vào duyệt hay chi, còn giữ không đổi. Đã xác nhận: tính **cả** là duyệt lẫn chi, còn giữ giảm đúng số. **Không** đụng số dư người giữ tiền | U + E + G |

### 1.6 Bất biến đ15 — đúng MỌI LÚC

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-B1 | Trên mỗi đơn huỷ: **Σ chi + Σ chuyển ≤ Σ duyệt ≤ đã trả**. Hai vế đều tính cả hoàn ngoài đã xác nhận (X-4) | U + A |
| NT-B2 | **Đảo lần thu** (`ghiDieuChinh` loại `dao_lan_thu`, `billing/service.ts:462-484`) làm đã trả < tổng duyệt → trigger `RAISE` → 409 "Đơn đã duyệt hoàn X — huỷ duyệt phần chưa chi trước khi đảo". Có ca riêng | U + E + G |
| NT-B3 | Lệnh "Thay lần thu" (ADR-0088, **chưa có mã**) sẽ đi qua cùng trigger lần thu. Bài trigger ghi một ca **giả lập** "đảo + thu mới nhỏ hơn trong một lô" để khoá trước | U |
| NT-B4 | `audit-invariants` có kiểm mới:<br>• **R-BIL-C0** (đơn huỷ có "còn lại" > 0 ở hình chiếu — lõi TNV-G1, H-C8);<br>• **R-BIL-C1** (đ15);<br>• **R-BIL-C2** (`CUSTOMER_REFUND` trên đơn huỷ không gắn khoản duyệt, ghi sau phát hành);<br>• **R-BIL-C3** (người chi/chuyển/xác nhận trùng người duyệt/ghi);<br>• **R-BIL-C4** (hai dòng hoàn ngoài có hiệu lực một đơn);<br>• **R-BIL-C5** (cặp chuyển lệch số / lệch người giữ / thiếu nửa);<br>• **R-BIL-C6** (khoản duyệt khách huỷ ghi sau hạn);<br>• **R-ORD-H1** (đơn huỷ thiếu dòng lý do).<br>Cố ý chèn vi phạm trên D1 local → thoát 1 | A + U |

### 1.7 Hiển thị (đ3, đ9, đ10)

| Mã | Hành vi | Kiểm bằng |
|---|---|---|
| NT-V1 | Nhãn tiền, **một hàm thuần** `src/shared/nhan-tien.ts`:<br>• đơn chưa "Đã giao" → "Khách hàng đã trả trước";<br>• sau "Đã giao" → "Đã thu";<br>• đơn khách huỷ trong hạn → "Cọc giữ lại – khách huỷ" + "còn có thể hoàn tới dd/mm/yyyy";<br>• quá hạn → "Cọc giữ lại".<br>Áp ở trang đơn (`web/order.ts:420-421, 437-439`), Việc của tôi (`web/viec-cua-toi.ts:534-536`), ảnh gửi khách (`src/shared/order-confirmation.ts:219-220`). Không còn "CÒN LẠI" trên đơn huỷ | U + C |
| NT-V2 | Ảnh gửi khách của đơn huỷ (đ9a):<br>• tiêu đề "THÔNG BÁO HUỶ ĐƠN DỊCH VỤ", không dòng "Còn lại", có "Khách hàng đã trả trước X";<br>• khách huỷ thêm câu chính sách;<br>• "chưa kết luận" dùng câu trung tính;<br>• đã duyệt: "Tour Đảo hoàn Y" (khách huỷ thêm "chậm nhất ngày dd/mm/yyyy");<br>• đã chi: "Đã hoàn Y";<br>• chưa xác nhận: "đang đối chiếu".<br>`ReceiptDto` thêm trường theo **danh sách trắng**. Bài số lạ 480.017 (NT-B1 lượt 1) vẫn xanh | U + C |
| NT-V3 | Ảnh xác nhận (đơn **không** huỷ) có một dòng điều khoản huỷ kèm đường dẫn in luôn `tourdao.vn/chinh-sach-thanh-toan` (đ10). Chữ là bản nháp theo ví dụ của ADR; chủ chốt chữ qua ảnh chụp (Q5) | U + C |
| NT-V4 | Trang đơn huỷ: nút "Duyệt hoàn cọc", "Phân loại lý do", "Xác nhận đã hoàn ngoài", "Ghi chi hoàn", "Chuyển tiền sang đơn mới", "Ghi đã hoàn ngoài hệ thống" hiện **theo cờ máy chủ**. Cờ tính bằng `can()` của đúng ô (`web/CLAUDE.md:18`, bài `src/giao-dien-hoi-bang-quyen.test.ts`). Tên người giữ tiền chỉ hiện cho `ledger.view any`. Đối tác (`money.view own`) thấy trạng thái cọc, **không** thấy tên người giữ, không thấy nút | E + C |
| NT-V5 | Hộp "Huỷ đơn" bắt chọn lý do. Lựa chọn nhóm "Công ty huỷ" chỉ hiện khi `can(staff, "order.cancel.classify")` (trang ghép §3 "Màn huỷ đơn" đổi nghĩa) | C |
| NT-V6 | Ô đếm Trang chủ (chỉ `ledger.view any`), từ `GET /api/ledger/coc/dem`:<br>• số khoản cần chi hoàn;<br>• số khoản duyệt quá 7 ngày chưa chi;<br>• số đơn khách huỷ còn ≤ 10 ngày tới hạn;<br>• số đơn huỷ còn người giữ tiền (đ11).<br>Người khác không thấy ô, route trả 403 | E + C |
| NT-V7 | Tin "Đã duyệt hoàn cọc" vào hộp tin của Kế toán (ADR-0034 đ1 hình chiếu nhật ký). **Không** đẩy màn hình khoá (ADR-0045). Nhắc hạn **không** thành tin | U + E |

### 1.8 Sổ vàng (Hiến chương 5.17) — tệp `golden/don-huy-coc.json`

- **Khuôn:** chuỗi sự kiện theo `golden/so-cong-no-luot-1.json` (`golden/README.md`).
- **Đáp án đúng tới từng đồng:** đã trả, đang đối chiếu, còn lại (= 0), chờ hoàn mặc định (= 0), đã duyệt, đã chi, đã chuyển, còn giữ, chờ chi, hạn, nhãn hiện, số dư từng bên, mã lỗi ở bước bị chặn.
- **Trạng thái:** mọi ca `cho_xac_nhan`, **Kế toán / chủ xác nhận** (AI không xác nhận — N8). Mã tiền chỉ phát hành khi 100% ca đã xác nhận đi qua LỚP 2 của `src/so-vang.test.ts`.

| Ca | Chuỗi sự kiện (tiền VNĐ) | Đáp án then chốt |
|---|---|---|
| SV-DH-01 khách huỷ giữ cọc | Đơn 2.000.000, đi 10/11. Kế toán thu 500.000 (Công ty). Bán hàng huỷ, lý do "Khách đổi ý" | còn lại 0; chờ hoàn 0; còn giữ 500.000; hạn 09/01; nhãn "Cọc giữ lại – khách huỷ … tới 09/01/2027" |
| SV-DH-02 hoàn một phần | SV-DH-01 → Quản trị duyệt hoàn 200.000 → Kế toán chi 200.000 (Công ty, chuyển khoản) → Kế toán chi thêm 1 | đã duyệt 200.000; đã chi 200.000; còn giữ 300.000; bước cuối 409 |
| SV-DH-03 quá hạn (chỉ khách huỷ) | SV-DH-01. Duyệt 100.000 ngày 09/01 → được. Duyệt 100.000 ngày 10/01 → 409. Khoản 09/01 chi ngày 15/01 → được | 409 "Đã quá hạn hoàn cọc (hạn: 09/01/2027)"; còn giữ 400.000 |
| SV-DH-04 công ty huỷ, hoàn toàn bộ | Như 01 nhưng Quản trị huỷ, lý do "Thời tiết / cấm biển". Ngày 20/01 (sau hạn) duyệt 500.000 → Kế toán chi. Bán hàng chọn "Công ty huỷ" → 403 | duyệt được sau hạn; còn giữ 0; nhãn không có "Cọc giữ lại" |
| SV-DH-05 công ty huỷ, dời lịch | HDV X thu 500.000 tiền mặt (X giữ). Quản trị huỷ (công ty huỷ), duyệt chuyển 500.000 sang đơn B. Kế toán chuyển (người giữ X) | A: đã chuyển 500.000, còn giữ 0. B: đã trả 500.000. X giữ trên A 0, trên B 500.000, tổng 500.000 |
| SV-DH-06 huỷ để lập lại, chuyển tiền | Thu 300.000. Huỷ "Sai thông tin — lập lại đơn". Ngày sau hạn: duyệt chuyển 300.000 sang C, Kế toán chuyển | được (không bị hạn chặn); A còn giữ 0; C đã trả 300.000 |
| SV-DH-07 đ16 hai bước | Đơn huỷ **cũ** (gieo) còn giữ 300.000. Toàn quyền ghi hoàn ngoài 300.000 → chưa tính. Toàn quyền tự xác nhận → 409. Quản trị xác nhận → tính. Ghi lần hai → 409 | trước xác nhận: còn giữ 300.000; sau: duyệt = chi = 300.000, còn giữ 0 |
| SV-DH-08 bất biến mọi lúc | Thu 500.000, huỷ (khách), duyệt 400.000. Đảo lần thu 500.000 → 409. Huỷ duyệt 400.000 rồi đảo → được | đã trả không bao giờ < tổng duyệt |
| SV-DH-09 tách người | Tài khoản kiêm Quản trị + Kế toán duyệt 100.000 → được; chính tài khoản đó chi → 409; Kế toán khác chi → được | 409 ở bước 2 |
| SV-DH-10 khoản chưa xác nhận | HDV khai "Công ty thu – CK" 300.000. Huỷ (khách). Duyệt 1 → 409. Kế toán "Công ty đã nhận" → duyệt 300.000 được | trước: đã trả 0, đang đối chiếu 300.000; ảnh gửi khách ghi "đang đối chiếu" |
| SV-DH-11 chưa kết luận | Huỷ lý do "Khác" + ghi chú → duyệt → 409. Quản trị phân loại "khách huỷ" → duyệt được | X-2 |
| SV-DH-12 nháp không ngày đi | Đơn nháp không ngày đi, thu 200.000, huỷ 05/10 | hạn 04/12 (ngày huỷ + 60) |
| SV-DH-13 **chờ Q3** | Đơn 1.000.000, khách trả 1.200.000, Kế toán hoàn dư 200.000, rồi huỷ (khách). Duyệt 1.200.000? | theo chữ đ15 ("duyệt ≤ đã trả" = 1.200.000) hay cách chặt ("duyệt ≤ còn giữ" = 1.000.000) — **chủ chọn**; ca để `cho_xac_nhan` tới khi có câu trả lời |

---

## 2. Hiện trạng mã (đo trên `fc268abe`)

| Điều ADR nói | Mã hôm nay | Hệ quả |
|---|---|---|
| Gốc G1: "phải thu" không xét huỷ | `phaiThuCua` (`src/modules/orders/hoan-tat.ts:9-18`) và `phaiThuNhieuDon` (`:64-68`) trả `total` cho cả đơn huỷ. `conLai` (`src/modules/billing/rules.ts:65-74`) tính `conLai = phaiThu − daThu` | Giữ `phaiThuCua` nguyên (đ14). `conLai` nhận trạng thái đơn qua `PhaiThuDon.status`, đã có ở `hoan-tat.ts:57` → **không** cần `orders` đổi hợp đồng |
| đ2 "đã trả" chỉ gồm đã xác nhận | `conLai` cộng **mọi** lần thu còn hiệu lực. "Chờ xác nhận" tính riêng ở `billing/service.ts:171-172` (lần thu vai `COMPANY` còn dòng `HELD` chưa đảo) | Hàm mới dùng **đúng** điều kiện `:171-172`, đưa vào `rules.ts` thành một hàm. Đơn không huỷ giữ nguyên `daThu` cũ (đổi `daThu` của đơn không huỷ = đổi luật Đã giao, **ngoài phạm vi**) |
| Ba chỗ SQL cộng tiền theo dấu | `0045` view `v_bil_order_paid` (`:147`), trigger `bil_payment_receipt_refund_within_paid` (`:212-216`), `bil_posting_delivered_paid` (`:234`), đều theo `CASE kind='CUSTOMER_REFUND' THEN -amount ELSE amount` | **Không thêm loại lần thu mới.** Chuyển = `CUSTOMER_REFUND` (đơn huỷ) + `CUSTOMER_PAYMENT` (đơn mới). Ba chỗ trên giữ đúng, không phải dựng lại |
| Đường làm "đã trả" tụt / chi tăng | (1) `dao_lan_thu` `billing/service.ts:462-484`; (2) `ghiHoanKhach` `:400-449` (hoàn tự do ≤ đã thu, không xét huỷ); (3) "Thay lần thu" ADR-0088 (chưa có); (4) `dao_dong` `:485-503` đảo dòng `HELD` của "Công ty thu – CK" (làm lần thu thành "đã xác nhận", chỉ **tăng** đã trả, an toàn); (5) `xacNhanCongTyNhan` `:331` (tăng, an toàn) | Ca đỏ cho (1), (2), (3 giả lập). (4), (5) ghi rõ là đường tăng, có ca xanh |
| Đường huỷ đơn | **Một** câu ghi: `cancelOrder` (`src/modules/orders/repository.ts:1016-1023`). Hai nơi gọi: `/status` (`orders/index.ts:979-1027`, gọi `:993`) và `cancelOrderByHandler` (`orders/index.ts:401-403`) ← `handler-cancel` (`dispatch/index.ts:217-240`). Đã grep `'cancelled'` toàn `src/` + `migrations/`: không còn đường ghi thứ ba | Đổi `cancelOrder` thành nhận dòng lý do. **Đổi hợp đồng orders↔dispatch** (`cancelOrderByHandler` thêm tham số nhóm/mã): test đỏ trước, cùng commit |
| Lý do huỷ | Route `/status` **không đọc lý do** (`orders/index.ts:982-994`). Danh sách ADR-0030 (`docs/adr/ADR-0030…:114`) chưa có mã. HDV: `CANCEL_REASONS` (`dispatch/rules.ts:71-75`), lý do chỉ vào `audit_log.detail` (`orders/index.ts:402`) | Lý do phải **lưu** (nhóm quyết định hạn, X-2) → bảng mới `ord_cancel_reason` (Phần A) |
| SQL `ord_*` mới | `src/CLAUDE.md`: SQL mới của `orders` chỉ ở tệp nửa nghiêm. `NUA_NGHIEM` (`src/architecture.test.ts:138-146`) có tiền lệ siết thêm tệp (`:140`, `:142`) | Tệp mới `src/modules/orders/huy-don-repo.ts`, thêm vào `NUA_NGHIEM` (siết, Điều 9.4 cho phép) |
| Nút "Ghi hoàn" | `web/order.ts:567` chỉ hiện khi `t.du > 0`; hộp `hangXacNhan` ở `:486` | Đơn huỷ dùng nút mới (§3.5). Đơn không huỷ giữ nút cũ |
| Biên nhận | `dungBienNhan` (`src/modules/receipt/rules.ts:6-35`) nhận `{ daTra, conLai }`. `soTienBienNhan` (`billing/index.ts:227-230`). Dự phòng `conLai: order.total` (`receipt/index.ts:31`). Ảnh: `summaryBlock` (`src/shared/order-confirmation.ts:211-223`), `titleBlock` tiêu đề cố định "XÁC NHẬN ĐƠN DỊCH VỤ" (`:177`) | Thêm khối `huy` vào `ReceiptDto` (`src/shared/contracts.ts:1653`) theo danh sách trắng. Đơn huỷ dùng mẫu thông báo huỷ |
| Ô quyền | `payment.refund` `permissions.ts:105`; `ledger.view` `:112`; `ledger.write` `:114`; `payment.receive` `:103`. Hàng có **10 cột** (gồm `HR`, `:74`). Tên lời thường `TEN_THAO_TAC` (`src/shared/tro-ly-cau-truc-ten.ts:66`), thiếu thì `tsc` đỏ | Thêm 3 ô (§3.3). Thêm **ô**, không thêm **mã quyền** ⇒ bài "mọi tập con quyền" **không** nhân đôi (1.024 tập giữ nguyên). Chỉ thêm dòng ghim |
| Tin | `HANH_DONG_TIN_DON` (`src/shared/thong-bao.ts:7`). View `v_aud_order_event` lọc hành động ngay trong SQL (`migrations/0025_thong_bao.sql:53-56`) | Thêm hành động nguồn = sửa hằng **và** dựng lại view trong migration mới (DROP VIEW / CREATE VIEW). Kiểm người nhận theo ADR-0034 đ4 lúc thi công (Task 11) |
| Ô "Còn thiếu tiền" | `GET /api/ledger/unpaid-summary` (`billing/index.ts:159-173`) chỉ đơn `confirmed` chưa Đã giao (`donDangThuTien`, `hoan-tat.ts:71-73`) | Không đổi (trang ghép §3 dòng cuối) |
| Hạn dừng dây chuyền | `TNV-G1` `docs/quyen-hoan.json:69-76`, hạn 2026-10-15; bài hạn `src/phat-hien-han.test.ts` | §6 |

---

## 3. Thiết kế chốt ở kế hoạch (tên thi công — đổi được trước khi migration áp remote)

### 3.1 Migration A — `orders`: lý do huỷ (số: **dự kiến, chốt theo lộ trình §1** — lấy số kế tiếp lúc gộp thật; có thể trước Đợt 0 nếu "cầm máu" lên trước)

- **Số migration:**
  - `main` tới `0069` (`ls migrations`).
  - Nhánh chưa gộp đã giữ số:
    - `0070` (`worktree-agent-a169271206f91c9c4`, Tin báo chuyến);
    - `0071` (Lịch xe bận, đã cấp — `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-03-khung-ban-gio-lai.md:24`);
    - `0072`, `0073` (`worktree-agent-a76ababaa4a5b3183`, Tiền xe thuê).
  - Đợt 0 (ADR-0094) lấy số trước, dự kiến `0074`. **Dự kiến Đợt 1: `0075` (A), `0076` (B)**, có thể thêm `0077` cho view tin (Task 11).
  - Task 0 đo lại bằng hai lệnh dưới, đếm cả `0046`–`0049`, `0053`, `0061`, `0064` đang bỏ trống. Không tự lấy số khi có va chạm: báo điều phối.

    ```
    ls migrations
    git log --all --name-only --diff-filter=A --format= -- migrations | sort -u
    ```
- **Bảng `ord_cancel_reason`** (chỉ-thêm):
  - **Cột:**
    - `id`, `order_id` → `orders`;
    - `reason_code TEXT NOT NULL` (danh sách mở, kiểm ở mã);
    - `group_code TEXT NOT NULL`: `KHACH_HUY` | `CONG_TY_HUY` | `LAP_LAI` | `CHUA_KET_LUAN`, kiểm ở mã;
    - `note TEXT NULL`, bắt buộc khi `reason_code='OTHER'`, đã qua `hasLongDigitRun`;
    - `cancelled_date TEXT NOT NULL` (ngày VN do máy chủ truyền);
    - `reclassifies_id` → chính bảng, `UNIQUE`, NULL ở dòng đầu;
    - `legacy INTEGER NOT NULL DEFAULT 0`;
    - 4 cột WHO.
  - **Trigger:**
    - chỉ-thêm (cấm `UPDATE`, `DELETE`);
    - dòng phân loại chỉ trỏ dòng có `group_code='CHUA_KET_LUAN'` cùng đơn, và không đổi sang `CHUA_KET_LUAN` (NT-L6);
    - `orders_cancel_requires_reason` (`BEFORE UPDATE OF status ON orders WHEN NEW.status='cancelled' AND OLD.status<>'cancelled' AND NOT EXISTS (… ord_cancel_reason WHERE order_id=NEW.id)`) → `RAISE(ABORT,'cancel_reason_required: …')`.
  - Mỗi trigger một câu `RAISE`, mẫu `0017`.
- **View công bố `v_ord_cancel_state`:** `order_id`, `group_code` hiện hành, `cancelled_date`, `depart_last_date` = `MAX(order_service.depart_date)`, `legacy`.
  - Dòng hiện hành = dòng không bị dòng nào trỏ `reclassifies_id`.
  - Billing đọc view này (cạnh `billing → orders` đã có, `architecture.test.ts:25`). Chỉ khoá + nhãn, không tên khách.
- **Lô huỷ** (`cancelOrder`, chuyển SQL mới sang `huy-don-repo.ts`). Thứ tự:
  1. `INSERT ord_cancel_reason … SELECT … WHERE EXISTS (SELECT 1 FROM orders WHERE id=? AND status=? AND updated_at=?)`. Cùng điều kiện khoá lạc quan với câu 2, nên hai câu cùng áp hoặc cùng không.
  2. `UPDATE orders SET status='cancelled' …`, câu cũ `repository.ts:1019`.
  3. Nhật ký `changes() > 0`, đưa lý do vào `detail` dưới dạng **nhãn**; ghi chú "Khác" giữ khuôn HDV.
  - **Người kiểm xem kỹ:**
    - câu 1 chèn mà câu 2 thua thì không được để lại dòng mồ côi;
    - ca đua NT-L3 chứng minh;
    - cuối lô thêm câu canh `WHERE changes()>0`, hoặc kiểm `R-ORD-H1` ngược ("dòng lý do của đơn không huỷ").
- **Gieo đơn huỷ cũ** (câu một lần trong migration A, ghi ở sổ dữ liệu), NT-L7:
  - nhóm `CHUA_KET_LUAN`, mã `LEGACY`, `legacy = 1`, `created_by = 'he-thong'`;
  - ngày huỷ = `date(<audit_log.created_at mới nhất của action IN ('cancelled','order_cancelled_by_field')>, '+7 hours')`, thiếu thì từ `orders.updated_at`.
  - **Người kiểm xem kỹ:** cách đổi giờ UTC → ngày VN trong SQL. Không dùng `date('now')`; chỉ đổi mốc đã lưu.
  - **X-3:** "đơn huỷ trước ngày lên production" ⇔ có dòng `legacy = 1`. Không cần hằng ngày phát hành.

### 3.2 Migration B — `billing`: duyệt, chi, chuyển, hoàn ngoài (số kế tiếp sau A)

| Bảng / cột | Cột chính | Ràng buộc |
|---|---|---|
| `bil_deposit_approval` (khoản duyệt, chỉ-thêm) | `id`, `order_id`, `kind_code` (`REFUND` \| `TRANSFER`), `amount > 0`, `target_order_id` NULL, `reason NOT NULL`, `approved_date TEXT NOT NULL` (ngày VN), `voids_id` → chính bảng `UNIQUE` NULL (dòng **huỷ duyệt**: `amount` = phần huỷ, `kind_code` = của gốc), 4 cột WHO | `CHECK ((kind_code='TRANSFER') = (target_order_id IS NOT NULL) OR voids_id IS NOT NULL)`; `CHECK (target_order_id IS NULL OR target_order_id <> order_id)` |
| `bil_outside_refund` (đ16, chỉ-thêm) | `id`, `order_id`, `kind_code` (`RECORD` \| `CONFIRM`), `amount` (dòng `RECORD`), `reason NOT NULL`, `confirms_id` → chính bảng `UNIQUE` NULL, `occurred_date`, 4 cột WHO | chỉ mục duy nhất một phần `(order_id) WHERE kind_code='RECORD'` (NT-N3; nếu Q2 = "một lần có hiệu lực" thì đổi sang trigger) |
| `ALTER TABLE bil_payment_receipt ADD COLUMN approval_id TEXT NULL REFERENCES bil_deposit_approval(id)` | lần chi hoàn / nửa "chi" của lệnh chuyển gắn khoản duyệt | thêm cột NULL có `REFERENCES` mặc định NULL: được phép (`docs/CHANGE-GUIDE.md` công thức d bước 1) |
| `ALTER TABLE bil_payment_receipt ADD COLUMN transfer_of_id TEXT NULL REFERENCES bil_payment_receipt(id)` + chỉ mục `UNIQUE` | nửa "thu" ở đơn mới trỏ nửa "chi" ở đơn huỷ | — |

**Trigger** (module `billing`, chỉ đọc `bil_*` + `v_ord_order_state` + `v_ord_cancel_state`, đúng luật thân trigger NT-R5 của lượt 1):

- **Đã trả (SQL)** = Σ `CUSTOMER_PAYMENT` còn hiệu lực (không đảo, chưa bị đảo) **trừ** lần thu vai `COMPANY` còn dòng `HELD` không đảo. Đúng điều kiện `billing/service.ts:171-172`; bài đối chiếu NT-3.
- **Tổng duyệt** = Σ approval gốc − Σ huỷ duyệt + Σ `RECORD` đã có `CONFIRM`.
- **Tổng chi + chuyển** = Σ `CUSTOMER_REFUND` gắn `approval_id`, còn hiệu lực + Σ `RECORD` đã `CONFIRM`.

| Trigger | Khi nào | `RAISE` |
|---|---|---|
| `bil_deposit_approval_guard` | `BEFORE INSERT` dòng gốc | Đơn không huỷ; nhóm `CHUA_KET_LUAN` (X-2); nhóm `KHACH_HUY` và `approved_date > date(COALESCE(depart_last_date, cancelled_date), '+60 days')` (đ5); tổng duyệt + `NEW.amount` > đã trả (đ15); `TRANSFER` mà đơn nhận huỷ hoặc đã Đã giao. Mã lỗi: `coc_not_cancelled`, `coc_unclassified`, `coc_deadline`, `coc_exceeds_paid`, `coc_bad_target` |
| `bil_deposit_void_guard` | `BEFORE INSERT` dòng huỷ duyệt | `amount` > phần chưa chi của khoản gốc → `coc_void_exceeds_unspent` |
| `bil_payment_receipt_coc_refund` | `BEFORE INSERT` `CUSTOMER_REFUND` không đảo | Đơn huỷ mà `approval_id IS NULL` → `coc_needs_approval` (NT-H5). Có `approval_id`: vượt phần còn lại của khoản → `coc_exceeds_approved`; `NEW.created_by = approval.created_by` → `coc_same_person` (đ4c) |
| `bil_payment_receipt_coc_transfer_pair` | `BEFORE INSERT` `CUSTOMER_PAYMENT` có `transfer_of_id` | Nửa "chi" phải là `CUSTOMER_REFUND` gắn khoản `TRANSFER` có `target_order_id = NEW.order_id`, cùng số, cùng `collector_party_id`, ngược lại → `coc_transfer_mismatch` |
| `bil_payment_receipt_coc_reversal` | `BEFORE INSERT` dòng đảo của `CUSTOMER_PAYMENT` trên đơn huỷ | Đã trả sau đảo < tổng duyệt → `coc_paid_below_approved` (NT-B2) |
| `bil_outside_refund_guard` | `BEFORE INSERT` | `RECORD`: đơn không có dòng lý do `legacy=1` → `coc_outside_not_legacy`; `amount` > còn giữ → `coc_outside_exceeds`. `CONFIRM`: `created_by` = `created_by` của `RECORD` → `coc_same_person` |
| chỉ-thêm | cả hai bảng | `bil_append_only` (khuôn `0045:182-192`) |

- **View công bố `v_bil_coc_don`:** `order_id`, `da_tra`, `dang_doi_chieu`, `da_duyet`, `da_chi`, `da_chuyen`, `con_giu`, `cho_chi`. Dùng cho danh sách và cho `audit-invariants`.
- **Người kiểm xem kỹ:**
  - (a) Trigger đọc `v_ord_cancel_state` có `MAX(depart_date)` trên `order_service`. Chạy `EXPLAIN` trên D1 local; trigger trên đường nóng ghi lần thu.
  - (b) `RAISE` huỷ cả lô chuyển hai đơn (spike R1 lượt 1 đã thấy trên D1 local 30/9 cho lô Đã giao; lô mới cần ca riêng).
- **Thông báo lỗi trigger** có tiền tố mã. Route dịch sang câu tiếng Việt, không lộ mã thô (khuôn NT-D7 lượt 1, `loiTrigger` `billing/service.ts:237`).

### 3.3 Ô quyền mới (`src/shared/permissions.ts`)

| Ô | SALES | ACCT | ADMIN | FIELD | PARTNER | SUPER_ADMIN | INTERN | DRIVER | DRIVER_PARTNER | HR | Dùng ở |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `deposit.refund.approve` | none | none | **any** | none | none | any | none | none | none | none | duyệt hoàn, duyệt chuyển (X-1), huỷ duyệt, **xác nhận hoàn ngoài** (X-4, trang ghép §3) |
| `order.cancel.classify` | none | none | **any** | none | none | any | none | none | none | none | chọn nhóm "Công ty huỷ" khi huỷ, phân loại "chưa kết luận" (Đ-2) |
| `deposit.outside.record` | none | none | none | none | none | **any** | none | none | none | none | ghi "đã hoàn ngoài hệ thống" (đ16) |

- **Vì sao tách `order.cancel.classify` khỏi ô duyệt** (trang ghép §2 cho kế hoạch chọn):
  - ô này nằm ở module `orders`, ô duyệt ở `billing`;
  - mỗi cổng có dòng sổ hàng rào riêng (§5);
  - đổi người giữ một bên không kéo bên kia.
  - Giá phải trả: một dòng `MATRIX`, một dòng ghim, một tên lời thường.
- **Dùng lại, không thêm ô mới:**
  - chi hoàn: `payment.refund`;
  - chuyển: `ledger.write`;
  - danh sách, ô đếm, đối chiếu: `ledger.view` (không ngữ cảnh = `any`);
  - lần thu lên đơn huỷ (đ13): `payment.receive` **và** `ledger.write`.
- **Không nhân đôi bài tập con quyền:** chỉ thêm ô, không thêm mã quyền, nên 2^10 tập giữ nguyên. Việc phải làm cho mỗi ô:
  - `permissions.test.ts`: bảng `ADR` đọc độc lập + bài ghim hàng `DRIVER`, `DRIVER_PARTNER`, `PARTNER` (`src/modules/orders/xem-don-theo-quyen.test.ts`);
  - `TEN_THAO_TAC` (`src/shared/tro-ly-cau-truc-ten.ts:66`);
  - **route hỏi `can()` trong cùng commit**, nếu không thì bài `src/permission-enforcement.test.ts` đỏ. Không đưa ô vào `docs/quyen-hoan.json`;
  - kho trợ lý sinh lại (đỏ một lần, công thức z5).
- **ADR-0090:** bài mới khẳng định hàm "tài khoản có quyền tiền" của Đợt 0b **vẫn** cho đúng `ACCOUNTING` và `SUPER_ADMIN` sau khi thêm ba ô.
  - `deposit.outside.record` chỉ Toàn quyền nên không đổi kết quả.
  - `deposit.refund.approve` Quản trị có, nên không vào định nghĩa "ô Quản trị không có".

### 3.4 Route

| Route | Module | Cổng | Ô | Trả | ADR-0094 |
|---|---|---|---|---|---|
| `POST /api/orders/:id/status` (thêm thân `lyDo`, `ghiChu?` khi huỷ) | orders | orders | `order.modify` + (`order.cancel.classify` nếu nhóm công ty) | 200 như cũ | lô cũ + dòng lý do; **một lô** |
| `POST /api/orders/:id/handler-cancel` (thêm nhóm) | dispatch → `cancelOrderByHandler` | staff | `order.cancel` | 200 | **một lô** |
| `POST /api/orders/:id/cancel-reason` (phân loại) | orders | orders | `order.cancel.classify` | 201 + `Location` | V1–V3 |
| `GET /api/orders/:id/payments` (thêm khối `coc` + cờ nút) | billing | orders | `order.view` + `money.view`; cờ theo từng ô | 200 | — |
| `POST /api/orders/:id/payments` (đơn huỷ: thêm `ledger.write`) | billing | orders | `payment.receive` + `ledger.write` khi huỷ | 201 (+ `Location`, theo H7 của Đợt 0) | V1 |
| `POST /api/orders/:id/coc/duyet` `{ loai: "hoan" \| "chuyen", soTien, lyDo, donNhan? }` | billing | office | `deposit.refund.approve` | 201 + `Location` | V1–V3 |
| `POST /api/orders/:id/coc/duyet/:duyetId/huy` `{ soTien, lyDo }` | billing | office | `deposit.refund.approve` | 201 + `Location` | V1–V3 |
| `POST /api/orders/:id/coc/chi` `{ duyetId, soTien, hinhThuc, nguoiTra, ngayPhatSinh?, ghiChu? }` | billing | office | `payment.refund` | 201 + `Location` | V1–V3 |
| `POST /api/orders/:id/coc/chuyen` `{ duyetId, soTien, nguoiGiu, ngayPhatSinh? }` | billing | office | `ledger.write` | 201 + `Location` (đơn huỷ) | V1–V3 (một lô hai đơn) |
| `POST /api/orders/:id/coc/hoan-ngoai` `{ soTien, lyDo, ngayPhatSinh }` | billing | office | `deposit.outside.record` | 201 + `Location` | V1–V3 |
| `POST /api/orders/:id/coc/hoan-ngoai/:ghiId/xac-nhan` | billing | office | `deposit.refund.approve` | 201 + `Location` | V1–V3 |
| `GET /api/ledger/coc` (Cần chi hoàn + trả dư đơn không huỷ; Đơn huỷ giữ cọc; đơn huỷ còn người giữ) | billing | office | `ledger.view` (any) | 200 | — |
| `GET /api/ledger/coc/doi-chieu` (đ16) | billing | office | `ledger.view` (any) | 200 | — |
| `GET /api/ledger/coc/dem` (ô đếm Trang chủ) | billing | office | `ledger.view` (any) | 200 | — |
| `GET /api/orders/:id/receipt` (thêm khối `huy`) | receipt | orders | như cũ | 200 | — |

- **Bảng tin:** route ghi dưới `/api/orders/*` của `billing` gọi `baoThayDoi` **đúng một lần**, sau lô (hàng rào `src/bang-tin-guard.test.ts`).
  - Các lệnh tiền dùng khoá `tien`. Phân loại lý do dùng `huy`.
  - Lệnh chuyển báo **cả hai** đơn: hàng rào đếm một lần mỗi đơn. Kiểm bài có nhận hai lời gọi khác `orderId` không; nếu không thì đó là ngoại lệ có tên (khuôn Vận chuyển T2 `271b7687`).
- **Nhật ký mới** (`src/shared/audit-actions.ts`, nhãn tiếng Việt, **không** số tiền chi tiết trong `detail`):
  - `order_cancel_reason_classified`, `deposit_refund_approved`, `deposit_transfer_approved`, `deposit_approval_voided`;
  - `deposit_refund_paid`, `deposit_transferred_out`, `deposit_transferred_in`;
  - `deposit_outside_recorded`, `deposit_outside_confirmed`.
- **Thứ tự khai route:** tiền tố `/api/orders/:id/coc/…` không đụng route của `orders`. Vẫn kiểm `/api/ledger/coc` khai **trước** route có `:id` nếu cùng tiền tố (bẫy Trang chủ).

### 3.5 Giao diện

| Phần | Làm khi nào | Ghi chú |
|---|---|---|
| Nhãn tiền (NT-V1), ảnh thông báo huỷ (NT-V2), điều khoản huỷ trên ảnh xác nhận (NT-V3) | **Phần C — làm ngay**, là việc chữ | Chữ điều khoản: bản nháp theo ví dụ đ10, chủ chốt qua ảnh chụp (Q5) |
| Hộp "Huỷ đơn" có lý do (NT-V5); nút trên trang đơn huỷ (NT-V4) | **Phần C**, dựng bằng khuôn có sẵn `hangXacNhan` (`web/order.ts:486`) và danh sách lý do kiểu `web/viec-cua-toi.ts:39` | **GĐ:** không vẽ màn mới, chỉ thêm hàng nút cùng kiểu "Ghi hoàn". Chủ xem ảnh chụp; chủ muốn vẽ lại thì làm ở Phần D |
| Ô đếm Trang chủ (NT-V6) | **Phần C** | Cùng khuôn ô "Còn thiếu tiền" (`web/home.ts:78-89`, `oSoMayTinh`) + thẻ điện thoại. Chủ xem ảnh |
| Màn sổ Kế toán "Cần chi hoàn", "Đơn huỷ giữ cọc", danh sách đối chiếu đ16 | **Phần D — CHỜ bản vẽ Claude Design** (đ9c) | Máy chủ + route + ô đếm có trước (Phần B, C). Trong lúc chờ, Kế toán đi từ ô đếm → trang đơn |

---

## 4. Các task (nền trước — Hiến chương 5.13)

**Mỗi task:**
1. Viết test, chạy, thấy **đỏ đúng lý do**.
2. Viết mã đến **xanh**.
3. `npm test` + `npm run typecheck` (0 lỗi).
4. Commit nhỏ, tiếng Việt.

Chạm API hoặc migration thì thêm `npm run test:e2e` (cần mạng). Ghi sổ thi công `docs/superpowers/plans/2026-10-0x-dot-1-don-huy-coc-thi-cong-nhat-ky.md` (ruling, nợ; P19).

### Task 0 — Cổng bắt đầu
- **Kiểm:**
  - `git log main` có commit gộp Đợt 0a (ADR-0094) và 0b (ADR-0090);
  - `src/shared/router.ts` có bước vé;
  - `web/api.ts` gửi vé;
  - bài H7 tồn tại.
- **Việc:**
  - worktree mới từ `main`;
  - đo lại **mọi** `tệp:dòng` ở §2, ghi chênh vào sổ thi công;
  - lấy số migration thật (§3.1);
  - chạy nền và ghi số xanh làm mốc: `npm test`, `npm run typecheck`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`.
- **Xong khi:** sổ thi công có mốc `main`, hai số migration, mốc test. Đợt 0 chưa gộp thì **chỉ** được làm Phần A (§6, phương án cầm máu).

### Task 1 — Sổ vàng trước (Hiến chương 5.17) — chỉ dữ liệu, xanh ngay
- **Tệp:**
  - `golden/don-huy-coc.json` (mới, 13 ca §1.8, mọi ca `cho_xac_nhan`);
  - `golden/README.md` (thêm dòng);
  - `src/so-vang.test.ts`: chỉ LỚP 1 (tự cân) cho tệp mới.
- **Đỏ → xanh:** đọc tệp mới mà LỚP 1 chưa biết định dạng sự kiện mới → đỏ; thêm phần đọc → xanh. **Không** commit trạng thái đỏ.
- **Lưu ý:** LỚP 2 chỉ chạy ca `da_xac_nhan` (`golden/README.md`). Vì vậy **trước khi Kế toán xác nhận, sổ vàng chưa kiểm mã**. Vòng đỏ → xanh của mã tiền nằm ở `rules.test.ts` (Task 2).
- **Song song:** gửi Kế toán / chủ bảng ca dạng lời thường để xác nhận. Đây là **cổng phát hành**, dễ trễ nhất.
- **Kiểm:** `node --test src/so-vang.test.ts`.

### Task 2 — Luật thuần tiền đơn huỷ (`billing/rules.ts`) + bộ chạy LỚP 2
- **Hàm** (tên thi công):
  - `daTraXacNhan(receipts, lines)`;
  - `soTienCoc({ receipts, lines, duyet, hoanNgoai, status })` → `{ daTra, dangDoiChieu, daDuyet, daChi, daChuyen, conGiu, choChi }`;
  - `conLai(…)` nhận `status`: đơn huỷ → `conLai = 0`, `du = 0` (đ1);
  - `hanHoanCoc({ nhom, ngayDiMuonNhat, ngayHuy })`, `quaHan(han, ngay)`;
  - `kiemDuyet(…)`, `kiemChi(…)`, `kiemHuyDuyet(…)`, `kiemHoanNgoai(…)`: trả `{ ok } | { ma, cau }` tiếng Việt;
  - `nhacCoc(…)`: 7 ngày, ≤ 10 ngày.
- **Đỏ:** `rules.test.ts` cho NT-1, NT-2, NT-D1–D4, NT-H2–H4, NT-H6, NT-N2–N4, NT-B1. Mỗi ca SV-DH viết lại thành ca `rules.test.ts` (đỏ → xanh ngay, không chờ Kế toán).
- **Bộ chạy LỚP 2** (`src/so-vang.test.ts`): thêm các sự kiện `huy`, `duyet`, `huy_duyet`, `chi`, `chuyen`, `ghi_hoan_ngoai`, `xac_nhan_hoan_ngoai`, `dao_lan_thu`, `cong_ty_da_nhan` chạy trên hàm thuần này. Ca nào Kế toán đã xác nhận thì tự chạy.
- **Một nguồn:** `tienCuaDon` (`billing/service.ts:164-199`), `tienNhieuDon` (`:204-213`), `soTienBienNhan` (`billing/index.ts:227-230`) đều gọi `conLai` mới. Bài NT-R9 vẫn xanh.
- **Kiểm:** `node --test src/modules/billing/rules.test.ts src/so-vang.test.ts` → `npm test` → `npm run typecheck`.

### Task 3 — Luật thuần lý do huỷ và nhãn tiền (`src/shared/`)
- **Tệp:** `src/shared/ly-do-huy.ts` (mới) và `src/shared/nhan-tien.ts` (mới), mỗi tệp có `*.test.ts` cạnh.
- **`ly-do-huy.ts`:**
  - danh sách lý do theo nhóm:
    - khách huỷ: "Khách đổi ý";
    - lập lại / trùng: "Khách đặt trùng", "Sai thông tin — lập lại đơn";
    - công ty huỷ: "Thời tiết / cấm biển", "Hết chỗ", "Sự cố nhà cung cấp", "Lỗi công ty";
    - "Khác" → chưa kết luận;
    - HDV: "Khách yêu cầu huỷ" → khách huỷ, "Không liên hệ được với khách" → **Q1**, "Khác" → chưa kết luận;
  - `luaChonLyDo({ coTheChonCongTy })` và `docLyDoHuy(body, { coTheChonCongTy })` (400/403, `hasLongDigitRun`). Hàm **nhận cờ**, không tự gọi `can()`.
  - Lý do nhận cờ:
    - ô `order.cancel.classify` chưa có tới Task 6, nên Task 3 không gọi được ô đó (`tsc` sẽ đỏ);
    - bài `src/permission-enforcement.test.ts` chỉ đếm `can(…, "<ô>")` viết tường minh trong `src/modules/**` (`:9-14`), nên lời gọi trong `src/shared/` không tính là "máy chủ hỏi".
  - Route (Task 6) tính cờ bằng `can(staff, "order.cancel.classify")` viết tường minh. `web/` tính cờ bằng chính `can()` đó.
  - Hằng trong mã, không bảng (ADR-0030 đ2). Mã lưu ở `reason_code` có dạng `OTHER`, `KHACH_DOI_Y`… (GĐ).
- **`nhan-tien.ts`:** `nhanTien({ status, deliveredAt, nhom, han, homNay })` → nhãn NT-V1.
- **Đỏ:** test hai tệp. Ca "cờ sai → không có nhóm công ty; cờ đúng → có". Bài 2^10 tập con quyền làm ở Task 6, khi ô đã có.
- **Kiểm:** `node --test src/shared/ly-do-huy.test.ts src/shared/nhan-tien.test.ts` → `npm test` → `npm run typecheck`.

### (Không có Task 4 độc lập) — Ô quyền đi cùng route đầu tiên hỏi nó
- **Lý do:**
  - `src/permission-enforcement.test.ts` đỏ khi một ô có trong `MATRIX` mà chưa route nào ở `src/modules/**` hỏi (`:9-12`);
  - đẩy ô vào `docs/quyen-hoan.json` để "cho xanh" là nới hàng rào, không làm.
- **Ô nào vào task nào:**
  - `order.cancel.classify` → Task 6;
  - `deposit.refund.approve` → Task 8;
  - `deposit.outside.record` → Task 10.
- **Mỗi lần thêm ô, cùng commit:**
  - `src/shared/permissions.ts`;
  - `src/shared/permissions.test.ts`: bảng `ADR` đọc độc lập, đổi trước → đỏ;
  - ghim hàng `DRIVER`, `DRIVER_PARTNER`, `PARTNER` (`src/modules/orders/xem-don-theo-quyen.test.ts`);
  - `TEN_THAO_TAC` (`src/shared/tro-ly-cau-truc-ten.ts:66`);
  - bài ADR-0090 "tài khoản có quyền tiền" của Đợt 0b: vẫn đúng `ACCOUNTING` + `SUPER_ADMIN`;
  - kho trợ lý sinh lại (đỏ một lần, công thức z5).
- **Kiểm (mỗi lần):** `node --test src/shared/permissions.test.ts src/permission-enforcement.test.ts src/route-write-guard.test.ts` → `npm test`.

### Task 5 — Migration A (`orders`: lý do huỷ, gieo đơn cũ)
- **Tệp:**
  - `migrations/<A>_ly_do_huy_don.sql`;
  - `src/migrations-ly-do-huy.test.ts` (mới);
  - `docs/data-dictionary.json` (bảng, view, `integrityEdges`; ghi câu gieo một lần) → `npm run dict`.
- **Đỏ trước:**
  - NT-L3: `UPDATE orders SET status='cancelled'` không dòng lý do → phải `RAISE`; trước migration không `RAISE`;
  - NT-L7: DB có 3 đơn huỷ cũ (một có `audit_log`, một không), sau migration đúng 3 dòng `legacy=1`, ngày đúng;
  - chỉ-thêm;
  - dòng phân loại sai đích;
  - NT-R6 lượt 1: "trigger khoá `orders` phủ mọi cột". Không thêm cột vào `orders`; bài phải vẫn xanh.
- **Trigger mới làm đỏ mọi chỗ đặt đơn huỷ bằng SQL thẳng** (bài, khung thử, dữ liệu gieo e2e). Trước khi viết trigger, liệt kê bằng lệnh dưới, ghi danh sách vào sổ thi công, rồi sửa **cùng commit** (chèn dòng lý do trước câu `UPDATE`, hoặc dùng hàm gieo chung mới):

  ```
  grep -rnE "status *= *'cancelled'|'cancelled'" src tests docs/evidence
  ```
- **Kiểm:** `node --test src/migrations-ly-do-huy.test.ts src/architecture.test.ts` → `npm test` → `npm run db:migrate:local` → `npm run dict`.

### Task 6 — Lô huỷ có lý do (hai đường) + phân loại
- **Tệp:**
  - `src/modules/orders/huy-don-repo.ts` (mới, thêm vào `NUA_NGHIEM` `src/architecture.test.ts:138`);
  - `src/modules/orders/repository.ts:1016-1023` (`cancelOrder` gọi câu mới);
  - `src/modules/orders/index.ts:401-403` (`cancelOrderByHandler` thêm lý do) và `:979-1027` (`/status`);
  - `src/modules/dispatch/index.ts:217-240`, `src/modules/dispatch/rules.ts:71-97`;
  - route mới `POST /api/orders/:id/cancel-reason`;
  - **ô `order.cancel.classify`** (theo mục "Ô quyền đi cùng route" ở trên) + bài 2^10 tập con: chỉ người có ô thấy nhóm công ty;
  - **đ13, NT-H10** (sửa route có sẵn, không phải lệnh ghi mới): `src/modules/billing/index.ts:60-70` thêm `info.status === "cancelled" && !can(staff, "ledger.write")` → 403. Đây là bằng chứng G1 trực tiếp (tình huống 09, 26: hôm nay 201);
  - `src/shared/audit-actions.ts`;
  - `tests/e2e/orders.mjs`, `tests/e2e/dispatch.mjs`, `tests/e2e/so-tien.mjs` (thân huỷ nay bắt `lyDo`; ca NT-H10).
- **Đỏ trước:**
  - e2e NT-L1, NT-L2, NT-L4, NT-L5 (phần phân loại), NT-L6, NT-H10;
  - ca đua "huỷ thua khoá lạc quan → không có dòng lý do mồ côi";
  - bài hợp đồng orders↔dispatch (chữ ký `cancelOrderByHandler`).
- **Chú ý:** mọi kịch bản e2e đang huỷ đơn bằng `{ status: "cancelled" }` phải thêm `lyDo`. Grep `cancelled` trong `tests/e2e/*.mjs` và `docs/evidence/**/kich-ban/*.mjs`, ghi danh sách vào sổ thi công.
- **Kiểm:** `npm test` → `npm run typecheck` → `npm run test:e2e -- orders dispatch so-tien permissions bangtin`.

### ▶ Người kiểm độc lập vòng 1 (Phần A = Task 1–3, 5–6)
Chỉ đọc. Kiểm:
- lô huỷ không để dòng mồ côi;
- gieo đơn cũ đúng ngày VN;
- `conLai` đơn huỷ = 0 ở cả bốn bề mặt;
- không đường huỷ thứ ba;
- ô quyền có route hỏi;
- NT-R9 xanh.
Báo cáo ghi vào sổ thi công.

### Task 7 — Migration B (`billing`)
- **Tệp:**
  - `migrations/<B>_billing_coc_don_huy.sql`;
  - `src/migrations-billing-coc.test.ts` (mới);
  - `docs/data-dictionary.json` → `npm run dict`.
- **Đỏ trước:** mỗi trigger §3.2 một ca chặn và một ca qua:
  - hạn chỉ khách huỷ (NT-D2, D3);
  - X-2;
  - đ15 hai vế (NT-B1);
  - đảo lần thu (NT-B2);
  - "Thay lần thu" giả lập (NT-B3);
  - hoàn không duyệt trên đơn huỷ (NT-H5);
  - người trùng (NT-H3, NT-N4);
  - cặp chuyển (NT-H8);
  - đ16 một lần, chỉ đơn `legacy` (NT-N2, N3);
  - chỉ-thêm;
  - bài đối chiếu NT-3 (SQL view ↔ hàm Task 2) trên cùng dữ liệu.
- **Kiểm:** `node --test src/migrations-billing-coc.test.ts src/migrations-billing.test.ts src/architecture.test.ts` → `npm test` → `npm run db:migrate:local`.

### Task 8 — Duyệt, huỷ duyệt, chi hoàn (+ chặn hoàn tự do trên đơn huỷ)
- **Tệp:**
  - `src/modules/billing/repository.ts` (`defineSql`, module nghiêm);
  - `service.ts` (hàm mới; `ghiHoanKhach` `:400-449` thêm nhánh đơn huỷ → 409);
  - `index.ts` (3 route + cờ trong `/payments`);
  - `src/shared/contracts.ts` (`OrderPaymentsResponse` `:1555` thêm khối `coc` + cờ `coTheDuyet`, `coTheChi`, `coThePhanLoai`, `coTheGhiHoanNgoai`, `coTheXacNhanHoanNgoai`, `coTheChuyen`);
  - `src/shared/audit-actions.ts`;
  - `tests/e2e/coc-don-huy.mjs` (mới, thêm vào `ALL` ở `tests/e2e/run.mjs:44`).
- **Đỏ trước:**
  - e2e NT-H1–H6, NT-D2–D4, NT-L5 (duyệt);
  - ca đua hai Quản trị;
  - ca gửi lặp V3 cho ba lệnh;
  - ca lỗi trigger → câu tiếng Việt.
- **Ô `deposit.refund.approve`** vào cùng commit với route duyệt.
- **Kiểm:** `npm test` → `npm run typecheck` → `npm run test:e2e -- coc-don-huy so-tien permissions bangtin`.

### Task 9 — Chuyển tiền sang đơn mới (một lô, hai đơn)
- **Tệp:** `billing/service.ts`, `index.ts`, `repository.ts`; `tests/e2e/coc-don-huy.mjs`.
- **Đỏ trước:**
  - NT-H7, NT-H8, NT-H9;
  - "trigger cặp lệch → cả lô huỷ, không đơn nào có dòng";
  - người chuyển = người duyệt → 409;
  - nhật ký trên cả hai đơn;
  - gửi lặp V3.
- **Kiểm:** như Task 8 + `node --test src/modules/billing/lo-ghi.test.ts` (thêm ca lô hai đơn).

### Task 10 — Hoàn ngoài hệ thống (đ16) + danh sách + ô đếm (máy chủ)
- **Tệp:** `billing/*`; route `coc/hoan-ngoai`, `xac-nhan`, `GET /api/ledger/coc`, `/doi-chieu`, `/dem`; `src/shared/contracts.ts` (ba kiểu phản hồi mới). **Ô `deposit.outside.record`** vào cùng commit với route ghi.
- **Đỏ trước:**
  - NT-N1–N4;
  - NT-D5 (nhắc);
  - NT-V6 phần máy chủ (403 cho người không `ledger.view any`, số đếm đúng trên dữ liệu gieo);
  - gửi lặp V3.
- **Kiểm:** `npm test` → `npm run typecheck` → `npm run test:e2e -- coc-don-huy so-tien`.

### Task 11 — Tin "Đã duyệt hoàn cọc" cho Kế toán
- **Tệp:**
  - `src/shared/thong-bao.ts:7` (`HANH_DONG_TIN_DON`);
  - `v_aud_order_event` (`migrations/0025_thong_bao.sql:53-56`) là **view công bố của module `audit`** (hợp đồng). Hai cách:
    - dựng một view mới bên cạnh;
    - DROP/CREATE view cũ, coi là **đổi hợp đồng**, cần điều phối duyệt.
    Làm trong migration B nếu kịp, nếu không thì **migration thứ ba** (số kế tiếp sau B; §3.1 mới giữ hai số);
  - `src/shared/thong-bao.test.ts`.
- **Trước khi viết:** đọc ADR-0034 đ4 ("Của tôi" theo quan hệ với đơn). Khuôn người nhận hôm nay không có "theo ô quyền" thì **dừng, báo điều phối**: đây là luật người nhận, không tự chế.
- **Đỏ trước:** NT-V7 (có tin cho Kế toán; không đẩy màn hình khoá).
- **Kiểm:** `npm test` → `npm run test:e2e -- thongbao coc-don-huy`.

### Task 12 — Bất biến `audit-invariants` + sổ hàng rào
- **Tệp:**
  - `scripts/audit-checks.mjs`: R-BIL-C0…C6, R-ORD-H1 (NT-B4), mức `fail`; nhắc hạn là `warn`;
  - `src/audit-invariants.test.ts`;
  - `docs/SO-HANG-RAO.md` (§5).
- **Đỏ trước:** chèn vi phạm trên SQLite thử → mỗi mã đếm ≥ 1. Rồi trên D1 local:

  ```
  node scripts/audit-invariants.mjs --db local
  ```

  phải thoát 1 → hoàn nguyên → thoát 0.
- **Kiểm:** `node --test src/audit-invariants.test.ts` → `npm test` → `npm run test:e2e` **đủ bộ** (đuôi `audit-invariants --strict`).

### ▶ Người kiểm độc lập vòng 2 (Phần B = Task 7–12)
Chỉ đọc, tự chạy lại lệnh. Trọng tâm:
- trigger đúng định nghĩa "đã trả" (bài NT-3);
- đ15 mọi lúc (đảo, "Thay lần thu" giả lập);
- tách người ở cả máy chủ và CSDL;
- lô chuyển hai đơn nguyên khối;
- mỗi route mới một lô + `Location`;
- năm hàng rào §5 đã có dòng và ngày quan sát.

### Task 13 — Phần C: chữ, ảnh, nút trên trang đơn, ô đếm Trang chủ
- **Tệp:**
  - `src/modules/receipt/rules.ts` (khối `huy` theo danh sách trắng), `src/modules/receipt/index.ts:31` (bỏ dự phòng, NT-5);
  - `src/shared/order-confirmation.ts` (`titleBlock` `:169-182`, `summaryBlock` `:211-223`, khối điều khoản; NT-V2, V3);
  - `web/order.ts` (`:420-421`, `:437-439`, nút mới cạnh `:567`, hộp huỷ `:795`);
  - `web/viec-cua-toi.ts:534-536`;
  - `web/home.ts` (ô đếm);
  - `src/shared/changelog.ts` (mục phiên bản mới, công thức t);
  - test `src/modules/receipt/bien-nhan.test.ts`, `src/shared/order-confirmation.test.ts`.
- **Đỏ trước:**
  - bài ảnh: đơn huỷ → tiêu đề "THÔNG BÁO HUỶ ĐƠN DỊCH VỤ", không "Còn lại";
  - đơn chưa giao → "Khách hàng đã trả trước";
  - có dòng điều khoản với đường dẫn;
  - số lạ 480.017 không lọt.
- **Kịch bản Chrome** (`npm run build:web` trước; bảng `web/CLAUDE.md`):
  - `docs/evidence/2026-09-21-v1-0/kich-ban/v1-xac-nhan-png.mjs`: ảnh xác nhận + ảnh thông báo huỷ;
  - `docs/evidence/2026-09-29-so-tien-luot-1/kich-ban/so-tien-smoke.mjs`: mở rộng bước đơn huỷ: nhãn, nút theo vai, duyệt → chi; trang Quản trị mở **sau cùng** (cookie chung);
  - ba `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-{form,order,sheet}.mjs`;
  - `docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/hdv-viec-cua-toi-smoke.mjs`: nhãn ở Việc của tôi + hộp huỷ HDV;
  - `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs`: ô đếm, đếm số ô của Kế toán; sửa số ô trong kịch bản nếu đổi.
  - Mỗi kịch bản sửa phải **chứng minh còn đỏ được** bằng một sửa cố ý (P16).
- **Ảnh chụp:** lưu ở `docs/evidence/2026-10-0x-dot-1-don-huy/anh/` để chủ duyệt chữ (Q5) và hàng nút (GĐ §3.5).
- **Kiểm:** `npm test` → `npm run typecheck` → `npm run build:web` → các kịch bản trên → `npm run test:e2e -- pwa` nếu chạm CSS.

### ▶ Người kiểm độc lập vòng 3 (Phần C)
Kiểm:
- giao diện hỏi `can()`, không hỏi mã quyền (`src/giao-dien-hoi-bang-quyen.test.ts`);
- Đối tác không thấy tên người giữ hay nút;
- danh sách trắng biên nhận;
- kịch bản Chrome chạy lại được.

### Task 14 — Phần D (CHỜ bản vẽ): màn sổ Kế toán
- **Bước đầu, chủ làm:** vẽ trên Claude Design ba màn "Cần chi hoàn", "Đơn huỷ giữ cọc", "Đối chiếu đơn cũ" (đ9c, đ16). AI soạn **lệnh thiết kế** mô tả dữ liệu từng màn: trường của `GET /api/ledger/coc`, `/doi-chieu`; nhãn; nhắc 7 ngày / 10 ngày; nút theo ô.
- **Sau khi có bản vẽ:** trang mới theo công thức c (`PAGES` ở `src/shared/sw-policy.ts`, script `build:web`, `initShell`, mục thanh bên theo `can(…,"ledger.view")`), kịch bản Chrome mới, mục kịch bản ở `web/CLAUDE.md`.
- **Không chặn** đóng TNV-G1 (§6).

---

## 5. Hàng rào — dòng `docs/SO-HANG-RAO.md` + "sửa cố ý → đỏ → hoàn nguyên"

Mỗi dòng có ngày quan sát thật. Không có ngày = lời khuyên. Người thi công ghi phép đột biến và thông báo đỏ.

| Hàng rào | Chặn | Cơ chế (hai lớp, Hiến chương 5.1) | Phép đột biến để quan sát chặn thật |
|---|---|---|---|
| **H-C1** chi + chuyển ≤ duyệt ≤ đã trả, mọi lúc | đ15, kể cả đảo lần thu sau duyệt | máy chủ (`kiemDuyet`/`kiemChi`) + trigger `bil_deposit_approval_guard`, `bil_payment_receipt_coc_refund`, `…_coc_reversal` + `R-BIL-C1` | (a) bỏ vế "≤ đã trả" khỏi trigger → `src/migrations-billing-coc.test.ts` đỏ; (b) bỏ trigger đảo → ca SV-DH-08 đỏ; (c) chèn tay khoản duyệt vượt trên D1 local → `audit-invariants` thoát 1 |
| **H-C2** người chi / chuyển / xác nhận ≠ người duyệt / ghi | đ4c, Đ-1, X-4 | máy chủ (409) + trigger so `created_by` + `R-BIL-C3` | sửa điều kiện `created_by <>` thành `IS NOT NULL` → ca SV-DH-09 đỏ (unit + e2e) |
| **H-C3** hạn 60 ngày **chỉ** khách huỷ | đ5, Đ-3 | `hanHoanCoc` + trigger + `R-BIL-C6`; ca ngược ba nhóm | (a) đổi `'+60 days'` thành `'+59 days'` → ca biên đỏ; (b) bỏ điều kiện `group_code='KHACH_HUY'` → ca công ty huỷ sau hạn đỏ |
| **H-C4** chỉ Quản trị / Toàn quyền chọn "Công ty huỷ" | Đ-2 | route `/status` và `cancel-reason` hỏi `can(staff, "order.cancel.classify")` rồi truyền cờ vào `docLyDoHuy` + e2e NT-L2. **Không có lớp CSDL** (CSDL không biết quyền) — ghi rõ "một lớp máy chủ + bài" | thay cờ bằng `true` ở route `/status` → e2e NT-L2 đỏ; bỏ nhánh cờ trong `docLyDoHuy` → `src/shared/ly-do-huy.test.ts` đỏ |
| **H-C5** đ16 chỉ Toàn quyền, một lần mỗi đơn, chỉ đơn cũ | đ16, X-3 | ô `deposit.outside.record` + chỉ mục duy nhất một phần + trigger `legacy` + `R-BIL-C4` | (a) xoá chỉ mục duy nhất trong bản thử → ca "ghi lần hai" đỏ; (b) đổi ô sang ADMIN `any` → bài ghim quyền đỏ |
| **H-C6** đơn huỷ phải có lý do | đ8 | trigger `orders_cancel_requires_reason` + `R-ORD-H1` | bỏ câu chèn lý do khỏi `cancelOrder` → NT-L3 đỏ |
| **H-C7** đơn huỷ không hoàn tự do | trang ghép §3 "Chi hoàn cọc" | `ghiHoanKhach` 409 + trigger `coc_needs_approval` + `R-BIL-C2` | bỏ nhánh 409 → trigger vẫn chặn (thấy lớp 2 đứng một mình); bỏ trigger → e2e đỏ |
| **H-C8** *(thêm sau vòng đối chiếu)* đơn huỷ: "còn lại" = 0 ở **mọi** đường đọc (lõi TNV-G1) | đ1, đ14, NT-1 | **một** hàm `conLai` nhận cờ huỷ (NT-R9) + bài "mọi đường đọc tiền đơn đi qua `conLai`" (khuôn `buildlines-guard.test.ts`) + kiểm định kỳ `R-BIL-C0` (đơn huỷ không có "còn lại" > 0 ở hình chiếu) | bỏ nhánh cờ huỷ trong `conLai` → NT-1 và `kiem-lai-09` đỏ; thêm một đường tính "còn lại" thứ hai trong biên nhận → bài một-nguồn đỏ |
| **H-C9** *(thêm)* chỉ Kế toán / Toàn quyền ghi lần thu lên đơn huỷ | đ13 (NT-H10) | **một lớp máy chủ + bài** (như H-C4): 409 ở route ghi lần thu. Thuộc Phần A "cầm máu", chưa có Migration B nên không có trigger; lớp CSDL cân nhắc thêm ở Task 7 nếu rẻ. Ghi rõ "một lớp" ở sổ hàng rào | bỏ nhánh kiểm trạng thái → e2e NT-H10 đỏ (Bán hàng ghi được 201) |

---

## 6. Hạn TNV-G1 (15/10) — nói thẳng

- **Điều kiện đóng TNV-G1** (`docs/quyen-hoan.json:69-76`), **tất cả** cùng có:
  1. Phần A + B lên production, kiểm bằng GET công khai và `kiem-phien-ban.mjs --sau-deploy` ĐẠT:
     - còn lại = 0;
     - lý do huỷ bắt buộc, có nhóm;
     - duyệt / chi / chuyển / đ16;
     - trigger;
     - `audit-invariants --db remote` đạt.
  2. Phần C lên production: nhãn tiền, ảnh thông báo huỷ, ô đếm.
  3. Người kiểm độc lập ba vòng ĐẠT.
  4. Sổ vàng `golden/don-huy-coc.json`: các ca **đã xác nhận** bởi Kế toán / chủ, 100% xanh LỚP 2. SV-DH-13 tách ra nếu Q3 chưa trả lời.
  5. Chạy lại kịch bản G1 (`kiem-lai-09.mjs` + nhóm-1 09, 26, vai-hd HD06 HD08, vai-qt QT05, vai-dt DT04, vai-kt KT01) cho kết quả mới đúng ADR.
     - Các kịch bản này nằm **ngoài kho** (`~/Documents/danh-gia-ux/2026-10-01/kich-ban/`) và huỷ đơn **không kèm `lyDo`**, nên sẽ nhận 400 và hỏng vì lý do khác.
     - Cách làm: chép ra thư mục tạm (khuôn `chuan-bi.sh` của lần kiểm lại 2/10), thêm `lyDo` vào lời gọi huỷ, rồi mới chạy. Không sửa bản gốc.
  - **Màn sổ (Phần D) không chặn đóng** (đ9c cho phép route + ô đếm trong lúc chờ).
- **Cách đóng:** sửa mục TNV-G1 bằng diff (`docs/quyen-hoan.json`) kèm bằng chứng. Chủ duyệt, vì đây là sổ dừng dây chuyền.
- **Khả năng kịp 15/10: THẤP.** Lý do:
  - Phần B không được bắt đầu trước khi Đợt 0 (ADR-0094 + ADR-0090) gộp `main`, mà Đợt 0 tự nó là việc lớn (128 route, migration, khoá bí mật `wrangler secret put` do chủ đặt **trước** lần triển khai).
  - Đợt 1 có 13 task (Task 0–3, 5–14), ba vòng kiểm độc lập, và một cổng do người làm (Kế toán xác nhận sổ vàng).
  - Quá hạn thì `src/phat-hien-han.test.ts` làm `npm test` đỏ ở **mọi** nhánh, cổng xanh giữ mọi phiên. F-02 cùng hạn.
- **Đề nghị chủ:**
  - **Ngày quyết: 10/10.** Nếu tới 10/10 Đợt 0 chưa gộp `main`, chủ gia hạn TNV-G1 (đề xuất tới 31/10, cùng hạn F-03, TNV-G3) bằng diff có lý do.
  - **Phương án "cầm máu" (tuỳ chủ):** Phần A (Task 1–3, 5–6: còn lại = 0, lý do huỷ, chặn người không phải Kế toán/Toàn quyền ghi thu vào đơn huỷ — NT-H10 nằm ở Task 6) cộng phần chữ của Task 13 (nhãn, ảnh thông báo huỷ) có thể lên production **trước** Đợt 0.
    - Phần này không thêm lệnh ghi mới, trừ route phân loại. Route phân loại có thể để lại tới sau Đợt 0; trong lúc đó đơn "Khác" chờ phân loại, và cũng chưa có duyệt.
    - Khách hết bị ghi "còn nợ" trên ảnh gửi đi.
    - **Không** đóng TNV-G1, chỉ giảm hại trong lúc chờ.

---

## 7. Câu hỏi cho chủ

> **Đã áp theo khuyến nghị** (lời chủ 2026-10-02: *"đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa,"*); chỉ chạm chữ hoặc giảm hại, đảo được:
> - **Q5:** dùng nguyên câu ví dụ của ADR; chủ sửa trên ảnh chụp.
> - **Cầm máu = CÓ:** Phần A + phần chữ Task 13 lên trước Đợt 0 (không đóng TNV-G1). Số migration lấy theo thứ tự gộp thật (lộ trình §1).
>
> **CHỜ CHỦ** (vòng đối chiếu độc lập chỉ ra không được tự áp, vì chạm tiền của khách, tách nhiệm vụ, hoặc chữ ADR đã duyệt): Q1, Q2, Q3, Q4, Q6. Đây là các câu (a)–(d) và (xi) ở lộ trình.
> - **Q1** chỉ chặn một dòng ánh xạ ở Task 6.
> - **Q2** chặn Task 7, 10 phần đ16.
> - **Q3**: tới khi chủ duyệt, mã giữ **đúng chữ hiện hành** của ADR-0089 ("≤ đã trả"); SV-DH-13 tách ra.
> - **Q4** không chặn task nào, nhưng chặn việc **đóng** TNV-G1 nếu chủ không đồng ý tách.
> - **Đóng TNV-G1 không cần màn sổ** (ADR-0089 đ9c cho phép route + ô đếm trong lúc chờ). Khi trình chủ đóng mục, phải nói rõ điều này, vì lời chủ ban đầu chọn hiển thị ở "cả 3" nơi.

Bảng gốc (giữ để truy vết):

| # | Câu | Khuyến nghị | Chặn task |
|---|---|---|---|
| Q1 | HDV huỷ với lý do "Không liên hệ được với khách" (`dispatch/rules.ts:73-75`) thuộc nhóm nào? | **Khách huỷ** (mặc định giữ cọc, có hạn 60 ngày). Cách khác: "chưa kết luận", tức Quản trị phân loại từng đơn | Task 6 (một dòng ánh xạ) |
| Q2 | Quản trị **không** xác nhận dòng "đã hoàn ngoài hệ thống" (Toàn quyền ghi sai số), Toàn quyền có ghi lại được không? | **Có**: "một lần" = một dòng **đang có hiệu lực**. Thêm bước Quản trị "Từ chối" (lý do bắt buộc); bị từ chối thì ghi lại được. Cách khác: một lần tuyệt đối, ghi sai thì phải sửa bằng việc khác | Task 7, 10 (đ16) |
| Q3 | Khách trả dư, Kế toán đã hoàn phần dư, **sau đó** đơn bị huỷ: "duyệt ≤ đã trả" tính trên **tổng đã trả** (chữ đ15) hay trên **còn giữ** (đã trừ phần đã hoàn trước khi huỷ)? (SV-DH-13) | **Còn giữ**: tránh duyệt hoàn số tiền đã trả lại khách rồi. Cần chủ chọn vì đổi chữ đ15 | Task 2, 7 (một vế công thức) |
| Q4 | "Giảm giá bù chênh do dời lịch, Quản trị duyệt" (đ6): hôm nay **không có** luồng duyệt giảm giá nào. Có cần làm để đóng TNV-G1 không? | **Không**: tách thành việc riêng sau Đợt 1. Trong lúc chờ, đơn mới lập với giảm giá ghi lý do "dời lịch do công ty huỷ", người lập là Quản trị | ngoài kế hoạch |
| Q5 | Chữ điều khoản huỷ trên ảnh xác nhận (đ10, "chủ chốt chữ") | Dùng nguyên ví dụ của ADR: "Khi khách huỷ, tiền cọc không được hoàn lại. Xem đầy đủ: tourdao.vn/chinh-sach-thanh-toan". Chủ sửa trên ảnh chụp | Task 13 (chỉ chữ) |
| Q6 | Gia hạn TNV-G1 (§6) | Quyết ngày 10/10 theo tình trạng Đợt 0 | — |

---

## 8. Việc của chủ

1. Trả lời §7 (một lần).
2. Gửi Kế toán xác nhận 13 ca sổ vàng (Task 1). AI soạn bảng lời thường; Kế toán ghi "đúng / sai, số đúng là …".
3. Vẽ ba màn sổ trên Claude Design (Task 14), từ lệnh thiết kế AI soạn.
4. Sau mỗi phần đạt kiểm độc lập: gộp nhánh. Chạy ở thư mục gốc kho `tourdao-sales`, trong Terminal thật:

   ```
   npm run day-len -- <nhánh>
   ```

   Rồi triển khai:

   ```
   npm run trien-khai
   ```

   Phần A + C có thể đi một lần; Phần B một lần (có migration B).
5. Trước triển khai Phần A: báo nhân viên rằng huỷ đơn nay **bắt chọn lý do**. Bản cũ trong máy chưa tải lại sẽ nhận 400 khi huỷ; tải lại là hết.
6. Đóng TNV-G1: duyệt diff `docs/quyen-hoan.json` khi đủ điều kiện §6, hoặc gia hạn ngày 10/10.

---

## 9. Điều chưa kiểm (ghi rõ, không trình bày như sự thật)

- **Trên D1 chưa kiểm:**
  - `RAISE` trong lô **hai đơn** huỷ cả lô (lượt 1 mới kiểm lô Đã giao);
  - chi phí trigger đọc `v_ord_cancel_state` (có `MAX` trên `order_service`) trên đường ghi lần thu;
  - cách đổi UTC → ngày VN trong câu gieo.
- **Hình dạng thật của Đợt 0 chưa thấy:** tên module `lan-gui`, bài H7, hàm "tài khoản có quyền tiền". Task 0 đo lại.
- **Khuôn người nhận tin của ADR-0034 đ4** có cho "theo ô quyền" (Kế toán) không: chưa đọc kỹ (Task 11 dừng hỏi nếu không).
- **Bài `src/bang-tin-guard.test.ts`** có nhận hai `baoThayDoi` khác đơn trong một route không: chưa đọc.
- **Số đơn huỷ còn tiền trên production** (cỡ danh sách đối chiếu đ16): chưa đo. Chủ chạy lệnh chỉ đọc khi cần.
- **Danh sách kịch bản e2e / Chrome đang huỷ đơn không kèm lý do:** chưa grep đủ (Task 6 làm).
