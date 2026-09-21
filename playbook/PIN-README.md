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
- **Loại**: `archive/` (lịch sử của Core) và `CLAUDE.md` của Core (dạy "sửa thẳng tại đây, Core sở hữu bản này" — sai ở nơi bản chép phải chỉ-đọc — và Claude Code tự nạp nó khi làm việc trong thư mục này).
- **Khác nguồn duy nhất về quyền tệp**: `init-project.sh` bỏ bit thực thi (0644). Băm chỉ phủ nội dung, không phủ quyền; bài kiểm kiểm bit này.
- Thêm hai tệp của repo này (không có ở Core): `PIN-README.md` (tệp này) và `.PINNED_SHA256`.

## CẤM
- **CẤM chạy `init-project.sh`.** Nó sinh thư mục dự án MỚI cạnh thư mục cha của repo (`../<tên>`) và là công cụ của Core, không dùng ở đây.
- Không điền nội dung dự án vào `templates/` (chỉ đọc); tài liệu dự án đặt ở `docs/`.
- Không sửa tệp nào ở đây, kể cả `[NEEDS HUMAN DECISION]` ở GOVERNANCE mục 9.3 hay dấu vết tourdaovn ở GOVERNANCE 4.3/4.4. Việc cần sửa ở nguồn được ghi ở ADR-0012.

## Câu trong bản chép ĐÚNG ở Core nhưng KHÔNG áp dụng ở repo này
- `.PINNED_VERSION` (của Core): dòng 46 "**Sửa thẳng tại đây**" và cả tệp nói Core "sở hữu" bản này — đúng ở Core, không áp dụng ở đây. Tệp còn ghi Hiến pháp **v2.2.0** ở dòng 8 và 29 (lỗi thời so với v2.3.0). Bản ghim của repo này được mô tả bằng PIN-README này và `.PINNED_SHA256`.
- `README.md` dòng 28: "Đường hợp pháp duy nhất: `04-CONSTRAINTS.md` khoản 6 và `ADR-0030`" — của Core, không có ở đây. Ở repo này: sửa ở Core, chủ duyệt, chép lại, nâng ghim (mục "Cách nâng ghim").
- `README.md` dòng 24 và `init-project.sh`: quy trình sinh dự án mới — xem mục CẤM.

## Tham chiếu treo (có chủ ý, không phải lỗi bản chép)
11 tệp nhắc tới thứ KHÔNG nằm trong bản chép (`archive/`, `CLAUDE.md` của Core, `docs/core-specs/`, các ADR-00xx của Core): `.PINNED_VERSION`, `CHANGELOG.md`, `FRAMEWORK.md`, `PLAYBOOK.md`, `README.md`, `ai/PROMPT_FACTORY.md`, `ai/qa-reports/TEMPLATE.md`, `docs/architecture-diagrams/README.md`, `docs/architecture-diagrams/so-do-quy-trinh.html`, `docs/huong-dan-su-dung.md`, `init-project.sh`. Ngoài ra `GOVERNANCE.md` (dòng 98, 109) nhắc `DESIGN.md` — tài liệu cấp dự án chưa có ở repo này.

## Kiểm bằng máy
`npm test` chạy `src/standards.test.ts`: tệp trên đĩa = manifest, băm khớp (kể cả đối chiếu độc lập bằng `shasum -a 256 -c`), không có `CLAUDE.md`/`archive/`, `init-project.sh` không thực thi, phiên bản Hiến pháp/Governance đúng. Băm chống sửa **nhầm**, không chống sửa cả tệp lẫn manifest; lớp thứ hai (CODEOWNERS `playbook/**` và bảo vệ nhánh) do chủ dự án bật trên GitHub.

## Cách nâng ghim (chỉ khi Core đổi VÀ chủ dự án duyệt việc nâng)
1. Chủ chạy `git -C <Core> status --short -- playbook` (trống = sạch) và ghi HEAD mới.
2. `rsync -a --delete --exclude=/archive/ --exclude=/CLAUDE.md --exclude=/PIN-README.md --exclude=/.PINNED_SHA256 --exclude=.DS_Store <Core>/playbook/ playbook/` rồi `chmod 644 playbook/init-project.sh`. (Các `--exclude` cũng bảo vệ hai tệp của repo này khỏi `--delete`.)
3. `diff -r -x archive -x CLAUDE.md -x PIN-README.md -x .PINNED_SHA256 <Core>/playbook playbook` — kết quả phải trống.
4. `node scripts/pin-playbook-manifest.mjs`; cập nhật bảng "Nguồn" ở trên (ngày, HEAD, phiên bản); chạy `npm test`.
5. Ghi một dòng vào nhật ký thi công hiện hành; nếu đổi quyết định thì ADR mới trỏ về ADR-0012.

## Đối chiếu độ trung thực lúc chép
`diff -r` giữa Core và bản chép (loại `archive/`, `CLAUDE.md`, và hai tệp của repo này) cho kết quả trống lúc chép; log nằm ở nhật ký thi công `docs/superpowers/plans/2026-09-21-bo-tieu-chuan-thi-cong-nhat-ky.md`. Người kiểm độc lập tái hiện lại.
