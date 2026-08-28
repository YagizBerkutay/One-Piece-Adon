const https = require('https');

https.get('https://one-piece-adon.onrender.com/recent-requests', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
