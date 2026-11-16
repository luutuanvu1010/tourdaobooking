// Bài QUÉT mọi chỗ đọc / ghi `order_item` (phí đưa đón Đợt C, Task 5; trang ghép 2026-10-28 §1 «mọi chỗ đọc order_item phải biết loại dòng mới»). Từ migration 0169 bảng này chứa HAI loại
// dòng: dòng dịch vụ (`line_kind = 'SERVICE'`) và dòng phí đưa đón (`'TRANSFER_FEE'`, không dịch vụ, không giá danh mục). Mỗi tệp chạy thật trong `src/` và `scripts/` (bỏ `*.test.ts`)
// nhắc tên bảng trong MÃ (chú thích không tính; chuỗi SQL có tính) phải có mặt ở `DA_RA` với đúng số chỗ nhắc và cách nó đối xử với dòng phí:
//   TINH_VAO   — cộng phí vào (tổng đơn, phải thu, biên nhận, công nợ, kiểm tạm tính = Σ dòng);
//   LUAT_RIENG — đọc / ghi dòng phí theo luật của phí (chụp, tính lại theo số khách, chia phần Tour Đảo);
//   BO_RA      — cố ý chỉ lấy dòng dịch vụ (hoa hồng, nhóm dịch vụ / DTO dịch vụ, R2, trần giảm giá);
//   BO_QUA     — không phải chỗ đọc tiền (ghi đơn nháp, chữ của bảng tham chiếu, kịch bản xoá dữ liệu một lần).
// Tệp mới nhắc `order_item`, hoặc số chỗ nhắc đổi ⇒ đỏ: người thi công xếp loại chỗ mới và ghi lý do (vào đây VÀ nhật ký thi công). Mục thừa (tệp không còn nhắc) cũng đỏ.
// Giới hạn: chỉ thấy tên bảng viết liền (không thấy câu ghép từ mảnh chuỗi); đọc dòng tiền QUA HÀM của orders (DTO, `computeEffectiveMoney`, `giaDaiLyNhieuDon`…) không nhắc tên bảng —
// các chỗ đó là danh sách hàm của kế hoạch Task 5, kiểm bằng bài hành vi `src/phi-don-doc-tien.test.ts` và ba bài canh nguồn dòng tiền (buildlines-guard, thanh-tien-mot-ham, hoa-hong-mot-nguon).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

