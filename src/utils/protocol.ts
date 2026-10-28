import { ByteDetail, CommandType, ParsedPacketResult, RadarParameters } from '../types/protocol';

export const RESPONSE_TIME_LABELS: Record<number, string> = {
  1: '50ms',
  2: '100ms',
  3: '200ms',
  4: '300ms',
  5: '500ms',
  6: '1000ms',
  7: '2000ms',
};

export const DEFAULT_RADAR_PARAMS: RadarParameters = {
  installationMode: 0, // Crosswise
  workMode: 1, // Last
  sensitivity: 3, // Level 3
  lowerSpeedLimit: 5, // 5 km/h
  angle: 0, // 0 deg
  responseTime: 5, // 500ms
  upperSpeedLimit: 200, // 200 km/h
  direction: 0, // Coming
};

export function clamp(val: number | string, min: number, max: number): number {
  const num = typeof val === 'string' ? parseInt(val, 10) : val;
  if (isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

/**
 * Builds a 14-byte command packet from PC to TSR20 Radar
 */
export function buildRadarCommand(
  type: CommandType,
  params: RadarParameters
): { bytes: number[]; hex: string } {
  const packet = new Array(14).fill(0);

  // Header
  packet[0] = 0xAA;
  packet[1] = 0xAA;

  // Frame Type for PC->Radar is 0x00 0x02
  packet[2] = 0x00;
  packet[3] = 0x02;

  // Instruction byte
  packet[4] = parseInt(type, 16);

  if (type === '8E') {
    // Parameter Setting
    const instMode = clamp(params.installationMode, 0, 1);
    const workMode = clamp(params.workMode, 0, 1);
    packet[5] = ((instMode & 0x0f) << 4) | (workMode & 0x0f);
    packet[6] = clamp(params.sensitivity, 1, 3);
    packet[7] = clamp(params.lowerSpeedLimit, 1, 200);
    packet[8] = clamp(params.angle, 0, 30);
    packet[9] = clamp(params.responseTime, 1, 7);
    packet[10] = clamp(params.upperSpeedLimit, 10, 250);
    packet[11] = clamp(params.direction, 0, 2);
  } else {
    // 0x71, 0x02, 0xFF, 0xF2 - Data bytes are 0x00
    for (let i = 5; i <= 11; i++) {
      packet[i] = 0x00;
    }
  }

  // Tail
  packet[12] = 0x55;
  packet[13] = 0x55;

  const hex = packet.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

  return { bytes: packet, hex };
}

/**
 * Format raw byte array to uppercase hex string with spaces
 */
export function formatHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

/**
 * Clean user hex input: strips prefixes like 0x, delimiters (spaces, commas, brackets, dashes)
 */
export function cleanHexString(input: string): string {
  return input
    .replace(/0x/gi, '')
    .replace(/[^a-fA-F0-9]/g, '');
}

/**
 * Parse any TSR20 14-byte frame into structured telemetry
 */
export function parseRadarPacket(input: string | number[]): ParsedPacketResult {
  let bytes: number[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (Array.isArray(input)) {
    bytes = [...input];
  } else {
    const raw = cleanHexString(input);
    if (raw.length === 0) {
      return {
        rawHex: '',
        bytes: [],
        isValidLength: false,
        isValidHeader: false,
        isValidTail: false,
        isValid: false,
        frameTypeHex: '',
        frameCategory: 'MALFORMED',
        summaryTitle: '입력된 데이터 없음',
        byteDetails: [],
        warnings: [],
        errors: ['분석할 Hex 데이터가 비어 있습니다.'],
      };
    }

    if (raw.length % 2 !== 0) {
      errors.push('Hex 문자열의 길이가 유효하지 않습니다 (바이트 단위로 짝수 개수여야 합니다).');
    }

    for (let i = 0; i < raw.length; i += 2) {
      bytes.push(parseInt(raw.substring(i, i + 2), 16));
    }
  }

  const rawHex = formatHex(bytes);
  const isValidLength = bytes.length === 14;
  if (!isValidLength) {
    if (bytes.length < 14) {
      errors.push(`패킷 길이가 부족합니다 (${bytes.length}/14 바이트).`);
    } else {
      warnings.push(`패킷 길이가 ${bytes.length} 바이트입니다 (TSR20 표준 규격은 14바이트). 앞선 14바이트를 기준으로 파싱합니다.`);
    }
  }

  const isValidHeader = bytes.length >= 2 && bytes[0] === 0xAA && bytes[1] === 0xAA;
  if (!isValidHeader) {
    errors.push('잘못된 프레임 헤더 (0xAA 0xAA 가 필요합니다).');
  }

  const isValidTail = bytes.length >= 14 && bytes[12] === 0x55 && bytes[13] === 0x55;
  if (!isValidTail && bytes.length >= 14) {
    errors.push('잘못된 프레임 꼬리 (0x55 0x55 가 필요합니다).');
  }

  const isValid = isValidLength && isValidHeader && isValidTail && errors.length === 0;

  // Frame type bytes [2], [3]
  const byte2 = bytes[2] ?? 0;
  const byte3 = bytes[3] ?? 0;
  const frameTypeHex = `${byte2.toString(16).padStart(2, '0')} ${byte3.toString(16).padStart(2, '0')}`.toUpperCase();

  const byteDetails: ByteDetail[] = [];

  // Populate byte-by-byte visual decomposition
  const byteNames = [
    'Header 1',
    'Header 2',
    'Frame Type High',
    'Frame Type Low',
    'Instruction / Cmd',
    'Param / Data 1',
    'Param / Data 2',
    'Param / Data 3',
    'Param / Data 4',
    'Param / Data 5',
    'Param / Data 6',
    'Param / Data 7',
    'Tail 1',
    'Tail 2',
  ];

  for (let i = 0; i < Math.min(bytes.length, 14); i++) {
    const val = bytes[i];
    const hex = val.toString(16).padStart(2, '0').toUpperCase();
    let desc = '';
    let category: ByteDetail['category'] = 'data';

    if (i === 0 || i === 1) {
      category = val === 0xAA ? 'header' : 'error';
      desc = val === 0xAA ? 'Frame Start Header (0xAA)' : 'Invalid Header byte';
    } else if (i === 2 || i === 3) {
      category = 'frametype';
      desc = `Frame Identifier: 0x${hex}`;
    } else if (i === 4) {
      category = 'cmd';
      desc = `Command / Function Code: 0x${hex}`;
    } else if (i >= 5 && i <= 11) {
      category = 'param';
      desc = `Payload [${i - 4}]`;
    } else if (i === 12 || i === 13) {
      category = val === 0x55 ? 'tail' : 'error';
      desc = val === 0x55 ? 'Frame End Tail (0x55)' : 'Invalid Tail byte';
    }

    byteDetails.push({
      index: i,
      name: byteNames[i] || `Byte ${i}`,
      hex,
      dec: val,
      desc,
      category,
    });
  }

  const result: ParsedPacketResult = {
    rawHex,
    bytes,
    isValidLength,
    isValidHeader,
    isValidTail,
    isValid,
    frameTypeHex,
    frameCategory: 'UNKNOWN',
    summaryTitle: '알 수 없는 프레임 (Unknown Frame)',
    byteDetails,
    warnings,
    errors,
  };

  // If header check fails completely and no 14 bytes, return early
  if (bytes.length < 5) {
    result.frameCategory = 'MALFORMED';
    result.summaryTitle = '손상된 패킷 (Malformed Packet)';
    return result;
  }

  // 1. Target Status (0x0C 0x07) Radar -> PC
  if (byte2 === 0x0C && byte3 === 0x07) {
    result.frameCategory = 'TARGET_STATUS';
    result.summaryTitle = '차량 감지 목표물 상태 (Target Status)';

    const dirVal = (bytes[4] ?? 0) as 0 | 1 | 2;
    const dirStr =
      dirVal === 0 ? 'Coming (다가옴 / 접근)' : dirVal === 1 ? 'Leaving (멀어짐 / 이탈)' : 'No Direction (방향 미지정)';

    const speedHigh = bytes[9] ?? 0;
    const speedLow = bytes[10] ?? 0;
    const speedRaw = (speedHigh << 8) | speedLow;
    const speedMs = speedRaw / 10.0;
    const speedKmh = Number((speedMs * 3.6).toFixed(1));

    result.targetStatus = {
      direction: dirVal,
      directionStr: dirStr,
      speedRaw,
      speedMs: Number(speedMs.toFixed(1)),
      speedKmh,
    };

    // Update byte descriptions for target status
    if (byteDetails[4]) byteDetails[4].desc = `방향 (0:접근, 1:이탈, 2:미지정) = ${dirStr}`;
    if (byteDetails[9]) byteDetails[9].desc = `속도 상위바이트 (Speed High) = 0x${speedHigh.toString(16).padStart(2, '0')}`;
    if (byteDetails[10]) byteDetails[10].desc = `속도 하위바이트 (Speed Low) = 0x${speedLow.toString(16).padStart(2, '0')}`;
  }
  // 2. Return Radar Parameter (0x01 0x70) Radar -> PC
  else if (byte2 === 0x01 && byte3 === 0x70) {
    result.frameCategory = 'RETURN_PARAMETER';
    result.summaryTitle = '레이더 설정값 응답 (Radar Parameter Return)';

    if (bytes[4] === 0x71) {
      const b5 = bytes[5] ?? 0;
      const instMode = (b5 >> 4) & 0x0f;
      const workMode = b5 & 0x0f;
      const sensitivity = bytes[6] ?? 3;
      const lowerSpeedLimit = bytes[7] ?? 5;
      const angle = bytes[8] ?? 0;
      const respTime = bytes[9] ?? 5;
      const upperSpeedLimit = bytes[10] ?? 200;
      const dir = bytes[11] ?? 0;

      const instStr = instMode === 0 ? '가로 설치 (Crosswise)' : '세로 설치 (Lengthwise)';
      const workStr = workMode === 0 ? 'Touch (감지 즉시 출력)' : 'Last (지속/마지막 출력)';
      const respStr = RESPONSE_TIME_LABELS[respTime] || `${respTime}`;
      const dirStr = dir === 0 ? '다가옴 (Coming)' : dir === 1 ? '멀어짐 (Leaving)' : '양방향/없음 (Both/None)';

      result.radarParameters = {
        installationMode: instMode,
        installationModeStr: instStr,
        workMode,
        workModeStr: workStr,
        sensitivity,
        lowerSpeedLimit,
        angle,
        responseTime: respTime,
        responseTimeStr: respStr,
        upperSpeedLimit,
        direction: dir,
        directionStr: dirStr,
      };

      if (byteDetails[5]) byteDetails[5].desc = `설치(${instStr}) / 작동모드(${workStr})`;
      if (byteDetails[6]) byteDetails[6].desc = `민감도 = 레벨 ${sensitivity}`;
      if (byteDetails[7]) byteDetails[7].desc = `최저 속도 제한 = ${lowerSpeedLimit} km/h`;
      if (byteDetails[8]) byteDetails[8].desc = `설치 각도 보정 = ${angle}°`;
      if (byteDetails[9]) byteDetails[9].desc = `응답 시간 = ${respStr}`;
      if (byteDetails[10]) byteDetails[10].desc = `최고 속도 제한 = ${upperSpeedLimit} km/h`;
      if (byteDetails[11]) byteDetails[11].desc = `방향 감지 모드 = ${dirStr}`;
    }
  }
  // 3. Return Version No (0x00 0x04) Radar -> PC
  else if (byte2 === 0x00 && byte3 === 0x04) {
    result.frameCategory = 'RETURN_VERSION';
    result.summaryTitle = '레이더 펌웨어 버전 응답 (Firmware Version)';

    if (bytes[4] === 0x82) {
      const v1 = bytes[5] ?? 1;
      const v2 = bytes[6] ?? 0;
      const v3 = bytes[7] ?? 0;
      const versionStr = `V${v1}.${v2}.${v3}`;

      result.versionInfo = {
        major: v1,
        minor: v2,
        patch: v3,
        versionStr,
      };

      if (byteDetails[4]) byteDetails[4].desc = '버전 응답 식별자 (0x82)';
      if (byteDetails[5]) byteDetails[5].desc = `Major Version = ${v1}`;
      if (byteDetails[6]) byteDetails[6].desc = `Minor Version = ${v2}`;
      if (byteDetails[7]) byteDetails[7].desc = `Patch Version = ${v3}`;
    }
  }
  // 4. PC Command (0x00 0x02) PC -> Radar
  else if (byte2 === 0x00 && byte3 === 0x02) {
    result.frameCategory = 'COMMAND_PC';
    const cmdByte = bytes[4] ?? 0;
    if (cmdByte === 0x71) {
      result.summaryTitle = '파라미터 조회 명령 (Read Parameter 0x71)';
    } else if (cmdByte === 0x8e) {
      result.summaryTitle = '파라미터 설정 명령 (Parameter Setting 0x8E)';
      const b5 = bytes[5] ?? 0;
      const instMode = (b5 >> 4) & 0x0f;
      const workMode = b5 & 0x0f;
      const instStr = instMode === 0 ? '가로' : '세로';
      const workStr = workMode === 0 ? 'Touch' : 'Last';
      result.radarParameters = {
        installationMode: instMode,
        installationModeStr: instStr,
        workMode,
        workModeStr: workStr,
        sensitivity: bytes[6] ?? 3,
        lowerSpeedLimit: bytes[7] ?? 5,
        angle: bytes[8] ?? 0,
        responseTime: bytes[9] ?? 5,
        responseTimeStr: RESPONSE_TIME_LABELS[bytes[9] ?? 5] || '500ms',
        upperSpeedLimit: bytes[10] ?? 200,
        direction: bytes[11] ?? 0,
        directionStr: bytes[11] === 0 ? '다가옴' : bytes[11] === 1 ? '멀어짐' : '양방향',
      };
    } else if (cmdByte === 0x02) {
      result.summaryTitle = '버전 조회 명령 (Read Version 0x02)';
    } else if (cmdByte === 0xff) {
      result.summaryTitle = '설정 저장/예비 명령 (Reserve Setting 0xFF)';
    } else if (cmdByte === 0xf2) {
      result.summaryTitle = '공장 초기화 명령 (Factory Reset 0xF2)';
    } else {
      result.summaryTitle = `PC 전송 명령 (Command 0x${cmdByte.toString(16).toUpperCase()})`;
    }
  }

  return result;
}

/**
 * Format C/C++ style array representation
 */
export function exportToCArray(bytes: number[]): string {
  const hexItems = bytes.map((b) => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`);
  return `const uint8_t tsr20_cmd[${bytes.length}] = { ${hexItems.join(', ')} };`;
}

/**
 * Format Python style bytes representation
 */
export function exportToPython(bytes: number[]): string {
  const hexStr = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `cmd = bytes.fromhex("${hexStr}")`;
}

/**
 * Generate a target status frame for simulation
 * @param speedKmh Speed in km/h
 * @param direction 0: coming, 1: leaving, 2: none
 */
export function createTargetStatusFrame(speedKmh: number, direction: 0 | 1 | 2 = 0): { bytes: number[]; hex: string } {
  const packet = new Array(14).fill(0);
  packet[0] = 0xAA;
  packet[1] = 0xAA;
  packet[2] = 0x0C;
  packet[3] = 0x07;
  packet[4] = direction;

  // speedKmh to m/s * 10
  const speedMs = speedKmh / 3.6;
  const speedRaw = Math.round(speedMs * 10.0);

  packet[9] = (speedRaw >> 8) & 0xff;
  packet[10] = speedRaw & 0xff;

  packet[12] = 0x55;
  packet[13] = 0x55;

  return { bytes: packet, hex: formatHex(packet) };
}
