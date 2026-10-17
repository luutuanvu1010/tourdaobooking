// "Hàng chờ xác minh" ở trang Quản lý tài khoản (ADR-0125 đ6; lát H-4 Gói 2): người có ô party.verify (Quản trị, Nhân sự, Toàn quyền) xem phiếu tự khai đang chờ, mở chi tiết,
// chấp nhận NGUYÊN VĂN hoặc từ chối theo danh sách lý do đóng. Chỉ gọi /api/parties/xac-minh* (rào src/xac-minh-giao-dien.test.ts). Không sửa trường khai, không ô chữ tự do.
// Số giấy tờ đủ: chỉ hiện sau thao tác "Hiện số" (máy chủ ghi nhật ký TRƯỚC), nằm trong DOM của khung chi tiết, mất khi đóng khung; không lưu ở đâu, không console, không URL.
// Ẩn/hiện hỏi bảng quyền (can — web/CLAUDE.md); máy chủ luôn kiểm lại. Chỉ dựng DOM bằng h().
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { ngayVN } from "../src/shared/giay-to-hien-thi";
import { LY_DO_TU_CHOI } from "../src/shared/xac-minh-hien-thi";
import { nhanLoaiPhieu } from "../src/shared/tu-khai-hien-thi";
import { vnDateTimeText } from "../src/shared/vn-date";
import { h, replaceChildren } from "./dom";

