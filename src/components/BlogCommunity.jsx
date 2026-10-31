import { useEffect, useState } from "react";
import {
  blogCommunity,
  blogInteract,
  blogError,
  blogDate,
  blogUrl,
  blogImage,
} from "../services/blog";
import { readerId, newBlogId } from "../utils/blog.mjs";
import FormVerification from "./FormVerification";
export default function BlogCommunity({ post }) {
  const [data, setData] = useState(null),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [action, setAction] = useState(""),
    [token, setToken] = useState(""),
    [ready, setReady] = useState(false),
    [reset, setReset] = useState(0),
    [busy, setBusy] = useState(false),
    [liked, setLiked] = useState(false);
  const [alias, setAlias] = useState(""),
    [body, setBody] = useState(""),
    [consent, setConsent] = useState(false),
    [website, setWebsite] = useState(""),
    [commentId, setCommentId] = useState(() => newBlogId());
  const url = blogUrl(post.slug),
    caption = `${post.title}\n${url}`;
  useEffect(() => {
    let active = true;
    setData(null);
    blogCommunity(post.id, page)
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(blogError(e));
      });
    return () => {
      active = false;
    };
  }, [post.id, page, refresh]);
  useEffect(() => {
    try {
      setLiked(localStorage.getItem(`crhBlogLike:${post.id}`) === "1");
    } catch {}
  }, [post.id]);
  async function send(e) {
    e.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const visitor = readerId();
      if (action === "like") {
        await blogInteract(post.id, "like", {
          visitor,
          liked: !liked,
          verificationToken: token,
        });
        setLiked(!liked);
        try {
          localStorage.setItem(`crhBlogLike:${post.id}`, liked ? "0" : "1");
        } catch {}
        setMessage(
          liked ? "Like removed." : "Thank you for your encouragement.",
        );
        setRefresh((v) => v + 1);
        setAction("");
      } else {
        const r = await blogInteract(post.id, "comments", {
          id: commentId,
          visitor,
          alias,
          body,
          consent,
          website,
          verificationToken: token,
        });
        setMessage(r.message);
        setBody("");
        setConsent(false);
        setCommentId(newBlogId());
        setAction("");
      }
    } catch (e) {
      setError(blogError(e));
    } finally {
      setBusy(false);
      setReset((v) => v + 1);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(caption);
      setMessage(
        "Article title and link copied. Paste them into Instagram or your favourite app.",
      );
    } catch {
      setMessage(`Copy this link: ${url}`);
    }
  }
  async function share() {
    try {
      await navigator.share({ title: post.title, text: post.excerpt, url });
    } catch (e) {
      if (e.name !== "AbortError") await copy();
    }
  }
  async function cover() {
    try {
      const r = await fetch(blogImage(post.cover_id));
      if (!r.ok) throw Error();
      const a = document.createElement("a"),
        u = URL.createObjectURL(await r.blob());
      a.href = u;
      a.download = `${post.slug}.webp`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 10000);
      setMessage(
        "Image downloaded. Upload it in Instagram and paste the copied article link.",
      );
    } catch {
      setError(
        "Image download is unavailable. You can still copy the article link.",
      );
    }
  }
  return (
    <section className="blog-community" aria-label="Article conversation">
      <div className="blog-share">
        <h2>Pass it on</h2>
        <p>Share a word of encouragement with someone.</p>
        <div className="platform-actions">
          <a
            className="secondary-button"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(caption)}`}
          >
            WhatsApp
          </a>
          <a
            className="secondary-button"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          >
            Facebook
          </a>
          <a
            className="secondary-button"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`}
          >
            X
          </a>
          <button className="secondary-button" onClick={copy}>
            Copy link / Instagram
          </button>
          <button className="secondary-button" onClick={cover}>
            Download cover
          </button>
          {typeof navigator.share === "function" && (
            <button className="secondary-button" onClick={share}>
              Share…
            </button>
          )}
        </div>
      </div>
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            className="secondary-button"
            onClick={() => {
              setError("");
              setRefresh((v) => v + 1);
            }}
          >
            Retry
          </button>
        </p>
      )}
      <div className="platform-actions">
        <button
          className="secondary-button"
          aria-pressed={liked}
          onClick={() => {
            setAction(action === "like" ? "" : "like");
            setError("");
          }}
        >
          {liked ? "♥ Liked" : "♡ Like"}
          {data ? ` · ${data.likes}` : ""}
        </button>
        <button
          className="secondary-button"
          onClick={() => {
            setAction(action === "comment" ? "" : "comment");
            setError("");
          }}
        >
          Write a comment
        </button>
      </div>
      <p className="blog-small">
        Likes use a browser identifier. Comments appear only after staff review.
        Please leave out private contact details and prayer information.
      </p>
      {action && (
        <form className="blog-interaction-form" onSubmit={send}>
          <h3>
            {action === "like"
              ? liked
                ? "Remove your like"
                : "Like this article"
              : "Join the conversation"}
          </h3>
          {action === "comment" && (
            <>
              <label>
                Display name
                <input
                  required
                  maxLength={60}
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                />
              </label>
              <label>
                Your comment
                <textarea
                  required
                  maxLength={2000}
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>
              <label className="blog-check">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I agree to publish this display name and comment after review.
              </label>
              <label className="blog-honeypot" aria-hidden="true">
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </>
          )}
          <FormVerification
            key={action}
            action={action === "like" ? "blog_like" : "blog_comment"}
            onReady={setReady}
            onToken={setToken}
            resetKey={reset}
          />
          <button className="ministry-button dark" disabled={busy || !ready}>
            {busy
              ? "Sending…"
              : action === "like"
                ? "Confirm"
                : "Submit for review"}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => setAction("")}
          >
            Cancel
          </button>
        </form>
      )}
      <h2>Reader conversation</h2>
      {!data && !error && <p role="status">Loading comments…</p>}
      {data?.comments.length === 0 && (
        <p>
          No approved comments yet. You’re welcome to start the conversation.
        </p>
      )}
      {data?.comments.map((c) => (
        <article className="blog-comment" key={c.id}>
          <strong>{c.alias}</strong>
          <time>{blogDate(c.created_at)}</time>
          <p>{c.body}</p>
        </article>
      ))}
      {data && (page > 0 || data.has_more) && (
        <div className="platform-actions">
          <button
            className="secondary-button"
            disabled={page === 0}
            onClick={() => setPage((v) => v - 1)}
          >
            Previous comments
          </button>
          <button
            className="secondary-button"
            disabled={!data.has_more}
            onClick={() => setPage((v) => v + 1)}
          >
            More comments
          </button>
        </div>
      )}
    </section>
  );
}
