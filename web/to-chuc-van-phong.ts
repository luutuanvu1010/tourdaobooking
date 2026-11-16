// Khối «Người quản lý tổ chức» ở chi tiết một HỒ SƠ TỔ CHỨC trong Danh bạ (ADR-0213 Đ2.4–Đ2.8, Đ6; mốc B1 Task 14). Chỉ ba vai văn phòng giữ ô `partner.org.manager.write`
// (Quản lý bán hàng, Quản trị, Toàn quyền), không giữ quyền Đối tác — cùng cổng với máy chủ; máy chủ luôn kiểm lại.
//   GET /api/parties/:id/to-chuc · POST …/to-chuc/{nguoi-quan-ly, go-thanh-vien, gui-lai-thu}
// Giao hoặc chuyển người quản lý gửi kèm `nguoiQuanLyHienTai` = người quản lý màn hình đang thấy (null = chưa có); máy chủ 409 nếu đã có người khác đổi trước. Quan hệ «Người quản lý của»
// và «Thành viên của» chỉ quản lý ở khối này (Danh bạ không có nút «Kết thúc» cho hai loại đó). Không innerHTML; dựng bằng h().
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import { MA_LY_DO_TO_CHUC, NHAN_LY_DO_TO_CHUC } from "../src/shared/to-chuc";
import { ngayVN } from "../src/shared/giay-to-hien-thi";
import { vnDateTimeText } from "../src/shared/vn-date";

