# Quy trình phát hành phiên bản mới — Tour Đảo Booking

> Tài liệu cho **chủ dự án**, viết bằng lời thường. Cập nhật 2026-09-24 (sau lần phát hành bản 1.4).
> Chi tiết kỹ thuật cho AI và lập trình viên: `docs/HANDOFF-N1.md` (mục "HAI LỆNH" và "bước A.0"), `docs/CHANGE-GUIDE.md` (công thức s và t).

## Tóm tắt một trang

| Bước | Ai làm | Làm gì | Ở đâu |
|---|---|---|---|
| 1 | Bạn | Nói với AI: **"Chuẩn bị phát hành bản mới"** | Trong Claude |
| 2 | AI | Thêm mục nhật ký (số mới, ví dụ 1.5), kiểm, báo **tên nhánh** | — |
| 3 | Bạn | Đọc lướt mấy dòng nhật ký, đồng ý hoặc bảo sửa | Trong Claude |
| 4 | Bạn | `cd …tourdao-sales` → `git checkout main` → `git pull --ff-only` | Ứng dụng **Terminal** |
| 5 | Bạn | `npm run day-len -- <tên-nhánh>` → gõ `c` | Terminal |
| 6 | Bạn | `npm run trien-khai` → trả lời các câu hỏi | Terminal |
| 7 | Bạn | Báo AI: **"Đã chạy xong"** | Trong Claude |
| 8 | AI | Kiểm production, ghi trạng thái, báo tên nhánh ghi chép | — |
| 9 | Bạn | `npm run day-len -- <tên-nhánh ghi chép>` → gõ `c` | Terminal |

---

## Vì sao có quy trình này

- **Số phiên bản đi theo nhật ký.** Số phiên bản không nằm rời ở đâu cả. Nó lấy từ **mục đầu tiên của nhật ký thay đổi**. Thêm một mục mới thì mọi chỗ hiện "Phiên bản…" đều đổi theo: màn đăng nhập, trang Trợ giúp, thông tin máy chủ gửi ra. Chấm đỏ "có bản mới" cũng hiện cho nhân viên. Trước đây số phiên bản đứng yên ở 1.0 qua 9 lần phát hành, vì không có bước nào nhắc phải đổi.
- **AI không được tự đẩy code lên GitHub hay tự phát hành** (luật dự án). Hai việc này luôn do bạn gõ lệnh, để mọi thay đổi lên hệ thống thật đều qua tay bạn.
- **Hai lệnh `day-len` và `trien-khai` tự kiểm và tự dừng** khi có gì sai. Nhờ vậy không bỏ sót bước nào và không lỗi do quên. Hai lệnh chỉ chạy trong **ứng dụng Terminal của macOS**. Gõ qua Claude thì lệnh tự từ chối.

---

## Bước 1–3: Chuẩn bị (trong Claude)

**Bạn nói:**
> Chuẩn bị phát hành bản mới

Nếu lần này **không muốn lên số** (chỉ sửa bên trong, không có gì nhân viên thấy khác, hoặc triển khai lại đúng bản cũ), nói:
> Phát hành, không lên số

**AI sẽ làm:**
- Thêm **một mục mới vào đầu nhật ký thay đổi**. Số phiên bản tăng 1 ở phần sau dấu chấm: 1.4 → 1.5, và 1.9 → 1.10 (không phải 2.0). Ngày ghi là ngày phát hành dự kiến. Nội dung là vài dòng **lời thường cho nhân viên**: họ thấy gì mới, cái gì đã sửa, cái gì đổi cách dùng.
- Chạy kiểm thử. Máy tự chặn câu có chữ kỹ thuật (như "API", "deploy", tên tệp…), câu dài quá 160 ký tự, và số phiên bản sai thứ tự.
- Báo bạn **tên nhánh** cần gộp, ví dụ `worktree-ten-viec`.

**Bạn làm:** đọc lướt các dòng nhật ký. Đây là thứ nhân viên sẽ đọc, nên chỉ cần chắc là đúng và dễ hiểu. Đồng ý, hoặc bảo AI sửa câu nào.

