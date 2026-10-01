// TRẠM Bảng tin — lớp Durable Object duy nhất của ADR-0022, MỘT thực thể tên "cong-ty". Dùng WebSocket Hibernation API: trạm được ngủ khi không có
// việc mà kết nối vẫn giữ; chuỗi "ping" được trả "pong" tự động, không đánh thức trạm (BT-3). Chỉ lưu MỘT báo thức và HÀNG ĐỢI GÕ CỬA (Web Push,
// ADR-0036): không bảng, không lưu tin — tin đi rồi là thôi. Báo thức dùng cho HAI việc: đóng kết nối quá hạn và gửi từng lô gõ cửa (≤ 40 địa chỉ
// mỗi lượt, khi một tin có > 40 máy nhận). Hàng đợi chỉ giữ địa chỉ nhận (không SĐT, không nội dung); lô gửi xong là xoá.
//
// Mọi QUYẾT ĐỊNH (đóng/gửi/bỏ qua, mốc báo thức kế) nằm ở `keHoachTram` (rules.ts, có test); tệp này chỉ là vỏ gọi API của Cloudflare.
// CHỈ src/index.ts được import tệp này (architecture.test.ts): nó cần môi trường Worker, không nạp được dưới node --test.
// Lối vào DUY NHẤT là binding BANG_TIN: không route nào chuyển tiếp đường dẫn tuỳ ý tới trạm; `fetch` chỉ nhận yêu cầu bắt tay do route
// GET /api/bang-tin dựng MỚI (nhãn đã tính ở máy chủ — BT-2), các RPC `phat`/`dongCua` chỉ do gốc lắp ráp gọi.
import { DurableObject } from "cloudflare:workers";
import type { SuKienDon } from "../../shared/bang-tin";
import { docHanGiay, hetHan, keHoachTram, mocBaoThuc, type KetNoiXet } from "./rules";
import { chiaLo, guiLo, khoaVapid } from "../../shared/web-push";

/** Hàng đợi gõ cửa (ADR-0036): mỗi khoá `day:lo:…` là MỘT lô ≤ 40 địa chỉ (giá trị nhỏ). Khoá sắp theo thời điểm xếp hàng → lô cũ gửi trước. */
const HANG = "day:lo:";
/** Địa chỉ nhận 410 ở lượt của trạm — trả về cho `thongbao` ở lần xếp hàng kế để đánh dấu hết hiệu lực (trạm không đụng D1: KHONG_DB). */
const HET = "day:het";
const CO_LO = 40;

/** `readyState` OPEN (chuẩn WHATWG). `getWebSockets()` có thể trả cả kết nối đang đóng — chỉ gửi/đóng kết nối còn mở. */
const DANG_MO = 1;
/** Mã đóng: quá hạn sống (KN-1) / tài khoản vừa đổi hoặc bật bảo trì (KN-2). Trình duyệt tự nối lại; kết nối lại của người bị chặn nhận 401/503. */
const MA_QUA_HAN = 4001;
const MA_CAP_NHAT = 4003;
/** Giới hạn của `acceptWebSocket` (tài liệu Cloudflare `api/state`): tối đa 10 nhãn, mỗi nhãn tối đa 256 ký tự. Hôm nay mỗi kết nối có ≤ 4 nhãn (thêm `phien:<id>` — ADR-0075). */
const TOI_DA_NHAN = 10;
const DAI_TOI_DA_NHAN = 256;

/** Gắn kèm mỗi kết nối (sống qua lúc trạm ngủ): ai, và hết hạn lúc nào (mili-giây epoch). Không SĐT, không tên. */
interface GanKem {
  staffId: string;
  hetHan: number;
}

/** Nhãn do route bắt tay gửi sang (JSON mảng chuỗi). Sai dạng → null (trạm từ chối, không đoán). */
function docNhan(raw: string | null): string[] | null {
  if (raw === null) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(v) || v.length === 0 || v.length > TOI_DA_NHAN) return null;
  return v.every((x) => typeof x === "string" && x.length > 0 && x.length <= DAI_TOI_DA_NHAN) ? (v as string[]) : null;
}

/** Gửi một tin; kết nối vừa đóng giữa chừng thì bỏ qua — một kết nối hỏng không được chặn tin tới các kết nối còn lại. */
function gui(ws: WebSocket, tin: string): void {
  if (ws.readyState !== DANG_MO) return;
  try {
    ws.send(tin);
  } catch {
    // kết nối vừa đóng — bỏ qua
  }
}

