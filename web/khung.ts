// Hàm dựng của KHUNG GỐC GIAO DIỆN (ADR-0222 Đ3): khuôn trang, khối, lưới 12 cột, trường nhập, cặp nhãn và giá trị, thanh nút, bảng lưới.
// Màn đã khai `<body data-khung-goc="…">` dựng bố cục bằng các hàm này; kiểu ở phần «Khung gốc giao diện» của public/app.css bám đúng cấu trúc ở đây
// (bài src/khung-web.test.ts). Màn KHÔNG tự đặt bề rộng, số cột, khoảng cách: chọn tham số bằng tuỳ chọn của hàm (số cột 3·4·6·8, kiểu «số», tên cột của thang).
// Mỗi hàm nhỏ và độc lập để gói của trang chỉ mang hàm nó dùng.
import { h, type Child } from "./dom.ts";

type Thuoc = Record<string, unknown>;

/** Dựng `<the class="lop [lớp thêm]">` giữ các thuộc tính truyền vào. */
const vung = (the: "div" | "section" | "header" | "p", lop: string, props: Thuoc | null, con: Child[]): HTMLElement =>
  h(the, { ...props, class: props?.class ? `${lop} ${String(props.class)}` : lop }, ...con);

// Nút KHÔNG có hàm dựng ở đây: màn viết thẳng `h("button", { type: "button", class: "nut", "data-cap": "chinh" | "phu" | "loi" | "nguy-hiem" }, "Chữ")`
// (liên kết mang dáng nút: `h("a", { class: "nut", href }, "Chữ")`), để máy so chữ nút với bảng tham chiếu (scripts/quet-nut-lib.mjs, ADR-0167) vẫn đọc được từng nút.

export interface TuyKhoi {
  /** Tên khối (đầu khối). Không có thì khối không có đầu. */
  tieuDe?: Child;
  /** id của tiêu đề: khối được gắn `aria-labelledby` tới nó. */
  idTieuDe?: string;
  capTieuDe?: "h2" | "h3";
  /** Nút của khối: khối rộng thì ở đầu khối bên phải, khối hẹp thì xuống cuối khối. */
  viec?: Child[];
  /** Nút của khối luôn ở đầu khối (nút «thêm»). */
  viecODau?: boolean;
  /** Một câu mô tả dưới đầu khối. */
  moTa?: Child;
  /** `bang`: khối chứa bảng hoặc danh sách dòng, không đệm. */
  kieu?: "bang";
  the?: "section" | "div" | "form";
  /** Thuộc tính thêm cho phần tử gốc của khối (id, data-*, class thêm…). */
  thuoc?: Thuoc;
}

/** MỘT kiểu khối: đầu khối (tên + nút của khối), mô tả, rồi thân. */
export function khoi(o: TuyKhoi, ...than: Child[]): HTMLElement {
  const lop = o.thuoc?.class ? `khoi ${String(o.thuoc.class)}` : "khoi";
  return h(
    o.the ?? "section",
    { "aria-labelledby": o.tieuDe !== undefined ? o.idTieuDe : undefined, ...o.thuoc, class: lop, "data-kieu": o.kieu },
    o.tieuDe !== undefined ? h("header", { class: "khoi-dau" }, h(o.capTieuDe ?? "h2", { id: o.idTieuDe }, o.tieuDe)) : null,
    o.viec?.length ? h("div", { class: "khoi-viec", "data-cho": o.viecODau ? "dau" : undefined }, ...o.viec) : null,
    o.moTa !== undefined ? h("p", { class: "khoi-mo-ta" }, o.moTa) : null,
    ...than,
  );
}

/** Lưới 12 cột: con khai số cột ở bề rộng lớn nhất bằng `data-cot` (hàm `truong` nhận `cot`), lưới tự gom theo vùng chứa. */
export const luoi = (props: Thuoc | null, ...con: Child[]): HTMLElement => vung("div", "luoi", props, con);
export const thanhNut = (props: Thuoc | null, ...con: Child[]): HTMLElement => vung("div", "thanh-nut", props, con);
export const thanhViec = (props: Thuoc | null, ...con: Child[]): HTMLElement => vung("div", "thanh-viec", props, con);
export const thanhLoc = (props: Thuoc | null, ...con: Child[]): HTMLElement => vung("div", "thanh-loc", props, con);
export const dauTrang = (props: Thuoc | null, ...con: Child[]): HTMLElement => vung("div", "dau-trang", props, con);
export const dsDong = (props: Thuoc | null, ...con: Child[]): HTMLElement => vung("div", "ds-dong", props, con);
export const vungPhu = (props: Thuoc | null, ...con: Child[]): HTMLElement => vung("div", "vung-phu", props, con);

/** Thanh dính đáy ở điện thoại (vùng nội dung hẹp hơn 560): nút chính của trang. Mang lớp `thanh-hanh-dong-cuoi` để thanh tab nhường chỗ (web/shell.ts).
 *  Thanh hiện hay ẩn là việc của tệp kiểu (theo bề rộng vùng nội dung); mỗi lần đổi, lớp `dang-an` được bật tắt để khung chung đo lại. */
export function thanhDay(props: Thuoc | null, ...con: Child[]): HTMLElement {
  const e = vung("div", "thanh-day thanh-hanh-dong-cuoi", props, con);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => e.classList.toggle("dang-an", e.getClientRects().length === 0)).observe(e);
  return e;
}

