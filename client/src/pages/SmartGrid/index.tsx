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

const SmartGrid = () => {
  const [activeNodes, setActiveNodes] = useState<Record<string, boolean>>({
    wind: true,
    hydrogen: true,
    solar: true,
    tower: true,
    factory1: true,
    city1: true,
  });

  const [lines, setLines] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeSources = ["wind", "hydrogen", "solar"].filter(
    (id) => activeNodes[id],
  ).length;
  const activeFactories = ["factory1", "city1"].filter(
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
        const isConsumerLine = conn.from === "tower";

        if (isConsumerLine) {
          if (activeFactories === 2) {
            if (activeSources === 3) statusClass = "power-high";
            else if (activeSources === 2) statusClass = "power-medium";
            else if (activeSources === 1) statusClass = "power-low";
          } else if (activeFactories === 1) {
            if (activeSources >= 2) statusClass = "power-high";
            else if (activeSources === 1) statusClass = "power-medium";
          }
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
    }).filter(Boolean);

    setLines(newLines);
  }, [activeNodes, activeSources, activeFactories]);

  useEffect(() => {
    const timeout = setTimeout(calculateLines, 100);
    window.addEventListener("resize", calculateLines);
    return () => {
      window.removeEventListener("resize", calculateLines);
      clearTimeout(timeout);
    };
  }, [calculateLines]);

  useEffect(() => {
    setActiveNodes((prev) => ({ ...prev, tower: activeSources > 0 }));
  }, [activeSources]);

  return (
    <div className="grid-container">
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
          if (node.id === "tower" && activeNodes.tower) {
            if (activeFactories === 2) {
              if (activeSources === 3) towerStatus = "status-high";
              else if (activeSources === 2) towerStatus = "status-medium";
              else if (activeSources === 1) towerStatus = "status-low";
            } else if (activeFactories === 1) {
              if (activeSources >= 2) towerStatus = "status-high";
              else if (activeSources === 1) towerStatus = "status-medium";
            } else {
              towerStatus = "status-high";
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
              <span className="node-label">{node.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartGrid;
