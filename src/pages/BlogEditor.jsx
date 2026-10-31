import { useEffect, useRef, useState } from "react";
import StaffAccess from "../components/StaffAccess";
import BlogArticle from "../components/BlogArticle";
import {
  blogDesk,
  blogSave,
  blogUpload,
  blogPrivateImage,
  blogModeration,
  blogModerate,
  blogAI,
  blogError,
} from "../services/blog";
import { lagosInput, lagosISO, makeSlug, newBlogId } from "../utils/blog.mjs";
import "../styles/blog.css";
const blank = () => ({
  id: newBlogId(),
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  author: "",
  category: "Teaching",
  tags: [],
  cover_id: null,
  cover_alt: "",
  status: "draft",
  publish_at: null,
  revision: 0,
});
export default function BlogEditor() {
  return (
    <StaffAccess title="Journal editorial desk" publicPath="/blog">
      <Desk />
    </StaffAccess>
  );
}
function Desk() {
  const [posts, setPosts] = useState([]),
    [page, setPage] = useState(0),
    [hasMore, setHasMore] = useState(false),
    [draft, setDraft] = useState(blank),
    [reviewed, setReviewed] = useState(false),
    [schedule, setSchedule] = useState(""),
    [tags, setTags] = useState(""),
    [image, setImage] = useState(""),
    [preview, setPreview] = useState(false),
    [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [reload, setReload] = useState(0);
  const [comments, setComments] = useState([]),
    [filter, setFilter] = useState("pending"),
    [commentPage, setCommentPage] = useState(0),
    [commentMore, setCommentMore] = useState(false);
  const [aiReady, setAiReady] = useState(false),
    [aiConsent, setAiConsent] = useState(false),
    [aiInput, setAiInput] = useState(""),
    [aiAction, setAiAction] = useState("draft"),
    [suggestion, setSuggestion] = useState(null);
  const uploadRef = useRef(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    blogDesk(page)
      .then((r) => {
        if (active) {
          setPosts(r.posts.slice(0, 30));
          setHasMore(r.posts.length > 30);
          setAiReady(r.ai_ready);
        }
      })
      .catch((e) => {
        if (active) setError(blogError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, reload]);
  useEffect(() => {
    let active = true;
    setComments([]);
    blogModeration(filter, commentPage)
      .then((r) => {
        if (active) {
          setComments(r.slice(0, 30));
          setCommentMore(r.length > 30);
        }
      })
      .catch((e) => {
        if (active) setError(blogError(e));
      });
    return () => {
      active = false;
    };
  }, [filter, commentPage, reload]);
  useEffect(() => {
    let active = true,
      url = "";
    setImage("");
    if (draft.cover_id)
      blogPrivateImage(draft.cover_id)
        .then((blob) => {
          url = URL.createObjectURL(blob);
          if (active) setImage(url);
          else URL.revokeObjectURL(url);
        })
        .catch((e) => {
          if (active) setError(blogError(e));
        });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [draft.cover_id]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function edit(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
    setReviewed(false);
  }
  function choose(p) {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    const effective =
      p?.status === "scheduled" && Date.parse(p.publish_at) <= Date.now()
        ? { ...p, status: "published" }
        : p;
    setDraft(effective || blank());
    setTags(effective?.tags.join(", ") || "");
    setSchedule(lagosInput(effective?.publish_at));
    setReviewed(false);
    setPreview(false);
    setSuggestion(null);
    setDirty(false);
    setError("");
    setMessage("");
    uploadRef.current = null;
  }
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e.response ? blogError(e) : e.message || blogError(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    const releaseTime =
      e.currentTarget.elements.namedItem("publish_time")?.value || schedule;
    await run(async () => {
      const publish_at =
        draft.status === "draft"
          ? schedule
            ? lagosISO(releaseTime)
            : null
          : draft.status === "published"
            ? draft.publish_at && Date.parse(draft.publish_at) <= Date.now()
              ? draft.publish_at
              : new Date().toISOString()
            : lagosISO(releaseTime);
      const p = await blogSave({
        ...draft,
        tags: tags
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        publish_at,
        reviewed,
      });
      setDraft(p);
      setDirty(false);
      setReviewed(false);
      setSchedule(lagosInput(p.publish_at));
      setMessage(
        p.status === "draft"
          ? "Draft saved. It is private."
          : p.status === "scheduled"
            ? "Reviewed and scheduled. It will appear at the selected Lagos time."
            : "Article published.",
      );
      setReload((v) => v + 1);
    });
  }
  async function upload(file) {
    if (!file) return;
    await run(async () => {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5242880
      )
        throw Error("Choose a JPEG, PNG or WebP image up to 5 MB.");
      const same = uploadRef.current?.file === file;
      const id = same ? uploadRef.current.id : newBlogId();
      uploadRef.current = { file, id };
      const r = await blogUpload(file, id);
      edit("cover_id", r.id);
      setMessage("Image uploaded privately. Save the article to attach it.");
    });
  }
  async function moderate(c, status) {
    await run(async () => {
      await blogModerate(c.id, status, c.status);
      setMessage("Moderation saved.");
      setReload((v) => v + 1);
    });
  }
  async function ai(e) {
    e.preventDefault();
    await run(async () => {
      setSuggestion(
        await blogAI({ action: aiAction, input: aiInput, consent: aiConsent }),
      );
      setMessage(
        "AI suggestion ready. Review its accuracy and Bible references before applying.",
      );
    });
  }
  return (
    <div className="blog-desk">
      <p>
        Write, review and schedule church articles. Scheduled times use{" "}
        <strong>Africa/Lagos (UTC+1)</strong>. Images and articles remain
        private until release.
      </p>
      {error && (
        <div role="alert" className="blog-notice">
          {error}
          <button
            className="secondary-button"
            onClick={() => setReload((v) => v + 1)}
          >
            Reload lists
          </button>
        </div>
      )}
      {message && (
        <p className="blog-notice" role="status">
          {message}
        </p>
      )}
      <div className="blog-desk-layout">
        <aside className="blog-draft-list">
          <div className="platform-actions">
            <h2>Articles</h2>
            <button
              className="secondary-button"
              disabled={busy || loading}
              onClick={() => choose(null)}
            >
              New article
            </button>
          </div>
          {loading && <p role="status">Loading articles…</p>}
          {posts.length === 0 && !loading && <p>No saved articles yet.</p>}
          {posts.map((p) => (
            <button
              disabled={busy}
              className={`blog-draft-row ${p.id === draft.id ? "selected" : ""}`}
              key={p.id}
              onClick={() => choose(p)}
            >
              <strong>{p.title}</strong>
              <span>
                {p.status === "scheduled" &&
                Date.parse(p.publish_at) <= Date.now()
                  ? "published"
                  : p.status}{" "}
                · revision {p.revision}
              </span>
              {p.publish_at && (
                <time>{lagosInput(p.publish_at).replace("T", " ")} WAT</time>
              )}
            </button>
          ))}
          <div className="platform-actions">
            <button
              disabled={busy || page === 0}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous
            </button>
            <button
              disabled={busy || !hasMore}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </button>
          </div>
        </aside>
        <div>
          <form className="blog-edit-form" onSubmit={save}>
            <fieldset disabled={busy}>
              <legend>{draft.revision ? "Edit article" : "New article"}</legend>
              <label>
                Title
                <input
                  required
                  maxLength={160}
                  value={draft.title}
                  onChange={(e) => {
                    edit("title", e.target.value);
                    if (!draft.revision) edit("slug", makeSlug(e.target.value));
                  }}
                />
              </label>
              <label>
                Article link
                <input
                  required
                  readOnly={draft.revision > 0}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  maxLength={120}
                  value={draft.slug}
                  onChange={(e) => edit("slug", e.target.value)}
                />
                <small>
                  /blog/{draft.slug || "your-article-title"} · fixed after first
                  save
                </small>
              </label>
              <div className="blog-form-pair">
                <label>
                  Author’s name
                  <input
                    required
                    maxLength={100}
                    value={draft.author}
                    onChange={(e) => edit("author", e.target.value)}
                  />
                </label>
                <label>
                  Category
                  <input
                    required
                    maxLength={60}
                    value={draft.category}
                    onChange={(e) => edit("category", e.target.value)}
                  />
                </label>
              </div>
              <label>
                Short introduction
                <textarea
                  rows={3}
                  maxLength={500}
                  value={draft.excerpt}
                  onChange={(e) => edit("excerpt", e.target.value)}
                />
              </label>
              <label>
                Article
                <textarea
                  required
                  rows={16}
                  maxLength={40000}
                  value={draft.body}
                  onChange={(e) => edit("body", e.target.value)}
                />
                <small>
                  Plain text. Separate paragraphs with a blank line. HTML is
                  displayed as text.
                </small>
              </label>
              <label>
                Tags, separated by commas
                <input
                  maxLength={330}
                  value={tags}
                  onChange={(e) => {
                    setTags(e.target.value);
                    setDirty(true);
                    setReviewed(false);
                  }}
                />
                <small>Up to 8 tags, 40 characters each.</small>
              </label>
              <label>
                Cover image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => upload(e.target.files?.[0])}
                />
                <small>
                  Still JPEG, PNG or WebP. Maximum 5 MB / 16 megapixels.
                </small>
              </label>
              {image && (
                <img
                  className="blog-editor-image"
                  src={image}
                  alt={draft.cover_alt || "Private cover preview"}
                />
              )}
              <label>
                Describe the cover image
                <input
                  maxLength={250}
                  value={draft.cover_alt}
                  onChange={(e) => edit("cover_alt", e.target.value)}
                />
              </label>
              <label>
                Publication
                <select
                  value={draft.status}
                  onChange={(e) => edit("status", e.target.value)}
                >
                  <option value="draft">
                    Private draft / withdraw article
                  </option>
                  <option value="scheduled">Schedule for later</option>
                  <option value="published">Publish now</option>
                </select>
              </label>
              {draft.status === "scheduled" && (
                <label>
                  Release date and time — Lagos
                  <input
                    type="datetime-local"
                    name="publish_time"
                    onInput={(e) => {
                      setSchedule(e.currentTarget.value);
                      setReviewed(false);
                      setDirty(true);
                    }}
                    required
                    value={schedule}
                    onChange={(e) => {
                      setSchedule(e.target.value);
                      setReviewed(false);
                      setDirty(true);
                    }}
                  />
                </label>
              )}
              {draft.status !== "draft" && (
                <label className="blog-check">
                  <input
                    type="checkbox"
                    required
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  I have reviewed the wording, Bible references, author, image
                  rights and release time.
                </label>
              )}
              <div className="platform-actions">
                <button className="ministry-button dark">
                  {busy
                    ? "Working…"
                    : draft.status === "draft"
                      ? "Save private draft"
                      : draft.status === "scheduled"
                        ? "Approve & schedule"
                        : "Approve & publish"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setPreview((v) => !v)}
                >
                  {preview ? "Hide preview" : "Preview article"}
                </button>
              </div>
            </fieldset>
          </form>
          {preview && (
            <section className="blog-preview">
              <p className="ministry-eyebrow">
                Private preview — unsaved changes included
              </p>
              <BlogArticle
                post={{ ...draft, tags: tags.split(",").filter(Boolean) }}
                image={image}
              />
            </section>
          )}
        </div>
      </div>
      <section className="blog-ai">
        <p className="ministry-eyebrow">Editorial assistant</p>
        <h2>A starting point. Your pastoral judgment.</h2>
        <p>
          AI suggestions need human review. They cannot publish or change your
          article automatically.
        </p>
        {!aiReady ? (
          <p className="blog-notice">
            AI is not configured yet. Manual editing, scheduling and publishing
            are available. The ministry owner must configure a suitable provider
            account before this feature can run.
          </p>
        ) : (
          <form onSubmit={ai}>
            <label>
              Task
              <select
                disabled={busy}
                value={aiAction}
                onChange={(e) => setAiAction(e.target.value)}
              >
                <option value="draft">Draft from a brief</option>
                <option value="improve">Improve article wording</option>
                <option value="metadata">
                  Suggest title, introduction and tags
                </option>
              </select>
            </label>
            <label>
              Public brief or article
              <textarea
                required
                maxLength={20000}
                rows={6}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              />
            </label>
            <label className="blog-check">
              <input
                type="checkbox"
                required
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
              />
              I am an adult editor, accept the provider terms, and consent to
              sending this public editorial text to Google Gemini. It contains
              no private contact, prayer, chat or payment information.
            </label>
            <p className="blog-small">
              Maximum 10 requests per staff member per Lagos day. Free-tier data
              may be used by the provider to improve its products.
            </p>
            <button className="ministry-button dark" disabled={busy}>
              Generate suggestion
            </button>
          </form>
        )}
        {suggestion && (
          <div className="blog-suggestion">
            <h3>{suggestion.title}</h3>
            <p>{suggestion.excerpt}</p>
            <div className="blog-prose">{suggestion.body}</div>
            <p>{suggestion.tags.join(", ")}</p>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => {
                if (
                  !window.confirm(
                    "Replace the current title, introduction, tags and any suggested article text? Unsaved wording will be replaced.",
                  )
                )
                  return;
                setDraft((d) => ({
                  ...d,
                  title: suggestion.title,
                  excerpt: suggestion.excerpt,
                  ...(suggestion.body ? { body: suggestion.body } : {}),
                  ...(d.revision ? {} : { slug: makeSlug(suggestion.title) }),
                }));
                setTags(suggestion.tags.join(", "));
                setReviewed(false);
                setDirty(true);
                setSuggestion(null);
              }}
            >
              Apply to unsaved draft
            </button>
            <button
              className="secondary-button"
              onClick={() => setSuggestion(null)}
            >
              Discard suggestion
            </button>
          </div>
        )}
      </section>
      <section className="blog-moderation">
        <h2>Comment moderation</h2>
        <p>
          Only approved comments appear publicly. Reject spam, abuse and private
          information.
        </p>
        <label>
          Queue
          <select
            disabled={busy}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCommentPage(0);
            }}
          >
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        {comments.length === 0 && <p>No comments in this queue.</p>}
        {comments.map((c) => (
          <article className="blog-comment" key={c.id}>
            <strong>{c.alias}</strong>
            <p className="blog-small">
              Article:{" "}
              {posts.find((p) => p.id === c.post_id)?.title || c.post_id}
            </p>
            <p>{c.body}</p>
            <div className="platform-actions">
              {["approved", "rejected", "pending"]
                .filter((s) => s !== c.status)
                .map((status) => (
                  <button
                    className="secondary-button"
                    disabled={busy}
                    key={status}
                    onClick={() => moderate(c, status)}
                  >
                    {status === "approved"
                      ? "Approve"
                      : status === "rejected"
                        ? "Reject"
                        : "Return to review"}
                  </button>
                ))}
            </div>
          </article>
        ))}
        <div className="platform-actions">
          <button
            disabled={busy || commentPage === 0}
            onClick={() => setCommentPage((v) => v - 1)}
          >
            Previous comments
          </button>
          <button
            disabled={busy || !commentMore}
            onClick={() => setCommentPage((v) => v + 1)}
          >
            Next comments
          </button>
        </div>
      </section>
    </div>
  );
}
