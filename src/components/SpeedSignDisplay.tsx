import React, { useState } from 'react';
import { 
  Car, 
  AlertOctagon, 
  ShieldCheck, 
  Play, 
  Square, 
  ArrowDown, 
  ArrowUp,
  Settings2,
  Gauge
} from 'lucide-react';

interface SpeedSignDisplayProps {
  currentSpeed: number; // km/h
  direction: 0 | 1 | 2; // 0: coming, 1: leaving
  speedLimit: number;
  onChangeSpeedLimit: (limit: number) => void;
  onManualTrigger: (speed: number, dir: 0 | 1) => void;
  isAutoTrafficRunning: boolean;
  onToggleAutoTraffic: () => void;
}

export const SpeedSignDisplay: React.FC<SpeedSignDisplayProps> = ({
  currentSpeed,
  direction,
  speedLimit,
  onChangeSpeedLimit,
  onManualTrigger,
  isAutoTrafficRunning,
  onToggleAutoTraffic,
}) => {
  const [testSpeed, setTestSpeed] = useState<number>(55);
  const [testDir, setTestDir] = useState<0 | 1>(0);

  const isSpeeding = currentSpeed > speedLimit;
  const isVehicleDetected = currentSpeed > 0;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white">
              과속 경보 전광판 시뮬레이터 (Driver Feedback Sign)
            </h3>
            <p className="text-xs text-slate-400">
              TSR20 연동 실시간 도로 LED 속도표시기 및 차량 통행 시뮬레이션
            </p>
          </div>
        </div>

        {/* Speed Limit Selector */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-slate-400 font-medium">제한속도 설정:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[30, 50, 60, 80].map((limit) => (
              <button
                key={limit}
                onClick={() => onChangeSpeedLimit(limit)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  speedLimit === limit
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {limit}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        {/* Sign Physical Box (Roadside Display Simulation) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div
            className={`w-full max-w-md rounded-2xl p-4 md:p-6 transition-all duration-300 border-4 ${
              isVehicleDetected && isSpeeding
                ? 'bg-gradient-to-b from-slate-950 to-neutral-950 border-red-600 led-box-alert'
                : 'bg-gradient-to-b from-slate-950 to-neutral-950 border-amber-500 led-box-glow'
            }`}
          >
            {/* Top Sign Header: Korean Road Safety Styling */}
            <div className="bg-amber-400 text-slate-950 font-black text-center py-1.5 px-3 rounded-lg shadow uppercase tracking-wider text-xs md:text-sm flex items-center justify-center gap-2">
              <span className="w-5 h-5 rounded-full border border-slate-950 flex items-center justify-center text-[10px] font-bold">
                {speedLimit}
              </span>
              <span>안전속도 준수 · 과속주의</span>
            </div>

            {/* LED Matrix Screen */}
            <div className="my-4 bg-black rounded-xl p-5 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden min-h-[170px] shadow-inner">
              {/* Dot matrix grid texture background */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                  backgroundSize: '8px 8px',
                }}
              />

              {isVehicleDetected ? (
                <>
                  <div className="text-[11px] font-mono tracking-widest text-slate-500 mb-1">
                    YOUR SPEED (현재속도)
                  </div>
                  <div
                    className={`font-digital text-6xl md:text-7xl font-bold tracking-tight transition-colors duration-200 ${
                      isSpeeding
                        ? 'text-red-500 led-glow-red animate-pulse'
                        : 'text-emerald-400 led-glow-emerald'
                    }`}
                  >
                    {Math.round(currentSpeed)}
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-400 mt-0.5 tracking-wider">
                    KM / H
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="font-digital text-4xl text-slate-700 tracking-widest">
                    --
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-2">
                    차량 감지 대기 중 (WAITING)
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status Feedback */}
            <div
              className={`text-center py-2 px-3 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                isVehicleDetected && isSpeeding
                  ? 'bg-red-950/80 text-red-400 border border-red-800'
                  : isVehicleDetected
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              {isVehicleDetected && isSpeeding ? (
                <>
                  <AlertOctagon className="w-4 h-4 animate-bounce shrink-0" />
                  <span>과속 주의! 감속하십시오 (SLOW DOWN)</span>
                </>
              ) : isVehicleDetected ? (
                <>
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>감사합니다 · 규정 속도 준수 중</span>
                </>
              ) : (
                <span>레이더 전방 통행 감지 중</span>
              )}
            </div>
          </div>
        </div>

        {/* Traffic Simulation Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                차량 통행 시뮬레이터 (Traffic Injector)
              </span>
              <button
                onClick={onToggleAutoTraffic}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  isAutoTrafficRunning
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-900'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900'
                }`}
              >
                {isAutoTrafficRunning ? (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    <span>자동 통행 정지</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>자동 통행 시작</span>
                  </>
                )}
              </button>
            </div>

            {/* Manual Vehicle Speed Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400 font-medium">수동 시험 속도 (Target Speed)</span>
                <span
                  className={`font-mono font-bold ${
                    testSpeed > speedLimit ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {testSpeed} km/h ({(testSpeed / 3.6).toFixed(1)} m/s)
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="140"
                step="1"
                value={testSpeed}
                onChange={(e) => setTestSpeed(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>10 km/h (서행)</span>
                <span className="text-amber-400 font-bold">{speedLimit} km/h (제한)</span>
                <span>140 km/h (고속)</span>
              </div>
            </div>

            {/* Direction Selection */}
            <div>
              <span className="block text-xs text-slate-400 font-medium mb-1.5">
                통행 방향 (Direction)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTestDir(0)}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    testDir === 0
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>접근 (Coming)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTestDir(1)}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    testDir === 1
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>이탈 (Leaving)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Trigger Button */}
          <button
            onClick={() => onManualTrigger(testSpeed, testDir)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 hover:border-slate-600 transition-colors text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            <Car className="w-4 h-4 text-cyan-400" />
            <span>차량 통과 시뮬레이션 패킷 발송 (Inject 0C 07)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
