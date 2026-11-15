# Kế hoạch Bước 2 và Bước 3: máy kiểm nhanh, đáng tin; mỗi việc chủ duyệt hai lần (2026-11-15)

> **Lệnh của chủ dự án** (nguyên văn, lệnh `/goal` ngày 15/11): «hoàn tất kế hoạch, ngoại trừ việc tắt chia sẻ Google Sheet». Đây là lệnh phiên này làm theo. Chủ CHƯA chọn hướng A/B/C bằng lời; phiên đi theo hướng B vì đó là khuyến nghị trong đặc tả và là hướng duy nhất có Bước 2–3. Không ghi thành «chủ chọn B».
> **Đặc tả:** `docs/superpowers/specs/2026-11-15-kiem-toan-harness-va-cach-thi-cong-mot-nguoi.md` (mục I.4, I.6, II.5). Bước 1: `docs/superpowers/plans/2026-11-15-buoc-1-dong-cho-ho-harness.md`.
> **Vai:** phiên điều phối lập kế hoạch và giao; một người thi công một lúc trên nhánh này; người kiểm độc lập (`isolation: worktree`) sau mỗi việc chạm luật hoặc kịch bản phát hành.

## 0. Ai làm phần nào (chốt trước khi viết mã)

| Việc | Ai | Vì sao |
|---|---|---|
| Ghi ngày quan sát luật deny Terminal vào sổ hàng rào | AI | tài liệu |
| Bước 2: các việc 2.1–2.6 dưới đây | AI thi công, chủ nhập bản chính | mã, bài kiểm, cấu hình AI; tệp `.claude/` qua hộp hỏi |
| Bước 3: mẫu đặc tả ngắn, mẫu báo cáo, gói hướng dẫn (skill) | AI soạn trên nhánh; **có hiệu lực khi chủ nhập bản chính** | tệp `.claude/**` là luật (N9) |
| Bước 3: ADR cho ba giới hạn (≤ 3 việc mở; ADR chỉ cho quyết định khó quay lại; phát hành gom theo ngày) | AI soạn, trạng thái **đề xuất**; **chủ duyệt** | đổi luật dự án (N3, N9) |
| Bước 3: rút gọn CLAUDE.md | AI cập nhật nhánh có sẵn `worktree-rut-gon-claude-md` (ADR-0160), không viết bản thứ hai; **chủ duyệt bằng việc nhập** | CLAUDE.md là luật |
| Dọn nhóm 1 (bảy bản làm việc riêng sạch, đã nhập) | AI; mỗi lần lưu trữ phiên có hộp hỏi | đã có khuyến nghị, đảo ngược được |
| Dọn nhóm 2, 3 | AI chỉ làm phần không mất gì (gỡ thư mục sạch, GIỮ nhánh); phần có tệp chưa lưu để nguyên | mất dữ liệu thì chủ quyết |
| Khoá bản chính trên GitHub | **chủ** | cài đặt tài khoản; chưa thử với `day-len` |
| Kho riêng tư hay công khai | **chủ** | đụng tiền (phút máy kiểm) và dữ liệu |
| Sửa `autoMode` trong `~/.claude/settings.json` | **chủ** (AI soạn nội dung) | cài đặt an ninh của chính AI |
| Tạo tài nguyên Cloudflare cho bản Development (ADR-0162 Task 7) | **chủ** | tài khoản Cloudflare |
| Tắt 6 tiến trình thử chạy sót ở `modest-lovelace-09b5ba` | **chủ** | chủ quyết theo ghi chú «chủ tự kill cả nhóm» |
| Tắt chia sẻ Google Sheet | **chủ** | lệnh `/goal` loại trừ |

## 1. Bước 2 (thứ tự cố định; đo trước khi đổi)

### 2.1 Lệnh nhập bản chính liệt kê tệp luật đã đổi
- **Xong khi:** `day-len` (bước so sánh) in khối «TỆP LUẬT ĐÃ ĐỔI» liệt kê mọi tệp đổi thuộc `CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`, `src/modules/*/CLAUDE.md`, `.claude/**`, `playbook/**`, `docs/adr/**` giữa commit sắp đẩy và `origin/main`, và đòi chủ gõ lý do như khối «ĐỔI QUY TRÌNH KIỂM»; lý do ghi vào bản ghi kết luận. Không đổi tệp luật thì không hỏi thêm gì.
- **Bài kiểm:** cạnh các bài của khối đổi quy trình kiểm trong `src/release-lib.test.ts` (đỏ trước, xanh sau).
- Siết, không nới. Sau việc này chủ có thể tự bỏ khối `ask` trong `.claude/settings.json` mà vẫn thấy mọi lần AI sửa luật ở một chỗ.

### 2.2 Cổng xanh bản nhẹ (móc `Stop`)
- **Xong khi:** lúc AI định dừng ở một cây làm việc có thay đổi so với `main`: máy chạy `npm run typecheck` và `node --test` cho các tệp `*.test.ts` nằm trong thư mục có tệp đổi; có trần thời gian (90 giây); đỏ thì chặn dừng, kèm tên bài đỏ ngắn gọn; quá trần thì chỉ cảnh báo, cho dừng; `stop_hook_active` đúng thì cho dừng ngay (không vòng lặp); cây sạch thì im lặng.
- Dùng lại những gì đúng của `cong-xanh-lib.mjs` (đang nằm chết), bỏ phần chạy cả bộ.
- **Bài kiểm:** `src/claude-cong-xanh.test.ts` (đỏ trước, xanh sau), có ca trần thời gian và ca `stop_hook_active`.

