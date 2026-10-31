import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MetaTags from "../components/MetaTags";
import { blogList, blogError, blogImage, blogDate } from "../services/blog";
import "../styles/blog.css";
export default function Blog() {
  const [params, setParams] = useSearchParams(),
    q = params.get("q") || "",
    category = params.get("category") || "",
    page = Number(params.get("page") || 0);
  const [search, setSearch] = useState(q),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setResult(null);
    setError("");
    blogList({ q, category, page })
      .then((r) => {
        if (active) setResult(r);
      })
      .catch((e) => {
        if (active) setError(blogError(e));
      });
    return () => {
      active = false;
    };
  }, [q, category, page, retry]);
  const change = (values) => setParams({ ...{ q, category }, ...values });
  return (
    <div className="blog-page">
      <MetaTags
        title="The CRH Journal"
        description="Teaching, stories and reflections from Christ’s Reformation House."
      />
      <section className="blog-hero">
        <div className="container-custom">
          <p className="ministry-eyebrow">Faith for everyday life</p>
          <h1>The CRH Journal</h1>
          <p>
            Rooted in the Word.
            <br />
            Lived out in the world.
          </p>
          <div className="blog-hero-links">
            <Link to="/devotional">Read the daily devotional →</Link>
            <Link to="/admin/blog">Editorial desk</Link>
          </div>
        </div>
      </section>
      <section className="ministry-section blog-content">
        <form
          className="blog-search"
          onSubmit={(e) => {
            e.preventDefault();
            change({ q: search.trim(), page: 0 });
          }}
        >
          <label>
            Search the journal
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
              placeholder="Faith, prayer, church life…"
            />
          </label>
          <button className="ministry-button dark">Search</button>
          {(q || category) && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSearch("");
                setParams({});
              }}
            >
              Clear filters
            </button>
          )}
        </form>
        {category && <p>Category: {category}</p>}
        {!result && !error && <p role="status">Loading the journal…</p>}
        {error && (
          <div className="blog-notice" role="alert">
            <p>{error}</p>
            <button
              className="secondary-button"
              onClick={() => setRetry((v) => v + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {result?.posts.length === 0 && (
          <div className="blog-empty">
            <p className="ministry-eyebrow">A space to grow</p>
            <h2>
              {q || category
                ? "No articles match these filters."
                : "The next story starts here."}
            </h2>
            <p>
              {q || category
                ? "Try another word or clear the filters."
                : "Our ministry team will share teaching, reflections and church stories here. Read the daily devotional while you wait."}
            </p>
            <Link className="ministry-button dark" to="/devotional">
              Explore the devotional
            </Link>
          </div>
        )}
        <div className="blog-grid">
          {result?.posts.map((p) => (
            <article className="blog-card" key={p.id}>
              <Link to={`/blog/${p.slug}`} tabIndex={-1} aria-hidden="true">
                <img src={blogImage(p.cover_id)} alt="" loading="lazy" />
              </Link>
              <div>
                <button
                  className="blog-category"
                  onClick={() => change({ category: p.category, page: 0 })}
                >
                  {p.category}
                </button>
                <h2>
                  <Link to={`/blog/${p.slug}`}>{p.title}</Link>
                </h2>
                <p>{p.excerpt}</p>
                <p className="blog-byline">
                  {p.author} · {blogDate(p.publish_at)}
                </p>
                <Link className="blog-read" to={`/blog/${p.slug}`}>
                  Read article →
                </Link>
              </div>
            </article>
          ))}
        </div>
        {result && (page > 0 || result.has_more) && (
          <nav className="platform-actions" aria-label="Blog pages">
            <button
              className="secondary-button"
              disabled={page === 0}
              onClick={() => change({ page: page - 1 })}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              className="secondary-button"
              disabled={!result.has_more}
              onClick={() => change({ page: page + 1 })}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
