/**
 * Web Serial API service for TSR20 Radar RS232 connection
 * Standard: 115200 bps, 8 Data Bits, 1 Stop Bit, No Parity
 */

export interface SerialConnectionStatus {
  isConnected: boolean;
  portInfo: string | null;
  baudRate: number;
}

export type PacketCallback = (bytes: number[]) => void;
export type StatusCallback = (status: SerialConnectionStatus) => void;

class WebSerialManager {
  private port: any | null = null;
  private reader: any | null = null;
  private writer: any | null = null;
  private keepReading = false;
  private buffer: number[] = [];
  private onPacketCallbacks: Set<PacketCallback> = new Set();
  private onStatusCallbacks: Set<StatusCallback> = new Set();
  private baudRate = 115200;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public getStatus(): SerialConnectionStatus {
    return {
      isConnected: this.port !== null && this.keepReading,
      portInfo: this.port ? 'TSR20 RS232 Serial Port' : null,
      baudRate: this.baudRate,
    };
  }

  public onPacket(callback: PacketCallback): () => void {
    this.onPacketCallbacks.add(callback);
    return () => this.onPacketCallbacks.delete(callback);
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.onStatusCallbacks.add(callback);
    return () => this.onStatusCallbacks.delete(callback);
  }

  private notifyStatus(): void {
    const status = this.getStatus();
    this.onStatusCallbacks.forEach((cb) => cb(status));
  }

  public async connect(baudRate: number = 115200): Promise<{ success: boolean; message: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        message: '현재 브라우저에서 Web Serial API를 지원하지 않습니다 (Chrome / Edge 사용 권장).',
      };
    }

    try {
      // Prompt user to pick a serial port
      const serial = (navigator as any).serial;
      this.port = await serial.requestPort();
      this.baudRate = baudRate;

      await this.port.open({
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        bufferSize: 2048,
        flowControl: 'none',
      });

      this.keepReading = true;
      this.notifyStatus();
      this.startReadingLoop();

      return { success: true, message: `시리얼 포트 연결 성공 (${this.baudRate} bps, 8N1)` };
    } catch (err: any) {
      this.port = null;
      this.keepReading = false;
      this.notifyStatus();
      return {
        success: false,
        message: err?.message || '시리얼 포트를 열지 못했습니다.',
      };
    }
  }

  public async disconnect(): Promise<void> {
    this.keepReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        // ignore
      }
      this.reader = null;
    }

    if (this.writer) {
      try {
        await this.writer.close();
      } catch (e) {
        // ignore
      }
      this.writer = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        // ignore
      }
      this.port = null;
    }

    this.buffer = [];
    this.notifyStatus();
  }

  public async sendBytes(bytes: number[]): Promise<{ success: boolean; error?: string }> {
    if (!this.port || !this.port.writable) {
      return { success: false, error: '시리얼 포트가 열려있지 않습니다.' };
    }

    try {
      const writer = this.port.writable.getWriter();
      const data = new Uint8Array(bytes);
      await writer.write(data);
      writer.releaseLock();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || '데이터 전송 실패' };
    }
  }

  private async startReadingLoop(): Promise<void> {
    while (this.port && this.port.readable && this.keepReading) {
      try {
        this.reader = this.port.readable.getReader();
        while (this.keepReading) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value && value.length > 0) {
            this.handleIncomingChunk(value);
          }
        }
      } catch (error) {
        // Stream reading error / port unplugged
        break;
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch (e) {
            // ignore
          }
          this.reader = null;
        }
      }
    }

    if (this.keepReading) {
      // Unexpected disconnect
      await this.disconnect();
    }
  }

  private handleIncomingChunk(chunk: Uint8Array): void {
    for (let i = 0; i < chunk.length; i++) {
      this.buffer.push(chunk[i]);
    }

    // Packet frame synchronization: search for AA AA ... 55 55 (14 bytes)
    while (this.buffer.length >= 14) {
      // Find header
      const headerIdx = this.findHeaderIndex(this.buffer);
      if (headerIdx === -1) {
        // No header in current buffer, discard all except last byte if it might be 0xAA
        if (this.buffer[this.buffer.length - 1] === 0xaa) {
          this.buffer = [0xaa];
        } else {
          this.buffer = [];
        }
        break;
      }

      // Drop bytes prior to header
      if (headerIdx > 0) {
        this.buffer.splice(0, headerIdx);
      }

      // Check if we have 14 bytes starting from header
      if (this.buffer.length < 14) {
        break;
      }

      // Check tail
      if (this.buffer[12] === 0x55 && this.buffer[13] === 0x55) {
        // Valid 14-byte frame found!
        const packet = this.buffer.splice(0, 14);
        this.emitPacket(packet);
      } else {
        // Not a valid 14-byte frame tail, discard header byte to search for next occurrence
        this.buffer.shift();
      }
    }
  }

  private findHeaderIndex(arr: number[]): number {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === 0xaa && arr[i + 1] === 0xaa) {
        return i;
      }
    }
    return -1;
  }

  private emitPacket(packet: number[]): void {
    this.onPacketCallbacks.forEach((cb) => {
      try {
        cb(packet);
      } catch (e) {
        console.error('Error in packet callback:', e);
      }
    });
  }
}

export const webSerialManager = new WebSerialManager();
