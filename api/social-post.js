/**
 * Serverless function example: post to Facebook, Twitter/X, Instagram, LinkedIn.
 * Deploy to Vercel/Netlify and call from cron or admin UI.
 * Store API tokens in env (never in client).
 *
 * Vercel: put in /api/social-post.js and use Vercel serverless.
 * Netlify: put in netlify/functions/social-post.js.
 */

// Example for Vercel serverless (export default handler)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { title, body, link, imageUrl, platforms } = req.body || {}
  const results = { facebook: null, twitter: null, instagram: null, linkedin: null }

  try {
    // Facebook Graph API
    if (platforms?.facebook && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      const fbRes = await fetch(
        `https://graph.facebook.com/v18.0/${process.env.FACEBOOK_PAGE_ID}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `${title}\n\n${body}${link ? `\n${link}` : ''}`,
            access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
          }),
        }
      )
      const fbData = await fbRes.json()
      results.facebook = fbData.id ? { id: fbData.id } : { error: fbData.error?.message }
    }

    // Twitter/X API v2
    if (platforms?.twitter && process.env.TWITTER_BEARER_TOKEN) {
      const tweetText = [title, body, link].filter(Boolean).join('\n\n').slice(0, 280)
      const twRes = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
        body: JSON.stringify({ text: tweetText }),
      })
      const twData = await twRes.json()
      results.twitter = twData.data ? { id: twData.data.id } : { error: twData.detail || 'Failed' }
    }

    // Instagram and LinkedIn require different flows (media upload, OAuth). Placeholder:
    if (platforms?.instagram) results.instagram = { note: 'Use Instagram Graph API with media' }
    if (platforms?.linkedin) results.linkedin = { note: 'Use LinkedIn API with UGC post' }

    return res.status(200).json({ success: true, results })
  } catch (err) {
    return res.status(500).json({ error: err.message, results })
  }
}
