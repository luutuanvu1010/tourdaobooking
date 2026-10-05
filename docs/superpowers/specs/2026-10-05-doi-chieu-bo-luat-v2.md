# Đối chiếu CRM Tour Đảo với bộ luật v2.0.0 của kho luật gốc

- Ngày: 2026-10-05. Người soạn: AI (phiên tourdao-sales), tổng hợp ba báo cáo chỉ đọc chạy song song (Hiến pháp; Hiến chương; lớp vận hành). Trạng thái: bản đối chiếu, chưa đổi luật nào đang áp ở CRM.
- Nguồn đối chiếu: `Master-Project-Framework` tag `v2.0.0` (commit 8fae544): Hiến pháp v4.1.0, Hiến chương hệ thống v1.1.0 (nền chuẩn cho mọi dự án), Mô hình dữ liệu lõi v1.0.1, Kernel 18 v1.0.0, GOVERNANCE v1.0.0, PLAYBOOK v1.1.0; hồ sơ `archive/2026-09-26-*.md` của kho.
- Mục tiêu của chủ dự án: CRM đang chạy thật; không bỏ cái đang có, mà làm nó tốt hơn theo khung mới. Hai lớp phải đối chiếu: (a) tư duy Oracle cho phần mềm doanh nghiệp (Hiến chương, Kernel 18); (b) kiến trúc vận hành chuẩn doanh nghiệp cho đội một người cùng AI (CLAUDE.md, Hiến pháp, kiến trúc, token thiết kế, luật thực thi, quy trình, hàng rào).

## 1. Kết luận

1. CRM chưa nâng ghim lên v2.0.0 được, vì hai chướng ngại độc lập:
   - QĐ-H12 / Hiến pháp N2: chưa có môi trường thử giống thật. `wrangler.jsonc` chỉ có một route thật và một D1; local lệch thật ở Turnstile, `PASSKEY_RP_ID`, Email Service. Bản ghim hiện tại (`playbook/FRAMEWORK.md:748`) cũng đã đòi staging, nên đây không phải nợ mới.
   - QĐ-P06: phiên hợp nhất luật thực thi chưa làm. Tag v2.0.0 thiếu `FRAMEWORK.md`, `ai/WORKFLOW.md`, `ai/PROMPT_FACTORY.md`, `ai/qa-reports/TEMPLATE.md`, bảng cổng QA1/QA2 (GOVERNANCE 4.3–4.4) và tiêu chí PQ (4.7) của bản Core. Nâng bây giờ thì CRM mất những thứ đó.
2. Làm ngay được, không đụng mã: tờ khai `docs/kernel-18.md` (đã soạn, kịch bản kiểm đạt); bản đối chiếu này; QĐ-P08 (ADR-0101 sửa lời khai "do Core sở hữu", không chạm `playbook/`).
3. Hiến chương chung khớp rộng với Phần I của `docs/ARCHITECTURE.md` (Hiến chương chung được khái quát từ chính phần này). CRM chặt hơn ở chín điều (giữ làm lớp siết), lỏng hơn ở khoảng chín điều (cần ADR hoặc khai lệch có chủ ý).
4. CRM có nhiều phần vận hành tốt hơn kho gốc; các phần đó nên đưa lên kho gốc trong phiên hợp nhất luật thực thi, trước khi bất kỳ dự án nào nâng ghim.

## 2. Lớp Hiến pháp: v2.3.0 (đang ghim) so với v4.1.0

Số P1–P21, N1–N10 và khung Điều giữ nguyên, nên các viện dẫn trong `CLAUDE.md` vẫn trỏ đúng điều. Khác biệt thực chất và chỗ CRM dựa vào:

