# GOVERNANCE — Luật thực thi

> Luật vận hành dùng chung cho mọi dự án và mọi tác nhân (người và AI). Hiến pháp giữ nguyên tắc và lý do; file này giữ cơ chế: ai được quyết gì, cổng đòi gì, dừng khi nào. Khi file này mâu thuẫn với `CONSTITUTION.md`, hiến pháp thắng và file này phải sửa.

- **Phiên bản:** v1.0.0   **Hiệu lực từ:** 2026-06-10   **Người phê chuẩn:** Lưu Tuấn Vũ
- Văn phong chủ ý gọn và mệnh lệnh. Lý do sâu của từng nguyên tắc nằm ở hiến pháp, không lặp lại ở đây.

---

## 1. Phạm vi và thứ tự ưu tiên

1.1. Áp dụng cho mọi dự án, mọi môi trường, và mọi nơi AI tác động vào quyết định, sản phẩm, dữ liệu, quy trình, hay phát hành.

1.2. Thứ tự ưu tiên tài liệu theo Điều 3 hiến pháp: hiến pháp → overlay cấp dự án → ADR → Playbook và tài liệu quy trình → spec từng bước → sản phẩm (code, nội dung).

1.3. Mâu thuẫn sửa ở tầng đúng rồi để chảy xuống. Cấm vá ở đáy; cấm dùng code, prompt, hay artifact thấp hơn để lách một quyết định ở tầng cao hơn.

1.4. Toàn hệ chỉ có một định nghĩa quy trình: chuỗi 9 bước (0–8) tại `PLAYBOOK.md` Phần 1. File này không định nghĩa chuỗi bước riêng; mọi tham chiếu quy trình trỏ về đó.

---

## 2. Vai và ranh giới cứng

2.1. Năm vai (một người, bốn tác nhân AI):

| Vai | Năng lực lõi | Cấm tuyệt đối |
|---|---|---|
| Chủ dự án (người) | Định hướng, khẩu vị, phê chuẩn mọi cổng và quyết định một chiều | Không bỏ qua cổng QA (N6) |
| Cowork (điều phối) | Đặc tả, prompt, drift log, điều phối | Không viết code, không chốt thay chủ dự án |
| Design (bề mặt) | Mockup, token, hệ thị giác sau khi có BINDING_MAP | Không chạm dữ liệu, không quyết kiến trúc |
| Code (thực thi) | Viết, sửa, commit, deploy đúng spec đã qua QA1 | Không tự đổi kiến trúc, không tự mở rộng phạm vi |
| QA (kiểm chứng) | Chạy checklist QA1/QA2, đối chiếu artifact với spec và ràng buộc, xuất bằng chứng E1/E2 | Không soạn spec, không sửa artifact mình kiểm, không mở cổng |

Vai QA tách từ chức năng kiểm soát chất lượng của tác nhân điều phối (hiến pháp Điều 2), để người soạn spec không tự chấm bài mình (mục 5.1). QA kiểm chứng và xuất bằng chứng; cổng vẫn do chủ dự án chốt.

2.2. Mỗi vai chỉ làm phần thuộc vai mình và dừng khi chạm ranh giới.

2.3. DRI: mọi quyết định, khối việc, và luồng có rủi ro có đúng một DRI là con người. Chưa rõ DRI thì việc bị chặn. Nhiều DRI ngầm là lỗi quản trị.

2.4. Chuyển giao giữa các vai phải kèm bối cảnh, nguồn sự thật, trạng thái cổng, và bằng chứng đang có. Cấm bàn giao bằng suy đoán hay tóm tắt thiếu chứng cứ.

2.5. Phân công thực hiện công việc (R, A, C, I) sống ở `governance/RACI.md`. Bảng đó trả lời "ai làm gì"; mục 3 dưới đây trả lời "ai quyết gì". Hai bảng hai chức năng, không lặp nội dung của nhau.

---

## 3. Quyền quyết định và leo thang

3.1. Ma trận quyền quyết định (khớp bảng 7.1 hiến pháp; Design không có quyền kiến trúc ở bất kỳ đâu):

