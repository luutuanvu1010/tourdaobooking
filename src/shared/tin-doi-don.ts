// TIN "ĐƠN ĐỔI SAU XÁC NHẬN" (ADR-0062 Đ2) — khuôn chữ nhật ký là HỢP ĐỒNG giữa hàm viết và hàm đọc. Thuần, không I/O, không import src/modules/.
// - Hàm VIẾT đoạn số khách: `doanSoKhach` + `ghepLyDo` (route sửa số khách — lý do tự gõ LUÔN ở cuối, sau " · lý do: ").
// - Hàm ĐỌC: `phanDoiCuaTin` — ngữ pháp chặt (nhãn cố định + giá trị đã kiểm dạng); KHÔNG BAO GIỜ in một mẩu chữ thô của `detail` (tên dịch vụ, chữ nơi,
//   lý do). `detail` chỉ quyết CÓ tin hay không và CÂU tin — không quyết AI nhận (ADR-0062 Đ2, ADR-0052 D6.1).
// Bài canh: tin-doi-don.test.ts (khứ hồi moTaChang, kemDatGap, đoạn số khách + bộ đối kháng) và src/modules/orders/tin-doi-khu-hoi.test.ts (describeTripChange).
import { CHIEU_LABEL, DAU_DAT_GAP, KHUON_SO_HIEU_CHUYEN_BAY, LY_DO_DAT_GAP } from "./chang-dua-don.ts";
import { PAX_LABEL, PAX_ORDER, type PaxCode, type PaxCounts } from "./order-lines.ts";
import { NHAN_GIO, NHAN_TRUONG_THOI_GIAN } from "./truong-thoi-gian.ts";

/** Đầu đoạn số khách (dấu hai chấm NGAY sau "khách" — khác tiền tố "số khách đi xe " của ADR-0065) và dấu tách lý do. */
export const DAU_SO_KHACH = "số khách: ";
export const DAU_LY_DO = " · lý do: ";
/** Chữ `detail` route `PUT /trip` ghi khi lệnh chỉ đổi chặng mà không mô tả được (src/modules/orders/index.ts). */
export const CAP_NHAT_CHANG = "cập nhật chặng đưa đón";
/** Nhãn cố định thay tên dịch vụ nhập tay (chữ người dùng gõ — có thể chứa tên, SĐT khách). */
export const DICH_VU_NHAP_TAY = "dịch vụ nhập tay";

const nhanKhach = (c: PaxCode) => PAX_LABEL[c].toLocaleLowerCase("vi-VN");

/**
 * Đoạn đầu có khuôn của `detail` lần sửa số khách: "số khách: <tên danh mục | dịch vụ nhập tay>: người lớn 4 → 3, trẻ em 1 → 0 | …". Chỉ dịch vụ có số đổi,
 * chỉ loại khách đổi (thứ tự PAX_ORDER). Tên chỉ khi dịch vụ có mã danh mục; còn lại nhãn cố định.
 */
export function doanSoKhach(
  before: readonly { serviceId: string; pax: PaxCounts }[],
  after: readonly { serviceId: string; pax: PaxCounts }[],
  services: readonly { id: string; catalogCode: string | null; name: string }[],
): string {
  const truoc = new Map(before.map((b) => [b.serviceId, b.pax] as const));
  const dv = new Map(services.map((s) => [s.id, s] as const));
  const khuc = after.flatMap((a) => {
    const t = truoc.get(a.serviceId);
    if (!t) return [];
    const doi = PAX_ORDER.filter((c) => t[c] !== a.pax[c]).map((c) => `${nhanKhach(c)} ${t[c]} → ${a.pax[c]}`);
    if (!doi.length) return [];
    const s = dv.get(a.serviceId);
    const ten = s && s.catalogCode !== null ? s.name : DICH_VU_NHAP_TAY;
    return [`${ten}: ${doi.join(", ")}`];
  });
  return `${DAU_SO_KHACH}${khuc.join(" | ")}`;
}

/** Ghép đoạn có khuôn với lý do tự gõ — lý do LUÔN ở cuối (hàm đọc cắt tại lần xuất hiện ĐẦU TIÊN của " · lý do: "). */
export const ghepLyDo = (doan: string, lyDo: string): string => `${doan}${DAU_LY_DO}${lyDo}`;

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// HÀM ĐỌC

