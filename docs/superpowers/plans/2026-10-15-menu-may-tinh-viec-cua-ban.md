# Menu máy tính theo việc + khối "Việc của bạn" (đợt 1) — Kế hoạch thi công

> **Cho người thi công:** dùng `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans`. Mỗi bước đánh dấu `- [ ]`.

**Mục tiêu:** menu trái máy tính gọn (≤ 10 mục hiện sẵn, nhóm "Thiết lập" thu gọn) và Trang chủ có khối "Việc của bạn" cho bốn vai văn phòng, chỉ dùng số đã có nguồn; sửa lỗi hướng dẫn viên thiếu mục "Đơn hàng".

**Kiến trúc:** menu vẫn do MỘT bảng `THANH_BEN` ở `src/shared/muc-giao-dien.ts` quyết (cùng bảng quyền với máy chủ); `web/shell.ts` chỉ vẽ. "Việc của bạn" là một hàm thuần mới `src/shared/viec-cua-ban.ts` (nhận người xem + các số đã tải, trả danh sách thẻ), `web/home.ts` chỉ tải số và vẽ thẻ. Không đổi bản đồ quyền, không đổi route, không migration.

**Công nghệ:** TypeScript thuần, `h()` (không `innerHTML`), CSS token ở `public/app.css`, `node --test`.

**Đặc tả:** `docs/superpowers/specs/2026-10-14-menu-may-tinh-viec-cua-ban/DAC-TA.md` (§7, §9). **Bản dựng tham chiếu:** `docs/design/menu-may-tinh-2026-10-15/Trang chu va Menu.dc.html` (dữ liệu mẫu).

## Ràng buộc chung (chép từ CLAUDE.md / đặc tả)
- Tiếng Việt CÓ DẤU cho mọi chữ trên giao diện; gọi hệ thống là "Nền tảng", không "App".
- Giao diện chỉ ẩn/hiện theo `can(...)`/bảng mục, **không** `hasPermission` để hỏi "được làm gì" (`src/giao-dien-hoi-bang-quyen.test.ts` ép).
- Không `innerHTML`; CSS sau dấu mốc `/* ---------- app iPhone (PWA)` chỉ dùng token (không hex, `rgb()`, `px` ngoài `1px`, `rem`, `em`); thiếu giá trị thì thêm token vào nhóm "Riêng của Tour Đảo Booking" ở `:root`.
- Ô gõ 16px; chữ menu ≥ 14px; vùng bấm ≥ 36px; tương phản AA; `aria-expanded` cho nhóm thu gọn.
- **Không vẽ số giả**: thẻ nào chưa có nguồn thật thì không có trong đợt 1. Điện thoại KHÔNG đổi (CSS ẩn thanh bên ở < 900px; thanh tab/`THANH_TAB`/`TRANG_TOI` giữ nguyên).
- Không đổi `playbook/`, ADR đã duyệt, `CLAUDE.md`. Không `git push`, không deploy (chủ tự chạy `npm run day-len` / `npm run trien-khai`).
- Việc đụng quyền ẩn/hiện = "việc lớn": sau thi công phải có subagent `nguoi-kiem-doc-lap` (Task 7).

## Điểm cần xem lại (Review Focus)
1. Tổ hợp quyền lạ (1024 tập) không được thấy thêm trang nào mà trước đó không thấy, và không mất lối vào trang nào đã thấy (Task 2 có bài).
2. Mục gộp "Giá & chi phí" chỉ an toàn nếu hai trang có CÙNG điều kiện hiện (Task 2 bước 1 kiểm bằng số, nếu lệch thì không gộp).
3. Số nguồn lỗi (mạng) không được làm sập cả khối: thẻ hiện "—" + "Thử lại" (Task 5).
4. Bán hàng KHÔNG thấy thẻ của Kế toán và ngược lại (thẻ chọn theo `can()`, Task 4 có bài).
5. Hướng dẫn viên đáp xuống `/orders` và thấy đơn tự do + đơn của mình (Task 1 kiểm route thật).

## Cấu trúc tệp
| Tệp | Việc |
|---|---|
| `src/shared/start-page.ts`, `src/shared/muc-giao-dien.ts` | Task 1: sửa điều kiện mục Đơn hàng. Task 2: bảng mục mới |
| `src/muc-giao-dien-menu-moi.test.ts` (mới) | Task 2: bài giữ lối vào + trần 10 mục |
| `src/muc-giao-dien-hien-trang.json` | Task 2: chụp lại ảnh chụp "ai thấy mục nào" |
| `web/shell.ts`, `public/app.css` | Task 3: vẽ nhóm, nhóm Thiết lập thu gọn, chân menu, nút Tạo đơn nổi |
| `web/dai-trang-anh-em.ts` (mới) + 5 trang | Task 4: dải chuyển nhanh giữa trang anh em của mục gộp |
| `src/shared/viec-cua-ban.ts` + `.test.ts` (mới) | Task 5: luật chọn thẻ theo vai |
| `web/home.ts`, `public/index.html`, `public/app.css` | Task 6: tải nguồn số, vẽ khối |
| kịch bản smoke, `docs/*` | Task 7: sửa kịch bản đếm mục, ghi tài liệu, người kiểm độc lập |

---

### Task 1: Hướng dẫn viên luôn thấy mục "Đơn hàng" (sửa mã cho khớp ADR-0017)

**Files:** Modify `src/shared/muc-giao-dien.ts:62-68`; Test `src/shared/start-page.test.ts`.

**Interfaces:** Produces: `TRANG.donHang.hien` đúng với `canAccessOrders` (FIELD, PARTNER, INTERN, văn phòng). `coMucDonHang` (khung tạm) giữ nguyên — khung tạm thiếu cờ FIELD là tiền lệ "thiếu một nhịp" (ADR-0035 chỉ bốn cờ), ghi vào chú thích.

- [ ] **Bước 1: Viết bài đỏ** — thêm vào cuối `src/shared/start-page.test.ts`:

```ts
import { coHien } from "./muc-giao-dien.ts";

test("mục Đơn hàng hiện cho hướng dẫn viên (ADR-0017: FIELD thấy mục Đơn hàng)", () => {
  assert.equal(coHien({ trang: "donHang", nhan: "Đơn hàng" }, { staff: who("FIELD") }), true);
});

test("mục Đơn hàng vẫn không hiện cho tài xế (không qua cổng orders)", () => {
  assert.equal(coHien({ trang: "donHang", nhan: "Đơn hàng" }, { staff: who("DRIVER") }), false);
  assert.equal(coHien({ trang: "donHang", nhan: "Đơn hàng" }, { staff: who("DRIVER_PARTNER") }), false);
});
```
(Nếu `coHien` đã được import ở đầu tệp thì không import lại.)