| Loại quyết định | Cowork | Design | Code | QA | Chủ dự án |
|---|---|---|---|---|---|
| Soạn spec / prompt / checklist QA | Soạn | Không | Không | Không | Duyệt |
| Xác nhận phạm vi | Đề xuất | Không | Không | Không | Chốt |
| Xác nhận kiến trúc | Đề xuất kèm ADR | Không | Không | Không | Chốt |
| Bề mặt, thẩm mỹ | Không | Đề xuất | Không | Không | Duyệt |
| Thực thi trong khuôn khổ spec | Không | Không | Có giới hạn | Không | Giám sát |
| Kiểm chứng cổng QA1 / QA2 | Không | Không | Không | Kiểm chứng, xuất bằng chứng | Chốt cổng |
| Mở cổng Design / Code | Không | Không | Không | Không | Chốt |
| Cho phép merge / release | Không | Không | Không | Không | Chốt |
| Duyệt ngoại lệ | Không | Không | Không | Không | Chốt |
| Yêu cầu dừng khẩn cấp | Có | Có | Có | Có | Có |

Dòng "Kiểm chứng cổng" không trao quyền quyết định cho QA: kiểm chứng đạt là điều kiện cần, chủ dự án chốt là điều kiện đủ.

3.2. ADR bắt buộc khi quyết định có thể làm thay đổi: kiến trúc, mô hình dữ liệu, giao diện ngoài, cách phát hành, bảo mật, quyền tác nhân, hoặc cách vận hành lâu dài.

3.3. Leo thang: Design / Code / QA → Cowork → Chủ dự án. Cowork bắt buộc leo lên chủ dự án khi: đổi phạm vi, đổi kiến trúc, mở ngoại lệ, sửa quyết định đã chốt, hoặc chấp nhận rủi ro vận hành.

3.4. Xử lý mơ hồ (theo P8 hai tầng của hiến pháp):

1. Mơ hồ chạm cấu trúc (dữ liệu, logic, hợp đồng giữa các phần, bất biến, quyền hạn, cổng)? Dừng và leo thang, luôn luôn, dù nhỏ tới đâu.
2. Không chạm cấu trúc và thuộc cửa hai chiều? Tác nhân tự đưa giả định, ghi giả định vào assumption log, đi tiếp. Giả định không ghi là vi phạm P5.
3. Không chắc thuộc loại nào? Mặc định coi là cấu trúc và dừng.

3.5. Điều kiện dừng tuyệt đối, gặp một điều là dừng ngay: thiếu artifact đầu vào; tài liệu xung đột; cổng chưa qua; yêu cầu vượt quyền; không rõ nguồn sự thật; không rõ DRI; không rõ hậu quả nếu sai.

3.6. Chống tự suy diễn quyền: AI không được mở rộng quyền bằng diễn giải thoáng hơn, lấp chỗ trống cấu trúc bằng giả định, hay coi output của chính mình là đủ để hợp thức hóa bước tiếp theo. Mọi dấu hiệu tự suy diễn quyền là drift thẩm quyền: dừng ngay.

---

## 4. Cổng kiểm soát

4.1. Sáu chuẩn fail-closed:

1. Trạng thái mặc định là chặn, không phải cho phép.
2. Không có quyền thì không làm; không có nguồn thì không có quyền; không có bằng chứng thì không được coi là thật.
3. Không có cổng thì không đi tiếp.
4. Bất kỳ lệch chuẩn nào cũng dừng đường liên quan cho tới khi sửa xong.
5. Quyền khẩn cấp dùng để bảo vệ kiểm soát, không thay thế kiểm soát.
6. Không chứng minh được thì về mặt quản trị xem như chưa xảy ra.

4.2. Ba cổng cứng của quy trình (định nghĩa tại `PLAYBOOK.md` Phần 1): chưa có BINDING_MAP thì cấm vào bước 7; chưa qua QA1 thì Code không chạy; chưa qua QA2 thì cấm merge và cấm phát hành.

4.3. QA1 — Cổng Design → Code (artifact phải đạt trước khi build). Một cổng, hai loại artifact:

| Thành phần | Mockup HTML | Code (.ts, .astro) |
|---|---|---|
| **Điều kiện vào** | Mockup đã xuất; BINDING_MAP và DESIGN.md đã duyệt | Code đã viết; CONTENT_MODEL và 08-SCHEMA_PLAN đã duyệt |
| **Điều kiện ra** | Mọi lỗi Cao đã sửa; lỗi TB đã sửa hoặc ghi phiếu nợ | Như mockup |
| **Spec kiểm tra** | `08-QA_CHECKLIST.md` A→F | `08-QA_CHECKLIST.md` G2 |
| **Người chạy** | Agent QA độc lập — không phải agent đã soạn artifact | Như mockup |
| **Người chốt** | Chủ dự án duyệt báo cáo QA1 | Như mockup |

4.4. QA2 — Cổng trước phát hành (code đã build, phải đạt trước khi merge vào production):

