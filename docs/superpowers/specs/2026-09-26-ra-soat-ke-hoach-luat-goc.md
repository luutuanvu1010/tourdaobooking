# Rà soát kế hoạch luật gốc (Hiến pháp · Hiến chương · Mô hình dữ liệu lõi) và cơ cấu toàn thư mục Projects/ theo khung Enterprise OS và triết lý lõi Oracle

- **Ngày:** 2026-09-26 (tối). **Vai:** phiên điều phối tourdao-sales tổng hợp; ba người rà **độc lập, chỉ đọc**, mỗi người một chuẩn/mảng (Phụ lục A, B, C). **Bản tổng hợp này chưa có người kiểm độc lập.**
- **Đối tượng chấm:** gói đóng băng của kho luật gốc `Master-Project-Framework`, nhánh `worktree-hop-nhat-luat-goc` (2ba37b2), thư mục `specs/inbox/phat-hanh-v2.0.0/` — Hiến pháp v4.0.0, Hiến chương hệ thống v1.0.0, Mô hình dữ liệu lõi v1.0.0, `POLICY_HIERARCHY.md`, `CLAUDE.md`, `CHANGELOG-doan-them.md`, `NGAY-CHOT.md`. Chủ đã "duyệt tạm toàn bộ" 2026-09-26; gói **tự thành chốt 2026-10-03** nếu chủ không rút/sửa trước ngày đó (`NGAY-CHOT.md`). Đổi chữ một nguyên tắc/điều cấm = đề xuất mới, đồng hồ 7 ngày riêng (phiếu quyết định §4).
- **Hai chuẩn (chủ nêu):** `CHUNGCATKIENTHUC/ENTERPRISE_FRAMEWORK.md` (EOS, 140 dòng); `CHUNGCATKIENTHUC/hien-chuong-kien-truc-erp-Oracle.md` (OR, 117 dòng). **Không** so thư mục `CHUNGCATKIENTHUC/Hien chuong Enterprise OS/`.
- **Viết tắt:** HP = Hiến pháp (CONSTITUTION.md), HC = Hiến chương hệ thống, MH = Mô hình dữ liệu lõi, PH = POLICY_HIERARCHY.md, NC = NGAY-CHOT.md, PP = `2026-09-26-phan-phoi-ban-chi-doc.md`, DT-HC = dự thảo Hiến chương, TĐ = `tourdao-sales/docs/ARCHITECTURE.md`. Loại sửa: (a) không cần; (b) sửa trước 3/10 không đổi chữ nguyên tắc; (c) đổi chữ nguyên tắc → đồng hồ 7 ngày riêng; (d) việc sau tag (kế hoạch phân phối/dự án), không chặn ngày chốt.

## 1. Kết luận

1. **Đúng hướng cả hai chuẩn, không chỗ nào "Trái".**
   - Oracle (Phụ lục A): 42 điểm — 26 Đủ, 9 lệch có chủ ý chủ đã duyệt (QĐ C01, C03, C04, C05, C14, M02), 4 lệch mới (3 vấn đề), 3 thiếu, 0 Trái; không phát hiện nào là cửa một chiều ở mức chữ luật.
   - EOS phần luật (Phụ lục B): 18 điểm — 13 Đủ, 1 Thiếu, 4 Lệch (3 gốc), 0 Trái; năm bản chất bất biến của hệ ghi nhận chính thức (SoR) có đủ điều ở HC và được **khoanh đúng** cho dự án có dữ liệu nghiệp vụ/tiền (không áp website giới thiệu).
   - Cơ cấu đích (Phụ lục C): đúng tinh thần — một kho luật, một tag, bản ghim có băm + rào máy, tầng dưới chỉ siết (HP 3.1, 9.7), Hiến chương chỉ áp dự án thuộc phạm vi.
2. **Không phát hiện nào buộc rút gói trước 3/10.**
3. **Có hai cặp văn bản đã duyệt nói ngược nhau** — chỉ chủ phân xử (`CLAUDE.md` §2: không tự hoà giải) — **và cả hai có hạn trước 3/10** (mục 2, Q1–Q2).
4. **Phần chuyển tiếp thiếu mốc:** sau 3/10 còn bốn dòng Hiến pháp (v2.2.0, v2.3.0, v3.1.0, v4.0.0) và hai văn bản cùng tên "Hiến chương" sống song song; kế hoạch chỉ có đúng một ngày (2026-10-03); gắn tag, phiên hợp nhất luật thực thi (P06), lời khai P08, nâng ghim từng nhóm, `Projects/CLAUDE.md` (P07) đều không ngày.

## 2. Cần chủ quyết

### Q1 — trước 3/10: thứ tự gắn tag, gộp với điều 5.11 (một lựa chọn)
- **Mâu thuẫn thứ tự** (hội tụ: người rà EOS "X1" + người rà cơ cấu "phát hiện 1"): PP:12 và PP:172–174 đặt **hợp nhất luật thực thi trước, rồi tag**; NC:50–62 **tag ngay** sau khi gộp PR #1 (tự nhận theo PP mục 5 nhưng đảo bước 3 và 4); phiếu:140 tag trước cả PR. `git diff --stat main -- GOVERNANCE.md PLAYBOOK.md governance/ ai/ templates/` rỗng ⇒ tag v2.0.0 chở nguyên luật thực thi cũ: GOVERNANCE 1.2:14 (thiếu hai tầng mới), **GOVERNANCE 3.4:69–73 còn P8 cũ — bỏ đúng phần nới H29**, GOVERNANCE 10.1:166 (thiếu HC, MH trong khi `CLAUDE.md` của gói dòng 20 trỏ về đó), PLAYBOOK:86 ("symlink"). Core, tourdao-sales, pt-hdv không ghim v2.0.0 được mà không mất cổng QA (PP:12, P06). Tag là một chiều (NC:58).
- **Điều 5.11** (hội tụ: người rà Oracle "#1" + người rà EOS "gốc A"): HC 5.11 dòng 94 "…và **không tự chạy lệnh ghi lên hệ thống thật**". Đọc theo MH (MH:42: tác nhân tự động = định danh dịch vụ) ⇒ tác vụ định kỳ, hộp thư đi không được tự ghi — trái HC 1.2, HC 5.16, OR:109 (vai tác nhân điều phối), EOS II.4. Đọc theo nguồn (TĐ trỏ `CLAUDE.md` §8 — luật cho AI lập trình) ⇒ AI trong ứng dụng ghi tiền qua lệnh không cần người duyệt (HC 5.15, MH:55) — thiếu vế "người dùng duyệt" EOS II.3/VI.4. Sửa sau tag = nới luật (HP 3.2, 9.4); dự án siết được vế AI (9.7) nhưng **không nới được** vế tác vụ nền — chỉ có đường "lệch có chủ ý" (HC 6.2).
- **Khuyến nghị A:** vẫn chốt 3/10 như đã duyệt và gắn tag v2.0.0, nhưng ghi rõ **không dự án nào ghim v2.0.0**; tag đầu tiên được ghim là **v2.1.0**, sau (i) phiên hợp nhất luật thực thi (đặt **ngày**) và (ii) gói sửa nguyên tắc mục 3 (5.11, 4.2/5.10, 5.12, 5.16, 5.17, sổ phụ → sổ cái, dự án nào giữ bản gốc…). Phiên kho luật soạn các đề xuất đó **ngay** thành tệp mới, không đụng gói đóng băng ⇒ đồng hồ 7 ngày chạy song song. Không dự án nào phải sống dưới câu 5.11 sai. Không đổi chữ nguyên tắc nào của gói ⇒ loại (b).
  - **Cái giá:** ketoanvn — đang chờ bảy điểm nới H28–H34 cho "Đợt 3" tăng tốc (hop-nhat:43; H27 = A) — và vatengine (chưa có bản ghim) phải chờ tới v2.1.0 (ước tính 1–2 tuần, **chưa kiểm**). tourdao-sales, tourdaovn vốn bị H12 chặn; Core, pt-hdv vốn cần luật thực thi hợp nhất.
