import * as unpacker from 'unpacker';

import { flags } from '@/entrypoint/utils/targets';
import { makeEmbed } from '@/providers/base';

const packedRegex = /(eval\(function\(p,a,c,k,e,d\).*\)\)\))/;
const linkRegex = /src:"(https:\/\/[^"]+)"/;

export const filelionsScraper = makeEmbed({
  id: 'filelions',
  name: 'Filelions',
  rank: 111,
  async scrape(ctx) {
    const streamRes = await ctx.proxiedFetcher<string>(ctx.url);
    const packed = streamRes.match(packedRegex);

    if (!packed) throw new Error('filelions packed not found');

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
