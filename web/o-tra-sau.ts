// Ô «Trả sau» ở màn «Cấp độ đại lý» (ADR-0172 Đ1 mục 2, Đ2) và khối cài đặt chung của Trả sau ở cuối màn: số gợi ý theo cấp, «Mức tối đa Quản trị được cấp».
// CHỈ web/cap-dai-ly.ts nhập tệp này. Gọi: GET /api/tra-sau/han-muc (một lần cho cả màn: hồ sơ đang bật hoặc đang nợ), GET /api/tra-sau/goi-y, GET /api/tra-sau/han-muc/:partyId
// (lúc MỞ bảng của một hồ sơ, không gọi theo từng dòng), GET /api/pricing/muc-ta (tên cấp đang bật, cho khối gợi ý).
// Ghi: POST /api/tra-sau/han-muc, POST /api/tra-sau/han-muc/:partyId/ngung, PUT /api/tra-sau/goi-y/:cap, POST /api/tra-sau/muc-toi-da.
// Ẩn/hiện nút theo cờ máy chủ (`coQuyenSua`, `coQuyenDatMucToiDa`); máy chủ hỏi lại quyền, mức tối đa và luật «không tự đặt cho mình» ở mọi lệnh ghi.
// Thẻ công tắc «Khách của đối tác trả cho Công ty» (ADR-0178 Đ1 mục 1, Task A5): GET / POST /api/kenh-thu-doi-tac; thẻ hiện theo ô `billing.partner_channel.view`
// (Toàn quyền, Kế toán, Quản trị), nút Tắt / Bật chỉ theo ô `.write` (Toàn quyền) — cùng bảng quyền với máy chủ.
// Số gợi ý chỉ điền sẵn bảng bật, không cho ai Trả sau (ADR-0172 Đ2 mục 2). Không confirm / alert / innerHTML; dựng bằng h().
import { ApiError, api, type Api, type Staff } from "./api";
import { hoiXacNhan, moBangTruot } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import { dateTime } from "./format";
import { hienBaoNgan } from "./toast";
import { can } from "../src/shared/permissions";
import { cauGoiYDienSan, cauHanMuc, cauMucToiDa, docGio, docHanMuc, goiYCuaCap, nhanAnHan, nhanQuaHan } from "../src/shared/han-muc-tra-sau-hien-thi";
import { dongTien } from "../src/shared/tra-sau";

/** Mọi dữ liệu Trả sau của màn, nạp một lần. `theoBen` chỉ có hồ sơ đang bật hoặc đang nợ; hồ sơ vắng mặt = chưa bật, không nợ. */
export interface BoiCanhTraSau {
  theoBen: Map<string, Api.HanMucTraSauDto>;
  goiY: Api.GoiYTraSauDto[];
  coQuyenSua: boolean;
  mucToiDa: number | null;
  coQuyenDatMucToiDa: boolean;
}

const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const baoLoi = (el: HTMLElement, cau: string): void => {
  el.textContent = cau;
  el.hidden = false;
};

/** Nạp Trả sau cho cả màn. Lỗi bất kỳ ⇒ null: bảng cấp vẫn vẽ, ô Trả sau hiện «—». */
export async function taiTraSau(): Promise<BoiCanhTraSau | null> {
  try {
    const [ds, gy] = await Promise.all([api<Api.HanMucTraSauListResponse>("/api/tra-sau/han-muc"), api<Api.GoiYTraSauResponse>("/api/tra-sau/goi-y")]);
    return { theoBen: new Map(ds.danhSach.map((x) => [x.partyId, x])), goiY: gy.goiY, coQuyenSua: ds.coQuyenSua, mucToiDa: ds.mucToiDa, coQuyenDatMucToiDa: ds.coQuyenDatMucToiDa };
  } catch {
    return null;
  }
}

