# Bàn giao trạng thái phân hệ Vận chuyển — 30/9/2026

> Viết bởi phiên điều phối Vận chuyển (Bảng điều phối lượt 1), theo lệnh chủ dự án: "báo toàn bộ kế hoạch, nhiệm vụ cụ thể của phân hệ Vận chuyển sang phiên điều phối và cho biết những gì đã làm và những gì còn lại".
> Người nhận: phiên "project coordination logistics".
> Tài liệu mô tả, không phải lời duyệt. Lời chủ nguyên văn nằm ở sổ hỏi đáp (mục 8).

## 1. Kế hoạch tổng của phân hệ

| Lượt | Nội dung | ADR | Trạng thái |
|---|---|---|---|
| Nền | Chặng đưa đón + danh sách hành khách của đơn — Phần A (máy chủ) | ADR-0047 | Thi công xong, nằm trong bản 1.38. **Phần B** (màn nhập chặng / khách, B0–B7) CHƯA làm. Mục 6 (phát hành 2) chưa làm. |
| Lượt 1 | Bảng điều phối: chuyến, xếp, rút / chuyển, xuất bến, tiến độ tài xế + văn phòng bấm thay, mốc 6 giờ + đặt gấp | ADR-0049 | Thi công xong, đang chuẩn bị phát hành **1.38** |
| Lượt 1 | Kernel lượt 1: giờ xảy ra thật khi bấm thay (VK1-A); giữ chuyến khi nơi hẹn đổi (VK1-B); điều kiện Kiểm định + Bảo hiểm (VK1-C) | ADR-0050 | Như trên |
| Lượt 1 | "Đã gọi báo" khi giờ hẹn đổi sau khi xếp | ADR-0051 | Như trên |
| Lượt 2 | Chuyển điểm, xe đang chạy (LC-15 mới, …) | ADR-0052 | Đã duyệt (lần 25), chưa thi công. Chỉ đòi lượt 1 **gộp main** |
| Lượt 3 | Tài xế đối tác dùng app, Từ chối, khung bận | ADR-0053 | Đã duyệt (lần 25). **Riêng Q-L3-B (siết "trong ngày chạy" cho tài xế công ty) phải áp TRƯỚC khi lượt 1 phát hành** → đang làm |
| Lượt 4 | Chiều về theo dịch vụ | ADR-0054 | Đã duyệt (lần 24), chưa thi công |
| Kernel 2–3 | Khung bận xe, giờ lái tối đa, số hiệu chuyến bay; cam kết xe riêng / cỡ xe; một dòng giấy tờ hiện hành | ADR-0055, ADR-0056 | Đã duyệt (lần 23), chưa thi công (VK3-B làm được ngay trên main) |
| Tiền | Tiền xe thuê; sổ tiền lượt 1 (ADR-0024…0026) | ADR-0057 | Đã duyệt (lần 22). Sổ tiền thi công ngay sau khi lượt 1 **gộp main**. Số migration `0044`, `0045` giữ cho sổ tiền |

Thứ tự phát hành: lượt 1 đi trước. Các ADR sau chỉ đòi lượt 1 **gộp main**, không đòi lên production. A-1b và A-2 thi công SAU bản phát hành T2 của ADR-0057. Nguồn: ADR-0052:233, ADR-0055:25/164, ADR-0056:125, ADR-0057:280.

## 2. Nhánh và HEAD (30/9)

| Nhánh | HEAD | Worktree | Vai |
|---|---|---|---|
| `giao-dien-dieu-phoi-luot-1` | `6593df1` | `.claude/worktrees/agent-a660d262caac3dc6e` | **Nhánh tích hợp — nhánh sẽ `day-len`**. Gồm máy chủ tới `7c8bdae`, giao diện, luật đã áp |
| `thi-cong-adr-0049-tiep` | `7c8bdae` (đang thêm Q-L3-B) | `.claude/worktrees/agent-a6e71c7e38dfbb4b5` | Nhánh máy chủ; nhánh tích hợp gộp lại sau |
| `ghi-trang-thai-1-37` | tệp này | `.claude/worktrees/hien-chuong-kien-truc` | Ghi chép điều phối. Đã vào main tới `bc8c8f5` (main `16d51bc`) |
| `main` | `16d51bc` | — | Từ `b300f40` chỉ thêm tài liệu (ADR-0052…0057, sổ, kế hoạch), không đổi mã |