- **B:** gắn tag v2.0.0 và cho riêng ketoanvn ghim ngay, kèm khai "lệch có chủ ý" điều 5.11 cho tác vụ nền (HC 6.2) và kiểm ketoanvn có nạp `playbook/GOVERNANCE` (3.4) không. Không khuyến nghị: sống dưới câu luật đã biết sai.
- **C:** hoãn tag tới sau phiên hợp nhất (đúng PP §5). Tag sạch, nhưng luật có hiệu lực từ 3/10 mà chưa có tag.
- **Nếu không chọn A:** phải quyết 5.11 **trước 3/10** (rút vế cuối; câu mới chạy đồng hồ riêng).

### Q2 — trước 3/10: Hiến chương nào chi phối Tour Đảo trong khoảng giữ ghim cũ (người rà cơ cấu 3.2–3.3)
- TĐ dòng "Trạng thái" (dòng 15, đã kiểm lại 2026-09-26; **câu này do chính phiên điều phối viết** khi soạn Hiến chương 25–26/9): "…khi kho đó có điều tương ứng, điều ở đây rút thành 'theo … điều X'" — kích hoạt khi kho có điều (ngày chốt 3/10). ↔ PP:156 + H12: rút gọn ở **lần nâng ghim** (không mốc).
- Một phiên làm theo dòng 15 sẽ: thay điều bằng tham chiếu tới văn bản **không có trong repo** (phiên cloud không thấy), **ngoài thứ bậc** v2.3.0 đang ghim (`playbook/CONSTITUTION.md`:50 không có tầng Hiến chương hay ràng buộc bên ngoài), và **nới** luật Tour Đảo ở 4.4 (C13 — phiếu:92 tự ghi "là nới so với TĐ") và một vế 4.2 (C14).
- **Khuyến nghị — sửa đúng câu đó, theo đường sửa của chính Phần I** (TĐ 6.4: chỉ chủ dự án duyệt, AI đề xuất bằng diff). Một ADR **không đủ**: Phần I đứng trên mọi ADR (đầu tệp TĐ; `CLAUDE.md` §2), nên ADR không vô hiệu được một câu kích hoạt nằm ở tầng trên. Câu đề xuất (nháp, thay vế cuối của dòng "Trạng thái"): "…điều ở đây chỉ rút thành 'theo … điều X' **trong chính commit nâng ghim** lên bản kho luật chứa điều đó (chủ duyệt); **tới lúc đó Phần I chi phối Tour Đảo**, và chữ chặt hơn của Tour Đảo (4.2, 4.4, 5.9) được giữ làm lớp siết (Hiến pháp 9.7)". Chủ duyệt **trước 3/10**; AI soạn diff khi chủ đồng ý; là luật ⇒ có người kiểm độc lập. Đi cùng đề xuất đó (hoặc một ADR kèm theo, số kiểm trên mọi nhánh — ADR-0030/0031 đã được đặc tả "đơn tự do" giữ chỗ): ghi nợ M01 (khoảng đóng ADR-0003 ↔ nửa mở MH:16; HC 5.2 "không chồng nhau" lệch một ngày ở biên); ADR-0026 (sổ tiền, proposed) nói rõ theo 4.2 bản nào.
- Việc cùng lần nâng ghim (loại d): `RANG_BUOC_NGOAI.md`:10 "Sửa/thêm dòng: được tự do (siết)" trái Điều 2 v4.0.0 (H06a: chủ duyệt từng dòng); đổi tên Phần I (hai văn bản cùng tên, lý do như P09) + sửa `CLAUDE.md`:14–15 (N9); PIN-README "Cách nâng ghim (chỉ khi Core đổi…)".

### Q3 — trước khi duyệt ADR-0026 / lượt 1 Hoàn tất (không chặn 3/10): một công ty, một nơi giữ khách và tiền
- Hội tụ: người rà Oracle "#3" + người rà cơ cấu 3.6(ii). Không điều nào nói dự án nào giữ bản gốc khi nhiều dự án phục vụ cùng một tổ chức (grep "dự án khác|hệ sinh thái|giữa các dự án|vệ tinh" trong gói: chỉ N4 và câu mục đích). OR:6 đòi mọi phân hệ, ứng dụng vệ tinh tuân một hiến chương; kế hoạch tính phạm vi theo **từng dự án tự khai**.
- Tour Đảo có ba dự án: **tourdao-sales** (Booking — đang thiết kế sổ công nợ, ADR-0026 proposed); **tourdaovn** (website có đặt tour, hình thức thanh toán, mã giảm giá, D1 riêng); **pmbh** ("Phần mềm bán hàng mới": hoá đơn, thu chi, **công nợ**, khoá sổ — DT-HC:220; mới có thiết kế + tệp Access).
- Câu hỏi theo từng loại sự thật: khách/đối tác; đơn đặt (Booking hay website); công nợ HDV/đại lý (sổ phụ); hoá đơn, thu chi, khoá sổ (sổ cái).
- **Một phương án (không phải phán quyết):** Booking giữ khách, đơn và sổ công nợ chi tiết (sổ phụ); pmbh giữ hoá đơn, thu chi, khoá sổ (sổ cái), nhận bút toán tổng hợp từ Booking; website chỉ phát lệnh đặt vào Booking. Khớp tầng sổ phụ → sổ cái của Oracle (OR:66) mà gói còn thiếu (V6).
- Nơi ghi: tài liệu kiến trúc của tourdaovn/pmbh (d); nếu chủ muốn thành luật chung ⇒ điều mới v2.1 (c).

