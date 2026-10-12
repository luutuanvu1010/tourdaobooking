# Kế hoạch thi công: QR thanh toán VietQR + mã giao dịch ngân hàng (ADR-0092 Đ6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người bán mở đơn, bấm "QR thanh toán" để khách quét chuyển khoản vào tài khoản công ty; Kế toán xác nhận tiền về kèm mã giao dịch ngân hàng, Nền tảng chặn một khoản chuyển bị xác nhận hai lần.

**Architecture:** Máy chủ dựng chuỗi VietQR bằng một hàm thuần ở `src/shared/vietqr.ts`; route đọc QR nằm ở module `receipt` (hạng không bảng) và gọi ba hàm công bố: `orders.donChoBienNhan`, `billing.soTienChoQr`, `parties.taiKhoanNhanTienHienHanh`. Tài khoản nhận tiền là bảng có hiệu lực của `parties` (`pty_bank_account`). Mã giao dịch là bảng nối chỉ-thêm của `billing` (`bil_receipt_bank_txn`), có ba luật chặn ở cả máy chủ lẫn trigger. Trình duyệt chỉ vẽ ma trận QR lên `<canvas>` bằng tệp MIT chép nguyên (`web/vendor/qrcode.js`).

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), giao diện thuần dựng bằng `h()`, esbuild, `node --test` (Node 22), khung thử `tests/audit/harness.mjs`.

**Chủ dự án duyệt 2026-10-08:** kế hoạch "Duyệt"; cách thi công "Mỗi bước một trợ lý" (subagent-driven); "Cho phép" tải `qrcode-generator@2.0.4` (MIT, registry npm) để chép một tệp — đây là lời cho phép tải ở Task 9 Bước 1, áp đúng phiên bản này.

**Spec:** `docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md` (ĐÃ DUYỆT) + `docs/adr/ADR-0108-qr-thanh-toan-vietqr.md` (accepted) + `docs/superpowers/specs/2026-10-08-qr-thanh-toan/trang-ghep.md`. Người thi công đọc cả ba trước Task 1.

## Global Constraints

- **Không thêm dependency runtime.** `package.json` không đổi. Mã bên thứ ba duy nhất là `web/vendor/qrcode.js` (qrcode-generator, Kazuhiko Arase, MIT), **chép nguyên**, chỉ tải khi chủ dự án đồng ý trong chat (Task 9).
- **Migration:** chỉ thêm tệp mới. Số dự kiến `0087` (parties) và `0088` (billing). Task 0 kiểm lại "lớn nhất trên mọi nhánh + 1"; đổi số thì bài kiểm tự tìm tệp theo đuôi tên, không phải sửa bài.
- **Tiền:** `INTEGER` VNĐ. "Còn lại" chỉ lấy từ hàm `conLai` (qua `tienNhieuDon`), không tự trừ.
- **Câu chữ nguyên văn của đặc tả:** "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống" · "Đơn đã giao — không thu thêm" · "Đơn không còn tiền cần thu". Câu lỗi nói "người phụ trách hệ thống", **không** nói "Toàn quyền" (vai ẩn).
- **Nội dung chuyển khoản** = mã đơn bỏ mọi ký tự ngoài `[A-Z0-9]`: `TD-20261008-0012` → `TD202610080012`.
- **Số tiền trên QR và ảnh lưu** in theo đặc tả `1.000.000đ` (không dùng `vnd()` có `₫` ở hai chỗ này).
- **Nhật ký** không chép số tài khoản, không chép mã giao dịch, không SĐT/email/MST. `detail` của hai hành động mới **chỉ là chữ cố định**, không kèm mã dòng (UUID ngẫu nhiên đôi khi có dãy ≥ 8 chữ số, giống SĐT); mã của đối tượng để ở `target_type`/`target_id`.
- **Không đổi CSP** (`public/_headers`); trình duyệt không gọi tên miền ngoài.
- **Đ6 không thêm route mới** (trang ghép §0, trần 3 quyết định). "Điền sẵn số thực chuyển đã biết" đi qua lỗi 409 mang số đó, không qua route tra mã.
- **Mã giao dịch:** chuẩn hoá NFKC → bỏ dấu cách, `-`, `.`, `/` → in hoa → phải khớp `^[A-Z0-9]{4,40}$`. Ô mã **được miễn** luật chặn dãy ≥ 8 chữ số; ghi chú và lý do vẫn chặn.
- **Bắt buộc mã (C1)** khi: hình thức `BANK_TRANSFER` **và** người thu vai `COMPANY` **và** người ghi có `ledger.write` (cùng vị từ mà `sinhDongLanThu` trả rỗng, tức không sinh dòng giữ hộ). Riêng đường 1 ("Công ty đã nhận") so `created_at` của lần thu với mốc cắt `R-BIL-D6`.
- **Giao diện:** không `innerHTML`; dựng bằng `h()`; giá trị CSS là token ở `:root` của `public/app.css` (không màu mới); ô gõ 16px. Thêm nhãn `h2/h3/button` thì `npm run build:web` sinh lại `src/shared/so-do-trang.ts` và **phải commit** tệp đó.
- **Route mới:** `GET/PUT /api/parties/:id/tai-khoan-nhan-tien` (office) và `GET /api/orders/:id/qr-thanh-toan` (orders). Số đếm `src/route-access.test.ts` = số trên `main` lúc thi công + 3 (hôm nay 253 → 256).
- **Lệnh cấm AI tự chạy** (CLAUDE.md §8): `git push`, merge `main`, `wrangler deploy/rollback/secret`, `d1 migrations apply --remote`, ghi D1 remote, `curl` ghi production, `--force`.
- **Mỗi task kết thúc** với `npm run typecheck` 0 lỗi và `npm test` xanh, rồi commit. Thông điệp commit tiếng Việt có dấu, kết bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Việc lớn** (tiền, quyền, dữ liệu): người thi công không tự nghiệm thu. Cuối kế hoạch có người kiểm độc lập chỉ đọc (Task 13).

## Review Focus

1. **Số tiền QR gõ lạ trên đường dẫn** (`1e6`, `700000.0`, ` 700000`, `+5`, `-1`, `0x10`, số lớn hơn còn lại): người dùng chờ câu 400 tiếng Việt, không phải mã sai số tiền. Ghim ở Task 5 (bài thuần `kiemSoTienQr` + bài route).
2. **Mã giao dịch gõ lạ** (chữ số toàn khổ `１２３４`, chữ có dấu `Đ`, toàn dấu phân cách `--..`, dưới 4 ký tự, có dấu cách giữa): người dùng chờ hoặc được chuẩn hoá đúng, hoặc nhận câu 400 rõ ràng, không bị lặng lẽ cắt chữ. Ghim ở Task 7 Bước 1.
3. **Hai Kế toán bấm "Công ty đã nhận" cùng lúc** cho cùng một khoản: một người 200, người kia 409, không ai nhận 500. Ghim ở Task 7 (bài route `Promise.all`).
4. **Đổi công ty chủ sang hồ sơ chưa cài tài khoản**: QR trả 409 đúng câu, không dùng tài khoản công ty cũ. Ghim ở Task 5.
5. **Khoản chuyển khoản khai trước ngày phát hành** (trước mốc cắt) vẫn xác nhận được mà không cần mã; nếu Kế toán nhập mã thì vẫn gắn và kiểm luật. Ghim ở Task 7.

---

## Bản đồ tệp

| Tệp | Tạo/Sửa | Trách nhiệm |
|---|---|---|
| `src/shared/vietqr.ts` (+ `.test.ts`) | Tạo | CRC-16, dựng payload VietQR, kiểm đầu vào |
| `src/shared/noi-dung-chuyen-khoan.ts` (+ `.test.ts`) | Tạo | mã đơn ↔ nội dung chuyển khoản; nhận diện mã đơn trong chữ tìm |
| `src/shared/qr-thong-tin.ts` (+ `.test.ts`) | Tạo | các dòng in dưới mã QR (danh sách trắng), định dạng `1.000.000đ` |
| `src/modules/orders/index.ts` | Sửa | ô tìm đơn nhận nội dung chuyển khoản |
| `migrations/0087_pty_tai_khoan_nhan_tien.sql` | Tạo | `pty_bank` + gieo, `pty_bank_account` + trigger |
| `migrations/0088_bil_ma_giao_dich.sql` | Tạo | `bil_receipt_bank_txn` + trigger ba luật + hai trigger "bắt buộc" + mốc cắt |
| `src/modules/parties/tai-khoan-nhan-tien.ts` (+ `.test.ts`) | Tạo | luật thuần đọc thân tài khoản, chuẩn hoá tên chủ tài khoản |
| `src/modules/parties/repository.ts`, `index.ts` | Sửa | SQL tài khoản; hàm công bố; hai route |
| `src/modules/billing/ma-giao-dich.ts` (+ `.test.ts`) | Tạo | luật thuần Đ6: chuẩn hoá, đọc, ba luật chặn |
| `src/modules/billing/repository.ts`, `service.ts`, `thay-lan-thu.ts`, `index.ts` | Sửa | SQL mã; nối bốn đường ghi; DTO; `soTienChoQr` |
| `src/modules/receipt/rules.ts`, `index.ts` | Sửa | luật số tiền QR + dựng DTO; route QR |
| `src/shared/contracts.ts`, `audit-actions.ts`, `tro-ly-cau-truc-ten.ts` | Sửa | kiểu DTO; hai hành động nhật ký; nhãn ô `company.legal.write` |
| `scripts/audit-checks.mjs` | Sửa | luật `R-BIL-D6a`, `R-BIL-D6b` |
| `web/vendor/qrcode.js`, `web/vendor/qrcode.d.ts` | Tạo | bộ vẽ ma trận QR (chép nguyên) + khai kiểu tối thiểu |
| `web/qr-ve.ts`, `web/luu-anh.ts` | Tạo | vẽ QR lên canvas, dựng ảnh PNG; lưu hoặc chia sẻ ảnh |
| `web/order.ts`, `web/parties.ts`, `public/app.css` | Sửa | nút/bảng QR, ô mã của Kế toán; mục tài khoản nhận tiền; token `--w-qr` |
| `docs/data-dictionary.json` (+ `npm run dict`) | Sửa | ba bảng mới |
| bài kiểm mới ở `src/` (liệt kê trong từng task), `tests/e2e/qr-thanh-toan.mjs`, `docs/evidence/2026-10-08-qr/kich-ban/qr-smoke.mjs` | Tạo | kiểm hành vi |
| `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/SO-HANG-RAO.md`, `docs/quyen-hoan.json`, `docs/BACKLOG.md` | Sửa | tài liệu mô tả, sổ hàng rào, ghi chú G4 |
| `docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md` | Tạo | sổ điều phối thi công (ruling, nợ, quan sát chặn thật) |

---

### Task 0: Kiểm trước khi thi công (không sửa mã)

**Files:**
- Create: `docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md`

- [ ] **Bước 1: Đưa nhánh lên `main` mới nhất.** Gọi công cụ `sync_with_base_branch` của ứng dụng (không `git merge` tay). Giải xung đột nếu có.

- [ ] **Bước 2: Chốt số migration.** Chạy:

```bash
ls migrations | tail -3; for b in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes); do git ls-tree --name-only "$b" migrations/ 2>/dev/null; done | sort -u | tail -5
```

Kỳ vọng: số lớn nhất là `0086` (nhánh `a3-tin-don-doi`). Nếu đã có số cao hơn, dùng (lớn nhất + 1) và (lớn nhất + 2) thay cho `0087`/`0088` ở mọi task; ghi vào sổ thi công.

- [ ] **Bước 3: Chốt số route hiện có.** Chạy `grep -n "assert.equal(actual.length" src/route-access.test.ts`. Ghi số N vào sổ thi công; đích cuối là N + 3.

- [ ] **Bước 4: Ghi điều kiện phát hành.** Đọc đầu đặc tả: phát hành chỉ khi migration 0078–0083 đã lên production. Ghi vào sổ thi công rằng điều này **kiểm lúc phát hành bằng lệnh chỉ đọc**, không kiểm bây giờ.

- [ ] **Bước 5: Tạo sổ thi công** với khung sau rồi commit:

```markdown
# Sổ thi công — QR thanh toán + Đ6 (kế hoạch 2026-10-08-qr-thanh-toan-ke-hoach.md)

| Ngày | Task | Việc / ruling / nợ | Bằng chứng |
|---|---|---|---|
| 2026-10-0x | 0 | Số migration chốt: 0087, 0088. Số route trên main: N. | lệnh Bước 2–3 |

## Quan sát chặn thật (P16)
| Hàng rào | Đột biến cố ý | Thông báo đỏ | Hoàn nguyên |
|---|---|---|---|
```

```bash
git add docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md
git commit -m "Mở sổ thi công QR thanh toán: chốt số migration và số route

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Hàm thuần VietQR + nội dung chuyển khoản

**Files:**
- Create: `src/shared/vietqr.ts`, `src/shared/vietqr.test.ts`
- Create: `src/shared/noi-dung-chuyen-khoan.ts`, `src/shared/noi-dung-chuyen-khoan.test.ts`

**Interfaces:**
- Produces: `crc16(s: string): string`; `payloadVietQr(i: { bin: string; soTaiKhoan: string; soTien: number; noiDung: string }): { ok: true; payload: string } | { ok: false; loi: string }`; `noiDungChuyenKhoan(maDon: string): string`; `maDonTuNoiDung(q: string): string | null`.

- [ ] **Bước 1: Viết bài đỏ cho VietQR**

`src/shared/vietqr.test.ts`:

```ts
// Payload VietQR (ADR-0108 đ3; đặc tả QR §7, §8.5). Sổ vàng:
//  - chuỗi CÔNG KHAI: ví dụ trong README của thư viện npm `vietnam-qr-pay` (https://npmjs.org/package/vietnam-qr-pay) — BIN 970416, TK 257678859, 1.000đ,
//    nội dung "Chuyen tien", CRC BBB8;
//  - các chuỗi còn lại TỰ TÍNH bằng một bản Python độc lập cùng thuật toán ở phiên lập kế hoạch (đối chiếu chéo, không phải nguồn công khai).
// Kiểm thật cuối cùng là chủ dự án quét bằng ≥ 2 ứng dụng ngân hàng (§8.6) — bài này không thay được việc đó.
import { test } from "node:test";
import assert from "node:assert/strict";
import { crc16, payloadVietQr } from "./vietqr.ts";

test("CRC-16/CCITT-FALSE: giá trị kiểm chuẩn '123456789' → 29B1", () => {
  assert.equal(crc16("123456789"), "29B1");
});

const vang: [string, Parameters<typeof payloadVietQr>[0], string][] = [
  ["công khai (vietnam-qr-pay)", { bin: "970416", soTaiKhoan: "257678859", soTien: 1000, noiDung: "Chuyen tien" },
    "00020101021238530010A0000007270123000697041601092576788590208QRIBFTTA5303704540410005802VN62150811Chuyen tien6304BBB8"],
  ["tự tính: VCB, 13 số, 700.000đ, mã đơn", { bin: "970436", soTaiKhoan: "0011001234567", soTien: 700_000, noiDung: "TD202610080012" },
    "00020101021238570010A00000072701270006970436011300110012345670208QRIBFTTA530370454067000005802VN62180814TD202610080012630455D9"],
  ["tự tính: MB, 19 số (dài nhất), 1đ", { bin: "970422", soTaiKhoan: "1234567890123456789", soTien: 1, noiDung: "TD202610080012" },
    "00020101021238630010A00000072701330006970422011912345678901234567890208QRIBFTTA5303704540115802VN62180814TD2026100800126304D3D1"],
];
for (const [ten, vao, mong] of vang) {
  test(`sổ vàng — ${ten}: khớp từng ký tự, CRC đúng`, () => {
    const r = payloadVietQr(vao);
    assert.deepEqual(r, { ok: true, payload: mong });
    assert.equal(crc16(mong.slice(0, -4)), mong.slice(-4), "CRC tính trên cả '6304'");
  });
}

test("đầu vào sai → lỗi tiếng Việt, không ném", () => {
  const goc = { bin: "970436", soTaiKhoan: "0011001234567", soTien: 1000, noiDung: "TD1" };
  for (const [sua, mau] of [
    [{ bin: "97043" }, /BIN/], [{ bin: "97043A" }, /BIN/], [{ soTaiKhoan: "123" }, /tài khoản/], [{ soTaiKhoan: "12345678901234567890" }, /tài khoản/],
    [{ soTaiKhoan: "0011-001" }, /tài khoản/], [{ soTien: 0 }, /Số tiền/], [{ soTien: 1.5 }, /Số tiền/], [{ soTien: 10_000_000_000_000 }, /Số tiền/],
    [{ noiDung: "" }, /Nội dung/], [{ noiDung: "x".repeat(26) }, /Nội dung/], [{ noiDung: "Chuyển" }, /Nội dung/],
  ] as const) {
    const r = payloadVietQr({ ...goc, ...sua });
    assert.equal(r.ok, false, JSON.stringify(sua));
    if (!r.ok) assert.match(r.loi, mau);
  }
});
```

- [ ] **Bước 2: Chạy, thấy đỏ.** `node --test src/shared/vietqr.test.ts` → FAIL (không tìm thấy `./vietqr.ts`).

- [ ] **Bước 3: Viết mã**

`src/shared/vietqr.ts`:

```ts
// Payload VietQR — chuẩn EMVCo QR của NAPAS, dịch vụ "chuyển nhanh 24/7 tới tài khoản" (ADR-0108 đ3; đặc tả QR §7). Hàm THUẦN, không I/O, không import
// module: máy chủ dựng chuỗi, trình duyệt chỉ vẽ ma trận. Thứ tự và mã trường:
//   00 "01" (phiên bản) · 01 "12" (mã động — luôn có số tiền) · 38 người nhận {00 "A000000727" (mã VietQR/NAPAS), 01 {00 BIN ngân hàng, 01 số tài khoản},
//   02 "QRIBFTTA" (chuyển tới tài khoản)} · 53 "704" (VNĐ) · 54 số tiền · 58 "VN" · 62 {08 nội dung chuyển khoản} · 63 CRC-16/CCITT-FALSE
//   (đa thức 0x1021, khởi tạo 0xFFFF) tính trên CẢ chuỗi kể cả "6304".
// Sổ vàng ở vietqr.test.ts. Kiểm thật cuối cùng: chủ dự án quét bằng ≥ 2 ứng dụng ngân hàng (§8.6).

export const VIETQR_GUID = "A000000727";
export const VIETQR_DICH_VU_TOI_TAI_KHOAN = "QRIBFTTA";
/** Trường 54 tối đa 13 ký tự. */
const SO_TIEN_TOI_DA = 9_999_999_999_999;

export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Một trường TLV: mã 2 ký tự + độ dài 2 chữ số + giá trị (chỉ ASCII — đã kiểm ở payloadVietQr). */
const truong = (id: string, giaTri: string): string => `${id}${String(giaTri.length).padStart(2, "0")}${giaTri}`;

export interface VietQrInput {
  bin: string;
  soTaiKhoan: string;
  soTien: number;
  noiDung: string;
}

export function payloadVietQr(i: VietQrInput): { ok: true; payload: string } | { ok: false; loi: string } {
  if (!/^\d{6}$/.test(i.bin)) return { ok: false, loi: "BIN ngân hàng phải đủ 6 chữ số." };
  if (!/^\d{4,19}$/.test(i.soTaiKhoan)) return { ok: false, loi: "Số tài khoản chỉ gồm chữ số (4–19 số)." };
  if (!Number.isInteger(i.soTien) || i.soTien < 1 || i.soTien > SO_TIEN_TOI_DA) return { ok: false, loi: "Số tiền phải là số nguyên dương (đồng)." };
  if (!/^[\x20-\x7E]{1,25}$/.test(i.noiDung)) return { ok: false, loi: "Nội dung chuyển khoản phải là chữ không dấu, 1–25 ký tự." };
  const nguoiNhan = truong("00", VIETQR_GUID) + truong("01", truong("00", i.bin) + truong("01", i.soTaiKhoan)) + truong("02", VIETQR_DICH_VU_TOI_TAI_KHOAN);
  const than =
    truong("00", "01") + truong("01", "12") + truong("38", nguoiNhan) + truong("53", "704") + truong("54", String(i.soTien)) + truong("58", "VN") +
    truong("62", truong("08", i.noiDung)) + "6304";
  return { ok: true, payload: than + crc16(than) };
}
```

- [ ] **Bước 4: Chạy, thấy xanh.** `node --test src/shared/vietqr.test.ts` → PASS cả 5 bài.

- [ ] **Bước 5: Đối chiếu trường với tài liệu VietQR chính thức (đặc tả §7).** Mở tài liệu đặc tả kỹ thuật VietQR của NAPAS (bản công bố trên trang vietqr.net hoặc napas.com.vn). Đối chiếu từng mã trường ở chú thích đầu `vietqr.ts`: 00, 01, 38 (00/01/02), 53, 54, 58, 62.08, 63. Ghi tên tài liệu, phiên bản và ngày đối chiếu vào sổ thi công. Lệch ở trường nào thì DỪNG, báo điều phối; không tự sửa sổ vàng cho khớp mã.

- [ ] **Bước 6: Viết bài đỏ cho nội dung chuyển khoản**

`src/shared/noi-dung-chuyen-khoan.test.ts`:

```ts
// Nội dung chuyển khoản = mã đơn bỏ dấu gạch (đặc tả QR §4.2); ô tìm đơn nhận lại nội dung đó (§4.3, §8.9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { maDonTuNoiDung, noiDungChuyenKhoan } from "./noi-dung-chuyen-khoan.ts";

test("mã đơn → nội dung chỉ [A-Z0-9]", () => {
  assert.equal(noiDungChuyenKhoan("TD-20261008-0012"), "TD202610080012");
  assert.equal(noiDungChuyenKhoan("td-20261008-0012"), "TD202610080012");
  assert.match(noiDungChuyenKhoan("TD-BN-1"), /^[A-Z0-9]+$/);
});

test("chữ tìm chứa nội dung chuyển khoản → mã đơn có gạch; chữ khác → null", () => {
  for (const q of ["td202610080012", "TD202610080012", "TD-20261008-0012", "TD20261008-0012", "MBVCB.12345.TD202610080012.CT tu An"]) {
    assert.equal(maDonTuNoiDung(q), "TD-20261008-0012", q);
  }
  for (const q of ["", "-", "0012", "TD2026100800", "Nguyễn Văn An", "0901234567", "TD2026100800123"]) assert.equal(maDonTuNoiDung(q), null, q);
});
```

- [ ] **Bước 7: Chạy, thấy đỏ.** `node --test src/shared/noi-dung-chuyen-khoan.test.ts` → FAIL.

- [ ] **Bước 8: Viết mã**

`src/shared/noi-dung-chuyen-khoan.ts`:

```ts
// Nội dung chuyển khoản của QR thanh toán (ADR-0108 đ3; đặc tả QR §4.2, §4.3): mã đơn bỏ mọi ký tự ngoài chữ in hoa và số. Ô tìm đơn nhận lại chuỗi đó
// (có hay không gạch, hoa hay thường, nằm giữa nội dung ngân hàng in thêm) và đổi về mã đơn chuẩn `TD-YYYYMMDD-NNNN`. Hàm thuần, dùng chung máy chủ.

export const noiDungChuyenKhoan = (maDon: string): string => maDon.toUpperCase().replace(/[^A-Z0-9]/g, "");

// Mã đơn sinh ở orders/rules.ts `orderCodePrefix` + 4 chữ số. Không cho chữ số đứng ngay sau (tránh ăn nhầm một dãy số dài hơn).
const MA_DON_TRONG_CHU = /TD-?(\d{8})-?(\d{4})(?!\d)/i;

/** Có mã đơn nằm trong chữ tìm ⇒ trả mã chuẩn có gạch; không có ⇒ null (ô tìm giữ nguyên chữ người dùng gõ). */
export function maDonTuNoiDung(q: string): string | null {
  const m = MA_DON_TRONG_CHU.exec(q);
  return m ? `TD-${m[1]}-${m[2]}` : null;
}
```

- [ ] **Bước 9: Chạy, thấy xanh.** `node --test src/shared/noi-dung-chuyen-khoan.test.ts` → PASS.

- [ ] **Bước 10: Kiểm toàn bộ rồi commit**

```bash
npm run typecheck && npm test
git add src/shared/vietqr.ts src/shared/vietqr.test.ts src/shared/noi-dung-chuyen-khoan.ts src/shared/noi-dung-chuyen-khoan.test.ts
git commit -m "QR thanh toán: hàm thuần dựng chuỗi VietQR và nội dung chuyển khoản

Dựng payload ở máy chủ bằng một hàm thuần có sổ vàng (một chuỗi công khai, hai chuỗi
tự tính đối chiếu chéo). Nội dung chuyển khoản là mã đơn bỏ gạch để khách và Kế toán
dò sao kê được.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tìm đơn bằng nội dung chuyển khoản

**Files:**
- Modify: `src/modules/orders/index.ts` (chỗ đọc `q` trong `GET /api/orders`, hiện ở đoạn `const phamVi = { q: … }`)
- Test: `src/modules/orders/tim-noi-dung-chuyen-khoan.test.ts`

**Interfaces:**
- Consumes: `maDonTuNoiDung` (Task 1).

Không sửa câu SQL tìm đơn: `tests/audit/query-plan.test.mjs` ghim kế hoạch truy vấn của câu đó. Chỉ đổi chữ tìm trước khi đưa xuống.

- [ ] **Bước 1: Viết bài đỏ**

