# ADR-0176 — Phát hành trọn vòng trong khoảng 10 phút: kiểm đủ bộ một lần trên máy GitHub

- **Trạng thái:** **accepted** 2026-11-06 — chủ dự án duyệt trong phiên soạn, nguyên văn: *«Duyệt ADR-0176»*. Lệnh soạn trước đó, nguyên văn: *«ok vậy giữ nguyên quyết định, yêu cầu mỗi lần phát hành chỉ khoảng 10 phút cho tổng thời gian, soạn đi»*. Chưa thi công: luật phát hành hiện hành (`CLAUDE.md` §8, `docs/HANDOFF-N1.md`) vẫn áp tới khi mã mới qua tiêu chí nghiệm thu bên dưới.
- **Ngày:** 2026-11-06   **Loại:** việc lớn (triển khai, luật phát hành, hàng rào).
- **Cửa:** hai chiều. Quay lại cách cũ = trả hai bước kiểm về `day-len`/`trien-khai` như trước (mã cũ còn trong lịch sử git); không đụng dữ liệu production.
- **Số:** 0176, đã soát mọi nhánh 6/11 (số lớn nhất `0175` ở nhánh `claude/ve-tour-dao-nghien-cuu`).
- **Số quyết định trong lượt duyệt:** 3 (Đ1–Đ3). Không chạm quyền hay dữ liệu nghiệp vụ, nên không cần trang ghép (`CLAUDE.md` §9).
- **Nguồn:** điều tra 6/11 (ghi chú phiên `2026-11-06-trien-khai-cham-o-dau.md`, `2026-11-06-kiem-mot-lan-khong-bo-sot.md` ở thư mục ghi chú chung, ngoài kho). Người kiểm độc lập (chỉ đọc) đọc bản đầu 6/11: KHÔNG ĐẠT, một chỗ chặn và năm chỗ nên sửa; bản này đã sửa cả sáu. Vòng hai 6/11: ĐẠT, không còn chỗ chặn; hai chỗ nên sửa (mốc so ở `trien-khai`, danh sách tệp điều khiển kiểm và việc xoá/bỏ qua bài) đã sửa ở Đ2.2–Đ2.3, chưa kiểm vòng ba.
- **Quan hệ với luật cũ:** sửa thứ tự cổng ở `CLAUDE.md` §8 ("test + typecheck + e2e xanh" trước migration — **giữ nghĩa**, đổi nơi chạy), runbook `docs/HANDOFF-N1.md`, `docs/QUY-TRINH-PHAT-HANH.md` bước 5–6, đặc tả `docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md`. Các tệp đó chỉ sửa **sau** khi ADR này được duyệt. Cổng số phiên bản giữ nguyên, không thuộc ADR này.

## Bối cảnh

Đo 6/11 trên máy chủ (10 lõi): `npm test` 416 giây (831 tệp, 8.033 bài), typecheck 1 giây, build 1 giây; thử đầu-cuối ước lượng 9–11 phút (79 kịch bản, 3 nhóm; chưa đo đủ bộ). Một lần phát hành hôm nay:

| Lệnh | Việc | Thời gian |
|---|---|---|
| `npm run day-len` | `npm test` + typecheck rồi đẩy `main` | ~7 phút |
| `npm run trien-khai` | cổng chỉ-đọc, **`npm test` lần hai cho đúng commit đó**, e2e, migration, deploy, kiểm dữ liệu | ~18–20 phút |
| **Tổng** | | **~25–27 phút** |

`trien-khai` từ chối chạy khi `main` ≠ `origin/main` (`scripts/release-lib.mjs`, hàm `trienKhai`, bước 1), nên nó luôn kiểm lại đúng bản `day-len` vừa kiểm: lặp ~7 phút. Chủ đã chọn **kiểm toàn bộ, không kiểm riêng phần thay đổi** (6/11), vì một chỗ sửa có thể làm hỏng chỗ khác ở xa, và nhiều bài canh luật chung của cả Nền tảng.

