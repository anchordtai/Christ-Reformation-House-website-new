import { blogDate } from "../services/blog";
export default function BlogArticle({ post, image }) {
  return (
    <article className="blog-article">
      <p className="ministry-eyebrow">{post.category}</p>
      <h1>{post.title}</h1>
      <p className="blog-byline">
        {post.author}
        {post.publish_at && <> · {blogDate(post.publish_at)}</>}
      </p>
      {image && (
        <img className="blog-cover" src={image} alt={post.cover_alt || ""} />
      )}
      <p className="blog-standfirst">{post.excerpt}</p>
      <div className="blog-prose">
        {post.body
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>
      <div className="blog-tags">
        {post.tags?.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </article>
  );
}
