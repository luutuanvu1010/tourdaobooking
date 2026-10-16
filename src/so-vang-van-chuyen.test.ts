// SỔ VÀNG VẬN CHUYỂN, 30 CA (chủ duyệt từng ca ngay trong chat 2026-10-16; hồ sơ docs/superpowers/specs/2026-10-16-so-vang-van-chuyen-ket-qua-duyet.md).
// KHÔNG phải luật tiền (khác src/so-vang.test.ts). Tệp ca: golden/van-chuyen/dieu-phoi-30-ca.json. Mốc ra lệnh ghi 30 phút theo ý chủ.
// Hai lớp, cùng khuôn sổ vàng (Hiến chương 5.17):
//   1. Khuôn: đủ 30 ca VC-01…VC-30, mã không trùng, mỗi ca có bối cảnh / số liệu / câu hỏi / đáp án, ca đã xác nhận có người + ngày, không dãy ≥ 8 chữ số.
//   2. Chạy trên luật thuần THẬT: `kiem_may` của ca đã xác nhận đi qua đúng hàm của Nền tảng (dieu-phoi-kiem.ts, moc-toi-thieu.ts, gio-lai.ts, permissions.ts).
//      Ca `da_xac_nhan_ma_chua_theo` (chủ muốn khác luật đang chạy) chạy dạng `todo` có tên — không làm npm test đỏ, nhưng KHÔNG im lặng.
//      Ca chưa có hàm thuần để chạy (route / lô / tin / e2e) cũng `todo` có tên, trỏ về kịch bản e2e tương ứng (và bài canh: tệp e2e phải tồn tại).
// Mẫu đầu vào: các bước của golden/dieu-phoi/xe-a-b-luot-1.json (`mau`) + `ghi_de` (đường dẫn chấm → giá trị; giá trị có khoá "$nen" = lấy từ dữ liệu nền rồi vá).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { kiemTaoSuaChuyen, kiemXep, kiemXuatBen } from "./shared/dieu-phoi-kiem.ts";
import { chuyenDuoiMoc, gioXetSuaChuyen, lopVuotMoc, lopVuotNghiCamKet } from "./shared/moc-toi-thieu.ts";
import { canhBaoGioLai } from "./shared/gio-lai.ts";
import { can } from "./shared/permissions.ts";
import { isISODate, vnLocalToMs } from "./shared/vn-date.ts";

const GOC = join(fileURLToPath(new URL(".", import.meta.url)), "..");
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
interface Kiem { loai: string; [k: string]: any }
interface Ca {
  ma: string; nhom: string; ten: string; boi_canh: string; so_lieu: string[]; cau_hoi: string; dap_an: string[]; co_so: string; trang_thai: string;
  kiem_may?: Kiem[]; kich_ban_e2e?: string; bai_chay_that?: string; ghi_chu_bai?: string; adr?: string; ghi_chu_chu?: string;
}
interface Tep { xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null }; thong_so: Record<string, number>; cac_ca: Ca[] }
interface BuocMau { ma: string; ham: string; dau_vao: Record<string, Json> }

const tep = JSON.parse(readFileSync(join(GOC, "golden", "van-chuyen", "dieu-phoi-30-ca.json"), "utf8")) as Tep;
const luot1 = JSON.parse(readFileSync(join(GOC, "golden", "dieu-phoi", "xe-a-b-luot-1.json"), "utf8")) as { nen: Record<string, Json>; cac_buoc: BuocMau[] };

function tuNen(duong: string): Json {
  let cur: Json = luot1.nen as Json;
  for (const p of duong.split(".")) {
    assert.ok(cur !== null && typeof cur === "object" && !Array.isArray(cur) && p in cur, `không tìm thấy nền ${duong}`);
    cur = (cur as Record<string, Json>)[p]!;
  }
  return cur;
}
/** Giải '$nen.<đường>' và đổi giờ VN 'YYYY-MM-DD HH:MM' ở khoá tận cùng 'Ms' (cùng quy ước bài ca mẫu lượt 1). */
function giai(v: any, khoa = ""): any {
  if (typeof v === "string" && v.startsWith("$nen.")) return giai(tuNen(v.slice(5)), khoa);
  if (typeof v === "string" && khoa.endsWith("Ms")) {
    const [d, t] = v.split(" ");
    const ms = vnLocalToMs(d ?? "", t ?? "");
    assert.ok(ms !== null, `giờ sai khuôn ở ${khoa}: ${v}`);
    return ms;
  }
  if (Array.isArray(v)) return v.map((x) => giai(x));
  if (v !== null && typeof v === "object") {
    if ("$nen" in v) {
      const { $nen, ...vai } = v as Record<string, unknown>;
      return giai({ ...(tuNen(String($nen)) as Record<string, unknown>), ...vai });
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, giai(x, k)]));
  }
  return v;
}
function datDuong(goc: any, duong: string, gia: unknown): void {
  const kh = duong.split(".");
  let cur = goc;
  for (const k of kh.slice(0, -1)) cur = cur[Array.isArray(cur) ? Number(k) : k];
  const cuoi = kh[kh.length - 1]!;
  cur[Array.isArray(cur) ? Number(cuoi) : cuoi] = gia;
}
const ms = (s: string): number => {
  const [d, t] = s.split(" ");
  const v = vnLocalToMs(d ?? "", t ?? "");
  assert.ok(v !== null, `giờ sai khuôn: ${s}`);
  return v;
};

