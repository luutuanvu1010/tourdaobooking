// Hàng chờ PHIẾU ĐĂNG KÝ ĐỐI TÁC ở trang riêng «Phiếu đăng ký đối tác» (ADR-0206 Đ9; ADR-0207 Đ1–Đ4, Đ7, Đ9; ADR-0209 Đ3, Đ4; ADR-0219 Đ1–Đ3; đợt 1 Task 12).
// Ẩn/hiện hỏi bảng quyền (`can`, web/CLAUDE.md); máy chủ luôn kiểm lại từng route:
//   - xem hàng chờ: `registration.queue.view` (Quản lý bán hàng, Quản trị, Nhân sự, Toàn quyền);
//   - bước xác minh (kết luận từng mục, Danh bạ, ba lệnh kết thúc): `registration.verify` VÀ `party.view` (Quản lý bán hàng, Toàn quyền); hiện số, mở ảnh thêm `registration.verify.attachment`;
//   - bước duyệt, từ chối duyệt, trả về xác minh, gửi lại lời mời: `registration.approve` (Quản trị, Nhân sự, Toàn quyền); «cấp sẽ áp» kèm tên cấp: `partner.commission.view` (Nhân sự không thấy tên cấp).
// Mọi lệnh gửi `phienBan` = bản khai người dùng đang xem; 409 `registration_version_changed` ⇒ báo câu của máy chủ và mở lại phiếu. Số giấy tờ đủ chỉ nằm trong DOM của khung chi tiết
// (mất khi đóng), không lưu ở đâu. Không ô chữ tự do: lý do chọn trong danh sách đóng. Chỉ dựng DOM bằng h().
// Khung gốc (ADR-0222; đợt D1, chỉ trang Phiếu đăng ký đối tác dùng tệp này): hàng chờ là danh sách dòng (dòng đang mở mang aria-current), khung chi tiết là
// mục con ngay dưới danh sách trong cùng khối; cặp nhãn–giá trị bằng `cap()`, ô chọn vai bằng `truong()`, nút bằng `.nut[data-cap]`.
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { CHU_HANG_CHO_DK, NHAN_LOAI_THU, cauBuocKhac } from "../src/shared/dang-ky-giao-dien";
import { nhanOTep } from "../src/shared/dang-ky-o-tep";
import { LY_DO_PHIEU, nhanTrangThaiPhieu, type MaLyDoPhieu } from "../src/shared/dang-ky-hien-thi";
import { CAU_LOAI_DA_TAT, canhBaoDoiVai, cauNguoiXacMinh, maDuyetGui, trangThaiChonVai, tuDuyetBiChan } from "../src/shared/dang-ky-chon-vai";
import { CAU_DOI_VAI_CAP, type KetQuaCapDto } from "../src/shared/cap-se-ap-hien-thi";
import { vnDateTimeText } from "../src/shared/vn-date";
import { ngayVN } from "../src/shared/giay-to-hien-thi";
import { h, replaceChildren } from "./dom";
import { cap, truong } from "./khung";

type Staff = Api.StaffProfile;
type ThuBao = { loai: string; trangThai: "CHO" | "GUI" | "LOI" };
type DongHangCho = { id: string; trangThai: string; loai: string; tenLoai: string; phienBan: number; guiLuc: string | null; thu?: ThuBao | null };
type Muc = { ma: string; nhan: string; ketLuan: "DAT" | "KHONG_DAT" | null; lyDo: { ma: string; nhan: string } | null };
/** ADR-0213 Đ7.5 (Task 17): dòng «Mã vào tổ chức» máy chủ dựng sẵn (`loiMoiVaoToChuc`) — đang giữ / đã huỷ / không còn giữ; tên tổ chức chỉ khi người xem có ô party.view. */
type LoiMoiPhieu = { trangThai: "DANG_GIU" | "DA_HUY" | "KHONG_CON_GIU"; khopSoDienThoai: boolean; tenToChuc?: string; dong: string };
const chuMaVao = (lm: LoiMoiPhieu): string => (lm.tenToChuc ? `${lm.tenToChuc}. ${lm.dong}` : lm.dong);
type PhieuXacMinh = {
  id: string; loai: string; tenLoai: string; trangThai: string; phienBan: number; guiLuc?: string | null; daXuLy?: boolean; loiMoiVaoToChuc?: LoiMoiPhieu | null;
  noiDung?: { hoTen: string; ngaySinh: string | null; diaChi: string | null; soDienThoai: string | null; nguoiGioiThieuKhai: string | null;
    giayTo: { loai: string; soChe: string | null; ngayCap: string | null; noiCap: string | null; hetHan: string | null } | null };
  muc?: Muc[]; tep?: { id: string; o: string }[]; goiY?: { id: string; tenHoSo: string; vai: string[]; lyDo: string[] }[];
  ketLuanDanhBa?: { kieu: string; partyId: string | null } | null;
  // Phần tổ chức (ADR-0212 Đ5): số chỉ ở dạng che; mã vai và loại giấy phép đã đổi sang tên ở máy chủ.
  toChuc?: {
    tenLoaiToChuc: string | null; tenToChuc: string; tenPhapLy: string | null; maSoThueChe: string | null; diaChi: string | null; emailHoaDon: string | null; soDienThoai: string | null;
    gpkd: { soChe: string | null; ngayCap: string | null; noiCap: string | null };
    giayPhepThem: { tenLoai: string; soChe: string | null; ngayCap: string | null; noiCap: string | null; hetHan: string | null } | null;
  } | null;
  mucToChuc?: Muc[]; goiYToChuc?: { id: string; tenHoSo: string; lyDo: string[] }[];
  ketLuanDanhBaToChuc?: { kieu: string; partyId: string | null } | null;
};
type PhieuDuyet = {
  id: string; loai: string; tenLoai: string; loaiToChuc?: string | null; tenLoaiToChuc?: string | null; vaiChon?: { ma: string; ten: string; laLoaiDoiTac: boolean }[]; vaiChonToChuc?: { ma: string; ten: string; laLoaiDoiTac: boolean }[]; trangThai: string; phienBan: number; daXuLy?: boolean; guiLuc?: string | null; hoTen?: string; soDienThoai?: string | null; muc?: Muc[];
  ketLuanDanhBa?: { kieu: string; tenHoSo?: string } | null; coNguoiGioiThieu?: boolean; nguoiXacMinhLaBan?: boolean;
  mucToChuc?: Muc[]; ketLuanDanhBaToChuc?: { kieu: string; tenHoSo?: string; ghiChu?: string } | null; loiMoiVaoToChuc?: LoiMoiPhieu | null;
};