- [ ] **Bước 2: Chạy, thấy đỏ** — `node --test src/shared/start-page.test.ts` → bài đầu FAIL (`false !== true`).

- [ ] **Bước 3: Sửa** — trong `src/shared/muc-giao-dien.ts` đổi `hien` của `donHang`:

```ts
  donHang: {
    duong: "/orders",
    cungSang: ["/order"],
    goi: "GET /api/orders",
    // ADR-0017: hướng dẫn viên (FIELD) cũng có mục này — `canAccessOrders` = cổng "orders" (văn phòng, Đối tác, Thực tập, FIELD). Khung tạm (`tam`) chỉ có bốn cờ (ADR-0035): FIELD thiếu mục một nhịp.
    hien: (s) => coMucDonHang({ seesAll: seesAllOrders(s), canCreate: can(s, "order.create") }) || canAccessOrders(s),
    tam: (k) => coMucDonHang(k),
  },
```
và thêm `canAccessOrders` vào dòng import từ `./permissions.ts` của tệp.

- [ ] **Bước 4: Chạy xanh** — `node --test src/shared/start-page.test.ts` PASS.
- [ ] **Bước 5: Kiểm route thật** — mở `src/modules/orders/index.ts` quanh `GET /api/orders` và `GET /api/orders/pool`: xác nhận FIELD nhận danh sách = đơn mình phụ trách và (qua `web/orders.ts`) trang Đơn hàng có cách thấy đơn tự do. Nếu trang `/orders` của FIELD **không** hiện đơn tự do: **dừng, báo chủ** (đó là thay đổi nghiệp vụ, không tự thêm). Ghi kết quả vào nhật ký thi công `docs/superpowers/plans/2026-10-15-menu-may-tinh-thi-cong-nhat-ky.md`.
- [ ] **Bước 6: Chạy bài rào mục** — `node --test src/muc-hien-mo-duoc-1.test.ts src/muc-hien-mo-duoc-2.test.ts src/muc-hien-mo-duoc-3.test.ts`. Bài `src/muc-giao-dien-hien-trang.test.ts` sẽ ĐỎ vì ảnh chụp cũ; **chưa chụp lại ở đây** (chụp một lần ở Task 2).
- [ ] **Bước 7: Commit** — `git add src/shared/muc-giao-dien.ts src/shared/start-page.test.ts` rồi `git commit -m "Hướng dẫn viên thấy mục Đơn hàng ở thanh bên, đúng ADR-0017" -m "Mã đang lệch ADR đã duyệt: hàm hiện mục chỉ xét xem-mọi-đơn hoặc lập-đơn."` (kèm dòng đồng tác giả).

---

### Task 2: Bảng mục mới (nhóm, mục gộp, Thiết lập) + bài giữ lối vào

**Files:** Modify `src/shared/muc-giao-dien.ts` (`NHOM_THANH_BEN`, `CHA_THANH_BEN`, `ChoThanhBen`, `THANH_BEN`, `thanhBen`, `nhanTheoDuong`); Create `src/muc-giao-dien-menu-moi.test.ts`; Regenerate `src/muc-giao-dien-hien-trang.json`.

**Interfaces — Produces:**
```ts
export const NHOM_THANH_BEN = ["HẰNG NGÀY", "VẬN CHUYỂN", "TIỀN", "THIẾT LẬP", "CHÂN MENU"] as const;
// ChoThanhBen thêm hai trường tuỳ chọn:
//   noiBat?: true            — nút san hô "Tạo đơn" (vẽ riêng, đứng đầu nhóm HẰNG NGÀY)
//   gom?: readonly KhoaTrang[] — mục gộp: sáng ở trang của BẤT KỲ khoá nào trong `gom` (và trang của chính nó)
// MucThanhBen.kieu "muc" thêm: noiBat: boolean; gom: readonly KhoaTrang[]
// MucThanhBen.kieu "cha" và CHA_THANH_BEN bị bỏ (nhóm VẬN CHUYỂN thay vai mục cha).
```
Tiêu đề hiển thị: nhóm `"HẰNG NGÀY"` và `"CHÂN MENU"` KHÔNG hiện tiêu đề (web/shell.ts quyết ở Task 3).

- [ ] **Bước 1: Kiểm số — có gộp "Giá & chi phí" được không.** Tạo tệp tạm `$CLAUDE_JOB_DIR/tmp/so-gia.mts`:
```ts
import { PERMISSION_CODES } from "/ABS/src/shared/permissions.ts";
import { coHien } from "/ABS/src/shared/muc-giao-dien.ts";
let lech = 0;
for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
  const permissions = PERMISSION_CODES.filter((_, i) => m & (1 << i));
  const s = { id: "x", permissions };
  const a = coHien({ trang: "bangGiaXe", nhan: "" }, { staff: s }), b = coHien({ trang: "bangKeXe", nhan: "" }, { staff: s });
  if (a !== b) lech++;
}
console.log("tập lệch:", lech);
```
(thay `/ABS` bằng đường tuyệt đối của worktree) chạy `node $CLAUDE_JOB_DIR/tmp/so-gia.mts`. **Nếu `tập lệch: 0`** → gộp `bangGiaXe`+`bangKeXe` thành "Giá & chi phí". **Nếu > 0** → giữ HAI mục riêng "Bảng giá thuê xe" và "Bảng kê chi phí xe" trong VẬN CHUYỂN (nhóm có 6 mục; kiểm lại trần ở bước 4) và bỏ dòng "Giá & chi phí" khỏi bước 3. Ghi kết quả vào nhật ký thi công.