/**
 * Kết quả đọc một dòng nguồn. `null` = dòng không có tin (không qua bộ lọc nguồn, hoặc chỉ đổi trường không thuộc tin: ghi chú, nơi check-in, nơi trả…).
 * `gioHen` = lần đổi CÓ (hoặc có thể có — câu chung) đổi ngày / giờ đón của chặng: dùng cho tin MQ-07 (ADR-0052 D6.2); chỉ `order_leg_updated` đặt true.
 */
export type PhanDoiTin =
  | { loai: "cu-the"; phan: string; gioHen: boolean }
  | { loai: "chung"; cau: "chang" | "so-khach"; gioHen: boolean };

/**
 * Tập các KẾT QUẢ (phần giữ lại) của mọi cách phân tích phần còn lại. Kết quả CHUẨN HOÁ: phần trùng bỏ (giữ lần đầu) — hai dịch vụ đổi cùng một giờ không
 * làm hai cách đọc "khác nhau". KHÔNG cắt tập giữa chừng (cắt + chuẩn hoá có thể nhập hai kết quả khác nhau thành một): quá TRAN kết quả ⇒ ném QUA_NHIEU ⇒
 * câu chung.
 */
type Tap = Set<string>;
const TRAN = 256;
const QUA_NHIEU = new Error("qua_nhieu_cach_doc");
const hop = (a: Tap, b: Iterable<string>) => {
  for (const x of b) {
    a.add(x);
    if (a.size > TRAN) throw QUA_NHIEU;
  }
};
const SEP = "\u0001"; // ngăn cách các phần trong một kết quả (không bao giờ có trong câu tin)
/** Ghép phần giữ `dau` (rỗng = bỏ) trước kết quả `sau`, chuẩn hoá (bỏ phần trùng, giữ thứ tự lần đầu). */
const ghep = (dau: string, sau: string): string => [...new Set([dau, ...sau.split(SEP)].filter(Boolean))].join(SEP);

const NGAY_RE = /^\d{4}-\d{2}-\d{2}/;
const GIO_RE = /^\d{2}:\d{2}/;
const TRONG = "(trống)";
const MUI = " → ";

/** Giá trị ngày / giờ / "(trống)" đứng ĐẦU `s` → độ dài khớp, hoặc -1. */
function khopGiaTri(s: string, kieu: "ngay" | "gio"): number {
  if (s.startsWith(TRONG)) return TRONG.length;
  const m = (kieu === "ngay" ? NGAY_RE : GIO_RE).exec(s);
  return m ? m[0].length : -1;
}
const hienNgay = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : v);

/**
 * Phần "<nhãn> A → B" với A, B đã kiểm dạng, đứng tại vị trí `i` của `s`. Trả [vị trí sau phần, chữ câu tin] hoặc null. Chữ câu tin ghép từ NHÃN CỐ ĐỊNH +
 * giá trị đã kiểm dạng (ngày hiện dd/mm/yyyy) — không mẩu thô.
 */
function phanGiaTri(s: string, i: number, nhan: string, kieu: "ngay" | "gio"): [number, string] | null {
  if (!s.startsWith(`${nhan} `, i)) return null;
  let j = i + nhan.length + 1;
  const a = khopGiaTri(s.slice(j), kieu);
  if (a < 0) return null;
  const va = s.slice(j, j + a);
  j += a;
  if (!s.startsWith(MUI, j)) return null;
  j += MUI.length;
  const b = khopGiaTri(s.slice(j), kieu);
  if (b < 0) return null;
  const vb = s.slice(j, j + b);
  return [j + b, `${nhan} ${hienNgay(va)}${MUI}${hienNgay(vb)}`];
}

// ---- trip_updated (describeTripUpdates của orders): khúc "<tên>: <phần>, <phần>…" nối " | " -----------------------------------------------------------
// Phần giá trị: năm trường của dịch vụ (nhãn từ NHAN_TRUONG_THOI_GIAN). Phần chữ: "đổi điểm đón" (→ "đổi nơi đón"), "đổi nơi check-in", "đổi ghi chú" (bỏ).
const TRUONG_DV: readonly { nhan: string; kieu: "ngay" | "gio" }[] = (["departDate", "departTime", "pickupTime", "checkinDate", "checkinTime"] as const).map((k) => ({
  nhan: NHAN_TRUONG_THOI_GIAN[k], kieu: k.endsWith("Date") ? "ngay" as const : "gio" as const,
}));
const DOI_DIEM_DON = "đổi điểm đón";
const DOI_NOI_DON = "đổi nơi đón";
const CHU_DV_BO = ["đổi nơi check-in", "đổi ghi chú"] as const;