type Staff = Api.StaffProfile;
const cauLoi = (e: unknown) => (e instanceof ApiError ? e.message : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
const CAU_GIAY_TO_CHUA_ANH = "Phiếu giấy tờ chưa có ảnh để đối chiếu nên chưa chấp nhận được. Bạn vẫn từ chối được, kèm lý do phù hợp.";
const CAU_DA_GOP = "Hồ sơ này đã gộp vào hồ sơ khác nên chỉ từ chối được.";

export function dungHangChoXacMinh(goc: HTMLElement, staff: Staff): void {
  if (!can(staff, "party.verify")) return;
  const duocXemSo = can(staff, "party.verify.attachment");
  let trang: "cho" | "da-xu-ly" = "cho";
  let luot = 0; // mỗi lần mở chi tiết / tải danh sách tăng một nấc: kết quả về muộn của lượt cũ bị bỏ
  const nutCho = h("button", { type: "button", class: "btn xm-tab", id: "xm-tab-cho" }, "Đang chờ") as HTMLButtonElement;
  const nutXong = h("button", { type: "button", class: "btn xm-tab", id: "xm-tab-xong" }, "Đã xử lý") as HTMLButtonElement;
  const baoLoi = h("div", { class: "alert", role: "alert", hidden: true });
  const baoOk = h("div", { class: "alert ok", role: "status", hidden: true });
  const danhSach = h("div", { class: "xm-ds", id: "xm-ds" });
  const chiTiet = h("div", { class: "xm-chi-tiet", id: "xm-chi-tiet", hidden: true });
  const hienLoi = (m: string | null) => { baoLoi.hidden = m === null; baoLoi.textContent = m ?? ""; };
  const hienOk = (m: string | null) => { baoOk.hidden = m === null; baoOk.textContent = m ?? ""; };
  const dongChiTiet = () => { luot++; chiTiet.hidden = true; replaceChildren(chiTiet); };

  const veTab = () => {
    nutCho.setAttribute("aria-pressed", String(trang === "cho"));
    nutXong.setAttribute("aria-pressed", String(trang === "da-xu-ly"));
  };
  nutCho.addEventListener("click", () => { trang = "cho"; hienLoi(null); hienOk(null); void taiDanhSach(); });
  nutXong.addEventListener("click", () => { trang = "da-xu-ly"; hienLoi(null); hienOk(null); dongChiTiet(); void taiDanhSach(); });

  async function taiDanhSach(): Promise<void> {
    veTab();
    const mine = ++luot;
    replaceChildren(danhSach, h("p", { class: "muted" }, "Đang tải…"));
    try {
      if (trang === "cho") {
        const d = await api<{ phieu: Api.PhieuChoXacMinhDto[] }>("/api/parties/xac-minh?trang=cho");
        if (mine !== luot) return;
        replaceChildren(danhSach, ...(d.phieu.length ? d.phieu.map(theCho) : [h("p", { class: "muted" }, "Không có phiếu nào đang chờ xác minh.")]));
      } else {
        const d = await api<{ phieu: Api.PhieuDaXuLyDto[] }>("/api/parties/xac-minh?trang=da-xu-ly");
        if (mine !== luot) return;
        replaceChildren(danhSach, ...(d.phieu.length ? d.phieu.map(theXong) : [h("p", { class: "muted" }, "Chưa có phiếu nào được xử lý.")]));
      }
    } catch (e) {
      if (mine !== luot) return;
      replaceChildren(danhSach);
      hienLoi(cauLoi(e));
    }
  }

  function theCho(p: Api.PhieuChoXacMinhDto): HTMLElement {
    const the = h("button", { type: "button", class: "xm-the xm-the-cho", onclick: () => void moChiTiet(p.id) },
      h("span", { class: "xm-the-dong" },
        h("strong", null, nhanLoaiPhieu(p.loai)), h("span", null, p.tenHoSo),
        p.chuyenToanQuyen ? h("span", { class: "badge badge-draft" }, "Chuyển Toàn quyền") : null),
      h("span", { class: "muted" }, `Gửi lúc ${vnDateTimeText(p.guiLuc)}`),
      !p.xacMinhDuoc && p.lyDoKhong ? h("span", { class: "xm-chan" }, p.lyDoKhong) : null);
    return the;
  }

  function theXong(p: Api.PhieuDaXuLyDto): HTMLElement {
    const ketLuan = p.ketLuan === "DA_CHAP_NHAN" ? "Đã xác minh" : `Bị từ chối${p.lyDo ? ` · ${p.lyDo}` : ""}`;
    return h("div", { class: "xm-the xm-the-xong" },
      h("span", { class: "xm-the-dong" }, h("strong", null, nhanLoaiPhieu(p.loai)), h("span", { class: "muted" }, `Phiếu ${p.id.slice(0, 6)}`)),
      h("span", null, ketLuan),
      h("span", { class: "muted" }, `Người xử lý: ${p.nguoiXuLy} · ${vnDateTimeText(p.luc)}`),
      p.coChamTaiKhoan ? h("span", { class: "xm-chan" }, "Người xác minh từng tạo hoặc chạm tài khoản") : null);
  }

  async function moChiTiet(id: string): Promise<void> {
    hienLoi(null);
    hienOk(null);
    const mine = ++luot;
    try {
      const d = await api<Api.PhieuXacMinhChiTietDto>(`/api/parties/xac-minh/${id}`);
      if (mine !== luot) return;
      veChiTiet(d);
    } catch (e) {
      if (mine !== luot) return;
      dongChiTiet();
      hienLoi(cauLoi(e));
      void taiDanhSach(); // phiếu có thể vừa được người khác xử lý: làm mới danh sách
    }
  }

  function dong(nhan: string, giaTri: string | HTMLElement): HTMLElement {
    return h("div", { class: "hs-dong" }, h("span", { class: "muted" }, nhan), h("span", null, giaTri));
  }

  function veChiTiet(d: Api.PhieuXacMinhChiTietDto): void {
    const g = d.giayTo;
    const soEl = h("span", { class: "xm-so", id: "xm-so" }, g?.soChe ?? "Không có");
    const khoiSo: HTMLElement[] = [];
    if (g && g.soChe && d.xacMinhDuoc && duocXemSo) {
      const nutHien = h("button", { type: "button", class: "btn", id: "xm-hien-so" }, "Hiện số") as HTMLButtonElement;
      const xacNhan = h("div", { class: "xm-xac-nhan", hidden: true },
        h("p", null, "Mỗi lần xem được ghi vào nhật ký. Xem số?"),
        h("button", { type: "button", class: "btn btn-primary", onclick: async () => {
          xacNhan.hidden = true;
          try {
            const r = await api<Api.PhieuXemSoResponse>(`/api/parties/xac-minh/${d.id}/xem-so`, { method: "POST" });
            soEl.textContent = r.so;
            nutHien.textContent = "Ẩn số";
            nutHien.dataset.dangHien = "1";
          } catch (e) {
            hienLoi(cauLoi(e));
          }
        } }, "Xem số"),
        h("button", { type: "button", class: "btn", onclick: () => { xacNhan.hidden = true; } }, "Thôi"));
      nutHien.addEventListener("click", () => {
        if (nutHien.dataset.dangHien === "1") {
          soEl.textContent = g.soChe;
          nutHien.textContent = "Hiện số";
          delete nutHien.dataset.dangHien;
        } else xacNhan.hidden = false;
      });
      khoiSo.push(nutHien, xacNhan);
    }
    const truongKhai: (HTMLElement | null)[] = !d.xacMinhDuoc ? [] : d.loai === "NGAY_SINH"
      ? [dong("Ngày sinh khai", d.ngaySinh ? ngayVN(d.ngaySinh) : "Không có")]
      : d.loai === "DIA_CHI"
        ? [dong("Địa chỉ khai", d.diaChi ?? "Không có")]
        : g
          ? [dong("Loại giấy tờ", g.tenLoai), h("div", { class: "hs-dong" }, h("span", { class: "muted" }, "Số"), soEl, ...khoiSo),
            g.hang ? dong("Hạng", g.hang) : null, g.ngayCap ? dong("Ngày cấp", ngayVN(g.ngayCap)) : null, g.noiCap ? dong("Nơi cấp", g.noiCap) : null,
            g.hetHan ? dong("Hết hạn", ngayVN(g.hetHan)) : null,
            g.coDongHienHanhCungLoai ? h("p", { class: "muted" }, "Hồ sơ đã có giấy tờ cùng loại đang dùng.") : null,
            g.trungHoSoKhac ? h("p", { class: "xm-chan" }, "Số giấy tờ này đã thuộc một hồ sơ khác.") : null]
          : [];
    const chuaAnh = d.loai === "GIAY_TO" && !d.coAnh;
    const khoaChapNhan = d.daGop ? CAU_DA_GOP : chuaAnh ? CAU_GIAY_TO_CHUA_ANH : null;

    const tieuDe = h("h3", { tabindex: -1, id: "xm-chi-tiet-tieu-de" }, `${nhanLoaiPhieu(d.loai)} — ${d.tenHoSo}`);
    const nutDong = h("button", { type: "button", class: "btn btn-link", onclick: dongChiTiet }, "Đóng");
    const phan: (HTMLElement | null)[] = [
      h("div", { class: "xm-chi-tiet-dau" }, tieuDe, nutDong),
      dong("Gửi lúc", vnDateTimeText(d.guiLuc)),
      ...truongKhai,
    ];
    if (!d.xacMinhDuoc) {
      // Người không xác minh được phiếu này: chỉ thấy lý do, không có nút xử lý (máy chủ cũng không trả giá trị khai).
      phan.push(h("p", { class: "xm-chan", id: "xm-khong-duoc" }, d.lyDoKhong ?? "Bạn không xác minh được phiếu này."));
    } else {
      phan.push(...khungXuLy(d, khoaChapNhan));
    }
    replaceChildren(chiTiet, ...phan);
    chiTiet.hidden = false;
    chiTiet.scrollIntoView({ block: "nearest" });
    tieuDe.focus();
  }

  function khungXuLy(d: Api.PhieuXacMinhChiTietDto, khoaChapNhan: string | null): HTMLElement[] {
    const xongLenh = async (lenh: () => Promise<unknown>, thanhCong: string) => {
      hienLoi(null);
      try {
        await lenh();
        dongChiTiet();
        hienOk(thanhCong);
      } catch (e) {
        dongChiTiet();
        hienLoi(cauLoi(e)); // 404 / 409: câu tiếng Việt của máy chủ; phiếu có thể vừa được người khác xử lý
      }
      void taiDanhSach();
    };
    const nutChap = h("button", { type: "button", class: "btn btn-primary", id: "xm-chap-nhan", disabled: khoaChapNhan !== null }, "Chấp nhận") as HTMLButtonElement;
    const xacNhanChap = h("div", { class: "xm-xac-nhan", id: "xm-xac-nhan-chap", hidden: true },
      h("p", null, "Chấp nhận nguyên văn thông tin khai? Người xác minh không sửa được thông tin."),
      h("button", { type: "button", class: "btn btn-primary", onclick: () => void xongLenh(() => api(`/api/parties/xac-minh/${d.id}/chap-nhan`, { method: "POST" }), "Đã chấp nhận.") }, "Chấp nhận"),
      h("button", { type: "button", class: "btn", onclick: () => { xacNhanChap.hidden = true; } }, "Thôi"));
    nutChap.addEventListener("click", () => { khungTuChoi.hidden = true; xacNhanChap.hidden = false; });

    const nutTu = h("button", { type: "button", class: "btn btn-danger", id: "xm-tu-choi" }, "Từ chối") as HTMLButtonElement;
    const gui = h("button", { type: "button", class: "btn btn-danger", id: "xm-gui-tu-choi", disabled: true }, "Gửi từ chối") as HTMLButtonElement;
    const chon = Object.entries(LY_DO_TU_CHOI).map(([ma, nhan]) => {
      const o = h("input", { type: "radio", name: "xm-ly-do", value: ma }) as HTMLInputElement;
      o.addEventListener("change", () => { gui.disabled = false; });
      return h("label", { class: "xm-ly-do" }, o, h("span", null, nhan));
    });
    const khungTuChoi = h("fieldset", { class: "xm-tu-choi", id: "xm-khung-tu-choi", hidden: true },
      h("legend", null, "Chọn lý do từ chối"), ...chon,
      h("div", { class: "xm-hang-nut" }, gui, h("button", { type: "button", class: "btn", onclick: () => { khungTuChoi.hidden = true; } }, "Thôi")));
    nutTu.addEventListener("click", () => { xacNhanChap.hidden = true; khungTuChoi.hidden = false; });
    gui.addEventListener("click", () => {
      const ma = (khungTuChoi.querySelector("input[name=xm-ly-do]:checked") as HTMLInputElement | null)?.value;
      if (!ma) return;
      void xongLenh(() => api(`/api/parties/xac-minh/${d.id}/tu-choi`, { method: "POST", body: { lyDo: ma } }), "Đã từ chối.");
    });
    const ra: HTMLElement[] = [];
    if (khoaChapNhan) ra.push(h("p", { class: "xm-chan", id: "xm-khoa-chap-nhan" }, khoaChapNhan));
    ra.push(h("div", { class: "xm-hang-nut" }, nutChap, nutTu), xacNhanChap, khungTuChoi);
    return ra;
  }

  replaceChildren(goc,
    h("h2", { id: "xm-heading" }, "Hàng chờ xác minh"),
    h("p", { class: "muted" }, "Phiếu tự khai của đối tác và nhân viên. Bạn chỉ chấp nhận nguyên văn hoặc từ chối, không sửa được thông tin."),
    h("div", { class: "xm-tabs" }, nutCho, nutXong),
    baoLoi, baoOk, danhSach, chiTiet);
  goc.hidden = false;
  void taiDanhSach();
}