- [ ] **Bước 2: Viết bài đỏ** — tạo `src/muc-giao-dien-menu-moi.test.ts`:
```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { PERMISSION_CODES, type PermissionCode } from "./shared/permissions.ts";
import { THANH_BEN, TRANG, coHien, thanhBen, type KhoaTrang } from "./shared/muc-giao-dien.ts";

// Mọi trang có mặt ở thanh bên TRƯỚC khi đổi (34 khoá, cây 14/10) — lối vào không được mất.
const TRANG_THANH_BEN_CU: readonly KhoaTrang[] = [
  "trangChu", "donHang", "taoDon", "danhBa", "dichVu", "taiKhoan", "phien", "diaDiem", "loaiGiayToNguoi", "dieuPhoi", "xeDangChay", "deNghi",
  "bangGiaXe", "bangKeXe", "xe", "lichXeBan", "sapHetHan", "loaiGiayToXe", "chinhSachDieuPhoi", "lyDoDieuPhoi", "khoaThang", "dieuChinhCongNo",
  "hoaHong", "nguoiBan", "nhatKy", "guiThongBao", "troLy", "giaoDien", "trangTaiXe", "cuoc", "ban", "toi", "gopY", "troGiup",
];
const holder = (permissions: readonly PermissionCode[]) => ({ id: "x", permissions });

/** Khoá trang còn tới được từ thanh bên mới: mục hiện + mọi khoá trong `gom` của mục hiện. */
function toiDuoc(permissions: readonly PermissionCode[]): Set<KhoaTrang> {
  const out = new Set<KhoaTrang>();
  for (const c of THANH_BEN) {
    if (!coHien(c, { staff: holder(permissions) })) continue;
    out.add(c.trang);
    for (const k of ("gom" in c ? c.gom : []) as readonly KhoaTrang[]) out.add(k);
  }
  return out;
}

test("MỌI tập quyền: trang thấy trước đây vẫn tới được, và không thấy thêm trang nào mới", () => {
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const p = PERMISSION_CODES.filter((_, i) => m & (1 << i));
    const truoc = new Set(TRANG_THANH_BEN_CU.filter((k) => TRANG[k].hien(holder(p))));
    const sau = toiDuoc(p);
    for (const k of truoc) assert.ok(sau.has(k), `${p.join("+")}: mất lối vào ${k}`);
    for (const k of sau) assert.ok(truoc.has(k), `${p.join("+")}: thấy thêm ${k}`);
  }
});

const SO_MUC_HIEN_SAN = (p: readonly PermissionCode[]): number =>
  thanhBen({ staff: holder(p) }, "/").filter((g) => g.nhom !== "THIẾT LẬP" && g.nhom !== "CHÂN MENU").flatMap((g) => g.muc).filter((m) => !m.noiBat).length;

test("trần 10 mục hiện sẵn (không tính nút Tạo đơn, Thiết lập, chân menu) cho các vai thật", () => {
  const vai: Record<string, PermissionCode[]> = {
    "Bán hàng": ["SALES"], "Kế toán": ["ACCOUNTING"], "Quản trị": ["ADMIN"], "Toàn quyền": ["ADMIN", "SUPER_ADMIN"], "Bán hàng+Kế toán": ["SALES", "ACCOUNTING"],
    "Tài xế": ["DRIVER"], "Tài xế đối tác": ["DRIVER_PARTNER"], "Hướng dẫn viên": ["FIELD"], "Đối tác": ["PARTNER"], "Thực tập": ["INTERN"], "Nhân sự": ["HR"],
  };
  for (const [ten, p] of Object.entries(vai)) assert.ok(SO_MUC_HIEN_SAN(p) <= 10, `${ten}: ${SO_MUC_HIEN_SAN(p)} mục`);
});

test("hướng dẫn viên: có Đơn hàng + chân menu, không có nhóm khác", () => {
  const g = thanhBen({ staff: holder(["FIELD"]) }, "/").filter((x) => x.muc.length);
  assert.deepEqual(g.map((x) => x.nhom), ["HẰNG NGÀY", "CHÂN MENU"]);
  assert.deepEqual(g[0].muc.map((m) => m.nhan), ["Đơn hàng"]);
});

test("Kế toán: Hoa hồng đối tác và Người bán dịch vụ nằm trong Thiết lập (chủ duyệt 14/10)", () => {
  const tl = thanhBen({ staff: holder(["ACCOUNTING"]) }, "/").find((x) => x.nhom === "THIẾT LẬP");
  assert.deepEqual(tl?.muc.map((m) => m.nhan), ["Hoa hồng đối tác", "Người bán dịch vụ"]);
});

test("Quản trị chưa có Phiên đăng nhập, Nhật ký, Chính sách điều phối (chỉ Toàn quyền)", () => {
  const nhan = thanhBen({ staff: holder(["ADMIN"]) }, "/").flatMap((x) => x.muc).map((m) => m.nhan);
  for (const c of ["Phiên đăng nhập", "Nhật ký", "Chính sách điều phối"]) assert.ok(!nhan.includes(c), c);
});
```
Lưu ý: bài dùng `m.noiBat` và `{ staff }` (kiểu `NguoiXem`) của `thanhBen()` mới ở Bước 4.
- [ ] **Bước 3: Chạy, thấy đỏ** — `node --test src/muc-giao-dien-menu-moi.test.ts` (lỗi biên dịch/`nhom` chưa có).
- [ ] **Bước 4: Sửa bảng** — trong `src/shared/muc-giao-dien.ts`: thay `NHOM_THANH_BEN`, xoá `CHA_THANH_BEN`/`ChaThanhBen`/trường `cha` và nhánh `kieu: "cha"` của `thanhBen()`, thêm `noiBat`, `gom`; viết lại `THANH_BEN`:
```ts
export const THANH_BEN = [
  { nhom: "HẰNG NGÀY", trang: "taoDon", nhan: "Tạo đơn", bieuTuong: "plus", noiBat: true },
  { nhom: "HẰNG NGÀY", trang: "trangChu", nhan: "Trang chủ", bieuTuong: "home" },
  { nhom: "HẰNG NGÀY", trang: "trangTaiXe", nhan: "Trang chủ", bieuTuong: "home" },
  { nhom: "HẰNG NGÀY", trang: "donHang", nhan: "Đơn hàng", bieuTuong: "orders" },
  { nhom: "HẰNG NGÀY", trang: "danhBa", nhan: "Danh bạ", bieuTuong: "contact-card" },
  { nhom: "HẰNG NGÀY", trang: "cuoc", nhan: "Cuốc của tôi", bieuTuong: "assign" },
  { nhom: "HẰNG NGÀY", trang: "ban", nhan: "Báo bận của tôi", bieuTuong: "clock" },
  { nhom: "VẬN CHUYỂN", trang: "dieuPhoi", nhan: "Điều phối xe", bieuTuong: "truck" },
  { nhom: "VẬN CHUYỂN", trang: "xeDangChay", nhan: "Xe đang chạy", bieuTuong: "pin" },
  { nhom: "VẬN CHUYỂN", trang: "deNghi", nhan: "Đề nghị chuyển khách", bieuTuong: "swap" },
  { nhom: "VẬN CHUYỂN", trang: "xe", nhan: "Xe & giấy tờ", bieuTuong: "doc-check", gom: ["xe", "lichXeBan", "sapHetHan"] },
  { nhom: "VẬN CHUYỂN", trang: "bangGiaXe", nhan: "Giá & chi phí", bieuTuong: "money", gom: ["bangGiaXe", "bangKeXe"] }, // chỉ khi Bước 1 báo "tập lệch: 0"
  { nhom: "TIỀN", trang: "dieuChinhCongNo", nhan: "Điều chỉnh công nợ", bieuTuong: "money" },
  { nhom: "TIỀN", trang: "khoaThang", nhan: "Khoá sổ tháng", bieuTuong: "lock" },
  { nhom: "THIẾT LẬP", trang: "hoaHong", nhan: "Hoa hồng đối tác", bieuTuong: "money" },
  { nhom: "THIẾT LẬP", trang: "nguoiBan", nhan: "Người bán dịch vụ", bieuTuong: "assign" },
  { nhom: "THIẾT LẬP", trang: "dichVu", nhan: "Dịch vụ & giá", bieuTuong: "services" },
  { nhom: "THIẾT LẬP", trang: "diaDiem", nhan: "Địa điểm", bieuTuong: "pin" },
  { nhom: "THIẾT LẬP", trang: "loaiGiayToNguoi", nhan: "Loại giấy tờ cá nhân", bieuTuong: "doc-check" },
  { nhom: "THIẾT LẬP", trang: "loaiGiayToXe", nhan: "Loại giấy tờ xe", bieuTuong: "doc-check" },
  { nhom: "THIẾT LẬP", trang: "lyDoDieuPhoi", nhan: "Lý do điều phối", bieuTuong: "history" },
  { nhom: "THIẾT LẬP", trang: "chinhSachDieuPhoi", nhan: "Chính sách điều phối", bieuTuong: "settings" },
  { nhom: "THIẾT LẬP", trang: "taiKhoan", nhan: "Quản lý tài khoản", bieuTuong: "staff" },
  { nhom: "THIẾT LẬP", trang: "phien", nhan: "Phiên đăng nhập", bieuTuong: "lock" },
  { nhom: "THIẾT LẬP", trang: "nhatKy", nhan: "Nhật ký", bieuTuong: "history" },
  { nhom: "THIẾT LẬP", trang: "guiThongBao", nhan: "Gửi thông báo", bieuTuong: "megaphone" },
  { nhom: "THIẾT LẬP", trang: "troLy", nhan: "Trợ lý Hỗ trợ", bieuTuong: "chat" },
  { nhom: "THIẾT LẬP", trang: "giaoDien", nhan: "Giao diện", bieuTuong: "palette" },
  { nhom: "CHÂN MENU", trang: "toi", nhan: "Của tôi", bieuTuong: "me" },
  { nhom: "CHÂN MENU", trang: "gopY", nhan: "Góp ý / Báo lỗi", bieuTuong: "chat", moTu: (p: string) => `/feedback?new=1&from=${encodeURIComponent(p)}` },
  { nhom: "CHÂN MENU", trang: "troGiup", nhan: "Trợ giúp", bieuTuong: "help" },
] as const satisfies readonly ChoThanhBen[];
```
Trước khi dùng, mở `web/icons.ts` và thay mọi `bieuTuong` không tồn tại (ví dụ `settings`, `swap`) bằng tên có thật (hoặc dùng tên cũ: `Đề nghị chuyển khách` trước đây không có biểu tượng — thêm biểu tượng nét đơn giản vào `web/icons.ts` nếu cần, cùng kiểu). `ChoThanhBen.bieuTuong` kiểu `string` được `web/shell.ts` kiểm lúc biên dịch.
Sửa `thanhBen()`: bỏ nhánh "cha", mỗi mục `muc` trả `{ kieu: "muc", trang, nhan, href, bieuTuong, noiBat: c.noiBat === true, gom: c.gom ?? [] }`; `nhanTheoDuong()` giữ nguyên (nay phải tính cả `gom`: thêm `|| (c.gom ?? []).some((k) => sangTai(k, duong))`); thêm hàm `sangTaiMuc(c: MucThanhBen, duong)` = `sangTai(c.trang, duong) || c.gom.some(k => sangTai(k, duong))` để `web/shell.ts` dùng sáng mục gộp.
- [ ] **Bước 5: Chạy xanh** — `node --test src/muc-giao-dien-menu-moi.test.ts`, rồi `npm run typecheck` (sẽ đỏ ở `web/shell.ts` vì `kieu: "cha"` đã bỏ — sửa ở Task 3; chấp nhận đỏ typecheck tới hết Task 3, **đừng commit Task 2 riêng nếu cổng xanh chặn**: gộp Task 2+3 vào MỘT commit).
- [ ] **Bước 6: Chụp lại ảnh chụp** — sau Task 3 xanh: `node scripts/chup-muc-giao-dien.mjs --ghi src/muc-giao-dien-hien-trang.json` rồi `git diff --stat src/muc-giao-dien-hien-trang.json`; đọc diff để chắc: chỉ nhãn/nhóm/thứ tự đổi, **không** vai nào thấy thêm trang (bài ở Bước 2 đã ép).
- [ ] **Bước 7: Sửa bài đồng hành** — `src/shared/trang-chu-o.test.ts` (nếu chạm `NHOM_THANH_BEN`) và `node --test src/muc-hien-mo-duoc-1.test.ts src/muc-hien-mo-duoc-2.test.ts src/muc-hien-mo-duoc-3.test.ts src/shared/*.test.ts` cho tới xanh.

