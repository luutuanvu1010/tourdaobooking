# Khắc phục kiểm toán 1–2/10: kiểm lại, nguyên nhân gốc, phương án (2026-10-02)

> **Trạng thái:** tài liệu lập kế hoạch (phiên vai "lập kế hoạch"). Chỉ dùng quyết định **đã duyệt**; chỗ nào cần quyết định mới thì ghi "cần chủ".
>
> **Lời chủ (nguyên văn, chat 2026-10-02):** *"Gộp nhánh rồi, giờ bắt đầu lên kế hoạch xem và đánh giá lại Audit đó để đảm bảo nó đúng. Sau đó chốt nguyên nhân gốc (Root) -> Đưa ra phương án khắc phục triệt để (đối chiếu với khung dự án và triết lý đã chốt) -> Lập kế hoạch thi công -> Đối chiếu lại để đảm bảo vấn đề khắc phục -> Cập nhật vào tiến độ dự án"*
>
> **Lộ trình thi công:** `docs/superpowers/plans/2026-10-02-khac-phuc-audit-00-lo-trinh.md`.

## 1. Kiểm lại hai cuộc đánh giá (bước 1)
Hai người kiểm độc lập, làm trên `main` @`fc268abe`. Báo cáo gốc đo ở `0ba370d6`, cách 95 commit.

### 1a. Đánh giá Giám đốc Kiến trúc 1/10 (đọc mã, chỉ đọc)
- **Mức CAO:** 8/9 **xác nhận** bằng mã.
  - **GD-T-01 đã xử lý:** F-02, F-03 đã vào sổ dừng dây chuyền.
  - Hạ mức: **GD-R-02** (đường nạp lại bản sao) xuống TRUNG BÌNH, vì đó là điều chưa chứng minh, không phải lỗi. **GD-L-09** (không đo tốc độ) xuống TRUNG BÌNH, vì nhật ký Cloudflare đã có thời gian từng lần gọi. **GD-L-15** thành TRUNG BÌNH–CAO.
- **Mức TRUNG BÌNH (24):**
  - phần lớn xác nhận;
  - **bác GD-B-04** (ADR-0080:59 đã phủ);
  - **đã sửa GD-R-04**;
  - nói quá: GD-L-07 (chỉ Quản trị mới tới 4 lần gọi mỗi trang);
  - không kiểm được: GD-S-04 (pháp lý), GD-R-07 (con người).
- **Bổ sung** (báo cáo gốc bỏ sót):
  - **D4:** tài khoản trỏ hồ sơ đã ngưng vẫn đăng nhập được. Bài `tests/audit/redteam.test.mjs` vẫn báo FINDING. Mức TRUNG BÌNH.
  - **Cửa khẩn cấp `scripts/create-staff.mjs`** nạp bằng tệp SQL, đúng đường mà `docs/HANDOFF-N1.md:597` ghi là bị OAuth từ chối. Chủ có thể **không có cửa khẩn cấp dùng được**.
  - **Câu xác thực nặng** (GD-L-01) còn nằm ở các route đăng nhập Face ID (`src/modules/auth/index.ts:318,324`).

### 1b. Thử nghiệp vụ 100 tình huống 1→2/10 (chạy lại thật)
- Chạy lại **100/100** trên 10 bản Nền tảng tạm; không đụng production.
- **Cả 59 dòng gắn cờ (❌ / ⚠️ / MẤT TIỀN / MẤT VÉ) VẪN LỖI, cùng hành vi.** 0 dòng đã hết, 0 kết luận cũ sai.
- Lý do: 95 commit không chạm `src/modules/billing/`, không thêm khoá chống gửi lặp, không đổi tiền đơn huỷ, không đổi bên đặt của đơn Đối tác.
- **Cả 6 gốc mã G1–G6 còn nguyên.** G6 nay có tệp:dòng: `src/modules/orders/service.ts:396`.
- **Hiệu chỉnh mức** (báo cáo cũ nói quá):
  - **G1:** sổ vẫn ghi đúng cọc đã thu, không đồng nào chuyển sai. Cái sai là **biên nhận gửi khách ghi "Còn lại"**, không có dấu cần hoàn, không có nút hoàn trên màn.
  - **G2** nặng nhẹ theo lệnh:
    - 12 (thu lặp trước Đã giao): **mất tiền thật**, vì HDV thu thiếu;
    - HD10: có lưới đỡ (Đã giao bị chặn "trả dư");
    - KT03 (hoàn lặp): sổ sai;
    - KT04 (nộp lặp): mất tiền khi Kế toán trả theo số sổ.
  - **"23 MẤT TIỀN"** là số kịch bản **nhắm vào** tiền, không phải 23 lần mất tiền.