const cauLoi = (e: unknown): string => (e instanceof ApiError ? e.message : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");

export function dungKhoiToChucVanPhong(goc: HTMLElement, orgId: string): void {
  const loi = h("div", { class: "alert", role: "alert", hidden: true });
  const ok = h("div", { class: "alert ok", role: "status", hidden: true });
  const noiDung = h("div", { id: "tc-vp-noi-dung" }, h("p", { class: "muted" }, "Đang tải…"));
  const hienLoi = (m: string | null): void => { loi.hidden = m === null; loi.textContent = m ?? ""; };
  const hienOk = (m: string | null): void => { ok.hidden = m === null; ok.textContent = m ?? ""; };
  replaceChildren(goc, h("h3", null, "Người quản lý tổ chức"), loi, ok, noiDung);
  const duong = (ten: string): string => `/api/parties/${encodeURIComponent(orgId)}/to-chuc${ten}`;

  async function nap(): Promise<void> {
    try {
      ve((await api<Api.ToChucResponse>(duong(""))).toChuc);
    } catch (e) {
      replaceChildren(noiDung);
      hienLoi(cauLoi(e));
    }
  }
  async function ghi(nut: HTMLButtonElement, ten: string, than: unknown, cau: string): Promise<void> {
    if (nut.disabled) return;
    nut.disabled = true;
    hienLoi(null);
    hienOk(null);
    try {
      await api(duong(ten), { method: "POST", body: than });
      await nap();
      hienOk(cau);
    } catch (e) {
      hienLoi(cauLoi(e));
      nut.disabled = false;
      if (e instanceof ApiError && e.status === 409) await nap(); // người khác vừa đổi: nạp lại cho đúng người quản lý đang thấy, câu báo giữ nguyên
    }
  }

  function ve(t: Api.ToChucDto): void {
    const lyDo = h("select", { id: "tc-vp-ly-do", "aria-label": "Lý do" },
      h("option", { value: "" }, "Chọn lý do"), ...MA_LY_DO_TO_CHUC.map((m) => h("option", { value: m }, NHAN_LY_DO_TO_CHUC[m]))) as HTMLSelectElement;
    const ql = t.nguoiQuanLy;
    const dongQl = ql
      ? h("p", { id: "tc-vp-ql" }, `${ql.ten} (từ ${ngayVN(ql.tuNgay)})`, ql.coHieuLuc ? null : h("span", { class: "muted" }, " · chưa có hiệu lực: tài khoản chưa dùng được"))
      : h("p", { class: "muted", id: "tc-vp-ql" }, "Chưa có người quản lý.");
    const tv = t.thanhVien.length === 0
      ? [h("p", { class: "muted" }, "Chưa có thành viên.")]
      : t.thanhVien.map((x) => {
          const go = h("button", { type: "button", class: "btn btn-link", "data-go-thanh-vien": x.partyId }, "Gỡ thành viên") as HTMLButtonElement;
          go.addEventListener("click", () => void (async () => {
            if (!lyDo.value) { hienLoi("Chọn lý do trước khi gỡ thành viên."); return; }
            if (!(await hoiXacNhan({ tieuDe: "Gỡ thành viên", hauQua: `${x.ten} sẽ không còn là thành viên của tổ chức.`, nhanNguyHiem: "Gỡ thành viên", nhanGiu: "Thôi", opener: go }))) return;
            await ghi(go, "/go-thanh-vien", { personPartyId: x.partyId, lyDo: lyDo.value }, `Đã gỡ ${x.ten} khỏi tổ chức.`);
          })());
          return h("p", null, `${x.ten} (từ ${ngayVN(x.tuNgay)}) `, go);
        });
    const yc = t.yeuCauChuyen.map((x) => h("p", { class: "dk-hc-cap", "data-yeu-cau": x.id }, `Yêu cầu chuyển quyền quản lý đang chờ: ${x.nguoiDeXuat.ten} được đề xuất, gửi ${vnDateTimeText(x.luc)}.`));
    let thu: HTMLElement | null = null;
    if (t.thu) {
      if (t.thu.trangThai === "CHO") {
        const lai = h("button", { type: "button", class: "btn btn-link", id: "tc-vp-gui-lai-thu" }, "Gửi lại thư báo") as HTMLButtonElement;
        lai.addEventListener("click", () => void ghi(lai, "/gui-lai-thu", {}, "Đã gửi lại thư."));
        thu = h("p", { id: "tc-vp-thu" }, "Thư báo người quản lý cũ chưa gửi được. ", lai);
      } else thu = h("p", { class: "muted", id: "tc-vp-thu" }, t.thu.trangThai === "DA_GUI" ? `Đã gửi thư báo người quản lý cũ (${vnDateTimeText(t.thu.ngay)}).` : "Người quản lý cũ không có email nên không gửi thư báo được.");
    }
    // Chọn người sẽ làm người quản lý: tìm hồ sơ cá nhân, máy chủ kiểm tài khoản.
    const tim = h("input", { type: "text", id: "tc-vp-tim", placeholder: "Gõ tên người sẽ làm người quản lý…", "aria-label": "Tìm người", autocomplete: "off" }) as HTMLInputElement;
    const chon = h("select", { id: "tc-vp-chon", "aria-label": "Chọn người" }) as HTMLSelectElement;
    let hen: number | undefined;
    tim.addEventListener("input", () => {
      window.clearTimeout(hen);
      hen = window.setTimeout(async () => {
        if (tim.value.trim().length < 2) { replaceChildren(chon); return; }
        try {
          const r = await api<Api.PartyListResponse>(`/api/parties?limit=10&q=${encodeURIComponent(tim.value.trim())}`);
          replaceChildren(chon, ...r.parties.filter((x) => x.kind === "PERSON" && x.id !== ql?.partyId).map((x) => h("option", { value: x.id }, x.displayName)));
        } catch (e) { hienLoi(cauLoi(e)); }
      }, 300);
    });
    const giu = h("input", { type: "checkbox", id: "tc-vp-giu", checked: true }) as HTMLInputElement;
    const nhan = ql ? "Chuyển quyền quản lý" : "Giao người quản lý";
    const nut = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "tc-vp-giao" }, nhan) as HTMLButtonElement;
    nut.addEventListener("click", () => void (async () => {
      if (!chon.value) { hienLoi("Chọn người sẽ làm người quản lý."); return; }
      if (!lyDo.value) { hienLoi("Chọn lý do."); return; }
      const ten = chon.selectedOptions[0]?.textContent ?? "";
      if (!(await hoiXacNhan({
        tieuDe: nhan,
        hauQua: ql ? `${ten} sẽ làm người quản lý của ${t.ten}. ${ql.ten} ${giu.checked ? "trở thành thành viên" : "không còn liên kết với tổ chức"}.` : `${ten} sẽ làm người quản lý của ${t.ten}.`,
        nhanNguyHiem: nhan, nhanGiu: "Thôi", opener: nut,
      }))) return;
      await ghi(nut, "/nguoi-quan-ly", { personPartyId: chon.value, nguoiCuThanhThanhVien: ql ? giu.checked : true, lyDo: lyDo.value, nguoiQuanLyHienTai: ql?.partyId ?? null }, `Đã ${ql ? "chuyển quyền quản lý" : "giao người quản lý"} cho ${ten}.`);
    })());
    replaceChildren(noiDung,
      dongQl, h("h4", null, "Thành viên"), ...tv, ...yc, thu,
      h("div", { class: "grid three" }, h("label", null, "Tìm người", tim), h("label", null, "Chọn", chon), h("label", null, "Lý do", lyDo)),
      ql ? h("label", { class: "check" }, giu, "Giữ người quản lý hiện tại làm thành viên") : null,
      h("div", { class: "actions" }, nut));
  }
  void nap();
}
