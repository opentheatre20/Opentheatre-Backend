const crypto = require('crypto');
function testBunnyToken() {
  const tokenKey = '118cec97-6ea2-4329-9e2a-055edfdc9095';
  const videoId = 'aef6dacf-f338-4347-85d1-854bf403241b';
  const expires = 1775609328;
  
  const sigVideo = tokenKey + videoId + expires;
  const tokenVideo = crypto.createHash('sha256').update(sigVideo).digest('hex');
  console.log('Video ID Token: ', tokenVideo);

  const sigPath = tokenKey + '/aef6dacf-f338-4347-85d1-854bf403241b/thumbnail_c7b7c106.jpg' + expires;
  const tokenPath = crypto.createHash('sha256').update(sigPath).digest('hex');
  console.log('Path Token:     ', tokenPath);
  
  const sigPathNoSlash = tokenKey + 'aef6dacf-f338-4347-85d1-854bf403241b/thumbnail_c7b7c106.jpg' + expires;
  const tokenPathNoSlash = crypto.createHash('sha256').update(sigPathNoSlash).digest('hex');
  console.log('Path No Slsh:   ', tokenPathNoSlash);
  
  console.log('Target Token:    9eca45547c1625d711d1af141c7f4b4ff89f17b9165783fe9652e2352d18c322');
}
testBunnyToken();
