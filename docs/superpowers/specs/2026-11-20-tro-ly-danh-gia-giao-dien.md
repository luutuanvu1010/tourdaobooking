# Đặc tả ngắn: trợ lý đánh giá giao diện

> Ngày 2026-11-20. Trạng thái: **chủ ra lệnh dựng 2026-11-20** trong chat, nguyên văn «dựng trợ lý đánh giá giao diện,», sau khi đọc hướng năm bước AI trình cùng ngày. Đặc tả này ghi lại hướng đó, không có câu hỏi mới cho chủ. Soạn theo `MAU-DAC-TA-NGAN.md`.
> Nguồn đã đọc 20/11: Anthropic «Harness design for long-running application development», «Demystifying evals for AI agents», «Building effective agents»; Claude Code «Best practices», «Subagents»; Nielsen Norman Group «How to conduct a heuristic evaluation».
> **Không lập bộ tiêu chí thứ hai:** phần máy đo dùng lại tiêu chí T của `docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md` mục 3 và các phép đo ở `docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/`.
> Nhắc theo ADR-0211 Đ2: lúc viết có 23 nhánh chưa nhập bản chính, vượt trần ba việc mở.

## 1. Việc gì, cho ai, vì sao
Chủ dự án nhiều lần phải tự phát hiện giao diện thiếu mạch lạc (29/10 «khoảng trống vô lý»; 20/11 trùng lặp trường ở Tạo đơn), vì người thi công tự xem ảnh của chính mình và người kiểm độc lập hiện nay chỉ soát mã. Việc này dựng một **trợ lý riêng, chỉ đọc**, nhìn màn hình thật ở khổ 390 và 1280, chấm theo tiêu chí viết sẵn, báo phát hiện kèm ảnh trước khi ảnh tới tay chủ. Chủ vẫn là người duyệt cuối về gu.

## 2. Xong khi (ví dụ nhìn thấy được)
1. Gõ `node scripts/giao-dien/do-man.mjs --o SALES:/order-form` ⇒ in ra một thư mục tạm (ngoài kho) có ảnh từng màn cuộn ở 390 và 1280, tệp `tom-tat.md` liệt kê từng tiêu chí máy đo «đạt / không đạt / chưa đo» kèm chỗ vi phạm, và mã thoát 0 (đạt hết), 1 (có vi phạm) hoặc 2 (không chạy được hay đo thiếu).
2. Thiếu công cụ kiểm tương phản (axe) ⇒ lệnh dừng ngay với mã 2 và một câu nói rõ thiếu gì. Không có đường nào để kết quả đo thiếu được ghi là «đạt».
3. Quan sát chặn thật: cấy lỗi «chữ xám nhạt trên nền trắng» vào màn ⇒ dòng T8 chuyển «không đạt»; gỡ ra ⇒ về như cũ. Cùng cách với T4 (nút cao 28 px ở khổ 390).
4. Giao trợ lý một màn Tạo đơn bị cấy lỗi «tên khách hỏi hai lần» ⇒ báo cáo có một phát hiện mang mã S1, mức Nặng, kèm tên ảnh và chỗ trên màn.
5. Giao trợ lý các màn không cấy lỗi ⇒ mỗi phát hiện mức Nặng trở lên đều chỉ được vào một chỗ nhìn thấy trên ảnh; phiên điều phối đối chiếu từng phát hiện với ảnh và ghi số đúng, số báo nhầm.
6. Bộ ví dụ thử đợt đầu: 20 ví dụ. Ngưỡng để đưa trợ lý vào quy trình: bắt được ít nhất 80 % số ví dụ có đáp án biết trước, và trên các màn không cấy không quá 2 phát hiện Nặng trở lên bị xếp là báo nhầm. Không đạt ngưỡng thì báo «chưa đạt», không thêm dòng vào `web/CLAUDE.md`.
   - Dự kiến lúc viết: 15 cấy lỗi + 5 không cấy ⇒ ngưỡng 12/15.
   - **Sửa 20/11, TRƯỚC khi chạy lượt chấm nào trên bộ này:** khi dựng bộ ví dụ mới thấy hai màn gốc đã có sẵn lỗi thật cùng loại (Chi tiết đơn tô đỏ hai số tiền; Đơn hàng viết tiền hai kiểu ở hai khổ), nên hai ví dụ đó không cấy mà dùng lỗi thật. Thành phần thật: 14 cấy lỗi + 2 lỗi thật có sẵn + 4 không cấy ⇒ ngưỡng **13/16**, và không quá 2 báo nhầm trên bốn màn không cấy.
7. Trợ lý không có công cụ sửa tệp (`tools: Read, Glob, Grep, Bash`); báo cáo luôn có mục «không kiểm được».

