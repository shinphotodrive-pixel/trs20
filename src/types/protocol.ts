/**
 * TSR20 Speed Sign Radar Protocol Types
 * Baud Rate: 115200bps, 8N1 (RS232)
 * Frame Size: 14 Bytes Fixed
 */

export type CommandType = '71' | '8E' | '02' | 'FF' | 'F2';

export interface RadarParameters {
  installationMode: number; // 0: Crosswise (가로), 1: Lengthwise (세로)
  workMode: number; // 0: Touch, 1: Last
  sensitivity: number; // 1 ~ 3
  lowerSpeedLimit: number; // 1 ~ 200 km/h
  angle: number; // 0 ~ 30 deg
  responseTime: number; // 1: 50ms, 2: 100ms, 3: 200ms, 4: 300ms, 5: 500ms, 6: 1000ms, 7: 2000ms
  upperSpeedLimit: number; // 10 ~ 250 km/h
  direction: number; // 0: Coming (다가옴), 1: Leaving (멀어짐), 2: Both/None
}

export type FrameCategory = 
  | 'TARGET_STATUS'
  | 'RETURN_PARAMETER'
  | 'RETURN_VERSION'
  | 'COMMAND_PC'
  | 'RESERVE_SETTING'
  | 'FACTORY_RESET'
  | 'UNKNOWN'
  | 'MALFORMED';

export interface ByteDetail {
  index: number;
  name: string;
  hex: string;
  dec: number;
  desc: string;
  category: 'header' | 'frametype' | 'cmd' | 'param' | 'data' | 'tail' | 'error';
}

export interface ParsedPacketResult {
  rawHex: string;
  bytes: number[];
  isValidLength: boolean;
  isValidHeader: boolean;
  isValidTail: boolean;
  isValid: boolean;
  frameTypeHex: string;
  frameCategory: FrameCategory;
  summaryTitle: string;
  targetStatus?: {
    direction: 0 | 1 | 2;
    directionStr: string;
    speedRaw: number;
    speedMs: number;
    speedKmh: number;
  };
  radarParameters?: {
    installationMode: number;
    installationModeStr: string;
    workMode: number;
    workModeStr: string;
    sensitivity: number;
    lowerSpeedLimit: number;
    angle: number;
    responseTime: number;
    responseTimeStr: string;
    upperSpeedLimit: number;
    direction: number;
    directionStr: string;
  };
  versionInfo?: {
    major: number;
    minor: number;
    patch: number;
    versionStr: string;
  };
  byteDetails: ByteDetail[];
  warnings: string[];
  errors: string[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  rawTimeMs?: number;
  deltaTimeMs?: number;
  direction: 'TX' | 'RX';
  hex: string;
  frameType: string;
  summary: string;
  category: FrameCategory;
  status: 'success' | 'warning' | 'error';
}
