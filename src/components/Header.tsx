import React from 'react';
import { 
  Radio, 
  Cpu, 
  HelpCircle, 
  Cable, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { SerialConnectionStatus } from '../services/webSerial';

interface HeaderProps {
  serialStatus: SerialConnectionStatus;
  isSimulatorActive: boolean;
  onToggleSimulator: () => void;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
  onOpenDocs: () => void;
  isWebSerialSupported: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  serialStatus,
  isSimulatorActive,
  onToggleSimulator,
  onConnectSerial,
  onDisconnectSerial,
  onOpenDocs,
  isWebSerialSupported,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Logo & Hardware Specs */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                TSR20 Speed Sign Radar Tester
              </h1>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                V1.0.7
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>RS232</span>
              <span className="text-slate-600">·</span>
              <span>115200 bps</span>
              <span className="text-slate-600">·</span>
              <span>8N1</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">24.125 GHz K-Band</span>
            </div>
          </div>
        </div>

        {/* Controls: Web Serial + Simulator Toggle + Docs */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Virtual Radar Simulator Toggle */}
          <button
            onClick={onToggleSimulator}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isSimulatorActive
                ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 shadow-sm shadow-emerald-950'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="물리 레이더가 없을 때 소프트웨어 가상 레이더로 응답 및 차량 통행을 시뮬레이션합니다"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>가상 레이더: {isSimulatorActive ? 'ON' : 'OFF'}</span>
            {isSimulatorActive ? (
              <ToggleRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Web Serial Connection */}
          {serialStatus.isConnected ? (
            <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-600/70 rounded-lg px-3 py-1.5 text-xs text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono font-medium">연결됨 (115200)</span>
              <button
                onClick={onDisconnectSerial}
                className="ml-1 text-slate-400 hover:text-red-400 transition-colors font-medium underline text-[11px]"
              >
                해제
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectSerial}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isWebSerialSupported
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-900/50'
                  : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
              title={
                isWebSerialSupported
                  ? 'PC의 RS232 시리얼 포트(USB-UART)를 연결합니다'
                  : '이 브라우저는 Web Serial API를 지원하지 않습니다 (Chrome/Edge 필요)'
              }
            >
              <Cable className="w-3.5 h-3.5" />
              <span>RS232 시리얼 연결</span>
            </button>
          )}

          {/* Protocol Docs Button */}
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
            title="TSR20 프로토콜 규격서 및 설치 가이드 보기"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">규격서</span>
          </button>
        </div>
      </div>
    </header>
  );
};
