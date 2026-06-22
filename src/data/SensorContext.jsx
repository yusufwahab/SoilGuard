import { createContext, useContext, useEffect, useState } from "react";
import { startStreaming, stopStreaming, getSnapshot, subscribe } from "./mockSensorData";

const SensorContext = createContext(null);

export function SensorProvider({ children }) {
  const [data, setData] = useState(() => {
    startStreaming();
    return getSnapshot();
  });

  useEffect(() => {
    const unsub = subscribe((snapshot) => setData([...snapshot]));
    return () => {
      unsub();
      stopStreaming();
    };
  }, []);

  return <SensorContext.Provider value={data}>{children}</SensorContext.Provider>;
}

export function useSensorData() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error("useSensorData must be used within SensorProvider");
  return ctx;
}

export { SensorContext };
