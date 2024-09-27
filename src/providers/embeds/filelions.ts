/* eslint-disable no-console */
import * as unpacker from 'unpacker';

import { flags } from '@/entrypoint/utils/targets';
import { makeEmbed } from '@/providers/base';

const packedRegex = /<script type=(?:['"]text\/javascript['"])?\s*>(eval\(function\(p,a,c,k,e,[\s\S]*?\))\s*<\/script>/;
const linkRegex = /src:"(https:\/\/[^"]+)"/;

export const filelionsScraper = makeEmbed({
  id: 'filelions',
  name: 'Filelions',
  rank: 111,
  async scrape(ctx) {
    const streamRes = await ctx.proxiedFetcher<string>(ctx.url);
    // eslint-disable-next-line no-console
    console.log('Full response for debugging:', streamRes);
    console.log(
      'Checking script content presence:',
      streamRes.includes("<script type='text/javascript'>eval(function(p,a,c,k,e,d){"),
    );
    console.log('Attempting to match script content with regex.');
    const packed = streamRes.match(packedRegex);

    if (!packed || !packed[1]) {
      console.error('Packed script content not found.');
      throw new Error('Packed script content not found');
    }

    console.log('Captured packed content:', packed[1]); // Displays the captured content

    const unpacked = unpacker.unpack(packed[1]);
    const link = unpacked.match(linkRegex);
    const proxiedPlaylist = link
      ? `https://m3u8.wafflehacker.io/m3u8-proxy?url=${encodeURIComponent(`${link[1]}`)}`
      : '';

    if (!proxiedPlaylist || proxiedPlaylist === '') throw new Error('filelions file not found');
    return {
      stream: [
        {
          type: 'hls',
          id: 'primary',
          playlist: proxiedPlaylist,
          flags: [flags.CORS_ALLOWED],
          captions: [],
        },
      ],
    };
  },
});
