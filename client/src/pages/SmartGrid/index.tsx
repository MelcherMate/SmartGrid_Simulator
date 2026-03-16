import { useCallback, useEffect, useRef, useState } from "react";
import "./SmartGrid.css";

const NODES = [
  {
    id: "wind",
    type: "source",
    label: "Wind Farm",
    img: "wind-turbin.png",
    x: 15,
    y: 20,
  },
  {
    id: "hydrogen",
    type: "source",
    label: "Hydro Power",
    img: "hydro-power.png",
    x: 15,
    y: 50,
  },
  {
    id: "solar",
    type: "source",
    label: "Solar Array",
    img: "solar-panel.png",
    x: 15,
    y: 80,
  },
  {
    id: "tower",
    type: "hub",
    label: "Main Station",
    img: "transformer.png",
    x: 50,
    y: 50,
  },
  {
    id: "factory1",
    type: "consumer",
    label: "Factory Block",
    img: "factory.png",
    x: 85,
    y: 30,
  },
  {
    id: "city1",
    type: "consumer",
    label: "City District",
    img: "building.png",
    x: 85,
    y: 70,
  },
];

const CONNECTIONS = [
  { from: "wind", to: "tower" },
  { from: "hydrogen", to: "tower" },
  { from: "solar", to: "tower" },
  { from: "tower", to: "factory1" },
  { from: "tower", to: "city1" },
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Fixed speed points for the slider
const SPEED_STEPS = [0.5, 1, 2, 5, 10, 20];

const expRamp = (t: number, t0: number, t1: number, v0: number, v1: number) => {
  if (t <= t0) return v0;
  if (t >= t1) return v1;
  const u = (t - t0) / (t1 - t0);
  const k = 3;
  const f = (Math.exp(k * u) - 1) / (Math.exp(k) - 1);
  return v0 + (v1 - v0) * f;
};

const getFactoryDemandMW = (tDayMinutes: number) => {
  const workStart = 8 * 60;
  const workEnd = 16 * 60;
  const ramp = 60;
  if (tDayMinutes < workStart - ramp) return 0.5;
  if (tDayMinutes < workStart)
    return expRamp(tDayMinutes, workStart - ramp, workStart, 0.5, 45);
  if (tDayMinutes < workEnd) return 45;
  if (tDayMinutes < workEnd + ramp)
    return expRamp(tDayMinutes, workEnd, workEnd + ramp, 45, 0.5);
  return 0.5;
};

const getCityDemandMW = (tDayMinutes: number) => {
  const t = tDayMinutes;
  const s = [0, 300, 540, 900, 1140, 1380]; // Steps in minutes
  const v = [0.2, 12, 11.5, 2, 16, 0.3, 0.2]; // Voltages/MW
  if (t < s[1]) return expRamp(t, s[0], s[1], v[0], v[1]);
  if (t < s[2]) return expRamp(t, s[1], s[2], v[1], v[2]);
  if (t < s[3]) return expRamp(t, s[2], s[3], v[2], v[3]);
  if (t < s[4]) return expRamp(t, s[3], s[4], v[3], v[4]);
  if (t < s[5]) return expRamp(t, s[4], s[5], v[4], v[5]);
  return expRamp(t, s[5], 1440, v[5], v[6]);
};

const SmartGrid = () => {
  const [activeNodes, setActiveNodes] = useState<Record<string, boolean>>({
    wind: true,
    hydrogen: true,
    solar: true,
    tower: true,
    factory1: true,
    city1: true,
  });

  const [totalMinutes, setTotalMinutes] = useState(8 * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1); // Default to 1x (SPEED_STEPS[1])
  const [lines, setLines] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [power, setPower] = useState({ hydro: 50, solar: 0, wind: 3.75 });
  const [demand, setDemand] = useState({ factory: 0, city: 0 });

  const timeSpeed = SPEED_STEPS[speedIndex];

  useEffect(() => {
    if (isPaused) return;
    const frameRate = 60;
    const interval = 1000 / frameRate;
    const minutesPerFrame = (timeSpeed * 10) / frameRate;

    const timer = setInterval(() => {
      setTotalMinutes((prev) => {
        const next = prev + minutesPerFrame;
        const dayMinutes = next % 1440;
        const t = next / 100;

        const hydroBase = 50 + Math.sin(t * 0.1) * 0.2;
        let solarBase = 0;
        if (dayMinutes > 360 && dayMinutes < 1080) {
          solarBase = 15 * Math.sin(Math.PI * ((dayMinutes - 360) / 720));
        }
        const windBase =
          3.75 + Math.sin(t * 0.5) * 3 + Math.cos(t * 0.2) * 0.75;

        setPower({
          hydro: activeNodes.hydrogen ? hydroBase : 0,
          solar: activeNodes.solar ? solarBase : 0,
          wind: activeNodes.wind ? Math.max(0, Math.min(7.5, windBase)) : 0,
        });

        setDemand({
          factory: activeNodes.factory1 ? getFactoryDemandMW(dayMinutes) : 0,
          city: activeNodes.city1 ? getCityDemandMW(dayMinutes) : 0,
        });

        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, timeSpeed, activeNodes]);

  const currentMinutesTotal = Math.floor(totalMinutes);
  const dayIndex = Math.floor(currentMinutesTotal / 1440) % 7;
  const hour = Math.floor((currentMinutesTotal % 1440) / 60);
  const minute = currentMinutesTotal % 60;

  const totalProduction = power.hydro + power.solar + power.wind;
  const totalDemand = demand.factory + demand.city;
  const loadRatio = totalProduction > 0 ? totalDemand / totalProduction : 0;

  const calculateLines = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    const newLines = CONNECTIONS.map((conn) => {
      const start = document.getElementById(conn.from);
      const end = document.getElementById(conn.to);
      if (start && end) {
        const sRect = start.getBoundingClientRect();
        const eRect = end.getBoundingClientRect();
        const x1 = sRect.left + sRect.width / 2 - rect.left;
        const y1 = sRect.top + sRect.height / 2 - rect.top;
        const x2 = eRect.left + eRect.width / 2 - rect.left;
        const y2 = eRect.top + eRect.height / 2 - rect.top;

        let statusClass = "";
        if (conn.from === "tower") {
          if (loadRatio > 0.9) statusClass = "power-low";
          else if (loadRatio > 0.8) statusClass = "power-medium";
          else statusClass = "power-high";
        }

        return {
          id: `${conn.from}-${conn.to}`,
          path: `M ${x1} ${y1} C ${x1 + (x2 - x1) / 2} ${y1} ${x1 + (x2 - x1) / 2} ${y2} ${x2} ${y2}`,
          active:
            activeNodes[conn.from] &&
            activeNodes[conn.to] &&
            ["wind", "hydrogen", "solar"].filter((id) => activeNodes[id])
              .length > 0,
          statusClass,
        };
      }
      return null;
    }).filter(Boolean);
    setLines(newLines);
  }, [activeNodes, loadRatio]);

  useEffect(() => {
    calculateLines();
    window.addEventListener("resize", calculateLines);
    return () => window.removeEventListener("resize", calculateLines);
  }, [calculateLines, power, demand]);

  return (
    <div className="grid-container">
      <div className="sim-dashboard">
        {/* New Redesigned Time Module */}
        <div className="time-module">
          <div className="date-badge">{DAYS[dayIndex]}</div>
          <div className="digital-clock">
            {String(hour).padStart(2, "0")}
            <span>:</span>
            {String(minute).padStart(2, "0")}
          </div>
        </div>

        {/* Speed & Control Module */}
        <div className="control-module">
          <button
            className={`pause-btn-round ${isPaused ? "is-paused" : ""}`}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? "▶" : "II"}
          </button>

          <div className="slider-container">
            <div className="speed-labels">
              {SPEED_STEPS.map((s, i) => (
                <span key={s} className={speedIndex === i ? "active" : ""}>
                  {s}x
                </span>
              ))}
            </div>
            <input
              type="range"
              min="0"
              max={SPEED_STEPS.length - 1}
              value={speedIndex}
              onChange={(e) => setSpeedIndex(parseInt(e.target.value))}
              className="speed-slider"
            />
          </div>
        </div>
      </div>

      <div className="grid-board" ref={containerRef}>
        <svg className="grid-svg">
          {lines.map((line) => (
            <path
              key={line.id}
              d={line.path}
              fill="transparent"
              className={`grid-line ${line.active ? "active-flow" : ""} ${line.statusClass}`}
            />
          ))}
        </svg>

        {NODES.map((node) => {
          let towerStatus = "";
          let nodeValue = "";

          if (node.id === "hydrogen")
            nodeValue = `${power.hydro.toFixed(2)} MW`;
          if (node.id === "solar") nodeValue = `${power.solar.toFixed(2)} MW`;
          if (node.id === "wind") nodeValue = `${power.wind.toFixed(2)} MW`;
          if (node.id === "factory1")
            nodeValue = `${demand.factory.toFixed(2)} MW`;
          if (node.id === "city1") nodeValue = `${demand.city.toFixed(2)} MW`;

          if (node.id === "tower") {
            nodeValue = `${totalProduction.toFixed(2)} MW`;
            if (activeNodes.tower) {
              if (loadRatio > 0.9) towerStatus = "status-low";
              else if (loadRatio > 0.8) towerStatus = "status-medium";
              else towerStatus = "status-high";
            }
          }

          return (
            <div
              key={node.id}
              className={`grid-node ${node.type} ${!activeNodes[node.id] ? "node-off" : ""} ${towerStatus}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div
                id={node.id}
                className="icon-wrapper"
                onClick={() =>
                  node.id !== "tower" &&
                  setActiveNodes((p) => ({ ...p, [node.id]: !p[node.id] }))
                }
              >
                <img src={`/icons/png/${node.img}`} alt={node.label} />
              </div>
              <div className="node-info">
                <span className="node-label">{node.label}</span>
                {nodeValue && <span className="node-value">{nodeValue}</span>}
                {node.id === "tower" && activeNodes.tower && (
                  <span className="node-load">
                    {Math.round(loadRatio * 100)}% load
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartGrid;
