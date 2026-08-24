import cron from "node-cron";
import { analyzeAllCrops } from "./analyze.js";

// Runs the AI analysis job on a repeating schedule. Matches the cadence
// the frontend's AI Dashboard already expects ("next analysis in
// 30-60 minutes" copy) -- default 30 min, configurable via env.
export function startScheduler() {
  const minutes = Math.min(59, Math.max(1, Number(process.env.ANALYSIS_INTERVAL_MINUTES || 30)));
  const expr = `*/${minutes} * * * *`;

  console.log(`[Scheduler] AI analysis will run every ${minutes} minute(s) (cron: "${expr}").`);

  cron.schedule(expr, async () => {
    console.log("[Scheduler] Running scheduled AI analysis...");
    await analyzeAllCrops();
  });
}