Kho `luutuanvu1010/tourdaobooking` đang **công khai** (đọc bằng `gh api` 6/11) nên GitHub Actions máy chuẩn miễn phí. Thử đầu-cuối không cần khoá thật: khoá phiên, Turnstile thử, trợ lý giả đều truyền bằng `--var` trong `tests/e2e/run.mjs`; R2 và Email chạy bộ mô phỏng; Sheet ID nằm sẵn trong `wrangler.jsonc`. Vẫn cần mạng (đọc Sheet thật, gọi siteverify).

## Đ1 — Mục tiêu thời gian và nơi chạy kiểm

1. **Mục tiêu (Hiến pháp 6.2):** tổng thời gian một lần phát hành, tính từ lúc chủ gõ `npm run day-len` tới lúc `trien-khai` in khối tóm tắt (không tính lúc chủ suy nghĩ ở câu c/k), **khoảng 10 phút**: chờ GitHub kiểm ~6 phút, `trien-khai` ~3 phút, phần còn lại của `day-len` ~1 phút. Ngưỡng gần như không có dư (hàng đợi GitHub, cài gói ở từng máy, máy GitHub 4 lõi chậm hơn máy chủ 10 lõi). Hụt mục tiêu thì người thi công báo số đo từng chặng cho chủ, kèm cách bù (thêm phần, lưu đệm gói); **không tự nới mục tiêu**, không bỏ bài.
2. Bộ kiểm đủ bộ chạy **trên máy GitHub** (GitHub Actions), **chia nhỏ** ra nhiều máy chạy cùng lúc:
   - **Một phần riêng, chạy một lần:** Bước 0 (sinh lại kho trợ lý, đỏ nếu tệp sinh đổi), typecheck, và bài đo giờ của hook chạy một mình (`--test-concurrency=1`) — không lặp ở các phần khác, không ghi chồng tệp sinh.
   - `npm test` còn lại chia ≥ 4 phần; thử đầu-cuối chia ≥ 6 phần, mỗi phần một D1 tạm + `wrangler dev` riêng và **tự chạy `audit-invariants --strict` cuối phần** như mỗi nhóm hôm nay. Số phần chỉnh theo số đo.
3. **Không bỏ bài nào — máy kiểm:** bước đầu của lượt kiểm sinh danh sách phần từ đúng nguồn hiện nay (glob `src/**/*.test.ts` của `scripts/chay-test.mjs`, mảng `ALL` của `tests/e2e/run.mjs`) và **đỏ** nếu: hợp các phần ≠ toàn bộ; một bài nằm ở hai phần; thiếu phần riêng của mục 2; một phần e2e không báo kết quả `audit-invariants`. Bước gom cuối chỉ xanh khi **mọi** phần xanh.
4. Mỗi lượt kiểm ghi giây thật của từng kịch bản e2e để chia phần cho cân (thay bảng `THOI_GIAN` đoán tay từ 30/9).
5. Máy chủ không chạy lại hai bộ kiểm này khi phát hành. AI vẫn chạy bài liên quan trong lúc làm (như hôm nay); lần đó không thay lần kiểm đủ bộ (N8).

## Đ2 — `day-len` chờ kết quả rồi mới đẩy `main`; `trien-khai` chỉ đọc kết quả

