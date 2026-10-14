// Trang "Hoa hồng đối tác" — bảng mức hoa hồng của đối tác (sổ đại lý đợt 1, Task 10; ADR-0077). Gọi các route của module pricing:
//   GET  /api/pricing/hoa-hong            → CommissionRuleListResponse (mọi dòng mức, `vai` = các loại đối tác được hưởng);
//   POST /api/pricing/hoa-hong            → thêm một mức (201);   POST /api/pricing/hoa-hong/:id/dong → { denNgay };
//   GET  /api/pricing/thu-tra             → ThuTraResponse (mức nào thắng cho một đối tác + một dịch vụ + một ngày — máy chủ chọn, trang chỉ dịch ra lời);
//   GET  /api/pricing/nguoi-huong?q=      → tìm đối tác theo tên (chỉ khi `coTheTimDoiTac`: route đó hỏi order.create).
//   GET  /api/pricing/loai-doi-tac → LoaiDoiTacListResponse (mục «Loại đối tác», ADR-0117 lần 1); POST cùng đường (thêm loại, 201); POST …/:code/tat | /bat (đổi trạng thái loại do Kế toán thêm).
// Ẩn/hiện hỏi bảng quyền (`can`): xem = partner.commission.view, thêm / đóng = partner.commission.write; máy chủ kiểm lại, kể cả chặn tài khoản giữ quyền Đối tác (403 ⇒ câu
// «Bạn không có quyền xem trang này.»). Mức không sửa, không xoá — chỉ thêm và đóng (bảng chỉ-thêm). Trang không tính tiền, không chọn mức: số và lời đều từ máy chủ / luật thuần.
// Chữ ở src/shared/hoa-hong-hien-thi.ts, đọc ô ở src/shared/so-dai-ly-nhap.ts (có bài kiểm); khối chung ở web/so-dai-ly-ui.ts.
import { CAU_KHONG_CO_LOAI, CAU_KHONG_CO_MUC, CAU_KHONG_CO_QUYEN_XEM, CAU_KHONG_KHOP_LOC, NHAN_TRANG_THAI, cauThuTra, coTheTimDoiTac, dongDongDuoc, locMuc, nhanDoiTuong, nhanLoaiDoiTac, nhanMucDto, nhanPhamVi, trangThaiDong } from "../src/shared/hoa-hong-hien-thi";
import { can } from "../src/shared/permissions";
import { docThanMuc, type FormMuc } from "../src/shared/so-dai-ly-nhap";
import { ngayDayDu } from "../src/shared/vn-date";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { lyDoLoi, taiDanhMuc, taoBangLoi, taoChonDichVu, taoChonPhamVi, taoTimDoiTac, truong, veHopDong, type DanhMuc } from "./so-dai-ly-ui";

