// Lọc dịch vụ trong ô "Chọn từ danh mục" khi lập đơn. Thuần, không I/O.
// Đợt 1 (13/10/2026, ý chủ dự án: "bỏ hết sự rườm rà, chỉ để lại việc lọc theo nhóm sản phẩm bằng nút xổ xuống + tick chọn"): chỉ còn HAI cách thu hẹp danh sách —
// ô gõ (tên hoặc mã) và nút xổ xuống "Nhóm dịch vụ" (tick MỘT hay NHIỀU nhóm; không tick = tất cả; VÀ với ô gõ). Các bộ lọc cũ (★ Hay dùng, Theo người, Giá theo nhóm; góp ý YC-0003,
// ADR-0058 Đ8 dạng hàng chip một nhóm) đã bỏ. Dấu sao ☆/★ ở đầu dòng GIỮ LẠI và có tác dụng: dịch vụ đã gắn sao xếp lên trước (giả định của người thi công, chủ chưa nói).
// Hạn chế nhóm theo vai (ADR-0033, ADR-0058) vẫn do máy chủ quyết qua danh mục /api/catalog/for-order; ở đây không lọc thêm theo vai.

const TOI_DA_GHIM = 200;

/** Nhớ trên máy: các mã đã gắn sao. (Bản nhớ cũ còn trường `loc` — bộ lọc "Hay dùng" / "Theo người" / "Giá theo nhóm" — bị bỏ qua khi đọc.) */
export interface NhoDanhMuc {
  ghim: string[];
}
export const NHO_DANH_MUC_TRONG: NhoDanhMuc = { ghim: [] };

/** Danh mục sau ô tìm (tên hoặc mã); giữ thứ tự danh mục. */
export function locDanhMuc<T extends { code: string; name: string }>(ds: readonly T[], o: { kim: string }): T[] {
  const kim = o.kim.trim().toLowerCase();
  return ds.filter((c) => !kim || c.name.toLowerCase().includes(kim) || c.code.toLowerCase().includes(kim));
}

/** Bật / tắt sao một dịch vụ. Thêm vượt TOI_DA_GHIM thì bỏ mã cũ nhất (mã mới giữ), để lúc đọc lại không cắt mất mã vừa gắn. */
export const doiGhim = (ghim: readonly string[], code: string): string[] => (ghim.includes(code) ? ghim.filter((c) => c !== code) : [...ghim, code].slice(-TOI_DA_GHIM));

/** Dịch vụ đã gắn sao xếp lên trước; giữ nguyên thứ tự cũ trong từng phần (ổn định). Không sửa mảng đầu vào. */
export function xepGhimTruoc<T extends { code: string }>(ds: readonly T[], ghim: readonly string[]): T[] {
  const set = new Set(ghim);
  return [...ds.filter((c) => set.has(c.code)), ...ds.filter((c) => !set.has(c.code))];
}

/** Đọc bản nhớ mã đã gắn sao (chuỗi JSON từ bộ nhớ trình duyệt); hỏng / sai dạng → trống. Trường `loc` của bản cũ được bỏ qua (không còn bộ lọc nào để mắc kẹt). */
export function docNhoDanhMuc(raw: string | null): NhoDanhMuc {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== "object" || Array.isArray(v)) return NHO_DANH_MUC_TRONG;
    const ghim = (v as Record<string, unknown>).ghim;
    if (!Array.isArray(ghim) || !ghim.every((x) => typeof x === "string")) return NHO_DANH_MUC_TRONG;
    return { ghim: [...new Set(ghim as string[])].slice(0, TOI_DA_GHIM) };
  } catch {
    return NHO_DANH_MUC_TRONG;
  }
}

// ---- Nhóm dịch vụ (ADR-0058 Đ8) ----
/** Giá trị dòng "Chưa phân loại" (dịch vụ `groupCode === null`). Mã nhóm thật là chữ in hoa (ctl_group.code) nên không trùng. */
export const CHUA_PHAN_LOAI = "chua-phan-loai";
/** Các nhóm đang tick (mã nhóm hoặc CHUA_PHAN_LOAI). Rỗng = không lọc = tất cả. */
export type ChonNhom = readonly string[];

/** Chỉ giữ dịch vụ thuộc MỘT TRONG các nhóm đã tick; rỗng = không lọc. Áp cùng ô tìm (VÀ); giữ thứ tự danh mục. Nhóm không tồn tại: không khớp dịch vụ nào, không lỗi. */
export function locTheoNhom<T extends { groupCode: string | null }>(ds: readonly T[], nhom: ChonNhom): T[] {
  if (nhom.length === 0) return [...ds];
  const set = new Set(nhom);
  return ds.filter((c) => set.has(c.groupCode ?? CHUA_PHAN_LOAI));
}

/** Tick / bỏ tick một nhóm (không trùng). Không sửa mảng đầu vào. */
export const doiNhom = (nhom: ChonNhom, ma: string): string[] => (nhom.includes(ma) ? nhom.filter((x) => x !== ma) : [...nhom, ma]);