```ts
// Đặc tả QR §4.3, §8.9: gõ nội dung chuyển khoản (không gạch, hoa/thường, lẫn trong nội dung ngân hàng in) vào ô tìm ⇒ ra đúng đơn.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const AT = "2026-10-08T01:00:00.000Z";

test("tìm 'td202610080012' / nội dung sao kê ⇒ đơn TD-20261008-0012, không lẫn đơn 0013", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  const don = (id: string, ma: string) => w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 0, 0, 0, ?, ?)`).run(id, ma, SALES, AT, AT);
  don("99999999-9999-4999-8999-000000000012", "TD-20261008-0012");
  don("99999999-9999-4999-8999-000000000013", "TD-20261008-0013");
  for (const q of ["td202610080012", "TD202610080012", "TD-20261008-0012", "MBVCB.123.TD202610080012.CT"]) {
    const r = await w.call("GET", `/api/orders?limit=100&q=${encodeURIComponent(q)}`, { as: SALES });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.orders.map((o: { id: string }) => o.id), ["99999999-9999-4999-8999-000000000012"], q);
  }
  // Chữ không phải mã đơn: hành vi cũ (tìm theo tên khách vẫn ra cả hai).
  const ten = await w.call("GET", `/api/orders?limit=100&q=${encodeURIComponent("Khách Giả")}`, { as: SALES });
  assert.equal(ten.json.orders.length, 2);
});
```

- [ ] **Bước 2: Chạy, thấy đỏ.** `node --test src/modules/orders/tim-noi-dung-chuyen-khoan.test.ts` → FAIL ở `td202610080012` (mảng rỗng).

- [ ] **Bước 3: Viết mã.** Trong `src/modules/orders/index.ts`, thêm import:

```ts
import { maDonTuNoiDung } from "../../shared/noi-dung-chuyen-khoan";
```

và đổi dòng `q:` trong `phamVi`:

```ts
      // Đặc tả QR §4.3: chữ tìm chứa nội dung chuyển khoản (mã đơn bỏ gạch) ⇒ tìm theo mã đơn chuẩn; câu SQL không đổi (query-plan.test.mjs ghim nó).
      const qGo = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
      const phamVi = {
        q: maDonTuNoiDung(qGo) ?? qGo,
```

(giữ nguyên các khoá còn lại của `phamVi`).

- [ ] **Bước 4: Chạy, thấy xanh.** Chạy lại bài Bước 1 → PASS.

- [ ] **Bước 5: Kiểm toàn bộ rồi commit**

```bash
npm run typecheck && npm test
git add src/modules/orders/index.ts src/modules/orders/tim-noi-dung-chuyen-khoan.test.ts
git commit -m "Ô tìm đơn nhận nội dung chuyển khoản (mã đơn bỏ gạch)

Kế toán dán nội dung sao kê là ra đúng đơn. Đổi chữ tìm trước khi xuống SQL nên
câu truy vấn và kế hoạch truy vấn đã ghim không đổi.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Migration tài khoản nhận tiền (parties)

**Files:**
- Create: `migrations/0087_pty_tai_khoan_nhan_tien.sql`
- Test: `src/migrations-tai-khoan-nhan-tien.test.ts`
- Modify: `docs/data-dictionary.json` rồi `npm run dict` (bài `src/architecture.test.ts` đòi mọi bảng có dòng, nên phải làm cùng task)

- [ ] **Bước 1: Đối chiếu danh sách ngân hàng.** Chạy (chỉ đọc, ra mạng):

```bash
curl -s https://api.vietqr.io/v2/banks | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const b of JSON.parse(s).data)if(["VCB","ICB","BIDV","VBA","TCB","MB","ACB","VPB","TPB","STB","HDB","VIB","SHB","EIB","MSB","SEAB","OCB","LPB","NAB","BAB","ABB","VCCB","PVCB","KLB","VIETBANK","NCB","SGICB","BVB","PGB","SCB"].includes(b.code))console.log([b.code,b.bin,b.shortName,b.name].join("|"))})'
```

So từng dòng với danh sách gieo ở Bước 3. Lệch BIN nào thì dùng số từ JSON và ghi vào sổ thi công. Ghi rõ trong chú thích migration: nguồn là danh sách công khai của VietQR.io, **không phải** văn bản NAPAS; kiểm thật là chủ quét QR bằng hai ứng dụng ngân hàng (§8.6).

- [ ] **Bước 2: Viết bài đỏ**

`src/migrations-tai-khoan-nhan-tien.test.ts`:

```ts
// Kiểm migration *_pty_tai_khoan_nhan_tien.sql (ADR-0108 đ2; đặc tả QR §4.1, §6). Chèn THẲNG bằng SQL — khoá ở CSDL: (a) chỉ hồ sơ đang là công ty chủ;
// (b) tối đa một tài khoản mở mỗi hồ sơ; (c) chỉ đóng được (valid_to) một lần, không sửa số/tên, không xoá; (d) CHECK số tài khoản, tên chủ tài khoản.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_pty_tai_khoan_nhan_tien.sql"));
const AT = "2026-10-08T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);

function moi(): { db: DatabaseSync; ct: string } {
  const db = new DatabaseSync(":memory:");
  // Áp migration với khoá ngoại TẮT (khuôn các bài migration khác — có migration dựng lại bảng), rồi BẬT để kiểm khoá ngoại của dòng chèn mới.
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("PRAGMA foreign_keys = ON");
  const ct = (db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get() as { party_id: string }).party_id;
  return { db, ct };
}
let n = 0;
const them = (db: DatabaseSync, party: string, o: Partial<{ bank: string; so: string; ten: string }> = {}) => {
  const id = `tk${++n}`;
  run(db, `INSERT INTO pty_bank_account (id, party_id, bank_code, account_number, account_name, valid_from, valid_to, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'sa', ?, 'sa')`, id, party, o.bank ?? "VCB", o.so ?? "0011001234567", o.ten ?? "CONG TY TNHH TOUR DAO", AT, AT, AT);
  return id;
};

test("migration tài khoản nhận tiền có đúng một tệp; ngân hàng gieo đủ, BIN 6 số, không trùng", () => {
  assert.ok(FILE, "thiếu migrations/*_pty_tai_khoan_nhan_tien.sql");
  const { db } = moi();
  const rows = db.prepare("SELECT code, bin FROM pty_bank").all() as { code: string; bin: string }[];
  assert.ok(rows.length >= 30, `chỉ gieo ${rows.length} ngân hàng`);
  assert.equal(new Set(rows.map((r) => r.bin)).size, rows.length, "BIN trùng");
  assert.ok(rows.every((r) => /^\d{6}$/.test(r.bin)));
  // node:sqlite trả hàng KHÔNG có prototype ⇒ so trường, không deepEqual cả hàng với đối tượng thường.
  assert.equal((db.prepare("SELECT bin FROM pty_bank WHERE code = 'VCB'").get() as { bin: string }).bin, "970436");
});

test("(a) chỉ hồ sơ ĐANG là công ty chủ có tài khoản", () => {
  const { db, ct } = moi();
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('khac', 'ORGANIZATION', 'Đại lý Khác', 1, ?, ?)", AT, AT);
  assert.throws(() => them(db, "khac"), /bank_account_not_owner:/);
  them(db, ct);
});

test("(b) tối đa một tài khoản mở mỗi hồ sơ; (c) đóng một lần rồi mở dòng mới được; không sửa số/tên, không mở lại, không xoá", () => {
  const { db, ct } = moi();
  const a = them(db, ct);
  assert.throws(() => them(db, ct), /UNIQUE constraint failed: pty_bank_account\.party_id/);
  assert.throws(() => run(db, "UPDATE pty_bank_account SET account_number = '999999' WHERE id = ?", a), /bank_account_append_only:/);
  assert.throws(() => run(db, "UPDATE pty_bank_account SET account_name = 'KHAC' WHERE id = ?", a), /bank_account_append_only:/);
  run(db, "UPDATE pty_bank_account SET valid_to = ?, updated_at = ?, updated_by = 'sa' WHERE id = ?", AT, AT, a);
  assert.throws(() => run(db, "UPDATE pty_bank_account SET valid_to = NULL WHERE id = ?", a), /bank_account_append_only:/, "không mở lại");
  assert.throws(() => run(db, "DELETE FROM pty_bank_account WHERE id = ?", a), /bank_account_append_only:/);
  them(db, ct, { so: "1234567890" });
});

test("(d) CHECK: số tài khoản chỉ chữ số 4–19; tên chủ tài khoản in hoa không dấu", () => {
  const { db, ct } = moi();
  for (const so of ["123", "12345678901234567890", "0011-001", "ABC12345"]) assert.throws(() => them(db, ct, { so }), /CHECK constraint failed/, so);
  for (const ten of ["Cong ty", "CÔNG TY", "X", "CONG&TY"]) assert.throws(() => them(db, ct, { ten }), /CHECK constraint failed/, ten);
  assert.throws(() => them(db, ct, { bank: "KHONGCO" }), /FOREIGN KEY constraint failed/);
});
```

- [ ] **Bước 3: Chạy, thấy đỏ.** `node --test src/migrations-tai-khoan-nhan-tien.test.ts` → FAIL "thiếu migrations/*_pty_tai_khoan_nhan_tien.sql".

- [ ] **Bước 4: Viết migration**

`migrations/0087_pty_tai_khoan_nhan_tien.sql`:

```sql
-- Migration 0087 — TÀI KHOẢN NHẬN TIỀN CỦA CÔNG TY CHỦ (ADR-0108 đ2; đặc tả docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md §4.1, §6).
-- Module `parties`. Chỉ THÊM: bảng tra cứu ngân hàng + bảng tài khoản (chính sách có hiệu lực, Hiến chương 5.2). Đổi tài khoản = đóng dòng cũ (valid_to) + mở
-- dòng mới trong MỘT lô (route PUT /api/parties/:id/tai-khoan-nhan-tien). Thân trigger chỉ đọc bảng pty_ (module chủ). Câu báo lỗi có tiền tố mã.

-- Ngân hàng Việt Nam (mã, BIN 6 số của NAPAS). Nguồn: danh sách công khai https://api.vietqr.io/v2/banks, đối chiếu ngày <YYYY-MM-DD — ngày chạy lệnh ở Task 3 Bước 1>.
-- Đây KHÔNG phải văn bản NAPAS: kiểm thật là chủ dự án quét mã bằng ≥ 2 ứng dụng ngân hàng (đặc tả §8.6). Thêm ngân hàng = migration mới, không sửa tệp này.
CREATE TABLE pty_bank (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  bin        TEXT NOT NULL UNIQUE CHECK (length(bin) = 6 AND bin NOT GLOB '*[^0-9]*'),
  short_name TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO pty_bank (code, bin, short_name, name, sort_order) VALUES
  ('VCB', '970436', 'Vietcombank', 'Ngân hàng TMCP Ngoại Thương Việt Nam', 1),
  ('ICB', '970415', 'VietinBank', 'Ngân hàng TMCP Công thương Việt Nam', 2),
  ('BIDV', '970418', 'BIDV', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', 3),
  ('VBA', '970405', 'Agribank', 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', 4),
  ('TCB', '970407', 'Techcombank', 'Ngân hàng TMCP Kỹ thương Việt Nam', 5),
  ('MB', '970422', 'MBBank', 'Ngân hàng TMCP Quân đội', 6),
  ('ACB', '970416', 'ACB', 'Ngân hàng TMCP Á Châu', 7),
  ('VPB', '970432', 'VPBank', 'Ngân hàng TMCP Việt Nam Thịnh Vượng', 8),
  ('TPB', '970423', 'TPBank', 'Ngân hàng TMCP Tiên Phong', 9),
  ('STB', '970403', 'Sacombank', 'Ngân hàng TMCP Sài Gòn Thương Tín', 10),
  ('HDB', '970437', 'HDBank', 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh', 11),
  ('VIB', '970441', 'VIB', 'Ngân hàng TMCP Quốc tế Việt Nam', 12),
  ('SHB', '970443', 'SHB', 'Ngân hàng TMCP Sài Gòn - Hà Nội', 13),
  ('EIB', '970431', 'Eximbank', 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', 14),
  ('MSB', '970426', 'MSB', 'Ngân hàng TMCP Hàng Hải Việt Nam', 15),
  ('SEAB', '970440', 'SeABank', 'Ngân hàng TMCP Đông Nam Á', 16),
  ('OCB', '970448', 'OCB', 'Ngân hàng TMCP Phương Đông', 17),
  ('LPB', '970449', 'LPBank', 'Ngân hàng TMCP Lộc Phát Việt Nam', 18),
  ('NAB', '970428', 'NamABank', 'Ngân hàng TMCP Nam Á', 19),
  ('BAB', '970409', 'BacABank', 'Ngân hàng TMCP Bắc Á', 20),
  ('ABB', '970425', 'ABBANK', 'Ngân hàng TMCP An Bình', 21),
  ('VCCB', '970454', 'VietCapitalBank', 'Ngân hàng TMCP Bản Việt', 22),
  ('PVCB', '970412', 'PVcomBank', 'Ngân hàng TMCP Đại Chúng Việt Nam', 23),
  ('KLB', '970452', 'KienLongBank', 'Ngân hàng TMCP Kiên Long', 24),
  ('VIETBANK', '970433', 'VietBank', 'Ngân hàng TMCP Việt Nam Thương Tín', 25),
  ('NCB', '970419', 'NCB', 'Ngân hàng TMCP Quốc Dân', 26),
  ('SGICB', '970400', 'SaigonBank', 'Ngân hàng TMCP Sài Gòn Công Thương', 27),
  ('BVB', '970438', 'BaoVietBank', 'Ngân hàng TMCP Bảo Việt', 28),
  ('PGB', '970430', 'PGBank', 'Ngân hàng TMCP Thịnh vượng và Phát triển', 29),
  ('SCB', '970429', 'SCB', 'Ngân hàng TMCP Sài Gòn', 30);

-- Tài khoản nhận tiền: mỗi hồ sơ tối đa MỘT dòng mở. Lịch sử số nằm trong chính bảng này (nhật ký KHÔNG chép số — Hiến chương 5.12).
CREATE TABLE pty_bank_account (
  id             TEXT PRIMARY KEY,
  party_id       TEXT NOT NULL REFERENCES pty_party(id),
  bank_code      TEXT NOT NULL REFERENCES pty_bank(code),
  account_number TEXT NOT NULL CHECK (length(account_number) BETWEEN 4 AND 19 AND account_number NOT GLOB '*[^0-9]*'),
  account_name   TEXT NOT NULL CHECK (length(account_name) BETWEEN 2 AND 100 AND account_name NOT GLOB '*[^A-Z0-9 ]*'),
  valid_from     TEXT NOT NULL,
  valid_to       TEXT CHECK (valid_to IS NULL OR valid_to >= valid_from),
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);
CREATE INDEX pty_bank_account_party_ix ON pty_bank_account(party_id);
CREATE UNIQUE INDEX pty_bank_account_one_open ON pty_bank_account(party_id) WHERE valid_to IS NULL;

-- Chỉ hồ sơ ĐANG mở vai "Công ty chủ" (cùng định nghĩa view v_pty_owner_company) được thêm tài khoản. Vai ở đây là điều kiện DỮ LIỆU, không phải điều kiện quyền.
CREATE TRIGGER pty_bank_account_owner_only BEFORE INSERT ON pty_bank_account
WHEN NOT EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = NEW.party_id AND r.role_type_code = 'OWNER_COMPANY' AND r.valid_to_date IS NULL)
BEGIN SELECT RAISE(ABORT, 'bank_account_not_owner: chỉ hồ sơ đang là công ty chủ có tài khoản nhận tiền'); END;

-- Chỉ được ĐÓNG (đặt valid_to một lần); mọi cột khác giữ nguyên. Đổi tài khoản = mở dòng mới.
CREATE TRIGGER pty_bank_account_close_only BEFORE UPDATE ON pty_bank_account
WHEN OLD.valid_to IS NOT NULL OR NEW.valid_to IS NULL OR NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.bank_code IS NOT OLD.bank_code
  OR NEW.account_number IS NOT OLD.account_number OR NEW.account_name IS NOT OLD.account_name OR NEW.valid_from IS NOT OLD.valid_from
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'bank_account_append_only: tài khoản nhận tiền chỉ được đóng một lần — đổi tài khoản thì mở dòng mới'); END;
CREATE TRIGGER pty_bank_account_no_delete BEFORE DELETE ON pty_bank_account
BEGIN SELECT RAISE(ABORT, 'bank_account_append_only: không xoá tài khoản nhận tiền'); END;
```

- [ ] **Bước 5: Chạy, thấy xanh.** `node --test src/migrations-tai-khoan-nhan-tien.test.ts` → PASS cả 4 bài.

- [ ] **Bước 6: Quan sát chặn thật (P16).** Tạm xoá dòng `CREATE TRIGGER pty_bank_account_owner_only …` trong tệp migration (tệp chưa có trên `main` nên móc tệp cấm sửa cho phép) → chạy bài → thấy bài (a) đỏ → hoàn nguyên → xanh. Ghi vào bảng "Quan sát chặn thật" của sổ thi công.

- [ ] **Bước 7: Từ điển dữ liệu.** Thêm vào mảng `tables` của `docs/data-dictionary.json`, cạnh các bảng `pty_*`:

```json
    {
      "name": "pty_bank",
      "module": "parties",
      "kind": "lookup",
      "note": "ngân hàng Việt Nam: mã, BIN 6 số (NAPAS), tên ngắn, tên đầy đủ (ADR-0108 đ2; migration 0087). Nguồn gieo: danh sách công khai VietQR.io, đối chiếu khi gieo. Thêm ngân hàng = migration mới"
    },
    {
      "name": "pty_bank_account",
      "module": "parties",
      "kind": "table",
      "note": "tài khoản nhận tiền của CÔNG TY CHỦ (ADR-0108 đ2; migration 0087), chính sách có hiệu lực: tối đa một dòng mở mỗi hồ sơ, chỉ đóng một lần (valid_to), không sửa, không xoá; trigger chỉ cho hồ sơ đang mở vai OWNER_COMPANY. Ghi bằng ô company.legal.write. Số tài khoản KHÔNG vào nhật ký, KHÔNG vào CompanyDto công khai, KHÔNG vào kho tri thức Trợ lý"
    },
```

Rồi chạy `npm run dict`.

- [ ] **Bước 8: Kiểm toàn bộ rồi commit**

```bash
npm run typecheck && npm test
git add migrations/0087_pty_tai_khoan_nhan_tien.sql src/migrations-tai-khoan-nhan-tien.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md
git commit -m "Migration 0087: tài khoản nhận tiền của công ty chủ

Bảng tra cứu ngân hàng (BIN đối chiếu danh sách công khai) và bảng tài khoản có hiệu
lực: một dòng mở, chỉ đóng một lần, chỉ hồ sơ đang là công ty chủ. Đổi tài khoản là
mở dòng mới nên lịch sử số nằm trong bảng, không cần chép vào nhật ký.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Đọc / ghi tài khoản nhận tiền (parties)

**Files:**
- Create: `src/modules/parties/tai-khoan-nhan-tien.ts`, `src/modules/parties/tai-khoan-nhan-tien.test.ts`
- Modify: `src/modules/parties/repository.ts` (cuối tệp), `src/modules/parties/index.ts` (hàm công bố cạnh `ownerCompany`; hai route sau khối "Liên hệ")
- Modify: `src/shared/contracts.ts` (cạnh `ReceiptResponse`), `src/shared/audit-actions.ts`, `src/shared/tro-ly-cau-truc-ten.ts`, `src/route-access.test.ts`
- Test: `src/modules/parties/tai-khoan-nhan-tien-route.test.ts`

**Interfaces:**
- Produces (cho Task 5): `export interface TaiKhoanNhanTien { congTy: string; nganHang: string; bin: string; soTaiKhoan: string; chuTaiKhoan: string }` và `export async function taiKhoanNhanTienHienHanh(db: D1Database): Promise<TaiKhoanNhanTien | null>` ở `src/modules/parties/index.ts`.
- Produces (cho Task 11): `TaiKhoanNhanTienResponse`, `TaiKhoanNhanTienInput` ở `contracts.ts`; route `GET/PUT /api/parties/:id/tai-khoan-nhan-tien`.

- [ ] **Bước 1: Bài đỏ cho luật thuần**

`src/modules/parties/tai-khoan-nhan-tien.test.ts`:

```ts
// Luật thuần "Tài khoản nhận tiền" (ADR-0108 đ2; đặc tả QR §4.1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chuanHoaTenChuTaiKhoan, docTaiKhoanNhanTien } from "./tai-khoan-nhan-tien.ts";

test("tên chủ tài khoản: bỏ dấu, đ → D, in hoa, gộp khoảng trắng", () => {
  assert.equal(chuanHoaTenChuTaiKhoan("  Công ty TNHH   Tour Đảo "), "CONG TY TNHH TOUR DAO");
  assert.equal(chuanHoaTenChuTaiKhoan("Lưu Tuấn Vũ"), "LUU TUAN VU");
});

test("đọc thân: chuẩn hoá số (bỏ cách, chấm, gạch), bắt buộc truocDo rõ ràng (null hoặc id)", () => {
  assert.deepEqual(docTaiKhoanNhanTien({ maNganHang: "VCB", soTaiKhoan: "0011 001.234-567", chuTaiKhoan: "Công ty Tour Đảo", truocDo: null }), {
    ok: true, value: { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TOUR DAO", truocDo: null },
  });
  for (const [sua, mau] of [
    [{ maNganHang: "vcb" }, /ngân hàng/], [{ soTaiKhoan: "12AB345" }, /Số tài khoản/], [{ soTaiKhoan: "123" }, /Số tài khoản/],
    [{ chuTaiKhoan: "A" }, /Tên chủ tài khoản/], [{ chuTaiKhoan: "CONG & TY" }, /Tên chủ tài khoản/], [{ truocDo: undefined }, /tải lại/],
  ] as const) {
    const r = docTaiKhoanNhanTien({ maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "TOUR DAO", truocDo: null, ...sua });
    assert.equal(r.ok, false, JSON.stringify(sua));
    if (!r.ok) assert.match(r.cau, mau);
  }
});
```

- [ ] **Bước 2: Chạy, thấy đỏ.** `node --test src/modules/parties/tai-khoan-nhan-tien.test.ts` → FAIL.

- [ ] **Bước 3: Viết luật thuần**

`src/modules/parties/tai-khoan-nhan-tien.ts`:

```ts
// Luật THUẦN của "Tài khoản nhận tiền" của công ty chủ (ADR-0108 đ2; đặc tả QR §4.1). Không I/O. Máy chủ chuẩn hoá rồi mới ghi; CHECK của migration 0087 là
// lớp 2. Tên chủ tài khoản ghi đúng kiểu ngân hàng in: chữ in hoa không dấu và số.

export const SO_TAI_KHOAN_RE = /^\d{4,19}$/;
export const TEN_CHU_TAI_KHOAN_RE = /^[A-Z0-9 ]{2,100}$/;
export const MA_NGAN_HANG_RE = /^[A-Z0-9]{2,12}$/;
const MA_DONG_RE = /^[0-9A-Za-z_-]{1,64}$/;

export function chuanHoaTenChuTaiKhoan(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "D").toUpperCase().replace(/\s+/g, " ").trim();
}

export interface TaiKhoanNhap {
  maNganHang: string;
  soTaiKhoan: string;
  chuTaiKhoan: string;
  /** Khoá lạc quan: id dòng đang mở mà người sửa đã thấy (null = chưa có tài khoản). Bắt buộc ghi rõ. */
  truocDo: string | null;
}

export function docTaiKhoanNhanTien(raw: unknown): { ok: true; value: TaiKhoanNhap } | { ok: false; cau: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, cau: "Thiếu thông tin tài khoản." };
  const b = raw as Record<string, unknown>;
  if (typeof b.maNganHang !== "string" || !MA_NGAN_HANG_RE.test(b.maNganHang)) return { ok: false, cau: "Chọn ngân hàng trong danh sách." };
  const so = typeof b.soTaiKhoan === "string" ? b.soTaiKhoan.replace(/[\s.-]/g, "") : "";
  if (!SO_TAI_KHOAN_RE.test(so)) return { ok: false, cau: "Số tài khoản chỉ gồm chữ số (4–19 số)." };
  const ten = typeof b.chuTaiKhoan === "string" ? chuanHoaTenChuTaiKhoan(b.chuTaiKhoan) : "";
  if (!TEN_CHU_TAI_KHOAN_RE.test(ten)) return { ok: false, cau: "Tên chủ tài khoản ghi đúng như ngân hàng in: chữ không dấu và số, 2–100 ký tự." };
  if (b.truocDo !== null && (typeof b.truocDo !== "string" || !MA_DONG_RE.test(b.truocDo))) return { ok: false, cau: "Thiếu mã tài khoản đang dùng — tải lại rồi thử lại." };
  return { ok: true, value: { maNganHang: b.maNganHang, soTaiKhoan: so, chuTaiKhoan: ten, truocDo: b.truocDo } };
}
```

- [ ] **Bước 4: Chạy, thấy xanh.** Chạy lại bài Bước 1 → PASS.

- [ ] **Bước 5: Bài đỏ cho route**

`src/modules/parties/tai-khoan-nhan-tien-route.test.ts`:

```ts
// Route "Tài khoản nhận tiền" (ADR-0108 đ2; đặc tả QR §4.1, §8.2) trên khung thử — ô company.legal.write (chỉ Toàn quyền), chỉ hồ sơ đang là công ty chủ,
// đóng + mở + nhật ký MỘT lô, nhật ký không chép số tài khoản, khoá lạc quan `truocDo`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-10-08T01:00:00.000Z";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SA, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  return { w, ct };
}
const url = (id: string) => `/api/parties/${id}/tai-khoan-nhan-tien`;
const THAN = { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "Công ty TNHH Tour Đảo", truocDo: null };

test("Toàn quyền cài rồi đổi: đúng một dòng mở, dòng cũ có valid_to, mỗi lần một dòng nhật ký KHÔNG chứa số tài khoản", async () => {
  const { w, ct } = setup();
  let r = await w.call("GET", url(ct), { as: SA });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.hienTai, null);
  assert.ok(r.json.nganHang.some((b: { ma: string }) => b.ma === "VCB"));
  r = await w.call("PUT", url(ct), { as: SA, body: THAN });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(
    { ...r.json.hienTai, id: "x", tuLuc: "x" },
    { id: "x", maNganHang: "VCB", nganHang: "Vietcombank", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO", tuLuc: "x" },
  );
  const id1 = r.json.hienTai.id;
  r = await w.call("PUT", url(ct), { as: SA, body: { maNganHang: "MB", soTaiKhoan: "1234567890", chuTaiKhoan: "TOUR DAO", truocDo: id1 } });
  assert.equal(r.status, 200, r.text);
  const dong = w.q("SELECT id, valid_to FROM pty_bank_account WHERE party_id = ? ORDER BY created_at, rowid", ct);
  assert.equal(dong.length, 2);
  assert.ok(dong[0].valid_to, "dòng cũ đã đóng");
  assert.equal(dong[1].valid_to, null, "dòng mới mở");
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'party_bank_account_changed' AND target_id = ? ORDER BY created_at, rowid", ct);
  assert.equal(nk.length, 2);
  // Khẳng định HÌNH DẠNG (chữ cố định), không quét \d{8,} trên chuỗi có thể chứa mã ngẫu nhiên.
  assert.deepEqual(nk.map((x: { detail: string }) => x.detail), ["cài tài khoản nhận tiền", "đổi tài khoản nhận tiền"]);
  for (const x of nk) assert.doesNotMatch(String(x.detail), /0011001234567|1234567890/, "nhật ký không chép số tài khoản");
});

test("khoá lạc quan: truocDo cũ / null khi đã có tài khoản ⇒ 409 stale, không ghi gì", async () => {
  const { w, ct } = setup();
  const r1 = await w.call("PUT", url(ct), { as: SA, body: THAN });
  assert.equal(r1.status, 200, r1.text);
  const n = w.q("SELECT count(*) AS n FROM pty_bank_account")[0].n;
  for (const truocDo of [null, "khong-phai-dong-mo"]) {
    const r = await w.call("PUT", url(ct), { as: SA, body: { ...THAN, truocDo } });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "stale");
  }
  assert.equal(w.q("SELECT count(*) AS n FROM pty_bank_account")[0].n, n);
});

test("Kế toán, Quản trị, Bán hàng ⇒ 403 cả đọc lẫn ghi; hồ sơ không phải công ty chủ ⇒ 409; thân sai ⇒ 400; ngân hàng không có ⇒ 400", async () => {
  const { w, ct } = setup();
  for (const as of [KT, ADM, SALES]) {
    assert.equal((await w.call("GET", url(ct), { as })).status, 403, `${as} đọc`);
    assert.equal((await w.call("PUT", url(ct), { as, body: THAN })).status, 403, `${as} ghi`);
  }
  // Mã hồ sơ phải đúng dạng PARTY_ID_RE (src/shared/party-id.ts) — sai dạng thì route trả 404 trước khi tới kiểm "công ty chủ".
  const DAI_LY = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Đại lý', 1, ?, ?)").run(DAI_LY, AT, AT);
  const khac = await w.call("PUT", url(DAI_LY), { as: SA, body: THAN });
  assert.equal(khac.status, 409, khac.text);
  assert.equal(khac.json.error.code, "not_owner_company");
  assert.equal((await w.call("PUT", url(ct), { as: SA, body: { ...THAN, soTaiKhoan: "12AB" } })).status, 400);
  assert.equal((await w.call("PUT", url(ct), { as: SA, body: { ...THAN, maNganHang: "KHONGCO" } })).status, 400);
});
```

- [ ] **Bước 6: Chạy, thấy đỏ.** `node --test src/modules/parties/tai-khoan-nhan-tien-route.test.ts` → FAIL (404 vì chưa có route).

- [ ] **Bước 7: Hợp đồng DTO.** Trong `src/shared/contracts.ts`, ngay sau `ReceiptResponse`, thêm:

```ts
/** Một ngân hàng trong danh sách chọn (ADR-0108 đ2). */
export interface NganHangDto {
  ma: string;
  ten: string;
}
/** Tài khoản nhận tiền đang mở của công ty chủ — CHỈ người giữ ô `company.legal.write` đọc được (route có kiểm). */
export interface TaiKhoanNhanTienDto {
  id: string;
  maNganHang: string;
  nganHang: string;
  soTaiKhoan: string;
  chuTaiKhoan: string;
  tuLuc: string;
}
/** `GET|PUT /api/parties/:id/tai-khoan-nhan-tien`. */
export interface TaiKhoanNhanTienResponse {
  hienTai: TaiKhoanNhanTienDto | null;
  nganHang: NganHangDto[];
}
/** Thân `PUT /api/parties/:id/tai-khoan-nhan-tien`. `truocDo` = id dòng đang mở mà người sửa đã thấy (null = chưa có). */
export interface TaiKhoanNhanTienInput {
  maNganHang: string;
  soTaiKhoan: string;
  chuTaiKhoan: string;
  truocDo: string | null;
}
```

- [ ] **Bước 8: Hành động nhật ký.** Trong `src/shared/audit-actions.ts`, sau `party_document_catalog_changed`, thêm:

```ts
  // ADR-0108 đ2: cài / đổi tài khoản nhận tiền của công ty chủ — target = hồ sơ công ty; `detail` = "cài|đổi tài khoản nhận tiền" (chữ cố định); KHÔNG chép số tài khoản (5.12).
  party_bank_account_changed: { label: "Đổi tài khoản nhận tiền", group: "party" },
```

- [ ] **Bước 9: SQL.** Cuối `src/modules/parties/repository.ts`, thêm:

```ts
// ---- Tài khoản nhận tiền của công ty chủ (ADR-0108 đ2; migration 0087) — số tài khoản chỉ đi ra route có ô company.legal.write và hàm công bố cho QR. ----
export interface BankRow {
  code: string;
  bin: string;
  short_name: string;
  name: string;
}
const BANKS_ACTIVE = defineSql("parties", "banks_active", "SELECT code, bin, short_name, name FROM pty_bank WHERE active = 1 ORDER BY sort_order, short_name");
export async function activeBanks(db: D1Database): Promise<BankRow[]> {
  return (await db.prepare(BANKS_ACTIVE).all<BankRow>()).results;
}
const BANK_ACTIVE_BY_CODE = defineSql("parties", "bank_active_by_code", "SELECT code FROM pty_bank WHERE code = ?1 AND active = 1");
export async function bankActive(db: D1Database, code: string): Promise<boolean> {
  return (await db.prepare(BANK_ACTIVE_BY_CODE).bind(code).first()) !== null;
}
export interface BankAccountRow {
  id: string;
  bank_code: string;
  bank_short_name: string;
  account_number: string;
  account_name: string;
  valid_from: string;
}
const BANK_ACCOUNT_OPEN_OF = defineSql(
  "parties",
  "bank_account_open_of",
  `SELECT a.id, a.bank_code, b.short_name AS bank_short_name, a.account_number, a.account_name, a.valid_from
   FROM pty_bank_account a JOIN pty_bank b ON b.code = a.bank_code WHERE a.party_id = ?1 AND a.valid_to IS NULL`,
);
export async function bankAccountOpenOf(db: D1Database, partyId: string): Promise<BankAccountRow | null> {
  return db.prepare(BANK_ACCOUNT_OPEN_OF).bind(partyId).first<BankAccountRow>();
}
export interface OwnerBankAccountRow {
  cong_ty: string;
  bank_short_name: string;
  bin: string;
  account_number: string;
  account_name: string;
}
/** Tài khoản mở của hồ sơ ĐANG giữ vai ?1 ("Công ty chủ"). LIMIT 2: nơi gọi coi "không đúng một dòng" là chưa cài. */
const OWNER_BANK_ACCOUNT = defineSql(
  "parties",
  "owner_bank_account",
  `SELECT COALESCE(o.legal_name, p.display_name) AS cong_ty, b.short_name AS bank_short_name, b.bin, a.account_number, a.account_name
   FROM pty_party_role r JOIN pty_party p ON p.id = r.party_id LEFT JOIN pty_organization o ON o.party_id = p.id
   JOIN pty_bank_account a ON a.party_id = p.id AND a.valid_to IS NULL JOIN pty_bank b ON b.code = a.bank_code
   WHERE r.role_type_code = ?1 AND r.valid_to_date IS NULL LIMIT 2`,
);
export async function ownerBankAccountRows(db: D1Database, roleCode: string): Promise<OwnerBankAccountRow[]> {
  return (await db.prepare(OWNER_BANK_ACCOUNT).bind(roleCode).all<OwnerBankAccountRow>()).results;
}
const BANK_ACCOUNT_CLOSE = defineSql(
  "parties",
  "bank_account_close",
  "UPDATE pty_bank_account SET valid_to = ?3, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND party_id = ?2 AND valid_to IS NULL",
);
export const bankAccountCloseStatement = (db: D1Database, v: { id: string; partyId: string; at: string; by: string }) =>
  db.prepare(BANK_ACCOUNT_CLOSE).bind(v.id, v.partyId, v.at, v.by);
