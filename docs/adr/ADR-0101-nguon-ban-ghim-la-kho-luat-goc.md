# ADR-0101: Luật chung thuộc kho luật gốc; bản ghim là bản chép từ Core, không phải do Core sở hữu

- **Trạng thái:** **proposed** — chờ chủ dự án duyệt. Soạn 2026-10-05 theo QĐ-P08 (duyệt tạm 2026-09-26, chốt 2026-10-03 theo Hiến pháp 9.2; `Master-Project-Framework/archive/2026-09-26-phan-phoi-ban-chi-doc.md` mục 5 ý 6 và bảng QĐ-P08) và bản đối chiếu `docs/superpowers/specs/2026-10-05-doi-chieu-bo-luat-v2.md` mục 2. Người kiểm độc lập (chỉ đọc) đã đọc bản đầu; bản này sửa theo bốn phát hiện của vòng kiểm đó.
- **Ngày:** 2026-10-05
- **Phạm vi:** lời khai về sở hữu và đường sửa luật của `playbook/`; không đổi tệp nào trong `playbook/`, không đổi manifest, không đổi `src/standards.test.ts`.
- **Cửa:** hai chiều (chỉ đổi lời khai; nội dung luật đang áp không đổi).

## Bối cảnh

- Chủ dự án quyết: `Master-Project-Framework` là kho luật gốc duy nhất cho mọi dự án trong `Projects/`; dự án đang tự nhận hoặc khai sai sở hữu, nguồn, phiên bản phải đổi lời khai cho đúng sự thật, sớm, không chờ nâng ghim (QĐ-P08). Kho đã phát hành tag `v2.0.0` ngày 2026-10-05.
- Hai nghĩa của "nguồn" cần tách: (a) nơi các tệp `playbook/` được chép ra: đúng là `CoreSchemaProject/playbook` (bảng dự án của tệp phân phối ghi "ADR-0012 (nguồn Core là đúng)"); (b) nơi luật chung được định nghĩa và sửa từ nay: kho luật gốc.
- Chỗ sai theo QĐ-P08: `playbook/PIN-README.md` dòng 3 ghi `playbook/` là bản chép "do Core sở hữu". Cùng ý "sửa ở Core": `PIN-README.md` dòng 24 ("việc cần sửa ở nguồn được ghi ở ADR-0012"), dòng 28 ("sửa ở Core, chủ duyệt, chép lại, nâng ghim"), dòng 50–55 (cách nâng ghim bằng rsync từ Core); ADR-0012 dòng 5 ("nới qua Core"), 14 và 25 (việc cần sửa ở nguồn), 24 ("sửa ở Core"), 28–29 ("bản gốc ở Core", "Core tự nhận sở hữu").
- Dữ kiện xuất xứ ở `PIN-README.md` dòng 8–12 (chép từ đâu, HEAD nào, ngày nào) là đúng và giữ nguyên.
- Không sửa `PIN-README.md` lúc này được: tệp nằm trong manifest băm (bài kiểm băm của `src/standards.test.ts` đỏ nếu sửa, người kiểm độc lập đã thử cố ý); việc viết lại thuộc lần nâng ghim.

## Quyết định

1. Lời khai đúng về `playbook/` từ nay: **"Bản chép từ CoreSchemaProject/playbook, Hiến pháp v2.3.0 (HEAD Core `65a3c2b`, 2026-09-21), đã rẽ nhánh ở Core; chờ nâng lên kho luật Master-Project-Framework, nguồn luật gốc duy nhất (chủ quyết 2026-09-26, chốt 2026-10-03)."** Không viết "bản ghim của kho luật v2.3.0", vì kho luật chưa từng có phiên bản đó.
2. Vô hiệu bằng lời cho tới lần nâng ghim, theo đúng cách `PIN-README.md` đang vô hiệu `.PINNED_VERSION`: `PIN-README.md` dòng 3 (cụm "do Core sở hữu"), dòng 24 và 28 (sửa ở Core), dòng 50–55 (nâng ghim bằng rsync từ Core). Giữ nguyên dòng 8–12 (dữ kiện xuất xứ). Nội dung luật trong `playbook/` vẫn áp nguyên như hôm nay.
3. ADR-0012 giữ phần còn lại: bản chép chỉ-đọc, nguồn chép là Core, manifest băm, bài kiểm, tầng ràng buộc dự án chỉ siết. Phần "sửa ở Core, Core tự nhận sở hữu, nới qua Core" bị thay bởi ADR này.
4. Sửa luật chung từ nay chỉ làm ở kho luật gốc, theo điều sửa đổi của Hiến pháp. Các việc tồn đọng ADR-0012 ghi là "cần sửa ở nguồn" (GOVERNANCE 4.3, 4.4; câu 9.3 chờ quyết) chuyển sang kho luật gốc; phiên hợp nhất luật thực thi ở kho gốc nhận các việc này.
5. Lần nâng ghim kế tiếp chép từ một tag của kho luật theo quy trình phân phối 3.2, viết lại `PIN-README.md` và manifest, sửa `src/standards.test.ts` theo QĐ-P10 khuyến nghị A. Điều kiện trước: kho đã phát hành bản có luật thực thi hợp nhất (sau `v2.0.0`), và môi trường thử đã dựng (đặc tả `docs/superpowers/specs/2026-10-05-moi-truong-thu.md`, hoãn có điều kiện, "sắp nâng ghim" là một điều kiện kích hoạt).

## Bấm nhầm thì sao

Không có lệnh, không có thay đổi dữ liệu hay mã. Hoàn tác bằng một ADR mới thay ADR này.

## Thay câu nào (ghi dòng trỏ ở dòng trạng thái văn bản cũ khi ADR này accepted, không sửa thân)

| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0012 dòng 5 | nới qua Core | sửa luật chung ở kho luật gốc (ADR-0101) |
| ADR-0012 dòng 14, 25 | việc cần sửa ở nguồn | việc cần sửa ở kho luật gốc (ADR-0101) |
| ADR-0012 dòng 24 | sửa ở Core | sửa ở kho luật gốc (ADR-0101) |
| ADR-0012 dòng 28–29 | bản gốc ở Core; Core tự nhận sở hữu | bản chép từ Core v2.3.0, đã rẽ nhánh; luật chung thuộc kho luật gốc (ADR-0101) |
| `playbook/PIN-README.md` dòng 3, 24, 28, 50–55 | do Core sở hữu; sửa ở Core; rsync từ Core | vô hiệu bằng lời theo ADR-0101; viết lại ở lần nâng ghim (dòng 8–12 giữ) |

## Hệ quả

- Hết một nguồn luật song song tự nhận (Hiến pháp N7) mà không đụng bản ghim đang chạy.
- `CLAUDE.md` §2 câu "bản chép chỉ-đọc từ Core, ADR-0012 đã accepted" vẫn đúng về sự thật; thêm "(luật chung thuộc kho luật gốc, ADR-0101)" khi chủ duyệt.
