# Sổ tiền lượt 1 — làm mới hồ sơ duyệt (ADR-0024 điều 1–5, ADR-0025, ADR-0026) theo hiện trạng 2026-09-29

- **Ngày:** 2026-09-29 · **Người soạn:** AI (vai lập kế hoạch, nhánh `worktree-so-tien-luot-1`) · **Trạng thái:** bản nháp, trình chủ cùng câu hỏi gom ở §6.
- **Vì sao có tệp này:** chủ dự án chọn hướng **"1 — ưu tiên sổ tiền trước tính năng mới"**, nguyên văn: *"1, và làm đúng triết lý Modular Monolith, tuân thủ hiến pháp và kién trúc hệ thống"* (chat 2026-09-29). Chữ "1" là **chọn hướng**, chưa phải lời duyệt ba ADR cửa một chiều: trang ghép `docs/superpowers/specs/2026-09-25-luot1-hoan-tat-trang-ghep.md` soạn 25/9 (bảng quyền 7 cột, hôm nay 9), hai câu mở M1/M2 của ADR-0026 chưa trả lời, và Hiến chương 5.14–5.17 được duyệt **sau** khi ba ADR được soạn (26/9). Tệp này là **phần bổ sung** cho ba ADR và trang ghép — không sửa nội dung ADR (đang proposed; AI soạn nháp ngoài `docs/adr/`, `reference-hoi-quyen-sua-adr`). Khi chủ duyệt, các điểm ở đây được chép vào ADR tương ứng trước dòng trạng thái.
- **Số quyết định trong lượt:** vẫn **3** (ADR-0024 điều 1–5, ADR-0025, ADR-0026) — mọi ô quyền mới/đổi nằm trong bảng của ADR-0025/0026, không thêm ADR (giới hạn 3 của `CLAUDE.md` §9).

## 1. Điều kiện tiên quyết ("xây trên lỗ đang hở") — kiểm lại 2026-09-29

| Điều kiện ghi trong ADR | Bằng chứng hôm nay | Kết quả |
|---|---|---|
| ADR-0019 lên production (các route hỏi `money.view`, `contact.view`) | Bản 1.18 (Worker 7f7820a1, 27/9); `docs/quyen-hoan.json` mục `thao_tac` **không còn** `money.view`, `contact.view` (6 mục còn lại: `task.progress`, `dispatch.guides.view`, `payment.receive`, `payment.refund`, `invoice.request`, `invoice.issue`) | **Thoả** |
| `DK-T3-01`, `DK-T3-02`, `DK-T4-02` (HIGH) đã vá | Lên production bản 1.14 (26/9, Worker 16742d55); mục `phat_hien` của `docs/quyen-hoan.json` **rỗng** | **Thoả** |
| `DK-T2-01` (đơn giá thoả thuận) | Bản 1.13 (25/9) | **Thoả** |
| ADR-0024 điều 6 (Tour Đảo là hồ sơ) | Đã duyệt và lên production (T2b, migration `0030`, bản 1.34) | **Xong** — không còn trong lượt này |
| ADR-0019 Phần C (lệch ADR-0019 ↔ ADR-0028, danh mục giá cho Đối tác/Thực tập) | Chưa quyết; chạm **bảng giá danh mục** (ai đọc được giá niêm yết), **không** chạm tiền đã thu/còn lại của đơn | **Không chặn** lượt này; ghi để người kiểm thấy |

## 2. Bảng quyền đủ 9 cột (thay bảng (2) của trang ghép 25/9)

Thứ tự cột như `src/shared/permissions.ts`: SALES · ACCOUNTING · ADMIN · FIELD · PARTNER · SUPER_ADMIN · INTERN · **DRIVER** · **DRIVER_PARTNER**.

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER | DRIVER_PARTNER | Nguồn |
|---|---|---|---|---|---|---|---|---|---|---|
| `order.handover` (mới) | none | none | any | assigned | none | any | none | **none** | **none** | ADR-0025 đ2 |
| `order.complete` (mới) | none | any | none | none | none | any | none | **none** | **none** | ADR-0025 đ6 |
| `payment.receive` (đổi) | own | any | any | none → assigned | none → own | any | none → own | **none** | **none** | ADR-0026 đ10 |
| `payment.refund` (đổi) | none | any | any → none | none | none | any | none | **none** | **none** | ADR-0026 đ10 |
| `ledger.view` (mới) | own | any | own | own | none | any | own | **none** | **none** | ADR-0026 đ7, đ10 |
| `ledger.write` (mới) | none | any | none | none | none | any | none | **none** | **none** | ADR-0026 đ5, đ8, đ10 |