/** Mở dòng mới — lính gác: hồ sơ không còn dòng mở (câu đóng của CHÍNH lô đã chạy trước). Không áp ⇒ changes = 0 ⇒ route trả 409 stale. */
const BANK_ACCOUNT_INSERT = defineSql(
  "parties",
  "bank_account_insert",
  `INSERT INTO pty_bank_account (id, party_id, bank_code, account_number, account_name, valid_from, valid_to, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, NULL, ?6, ?7, ?6, ?7 WHERE NOT EXISTS (SELECT 1 FROM pty_bank_account WHERE party_id = ?2 AND valid_to IS NULL)`,
);
export const bankAccountInsertStatement = (
  db: D1Database,
  v: { id: string; partyId: string; bankCode: string; accountNumber: string; accountName: string; at: string; by: string },
) => db.prepare(BANK_ACCOUNT_INSERT).bind(v.id, v.partyId, v.bankCode, v.accountNumber, v.accountName, v.at, v.by);
```

- [ ] **Bước 10: Hàm công bố + route.** Trong `src/modules/parties/index.ts`:

(a) Thêm vào khối `import { … } from "./repository"` các tên: `activeBanks, bankAccountCloseStatement, bankAccountInsertStatement, bankAccountOpenOf, bankActive, ownerBankAccountRows, type BankAccountRow, type BankRow`. Thêm `import { docTaiKhoanNhanTien } from "./tai-khoan-nhan-tien";`. Thêm `TaiKhoanNhanTienResponse` vào khối `import type { … } from "../../shared/contracts"`.

(b) Ngay sau hàm `ownerCompany`, thêm:

```ts
/** Tài khoản nhận tiền HIỆN HÀNH của công ty chủ (ADR-0108 đ2) — HÀM CÔNG BỐ cho module `receipt` (QR thanh toán). Theo công ty chủ HIỆN TẠI: đổi công ty chủ
 * sang hồ sơ chưa cài ⇒ null (không dùng tài khoản của công ty cũ — đặc tả §4.1). KHÔNG tự kiểm quyền; nơi gọi không ghi số này vào nhật ký. */
export interface TaiKhoanNhanTien { congTy: string; nganHang: string; bin: string; soTaiKhoan: string; chuTaiKhoan: string }
export async function taiKhoanNhanTienHienHanh(db: D1Database): Promise<TaiKhoanNhanTien | null> {
  const rows = await ownerBankAccountRows(db, OWNER_COMPANY_ROLE);
  if (rows.length !== 1) return null;
  const r = rows[0]!;
  return { congTy: r.cong_ty, nganHang: r.bank_short_name, bin: r.bin, soTaiKhoan: r.account_number, chuTaiKhoan: r.account_name };
}
```

(c) Cạnh `OWNER_COMPANY_FORBIDDEN`, thêm:

```ts
const NOT_OWNER_COMPANY = () => error(409, "not_owner_company", "Chỉ hồ sơ đang là công ty chủ có tài khoản nhận tiền.");
const taiKhoanDto = (r: BankAccountRow) => ({ id: r.id, maNganHang: r.bank_code, nganHang: r.bank_short_name, soTaiKhoan: r.account_number, chuTaiKhoan: r.account_name, tuLuc: r.valid_from });
const nganHangDto = (b: BankRow) => ({ ma: b.code, ten: `${b.short_name} — ${b.name}` });
async function tlTaiKhoan(db: D1Database, id: string): Promise<Response> {
  const [hienTai, banks] = await Promise.all([bankAccountOpenOf(db, id), activeBanks(db)]);
  return json({ hienTai: hienTai ? taiKhoanDto(hienTai) : null, nganHang: banks.map(nganHangDto) } satisfies TaiKhoanNhanTienResponse);
}
```

(d) Sau route `POST /api/parties/:id/contacts/:cid/end`, thêm hai route:

```ts
    // ---- Tài khoản nhận tiền của công ty chủ (ADR-0108 đ2; đặc tả QR §4.1): ô company.legal.write (chỉ Toàn quyền — ô MỞ RỘNG NGHĨA sang tài khoản nhận
    // tiền); chỉ hồ sơ ĐANG là công ty chủ. Đổi = đóng dòng cũ + mở dòng mới + nhật ký trong MỘT lô; nhật ký KHÔNG chép số tài khoản (Hiến chương 5.12).
    route("GET", "/api/parties/:id/tai-khoan-nhan-tien", "office", async ({ env, params, staff }) => {
      if (!can(staff, "company.legal.write")) return OWNER_COMPANY_FORBIDDEN();
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id || !(await findParty(env.DB, id))) return NOT_FOUND();
      if (!(await laCongTyChu(env.DB, id))) return NOT_OWNER_COMPANY();
      return tlTaiKhoan(env.DB, id);
    }),

    route("PUT", "/api/parties/:id/tai-khoan-nhan-tien", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "company.legal.write")) return OWNER_COMPANY_FORBIDDEN();
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id || !(await findParty(env.DB, id))) return NOT_FOUND();
      if (!(await laCongTyChu(env.DB, id))) return NOT_OWNER_COMPANY();
      const doc = docTaiKhoanNhanTien(await readJson(request));
      if (!doc.ok) return error(400, "invalid_input", doc.cau);
      const v = doc.value;
      if (!(await bankActive(env.DB, v.maNganHang))) return error(400, "invalid_input", "Chọn ngân hàng trong danh sách.");
      const at = new Date().toISOString();
      const moiId = crypto.randomUUID();
      const stmts = [
        ...(v.truocDo ? [bankAccountCloseStatement(env.DB, { id: v.truocDo, partyId: id, at, by: staff.id })] : []),
        bankAccountInsertStatement(env.DB, { id: moiId, partyId: id, bankCode: v.maNganHang, accountNumber: v.soTaiKhoan, accountName: v.chuTaiKhoan, at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "party_bank_account_changed", at, targetType: "party", targetId: id, detail: `${v.truocDo ? "đổi" : "cài"} tài khoản nhận tiền` }, "changes() > 0"),
      ];
      let kq: D1Result[];
      try {
        kq = await env.DB.batch(stmts);
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        if (/bank_account_not_owner/.test(m)) return NOT_OWNER_COMPANY();
        if (/UNIQUE constraint failed: pty_bank_account/.test(m)) return STALE();
        throw e;
      }
      if ((kq[stmts.length - 2]!.meta.changes ?? 0) === 0) return STALE();
      return tlTaiKhoan(env.DB, id);
    }),
```

(Câu đóng với `truocDo` sai không lỗi mà `changes = 0`; câu mở thấy dòng cũ còn mở nên cũng `changes = 0` ⇒ 409 stale, đúng bài Bước 5.)

Lớp chống ghi trùng (ADR-0094) **tự áp** cho route `PUT` này: router bọc mọi route ghi có đăng nhập, không công khai, không nằm trong `src/shared/lan-gui-mien.ts`; bài `src/lan-gui-phu-route.test.ts` canh việc đó. Bộ bọc trả đúng kết quả các câu nơi gọi gửi, nên chỉ số `kq[stmts.length - 2]` không lệch. Route chỉ được ghi **một** lô mỗi request (một `env.DB.batch`), để không rơi vào danh sách nợ "ghi > 1 lần" (`src/shared/lan-gui-no.ts`). Không thêm route vào tệp miễn.

- [ ] **Bước 11: Nhãn ô quyền.** Trong `src/shared/tro-ly-cau-truc-ten.ts`, đổi dòng `company.legal.write` thành:

```ts
  "company.legal.write": { ten: "sửa thông tin công ty chủ", moTa: "Sửa tên, mã số thuế, địa chỉ, liên hệ, tài khoản nhận tiền của công ty chủ hoặc đổi công ty chủ." },
```

- [ ] **Bước 12: Ảnh chụp route.** Trong `src/route-access.test.ts`, thêm vào `SNAPSHOT` (đặt theo thứ tự bài in ra nếu báo lệch thứ tự):

```ts
  { method: "GET", path: "/api/parties/:id/tai-khoan-nhan-tien", access: "office" }, // ADR-0108 đ2: company.legal.write (chỉ Toàn quyền); hồ sơ phải đang là công ty chủ
  { method: "PUT", path: "/api/parties/:id/tai-khoan-nhan-tien", access: "office" }, // ADR-0108 đ2: đóng + mở + nhật ký một lô; nhật ký không chép số
```

Thêm dòng ghi chú `// 2026-10-0x (ADR-0108 đ2): + GET/PUT /api/parties/:id/tai-khoan-nhan-tien (office) = N+2.` và nâng hai số đếm từ N lên N + 2.

- [ ] **Bước 12b: Ba bài ghim bị chạm** (người kiểm độc lập kế hoạch đã chạy `npm test` trên bản thử và thấy đúng ba chỗ đỏ này):
  - `src/modules/parties/tai-xe-dieu-phoi.test.ts`, bài "TC-3 parties/index.ts xuất đúng …", ghim danh sách tên xuất của `parties/index.ts`. Thêm `taiKhoanNhanTienHienHanh` vào danh sách tên mới được phép, cạnh `taiXeChoDieuPhoi`/`hoSoCaNhanKhop`, theo đúng cách bài đang ghi. Sửa tên bài và chú thích cho có "ADR-0108 đ2". Kiểu `TaiKhoanNhanTien` chỉ là kiểu, nên không vào danh sách nếu bài chỉ đếm tên chạy được. Đọc bài trước khi sửa.
  - `src/lan-gui-phu-route.test.ts`, bài "H2 (3)": số route ghi có đăng nhập đổi từ 152 thành **153**. Nối vào cuối chuỗi chú thích của câu khẳng định: `; QR thanh toán (ADR-0108 đ2): +1 PUT /api/parties/:id/tai-khoan-nhan-tien = 153`.
  - Đổi nhãn ô `company.legal.write` ở `src/shared/tro-ly-cau-truc-ten.ts` thì `npm test` (bước sinh trước khi chạy bài) sinh lại `src/shared/tro-ly-cau-truc.ts`, mà tệp này bị bài `src/shared/tro-ly-cau-truc.test.ts` ghim. Phải **commit cả tệp sinh**.

- [ ] **Bước 13: Chạy, thấy xanh.** `node --test src/modules/parties/tai-khoan-nhan-tien-route.test.ts src/route-access.test.ts src/modules/parties/tai-xe-dieu-phoi.test.ts src/lan-gui-phu-route.test.ts` → PASS.

- [ ] **Bước 14: Kiểm toàn bộ rồi commit**

```bash
npm run typecheck && npm test
git add src/modules/parties src/shared/contracts.ts src/shared/audit-actions.ts src/shared/tro-ly-cau-truc-ten.ts src/shared/tro-ly-cau-truc.ts src/route-access.test.ts src/lan-gui-phu-route.test.ts
git commit -m "Tài khoản nhận tiền: hàm công bố và hai route của Toàn quyền

Chỉ người giữ ô sửa thông tin công ty chủ đọc và đổi được. Đổi là đóng dòng cũ, mở
dòng mới và ghi nhật ký trong một lô, có khoá lạc quan. Nhật ký chỉ ghi chữ cố định,
không chép số tài khoản.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Route QR thanh toán (receipt)

**Files:**
- Create: `src/shared/qr-thong-tin.ts`, `src/shared/qr-thong-tin.test.ts`
- Modify: `src/shared/contracts.ts`, `src/modules/billing/index.ts` (cuối tệp, cạnh `soTienBienNhan`), `src/modules/receipt/rules.ts`, `src/modules/receipt/index.ts`, `src/route-access.test.ts`
- Test: `src/modules/receipt/qr-thanh-toan.test.ts`

**Interfaces:**
- Consumes: `payloadVietQr` (Task 1), `noiDungChuyenKhoan` (Task 1), `taiKhoanNhanTienHienHanh` (Task 4).
- Produces: `QrThanhToanDto`, `QrThanhToanResponse` (contracts); `dongThongTinQr(dto: QrThanhToanDto): string[]` và `soTienQr(n: number): string` (`src/shared/qr-thong-tin.ts`, dùng ở Task 10); `soTienChoQr(db, orderId): Promise<{ conLai: number; daGiao: boolean } | null>` (billing); route `GET /api/orders/:id/qr-thanh-toan?soTien=`.

- [ ] **Bước 1: Hợp đồng DTO.** Trong `src/shared/contracts.ts`, sau các kiểu tài khoản của Task 4, thêm:

```ts
/**
 * `GET /api/orders/:id/qr-thanh-toan` (ADR-0108 đ3; đặc tả QR §4.2, §7). DANH SÁCH TRẮNG: chuỗi VietQR + đúng các dòng in dưới mã. KHÔNG hoa hồng, giá vốn,
 * nợ nội bộ, tên người thu (Hiến chương 4.4). Thêm trường = sửa bài khoá khoá ở src/modules/receipt/qr-thanh-toan.test.ts.
 */
export interface QrThanhToanDto {
  payload: string;
  soTien: number;
  conLai: number;
  maDon: string;
  noiDung: string;
  congTy: string;
  nganHang: string;
  soTaiKhoan: string;
  chuTaiKhoan: string;
}
export interface QrThanhToanResponse {
  qr: QrThanhToanDto;
}
```

- [ ] **Bước 2: Bài đỏ cho các dòng in và luật số tiền**

`src/shared/qr-thong-tin.test.ts`:

```ts
// Các dòng in dưới mã QR (đặc tả QR §4.2, §8.10): chỉ trường của DTO danh sách trắng; tiền theo dạng "1.000.000đ".
import { test } from "node:test";
import assert from "node:assert/strict";
import type { QrThanhToanDto } from "./contracts.ts";
import { dongThongTinQr, soTienQr } from "./qr-thong-tin.ts";

const DTO: QrThanhToanDto = {
  payload: "000201", soTien: 1_000_000, conLai: 1_000_000, maDon: "TD-20261008-0012", noiDung: "TD202610080012",
  congTy: "CÔNG TY TNHH TOUR ĐẢO", nganHang: "Vietcombank", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO",
};

test("định dạng tiền 1.000.000đ", () => {
  assert.equal(soTienQr(1_000_000), "1.000.000đ");
  assert.equal(soTienQr(700), "700đ");
});

test("đúng sáu dòng; nguồn có trường lạ (hoa hồng, người thu) cũng không lọt", () => {
  const lan = { ...DTO, hoaHong: "HOA HỒNG 480017", nguoiThu: "Nam HDV" } as QrThanhToanDto;
  const d = dongThongTinQr(lan);
  assert.deepEqual(d, [
    "CÔNG TY TNHH TOUR ĐẢO", "Vietcombank · 0011001234567", "Chủ tài khoản: CONG TY TNHH TOUR DAO", "Số tiền: 1.000.000đ", "Nội dung: TD202610080012", "Mã đơn: TD-20261008-0012",
  ]);
  assert.doesNotMatch(d.join("\n"), /hoa hồng|480017|giá vốn|Nam HDV/i);
});
```

`src/modules/receipt/qr-thanh-toan.test.ts` (phần luật thuần; phần route ở Bước 6):

```ts
// QR thanh toán (ADR-0108 đ3; đặc tả QR §4.2, §7, §8.1, §8.3, §8.4, §8.10): (1) luật thuần số tiền + DTO danh sách trắng; (2) route thật trên khung thử.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dungQrThanhToan, kiemSoTienQr } from "./rules.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

test("luật số tiền: Đã giao TRƯỚC còn lại; thiếu ⇒ còn lại; chỉ số nguyên dương viết thường ≤ còn lại", () => {
  assert.deepEqual(kiemSoTienQr({ daGiao: true, conLai: 500, soTienRaw: null }), { ok: false, status: 409, ma: "order_delivered", cau: "Đơn đã giao — không thu thêm." });
  assert.deepEqual(kiemSoTienQr({ daGiao: false, conLai: 0, soTienRaw: null }), { ok: false, status: 409, ma: "nothing_due", cau: "Đơn không còn tiền cần thu." });
  assert.deepEqual(kiemSoTienQr({ daGiao: false, conLai: 700_000, soTienRaw: null }), { ok: true, soTien: 700_000 });
  assert.deepEqual(kiemSoTienQr({ daGiao: false, conLai: 700_000, soTienRaw: "" }), { ok: true, soTien: 700_000 });
  assert.deepEqual(kiemSoTienQr({ daGiao: false, conLai: 700_000, soTienRaw: "200000" }), { ok: true, soTien: 200_000 });
  for (const raw of ["700001", "0", "-1", "1e5", "200000.0", " 200000", "+5", "0x10", "abc", "020000"]) {
    const r = kiemSoTienQr({ daGiao: false, conLai: 700_000, soTienRaw: raw });
    assert.equal(r.ok, false, raw);
    if (!r.ok) assert.equal(r.status, 400, raw);
  }
});