| Mức | Điều v4.1.0 | Thay đổi | Chỗ CRM dựa vào | Việc |
|---|---|---|---|---|
| Cao | N2 | Cấm ra thật không qua môi trường thử giống thật | `docs/HANDOFF-N1.md:413-427`, `scripts/release-lib.mjs:235` | Chủ quyết: dựng staging hay giữ v2.3.0 (H12 phương án A) |
| Cao | P8 + cổng 8.1 | Trục "chạm vùng một chiều"; giả định tự chọn ghi vào bản ghi quyết định; cổng phát hành chỉ mở khi chủ đã xem mọi giả định từ lần trước | `CLAUDE.md` §3 (giả định ghi "trong commit/báo cáo"); `release-lib.mjs` chưa có bước này | Chủ quyết sổ giả định và một bước cổng ở `trien-khai` |
| Cao | 9.8 + P16 | Luật quy trình tầng dưới hạn tối đa 30 ngày, phải liệt kê được luật quá hạn; rào cho điều cấm và vùng một chiều không hết hạn | `CLAUDE.md` §3, §8, §9; `web/CLAUDE.md`; `docs/SO-HANG-RAO.md` chưa có cột hạn | Chủ phân loại luật: rào vùng một chiều hay quy trình |
| Cao | 3.1 + 1.4 | Chèn tầng Ràng buộc bên ngoài và Hiến chương hệ thống; mỗi dự án khai bằng tờ khai Kernel 18 | `CLAUDE.md` §2; `docs/ARCHITECTURE.md:3,15`; `docs/adr/README.md:87` | Tờ khai đã soạn; Phần I phải rút thành "theo Hiến chương điều X" (mục 3.4) |
| Vừa | Điều 2 | Ràng buộc bên ngoài: mỗi dòng phải có chủ duyệt | `RANG_BUOC_NGOAI.md:12` ghi "sửa, thêm dòng: được tự do" (17 dòng) | Chủ duyệt 17 dòng |
| Vừa | (mất tệp) | `FRAMEWORK.md` không có ở v2.0.0 | `docs/ARCHITECTURE.md:3`, `RANG_BUOC_NGOAI.md:3` trỏ `playbook/FRAMEWORK.md` | Sửa chữ khi nâng ghim, kẻo tham chiếu treo |
| Vừa | QĐ-P08 | Lời khai sở hữu phải đúng sự thật | `playbook/PIN-README.md:3,8-12,28,50-55`; ADR-0012:5,24,28-29 | ADR-0101 (mục 6, bước 3) |
| Thấp | N3, 7.2, P21, N5, P4, P5, P17, N9 | Nới hoặc làm rõ | `CLAUDE.md` §3, §8; `docs/ARCHITECTURE.md` 5.1 | Vẫn đúng: CRM chặt hơn, được phép (9.7) |

Cơ chế ghim khi nâng (QĐ-P10 khuyến nghị A): `playbook/` mất `.PINNED_VERSION`, `FRAMEWORK.md`, `ai/PROMPT_FACTORY.md`, `ai/WORKFLOW.md`, `ai/qa-reports/`, thêm ba văn bản mới, Kernel 18, `scripts/kiem-ban-ghim.sh`, `scripts/kiem-kernel-18.mjs`; viết lại `playbook/PIN-README.md` và `.PINNED_SHA256`; `src/standards.test.ts` đổi dòng 30 (`v2.3.0` → `v4.1.0`), dòng 72–75 (chuỗi PIN-README), thêm bài gọi `kiem-ban-ghim.sh`, giữ phép kiểm bổ sung (`0o111`, NFC, `git check-attr`); bỏ `scripts/pin-playbook-manifest.mjs`, giữ `scripts/playbook-manifest-lib.mjs` nếu bài kiểm còn import. Bẫy: GOVERNANCE hai bản cùng nhãn v1.0.0 mà nội dung khác, bài phiên bản (dòng 30–31) vẫn xanh; chỉ bài manifest và băm bắt được. Nên đổi `ask` thành `deny` cho `Edit(playbook/**)` (`.claude/settings.json:28`, QĐ-P05).

## 3. Lớp Hiến chương: Phần I `docs/ARCHITECTURE.md` so với Hiến chương hệ thống v1.1.0

Số điều 1.x–5.17 trùng; Điều 6 lệch một số (Phần I 6.k = Hiến chương chung 6.k+1, vì Hiến chương chung thêm 6.1 mới). ADR viện dẫn Điều 6 của CRM (ví dụ ADR-0030:31) sẽ trỏ sai nếu thay Điều 6.

### 3.1 Khớp nguyên ý hoặc khác chữ cùng nghĩa
1.1–1.4, 2.2, 2.3, 2.4, 4.1, 4.5, 5.1, 5.5, 5.7, 5.8, 5.10, 5.13, 5.15, K4. Hiến chương chung 4.1 thêm "chứng từ là bằng chứng".

