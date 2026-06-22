import crypto from 'crypto';

export const getStreamUrl = (videoId: string) => {
  const libraryId = (process.env.BUNNY_STREAM_LIBRARY_ID || '').trim();
  const tokenKey = (process.env.BUNNY_STREAM_TOKEN_KEY || '').trim();
  const cdnHostname = (process.env.BUNNY_CDN_HOSTNAME || '').trim();
  
  const iframeHost = cdnHostname ? cdnHostname.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'iframe.mediadelivery.net';
  const expires = Math.floor(Date.now() / 1000) + 21600;

  let url = `https://${iframeHost}/embed/${libraryId}/${videoId}`;

  if (tokenKey) {
    const signature = `${tokenKey}${videoId}${expires}`;
    const token = crypto.createHash('sha256').update(signature).digest('hex');
    url += `?token=${token}&expires=${expires}`;
  }

  return url;
};

export const signCdnUrl = (url: string) => {
  if (!url) return '';
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;
  if (!tokenKey) return url;

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // pathname usually looks like /videoId/thumbnail.jpg
    const videoId = pathParts[1] || '';
    
    if (!videoId) return url;

    const expires = Math.floor(Date.now() / 1000) + 21600; // 6 hours
    
    // Bunny Stream Token Auth for direct files expects: sha256(TokenKey + VideoID + Expires)
    const signature = `${tokenKey}${videoId}${expires}`;
    const token = crypto.createHash('sha256').update(signature).digest('hex');
    
    urlObj.searchParams.set('token', token);
    urlObj.searchParams.set('expires', expires.toString());
    
    return urlObj.toString();
  } catch (error) {
    return url;
  }
};
