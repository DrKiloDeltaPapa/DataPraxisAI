import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { apiFetch } from "../utils/api";

// Utility to strip YAML frontmatter from markdown
function stripFrontmatter(md) {
  if (!md) return "";
  if (md.startsWith("---")) {
    const end = md.indexOf("---", 3);
    if (end !== -1) return md.slice(end + 3).replace(/^\s+/, "");
  }
  return md;
}

function formatDuration(ms) {
  if (typeof ms !== "number" || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function describePayload(event) {
  if (!event?.payload) return "";
  if (event.kind === "blog_generate") {
    const topic = event.payload.topic || "Untitled";
    const audience = event.payload.audience || "general";
    return `${topic} — audience: ${audience}`;
  }
  if (event.kind === "rag_search") {
    return `Query: ${event.payload.query || ""}`.trim();
  }
  return "";
}

export default function Admin() {
  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [blogsError, setBlogsError] = useState(null);

  const [editBlogId, setEditBlogId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [deleteLoading, setDeleteLoading] = useState(null);

  const [ragStatus, setRagStatus] = useState(null);
  const [docsStatus, setDocsStatus] = useState(null);
  const [llmStatus, setLlmStatus] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState(null);

  const [generateForm, setGenerateForm] = useState({
    topic: "",
    audience: "general",
    length: "medium",
    top_k: 8,
  });
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  const [generateError, setGenerateError] = useState(null);

  const fetchBlogs = async () => {
    setBlogsLoading(true);
    setBlogsError(null);
    try {
      const res = await apiFetch("/api/blogs");
      if (!res.ok) throw new Error("Failed to fetch blogs");
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setBlogsError(e?.message || "Unknown error");
    } finally {
      setBlogsLoading(false);
    }
  };

  const fetchTelemetry = async () => {
    setTelemetryLoading(true);
    setTelemetryError(null);
    try {
      const res = await apiFetch("/api/telemetry?limit=40");
      if (!res.ok) throw new Error("Failed to fetch telemetry");
      const data = await res.json();
      setTelemetry(Array.isArray(data?.events) ? data.events : []);
    } catch (error) {
      setTelemetryError(error?.message || "Unknown error");
    } finally {
      setTelemetryLoading(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      const [rag, docs, llm] = await Promise.all([
        apiFetch("/api/rag/status").then((r) => (r.ok ? r.json() : null)),
        apiFetch("/api/docs/status").then((r) => (r.ok ? r.json() : null)),
        apiFetch("/api/llm/status").then((r) => (r.ok ? r.json() : null)),
      ]);
      setRagStatus(rag);
      setDocsStatus(docs);
      setLlmStatus(llm);
    } catch {
      // ignore
    }
  };

  // Back-compat names (if referenced elsewhere)
  const fetchStatus = fetchStatuses;

  useEffect(() => {
    fetchStatuses();
    fetchStatus();
    fetchBlogs();
    fetchTelemetry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteBlog = async (id) => {
    if (!window.confirm("Delete this blog?")) return;
    setDeleteLoading(id);
    try {
      const res = await apiFetch(`/api/blogs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchBlogs();
    } catch (e) {
      alert("Delete failed: " + (e?.message || "Unknown error"));
    } finally {
      setDeleteLoading(null);
    }
  };

  const startEditBlog = (blog) => {
    setEditBlogId(blog.id);
    setEditFields({
      title: blog.title || "",
      subtitle: blog.subtitle || "",
      image: blog.image || "",
      content_markdown: blog.content_markdown || "",
    });
  };

  const cancelEditBlog = () => {
    setEditBlogId(null);
    setEditFields({});
  };

  const saveEditBlog = async (id) => {
    try {
      const res = await apiFetch(`/api/blogs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      if (!res.ok) throw new Error("Update failed");
      setEditBlogId(null);
      setEditFields({});
      await fetchBlogs();
    } catch (e) {
      alert("Update failed: " + (e?.message || "Unknown error"));
    }
  };

  const previewMarkdown = useMemo(
    () => stripFrontmatter(editFields?.content_markdown || ""),
    [editFields]
  );

  const generatedPreview = useMemo(
    () => stripFrontmatter(generateResult?.content_markdown || ""),
    [generateResult]
  );

  const handleGenerateChange = (field, value) => {
    setGenerateForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitGenerate = async (event) => {
    event.preventDefault();
    if (!generateForm.topic.trim()) {
      setGenerateError("Topic is required");
      return;
    }
    setGenerateError(null);
    setGenerateLoading(true);
    try {
      const payload = {
        topic: generateForm.topic.trim(),
        audience: generateForm.audience,
        length: generateForm.length,
      };
      const numericTopK = Number(generateForm.top_k);
      if (!Number.isNaN(numericTopK) && numericTopK > 0) {
        payload.top_k = numericTopK;
      }
      const res = await apiFetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Generation failed");
      setGenerateResult(data);
      await fetchBlogs();
      await fetchTelemetry();
    } catch (error) {
      setGenerateError(error?.message || "Generation failed");
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Admin</h1>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Generate blog (multi-agent)</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>
              Runs retrieval → reasoning → validation so you can inspect traces and findings instantly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setGenerateResult(null);
              setGenerateForm({ topic: "", audience: "general", length: "medium", top_k: 8 });
            }}
            style={{ height: 32 }}
          >
            Reset
          </button>
        </div>

        <form
          onSubmit={submitGenerate}
          style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 12 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Topic</span>
            <input
              value={generateForm.topic}
              onChange={(e) => handleGenerateChange("topic", e.target.value)}
              placeholder="e.g., Responsible AI in Healthcare"
              style={{ padding: 8 }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Audience</span>
              <select
                value={generateForm.audience}
                onChange={(e) => handleGenerateChange("audience", e.target.value)}
                style={{ padding: 8 }}
              >
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="business">Business</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Length</span>
              <select
                value={generateForm.length}
                onChange={(e) => handleGenerateChange("length", e.target.value)}
                style={{ padding: 8 }}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Top K chunks</span>
              <input
                type="number"
                min="1"
                max="30"
                value={generateForm.top_k}
                onChange={(e) => handleGenerateChange("top_k", e.target.value)}
                style={{ padding: 8 }}
              />
            </label>
          </div>

          <div>
            <button type="submit" disabled={generateLoading}>
              {generateLoading ? "Running agents…" : "Generate blog"}
            </button>
          </div>
        </form>

        {generateError && (
          <div style={{ color: "crimson", marginBottom: 12 }}>{generateError}</div>
        )}

        {generateResult && (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 12,
              background: "white",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
              <span
                style={{
                  fontWeight: 600,
                  color: generateResult.validation?.passed !== false ? "#047857" : "#b45309",
                }}
              >
                {generateResult.validation?.passed !== false
                  ? "Validation passed"
                  : `${generateResult.validation?.findings?.length || 0} validation finding(s)`}
              </span>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                Generated at {new Date(generateResult.created_at).toLocaleString()}
              </span>
            </div>

            {generateResult.validation?.findings?.length > 0 && (
              <ul style={{ marginTop: 0, paddingLeft: 18 }}>
                {generateResult.validation.findings.map((finding, idx) => (
                  <li key={idx} style={{ fontSize: 13 }}>
                    <strong>{finding.level.toUpperCase()}</strong>: {finding.message}
                  </li>
                ))}
              </ul>
            )}

            {generateResult.sources?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ marginBottom: 6 }}>Sources</h4>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {generateResult.sources.map((source, idx) => (
                    <li key={idx} style={{ fontSize: 13 }}>
                      <strong>{source.title || "Untitled"}</strong>
                      {typeof source.score === "number" && (
                        <span style={{ marginLeft: 6, opacity: 0.7 }}>
                          score {source.score.toFixed(2)}
                        </span>
                      )}
                      {source.path && <span style={{ opacity: 0.6 }}> — {source.path}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(generateResult.trace) && generateResult.trace.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ marginBottom: 6 }}>Agent trace</h4>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {generateResult.trace.map((step, idx) => (
                    <li key={idx}>
                      <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                        [{step.agent}]
                      </span>{" "}
                      {step.status}
                      {step.detail && <span style={{ opacity: 0.7 }}> — {step.detail}</span>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <h4 style={{ marginBottom: 6 }}>Preview</h4>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                  maxHeight: 300,
                  overflow: "auto",
                }}
              >
                <ReactMarkdown>{generatedPreview}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </section>

      <section
        style={{
          borderRadius: 16,
          padding: 18,
          marginBottom: 24,
          border: "1px solid #c7d2fe",
          background: "linear-gradient(135deg, #eef2ff 0%, #fdf2f8 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Recent telemetry</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>
              Live timeline of orchestrated RAG runs with validation, trace, and chunk metrics.
            </p>
          </div>
          <button onClick={fetchTelemetry} disabled={telemetryLoading} style={{ height: 34 }}>
            {telemetryLoading ? "Refreshing telemetry…" : "Refresh"}
          </button>
        </div>

        {telemetryError && (
          <div style={{ color: "#b91c1c", marginBottom: 8 }}>{telemetryError}</div>
        )}

        {telemetryLoading && telemetry.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Loading timeline…</div>
        ) : telemetry.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No telemetry yet. Trigger a search or blog generation to populate this feed.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {telemetry.map((event) => {
              const createdAt = new Date(event.created_at).toLocaleString();
              const validationPassed = event.validation?.passed !== false;
              const validationCount = event.validation?.findings?.length || 0;
              return (
                <div
                  key={event.id}
                  style={{
                    borderRadius: 14,
                    padding: 14,
                    background: "rgba(255,255,255,0.82)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    boxShadow: "0 10px 35px rgba(15,23,42,0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: event.kind === "blog_generate" ? "#7c3aed" : "#0369a1" }}>
                      {event.kind.replace("_", " ")}
                    </span>
                    <span style={{ opacity: 0.7 }}>{createdAt}</span>
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {describePayload(event) || "—"}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <span
                      style={{
                        background: "#eef2ff",
                        borderRadius: 999,
                        padding: "2px 10px",
                        fontSize: 12,
                        color: "#4338ca",
                      }}
                    >
                      {event.chunk_count ?? "–"} chunks
                    </span>
                    <span
                      style={{
                        background: "#ecfeff",
                        borderRadius: 999,
                        padding: "2px 10px",
                        fontSize: 12,
                        color: "#0f766e",
                      }}
                    >
                      {formatDuration(event.duration_ms)}
                    </span>
                  </div>
                  {event.validation && (
                    <div
                      style={{
                        fontSize: 12,
                        color: validationPassed ? "#047857" : "#b45309",
                        marginBottom: 6,
                      }}
                    >
                      {validationPassed ? "Validation passed" : `${validationCount} finding(s)`}
                    </div>
                  )}
                  {Array.isArray(event.sources) && event.sources.length > 0 && (
                    <details style={{ fontSize: 12, marginBottom: 4 }}>
                      <summary style={{ cursor: "pointer" }}>
                        Sources ({event.sources.length})
                      </summary>
                      <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                        {event.sources.slice(0, 3).map((src, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            <strong>{src.title || src.source?.title || src.id || "chunk"}</strong>
                            {typeof src.score === "number" && (
                              <span style={{ opacity: 0.7 }}> — score {src.score.toFixed(2)}</span>
                            )}
                          </li>
                        ))}
                        {event.sources.length > 3 && <li>+{event.sources.length - 3} more…</li>}
                      </ul>
                    </details>
                  )}
                  {Array.isArray(event.trace) && event.trace.length > 0 && (
                    <details style={{ fontSize: 12 }}>
                      <summary style={{ cursor: "pointer" }}>Trace ({event.trace.length})</summary>
                      <ol style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                        {event.trace.map((step, idx) => (
                          <li key={idx}>
                            <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                              [{step.agent}]
                            </span>{" "}
                            {step.status}
                            {step.detail && <span style={{ opacity: 0.7 }}> — {step.detail}</span>}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 700 }}>RAG</div>
          <pre style={{ margin: 0, fontSize: 12 }}>
            {ragStatus ? JSON.stringify(ragStatus, null, 2) : "—"}
          </pre>
        </div>
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 700 }}>Docs</div>
          <pre style={{ margin: 0, fontSize: 12 }}>
            {docsStatus ? JSON.stringify(docsStatus, null, 2) : "—"}
          </pre>
        </div>
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 700 }}>LLM</div>
          <pre style={{ margin: 0, fontSize: 12 }}>
            {llmStatus ? JSON.stringify(llmStatus, null, 2) : "—"}
          </pre>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button onClick={fetchBlogs} disabled={blogsLoading}>
          {blogsLoading ? "Refreshing…" : "Refresh Blogs"}
        </button>
        {blogsError && (
          <span style={{ marginLeft: 12, color: "crimson" }}>{blogsError}</span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Blogs ({blogs.length})</h2>

          {blogs.length === 0 && !blogsLoading ? (
            <div style={{ opacity: 0.8 }}>No blogs yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {blogs.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: 12,
                    border: "1px solid #ddd",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{b.title || "(untitled)"}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>id: {b.id}</div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => startEditBlog(b)}>Edit</button>
                      <button
                        onClick={() => handleDeleteBlog(b.id)}
                        disabled={deleteLoading === b.id}
                      >
                        {deleteLoading === b.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>

                  {b.subtitle && (
                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                      {b.subtitle}
                    </div>
                  )}
                  {b.validation && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: b.validation.passed !== false ? "#047857" : "#b45309",
                      }}
                    >
                      Validation: {b.validation.passed !== false ? "passed" : `${b.validation.findings?.length || 0} finding(s)`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 style={{ marginTop: 0 }}>Editor</h2>

          {!editBlogId ? (
            <div style={{ opacity: 0.8 }}>Click <b>Edit</b> on a blog to modify it.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Editing blog id: {editBlogId}</div>

              <label>
                <div style={{ fontWeight: 600 }}>Title</div>
                <input
                  value={editFields.title || ""}
                  onChange={(e) => setEditFields((p) => ({ ...p, title: e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                />
              </label>

              <label>
                <div style={{ fontWeight: 600 }}>Subtitle</div>
                <input
                  value={editFields.subtitle || ""}
                  onChange={(e) => setEditFields((p) => ({ ...p, subtitle: e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                />
              </label>

              <label>
                <div style={{ fontWeight: 600 }}>Image URL</div>
                <input
                  value={editFields.image || ""}
                  onChange={(e) => setEditFields((p) => ({ ...p, image: e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                />
              </label>

              <label>
                <div style={{ fontWeight: 600 }}>Markdown</div>
                <textarea
                  value={editFields.content_markdown || ""}
                  onChange={(e) =>
                    setEditFields((p) => ({ ...p, content_markdown: e.target.value }))
                  }
                  rows={10}
                  style={{ width: "100%", padding: 8, fontFamily: "monospace" }}
                />
              </label>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => saveEditBlog(editBlogId)}>Save</button>
                <button onClick={cancelEditBlog}>Cancel</button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Preview</div>
                <div
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: 12,
                    maxHeight: 420,
                    overflow: "auto",
                  }}
                >
                  <ReactMarkdown>{previewMarkdown}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