---

### Task 3: Vẽ thanh bên mới (`web/shell.ts`, `public/app.css`)

**Files:** Modify `web/shell.ts` (`NavItem`, `NavGroup`, `navGroups`, `sidebarItem`, `sidebarGroup`, `sidebar`), `public/app.css` (khối thanh bên).

**Interfaces — Consumes:** `thanhBen()` mới và `sangTaiMuc` (Task 2). **Produces:** DOM: `nav#sidebar` > `.sidebar-head`, `.sidebar-groups` (nút `a.sidebar-new` cho `noiBat`; `.sidebar-group` có tiêu đề trừ HẰNG NGÀY/CHÂN MENU; nhóm THIẾT LẬP là `button.sidebar-group-toggle[aria-expanded][aria-controls="nhom-thiet-lap"]` + `div#nhom-thiet-lap`), `.sidebar-foot` (3 mục CHÂN MENU, rồi avatar/tên/vai, rồi Đăng xuất).

- [ ] **Bước 1: Viết bài đỏ cho luật mở nhóm** — thêm hàm thuần vào `src/shared/muc-giao-dien.ts`:
```ts
/** Nhóm THIẾT LẬP mở sẵn khi: đang đứng trong một trang của nhóm, HOẶC không còn nhóm nào khác ngoài chân menu (vd Nhân sự chỉ có Quản lý tài khoản). */
export function thietLapMoSan(nhomHien: readonly { nhom: NhomThanhBen; muc: readonly MucThanhBen[] }[], duong: string): boolean {
  const tl = nhomHien.find((g) => g.nhom === "THIẾT LẬP");
  if (!tl || tl.muc.length === 0) return false;
  const conNhomKhac = nhomHien.some((g) => g.nhom !== "THIẾT LẬP" && g.nhom !== "CHÂN MENU" && g.muc.length > 0);
  return !conNhomKhac || tl.muc.some((m) => m.kieu === "muc" && sangTai(m.trang, duong));
}
```
và bài trong `src/muc-giao-dien-menu-moi.test.ts`:
```ts
import { thietLapMoSan } from "./shared/muc-giao-dien.ts";
test("Thiết lập đóng sẵn cho Quản trị ở Trang chủ; mở khi đứng ở /locations; mở sẵn cho Nhân sự", () => {
  assert.equal(thietLapMoSan(thanhBen({ staff: holder(["ADMIN"]) }, "/"), "/"), false);
  assert.equal(thietLapMoSan(thanhBen({ staff: holder(["ADMIN"]) }, "/locations"), "/locations"), true);
  assert.equal(thietLapMoSan(thanhBen({ staff: holder(["HR"]) }, "/"), "/"), true);
});
```
Chạy → đỏ → thêm hàm → xanh.
- [ ] **Bước 2: `web/shell.ts`** — bỏ nhánh `kind: "parent"/"sub"` và `NavItem.kind`; thêm `noiBat?: boolean`; trong `sidebar()`: (a) mục `noiBat` vẽ `a.sidebar-new` (biểu tượng `plus` + "Tạo đơn") đặt trên cùng `.sidebar-groups`; (b) nhóm có tiêu đề thì `div.sidebar-group-title`, trừ `HẰNG NGÀY`/`CHÂN MENU`; (c) nhóm `THIẾT LẬP`:
```ts
const moSan = thietLapMoSan(nhomHien, path);
const toggle = h("button", { type: "button", class: "sidebar-group-toggle", "aria-expanded": String(moSan), "aria-controls": "nhom-thiet-lap" },
  h("span", { class: "sidebar-group-title" }, "Thiết lập"), h("span", { class: "sidebar-group-count" }, String(items.length)), h("span", { class: "sidebar-chevron" }, icon("chevron", 16)));
const body = h("div", { id: "nhom-thiet-lap", class: "sidebar-group-items", hidden: !moSan }, ...items);
toggle.addEventListener("click", () => { const mo = toggle.getAttribute("aria-expanded") !== "true"; toggle.setAttribute("aria-expanded", String(mo)); body.hidden = !mo; });
```
(thêm biểu tượng `chevron` vào `web/icons.ts` nếu chưa có); (d) CHÂN MENU đưa vào `.sidebar-foot` phía trên avatar. Mục gộp sáng bằng `sangTaiMuc`. Huy hiệu `sapHetHan` (cát) gắn lên mục "Xe & giấy tờ" — `trinhBay(k)` đổi khoá: gắn khi `m.trang === "xe"` dùng `demSapHetHan`; huy hiệu "Đơn hàng" (đơn nháp) giữ; `catalogConflictBadge` của "Dịch vụ & giá" nay nằm trong Thiết lập (ẩn khi đóng) — **cộng số đó vào chữ đếm của nút Thiết lập** (`sidebar-group-count`) chỉ khi > 0, để việc "dịch vụ lệch giá" không biến mất khỏi tầm mắt. Giữ nguyên `loaders` (huy hiệu chỉ gọi mạng khi thanh bên hiển thị).
- [ ] **Bước 3: CSS** — thay khối `.sidebar-*` trong `public/app.css` (chỉ dùng token): nền `--c-surface-alt`, viền phải `--c-border`, mục `min-height` bằng token mới `--h-muc-menu` (thêm vào nhóm "Riêng của Tour Đảo Booking", 40px; mục Thiết lập 36px bằng `--h-muc-nho`), mục đang mở nền `--c-primary-soft` + `box-shadow: inset var(--s1) 0 0 var(--c-primary)`, nút Tạo đơn nền `--c-accent` chữ `--c-text-inverse`, huy hiệu cát `--c-sand-soft`/`--c-sand-text`, `:focus-visible` viền `--c-primary`. Tham chiếu giá trị và bố cục ở bản dựng; chuyển hex → token tương ứng.
- [ ] **Bước 4: Chạy** — `npm run typecheck` (0 lỗi), `npm run build:web`, `node --test src/token-giao-dien.test.ts src/muc-giao-dien-menu-moi.test.ts`, và `tests/e2e/pwa.mjs` quét CSS (`npm run test:e2e -- pwa`).
- [ ] **Bước 5: Chụp lại ảnh chụp** (Task 2 Bước 6), rồi commit chung Task 2+3: `git add src/shared/muc-giao-dien.ts src/muc-giao-dien-menu-moi.test.ts src/muc-giao-dien-hien-trang.json web/shell.ts web/icons.ts public/app.css` → `git commit -m "Menu máy tính theo việc: gom nhóm Vận chuyển, Tiền, Thiết lập thu gọn, chân menu"`.

