import { flags } from '@/entrypoint/utils/targets';
import { SourcererEmbed, SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';

const baseUrl = 'https://hindiscrape.whvx.net';

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  let endpoint = `/movie/${ctx.media.tmdbId}`;

  if (ctx.media.type === 'show') {
    endpoint = `/tv/${ctx.media.tmdbId}/${ctx.media.season.number.toString()}/${ctx.media.episode.number.toString()}`;
  }

  const playerPage = await ctx.fetcher(endpoint, {
    baseUrl,
  });

  // Assuming playerPage is already a parsed JSON object
  const fileData: { label: string; file: string }[] = playerPage.sources;

  const embeds: SourcererEmbed[] = [];

  for (const stream of fileData) {
    const url = stream.file;
    if (!url) {
      throw new NotFoundError('No providers available'); // This error will be caught by the base provider
    }

    // Creating embedId using the label (lowercased and trimmed)
    const embedId = `hindiscrape-${stream.label.toLowerCase().trim()}`;

    // Push the embed with the generated embedId and url
    embeds.push({ embedId, url });
  }

  return {
    embeds,
  };
}

export const hindiScraper = makeSourcerer({
  id: 'hindiscrape',
  name: 'HindiScrape (Multi Lang)',
  rank: 10,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
