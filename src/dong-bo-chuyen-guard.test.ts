// HÀNG RÀO ĐIỂM GỌI MÁY ĐỒNG BỘ CHUYẾN (ADR-0104 Đ2.4 "bài tĩnh mới"; kế hoạch NT-6, S6) — khuôn src/bang-tin-guard.test.ts.
//
// Máy đồng bộ chuyến chạy TRONG lô của lệnh đơn (ctx.dongBoChuyen); quên gọi ở một route không làm hỏng phản hồi HTTP — chuyến chỉ lặng lẽ giữ lý do như trước
// Đ2. Bài này đọc TĨNH mã đã che chuỗi / chú thích (scripts/source-mask-lib.mjs):
//   (1) Mọi khai báo route ghi (POST|PUT|PATCH|DELETE) có đường dẫn `/api/orders*` ở orders / dispatch / billing phải nằm ở ĐÚNG MỘT trong hai danh sách CAN /
//       KHONG_CAN (kèm lý do). Route lạ (chưa xếp) → đỏ; mục trỏ route không tồn tại → đỏ.
//   (2) Route thuộc CAN có ĐÚNG MỘT lời gọi `dongBoChuyen(` trong thân; route thuộc KHONG_CAN không có lời gọi nào.
//   (3) Hai route của dispatch truyền máy xuống hàm của orders (`cancelOrderByHandler`, `editMoneyAsHandler` nhận `noiChuyen`) — hai hàm đó gọi `noiChuyen(`
//       đúng một lần.
// GIỚI HẠN (docs/SO-HANG-RAO.md): canh QUÊN, không canh CỐ Ý — chỉ nhìn văn bản, không chứng minh lời gọi chạy trên mọi nhánh; hành vi do
// src/modules/van-chuyen/dong-bo-chuyen-route.test.ts (NT-5) và bài ghép src/dong-bo-chuyen-ghep.test.ts canh.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const FILES = ["modules/orders/index.ts", "modules/dispatch/index.ts", "modules/billing/index.ts"];
const WRITE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CALL_RE = /\bdongBoChuyen\s*\(/g;

/** Tám điểm gọi của ADR-0104 Đ2.4 (kế hoạch mục 3) — lệnh đơn đổi đơn huỷ / chặng / người / số người. */
const CAN: Readonly<Record<string, string>> = {
  "POST /api/orders/:id/status": "huỷ đơn (nhánh huỷ; xác nhận không đụng chuyến)",
  "POST /api/orders/:id/handler-cancel": "HDV huỷ đơn",
  "POST /api/orders/:id/legs/:legId/close": "bỏ chặng",
  "POST /api/orders/:id/legs/:legId/replace": "thay chặng (C14) — đóng chặng cũ",
  "PUT /api/orders/:id/legs/:legId": "sửa chặng — số người chiều về",
  "POST /api/orders/:id/passengers": "thêm / sửa / huỷ khách",
  "POST /api/orders/:id/money-edit": "văn phòng sửa số khách (ADR-0063 D1)",
  "POST /api/orders/:id/handler-money-edit": "HDV sửa số khách",
};
/** Route ghi `/api/orders*` KHÔNG cần máy (ADR-0104 Đ2.4 "Không cần hook" + kế hoạch mục 3) — kèm lý do. */
const KHONG_CAN: Readonly<Record<string, string>> = {
  "POST /api/orders": "lập đơn — chưa có suất",
  "PUT /api/orders/:id": "chỉ đơn nháp — đơn nháp không có suất (lc09)",
  "PUT /api/orders/:id/trip": "phán quyết G8 — đổi ngày / giờ theo VK1-B (giữ + nút)",
  "POST /api/orders/:id/legs": "chặng mới chưa có suất",
  "POST /api/orders/:id/legs/:legId/short-notice": "dấu đặt gấp — không đổi người / chặng",
  "PUT /api/orders/:id/booker": "đổi người đặt — không đổi hành khách",
  "POST /api/orders/:id/cancel-reason": "phân loại lý do huỷ — đơn đã huỷ từ trước",
  "PUT /api/orders/:id/handler": "đổi người phụ trách",
  "POST /api/orders/:id/payments": "billing — tiền, không đổi người / chặng",
  "POST /api/orders/:id/coc/duyet": "billing — cọc",
  "POST /api/orders/:id/coc/duyet/:duyetId/huy": "billing — cọc",
  "POST /api/orders/:id/coc/chi": "billing — cọc",
  "POST /api/orders/:id/coc/chuyen": "billing — cọc",
  "POST /api/orders/:id/coc/hoan-ngoai": "billing — cọc",
  "POST /api/orders/:id/coc/hoan-ngoai/:ghiId/xac-nhan": "billing — cọc",
  "POST /api/orders/:id/delivered": "billing — Đã giao (không đổi người / chặng)",
  "POST /api/orders/:id/completed": "billing — Hoàn thành (không đổi người / chặng)",
  "POST /api/orders/:id/nhap-ke-toan": "billing — nhập kế toán",
  "POST /api/orders/:id/thuong-mai/:serviceId": "sổ đại lý đợt 1 — ghi mức hoa hồng tay trên một dòng dịch vụ (ghép main 1c471990 vào gói A+C): chỉ bản chụp thương mại, không đổi người / chặng",
};

/** Thân `{…}` (đã che chuỗi / chú thích) của từng route ghi `/api/orders*` trong một tệp. */
function thanRoute(text: string): { key: string; body: string }[] {
  const masked = maskSource(text);
  const out: { key: string; body: string }[] = [];
  for (const m of masked.matchAll(/\broute\(/g)) {
    const pos = m.index!;
    const h = /^route\(\s*"(GET|POST|PUT|PATCH|DELETE)",\s*"([^"]+)"/.exec(text.slice(pos, pos + 300));
    assert.ok(h, `route( ở vị trí ${pos} không khớp khuôn route("METHOD", "path", …) — không im lặng bỏ qua`);
    if (!WRITE.has(h![1]!) || !h![2]!.startsWith("/api/orders")) continue;
    const open = masked.indexOf("{", masked.indexOf("=>", pos + h![0].length));
    let depth = 0;
    let i = open;
    for (; i < masked.length; i++) {
      if (masked[i] === "{") depth++;
      else if (masked[i] === "}" && --depth === 0) break;
    }
    assert.equal(depth, 0, `${h![1]} ${h![2]}: ngoặc nhọn không cân`);
    out.push({ key: `${h![1]} ${h![2]}`, body: masked.slice(open, i + 1) });
  }
  return out;
}

/** Kết luận cho một tập route: lỗi (rỗng = đạt). Tách hàm để tự kiểm bằng mẫu. */
function viPham(routes: readonly { key: string; body: string }[], can: Readonly<Record<string, string>>, khongCan: Readonly<Record<string, string>>): string[] {
  const loi: string[] = [];
  const thay = new Set(routes.map((r) => r.key));
  for (const k of [...Object.keys(can), ...Object.keys(khongCan)]) if (!thay.has(k)) loi.push(`mục "${k}" trỏ route không tồn tại — gỡ mục`);
  for (const k of Object.keys(can)) if (k in khongCan) loi.push(`"${k}" nằm ở CẢ CAN lẫn KHONG_CAN`);
  for (const r of routes) {
    const n = [...r.body.matchAll(CALL_RE)].length;
    if (r.key in can) {
      if (n !== 1) loi.push(`${r.key} (CAN): ${n} lời gọi dongBoChuyen( — phải đúng 1`);
    } else if (r.key in khongCan) {
      if (n !== 0) loi.push(`${r.key} (KHONG_CAN): có ${n} lời gọi dongBoChuyen( — chuyển sang CAN (kèm ADR) hoặc gỡ lời gọi`);
    } else loi.push(`${r.key}: route ghi /api/orders* chưa xếp vào CAN / KHONG_CAN (ADR-0104 Đ2.4) — xếp có lý do`);
  }
  return loi;
}

const ROUTES = FILES.flatMap((f) => thanRoute(readFileSync(join(SRC, f), "utf8")));

test("NT-6 (ADR-0104 Đ2.4): mọi route ghi /api/orders* (orders, dispatch, billing) nằm ở đúng một danh sách; CAN gọi dongBoChuyen( đúng một lần, KHONG_CAN không gọi", () => {
  assert.deepEqual(viPham(ROUTES, CAN, KHONG_CAN), []);
  assert.equal(ROUTES.length, Object.keys(CAN).length + Object.keys(KHONG_CAN).length, "chống bài rỗng: số route bóc được = CAN + KHONG_CAN");
  assert.equal(Object.keys(CAN).length, 8);
  assert.equal(Object.keys(KHONG_CAN).filter((k) => KHONG_CAN[k]!.startsWith("billing")).length, 10, "mười route billing (kế hoạch mục 3)");
});

test("NT-6: hai hàm orders nhận máy từ dispatch (cancelOrderByHandler, editMoneyAsHandler) gọi noiChuyen( đúng một lần", () => {
  const masked = maskSource(readFileSync(join(SRC, "modules/orders/index.ts"), "utf8"));
  for (const ten of ["cancelOrderByHandler", "editMoneyAsHandler"]) {
    const dau = masked.indexOf(`export async function ${ten}(`);
    assert.ok(dau >= 0, `không thấy ${ten}`);
    const open = masked.indexOf("{", masked.indexOf(")", masked.indexOf("noiChuyen: NoiChuyen", dau)));
    let depth = 0;
    let i = open;
    for (; i < masked.length; i++) {
      if (masked[i] === "{") depth++;
      else if (masked[i] === "}" && --depth === 0) break;
    }
    assert.equal([...masked.slice(open, i + 1).matchAll(/\bnoiChuyen\s*\(/g)].length, 1, `${ten}: noiChuyen( đúng một lần`);
  }
});

test("NT-6 tự kiểm: route lạ, CAN thiếu lời gọi, CAN gọi hai lần, KHONG_CAN có lời gọi, mục trỏ route không tồn tại → đỏ; mẫu đúng → xanh", () => {
  const can = { "POST /a": "x" };
  const khong = { "POST /b": "y" };
  const dung = [{ key: "POST /a", body: "{ const d = await dongBoChuyen(x); return d; }" }, { key: "POST /b", body: "{ return 1; }" }];
  assert.deepEqual(viPham(dung, can, khong), []);
  assert.ok(viPham([...dung, { key: "POST /c", body: "{}" }], can, khong).some((l) => /chưa xếp/.test(l)), "route lạ");
  assert.ok(viPham([{ key: "POST /a", body: "{ return 1; }" }, dung[1]!], can, khong).some((l) => /phải đúng 1/.test(l)), "CAN thiếu lời gọi");
  assert.ok(viPham([{ key: "POST /a", body: "{ dongBoChuyen(x); dongBoChuyen(y); }" }, dung[1]!], can, khong).some((l) => /phải đúng 1/.test(l)), "CAN gọi hai lần");
  assert.ok(viPham([dung[0]!, { key: "POST /b", body: "{ dongBoChuyen(x); }" }], can, khong).some((l) => /KHONG_CAN/.test(l)), "KHONG_CAN có lời gọi");
  assert.ok(viPham([dung[0]!], can, khong).some((l) => /không tồn tại/.test(l)), "mục trỏ route không tồn tại");
});