**Vì sao:** nhật ký không tự sinh được từ ghi chú lập trình, vì ghi chú đó toàn chữ kỹ thuật. Để AI viết lời thường và bạn duyệt là cách chắc nhất.

---

## Bước 4: Về đúng chỗ, lấy bản mới nhất (Terminal)

Mở **ứng dụng Terminal** (không gõ qua Claude). Gõ lần lượt từng dòng:

```
cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales
```
**Để làm gì:** vào thư mục gốc của dự án. Hai lệnh phát hành chỉ chạy ở đây.

```
git checkout main
```
**Để làm gì:** chuyển sang **nhánh chính (`main`)**, là bản sẽ được phát hành. Nếu báo lỗi "có thay đổi chưa lưu", dừng lại và hỏi AI.

```
git pull --ff-only
```
**Để làm gì:** lấy những gì mới nhất trên GitHub về máy. Có thể một phiên làm việc khác đã đẩy thứ gì lên. `--ff-only` nghĩa là chỉ lấy khi không phải trộn lẫn gì; nếu phải trộn thì lệnh dừng, để không có gì bị gộp âm thầm.

---

## Bước 5: Gộp và đẩy lên GitHub — `npm run day-len`

```
npm run day-len -- <tên-nhánh>
```
Thay `<tên-nhánh>` bằng tên AI báo ở bước 2. Nếu nhánh chính đã có sẵn mọi thứ, gõ `npm run day-len` (không kèm tên nhánh).

**Lệnh tự làm theo thứ tự, và dừng ngay khi có gì sai:**
1. Kiểm bạn đang ở Terminal thật, đang ở nhánh `main`, không còn thay đổi chưa lưu.
2. Kiểm GitHub không có thứ gì mới hơn máy bạn. Nếu có, lệnh dừng và bảo bạn chạy `git pull --ff-only`.
3. Gộp nhánh vào `main`. Chỉ gộp khi nối thẳng được; không bao giờ trộn hay ghi đè.
4. Chạy test và kiểm lỗi. Nếu đỏ, lệnh dừng và in lệnh để bạn tự quay lại nếu muốn.
5. In danh sách những gì sắp đẩy. Nếu có **thay đổi dữ liệu mới (migration)** thì in cảnh báo.
6. Hỏi **"Đẩy lên GitHub? (c/k)"**. Gõ `c` để đẩy.

**Vì sao:** chỉ phát hành mã **đã có trên GitHub**. Như vậy luôn có bản lưu và luôn biết chính xác đang chạy bản nào.

---

## Bước 6: Phát hành lên hệ thống thật — `npm run trien-khai`

```
npm run trien-khai
```
Lệnh chạy vài phút, vì nó tự chạy toàn bộ kiểm thử, kể cả kiểm thử cần mạng. Phần lâu nhất là kiểm thử đầu-cuối (bước 3b): từ 30/9 chạy song song 3 nhóm, khoảng **5–7 phút** (trước đó chạy lần lượt khoảng 12 phút) — vẫn đủ mọi bài kiểm.

**Lệnh tự làm theo thứ tự:**

