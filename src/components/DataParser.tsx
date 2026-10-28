import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSearch, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Gauge, 
  Sliders, 
  Layers, 
  Trash2, 
  Copy, 
  Check,
  AlertOctagon,
  X,
  GripVertical,
  ArrowLeftRight,
  BarChart3,
  TrendingUp,
  Activity,
  Download
} from 'lucide-react';
import { ParsedPacketResult, RadarParameters, LogEntry } from '../types/protocol';
import { parseRadarPacket } from '../utils/protocol';
import { RadarStateVisualization } from './RadarStateVisualization';
import { StatusOverview } from './StatusOverview';
import { SpeedSparkline } from './SpeedSparkline';
import { SpeedHistogram } from './SpeedHistogram';
import { CommunicationErrorChart } from './CommunicationErrorChart';
import { SessionSummaryStats } from './SessionSummaryStats';

interface DataParserProps {
  inputHex: string;
  onChangeInputHex: (hex: string) => void;
  onParsedResult?: (result: ParsedPacketResult) => void;
  speedLimitThreshold?: number;
  activeRadarParams?: RadarParameters;
  recentSpeeds?: number[];
  logs?: LogEntry[];
  sessionStartTime?: Date;
  onResetSessionStats?: () => void;
  isDraggable?: boolean;
  onSwapLayout?: () => void;
}

const SAMPLE_PACKETS = [
  {
    name: '접근 차량 45.0 km/h',
    hex: 'AA AA 0C 07 00 00 00 00 00 00 7D 00 55 55',
    desc: 'Target: Coming, 12.5 m/s (45.0 km/h)',
  },
  {
    name: '과속 이탈 85.0 km/h',
    hex: 'AA AA 0C 07 01 00 00 00 00 00 EC 00 55 55',
    desc: 'Target: Leaving, 23.6 m/s (85.0 km/h)',
  },
  {
    name: '레이더 설정 응답',
    hex: 'AA AA 01 70 71 01 03 05 00 05 C8 00 55 55',
    desc: 'Return Params: Crosswise, Last, Sens 3, 5-200km/h',
  },
  {
    name: '펌웨어 버전 응답',
    hex: 'AA AA 00 04 82 01 00 07 00 00 00 00 55 55',
    desc: 'Version: V1.0.7',
  },
  {
    name: '헤더 오류 테스트',
    hex: 'EE EE 0C 07 00 00 00 00 00 00 7D 00 55 55',
    desc: 'Malformed Header Error',
  },
];

