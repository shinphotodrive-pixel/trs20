import React, { useMemo } from 'react';
import { 
  Gauge, 
  Wifi, 
  Compass, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Sliders, 
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { RadarParameters, ParsedPacketResult } from '../types/protocol';

interface RadarStateVisualizationProps {
  parsedResult: ParsedPacketResult;
  activeRadarParams?: RadarParameters;
  speedLimitThreshold?: number;
  recentSpeeds?: number[];
}

export const RadarStateVisualization: React.FC<RadarStateVisualizationProps> = ({
  parsedResult,
  activeRadarParams,
  speedLimitThreshold = 50,
  recentSpeeds = [],
}) => {
  // Extract or fallback radar parameters
  const currentSensitivity = 
    parsedResult.radarParameters?.sensitivity ?? 
    activeRadarParams?.sensitivity ?? 
    3;

  const currentAngle = 
    parsedResult.radarParameters?.angle ?? 
    activeRadarParams?.angle ?? 
    0;

  const lowerLimit = 
    parsedResult.radarParameters?.lowerSpeedLimit ?? 
    activeRadarParams?.lowerSpeedLimit ?? 
    5;

  const upperLimit = 
    parsedResult.radarParameters?.upperSpeedLimit ?? 
    activeRadarParams?.upperSpeedLimit ?? 
    200;

  const targetSpeed = parsedResult.targetStatus?.speedKmh ?? 0;
  const targetSpeedMs = parsedResult.targetStatus?.speedMs ?? 0;
  const targetDirection = parsedResult.targetStatus?.direction ?? 0;
  const hasTarget = parsedResult.targetStatus !== undefined;

  // Cosine correction calculations
  const angleRad = (currentAngle * Math.PI) / 180;
  const cosVal = Math.cos(angleRad);
  const correctionFactor = cosVal > 0 ? (1 / cosVal) : 1;
  const correctedLaneSpeed = (targetSpeed * correctionFactor).toFixed(1);

  // Speedometer Gauge Arc math
  const maxDisplaySpeed = 160;
  const speedPercentage = Math.min(Math.max(targetSpeed / maxDisplaySpeed, 0), 1);
  // Arc angle from -120 deg to +120 deg (total 240 deg)
  const gaugeAngle = -120 + speedPercentage * 240;

  const isSpeeding = hasTarget && targetSpeed > speedLimitThreshold;
  const isWithinEnvelope = !hasTarget || (targetSpeed >= lowerLimit && targetSpeed <= upperLimit);

  // Compute sensitivity range info
  const sensitivityInfo = useMemo(() => {
    switch (currentSensitivity) {
      case 1:
        return { label: '레벨 1 (저감도)', range: '약 10 ~ 40m', power: 33, desc: '근거리 / 골목길' };
      case 2:
        return { label: '레벨 2 (보통)', range: '약 40 ~ 100m', power: 66, desc: '일반 도로 / 2차선' };
      case 3:
      default:
        return { label: '레벨 3 (최고)', range: '약 100 ~ 200m+', power: 100, desc: '고속도로 / 원거리' };
    }
  }, [currentSensitivity]);

  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 space-y-4 shadow-inner">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            레이더 동작 상태 시각화 요약 (Radar Status Visualizer)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="text-slate-500">실시간 반영</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        </div>
      </div>

      {/* 3 Core Visual Cards: Speed Gauge, Sensitivity Meter, Angle & Cosine Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Target Speed Gauge Card */}
        <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              목표물 속도 (Speed)
            </span>
            {hasTarget && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isSpeeding
                    ? 'bg-red-950 text-red-300 border border-red-800/80'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                }`}
              >
                {isSpeeding ? '과속 경고' : '정상 속도'}
              </span>
            )}
          </div>

          {/* Semi-circular Speed Gauge SVG */}
          <div className="relative flex flex-col items-center justify-center my-1">
            <svg viewBox="0 0 160 95" className="w-36 h-24 overflow-visible">
              <defs>
                <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="60%" stopColor="#38bdf8" />
                  <stop offset="85%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              {/* Background Arc */}
              <path
                d="M 20 85 A 60 60 0 0 1 140 85"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Active Colored Arc */}
              <path
                d="M 20 85 A 60 60 0 0 1 140 85"
                fill="none"
                stroke="url(#speedGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="188.5"
                strokeDashoffset={188.5 - 188.5 * speedPercentage}
                className="transition-all duration-300 ease-out"
              />
              {/* Threshold tick mark (Speed limit 50 or configured) */}
              {speedLimitThreshold && (
                <line
                  x1="80"
                  y1="85"
                  x2={80 + 56 * Math.cos(((-120 + (speedLimitThreshold / maxDisplaySpeed) * 240) * Math.PI) / 180)}
                  y2={85 + 56 * Math.sin(((-120 + (speedLimitThreshold / maxDisplaySpeed) * 240) * Math.PI) / 180)}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="2,2"
                />
              )}
              {/* Gauge needle */}
              <circle cx="80" cy="85" r="5" fill="#f8fafc" />
              <line
                x1="80"
                y1="85"
                x2={80 + 50 * Math.cos((gaugeAngle * Math.PI) / 180)}
                y2={85 + 50 * Math.sin((gaugeAngle * Math.PI) / 180)}
                stroke={isSpeeding ? '#ef4444' : '#38bdf8'}
                strokeWidth="3.5"
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
              />
            </svg>

            {/* Speed Value in Center */}
            <div className="text-center -mt-6">
              <div
                className={`font-digital text-2xl font-bold tracking-tight ${
                  isSpeeding ? 'text-red-400 led-glow-red' : 'text-emerald-400 led-glow-emerald'
                }`}
              >
                {hasTarget ? targetSpeed.toFixed(1) : '--'}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                km/h · {hasTarget ? `${targetSpeedMs.toFixed(1)} m/s` : '대기 중'}
              </div>
            </div>
          </div>

          {/* Direction indicator footer */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">주행 방향</span>
            {hasTarget ? (
              <span className="font-semibold text-white flex items-center gap-1">
                {targetDirection === 0 ? (
                  <>
                    <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />
                    <span>접근 (Coming)</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>이탈 (Leaving)</span>
                  </>
                )}
              </span>
            ) : (
              <span className="text-slate-500">감지 대기</span>
            )}
          </div>
        </div>

        {/* 2. Radar Sensitivity Meter Card */}
        <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              감도 레벨 (Sensitivity)
            </span>
            <span className="font-mono text-xs font-bold text-cyan-300">
              LV {currentSensitivity} / 3
            </span>
          </div>

          {/* Visual 3-Bar RF Level Gauge */}
          <div className="my-2 space-y-2">
            <div className="grid grid-cols-3 gap-1.5 h-6">
              {[1, 2, 3].map((lvl) => {
                const isLit = lvl <= currentSensitivity;
                return (
                  <div
                    key={lvl}
                    className={`rounded-md border flex flex-col items-center justify-center transition-all ${
                      isLit
                        ? lvl === 3
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold shadow-sm shadow-cyan-900/40'
                          : lvl === 2
                          ? 'bg-blue-500/30 border-blue-400 text-blue-200 font-bold'
                          : 'bg-emerald-500/30 border-emerald-400 text-emerald-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-600'
                    }`}
                  >
                    <span className="text-[10px] font-mono">L{lvl}</span>
                  </div>
                );
              })}
            </div>

            {/* Radar RF Coverage Cone Diagram */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <div className="text-[11px]">
                <div className="text-slate-300 font-medium">{sensitivityInfo.label}</div>
                <div className="text-[10px] text-slate-400">{sensitivityInfo.desc}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-cyan-400 font-bold block">
                  {sensitivityInfo.range}
                </span>
                <span className="text-[9px] text-slate-500">유효 감지 반경</span>
              </div>
            </div>
          </div>

          {/* Sensitivity Byte indicator */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Byte 6 값</span>
            <span className="font-mono text-cyan-300 font-bold">0x0{currentSensitivity}</span>
          </div>
        </div>

        {/* 3. Installation Angle & Cosine Correction Card */}
        <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              설치 각도 및 보정 (Angle)
            </span>
            <span className="font-mono text-xs font-bold text-amber-300">
              {currentAngle}° (Byte 8)
            </span>
          </div>

          {/* Angle Geometric Protractor Visual */}
          <div className="my-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="relative w-20 h-10 flex items-end">
                {/* Road Baseline */}
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-700"></div>
                {/* Angled Radar Beam */}
                <div
                  className="absolute bottom-0 left-0 w-16 h-0.5 bg-amber-400 origin-left transition-transform duration-300"
                  style={{ transform: `rotate(-${currentAngle * 1.5}deg)` }}
                >
                  <div className="absolute right-0 -top-1 w-2 h-2 rounded-full bg-amber-300"></div>
                </div>
                <div className="text-[9px] text-slate-500 absolute -top-1 left-2 font-mono">
                  &theta;={currentAngle}&deg;
                </div>
              </div>

              {/* Multiplier Badge */}
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">코사인 보정 계수</span>
                <span className="font-mono text-xs font-bold text-amber-300">
                  x{correctionFactor.toFixed(3)}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 border-t border-slate-800/60 pt-1.5 flex justify-between">
              <span>보정 공식: v = v_m / cos(&theta;)</span>
              {hasTarget && (
                <span className="text-amber-200 font-mono font-medium">
                  실차속: ~{correctedLaneSpeed} km/h
                </span>
              )}
            </div>
          </div>

          {/* Angle Range Footer */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">설치 각도 규격</span>
            <span className="font-mono text-slate-300">0° ~ 30° 범위</span>
          </div>
        </div>
      </div>

      {/* Speed Filter Envelope Bar (Lower Limit ~ Current ~ Upper Limit) */}
      <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/80 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-slate-300">속도 필터 감지 구간 (Speed Envelope)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span>최저: <strong className="text-white">{lowerLimit} km/h</strong></span>
            <span className="text-slate-600">·</span>
            <span>최고: <strong className="text-white">{upperLimit} km/h</strong></span>
          </div>
        </div>

        {/* Envelope Horizontal Bar */}
        <div className="relative w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
          {/* Active envelope zone */}
          <div
            className="absolute top-0 bottom-0 bg-blue-900/40 border-l border-r border-blue-500/50"
            style={{
              left: `${(lowerLimit / 250) * 100}%`,
              width: `${((upperLimit - lowerLimit) / 250) * 100}%`,
            }}
          />
          {/* Target speed marker */}
          {hasTarget && (
            <div
              className={`absolute top-0 bottom-0 w-2 rounded-full -ml-1 transition-all duration-300 ${
                isSpeeding ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-emerald-400 shadow-sm shadow-emerald-400'
              }`}
              style={{
                left: `${Math.min(Math.max((targetSpeed / 250) * 100, 1), 99)}%`,
              }}
              title={`현재 감지 속도: ${targetSpeed} km/h`}
            />
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>0 km/h</span>
          <span className="text-slate-400">
            {hasTarget ? (
              isWithinEnvelope ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> 유효 감지 범위 내 주행 중
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 필터 한계 밖 (무시 대상)
                </span>
              )
            ) : (
              '레이더 감지 필터 정상 활성화'
            )}
          </span>
          <span>250 km/h</span>
        </div>
      </div>
    </div>
  );
};