function chayMau(k: Kiem): Record<string, unknown> {
  const buoc = luot1.cac_buoc.find((b) => b.ma.startsWith(`${k.mau}-`));
  assert.ok(buoc, `không có bước mẫu ${k.mau} ở golden/dieu-phoi/xe-a-b-luot-1.json`);
  const dauVao = structuredClone(buoc.dau_vao) as Record<string, any>;
  for (const [duong, gia] of k.ghi_de as [string, unknown][]) datDuong(dauVao, duong, gia);
  const v = giai(dauVao);
  if (buoc.ham === "kiemXep" || buoc.ham === "kiemTaoSuaChuyen") {
    const r = buoc.ham === "kiemXep" ? kiemXep(v) : kiemTaoSuaChuyen(v);
    const qd = r.chan.length > 0 ? "CHAN" : r.canPhaLe.length > 0 ? "CAN_PHA_LE" : "CHO_QUA";
    return { quyet_dinh: qd, ma_luat: (qd === "CHAN" ? r.chan : r.canPhaLe).map((x) => x.ma) };
  }
  assert.equal(buoc.ham, "kiemXuatBen", `bước mẫu ${k.mau}: hàm lạ ${buoc.ham}`);
  const r = kiemXuatBen(v);
  return { quyet_dinh: r.dat ? "DAT" : "GIU", ma_luat: r.lyDo.map((x) => x.ma), ai_xu_ly: r.lyDo.map((x) => x.aiXuLy), so_gan_ten: r.ganTen.length };
}
/** Chạy một phép kiểm máy. `ky_vong` của mẫu bước chỉ so các khoá có ghi (tập con). */
function chayKiem(k: Kiem): void {
  switch (k.loai) {
    case "duoi_moc":
      assert.equal(chuyenDuoiMoc({ dangChay: false, gioXetMs: ms(k.gio_xet) }, ms(k.bay_gio), k.moc_phut), k.ky_vong, `dưới mốc ${k.gio_xet} − ${k.bay_gio}`);
      return;
    case "lop_vuot_moc": assert.equal(lopVuotMoc(...k.lenh), k.ky_vong); return;
    case "lop_nghi_cam_ket": assert.equal(lopVuotNghiCamKet(k.duoi_moc), k.ky_vong); return;
    case "quyen": assert.equal(can({ id: "nguoi-thu", permissions: [k.permission] } as never, k.op), k.ky_vong, `${k.permission} / ${k.op}`); return;
    case "gio_xet_sua": assert.equal(gioXetSuaChuyen(ms(k.cu), ms(k.moi), k.som_nhat ? ms(k.som_nhat) : null), ms(k.ky_vong)); return;
    case "gio_lai": {
      const ds = (k.chuyen as { id: string; bd: string; kt: string; tt: string }[]).map((x) => ({
        id: x.id, ma: x.id, taiXePartyId: "tx-a", batDauMs: ms(x.bd), ketThucMs: ms(x.kt), ketThucThatMs: null, trangThai: x.tt as never,
      }));
      const kq = canhBaoGioLai(ds, { dutyDayMaxMinutes: tep.thong_so.gioLaiToiDaNgayPhut!, tripNoBreakMaxMinutes: tep.thong_so.chuyenDaiPhut! }, ms("2026-09-29 20:00"));
      assert.deepEqual(kq.map((x) => [x.loai, x.tripId, x.tongPhut]).sort(), [...k.ky_vong].sort());
      return;
    }
    case "mau_buoc": {
      const r = chayMau(k);
      for (const [khoa, gia] of Object.entries(k.ky_vong)) assert.deepEqual(r[khoa], gia, `${k.mau}: ${khoa}`);
      return;
    }
    default: assert.fail(`loại kiểm lạ: ${k.loai}`);
  }
}

