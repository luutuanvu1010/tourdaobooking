// "Yêu cầu xoá dữ liệu" và "Ảnh giấy tờ hết lý do giữ" ở Danh bạ (ADR-0126 đ2, đ3, đ6; lát H-5 Gói 2): người có ô party.erasure.process xem hàng chờ, xem trước SỐ ĐẾM
// (không giá trị cá nhân), THỰC HIỆN ẩn danh hoá (hai bước, không hoàn tác) hoặc TỪ CHỐI theo danh sách lý do đóng; xoá ảnh đã hết lý do giữ. Chỉ gọi /api/parties/phieu-xoa*
// và /api/parties/anh-can-xoa* (rào src/xoa-an-danh-giao-dien.test.ts). Hai khối mở lười (chỉ tải khi bấm mở) vì hàng chờ cần nhiều truy vấn phía máy chủ.
// Không ô chữ tự do, không khoá kho, không giá trị cá nhân ở đâu: hồ sơ đã xoá luôn dựa vào cờ máy chủ, không bao giờ in giá trị giữ chỗ. Chỉ dựng DOM bằng h().
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { CAU_CAN_CU_GIU_LAI, LY_DO_TU_CHOI_XOA, PHAN_GIU_LAI, nhanLyDoXoaAnh, nhanTrangThaiPhieuXoa } from "../src/shared/xoa-an-danh-hien-thi";
import { vnDateTimeText } from "../src/shared/vn-date";
import { h, replaceChildren } from "./dom";

