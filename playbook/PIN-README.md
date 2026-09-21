# PIN-README — bản chép chỉ-đọc của playbook (Lớp 1)

> **CHỈ ĐỌC.** Thư mục này là bản CHÉP của `playbook/` do Core sở hữu, không phải nơi soạn luật. **Đừng sửa tay; AI không được sửa** (Hiến pháp N9). Quyết định và lý do: `docs/adr/ADR-0012-neo-hien-phap-ban-chep-chi-doc-va-lop-2.md` (đề xuất, chờ chủ dự án duyệt).

## Nguồn
| Mục | Giá trị |
|---|---|
| Chép từ | `/Users/tuanbao/Documents/Projects/CoreSchemaProject/playbook/` (CoreSchemaProject/playbook), ngày 2026-09-21 |
| HEAD của Core | `65a3c2b25d9f01b4deaefe1bd81e559aa8fd50e8` (đọc từ `.git/HEAD` và `refs/heads/master`, không chạy git) |
| Cây làm việc của Core | **CHƯA xác nhận cây sạch**: chủ dự án chưa chạy `git status` ở Core (2026-09-21). Bằng chứng yếu: ngày sửa tệp không muộn hơn commit cuối chạm playbook (2026-08-23). Bản chép có thể chứa thay đổi chưa commit ở Core |
| Phiên bản | Hiến pháp v2.3.0 (hiệu lực 2026-08-22), GOVERNANCE v1.0.0, CHANGELOG cao nhất 3.3.1 (2026-08-23) |
| Người quyết nguồn và đường chép | chủ dự án, 2026-09-21 (`docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md`, quyết định 2, 25, 30–32) |

## Chép gì, loại gì
- Chép **43 tệp (250.827 byte) nguyên byte**, giữ nguyên đường dẫn.
- **Loại**: `archive/` (lịch sử của Core) và `CLAUDE.md` của Core (mục 1 của nó ghi "Core sở hữu bản luật này", mục 2 dạy "Sửa thẳng tại chỗ" — sai ở nơi bản chép phải chỉ-đọc — và Claude Code tự nạp nó khi làm việc trong thư mục này).
- **Khác nguồn duy nhất về quyền tệp**: `init-project.sh` bỏ bit thực thi (0644); đó cũng là tệp thực thi duy nhất của Core (`find <Core>/playbook -type f -perm -u+x`, loại `archive/`, chỉ ra tệp này). Băm chỉ phủ nội dung, không phủ quyền; bài kiểm đòi KHÔNG tệp nào dưới `playbook/` có bit thực thi.
- `playbook/.gitignore` của Core (hai dòng: `.DS_Store`, `node_modules/`) được chép nguyên và nay có hiệu lực ở repo này: git bỏ qua hai mục đó dưới `playbook/`.
- Thêm hai tệp của repo này (không có ở Core): `PIN-README.md` (tệp này) và `.PINNED_SHA256`.

## CẤM
- **CẤM chạy `init-project.sh`.** Nó là công cụ của Core, không dùng ở đây. Nó lấy thư mục chứa nó (`playbook/`) làm nguồn và tạo thư mục dự án MỚI `<tên>` ngay cạnh `playbook/`, tức ngay trong gốc repo này (dòng 7–8 của tệp), rồi dựng trong đó `project/adr`, `docs/architecture-diagrams`, `src/web`, `src/api`, `.github/workflows`, `.specify/…` và chép cả `playbook/` vào (dòng 13, 16). Chạy nhầm để lại thư mục rác trong gốc repo.
- Không điền nội dung dự án vào `templates/` (chỉ đọc); tài liệu dự án đặt ở `docs/`.
- Không sửa tệp nào ở đây, kể cả `[NEEDS HUMAN DECISION: …]` ở GOVERNANCE mục 9.3 (dòng 181) hay các chi tiết dành riêng cho một website ở GOVERNANCE mục 4.3 và 4.4 (dòng 98, 109: `DESIGN.md`, `08-SCHEMA_PLAN`, JSON-LD, Lighthouse, `prices.yaml`, hreflang/sitemap). Việc cần sửa ở nguồn được ghi ở ADR-0012.