test("DTO: khoá đúng danh sách trắng; nội dung = mã đơn bỏ gạch; tài khoản sai dạng ⇒ lỗi, không ném", () => {
  const tk = { congTy: "CÔNG TY TNHH TOUR ĐẢO", nganHang: "Vietcombank", bin: "970436", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO" };
  const r = dungQrThanhToan({ maDon: "TD-20261008-0012", soTien: 700_000, conLai: 700_000, tk });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(Object.keys(r.dto).sort(), ["chuTaiKhoan", "conLai", "congTy", "maDon", "nganHang", "noiDung", "payload", "soTaiKhoan", "soTien"]);
  assert.equal(r.dto.noiDung, "TD202610080012");
  assert.match(r.dto.payload, /^000201010212/);
  assert.equal(dungQrThanhToan({ maDon: "TD-1", soTien: 1, conLai: 1, tk: { ...tk, bin: "97" } }).ok, false);
});
```

- [ ] **Bước 3: Chạy, thấy đỏ.** `node --test src/shared/qr-thong-tin.test.ts src/modules/receipt/qr-thanh-toan.test.ts` → FAIL.

- [ ] **Bước 4: Viết mã thuần**

`src/shared/qr-thong-tin.ts`:

```ts
// Các dòng in dưới mã QR thanh toán, trên màn đơn VÀ trên ảnh lưu (ADR-0108 đ3; đặc tả QR §4.2): MỘT nơi định nghĩa, chỉ đọc các trường của DTO danh sách
// trắng, chép TỪNG trường (không trải đối tượng). Tiền theo dạng đặc tả "1.000.000đ". Hàm thuần.
import type { QrThanhToanDto } from "./contracts.ts";

export const soTienQr = (n: number): string => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;

export function dongThongTinQr(d: QrThanhToanDto): string[] {
  return [d.congTy, `${d.nganHang} · ${d.soTaiKhoan}`, `Chủ tài khoản: ${d.chuTaiKhoan}`, `Số tiền: ${soTienQr(d.soTien)}`, `Nội dung: ${d.noiDung}`, `Mã đơn: ${d.maDon}`];
}
```

Cuối `src/modules/receipt/rules.ts`, thêm (và thêm `QrThanhToanDto` vào dòng `import type` đầu tệp):

```ts
import { noiDungChuyenKhoan } from "../../shared/noi-dung-chuyen-khoan.ts";
import { payloadVietQr } from "../../shared/vietqr.ts";

// QR thanh toán (ADR-0108 đ3; đặc tả QR §7). Số tiền trên đường dẫn: chỉ số nguyên dương viết thường (không dấu, không mũ, không số 0 đầu, không khoảng trắng).
const SO_TIEN_QR_RE = /^[1-9]\d{0,12}$/;
export type KiemSoTienQr = { ok: true; soTien: number } | { ok: false; status: 400 | 409; ma: string; cau: string };

/** Thứ tự: đơn đã giao (kể cả đơn lệch cũ còn lại > 0) → hết tiền cần thu → số gõ. Thiếu số ⇒ bằng còn lại. */
export function kiemSoTienQr(i: { daGiao: boolean; conLai: number; soTienRaw: string | null }): KiemSoTienQr {
  if (i.daGiao) return { ok: false, status: 409, ma: "order_delivered", cau: "Đơn đã giao — không thu thêm." };
  if (i.conLai <= 0) return { ok: false, status: 409, ma: "nothing_due", cau: "Đơn không còn tiền cần thu." };
  if (i.soTienRaw === null || i.soTienRaw === "") return { ok: true, soTien: i.conLai };
  if (!SO_TIEN_QR_RE.test(i.soTienRaw)) return { ok: false, status: 400, ma: "invalid_input", cau: "Số tiền phải là số nguyên dương (đồng)." };
  const n = Number(i.soTienRaw);
  if (n > i.conLai) return { ok: false, status: 400, ma: "invalid_input", cau: "Số tiền không được lớn hơn số còn lại của đơn." };
  return { ok: true, soTien: n };
}

/** Dựng DTO QR theo DANH SÁCH TRẮNG — chép từng trường. Tài khoản sai dạng (dữ liệu hỏng) ⇒ lỗi, route trả 409. */
export function dungQrThanhToan(i: {
  maDon: string;
  soTien: number;
  conLai: number;
  tk: { congTy: string; nganHang: string; bin: string; soTaiKhoan: string; chuTaiKhoan: string };
}): { ok: true; dto: QrThanhToanDto } | { ok: false; cau: string } {
  const noiDung = noiDungChuyenKhoan(i.maDon);
  const p = payloadVietQr({ bin: i.tk.bin, soTaiKhoan: i.tk.soTaiKhoan, soTien: i.soTien, noiDung });
  if (!p.ok) return { ok: false, cau: p.loi };
  return {
    ok: true,
    dto: { payload: p.payload, soTien: i.soTien, conLai: i.conLai, maDon: i.maDon, noiDung, congTy: i.tk.congTy, nganHang: i.tk.nganHang, soTaiKhoan: i.tk.soTaiKhoan, chuTaiKhoan: i.tk.chuTaiKhoan },
  };
}
```

(Đặt hai dòng `import` lên đầu tệp cạnh các import sẵn có.)

- [ ] **Bước 5: Chạy, thấy xanh** phần thuần: `node --test src/shared/qr-thong-tin.test.ts src/modules/receipt/qr-thanh-toan.test.ts` → hai bài thuần PASS.

- [ ] **Bước 6: Bài đỏ cho route.** Thêm vào cuối `src/modules/receipt/qr-thanh-toan.test.ts`:

```ts
const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const HDV2 = "23232323-2323-4323-8323-232323232323";
const DT = "66666666-6666-4666-8666-666666666666";
const TX = "88888888-8888-4888-8888-888888888888";
const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";

function setup() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [HDV2, "0900000012", "Bắc HDV", ["FIELD"]],
    [DT, "0900000006", "Đối Tác", ["PARTNER"]], [TX, "0900000008", "Tài Xế", ["DRIVER"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn 1.000.000 do `owner` lập, đã xác nhận; HDV phụ trách. */
function don(w: any, id: string, ma: string, owner: string): string {
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?)`).run(id, ma, owner, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 2, '2026-10-20')`).run(`${id}-s`, id);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 2, 500000, 1000000)`).run(`${id}-i`, id, `${id}-s`);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(`${id}-a`, id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const qr = (w: any, as: string, id: string, so?: string) => w.call("GET", `/api/orders/${id}/qr-thanh-toan${so === undefined ? "" : `?soTien=${encodeURIComponent(so)}`}`, { as });
async function caiTaiKhoan(w: any) {
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const r = await w.call("PUT", `/api/parties/${ct}/tai-khoan-nhan-tien`, { as: SA, body: { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO", truocDo: null } });
  assert.equal(r.status, 200, r.text);
}

test("§8.1 + §8.4: chưa cài tài khoản ⇒ 409 đúng câu; cài rồi ⇒ mặc định còn lại 700.000, số nhỏ hơn được, số lớn hơn / sai dạng ⇒ 400", async () => {
  const w = setup();
  const id = don(w, "99999999-9999-4999-8999-000000000012", "TD-20261008-0012", SALES);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 300_000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  let r = await qr(w, SALES, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.message, "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống.");
  await caiTaiKhoan(w);
  r = await qr(w, SALES, id);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([r.json.qr.soTien, r.json.qr.conLai, r.json.qr.noiDung, r.json.qr.maDon], [700_000, 700_000, "TD202610080012", "TD-20261008-0012"]);
  assert.deepEqual(Object.keys(r.json.qr).sort(), ["chuTaiKhoan", "conLai", "congTy", "maDon", "nganHang", "noiDung", "payload", "soTaiKhoan", "soTien"]);
  assert.doesNotMatch(r.text, /Nam HDV|Tiền mặt|CASH|người thu/i, "không tên người thu, không hình thức thu");
  assert.equal((await qr(w, SALES, id, "200000")).json.qr.soTien, 200_000);
  for (const so of ["700001", "0", "1e5", "abc"]) assert.equal((await qr(w, SALES, id, so)).status, 400, so);
});

test("§8.3 phạm vi, cổng orders: HDV phụ trách 200, HDV khác 404; Đối tác đơn mình 200, đơn người khác 403; tài xế bị cổng chặn", async () => {
  const w = setup();
  await caiTaiKhoan(w);
  const cuaSales = don(w, "99999999-9999-4999-8999-000000000021", "TD-20261008-0021", SALES);
  const cuaDt = don(w, "99999999-9999-4999-8999-000000000022", "TD-20261008-0022", DT);
  assert.equal((await qr(w, HDV, cuaSales)).status, 200);
  assert.equal((await qr(w, HDV2, cuaSales)).status, 404);
  assert.equal((await qr(w, DT, cuaDt)).status, 200);
  assert.equal((await qr(w, DT, cuaSales)).status, 403);
  assert.equal((await qr(w, TX, cuaSales)).status, 403);
});

test("§8.4: đơn huỷ / đã thu đủ ⇒ 409 không còn tiền; đơn đã Đã giao ⇒ 409 'Đơn đã giao' (kiểm trước còn lại)", async () => {
  const w = setup();
  await caiTaiKhoan(w);
  const du = don(w, "99999999-9999-4999-8999-000000000031", "TD-20261008-0031", SALES);
  assert.equal((await w.call("POST", `/api/orders/${du}/payments`, { as: HDV, body: { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  let r = await qr(w, SALES, du);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.message, "Đơn không còn tiền cần thu.");
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10), du);
  const g = await w.call("POST", `/api/orders/${du}/delivered`, { as: HDV, body: {} });
  assert.equal(g.status, 200, g.text);
  r = await qr(w, SALES, du);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.message, "Đơn đã giao — không thu thêm.");
  const huy = don(w, "99999999-9999-4999-8999-000000000032", "TD-20261008-0032", SALES);
  assert.equal((await w.call("POST", `/api/orders/${huy}/status`, { as: SALES, body: { status: "cancelled", lyDo: "SAI_THONG_TIN" } })).status, 200);
  assert.equal((await qr(w, SALES, huy)).json.error.message, "Đơn không còn tiền cần thu.");
});

test("Review Focus 4: đổi công ty chủ sang hồ sơ chưa cài tài khoản ⇒ 409, không dùng tài khoản công ty cũ", async () => {
  const w = setup();
  await caiTaiKhoan(w);
  const id = don(w, "99999999-9999-4999-8999-000000000041", "TD-20261008-0041", SALES);
  assert.equal((await qr(w, SALES, id)).status, 200);
  // Khuôn `toChucDu` của src/modules/parties/cong-ty-chu.test.ts: Bán hàng lập hồ sơ tổ chức đủ thông tin, Toàn quyền gán vai công ty chủ.
  let r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "ORGANIZATION", displayName: "Pháp nhân Mới", legalName: "CÔNG TY PHÁP NHÂN MỚI", taxCode: "0312345678", address: "2 Đường Thử" } });
  assert.equal(r.status, 201, r.text);
  const moi = r.json.party.id;
  assert.equal((await w.call("POST", `/api/parties/${moi}/contacts`, { as: SALES, body: { kind: "PHONE", value: "0901 234 567", label: "Hotline", isPrimary: true } })).status, 201);
  r = await w.call("POST", `/api/parties/${moi}/roles`, { as: SA, body: { roleTypeCode: "OWNER_COMPANY" } });
  assert.equal(r.status, 201, r.text);
  r = await qr(w, SALES, id);
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /chưa cài tài khoản nhận tiền/);
});
```

(Thân huỷ đơn theo khuôn `huy()` của `src/modules/billing/don-huy-route.test.ts`; Bán hàng chọn được lý do `SAI_THONG_TIN`, còn `THOI_TIET` thì Bán hàng bị 403.)

- [ ] **Bước 7: Chạy, thấy đỏ.** `node --test src/modules/receipt/qr-thanh-toan.test.ts` → các bài route FAIL (404).

- [ ] **Bước 8: Hàm cho receipt ở billing.** Cuối `src/modules/billing/index.ts`, sau `soTienBienNhan`, thêm:

```ts
/** API công khai cho `receipt` (QR thanh toán — ADR-0108 đ3): còn lại + đơn đã "Đã giao" chưa, cùng hàm `conLai` (một nguồn). KHÔNG tự kiểm quyền. */
export async function soTienChoQr(db: D1Database, orderId: string): Promise<{ conLai: number; daGiao: boolean } | null> {
  const t = (await tienNhieuDon(db, [orderId])).get(orderId);
  return t ? { conLai: t.conLai, daGiao: t.daGiao } : null;
}
```

- [ ] **Bước 9: Route.** Trong `src/modules/receipt/index.ts`: thêm `QrThanhToanResponse` vào `import type`; đổi import billing thành `import { soTienBienNhan, soTienChoQr } from "../billing";`; thêm `import { taiKhoanNhanTienHienHanh } from "../parties";`; đổi import rules thành `import { dungBienNhan, dungQrThanhToan, kiemSoTienQr } from "./rules";`. Sửa dòng chú thích đầu tệp thành "Chiều phụ thuộc: receipt → orders, billing, parties, company." (đã đúng) và thêm route thứ hai vào mảng `routes`:

```ts
    // QR thanh toán của MỘT đơn (ADR-0108 đ3; đặc tả QR §7): cổng `orders` (HDV, Đối tác, Thực tập vào được — cổng office sẽ chặn họ). `order.view` TRƯỚC
    // (chỉ-HDV không phụ trách → 404, không dò được đơn có tồn tại), rồi `money.view` phạm vi đơn, rồi mới đọc tiền và tài khoản. Không ghi gì.
    route("GET", "/api/orders/:id/qr-thanh-toan", "orders", async ({ env, url, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([donChoBienNhan(env.DB, id), isAssigned(id)]);
      if (!order) return NOT_FOUND();
      const scope = { ownerId: order.staffId, assigned };
      if (!can(staff, "order.view", scope)) return seesOnlyAssignedOrders(staff) ? NOT_FOUND() : FORBIDDEN_VIEW();
      if (!can(staff, "money.view", scope)) return FORBIDDEN_VIEW();
      const tien = await soTienChoQr(env.DB, id);
      if (!tien) return error(503, "money_unavailable", "Chưa đọc được số tiền của đơn — tải lại rồi thử lại.");
      const so = kiemSoTienQr({ daGiao: tien.daGiao, conLai: tien.conLai, soTienRaw: url.searchParams.get("soTien") });
      if (!so.ok) return error(so.status, so.ma, so.cau);
      const tk = await taiKhoanNhanTienHienHanh(env.DB);
      if (!tk) return error(409, "bank_account_missing", "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống.");
      const qr = dungQrThanhToan({ maDon: order.orderCode, soTien: so.soTien, conLai: tien.conLai, tk });
      if (!qr.ok) return error(409, "bank_account_invalid", "Tài khoản nhận tiền của công ty chưa đúng dạng — báo người phụ trách hệ thống.");
      return json({ qr: qr.dto } satisfies QrThanhToanResponse);
    }),
```

- [ ] **Bước 10: Ảnh chụp route.** Thêm vào `SNAPSHOT` của `src/route-access.test.ts`:

```ts
  { method: "GET", path: "/api/orders/:id/qr-thanh-toan", access: "orders" }, // ADR-0108 đ3, module receipt: order.view (HDV không phụ trách → 404) rồi money.view phạm vi đơn
```

Ghi chú `+ GET /api/orders/:id/qr-thanh-toan (orders) = N+3` và nâng hai số đếm lên N + 3.

- [ ] **Bước 11: Chạy, thấy xanh.** `node --test src/modules/receipt/qr-thanh-toan.test.ts src/shared/qr-thong-tin.test.ts src/route-access.test.ts src/architecture.test.ts` → PASS. (`architecture.test.ts` xác nhận `receipt` vẫn không có SQL và chỉ đi cạnh đã khai.)

- [ ] **Bước 12: Kiểm toàn bộ rồi commit**

```bash
npm run typecheck && npm test
git add src/shared/qr-thong-tin.ts src/shared/qr-thong-tin.test.ts src/shared/contracts.ts src/modules/billing/index.ts src/modules/receipt src/route-access.test.ts
git commit -m "Route QR thanh toán: kiểm phạm vi đơn rồi dựng mã VietQR

Đi cổng đơn hàng để hướng dẫn viên và cộng tác viên dùng được; hỏi quyền xem đơn
trước rồi mới tới quyền xem tiền. Số tiền mặc định bằng còn lại, chặn số lớn hơn và
số gõ lạ; đơn đã giao hoặc hết tiền cần thu thì không có mã. DTO là danh sách trắng.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Migration mã giao dịch ngân hàng (billing)

**Files:**
- Create: `migrations/0088_bil_ma_giao_dich.sql`
- Create: `src/modules/billing/ma-giao-dich.ts` (chỉ phần `kiemMaGiaoDich` + kiểu, đủ cho bài so trigger ↔ hàm; phần còn lại ở Task 7)
- Test: `src/migrations-ma-giao-dich.test.ts`
- Modify: `docs/data-dictionary.json` + `npm run dict`

**Interfaces:**
- Produces: bảng `bil_receipt_bank_txn(id, receipt_id UNIQUE, txn_code, transferred_amount, WHO)`; mốc `bil_audit_cutoff.code = 'R-BIL-D6'`; mã lỗi trigger `bank_txn_receipt_invalid:`, `bank_txn_duplicate:`, `bank_txn_amount_mismatch:`, `bank_txn_over:`, `bank_txn_required:`.
- Produces (cho Task 7): `interface DongMa { receiptId: string; orderId: string; soTien: number; soThucChuyen: number }`, `kiemMaGiaoDich(i: { soThucChuyen: number; soTien: number; orderId: string; daCo: readonly DongMa[] }): KiemMa`.

Ghi chú cho người thi công: SQLite không bảo đảm thứ tự chạy của nhiều trigger `BEFORE INSERT` trên cùng bảng. Vì vậy mỗi ca kiểm chỉ được vi phạm **một** luật, kẻo mã lỗi đổi theo thứ tự.

- [ ] **Bước 1: Viết `kiemMaGiaoDich`** (luật thuần, cần cho bài so trigger ↔ hàm)

`src/modules/billing/ma-giao-dich.ts`:

```ts
// Mã giao dịch ngân hàng của lần thu (ADR-0092 Đ6 + ADR-0108 đ4: T1, T2, T4, C1). Luật THUẦN, không I/O. Lớp CSDL: trigger của migration 0088 — cùng ba luật,
// cùng vị từ "còn hiệu lực" của `hieuLuc` (không phải dòng đảo, chưa bị đảo); bài so trigger ↔ hàm ở src/migrations-ma-giao-dich.test.ts.
import { dong } from "./rules.ts";

/** Một dòng nối CÒN HIỆU LỰC của cùng mã (mọi đơn): lần thu, đơn, số tiền lần thu, số thực chuyển ghi trên dòng nối. */
export interface DongMa {
  receiptId: string;
  orderId: string;
  soTien: number;
  soThucChuyen: number;
}
export type KiemMa =
  | { ok: true }
  | { ok: false; ma: "bank_txn_duplicate" | "bank_txn_amount_mismatch" | "bank_txn_over"; cau: string; soThucChuyen?: number };

/**
 * Ba luật chặn (đặc tả §5): trùng mã cùng đơn; số thực chuyển khác số đã ghi cho mã (T2); tổng các lần thu gắn mã vượt số thực chuyển. `daCo` = dòng nối còn
 * hiệu lực của cùng mã, ĐÃ loại các lần thu sắp bị thay (Thay lần thu) và ĐÃ gồm các gắn trước đó trong cùng lệnh.
 */
export function kiemMaGiaoDich(i: { soThucChuyen: number; soTien: number; orderId: string; daCo: readonly DongMa[] }): KiemMa {
  if (i.daCo.some((d) => d.orderId === i.orderId)) {
    return { ok: false, ma: "bank_txn_duplicate", cau: "Mã giao dịch này đã gắn với một lần thu khác của đơn này — một khoản chuyển không xác nhận hai lần cho cùng đơn." };
  }
  const a = i.daCo[0]?.soThucChuyen;
  if (a !== undefined && a !== i.soThucChuyen) {
    return {
      ok: false, ma: "bank_txn_amount_mismatch", soThucChuyen: a,
      cau: `Mã này đã ghi số tiền thực chuyển ${dong(a)} — nhập đúng số đó theo sao kê. Lần trước nhập nhầm thì sửa bằng “Đảo” (trước Đã giao) hoặc “Thay lần thu”.`,
    };
  }
  const tong = i.daCo.reduce((s, d) => s + d.soTien, 0) + i.soTien;
  if (tong > i.soThucChuyen) return { ok: false, ma: "bank_txn_over", cau: `Tổng các lần thu gắn mã này (${dong(tong)}) vượt số tiền thực chuyển ${dong(i.soThucChuyen)}.` };
  return { ok: true };
}
```

- [ ] **Bước 2: Bài đỏ cho migration**

`src/migrations-ma-giao-dich.test.ts`:

```ts
// Kiểm migration *_bil_ma_giao_dich.sql (ADR-0092 Đ6 + ADR-0108 đ4; đặc tả QR §5, §6). Chèn THẲNG bằng SQL — khoá ở CSDL. Khoá ngoại TẮT (không dựng hồ sơ người).
// Mốc cắt 'R-BIL-D6' = lúc áp migration, nên lần thu "sau mốc" dùng SAU (2099), "trước mốc" dùng TRUOC (2000). Mỗi ca chỉ vi phạm MỘT luật (thứ tự trigger không cố định).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { kiemMaGiaoDich, type DongMa } from "./modules/billing/ma-giao-dich.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_bil_ma_giao_dich.sql"));
const SAU = "2099-01-01T00:00:00.000Z";
const TRUOC = "2000-01-01T00:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);

function moi(list = files): { db: DatabaseSync; ct: string } {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  const ct = (db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get() as { party_id: string }).party_id;
  for (const o of ["o1", "o2", "o3"]) {
    run(db, `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
      VALUES (?, ?, 's1', 'draft', 'Khách Giả', '0900000009', 1000000, 1000000, 1000000, ?, ?)`, o, `TD-${o}`, SAU, SAU); // trạng thái không ảnh hưởng trigger sổ tiền
  }
  return { db, ct };
}
let n = 0;
function lanThu(db: DatabaseSync, ct: string, o: { order: string; amount: number; method?: string; role?: "COMPANY" | "STAFF"; at?: string; replacement?: string | null }): string {
  const id = `r${++n}`;
  const role = o.role ?? "COMPANY";
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, replacement_id)
    VALUES (?, ?, 'CUSTOMER_PAYMENT', ?, ?, ?, ?, ?, 'PREPAID', '2026-10-08', NULL, NULL, ?, 'kt', ?, 'kt', ?)`,
    id, o.order, o.amount, role === "COMPANY" ? ct : "hdv", role, o.method ?? "BANK_TRANSFER", ct, o.at ?? SAU, o.at ?? SAU, o.replacement ?? null);
  return id;
}
function dao(db: DatabaseSync, goc: string, replacement: string | null = null): string {
  const id = `r${++n}`;
  run(db, `INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, replacement_id)
    SELECT ?, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, id, 'đảo thử',
      ?, 'kt', ?, 'kt', ? FROM bil_payment_receipt WHERE id = ?`, id, SAU, SAU, replacement, goc);
  return id;
}
const gan = (db: DatabaseSync, receipt: string, ma: string, so: number) =>
  run(db, `INSERT INTO bil_receipt_bank_txn (id, receipt_id, txn_code, transferred_amount, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 'kt', ?, 'kt')`,
    `t${++n}`, receipt, ma, so, SAU, SAU);
/** Cùng câu với `bankTxnOfCode` của billing/repository.ts (vị từ hieuLuc). */
const daCo = (db: DatabaseSync, ma: string): DongMa[] =>
  (db.prepare(`SELECT t.receipt_id, r.order_id, r.amount, t.transferred_amount FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
     WHERE t.txn_code = ? AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)`).all(ma) as
    { receipt_id: string; order_id: string; amount: number; transferred_amount: number }[]).map((x) => ({ receiptId: x.receipt_id, orderId: x.order_id, soTien: x.amount, soThucChuyen: x.transferred_amount }));

test("migration mã giao dịch có đúng một tệp; mốc cắt 'R-BIL-D6' đúng một dòng", () => {
  assert.ok(FILE, "thiếu migrations/*_bil_ma_giao_dich.sql");
  const { db } = moi();
  assert.equal((db.prepare("SELECT count(*) AS n FROM bil_audit_cutoff WHERE code = 'R-BIL-D6'").get() as { n: number }).n, 1);
});

test("(a) chỉ gắn vào lần thu của khách, gốc, còn hiệu lực, Công ty thu, chuyển khoản, không phải nửa chuyển cọc", () => {
  const { db, ct } = moi();
  assert.throws(() => gan(db, lanThu(db, ct, { order: "o1", amount: 100, method: "CASH" }), "MA0001", 100), /bank_txn_receipt_invalid:/, "tiền mặt");
  assert.throws(() => gan(db, lanThu(db, ct, { order: "o1", amount: 100, role: "STAFF" }), "MA0002", 100), /bank_txn_receipt_invalid:/, "nhân viên thu");
  const g = lanThu(db, ct, { order: "o1", amount: 100 });
  const d = dao(db, g);
  assert.throws(() => gan(db, d, "MA0003", 100), /bank_txn_receipt_invalid:/, "dòng đảo");
  assert.throws(() => gan(db, g, "MA0004", 100), /bank_txn_receipt_invalid:/, "đã bị đảo");
  gan(db, lanThu(db, ct, { order: "o1", amount: 100 }), "MA0005", 100);
});

test("(b)(c)(d) ba luật chặn; dòng nối của lần thu đã đảo rơi khỏi kiểm; mỗi ca trigger và hàm thuần cho CÙNG kết luận", () => {
  const { db, ct } = moi();
  const ca: { mo: string; ma: string; so: number; r: () => string; mong: string | null }[] = [];
  const r1 = lanThu(db, ct, { order: "o1", amount: 400 });
  gan(db, r1, "XMA1", 800);
  ca.push({ mo: "trùng mã cùng đơn", ma: "XMA1", so: 800, r: () => lanThu(db, ct, { order: "o1", amount: 100 }), mong: "bank_txn_duplicate" });
  ca.push({ mo: "lệch số thực chuyển", ma: "XMA1", so: 700, r: () => lanThu(db, ct, { order: "o2", amount: 100 }), mong: "bank_txn_amount_mismatch" });
  ca.push({ mo: "vượt số thực chuyển", ma: "XMA1", so: 800, r: () => lanThu(db, ct, { order: "o2", amount: 401 }), mong: "bank_txn_over" });
  ca.push({ mo: "đúng: đơn khác, cùng số, trong trần", ma: "XMA1", so: 800, r: () => lanThu(db, ct, { order: "o2", amount: 400 }), mong: null });
  for (const c of ca) {
    const rid = c.r();
    const lt = db.prepare("SELECT amount, order_id FROM bil_payment_receipt WHERE id = ?").get(rid) as { amount: number; order_id: string };
    const thuan = kiemMaGiaoDich({ soThucChuyen: c.so, soTien: lt.amount, orderId: lt.order_id, daCo: daCo(db, c.ma) });
    let csdl: string | null = null;
    try {
      gan(db, rid, c.ma, c.so);
    } catch (e) {
      csdl = /(bank_txn_[a-z_]+):/.exec(String(e))?.[1] ?? String(e);
    }
    assert.equal(thuan.ok ? null : thuan.ma, c.mong, `${c.mo} — hàm thuần`);
    assert.equal(csdl, c.mong, `${c.mo} — trigger`);
  }
  // Đảo lần thu có mã ⇒ dòng nối rơi khỏi kiểm ⇒ ghi lại cùng mã với số thực chuyển KHÁC được, khi không còn lần thu nào khác giữ mã.
  const { db: d2, ct: c2 } = moi();
  const a = lanThu(d2, c2, { order: "o1", amount: 500 });
  gan(d2, a, "ZMA1", 500);
  dao(d2, a);
  gan(d2, lanThu(d2, c2, { order: "o1", amount: 600 }), "ZMA1", 600);
});

test("(e) đường 1: dòng 'Công ty đã nhận' của lần thu CK – Công ty thu ghi SAU mốc mà chưa có mã ⇒ chặn; tiền mặt / trước mốc / đã có mã ⇒ qua; trước migration ⇒ không chặn", () => {
  const xacNhan = (db: DatabaseSync, ct: string, r: string) => {
    const p = `p${++n}`;
    const held = `l${++n}`;
    run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, 'RECEIPT', 'o1', NULL, '2026-10-08', ?, ?)", p, SAU, SAU);
    run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
      VALUES (?, ?, 'hdv', ?, 100, 'HELD', 'o1', ?, NULL, ?, ?)`, held, p, ct, r, SAU, SAU);
    const pc = `p${++n}`;
    run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, 'COMPANY_RECEIVED', 'o1', NULL, '2026-10-08', ?, ?)", pc, SAU, SAU);
    run(db, `INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
      VALUES (?, ?, ?, 'hdv', 100, 'HELD', 'o1', ?, ?, ?, ?)`, `l${++n}`, pc, ct, r, held, SAU, SAU);
  };
  const { db, ct } = moi();
  assert.throws(() => xacNhan(db, ct, lanThu(db, ct, { order: "o1", amount: 100 })), /bank_txn_required:/);
  xacNhan(db, ct, lanThu(db, ct, { order: "o1", amount: 100, method: "CASH" }));
  xacNhan(db, ct, lanThu(db, ct, { order: "o1", amount: 100, at: TRUOC }));
  const coMa = lanThu(db, ct, { order: "o1", amount: 100 });
  gan(db, coMa, "EMA1", 100);
  xacNhan(db, ct, coMa);
  const truoc = moi(files.filter((f) => f < FILE!));
  xacNhan(truoc.db, truoc.ct, lanThu(truoc.db, truoc.ct, { order: "o1", amount: 100 }));
});

test("(f) đường 3: phiếu REPLACEMENT có lần thu mới CK – Công ty thu chưa có mã ⇒ chặn; gắn mã (sau dòng đảo) ⇒ qua, kể cả CÙNG mã với lần thu cũ", () => {
  const thay = (db: DatabaseSync, ct: string, coMa: boolean) => {
    const cu = lanThu(db, ct, { order: "o1", amount: 300 });
    gan(db, cu, "FMA1", 300);
    const m = `m${++n}`;
    const moiR = lanThu(db, ct, { order: "o1", amount: 300, replacement: m });
    dao(db, cu, m);
    if (coMa) gan(db, moiR, "FMA1", 300);
    run(db, "INSERT INTO bil_posting (id, kind_code, order_id, reason, occurred_date, created_at, updated_at) VALUES (?, 'REPLACEMENT', 'o1', 'thay vì ghi nhầm người thu', '2026-10-08', ?, ?)", m, SAU, SAU);
  };
  const a = moi();
  assert.throws(() => thay(a.db, a.ct, false), /bank_txn_required:/);
  const b = moi();
  thay(b.db, b.ct, true);
});

test("(g) chỉ-thêm: không sửa, không xoá dòng nối; (h) CHECK mã đã chuẩn hoá 4–40 [A-Z0-9], số thực chuyển > 0; receipt_id duy nhất", () => {
  const { db, ct } = moi();
  const r = lanThu(db, ct, { order: "o1", amount: 100 });
  gan(db, r, "GMA1", 100);
  assert.throws(() => run(db, "UPDATE bil_receipt_bank_txn SET transferred_amount = 999"), /bil_append_only:/);
  assert.throws(() => run(db, "DELETE FROM bil_receipt_bank_txn"), /bil_append_only:/);
  assert.throws(() => gan(db, r, "GMA2", 100), /UNIQUE constraint failed: bil_receipt_bank_txn\.receipt_id/);
  for (const ma of ["ab12", "AB1", "AB-12", "Đ123", "X".repeat(41)]) assert.throws(() => gan(db, lanThu(db, ct, { order: "o3", amount: 1 }), ma, 1), /CHECK constraint failed/, ma);
  // Số thực chuyển 0: trigger BEFORE INSERT chạy TRƯỚC CHECK của SQLite, nên luật "vượt" (1 > 0) có thể báo trước — chấp nhận một trong hai, miễn là bị chặn.
  assert.throws(() => gan(db, lanThu(db, ct, { order: "o3", amount: 1 }), "HMA1", 0), /CHECK constraint failed|bank_txn_over:/);
});
```

- [ ] **Bước 3: Chạy, thấy đỏ.** `node --test src/migrations-ma-giao-dich.test.ts` → FAIL "thiếu migrations/*_bil_ma_giao_dich.sql".

- [ ] **Bước 4: Viết migration**

`migrations/0088_bil_ma_giao_dich.sql`:

```sql
-- Migration 0088 — MÃ GIAO DỊCH NGÂN HÀNG CỦA LẦN THU (ADR-0092 Đ6 + ADR-0108 đ4: T1, T2, T4, C1; đặc tả docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md
-- §5, §6). Module `billing`. Chỉ THÊM. Máy chủ kiểm trước (billing/ma-giao-dich.ts, service.ts, thay-lan-thu.ts); đây là lớp 2. "Còn hiệu lực" = vị từ `hieuLuc`
-- của billing/rules.ts: không phải dòng đảo và chưa bị đảo — dòng nối của lần thu đã đảo TỰ RƠI khỏi mọi phép kiểm. Câu lỗi có tiền tố mã — route dịch.

-- Bảng nối lần thu ↔ mã giao dịch (+ số tiền thực chuyển theo sao kê — T2). Một lần thu tối đa một mã. Không cột sửa, không dòng thay thế.
CREATE TABLE bil_receipt_bank_txn (
  id                 TEXT PRIMARY KEY,
  receipt_id         TEXT NOT NULL UNIQUE REFERENCES bil_payment_receipt(id),
  txn_code           TEXT NOT NULL CHECK (length(txn_code) BETWEEN 4 AND 40 AND txn_code NOT GLOB '*[^A-Z0-9]*'),
  transferred_amount INTEGER NOT NULL CHECK (transferred_amount > 0),
  created_at         TEXT NOT NULL,
  created_by         TEXT,
  updated_at         TEXT NOT NULL,
  updated_by         TEXT
);
CREATE INDEX bil_receipt_bank_txn_code_ix ON bil_receipt_bank_txn(txn_code);
CREATE TRIGGER bil_receipt_bank_txn_no_update BEFORE UPDATE ON bil_receipt_bank_txn
BEGIN SELECT RAISE(ABORT, 'bil_append_only: mã giao dịch đã gắn không sửa được — sửa bằng Đảo / Thay lần thu'); END;
CREATE TRIGGER bil_receipt_bank_txn_no_delete BEFORE DELETE ON bil_receipt_bank_txn
BEGIN SELECT RAISE(ABORT, 'bil_append_only: mã giao dịch đã gắn không xoá được'); END;

