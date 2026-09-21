// SQL của bảng module company sở hữu (company_profile — singleton, id = 'default'). Mọi câu đi qua defineSql (ADR-0002 điều 8(b)) và import bằng
// đuôi .ts để bài kiểm kiến trúc nạp được tệp này. Câu SQL TĨNH; liệt kê cột tường minh (không `SELECT *`) để cột nội bộ
// (zalo_number, logo_url, updated_by) không thể lọt ra ngoài chỉ vì bảng thêm cột.
import { defineSql } from "../../shared/sql-registry.ts";

export interface CompanyRow {
  company_name: string;
  tax_code: string;
  address: string;
  hotline: string;
  email: string | null;
}

const FIND = defineSql("company", "find", "SELECT company_name, tax_code, address, hotline, email FROM company_profile WHERE id = 'default'");

/** Hồ sơ công ty (dòng singleton), hoặc null nếu chưa có dòng. */
export function findCompany(db: D1Database): Promise<CompanyRow | null> {
  return db.prepare(FIND).first<CompanyRow>();
}