## Câu trong bản chép ĐÚNG ở Core nhưng KHÔNG áp dụng ở repo này
- `.PINNED_VERSION` (của Core): dòng 46 "**Sửa thẳng tại đây**" và cả tệp nói Core "sở hữu" bản này — đúng ở Core, không áp dụng ở đây. Tệp còn ghi Hiến pháp **v2.2.0** ở dòng 8 và 29 (lỗi thời so với v2.3.0). Bản ghim của repo này được mô tả bằng PIN-README này và `.PINNED_SHA256`.
- `README.md` dòng 28: "Đường hợp pháp duy nhất: `04-CONSTRAINTS.md` khoản 6 và `ADR-0030`" — của Core, không có ở đây. Ở repo này: sửa ở Core, chủ duyệt, chép lại, nâng ghim (mục "Cách nâng ghim").
- `README.md` dòng 24 và `init-project.sh`: quy trình sinh dự án mới — xem mục CẤM.

## Tham chiếu treo (có chủ ý, không phải lỗi bản chép)
Đo lại ngày 2026-09-21 bằng `grep -rn` trên đúng 43 tệp nguồn của Core (loại `archive/` và `CLAUDE.md`), theo từng loại. **Đây là các loại chính, không phải danh sách đầy đủ mọi thứ Core nhắc mà bản chép không có** (xem đoạn "Còn có loại khác" ở cuối mục). Bản chép nhắc tới thứ KHÔNG nằm trong nó:
- **`archive/`** (4 tệp): `.PINNED_VERSION`, `CHANGELOG.md`, `PLAYBOOK.md` (dòng 76 trỏ tới một prompt trong `archive/`), `docs/huong-dan-su-dung.md` (dòng 21).
- **`CLAUDE.md` của Core** (1 tệp): `CHANGELOG.md` (dòng 21, 25 nêu đích danh `playbook/CLAUDE.md`). Ba tệp khác có chữ `CLAUDE.md` (`FRAMEWORK.md`, `docs/huong-dan-su-dung.md`, `ai/PROMPT_FACTORY.md` dòng 102) nói về `CLAUDE.md` của một dự án hay repo chủ nói chung, không phải tệp bị loại.
- **`docs/core-specs/`** (2 tệp): `FRAMEWORK.md` (dòng 258–260), `CHANGELOG.md` (dòng 25).
- **ADR của Core** (ADR-0024, 0026, 0027, 0030; 6 tệp): `.PINNED_VERSION`, `CHANGELOG.md`, `README.md`, `FRAMEWORK.md`, `ai/PROMPT_FACTORY.md`, `ai/qa-reports/TEMPLATE.md`. Đó không phải ADR của repo này (ADR của repo này ở `docs/adr/`, đánh số riêng). Ba tệp `CHANGELOG.md`, `ai/PROMPT_FACTORY.md`, `ai/qa-reports/TEMPLATE.md` còn trỏ tới `docs/qa-reports/` (thư mục báo cáo QA của Core, không có ở đây).
- **`project/`** (16 tệp) — thư mục của repo dự án hạ nguồn mà `init-project.sh` tạo, không có trong bản chép: `README.md` (dòng 24, 27), `PLAYBOOK.md` (dòng 86–90), `init-project.sh` (dòng 13, 25–27, 30, 35, 50, 54), `CHANGELOG.md` (dòng 16, 18), `docs/huong-dan-su-dung.md` (dòng 39, 45, 67), `ai/agents/cowork.prompt.md` và `ai/agents/design.prompt.md` (dòng 4), và chín template `templates/00` đến `templates/08` (dòng 3 mỗi tệp, nói phải điền hay đặt tài liệu trong `project/`, riêng template 03 là `project/adr/`). Ở repo này tài liệu dự án đặt ở `docs/`, không có `project/`.

