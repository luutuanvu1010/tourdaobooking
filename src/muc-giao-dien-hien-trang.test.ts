// BÀI ĐẶC TẢ HIỆN TRẠNG CỦA MỤC ĐIỀU HƯỚNG (bước K-c sổ đại lý đợt 1).
//
// Chặn: đổi NGOÀI Ý MUỐN ai thấy mục nào, chữ, nhóm, thứ tự — ở thanh bên máy tính, thanh tab điện thoại, thanh trên, trang Tôi, ô Trang chủ, khung tạm (bản
// nhớ khung ADR-0035) và khung mất mạng — trên ĐỦ 1024 tập quyền (mọi tập con của PERMISSION_CODES, kể cả tập hôm nay CSDL không cho tạo).
// Cách: src/muc-giao-dien-hien-trang.json là ảnh chụp mã giao diện CŨ (trước khi gom về bảng src/shared/muc-giao-dien.ts), sinh bằng cách CHẠY chính
// web/account.ts + web/shell.ts trên DOM giả (`node scripts/chup-muc-giao-dien.mjs --ghi src/muc-giao-dien-hien-trang.json --rev cd44b76d`); bài này tính lại
// bằng các hàm thuần của bảng mới và đòi khớp từng tập. Bài rào src/muc-hien-mo-duoc-{1,2,3}.test.ts chỉ thấy "mục hiện ⇔ trang mở được" — không thấy đổi chữ, đổi
// nhóm, đổi thứ tự, hay một mục "được mà ẩn" nay lặng lẽ hiện/ẩn thêm; bài này thấy (vì sao giữ lại sau khi gom bảng — Ruling K-c ở sổ thi công).
//
// Giới hạn: mục MỚI (chuỗi chưa có trong ảnh chụp) được bỏ qua — bài rào lo mục mới; đổi chữ một mục cũ thì chuỗi cũ biến mất ⇒ ĐỎ. Đổi có chủ ý (chủ duyệt):
// chụp lại bằng lệnh trên với `--rev <mã lần lưu đã duyệt>` và ghi lý do trong lần lưu. Huy hiệu, chấm "Có bản mới", trạng thái sáng không thuộc bài này
// (scripts/chup-muc-giao-dien.mjs --so-sanh <mã> so DOM đầy đủ khi cần).
//
// Chụp lại 2026-10-12 (ghép main 1c471990 vào gói Vận chuyển A+C): gói A+C thêm mục "Đề nghị chuyển khách" (A5), "Báo bận của tôi" (A4), đổi biểu tượng "Cuốc của tôi", và tài xế
// đối tác nay có "Cuốc của tôi" (A4) — đều làm ở MÃ CŨ (web/shell.ts, web/account.ts) trước khi main gom về bảng. Ảnh chụp mới = chạy mã cũ ĐÃ GỘP (shell.ts / account.ts ở 540ca66d
// 3-way với cd44b76d, tay gỡ 5 chỗ tham số) trên cây gộp: `node scripts/chup-muc-giao-dien.mjs --ghi src/muc-giao-dien-hien-trang.json`, rồi trả web/shell.ts, web/account.ts về bản bảng.
// Bài này đỏ nếu bảng mới lệch mã cũ đã gộp ở BẤT KỲ tập nào trong 1024 tập quyền (đã đạt lúc ghép).
// Chụp lại 2026-10-15 (Vé hỗ trợ đợt 1, Việc 7): đổi nhãn có chủ ý «Góp ý / Báo lỗi» → «Hỗ trợ» (bản giao việc Bước 6). `--rev cb7da197` (lần lưu đổi nhãn); so ảnh cũ chỉ đổi
// đúng chuỗi nhãn đó ở bốn nơi, và ghim thêm mục «Điều chỉnh công nợ» (mục mới có từ trước, ảnh cũ chưa ghim — chỉ siết thêm).
// Chụp lại khi gộp main fc533d49 (menu theo việc) vào nhánh Vé hỗ trợ: chạy lệnh trên cây gộp, so ảnh của main chỉ đổi đúng chuỗi «Góp ý / Báo lỗi» → «Hỗ trợ» ở bốn chuỗi, các tập không đổi.
// Vá ảnh chụp 2026-10-17 (ADR-0128 Q1, chủ duyệt): Quản trị nay thấy mục «Chính sách điều phối» (ô mới `dispatch.policy.lead`, chỉ đặt hai số mốc). Mã giao diện cũ không có luật này nên không chụp lại được;
// bật tay đúng 768 bit của chuỗi «Chính sách điều phối» ở thanh bên, trang Tôi, Trang chủ cho mọi tập CÓ quyền ADMIN (768 = số tập có ADMIN mà trước đó chưa có SUPER_ADMIN). Mọi chuỗi khác giữ nguyên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PERMISSION_CODES, type PermissionHolder } from "./shared/permissions.ts";
import { KHUNG_MAT_MANG, coKhungNho, thanhBen, thanhTab, thanhTren, trangToi, type NguoiXem } from "./shared/muc-giao-dien.ts";
import { nhomMayTinh } from "./shared/trang-chu-o.ts";

