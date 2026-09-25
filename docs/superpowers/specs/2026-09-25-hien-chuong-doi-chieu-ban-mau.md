# Đối chiếu bản mẫu hiến chương ERP (tư duy Oracle) → Hiến chương kiến trúc lõi Tour Đảo

- **Ngày:** 2026-09-25. **Vai:** lập kế hoạch. **Theo yêu cầu chủ dự án:** *"Rất tán thành ý tưởng của bạn, chúng ta nâng cấp hệ thống từ tầng sâu nhất là việc soạn hiến chương. Hãy lấy hiến chương mẫu này để làm nền tảng và tạo ra cái cho riêng mình."*
- **Bản mẫu:** `/Users/tuanbao/Documents/Projects/CHUNGCATKIENTHUC/hien-chuong-kien-truc-erp-Oracle.md` (5 điều, 18 khái niệm lõi, chuỗi 9 lớp, hình chiếu đa chiều).
- **Kết quả:** Phần I của `docs/ARCHITECTURE.md` (bản đề xuất, chờ duyệt). Bản đồ hiện trạng: `docs/SYSTEM-DESIGN.md` §17.

## 1. Vì sao đặt ở `ARCHITECTURE.md` (không tạo tệp mới, không phải "cao nhất")

- `playbook/FRAMEWORK.md` Phần 4 (bộ tài liệu đóng 9 tệp, v1.5 "không tạo tài liệu thứ 10"): nguyên tắc **tự chọn** về *bằng gì* → `ARCHITECTURE.md` (tầng 2 "Định hình"). Tầng "ràng buộc cấp dự án" dạng `RANG_BUOC_NGOAI.md` dành cho ràng buộc **bên ngoài** ("đúng dù mình chọn gì": luật, thuế, giới hạn nền tảng) — hiến chương kiến trúc là thứ mình chọn nên không đặt ở đó.
- Bản mẫu tự nhận "văn bản chuẩn mực cao nhất". Ở dự án này **không đúng**: cao nhất là Hiến pháp chung (`playbook/CONSTITUTION.md`, chép chỉ-đọc từ Core, ADR-0012); tầng dự án **chỉ được siết thêm** (Hiến pháp 9.7). Hiến chương Tour Đảo vì vậy đứng dưới Hiến pháp, trên mọi ADR. Đây là "tầng sâu nhất" mà một dự án được tự đặt.
- `ARCHITECTURE.md` vốn đã là tài liệu chuẩn tắc ("luật ở `docs/ARCHITECTURE.md`", `CLAUDE.md` §2) → nâng cấp tại chỗ, giữ nguyên luật cũ làm Phần II.

## 2. Từng phần của bản mẫu: áp dụng / điều chỉnh / hoãn

