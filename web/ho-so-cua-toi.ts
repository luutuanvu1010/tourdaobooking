// "Hồ sơ của tôi" ở trang Tôi (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2): xem hồ sơ của mình (số CHE), đọc + đồng ý chính sách riêng tư, gửi / rút phiếu tự khai ngày sinh, địa
// chỉ, giấy tờ; Toàn quyền đăng phiên bản chính sách mới. Chỉ gọi /api/parties/cua-toi* và POST /api/parties/chinh-sach-rieng-tu (rào src/ho-so-cua-toi-giao-dien.test.ts).
// Ẩn/hiện hỏi bảng quyền (can — web/CLAUDE.md). Chỉ dựng DOM bằng h(), không chuỗi HTML. Không ảnh (ruling R1). Sau mỗi lệnh ghi: location.replace (web/CLAUDE.md "Bẫy đã cắn thật").
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { ngayVN } from "../src/shared/giay-to-hien-thi";
import { nhanLoaiPhieu, nhanTrangThaiPhieu } from "../src/shared/tu-khai-hien-thi";
import { CAU_CAN_CU_GIU_LAI, LY_DO_TU_CHOI_XOA, PHAN_GIU_LAI, nhanTrangThaiPhieuXoa } from "../src/shared/xoa-an-danh-hien-thi";
import { vnDateTimeText, vnToday } from "../src/shared/vn-date";
import { h, replaceChildren } from "./dom";

type Staff = Api.StaffProfile;
type Du = Api.HoSoCuaToiResponse;
const THONG_BAO: Record<string, string> = {
  "da-gui": "Đã gửi. Người khác sẽ xác minh trước khi thông tin được dùng.",
  "da-luu": "Đã lưu.",
  "da-xoa": "Đã gửi yêu cầu xoá dữ liệu. Tour Đảo sẽ xử lý và báo kết quả ngay tại đây.",
  "da-rut-xoa": "Đã rút yêu cầu xoá dữ liệu.",
};
const DA_XOA = "Đã xoá theo yêu cầu";
const tai = (co: string) => location.replace(`/account?hoso=${co}#ho-so-cua-toi`);
const cauLoi = (e: unknown) => (e instanceof ApiError ? e.message : "Không kết nối được. Kiểm tra mạng rồi thử lại.");

export async function initHoSoCuaToi(staff: Staff, khung: HTMLElement, baoLoi: (m: string | null) => void): Promise<void> {
  if (!staff.partyId || !can(staff, "party.self.view", { ownerId: staff.id })) return;
  let d: Du;
  try {
    d = await api<Du>("/api/parties/cua-toi");
  } catch (e) {
    baoLoi(cauLoi(e));
    return;
  }
  const co = new URLSearchParams(location.search).get("hoso") ?? "";
  replaceChildren(
    khung,
    h("h2", { id: "hs-heading" }, "Hồ sơ của tôi"),
    Object.hasOwn(THONG_BAO, co) ? h("div", { class: "alert ok", role: "status" }, THONG_BAO[co]!) : null,
    ...khoiHoSo(d),
    ...khoiChinhSach(d, baoLoi),
    ...khoiXoa(d, staff, baoLoi),
    d.coTheGui ? formKhai(d, baoLoi) : d.lyDoKhongGui ? h("p", { class: "muted" }, d.lyDoKhongGui) : null,
    ...khoiPhieu(d, baoLoi),
    can(staff, "party.privacy.policy") ? khoiDangChinhSach(d, baoLoi) : null,
  );
  khung.hidden = false;
}