/** Tên vai ở hàng chờ; phiếu «chỉ tổ chức» (vai cá nhân rỗng) ghi «Chỉ làm cho tổ chức». */
const tenLoaiHang = (p: { tenLoai: string }): string => p.tenLoai || CHU_HANG_CHO_DK.chiToChuc;
/** Giá trị riêng của ô vai cá nhân khi phiếu chỉ làm cho tổ chức: người duyệt chọn rõ «không vai riêng» (gửi `roleCode: null`). */
const KHONG_VAI_RIENG = "__KHONG_VAI_RIENG__";
const cauLoi = (e: unknown) => (e instanceof ApiError ? e.message : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
// Tên vai và danh sách vai chọn lúc duyệt do máy chủ trả (`tenLoai`, `vaiChon` — từ pty_role_type, ADR-0212 Đ1 mục 5, Đ3); không tra bảng vai tĩnh trong mã.
const LY_DO_KHOP: Record<string, string> = { PHONE: "trùng số điện thoại", NAME: "trùng tên", DOCUMENT: "trùng số giấy tờ", MST: "trùng mã số thuế", GPKD: "trùng số giấy chứng nhận đăng ký kinh doanh", TEN: "trùng tên" };

export function dungHangChoDangKy(goc: HTMLElement, staff: Staff): void {
  if (!can(staff, "registration.queue.view")) return;
  const xacMinhDuoc = can(staff, "registration.verify") && can(staff, "party.view");
  const xemTep = xacMinhDuoc && can(staff, "registration.verify.attachment");
  const duyetDuoc = can(staff, "registration.approve");
  const xemCap = can(staff, "partner.commission.view");
  let luot = 0;
  const baoLoi = h("div", { class: "alert", role: "alert", hidden: true });
  const baoOk = h("div", { class: "alert ok", role: "status", hidden: true });
  const danhSach = h("div", { class: "ds-dong", id: "dk-hc-ds" });
  const chiTiet = h("div", { class: "muc-con", id: "dk-hc-chi-tiet", hidden: true });
  /** Phiếu đang mở ở khung chi tiết: dòng của nó mang aria-current (nền xanh nhạt, đợt C). */
  let dangMo: string | null = null;
  const danDau = (id: string | null) => {
    dangMo = id;
    for (const b of danhSach.querySelectorAll<HTMLElement>("[data-phieu]")) b.setAttribute("aria-current", String(b.dataset.phieu === id));
  };
  const hienLoi = (m: string | null) => { baoLoi.hidden = m === null; baoLoi.textContent = m ?? ""; };
  const hienOk = (m: string | null) => { baoOk.hidden = m === null; baoOk.textContent = m ?? ""; };
  const dongChiTiet = () => { luot++; chiTiet.hidden = true; replaceChildren(chiTiet); danDau(null); };

  async function taiDanhSach(): Promise<void> {
    const mine = ++luot;
    replaceChildren(danhSach, h("p", { class: "muted" }, "Đang tải…"));
    try {
      const d = await api<{ phieu: DongHangCho[]; conNua?: boolean }>("/api/dang-ky/hang-cho");
      if (mine !== luot) return;
      replaceChildren(danhSach, ...(d.phieu.length ? d.phieu.map((x) => the({ ...x, tenLoai: tenLoaiHang(x) })) : [h("p", { class: "muted" }, CHU_HANG_CHO_DK.rong)]),
        d.conNua ? h("p", { class: "muted", id: "dk-hc-con-nua" }, CHU_HANG_CHO_DK.conNua) : null);
    } catch (e) {
      if (mine !== luot) return;
      replaceChildren(danhSach);
      hienLoi(cauLoi(e));
    }
  }

  /** Thư báo chưa gửi xong (ADR-0206 Đ13): «đang chờ gửi» / «chưa gửi được»; đã gửi ⇒ không hiện. */
  const chuThu = (t: ThuBao | null | undefined): string | null =>
    !t || t.trangThai === "GUI" ? null : `${t.trangThai === "LOI" ? CHU_HANG_CHO_DK.thuLoi : CHU_HANG_CHO_DK.thuCho}: ${NHAN_LOAI_THU[t.loai] ?? ""}`;

  const huyHieuThu = (t: ThuBao | null | undefined): HTMLElement | null => {
    const cau = chuThu(t);
    return cau ? h("span", { class: "huy-hieu", "data-tong": t?.trangThai === "LOI" ? "do" : "cat", "data-thu": t?.trangThai ?? "" }, cau) : null;
  };

  function the(p: DongHangCho): HTMLElement {
    // Phiếu ĐÃ DUYỆT còn trong hàng chờ = người đăng ký chưa tự đặt PIN (ADR-0207 Đ7: «Chưa kích hoạt»).
    const nhan = p.trangThai === "DA_DUYET" ? CHU_HANG_CHO_DK.chuaKichHoat : nhanTrangThaiPhieu(p.trangThai);
    return h("button", { type: "button", class: "dong", "data-phieu": p.id, "aria-current": String(p.id === dangMo), onclick: () => void moChiTiet(p) },
      h("span", { class: "dong-chu" },
        h("span", { class: "hang" }, h("strong", null, p.id), h("span", { class: "huy-hieu", "data-tong": p.trangThai === "DA_DUYET" ? "cat" : "bien" }, nhan)),
        h("span", null, p.tenLoai),
        p.guiLuc ? h("span", { class: "o-phu" }, `Gửi lúc ${vnDateTimeText(p.guiLuc)}`) : null,
        huyHieuThu(p.thu)));
  }

  const dong = (nhan: string, giaTri: string | Node) => cap(nhan, giaTri);
  const dauKhung = (tieuDe: string) => {
    const t = h("h3", { tabindex: -1 }, tieuDe);
    return { t, el: h("div", { class: "xm-chi-tiet-dau" }, t, h("button", { type: "button", class: "nut", "data-cap": "loi", onclick: dongChiTiet }, "Đóng")) };
  };
  function moKhung(...noi: (Node | null)[]): void {
    replaceChildren(chiTiet, ...noi);
    chiTiet.hidden = false;
    chiTiet.scrollIntoView({ block: "nearest" });
    (chiTiet.querySelector("h3") as HTMLElement | null)?.focus();
  }

  /** Lệnh ghi: thành công ⇒ đóng khung, báo, làm mới; 409 phiếu đã đổi ⇒ báo câu của máy chủ, MỞ LẠI phiếu (bản mới); lỗi khác ⇒ báo, làm mới. */
  async function lenhDk(p: DongHangCho, viec: () => Promise<string>): Promise<void> {
    hienLoi(null);
    hienOk(null);
    try {
      const cau = await viec();
      dongChiTiet();
      hienOk(cau);
    } catch (e) {
      hienLoi(cauLoi(e));
      if (e instanceof ApiError && e.code === "registration_version_changed") { await moChiTiet(p, true); void taiDanhSach(); return; }
      dongChiTiet();
    }
    void taiDanhSach();
  }

  async function moChiTiet(p: DongHangCho, giuLoi = false): Promise<void> {
    if (!giuLoi) { hienLoi(null); hienOk(null); }
    const mine = ++luot;
    danDau(p.id);
    try {
      if (p.trangThai === "CHO_XAC_MINH" && xacMinhDuoc) {
        const d = await api<PhieuXacMinh>(`/api/dang-ky/phieu/${p.id}`);
        if (mine === luot) veXacMinh(p, d);
      } else if (p.trangThai === "CHO_DUYET" && duyetDuoc) {
        const d = await api<PhieuDuyet>(`/api/dang-ky/phieu/${p.id}/xem-duyet`);
        if (mine === luot) veDuyet(p, d);
      } else if (p.trangThai === "DA_DUYET" && duyetDuoc) {
        veLoiMoi(p);
      } else if (chuThu(p.thu)) {
        veThu(p);
      } else {
        const k = dauKhung(`Phiếu ${p.id}`);
        moKhung(k.el, dong("Trạng thái", nhanTrangThaiPhieu(p.trangThai)), h("p", { class: "muted" }, cauBuocKhac(p.trangThai)));
      }
    } catch (e) {
      if (mine !== luot) return;
      dongChiTiet();
      hienLoi(cauLoi(e));
      void taiDanhSach();
    }
  }

  function chonLyDo(ten: string): { el: HTMLElement; gia: () => MaLyDoPhieu | null } {
    const sel = h("select", { class: "o", "aria-label": "Lý do", name: ten },
      h("option", { value: "" }, "Chọn lý do"), ...Object.entries(LY_DO_PHIEU).map(([ma, v]) => h("option", { value: ma }, v.nhan))) as HTMLSelectElement;
    return { el: sel, gia: () => (sel.value ? (sel.value as MaLyDoPhieu) : null) };
  }

  function khoiCap(k: KetQuaCapDto | null, nhan: string): HTMLElement | null {
    if (!k) return null;
    return h("p", { class: "dk-hc-cap", "data-cap-se-ap": k.ap ? "ap" : (k.lyDo ?? "") }, h("span", { class: "muted" }, `${nhan}: `),
      k.ap ? (k.cap ? k.cap.ten : "Có cấp mặc định") : `Không ghi cấp riêng — ${k.cau ?? ""}`);
  }

  /** Phần tổ chức của bản khai (ADR-0212 Đ5): số chỉ ở dạng che (MST, GPKD, giấy phép); nơi cấp có mặt để đối chiếu với ảnh. */
  function khoiToChuc(t: NonNullable<PhieuXacMinh["toChuc"]>): HTMLElement {
    const g = t.giayPhepThem;
    return h("div", { class: "dk-hc-to-chuc", id: "dk-hc-to-chuc" }, h("h4", null, CHU_HANG_CHO_DK.thongTinToChuc),
      t.tenLoaiToChuc ? dong("Vai trò của tổ chức", t.tenLoaiToChuc) : null,
      dong("Tên tổ chức", t.tenToChuc), t.tenPhapLy ? dong("Tên pháp lý", t.tenPhapLy) : null, dong("Mã số thuế", t.maSoThueChe ?? "Không có"),
      dong("Địa chỉ tổ chức", t.diaChi ?? "Không có"), dong("Email nhận hoá đơn", t.emailHoaDon ?? "Không có"), dong("Số điện thoại tổ chức", t.soDienThoai ?? "Không có"),
      dong("Số giấy chứng nhận đăng ký kinh doanh", t.gpkd.soChe ?? "Không có"), t.gpkd.ngayCap ? dong("Ngày cấp", ngayVN(t.gpkd.ngayCap)) : null, t.gpkd.noiCap ? dong("Nơi cấp", t.gpkd.noiCap) : null,
      g ? dong("Giấy phép thêm", g.tenLoai) : null, g ? dong("Số giấy phép", g.soChe ?? "Không có") : null, g?.ngayCap ? dong("Ngày cấp giấy phép", ngayVN(g.ngayCap)) : null,
      g?.noiCap ? dong("Nơi cấp giấy phép", g.noiCap) : null, g?.hetHan ? dong("Hết hạn giấy phép", ngayVN(g.hetHan)) : null);
  }

  // ---- Bước xác minh (ADR-0207 Đ2) ----
  function veXacMinh(p: DongHangCho, d: PhieuXacMinh): void {
    const k = dauKhung(`Xác minh phiếu ${d.id}`);
    if (d.daXuLy || !d.noiDung) { moKhung(k.el, dong("Trạng thái", nhanTrangThaiPhieu(d.trangThai)), h("p", { class: "muted" }, "Phiếu đã được xử lý — không xem lại được.")); return; }
    const n = d.noiDung;
    const g = n.giayTo;
    const soEl = h("span", { id: "dk-hc-so" }, g?.soChe ?? "Không có");
    const hienSo = g?.soChe && xemTep ? h("button", { type: "button", class: "nut", "data-cap": "phu", id: "dk-hc-hien-so" }, "Xem đủ số") as HTMLButtonElement : null;
    hienSo?.addEventListener("click", async () => {
      try { soEl.textContent = (await api<{ so: string }>(`/api/dang-ky/phieu/${d.id}/xem-so`, { method: "POST" })).so; hienSo.hidden = true; } catch (e) { hienLoi(cauLoi(e)); }
    });
    const anh = xemTep ? (d.tep ?? []).map((t) => h("a", { href: `/api/dang-ky/phieu/${d.id}/tep/${t.id}`, target: "_blank", rel: "noopener", class: "nut", "data-cap": "loi", "data-tep": t.o }, nhanOTep(t.o))) : [];
    // Kết luận từng mục: «Đạt» hoặc «Không đạt» + lý do; mỗi lần bấm ghi một dòng (chỉ thêm), máy chủ trả lại HAI nhóm mục (cá nhân, tổ chức) — vẽ lại cả hai.
    const khoiMuc = h("div", { class: "dk-hc-muc-ds" });
    const khoiMucTc = h("div", { class: "dk-hc-muc-ds", id: "dk-hc-muc-to-chuc" });
    const veMuc = (ds: Muc[], dsTc: Muc[]) => {
      const dongMuc = (m: Muc) => {
        const ly = chonLyDo(`ly-do-${m.ma}`);
        const dat = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-muc-dat": m.ma }, "Đạt") as HTMLButtonElement;
        const khong = h("button", { type: "button", class: "nut", "data-cap": "loi", "data-muc-khong": m.ma }, "Không đạt") as HTMLButtonElement;
        const ghi = async (laDat: boolean) => {
          if (!laDat && !ly.gia()) { hienLoi("Chọn lý do trước khi bấm «Không đạt»."); return; }
          hienLoi(null);
          try {
            const r = await api<{ muc: Muc[]; mucToChuc: Muc[] }>(`/api/dang-ky/phieu/${d.id}/ket-luan`, { method: "POST", body: { phienBan: d.phienBan, muc: m.ma, dat: laDat, ...(laDat ? {} : { lyDo: ly.gia() }) } });
            veMuc(r.muc, r.mucToChuc);
          } catch (e) {
            hienLoi(cauLoi(e));
            if (e instanceof ApiError && e.code === "registration_version_changed") void moChiTiet(p, true);
          }
        };
        dat.addEventListener("click", () => void ghi(true));
        khong.addEventListener("click", () => void ghi(false));
        const kq = m.ketLuan === "DAT" ? h("span", { class: "huy-hieu", "data-tong": "la" }, "Đạt") : m.ketLuan === "KHONG_DAT" ? h("span", { class: "huy-hieu", "data-tong": "do" }, `Không đạt · ${m.lyDo?.nhan ?? ""}`) : h("span", { class: "muted" }, "Chưa kết luận");
        return h("div", { class: "dk-hc-muc", "data-muc": m.ma }, h("span", { class: "xm-the-dong" }, h("strong", null, m.nhan), kq), h("div", { class: "dk-hang-nut" }, dat, ly.el, khong));
      };
      replaceChildren(khoiMuc, ...ds.map(dongMuc));
      replaceChildren(khoiMucTc, ...dsTc.map(dongMuc));
      khoiMucTc.hidden = dsTc.length === 0;
    };
    veMuc(d.muc ?? [], d.mucToChuc ?? []);
    // Kết luận Danh bạ: «Hồ sơ mới» hoặc gắn đúng MỘT hồ sơ gợi ý (máy chủ kiểm lại điều kiện hồ sơ đích).
    let hoSo: { kieu: "MOI" } | { kieu: "CO_SAN"; partyId: string } | null = d.ketLuanDanhBa
      ? (d.ketLuanDanhBa.kieu === "EXISTING" && d.ketLuanDanhBa.partyId ? { kieu: "CO_SAN", partyId: d.ketLuanDanhBa.partyId } : { kieu: "MOI" }) : null;
    const capEl = h("div", { id: "dk-hc-cap-se-ap" });
    const taiCap = async () => {
      if (!xemCap) return;
      try {
        const q = `/api/pricing/cap-mac-dinh/se-ap?loai=${encodeURIComponent(d.loai)}${hoSo?.kieu === "CO_SAN" ? `&hoSo=${encodeURIComponent(hoSo.partyId)}` : ""}`;
        replaceChildren(capEl, khoiCap(await api<KetQuaCapDto>(q), CHU_HANG_CHO_DK.capSeAp));
      } catch { replaceChildren(capEl); }
    };
    const radio = (gia: string, nhan: string, chon: boolean) => {
      const r = h("input", { type: "radio", name: "dk-ho-so", value: gia, checked: chon }) as HTMLInputElement;
      r.addEventListener("change", () => { hoSo = gia === "MOI" ? { kieu: "MOI" } : { kieu: "CO_SAN", partyId: gia }; void taiCap(); });
      return h("label", null, r, h("span", null, nhan));
    };
    const danhBa = h("fieldset", { class: "nhom-chon", id: "dk-hc-danh-ba" }, h("legend", null, "Đối chiếu Danh bạ"),
      radio("MOI", CHU_HANG_CHO_DK.hoSoMoi, hoSo?.kieu === "MOI"),
      ...(d.goiY ?? []).map((gy) => radio(gy.id, `${CHU_HANG_CHO_DK.ganHoSo}: ${gy.tenHoSo} (${gy.lyDo.map((l) => LY_DO_KHOP[l] ?? l).join(", ")})`, hoSo?.kieu === "CO_SAN" && hoSo.partyId === gy.id)),
      (d.goiY ?? []).length === 0 ? h("p", { class: "muted" }, "Không có hồ sơ nào có thể trùng.") : null);
    void taiCap();
    // Kết luận Danh bạ của TỔ CHỨC (ADR-0212 Đ5): chỉ khi phiếu có phần tổ chức; gắn tổ chức có sẵn không làm người đăng ký thành người quản lý.
    let hoSoToChuc: { kieu: "MOI" } | { kieu: "CO_SAN"; partyId: string } | null = d.ketLuanDanhBaToChuc
      ? (d.ketLuanDanhBaToChuc.kieu === "EXISTING" && d.ketLuanDanhBaToChuc.partyId ? { kieu: "CO_SAN", partyId: d.ketLuanDanhBaToChuc.partyId } : { kieu: "MOI" }) : null;
    const radioTc = (gia: string, nhan: string, chon: boolean) => {
      const r = h("input", { type: "radio", name: "dk-ho-so-to-chuc", value: gia, checked: chon }) as HTMLInputElement;
      r.addEventListener("change", () => { hoSoToChuc = gia === "MOI" ? { kieu: "MOI" } : { kieu: "CO_SAN", partyId: gia }; });
      return h("label", null, r, h("span", null, nhan));
    };
    const danhBaTc = d.toChuc ? h("fieldset", { class: "nhom-chon", id: "dk-hc-danh-ba-to-chuc" }, h("legend", null, CHU_HANG_CHO_DK.doiChieuToChuc),
      radioTc("MOI", CHU_HANG_CHO_DK.hoSoToChucMoi, hoSoToChuc?.kieu === "MOI"),
      ...(d.goiYToChuc ?? []).map((gy) => radioTc(gy.id, `${CHU_HANG_CHO_DK.ganToChuc}: ${gy.tenHoSo} (${gy.lyDo.map((l) => LY_DO_KHOP[l] ?? l).join(", ")})`, hoSoToChuc?.kieu === "CO_SAN" && hoSoToChuc.partyId === gy.id)),
      (d.goiYToChuc ?? []).length === 0 ? h("p", { class: "muted" }, "Không có hồ sơ tổ chức nào có thể trùng.") : null) : null;

    const ketThuc = h("div", { class: "dk-hang-nut" });
    const lyBoSung = chonLyDo("ly-do-bo-sung");
    const lyTuChoi = chonLyDo("ly-do-tu-choi");
    const nutDat = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "dk-hc-xac-minh-dat" }, "Xác minh đạt") as HTMLButtonElement;
    nutDat.addEventListener("click", () => void lenhDk(p, async () => {
      await api(`/api/dang-ky/phieu/${d.id}/dat`, { method: "POST", body: { phienBan: d.phienBan, ...(hoSo ? { hoSo } : {}), ...(d.toChuc && hoSoToChuc ? { hoSoToChuc } : {}) } });
      return "Đã xác minh đạt. Phiếu chuyển sang chờ duyệt.";
    }));
    const nutBoSung = h("button", { type: "button", class: "nut", "data-cap": "phu", id: "dk-hc-bo-sung" }, "Yêu cầu bổ sung") as HTMLButtonElement;
    nutBoSung.addEventListener("click", () => {
      const ma = lyBoSung.gia();
      if (!ma) { hienLoi("Chọn lý do trước khi yêu cầu bổ sung."); return; }
      void lenhDk(p, async () => { await api(`/api/dang-ky/phieu/${d.id}/bo-sung`, { method: "POST", body: { lyDo: ma, phienBan: d.phienBan } }); return "Đã trả phiếu về người đăng ký để bổ sung."; });
    });
    const nutTuChoi = h("button", { type: "button", class: "nut", "data-cap": "nguy-hiem", id: "dk-hc-tu-choi" }, "Từ chối") as HTMLButtonElement;
    nutTuChoi.addEventListener("click", () => {
      const ma = lyTuChoi.gia();
      if (!ma) { hienLoi("Chọn lý do trước khi từ chối."); return; }
      void lenhDk(p, async () => { await api(`/api/dang-ky/phieu/${d.id}/tu-choi`, { method: "POST", body: { lyDo: ma, phienBan: d.phienBan } }); return "Đã từ chối phiếu."; });
    });
    replaceChildren(ketThuc, nutDat);
    moKhung(k.el,
      dong("Vai trò xin", d.tenLoai || CHU_HANG_CHO_DK.chiToChuc), d.loiMoiVaoToChuc ? dong("Mã vào tổ chức", chuMaVao(d.loiMoiVaoToChuc)) : null, d.guiLuc ? dong("Gửi lúc", vnDateTimeText(d.guiLuc)) : null,
      dong("Họ tên", n.hoTen), dong("Ngày sinh", n.ngaySinh ? ngayVN(n.ngaySinh) : "Không có"), dong("Địa chỉ", n.diaChi ?? "Không có"), dong("Số điện thoại", n.soDienThoai ?? "Không có"),
      n.nguoiGioiThieuKhai ? dong("Người giới thiệu (khai)", n.nguoiGioiThieuKhai) : null,
      g ? cap("Số căn cước", [soEl, hienSo]) : null,
      g?.ngayCap ? dong("Ngày cấp", ngayVN(g.ngayCap)) : null, g?.noiCap ? dong("Nơi cấp", g.noiCap) : null, g?.hetHan ? dong("Hết hạn", ngayVN(g.hetHan)) : null,
      anh.length ? h("div", { class: "dk-hang-nut", id: "dk-hc-anh" }, ...anh) : null,
      d.toChuc ? khoiToChuc(d.toChuc) : null,
      h("h4", null, "Kết luận từng mục"), khoiMuc, d.toChuc ? h("h4", null, CHU_HANG_CHO_DK.mucToChuc) : null, khoiMucTc, danhBa, danhBaTc, capEl, ketThuc,
      h("div", { class: "dk-hang-nut" }, lyBoSung.el, nutBoSung), h("div", { class: "dk-hang-nut" }, lyTuChoi.el, nutTuChoi));
  }

  // ---- Bước duyệt (ADR-0207 Đ4; ADR-0209 Đ4) ----
  function veDuyet(p: DongHangCho, d: PhieuDuyet): void {
    const k = dauKhung(`Duyệt phiếu ${d.id}`);
    if (d.daXuLy) { moKhung(k.el, dong("Trạng thái", nhanTrangThaiPhieu(d.trangThai)), h("p", { class: "muted" }, "Phiếu đã được xử lý.")); return; }
    // Phiếu «chỉ tổ chức» (Task 13/14): vai cá nhân rỗng, có phần tổ chức — duyệt được với vai cá nhân để trống; nếu tổ chức là hồ sơ CÓ SẴN, máy chủ trả câu 409 (văn phòng giao người quản lý sau).
    // ADR-0213 Đ7.5 (Task 17): phiếu có mã vào tổ chức hợp lệ (đang giữ, cùng số) thay mục «vai» — cũng duyệt được với «không vai riêng» (máy chủ mở «Thành viên của»).
    const coMaVao = d.loai === "" && d.loiMoiVaoToChuc?.trangThai === "DANG_GIU" && d.loiMoiVaoToChuc.khopSoDienThoai;
    const chiToChuc = d.loai === "" && (!!d.loaiToChuc || coMaVao);
    const { conDung, giaTriDau } = trangThaiChonVai(d.loai, d.vaiChon ?? []);
    // Loại của phiếu đã tắt ⇒ mục trống, khoá, chọn sẵn; người duyệt phải chọn rõ một loại khác (không nhảy sang mục đầu).
    const vai = h("select", { class: "o", id: "dk-hc-vai", "aria-label": "Vai trò đối tác" },
      ...(chiToChuc ? [h("option", { value: KHONG_VAI_RIENG, selected: true }, CHU_HANG_CHO_DK.khongVaiRieng)] : conDung ? [] : [h("option", { value: "", disabled: true, selected: true }, "Chọn vai người dùng")]),
      ...(d.vaiChon ?? []).map((r) => h("option", { value: r.ma, selected: r.ma === d.loai }, r.ten))) as HTMLSelectElement;
    vai.value = chiToChuc ? KHONG_VAI_RIENG : giaTriDau;
    const baoLoaiTat = h("p", { class: "dk-hc-cap", id: "dk-hc-loai-tat", hidden: conDung || chiToChuc }, CAU_LOAI_DA_TAT);
    const baoDoiVai = h("p", { class: "dk-hc-cap", id: "dk-hc-doi-vai", hidden: !canhBaoDoiVai(vai.value, d.loai) }, CAU_DOI_VAI_CAP);
    if (chiToChuc) baoDoiVai.hidden = true; // phiếu «chỉ tổ chức» không có «loại của phiếu» để so
    // Vai của tổ chức (Task 13): danh sách do máy chủ trả (`vaiChonToChuc`), chọn sẵn vai trong phiếu; gửi kèm `roleCodeToChuc`.
    const vaiTc = d.loaiToChuc ? h("select", { class: "o", id: "dk-hc-vai-to-chuc", "aria-label": "Vai trò của tổ chức" },
      ...(d.vaiChonToChuc ?? []).map((r) => h("option", { value: r.ma, selected: r.ma === d.loaiToChuc }, r.ten))) as HTMLSelectElement : null;
    if (vaiTc) vaiTc.value = d.loaiToChuc ?? "";
    const dongKetLuan = (m: Muc) => dong(m.nhan, m.ketLuan === "DAT" ? "Đạt" : m.ketLuan === "KHONG_DAT" ? "Không đạt" : "Chưa kết luận");
    const muc = (d.muc ?? []).map(dongKetLuan);
    const kl = d.ketLuanDanhBaToChuc;
    const lyTuChoi = chonLyDo("ly-do-tu-choi-duyet");
    const nutDuyet = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "dk-hc-duyet" }, "Duyệt mở tài khoản") as HTMLButtonElement;
    const laToanQuyen = can(staff, "admin.manage.superadmin");
    const tuDuyet = tuDuyetBiChan(!!d.nguoiXacMinhLaBan, laToanQuyen); // người xác minh không duyệt được phiếu của mình, trừ Toàn quyền (máy chủ chặn y vậy)
    nutDuyet.disabled = tuDuyet || maDuyetGui(vai.value) === null;
    vai.addEventListener("change", () => { baoDoiVai.hidden = chiToChuc && vai.value === KHONG_VAI_RIENG ? true : !canhBaoDoiVai(vai.value, d.loai); nutDuyet.disabled = tuDuyet || maDuyetGui(vai.value) === null; });
    nutDuyet.addEventListener("click", () => void lenhDk(p, async () => {
      const chon = maDuyetGui(vai.value);
      if (chon === null) throw new ApiError(400, "invalid_input", CAU_LOAI_DA_TAT);
      const ma = chon === KHONG_VAI_RIENG ? null : chon; // «không vai riêng» là lựa chọn rõ của người duyệt (phiếu chỉ tổ chức), không phải mã thay thế
      const r = await api<{ trangThai: string; cap: KetQuaCapDto }>(`/api/dang-ky/phieu/${d.id}/duyet`, { method: "POST", body: { roleCode: ma, ...(vaiTc ? { roleCodeToChuc: vaiTc.value } : {}), phienBan: d.phienBan } });
      const cap = r.cap.ap ? (r.cap.cap ? ` ${CHU_HANG_CHO_DK.capDaAp}: ${r.cap.cap.ten}.` : "") : r.cap.cau ? ` ${r.cap.cau}` : "";
      return `Đã duyệt. Tài khoản chưa kích hoạt cho tới khi người đăng ký tự đặt mã PIN.${cap}`;
    }));
    // «Trả về xác minh» (ADR-0207 Đ5): phiếu quay lại bước xác minh, người xác minh kết luận lại Danh bạ.
    const nutTraVe = h("button", { type: "button", class: "nut", "data-cap": "phu", id: "dk-hc-tra-ve" }, CHU_HANG_CHO_DK.traVeXacMinh) as HTMLButtonElement;
    nutTraVe.addEventListener("click", () => void lenhDk(p, async () => {
      await api(`/api/dang-ky/phieu/${d.id}/tra-ve-xac-minh`, { method: "POST", body: { phienBan: d.phienBan } });
      return "Đã trả phiếu về bước xác minh. Người xác minh sẽ kết luận lại.";
    }));
    const nutTuChoi = h("button", { type: "button", class: "nut", "data-cap": "nguy-hiem", id: "dk-hc-tu-choi-duyet" }, "Từ chối") as HTMLButtonElement;
    nutTuChoi.addEventListener("click", () => {
      const ma = lyTuChoi.gia();
      if (!ma) { hienLoi("Chọn lý do trước khi từ chối."); return; }
      void lenhDk(p, async () => { await api(`/api/dang-ky/phieu/${d.id}/tu-choi-duyet`, { method: "POST", body: { lyDo: ma, phienBan: d.phienBan } }); return "Đã từ chối phiếu."; });
    });
    moKhung(k.el,
      dong("Họ tên", d.hoTen ?? ""), dong("Số điện thoại", d.soDienThoai ?? "Không có"), dong("Vai trò xin", d.tenLoai || CHU_HANG_CHO_DK.chiToChuc), d.loiMoiVaoToChuc ? dong("Mã vào tổ chức", chuMaVao(d.loiMoiVaoToChuc)) : null, ...muc,
      dong("Kết luận Danh bạ", d.ketLuanDanhBa ? (d.ketLuanDanhBa.kieu === "EXISTING" ? `Gắn hồ sơ có sẵn${d.ketLuanDanhBa.tenHoSo ? `: ${d.ketLuanDanhBa.tenHoSo}` : ""}` : CHU_HANG_CHO_DK.hoSoMoi) : "Chưa có"),
      ...(d.mucToChuc ?? []).map(dongKetLuan),
      kl ? dong(CHU_HANG_CHO_DK.ketLuanToChuc, kl.kieu === "EXISTING" ? `Gắn tổ chức có sẵn${kl.tenHoSo ? `: ${kl.tenHoSo}` : ""}` : CHU_HANG_CHO_DK.hoSoToChucMoi) : null,
      kl?.ghiChu ? h("p", { class: "dk-hc-cap", id: "dk-hc-ghi-chu-to-chuc" }, kl.ghiChu) : null,
      d.nguoiXacMinhLaBan ? h("p", { class: "xm-chan", id: "dk-hc-nguoi-xac-minh" }, cauNguoiXacMinh(laToanQuyen)) : null,
      truong("Vai trò đối tác", vai), baoLoaiTat, baoDoiVai,
      vaiTc ? truong("Vai trò của tổ chức", vaiTc) : null,
      h("div", { class: "dk-hang-nut" }, nutDuyet, nutTraVe), h("div", { class: "dk-hang-nut" }, lyTuChoi.el, nutTuChoi));
  }

  // ---- Thư báo chưa gửi được (ADR-0206 Đ13): phiếu cần bổ sung / đã từ chối — «Gửi lại thư» ----
  function veThu(p: DongHangCho): void {
    const k = dauKhung(`Phiếu ${p.id}`);
    const nut = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "dk-hc-gui-lai-thu" }, CHU_HANG_CHO_DK.guiLaiThu) as HTMLButtonElement;
    nut.addEventListener("click", () => void lenhDk(p, async () => {
      await api(`/api/dang-ky/phieu/${p.id}/gui-lai-thu`, { method: "POST" });
      return "Đã xếp thư để gửi lại. Tải lại sau ít phút để xem đã gửi được chưa.";
    }));
    moKhung(k.el, dong("Trạng thái", nhanTrangThaiPhieu(p.trangThai)), dong("Thư báo người đăng ký", chuThu(p.thu) ?? ""), nut);
  }

  // ---- Đã duyệt, chưa kích hoạt: «Gửi lại lời mời» (ADR-0207 Đ7 — mở lại hạn đặt PIN) ----
  function veLoiMoi(p: DongHangCho): void {
    const k = dauKhung(`Phiếu ${p.id}`);
    const nutGui = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "dk-hc-gui-lai-loi-moi" }, "Gửi lại lời mời") as HTMLButtonElement;
    nutGui.addEventListener("click", () => void lenhDk(p, async () => {
      const r = await api<{ hanKichHoat: string }>(`/api/dang-ky/phieu/${p.id}/gui-lai-loi-moi`, { method: "POST" });
      return `Đã mở lại hạn đặt mã PIN tới ${vnDateTimeText(r.hanKichHoat)} và xếp thư báo để gửi lại.`;
    }));
    moKhung(k.el, dong("Trạng thái", CHU_HANG_CHO_DK.chuaKichHoat), chuThu(p.thu) ? dong("Thư báo người đăng ký", chuThu(p.thu)!) : null,
      h("p", { class: "muted" }, "Người đăng ký chưa tự đặt mã PIN. Nút dưới mở lại hạn đặt mã PIN và gửi lại thư báo đã duyệt."), nutGui);
  }

  replaceChildren(goc,
    h("header", { class: "khoi-dau" }, h("h2", { id: "dk-hc-heading" }, CHU_HANG_CHO_DK.tieuDe)),
    h("p", { class: "khoi-mo-ta" }, "Phiếu người ngoài tự gửi để làm đối tác. Quản lý bán hàng xác minh; Quản trị hoặc Nhân sự duyệt mở tài khoản."),
    baoLoi, baoOk, danhSach, chiTiet);
  goc.hidden = false;
  void taiDanhSach();
}
