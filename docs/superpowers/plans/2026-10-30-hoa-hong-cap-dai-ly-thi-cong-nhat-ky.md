# Nhật ký thi công: Hoa hồng cấp đại lý (kế hoạch 18 việc)

Kiểm quyen-hoan.json 30/10: chỉ khớp HC-4.2 dòng 115 (ghi chú của Sổ đại lý đợt 2, đường điều chỉnh có duyệt). Kế hoạch này không chạm đường điều chỉnh sổ tiền ⇒ không xây trên lỗ đang hở (phán quyết người điều phối; khớp đặc tả §0).

Kế hoạch: `docs/superpowers/plans/2026-10-30-hoa-hong-cap-dai-ly.md`. Đặc tả: `docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/DAC-TA.md` bản 5.

## Gốc

Mọi so sánh với `main` ở kế hoạch này dùng GỐC hoặc ba chấm `main...`, không hai chấm, để commit mới của `main` không lẫn vào.

- HEAD lúc bắt đầu: `4a915b057420d4d8aba40d8d333ec52ee3dad6eb`
- GỐC (`git merge-base main HEAD`): `a129d3dd074abce4cfd1e745869d975136777d0e`

## Lựa chọn tự áp

(trống)

## P16 (sửa cố ý → đỏ → hoàn nguyên)

(trống)

## Lệch so với kế hoạch

(trống)

## Mốc cuối phần 1

(để trống, Task 14 điền)

## Việc treo

Bốn khe hở đặc tả gặp khi soạn kế hoạch, kèm phán quyết của người điều phối ghi ở `BIEN-BAN-DUYET-KE-HOACH-2026-10-30.md` (quyết định 14 và đoạn phán quyết các khe).

1. Danh sách tệp phần 2 thiếu tệp buộc phải chạm (`src/shared/app-info.test.ts`, `src/shared/so-do-trang.ts`, nhật ký, tệp bằng chứng). Phán quyết: danh sách «Tệp được chạm» của ADR-0151 tính tệp sản phẩm; tệp phụ trợ ghi vào nhật ký thi công, không coi là lệch.
2. Gốc so sánh của «`git diff main --stat` phần 2» không định nghĩa khi phần 1 chưa vào `main`. Phán quyết: phần 2 lấy lần lưu cuối của phần 1 làm gốc, ghi ở «Mốc cuối phần 1».
3. Một hay hai lần phát hành cho hai phần. Phán quyết (quyết định 14): phát hành một lần, bản 2.48; phần 1 và phần 2 nhập main và phát hành chung sau QA2; chỉ một mục nhật ký thay đổi.
4. Tệp mới `src/shared/hoa-hong-phu-muc.ts` nằm ngoài bộ tệp của luật cấm theo tệp (đặc tả §6.2). Phán quyết: tệp này không chứa chữ người dùng thấy; mọi chữ nằm ở `hoa-hong-hien-thi.ts`.

Ghi thêm từ kế hoạch (không phải khe đặc tả): kịch bản Chrome cần Chrome và `AXE_JS` ngoài repo, e2e cần mạng; thiếu thì ghi «chưa kiểm», không tính đạt.