function dong(nhan: string, giaTri: string): HTMLElement {
  return h("div", { class: "hs-dong" }, h("span", { class: "muted" }, nhan), h("span", null, giaTri));
}
function khoiHoSo(d: Du): (HTMLElement | null)[] {
  const s = d.hoSo;
  if (!s) return [];
  const caNhan = s.loai === "PERSON";
  // Hồ sơ đã ẩn danh theo yêu cầu xoá: chỉ dựa vào cờ daXoa của máy chủ, không bao giờ in giá trị giữ chỗ ra như dữ liệu thật.
  if (s.daXoa) {
    return [
      h("h3", null, "Thông tin đang có"),
      dong("Họ tên", s.hoTen),
      dong("Ngày sinh, địa chỉ, liên hệ, giấy tờ", DA_XOA),
      h("p", { class: "muted" }, "Thông tin cá nhân của bạn đã được xoá. Một số dữ liệu vẫn phải giữ theo quy định, xem mục Yêu cầu xoá dữ liệu bên dưới."),
    ];
  }
  return [
    h("h3", null, "Thông tin đang có"),
    dong("Họ tên", s.hoTen),
    caNhan ? dong("Ngày sinh", s.ngaySinh ? ngayVN(s.ngaySinh) : "Chưa có") : null,
    caNhan ? dong("Địa chỉ", s.diaChi.join("; ") || "Chưa có") : null,
    dong("Điện thoại", s.dienThoai.join(", ") || "Chưa có"),
    dong("Email", s.email.join(", ") || "Chưa có"),
    caNhan ? dong("Giấy tờ", s.giayTo.map((g) => `${g.loai}${g.soChe ? ` ${g.soChe}` : ""}${g.hetHan ? ` (hết hạn ${ngayVN(g.hetHan)})` : ""}`).join("; ") || "Chưa có") : null,
    h("p", { class: "muted" }, "Thông tin bạn gửi chỉ được dùng sau khi người khác xác minh. Trong lúc chờ, hồ sơ vẫn giữ thông tin cũ."),
  ];
}
/** Nút "Rút đồng ý" + bước xác nhận trong trang cho MỘT phiên bản (vòng sửa 1, ruling I-2: rút được cả phiên bản cũ còn đang đồng ý). */
function rutDongY(phienBan: number, gui: () => void): HTMLElement[] {
  const nutRut = h("button", { class: "btn", type: "button" }, "Rút đồng ý");
  const xacNhan = h("div", { class: "hs-xac-nhan", hidden: true },
    h("p", null, `Rút đồng ý phiên bản ${phienBan} sẽ rút luôn các phiếu đang chờ xác minh đã gửi theo phiên bản này. Bạn chắc chứ?`),
    h("button", { class: "btn btn-danger", type: "button", onclick: gui }, "Rút đồng ý"),
    h("button", { class: "btn", type: "button", onclick: () => { xacNhan.hidden = true; nutRut.hidden = false; } }, "Thôi"));
  nutRut.addEventListener("click", () => { nutRut.hidden = true; xacNhan.hidden = false; });
  return [nutRut, xacNhan];
}
function khoiChinhSach(d: Du, baoLoi: (m: string | null) => void): (HTMLElement | null)[] {
  const cs = d.chinhSach;
  if (!cs || !d.hoSo || d.hoSo.loai !== "PERSON") return [];
  const gui = async (chinhSachId: string, quyetDinh: "DONG_Y" | "RUT") => {
    try {
      await api<Api.DongYResponse>("/api/parties/cua-toi/dong-y", { method: "POST", body: { chinhSachId, quyetDinh } });
      tai("da-luu");
    } catch (e) {
      baoLoi(cauLoi(e));
    }
  };
  const vanBan = h("details", { class: "hs-chinh-sach-hop" }, h("summary", null, `Chính sách riêng tư (phiên bản ${cs.phienBan})`), h("p", null, cs.mucDich), h("div", { class: "hs-chinh-sach" }, cs.noiDung));
  // Phiên bản CŨ vẫn đang đồng ý (máy chủ kể ở dongYPhienBan): cho rút riêng từng bản — phiếu đang chờ gửi theo bản đó bị rút cùng lúc.
  const banCu = d.dongYPhienBan.filter((p) => p.id !== cs.id).flatMap((p) => [
    h("p", { class: "muted" }, `Bạn vẫn đang đồng ý chính sách riêng tư phiên bản cũ ${p.phienBan}.`),
    ...rutDongY(p.phienBan, () => void gui(p.id, "RUT")),
  ]);
  if (d.dongY) {
    return [vanBan, h("p", null, `Bạn đã đồng ý chính sách riêng tư phiên bản ${cs.phienBan}.`), ...rutDongY(cs.phienBan, () => void gui(cs.id, "RUT")), ...banCu];
  }
  const o = h("input", { type: "checkbox", id: "hs-dong-y" }) as HTMLInputElement;
  const nut = h("button", { class: "btn btn-primary", type: "button", disabled: true, onclick: () => void gui(cs.id, "DONG_Y") }, "Đồng ý") as HTMLButtonElement;
  o.addEventListener("change", () => { nut.disabled = !o.checked; });
  return [vanBan, h("label", { class: "hs-check", for: "hs-dong-y" }, o, h("span", null, `Tôi đã đọc và đồng ý chính sách riêng tư phiên bản ${cs.phienBan}.`)), nut, ...banCu];
}
function formKhai(d: Du, baoLoi: (m: string | null) => void): HTMLElement {
  const loai = h("select", { id: "hs-loai" },
    h("option", { value: "NGAY_SINH" }, "Ngày sinh"), h("option", { value: "DIA_CHI" }, "Địa chỉ"), h("option", { value: "GIAY_TO" }, "Giấy tờ")) as HTMLSelectElement;
  const ngaySinh = h("input", { type: "date", id: "hs-ngay-sinh", max: vnToday(new Date()) }) as HTMLInputElement;
  const diaChi = h("input", { type: "text", id: "hs-dia-chi", maxlength: 200, autocomplete: "off" }) as HTMLInputElement;
  const loaiGiay = h("select", { id: "hs-loai-giay" }, ...d.loaiGiayTo.map((t) => h("option", { value: t.ma }, t.ten))) as HTMLSelectElement;
  const so = h("input", { type: "text", id: "hs-so", maxlength: 40, autocomplete: "off" }) as HTMLInputElement;
  const hang = h("select", { id: "hs-hang" }, h("option", { value: "" }, "—"), ...d.hangGplx.map((c) => h("option", { value: c.ma }, c.ten))) as HTMLSelectElement;
  const ngayCap = h("input", { type: "date", id: "hs-ngay-cap" }) as HTMLInputElement;
  const noiCap = h("input", { type: "text", id: "hs-noi-cap", maxlength: 200 }) as HTMLInputElement;
  const hetHan = h("input", { type: "date", id: "hs-het-han" }) as HTMLInputElement;
  const oNgay = h("label", null, "Ngày sinh", ngaySinh);
  const oDiaChi = h("label", null, "Địa chỉ", diaChi);
  const oHang = h("label", null, "Hạng (giấy phép lái xe)", hang);
  const oHetHan = h("label", null, "Ngày hết hạn", hetHan);
  const oGiay = h("div", null, h("label", null, "Loại giấy tờ", loaiGiay), h("label", null, "Số", so), oHang, h("label", null, "Ngày cấp", ngayCap), h("label", null, "Nơi cấp", noiCap), oHetHan);
  const hien = () => {
    oNgay.hidden = loai.value !== "NGAY_SINH";
    oDiaChi.hidden = loai.value !== "DIA_CHI";
    oGiay.hidden = loai.value !== "GIAY_TO";
    oHang.hidden = loaiGiay.value !== "GPLX";
    oHetHan.hidden = !(d.loaiGiayTo.find((t) => t.ma === loaiGiay.value)?.coHan ?? true);
  };
  loai.addEventListener("change", hien);
  loaiGiay.addEventListener("change", hien);
  hien();
  const rong = (v: string) => (v.trim() === "" ? null : v.trim());
  const form = h("form", { id: "hs-form", autocomplete: "off" },
    h("h3", null, "Khai thông tin để xác minh"), h("label", null, "Bạn muốn khai", loai), oNgay, oDiaChi, oGiay,
    h("button", { class: "btn btn-primary", type: "submit" }, "Gửi xác minh")) as HTMLFormElement;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const body: Record<string, unknown> = { chinhSachId: d.chinhSach!.id, loai: loai.value };
    if (loai.value === "NGAY_SINH") body.ngaySinh = ngaySinh.value;
    else if (loai.value === "DIA_CHI") body.diaChi = diaChi.value;
    else body.giayTo = { typeCode: loaiGiay.value, number: rong(so.value), classCode: oHang.hidden ? null : rong(hang.value), issuedDate: rong(ngayCap.value), issuedPlace: rong(noiCap.value), expiryDate: oHetHan.hidden ? null : rong(hetHan.value) };
    try {
      await api<Api.PhieuTuKhaiTaoResponse>("/api/parties/cua-toi/phieu", { method: "POST", body });
      tai("da-gui");
    } catch (e) {
      baoLoi(cauLoi(e));
    }
  });
  return form;
}
function khoiPhieu(d: Du, baoLoi: (m: string | null) => void): HTMLElement[] {
  if (d.phieu.length === 0) return [];
  return [
    h("h3", null, "Phiếu đã gửi"),
    ...d.phieu.map((p) => {
      const noiDung = p.daXoa ? DA_XOA : p.loai === "NGAY_SINH" ? ngayVN(p.ngaySinh) : p.loai === "DIA_CHI" ? (p.diaChi ?? "") : p.giayTo ? `${p.giayTo.loai}${p.giayTo.soChe ? ` ${p.giayTo.soChe}` : ""}` : "";
      const dongP = h("div", { class: "hs-phieu" },
        h("strong", null, nhanLoaiPhieu(p.loai)), h("span", null, noiDung), h("span", { class: "muted" }, nhanTrangThaiPhieu(p.trangThai)),
        h("span", { class: "muted" }, `Gửi lúc ${vnDateTimeText(p.guiLuc)}`));
      if (p.trangThai === "CHO_XAC_MINH") {
        const nut = h("button", { class: "btn", type: "button" }, "Rút phiếu");
        const xacNhan = h("span", { class: "hs-xac-nhan", hidden: true },
          h("button", { class: "btn btn-danger", type: "button", onclick: async () => {
            try {
              await api<Api.PhieuTuKhaiRutResponse>(`/api/parties/cua-toi/phieu/${p.id}/rut`, { method: "POST" });
              tai("da-luu");
            } catch (e) {
              baoLoi(cauLoi(e));
            }
          } }, "Rút phiếu này"),
          h("button", { class: "btn", type: "button", onclick: () => { xacNhan.hidden = true; nut.hidden = false; } }, "Thôi"));
        nut.addEventListener("click", () => { nut.hidden = true; xacNhan.hidden = false; });
        dongP.append(nut, xacNhan);
      }
      return dongP;
    }),
  ];
}
function khoiDangChinhSach(d: Du, baoLoi: (m: string | null) => void): HTMLElement {
  const mucDich = h("textarea", { id: "hs-cs-muc-dich", maxlength: 2000, rows: 3 }) as HTMLTextAreaElement;
  const noiDung = h("textarea", { id: "hs-cs-noi-dung", maxlength: 20000, rows: 8 }) as HTMLTextAreaElement;
  if (d.chinhSach) {
    mucDich.value = d.chinhSach.mucDich;
    noiDung.value = d.chinhSach.noiDung;
  }
  const oHanXoa = h("input", { type: "text", id: "hs-cs-han-xoa", inputmode: "numeric", maxlength: 5, autocomplete: "off", value: d.chinhSach?.hanXuLyXoaNgay != null ? String(d.chinhSach.hanXuLyXoaNgay) : "" }) as HTMLInputElement;
  const oHanPhien = h("input", { type: "text", id: "hs-cs-han-phien", inputmode: "numeric", maxlength: 5, autocomplete: "off", value: d.chinhSach?.hanGiuPhienNgay != null ? String(d.chinhSach.hanGiuPhienNgay) : "" }) as HTMLInputElement;
  const form = h("form", { id: "hs-dang-cs" },
    h("p", { class: "muted" }, "Đăng phiên bản mới thì mọi người phải đồng ý lại trước khi gửi thông tin. Chữ chính sách cần chủ dự án và luật sư duyệt trước khi đăng."),
    h("label", null, "Mục đích thu thập", mucDich), h("label", null, "Toàn văn chính sách", noiDung),
    h("label", null, "Số ngày xử lý yêu cầu xoá", oHanXoa), h("label", null, "Số ngày giữ IP và thông tin của máy đã đăng xuất", oHanPhien),
    h("p", { class: "muted" }, "Để trống nếu chưa có số được luật sư xác nhận. Nền tảng không tự điền số ngày."),
    h("button", { class: "btn btn-primary", type: "submit" }, "Đăng phiên bản mới")) as HTMLFormElement;
  /** Ô số ngày: trống = chưa có số (null); có chữ thì phải là số nguyên dương. */
  const soNgay = (o: HTMLInputElement): number | null | "loi" => {
    const t = o.value.trim();
    if (t === "") return null;
    return /^[0-9]{1,5}$/.test(t) && Number(t) >= 1 ? Number(t) : "loi";
  };
  // Vòng sửa 2, I-1: đăng là cửa MỘT CHIỀU (bảng chỉ-thêm, hiệu lực ngay) — bấm "Đăng phiên bản mới" chỉ mở bước xác nhận trong trang; lệnh ghi ở nút "Xác nhận đăng".
  const xacNhan = h("div", { class: "hs-xac-nhan", id: "hs-dang-cs-xac-nhan", hidden: true },
    h("p", null, "Đăng là có hiệu lực ngay và không gỡ được: chính sách lưu vĩnh viễn, mọi người phải đồng ý lại và có thể bắt đầu gửi ngày sinh, địa chỉ, số giấy tờ. Chỉ đăng khi chữ đã được luật sư duyệt và đã có cách xoá dữ liệu theo yêu cầu."),
    h("button", { class: "btn btn-danger", type: "button", onclick: async () => {
      try {
        const hanXoa = soNgay(oHanXoa);
        const hanPhien = soNgay(oHanPhien);
        if (hanXoa === "loi" || hanPhien === "loi") {
          xacNhan.hidden = true;
          baoLoi("Số ngày phải là số nguyên từ 1 trở lên, hoặc để trống.");
          return;
        }
        await api<Api.ChinhSachDangResponse>("/api/parties/chinh-sach-rieng-tu", { method: "POST", body: { mucDich: mucDich.value, noiDung: noiDung.value, hanXuLyXoaNgay: hanXoa, hanGiuPhienNgay: hanPhien } });
        tai("da-luu");
      } catch (e) {
        baoLoi(cauLoi(e));
      }
    } }, "Xác nhận đăng"),
    h("button", { class: "btn", type: "button", onclick: () => { xacNhan.hidden = true; } }, "Huỷ"));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    xacNhan.hidden = false;
  });
  return h("details", { id: "hs-dang-chinh-sach" }, h("summary", null, "Đăng chính sách riêng tư mới"), form, xacNhan);
}