### 3.2 CRM chặt hơn (giữ làm lớp siết, Hiến pháp 9.7)
2.1 (tra qua một hàm công bố); 4.2 (không nhập tay vào sổ công nợ); 4.4 (chứng từ ra dùng danh sách trắng, C13); 5.3 (trigger chỉ đọc bảng mình hoặc view công bố); 5.4 (tiền `INTEGER` VNĐ); 5.6 (chép giá trị, đổi mốc qua ADR); 5.9 (thuật ngữ kế toán); Điều 6 (sổ hàng rào, lịch trong `docs/quyen-hoan.json`).

### 3.3 CRM lỏng hơn hoặc chỉ Hiến chương chung có (cần ADR hoặc khai lệch có chủ ý)

| Điều | Chỗ lỏng | Hiện thực ở CRM |
|---|---|---|
| K1, 5.11 | Phần I chỉ nói tác nhân "ghi thay người dùng"; chung nói "mỗi tác nhân tự động" | Cron `syncCatalog(env, null)` (`src/modules/catalog/index.ts:357`) ghi không qua `can()`, `staff_id` rỗng; ADR-0010 đ3 chừa Cron ra; lệch chưa có tên |
| 2.1a | Khoá nhận dạng tự nhiên | Chưa ghi vào ADR-0010, 0068 |
| 4.2, 4.2a | Chung phủ mọi sổ tiền, cho bút toán người lập khi có chứng từ, người duyệt, nhật ký; mốc chốt | `vc_trip_cost_line` (migration 0073) nằm ngoài Phần I 4.2; bút toán điều chỉnh chưa có người duyệt riêng; `delivered_at` chưa khai là mốc chốt |
| 5.2 | Thiếu ba vế: sinh phiên bản mới, hiệu lực không chồng, bản chưa duyệt không dùng để tính | `catalog_override` ghi đè và xoá cứng (ADR-0058 Đ6, hạn 2027-03-31); `prices_json`, `before_json` không có CHECK; bảng thi hành không có dòng 5.2 |
| 5.12 | Chung cấm mọi dữ liệu định danh cá nhân ngoài mã tham chiếu, tách vết áp luật, không dựng vết giả | Nhật ký ghi họ tên (`src/modules/dispatch/service.ts:53`, `src/modules/parties/index.ts:896`); chưa tách vết áp luật; nhật ký cũ trên production còn số điện thoại |
| 5.14 | Thiếu "trỏ về dòng sai" và vế ngày nghiệp vụ | Khoá kỳ chưa có (ADR-0026) |
| 5.16 | Thiếu "khai cho từng loại việc" | Lớp vé ADR-0094 có; chưa khai riêng Web Push, thông báo, email, Bảng tin; mục F-02 còn trong `docs/quyen-hoan.json` |
| 5.17 | Thiếu chữ "ca chưa xác nhận phải ghi rõ" | Bảng thi hành có làm, chữ điều không có |
| 5.18 | Nhiều khách thuê | Không áp dụng: một tổ chức |
| 5.19 | Sao lưu phải đã khôi phục thử | Có điểm khôi phục Time Travel mỗi lần deploy, chưa từng khôi phục thử; `docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md` còn là bản thảo |

### 3.4 Lệch có chủ ý đã duyệt, sau khi chuyển sang Hiến chương chung
- 5.1 (luật chỉ ở mã): ADR-0029, 0030 S20-5, 0047 L-A1, 0049, 0052–0057, 0079 L-C1: vẫn là lệch, ghi lại viện dẫn theo 5.1 chung.
- 5.8: ADR-0029 (giá Đối tác theo người thao tác): vẫn lệch.
- 5.5: `XOA_CUNG_NHAP` (ADR-0047), `catalog_override`, `order_money_adjustment` `ON DELETE CASCADE` (migration 0021): vẫn lệch.
- 5.14: ADR-0026, ADR-0057 L-T1: vẫn lệch.
- ADR-0003 đ7 (`dsp_assignment` khoảng nửa mở): hết là lệch theo M01.
- `docs/SYSTEM-DESIGN.md` §17 đã cũ (2026-09-25): làm mới khi rút Phần I.

