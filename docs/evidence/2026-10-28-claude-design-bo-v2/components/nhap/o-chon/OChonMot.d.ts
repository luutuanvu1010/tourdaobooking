/** Ô chọn một — 2–5 lựa chọn loại trừ nhau, thấy hết cùng lúc. Bọc nhóm bằng fieldset + legend. */
export interface OChonMotProps {
  nhan: string;
  moTa?: string;
  /** Tên nhóm — giống nhau trong một nhóm. */
  ten: string;
  giaTri: string;
  chon?: boolean;
  macDinh?: boolean;
  onDoi?: (giaTri: string) => void;
  tat?: boolean;
  lyDoTat?: string;
  loi?: boolean | string;
  className?: string;
}
export declare function OChonMot(props: OChonMotProps): JSX.Element;
