// Khối «Hiển thị trường theo màn hình» ở trang Giao diện (ADR-0194 đợt 1; chỉ Toàn quyền — ô settings.ops, máy chủ kiểm lại ở mọi route): chọn màn → chọn nhóm quyền → mỗi trường chỉnh được
// một ô chọn Hiện / Ẩn / Bắt buộc (chỉ những chế độ cờ của danh mục cho — `cheDoChoChon`). Xem trước tại chỗ bằng CÙNG luật thuần với máy chủ (`giaiChinhSach`) cho một người chỉ giữ nhóm quyền đang chọn.
// Lưu = một lô cho MỘT màn (POST /api/cai-dat/giao-dien); «Khôi phục mặc định» = đặt lại cả màn (hỏi xác nhận). Không innerHTML. Tên màn / trường / chế độ ở src/shared/ui-truong.ts (tên tạm, chờ chủ chọn).
import { PERMISSION_CODES, PERMISSION_LABEL } from "../src/shared/permissions";
import { MAN_UI, NHAN_CHE_DO, NHAN_MAN, cheDoChoChon, giaiChinhSach, mucChinhDuoc, nhanTruong, type CheDo, type DongChinhSach, type ManUi } from "../src/shared/ui-truong";
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import { hienBaoNgan } from "./toast";

const LOI_MANG = "Không kết nối được máy chủ.";
const khoa = (man: string, truong: string, quyen: string): string => `${man}/${truong}/${quyen}`;