/** Đưa tiêu điểm về ô Trả sau của đúng hồ sơ vừa lưu (bảng máy tính và thẻ điện thoại cùng dựng ô; lấy ô đang hiện). */
export function datTieuDiemOTraSau(partyId: string): void {
  const o = [...document.querySelectorAll<HTMLElement>(".cot-tra-sau")].find((x) => x.dataset.party === partyId && x.getClientRects().length > 0);
  if (o) (o.querySelector<HTMLElement>("button") ?? o).focus();
}

/** Ô «Trả sau» của một hồ sơ. `capCode` = mã cấp hiện hành (để lấy số gợi ý). `lamMoi(partyId)` nạp lại và vẽ lại màn sau khi lưu. */
export function oTraSau(ho: { partyId: string; ten: string; capCode: string | null; tenCap: string | null }, bc: BoiCanhTraSau | null, lamMoi: (partyId: string) => Promise<void>): HTMLElement {
  if (bc === null) return h("div", { class: "cot-tra-sau muted", "data-party": ho.partyId }, "—");
  const v = bc.theoBen.get(ho.partyId);
  const chu = cauHanMuc(v ?? { hanMuc: null, gioTra: null, gioAnHan: null });
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  let chinh: HTMLElement;
  if (bc.coQuyenSua) {
    const nut = h("button", { type: "button", class: "btn btn-link", "aria-label": `Trả sau: ${ho.ten} — ${chu}` }, chu);
    nut.addEventListener("click", () => void moBangTraSau(ho, bc, nut, loi, lamMoi));
    chinh = nut;
  } else chinh = h("span", v?.coHanMuc ? null : { class: "muted" }, chu);
  const phu = [v && v.dangNo > 0 ? `Đang nợ ${dongTien(v.dangNo)}` : null, v ? nhanAnHan(v.soDonAnHan) : null, v ? nhanQuaHan(v.soDonQuaHan) : null].filter((x): x is string => x !== null);
  return h(
    "div",
    { class: "cot-tra-sau", tabindex: -1, "data-party": ho.partyId, "data-tra-sau": v?.coHanMuc ? "bat" : "chua-bat" },
    h("div", null, chinh),
    phu.length > 0 && h("div", { class: "muted" }, phu.join(" · ")),
    loi,
  );
}

