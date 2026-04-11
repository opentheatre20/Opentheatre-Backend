const fs = require('fs');
const axios = require('axios');

axios.post('http://localhost:3001/api/auth/login', {
  email: 'admin@opentheatre.com',
  password: 'admin'
})
.then(res => {
  fs.writeFileSync('test-output.json', JSON.stringify({ status: res.status, data: res.data }, null, 2));
})
.catch(err => {
  fs.writeFileSync('test-output.json', JSON.stringify({ error: err.message, status: err.response?.status, data: err.response?.data }, null, 2));
});