/** Hai cột của khuôn Chi tiết: cột chính (nội dung) và cột phụ (tiền, trạng thái). Điện thoại: cột phụ lên trước. */
export const haiCot = (chinh: Child[], phu: Child[]): HTMLElement => h("div", { class: "hai-cot" }, h("div", { class: "cot-chinh" }, ...chinh), h("div", { class: "cot-phu" }, ...phu));

export interface TuyTruong {
  /** Số cột trên lưới 12 ở bề rộng lớn nhất; không khai là kín hàng. */
  cot?: 3 | 4 | 6 | 8;
  goiY?: Child;
  /** Phần tử báo lỗi của ô (ẩn sẵn). */
  loi?: HTMLElement | null;
  /** Điều khiển nhóm (bộ đếm, chọn một): nhãn là `div` mang id này để nhóm trỏ tới bằng `aria-labelledby`. */
  idNhan?: string;
}

/** Trường nhập: nhãn trên ô, lỗi và gợi ý dưới ô. */
export function truong(nhan: string, o: HTMLElement, tuy: TuyTruong = {}): HTMLElement {
  const dau = tuy.idNhan === undefined ? h("label", { for: o.getAttribute("id") ?? undefined }, nhan) : h("div", { id: tuy.idNhan, class: "nhan" }, nhan);
  return h("div", { class: "truong", "data-cot": tuy.cot }, dau, o, tuy.loi ?? null, tuy.goiY !== undefined ? h("div", { class: "truong-goi-y" }, tuy.goiY) : null);
}

/** Cặp nhãn và giá trị. `kieu: "so"`: giá trị canh phải (tiền); `manh`: dòng nhấn mạnh (tổng). */
export function cap(nhan: Child, giaTri: Child | Child[], tuy: { kieu?: "so"; manh?: boolean; thuoc?: Thuoc } = {}): HTMLElement {
  const lop = tuy.thuoc?.class ? `cap ${String(tuy.thuoc.class)}` : "cap";
  return h("div", { ...tuy.thuoc, class: lop, "data-kieu": tuy.kieu, "data-nhan-manh": tuy.manh ? "" : undefined }, h("span", null, nhan), h("span", null, ...(Array.isArray(giaTri) ? giaTri : [giaTri])));
}

// ---------- Bảng lưới (khuôn Danh sách): cột lấy bề rộng từ TÊN cột của thang ----------

/** Cột của thang: ngắn 96, vừa 128, dài 200; `gian` là cột co giãn (đúng một cột mỗi bảng), không hẹp hơn --kg-cot-gian. */
export type TenCot = "ngan" | "vua" | "dai" | "gian";
export interface KhuonBang {
  readonly cot: readonly TenCot[];
  /** Mỗi phần tử là một hàng: tên vùng của từng cột, cách nhau bằng khoảng trắng; `.` là ô trống. */
  readonly vung: readonly string[];
}

/** Ghép giá trị `grid-template` của một dòng bảng từ tên cột của thang. Không tự soát (để gói trang nhẹ): khuôn khai sai do `soatKhuonBang` bắt trong bài kiểm. */
export function khuonCot(k: KhuonBang): string {
  return `${k.vung.map((v) => `"${v.trim()}" auto`).join(" ")} / ${k.cot.map((c) => (c === "gian" ? "minmax(var(--kg-cot-gian), 1fr)" : `var(--kg-cot-${c})`)).join(" ")}`;
}

/** Soát một khuôn bảng lúc viết mã: tên cột thuộc thang, đúng một cột co giãn, mỗi hàng vùng đủ số cột, tên vùng viết được trong CSS. Trả các câu lỗi.
 *  Chỉ bài kiểm gọi (src/khung-web.test.ts); trang không gọi nên hàm này không vào gói trang. */
export function soatKhuonBang(k: KhuonBang): string[] {
  const loi: string[] = [];
  for (const c of k.cot) if (!["ngan", "vua", "dai", "gian"].includes(c)) loi.push(`«${String(c)}» không phải tên cột của thang (ngan, vua, dai, gian)`);
  if (k.cot.filter((c) => c === "gian").length !== 1) loi.push("khuôn bảng cần đúng một cột co giãn (gian)");
  for (const hang of k.vung) {
    const ten = hang.trim().split(/\s+/);
    if (ten.length !== k.cot.length) loi.push(`hàng «${hang}» có ${ten.length} vùng, bảng có ${k.cot.length} cột`);
    for (const t of ten) if (t !== "." && !/^[a-z][a-z0-9-]*$/.test(t)) loi.push(`«${t}» không dùng làm tên vùng được (chữ thường không dấu, số, gạch)`);
  }
  return loi;
}

/** Đặt khuôn cột lên khối bảng: `vua` dùng khi vùng nội dung từ 800, `rong` khi từ 1040 (không khai thì dùng lại `vua`). */
export function datKhuonBang(el: HTMLElement, vua: KhuonBang, rong: KhuonBang = vua): void {
  el.setAttribute("style", `--kg-bang-vua: ${khuonCot(vua)}; --kg-bang-rong: ${khuonCot(rong)};`);
}

/** Thuộc tính của một ô trong bảng lưới: tên vùng nó đứng (tên phải có trong khuôn bảng). Trải vào thuộc tính của `h()`. */
export const o = (ten: string): { "data-o": string; style: string } => ({ "data-o": ten, style: `--kg-o:${ten}` });
