// netlify/functions/schedule-social-post.js
// Schedules a social media post by inserting into social_posts table.

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
      body: text,
      link,
      imageUrl,
      platforms = [], // e.g. ['facebook', 'instagram']
      scheduledAt, // ISO string or null
    } = JSON.parse(event.body || '{}');

    if (!title || !text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'title and body are required' }),
      };
    }

    // status: 'scheduled' if scheduledAt is provided, otherwise 'draft'
    const status = scheduledAt ? 'scheduled' : 'draft';

    const result = await query(
      `INSERT INTO social_posts (
         title, body, link, image_url, platforms, status, scheduled_at
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING *`,
      [
        title,
        text,
        link,
        imageUrl,
        JSON.stringify({ platforms }),
        status,
        scheduledAt || null,
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
        error: err.message || 'Could not schedule social post',
      }),
    };
  }
};

