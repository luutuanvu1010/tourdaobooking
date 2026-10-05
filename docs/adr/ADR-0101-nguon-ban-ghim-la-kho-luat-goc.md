# ADR-0101: Nguồn của bản ghim luật là kho luật gốc, không phải Core

- **Trạng thái:** **proposed** — chờ chủ dự án duyệt. Soạn 2026-10-05 theo QĐ-P08 đã duyệt 2026-09-26 (`Master-Project-Framework/archive/2026-09-26-phan-phoi-ban-chi-doc.md` mục 5 ý 6, bảng QĐ-P08) và bản đối chiếu `docs/superpowers/specs/2026-10-05-doi-chieu-bo-luat-v2.md` mục 2.
- **Ngày:** 2026-10-05
- **Phạm vi:** lời khai về nguồn và sở hữu của `playbook/`; không đổi tệp nào trong `playbook/`, không đổi manifest, không đổi `src/standards.test.ts`.
- **Cửa:** hai chiều (chỉ đổi lời khai; nội dung luật đang áp không đổi).

## Bối cảnh

- Chủ dự án quyết 2026-09-26: `Master-Project-Framework` là kho luật gốc duy nhất cho mọi dự án trong `Projects/`; các bản chép ở dự án phải khai đúng nguồn (QĐ-P08). Kho đã phát hành tag `v2.0.0` ngày 2026-10-05.
- `playbook/PIN-README.md` dòng 3 ghi `playbook/` là bản chép "do Core sở hữu"; dòng 8–12 ghi nguồn là `CoreSchemaProject/playbook`; dòng 28 và 50–55 ghi đường nâng ghim bằng rsync từ Core.
- ADR-0012 dòng 5 ("nới qua Core"), 24 ("sửa ở Core"), 28–29 ("bản gốc ở Core", "Core tự nhận sở hữu") cùng ý đó.
- Không sửa `PIN-README.md` lúc này được: tệp nằm trong manifest băm và `src/standards.test.ts` (dòng 72–75) đòi đúng các chuỗi của nó; sửa thì phải sinh lại manifest và đổi bài kiểm trong cùng commit, tức là việc của lần nâng ghim.

## Quyết định

1. Lời khai đúng về `playbook/` từ nay: **"Bản chép từ CoreSchemaProject/playbook, Hiến pháp v2.3.0 (HEAD Core `65a3c2b`, 2026-09-21), đã rẽ nhánh ở Core; chờ nâng lên kho luật Master-Project-Framework, nguồn luật gốc duy nhất (chủ quyết 2026-09-26)."** Không viết "bản ghim của kho luật v2.3.0", vì kho luật chưa từng có phiên bản đó.
2. Các câu sau vô hiệu bằng lời cho tới lần nâng ghim, theo đúng cách `PIN-README.md` đang vô hiệu `.PINNED_VERSION`: `PIN-README.md` dòng 3 ("do Core sở hữu"), dòng 8–12 (nguồn là Core), dòng 28 và 50–55 (nâng ghim bằng rsync từ Core). Nội dung luật trong `playbook/` vẫn áp nguyên như hôm nay.
3. ADR-0012 giữ phần còn lại: bản chép chỉ-đọc, manifest băm, bài kiểm, tầng ràng buộc dự án chỉ siết. Phần "nguồn Core, sửa ở Core, Core tự nhận sở hữu, nới qua Core" bị thay bởi ADR này.
4. Sửa luật chung từ nay chỉ làm ở kho luật gốc, theo điều sửa đổi của Hiến pháp; không đề xuất sửa luật chung qua CoreSchemaProject.
5. Lần nâng ghim kế tiếp chép từ một tag của kho luật theo quy trình phân phối 3.2, viết lại `PIN-README.md` và manifest, sửa `src/standards.test.ts` theo QĐ-P10 khuyến nghị A. Điều kiện trước: kho đã phát hành bản có luật thực thi hợp nhất (sau `v2.0.0`), và môi trường thử đã dựng (đặc tả `docs/superpowers/specs/2026-10-05-moi-truong-thu.md`, hoãn có điều kiện, "sắp nâng ghim" là một điều kiện kích hoạt).

## Bấm nhầm thì sao

Không có lệnh, không có thay đổi dữ liệu hay mã. Hoàn tác bằng một ADR mới thay ADR này.

## Thay câu nào (ghi dòng trỏ ở dòng trạng thái văn bản cũ, không sửa thân)

| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0012 dòng 5 | nới qua Core | sửa luật chung ở kho luật gốc (ADR-0101) |
| ADR-0012 dòng 24 | sửa ở Core | sửa ở kho luật gốc (ADR-0101) |
| ADR-0012 dòng 28–29 | bản gốc ở Core; Core tự nhận sở hữu | bản chép từ Core v2.3.0, đã rẽ nhánh; nguồn gốc là kho luật gốc (ADR-0101) |
| `playbook/PIN-README.md` dòng 3, 8–12, 28, 50–55 | do Core sở hữu; nguồn Core; rsync từ Core | vô hiệu bằng lời theo ADR-0101; viết lại ở lần nâng ghim |

## Hệ quả

- Hết một nguồn luật song song tự nhận (Hiến pháp N7) mà không đụng bản ghim đang chạy.
- `CLAUDE.md` §2 dòng nói "bản chép chỉ-đọc từ Core, ADR-0012 đã accepted" vẫn đúng về sự thật; thêm "(nguồn gốc: kho luật gốc, ADR-0101)" khi chủ duyệt.
