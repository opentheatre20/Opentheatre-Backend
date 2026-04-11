const fs = require('fs');
const axios = require('axios');

async function test() {
  try {
    const data = JSON.parse(fs.readFileSync('test-output.json', 'utf8'));
    const response = await axios.get('http://localhost:3001/api/admin/analytics/traffic', {
      headers: { Authorization: `Bearer ${data.token}` }
    });
    console.log(JSON.stringify(response.data.advancedStats.topDevices, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}

test();