const errorEl = byId("error");
const okEl = byId("ok");
const noiDungEl = byId("hh-noi-dung");
const bangEl = byId("muc-list");
const theEl = byId("muc-list-cards");
const rongEl = byId("muc-rong");
const dongKhuEl = byId("muc-dong-khu");
const loaiListEl = byId("loai-list");
const loaiRongEl = byId("loai-rong");
const loaiFormEl = byId<HTMLFormElement>("loai-add-form");
const loaiLoiEl = byId("loai-loi");
const locTrangThaiEl = byId<HTMLSelectElement>("muc-loc-trang-thai");
const locTimEl = byId<HTMLInputElement>("muc-loc-tim");

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
  let ds: Api.CommissionRuleListResponse;
  let dm: DanhMuc;
  let loai: Api.LoaiDoiTacDto[];
  try {
    let dsLoai: Api.LoaiDoiTacListResponse;
    [ds, dm, dsLoai] = await Promise.all([api<Api.CommissionRuleListResponse>("/api/pricing/hoa-hong"), taiDanhMuc(), api<Api.LoaiDoiTacListResponse>("/api/pricing/loai-doi-tac")]);
    loai = dsLoai.loai;
  } catch (err) {
    showError(errorEl, err instanceof ApiError && err.status === 403 ? CAU_KHONG_CO_QUYEN_XEM : lyDoLoi(err));
    return;
  }
  const duocGhi = can(staff, "partner.commission.write");
  const choPhepTim = coTheTimDoiTac(staff);
  noiDungEl.hidden = false;

  // ---- Loại đối tác (ADR-0117 lần 1) ------------------------------------------------------------------------------------------------------------------
  // Danh sách do máy chủ trả theo thứ tự cố định (loại có sẵn trước). Nút «Tắt» / «Bật» chỉ ở loại do Kế toán thêm (`coSan` = false) và chỉ khi người xem có ô ghi; máy chủ kiểm lại.
  // Thêm / tắt / bật xong phải tải lại CẢ bảng mức: ô «Loại đối tác» của biểu mẫu «Thêm mức» dựng từ `ds.vai`, nếu không thì loại mới chưa chọn được để đặt mức.
  let lamMoiOChonVai: () => void = () => {};
  const loiLoai = (text: string | null): void => {
    loaiLoiEl.textContent = text ?? "";
    loaiLoiEl.hidden = !text;
  };
  /** Tải lại danh sách loại + bảng mức. `giuLoi`: sau một lỗi 409 vừa hiện, lỗi tải lại không được đè câu của máy chủ. */
  async function taiLoai(giuLoi = false): Promise<void> {
    try {
      const [moiLoai, moiMuc] = await Promise.all([api<Api.LoaiDoiTacListResponse>("/api/pricing/loai-doi-tac"), api<Api.CommissionRuleListResponse>("/api/pricing/hoa-hong")]);
      loai = moiLoai.loai;
      ds = moiMuc;
    } catch (err) {
      if (!giuLoi) loiLoai(lyDoLoi(err));
    }
    veLoai();
    veDanhSach();
    lamMoiOChonVai();
  }
  async function doiTrangThaiLoai(l: Api.LoaiDoiTacDto, hanhDong: "tat" | "bat"): Promise<void> {
    loiLoai(null);
    hienOk(null);
    try {
      await api(`/api/pricing/loai-doi-tac/${encodeURIComponent(l.code)}/${hanhDong}`, { method: "POST", body: {} });
    } catch (err) {
      loiLoai(lyDoLoi(err));
      // 409: loại vừa được người khác đổi — số liệu trên màn đã cũ; tải lại, giữ câu của máy chủ.
      if (err instanceof ApiError && err.status === 409) await taiLoai(true);
      return;
    }
    await taiLoai();
    hienOk(hanhDong === "tat" ? `Đã tắt loại «${l.ten}». Hồ sơ đã mang loại này vẫn giữ; gắn mới thì không được.` : `Đã bật loại «${l.ten}».`);
  }
  function veLoai(): void {
    replaceChildren(
      loaiListEl,
      ...loai.map((l) => {
        const k = nhanLoaiDoiTac(l);
        const nut = duocGhi && k.nut ? h("button", { type: "button", class: "btn", "data-loai-act": k.nut.hanhDong, "aria-label": k.nut.ariaLabel }, k.nut.nhan) : false;
        if (nut) nut.addEventListener("click", () => { nut.disabled = true; void doiTrangThaiLoai(l, k.nut!.hanhDong).finally(() => { nut.disabled = false; }); });
        return h(
          "li",
          { class: l.dangBat ? "" : "row-off", "data-loai": l.code },
          h("div", { class: "hh-loai-ten" }, h("strong", null, l.ten), h("div", { class: "hh-loai-nhan" }, h("span", { class: "muted" }, k.nguon), h("span", { class: l.dangBat ? "badge badge-confirmed" : "badge badge-cancelled" }, k.trangThai))),
          nut,
        );
      }),
    );
    loaiRongEl.hidden = loai.length > 0;
    loaiRongEl.textContent = CAU_KHONG_CO_LOAI;
  }
  if (duocGhi) {
    const ten = h("input", { id: "loai-ten", type: "text", maxLength: 60, autocomplete: "off", "aria-label": "Tên loại mới", placeholder: "Ví dụ: Nhân viên spa" });
    const them = h("button", { type: "submit", class: "btn btn-primary" }, "Thêm loại");
    replaceChildren(loaiFormEl, h("label", null, "Tên loại mới", ten), h("div", { class: "actions" }, them));
    loaiFormEl.hidden = false;
    loaiFormEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (them.disabled) return;
      loiLoai(null);
      hienOk(null);
      them.disabled = true;
      try {
        const r = await api<Api.LoaiDoiTacResponse>("/api/pricing/loai-doi-tac", { method: "POST", body: { ten: ten.value } });
        ten.value = "";
        await taiLoai();
        hienOk(`Đã thêm loại «${r.loai.ten}». Đặt mức cho loại này ở phần «Thêm mức» bên dưới.`);
      } catch (err) {
        loiLoai(lyDoLoi(err));
      } finally {
        them.disabled = false;
      }
    });
  }

  veLoai();

  // ---- Danh sách ---------------------------------------------------------------------------------------------------------------------------------------
  /** Tải lại bảng mức. `giuLoi`: sau một lỗi 409 vừa hiện, lỗi tải lại không được đè câu của máy chủ. */
  async function tai(giuLoi = false): Promise<void> {
    try {
      ds = await api<Api.CommissionRuleListResponse>("/api/pricing/hoa-hong");
    } catch (err) {
      if (!giuLoi) baoLoi(err);
    }
    veDanhSach();
  }

  const khungDong = (d: Api.CommissionRuleDto): { doiTuong: { ten: string; loai: string }; phamVi: string; muc: string; tu: string; den: string; tt: ReturnType<typeof trangThaiDong> } => ({
    doiTuong: nhanDoiTuong(d.doiTuong),
    phamVi: nhanPhamVi(d, dm.ten),
    muc: nhanMucDto(d),
    tu: ngayDayDu(d.tuNgay),
    den: d.denNgay === null ? "—" : ngayDayDu(d.denNgay),
    tt: trangThaiDong(d, ds.homNay),
  });
  const huyHieu = (tt: ReturnType<typeof trangThaiDong>): HTMLElement =>
    h("span", { class: tt === "DANG_AP" ? "badge badge-confirmed" : tt === "SAP_AP" ? "badge badge-draft" : "badge badge-cancelled" }, NHAN_TRANG_THAI[tt]);
  const nutDong = (d: Api.CommissionRuleDto, k: ReturnType<typeof khungDong>): HTMLElement | false => {
    if (!duocGhi || !dongDongDuoc(d)) return false;
    const nut = h("button", { type: "button", class: "btn", "data-dong": d.id, "aria-label": `Đóng mức: ${k.doiTuong.ten} · ${k.phamVi}` }, "Đóng mức");
    nut.addEventListener("click", () => moDong(d, k));
    return nut;
  };

  function veDanhSach(): void {
    const dong = locMuc(ds.dong, { chiConHieuLuc: locTrangThaiEl.value !== "tat-ca", tim: locTimEl.value }, ds.homNay, dm.ten);
    replaceChildren(
      bangEl,
      ...dong.map((d) => {
        const k = khungDong(d);
        return h(
          "tr",
          { class: k.tt === "DA_DONG" ? "row-off" : "", "data-id": d.id },
          h("td", null, h("strong", null, k.doiTuong.ten), h("span", { class: "hh-nhan-nho" }, k.doiTuong.loai)),
          h("td", null, k.phamVi),
          h("td", null, k.muc),
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
          h("div", null, h("strong", null, k.doiTuong.ten), " ", huyHieu(k.tt)),
          h("div", { class: "muted" }, k.doiTuong.loai, " · ", k.phamVi),
          h("div", null, h("strong", null, k.muc)),
          h("div", { class: "muted" }, "Từ ", k.tu, " · đến ", k.den),
          nutDong(d, k),
        );
      }),
    );
    rongEl.hidden = dong.length > 0;
    rongEl.textContent = ds.dong.length === 0 ? CAU_KHONG_CO_MUC : CAU_KHONG_KHOP_LOC;
  }
  locTrangThaiEl.addEventListener("change", veDanhSach);
  locTimEl.addEventListener("input", veDanhSach);

  function moDong(d: Api.CommissionRuleDto, k: ReturnType<typeof khungDong>): void {
    veHopDong(dongKhuEl, {
      moTa: `Đóng mức: ${k.doiTuong.ten} · ${k.phamVi} · ${k.muc}`,
      canhBao: null,
      tuNgay: d.tuNgay,
      homNay: ds.homNay,
      nhanXacNhan: "Đóng mức",
      dong: () => replaceChildren(dongKhuEl),
      chay: async (denNgay) => {
        showError(errorEl, null);
        hienOk(null);
        try {
          await api(`/api/pricing/hoa-hong/${encodeURIComponent(d.id)}/dong`, { method: "POST", body: { denNgay } });
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
        hienOk("Đã đóng mức.");
      },
    });
  }

  veDanhSach();

  // ---- Thêm mức -----------------------------------------------------------------------------------------------------------------------------------------
  if (duocGhi) {
    byId("muc-add-card").hidden = false;
    const form = byId<HTMLFormElement>("muc-add-form");
    const loi = taoBangLoi();
    const loaiVai = h("input", { type: "radio", class: "o-tick", name: "muc-doi-tuong", value: "VAI", checked: true });
    const loaiDoiTac = h("input", { type: "radio", class: "o-tick", name: "muc-doi-tuong", value: "DOI_TAC" });
    const vai = h("select", { id: "muc-vai", "aria-label": "Loại đối tác" });
    const ghiChuVai = h("span", { class: "hint" }, "Chưa có loại đối tác nào được hưởng hoa hồng.");
    // Dựng lại các lựa chọn từ `ds.vai` (sau khi thêm / tắt / bật một loại ở mục «Loại đối tác»); giữ loại đang chọn nếu còn.
    lamMoiOChonVai = (): void => {
      const dangChon = vai.value;
      replaceChildren(vai, h("option", { value: "" }, "— Chọn loại đối tác —"), ...ds.vai.map((v) => h("option", { value: v.code }, v.ten)));
      vai.value = ds.vai.some((v) => v.code === dangChon) ? dangChon : "";
      ghiChuVai.hidden = ds.vai.length > 0;
    };
    lamMoiOChonVai();
    const timDoiTac = taoTimDoiTac({ choPhep: choPhepTim, id: "muc-doi-tac" });
    const khuVai = h("div", null, vai, ghiChuVai);
    const khuDoiTac = h("div", null, timDoiTac.root);
    const veDoiTuong = (): void => {
      khuVai.hidden = !loaiVai.checked;
      khuDoiTac.hidden = !loaiDoiTac.checked;
    };
    loaiVai.addEventListener("change", veDoiTuong);
    loaiDoiTac.addEventListener("change", veDoiTuong);
    veDoiTuong();

    const phamVi = taoChonPhamVi(dm, "muc", loi);
    const kieu = h("select", { id: "muc-kieu" }, h("option", { value: "RATE" }, "Phần trăm"), h("option", { value: "PER_PAX" }, "Số tiền mỗi khách"));
    const tyLe = h("input", { id: "muc-ty-le", type: "text", inputMode: "decimal", maxLength: 7, placeholder: "12,5", autocomplete: "off" });
    const moiKhach = h("input", { id: "muc-moi-khach", type: "text", inputMode: "numeric", maxLength: 12, placeholder: "50.000", autocomplete: "off" });
    const khuTyLe = h("label", null, "Phần trăm (%)", tyLe);
    const khuMoiKhach = h("label", null, "Số tiền mỗi khách (đồng)", moiKhach);
    const veKieu = (): void => {
      khuTyLe.hidden = kieu.value !== "RATE";
      khuMoiKhach.hidden = kieu.value !== "PER_PAX";
    };
    kieu.addEventListener("change", veKieu);
    veKieu();
    const tuNgay = h("input", { id: "muc-tu-ngay", type: "date", value: ds.homNay });
    const denNgay = h("input", { id: "muc-den-ngay", type: "date" });
    const ghiChu = h("input", { id: "muc-ghi-chu", type: "text", maxLength: 200, autocomplete: "off" });
    const them = h("button", { type: "submit", class: "btn btn-primary" }, "Thêm mức");

    replaceChildren(
      form,
      h(
        "fieldset",
        { class: "hh-nhom" },
        h("legend", null, "Áp cho"),
        h("div", { class: "hh-radio" }, h("label", { class: "check" }, loaiVai, "Loại đối tác"), h("label", { class: "check" }, loaiDoiTac, "Một đối tác")),
        khuVai,
        khuDoiTac,
        loi.dong("doiTuong"),
      ),
      phamVi.root,
      h("div", { class: "grid two" }, h("label", null, "Kiểu mức", kieu), h("div", null, khuTyLe, khuMoiKhach, loi.dong("muc"))),
      h("div", { class: "grid two" }, h("div", null, h("label", null, "Từ ngày", tuNgay), loi.dong("tuNgay")), h("div", null, h("label", null, "Đến ngày (không bắt buộc)", denNgay), loi.dong("denNgay"))),
      h("div", null, h("label", null, "Ghi chú (không bắt buộc)", ghiChu), loi.dong("ghiChu")),
      h("div", { class: "actions" }, them),
    );
    timDoiTac.khiDoi(() => loi.xoa());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (them.disabled) return;
      showError(errorEl, null);
      hienOk(null);
      const chon = timDoiTac.chon();
      const f: FormMuc = {
        doiTuong: loaiVai.checked ? { loai: "VAI", code: vai.value } : { loai: "DOI_TAC", partyId: chon?.partyId ?? "" },
        ...phamVi.doc(),
        kieu: kieu.value === "PER_PAX" ? "PER_PAX" : "RATE",
        tyLe: tyLe.value,
        moiKhach: moiKhach.value,
        tuNgay: tuNgay.value,
        denNgay: denNgay.value,
        ghiChu: ghiChu.value,
      };
      const kq = docThanMuc(f);
      if (!kq.ok) {
        loi.hien(kq.loi);
        return;
      }
      loi.xoa();
      them.disabled = true;
      try {
        await api("/api/pricing/hoa-hong", { method: "POST", body: kq.body });
        timDoiTac.datLai();
        phamVi.datLai();
        for (const o of [tyLe, moiKhach, denNgay, ghiChu]) o.value = "";
        vai.value = "";
        await tai();
        hienOk("Đã thêm mức.");
        okEl.scrollIntoView({ block: "nearest" });
      } catch (err) {
        baoLoi(err);
      } finally {
        them.disabled = false;
      }
    });
  }

  // ---- Thử tra ------------------------------------------------------------------------------------------------------------------------------------------
  {
    const form = byId<HTMLFormElement>("thu-tra-form");
    const ketQuaEl = byId("thu-tra-ket-qua");
    const loi = taoBangLoi();
    const doiTac = taoTimDoiTac({ choPhep: choPhepTim, id: "thu-tra-doi-tac" });
    const dichVu = taoChonDichVu(dm, "thu-tra-dich-vu");
    const ngay = h("input", { id: "thu-tra-ngay", type: "date", value: ds.homNay });
    const tra = h("button", { type: "submit", class: "btn btn-primary", disabled: !choPhepTim }, "Tra mức");
    replaceChildren(
      form,
      h("div", null, truong("Đối tác", doiTac.root), loi.dong("doiTuong")),
      h("div", null, truong("Dịch vụ", dichVu.root), loi.dong("phamVi")),
      h("div", null, h("label", null, "Ngày", ngay), loi.dong("tuNgay")),
      h("div", { class: "actions" }, tra),
    );
    doiTac.khiDoi(() => loi.xoa());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (tra.disabled) return;
      const chon = doiTac.chon();
      const loiO = [
        ...(chon ? [] : [{ truong: "doiTuong" as const, message: "Chọn một đối tác." }]),
        ...(dichVu.ma() === "" ? [{ truong: "phamVi" as const, message: "Chọn một dịch vụ." }] : []),
        ...(ngay.value === "" ? [{ truong: "tuNgay" as const, message: "Chọn ngày." }] : []),
      ];
      if (loiO.length > 0 || !chon) {
        loi.hien(loiO);
        return;
      }
      loi.xoa();
      tra.disabled = true;
      replaceChildren(ketQuaEl, h("p", { class: "muted" }, "Đang tra…"));
      try {
        const q = new URLSearchParams({ doiTac: chon.partyId, dichVu: dichVu.ma(), ngay: ngay.value });
        const r = await api<Api.ThuTraResponse>(`/api/pricing/thu-tra?${q.toString()}`);
        replaceChildren(
          ketQuaEl,
          h("p", { class: "hh-ket-qua" }, cauThuTra(r)),
          r.nguoiHuong.loai === "HUONG" && r.nguoiHuong.vai.length > 0 && h("p", { class: "muted" }, `Vai của đối tác: ${r.nguoiHuong.vai.join(", ")}`),
          h("p", { class: "muted" }, `Tra theo bảng mức ngày ${ngayDayDu(r.ngay)}.`),
        );
      } catch (err) {
        replaceChildren(ketQuaEl, h("p", { class: "field-error" }, lyDoLoi(err)));
      } finally {
        tra.disabled = false;
      }
    });
  }
}

await main();