Gộp `main` vào nhánh tích hợp (thử bằng `git merge-tree`) chỉ vướng `golden/README.md`: hai bên sửa hai dòng kề nhau, giữ cả hai.

## 3. Đã làm (lượt 1) và đã kiểm

**Chức năng:**
- Bảng điều phối xe, Chi tiết chuyến, Tạo / sửa chuyến.
- Chính sách điều phối / Lý do / Điều kiện xuất bến.
- Mốc 6 giờ + Đặt gấp trên đơn.
- Tài xế công ty: "Cuốc của tôi", bấm tiến độ. Văn phòng bấm thay, có giờ xảy ra thật.
- Rút khỏi xe / Chuyển sang xe khác.
- Máy tự gắn tên khách lúc xếp (I19(a)).
- Khách bị thay trong đơn → giữ `KHACH_DA_DOI` + nút "Cập nhật khách theo đơn", không cần phá lệ (chủ lần 16).
- Nơi hẹn đổi → "Cập nhật điểm theo đơn".
- Nhắc "Đã gọi báo". Lệnh lặp `requestId` trả đúng kết quả lần đầu (GA-59, GA-67 ĐÓNG).

**Vá an toàn (chủ lần 15):**
- Trigger gốc `orders_no_delete` chặn xoá đơn không phải nháp.
- Bài đo CPU của hook chạy riêng: `npm test` hai bước.

**Kiểm độc lập:** K2a, K2b, K2c (máy chủ + giao diện), K2d, K2e (máy chủ + giao diện), K2f (bản tích hợp + hồ sơ luật). Kết quả ĐẠT / ĐẠT CÓ ĐIỀU KIỆN, mọi điều kiện đã đóng.
- Lỗi CAO duy nhất (K2d: xe kẹt khi khách bị thay) đã sửa theo lựa chọn của chủ.
- Lần chạy cuối có e2e (K2f @ `728c643`): e2e 30/30, Chrome 8 kịch bản xanh.

**Luật:**
- Chủ duyệt lần 17 (ADR-0049 mục 0–3, 5–8, bốn dòng sổ hàng rào, đổi nhãn cũ) và lần 18 (ba chỗ chữ khớp mã).
- Điều phối đã áp trên nhánh tích hợp, mỗi tệp khớp từng byte bản đích dựng sẵn:

| Commit | Nội dung |
|---|---|
| `c974b63` | `src/CLAUDE.md` |
| `eba23ff` | `web/CLAUDE.md` |
| `e53e6e2` | `CLAUDE.md` |
| `5edce72` | `docs/ARCHITECTURE.md` |
| `a270afe` | 26 nhãn |
| `6593df1` | trạng thái đề xuất |

- Sau áp: `npm test` 1870 + 1 xanh, typecheck 0.

**Kiểm chỉ đọc 30/9:** `wrangler d1 migrations list --remote` → chưa áp `0034`, `0035`, `0040`, `0041`, `0042`, `0043`. Không có `0036`. Số bản kế tiếp là **1.38**; chưa nhánh nào dùng số này.

## 4. Đang chạy (lúc bàn giao)

- **Người kiểm độc lập phần áp luật** — chỉ đọc, chạy trong worktree tích hợp.
- **Phiên máy chủ: Q-L3-B** (ADR-0053 D7.2). Luật mới: "trong ngày chạy" = hôm nay là `service_date`, HOẶC `RUNNING` và đã xuất bến từ ngày chạy trở đi. Một hàm cho DTO tài xế và `lienHeChoTaiXe`. Sau đó cần người kiểm độc lập, rồi giao diện gộp và chạy lại `cuoc-smoke`.

## 5. Còn lại để phát hành 1.38 (theo thứ tự)

1. Kết quả người kiểm phần áp luật.
2. Q-L3-B xong → kiểm độc lập → nhánh tích hợp gộp.
3. **CHỜ CHỦ (chưa hỏi): tên khách.**
   - Tình trạng: chưa có màn cho nhân viên nhập tên khách (ADR-0047 Phần B chưa làm; route `/api/orders/:id/passengers` có sẵn nhưng không có màn nào gọi). Công tắc `require_manifest` gieo = 1, đúng ADR-0049 D2.
   - Hậu quả: chuyến có khách sẽ bị giữ `THIEU_TEN`, văn phòng không có chỗ nhập tên để gỡ.
   - Phương án:
     - (a) phát hành, rồi Toàn quyền tắt "bắt đủ danh sách" ở trang Chính sách điều phối cho tới khi có màn nhập tên;
     - (b) phát hành nhưng chưa dùng Điều phối cho chuyến thật;
     - (c) hoãn, làm Phần B trước.
   - Chạm pháp lý (danh sách hành khách), nên chủ quyết.
