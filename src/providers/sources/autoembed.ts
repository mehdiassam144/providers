import { flags } from '@/entrypoint/utils/targets';
import { SourcererEmbed, SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

const baseUrl = 'https://hindiscrape.whvx.net';

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  let endpoint = `/movie/${ctx.media.tmdbId}`;

  if (ctx.media.type === 'show') {
    endpoint = `/tv/${ctx.media.tmdbId}/${ctx.media.season.number.toString()}/${ctx.media.episode.number.toString()}`;
  }

  const playerPage = await ctx.proxiedFetcher(endpoint, {
    baseUrl,
  });

  // Directly access the sources from playerPage (which is already a parsed JSON object)
  const fileData: { label: string; file: string }[] = playerPage.sources;

  const embeds: SourcererEmbed[] = [];

  for (const stream of fileData) {
    const url = stream.file;
    if (!url) continue;

    // Generating embedId using the label (in lowercase)
    const embedId = `hindiscrape-${stream.label.toLowerCase().trim()}`;

    // Push the embed with the generated embedId and url
    embeds.push({ embedId, url });
  }

  return {
    embeds,
  };
}

export const hindiScraper = makeSourcerer({
  id: 'autoembed',
  name: 'Autoembed (Multi Lang)',
  rank: 10,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
