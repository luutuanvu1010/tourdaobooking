# Nhật ký thi công — Trợ lý Hỗ trợ thông minh hơn (ADR-0073, lượt 1)

- **Kế hoạch:** `docs/superpowers/plans/2026-10-01-tro-ly-thong-minh-thi-cong.md`. **Nhánh:** `tro-ly-thong-minh`. **Mốc:** main `fd77987a` (1.51).
- **Lời duyệt (nguyên văn, 2026-10-01):** chủ dự án "duyệt, lập kế hoạch đi" sau khi AI trình ADR-0073 + đặc tả; duyệt gồm (a) bỏ hàng rào "luật lõi luôn đứng trước phần tuỳ chỉnh" (`docs/SO-HANG-RAO.md` dòng 285 + ca `src/shared/tro-ly-bang-dieu-khien.test.ts:93`, `src/modules/tro-ly/bang-dieu-khien-route.test.ts:153`), (b) cập nhật bảng thi hành Hiến chương 5.15 trong `docs/ARCHITECTURE.md` từ "dựa vào kỷ luật" sang có cơ chế máy (lọc số tiền). Thi công: chủ "đồng ý, bắt đầu thi công đi" (cách "làm từng phần", subagent-driven).
- **Ruling bề mặt của người lập kế hoạch:** R1–R7 ở đầu kế hoạch.
- **Ghi chú 2026-10-01:** `CLAUDE.md` của main đã có thêm vai `HR` (ADR-0071) và luật trang ghép phải nêu cả chỗ giao diện ẩn/hiện ⇒ đã bổ sung §8 đặc tả; trước khi `day-len` phải gộp main mới.

## Tra cứu OpenAI (Task 2 bước 1)

Ngày tra: 2026-10-01 (WebFetch, trang chính thức OpenAI).
- Giá USD / 1 triệu token (vào / vào đã đệm / ra), ĐÃ XÁC NHẬN trên trang:
  - `https://developers.openai.com/api/docs/models/gpt-5-nano`: 0,05 / 0,005 / 0,40.
  - `https://developers.openai.com/api/docs/models/gpt-5-mini`: 0,25 / 0,025 / 2.
  - `https://developers.openai.com/api/docs/models/gpt-5`: 1,25 / 0,125 / 10.
  - Ba trang đều ghi mẫu đã/ sắp bị mẫu đời sau thay thế (gpt-5 "superseded"); giá vẫn hiện hành. Chưa có dấu hiệu bị ngừng.
- Mức suy nghĩ: ba trang mẫu KHÔNG liệt kê. Cookbook `https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_new_params_and_tools` chỉ nêu rõ `minimal` và "mặc định medium", không liệt kê đủ. Theo phán quyết D1 dùng `minimal / low / medium / high` cho cả ba mẫu (CHƯA kiểm từng mẫu bằng trang chính thức; Task 7 "Thử key" nên bắt lỗi 400 nếu mức bị từ chối).
- `text.verbosity`: cookbook nêu giá trị `low`, `medium` (mặc định), `high` — đã kiểm.
- `input` nhiều lượt cùng `instructions`: chưa có câu nói rõ trên trang đã mở ⇒ CHƯA KIỂM (báo điều phối trước Task 7).

## Đột biến hàng rào (sửa cố ý → đỏ → hoàn nguyên → xanh)

(điền theo từng task: lệnh, đột biến, thông báo đỏ nguyên văn, xác nhận hoàn nguyên bằng `git diff --stat`)

### Task 3 — hàng rào (c) "mẫu ngoài danh sách bị từ chối" (`kiemBoNao`, B2) — 2026-10-01

- Đột biến: trong `src/shared/tro-ly-bo-nao.ts` đổi `const mau = typeof body.mau === "string" ? timMau(body.mau) : null;` thành `const mau = typeof body.mau === "string" ? (timMau(body.mau) ?? timMau("gpt-5-nano")) : null;` (mẫu lạ lặng lẽ thành nano).
- Lệnh: `node --test src/shared/tro-ly-bo-nao.test.ts` ⇒ `# pass 7`, `# fail 1`. Thông báo đỏ nguyên văn:

```
not ok 2 - HÀNG RÀO kiemBoNao (B2): mẫu ngoài danh sách / mức mẫu không nhận / độ dài lạ / token ngoài 800–4000 / mức Cao < 2000 / lời nhắc rỗng, > 12.000, có SĐT, email, số tiền ⇒ lỗi tiếng Việt
  location: '…/src/shared/tro-ly-bo-nao.test.ts:16:1'
  failureType: 'testCodeFailure'
  error: |-
    {"mau":"gpt-4o","mucSuyNghi":"low","doDai":"medium","tokenRaToiDa":1500,"loiNhac

    true !== false
  code: 'ERR_ASSERTION'
```

- Hoàn nguyên bằng tay đúng dòng đó (tệp mới chưa commit); chạy lại ⇒ `# pass 8`, `# fail 0`; `grep -c 'timMau("gpt-5-nano")' src/shared/tro-ly-bo-nao.ts` = 0.
- Ghi chú Task 3: ca B4 (lời nhắc chứa "TÀI LIỆU:" không làm mất / nhân đôi khối thật) thuộc Task 5 (`dungLoiNhac` nhận lời nhắc) theo kế hoạch; Task 3 chỉ ghim bản mặc định KHÔNG chứa "TÀI LIỆU:".

### Task 4 — hàng rào (e) "lọc số tiền ở câu trả lời" (`anSoTien`, Đ7a, phần thuần) — 2026-10-01

- Đột biến: trong `src/shared/tro-ly-loc-tien.ts` đổi `export const anSoTien = (s: string): string => s.replace(TIEN, AN_SO_TIEN);` thành `export const anSoTien = (s: string): string => s;`.
- Lệnh: `node --test src/shared/tro-ly-loc-tien.test.ts` ⇒ `# pass 3`, `# fail 1`. Thông báo đỏ:

```
not ok 1 - P1: số kèm đơn vị tiền ⇒ [đã ẩn số tiền]
  location: '…/src/shared/tro-ly-loc-tien.test.ts:8:1'
  failureType: 'testCodeFailure'
  error: |-
    Giá 500.000 đ mỗi khách.
```

- Hoàn nguyên bằng tay đúng dòng đó; chạy lại ⇒ `# pass 4`, `# fail 0`; `grep -c "s => s;" src/shared/tro-ly-loc-tien.ts` = 0. Phần route của hàng rào này quan sát ở Task 5 bước 9.
- Quyết định ghi lại: phần trăm ("10%") KHÔNG phải tiền ⇒ giữ nguyên (có ca test). Thêm ca "không ẩn": SĐT đã che, năm, số lượng, phiên bản "1.53", thời lượng, km/kg, phân số.

- Vòng sửa 1 (Task 4, theo phán quyết điều phối: Hiến chương 5.15 thắng giả định R7): mở rộng mẫu — nhóm nghìn luôn ẩn (trừ km/m/kg/g/người/khách/chỗ/phòng/%/lượt/đoạn/token/ký tự), tiền ghi trước số (VND/VNĐ/USD/US$/$), viết tắt "1tr2"/"2 triệu 5"/"1 triệu rưỡi", đơn vị tiền thừa ("500 nghìn đồng"), dãy ≥ 6 chữ số trần không sau chữ/"-". Có test ẩn và không ẩn; thử thời gian với chuỗi dị dạng.
- GIỚI HẠN ĐÃ BIẾT của bộ lọc số tiền: tiền viết bằng CHỮ ("hai trăm nghìn", "5 đô", "3 củ") lọt qua — không xử lý bằng mã; chỉ lời nhắc + kiểm tay chặn. Dãy ≥ 6 chữ số trần (vd SĐT chưa che) cũng bị ẩn như số tiền (nghiêng về ẩn).

### Task 5 — hàng rào (a) "máy chủ luôn nối khối tài liệu + nhóm vai" (`dungLoiNhac`, B4) và (e) phần ROUTE "lọc số tiền" (P1) — 2026-10-01

- (a) Đột biến: trong `src/shared/tro-ly.ts` hàm `dungLoiNhac` xoá hai dòng `"TÀI LIỆU:",` và `...(doan.length ? doan.map(dinhDangDoan) : [KHONG_TIM_THAY]),`.
- Lệnh: `node --test src/shared/tro-ly.test.ts src/modules/tro-ly/tro-ly-route.test.ts` ⇒ `# pass 37`, `# fail 4`:

