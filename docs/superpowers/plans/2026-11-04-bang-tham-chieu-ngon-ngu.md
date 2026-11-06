# Bảng tham chiếu ngôn ngữ, đợt 1: kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng bảng tham chiếu ngôn ngữ trong mã và máy canh sáu điều kiện đỏ, xanh ngay ngày đầu, không đổi thêm tên nút nào.

**Architecture:** Dữ liệu là các tệp TS trong `src/shared/`, chỉ bài kiểm và kịch bản sinh tài liệu đọc, giao diện không nạp. Bộ quét nút chép từ hồ sơ rà soát sang `scripts/quet-nut-lib.mjs`. Các phép kiểm là hàm thuần ở `scripts/bang-tham-chieu-lib.mjs`, thử bằng dữ liệu mẫu rồi chạy trên dữ liệu thật. Bản đọc cho người do máy sinh, theo khuôn `npm run dict`.

**Tech Stack:** TypeScript chạy trực tiếp bằng `node --test` (Node 22), `.mjs` cho kịch bản, không thêm thư viện.

**Spec:** `docs/superpowers/specs/2026-11-04-bang-tham-chieu-ngon-ngu-design.md`; quyết định: `docs/adr/ADR-0167-bang-tham-chieu-ngon-ngu.md`.

## Global Constraints

- **Cổng vào:** chỉ bắt đầu khi `git merge-base --is-ancestor claude/ra-soat-nut-bam-va-tu-ngu-8a4adb origin/main` thành công; sau đó nối bản chính bằng `mcp__ccd_host__sync_with_base_branch`. Bản này dựng trên `claude/bang-tham-chieu-ngon-ngu-8a4adb`.
- Không đổi thêm tên nào ngoài tên chủ đã chọn; không đổi mã nội bộ (`data-action`, đường API, tên cột, mã nhật ký); không migration; không đụng `playbook/` và kho luật gốc.
- Không viết lại 874 nút để đọc chữ từ bảng. Không nới trần ở `src/goi-trang-nhe.test.ts`.
- Ngày đầu phải xanh; dấu hiệu của máy chỉ là gợi ý: coi nhầm thì thêm mục bỏ qua kèm lý do, không nới bài kiểm.
- Không nhận diện nút bằng số dòng hay mã `N….`.
- Không nạp 39 mục «chưa kiểm» và 39 mục chữ khác của tệp rà soát; chữ khác chuyển sang đợt 2.
- Người soạn giải nghĩa theo thứ tự: ADR đã duyệt, rồi mã hiện hành. Lệch thì không tự hoà giải: ghi vào danh sách, trình chủ một lần cùng bản đọc, không dừng hỏi từng chỗ.
- Tài liệu và chú thích tiếng Việt có dấu. Tên chuẩn theo bảng từ. Gọi hệ thống là «Nền tảng».
- Commit nhỏ, thông điệp tiếng Việt, kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Không `git push`, không merge vào `main`.
- Việc lớn (đụng luật): một người kiểm độc lập `nguoi-kiem-doc-lap`, một vòng ở cuối. `npm test` chạy một lần ở cuối, trong lúc thi công chỉ chạy `node --test src/bang-tham-chieu.test.ts` và bài liên quan.

## Số đo thử (2026-11-04, lần lưu 447440cf)

Bộ quét chạy dưới 1 giây. 875 nút thật, 422 nút ứng viên ứng với 368 khoá. So với hồ sơ rà soát chỉ có 18 khoá đã khai biến mất và 16 khoá ứng viên chưa khai, đều do 12 tên. Đường lệnh nối thẳng được 194/298 hàng; nhãn nhật ký khớp đủ 215, khớp một phần 3, không khớp 47, để trống 33. Điều 2 ngày đầu chỉ vướng 21 tên ở 79 nút, không phải 43 tên như hồ sơ đếm thô. 442 tên `[[…]]` của Hướng dẫn đều có trong mã, 223 trong đó không phải nhãn nút.

## Review Focus

