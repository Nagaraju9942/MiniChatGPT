import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ChatPage from "./pages/ChatPage";
console.log("App loaded")

function App() {
  return (

    
      <BrowserRouter>
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route exact path="/chat/:sessionId" element={<ChatPage />} />

        </Routes>
      </BrowserRouter>
    
  );
}

export default App;