## 3. Không làm lần này
- Không sửa giao diện nào của Nền tảng; không chạm dữ liệu, quyền, tiền, bản chạy thật.
- Chỉ chụp màn ngay sau khi tải (trạng thái tĩnh). Trạng thái sau khi bấm (đã chọn dịch vụ, hộp thoại mở): trợ lý xem ảnh do kịch bản Chrome của việc đó chụp, và ghi rõ nguồn ảnh. Bộ bước bấm riêng cho trợ lý để sau.
- Dữ liệu thử chỉ đủ cho họ màn Lập đơn – Đơn hàng – Chi tiết đơn. Họ màn khác (Vận chuyển, Tiền) thêm dữ liệu khi tới lượt.
- Không đo tốc độ, cỡ chữ lớn của máy, iPad, iPhone thật (T10, T11, T13, T16); không chấm điều kiện lên kho ứng dụng (T19).
- Không sửa trợ lý `nguoi-kiem-doc-lap`, không sửa dây chuyền `giao-viec` (đang ở nhánh khác, chưa nhập bản chính). Khi dây chuyền vào bản chính: thêm một dòng ở chặng kiểm để gọi trợ lý này cho việc đổi giao diện (việc nối, ghi ở báo cáo kết quả).

## 4. Loại việc
- [x] **Việc lớn** (luật: thêm tệp trong `.claude/agents/`, thêm một dòng ở `web/CLAUDE.md`) ⇒ có người kiểm độc lập.
- Cần ADR: không. Đây là dựng thêm một lớp kiểm nhằm vào chính AI (Hiến pháp N9 phần ranh giới, Điều 9.4), bỏ được bằng cách xoá tệp trợ lý và dòng trỏ.
- Tệp máy sẽ hỏi chủ khi ghi: `.claude/agents/nguoi-danh-gia-giao-dien.md` (một lần ghi), `web/CLAUDE.md` (một dòng, chỉ khi đạt ngưỡng mục 2.6). `package.json` và `package-lock.json` đổi (thêm `axe-core`) nên lệnh nhập bản chính sẽ hỏi lý do.

## 5. Câu hỏi cho chủ
Không có.

## 6. Điều AI tự quyết (chủ bác được)
- **Tên trợ lý:** `nguoi-danh-gia-giao-dien`, cùng kiểu tên với `nguoi-kiem-doc-lap`.
- **Tiêu chí nằm ở `docs/TIEU-CHI-GIAO-DIEN.md`** (tài liệu sống, một nơi): phần máy đo (mã T, khớp với mã trong `scripts/giao-dien/cham-may.mjs`, có bài kiểm so hai bên) và mười tiêu chí suy xét (mã S1–S10: một thông tin một lần; một nút chính; một con số chính; bước khớp khối; hai khổ một trình tự; cùng nghĩa cùng tên cùng hình; nhãn và nút nói đúng; bố cục ngay ngắn; thứ bậc nhìn rõ; trạng thái và chữ dễ hiểu). Ngưỡng là bề mặt, chủ sửa được.
- **Trọng số:** đặt nặng «liền một khối» và «dễ dùng», không chấm «dấu ấn riêng» (bài của Anthropic chấm trang trưng bày; đây là công cụ làm việc).
- **Ba mức:** Chặn việc (không làm xong được việc, hoặc hiểu sai tiền) · Nặng (thấy ngay, gây nhầm hoặc mất tin) · Nhỏ.
- **Công cụ kiểm tương phản:** thêm `axe-core` 4.14.0 (ghim đúng phiên bản) vào `devDependencies`, cài từ bộ nhớ đệm npm sẵn có trên máy, không chạy kịch bản cài đặt. Lý do: 20/11 đợt Tạo đơn chạy thiếu bước này vì công cụ để ngoài kho.
- **Lệnh đo** dựng bản thử tạm bằng `startEnv` của `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs` (thư viện mọi kịch bản Chrome đang dùng), chép các phép đo 13/11 vào `scripts/giao-dien/` để không phụ thuộc hồ sơ có ngày, ảnh ghi ra thư mục tạm ngoài kho.
- **Mô hình của trợ lý:** bắt đầu bằng `sonnet` như người kiểm độc lập; chỉ nâng lên nếu bộ ví dụ thử cho thấy cần.
- **Cách chia việc:** phiên này điều phối và viết tài liệu, tệp trợ lý; một trợ lý khác viết mã trong `scripts/` và bài kiểm; `nguoi-kiem-doc-lap` kiểm ở cuối.

## 7. Tiến độ
- 20/11: đặc tả lưu.
- 20/11: lệnh đo `scripts/giao-dien/do-man.mjs` xong (ba lần lưu của trợ lý thi công, 27 ca bài kiểm). Phiên điều phối chạy lại trên `SALES:/order-form,SALES:/order`: khoảng 40 giây, ảnh đúng trang thật đã đăng nhập, không để lại tiến trình thử. Trợ lý thi công đã thấy T8 và T4 chuyển «không đạt» khi cấy lỗi và về lại khi gỡ.
- 20/11: chạy thử sớm người chấm trên hai màn không cấy (2 phút 26 giây, khoảng 136 nghìn token cho hai màn). Bắt đúng lỗi thật ở Chi tiết đơn («Tổng cộng» và «Còn lại» cùng tô đỏ, mức Nặng). Báo nhầm: hai phát hiện Nặng về nút «Tạo đơn» của khung chung, một phát hiện Nhỏ về khối cột phải, một phát hiện Nhỏ coi nhãn nổi là hai khuôn. Sửa theo đó: tài liệu tiêu chí thêm đoạn «Cách đọc ảnh» và «Khung chung đã duyệt», phạm vi của S2, cách so của S5, dòng «đừng báo khi» của S1 và S6; ảnh từng màn đổi sang gối nhau 40 % vì thanh dính che mất nội dung giữa hai ảnh.
