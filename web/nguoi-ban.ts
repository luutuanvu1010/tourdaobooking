// Trang "Người bán dịch vụ" — điều khoản người bán và tỷ lệ Tour Đảo mua lại (sổ đại lý đợt 1, Task 10; ADR-0078 B1). Gọi các route của module pricing:
//   GET  /api/pricing/cung-ung            → SupplyTermListResponse (mọi dòng điều khoản, các nhà cung cấp chọn được, công ty chủ);
//   POST /api/pricing/cung-ung            → thêm một điều khoản (201);   POST /api/pricing/cung-ung/:id/dong → { denNgay }.
// Ẩn/hiện hỏi bảng quyền (`can`): xem = supply.terms.view (Bán hàng không xem tỷ lệ mua lại), thêm / đóng = supply.terms.write; máy chủ kiểm lại, kể cả chặn tài khoản giữ quyền
// Đối tác (403 ⇒ «Bạn không có quyền xem trang này.»). Điều khoản không sửa, không xoá — chỉ thêm và đóng. Luật nghiệp vụ nằm ở máy chủ (nhóm Thuê xe không ghi nhà cung cấp mua lại,
// dòng «Mọi dịch vụ» chỉ của Tour Đảo, không trùng khoảng ngày): trang hiện đúng câu tiếng Việt máy chủ trả, không chép lại luật. Chữ ở src/shared/hoa-hong-hien-thi.ts, đọc ô ở
// src/shared/so-dai-ly-nhap.ts (có bài kiểm); khối chung ở web/so-dai-ly-ui.ts.
import { CAU_DONG_DONG_MAC_DINH, CAU_KHONG_CO_DIEU_KHOAN, CAU_KHONG_CO_QUYEN_XEM, CAU_KHONG_KHOP_LOC, NHAN_CONG_TY, NHAN_TRANG_THAI, canXacNhanDongDieuKhoan, dongDongDuoc, locDieuKhoan, nhanNguoiBan, nhanPhamVi, nhanTyLeMua, trangThaiDong } from "../src/shared/hoa-hong-hien-thi";
import { can } from "../src/shared/permissions";
import { docThanDieuKhoan } from "../src/shared/so-dai-ly-nhap";
import { ngayDayDu } from "../src/shared/vn-date";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { lyDoLoi, taiDanhMuc, taoBangLoi, taoChonPhamVi, veHopDong, type DanhMuc } from "./so-dai-ly-ui";

const errorEl = byId("error");
const okEl = byId("ok");
const noiDungEl = byId("nb-noi-dung");
const bangEl = byId("dk-list");
const theEl = byId("dk-list-cards");
const rongEl = byId("dk-rong");
const dongKhuEl = byId("dk-dong-khu");
const locTrangThaiEl = byId<HTMLSelectElement>("dk-loc-trang-thai");

const staff = await initShell();

function hienOk(text: string | null): void {
  okEl.textContent = text ?? "";
  okEl.hidden = !text;
}

/** Hiện câu lỗi ở đầu trang và cuộn tới nó (biểu mẫu nằm xa đầu trang, nhất là trên điện thoại). */
function baoLoi(err: unknown): void {
  showError(errorEl, lyDoLoi(err));
  errorEl.scrollIntoView({ block: "nearest" });
}

