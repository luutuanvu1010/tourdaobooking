# Hướng dẫn bật "Thông báo trên điện thoại" (rung màn hình khoá)

Tài liệu này viết cho **chủ dự án**, không cần biết lập trình. Làm đúng theo số thứ tự; mỗi lệnh chép nguyên vào Terminal rồi Enter.

## Tính năng này làm gì

Khi nhân viên hoặc đối tác bật nút "Bật thông báo trên điện thoại" ở trang **Tôi**, điện thoại của họ sẽ **rung và hiện thông báo ngay cả khi màn hình đang khoá** mỗi khi có tin liên quan tới họ (ai đó nhận đơn, giao đơn, xác nhận, huỷ đơn…, hoặc bạn gửi một thông báo chung). Ai cũng bật được, kể cả tài khoản Đối tác.

Muốn bật được, ứng dụng cần một "cặp chìa khoá" để ký thông báo cho an toàn. Bạn tạo cặp chìa khoá này **một lần** bằng một lệnh ở dưới; nửa "chìa công khai" sẽ được thêm vào mã, nửa "chìa bí mật" không bao giờ hiện ra màn hình, đi thẳng vào kho bí mật của Cloudflare.

**Việc phải làm theo đúng thứ tự — đừng đảo hay gộp bước.**

---

## Bước 1 — Đưa mã lên trước (chưa có chìa khoá, mục thông báo còn ẩn)

Mở ứng dụng Terminal trên máy Mac, đứng ở thư mục `tourdao-sales` (thư mục gốc, không phải thư mục `worktree`):

```
npm run day-len -- worktree-thong-bao-he-thong
```

Đợi lệnh chạy xong (nó tự gộp và đẩy mã lên), rồi chạy tiếp:

```
npm run trien-khai
```

Lệnh này đưa mã mới lên production. Sau bước này, mở trang Tôi trên điện thoại sẽ **CHƯA thấy mục "Thông báo trên điện thoại"** — đúng như dự kiến, vì chưa có chìa khoá. Không có gì hỏng.

## Bước 2 — Đợi vài ngày để mọi người mở app một lần

App tự cập nhật bản mới mỗi khi ai đó mở lên. Đợi khoảng vài ngày (hoặc tới khi bạn thấy phần lớn nhân viên đã dùng app) rồi mới sang Bước 3. Việc này giống hệt lần trước khi bật khoá chống spam ở màn đăng nhập.

## Bước 3 — Tạo chìa khoá (chạy ĐÚNG MỘT LẦN)

Vẫn đứng ở thư mục `tourdao-sales`, chạy lệnh sau:

```
node -e 'const s=crypto.subtle;s.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]).then(async k=>{const j=await s.exportKey("jwk",k.privateKey);console.error("KHOA CONG KHAI:",Buffer.from(await s.exportKey("raw",k.publicKey)).toString("base64url"));process.stdout.write(JSON.stringify({kty:j.kty,crv:j.crv,x:j.x,y:j.y,d:j.d}))})' | npx wrangler secret put VAPID_PRIVATE_KEY
```

Lệnh này làm hai việc cùng lúc:
- In ra màn hình một dòng bắt đầu bằng `KHOA CONG KHAI: ` — đây KHÔNG phải bí mật, cứ để lộ ra bình thường.
- Đặt luôn "nửa bí mật" của chìa khoá vào Cloudflare — dòng này KHÔNG bao giờ hiện trên màn hình, kể cả cho bạn.

**Quan trọng nhất: chỉ chạy lệnh này ĐÚNG MỘT LẦN, rồi dùng đúng dòng "KHOA CONG KHAI" của LẦN CHẠY ĐÓ ở Bước 4.** Mỗi lần chạy lệnh này sinh một cặp chìa khoá HOÀN TOÀN MỚI (kể cả "chỉ để xem lại"), và Cloudflare luôn nhớ NỬA BÍ MẬT của lần chạy GẦN NHẤT — nếu bạn chạy lại lần hai rồi lại đưa dòng "KHOA CONG KHAI" của lần MỘT cho Bước 4, hai nửa sẽ không khớp. Nếu lỡ chạy hai lần: chỉ dùng dòng "KHOA CONG KHAI" của LẦN CUỐI CÙNG bạn chạy cho Bước 4 (nửa bí mật của lần cuối là nửa đang nằm trên Cloudflare) — không cần chạy lại thêm lần nữa.

Chép NGUYÊN dòng "KHOA CONG KHAI: …" (cả chuỗi dài phía sau) và gửi cho AI (dán vào phiên Claude Code) để làm Bước 4.

## Bước 4 — Đưa chìa khoá công khai vào mã rồi đưa lên lần nữa

