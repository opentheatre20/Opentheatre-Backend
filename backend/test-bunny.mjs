import fetch from 'node-fetch'; // Polyfill for earlier Node versions just in case, or just comment it out since Node 24 is used.
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    try {
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                AccessKey: process.env.BUNNY_API_KEY
            }
        };

        console.log("Fetching from: ", `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos`);
        const response = await fetch(`https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos`, options);
        console.log("Status: ", response.status);
        const data = await response.json();

        if (!response.ok || !data.items) {
           console.log("Error response items:", data);
           return;
        }

        const videos = data.items.map((video) => {
           const baseUrl = process.env.BUNNY_CDN_HOSTNAME 
             ? `https://${process.env.BUNNY_CDN_HOSTNAME}/${video.guid}/${video.thumbnailFileName}` 
             : '';

           return {
             ...video,
             constructedThumbnailUrl: baseUrl
           };
        });

        console.log("Success! Extracted ", videos.length, " videos.");
    } catch (err) {
        console.error("FATAL: ", err);
    }
}

test();
