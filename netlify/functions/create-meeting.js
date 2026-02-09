// netlify/functions/create-meeting.js
// Creates a meeting, generates join_token, and optionally stores email invites.

const crypto = require('crypto');
const { query } = require('./db');

function generateJoinToken() {
  return crypto.randomBytes(24).toString('hex');
}

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
      description,
      startTime,
      endTime,
      roomName,
      invites = [], // array of emails
    } = JSON.parse(event.body || '{}');

    if (!title || !startTime || !endTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'title, startTime and endTime are required',
        }),
      };
    }

    const joinToken = generateJoinToken();
    const effectiveRoomName =
      roomName || `crh-${crypto.randomBytes(6).toString('hex')}`;

    // Insert meeting
    const result = await query(
      `INSERT INTO meetings (
         title, description, start_time, end_time, status, join_token, room_name
       )
       VALUES ($1, $2, $3, $4, 'scheduled', $5, $6)
       RETURNING id, title, description, start_time, end_time, status, join_token, room_name`,
      [title, description, startTime, endTime, joinToken, effectiveRoomName]
    );

    const meeting = result.rows[0];

    // Insert invitations if provided
    if (Array.isArray(invites) && invites.length > 0) {
      const values = [];
      const params = [];
      invites.forEach((email, idx) => {
        const base = idx * 2;
        params.push(meeting.id, email);
        values.push(`($${base + 1}, $${base + 2})`);
      });

      await query(
        `INSERT INTO meeting_invitations (meeting_id, email)
         VALUES ${values.join(', ')}`,
        params
      );

      // TODO: send actual emails using your email provider here.
    }

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        meeting,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || 'Could not create meeting',
      }),
    };
  }
};