---

### Task 4: Dải chuyển nhanh giữa các trang anh em của mục gộp

**Files:** Create `web/dai-trang-anh-em.ts`; Modify `web/xe.ts`, `web/lich-xe-ban.ts`, `web/giay-to-sap-het-han.ts`, `web/bang-gia-xe.ts`, `web/bang-ke-xe.ts` (nếu Task 2 Bước 1 cho phép gộp); `public/app.css`.

**Interfaces — Produces:** `export function daiTrangAnhEm(nhom: "xe" | "gia", duongHienTai: string): HTMLElement` — dải liên kết (tab dạng viên thuốc) tới các trang anh em, mục đang đứng có `aria-current="page"`.

- [ ] **Bước 1: Viết bài đỏ** — `src/shared/muc-giao-dien-gom.test.ts`: với một người giữ `["ADMIN"]`, `traAnhEm("xe")` trả `[{ nhan: "Xe", href: "/xe" }, { nhan: "Lịch xe bận", href: "/lich-xe-ban" }, { nhan: "Giấy tờ sắp hết hạn", href: "/giay-to-sap-het-han" }]`; với người chỉ `SALES` trả `[]` (không có quyền `vehicle.manage`) — để dải chỉ liệt kê trang người đó mở được. Hàm thuần `traAnhEm(nhom, who)` đặt trong `src/shared/muc-giao-dien.ts`, dùng `coHien` + `TRANG[k].duong`; bảng nhãn: `xe` → `["xe", "lichXeBan", "sapHetHan"]`, `gia` → `["bangGiaXe", "bangKeXe"]`.
- [ ] **Bước 2: Chạy đỏ → thêm hàm → xanh** (`node --test src/shared/muc-giao-dien-gom.test.ts`).
- [ ] **Bước 3: Dựng `web/dai-trang-anh-em.ts`** bằng `h()` (không `innerHTML`) từ `traAnhEm`; gắn vào đầu nội dung của 5 trang (sau `initShell()`, trước phần thân), trả `null` khi chỉ có ≤ 1 liên kết. CSS `.dai-anh-em` chỉ dùng token.
- [ ] **Bước 4: Kiểm tay bằng kịch bản** — chạy `xe-smoke.mjs`, `sap-het-han-smoke.mjs`, `lich-xe-ban-smoke.mjs` (đường dẫn trong bảng `web/CLAUDE.md`); sửa các bước đếm mục thanh bên nếu có.
- [ ] **Bước 5: Commit** — `git add src/shared/muc-giao-dien.ts src/shared/muc-giao-dien-gom.test.ts web/dai-trang-anh-em.ts web/xe.ts web/lich-xe-ban.ts web/giay-to-sap-het-han.ts web/bang-gia-xe.ts web/bang-ke-xe.ts public/app.css` → `git commit -m "Dải chuyển nhanh giữa các trang anh em của Xe & giấy tờ và Giá & chi phí"`.

