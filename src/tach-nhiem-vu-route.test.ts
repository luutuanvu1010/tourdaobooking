// HÀNG RÀO tách nhiệm vụ (ADR-0187 Đ3 mức (a)) — phân tích TĨNH mã nguồn, cùng lối bài `orders-cong-bo.test.ts`:
//   Mọi route GHI (POST/PUT) của billing/index.ts hỏi một ô của nhóm `O_GHI_TIEN` (`can(staff, "<ô>")`) phải gọi hàm chung `tuGhiDonMinhLap(` (src/shared/tach-nhiem-vu.ts)
//   hoặc `dauTuGhi(` (bọc cùng hàm, nhiều đơn) SAU lời gọi `can(` — để dòng tiền do chính người lập đơn ghi luôn mang dấu «tự ghi đơn mình lập».
//   Ngoại lệ CÓ TÊN (không ghi tiền dù hỏi ô ghi tiền) liệt kê ở NGOAI_LE kèm lý do; thêm route ghi tiền mới mà quên gọi ⇒ bài đỏ.
//   Đồng thời: ngoài billing không module nào có route ghi hỏi ô của `O_GHI_TIEN` (nếu có thì bài này không thấy nó — phải mở rộng bài).
// GIỚI HẠN (docs/SO-HANG-RAO.md): canh QUÊN, không canh CỐ Ý — gọi hàm rồi bỏ kết quả, hay gọi `can` bằng biến, bài không thấy. Dấu ở nhật ký thì `insertStatement` tự điền (bài khung thử kiểm).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { O_GHI_TIEN } from "./shared/permissions.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const GHI = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const O_RE = new RegExp(`can\\(staff,\\s*"(${O_GHI_TIEN.join("|").replace(/\./g, "\\.")})"`, "g");

/** Route hỏi ô ghi tiền nhưng KHÔNG ghi tiền — không cần dấu. */
const NGOAI_LE: Record<string, string> = {
  "POST /api/ledger/adjustment-requests/:requestId/withdraw": "rút yêu cầu điều chỉnh của chính mình — không ghi phiếu, không đổi số tiền",
  "POST /api/ledger/tu-ghi/:auditId/da-soat": "nút «Đã soát» — luật «người soát khác người ghi» nằm trong soatTuGhi (cùng luật thuần) + trigger 0150; không ghi tiền",
};

interface RouteText { key: string; body: string }
/** Cắt tệp index.ts thành từng đoạn `route("…", "…"` (che chú thích, giữ chuỗi). */
export function routesIn(source: string): RouteText[] {
  const code = maskSource(source, { strings: false, comments: true });
  return code.split(/(?=^\s*route\(")/m).slice(1).flatMap((p) => {
    const m = p.match(/route\("(\w+)",\s*"([^"]+)"/);
    return m ? [{ key: `${m[1]} ${m[2]}`, body: p }] : [];
  });
}
/** Lỗi của một route ghi tiền: thiếu lời gọi, hoặc gọi TRƯỚC `can(`. */
export function loiTuGhi(r: RouteText): string | null {
  if (!GHI.has(r.key.split(" ")[0]!)) return null;
  O_RE.lastIndex = 0;
  const can = O_RE.exec(r.body);
  if (!can) return null;
  if (r.key in NGOAI_LE) return null;
  const goi = r.body.search(/tuGhiDonMinhLap\(|dauTuGhi\(/);
  if (goi < 0) return `${r.key}: hỏi ô ${can[1]} nhưng không gọi tuGhiDonMinhLap()/dauTuGhi()`;
  if (goi < can.index) return `${r.key}: gọi hàm dấu TRƯỚC can() — phải hỏi quyền trước`;
  return null;
}

test("bộ cắt route và bộ bắt lỗi: thiếu gọi ⇒ lỗi; gọi sau can ⇒ qua; gọi trước can ⇒ lỗi; GET ⇒ bỏ qua; ngoại lệ có tên ⇒ qua", () => {
  const src = `
    route("POST", "/x", "office", async ({ staff }) => { if (!can(staff, "ledger.write")) return F(); return 1; }),
    route("POST", "/y", "office", async ({ staff }) => { if (!can(staff, "payment.refund")) return F(); const t = tuGhiDonMinhLap(a, staff.id); }),
    route("POST", "/z", "office", async ({ staff }) => { const t = await dauTuGhi(db, ids, staff.id); if (!can(staff, "order.complete")) return F(); }),
    route("GET", "/g", "office", async ({ staff }) => { if (!can(staff, "ledger.write")) return F(); }),
    route("POST", "/api/ledger/tu-ghi/:auditId/da-soat", "office", async ({ staff }) => { if (!can(staff, "ledger.write")) return F(); }),
  `;
  const rs = routesIn(src);
  assert.equal(rs.length, 5);
  assert.match(loiTuGhi(rs[0]!) ?? "", /không gọi/);
  assert.equal(loiTuGhi(rs[1]!), null);
  assert.match(loiTuGhi(rs[2]!) ?? "", /TRƯỚC can/);
  assert.equal(loiTuGhi(rs[3]!), null);
  assert.equal(loiTuGhi(rs[4]!), null);
});

test("mọi route ghi của billing hỏi ô O_GHI_TIEN đều gọi hàm dấu SAU can(); ngoại lệ có tên còn tồn tại", () => {
  const src = readFileSync(join(ROOT, "src/modules/billing/index.ts"), "utf8");
  const rs = routesIn(src);
  const loi = rs.map(loiTuGhi).filter((x): x is string => x !== null);
  assert.deepEqual(loi, [], loi.join("\n"));
  const keys = new Set(rs.map((r) => r.key));
  for (const k of Object.keys(NGOAI_LE)) assert.ok(keys.has(k), `ngoại lệ ${k} không còn — xoá dòng khỏi NGOAI_LE`);
  const coDau = rs.filter((r) => GHI.has(r.key.split(" ")[0]!) && /tuGhiDonMinhLap\(|dauTuGhi\(/.test(r.body));
  assert.ok(coDau.length >= 13, `kỳ vọng ≥ 13 route ghi tiền mang dấu, thấy ${coDau.length}`);
});

test("ngoài billing, không module nào có route ghi hỏi ô O_GHI_TIEN (bài này chỉ quét billing)", () => {
  const dir = join(ROOT, "src/modules");
  for (const mod of readdirSync(dir)) {
    if (mod === "billing") continue;
    let src: string;
    try { src = readFileSync(join(dir, mod, "index.ts"), "utf8"); } catch { continue; }
    for (const r of routesIn(src)) {
      if (!GHI.has(r.key.split(" ")[0]!)) continue;
      O_RE.lastIndex = 0;
      assert.equal(O_RE.exec(r.body), null, `${mod}: ${r.key} hỏi ô ghi tiền ngoài billing — mở rộng bài quét`);
    }
  }
});