| # | Lệnh làm gì | Vì sao |
|---|---|---|
| 1 | Kiểm `main` trên máy trùng với GitHub | Chỉ phát hành mã đã đẩy |
| 1b | **Kiểm đăng nhập Cloudflare** và làm mới vé đăng nhập | Phòng lỗi 7403 (xem dưới) |
| 1c | **Kiểm khoá bí mật bắt buộc** đã đặt chưa (`SESSION_SECRET`, `LAN_GUI_SECRET` — chỉ đọc TÊN, không đọc giá trị) | Thiếu khoá thì sau khi phát hành mọi màn hình báo lỗi. Lệnh dừng và in đúng câu `npx wrangler secret put …` cần chạy |
| 2 | Đọc xem hệ thống thật còn **thay đổi dữ liệu** nào chưa áp | Phát hành mã cần dữ liệu mới khi dữ liệu chưa có là hỏng app |
| 2b | **So số phiên bản**: bản trên máy phải **mới hơn** bản đang chạy | Bắt lỗi quên ghi nhật ký |
| 3 | Chạy test, kiểm lỗi, dựng giao diện | Không phát hành mã hỏng |
| 3b | Chạy **toàn bộ kiểm thử đầu-cuối** (cần mạng) | Thử app như người dùng thật, trên dữ liệu tạm |
| 4 | Nếu có thay đổi dữ liệu: tạo **điểm khôi phục**, rồi hỏi có áp không | Có đường quay lại nếu dữ liệu hỏng |
| 5–6 | Hỏi, rồi **phát hành** | — |
| 7 | **Kiểm dữ liệu thật** (chỉ đọc) | Chắc dữ liệu không bị vi phạm quy tắc |
| 7b | **So số phiên bản lần nữa**: hệ thống thật phải chạy **đúng** số mới (không đạt thì chờ 20 giây rồi thử lại một lần) | Chắc bản mới đã thực sự lên |
| 8 | In **khối tóm tắt** | Để ghi lại |

**Các câu lệnh có thể hỏi, và cách trả lời:**

| Câu hỏi | Trả lời |
|---|---|
| "Bản ở máy không mới hơn production (quên thêm mục nhật ký thay đổi?)… Vẫn tiếp tục? (c/k)" | Gõ `c` **chỉ khi** bạn đã chọn "không lên số". Nếu không, gõ `k` rồi báo AI (tức là quên thêm mục nhật ký). |
| "Có kịch bản e2e đỏ. Vẫn tiếp tục? (c/k)" | **Chép phần chữ đỏ gửi AI trước khi trả lời.** Có khi đỏ vì lý do bên ngoài (ví dụ giá trên Google Sheet vừa đổi), có khi là lỗi thật. |
| "Áp N migration này lên production? (c/k)" | Gõ `c` **chỉ khi AI đã báo trước** là lần này có thay đổi dữ liệu. Nếu không được báo, gõ `k` rồi hỏi AI. |
| "Triển khai Worker lên production? (c/k)" | Gõ `c`. (Nếu vừa áp thay đổi dữ liệu thì **phải** gõ `c` ngay, vì mã cũ không chạy đúng trên dữ liệu mới.) |

**Nếu lệnh dừng ở bước 1c ("Chưa đặt khoá …")**: chưa có gì bị đổi. Chạy đúng dòng lệnh nó in ra (ở thư mục `tourdao-sales`, trong Terminal), rồi chạy lại `npm run trien-khai`. Khoá sinh ngẫu nhiên, không cần ghi lại.

**Trong lúc `npm run trien-khai` đang chạy, đừng chạy `npm run day-len` (hay lệnh git nào) ở cùng thư mục `tourdao-sales`**, kể cả khi một phiên AI khác nhờ. Ngày 8/10 đã xảy ra: phần mã mới nhập vào giữa chừng làm kiểm thử đỏ giả. Từ 8/10 lệnh tự so lại mã ở ba lúc: sau kiểm thử, trước khi áp thay đổi dữ liệu, và trước khi phát hành (hai lúc sau nằm ngay sau câu hỏi, nên dù bạn gõ `c` lệnh vẫn không đi tiếp). Mã đã đổi thì lệnh **dừng** và in câu "mã trong thư mục đã đổi". Khi đó chờ việc kia xong rồi chạy lại `npm run trien-khai` từ đầu. Nếu lệnh dừng kiểu này **sau khi đã áp thay đổi dữ liệu**, nó in một khối chữ đỏ gồm ba bước lệnh để phát hành đúng bản đã kiểm. Làm theo **ngay**, từng dòng thụt vào, vì mã cũ đang chạy trên dữ liệu mới. Dòng đầu tự dừng nếu thư mục chưa sạch, nếu không đổi được về bản đã kiểm, hoặc nếu phát hành lỗi: nếu nó in "DỪNG", hoặc bất kỳ lệnh nào báo lỗi, thì ngừng, chép khối chữ đỏ cùng các dòng lỗi phía trên gửi AI, rồi chạy `git switch main` để về lại nhánh chính.