test("khuôn: đủ 30 ca VC-01 đến VC-30, mã không trùng, đủ phần, ca đã xác nhận có người + ngày, không dãy ≥ 8 chữ số", () => {
  assert.ok(tep.xac_nhan.trang_thai === "da_xac_nhan" && typeof tep.xac_nhan.nguoi === "string" && isISODate(tep.xac_nhan.ngay ?? ""), "tệp phải ghi người + ngày xác nhận");
  assert.equal(tep.cac_ca.length, 30);
  assert.deepEqual(tep.cac_ca.map((c) => c.ma), Array.from({ length: 30 }, (_, i) => `VC-${String(i + 1).padStart(2, "0")}`));
  const TT = new Set(["da_xac_nhan", "da_xac_nhan_ma_chua_theo"]);
  for (const c of tep.cac_ca) {
    assert.ok(TT.has(c.trang_thai), `${c.ma}: trạng thái lạ ${c.trang_thai}`);
    assert.ok(c.boi_canh.trim() && c.cau_hoi.trim() && c.so_lieu.length > 0 && c.dap_an.length > 0, `${c.ma}: thiếu bối cảnh / số liệu / câu hỏi / đáp án`);
    if (c.trang_thai === "da_xac_nhan_ma_chua_theo") assert.ok(c.ghi_chu_chu?.includes("2026-10-16"), `${c.ma}: ca chủ muốn khác luật phải ghi lời chủ + ngày`);
    if (c.kich_ban_e2e) assert.ok(existsSync(join(GOC, "tests", "e2e", `${c.kich_ban_e2e}.mjs`)), `${c.ma}: kịch bản e2e ${c.kich_ban_e2e} không tồn tại`);
  }
  assert.doesNotMatch(readFileSync(join(GOC, "golden", "van-chuyen", "dieu-phoi-30-ca.json"), "utf8"), /\d{8,}/, "không số điện thoại / số giấy tờ trong ca vàng");
});

test("thông số trong tệp khớp mặc định hệ thống (mốc là chính sách đặt được, nên bài này chỉ canh số GHI TRONG ca vàng, không canh chính sách đang áp)", () => {
  assert.deepEqual(tep.thong_so, { mocLenhPhut: 30, nghiPhut: 30, cuaSoXuatBenPhut: 720, gioLaiToiDaNgayPhut: 480, chuyenDaiPhut: 240, hanTuChoiPhut: 720 });
  assert.equal((luot1.nen.chinhSach as { minLeadMinutes: number }).minLeadMinutes, 30, "dữ liệu nền lượt 1 phải ghi mốc 30 phút, cùng số với ca vàng");
});

let soCaChayMay = 0;
for (const c of tep.cac_ca) {
  const ten = `ca vàng vận chuyển ${c.ma}: ${c.ten}`;
  if (c.trang_thai === "da_xac_nhan" && c.kiem_may && c.kiem_may.length > 0) {
    soCaChayMay++;
    test(ten, () => { for (const k of c.kiem_may!) chayKiem(k); });
  } else if (c.trang_thai === "da_xac_nhan" && c.bai_chay_that) {
    soCaChayMay++;
    test(`${ten} — chạy thật ở ${c.bai_chay_that}`, () => {
      const f = join(GOC, c.bai_chay_that!);
      assert.ok(existsSync(f), `${c.ma}: tệp bài ${c.bai_chay_that} không tồn tại`);
      assert.match(readFileSync(f, "utf8"), new RegExp(`test\\("${c.ma} `), `${c.ma}: tệp bài chạy thật phải có bài mang tên bắt đầu bằng «${c.ma} »`);
    });
  } else if (c.trang_thai === "da_xac_nhan_ma_chua_theo") {
    test(`${ten} — CHỦ MUỐN KHÁC LUẬT ĐANG CHẠY (cần quyết định riêng trước khi sửa mã)`, { todo: c.adr ?? "chủ muốn khác luật hiện hành" }, () => { assert.fail(c.ghi_chu_chu); });
  } else {
    const nguon = c.kich_ban_e2e ? `chạy bằng kịch bản e2e tests/e2e/${c.kich_ban_e2e}.mjs (npm run test:e2e)` : "chưa có hàm thuần / kịch bản để chạy riêng ca này";
    test(ten, { todo: nguon }, () => { assert.fail(nguon); });
  }
}

test("không xanh vì rỗng: ít nhất 27 ca vàng đã xác nhận có phép kiểm máy chạy thật", () => {
  assert.ok(soCaChayMay >= 27, `chỉ ${soCaChayMay} ca chạy máy`);
});
