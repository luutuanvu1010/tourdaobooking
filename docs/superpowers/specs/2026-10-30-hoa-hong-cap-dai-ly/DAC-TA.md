# Đặc tả — trang «Hoa hồng đối tác» xếp theo cấp đại lý (thiết kế lại từ bản vẽ 29/10)

> **bản 1 — 2026-10-30 — NHÁP, chờ QA1 và chủ duyệt.** Chưa thi công, chưa lập kế hoạch. Hồ sơ có ngày. Đối chiếu từng phần tử bản vẽ: `DOI-CHIEU-MOCKUP.md` (cùng thư mục, mã T1–T36).

## 0. Mục tiêu và phạm vi

Lời chủ (nguyên văn): «thể hiện rõ từng cấp độ đại lý, từng chính sách giá rõ ràng, có thể điều chỉnh: vô hiệu hóa, sửa mức, ngày tháng hiệu lực, … chuyển cấp độ đại lý cho từng đối tác».

**Trong phạm vi (chỉ giao diện):** dựng lại `web/hoa-hong*.ts` + trang HTML của Hoa hồng theo bản vẽ, ba thẻ «Các cấp · Loại đối tác · Riêng từng đối tác» (tên cuối cùng theo Câu 3); thêm lối vào «chuyển cấp cho một đối tác» ngay trên trang (hôm nay chỉ ở Danh bạ); sửa các chỗ bản vẽ nói sai luật tiền (T5, T8, T12, T14).
**Ngoài phạm vi:** đổi API, CSDL, quyền, cách tính tiền; ADR-0148 lượt 2 (cách tính «Giá đại lý»); BL-UX-HOA-HONG-DT (đối tác xem tổng tháng); lịch sử đầy đủ «ai sửa gì»; số đơn đang bị giữ; trang khác ngoài Hoa hồng (trừ chữ, nếu Câu 3 chọn đổi tên).
**Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` 30/10 không có mục chạm phần giá / hoa hồng).

## 1. Quyết định người soạn tự chọn (đảo ngược được, không hỏi lại)

| # | Quyết định | Lý do / nguồn |
|---|---|---|
| Q-1 | Mọi con số và câu «mức nào áp» lấy từ DTO máy chủ / `src/shared/hoa-hong-hien-thi.ts`; không hàm nào ở `web/` chọn mức | ADR-0077 điều 6; đặc tả 25/10 |
| Q-2 | Câu thứ tự áp mức viết lại đúng thứ tự **xét** của `chonMuc` — bậc 1–3 (mức riêng đối tác) → 10–12 (cấp riêng đối tác) → 4–6 (mức riêng loại) → 7–9 (cấp của loại); mỗi lớp: một dịch vụ → nhóm → mọi dịch vụ; có cấp riêng thì cấp của loại bị bỏ qua hẳn. **Không** đi theo số khoá của `LOI_BAC` (đánh số theo bậc, không theo thứ tự xét) | T12; `rules.ts:94–132`; đề bài 3.6 |
| Q-3 | Dải cảnh báo đầu trang: đếm loại **đang bật** hôm nay không có mức riêng **và** (không cấp **hoặc** cấp rỗng — không dòng nào còn áp). Luật thuần mới ở `src/shared/`, thay luật `coMuc` đang nằm trong `web/hoa-hong-bang.ts:214` (luật đó bỏ sót cấp rỗng). Câu: «Đơn xác nhận từ nay của các loại này sẽ bị giữ ở Đã giao cho tới khi có mức (trừ đối tác có mức riêng hoặc cấp riêng). Đơn đã xác nhận cần Ghi mức tay.» Loại đã tắt đếm riêng một dòng. Cấp không có dòng «Mọi dịch vụ» vẫn để hở các dịch vụ ngoài danh sách: ghi một dòng nhắc ở thẻ cấp, không đếm | T4, T5; ADR-0077 điều 8–9 (giữ nguyên, không thả đơn cũ); đề bài 3.9 |
| Q-4 | Ma trận so sánh có hàng **nhóm dịch vụ**; cấp xếp theo tên, so số tự nhiên; không có «Áp dụng từ» của cả cấp | T9, T13 (cấp không có ngày, không có hạng) |
| Q-5 | Mỗi dòng mức ghi ngày từ/đến **của dòng**; mức theo khách ghi đủ NL · TE · NCT | T16; ADR-0133 |
| Q-6 | Đổi · Sửa · Ngừng giữ ba việc riêng theo luật có sẵn (`nutDoiNgung`, `nutSua`, `coQuyenSua`); máy tính: nút «Đổi» thấy sẵn, Sửa/Ngừng/Lịch sử trong menu «⋯»; điện thoại: chạm dòng mở hộp trượt | T17, T18; ADR-0148 Đ1; đề bài mục 4 |
| Q-7 | Tắt **loại** (giữ đơn) và tắt **cấp** (vẫn chi) có hộp hỏi lại nói hậu quả, huy hiệu khác tông | T14, T29; đề bài 3.7–3.8 |
| Q-8 | Chuyển cấp cho một đối tác: thẻ thứ ba có nút chính «Đặt cấp riêng cho đối tác», tìm đối tác bằng `GET /api/pricing/nguoi-huong`, ghi bằng `POST /ho-so/:id/muc-rieng`, đổi bằng `/muc-rieng/:id/sua`, ngừng bằng `/ket-thuc` | T31 |
| Q-9 | Đối tác mang hai loại ra hai mức khác nhau: dòng ghi «xung đột mức» (từ `xungDot`) | T33 |
| Q-10 | Thành phần đợt 0 (`.nut`, `.huy-hieu`, `.dai`, `.tab-phu`, `.bang`, `moBangTruot`, `hoiXacNhan`); token bộ v2 trong bản vẽ ánh xạ sang token sẵn có, không thêm màu | T35; `web/CLAUDE.md` |
| Q-11 | Khổ 390 (và 641–899, theo cổng 2b dùng bố cục điện thoại): không cuộn ngang cả trang; ma trận đổi thành danh sách theo từng cấp (chọn cấp bằng `.tab-phu[data-kieu="vien"]`); 1040: ma trận đủ cột, cuộn ngang **trong khung bảng** khi > 5 cấp | bản vẽ chỉ vẽ 1440 |

## 2. Dữ liệu và API

Không đổi. Trang gọi đúng các route đang có: `GET /api/pricing/hoa-hong`, `/muc-ta`, `/loai-doi-tac`, `/thu-tra`, `/nguoi-huong`, `/ho-so/:id/hoa-hong`, `/api/catalog`; ghi qua các route liệt kê ở `DOI-CHIEU-MOCKUP.md` T3–T32. Đề xuất **chỉ khi chủ chọn khác khuyến nghị**:
- Câu 1 phương án B ⇒ route mới «Ngừng cấp từ ngày» đóng mọi lần xếp của cấp trong một lô (loại B; sửa câu ruling N-23 / ADR-0117 lần 2 bằng ADR mới).
- Câu 2 phương án B ⇒ route đọc mới chạy `chonMuc` cho cấp × dịch vụ (loại B; cần ADR nhỏ vì thêm một đường đọc kết quả tính tiền).
- Muốn đơn đã xác nhận tự thả khi cài mức (T5 nghĩa đen) ⇒ sửa câu ADR-0077 điều 9 (loại D) — không đề xuất.

## 3. Vùng và dữ liệu đổ vào

| Vùng | Nguồn |
|---|---|
| Dải cảnh báo | Q-3: `MucTaListResponse.muc[].gan`, `LoaiDoiTacDto`, dòng `doiTuong.loai = "VAI"` |
| Thẻ «Các cấp»: ma trận | `MucTaDto.dong` (dòng còn áp / sắp áp, phạm vi SERVICE · GROUP · ALL), `MucTaDto.gan`, `ganRieng` |
| Thẻ «Các cấp»: chi tiết một cấp | `MucTaDto` (tên, `dangBat`, dòng, lần xếp), nút Thêm mức / Xếp loại / Tắt–Bật cấp |
| Thẻ «Loại đối tác» | `LoaiDoiTacDto` + `chinhSachCuaLoai` + dòng đích loại; nút Xếp cấp / Đổi cấp / Tắt–Bật loại |
| Thẻ «Riêng từng đối tác» | `ghepDoiTacRieng` (dòng đích đối tác + `ganRieng`), `HoaHongHoSoResponse` khi mở một đối tác |
| Tra nhanh | `web/hoa-hong-tra-nhanh.ts` giữ nguyên hành vi, đưa lên đầu trang |

## 4. Quyền

Không đổi: xem = `partner.commission.view` (Bán hàng, Kế toán, Quản trị, Toàn quyền), ghi = `partner.commission.write` (Kế toán, Quản trị, Toàn quyền), tài khoản mang quyền Đối tác không vào (`holdsPartner`). Ẩn/hiện bằng `can()`; máy chủ kiểm lại.

## 5. Tiêu chí nghiệm thu (mặc định KHÔNG ĐẠT nếu thiếu bằng chứng)

1. Không con số nào do `web/` tự suy: ô không có dòng thật ghi «—»; bài thuần mới cạnh `src/shared/hoa-hong-hien-thi.ts` có ca «loại chỉ có dòng nhóm» không ra số «Mọi dịch vụ».
2. Câu thứ tự áp mức đúng dãy bậc 1–3 → 10–12 → 4–6 → 7–9 của Q-2 (bài thuần ghim dãy này; sửa cố ý → đỏ → hoàn nguyên).
3. Dải cảnh báo: ca loại tắt, loại có mức riêng không cấp, loại theo **cấp rỗng**, loại sắp có cấp từ ngày mai — đếm đúng (bài thuần); câu không chứa «mở khoá».
4. Tắt cấp và tắt loại: hộp hỏi lại nói đúng hậu quả, huy hiệu khác tông (kịch bản Chrome).
5. Chuyển cấp cho một đối tác ngay trên trang: đặt, đổi, ngừng chạy được; 400/409 hiện nguyên câu máy chủ (kịch bản Chrome trên D1 tạm).
6. Đổi/Sửa/Ngừng hiện đúng luật có sẵn: `src/shared/hoa-hong-hien-thi.test.ts` xanh không sửa ca cũ.
7. Bán hàng thấy trang, không nút ghi; Đối tác nhận trang 403 (kịch bản Chrome, mở tài khoản đối tác sau cùng).
8. 390 và 1040: `document.documentElement.scrollWidth ≤ innerWidth`; vùng chạm ≥ 44px; axe không lỗi nghiêm trọng.
9. `git diff main --stat` không chạm `src/modules/`, `migrations/`, `src/shared/permissions.ts`, `src/shared/contracts.ts`.

**Chạy lại:** `npm test` · `npm run typecheck` · `npm run build:web` · `npm run test:e2e -- pwa` (quét token CSS) · `hoa-hong-smoke.mjs` (`docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/`, sửa có chủ đích, kể tên từng bước đổi) · `a2-smoke-form.mjs` · nếu Câu 3 đổi tên: `src/bang-tu-giao-dien.test.ts`, `t2b-danh-ba-smoke.mjs`, `dot-a-smoke.mjs`, bài Hướng dẫn / Trợ lý · cổng phát hành: bộ đo Chặng 1 trước/sau, chủ duyệt.

## 6. Phụ thuộc và rủi ro

- Đợt 0b (đã duyệt, chưa gộp) chuyển `public/hoa-hong.html` sang `web/html/hoa-hong.html`. Thi công **sau** khi 0b vào `main`, sửa ở nơi mới.
- Bàn giao 29/10 «tái cấu trúc toàn diện» còn treo câu hỏi với chủ; trang này là bản thử đầu tiên, không mở rộng sang trang khác.
- Rủi ro lớn nhất: chữ trên trang hứa hành vi tiền mà máy không có (tắt cấp mà vẫn chi; xếp cấp mà đơn cũ vẫn bị giữ; ô xám tự suy mức) ⇒ Kế toán quyết sai. Tiêu chí 1–4 canh chỗ này.

## 7. Câu xin chủ (tối đa ba, phương án khuyến nghị đứng đầu)

**Câu 1 — «Tắt cấp» (vô hiệu hoá một cấp) nghĩa là gì?**
- **A (khuyến nghị, an toàn, giữ nguyên tiền):** giữ nghĩa hôm nay — tắt chỉ chặn xếp thêm và thêm mức; nhóm và đối tác đang theo **vẫn hưởng**. Nhãn đổi thành lời rõ (vd «Khoá cấp, không xếp thêm») + hộp hỏi lại. Muốn ngừng chi thì «Ngừng áp dụng» từng nhóm, có ngày.
- B: thêm việc «Ngừng cấp từ ngày…» — một lần bấm đóng mọi lần xếp của cấp từ ngày đã chọn. Route mới + ADR; đơn của các nhóm đó bị giữ tới khi có cấp khác.
- C: tắt là ngừng chi ngay, không cần ngày. Đổi cách chọn mức, ADR; không khuyến nghị.

**Câu 2 — Ô trống trong bảng so sánh các cấp ghi gì?**
- **A (khuyến nghị, không đổi máy chủ):** chỉ ghi mức có thật; ô trống ghi «—» kèm câu «theo dòng rộng hơn của cấp (nhóm dịch vụ hoặc Mọi dịch vụ)»; muốn biết chính xác thì Tra nhanh.
- B: máy chủ tính sẵn mức thắng cho từng ô (số xám như bản vẽ). Route đọc mới + ADR nhỏ; đúng số nhưng thêm một đợt máy chủ.

**Câu 3 — Gọi tên thế nào?** (bảng từ: tối đa ba tên mỗi lượt, chủ chọn)
- **A (khuyến nghị):** «Cấp đại lý» thay «Chính sách hoa hồng» (và «Cấp riêng» thay «Chính sách riêng»), **giữ** «Loại đối tác» — vì «nhóm» đã là nhóm dịch vụ. Đổi trên mọi màn cùng nghĩa (Danh bạ, Hướng dẫn, Trợ lý).
- B: theo bản vẽ — «Cấp đại lý» và «Nhóm khách hàng»; dễ lẫn «nhóm khách hàng» với «nhóm dịch vụ».
- C: giữ chữ đã duyệt 25/10 («Chính sách hoa hồng», «Loại đối tác»); chỉ đổi bố cục.
