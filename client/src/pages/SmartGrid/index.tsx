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
  const beforeWork = workStart - ramp;
  const afterWork = workEnd + ramp;
  if (tDayMinutes < beforeWork) {
    return 0.5;
  } else if (tDayMinutes < workStart) {
    return expRamp(tDayMinutes, beforeWork, workStart, 0.5, 45);
  } else if (tDayMinutes < workEnd) {
    return 45;
  } else if (tDayMinutes < afterWork) {
    return expRamp(tDayMinutes, workEnd, afterWork, 45, 0.5);
  } else {
    return 0.5;
  }
};

const getCityDemandMW = (tDayMinutes: number) => {
  const t = tDayMinutes;
  const s0 = 0;
  const s1 = 5 * 60;
  const s2 = 9 * 60;
  const s3 = 15 * 60;
  const s4 = 19 * 60;
  const s5 = 23 * 60;
  const v0 = 0.2;
  const v1 = 12;
  const v2 = 11.5;
  const v3 = 2;
  const v4 = 16;
  const v5 = 0.3;
  const v6 = 0.2;

  if (t < s1) {
    return expRamp(t, s0, s1, v0, v1);
  } else if (t < s2) {
    return expRamp(t, s1, s2, v1, v2);
  } else if (t < s3) {
    return expRamp(t, s2, s3, v2, v3);
  } else if (t < s4) {
    return expRamp(t, s3, s4, v3, v4);
  } else if (t < s5) {
    return expRamp(t, s4, s5, v4, v5);
  } else {
    return expRamp(t, s5, 24 * 60, v5, v6);
  }
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
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [lines, setLines] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [power, setPower] = useState({ hydro: 50, solar: 0, wind: 3.75 });
  const [demand, setDemand] = useState({ factory: 0, city: 0 });

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

        const sunrise = 360;
        const sunset = 1080;
        let solarBase = 0;
        if (dayMinutes > sunrise && dayMinutes < sunset) {
          const sunPos = (dayMinutes - sunrise) / (sunset - sunrise);
          solarBase = 15 * Math.sin(Math.PI * sunPos);
        }

        const windBase =
          3.75 + Math.sin(t * 0.5) * 3 + Math.cos(t * 0.2) * 0.75;

        setPower({
          hydro: activeNodes.hydrogen ? hydroBase : 0,
          solar: activeNodes.solar ? solarBase : 0,
          wind: activeNodes.wind ? Math.max(0, Math.min(7.5, windBase)) : 0,
        });

        const factoryMW = getFactoryDemandMW(dayMinutes);
        const cityMW = getCityDemandMW(dayMinutes);

        setDemand({
          factory: activeNodes.factory1 ? factoryMW : 0,
          city: activeNodes.city1 ? cityMW : 0,
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
  const loadPercent = Math.round(loadRatio * 100);

  const activeSources = ["wind", "hydrogen", "solar"].filter(
    (id) => activeNodes[id],
  ).length;

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

        const cp1x = x1 + (x2 - x1) / 2;
        const cp1y = y1;
        const cp2x = x1 + (x2 - x1) / 2;
        const cp2y = y2;

        let statusClass = "";

        if (conn.from === "tower") {
          if (loadRatio > 0.9) statusClass = "power-low";
          else if (loadRatio > 0.8) statusClass = "power-medium";
          else statusClass = "power-high";
        }

        return {
          id: `${conn.from}-${conn.to}`,
          path: `M ${x1} ${y1} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x2} ${y2}`,
          active:
            activeNodes[conn.from] && activeNodes[conn.to] && activeSources > 0,
          statusClass,
        };
      }
      return null;
    }).filter(Boolean) as any[];

    setLines(newLines);
  }, [activeNodes, activeSources, loadRatio]);
  useEffect(() => {
    calculateLines();

    window.addEventListener("resize", calculateLines);

    return () => {
      window.removeEventListener("resize", calculateLines);
    };
  }, [calculateLines, power, demand]);

  useEffect(() => {
    setActiveNodes((prev) => ({ ...prev, tower: activeSources > 0 }));
  }, [activeSources]);

  return (
    <div className="grid-container">
      <div className="sim-header">
        <div className="time-display">
          <span className="day-text">{DAYS[dayIndex]}</span>
          <span className="clock-text">
            {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
          </span>
        </div>

        <div className="controls-row">
          <button
            className="speed-btn"
            onClick={() => setTimeSpeed(Math.max(0.5, timeSpeed - 0.5))}
          >
            Slower
          </button>
          <button
            className={`pause-btn ${isPaused ? "is-paused" : ""}`}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? "RESUME" : "PAUSE"}
          </button>
          <button
            className="speed-btn"
            onClick={() => setTimeSpeed(Math.min(20, timeSpeed + 0.5))}
          >
            Faster
          </button>
        </div>
        <div className="speed-indicator">Speed: {timeSpeed.toFixed(1)}x</div>
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

          if (node.id === "hydrogen") {
            nodeValue = `${power.hydro.toFixed(2)} MW`;
          }

          if (node.id === "solar") {
            nodeValue = `${power.solar.toFixed(2)} MW`;
          }

          if (node.id === "wind") {
            nodeValue = `${power.wind.toFixed(2)} MW`;
          }

          if (node.id === "tower") {
            nodeValue = `${totalProduction.toFixed(2)} MW`;

            if (activeNodes.tower) {
              if (loadRatio > 0.9) towerStatus = "status-low";
              else if (loadRatio > 0.8) towerStatus = "status-medium";
              else towerStatus = "status-high";
            }
          }

          if (node.id === "factory1") {
            nodeValue = `${demand.factory.toFixed(2)} MW`;
          }

          if (node.id === "city1") {
            nodeValue = `${demand.city.toFixed(2)} MW`;
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
                onClick={() => {
                  if (node.id !== "tower") {
                    setActiveNodes((prev) => ({
                      ...prev,
                      [node.id]: !prev[node.id],
                    }));
                  }
                }}
              >
                <img src={`/icons/png/${node.img}`} alt={node.label} />
              </div>
              <div className="node-info">
                <span className="node-label">{node.label}</span>

                {nodeValue && <span className="node-value">{nodeValue}</span>}

                {node.id === "tower" && activeNodes.tower && (
                  <span className="node-load">{loadPercent}% load</span>
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
