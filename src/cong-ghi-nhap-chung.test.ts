// ADR-0213 Đ3.4 «kiểm lại mỗi lần lưu» (Task 11/12 vòng sửa 1, ruling điều phối): mọi route GHI của đơn đi qua MỘT cổng `chanGhiNhap` (orders/xac-nhan-chung.ts) — nháp của người khác 404,
// nháp tổ chức của người đã thôi thay mặt 403. Bài quét: mỗi lời gọi THẲNG `chiNguoiLapGhiNhap(` / `ghiDuocNhap(` trong mã máy chủ (src/modules, src/index.ts) phải có tên trong danh sách miễn
// dưới, đúng số lần, kèm lý do. Route mới gọi thẳng (lọt cổng tư cách) ⇒ đỏ; miễn thừa / lệch số ⇒ đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const GOC = new URL("..", import.meta.url).pathname;
/** Bỏ chú thích (cùng cách bài xếp nhóm Đ4.4 — không nhập tệp bài kia để khỏi chạy lại bài của nó). */
const boChuThich = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[\s;,(){}])\/\/.*$/gm, "$1");
const tepTs = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? tepTs(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });

type Mien = { doan: string; so: number; lyDo: string };
export const MIEN: Record<string, Mien[]> = {
  "src/modules/orders/index.ts": [
    { doan: "const ghiDuocNhap = (meta: { status: OrderStatus; staffId: string }", so: 1, lyDo: "định nghĩa hàm (không phải lời gọi của route)" },
    { doan: "!ghiDuocNhap(meta, staff)", so: 2, lyDo: "đặt gấp (short-notice): ô `order.leg.short_notice` chỉ văn phòng — Đối tác không có, văn phòng không thay mặt tổ chức" },
  ],
  "src/modules/orders/xac-nhan-chung.ts": [
    { doan: "if (!chiNguoiLapGhiNhap({ status: meta.status, laNguoiLap: false, ngoaiLeToChuc })) return { chan: khongThay() };", so: 1, lyDo: "CHÍNH cổng chung `quyenGhiNhap` (Task 16): ngoại lệ có tên ADR-0213 Đ8 đọc luật ở xem-don-nhap.ts — không phải route" },
  ],
  "src/modules/billing/index.ts": [
    { doan: "if (!chiNguoiLapGhiNhap({ status: info.status, laNguoiLap: info.ownerId === staff.id })) return NOT_FOUND();", so: 1, lyDo: "ghi khoản thu: nháp ⇒ 409 DRAFT_NO_PAYMENT ngay sau — tư cách không đổi kết quả" },
    { doan: "if (!chiNguoiLapGhiNhap({ status: don.status, laNguoiLap: don.ownerId === staff.id })) return NOT_FOUND();", so: 1, lyDo: "khoản nộp đại lý: chỉ đơn có phiếu (đã xác nhận) — nháp không có phiếu" },
  ],
  "src/modules/dispatch/index.ts": [
    { doan: "chiNguoiLapGhiNhap({ status: chu[i]!.status, laNguoiLap: chu[i]!.staffId === staff.id })", so: 1, lyDo: "GET danh sách người phụ trách — đọc, không ghi" },
    { doan: "if (!chiNguoiLapGhiNhap({ status: order.status, laNguoiLap: order.staffId === staff.id })) return NOT_FOUND();", so: 6, lyDo: "đặt/huỷ/từ chối người phụ trách, sửa tiền HDV, hai GET hạn từ chối: ô dispatch.* của Đối tác = none (chỉ văn phòng / HDV); dispatch không đọc tư cách đơn" },
  ],
  "src/modules/dispatch/ban-hang-route.ts": [
    { doan: "if (!choXet && !chiNguoiLapGhiNhap({ status: o.status, laNguoiLap: o.staffId === staff.id })) continue;", so: 1, lyDo: "GET Bán hàng phụ trách — đọc" },
    { doan: "if (!dangCho && !chiNguoiLapGhiNhap({ status: order.status, laNguoiLap: order.staffId === staff.id })) return NOT_FOUND();", so: 1, lyDo: "nhận Bán hàng phụ trách: ô dispatch.sales.claim — Bán hàng, Quản trị, Toàn quyền; tài khoản Đối tác bị chặn" },
    { doan: "if (order.status === \"draft\" && !chiNguoiLapGhiNhap({ status: order.status, laNguoiLap: order.staffId === staff.id })", so: 1, lyDo: "đặt Bán hàng phụ trách: ô dispatch.sales.assign — Quản trị, Toàn quyền" },
  ],
};

/** Dòng gọi thẳng (đã bỏ chú thích, bỏ dòng import). */
export function goiThang(nguon: string): string[] {
  return boChuThich(nguon).split("\n").filter((d) => /\b(?:chiNguoiLapGhiNhap|ghiDuocNhap)\(/.test(d) && !/^\s*import\b/.test(d)).map((d) => d.trim());
}
export function loiMien(tep: string, dong: readonly string[], mien: readonly Mien[] | undefined): string[] {
  const loi: string[] = [];
  const m = mien ?? [];
  for (const d of dong) if (!m.some((x) => d.includes(x.doan))) loi.push(`${tep}: gọi thẳng cổng nháp thay vì chanGhiNhap: ${d.slice(0, 160)}`);
  for (const x of m) {
    const n = dong.filter((d) => d.includes(x.doan)).length;
    if (n !== x.so) loi.push(`${tep}: miễn «${x.doan}» khớp ${n}, bảng ghi ${x.so} (${x.lyDo})`);
  }
  return loi;
}

test("Đ3.4: route ghi đơn không gọi thẳng chiNguoiLapGhiNhap / ghiDuocNhap ngoài danh sách miễn có tên và số lần", () => {
  const tep = [join(GOC, "src/index.ts"), ...tepTs(join(GOC, "src/modules"))];
  const loi: string[] = [];
  const thay = new Set<string>();
  for (const p of tep) {
    const ten = relative(GOC, p);
    const d = goiThang(readFileSync(p, "utf8"));
    if (d.length === 0 && !MIEN[ten]) continue;
    thay.add(ten);
    loi.push(...loiMien(ten, d, MIEN[ten]));
  }
  for (const t of Object.keys(MIEN)) if (!thay.has(t)) loi.push(`${t}: miễn không còn khớp tệp nào — xoá dòng`);
  assert.deepEqual(loi, []);
});

test("Đ3.4: bài quét bắt một route mới gọi thẳng (bài dương)", () => {
  const t = "src/modules/orders/xac-nhan-route.ts";
  assert.equal(loiMien(t, goiThang("if (!chiNguoiLapGhiNhap({ status: meta.status, laNguoiLap: meta.staffId === staff.id })) return NOT_FOUND_DON();"), MIEN[t]).length, 1);
  const o = "src/modules/orders/index.ts";
  const goc = goiThang(readFileSync(join(GOC, o), "utf8"));
  assert.equal(loiMien(o, [...goc, "if (!ghiDuocNhap(meta, staff)) return NOT_FOUND();"], MIEN[o]).length, 1, "thêm một lời gọi cùng mẩu ⇒ lệch số");
});