/** Bảng cấp / điều chỉnh / đóng hạn mức trả sau của MỘT hồ sơ (chữ nút theo chủ 2026-11-06: «Cấp hạn mức» khi chưa có, «Điều chỉnh hạn mức» khi đã có). Đọc số đang bật lúc MỞ (không dùng số lúc tải trang); chưa bật thì điền sẵn số gợi ý của cấp. */
async function moBangTraSau(
  ho: { partyId: string; ten: string; capCode: string | null; tenCap: string | null },
  bc: BoiCanhTraSau,
  opener: HTMLElement,
  loiO: HTMLElement,
  lamMoi: (partyId: string) => Promise<void>,
): Promise<void> {
  loiO.hidden = true;
  let r: Api.TraSauHoSoResponse;
  try {
    r = await api<Api.TraSauHoSoResponse>(`/api/tra-sau/han-muc/${encodeURIComponent(ho.partyId)}`);
  } catch (err) {
    return baoLoi(loiO, lyDoLoi(err));
  }
  if (!r.coQuyenSua) return baoLoi(loiO, "Bạn không đặt được Trả sau cho hồ sơ này (không ai tự đặt Trả sau cho hồ sơ của chính mình).");
  const dangBat = r.hanMuc !== null && r.gioTra !== null;
  const gy = dangBat ? null : goiYCuaCap(bc.goiY, ho.capCode);
  const so = dangBat ? { hanMuc: r.hanMuc, gioTra: r.gioTra, gioAnHan: r.gioAnHan ?? 0 } : gy;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const oHan = h("input", { id: "ts-han-muc", class: "vc-input", type: "text", inputMode: "numeric", autocomplete: "off", maxLength: 14, value: so?.hanMuc != null ? String(so.hanMuc) : "" });
  const oGio = h("input", { id: "ts-gio-tra", class: "vc-input", type: "text", inputMode: "numeric", autocomplete: "off", maxLength: 4, value: so?.gioTra != null ? String(so.gioTra) : "" });
  const oAn = h("input", { id: "ts-gio-an-han", class: "vc-input", type: "text", inputMode: "numeric", autocomplete: "off", maxLength: 4, value: so ? String(so.gioAnHan ?? 0) : "0" });
  const oLyDo = h("input", { id: "ts-ly-do", class: "vc-input", type: "text", autocomplete: "off", maxLength: 200 });
  const luu = h("button", { type: "button", class: "btn btn-primary btn-block", "data-action": "dat-han-muc" }, dangBat ? "Điều chỉnh hạn mức" : "Cấp hạn mức");
  const ngung = dangBat ? h("button", { type: "button", class: "btn btn-block", "data-action": "ngung-han-muc" }, "Đóng hạn mức") : null;
  const goiYCau = cauGoiYDienSan(dangBat, gy ? ho.tenCap : null);
  const mucCau = cauMucToiDa(bc.mucToiDa, bc.coQuyenDatMucToiDa);
  const bang = moBangTruot({
    title: `Trả sau: ${ho.ten}`,
    body: [
      h(
        "div",
        { class: "vc-gt" },
        h("div", { class: "vc-hint" }, dangBat ? `Đang bật: ${cauHanMuc(r)} · đang nợ ${dongTien(r.dangNo)}` : r.dangNo > 0 ? `Chưa cấp · còn nợ ${dongTien(r.dangNo)}` : "Chưa cấp hạn mức trả sau."),
        goiYCau && h("div", { class: "vc-hint" }, goiYCau),
        mucCau && h("div", { class: "vc-hint" }, mucCau),
        h("div", { class: "vc-field" }, h("label", { for: "ts-han-muc" }, "Hạn mức (đồng)"), oHan),
        h("div", { class: "vc-field" }, h("label", { for: "ts-gio-tra" }, "Thời hạn trả (giờ)"), oGio, h("div", { class: "vc-hint" }, "Tính từ lúc đơn được xác nhận.")),
        h("div", { class: "vc-field" }, h("label", { for: "ts-gio-an-han" }, "Ân hạn (giờ)"), oAn, h("div", { class: "vc-hint" }, "Sau hạn trả, trong ân hạn chỉ báo chứ chưa chặn. Hết ân hạn mà còn nợ thì chặn đơn trả sau mới và vé chưa mở.")),
        h("div", { class: "vc-field" }, h("label", { for: "ts-ly-do" }, "Lý do (không bắt buộc)"), oLyDo),
        loi,
      ),
    ],
    foot: ngung ? [luu, ngung] : [luu],
    opener,
  });
  if (!bang) return;
  luu.addEventListener("click", async () => {
    loi.hidden = true;
    const hm = docHanMuc(oHan.value);
    const gt = docGio(oGio.value, 1, "Thời hạn trả");
    const ah = docGio(oAn.value, 0, "Ân hạn");
    if (!hm.ok) return baoLoi(loi, hm.message);
    if (!gt.ok) return baoLoi(loi, gt.message);
    if (!ah.ok) return baoLoi(loi, ah.message);
    bang.setBusy(true);
    luu.disabled = true;
    try {
      const lyDo = oLyDo.value.trim();
      await api("/api/tra-sau/han-muc", { method: "POST", body: { partyId: ho.partyId, hanMuc: hm.dong, gioTra: gt.gio, gioAnHan: ah.gio, ...(lyDo ? { lyDo } : {}) } satisfies Api.DatHanMucTraSauInput });
    } catch (err) {
      bang.setBusy(false);
      luu.disabled = false;
      return baoLoi(loi, lyDoLoi(err));
    }
    bang.setBusy(false);
    bang.close(false);
    hienBaoNgan(dangBat ? `Đã điều chỉnh hạn mức của ${ho.ten}.` : `Đã cấp hạn mức cho ${ho.ten}.`);
    await lamMoi(ho.partyId);
  });
  ngung?.addEventListener("click", async () => {
    // Hộp hỏi không mở được khi đang có bảng: đóng bảng trước, rồi hỏi.
    bang.close(false);
    const dongY = await hoiXacNhan({
      tieuDe: `Đóng hạn mức của ${ho.ten}?`,
      hauQua: "Từ lúc này đối tác không đặt thêm đơn trả sau được. Các đơn trả sau đã xác nhận vẫn giữ nguyên, nợ vẫn phải thu.",
      nhanNguyHiem: "Đóng hạn mức",
      nhanGiu: "Giữ hạn mức",
      opener,
    });
    if (!dongY) return;
    try {
      await api(`/api/tra-sau/han-muc/${encodeURIComponent(ho.partyId)}/ngung`, { method: "POST", body: {} });
    } catch (err) {
      return baoLoi(loiO, lyDoLoi(err));
    }
    hienBaoNgan(`Đóng hạn mức của ${ho.ten} xong.`);
    await lamMoi(ho.partyId);
  });
  oHan.focus();
}