/** Số dịch vụ theo từng nhóm; dịch vụ không nhóm đếm vào CHUA_PHAN_LOAI (dùng để biết có hiện dòng "Chưa phân loại" không). */
export function demTheoNhom(ds: readonly { groupCode: string | null }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of ds) {
    const k = c.groupCode ?? CHUA_PHAN_LOAI;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Khoá bộ nhớ trình duyệt của các nhóm đã tick — THEO TÀI KHOẢN (hai người dùng chung máy không nhớ lẫn). */
export const khoaNhoNhom = (staffId: string): string => `loc-nhom-dv:${staffId}`;

/**
 * Đọc bản nhớ các nhóm đã tick (chuỗi JSON). Dạng mới: mảng mã. Dạng CŨ (hàng chip một nhóm): một chuỗi → đổi sang mảng một phần tử.
 * Mã không còn trong `groups` (nhóm bị tắt / đổi), mã lạ (vd "hay-dung" của bộ lọc đã bỏ) hoặc rác → bỏ; không còn gì → [] ("tất cả"). CHUA_PHAN_LOAI đọc được —
 * bên dựng danh sách tự bỏ nếu không còn dịch vụ chưa phân loại.
 */
export function docNhoNhom(raw: string | null, groups: readonly { code: string }[]): string[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null;
    const ds = typeof v === "string" ? [v] : Array.isArray(v) ? v : [];
    const hopLe = (x: unknown): x is string => typeof x === "string" && (x === CHUA_PHAN_LOAI || groups.some((gr) => gr.code === x));
    return [...new Set(ds.filter(hopLe))];
  } catch {
    return [];
  }
}

// ---- Hàng nhóm CHỌN MỘT, chia mục, nhãn đếm (thiết kế lại màn Tạo đơn, 18/10/2026) ----
/** Đọc bản nhớ nhóm dưới dạng MỘT nhóm: lấy nhóm hợp lệ đầu của `docNhoNhom` (bản nhớ cũ nhiều nhóm vẫn đọc được); "" = Tất cả. */
export const docNhoMotNhom = (raw: string | null, groups: readonly { code: string }[]): string => docNhoNhom(raw, groups)[0] ?? "";

/** Ghi nhóm đang chọn vào bản nhớ: giữ dạng mảng để tương thích bản đọc cũ; "" (Tất cả) → mảng rỗng. */
export const ghiNhoMotNhom = (ma: string): string[] => (ma === "" ? [] : [ma]);

/** Trạng thái hàng nhóm: nhóm đang chọn ("" = Tất cả), nhóm trước khi người dùng gõ tìm (để trả lại khi xoá chữ), và đã tự chạm thu hẹp lúc đang tìm chưa. */
export interface TrangThaiNhom {
  nhom: string;
  truocKhiTim: string | null;
  daThuHep: boolean;
}

/** Người dùng chạm một nhóm. Đang có chữ tìm thì đánh dấu là họ tự thu hẹp (xoá chữ sẽ không đè lựa chọn này). Không sửa đối tượng đầu vào. */
export const chamNhom = (tt: TrangThaiNhom, ma: string, dangTim: boolean): TrangThaiNhom => ({ ...tt, nhom: ma, daThuHep: dangTim ? true : tt.daThuHep });

/** Ô tìm đổi chữ. Trống→có chữ: nhớ nhóm hiện tại rồi về "Tất cả"; có→có: giữ nguyên; có→trống: trả nhóm đã nhớ (không có thì giữ nhóm hiện tại). */
export function doiChuTim(tt: TrangThaiNhom, chuCu: string, chuMoi: string): TrangThaiNhom {
  const cu = chuCu.trim() !== "";
  const moi = chuMoi.trim() !== "";
  if (!cu && moi) return { nhom: "", truocKhiTim: tt.nhom, daThuHep: false };
  if (cu && !moi) return { nhom: tt.truocKhiTim ?? tt.nhom, truocKhiTim: null, daThuHep: false };
  return tt;
}

/** Một mục của danh sách chia theo nhóm: `khoa` là "hay-dung", mã nhóm hoặc CHUA_PHAN_LOAI. */
export interface MucDanhMuc<T> {
  khoa: string;
  tieuDe: string;
  dong: T[];
}

/**
 * Chia danh sách thành mục: "★ Hay dùng" (nếu `hayDung` khác null) đứng đầu, rồi mục theo thứ tự `groups`, "Chưa phân loại" cuối cùng.
 * Dịch vụ có sao chỉ nằm ở mục Hay dùng, không lặp ở mục nhóm. Mục rỗng bỏ. Giữ thứ tự danh sách trong từng mục.
 */
export function chiaMuc<T extends { code: string; groupCode: string | null }>(ds: readonly T[], groups: readonly { code: string; name: string }[], hayDung: readonly string[] | null): MucDanhMuc<T>[] {
  const sao = new Set(hayDung ?? []);
  const muc: MucDanhMuc<T>[] = [];
  if (hayDung !== null) muc.push({ khoa: "hay-dung", tieuDe: "★ Hay dùng", dong: ds.filter((c) => sao.has(c.code)) });
  const con = ds.filter((c) => !sao.has(c.code));
  for (const gr of groups) muc.push({ khoa: gr.code, tieuDe: gr.name, dong: con.filter((c) => c.groupCode === gr.code) });
  muc.push({ khoa: CHUA_PHAN_LOAI, tieuDe: "Chưa phân loại", dong: con.filter((c) => c.groupCode === null) });
  return muc.filter((m) => m.dong.length > 0);
}

/** Mã nhóm (kể cả CHUA_PHAN_LOAI) còn ít nhất một dòng trong kết quả — để làm mờ nhóm hết kết quả. */
export const nhomConKetQua = (ds: readonly { groupCode: string | null }[]): ReadonlySet<string> => new Set(ds.map((c) => c.groupCode ?? CHUA_PHAN_LOAI));

/** Nhãn đếm dưới ô tìm: "114 dịch vụ" hoặc "23 dịch vụ · Thể thao biển". */
export const nhanDem = (n: number, tenNhom: string | null): string => `${n} dịch vụ${tenNhom ? ` · ${tenNhom}` : ""}`;
