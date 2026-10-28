import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  YAxis,
  XAxis,
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface SpeedSparklineProps {
  recentSpeeds: number[];
  speedLimitThreshold?: number;
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  speedLimit: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  speedLimit,
}) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    const speed = data.speed;
    const isOver = speed > speedLimit;
    const diff = Math.abs(speed - speedLimit);

    return (
      <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono backdrop-blur-md">
        <div className="text-slate-400 text-[10px] mb-1 flex items-center justify-between gap-3">
          <span>차량 기록 #{data.index}</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
              isOver ? 'bg-red-950 text-red-300' : 'bg-emerald-950 text-emerald-300'
            }`}
          >
            {isOver ? `+${diff.toFixed(1)} km/h 과속` : '안전 준수'}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-base font-bold font-digital ${
              isOver ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {speed.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-400">km/h</span>
          <span className="text-slate-500 text-[10px]">
            ({(speed / 3.6).toFixed(1)} m/s)
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const SpeedSparkline: React.FC<SpeedSparklineProps> = ({
  recentSpeeds,
  speedLimitThreshold = 50,
  className = '',
}) => {
  // Ensure we have at least 2 points for a continuous sparkline
  const data = useMemo(() => {
    const source =
      recentSpeeds.length > 0 ? recentSpeeds : [40, 42, 45, 48, 52, 45];

    return source.map((speed, i) => ({
      index: i + 1,
      name: `#${i + 1}`,
      speed: Number(speed.toFixed(1)),
      speedLimit: speedLimitThreshold,
      isOver: speed > speedLimitThreshold,
    }));
  }, [recentSpeeds, speedLimitThreshold]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 0, avg: 0, overCount: 0 };
    const values = data.map((d) => d.speed);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    const overCount = data.filter((d) => d.isOver).length;
    return {
      min: min.toFixed(1),
      max: max.toFixed(1),
      avg: avg.toFixed(1),
      overCount,
    };
  }, [data]);

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    const minVal = Math.min(...data.map((d) => d.speed), speedLimitThreshold);
    const maxVal = Math.max(...data.map((d) => d.speed), speedLimitThreshold);
    return [Math.max(0, Math.floor(minVal - 10)), Math.ceil(maxVal + 10)];
  }, [data, speedLimitThreshold]);

  return (
    <div
      className={`bg-slate-950/80 rounded-xl border border-slate-800 p-3.5 space-y-2.5 shadow-inner ${className}`}
    >
      {/* Header with Title and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            감지 속도 추이 스파크라인 (Speed Trend Sparkline)
          </h4>
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center gap-2.5 text-[10px] font-mono text-slate-400">
          <span>
            평균: <strong className="text-cyan-300">{stats.avg}</strong> km/h
          </span>
          <span className="text-slate-700">·</span>
          <span>
            최고: <strong className="text-white">{stats.max}</strong> km/h
          </span>
          <span className="text-slate-700">·</span>
          <span
            className={`flex items-center gap-1 ${
              stats.overCount > 0 ? 'text-red-400 font-semibold' : 'text-emerald-400'
            }`}
          >
            {stats.overCount > 0 ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <CheckCircle className="w-3 h-3" />
            )}
            <span>과속 {stats.overCount}건</span>
          </span>
        </div>
      </div>

      {/* Sparkline Chart Container */}
      <div className="w-full h-24 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
          >
            <defs>
              {/* Dynamic Gradient for Sparkline Area */}
              <linearGradient id="speedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="name"
              stroke="#475569"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              dy={3}
            />
            <YAxis
              domain={yDomain}
              stroke="#475569"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              width={35}
            />

            {/* Threshold Reference Line */}
            <ReferenceLine
              y={speedLimitThreshold}
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: `제한 ${speedLimitThreshold}`,
                position: 'insideTopRight',
                fill: '#ef4444',
                fontSize: 9,
                fontWeight: 600,
              }}
            />

            <Tooltip
              content={<CustomTooltip speedLimit={speedLimitThreshold} />}
            />

            <Area
              type="monotone"
              dataKey="speed"
              stroke="#38bdf8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#speedAreaGrad)"
              activeDot={{
                r: 4,
                stroke: '#ffffff',
                strokeWidth: 2,
                fill: '#0284c7',
              }}
              dot={{
                r: 2,
                fill: '#38bdf8',
                strokeWidth: 0,
              }}
              isAnimationActive={true}
              animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
        <span>최근 {data.length}건 차량 감지 데이터</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-0.5 bg-red-500"></span>
          <span>제한속도 기준선 ({speedLimitThreshold} km/h)</span>
        </span>
      </div>
    </div>
  );
};
