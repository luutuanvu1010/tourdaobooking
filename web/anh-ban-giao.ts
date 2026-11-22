// Khối «Ảnh bàn giao» ở trang chi tiết đơn (ADR-0232) và hàm gửi ảnh dùng chung với màn chuyến của tài xế (web/cuoc-chuyen.ts). Gọi:
//   GET  /api/anh-ban-giao/don/:orderId/tom-tat → số ảnh xem được + có được gửi không (KHÔNG ghi nhật ký) — 403 / 404 ⇒ ẩn khối lặng lẽ
//   GET  /api/anh-ban-giao/don/:orderId         → danh sách kèm ảnh nhỏ (chỉ gọi khi người dùng bấm «Xem ảnh»: mỗi lượt là một dòng nhật ký)
//   GET  /api/anh-ban-giao/anh/:anhId           → ảnh lớn (thẻ <img>, mỗi lần mở là một dòng nhật ký)
//   POST /api/anh-ban-giao/don/:orderId, …/anh/:anhId/an, …/anh/:anhId/xoa
// Ảnh nén ở máy người gửi (thuNhoAnh vẽ lại qua khung vẽ ⇒ bỏ toạ độ chụp, mọi thông tin ẩn). Giao diện chỉ ẩn / hiện; máy chủ luôn kiểm lại. Không innerHTML.
import { ApiError, api } from "./api";
import { h, replaceChildren } from "./dom";
import { moBangTruot } from "./bang-truot";
import { luoi, thanhNut, truong } from "./khung";

let soForm = 0;
import { thuNhoAnh } from "./thu-nho-anh";
import { maBase64 } from "../src/shared/tep-hien-thi";
import { ngayDayDu } from "../src/shared/vn-date";
import {
  CANH_ANH_NHO, CANH_ANH_XEM, GHI_CHU_TOI_DA, LOAI_VIEC, NHAN_LOAI_VIEC, TEN_ANH_BAN_GIAO, TOI_DA_ANH_NHO, TOI_DA_ANH_XEM, duongAnhBanGiao,
  type AnhBanGiaoDanhSachResponse, type AnhBanGiaoDong, type AnhBanGiaoTomTatResponse, type LoaiViec,
} from "../src/shared/anh-ban-giao";

const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
/** «HH:MM dd/mm/yyyy» giờ Việt Nam — ngày qua MỘT hàm `ngayDayDu` (bài src/ngay-mot-ham.test.ts). */
const gioVn = (iso: string): string => {
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString();
  return `${d.slice(11, 16)} ${ngayDayDu(d.slice(0, 10))}`;
};

/** Nén một ảnh xuống dưới trần (thử giảm chất lượng). null = trình duyệt không mở được ảnh (vd HEIC trên máy tính). */
async function nen(f: Blob, canh: number, tran: number): Promise<Uint8Array | null> {
  for (const cl of [0.85, 0.7, 0.55, 0.4]) {
    const b = await thuNhoAnh(f, canh, cl);
    if (!b) return null;
    if (b.length <= tran) return b;
  }
  return null;
}

/** Gửi MỘT ảnh. Ném Error với câu tiếng Việt khi không chuẩn bị được ảnh; ApiError khi máy chủ từ chối. */
export async function guiAnhBanGiao(v: { orderId: string; tep: File; loaiViec: LoaiViec; ghiChu: string; dichVuId?: string | null; changId?: string | null }): Promise<void> {
  const [nho, xem] = [await nen(v.tep, CANH_ANH_NHO, TOI_DA_ANH_NHO), await nen(v.tep, CANH_ANH_XEM, TOI_DA_ANH_XEM)];
  if (!nho || !xem) throw new Error("Không đọc được ảnh này. Hãy chụp lại bằng nút máy ảnh.");
  await api(`/api/anh-ban-giao/don/${encodeURIComponent(v.orderId)}`, {
    method: "POST",
    body: { anhNho: maBase64(nho), anhXem: maBase64(xem), loaiViec: v.loaiViec, ghiChu: v.ghiChu.trim() || null, dichVuId: v.dichVuId ?? null, changId: v.changId ?? null },
  });
}

