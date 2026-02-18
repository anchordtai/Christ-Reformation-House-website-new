// netlify/functions/create-meeting.js
// Netlify-safe meeting creation function

const crypto = require("crypto");
const { query } = require("./db");

function generateJoinToken() {
  return crypto.randomBytes(24).toString("hex");
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};

    const title = body.title;
    const description = body.description || null;
    const startTime = body.startTime;
    const endTime = body.endTime;
    const roomName = body.roomName || null;
    const invites = Array.isArray(body.invites) ? body.invites : [];

    if (!title || !startTime || !endTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "title, startTime and endTime are required",
        }),
      };
    }

    const joinToken = generateJoinToken();
    const effectiveRoomName =
      roomName ||
      "crh-" + crypto.randomBytes(6).toString("hex");

    // Insert meeting
    const result = await query(
      `
      INSERT INTO meetings
        (title, description, start_time, end_time, status, join_token, room_name)
      VALUES
        ($1, $2, $3, $4, 'scheduled', $5, $6)
      RETURNING
        id, title, description, start_time, end_time, status, join_token, room_name
      `,
      [
        title,
        description,
        startTime,
        endTime,
        joinToken,
        effectiveRoomName,
      ]
    );

    const meeting = result.rows[0];

    // Insert invitations (if any)
    if (invites.length > 0) {
      const values = [];
      const params = [];

      invites.forEach(function (email, index) {
        const baseIndex = index * 2;
        params.push(meeting.id, email);
        values.push(
          "($" + (baseIndex + 1) + ", $" + (baseIndex + 2) + ")"
        );
      });

      await query(
        `
        INSERT INTO meeting_invitations (meeting_id, email)
        VALUES ${values.join(", ")}
        `,
        params
      );
    }

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        meeting: meeting,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Could not create meeting",
      }),
    };
  }
};
