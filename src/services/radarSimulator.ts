import { RadarParameters } from '../types/protocol';
import { createTargetStatusFrame, DEFAULT_RADAR_PARAMS } from '../utils/protocol';

export type SimulatorPacketCallback = (packetBytes: number[]) => void;

class RadarSimulator {
  private isEnabled = true;
  private currentParams: RadarParameters = { ...DEFAULT_RADAR_PARAMS };
  private onPacketCallback: SimulatorPacketCallback | null = null;
  private autoTrafficInterval: any | null = null;
  private autoTrafficFrequency = 3000; // ms
  private trafficMinSpeed = 35;
  private trafficMaxSpeed = 75;

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled && this.autoTrafficInterval) {
      this.stopAutoTraffic();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setPacketCallback(cb: SimulatorPacketCallback | null): void {
    this.onPacketCallback = cb;
  }

  public getCurrentParams(): RadarParameters {
    return { ...this.currentParams };
  }

  /**
   * Process a command received from PC (e.g. 0x00 0x02 0x71 ...)
   * Simulates radar response after a realistic 20~40ms hardware response delay.
   */
  public receiveCommandFromPC(bytes: number[]): void {
    if (!this.isEnabled || !this.onPacketCallback) return;

    // Verify PC frame
    if (bytes[0] !== 0xaa || bytes[1] !== 0xaa || bytes[2] !== 0x00 || bytes[3] !== 0x02) {
      return;
    }

    const cmd = bytes[4];

    setTimeout(() => {
      if (!this.onPacketCallback) return;

      // 0x71: Read Parameter -> Respond with 0x01 0x70 0x71 ...
      if (cmd === 0x71) {
        const resp = new Array(14).fill(0);
        resp[0] = 0xaa;
        resp[1] = 0xaa;
        resp[2] = 0x01;
        resp[3] = 0x70;
        resp[4] = 0x71;

        const p = this.currentParams;
        resp[5] = ((p.installationMode & 0x0f) << 4) | (p.workMode & 0x0f);
        resp[6] = p.sensitivity;
        resp[7] = p.lowerSpeedLimit;
        resp[8] = p.angle;
        resp[9] = p.responseTime;
        resp[10] = p.upperSpeedLimit;
        resp[11] = p.direction;
        resp[12] = 0x55;
        resp[13] = 0x55;

        this.onPacketCallback(resp);
      }
      // 0x8E: Parameter Setting -> Update simulator parameters
      else if (cmd === 0x8e) {
        const b5 = bytes[5] ?? 0;
        this.currentParams = {
          installationMode: (b5 >> 4) & 0x0f,
          workMode: b5 & 0x0f,
          sensitivity: bytes[6] ?? 3,
          lowerSpeedLimit: bytes[7] ?? 5,
          angle: bytes[8] ?? 0,
          responseTime: bytes[9] ?? 5,
          upperSpeedLimit: bytes[10] ?? 200,
          direction: bytes[11] ?? 0,
        };

        // Standard TSR20 echoes updated parameters back
        const resp = new Array(14).fill(0);
        resp[0] = 0xaa;
        resp[1] = 0xaa;
        resp[2] = 0x01;
        resp[3] = 0x70;
        resp[4] = 0x71;
        for (let i = 5; i <= 11; i++) {
          resp[i] = bytes[i];
        }
        resp[12] = 0x55;
        resp[13] = 0x55;
        this.onPacketCallback(resp);
      }
      // 0x02: Read Version No -> Respond with 0x00 0x04 0x82 0x01 0x00 0x07 (V1.0.7)
      else if (cmd === 0x02) {
        const resp = new Array(14).fill(0);
        resp[0] = 0xaa;
        resp[1] = 0xaa;
        resp[2] = 0x00;
        resp[3] = 0x04;
        resp[4] = 0x82;
        resp[5] = 0x01; // Major: 1
        resp[6] = 0x00; // Minor: 0
        resp[7] = 0x07; // Patch: 7 => V1.0.7
        resp[12] = 0x55;
        resp[13] = 0x55;
        this.onPacketCallback(resp);
      }
      // 0xF2: Factory Reset
      else if (cmd === 0xf2) {
        this.currentParams = { ...DEFAULT_RADAR_PARAMS };
        const resp = new Array(14).fill(0);
        resp[0] = 0xaa;
        resp[1] = 0xaa;
        resp[2] = 0x01;
        resp[3] = 0x70;
        resp[4] = 0x71;
        const p = this.currentParams;
        resp[5] = ((p.installationMode & 0x0f) << 4) | (p.workMode & 0x0f);
        resp[6] = p.sensitivity;
        resp[7] = p.lowerSpeedLimit;
        resp[8] = p.angle;
        resp[9] = p.responseTime;
        resp[10] = p.upperSpeedLimit;
        resp[11] = p.direction;
        resp[12] = 0x55;
        resp[13] = 0x55;
        this.onPacketCallback(resp);
      }
    }, 35);
  }

  /**
   * Manually trigger a simulated vehicle target detection
   */
  public triggerTargetDetection(speedKmh: number, direction: 0 | 1 | 2 = 0): void {
    if (!this.onPacketCallback) return;
    const { bytes } = createTargetStatusFrame(speedKmh, direction);
    this.onPacketCallback(bytes);
  }

  /**
   * Start generating simulated vehicle traffic automatically
   */
  public startAutoTraffic(intervalMs = 3000, minSpeed = 35, maxSpeed = 75): void {
    this.stopAutoTraffic();
    this.autoTrafficFrequency = intervalMs;
    this.trafficMinSpeed = minSpeed;
    this.trafficMaxSpeed = maxSpeed;

    this.autoTrafficInterval = setInterval(() => {
      if (!this.isEnabled) return;
      // Randomize speed
      const speed = Math.floor(Math.random() * (this.trafficMaxSpeed - this.trafficMinSpeed + 1)) + this.trafficMinSpeed;
      // Mostly coming (0), occasionally leaving (1)
      const dir: 0 | 1 = Math.random() > 0.25 ? 0 : 1;
      this.triggerTargetDetection(speed, dir);
    }, this.autoTrafficFrequency);
  }

  public stopAutoTraffic(): void {
    if (this.autoTrafficInterval) {
      clearInterval(this.autoTrafficInterval);
      this.autoTrafficInterval = null;
    }
  }

  public isAutoTrafficRunning(): boolean {
    return this.autoTrafficInterval !== null;
  }
}

export const radarSimulator = new RadarSimulator();