type Cach = "TINH_VAO" | "LUAT_RIENG" | "BO_RA" | "BO_QUA";
const DA_RA: Record<string, { soCho: number; cach: Cach[]; lyDo: string }> = {
  "src/modules/orders/repository.ts": {
    soCho: 5,
    cach: ["BO_RA", "BO_QUA"],
    lyDo:
      "ITEM_SELECT (findOrder): groupItems chỉ lấy dòng SERVICE vào nhóm dịch vụ, dòng phí đọc riêng bằng fee_rows_by_order vào OrderDto.phiDuaDon (Ruling R3); " +
      "câu dòng tiền của getServicesForSubtotal: buildSubtotalServices bỏ dòng phí, phần phí đọc riêng bằng getPhiChoHieuLuc (fee_money_many) rồi cộng ở tienHieuLuc / computeEffectiveMoney; " +
      "kiểu WriteTable, câu chèn dòng dịch vụ và câu xoá dòng của ĐƠN NHÁP lúc lưu nháp (ghi, không đọc tiền — xoá cả dòng phí dự kiến rồi chèn lại, Task 3).",
  },
  "src/modules/orders/chang-hanh-khach-repo.ts": {
    soCho: 6,
    cach: ["LUAT_RIENG"],
    lyDo:
      "câu riêng của dòng phí: fee_item_insert (kèm EXISTS dòng id mới của lô), fee_items_delete_truoc, fee_item_insert_truoc (chỉ đơn nháp), fee_rows_by_order (OrderDto.phiDuaDon, " +
      "không lọc chặng đã đóng), fee_money_many (phần phí của tiền hiệu lực và công nợ đại lý, tính lại theo số khách mới ở phiHieuLuc).",
  },
  "src/modules/orders/thuong-mai-repo.ts": {
    soCho: 1,
    cach: ["BO_RA"],
    lyDo: "items_money_many (giá đại lý / hoa hồng nhiều đơn): chỉ dòng SERVICE — phí không vào hoa hồng; tổng công nợ cộng phí riêng ở ghepGiaDaiLy (phiDon, SV-PD-25).",
  },
  "src/shared/bang-tham-chieu-khai-niem.ts": {
    soCho: 1,
    cach: ["BO_QUA"],
    lyDo: "chữ «mã nội bộ» của khái niệm «Dòng tiền» trong bảng tham chiếu ngôn ngữ — không truy vấn.",
  },
  "scripts/sao-luu-lib.mjs": {
    soCho: 1,
    cach: ["BO_QUA"],
    lyDo: "CAU_DEM (Đợt 2 sau kiểm toán): chỉ ĐẾM số dòng order_item khi diễn tập khôi phục để so bản nạp lại với production — không đọc tiền, đếm mọi loại dòng là đúng ý.",
  },
  "scripts/audit-checks.mjs": {
    soCho: 5,
    cach: ["TINH_VAO", "LUAT_RIENG", "BO_RA"],
    lyDo:
      "COT_DICH_VU (kiểm hoa hồng định kỳ, audit-thuong-mai): chỉ dòng của một dịch vụ (service_id = dịch vụ) — dòng phí service_id rỗng nên bị bỏ, đúng luật hoa hồng; " +
      "R-ORD-15 / R-ORD-15w (ba chỗ): tạm tính đã lưu = Σ MỌI dòng, gồm dòng phí (Ruling R1); R-ORD-PD-1: chỉ dòng phí (chặng cùng đơn, mức còn, thành tiền, PER_TRIP số lượng 1).",
  },
  "scripts/don-du-lieu-thu/migrations/0001_xoa_du_lieu_thu_adr_0158.sql": {
    soCho: 3,
    cach: ["BO_QUA"],
    lyDo: "kịch bản xoá dữ liệu thử MỘT LẦN (ADR-0158, đã chạy 2/11): gỡ trigger, xoá hết dòng, dựng lại trigger — không đọc tiền, xoá cả hai loại dòng như nhau.",
  },
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|mjs|sql)$/.test(p) && !p.endsWith(".test.ts") && !p.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/** Số chỗ nhắc `order_item` trong MÃ (chú thích bị che; chuỗi SQL giữ nguyên). Tệp .sql: bỏ chú thích `--`. */
function soChoNhac(file: string, src: string): number {
  const ma = file.endsWith(".sql") ? src.replace(/--.*$/gm, "") : maskSource(src, { strings: false, comments: true });
  return (ma.match(/\border_item\b/g) ?? []).length;
}

test("bộ quét: đếm tên bảng trong mã và chuỗi SQL, bỏ chú thích (tự kiểm)", () => {
  assert.equal(soChoNhac("x.ts", "// order_item\nconst a = `SELECT * FROM order_item`; /* order_item */"), 1);
  assert.equal(soChoNhac("x.sql", "-- order_item\nDELETE FROM order_item;"), 1);
  assert.equal(soChoNhac("x.ts", "const order_items = 1;"), 0, "tên khác (order_items) không tính");
});

test("phí đưa đón (Đợt C): mọi tệp chạy thật nhắc `order_item` đã được xếp loại (tính vào / luật riêng / bỏ ra / bỏ qua) kèm lý do, đúng số chỗ", () => {
  const thucTe: Record<string, number> = {};
  for (const abs of [...walk(join(ROOT, "src")), ...walk(join(ROOT, "scripts"))]) {
    const file = relative(ROOT, abs);
    const n = soChoNhac(file, readFileSync(abs, "utf8"));
    if (n > 0) thucTe[file] = n;
  }
  for (const [f, v] of Object.entries(DA_RA)) assert.ok(v.lyDo.trim().length > 0 && v.cach.length > 0, `${f}: phải ghi cách xử lý dòng phí và lý do`);
  assert.deepEqual(
    thucTe,
    Object.fromEntries(Object.entries(DA_RA).map(([f, v]) => [f, v.soCho])),
    "Chỗ nhắc `order_item` khác danh sách đã rà: xếp loại chỗ mới (dòng phí đưa đón tính vào / luật riêng / bỏ ra / bỏ qua) và ghi lý do vào DA_RA + nhật ký thi công Đợt C.",
  );
});
