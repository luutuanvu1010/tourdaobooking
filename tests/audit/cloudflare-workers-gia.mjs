// Mô-đun GIẢ thay cho "cloudflare:workers" khi khung thử (harness.mjs) gói src/index.ts bằng esbuild dưới Node. src/index.ts export lớp Durable Object
// `BangTin` (src/modules/bangtin/tram.ts, ADR-0022) mà lớp đó kế thừa `DurableObject` của runtime Worker — Node không có mô-đun này. Khung thử không có
// binding BANG_TIN nên trạm không bao giờ được dựng: chỉ cần một lớp cha rỗng để bản gói nạp được. KHÔNG mô phỏng hành vi trạm ở đây.
export class DurableObject {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }
}
