const axios = require('axios');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5OWVjYzI0OWE2ZGUxNzFlNTJhYzcwMSIsInJvbGUiOiJTVVBFUl9BRE1JTiIsImlhdCI6MTc3MjY0MDc2OCwiZXhwIjoxNzcyNjQxNjY4fQ.vR6msV1kAV2eoNTD1lqi3FkFPiF2XuH3fc2XnifDPfY";

axios.get('http://localhost:3001/api/notifications', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
.then(res => console.log('SUCCESS:', res.status, res.data))
.catch(err => console.log('ERROR:', err.response?.status, err.response?.data));
