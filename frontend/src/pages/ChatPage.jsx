import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";

export default function ChatPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const [history, setHistory] = useState(() => location.state?.history ?? []);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to append an item safely
  const appendHistory = (item) => setHistory((h) => [...h, item]);

  useEffect(() => {
    // defensive: if id is missing, show friendly error
    if (!sessionId) {
      setError("Session id missing in URL (no :id param).");
      console.error("ChatPage: missing useParams().id");
      return;
    }

    // If we already have history passed from navigation, skip fetch
    if (history && history.length > 0) return;

    // fetch initial history from server
    let cancelled = false;
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:5000/api/session/${sessionId}`);
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Failed to load session (${res.status}): ${body}`);
        }
        const data = await res.json();
        if (!cancelled) {
          // ensure data is an array
          setHistory(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error fetching session history:", err);
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]); // only run when id changes

  const sendQuestion = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!question.trim()) return;

    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/chat/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }

      const answer = await res.json();
      appendHistory(answer);
      setQuestion("");
    } catch (err) {
      console.error("sendQuestion failed:", err);
      setError(err.message || "Failed to send question");
    }
  };

  // sendFeedback: optimistic update + POST to server
const sendFeedback = async (timestamp, fbType) => {
  if (!timestamp) return;

  // optimistic update locally
  setHistory(prev =>
    prev.map(it => (Number(it.timestamp) === Number(timestamp) ? { ...it, feedback: fbType } : it))
  );

  try {
    const res = await fetch(`http://localhost:5000/api/session/${sessionId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamp, feedback: fbType }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Feedback error:", res.status, txt);
      // revert optimistic update on failure
      setHistory(prev => prev.map(it => (Number(it.timestamp) === Number(timestamp) ? { ...it, feedback: undefined } : it)));
      setError(`Feedback failed: ${res.status}`);
      return;
    }

    const updated = await res.json();
    // ensure local state matches server authoritative response
    setHistory(prev => prev.map(it => (Number(it.timestamp) === Number(updated.timestamp) ? updated : it)));
  } catch (err) {
    console.error("Network error sending feedback:", err);
    // revert optimistic update
    setHistory(prev => prev.map(it => (Number(it.timestamp) === Number(timestamp) ? { ...it, feedback: undefined } : it)));
    setError("Network error sending feedback. Check server.");
  }
};


  // simple render-time error boundary
  try {
    return (
      <div style={{ padding: 20 }}>

        <h2>Chat — Session: {sessionId ?? "unknown"}</h2>
        


        {error && (
          <div style={{ color: "white", background: "crimson", padding: 8, marginBottom: 12 }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <p>Loading history…</p>
        ) : (
          <div>
            {history.length === 0 ? (
              <p>No messages yet. Ask something below.</p>
            ) : (
              <div>
                {history.map((item, idx) => (
                  <div key={item.timestamp ?? idx} style={styles.messageCard}>
                    <div><strong>You:</strong> {item.question ?? "(no question)"}</div>

                    <div style={{ marginTop: 6 }}>
                      <strong>Bot:</strong> {item.response ?? "(no response)"}
                    </div>

                    {/* optional table rendering if item.table exists */}
                    {Array.isArray(item.table) && item.table.length > 0 && (
                      <table style={styles.table}>
                        <tbody>
                          {item.table.map((row, i) => (
                            <tr key={i}>
                              <td style={styles.tableKey}>{row.key}</td>
                              <td style={styles.tableValue}>{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <div style={styles.feedbackRow}>
                      <button
                        type="button"
                        onClick={() => sendFeedback(item.timestamp, "like")}
                        disabled={item.feedback === "like"}
                        aria-pressed={item.feedback === "like"}
                        style={ item.feedback === "like" ? styles.activeButton : styles.button }
                      >
                        👍 {item.feedback === "like" ? "Liked" : "Like"}
                      </button>

                      <button
                        type="button"
                        onClick={() => sendFeedback(item.timestamp, "dislike")}
                        disabled={item.feedback === "dislike"}
                        aria-pressed={item.feedback === "dislike"}
                        style={{ ...(item.feedback === "dislike" ? styles.activeButton : styles.button), marginLeft: 8 }}
                      >
                        👎 {item.feedback === "dislike" ? "Disliked" : "Dislike"}
                      </button>

                      {item.feedback && <span style={{ marginLeft: 12, fontSize: 13 }}>{item.feedback}</span>}
                    </div>
                  </div>
                ))}

              </div>
            )}
          </div>
        )}

        <form onSubmit={sendQuestion} style={{ marginTop: 12 }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something..."
            style={{ width: "60%", padding: 8 }}
          />
          <button type="submit" style={{ marginLeft: 8, padding: "8px 12px" }}>
            Send
          </button>
        </form>
      </div>
    );
  } catch (renderErr) {
    // This catches render-time exceptions and shows them
    console.error("Render error in ChatPage:", renderErr);
    return (
      <div style={{ padding: 20 }}>
        <h2>Chat — Session: {sessionId}</h2>
        <div style={{ color: "white", background: "crimson", padding: 8 }}>
          <strong>Render error:</strong> {(renderErr && renderErr.message) || String(renderErr)}
        </div>
      </div>
    );
  }
}

const styles = {
  page: {
    padding: 20,
    fontFamily: "Arial, sans-serif",
  },

  messageCard: {
    border: "1px solid #e5e5e5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    background: "#fafafa",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
  },

  tableKey: {
    padding: "6px 8px",
    border: "1px solid #ddd",
    width: "30%",
    fontWeight: "bold",
    background: "#f5f5f5",
  },

  tableValue: {
    padding: "6px 8px",
    border: "1px solid #ddd",
  },

  feedbackRow: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
  },

  button: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },

  activeButton: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #7bd389",
    background: "#e6f4ea", // Light green
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
  },

  inputBox: {
    width: "60%",
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    marginRight: 8,
    fontSize: 16,
  },

  sendButton: {
    padding: "8px 14px",
    borderRadius: 6,
    border: "none",
    background: "#007bff",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16,
  },
};

