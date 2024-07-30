import { flags } from '@/entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';

async function comboScraper(ctx: ShowScrapeContext | MovieScrapeContext): Promise<SourcererOutput> {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 1;
    if (progress === 100) throw new NotFoundError('No data found for this show/movie');
    ctx.progress(progress);
  }, 100);

  let url = `http://localhost:3000/search?id=${ctx.media.tmdbId}`; // :)
  if (ctx.media.type === 'show') url += `&s=${ctx.media.season.number}&e=${ctx.media.episode.number}`;

  const response = await ctx.fetcher(url);

  if (response) return response as SourcererOutput;

  clearInterval(interval);
  throw new NotFoundError('No data found for this show/movie');
}

export const filmxyScraper = makeSourcerer({
  id: 'filmxy',
  name: 'Filmxy',
  rank: 140,
  disabled: false,
  flags: [flags.CORS_ALLOWED],
  scrapeShow: comboScraper,
  scrapeMovie: comboScraper,
});