/**
 * Khối cài đặt chung ở cuối màn: số gợi ý của từng cấp đang bật (Quản trị, Toàn quyền sửa; Kế toán chỉ xem) và «Mức tối đa Quản trị được cấp» (chỉ Toàn quyền sửa).
 * `veLai()` = nạp lại Trả sau và vẽ lại cả màn.
 */
export async function khoiCaiDatTraSau(bc: BoiCanhTraSau | null, veLai: () => Promise<void>): Promise<HTMLElement | null> {
  if (bc === null) return null;
  let cap: { code: string; ten: string }[] = [];
  const loiChung = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  try {
    cap = (await api<Api.MucTaListResponse>("/api/pricing/muc-ta")).muc.filter((m) => m.dangBat).map((m) => ({ code: m.code, ten: m.ten }));
  } catch (err) {
    baoLoi(loiChung, `Không tải được danh sách cấp: ${lyDoLoi(err)}`);
  }
  const dongCap = (c: { code: string; ten: string }): HTMLElement => {
    const g = goiYCuaCap(bc.goiY, c.code);
    const chu = g ? cauHanMuc(g) : "Chưa có số gợi ý";
    const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
    const noi = bc.coQuyenSua ? h("button", { type: "button", class: "btn btn-link", "aria-label": `Số gợi ý Trả sau của cấp ${c.ten} — ${chu}` }, chu) : h("span", g ? null : { class: "muted" }, chu);
    if (noi instanceof HTMLButtonElement) noi.addEventListener("click", () => moBangGoiY(c, g, noi, veLai));
    return h("li", { "data-cap": c.code }, h("strong", null, c.ten), " · ", noi, loi);
  };
  const ds = cap.length === 0 ? h("p", { class: "muted" }, "Chưa có Cấp độ đại lý nào đang bật.") : h("ul", { class: "ts-goi-y" }, ...cap.map(dongCap));

  const muc = h("div", { class: "vc-field" });
  const veMuc = (): void => {
    const cau = bc.mucToiDa === null ? "Chưa đặt: Quản trị chưa bật được Trả sau cho ai." : dongTien(bc.mucToiDa);
    if (!bc.coQuyenDatMucToiDa) {
      replaceChildren(muc, h("p", null, h("strong", null, "Mức tối đa Quản trị được cấp: "), cau));
      return;
    }
    const o = h("input", { id: "ts-muc-toi-da", class: "vc-input", type: "text", inputMode: "numeric", autocomplete: "off", maxLength: 14, value: bc.mucToiDa === null ? "" : String(bc.mucToiDa) });
    const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
    const nut = h("button", { type: "button", class: "btn", "data-action": "luu-muc-toi-da" }, "Lưu");
    nut.addEventListener("click", async () => {
      loi.hidden = true;
      const r = docHanMuc(o.value);
      if (!r.ok) return baoLoi(loi, r.message.replace("Hạn mức", "Mức tối đa"));
      nut.disabled = true;
      try {
        await api("/api/tra-sau/muc-toi-da", { method: "POST", body: { so: r.dong } });
      } catch (err) {
        nut.disabled = false;
        return baoLoi(loi, lyDoLoi(err));
      }
      hienBaoNgan("Đã lưu mức tối đa Quản trị được cấp.");
      await veLai();
    });
    replaceChildren(
      muc,
      h("label", { for: "ts-muc-toi-da" }, "Mức tối đa Quản trị được cấp (đồng)"),
      o,
      h("div", { class: "vc-hint" }, `Hiện tại: ${cau} Quản trị chỉ đặt được hạn mức của một đối tác tới số này; Toàn quyền không bị giới hạn.`),
      h("div", { class: "handler-actions" }, nut),
      loi,
    );
  };
  veMuc();
  return h(
    "section",
    { class: "card card-col", id: "ts-cai-dat", "aria-labelledby": "ts-cai-dat-tieu-de" },
    h("h2", { id: "ts-cai-dat-tieu-de" }, "Hạn mức trả sau"),
    h("p", { class: "muted" }, "Số gợi ý theo cấp chỉ điền sẵn khi cấp hạn mức cho một đối tác; không tự cấp cho ai. Đổi số gợi ý không đổi hạn mức đã cấp."),
    loiChung,
    ds,
    muc,
  );
}

