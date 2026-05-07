import { create } from "zustand";

export type ChartType = "line" | "candlestick";

type ChartUIStore = {
  showVolume: boolean;
  chartType: ChartType;
  setShowVolume: (show: boolean) => void;
  setChartType: (type: ChartType) => void;
};

export const useChartUIStore = create<ChartUIStore>((set) => ({
  showVolume: true,
  chartType: "candlestick",
  setShowVolume: (show) => set({ showVolume: show }),
  setChartType: (type) => set({ chartType: type })
}));
