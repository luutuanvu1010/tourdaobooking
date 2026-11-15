// Hàng chờ PHIẾU ĐĂNG KÝ ĐỐI TÁC ở trang Quản lý tài khoản (ADR-0206 Đ9; ADR-0207 Đ1–Đ4, Đ7, Đ9; ADR-0209 Đ3, Đ4; đợt 1 Task 12), cạnh hàng chờ xác minh phiếu tự khai.
// Ẩn/hiện hỏi bảng quyền (`can`, web/CLAUDE.md); máy chủ luôn kiểm lại từng route:
//   - xem hàng chờ: `registration.queue.view` (Quản trị, Nhân sự, Toàn quyền);
//   - bước xác minh (kết luận từng mục, Danh bạ, ba lệnh kết thúc): `party.verify` VÀ `party.view`; hiện số, mở ảnh thêm `party.verify.attachment`;
//   - bước duyệt, từ chối duyệt, gửi lại lời mời: `account.create` (Nhân sự, Toàn quyền); «cấp sẽ áp» kèm tên cấp: `partner.commission.view` (Nhân sự không thấy tên cấp).
// Mọi lệnh gửi `phienBan` = bản khai người dùng đang xem; 409 `registration_version_changed` ⇒ báo câu của máy chủ và mở lại phiếu. Số giấy tờ đủ chỉ nằm trong DOM của khung chi tiết
// (mất khi đóng), không lưu ở đâu. Không ô chữ tự do: lý do chọn trong danh sách đóng. Chỉ dựng DOM bằng h().
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { ROLES, ROLE_CODES, isRoleCode } from "../src/shared/roles";
import { NHAN_O_TEP, CHU_HANG_CHO_DK } from "../src/shared/dang-ky-giao-dien";
import { LY_DO_PHIEU, nhanTrangThaiPhieu, type MaLyDoPhieu } from "../src/shared/dang-ky-hien-thi";
import { CAU_DOI_VAI_CAP, type KetQuaCapDto } from "../src/shared/cap-se-ap-hien-thi";
import { vnDateTimeText } from "../src/shared/vn-date";
import { ngayVN } from "../src/shared/giay-to-hien-thi";
import { h, replaceChildren } from "./dom";

type Staff = Api.StaffProfile;
type DongHangCho = { id: string; trangThai: string; loai: string; phienBan: number; guiLuc: string | null };
type Muc = { ma: string; nhan: string; ketLuan: "DAT" | "KHONG_DAT" | null; lyDo: { ma: string; nhan: string } | null };
type PhieuXacMinh = {
  id: string; loai: string; trangThai: string; phienBan: number; guiLuc?: string | null; daXuLy?: boolean;
  noiDung?: { hoTen: string; ngaySinh: string | null; diaChi: string | null; soDienThoai: string | null; nguoiGioiThieuKhai: string | null;
    giayTo: { loai: string; soChe: string | null; ngayCap: string | null; noiCap: string | null; hetHan: string | null } | null };
  muc?: Muc[]; tep?: { id: string; o: string }[]; goiY?: { id: string; tenHoSo: string; vai: string[]; lyDo: string[] }[];
  ketLuanDanhBa?: { kieu: string; partyId: string | null } | null;
};
type PhieuDuyet = {
  id: string; loai: string; trangThai: string; phienBan: number; daXuLy?: boolean; guiLuc?: string | null; hoTen?: string; soDienThoai?: string | null; muc?: Muc[];
  ketLuanDanhBa?: { kieu: string; tenHoSo?: string } | null; coNguoiGioiThieu?: boolean; nguoiXacMinhLaBan?: boolean;
};

