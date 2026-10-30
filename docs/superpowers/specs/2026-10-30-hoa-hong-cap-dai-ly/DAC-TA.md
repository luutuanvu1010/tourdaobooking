# Đặc tả — trang «Hoa hồng đối tác» xếp theo cấp đại lý (thiết kế lại từ bản vẽ 29/10)

> **bản 3 — 2026-10-30 — chờ QA1 lần 3 và chủ duyệt.** Chưa thi công, chưa lập kế hoạch. Bản 3 sửa điểm Chặn và bảy điểm Sửa của `QA1-LAN-2.md` và áp quyết định 7–9 (`QUYET-DINH-CHU-2026-10-30-LAN-3.md`). Bản 2 (lần lưu `353230c2`) đã sửa mọi điểm của `QA1-LAN-1.md` và áp quyết định 1–6 (`QUYET-DINH-CHU-2026-10-30.md`, `QUYET-DINH-CHU-2026-10-30-LAN-2.md`). Bản 1 nằm ở lần lưu `4d97c025`. Đối chiếu bản vẽ: `DOI-CHIEU-MOCKUP.md` (mã T1–T36; các mục «Bổ sung bản 2», «Bổ sung bản 3» ở cuối tệp). Đề xuất kiến trúc đi kèm: `docs/adr/ADR-0151-doi-cap-rieng-cua-doi-tac-mot-lo.md` (proposed). Mỗi số dòng mã trích ở đây đọc trên nhánh `dac-ta-hoa-hong-cap-dai-ly` (gốc `main` a129d3dd) ngày 30/10.

## 0. Mục tiêu và phạm vi

Lời chủ (nguyên văn): «thể hiện rõ từng cấp độ đại lý, từng chính sách giá rõ ràng, có thể điều chỉnh: vô hiệu hóa, sửa mức, ngày tháng hiệu lực, … chuyển cấp độ đại lý cho từng đối tác».

Việc chia làm **hai phần**, thi công trên `main` ngay (quyết định 4).

