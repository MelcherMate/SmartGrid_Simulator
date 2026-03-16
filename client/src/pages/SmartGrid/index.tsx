import { useEffect, useRef, useState } from "react";
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
    label: "Industrial A",
    img: "factory.png",
    x: 85,
    y: 30,
  },
  {
    id: "factory2",
    type: "consumer",
    label: "Industrial B",
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
  { from: "tower", to: "factory2" },
];

const SmartGrid = () => {
  const [activeNodes, setActiveNodes] = useState<Record<string, boolean>>({
    wind: true,
    hydrogen: true,
    solar: true,
    tower: true,
    factory1: true,
    factory2: true,
  });
  const [lines, setLines] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateLines = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    const newLines = CONNECTIONS.map((conn) => {
      const start = document.getElementById(conn.from);
      const end = document.getElementById(conn.to);
      if (start && end) {
        const sRect = start.getBoundingClientRect();
        const eRect = end.getBoundingClientRect();
        return {
          id: `${conn.from}-${conn.to}`,
          x1: sRect.left + sRect.width / 2 - rect.left,
          y1: sRect.top + sRect.height / 2 - rect.top,
          x2: eRect.left + eRect.width / 2 - rect.left,
          y2: eRect.top + eRect.height / 2 - rect.top,
          active: activeNodes[conn.from] && activeNodes[conn.to],
        };
      }
      return null;
    }).filter(Boolean);
    setLines(newLines);
  };

  useEffect(() => {
    const timeout = setTimeout(calculateLines, 100);
    window.addEventListener("resize", calculateLines);
    return () => {
      window.removeEventListener("resize", calculateLines);
      clearTimeout(timeout);
    };
  }, [activeNodes]);

  return (
    <div className="grid-container">
      <div className="grid-board" ref={containerRef}>
        <svg className="grid-svg">
          {lines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              className={`grid-line ${line.active ? "active-flow" : ""}`}
            />
          ))}
        </svg>

        {NODES.map((node) => (
          <div
            key={node.id}
            id={node.id}
            className={`grid-node ${node.type} ${!activeNodes[node.id] ? "node-off" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() =>
              setActiveNodes((p) => ({ ...p, [node.id]: !p[node.id] }))
            }
          >
            <div className="icon-wrapper">
              <img src={`/icons/png/${node.img}`} alt={node.label} />
            </div>
            <span className="node-label">{node.label}</span>
          </div>
        ))}
      </div>

      <div className="grid-ui">
        <h2>Smart Grid Control</h2>
        <p>Click on the icons to toggle the energy sources!</p>
      </div>
    </div>
  );
};

export default SmartGrid;