| Bản mẫu | Quyết định cho Tour Đảo | Lý do |
|---|---|---|
| Đ1.1 Doanh nghiệp là hệ quản trị trạng thái số | **Áp dụng** → Điều 1.1 | đúng bản chất app |
| Đ1.2 Chuyển trạng thái là đơn vị hành vi | **Áp dụng** → 1.2, cụ thể hoá bằng "một `db.batch()`" (D1 không có giao dịch dài) | khớp khuôn ghi hiện có (ADR-0002 quy tắc 3) |
| Đ1.3 Mã là hàng hoá, bản thể là điểm kiểm soát | **Áp dụng** → 1.3 | — |
| Đ1.4 Chuỗi 9 lớp | **Điều chỉnh** → chuỗi 7 lớp (gộp Sự kiện vào "giao dịch + nhật ký cùng lô"; gộp Quyết định/Vận hành vào "hình chiếu") | Tour Đảo không có tầng ra quyết định tự động; tách sự kiện thành lớp riêng sẽ đọc như event sourcing |
| Đ2.1 Định danh trước vai | **Áp dụng** (đã có ADR-0001) + **siết**: Tour Đảo cũng là hồ sơ | bài học sổ công nợ: Tour Đảo là bên bán/bên được nợ |
| Đ2.2 Tổ chức đa trục (pháp nhân / đơn vị KD / phòng ban) | **Hoãn** (một pháp nhân) — ghi cách dựng khi cần (vai/quan hệ của hồ sơ tổ chức) | tỷ lệ với công ty 30 người |
| Đ3 18 khái niệm lõi | **Điều chỉnh** → 16 (K1–K16) | xem mục 3 |
| Đ4.1 Hình chiếu kế toán, chuỗi 5 lớp, sổ phụ SLA | **Điều chỉnh** → 4.2: sổ công nợ sinh từ sự kiện theo luật, trỏ về nguồn, chỉ-thêm + đảo | đúng tinh thần SLA, bỏ tầng "bút toán sổ cái" (chưa cần hệ thống tài khoản) |
| Đ4.1 Đa sổ (VAS / IFRS) | **Hoãn** → 4.3 một sổ quản trị | ADR-0004 loại thuế; là ràng buộc bên ngoài khi làm |
| Đ4.1 Truy nguồn hai chiều (`source_ref`) | **Áp dụng** → 4.2 | — |
| Đ4.2 Tách Bên khỏi Tài khoản công nợ, địa điểm giao/nhận, liên hệ | **Điều chỉnh**: hồ sơ + điểm liên hệ (đã có); "tài khoản công nợ" = số dư theo hồ sơ tính từ sổ (view), không bảng riêng; địa điểm giao/nhận hoãn | quy mô; ADR-0010 đã chốt ngưỡng mở rộng TCA |
| Đ4.3 Tách người khỏi quan hệ lao động | **Áp dụng** → 4.5 (đã có ADR-0013, 0018) | — |
| Đ5.1 Bất biến gần trạng thái bền | **Áp dụng + siết** → 5.1 "hai lớp" (Hiến pháp P21) | — |
| Đ5.2 Cấu hình thay tuỳ biến — **Flexfields / JSON Schema** | **Điều chỉnh**: giữ "cấu hình thay tuỳ biến", **bỏ** flexfield/JSON tự do → 5.2 dữ liệu có kiểu + ngày hiệu lực | xung đột ADR-0003 (cột có kiểu, bảng tra cứu, `CHECK`); JSON tự do phá khả năng kiểm bất biến |
| Đ5.3 Hợp đồng dữ liệu, lặp an toàn | **Áp dụng** → K14, 5.3 | — |
| Đ5.4 AI là tác nhân có định danh, qua lệnh có kiểm soát | **Áp dụng** → 5.11 (đã có ADR-0010 điều 3) | — |
| Đ5.5 Kiểm toán bất biến | **Áp dụng** → 5.12 | — |
| Nghị quyết thực thi ("cao nhất") | **Điều chỉnh** → Điều 6 (đứng dưới Hiến pháp; bảng thi hành; lệch phải có ADR) | Hiến pháp Điều 3, 9.7 |

## 3. 18 khái niệm lõi → 16 của Tour Đảo

| Bản mẫu | Tour Đảo | Ghi chú |
|---|---|---|
| 1 Identity | K1 Định danh | + tác nhân tự động có tài khoản riêng |
| 2 Party | K2 Bên | |
| 3 Organization | K3 Tổ chức & địa điểm | gộp địa điểm (ADR-0008) |
| 4 Role & Permission + 5 Data Scope | K4 Quyền = Ai × Thao tác × Phạm vi | gộp: bản đồ quyền đã mang phạm vi (`own/assigned/any`) |
| 6 Business Object | K5 | |
| 7 Document | K6 Chứng từ | + danh sách trắng |
| 8 Event | (gộp vào K12 + 4.1) | không tách lớp sự kiện riêng |
| 9 Command/Action | K7 | |
| 10 Transaction Boundary | K8 | = một `db.batch()` |
| 11 Workflow/Approval | K9 | + **giữ đối tượng** |
| 12 Policy/Rule | K10 | + **chụp tại mốc** |
| 13 Reference/Master Data | K11 | |
| 14 Accounting Projection | K13 | |
| 15 Audit/History | K12 | |
| 16 Metadata/Extension (Flexfields) | **không áp** | xem Đ5.2 |
| 17 Integration/API | K14 | |
| 18 Reporting/Semantic Model | K15 | |
| — | **K16 Thông báo** (mới) | Bảng tin, ADR-0022: hình chiếu, không kích hoạt tiền |

## 4. Nguyên tắc mới (chưa có ADR nào) — chủ dự án duyệt **từng điều, tường minh**, không "duyệt kèm"