/** Một phần của khúc dịch vụ tại `i` → danh sách [vị trí sau phần, chữ giữ lại | null (bỏ)]. */
function phanDichVu(s: string, i: number): [number, string | null][] {
  const ra: [number, string | null][] = [];
  for (const t of TRUONG_DV) {
    const p = phanGiaTri(s, i, t.nhan, t.kieu);
    if (p) ra.push([p[0], NHAN_GIO.has(t.nhan) ? p[1] : null]);
  }
  if (s.startsWith(DOI_DIEM_DON, i)) ra.push([i + DOI_DIEM_DON.length, DOI_NOI_DON]);
  for (const c of CHU_DV_BO) if (s.startsWith(c, i)) ra.push([i + c.length, null]);
  return ra;
}

/** Đọc `s[i..]` = (các phần của một khúc) [" | " khúc tiếp]… tới hết chuỗi. Trả tập kết quả (phần giữ lại nối SEP). */
function docPhanDV(s: string, i: number, nho: Map<string, Tap>): Tap {
  const k = `p${i}`;
  const daCo = nho.get(k);
  if (daCo) return daCo;
  const ra: Tap = new Set();
  nho.set(k, ra);
  for (const [j, giu] of phanDichVu(s, i)) {
    const dau = giu === null ? "" : giu;
    const noi = (sau: Tap) => hop(ra, [...sau].map((x) => ghep(dau, x)));
    if (j === s.length) hop(ra, [dau]);
    else if (s.startsWith(", ", j)) noi(docPhanDV(s, j + 2, nho));
    else if (s.startsWith(" | ", j)) noi(docKhucDV(s, j + 3, nho));
  }
  return ra;
}

/** Đọc `s[i..]` = một hoặc nhiều khúc "<tên>: <phần>…" nối " | ". Tên là chữ bất kỳ (≥ 1 ký tự) kết thúc ở một ": " nào đó — bị BỎ. */
function docKhucDV(s: string, i: number, nho: Map<string, Tap>): Tap {
  const k = `k${i}`;
  const daCo = nho.get(k);
  if (daCo) return daCo;
  const ra: Tap = new Set();
  nho.set(k, ra);
  for (let j = s.indexOf(": ", i + 1); j >= 0; j = s.indexOf(": ", j + 1)) hop(ra, docPhanDV(s, j + 2, nho));
  return ra;
}

// ---- order_leg_updated (moTaChang): "<Chiều đi|Chiều về> · <tên>: <phần>; <phần>…" ------------------------------------------------------------------
// Phần giá trị: ngày đón, giờ đón (nhãn từ NHAN_TRUONG_THOI_GIAN — giữ). Phần chữ tự do: "nơi đón A → B" (→ "đổi nơi đón", KHÔNG kèm chữ — câu 6 của chủ),
// "nơi trả A → B" (bỏ). Phần phụ có khuôn (bỏ): số hiệu chuyến bay, số người chiều về, xe riêng, xe tối thiểu.
const NOI_DON = "nơi đón ";
const NOI_TRA = "nơi trả ";

/** Một giá trị phụ có khuôn đứng đầu `s` (theo loại phần) → độ dài, hoặc -1. */
function khopPhu(s: string, loai: "soHieu" | "soVe" | "xeRieng" | "choTT"): number {
  if (loai === "soHieu") {
    if (s.startsWith(TRONG)) return TRONG.length;
    const m = /^[A-Z0-9]+/.exec(s);
    return m && KHUON_SO_HIEU_CHUYEN_BAY.test(m[0]) ? m[0].length : -1;
  }
  if (loai === "soVe") {
    if (s.startsWith("theo số khách dịch vụ")) return "theo số khách dịch vụ".length;
    const m = /^\d{1,3}/.exec(s);
    return m ? m[0].length : -1;
  }
  if (loai === "xeRieng") return s.startsWith("không") ? 5 : s.startsWith("có") ? 2 : -1;
  if (s.startsWith("—")) return 1;
  const m = /^\d{1,3} chỗ/.exec(s);
  return m ? m[0].length : -1;
}
const PHU: readonly { dau: string; loai: "soHieu" | "soVe" | "xeRieng" | "choTT" }[] = [
  { dau: "số hiệu chuyến bay ", loai: "soHieu" }, { dau: "số người chiều về ", loai: "soVe" }, { dau: "xe riêng: ", loai: "xeRieng" }, { dau: "xe tối thiểu: ", loai: "choTT" },
];

