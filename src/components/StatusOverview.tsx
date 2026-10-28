import React from 'react';
import { 
  Wifi, 
  Compass, 
  RotateCw, 
  Clock, 
  ArrowLeftRight, 
  Gauge, 
  CheckCircle2, 
  SlidersHorizontal 
} from 'lucide-react';
import { RadarParameters } from '../types/protocol';
import { DEFAULT_RADAR_PARAMS, RESPONSE_TIME_LABELS } from '../utils/protocol';

interface StatusOverviewProps {
  activeRadarParams?: RadarParameters;
  className?: string;
}

export const StatusOverview: React.FC<StatusOverviewProps> = ({
  activeRadarParams,
  className = '',
}) => {
  const params = activeRadarParams ?? DEFAULT_RADAR_PARAMS;

  // Cosine correction factor calculation
  const angleRad = (params.angle * Math.PI) / 180;
  const cosVal = Math.cos(angleRad);
  const cosFactor = cosVal > 0 ? (1 / cosVal).toFixed(3) : '1.000';

  // Sensitivity text helper
  const getSensitivityText = (lvl: number) => {
    switch (lvl) {
      case 1:
        return { label: '레벨 1 (저감도)', range: '10~40m 근거리' };
      case 2:
        return { label: '레벨 2 (보통)', range: '40~100m 일반도로' };
      case 3:
      default:
        return { label: '레벨 3 (최고)', range: '100~200m+ 원거리' };
    }
  };

  const sensInfo = getSensitivityText(params.sensitivity);
  const instModeStr = params.installationMode === 0 ? '가로 수평' : '세로 수직';
  const workModeStr = params.workMode === 0 ? 'Touch (즉시)' : 'Last (지속)';
  const dirStr = 
    params.direction === 0 
      ? '다가옴 (Coming)' 
      : params.direction === 1 
      ? '멀어짐 (Leaving)' 
      : '양방향 (Both/None)';
  const respTimeStr = RESPONSE_TIME_LABELS[params.responseTime] || '500ms';
  const byte5Hex = (((params.installationMode & 0x0f) << 4) | (params.workMode & 0x0f))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

  const overviewCards = [
    {
      id: 'sensitivity',
      title: '민감도 (Sensitivity)',
      value: `Level ${params.sensitivity}`,
      subtitle: sensInfo.range,
      byteRef: `Byte 6 · 0x0${params.sensitivity}`,
      icon: Wifi,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950/30',
      borderColor: 'border-cyan-800/40',
    },
    {
      id: 'angle',
      title: '설치 각도 (Angle)',
      value: `${params.angle}°`,
      subtitle: `보정 계수 ×${cosFactor}`,
      byteRef: `Byte 8 · 0x${params.angle.toString(16).padStart(2, '0').toUpperCase()}`,
      icon: Compass,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/30',
      borderColor: 'border-amber-800/40',
    },
    {
      id: 'mode',
      title: '설치 및 작동 모드 (Mode)',
      value: `${instModeStr} · ${workModeStr}`,
      subtitle: params.installationMode === 0 ? 'Crosswise' : 'Lengthwise',
      byteRef: `Byte 5 · 0x${byte5Hex}`,
      icon: RotateCw,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-950/30',
      borderColor: 'border-indigo-800/40',
    },
    {
      id: 'response',
      title: '응답 주기 (Response Time)',
      value: respTimeStr,
      subtitle: '속도 데이터 갱신 주기',
      byteRef: `Byte 9 · 코드 ${params.responseTime}`,
      icon: Clock,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/30',
      borderColor: 'border-emerald-800/40',
    },
    {
      id: 'direction',
      title: '감지 방향 (Direction)',
      value: dirStr,
      subtitle: '목표물 통행 필터',
      byteRef: `Byte 11 · 0x0${params.direction}`,
      icon: ArrowLeftRight,
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/30',
      borderColor: 'border-blue-800/40',
    },
    {
      id: 'speed_envelope',
      title: '속도 제한 창 (Speed Window)',
      value: `${params.lowerSpeedLimit} ~ ${params.upperSpeedLimit} km/h`,
      subtitle: '최저 ~ 최고 유효 감지',
      byteRef: 'Byte 7, 10',
      icon: Gauge,
      color: 'text-violet-400',
      bgColor: 'bg-violet-950/30',
      borderColor: 'border-violet-800/40',
    },
  ];

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
          레이더 활성 파라미터 개요 (Status Overview)
        </span>
        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Active Params</span>
        </span>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`p-3 rounded-xl border ${card.bgColor} ${card.borderColor} flex flex-col justify-between transition-all hover:border-slate-600/70 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-slate-400 truncate pr-1">
                  {card.title}
                </span>
                <div className={`p-1 rounded-md bg-slate-900/80 ${card.color} shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-white tracking-tight truncate">
                  {card.value}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {card.subtitle}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-800/70 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span>{card.byteRef}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
