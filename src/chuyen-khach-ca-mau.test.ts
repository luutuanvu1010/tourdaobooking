// MƯỜI TÌNH HUỐNG CHUYỂN KHÁCH của chủ (golden/dieu-phoi-luot-2/xe-a-b-luot-2-chuyen-khach.json — chủ xác nhận 2026-10-08, hộp 4 lượt 8d-1; ADR-0111) chạy
// bằng máy, LỚP LUẬT THUẦN: mỗi bước chạy qua hàm THẬT của src/shared/chuyen-khach.ts (kiemGui, suatCuaDeNghi, kiemChuyen, quyetDinhSauKiem, hopDuyet,
// daHetHan / trangThaiLucDoc, deNghiTuHuyKhiXacNhan, deNghiHuyKhi, keHoachDiem) + ma trận quyền thật (can) + thứ tự điểm thật (sapDonTruocTra,
// suatTraTruocDon), trên một "thế giới" nhỏ dựng từ $nen của tệp. Tệp ca mẫu KHÔNG bị sửa phần chủ đã xác nhận; mọi chỗ máy không đọc được chữ (nen_rieng
// viết bằng lời) đổi THÀNH ĐẦU VÀO ở bảng DOI_NEN, mỗi dòng trích nguyên văn chữ nguồn — không bao giờ đổi đáp án. Bước có nhánh: bảng DUONG (mỗi bước nằm
// trên ít nhất một đường). Khoá đáp án mà lớp này không kiểm phải có tên ở LOP_KHAC (lớp kiểm nó: CSDL, lô, route, tin, e2e) — thiếu thì đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chuanNoiGap, daHetHan, deNghiHuyKhi, deNghiTuHuyKhiXacNhan, hetHanLucMs, hopDuyet, keHoachDiem, kiemChuyen, kiemGui, NHAN_TRANG_THAI_DE_NGHI, quyetDinhSauKiem, suatCuaDeNghi,
  trangThaiLucDoc, type DeNghiGon, type DongKiemChuyen, type TrangThaiDeNghi,
} from "./shared/chuyen-khach.ts";
import type { ChangVao, LoaiDiem, SuatVao, TaiXeVao, TrangThaiChuyen, TrangThaiDiem, XeVao } from "./shared/dieu-phoi-kieu.ts";
import { can, type OperationCode, type PermissionCode } from "./shared/permissions.ts";
import { sapDonTruocTra, suatTraTruocDon } from "./shared/thu-tu-diem.ts";
import { vnLocalToMs } from "./shared/vn-date.ts";

const GOC = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TEP = "golden/dieu-phoi-luot-2/xe-a-b-luot-2-chuyen-khach.json";
type Json = any;
const ca = JSON.parse(readFileSync(join(GOC, TEP), "utf8")) as Json;
const CSDL_TEST = readFileSync(join(GOC, "src/modules/van-chuyen/chuyen-khach-csdl.test.ts"), "utf8");
const SQL_0093 = readFileSync(join(GOC, "migrations/0093_chuyen_khach_giua_xe.sql"), "utf8");

const ms = (s: string): number => {
  const [d, t] = s.split(" ");
  const v = vnLocalToMs(d!, t!);
  assert.ok(v !== null, `giờ sai khuôn: ${s}`);
  return v;
};
const giai = (v: Json, nen: Json): Json => {
  if (typeof v !== "string" || !v.startsWith("$nen.")) return v;
  return v.slice(5).split(".").reduce((cur: Json, k: string) => {
    assert.ok(cur && k in cur, `không tìm thấy ${v}`);
    return cur[k];
  }, nen);
};