### Q4 — không gấp: lối ra của H12
- H12 chặn nâng ghim tourdao-sales, tourdaovn tới khi có môi trường thử giống thật; không ngày, không người (PP:160). H12a (hop-nhat:84): dự án tự khai môi trường thử của mình, chủ duyệt lời khai. tourdaovn có sẵn `deploy:preview` (package.json:21) — chủ xét có đạt không. Không có lối ra thì dự án nguồn của Hiến chương ở v2.3.0 vô hạn — đúng rủi ro "bản ghim cũ sống mãi" P06 tự nêu; tourdaovn (đặt tour, tiền) không Hiến chương nào chi phối trong thời gian đó.

## 3. Gói sửa nguyên tắc cho v2.1.0 (loại c — đồng hồ 7 ngày riêng; soạn ngay nếu chọn Q1 = A)

| Mã | Điều | Vấn đề | Người rà | Giá nếu sai |
|---|---|---|---|---|
| V1 | HC 5.11 | Vế cuối gộp tác nhân dịch vụ với AI (xem Q1). Đề xuất tách: AI lập trình không tự chạy lệnh ghi lên hệ thống thật (luật làm việc); tác vụ nền/hộp thư đi ghi qua lệnh có kiểm quyền; AI trong ứng dụng chỉ đề xuất, người duyệt với thao tác chạm tiền | Oracle + EOS (hội tụ) | đắt |
| V2 | HC 4.2, 5.10 | Đòi bút toán "trong cùng lần ghi với sự kiện" — khác chuỗi OR:81 (Giao dịch → Sự kiện kế toán → Bút toán & sổ cái), không có "sự kiện kế toán"; làm HC 4.3 ("thêm hình chiếu mới từ cùng sự kiện") không làm được cho sự kiện cũ | Oracle | đắt |
| V3 | HC 5.12 | "lý do (khi luật đòi), bản trước và sau (khi có)" nới so OR:113 "mọi giao dịch: Ai, Làm gì, Khi nào, Lý do, Trước/Sau"; không mã QĐ (kế thừa TĐ 5.12) | Oracle | chữ đảo được; vết không ghi thì mất hẳn |
| V4 | HC 5.16 | Thiếu "việc chờ gửi ghi **cùng lần ghi**" (hộp thư đi có giao dịch); MH:121 không có nó trong ranh giới giao dịch | EOS | đảo được |
| V5 | HC 5.17 | Không nói ca sổ vàng **chưa xác nhận** có tính vào cổng nhận mã tiền không (TĐ: ca Tour Đảo đều đang chờ xác nhận) | EOS | đắt |
| V6 | K13, HC 4.2–4.3, MH §5 | Thiếu tầng sổ phụ → sổ cái (OR:66); nên có trước khi ketoanvn, pmbh chiếu Mô hình | Oracle | đảo được |
| V7 | (mới) | Luật "dự án nào giữ bản gốc" khi nhiều dự án một tổ chức (xem Q3) | Oracle + cơ cấu (hội tụ) | đắt |
| V8 | HC (K15) | "Một định nghĩa" cho chỉ số ngoài tiền (OR:70); hiện chỉ HP P6 phủ ở mức nguyên tắc | Oracle | đảo được |
| — | tuỳ | Sổ không có thành phần pháp nhân (MH:89 ↔ OR:36 thuế gắn pháp nhân); khách thuê có mã ở MH §1 nhưng không trong danh sách K1 | Oracle | đảo được |
| — | HP 3.1 | Chuỗi thứ bậc không đặt "luật thực thi dùng chung" dù 8.5, 9.7, 9.8 nhắc (sửa chữ HP ⇒ c) | EOS | đảo được |

## 4. Sửa được trước 3/10, không đổi chữ nguyên tắc (loại b) — 10 mục

1. **C01:** ghi bảng chuyển 9 lớp → 7 lớp vào dòng CHANGELOG của Hiến chương: "Quyết định", "Vận hành" bỏ khỏi chữ; lớp luật/chính sách dời lên trước giao dịch; thêm lớp "lệnh"; lý do ở dự thảo lưu trữ (Phụ lục A dòng 177) không khớp danh sách hình chiếu HC 1.4. [Oracle]
2. **C04:** một câu chú thích CHANGELOG "mở rộng có lược đồ đăng ký không bị 5.2 cấm" (bản sạch dễ đọc thành cấm mọi mở rộng). [Oracle]
3. **"Không áp"** cho 5 website (Core, pt-hdv, nhatrangtravel, Aquanova, vatengine-landing) — HC dòng 4 đòi, PP §4 thiếu. [EOS X3]
4. **Thư mục chưa được nhắc:** AI-Handbook, "Claude designe - tài liệu cho admin", Marketing Banner, ketoanvn-ban-ve-giao-dien, ketoanvn-untracked-2026-09-12, ctytnhhtourdao/mockup + tệp .bundle ⇒ ghi "không phải dự án"; dichvuketoan, Speedmarine (tiêu chí phần mềm booking — nếu làm thì gần chắc "Áp"), Website robot ⇒ chủ xếp loại. [cơ cấu]
5. **P08 sót bốn `playbook/CLAUDE.md`:** pt-hdv (dòng 11 "Core sở hữu bản luật này", trái ADR-0054), Aquanova và nhatrangtravel (giống từng byte CLAUDE.md "repo khuôn", dạy "chỉnh tài liệu luật"), Core. [cơ cấu]
6. **hontamnew trong nội dung P07** (PP:193): "không ghim, không sửa" ⇒ "đợt hợp nhất không chạm tới đây" (tránh hiểu thành cấm sửa mã dự án). [cơ cấu]
7. **CHANGELOG-doan-them:21** sai: dòng v2.3.0 "chấm dứt khi Core nâng ghim" — tourdao-sales, pt-hdv vẫn ở dòng đó. [cơ cấu]
8. **Lời khai phạm vi hai chỗ ở:** HC dòng 4 (tài liệu kiến trúc) ↔ init-project.sh:30 + PP:64 (PIN-README, nằm trong `playbook/` có băm) ⇒ chọn một. [cơ cấu]
9. **PH:** không liệt kê GOVERNANCE.md ở tầng nào; PH:16 áp hạn 30 ngày cho cả tầng 3 gồm PLAYBOOK.md ⇒ đặt mục IV/V của EOS vào PLAYBOOK sẽ tự hết hạn. [EOS]
10. **ketoanvn, vatengine** thiếu việc HC 6.1 và 6.3 (khai phạm vi + bảng thi hành) trong PP §4 (hàng tourdaovn có); ketoanvn ARCHITECTURE.md:3 "đứng dưới PRD.md" — v4.0.0 3.1 không có tầng PRD ⇒ khai PRD thuộc tầng nào khi nâng ghim. [cơ cấu]

