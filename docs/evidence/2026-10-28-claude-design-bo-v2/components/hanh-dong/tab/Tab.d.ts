/** Tab — một kiểu duy nhất: rãnh xám, mục đang chọn nổi trắng chữ biển. Đổi lát nội dung trong cùng trang. */
export interface TabMuc { id: string; nhan: string; dem?: number; }
export interface TabProps {
  /** 2–5 lát cùng loại. */
  muc: TabMuc[];
  /** id lát đang chọn. */
  chon: string;
  onChon?: (id: string) => void;
  /** Nhãn nhóm cho trình đọc màn hình. */
  nhan?: string;
  /** Chia đều hết bề ngang (điện thoại, ≤ 3 mục). */
  rong?: boolean;
  className?: string;
}
export declare function Tab(props: TabProps): JSX.Element;
