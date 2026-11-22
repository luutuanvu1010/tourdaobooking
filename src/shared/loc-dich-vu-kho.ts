// Bộ lọc DÙNG CHUNG của màn Kho vé điện tử (kế hoạch 16 việc 21/11/2026, Việc 4): nhóm dịch vụ (chọn MỘT, "" = Tất cả) + chữ tìm KHÔNG phân biệt dấu
// (tên dịch vụ, mã; với lô thêm tên in trên vé). MỘT luật cho ba khối: «Số vé còn» và «Lô đã huỷ gần đây» lọc ở trình duyệt (`khopBoLoc`); «Lô trong kho»
// chia trang nên lọc ở MÁY CHỦ (route GET /api/ve/lo?tatCa=1 đọc `docThamSoLo`, khớp bằng `khopDieuKien`) — hai hàm cho cùng kết quả (bài kiểm ép).
// Bảng mã → nhóm dựng một lần từ /api/catalog (cùng nhóm với bộ chọn dịch vụ của bước nhập lô); mã không nhóm hoặc đã rời danh mục là «Chưa phân loại».
// Máy chủ không tự tra nhóm: trang gửi DANH SÁCH MÃ (nhóm thật → `ma` = các mã thuộc nhóm; «Chưa phân loại» → `boMa` = các mã đã có nhóm thật), nên mã đã rời
// danh mục (trang không biết tên) vẫn rơi đúng vào «Chưa phân loại». Thuần, không I/O. Giao diện: web/loc-dich-vu-kho-ui.ts, web/ve-kho.ts.
import { CHUA_PHAN_LOAI } from "./loc-danh-muc.ts";
import { CATALOG_CODE_RE } from "./order-lines.ts";
import { khopTen } from "./so-cong-no-hien-thi.ts";

/** Bộ lọc đang chọn: `nhom` là "" (Tất cả), mã nhóm, hoặc CHUA_PHAN_LOAI. */
export interface BoLocDv {
  readonly nhom: string;
  readonly tim: string;
}
export const BO_LOC_TRONG: BoLocDv = { nhom: "", tim: "" };
export const dangLoc = (l: BoLocDv): boolean => l.nhom !== "" || l.tim.trim() !== "";

/** Mã dịch vụ → mã nhóm (hoặc CHUA_PHAN_LOAI). */
export type BangNhom = ReadonlyMap<string, string>;
export const bangNhomTheoMa = (items: readonly { code: string; groupCode: string | null }[]): BangNhom => new Map(items.map((i) => [i.code, i.groupCode ?? CHUA_PHAN_LOAI]));
export const nhomCuaMa = (bang: BangNhom, ma: string): string => bang.get(ma) ?? CHUA_PHAN_LOAI;

/** Chữ tìm khớp MỘT trong các chữ (bỏ dấu, không phân biệt hoa thường — `khopTen`); chữ tìm trống khớp mọi dòng. */
export const khopChuTim = (chu: readonly (string | null | undefined)[], tim: string): boolean =>
  tim.trim() === "" || chu.some((c) => typeof c === "string" && khopTen(c, tim));

/** Một dòng của khối: mã dịch vụ và các chữ được tìm (tên dịch vụ, tên in trên vé…). Mã cũng được tìm. */
export interface DongLoc {
  readonly ma: string;
  readonly chu: readonly (string | null | undefined)[];
}

/** Bộ lọc ở trình duyệt: nhóm VÀ chữ tìm. */
export const khopBoLoc = (d: DongLoc, loc: BoLocDv, bang: BangNhom): boolean => (loc.nhom === "" || nhomCuaMa(bang, d.ma) === loc.nhom) && khopChuTim([d.ma, ...d.chu], loc.tim);

// ---- Điều kiện gửi máy chủ (khối «Lô trong kho») ----
/** Trần số mã trong một tham số và độ dài chữ tìm (địa chỉ không phình vô hạn). Danh mục hôm nay ~120 dịch vụ. */
export const TOI_DA_MA_LOC = 1000;
export const TOI_DA_CHU_TIM = 100;

/** `ma`: chỉ các mã này (null = không giới hạn); `boMa`: trừ các mã này (null = không trừ); `tim`: chữ tìm đã cắt khoảng trắng hai đầu. */
export interface DieuKienLo {
  readonly ma: ReadonlySet<string> | null;
  readonly boMa: ReadonlySet<string> | null;
  readonly tim: string;
}

