require('dotenv').config({ path: 'c:/Users/Admin/.gemini/antigravity/scratch/open-theatre-ott/backend/.env' });

async function test(url) {
  try {
    const res = await fetch(url);
    console.log(url, res.status);
  } catch(e) { console.error(url, e.message); }
}

async function run() {
  const libId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_API_KEY;
  const listRes = await fetch(`https://video.bunnycdn.com/library/${libId}/videos`, {headers: {AccessKey: apiKey}});
  const data = await listRes.json();
  const videoId = data.items[0].guid;
  
  await test(`https://iframe.mediadelivery.net/embed/${libId}/${videoId}`);
  await test(`https://iframe.mediadelivery.net/play/${libId}/${videoId}`);
  await test(`https://${process.env.BUNNY_CDN_HOSTNAME}/embed/${libId}/${videoId}`);
  await test(`https://${process.env.BUNNY_CDN_HOSTNAME}/play/${libId}/${videoId}`);
}
run();