---

### Task 5: Luật chọn thẻ "Việc của bạn" (hàm thuần)

**Files:** Create `src/shared/viec-cua-ban.ts`, `src/shared/viec-cua-ban.test.ts`.

**Interfaces — Produces:**
```ts
export type KhoaThe = "xemLai" | "dieuChinh" | "nhap" | "conThieu" | "chuaPhuTrach" | "cocCanChi" | "chuyenHomNay" | "gopY";
/** Số đã tải; `null` = nguồn lỗi (thẻ hiện "—" + Thử lại), KHÔNG phải 0. Khoá vắng = người này không dùng nguồn đó. */
export interface NguonSo {
  readonly xemLai?: number | null; readonly dieuChinh?: number | null; readonly nhap?: number | null; readonly conThieu?: { count: number; total: number } | null;
  readonly chuaPhuTrach?: number | null; readonly cocCanChi?: number | null; readonly chuyenHomNay?: number | null; readonly gopY?: number | null;
}
export interface TheViec {
  readonly khoa: KhoaThe; readonly nhan: string; readonly so: number | null; readonly phu: string; readonly nut: string; readonly href: string;
  readonly tone: "xanh" | "cat"; readonly chot: boolean;
}
export function viecCuaBan(who: PermissionHolder, nguon: NguonSo): { the: TheViec[]; conLai: number };
export function nguonCanTai(who: PermissionHolder): readonly KhoaThe[]; // thẻ nào người này cần tải số (để web/home.ts không gọi route thừa)
```
Luật (một nơi): mỗi thẻ có điều kiện hiện và độ ưu tiên; thẻ có `so === 0` bị bỏ; `so === null` được giữ; sắp theo ưu tiên, lấy 4 đầu, `conLai` = số thẻ còn lại.

| Khoá | Điều kiện hiện | Ưu tiên | Nút → đích | Nguồn số |
|---|---|---|---|---|
| `xemLai` | `can(who,"admin.manage")` | 1 | "Xem lại" → `#dash-review` (cuộn) | tổng `reviewAlerts` |
| `dieuChinh` | `can(who,"ledger.adjust.approve")` | 2 | "Duyệt" → `/dieu-chinh-cong-no` | `choDuyetChoToi` |
| `nhap` | cả bốn vai (xem mọi đơn) | 3 | "Xác nhận đơn" (chốt, san hô) → `/orders?status=draft` | `draftCount` |
| `conThieu` | cả bốn vai | 4 | "Ghi thu" → `/orders` | `unpaid-summary` |
| `chuaPhuTrach` | `can(who,"order.create") \|\| can(who,"admin.manage")` | 5 | "Nhận phụ trách" (Bán hàng) / "Phân công" (Quản trị) → `/orders` | `unassignedCount` |
| `cocCanChi` | `can(who,"ledger.view")` | 6 | "Chi hoàn" → trang cọc hiện có (xác định ở Bước 0) | `coc/dem` |
| `chuyenHomNay` | cả bốn vai | 7 | "Xem chuyến" → cuộn `#dash-today` | `today.length` |
| `gopY` | `can(who,"feedback.triage")` | 8 | "Xử lý" → `/feedback` | `feedback/badge` |

(Điểm "Đề nghị chuyển khách" bỏ khỏi đợt 1 — đặc tả §9.3. Trước khi code, người thi công kiểm `grep -n "feedback.triage\|ledger.adjust.approve" src/shared/permissions.ts` để chắc tên thao tác đúng.)

