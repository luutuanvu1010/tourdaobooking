// Khối dùng chung của hai màn sổ đại lý (web/hoa-hong.ts, web/nguoi-ban.ts; đặc tả sổ đại lý đợt 1, Task 10): danh mục để chọn dịch vụ / nhóm, chọn phạm vi, ô tìm đối tác,
// hộp đóng dòng, dòng báo lỗi dưới ô. Chỉ dựng DOM và gọi API; luật đọc ô ở src/shared/so-dai-ly-nhap.ts, chữ ở src/shared/hoa-hong-hien-thi.ts. Máy chủ kiểm lại mọi thứ.
import { CAU_CHUA_TIM_DUOC_DOI_TAC, type TenDanhMuc } from "../src/shared/hoa-hong-hien-thi";
import { docNgayDong, ngayDongMacDinh, type LoiO, type PhamViForm, type TruongLoi } from "../src/shared/so-dai-ly-nhap";
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

export const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

/** Nhãn + khối nhiều thành phần (ô lọc kèm danh sách, ô tìm kèm kết quả): không bọc bằng `<label>` vì bên trong có nhiều nút/ô, mỗi ô tự có nhãn đọc màn hình (`aria-label`). */
export const truong = (nhan: string, ...noiDung: HTMLElement[]): HTMLElement => h("div", { class: "hh-truong" }, h("span", { class: "hh-truong-nhan" }, nhan), ...noiDung);

/** Enter trong ô tìm không được gửi cả form (khuôn «Enter trong ô tìm danh mục bị chặn», web/CLAUDE.md). */
const chanEnter = (o: HTMLInputElement): void => o.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });

const chuanTim = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Danh mục dịch vụ và nhóm

export interface DanhMuc {
  readonly dichVu: readonly { code: string; name: string }[];
  readonly nhom: readonly { code: string; name: string }[];
  readonly ten: TenDanhMuc;
  /** Câu lỗi khi không tải được danh mục (khi đó ô chọn trống; tên hiện bằng mã). */
  readonly loi: string | null;
}

/**
 * `GET /api/catalog` (cổng văn phòng, ô `money.view`): Kế toán dùng được — `/api/catalog/for-order` đòi `order.create`, `/api/catalog/groups` chỉ Quản trị.
 * Chỉ có nhóm đang dùng và dịch vụ đang hiện; dòng cũ thuộc nhóm đã tắt / dịch vụ đã ẩn hiện bằng mã (`nhanPhamVi`).
 */
