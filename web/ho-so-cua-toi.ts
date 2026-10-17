// "Hồ sơ của tôi" ở trang Tôi (ADR-0124, ADR-0126 đ1; lát H-3 Gói 2): xem hồ sơ của mình (số CHE), đọc + đồng ý chính sách riêng tư, gửi / rút phiếu tự khai ngày sinh, địa
// chỉ, giấy tờ; Toàn quyền đăng phiên bản chính sách mới. Chỉ gọi /api/parties/cua-toi* và POST /api/parties/chinh-sach-rieng-tu (rào src/ho-so-cua-toi-giao-dien.test.ts).
// Ẩn/hiện hỏi bảng quyền (can — web/CLAUDE.md). Chỉ dựng DOM bằng h(), không chuỗi HTML. Không ảnh (ruling R1). Sau mỗi lệnh ghi: location.replace (web/CLAUDE.md "Bẫy đã cắn thật").
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { ngayVN } from "../src/shared/giay-to-hien-thi";
import { nhanLoaiPhieu, nhanTrangThaiPhieu } from "../src/shared/tu-khai-hien-thi";
import { vnDateTimeText, vnToday } from "../src/shared/vn-date";
import { h, replaceChildren } from "./dom";

type Staff = Api.StaffProfile;
type Du = Api.HoSoCuaToiResponse;
const THONG_BAO: Record<string, string> = { "da-gui": "Đã gửi. Người khác sẽ xác minh trước khi thông tin được dùng.", "da-luu": "Đã lưu." };
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
      const noiDung = p.loai === "NGAY_SINH" ? ngayVN(p.ngaySinh) : p.loai === "DIA_CHI" ? (p.diaChi ?? "") : p.giayTo ? `${p.giayTo.loai}${p.giayTo.soChe ? ` ${p.giayTo.soChe}` : ""}` : "";
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
  const form = h("form", { id: "hs-dang-cs" },
    h("p", { class: "muted" }, "Đăng phiên bản mới thì mọi người phải đồng ý lại trước khi gửi thông tin. Chữ chính sách cần chủ dự án và luật sư duyệt trước khi đăng."),
    h("label", null, "Mục đích thu thập", mucDich), h("label", null, "Toàn văn chính sách", noiDung),
    h("button", { class: "btn btn-primary", type: "submit" }, "Đăng phiên bản mới")) as HTMLFormElement;
  // Vòng sửa 2, I-1: đăng là cửa MỘT CHIỀU (bảng chỉ-thêm, hiệu lực ngay) — bấm "Đăng phiên bản mới" chỉ mở bước xác nhận trong trang; lệnh ghi ở nút "Xác nhận đăng".
  const xacNhan = h("div", { class: "hs-xac-nhan", id: "hs-dang-cs-xac-nhan", hidden: true },
    h("p", null, "Đăng là có hiệu lực ngay và không gỡ được: chính sách lưu vĩnh viễn, mọi người phải đồng ý lại và có thể bắt đầu gửi ngày sinh, địa chỉ, số giấy tờ. Chỉ đăng khi chữ đã được luật sư duyệt và đã có cách xoá dữ liệu theo yêu cầu."),
    h("button", { class: "btn btn-danger", type: "button", onclick: async () => {
      try {
        await api<Api.ChinhSachDangResponse>("/api/parties/chinh-sach-rieng-tu", { method: "POST", body: { mucDich: mucDich.value, noiDung: noiDung.value } });
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