/** Bảng sửa số gợi ý của một cấp. */
function moBangGoiY(c: { code: string; ten: string }, g: Api.GoiYTraSauDto | null, opener: HTMLElement, veLai: () => Promise<void>): void {
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const oHan = h("input", { id: "gy-han-muc", class: "vc-input", type: "text", inputMode: "numeric", autocomplete: "off", maxLength: 14, value: g ? String(g.hanMuc) : "" });
  const oGio = h("input", { id: "gy-gio-tra", class: "vc-input", type: "text", inputMode: "numeric", autocomplete: "off", maxLength: 4, value: g ? String(g.gioTra) : "" });
  const oAn = h("input", { id: "gy-gio-an-han", class: "vc-input", type: "text", inputMode: "numeric", autocomplete: "off", maxLength: 4, value: g ? String(g.gioAnHan) : "0" });
  const luu = h("button", { type: "button", class: "btn btn-primary btn-block", "data-action": "luu-goi-y" }, "Lưu");
  const bang = moBangTruot({
    title: `Số gợi ý Trả sau: cấp ${c.ten}`,
    body: [
      h(
        "div",
        { class: "vc-gt" },
        h("div", { class: "vc-field" }, h("label", { for: "gy-han-muc" }, "Hạn mức (đồng)"), oHan),
        h("div", { class: "vc-field" }, h("label", { for: "gy-gio-tra" }, "Thời hạn trả (giờ)"), oGio),
        h("div", { class: "vc-field" }, h("label", { for: "gy-gio-an-han" }, "Ân hạn (giờ)"), oAn),
        loi,
      ),
    ],
    foot: [luu],
    opener,
  });
  if (!bang) return;
  luu.addEventListener("click", async () => {
    loi.hidden = true;
    const hm = docHanMuc(oHan.value);
    const gt = docGio(oGio.value, 1, "Thời hạn trả");
    const ah = docGio(oAn.value, 0, "Ân hạn");
    if (!hm.ok) return baoLoi(loi, hm.message);
    if (!gt.ok) return baoLoi(loi, gt.message);
    if (!ah.ok) return baoLoi(loi, ah.message);
    bang.setBusy(true);
    luu.disabled = true;
    try {
      await api(`/api/tra-sau/goi-y/${encodeURIComponent(c.code)}`, { method: "PUT", body: { hanMuc: hm.dong, gioTra: gt.gio, gioAnHan: ah.gio } });
    } catch (err) {
      bang.setBusy(false);
      luu.disabled = false;
      return baoLoi(loi, lyDoLoi(err));
    }
    bang.setBusy(false);
    bang.close(false);
    hienBaoNgan(`Đã lưu số gợi ý của cấp ${c.ten}.`);
    await veLai();
  });
  oHan.focus();
}