- **DRIVER** (tài xế công ty, ADR-0040) và **DRIVER_PARTNER** (tài xế đối tác, ADR-0048 — quyền **bên ngoài**, đứng một mình, mọi ô nghiệp vụ `none`): **`none` ở cả sáu ô** — tài xế không thu tiền khách trong mọi tài liệu đã duyệt (ADR-0049 tóm tắt 7: tài xế bấm tiến độ chuyến, không có tiền). `ledger.view` của DRIVER = `none` (không phải `own`) vì tài xế không bao giờ là người thu ⇒ "Sổ của tôi" luôn rỗng; mở sau bằng một ô nếu có nghiệp vụ tài xế thu tiền.
- Không thêm mã quyền mới ⇒ không đụng `EXTERNAL_PERMISSIONS` hay trigger LC-1 (`CLAUDE.md` §10, công thức y).
- **Ô đã đổi từ 25/9 (không do lượt này):** `money.view` của FIELD nay là `assigned` (ADR-0030 S23-5), `order.view` của FIELD là `assigned` (S23-1). Trang ghép 25/9 ghi "`money.view` không đổi giá trị" — vẫn đúng với lượt này (lượt này không đổi ô đó); người bấm "Đã giao" (FIELD đang phụ trách) **thấy được** số phải thu/đã thu nhờ S23-5, đúng tiền đề của ADR-0025 đ3d.

## 3. Hệ quả chéo mới (sau 25/9) — thêm vào mục (4) của trang ghép

12. **Hướng dẫn viên tự huỷ / sửa tiền** (`POST /api/orders/:id/handler-cancel`, `…/handler-money-edit`, module `dispatch`, ADR-0014/0030): hai route này **của `dispatch`**, không phải `orders` ⇒ ngoài trigger khoá (ADR-0025 đ5) phải có **từ chối sớm ở route** khi `delivered_at` có (đọc `v_ord_order_state`, cạnh `dispatch → orders` đã có). Kế hoạch liệt kê đủ mọi route ghi đơn của `orders` **và** `dispatch` (kể cả hàng chờ / tự nhận / từ chối của ADR-0030) — test "sau Đã giao mọi route ghi đơn đều từ chối" chạy trên danh sách sinh từ router, không danh sách tay.
13. **Bảng điều phối chung (ADR-0049, accepted 29/9, đang thi công song song trên `thi-cong-adr-0049-*`, migration `0040`–`0043`):** chặng đưa đón, suất khách trên chuyến xe, "Đặt gấp" gắn với đơn/dịch vụ. Điểm chạm: trigger khoá `order_service` của ADR-0025 đ5 chặn **mọi** `UPDATE` trường vận hành từ "Đã giao" — phải rà câu ghi nào của phân hệ Vận chuyển còn đụng `order_service`/`orders` sau chuyến (vd đóng suất khi xe kết thúc). Nguyên tắc: bảng của `van-chuyen` không bị khoá bởi trigger của `orders` (mỗi module khoá bảng của mình — Hiến chương 5.3); nếu Vận chuyển cần ghi vào bảng của `orders` sau "Đã giao" thì đó là câu hỏi mới cho chủ. **Kế hoạch thi công sổ tiền chỉ bắt đầu sau khi ADR-0049 lượt 1 đã gộp `main`** (tránh hai nhánh cùng sửa `orders`/`dispatch`/migration song song).
14. **Thông báo điện thoại (module `thongbao`, ADR-0036/0045):** ADR-0045 chốt "chỉ báo khi **xác nhận** đơn"; chủ giữ luật không báo Quản trị mọi đơn. Áp nguyên tắc đó: "Đã giao" và "Hoàn thành" **không** gửi thông báo màn hình khoá ở lượt này; Bảng tin chỉ làm mới màn hình (ADR-0025 đ8). Không thêm cạnh `billing → thongbao`. *Giả định bề mặt, đảo được — một dòng nếu chủ muốn báo Kế toán khi có đơn "Đã giao".*
15. **`R-BIL-7` = `R-PTY-1`:** kiểm "đúng một hồ sơ công ty chủ" đã có (`scripts/audit-checks.mjs:117-119`); lượt này **dùng lại**, không thêm mã kiểm trùng.
16. **Số hiệu:** migration lấy lúc thi công — hôm nay `main` tới `0039`; nhánh chưa gộp đã dùng `0034`, `0035`, `0040`–`0043`; `0019` giữ chỗ B5; `0036` chưa thấy trên nhánh nào đã rà (kiểm lại lúc đặt số) ⇒ **dự kiến ≥ `0044`**. ADR mới (nếu cần, vd ghi lệch ở §4) bắt đầu từ **ADR-0051**.

