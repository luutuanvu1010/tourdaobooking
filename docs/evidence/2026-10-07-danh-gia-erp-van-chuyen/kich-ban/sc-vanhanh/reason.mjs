import { openDb } from "../../../../../tests/audit/harness.mjs";
const db = openDb();
console.log(JSON.stringify(db.prepare("SELECT code, reason_group, label FROM vc_reason ORDER BY reason_group").all()));