4. Gộp `main` vào nhánh tích hợp.
5. Mục nhật ký 1.38: `src/shared/changelog.ts`, kèm chuỗi kỳ vọng ở `app-info.test.ts`. Lời thường cho nhân viên; chủ đọc lướt.
   - Lưu ý: mốc 6 giờ có hiệu lực ngay với việc xác nhận đơn. Nên báo nhân viên.
6. Chạy `npm test`, typecheck, e2e đủ bộ, `node scripts/kiem-phien-ban.mjs`.
7. Chủ chạy:
   - `npm run day-len -- giao-dien-dieu-phoi-luot-1`;
   - `npm run trien-khai` — áp `0034`, `0035`, `0040`–`0043` cùng lần.
   - Sau khi các migration này áp thì không sửa tại chỗ được nữa. Lùi mã về 1.37 cần xem lại: bảng mới, trigger `orders_no_delete`.
8. Sau triển khai: `kiem-phien-ban --sau-deploy`, ghi trạng thái (HANDOFF-N1), thử iPhone thật.

## 6. Ruling của điều phối (KHÔNG phải lời chủ)

- **R-P25…R-P27**: sau K2a.
- **R-P28**: làm bù I19(a) theo kế hoạch đã chốt.
- **R-P29**: hình dạng lệnh `/cap-nhat-khach`, `KHACH_DA_DOI`, `PASSENGER_CHANGED`.
- **R-P30**: "Đã gọi báo" lần đầu dựng từ dòng mốc.
- **GA-61…GA-69**: người thi công ghi ở nhật ký thi công.
- **Tuỳ chọn trong ADR-0052:116 và ADR-0055:92** (sửa tại chỗ `0042` / `0041` trước khi áp remote): điều phối KHÔNG chọn, đi đường mặc định là migration mới ở lượt sau. Có thể xét lại TRƯỚC `trien-khai` 1.38; sau đó thì không còn chọn được.
- **Bề mặt, đảo ngược được:**
  - nút "Cập nhật khách theo đơn" không có hộp xác nhận;
  - `KHACH_DA_DOI` thuộc dòng "Đủ tên khách";
  - cỡ ổ khoá, nút khoá rõ;
  - số mục thanh bên theo mã.

## 7. Để sau (không chặn 1.38)

- **BACKLOG mục 6:** tài xế mất mạng tự gửi lại.
- **BACKLOG mục 7:** Q-B-15, Q-B-7, Q-B-10, Q-B-12, Q-B-13, Q-B-17; `v1-bao-tri` đỏ sẵn; `help-smoke` chập chờn; `canhBaoPhut`; sắp tên khách theo thứ tự đơn.
- **ADR-0047:** 4c, mục 6, gạch "(Tuỳ chọn)" của 4b.
- **Tài liệu:**
  - dòng `nhat-ky-loc-smoke` ở `web/CLAUDE.md`;
  - vế 8b ở dòng Trạng thái `docs/ARCHITECTURE.md`;
  - `docs/adr/README.md:83` ghi "số kế tiếp 0044" mà chưa nhắc sổ tiền đã giữ `0044`/`0045`.
- **Việc của chủ:**
  - thử iPhone thật;
  - vẽ bộ 1 (5 màn ADR-0047 Phần B);
  - hỏi luật sư về NĐ 158/2024.

## 8. Tài liệu chính

- Sổ hỏi đáp (lời chủ lần 1–25, bảng đối chiếu số sau khi gộp hai nhánh): `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`.
- Kế hoạch và nhật ký ADR-0049:
  - `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md` (trang ghép §10);
  - `…-adr-0049-thi-cong-nhat-ky.md`;
  - `…-adr-0049-giao-dien-nhat-ky.md`;
  - `…-adr-0049-de-xuat-luat.md`.
- Nhật ký thay đổi và quy trình phát hành: `docs/QUY-TRINH-PHAT-HANH.md`, `docs/CHANGE-GUIDE.md` công thức s, t; `docs/HANDOFF-N1.md`.
