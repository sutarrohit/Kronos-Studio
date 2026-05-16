import { forwardRef } from "react";
import PriceChart from "@/components/charts/PriceChart";
import TradingViewCandlestickChart from "@/components/charts/TradingViewCandlestickChart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useChartUIStore } from "@/stores/chartUIStore";
import { type PricePredictionResponse } from "@/schemas/predictionSchema";

type PredictionChartProps = {
  data: PricePredictionResponse;
};

const PredictionChart = forwardRef<HTMLDivElement, PredictionChartProps>(({ data }, ref) => {
  const showVolume = useChartUIStore((state) => state.showVolume);
  const chartType = useChartUIStore((state) => state.chartType);
  const setShowVolume = useChartUIStore((state) => state.setShowVolume);
  const setChartType = useChartUIStore((state) => state.setChartType);

  return (
    <div ref={ref} className='flex h-[540px] flex-col'>
      <div className='flex items-center justify-between gap-3 pb-2'>
        <Tabs
          value={chartType}
          onValueChange={(value) => setChartType(value === "candlestick" ? "candlestick" : "line")}
        >
          <TabsList>
            <TabsTrigger value='candlestick' className='px-3 cursor-pointer'>
              Candles
            </TabsTrigger>
            <TabsTrigger value='line' className='px-3 cursor-pointer'>
              Line
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className='flex items-center gap-2'>
          <Switch checked={showVolume} onCheckedChange={setShowVolume} className='cursor-pointer' />
          <span className='text-sm text-muted-foreground'>Volume</span>
        </div>
      </div>
      <div className='min-h-0 flex-1'>
        {chartType === "candlestick" ? (
          <TradingViewCandlestickChart data={data} showVolume={showVolume} />
        ) : (
          <PriceChart data={data} showVolume={showVolume} />
        )}
      </div>
    </div>
  );
});

PredictionChart.displayName = "PredictionChart";

export default PredictionChart;
