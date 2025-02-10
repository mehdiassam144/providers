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
  const playerData = JSON.parse(playerPage);
  // Directly access the sources from playerPage (which is already a parsed JSON object)
  const fileData: { label: string; file: string }[] = playerData.sources;

  const embeds: SourcererEmbed[] = [];

  for (const stream of fileData) {
    const url = stream.file;
    if (!url) continue;

    // Generating embedId using the label (in lowercase)
    const embedId = `hindiscrape-${stream.label.toLowerCase().trim()}`;

    // Push the embed with the generated embedId and url
    embeds.push({ embedId, url });
  }

  // eslint-disable-next-line no-console
  console.log(embeds);
  return {
    embeds,
  };
}

export const hindiScraper = makeSourcerer({
  id: 'hindiscraper',
  name: 'Jalebi Scraper',
  rank: 10,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});
