import { flags } from '@/entrypoint/utils/targets';
import { makeEmbed } from '@/providers/base';

const linkRegex = /'hls': ?'(http.*?)',/;
const redirectRegex = /window\.location\.href = '(https?:\/\/[^']+)'/;

export const voeScraper = makeEmbed({
  id: 'voe',
  name: 'voe.sx',
  rank: 180,
  async scrape(ctx) {
    let embedRes = await ctx.proxiedFetcher.full<string>(ctx.url);
    let embed = embedRes.body;

    // Check for redirection via window.location.href
    const redirectMatch = embed.match(redirectRegex);
    if (redirectMatch) {
      // Fetch new embed from the redirection URL
      embedRes = await ctx.proxiedFetcher.full<string>(redirectMatch[1]);
      embed = embedRes.body;
    }

    const playerSrc = embed.match(linkRegex) ?? [];

    const streamUrl = playerSrc[1];
    const decodedStreamUrl = atob(streamUrl);
    const proxiedStreamUrl = `https://m3u8.wafflehacker.io/m3u8-proxy?url=${encodeURIComponent(decodedStreamUrl)}`;
    if (!streamUrl) throw new Error('Stream url not found in embed code');

    return {
      stream: [
        {
          type: 'hls',
          id: 'primary',
          playlist: proxiedStreamUrl,
          flags: [flags.CORS_ALLOWED],
          captions: [],
        },
      ],
    };
  },
});
