const axios = require('axios');
axios.options('http://localhost:3001/api/movies', { 
  headers: { 
    Origin: 'http://localhost:3000',
    'Access-Control-Request-Method': 'GET'
  }
})
.then(res => console.log('OPTIONS STATUS:', res.status))
.catch(err => console.error('OPTIONS ERROR:', err.response?.status));