- Nút chữ ghép từ mã (`‹…›`, `⟪…⟫`): đổi tên biến thì khoá đổi; câu đỏ phải nói «chữ ghép từ mã, đọc tay rồi sửa bảng», không làm người đọc tưởng tên sai.
- Hai nút cùng chữ trong một tệp (101 khoá): bỏ một nút, còn một, bảng vẫn xanh. Đây là giới hạn đã biết, bài ghim hành vi này và tài liệu nói rõ.
- Ký hiệu đầu nhãn («＋ Thêm», «✓ Lưu»): đổi ký hiệu không được làm đỏ; khoá dùng nhãn đã chuẩn hoá.
- Nhãn có dấu « / » trong chính chữ («A / b») khi tách tên: điều 2 đọc mảng `nhan`, không tách chuỗi khoá.
- Bảng lỡ bị nạp vào một trang: gói trang nặng lên mà không ai thấy; bài quét `import` đỏ ngay.

---

### Task 1: Bộ quét và các phép kiểm, thử bằng dữ liệu mẫu

**Files:**
- Create: `scripts/quet-nut-lib.mjs` (chép từ `docs/superpowers/specs/2026-11-04-ra-soat-nut-bam/liet-ke-nut.mjs`; tệp gốc là hồ sơ có ngày, không sửa)
- Create: `scripts/bang-tham-chieu-lib.mjs`
- Create: `src/shared/bang-tham-chieu.ts`
- Test: `src/bang-tham-chieu.test.ts`

**Interfaces:**
- Produces, `src/shared/bang-tham-chieu.ts` (chỉ kiểu):
  - `TrangThaiTen = "da-chot" | "cho-chon"`
  - `NoiDatNut { tep: string; chu: string }`: `chu` là khoá do `khoaNut` sinh; tên chuẩn của một nút nằm ở đây. Việc có hai lối vào thì có hai `noiDat` khác chữ, đó là «tên khác được phép», không có cột riêng.
  - `ViecQuanTrong { nhom: string; manHinh: string; ten: string; thatSuLam: string; hoiLai: string; hoanTac: string; duongLenh: readonly string[]; maNhatKy: readonly AuditAction[]; noiDat: readonly NoiDatNut[]; trangThai: TrangThaiTen; nguonTen: string }`: `ten` là tiêu đề hàng cho người đọc, có thể gồm nhiều nút
  - `KhaiNiem { ten: string; giaiNghia: string; khacVoi: string; chuDaLoai: readonly string[]; maNoiBo: readonly string[]; trangThai: TrangThaiTen; chuChon: string }`
  - `MucBoQua extends NoiDatNut { lyDo: string }`
  - `ChuDungChung { chu: string; vi: string }`
- Produces, `scripts/quet-nut-lib.mjs`:
  - `lietKeNut(root: string): NutQuet[]`, với `NutQuet = { kenh, tep, dong, nhan: string[], aria, action, id, kieu, lyDo: string[], api: string[], ghi: string[] }`, đã bỏ các nút `kenh === "khuon"`
  - `chuanNhan(s: string): string`: bỏ ký hiệu đầu `＋+✓←→⋯` và khoảng trắng thừa
  - `khoaNut(r: NutQuet): string`: `nhan` đã chuẩn hoá nối bằng « / », nếu rỗng thì lần lượt `aria:…`, `action:…`, `id:…`, `không-chữ`
  - `laUngVien(r: NutQuet): boolean`: `lyDo` có `ghi`, `nguy hiểm` hoặc `nút chính`
  - `duongTrongMa(root: string): Set<string>`: đường của mọi `route("…", "…"` trong `src/**/*.ts` trừ bài kiểm, tham số đổi về `:x`
  - `tenHuongDan(root: string): { ten: string; noi: string }[]`: mọi `[[…]]` trong `src/shared/huong-dan*.ts`
  - `toanChu(root: string): string`: lấy đúng cách tính `toanChu` của tệp gốc
- Produces, `scripts/bang-tham-chieu-lib.mjs`, mỗi hàm trả `string[]` là các câu lỗi:
  - `kiemNoiDat(viec, nut)` (điều 1), `kiemTenLacCho(viec, boQua, chuDungChung, nut)` (điều 2), `kiemUngVien(viec, boQua, nut)` (điều 3), `kiemDuong(viec, duong, maHopLe)` (điều 4), `kiemHuongDan(ten, nut, toanChu, tuDaLoai)` (điều 5), `kiemKhaiNiem(khaiNiem, tuDaLoai, camTheoTep)`, `kiemKhongDungChuLoai(viec, tuDaLoai, camTheoTep)`; và `renderBangThamChieu({ khaiNiem, chuDungChung, viec, boQua }): string` (điều 6)

- [ ] **Step 1: Viết bài đỏ cho từng phép kiểm bằng dữ liệu mẫu**