### 3.5 Cách rút Phần I an toàn (chỉ tài liệu, trong commit nâng ghim, chủ duyệt)
- Thay bằng "theo Hiến chương điều X" (giữ cột "Ở Tour Đảo nghĩa là"): các điều ở 3.1.
- Giữ nguyên làm lớp siết: các điều ở 3.2; giữ Điều 6 của CRM kèm một dòng chuyển số.
- ADR hoặc khai lệch trước khi rút: các điều ở 3.3.
- Bảng thi hành phải đủ mỗi điều một dòng (Hiến chương 6.3): đang thiếu 4.1, 5.2, 2.4, 4.3, 4.5, 2.1a, 4.2a, 5.18, 5.19; dòng 1.4, 4.4, K4, 5.16 đã cũ.
- Chủ chọn cách đọc: (a) chỗ lỏng ở 3.3 là lệch ngay bây giờ, cần ADR; hay (b) là việc phải dọn trước lần nâng ghim. Khuyến nghị (b): CRM vẫn ghim v2.3.0, Hiến chương chung chưa vào bản ghim.

## 4. Lớp vận hành (CLAUDE.md, hàng rào, quy trình, token)

### 4.1 CRM có, kho gốc chưa có: nên đưa lên kho gốc trong phiên hợp nhất luật thực thi
Sổ hàng rào có cột "đã thấy chặn thật" (`docs/SO-HANG-RAO.md`); dừng dây chuyền có hạn, quá hạn thì test đỏ (`docs/quyen-hoan.json`, `src/phat-hien-han.test.ts`); ba hook (cổng xanh, tệp cấm sửa, luật không sửa bằng dòng lệnh) cùng `deny`/`ask` cho tệp luật; mẫu `.claude/agents/nguoi-kiem-doc-lap.md`; cổng phiên bản trước và sau deploy, quy ước mã thoát 0/1/2 (`scripts/kiem-phien-ban.mjs`); luật trả lời chủ (kết luận trước, bốn mục); luật gom câu hỏi, chạy nền việc độc lập; bước ghép khi duyệt (tối đa 3 quyết định chạm quyền, dữ liệu); ma trận "đổi gì → chạy kiểm nào" (`docs/CHANGE-GUIDE.md` §3); `RANG_BUOC_NGOAI.md` làm mẫu tầng ràng buộc bên ngoài.

### 4.2 Kho gốc đòi, CRM chưa có hoặc đặt chỗ khác
Các artifact `project/00-PROJECT_BRIEF`, `02-SAD`, `04-CONSTRAINTS`, `05/06`, `08-QA_CHECKLIST`, `09-PROJECT_OVERLAY` đều có nội dung ở CRM nhưng rải ở `docs/SPEC-tourdao-sales.md`, `docs/SYSTEM-DESIGN.md`, `docs/so-do-kien-truc/`, `CLAUDE.md`, `docs/CHANGE-GUIDE.md`: nên có một bảng ánh xạ, không chép. Thiếu thật: tài liệu token dạng bảng (`templates/07-DESIGN_TOKENS`); hạn 30 ngày cho luật quy trình (9.8). Tờ khai Kernel 18: đã soạn.

### 4.3 Token thiết kế
Token ở `public/app.css:26-534` (`:root`, 442 biến), luật dùng ở `web/CLAUDE.md`; máy canh bằng `src/token-giao-dien.test.ts` và `tests/e2e/pwa.mjs` (cấm hex, px từ dấu mốc `:777`). Lỗ: vùng `app.css:535-776` không được quét, 42 dòng viết cứng. Breakpoint viết cứng tám mốc, có một chỗ 640 lệch 641; biến CSS không dùng được trong `@media`, nên khai bằng bảng tài liệu.

### 4.4 So với khuyến nghị của Anthropic cho Claude Code
- `CLAUDE.md` 129 dòng nhưng khoảng 30 KB, 23 dòng dài hơn 400 ký tự; riêng §10 khoảng 7,8 KB. Nên chuyển §10 sang `docs/CHANGE-GUIDE.md` hoặc skill.
- Chưa có `.claude/skills`, `.claude/rules`: công thức lặp (phát hành, thêm route, chặng đưa đón) nạp đúng lúc sẽ nhẹ ngữ cảnh hơn.
- Hooks và người kiểm độc lập đúng hướng, mạnh hơn mức tối thiểu; còn khe cổng xanh không canh trợ lý con (`.claude/hooks/cong-xanh.mjs:4`).
- Bộ nhớ tự động khoảng 90 mục, nhiều mục đã cũ, nạp mỗi phiên.

