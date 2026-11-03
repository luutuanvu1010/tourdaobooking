# ADR-0160 — Ba khung đối chiếu trong CLAUDE.md và cách tổ chức lại CLAUDE.md

- **Trạng thái:** proposed. Chủ dự án đã ra lệnh làm; bản chữ này chờ chủ đọc và nhập. Nhập vào bản chính là duyệt. AI không tự duyệt (Hiến pháp N3, N9).
- **Ngày:** 2026-11-03   **Người phê chuẩn:** chủ dự án (chưa)
- **Loại quyết định:** cửa hai chiều. Chỉ đổi chỉ dẫn, tài liệu và bài kiểm; không đổi dữ liệu, quyền, tiền của Nền tảng. Hoàn tác bằng một lần lưu đảo.
- **Áp Hiến chương:** 6.1, 6.2. Không lệch điều nào.
- **Sửa / bổ sung:** không sửa ADR nào. Không đổi `docs/ARCHITECTURE.md`, `playbook/`. Danh sách gói gửi của ADR-0145 Đ3 giữ nguyên.
- **Trang ghép:** không cần. Lượt duyệt này một quyết định, không chạm bảng dữ liệu hay ô quyền nào.
- **Nguồn thi công:** `docs/superpowers/specs/2026-11-03-viet-lai-claude-md-ba-khung.md`, đi sau `docs/superpowers/specs/2026-11-03-rut-gon-claude-md.md`.

## Bối cảnh

Lời chủ, nguyên văn: «Vậy chúng ta phải rà lại để CLAUDE.md chỉ dẫn đúng : mọi thứ phải tuân thủ hiêns pháp (Constitution.md), khung thực thi Gorvenance.md và kiến trúc thiết kế arichitecture.md; và khung xây dựng phải đảm bảo Framework.md, Giữ đúng triết lý của Oracel và mwg». Tiếp đó: «tham chiếu đó cần được AI cân nhắc và coi như là điều kiện, tiêu chí để ra những lời khuyên hoặc phân tích». Cuối cùng: «Hãy dùng triết lý Oracle, 18 kernel, 5 trụ cột của MWG trở thành các ràng buộc và tham chiếu cụ thể được chỉ dẫn trong CLAUDE.md , sau đó bắt đầu tiến hành tái cấu trúc và viết lại CLAUDE.md».

Những điều đang ép quyết định này:

1. **Oracle** đã được theo có chủ ý (ADR-0001, ADR-0003, ADR-0010, ADR-0018, Hiến chương Điều 1). **Kernel 18** được khai hồi cứu ngày 2026-10-05, tờ khai chưa có người duyệt. **MWG** mới chỉ trùng ý, văn bản nằm ngoài kho. Chưa có chỉ dẫn nào buộc AI cân nhắc ba khung khi khuyên hay soạn ADR.
2. **KERNEL-18 v1.0.0 đặt giới hạn:** «Luật phiên (`CLAUDE.md`) của mỗi dự án chỉ thêm một dòng chỉ đường tới văn bản này, không chép nội dung.» Về tên gọi: bản nháp v0.3 tự định nghĩa 18 thành phần theo bản chưng cất Oracle; bản chốt lấy 16 khái niệm của Hiến chương hệ thống cộng 2 dòng ngoài lõi. Nên «18 kernel của Oracle» đúng về nguồn gốc bản nháp, không đúng với bản đang dùng.
3. **Hiến pháp Điều 3.1** chốt chuỗi ưu tiên; Governance 1.3 cấm vá ở đáy, 10.1 mỗi loại quy tắc một nguồn. `CLAUDE.md` không được thành bộ luật song song.
4. **Cỡ:** `CLAUDE.md` gốc 30.638 byte, FRAMEWORK §4.6 đòi dưới 600 từ và dưới 4 KB, tài liệu Anthropic nói tệp dài làm giảm tuân thủ.
5. **Hook, trợ lý con, kịch bản, tài liệu** trỏ vào `CLAUDE.md` theo số mục, nên không được đánh số lại.