export async function taiDanhMuc(): Promise<DanhMuc> {
  try {
    const r = await api<Api.CatalogPublicResponse>("/api/catalog");
    const dichVu = r.items.map((i) => ({ code: i.code, name: i.name })).sort((a, b) => a.name.localeCompare(b.name, "vi"));
    const tenDv = new Map(dichVu.map((d) => [d.code, d.name]));
    const tenNhom = new Map(r.groups.map((g) => [g.code, g.name]));
    return { dichVu, nhom: r.groups, ten: { dichVu: (c) => tenDv.get(c), nhom: (c) => tenNhom.get(c) }, loi: null };
  } catch (err) {
    return { dichVu: [], nhom: [], ten: { dichVu: () => undefined, nhom: () => undefined }, loi: lyDoLoi(err) };
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Dòng báo lỗi dưới ô

export interface BangLoi {
  /** Dòng lỗi của một ô (đặt ngay dưới ô đó). */
  dong(truong: TruongLoi): HTMLElement;
  /** Hiện lỗi theo ô, ẩn các ô còn lại; đưa con trỏ tới ô lỗi đầu tiên nếu có. */
  hien(loi: readonly LoiO[]): void;
  xoa(): void;
}

export function taoBangLoi(): BangLoi {
  const dong = new Map<TruongLoi, HTMLElement>();
  const lay = (t: TruongLoi): HTMLElement => {
    let el = dong.get(t);
    if (!el) {
      el = h("p", { class: "field-error", role: "alert", "data-loi": t, hidden: true });
      dong.set(t, el);
    }
    return el;
  };
  return {
    dong: lay,
    hien(loi) {
      for (const el of dong.values()) {
        el.textContent = "";
        el.hidden = true;
      }
      for (const l of loi) {
        const el = lay(l.truong);
        el.textContent = l.message;
        el.hidden = false;
      }
      const dau = loi[0];
      if (dau) lay(dau.truong).scrollIntoView({ block: "nearest" });
    },
    xoa() {
      this.hien([]);
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Chọn một dịch vụ (ô lọc + danh sách) và chọn phạm vi (một dịch vụ / một nhóm / mọi dịch vụ)

export interface ChonDichVu {
  readonly root: HTMLElement;
  /** Mã dịch vụ đang chọn (rỗng = chưa chọn). */
  ma(): string;
  datLai(): void;
}

export function taoChonDichVu(dm: DanhMuc, idTienTo: string): ChonDichVu {
  const tim = h("input", { id: `${idTienTo}-tim`, type: "search", autocomplete: "off", placeholder: "Gõ tên hoặc mã dịch vụ để lọc", "aria-label": "Lọc dịch vụ" });
  const chon = h("select", { id: idTienTo, "aria-label": "Dịch vụ" });
  const ve = (): void => {
    const q = chuanTim(tim.value);
    const dangChon = chon.value;
    const ds = dm.dichVu.filter((d) => q === "" || chuanTim(`${d.name} ${d.code}`).includes(q) || d.code === dangChon);
    replaceChildren(chon, h("option", { value: "" }, "— Chọn dịch vụ —"), ...ds.map((d) => h("option", { value: d.code, selected: d.code === dangChon }, `${d.name} · ${d.code}`)));
  };
  tim.addEventListener("input", ve);
  chanEnter(tim);
  ve();
  const root = h("div", { class: "hh-chon" }, tim, chon, dm.loi !== null && h("span", { class: "hint" }, `Không tải được danh mục dịch vụ: ${dm.loi}`));
  return {
    root,
    ma: () => chon.value,
    datLai() {
      tim.value = "";
      chon.value = "";
      ve();
    },
  };
}

export interface ChonPhamVi {
  readonly root: HTMLElement;
  doc(): { phamVi: PhamViForm; catalogCode: string; groupCode: string };
  datLai(): void;
}

export function taoChonPhamVi(dm: DanhMuc, idTienTo: string, bangLoi: BangLoi): ChonPhamVi {
  const pv = h(
    "select",
    { id: `${idTienTo}-pham-vi` },
    // Mặc định «Một dịch vụ» (đứng đầu, đúng thứ tự brief): một mức «Mọi dịch vụ» phủ rộng nên phải chọn có chủ ý, không nằm sẵn ở ô.
    h("option", { value: "SERVICE" }, "Một dịch vụ"),
    h("option", { value: "GROUP" }, "Một nhóm dịch vụ"),
    h("option", { value: "ALL" }, "Mọi dịch vụ"),
  );
  const dichVu = taoChonDichVu(dm, `${idTienTo}-dich-vu`);
  const nhom = h("select", { id: `${idTienTo}-nhom`, "aria-label": "Nhóm dịch vụ" }, h("option", { value: "" }, "— Chọn nhóm —"), ...dm.nhom.map((g) => h("option", { value: g.code }, g.name)));
  const khuDichVu = h("div", { class: "hh-chon-khu" }, truong("Dịch vụ", dichVu.root));
  const khuNhom = h("div", { class: "hh-chon-khu" }, h("label", null, "Nhóm dịch vụ", nhom));
  const veKhu = (): void => {
    khuDichVu.hidden = pv.value !== "SERVICE";
    khuNhom.hidden = pv.value !== "GROUP";
  };
  pv.addEventListener("change", veKhu);
  veKhu();
  const root = h("div", { class: "hh-pham-vi" }, h("label", null, "Phạm vi", pv), khuDichVu, khuNhom, bangLoi.dong("phamVi"));
  return {
    root,
    doc: () => ({ phamVi: pv.value as PhamViForm, catalogCode: pv.value === "SERVICE" ? dichVu.ma() : "", groupCode: pv.value === "GROUP" ? nhom.value : "" }),
    datLai() {
      pv.value = "SERVICE";
      dichVu.datLai();
      nhom.value = "";
      veKhu();
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Ô tìm đối tác (gọi GET /api/pricing/nguoi-huong; trễ 300 ms, tối đa 20 kết quả — máy chủ cắt)

export interface TimDoiTac {
  readonly root: HTMLElement;
  chon(): { partyId: string; ten: string } | null;
  datLai(): void;
  /** Gọi mỗi khi người dùng chọn / bỏ chọn một đối tác. */
  khiDoi(fn: () => void): void;
}

/** `choPhep` false (tài khoản không qua cổng của route tìm người hưởng): thay ô tìm bằng một câu nói rõ, không để người dùng gõ vào ô chắc chắn bị từ chối. */
export function taoTimDoiTac(o: { choPhep: boolean; id: string }): TimDoiTac {
  if (!o.choPhep) {
    return { root: h("p", { class: "muted", id: o.id, "data-khong-tim-duoc": "" }, CAU_CHUA_TIM_DUOC_DOI_TAC), chon: () => null, datLai: () => undefined, khiDoi: () => undefined };
  }
  let chonRoi: { partyId: string; ten: string } | null = null;
  let hen: number | undefined;
  let stt = 0; // bỏ kết quả tìm cũ về muộn
  let daTimLanDau = false;
  let khiDoiFn: () => void = () => undefined;
  const o_tim = h("input", { id: o.id, type: "search", autocomplete: "off", placeholder: "Gõ tên đối tác", "aria-label": "Tìm đối tác theo tên" });
  const ketQua = h("div", { class: "hh-tim-ket-qua", "aria-live": "polite" });
  const trangThai = h("p", { class: "hh-da-chon", hidden: true });
  const doi = (): void => khiDoiFn();

  function veDaChon(): void {
    o_tim.hidden = chonRoi !== null;
    ketQua.hidden = chonRoi !== null;
    trangThai.hidden = chonRoi === null;
    if (chonRoi === null) {
      replaceChildren(trangThai);
      return;
    }
    const bo = h("button", { type: "button", class: "btn btn-link" }, "Bỏ chọn");
    bo.addEventListener("click", () => {
      chonRoi = null;
      o_tim.value = "";
      replaceChildren(ketQua);
      veDaChon();
      doi();
      o_tim.focus();
    });
    replaceChildren(trangThai, "Đã chọn: ", h("strong", null, chonRoi.ten), " · ", bo);
  }

  async function tim(): Promise<void> {
    const mine = ++stt;
    try {
      const r = await api<Api.NguoiHuongTimResponse>(`/api/pricing/nguoi-huong?q=${encodeURIComponent(o_tim.value.trim())}`);
      if (mine !== stt) return;
      if (r.ketQua.length === 0) {
        replaceChildren(ketQua, h("p", { class: "muted" }, "Không thấy đối tác nào. Chỉ hồ sơ mang vai trò được hưởng hoa hồng mới tìm được."));
        return;
      }
      replaceChildren(
        ketQua,
        ...r.ketQua.map((k) => {
          const nut = h("button", { type: "button", class: "btn", "data-party": k.partyId }, k.ten, " ", h("span", { class: "hh-nhan-nho" }, k.loai === "PERSON" ? "Cá nhân" : "Tổ chức"));
          nut.addEventListener("click", () => {
            chonRoi = { partyId: k.partyId, ten: k.ten };
            replaceChildren(ketQua);
            veDaChon();
            doi();
          });
          return nut;
        }),
        r.ketQua.length >= 20 && h("p", { class: "hint" }, "Chỉ hiện 20 đối tác đầu — gõ thêm để thu hẹp."),
      );
    } catch (err) {
      if (mine === stt) replaceChildren(ketQua, h("p", { class: "field-error" }, lyDoLoi(err)));
    }
  }
  o_tim.addEventListener("input", () => {
    window.clearTimeout(hen);
    hen = window.setTimeout(() => void tim(), 300);
  });
  chanEnter(o_tim);
  o_tim.addEventListener("focus", () => {
    if (daTimLanDau) return;
    daTimLanDau = true;
    void tim();
  });
  veDaChon();
  return {
    root: h("div", { class: "hh-tim" }, o_tim, ketQua, trangThai),
    chon: () => chonRoi,
    datLai() {
      chonRoi = null;
      o_tim.value = "";
      replaceChildren(ketQua);
      veDaChon();
    },
    khiDoi(fn) {
      khiDoiFn = fn;
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Hộp đóng dòng (mức hoặc điều khoản): chọn «Ngày kết thúc» rồi xác nhận

export interface ThongTinHopDong {
  /** Câu mô tả dòng sắp đóng (không SĐT, không mã thô). */
  readonly moTa: string;
  /** Câu cảnh báo thêm (vd đóng dòng mặc định của công ty); null = không có. */
  readonly canhBao: string | null;
  readonly tuNgay: string;
  readonly homNay: string;
  /** Chữ nút xác nhận. */
  readonly nhanXacNhan: string;
  /** Gọi máy chủ đóng dòng; ném lỗi thì hộp giữ nguyên để sửa. */
  readonly chay: (denNgay: string) => Promise<void>;
  /** Đóng hộp (nút «Thôi», hoặc sau khi đóng xong). */
  readonly dong: () => void;
}

export function veHopDong(khu: HTMLElement, t: ThongTinHopDong): void {
  const ngay = h("input", { id: "dong-den-ngay", type: "date", value: ngayDongMacDinh(t.homNay, t.tuNgay), min: t.tuNgay });
  const loi = h("p", { class: "field-error", role: "alert", hidden: true });
  const xacNhan = h("button", { type: "button", class: "btn btn-primary btn-chinh", id: "dong-xac-nhan" }, t.nhanXacNhan);
  const thoi = h("button", { type: "button", class: "btn" }, "Thôi");
  const tat = (v: boolean): void => {
    xacNhan.disabled = v;
    thoi.disabled = v;
    ngay.disabled = v;
  };
  xacNhan.addEventListener("click", async () => {
    const kq = docNgayDong(ngay.value, t.tuNgay);
    if (!kq.ok) {
      loi.textContent = kq.message;
      loi.hidden = false;
      return;
    }
    loi.hidden = true;
    tat(true);
    try {
      await t.chay(kq.body.denNgay);
    } catch {
      tat(false); // lỗi đã được trang hiện ở dòng báo lỗi chung; hộp giữ nguyên
    }
  });
  thoi.addEventListener("click", () => t.dong());
  const hop = h(
    "div",
    { id: "dong-hop", class: "maint-confirm", role: "group", "aria-label": "Đóng dòng", tabindex: -1 },
    h("p", null, h("strong", null, t.moTa)),
    t.canhBao !== null && h("p", null, h("strong", null, t.canhBao)),
    h("label", null, "Ngày kết thúc", ngay),
    loi,
    h("div", { class: "maint-actions" }, xacNhan, thoi),
  );
  replaceChildren(khu, hop);
  hop.focus({ preventScroll: true });
  hop.scrollIntoView({ block: "nearest" });
}
