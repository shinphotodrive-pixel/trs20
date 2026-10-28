/**
 * TSR20 Speed Sign Radar Protocol Tester
 * (과속 경고 레이더 RS232 115200bps 8N1 통신 프로토콜 테스트 및 패킷 분석 도구)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  CommandBuilder 
} from './components/CommandBuilder';
import { 
  DataParser 
} from './components/DataParser';
import { 
  SpeedSignDisplay 
} from './components/SpeedSignDisplay';
import { 
  PacketLogViewer 
} from './components/PacketLogViewer';
import { 
  ProtocolDocsModal 
} from './components/ProtocolDocsModal';
import { 
  LogEntry, 
  ParsedPacketResult,
  RadarParameters
} from './types/protocol';
import { 
  formatHex, 
  parseRadarPacket,
  DEFAULT_RADAR_PARAMS
} from './utils/protocol';
import { 
  webSerialManager, 
  SerialConnectionStatus 
} from './services/webSerial';
import { 
  radarSimulator 
} from './services/radarSimulator';
import { 
  Sliders, 
  FileSearch, 
  Gauge, 
  History, 
  BookOpen, 
  Check, 
  AlertCircle,
  ArrowLeftRight,
  GripVertical
} from 'lucide-react';

export default function App() {
  const [inputHex, setInputHex] = useState<string>('AA AA 0C 07 00 00 00 00 00 00 7D 00 55 55');
  const [speedLimit, setSpeedLimit] = useState<number>(50);
  const [currentSpeed, setCurrentSpeed] = useState<number>(45.0);
  const [direction, setDirection] = useState<0 | 1 | 2>(0);
  const [activeRadarParams, setActiveRadarParams] = useState<RadarParameters>({ ...DEFAULT_RADAR_PARAMS });
  const [recentSpeeds, setRecentSpeeds] = useState<number[]>([38, 42, 45, 49, 45]);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(() => new Date());
  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(true);
  const [isAutoTrafficRunning, setIsAutoTrafficRunning] = useState<boolean>(false);
  const [serialStatus, setSerialStatus] = useState<SerialConnectionStatus>(webSerialManager.getStatus());
  const [isWebSerialSupported] = useState<boolean>(webSerialManager.isSupported());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'all' | 'builder' | 'parser' | 'sign' | 'log'>('all');

  // Drag and drop layout state ('builder' left, 'parser' right, or vice versa)
  const [layoutOrder, setLayoutOrder] = useState<Array<'builder' | 'parser'>>(() => {
    try {
      const saved = localStorage.getItem('tsr20_layout_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2) return parsed;
      }
    } catch {
      // default
    }
    return ['builder', 'parser'];
  });
  const [draggedPanel, setDraggedPanel] = useState<'builder' | 'parser' | null>(null);
  const [dragOverPanel, setDragOverPanel] = useState<'builder' | 'parser' | null>(null);

  const toastTimerRef = useRef<any>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const handleSwapLayout = useCallback(() => {
    setLayoutOrder((prev) => {
      const next: Array<'builder' | 'parser'> = 
        prev[0] === 'builder' ? ['parser', 'builder'] : ['builder', 'parser'];
      try {
        localStorage.setItem('tsr20_layout_order', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      showToast(
        next[0] === 'parser'
          ? '좌우 레이아웃 전환: 분석기(좌) / 생성기(우)'
          : '좌우 레이아웃 전환: 생성기(좌) / 분석기(우)'
      );
      return next;
    });
  }, [showToast]);

  const handleResetSessionStats = useCallback(() => {
    setRecentSpeeds([]);
    setSessionStartTime(new Date());
    showToast('세션 속도 통계가 초기화되었습니다.');
  }, [showToast]);

  const lastLogTimeRef = useRef<number | null>(null);

  const addLog = useCallback(
    (
      direction: 'TX' | 'RX',
      bytes: number[],
      categoryOverride?: string,
      summaryOverride?: string
    ) => {
      const now = new Date();
      const nowMs = now.getTime();
      const timeStr = `${now.toTimeString().split(' ')[0]}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      const hex = formatHex(bytes);
      const parsed = parseRadarPacket(bytes);

      const deltaTimeMs =
        lastLogTimeRef.current !== null
          ? Math.max(0, nowMs - lastLogTimeRef.current)
          : 0;
      lastLogTimeRef.current = nowMs;

      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: timeStr,
        rawTimeMs: nowMs,
        deltaTimeMs,
        direction,
        hex,
        frameType: parsed.frameTypeHex || '--',
        category: parsed.frameCategory,
        summary: summaryOverride || parsed.summaryTitle,
        status: parsed.isValid ? (parsed.warnings.length > 0 ? 'warning' : 'success') : 'error',
      };

      setLogs((prev) => [entry, ...prev.slice(0, 199)]); // keep latest 200 logs
    },
    []
  );

  // Handle incoming packets (either from Web Serial or Radar Simulator)
  const handleIncomingPacket = useCallback(
    (bytes: number[]) => {
      const parsed = parseRadarPacket(bytes);
      const hex = formatHex(bytes);

      // Auto update input hex in parser
      setInputHex(hex);

      // Log packet
      addLog('RX', bytes);

      // If target detection packet, update live speed sign and recent speeds
      if (parsed.targetStatus) {
        setCurrentSpeed(parsed.targetStatus.speedKmh);
        setDirection(parsed.targetStatus.direction);
        setRecentSpeeds((prev) => [...prev.slice(-49), parsed.targetStatus!.speedKmh]);
      }

      // If parameter return packet, update active radar parameters
      if (parsed.radarParameters) {
        setActiveRadarParams((prev) => ({
          ...prev,
          ...parsed.radarParameters,
        }));
      }
    },
    [addLog]
  );

  // Bind Web Serial events and Radar Simulator
  useEffect(() => {
    const unsubSerialPacket = webSerialManager.onPacket((bytes) => {
      handleIncomingPacket(bytes);
    });

    const unsubSerialStatus = webSerialManager.onStatusChange((status) => {
      setSerialStatus(status);
    });

    // Setup simulator callback
    radarSimulator.setPacketCallback((bytes) => {
      handleIncomingPacket(bytes);
    });

    // Add initial log
    addLog(
      'RX',
      [0xAA, 0xAA, 0x0C, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7D, 0x00, 0x55, 0x55],
      'TARGET_STATUS',
      '초기 샘플 목표물 감지: 45.0 km/h (다가옴)'
    );

    return () => {
      unsubSerialPacket();
      unsubSerialStatus();
      radarSimulator.setPacketCallback(null);
      radarSimulator.stopAutoTraffic();
    };
  }, [handleIncomingPacket, addLog]);

  // Transmit command from PC to Radar (Serial or Simulator)
  const handleTransmitCommand = async (bytes: number[], label: string) => {
    addLog('TX', bytes, 'COMMAND_PC', label);

    let transmitted = false;

    // Send to physical serial if connected
    if (serialStatus.isConnected) {
      const result = await webSerialManager.sendBytes(bytes);
      if (result.success) {
        showToast(`RS232 시리얼 포트로 전송 완료 (${bytes.length}바이트)`);
        transmitted = true;
      } else {
        showToast(`전송 오류: ${result.error}`);
      }
    }

    // Send to software simulator if enabled
    if (isSimulatorActive) {
      radarSimulator.receiveCommandFromPC(bytes);
      if (!transmitted) {
        showToast(`가상 레이더로 명령 전달 (${label})`);
      }
    } else if (!serialStatus.isConnected) {
      showToast('경고: 시리얼 포트가 연결되지 않았고 가상 레이더도 꺼져 있습니다.');
    }
  };

  // Connect Web Serial port
  const handleConnectSerial = async () => {
    const res = await webSerialManager.connect(115200);
    showToast(res.message);
  };

  // Disconnect Web Serial port
  const handleDisconnectSerial = async () => {
    await webSerialManager.disconnect();
    showToast('시리얼 포트 연결이 해제되었습니다.');
  };

  // Toggle simulator
  const handleToggleSimulator = () => {
    const nextState = !isSimulatorActive;
    setIsSimulatorActive(nextState);
    radarSimulator.setEnabled(nextState);
    if (!nextState && isAutoTrafficRunning) {
      setIsAutoTrafficRunning(false);
      radarSimulator.stopAutoTraffic();
    }
    showToast(nextState ? '가상 레이더 시뮬레이터 활성화됨' : '가상 레이더 시뮬레이터 비활성화됨');
  };

  // Manual target injection (from SpeedSign controls)
  const handleManualTrafficTrigger = (speed: number, dir: 0 | 1) => {
    if (isSimulatorActive) {
      radarSimulator.triggerTargetDetection(speed, dir);
      showToast(`차량 통과 시뮬레이션: ${speed} km/h (${dir === 0 ? '접근' : '이탈'})`);
    } else {
      showToast('가상 레이더 시뮬레이터를 켜주세요 (상단 버튼).');
    }
  };

  // Toggle Auto-traffic
  const handleToggleAutoTraffic = () => {
    if (!isSimulatorActive) {
      setIsSimulatorActive(true);
      radarSimulator.setEnabled(true);
    }

    if (isAutoTrafficRunning) {
      radarSimulator.stopAutoTraffic();
      setIsAutoTrafficRunning(false);
      showToast('자동 통행 시뮬레이터 중지');
    } else {
      radarSimulator.startAutoTraffic(2500, Math.max(20, speedLimit - 25), speedLimit + 35);
      setIsAutoTrafficRunning(true);
      showToast('자동 통행 시뮬레이터 시작 (약 2.5초 주기)');
    }
  };

  // Render Panel Helpers
  const renderPanel = (panelId: 'builder' | 'parser') => {
    const isThisDragged = draggedPanel === panelId;
    const isThisDragOver = dragOverPanel === panelId && draggedPanel !== panelId;

    return (
      <div
        key={panelId}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', panelId);
          setDraggedPanel(panelId);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedPanel && draggedPanel !== panelId) {
            setDragOverPanel(panelId);
          }
        }}
        onDragLeave={() => {
          if (dragOverPanel === panelId) setDragOverPanel(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedPanel && draggedPanel !== panelId) {
            handleSwapLayout();
          }
          setDraggedPanel(null);
          setDragOverPanel(null);
        }}
        onDragEnd={() => {
          setDraggedPanel(null);
          setDragOverPanel(null);
        }}
        className={`transition-all duration-200 rounded-2xl ${
          isThisDragged ? 'opacity-40 scale-[0.98]' : ''
        } ${
          isThisDragOver
            ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 shadow-2xl scale-[1.01]'
            : ''
        }`}
      >
        {panelId === 'builder' ? (
          <CommandBuilder
            onTransmitCommand={handleTransmitCommand}
            onSendToParser={(hex) => {
              setInputHex(hex);
              showToast('생성된 패킷이 분석기에 로드되었습니다.');
            }}
            isDraggable={true}
            onSwapLayout={handleSwapLayout}
          />
        ) : (
          <DataParser
            inputHex={inputHex}
            onChangeInputHex={setInputHex}
            speedLimitThreshold={speedLimit}
            activeRadarParams={activeRadarParams}
            recentSpeeds={recentSpeeds}
            sessionStartTime={sessionStartTime}
            onResetSessionStats={handleResetSessionStats}
            isDraggable={true}
            onSwapLayout={handleSwapLayout}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Application Header */}
      <Header
        serialStatus={serialStatus}
        isSimulatorActive={isSimulatorActive}
        onToggleSimulator={handleToggleSimulator}
        onConnectSerial={handleConnectSerial}
        onDisconnectSerial={handleDisconnectSerial}
        onOpenDocs={() => setIsDocsOpen(true)}
        isWebSerialSupported={isWebSerialSupported}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation View Switcher (Tabs) + Layout Swap */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            {[
              { id: 'all', label: '전체 화면', icon: Gauge },
              { id: 'builder', label: '패킷 생성기', icon: Sliders },
              { id: 'parser', label: '패킷 분석기', icon: FileSearch },
              { id: 'sign', label: 'LED 전광판', icon: Gauge },
              { id: 'log', label: '통신 로그', icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Layout Swap Button */}
            {activeView === 'all' && (
              <button
                onClick={handleSwapLayout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
                title="패킷 생성기와 분석기의 좌우 위치를 변경합니다 (드래그 앤 드롭 가능)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">
                  {layoutOrder[0] === 'builder' ? '분석기를 왼쪽으로' : '생성기를 왼쪽으로'}
                </span>
                <span className="sm:hidden">배치 전환</span>
              </button>
            )}

            <div className="text-xs text-slate-400 hidden sm:flex items-center gap-3 font-mono">
              <span>TX: {logs.filter((l) => l.direction === 'TX').length}</span>
              <span className="text-slate-700">|</span>
              <span>RX: {logs.filter((l) => l.direction === 'RX').length}</span>
              <span className="text-slate-700">|</span>
              <span className="text-emerald-400">
                현재: {currentSpeed.toFixed(1)} km/h ({direction === 0 ? '접근' : '이탈'})
              </span>
            </div>
          </div>
        </div>

        {/* Section 1 & 2: Command Builder & Data Parser (Draggable Layout) */}
        {activeView === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {layoutOrder.map((panelId) => renderPanel(panelId))}
          </div>
        )}

        {/* Single View Filters */}
        {activeView === 'builder' && renderPanel('builder')}
        {activeView === 'parser' && renderPanel('parser')}

        {/* Section 3: Roadside Speed Sign Display & Traffic Injector */}
        {(activeView === 'all' || activeView === 'sign') && (
          <SpeedSignDisplay
            currentSpeed={currentSpeed}
            direction={direction}
            speedLimit={speedLimit}
            onChangeSpeedLimit={setSpeedLimit}
            onManualTrigger={handleManualTrafficTrigger}
            isAutoTrafficRunning={isAutoTrafficRunning}
            onToggleAutoTraffic={handleToggleAutoTraffic}
          />
        )}

        {/* Section 4: Live Packet Traffic Log */}
        {(activeView === 'all' || activeView === 'log') && (
          <PacketLogViewer
            logs={logs}
            onClearLogs={() => {
              setLogs([]);
              lastLogTimeRef.current = null;
              showToast('통신 로그를 모두 비웠습니다.');
            }}
            onSelectPacketForParsing={(hex) => {
              setInputHex(hex);
              setActiveView('all');
              showToast('선택한 패킷을 분석기에 로드했습니다.');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>TSR20 Speed Sign Radar Protocol Tester · 115200bps, 8N1</div>
          <div className="text-slate-600">
            24.125 GHz K-Band Traffic Doppler Radar Engineering Tool
          </div>
        </div>
      </footer>

      {/* Protocol Reference Documentation Modal */}
      <ProtocolDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200 border border-blue-400/40">
          <Check className="w-4 h-4 shrink-0 text-cyan-200" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