## Quyết định

**Đ1 — Đoạn Đối chiếu là ràng buộc lên việc AI làm.** Mỗi ADR, đặc tả và lời khuyên có chọn lựa chạm dữ liệu, quyền, tiền, luồng hoặc ranh giới phải nói: chiếu theo Oracle thì làm sao, theo MWG thì làm sao (việc về cách làm với AI thì thêm Anthropic), chạm dòng nào của Kernel 18, rồi chọn cách vừa đúng triết lý vừa hợp quy mô Tour Đảo. ADR và đặc tả có mục riêng `## Đối chiếu`; lời khuyên thì gói trong vài câu. Thiếu đoạn này thì đề xuất chưa đủ điều kiện trình chủ. Bản rút ở `CLAUDE.md` §2; bảng đủ và mẫu ở `docs/Ref/tieu-chi-doi-chieu.md`. Không áp cho việc nhỏ không chạm những thứ trên.

**Đ2 — Ba khung là tiêu chí, không phải tầng luật mới.** Chuỗi Hiến pháp Điều 3.1 giữ nguyên. Lệch thì Hiến pháp, Hiến chương đã duyệt, ADR đã duyệt thắng; lệch thật thì nêu cho chủ quyết. Tiêu chí đã trả lời được nguyên tắc không thay việc dừng và hỏi khi chạm dữ liệu, quyền, tiền, hợp đồng (P8). Chỗ lệch đã biết ghi ở `docs/Ref/tieu-chi-doi-chieu.md`.

**Đ3 — Kernel 18 đúng một dòng chỉ đường trong `CLAUDE.md` gốc.** Nghĩa vụ của AI: đề xuất nói rõ chạm dòng nào; làm tờ khai sai thì sửa tờ khai cùng lần lưu. Không chép định nghĩa 18 dòng; không chép máy kiểm của kho luật gốc vào kho này.

**Đ4 — MWG có bản chụp trong kho.** `docs/Ref/MWG-5-tru-cot.md` chép nguyên văn năm trụ cột, hai nguyên tắc bất di bất dịch, điều không sao chép, giới hạn của nguồn; ghi ngày chụp. Lý do: lý do quyết định phải nằm trong Git để người khác tiếp quản được, và đường dẫn ngoài kho không dùng được từ phiên trên web hay gói trợ lý.

**Đ5 — Tổ chức lại `CLAUDE.md`, giữ nguyên số mục §1–§10.** Bẫy theo vùng dời nguyên văn (trừ một số đếm đã cũ) sang `CLAUDE.md` con cạnh mã (`src/modules/auth`, `maintenance`, `parties`, `van-chuyen`, `orders`), mỗi tệp không quá 4 KB, §10 gốc giữ chỉ mục. Hai bẫy đã có ở `src/CLAUDE.md` bỏ khỏi gốc. Giữ ở gốc các bẫy chung và «Số migration» vì hook và `src/CLAUDE.md` trích. Cụ thể từng dòng: mục 3 của đặc tả.

**Đ6 — Ngoại lệ có hạn với mức 4 KB của FRAMEWORK §4.6.** Không xuống 4 KB được mà không mất luật an toàn hoặc đẩy chúng vào tài liệu AI không chắc đọc. Theo Governance 7.1, ghi theo mẫu Hiến pháp 5.8:

```yaml
exception_id: EXC-2026-002
dieu_khoan_bi_be: "FRAMEWORK §4.6: CLAUDE.md dưới 600 từ, dưới 4 KB (không phải điều cấm)"
ly_do_song_con: "Không phải sống còn. Cắt tới 4 KB phải bỏ điều cấm §8, vai AI §3 hoặc đẩy chúng ra tài liệu chỉ có hiệu lực khi phiên chịu mở"
pham_vi: "CLAUDE.md gốc của tourdao-sales; trần byte do src/claude-md-gioi-han.test.ts giữ, chỉ được hạ"
han_tra: "2027-02-03"
nguoi_duyet: "chủ dự án (chờ duyệt cùng ADR này)"
cach_tra_no: "Tới hạn, xem lại: nén tiếp §3, §8, §9, hoặc đặt ngưỡng mới cho dự án production bằng ADR mới"
dieu_kien_dong: "Lần nâng ghim bỏ FRAMEWORK.md và kho luật gốc có ngưỡng khác, hoặc chủ đặt ngưỡng mới, hoặc cỡ tệp đạt ngưỡng"
trang_thai: "open"
```

