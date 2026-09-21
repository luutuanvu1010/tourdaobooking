# Hướng dẫn sử dụng Master Project Framework

> Bản hướng dẫn cho chủ dự án, ngôn ngữ đời thường. Đây là tài liệu dẫn xuất: khi nó mâu thuẫn với CONSTITUTION, GOVERNANCE hay PLAYBOOK thì file luật thắng (P6). Cập nhật: 2026-06-10.

## 1. Repo này là gì, và không là gì

Đây là cái khuôn làm bánh, không phải cái bánh. Nó chứa luật, quy trình, template và prompt dùng chung cho mọi dự án web vận hành theo mô hình một người cộng bốn tác nhân AI. Mỗi dự án thật sống trong repo riêng của nó, sinh ra từ khuôn này. Không bao giờ code hay viết nội dung dự án trong repo khuôn.

## 2. Bản đồ thư mục, đọc trong 1 phút

| Thư mục / file | Là gì, khi nào mở |
|---|---|
| `CONSTITUTION.md` v2.3.0 | Hiến pháp: 21 nguyên tắc, 10 điều cấm, quyền quyết định, cơ chế sửa đổi. Đọc một lần cho hiểu, mở lại khi có tranh chấp |
| `GOVERNANCE.md` v1.0.0 | Nội quy vận hành: 5 vai, ma trận ai quyết gì, cổng và bằng chứng, xử lý lệch chuẩn, quản trị AI. Mở khi phân vai hoặc gặp mơ hồ |
| `PLAYBOOK.md` v1.1.0 | Dây chuyền 9 bước, cách dựng prompt 7 phần, chu trình tái sử dụng. Mở thường xuyên nhất |
| `templates/` (00 đến 09) | 10 mẫu trống: 9 artifact theo bước 0 đến 8 cộng overlay dự án. Chỉ đọc, không điền vào đây |
| `governance/` | Buồng máy: RACI, thang rủi ro AI T0 đến T3, cơ chế cổng CI ba tầng, quy trình quyết định, sổ rủi ro, policy bảo mật và dữ liệu |
| `ai/agents/` | 4 prompt chuẩn theo vai: cowork (điều phối), design (bề mặt), code (thực thi), qa (kiểm chứng) |
| `ai/workflows/` | Pipeline spec-driven và runbook sự cố |
| `specs/inbox/` | Hộp thư đến cho spec lớn. Trống là khỏe mạnh; có file tồn lâu là có việc chưa xử lý |
| `archive/` | Tài liệu hết hiệu lực, giữ để truy vết. Không bao giờ trích dẫn archive làm căn cứ |
| `CHANGELOG.md` | Sổ duy nhất ghi mọi lần luật đổi |
| `init-project.sh` | Lệnh sinh repo dự án mới từ khuôn |

## 3. Năm điều phải thuộc lòng

1. Đặc tả trước, sản phẩm sau. Chưa có giấy thì chưa làm.
2. Cấu trúc trước, giao diện sau. Chưa có binding map thì cấm thiết kế.
3. Ba cổng cứng: Binding Map trước bước 7, QA1 trước khi code chạy, QA2 trước khi phát hành. Thiếu bằng chứng là cổng đóng, và chỉ chủ dự án mở cổng.
4. AI đề xuất, người quyết. Quyết định khó đảo ngược (chọn công nghệ, đổi schema, phát hành) phải có giấy ADR và chữ ký của chủ dự án.
5. Mỗi thứ một nguồn sự thật. Thấy hai chỗ nói cùng một chuyện là có lỗi, sửa ở tầng cao hơn rồi để chảy xuống.

## 4. Khởi tạo một dự án mới

```bash
./init-project.sh ten-du-an
```

Lệnh tạo thư mục `../ten-du-an/` gồm: bản playbook pin phiên bản (chỉ đọc, để tra cứu), hiến pháp dạng symlink (không có bản chép riêng để mà lệch), 10 template đã copy vào `project/` chờ điền (overlay được đổi tên theo dự án tự động), DRIFT_LOG, và khung src/ cùng .github/.

Sau khi sinh repo, theo thứ tự:

1. Tạo CLAUDE.md cho dự án (hợp đồng mỗi phiên làm việc: bối cảnh, stack, quy ước, nghi thức phiên).
2. Tạo bộ nhớ dự án: CHECKLIST.md (đang ở đâu), ROADMAP.md (ưu tiên gì), DECISIONS.md (nhật ký quyết định, chỉ thêm không sửa).
3. Điền `project/00-PROJECT_BRIEF.md` trước tiên, viết kiểu thông cáo ra mắt. Chưa xong bước 0 thì không đụng bước nào khác.
4. Đi tuần tự 0 đến 8. Tại bước 3 chốt stack bằng ADR qua cây quyết định: web nội dung dùng Astro, app động dùng Hono/JSX trên Workers, tránh Next.js trừ khi bắt buộc.
5. Điền overlay (Lớp 2): bất biến dữ liệu, ngưỡng chất lượng dạng số, bản đồ hệ AI, ranh giới với dự án khác, baseline bảo mật. Overlay chỉ được siết thêm so với luật chung.