/**
 * Thẻ công tắc «Khách của đối tác trả cho Công ty» (ADR-0178 Đ1 mục 1). null = người xem không có ô xem, hoặc không đọc được (màn vẫn dùng được, không vỡ).
 * Tắt hỏi lại trước (hậu quả lớn: Công ty thôi nhận tiền khách của đơn Đối tác lập từ lúc đó); Bật thì đổi ngay. Vẽ lại theo đúng DTO máy chủ trả.
 */
export async function khoiKenhThuDoiTac(staff: Staff): Promise<HTMLElement | null> {
  if (!can(staff, "billing.partner_channel.view")) return null;
  let s: Api.KenhThuDoiTacDto;
  try {
    s = await api<Api.KenhThuDoiTacDto>("/api/kenh-thu-doi-tac");
  } catch {
    return null;
  }
  const doiDuoc = can(staff, "billing.partner_channel.write");
  const the = h("section", { class: "card card-col", id: "kenh-thu-doi-tac", "aria-labelledby": "kenh-thu-tieu-de" });
  const ve = (s: Api.KenhThuDoiTacDto): void => {
    const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
    let nut: HTMLButtonElement | null = null;
    if (doiDuoc) {
      const n = h("button", { type: "button", class: s.congTyThu ? "btn" : "btn btn-primary", id: "kenh-thu-doi" }, s.congTyThu ? "Tắt" : "Bật") as HTMLButtonElement;
      n.addEventListener("click", async () => {
        loi.hidden = true;
        if (s.congTyThu) {
          const dongY = await hoiXacNhan({
            tieuDe: "Tắt «Khách của đối tác trả cho Công ty»?",
            hauQua: "Đơn do tài khoản Đối tác lập từ lúc này chỉ do chính đối tác đó ghi khoản thu: Công ty, nhân viên, hướng dẫn viên không thu tiền khách của các đơn đó, và đơn không có mã QR vào tài khoản công ty. Đơn đã lập giữ nguyên.",
            nhanNguyHiem: "Tắt",
            opener: n,
          });
          if (!dongY) return;
        }
        n.disabled = true;
        try {
          ve(await api<Api.KenhThuDoiTacDto>("/api/kenh-thu-doi-tac", { method: "POST", body: { congTyThu: !s.congTyThu } }));
          hienBaoNgan(s.congTyThu ? "Đã tắt «Khách của đối tác trả cho Công ty»." : "Đã bật «Khách của đối tác trả cho Công ty».");
        } catch (err) {
          n.disabled = false;
          loi.textContent = lyDoLoi(err);
          loi.hidden = false;
        }
      });
      nut = n;
    }
    const lichSu = s.lichSu.slice(0, 5);
    replaceChildren(
      the,
      h("h2", { id: "kenh-thu-tieu-de" }, "Khách của đối tác trả cho Công ty"),
      h("p", { id: "kenh-thu-trang-thai" }, h("strong", null, s.congTyThu ? "Bật" : "Tắt"), s.tuLuc ? ` · từ ${dateTime(s.tuLuc)}` : " · mặc định"),
      h(
        "p",
        { class: "muted" },
        "Bật: khách của đơn do tài khoản Đối tác lập trả được cho Công ty (chuyển khoản, mã QR, nhân viên hoặc hướng dẫn viên thu). ",
        "Tắt: đơn Đối tác lập từ lúc tắt chỉ do chính đối tác đó ghi khoản thu, không có mã QR công ty; đối tác nộp tiền về công ty như hôm nay. Mỗi đơn giữ cách thu của lúc lập, đổi công tắc không đổi đơn đã lập.",
      ),
      lichSu.length > 0 && h("ul", { class: "muted", "data-khoi": "kenh-thu-lich-su" }, ...lichSu.map((d) => h("li", null, `${d.congTyThu ? "Bật" : "Tắt"} · ${dateTime(d.tuLuc)} · ${d.nguoiDoi}`))),
      loi,
      nut && h("div", { class: "handler-actions" }, nut),
    );
  };
  ve(s);
  return the;
}