const cauLoi = (e: unknown) => (e instanceof ApiError ? e.message : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
const tenVai = (ma: string) => (isRoleCode(ma) ? ROLES[ma].name : ma);
const VAI_DOI_TAC = ROLE_CODES.filter((r) => ROLES[r].group === "EXTERNAL" && ROLES[r].defaults.includes("PARTNER"));
const LY_DO_KHOP: Record<string, string> = { PHONE: "trùng số điện thoại", NAME: "trùng tên", DOCUMENT: "trùng số giấy tờ" };

export function dungHangChoDangKy(goc: HTMLElement, staff: Staff): void {
  if (!can(staff, "registration.queue.view")) return;
  const xacMinhDuoc = can(staff, "party.verify") && can(staff, "party.view");
  const xemTep = xacMinhDuoc && can(staff, "party.verify.attachment");
  const duyetDuoc = can(staff, "account.create");
  const xemCap = can(staff, "partner.commission.view");
  let luot = 0;
  const baoLoi = h("div", { class: "alert", role: "alert", hidden: true });
  const baoOk = h("div", { class: "alert ok", role: "status", hidden: true });
  const danhSach = h("div", { class: "xm-ds", id: "dk-hc-ds" });
  const chiTiet = h("div", { class: "xm-chi-tiet", id: "dk-hc-chi-tiet", hidden: true });
  const hienLoi = (m: string | null) => { baoLoi.hidden = m === null; baoLoi.textContent = m ?? ""; };
  const hienOk = (m: string | null) => { baoOk.hidden = m === null; baoOk.textContent = m ?? ""; };
  const dongChiTiet = () => { luot++; chiTiet.hidden = true; replaceChildren(chiTiet); };

  async function taiDanhSach(): Promise<void> {
    const mine = ++luot;
    replaceChildren(danhSach, h("p", { class: "muted" }, "Đang tải…"));
    try {
      const d = await api<{ phieu: DongHangCho[] }>("/api/dang-ky/hang-cho");
      if (mine !== luot) return;
      replaceChildren(danhSach, ...(d.phieu.length ? d.phieu.map(the) : [h("p", { class: "muted" }, CHU_HANG_CHO_DK.rong)]));
    } catch (e) {
      if (mine !== luot) return;
      replaceChildren(danhSach);
      hienLoi(cauLoi(e));
    }
  }

  function the(p: DongHangCho): HTMLElement {
    // Phiếu ĐÃ DUYỆT còn trong hàng chờ = người đăng ký chưa tự đặt PIN (ADR-0207 Đ7: «Chưa kích hoạt»).
    const nhan = p.trangThai === "DA_DUYET" ? CHU_HANG_CHO_DK.chuaKichHoat : nhanTrangThaiPhieu(p.trangThai);
    return h("button", { type: "button", class: "xm-the xm-the-cho", "data-phieu": p.id, onclick: () => void moChiTiet(p) },
      h("span", { class: "xm-the-dong" }, h("strong", null, p.id), h("span", { class: "huy-hieu", "data-tong": p.trangThai === "DA_DUYET" ? "cat" : "bien" }, nhan)),
      h("span", null, tenVai(p.loai)),
      p.guiLuc ? h("span", { class: "muted" }, `Gửi lúc ${vnDateTimeText(p.guiLuc)}`) : null);
  }

  const dong = (nhan: string, giaTri: string | Node) => h("div", { class: "hs-dong" }, h("span", { class: "muted" }, nhan), h("span", null, giaTri));
  const dauKhung = (tieuDe: string) => {
    const t = h("h3", { tabindex: -1 }, tieuDe);
    return { t, el: h("div", { class: "xm-chi-tiet-dau" }, t, h("button", { type: "button", class: "btn btn-link", onclick: dongChiTiet }, "Đóng")) };
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
    try {
      if (p.trangThai === "CHO_XAC_MINH" && xacMinhDuoc) {
        const d = await api<PhieuXacMinh>(`/api/dang-ky/phieu/${p.id}`);
        if (mine === luot) veXacMinh(p, d);
      } else if (p.trangThai === "CHO_DUYET" && duyetDuoc) {
        const d = await api<PhieuDuyet>(`/api/dang-ky/phieu/${p.id}/xem-duyet`);
        if (mine === luot) veDuyet(p, d);
      } else if (p.trangThai === "DA_DUYET" && duyetDuoc) {
        veLoiMoi(p);
      } else {
        const k = dauKhung(`Phiếu ${p.id}`);
        moKhung(k.el, dong("Trạng thái", nhanTrangThaiPhieu(p.trangThai)), h("p", { class: "muted" }, "Bước này không thuộc việc của bạn."));
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

  // ---- Bước xác minh (ADR-0207 Đ2) ----
  function veXacMinh(p: DongHangCho, d: PhieuXacMinh): void {
    const k = dauKhung(`Xác minh phiếu ${d.id}`);
    if (d.daXuLy || !d.noiDung) { moKhung(k.el, dong("Trạng thái", nhanTrangThaiPhieu(d.trangThai)), h("p", { class: "muted" }, "Phiếu đã được xử lý — không xem lại được.")); return; }
    const n = d.noiDung;
    const g = n.giayTo;
    const soEl = h("span", { id: "dk-hc-so" }, g?.soChe ?? "Không có");
    const hienSo = g?.soChe && xemTep ? h("button", { type: "button", class: "btn", id: "dk-hc-hien-so" }, "Xem đủ số") as HTMLButtonElement : null;
    hienSo?.addEventListener("click", async () => {
      try { soEl.textContent = (await api<{ so: string }>(`/api/dang-ky/phieu/${d.id}/xem-so`, { method: "POST" })).so; hienSo.hidden = true; } catch (e) { hienLoi(cauLoi(e)); }
    });
    const anh = xemTep ? (d.tep ?? []).map((t) => h("a", { href: `/api/dang-ky/phieu/${d.id}/tep/${t.id}`, target: "_blank", rel: "noopener", class: "btn btn-link", "data-tep": t.o }, NHAN_O_TEP[t.o] ?? t.o)) : [];
    // Kết luận từng mục: «Đạt» hoặc «Không đạt» + lý do; mỗi lần bấm ghi một dòng (chỉ thêm), máy chủ trả lại danh sách mục.
    const khoiMuc = h("div", { class: "dk-hc-muc-ds" });
    const veMuc = (ds: Muc[]) => replaceChildren(khoiMuc, ...ds.map((m) => {
      const ly = chonLyDo(`ly-do-${m.ma}`);
      const dat = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-muc-dat": m.ma }, "Đạt") as HTMLButtonElement;
      const khong = h("button", { type: "button", class: "nut", "data-cap": "loi", "data-muc-khong": m.ma }, "Không đạt") as HTMLButtonElement;
      const ghi = async (laDat: boolean) => {
        if (!laDat && !ly.gia()) { hienLoi("Chọn lý do trước khi bấm «Không đạt»."); return; }
        hienLoi(null);
        try {
          const r = await api<{ muc: Muc[] }>(`/api/dang-ky/phieu/${d.id}/ket-luan`, { method: "POST", body: { phienBan: d.phienBan, muc: m.ma, dat: laDat, ...(laDat ? {} : { lyDo: ly.gia() }) } });
          veMuc(r.muc);
        } catch (e) {
          hienLoi(cauLoi(e));
          if (e instanceof ApiError && e.code === "registration_version_changed") void moChiTiet(p, true);
        }
      };
      dat.addEventListener("click", () => void ghi(true));
      khong.addEventListener("click", () => void ghi(false));
      const kq = m.ketLuan === "DAT" ? h("span", { class: "huy-hieu", "data-tong": "la" }, "Đạt") : m.ketLuan === "KHONG_DAT" ? h("span", { class: "huy-hieu", "data-tong": "do" }, `Không đạt · ${m.lyDo?.nhan ?? ""}`) : h("span", { class: "muted" }, "Chưa kết luận");
      return h("div", { class: "dk-hc-muc", "data-muc": m.ma }, h("span", { class: "xm-the-dong" }, h("strong", null, m.nhan), kq), h("div", { class: "dk-hang-nut" }, dat, ly.el, khong));
    }));
    veMuc(d.muc ?? []);
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
      return h("label", { class: "xm-ly-do" }, r, h("span", null, nhan));
    };
    const danhBa = h("fieldset", { class: "xm-tu-choi", id: "dk-hc-danh-ba" }, h("legend", null, "Đối chiếu Danh bạ"),
      radio("MOI", CHU_HANG_CHO_DK.hoSoMoi, hoSo?.kieu === "MOI"),
      ...(d.goiY ?? []).map((gy) => radio(gy.id, `${CHU_HANG_CHO_DK.ganHoSo}: ${gy.tenHoSo} (${gy.lyDo.map((l) => LY_DO_KHOP[l] ?? l).join(", ")})`, hoSo?.kieu === "CO_SAN" && hoSo.partyId === gy.id)),
      (d.goiY ?? []).length === 0 ? h("p", { class: "muted" }, "Không có hồ sơ nào có thể trùng.") : null);
    void taiCap();

    const ketThuc = h("div", { class: "dk-hang-nut" });
    const lyBoSung = chonLyDo("ly-do-bo-sung");
    const lyTuChoi = chonLyDo("ly-do-tu-choi");
    const nutDat = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "dk-hc-xac-minh-dat" }, "Xác minh đạt") as HTMLButtonElement;
    nutDat.addEventListener("click", () => void lenhDk(p, async () => {
      await api(`/api/dang-ky/phieu/${d.id}/dat`, { method: "POST", body: { phienBan: d.phienBan, ...(hoSo ? { hoSo } : {}) } });
      return "Đã xác minh đạt. Phiếu chuyển sang chờ duyệt.";
    }));
    const nutBoSung = h("button", { type: "button", class: "nut", "data-cap": "phu", id: "dk-hc-bo-sung" }, "Yêu cầu bổ sung") as HTMLButtonElement;
    nutBoSung.addEventListener("click", () => {
      const ma = lyBoSung.gia();
      if (!ma) { hienLoi("Chọn lý do trước khi yêu cầu bổ sung."); return; }
      void lenhDk(p, async () => { await api(`/api/dang-ky/phieu/${d.id}/bo-sung`, { method: "POST", body: { lyDo: ma, phienBan: d.phienBan } }); return "Đã trả phiếu về người đăng ký để bổ sung."; });
    });
    const nutTuChoi = h("button", { type: "button", class: "nut", "data-tong": "nguy-hiem", id: "dk-hc-tu-choi" }, "Từ chối") as HTMLButtonElement;
    nutTuChoi.addEventListener("click", () => {
      const ma = lyTuChoi.gia();
      if (!ma) { hienLoi("Chọn lý do trước khi từ chối."); return; }
      void lenhDk(p, async () => { await api(`/api/dang-ky/phieu/${d.id}/tu-choi`, { method: "POST", body: { lyDo: ma, phienBan: d.phienBan } }); return "Đã từ chối phiếu."; });
    });
    replaceChildren(ketThuc, nutDat);
    moKhung(k.el,
      dong("Vai trò xin", tenVai(d.loai)), d.guiLuc ? dong("Gửi lúc", vnDateTimeText(d.guiLuc)) : null,
      dong("Họ tên", n.hoTen), dong("Ngày sinh", n.ngaySinh ? ngayVN(n.ngaySinh) : "Không có"), dong("Địa chỉ", n.diaChi ?? "Không có"), dong("Số điện thoại", n.soDienThoai ?? "Không có"),
      n.nguoiGioiThieuKhai ? dong("Người giới thiệu (khai)", n.nguoiGioiThieuKhai) : null,
      g ? h("div", { class: "hs-dong" }, h("span", { class: "muted" }, "Số căn cước"), soEl, hienSo) : null,
      g?.ngayCap ? dong("Ngày cấp", ngayVN(g.ngayCap)) : null, g?.noiCap ? dong("Nơi cấp", g.noiCap) : null, g?.hetHan ? dong("Hết hạn", ngayVN(g.hetHan)) : null,
      anh.length ? h("div", { class: "dk-hang-nut", id: "dk-hc-anh" }, ...anh) : null,
      h("h4", null, "Kết luận từng mục"), khoiMuc, danhBa, capEl, ketThuc,
      h("div", { class: "dk-hang-nut" }, lyBoSung.el, nutBoSung), h("div", { class: "dk-hang-nut" }, lyTuChoi.el, nutTuChoi));
  }

  // ---- Bước duyệt (ADR-0207 Đ4; ADR-0209 Đ4) ----
  function veDuyet(p: DongHangCho, d: PhieuDuyet): void {
    const k = dauKhung(`Duyệt phiếu ${d.id}`);
    if (d.daXuLy) { moKhung(k.el, dong("Trạng thái", nhanTrangThaiPhieu(d.trangThai)), h("p", { class: "muted" }, "Phiếu đã được xử lý.")); return; }
    const vai = h("select", { class: "o", id: "dk-hc-vai", "aria-label": "Vai trò đối tác" },
      ...VAI_DOI_TAC.map((r) => h("option", { value: r, selected: r === d.loai }, ROLES[r].name))) as HTMLSelectElement;
    const baoDoiVai = h("p", { class: "dk-hc-cap", id: "dk-hc-doi-vai", hidden: true }, CAU_DOI_VAI_CAP);
    vai.addEventListener("change", () => { baoDoiVai.hidden = vai.value === d.loai; });
    const muc = (d.muc ?? []).map((m) => dong(m.nhan, m.ketLuan === "DAT" ? "Đạt" : m.ketLuan === "KHONG_DAT" ? "Không đạt" : "Chưa kết luận"));
    const lyTuChoi = chonLyDo("ly-do-tu-choi-duyet");
    const nutDuyet = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "dk-hc-duyet" }, "Duyệt mở tài khoản") as HTMLButtonElement;
    nutDuyet.addEventListener("click", () => void lenhDk(p, async () => {
      const r = await api<{ trangThai: string; cap: KetQuaCapDto }>(`/api/dang-ky/phieu/${d.id}/duyet`, { method: "POST", body: { roleCode: vai.value, phienBan: d.phienBan } });
      const cap = r.cap.ap ? (r.cap.cap ? ` ${CHU_HANG_CHO_DK.capDaAp}: ${r.cap.cap.ten}.` : "") : r.cap.cau ? ` ${r.cap.cau}` : "";
      return `Đã duyệt. Tài khoản chưa kích hoạt cho tới khi người đăng ký tự đặt mã PIN.${cap}`;
    }));
    const nutTuChoi = h("button", { type: "button", class: "nut", "data-tong": "nguy-hiem", id: "dk-hc-tu-choi-duyet" }, "Từ chối") as HTMLButtonElement;
    nutTuChoi.addEventListener("click", () => {
      const ma = lyTuChoi.gia();
      if (!ma) { hienLoi("Chọn lý do trước khi từ chối."); return; }
      void lenhDk(p, async () => { await api(`/api/dang-ky/phieu/${d.id}/tu-choi-duyet`, { method: "POST", body: { lyDo: ma, phienBan: d.phienBan } }); return "Đã từ chối phiếu."; });
    });
    moKhung(k.el,
      dong("Họ tên", d.hoTen ?? ""), dong("Số điện thoại", d.soDienThoai ?? "Không có"), dong("Vai trò xin", tenVai(d.loai)), ...muc,
      dong("Kết luận Danh bạ", d.ketLuanDanhBa ? (d.ketLuanDanhBa.kieu === "EXISTING" ? `Gắn hồ sơ có sẵn${d.ketLuanDanhBa.tenHoSo ? `: ${d.ketLuanDanhBa.tenHoSo}` : ""}` : CHU_HANG_CHO_DK.hoSoMoi) : "Chưa có"),
      d.nguoiXacMinhLaBan ? h("p", { class: "xm-chan" }, "Bạn là người đã xác minh phiếu này; người duyệt phải là người khác (trừ Toàn quyền).") : null,
      h("label", { class: "dk-o" }, h("span", { class: "nhan" }, "Vai trò đối tác"), vai), baoDoiVai,
      h("div", { class: "dk-hang-nut" }, nutDuyet), h("div", { class: "dk-hang-nut" }, lyTuChoi.el, nutTuChoi));
  }

  // ---- Đã duyệt, chưa kích hoạt: «Gửi lại lời mời» (ADR-0207 Đ7 — mở lại hạn đặt PIN) ----
  function veLoiMoi(p: DongHangCho): void {
    const k = dauKhung(`Phiếu ${p.id}`);
    const nutGui = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "dk-hc-gui-lai-loi-moi" }, "Gửi lại lời mời") as HTMLButtonElement;
    nutGui.addEventListener("click", () => void lenhDk(p, async () => {
      const r = await api<{ hanKichHoat: string }>(`/api/dang-ky/phieu/${p.id}/gui-lai-loi-moi`, { method: "POST" });
      return `Đã mở lại hạn đặt mã PIN tới ${vnDateTimeText(r.hanKichHoat)}.`;
    }));
    moKhung(k.el, dong("Trạng thái", CHU_HANG_CHO_DK.chuaKichHoat), h("p", { class: "muted" }, "Người đăng ký chưa tự đặt mã PIN. Quá hạn thì mở lại hạn bằng nút dưới."), nutGui);
  }

  replaceChildren(goc,
    h("h2", { id: "dk-hc-heading" }, CHU_HANG_CHO_DK.tieuDe),
    h("p", { class: "muted" }, "Phiếu người ngoài tự gửi để làm đối tác. Quản trị xác minh, Nhân sự duyệt mở tài khoản."),
    baoLoi, baoOk, danhSach, chiTiet);
  goc.hidden = false;
  void taiDanhSach();
}
