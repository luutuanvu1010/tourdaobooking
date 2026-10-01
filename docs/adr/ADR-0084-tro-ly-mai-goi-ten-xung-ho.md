# ADR-0084 — Trợ lý "Mai": gọi tên + xưng hô theo giới tính; trường giới tính ở hồ sơ người; bỏ hai dòng nhắc trong khung chat

- **Trạng thái:** **accepted** 2026-10-01 — chủ dự án chọn "Duyệt, làm luôn" trong hộp hỏi sau khi AI trình tóm tắt (ô Giới tính, xưng em – anh/chị + tên, gửi tên gọi sang OpenAI, lời chào có tên, bỏ hai dòng nhắc, dòng "Tên bạn là Mai" do app nối thêm). AI ghi lại. Bản nháp gốc ở `docs/superpowers/specs/2026-10-01-tro-ly-mai/`.
- **Ngày:** 2026-10-01. **Số:** 0084 (0083 đã dùng ở nhánh khác). **Migration:** `0064` (số TẠM — 0061, 0063 ở nhánh khác chưa gộp; người gộp đánh lại nếu cần).
- **Mốc mã:** `origin/main` = `d08aea0c` (production 1.56).
- **Nguồn (lời chủ, chuẩn — không hỏi lại):** phiên 2026-10-01, chủ: "lấy tên của người dùng để chào hỏi và xưng hô trong quá trình nói chuyện, dựa vào giới tính để xưng anh hoặc chị (trường giới tính chưa có thì tạo trong hồ sơ, mình sẽ bổ sung ngay)"; "Hai dòng … nên loại bỏ"; placeholder "Hãy hỏi Mai tại đây nhé!". Hộp hỏi gom, nguyên văn lựa chọn:
  - Hai dòng nhắc → **"Bỏ hẳn cả hai"** (AI đã báo trước dòng thứ nhất do ADR-0069 điều 5 bắt buộc — P18).
  - Gửi tên sang OpenAI → **"Gửi tên gọi (không họ)"** (AI khuyến nghị không gửi tên).
  - Xưng hô → **"Em – anh/chị + tên"**.
- **Sửa / bổ sung:**
  - ADR-0069 điều 5 — **bỏ** câu "Khung Hỗ trợ ghi rõ cho người dùng: 'Câu hỏi được lưu để cải thiện trợ lý — đừng gõ thông tin khách'". Lưu, che SĐT/email/số giấy tờ, chỉ Toàn quyền xem lịch sử: **giữ nguyên**. Lời nhắc này vẫn ở trang Trợ giúp.
  - Đặc tả ADR-0066 (dòng "Trả lời do AI, có thể sai — đối chiếu màn hình" dưới mỗi câu trả lời) — **bỏ** khỏi khung chat; giữ ở trang Trợ giúp.
  - ADR-0066 điều 3 / ADR-0082 hệ quả (b) ("gửi OpenAI chỉ nội dung hướng dẫn") — **bổ sung**: mỗi câu hỏi gửi thêm **tên gọi** (không họ, không tên đệm) và cách xưng của chính người hỏi.
- **Hiến chương Phần I áp:** không xoá cứng; danh sách giá trị mở kiểm ở mã, không `CHECK` liệt kê.
- **Xây trên lỗ đang hở:** không có.
- **Loại cửa:** một chiều cho cột mới (migration); hai chiều cho cách xưng hô (đổi lời trong mã).

## Tóm tắt cho chủ (lời thường)

1. Hồ sơ người có thêm ô **Giới tính** (Nam / Nữ / để trống). Ai sửa được hồ sơ người đó thì sửa được ô này.
2. Trợ lý tên **Mai**. Mai gọi người hỏi là **"anh/chị + tên"** và xưng **"em"**. Hồ sơ chưa có giới tính thì Mai gọi **"bạn"** và xưng **"mình"**.
3. Lời chào đầu khung chat có tên người dùng. Lời chào này dựng ngay trong app, không gọi OpenAI.
4. Mỗi câu hỏi gửi sang OpenAI thêm **tên gọi** (ví dụ "Vũ", không họ) và cách xưng.
5. Khung chat bỏ hai dòng nhắc. Hai ý này vẫn nằm trong trang Trợ giúp.

## Quyết định

**Đ1 — Dữ liệu:** cột mới `pty_person.gender TEXT NULL` (module `parties` sở hữu).
- Giá trị `'NAM'` | `'NU'` | NULL (= chưa ghi), kiểm ở mã, không `CHECK` liệt kê.
- Áp cho mọi hồ sơ người: nhân viên, khách, tài xế.
- Sửa cùng đường sửa tên người hiện có, cùng ô quyền. Không thêm ô quyền mới.
- Nhật ký ghi "đổi giới tính", không ghi giá trị cũ/mới — cùng lối với dữ liệu cá nhân.
- `data-dictionary.json` + `npm run dict`.