-- (a) Chỉ gắn vào lần thu của khách, GỐC, còn hiệu lực, người thu Công ty, chuyển khoản, không phải nửa thu của lệnh chuyển cọc.
CREATE TRIGGER bil_receipt_bank_txn_receipt BEFORE INSERT ON bil_receipt_bank_txn
WHEN NOT EXISTS (
  SELECT 1 FROM bil_payment_receipt r WHERE r.id = NEW.receipt_id AND r.kind_code = 'CUSTOMER_PAYMENT' AND r.reverses_id IS NULL AND r.transfer_of_id IS NULL
    AND r.collector_role_code = 'COMPANY' AND r.method_code = 'BANK_TRANSFER' AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
BEGIN SELECT RAISE(ABORT, 'bank_txn_receipt_invalid: chỉ gắn mã cho lần thu chuyển khoản – Công ty thu còn hiệu lực'); END;

-- (b) Trùng mã cùng đơn: cùng mã đã gắn một lần thu còn hiệu lực của cùng đơn.
CREATE TRIGGER bil_receipt_bank_txn_duplicate BEFORE INSERT ON bil_receipt_bank_txn
WHEN EXISTS (
  SELECT 1 FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
  WHERE t.txn_code = NEW.txn_code AND r.order_id = (SELECT order_id FROM bil_payment_receipt WHERE id = NEW.receipt_id)
    AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
BEGIN SELECT RAISE(ABORT, 'bank_txn_duplicate: mã giao dịch đã gắn với một lần thu khác của đơn này'); END;

-- (c) T2: mọi dòng còn hiệu lực của cùng mã ghi CÙNG một số thực chuyển.
CREATE TRIGGER bil_receipt_bank_txn_amount_mismatch BEFORE INSERT ON bil_receipt_bank_txn
WHEN EXISTS (
  SELECT 1 FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
  WHERE t.txn_code = NEW.txn_code AND t.transferred_amount <> NEW.transferred_amount
    AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
BEGIN SELECT RAISE(ABORT, 'bank_txn_amount_mismatch: số tiền thực chuyển khác số đã ghi cho mã này'); END;

-- (d) Tổng các lần thu còn hiệu lực gắn cùng mã (mọi đơn) + lần thu đang gắn ≤ số thực chuyển.
CREATE TRIGGER bil_receipt_bank_txn_over BEFORE INSERT ON bil_receipt_bank_txn
WHEN (SELECT COALESCE(SUM(r.amount), 0) FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
      WHERE t.txn_code = NEW.txn_code AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id))
   + (SELECT amount FROM bil_payment_receipt WHERE id = NEW.receipt_id) > NEW.transferred_amount
BEGIN SELECT RAISE(ABORT, 'bank_txn_over: tổng các lần thu gắn mã vượt số tiền thực chuyển'); END;

-- (e) C1 đường 1 — "Công ty đã nhận": dòng đảo giữ hộ thuộc phiếu COMPANY_RECEIVED của lần thu chuyển khoản – Công ty thu GHI TỪ mốc phải có mã. Phiếu
-- COMPANY_RECEIVED đứng ĐẦU lô và không trỏ lần thu, nên lớp chặn gắn vào DÒNG sổ (mang receipt_id); máy chủ chèn dòng nối TRƯỚC phiếu.
CREATE TRIGGER bil_debt_line_company_received_txn BEFORE INSERT ON bil_debt_line
WHEN NEW.reverses_line_id IS NOT NULL AND NEW.receipt_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM bil_posting p WHERE p.id = NEW.posting_id AND p.kind_code = 'COMPANY_RECEIVED')
  AND EXISTS (SELECT 1 FROM bil_payment_receipt r WHERE r.id = NEW.receipt_id AND r.collector_role_code = 'COMPANY' AND r.method_code = 'BANK_TRANSFER'
    AND r.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6'))
  AND NOT EXISTS (SELECT 1 FROM bil_receipt_bank_txn t WHERE t.receipt_id = NEW.receipt_id)
BEGIN SELECT RAISE(ABORT, 'bank_txn_required: xác nhận khoản chuyển khoản cần mã giao dịch ngân hàng'); END;

-- (f) C1 đường 3 — "Thay lần thu": phiếu đánh dấu REPLACEMENT (chèn CUỐI lô) — mọi lần thu MỚI chuyển khoản – Công ty thu của lô phải có mã. Máy chủ chèn
-- dòng nối SAU dòng đảo của lần thu cũ (nên dùng lại cùng mã không bị luật (b) chặn) và TRƯỚC phiếu này.
CREATE TRIGGER bil_posting_replacement_txn BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'REPLACEMENT' AND EXISTS (
  SELECT 1 FROM bil_payment_receipt n WHERE n.replacement_id = NEW.id AND n.reverses_id IS NULL AND n.kind_code = 'CUSTOMER_PAYMENT'
    AND n.collector_role_code = 'COMPANY' AND n.method_code = 'BANK_TRANSFER'
    AND n.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6')
    AND NOT EXISTS (SELECT 1 FROM bil_receipt_bank_txn t WHERE t.receipt_id = n.id))
BEGIN SELECT RAISE(ABORT, 'bank_txn_required: lần thu chuyển khoản mới trong lệnh Thay cần mã giao dịch ngân hàng'); END;

-- Đường 2 (Kế toán / Toàn quyền tự ghi lần thu trước Đã giao) KHÔNG có phiếu để gắn trigger: "bắt buộc mã" ở đó CHỈ máy chủ; lưới thứ hai là R-BIL-D6b
-- của scripts/audit-checks.mjs (khai ở docs/SO-HANG-RAO.md — dựa vào kỷ luật ở lớp CSDL).

-- C1: mốc cắt cứng — lần thu ghi TỪ mốc mới bị đòi mã; dòng cũ không đòi bổ sung. Cũng là mốc của R-BIL-D6a/D6b. Chỉ-thêm.
INSERT INTO bil_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by)
VALUES ('R-BIL-D6', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');
```

- [ ] **Bước 5: Chạy, thấy xanh.** `node --test src/migrations-ma-giao-dich.test.ts` → PASS cả 6 bài.

- [ ] **Bước 6: Quan sát chặn thật (P16).** Lần lượt tạm xoá **từng** trigger (a) `bil_receipt_bank_txn_receipt`, (b) `…_duplicate`, (c) `…_amount_mismatch`, (d) `…_over`, (e) `bil_debt_line_company_received_txn`, (f) `bil_posting_replacement_txn`, cùng hai trigger chỉ-thêm, trong tệp migration. Mỗi lần chạy bài, thấy đúng bài tương ứng đỏ, rồi hoàn nguyên và thấy xanh. Ghi mỗi trigger một dòng vào bảng "Quan sát chặn thật" của sổ thi công (sổ hàng rào ở Task 13 lấy ngày từ đây).

- [ ] **Bước 7: Từ điển dữ liệu.** Thêm cạnh các bảng `bil_*` của `docs/data-dictionary.json`:

```json
    {
      "name": "bil_receipt_bank_txn",
      "module": "billing",
      "kind": "table",
      "note": "nối lần thu ↔ mã giao dịch ngân hàng + số tiền thực chuyển theo sao kê (ADR-0092 Đ6, ADR-0108 đ4 T2; migration 0088), CHỈ-THÊM, receipt_id duy nhất. Chỉ lần thu chuyển khoản – Công ty thu. Ba luật ở trigger (trùng cùng đơn, số thực chuyển lệch, tổng vượt) theo vị từ hieuLuc. Chỉ người có ledger.write thấy mã; nhật ký không chép mã"
    },
```

Sửa `note` của `bil_audit_cutoff`, thêm câu: "Dòng 'R-BIL-D6' (0088) là mốc cắt C1 của mã giao dịch ngân hàng." Chạy `npm run dict`.

- [ ] **Bước 8: Kiểm toàn bộ rồi commit**

```bash
npm run typecheck && npm test
git add migrations/0088_bil_ma_giao_dich.sql src/migrations-ma-giao-dich.test.ts src/modules/billing/ma-giao-dich.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md
git commit -m "Migration 0088: mã giao dịch ngân hàng của lần thu (ADR-0092 Đ6)

Bảng nối chỉ-thêm và ba trigger chặn: trùng mã cùng đơn, số thực chuyển lệch, tổng
vượt số thực chuyển. Hai trigger bắt buộc mã cho Công ty đã nhận và Thay lần thu,
áp từ mốc cắt lúc áp migration. Có bài so trigger với hàm thuần trên cùng dữ liệu.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Máy chủ sổ tiền: nối mã vào bốn đường ghi

**Files:**
- Modify: `src/modules/billing/ma-giao-dich.ts` (thêm chuẩn hoá + đọc), `src/modules/billing/ma-giao-dich.test.ts` (tạo)
- Modify: `src/modules/billing/repository.ts` (cuối tệp — tệp này nằm trong danh sách `STRICT` của bài kiến trúc nên câu SQL mới được EXPLAIN), `src/modules/billing/service.ts`, `src/modules/billing/thay-lan-thu.ts`
- Modify: `src/shared/contracts.ts` (`LanThuDto`, `LanThuInput`), `src/shared/audit-actions.ts`
- Modify (sửa bài cũ cho luật mới): theo kiểm kê ở Bước 9
- Test: `src/modules/billing/ma-giao-dich-route.test.ts`

**Interfaces:**
- Consumes: `kiemMaGiaoDich`, `DongMa` (Task 6).
- Produces: `chuanHoaMaGiaoDich(raw: unknown): string | null`; `docGiaoDich(raw, o: { choPhep: boolean; batBuoc: boolean }): { ok: true; value: GiaoDich | null } | { ok: false; ma: string; cau: string }`; `interface GiaoDich { ma: string; soThucChuyen: number }`; thân request mới `maGiaoDich?: string; soThucChuyen?: number` ở `LanThuInput`, ở thân "Công ty đã nhận", ở từng phần tử `moi[]` của "Thay lần thu"; `LanThuDto.maGiaoDich?` và `LanThuDto.soThucChuyen?` (chỉ khi người xem có `ledger.write`); lỗi 409 `bank_txn_amount_mismatch` có thêm trường `error.soThucChuyen` (Task 10 đọc qua `ApiError.details`).

- [ ] **Bước 1: Bài đỏ cho chuẩn hoá và đọc**

`src/modules/billing/ma-giao-dich.test.ts`:

```ts
// Luật thuần mã giao dịch (ADR-0092 Đ6; đặc tả QR §5; Review Focus 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chuanHoaMaGiaoDich, docGiaoDich, kiemMaGiaoDich } from "./ma-giao-dich.ts";

test("chuẩn hoá: bỏ cách / - . /, in hoa, chữ số toàn khổ → ASCII; còn ký tự lạ hoặc ngoài 4–40 ⇒ null (không lặng lẽ cắt chữ)", () => {
  assert.equal(chuanHoaMaGiaoDich("ft 2610.0812/345"), "FT26100812345");
  assert.equal(chuanHoaMaGiaoDich("１２３４５６７８９０１２"), "123456789012");
  assert.equal(chuanHoaMaGiaoDich("123456789012"), "123456789012", "ô mã MIỄN luật chặn dãy ≥ 8 chữ số");
  for (const x of ["ĐMA123", "AB_12", "--..", "AB1", "A".repeat(41), "", 12345, null]) assert.equal(chuanHoaMaGiaoDich(x), null, String(x));
});

test("đọc: không được phép mà gửi ⇒ lỗi; bắt buộc mà thiếu ⇒ bank_txn_required; thiếu một nửa / sai dạng ⇒ invalid_input", () => {
  assert.deepEqual(docGiaoDich({}, { choPhep: false, batBuoc: false }), { ok: true, value: null });
  assert.equal(docGiaoDich({ maGiaoDich: "FT1234" }, { choPhep: false, batBuoc: false }).ok, false);
  const thieu = docGiaoDich({}, { choPhep: true, batBuoc: true });
  assert.equal(!thieu.ok && thieu.ma, "bank_txn_required");
  assert.deepEqual(docGiaoDich({}, { choPhep: true, batBuoc: false }), { ok: true, value: null });
  for (const raw of [{ maGiaoDich: "FT1234" }, { soThucChuyen: 100 }, { maGiaoDich: "x", soThucChuyen: 100 }, { maGiaoDich: "FT1234", soThucChuyen: 0 }, { maGiaoDich: "FT1234", soThucChuyen: "100" }]) {
    const r = docGiaoDich(raw, { choPhep: true, batBuoc: true });
    assert.equal(!r.ok && r.ma, "invalid_input", JSON.stringify(raw));
  }
  assert.deepEqual(docGiaoDich({ maGiaoDich: "ft-1234", soThucChuyen: 500 }, { choPhep: true, batBuoc: true }), { ok: true, value: { ma: "FT1234", soThucChuyen: 500 } });
});

test("ba luật: thứ tự trùng → lệch → vượt; lệch mang số đã ghi", () => {
  const d = [{ receiptId: "a", orderId: "o1", soTien: 400, soThucChuyen: 800 }];
  assert.equal((kiemMaGiaoDich({ soThucChuyen: 800, soTien: 1, orderId: "o1", daCo: d }) as { ma: string }).ma, "bank_txn_duplicate");
  assert.deepEqual(kiemMaGiaoDich({ soThucChuyen: 700, soTien: 1, orderId: "o2", daCo: d }).ok, false);
  assert.equal((kiemMaGiaoDich({ soThucChuyen: 700, soTien: 1, orderId: "o2", daCo: d }) as { soThucChuyen: number }).soThucChuyen, 800);
  assert.equal((kiemMaGiaoDich({ soThucChuyen: 800, soTien: 401, orderId: "o2", daCo: d }) as { ma: string }).ma, "bank_txn_over");
  assert.deepEqual(kiemMaGiaoDich({ soThucChuyen: 800, soTien: 400, orderId: "o2", daCo: d }), { ok: true });
});
```

- [ ] **Bước 2: Chạy, thấy đỏ.** `node --test src/modules/billing/ma-giao-dich.test.ts` → FAIL (chưa có `chuanHoaMaGiaoDich`).

- [ ] **Bước 3: Viết phần còn lại của luật thuần.** Thêm vào `src/modules/billing/ma-giao-dich.ts` (sau import):

```ts
export const MA_GD_TOI_THIEU = 4;
export const MA_GD_TOI_DA = 40;
const MA_GD_RE = new RegExp(`^[A-Z0-9]{${MA_GD_TOI_THIEU},${MA_GD_TOI_DA}}$`);
/** Trần số tiền — cùng MAX_SO_TIEN của service.ts (10 tỷ đồng). */
const SO_TOI_DA = 10_000_000_000;

/**
 * Chuẩn hoá (đặc tả §5): NFKC (chữ số toàn khổ → ASCII), bỏ dấu cách, '-', '.', '/', đổi in hoa. Còn ký tự khác chữ Latinh không dấu / số, hoặc dài ngoài
 * 4–40 ⇒ null — KHÔNG lặng lẽ bỏ ký tự lạ (một mã gõ sai phải báo, không biến thành mã khác). Ô mã được MIỄN luật chặn dãy ≥ 8 chữ số.
 */
export function chuanHoaMaGiaoDich(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.normalize("NFKC").replace(/[\s./-]/g, "").toUpperCase();
  return MA_GD_RE.test(s) ? s : null;
}

export interface GiaoDich {
  ma: string;
  soThucChuyen: number;
}
const co = (v: unknown): boolean => v !== undefined && v !== null && v !== "";

/**
 * Đọc cặp (mã, số thực chuyển) của MỘT lần thu. `choPhep` = lần thu này nhận mã (CK – Công ty thu, người ghi có ledger.write — hoặc khoản đang xác nhận là
 * CK); `batBuoc` = C1 đòi mã. Không được phép mà vẫn gửi ⇒ lỗi (không im lặng bỏ).
 */
export function docGiaoDich(raw: { maGiaoDich?: unknown; soThucChuyen?: unknown }, o: { choPhep: boolean; batBuoc: boolean }): { ok: true; value: GiaoDich | null } | { ok: false; ma: string; cau: string } {
  const coMa = co(raw.maGiaoDich);
  const coSo = co(raw.soThucChuyen);
  if (!o.choPhep) {
    return coMa || coSo ? { ok: false, ma: "invalid_input", cau: "Mã giao dịch ngân hàng chỉ do Kế toán nhập, cho khoản chuyển khoản vào tài khoản công ty." } : { ok: true, value: null };
  }
  if (!coMa && !coSo) return o.batBuoc ? { ok: false, ma: "bank_txn_required", cau: "Nhập mã giao dịch ngân hàng và số tiền thực chuyển theo sao kê." } : { ok: true, value: null };
  const ma = chuanHoaMaGiaoDich(raw.maGiaoDich);
  if (!ma) return { ok: false, ma: "invalid_input", cau: `Mã giao dịch chỉ gồm chữ không dấu và số, ${MA_GD_TOI_THIEU}–${MA_GD_TOI_DA} ký tự.` };
  const so = raw.soThucChuyen;
  if (typeof so !== "number" || !Number.isInteger(so) || so <= 0 || so > SO_TOI_DA) {
    return { ok: false, ma: "invalid_input", cau: "Số tiền thực chuyển phải là số nguyên dương (đồng), đúng như sao kê." };
  }
  return { ok: true, value: { ma, soThucChuyen: so } };
}
```

- [ ] **Bước 4: Chạy, thấy xanh.** `node --test src/modules/billing/ma-giao-dich.test.ts` → PASS.

- [ ] **Bước 5: SQL.** Cuối `src/modules/billing/repository.ts`, thêm:

```ts
// ---- Mã giao dịch ngân hàng (ADR-0092 Đ6; migration 0088). "Còn hiệu lực" = vị từ hieuLuc (không phải dòng đảo, chưa bị đảo). ----
export interface BankTxnRow {
  receipt_id: string;
  order_id: string;
  amount: number;
  transferred_amount: number;
}
const BANK_TXN_OF_CODE = defineSql(
  "billing",
  "bank_txn_of_code",
  `SELECT t.receipt_id, r.order_id, r.amount, t.transferred_amount FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
   WHERE t.txn_code = ?1 AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)`,
);
export async function bankTxnOfCode(db: D1Database, ma: string): Promise<BankTxnRow[]> {
  return (await db.prepare(BANK_TXN_OF_CODE).bind(ma).all<BankTxnRow>()).results;
}
const BANK_TXN_OF_ORDER = defineSql(
  "billing",
  "bank_txn_of_order",
  "SELECT t.receipt_id, t.txn_code, t.transferred_amount FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id WHERE r.order_id = ?1",
);
export async function bankTxnOfOrder(db: D1Database, orderId: string): Promise<Map<string, { ma: string; soThucChuyen: number }>> {
  const rows = (await db.prepare(BANK_TXN_OF_ORDER).bind(orderId).all<{ receipt_id: string; txn_code: string; transferred_amount: number }>()).results;
  return new Map(rows.map((r) => [r.receipt_id, { ma: r.txn_code, soThucChuyen: r.transferred_amount }]));
}
/** Gắn mã — lính gác: lần thu đã chèn (lô ghi lần thu có lính gác mốc Đã giao; không chèn ⇒ changes = 0, không lỗi khoá ngoại). */
const BANK_TXN_INSERT = defineSql(
  "billing",
  "bank_txn_insert",
  `INSERT INTO bil_receipt_bank_txn (id, receipt_id, txn_code, transferred_amount, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6 WHERE EXISTS (SELECT 1 FROM bil_payment_receipt WHERE id = ?2)`,
);
export const bankTxnInsertStatement = (db: D1Database, v: { id: string; receiptId: string; ma: string; soThucChuyen: number; at: string; by: string }) =>
  db.prepare(BANK_TXN_INSERT).bind(v.id, v.receiptId, v.ma, v.soThucChuyen, v.at, v.by);
const BANK_TXN_CUTOFF = defineSql("billing", "bank_txn_cutoff", "SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6'");
/** Mốc cắt C1. null (migration chưa áp) ⇒ nơi gọi coi là BẮT BUỘC (đóng an toàn). */
export async function mocMaGiaoDich(db: D1Database): Promise<string | null> {
  return (await db.prepare(BANK_TXN_CUTOFF).first<{ cutoff_at: string }>())?.cutoff_at ?? null;
}
```

- [ ] **Bước 6: Hành động nhật ký + hợp đồng.** Trong `src/shared/audit-actions.ts`, sau `ledger_reversal`, thêm:

```ts
  // ADR-0092 Đ6 (migration 0088): gắn mã giao dịch ngân hàng vào lần thu — target = lần thu (`ledger`, id lần thu); `detail` = "gắn mã giao dịch ngân hàng"
  // (chữ cố định); KHÔNG chép mã giao dịch, không số tài khoản.
  ledger_bank_txn_linked: { label: "Gắn mã giao dịch ngân hàng", group: "ledger" },
```

Trong `src/shared/contracts.ts`: thêm vào cuối `LanThuDto`:

```ts
  /** ADR-0092 Đ6: mã giao dịch ngân hàng đã chuẩn hoá + số tiền thực chuyển — CHỈ có khoá này khi người xem giữ `ledger.write` (Kế toán, Toàn quyền). */
  maGiaoDich?: string;
  soThucChuyen?: number;
```

và thêm vào cuối `LanThuInput`:

```ts
  /** ADR-0092 Đ6 (C1): BẮT BUỘC khi hình thức chuyển khoản + Công ty thu + người ghi là Kế toán / Toàn quyền; người khác gửi ⇒ 400. */
  maGiaoDich?: string;
  soThucChuyen?: number;
```

- [ ] **Bước 7: Nối vào `service.ts`.**

(a) Import: thêm `bankTxnInsertStatement, bankTxnOfCode, bankTxnOfOrder, mocMaGiaoDich` vào khối import từ `"./repository"`; thêm `import { docGiaoDich, kiemMaGiaoDich, type GiaoDich } from "./ma-giao-dich";`; đổi `import { UUID_RE, error } from "../../shared/http";` thành `import { UUID_RE, error, json } from "../../shared/http";`.

(b) Ngay sau `export const loi = …`, thêm:

```ts
/** Lỗi kèm trường dữ liệu trong thân `error` (giao diện đọc qua ApiError.details) — vd 409 "số thực chuyển lệch" mang số đã ghi để điền sẵn (không route tra mã). */
export const loiKem = (status: number, code: string, message: string, them: Record<string, unknown>): { ok: false; res: Response } => ({
  ok: false,
  res: json({ error: { code, message, ...them } }, status),
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Mã giao dịch ngân hàng (ADR-0092 Đ6 + ADR-0108 đ4) — ba đường ghi đòi mã (T1): "Công ty đã nhận"; Kế toán / Toàn quyền tự ghi (kể cả kèm Đã giao); lần thu
// mới trong "Thay lần thu". Lớp CSDL: trigger 0088 (đường 2 chỉ máy chủ — lưới thứ hai R-BIL-D6b).
// ---------------------------------------------------------------------------------------------------------------------------------------------------
/** T1 đường 2 + 3: lần thu CK – Công ty thu do người có `ledger.write` ghi — đúng vị từ mà `sinhDongLanThu` KHÔNG sinh dòng giữ hộ ⇒ bắt buộc mã. */
export const canMaGiaoDich = (lt: LanThuHopLe, ai: NguoiGoi): boolean => ai.laKeToan && lt.collectorRole === "COMPANY" && lt.hinhThuc === "BANK_TRANSFER";

/** Đọc mã của một lần thu MỚI (đường 2, 3). Thân `raw` là thân lần thu (có `maGiaoDich`, `soThucChuyen`). */
export function docGiaoDichCuaLanThu(raw: unknown, lt: LanThuHopLe, ai: NguoiGoi): KetQua<GiaoDich | null> {
  const b = (raw && typeof raw === "object" ? raw : {}) as { maGiaoDich?: unknown; soThucChuyen?: unknown };
  const can = canMaGiaoDich(lt, ai);
  const d = docGiaoDich(b, { choPhep: can, batBuoc: can });
  return d.ok ? d : loi(400, d.ma, d.cau);
}

/** Kiểm trước lô (lớp 1) mọi gắn mã của MỘT lệnh. `boQua` = lần thu sắp bị thay (Thay lần thu) — loại khỏi kiểm khi chúng còn hiệu lực lúc đọc. */
export async function kiemCacMa(
  db: D1Database,
  gan: readonly { gd: GiaoDich; orderId: string; soTien: number }[],
  boQua: ReadonlySet<string> = new Set(),
): Promise<KetQua<null>> {
  const trongLenh: { ma: string; receiptId: string; orderId: string; soTien: number; soThucChuyen: number }[] = [];
  for (const g of gan) {
    const daCo = [
      ...(await bankTxnOfCode(db, g.gd.ma)).filter((r) => !boQua.has(r.receipt_id)).map((r) => ({ receiptId: r.receipt_id, orderId: r.order_id, soTien: r.amount, soThucChuyen: r.transferred_amount })),
      ...trongLenh.filter((x) => x.ma === g.gd.ma),
    ];
    const k = kiemMaGiaoDich({ soThucChuyen: g.gd.soThucChuyen, soTien: g.soTien, orderId: g.orderId, daCo });
    if (!k.ok) return k.soThucChuyen !== undefined ? loiKem(409, k.ma, k.cau, { soThucChuyen: k.soThucChuyen }) : loi(409, k.ma, k.cau);
    trongLenh.push({ ma: g.gd.ma, receiptId: `moi-${trongLenh.length}`, orderId: g.orderId, soTien: g.soTien, soThucChuyen: g.gd.soThucChuyen });
  }
  return { ok: true, value: null };
}

/** Câu gắn mã + nhật ký (`changes() > 0`: chỉ ghi khi dòng nối đã chèn). Nhật ký KHÔNG chép mã. */
export function cauGanMa(db: D1Database, i: { receiptId: string; orderId: string; gd: GiaoDich; at: string; by: string }): D1PreparedStatement[] {
  const id = crypto.randomUUID();
  return [
    bankTxnInsertStatement(db, { id, receiptId: i.receiptId, ma: i.gd.ma, soThucChuyen: i.gd.soThucChuyen, at: i.at, by: i.by }),
    auditStatement(db, { orderId: i.orderId, staffId: i.by, action: "ledger_bank_txn_linked", at: i.at, targetType: "ledger", targetId: i.receiptId, detail: "gắn mã giao dịch ngân hàng" }, "changes() > 0"),
  ];
}

/** Lỗi lớp CSDL của mã (dữ liệu đổi giữa lúc kiểm và lúc ghi, hoặc hai người bấm cùng lúc) — null nếu không phải lỗi mã. */
export function loiMaTrigger(e: unknown): { ok: false; res: Response } | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/UNIQUE constraint failed: bil_receipt_bank_txn\.receipt_id/.test(m)) return loi(409, "stale", "Khoản này vừa được xác nhận — tải lại để xem.");
  if (loiTrigger(e, "bank_txn_duplicate")) return loi(409, "bank_txn_duplicate", "Mã giao dịch này vừa được gắn với một lần thu khác của đơn — tải lại để xem.");
  if (loiTrigger(e, "bank_txn_amount_mismatch")) return loi(409, "bank_txn_amount_mismatch", "Mã này vừa được ghi với số tiền thực chuyển khác — tải lại rồi thử lại.");
  if (loiTrigger(e, "bank_txn_over")) return loi(409, "bank_txn_over", "Tổng các lần thu gắn mã này vượt số tiền thực chuyển — tải lại rồi thử lại.");
  if (loiTrigger(e, "bank_txn_required")) return loi(400, "bank_txn_required", "Nhập mã giao dịch ngân hàng và số tiền thực chuyển theo sao kê.");
  if (loiTrigger(e, "bank_txn_receipt_invalid")) return loi(409, "stale", "Lần thu vừa thay đổi — tải lại rồi thử lại.");
  return null;
}
```

(`loiTrigger` khai ở đoạn "Đã giao" phía dưới. `loiMaTrigger` chỉ chạy khi có request, lúc mô-đun đã nạp xong, nên gọi được mà không cần dời khai báo.)

(c) `cauLanThu`: thêm `giaoDich?: GiaoDich | null` vào kiểu `input`; ngay sau dòng `auditStatement(… "payment_recorded" …)` trong mảng `out` (tức sau phần tử thứ 2, trước khối `if (dong.length > 0)`), thêm:

```ts
  // ADR-0092 Đ6: dòng nối mã (lính gác "lần thu đã chèn") ngay sau nhật ký lần thu; lần thu luôn là câu ĐẦU (ghiLanThu đọc kq[0]).
  if (input.giaoDich) out.push(...cauGanMa(db, { receiptId, orderId: input.orderId, gd: input.giaoDich, at: input.at, by: input.ai.staffId }));
```

(d) `ghiLanThu`: thay thân từ sau `if (!lt.ok) return lt;` bằng:

```ts
  const gd = docGiaoDichCuaLanThu(input.raw, lt.value, input.ai);
  if (!gd.ok) return gd;
  if (gd.value) {
    const k = await kiemCacMa(db, [{ gd: gd.value, orderId: input.orderId, soTien: lt.value.soTien }]);
    if (!k.ok) return k;
  }
  const at = new Date().toISOString();
  const stmts = cauLanThu(db, { orderId: input.orderId, lt: lt.value, stage: "PREPAID", ai: input.ai, congTyId, at, giaoDich: gd.value }, (r) => receiptBeforeDeliveredStatement(db, r));
  let kq: D1Result[];
  try {
    kq = await db.batch(stmts);
  } catch (e) {
    const m = loiMaTrigger(e);
    if (m) return m;
    throw e;
  }
  if ((kq[0]!.meta.changes ?? 0) === 0) return DA_GIAO(); // đơn vừa "Đã giao" giữa lúc đọc và lúc ghi (lính gác của câu lần thu)
  return { ok: true, value: null };
```

(e) `daGiao`: sau khối đọc `lt` (sau `lt = doc.value;` và đóng `if`), thêm:

```ts
  let gd: GiaoDich | null = null;
  if (lt) {
    const d = docGiaoDichCuaLanThu(input.rawLanThu, lt, ai);
    if (!d.ok) return d;
    gd = d.value;
    if (gd) {
      const k = await kiemCacMa(db, [{ gd, orderId: input.orderId, soTien: lt.soTien }]);
      if (!k.ok) return k;
    }
  }
```

đổi dòng `if (lt) stmts.push(...cauLanThu(…))` thành truyền thêm `giaoDich: gd` trong `input`, và đầu khối `catch (e)` của lô thêm:

```ts
    const m = loiMaTrigger(e);
    if (m) return m;
```

(f) `xacNhanCongTyNhan`: sau khối `const ngay = docNgay(b.ngayPhatSinh); if (!ngay.ok) return ngay;`, thêm:

```ts
  // ADR-0092 Đ6 đường 1 + C1: khoản chuyển khoản ghi TỪ mốc cắt bắt buộc mã; khoản cũ hơn mốc không bắt buộc (nhập thì vẫn gắn và kiểm). Tiền mặt không nhận mã.
  const laCK = rc.method_code === "BANK_TRANSFER";
  const moc = laCK ? await mocMaGiaoDich(db) : null;
  const d = docGiaoDich(b, { choPhep: laCK, batBuoc: laCK && (moc === null || rc.created_at >= moc) });
  if (!d.ok) return loi(400, d.ma, d.cau);
  if (d.value) {
    const k = await kiemCacMa(db, [{ gd: d.value, orderId: rc.order_id, soTien: rc.amount }]);
    if (!k.ok) return k;
  }
```

đổi mảng `stmts` để dòng nối đứng ĐẦU lô (trigger 0088 (e) đòi mã có trước dòng sổ):

```ts
  const stmts = [
    ...(d.value ? cauGanMa(db, { receiptId: rc.id, orderId: rc.order_id, gd: d.value, at, by: input.ai.staffId }) : []),
    postingPlainStatement(db, { id: postingId, kind: "COMPANY_RECEIVED", orderId: rc.order_id, reason: null, reversesPostingId: null, occurredDate: ngay.value, dueSnapshot: null, at, by: input.ai.staffId }),
    ...cho.map((l) => lineIfPostingStatement(db, lineOf(sinhDongXacNhanCongTy(toLineRow(l)), postingId, rc.order_id, rc.id, at, input.ai.staffId))),
    auditStatement(db, { orderId: rc.order_id, staffId: input.ai.staffId, action: "ledger_company_received", at }),
  ];
```

và đầu khối `catch (e)` thêm `const m = loiMaTrigger(e); if (m) return m;` (đặt **trước** dòng kiểm `UNIQUE constraint failed: bil_debt_line.reverses_line_id`).

(g) DTO: đổi chữ ký `lanThuDto(rows, xemNguoiThu)` thành `lanThuDto(rows, xemNguoiThu, ma: Map<string, { ma: string; soThucChuyen: number }> | null)`, và trong `rows.map` thêm sau `ghiLuc: r.created_at,`:

```ts
    // ADR-0092 Đ6: chỉ người có ledger.write thấy mã + số thực chuyển — người khác KHÔNG có khoá này (không chỉ là null).
    ...(ma?.has(r.id) ? { maGiaoDich: ma.get(r.id)!.ma, soThucChuyen: ma.get(r.id)!.soThucChuyen } : {}),
```

Trong `tienCuaDon`, thêm `ai.laKeToan ? bankTxnOfOrder(db, info.orderId) : Promise.resolve(null)` vào `Promise.all` đầu hàm (đặt tên `maDon`) và đổi `lanThu: lanThuDto(receipts, ai.laKeToan)` thành `lanThu: lanThuDto(receipts, ai.laKeToan, maDon)`.

- [ ] **Bước 8: Nối vào "Thay lần thu".** Trong `src/modules/billing/thay-lan-thu.ts`:

(a) Import thêm `cauGanMa, docGiaoDichCuaLanThu, kiemCacMa, loiMaTrigger` từ `"./service"` và `type GiaoDich` từ `"./ma-giao-dich"`.

(b) Đổi vòng đọc `moi`:

```ts
  const moi: { lt: LanThuHopLe; gd: GiaoDich | null }[] = [];
  for (const m of moiRaw) {
    const lt = await docLanThu(db, { ...(m as object), ngayPhatSinh: ngay.value }, input.ai, congTyId);
    if (!lt.ok) return lt;
    const gd = docGiaoDichCuaLanThu(m, lt.value, input.ai);
    if (!gd.ok) return gd;
    moi.push({ lt: lt.value, gd: gd.value });
  }
  // ADR-0092 Đ6 (đặc tả §5 "Trong lô Thay"): máy chủ kiểm khi lần thu cũ CÒN hiệu lực ⇒ loại các lần thu trong `cu` khỏi kiểm trùng / lệch / tổng.
  const ganMa = moi.flatMap((m) => (m.gd ? [{ gd: m.gd, orderId, soTien: m.lt.soTien }] : []));
  if (ganMa.length > 0) {
    const k = await kiemCacMa(db, ganMa, new Set(cuRows.map((r) => r.id)));
    if (!k.ok) return k;
  }
```

và sửa mọi chỗ dùng `m.soTien`, `m.collectorPartyId`, `m.collectorRole`, `m.hinhThuc`, `m.ghiChu` trong hàm thành `m.lt.<tên>` (gồm `tongMoi`, `doiNguoi`, vòng bước 1).

(c) Ở bước 1, giữ id của từng lần thu mới: khai `const ridMoi: string[] = [];` trước vòng, và trong vòng sau `const rid = crypto.randomUUID();` thêm `ridMoi.push(rid);`.

(d) Sau vòng bước 2 (đảo lần thu cũ), **trước** câu phiếu REPLACEMENT, thêm:

```ts
  // 2b. ADR-0092 Đ6: dòng nối mã của lần thu MỚI — SAU dòng đảo (lần thu cũ đã rơi khỏi hieuLuc ⇒ dùng lại cùng mã không bị luật trùng chặn), TRƯỚC phiếu
  // đánh dấu (trigger 0088 (f) đòi mã khi phiếu chèn).
  moi.forEach((m, i) => {
    if (m.gd) stmts.push(...cauGanMa(db, { receiptId: ridMoi[i]!, orderId, gd: m.gd, at, by }));
  });
```

(e) Đầu khối `catch (e)` của lô thêm `const m = loiMaTrigger(e); if (m) return m;`.

- [ ] **Bước 9: Kiểm kê và sửa bài cũ cho luật mới.** Bật luật C1 làm đỏ mọi bài cũ có Kế toán / Toàn quyền ghi CK – Công ty thu, hoặc xác nhận khoản CK, hoặc Thay bằng lần thu CK – Công ty thu mà không gửi mã. Chạy:

```bash
grep -rn -e "BANK_TRANSFER" -e "company-receipts" -e "receipt-replacements" src tests | grep -E "\.(test\.ts|mjs):"
```

Kỳ vọng (hôm nay): `src/lan-gui-phu-route.test.ts`, `src/modules/billing/lo-ghi.test.ts`, `src/modules/billing/thay-lan-thu.test.ts`, `src/modules/billing/don-huy-route.test.ts`, `tests/e2e/so-tien.mjs`, `tests/e2e/chong-ghi-trung.mjs`, `tests/e2e/coc-don-huy.mjs` (và `src/migrations-billing.test.ts`, `src/modules/receipt/bien-nhan.test.ts` không bị ảnh hưởng vì dữ liệu trước mốc / người thu là nhân viên). Luật sửa, áp **từng lời gọi**:
  - người gọi giữ `ACCOUNTING` hoặc `SUPER_ADMIN`, thân có `hinhThuc: "BANK_TRANSFER"` và `nguoiThu: "cong_ty"` (hoặc `{ partyId: <công ty chủ> }`) ⇒ thêm `maGiaoDich: "<mã riêng>", soThucChuyen: <đúng soTien>`;
  - mọi lời gọi `company-receipts/:id/confirm` cho khoản CK ⇒ thân `{ maGiaoDich: "<mã riêng>", soThucChuyen: <đúng số của khoản> }`;
  - mỗi phần tử `moi[]` CK – Công ty thu của `receipt-replacements` ⇒ thêm cặp đó (thay một-đổi-một thì có thể dùng lại mã cũ).

  Mã riêng: chuỗi ≥ 4 ký tự không trùng trong cùng đơn, ví dụ `FTLG0001`, `FTLG0002`… Ví dụ một chỗ sửa ở `thay-lan-thu.test.ts`:

```ts
  const r = await thay(w, KT, { orderId: id, cu: [r600], moi: [{ soTien: 600_000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: "FTTH0001", soThucChuyen: 600_000 }], lyDo: "Khách chuyển khoản cho công ty, HDV ghi nhầm" });
```

  Chạy `npm test`, sửa tới khi chỉ còn đỏ ở bài mới chưa viết. Các tệp e2e sửa theo cùng luật; chạy chúng ở Task 12. Ghi danh sách tệp đã sửa vào sổ thi công.

- [ ] **Bước 10: Bài route mới**

`src/modules/billing/ma-giao-dich-route.test.ts`:

```ts
// ADR-0092 Đ6 + ADR-0108 đ4 qua ROUTE THẬT (khung thử): ba đường ghi đòi mã, ba luật chặn, lối ra khai trùng sau Đã giao, ai thấy mã, nhật ký không chép mã,
// hai người bấm cùng lúc, khoản trước mốc. Đặc tả QR §5, §8.8; Review Focus 2, 3, 5.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const KT2 = "45454545-4545-4545-8545-454545454545";
const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [KT2, "0900000015", "Hoa Kế Toán", ["ACCOUNTING"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn ĐÃ XÁC NHẬN `tong` đồng, ngày đi hôm nay, HDV phụ trách. */
function don(w: W, tong = 1_000_000): string {
  const id = uuid();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 1, ?)`).run(`${id}-s`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, tong, tong);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const ck = (soTien: number, them: Record<string, unknown> = {}) => ({ soTien, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", ...them });
const thu = (w: W, as: string, orderId: string, body: unknown) => w.call("POST", `/api/orders/${orderId}/payments`, { as, body });
const xacNhan = (w: W, receiptId: string, body: unknown = {}, as = KT) => w.call("POST", `/api/ledger/company-receipts/${receiptId}/confirm`, { as, body });
const cuoi = (w: W, orderId: string) => String(w.q("SELECT id FROM bil_payment_receipt WHERE order_id = ? AND reverses_id IS NULL ORDER BY rowid DESC LIMIT 1", orderId)[0].id);
const soDong = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);

test("đường 1: khoản HDV khai CK – Công ty thu ⇒ xác nhận thiếu mã 400; có mã (chuẩn hoá) 200; nhật ký không chép mã; tiền mặt không cần mã, gửi mã cho tiền mặt 400", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r = cuoi(w, id);
  let x = await xacNhan(w, r);
  assert.equal(x.status, 400, x.text);
  assert.equal(x.json.error.code, "bank_txn_required");
  x = await xacNhan(w, r, { maGiaoDich: "ft 2610.0812/345", soThucChuyen: 400_000 });
  assert.equal(x.status, 200, x.text);
  assert.equal(w.q("SELECT txn_code FROM bil_receipt_bank_txn WHERE receipt_id = ?", r)[0].txn_code, "FT26100812345");
  for (const d of w.q("SELECT detail FROM audit_log WHERE order_id = ?", id)) assert.doesNotMatch(String(d.detail ?? ""), /26100812345/);
  assert.equal((await thu(w, HDV, id, { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  const tm = cuoi(w, id);
  assert.equal((await xacNhan(w, tm, { maGiaoDich: "FT0001", soThucChuyen: 100_000 })).status, 400);
  assert.equal((await xacNhan(w, tm)).status, 200);
});

test("ba luật chặn: trùng cùng đơn 409; lệch số thực chuyển 409 kèm số đã ghi; vượt 409; đúng thì 200", async () => {
  const w = setup();
  const a = don(w);
  assert.equal((await thu(w, HDV, a, ck(400_000))).status, 201);
  const r1 = cuoi(w, a);
  assert.equal((await thu(w, HDV, a, ck(400_000))).status, 201);
  const r2 = cuoi(w, a);
  assert.equal((await xacNhan(w, r1, { maGiaoDich: "XG0001", soThucChuyen: 800_000 })).status, 200);
  let x = await xacNhan(w, r2, { maGiaoDich: "XG0001", soThucChuyen: 800_000 });
  assert.equal(x.status, 409);
  assert.equal(x.json.error.code, "bank_txn_duplicate");
  const b = don(w);
  assert.equal((await thu(w, HDV, b, ck(300_000))).status, 201);
  const r3 = cuoi(w, b);
  x = await xacNhan(w, r3, { maGiaoDich: "XG0001", soThucChuyen: 700_000 });
  assert.equal(x.status, 409);
  assert.deepEqual([x.json.error.code, x.json.error.soThucChuyen], ["bank_txn_amount_mismatch", 800_000]);
  assert.equal((await xacNhan(w, r3, { maGiaoDich: "XG0001", soThucChuyen: 800_000 })).status, 200);
  const c = don(w);
  assert.equal((await thu(w, HDV, c, ck(200_000))).status, 201);
  x = await xacNhan(w, cuoi(w, c), { maGiaoDich: "XG0001", soThucChuyen: 800_000 });
  assert.equal(x.json.error.code, "bank_txn_over");
});

test("đường 2: Kế toán tự ghi CK – Công ty thu thiếu mã 400 (cả khi chọn người thu = hồ sơ công ty); có mã 201, không dòng giữ hộ; Bán hàng gửi mã 400; ô mã nhận 12 chữ số, ghi chú 12 chữ số vẫn 400", async () => {
  const w = setup();
  const id = don(w);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  assert.equal((await thu(w, KT, id, ck(300_000))).json.error.code, "bank_txn_required");
  assert.equal((await thu(w, KT, id, ck(300_000, { nguoiThu: { partyId: ct } }))).json.error.code, "bank_txn_required");
  assert.equal((await thu(w, KT, id, ck(300_000, { maGiaoDich: "123456789012", soThucChuyen: 300_000 }))).status, 201);
  assert.equal(soDong(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ?", id), 0);
  assert.equal((await thu(w, KT, id, ck(1_000, { maGiaoDich: "FT0002", soThucChuyen: 1_000, ghiChu: "sao kê 123456789012" }))).status, 400);
  assert.equal((await thu(w, KT, id, { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await thu(w, SALES, id, ck(1_000, { maGiaoDich: "FT0003", soThucChuyen: 1_000 }))).status, 400);
  assert.equal((await thu(w, SALES, id, ck(1_000))).status, 201, "Bán hàng khai bình thường ⇒ giữ hộ, chưa cần mã");
});

test("đường 2 kèm Đã giao: Toàn quyền thiếu mã 400, có mã 200; Quản trị ⇒ giữ hộ, không đòi mã; Kế toán thuần ⇒ 403", async () => {
  const w = setup();
  const a = don(w);
  let g = await w.call("POST", `/api/orders/${a}/delivered`, { as: SA, body: { lanThu: ck(1_000_000) } });
  assert.equal(g.status, 400, g.text);
  g = await w.call("POST", `/api/orders/${a}/delivered`, { as: SA, body: { lanThu: ck(1_000_000, { maGiaoDich: "DG0001", soThucChuyen: 1_000_000 }) } });
  assert.equal(g.status, 200, g.text);
  const b = don(w);
  g = await w.call("POST", `/api/orders/${b}/delivered`, { as: ADM, body: { lanThu: ck(1_000_000) } });
  assert.equal(g.status, 200, g.text);
  assert.equal(soDong(w, "SELECT count(*) AS n FROM bil_debt_line WHERE order_id = ? AND kind_code = 'HELD' AND debtor_party_id = ?", b, `pty-${ADM}`), 1);
  assert.equal((await w.call("POST", `/api/orders/${don(w)}/delivered`, { as: KT, body: {} })).status, 403);
});

test("đường 3: Thay một lần thu có mã bằng lần thu mới CÙNG mã ⇒ 201; thiếu mã ⇒ 400; hai lần thu mới cùng mã cùng đơn ⇒ 409 trùng", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, ck(600_000, { maGiaoDich: "TH0001", soThucChuyen: 600_000 }))).status, 201);
  const r = cuoi(w, id);
  const thay = (moi: unknown[]) => w.call("POST", "/api/ledger/receipt-replacements", { as: KT, body: { orderId: id, cu: [r], moi, lyDo: "Ghi nhầm ngày, ghi lại cho đúng" } });
  assert.equal((await thay([ck(600_000)])).status, 400);
  assert.equal((await thay([ck(300_000, { maGiaoDich: "TH0001", soThucChuyen: 600_000 }), ck(300_000, { maGiaoDich: "TH0001", soThucChuyen: 600_000 })])).json.error.code, "bank_txn_duplicate");
  const ok = await thay([ck(600_000, { maGiaoDich: "TH0001", soThucChuyen: 600_000 })]);
  assert.equal(ok.status, 201, ok.text);
});

test("đảo lần thu có mã rồi ghi lại số thực chuyển khác ⇒ được (không còn lần thu nào khác giữ mã)", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, ck(500_000, { maGiaoDich: "DA0001", soThucChuyen: 500_000 }))).status, 201);
  const dao = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dao_lan_thu", receiptId: cuoi(w, id), lyDo: "nhập nhầm số thực chuyển" } });
  assert.equal(dao.status, 201, dao.text);
  assert.equal((await thu(w, KT, id, ck(600_000, { maGiaoDich: "DA0001", soThucChuyen: 600_000 }))).status, 201);
});

test("khai trùng bị chặn sau Đã giao: khoản thừa ở người khai; người khai nộp xong thì Hoàn thành được", async () => {
  const w = setup();
  const id = don(w, 800_000);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r1 = cuoi(w, id);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r2 = cuoi(w, id);
  assert.equal((await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} })).status, 200);
  assert.equal((await xacNhan(w, r1, { maGiaoDich: "KT0001", soThucChuyen: 400_000 })).status, 200);
  assert.equal((await xacNhan(w, r2, { maGiaoDich: "KT0001", soThucChuyen: 400_000 })).json.error.code, "bank_txn_duplicate");
  assert.equal((await w.call("POST", `/api/orders/${id}/completed`, { as: KT, body: {} })).status, 409, "còn HDV giữ 400.000");
  const nop = await w.call("POST", "/api/ledger/settlements", { as: KT, body: { chieu: "nop", partyId: `pty-${HDV}`, phanBo: [{ orderId: id, soTien: 400_000 }] } });
  assert.equal(nop.status, 201, nop.text);
  const xong = await w.call("POST", `/api/orders/${id}/completed`, { as: KT, body: {} });
  assert.equal(xong.status, 200, xong.text);
});

