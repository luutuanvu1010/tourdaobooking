// Thẻ «Nhóm hỗ trợ» (PR 3, chỉ Toàn quyền — máy chủ: ô feedback.team.manage): bảng nhóm, công tắc «Nhạy cảm» lưu ngay, hộp «Sửa» và hộp «Thêm nhóm».
// Điện thoại: thẻ thay bảng. Mã nhóm KHÔNG hiện và không hỏi (máy sinh từ tên). Không import feedback.ts (có top-level await): tự báo lỗi trong thẻ.
import { NHOM_KY_THUAT_ID, TEAM_ROLE_NAME, TEAM_ROLES, type TeamRole } from "../src/shared/ve-ho-tro";
import { chuTat } from "../src/shared/ve-ho-tro-hien-thi";
import { isExternalPermission } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren } from "./dom";

const GOC_API = "/api/feedback/admin/teams";
const CAU_NHAY_CAM = "Email báo chung và nhật ký chỉ ghi mã yêu cầu, không ghi tiêu đề.";

let nhanVien: Api.StaffListRowDto[] | null = null;
const thongBao = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const ghi = (path: string, method: string, body?: unknown) => api<{ team: Api.FeedbackAdminTeamDto }>(path, { method, body });

export function veNhomHoTro(goc: HTMLElement): void {
  let ds: Api.FeedbackAdminTeamDto[] = [];
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  const hienLoi = (m: string | null): void => {
    loi.textContent = m ?? "";
    loi.hidden = !m;
  };
  const noiDung = h("div", { class: "ht-nhom-noi-dung" });
  const nutThem = h("button", { type: "button", class: "btn", id: "ht-nhom-them" }, "＋ Thêm nhóm");
  const demNgung = h("span", { class: "muted", id: "ht-nhom-ngung" });
  const dsNgung = h("div", { class: "ht-nhom-ngung-ds" });
  replaceChildren(
    goc,
    h("div", { class: "ht-nhom" },
      loi,
      noiDung,
      h("div", { class: "ht-nhom-chan" }, nutThem, demNgung),
      dsNgung,
      h("p", { class: "muted ht-nhom-ghi-chu" }, `Nhạy cảm: ${CAU_NHAY_CAM} Gạt công tắc là lưu ngay. Nhóm Kỹ thuật không ngưng được. Yêu cầu gửi vào nhóm chưa có thành viên chỉ Toàn quyền xử lý được.`)),
  );

  async function tai(): Promise<void> {
    try {
      const [r, nv] = await Promise.all([
        api<Api.FeedbackAdminTeamsResponse>(GOC_API),
        nhanVien ? Promise.resolve(nhanVien) : api<Api.StaffListResponse>("/api/staff").then((x) => x.staff),
      ]);
      nhanVien = nv;
      ds = r.teams;
      hienLoi(null);
      ve();
    } catch (err) {
      hienLoi(thongBao(err));
    }
  }

  /** Công tắc «Nhạy cảm» của một nhóm: lưu ngay, hiện «Đã lưu»; lỗi thì trả công tắc về cũ và báo. */
  function congTacNhayCam(t: Api.FeedbackAdminTeamDto): HTMLElement {
    const nut = h("button", { type: "button", role: "switch", class: "dp-switch ht-switch", "aria-checked": String(t.sensitive), "aria-label": `Nhạy cảm — nhóm ${t.name}`, "data-nhay-cam": t.id }, h("span", { class: "dp-switch-knob" }));
    const trangThai = h("span", { class: "muted ht-da-luu", role: "status" });
    nut.addEventListener("click", async () => {
      if (nut.disabled) return;
      const moi = nut.getAttribute("aria-checked") !== "true";
      nut.disabled = true;
      nut.setAttribute("aria-checked", String(moi));
      try {
        const r = await ghi(`${GOC_API}/${t.id}`, "PATCH", { sensitive: moi });
        t.sensitive = r.team.sensitive;
        nut.setAttribute("aria-checked", String(t.sensitive));
        hienLoi(null);
        trangThai.textContent = "Đã lưu";
        setTimeout(() => void (trangThai.textContent = ""), 2000);
      } catch (err) {
        nut.setAttribute("aria-checked", String(t.sensitive));
        hienLoi(thongBao(err));
      } finally {
        nut.disabled = false;
      }
    });
    return h("span", { class: "ht-cong-tac" }, nut, trangThai);
  }

  function thanhVienTom(t: Api.FeedbackAdminTeamDto): HTMLElement {
    if (t.members.length === 0) return h("span", { class: "badge badge-draft" }, "Chưa có thành viên");
    const truong = t.members.filter((m) => m.role === "LEAD").map((m) => m.name ?? "(không rõ tên)");
    return h("span", { class: "ht-thanh-vien" },
      ...t.members.slice(0, 3).map((m) => h("span", { class: `ht-av${m.role === "LEAD" ? " is-truong" : ""}`, title: m.name ?? "", "aria-hidden": "true" }, chuTat(m.name))),
      h("span", null, ` ${t.members.length}${truong.length ? ` · trưởng nhóm: ${truong.join(", ")}` : ""}`));
  }

  function nutSua(t: Api.FeedbackAdminTeamDto): HTMLButtonElement {
    const b = h("button", { type: "button", class: "btn", "data-sua-nhom": t.id, "aria-label": `Sửa nhóm ${t.name}` }, "Sửa");
    b.addEventListener("click", () => moHopSua(t.id, b));
    return b;
  }

  function ve(): void {
    const hoatDong = ds.filter((t) => t.active);
    const ngung = ds.filter((t) => !t.active);
    const bang = h("div", { class: "table-wrap" },
      h("table", { class: "items ht-bang-nhom" },
        h("thead", null, h("tr", null, h("th", null, "Nhóm"), h("th", null, "Phụ trách"), h("th", null, "Thành viên"), h("th", null, "Nhạy cảm"), h("th", { "aria-label": "Thao tác" }))),
        h("tbody", null, ...hoatDong.map((t) =>
          h("tr", { "data-team": t.id },
            h("td", null, h("strong", null, t.name)),
            h("td", null, t.description || h("span", { class: "muted" }, "—")),
            h("td", null, thanhVienTom(t)),
            h("td", null, congTacNhayCam(t)),
            h("td", { class: "ht-nhom-thao-tac" }, nutSua(t)))))));
    const the = h("div", { class: "card-list" }, ...hoatDong.map((t) =>
      h("section", { class: "card card-col ht-nhom-the", "data-team": t.id },
        h("h3", null, t.name),
        t.description && h("p", { class: "muted" }, t.description),
        h("p", null, thanhVienTom(t)),
        h("div", { class: "ht-nhom-dong" }, h("span", null, "Nhạy cảm"), congTacNhayCam(t)),
        nutSua(t))));
    replaceChildren(noiDung, hoatDong.length ? bang : h("p", { class: "muted ht-trong" }, "Chưa có nhóm nào."), hoatDong.length ? the : null);
    demNgung.textContent = `Nhóm đã ngưng: ${ngung.length}`;
    replaceChildren(dsNgung, ...ngung.map((t) => {
      const lai = h("button", { type: "button", class: "btn", "data-dung-lai": t.id, "aria-label": `Dùng lại nhóm ${t.name}` }, "Dùng lại");
      lai.addEventListener("click", async () => {
        if (lai.disabled) return;
        lai.disabled = true;
        try {
          await ghi(`${GOC_API}/${t.id}`, "PATCH", { active: true });
          await tai();
        } catch (err) {
          hienLoi(thongBao(err));
          lai.disabled = false;
        }
      });
      return h("div", { class: "ht-nhom-dong ht-nhom-ngung-dong", "data-team": t.id }, h("span", { class: "muted" }, t.name), lai);
    }));
  }

  // ---- Hộp «Thêm nhóm»: chỉ tên và mô tả; mã nhóm máy tự sinh từ tên (không gửi `code`). ------------------------------------
  nutThem.addEventListener("click", () => {
    const loiHop = h("p", { class: "alert", role: "alert", hidden: true });
    const ten = h("input", { id: "ht-nhom-ten-moi", type: "text", maxLength: 80, required: true });
    const moTa = h("input", { id: "ht-nhom-mo-ta-moi", type: "text", maxLength: 200 });
    const tao = h("button", { type: "button", class: "btn btn-primary" }, "Thêm nhóm");
    const huy = h("button", { type: "button", class: "btn btn-link" }, "Huỷ");
    const bt = moBangTruot({
      title: "Thêm nhóm",
      opener: nutThem,
      body: [loiHop, h("div", { class: "grid" }, h("label", null, "Tên nhóm", ten), h("label", null, "Mô tả (nhóm lo việc gì)", moTa))],
      foot: [huy, tao],
    });
    if (!bt) return;
    ten.focus();
    huy.addEventListener("click", () => bt.close());
    tao.addEventListener("click", async () => {
      if (tao.disabled) return;
      if (!ten.value.trim()) {
        loiHop.textContent = "Điền tên nhóm.";
        loiHop.hidden = false;
        return;
      }
      loiHop.hidden = true;
      tao.disabled = true;
      bt.setBusy(true);
      try {
        await ghi(GOC_API, "POST", { name: ten.value, description: moTa.value });
        bt.setBusy(false);
        bt.close();
        await tai();
      } catch (err) {
        loiHop.textContent = thongBao(err);
        loiHop.hidden = false;
        tao.disabled = false;
        bt.setBusy(false);
      }
    });
  });

  // ---- Hộp «Sửa»: tên, mô tả, nhạy cảm (lưu bằng nút «Lưu»), thành viên (mỗi thao tác lưu ngay), thêm người, ngưng nhóm. -----
  function moHopSua(id: string, opener: HTMLElement): void {
    const t0 = ds.find((x) => x.id === id);
    if (!t0) return;
    const loiHop = h("p", { class: "alert", role: "alert", hidden: true });
    const hienLoiHop = (m: string | null): void => {
      loiHop.textContent = m ?? "";
      loiHop.hidden = !m;
    };
    const ten = h("input", { id: "ht-nhom-ten", type: "text", maxLength: 80, value: t0.name, required: true });
    const moTa = h("input", { id: "ht-nhom-mo-ta", type: "text", maxLength: 200, value: t0.description });
    let nhay = t0.sensitive;
    const nutNhay = h("button", { type: "button", role: "switch", class: "dp-switch ht-switch", "aria-checked": String(nhay), "aria-labelledby": "ht-nhom-nhay-nhan", "aria-describedby": "ht-nhom-nhay-goi-y" }, h("span", { class: "dp-switch-knob" }));
    nutNhay.addEventListener("click", () => {
      nhay = !nhay;
      nutNhay.setAttribute("aria-checked", String(nhay));
    });
    const dongNhay = h("div", { class: "dp-toggle" },
      h("span", { class: "dp-toggle-text" }, h("span", { id: "ht-nhom-nhay-nhan", class: "dp-toggle-label" }, "Nhạy cảm"), h("span", { id: "ht-nhom-nhay-goi-y", class: "dp-toggle-hint" }, CAU_NHAY_CAM)),
      nutNhay);
    const khoiThanhVien = h("div", { class: "ht-nhom-thanh-vien" });
    const khoiThem = h("div", { class: "ht-nhom-them-nguoi" });
    const luu = h("button", { type: "button", class: "btn btn-primary" }, "Lưu");
    const dong = h("button", { type: "button", class: "btn btn-link" }, "Đóng");
    const ngung = id === NHOM_KY_THUAT_ID ? null : h("button", { type: "button", class: "btn btn-danger", id: "ht-nhom-ngung-nut" }, "Ngưng nhóm");
    const bt = moBangTruot({
      title: "Sửa nhóm",
      opener,
      body: [loiHop,
        h("div", { class: "grid" }, h("label", null, "Tên nhóm", ten), h("label", null, "Mô tả (nhóm lo việc gì)", moTa)),
        dongNhay,
        h("h3", null, "Thành viên"), khoiThanhVien, khoiThem],
      foot: [ngung, dong, luu],
    });
    if (!bt) return;
    dong.addEventListener("click", () => bt.close());
    const hienTai = (): Api.FeedbackAdminTeamDto => ds.find((x) => x.id === id) ?? t0;
    /** Một thao tác ghi trong hộp: khoá nút, báo lỗi trong hộp, xong thì nạp lại dữ liệu nhóm và vẽ lại thành viên. */
    async function chay(nut: HTMLButtonElement, viec: () => Promise<unknown>): Promise<boolean> {
      if (nut.disabled) return false;
      nut.disabled = true;
      bt!.setBusy(true);
      try {
        await viec();
        hienLoiHop(null);
        return true;
      } catch (err) {
        hienLoiHop(thongBao(err));
        return false;
      } finally {
        nut.disabled = false;
        bt!.setBusy(false);
      }
    }
    async function napLaiNhom(): Promise<void> {
      const r = await api<Api.FeedbackAdminTeamsResponse>(GOC_API);
      ds = r.teams;
      veThanhVien();
      ve(); // bảng phía sau cũng đổi theo
    }

    function veThanhVien(): void {
      const t = hienTai();
      replaceChildren(khoiThanhVien, ...(t.members.length ? t.members.map((m) => {
        const vaiKhac: TeamRole = m.role === "LEAD" ? "MEMBER" : "LEAD";
        const doi = h("button", { type: "button", class: "btn btn-link", "aria-label": `Đổi ${m.name ?? "thành viên"} thành ${TEAM_ROLE_NAME[vaiKhac]}` }, `Đổi thành ${TEAM_ROLE_NAME[vaiKhac]}`);
        doi.addEventListener("click", () => void chay(doi, async () => {
          await ghi(`${GOC_API}/${id}/members/${m.staffId}`, "PUT", { role: vaiKhac });
          await napLaiNhom();
        }));
        const go = h("button", { type: "button", class: "btn btn-link", "aria-label": `Gỡ ${m.name ?? "thành viên"} khỏi nhóm` }, "Gỡ");
        go.addEventListener("click", () => void chay(go, async () => {
          await ghi(`${GOC_API}/${id}/members/${m.staffId}`, "DELETE");
          await napLaiNhom();
        }));
        return h("div", { class: "ht-nhom-dong", "data-member": m.staffId },
          h("span", { class: "ht-av", "aria-hidden": "true" }, chuTat(m.name)),
          h("span", { class: "ht-nhom-ten-tv" }, h("strong", null, m.name ?? "(không rõ tên)"), ` · ${TEAM_ROLE_NAME[m.role]}`),
          doi, go);
      }) : [h("p", { class: "muted" }, "Chưa có thành viên.")]));
      veThemNguoi();
    }

    function veThemNguoi(): void {
      const coSan = new Set(hienTai().members.map((m) => m.staffId));
      // Chỉ tài khoản đang hoạt động, KHÔNG mang quyền bên ngoài (máy chủ từ chối cả hai — R6).
      const chonDuoc = (nhanVien ?? []).filter((s) => s.active && !s.permissions.some(isExternalPermission) && !coSan.has(s.id));
      const o = h("input", { id: "ht-nhom-tim-nguoi", type: "search", placeholder: "Gõ tên để tìm nhân viên…", "aria-label": "Tìm nhân viên để thêm vào nhóm", autocomplete: "off" });
      const vai = h("select", { "aria-label": "Vai trò trong nhóm" }, ...TEAM_ROLES.map((v) => h("option", { value: v, selected: v === "MEMBER" }, TEAM_ROLE_NAME[v])));
      const kq = h("div", { class: "ht-nhom-ket-qua" });
      const loc = (): void => {
        const q = o.value.trim().toLowerCase();
        replaceChildren(kq, ...(q ? chonDuoc.filter((s) => s.fullName.toLowerCase().includes(q)).slice(0, 8).map((s) => {
          const them = h("button", { type: "button", class: "btn", "aria-label": `Thêm ${s.fullName} vào nhóm` }, `Thêm ${s.fullName}`);
          them.addEventListener("click", () => void chay(them, async () => {
            await ghi(`${GOC_API}/${id}/members/${s.id}`, "PUT", { role: vai.value });
            await napLaiNhom();
          }));
          return them;
        }) : []));
        if (q && !kq.childElementCount) kq.append(h("p", { class: "muted" }, "Không có nhân viên nào khớp."));
      };
      o.addEventListener("input", loc);
      replaceChildren(khoiThem, h("label", null, "Thêm người vào nhóm", o), h("label", null, "Vai trò", vai), kq);
    }
    veThanhVien();

    luu.addEventListener("click", () => void chay(luu, async () => {
      if (!ten.value.trim()) throw new ApiError(400, "invalid_input", "Điền tên nhóm.");
      await ghi(`${GOC_API}/${id}`, "PATCH", { name: ten.value, description: moTa.value, sensitive: nhay });
      await tai();
      bt.close();
    }));
    if (ngung) {
      let hoiLai = false;
      ngung.addEventListener("click", () => {
        if (!hoiLai) {
          hoiLai = true;
          ngung.textContent = "Bấm lại để ngưng nhóm";
          return;
        }
        void chay(ngung, async () => {
          await ghi(`${GOC_API}/${id}`, "PATCH", { active: false });
          await tai();
          bt.close();
        }).then((ok) => {
          if (!ok) {
            hoiLai = false;
            ngung.textContent = "Ngưng nhóm";
          }
        });
      });
    }
  }

  void tai();
}
