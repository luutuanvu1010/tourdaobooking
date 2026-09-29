// BỘ CA MẪU ĐIỀU PHỐI (ADR-0049 lượt 1; kế hoạch Task A8, TC-19; khuôn sổ vàng — Hiến chương 5.17). ĐÁP ÁN CHỜ CHỦ XÁC NHẬN: mọi tệp ở golden/dieu-phoi/
// mang `xac_nhan.trang_thai = "cho_xac_nhan"` cho tới khi chủ dự án xem từng bước (AI không tự xác nhận — Hiến pháp N8). Chủ xác nhận trước lát 2.1
// (lượt 2), KHÔNG chặn lượt 1. Bài này chạy MỌI bước qua luật thuần THẬT (src/shared/dieu-phoi-kiem.ts, dieu-phoi-trang-thai.ts) và so đúng quyết định +
// đúng danh sách mã luật. Không kiểm tiền (khác src/so-vang.test.ts). Giờ trong tệp là 'YYYY-MM-DD HH:MM' GIỜ VIỆT NAM ở mọi khoá tận cùng 'Ms'.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { kiemKetThuc, kiemTaoSuaChuyen, kiemXep, kiemXuatBen } from "./shared/dieu-phoi-kiem.ts";
import { trangThaiChang } from "./shared/dieu-phoi-trang-thai.ts";
import { isISODate, vnLocalToMs } from "./shared/vn-date.ts";

const DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "golden", "dieu-phoi");
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const HAM = new Set(["kiemTaoSuaChuyen", "kiemXep", "kiemXuatBen", "kiemKetThuc", "trangThaiChang"]);

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
interface Buoc { ma: string; mo_ta: string; ham: string; dau_vao: Record<string, Json>; dap_an: Record<string, Json> }
interface Tep { mo_ta: string; xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null }; nen: Record<string, Json>; cac_buoc: Buoc[] }

/** Giải '$nen.<đường>' và đổi giờ VN 'YYYY-MM-DD HH:MM' ở khoá tận cùng 'Ms' thành mili-giây. */
function giai(v: Json, nen: Record<string, Json>, khoa = ""): unknown {
  if (typeof v === "string" && v.startsWith("$nen.")) {
    let cur: Json = nen as Json;
    for (const p of v.slice(5).split(".")) {
      assert.ok(cur !== null && typeof cur === "object" && !Array.isArray(cur) && p in cur, `không tìm thấy ${v}`);
      cur = (cur as Record<string, Json>)[p]!;
    }
    return giai(cur, nen, khoa);
  }
  if (typeof v === "string" && khoa.endsWith("Ms")) {
    const [d, t] = v.split(" ");
    const ms = vnLocalToMs(d ?? "", t ?? "");
    assert.ok(ms !== null, `giờ sai khuôn ở ${khoa}: ${v}`);
    return ms;
  }
  if (Array.isArray(v)) return v.map((x) => giai(x, nen));
  if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, giai(x, nen, k)]));
  return v;
}

/** Chạy một bước qua đúng hàm thuần, trả kết quả cùng dạng với `dap_an`. */
function chay(b: Buoc, nen: Record<string, Json>): Record<string, unknown> {
  const v = giai(b.dau_vao, nen) as any;
  if (b.ham === "kiemTaoSuaChuyen" || b.ham === "kiemXep") {
    const r = b.ham === "kiemXep" ? kiemXep(v) : kiemTaoSuaChuyen(v);
    const quyetDinh = r.chan.length > 0 ? "CHAN" : r.canPhaLe.length > 0 ? "CAN_PHA_LE" : "CHO_QUA";
    return { quyet_dinh: quyetDinh, ma_luat: (quyetDinh === "CHAN" ? r.chan : r.canPhaLe).map((x) => x.ma) };
  }
  if (b.ham === "kiemXuatBen") {
    const r = kiemXuatBen(v);
    const out: Record<string, unknown> = { quyet_dinh: r.dat ? "DAT" : "GIU", ma_luat: r.lyDo.map((x) => x.ma) };
    if ("ai_xu_ly" in b.dap_an) out.ai_xu_ly = r.lyDo.map((x) => x.aiXuLy);
    out.so_gan_ten = r.ganTen.length;
    return out;
  }
  if (b.ham === "kiemKetThuc") {
    const r = kiemKetThuc(v);
    return r.duoc ? { duoc: true } : { duoc: false, goi_y: r.goiY, con_suat: r.conSuat, con_diem: r.conDiem };
  }
  const r = trangThaiChang(v.chang, v.suat, v.chuyen, v.chinhSach, v.bayGioMs);
  return { trang_thai: r.trangThai, nhan: r.nhan, so_da_don: r.soDaDon };
}

test("có ít nhất một tệp ca mẫu điều phối", () => {
  assert.ok(FILES.length >= 1, `golden/dieu-phoi/ phải có tệp .json, thấy ${JSON.stringify(FILES)}`);
});

for (const f of FILES) {
  const tep = JSON.parse(readFileSync(join(DIR, f), "utf8")) as Tep;

  test(`ca mẫu ${f}: khuôn — xác nhận "cho_xac_nhan" (hoặc đã xác nhận có người + ngày), mã bước không trùng, hàm thuộc tập đã biết, không dãy ≥ 8 chữ số`, () => {
    assert.ok(tep.xac_nhan.trang_thai === "cho_xac_nhan" || tep.xac_nhan.trang_thai === "da_xac_nhan");
    if (tep.xac_nhan.trang_thai === "da_xac_nhan") {
      assert.ok(typeof tep.xac_nhan.nguoi === "string" && tep.xac_nhan.nguoi.trim() !== "", "đã xác nhận phải ghi người (chủ dự án)");
      assert.ok(typeof tep.xac_nhan.ngay === "string" && isISODate(tep.xac_nhan.ngay), "đã xác nhận phải ghi ngày");
    }
    const seen = new Set<string>();
    for (const b of tep.cac_buoc) {
      assert.ok(b.ma && !seen.has(b.ma), `mã bước trống hoặc trùng: ${b.ma}`);
      seen.add(b.ma);
      assert.ok(HAM.has(b.ham), `${b.ma}: hàm lạ ${b.ham}`);
      assert.ok(b.mo_ta.trim().length > 0, `${b.ma}: thiếu mô tả`);
    }
    assert.ok(tep.cac_buoc.length >= 10, "bộ ca lượt 1 phải đủ các bước: tạo, xếp, giữ, nhập tên, xuất bến, mốc, vắng, đón muộn, gián đoạn, cứu hộ");
    assert.doesNotMatch(readFileSync(join(DIR, f), "utf8"), /\d{8,}/, "không số điện thoại / số giấy tờ trong ca mẫu");
  });

  for (const b of tep.cac_buoc) {
    test(`ca mẫu ${f} / ${b.ma}: ${b.mo_ta}`, () => {
      assert.deepEqual(chay(b, tep.nen), b.dap_an);
    });
  }
}