/** Ô chọn ảnh + loại việc + ghi chú + nút «Gửi ảnh». `xong` chạy sau khi gửi được. Dùng ở trang đơn và màn chuyến của tài xế. */
export function formGuiAnh(v: { orderId: string; changId?: string | null; dichVu?: { id: string; ten: string }[]; loaiMacDinh?: LoaiViec; xong: () => void }): HTMLElement {
  const tep = h("input", { type: "file", accept: "image/*", capture: "environment", "aria-label": "Chọn hoặc chụp ảnh" }) as HTMLInputElement;
  const loai = h("select", { "aria-label": "Loại việc" }, ...LOAI_VIEC.map((k) => h("option", { value: k, selected: k === (v.loaiMacDinh ?? "GIAO_KHACH") }, NHAN_LOAI_VIEC[k]))) as HTMLSelectElement;
  const dv = v.dichVu && v.dichVu.length > 1
    ? (h("select", { "aria-label": "Dịch vụ" }, h("option", { value: "" }, "Cả đơn"), ...v.dichVu.map((d) => h("option", { value: d.id }, d.ten))) as HTMLSelectElement)
    : null;
  const ghi = h("input", { type: "text", maxlength: GHI_CHU_TOI_DA, placeholder: "Không bắt buộc" }) as HTMLInputElement;
  const bao = h("p", { class: "muted", role: "status" });
  const nut = h("button", { type: "button", class: "nut", "data-cap": "chinh" }, "Gửi ảnh") as HTMLButtonElement;
  nut.addEventListener("click", async () => {
    const f = tep.files?.[0];
    if (!f) {
      bao.textContent = "Chọn hoặc chụp một ảnh trước.";
      return;
    }
    nut.disabled = true;
    bao.textContent = "Đang gửi ảnh…";
    try {
      await guiAnhBanGiao({ orderId: v.orderId, tep: f, loaiViec: loai.value as LoaiViec, ghiChu: ghi.value, dichVuId: dv?.value || null, changId: v.changId ?? null });
      tep.value = "";
      ghi.value = "";
      bao.textContent = "Đã gửi ảnh.";
      v.xong();
    } catch (e) {
      bao.textContent = e instanceof Error && !(e instanceof ApiError) ? e.message : lyDoLoi(e);
    } finally {
      nut.disabled = false;
    }
  });
  const id = `abg-${++soForm}`;
  for (const [o, ten] of [[tep, "anh"], [loai, "loai"], [dv, "dv"], [ghi, "ghi"]] as const) o?.setAttribute("id", `${id}-${ten}`);
  // Bố cục bằng lớp của khung gốc (ADR-0222): lưới 12 cột, trường nhập, thanh nút — không luật CSS riêng.
  return h("div", { class: "abg-form" }, luoi(null, truong("Ảnh", tep, { cot: 6 }), truong("Loại việc", loai, { cot: 6 }), dv ? truong("Gắn với", dv, { cot: 6 }) : null,
    truong("Ghi chú", ghi, dv ? { cot: 6 } : {}), thanhNut(null, nut)), bao);
}

/**
 * Bảng trượt xem ảnh lớn; Toàn quyền có thêm «Ẩn ảnh», «Xoá ảnh» ngay trong bảng (KHÔNG mở hộp hỏi lồng trong bảng trượt — hộp thứ hai trả null, xem
 * docs/CHANGE-GUIDE.md bẫy 100(d)). Xoá là việc một chiều: bấm lần đầu chỉ đổi nút thành «Bấm lần nữa để xoá hẳn».
 */
function moAnh(a: AnhBanGiaoDong, quyen: { an: boolean; xoa: boolean }, lamMoi: () => void, opener: HTMLElement): void {
  const bao = h("p", { class: "muted", role: "status" });
  let dong = () => {};
  const gui = async (duong: string, body: Record<string, unknown>) => {
    try {
      await api(`/api/anh-ban-giao/anh/${encodeURIComponent(a.id)}/${duong}`, { method: "POST", body });
      dong();
      lamMoi();
    } catch (e) {
      bao.textContent = lyDoLoi(e);
    }
  };
  const id = `abg-xem-${++soForm}`;
  // Hai nhóm tách hẳn (người chấm giao diện 22/11): mỗi nhóm có ô lý do riêng có nhãn, nút của nhóm ngay dưới; cảnh báo xoá hẳn nằm ngay trên nút xoá.
  const nhom: HTMLElement[] = [];
  if (quyen.an && !a.daAn) {
    const lyDoAn = h("input", { type: "text", id: `${id}-an`, maxlength: 300, placeholder: "Từ 3 ký tự" }) as HTMLInputElement;
    nhom.push(h("div", { class: "abg-nhom" }, luoi(null, truong("Lý do ẩn", lyDoAn), thanhNut(null,
      h("button", { type: "button", class: "nut", "data-cap": "phu", onclick: () => void gui("an", { lyDo: lyDoAn.value }) }, "Ẩn ảnh")))));
  }
  if (quyen.xoa) {
    const lyDo = h("select", { id: `${id}-ly-do` }, h("option", { value: "GIAY_TO_CHUP_NHAM" }, "Ảnh lọt giấy tờ tuỳ thân"),
      h("option", { value: "XOA_THEO_YEU_CAU" }, "Khách yêu cầu xoá (báo qua kênh liên hệ)"), h("option", { value: "HET_HAN" }, "Đã quá hạn giữ")) as HTMLSelectElement;
    const ghi = h("input", { type: "text", id: `${id}-ghi`, maxlength: 300, placeholder: "Từ 3 ký tự" }) as HTMLInputElement;
    const canhBao = h("p", { class: "muted" }, "Ảnh sẽ bị xoá hẳn khỏi kho, không lấy lại được.");
    let daHoi = false;
    const nut = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-tong": "nguy-hiem" }, "Xoá hẳn ảnh") as HTMLButtonElement;
    nut.addEventListener("click", () => {
      if (!daHoi) {
        daHoi = true;
        nut.textContent = "Bấm lần nữa để xoá hẳn";
        return;
      }
      void gui("xoa", { lyDo: lyDo.value, ghiChu: ghi.value, ...(lyDo.value === "XOA_THEO_YEU_CAU" ? { nguon: "KHACH" } : {}) });
    });
    nhom.push(h("div", { class: "abg-nhom" }, luoi(null, truong("Lý do xoá", lyDo), truong("Ghi rõ lý do hoặc kênh khách báo", ghi), canhBao, thanhNut(null, nut))));
  }
  const bang = moBangTruot({
    title: `${NHAN_LOAI_VIEC[a.loaiViec]} · ${gioVn(a.luc)}`,
    body: [luoi(null, h("img", { class: "abg-lon", src: duongAnhBanGiao(a.id), alt: `Ảnh bàn giao: ${NHAN_LOAI_VIEC[a.loaiViec]}` }), a.ghiChu ? h("p", null, a.ghiChu) : null, ...nhom, bao)],
    foot: [],
    opener,
  });
  dong = () => bang?.close();
}