function dong(ws: WebSocket, ma: number, lyDo: string): void {
  if (ws.readyState !== DANG_MO) return;
  try {
    ws.close(ma, lyDo);
  } catch {
    // đã đóng — bỏ qua
  }
}

export class BangTin extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // BT-3: trả "pong" cho "ping" mà không đánh thức trạm (ví dụ chính thức của Cloudflare đặt ở constructor).
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  /** Nhận một kết nối mới: gắn nhãn, ghi hạn sống, đặt báo thức nếu chưa có hoặc báo thức hiện có muộn hơn hạn của kết nối này. */
  async fetch(request: Request): Promise<Response> {
    const nhan = docNhan(request.headers.get("x-bang-tin-nhan"));
    const staffId = request.headers.get("x-bang-tin-nguoi");
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket" || nhan === null || !staffId) return new Response(null, { status: 400 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server, nhan);
    const ganKem: GanKem = { staffId, hetHan: hetHan(Date.now(), docHanGiay(this.env)) };
    server.serializeAttachment(ganKem);
    const baoThuc = await this.ctx.storage.getAlarm();
    if (baoThuc === null || baoThuc > ganKem.hetHan) await this.ctx.storage.setAlarm(ganKem.hetHan);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** RPC (gốc lắp ráp): đóng kết nối quá hạn (4001) rồi gửi `suKien` tới kết nối còn hạn có ít nhất một nhãn trong `nhan` — mỗi kết nối nhiều nhất một lần. */
  async phat(suKien: SuKienDon, nhan: string[]): Promise<void> {
    const ds = this.ctx.getWebSockets();
    const keHoach = keHoachTram(ds.map((ws) => this.xet(ws)), nhan, Date.now());
    for (const i of keHoach.dong) dong(ds[i]!, MA_QUA_HAN, "het-han");
    const tin = JSON.stringify(suKien);
    for (const i of keHoach.gui) gui(ds[i]!, tin);
  }

  /**
   * RPC (gốc lắp ráp): đóng (4003) mọi kết nối của một tài khoản, mọi kết nối (`"tat-ca"`), hoặc kết nối của ĐÚNG các phiên bị thay (`{ sessionIds }`,
   * nhãn `phien:<id>` — ADR-0075 điều 6a; lý do `dang-nhap-may-khac`). Nhánh phiên xét TRƯỚC nhánh tài khoản: không bao giờ đóng kết nối của máy mới.
   */
  async dongCua(muc: { staffId: string } | { sessionIds: string[] } | "tat-ca"): Promise<void> {
    let ds: WebSocket[] = [];
    let lyDo = "cap-nhat-tai-khoan";
    if (muc === "tat-ca") ds = this.ctx.getWebSockets();
    else if (typeof muc === "object" && muc !== null && "sessionIds" in muc && Array.isArray(muc.sessionIds)) {
      ds = muc.sessionIds.filter((id) => typeof id === "string" && id.length > 0).flatMap((id) => this.ctx.getWebSockets(`phien:${id}`));
      lyDo = "dang-nhap-may-khac";
    } else if (typeof muc === "object" && muc !== null && "staffId" in muc && typeof muc.staffId === "string") ds = this.ctx.getWebSockets(`nguoi:${muc.staffId}`);
    for (const ws of ds) dong(ws, MA_CAP_NHAT, lyDo);
  }

  /**
   * RPC (gốc lắp ráp, Web Push ADR-0036): xếp `ds` vào hàng đợi theo lô ≤ 40 rồi gọi báo thức NGAY (nếu chưa có báo thức sớm hơn). Trả các địa chỉ
   * đã nhận 410 ở các lượt trước (rồi xoá khỏi trạm) để người gọi đánh dấu hết hiệu lực trong D1.
   */
  async xepHangDay(ds: string[]): Promise<string[]> {
    const t = `${Date.now().toString(36).padStart(10, "0")}-${crypto.randomUUID().slice(0, 8)}`; // hai lần xếp cùng mili-giây không đè lô của nhau
    const lo: Record<string, string[]> = {};
    chiaLo(ds, CO_LO).forEach((x, i) => { lo[`${HANG}${t}-${String(i).padStart(4, "0")}`] = x; });
    if (Object.keys(lo).length) await this.ctx.storage.put(lo); // put(object) ≤ 128 khoá/lần: 1.000 máy = 25 khoá
    const bt = await this.ctx.storage.getAlarm();
    if (bt === null || bt > Date.now()) await this.ctx.storage.setAlarm(Date.now());
    const het = (await this.ctx.storage.get<string[]>(HET)) ?? [];
    if (het.length) await this.ctx.storage.delete(HET);
    return het;
  }

  /**
   * Báo thức: đóng kết nối quá hạn; gửi MỘT lô gõ cửa (còn lô thì hẹn lượt kế sau 1 giây); đặt báo thức kế sớm nhất trong hai việc. Lỗi của một kết
   * nối không làm hỏng lượt này (mỗi kết nối tự bắt lỗi); lỗi gửi lô chỉ ghi log — alarm ném là bị runtime gọi lại (dễ gửi lặp).
   */
  async alarm(): Promise<void> {
    const ds = this.ctx.getWebSockets();
    const keHoach = keHoachTram(ds.map((ws) => this.xet(ws)), null, Date.now());
    for (const i of keHoach.dong) dong(ds[i]!, MA_QUA_HAN, "het-han");
    try {
      await this.guiMotLo();
    } catch (e) {
      console.warn(JSON.stringify({ level: "warn", event: "day_loi", viec: "lo", name: e instanceof Error ? e.name : "unknown" }));
    }
    // Xét hàng đợi SAU khi gửi (không dựa vào kết quả đọc trước lúc gửi): trong lúc chờ mạng, `xepHangDay` có thể vừa thêm lô và đặt báo thức — mốc
    // đặt dưới đây không được làm lô đó chờ tới hạn kết nối. Giữa hai lệnh lưu trữ dưới đây không sự kiện nào chen vào (cổng vào của Durable Object).
    const conLo = (await this.ctx.storage.list({ prefix: HANG, limit: 1 })).size > 0;
    const ke = mocBaoThuc(keHoach.baoThucKe, conLo, Date.now()); // quyết định ở rules.ts (có test)
    if (ke !== null) await this.ctx.storage.setAlarm(ke); // đặt cả khi không còn kết nối nào
  }

  /** Gửi MỘT lô (lô cũ nhất). Xoá lô TRƯỚC khi gửi: hỏng giữa chừng thì lỡ lô đó (cú gõ cửa được phép lỡ), không bao giờ gửi lặp vô hạn. */
  private async guiMotLo(): Promise<void> {
    const dau = [...(await this.ctx.storage.list<string[]>({ prefix: HANG, limit: 1 }))][0];
    if (!dau) return;
    await this.ctx.storage.delete(dau[0]);
    const khoa = khoaVapid(this.env); // thiếu khoá → bỏ lô, không gửi
    if (khoa) {
      const { hetHieuLuc } = await guiLo(dau[1], khoa, Date.now());
      if (hetHieuLuc.length) await this.ctx.storage.put(HET, [...((await this.ctx.storage.get<string[]>(HET)) ?? []), ...hetHieuLuc].slice(-500));
    }
  }

  /** BT-3: bỏ qua MỌI tin trình duyệt gửi lên ("ping" đã được trả tự động, không tới đây). */
  webSocketMessage(): void {}

  /** Không làm gì: runtime tự trả khung Close (cờ `web_socket_auto_reply_to_close`, mặc định từ ngày tương thích 2026-04-07). */
  webSocketClose(): void {}

  webSocketError(): void {}

  /** Trạng thái một kết nối cho `keHoachTram`. Mất gắn kèm/nhãn (không lẽ ra xảy ra) → hạn 0 = coi như quá hạn, đóng cho an toàn; trình duyệt nối lại. */
  private xet(ws: WebSocket): KetNoiXet {
    let nhan: string[] = [];
    let han = 0;
    try {
      nhan = this.ctx.getTags(ws);
    } catch {
      // không phải kết nối của trạm — không nhãn
    }
    try {
      const g = ws.deserializeAttachment() as Partial<GanKem> | null;
      if (g !== null && typeof g.hetHan === "number") han = g.hetHan;
    } catch {
      // mất gắn kèm — hạn 0
    }
    return { nhan, hetHan: han, mo: ws.readyState === DANG_MO };
  }
}
