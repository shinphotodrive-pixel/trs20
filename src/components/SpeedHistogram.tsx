import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { BarChart3, ShieldCheck, AlertTriangle, Users } from 'lucide-react';

interface SpeedHistogramProps {
  recentSpeeds: number[];
  speedLimitThreshold?: number;
  className?: string;
}

interface BinData {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  isOverLimit: boolean;
}

interface CustomHistogramTooltipProps {
  active?: boolean;
  payload?: any[];
  speedLimit: number;
  totalCount: number;
}

const CustomHistogramTooltip: React.FC<CustomHistogramTooltipProps> = ({
  active,
  payload,
  speedLimit,
  totalCount,
}) => {
  if (active && payload && payload.length > 0) {
    const data: BinData = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 text-slate-400 text-[10px] mb-1">
          <span>속도 구간: {data.range}</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
              data.isOverLimit
                ? 'bg-red-950 text-red-300 border border-red-800'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}
          >
            {data.isOverLimit ? '과속 구간' : '안전 구간'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-base font-bold font-digital ${
              data.isOverLimit ? 'text-red-400' : 'text-cyan-400'
            }`}
          >
            {data.count}대
          </span>
          <span className="text-slate-400 text-[11px]">
            ({data.percentage.toFixed(1)}%)
          </span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1 border-t border-slate-800 pt-1">
          기준 제한속도: {speedLimit} km/h (전체 {totalCount}대 표본)
        </div>
      </div>
    );
  }
  return null;
};

export const SpeedHistogram: React.FC<SpeedHistogramProps> = ({
  recentSpeeds,
  speedLimitThreshold = 50,
  className = '',
}) => {
  // Define speed bins
  const { bins, totalCount, modeBin, complianceRate } = useMemo(() => {
    const validSpeeds =
      recentSpeeds.length > 0 ? recentSpeeds : [35, 42, 48, 55, 62, 45, 52];
    const total = validSpeeds.length;

    // Define 6 standard speed ranges
    const rangeDefinitions: Array<{ range: string; min: number; max: number }> = [
      { range: '< 30', min: 0, max: 29.9 },
      { range: '30-49', min: 30, max: 49.9 },
      { range: '50-69', min: 50, max: 69.9 },
      { range: '70-89', min: 70, max: 89.9 },
      { range: '90-109', min: 90, max: 109.9 },
      { range: '110+', min: 110, max: 999 },
    ];

    const binResults: BinData[] = rangeDefinitions.map((def) => {
      const matched = validSpeeds.filter(
        (spd) => spd >= def.min && spd <= def.max
      );
      const count = matched.length;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      // Mark as over-limit if minimum speed of bin >= threshold or threshold falls in this bin
      const isOverLimit = def.min >= speedLimitThreshold;

      return {
        range: `${def.range} km/h`,
        min: def.min,
        max: def.max,
        count,
        percentage,
        isOverLimit,
      };
    });

    // Find mode (highest frequency bin)
    let maxBin = binResults[0];
    binResults.forEach((b) => {
      if (b.count > maxBin.count) {
        maxBin = b;
      }
    });

    // Compliance count
    const compliantCount = validSpeeds.filter(
      (spd) => spd <= speedLimitThreshold
    ).length;
    const compRate = total > 0 ? (compliantCount / total) * 100 : 100;

    return {
      bins: binResults,
      totalCount: total,
      modeBin: maxBin,
      complianceRate: compRate,
    };
  }, [recentSpeeds, speedLimitThreshold]);

  return (
    <div
      className={`bg-slate-950/80 rounded-xl border border-slate-800 p-3.5 space-y-2.5 shadow-inner ${className}`}
    >
      {/* Header and Statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            속도 구간별 통행 빈도 히스토그램 (Speed Distribution)
          </h4>
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center gap-2.5 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-500" />
            <span>표본: <strong className="text-white">{totalCount}대</strong></span>
          </span>
          <span className="text-slate-700">·</span>
          <span>
            최빈 구간: <strong className="text-cyan-300">{modeBin.range}</strong> ({modeBin.count}대)
          </span>
          <span className="text-slate-700">·</span>
          <span
            className={`flex items-center gap-1 font-semibold ${
              complianceRate < 70 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {complianceRate < 70 ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <ShieldCheck className="w-3 h-3" />
            )}
            <span>준수율 {complianceRate.toFixed(1)}%</span>
          </span>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="w-full h-28 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={bins}
            margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
          >
            <XAxis
              dataKey="range"
              stroke="#475569"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              dy={3}
            />
            <YAxis
              allowDecimals={false}
              stroke="#475569"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <Tooltip
              content={
                <CustomHistogramTooltip
                  speedLimit={speedLimitThreshold}
                  totalCount={totalCount}
                />
              }
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={true}>
              {bins.map((entry, index) => {
                // Determine bar color based on speed threshold
                let barColor = '#06b6d4'; // cyan default
                if (entry.min < 30) {
                  barColor = '#10b981'; // emerald for low speed
                } else if (entry.isOverLimit) {
                  barColor = entry.min >= speedLimitThreshold + 20 ? '#ef4444' : '#f59e0b'; // red or amber
                } else {
                  barColor = '#38bdf8'; // sky blue
                }

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={barColor}
                    fillOpacity={0.85}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info & Legend */}
      <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2 rounded-xs bg-emerald-500"></span>
            <span>안전 서행</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2 rounded-xs bg-sky-400"></span>
            <span>규정 주행</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2 rounded-xs bg-red-500"></span>
            <span>과속 구간 ({speedLimitThreshold}km/h 초과)</span>
          </span>
        </div>
        <span>실시간 수신 데이터 누적 집계</span>
      </div>
    </div>
  );
};