Việc này AI làm giúp bạn: thêm dòng chìa khoá công khai bạn vừa đưa vào tệp cấu hình, rồi báo bạn chạy lại đúng hai lệnh của Bước 1 (`npm run day-len -- <tên nhánh AI báo>` rồi `npm run trien-khai`). Lần này **không có** bước hỏi áp migration (đã áp từ Bước 1).

Sau khi lệnh `npm run trien-khai` chạy xong, ứng dụng **tự kiểm hai nửa chìa khoá có khớp nhau không**. Mở trang Tôi bằng bất kỳ tài khoản nào:

- **Thấy mục "Thông báo trên điện thoại"** → hai nửa chìa khoá khớp nhau, xong Bước 4. Sang Bước 5 để thử gửi thật.
- **KHÔNG thấy mục đó** dù bạn chắc chắn đã làm đủ Bước 3 và Bước 4 → hai nửa chìa khoá LỆCH CẶP (thường do Bước 3 đã lỡ chạy hơn một lần và Bước 4 dùng nhầm dòng "KHOA CONG KHAI" của lần khác). Cách sửa: làm lại Bước 3 (tạo cặp chìa khoá MỚI, chạy đúng một lần) rồi Bước 4 với dòng "KHOA CONG KHAI" vừa in ra.

## Bước 5 — Thử gửi thật

Mục đã hiện ra (Bước 4 xong) không có nghĩa là thông báo chắc chắn tới được điện thoại — còn phụ thuộc quyền hệ điều hành, mạng, app đã cài đúng cách chưa. Thử một lượt:

1. Trên một điện thoại đã cài app ra màn hình chính, mở trang Tôi → bấm "Bật thông báo trên điện thoại" → cho phép → thấy chữ "Đang bật trên máy này".
2. Khoá màn hình điện thoại đó.
3. Nhờ ai đó (hoặc chính bạn ở máy khác) gửi một thông báo cho nhóm của tài khoản vừa bật.
4. Đợi tối đa 1 phút. Ghi lại CHÍNH XÁC điều xảy ra: (a) rung và hiện ĐÚNG câu của thông báo bạn vừa gửi — tốt nhất; (b) rung nhưng chỉ hiện câu chung "Bạn có thông báo mới" — vẫn hoạt động nhưng máy chưa hỏi được nội dung thật lúc đó (mạng chập chờn hoặc phiên hết hạn, không phải lỗi chìa khoá vì mục đã hiện ra ở Bước 4); (c) không rung gì cả — báo lại để tìm nguyên nhân khác (quyền thông báo bị hệ điều hành chặn, mạng...).

## Tắt tạm — hai cách, tuỳ có sự cố hay không (sửa 2026-09-28)

**Chìa khoá bí mật (nửa `VAPID_PRIVATE_KEY`) không bao giờ xem lại được, kể cả bởi bạn hay AI** — Cloudflare không cho đọc lại bí mật đã đặt. Vì vậy có hai cách tắt, tuỳ tình huống:

### Cách A — chỉ muốn tạm dừng, KHÔNG nghi lộ chìa khoá (giữ được cặp cũ, không ai phải bật lại)

Báo AI: "tạm dừng thông báo, không nghi lộ chìa khoá". AI sẽ tạm bỏ dòng chìa khoá công khai khỏi tệp cấu hình rồi báo bạn chạy lại đúng hai lệnh của Bước 1 (`npm run day-len -- <tên nhánh>` rồi `npm run trien-khai`) — **chậm hơn cách B vài phút** vì phải đưa mã lên, nhưng KHÔNG đụng tới nửa bí mật trên Cloudflare nên cặp chìa khoá cũ còn nguyên. Muốn bật lại: báo AI thêm đúng dòng chìa khoá công khai đó trở lại rồi chạy lại hai lệnh trên — xong ngay, không ai phải bấm "Bật" lại (máy vẫn đang bật vẫn bật, không mất gì).

### Cách B — có sự cố thật (nghi chìa khoá bị lộ, hoặc cần tắt NGAY LẬP TỨC không chờ đưa mã lên)

Đứng ở thư mục `tourdao-sales`, chạy:

```
npx wrangler secret delete VAPID_PRIVATE_KEY
```

**Lệnh này sẽ hỏi lại một câu (kiểu "…are you sure… (y/N)")** — gõ `y` rồi Enter mới thật sự xoá; Enter suông hoặc gõ điều gì khác sẽ HUỶ lệnh (chưa xoá gì).

