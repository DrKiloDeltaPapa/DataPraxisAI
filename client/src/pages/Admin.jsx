import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

// Utility to strip YAML frontmatter from markdown
function stripFrontmatter(md) {
  if (!md) return "";
  if (md.startsWith("---")) {
    const end = md.indexOf("---", 3);
    if (end !== -1) return md.slice(end + 3).replace(/^\s+/, "");
  }
  return md;
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

  const fetchBlogs = async () => {
    setBlogsLoading(true);
    setBlogsError(null);
    try {
      const res = await fetch("/api/blogs");
      if (!res.ok) throw new Error("Failed to fetch blogs");
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setBlogsError(e?.message || "Unknown error");
    } finally {
      setBlogsLoading(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      const [rag, docs, llm] = await Promise.all([
        fetch("/api/rag/status").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/docs/status").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/llm/status").then((r) => (r.ok ? r.json() : null)),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteBlog = async (id) => {
    if (!window.confirm("Delete this blog?")) return;
    setDeleteLoading(id);
    try {
      const res = await fetch(`/api/blogs/${id}`, { method: "DELETE" });
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
      const res = await fetch(`/api/blogs/${id}`, {
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

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Admin</h1>

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
