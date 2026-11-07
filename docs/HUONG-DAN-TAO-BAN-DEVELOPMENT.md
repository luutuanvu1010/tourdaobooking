# Hướng dẫn chủ tạo tài nguyên cho bản Development

Bản Development (bản thử, địa chỉ `dev.tourdao.vn`) là một Worker riêng, có cơ sở dữ liệu và kho tệp riêng, không dùng chung gì với bản chính thức. Trang này giúp bạn tạo các tài nguyên đó trên Cloudflare, làm một lượt là xong. Làm xong, bạn gửi cho AI hai thứ không phải bí mật: mã cơ sở dữ liệu và khoá công khai VAPID. Đừng dán bất kỳ bí mật nào vào cuộc trò chuyện.

**Hai lời dặn quan trọng.**

1. **Mỗi lệnh `wrangler` dưới đây đều phải có đuôi `--config wrangler.dev.jsonc`. Thiếu đuôi này là ghi đè khoá và tài nguyên của bản chính thức.** Cứ chép nguyên lệnh, đừng bỏ đuôi.
2. **Nếu wrangler hỏi có muốn sửa tệp cấu hình không, trả lời n.** AI sẽ tự điền mã vào `wrangler.dev.jsonc` sau; không để máy tự sửa.

## Chuẩn bị

Mọi lệnh chạy trong Terminal, đứng ở thư mục sau (là bản làm việc đang thi công; `wrangler.dev.jsonc` hiện chỉ có ở đây). Sau khi bản sửa được nhập vào bản chính trong kho mã, từ đó trở đi bạn chạy ở thư mục gốc `tourdao-sales`.

```bash
cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/compassionate-wing-38e61d
```

Nếu máy chưa đăng nhập Cloudflare (đúng tài khoản Lưu Tuấn Vũ), chạy lệnh này trước.

```bash
npx wrangler login --config wrangler.dev.jsonc
```

## Bước 1. Tạo cơ sở dữ liệu

Lệnh này tạo cơ sở dữ liệu riêng của bản Development. Kết quả có một dòng mã dạng `database_id`; chép mã đó gửi cho AI (không phải bí mật).

```bash
npx wrangler d1 create tourdao-sales-dev-db --config wrangler.dev.jsonc
```

## Bước 2. Tạo ba kho tệp

Mỗi lệnh dưới đây tạo một kho. Chạy lần lượt từng lệnh; nếu wrangler hỏi sửa cấu hình thì trả lời **n**.

```bash
npx wrangler r2 bucket create tourdao-sales-dev-ho-so --config wrangler.dev.jsonc
```

```bash
npx wrangler r2 bucket create tourdao-sales-dev-ho-tro --config wrangler.dev.jsonc
```

```bash
npx wrangler r2 bucket create tourdao-sales-dev-ve-dien-tu --config wrangler.dev.jsonc
```

## Bước 3. Tạo cặp khoá thông báo điện thoại (VAPID)

Lệnh này chạy đúng một lần. Nó in ra một dòng bắt đầu bằng `KHOA CONG KHAI:` (không phải bí mật, chép dòng đó gửi cho AI) và tự đặt nửa bí mật lên Cloudflare mà không hiện ra màn hình. Chạy lại lần hai sẽ sinh cặp khác và làm lệch cặp, nên chỉ chạy một lần.

```bash
node -e 'const s=crypto.subtle;s.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]).then(async k=>{const j=await s.exportKey("jwk",k.privateKey);console.error("KHOA CONG KHAI:",Buffer.from(await s.exportKey("raw",k.publicKey)).toString("base64url"));process.stdout.write(JSON.stringify({kty:j.kty,crv:j.crv,x:j.x,y:j.y,d:j.d}))})' | npx wrangler secret put VAPID_PRIVATE_KEY --config wrangler.dev.jsonc
```

## Bước 4. Tạo ba khoá bí mật của máy chủ

