import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MetaTags from "../components/MetaTags";
import BlogArticle from "../components/BlogArticle";
import BlogCommunity from "../components/BlogCommunity";
import { blogPost, blogError, blogImage } from "../services/blog";
import "../styles/blog.css";
export default function BlogPost() {
  const { id } = useParams(),
    [post, setPost] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setPost(null);
    setError("");
    blogPost(id)
      .then((p) => {
        if (active) setPost(p);
      })
      .catch((e) => {
        if (active)
          setError(
            e.response?.status === 404
              ? "This article is not available. It may be scheduled for a later date."
              : blogError(e),
          );
      });
    return () => {
      active = false;
    };
  }, [id, retry]);
  return (
    <div className="blog-page">
      <MetaTags
        title={post?.title || "CRH Journal"}
        description={post?.excerpt}
      />
      <div className="ministry-section blog-reading">
        <Link className="blog-back" to="/blog">
          ← All journal articles
        </Link>
        {!post && !error && <p role="status">Loading article…</p>}
        {error && (
          <div className="blog-notice" role="alert">
            <h1>Article unavailable</h1>
            <p>{error}</p>
            <button
              className="secondary-button"
              onClick={() => setRetry((v) => v + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {post && (
          <>
            <BlogArticle post={post} image={blogImage(post.cover_id)} />
            <BlogCommunity key={post.id} post={post} />
            <aside className="blog-giving">
              <h2>Help the Word reach further.</h2>
              <p>
                Your giving supports the work of Christ’s Reformation House.
              </p>
              <Link className="ministry-button dark" to="/donate">
                Give to the ministry
              </Link>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
