import { load } from 'cheerio';

import { flags } from '@/entrypoint/utils/targets';
import { SourcererOutput, makeSourcerer } from '@/providers/base';
import { compareTitle } from '@/utils/compare';
import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';
import { NotFoundError } from '@/utils/errors';

import { SearchResults } from './types';

const nepuBase = 'https://rar.to';
const nepuReferer = 'https://nepu.to';

const universalScraper = async (ctx: MovieScrapeContext | ShowScrapeContext) => {
  const searchResultRequest = await ctx.proxiedFetcher<string>('/ajax/posts', {
    baseUrl: nepuBase,
    query: {
      q: ctx.media.title,
    },
  });

  // json isn't parsed by proxiedFetcher due to content-type being text/html.
  const searchResult = JSON.parse(searchResultRequest) as SearchResults;

  const show = searchResult.data.find((item) => {
    if (!item) return false;
    if (ctx.media.type === 'movie' && item.type !== 'Movie') return false;
    if (ctx.media.type === 'show' && item.type !== 'Serie') return false;

    return compareTitle(ctx.media.title, item.second_name);
  });

  if (!show) throw new NotFoundError('No watchable item found');

  let videoUrl = show.url;

  if (ctx.media.type === 'show') {
    videoUrl = `${show.url}/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
  }

  const videoPage = await ctx.proxiedFetcher<string>(videoUrl, {
    baseUrl: nepuBase,
  });
  const videoPage$ = load(videoPage);
  const embedId = videoPage$('a[data-embed]').attr('data-embed');

  if (!embedId) throw new NotFoundError('No embed found.');

  const playerPage = await ctx.proxiedFetcher<string>('/ajax/embed', {
    method: 'POST',
    baseUrl: nepuBase,
    body: new URLSearchParams({ id: embedId }),
  });
  let proxiedPlaylist;
  const headers = {
    referer: nepuReferer,
    origin: nepuReferer,
  };
  const headersString = JSON.stringify(headers);
  const streamUrl = playerPage.match(/"file"\s*:\s*"([^"]+)"/);
  if (streamUrl && streamUrl[1]) {
    proxiedPlaylist = `https://m3u8.wafflehacker.io/m3u8-proxy?url=${encodeURIComponent(streamUrl[1])}&headers=${encodeURIComponent(headersString)}`;
  }
  if (!streamUrl) throw new NotFoundError('No stream found.');

  return {
    embeds: [],
    stream: [
      {
        id: 'primary',
        captions: [],
        playlist: proxiedPlaylist,
        type: 'hls',
        flags: [],
      },
    ],
  } as SourcererOutput;
};

export const nepuScraper = makeSourcerer({
  id: 'nepu',
  name: 'Nepu',
  rank: 80,
  disabled: false,
  flags: [flags.CORS_ALLOWED],
  scrapeMovie: universalScraper,
  scrapeShow: universalScraper,
});