// ---- Lý do TU_CHOI_NHAN: nhãn ca mẫu → mã gieo của 0093. "Lý do khác" của ca mẫu = dòng "Khác" (luật gieo: mỗi nhóm đúng một "Khác" — CÂU HỎI CHO CHỦ). ----
const LY_DO_TU_CHOI = Object.fromEntries([...SQL_0093.matchAll(/\('(TU_CHOI_[A-Z_]+)', 'TU_CHOI_NHAN', '([^']+)'/g)].map((m) => [m[2]!, m[1]!]));
const NHAN_LECH: Record<string, string> = { "Lý do khác": "Khác" };
const maTuChoi = (nhan: string): string | undefined => LY_DO_TU_CHOI[NHAN_LECH[nhan] ?? nhan];

// ---- Thế giới -------------------------------------------------------------------------------------------------------------------------------------------
interface Chuyen { id: string; ma: string; trangThai: TrangThaiChuyen; batDauMs: number; ketThucMs: number; xe: XeVao; taiXe: TaiXeVao; taiKhoan: string; camKetPhaLeKhoa: string | null; camKetLyDo: string | null; ketThucKieu?: string }
interface Diem { id: string; tripId: string; seq: number; loai: LoaiDiem; trangThai: TrangThaiDiem; placeKey: string; noiGap: boolean; addedWhileRunning: 0 | 1 }
interface Suat extends SuatVao { closeReason?: string; closedTransferId?: string; transferId?: string; addedAfterDeparture?: 0 | 1 }
interface DeNghi extends DeNghiGon {
  trangThai: TrangThaiDeNghi; guiLucMs: number; phutCho: number; requestId: string; proposedByParty: string; proposedByStaff: string; noiGapKey: string | null; paxCount: number;
  kiem: DongKiemChuyen[]; decidedMode: string | null; decidedByParty: string | null; overrideReasonCode: string | null; policyRowId: string | null; closedCmdId: string | null; lyDo: string | null;
}
interface TheGioi { chuyen: Map<string, Chuyen>; diem: Diem[]; suat: Suat[]; chang: Record<string, ChangVao>; deNghi: Map<string, DeNghi>; nen: Json; soMoi: number }

const CHINH_SACH = (cs: Json) => ({
  id: cs.id, minLeadMinutes: cs.minLeadMinutes, warnLeadMinutes: cs.warnLeadMinutes, restMinutes: cs.restMinutes, requireManifest: cs.requireManifest, requireContract: false,
  dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: cs.departureWindowMinutes,
});

/** Dựng thế giới từ $nen (đã áp nen_rieng + DOI_NEN). Kiểm `tai` của từng chuyến = số suất chiếm chỗ dựng được (đối chiếu đầu vào đã đổi với số của chủ). */
function dung(nen: Json): TheGioi {
  const chang: Record<string, ChangVao> = {};
  for (const [k, c] of Object.entries<Json>(nen.chang)) chang[k] = { ...c, nguoiCuaDon: [...c.nguoiCuaDon] };
  const chuyen = new Map<string, Chuyen>();
  const suat: Suat[] = [];
  for (const [k, c] of Object.entries<Json>(nen.chuyen)) {
    const xe = giai(c.xe, nen);
    const tx = giai(c.taiXe, nen);
    chuyen.set(c.id, {
      id: c.id, ma: c.ma, trangThai: c.trangThai, batDauMs: ms(c.batDauMs), ketThucMs: ms(c.ketThucMs), taiKhoan: tx.taiKhoan, camKetPhaLeKhoa: c.camKetPhaLeKhoa, camKetLyDo: null,
      xe: { id: xe.id, bienSo: xe.bienSo, soCho: xe.soCho, trangThai: "active", chuXePartyId: "cong-ty", chuLaCongTy: xe.chuLaCongTy, giayTo: [] },
      taiXe: { partyId: tx.partyId, displayName: tx.displayName, loai: tx.loai, carrierPartyIds: [], giayTo: [{ rowId: `gplx-${tx.partyId}`, typeCode: "GPLX", classCode: tx.hangBang, expiryDate: null }] },
    });
    for (const g of c.nhom) {
      const crew = g.loai === "CREW";
      const legId = crew ? null : (typeof g.chang === "string" && g.chang.startsWith("$nen.") ? giai(g.chang, nen).legId : chang[g.chang]!.legId);
      for (let i = 0; i < g.so; i++) {
        suat.push({
          id: g.suatIds?.[i] ?? `${c.id}:${legId ?? g.nguoiDiKem}:${i + 1}`, tripId: c.id, loai: crew ? "CREW" : "PASSENGER", legId, personKey: null, crewPartyId: crew ? g.nguoiDiKem : null,
          boardStopId: g.len, alightStopId: g.xuong, trangThai: g.trangThai, mo: true, moTuMs: 0,
        });
      }
    }
    assert.equal(suat.filter((s) => s.tripId === c.id && s.mo).length, c.tai, `${k}: số suất dựng được ≠ tai ${c.tai} của ca mẫu`);
  }
  const diem: Diem[] = nen.diem.map((d: Json) => ({ id: d.id, tripId: d.tripId, seq: d.seq, loai: d.loai, trangThai: d.trangThai, placeKey: d.placeKey, noiGap: false, addedWhileRunning: 0 }));
  return { chuyen, diem, suat, chang, deNghi: new Map(), nen, soMoi: 0 };
}

/** Đổi đầu vào cho phần nen_rieng viết bằng LỜI — mỗi dòng trích nguyên văn chữ nguồn; chỉ đổi dữ liệu nền, không đổi đáp án. */
const DOI_NEN: Record<string, { trich: string; ap: (n: Json) => void }> = {
  TH02: {
    trich: "chưa xuất bến; đoàn Hòn Chồng 20 khách và Alibu 2 khách đều WAITING; điểm d4-hon-chong PENDING",
    ap: (n) => {
      for (const g of n.chuyen.CX04.nhom) g.trangThai = "WAITING";
      n.diem.find((d: Json) => d.id === "d4-hon-chong").trangThai = "PENDING";
    },
  },
  "TH02-4": { trich: "chặng Mường Thanh MANG dấu đặt gấp", ap: (n) => (n.chang.MUONG_THANH.datGap = true) },
  TH07: {
    trich: "AMIANA với soNguoi = 1 … không có nhóm Novotel; điểm d7-novotel không có trong nền riêng này",
    ap: (n) => {
      n.chang.AMIANA.soNguoi = 1;
      n.chuyen.CX07.nhom = n.chuyen.CX07.nhom.map((g: Json) => (g.chang === "AMIANA với soNguoi = 1" ? { ...g, chang: "$nen.chang.AMIANA" } : g));
      n.diem = n.diem.filter((d: Json) => d.id !== "d7-novotel");
    },
  },
  "TH07-5": { trich: "chuyến của xe C đang PLANNED", ap: (n) => (n.chuyen.CX05.trangThai = "PLANNED") },
  "9A": { trich: "chỉ có đoàn ĐH-2001 (xe riêng, 20 khách); không có nhóm Alibu", ap: (n) => (n.chuyen.CX04.nhom = n.chuyen.CX04.nhom.filter((g: Json) => g.chang === "$nen.chang.HON_CHONG")) },
  "9B": { trich: "A chở 10/15: bỏ nhóm Novotel", ap: (n) => (n.chuyen.CX07.nhom = n.chuyen.CX07.nhom.filter((g: Json) => g.chang !== "$nen.chang.NOVOTEL")) },
};
/** Áp `nen_rieng` (phần máy đọc được: khoá dạng đường "chang.X.truong" / "chuyen.CXnn") rồi các dòng DOI_NEN. */
function nenCho(nenRieng: Json, doi: string[]): Json {
  const n = structuredClone(ca.nen);
  for (const [k, v] of Object.entries<Json>(nenRieng ?? {})) {
    const p = k.split(".");
    if (p[0] === "chang") n.chang[p[1]!][p[2]!] = v;
    else if (p[0] === "chuyen") {
      for (const [f, x] of Object.entries<Json>(v)) if (f !== "ghi_chu") n.chuyen[p[1]!][f] = x;
    } else assert.fail(`khoá nen_rieng lạ: ${k}`);
  }
  for (const d of doi) {
    assert.ok(DOI_NEN[d], `thiếu DOI_NEN ${d}`);
    DOI_NEN[d]!.ap(n);
  }
  return n;
}

// ---- Quyền (ma trận thật) ------------------------------------------------------------------------------------------------------------------------------
const VAI_VP: Record<string, PermissionCode> = ca.nen.taiKhoanVanPhong;
function nguoi(the: TheGioi, tk: string): { id: string; permissions: PermissionCode[]; partyId: string | null } {
  if (VAI_VP[tk]) return { id: tk, permissions: [VAI_VP[tk]!], partyId: null };
  const tx = Object.values<Json>(the.nen.taiXe).find((t) => t.taiKhoan === tk);
  assert.ok(tx, `tài khoản lạ ${tk}`);
  return { id: tk, permissions: ["DRIVER"], partyId: tx.partyId };
}
/** Khuôn hai bước của route tài xế: không có ô nào (kể cả khi được giao) → 403; có ô mà không lái đúng chuyến → 404. */
function quyenTaiXe(the: TheGioi, tk: string, o: OperationCode, tripId: string): 403 | 404 | null {
  const ng = nguoi(the, tk);
  if (!can(ng, o, { assigned: true })) return 403;
  const lai = ng.partyId !== null && the.chuyen.get(tripId)?.taiXe.partyId === ng.partyId;
  return lai && can(ng, o, { assigned: true }) ? null : 404;
}

// ---- Một bước ------------------------------------------------------------------------------------------------------------------------------------------
const chiemCho = (s: Suat) => s.mo && (s.trangThai === "WAITING" || s.trangThai === "BOARDED");
const tai = (the: TheGioi, tripId: string) => the.suat.filter((s) => s.tripId === tripId && chiemCho(s)).length;
const danhMuc = () => ca.nen.danhMucLuat.map((d: Json) => ({ code: d.code, tier: d.tier, active: d.active }));
const gon = (r: DeNghi): DeNghiGon => ({ id: r.id, tuChuyen: r.tuChuyen, denChuyen: r.denChuyen, phamVi: r.phamVi, diemId: r.diemId, trangThai: r.trangThai });

function kiem(the: TheGioi, r: DeNghi, bayGioMs: number) {
  const dich = the.chuyen.get(r.denChuyen)!;
  const nguon = the.chuyen.get(r.tuChuyen)!;
  const suatChuyen = suatCuaDeNghi(r.phamVi, the.suat.filter((s) => s.tripId === r.tuChuyen), r.diemId);
  const changCuaSuat = (ds: Suat[]) => Object.values(the.chang).filter((c) => ds.some((s) => s.mo && s.loai === "PASSENGER" && s.legId === c.legId));
  return kiemChuyen({
    phamVi: r.phamVi,
    nguon: { id: nguon.id, soCho: nguon.xe.soCho, tai: tai(the, nguon.id) },
    diemNguon: r.diemId === null ? null : (() => { const d = the.diem.find((x) => x.id === r.diemId)!; return { id: d.id, trangThai: d.trangThai }; })(),
    dich: { id: dich.id, ma: dich.ma, trangThai: dich.trangThai, batDauMs: dich.batDauMs, batDauSomNhatMs: dich.batDauMs, ketThucMs: dich.ketThucMs, ketThucThatMs: null, xe: dich.xe, taiXe: dich.taiXe, camKetPhaLeKhoa: dich.camKetPhaLeKhoa },
    taiDich: tai(the, dich.id),
    suatChuyen,
    changChuyen: changCuaSuat(suatChuyen),
    changTrenDich: changCuaSuat(the.suat.filter((s) => s.tripId === dich.id)),
    chuyenKhac: [...the.chuyen.values()].filter((c) => c.id !== dich.id).map((c) => ({ id: c.id, ma: c.ma, xeId: c.xe.id, taiXePartyId: c.taiXe.partyId, batDauMs: c.batDauMs, ketThucMs: c.ketThucMs, ketThucThatMs: null, trangThai: c.trangThai })),
    chinhSach: CHINH_SACH(ca.nen.chinhSach),
    hangBang: ca.nen.hangBang,
    dieuKien: [],
    danhMuc: danhMuc(),
    bayGioMs,
  });
}

/** Đổi suất + điểm như lô xác nhận (kế hoạch T6 bước 7–12) — dùng keHoachDiem / sapDonTruocTra / deNghiTuHuyKhiXacNhan thật. */
function apChuyen(the: TheGioi, r: DeNghi, cmd: string): { tuHuy: string[]; them: Diem[]; ghep: string[]; dong: Suat[]; mo: Suat[] } {
  const dich = the.chuyen.get(r.denChuyen)!;
  const chay = dich.trangThai === "RUNNING";
  const dong = suatCuaDeNghi(r.phamVi, the.suat.filter((s) => s.tripId === r.tuChuyen), r.diemId) as Suat[];
  const kh = keHoachDiem({
    suatChuyen: dong, diemNguon: the.diem.filter((d) => d.tripId === r.tuChuyen), diemDich: the.diem.filter((d) => d.tripId === dich.id), noiGapPlaceKey: r.noiGapKey,
  });
  const maxSeq = Math.max(0, ...the.diem.filter((d) => d.tripId === dich.id).map((d) => d.seq));
  const them: Diem[] = kh.them.map((t, i) => ({ id: `diem-moi-${++the.soMoi}`, tripId: dich.id, seq: maxSeq + i + 1, loai: t.loai, trangThai: "PENDING", placeKey: t.placeKey, noiGap: t.noiGap, addedWhileRunning: chay ? 1 : 0 }));
  const idCua = (k: string | null) => (k === null ? null : k.startsWith("moi:") ? them[Number(k.slice(4)) - 1]!.id : k);
  the.diem.push(...them);
  const mo: Suat[] = [];
  for (const s of dong) {
    s.mo = false;
    s.closeReason = "TRANSFERRED";
    s.closedTransferId = r.id;
    const g = kh.gan.find((x) => x.suatId === s.id)!;
    mo.push({ ...s, id: `${s.id}@${dich.id}`, tripId: dich.id, mo: true, boardStopId: idCua(g.len), alightStopId: idCua(g.xuong), transferId: r.id, addedAfterDeparture: chay ? 1 : 0, closeReason: undefined, closedTransferId: undefined });
  }
  the.suat.push(...mo);
  const doi = sapDonTruocTra(
    the.diem.filter((d) => d.tripId === dich.id).map((d) => ({ id: d.id, seq: d.seq, dangCho: d.trangThai === "PENDING" })),
    the.suat.filter((s) => s.tripId === dich.id && s.mo).map((s) => ({ diemLen: s.boardStopId, diemXuong: s.alightStopId })),
  );
  for (const [id, seq] of doi) the.diem.find((d) => d.id === id)!.seq = seq;
  if (r.phamVi === "STOP") the.diem.find((d) => d.id === r.diemId)!.trangThai = "MOVED";
  const tuHuy = deNghiTuHuyKhiXacNhan(gon(r), [...the.deNghi.values()].map(gon));
  for (const id of tuHuy) Object.assign(the.deNghi.get(id)!, { trangThai: "VOID", closedCmdId: cmd });
  return { tuHuy, them, ghep: kh.ghep, dong, mo };
}

interface Ra { http: number; [k: string]: unknown }
function chay(the: TheGioi, b: Json, gia?: { id: string }): Ra {
  const v = b.dau_vao;
  const now = ms(b.bayGioMs);
  const r = v.deNghi ? the.deNghi.get(v.deNghi) : undefined;
  switch (b.lenh) {
    case "GUI":
    case "VP_GUI_CUU_HO": {
      const tu = v.tuChuyen ?? v.chuyen;
      if (b.lenh === "GUI") {
        const q = quyenTaiXe(the, b.ai, "trip.transfer", tu);
        if (q) return { http: q };
      } else {
        if (!can(nguoi(the, b.ai), "trip.progress")) return { http: 403 };
        if (v.phamVi !== "ONBOARD") return { http: 403 };
      }
      const nguon = the.chuyen.get(tu)!;
      const dich = the.chuyen.get(v.denChuyen) ?? [...the.chuyen.values()].find((c) => c.trangThai === "PLANNED" && c.id !== tu)!;
      let noiGapKey: string | null = null;
      if (v.phamVi === "ONBOARD") {
        const ng = chuanNoiGap({ diaDiemId: v.noiGap?.diaDiem ?? null, chu: v.noiGap?.chu ?? "nơi gặp" });
        if (!ng.ok) return { http: 400 };
        noiGapKey = ng.diaDiemId ? `L:${ng.diaDiemId}` : `T:${ng.chu}`;
      }
      const suatNguon = the.suat.filter((s) => s.tripId === tu);
      const diem = v.diem ? the.diem.find((d) => d.id === v.diem) : undefined;
      const loi = kiemGui({
        phamVi: v.phamVi, nguonId: tu, dichId: dich.id,
        nguon: { trangThai: nguon.trangThai, ngayChay: ca.nen.ngay, taiXePartyId: nguon.taiXe.partyId },
        dich: { trangThai: dich.trangThai, ngayChay: ca.nen.ngay, taiXePartyId: dich.taiXe.partyId },
        diem: diem ? { tripId: diem.tripId, loai: diem.loai, trangThai: diem.trangThai } : null,
        suatTaiDiem: suatCuaDeNghi(v.phamVi, suatNguon, v.diem ?? null),
      });
      if (loi) return { http: 409, ma_loi: loi };
      const id = gia?.id ?? b.dap_an.de_nghi?.id;
      assert.ok(id, `${b.ma}: gửi thành công mà ca mẫu không ghi id đề nghị`);
      const dn: DeNghi = {
        id, tuChuyen: tu, denChuyen: dich.id, phamVi: v.phamVi, diemId: v.diem ?? null, trangThai: "PENDING", guiLucMs: now, phutCho: ca.nen.chinhSach.acceptWaitMinutes, requestId: v.requestId,
        proposedByParty: nguon.taiXe.partyId, proposedByStaff: b.ai, noiGapKey, paxCount: suatCuaDeNghi(v.phamVi, suatNguon, v.diem ?? null).length, kiem: [], decidedMode: null,
        decidedByParty: null, overrideReasonCode: null, policyRowId: null, closedCmdId: null, lyDo: null,
      };
      the.deNghi.set(id, dn);
      return { http: 201, de_nghi: dn };
    }
    case "NHAN":
    case "KHONG_NHAN": {
      assert.ok(r, `${b.ma}: không thấy đề nghị ${v.deNghi}`);
      const q = quyenTaiXe(the, b.ai, "trip.transfer", r.denChuyen);
      if (q) return { http: q };
      if (b.lenh === "KHONG_NHAN" && !(v.lyDo && maTuChoi(v.lyDo.nhan))) return { http: 400 };
      if (r.trangThai !== "PENDING") return { http: 409, ma_loi: r.trangThai === "VOID" ? "da_huy" : "da_dong" };
      const party = the.chuyen.get(r.denChuyen)!.taiXe.partyId;
      if (daHetHan(r.guiLucMs, r.phutCho, now)) {
        Object.assign(r, { trangThai: "EXPIRED", closedCmdId: v.requestId });
        return { http: 200, ketQua: "HET_HAN", de_nghi: r };
      }
      if (b.lenh === "KHONG_NHAN") {
        Object.assign(r, { trangThai: "DECLINED", decidedByParty: party, lyDo: maTuChoi(v.lyDo.nhan), closedCmdId: v.requestId });
        return { http: 200, ketQua: "DECLINED", de_nghi: r };
      }
      const k = kiem(the, r, now);
      r.kiem.push(...k.dong);
      const qd = quyetDinhSauKiem(k.dong, ca.nen.chinhSach.autoConfirmTransfer);
      Object.assign(r, { trangThai: qd, decidedByParty: party, decidedMode: qd === "CONFIRMED" ? "MAY" : null, policyRowId: ca.nen.chinhSach.id });
      const ap = qd === "CONFIRMED" ? apChuyen(the, r, v.requestId) : null;
      if (ap) r.closedCmdId = v.requestId;
      return { http: 200, ketQua: qd, de_nghi: r, kiem: k.dong, hop_duyet: hopDuyet(r.kiem), ap };
    }
    case "DUYET":
    case "BAC": {
      assert.ok(r, `${b.ma}: không thấy đề nghị ${v.deNghi}`);
      if (!can(nguoi(the, b.ai), "trip.override")) return { http: 403 };
      if (b.lenh === "BAC") {
        if (!(v.lyDo && maTuChoi(v.lyDo.nhan))) return { http: 400 };
        if (r.trangThai !== "ESCALATED") return { http: 409 };
        Object.assign(r, { trangThai: "REJECTED", lyDo: maTuChoi(v.lyDo.nhan), closedCmdId: v.requestId });
        return { http: 200, ketQua: "REJECTED", de_nghi: r, bac_khong_ly_do: 400 };
      }
      if (r.trangThai !== "ESCALATED") return { http: 409 };
      if (hopDuyet(r.kiem) === "CHI_BAC") return { http: 409, ma_loi: "luat_loi_khong_duyet" };
      const k = kiem(the, r, now);
      if (hopDuyet([...r.kiem, ...k.dong]) === "CHI_BAC") return { http: 409, ma_loi: "luat_loi_khong_duyet" };
      r.kiem.push(...k.dong);
      Object.assign(r, { trangThai: "CONFIRMED", decidedMode: "NGUOI", overrideReasonCode: v.lyDo, closedCmdId: v.requestId });
      const dich = the.chuyen.get(r.denChuyen)!;
      if (k.dong.some((d) => d.ma === "CAM_KET_DICH" && d.ketQua === "KHONG_DAT")) Object.assign(dich, { camKetPhaLeKhoa: k.camKet.khoa, camKetLyDo: v.lyDo });
      return { http: 200, ketQua: "CONFIRMED", de_nghi: r, ap: apChuyen(the, r, v.requestId) };
    }
    case "DOC": {
      const tx = nguoi(the, b.ai).partyId;
      const cua = [...the.deNghi.values()].filter((x) => [x.tuChuyen, x.denChuyen].some((t) => the.chuyen.get(t)!.taiXe.partyId === tx));
      return { http: 200, man: Object.fromEntries(cua.map((x) => [x.id, NHAN_TRANG_THAI_DE_NGHI[trangThaiLucDoc(x, now)]])) };
    }
    case "DA_TOI": {
      const d = v.diem === "nơi gặp" ? the.diem.find((x) => x.tripId === v.chuyen && x.noiGap)! : the.diem.find((x) => x.id === v.diem)!;
      assert.ok(d, `${b.ma}: không thấy điểm`);
      const truoc = the.suat.filter((s) => s.mo && s.boardStopId === d.id).map((s) => s.trangThai);
      d.trangThai = "ARRIVED";
      const tuHuy = deNghiHuyKhi({ diemId: d.id }, [...the.deNghi.values()].map(gon));
      for (const id of tuHuy) Object.assign(the.deNghi.get(id)!, { trangThai: "VOID", closedCmdId: v.requestId });
      assert.deepEqual(the.suat.filter((s) => s.mo && s.boardStopId === d.id).map((s) => s.trangThai), truoc, "Đã tới không đổi trạng thái suất");
      return { http: 200, tuHuy };
    }
    case "KET_THUC_GIAN_DOAN": {
      const c = the.chuyen.get(v.chuyen)!;
      assert.equal(the.suat.filter((s) => s.tripId === c.id && s.mo).length, 0, "LC-16: không còn suất mở");
      for (const d of the.diem.filter((x) => x.tripId === c.id && (x.trangThai === "PENDING" || x.trangThai === "ARRIVED"))) d.trangThai = "SKIPPED";
      c.trangThai = "ENDED_INTERRUPTED";
      const tuHuy = deNghiHuyKhi({ chuyenId: c.id }, [...the.deNghi.values()].map(gon));
      for (const id of tuHuy) Object.assign(the.deNghi.get(id)!, { trangThai: "VOID", closedCmdId: v.requestId });
      return { http: 200 };
    }
    default:
      assert.fail(`${b.ma}: lệnh ${b.lenh} không chạy ở lớp thuần`);
  }
}

// ---- So đáp án ----------------------------------------------------------------------------------------------------------------------------------------
/** Khoá đáp án do LỚP KHÁC kiểm (tên lớp = nơi bài nằm). Mỗi khoá đáp án phải được so ở `so` hoặc có tên ở đây. */
const LOP_KHAC: Record<string, string> = {
  su_kien: "lô (chuyen-khach-lo.test.ts) + route", nhat_ky: "route (chuyen-khach-route.test.ts) + e2e", tin: "tin-chuyen.test.ts (T10) + route",
  manifest_them: "lô (chuyen-khach-lo.test.ts)", ghi_gi: "route + e2e (lệnh 4xx không ghi gì)", man_hinh_tai_xe: "giao diện (cuoc-chuyen) + Chrome",
  tai_xe_dich_thay: "route DTO (chuyen-khach-route.test.ts)", noi_gap: "route DTO + hanh-khach-khong-lo-ten.test.ts", nut_duyet_tren_man_hinh: "giao diện (de-nghi) + Chrome",
  su_kien_chuyen_khach: "lô MQ-09 (thu-tu-lo + chuyen-khach-route)", tin_chuyen_khach: "tin-chuyen.test.ts", danh_sach_xe_nhan: "route xe-nhan (chuyen-khach-route.test.ts)",
  ly_do_cam_ket: "lời của kiemCamKet (cam-ket-xe.test.ts)", goi_y: "chữ hướng dẫn (huong-dan)", csdl: "CSDL (chuyen-khach-csdl.test.ts) khi lenh = SQL_TAY",
  ghi_chu: "chú thích", ghi_chu_kiem: "chú thích", ly_do: "chú thích", phu_thuoc: "chú thích (Đ4 / Đ6)", khong_chon: "chú thích", kiem_lai: "chú thích (DUYET chạy lại kiemChuyen)",
  nhu: "chú thích (so ketQua)", diem_doi_nguon: "chú thích (so bằng diem_doi rỗng ở nguồn)",
};
function so(the: TheGioi, b: Json, ra: Ra): void {
  const a = b.dap_an;
  const ten = b.ma;
  const daSo = new Set<string>();
  const xet = (k: string, f: () => void) => {
    if (!(k in a)) return;
    daSo.add(k);
    f();
  };
  xet("http", () => (a.http === "2xx" ? assert.ok(ra.http >= 200 && ra.http < 300, `${ten}: http ${ra.http}`) : assert.equal(ra.http, a.http, `${ten}: http`)));
  xet("ma_loi", () => assert.equal(ra.ma_loi, a.ma_loi, `${ten}: mã lỗi`));
  xet("ketQua", () => assert.equal(ra.ketQua, a.ketQua, `${ten}: kết quả`));
  const dn = ra.de_nghi as DeNghi | undefined;
  xet("de_nghi", () => {
    assert.ok(dn, `${ten}: không có đề nghị`);
    const map: Record<string, unknown> = {
      id: dn.id, trangThai: dn.trangThai, paxCount: dn.paxCount, policyId: ca.nen.chinhSach.id, proposedByParty: dn.proposedByParty, proposedByStaff: dn.proposedByStaff,
      decidedMode: dn.decidedMode, decidedByParty: dn.decidedByParty, overrideReasonCode: dn.overrideReasonCode, policyRowId: dn.policyRowId, fromStopId: dn.diemId,
      hetHanLucMs: hetHanLucMs(dn.guiLucMs, dn.phutCho),
    };
    for (const [k, x] of Object.entries<Json>(a.de_nghi)) {
      if (k === "ghi_chu") continue;
      assert.ok(k in map, `${ten}: khoá đề nghị lạ ${k}`);
      assert.deepEqual(map[k], k === "hetHanLucMs" ? ms(x) : x, `${ten}: de_nghi.${k}`);
    }
  });
  const kq = Object.fromEntries(((ra.kiem as DongKiemChuyen[] | undefined) ?? []).map((d) => [d.ma, d]));
  xet("kiem", () => {
    if (a.kiem === null) return assert.equal(ra.kiem, undefined, `${ten}: không được kiểm`);
    assert.deepEqual(Object.fromEntries(Object.entries(kq).map(([k, d]) => [k, d.ketQua])), giai(a.kiem, ca.nen), `${ten}: kiem`);
  });
  xet("kiem_khac_dat", () => {
    for (const [k, d] of Object.entries(kq)) assert.equal(d.ketQua, a.kiem_khac_dat[k] ?? "DAT", `${ten}: ${k}`);
  });
  xet("so_lieu", () => {
    for (const [k, x] of Object.entries<Json>(a.so_lieu)) assert.deepEqual({ gia_tri: kq[k]?.giaTri, gioi_han: kq[k]?.gioiHan }, x, `${ten}: so_lieu.${k}`);
  });
  xet("hop_duyet", () => assert.equal(ra.hop_duyet, a.hop_duyet, `${ten}: hộp duyệt`));
  const ap = ra.ap as ReturnType<typeof apChuyen> | null | undefined;
  xet("suat_doi", () => assert.equal(!!ap, a.suat_doi, `${ten}: suất đổi`));
  xet("tu_huy", () => {
    const thuc = [...the.deNghi.values()].filter((x) => x.trangThai === "VOID" && x.closedCmdId === b.dau_vao.requestId).map((x) => ({ deNghi: x.id, trangThai: "VOID", closedCmdId: x.closedCmdId }));
    assert.deepEqual(thuc, a.tu_huy, `${ten}: tự huỷ`);
  });
  xet("de_nghi_khac", () => {
    for (const [id, chu] of Object.entries<string>(a.de_nghi_khac)) {
      const x = the.deNghi.get(id)!;
      assert.equal(x.trangThai, chu.match(/[A-Z]{4,}/)![0], `${ten}: ${id}`);
      if (chu.includes("CHI_BAC")) assert.equal(hopDuyet(x.kiem), "CHI_BAC", `${ten}: ${id} hộp duyệt`);
    }
  });
  xet("tai_sau", () => {
    for (const [t, n] of Object.entries<number>(a.tai_sau)) assert.equal(tai(the, t), n, `${ten}: tải ${t}`);
  });
  xet("suat_dong", () => {
    assert.ok(ap, `${ten}: không có lô chuyển`);
    const ds = Array.isArray(a.suat_dong) ? a.suat_dong : [a.suat_dong];
    for (const x of ds) {
      const cua = x.id ? ap.dong.filter((s) => s.id === x.id) : ap.dong;
      assert.equal(cua.length, x.id ? 1 : x.so, `${ten}: số suất đóng`);
      if (x.khach !== undefined) assert.deepEqual([cua.filter((s) => s.loai === "PASSENGER").length, cua.filter((s) => s.loai === "CREW").length], [x.khach, x.nguoiDiKem]);
      for (const s of cua) {
        assert.equal(s.tripId, x.tripId);
        if (x.closeReason) assert.equal(s.closeReason, x.closeReason);
        assert.equal(s.closedTransferId, x.closedTransferId);
      }
    }
  });
  const diemLa = (moTa: string | null, id: string | null): void => {
    if (moTa === null) return assert.equal(id, null, `${ten}: suất không điểm`);
    const d = the.diem.find((x) => x.id === id)!;
    if (moTa.startsWith("nơi gặp")) return assert.ok(d.noiGap, `${ten}: lên ở nơi gặp`);
    if (moTa.startsWith("L:")) {
      assert.equal(d.placeKey, moTa.split(" ")[0]);
      if (moTa.includes("(điểm mới)")) assert.ok(d.id.startsWith("diem-moi-"), `${ten}: ${moTa} phải là điểm mới`);
      return;
    }
    assert.equal(d.id, moTa, `${ten}: điểm ${moTa}`);
  };
  xet("suat_mo", () => {
    assert.ok(ap, `${ten}: không có lô chuyển`);
    const ds = Array.isArray(a.suat_mo) ? a.suat_mo : [a.suat_mo];
    let tong = 0;
    for (const x of ds) {
      const cua = ap.mo.filter((s) => (x.loai === "CREW" ? s.loai === "CREW" : x.chang ? s.legId === x.chang : true));
      assert.equal(cua.length, x.so, `${ten}: suất mở ${x.chang ?? x.loai ?? ""}`);
      tong += x.so;
      for (const s of cua) {
        assert.equal(s.tripId, x.tripId);
        assert.equal(s.transferId, x.transferId);
        if (x.trangThai) assert.equal(s.trangThai, x.trangThai);
        if (x.addedAfterDeparture !== undefined) assert.equal(s.addedAfterDeparture, x.addedAfterDeparture);
        if ("len" in x) diemLa(x.len, s.boardStopId);
        if ("xuong" in x) diemLa(x.xuong, s.alightStopId);
      }
    }
    if (ds.length > 1 || !ds[0].chang) assert.equal(ap.mo.length, tong, `${ten}: tổng suất mở`);
  });
  xet("diem_them", () => {
    const tom = (d: { tripId: string; loai: string; noiGap: boolean; placeKey: string; addedWhileRunning: number }) => `${d.tripId}|${d.loai}|${d.noiGap ? "NOI_GAP" : d.placeKey}|${d.addedWhileRunning}`;
    const mong = a.diem_them.map((d: Json) => tom({ ...d, noiGap: d.placeKey.startsWith("nơi gặp"), addedWhileRunning: d.addedWhileRunning }));
    assert.deepEqual((ap?.them ?? []).map(tom).sort(), mong.sort(), `${ten}: điểm thêm`);
    for (const d of a.diem_them) if (d.trangThai) assert.ok((ap?.them ?? []).every((x) => x.trangThai === d.trangThai));
  });
  xet("diem_ghep", () => assert.deepEqual(ap?.ghep.slice().sort(), a.diem_ghep.map((g: Json) => g.diem).sort(), `${ten}: điểm ghép`));
  xet("diem_doi", () => {
    for (const d of a.diem_doi) assert.equal(the.diem.find((x) => x.id === d.id)!.trangThai, d.trangThai, `${ten}: điểm ${d.id}`);
  });
  xet("thu_tu_diem", () => {
    const t = ap!.mo[0]!.tripId;
    const choLen = the.suat.filter((s) => s.tripId === t && s.mo && s.trangThai === "WAITING");
    assert.deepEqual(suatTraTruocDon(the.diem.filter((d) => d.tripId === t), choLen.map((s) => ({ diemLen: s.boardStopId, diemXuong: s.alightStopId }))), [], `${ten}: suatTraTruocDon`);
  });
  xet("khoa_cam_ket", () => {
    const c = the.chuyen.get(a.khoa_cam_ket.tripId)!;
    assert.ok(c.camKetPhaLeKhoa, `${ten}: khoá cam kết`);
    assert.equal(c.camKetLyDo, a.khoa_cam_ket.commitmentOverrideReasonCode);
  });
  xet("de_nghi_tren_man_hinh", () => {
    const man = ra.man as Record<string, string>;
    if (typeof a.de_nghi_tren_man_hinh === "string") assert.ok(Object.values(man).some((x) => x.toLowerCase() === a.de_nghi_tren_man_hinh.toLowerCase()), `${ten}: ${JSON.stringify(man)}`);
    else for (const [id, x] of Object.entries<string>(a.de_nghi_tren_man_hinh)) assert.equal(man[id], x, `${ten}: ${id}`);
  });
  xet("chuyen", () => assert.equal(the.chuyen.get(b.dau_vao.chuyen)!.trangThai, a.chuyen.trangThai));
  xet("bac_khong_ly_do", () => assert.equal(ra.bac_khong_ly_do, a.bac_khong_ly_do));
  if (b.lenh === "DOC") xet("csdl", () => assert.equal(the.deNghi.get(Object.keys(ra.man as object)[0]!)!.trangThai, a.csdl.trangThai));
  for (const k of Object.keys(a)) assert.ok(daSo.has(k) || k in LOP_KHAC, `${ten}: khoá đáp án "${k}" không lớp nào kiểm`);
}

// ---- Đường chạy (bước có nhánh) ------------------------------------------------------------------------------------------------------------------------
interface Duong { ten: string; th: string; nenRieng?: string; doi?: string[]; buoc: (string | { nhu: string; id: string })[] }
const DUONG: Duong[] = [
  { ten: "TH01", th: "TH01-NHO-XE-DANG-CHAY-TU-DONG-Y", buoc: ["TH01-1-GUI", "TH01-2-NHAN"] },
  { ten: "TH02-duyet", th: "TH02-XE-CHUA-CHAY-DUOI-6-GIO", doi: ["TH02"], buoc: ["TH02-1-GUI", "TH02-2-NHAN-LEO-THANG", "TH02-3A-BAN-HANG-DUYET", "TH02-3B-QUAN-TRI-DUYET"] },
  { ten: "TH02-bac", th: "TH02-XE-CHUA-CHAY-DUOI-6-GIO", doi: ["TH02"], buoc: ["TH02-1-GUI", "TH02-2-NHAN-LEO-THANG", "TH02-3C-QUAN-TRI-BAC"] },
  { ten: "TH02-dat-gap", th: "TH02-XE-CHUA-CHAY-DUOI-6-GIO", doi: ["TH02", "TH02-4"], buoc: [{ nhu: "TH02-1-GUI", id: "r-th02-dg" }, "TH02-4-DAT-GAP"] },
  { ten: "TH03", th: "TH03-VUOT-CHO-CHI-BAC", buoc: ["TH03-1-GUI", "TH03-2-NHAN-VUOT-CHO", "TH03-3A-QUAN-TRI-DUYET-BI-CHAN", "TH03-3B-SQL-TAY", "TH03-3C-QUAN-TRI-BAC"] },
  { ten: "TH04-A", th: "TH04-KHONG-NHAN-HOAC-QUA-GIO", buoc: ["TH04-4A-1-GUI", "TH04-4A-2-KHONG-NHAN-THIEU-LY-DO", "TH04-4A-3-KHONG-NHAN"] },
  { ten: "TH04-B", th: "TH04-KHONG-NHAN-HOAC-QUA-GIO", buoc: ["TH04-4B-1-GUI", "TH04-4B-2-QUA-10-PHUT-DOC", "TH04-4C-NHAN-MUON"] },
  { ten: "TH05", th: "TH05-NHO-HAI-XE-MOT-XE-NHAN", buoc: ["TH05-1-GUI-B", "TH05-2-GUI-C-CUNG-DIEM", "TH05-3-B-NHAN", "TH05-4-C-DOC", "TH05-5-C-NHAN"] },
  { ten: "TH05-5B", th: "TH05-NHO-HAI-XE-MOT-XE-NHAN", nenRieng: "TH07-CUU-HO-CO-NOI-GAP", doi: ["TH07"], buoc: ["TH05-5B-1-GUI-STOP-CHO-B", "TH05-5B-2-XE-A-HONG-GUI-ONBOARD-CHO-C", "TH05-5B-3-C-NHAN-CUU-HO", "TH05-5B-4-B-NHAN-MUON"] },
  { ten: "TH06", th: "TH06-NGUON-TOI-DIEM-TRUOC-TU-HUY", buoc: ["TH06-1-GUI", "TH06-2-A-DA-TOI", "TH06-3-B-NHAN"] },
  { ten: "TH07", th: "TH07-CUU-HO-CO-NOI-GAP", nenRieng: "TH07-CUU-HO-CO-NOI-GAP", doi: ["TH07"], buoc: ["TH07-1-GUI-ONBOARD", "TH07-2-C-NHAN", "TH07-3-A-KET-THUC-GIAN-DOAN", "TH07-4-C-TOI-NOI-GAP"] },
  { ten: "TH07-5", th: "TH07-CUU-HO-CO-NOI-GAP", nenRieng: "TH07-CUU-HO-CO-NOI-GAP", doi: ["TH07", "TH07-5"], buoc: ["TH07-5-NEU-C-CHUA-CHAY"] },
  { ten: "TH08", th: "TH08-VAN-PHONG-GUI-THAY-CUU-HO", nenRieng: "TH07-CUU-HO-CO-NOI-GAP", doi: ["TH07"], buoc: ["TH08-1-VP-GUI-THAY", "TH08-2-VP-GUI-STOP-BI-CHAN", "TH08-3-KE-TOAN-GUI-THAY", "TH08-4A-BAN-HANG-NHAN-THAY", "TH08-4B-QUAN-TRI-NHAN-THAY", "TH08-4C-TOAN-QUYEN-NHAN-THAY", "TH08-4D-SQL-TAY-NHAN-THAY", "TH08-5-C-NHAN"] },
  { ten: "TH09-9A", th: "TH09-SAI-CAM-KET-CHO-QUAN-TRI", nenRieng: "9A", doi: ["9A"], buoc: ["TH09-9A-1-GUI", "TH09-9A-2-NHAN", "TH09-9A-3-QUAN-TRI-DUYET"] },
  { ten: "TH09-9B", th: "TH09-SAI-CAM-KET-CHO-QUAN-TRI", nenRieng: "9B", doi: ["9B"], buoc: ["TH09-9B-1-GUI", "TH09-9B-2-NHAN"] },
  { ten: "TH10-A", th: "TH10-NHO-CHEO", buoc: ["TH10-1-A-GUI-MUONG-THANH", "TH10-2-B-GUI-ALIBU", "TH10-10A-3-B-NHAN-TRUOC", "TH10-10A-4-A-NHAN-SAU"] },
  { ten: "TH10-B", th: "TH10-NHO-CHEO", buoc: ["TH10-1-A-GUI-MUONG-THANH", "TH10-2-B-GUI-ALIBU", "TH10-10B-3-A-NHAN-TRUOC", "TH10-10B-4-B-NHAN-SAU", "TH10-10B-5-QUAN-TRI-DUYET-SAU-KHI-A-BOT-KHACH", "TH10-10B-6-QUAN-TRI-BAC", "TH10-10B-7-B-GUI-LAI", "TH10-10B-8-A-NHAN-LAI"] },
];
const tinhHuong = (ma: string): Json => ca.cac_tinh_huong.find((t: Json) => t.ma === ma);
const buocCua = (ma: string): Json => ca.cac_tinh_huong.flatMap((t: Json) => t.cac_buoc).find((b: Json) => b.ma === ma);
function nenRiengCua(d: Duong): Json {
  if (!d.nenRieng) {
    const nr = tinhHuong(d.th).nen_rieng;
    return nr === null || typeof nr === "string" ? null : nr;
  }
  if (d.nenRieng === "9A" || d.nenRieng === "9B") return tinhHuong(d.th).nen_rieng[d.nenRieng];
  return tinhHuong(d.nenRieng).nen_rieng;
}

test(`ca mẫu ${TEP}: khuôn — chủ đã xác nhận (người + ngày); mã bước không trùng; mười tình huống; không dãy ≥ 8 chữ số; mọi bước nằm trên ít nhất một đường`, () => {
  assert.equal(ca.xac_nhan.trang_thai, "da_xac_nhan");
  assert.ok(ca.xac_nhan.nguoi && ca.xac_nhan.ngay);
  assert.equal(ca.cac_tinh_huong.length, 10);
  const ma = ca.cac_tinh_huong.flatMap((t: Json) => t.cac_buoc.map((b: Json) => b.ma));
  assert.equal(new Set(ma).size, ma.length);
  assert.doesNotMatch(readFileSync(join(GOC, TEP), "utf8"), /\d{8,}/, "không số điện thoại / số giấy tờ trong ca mẫu (khuôn src/dieu-phoi-ca-mau.test.ts)");
  const tren = new Set(DUONG.flatMap((d) => d.buoc.filter((x): x is string => typeof x === "string")));
  assert.deepEqual(ma.filter((m: string) => !tren.has(m)), [], "bước chưa nằm trên đường nào");
  for (const d of DUONG) for (const x of d.buoc) if (typeof x === "string") assert.ok(tinhHuong(d.th).cac_buoc.some((b: Json) => b.ma === x) || x.startsWith("TH05-5B"), `${d.ten}: ${x} không thuộc ${d.th}`);
});

test("ca mẫu: hai bước SQL_TAY chạy ở lớp CSDL (chuyen-khach-csdl.test.ts đọc đúng câu của tệp)", () => {
  for (const b of ca.cac_tinh_huong.flatMap((t: Json) => t.cac_buoc).filter((x: Json) => x.lenh === "SQL_TAY")) {
    assert.ok(CSDL_TEST.includes(`cauTay("${b.ma}")`), `${b.ma}: bài CSDL không chạy câu này`);
    assert.equal(b.dap_an.csdl, "RAISE");
  }
});

test("ca mẫu: nhãn lý do TU_CHOI_NHAN của nền — mỗi nhãn có mã gieo ở 0093 (\"Lý do khác\" ↔ \"Khác\" là chỗ lệch đã ghi, chờ chủ)", () => {
  for (const nhan of ca.nen.lyDo.TU_CHOI_NHAN) assert.ok(maTuChoi(nhan), nhan);
  assert.deepEqual(Object.keys(LY_DO_TU_CHOI).length, 4);
});

for (const d of DUONG) {
  test(`ca mẫu ${d.ten} (${d.th}): chạy từng bước qua luật thuần thật, so đáp án của chủ`, () => {
    const the = dung(nenCho(nenRiengCua(d), d.doi ?? []));
    for (const x of d.buoc) {
      if (typeof x !== "string") {
        const ra = chay(the, buocCua(x.nhu), { id: x.id });
        assert.ok(ra.http >= 200 && ra.http < 300, `${d.ten}: gửi giả như ${x.nhu} — ${JSON.stringify(ra)}`);
        continue;
      }
      const b = buocCua(x);
      if (b.lenh === "SQL_TAY") continue; // lớp CSDL — bài riêng ở trên
      so(the, b, chay(the, b));
    }
  });
}