| Thành phần | Nội dung |
|---|---|
| **Điều kiện vào** | Build thành công; toàn bộ artifact đã qua QA1 |
| **Điều kiện ra** | Cả 5 mục dưới phải đạt. Founder chốt danh sách này 2026-06-12: (1) JSON-LD validator 100% xanh (I6); (2) Lighthouse perf ≥ 90 và a11y ≥ 95 (04-CONSTRAINTS); (3) prices.yaml integrity check (PY1-PY8); (4) hreflang/sitemap toàn vẹn (R4); (5) không hardcode token ngoài DESIGN.md |
| **Bằng chứng bắt buộc** | Tối thiểu E1 cho mọi bất biến dữ liệu (theo §5.3); E2 cho visual regression |
| **Người chốt** | Chủ dự án duyệt báo cáo QA2 |

4.5. Mỗi cổng khai đủ ba phần: điều kiện vào (đầu vào nào, ai xác nhận, nguồn nào chuẩn), điều kiện ra (cái gì phải xong), bằng chứng bắt buộc (tài liệu, kiểm tra, log nào).

4.6. Anti-bypass: không nhảy cổng, không gộp cổng, không đổi tên cổng để né kiểm soát, không dùng artifact sau để hợp thức hóa artifact trước. Prompt chỉ hoạt động trong cổng được phép; prompt không có quyền tạo luật mới, mở cổng mới, hay đổi thứ tự cổng.

4.7. Prompt QA — trước khi bàn giao prompt cho tác nhân thực thi (Claude Code), Cowork tự kiểm hoặc Founder duyệt prompt theo 6 tiêu chí PQ1–PQ6. Cơ chế chi tiết (template, cách chạy QA, ví dụ) ở `playbook/ai/PROMPT_FACTORY.md`. Đây là bước kiểm nội bộ trong khâu Soạn/Duyệt của RACI §3.1 — không phải cổng mới. Prompt không đạt PQ1–PQ6 thì không bàn giao.

4.8. Cơ chế kỹ thuật của cổng (CI ba tầng) nằm ở `governance/CONTROL_GATES.md`.

---

## 5. Bằng chứng

5.1. Bằng chứng phải khó ngụy tạo hơn làm thật và kiểm được độc lập với lời kể của tác nhân. Tự khai của AI không bao giờ là bằng chứng đủ; lệch giữa lời khai và thực tế là tín hiệu báo động, không phải chuyện nhỏ.

5.2. Ba hạng bằng chứng:

| Hạng | Loại | Ví dụ |
|---|---|---|
| E1 | Máy sinh, máy kiểm | Test pass log, schema validator output, Lighthouse JSON |
| E2 | Máy sinh, người kiểm | Screenshot diff, diff PR, render preview |
| E3 | Người khai có đối chứng | "Đã đối chiếu mục 4.2, xem dòng 120–134" |

5.3. Cổng QA2 (release) tối thiểu phải có E1 cho mọi bất biến dữ liệu. E3 đơn độc không bao giờ đủ để qua bất kỳ cổng nào.

---

## 6. Lệch chuẩn và sự cố

6.1. Ba loại lệch chuẩn: lệch yêu cầu (việc đang làm không còn khớp spec đã duyệt); lệch sản phẩm (artifact không còn khớp nguồn sự thật); lệch thẩm quyền (hành động xảy ra khi chưa có quyền hợp lệ).

6.2. Phát hiện lệch là ghi ngay vào drift log: loại lệch, thời điểm, artifact bị ảnh hưởng, ai ghi, ai xử lý, cổng nào phải mở lại. Không có drift ngầm; lệch đã biết mà chưa xử lý là nợ quản trị đang mở.

6.3. Phải respec hoặc re-review khi: đổi yêu cầu, đổi kiến trúc, đổi dữ liệu, đổi giả định bảo mật, bằng chứng cũ hết giá trị, hoặc phát hiện phê duyệt trước đó không đầy đủ.

6.4. Sự cố xử lý theo trình tự: dừng phần bị ảnh hưởng, giữ bằng chứng, xác định cổng và sản phẩm bị ảnh hưởng, khoanh vùng, leo thang, chọn đường phục hồi. Phục hồi chỉ khôi phục kiểm soát; chỉ quay lại vận hành bình thường sau khi cổng bị ảnh hưởng được xác minh lại.

6.5. Hậu kiểm truy về lỗ hổng kiểm soát (thiếu quy tắc, thiếu cổng, bằng chứng yếu, sai thẩm quyền, prompt không an toàn, hành vi vòng qua cổng, bàn giao kém), không dừng ở "lỗi con người" hay "lỗi mô hình". Mỗi sự cố nghiêm trọng sinh một hành động khắc phục được ghi lại.

