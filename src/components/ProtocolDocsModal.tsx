import React from 'react';
import { X, BookOpen, Cpu, ShieldAlert, Zap, Radio, CheckCircle } from 'lucide-react';

interface ProtocolDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProtocolDocsModal: React.FC<ProtocolDocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                TSR20 Speed Sign Radar 기술 규격 및 통신 프로토콜 매뉴얼
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Baud Rate 115200bps · 8 Data bits · 1 Stop bit · No Parity (8N1)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 text-xs text-slate-300">
          {/* Hardware Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" />
                레이더 RF 사양
              </span>
              <p className="text-slate-300">중심 주파수: 24.125 GHz (K-Band)</p>
              <p className="text-slate-400">감지 거리: 10m ~ 200m+</p>
              <p className="text-slate-400">속도 측정 범위: 1 ~ 250 km/h</p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                통신 및 전원 인터페이스
              </span>
              <p className="text-slate-300">시리얼 규격: RS232 레벨 (115200bps)</p>
              <p className="text-slate-400">동작 전압: 9V ~ 15V DC (권장 12V)</p>
              <p className="text-slate-400">소비 전력: 평균 1.2W (저전력 모드 지원)</p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" />
                프레임 사양
              </span>
              <p className="text-slate-300">고정 길이: 14 Bytes</p>
              <p className="text-slate-400">Header: 0xAA 0xAA (2B)</p>
              <p className="text-slate-400">Tail: 0x55 0x55 (2B)</p>
            </div>
          </div>

          {/* Pinout Guide */}
          <div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              배선 및 핀맵 가이드 (Wiring Connection)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left font-mono">
                <thead className="bg-slate-900 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">와이어 색상</th>
                    <th className="py-2 px-3">신호명</th>
                    <th className="py-2 px-3 font-sans">설명 및 권장 연결</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="py-2 px-3 text-red-400 font-bold">Red (적색)</td>
                    <td className="py-2 px-3">VCC (+12V)</td>
                    <td className="py-2 px-3 font-sans">DC 9V ~ 15V 전원 입력 (+)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-400 font-bold">Black (흑색)</td>
                    <td className="py-2 px-3">GND (접지)</td>
                    <td className="py-2 px-3 font-sans">공통 접지 (Power Ground & Signal Ground)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-yellow-400 font-bold">Yellow/White (황색/백색)</td>
                    <td className="py-2 px-3">RS232 TX</td>
                    <td className="py-2 px-3 font-sans">레이더 송신 (PC/컨트롤러의 RS232 RX 핀에 연결)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-green-400 font-bold">Green/Blue (녹색/청색)</td>
                    <td className="py-2 px-3">RS232 RX</td>
                    <td className="py-2 px-3 font-sans">레이더 수신 (PC/컨트롤러의 RS232 TX 핀에 연결)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Frame Format Table */}
          <div>
            <h3 className="text-sm font-bold text-white mb-2">프레임 구조 상세 (14 Bytes)</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 font-mono">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">바이트 번호</th>
                    <th className="py-2 px-3">길이</th>
                    <th className="py-2 px-3">값 / 형식</th>
                    <th className="py-2 px-3 font-sans">역할 및 설명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr>
                    <td className="py-2 px-3 text-cyan-400">Byte 0 ~ 1</td>
                    <td className="py-2 px-3">2B</td>
                    <td className="py-2 px-3">0xAA 0xAA</td>
                    <td className="py-2 px-3 font-sans">프레임 시작 식별자 (Start Header)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-400">Byte 2 ~ 3</td>
                    <td className="py-2 px-3">2B</td>
                    <td className="py-2 px-3">0x00 0x02 / 0x0C 0x07 / 0x01 0x70 / 0x00 0x04</td>
                    <td className="py-2 px-3 font-sans">
                      프레임 타입 ID (PC송신: 0x0002, 목표물: 0x0C07, 파라미터응답: 0x0170, 버전: 0x0004)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-blue-400">Byte 4</td>
                    <td className="py-2 px-3">1B</td>
                    <td className="py-2 px-3">명령 코드 (0x71, 0x8E, 0x02, 0xFF, 0xF2 등)</td>
                    <td className="py-2 px-3 font-sans">명령어 기능 코드 / 목표물 상태에선 방향(0:접근, 1:이탈)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-emerald-400">Byte 5 ~ 11</td>
                    <td className="py-2 px-3">7B</td>
                    <td className="py-2 px-3">페이로드 데이터</td>
                    <td className="py-2 px-3 font-sans">
                      파라미터 설정값 또는 속도 데이터 (목표물 상태: Byte 9~10 속도 상위/하위 바이트, m/s * 10)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-amber-400">Byte 12 ~ 13</td>
                    <td className="py-2 px-3">2B</td>
                    <td className="py-2 px-3">0x55 0x55</td>
                    <td className="py-2 px-3 font-sans">프레임 종료 식별자 (End Tail)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Speed Calculation & Angle Correction */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              속도 계산 공식 및 설치 각도 코사인 보정
            </h4>
            <div className="space-y-1.5 text-slate-300 font-mono">
              <p>• 속도 디코딩 (Target Status 0C 07):</p>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs">
                <code>SpeedRaw = (Byte[9] &lt;&lt; 8) | Byte[10]</code><br />
                <code>Speed(m/s) = SpeedRaw / 10.0</code><br />
                <code>Speed(km/h) = Speed(m/s) * 3.6</code>
              </div>
              <p className="mt-2">• 도로변 경사 설치 시 각도 보정 공식 (Cosine Correction):</p>
              <p className="font-sans text-slate-400">
                도로 측면에 레이더를 설치하면 주행 방향과 각도 &theta;가 발생합니다. TSR20 내부 파라미터 Byte 8 (0&deg;~30&deg;)에 각도를 입력하면, 레이더가 v = v_measured / cos(&theta;)로 자동 보정하여 정밀한 주행 속도를 출력합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