- Báo cáo đầy đủ của hai người kiểm: `docs/superpowers/specs/2026-10-02-khac-phuc-audit/kiem-lai-kien-truc.md`, `kiem-lai-ux.md` (cùng thư mục).

## 2. Nguyên nhân gốc (bước 2)
Mỗi gốc trả lời ba câu: **cơ chế nào thiếu**, **vì sao hàng rào hiện có không chặn**, **điều Hiến chương nào đang hở** (theo bảng thi hành, `docs/ARCHITECTURE.md` Điều 6).

| Gốc | Cơ chế thiếu | Vì sao không bị chặn | Hiến chương hở | Phát hiện quy về gốc này |
|---|---|---|---|---|
| **R1 — Lệnh ghi không mang "danh tính ý định"** | Lệnh không có khoá lần gửi. Gửi lại sau mất sóng thì máy chủ coi là lệnh mới (`billing/service.ts:106` sinh mã mới mỗi lần) | K8 chỉ nói "một lô nguyên khối"; K14 chỉ nói tích hợp ngoài chạy lại không trùng. **Không điều nào nói về máy khách gửi lại** | K8/K14 thiếu; 1.2 "dựa vào kỷ luật" | G2 (11, 12, 13, 15, HD10, KT03, KT04), F-02, GD-R-05, redteam R1/R2 |
| **R2 — Bất biến tiền chỉ kiểm ở một lệnh, một mốc; sổ thiếu lớp CSDL** | "Đã thu = phải thu" chỉ so **tại mốc** Đã giao. Đảo, nộp, điều chỉnh không kiểm không âm hay trần. Tổng tiền đơn đã xác nhận chỉ khoá ở mã | Bảng thi hành 5.1 ghi rõ "khoá tiền đơn đã xác nhận **chỉ ở mã**". `audit-invariants` chưa có kiểm sổ tiền mới (KT10: thoát 0 khi sổ âm 5 tỷ) | 5.1, 4.2 (bất biến cân đối), 5.17 (sổ vàng chưa chạy trên mã sổ) | G3 (30, KD06, DT05, 49), G4 (KT02, KT04, KT05, KT06, KT09, KT10, 42), F-03, GD-B-02, redteam D1/D2 |
| **R3 — Vòng đời đơn thiếu nhánh "huỷ" trong hình chiếu tiền** | `phaiThuCua` (`orders/hoan-tat.ts:9-17`) không xét đơn huỷ; không có đường duyệt/chi hoàn | Điều 5.9 (trả dư thành chờ hoàn) đang ghi "**chưa có**" | 5.9 | G1 (09, 26, HD06, HD08, QT05, DT04, KT01), TNV-G1 |
| **R4 — Hình chiếu thiếu người nhận** | Sự kiện đã ghi đúng, nhưng không màn hay tin nào đưa tới người cần biết | Chuỗi bảy lớp (1.4) dừng ở lớp "trạng thái": lớp **hình chiếu** cho Kế toán, tài xế, đối tác, người lập chưa làm | 1.4, K13 (hình chiếu tiền), K16 | G5 (KT01, KT08, KD02/03), G8 (KD08, QT06, DT08, 39, KD01, 34), G9 (29, HD01/02/08/09, QT03, KD09, DT09), G10 HD03 |
| **R5 — Tách nhiệm vụ và danh tính dựa vào kỷ luật** | Người cấp quyền hay đặt lại PIN biết PIN dùng lâu dài và đăng nhập thay được; tự thu rồi tự nộp; đơn 0 đồng tự xác nhận; hồ sơ ngưng vẫn đăng nhập | Cấp bậc vai chỉ chặn "cấp trên", không chặn "**cấp quyền tiền**"; hai cờ `active` (tài khoản, hồ sơ) độc lập | 2.3, 4.5, K1, K4 | G7 (QT04, KT07, 02, 03, DT03, DT06), GD-P-01, GD-S-01, GD-R-06, D4 |
| **R6 — Vai "bên đặt" suy sai từ người lập** | Đơn do Đối tác lập vẫn tạo hồ sơ vai `CUSTOMER`, không có quan hệ `CUSTOMER_OF` (`orders/service.ts:396`) | ADR-0077 đ3 đã duyệt nhưng chưa thi công | 2.1, 5.8 | G6 (45, DT02), GD-A-01 |
| **R7 — Vận hành không có đường lùi ngoài Cloudflare** | Không sao lưu ngoài, chưa diễn tập khôi phục, cửa khẩn cấp có thể không chạy, không có chốt Toàn quyền | Đặc tả diễn tập 22/9 vẫn là bản thảo; không có hàng rào nào | (ngoài Phần I; Hiến pháp P17-loại vận hành) | GD-R-01, GD-R-02, GD-R-06, bổ sung "cửa khẩn cấp" |
| **R8 — Truy vấn đọc nặng ở đường nóng** | Câu xác thực quét toàn bảng hồ sơ mỗi request; hộp thông báo 6 view + LIMIT 3000; N+1 ở "Việc của tôi"; Bảng tin nối lại tải lại hết | Bài `query-plan.test.mjs` **không phủ** câu xác thực | (không có điều riêng; P-hiệu năng) | GD-L-01, L-02, L-03, L-05, L-07, L-15 |

