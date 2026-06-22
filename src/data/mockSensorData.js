const fields = [
  { id: "SG-001", name: "North Field", crop: "Maize", lat: 9.08, lng: 8.68 },
  { id: "SG-002", name: "Riverbank Plot", crop: "Cassava", lat: 9.05, lng: 8.65 },
  { id: "SG-003", name: "Hill Terrace", crop: "Maize", lat: 9.12, lng: 8.72 },
  { id: "SG-004", name: "South Meadow", crop: "Yam", lat: 9.02, lng: 8.6 },
];

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function drift(current, step, min, max) {
  const delta = (Math.random() - 0.5) * step * 2;
  return clamp(current + delta, min, max);
}

function randomStart(min, max) {
  return min + Math.random() * (max - min);
}

function createNode(field) {
  const base = {
    ...field,
    moisture: randomStart(30, 70),
    pH: randomStart(5.5, 7.5),
    ec: randomStart(0.5, 2.5),
    temperature: randomStart(22, 38),
    humidity: randomStart(40, 85),
    battery: randomStart(50, 100),
    solarCharging: Math.random() > 0.3,
    connectivity: "live",
    lastSeen: Date.now(),
    alerts: [],
    history: [],
    actuationState: null,
  };
  for (let i = 0; i < 60; i++) {
    base.history.push({
      t: Date.now() - (60 - i) * 3000,
      moisture: base.moisture + (Math.random() - 0.5) * 5,
      pH: base.pH + (Math.random() - 0.5) * 0.3,
      ec: base.ec + (Math.random() - 0.5) * 0.2,
      temperature: base.temperature + (Math.random() - 0.5) * 2,
    });
  }
  return base;
}

let nodes = fields.map(createNode);

function updateNode(node) {
  if (node.connectivity === "offline") {
    if (Math.random() > 0.97) {
      node.connectivity = "buffered";
      node.lastSeen = Date.now();
    }
    return;
  }

  if (node.connectivity === "buffered") {
    if (Math.random() > 0.95) {
      node.connectivity = "live";
    }
    node.lastSeen = Date.now();
    return;
  }

  if (Math.random() > 0.995) {
    node.connectivity = "offline";
    return;
  }

  if (Math.random() > 0.98) {
    node.connectivity = "buffered";
    return;
  }

  node.moisture = drift(node.moisture, 0.5, 10, 90);
  node.pH = drift(node.pH, 0.02, 4.5, 8.5);
  node.ec = drift(node.ec, 0.02, 0.2, 4.0);
  node.temperature = drift(node.temperature, 0.15, 18, 45);
  node.humidity = drift(node.humidity, 0.3, 20, 100);
  node.battery = drift(node.battery, 0.1, 5, 100);
  node.solarCharging = Math.random() > 0.4;
  node.lastSeen = Date.now();

  if (node.solarCharging) {
    node.battery = clamp(node.battery + 0.05, 5, 100);
  } else {
    node.battery = clamp(node.battery - 0.03, 5, 100);
  }

  node.history.push({
    t: Date.now(),
    moisture: node.moisture,
    pH: node.pH,
    ec: node.ec,
    temperature: node.temperature,
  });
  if (node.history.length > 500) {
    node.history = node.history.slice(-500);
  }
}

function evaluateStress(node) {
  const alerts = [];
  if (node.pH < 5.5 || node.pH > 7.5) {
    alerts.push({
      id: `alert-${node.id}-${Date.now()}`,
      fieldId: node.id,
      type: "crop_stress",
      severity: node.pH < 5.0 || node.pH > 8.0 ? "critical" : "warning",
      headline: `pH ${node.pH < 5.5 ? "acidity" : "alkalinity"} risk for ${node.crop}`,
      detail: `Soil pH at ${node.pH.toFixed(1)} is ${node.pH < 5.5 ? "below" : "above"} the optimal range for ${node.crop}. This may cause nutrient lockout.`,
      reasoning: [
        `pH trend: ${(node.pH - 6.5).toFixed(1)} from neutral`,
        `Crop: ${node.crop}`,
        `Season: dry`,
      ],
      recommendation: node.pH < 5.5
        ? "Apply dilute lime solution via Tank B to raise pH toward the optimal range."
        : "Apply sulfur or organic matter to lower pH. Consider Tank A with pH-adjusted water.",
      actionable: true,
      actionLabel: node.pH < 5.5 ? "Dispense lime (Tank B)" : "Irrigate (Tank A)",
      actionTank: node.pH < 5.5 ? "B" : "A",
      daysToImpact: Math.floor(3 + Math.random() * 5),
      createdAt: Date.now(),
      status: "active",
    });
  }
  if (node.moisture < 20 || node.moisture > 80) {
    alerts.push({
      id: `alert-${node.id}-${Date.now() + 1}`,
      fieldId: node.id,
      type: "crop_stress",
      severity: node.moisture < 10 || node.moisture > 90 ? "critical" : "warning",
      headline: `Soil moisture ${node.moisture < 20 ? "deficit" : "excess"} detected`,
      detail: `Moisture at ${node.moisture.toFixed(1)}% is ${node.moisture < 20 ? "too dry" : "too wet"} for optimal ${node.crop} growth.`,
      reasoning: [
        `Moisture: ${node.moisture.toFixed(1)}%`,
        `Crop: ${node.crop}`,
        `Season: dry`,
      ],
      recommendation: node.moisture < 20
        ? "Irrigate with Tank A to restore soil moisture to optimal levels."
        : "Delay irrigation. Monitor drainage. Consider soil aeration.",
      actionable: node.moisture < 20,
      actionLabel: "Irrigate (Tank A)",
      actionTank: "A",
      daysToImpact: Math.floor(2 + Math.random() * 4),
      createdAt: Date.now(),
      status: "active",
    });
  }
  if (node.ec > 2.5) {
    alerts.push({
      id: `alert-${node.id}-${Date.now() + 2}`,
      fieldId: node.id,
      type: "corrosion",
      severity: node.ec > 3.5 ? "critical" : "warning",
      headline: "Elevated corrosion risk from high EC",
      detail: `Electrical conductivity at ${node.ec.toFixed(2)} dS/m indicates elevated corrosion potential for buried metal irrigation infrastructure.`,
      reasoning: [
        `EC: ${node.ec.toFixed(2)} dS/m`,
        `Estimated LSI: ${(node.pH - 7.5 + node.ec * 0.1).toFixed(2)}`,
        `Infrastructure: buried galvanized steel`,
      ],
      recommendation: "Monitor pH and EC trends. Consider applying corrosion inhibitor or replacing affected sections during next maintenance cycle.",
      actionable: false,
      daysToImpact: Math.floor(30 + Math.random() * 60),
      createdAt: Date.now(),
      status: "active",
    });
  }
  return alerts;
}