interface AnhChup {
  maQuyen: string[];
  noi: Record<string, { muc: string[]; tap: string[] }>;
  ngoaiTuyen: { thanhBen: string[]; thanhTab: string[]; thanhTren: string[]; trangToi: string[] };
}
const ANH = JSON.parse(readFileSync(new URL("./muc-giao-dien-hien-trang.json", import.meta.url), "utf8")) as AnhChup;

/** Đường trang lúc chụp (Góp ý mở form mới kèm `from` = trang đang đứng). */
const DUONG_CHUP = "/account";
const TAP = Array.from({ length: 1 << PERMISSION_CODES.length }, (_, m) => m);
const nguoi = (m: number): PermissionHolder => ({ id: `tap-${m}`, permissions: PERMISSION_CODES.filter((_, i) => m & (1 << i)) });
const co = (b64: string, m: number): boolean => ((Buffer.from(b64, "base64")[m >> 3]! >> (m & 7)) & 1) === 1;

/** Chuỗi so sánh — ĐÚNG dạng scripts/chup-muc-giao-dien.mjs đọc từ DOM (docMuc). */
function chuoiThanhBen(n: NguoiXem): string[] {
  return thanhBen(n, DUONG_CHUP).flatMap(({ nhom, muc }) =>
    muc.map((x) => `${nhom}||${x.nhan}|${x.href}`),
  );
}
const chuoiThanhTab = (n: NguoiXem): string[] => thanhTab(n).map((t) => `${t.nhan}|${t.href}`);
const chuoiThanhTren = (n: NguoiXem): string[] => thanhTren(n).map((t) => (t.kieu === "o-tim" ? `Tìm đơn|${t.href}` : `${t.nhan}|${t.href}`));
function chuoiTrangToi(s: PermissionHolder): string[] {
  const t = trangToi(s);
  const dong = (id: string, ds: readonly { nhan: string; href: string }[]) => ds.map((m) => `${id}|${m.nhan}|${m.href}`);
  return t.vanChuyen ? [...dong("links-top", t.dau), ...dong("vc-links", t.vanChuyen), ...dong("links", t.sau)] : [...dong("links", t.dau), ...dong("links", t.sau)];
}
const chuoiTrangChu = (s: PermissionHolder): string[] => nhomMayTinh(s).flatMap((g) => g.o.map((x) => `${g.ten}|${x.khoa}|${x.nhan}|${x.href}`));

const NOI: Record<string, (s: PermissionHolder) => string[]> = {
  "thanh-ben": (s) => chuoiThanhBen({ staff: s }),
  "thanh-tab": (s) => chuoiThanhTab({ staff: s }),
  "thanh-tren": (s) => chuoiThanhTren({ staff: s }),
  "trang-toi": chuoiTrangToi,
  "trang-chu": chuoiTrangChu,
  // Khung tạm: lần mở trang sau, bản nhớ khung là bốn cờ ghi từ chính tài khoản đó.
  "khung-tam:thanh-ben": (s) => chuoiThanhBen({ khungNho: coKhungNho(s) }),
  "khung-tam:thanh-tab": (s) => chuoiThanhTab({ khungNho: coKhungNho(s) }),
  "khung-tam:thanh-tren": (s) => chuoiThanhTren({ khungNho: coKhungNho(s) }),
};

/**
 * Mục "hiện mà bị máy chủ từ chối" đã ẨN ở bước K-c (bước 4 của đề bài: siết). Dạng: "<nơi>|<chuỗi>" → các tập (m) nay không còn thấy.
 * Rỗng: bài rào không tìm thấy mục nào hiện mà bị từ chối trên 1024 tập — không ẩn gì.
 */