test("ai thấy mã: Kế toán có khoá maGiaoDich/soThucChuyen; Bán hàng KHÔNG có khoá", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, KT, id, ck(300_000, { maGiaoDich: "XM0001", soThucChuyen: 300_000 }))).status, 201);
  const kt = (await w.call("GET", `/api/orders/${id}/payments`, { as: KT })).json;
  assert.deepEqual([kt.lanThu[0].maGiaoDich, kt.lanThu[0].soThucChuyen], ["XM0001", 300_000]);
  const sales = await w.call("GET", `/api/orders/${id}/payments`, { as: SALES });
  for (const l of sales.json.lanThu) assert.ok(!("maGiaoDich" in l) && !("soThucChuyen" in l));
  assert.doesNotMatch(sales.text, /XM0001/);
});

test("Review Focus 3: hai Kế toán bấm 'Công ty đã nhận' cùng lúc ⇒ một 200, một 409 (không 500)", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const r = cuoi(w, id);
  // Hai Kế toán KHÁC nhau; mở phiên trước (hai lời gọi đầu cùng lúc của MỘT tài khoản đụng UNIQUE aut_session.staff_id của khung thử — không phải điều cần kiểm).
  for (const as of [KT, KT2]) assert.equal((await w.call("GET", "/api/auth/me", { as })).status, 200);
  const kq = await Promise.all([xacNhan(w, r, { maGiaoDich: "CL0001", soThucChuyen: 400_000 }, KT), xacNhan(w, r, { maGiaoDich: "CL0001", soThucChuyen: 400_000 }, KT2)]);
  assert.deepEqual(kq.map((x) => x.status).sort(), [200, 409], kq.map((x) => x.text).join(" | "));
});

test("Review Focus 5: khoản khai TRƯỚC mốc cắt ⇒ xác nhận không cần mã; nhập mã vẫn gắn", async () => {
  const w = setup();
  const id = don(w);
  assert.equal((await thu(w, HDV, id, ck(400_000))).status, 201);
  const cu = cuoi(w, id);
  assert.equal((await thu(w, HDV, id, ck(300_000))).status, 201);
  const cu2 = cuoi(w, id);
  // Giả lập "khoản khai trước ngày phát hành": dời mốc cắt ra sau (bảng mốc chỉ-thêm ⇒ gỡ trigger chặn sửa TRONG CSDL thử này).
  w.sqlite.exec("DROP TRIGGER bil_audit_cutoff_no_update");
  w.sqlite.prepare("UPDATE bil_audit_cutoff SET cutoff_at = '2999-01-01T00:00:00.000Z' WHERE code = 'R-BIL-D6'").run();
  assert.equal((await xacNhan(w, cu)).status, 200);
  assert.equal((await xacNhan(w, cu2, { maGiaoDich: "TR0001", soThucChuyen: 300_000 })).status, 200);
  assert.equal(soDong(w, "SELECT count(*) AS n FROM bil_receipt_bank_txn WHERE receipt_id = ?", cu2), 1);
});
```

Lưu ý khi chạy: nếu hằng thân "Hoàn thành" / "nộp" của route khác ghi trên, đối chiếu `src/modules/billing/index.ts` (route `completed` không đọc thân; route `settlements` nhận `{ chieu, partyId, phanBo }`).

- [ ] **Bước 11: Chạy, thấy xanh.** `node --test src/modules/billing/ma-giao-dich-route.test.ts src/modules/billing/thay-lan-thu.test.ts src/modules/billing/lo-ghi.test.ts` → PASS.

- [ ] **Bước 12: Quan sát chặn thật (P16) ở máy chủ.** Tạm đổi `canMaGiaoDich` trả `false` → chạy `ma-giao-dich-route.test.ts` → thấy các ca "thiếu mã 400" đỏ → hoàn nguyên → xanh. Ghi vào sổ thi công.

- [ ] **Bước 13: Kiểm toàn bộ rồi commit**

```bash
npm run typecheck && npm test && node --test tests/audit/*.test.mjs
git add src/modules/billing src/shared/contracts.ts src/shared/audit-actions.ts src/lan-gui-phu-route.test.ts tests/e2e docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md
git commit -m "Sổ tiền: đòi mã giao dịch ngân hàng ở ba đường ghi (ADR-0092 Đ6)

Công ty đã nhận, Kế toán hoặc Toàn quyền tự ghi (kể cả kèm Đã giao) và lần thu mới
trong Thay lần thu đều đòi mã khi là chuyển khoản vào tài khoản công ty. Máy chủ kiểm
trùng, lệch, vượt trước lô; lỗi lệch mang số đã ghi để giao diện điền sẵn. Chỉ người
có quyền ghi sổ thấy mã; nhật ký chỉ ghi chữ cố định, không chép mã. Sửa các bài cũ
cho luật mới.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Luật kiểm định kỳ R-BIL-D6a, R-BIL-D6b

**Files:**
- Modify: `scripts/audit-checks.mjs` (mảng `CHECKS`, sau khối `R-BIL-13w`)
- Test: `src/audit-ma-giao-dich.test.ts`

- [ ] **Bước 1: Bài đỏ**

`src/audit-ma-giao-dich.test.ts`:

```ts
// Kiểm định kỳ mã giao dịch (ADR-0092 Đ6; đặc tả QR §5): R-BIL-D6a mỗi mã — các dòng còn hiệu lực cùng số thực chuyển, không trùng đơn, tổng ≤ số đó; R-BIL-D6b —
// lưới thứ hai cho đường 2 (chỉ máy chủ): lần thu CK – Công ty thu ghi TỪ mốc đã là "công ty nhận" mà không có mã. Dữ liệu vi phạm dựng bằng cách GỠ trigger
// trong CSDL thử (giả lập "trigger bị gỡ nhầm / SQL gõ tay đi vòng").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

interface Check { code: string; sql: string; level: string; mode?: "rows" }
const { CHECKS } = (await import(new URL("../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: Check[] };
const one = (code: string): Check => {
  const f = CHECKS.filter((c) => c.code === code);
  assert.equal(f.length, 1, `phải có đúng một kiểm ${code}`);
  return f[0]!;
};
const dem = (db: DatabaseSync, code: string): number => {
  const c = one(code);
  const rows = db.prepare(c.sql.replace(/\s+/g, " ").trim()).all();
  return c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
};
const DIR = new URL("../migrations/", import.meta.url);
const SAU = "2099-01-01T00:00:00.000Z";
function moi(): { db: DatabaseSync; ct: string } {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  for (const t of ["bil_receipt_bank_txn_duplicate", "bil_receipt_bank_txn_amount_mismatch", "bil_receipt_bank_txn_over"]) db.exec(`DROP TRIGGER ${t}`);
  const ct = (db.prepare("SELECT party_id FROM v_pty_owner_company LIMIT 1").get() as { party_id: string }).party_id;
  return { db, ct };
}
let n = 0;
const lanThu = (db: DatabaseSync, ct: string, order: string, amount: number) => {
  const id = `r${++n}`;
  db.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'CUSTOMER_PAYMENT', ?, ?, 'COMPANY', 'BANK_TRANSFER', ?, 'PREPAID', '2026-10-08', NULL, NULL, ?, 'kt', ?, 'kt')`)
    .run(id, order, amount, ct, ct, SAU, SAU);
  return id;
};
const gan = (db: DatabaseSync, r: string, ma: string, so: number) =>
  db.prepare("INSERT INTO bil_receipt_bank_txn (id, receipt_id, txn_code, transferred_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(`t${++n}`, r, ma, so, SAU, SAU);

test("R-BIL-D6a: sạch = 0; lệch số / trùng đơn / vượt tổng ⇒ mỗi mã một vi phạm; mức LỖI", () => {
  assert.equal(one("R-BIL-D6a").level, "fail");
  const { db, ct } = moi();
  gan(db, lanThu(db, ct, "o1", 400), "SACH", 800);
  gan(db, lanThu(db, ct, "o2", 400), "SACH", 800);
  assert.equal(dem(db, "R-BIL-D6a"), 0);
  gan(db, lanThu(db, ct, "o1", 100), "LECH", 500);
  gan(db, lanThu(db, ct, "o2", 100), "LECH", 600);
  gan(db, lanThu(db, ct, "o1", 100), "TRUNG", 500);
  gan(db, lanThu(db, ct, "o1", 100), "TRUNG", 500);
  gan(db, lanThu(db, ct, "o1", 300), "VUOT", 500);
  gan(db, lanThu(db, ct, "o2", 300), "VUOT", 500);
  assert.equal(dem(db, "R-BIL-D6a"), 3);
});

test("R-BIL-D6b: Kế toán tự ghi CK – Công ty thu sau mốc không mã ⇒ vi phạm; có mã / còn giữ hộ / nửa chuyển cọc ⇒ không; mức LỖI", () => {
  assert.equal(one("R-BIL-D6b").level, "fail");
  const { db, ct } = moi();
  gan(db, lanThu(db, ct, "o1", 100), "COMA", 100);
  assert.equal(dem(db, "R-BIL-D6b"), 0);
  lanThu(db, ct, "o1", 200);
  assert.equal(dem(db, "R-BIL-D6b"), 1);
  const giuHo = lanThu(db, ct, "o2", 300);
  db.prepare("INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, created_at, updated_at) VALUES ('p1', 'RECEIPT', 'o2', '2026-10-08', ?, ?)").run(SAU, SAU);
  db.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, created_at, updated_at)
    VALUES ('l1', 'p1', 'hdv', ?, 300, 'HELD', 'o2', ?, ?, ?)`).run(ct, giuHo, SAU, SAU);
  assert.equal(dem(db, "R-BIL-D6b"), 1, "khoản còn giữ hộ chưa xác nhận không tính");
});

test("R-BIL-D6b ghim hai điều kiện then chốt: nửa thu chuyển cọc (transfer_of_id) KHÔNG tính; khoản giữ hộ ĐÃ 'Công ty đã nhận' mà không mã thì TÍNH", () => {
  const { db, ct } = moi();
  // Gỡ thêm trong CSDL thử: trigger cặp chuyển cọc (0079) để chèn nửa thu đơn lẻ; trigger (e) của 0088 để dựng "Công ty đã nhận" thiếu mã.
  for (const t of ["bil_payment_receipt_coc_transfer_pair", "bil_payment_receipt_coc_transfer_target", "bil_debt_line_company_received_txn"]) db.exec(`DROP TRIGGER ${t}`);
  const coc = lanThu(db, ct, "o3", 500);
  const nuaThu = `r${++n}`;
  db.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by, transfer_of_id) VALUES (?, 'o4', 'CUSTOMER_PAYMENT', 500, ?, 'COMPANY', 'BANK_TRANSFER', ?, 'PREPAID', '2026-10-08', NULL, NULL, ?, 'kt', ?, 'kt', ?)`)
    .run(nuaThu, ct, ct, SAU, SAU, coc);
  gan(db, coc, "COC1", 500); // lần thu gốc có mã — chỉ còn nửa thu chuyển cọc là "không mã"
  assert.equal(dem(db, "R-BIL-D6b"), 0, "nửa thu chuyển cọc không bị đòi mã");
  const giu = lanThu(db, ct, "o5", 300);
  db.prepare("INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, created_at, updated_at) VALUES ('p2', 'RECEIPT', 'o5', '2026-10-08', ?, ?)").run(SAU, SAU);
  db.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, created_at, updated_at)
    VALUES ('l2', 'p2', 'hdv', ?, 300, 'HELD', 'o5', ?, ?, ?)`).run(ct, giu, SAU, SAU);
  assert.equal(dem(db, "R-BIL-D6b"), 0, "còn giữ hộ, chưa xác nhận ⇒ chưa tính");
  db.prepare("INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, created_at, updated_at) VALUES ('p3', 'COMPANY_RECEIVED', 'o5', '2026-10-08', ?, ?)").run(SAU, SAU);
  db.prepare(`INSERT INTO bil_debt_line (id, posting_id, debtor_party_id, creditor_party_id, amount, kind_code, order_id, receipt_id, reverses_line_id, created_at, updated_at)
    VALUES ('l3', 'p3', ?, 'hdv', 300, 'HELD', 'o5', ?, 'l2', ?, ?)`).run(ct, giu, SAU, SAU);
  assert.equal(dem(db, "R-BIL-D6b"), 1, "đã 'Công ty đã nhận' mà không mã ⇒ vi phạm");
});
```

- [ ] **Bước 2: Chạy, thấy đỏ.** `node --test src/audit-ma-giao-dich.test.ts` → FAIL "phải có đúng một kiểm R-BIL-D6a".

- [ ] **Bước 3: Viết luật.** Trong `scripts/audit-checks.mjs`, sau khối `R-BIL-13w`, thêm:

```js
  {
    // ADR-0092 Đ6 + ADR-0108 đ4 (T2; migration 0088): mỗi mã giao dịch — các dòng nối CÒN HIỆU LỰC (vị từ hieuLuc) cùng MỘT số thực chuyển, không hai lần thu
    // cùng đơn, tổng lần thu ≤ số thực chuyển. Lưới thứ hai sau trigger 0088 (b)(c)(d).
    code: "R-BIL-D6a",
    what: "mỗi mã giao dịch ngân hàng: cùng số thực chuyển, không trùng đơn, tổng lần thu không vượt số thực chuyển",
    sql: `SELECT count(*) FROM (SELECT t.txn_code FROM bil_receipt_bank_txn t JOIN bil_payment_receipt r ON r.id = t.receipt_id
       WHERE r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
       GROUP BY t.txn_code
       HAVING count(DISTINCT t.transferred_amount) > 1 OR count(*) > count(DISTINCT r.order_id) OR SUM(r.amount) > MAX(t.transferred_amount))`,
    level: "fail",
  },
  {
    // C1 đường 2 (Kế toán / Toàn quyền tự ghi — CHỈ máy chủ đòi mã, không có phiếu để gắn trigger): lần thu CK – Công ty thu còn hiệu lực ghi TỪ mốc 'R-BIL-D6'
    // đã là "công ty nhận" (không có dòng giữ hộ, hoặc dòng giữ hộ đã được "Công ty đã nhận") mà KHÔNG có mã. Bỏ nửa thu của lệnh chuyển cọc (transfer_of_id).
    // Đã lần mọi câu chèn bil_payment_receipt (lập kế hoạch 2026-10-08): lần thu CUSTOMER_PAYMENT gốc chỉ sinh ở ghiLanThu, daGiao, Thay lần thu (đều đòi mã)
    // và nửa thu chuyển cọc (có transfer_of_id); chi hoàn cọc / hoàn khách là CUSTOMER_REFUND. Thêm đường ghi lần thu mới ⇒ xét lại luật này.
    code: "R-BIL-D6b",
    what: "lần thu chuyển khoản – Công ty thu ghi từ mốc 0088 đã được công ty nhận đều có mã giao dịch ngân hàng",
    sql: `SELECT count(*) FROM bil_payment_receipt r
     WHERE r.kind_code = 'CUSTOMER_PAYMENT' AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
       AND r.transfer_of_id IS NULL AND r.collector_role_code = 'COMPANY' AND r.method_code = 'BANK_TRANSFER'
       AND r.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6')
       AND NOT EXISTS (SELECT 1 FROM bil_receipt_bank_txn t WHERE t.receipt_id = r.id)
       AND (NOT EXISTS (SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = r.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL)
         OR EXISTS (SELECT 1 FROM bil_debt_line d JOIN bil_posting p ON p.id = d.posting_id WHERE d.receipt_id = r.id AND p.kind_code = 'COMPANY_RECEIVED'))`,
    level: "fail",
  },
```

- [ ] **Bước 4: Chạy, thấy xanh.** `node --test src/audit-ma-giao-dich.test.ts src/audit-invariants.test.ts src/audit-coc-don-huy.test.ts` → PASS.

- [ ] **Bước 5: Quan sát chặn thật (P16).** Ba đột biến, mỗi cái chạy bài, thấy đỏ, rồi hoàn nguyên:
  - D6a: tạm đổi `SUM(r.amount) > MAX(...)` thành `SUM(r.amount) > MAX(...) * 2` thì bài D6a phải đỏ.
  - D6b: tạm bỏ `AND r.transfer_of_id IS NULL` thì bài "ghim hai điều kiện" phải đỏ.
  - D6b: tạm bỏ nhánh `OR EXISTS (… COMPANY_RECEIVED)` thì bài "ghim hai điều kiện" phải đỏ.
  Ghi ba dòng vào bảng "Quan sát chặn thật" của sổ thi công. Người kiểm độc lập kế hoạch đã thấy hai đột biến D6b sống sót qua bài cũ, nên bài mới ở Bước 1 là bắt buộc.

- [ ] **Bước 6: Kiểm toàn bộ rồi commit**

```bash
npm run typecheck && npm test
git add scripts/audit-checks.mjs src/audit-ma-giao-dich.test.ts docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md
git commit -m "Kiểm định kỳ mã giao dịch: R-BIL-D6a và R-BIL-D6b

D6a là lưới thứ hai sau trigger (cùng số thực chuyển, không trùng đơn, không vượt).
D6b là lưới duy nhất ở tầng dữ liệu cho đường Kế toán tự ghi, vốn chỉ có lớp máy chủ.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Bộ vẽ QR (mã bên thứ ba) + vẽ canvas + lưu ảnh

**Files:**
- Create: `web/vendor/qrcode.js` (chép nguyên), `web/vendor/qrcode.d.ts`
- Create: `web/qr-ve.ts`, `web/luu-anh.ts`
- Test: `src/vendor-qr.test.ts`

**Interfaces:**
- Consumes: `QrThanhToanDto` (Task 5), `dongThongTinQr` (Task 5).
- Produces: `veMaQr(canvas: HTMLCanvasElement, payload: string, canhPx?: number): void`; `dungAnhQr(dto: Api.QrThanhToanDto): Promise<Blob>`; `luuHoacChiaSe(blob: Blob, tenTep: string, tieuDe: string, noiChua: HTMLElement): Promise<"chia-se" | "tai" | "huy">`.

- [ ] **Bước 1: XIN PHÉP CHỦ TRƯỚC KHI TẢI.** Chạy (chỉ đọc):

```bash
npm view qrcode-generator version dist.tarball dist.integrity dist.unpackedSize license
```

Hỏi chủ trong chat, nêu: tên gói `qrcode-generator`, phiên bản, nguồn (đường dẫn tarball ở registry npm), dung lượng, giấy phép MIT, và việc sẽ chép **một tệp** vào `web/vendor/qrcode.js`. Chỉ làm tiếp khi chủ trả lời đồng ý rõ ràng. Chủ chưa trả lời thì làm Task 10, 11 phần không cần tệp này (máy chủ, CSS, mục tài khoản) và quay lại sau.

- [ ] **Bước 2: Tải vào thư mục nháp, kiểm mã toàn vẹn, đọc hết tệp.**

```bash
cd "$TMPDIR" && npm pack qrcode-generator@2.0.4 && tar -xzf qrcode-generator-2.0.4.tgz && openssl dgst -sha512 -binary qrcode-generator-2.0.4.tgz | openssl base64 -A
```

So chuỗi cuối với `dist.integrity` (phần sau `sha512-`). Khớp mới dùng. Lúc lập kế hoạch (2026-10-08) bản mới nhất là **2.0.4**: `exports.import` = `./dist/qrcode.mjs` (bản mô-đun ES), `exports.types` = `./dist/qrcode.d.ts`, integrity `sha512-mZSiP6RnbHl4xL2Ap5HfkjLnmxfKcPWpWe/c+5XxCuetEenqmNFf1FH/ftXPCtFG5/TDobjsjz6sSNL0Sr8Z9g==`, cả gói giải nén 555.539 byte. Bản khác 2.0.4 thì dừng, báo chủ (chủ duyệt đúng một phiên bản). Mở `package/dist/qrcode.mjs` (tệp mà `exports.import` của `package/package.json` chỉ tới). **Đọc hết tệp**: không gọi mạng, không chạy chuỗi thành mã, không ghi HTML thô. Thấy `innerHTML`, `eval`, `new Function`, `fetch`, `XMLHttpRequest` thì DỪNG và báo chủ; không sửa tệp (C3 là chép nguyên). Ghi dung lượng chính xác của tệp này vào sổ thi công.

- [ ] **Bước 3: Chép tệp và thêm đầu tệp.** Chép `package/dist/qrcode.mjs` sang `web/vendor/qrcode.js` **nguyên văn** (đổi đuôi tên để TypeScript nhận khai kiểu `qrcode.d.ts` cùng tên; nội dung không đổi), chỉ thêm khối chú thích lên đầu (không đụng thân tệp, giữ nguyên dòng giấy phép gốc). Nếu bản `dist` đã bị lược mất dòng bản quyền và giấy phép thì chép nguyên văn thông báo MIT từ `package/LICENSE` vào khối chú thích đầu tệp, vì giấy phép MIT đòi giữ thông báo này. Đối chiếu `package/dist/qrcode.d.ts` với khai kiểu tối thiểu ở Bước 4 (tên hàm, kiểu tham số, kiểu xuất mặc định). Lệch thì sửa khai kiểu của mình cho khớp, không sửa tệp chép.

```js
// CHÉP NGUYÊN từ gói npm qrcode-generator@<phiên bản> (Kazuhiko Arase, giấy phép MIT — dòng giấy phép gốc ở dưới). ADR-0108 đ3, câu C3 (chủ dự án 2026-10-08).
// Nguồn: <dist.tarball>; integrity: <dist.integrity>; ngày chép: <ngày>. KHÔNG sửa thân tệp; KHÔNG thêm vào package.json (dự án không có dependency runtime).
// Chỉ web/qr-ve.ts được import tệp này (bài src/vendor-qr.test.ts). Nâng phiên bản = chép lại nguyên tệp + cập nhật ba dòng này + đọc hết lại.
```

- [ ] **Bước 4: Khai kiểu tối thiểu**

`web/vendor/qrcode.d.ts`:

```ts
// Khai kiểu TỐI THIỂU cho web/vendor/qrcode.js (qrcode-generator, MIT — ADR-0108 đ3). Chỉ phần Nền tảng dùng (web/qr-ve.ts).
export interface QrCode {
  addData(data: string, mode?: "Byte"): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
}
declare function qrcode(typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H"): QrCode;
export default qrcode;
```

- [ ] **Bước 5: Bài quét tệp bên thứ ba**

`src/vendor-qr.test.ts`:

```ts
// web/vendor/qrcode.js là mã bên thứ ba ĐẦU TIÊN chạy trên máy người dùng (ADR-0108 đ3, câu C3): chép NGUYÊN, không gọi mạng, không chạy chuỗi thành mã, không
// ghi HTML thô; không vào package.json; chỉ web/qr-ve.ts import nó. Chưa bài nào khác quét tệp .js trong web/ cho các chữ này.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const src = readFileSync(new URL("../web/vendor/qrcode.js", import.meta.url), "utf8");
const CAM: RegExp[] = [/\binnerHTML\b/, /\bouterHTML\b/, /\binsertAdjacentHTML\b/, /\beval\s*\(/, /\bnew\s+Function\b/, /\bfetch\s*\(/, /\bXMLHttpRequest\b/,
  /\bimportScripts\b/, /\bdocument\.write\b/, /\bWebSocket\b/, /\bsendBeacon\b/, /\bimport\s*\(/];

test("tệp bộ vẽ QR không chứa chữ cấm", () => {
  for (const re of CAM) assert.doesNotMatch(src, re, `web/vendor/qrcode.js chứa ${re}`);
});

test("giữ đầu tệp nguồn gốc + dòng giấy phép MIT gốc", () => {
  assert.match(src, /CHÉP NGUYÊN từ gói npm qrcode-generator@/);
  assert.match(src, /integrity: sha512-/);
  assert.match(src, /MIT/);
  assert.match(src, /Kazuhiko Arase/);
});

test("không thêm vào package.json; chỉ web/qr-ve.ts import bộ vẽ", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as Record<string, Record<string, string> | undefined>;
  for (const k of ["dependencies", "devDependencies", "optionalDependencies"]) assert.ok(!pkg[k]?.["qrcode-generator"], k);
  const dung = readdirSync(new URL("../web/", import.meta.url)).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
    .filter((f) => /vendor\/qrcode/.test(readFileSync(new URL(`../web/${f}`, import.meta.url), "utf8")));
  assert.deepEqual(dung, ["qr-ve.ts"]);
});
```

- [ ] **Bước 6: Chạy bài quét; quan sát chặn thật.** `node --test src/vendor-qr.test.ts` → hai bài đầu PASS, bài ba FAIL (chưa có `qr-ve.ts`). Tạm thêm `x.innerHTML=1;` vào cuối `web/vendor/qrcode.js` → bài một đỏ → hoàn nguyên. Ghi vào sổ thi công (P16: bài này không thể đỏ-trước trên tệp thật).

- [ ] **Bước 7: Vẽ và dựng ảnh**

`web/qr-ve.ts`:

```ts
// Vẽ mã QR thanh toán (ADR-0108 đ3; đặc tả QR §4.2, §7): trình duyệt CHỈ vẽ ma trận từ chuỗi máy chủ trả — không tự dựng payload, không gọi mạng. Mức sửa lỗi M,
// phiên bản tự chọn. Mã luôn ĐEN trên TRẮNG (điều kiện quét được của ứng dụng ngân hàng — không theo tông giao diện, nên không lấy màu từ token CSS).
import type { Api } from "./api";
import { h } from "./dom";
import qrcode from "./vendor/qrcode.js";
import { dongThongTinQr } from "../src/shared/qr-thong-tin";

const DEN = "#000000";
const TRANG = "#ffffff";
/** Vùng lề trắng quanh mã: 4 ô (chuẩn QR). */
const LE_O = 4;

