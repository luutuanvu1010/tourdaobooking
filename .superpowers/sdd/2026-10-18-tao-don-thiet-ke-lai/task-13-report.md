# Task 13 — Công cụ dọn tiến trình kiểm thử mồ côi

Tệp: `scripts/don-may.mjs` (đọc `ps`, tắt), `scripts/don-may-lib.mjs` (hàm thuần `phanLoai`, `phanTichEtime`), `src/don-may.test.ts` (13 bài), `scripts/chrome-tu-dong-dong.sh` (CHROME_BIN tự đóng), `docs/don-may-launchd.plist.example` (mẫu chỉ-in, chưa cài), 1 dòng `package.json`, 1 mục `docs/CHANGE-GUIDE.md` (công thức o, mục 8), 1 dòng `docs/SO-HANG-RAO.md`, mục 5 của `DE-XUAT-WEB-CLAUDE.md`.

## Đỏ -> xanh (19/10)
- Phá 1: Chrome luôn được nhận dạng (bỏ kiểm cờ debug + hồ sơ tạm) -> bài 1 "Chrome hằng ngày ... không bao giờ bị chọn" ĐỎ (12 xanh, 1 đỏ).
- Phá 2: bỏ kiểm cha còn sống -> bài 4 và 7 ĐỎ (11 xanh, 2 đỏ).
- Hoàn nguyên: 13/13 xanh. (Bài 7 từng đỏ thật lúc viết vì chỉ xét cha sống ĐẦU TIÊN, sửa để đi lên mọi tổ tiên tìm `npm run ...`; bài 5 từng đỏ vì workerd nhận sai argv0 "workerd serve".)

## Chế độ chỉ in trên máy thật (không --yes)
Chọn 50 tiến trình Chrome kiểm thử mồ côi tuổi 21-26 giờ (hồ sơ `tourdao-a2-chrome-*`, cha là launchd); bỏ qua 21 tiến trình wrangler/workerd/esbuild của e2e đang chạy (tuổi ~23 phút, còn trẻ). Không chạy --yes trên máy thật.

## --yes trên tiến trình GIẢ (chỉ đúng pid tự tạo, `ps` giả lọc theo pid)
Bản sao node đặt tên "Google Chrome" trong /tmp/tourdao-fake-dm: mồ côi cờ debug bị SIGTERM tắt; mồ côi bỏ qua SIGTERM bị SIGKILL; "Chrome hằng ngày" giả (không cờ) và con có cha sống còn nguyên. Đã dọn hết tiến trình giả.

## Bộ bọc chrome-tu-dong-dong.sh (Chrome giả qua CHROME_THAT, chu kỳ 1 giây)
A: kill -9 node cha -> bộ bọc, Chrome giả, tiến trình phụ biến mất trong <= 6 giây. B: Chrome giả thoát mã 7 -> bộ bọc thoát mã 7. C: SIGTERM bộ bọc (kịch bản gọi chrome.kill()) -> không còn mồ côi. Chưa thử với Chrome thật.

## Giới hạn
- macOS không có PDEATHSIG: canh theo chu kỳ (mặc định 2 giây). Bộ bọc và bộ canh cùng bị SIGKILL thì Chrome mồ côi; lưới cuối là `don-may`.
- Bộ bọc tuỳ chọn: kịch bản không đặt CHROME_BIN về nó thì không được canh (dựa vào kỷ luật); chưa có bản đối chứng "không bọc => mồ côi" thành bài tự động.
- Chỉ dọn hồ sơ/persist `tourdao-*` dưới thư mục tạm: Chrome headless của dự án khác không bị dọn (cố ý, an toàn hơn). Cha sống bất kỳ (kể cả shell) => bỏ qua, nên Chrome mồ côi dưới một terminal còn mở sẽ không bị dọn.
- workerd mồ côi không mang --persist-to: nhận qua cây cha, hoặc ppid=1 và nằm trong node_modules của tourdao-sales.
- `--yes` chưa từng chạy trên máy thật. Launchd chỉ là mẫu, chưa cài.

## Kiểm
`npm run typecheck` 0 lỗi; `node --test src/don-may.test.ts src/architecture.test.ts` 69/69 xanh. `npm test` đầy đủ CHƯA chạy: tải máy 354 (máy còn bận).
Chưa có người kiểm độc lập (việc không chạm dữ liệu/quyền/tiền/triển khai; nhưng là công cụ TẮT tiến trình nên nên có một lượt đọc).