const listeners = new Set();

function tick() {
  const allAlerts = [];
  nodes.forEach((node) => {
    updateNode(node);
    const newAlerts = evaluateStress(node);
    newAlerts.forEach((a) => {
      const existing = node.alerts.find((ea) => ea.type === a.type && ea.status === "active");
      if (!existing) {
        node.alerts.unshift(a);
        allAlerts.push(a);
      }
    });
    if (node.alerts.length > 100) node.alerts = node.alerts.slice(0, 100);
  });
  if (allAlerts.length > 0 || Math.random() > 0.9) {
    listeners.forEach((fn) => fn(getSnapshot()));
  }
}

let intervalId = null;

function startStreaming() {
  if (intervalId) return;
  tick();
  intervalId = setInterval(tick, 3000);
}

function stopStreaming() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function getSnapshot() {
  return nodes.map((n) => ({
    ...n,
    alerts: n.alerts.filter((a) => a.status === "active"),
  }));
}

function getFieldById(id) {
  return nodes.find((n) => n.id === id);
}

function getFieldByName(name) {
  return nodes.find((n) => n.name === name);
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function dismissAlert(fieldId, alertId) {
  const node = nodes.find((n) => n.id === fieldId);
  if (node) {
    const alert = node.alerts.find((a) => a.id === alertId);
    if (alert) alert.status = "dismissed";
  }
}

function resolveAlert(fieldId, alertId) {
  const node = nodes.find((n) => n.id === fieldId);
  if (node) {
    const alert = node.alerts.find((a) => a.id === alertId);
    if (alert) alert.status = "resolved";
  }
}

function startActuation(fieldId, tank) {
  const node = nodes.find((n) => n.id === fieldId);
  if (!node) return null;
  const duration = 5;
  node.actuationState = {
    tank,
    phase: "sending",
    startedAt: Date.now(),
    duration,
  };
  setTimeout(() => {
    if (node.actuationState) {
      node.actuationState.phase = "running";
      node.actuationState.startedAt = Date.now();
      listeners.forEach((fn) => fn(getSnapshot()));
    }
    setTimeout(() => {
      if (node.actuationState) {
        node.actuationState.phase = "verifying";
        setTimeout(() => {
          if (node.actuationState) {
            if (tank === "B") {
              node.pH = clamp(node.pH + 0.4, 4.5, 8.5);
            } else {
              node.moisture = clamp(node.moisture + 8, 10, 90);
            }
            const success = true;
            node.actuationState.phase = success ? "completed" : "failed";
            setTimeout(() => {
              node.actuationState = null;
              listeners.forEach((fn) => fn(getSnapshot()));
            }, 3000);
          }
          listeners.forEach((fn) => fn(getSnapshot()));
        }, 3000);
      }
      listeners.forEach((fn) => fn(getSnapshot()));
    }, duration * 1000);
  }, 1500);
  listeners.forEach((fn) => fn(getSnapshot()));
  return { fieldId, tank, duration };
}

function getNodeById(id) {
  return nodes.find((n) => n.id === id);
}

export {
  startStreaming,
  stopStreaming,
  getSnapshot,
  getFieldById,
  getFieldByName,
  subscribe,
  dismissAlert,
  resolveAlert,
  startActuation,
  getNodeById,
  evaluateStress,
};