async function main(): Promise<void> {
  let ds: Api.SupplyTermListResponse;
  let dm: DanhMuc;
  try {
    [ds, dm] = await Promise.all([api<Api.SupplyTermListResponse>("/api/pricing/cung-ung"), taiDanhMuc()]);
  } catch (err) {
    showError(errorEl, err instanceof ApiError && err.status === 403 ? CAU_KHONG_CO_QUYEN_XEM : lyDoLoi(err));
    return;
  }
  const duocGhi = can(staff, "supply.terms.write");
  noiDungEl.hidden = false;

  // ---- Danh sách ---------------------------------------------------------------------------------------------------------------------------------------
  /** Tải lại bảng điều khoản. `giuLoi`: sau một lỗi 409 vừa hiện, lỗi tải lại không được đè câu của máy chủ. */
  async function tai(giuLoi = false): Promise<void> {
    try {
      ds = await api<Api.SupplyTermListResponse>("/api/pricing/cung-ung");
    } catch (err) {
      if (!giuLoi) baoLoi(err);
    }
    veDanhSach();
  }

  const khungDong = (d: Api.SupplyTermDto): { phamVi: string; nguoiBan: string; tyLe: string; tu: string; den: string; tt: ReturnType<typeof trangThaiDong> } => ({
    phamVi: nhanPhamVi(d, dm.ten),
    nguoiBan: nhanNguoiBan(d.nguoiBan),
    tyLe: nhanTyLeMua(d.tyLeMuaBp),
    tu: ngayDayDu(d.tuNgay),
    den: d.denNgay === null ? "—" : ngayDayDu(d.denNgay),
    tt: trangThaiDong(d, ds.homNay),
  });
  const huyHieu = (tt: ReturnType<typeof trangThaiDong>): HTMLElement =>
    h("span", { class: tt === "DANG_AP" ? "badge badge-confirmed" : tt === "SAP_AP" ? "badge badge-draft" : "badge badge-cancelled" }, NHAN_TRANG_THAI[tt]);
  const nutDong = (d: Api.SupplyTermDto, k: ReturnType<typeof khungDong>): HTMLElement | false => {
    if (!duocGhi || !dongDongDuoc(d)) return false;
    const nut = h("button", { type: "button", class: "btn", "data-dong": d.id, "aria-label": `Đóng điều khoản: ${k.phamVi} · ${k.nguoiBan}` }, "Đóng");
    nut.addEventListener("click", () => moDong(d, k));
    return nut;
  };

  function veDanhSach(): void {
    const dong = locDieuKhoan(ds.dong, locTrangThaiEl.value !== "tat-ca", ds.homNay);
    replaceChildren(
      bangEl,
      ...dong.map((d) => {
        const k = khungDong(d);
        return h(
          "tr",
          { class: k.tt === "DA_DONG" ? "row-off" : "", "data-id": d.id },
          h("td", null, k.phamVi),
          h("td", null, k.nguoiBan),
          h("td", null, k.tyLe),
          h("td", null, k.tu),
          h("td", null, k.den),
          h("td", null, huyHieu(k.tt)),
          h("td", { class: "row-actions" }, nutDong(d, k)),
        );
      }),
    );
    replaceChildren(
      theEl,
      ...dong.map((d) => {
        const k = khungDong(d);
        return h(
          "div",
          { class: k.tt === "DA_DONG" ? "card card-col row-off" : "card card-col", "data-id": d.id },
          h("div", null, h("strong", null, k.phamVi), " ", huyHieu(k.tt)),
          h("div", null, "Người bán: ", h("strong", null, k.nguoiBan)),
          h("div", { class: "muted" }, "Tỷ lệ mua lại: ", k.tyLe),
          h("div", { class: "muted" }, "Từ ", k.tu, " · đến ", k.den),
          nutDong(d, k),
        );
      }),
    );
    rongEl.hidden = dong.length > 0;
    rongEl.textContent = ds.dong.length === 0 ? CAU_KHONG_CO_DIEU_KHOAN : CAU_KHONG_KHOP_LOC;
  }
  locTrangThaiEl.addEventListener("change", veDanhSach);

  function moDong(d: Api.SupplyTermDto, k: ReturnType<typeof khungDong>): void {
    const macDinh = canXacNhanDongDieuKhoan(d);
    veHopDong(dongKhuEl, {
      moTa: `Đóng điều khoản: ${k.phamVi} · ${k.nguoiBan}${d.tyLeMuaBp === null ? "" : ` · mua lại ${k.tyLe}`}`,
      canhBao: macDinh ? CAU_DONG_DONG_MAC_DINH : null,
      tuNgay: d.tuNgay,
      homNay: ds.homNay,
      nhanXacNhan: macDinh ? "Vẫn đóng" : "Đóng điều khoản",
      dong: () => replaceChildren(dongKhuEl),
      chay: async (denNgay) => {
        showError(errorEl, null);
        hienOk(null);
        try {
          await api(`/api/pricing/cung-ung/${encodeURIComponent(d.id)}/dong`, { method: "POST", body: { denNgay } });
        } catch (err) {
          baoLoi(err);
          if (err instanceof ApiError && err.status === 409) {
            // Dòng vừa được người khác đóng: số liệu trên màn đã cũ — bỏ hộp, tải lại, giữ câu của máy chủ.
            replaceChildren(dongKhuEl);
            await tai(true);
          }
          throw err;
        }
        replaceChildren(dongKhuEl);
        await tai();
        hienOk("Đã ngừng điều khoản.");
      },
    });
  }

  veDanhSach();

  // ---- Thêm điều khoản ----------------------------------------------------------------------------------------------------------------------------------
  if (!duocGhi) return;
  byId("dk-add-card").hidden = false;
  const form = byId<HTMLFormElement>("dk-add-form");
  const loi = taoBangLoi();
  const phamVi = taoChonPhamVi(dm, "dk", loi);
  const congTyId = ds.congTyChu?.partyId ?? null;
  const nguoiBan = h(
    "select",
    { id: "dk-nguoi-ban" },
    congTyId !== null && h("option", { value: congTyId }, NHAN_CONG_TY),
    ...ds.nhaCungCap.map((n) => h("option", { value: n.partyId }, n.ten)),
  );
  const tyLeMua = h("input", { id: "dk-ty-le-mua", type: "text", inputMode: "decimal", maxLength: 7, placeholder: "80", autocomplete: "off" });
  const khuTyLe = h("div", null, h("label", null, "Tỷ lệ Tour Đảo mua lại (%)", tyLeMua), loi.dong("tyLeMua"));
  const veTyLe = (): void => {
    khuTyLe.hidden = nguoiBan.value === "" || nguoiBan.value === congTyId;
  };
  nguoiBan.addEventListener("change", veTyLe);
  veTyLe();
  const tuNgay = h("input", { id: "dk-tu-ngay", type: "date", value: ds.homNay });
  const denNgay = h("input", { id: "dk-den-ngay", type: "date" });
  const ghiChu = h("input", { id: "dk-ghi-chu", type: "text", maxLength: 200, autocomplete: "off" });
  const them = h("button", { type: "submit", class: "btn btn-primary" }, "Thêm điều khoản");
  replaceChildren(
    form,
    phamVi.root,
    h("div", { class: "grid two" }, h("div", null, h("label", null, "Người bán", nguoiBan), loi.dong("nguoiBan"), congTyId === null && h("span", { class: "hint" }, "Chưa có hồ sơ công ty chủ.")), khuTyLe),
    h("div", { class: "grid two" }, h("div", null, h("label", null, "Từ ngày", tuNgay), loi.dong("tuNgay")), h("div", null, h("label", null, "Đến ngày (không bắt buộc)", denNgay), loi.dong("denNgay"))),
    h("div", null, h("label", null, "Ghi chú (không bắt buộc)", ghiChu), loi.dong("ghiChu")),
    h("div", { class: "actions" }, them),
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (them.disabled) return;
    showError(errorEl, null);
    hienOk(null);
    const kq = docThanDieuKhoan({
      ...phamVi.doc(),
      nguoiBanPartyId: nguoiBan.value,
      laCongTy: congTyId !== null && nguoiBan.value === congTyId,
      tyLeMua: tyLeMua.value,
      tuNgay: tuNgay.value,
      denNgay: denNgay.value,
      ghiChu: ghiChu.value,
    });
    if (!kq.ok) {
      loi.hien(kq.loi);
      return;
    }
    loi.xoa();
    them.disabled = true;
    try {
      await api("/api/pricing/cung-ung", { method: "POST", body: kq.body });
      phamVi.datLai();
      for (const o of [tyLeMua, denNgay, ghiChu]) o.value = "";
      await tai();
      hienOk("Đã thêm điều khoản.");
      okEl.scrollIntoView({ block: "nearest" });
    } catch (err) {
      baoLoi(err);
    } finally {
      them.disabled = false;
    }
  });
}

await main();