`src/bang-tham-chieu.test.ts`, dữ liệu mẫu tự dựng ngay trong bài, mỗi bài một `assert`:
- `kiemNoiDat`: khai `{ tep: "web/a.ts", chu: "Gửi kiểm vé" }`, quét ra «Gửi xác nhận» thì câu lỗi chứa `web/a.ts` và `Gửi kiểm vé`; quét ra đúng chữ thì `[]`; khoá có `⟪` hoặc `‹` thì câu lỗi chứa `chữ ghép từ mã`.
- `kiemTenLacCho`: tên «Gửi kiểm vé» xuất hiện ở tệp chưa khai thì có lỗi; «Lưu» thuộc chữ dùng chung thì `[]`; nhãn bắt đầu `⟪`, `[biểu tượng`, hoặc đúng `—` thì bỏ qua; nhãn `["A / b"]` không bị tách thành hai tên.
- `kiemUngVien`: nút `lyDo: ["ghi"]` chưa khai thì có lỗi nêu tệp và chữ; khai ở việc hoặc ở bỏ qua thì `[]`; nút `lyDo: ["từ khoá"]` chưa khai thì `[]`.
- `kiemDuong`: đường không có trong tập thì có lỗi; mã nhật ký không hợp lệ thì có lỗi.
- `kiemHuongDan`: tên trúng chữ đã loại thì có lỗi; tên không có trong nhãn nút lẫn `toanChu` thì có lỗi; tên có trong `toanChu` thì `[]`.
- `kiemKhaiNiem`: khái niệm `da-chot` thiếu `giaiNghia` có lỗi; `chuChon` không có dạng `20\d\d-\d\d-\d\d` có lỗi; chữ ở `chuDaLoai` không bị dòng cấm nào bắt có lỗi; `ten` bị dòng cấm toàn cục bắt có lỗi.
- `kiemKhongDungChuLoai`: `ten` hoặc nhãn trong `noiDat.chu` bị dòng cấm bắt thì có lỗi.
- `renderBangThamChieu`: cùng đầu vào cho cùng chuỗi, có phần «Khái niệm» trước phần «Việc quan trọng», hàng `cho-chon` hiện chữ `chờ chọn`.
- `chuanNhan("＋ Thêm") === "Thêm"`; hai nút cùng khoá, bỏ một nút thì `kiemNoiDat` vẫn `[]`.

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/bang-tham-chieu.test.ts`
Expected: FAIL vì chưa có `scripts/bang-tham-chieu-lib.mjs`.

- [ ] **Step 3: Viết `scripts/quet-nut-lib.mjs`**

Chép phần đọc tệp, ngoặc, bảng hằng, đọc nhãn và dựng `HANG_RA` của tệp gốc thành hàm nhận `root`. Bỏ mọi `writeFileSync`, `console.log`, phần sinh `.md`, mã `N….`. Loại `src/shared/bang-tham-chieu*.ts` khỏi `TEP_SHARED` và khỏi `toanChu`, nếu không bảng sẽ tự làm chứng cho chính nó ở điều 5. Bài kiểm tra `lietKeNut` trên mã thật trả hơn 800 nút.

- [ ] **Step 4: Viết `src/shared/bang-tham-chieu.ts` và `scripts/bang-tham-chieu-lib.mjs`**

Điều 2 lấy tập tên đã khai từ `nhan` của các nút có khoá nằm trong `noiDat`, rồi xét các nút có khoá không nằm trong `noiDat` lẫn `boQua`; so từng phần tử `nhan` đã chuẩn hoá. Câu lỗi nói rõ phải làm gì: sửa nút về tên chuẩn, hay chủ đã chọn tên mới thì sửa bảng cùng lần lưu, hay khai dòng `cho-chon`.

- [ ] **Step 5: Chạy cho xanh**

Run: `node --test src/bang-tham-chieu.test.ts`
Expected: PASS.

- [ ] **Step 6: Lưu lại**

```bash
git add scripts/quet-nut-lib.mjs scripts/bang-tham-chieu-lib.mjs src/shared/bang-tham-chieu.ts src/bang-tham-chieu.test.ts
git commit -m "Bảng tham chiếu ngôn ngữ: bộ quét nút và các phép kiểm"
```

### Task 2: Nạp 298 việc và 74 mục bỏ qua, điều 1, 3, 4 xanh trên mã thật

**Files:**
- Create: `docs/evidence/2026-11-04-bang-tham-chieu/nap-mot-lan.mjs` (chạy một lần, giữ làm bằng chứng)
- Create: `src/shared/bang-tham-chieu-viec.ts` (máy sinh một lần, từ đó sửa tay): `VIEC_QUAN_TRONG`, `BO_QUA`
- Modify: `src/bang-tu-giao-dien.test.ts:76` (thêm `src/shared/bang-tham-chieu-viec.ts` vào `NGOAI_LE` vì bảng phải ghi cả chữ đã loại và không trang nào hiện nó, sửa chú thích dòng 75; `kiemKhongDungChuLoai` canh phần tên thay cho bài này)
- Test: `src/bang-tham-chieu.test.ts`

**Interfaces:**
- Consumes: `lietKeNut`, `khoaNut`, `laUngVien`, `duongTrongMa`, các hàm `kiem*` của Task 1
- Produces: `VIEC_QUAN_TRONG: readonly ViecQuanTrong[]`, `BO_QUA: readonly MucBoQua[]`

- [ ] **Step 1: Thêm bài trên dữ liệu thật, thấy đỏ**

Bài `bảng khớp mã: điều 1, 3, 4`: gọi `kiemNoiDat`, `kiemUngVien`, `kiemDuong` trên dữ liệu thật, `assert.deepEqual(loi, [])`, thông báo in tối đa 30 dòng đầu. Bài `không tệp nào ngoài bài kiểm và kịch bản nạp bảng`: quét `import` trong `web/**`, `src/**` trừ `*.test.ts`, không tệp nào trỏ tới `bang-tham-chieu`.

Run: `node --test src/bang-tham-chieu.test.ts`
Expected: FAIL vì chưa có `src/shared/bang-tham-chieu-viec.ts`.

- [ ] **Step 2: Viết và chạy kịch bản nạp**

Nguồn: `nut-quan-trong.json` (`hang`, `bo_qua`) và `danh-sach-day-du.json` cùng thư mục hồ sơ. Với mỗi hàng:
- `noiDat`: mỗi `ma_may` tra ra dòng trong danh sách đầy đủ, dựng `{ tep, chu: khoaNut(dòng) }`, bỏ trùng, rồi áp bảng đổi khoá dưới đây.
- `duongLenh`: `api` của các dòng đó, bỏ phần `?…`, chỉ giữ đường có trong `duongTrongMa`. Hàng `ghi_du_lieu` mà còn rỗng (đo thử: 86 hàng): với mỗi `nguon` thuộc `src/`, đọc tệp đó ở lần lưu `8a031e28` (lần lưu của hồ sơ rà soát, dòng trong `nguon` đúng ở bản đó) bằng `git show`, lấy `route(` gần nhất phía trên dòng ghi trong nguồn.
- `maNhatKy`: tách `nhat_ky` theo ` · `, ` / `, `, rồi`, bỏ phần ngoặc cuối, đối chiếu `AUDIT_ACTIONS[...].label`.
- `trangThai`, `nguonTen`: hàng thuộc 12 tên là `da-chot`, `ADR-0166 câu N`; `ket_luan === "dung"` là `da-chot`, `rà soát 2026-11-04: tên đúng`; còn lại là `cho-chon`, `rà soát 2026-11-04: chưa rõ, chờ chủ`. Hàng `cho-chon` dùng chữ đang hiện làm tên.
- `ten`, `thatSuLam`, `hoiLai`, `hoanTac`, `nhom`, `manHinh`: lấy từ `ten`, `that_su_lam`, `xac_nhan`, `dao_nguoc`, `nhom`, `man_hinh`; `ten` của 12 hàng đổi thì dùng tên mới.

Bảng đổi khoá (đo trên 447440cf; `web/parties.ts` đã đọc tay ở dòng 818, 876):

| Tệp | Khoá cũ | Khoá mới |
|---|---|---|
| `web/order.ts` | Khách đã chuyển khoản | Ghi khoản thu này |
| `web/xac-nhan-don-ui.ts` | Gửi xác nhận | Gửi kiểm vé |
| `web/xac-nhan-don-ui.ts` | Còn vé | Còn vé, xác nhận đơn |
| `public/order-form.html` | Lưu, chờ xác nhận | Lưu đơn (chưa xác nhận) |
| `web/ve-don.ts` | Chuẩn bị ‹…› vé để gửi | Mở ‹…› vé để gửi khách |
| `web/hoa-hong-cap.ts` | Thêm vai trò vào cấp này | Gán cho vai trò; thêm nơi đặt «Gán cho đối tác» |
| `web/luat-ban.ts` | Hẹn ngày kết thúc | Đặt ngày kết thúc |
| `web/luat-ban.ts` | Hẹn kết thúc | Đặt ngày kết thúc |
| `web/nguoi-ban.ts` | Đóng | Ngừng điều khoản |
| `web/nguoi-ban.ts` | macDinh ? "Vẫn đóng" : "Đóng điều khoản" | macDinh ? "Vẫn ngừng" : "Ngừng điều khoản" |
| `web/phan-dinh.ts` | Đòi được khách / huỷ khoản | Ghi khoản thu đòi được |
| `web/chuyen.ts` | Cứu hộ | Kết thúc gián đoạn (xe hỏng) |
| `web/dieu-kien-xuat-ben.ts` | Đóng điều kiện | Ngừng điều kiện |
| `web/catalog.ts` | Bỏ ghi đè | Bỏ ghi đè giá |
| `web/catalog.ts` | Quay ‹…› về giá theo Sheet? | ⟪CAU_HOI_BO_GHI_DE_GIA(it.code, it.hidden)⟫ |
| `web/catalog.ts` | Hiện lại / Ẩn | Mở bán lại / Ngừng bán |
| `web/parties.ts` | Lưu cấp riêng | Lưu |
| `web/parties.ts` | Áp dụng cấp riêng | Chọn cấp riêng cho đối tác |

Câu 9, liên hệ: hàng đóng liên hệ ở `web/parties.ts` thêm nơi đặt «Ngừng dùng». ADR-0166 lệch `QUYET-DINH-CHU.md` thì tin tệp sau và ghi vào danh sách báo chủ.

Kịch bản in ra `docs/evidence/2026-11-04-bang-tham-chieu/chua-noi.txt`: hàng ghi dữ liệu chưa có đường, nhãn nhật ký chưa khớp. Người thi công đọc mã nối tay những hàng rõ; hàng không rõ để mảng rỗng, không đoán.

- [ ] **Step 3: Xử lý phần còn đỏ**

Nút ứng viên mới từ các bản nhập sau lần đo và chỗ còn sót: có quyết định đã duyệt thì khai `da-chot` với `nguonTen` ghi số ADR; không có thì khai `cho-chon`. Máy coi nhầm thì thêm `BO_QUA` kèm lý do. Không sửa chữ nút nào.

- [ ] **Step 4: Chạy cho xanh**

Run: `node --test src/bang-tham-chieu.test.ts src/bang-tu-giao-dien.test.ts && npm run typecheck`
Expected: PASS, typecheck 0 lỗi.

- [ ] **Step 5: Lưu lại**

```bash
git add docs/evidence/2026-11-04-bang-tham-chieu src/shared/bang-tham-chieu-viec.ts src/bang-tu-giao-dien.test.ts src/bang-tham-chieu.test.ts
git commit -m "Bảng tham chiếu ngôn ngữ: nạp 298 việc quan trọng và mục bỏ qua"
```

### Task 3: Chữ dùng chung, khái niệm, bản đọc; điều 2, 5, 6 xanh

**Files:**
- Create: `src/shared/bang-tham-chieu-khai-niem.ts`: `KHAI_NIEM`, `CHU_DUNG_CHUNG`
- Create: `scripts/gen-bang-tham-chieu.mjs`
- Create: `docs/BANG-THAM-CHIEU.md` (máy sinh)
- Create: `docs/evidence/2026-11-04-bang-tham-chieu/DANH-SACH-TRINH-CHU.md`
- Modify: `package.json` (thêm `"tham-chieu": "node scripts/gen-bang-tham-chieu.mjs"`), `src/bang-tu-giao-dien.test.ts:76` (thêm `src/shared/bang-tham-chieu-khai-niem.ts` vào `NGOAI_LE`, cùng lý do)
- Test: `src/bang-tham-chieu.test.ts`

**Interfaces:**
- Consumes: `kiemTenLacCho`, `kiemHuongDan`, `kiemKhaiNiem`, `kiemKhongDungChuLoai`, `renderBangThamChieu`, `VIEC_QUAN_TRONG`, `BO_QUA`
- Produces: `KHAI_NIEM: readonly KhaiNiem[]`, `CHU_DUNG_CHUNG: readonly ChuDungChung[]`, lệnh `npm run tham-chieu`

- [ ] **Step 1: Thêm bài trên dữ liệu thật, thấy đỏ**

Bài cho điều 2, điều 5, `kiemKhaiNiem`, `kiemKhongDungChuLoai`, đều `deepEqual(loi, [])`; bài `docs/BANG-THAM-CHIEU.md khớp bản sinh (chạy npm run tham-chieu)` theo khuôn `src/architecture.test.ts:400`. Bài `có mỗi trạng thái đơn và mười quyền`: `KHAI_NIEM` có đủ nhãn của `STATUS_LABEL`, `NHAN_DANG_CHO_XAC_NHAN`, và `PERMISSION_LABEL`.

Run: `node --test src/bang-tham-chieu.test.ts`
Expected: FAIL vì chưa có `src/shared/bang-tham-chieu-khai-niem.ts`.

- [ ] **Step 2: Soạn `CHU_DUNG_CHUNG`**

Một chữ chỉ vào loại này khi người đọc thấy đối tượng ngay cạnh nút, trong tiêu đề hộp hoặc dòng đang xem. Đo thử ra các tên: Đóng (19 nút), Huỷ (13), Quay lại (8), Thôi (7), Thử lại (4), Gửi yêu cầu (4), Lưu (2), Đổi (2), Sửa giá (2), Đổi tên, Tắt, Bật, Dùng lại, Gỡ, Để sau, Ngừng dùng, Chọn cấp riêng cho đối tác. Đọc từng chỗ trong mã:
- Cùng một việc thì thêm `noiDat` vào hàng đó («Chọn cấp riêng cho đối tác», «Ngừng dùng» của xe).
- Có đối tượng ngay cạnh thì vào `CHU_DUNG_CHUNG`, cột `vi` nói vì sao. «Đóng» chỉ nghĩa gập khung.
- Khác việc, không thấy đối tượng thì đó là lỗi thật: khai hàng `cho-chon` với chữ đang hiện, ghi vào danh sách trình chủ, không tự đặt tên. Đọc kỹ «Gửi yêu cầu» và «Sửa giá».

- [ ] **Step 3: Soạn `KHAI_NIEM`**

Nạp từ cột `thay` của `TU_DA_LOAI`, bảng `docs/SYSTEM-DESIGN.md` §15 (cột định danh mã vào `maNoiBo`), trạng thái đơn, mười quyền, các khái niệm tiền. Giải nghĩa một câu, lời thường, có `khacVoi` khi có khái niệm gần. `chuChon` ghi ngày và nguồn chủ chọn; không tìm được ngày thì `cho-chon`. Chỗ ADR lệch mã, hoặc các nơi gọi khác nhau (kể cả phụ lục B của `playbook/FRAMEWORK.md`, chỉ đọc), ghi vào `DANH-SACH-TRINH-CHU.md`.

- [ ] **Step 4: Viết bản sinh**

`renderBangThamChieu` xếp: Khái niệm (bảng), Chữ dùng chung, Việc chờ chọn, Việc quan trọng theo `nhom`, Mục bỏ qua. Đầu tệp ghi «do máy sinh, đừng sửa tay; sửa ở `src/shared/bang-tham-chieu*.ts` rồi chạy `npm run tham-chieu`». Có một đoạn giới hạn: máy kiểm tên có nhất quán, không kiểm có đúng sự thật; hai nút cùng chữ trong một tệp tính là một nơi đặt.

Run: `npm run tham-chieu && node --test src/bang-tham-chieu.test.ts src/bang-tu-giao-dien.test.ts && npm run typecheck`
Expected: PASS, typecheck 0 lỗi.

- [ ] **Step 5: Lưu lại**

```bash
git add src/shared/bang-tham-chieu-khai-niem.ts scripts/gen-bang-tham-chieu.mjs docs/BANG-THAM-CHIEU.md docs/evidence/2026-11-04-bang-tham-chieu package.json src/bang-tu-giao-dien.test.ts src/bang-tham-chieu.test.ts
git commit -m "Bảng tham chiếu ngôn ngữ: khái niệm, chữ dùng chung, bản đọc cho người"
```

### Task 4: Luật và hàng rào; quan sát chặn thật sáu điều

Làm sau cùng, vì từ đây sửa tệp bảng sẽ hỏi chủ.

**Files:**
- Modify: `.claude/settings.json` (`permissions.ask` thêm `Edit(src/shared/bang-tham-chieu*.ts)`), `.claude/hooks/guard-luat-lib.mjs:18-20`
- Modify: `CLAUDE.md` §1 (trỏ từ vựng), §6, §7; `src/CLAUDE.md`; `web/CLAUDE.md`
- Modify: `docs/ARCHITECTURE.md` (điều 5.27 sau 5.26, dòng trạng thái, dòng thi hành ở Điều 6)
- Modify: `docs/SYSTEM-DESIGN.md` §15, `docs/SO-HANG-RAO.md`, `docs/CHANGE-GUIDE.md`
- Test: `src/claude-guard-luat.test.ts`

**Interfaces:**
- Consumes: mọi thứ ở Task 1–3

- [ ] **Step 1: Bài đỏ cho hook**

Thêm ca vào `src/claude-guard-luat.test.ts`: `sed -i '' s/a/b/ src/shared/bang-tham-chieu-viec.ts` bị chặn; `echo x > src/shared/bang-tham-chieu-khai-niem.ts` bị chặn; `node scripts/gen-bang-tham-chieu.mjs` và `cat src/shared/bang-tham-chieu-viec.ts` được qua.

Run: `node --test src/claude-guard-luat.test.ts`
Expected: FAIL ở các ca chặn.

- [ ] **Step 2: Sửa hook và quyền**

`LUAT` thêm `/^src\/shared\/bang-tham-chieu(?:-[a-z-]+)?\.ts$/`; `TU_KHOA` thêm `bang-tham-chieu`. Sửa bằng công cụ Edit để chủ được hỏi. Nếu công cụ bị chặn ghi vào `.claude/hooks`, ghi đề xuất thành bản diff trong thư mục bằng chứng và trình chủ, không tìm đường vòng.

Run: `node --test src/claude-guard.test.ts src/claude-guard-luat.test.ts src/claude-guard-tep.test.ts`
Expected: PASS.

- [ ] **Step 3: Quan sát chặn thật sáu tiêu chí**

Mỗi phép: sửa cố ý, chạy `node --test src/bang-tham-chieu.test.ts`, chép câu đỏ, hoàn nguyên, thấy xanh lại.
1. Đổi chữ «Gửi kiểm vé» ở `web/xac-nhan-don-ui.ts`: đỏ, nêu đúng nút, đúng tên chuẩn.
2. Thêm `h("button", null, "Gửi kiểm vé")` ở một tệp khác: đỏ. Thêm `h("button", null, "Lưu")`: không đỏ.
3. Thêm nút mới gọi `api(…, { method: "POST" })` không khai: đỏ. Khai dòng `cho-chon`: xanh.
4. Khai sai đường lệnh, rồi sai mã nhật ký: đỏ.
5. `node --test src/goi-trang-nhe.test.ts` xanh, số trần không đổi; thử thêm `import` bảng vào một trang: bài `không tệp nào…` đỏ.
6. Xoá `chuChon` của một khái niệm `da-chot`: đỏ.

- [ ] **Step 4: Ghi luật và tài liệu**

- `docs/ARCHITECTURE.md`: điều ***5.27 Mỗi khái niệm một tên, mỗi tên một nghĩa, tra từ một nguồn***, ghi nguồn tại `src/shared/bang-tham-chieu*.ts`, ADR-0167; dòng thi hành ghi bài kiểm, ngày quan sát, và phần dựa vào kỷ luật (chủ có chọn thật hay không, cột «thật sự làm gì»). Làm theo khuôn lần lưu `1248b278` của điều 5.26.
- `docs/SO-HANG-RAO.md`: một dòng cho `src/bang-tham-chieu.test.ts`, một dòng cho hook; chép phép thử và câu đỏ từ Step 3.
- `docs/SYSTEM-DESIGN.md` §15: thay bảng bằng câu trỏ về `docs/BANG-THAM-CHIEU.md`, sau khi kiểm mọi dòng đã có trong `KHAI_NIEM`.
- `docs/CHANGE-GUIDE.md`: công thức «viết, sửa chữ giao diện»: tra bảng; không có thì đưa 2–3 tên cho chủ; đổi tên thì sửa nút và bảng cùng lần lưu, rồi `npm run tham-chieu`.
- `CLAUDE.md` §1, §6, §7, `src/CLAUDE.md`, `web/CLAUDE.md`: mỗi nơi một dòng cùng ý. Bản viết lại `CLAUDE.md` của ADR-0160 chưa nhập, nên chỉ thêm dòng, không đổi các dòng khác, để lần nối sau không vướng nhiều.

- [ ] **Step 5: Kiểm toàn bộ**

Run: `npm run typecheck && npm test`
Expected: typecheck 0 lỗi; `npm test` thoát 0, in `bước 1 thoát 0, bước 2 thoát 0`. Không chạy chồng lên lệnh nhập hay lệnh triển khai nào đang chạy (`pgrep -fl 'scripts/(day-le[n]|trien-kha[i]).mjs'`).

- [ ] **Step 6: Lưu lại**

```bash
git add .claude/settings.json .claude/hooks/guard-luat-lib.mjs CLAUDE.md src/CLAUDE.md web/CLAUDE.md docs/ARCHITECTURE.md docs/SYSTEM-DESIGN.md docs/SO-HANG-RAO.md docs/CHANGE-GUIDE.md src/claude-guard-luat.test.ts
git commit -m "Bảng tham chiếu ngôn ngữ: điều 5.27, hỏi quyền khi sửa bảng, sổ hàng rào"
```

### Sau khi thi công

Người kiểm độc lập `nguoi-kiem-doc-lap` đọc một vòng, tự chạy lại bộ kiểm và ít nhất hai phép ở Step 3 của Task 4. Trình chủ một lần: phần giải nghĩa khái niệm của `docs/BANG-THAM-CHIEU.md` và `DANH-SACH-TRINH-CHU.md`. Bản này không đổi gì trên giao diện nên không cần mục nhật ký thay đổi và không cần triển khai; đưa chủ lệnh nhập, nói rõ «không cần triển khai».

## Chỗ làm khác kế hoạch (ghi lúc thi công, 2026-11-04)

- Thêm `kiemTenNhieuHang` và `TEN_NHIEU_HANG`: đặc tả đòi xếp loại mọi tên trùng nhóm việc, kế hoạch chỉ phủ điều 2 nên 46 tên còn để ngỏ.
- Thêm trạng thái khái niệm `trong-ma`: §15 có các thuật ngữ không hiện cho người dùng, không cần chủ chọn tên, và bản đọc tách khỏi phần chủ đọc.
- Phá thử chạy TRƯỚC khi bật hook, vì sau đó sửa tệp bảng bằng dòng lệnh bị chặn.
- Hook trong phiên thật chưa thấy chặn: phiên dùng móc ở thư mục gốc. Xem dòng ở `docs/SO-HANG-RAO.md`; phải thử lại sau khi nhập.
- Bỏ ca `python -c` khỏi bài hook: đó là giới hạn đã ghi của `guard-luat-lib.mjs`.
- Sau người kiểm độc lập (cùng ngày), bốn việc ngoài kế hoạch:
  - Thêm trạng thái hàng việc `ten-hien-tai` và phép kiểm `kiemNguonTen`: 171 hàng ghi «đã chốt» chỉ vì AI rà soát thấy tên đúng, chủ chưa chọn riêng. Đặc tả nói hai trạng thái; ghi ba để không gắn nhầm lời chủ. Năm khái niệm hạ về `cho-chon`: Hồ sơ, Tài khoản, Không huỷ, Bỏ đánh dấu, Khoản hoàn tiền.
  - Lọc cột đường lệnh: bản đầu chép kết quả quét nên có đường mà nút không gọi. 93 hàng rút gọn; 22 hàng xem tay; 8 hàng không chắc để trống; 75 hàng một đường giữ nguyên vì máy không đối chiếu được; 11 hàng lấy đường có mặt ở vùng xử lý của nút, có thể là đường đọc. Vì vậy cột này chỉ dùng để tìm mã (nợ ở `BL-THAM-CHIEU-DOT-2`).
  - Trạng thái thứ ba là quyết định của người thi công, đảo ngược được; ADR-0167 và đặc tả đã duyệt không sửa.
  - Bộ quét nhận thêm hai dạng lệnh ghi (tham số của hàm bọc, `method` là biến); lộ ra 9 nơi đặt chưa khai, thành 3 hàng `cho-chon`.
  - Thêm ba tệp máy canh vào danh sách hỏi quyền, vì nới bài kiểm cũng là đổi luật.
- Người kiểm báo «thiếu khuôn mã đơn» là báo nhầm: khái niệm «Đơn» có ghi bằng lời («TD-năm tháng ngày-số thứ tự»).
