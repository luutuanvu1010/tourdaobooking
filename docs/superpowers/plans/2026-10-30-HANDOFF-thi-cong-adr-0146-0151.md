# Bàn giao thi công — ADR-0146 + ADR-0151 (luật bán theo loại đối tác; đặc điểm dịch vụ)

> Hồ sơ có ngày 30/10/2026, người điều phối (phiên lập kế hoạch) viết cho **phiên thi công mới**. Không sửa; có gì mới thì ghi vào sổ thi công.
> Vai của phiên nhận: **THI CÔNG**. Không tự nghiệm thu (Hiến pháp N8): mỗi điểm dừng KĐL gọi một subagent kiểm độc lập, chỉ đọc.

## 1. Việc

Thi công **đúng một kế hoạch**: `docs/superpowers/plans/2026-10-30-adr-0146-va-dac-diem-dich-vu-ke-hoach.md` (16 task T0–T15, ba điểm dừng KĐL-1/2/3). Đầu ra là mã, migration, bài kiểm, giao diện và tài liệu cho:

- **ADR-0146** (`docs/adr/ADR-0146-chinh-sach-ban-theo-loai-doi-tac.md`, duyệt 28/10): luật «không bán» theo loại đối tác, xét theo bên đặt.
- **ADR-0151** (`docs/adr/ADR-0151-dac-diem-dich-vu-va-luat-ban-theo-dac-diem.md`, duyệt 30/10): khung «Đặc điểm dịch vụ» là dữ liệu, cộng phạm vi luật bán theo đặc điểm. ADR này thay một phần ADR-0146 Đ1, Đ2 và bổ sung Đ3, Đ6.

**Ngoài phạm vi.** Đóng bán (B), Lịch mùa (C1/C2), Phụ thu (D1/D2) đều chưa duyệt; hồ sơ nằm ở `docs/superpowers/specs/2026-10-30-tinh-trang-ban-va-phu-thu/`. Phí đón (ADR-0147) chưa có mã. Diễn tập khôi phục là việc riêng, xem tệp bàn giao kèm theo.

## 2. Nguyên tắc chủ chốt (đọc trước mọi thứ)

**«Logic nghiệp vụ là dữ liệu».** Mọi quy tắc cụ thể (loại đối tác nào, dịch vụ / nhóm / đặc điểm nào, ngày nào) nhập trên bảng điều khiển. Trong mã không có tên dịch vụ, tên nhóm, tên loại đối tác hay tên đặc điểm nào. Ví dụ Hòn Tằm chỉ là **ca vàng** (ADR-0151, mục Ca vàng CV-1…CV-8).

## 3. Đọc theo thứ tự

1. `CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md` (bắt buộc, nạp tay nếu làm bằng shell).
2. Kế hoạch (mục 0–7 trước, rồi từng task khi tới). **Mục 3 có bảng «Chủ đã chọn — 30/10/2026»: đó là câu trả lời Q-1…Q-8, áp dụng, không hỏi lại.**
3. ADR-0146, ADR-0151, rồi trang ghép `docs/superpowers/specs/2026-10-30-tinh-trang-ban-va-phu-thu/A-dac-diem-dich-vu/TRANG-GHEP.md`.
4. Báo cáo kiểm: `…/KIEM-A-B/BAO-CAO.md` (đề xuất A, ba vòng), `…/KIEM-KE-HOACH-A/BAO-CAO.md` (kế hoạch).
5. Quyết định chủ, theo ngày: `…/00-dau-vao/QUYET-DINH-CHU-2026-10-30-*.md` (lượt 4 là mới nhất).

## 4. Trạng thái nhánh

- Nhánh `claude/tinh-trang-ban-va-phu-thu`, dựng từ `main@a129d3d`. Chỉ có tài liệu, chưa có mã: các commit `417c1fe` (đề xuất), `16466c3` (ADR-0151), `f7103fc` (kế hoạch), cùng commit bàn giao này.
- Nhánh được dựng trong môi trường của phiên lập kế hoạch và **chưa có trên GitHub**. Chủ đẩy lên bằng gói `tinh-trang-ban.bundle` (lệnh ở `HUONG-DAN-CHU.md` cùng bộ bàn giao).
- **Trước T0:**
  - `git fetch origin && git log --oneline main..origin/main`: `main` có thể đã đi tiếp (đợt 0b, 7c và các phiên khác). Gộp hoặc dựng lại trên `origin/main` mới nhất, rồi chạy `npm test` một lần để có mốc xanh.
  - Liệt kê migration và số ADR của **mọi nhánh** trước khi lấy số (`CLAUDE.md` §10). Kế hoạch không gán số cố định.