## 4. Đối chiếu Hiến pháp + Hiến chương (theo yêu cầu "làm đúng Modular Monolith, tuân thủ hiến pháp và kiến trúc")

### 4.1 Modular monolith (Hiến chương 5.3, `docs/ARCHITECTURE.md` Phần II) — từng luật → rào máy

| Luật | Áp vào lượt này | Rào máy | Đã thấy chặn thật? |
|---|---|---|---|
| Module mới khai cạnh, không vòng | `billing → orders, parties, staff, dispatch, audit`; `receipt → orders, billing, parties, company`; `pricing` lập module rỗng (bảng ở lượt 2) | `architecture.test.ts` (ALLOWED_EDGES + không vòng) | có (bài cũ) |
| Chỉ module chủ ghi bảng mình; ghi chung lô bằng câu chưa chạy | "Đã giao": `billing` gom câu `UPDATE orders` **chưa chạy** từ `orders/index.ts` + câu bảo vệ từ `dispatch/index.ts` vào một `db.batch()` | `EXPLAIN` SQL của module nghiêm (`billing` vào `STRICT` từ ngày đầu) | có cho module nghiêm cũ; `billing` phải thấy đỏ một lần khi thêm |
| `orders` không bao giờ đọc `bil_` | số đã thu/còn lại lấy qua route `billing`; "đã thu trước" trên form lập đơn thành **bước hai** sau khi đơn lưu | 8(b) của `orders` — **nhưng `orders` còn `LEGACY`** (SQL chưa qua `defineSql`) ⇒ rào này **chưa phủ `orders`** | **chưa** — kế hoạch phải thêm bài riêng "không tệp nào của `orders` nhắc `bil_`" (quét + EXPLAIN các câu mới) và thấy đỏ một lần |
| Thân trigger chỉ đọc bảng cùng module / view công bố | trigger khoá (5 bảng) + trigger chỉ-thêm của `bil_*` | bài mới của ADR-0024 đ5 | **chưa** — phải thấy đỏ (cài tạm trigger `orders` đọc `bil_`) + dòng `docs/SO-HANG-RAO.md` |
| Hạng module | `billing` = `STRICT`; `receipt` = hạng mới `KHONG_BANG` (không bảng, không SQL, được chuyển tay cầm) | `architecture.test.ts` | **chưa** — hạng mới phải thấy đỏ một lần |
| Đọc xuyên module chỉ qua view công bố | view mới `v_ord_order_state` (orders), `v_bil_*` (billing) | sổ dữ liệu ↔ schema | có (bài cũ) |

### 4.2 Các điều Hiến chương chạm tiền

