# AI Web Playbook — Nguồn chuẩn duy nhất

Repo này là **khuôn**, không phải dự án. Nó chứa hiến pháp, bộ máy vận hành, quy trình và template rỗng dùng chung cho mọi dự án web. Để bắt đầu một dự án, không sửa repo này; hãy sinh ra một repo dự án từ nó.

> Mới dùng lần đầu: đọc `docs/huong-dan-su-dung.md` trước, 10 phút. Hướng dẫn khởi động riêng của từng dự án nằm trong repo dự án đó.

## Thứ bậc (xem docs/architecture-diagrams/so-do-thu-bac-quan-tri.html)
0. `FRAMEWORK.md` — phương pháp (một người + AI vận hành thế nào). Không tham gia Điều 3; mâu thuẫn hiến pháp thì hiến pháp thắng.
1. `CONSTITUTION.md` — hiến pháp, luật tối cao, độc lập công nghệ.
2. `GOVERNANCE.md` + `governance/` — bộ máy: RACI/DRI, decision process, policies, risk register.
3. `PLAYBOOK.md` — quy trình 9 bước và phân bổ công cụ AI.
4. `templates/` — 10 template rỗng: 9 artifact theo bước 0–8 + overlay dự án (CHỈ ĐỌC, đừng điền vào đây).
5. Code — sống trong repo dự án.

## Một nguồn sự thật
- Lịch sử thay đổi: chỉ ở `CHANGELOG.md`. Constitution và Governance không giữ change log riêng.
- Phân công việc (ai làm gì): chỉ ở `governance/RACI.md`. Quyền quyết định (ai quyết gì): chỉ ở `GOVERNANCE.md` mục 3. Hai bảng hai chức năng.
- Hiến pháp: chỉ một bản ở đây. Core sở hữu bản này (`ADR-0027`).

## Khởi tạo một dự án mới
```bash
./init-project.sh ten-du-an
```
Lệnh này tạo thư mục `../ten-du-an/` với: bản copy playbook kèm version, symlink hiến pháp, thư mục `project/` chứa 10 template đã copy để điền (overlay tự đổi tên theo dự án), `project/adr/`, `project/DRIFT_LOG.md`, khung `src/` và `.github/`.

## Quy tắc dùng
- Đừng điền nội dung vào `templates/`. Điền vào `project/` của repo dự án.
- Đừng sửa `CONSTITUTION.md` trực tiếp. Đường hợp pháp duy nhất: `04-CONSTRAINTS.md` khoản 6 và `ADR-0030`.