- **Phần 1 — giao diện và chữ (loại A).** Gồm bốn việc. (1) Dựng lại `web/hoa-hong*.ts` và `public/hoa-hong.html` theo bản vẽ, thành ba thẻ «Các cấp đại lý · Loại đối tác · Riêng từng đối tác». (2) Thêm lối vào «đặt cấp riêng cho một đối tác» ngay trên trang (hôm nay chỉ có ở Danh bạ), dùng các route đặt, sửa, ngừng đang có. (3) Sửa các chỗ bản vẽ nói sai luật tiền (T5, T8, T12, T14). (4) Đổi tên theo quyết định 3 trên mọi màn, gồm cả câu báo lỗi của máy chủ và phần hướng dẫn (quyết định 6, danh sách ở §6).
- **Phần 2 — nút «Đổi cấp» cho cấp riêng (loại B).** Route mới theo ADR-0151. **Mọi việc thi công của phần 2 nằm sau cổng «chủ duyệt ADR-0151»** (quyết định 5). Chưa duyệt thì kế hoạch không được xếp việc nào của phần 2 vào hàng chạy, và trang phần 1 **không** có nút «Đổi cấp» cho cấp riêng.
- **Ngoài phạm vi:** cách tính tiền, quyền, CSDL, `src/shared/contracts.ts`. Cũng ngoài phạm vi: ADR-0148 lượt 2 (cách tính «Giá đại lý»), BL-UX-HOA-HONG-DT (đối tác xem tổng tháng), lịch sử đầy đủ «ai sửa gì», số đơn đang bị giữ, nút «Đổi cấp» ở Danh bạ, và các trang khác ngoài Hoa hồng (trừ chữ, §6).
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` 30/10 không có mục chạm phần giá hay hoa hồng).

## 1. Quyết định đã chốt và lựa chọn của người soạn

### 1.1 Sáu quyết định của chủ (30/10, ràng buộc)

| # | Quyết định | Đặc tả áp ở |
|---|---|---|
| 1 | «Tắt cấp» giữ nghĩa hôm nay: chặn xếp thêm, các loại và đối tác đang theo cấp **vẫn được chi**. Đổi nhãn cho rõ, có hộp hỏi lại. Muốn ngừng chi thì «Ngừng áp dụng» từng lần xếp, có ngày. | Q-7, §5.2 |
| 2 | Ô trống trong bảng so sánh ghi «—» kèm lời giải thích. Chỉ hiện mức có thật; muốn biết mức thật thì Tra nhanh. | Q-4, §5.4 |
| 3 | «Chính sách hoa hồng» → «Cấp đại lý»; «Chính sách riêng» → «Cấp riêng»; giữ «Loại đối tác». Đổi đồng loạt trên mọi màn. | §6 |
| 4 | Dựng trang ngay trên `main`, không chờ đợt 0b. Mở lại 0b thì gộp sau. | §9 |
| 5 | «Đổi cấp riêng» là route mới chạy trọn một lô, có ADR, chủ duyệt rồi mới làm. Không dùng «Sửa», không làm hai bước rời. | §0 phần 2, ADR-0151 |
| 6 | Câu báo lỗi của máy chủ và phần hướng dẫn: đổi chữ ở máy chủ. Tiêu chí 9 được nới đúng cho các chuỗi chữ này. | §6, tiêu chí 9 |
| 7 | Nhãn nút của cấp: «Khoá cấp» / «Mở lại cấp», kèm huy hiệu và hộp hỏi lại theo §5.2. | Q-7, §5.2, §6 |
| 8 | Chi tiết nhật ký giữ khuôn cũ («mức riêng …», «chính sách <tên>»); chỉ nhãn hành động trên trang Nhật ký đổi chữ. | §6.1, §6.2 |
| 9 | Không đụng `kiemDoi`, không thêm tham số; câu «Mức…» giữ nguyên từng chữ và ghi thành lệch có tên. | §10, ADR-0151 Đ3 |

**Về N-23** (QA1 điểm 6). Trước ngày 30/10, N-23 («tắt cấp: không xếp mới, không thêm dòng mới, dòng đang áp vẫn áp») **chưa phải luật đã duyệt**. Nó chỉ là giả định kế hoạch, ghi ở `docs/superpowers/plans/2026-10-14-adr-0117-lan-2-ke-hoach.md` (bảng giả định, dòng N-23). Nhật ký thi công ADR-0117 lần 2 vẫn để nó trong «Việc treo chờ chủ», và chú thích ở `contracts.ts` (`MucTaDto`) cũng ghi «giả định kế hoạch, N-23». **Quyết định 1 ngày 30/10 là lần đầu chủ chốt N-23.** Bản 1 gọi nó là «ruling» là sai sự thật; bản 2 bỏ chữ đó.

### 1.2 Lựa chọn của người soạn (bề mặt, đảo ngược được, không hỏi lại)

| # | Lựa chọn | Lý do / nguồn |
|---|---|---|
| Q-1 | Mọi con số và câu «mức nào áp» lấy từ DTO máy chủ, hoặc từ luật thuần ở `src/shared/`. Luật thuần nào suy ra điều `chonMuc` sẽ làm (§4) phải có bài đối chiếu với `chonMuc`. Không hàm nào ở `web/` chọn mức. | ADR-0077 điều 6; đặc tả 25/10 |
| Q-2 | Câu thứ tự áp mức đi đúng thứ tự **xét** của `chonMuc` (`src/modules/pricing/rules.ts:94–131`): bậc 1–3 (mức riêng của đối tác) → 10–12 (cấp riêng của đối tác) → 4–6 (mức riêng của loại) → 7–9 (cấp của loại). Trong mỗi lớp: một dịch vụ → nhóm dịch vụ → mọi dịch vụ. Đối tác có cấp riêng thì cấp của loại bị bỏ qua hẳn. Không theo số khoá của `LOI_BAC`. | T12 |
| Q-3 | Dải cảnh báo đầu trang và trạng thái từng loại tính bằng **luật phủ mức** ở §4, không bằng luật `coMuc` hiện nay (`web/hoa-hong-bang.ts:214`, luật này coi «có một dòng bất kỳ» là đủ). | T4, T27; QA1 điểm chặn 3 |
| Q-4 | Ma trận so sánh có hàng **nhóm dịch vụ**. Cấp xếp theo tên, so số tự nhiên. Cấp không có «Áp dụng từ» chung. Ô không có dòng thật ghi «—», dưới bảng có câu §5.4. | T9, T13; quyết định 2 |
| Q-5 | Mỗi dòng mức ghi ngày từ / đến **của dòng**. Mức theo khách ghi đủ NL · TE · NCT. | T16; ADR-0133 |
| Q-6 | Đổi · Sửa · Ngừng là ba việc riêng (§3.1). Máy tính: nút «Đổi» thấy sẵn, các việc còn lại nằm trong «⋯». Điện thoại: chỉ «⋯», và trong đó có cả «Đổi». «⋯» mở bảng trượt `moBangTruot` có sẵn (§3.2), không thêm thành phần mới. | T17, T18; QA1 điểm 9 |
| Q-7 | Tắt **cấp** (vẫn chi) và tắt **loại** (giữ đơn) có hộp hỏi lại với câu cố định ở §5.2, huy hiệu khác tông. Nút của cấp đổi nhãn thành «Khoá cấp» / «Mở lại cấp» (quyết định 7). | T14, T29; quyết định 1, 7 |
| Q-8 | Đặt cấp riêng ngay trên trang: thẻ thứ ba có nút chính «Đặt cấp riêng cho đối tác». Tìm đối tác bằng `GET /api/pricing/nguoi-huong` (tối đa 20 kết quả, chỉ hồ sơ đang mang loại được hưởng còn bật; cổng `coTheTimDoiTac`, Kế toán dùng được). Ghi bằng `POST /ho-so/:id/muc-rieng`, sửa bằng `/muc-rieng/:id/sua`, ngừng bằng `/muc-rieng/:id/ket-thuc`. «Đổi cấp» chỉ có ở phần 2. | T31; ADR-0151 |
| Q-9 | Danh sách ở thẻ «Riêng từng đối tác» **bỏ cột «Loại đối tác»** (bản vẽ gọi «Nhóm») và không ghi xung đột trên dòng. Loại của đối tác và cờ xung đột **chỉ hiện khi mở một đối tác**, từ `GET /ho-so/:id/hoa-hong` (`HoaHongHoSoResponse.vai`, `.xungDot`). Không thêm route đọc. | T30, T33; QA1 điểm chặn 1 |
| Q-10 | Thành phần đợt 0 (`.nut`, `.huy-hieu`, `.dai`, `.tab-phu`, `.bang`, `moBangTruot`, `hoiXacNhan`). Token bộ v2 trong bản vẽ ánh xạ sang token sẵn có, không thêm màu. | T35; `web/CLAUDE.md` |
| Q-11 | Khổ 390 (và 641–899, theo cổng 2b dùng bố cục điện thoại): không cuộn ngang cả trang. Ma trận đổi thành danh sách theo từng cấp, chọn cấp bằng `.tab-phu[data-kieu="vien"]`. Khổ 1040: ma trận đủ cột, cuộn ngang **trong khung bảng** khi có hơn 5 cấp. | bản vẽ chỉ vẽ 1440 |
| Q-12 | Nút của lần xếp loại giữ họ động từ của bảng từ lượt 3 («Áp dụng cấp cho loại», «Đổi cấp», «Ngừng áp dụng»). Chỉ danh từ đổi theo quyết định 3, động từ không đổi. | `src/shared/bang-tu-giao-dien.ts` lượt 3 |

## 2. Dữ liệu và API

- **Phần 1:** không thêm route, không đổi thân hay dạng trả về. Trang gọi đúng các route đang có: `GET /api/pricing/hoa-hong`, `/muc-ta`, `/loai-doi-tac`, `/thu-tra`, `/nguoi-huong`, `/ho-so/:id/hoa-hong`, `GET /api/catalog`. Các route ghi liệt kê ở §3.1. Riêng `GET /api/catalog` nay phải giữ thêm `groupCode` của từng dịch vụ (`CatalogServiceDto.groupCode` đã có trong DTO). Hàm `taiDanhMuc` (`web/so-dai-ly-ui.ts`) đang bỏ trường này, nên phải giữ lại; đây là sửa ở `web/`, không phải ở máy chủ. Máy chủ chỉ đổi chuỗi chữ (§6).
- **Phần 2:** một route mới `POST /api/pricing/muc-rieng/:id/doi` theo ADR-0151: không migration, không quyền mới, trả `HoaHongHoSoResponse`.
- **Không đề xuất:** route đọc «mức thắng cho từng ô» (quyết định 2 chọn A); «ngừng cấp từ ngày» (quyết định 1 chọn A); thả tự động đơn đã xác nhận khi cài mức (trái ADR-0077 điều 9).

## 3. Vùng và dữ liệu đổ vào

| Vùng | Nguồn |
|---|---|
| Tra nhanh (đầu trang) | `web/hoa-hong-tra-nhanh.ts` giữ hành vi tra. Riêng «Xem dòng ↓» làm theo §3.3. |
| Dải cảnh báo | Luật phủ mức §4 trên `CommissionRuleListResponse.dong`, `MucTaListResponse.muc[].gan`, `LoaiDoiTacDto`, danh mục `/api/catalog` |
| Thẻ «Các cấp đại lý»: ma trận | `MucTaDto.dong` (dòng đang áp và sắp áp, phạm vi SERVICE · GROUP · ALL), `MucTaDto.gan`, `ganRieng` (đếm theo mã cấp) |
| Thẻ «Các cấp đại lý»: chi tiết một cấp | `MucTaDto` (tên, `dangBat`, dòng, lần xếp), câu nhắc phủ mức của cấp (§4.3), nút theo §3.1 |
| Thẻ «Loại đối tác» | `LoaiDoiTacDto`, `chinhSachCuaLoai`, dòng đích loại, trạng thái phủ mức (§4.2) |
| Thẻ «Riêng từng đối tác»: danh sách | `ghepDoiTacRieng` (tên, có mức riêng, tên cấp riêng). **Không** có cột loại đối tác, **không** nhãn xung đột (Q-9). |
| Thẻ «Riêng từng đối tác»: mở một đối tác | `GET /ho-so/:id/hoa-hong`: các loại đang mang kèm cấp của từng loại (`vai`), cờ `xungDot`, `mucRieng`, lịch sử `ganRieng`; dòng mức riêng lấy từ `dong` của trang. Có `xungDot` thì hiện huy hiệu `do` «Xung đột mức». Câu đi kèm: «Đối tác này mang hai loại ra hai mức khác nhau cho cùng một dịch vụ. Đơn của dịch vụ đó bị giữ ở bước Đã giao cho tới khi đặt mức riêng hoặc cấp riêng cho đối tác này.» |

Đối tác **bị xung đột mà không có mức riêng hay cấp riêng** thì không có mặt trong danh sách. Bản 2 chấp nhận điều này, không thêm route đọc. Dưới danh sách ghi câu: «Đối tác không có mức riêng hay cấp riêng không nằm ở đây. Muốn biết một đối tác đang ra mức nào: dùng Tra nhanh.»

### 3.1 Đối tượng → việc làm được (QA1 điểm 10)

| Đối tượng | Thêm / đặt | Đổi | Sửa (ADR-0148 Đ1) | Ngừng | Khoá / tắt | Lịch sử |
|---|---|---|---|---|---|---|
| Dòng mức (đích loại, cấp hoặc đối tác) | `POST /hoa-hong`; dòng của cấp: `POST /muc-ta/:code/dong` (cấp đang khoá ⇒ 409) | `POST /hoa-hong/:id/doi` | `GET`/`POST /hoa-hong/:id/sua` | `POST /hoa-hong/:id/dong` | — | Bộ lọc «Tất cả» của bảng (dòng đã ngừng, đã huỷ) |
| Lần xếp loại vào cấp (`prc_role_tier`) | `POST /muc-ta/gan` | `POST /muc-ta/gan/:id/doi` | `GET`/`POST /muc-ta/gan/:id/sua` | `POST /muc-ta/gan/:id/ket-thuc` | — | «Xem lịch sử (n)» (`web/hoa-hong-lich-su.ts`) |
| Cấp riêng của đối tác (`prc_party_tier`) | `POST /ho-so/:id/muc-rieng` | **Phần 2:** `POST /muc-rieng/:id/doi` (ADR-0151). Phần 1: không có. | `GET`/`POST /muc-rieng/:id/sua` | `POST /muc-rieng/:id/ket-thuc` | — | «Xem lịch sử (n)» |
| Cấp đại lý (`prc_rate_tier`) | `POST /muc-ta` | — | — (không có route đổi tên) | — | `POST /muc-ta/:code/tat`, `/bat` | — |
| Loại đối tác | `POST /loai-doi-tac` | — | — | — | `/loai-doi-tac/:code/tat`, `/bat`; chỉ loại `coSan = false` | — |

Luật hiện nút dùng các hàm có sẵn: «Đổi» và «Ngừng» theo `nutDoiNgung`, «Sửa» theo `nutSua` cộng `coQuyenSua`, mọi nút ghi theo `can(…, "partner.commission.write")`. Với cấp riêng, luật hiện nút chạy trên `HoaHongHoSoResponse.ganRieng[]` (có `conHieuLuc`, `daHuy`), không chạy trên `GanRiengDto` của danh sách.

**Cấp đang khoá** (`MucTaDto.dangBat = false`). Đã đối chiếu trigger: `prc_commission_rule_target_tier` (0097), `prc_role_tier_tier_ok` (0096), `prc_party_tier_tier_ok` (0118) chặn mọi câu **chèn** trỏ cấp đang khoá, còn câu đóng thì không bị chặn. Vì «Đổi» và «Sửa» đều chèn dòng mới, nên:
- dòng mức của cấp khoá: **ẩn** «Đổi» và «Sửa», chỉ còn «Ngừng»;
- lần xếp loại và cấp riêng đang trỏ cấp khoá: «Ngừng» giữ, «Đổi» giữ (chuyển **sang** cấp khác vẫn được, đây là đường đưa loại hay đối tác ra khỏi cấp đã khoá), «Sửa» giữ nhưng ô chọn cấp chỉ liệt kê cấp đang mở (như `web/hoa-hong-hop.ts` đang lọc `dangBat`);
- không có nút «Áp dụng cấp cho loại», «Đặt cấp riêng», «Thêm mức» trỏ vào cấp khoá.

### 3.2 Menu «⋯» (QA1 điểm 9)

«⋯» là một `<button>` (vùng chạm ≥ 44px) mang `aria-haspopup="dialog"` và `aria-label="Việc khác: <tên dòng>"`. Bấm vào thì mở `moBangTruot` (`web/bang-truot.ts`) với tiêu đề là tên dòng. Thân bảng là danh sách nút `.nut[data-cap="phu"]` rộng hết hàng, mỗi nút một việc của §3.1 mà dòng đó được phép (kể cả luật «cấp đang khoá»: việc bị ẩn thì không có trong danh sách). Ở khổ điện thoại, «Đổi» đứng đầu danh sách. Vì dùng thành phần có sẵn nên **không thêm thành phần mới**: Esc, chạm nền, làm trơ nền phía sau (`inert`) và trả tiêu điểm về nút mở đều là hành vi sẵn có của `moBangTruot`. Bấm một việc thì đóng bảng rồi mở hộp của việc đó (hộp sẵn có ở `web/hoa-hong-hop.ts`). Bài kiểm nằm ở tiêu chí 8.

### 3.3 «Xem dòng ↓» khi trang có ba thẻ (QA1 điểm 11)

Kết quả Tra nhanh có `ketQua.muc.doiTuong.loai`. Thay `cuonToiDong(dongId, loai?)` bằng luật chọn thẻ theo đối tượng:

| `doiTuong.loai` (bậc) | Thẻ | Mở gì |
|---|---|---|
| `DOI_TAC` (1–3) | «Riêng từng đối tác» | Mở thẻ của đối tác `partyId`, cuộn tới dòng `data-dong-id` |
| `VAI` (4–6) | «Loại đối tác» | Mở cụm của loại `doiTuong.code`, cuộn tới dòng |
| `MUC` (7–9 và 10–12) | «Các cấp đại lý» | Mở chi tiết cấp `doiTuong.code`, cuộn tới dòng ở bảng «Mức của cấp». Bậc 10–12 thêm dòng chữ «— cấp riêng của đối tác đang tra». |

Mỗi lần nhảy đều chuyển thẻ, ghi thẻ vào `sessionStorage` như hôm nay, và đặt tiêu điểm vào dòng. Bộ lọc đang giấu dòng thì đưa bộ lọc về mặc định rồi thử lại (giữ hành vi cũ). Vẫn không thấy dòng thì hiện toast tông `bien` «Không thấy dòng này trên trang — tải lại trang.» Toast này là hành vi **mới**: hôm nay `cuonToiDong` thoát lặng lẽ (`web/hoa-hong-bang.ts:271`). Nút «Xem dòng ↓» chỉ có khi `ketQua.trangThai = "SET"`.

## 4. Luật phủ mức: đếm và nhắc (QA1 điểm chặn 3, điểm 12)

Luật thuần mới đặt ở `src/shared/` (tên tệp đề xuất `hoa-hong-phu-muc.ts`). Nó trả lời đúng một câu: «một đối tác **chỉ** mang loại L, không có mức riêng, không có cấp riêng, xác nhận đơn **hôm nay** cho dịch vụ s, thì `chonMuc` có ra mức không?».

### 4.1 Định nghĩa

- **Ngày xét D** = `homNay` máy chủ trả. Đây là ngày xác nhận đơn, tức mốc chụp mức (ADR-0077 điều 8).
- **Còn áp ở D:** dòng hay lần xếp chưa huỷ (`daHuy = false`), `tuNgay ≤ D`, và `denNgay` trống hoặc `denNgay ≥ D`. Dòng kết thúc đúng hôm nay vẫn còn áp. Dòng và lần xếp **sắp áp** (`tuNgay > D`) **không** tính.
- **Tập dịch vụ S** = mọi mục của `GET /api/catalog` (dịch vụ đang hiện), mỗi mục mang `code` và `groupCode` (null = chưa phân loại **hoặc nhóm đang tắt**). **Lệch biết trước:** lúc chụp, `chonMuc` nhận nhóm từ view `v_ctl_service_group` (migration 0090: dòng gán mới nhất, **không** xét nhóm bật hay tắt), còn `/api/catalog` trả null cho dịch vụ của nhóm đang tắt (`src/modules/catalog/index.ts`, ADR-0058 Đ5). Vì vậy với dịch vụ thuộc nhóm đang tắt, luật phủ không tính dòng GROUP của nhóm đó, trong khi máy chủ vẫn tính. Lệch này đi theo chiều cảnh báo thừa: dải có thể báo thiếu dịch vụ mà máy chủ thật ra vẫn ra mức. Bản 2 chấp nhận, không thêm route (§11).
- **Lệch thứ hai, chiều ngược lại (QA1 lần 2, mục Ghi):** S chỉ gồm dịch vụ **đang hiện**. Dịch vụ đã ẩn không có trong S, nên loại thiếu mức cho dịch vụ ẩn không bị báo. Nếu một đơn có dịch vụ đó (đơn lập trước khi ẩn, xác nhận sau) thì đơn vẫn bị giữ mà dải không nói. Chiều này là **báo thiếu ít hơn thật**. Bản 3 chấp nhận và ghi nó ở §11, vì trang không có dữ liệu dịch vụ ẩn nếu không thêm route. Dịch vụ ẩn còn vào được đơn mới hay không: chưa kiểm.
- **Dòng r khớp dịch vụ s:** `SERVICE` và `r.catalogCode = s.code`; hoặc `GROUP` và `s.groupCode ≠ null` và `r.groupCode = s.groupCode`; hoặc `ALL`.
- **Loại L phủ dịch vụ s ở D** khi có ít nhất một trong hai điều:
  - (a) có dòng mức đích loại L, còn áp ở D, khớp s; hoặc
  - (b) có lần xếp L vào cấp T, còn áp ở D, **và** có dòng mức đích cấp T, còn áp ở D, khớp s.

  Hai điều gộp theo «hoặc» vì `chonMuc` rơi từ lớp 4–6 xuống lớp 7–9 **cho từng dịch vụ**. Cờ cấp đang khoá (`dangBat`) **không** ảnh hưởng (quyết định 1: cấp khoá vẫn chi).
- **Phủ theo dịch vụ, không theo «có dòng nào».** Thiếu một dịch vụ là thiếu, dù loại có dòng khác.

### 4.2 Kết quả cho một loại

| Kết quả | Điều kiện | Trạng thái ở thẻ «Loại đối tác» | Vào dải cảnh báo |
|---|---|---|---|
| `TAT` | `LoaiDoiTacDto.dangBat = false` | huy hiệu `xam` «Đã tắt» | dòng riêng «loại đã tắt» |
| `DU` | phủ mọi dịch vụ trong S | huy hiệu `la` «Đang áp dụng» | không |
| `KHONG_CO` | không phủ dịch vụ nào | huy hiệu `do` «Chưa có mức» | có |
| `THIEU` (n) | phủ một phần, thiếu n dịch vụ | huy hiệu `cat` «Thiếu mức n dịch vụ» | có |
| `CHUA_KIEM` | danh mục không tải được (`DanhMuc.loi ≠ null`) hoặc S rỗng | không huy hiệu | dải chỉ ghi câu «chưa kiểm được» (§5.1), **không** ghi số |

Kèm theo, nếu loại có dòng đích loại L hoặc lần xếp của L **sắp áp**, thì ghi phụ chú «Có thay đổi sắp áp dụng từ <ngày sớm nhất>». Phụ chú không đổi kết quả. Thứ tự loại trong thẻ: `KHONG_CO`, `THIEU`, `DU`, `TAT`; trong mỗi nhóm xếp theo tên tiếng Việt (thay `xepLoai` theo `coMuc`).

### 4.3 Câu nhắc của một cấp (chỉ nhắc ở thẻ cấp, không vào số đếm)

Áp cùng luật khớp của §4.1, nhưng chỉ trên dòng đích cấp T:

| Ca | Câu ở chi tiết cấp |
|---|---|
| Cấp không có dòng nào (trừ dòng đã huỷ) | «Cấp này chưa có mức nào.» |
| Có dòng, nhưng không dòng nào còn áp ở D; có dòng sắp áp | «Hôm nay cấp này chưa áp mức nào; mức đầu tiên áp dụng từ <ngày>.» |
| Có dòng, không còn áp, không sắp áp | «Hôm nay cấp này chưa áp mức nào.» |
| Còn áp nhưng thiếu n dịch vụ | «<n> dịch vụ chưa có mức trong cấp này: <tối đa 3 tên>[ và <k> dịch vụ khác].» |
| Phủ đủ | không câu |

### 4.4 Ca mong đợi (tiêu chí 3)

Bộ mẫu: D = 2026-11-01. S = A (nhóm G1), B (nhóm G1), C (nhóm G2), D' (chưa phân loại).
Cấp mẫu:
- T1: dòng ALL đang áp.
- T2: không có dòng nào.
- T3: dòng ALL từ 2026-11-02.
- T4: dòng GROUP G1 và dòng SERVICE C, đang áp.
- T5: đang **khoá**, dòng ALL đang áp.
- T6: dòng ALL đến 2026-10-31.

| Loại | Dữ liệu | Kết quả mong đợi | Dịch vụ thiếu |
|---|---|---|---|
| L1 | đã tắt; có dòng riêng ALL | `TAT` | — |
| L2 | dòng riêng ALL | `DU` | — |
| L3 | xếp T1 | `DU` | — |
| L4 | xếp T2 (cấp rỗng) | `KHONG_CO` | 4 |
| L5 | xếp T3 (cấp chỉ có dòng sắp áp) | `KHONG_CO`; không phụ chú (dòng sắp áp là của cấp, không phải của loại) | 4 |
| L6 | không dòng; lần xếp vào T1 từ 2026-11-02 | `KHONG_CO`, phụ chú «từ 02/11/2026» | 4 |
| L7 | chỉ một dòng riêng SERVICE A | `THIEU` 3 | B, C, D' |
| L8 | chỉ dòng riêng GROUP G1 | `THIEU` 2 | C, D' |
| L9 | dòng riêng SERVICE A **và** xếp T1 | `DU` (lỗi «có một dòng là đủ» của luật cũ không còn) | — |
| L10 | xếp T4 | `THIEU` 1 | D' |
| L11 | xếp T5 (cấp đang khoá) | `DU` | — |
| L12 | xếp T6 (dòng cấp hết hạn hôm qua) | `KHONG_CO` | 4 |
| L13 | dòng riêng ALL đến 2026-11-01 (hôm nay) | `DU` | — |
| L14 | lần xếp vào T1 đã huỷ | `KHONG_CO` | 4 |

**Đếm trên dải:** 8 loại thiếu mức (`KHONG_CO` 5: L4, L5, L6, L12, L14; `THIEU` 3: L7, L8, L10); 1 loại đã tắt (L1). **Câu nhắc cấp:**
- T1, T5: không câu.
- T2: «Cấp này chưa có mức nào.»
- T3: «Hôm nay cấp này chưa áp mức nào; mức đầu tiên áp dụng từ 02/11/2026.»
- T4: «1 dịch vụ chưa có mức trong cấp này: D'.»
- T6: «Hôm nay cấp này chưa áp mức nào.»

Thêm hai ca: danh mục lỗi ⇒ `CHUA_KIEM` cho mọi loại, dải không ghi số; S rỗng ⇒ `CHUA_KIEM`.

**Bài đối chiếu với `chonMuc` (bắt buộc).** Bài đặt ở `src/modules/pricing/` (tên đề xuất `phu-muc-doi-chieu.test.ts`), vì `src/shared/` không được nhập `src/modules/` còn bài trong module thì nhập được cả hai. Với mỗi loại L2–L14 và mỗi dịch vụ s của bộ mẫu, bài gọi `chonMuc` với:
- `nguoiHuong = { loai: "HUONG", partyId: X, vai: [L] }`;
- `catalogCode = s.code`, `groupCode = s.groupCode`, `ngay = D`;
- `dong` = bộ mẫu đổi sang `DongMuc`, chỉ dòng chưa huỷ;
- `gan` = lần xếp chưa huỷ;
- `ganRieng = []`.

Bài đòi: «luật phủ nói L phủ s» ⇔ `trangThai = "SET"` (bộ mẫu chỉ có nhóm đang bật). Với L1, dữ liệu vào của `nguoiHuongCua` ghi rõ: `vaiMo = [{ roleTypeCode: "L1", roleGroup: "OTHER", nhanDoiTac: true }]` (loại do Kế toán thêm, như mọi loại tắt được), `vaiDuocHuong` = các loại đang bật (không có L1), `congTyChuId` khác X. Thiếu `nhanDoiTac: true` (hoặc `roleGroup: "EXTERNAL"`) thì hàm trả `NONE`, không phải `KHONG_HUONG` (`rules.ts:72`), nên bài phải ghim đúng dữ liệu này. Với L2–L14, `vaiMo` = một vai `{ roleTypeCode: L, roleGroup: "OTHER", nhanDoiTac: true }` và L nằm trong `vaiDuocHuong`.

**Bộ mẫu riêng cho ca nhóm tắt** (không gộp vào S của bảng trên, để số «thiếu 4» của L4, L5, L6, L12, L14 giữ nguyên): S' = {E}, E có nhóm G3 đang tắt, danh mục trả `groupCode = null`, `chonMuc` nhận `G3`; loại L15 chỉ có dòng GROUP G3. Bài đòi luật phủ nói L15 «thiếu E» (`KHONG_CO` trên S') còn `chonMuc` ra `SET`, tức ghim đúng chiều của lệch ở §4.1. Ngoài ca này, bài đòi chiều «phủ ⇒ SET» không bao giờ sai. Với L1 (đã tắt), bài đòi `nguoiHuongCua` trả `KHONG_HUONG` khi danh sách được hưởng bỏ L1, và `chonMuc` trả `MISSING`, lý do `BOOKER_NOT_BENEFICIARY`. Sửa cố ý luật phủ (bỏ nhánh (b), hoặc tính dòng sắp áp) thì bài phải đỏ, rồi hoàn nguyên (P16).

## 5. Câu chữ cố định (tiêu chí 3, 4 ghim nguyên văn)

### 5.1 Dải cảnh báo đầu trang (`.dai[data-tong="cat"]`)

- **Tiêu đề** (khi có loại thiếu): «Có <n> loại đối tác còn thiếu mức hôm nay».
- **Thân:** «Đối tác chỉ mang loại này, không có mức riêng hay cấp riêng, sẽ bị giữ đơn ở bước Đã giao nếu đơn xác nhận từ hôm nay có dịch vụ chưa có mức. Đối tác mang thêm một loại khác có mức thì vẫn được tính theo loại đó. Đơn đã xác nhận trước đó không tự thả khi thêm mức: Kế toán dùng Ghi mức tay cho từng đơn.»
- **Mỗi loại một dòng:** «<Loại>: chưa có mức cho dịch vụ nào» hoặc «<Loại>: thiếu mức cho <n> dịch vụ (<tối đa 3 tên>[ và <k> dịch vụ khác])», kèm phụ chú §4.2 nếu có.
- **Loại đã tắt** (một dòng riêng, khi có): «<m> loại đã tắt: đối tác chỉ mang loại đã tắt không được hưởng hoa hồng, đơn của họ bị giữ ở bước Đã giao.»
- **Chưa kiểm được:** «Chưa kiểm được loại nào thiếu mức vì không tải được danh mục dịch vụ. Tải lại trang.»
- Không câu nào chứa «mở khoá» hay «tự động».

### 5.2 Hộp hỏi lại (`hoiXacNhan`)

**Khoá một cấp** (quyết định 1):
- `tieuDe`: «Khoá cấp «<tên>»?»
- `hauQua`: «Sau khi khoá, cấp này không nhận thêm loại hay đối tác nào, không thêm mức mới, và các mức đang có của cấp không Đổi hay Sửa được nữa, chỉ Ngừng được. Các loại và đối tác đang theo cấp này vẫn được tính hoa hồng như cũ. Muốn ngừng chi cho một loại thì dùng Ngừng áp dụng ở lần áp dụng của loại đó; muốn chuyển loại sang cấp khác thì dùng Đổi cấp.»
- `nhanNguyHiem`: «Khoá cấp»
- Huy hiệu khi đã khoá: tông `cat`, chữ «Đã khoá — vẫn áp cho loại và đối tác đang theo».

**Tắt một loại:**
- `tieuDe`: «Tắt loại «<tên>»?»
- `hauQua`: «Sau khi tắt, đối tác chỉ mang loại này không được hưởng hoa hồng nữa: đơn họ đặt, xác nhận từ lúc tắt, bị giữ ở bước Đã giao cho tới khi Kế toán dùng Ghi mức tay. Đối tác mang thêm một loại khác còn bật vẫn được tính theo loại đó, nếu loại đó có mức cho dịch vụ của đơn. Đơn đã xác nhận trước lúc tắt giữ nguyên hoa hồng.»
- `nhanNguyHiem`: «Tắt loại»
- Huy hiệu khi đã tắt: tông `xam`, chữ «Đã tắt». Trên dải: dòng loại đã tắt ở §5.1.

Hai câu hậu quả đã đối chiếu với mã: loại tắt bị bỏ khỏi danh sách được hưởng, nên `nguoiHuongCua` trả `KHONG_HUONG` khi hồ sơ không còn loại được hưởng nào khác (`rules.ts:61–74`), và dòng `BOOKER_NOT_BENEFICIARY` đi đường ghi mức tay (`orders/index.ts:945`); cấp khoá vẫn áp vì `docBangChoChup` không lọc theo cờ bật của cấp.

### 5.3 Câu thứ tự áp mức (Q-2, tiêu chí 2)

«Mức nào áp cho một đơn: mức riêng của đối tác → cấp riêng của đối tác → mức riêng của loại đối tác → cấp đại lý của loại. Trong mỗi bước: dịch vụ đó → nhóm dịch vụ → mọi dịch vụ. Đối tác có cấp riêng thì không xét cấp của loại. Muốn biết chắc cho một đối tác: dùng Tra nhanh.»

### 5.4 Ô trống của ma trận (quyết định 2)

Ô ghi «—». Câu dưới bảng: «Ô «—»: cấp không có dòng riêng cho ô này; đơn sẽ theo dòng rộng hơn của cấp (nhóm dịch vụ hoặc mọi dịch vụ) nếu có. Muốn biết mức chắc chắn: dùng Tra nhanh.»

## 6. Chữ ở máy chủ, hướng dẫn và giao diện (quyết định 3, 6; QA1 điểm chặn 4)

**Luật đổi:** «chính sách hoa hồng» / «chính sách» (nghĩa cấp) → «cấp đại lý» / «cấp»; «chính sách riêng» (và «mức riêng» khi nói về `prc_party_tier`) → «cấp riêng». **Không đụng** «chính sách riêng tư», «chính sách điều phối», «chính sách đăng nhập», «chính sách nhập tay», «chính sách khung giờ đón», câu chính sách huỷ, và «mức riêng» theo nghĩa một dòng mức đặt lẻ.

### 6.1 Câu báo lỗi của máy chủ (chỉ đổi chuỗi chữ)

| Nơi | Câu hôm nay | Câu mới |
|---|---|---|
| `pricing/index.ts:67` | Đã có chính sách với tên này. | Đã có cấp đại lý với tên này. |
| `:69` | Hồ sơ này đã có một mức riêng trong khoảng ngày này — ngừng mức riêng cũ trước. | Hồ sơ này đã có một cấp riêng trong khoảng ngày này — ngừng cấp riêng cũ trước. |
| `:70` | Loại này đã theo một chính sách trong khoảng ngày này — ngừng áp dụng chính sách cũ trước. | Loại này đã theo một cấp đại lý trong khoảng ngày này — ngừng áp dụng cấp cũ trước. |
| `:72` | Chính sách này đã tắt — bật lại trước khi áp dụng cho loại hay thêm mức. | Cấp đại lý này đang khoá — mở lại cấp trước khi áp dụng cho loại, đặt cấp riêng hay thêm mức. |
| `:73`, `:467` | Lần áp dụng chính sách này vừa được người khác ngừng hoặc đổi. Tải lại trang. | Lần áp dụng cấp đại lý này vừa được người khác ngừng hoặc đổi. Tải lại trang. |
| `:190` (`MUC_KHONG_CO`) | Không tìm thấy chính sách này. | Không tìm thấy cấp đại lý này. |
| `:221` | Mức này đang bật rồi — tải lại. / Mức này đã tắt rồi — tải lại. | Cấp này đang mở rồi — tải lại. / Cấp này đã khoá rồi — tải lại. |
| `:424`, `:446`, `:477`, `:485` | Không tìm thấy lần áp dụng chính sách này cho loại. | Không tìm thấy lần áp dụng cấp đại lý này cho loại. |
| `:438` | Lần áp dụng chính sách này vừa được ngừng — tải lại. | Lần áp dụng cấp đại lý này vừa được ngừng — tải lại. |
| `:454` | Mức mới giống hệt mức đang gắn. | Cấp mới giống hệt cấp đang áp dụng. |
| `:508` | Lần áp dụng chính sách này vừa được người khác sửa hoặc ngừng. Tải lại trang. | Lần áp dụng cấp đại lý này vừa được người khác sửa hoặc ngừng. Tải lại trang. |
| `:570`, `:591`, `:599` | Không tìm thấy chính sách riêng này. | Không tìm thấy cấp riêng này. |
| `:582` | Chính sách riêng này vừa được ngừng — tải lại. | Cấp riêng này vừa được ngừng — tải lại. |
| `:620` | Chính sách riêng này vừa được người khác sửa hoặc ngừng. Tải lại trang. | Cấp riêng này vừa được người khác sửa hoặc ngừng. Tải lại trang. |
| `pricing/rules.ts:374`, `:377` | Tên chính sách dài từ 2 đến 60 ký tự. | Tên cấp đại lý dài từ 2 đến 60 ký tự. |
| `rules.ts:375` | Tên chính sách không được chứa số điện thoại, số tài khoản hay địa chỉ email. | Tên cấp đại lý không được chứa số điện thoại, số tài khoản hay địa chỉ email. |
| `rules.ts:386` | Chọn loại đối tác và chính sách. | Chọn loại đối tác và cấp đại lý. |
| `rules.ts:395`, `:402` | Chọn chính sách. | Chọn cấp đại lý. |

Câu `:72` và `:221` đi theo nhãn «Khoá cấp» / «Mở lại cấp» (quyết định 7). **Không đổi** ở lượt này: chi tiết nhật ký (`index.ts:129` `chính sách ${…}`, `:535` `chính sách ${muc.name}`, `:561`, `:579`, `:615`, `:617` «mức riêng …»), theo quyết định 8; câu của `kiemDoi`, `kiemSua` («Mức này…», «Phần sửa giống hệt mức cũ.»), theo quyết định 9, ghi lệch ở §10.

### 6.2 `src/shared/` (không bị tiêu chí 9 cấm)

- `so-dai-ly-nhap.ts:183`: «Chọn một chính sách.» → «Chọn một cấp đại lý.»
- `audit-actions.ts:100–111`, nhãn trang Nhật ký: «… chính sách hoa hồng …» → «… cấp đại lý …»; «chính sách riêng» và «chính sách hoa hồng riêng» → «cấp riêng»; `prc_rate_tier_off`/`_on` → «Khoá cấp đại lý» / «Mở lại cấp đại lý».
- `huong-dan-ke-toan.ts`: mục «Chính sách hoa hồng» (khoảng dòng 140–147) viết lại theo chữ mới và tên nút mới của trang. Dòng 228 («Đặt mức riêng cho một đối tác, thử tra mức: chưa, vì tài khoản Kế toán không tìm được đối tác theo tên») sai từ ADR-0141, trái với chính dòng 123 cùng tệp: bỏ hoặc viết lại.
- `huong-dan-quan-tri.ts`: không có câu nào về cấp hoa hồng (chỉ có điều phối và đăng nhập), nên không đổi.
- `bang-tu-giao-dien.ts`: thêm **lượt 6** (lượt 4 «hỗ trợ» ở dòng 40 và lượt 5 «Trang chủ» ở dòng 43 đã có). Ba mục, nguyên văn:

  | # | `cam` | `thay` |
  |---|---|---|
  | 6a | `/[Cc]hính sách hoa hồng\|CHÍNH SÁCH HOA HỒNG/u` | «Cấp đại lý» |
  | 6b | `/[Cc]hính sách riêng(?! tư)\|CHÍNH SÁCH RIÊNG(?! TƯ)/u` | «Cấp riêng» |
  | 6c | `/(?:Thêm\|Đổi\|Chọn\|Chọn một\|Tên\|Lần áp dụng\|Áp dụng\|Ngừng áp dụng) chính sách(?! (?:riêng tư\|điều phối\|đăng nhập\|nhập tay\|khung giờ))\|[Cc]hính sách (?:này(?: đã tắt\| cho loại)?(?=[.\s—]\|$)\|với tên\|cũ\|mới\|khác từ\|theo loại\|«)\|(?:theo một\|theo hai\|và\|vào\|hơn\|đang theo\|về) chính sách(?! (?:riêng tư\|điều phối\|đăng nhập\|nhập tay\|khung giờ\|của Tour Đảo\|hiện hành\|đã))\|^Chính sách\s*$\|\(chính sách đã tắt\)/u` | «cấp đại lý · cấp · Thêm cấp · Đổi cấp · Áp dụng cấp cho loại» |

  (Dấu `\|` trong bảng là `|` của biểu thức.) `nguon` của cả ba: «chủ 2026-10-30 (quyết định 3, 7; hồ sơ `docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/`)».
  - **Cách (a) của QA1 lần 2:** 6c **không** có mục nào khớp mảnh chuỗi trơn `chính sách ` (bộ quét `chuoiTrongMa` cắt chuỗi mẫu ở `${`, nên chi tiết nhật ký `index.ts:129` và `:535` ra đúng mảnh «chính sách »). Hai dòng đó được giữ theo quyết định 8 mà không cần ngoại lệ có tên.
  - **Đã chạy thử trên mã 30/10** (kịch bản tạm, dùng chính `chuoiTrongMa`): ba mục bắt 112 chuỗi, tất cả ở các tệp hoa hồng (`web/hoa-hong*.ts`, `web/parties.ts`, `src/shared/hoa-hong-hien-thi.ts`, `audit-actions.ts`, `huong-dan-ke-toan.ts`, `so-dai-ly-nhap.ts`, `pricing/index.ts`, `pricing/rules.ts`). Không chuỗi nào của chính sách riêng tư, điều phối, đăng nhập, huỷ, phiên bị bắt. Đó là danh sách việc của phần 1: sau khi đổi chữ, số bắt phải về 0.
  - **Ca kiểm âm** (thêm vào `src/bang-tu-giao-dien.test.ts`, đỏ nếu bất kỳ mục nào của lượt 6 khớp): «chính sách » (mảnh của `index.ts:129` và `:535`, ghim cả hai bằng cách đọc thật hai dòng đó qua `chuoiTrongMa` và đòi không mục nào khớp), «chính sách riêng tư», «Theo chính sách của Tour Đảo, tiền cọc không được hoàn lại khi khách huỷ.», «Chính sách vừa được người khác đổi — tải lại.», «Vừa có người đổi chính sách, tải lại rồi thử lại.», «Vừa có phiên bản chính sách khác được đăng. Tải lại rồi thử lại.», «Lưu chính sách», «Chính sách điều phối». Ca dương: mỗi mục một câu cũ của §6.1 phải khớp.
  - **Viết lại `thay` của lượt 3** cho khỏi chỉ về chữ đã loại: dòng 37 → «Cấp đại lý (cấp <tên>, cấp riêng)»; dòng 39 → «Ngừng · Áp dụng cấp cho loại · Ngừng áp dụng · Đang áp dụng · Sắp áp dụng · Đã ngừng» (khớp Q-12); dòng 53 → «cấp riêng».
- `src/shared/hoa-hong-hien-thi.ts` và `web/*.ts`: mọi nhãn, câu và `aria-label` của trang Hoa hồng, Danh bạ (`web/parties.ts`), Thử tra, đổi theo cùng luật.

### 6.3 Bài kiểm phải sửa theo (sửa có chủ đích, kể tên trong lần lưu)

- `src/modules/pricing/muc-ta.test.ts` (các ca ghim «Không tìm thấy chính sách», «đã theo một chính sách trong khoảng ngày này», «Chọn loại đối tác và chính sách», «Đã có chính sách với tên này.», «Chính sách này đã tắt»);
- `gan-rieng-route.test.ts` (câu chồng ngày của cấp riêng);
- `doi-chinh-sach.test.ts` («Mức mới giống hệt mức đang gắn.», «Chính sách này đã tắt…», «Lần áp dụng chính sách này…»);
- `src/shared/so-dai-ly-nhap.test.ts`, `src/shared/audit-actions.test.ts`, `src/shared/hoa-hong-hien-thi.test.ts`;
- `src/shared/huong-dan.test.ts` (A2: mọi `[[Tên nút]]` của hướng dẫn phải còn nguyên chuỗi trong mã giao diện);
- `src/bang-tu-giao-dien.test.ts` (thêm ca kiểm âm và ca dương của lượt 6, §6.2); `tests/e2e/sua-muc.mjs` (chữ trong `console.log` và nhãn kiểm, nếu đổi);
- kịch bản `hoa-hong-smoke.mjs`, `t2b-danh-ba-smoke.mjs`, `dot-a-smoke.mjs`;
- tệp sinh `src/shared/so-do-trang.ts`, `src/muc-giao-dien-hien-trang.json`: **sinh lại** bằng lệnh của chúng, không sửa tay.

Trước khi đổi một câu, grep nguyên câu trên `src/`, `tests/`, `docs/evidence/*/kich-ban/` để bắt bài ghim chưa có trong danh sách này.

## 7. Quyền

Không đổi. Xem = `partner.commission.view` (Bán hàng, Kế toán, Quản trị, Toàn quyền). Ghi = `partner.commission.write` (Kế toán, Quản trị, Toàn quyền). Tài khoản mang quyền Đối tác không vào (`holdsPartner`). Ẩn hay hiện bằng `can()`, nút Sửa bằng `coQuyenSua`; máy chủ luôn kiểm lại. Route của phần 2 dùng đúng cổng này (ADR-0151 Đ2).

## 8. Tiêu chí nghiệm thu (mặc định KHÔNG ĐẠT nếu thiếu bằng chứng)

1. **Không con số nào do `web/` tự suy.** Ô không có dòng thật ghi «—». Bài thuần mới cạnh `src/shared/hoa-hong-hien-thi.ts` có ca «loại chỉ có dòng nhóm» không ra số «Mọi dịch vụ».
2. **Câu thứ tự áp mức.** Câu §5.3 được ghim nguyên văn. Bài trong `src/modules/pricing/` dựng ba ca bằng `chonMuc` và đối chiếu với thứ tự câu nêu: bậc 10–12 thắng 4–6; có cấp riêng thì 7–9 không được xét (ra `NO_RULE` dù cấp của loại có dòng); hai loại ra hai số ở cùng bậc thì `RULE_CONFLICT`. Sửa cố ý → đỏ → hoàn nguyên.
3. **Luật phủ mức.** Bài thuần ra đúng **từng** kết quả và số dịch vụ thiếu của bảng §4.4 (L1–L14, T1–T6, hai ca `CHUA_KIEM`). Dải đếm 8 loại thiếu (5 `KHONG_CO`, 3 `THIEU`) và 1 loại tắt. Câu của dải ghim nguyên văn §5.1, không chứa «mở khoá». Bài đối chiếu với `chonMuc` ở §4.4 xanh, và đã thấy đỏ một lần khi sửa cố ý.
4. **Khoá cấp, tắt loại.** Hộp hỏi lại ra đúng nguyên văn §5.2. Huy hiệu khác tông: cấp khoá `cat`, loại tắt `xam`; loại thiếu mức `do`, `cat`. Trên cấp đang khoá: dòng mức chỉ còn «Ngừng» (không «Đổi», «Sửa» ở cả nút lẫn «⋯»); lần xếp của cấp đó còn «Đổi» sang cấp khác và đổi được thật (200). Kiểm bằng kịch bản Chrome.
5. **Cấp riêng ngay trên trang.** Đặt, sửa, ngừng chạy được. Câu 400/409 của máy chủ hiện nguyên văn, và đã là chữ mới §6.1. Kịch bản Chrome chạy trên D1 tạm. Phần 2, chỉ sau khi ADR-0151 được duyệt: «Đổi cấp» chạy được và tiêu chí của ADR-0151 đạt.
6. **Luật hiện nút có sẵn.** Đổi, Sửa, Ngừng hiện đúng §3.1. `src/shared/hoa-hong-hien-thi.test.ts` xanh mà không sửa ca cũ, trừ các ca chỉ đổi chữ theo §6.
7. **Quyền.** Bán hàng thấy trang, không thấy nút ghi. Đối tác nhận trang 403. Kịch bản Chrome, mở tài khoản đối tác sau cùng.
8. **Khổ màn và bàn phím.** Ở 390 và 1040: `document.documentElement.scrollWidth ≤ innerWidth`; vùng chạm ≥ 44px; axe không lỗi nghiêm trọng. Menu «⋯»:
   - Tab tới nút, Enter mở, tiêu điểm vào khung bảng (hành vi sẵn có của `moBangTruot`: `dialog.focus()`, khung `tabindex="-1"`), Tab tiếp theo tới nút đầu của danh sách; không thêm hành vi tiêu điểm mới;
   - Esc đóng, tiêu điểm về đúng nút «⋯»;
   - `aria-haspopup="dialog"` có mặt;
   - nền phía sau `inert` khi bảng mở.

   Ba thẻ dùng phím mũi tên như `.tab-phu` hiện nay. «Xem dòng ↓» nhảy đúng thẻ cho ba ca của §3.3.
9. **Phạm vi diff.** `git diff main --stat` không chạm `migrations/`, `src/shared/permissions.ts`, `src/shared/contracts.ts`.
   - **Phần 1:** dưới `src/modules/` chỉ có các chuỗi chữ của §6.1 đổi. Người kiểm đọc `git diff main -- src/modules/ ':!*.test.ts'` và xác nhận mọi dòng đổi chỉ khác nhau ở bên trong một chuỗi chữ. Các bài kiểm của §6.3 được đổi theo.
   - **Phần 2:** chỉ chạm đúng các tệp trong **danh sách tệp duy nhất ở ADR-0151 mục «Tệp được chạm»** (máy chủ, giao diện, bài kiểm, tài liệu). Đặc tả không chép lại danh sách đó. Chỉ làm sau khi ADR-0151 chuyển `accepted`.

**Nhật ký thay đổi:** mỗi lần phát hành của phần 1 và phần 2 cần một mục mới ở `src/shared/changelog.ts` (bước A.0 của `docs/HANDOFF-N1.md`). Tệp này được bài bảng từ miễn quét, nên mục cũ giữ chữ lúc phát hành; mục mới viết theo chữ mới.

**Chạy lại:**
- `npm test` · `npm run typecheck` · `npm run build:web` · `npm run test:e2e -- pwa` (quét token CSS) · `npm run test:e2e -- sua-muc`;
- `hoa-hong-smoke.mjs` (`docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/`, sửa có chủ đích, kể tên từng bước đổi) · `a2-smoke-form.mjs` · `t2b-danh-ba-smoke.mjs` · `dot-a-smoke.mjs`;
- bài Hướng dẫn và Trợ lý; cổng phát hành: bộ đo Chặng 1 trước và sau, chủ duyệt.

Việc có đổi câu ở máy chủ (phần 1) và route mới (phần 2) đều chạm tiền hoặc chữ tiền, nên mỗi phần phải có **người kiểm độc lập chỉ đọc** trước khi báo đạt.

## 9. Gộp với đợt 0b khi mở lại (quyết định 4; QA1 điểm 5)

Đo ngày 30/10: nhánh `dot-0b-khung-tai` không chạm `web/hoa-hong*.ts` hay `src/shared/hoa-hong-hien-thi.ts`. Trang này thi công trên `main` ngay. Ai gộp **sau** (0b hay trang này) làm các bước sau:

1. **Chuyển tệp HTML.** 0b đổi `public/hoa-hong.html` thành `web/html/hoa-hong.html` (bỏ phần `<head>`, thêm `data-khung="co"`). Phần thân đã viết lại nên máy khó nhận ra đây là đổi tên. Chép tay phần thân mới (khoảng 26 dòng) vào `web/html/hoa-hong.html`, rồi xoá `public/hoa-hong.html`.
2. **`public/app.css`.** 0b đổi 49 dòng bộ chọn khung sang `body:is(.has-sidebar, [data-khung="co"])`. Kiểm khối `.hh-*` mới không dựa vào `body.has-sidebar` trần. Các lớp `.nut`, `.tab-phu`, `.bang` không đổi.
3. **Dựng.** `build:web` được thay bằng `scripts/dung-web.mjs`. Trang này không thêm điểm vào mới nên không phải khai gì. Nếu có thêm điểm vào thì khai ở đó.
4. **Tệp sinh.** Sinh lại `src/shared/so-do-trang.ts` và `src/muc-giao-dien-hien-trang.json`, vì tên thẻ và tên nút đã đổi.
5. **Khung xương.** Xem lại khuôn `bang-dieu-khien` mà `src/shared/khuon-trang.ts` của 0b gán cho `/hoa-hong`, cho khớp dải cảnh báo, Tra nhanh và ba thẻ.
6. **Cỡ gói.** Đo lại cỡ gói của `hoa-hong` theo trần của 0b.
7. **Bằng chứng bố cục.** Chạy lại tiêu chí 8 và bộ đo Chặng 1 **sau** khi 0b vào `main`, vì 0b đổi khung.

## 10. Ghi lệch (không sửa hồ sơ đã đóng băng)

- **ADR-0077: tóm tắt lệch điều 9** (QA1 điểm 7). «Tóm tắt cho chủ» mục 4 viết đơn thiếu mức bị giữ «cho tới khi Kế toán **cài mức** hoặc ghi mức tay». Ví dụ A-4 cũng viết «Kế toán cài mức hoặc ghi mức tay». Nhưng điều 9 không có ca «chụp lại khi bảng mức đổi», và mã cũng vậy: chụp bù trả 409 khi đơn đã có bản chụp (`orders/index.ts:957`). Tức là **cài mức không thả đơn đã xác nhận**; chỉ «Ghi mức tay» thả được. Mã đúng theo điều 9. Chủ có thể đã hiểu theo câu tóm tắt, nên câu ở §5.1 nói thẳng điều này. Việc kèm theo: thêm một dòng vào sổ lệch `docs/SYSTEM-DESIGN.md` §16 (tài liệu sống) ở việc đầu của kế hoạch. ADR-0077 không sửa.
- **N-23** (§1.1): `contracts.ts` (chú thích `MucTaDto`) còn ghi «giả định kế hoạch, N-23». Tiêu chí 9 cấm chạm `contracts.ts` nên để nguyên. Sẽ sửa chú thích ở lần chạm `contracts.ts` hợp lệ kế tiếp.
- **Hướng dẫn Kế toán dòng 228** lệch ADR-0141 (§6.2): sửa trong phần 1.
- **Lệch có tên «câu `kiemDoi` cho cấp riêng»** (quyết định 9; QA1 lần 2 điểm 8). `kiemDoi` và `kiemSua` nói «mức» cho cả dòng mức lẫn lần xếp, và route «Đổi cấp» của phần 2 dùng nguyên `kiemDoi`, không thêm tham số. Hai câu còn **chỉ sai đường** cho cấp riêng:
  - `rules.ts:335`: «Dòng này đã có ngày ngừng nên không đổi được. Thêm mức mới bắt đầu sau ngày ngừng.»;
  - `rules.ts:338` (QA1 ghi `:339`, câu nằm ở `:338`): «Mức cũ bắt đầu từ … nên không đổi được từ ngày …. Dùng Ngừng cho mức cũ, rồi Thêm mức mới.»

  Cấp riêng không có việc «Thêm mức»; việc đúng là «Sửa», hoặc «Ngừng» rồi «Đặt cấp riêng». Bản 3 ghi đây là lệch có tên, không đặt cách lách. Trên giao diện, hai câu này khó gặp: nút «Đổi cấp» chỉ hiện cho cấp riêng chưa có ngày ngừng (`nutDoiNgung`), và ô ngày chặn ngày sớm hơn `ngayDoiSomNhat`. Người dùng chỉ thấy chúng khi có người khác vừa đổi dòng cũ, hoặc khi gọi thẳng API. Bài kiểm của ADR-0151 ghim nguyên văn các câu này để lệch không đổi lặng lẽ.
- **Chụp số bản vẽ:** «mẫu bản vẽ đếm 7 nhóm» (DOI-CHIEU T4) chưa kiểm, không dùng làm số mong đợi.

## 11. Phụ thuộc và rủi ro

- Đợt 0b đang tạm dừng: xem §9.
- Bàn giao 29/10 «tái cấu trúc toàn diện» còn treo câu hỏi với chủ. Trang này là bản thử đầu tiên, không mở rộng sang trang khác.
- **Rủi ro lớn nhất:** chữ trên trang hứa hành vi tiền mà máy không có (khoá cấp mà vẫn chi; xếp cấp mà đơn cũ vẫn bị giữ; ô xám tự suy mức; dải nói «đủ mức» khi chỉ có một dòng). Khi đó Kế toán quyết sai. Tiêu chí 1–4 canh chỗ này, và bài đối chiếu `chonMuc` canh luật phủ khỏi lệch máy chủ về sau.
- Luật phủ đọc nhóm dịch vụ từ `/api/catalog`, nên dịch vụ của nhóm đang tắt bị coi là chưa phân loại (§4.1). Hậu quả là cảnh báo thừa. Ngược lại, dịch vụ đã ẩn không nằm trong S nên đơn cũ có dịch vụ ẩn có thể bị giữ mà dải không báo (§4.1, lệch thứ hai). Muốn khớp hẳn thì cần máy chủ trả nhóm hiện hành thật cho trang này; đó là việc riêng, không làm ở đây.
- Luật phủ chỉ trả lời cho đối tác **chỉ mang một loại**. Đối tác mang nhiều loại có thể được phủ nhờ loại khác, hoặc bị xung đột. Câu §5.1 nói đúng giới hạn này, còn ca thật thì đi qua Tra nhanh.

## 12. Câu đã chốt sau bản 2 (không còn câu chờ chủ)

Ba câu của §12 bản 2 đã có trả lời ở `QUYET-DINH-CHU-2026-10-30-LAN-3.md`, chủ chọn phương án khuyến nghị cho cả ba:
- **Quyết định 7:** nhãn nút của cấp là «Khoá cấp» / «Mở lại cấp», huy hiệu «Đã khoá — vẫn áp cho loại và đối tác đang theo» (§5.2). Đây là tên mới thứ ba của lượt chữ mới (lượt 6 của bảng từ, §6.2), vẫn trong trần ba tên.
- **Quyết định 8:** chi tiết nhật ký giữ khuôn cũ; chỉ nhãn hành động ở `audit-actions.ts` đổi chữ (§6.1, §6.2).
- **Quyết định 9:** không đụng `kiemDoi`, không thêm tham số; câu «Mức…» là lệch có tên (§10).