## 5. Việc của phiên hợp nhất luật thực thi (P06) — cần một NGÀY

- **9/20 điểm thực hành của EOS thiếu nơi có tên hoặc mốc:** I.1c một lát cắt sâu; IV.1 quản trị ngữ cảnh; IV.2 phân tầng model; IV.3 danh sách chặn lệnh phá huỷ; V.1 nhịp ngày/tuần; V.2 lộ trình 12 tháng; VI.1 tài liệu thay giao hàng; VI.2 bom phạm vi; VI.10 một người là điểm chết. Chỗ tự nhiên: `templates/00-PROJECT_BRIEF` (§3, §5), PLAYBOOK (cẩn thận hạn 30 ngày PH:16). [EOS]
- **Khung dựng dự án** (`templates/`, `init-project.sh`) — hiện không nằm trong phạm vi phiên hợp nhất (NC:62), cần thêm: chỗ cho ràng buộc bên ngoài, `golden/`, từ điển dữ liệu, bảng thi hành, sổ hàng rào; `.claude/` (settings deny `Edit(playbook/**)` + hook — lớp hai P05; cách làm hiện chỉ còn trong archive/, không xuất vào bản ghim); `CLAUDE.md`; CODEOWNERS "* @owner" giữ chỗ (init:52–56) trái PP:148; mẫu 02-SAD thiếu khai phạm vi/bảng thi hành; mẫu 09 dòng 6 không nhắc Hiến chương/Mô hình. [EOS X4 + cơ cấu 3.6(i)]
- **GOVERNANCE** 1.2/3.4/10.1 và **PLAYBOOK** Phần 4 ("symlink"). [EOS X1]

## 6. Trái QĐ đã duyệt — chỉ báo một lần (P18); chủ đã chọn có ý thức

- Oracle: C01 (7 lớp thay 9), C03 (không bắt dựng đủ ba trục tổ chức), C04 (không có trường mở rộng tự do), C05 (không kho sự kiện riêng), C14 (bút toán người lập có chứng từ, người duyệt, nhật ký là nguồn hợp lệ), M02 (tài khoản thương mại tuỳ có).
- EOS: H15 (tác nhân chép nguyên văn Hiến pháp sau khi chủ phê chuẩn; EOS III.1 ghi "chỉ người sửa"); H13 (N5 "chỉ tiến tới" tuyệt đối với dữ liệu đã phát hành, áp cả website — ra ngoài vùng khoanh EOS I.2).
- Không phát hiện nào đòi đảo một QĐ.

## 7. Không kiểm

- Không kiểm mã hay dữ liệu của dự án nào (hạ tầng thật: cô lập khách thuê, hàng đợi, môi trường thử; ketoanvn có nạp `playbook/GOVERNANCE` không).
- Không so thư mục `CHUNGCATKIENTHUC/Hien chuong Enterprise OS/` (chủ nêu hai tệp). Phiếu §5 còn câu "đặc tả hay nguồn luật"; không dự án nào trỏ tới thư mục này ⇒ người rà cơ cấu đề nghị đóng là "không phải nguồn luật" (chủ quyết).
- Người rà cơ cấu bị rào worktree chặn `git -C` vào repo khác (đọc `.git/HEAD`, `refs/tags` thay thế); không kiểm GitHub (CODEOWNERS, bảo vệ nhánh).
- Bản tổng hợp này chưa có người kiểm độc lập.

## 8. Lời dặn cho phiên kho luật (chủ dán, trước 3/10, nếu chọn Q1 = A)

```
Vai: LẬP KẾ HOẠCH (kho luật gốc). Đọc báo cáo rà soát độc lập gói v2.0.0 theo khung Enterprise OS và triết lý lõi Oracle — mở bằng Read theo đường dẫn tuyệt đối:
/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/hien-chuong-kien-truc/docs/superpowers/specs/2026-09-26-ra-soat-ke-hoach-luat-goc.md
(nếu thư mục đó không còn, sau khi tôi gộp nhánh ra-soat-luat-goc: /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/docs/superpowers/specs/2026-09-26-ra-soat-ke-hoach-luat-goc.md).
Tôi (chủ dự án) quyết:
1. Q1 = A: vẫn chốt 2026-10-03 như đã duyệt và gắn tag v2.0.0, nhưng ghi rõ KHÔNG dự án nào ghim v2.0.0; tag đầu tiên được ghim là v2.1.0, sau phiên hợp nhất luật thực thi và gói sửa nguyên tắc. Sửa NGAY-CHOT.md và tệp phân phối cho khớp thứ tự này (không đổi chữ nguyên tắc).
2. Soạn NGAY các đề xuất v2.1 thành tệp MỚI trong specs/inbox/: V1–V8 ở mục 3 của báo cáo — mỗi điểm có câu chữ đề xuất, lý do, giá nếu sai; đồng hồ 7 ngày tính từ ngày ghi. Có người kiểm độc lập chỉ đọc trước khi trình tôi.
   Trong phat-hanh-v2.0.0/: KHÔNG sửa ba văn bản (CONSTITUTION.md, HIEN-CHUONG-HE-THONG.md, MO-HINH-DU-LIEU-LOI.md), POLICY_HIERARCHY.md, CLAUDE.md; CHỈ sửa NGAY-CHOT.md (mục 1) và CHANGELOG-doan-them.md (mục 3).
3. Làm các sửa loại (b) ở mục 4 của báo cáo (CHANGELOG-doan-them.md, tệp phân phối, danh sách dự án); mục nào thật ra đổi chữ nguyên tắc thì chuyển sang đề xuất v2.1, không tự làm.
4. Đề xuất NGÀY cho phiên hợp nhất luật thực thi (P06), phạm vi gồm mục 5 của báo cáo (9 điểm thực hành EOS, khung dựng dự án templates/ + init-project.sh, GOVERNANCE 1.2/3.4/10.1, PLAYBOOK Phần 4).
Không gắn tag, không gộp main, không đẩy main, không sửa dự án khác. Trả lời tôi tiếng Việt có dấu, ngắn, kết luận trước.
```

---

## Phụ lục A — Người rà theo triết lý lõi Oracle (tóm tắt báo cáo gốc)


Chuẩn: CHUNGCATKIENTHUC/hien-chuong-kien-truc-erp-Oracle.md (OR:dòng). Gói: MPF worktree hop-nhat-luat-goc, specs/inbox/phat-hanh-v2.0.0/ (HC = HIEN-CHUONG-HE-THONG.md, MH = MO-HINH-DU-LIEU-LOI.md, HP = CONSTITUTION.md).

