const http = require('http');

const data = JSON.stringify({
  email: 'admin@flavohub.local',
  password: 'ChangeMe@12345'
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
