/**
 * Basit aralıklı poll scheduler.
 * Varsayılan 10 dakika; üst üste binen turları engeller.
 */
export class PollScheduler {
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  private tickInFlight = false;

  constructor(
    private readonly intervalMs: number,
    private readonly tick: () => Promise<void>,
    private readonly label = 'poll',
  ) {}

  start(runImmediately = true): void {
    if (this.running) return;
    this.running = true;

    console.log(
      `[finteo-agent] scheduler başladı intervalMs=${this.intervalMs} (${this.label})`,
    );

    if (runImmediately) {
      void this.safeTick();
    }

    this.timer = setInterval(() => {
      void this.safeTick();
    }, this.intervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    console.log(`[finteo-agent] scheduler durdu (${this.label})`);
  }

  private async safeTick(): Promise<void> {
    if (!this.running) return;
    if (this.tickInFlight) {
      console.warn(`[finteo-agent] önceki tur henüz bitmedi; atlandı (${this.label})`);
      return;
    }

    this.tickInFlight = true;
    const t0 = Date.now();
    try {
      await this.tick();
      console.log(`[finteo-agent] tur tamamlandı ${Date.now() - t0}ms`);
    } catch (err) {
      console.error('[finteo-agent] tur hatası:', err);
    } finally {
      this.tickInFlight = false;
    }
  }
}
