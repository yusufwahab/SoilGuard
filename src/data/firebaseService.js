import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, off } from "firebase/database";

const app = initializeApp({
  databaseURL: "https://soil-guard-by-team-nexus-default-rtdb.firebaseio.com",
});

const db = getDatabase(app);

export { db, ref, onValue, off, set };

export const sensorRef      = (crop) => ref(db, `farms/${crop}/sensor`);
export const pumpStateRef   = (crop) => ref(db, `farms/${crop}/pump_state`);
export const targetMoistRef = (crop) => ref(db, `farms/${crop}/target_moisture`);
export const aiDashboardRef = (crop) => ref(db, `farms/${crop}/ai_dashboard`);

export function writePumpState(crop, state) {
  return set(pumpStateRef(crop), state);
}

export function writeTargetMoisture(crop, value) {
  return set(targetMoistRef(crop), value);
}