- [ ] **Bước 0: Xác định đích thẻ cọc** — chạy `grep -rn "ledger/coc" web/`. Nếu có trang web gọi `GET /api/ledger/coc` thì đó là đích của nút "Chi hoàn" (điền vào bảng); nếu **không có trang nào** thì bỏ khoá `cocCanChi` khỏi `KhoaThe`, bảng, bài Kế toán (thẻ thứ tư của Kế toán thành `chuaPhuTrach` bị loại → Kế toán còn 3 thẻ) và ghi nợ vào `docs/BACKLOG.md`.
- [ ] **Bước 1: Viết bài đỏ** — `src/shared/viec-cua-ban.test.ts`:
```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { viecCuaBan } from "./viec-cua-ban.ts";
import type { PermissionCode } from "./permissions.ts";
const who = (...permissions: PermissionCode[]) => ({ id: "x", permissions });
const day = { nhap: 3, conThieu: { count: 5, total: 18_400_000 }, chuaPhuTrach: 2, chuyenHomNay: 4, xemLai: 3, dieuChinh: 2, cocCanChi: 1, gopY: 4 };

test("Bán hàng: nhap · conThieu · chuaPhuTrach · chuyenHomNay, không thẻ của Kế toán/Quản trị", () => {
  assert.deepEqual(viecCuaBan(who("SALES"), day).the.map((t) => t.khoa), ["nhap", "conThieu", "chuaPhuTrach", "chuyenHomNay"]);
});
test("Kế toán: dieuChinh · nhap · conThieu · cocCanChi, không chuaPhuTrach", () => {
  assert.deepEqual(viecCuaBan(who("ACCOUNTING"), day).the.map((t) => t.khoa), ["dieuChinh", "nhap", "conThieu", "cocCanChi"]);
});
test("Quản trị: xemLai đứng đầu; không có thẻ Góp ý", () => {
  const r = viecCuaBan(who("ADMIN"), day).the.map((t) => t.khoa);
  assert.equal(r[0], "xemLai"); assert.ok(!r.includes("gopY"));
});
test("Toàn quyền có thể có thẻ Góp ý khi còn chỗ; thẻ thứ 5 trở đi tính vào conLai", () => {
  const r = viecCuaBan(who("ADMIN", "SUPER_ADMIN"), day);
  assert.equal(r.the.length, 4); assert.ok(r.conLai >= 1);
});
test("số 0 thì không có thẻ; nguồn lỗi (null) thì GIỮ thẻ với so = null", () => {
  const r = viecCuaBan(who("SALES"), { ...day, nhap: 0, conThieu: null });
  assert.ok(!r.the.some((t) => t.khoa === "nhap"));
  assert.equal(r.the.find((t) => t.khoa === "conThieu")?.so, null);
});
test("không việc nào → danh sách rỗng, conLai 0", () => {
  assert.deepEqual(viecCuaBan(who("SALES"), { nhap: 0, conThieu: { count: 0, total: 0 }, chuaPhuTrach: 0, chuyenHomNay: 0 }), { the: [], conLai: 0 });
});
test("chỉ thẻ đầu 'nhap' là nút chốt (san hô); người khác không có thẻ chốt thừa", () => {
  const the = viecCuaBan(who("SALES"), day).the;
  assert.equal(the.filter((t) => t.chot).length, 1);
});
```
- [ ] **Bước 2: Chạy đỏ** — `node --test src/shared/viec-cua-ban.test.ts` (thiếu mô-đun).
- [ ] **Bước 3: Viết `src/shared/viec-cua-ban.ts`** theo bảng luật: mảng `THE` mô tả `{ khoa, hien(who), uuTien, nhan, nut, href, tone, chot, phu(so, nguon) }`; `viecCuaBan` lọc theo `hien`, ghép số từ `nguon`, bỏ `so === 0`, sắp theo `uuTien`, cắt 4. Câu phụ viết bằng lời thường, ví dụ `conThieu`: `Còn phải thu ${vnd(total)}` (dùng hàm định dạng tiền có sẵn ở `src/shared/` — `grep -rn "export function vnd" src/shared`), `chuaPhuTrach`: "Chưa ai nhận chăm sóc khách", `nhap`: "Cần xác nhận để giữ chỗ". **Không** bịa câu về điều hệ thống không biết.
- [ ] **Bước 4: Chạy xanh** — `node --test src/shared/viec-cua-ban.test.ts` rồi `npm run typecheck`.
- [ ] **Bước 5: Commit** — `git add src/shared/viec-cua-ban.ts src/shared/viec-cua-ban.test.ts` → `git commit -m "Luật chọn thẻ Việc của bạn theo vai, chỉ dùng số đã có nguồn"`.

---

### Task 6: Vẽ khối "Việc của bạn" ở Trang chủ máy tính

**Files:** Modify `public/index.html` (thêm `<section id="dash-viec" class="dash-viec" aria-labelledby="dash-viec-h" hidden>` trước `#dash-grid`), `web/home.ts` (tải nguồn + vẽ), `public/app.css` (`.dash-viec*`).

**Interfaces — Consumes:** `viecCuaBan`, `nguonCanTai` (Task 5); các hàm tải sẵn có của `web/home.ts`: `taiDashboard`, `GET /api/ledger/unpaid-summary`, `loadReview`/`demSapHetHan`. Nguồn mới cần gọi: `GET /api/ledger/adjustment-requests` (lấy `choDuyetChoToi`), `GET /api/ledger/coc/dem`, `GET /api/feedback/badge` (chỉ khi `nguonCanTai` có khoá tương ứng).

- [ ] **Bước 1: Ẩn khối số cũ trên máy tính** — `#dash-so-mt` giữ lại CHỈ ô "Doanh thu của tôi" (biểu đồ tuần); ba ô còn lại (Còn thiếu tiền, Chờ xác nhận, Chưa phụ trách) nay là thẻ. Điện thoại giữ nguyên `#dash-so` (cùng số, không đổi). Sửa `renderSoMayTinh` cho khớp; `#dash-review` ("Cần xem lại") giữ nguyên làm phần chi tiết bên dưới, thẻ `xemLai` trỏ tới nó.
- [ ] **Bước 2: Tải nguồn có điều kiện** — trong `taiDashboard(...)` sau khi có `data`: dựng `nguon: NguonSo` từ `data.draftCount`, `data.unassignedCount`, `data.today.length`, `unpaid` (null nếu lỗi), và với từng khoá trong `nguonCanTai(staff)` còn thiếu thì gọi route tương ứng bằng `api<…>()`; lỗi mạng của MỘT nguồn → `null` cho khoá đó, không ném. Tất cả bọc trong `Promise.allSettled`.
- [ ] **Bước 3: Vẽ** — hàm `renderViec(nguon)`:
```ts
function renderViec(staff: Staff, nguon: NguonSo): void {
  const { the, conLai } = viecCuaBan(staff, nguon);
  const sec = byId("dash-viec");
  if (the.length === 0) {
    replaceChildren(sec, h("h2", { id: "dash-viec-h", class: "dash-viec-tieu-de" }, "Việc của bạn"),
      h("p", { class: "dash-viec-rong" }, "Hôm nay không có việc chờ bạn."),
      can(staff, "order.create") ? h("a", { class: "btn btn-accent", href: "/order-form" }, "Tạo đơn") : false);
  } else {
    replaceChildren(sec, h("h2", { id: "dash-viec-h", class: "dash-viec-tieu-de" }, "Việc của bạn"),
      h("div", { class: "dash-viec-luoi" }, ...the.map(theViec)),
      conLai > 0 && h("p", { class: "dash-viec-con" }, `Còn ${conLai} việc nữa — xem ở các mục bên dưới.`));
  }
  sec.hidden = false;
}
```
`theViec(t)` dựng `article.dash-viec-the` gồm biểu tượng, nhãn, số lớn (`t.so === null` → "—" và nút "Thử lại" gọi lại `taiDashboard`), dòng phụ, MỘT liên kết/nút `t.nut` (`btn btn-accent` nếu `t.chot`, ngược lại `btn btn-primary` cho thẻ đầu, `btn btn-secondary` cho còn lại), thẻ `tone: "cat"` viền/nền cát. Thẻ `chuyenHomNay` và `xemLai` là nút cuộn (`scrollIntoView`) tới `#dash-today` / `#dash-review`, không phải liên kết. Chỉ gọi `renderViec` khi người xem ở lại Trang chủ (bốn vai văn phòng); điện thoại ẩn `#dash-viec` bằng CSS.
- [ ] **Bước 4: Lời chào** — `datTomTatDai`: dòng tóm tắt đổi thành `Có N việc chờ bạn — gấp nhất: <nhãn> (<số>).` khi có thẻ, giữ câu cũ "N chuyến đón hôm nay" khi không (không đổi hành vi khi chưa có thẻ).
- [ ] **Bước 5: CSS** — `.dash-viec-luoi { display: grid; grid-template-columns: repeat(auto-fit, minmax(var(--w-the-viec), 1fr)); gap: var(--s4); }` (thêm `--w-the-viec` vào nhóm "Riêng của Tour Đảo Booking"), thẻ nền `--c-card`, viền `--c-border`, bóng `--shadow-card`, số lớn dùng token cỡ chữ có sẵn (kiểm `grep -n "font-size" public/app.css | head` tìm token cỡ lớn của `.dash-smt-gt` và dùng lại), huy hiệu tông cát `--c-sand-soft`.
- [ ] **Bước 6: Kiểm** — `npm run typecheck`, `npm run build:web`, `node --test src/shared/viec-cua-ban.test.ts`, rồi chạy `trang-chu-smoke.mjs` (sửa các bước đếm theo Task 7). Mở bằng Chrome thật ở 1440 và 1024, 8 vai (kịch bản dùng tài khoản gieo sẵn của e2e), chụp ảnh đặt vào `docs/evidence/2026-10-15-menu-may-tinh/`.
- [ ] **Bước 7: Commit** — `git add public/index.html web/home.ts public/app.css` → `git commit -m "Trang chủ máy tính: khối Việc của bạn theo vai, số lấy từ nguồn thật"`.

