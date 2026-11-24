// Lệnh đo khung gốc trong lượt kiểm GitHub (ADR-0222 Đ7b; scripts/giao-dien/do-khung-ci.mjs). Phần thuần: bảng màn BANG_CI phải phủ MỌI trang đã khai
// `data-khung-goc` (thiếu dòng thì lượt kiểm báo ĐO THIẾU — bài này báo sớm ngay ở `npm test` trên máy), và bảng sinh ra bỏ dòng khi gieo dữ liệu hỏng
// (để lệnh đo báo đo thiếu, không bao giờ đạt giả). Phép đo trên trang thật chỉ chạy ở phần riêng của lượt kiểm (scripts/kiem-phan.mjs rieng).
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { docThanTrang, duongCuaTrang } from "./shared/khung-goc.ts";

type Dong = { khoa: string; trang: string; bo: string; ma?: string; sauGieo?: boolean };
const ci = (await import(new URL("../scripts/giao-dien/do-khung-ci.mjs", import.meta.url).href)) as {
  BANG_CI: Dong[];
  dungBangMan: (bang: Dong[], ma: Record<string, string | null>) => { bangMan: { khoa: string; tk: string; trang: string }[]; bo: string[] };
  chiaLuot: (bangMan: { khoa: string; tk: string; trang: string }[], bang?: Dong[]) => { sauGieo: boolean; bang: { khoa: string; tk: string; trang: string }[] }[];
  gopLuot: (luot: { ketQua: { trang: string; loi: string[] }[] | null }[], daChuyen: string[]) => { maThoat: number; soO: number; khongDat: number; doThieu: string[]; chayDuoc: boolean };
};
const { BO_QUYEN } = (await import(new URL("../scripts/giao-dien/moi-truong.mjs", import.meta.url).href)) as { BO_QUYEN: Record<string, string[]> };

test("BANG_CI phủ đúng mọi trang đã khai khuôn khung gốc (thêm màn mới sang khung thì thêm dòng ở scripts/giao-dien/do-khung-ci.mjs)", () => {
  const daChuyen = readdirSync("public").filter((t) => t.endsWith(".html")).filter((t) => docThanTrang(readFileSync(`public/${t}`, "utf8")).khuon !== null).map(duongCuaTrang).sort();
  const coDong = [...new Set(ci.BANG_CI.map((d) => d.trang))].sort();
  assert.deepEqual(coDong.filter((t) => !daChuyen.includes(t)), [], "BANG_CI có trang chưa khai khuôn (lệnh đo sẽ dừng)");
  assert.deepEqual(daChuyen.filter((t) => !coDong.includes(t)), [], "trang đã khai khuôn mà BANG_CI chưa có dòng: lượt kiểm sẽ ĐỎ vì đo thiếu");
  for (const d of ci.BANG_CI) {
    assert.ok(BO_QUYEN[d.bo], `${d.khoa}: bộ quyền ${d.bo} không có trong moi-truong.mjs`);
    assert.ok(d.ma === undefined || ["don", "nhap", "xe", "chuyen"].includes(d.ma), `${d.khoa}: loại mã ${d.ma} chưa được gieo`);
  }
  assert.equal(new Set(ci.BANG_CI.map((d) => d.khoa)).size, ci.BANG_CI.length, "khoá màn trùng");
});

test("dungBangMan: gắn mã bản ghi vừa gieo; thiếu mã thì BỎ dòng (lệnh đo báo đo thiếu), không gắn id rỗng", () => {
  const bang: Dong[] = [{ khoa: "a", trang: "/orders", bo: "SALES" }, { khoa: "b", trang: "/order", bo: "SALES", ma: "don" }, { khoa: "c", trang: "/xe-sua", bo: "ADMIN", ma: "xe" }];
  const r = ci.dungBangMan(bang, { don: "d 1", xe: null });
  assert.deepEqual(r.bangMan, [{ khoa: "a", tk: "SALES", trang: "/orders" }, { khoa: "b", tk: "SALES", trang: "/order?id=d%201" }]);
  assert.equal(r.bo.length, 1);
  assert.match(r.bo[0]!, /xe-sua.*xe/);
});

test("chiaLuot: màn `sauGieo` (Đơn chờ xác nhận) đo ở lượt hai, sau khi gieo dữ liệu riêng; mọi màn khác ở lượt một (khung gốc đợt A)", () => {
  const bangMan = [{ khoa: "don-hang", tk: "SALES", trang: "/orders" }, { khoa: "cho-xac-nhan", tk: "ADMIN", trang: "/cho-xac-nhan" }];
  const l = ci.chiaLuot(bangMan, [{ khoa: "don-hang", trang: "/orders", bo: "SALES" }, { khoa: "cho-xac-nhan", trang: "/cho-xac-nhan", bo: "ADMIN", sauGieo: true }]);
  assert.deepEqual(l.map((x) => [x.sauGieo, x.bang.map((m) => m.khoa)]), [[false, ["don-hang"]], [true, ["cho-xac-nhan"]]]);
  assert.deepEqual(ci.BANG_CI.filter((d) => d.sauGieo).map((d) => d.khoa), ["cho-xac-nhan"], "chỉ màn cần đơn chờ xác nhận đo sau khi gieo");
});

test("gopLuot: hai lượt gộp phải phủ mọi trang đã khai khuôn; lượt không chạy được hay ô không đạt thì KHÔNG đạt", () => {
  const o = (trang: string, loi: string[] = []) => ({ trang, loi });
  const daChuyen = ["/orders", "/cho-xac-nhan"];
  assert.equal(ci.gopLuot([{ ketQua: [o("/orders")] }, { ketQua: [o("/cho-xac-nhan")] }], daChuyen).maThoat, 0, "đủ hai lượt, mọi ô đạt");
  assert.deepEqual(ci.gopLuot([{ ketQua: [o("/orders")] }], daChuyen).doThieu, ["/cho-xac-nhan"], "thiếu lượt hai ⇒ đo thiếu");
  assert.equal(ci.gopLuot([{ ketQua: [o("/orders")] }], daChuyen).maThoat, 2);
  assert.equal(ci.gopLuot([{ ketQua: [o("/orders")] }, { ketQua: null }], daChuyen).maThoat, 2, "lượt không có tệp số đo ⇒ không chạy được");
  assert.equal(ci.gopLuot([{ ketQua: [o("/orders", ["tràn ngang"])] }, { ketQua: [o("/cho-xac-nhan")] }], daChuyen).maThoat, 1, "một ô không đạt ⇒ 1");
  assert.equal(ci.gopLuot([], daChuyen).maThoat, 2, "không lượt nào ⇒ không chạy được");
});
