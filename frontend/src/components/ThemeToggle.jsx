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
                  <div key={idx} style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    <div><strong>You:</strong> {item.question ?? "(no question)"}</div>
                    <div><strong>Bot:</strong> {item.response ?? "(no response)"}</div>
                    
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





const renderTable = (table) => {
    if (!Array.isArray(table) || table.length === 0) return null;
    
    return (
      <table style={styles.table}>
        <tbody>
          {table.map((row, i) => (
            <tr key={i}>
              <td style={styles.tableKey}>{row.key}</td>
              <td style={styles.tableValue}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };




{renderTable(item.table)}









app.post('/api/session/:id/feedback', (req, res) => {
  const sessionId = req.params.id;
  const { timestamp, feedback } = req.body;

  if (!timestamp || (feedback !== 'like' && feedback !== 'dislike')) {
    return res.status(400).json({ error: 'Missing or invalid timestamp/feedback' });
  }

  try {
    const historyFile = path.join(dataDir, `history-${sessionId}.json`);
    if (!fs.existsSync(historyFile)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8') || '[]');

   
    const idx = history.findIndex((item) => item.timestamp === timestamp);
    if (idx === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    history[idx].feedback = feedback;
    history[idx].feedbackAt = Date.now();

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');

    return res.json(history[idx]);
  } catch (err) {
    console.error(`/api/session/${sessionId}/feedback error:`, err);
    return res.status(500).json({ error: 'Failed to save feedback' });
  }
});
