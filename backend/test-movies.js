const fs = require('fs');
const axios = require('axios');

axios.get('http://localhost:3001/api/movies', {
  headers: {
    Authorization: 'Bearer invalid_token_test'
  }
})
.then(res => {
  fs.writeFileSync('test-output.json', JSON.stringify({ status: res.status, data: res.data }, null, 2));
  console.log('Success');
})
.catch(err => {
  fs.writeFileSync('test-output.json', JSON.stringify({ error: err.message, status: err.response?.status, data: err.response?.data }, null, 2));
  console.error('Failed');
});