### 2.3 Trang trạng thái do máy sinh (móc `SessionStart`)
- **Xong khi:** mở phiên trong kho, AI nhận dưới 10.000 ký tự: phiên bản bản chạy thật (GET công khai `https://booking.tourdao.vn/api/auth/config`, trần 3 giây, lỗi mạng thì ghi «không lấy được», không chặn); lần lưu đầu của `main` và `origin/main`; số bản làm việc riêng và các bản còn phần chưa lưu; các mục sổ hạn sắp đến hạn trong 14 ngày.
- **Bài kiểm:** bài với mạng giả và kho tạm.

### 2.4 Bài đỏ giả
- Trước khi sửa: đọc báo cáo `baiDo` của các lượt GitHub đã phải chạy lại để đặt tên đúng bài đỏ. Mười lượt chạy lại gần đây rơi vào cả phần e2e (2, 3, 4, 5, 7, 8) lẫn phần npm test (2, 6, 8).
- **Xong khi:** mỗi nguồn đỏ giả có tên được sửa tận gốc hoặc ghi vào bảng «đỏ giả đã biết» kèm lý do; không thêm cơ chế tự chạy lại để che.

### 2.5 Bài kiểm nhanh hơn
- Trước khi sửa: đo một bài có cơ sở dữ liệu thử (13,6 giây cho 6 bài, `src/modules/billing/ben-kia-lua-chon.test.ts`), tách thời gian áp 149 migration với thời gian chạy bài.
- **Xong khi:** nếu migration là phần lớn: `tests/audit/harness.mjs` dựng một bản mẫu một lần rồi sao chép; đo lại thư mục `billing` (221 giây hôm nay) và ghi số trước/sau. Nếu không phải: ghi lại số đo, không đổi.

### 2.6 iPhone
- **Xong khi:** có một kịch bản chạy tay mở bản chạy cục bộ trên trình giả lập iPhone và chụp ảnh các trang chính (nếu máy có Xcode); không đưa vào máy kiểm GitHub. Không có Xcode thì ghi rõ và dừng.

## 2. Bước 3

- **3.1** Mẫu `docs/superpowers/specs/MAU-DAC-TA-NGAN.md` (một trang: mục tiêu; «xong khi» bằng ví dụ bấm gì thấy gì, có con số khi chạm tiền; loại việc) và mẫu báo cáo kết quả (ảnh thật, máy đã kiểm gì, điều chưa kiểm).
- **3.2** Gói hướng dẫn `.claude/skills/phat-hanh/SKILL.md` (chỉ chủ gọi: `disable-model-invocation: true`) gom quy trình nhập bản chính, triển khai và các trục trặc đã biết đang rải trong bộ nhớ; `.claude/skills/dac-ta-ngan/SKILL.md` (hỏi một lần tối đa ba câu, viết theo mẫu 3.1).
- **3.3** ADR đề xuất «Vòng làm việc một người»: ba giới hạn ở mục 0. Kèm câu duyệt mẫu.
- **3.4** Cập nhật nhánh `worktree-rut-gon-claude-md` theo bản chính hôm nay (gộp, sửa xung đột, sửa số đếm), không đổi nghĩa đã được chủ chốt 3/11; trình chủ nhập.
- **3.5** Bản Development: soạn trang việc chủ cần làm ở Cloudflare (dựa `docs/HUONG-DAN-TAO-BAN-DEVELOPMENT.md`), không tự tạo tài nguyên.

## 3. Kết thúc
`npm test` đủ bộ một lần ở cuối, rồi giao chủ một lệnh `day-len` (đứng ở thư mục gốc). Mục nhật ký phiên bản: không cần, trừ khi việc 2.5 đổi mã chạy trên máy chủ (không đổi).

## Nhật ký
- **2.1 (người thi công, 15/11).** Đỏ trước: `node --test src/release-lib.test.ts` → 9 `not ok` (6, 7: chuỗi lệnh day-len thiếu bước so tệp luật; 28, 29: ca từ chối «so tệp luật lỗi», «đổi tệp luật mà không gõ lý do»; 50–52: `TEP_LUAT` chưa có, khối «TỆP LUẬT ĐÃ ĐỔI», hai lý do riêng; 82: `docKetQuaKiem` chưa chặn bản ghi `luat` thiếu lý do; 98: tóm tắt trien-khai chưa in lý do). Xanh sau: `release-lib.test.ts` + `kiem-phan.test.ts` 158 bài, 0 đỏ; typecheck 0 lỗi. Khác gợi ý: hằng `TEP_LUAT` đặt ở `scripts/release-lib.mjs` (cạnh hàm dùng nó), không ở `kiem-phan.mjs` — vì nó không thuộc bảng chia phần kiểm; bài khoá nó tách khỏi `TEP_DIEU_KHIEN`. Siết thêm: `docKetQuaKiem` (trien-khai) dừng khi bản ghi nói tệp luật đổi mà không có lý do, như với quy trình kiểm. Tài liệu: `docs/QUY-TRINH-PHAT-HANH.md` Bước 5 thêm mục 8.
