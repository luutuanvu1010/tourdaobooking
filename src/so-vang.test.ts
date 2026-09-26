// Sổ vàng (Hiến chương kiến trúc lõi điều 5.17, chủ dự án duyệt 2026-09-26): kiểm NHẤT QUÁN NỘI TẠI của từng ca tiền mẫu trong `golden/*.json` —
// mỗi ca phải tự cân đến từng đồng trước khi dùng để chấm mã thật. Test này bắt CA MẪU VIẾT SAI, không kiểm mã tính tiền (sổ công nợ chưa có —
// khi thi công ADR-0026, thêm lớp chạy chính các ca này qua hàm sinh dòng sổ thật, chỉ tính ca "da_xac_nhan"). Ca chỉ được đổi sang "da_xac_nhan"
// khi chủ dự án hoặc Kế toán đã xem con số (Hiến pháp N8: AI không tự xác nhận) — test đòi ghi người + ngày.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isISODate } from "./shared/vn-date.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FILES = ["golden/hoan-tat-cong-no.json"];
const VAI = new Set(["hdv_noi_bo", "nguoi_huong", "nha_cung_cap"]);
const TRANG_THAI = new Set(["cho_xac_nhan", "da_xac_nhan"]);

type Ben = { ben: string; vai: string; da_thu: number; duoc_huong: number };
type Ca = {
  ma: string;
  xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null };
  dau_vao: { gia_ban: number; gia_von: number; hoa_hong: number; cong_ty_thu: number; cac_ben: Ben[] };
  dap_an: { no_tour_dao: Record<string, number>; tour_dao_giu: number };
};

const dong = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function loadCases(file: string): Ca[] {
  const raw = JSON.parse(readFileSync(join(ROOT, file), "utf8")) as { cac_ca?: unknown };
  assert.ok(Array.isArray(raw.cac_ca) && raw.cac_ca.length > 0, `${file} phải có mảng "cac_ca" không rỗng`);
  return raw.cac_ca as Ca[];
}

for (const file of FILES) {
  test(`sổ vàng ${file}: mỗi ca đủ trường, tiền là số nguyên đồng không âm, mã không trùng, xác nhận có người + ngày`, () => {
    const seen = new Set<string>();
    for (const c of loadCases(file)) {
      assert.ok(typeof c.ma === "string" && c.ma !== "" && !seen.has(c.ma), `mã ca trống hoặc trùng: ${String(c.ma)}`);
      seen.add(c.ma);
      assert.ok(TRANG_THAI.has(c.xac_nhan?.trang_thai), `${c.ma}: xac_nhan.trang_thai phải là cho_xac_nhan | da_xac_nhan`);
      if (c.xac_nhan.trang_thai === "da_xac_nhan") {
        assert.ok(typeof c.xac_nhan.nguoi === "string" && c.xac_nhan.nguoi.trim() !== "", `${c.ma}: ca đã xác nhận phải ghi người xác nhận (chủ dự án / Kế toán)`);
        assert.ok(typeof c.xac_nhan.ngay === "string" && isISODate(c.xac_nhan.ngay), `${c.ma}: ca đã xác nhận phải ghi ngày YYYY-MM-DD`);
      }
      const v = c.dau_vao;
      for (const k of ["gia_ban", "gia_von", "hoa_hong", "cong_ty_thu"] as const) assert.ok(dong(v[k]), `${c.ma}: dau_vao.${k} phải là số nguyên đồng ≥ 0`);
      assert.ok(Array.isArray(v.cac_ben) && v.cac_ben.length > 0, `${c.ma}: cần ít nhất một bên`);
      for (const b of v.cac_ben) {
        assert.ok(VAI.has(b.vai), `${c.ma}/${b.ben}: vai "${b.vai}" không hợp lệ`);
        assert.ok(dong(b.da_thu) && dong(b.duoc_huong), `${c.ma}/${b.ben}: da_thu, duoc_huong phải là số nguyên đồng ≥ 0`);
        if (b.vai === "hdv_noi_bo") assert.equal(b.duoc_huong, 0, `${c.ma}/${b.ben}: HDV nội bộ không hưởng hoa hồng/giá vốn`);
      }
      assert.ok(Number.isInteger(c.dap_an?.tour_dao_giu), `${c.ma}: dap_an.tour_dao_giu phải là số nguyên đồng`);
    }
  });

  test(`sổ vàng ${file}: mỗi ca tự cân đến từng đồng`, () => {
    for (const c of loadCases(file)) {
      const v = c.dau_vao;
      const ben = v.cac_ben;
      assert.equal(v.cong_ty_thu + sum(ben.map((b) => b.da_thu)), v.gia_ban, `${c.ma}: tổng tiền đã thu (công ty + các bên) phải bằng giá bán`);
      assert.equal(sum(ben.filter((b) => b.vai === "nguoi_huong").map((b) => b.duoc_huong)), v.hoa_hong, `${c.ma}: tổng phần người hưởng được hưởng phải bằng hoa_hong`);
      assert.equal(sum(ben.filter((b) => b.vai === "nha_cung_cap").map((b) => b.duoc_huong)), v.gia_von, `${c.ma}: tổng phần nhà cung cấp được hưởng phải bằng gia_von`);
      assert.deepEqual(Object.keys(c.dap_an.no_tour_dao).sort(), ben.map((b) => b.ben).sort(), `${c.ma}: dap_an.no_tour_dao phải có đúng các bên của đầu vào`);
      for (const b of ben) {
        assert.equal(c.dap_an.no_tour_dao[b.ben], b.da_thu - b.duoc_huong, `${c.ma}/${b.ben}: nợ Tour Đảo phải = đã thu − được hưởng (${b.da_thu} − ${b.duoc_huong})`);
      }
      const giu = v.cong_ty_thu + sum(Object.values(c.dap_an.no_tour_dao));
      assert.equal(c.dap_an.tour_dao_giu, giu, `${c.ma}: phần Tour Đảo giữ phải = công ty tự thu + tổng nợ các bên (${giu})`);
      assert.equal(c.dap_an.tour_dao_giu, v.gia_ban - v.gia_von - v.hoa_hong, `${c.ma}: phần Tour Đảo giữ phải = giá bán − giá vốn − hoa hồng`);
    }
  });
}