Hạn này không có máy canh, dựa vào kỷ luật; mục nhắc ở `docs/BACKLOG.md` mục 62. FRAMEWORK §4.6 còn bảo nạp chi tiết bằng dòng nhập `@`; dự án không theo vế đó vì nhập bằng `@` không giảm ngữ cảnh (`CLAUDE.md` §6).

**Đ7 — Hàng rào máy.** `src/claude-md-gioi-han.test.ts` thêm: giữ số mục và cụm chữ được trích; neo ba khung và bốn văn bản nền ở §2; Kernel 18 đúng một lần; mọi điều luật, ADR, nguyên lý, trụ cột được trích có thật; tệp con trong trần, được §10 trỏ tới, nằm trong gói trợ lý trên mây; luật `ask` cho tệp con. Mỗi hàng rào đã thấy đỏ thật, ghi ở `docs/SO-HANG-RAO.md`.

## Lý do

Chủ cần AI cân nhắc ba khung khi khuyên, không cần thêm một bộ luật. Biến nó thành nghĩa vụ lên đầu ra của AI thì đáp được lệnh chủ mà không phá Điều 3.1 hay KERNEL-18. Mỗi tiêu chí trỏ về điều luật đang có, nên chỗ nào đã có luật thì không sinh luật thứ hai, chỗ chưa có luật thì ghi thẳng «chưa phải luật». Giữ số mục để không gãy hàng trăm chỗ trỏ.

Hai chỗ AI tự chọn, chủ đọc và nhập ADR này là đồng ý, muốn khác thì sửa một dòng ở `CLAUDE.md` §2:

- **Anthropic chỉ nêu khi việc là cách làm với AI.** Lời chủ có câu «Oracle và hoặc Anthropic và MWG», rồi các lệnh sau chỉ còn Oracle, MWG, Kernel 18. Anthropic không có lời nào cho dữ liệu, quyền, tiền, nên bắt nêu ở mọi quyết định chỉ thêm chữ, không chặn lỗi nào.
- **Câu «thêm thành phần hay thủ tục thì nên chỉ ra lỗi thật nó chặn» không phải của MWG.** MWG chỉ nói không sao chép quy mô. Câu này rút từ lời chủ 2026-10-05 («đi sâu vào giải quyết thủ tục hành chính, luật lệ đồ sộ»), nên để ở mức «nên» và ghi chưa phải luật. Tương tự, «quy trình bằng văn bản trước» và «lõi tự xây, phổ thông thì mua» mới là ý của MWG T4, Hiến chương chưa có điều nào; HC 5.13 chỉ nói thứ tự xây.

## Phương án bị loại

- **Thêm tầng «Oracle, MWG» vào chuỗi ưu tiên:** trái Điều 3.1; hai nguồn lại lệch Hiến chương ở Flexfields (HC 5.2) và sự kiện (HC 4.1), thành hai chuỗi cãi nhau.
- **Chép 18 dòng Kernel và sáu nguyên lý Oracle vào `CLAUDE.md`:** trái KERNEL-18, tệp đã quá dài, sự thật có hai bản.
- **Chỉ một dòng trỏ, không có bản rút:** tài liệu thường chỉ được đọc nếu AI chịu mở, lệnh chủ «ràng buộc cụ thể» sẽ rỗng.
- **Đánh số lại theo hai nửa của Framework:** gãy hook và hàng trăm chỗ trỏ; dòng chỉ mục ở đầu tệp đạt cùng mục đích.
- **`.claude/rules/` có `paths:`** (khuyến nghị cũ ở Q2): gói trợ lý trên mây không chứa `.claude/` (ADR-0145 Đ3, bài `src/goi-ma-tro-ly-may.test.ts`), bẫy dời vào đó sẽ biến mất với trợ lý đó, còn tệp con trong `src/` vẫn được gửi. Đổi lại, tệp con chỉ nạp theo một thư mục; §10 gốc giữ chỉ mục để bù.
- **Ép xuống 19 KB ngay:** phải nén chữ luật, rủi ro đổi nghĩa.
- **Chép máy kiểm Kernel 18 vào kho:** hai bản của một công cụ; chạy một lần từ kho gốc rồi ghi kết quả là đủ tới lần nâng ghim.

