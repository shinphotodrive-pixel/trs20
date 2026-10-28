import React, { useState, useMemo, useEffect } from 'react';
import { 
  Send, 
  Copy, 
  Check, 
  Sliders, 
  RotateCcw, 
  Code, 
  Sparkles, 
  ArrowRight,
  Info,
  Bookmark,
  BookmarkPlus,
  Star,
  Trash2,
  FolderOpen,
  X,
  GripVertical,
  ArrowLeftRight
} from 'lucide-react';
import { CommandType, RadarParameters } from '../types/protocol';
import { 
  buildRadarCommand, 
  clamp, 
  DEFAULT_RADAR_PARAMS, 
  exportToCArray, 
  exportToPython, 
  RESPONSE_TIME_LABELS 
} from '../utils/protocol';

export interface CustomPreset {
  id: string;
  name: string;
  cmdType: CommandType;
  params: RadarParameters;
  createdAt: string;
}

const STORAGE_KEY = 'tsr20_user_presets';

interface CommandBuilderProps {
  onTransmitCommand: (bytes: number[], label: string) => void;
  onSendToParser: (hex: string) => void;
  isTransmitting?: boolean;
  isDraggable?: boolean;
  onSwapLayout?: () => void;
}

export const CommandBuilder: React.FC<CommandBuilderProps> = ({
  onTransmitCommand,
  onSendToParser,
  isTransmitting = false,
  isDraggable = false,
  onSwapLayout,
}) => {
  const [cmdType, setCmdType] = useState<CommandType>('71');
  const [params, setParams] = useState<RadarParameters>({ ...DEFAULT_RADAR_PARAMS });
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [selectedByteIndex, setSelectedByteIndex] = useState<number | null>(null);

  // Favorites / Custom Presets state
  const [userPresets, setUserPresets] = useState<CustomPreset[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Save presets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets));
    } catch (e) {
      console.error('Failed to save presets to localStorage', e);
    }
  }, [userPresets]);

  // Compute generated frame
  const { bytes: packetBytes, hex: generatedHex } = useMemo(() => {
    return buildRadarCommand(cmdType, params);
  }, [cmdType, params]);

  const showTempFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2000);
  };

  const handleCopy = (format: 'hex' | 'c' | 'python') => {
    let textToCopy = generatedHex;
    if (format === 'c') {
      textToCopy = exportToCArray(packetBytes);
    } else if (format === 'python') {
      textToCopy = exportToPython(packetBytes);
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 1800);
  };

  const applyPreset = (presetName: string) => {
    if (presetName === 'school_zone') {
      setCmdType('8E');
      setParams({
        installationMode: 0, // Crosswise
        workMode: 1, // Last
        sensitivity: 3,
        lowerSpeedLimit: 10,
        angle: 0,
        responseTime: 4, // 300ms
        upperSpeedLimit: 60,
        direction: 0, // Coming
      });
      showTempFeedback('어린이보호구역 (30km/h) 프리셋 적용');
    } else if (presetName === 'urban_50') {
      setCmdType('8E');
      setParams({
        installationMode: 0,
        workMode: 1,
        sensitivity: 3,
        lowerSpeedLimit: 15,
        angle: 5,
        responseTime: 5, // 500ms
        upperSpeedLimit: 100,
        direction: 0, // Coming
      });
      showTempFeedback('도심도로 (50km/h) 프리셋 적용');
    } else if (presetName === 'highway') {
      setCmdType('8E');
      setParams({
        installationMode: 0,
        workMode: 1,
        sensitivity: 3,
        lowerSpeedLimit: 30,
        angle: 10,
        responseTime: 2, // 100ms
        upperSpeedLimit: 220,
        direction: 0, // Coming
      });
      showTempFeedback('고속도로 (100km/h+) 프리셋 적용');
    } else if (presetName === 'alley_10') {
      setCmdType('8E');
      setParams({
        installationMode: 0,
        workMode: 1,
        sensitivity: 2,
        lowerSpeedLimit: 5,
        angle: 0,
        responseTime: 3, // 200ms
        upperSpeedLimit: 30,
        direction: 0, // Coming
      });
      showTempFeedback('골목길/보행로 (10km/h) 프리셋 적용');
    } else if (presetName === 'read_params') {
      setCmdType('71');
      showTempFeedback('현재 설정값 조회 (0x71) 명령 설정');
    } else if (presetName === 'read_version') {
      setCmdType('02');
      showTempFeedback('펌웨어 버전 확인 (0x02) 명령 설정');
    } else if (presetName === 'factory_reset') {
      setCmdType('F2');
      showTempFeedback('공장 초기화 (0xF2) 명령 설정');
    }
  };

  const handleSaveCustomPreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) return;

    const newPreset: CustomPreset = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      cmdType,
      params: { ...params },
      createdAt: new Date().toLocaleDateString('ko-KR'),
    };

    setUserPresets((prev) => [newPreset, ...prev]);
    setNewPresetName('');
    setIsSavingPreset(false);
    showTempFeedback(`'${trimmed}' 프리셋이 저장되었습니다!`);
  };

  const handleLoadCustomPreset = (preset: CustomPreset) => {
    setCmdType(preset.cmdType);
    setParams({ ...preset.params });
    setShowPresetsModal(false);
    showTempFeedback(`'${preset.name}' 즐겨찾기를 불러왔습니다.`);
  };

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUserPresets((prev) => prev.filter((p) => p.id !== id));
    showTempFeedback('프리셋이 삭제되었습니다.');
  };

  const getByteDescription = (index: number) => {
    switch (index) {
      case 0:
      case 1:
        return '프레임 시작 헤더 (Header: 0xAA 0xAA)';
      case 2:
      case 3:
        return '프레임 식별자 (PC ➔ Radar: 0x00 0x02)';
      case 4:
        return `명령어 코드 (Instruction: 0x${cmdType})`;
      case 5:
        if (cmdType === '8E') {
          const inst = params.installationMode === 0 ? '가로' : '세로';
          const work = params.workMode === 0 ? 'Touch' : 'Last';
          return `설치 모드 (${inst}) + 작동 모드 (${work})`;
        }
        return '예비 바이트 (0x00)';
      case 6:
        return cmdType === '8E' ? `민감도 레벨 (${params.sensitivity})` : '예비 바이트 (0x00)';
      case 7:
        return cmdType === '8E' ? `최저 속도 제한 (${params.lowerSpeedLimit} km/h)` : '예비 바이트 (0x00)';
      case 8:
        return cmdType === '8E' ? `설치 각도 보정 (${params.angle}°)` : '예비 바이트 (0x00)';
      case 9:
        return cmdType === '8E'
          ? `응답 속도 (${RESPONSE_TIME_LABELS[params.responseTime] || '500ms'})`
          : '예비 바이트 (0x00)';
      case 10:
        return cmdType === '8E' ? `최고 속도 제한 (${params.upperSpeedLimit} km/h)` : '예비 바이트 (0x00)';
      case 11:
        return cmdType === '8E'
          ? `감지 방향 (${params.direction === 0 ? '다가옴' : params.direction === 1 ? '멀어짐' : '양방향'})`
          : '예비 바이트 (0x00)';
      case 12:
      case 13:
        return '프레임 종료 꼬리 (Tail: 0x55 0x55)';
      default:
        return '';
    }
  };

  return (
    <section className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl flex flex-col justify-between backdrop-blur-sm relative">
      <div className="space-y-5">
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
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-semibold text-white">
                  패킷 생성기 (PC ➔ Radar)
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
              <p className="text-xs text-slate-400">명령어 선택 및 파라미터 프레임 구성</p>
            </div>
          </div>

          {/* Quick Presets & Favorites Trigger */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => applyPreset('school_zone')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium border border-slate-700 transition-colors"
            >
              스쿨존 30km
            </button>
            <button
              onClick={() => applyPreset('urban_50')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium border border-slate-700 transition-colors"
            >
              도심 50km
            </button>
            <button
              onClick={() => applyPreset('highway')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium border border-slate-700 transition-colors"
            >
              고속 100km
            </button>

            {/* Presets & Favorites Modal Trigger */}
            <button
              onClick={() => setShowPresetsModal(true)}
              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 rounded text-[11px] font-medium border border-amber-500/40 transition-colors flex items-center gap-1"
              title="저장된 즐겨찾기 및 프리셋 관리"
            >
              <Star className="w-3 h-3 text-amber-400 fill-amber-400/40" />
              <span>즐겨찾기 ({userPresets.length})</span>
            </button>

            {/* Quick Save Current Preset Button */}
            <button
              onClick={() => setIsSavingPreset(!isSavingPreset)}
              className="p-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded text-[11px] font-medium border border-slate-700 transition-colors"
              title="현재 설정을 즐겨찾기에 추가"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Feedback Message Banner */}
        {feedbackMsg && (
          <div className="p-2 px-3 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-200 text-xs font-mono flex items-center justify-between animate-in fade-in duration-150">
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Inline Save Preset Input Panel */}
        {isSavingPreset && (
          <div className="p-3 bg-slate-950 rounded-xl border border-blue-900/60 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <BookmarkPlus className="w-3.5 h-3.5" />
                현재 패킷 설정을 새 즐겨찾기/프리셋으로 저장
              </span>
              <button
                onClick={() => setIsSavingPreset(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCustomPreset();
                }}
                placeholder="프리셋 이름 (예: 스쿨존 야간 20km, 주차장 진입로)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                autoFocus
              />
              <button
                onClick={handleSaveCustomPreset}
                disabled={!newPresetName.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                저장하기
              </button>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              저장 내용: 명령 0x{cmdType} · {params.lowerSpeedLimit}~{params.upperSpeedLimit}km/h · 감도 L{params.sensitivity} · {params.angle}°
            </div>
          </div>
        )}

        {/* Command Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            명령어 타입 (Command Type)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: '71', label: '설정값 조회', hex: '0x71', desc: 'Read Params' },
              { id: '8E', label: '파라미터 설정', hex: '0x8E', desc: 'Set Params' },
              { id: '02', label: '버전 확인', hex: '0x02', desc: 'Read Version' },
              { id: 'FF', label: '예비 설정 저장', hex: '0xFF', desc: 'Reserve Save' },
              { id: 'F2', label: '공장 초기화', hex: '0xF2', desc: 'Factory Reset' },
            ].map((item) => {
              const isActive = cmdType === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCmdType(item.id as CommandType)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-blue-600/20 border-blue-500/80 text-white shadow-md shadow-blue-950 ring-1 ring-blue-500/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-400">{item.hex}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
                  </div>
                  <div className="text-xs font-medium text-slate-200 mt-1 truncate">{item.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parameter Setting Grid (Visible when 0x8E is selected) */}
        {cmdType === '8E' && (
          <div className="bg-slate-950/70 p-4 rounded-xl border border-blue-950/60 shadow-inner space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-blue-400 font-medium pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                레이더 상세 파라미터 구성 (Byte 5 ~ Byte 11)
              </span>
              <button
                onClick={() => setParams({ ...DEFAULT_RADAR_PARAMS })}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                기본값 복원
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Installation Mode */}
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  설치 모드 (Installation)
                </label>
                <select
                  value={params.installationMode}
                  onChange={(e) =>
                    setParams({ ...params, installationMode: parseInt(e.target.value, 10) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="0">0 - 가로 수평 (Crosswise)</option>
                  <option value="1">1 - 세로 수직 (Lengthwise)</option>
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">Byte 5 상위 4비트</span>
              </div>

              {/* Work Mode */}
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  작동 모드 (Work Mode)
                </label>
                <select
                  value={params.workMode}
                  onChange={(e) => setParams({ ...params, workMode: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="0">0 - Touch (감지 즉시 출력)</option>
                  <option value="1">1 - Last (지속/최종 출력)</option>
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">Byte 5 하위 4비트</span>
              </div>

              {/* Sensitivity */}
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-slate-400 font-medium">민감도 (Sensitivity)</label>
                  <span className="text-xs font-mono font-bold text-cyan-400">레벨 {params.sensitivity}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="1"
                  value={params.sensitivity}
                  onChange={(e) => setParams({ ...params, sensitivity: clamp(e.target.value, 1, 3) })}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>1 (저감도)</span>
                  <span>2 (보통)</span>
                  <span>3 (최고)</span>
                </div>
              </div>

              {/* Direction */}
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  감지 방향 (Direction)
                </label>
                <select
                  value={params.direction}
                  onChange={(e) => setParams({ ...params, direction: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="0">0 - 다가옴 (Coming)</option>
                  <option value="1">1 - 멀어짐 (Leaving)</option>
                  <option value="2">2 - 양방향 (Both/None)</option>
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">Byte 11</span>
              </div>

              {/* Lower Speed Limit */}
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  최저 속도 (Lower Limit)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={params.lowerSpeedLimit}
                    onChange={(e) =>
                      setParams({ ...params, lowerSpeedLimit: clamp(e.target.value, 1, 200) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-xs text-slate-400 font-mono">km/h</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">1 ~ 200 km/h (Byte 7)</span>
              </div>

              {/* Upper Speed Limit */}
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  최고 속도 (Upper Limit)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="10"
                    max="250"
                    value={params.upperSpeedLimit}
                    onChange={(e) =>
                      setParams({ ...params, upperSpeedLimit: clamp(e.target.value, 10, 250) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-xs text-slate-400 font-mono">km/h</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">10 ~ 250 km/h (Byte 10)</span>
              </div>

              {/* Angle Correction */}
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-slate-400 font-medium">설치 각도 (Angle)</label>
                  <span className="text-xs font-mono font-bold text-amber-400">{params.angle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={params.angle}
                  onChange={(e) => setParams({ ...params, angle: clamp(e.target.value, 0, 30) })}
                  className="w-full accent-amber-500"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">0° ~ 30° 보정 (Byte 8)</span>
              </div>

              {/* Response Time */}
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  응답 시간 (Response Time)
                </label>
                <select
                  value={params.responseTime}
                  onChange={(e) =>
                    setParams({ ...params, responseTime: clamp(e.target.value, 1, 7) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="1">1 - 50ms</option>
                  <option value="2">2 - 100ms</option>
                  <option value="3">3 - 200ms</option>
                  <option value="4">4 - 300ms</option>
                  <option value="5">5 - 500ms (기본)</option>
                  <option value="6">6 - 1000ms (1초)</option>
                  <option value="7">7 - 2000ms (2초)</option>
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">Byte 9</span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive 14-Byte Frame Inspector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              14바이트 프레임 맵 (클릭 시 세부 설명)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">총 14 Bytes</span>
          </div>

          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            {packetBytes.map((b, idx) => {
              const hexVal = b.toString(16).padStart(2, '0').toUpperCase();
              const isSelected = selectedByteIndex === idx;

              let colorStyle = 'bg-slate-900 text-slate-300 border-slate-800';
              if (idx === 0 || idx === 1) colorStyle = 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60';
              else if (idx === 2 || idx === 3) colorStyle = 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60';
              else if (idx === 4) colorStyle = 'bg-blue-950/80 text-blue-300 border-blue-700/80 font-bold';
              else if (idx >= 5 && idx <= 11) colorStyle = 'bg-slate-850 text-emerald-300 border-emerald-900/50';
              else if (idx === 12 || idx === 13) colorStyle = 'bg-amber-950/70 text-amber-300 border-amber-800/60';

              if (isSelected) {
                colorStyle += ' ring-2 ring-white scale-105 z-10';
              }

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedByteIndex(isSelected ? null : idx)}
                  className={`p-1.5 rounded-lg border text-center transition-all ${colorStyle}`}
                  title={`[Byte ${idx}] 0x${hexVal} - ${getByteDescription(idx)}`}
                >
                  <div className="text-[9px] font-mono opacity-60">[{idx}]</div>
                  <div className="text-xs font-mono font-bold mt-0.5">{hexVal}</div>
                </button>
              );
            })}
          </div>

          {selectedByteIndex !== null && (
            <div className="mt-2 p-2.5 bg-slate-950 rounded-lg border border-slate-700 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-blue-400 mr-2">
                  Byte [{selectedByteIndex}] = 0x
                  {packetBytes[selectedByteIndex].toString(16).padStart(2, '0').toUpperCase()} (
                  {packetBytes[selectedByteIndex]})
                </span>
                <span className="text-slate-300">{getByteDescription(selectedByteIndex)}</span>
              </div>
              <button
                onClick={() => setSelectedByteIndex(null)}
                className="text-slate-500 hover:text-slate-300 text-[11px]"
              >
                닫기
              </button>
            </div>
          )}
        </div>

        {/* Generated Hex Output Card */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            생성된 패킷 (Hex Frame)
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 font-mono-code bg-black/90 border border-slate-700 text-emerald-400 text-base md:text-lg p-3 rounded-xl tracking-wider select-all shadow-inner overflow-x-auto text-center sm:text-left">
              {generatedHex}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleCopy('hex')}
                className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
                title="Hex 문자열 복사"
              >
                {copiedFormat === 'hex' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>Hex</span>
              </button>

              <button
                onClick={() => handleCopy('c')}
                className="px-2.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-colors flex items-center gap-1 text-xs font-medium"
                title="C/C++ 배열 포맷으로 복사"
              >
                {copiedFormat === 'c' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>C</span>
              </button>

              <button
                onClick={() => handleCopy('python')}
                className="px-2.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-colors flex items-center gap-1 text-xs font-medium"
                title="Python 바이트 포맷으로 복사"
              >
                {copiedFormat === 'python' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="text-amber-400 font-mono text-xs font-bold">Py</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Transmission & Workflow Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2.5">
          <button
            onClick={() => onSendToParser(generatedHex)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
            title="현재 생성된 패킷을 오른쪽 데이터 분석기에 입력하여 테스트합니다"
          >
            <span>분석기로 전송 (Send to Parser)</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => onTransmitCommand(packetBytes, `명령어 전송 (0x${cmdType})`)}
            disabled={isTransmitting}
            className="flex-1 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>레이더로 전송 (Transmit Packet)</span>
          </button>
        </div>
      </div>

      {/* Presets / Favorites Management Modal */}
      {showPresetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  프리셋 및 즐겨찾기 보관함 (Favorites)
                </h3>
              </div>
              <button
                onClick={() => setShowPresetsModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Built-in Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                기본 표준 프리셋 (Built-in)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    applyPreset('school_zone');
                    setShowPresetsModal(false);
                  }}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-600 text-left transition-colors"
                >
                  <div className="text-xs font-semibold text-white">어린이보호구역</div>
                  <div className="text-[10px] text-slate-400">30km/h 제한 · 감도 3 · 300ms</div>
                </button>
                <button
                  onClick={() => {
                    applyPreset('urban_50');
                    setShowPresetsModal(false);
                  }}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-600 text-left transition-colors"
                >
                  <div className="text-xs font-semibold text-white">도심 일반도로</div>
                  <div className="text-[10px] text-slate-400">50km/h 제한 · 감도 3 · 500ms</div>
                </button>
                <button
                  onClick={() => {
                    applyPreset('highway');
                    setShowPresetsModal(false);
                  }}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-600 text-left transition-colors"
                >
                  <div className="text-xs font-semibold text-white">고속도로 감지</div>
                  <div className="text-[10px] text-slate-400">100km/h+ · 고감도 · 100ms</div>
                </button>
                <button
                  onClick={() => {
                    applyPreset('alley_10');
                    setShowPresetsModal(false);
                  }}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-600 text-left transition-colors"
                >
                  <div className="text-xs font-semibold text-white">골목길 / 보행로</div>
                  <div className="text-[10px] text-slate-400">10km/h 저속 · 감도 2 · 200ms</div>
                </button>
              </div>
            </div>

            {/* User Custom Saved Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  사용자 저장 즐겨찾기 ({userPresets.length})
                </span>
                <button
                  onClick={() => {
                    setShowPresetsModal(false);
                    setIsSavingPreset(true);
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <BookmarkPlus className="w-3 h-3" />
                  <span>현재 설정 저장</span>
                </button>
              </div>

              {userPresets.length === 0 ? (
                <div className="p-6 bg-slate-950 rounded-xl border border-slate-800/80 text-center text-xs text-slate-500">
                  아직 저장된 사용자 즐겨찾기가 없습니다. 상단의 '★ 즐겨찾기' 옆 북마크 버튼으로 현재 설정을 저장하세요.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {userPresets.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleLoadCustomPreset(p)}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-600 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          0x{p.cmdType} · {p.params.lowerSpeedLimit}~{p.params.upperSpeedLimit}km/h · L{p.params.sensitivity} · {p.params.angle}° ({p.createdAt})
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-cyan-400 font-medium px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                          불러오기
                        </span>
                        <button
                          onClick={(e) => handleDeleteCustomPreset(p.id, e)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowPresetsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
