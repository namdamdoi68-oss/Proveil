import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import proofRoutes from "./routes/proof.routes";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api", proofRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`ProVeil API running on port ${config.port}`);
    console.log(`Contract: ${config.stellar.contractId}`);
    console.log(`Network: ${config.stellar.network}`);
  });
}

export default app;
