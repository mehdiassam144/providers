import { flags } from '@/entrypoint/utils/targets';
import { makeEmbed } from '@/providers/base';

const linkRegex = /'hls': ?'(http.*?)',/;

export const voeScraper = makeEmbed({
  id: 'voe',
  name: 'voe.sx',
  rank: 180,
  async scrape(ctx) {
    const embedRes = await ctx.proxiedFetcher.full<string>(ctx.url);
    const embed = embedRes.body;

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