type Staff = Api.StaffProfile;
const TOI_DA_ANH = 50;
const cauLoi = (e: unknown) => (e instanceof ApiError ? e.message : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
const TEN_DA_XOA = "Người đã xoá dữ liệu";

export function dungKhoiPhieuXoa(goc: HTMLElement, staff: Staff): void {
  if (!can(staff, "party.erasure.process")) return;
  const baoLoi = h("div", { class: "alert", role: "alert", id: "px-loi", hidden: true });
  const baoOk = h("div", { class: "alert ok", role: "status", id: "px-ok", hidden: true });
  const hienLoi = (m: string | null) => { baoLoi.hidden = m === null; baoLoi.textContent = m ?? ""; };
  const hienOk = (m: string | null) => { baoOk.hidden = m === null; baoOk.textContent = m ?? ""; };
  const hop = (id: string, tieuDe: string, nap: () => void, ...con: (HTMLElement | null)[]): HTMLElement => {
    const d = h("details", { class: "px-hop", id }, h("summary", null, tieuDe), ...con) as HTMLDetailsElement;
    let daNap = false;
    d.addEventListener("toggle", () => { if (d.open && !daNap) { daNap = true; nap(); } });
    return d;
  };

  // ---------------------------------------------------------------- Yêu cầu xoá dữ liệu
  let trang: "cho" | "da-xu-ly" = "cho";
  let luot = 0; // kết quả về muộn của lượt cũ bị bỏ
  const nutCho = h("button", { type: "button", class: "btn xm-tab", id: "px-tab-cho" }, "Đang chờ") as HTMLButtonElement;
  const nutXong = h("button", { type: "button", class: "btn xm-tab", id: "px-tab-xong" }, "Đã xử lý") as HTMLButtonElement;
  const danhSach = h("div", { class: "xm-ds", id: "px-ds" });
  const chiTiet = h("div", { class: "xm-chi-tiet", id: "px-chi-tiet", hidden: true });
  const dongChiTiet = () => { luot++; chiTiet.hidden = true; replaceChildren(chiTiet); };
  const veTab = () => {
    nutCho.setAttribute("aria-pressed", String(trang === "cho"));
    nutXong.setAttribute("aria-pressed", String(trang === "da-xu-ly"));
  };
  nutCho.addEventListener("click", () => { trang = "cho"; hienLoi(null); hienOk(null); dongChiTiet(); void taiDanhSach(); });
  nutXong.addEventListener("click", () => { trang = "da-xu-ly"; hienLoi(null); hienOk(null); dongChiTiet(); void taiDanhSach(); });

  async function chayLai(): Promise<void> {
    hienLoi(null);
    try {
      const r = await api<Api.PhieuXoaChayLaiResponse>("/api/parties/phieu-xoa/chay-lai", { method: "POST" });
      hienOk(r.conLoi > 0 ? `Đã chạy lại: còn ${r.conLoi} việc chưa xong, hãy thử lại sau.` : "Đã chạy lại, không còn việc dở.");
    } catch (e) {
      hienLoi(cauLoi(e));
    }
    void taiDanhSach();
  }

  async function taiDanhSach(): Promise<void> {
    veTab();
    const mine = ++luot;
    replaceChildren(danhSach, h("p", { class: "muted" }, "Đang tải…"));
    try {
      const d = await api<Api.PhieuXoaChoResponse>("/api/parties/phieu-xoa");
      if (mine !== luot) return;
      if (trang === "cho") replaceChildren(danhSach, ...(d.phieu.length ? d.phieu.map(theCho) : [h("p", { class: "muted" }, "Không có yêu cầu xoá nào đang chờ.")]));
      else replaceChildren(danhSach, ...(d.daXuLy.length ? d.daXuLy.map(theXong) : [h("p", { class: "muted" }, "Chưa có yêu cầu xoá nào được xử lý.")]));
    } catch (e) {
      if (mine !== luot) return;
      replaceChildren(danhSach);
      hienLoi(cauLoi(e));
    }
  }

  function nhanHan(p: Api.PhieuXoaChoDto): HTMLElement {
    if (p.trangThaiHan === "qua_han") return h("span", { class: "px-qua-han" }, "Quá hạn");
    if (p.trangThaiHan === "chua_co_han" || !p.han) return h("span", { class: "muted" }, "Chưa có thời hạn");
    return h("span", { class: "muted" }, `Hạn ${vnDateTimeText(p.han)}`);
  }

  function theCho(p: Api.PhieuXoaChoDto): HTMLElement {
    return h("button", { type: "button", class: "xm-the xm-the-cho px-the", onclick: () => void moChiTiet(p.id) },
      h("span", { class: "xm-the-dong" }, h("strong", null, p.tenHoSo), nhanHan(p)),
      h("span", { class: "muted" }, `Gửi lúc ${vnDateTimeText(p.guiLuc)}`),
      !p.xuLyDuoc && p.lyDoKhong ? h("span", { class: "xm-chan" }, p.lyDoKhong) : null);
  }

  function theXong(p: Api.PhieuXoaDaXuLyDto): HTMLElement {
    return h("div", { class: "xm-the xm-the-xong" },
      h("span", { class: "xm-the-dong" }, h("strong", null, nhanTrangThaiPhieuXoa(p.ketQua)), h("span", { class: "muted" }, `Phiếu ${p.id.slice(0, 6)}`)),
      p.lyDo ? h("span", null, `Lý do: ${p.lyDo}`) : null,
      h("span", { class: "muted" }, `${p.nguoiXuLy ? `Người xử lý: ${p.nguoiXuLy} · ` : ""}${vnDateTimeText(p.luc)}`),
      p.chuaChepNgoai
        ? h("span", { class: "xm-hang-nut" }, h("span", { class: "xm-chan" }, "Chưa chép bản lưu ngoài"), h("button", { type: "button", class: "btn", onclick: () => void chayLai() }, "Chạy lại"))
        : null);
  }

  async function moChiTiet(id: string): Promise<void> {
    hienLoi(null);
    hienOk(null);
    const mine = ++luot;
    try {
      const d = await api<Api.PhieuXoaXemTruocDto>(`/api/parties/phieu-xoa/${id}`);
      if (mine !== luot) return;
      veChiTiet(d);
    } catch (e) {
      if (mine !== luot) return;
      dongChiTiet();
      hienLoi(cauLoi(e));
      void taiDanhSach(); // phiếu có thể vừa được người khác xử lý
    }
  }

  function dong(nhan: string, giaTri: string): HTMLElement {
    return h("div", { class: "hs-dong" }, h("span", { class: "muted" }, nhan), h("span", null, giaTri));
  }

  function veChiTiet(d: Api.PhieuXoaXemTruocDto): void {
    const s = d.seXoa;
    const tieuDe = h("h3", { tabindex: -1, id: "px-chi-tiet-tieu-de" }, `Yêu cầu xoá của ${d.tenHoSo}`);
    const phan: (HTMLElement | null)[] = [
      h("div", { class: "xm-chi-tiet-dau" }, tieuDe, h("button", { type: "button", class: "btn btn-link", onclick: dongChiTiet }, "Đóng")),
      dong("Gửi lúc", vnDateTimeText(d.guiLuc)),
      dong("Hạn xử lý", d.trangThaiHan === "chua_co_han" || !d.han ? "Chưa có thời hạn" : vnDateTimeText(d.han)),
      h("h4", null, "Sẽ xoá"),
      dong("Giấy tờ", String(s.giayTo)),
      dong("Phiếu tự khai", String(s.phieuTuKhai)),
      dong("Liên hệ", String(s.lienHe)),
      dong("Ngày sinh", s.ngaySinh ? "Có, sẽ xoá" : "Không có"),
      dong("Ảnh giấy tờ", String(s.tep)),
      dong("IP và thông tin máy đăng nhập", s.phienDangNhap ? "Có, sẽ xoá" : "Không có tài khoản"),
      dong("Tên", d.giuTen ? "Giữ" : `Thay bằng “${TEN_DA_XOA}”`),
      d.hoSoGopVao > 0 ? dong("Hồ sơ phụ đã gộp vào", `${d.hoSoGopVao}, cũng bị xoá`) : null,
      h("h4", null, "Phần phải giữ lại"),
      h("ul", { class: "px-giu" }, ...PHAN_GIU_LAI.filter((x) => d.phanGiuLai.includes(x.ma)).map((x) => h("li", null, x.nhan))),
      h("p", { class: "muted" }, CAU_CAN_CU_GIU_LAI),
    ];
    if (!d.xuLyDuoc) phan.push(h("p", { class: "xm-chan", id: "px-khong-duoc" }, d.lyDoKhong ?? "Bạn không xử lý được yêu cầu này."));
    else phan.push(...khungXuLy(d));
    replaceChildren(chiTiet, ...phan);
    chiTiet.hidden = false;
    chiTiet.scrollIntoView({ block: "nearest" });
    tieuDe.focus();
  }

  function khungXuLy(d: Api.PhieuXoaXemTruocDto): HTMLElement[] {
    const xongLenh = async (lenh: () => Promise<string>) => {
      hienLoi(null);
      try {
        hienOk(await lenh());
      } catch (e) {
        hienLoi(cauLoi(e)); // 404 / 409: câu tiếng Việt của máy chủ; phiếu có thể vừa được người khác xử lý
      }
      dongChiTiet();
      void taiDanhSach();
    };
    const nutThucHien = h("button", { type: "button", class: "btn btn-danger", id: "px-thuc-hien" }, "Thực hiện") as HTMLButtonElement;
    const nutTu = h("button", { type: "button", class: "btn", id: "px-tu-choi" }, "Từ chối") as HTMLButtonElement;
    const xacNhanTh = h("div", { class: "xm-xac-nhan", id: "px-xac-nhan-thuc-hien", hidden: true },
      h("p", null, "Thực hiện xoá? Việc này không hoàn tác được."),
      h("button", { type: "button", class: "btn btn-danger", id: "px-xac-nhan-thuc-hien-nut", onclick: () => void xongLenh(async () => {
        const r = await api<Api.PhieuXoaThucHienResponse>(`/api/parties/phieu-xoa/${d.id}/thuc-hien`, { method: "POST", body: { xacNhan: true } });
        const them = [r.conChoXoaKho > 0 ? `Còn ${r.conChoXoaKho} ảnh chờ xoá khỏi kho.` : null, r.chuaChepNgoai ? "Chưa chép bản lưu ngoài." : null].filter(Boolean);
        return `Đã thực hiện xoá.${them.length ? ` ${them.join(" ")} Bấm “Chạy lại” ở tab Đã xử lý.` : ""}`;
      }) }, "Thực hiện xoá"),
      h("button", { type: "button", class: "btn", onclick: () => { xacNhanTh.hidden = true; } }, "Thôi"));
    const gui = h("button", { type: "button", class: "btn btn-danger", id: "px-gui-tu-choi", disabled: true }, "Gửi từ chối") as HTMLButtonElement;
    const chon = LY_DO_TU_CHOI_XOA.map((x) => {
      const o = h("input", { type: "radio", name: "px-ly-do", value: x.ma }) as HTMLInputElement;
      o.addEventListener("change", () => { gui.disabled = false; });
      return h("label", { class: "xm-ly-do" }, o, h("span", null, x.nhan));
    });
    const khungTuChoi = h("fieldset", { class: "xm-tu-choi", id: "px-khung-tu-choi", hidden: true },
      h("legend", null, "Chọn lý do từ chối"), ...chon,
      h("div", { class: "xm-hang-nut" }, gui, h("button", { type: "button", class: "btn", onclick: () => { khungTuChoi.hidden = true; } }, "Thôi")));
    nutThucHien.addEventListener("click", () => { khungTuChoi.hidden = true; xacNhanTh.hidden = false; });
    nutTu.addEventListener("click", () => { xacNhanTh.hidden = true; khungTuChoi.hidden = false; });
    gui.addEventListener("click", () => {
      const ma = (khungTuChoi.querySelector("input[name=px-ly-do]:checked") as HTMLInputElement | null)?.value;
      if (!ma) return;
      void xongLenh(async () => {
        await api<Api.PhieuXoaTuChoiResponse>(`/api/parties/phieu-xoa/${d.id}/tu-choi`, { method: "POST", body: { lyDo: ma } });
        return "Đã từ chối yêu cầu xoá.";
      });
    });
    return [h("div", { class: "xm-hang-nut" }, nutThucHien, nutTu), xacNhanTh, khungTuChoi];
  }

  // ---------------------------------------------------------------- Ảnh giấy tờ hết lý do giữ
  const dsAnh = h("div", { class: "px-anh-ds", id: "px-anh-ds" });
  const demChon = h("span", { class: "muted", id: "px-anh-dem", "aria-live": "polite" });
  const nutXoaAnh = h("button", { type: "button", class: "btn btn-danger", id: "px-anh-xoa", disabled: true }, "Xoá ảnh đã chọn") as HTMLButtonElement;
  const xacNhanAnh = h("div", { class: "xm-xac-nhan", id: "px-anh-xac-nhan", hidden: true });
  let chonAnh = new Set<string>();
  let luotAnh = 0;
  const capNhatChon = () => {
    demChon.textContent = `Đã chọn ${chonAnh.size}/${TOI_DA_ANH}`;
    nutXoaAnh.disabled = chonAnh.size === 0;
    for (const o of dsAnh.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) o.disabled = !o.checked && chonAnh.size >= TOI_DA_ANH;
    if (chonAnh.size === 0) xacNhanAnh.hidden = true;
  };
  nutXoaAnh.addEventListener("click", () => {
    const n = chonAnh.size;
    if (n === 0) return;
    replaceChildren(xacNhanAnh,
      h("p", null, `Xoá ${n} ảnh? Việc này không hoàn tác được.`),
      h("button", { type: "button", class: "btn btn-danger", id: "px-anh-xac-nhan-nut", onclick: async () => {
        hienLoi(null);
        try {
          const r = await api<Api.AnhCanXoaXoaResponse>("/api/parties/anh-can-xoa/xoa", { method: "POST", body: { ids: [...chonAnh] } });
          hienOk(`Đã xoá ${r.daQuyet} ảnh.${r.boQua > 0 ? ` Bỏ qua ${r.boQua} ảnh không còn đủ điều kiện xoá.` : ""}${r.conChoXoaKho > 0 ? ` Còn ${r.conChoXoaKho} ảnh chờ xoá khỏi kho, bấm “Chạy lại” ở mục Yêu cầu xoá dữ liệu.` : ""}`);
        } catch (e) {
          hienLoi(cauLoi(e));
        }
        chonAnh = new Set();
        xacNhanAnh.hidden = true;
        void taiAnh();
      } }, "Xoá ảnh"),
      h("button", { type: "button", class: "btn", onclick: () => { xacNhanAnh.hidden = true; } }, "Thôi"));
    xacNhanAnh.hidden = false;
  });

  async function taiAnh(): Promise<void> {
    const mine = ++luotAnh;
    replaceChildren(dsAnh, h("p", { class: "muted" }, "Đang tải…"));
    try {
      const d = await api<Api.AnhCanXoaResponse>("/api/parties/anh-can-xoa");
      if (mine !== luotAnh) return;
      chonAnh = new Set();
      replaceChildren(dsAnh, ...(d.anh.length ? d.anh.map(hangAnh) : [h("p", { class: "muted" }, "Không có ảnh nào đã hết lý do giữ.")]));
      capNhatChon();
    } catch (e) {
      if (mine !== luotAnh) return;
      replaceChildren(dsAnh);
      hienLoi(cauLoi(e));
    }
  }

  function hangAnh(a: Api.AnhCanXoaDto): HTMLElement {
    const o = h("input", { type: "checkbox", class: "o-tick", "aria-label": `Chọn ảnh giấy tờ của ${a.tenHoSo}` }) as HTMLInputElement;
    o.addEventListener("change", () => {
      if (o.checked) chonAnh.add(a.id);
      else chonAnh.delete(a.id);
      capNhatChon();
    });
    return h("label", { class: "px-anh-hang" }, o,
      h("span", { class: "px-anh-chu" },
        h("strong", null, a.tenHoSo),
        h("span", null, a.loaiGiayTo ?? "Không gắn với giấy tờ nào"),
        h("span", { class: "muted" }, nhanLyDoXoaAnh(a.lyDo)),
        h("span", { class: "muted" }, `Tải lên ${vnDateTimeText(a.taiLuc)}`)));
  }

  replaceChildren(goc,
    h("h2", { id: "px-heading" }, "Xoá dữ liệu cá nhân"),
    h("p", { class: "muted" }, "Xử lý yêu cầu xoá của người dùng và dọn ảnh giấy tờ đã hết lý do giữ. Việc xoá không hoàn tác được."),
    baoLoi, baoOk,
    hop("px-hop-phieu", "Yêu cầu xoá dữ liệu", () => void taiDanhSach(), h("div", { class: "xm-tabs" }, nutCho, nutXong), danhSach, chiTiet),
    hop("px-hop-anh", "Ảnh giấy tờ hết lý do giữ", () => void taiAnh(),
      h("p", { class: "muted" }, `Chọn tối đa ${TOI_DA_ANH} ảnh mỗi lần. Ảnh vừa có lại lý do giữ sẽ được bỏ qua.`), dsAnh, demChon, h("div", { class: "xm-hang-nut" }, nutXoaAnh), xacNhanAnh));
  goc.hidden = false;
}
