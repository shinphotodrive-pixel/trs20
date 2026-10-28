import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AlertCircle, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
import { LogEntry, ParsedPacketResult } from '../types/protocol';

interface CommunicationErrorChartProps {
  logs?: LogEntry[];
  currentParsed?: ParsedPacketResult;
  className?: string;
}

interface ErrorCategoryData {
  name: string;
  count: number;
  color: string;
  percentage: number;
  description: string;
}

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload as ErrorCategoryData;
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-white">{data.name}</span>
        </div>
        <div className="flex items-baseline gap-2 text-slate-300">
          <span className="text-base font-bold font-digital" style={{ color: data.color }}>
            {data.count}건
          </span>
          <span className="text-[11px] text-slate-400">({data.percentage.toFixed(1)}%)</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1 border-t border-slate-800 pt-1">
          {data.description}
        </div>
      </div>
    );
  }
  return null;
};

export const CommunicationErrorChart: React.FC<CommunicationErrorChartProps> = ({
  logs = [],
  currentParsed,
  className = '',
}) => {
  // Aggregate error statistics from session logs and current parsed packet
  const { chartData, totalPackets, successCount, errorCount, healthRate } = useMemo(() => {
    let normal = 0;
    let headerErrors = 0;
    let lengthErrors = 0;
    let tailErrors = 0;
    let malformedErrors = 0;

    // Analyze existing logs
    if (logs.length > 0) {
      logs.forEach((log) => {
        if (log.status === 'success') {
          normal++;
        } else if (log.status === 'error' || log.status === 'warning') {
          const hex = log.hex.toUpperCase().replace(/\s+/g, '');
          if (!hex.startsWith('AAAA')) {
            headerErrors++;
          } else if (!hex.endsWith('5555')) {
            tailErrors++;
          } else if (hex.length !== 28) {
            lengthErrors++;
          } else {
            malformedErrors++;
          }
        }
      });
    } else {
      // Baseline initial sample when logs are fresh
      normal = 12;
      headerErrors = 1;
      lengthErrors = 1;
      tailErrors = 1;
      malformedErrors = 0;
    }

    // Include current parsed status if present
    if (currentParsed) {
      if (currentParsed.isValid) {
        normal++;
      } else {
        if (!currentParsed.isValidHeader) headerErrors++;
        else if (!currentParsed.isValidTail) tailErrors++;
        else if (!currentParsed.isValidLength) lengthErrors++;
        else malformedErrors++;
      }
    }

    const total = normal + headerErrors + lengthErrors + tailErrors + malformedErrors;
    const errors = headerErrors + lengthErrors + tailErrors + malformedErrors;
    const rate = total > 0 ? (normal / total) * 100 : 100;

    const data: ErrorCategoryData[] = [
      {
        name: '정상 통신 (Valid)',
        count: normal,
        color: '#10b981', // emerald
        percentage: total > 0 ? (normal / total) * 100 : 100,
        description: '14바이트 정상 프레임 (AA..55)',
      },
      {
        name: '헤더 오류 (Header)',
        count: headerErrors,
        color: '#ef4444', // red
        percentage: total > 0 ? (headerErrors / total) * 100 : 0,
        description: '시작 바이트 불일치 (!= 0xAAAA)',
      },
      {
        name: '길이/타임아웃 (Length)',
        count: lengthErrors,
        color: '#f59e0b', // amber
        percentage: total > 0 ? (lengthErrors / total) * 100 : 0,
        description: '프레임 길이 불일치 (!= 14B)',
      },
      {
        name: '꼬리/체크섬 (Tail)',
        count: tailErrors,
        color: '#ec4899', // pink/rose
        percentage: total > 0 ? (tailErrors / total) * 100 : 0,
        description: '종료 바이트 불일치 (!= 0x5555)',
      },
      {
        name: '명령/형식 오류 (Other)',
        count: malformedErrors,
        color: '#8b5cf6', // purple
        percentage: total > 0 ? (malformedErrors / total) * 100 : 0,
        description: '알 수 없거나 손상된 프레임',
      },
    ].filter((item) => item.count > 0); // only show active categories

    return {
      chartData: data,
      totalPackets: total,
      successCount: normal,
      errorCount: errors,
      healthRate: rate,
    };
  }, [logs, currentParsed]);

  return (
    <div
      className={`bg-slate-950/80 rounded-xl border border-slate-800 p-3.5 space-y-3 shadow-inner ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            통신 오류 빈도 도넛 차트 (Communication Error Distribution)
          </h4>
        </div>

        {/* Health status badge */}
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-slate-400">총 검증: <strong className="text-white">{totalPackets}건</strong></span>
          <span className="text-slate-700">·</span>
          <span
            className={`flex items-center gap-1 font-semibold ${
              healthRate >= 90 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {healthRate >= 90 ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-400" />
            )}
            <span>통신 건전도 {healthRate.toFixed(1)}%</span>
          </span>
        </div>
      </div>

      {/* Chart Layout: Donut Chart on Left, Breakdown List on Right */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Donut Chart Container */}
        <div className="sm:col-span-6 h-36 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomPieTooltip />} />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={3}
                dataKey="count"
                isAnimationActive={true}
                animationDuration={450}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Donut Hole Summary Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className={`text-base font-bold font-digital ${
                healthRate >= 90 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {healthRate.toFixed(0)}%
            </span>
            <span className="text-[9px] font-mono text-slate-400">정상율</span>
          </div>
        </div>

        {/* Error Breakdown Metric List */}
        <div className="sm:col-span-6 space-y-1.5">
          {chartData.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-900/80 p-1.5 px-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-300 text-[11px] truncate">{item.name}</span>
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0 font-mono">
                <span className="font-bold text-white text-xs">{item.count}건</span>
                <span className="text-[10px] text-slate-500">
                  ({item.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
        <span>체크섬/꼬리(0x5555) · 헤더(0xAAAA) · 14바이트 프레임 검증 기반</span>
        <span className="text-slate-400 font-mono">오류 누적: {errorCount}건</span>
      </div>
    </div>
  );
};
