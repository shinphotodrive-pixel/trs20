import React, { useMemo, useState } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Zap, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle,
  Car,
  Clock,
  Download,
  Check
} from 'lucide-react';

interface SessionSummaryStatsProps {
  recentSpeeds: number[];
  speedLimitThreshold: number;
  sessionStartTime: Date;
  onResetSessionStats?: () => void;
  className?: string;
}

export const SessionSummaryStats: React.FC<SessionSummaryStatsProps> = ({
  recentSpeeds,
  speedLimitThreshold,
  sessionStartTime,
  onResetSessionStats,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const count = recentSpeeds.length;
    if (count === 0) {
      return {
        count: 0,
        avg: 0,
        max: 0,
        min: 0,
        overCount: 0,
        overRate: 0,
        compliantCount: 0,
        compliantRate: 100,
      };
    }

    const sum = recentSpeeds.reduce((acc, v) => acc + v, 0);
    const avg = Number((sum / count).toFixed(1));
    const max = Number(Math.max(...recentSpeeds).toFixed(1));
    const min = Number(Math.min(...recentSpeeds).toFixed(1));
    const overCount = recentSpeeds.filter((s) => s > speedLimitThreshold).length;
    const overRate = Number(((overCount / count) * 100).toFixed(1));
    const compliantCount = count - overCount;
    const compliantRate = Number(((compliantCount / count) * 100).toFixed(1));

    return {
      count,
      avg,
      max,
      min,
      overCount,
      overRate,
      compliantCount,
      compliantRate,
    };
  }, [recentSpeeds, speedLimitThreshold]);

  const formattedStartTime = useMemo(() => {
    return sessionStartTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [sessionStartTime]);

  const handleExportCSV = () => {
    if (recentSpeeds.length === 0) return;

    const now = new Date();
    const nowStr = now.toLocaleString('ko-KR');
    const sessionStartStr = sessionStartTime.toLocaleString('ko-KR');

    const lines: string[] = [];
    lines.push('# TSR20 Speed Sign Radar - 세션 속도 통계 및 히스토리 데이터');
    lines.push(`세션 시작 일시,${sessionStartStr}`);
    lines.push(`데이터 추출 일시,${nowStr}`);
    lines.push(`제한 속도 기준,${speedLimitThreshold} km/h`);
    lines.push(`총 감지 차량 수,${stats.count} 대`);
    lines.push(`평균 주행 속도,${stats.avg} km/h (${(stats.avg / 3.6).toFixed(1)} m/s)`);
    lines.push(`최고 기록 속도,${stats.max} km/h`);
    lines.push(`최저 기록 속도,${stats.min} km/h`);
    lines.push(`과속 적발 건수,${stats.overCount} 대 (${stats.overRate}%)`);
    lines.push(`규정 준수 차량 수,${stats.compliantCount} 대 (${stats.compliantRate}%)`);
    lines.push('');
    lines.push('순번(#),감지속도(km/h),환산속도(m/s),제한속도(km/h),초과편차(km/h),판정결과');

    recentSpeeds.forEach((speed, idx) => {
      const isOver = speed > speedLimitThreshold;
      const delta = isOver 
        ? `+${(speed - speedLimitThreshold).toFixed(1)}` 
        : `-${(speedLimitThreshold - speed).toFixed(1)}`;
      const status = isOver ? '과속 (VIOLATION)' : '안전 준수 (COMPLIANT)';
      lines.push(`${idx + 1},${speed.toFixed(1)},${(speed / 3.6).toFixed(1)},${speedLimitThreshold},${delta},${status}`);
    });

    // Add UTF-8 BOM so Excel opens Korean text without character corruption
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tsr20_session_speeds_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`bg-slate-950/80 rounded-xl border border-slate-800 p-3.5 space-y-3 shadow-inner ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            세션 통계 요약 (Traffic Session Summary)
          </h4>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
            <Clock className="w-3 h-3" />
            <span>시작: {formattedStartTime}</span>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={recentSpeeds.length === 0}
            className="p-1 px-2.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            title="현재 세션의 속도 히스토리와 통계 데이터를 CSV 파일로 다운로드합니다"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Download className="w-3 h-3 text-cyan-400" />
            )}
            <span>CSV 내보내기</span>
          </button>

          {onResetSessionStats && (
            <button
              onClick={onResetSessionStats}
              className="p-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[10px] flex items-center gap-1 transition-colors"
              title="세션 통계 초기화"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>초기화</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (4 Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Traffic Count */}
        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>총 통행량 (Total)</span>
            <Car className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-digital text-white">
              {stats.count}
            </span>
            <span className="text-[10px] font-mono text-slate-400">대</span>
          </div>
          <span className="text-[9px] text-slate-500 mt-0.5 truncate">
            누적 감지 차량 수
          </span>
        </div>

        {/* Average Speed */}
        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>평균 속도 (Avg)</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-digital text-cyan-300">
              {stats.avg}
            </span>
            <span className="text-[10px] font-mono text-slate-400">km/h</span>
          </div>
          <span className="text-[9px] text-slate-500 mt-0.5 truncate">
            {(stats.avg / 3.6).toFixed(1)} m/s 환산
          </span>
        </div>

        {/* Maximum Speed */}
        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>최고 속도 (Max)</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl font-bold font-digital ${
                stats.max > speedLimitThreshold ? 'text-red-400' : 'text-amber-300'
              }`}
            >
              {stats.max}
            </span>
            <span className="text-[10px] font-mono text-slate-400">km/h</span>
          </div>
          <span className="text-[9px] text-slate-500 mt-0.5 truncate">
            최저: {stats.min} km/h
          </span>
        </div>

        {/* Violation & Compliance Rate */}
        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span>과속 적발 (Violations)</span>
            {stats.overCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl font-bold font-digital ${
                stats.overCount > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {stats.overCount}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              대 ({stats.overRate}%)
            </span>
          </div>
          <span className="text-[9px] text-slate-500 mt-0.5 truncate">
            준수율: {stats.compliantRate}%
          </span>
        </div>
      </div>
    </div>
  );
};
