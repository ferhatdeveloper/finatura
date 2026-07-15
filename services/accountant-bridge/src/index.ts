import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { accountantRouter } from "./routes/accountant.js";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "accountant-bridge" });
});

app.use("/api/accountant", accountantRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[accountant-bridge]", err);
    res.status(500).json({ ok: false, error: "internal_error" });
  },
);

const shouldListen = process.env.VITEST !== "true" && process.env.NODE_ENV !== "test";

if (shouldListen) {
  app.listen(config.port, () => {
    console.log(
      `[accountant-bridge] dinleniyor :${config.port} — kod doğrula → dönem onayla → Luca XML`,
    );
  });
}

export { app };
export { verifyAccountantCode } from "./services/verify-code.js";
export { approvePeriod } from "./services/approve-period.js";
export { exportLucaForPeriod } from "./services/export-luca.js";