### 4.5 Kho gốc v2.0.0 tự mâu thuẫn (báo về kho gốc)
GOVERNANCE và PLAYBOOK vẫn gọi tên QA1/QA2 nhưng đã mất bảng định nghĩa; `docs/huong-dan-su-dung.md:13` còn ghi "v2.2.0, 13 nguyên tắc, 7 điều cấm"; `PLAYBOOK.md:86` ghi "hiến pháp dạng symlink" trái `huong-dan:39`; GOVERNANCE nên nâng số phiên bản khi khôi phục bảng QA.

## 5. Bản đồ quyết định đã có của chủ dự án
- 2026-09-26: chốt hợp nhất luật (QĐ-H, QĐ-P, QĐ-C); H12 tourdao-sales giữ ghim cũ tới khi có môi trường thử; P06 hợp nhất luật thực thi trước khi nâng ghim; P08 sửa lời khai sở hữu sớm; P10 bộ kiểm ghim theo khuyến nghị A.
- 2026-10-05: Kernel 18 giữ 18 dòng, dòng 1–16 là lõi K1–K16 của Hiến chương; Hiến chương là nền chuẩn cho mọi dự án; VATEngine có tiền; CRM làm trước, từng bước, không bỏ cái đang có.

## 6. Lộ trình từng bước cho CRM

| Bước | Việc | Trạng thái | Ai |
|---|---|---|---|
| 1 | Đối chiếu ba lớp (tệp này) | Xong 2026-10-05 | AI |
| 2 | Tờ khai `docs/kernel-18.md` | Đã soạn, kịch bản kiểm đạt; chờ người kiểm và chủ duyệt | AI soạn, chủ duyệt |
| 3 | QĐ-P08: ADR-0101 sửa lời khai "do Core sở hữu" (không chạm `playbook/`, manifest giữ xanh) | Chưa soạn | AI soạn, chủ duyệt (`docs/adr/**` là `ask`) |
| 3b | ADR hoặc khai lệch cho các chỗ lỏng ở 3.3 (5.11 Cron, 5.12 tên trong nhật ký, 5.2, 4.2, 5.16, 5.19) | Chưa soạn; gom tối đa 3 quyết định mỗi lượt duyệt (bước ghép) | AI soạn, chủ duyệt |
| 4 | Phiên hợp nhất luật thực thi ở kho gốc (đưa phần ở 4.1 lên, khôi phục QA1/QA2, PQ, FRAMEWORK hoặc phần 9–11, sửa 4.5), gắn tag mới | Chưa làm | Phiên ở kho gốc |
| 5 | Môi trường thử giống thật (Worker và D1 staging) và lời khai trong sổ hàng rào (H12a) | Chưa có | Chủ quyết |
| 6 | Nâng ghim trong một commit riêng (mục 2 cơ chế ghim), người kiểm độc lập chạy lại `diff -r` rỗng | Chờ bước 4 và 5 | AI chuẩn bị, chủ chạy |
| 7 | Rút Phần I thành "theo Hiến chương điều X" (mục 3.5), làm mới bảng thi hành và `SYSTEM-DESIGN.md` §17 | Chờ bước 6 | AI soạn, chủ duyệt |
| 8 | Gọn lớp vận hành theo 4.3, 4.4 (§10 CLAUDE.md sang CHANGE-GUIDE hoặc skill, quét token vùng 535–776, bảng token) | Làm được bất cứ lúc nào | AI, chủ duyệt phần luật |

## 7. Câu cần chủ dự án quyết (gom một lần)
1. Môi trường thử: dựng Worker và D1 staging cho CRM, hay giữ ghim v2.3.0 lâu dài. Khuyến nghị: dựng, vì Hiến pháp cả bản cũ lẫn bản mới đều đòi.
2. Lịch phiên hợp nhất luật thực thi ở kho gốc (bước 4). Khuyến nghị: làm ngay sau khi duyệt tờ khai CRM, trước mọi dự án khác.
3. Cách đọc các chỗ CRM lỏng hơn (3.5): (a) lệch ngay, hay (b) dọn trước nâng ghim. Khuyến nghị (b).
4. Tên người trong nhật ký có thuộc "dữ liệu định danh cá nhân" của Hiến chương 5.12 không.
5. Phân loại luật theo Hiến pháp 9.8 (rào vùng một chiều không hết hạn; luật quy trình hạn 30 ngày), làm khi nâng ghim.
6. Duyệt 17 dòng `RANG_BUOC_NGOAI.md`, làm khi nâng ghim.