## Hệ quả

- ADR và đặc tả mới có thêm mục `## Đối chiếu`. **Chưa có máy chặn ADR thiếu mục này, dựa vào kỷ luật và người kiểm độc lập.** Sau khi ADR này được duyệt, thêm bài đỏ cho ADR số lớn hơn 0160 thiếu mục (`docs/BACKLOG.md` mục 62). Chưa làm ngay vì nó đổi quy trình của mọi ADR sau và có thể làm đỏ nhánh đang chạy song song.
- `CLAUDE.md` vẫn là lời khuyên (`RANG_BUOC_NGOAI.md` A1). Khối ba khung chỉ có sức ép khi đọc; bài kiểm chỉ giữ neo và trích dẫn, không giữ chất lượng lập luận.
- Bẫy theo vùng không tự tới khi tìm rộng bằng `grep -r`; các lệnh shell khác và phiên trên web chưa thử (`RANG_BUOC_NGOAI.md` A4). Vì vậy đầu `CLAUDE.md` giữ lời dặn cũ: làm bằng lệnh shell thì tự mở tệp.
- **Tờ khai Kernel 18 chưa qua máy kiểm:** chạy `kiem-kernel-18.mjs` của kho luật gốc ngày 2026-11-03 cho KHÔNG ĐẠT, hai lỗi quá hạn 31/10 ở dòng 12, 13. Dòng 13 chép lệch ngày của `docs/quyen-hoan.json` (HC-4.2 đã gia hạn tới 30/11) nên đã bỏ ngày chép lại. Dòng 12 (`PH-TDS-01`) quá hạn thật, chờ chủ quyết: làm hay gia hạn có lý do. Tờ khai vẫn chưa có người duyệt.
- Bước hỏi tệp luật thêm một dòng `ask` cho tệp con.

## Đối chiếu

- **Theo Oracle:** luật đặt gần nơi thi hành (Oracle 3) gợi ý đặt bẫy cạnh mã của vùng đó; không có khuyến nghị về tài liệu cho AI.
- **Theo MWG:** quy tắc sống trong hệ thống, không trong trí nhớ (T3): bài kiểm thay lời dặn. Mỗi sự thật một nơi (T2): mỗi bẫy một nơi. Từng bước (T4): đợt này chưa ép nén chữ luật. Ranh giới rõ (T5): bẫy nằm ở vùng của nó. Không sao chép quy mô: không dựng máy nhắc hạn, không mở sổ mới.
- **Theo Anthropic:** giữ tệp ngắn; đưa chi tiết theo vùng ra tệp nạp đúng lúc; giữ ở tệp chính những chỗ đã phải sửa hai lần; `CLAUDE.md` là ngữ cảnh, muốn chắc phải có hook hay bài kiểm. Anthropic không có khuyến nghị đưa triết lý vào `CLAUDE.md`, nên khối này giữ ngắn và là chỗ lệch nhẹ có chủ ý theo lệnh chủ.
- **Kernel 18:** không chạm thành phần nào của Nền tảng. Sửa tờ khai dòng 13 cho khớp sổ.
- **Chọn:** khối ngắn cộng bảng đủ, giữ số mục, tệp con, ngoại lệ có hạn: đúng ý cả bốn nguồn ở phần chính, lệch 4 KB của Framework có ghi và có hạn.