- **5.7 Giữ đối tượng khi thiếu điều kiện** (tương đương "hold" của Oracle Order Management).
- **5.8 Bước của luồng gắn với vai trên đối tượng.**
- **5.9 Trả dư thành khoản chờ hoàn** (tương đương "unapplied/on-account credit" của Oracle Receivables).

## 5. Sáu câu đang treo (đợt Hoàn tất) — Hiến chương trả lời thế nào

| Câu (ADR-0024…0026, tin nhắn 25/9) | Điều trả lời | Kết quả khi Hiến chương được duyệt |
|---|---|---|
| 1. Đơn có người hưởng khi chưa có mức chiết khấu | **5.7** giữ đối tượng | đơn bị **giữ** ở bước "Đã giao" với lý do "chưa có mức chiết khấu", Kế toán/Quản trị cài mức thì thả; không lấy 0 |
| 2. Ai bấm "Đã giao" | **5.8** | khung: quyền xét theo **vai "người đang phụ trách" trên đơn** kết hợp mức quyền. Mức quyền nào (chỉ HDV, hay cả Bán hàng đang phụ trách) vẫn là **một ô bản đồ quyền** ghi ở ADR-0025 — Hiến chương không tự quyết ô đó; khuyến nghị: mọi mức được làm người phụ trách |
| 3. "Còn lại" âm | **5.9** | không chặn; phần dư → khoản chờ hoàn; Kế toán ghi hoàn |
| 4. Cộng tác viên hưởng hoa hồng | **2.2** (vai là dữ liệu) + 5.2 | chỉ là một dòng chính sách, không cần quyết định |
| 5. Bảng `order_money_adjustment` | **5.5** + 6.3 | thiếu cột dấu vết là **cố ý** (ADR-0007 điều 2, đạt 5.5); chỉ `CASCADE` là nợ có tên, sửa khi đợt 1 chạm bảng |
| 6. Thứ tự làm | **5.13** nền trước | định danh & quyền (ADR-0019, vá DK) → bên (hồ sơ Tour Đảo) → chính sách → đơn & luồng → sổ tiền → thông báo; Bảng tin (ADR-0022, đã duyệt) chạy song song vì là hình chiếu độc lập |

Hiến chương **định hướng** câu trả lời; câu trả lời cụ thể vẫn **ghi vào ADR-0024…0026** (theo Hiến chương điều X) và chủ dự án duyệt ADR đó như thường lệ (kèm trang ghép khi chạm quyền/dữ liệu). Lợi ích: chủ duyệt ADR bằng cách đối chiếu với nguyên tắc đã chốt, không phải trả lời lại từng câu từ đầu.

**Lưu ý mốc chụp (H5):** chủ dự án trả lời trong phiên chat 2026-09-25 rằng chụp mức chiết khấu/giá vốn/người bán **lúc Xác nhận**; ADR-0018 điều 11 (đã duyệt) ghi **"lúc gửi đơn"**. Hiến chương không tự đổi câu đó (5.6); ADR-0024…0026 phải ghi rõ là thay ADR-0018 điều 11 và chủ xác nhận khi duyệt.

## 6. Việc kèm theo (không tự làm — N9)

- Đề xuất sửa `CLAUDE.md` §2 và §6 để trỏ tới Hiến chương: `docs/superpowers/proposals/2026-09-25-claude-md-hien-chuong.md` (chủ duyệt mới có hiệu lực).
- Kiểm độc lập (chỉ đọc) bản đề xuất trước khi trình.
- Không trình cùng lượt với ADR-0024…0026.

## 7. Đối chiếu khung "Enterprise OS" (`/Users/tuanbao/Documents/Projects/CHUNGCATKIENTHUC/ENTERPRISE_FRAMEWORK.md`, chủ dự án gửi 2026-09-25)

Chủ dự án: *"đây là khung của Enterprise OS để tham chiếu cho toàn bộ dự án của chúng ta. Hãy tiếp tục phân tích sâu để điều chỉnh ở tầng kiến trúc."*

### 7.1 Vị trí: Hiến pháp hay `ARCHITECTURE.md`?