**Nếu lệnh dừng giữa chừng** ở bước 1–3b: chưa có gì bị đổi trên hệ thống thật. Chép thông báo gửi AI. Hay gặp nhất: một test đo tốc độ báo đỏ khi máy đang bận. Khi đó đóng bớt ứng dụng nặng rồi chạy lại `npm run trien-khai`.

**Nếu gặp lỗi Cloudflare 7403** ("The given account is not valid or is not authorized to access this service"), đã gặp 26/9, 29/9, 1/10:
- **Nguyên nhân rất có thể:** vé đăng nhập Cloudflare của máy chỉ sống 1 giờ. Lời gọi đầu tiên sau khi vé hết hạn bị từ chối; chạy lại thì qua. Tài khoản và quyền vẫn đúng.
- **Phòng ngừa, lệnh tự làm từ 1/10:** kiểm đăng nhập trước (bước 1b). Nếu vẫn gặp 7403 ở bước đọc thì tự chờ 5 giây và thử lại **một lần**. Các bước ghi (áp dữ liệu, phát hành) không bao giờ tự thử lại.
- **Nếu lệnh vẫn dừng vì 7403:** chưa có gì bị đổi trên hệ thống thật. Làm lần lượt:
  1. Chạy lại `npm run trien-khai`.
  2. Vẫn lỗi thì chạy `npx wrangler logout`, rồi `npx wrangler login`, chọn đúng tài khoản **Lưu Tuấn Vũ**, rồi chạy lại.
  3. Vẫn lỗi thì chép thông báo gửi AI.

**Nếu không thấy chữ nào hiện ra** sau câu hỏi kiểm thử đầu-cuối (đã từng xảy ra): cứ chờ lệnh chạy xong. Sau đó AI sẽ kiểm lại bằng lệnh chỉ đọc.

**Nếu cần quay lại bản cũ:** lệnh **không tự quay lại**. Hãy báo AI; AI sẽ đưa bạn đúng lệnh quay lại và bản cần quay về (ghi ở mục "TRẠNG THÁI TRIỂN KHAI" của `docs/HANDOFF-N1.md`).

---

## Bước 7–9: Kiểm và ghi lại

Bạn báo AI:
> Đã chạy xong

**AI sẽ:**
- Kiểm hệ thống thật bằng lệnh **chỉ đọc**: số phiên bản đúng chưa, còn thay đổi dữ liệu chờ không, dữ liệu có đạt không.
- Ghi trạng thái vào `docs/HANDOFF-N1.md` và báo bạn **tên nhánh ghi chép**.

**Bạn chạy** (Terminal, thư mục gốc dự án):
```
npm run day-len -- <tên-nhánh ghi chép>
```
Gõ `c` khi được hỏi.

**Vì sao:** tài liệu và bộ nhớ từng ghi sai tình trạng hệ thống thật, khi nhiều phiên làm việc cùng phát hành. Vì vậy mỗi lần đều phải kiểm bằng lệnh thật rồi ghi lại.

---

## Sau khi phát hành

- Số phiên bản mới hiện ở **màn đăng nhập** và **trang Trợ giúp**. Nhân viên thấy **chấm đỏ** ở mục Trợ giúp cho tới khi mở trang đó.
- Nhân viên có thể phải **mở lại app một lần** mới thấy bản mới, vì app trên điện thoại giữ bản cũ trong bộ nhớ đệm.
- Nếu **chế độ bảo trì đang bật**, nhân viên chỉ thấy bản mới sau khi tắt bảo trì. Lệnh phát hành không đụng tới chế độ bảo trì.

## Không được làm

- Không phát hành bằng lệnh tay (`wrangler deploy`) thay cho `npm run trien-khai`. Làm tay thì hai lần so số phiên bản và bước kiểm dữ liệu **không chạy**.
- Không gõ hai lệnh phát hành qua Claude. Chúng sẽ tự từ chối.
- Không trả lời `c` cho câu hỏi thay đổi dữ liệu khi chưa được AI báo trước.