Ngay sau khi xoá thật: mọi thông báo ngừng gửi (không ai rung, không có lỗi hiện ra), mục "Thông báo trên điện thoại" biến mất khỏi trang Tôi ở lần mở app kế tiếp. Dữ liệu ai đã bật được GIỮ NGUYÊN (không xoá), nhưng **nửa bí mật đã mất vĩnh viễn — không có cách nào lấy lại đúng cặp chìa khoá cũ**. Muốn bật lại tính năng, PHẢI làm lại Bước 3 (chìa khoá MỚI hoàn toàn) và Bước 4, rồi **mọi người đã từng bật đều phải tự mở app và bấm "Bật thông báo trên điện thoại" lại một lần** (máy chủ từ chối chìa khoá cũ). Bước bấm lại này nay LÀM ĐƯỢC ỔN ĐỊNH (từ bản sửa 2026-09-28): trước đây nếu máy còn nhớ chìa khoá cũ, bấm "Bật" có thể báo lỗi mãi không tự hết; nay ứng dụng tự dọn chìa khoá cũ trước khi đăng ký chìa khoá mới.

**Chỉ dùng Cách B khi thật sự có lý do** (nghi bị lộ, hoặc cần tắt ngay không chờ được): nó buộc TẤT CẢ mọi người bấm lại. Việc thường ngày (bảo trì định kỳ, tạm dừng vài giờ…) dùng Cách A.

---

## Kịch bản thử tay đầy đủ (làm SAU khi Bước 5 đã thử gửi thật một lần)

Ghi lại kết quả từng bước (đạt / không đạt / chưa thử được) vào mục nhật ký phát hành — đừng ghi "đạt" cho bước chưa thực sự thử. Việc kiểm mã có lộ chìa khoá bí mật ra tệp nào không là việc AI tự làm (không cần bạn làm) — đã kiểm và không thấy lộ.

1. **Tài khoản nhân viên (A):** cài app ra màn hình chính (nếu chưa) → mở app → vào trang Tôi → bấm "Bật thông báo trên điện thoại" → cho phép → thấy chữ "Đang bật trên máy này".
2. Khoá màn hình điện thoại của A. Bạn (Toàn quyền) gửi một thông báo THƯỜNG (không phải khẩn cấp) cho đúng nhóm của A, vào ban ngày → chờ tối đa 1 phút, ghi lại CHÍNH XÁC câu hiện trên màn hình khoá: **đúng câu của thông báo bạn vừa gửi** (đạt) hay **chỉ câu chung "Bạn có thông báo mới"** (máy chưa hỏi được nội dung thật lúc đó — ghi rõ, đây là điều ADR-0036 còn để ngỏ với iPhone thật, không phải chắc chắn lỗi).
3. Một người khác lập một đơn và giao cho A phụ trách → máy A rung với câu kiểu "… vừa lập đơn mới …". Thử với tài khoản Kế toán (nếu Kế toán chỉ xem ngăn "Tất cả") → máy Kế toán **KHÔNG** rung.
4. Bấm vào thông báo vừa hiện trên máy A → app phải tự mở đúng trang của đơn đó.
5. A tự đổi mã PIN của mình → gửi lại một thông báo thử → máy A **KHÔNG** rung nữa (phải bấm bật lại mới nhận tiếp).
6. Bật lại thông báo cho A. Đăng xuất tài khoản A ở MỘT máy khác (không phải điện thoại của A) → máy điện thoại của A không còn rung nữa, hoặc nếu có rung thì chỉ hiện câu chung "Bạn có thông báo mới" (không lộ nội dung thật).
7. Lặp lại bước 1–2 với một tài khoản **chỉ có quyền Đối tác** (không phải nhân viên nội bộ) — phải bật và nhận được y như nhân viên.
8. Gửi hai thông báo liên tiếp cho cùng một người, không mở thông báo đầu tiên ra — cả hai lần đều phải rung (không bị lần sau "đè" mất lần trước lặng lẽ).
9. Sau 22 giờ đêm (giờ Việt Nam): gửi một thông báo thường → **không** rung; gửi một thông báo đánh dấu "quan trọng" → **vẫn** rung.
10. **Nhóm lớn (hơn 40 máy đang bật cùng lúc, vd gửi cho "Toàn công ty" khi phần lớn nhân viên + đối tác đã bật):** máy cuối cùng nhận được có thể chậm hơn máy đầu tiên vài chục giây tới khoảng một phút (chia lô 40 máy một lượt) — vẫn coi là đạt nếu MỌI máy đều rung, chỉ khác nhau thời điểm. **Nếu công ty chưa có đủ 40 người bật thông báo cùng lúc để thử, cứ ghi "chưa kiểm được (chưa đủ máy)"** — đừng ghi "đạt" khi chưa thật sự có đủ máy để thấy chia lô.