export function veMaQr(canvas: HTMLCanvasElement, payload: string, canhPx = 560): void {
  const qr = qrcode(0, "M");
  qr.addData(payload, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  const o = Math.max(1, Math.floor(canhPx / (n + 2 * LE_O)));
  const canh = o * (n + 2 * LE_O);
  canvas.width = canh;
  canvas.height = canh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = TRANG;
  ctx.fillRect(0, 0, canh, canh);
  ctx.fillStyle = DEN;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + LE_O) * o, (r + LE_O) * o, o, o);
}

/** Cắt một dòng chữ cho vừa bề ngang (theo từ). */
function catDong(ctx: CanvasRenderingContext2D, chu: string, rong: number): string[] {
  const out: string[] = [];
  let dong = "";
  for (const tu of chu.split(" ")) {
    const thu = dong ? `${dong} ${tu}` : tu;
    if (ctx.measureText(thu).width <= rong || !dong) dong = thu;
    else {
      out.push(dong);
      dong = tu;
    }
  }
  if (dong) out.push(dong);
  return out;
}

/** Ảnh PNG gửi khách: mã QR + ĐÚNG các dòng của `dongThongTinQr` (danh sách trắng — không thêm trường nào từ màn đơn). */
export async function dungAnhQr(dto: Api.QrThanhToanDto): Promise<Blob> {
  const RONG = 720;
  const LE = 40;
  const CO_CHU = 28;
  const DONG_CAO = 40;
  try {
    await document.fonts.ready;
  } catch {
    // phông chưa sẵn thì vẽ bằng phông dự phòng
  }
  const font = `500 ${CO_CHU}px ${getComputedStyle(document.body).fontFamily || "sans-serif"}`;
  const ma = h("canvas", null) as HTMLCanvasElement;
  veMaQr(ma, dto.payload, RONG - 2 * LE);
  const anh = h("canvas", null) as HTMLCanvasElement;
  const ctx = anh.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không vẽ được ảnh.");
  ctx.font = font;
  const cacDong = dongThongTinQr(dto).flatMap((d) => catDong(ctx, d, RONG - 2 * LE));
  anh.width = RONG;
  anh.height = LE + ma.height + 24 + cacDong.length * DONG_CAO + LE;
  ctx.fillStyle = TRANG;
  ctx.fillRect(0, 0, anh.width, anh.height);
  ctx.drawImage(ma, Math.round((RONG - ma.width) / 2), LE);
  ctx.fillStyle = DEN;
  ctx.font = font; // đổi kích thước canvas làm mất font đã đặt
  ctx.textBaseline = "top";
  cacDong.forEach((d, i) => ctx.fillText(d, LE, LE + ma.height + 24 + i * DONG_CAO));
  return new Promise((ok, loi) => anh.toBlob((b) => (b ? ok(b) : loi(new Error("Không mã hoá được ảnh PNG."))), "image/png"));
}
```

`web/luu-anh.ts`:

```ts
// Lưu / chia sẻ một ảnh PNG (QR thanh toán — đặc tả QR §4.2): máy hỗ trợ chia sẻ tệp (iPhone) thì mở bảng chia sẻ, không thì tải về bằng liên kết `blob:`.
// Gọi NGAY trong lần bấm (ảnh dựng sẵn trước đó): iOS chỉ cho mở bảng chia sẻ trong cử chỉ của người dùng. Không đụng confirmation-dialog.ts (tránh phải chạy lại
// kịch bản ảnh xác nhận).
import { h } from "./dom";

export async function luuHoacChiaSe(blob: Blob, tenTep: string, tieuDe: string, noiChua: HTMLElement): Promise<"chia-se" | "tai" | "huy"> {
  const tep = new File([blob], tenTep, { type: "image/png" });
  if (typeof navigator.canShare === "function" && typeof navigator.share === "function" && navigator.canShare({ files: [tep] })) {
    try {
      await navigator.share({ files: [tep], title: tieuDe });
      return "chia-se";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "huy";
      // chia sẻ hỏng (không phải người dùng huỷ) ⇒ tải về
    }
  }
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: tenTep, hidden: true }) as HTMLAnchorElement;
  noiChua.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "tai";
}
```

- [ ] **Bước 8: Kiểm kiểu và gói.** `npm run typecheck` → 0 lỗi (nếu `web/tsconfig.json` báo TS7016 cho `./vendor/qrcode.js`, kiểm `qrcode.d.ts` nằm cùng thư mục và cùng tên gốc). `node --test src/vendor-qr.test.ts` → cả ba bài PASS (bài ba chỉ đọc nội dung các tệp `web/*.ts`; `qr-ve.ts` đã import bộ vẽ). `qr-ve.ts` chưa có trang nào import cho tới Task 10, nên esbuild chưa gói nó: thử gói riêng bằng `npx esbuild web/qr-ve.ts --bundle --format=esm --outfile=$TMPDIR/qr-ve-thu.js`. Lỗi "No matching export default" thì đổi dòng import thành `import * as qrcodeMod from "./vendor/qrcode.js";` + `const qrcode = (qrcodeMod as unknown as { default: typeof import("./vendor/qrcode.js").default }).default;` và ghi ruling vào sổ thi công.

- [ ] **Bước 9: Kiểm toàn bộ rồi commit**

```bash
npm run typecheck && npm test
git add web/vendor web/qr-ve.ts web/luu-anh.ts src/vendor-qr.test.ts docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md
git commit -m "Chép bộ vẽ QR (qrcode-generator, MIT) và hàm vẽ, lưu ảnh

Chủ dự án đã chọn chép tệp miễn phí (câu C3) và đồng ý tải. Tệp chép nguyên, ghi
nguồn và mã toàn vẹn ở đầu tệp, có bài quét chữ cấm và chặn thêm vào package.json.
Mã luôn đen trên trắng để ứng dụng ngân hàng quét được.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Màn đơn: nút và bảng QR, ô mã của Kế toán

**Files:**
- Modify: `web/order.ts` (`tienCard`, `nutKeToanLanThu`, `khoiKeToan`, `nutGhiThu`; thêm `oMaGiaoDich`, `nutQr`, `moBangQr`)
- Modify: `web/order-form.ts` (khối ẩn ô "Thanh toán trước" — Bước 7b)
- Modify: `public/app.css` (token `--w-qr` ở nhóm "Riêng của Tour Đảo Booking"; ba lớp `.qr-*` cạnh `.pay-form`)
- Modify: `src/shared/so-do-trang.ts` (sinh lại bằng `npm run build:web`)

**Interfaces:**
- Consumes: route QR (Task 5), `veMaQr`, `dungAnhQr` (Task 9), `luuHoacChiaSe` (Task 9), `dongThongTinQr` (Task 5), `maGiaoDich/soThucChuyen` của DTO và lỗi 409 mang `soThucChuyen` (Task 7).

Không có bài `node --test` cho `web/` (dự án kiểm giao diện bằng kịch bản Chrome); bài đỏ → xanh của task này là kịch bản `qr-smoke.mjs` ở Task 12 và các kịch bản cũ ở Bước 8.

- [ ] **Bước 1: Import và biến dùng chung.** Ở đầu `web/order.ts`: đổi `import { regroupMoney } from "./money-input";` thành `import { regroupMoney, setMoneyValue } from "./money-input";`; thêm:

```ts
import { moBangTruot } from "./bang-truot";
import { luuHoacChiaSe } from "./luu-anh";
import { dungAnhQr, veMaQr } from "./qr-ve";
import { dongThongTinQr } from "../src/shared/qr-thong-tin";
```

Cạnh biến `tien` (dòng `let tien: Api.OrderPaymentsResponse | null`), thêm:

```ts
/** Mở form "Ghi lần thu" có điền sẵn số tiền (nút "Khách đã chuyển khoản" của bảng QR). null khi người xem không ghi thu được đơn này. */
let moGhiThu: ((soTien: number) => void) | null = null;
```

- [ ] **Bước 2: Ô mã giao dịch dùng chung.** Thêm trước `hangXacNhan`:

```ts
/**
 * Ô "Mã giao dịch ngân hàng" + "Số tiền thực chuyển" (ADR-0092 Đ6) — chỉ dựng cho Kế toán / Toàn quyền; máy chủ quyết khi nào bắt buộc (trống cả hai ⇒ gửi
 * không mã, máy chủ trả câu nếu cần). Lỗi 409 "số thực chuyển lệch" mang số đã ghi của mã (`error.soThucChuyen`) ⇒ điền sẵn để Kế toán đối chiếu sao kê rồi
 * bấm lại — không có route tra mã (trang ghép §0).
 */
function oMaGiaoDich(macDinh?: { ma?: string; soThucChuyen?: number }): {
  o: HTMLElement[];
  hien: (co: boolean) => void;
  doc: () => { maGiaoDich: string; soThucChuyen: number } | { loi: string } | null;
  tuLoi: (err: unknown) => void;
} {
  const ma = h("input", { type: "text", autocomplete: "off", maxlength: "60", placeholder: "Như in trên sao kê", value: macDinh?.ma ?? "" }) as HTMLInputElement;
  const so = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "Như in trên sao kê" }) as HTMLInputElement;
  if (macDinh?.soThucChuyen) setMoneyValue(so, macDinh.soThucChuyen);
  so.addEventListener("input", () => regroupMoney(so));
  const o = [h("label", { "data-o": "ma-giao-dich" }, "Mã giao dịch ngân hàng", ma), h("label", { "data-o": "so-thuc-chuyen" }, "Số tiền thực chuyển (₫)", so)];
  let dangHien = true;
  return {
    o,
    hien: (co) => {
      dangHien = co;
      for (const x of o) x.hidden = !co;
    },
    doc: () => {
      if (!dangHien) return null;
      const coMa = ma.value.trim() !== "";
      const soN = parseMoney(so.value);
      if (!coMa && soN <= 0) return null;
      if (!coMa || soN <= 0) return { loi: "Nhập đủ cả mã giao dịch ngân hàng và số tiền thực chuyển theo sao kê." };
      return { maGiaoDich: ma.value.trim(), soThucChuyen: soN };
    },
    tuLoi: (err) => {
      if (!(err instanceof ApiError) || err.code !== "bank_txn_amount_mismatch") return;
      const a = (err.details as { soThucChuyen?: unknown } | undefined)?.soThucChuyen;
      if (typeof a === "number") setMoneyValue(so, a);
    },
  };
}
const loiCuaMa = (d: ReturnType<ReturnType<typeof oMaGiaoDich>["doc"]>): string | null => (d && "loi" in d ? d.loi : null);
const thanCuaMa = (d: ReturnType<ReturnType<typeof oMaGiaoDich>["doc"]>): Record<string, unknown> => (d && !("loi" in d) ? d : {});
```

- [ ] **Bước 3: "Xác nhận đã nhận" có ô mã.** Trong `nutKeToanLanThu`, thay khối `if (t.keToan!.choXacNhan.includes(l.id)) { … }` bằng:

```ts
  if (t.keToan!.choXacNhan.includes(l.id)) {
    const laCK = l.hinhThuc === METHOD_LABEL.BANK_TRANSFER;
    const ma = laCK ? oMaGiaoDich() : null;
    nut.push(
      hangXacNhan({
        nhan: "Xác nhận đã nhận", action: "xac-nhan-ck", nutGhi: "Công ty đã nhận",
        cau: `Đã đối chiếu: công ty đã nhận ${vnd(l.soTien)} vào tài khoản?${laCK ? " Nhập mã giao dịch và số tiền thực chuyển đúng như sao kê." : ""}`,
        o: ma?.o,
        kiem: () => loiCuaMa(ma?.doc() ?? null),
        ghi: async () => {
          try {
            return await api(`/api/ledger/company-receipts/${encodeURIComponent(l.id)}/confirm`, { method: "POST", body: thanCuaMa(ma?.doc() ?? null) });
          } catch (err) {
            ma?.tuLoi(err);
            throw err;
          }
        },
        bao: `Đã xác nhận công ty nhận ${vnd(l.soTien)}.`,
      }),
    );
  }
```

- [ ] **Bước 4: "Thay lần thu" và "Ghi bù lần thu" có ô mã.** Trong khối "Thay lần thu" của `nutKeToanLanThu`, sau khai báo `lyDoThay`, thêm:

```ts
    // ADR-0092 Đ6: lần thu mới CK – Công ty thu cần mã — điền sẵn mã + số thực chuyển của lần thu cũ (thay một-đổi-một); máy chủ không tự chép.
    const maThay = oMaGiaoDich({ ma: l.maGiaoDich, soThucChuyen: l.soThucChuyen });
    const capNhatMaThay = () => maThay.hien(hinhThuc.value === "BANK_TRANSFER" && nguoiThu.value === "cong_ty");
    hinhThuc.addEventListener("change", capNhatMaThay);
    nguoiThu.addEventListener("change", capNhatMaThay);
    capNhatMaThay();
```

đổi `o:` thành `o: [h("label", null, "Số tiền đúng (₫)", so), h("label", null, "Hình thức", hinhThuc), h("label", null, "Người thu đúng", nguoiThu), ...maThay.o, h("label", null, "Lý do", lyDoThay)],`, đổi `kiem:` thành:

```ts
        kiem: () => (parseMoney(so.value) <= 0 ? "Nhập số tiền." : lyDoThay.value.trim().length < 10 ? "Lý do ít nhất 10 ký tự." : loiCuaMa(maThay.doc())),
```

và trong `ghi`, bọc lời gọi `api(...)` bằng `try { … } catch (err) { maThay.tuLoi(err); throw err; }`, thêm `...thanCuaMa(maThay.doc())` vào phần tử `moi[0]`.

Làm y hệt cho khối "Ghi bù lần thu" trong `khoiKeToan` (tên biến `maBu`, không có giá trị mặc định: `oMaGiaoDich()`; ô hiện khi `hinhThuc.value === "BANK_TRANSFER" && nguoiThu.value === "cong_ty"`).

- [ ] **Bước 5: "Ghi lần thu" mở được có điền sẵn, có ô mã cho Kế toán.** Thay toàn bộ hàm `nutGhiThu` bằng:

```ts
/** "Ghi lần thu" (ADR-0026 đ2): số tiền, hình thức (mặc định Chuyển khoản — chủ duyệt 30/9), người nhận (Công ty / tôi); Kế toán chọn được ngày phát sinh và nhập
 * mã giao dịch ngân hàng khi CK – Công ty thu (ADR-0092 Đ6). `moGhiThu(soTien)` mở form có điền sẵn (nút "Khách đã chuyển khoản" của bảng QR — đặc tả §4.2). */
function nutGhiThu(order: Order, t: Api.OrderPaymentsResponse): HTMLElement {
  const wrap = h("div", { class: "pay-inline" });
  const mo = h("button", { type: "button", class: "btn", "data-action": "ghi-lan-thu" }, "Ghi lần thu");
  const moForm = (soTienSan: number | null) => {
    const soTien = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "0" }) as HTMLInputElement;
    soTien.addEventListener("input", () => regroupMoney(soTien));
    if (soTienSan !== null) setMoneyValue(soTien, soTienSan);
    const hinhThuc = h("select", null, ...(["BANK_TRANSFER", "CASH", "OTHER"] as const).map((m) => h("option", { value: m }, METHOD_LABEL[m]))) as HTMLSelectElement;
    const nguoi = h("select", null, h("option", { value: "cong_ty" }, "Công ty (vào tài khoản công ty)"), h("option", { value: "toi" }, "Tôi thu")) as HTMLSelectElement;
    const ngay = t.laKeToan ? (h("input", { type: "date" }) as HTMLInputElement) : null;
    const ma = t.laKeToan ? oMaGiaoDich() : null;
    const capNhatMa = () => ma?.hien(hinhThuc.value === "BANK_TRANSFER" && nguoi.value === "cong_ty");
    hinhThuc.addEventListener("change", capNhatMa);
    nguoi.addEventListener("change", capNhatMa);
    capNhatMa();
    const ghi = h("button", { type: "submit", class: "btn btn-primary" }, "Ghi");
    const thoi = h("button", { type: "button", class: "btn" }, "Thôi");
    const form = h(
      "form",
      { class: "pay-form", "data-khoi": "form-lan-thu" },
      h(
        "div",
        { class: "grid two" },
        h("label", null, "Số tiền (₫)", soTien),
        h("label", null, "Hình thức", hinhThuc),
        h("label", null, "Người nhận tiền", nguoi),
        ngay ? h("label", null, "Ngày phát sinh", ngay) : null,
        ...(ma ? ma.o : []),
      ),
      h("div", { class: "handler-actions" }, ghi, thoi),
    ) as HTMLFormElement;
    thoi.addEventListener("click", () => replaceChildren(wrap, mo));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const so = parseMoney(soTien.value);
      if (so <= 0) return show(banner("danger", "Nhập số tiền đã thu."));
      const loiMa = loiCuaMa(ma?.doc() ?? null);
      if (loiMa) return show(banner("danger", loiMa));
      ghi.disabled = true;
      show(null);
      try {
        const than: Api.LanThuInput = {
          soTien: so,
          hinhThuc: hinhThuc.value as Api.LanThuInput["hinhThuc"],
          nguoiThu: nguoi.value === "toi" ? "toi" : "cong_ty",
          ...(ngay?.value ? { ngayPhatSinh: ngay.value } : {}),
          ...thanCuaMa(ma?.doc() ?? null),
        };
        await api(`/api/orders/${encodeURIComponent(order.id)}/payments`, { method: "POST", body: than });
        await load();
        if (bannerEl.hidden) show(banner("info", `Đã ghi lần thu ${vnd(so)}.`));
      } catch (err) {
        ma?.tuLoi(err);
        show(errorBanner(err));
        ghi.disabled = false;
      }
    });
    replaceChildren(wrap, form);
    soTien.focus();
  };
  mo.addEventListener("click", () => moForm(null));
  moGhiThu = (so) => {
    moForm(so);
    wrap.scrollIntoView({ block: "nearest" });
  };
  wrap.append(mo);
  return wrap;
}
```

- [ ] **Bước 6: Nút và bảng QR.** Thêm sau `nutGhiThu`:

```ts
/** "QR thanh toán" (ADR-0108 đ3; đặc tả §4.2): máy chủ dựng chuỗi VietQR + các dòng in dưới mã (danh sách trắng); trình duyệt chỉ vẽ ma trận lên canvas. */
function nutQr(order: Order, t: Api.OrderPaymentsResponse): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "qr-thanh-toan" }, "QR thanh toán");
  btn.addEventListener("click", () => moBangQr(order, t, btn));
  return btn;
}

function moBangQr(order: Order, t: Api.OrderPaymentsResponse, opener: HTMLElement): void {
  const soTien = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", id: "qr-so-tien" }) as HTMLInputElement;
  setMoneyValue(soTien, t.conLai);
  soTien.addEventListener("input", () => regroupMoney(soTien));
  const tao = h("button", { type: "button", class: "btn", "data-action": "qr-tao-lai" }, "Tạo lại mã");
  const canvas = h("canvas", { class: "qr-anh", role: "img", "aria-label": "Mã QR thanh toán", hidden: true }) as HTMLCanvasElement;
  const dong = h("div", { class: "qr-dong", "data-khoi": "qr-thong-tin" });
  const loiEl = h("p", { class: "alert danger", role: "alert", hidden: true });
  const luu = h("button", { type: "button", class: "btn btn-primary", "data-action": "qr-luu-anh", disabled: true }, "Lưu ảnh");
  const daChuyen = t.coTheGhiThu ? h("button", { type: "button", class: "btn", "data-action": "qr-da-chuyen", disabled: true }, "Khách đã chuyển khoản") : null;
  let anh: Blob | null = null;
  let hien: Api.QrThanhToanDto | null = null;
  let dangChiaSe = false;
  const bang = moBangTruot({
    title: "QR thanh toán",
    body: [h("label", null, "Số tiền (₫)", soTien), h("div", { class: "handler-actions" }, tao), loiEl, h("div", { class: "qr-khung" }, canvas), dong],
    foot: [luu, daChuyen],
    opener,
  });
  if (!bang) return;
  const nap = async () => {
    const so = parseMoney(soTien.value);
    loiEl.hidden = true;
    luu.disabled = true;
    if (daChuyen) daChuyen.disabled = true;
    anh = null;
    hien = null;
    canvas.hidden = true;
    replaceChildren(dong);
    try {
      const r = await api<Api.QrThanhToanResponse>(`/api/orders/${encodeURIComponent(order.id)}/qr-thanh-toan${so > 0 ? `?soTien=${so}` : ""}`);
      hien = r.qr;
      veMaQr(canvas, r.qr.payload);
      canvas.hidden = false;
      replaceChildren(dong, ...dongThongTinQr(r.qr).map((x) => h("p", null, x)));
      if (daChuyen) daChuyen.disabled = false;
      anh = await dungAnhQr(r.qr); // dựng SẴN: bảng chia sẻ của iOS phải mở ngay trong lần bấm "Lưu ảnh"
      luu.disabled = false;
    } catch (err) {
      loiEl.textContent = err instanceof ApiError ? err.message : "Không tạo được mã — thử lại.";
      loiEl.hidden = false;
    }
  };
  tao.addEventListener("click", () => void nap());
  luu.addEventListener("click", () => {
    if (!anh || !hien || dangChiaSe) return;
    dangChiaSe = true;
    void luuHoacChiaSe(anh, `QR-${hien.noiDung}.png`, `Thanh toán đơn ${hien.maDon}`, bang.body).finally(() => {
      dangChiaSe = false;
    });
  });
  daChuyen?.addEventListener("click", () => {
    const so = hien?.soTien;
    bang.close(false);
    if (so) moGhiThu?.(so);
  });
  void nap();
}
```

- [ ] **Bước 7: Nối vào thẻ "Thanh toán".** Trong `tienCard`:

(a) Dòng đầu thân hàm, sau `const t = tien;`, thêm `moGhiThu = null;`.

(b) Trong `h("li", null, …)` của danh sách lần thu, sau phần `(dòng đảo)/(đã đảo)`, thêm:

```ts
              l.maGiaoDich ? h("span", { class: "muted" }, ` · mã GD ${l.maGiaoDich} (thực chuyển ${vnd(l.soThucChuyen ?? 0)})`) : null,
```

(c) Đổi khối `nut` thành:

```ts
  const nut: HTMLElement[] = [];
  // ADR-0108 đ3 (đặc tả §4.2): QR khi đọc được tiền của đơn (route payments đã hỏi order.view + money.view), đơn chưa Đã giao, còn lại > 0. Máy chủ kiểm lại.
  if (t && !t.coc && !t.deliveredAt && t.conLai > 0 && order.status !== "cancelled") nut.push(nutQr(order, t));
  if (t?.coTheGhiThu) nut.push(nutGhiThu(order, t));
```

(giữ hai dòng `nutChot` như cũ).

- [ ] **Bước 7b: Form lập đơn: người có quyền ghi sổ ghi tiền trả trước ở trang đơn** (người kiểm độc lập kế hoạch, VỪA-4; ruling của điều phối). `web/order-form.ts` gửi tiền trả trước bằng `POST /api/orders/:id/payments` mà không có ô mã. Sau Task 7, người có `ledger.write` (thực tế chỉ Toàn quyền, vì Kế toán không có `order.create`) chọn Chuyển khoản + Công ty sẽ luôn bị 400 `bank_txn_required`: đơn vẫn lưu nhưng tiền trả trước rơi. Theo đúng khuôn form đang dùng khi **sửa** đơn, ẩn ba ô trả trước cho người này và chỉ lối sang trang đơn, nơi có ô mã. Ngay sau khối `if (editId) { for (const f of ["prepaid-amount-field", …]) … }`, thêm:

```ts
// ADR-0092 Đ6 (C1): người có quyền ghi sổ (Toàn quyền) ghi CK – Công ty thu phải kèm mã giao dịch ngân hàng — ô mã chỉ ở trang đơn ⇒ form không nhận tiền trả
// trước của người này (tránh lần gửi chắc chắn 400 làm rơi tiền trả trước); cùng khuôn với lúc sửa đơn.
if (!editId && can(staff, "ledger.write")) {
  for (const f of ["prepaid-amount-field", "prepaid-method-field", "prepaid-collector-field"]) byId(f).hidden = true;
  byId("prepaid-hint").textContent = "Tiền khách đã trả trước ghi ở trang đơn sau khi lưu (mục Thanh toán → Ghi lần thu, kèm mã giao dịch ngân hàng nếu chuyển khoản vào tài khoản công ty).";
}
```

Ô `prepaidAmount` bị ẩn thì `num("prepaidAmount")` vẫn đọc giá trị rỗng (0), nên không gửi lần thu. Kiểm lại điều này bằng cách đọc `num()` trước khi tin. Kịch bản Chrome của form lập đơn (ba `a2-smoke-*.mjs`, đã có trong Bước 10) phải chạy lại; nếu kịch bản nào đăng nhập bằng tài khoản Toàn quyền mà nhập tiền trả trước thì sửa tối thiểu cho kịch bản và ghi ruling vào sổ thi công.

- [ ] **Bước 8: CSS.** Trong `public/app.css`, ở nhóm token "Riêng của Tour Đảo Booking" của `:root`, thêm `--w-qr: 18rem;`. Sau dòng `.kt-khoi { … }`, thêm:

```css
.qr-khung { display: flex; justify-content: center; margin: var(--s3) 0; }
.qr-anh { width: min(100%, var(--w-qr)); height: auto; image-rendering: pixelated; }
.qr-dong p { margin: 0 0 var(--s1); }
```

Ô `#qr-so-tien` dùng kiểu ô gõ chung (16px) sẵn có của `.sheet-body input` — kiểm ở kịch bản Chrome bằng `getComputedStyle(...).fontSize`.