Ba lệnh dưới đây tự sinh một chuỗi ngẫu nhiên rồi đặt thẳng lên Cloudflare, bạn không phải nhìn hay chép gì. Hai khoá đầu cần ít nhất 32 ký tự; khoá thứ ba phải đúng 32 byte ngẫu nhiên mã hoá base64, nên lệnh khác nhau. Đừng dùng lại khoá của bản chính thức.

```bash
openssl rand -base64 48 | tr -d '\n' | npx wrangler secret put SESSION_SECRET --config wrangler.dev.jsonc
```

```bash
openssl rand -base64 48 | tr -d '\n' | npx wrangler secret put LAN_GUI_SECRET --config wrangler.dev.jsonc
```

```bash
openssl rand -base64 32 | tr -d '\n' | npx wrangler secret put MFA_ENCRYPTION_KEY --config wrangler.dev.jsonc
```

## Bước 5. Cấu hình gửi thư Góp ý

Ba lệnh này không tự sinh giá trị; wrangler sẽ hỏi, bạn gõ hoặc dán giá trị rồi Enter (đừng dán vào cuộc trò chuyện).

Địa chỉ người gửi: dùng địa chỉ gửi thư công ty đã xác minh trên Cloudflare, cùng địa chỉ bản chính thức đang dùng.

```bash
npx wrangler secret put FEEDBACK_MAIL_FROM --config wrangler.dev.jsonc
```

Địa chỉ nhận thư Góp ý: chỉ nhập **một** địa chỉ. Máy chỉ gửi một thư, và bộ lọc của bản Development bỏ cả thư nếu địa chỉ không nằm trong danh sách cho phép.

```bash
npx wrangler secret put FEEDBACK_NOTIFY_EMAIL --config wrangler.dev.jsonc
```

Danh sách địa chỉ được phép nhận thư từ bản Development, ngăn bằng dấu phẩy. Phải gồm địa chỉ vừa nhập ở lệnh trên (so khớp nguyên chuỗi, không phân biệt hoa thường). Danh sách trống hoặc thiếu thì không thư nào được gửi.

```bash
npx wrangler secret put THU_CHO_PHEP --config wrangler.dev.jsonc
```

## Những thứ để trống ở lượt đầu

Khoá Turnstile (chống máy tự đăng nhập) và khoá trợ lý AI cứ để trống: hai tính năng đó tự tắt, không gây lỗi. Muốn bật sau thì làm riêng.

## Xong thì gửi cho AI

Chỉ hai thứ: mã `database_id` ở Bước 1 và dòng `KHOA CONG KHAI` ở Bước 3. AI điền vào `wrangler.dev.jsonc` rồi hướng dẫn bước tiếp theo (`npm run lam-moi-dev`).

## Ba điều cần biết thêm

- Tài khoản thử nội bộ có ân hạn 14 ngày; sau đó phải dùng bảo mật lớp hai. Khi đó dùng ứng dụng tạo mã, hoặc đưa địa chỉ email vào `THU_CHO_PHEP`, hoặc chạy lại `npm run lam-moi-dev` để làm mới.
- Thông tin công khai của công ty (từ migration `0002` và `0030`) vẫn có sẵn trên bản thử; đó là chủ ý, không phải lộ dữ liệu.
- Lệnh `npm run len-chinh-thuc` gõ ở thư mục gốc `tourdao-sales`, và thư mục đó phải đang đứng ở `main`.

## Chưa kiểm

Chưa kiểm: `secret put` khi Worker `tourdao-sales-dev` chưa tồn tại có thể hỏi có tạo Worker mới không. Phải thử ở lần đầu; sau khi thử, trang này sẽ ghi rõ nên trả lời thế nào. Nếu máy hỏi trước khi có kết quả, hãy dừng và báo AI thay vì đoán. Mọi chỗ khác về hành vi wrangler cũng là chưa kiểm cho tới lần chạy thật đầu tiên.
