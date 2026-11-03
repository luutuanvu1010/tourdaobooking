// Mô hình đọc của thẻ Hướng dẫn: gộp mục theo vai (huong-dan.ts) và bài theo việc (huong-dan-bai-noi-dung.ts) thành danh sách bài; phần «Nền tảng tự điền»
// luôn tính từ mã (THANH_BEN, TRANG_TOI, MATRIX, hằng số), không gõ tay. Thuần, không I/O. Đặc tả docs/superpowers/specs/2026-11-03-huong-dan-muc-rieng/DAC-TA.md.
import { HUONG_DAN, phanTich, soChu, type DoanChu, type Khoi, type NhomHuongDan } from "./huong-dan.ts";
import { BAI_VIEC, type BaiViec } from "./huong-dan-bai-noi-dung.ts";
import { DAU_VAN } from "./huong-dan-dau-van.ts";
import { DON, XEP, type NoiMuc } from "./huong-dan-xep.ts";
import { THANH_BEN, TRANG, TRANG_TOI, type KhoaTrang } from "./muc-giao-dien.ts";
import { normName } from "./assignee-pick.ts";
import { MATRIX, PERMISSION_CODES, PERMISSION_LABEL, type PermissionCode } from "./permissions.ts";

export { BAI_VIEC, type BaiViec };

export interface MayDien {
  /** Tên màn; null = bài không gắn một màn. */
  readonly man: string | null;
  readonly duong: string | null;
  /** Câu chỉ đường, có thể rỗng. */
  readonly loiVao: string;
  readonly aiDung: readonly string[];
  readonly gioiHan: readonly string[];
  readonly nut: readonly string[];
}

export interface BaiHien {
  readonly id: string;
  readonly tieuDe: string;
  /** Dòng phụ ở danh sách: «Ở Đơn hàng». */
  readonly phu: string | null;
  /** Tên phần chứa bài, để nói kết quả tìm thuộc phần nào. */
  readonly thuoc: string;
  readonly moDau: string | null;
  readonly khoi: readonly Khoi[];
  readonly may: MayDien;
  readonly capNhat: { readonly ban: string; readonly ngay: string } | null;
  readonly doi: { readonly ban: string; readonly cau: string } | null;
}

export interface NhomViec { readonly ten: string; readonly bai: readonly BaiHien[] }
export interface PhanVai {
  readonly id: string;
  readonly tieuDe: string;
  readonly nhom: readonly NhomViec[];
  readonly batDauNhanh: { readonly id: string; readonly tieuDe: string; readonly phut: number; readonly khoi: readonly Khoi[] };
}