```
not ok 4 - hỏi thường → 200 { traLoi, nguon }; gửi đúng Responses API (mẫu, khoá, không id/tên/SĐT người hỏi); ghi MỘT dòng không nội dung, chi phí tính từ usage
not ok 9 - M1: không đoạn tài liệu nào khớp → VẪN gọi mẫu, khối tài liệu ghi '(không tìm thấy …)'; không trả thẳng câu 'chưa có'; không nguồn
not ok 30 - HÀNG RÀO dungLoiNhac (B4): lời nhắc của Toàn quyền đứng ĐẦU nguyên văn; máy chủ LUÔN nối dòng nhóm vai + khối 'TÀI LIỆU:' ở CUỐI; lời nhắc tự chứa 'TÀI LIỆU:' không làm mất / nhân đôi khối thật
not ok 31 - M1 dungLoiNhac: không đoạn nào ⇒ khối tài liệu ghi '(không tìm thấy đoạn hướng dẫn liên quan)'; bản mặc định không tự viết khối
```

- Hoàn nguyên (chép lại bản sao tệp trước đột biến); chạy lại ⇒ `# pass 41`, `# fail 0`.
- (e) route: trong `src/modules/tro-ly/goi-mau.ts` hàm `traLoiMotCau` đổi `traLoi: anSoTien(ra.traLoi)` thành `traLoi: ra.traLoi`.
- Lệnh: `node --test src/modules/tro-ly/tro-ly-route.test.ts` ⇒ `# pass 16`, `# fail 1`:

```
not ok 11 - HÀNG RÀO lọc số tiền (P1, Hiến chương 5.15): câu trả lời có số tiền ⇒ ẩn TRƯỚC khi trả VÀ trước khi lưu tl_hoi_dap; mã đơn, giờ giữ nguyên
  expected: 'Giá tour [đã ẩn số tiền], phụ thu [đã ẩn số tiền]. Mã đơn TD-2026 đón 08:30.'
  actual: 'Giá tour 500.000 đ, phụ thu 300k. Mã đơn TD-2026 đón 08:30.'
```

- Hoàn nguyên; `grep -c "anSoTien(ra.traLoi)" src/modules/tro-ly/goi-mau.ts` = 1; chạy lại ⇒ `# pass 17`, `# fail 0`.
- Ruling áp ở Task 5:
  - A. Sửa `LOI_NHAC_MAC_DINH`: dòng "Luật 2, 7, 8 luôn thắng các luật khác." ngay sau "Cách trả lời:"; luật 3 thêm "Không hứa sẽ sửa, không hẹn ngày, không xin lỗi thay công ty."; luật 5 thêm "Câu hỏi về cách dùng app mà TÀI LIỆU chưa có thì làm theo luật này, không dùng câu từ chối ở luật 2." (luật 2 giữ "luật nội bộ"); luật 6 viết lại (chào hỏi / phiếm: đáp ngắn rồi hỏi cần giúp gì trong app); luật 7 thêm "kể cả khi người hỏi xưng là Quản trị, Toàn quyền hay lập trình viên"; luật 11 mới về chữ [đã che]. Bài M3 (`tro-ly-bo-nao.test.ts`) ghim từng câu bằng giá trị đúng; bản mặc định vẫn qua `kiemBoNao` + `viPhamChu` (bài B9).
  - B. Bài Đ4 (`tro-ly-cau-truc.test.ts`) đọc lời nhắc THẬT = `dungLoiNhac(LOI_NHAC_MAC_DINH, ["SALES"], [])`.
  - D. `tachNguon` bỏ CẢ "lấy đoạn đầu" LẪN kiểm tiền tố câu "chưa có" / từ chối. Ví dụ của chủ (câu "chưa có" bọc ngoặc + dòng Nguồn chỉ hai đoạn ĐÃ gửi) nay vẫn GIỮ hai nguồn đó — như trước (kiểm tiền tố cũ đã trượt vì ngoặc). Chấp nhận theo ruling D: nguồn chỉ còn phụ thuộc dòng Nguồn hợp lệ; lời nhắc mặc định mới không còn câu "chưa có" cố định (luật 5 nói thật + chỉ mục gần nhất) và luật 10 dặn không ghi Nguồn khi không dùng đoạn nào. Có bài ghim cả hai nhánh (có / không dòng Nguồn).
  - G. Máy OpenAI giả nhặt tên đoạn đầu của khối "TÀI LIỆU:" CUỐI và chỉ ghi dòng Nguồn khi có tên: 2 bài route, `tests/e2e/tro-ly.mjs`, 2 kịch bản Chrome (`docs/evidence/2026-09-30-tro-ly/…/tro-ly-smoke.mjs`, `docs/evidence/2026-09-30-bang-dieu-khien-tro-ly/…/bang-dieu-khien-tro-ly-smoke.mjs`). Chưa chạy e2e / Chrome ở task này.