## 5. Quyết định chủ đã chốt (tóm tắt; nguyên văn trong kế hoạch mục 3)

- **Q-1 = (a):** cổng luật bán đứng **trước** `tinhCanXacNhan` ở `/status` và trước chốt «cần xác nhận» ở Gửi xác nhận. Đây là phần bổ sung chỗ đặt cho ADR-0146 Đ3; ghi sổ.
- **Q-2 = (a):** chặn tài khoản lai (`holdsPartner`) ở mọi route mới và ở chỗ hiện hai trang.
- **Q-3 = (a):** ngày kết thúc tính trọn ngày (R-1). Giao diện phải nói rõ: hẹn kết thúc «đến hôm nay» thì vẫn chặn tới hết hôm nay; muốn thôi chặn ngay thì dùng nút «Kết thúc ngay».
- **Q-5:** chủ sẽ diễn tập khôi phục trước 05/11, không kịp thì gia hạn. **Từ 06/11**, nếu mục HC-5.19 trong `docs/quyen-hoan.json` chưa được xử lý, `npm test` đỏ ở bài `phat-hien-han`. Khi đó áp ghi chú «Trong lúc chờ Q-5» của kế hoạch: đỏ *chỉ vì* HC-5.19 thì ghi sổ và đi tiếp; **không được phát hành** cho tới khi mục đó đóng hoặc được gia hạn.
- **Q-6 = duyệt:** ở T15, được thêm **nguyên văn** các dòng đã đề xuất vào `web/CLAUDE.md`, `src/CLAUDE.md`, `docs/ARCHITECTURE.md`, chỉ bằng công cụ sửa tệp. Báo cáo cuối phải dán nguyên diff các tệp này.
- **Q-8 = (a):** tiêu chí 12 của ADR-0146 thử bằng các cổng có sẵn (R-7).

## 6. Ràng buộc cứng

- Làm trong **worktree riêng** (`.claude/worktrees/<tên>`). Commit nhỏ, tiếng Việt, thân commit nói vì sao.
- **Cấm** (chủ tự chạy): `git push`, gộp vào `main`, `wrangler deploy`, mọi lệnh `--remote`, ghi lên D1 hoặc API production.
- Mỗi task: bài kiểm **đỏ trước, xanh sau**. Mỗi hàng rào mới: sửa cố ý → thấy đỏ → hoàn nguyên → ghi dòng `docs/SO-HANG-RAO.md` kèm ngày quan sát.
- Bảng hoặc view mới: cập nhật `docs/data-dictionary.json` rồi chạy `npm run dict`.
- Trang mới: khai `PAGES` và script `build:web`, theo luật `web/CLAUDE.md`; chạy kịch bản Chrome kế hoạch nêu (mục 8.1).
- Gặp điểm kế hoạch sai với mã thật mà phải đổi **dữ liệu, quyền, hợp đồng hoặc bất biến**: **dừng phần đó**, ghi sổ, gom câu hỏi gửi chủ một lần (P8). Phần không phụ thuộc thì làm tiếp.
- Sổ thi công: `docs/superpowers/plans/2026-10-30-adr-0146-va-dac-diem-dich-vu-thi-cong-nhat-ky.md` (T0 tạo).

## 7. «Xong» là gì

1. T0–T15 xong. `npm test`, `npm run typecheck`, `npm run test:e2e` (đủ bộ, cần mạng) đều xanh, trừ trường hợp đỏ chỉ vì HC-5.19 đã ghi sổ.
2. Ba báo cáo KĐL-1/2/3 của subagent kiểm độc lập chỉ đọc, ghi vào `docs/superpowers/specs/2026-10-30-tinh-trang-ban-va-phu-thu/KIEM-THI-CONG-A/` (mỗi điểm một tệp). KĐL-3 kết luận **ĐẠT**.
3. Bằng chứng Chrome của hai trang mới, ở `docs/evidence/<ngày>-luat-ban-dac-diem/`.
4. Báo cáo cuối cho chủ theo `CLAUDE.md` §4: bốn mục Đã làm / Đã kiểm / Chưa làm / Cần bạn quyết, lời thường. Kèm **runbook phát hành chủ tự chạy** (kế hoạch mục runbook, gồm hai lệnh đếm «Việc bắt buộc trước khi đặt luật đầu tiên» bản sửa R-9) và diff các tệp luật (Q-6).
5. Không phát hành. Chủ quyết và tự chạy.