const lamSlug = (s: string): string => normName(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const idMuc = (nhom: string, tieuDe: string): string => `${nhom}/${lamSlug(tieuDe)}`;
export const idBai = (b: BaiViec): string => `viec/${b.id}`;
export const idBatDau = (nhom: string): string => `${nhom}/bat-dau-nhanh`;

const NHAN_TOI: ReadonlyMap<KhoaTrang, string> = new Map(TRANG_TOI.map((m) => [m.trang as KhoaTrang, m.nhan]));
const nhanTrang = (k: KhoaTrang): string => THANH_BEN.find((m) => m.trang === k)?.nhan ?? NHAN_TOI.get(k) ?? "";
const chuHoaDau = (s: string): string => s.charAt(0) + s.slice(1).toLowerCase();

/** Câu chỉ đường, tính từ bảng menu: đổi chỗ một mục menu thì câu này đổi theo. */
export function loiVao(k: KhoaTrang): string {
  const ben = THANH_BEN.find((m) => m.trang === k);
  const phan: string[] = [];
  if (ben) {
    const nhom = ben.nhom === "HẰNG NGÀY" || ben.nhom === "CHÂN MENU" ? "" : ` › ${chuHoaDau(ben.nhom)}`;
    phan.push(`Máy tính: thanh bên${nhom} › ${ben.nhan}.`);
  }
  const toi = NHAN_TOI.get(k);
  if (toi) phan.push(`Điện thoại: Tôi › ${toi}.`);
  return phan.join(" ");
}

/** Các vai được dùng, đọc thẳng từ bản đồ quyền. Ô có phạm vi (ví dụ chỉ đơn mình phụ trách) cũng tính là dùng được. */
export function vaiDung(o: readonly (keyof typeof MATRIX)[]): PermissionCode[] {
  return PERMISSION_CODES.filter((p) => o.some((op) => (MATRIX[op] as Record<string, string>)[p] !== "none"));
}

export const thayBaiViec = (b: BaiViec, perms: readonly PermissionCode[]): boolean => {
  const duoc = vaiDung(b.o);
  return perms.some((p) => duoc.includes(p));
};

function nutTrong(khoi: readonly Khoi[]): string[] {
  const out = new Set<string>();
  const doan = (d: readonly DoanChu[]): void => { for (const x of d) if (x.k === "nut") out.add(x.t); };
  for (const k of khoi) {
    if (k.k === "tieuDe" || k.k === "doan" || k.k === "ghiChu") doan(k.t);
    else if (k.k === "dsSo" || k.k === "dsCham") k.muc.forEach(doan);
    else { k.dau.forEach(doan); k.hang.forEach((h) => h.forEach(doan)); }
  }
  return [...out];
}

function baiTuViec(b: BaiViec): BaiHien {
  const khoi = phanTich(b.noiDung);
  const dv = DAU_VAN[b.id];
  return {
    id: idBai(b), tieuDe: b.tieuDe, phu: `Ở ${nhanTrang(b.trang)}`, thuoc: "Bài theo việc", moDau: b.moDau, khoi,
    may: { man: nhanTrang(b.trang), duong: TRANG[b.trang].duong, loiVao: loiVao(b.trang), aiDung: vaiDung(b.o).map((p) => PERMISSION_LABEL[p]), gioiHan: b.gioiHan, nut: nutTrong(khoi) },
    capNhat: dv ? { ban: dv.ban, ngay: dv.ngay } : null,
    doi: b.doiO ?? null,
  };
}

function baiTuMuc(n: NhomHuongDan, tieuDe: string, noiDung: string, noi: NoiMuc): BaiHien {
  const khoi = phanTich(noiDung);
  const k = noi && noi !== DON ? noi : null;
  const phu = noi === DON ? "Ở trang đơn" : k ? `Ở ${nhanTrang(k)}` : null;
  return {
    id: idMuc(n.id, tieuDe), tieuDe, phu, thuoc: tenNhom(n), moDau: null, khoi,
    may: { man: k ? nhanTrang(k) : noi === DON ? "Trang đơn" : null, duong: k ? TRANG[k].duong : null, loiVao: k ? loiVao(k) : "", aiDung: [], gioiHan: [], nut: nutTrong(khoi) },
    capNhat: null,
    doi: null,
  };
}

const tenNhom = (n: NhomHuongDan): string => (n.quyen.length === 0 ? "Phần chung" : n.tieuDe);

/** Một nhóm theo vai → phần hiển thị. Mục chưa xếp ở XEP vẫn hiện, ở nhóm «Khác», để mục mới không bao giờ mất (bài kiểm vẫn đỏ để nhắc xếp). */
export function phanCuaNhom(n: NhomHuongDan): PhanVai {
  const xep = XEP[n.id] ?? {};
  const theoTen = new Map(n.muc.map((m) => [m.tieuDe, m.noiDung]));
  const daDung = new Set<string>();
  const nhom: { ten: string; bai: BaiHien[] }[] = [];
  for (const [ten, ds] of Object.entries(xep)) {
    const bai: BaiHien[] = [];
    for (const [tieuDe, noi] of ds) {
      const nd = theoTen.get(tieuDe);
      if (nd === undefined) continue;
      daDung.add(tieuDe);
      bai.push(baiTuMuc(n, tieuDe, nd, noi));
    }
    if (bai.length) nhom.push({ ten, bai });
  }
  const con = n.muc.filter((m) => !daDung.has(m.tieuDe));
  if (con.length) nhom.push({ ten: "Khác", bai: con.map((m) => baiTuMuc(n, m.tieuDe, m.noiDung, null)) });
  const khoi = phanTich(n.batDauNhanh);
  const chu = soChu(n.batDauNhanh);
  return { id: n.id, tieuDe: tenNhom(n), nhom, batDauNhanh: { id: idBatDau(n.id), tieuDe: `Bắt đầu nhanh cho ${tenNhom(n)}`, phut: Math.max(1, Math.ceil(chu / 150)), khoi } };
}

export interface DanhSachHuongDan { readonly vai: readonly PhanVai[]; readonly chung: PhanVai }

/** Danh sách theo bộ quyền: phần của vai trước, Phần chung sau; bài theo việc người này dùng được xếp vào phần vai đầu tiên. */
export function danhSach(perms: readonly PermissionCode[]): DanhSachHuongDan {
  const chung = phanCuaNhom(HUONG_DAN.find((n) => n.quyen.length === 0)!);
  const vai = HUONG_DAN.filter((n) => n.quyen.length > 0 && n.quyen.some((q) => perms.includes(q))).map(phanCuaNhom);
  const them = BAI_VIEC.filter((b) => thayBaiViec(b, perms)).map((b) => ({ ten: b.nhomViec, bai: baiTuViec(b) }));
  const dich = vai[0] ?? chung;
  const nhom = dich.nhom.map((g) => ({ ten: g.ten, bai: [...g.bai] }));
  for (const t of them) {
    const g = nhom.find((x) => x.ten === t.ten);
    if (g) g.bai.push(t.bai);
    else {
      // Nhóm mới đứng trước «Khi vướng» để việc cần làm ở trên, chỗ hỏi ở dưới.
      const i = nhom.findIndex((x) => x.ten === "Khi vướng");
      nhom.splice(i < 0 ? nhom.length : i, 0, { ten: t.ten, bai: [t.bai] });
    }
  }
  const moi: PhanVai = { ...dich, nhom };
  return vai.length ? { vai: [moi, ...vai.slice(1)], chung } : { vai: [], chung: moi };
}

/** Mọi bài của mọi vai: để mở một bài theo id, và để máy canh duyệt. */
export function moiBai(): BaiHien[] {
  const out: BaiHien[] = [];
  for (const n of HUONG_DAN) for (const g of phanCuaNhom(n).nhom) out.push(...g.bai);
  out.push(...BAI_VIEC.map(baiTuViec));
  return out;
}

/** Bài nào thuộc danh sách của bộ quyền này. */
export const trongDanhSach = (d: DanhSachHuongDan, id: string): boolean =>
  [...d.vai, d.chung].some((p) => p.batDauNhanh.id === id || p.nhom.some((g) => g.bai.some((b) => b.id === id)));

/** Bài dựng từ «Bắt đầu nhanh» của một nhóm, mở bằng «Đọc hết phần này». */
export function baiBatDau(p: PhanVai): BaiHien {
  return {
    id: p.batDauNhanh.id, tieuDe: p.batDauNhanh.tieuDe, phu: null, thuoc: p.tieuDe, moDau: null, khoi: p.batDauNhanh.khoi,
    may: { man: null, duong: null, loiVao: "", aiDung: [], gioiHan: [], nut: nutTrong(p.batDauNhanh.khoi) }, capNhat: null, doi: null,
  };
}

/** Bài theo việc dưới dạng một nhóm hướng dẫn: để luật nội dung và bài A2, A3 duyệt chung một đường. */
export const NHOM_BAI_VIEC: NhomHuongDan = {
  id: "bai-viec", tieuDe: "Bài theo việc", quyen: [], gioiThieu: "Bài theo việc.", batDauNhanh: "Bài theo việc.",
  muc: BAI_VIEC.map((b) => ({ tieuDe: b.tieuDe, noiDung: `${b.moDau}\n\n${b.noiDung}` })),
};

/** Bài có nên hiện dải «vừa đổi» ở bản đang chạy không. */
export const vuaDoi = (b: Pick<BaiHien, "doi">, banDangChay: string): boolean => b.doi?.ban === banDangChay;

// ---------------------------------------------------------------- tìm

export interface DoanKhop { readonly muc: string; readonly khoi: number; readonly doan: readonly DoanChu[] }
export interface KetQuaBai { readonly bai: BaiHien; readonly doan: readonly DoanKhop[] }

export const tachTuTim = (q: string): string[] => normName(q).split(/\s+/).filter(Boolean);

const chuPhang = (d: readonly DoanChu[]): string => normName(d.map((x) => x.t).join(""));

/** Các đoạn của một khối, mỗi dòng danh sách hay hàng bảng là một đoạn. */
function doanCuaKhoi(k: Khoi): (readonly DoanChu[])[] {
  if (k.k === "doan" || k.k === "ghiChu") return [k.t];
  if (k.k === "dsSo" || k.k === "dsCham") return [...k.muc];
  if (k.k === "bang") return k.hang.map((h) => h.flatMap((o, i) => (i === 0 ? [...o, { k: "chu" as const, t: ": " }] : [...o])));
  return [];
}

/** Tìm trên máy trong đúng danh sách người xem thấy. Mọi từ gõ phải có trong một đoạn; bỏ dấu khi so. Xếp: khớp tên bài, rồi có nguyên cụm từ gõ, rồi thứ tự danh sách. */
export function timBai(d: DanhSachHuongDan, q: string): KetQuaBai[] {
  const tu = tachTuTim(q);
  if (!tu.length) return [];
  const cum = tu.join(" ");
  const out: (KetQuaBai & { diem: number })[] = [];
  const daXet = new Set<string>();
  for (const p of [...d.vai, d.chung]) {
    for (const g of p.nhom) for (const bai of g.bai) {
      if (daXet.has(bai.id)) continue;
      daXet.add(bai.id);
      const doan: DoanKhop[] = [];
      let muc = bai.tieuDe;
      const khopTen = tu.every((t) => normName(bai.tieuDe).includes(t));
      bai.khoi.forEach((k, i) => {
        if (k.k === "tieuDe") { muc = k.t.map((x) => x.t).join(""); return; }
        for (const dc of doanCuaKhoi(k)) if (tu.every((t) => chuPhang(dc).includes(t))) doan.push({ muc, khoi: i, doan: dc });
      });
      // Đoạn có nguyên cụm từ gõ lên trước; sort giữ nguyên thứ tự trong bài cho các đoạn còn lại.
      doan.sort((a, b) => Number(chuPhang(b.doan).includes(cum)) - Number(chuPhang(a.doan).includes(cum)));
      if (doan.length || khopTen) out.push({ bai, doan, diem: (khopTen ? 2 : 0) + (doan.some((x) => chuPhang(x.doan).includes(cum)) ? 1 : 0) });
    }
  }
  return out.sort((a, b) => b.diem - a.diem).map(({ bai, doan }) => ({ bai, doan }));
}

/** Tách chuỗi thành khúc thường / khúc khớp để tô. So trên bản bỏ dấu, cắt trên chuỗi gốc theo từng ký tự. */
export function khucTo(s: string, tu: readonly string[]): { readonly t: string; readonly khop: boolean }[] {
  const ky = [...s];
  const phang = ky.map((c) => normName(c));
  let ghep = "";
  const vi: number[] = [];
  phang.forEach((p, i) => { for (let j = 0; j < p.length; j++) vi.push(i); ghep += p; });
  const to = new Array<boolean>(ky.length).fill(false);
  for (const t of tu) {
    for (let at = ghep.indexOf(t); at >= 0; at = ghep.indexOf(t, at + 1)) for (let j = at; j < at + t.length; j++) to[vi[j]!] = true;
  }
  const out: { t: string; khop: boolean }[] = [];
  ky.forEach((c, i) => {
    const cuoi = out[out.length - 1];
    if (cuoi && cuoi.khop === to[i]) cuoi.t += c;
    else out.push({ t: c, khop: to[i]! });
  });
  return out;
}
