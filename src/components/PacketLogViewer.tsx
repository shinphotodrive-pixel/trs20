import React, { useState, useMemo } from 'react';
import { 
  History, 
  Trash2, 
  Download, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Zap,
  Activity
} from 'lucide-react';
import { LogEntry } from '../types/protocol';

interface PacketLogViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onSelectPacketForParsing: (hex: string) => void;
}

function formatDeltaTime(ms: number | undefined): string {
  if (ms === undefined || ms === null || ms === 0) return '--';
  if (ms < 1000) {
    return `+${ms}ms`;
  }
  return `+${(ms / 1000).toFixed(2)}s`;
}

function getDeltaTimeStyle(ms: number | undefined): string {
  if (ms === undefined || ms === null || ms === 0) return 'text-slate-600';
  if (ms <= 50) return 'text-cyan-300 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40';
  if (ms <= 350) return 'text-emerald-300 font-medium bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-800/30';
  if (ms <= 1000) return 'text-amber-300/90 font-medium';
  return 'text-slate-400';
}

export const PacketLogViewer: React.FC<PacketLogViewerProps> = ({
  logs,
  onClearLogs,
  onSelectPacketForParsing,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'TX' | 'RX' | 'TARGET' | 'ERROR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filter === 'TX' && log.direction !== 'TX') return false;
      if (filter === 'RX' && log.direction !== 'RX') return false;
      if (filter === 'TARGET' && log.category !== 'TARGET_STATUS') return false;
      if (filter === 'ERROR' && log.status !== 'error') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          log.hex.toLowerCase().includes(q) ||
          log.summary.toLowerCase().includes(q) ||
          log.frameType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, filter, searchQuery]);

  // Compute average latency statistics
  const latencyStats = useMemo(() => {
    const validDeltas = logs
      .map((l) => l.deltaTimeMs)
      .filter((d): d is number => d !== undefined && d > 0);

    if (validDeltas.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };

    const sum = validDeltas.reduce((acc, v) => acc + v, 0);
    const avg = Math.round(sum / validDeltas.length);
    const min = Math.min(...validDeltas);
    const max = Math.max(...validDeltas);

    return { avg, min, max, count: validDeltas.length };
  }, [logs]);

  const handleCopy = (id: string, hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const header = [
      'Timestamp',
      'Delta Time (ms)',
      'Direction',
      'Frame Type',
      'Raw Hex',
      'Summary',
      'Status',
    ];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      l.deltaTimeMs ?? 0,
      `"${l.direction}"`,
      `"${l.frameType}"`,
      `"${l.hex}"`,
      `"${l.summary.replace(/"/g, '""')}"`,
      `"${l.status}"`,
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tsr20_radar_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (logs.length === 0) return;
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tsr20_radar_logs_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-semibold text-white">
                통신 트래픽 로그 (Packet Traffic Log)
              </h2>
              <span className="text-xs font-mono text-slate-400">({logs.length}건 기록됨)</span>
              {latencyStats.count > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>평균 지연: <strong>{latencyStats.avg}ms</strong></span>
                  <span className="text-slate-500">({latencyStats.min}~{latencyStats.max}ms)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              송수신 패킷 실시간 모니터링 및 델타 타임(Δt) 기반 통신 지연 분석
            </p>
          </div>
        </div>

        {/* Filter Buttons & Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['ALL', 'TX', 'RX', 'TARGET', 'ERROR'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'ALL'
                  ? '전체'
                  : f === 'TX'
                  ? '송신 (TX)'
                  : f === 'RX'
                  ? '수신 (RX)'
                  : f === 'TARGET'
                  ? '목표물 (Target)'
                  : '오류 (Error)'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            title="CSV 파일로 다운로드 (델타 타임 포함)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800/60 text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            title="로그 비우기"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>지우기</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hex 바이트, 프레임 타입, 요약 내용 검색..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Log Table with '델타 타임' (Delta Time) column */}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            기록된 통신 패킷이 없습니다. 상단 패킷 생성기에서 명령을 전송하거나 시뮬레이터를 켜보세요.
          </div>
        ) : (
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] sticky top-0 border-b border-slate-800 z-10">
              <tr>
                <th className="py-2 px-3">시간 (Time)</th>
                <th className="py-2 px-3 text-cyan-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>델타 타임 (Δt)</span>
                </th>
                <th className="py-2 px-3">방향</th>
                <th className="py-2 px-3">프레임</th>
                <th className="py-2 px-3">Raw Hex (14 Bytes)</th>
                <th className="py-2 px-3 font-sans">내용 요약</th>
                <th className="py-2 px-3 text-right font-sans">동작</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => {
                const isTx = log.direction === 'TX';
                const deltaStyle = getDeltaTimeStyle(log.deltaTimeMs);
                const deltaText = formatDeltaTime(log.deltaTimeMs);

                return (
                  <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                    {/* Timestamp */}
                    <td className="py-2 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    {/* DELTA TIME COLUMN */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`text-[11px] font-mono tracking-tight ${deltaStyle}`}>
                        {deltaText}
                      </span>
                    </td>

                    {/* Direction TX/RX */}
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isTx
                            ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                        }`}
                      >
                        {isTx ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownLeft className="w-3 h-3" />
                        )}
                        <span>{log.direction}</span>
                      </span>
                    </td>

                    {/* Frame Type */}
                    <td className="py-2 px-3 text-cyan-300 font-bold whitespace-nowrap">
                      {log.frameType}
                    </td>

                    {/* Raw Hex */}
                    <td className="py-2 px-3 text-slate-300 truncate max-w-[200px] sm:max-w-xs">
                      {log.hex}
                    </td>

                    {/* Summary */}
                    <td className="py-2 px-3 font-sans text-slate-300 truncate max-w-[150px] sm:max-w-sm">
                      {log.summary}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleCopy(log.id, log.hex)}
                          className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          title="Hex 복사"
                        >
                          {copiedId === log.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onSelectPacketForParsing(log.hex)}
                          className="p-1 text-slate-500 hover:text-cyan-400 rounded hover:bg-slate-800 transition-colors"
                          title="분석기에 로드"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};