---

## 7. Ngoại lệ và quyền khẩn cấp

7.1. Ngoại lệ chỉ hợp lệ khi ghi thành record theo mẫu chuẩn ở `CONSTITUTION.md` mục 5.8 và nối với cơ chế nợ hiến pháp. Không record thì không có ngoại lệ; không duyệt thì không có miễn trừ; không thời hạn thì không phải kiểm soát.

7.2. Quyền khẩn cấp chỉ dùng để: freeze, rollback, treo tác nhân, mở lại cổng, yêu cầu re-spec. Cấm dùng quyền khẩn cấp để mở rộng phạm vi, hợp thức hóa quyết định sai, hay biến hành động tạm thời thành luật mới.

7.3. Phân biệt ngoại lệ có điều kiện (duyệt được nếu đúng thẩm quyền và có bù trừ) với điều cấm tuyệt đối (không bẻ, không miễn, không nới; danh mục ở `CONSTITUTION.md` 5.8).

7.4. Ngoại lệ chỉ được đóng khi: điều khoản bị bẻ đã được sửa, hoặc đã thay bằng quy tắc/chặn mới, hoặc đã quay về trạng thái chuẩn và không còn nợ treo.

---

## 8. Quản trị AI

8.1. AI System Registry: mỗi hệ AI đang vận hành (chatbot, pipeline nội dung, agent code) có một dòng đăng ký gồm: tên hệ, mục đích, mô hình nền, nhà cung cấp, dữ liệu vào/ra, DRI, và tier rủi ro. Tier rủi ro theo đúng một thang T0–T3 tại `governance/AI_RISK_TIERING.md`; không tồn tại thang thứ hai.

8.2. Phân loại dữ liệu đưa vào context AI: công khai / nội bộ / nhạy cảm. Dữ liệu nhạy cảm (giá vốn, thông tin khách hàng, API key) cấm đưa vào prompt gửi tới dịch vụ bên thứ ba khi chưa có quyết định ghi thành ADR.

8.3. Golden set: mỗi hệ AI từ tier T1 trở lên có một bộ test cố định (10–30 ca) chạy lại định kỳ và sau mỗi lần đổi model hoặc system prompt, để phát hiện model drift. Đây là phiên bản AI của nguyên tắc "kiểm bất biến bằng script" (hiến pháp 8.3).

---

## 9. Chỉ số quản trị

9.1. Chỉ số đo chất lượng kiểm soát, không đo tốc độ đầu ra: tỷ lệ qua/rớt cổng, tỷ lệ mở lại cổng, số ngoại lệ và thời gian xử lý, thời gian phát hiện lệch chuẩn, tỷ lệ tái diễn sự cố, tỷ lệ đầy đủ bằng chứng, tỷ lệ hành động không được phép.

9.2. Thông lượng cao không chứng minh kiểm soát tốt. Làm nhanh nhưng bằng chứng yếu là thất bại quản trị, không phải thành công.

9.3. [NEEDS HUMAN DECISION: chốt nhịp đo và ngưỡng báo động cho từng chỉ số, ví dụ "tỷ lệ mở lại cổng trên 20% trong tháng thì phải hậu kiểm quy trình"]

---

## 10. Nguồn thẩm quyền và bảo trì

10.1. Mỗi loại quy tắc có đúng một nguồn thẩm quyền: `CONSTITUTION.md` (nguyên tắc và điều cấm), `GOVERNANCE.md` (luật thi hành), `PLAYBOOK.md` (quy trình), `governance/RACI.md` (phân công), `governance/AI_RISK_TIERING.md` (tier rủi ro AI), `governance/CONTROL_GATES.md` (cơ chế cổng CI), prompt theo vai (hành vi theo vai, không tạo luật mới).

10.2. Không có luật ẩn: quy tắc chi phối quyền hạn, cổng, leo thang, hay quyền khẩn cấp không được chỉ sống trong prompt, ghi chú, hay hội thoại.

10.3. Governance chỉ đổi qua quy trình thay đổi có kiểm soát. Mỗi thay đổi ghi vào `CHANGELOG.md`: đổi gì, vì sao, bằng chứng ủng hộ, rủi ro được xử lý, ai duyệt, phiên bản và ngày hiệu lực. Phiên bản cũ truy vết được nhưng hết hiệu lực; tác nhân chỉ dùng bản hiện hành.