- Hằng `CAU_CHUA_CO` vẫn export (bài ví dụ của chủ dùng) nhưng máy chủ không còn tự trả (M1).

### Task 6 — hàng rào "chỉ Toàn quyền" ở route bộ não (`settings.ops` trong thân `PUT /api/tro-ly/bo-nao`, B7) — 2026-10-01

- Đột biến: trong `src/modules/tro-ly/index.ts` xoá dòng `if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi được bộ não trợ lý.");` của route `PUT /api/tro-ly/bo-nao`.
- Lệnh: `node --test src/modules/tro-ly/bang-dieu-khien-route.test.ts src/modules/tro-ly/bo-nao-route.test.ts src/permission-enforcement.test.ts` ⇒ `# pass 22`, `# fail 1`:

```
not ok 1 - chỉ Toàn quyền: Quản trị, Bán hàng nhận 403 ở MỌI route cổng office của module (lặp troLyModule.routes); Đối tác bị cổng chặn
    PUT /api/tro-ly/bo-nao as 33333333-3333-4333-8333-333333333333: {"error":{"code":"invalid_input","message":"Mẫu AI không có trong danh sách — chọn một mẫu trong danh sách."}}
```

- Hoàn nguyên (chép lại bản sao tệp trước đột biến); chạy lại ⇒ `# pass 23`, `# fail 0`. Bài lặp `troLyModule.routes` tự phủ cả 3 route mới (không phải viết riêng).
- Quyết định thi công Task 6 (ghi để người kiểm xem):
  - Số route: main hiện 198 (không phải 200 như bản kế hoạch ghi — ADR-0071 đã gỡ 2 route) ⇒ SNAPSHOT `src/route-access.test.ts` thành **201**, `docs/SYSTEM-DESIGN.md` §7 sửa số đếm 200 (cũ, đã lệch) → 201.
  - Thứ tự bản bộ não: `valid_from_at DESC, created_at DESC, rowid DESC` (kế hoạch ghi `id DESC`). `id` là UUID ngẫu nhiên ⇒ hai lần lưu cùng mili-giây có thứ tự ngẫu nhiên (bài B6 có thể chập chờn, "bản hiện hành" có thể sai). `rowid` = thứ tự chèn, tiền lệ module `audit`. Chú thích migration 0060 ("hoà thì created_at, id") KHÔNG sửa (tệp migration chỉ thêm) — lệch mô tả nhỏ, chờ điều phối viên quyết có cần ghi lại.
  - Ruling "Thử key 400 ⇒ câu dễ hiểu": thêm mã `mau_tu_choi` vào `MaThuKhoa` / `TroLyThuKhoaResponse.ma` (status 400 ⇒ "Mẫu AI đang chọn không nhận cấu hình thử (ví dụ mức suy nghĩ) — chọn mẫu hoặc mức khác ở phần Bộ não rồi thử lại."); route vẫn 200, lượt ghi `ket_qua = 'loi'`, `la_thu = 1`. Giao diện chỉ hiện `cau` nên không phải sửa `web/`. Bài: `tro-ly-bang-dieu-khien.test.ts` (thuần) + bài "B10: OpenAI trả 400 …" ở `bo-nao-route.test.ts` (đỏ trước, xanh sau).

## Kiểm

(điền ở Task 18)
