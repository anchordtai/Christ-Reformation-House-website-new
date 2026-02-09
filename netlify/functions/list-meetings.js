// netlify/functions/list-meetings.js
// Lists upcoming scheduled meetings.

const { query } = require('./db');

exports.handler = async (event) => {
  // Allow GET or POST (body is ignored)
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const result = await query(
      `SELECT id, title, description, start_time, end_time, status, room_name
       FROM meetings
       WHERE start_time >= NOW() AND status = 'scheduled'
       ORDER BY start_time ASC
       LIMIT 100`,
      []
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        meetings: result.rows,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || 'Could not list meetings',
      }),
    };
  }
};