---

### Task 7: Sửa kịch bản đếm mục, tài liệu, và người kiểm độc lập

**Files:** Modify `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` (`ADMIN_NAV`, đếm 25/32, FIELD đúng 3 mục → 4), `docs/evidence/2026-10-13-dieu-chinh-cong-no/kich-ban/dieu-chinh-smoke.mjs`, các kịch bản `*smoke*.mjs` có `sidebar-item` (chạy từng cái, sửa chỗ đỏ); `docs/SYSTEM-DESIGN.md` §9 (mô tả mới, cùng commit); `docs/CHANGE-GUIDE.md` (công thức thêm mục menu: thêm vào nhóm nào); `src/shared/changelog.ts` (mục nhật ký thay đổi cho bản kế tiếp); `docs/BACKLOG.md` (nợ: thẻ "Đề nghị chuyển khách", đơn "của tôi cần làm", Trang chủ cho hướng dẫn viên/Đối tác/Nhân sự — cần ADR); `docs/superpowers/plans/2026-10-15-menu-may-tinh-thi-cong-nhat-ky.md`.

- [ ] **Bước 1:** `npm test` (cả bộ) — sửa mọi bài đỏ do đổi nhãn/thứ tự/nhóm; **không** nới bài để xanh (nếu bài bảo vệ một quyền mà đỏ, dừng và báo).
- [ ] **Bước 2:** `npm run typecheck` 0 lỗi; `npm run test:e2e` (cần mạng; ghi rõ nếu không chạy được).
- [ ] **Bước 3:** chạy các kịch bản Chrome theo bảng `web/CLAUDE.md` cho các tệp đã sửa (`web/shell.ts`, `web/home.ts`, `web/xe*.ts`, `web/giay-to-sap-het-han.ts`, `public/app.css`): `trang-chu-smoke.mjs`, `xe-smoke.mjs`, `sap-het-han-smoke.mjs`, `danh-muc-giay-to-smoke.mjs`, `dot-c-smoke.mjs`, `help-smoke.mjs`, `tai-xe-trang-dau-smoke.mjs`, `hdv-viec-cua-toi-smoke.mjs`; nhớ `AXE_JS` (kiểm màu) theo `reference-kich-ban-chrome-can-axe-js`.
- [ ] **Bước 4: Cập nhật tài liệu** theo danh sách Files; thêm dòng vào nhật ký thi công: việc nào đã làm, bài nào sửa và vì sao.
- [ ] **Bước 5: Commit** tài liệu và kịch bản.
- [ ] **Bước 6: Người kiểm độc lập** — giao `nguoi-kiem-doc-lap` (chỉ đọc), đưa: đặc tả, kế hoạch này, `git diff main...HEAD`; yêu cầu tự chạy lại `npm test`, `npm run typecheck`, bài `src/muc-giao-dien-menu-moi.test.ts`, và kiểm tay 5 điểm "Review Focus"; báo cáo CHỈ đọc. Chỉ báo "đạt" khi báo cáo đó đạt; lỗi nhỏ ghi nhật ký, lỗi sai quyền thì sửa rồi kiểm lại.
- [ ] **Bước 7: Báo chủ** bốn mục (Đã làm / Đã kiểm — nói rõ có người kiểm độc lập / Chưa làm / Cần quyết) và đưa **nguyên lệnh** chủ tự chạy: `npm run day-len`, rồi nói rõ có cần `npm run trien-khai` hay không (có: thay đổi giao diện). Không tự chạy.

---

## Tự rà kế hoạch với đặc tả
- §4 menu: Task 2–3. §5 thẻ: Task 5–6. §6 luồng mô phỏng: kiểm ở Task 6 Bước 6 (8 vai × 2 khổ). §7.3 hướng dẫn viên: Task 1. §9.1–9.4: phạm vi Task 5–6 (bốn vai, không thẻ chuyển khách, không Trang chủ vai ngoài). Đợt 2 (Trang chủ cho hướng dẫn viên/Đối tác/Nhân sự) **không** có trong kế hoạch này — cần ADR + trang ghép trước (đã ghi BACKLOG ở Task 7).
- Rủi ro đã biết: (a) Task 2 Bước 1 có thể buộc không gộp "Giá & chi phí"; (b) Task 1 Bước 5 có thể phát hiện trang `/orders` của hướng dẫn viên không có đơn tự do → dừng báo chủ; (c) thẻ `cocCanChi` có thể không có trang đích → bỏ khỏi đợt 1.