/** Khối của trang đơn. `el` là khối rỗng đang ẩn. */
export async function initAnhBanGiao(el: HTMLElement, vao: { orderId: string; dichVu: { id: string; ten: string }[] }): Promise<void> {
  let tt: AnhBanGiaoTomTatResponse;
  try {
    tt = await api<AnhBanGiaoTomTatResponse>(`/api/anh-ban-giao/don/${encodeURIComponent(vao.orderId)}/tom-tat`);
  } catch {
    el.hidden = true; // 403 / 404 / lỗi mạng: người xem không có phần ở đơn này
    return;
  }
  if (tt.soAnh === 0 && !tt.coTheTai) {
    el.hidden = true;
    return;
  }
  const luoiAnh = thanhNut({ class: "abg-luoi" }); // ảnh nhỏ cỡ cố định (thuộc tính width/height của thẻ ảnh), xuống dòng theo bề ngang — không luật bố cục riêng
  const lamMoi = () => void initAnhBanGiao(el, vao);
  const xem = async (nut: HTMLButtonElement) => {
    nut.disabled = true;
    try {
      const r = await api<AnhBanGiaoDanhSachResponse>(`/api/anh-ban-giao/don/${encodeURIComponent(vao.orderId)}`);
      replaceChildren(luoiAnh, ...r.anh.map((a) => {
        const the = h("button", { type: "button", class: "abg-the", "aria-label": `Mở ảnh: ${NHAN_LOAI_VIEC[a.loaiViec]}, ${gioVn(a.luc)}` },
          a.anhNho ? h("img", { src: `data:image/jpeg;base64,${a.anhNho}`, alt: "", width: 128, height: 128 }) : h("span", { class: "muted" }, "Ảnh chưa xem được"),
          h("span", { class: "abg-chu" }, `${NHAN_LOAI_VIEC[a.loaiViec]}${a.daAn ? " · đã ẩn" : ""}`),
          h("span", { class: "abg-chu muted" }, `${a.nguoiTai ?? ""} · ${gioVn(a.luc)}`)) as HTMLButtonElement;
        the.addEventListener("click", () => moAnh(a, { an: r.coTheAn, xoa: r.coTheXoa }, lamMoi, the));
        return the;
      }));
      nut.hidden = true;
    } catch (e) {
      replaceChildren(luoiAnh, h("p", { class: "muted" }, lyDoLoi(e)));
      nut.disabled = false;
    }
  };
  const nutXem = tt.soAnh > 0 ? (h("button", { type: "button", class: "nut", "data-cap": "phu" }, `Xem ${tt.soAnh} ảnh`) as HTMLButtonElement) : null;
  nutXem?.addEventListener("click", () => void xem(nutXem));
  replaceChildren(el,
    h("header", { class: "khoi-dau" }, h("h2", null, TEN_ANH_BAN_GIAO)),
    tt.soAnh === 0 ? h("p", { class: "muted" }, "Chưa có ảnh bàn giao.") : null,
    nutXem, luoiAnh,
    tt.coTheTai ? formGuiAnh({ orderId: vao.orderId, dichVu: vao.dichVu, xong: lamMoi }) : null,
    h("p", { class: "muted" }, "Ảnh chỉ văn phòng, Kế toán, Quản trị xem được; đối tác và khách không thấy. Mỗi lần mở ảnh đều được ghi lại."));
  el.hidden = false;
}
