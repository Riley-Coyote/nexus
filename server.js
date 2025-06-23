const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const MAILCHIMP_KEY = process.env.MAILCHIMP_KEY;
const MAILCHIMP_SERVER = process.env.MAILCHIMP_SERVER_PREFIX; // e.g., 'us1'
const MAILCHIMP_LIST = process.env.MAILCHIMP_LIST_ID;

app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;
  if(!email) return res.status(400).json({error:'Email required'});
  if(!MAILCHIMP_KEY || !MAILCHIMP_SERVER || !MAILCHIMP_LIST){
    return res.status(500).json({error:'Mailchimp not configured'});
  }
  try {
    const mcRes = await fetch(`https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `apikey ${MAILCHIMP_KEY}`
      },
      body: JSON.stringify({ email_address: email, status: 'subscribed' })
    });
    if(!mcRes.ok) throw new Error('Mailchimp request failed');
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Subscribe failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