### Tổng kết
- 42 dòng, không lấy mẫu: Đủ 26 · Lệch có chủ ý (QĐ đã duyệt) 9 dòng thuộc 6 QĐ (C01, C03, C04, C05, C14, M02) · Lệch mới 4 dòng (3 vấn đề) · Thiếu 3 · Trái 0. Không phát hiện nào là cửa một chiều ở mức chữ luật.
- Triết lý lõi Oracle có đủ trong gói, nhiều chỗ chặt hơn: trạng thái bền, chuyển trạng thái là đơn vị hành vi, bản thể là tài sản, bên trước vai, lệnh → kiểm luật → ghi nguyên khối, bất biến sát dữ liệu, tiền là hình chiếu truy được nguồn, AI qua cổng lệnh, kiểm toán.
- 11 câu "bắt buộc/tuyệt đối/không được" (★): 5 đủ, 3 lệch có chủ ý, 2 lệch mới (OR:110, OR:113), 1 thiếu (OR:6).

### Phát hiện nặng nhất (xếp theo giá nếu sai)
1. **HC 5.11 vế cuối** (dòng 94) "…và không tự chạy lệnh ghi lên hệ thống thật" — đọc sát chữ cấm MỌI tác nhân tự động tự ghi; va HC 1.2 ("tác vụ định kỳ"), MH §8 dòng 122 ("số lần thử"), vai "tác nhân điều phối" OR:109. Nguồn Tour Đảo của 5.11 là CLAUDE.md §8 (luật cho AI làm mã) — mất ngữ cảnh khi khái quát. Giá: ĐẮT (sửa sau tag = nới luật; không vá bằng chú thích CHANGELOG vì là nới trá hình, HP 3.2, 9.4). Loại (c).
2. **HC 4.2 + 5.10** (dòng 62, 92) đòi bút toán "trong cùng lần ghi với sự kiện" — khác chuỗi OR:81 (Transaction → Accounting Event → Journal Entry & GL), không có "sự kiện kế toán"; làm HC 4.3 ("thêm một hình chiếu mới từ cùng sự kiện") không làm được cho sự kiện cũ mà vẫn đúng chữ 4.2. Giá: ĐẮT. Loại (c) v2.1.
3. **Không có luật "dự án nào giữ sự thật"** khi nhiều dự án phục vụ cùng một tổ chức (Phụ lục C dự thảo: tourdao-sales, tourdaovn, pmbh đều "Áp"; pmbh sẽ giữ công nợ). OR:6 "mọi phân hệ, ứng dụng vệ tinh… bắt buộc tuân thủ". Rủi ro theo HP N7. Giá: ĐẮT. (b) khi nâng ghim mỗi dự án khai nơi giữ sự thật; (c) điều mới v2.1. Là CÂU HỎI cho chủ (HP N4 cố ý để dự án độc lập).
4. **HC 5.12** (dòng 96) "lý do (khi luật đòi), bản trước và sau (khi có)" — nới so với OR:113 "mọi giao dịch: Ai, Làm gì, Khi nào, Lý do, Trước/Sau". Không mã QĐ (kế thừa Tour Đảo 5.12). Chữ: đảo được; vết không ghi: mất hẳn. Loại (c) v2.1.
5. **Thiếu tầng sổ phụ → sổ cái** (OR:66; K13, HC 4.2–4.3, MH §5). Đảo được. (c) v2.1 — nên có trước khi ketoanvn/pmbh chiếu Mô hình.

### Thiếu/lệch khác
- OR:70 "mô hình ngữ nghĩa thống nhất trên dữ liệu vận hành và tài chính": HC không có luật "một định nghĩa" cho chỉ số ngoài tiền (chỉ HP P6). Thiếu một phần, đảo được, (c) v2.1.
- OR:83–85 đa sổ: Sổ (MH dòng 89) không có thành phần pháp nhân, trong khi OR:36 gắn thuế với pháp nhân. Đủ, v2.1 tuỳ.
- 3.1 OR:47: Khách thuê có mã nội bộ ở MH §1 nhưng không trong danh sách K1. Đảo được.

### QĐ đã duyệt rời chuẩn có ý thức (không phải lỗ): C01, C03, C04, C05, C14, M02
- **C01 (9 lớp → 7):** Sự kiện gộp tường minh ở MH §0 và HC 4.1; "Quyết định" và "Vận hành" bị bỏ khỏi chữ; lớp luật/chính sách dời lên trước giao dịch; thêm lớp "lệnh". Lý do ở dự thảo lưu trữ (Phụ lục A dòng 177: "quyết định và vận hành gộp vào hình chiếu") không khớp danh sách hình chiếu ở HC 1.4. → Loại (b): ghi bảng chuyển 9→7 vào dòng CHANGELOG của Hiến chương.
- **C04:** cách đọc "mở rộng có lược đồ đăng ký không bị 5.2 cấm" chỉ còn ở dự thảo lưu trữ; bản sạch chỉ còn "Không có trong lõi: cơ chế trường mở rộng tự do" → dễ đọc thành cấm mọi mở rộng. → Loại (b): một câu chú thích ở CHANGELOG, không đổi cách đọc 5.2.

### Không kiểm được
Không đọc bốn báo cáo kiểm trước; không kiểm mã/dữ liệu dự án; chưa rõ chủ coi Projects/ là "hệ sinh thái" (Oracle) hay các dự án độc lập (HP N4); không đọc EOS/ketoanvn/"Hien chuong Enterprise OS"; hontamnew không chạm.

## Phụ lục B — Người rà theo khung Enterprise OS (tóm tắt báo cáo gốc)


Viết tắt: HP = CONSTITUTION.md, HC = HIEN-CHUONG-HE-THONG.md, MH = MO-HINH-DU-LIEU-LOI.md, PH = POLICY_HIERARCHY.md, NC = NGAY-CHOT.md (đều trong phat-hanh-v2.0.0/); PP = 2026-09-26-phan-phoi-ban-chi-doc.md; DT-HC = HIEN-CHUONG-HE-THONG.du-thao.md; TĐ = tourdao-sales/docs/ARCHITECTURE.md.

### Tổng kết
- Phần luật (I, II, III.2 — 18 điểm): 13 Đủ, 1 Thiếu, 4 Lệch (3 gốc), 0 Trái. Năm bản chất bất biến của hệ ghi nhận (SoR) đều có điều ở HC và được KHOANH ĐÚNG phạm vi (HC:4, HP:30/47/57, MH:4, PH:9; HP không chứa luật sổ).
- Phần thực hành (III.1, III.3, IV, V, VI — 20 điểm): 11 có nơi trong HP/HC; 9 thiếu nơi có tên hoặc chỉ nằm ở phụ lục dự thảo sắp lưu trữ (DT-HC:202). Không điểm nào có mốc ngày cấp dự án; phiên hợp nhất luật thực thi chỉ "đặt lịch" (NC:62).