**Đ2 — Xưng hô (luật thuần, một nơi):** hàm thuần nhận (tên gọi, giới tính), trả cách gọi + cách xưng:
- `NAM` → gọi "anh {tên}", xưng "em";
- `NU` → gọi "chị {tên}", xưng "em";
- NULL hoặc thiếu tên → gọi "bạn", xưng "mình".

Tên gọi = `pty_person.given_name`, cắt khoảng trắng.

**Đ3 — Lời nhắc:**
- Máy chủ **nối thêm** sau lời nhắc do Toàn quyền soạn (ADR-0073 cho sửa toàn bộ) một dòng do mã dựng: "Tên bạn là Mai, trợ lý của Tour Đảo. Người đang hỏi: gọi là '{cách gọi}', xưng '{cách xưng}'."
- Dòng này luôn có kể cả khi lời nhắc đã tuỳ biến, và không sửa được trên Bảng điều khiển.
- Ô thử dùng tên/giới tính của **người đang thử** (Toàn quyền).
- Lời nhắc mặc định và câu chào mặc định đổi theo vai "Mai". Bản Toàn quyền đã lưu không tự đổi; Toàn quyền tự sửa hoặc "Khôi phục mặc định".

**Đ4 — Dữ liệu ra ngoài:** mỗi câu hỏi gửi OpenAI thêm tên gọi (không họ, không tên đệm) và cách xưng của chính người hỏi.
- Không gửi SĐT, email, mã tài khoản.
- Không gửi `user` / định danh trong thân yêu cầu — giữ G2 của ADR-0082.
- Log chỉ tên sự kiện như cũ.

**Đ5 — Lời chào:**
- Khung chat dựng lời chào ở trình duyệt từ câu chào cấu hình.
- Câu chào cấu hình nhận chỗ thay `{ten}` (thay bằng cách gọi, ví dụ "anh Vũ" / "bạn"). Câu chào không có `{ten}` thì hiện nguyên văn.
- Câu chào mặc định mới: "Chào {ten}, em là Mai — trợ lý của Tour Đảo. {ten} cần hỏi gì về cách dùng app cứ hỏi em nhé!".
- API trả cách gọi/cách xưng của người đăng nhập cho khung chat, đã tính sẵn ở máy chủ.

**Đ6 — Khung chat:** bỏ hai dòng nhắc (xem "Sửa / bổ sung").

## Hệ quả

- **Được:** trò chuyện thân thiện, đúng cách xưng hô kiểu Việt.
- **Mất / rủi ro:** (a) tên gọi nhân viên ra khỏi app (sang OpenAI) mỗi câu hỏi; (b) hồ sơ chưa ghi giới tính thì Mai gọi "bạn" tới khi bổ sung; (c) người dùng mất lời nhắc thường trực "đừng gõ thông tin khách" — SĐT/email vẫn được che tự động trước khi lưu và gửi.
- **Lệch có tên:** không.

## Trang ghép (CLAUDE.md §9)

| Bảng / chỗ | Chứa loại nào | Dòng bản đồ quyền chạm | Cổng canh |
|---|---|---|---|
| `pty_person.gender` (mới) | mọi hồ sơ NGƯỜI: nhân viên, khách, tài xế công ty / đối tác, người liên hệ | ghi: như các cột tên người — `party.write` (hồ sơ không gắn tài khoản), `party.staff.write` + `manageable` (hồ sơ gắn tài khoản), `company.legal.write` (công ty chủ — không áp, chỉ tổ chức); đọc: `party.view` | route `PUT /api/parties/:id` (cổng `office` + `can` sẵn có); không thêm ô quyền, không thêm route ghi |
| Lời nhắc gửi OpenAI (route `/api/tro-ly/hoi`, `/api/tro-ly/thu`) | tên gọi + cách xưng của CHÍNH người hỏi (thử: chính Toàn quyền) | `assistant.ask` (hỏi), `settings.ops` (ô thử) — không đổi | máy chủ tự đọc hồ sơ người hỏi theo phiên; thân yêu cầu từ trình duyệt KHÔNG mang tên / giới tính (không tin trình duyệt) |
| API cách gọi cho khung chat | cách gọi + cách xưng đã tính của người đăng nhập (không trả giới tính thô) | `assistant.ask` | cổng `staff` + `can` như route khung chat |
| Giao diện ẩn / hiện | ô Giới tính trong form sửa hồ sơ người: hiện theo đúng điều kiện các ô tên đang hiện; khung chat: bỏ hai dòng nhắc, không ẩn/hiện mới theo quyền | — | máy chủ vẫn kiểm lại |

## Phương án đã cân nhắc

1. **Không gửi tên** (máy chủ điền tên vào chỗ trống sau khi OpenAI trả lời) — AI khuyến nghị; chủ chọn gửi tên gọi.
2. **Đoán giới tính theo tên** — dễ sai, xúc phạm. **Loại**.
3. **Giữ dòng nhắc "Câu hỏi được lưu…"** (đúng ADR-0069) — chủ chọn bỏ.
