"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  PriceScaleMode,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type MouseEventParams,
  type SeriesMarker,
  type UTCTimestamp
} from "lightweight-charts";
import { Crosshair, Grid2X2, LocateFixed, Maximize2, Minimize2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type PricePredictionResponse } from "@/schemas/predictionSchema";

type TradingViewCandlestickChartProps = {
  data: PricePredictionResponse | null;
  showVolume?: boolean;
};

type ScaleMode = "price" | "log" | "percent";

type OhlcReadout = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  type: "History" | "Prediction";
};

const toChartTime = (value: string): UTCTimestamp => Math.floor(new Date(value).getTime() / 1000) as UTCTimestamp;

const TradingViewCandlestickChart = ({ data, showVolume = false }: TradingViewCandlestickChartProps) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [crosshairMode, setCrosshairMode] = useState<"normal" | "magnet">("magnet");
  const [scaleMode, setScaleMode] = useState<ScaleMode>("price");
  const [showGrid, setShowGrid] = useState(true);
  const [readout, setReadout] = useState<OhlcReadout | null>(null);

  const chartData = useMemo(() => {
    if (!data) {
      return null;
    }

    const historyCandles: CandlestickData[] = data.history.map((item) => ({
      time: toChartTime(item.timestamps),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    }));

    const predictionCandles: CandlestickData[] = data.prediction.map((item) => ({
      time: toChartTime(item.timestamps),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    }));

    const volumeBars: HistogramData[] = [...data.history, ...data.prediction].map((item) => ({
      time: toChartTime(item.timestamps),
      value: item.volume,
      color: item.close >= item.open ? "rgba(16, 185, 129, 0.28)" : "rgba(239, 68, 68, 0.28)"
    }));

    const candlesByTime = new Map<number, OhlcReadout>();
    data.history.forEach((item) => {
      candlesByTime.set(toChartTime(item.timestamps), {
        time: item.timestamps,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        type: "History"
      });
    });
    data.prediction.forEach((item) => {
      candlesByTime.set(toChartTime(item.timestamps), {
        time: item.timestamps,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        type: "Prediction"
      });
    });

    return {
      historyCandles,
      predictionCandles,
      volumeBars,
      candlesByTime,
      defaultReadout: candlesByTime.get(
        toChartTime(data.prediction.at(-1)?.timestamps ?? data.history.at(-1)?.timestamps ?? "")
      )
    };
  }, [data]);

  const fitContent = useCallback(() => {
    chartRef.current?.timeScale().fitContent();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;

    if (isFullscreen) {
      setIsFullscreen(false);
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen().catch(() => undefined);
      }
      return;
    }

    setIsFullscreen(true);
    await shell.requestFullscreen?.().catch(() => undefined);
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (shellRef.current && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !chartData) {
      return;
    }

    const { width, height } = container.getBoundingClientRect();
    const chart = createChart(container, {
      width: Math.max(0, Math.floor(width)),
      height: Math.max(0, Math.floor(height)),
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.72)",
        attributionLogo: true
      },
      grid: {
        vertLines: { color: showGrid ? "rgba(255, 255, 255, 0.06)" : "transparent" },
        horzLines: { color: showGrid ? "rgba(255, 255, 255, 0.08)" : "transparent" }
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.12)",
        mode:
          scaleMode === "log"
            ? PriceScaleMode.Logarithmic
            : scaleMode === "percent"
              ? PriceScaleMode.Percentage
              : PriceScaleMode.Normal,
        scaleMargins: {
          top: 0.08,
          bottom: showVolume ? 0.28 : 0.08
        }
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.12)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8
      },
      crosshair: {
        mode: crosshairMode === "magnet" ? CrosshairMode.MagnetOHLC : CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 255, 255, 0.25)",
          style: LineStyle.Dashed,
          labelBackgroundColor: "#171412"
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.25)",
          style: LineStyle.Dashed,
          labelBackgroundColor: "#171412"
        }
      },
      localization: {
        priceFormatter: (price: number) => `$${price.toLocaleString()}`
      }
    });

    chartRef.current = chart;
    setReadout(chartData.defaultReadout ?? null);

    const historySeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#6ee7b7",
      wickDownColor: "#fca5a5",
      priceLineColor: "#10b981",
      priceLineStyle: LineStyle.Dotted,
      priceLineVisible: true,
      lastValueVisible: true
    });
    historySeries.setData(chartData.historyCandles);

    const predictionSeries = chart.addSeries(CandlestickSeries, {
      upColor: "rgba(59, 130, 246, 0.82)",
      downColor: "rgba(168, 85, 247, 0.82)",
      borderUpColor: "#60a5fa",
      borderDownColor: "#c084fc",
      wickUpColor: "#93c5fd",
      wickDownColor: "#d8b4fe",
      priceLineColor: "#60a5fa",
      priceLineStyle: LineStyle.Dotted,
      priceLineVisible: true,
      lastValueVisible: true
    });
    predictionSeries.setData(chartData.predictionCandles);

    if (chartData.historyCandles.length > 0) {
      const lastHistory = chartData.historyCandles.at(-1)!;
      historySeries.createPriceLine({
        price: lastHistory.close,
        color: "rgba(16, 185, 129, 0.6)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        lineVisible: true,
        axisLabelVisible: true,
        title: "History"
      });
    }

    if (chartData.predictionCandles.length > 0) {
      const firstPrediction = chartData.predictionCandles[0];
      const lastPrediction = chartData.predictionCandles.at(-1)!;
      predictionSeries.createPriceLine({
        price: lastPrediction.close,
        color: "rgba(96, 165, 250, 0.75)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        lineVisible: true,
        axisLabelVisible: true,
        title: "Forecast"
      });

      const markers: SeriesMarker<UTCTimestamp>[] = [
        {
          time: firstPrediction.time as UTCTimestamp,
          position: "belowBar",
          color: "#60a5fa",
          shape: "arrowUp",
          text: "Prediction"
        }
      ];
      createSeriesMarkers(predictionSeries, markers);
    }

    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        lastValueVisible: false,
        priceLineVisible: false
      });
      volumeSeries.setData(chartData.volumeBars);
      chart.priceScale("volume").applyOptions({
        scaleMargins: {
          top: 0.78,
          bottom: 0
        }
      });
    }

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time) {
        setReadout(chartData.defaultReadout ?? null);
        return;
      }

      const hovered = chartData.candlesByTime.get(Number(param.time));
      setReadout(hovered ?? chartData.defaultReadout ?? null);
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;

      chart.applyOptions({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height)
      });
      chart.timeScale().fitContent();
    });

    resizeObserver.observe(container);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [chartData, crosshairMode, scaleMode, showGrid, showVolume]);

  if (!data) {
    return null;
  }

  return (
    <div
      ref={shellRef}
      className={cn("relative flex size-full flex-col border bg-background", isFullscreen && "fixed inset-0 z-50 p-3")}
    >
      <div className='flex min-h-10 items-center justify-between gap-3 border-b px-2 py-1.5'>
        <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs h-[40px]'>
          <span className='font-medium'>{data.request.symbol ?? "Unknown"}</span>
          <span className='text-muted-foreground'>{data.request.interval}</span>
          {readout && (
            <>
              <span className={readout.type === "Prediction" ? "text-blue-300" : "text-emerald-300"}>
                {readout.type}
              </span>
              <span className='text-muted-foreground'>{new Date(readout.time).toLocaleString()}</span>
              <span>O {readout.open.toLocaleString()}</span>
              <span>H {readout.high.toLocaleString()}</span>
              <span>L {readout.low.toLocaleString()}</span>
              <span>C {readout.close.toLocaleString()}</span>
              <span className='text-muted-foreground'>V {readout.volume.toLocaleString()}</span>
            </>
          )}
        </div>

        <div className='flex shrink-0 items-center gap-1'>
          <Button variant='outline' size='icon-sm' onClick={fitContent} title='Fit chart'>
            <LocateFixed className='size-3.5' />
          </Button>
          <Button
            variant={crosshairMode === "magnet" ? "secondary" : "outline"}
            size='icon-sm'
            onClick={() => setCrosshairMode((mode) => (mode === "magnet" ? "normal" : "magnet"))}
            title='Toggle crosshair magnet'
          >
            <Crosshair className='size-3.5' />
          </Button>
          <Button
            variant={showGrid ? "secondary" : "outline"}
            size='icon-sm'
            onClick={() => setShowGrid((show) => !show)}
            title='Toggle grid'
          >
            <Grid2X2 className='size-3.5' />
          </Button>
          <Button variant='outline' size='sm' onClick={() => setScaleMode("price")} disabled={scaleMode === "price"}>
            Price
          </Button>
          <Button variant='outline' size='sm' onClick={() => setScaleMode("log")} disabled={scaleMode === "log"}>
            Log
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setScaleMode("percent")}
            disabled={scaleMode === "percent"}
          >
            %
          </Button>
          <Button
            variant='outline'
            size='icon-sm'
            onClick={() => {
              setCrosshairMode("magnet");
              setScaleMode("price");
              setShowGrid(true);
              requestAnimationFrame(fitContent);
            }}
            title='Reset chart settings'
          >
            <RefreshCcw className='size-3.5' />
          </Button>
          <Button variant='outline' size='icon-sm' onClick={toggleFullscreen} title='Fullscreen'>
            {isFullscreen ? <Minimize2 className='size-3.5' /> : <Maximize2 className='size-3.5' />}
          </Button>
        </div>
      </div>

      <div className='relative min-h-0 flex-1'>
        <div ref={containerRef} className='size-full' />
        <div className='pointer-events-none absolute left-3 top-3 flex items-center gap-3 text-xs'>
          <span className='inline-flex items-center gap-1.5 text-muted-foreground'>
            <span className='size-2 rounded-full bg-emerald-500' />
            History
          </span>
          <span className='inline-flex items-center gap-1.5 text-muted-foreground'>
            <span className='size-2 rounded-full bg-blue-500' />
            Prediction
          </span>
        </div>
      </div>
    </div>
  );
};

export default TradingViewCandlestickChart;