### Phát hiện nặng nhất
1. **X1 (đắt) — thứ tự gắn tag mâu thuẫn.** PP:12, PP:172–173 đặt hợp nhất luật thực thi TRƯỚC tag; NC:54, 60–62 gắn tag TRƯỚC; PP:155, 162 ghi "ghim v2.0.0". `git diff --stat main -- GOVERNANCE.md PLAYBOOK.md governance/ ai/ templates/` rỗng ⇒ tag v2.0.0 chở nguyên luật thực thi cũ: GOVERNANCE 1.2:14 (thiếu hai tầng mới), GOVERNANCE 3.4:69–73 (P8 cũ — bỏ đúng phần nới H29), GOVERNANCE 10.1:166 (thiếu HC, MH trong khi CLAUDE.md gói :20 trỏ về đó), PLAYBOOK:86 ("symlink"). Phương án: A hợp nhất rồi tag; **B (khuyến nghị) tag theo NC + câu "không dự án nào ghim v2.0.0; ghim tag sau phiên hợp nhất" + NGÀY cho phiên đó** (không đổi chữ nguyên tắc, không đụng ba văn bản); C vá tối thiểu GOVERNANCE 1.2/3.4/10.1 + PLAYBOOK Phần 4 trước tag.
2. **Gốc A — HC 5.11:94 (đắt)**: "…và không tự chạy lệnh ghi lên hệ thống thật" gộp tác nhân dịch vụ với AI. Đọc theo MH (MH:42 tác nhân tự động = định danh dịch vụ) ⇒ tác vụ nền/hộp thư đi không được tự ghi, trái HC 1.2, HC 5.16, EOS II.4. Đọc theo nguồn (TĐ:111 → CLAUDE.md §8, lệnh vận hành của AI lập trình) ⇒ AI trong ứng dụng ghi tiền qua lệnh không cần người duyệt (HC 5.15, MH:55) — thiếu vế "người dùng duyệt" của EOS II.3/VI.4. Sửa không đối xứng: vế AI dự án siết được ngay (HP 9.7); vế tác vụ nền dự án KHÔNG nới được — trước v2.1 chỉ có đường "lệch có chủ ý" (HC 6.2).
3. **HC 5.17:106 (đắt)**: không nói ca sổ vàng CHƯA xác nhận có tính vào cổng nhận mã tiền không (TĐ:160: ca Tour Đảo đều chờ xác nhận). (c); (b) ngay qua bảng thi hành.
4. **X4 (đảo được)**: khung dựng dự án (templates/, init-project.sh) không có chỗ cho ràng buộc bên ngoài, sổ vàng, từ điển dữ liệu, bảng thi hành, sổ hàng rào, luật chặn lệnh phá huỷ (grep 0 cho golden|sổ vàng|ràng buộc bên ngoài|từ điển|bảng thi hành|sổ hàng rào|TASKS|settings.json|deny|hook); templates/ và init không nằm trong phạm vi phiên hợp nhất (NC:62); init tạo CODEOWNERS "@owner" (init:52–56) trong khi PP:148 nói tên giữ chỗ chưa là một lớp; init không tạo .claude/ (init:18).
5. **HC 5.16:104 (đảo được)**: thiếu vế "việc chờ gửi ghi CÙNG lần ghi" (Transactional Outbox); MH:121 không có nó trong ranh giới giao dịch.

### Khác
- **X2 (đắt)**: tourdaovn thuộc phạm vi nhưng H12 chặn nâng ghim khi chưa có môi trường thử — "chưa kiểm" (PP:160), không ngày, không người chịu trách nhiệm ⇒ HC không áp cho tourdaovn trong thời gian không xác định.
- **X3 (đảo được)**: HC:4 đòi dự án ngoài phạm vi ghi "không áp"; PP §4 thiếu mục "không áp" cho 5 website (Core, pt-hdv, nhatrangtravel, Aquanova, vatengine-landing); khuôn PIN-README đã có dòng (init:30).
- I.1c "một lát cắt sâu" (Thiếu, chưa giao) → chỗ tự nhiên templates/00-PROJECT_BRIEF §3, §5. VI.1 tài liệu thay giao hàng, VI.2 bom phạm vi, VI.10 một người là điểm chết, V.2 lộ trình 12 tháng, IV.1/IV.2 ngữ cảnh & phân tầng model: thiếu nơi/mốc (b).
- IV.3: danh sách chặn lệnh phá huỷ không có nơi.
- PH:16 áp hạn 30 ngày cho cả tầng 3 gồm PLAYBOOK.md ⇒ đặt IV/V vào PLAYBOOK thì tự hết hạn.
- HP 3.1:57 không đặt "luật thực thi dùng chung" trong chuỗi thứ bậc dù 8.5, 9.7, 9.8 nhắc; PH không liệt kê GOVERNANCE.md ở tầng nào.

### Trái QĐ đã duyệt — chỉ báo một lần
- **H15**: EOS III.1 ghi CONSTITUTION.md "chỉ người sửa"; HP N9 Ranh giới (:218) cho tác nhân chép nguyên văn sau khi chủ phê chuẩn (NC:26 dùng quyền này). Chủ chọn có ý thức.
- **H13**: N5 "chỉ tiến tới" (:201) hạng tuyệt đối với dữ liệu đã phát hành, áp mọi dự án kể cả website — ra ngoài vùng khoanh EOS I.2. Phiếu xếp "đắt, khả năng thấp".

### Không kiểm được
Không mở ketoanvn/vatengine/tourdaovn (hạ tầng thật, ketoanvn có nạp GOVERNANCE không); không chạy init/kiem-ban-ghim; không đọc "Hien chuong Enterprise OS/" (phiếu §5 còn chờ chủ nói đó là đặc tả hay nguồn luật — nếu là nguồn luật phải chấm lại).

## Phụ lục C — Người rà cơ cấu thư mục Projects/ (tóm tắt báo cáo gốc)