/** Một phần của chặng tại `i` → danh sách [vị trí sau phần, chữ giữ lại | null]. Chữ nơi tự do có thể chứa mọi thứ → liệt kê mọi cách tách. */
function phanChang(s: string, i: number): [number, string | null][] {
  const ra: [number, string | null][] = [];
  for (const [k, kieu] of [["legPickupDate", "ngay"], ["legPickupTime", "gio"]] as const) {
    const p = phanGiaTri(s, i, NHAN_TRUONG_THOI_GIAN[k], kieu);
    if (p) ra.push(p);
  }
  for (const p of PHU) {
    if (!s.startsWith(p.dau, i)) continue;
    let j = i + p.dau.length;
    const a = khopPhu(s.slice(j), p.loai);
    if (a < 0) continue;
    j += a;
    if (!s.startsWith(MUI, j)) continue;
    j += MUI.length;
    const b = khopPhu(s.slice(j), p.loai);
    if (b >= 0) ra.push([j + b, null]);
  }
  for (const [dau, giu] of [[NOI_DON, DOI_NOI_DON], [NOI_TRA, null]] as const) {
    if (!s.startsWith(dau, i)) continue;
    // "A → B": A ≥ 1 ký tự, B ≥ 1 ký tự; B kết thúc ở cuối chuỗi hoặc ngay trước một "; " — mọi cách tách đều được thử.
    for (let m = s.indexOf(MUI, i + dau.length + 1); m >= 0; m = s.indexOf(MUI, m + 1)) {
      const bDau = m + MUI.length;
      if (bDau >= s.length) break;
      ra.push([s.length, giu]);
      for (let e = s.indexOf("; ", bDau + 1); e >= 0; e = s.indexOf("; ", e + 1)) ra.push([e, giu]);
    }
  }
  return ra;
}

function docPhanChang(s: string, i: number, nho: Map<string, Tap>): Tap {
  const k = `c${i}`;
  const daCo = nho.get(k);
  if (daCo) return daCo;
  const ra: Tap = new Set();
  nho.set(k, ra);
  const daXet = new Set<string>();
  for (const [j, giu] of phanChang(s, i)) {
    const khoa = `${j}|${giu}`;
    if (daXet.has(khoa)) continue;
    daXet.add(khoa);
    const dau = giu ?? "";
    if (j === s.length) hop(ra, [dau]);
    else if (s.startsWith("; ", j)) hop(ra, [...docPhanChang(s, j + 2, nho)].map((x) => ghep(dau, x)));
  }
  return ra;
}

/** Bóc đoạn đuôi "đặt gấp" (kemDatGap) ở CUỐI — đúng một nhãn lý do đã biết. */
function bocDatGap(s: string): string {
  for (const nhan of Object.values(LY_DO_DAT_GAP)) {
    const duoi = `${DAU_DAT_GAP}${nhan}`;
    if (s.endsWith(duoi)) return s.slice(0, s.length - duoi.length);
  }
  return s;
}

/** Kết quả của tập cách đọc: không cách nào hoặc > 1 kết quả khác nhau → câu chung; đúng một → cụ thể (rỗng = không tin). */
function chot(tap: Tap, tienTo: string, chung: "chang" | "so-khach", gioHenChung: boolean, gioHen: (phan: string[]) => boolean): PhanDoiTin | null {
  if (tap.size !== 1) return { loai: "chung", cau: chung, gioHen: gioHenChung };
  const [x] = [...tap];
  const phan = x!.split(SEP).filter(Boolean);
  if (!phan.length) return null;
  return { loai: "cu-the", phan: `${tienTo}${phan.join(", ")}`, gioHen: gioHen(phan) };
}

const NHAN_GIO_CHANG = [NHAN_TRUONG_THOI_GIAN.legPickupDate, NHAN_TRUONG_THOI_GIAN.legPickupTime];

