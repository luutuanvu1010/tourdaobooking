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
import { kiemGioXayRa } from "./shared/gio-xay-ra.ts";
import { isISODate, vnLocalToMs } from "./shared/vn-date.ts";

const DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "golden", "dieu-phoi");
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const HAM = new Set(["kiemTaoSuaChuyen", "kiemXep", "kiemXuatBen", "kiemKetThuc", "trangThaiChang", "kiemGioXayRa"]); // kiemGioXayRa: ADR-0050 VK1-A (A8b)

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
  if (b.ham === "kiemGioXayRa") {
    const r = kiemGioXayRa(v);
    return r.ok ? { ok: true } : { ok: false, ma_luat: r.chan };
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

  // ADR-0050 (A4b): trường BẮT BUỘC mới của kiểu vào — tệp JSON không qua typecheck, thiếu khoá thì "undefined === undefined" có thể cho qua im lặng.
  test(`ca mẫu ${f}: đầu vào đủ trường mới của ADR-0050 — chặng có khoaNoiDon / khoaNoiTra, điểm có placeKey / gioXeToiMs, bước xuất bến có diem + xuatBenMs`, () => {
    let nChang = 0;
    let nDiem = 0;
    (function walk(o: unknown): void {
      if (Array.isArray(o)) return o.forEach(walk);
      if (o === null || typeof o !== "object") return;
      const r = o as Record<string, unknown>;
      if ("legId" in r && "orderCode" in r) {
        nChang++;
        assert.equal(typeof r.khoaNoiDon, "string", `chặng ${String(r.legId)}: thiếu khoaNoiDon`);
        assert.ok("khoaNoiTra" in r && (r.khoaNoiTra === null || typeof r.khoaNoiTra === "string"), `chặng ${String(r.legId)}: thiếu khoaNoiTra`);
      }
      if ("seq" in r && "loai" in r && "tripId" in r) {
        nDiem++;
        assert.equal(typeof r.placeKey, "string", `điểm ${String(r.id)}: thiếu placeKey`);
        assert.ok("gioXeToiMs" in r, `điểm ${String(r.id)}: thiếu gioXeToiMs`);
      }
      Object.values(r).forEach(walk);
    })(tep);
    assert.ok(nChang > 0 && nDiem > 0, "bài không rỗng");
    for (const b of tep.cac_buoc.filter((x) => x.ham === "kiemXuatBen")) {
      assert.ok("diem" in b.dau_vao && "xuatBenMs" in b.dau_vao, `${b.ma}: bước xuất bến thiếu diem / xuatBenMs`);
    }
  });

  // ADR-0056 VK3-A (Đợt 7): trường BẮT BUỘC của cam kết — `undefined` không được lặng lẽ hiểu là "không cam kết" (tệp JSON không qua typecheck).
  test(`ca mẫu ${f}: đầu vào đủ trường cam kết của ADR-0056 — chặng có xeRieng / choToiThieu, chuyến xuất bến có camKetPhaLeKhoa, bước xếp có changTrenChuyen / xeId / camKetPhaLeKhoa`, () => {
    let nChang = 0;
    (function walk(o: unknown): void {
      if (Array.isArray(o)) return o.forEach(walk);
      if (o === null || typeof o !== "object") return;
      const r = o as Record<string, unknown>;
      if ("legId" in r && "orderCode" in r) {
        nChang++;
        assert.equal(typeof r.xeRieng, "boolean", `chặng ${String(r.legId)}: thiếu xeRieng`);
        assert.ok("choToiThieu" in r && (r.choToiThieu === null || typeof r.choToiThieu === "number"), `chặng ${String(r.legId)}: thiếu choToiThieu`);
      }
      Object.values(r).forEach(walk);
    })(tep);
    assert.ok(nChang > 0, "bài không rỗng");
    for (const b of tep.cac_buoc.filter((x) => x.ham === "kiemXuatBen")) {
      const c = giai(b.dau_vao.chuyen!, tep.nen) as Record<string, unknown>;
      assert.ok("camKetPhaLeKhoa" in c, `${b.ma}: chuyến thiếu camKetPhaLeKhoa`);
      // ADR-0057 C5 (Đợt 4): hai cờ xe thuê / nguồn giá cũng BẮT BUỘC — thiếu thì `thue` undefined lặng lẽ thành "không thuê".
      assert.ok(typeof c.thue === "boolean" && typeof c.coNguonGia === "boolean", `${b.ma}: chuyến thiếu thue / coNguonGia`);
    }
    for (const b of tep.cac_buoc.filter((x) => x.ham === "kiemXep")) {
      assert.ok(Array.isArray(b.dau_vao.changTrenChuyen) && typeof b.dau_vao.xeId === "string" && "camKetPhaLeKhoa" in b.dau_vao, `${b.ma}: bước xếp thiếu trường cam kết`);
    }
  });

  for (const b of tep.cac_buoc) {
    test(`ca mẫu ${f} / ${b.ma}: ${b.mo_ta}`, () => {
      assert.deepEqual(chay(b, tep.nen), b.dap_an);
    });
  }
}
