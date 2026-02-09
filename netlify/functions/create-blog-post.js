// netlify/functions/create-blog-post.js
// Creates a blog post; can be draft or published immediately.

const { query } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const {
      title,
      author,
      excerpt,
      content,
      image,
      category,
      publishNow = false,
      publishedAt, // optional ISO string
    } = JSON.parse(event.body || '{}');

    if (!title || !content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'title and content are required' }),
      };
    }

    const effectivePublishedAt = publishNow
      ? new Date().toISOString()
      : publishedAt || null;

    const result = await query(
      `INSERT INTO blog_posts (
         title, author, excerpt, content, image, category, published_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title,
        author,
        excerpt,
        content,
        image,
        category,
        effectivePublishedAt,
      ]
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        post: result.rows[0],
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || 'Could not create blog post',
      }),
    };
  }
};

