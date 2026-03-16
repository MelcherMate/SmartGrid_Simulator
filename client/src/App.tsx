import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import SmartGrid from "./pages/SmartGrid";

function App() {
  return (
    <>
      <BrowserRouter>
        <div className="appContainer">
          <Routes>
            <Route path="/" element={<SmartGrid />} />
            <Route path="*" element={<Navigate to="/" />} />
            <Route path="/smartgrid" element={<SmartGrid />} />
          </Routes>
        </div>
      </BrowserRouter>
    </>
  );
}

export default App;