| Điều | Ba ADR đã đáp ứng? | Bổ sung đề xuất |
|---|---|---|
| 1.4 / 4.4 Chứng từ = hình chiếu danh sách trắng | có (ADR-0026 đ11, `ReceiptDto` ở máy chủ) | — |
| 4.2 Tiền là hình chiếu của sự kiện, truy ngược trọn chuỗi | có (lần thu → phiếu → dòng, trỏ đơn/lần thu) | — |
| 5.1 Bất biến hai lớp | có (trigger chỉ-thêm, khoá 5 bảng, `CHECK`) | — |
| 5.4 Một nguồn tính tiền | có ("tiền là số đã lưu", `effectiveMoney`) | hàng rào `buildlines-guard` mở rộng: số "đã thu/còn lại" chỉ một hàm trong `billing` |
| 5.5 Chỉ-thêm, dòng đảo, không `CASCADE` | có (bảng `bil_*` `NO ACTION`, đủ 4 cột WHO) | — |
| 5.7 Giữ đối tượng khi thiếu điều kiện | một phần: "Đã giao" bị từ chối có lý do (thiếu tiền, lần thu "chưa rõ", chờ hoàn) | màn đơn hiện **lý do đang giữ + ai phải xử lý** (Kế toán / HDV), không chỉ báo lỗi khi bấm |
| 5.9 Trả dư → chờ hoàn | có (M2) | chờ chủ xác nhận hướng M2 (§6) |
| 5.10 Thông báo không kích hoạt tiền | có (ADR-0025 đ8) | — |
| **5.14 Hai trục thời gian; khoá kỳ** (duyệt 26/9, **sau** ba ADR) | **không** — bảng `bil_*` chỉ có `created_at` (UTC), chưa có ngày phát sinh, chưa có kỳ | **(a) ngay lượt 1:** thêm **ngày phát sinh** (`occurred_date`, ngày dân sự VN) cho lần thu và phiếu sổ — thiếu nó thì dữ liệu ghi từ ngày đầu không bao giờ khôi phục được (cửa một chiều). **(b) Khoá kỳ:** đề xuất hoãn sang lượt 2 dưới dạng **lệch có chủ ý có hạn** — thêm được sau mà không mất dữ liệu (kỳ suy từ ngày phát sinh); câu hỏi §6 |
| 5.15 AI không tính tiền | có | — |
| 5.16 Hộp thư đi | không áp (lượt 1 không gọi hệ thống ngoài) | — |
| **5.17 Sổ vàng** | ADR-0026 có tiêu chí nghiệm thu nhưng **7 ca của `golden/hoan-tat-cong-no.json` đều `cho_xac_nhan`**; 5 ca (01–05) có người hưởng / đại lý ⇒ **lượt 2**; **SV-HT-06, SV-HT-07** (khách lẻ) là ca lượt 1 | kế hoạch thêm các ca lượt 1 còn thiếu (HDV giữ tiền mặt rồi nộp; "Công ty thu – CK" do HDV khai chờ Kế toán xác nhận; khách trả dư chờ hoàn; cọc cũ "chưa rõ") ở trạng thái `cho_xac_nhan`. **Mã sổ chỉ được nhận khi chủ/Kế toán xác nhận các ca lượt 1** (AI không tự xác nhận — N8) |

### 4.3 Hiến pháp

- **N3 / Điều 7.2:** ba ADR là cửa một chiều ⇒ chủ duyệt, AI không tự duyệt. Chữ "1" không đủ (đầu tệp).
- **P15 / N8:** phiên này là **lập kế hoạch**; thi công ở phiên khác; người kiểm độc lập chỉ-đọc sau thi công (việc lớn: dữ liệu + tiền + quyền).
- **P16:** mọi rào mới ở §4.1 phải thấy chặn thật một lần và có dòng ở `docs/SO-HANG-RAO.md`.
- **P8:** các giả định bề mặt trong tệp này (không gửi thông báo điện thoại; DRIVER `ledger.view` = none) ghi rõ, đảo được.

## 5. Không thuộc lượt này (giữ nguyên như 25/9)

Chiết khấu/hoa hồng (D4), người bán / nhà cung cấp / a% (D5), vai Nhà cung cấp — **lượt 2**. Mâu thuẫn ADR-0003 × `order_money_adjustment` (`0021`: không cột WHO, có `CASCADE`) — trình riêng, không chặn lượt 1.

## 6. Câu hỏi gom cho chủ (một lần)

1. **Duyệt lượt 1** (ADR-0024 điều 1–5, ADR-0025, ADR-0026) **kèm các bổ sung ở tệp này** (§2 bảng 9 cột, §3 mục 12–16, §4)? Khuyến nghị: **duyệt**.
2. **M1 — đơn nào được bấm "Đã giao" trước khi có chiết khấu/hoa hồng (lượt 2)?** Khuyến nghị **A**: chặn đơn có người hưởng (bên đặt là đối tác); đơn khách lẻ chạy ngay. (B: chặn mọi đơn tới lượt 2. C: cho mọi đơn, Kế toán nhập tay hoa hồng.)
3. **M2 — khách trả dư** (bớt người sau khi đã trả trước): khuyến nghị **không chặn sửa số khách**; phần dư thành khoản "công ty phải trả lại khách", Kế toán ghi hoàn; đơn chưa "Đã giao" được tới lúc hoàn xong.
4. **Hiến chương 5.14 (ngày phát sinh, khoá kỳ):** khuyến nghị **ghi ngày phát sinh ngay từ lượt 1; khoá kỳ làm ở lượt 2** (ghi "lệch có chủ ý", hạn = lúc lượt 2 lên production).

**Việc của chủ/Kế toán, không chặn việc lập kế hoạch nhưng chặn nghiệm thu mã:** xác nhận con số các ca sổ vàng lượt 1 (SV-HT-06, SV-HT-07 và các ca mới kế hoạch sẽ thêm).