1. `day-len`: gộp tiến thẳng vào `main` ở máy như hôm nay → đẩy **đúng commit đó lên nhánh `cho-kiem/<mã commit đầy đủ>`** trên GitHub (mỗi commit một nhánh, không `--force`, không bao giờ đẩy `main` ở bước này) → chờ lượt kiểm, chỉ nhận lượt chạy có commit đầu bằng đúng mã đó, in tiến độ từng phần → **chỉ khi xanh** mới hỏi "Đẩy lên GitHub? (c/k)" và đẩy `main`. Giữ luật "kiểm xong mới đẩy `main`". Ghi rõ cho chủ: lệnh có **một lần đẩy phụ** (nhánh chờ kiểm, công khai như mọi nhánh của kho) trước câu c/k.
2. `trien-khai`: thay bước 3 (`npm test`, typecheck) và 3b (e2e) bằng **một lần đọc** (chỉ đọc, qua `gh api`) kết quả kiểm của **đúng mã commit `main`**. Chỉ nhận kết quả do **ứng dụng GitHub Actions** tạo (không nhận "commit status" ai có khoá API cũng đăng được), đủ mọi phần, bước gom xanh, không quá **24 giờ**. Thiếu, đang chạy, đỏ, quá hạn hay đọc lỗi ⇒ **DỪNG**, chưa đổi gì trên production; in lệnh chạy lại lượt kiểm. Thêm vào đó, `trien-khai` đòi **bản ghi kết luận của `day-len` cho đúng commit** (trên máy chủ, cùng thư mục với Đ3): "xanh thường", "cho qua" (Đ3.1) hay "đổi quy trình kiểm" (Đ3.2). Commit lên `main` không qua `day-len` thì không có bản ghi ⇒ **DỪNG**.
3. **Tệp điều khiển việc kiểm** nằm trong chính commit được kiểm, nên một commit sửa chúng có thể làm lượt kiểm bỏ bài mà vẫn "xanh". Danh sách: `.github/workflows/**`, `package.json` (lệnh `test`, phiên bản Node), `scripts/chay-test.mjs`, tệp chia phần mới, `tests/e2e/run.mjs`, `scripts/audit-invariants.mjs` và các tệp câu kiểm nó nạp, `src/claude-guard-thoi-gian.test.ts`, `scripts/release-lib.mjs`. `day-len` (người duy nhất có mốc so đúng: `origin/main` **trước khi** đẩy) **so nội dung (băm git) các tệp này** giữa commit mới và `origin/main`, và so **số tệp kiểm, số bài, số bài bỏ qua (`skip`/`todo`)** do lượt kiểm báo với lượt kiểm của `origin/main`. Tệp điều khiển khác, hay số tệp/số bài giảm, hay số bài bỏ qua tăng ⇒ đi Đ3.2, không được coi là xanh thường; kết luận ghi vào bản ghi mà `trien-khai` đọc. Xoá hay bỏ qua một bài vẫn làm được, nhưng không còn lặng lẽ: phải có lý do chủ gõ.
4. `trien-khai` vẫn chạy `npm run build:web` (1 giây, sản phẩm để deploy), các cổng chỉ-đọc, Time Travel, migration, deploy, kiểm dữ liệu, hai cổng phiên bản như hôm nay.
5. Khối tóm tắt ghi thêm: đường dẫn lượt kiểm trên GitHub, lúc xanh, có "cho qua" hay "đổi quy trình kiểm" không, và thời gian thật của từng chặng (đối chiếu Đ1.1). Vượt mục tiêu thì in cảnh báo, **không** chặn.
6. Tệp quy trình `.github/workflows/` thành **tệp luật**: chỉ sửa bằng công cụ sửa tệp để chủ được hỏi (thêm vào hook `guard-tep.mjs`, siết theo Điều 9.4). Hook chỉ chặn nhầm/quên; lớp chặn thật là Đ2.3.

## Đ3 — Hai chỗ chỉ chủ cho qua được, và phải để lại lý do

1. **Lượt kiểm đỏ.** `day-len` nêu tên bài/kịch bản đỏ và hỏi: chạy lại phần đỏ (khuyến nghị, vì e2e từng đỏ giả rồi chạy lại xanh) / dừng / **cho qua**. Cho qua phải **gõ lý do** (ví dụ "giá Sheet thật vừa đổi"). Lý do, tên bài đỏ, mã commit và giờ được ghi vào **bản ghi cho qua trên máy chủ** (thư mục trong `.git`, ngoài cây mã; GitHub không ghi được vào kết quả của Actions). `trien-khai` chỉ chấp nhận kết quả đỏ khi có bản ghi cho qua của **đúng commit** đó, và in lý do ở khối tóm tắt để chép vào `docs/HANDOFF-N1.md`. Bản ghi này nằm trên máy nên chỉ chặn nhầm/quên, không chống cố ý làm giả — giống các hàng rào hiện có; hook chặn AI ghi vào thư mục đó.
2. **Đổi tệp điều khiển việc kiểm** (Đ2.3). `day-len` in danh sách tệp đổi và đoạn khác biệt, rồi đòi chủ gõ lý do; ghi cùng cách mục 1 với nhãn "đổi quy trình kiểm". Khuyến nghị cho người thi công: commit đổi quy trình kiểm đi một lần phát hành riêng, không gộp với thay đổi tính năng, để chủ đọc được.

## Hệ quả

