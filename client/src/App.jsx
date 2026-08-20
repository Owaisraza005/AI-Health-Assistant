import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Call from "./pages/Call";
import Report from "./pages/Report";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/call" element={<Call />} />
        <Route path="/report" element={<Report />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