export const DataParser: React.FC<DataParserProps> = ({
  inputHex,
  onChangeInputHex,
  onParsedResult,
  speedLimitThreshold = 50,
  activeRadarParams,
  recentSpeeds = [],
  logs = [],
  sessionStartTime = new Date(),
  onResetSessionStats,
  isDraggable = false,
  onSwapLayout,
}) => {
  const [parsed, setParsed] = useState<ParsedPacketResult>(() => parseRadarPacket(inputHex));
  const [selectedByteIdx, setSelectedByteIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'both' | 'chart' | 'detail'>('both');
  const [chartSubTab, setChartSubTab] = useState<'both' | 'sparkline' | 'histogram' | 'errors'>('both');
  const [internalRecentSpeeds, setInternalRecentSpeeds] = useState<number[]>([42, 45, 48, 52, 45]);
  const [isAlarmDismissed, setIsAlarmDismissed] = useState(false);

  // Automatically parse on input change
  useEffect(() => {
    const result = parseRadarPacket(inputHex);
    setParsed(result);
    if (onParsedResult) {
      onParsedResult(result);
    }
    if (result.targetStatus?.speedKmh) {
      setInternalRecentSpeeds((prev) => [...prev.slice(-19), result.targetStatus!.speedKmh]);
      setIsAlarmDismissed(false); // Reset alarm dismiss on new target speed
    }
  }, [inputHex]);

  const effectiveRecentSpeeds = recentSpeeds.length > 0 ? recentSpeeds : internalRecentSpeeds;

  const effectiveParams = useMemo(() => {
    if (parsed.radarParameters) {
      return {
        installationMode: parsed.radarParameters.installationMode,
        workMode: parsed.radarParameters.workMode,
        sensitivity: parsed.radarParameters.sensitivity,
        lowerSpeedLimit: parsed.radarParameters.lowerSpeedLimit,
        angle: parsed.radarParameters.angle,
        responseTime: parsed.radarParameters.responseTime,
        upperSpeedLimit: parsed.radarParameters.upperSpeedLimit,
        direction: parsed.radarParameters.direction,
      };
    }
    return activeRadarParams;
  }, [parsed.radarParameters, activeRadarParams]);

  const handleCopyCleanHex = () => {
    if (parsed.rawHex) {
      navigator.clipboard.writeText(parsed.rawHex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleExportSessionCSV = () => {
    if (effectiveRecentSpeeds.length === 0) return;

    const now = new Date();
    const nowStr = now.toLocaleString('ko-KR');
    const sessionStartStr = sessionStartTime.toLocaleString('ko-KR');

    const count = effectiveRecentSpeeds.length;
    const sum = effectiveRecentSpeeds.reduce((acc, v) => acc + v, 0);
    const avg = (sum / count).toFixed(1);
    const max = Math.max(...effectiveRecentSpeeds).toFixed(1);
    const min = Math.min(...effectiveRecentSpeeds).toFixed(1);
    const overCount = effectiveRecentSpeeds.filter((s) => s > speedLimitThreshold).length;
    const overRate = ((overCount / count) * 100).toFixed(1);
    const compliantCount = count - overCount;
    const compliantRate = ((compliantCount / count) * 100).toFixed(1);

    const lines: string[] = [];
    lines.push('# TSR20 Speed Sign Radar - 세션 속도 히스토리 및 통계 리포트');
    lines.push(`세션 시작 시간,${sessionStartStr}`);
    lines.push(`데이터 추출 시간,${nowStr}`);
    lines.push(`설정 제한 속도 기준,${speedLimitThreshold} km/h`);
    lines.push(`총 감지 차량 수,${count} 대`);
    lines.push(`평균 주행 속도,${avg} km/h (${(Number(avg) / 3.6).toFixed(1)} m/s)`);
    lines.push(`최고 기록 속도,${max} km/h`);
    lines.push(`최저 기록 속도,${min} km/h`);
    lines.push(`과속 적발 건수,${overCount} 대 (${overRate}%)`);
    lines.push(`규정 준수 차량 수,${compliantCount} 대 (${compliantRate}%)`);
    lines.push('');
    lines.push('순번(#),감지속도(km/h),환산속도(m/s),제한속도(km/h),초과편차(km/h),판정결과');

    effectiveRecentSpeeds.forEach((speed, idx) => {
      const isOver = speed > speedLimitThreshold;
      const delta = isOver
        ? `+${(speed - speedLimitThreshold).toFixed(1)}`
        : `-${(speedLimitThreshold - speed).toFixed(1)}`;
      const status = isOver ? '과속 (VIOLATION)' : '안전 준수 (COMPLIANT)';
      lines.push(`${idx + 1},${speed.toFixed(1)},${(speed / 3.6).toFixed(1)},${speedLimitThreshold},${delta},${status}`);
    });

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
  };

  // Speed violation check for top warning banner
  const targetSpeed = parsed.targetStatus?.speedKmh ?? 0;
  const targetDirection = parsed.targetStatus?.direction ?? 0;
  const isSpeeding = parsed.targetStatus !== undefined && targetSpeed > speedLimitThreshold;
  const speedDelta = Math.max(0, targetSpeed - speedLimitThreshold);

  return (
    <section className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl flex flex-col justify-between backdrop-blur-sm relative">
      <div className="space-y-5">
        {/* FLASHING OVERSPEED WARNING BANNER & VISUAL ALARM */}
        {isSpeeding && !isAlarmDismissed && (
          <div className="relative overflow-hidden rounded-xl border-2 border-red-500 bg-gradient-to-r from-red-950 via-red-900/90 to-red-950 p-3.5 shadow-2xl led-box-alert animate-pulse transition-all">
            {/* Strobe background effect */}
            <div className="absolute inset-0 bg-red-600/10 animate-ping pointer-events-none" />

            <div className="relative flex items-center justify-between gap-3 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 border border-red-400 flex items-center justify-center text-white shadow-lg shadow-red-600/50 shrink-0">
                  <AlertOctagon className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs md:text-sm font-black text-white tracking-wide uppercase">
                      과속 위험 경보 (SPEED VIOLATION ALERT)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-red-700 animate-pulse">
                      규정 속도 초과
                    </span>
                  </div>
                  <div className="text-xs text-red-200 mt-0.5 flex items-center gap-2 flex-wrap font-mono">
                    <span>
                      감지 속도: <strong className="text-white text-sm font-digital">{targetSpeed.toFixed(1)} km/h</strong>
                    </span>
                    <span className="text-red-400">·</span>
                    <span>제한 속도: {speedLimitThreshold} km/h</span>
                    <span className="text-red-400">·</span>
                    <span className="text-amber-300 font-bold">
                      +{speedDelta.toFixed(1)} km/h 초과!
                    </span>
                    <span className="text-red-400">·</span>
                    <span>방향: {targetDirection === 0 ? '접근 (Coming)' : '이탈 (Leaving)'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsAlarmDismissed(true)}
                className="p-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 text-red-200 hover:text-white border border-red-700 text-xs shrink-0 transition-colors"
                title="알람 배너 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Section Header with Drag Handle & Swap Option */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {isDraggable && (
              <div 
                className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1 -ml-1 rounded transition-colors"
                title="드래그하여 패널 위치 변경"
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSearch className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-semibold text-white">
                  패킷 분석기 (Radar ➔ PC)
                </h2>
                {onSwapLayout && (
                  <button
                    onClick={onSwapLayout}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-[10px] transition-colors flex items-center gap-1"
                    title="패킷 생성기와 분석기 위치 좌우 전환"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
                    <span className="hidden sm:inline">위치 전환</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">수신 Hex 프레임 역어셈블리 및 텔레메트리 디코딩</p>
            </div>
          </div>

          {/* Sample Selectors */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 font-medium mr-1">샘플:</span>
            {SAMPLE_PACKETS.slice(0, 3).map((s, idx) => (
              <button
                key={idx}
                onClick={() => onChangeInputHex(s.hex)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium border border-slate-700 transition-colors"
                title={s.desc}
              >
                {s.name}
              </button>
            ))}

            {/* Session Speed History CSV Export Button */}
            <button
              onClick={handleExportSessionCSV}
              disabled={effectiveRecentSpeeds.length === 0}
              className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 hover:text-cyan-200 border border-cyan-800/60 rounded text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              title="현재 세션의 속도 히스토리 및 통계 데이터를 CSV 파일로 다운로드합니다"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>속도 CSV 내보내기</span>
            </button>
          </div>
        </div>

        {/* Hex Input Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              수신 패킷 Hex 입력 (Paste / Input Hex)
            </label>
            <div className="flex items-center gap-2">
              {inputHex && (
                <button
                  onClick={() => onChangeInputHex('')}
                  className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                  title="입력 지우기"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>지우기</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={2}
              value={inputHex}
              onChange={(e) => onChangeInputHex(e.target.value)}
              placeholder="예: AA AA 0C 07 00 00 00 00 00 00 7D 00 55 55"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono-code text-sm tracking-wider placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none shadow-inner"
            />
            {parsed.rawHex && (
              <button
                onClick={handleCopyCleanHex}
                className="absolute right-2.5 bottom-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="정규화된 Hex 복사"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Validation Checks Bar */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {/* Header Check */}
          <div
            className={`p-2 rounded-lg border flex items-center gap-2 ${
              parsed.isValidHeader
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/40 border-red-800/60 text-red-300'
            }`}
          >
            {parsed.isValidHeader ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
            )}
            <div className="truncate">
              <span className="font-semibold block text-[11px]">헤더 (0xAAAA)</span>
              <span className="text-[10px] opacity-80">{parsed.isValidHeader ? '정상 일치' : '헤더 불일치'}</span>
            </div>
          </div>

          {/* Length Check */}
          <div
            className={`p-2 rounded-lg border flex items-center gap-2 ${
              parsed.isValidLength
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
            }`}
          >
            {parsed.isValidLength ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            )}
            <div className="truncate">
              <span className="font-semibold block text-[11px]">길이 (14 Bytes)</span>
              <span className="text-[10px] opacity-80">{parsed.bytes.length} / 14 Bytes</span>
            </div>
          </div>

          {/* Tail Check */}
          <div
            className={`p-2 rounded-lg border flex items-center gap-2 ${
              parsed.isValidTail
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/40 border-red-800/60 text-red-300'
            }`}
          >
            {parsed.isValidTail ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
            )}
            <div className="truncate">
              <span className="font-semibold block text-[11px]">꼬리 (0x5555)</span>
              <span className="text-[10px] opacity-80">{parsed.isValidTail ? '정상 일치' : '꼬리 불일치'}</span>
            </div>
          </div>
        </div>

        {/* Warning or Error Messages */}
        {parsed.errors.length > 0 && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-xs text-red-300 space-y-1">
            {parsed.errors.map((err, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* 1. Session Summary Stats (Total traffic, Avg, Max, Violations) */}
        <SessionSummaryStats
          recentSpeeds={effectiveRecentSpeeds}
          speedLimitThreshold={speedLimitThreshold}
          sessionStartTime={sessionStartTime}
          onResetSessionStats={onResetSessionStats}
        />

        {/* 2. StatusOverview: Active Radar Parameters Grid (Sensitivity, Angle, Mode, etc.) */}
        <StatusOverview activeRadarParams={effectiveParams} />

        {/* 3. Temporal Traffic Visualizations: Sparkline & Histogram with sub-tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              속도 트렌드 및 통계 분석 (Speed Analysis)
            </span>
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-medium">
              <button
                onClick={() => setChartSubTab('both')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  chartSubTab === 'both' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                모두 표시
              </button>
              <button
                onClick={() => setChartSubTab('sparkline')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  chartSubTab === 'sparkline' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                스파크라인
              </button>
              <button
                onClick={() => setChartSubTab('histogram')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  chartSubTab === 'histogram' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                히스토그램
              </button>
            </div>
          </div>

          {(chartSubTab === 'both' || chartSubTab === 'sparkline') && (
            <SpeedSparkline
              recentSpeeds={effectiveRecentSpeeds}
              speedLimitThreshold={speedLimitThreshold}
            />
          )}

          {(chartSubTab === 'both' || chartSubTab === 'histogram') && (
            <SpeedHistogram
              recentSpeeds={effectiveRecentSpeeds}
              speedLimitThreshold={speedLimitThreshold}
            />
          )}
        </div>

        {/* Visualization & Telemetry View Selector */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            레이더 분석 및 시각화 (Radar Analysis & Visualizer)
          </span>
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'both' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              전체 보기
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'chart' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              차트/게이지
            </button>
            <button
              onClick={() => setViewMode('detail')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'detail' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              텍스트 상세
            </button>
          </div>
        </div>

        {/* 4. Radar State Visual Cockpit (Speed Gauge, Sensitivity 3-level Bar, Angle Protractor, Envelope) */}
        {(viewMode === 'both' || viewMode === 'chart') && (
          <RadarStateVisualization
            parsedResult={parsed}
            activeRadarParams={activeRadarParams}
            speedLimitThreshold={speedLimitThreshold}
            recentSpeeds={effectiveRecentSpeeds}
          />
        )}

        {/* 5. Decoded Telemetry Card */}
        {(viewMode === 'both' || viewMode === 'detail') && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span>디코딩 결과: {parsed.summaryTitle}</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              Type: {parsed.frameTypeHex || '-- --'}
            </span>
          </div>

          {/* 1. Target Status Decoded Result */}
          {parsed.targetStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-200">
              {/* Speed Card */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    감지 차량 주행 속도 (Vehicle Speed)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-3xl md:text-4xl font-digital font-bold ${
                        parsed.targetStatus.speedKmh > speedLimitThreshold
                          ? 'text-red-400 led-glow-red'
                          : 'text-emerald-400 led-glow-emerald'
                      }`}
                    >
                      {parsed.targetStatus.speedKmh}
                    </span>
                    <span className="text-sm font-bold font-mono text-slate-400">km/h</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400 mt-1 block">
                    {parsed.targetStatus.speedMs} m/s (Raw: 0x{parsed.targetStatus.speedRaw.toString(16).toUpperCase()})
                  </span>
                </div>

                <div className="text-right">
                  {parsed.targetStatus.speedKmh > speedLimitThreshold ? (
                    <span className="inline-block px-2.5 py-1 rounded bg-red-950/80 border border-red-700/80 text-red-300 text-xs font-semibold">
                      과속 경고 ({speedLimitThreshold}km 제한)
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-xs font-semibold">
                      규정 속도 준수
                    </span>
                  )}
                </div>
              </div>

              {/* Direction Card */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    parsed.targetStatus.direction === 0
                      ? 'bg-blue-950/80 border-blue-600/70 text-blue-400'
                      : parsed.targetStatus.direction === 1
                      ? 'bg-amber-950/80 border-amber-600/70 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {parsed.targetStatus.direction === 0 ? (
                    <ArrowDownLeft className="w-6 h-6 animate-pulse" />
                  ) : (
                    <ArrowUpRight className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                    주행 방향 (Target Direction)
                  </span>
                  <div className="text-base font-bold text-white">
                    {parsed.targetStatus.directionStr}
                  </div>
                  <span className="text-xs text-slate-400">
                    {parsed.targetStatus.direction === 0
                      ? '레이더 설치 지점으로 접근 중'
                      : parsed.targetStatus.direction === 1
                      ? '레이더 설치 지점에서 멀어지는 중'
                      : '방향 구분 없음'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Radar Parameters Decoded Result */}
          {parsed.radarParameters && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs animate-in fade-in duration-200">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">설치 모드</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {parsed.radarParameters.installationModeStr}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">작동 모드</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {parsed.radarParameters.workModeStr}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">민감도 (Sensitivity)</span>
                <span className="font-semibold text-cyan-300 mt-0.5 block">
                  레벨 {parsed.radarParameters.sensitivity}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">최저 속도 제한</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {parsed.radarParameters.lowerSpeedLimit} km/h
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">설치 각도 보정</span>
                <span className="font-semibold text-amber-300 mt-0.5 block">
                  {parsed.radarParameters.angle}°
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">응답 시간</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {parsed.radarParameters.responseTimeStr}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">최고 속도 제한</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {parsed.radarParameters.upperSpeedLimit} km/h
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">감지 방향</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {parsed.radarParameters.directionStr}
                </span>
              </div>
            </div>
          )}

          {/* 3. Firmware Version Decoded Result */}
          {parsed.versionInfo && (
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between animate-in fade-in duration-200">
              <div>
                <span className="text-xs text-slate-400 block">펌웨어 버전 (Firmware Version)</span>
                <span className="text-xl font-mono font-bold text-cyan-300">
                  {parsed.versionInfo.versionStr}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Major: {parsed.versionInfo.major} · Minor: {parsed.versionInfo.minor} · Patch: {parsed.versionInfo.patch}
              </div>
            </div>
          )}

          {/* Unknown / Default fallback */}
          {!parsed.targetStatus && !parsed.radarParameters && !parsed.versionInfo && parsed.isValid && (
            <div className="text-xs text-slate-400 py-3 text-center">
              헤더와 꼬리가 유효한 14바이트 프레임이지만 정의된 표준 응답 코드가 아닙니다. 아래 바이트 맵을 참조하세요.
            </div>
          )}
        </div>
        )}

        {/* Byte-by-Byte Breakdown Table */}
        {parsed.byteDetails.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                바이트 상세 디스어셈블리 (Byte Inspection)
              </span>
              <span className="text-[11px] text-slate-500">행 클릭 시 하이라이트</span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 text-[11px] sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Idx</th>
                    <th className="py-2 px-3">Hex</th>
                    <th className="py-2 px-3">Dec</th>
                    <th className="py-2 px-3 font-sans">필드명</th>
                    <th className="py-2 px-3 font-sans">설명 및 디코딩 값</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {parsed.byteDetails.map((b) => {
                    const isSelected = selectedByteIdx === b.index;
                    return (
                      <tr
                        key={b.index}
                        onClick={() => setSelectedByteIdx(isSelected ? null : b.index)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-900/30 text-white'
                            : 'hover:bg-slate-900/50 text-slate-300'
                        }`}
                      >
                        <td className="py-1.5 px-3 text-slate-500">[{b.index}]</td>
                        <td className="py-1.5 px-3 font-bold text-cyan-400">0x{b.hex}</td>
                        <td className="py-1.5 px-3 text-slate-400">{b.dec}</td>
                        <td className="py-1.5 px-3 font-sans text-slate-300">{b.name}</td>
                        <td className="py-1.5 px-3 font-sans text-slate-400 truncate max-w-[200px] sm:max-w-none">
                          {b.desc}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