- **Được:** tổng ~25–27 phút → **khoảng 10 phút** (mục tiêu, chưa đo); mỗi bài kiểm chạy đúng một lần cho mỗi bản mã; kết quả xanh nằm trên GitHub nên máy chủ (kể cả AI) không làm giả được — chắc hơn hôm nay.
- **Mất / rủi ro:**
  - Phụ thuộc GitHub: GitHub lỗi thì không phát hành được (lối thoát: chạy lại lượt kiểm; không có đường chạy tay thay thế — muốn có thì là ADR khác).
  - Kho phải **còn công khai** để Actions miễn phí. Nếu chủ đổi kho sang riêng tư: gói miễn phí 2.000 phút máy/tháng; một lượt ~50 phút máy (~11 phần × ~5 phút) ⇒ ~40 lượt/tháng.
  - Thử đầu-cuối chạy trước lúc deploy vài phút tới tối đa 24 giờ, nên giá Sheet đổi trong khoảng đó không bị bắt ở lúc deploy (chấp nhận được: đỏ kiểu này hôm nay chủ vẫn cho qua).
  - Thử đầu-cuối **chưa từng chạy trên Linux** của GitHub; bài đo giờ của hook nhạy với máy chậm; con số ~6 phút là ước lượng.
  - "Không bài nào bỏ qua được" là **không bỏ lặng lẽ**: mọi lần bớt bài hay đổi cách kiểm đều dừng và đòi lý do của chủ (Đ2.3, Đ3.2); bản ghi lý do nằm trên máy nên chỉ chặn nhầm/quên, không chống cố ý.
  - Nhánh `cho-kiem/*` tích dần trên GitHub; cần lệnh dọn (chủ chạy, xoá nhánh đã nhập `main`).

## Tiêu chí nghiệm thu (P20)

1. Ba lần phát hành thật liên tiếp có khối tóm tắt ghi đủ thời gian từng chặng; trung vị tổng ≈ 10 phút (Đ1.1). Không đạt ⇒ báo chủ, không tự nới.
2. Bài "hợp các phần = toàn bộ": bỏ cố ý một tệp khỏi danh sách phần ⇒ đỏ ⇒ hoàn nguyên; bỏ cố ý `audit-invariants` ở một phần e2e ⇒ đỏ ⇒ hoàn nguyên (P16).
3. Bài của `release-lib.test.ts`: `trien-khai` dừng khi kết quả thiếu / đang chạy / đỏ không có bản ghi cho qua / quá 24 giờ / sai commit / không do GitHub Actions tạo / tệp điều khiển kiểm khác `origin/main` mà không có bản ghi Đ3.2; chỉ đi tiếp khi đủ và xanh.
4. Quan sát thật hai lần: (a) đẩy một commit có bài đỏ cố ý lên nhánh chờ kiểm ⇒ `day-len` không đẩy `main`; (b) commit sửa quy trình để bỏ một bài ⇒ `day-len` dừng ở Đ3.2 dù lượt kiểm xanh. Hoàn nguyên cả hai.
5. Dòng mới ở `docs/SO-HANG-RAO.md` cho các hàng rào (cổng đọc kết quả, bài hợp các phần, so tệp điều khiển kiểm), kèm ngày quan sát chặn thật.
6. Người kiểm độc lập (chỉ đọc) ĐẠT trước khi chủ dùng lần đầu.

## Điều chủ duyệt khi đọc

- Đ1: mục tiêu khoảng 10 phút; kiểm chuyển lên GitHub, chia nhỏ, đủ bộ, máy đỏ khi thiếu bài.
- Đ2: `day-len` đẩy nhánh chờ kiểm, chờ xanh rồi mới đẩy `main`; `trien-khai` không chạy lại, chỉ đọc kết quả của đúng commit (hạn 24 giờ); tệp điều khiển kiểm bị đổi thì không coi là xanh thường.
- Đ3: chỉ chủ cho qua được (lượt kiểm đỏ, đổi quy trình kiểm), phải gõ lý do, lý do vào khối tóm tắt.
- Ghi nhận: kho đang công khai — chủ xác nhận đó là ý muốn (độc lập với ADR này, nhưng Đ1 dựa vào nó để miễn phí).
