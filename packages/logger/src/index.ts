interface LoggerInterface {
  info(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  flush(): void;
}

export class Logger implements LoggerInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private logger: any;
  private initialized = false;
  private messageQueue: Array<{
    level: "info" | "error" | "warn";
    message: string;
  }> = [];

  constructor(
    private token: string,
    private dataset: string,
    private isBrowser = false,
  ) {
    this.token = token;
    this.dataset = dataset;
    this.isBrowser = isBrowser;

    this.initLogger();
  }

  private async initLogger(): Promise<void> {
    try {
      if (this.isBrowser) {
        // For browser, use @axiomhq/js directly
        const { Axiom } = await import("@axiomhq/js");

        this.logger = new Axiom({
          token: this.token,
        });
      } else {
        // For Node.js, use pino with @axiomhq/pino transport
        const { pino } = await import("pino");

        this.logger = pino(
          { level: "info" },
          pino.transport({
            target: "@axiomhq/pino",
            options: {
              dataset: this.dataset,
              token: this.token,
            },
          }),
        ) as unknown as LoggerInterface;
      }

      this.initialized = true;

      this.processQueue();
    } catch (error) {
      console.error("Logger initialization error:", error);
    }
  }

  private processQueue(): void {
    if (!this.initialized || this.messageQueue.length === 0) return;

    for (const item of this.messageQueue) {
      if (this.logger[item.level]) {
        this.logger[item.level](item.message);
      }
    }

    this.messageQueue = [];
  }

  public info(message: string): void {
    if (this.initialized) {
      if (this.logger.info) {
        this.logger.info(message);
      } else if (this.logger.ingest) {
        this.logger.ingest(this.dataset, [
          {
            msg: message,
            level: "info",
            hostname: `${new URL(window.location.href).hostname}`,
          },
        ]);
      }
    } else {
      this.messageQueue.push({ level: "info", message });
    }
  }

  public error(message: string): void {
    if (this.initialized) {
      if (this.logger.error) {
        this.logger.error(message);
      } else if (this.logger.ingest) {
        this.logger.ingest(this.dataset, [
          {
            msg: message,
            level: "error",
            hostname: `${new URL(window.location.href).hostname}`,
          },
        ]);
      }
    } else {
      this.messageQueue.push({ level: "error", message });
    }
  }

  public warn(message: string): void {
    if (this.initialized) {
      if (this.logger.warn) {
        this.logger.warn(message);
      } else if (this.logger.ingest) {
        this.logger.ingest(this.dataset, [
          {
            msg: message,
            level: "warn",
            hostname: `${new URL(window.location.href).hostname}`,
          },
        ]);
      }
    } else {
      this.messageQueue.push({ level: "warn", message });
    }
  }

  public flush(): void {
    if (this.isBrowser && this.initialized) {
      if (this.logger.ingest && this.messageQueue.length > 0) {
        const messages = this.messageQueue.map((item) => ({
          msg: item.message,
          level: item.level,
          hostname: `${new URL(window.location.href).hostname}`,
        }));
        this.logger.ingest(this.dataset, messages);
        this.messageQueue = [];
      }
    }

    if (this.initialized) {
      this.logger.flush();
    }
  }
}
