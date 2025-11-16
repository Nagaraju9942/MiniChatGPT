import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar"
import "./Home.css"

export default function Home() {
  const navigate = useNavigate();
  const startChat = async () => {
    const response = await fetch("http://localhost:5000/api/new-chat");
    const data = await response.json();
    navigate(`/chat/${data.id}`);

    console.log(data)
  };

  return (
    <div>
      <Sidebar />
      <div>
        <button
          onClick={startChat}
        >
          New Chat
        </button>
      </div>
    </div>
  );
}