/** Đoạn số khách sau "số khách: " (đã cắt lý do): khúc "<tên>: <loại> N → M, …" nối " | ". Tên GIỮ (tên danh mục hoặc nhãn cố định — đường viết đã kiểm). */
function docSoKhach(s: string): Tap {
  const loai = PAX_ORDER.map(nhanKhach);
  const nho = new Map<number, Tap>();
  const phan = (i: number): [number, string] | null => {
    for (const l of loai) {
      const m = new RegExp(`^${l} (\\d{1,3})${MUI}(\\d{1,3})`).exec(s.slice(i));
      if (m) return [i + m[0].length, `${l} ${m[1]}${MUI}${m[2]}`];
    }
    return null;
  };
  // Từ vị trí đầu khúc i: mọi tên kết thúc ở ": " rồi chuỗi phần.
  const khuc = (i: number): Tap => {
    const daCo = nho.get(i);
    if (daCo) return daCo;
    const ra: Tap = new Set();
    nho.set(i, ra);
    for (let j = s.indexOf(": ", i + 1); j >= 0; j = s.indexOf(": ", j + 1)) {
      const ten = s.slice(i, j);
      let q = j + 2;
      const cac: string[] = [];
      for (;;) {
        const p = phan(q);
        if (!p) break;
        cac.push(p[1]);
        q = p[0];
        if (q === s.length) {
          hop(ra, [`${ten}: ${cac.join(", ")}`]);
          break;
        }
        if (s.startsWith(" | ", q)) for (const x of khuc(q + 3)) hop(ra, [`${ten}: ${cac.join(", ")} | ${x}`]);
        if (!s.startsWith(", ", q)) break;
        q += 2;
      }
    }
    return ra;
  };
  return khuc(0);
}

/**
 * Đọc `detail` của một dòng nguồn → phần đổi cho câu tin (ADR-0062 Đ2). `doiSoKhach` = hành động mang cờ đổi số khách (AUDIT_ACTIONS — người gọi tra).
 * Luật an toàn: ngữ pháp chặt; tên dịch vụ / chữ nơi bị bỏ; nhiều cách đọc cho KẾT QUẢ khác nhau (hoặc không cách nào) ⇒ câu chung; không in mẩu thô.
 */
export function phanDoiCuaTin(action: string, detail: string | null, doiSoKhach = false): PhanDoiTin | null {
  try {
    return doc(action, detail, doiSoKhach);
  } catch (e) {
    if (e !== QUA_NHIEU) throw e;
    return doiSoKhach ? { loai: "chung", cau: "so-khach", gioHen: false } : { loai: "chung", cau: "chang", gioHen: action === "order_leg_updated" };
  }
}

function doc(action: string, detail: string | null, doiSoKhach: boolean): PhanDoiTin | null {
  if (action === "order_leg_added") return { loai: "cu-the", phan: "thêm chặng đón", gioHen: false }; // không đọc detail (chữ nơi tự do)
  if (action === "order_leg_closed") return { loai: "cu-the", phan: "bỏ chặng đón", gioHen: false };
  const d = detail ?? "";
  if (doiSoKhach) {
    const cat = d.indexOf(DAU_LY_DO);
    const truoc = cat < 0 ? d : d.slice(0, cat);
    if (!truoc.startsWith(DAU_SO_KHACH)) return { loai: "chung", cau: "so-khach", gioHen: false };
    const tap = docSoKhach(truoc.slice(DAU_SO_KHACH.length));
    if (tap.size !== 1) return { loai: "chung", cau: "so-khach", gioHen: false };
    return { loai: "cu-the", phan: `đổi số khách (${[...tap][0]})`, gioHen: false };
  }
  if (action === "trip_updated") {
    const s = bocDatGap(d);
    if (s === CAP_NHAT_CHANG) return { loai: "chung", cau: "chang", gioHen: false };
    return chot(docKhucDV(s, 0, new Map()), "", "chang", false, () => false);
  }
  if (action === "order_leg_updated") {
    const s = bocDatGap(d);
    const chieu = Object.values(CHIEU_LABEL).find((c) => s.startsWith(`${c} · `));
    if (!chieu) return { loai: "chung", cau: "chang", gioHen: true };
    const tap: Tap = new Set();
    const dau = chieu.length + 3;
    const nho = new Map<string, Tap>();
    for (let j = s.indexOf(": ", dau + 1); j >= 0; j = s.indexOf(": ", j + 1)) hop(tap, docPhanChang(s, j + 2, nho));
    return chot(tap, `${chieu}: `, "chang", true, (phan) => phan.some((p) => NHAN_GIO_CHANG.some((n) => p.startsWith(`${n} `))));
  }
  return null;
}