/** Đổi bộ lọc sang điều kiện danh sách mã: nhóm thật → `ma`; «Chưa phân loại» → `boMa` (mọi mã có nhóm thật); Tất cả → không giới hạn nhóm. */
export function dieuKienLo(bang: BangNhom, loc: BoLocDv): DieuKienLo {
  const tim = loc.tim.trim();
  if (loc.nhom === "") return { ma: null, boMa: null, tim };
  const coNhomThat = [...bang].filter(([, nhom]) => nhom !== CHUA_PHAN_LOAI);
  if (loc.nhom === CHUA_PHAN_LOAI) return { ma: null, boMa: new Set(coNhomThat.map(([ma]) => ma)), tim };
  return { ma: new Set(coNhomThat.filter(([, nhom]) => nhom === loc.nhom).map(([ma]) => ma)), boMa: null, tim };
}

/** Khớp điều kiện danh sách mã (máy chủ). Cho cùng kết quả với `khopBoLoc(d, loc, bang)` khi `dk = dieuKienLo(bang, loc)`. */
export const khopDieuKien = (d: DongLoc, dk: DieuKienLo): boolean => (dk.ma === null || dk.ma.has(d.ma)) && (dk.boMa === null || !dk.boMa.has(d.ma)) && khopChuTim([d.ma, ...d.chu], dk.tim);

/** Cặp tham số truy vấn của điều kiện (mã nối bằng dấu phẩy — mã danh mục không chứa dấu phẩy, `CATALOG_CODE_RE`). Không lọc gì ⇒ mảng rỗng. */
export function thamSoLo(dk: DieuKienLo): [string, string][] {
  const ra: [string, string][] = [];
  if (dk.ma !== null) ra.push(["ma", [...dk.ma].join(",")]);
  if (dk.boMa !== null) ra.push(["boMa", [...dk.boMa].join(",")]);
  if (dk.tim !== "") ra.push(["tim", dk.tim]);
  return ra;
}

/** Đọc điều kiện từ tham số truy vấn. Không có tham số lọc nào (hoặc chỉ chữ tìm trắng) ⇒ null; mã sai dạng, quá trần, chữ quá dài, hay `ma` cùng `boMa` ⇒ "sai". */
export function docThamSoLo(sp: URLSearchParams): DieuKienLo | null | "sai" {
  const doc = (ten: string): Set<string> | null | "sai" => {
    const raw = sp.get(ten);
    if (raw === null) return null;
    const ds = raw === "" ? [] : raw.split(",");
    if (ds.length > TOI_DA_MA_LOC || !ds.every((m) => CATALOG_CODE_RE.test(m))) return "sai";
    return new Set(ds);
  };
  const ma = doc("ma");
  const boMa = doc("boMa");
  const tim = (sp.get("tim") ?? "").trim();
  if (ma === "sai" || boMa === "sai" || (ma !== null && boMa !== null) || tim.length > TOI_DA_CHU_TIM) return "sai";
  if (ma === null && boMa === null && tim === "") return null;
  return { ma, boMa, tim };
}

// ---- Hàng nút nhóm ----
/** Nút nhóm theo thứ tự: «Tất cả», các nhóm theo thứ tự danh mục, «Chưa phân loại» (khi cần). Danh mục không có nhóm ⇒ không có hàng nút. */
export function cacNutNhom(groups: readonly { code: string; name: string }[], coChuaPhanLoai: boolean): { ma: string; ten: string }[] {
  if (groups.length === 0) return [];
  return [{ ma: "", ten: "Tất cả" }, ...groups.map((g) => ({ ma: g.code, ten: g.name })), ...(coChuaPhanLoai ? [{ ma: CHUA_PHAN_LOAI, ten: "Chưa phân loại" }] : [])];
}

/** Cần nút «Chưa phân loại» khi danh mục có dịch vụ không nhóm, hoặc một dòng đang biết (số vé còn, lô đã huỷ) mang mã ngoài danh mục. */
export const coChuaPhanLoai = (bang: BangNhom, maDaBiet: readonly string[]): boolean =>
  [...bang.values()].includes(CHUA_PHAN_LOAI) || maDaBiet.some((ma) => !bang.has(ma));