Ví dụ thật để đối chiếu: repo `nhatrangtravel` có PROJECT_OVERLAY và docs/adr/ADR-0001 đã điền đầy đủ, kèm `docs/huong-dan-khoi-dong.md` riêng cho dự án đó.

## 5. Một phiên làm việc chuẩn

Mở phiên: tác nhân đọc CHECKLIST và ROADMAP của dự án để biết đang ở đâu. Giao việc: dùng prompt 7 phần (PLAYBOOK Phần 3), lấy khung sẵn ở `ai/agents/`, càng rủi ro càng phải đủ 7 phần và có điểm dừng. Trong phiên: AI gặp mơ hồ về dữ liệu, logic hay quyền hạn thì nó phải dừng và hỏi; đó là hành vi đúng, không phải phiền phức. Cuối phiên: cập nhật CHECKLIST, ghi DECISIONS nếu có quyết định, kèm phương án đã loại. Bỏ nghi thức này là dự án mất trí nhớ, vì trí nhớ nằm ở file chứ không nằm ở đầu người.

## 6. Tình huống thường gặp

- Muốn thêm field hay entity mới: sửa content model trước, ghi DECISIONS, rồi mới code. Không bịa field trong code.
- AI tự tin làm việc đáng lẽ phải hỏi: đó là drift thẩm quyền, ghi DRIFT_LOG và siết lại prompt.
- Muốn đi tắt qua một điều cấm vì tình huống sống còn: dùng cơ chế nợ hiến pháp, ghi record theo mẫu ở CONSTITUTION 5.8, có hạn trả. Riêng N2, N3, N6 không bẻ được, kể cả chủ dự án.
- Sự cố: theo `ai/workflows/incident-runbook.md`, dừng chảy máu trước, truy nguyên nhân về lỗ hổng kiểm soát, không đổ lỗi cho người hay model.
- Muốn đổi một luật chung: sửa ở khuôn qua Điều 9, ghi CHANGELOG, mọi dự án cùng hưởng. Cấm sửa lén trong một dự án.

## 7. Checklist trước khi đóng gói đẩy GitHub

Đã chạy toàn bộ ngày 2026-06-10, giữ lại đây để dùng cho các lần đóng gói sau:

- [ ] Không còn file dự án nào trong khuôn (project/ không tồn tại, templates/ toàn mẫu trống)
- [ ] Không còn file tạm: specs/inbox trống, không .DS_Store, không thư mục rỗng vô chủ
- [ ] Mọi file luật có header phiên bản và ngày hiệu lực
- [ ] CHANGELOG có entry cho mọi thay đổi kể từ lần đóng gói trước
- [ ] Grep kiểm tra không còn tham chiếu gãy (file được trỏ tới phải tồn tại)
- [ ] Không có bí mật trong repo: không API key, token, email riêng, thông tin khách hàng
- [ ] .gitignore chặn .DS_Store và node_modules
- [ ] Sơ đồ lỗi thời phải có dấu cảnh báo (docs/architecture-diagrams/README.md)

## 8. Đẩy lên GitHub và nhịp làm việc với git

Khởi tạo lần đầu (đã làm sẵn trong repo): `git init`, commit đầu tiên, tag phiên bản. Việc còn lại cần tài khoản GitHub của chủ dự án:

Cách 1, có GitHub CLI:

```bash
cd Master-Project-Framework
gh auth login
gh repo create master-project-framework --private --source=. --push
git push origin --tags
```

Cách 2, qua web: tạo repo private tên `master-project-framework` trên github.com (không tick tạo README), rồi:

```bash
cd Master-Project-Framework
git remote add origin git@github.com:TEN-TAI-KHOAN/master-project-framework.git
git push -u origin main --tags
```

Nhịp về sau: mỗi lần sửa luật là một commit riêng, message ghi rõ file và lý do, ví dụ `governance: thêm vai QA agent (CHANGELOG 2026-06-10)`. Khi bộ luật đổi phiên bản thì tag mới (`git tag v1.1.0 && git push --tags`). Repo dự án (như nhatrangtravel) là repo GitHub riêng, không bao giờ nằm chung repo với khuôn.