export async function dungBangDieuKhienTruong(goc: HTMLElement, baoLoi: (cau: string | null) => void): Promise<void> {
  let tatCa: Api.ChinhSachGiaoDienTatCaDto;
  try {
    tatCa = await api<Api.ChinhSachGiaoDienTatCaDto>("/api/cai-dat/giao-dien/tat-ca");
  } catch (err) {
    baoLoi(err instanceof ApiError ? err.message : "Không tải được cài đặt hiển thị trường.");
    return;
  }
  let man: ManUi = MAN_UI[0];
  let quyen: string = PERMISSION_CODES[0];
  const daLuu = new Map<string, string>(); // khoá → chế độ đang lưu trên máy chủ (vắng = HIEN)
  const nhap = new Map<string, string>(); // bản đang chỉnh (chỉ ô đã đổi)
  const napDaLuu = (t: Api.ChinhSachGiaoDienTatCaDto): void => {
    tatCa = t;
    daLuu.clear();
    for (const d of t.dong) daLuu.set(khoa(d.man, d.truong, d.quyen), d.cheDo);
    nhap.clear();
  };
  napDaLuu(tatCa);
  const hieuLuc = (m: string, t: string, q: string): string => nhap.get(khoa(m, t, q)) ?? daLuu.get(khoa(m, t, q)) ?? "HIEN";
  const doiCuaMan = (): Api.ChinhSachGiaoDienRequest["thayDoi"] =>
    [...nhap.entries()]
      .filter(([k, c]) => k.startsWith(`${man}/`) && (daLuu.get(k) ?? "HIEN") !== c)
      .map(([k, c]) => { const [, truong, q] = k.split("/"); return { truong: truong!, quyen: q!, cheDo: c }; });

  const tieuDe = h("h2", { id: "bdk-tieu-de" }, "Hiển thị trường theo màn hình");
  const chuThich = h("p", { class: "muted" }, "Chọn một màn và một nhóm quyền, rồi chọn Hiện, Ẩn hay Bắt buộc cho từng trường. Người giữ nhiều quyền chỉ bị ẩn một trường khi mọi quyền của họ cùng ẩn trường đó. Tên, số điện thoại, dịch vụ, tiền và ngày đi không chỉnh được ở đây.");
  const chonMan = h("select", { id: "bdk-man", "aria-label": "Màn hình" }, ...MAN_UI.map((m) => h("option", { value: m }, NHAN_MAN[m]))) as HTMLSelectElement;
  const chonQuyen = h("select", { id: "bdk-quyen", "aria-label": "Nhóm quyền" }, ...PERMISSION_CODES.map((q) => h("option", { value: q }, PERMISSION_LABEL[q]))) as HTMLSelectElement;
  const dsTruong = h("div", { id: "bdk-truong" });
  const xemTruoc = h("p", { id: "bdk-xem-truoc", class: "muted", "aria-live": "polite" });
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  const luu = h("button", { type: "button", class: "btn btn-primary", id: "bdk-luu", disabled: true }, "Lưu cho màn này") as HTMLButtonElement;
  const bo = h("button", { type: "button", class: "btn", id: "bdk-bo", disabled: true }, "Bỏ thay đổi") as HTMLButtonElement;
  const khoiPhuc = h("button", { type: "button", class: "btn", id: "bdk-khoi-phuc" }, "Khôi phục mặc định") as HTMLButtonElement;

  const bangDong = (): DongChinhSach[] => {
    const ra: DongChinhSach[] = [];
    for (const q of PERMISSION_CODES) for (const m of tatCa.danhMuc) {
      const c = hieuLuc(m.man, m.truong, q);
      if (c !== "HIEN") ra.push({ man: m.man, truong: m.truong, quyen: q, cheDo: c });
    }
    return ra;
  };
  const veXemTruoc = (): void => {
    const kq = giaiChinhSach(bangDong(), [quyen]).filter((d) => d.man === man);
    const ten = (t: string): string => nhanTruong(man, t) ?? t;
    const an = kq.filter((d) => d.an).map((d) => ten(d.truong));
    const buoc = kq.filter((d) => d.batBuoc).map((d) => ten(d.truong));
    const phan = [an.length ? `ẩn ${an.join(", ")}` : "", buoc.length ? `bắt buộc ${buoc.join(", ")}` : ""].filter(Boolean).join("; ");
    xemTruoc.textContent = `Xem trước: người chỉ giữ quyền «${PERMISSION_LABEL[quyen as keyof typeof PERMISSION_LABEL]}» ở màn «${NHAN_MAN[man]}» ${phan ? `sẽ thấy: ${phan}.` : "thấy đầy đủ như hiện nay."}`;
  };
  const capNhatNut = (): void => {
    const co = doiCuaMan().length > 0;
    luu.disabled = !co;
    bo.disabled = nhap.size === 0;
  };
  const veTruong = (): void => {
    const muc = mucChinhDuoc(man);
    replaceChildren(
      dsTruong,
      ...(muc.length === 0
        ? [h("p", { class: "muted" }, "Màn này chưa có trường nào chỉnh được.")]
        : muc.map((m) => {
            const id = `bdk-o-${m.truong}`;
            const o = h("select", { id, "data-truong": m.truong }, ...cheDoChoChon(m).map((c: CheDo) => h("option", { value: c, selected: c === hieuLuc(m.man, m.truong, quyen) }, NHAN_CHE_DO[c]))) as HTMLSelectElement;
            o.addEventListener("change", () => {
              const k = khoa(m.man, m.truong, quyen);
              if (o.value === (daLuu.get(k) ?? "HIEN")) nhap.delete(k);
              else nhap.set(k, o.value);
              veXemTruoc();
              capNhatNut();
            });
            return h("div", { class: "gd-dong" }, h("label", { for: id }, nhanTruong(m.man, m.truong) ?? m.truong), o);
          })),
    );
    veXemTruoc();
    capNhatNut();
  };
  chonMan.addEventListener("change", () => { man = chonMan.value as ManUi; veTruong(); });
  chonQuyen.addEventListener("change", () => { quyen = chonQuyen.value; veTruong(); });
  bo.addEventListener("click", () => { nhap.clear(); veTruong(); });

  const ghi = async (duong: string, body: unknown, thanhCong: string): Promise<void> => {
    loi.hidden = true;
    luu.disabled = true;
    khoiPhuc.disabled = true;
    try {
      napDaLuu(await api<Api.ChinhSachGiaoDienTatCaDto>(duong, { method: "POST", body }));
      hienBaoNgan(thanhCong, { tong: "la" });
    } catch (err) {
      loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
      loi.hidden = false;
    } finally {
      khoiPhuc.disabled = false;
      veTruong();
    }
  };
  luu.addEventListener("click", () => void ghi("/api/cai-dat/giao-dien", { man, thayDoi: doiCuaMan() } satisfies Api.ChinhSachGiaoDienRequest, "Đã lưu."));
  khoiPhuc.addEventListener("click", async () => {
    const dongY = await hoiXacNhan({ tieuDe: `Khôi phục mặc định màn «${NHAN_MAN[man]}»?`, hauQua: "Mọi trường của màn này, cho mọi nhóm quyền, trở về hiện đầy đủ như hiện nay. Các màn khác không đổi.", nhanNguyHiem: "Khôi phục mặc định", opener: khoiPhuc });
    if (dongY) await ghi("/api/cai-dat/giao-dien/khoi-phuc", { man } satisfies Api.ChinhSachGiaoDienKhoiPhucRequest, "Đã khôi phục mặc định.");
  });

  replaceChildren(
    goc,
    tieuDe,
    chuThich,
    h("div", { class: "grid two" }, h("label", null, "Màn hình", chonMan), h("label", null, "Nhóm quyền", chonQuyen)),
    dsTruong,
    xemTruoc,
    loi,
    h("div", { class: "form-actions" }, luu, bo, khoiPhuc),
  );
  veTruong();
  goc.hidden = false;
}
