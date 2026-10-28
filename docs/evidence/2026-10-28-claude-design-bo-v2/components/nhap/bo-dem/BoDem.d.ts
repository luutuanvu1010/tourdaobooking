/** Bộ đếm − / + — số nhỏ (0–20) bằng ngón cái: nút 44, số 20/600, nhãn trên. */
export interface BoDemProps {
  nhan: string;
  giaTri: number;
  min?: number;
  max?: number;
  onDoi?: (giaTri: number) => void;
  /** Dòng dưới, vd "Từ 12 tuổi" hoặc giới hạn. */
  huongDan?: string;
  tat?: boolean;
  lyDoTat?: string;
  className?: string;
}
export declare function BoDem(props: BoDemProps): JSX.Element;