| **R9 — Lệnh đổi trạng thái không mang "phiên bản đã thấy"** *(thêm sau vòng đối chiếu độc lập)* | Đường **sửa** đơn có khoá lạc quan (`v` theo `updated_at`, ADR-0003 điều 6). Lệnh **đổi trạng thái** (xác nhận, nhận, đổi người phụ trách) đọc `updated_at` ngay trong request, không so với bản người dùng đang xem | Không bài nào thử "A xem bản cũ, B sửa, A xác nhận". Lớp vé (R1) **không** bắt được, vì A và B là hai ý định khác nhau | 5.1; ADR-0003 điều 6 (khoá lạc quan) chỉ áp cho đường sửa | 15, GD-A-02, HD02 (đổi người đúng lúc HDV bấm "Nhận" bị ghi đè) |

**Ngoài chín gốc:**
- **G10** (trẻ em tại bến, năm sinh / loại khách) cần quyết định nghiệp vụ.
- **G11** đã có quyết định (ADR-0027 R2(a)).
- **G12** (câu báo, tìm không dấu) là việc nhỏ.

## 3. Phương án triệt để (bước 3)
Nguyên tắc chọn phương án: sửa ở **lõi một lần** (theo lời chủ: *"không phải đi vá thế này"*), không vá từng màn. Mỗi phương án có **hàng rào máy** đã thấy chặn thật (P16, `docs/SO-HANG-RAO.md`).

