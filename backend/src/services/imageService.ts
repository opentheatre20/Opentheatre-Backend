import axios from 'axios';

const STORAGE_ZONE_NAME = process.env.BUNNY_STORAGE_ZONE;
const ACCESS_KEY = process.env.BUNNY_STORAGE_PASSWORD;
const BASE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE_NAME}`;

export const uploadToBunny = async (buffer: Buffer, filename: string): Promise<string> => {
  if (!STORAGE_ZONE_NAME || !ACCESS_KEY) {
    throw new Error('Bunny Storage configuration missing');
  }

  const url = `${BASE_URL}/thumbnails/${filename}`;
  
  await axios.put(url, buffer, {
    headers: {
      'AccessKey': ACCESS_KEY,
      'Content-Type': 'application/octet-stream',
    },
  });

  // Return the CDN URL
  const pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL || '';
  return `${pullZoneUrl}/thumbnails/${filename}`;
};

export const listFromBunny = async (): Promise<any[]> => {
  if (!STORAGE_ZONE_NAME || !ACCESS_KEY) {
    throw new Error('Bunny Storage configuration missing');
  }

  const url = `${BASE_URL}/thumbnails/`;
  
  const response = await axios.get(url, {
    headers: {
      'AccessKey': ACCESS_KEY,
      'accept': 'application/json',
    },
  });

  return response.data;
};

export const deleteFromBunny = async (filename: string): Promise<void> => {
  if (!STORAGE_ZONE_NAME || !ACCESS_KEY) {
    throw new Error('Bunny Storage configuration missing');
  }

  const url = `${BASE_URL}/thumbnails/${filename}`;
  
  await axios.delete(url, {
    headers: {
      'AccessKey': ACCESS_KEY,
    },
  });
};
