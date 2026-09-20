// `normalizePhone` đã chuyển sang src/shared/phone.ts (parties cũng dùng); ở đây giữ đường import cũ và phần PIN.
export { normalizePhone } from "../../shared/phone.ts";

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{6}$/.test(pin);
}