| Gốc | Phương án | Căn cứ đã duyệt | Còn cần chủ |
|---|---|---|---|
| R1 | **Lớp chống ghi trùng chung:** vé ở `web/api.ts`, ghi cùng `db.batch`, router làm thay 128 route, HMAC, R2, phát hành từ từ. Thêm khái niệm lõi K17 | **ADR-0094 accepted** | Sửa Hiến chương Phần I (K17, lệch hẹp 5.5): chủ duyệt diff khi tới |
| R2 | (a) **I1 đúng mọi lúc**, lệnh "Thay lần thu", bảng trách nhiệm. (b) **Sổ không đổi dấu**, trần điều chỉnh, mã giao dịch ngân hàng, cảnh báo thu tiền mặt giống nhau. (c) **F-03:** `subtotal = Σ line_total` ở CSDL + một hàm tính dòng. (d) **Kiểm sổ tiền mới** trong `audit-invariants` và sổ vàng chạy trên mã sổ | (a) ADR-0088, (b) ADR-0092: **proposed**, Q đã áp. (c) luật cũ (5.1, 5.4), không cần ADR. (d) 4.2, 5.17 | **"Duyệt" ADR-0088 + ADR-0092** trước khi thi công (a), (b) |
| R3 | **Đơn huỷ:** "còn lại" = 0, cọc giữ, hoàn hai bước, hạn 60 ngày, chuyển tiền có duyệt, đơn cũ hoàn tay có Quản trị xác nhận | **ADR-0089 accepted** (X-4 chủ chọn 2/10) | — |
| R4 | (a) **HDV "Từ chối"** (trả về kho, không huỷ đơn khách). (b) **Báo tin khi đơn đổi sau xác nhận**. (c) **Nhắc gọi báo khách** khi giờ hẹn đổi. (d) **Ngưng tài khoản** phải cảnh báo đơn và tiền đang giữ. (e) **Màn sổ Kế toán** (cần hoàn, đơn huỷ giữ cọc, sự cố tiền) | (a) ADR-0030 lượt 2, (b) ADR-0062, (c) ADR-0051: **accepted**. (d) ADR-0013 (nghỉ việc = đóng vai) — áp nguyên tắc. (e) ADR-0089 đ9c | (e) **bản vẽ Claude Design**. (d) cảnh báo hay chặn: theo nguyên tắc 5.7 "giữ đối tượng" — chọn "giữ + hiện lý do", ghi ở kế hoạch. Phần "sửa địa điểm đổi chặng tương lai" (QT06) **cần chủ** |
| R5 | (a) **Quyền tiền chỉ Toàn quyền**. (b) **PIN tạm**. (c) **Xác thực hai lớp**. (d) **Tài khoản trỏ hồ sơ đã ngưng thì không đăng nhập, và phiên đang mở bị cắt** (D4). Hai cờ `active` vẫn là hai cờ: tài khoản thuộc `staff`, hồ sơ thuộc `parties`. Kiểm ở **câu xác thực mỗi request** (không chỉ lúc đăng nhập) + kiểm định kỳ `audit-invariants`. **Không** đặt trigger chéo hai module (Hiến chương 5.3: trigger chỉ đọc bảng của chính module hoặc view công bố); việc dùng view công bố cho trigger để thi công cân nhắc. Vì D4 tái hiện bằng SQL thẳng (`tests/audit/redteam.test.mjs:258`), lớp CSDL (5.1) đang **dựa vào kiểm định kỳ**; ghi rõ ở sổ hàng rào. **Phụ thuộc:** Đợt 6 viết lại chính câu xác thực này (bỏ quét bảng), nên làm Đợt 3 phần D4 **cùng hoặc sau** Đợt 6 phần câu xác thực, để không sửa câu hai lần. (e) KT07 tự thu tự nộp, đơn 0 đồng tự xác nhận | (a) ADR-0090, (c) ADR-0074: **accepted**. (b) ADR-0093: **proposed**. (d) ADR-0013 + Hiến chương 4.5 — áp nguyên tắc | **"Duyệt" ADR-0093.** (e) **cần chủ** (chưa có ADR) |
| R6 | **Đơn Đối tác ghi đúng bên đặt** + quan hệ `CUSTOMER_OF` | ADR-0077 đ3 accepted | — |
| R7 | **Sao lưu ra ngoài Cloudflare** theo lịch, **diễn tập khôi phục** có biên bản, **sửa cửa khẩn cấp** chạy được bằng `--command`, **chốt "luôn còn một Toàn quyền"** | Đặc tả 22/9 diễn tập **bản thảo** | **Duyệt đặc tả 22/9** (nơi lưu bản sao, ai giữ khoá) |
| R9 | Mọi lệnh **đổi trạng thái** mang phiên bản đã thấy (`v`), như đường sửa; lệch thì 409 "đơn vừa được người khác sửa, tải lại để xem". Áp **chung ở một chỗ** (hàm kiểm phiên bản dùng cho mọi route trạng thái của đơn và phân công), có bài kiểm phủ route | ADR-0003 điều 6 (khoá lạc quan) — áp nguyên tắc đã duyệt, không cần ADR mới | — |
| R8 | Bỏ quét bảng ở câu xác thực (view theo khoá), phân trang hộp thông báo, gom N+1, Bảng tin nối lại chỉ tải phần thiếu; thêm câu xác thực vào `query-plan.test.mjs` | Không cần ADR (hiệu năng; 5.3 giữ ranh giới) | — |

## 4. Đối chiếu khung dự án
- **Hiến pháp:**
  - N3: mọi phương án dựa trên ADR đã duyệt; chỗ chưa duyệt ghi "cần chủ".
  - N8, P15: thi công ở phiên khác, có người kiểm độc lập.
  - P16: hàng rào phải thấy chặn thật.
- **Hiến chương:**
  - 1.2: một lô ghi → R1.
  - 4.2, 5.1: bất biến hai lớp → R2.
  - 5.9: trả dư → R3.
  - 1.4: đủ bảy lớp → R4.
  - 4.5, K1: danh tính → R5.
  - 2.1: bên trước vai → R6.
  - 5.17: sổ vàng → R2, R3.
- **Luật dừng dây chuyền:**
  - F-02 (R1, hạn 15/10), TNV-G1 (R3, hạn 15/10), F-03 (R2c, hạn 31/10), TNV-G3 (R2a, ADR-0088, hạn 31/10), TNV-G4 (R2b, ADR-0092, hạn 31/10).
  - **Mọi đợt chạm vùng đang hở phải ghi "xây trên lỗ đang hở".**

## 5. Giới hạn
- Tải thật (1.000 người, ms trên D1) chưa đo, chỉ kiểm cơ chế.
- Pháp lý (GD-S-04) và con người (GD-R-07): ngoài phạm vi kiểm bằng mã.
- Lần kiểm lại 100 tình huống chạy ở tầng API; khẳng định về nút và màn là đọc mã.