/** Mục "Yêu cầu xoá dữ liệu" (ADR-0126 đ2): gửi yêu cầu qua HAI bước trong trang, xem trạng thái, rút khi còn chờ. Thời hạn chỉ hiện khi chính sách có số ngày. */
function khoiXoa(d: Du, staff: Staff, baoLoi: (m: string | null) => void): HTMLElement[] {
  if (!d.hoSo || !can(staff, "party.erasure.request", { ownerId: staff.id })) return [];
  const han = d.chinhSach?.hanXuLyXoaNgay;
  const dongHan = han != null ? `Thời hạn xử lý: ${han} ngày kể từ khi gửi.` : "Chính sách chưa ghi thời hạn. Tour Đảo sẽ xử lý sớm nhất có thể.";
  const ra: HTMLElement[] = [
    h("h3", { id: "hs-xoa-tieu-de" }, "Yêu cầu xoá dữ liệu"),
    h("p", null, "Nền tảng sẽ xoá số giấy tờ, ảnh giấy tờ, địa chỉ, ngày sinh, liên hệ và thông tin máy đăng nhập của bạn. Một số thông tin phải giữ theo quy định, danh sách hiện ra sau khi yêu cầu được xử lý."),
    h("p", { class: "muted", id: "hs-xoa-han" }, dongHan),
  ];
  if (d.coTheGuiXoa) {
    const nut = h("button", { class: "btn btn-danger", type: "button", id: "hs-xoa-gui" }, "Gửi yêu cầu xoá");
    const xacNhan = h("div", { class: "hs-xac-nhan", id: "hs-xoa-xac-nhan", hidden: true },
      h("p", null, "Gửi yêu cầu? Sau khi được thực hiện, việc xoá không hoàn tác được. Thông tin đang chờ xác minh của bạn sẽ được rút."),
      h("button", { class: "btn btn-danger", type: "button", id: "hs-xoa-xac-nhan-gui", onclick: async () => {
        try {
          await api<Api.PhieuXoaTaoResponse>("/api/parties/cua-toi/phieu-xoa", { method: "POST", body: { xacNhan: true } });
          tai("da-xoa");
        } catch (e) {
          baoLoi(cauLoi(e));
        }
      } }, "Gửi yêu cầu"),
      h("button", { class: "btn", type: "button", onclick: () => { xacNhan.hidden = true; nut.hidden = false; } }, "Thôi"));
    nut.addEventListener("click", () => { nut.hidden = true; xacNhan.hidden = false; });
    ra.push(nut, xacNhan);
  } else if (d.lyDoKhongGuiXoa) ra.push(h("p", { class: "muted", id: "hs-xoa-ly-do" }, d.lyDoKhongGuiXoa));
  for (const p of d.phieuXoa) {
    const dong2 = h("div", { class: "hs-phieu hs-phieu-xoa", "data-trang-thai": p.trangThai },
      h("strong", null, nhanTrangThaiPhieuXoa(p.trangThai)),
      h("span", { class: "muted" }, `Gửi lúc ${vnDateTimeText(p.guiLuc)}`),
      p.trangThai === "CHO_XU_LY" ? h("span", { class: "muted" }, p.han ? `Hạn xử lý ${vnDateTimeText(p.han)}` : "Chưa có thời hạn") : null,
      p.xuLyLuc && p.trangThai !== "CHO_XU_LY" ? h("span", { class: "muted" }, `Xử lý lúc ${vnDateTimeText(p.xuLyLuc)}`) : null);
    if (p.trangThai === "TU_CHOI") {
      const ly = LY_DO_TU_CHOI_XOA.find((x) => x.ma === p.lyDoTuChoi);
      if (ly) dong2.append(h("span", null, `Lý do: ${ly.nhan}`));
    }
    if (p.trangThai === "DA_THUC_HIEN") {
      const giu = PHAN_GIU_LAI.filter((x) => p.phanGiuLai.includes(x.ma));
      dong2.append(h("div", { class: "hs-giu-lai" },
        h("p", null, "Phần được giữ lại:"),
        giu.length ? h("ul", null, ...giu.map((x) => h("li", null, x.nhan))) : h("p", { class: "muted" }, "Không có."),
        h("p", { class: "muted" }, CAU_CAN_CU_GIU_LAI)));
    }
    if (p.trangThai === "CHO_XU_LY") {
      const nutRut = h("button", { class: "btn", type: "button" }, "Rút yêu cầu");
      const xacNhanRut = h("span", { class: "hs-xac-nhan", hidden: true },
        h("button", { class: "btn btn-danger", type: "button", onclick: async () => {
          try {
            await api<Api.PhieuXoaRutResponse>(`/api/parties/cua-toi/phieu-xoa/${p.id}/rut`, { method: "POST" });
            tai("da-rut-xoa");
          } catch (e) {
            baoLoi(cauLoi(e));
          }
        } }, "Rút yêu cầu này"),
        h("button", { class: "btn", type: "button", onclick: () => { xacNhanRut.hidden = true; nutRut.hidden = false; } }, "Thôi"));
      nutRut.addEventListener("click", () => { nutRut.hidden = true; xacNhanRut.hidden = false; });
      dong2.append(nutRut, xacNhanRut);
    }
    ra.push(dong2);
  }
  return ra;
}