Số tệp khác nhau theo loại; gộp bốn loại đầu (`archive/`, `CLAUDE.md`, `docs/core-specs/`, ADR của Core) là **8 tệp**: `.PINNED_VERSION`, `CHANGELOG.md`, `FRAMEWORK.md`, `PLAYBOOK.md`, `README.md`, `ai/PROMPT_FACTORY.md`, `ai/qa-reports/TEMPLATE.md`, `docs/huong-dan-su-dung.md`; thêm `project/` là 20 tệp.

**Không phải tham chiếu treo** — chỉ nhắc ADR-0001 của một dự án hạ nguồn (mẫu ở `templates/03-ADR-0001-template.md`, CÓ trong bản chép; hoặc ví dụ đã điền ở repo `nhatrangtravel`) hay ký hiệu `ADR-000x`: `templates/03-ADR-0001-template.md`, `init-project.sh` (dòng 26, tên tệp mẫu), `PLAYBOOK.md` (dòng 20, 93), `docs/huong-dan-su-dung.md` (dòng 49), `docs/architecture-diagrams/README.md` (dòng 3), `docs/architecture-diagrams/so-do-quy-trinh.html` (dòng 197), `CHANGELOG.md` (dòng 16, 18).

Ngoài ra `GOVERNANCE.md` (dòng 98, 109) nhắc `DESIGN.md` (dòng 98 còn nhắc `08-SCHEMA_PLAN`, cũng không có trong `templates/`) — tài liệu cấp dự án chưa có ở repo này.

**Còn có loại khác** (đo ngày 2026-09-21, chưa đếm theo từng tệp và từng dòng): `.PINNED_VERSION`, `FRAMEWORK.md`, `ai/PROMPT_FACTORY.md` và `ai/WORKFLOW.md` còn nhắc `ai/prompts/`, `BACKLOG.md`, `SETUP-NEW-SITE.md` hoặc `.claude/…` (agents, rules, settings); những thứ đó cũng không có trong bản chép. Gặp đường dẫn hay tên tệp trong `playbook/` mà không thấy ở đây thì coi là tham chiếu treo, đừng tạo tệp đó.

## Kiểm bằng máy
`npm test` chạy `src/standards.test.ts`: tệp trên đĩa = manifest, băm khớp (kể cả đối chiếu độc lập bằng `shasum -a 256 -c`), không có `CLAUDE.md`/`archive/`, không tệp nào dưới `playbook/` có bit thực thi, `.gitattributes` đặt `playbook/**` là `-text` và `git check-attr` xác nhận hiệu lực (`text: unset`; bài này cần `git` chạy được và gốc là một repo git, không bỏ qua âm thầm), phiên bản Hiến pháp/Governance đúng. Băm chống sửa **nhầm**, không chống sửa cả tệp lẫn manifest; lớp thứ hai (CODEOWNERS `playbook/**` và bảo vệ nhánh) do chủ dự án bật trên GitHub.

## Cách nâng ghim (chỉ khi Core đổi VÀ chủ dự án duyệt việc nâng)
1. Chủ chạy `git -C <Core> status --short -- playbook` (trống = sạch) và ghi HEAD mới.
2. `rsync -a --delete --exclude=/archive/ --exclude=/CLAUDE.md --exclude=/PIN-README.md --exclude=/.PINNED_SHA256 --exclude=.DS_Store <Core>/playbook/ playbook/` rồi `chmod 644 playbook/init-project.sh`. (Các `--exclude` cũng bảo vệ hai tệp của repo này khỏi `--delete`.)
3. `diff -r -x archive -x CLAUDE.md -x PIN-README.md -x .PINNED_SHA256 <Core>/playbook playbook` — kết quả phải trống.
4. `node scripts/pin-playbook-manifest.mjs`; cập nhật bảng "Nguồn" ở trên (ngày, HEAD, phiên bản); chạy `npm test`.
5. Ghi một dòng vào nhật ký thi công hiện hành; nếu đổi quyết định thì ADR mới trỏ về ADR-0012.

## Đối chiếu độ trung thực lúc chép
`diff -r` giữa Core và bản chép (loại `archive/`, `CLAUDE.md`, và hai tệp của repo này) cho kết quả trống lúc chép; log nằm ở nhật ký thi công `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md`. Người kiểm độc lập tái hiện lại.