- `playbook/CONSTITUTION.md` là **bản chép chỉ-đọc từ Core**, dùng chung mọi dự án của chủ; repo này **không được sửa** nó (ADR-0012, `playbook/PIN-README.md`). Sửa Hiến pháp chỉ làm ở **repo Core** theo Hiến pháp Điều 9, rồi chép bản mới về đây.
- **Khuyến nghị hai tầng:**
  - Phần **dùng chung mọi dự án** của Enterprise OS (5 bản chất của hệ thống ghi nhận; lõi tất định, AI không tính tiền; hộp thư đi; sổ vàng; cưỡng chế bằng máy) → **đề xuất sửa Hiến pháp ở Core** (việc riêng, chủ làm ở Core; bản đề xuất có thể soạn từ mục 7.2).
  - Phần **riêng Tour Đảo** (16 khái niệm lõi, bản đồ module, 5.7–5.9, mốc, vai) → **`ARCHITECTURE.md` Phần I** (có hiệu lực ngay khi chủ duyệt, không chờ Core).
  - Khi Core đã có điều tương ứng, điều trong `ARCHITECTURE.md` rút gọn thành "theo Hiến pháp điều X" (tránh hai nguồn — N7).

### 7.2 Từng phần của Enterprise OS

| Enterprise OS | Tour Đảo | Ghi vào |
|---|---|---|
| I.1 Người sáng lập làm kiến trúc sư/chuyên gia nghiệp vụ/người kiểm | đã là cách làm (chủ quyết, AI thi công, kiểm độc lập) | Hiến pháp P7, P15 (đã có) |
| I.2.1 Sự kiện là gốc, bút toán là hệ quả | **áp dụng** | Hiến chương 4.2 |
| I.2.2 Sổ bất biến, ghi thêm, đảo | **áp dụng** | 5.5 |
| I.2.3 **Hai trục thời gian + khoá kỳ** | **áp dụng (mới)** | **5.14** |
| I.2.4 Quy tắc là dữ liệu có phiên bản, không viết cứng | **áp dụng** | 5.2, 5.6 |
| I.2.5 Truy nguồn đến quy tắc + người duyệt | **áp dụng, mở rộng 4.2** | 4.2 |
| I.2 Lưu trữ 10 năm (NĐ 174/2016/NĐ-CP) và các luật thuế/BHXH/TT99 | **ràng buộc bên ngoài** — chưa xác định có áp cho sổ **quản trị nội bộ** của Tour Đảo hay không; D1 Time Travel chỉ giữ 30 ngày | **`docs/RANG_BUOC_NGOAI.md` — chưa có** (tệp thuộc bộ 9, `FRAMEWORK.md` v1.4) |
| II.1 Modular monolith, cấm import chéo bằng máy | **đã có** | 5.3, `architecture.test.ts` |
| II.2 PostgreSQL, tiền số nguyên | CSDL là Cloudflare D1 (SQLite) — cùng tinh thần giao dịch nguyên khối (`db.batch`); tiền `INTEGER` đã có | K8, 5.4 |
| II.2 Đa khách thuê + RLS | **không áp** (một công ty, hệ thống nội bộ). Phạm vi dữ liệu theo người (`own/assigned`) thi hành ở `can()` | K4 |
| II.3 **Lõi tất định; AI không tính tiền** | **áp dụng (mới, tường minh)** | **5.15** |
| II.4 **Transactional outbox**; hàng đợi | **áp dụng (mới)**; hiện có dạng nhẹ (`notified_at`); hàng đợi Cloudflare Queues khi cần | **5.16** |
| III.1 Cấu trúc repo (CONSTITUTION, CLAUDE, RANG_BUOC_NGOAI, GLOSSARY, golden/, .claude/…) | có: CONSTITUTION (chép), CLAUDE, ARCHITECTURE, DESIGN (`docs/design`), thuật ngữ (`SYSTEM-DESIGN` §15 + sổ dữ liệu), `.claude/hooks`, `agents` (người kiểm độc lập). **Thiếu:** `RANG_BUOC_NGOAI.md`, sổ vàng | — |
| III.2 **Sổ vàng** 30–50 ca đúng từng đồng | **áp dụng (mới)** — trước khi làm sổ công nợ | **5.17** |
| III.3 Lời dặn ≠ cưỡng chế; tách người viết/người chấm; đòi bằng chứng | **đã có** | Hiến pháp P16, N8; sổ hàng rào |
| III CI chặn merge khi trượt test | **thiếu một phần**: `day-len`/`trien-khai` chạy test trước khi gộp/triển khai; không có CI trên GitHub (Cloudflare chưa nối GitHub) | quy trình (không phải kiến trúc) |
| IV Quản trị ngữ cảnh, phân tầng model | quy trình làm việc của AI — không thuộc kiến trúc | CLAUDE.md §6 (đọc đúng lúc) đã có tinh thần này |
| IV.3 Phân quyền lệnh nguy hiểm, bí mật | **đã có** (hook `guard-remote`, `permissions.deny`, N10) | CLAUDE.md §8 |
| V Lộ trình SaaS 12 tháng | **không áp** — Tour Đảo là hệ thống nội bộ, không bán SaaS | — |
| VI Bẫy 1 "tài liệu thay cho giao hàng" | **đang có dấu hiệu** (25/9: nhiều tài liệu, một bản vá lên production) → sau khi duyệt Hiến chương, ưu tiên giao **một lát đầu–cuối** có sổ vàng | lộ trình |
| VI Bẫy 2 bom phạm vi | cảnh giác: đợt Hoàn tất thêm 3–4 module mới → chia lượt, làm lát mỏng trước | 5.13 |
| VI Bẫy 3, 4 | đã chặn (kiểm độc lập; 5.15) | — |
| VI Bẫy 5 sửa CSDL production bằng tay | đã chặn bằng hook; **ngoại lệ đang có**: tắt bảo trì bằng SQL khi chủ bị khoá (`docs/HANDOFF-N1.md`) — ngoại lệ cứu hộ có tên | CLAUDE.md §8 |
| VI Bẫy 6 rẽ nhánh cho khách đặc biệt | đã cấm (không viết cứng i-resort, Tour Đảo) | 2.1, 2.2 |
| VI Bẫy 8 sao lưu chưa từng khôi phục | **chưa kiểm**: mỗi lần triển khai tạo điểm khôi phục Time Travel, nhưng chưa thấy ghi nhận khôi phục thử | `docs/HANDOFF-N1.md` (runbook) — việc vận hành |
| VI Bẫy 10 một người là điểm chết | có runbook `HANDOFF-N1.md`, `QUY-TRINH-PHAT-HANH.md` | — |

