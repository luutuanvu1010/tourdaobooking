# ADR-0216 — Xoá ảnh bằng chứng khỏi toàn bộ lịch sử kho (một lần, chủ tự chạy)

- **Trạng thái:** **đề xuất** 2026-11-16. Chủ dự án, nguyên văn: «đồng ý bỏ ảnh, vì giữ lại không có tác dụng gì sau khi việc đã hoàn thành, áp dụng không chỉ ở Local mà còn cả trên Github, nếu luật không phù hợp thì phải sửa luật». Chưa có lời duyệt văn bản này.
- **Loại:** việc lớn (triển khai, luật git). **Cửa:** **một chiều** — viết lại lịch sử đổi mã mọi lần lưu cũ; bản sao lưu ở bước 1 là đường lùi duy nhất.
- **Số quyết định:** 1. Không chạm quyền hay dữ liệu nghiệp vụ.
- **Quan hệ:** làm SAU ADR-0215 Đ3 (ảnh đã ra khỏi bản hiện tại). Là **ngoại lệ một lần, có ghi** của `CLAUDE.md` §8 «Không `--force`»: luật đó cấm AI; ở đây **chủ tự gõ** trong Terminal, AI chỉ soạn lệnh và kiểm trước/sau. Không nới luật chung, không tắt hook.

## Bối cảnh
Sau ADR-0215 Đ3, bản hiện tại hết ảnh, nhưng lịch sử vẫn giữ ~718 MB ảnh (3.457 tệp, 172 đợt từ 19/9): kho trên GitHub ~1 GB, `.git` trên máy ~1,2 GB, và vì kho **công khai** nên ai cũng xem được mọi ảnh cũ. Đo 16/11: GitHub có 92 nhánh (86 là `cho-kiem/*`), 0 bản fork, nhánh `main` không bật bảo vệ.

## Quyết định
Một lần, vào lúc không phiên nào đang làm, theo thứ tự:
1. **Sao lưu nguyên kho** (bản gương, có mọi nhánh) ra ổ ngoài; kiểm mở được.
2. Gộp hoặc bỏ mọi nhánh và bản làm việc đang mở (hiện ~20, 7 bản còn phần sửa chưa lưu) — việc nào bỏ thì chủ quyết từng việc.
3. Trên một bản sao mới: xoá mọi `docs/evidence/**/*.png` và `*.jpg` khỏi toàn bộ lịch sử bằng `git filter-repo` (chủ cài: `brew install git-filter-repo`).
4. Chủ đẩy cưỡng bức `main` lên GitHub, xoá các nhánh cũ trên GitHub (kể cả 86 nhánh `cho-kiem/*`, vì chúng còn giữ lịch sử cũ).
5. Gửi yêu cầu tới bộ phận hỗ trợ GitHub dọn bản lưu tạm của các lần lưu cũ (GitHub có thể vẫn trả về theo mã cũ cho tới khi họ dọn).
6. Trên máy: lấy lại kho từ GitHub, dựng lại bản làm việc; chạy một lượt `day-len` mới để có bản ghi kết luận kiểm theo mã mới trước lần `trien-khai` kế.

## Hệ quả
- **Được:** ảnh cũ không còn công khai với người tải kho từ nay; kho GitHub và `.git` trên máy nhỏ đi nhiều (ước lượng còn ~0,3 GB, chưa đo).
- **Mất / rủi ro:**
  - Mã mọi lần lưu cũ đổi: tài liệu, nhật ký, sổ trạng thái triển khai ghi mã cũ sẽ trỏ vào mã không còn (hồ sơ có ngày, không sửa lại).
  - Bản ghi kết luận kiểm theo mã cũ mất hiệu lực (bước 6 xử lý).
  - Ai đã tải kho về trước đó vẫn giữ ảnh của họ — không thu hồi được. Nếu lý do là ảnh lộ thông tin thật thì phải coi như đã lộ.
  - Làm sai thứ tự (chưa gộp nhánh) là mất việc đang dở; vì thế bước 1–2 là điều kiện bắt buộc.
- **Không làm:** đổi kho sang riêng tư (quyết định khác, có chi phí lượt kiểm — xem ADR-0179 «Hệ quả»).
