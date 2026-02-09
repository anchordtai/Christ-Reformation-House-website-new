// netlify/functions/join-meeting.js
// Validates a join_token and returns meeting info for joining the room.

const { query } = require('./db');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { joinToken } = JSON.parse(event.body || '{}');

    if (!joinToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'joinToken is required' }),
      };
    }

    // Validate join token against DB
    const result = await query(
      `SELECT id, title, description, start_time, end_time, status, room_name
       FROM meetings
       WHERE join_token = $1
       LIMIT 1`,
      [joinToken]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Invalid or expired join link' }),
      };
    }

    const meeting = result.rows[0];

    if (meeting.status === 'cancelled') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'This meeting has been cancelled' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        meeting,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || 'Could not join meeting',
      }),
    };
  }
};

