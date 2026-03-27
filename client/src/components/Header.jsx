import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { apiFetch } from "../utils/api";

const Header = () => {
  // 🔹 Placeholder blog data (replace this later with your real blog posts)
  const blogData = [
    { id: 1, title: "The Rise of Applied Intelligence" },
    { id: 2, title: "Bridging Research and Real-World AI" },
    { id: 3, title: "How Data Science Drives Smarter Decisions" },
    { id: 4, title: "Deploying AI Systems at Scale" },
    { id: 5, title: "Interpretable Machine Learning for Impact" },
  ];

  // 🔹 React state
  const [query, setQuery] = useState("");
  const [telemetry, setTelemetry] = useState([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let abort = false;
    setTelemetryLoading(true);
    apiFetch("/api/telemetry?limit=4")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (abort) return;
        setTelemetry(Array.isArray(data?.events) ? data.events : []);
      })
      .catch(() => {
        if (!abort) setTelemetry([]);
      })
      .finally(() => !abort && setTelemetryLoading(false));
    return () => {
      abort = true;
    };
  }, []);

  // 🔹 Filtered results based on user input
  const filteredBlogs = blogData.filter((blog) =>
    blog.title.toLowerCase().includes(query.toLowerCase())
  );

  const formatDuration = (ms) => {
    if (typeof ms !== "number" || Number.isNaN(ms)) return "—";
    if (ms < 1000) return `${ms.toFixed(0)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  return (
    <div className="mx-8 sm:mx-16 xl:mx-24 relative">
      {/* Badge */}
      <div className="text-center mt-20 mb-8">
        <div
          className="inline-flex items-center justify-center gap-4 px-6 py-1.5
          mb-4 border border-primary/40 bg-primary/10 rounded-full text-sm
          text-primary"
        >
          <p>Powered by AI</p>
          <img src={assets.star_icon} className="w-2.5" alt="star icon" />
        </div>

        {/* Main Headline */}
        <h1
          className="text-3xl sm:text-6xl font-semibold sm:leading-[1.2]
          text-gray-800"
        >
          Empowering Decisions Through Applied Intelligence
        </h1>

        {/* Subtext */}
          <p className="text-gray-600 mt-6 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Data Praxis AI bridges cutting-edge research and real-world practice —
            transforming data into actionable insights, building smarter systems,
            and driving measurable impact.
          </p>

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button
            type="button"
              onClick={() => navigate("/admin")}
            className="flex items-center gap-2 rounded-full bg-primary text-white px-6 py-2 text-sm shadow-md hover:shadow-lg transition"
          >
            View telemetry console
            <img src={assets.arrow} className="w-3" alt="arrow" />
          </button>
          <button
            type="button"
              onClick={() => navigate("/blog")}
            className="rounded-full border border-primary/40 px-6 py-2 text-sm text-primary hover:bg-primary/10 transition"
          >
            Browse articles
          </button>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex justify-center mt-10"
        >
          <input
            type="text"
            placeholder="Search AI insights, projects, or articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-2/3 md:w-1/2 px-5 py-3 rounded-l-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-gray-700"
          />
          <button
            type="submit"
            className="bg-primary text-white px-6 py-3 rounded-r-full hover:bg-primary/80 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Featured Blog Section */}
      <div className="mt-20 bg-white shadow-md rounded-2xl p-8 sm:p-10 text-left max-w-4xl mx-auto border border-gray-100">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4">
          🌐 Featured Blog: *The Rise of Applied Intelligence*
        </h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Artificial intelligence is no longer theoretical — it’s driving real
          transformation across industries. Here we explore how
          AI translates cutting-edge models into measurable results
          for organizations, educators, and researchers.
        </p>
        <button className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary/80 transition">
          Read More
        </button>
      </div>

      {/* Live telemetry snapshot */}
      <div className="mt-16">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Live multi-agent data</p>
            <h3 className="text-2xl font-semibold text-gray-800">Latest orchestrator runs</h3>
            <p className="text-gray-500 text-sm">
              Pulled directly from the backend telemetry store so you always know what the agents are doing.
            </p>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm"
          >
            Open console
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {telemetryLoading && telemetry.length === 0 && (
            <div className="col-span-full text-gray-500 text-sm">Loading recent runs…</div>
          )}
          {(telemetry || []).slice(0, 3).map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm p-5 shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold tracking-[0.2em] text-gray-500">
                  {event.kind.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(event.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-1">
                {event.payload?.topic || event.payload?.query || 'Untitled run'}
              </div>
              <p className="text-sm text-gray-500 mb-3">
                {event.chunk_count ?? '—'} chunks · {formatDuration(event.duration_ms)}
              </p>
              <div className="text-xs uppercase tracking-[0.3em] text-gray-500">
                {event.validation?.passed === false
                  ? `${event.validation.findings?.length || 0} warnings`
                  : 'validated'}
              </div>
            </div>
          ))}
          {!telemetryLoading && telemetry.length === 0 && (
            <div className="col-span-full text-sm text-gray-500">
              Run a search or generate a blog to populate telemetry.
            </div>
          )}
        </div>
      </div>

      {/* 🔹 Dynamic search results */}
      {query && (
        <div className="max-w-3xl mx-auto mt-10 bg-white shadow-md rounded-2xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Search Results for: “{query}”
          </h3>
          {filteredBlogs.length > 0 ? (
            <ul className="space-y-2">
              {filteredBlogs.map((blog) => (
                <li
                  key={blog.id}
                  className="text-primary font-medium hover:underline cursor-pointer"
                >
                  {blog.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No matching blogs found.</p>
          )}
        </div>
      )}

      {/* Gradient background */}
      <img
        src={assets.gradientBackground}
        alt="gradient background"
        className="absolute -top-50 -z-10 opacity-50 w-full"
      />
    </div>
  );
};

export default Header;


