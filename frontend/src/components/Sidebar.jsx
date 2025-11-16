import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./Sidebar.css"; // IMPORT STYLES

export default function Sidebar() {
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const loadSessions = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/sessions");
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const createNewChat = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/new-chat");
      const data = await res.json();
      navigate(`/chat/${data.id}`);
      loadSessions();
    } catch (err) {
      console.error("Failed to create new chat:", err);
    }
  };

  return (
    <div className="sidebar">
      <button className="new-chat-btn" onClick={createNewChat}>
        + New Chat
      </button>

      <h3 className="sidebar-title">Chats</h3>

      <div className="session-list">
        {sessions.length === 0 ? (
          <p className="empty-text">No sessions</p>
        ) : (
          sessions.map((s) => (
            <Link
              key={s.id}
              to={`/chat/${s.id}`}
              className={`session-item ${
                sessionId === s.id ? "active-session" : ""
              }`}
            >
              {s.title}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