### Tổng kết
- Thiết kế cơ cấu ĐÍCH đúng tinh thần hai chuẩn: một kho luật, một tag, bản ghim có băm kèm rào máy, tầng dưới chỉ được siết (HP v4.0.0 3.1, 9.7), Hiến chương chỉ áp cho dự án có dữ liệu nghiệp vụ hoặc tiền.
- Phần CHUYỂN TIẾP chưa đủ: sau 3/10 vẫn còn bốn dòng Hiến pháp (v2.2.0, v2.3.0, v3.1.0, v4.0.0) và hai văn bản cùng tên "Hiến chương" sống song song, không mốc; không văn bản nào nói Hiến chương nào chi phối Tour Đảo trong khoảng đó.
- Không phát hiện nào buộc đổi chữ một nguyên tắc ⇒ không phát hiện nào chặn ngày chốt 3/10. Riêng thứ tự tag phải quyết TRƯỚC khi chủ gõ lệnh gắn tag.
- Kế hoạch chỉ có đúng một mốc ngày: 2026-10-03 (L10). Gắn tag, phiên hợp nhất luật thực thi, P08, nâng ghim từng nhóm, P07: không ngày.

### Phát hiện nặng nhất
1. **Thứ tự tag (Lệch, đắt, b):** phân phối:172–174 + :12 (hợp nhất luật thực thi trước, rồi tag); NGAY-CHOT:50–56, 60–62 (tag ngay sau gộp PR #1 — tự nhận theo phân phối mục 5 nhưng đảo bước 3 và 4); phiếu:140 (tag trước cả PR). Hệ quả: v2.0.0 mang GOVERNANCE v1.0.0 cũ (CLAUDE.md gói dòng 7); Core, tourdao-sales, pt-hdv không ghim v2.0.0 được mà không mất cổng QA (P06, phân phối:205). Tag là một chiều (NGAY-CHOT:58). Phương án: A (khuyến nghị) tag v2.0.0 chỉ gồm ba văn bản + công cụ ghim, sửa hàng Core/tourdao-sales/pt-hdv thành "ghim tag đầu tiên chứa luật thực thi đã hợp nhất"; B hoãn tag tới sau phiên hợp nhất.
2. **Lúc rút gọn Phần I của tourdao-sales (Thiếu, đắt, d):** tourdao-sales ARCHITECTURE.md dòng "Trạng thái" (:15) "khi kho đó có điều tương ứng, điều ở đây rút thành 'theo … điều X'" (kích hoạt ngày 3/10) ↔ phân phối:156 + H12 (rút ở lần nâng ghim, không mốc). Rút máy móc ⇒ tham chiếu tới văn bản không có trong repo (phiên cloud không thấy), ngoài thứ bậc v2.3.0 (playbook/CONSTITUTION.md:50 không có tầng Hiến chương hay ràng buộc bên ngoài — L16), và NỚI luật Tour Đảo ở 4.4 (C13) và một vế 4.2 (C14).
3. **H12 và P06 không lối ra, không ngày (Thiếu, đắt, d):** không ngày/người/việc dựng môi trường thử cho tourdao-sales; tourdaovn (đặt tour, hình thức thanh toán, mã giảm giá, D1) không Hiến chương nào chi phối (ghim v2.2.0, không Phần I, L15). H12a (hop-nhat:84) có đường rẻ: dự án tự khai môi trường thử, chủ duyệt. tourdaovn có `deploy:preview` (package.json:21) — chủ xét.
4. **Phạm vi Hiến chương tính theo từng dự án, không theo hệ sinh thái như Oracle (Lệch, đắt, d hoặc c):** ba dự án Tour Đảo (tourdao-sales, tourdaovn, pmbh) không có luật "dự án nào giữ bản gốc về khách và tiền"; chỉ N4 cấm trộn ranh giới (L9); không có tài liệu cấp `ctytnhhtourdao/` (L6). Hai danh bạ khách và hai nơi ghi tiền cho một công ty thì gộp về sau rất tốn.
5. **Công cụ khởi tạo dự án thiếu (Thiếu, đảo được, b):** init-project.sh không dựng lớp chặn thứ hai (P05: `.claude/` settings deny `Edit(playbook/**)` + hook), không tạo CLAUDE.md, CODEOWNERS "* @owner" giữ chỗ (init:52–56) — đúng kiểu phân phối:148 chê; README/hướng dẫn không nói lớp hai (L11); cách làm lớp hai chỉ còn trong archive/ (không xuất vào bản ghim).

### Bảng dự án (rút gọn)
- Master-Project-Framework: kho gốc; main v2.2.0 + GOVERNANCE v1.0.0, tag duy nhất v1.0.0; nhánh hop-nhat-luat-goc: gói v4.0.0.
- ctytnhhtourdao/tourdao-sales: ghim v2.3.0 từ Core (PIN-README, .PINNED_SHA256); Phần I ARCHITECTURE.md "Hiến chương kiến trúc lõi" (đã duyệt); RANG_BUOC_NGOAI.md; golden/. Kế hoạch: Áp, nhóm ưu tiên, giữ ghim cũ (H12).
- ctytnhhtourdao/tourdaovn: ghim v2.2.0 qua nhatrangtravel; không tài liệu kiến trúc (chỉ docs/core-specs/04-CONSTRAINTS.md). Áp, nhóm ưu tiên, H12 chưa kiểm ⇒ không Hiến chương nào chi phối.
- ctytnhhtourdao/pmbh: không git; chỉ thiết kế + tệp Access ("Phần mềm bán hàng mới": hoá đơn, thu chi, công nợ, khoá sổ — DT-HC:220). Áp khi thi công.
- ctytnhhtourdao/fastbooking: ngưng. ctytnhhtourdao/mockup, *.bundle: không nhắc (vô hại).
- ketoanvn: v3.1.0 ở gốc, tự sở hữu; ARCHITECTURE.md v3.10 (dòng 3 "đứng dưới PRD.md" — v4.0.0 3.1 không có tầng PRD); RANG_BUOC_NGOAI.md v1.12 "chờ duyệt". Áp kể cả 5.18, nhóm ưu tiên.
- vatengine: không playbook/; CLAUDE.md tự xưng "Hiến pháp" (dòng 1, 9, 13); CODEOWNERS "@CHU-DU-AN". Áp kể cả 5.18, P09.
- CoreSchemaProject (v2.3.0 tự sở hữu, ADR-0027, cổng QA), pt-hdv (v2.3.0, ADR-0054; playbook/CLAUDE.md dòng 11 "Core sở hữu bản luật này"), nhatrangtravel (v2.2.0 nhưng .PINNED_VERSION ghi v1.0.0), Aquanova (v2.2.0, GOVERNANCE v1.2.0 vá cục bộ), vatengine-landing: website/không D1 (L13) ⇒ "Không áp" khớp bằng chứng.
- hontamnew: cô lập (chủ quyết). opendesign/open-design: kho ngoài, không áp.
- dichvuketoan, Speedmarine (tiêu chí phần mềm booking 22/9 — nếu làm thì gần chắc "Áp"), Website robot: chưa rõ.
- AI-Handbook, "Claude designe - tài liệu cho admin", Marketing Banner, ketoanvn-ban-ve-giao-dien, ketoanvn-untracked-2026-09-12: không phải dự án, không được nhắc ⇒ nên ghi "không phải dự án".
- Băm Hiến pháp: ba bản v2.2.0 giống từng byte bản main của kho; ba bản v2.3.0 giống nhau. Không có dòng Hiến pháp thứ năm ngoài kế hoạch.

### Hai Hiến chương nói khác nhau (khi tourdao-sales nâng ghim)
- Vị trí: Tour Đảo "dưới Hiến pháp chung … trên mọi ADR" ↔ bản chung "dưới Hiến pháp và ràng buộc bên ngoài, cùng tầng Mô hình, trên ràng buộc cấp dự án".
- Cách sửa đổi: Tour Đảo 6.4 "chỉ chủ dự án; AI đề xuất bằng diff" (không thời gian cân nhắc) ↔ bản chung 6.5 theo Hiến pháp Điều 9 (có cân nhắc); số hiệu Điều 6 lệch một.
- 5.14: bản chung thêm "trỏ về dòng sai" + "ngày phát sinh hoặc hiệu lực" (chặt hơn ⇒ Tour Đảo theo).
- 5.9: Tour Đảo "phải trả khác hoặc thu nhập khác" cụ thể hơn (hợp lệ làm lớp siết).
- C13 (4.4): bản chung rộng hơn (chặt hơn) nhưng vế "không dành cho người nhận" là nới (phiếu:92 tự ghi). C14 (4.2): "Sổ tiền" rộng hơn "Sổ công nợ", nhưng thêm "bút toán do người lập … có chứng từ, người duyệt, nhật ký" mở lối Tour Đảo đóng ⇒ pha trộn.
- M04: Tour Đảo phải tự khai sổ công nợ thuộc hình dạng "sổ hai bên". M01: nửa mở (MH:16) ↔ khoảng đóng Tour Đảo (ADR-0003) — "nợ có tên" nhưng tourdao-sales chưa ghi dòng nợ nào (L7) ⇒ HC 5.2 "không chồng nhau" lệch một ngày ở biên.
- Đề xuất ADR chuyển tiếp của tourdao-sales (loại d): (1) Phần I chi phối Tour Đảo tới lần nâng ghim; (2) rút gọn chỉ trong commit nâng ghim; (3) giữ chữ Tour Đảo ở 4.2, 4.4, 5.9 làm lớp siết; (4) ghi nợ M01; (5) ADR-0026 nói rõ theo 4.2 bản nào.

### Khác (chuyển tiếp, cơ cấu)
- P08/P07 sót: bốn tệp playbook/CLAUDE.md (pt-hdv, Aquanova, nhatrangtravel, Core); ketoanvn CLAUDE.md:3 vẫn `@CONSTITUTION.md` ở gốc; PIN-README tourdao-sales "Cách nâng ghim (chỉ khi Core đổi…)" (P08 cấm sửa tới lần nâng ghim — bị H12 chặn). hontamnew trong nội dung P07 (:193) "không ghim, không sửa" dễ hiểu thành cấm sửa mã ⇒ viết lại "đợt hợp nhất không chạm tới đây".
- ketoanvn (:161), vatengine (:162) thiếu việc HC 6.1 và 6.3 (khai phạm vi + bảng thi hành) mà hàng tourdaovn (:160) có.
- tourdao-sales lúc nâng ghim: RANG_BUOC_NGOAI.md:10 "Sửa/thêm dòng: được tự do (siết)" trái Điều 2 v4.0.0 (H06a: chủ duyệt từng dòng); đổi tên Phần I (hai văn bản cùng tên, lý do như P09) và sửa CLAUDE.md:14–15 (chủ duyệt, N9); nợ M01.
- CHANGELOG-doan-them:21 sai: dòng v2.3.0 "chấm dứt khi Core nâng ghim" (tourdao-sales, pt-hdv vẫn ở dòng đó).
- Lời khai phạm vi hai chỗ ở: HC dòng 4 (tài liệu kiến trúc) ↔ init-project.sh:30 + phân phối:64 (PIN-README trong playbook/ có băm).
- So Framework III.1: CONSTITUTION ở playbook/ thay vì gốc (lệch có chủ ý, a); CLAUDE.md không được init tạo (b); RANG_BUOC_NGOAI không cố định tên/chỗ/mẫu (b); GLOSSARY ≈ từ điển dữ liệu (Đủ); mẫu 02-SAD không có khai phạm vi/bảng thi hành, mẫu 09 dòng 6 không nhắc Hiến chương/Mô hình (b); golden/ không được dựng (b); .claude/ không được tạo (b); .github/workflows rỗng + CODEOWNERS "@owner" (b).
- Thứ bậc đúng: Hiến pháp → ràng buộc bên ngoài → Hiến chương và Mô hình (khi thuộc phạm vi) → kiến trúc dự án → ADR → quy trình → đặc tả → sản phẩm; CLAUDE.md chỉ là chỉ đường (Projects/CLAUDE.md là "lưới an toàn chung, không phải luật", phân phối:184; POLICY_HIERARCHY:12 tầng 4).
- "Hien chuong Enterprise OS/" trong CHUNGCATKIENTHUC có bản "CONSTITUTION … rút gọn" và "Hiến chương Enterprise OS v2.0", không dự án nào trỏ tới (L12); phiếu:135 để ngỏ "đặc tả hay nguồn luật" ⇒ đề nghị đóng là "không phải nguồn luật" (d).

### Trái QĐ đã duyệt
Không câu nào đi ngược một QĐ. Có HAI CẶP văn bản cùng trong bộ đã duyệt nói ngược nhau — chủ chọn, tác nhân không tự hoà giải: (1) thứ tự tag (P02, P06): phân phối §5 + Kết luận 4 ↔ NGAY-CHOT:50–62 + phiếu:140; (2) lúc rút gọn Phần I tourdao-sales: ARCHITECTURE.md:15 (chủ duyệt 25–26/9) ↔ phân phối:156 + H12.

### Không kiểm được
git -C vào repo khác bị rào worktree từ chối (đọc .git/HEAD, refs/tags thay thế); hontamnew chỉ liệt kê; "Hien chuong Enterprise OS/" chỉ xem tên tệp; "giống thật" của môi trường thử — chủ quyết (H12a); GitHub (CODEOWNERS, bảo vệ nhánh) không kiểm; không chạy script; không đọc nội dung GOVERNANCE/PLAYBOOK/FRAMEWORK; ketoanvn ARCHITECTURE.md (1095 dòng) chỉ đọc phần đầu.