- [ ] **Bước 9: Dựng, kiểm, sinh lại sơ đồ trang.**

```bash
npm run build:web && npm run typecheck && npm test
```

`npm run build:web` sinh lại `src/shared/so-do-trang.ts` (nhãn "QR thanh toán", "Tạo lại mã", "Lưu ảnh", "Khách đã chuyển khoản" là chữ viết thẳng). Commit cả tệp đó, kẻo `npm test` đỏ.

- [ ] **Bước 10: Chạy lại kịch bản Chrome bắt buộc** (bảng ở `web/CLAUDE.md`; sửa `web/order.ts` và chạm khối tiền), từ gốc repo, mỗi lệnh một lần:

```bash
npm run build:web && AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs
```

Lặp cho `a2-smoke-*.mjs` còn lại cùng thư mục, `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs`, `docs/evidence/2026-09-29-so-tien-luot-1/kich-ban/so-tien-smoke.mjs`, `docs/evidence/2026-10-02-lop-ve/kich-ban/lop-ve-smoke.mjs`. Hai kịch bản cuối bấm `xac-nhan-ck` / `ghi-lan-thu` / `thay-lan-thu`: nếu đỏ vì luật C1 (Kế toán CK – Công ty thu thiếu mã), sửa **tối thiểu** cho kịch bản nhập mã vào ô `[data-o="ma-giao-dich"] input` và `[data-o="so-thuc-chuyen"] input` trước khi bấm ghi, và ghi ruling vào sổ thi công. Không sửa khẳng định khác của kịch bản cũ.

- [ ] **Bước 11: Commit**

```bash
git add web/order.ts web/order-form.ts public/app.css src/shared/so-do-trang.ts docs/evidence docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md
git commit -m "Màn đơn: nút QR thanh toán, lưu ảnh, lối tắt Khách đã chuyển khoản

Bảng QR lấy chuỗi và các dòng in từ máy chủ, chỉ vẽ ma trận lên canvas; ảnh dựng sẵn
để iPhone mở được bảng chia sẻ ngay khi bấm. Khách đã chuyển khoản mở form ghi lần
thu có điền sẵn số tiền. Kế toán có ô mã giao dịch và số thực chuyển ở xác nhận, ghi
thu, Thay lần thu và ghi bù; lỗi lệch số điền sẵn số đã ghi.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Danh bạ: mục "Tài khoản nhận tiền"

**Files:**
- Modify: `web/parties.ts` (`openDetail`: khai `taiKhoan` cạnh `giayTo`, chèn vào `replaceChildren(detailEl, …)` sau `giayTo`; thêm hàm `veTaiKhoanNhanTien`; sửa `XAC_NHAN_DOI_CONG_TY_CHU`)
- Modify: `src/shared/so-do-trang.ts` (sinh lại)

**Interfaces:**
- Consumes: `GET/PUT /api/parties/:id/tai-khoan-nhan-tien`, `TaiKhoanNhanTienResponse` (Task 4).

- [ ] **Bước 1: Câu nhắc khi đổi công ty chủ** (đặc tả §4.1). Đổi hằng thành:

```ts
const XAC_NHAN_DOI_CONG_TY_CHU =
  "Đặt hồ sơ này làm công ty chủ? Trang đăng nhập và biên nhận sẽ dùng thông tin của hồ sơ này từ hôm nay (tên, mã số thuế, địa chỉ, liên hệ ghi chú “Hotline”, email). Công ty chủ hiện tại sẽ thôi giữ công việc này. Sau khi đổi, kiểm lại mục “Tài khoản nhận tiền” của hồ sơ mới — chưa cài thì mã QR thanh toán báo lỗi.";
```

- [ ] **Bước 2: Khai mục.** Trong `openDetail`, ngay sau dòng `if (giayTo) void veGiayTo(giayTo, p);`, thêm:

```ts
  // Mục "Tài khoản nhận tiền" (ADR-0108 đ2): chỉ hồ sơ ĐANG là công ty chủ, chỉ người giữ ô company.legal.write. Số tài khoản không viết thẳng ở mã (kho tri thức
  // Trợ lý chỉ gom chữ viết thẳng) — luôn đọc từ máy chủ.
  const laChu = p.roles.some((x) => x.roleTypeCode === OWNER_COMPANY_ROLE && x.validTo === null);
  const taiKhoan = can(me, "company.legal.write") && laChu ? h("section", { id: "tai-khoan-nhan-tien", "aria-labelledby": "tknt-title" }) : null;
  if (taiKhoan) void veTaiKhoanNhanTien(taiKhoan, p);
```

và trong `replaceChildren(detailEl, …)`, ngay sau phần tử `giayTo,`, thêm `taiKhoan,`.

- [ ] **Bước 3: Hàm vẽ mục.** Thêm sau `veGiayTo`:

```ts
/** Mục "Tài khoản nhận tiền" của hồ sơ công ty chủ (ADR-0108 đ2; đặc tả QR §4.1): xem tài khoản đang dùng, cài / đổi (máy chủ đóng dòng cũ + mở dòng mới). */
async function veTaiKhoanNhanTien(sec: HTMLElement, p: Api.PartyDto): Promise<void> {
  const url = `/api/parties/${encodeURIComponent(p.id)}/tai-khoan-nhan-tien`;
  const tieuDe = h("h3", { id: "tknt-title" }, "Tài khoản nhận tiền");
  let r: Api.TaiKhoanNhanTienResponse;
  try {
    r = await api<Api.TaiKhoanNhanTienResponse>(url);
  } catch (err) {
    replaceChildren(sec, tieuDe, h("p", { class: "alert danger", role: "alert" }, err instanceof ApiError ? err.message : "Không tải được tài khoản nhận tiền."));
    return;
  }
  const hienTai = r.hienTai
    ? h("p", { "data-khoi": "tknt-hien-tai" }, `${r.hienTai.nganHang} · ${r.hienTai.soTaiKhoan} · ${r.hienTai.chuTaiKhoan}`)
    : h("p", { class: "muted", "data-khoi": "tknt-hien-tai" }, "Chưa cài tài khoản — mã QR thanh toán chưa dùng được.");
  const nh = select(r.nganHang.map((b) => ({ value: b.ma, label: b.ten })), r.hienTai?.maNganHang);
  const so = input("", { inputmode: "numeric", autocomplete: "off", maxlength: "23", id: "tknt-so" }) as HTMLInputElement;
  const ten = input("", { autocomplete: "off", maxlength: "100", id: "tknt-ten", placeholder: "Như ngân hàng in, vd CONG TY TNHH TOUR DAO" }) as HTMLInputElement;
  const luu = button(r.hienTai ? "Đổi tài khoản" : "Lưu tài khoản", (b) => {
    if (!so.value.trim() || !ten.value.trim()) return showError(errorEl, "Nhập số tài khoản và tên chủ tài khoản.");
    if (r.hienTai && !confirm("Đổi tài khoản nhận tiền? Từ lúc này mã QR mới sẽ chỉ tiền về tài khoản mới; tài khoản cũ được lưu lại trong lịch sử.")) return;
    const body: Api.TaiKhoanNhanTienInput = { maNganHang: nh.value, soTaiKhoan: so.value.trim(), chuTaiKhoan: ten.value.trim(), truocDo: r.hienTai?.id ?? null };
    void act(async () => {
      await api(url, { method: "PUT", body });
      await veTaiKhoanNhanTien(sec, p);
    }, b, () => veTaiKhoanNhanTien(sec, p));
  }, "btn btn-primary");
  replaceChildren(
    sec,
    tieuDe,
    hienTai,
    h("div", { class: "grid three" }, field("Ngân hàng", nh), field("Số tài khoản", so), field("Tên chủ tài khoản", ten)),
    h("div", { class: "actions" }, luu),
  );
}
```

(Kiểm chữ ký `select(options, selected?)` và `act(fn, btn, onStale)` ở đầu `web/parties.ts` trước khi viết; hai hàm đó đã có sẵn.)

- [ ] **Bước 4: Dựng, kiểm, sinh lại sơ đồ trang**

```bash
npm run build:web && npm run typecheck && npm test
```

- [ ] **Bước 5: Chạy lại kịch bản Chrome bắt buộc** cho phần công ty chủ của `web/parties.ts`: `t2b-danh-ba-smoke.mjs`, `vai-smoke.mjs`, `dot-a-smoke.mjs` (tìm đường dẫn bằng `ls docs/evidence/*/kich-ban/ | grep -e t2b-danh-ba -e vai-smoke -e dot-a-smoke`), cùng cách chạy ở Task 10 Bước 10.

- [ ] **Bước 6: Commit**

```bash
git add web/parties.ts src/shared/so-do-trang.ts
git commit -m "Danh bạ: mục Tài khoản nhận tiền trong hồ sơ công ty chủ

Chỉ hiện cho người giữ ô sửa thông tin công ty chủ, trên hồ sơ đang là công ty chủ.
Đổi tài khoản có hộp hỏi lại; câu nhắc đổi công ty chủ thêm lời kiểm tài khoản mới.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Kịch bản e2e và kịch bản Chrome mới

**Files:**
- Create: `tests/e2e/qr-thanh-toan.mjs`
- Create: `docs/evidence/2026-10-08-qr/kich-ban/qr-smoke.mjs`, ảnh ở `docs/evidence/2026-10-08-qr/anh/`
- Modify: `tests/e2e/run.mjs` nếu danh sách kịch bản khai tay (kiểm bằng `grep -n "so-tien" tests/e2e/run.mjs`)

- [ ] **Bước 1: Kịch bản e2e** (API thật trên D1 local tạm; khuôn của `tests/e2e/so-tien.mjs`):

```js
// QR thanh toán + mã giao dịch (ADR-0108; đặc tả docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md §8) trên D1 local thật: Toàn quyền cài tài khoản →
// Bán hàng lập đơn → QR mặc định còn lại → HDV khai "Khách đã chuyển khoản" → Kế toán xác nhận thiếu mã 400, có mã 200 → khai trùng cùng mã 409 → tìm đơn bằng
// nội dung chuyển khoản.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const SA = await session(ACCOUNTS.superAdmin);
const A = await session(ACCOUNTS.salesA);
const ACC = await session(ACCOUNTS.accountant);
const F = await session(ACCOUNTS.field);
const me = async (c) => (await call(c, "GET", "/api/auth/me")).body.staff;
const fld = await me(F);

const ct = (await sqlRows("SELECT party_id FROM v_pty_owner_company LIMIT 1"))[0].party_id;
const cur = (await call(SA, "GET", `/api/parties/${ct}/tai-khoan-nhan-tien`)).body;
const cai = await call(SA, "PUT", `/api/parties/${ct}/tai-khoan-nhan-tien`, { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO", truocDo: cur.hienTai?.id ?? null });
assert.equal(cai.status, 200, JSON.stringify(cai.body));

const r = await call(A, "POST", "/api/orders", { ...orderInput({ services: [catalogService({ pax: { adult: 2 }, departDate: vnDate(3) })] }), handlerStaffId: fld.id });
assert.equal(r.status, 201, JSON.stringify(r.body));
const o = r.body.order;
const q = await call(A, "GET", `/api/orders/${o.id}/qr-thanh-toan`);
assert.equal(q.status, 200, JSON.stringify(q.body));
assert.equal(q.body.qr.noiDung, o.orderCode.replace(/[^A-Z0-9]/g, ""));
assert.match(q.body.qr.payload, /^000201010212.*6304[0-9A-F]{4}$/);
console.log("✓ QR mặc định bằng còn lại, nội dung = mã đơn bỏ gạch");

const thu = await call(F, "POST", `/api/orders/${o.id}/payments`, { soTien: q.body.qr.soTien, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" });
assert.equal(thu.status, 201, JSON.stringify(thu.body));
const rid = (await sqlRows(`SELECT id FROM bil_payment_receipt WHERE order_id = '${o.id}' AND reverses_id IS NULL ORDER BY rowid DESC LIMIT 1`))[0].id;
assert.equal((await call(ACC, "POST", `/api/ledger/company-receipts/${rid}/confirm`, {})).status, 400);
const ma = `E2E${Date.now()}`;
const ok = await call(ACC, "POST", `/api/ledger/company-receipts/${rid}/confirm`, { maGiaoDich: ma, soThucChuyen: q.body.qr.soTien });
assert.equal(ok.status, 200, JSON.stringify(ok.body));
console.log("✓ Kế toán xác nhận: thiếu mã 400, có mã 200");

const tim = await call(A, "GET", `/api/orders?limit=10&q=${o.orderCode.replace(/-/g, "").toLowerCase()}`);
assert.deepEqual(tim.body.orders.map((x) => x.id), [o.id]);
console.log("✓ tìm đơn bằng nội dung chuyển khoản");
const nk = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${o.id}'`);
assert.ok(nk.every((x) => !String(x.detail ?? "").includes(ma)), "nhật ký không chép mã");
void sql;
```

(Kiểm tên các hàm xuất của `tests/e2e/lib.mjs` trước khi chạy — `sql` có thể không cần; bỏ dòng `void sql;` và khỏi import nếu không dùng.) Thêm kịch bản vào danh sách của `run.mjs` nếu danh sách khai tay.

- [ ] **Bước 2: Chạy e2e toàn bộ** (cần mạng; tắt mọi `wrangler dev` mồ côi trước):

```bash
npm run test:e2e
```

Kỳ vọng: xanh, kể cả `so-tien`, `chong-ghi-trung`, `coc-don-huy` đã sửa ở Task 7, và bước cuối `audit-invariants` không lỗi mới (`R-BIL-D6a`, `R-BIL-D6b` = 0).

- [ ] **Bước 3: Kịch bản Chrome mới**

`docs/evidence/2026-10-08-qr/kich-ban/qr-smoke.mjs`:

```js
// Kịch bản Chrome — QR thanh toán (ADR-0108; đặc tả QR §8.1, §8.7, §8.10):
//   1. Bán hàng mở đơn (390) khi CHƯA cài tài khoản → bấm "QR thanh toán" → câu "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống", không mã.
//   2. Chủ (Toàn quyền, 1040) mở hồ sơ công ty chủ ở Danh bạ → mục "Tài khoản nhận tiền" → cài VCB → thấy dòng hiện tại.
//   3. Bán hàng (390) mở lại đơn → "QR thanh toán" → canvas hiện, sáu dòng thông tin, "1.000.000đ"-dạng, nội dung = mã đơn bỏ gạch; ô số tiền ≥ 16px;
//      không request nào ra ngoài base (bỏ qua data: và blob:); axe không serious/critical; không tràn ngang.
//   4. "Lưu ảnh" (Chrome headless: không canShare ⇒ tải) → có thẻ a[download] blob: trong bảng; không lỗi JS.
//   5. "Khách đã chuyển khoản" → bảng đóng, form "Ghi lần thu" mở với số tiền đã điền sẵn đúng số trên QR.
// Mỗi bước một phiên riêng qua env.as và đóng trang trước khi mở trang kế (các trang dùng CHUNG kho cookie, CLAUDE.md §10).
// Chạy từ GỐC repo sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-08-qr/kich-ban/qr-smoke.mjs
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-08-qr/anh");
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(process.env.AXE_JS, "utf8");

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const tao = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách QR", customerPhone: "0903 111 222", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, unitPrices: { adult: 1350000 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: vnDate(7) }],
  });
  assert.equal(tao.status, 201, JSON.stringify(tao.json));
  const order = tao.json.order;
  const moQr = async (p) => {
    await p.waitFor("document.querySelector('[data-action=\"qr-thanh-toan\"]') !== null", "nút QR");
    await p.ev("document.querySelector('[data-action=\"qr-thanh-toan\"]').click()");
    await p.waitFor("document.querySelector('.sheet[role=\"dialog\"]') !== null", "bảng QR mở");
  };

  // ---- 1. Chưa cài tài khoản
  let p = await env.as(ACCOUNTS.salesA, `/order?id=${order.id}`, MOB);
  await moQr(p);
  await p.waitFor("!document.querySelector('.sheet .alert.danger').hidden", "câu lỗi hiện");
  assert.equal(await p.ev("document.querySelector('.sheet .alert.danger').textContent.trim()"), "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống.");
  assert.equal(await p.ev("document.querySelector('.sheet canvas.qr-anh').hidden"), true, "không có mã");
  p.close();
  ok("1. chưa cài tài khoản ⇒ đúng câu, không mã");

  // ---- 2. Chủ cài tài khoản ở Danh bạ
  const ct = env.sql("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id;
  p = await env.as(ACCOUNTS.chu, `/parties?id=${ct}`, DESK);
  await p.waitFor("document.getElementById('tai-khoan-nhan-tien')?.querySelector('#tknt-so') != null", "mục tài khoản nhận tiền");
  await p.ev(setInput("document.getElementById('tknt-so')", "0011001234567"));
  await p.ev(setInput("document.getElementById('tknt-ten')", "Công ty TNHH Tour Đảo"));
  await p.ev("[...document.querySelectorAll('#tai-khoan-nhan-tien button')].find((b) => b.textContent.trim() === 'Lưu tài khoản').click()");
  await p.waitFor("document.querySelector('[data-khoi=\"tknt-hien-tai\"]')?.textContent.includes('CONG TY TNHH TOUR DAO')", "đã lưu");
  await p.shot(join(OUT, "tai-khoan-1040.png"));
  p.close();
  ok("2. Toàn quyền cài tài khoản nhận tiền");

  // ---- 3. Bán hàng mở QR
  p = await env.as(ACCOUNTS.salesA, `/order?id=${order.id}`, MOB);
  await moQr(p);
  await p.waitFor("!document.querySelector('.sheet canvas.qr-anh').hidden", "mã hiện");
  const dong = await p.ev("[...document.querySelectorAll('.sheet [data-khoi=\"qr-thong-tin\"] p')].map((x) => x.textContent)");
  assert.equal(dong.length, 6, JSON.stringify(dong));
  assert.ok(dong.includes(`Nội dung: ${order.orderCode.replace(/[^A-Z0-9]/g, "")}`), JSON.stringify(dong));
  assert.ok(dong.some((x) => /^Số tiền: [\d.]+đ$/.test(x)), JSON.stringify(dong));
  assert.ok((await p.ev("parseFloat(getComputedStyle(document.getElementById('qr-so-tien')).fontSize)")) >= 16, "ô số tiền ≥ 16px");
  assert.equal(await p.ev("document.documentElement.scrollWidth <= window.innerWidth"), true, "không tràn ngang");
  const ngoai = p.requests.filter((r) => !r.url.startsWith(env.base) && !r.url.startsWith("data:") && !r.url.startsWith("blob:"));
  assert.deepEqual(ngoai, [], "không request ra ngoài");
  await p.ev(`${AXE}\n;true`);
  const v = await p.ev("axe.run(document).then((r) => r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => x.id))");
  assert.deepEqual(v, [], `axe: ${JSON.stringify(v)}`);
  await p.shot(join(OUT, "qr-390.png"));
  ok("3. QR hiện, sáu dòng, ô 16px, không ra ngoài, axe sạch");

  // ---- 4. Lưu ảnh
  await p.waitFor("!document.querySelector('[data-action=\"qr-luu-anh\"]').disabled", "ảnh dựng xong");
  await p.ev("document.querySelector('[data-action=\"qr-luu-anh\"]').click()");
  await p.waitFor("performance.getEntriesByType('resource').length >= 0", "đợi");
  assert.deepEqual(p.consoleErrors, [], "không lỗi JS");
  ok("4. Lưu ảnh không lỗi");

  // ---- 5. Khách đã chuyển khoản
  const soQr = await p.ev("Number(document.getElementById('qr-so-tien').value.replace(/\\D/g, ''))");
  await p.ev("document.querySelector('[data-action=\"qr-da-chuyen\"]').click()");
  await p.waitFor("document.querySelector('.sheet[role=\"dialog\"]') === null && document.querySelector('[data-khoi=\"form-lan-thu\"]') !== null", "form ghi thu mở");
  const soForm = await p.ev("Number(document.querySelector('[data-khoi=\"form-lan-thu\"] input').value.replace(/\\D/g, ''))");
  assert.equal(soForm, soQr, "điền sẵn đúng số trên QR");
  p.close();
  ok("5. Khách đã chuyển khoản ⇒ form ghi thu điền sẵn");
} finally {
  await env.stop();
}
```

(Tên các thuộc tính trả về của `env.as(...)` — `ev`, `waitFor`, `shot`, `requests`, `consoleErrors`, `close` — và tài khoản `ACCOUNTS.chu` lấy từ `a2-cdp.mjs`. Bước 4 trên Chrome headless thường không có `navigator.canShare` với tệp, nên đi nhánh tải; kịch bản chỉ khẳng định không lỗi JS.)

- [ ] **Bước 4: Chạy kịch bản mới**, xem ảnh ở `docs/evidence/2026-10-08-qr/anh/`, ghi kết quả vào sổ thi công.

- [ ] **Bước 5: Commit**

```bash
git add tests/e2e docs/evidence/2026-10-08-qr docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md
git commit -m "Kịch bản e2e và Chrome cho QR thanh toán

e2e chạy luồng thật trên D1 tạm: cài tài khoản, QR, khai chuyển khoản, xác nhận có mã,
tìm đơn bằng nội dung. Kịch bản Chrome kiểm câu chưa cài tài khoản, mục cài tài khoản,
mã hiện đủ sáu dòng, không gọi tên miền ngoài và lối tắt điền sẵn form ghi thu.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Tài liệu, sổ hàng rào, người kiểm độc lập, chủ quét thử

**Files:**
- Modify: `docs/SYSTEM-DESIGN.md` (mục dữ liệu §5, API §7, quyền §8 — ghi nghĩa mở rộng của `company.legal.write`), `docs/CHANGE-GUIDE.md` (thêm một công thức "QR / mã giao dịch" + một bẫy), `docs/SO-HANG-RAO.md`, `docs/quyen-hoan.json`, `docs/BACKLOG.md`, sổ thi công

- [ ] **Bước 1: Tài liệu mô tả.** Đọc đúng mục (`grep -n "^#" docs/SYSTEM-DESIGN.md`), thêm:
  - §5: ba bảng `pty_bank`, `pty_bank_account`, `bil_receipt_bank_txn` (một dòng mỗi bảng, trỏ `DATA-DICTIONARY.md`).
  - §7: ba route mới (cổng, ô quyền, mã lỗi chính).
  - §8: ô `company.legal.write` nay gồm cả tài khoản nhận tiền (ADR-0108 đ2).
  - `CHANGE-GUIDE.md`: công thức "thêm ngân hàng = migration mới thêm dòng `pty_bank`"; bẫy "Kế toán ghi CK – Công ty thu phải kèm `maGiaoDich` + `soThucChuyen` từ mốc `R-BIL-D6`; bài/e2e mới ghi kiểu đó phải gửi cặp này".

- [ ] **Bước 2: Sổ hàng rào.** Thêm vào `docs/SO-HANG-RAO.md` các dòng, cột "Đã thấy chặn thật" lấy từ bảng "Quan sát chặn thật" của sổ thi công (ngày + đột biến + thông báo đỏ):
  - **Đ6 mã giao dịch** (migration `0088` trigger (a)–(f) + máy chủ `kiemCacMa`, `canMaGiaoDich`; bài `src/migrations-ma-giao-dich.test.ts`, `src/modules/billing/ma-giao-dich-route.test.ts`). Ghi chú: **đường 2 (Kế toán tự ghi) "bắt buộc mã" chỉ ở máy chủ — lớp CSDL dựa vào kỷ luật; lưới thứ hai là R-BIL-D6b**.
  - **Tài khoản nhận tiền** (migration `0087` trigger + route `company.legal.write`; bài `src/migrations-tai-khoan-nhan-tien.test.ts`, `src/modules/parties/tai-khoan-nhan-tien-route.test.ts`).
  - **Tệp bên thứ ba** (`src/vendor-qr.test.ts`): chặn chữ cấm, chặn thêm vào `package.json`, chặn import ngoài `qr-ve.ts`. Ghi chú: canh QUÊN, không canh cố ý sửa tệp rồi sửa bài.
  - **R-BIL-D6a / R-BIL-D6b** (`scripts/audit-checks.mjs`; bài `src/audit-ma-giao-dich.test.ts`).

- [ ] **Bước 3: Ghi chú lỗ đang hở.** Trong `docs/quyen-hoan.json`, mục `TNV-G4`: sửa phần mô tả "CÒN CHỜ" để bỏ Đ6 (đã thi công ở nhánh này, migration 0088), giữ Đ5d, Đ6a và phần cảnh báo khác đơn. Không đổi `han`, không đổi mục khác. Chạy `node --test src/phat-hien-han.test.ts`.

- [ ] **Bước 4: Việc để sau.** Thêm vào `docs/BACKLOG.md` (khuôn mục sẵn có): (a) tin báo cho Kế toán khi đổi tài khoản nhận tiền — chờ loại tin của sổ tiền (đặc tả `2026-10-06-tin-bao-so-tien.md`); (b) đường sửa riêng cho mã / số thực chuyển khi HC-4.2 có luật hai người (hạn chế đã biết C4).

- [ ] **Bước 5: Kiểm toàn bộ một lần cuối**

```bash
npm run typecheck && npm test && node --test --test-concurrency=1 src/claude-guard-thoi-gian.test.ts && npm run test:e2e
```

Ghi kết quả (số bài, thời gian) vào sổ thi công. Bài đo giờ đỏ do máy tải cao thì chạy lại một lần và ghi cả hai lần.

- [ ] **Bước 6: Commit tài liệu**

```bash
git add docs
git commit -m "Tài liệu QR thanh toán: thiết kế hệ thống, công thức, sổ hàng rào, ghi chú G4

Ghi ba bảng và ba route mới, nghĩa mở rộng của ô sửa thông tin công ty chủ, các hàng
rào đã quan sát chặn thật. Đường Kế toán tự ghi được khai là chỉ có lớp máy chủ.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Bước 7: Người kiểm độc lập (bắt buộc — việc lớn).** Giao trợ lý loại `nguoi-kiem-doc-lap` (chỉ đọc), kèm: đặc tả, ADR-0108, trang ghép, kế hoạch này, sổ thi công, danh sách commit của nhánh. Yêu cầu: đọc mã thật, tự chạy lại `npm run typecheck`, `npm test`, các bài mới, đối chiếu từng mục §8 của đặc tả (trừ §8.6 là việc của chủ), đặc biệt: cổng và thứ tự quyền của route QR; nhật ký không chép số/mã; DTO danh sách trắng; bốn đường ghi và vị trí dòng nối trong lô; bài so trigger ↔ hàm; tệp bên thứ ba đúng bản đã kiểm toàn vẹn; bản đồ quyền KHÔNG đổi ô nào (trích `src/shared/permissions.test.ts` xanh làm bằng chứng — trang ghép §0). Chỉ báo "đạt" dựa trên báo cáo đó + test. Phát hiện CAO thì sửa (vòng mới của người thi công) rồi kiểm lại.

- [ ] **Bước 8: Chủ quét thử (§8.6 — AI không tự xác nhận).** Đưa chủ các bước: (1) chạy `node scripts/dev-iphone.mjs` để mở Nền tảng trên D1 tạm trong mạng nội bộ; (2) đăng nhập tài khoản Toàn quyền thử, cài **tài khoản thật của công ty** ở mục "Tài khoản nhận tiền"; (3) mở một đơn thử, bấm "QR thanh toán" với số tiền nhỏ (vd 1.000đ); (4) quét bằng **ít nhất hai ứng dụng ngân hàng khác nhau**, kiểm đúng ngân hàng, tên chủ tài khoản, số tiền, nội dung — **không cần bấm chuyển**. Ghi kết quả chủ báo vào sổ thi công.

- [ ] **Bước 9: Báo cáo cuối việc cho chủ** theo bốn mục của CLAUDE.md §4 (Đã làm — Đã kiểm, nói rõ người kiểm độc lập đã đạt chưa — Chưa làm/chưa kiểm — Cần bạn quyết), và nói rõ: cần triển khai (`npm run trien-khai` sau `npm run day-len`), có hai migration, điều kiện phát hành là migration 0078–0083 đã có trên production (kiểm bằng lệnh chỉ đọc lúc phát hành), mục nhật ký thay đổi (bước A.0) do phiên phát hành viết.

  Ghi thêm vào runbook phát hành và nói với chủ **khoảng hở giữa migration và deploy**: từ lúc áp `0088` tới lúc `wrangler deploy` xong (vài phút, `npm run trien-khai` chạy liền nhau), mã cũ vẫn chạy. Trong khoảng đó (a) Kế toán bấm "Công ty đã nhận" hoặc "Thay lần thu" cho khoản chuyển khoản sẽ bị trigger chặn; mã cũ không dịch lỗi `bank_txn_required` nên Kế toán thấy lỗi chung, bấm lại sau khi bản mới lên là được. (b) Lần thu chuyển khoản – Công ty thu do Kế toán tự ghi bằng mã cũ sẽ không có mã, và `audit-invariants --db remote` ngay sau deploy báo `R-BIL-D6b`. Cách tránh: báo Kế toán không ghi tiền trong lúc phát hành. Nếu vẫn bị báo, Kế toán sửa bằng "Thay lần thu" có nhập mã. Bản mới khi đã lên thì luồng không còn hở.