/** Các tập giữ quyền Đối tác (kể cả lai) mà ảnh chụp từng thấy chuỗi `<nơi>|<chuỗi>` — dùng cho mục máy chủ nay chặn tài khoản Đối tác. */
const tapDoiTacTungThay = (khoa: string): number[] => {
  const [noi, ...phan] = khoa.split("|");
  const { muc, tap } = ANH.noi[noi!]!;
  const i = muc.indexOf(phan.join("|"));
  return i < 0 ? [] : TAP.filter((m) => nguoi(m).permissions.includes("PARTNER") && co(tap[i]!, m));
};
const AN_DI: Record<string, readonly number[]> = Object.fromEntries(
  // Ruling R-P18 (sổ đại lý đợt 2, vòng sửa 1 Task 6): route yêu cầu điều chỉnh công nợ chặn tài khoản giữ quyền Đối tác (yêu cầu có thể là giá vốn / hoa hồng của
  // đối tác khác) ⇒ mục «Điều chỉnh công nợ» ẩn với mọi tập có PARTNER mà mã cũ từng hiện (bài src/muc-hien-mo-duoc-*.test.ts: hiện ⇒ đường gọi chính không bị từ chối).
  ["thanh-ben|TIỀN||Điều chỉnh công nợ|/dieu-chinh-cong-no", "trang-toi|links|Điều chỉnh công nợ|/dieu-chinh-cong-no"].map((k) => [k, tapDoiTacTungThay(k)]),
);

test("ảnh chụp đủ 1024 tập, đúng thứ tự mã quyền, đủ tám nơi", () => {
  assert.deepEqual(ANH.maQuyen, [...PERMISSION_CODES], "thứ tự mã quyền đổi ⇒ mặt nạ của ảnh chụp sai nghĩa — chụp lại");
  assert.deepEqual(Object.keys(ANH.noi).sort(), Object.keys(NOI).sort());
  for (const [noi, { muc, tap }] of Object.entries(ANH.noi)) {
    assert.equal(tap.length, muc.length, noi);
    for (const t of tap) assert.equal(Buffer.from(t, "base64").length, TAP.length / 8, noi);
  }
});

for (const [noi, tinh] of Object.entries(NOI)) {
  test(`${noi}: mỗi tập quyền thấy đúng các mục, đúng thứ tự như mã cũ (trừ mục đã ẩn có ghi ở AN_DI)`, () => {
    const { muc, tap } = ANH.noi[noi]!;
    const daBiet = new Set(muc);
    const lech: string[] = [];
    for (const m of TAP) {
      const cu = muc.filter((x, i) => co(tap[i]!, m) && !(AN_DI[`${noi}|${x}`] ?? []).includes(m));
      const moi = tinh(nguoi(m)).filter((x) => daBiet.has(x)); // mục mới (chưa có trong ảnh chụp): bài rào lo
      if (JSON.stringify(cu) !== JSON.stringify(moi)) {
        lech.push(`tập ${m} [${nguoi(m).permissions.join(", ") || "không quyền"}]: cũ ${JSON.stringify(cu)} ≠ mới ${JSON.stringify(moi)}`);
        if (lech.length >= 5) break;
      }
    }
    assert.deepEqual(lech, [], `${noi}: mục hiện khác ảnh chụp mã cũ (src/muc-giao-dien-hien-trang.json). Đổi có chủ ý thì chụp lại — xem đầu tệp.`);
  });
}

test("mất mạng lúc mở trang, chưa có bản nhớ khung: bốn tab cơ bản, không thanh bên, không thanh trên — như mã cũ", () => {
  const n: NguoiXem = { khungNho: KHUNG_MAT_MANG };
  assert.deepEqual(chuoiThanhTab(n), ANH.ngoaiTuyen.thanhTab);
  assert.deepEqual(ANH.ngoaiTuyen.thanhBen, [], "mã cũ không dựng thanh bên khi mất mạng — shell.ts giữ (addNav không có staff, không có bản nhớ)");
  assert.deepEqual(ANH.ngoaiTuyen.thanhTren, []);
});

test("AN_DI không thừa: mỗi dòng trỏ tới chuỗi có trong ảnh chụp và tập từng thấy nó", () => {
  for (const [khoa, ds] of Object.entries(AN_DI)) {
    const [noi, ...phan] = khoa.split("|");
    const { muc, tap } = ANH.noi[noi!]!;
    const i = muc.indexOf(phan.join("|"));
    assert.ok(i >= 0, `AN_DI: ${khoa} không có trong ảnh chụp`);
    for (const m of ds) assert.ok(co(tap[i]!, m), `AN_DI: ${khoa} — tập ${m} vốn không thấy mục này`);
  }
});