### 7.3 Hai tài liệu còn trống (đề xuất, chủ duyệt)
1. **`docs/RANG_BUOC_NGOAI.md`** — ràng buộc bên ngoài (luật, thuế, giới hạn Cloudflare/iOS), mỗi dòng có nguồn + ngày kiểm lại (`FRAMEWORK.md` v1.4). Câu đầu tiên cần trả lời: sổ công nợ nội bộ có phải "sổ kế toán" theo luật (lưu 10 năm) không.
2. **Sổ vàng** — bộ ca tiền (bắt đầu từ ví dụ 5.1, 5.2A/B của đặc tả Hoàn tất) do chủ/Kế toán xác nhận, trước khi thi công sổ công nợ.

## 8. Cấu trúc luật cho nhiều dự án — Hiến pháp chung hay riêng? (2026-09-25)

Chủ dự án hỏi: *"Kiểm tra lại xem cấu trúc như thế nào là hợp lý, chiếu theo thực hành tốt và tài liệu chính thức của Anthropic và tài liệu Enterprise OS? Liệu Hiến pháp đặt nền của mọi dự án hay đặt riêng cho từng dự án?"*

### 8.1 Tài liệu chính thức của Anthropic (tra 2026-09-25, qua subagent `claude-code-guide`)
- Bốn tầng `CLAUDE.md`: tổ chức (macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`), người dùng (`~/.claude/CLAUDE.md`, mọi dự án trên máy), dự án (`./CLAUDE.md`, commit vào git), cá nhân trong dự án (`CLAUDE.local.md`); `CLAUDE.md` thư mục con nạp khi cần; nhập bằng `@đường-dẫn` — https://code.claude.com/docs/en/memory.md
- `CLAUDE.md` là **lời khuyên**, hook mới **chắc chắn**: "Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead." (memory.md); "Unlike CLAUDE.md instructions which are advisory, hooks are deterministic" — https://code.claude.com/docs/en/best-practices.md
- Mỗi `CLAUDE.md` nên dưới ~200 dòng; dài thì tách theo thư mục/`.claude/rules` (best-practices.md). Hiện: `CLAUDE.md` 121, `src/CLAUDE.md` 33, `web/CLAUDE.md` 45 — đạt.
- Cài đặt (quyền, hook) gộp theo tầng; `~/.claude/settings.json` áp mọi dự án trên máy — https://code.claude.com/docs/en/settings.md
- Plugin đóng gói kỹ năng, agent, hook dùng lại cho nhiều repo; **không** chứa `CLAUDE.md`; **không nạp ở phiên cloud/web** — https://code.claude.com/docs/en/plugins/overview.md
- Tài liệu chính thức **không** nói về mô hình "Hiến pháp chung + bản chép ghim"; đó là cách của playbook (ADR-0012).

### 8.2 Hiện trạng trên máy (đo 2026-09-25, chỉ đọc)
Có **ba dòng Hiến pháp**, dòng nào cũng tự ghi "áp cho mọi dự án":
| Nơi | Phiên bản | Dự án dùng |
|---|---|---|
| `Master-Project-Framework/CONSTITUTION.md` | v2.2.0 (2026-06-10) | — |
| `CoreSchemaProject/playbook/CONSTITUTION.md` | v2.3.0 (2026-08-22) | tourdao-sales, pt-hdv (bản ghim khớp băm); nhatrangtravel, Aquanova còn ghim **v2.2.0** |
| `ketoanvn/CONSTITUTION.md` | **v3.1.0** (2026-08-23), rẽ nhánh từ v2.2.0, cùng số hiệu P1–P21/N1–N10 | ketoanvn |
⇒ Hiến pháp chung đang **vi phạm chính N7** ở cấp danh mục dự án. Không có `~/.claude/CLAUDE.md` và không có tệp cấp tổ chức.

### 8.3 Khuyến nghị (chủ dự án quyết — việc liên dự án, repo này không tự làm; N4)
1. **Một Hiến pháp chung duy nhất cho mọi dự án**, có phiên bản, sống ở **một kho riêng chỉ chứa luật** (không lẫn trong một dự án website như `CoreSchemaProject`). Hợp nhất v2.3.0 + v3.1.0 (cùng gốc) thành một bản, bổ sung nguyên tắc chung của Enterprise OS (sự kiện là gốc; sổ chỉ ghi thêm; hai trục thời gian; quy tắc là dữ liệu có phiên bản; truy nguồn; lõi tất định — AI không tính tiền; hộp thư đi; sổ vàng).
2. **Mỗi dự án chép bản ghim chỉ-đọc** của Hiến pháp (giữ cách ADR-0012): đi cùng mã trong git, phiên cloud/web vẫn thấy (cấp người dùng và plugin không nạp ở cloud), biết chính xác dự án theo phiên bản nào. Dự án cũ nâng ghim lên bản hợp nhất.
3. **Mỗi dự án có hồ sơ riêng chỉ siết thêm** (Hiến pháp 9.7): `RANG_BUOC_NGOAI.md` (ràng buộc bên ngoài), `ARCHITECTURE.md` (hiến chương kiến trúc riêng — Phần I ở đây), các tài liệu còn lại của bộ 9.
4. **`CLAUDE.md` ngắn** (< 200 dòng), là bản đồ + lệnh + điều cấm; chi tiết theo thư mục.
5. **Cưỡng chế bằng máy** tách hai loại: rào **dùng chung** mọi dự án (chặn lệnh ghi hệ thống thật, `--force`, đọc bí mật) → có thể đặt ở `~/.claude/settings.json` hoặc đóng gói plugin; rào **riêng dự án** (test kiến trúc, trigger, `guard-remote`) → trong repo.
6. Tuỳ chọn: `~/.claude/CLAUDE.md` vài dòng trỏ "mỗi dự án có `playbook/CONSTITUTION.md`, tuân theo nó" — lưới an toàn cho dự án mới chưa ghim; không chép nội dung Hiến pháp vào đó (tránh nguồn thứ hai).
7. Với Tour Đảo: Phần I `ARCHITECTURE.md` giữ **phần riêng**; khi Hiến pháp hợp nhất có điều chung tương ứng, rút điều đó thành "theo Hiến pháp điều X".
