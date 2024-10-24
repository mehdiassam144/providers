/* eslint-disable no-console */
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
  // Extract the part inside the <script> tags
  // Use regex to extract the file array from the script content
  const jsonMatch = playerPage.match(/file:\s*(\[\{.*\}\])/);
  console.log('jsonMatch:', jsonMatch);
  if (jsonMatch && jsonMatch[1]) {
    let jsonString;
    jsonString = jsonMatch[1];
    // Step 1: Replace property names with quotes (handles keys like 'file' and 'poster')
    jsonString = jsonString.replace(/(\w+):/g, '"$1":');

    // Step 2: Make sure values (like URLs) are wrapped in quotes properly
    jsonString = jsonString.replace(/:\s*([^"[{]\S+)/g, ':"$1"');
    jsonString = jsonString.replace(/"https":"\/\//g, '"https://');
    jsonString = jsonString.replace(/", "/g, '",');
    jsonString = jsonString.replace(/"\s+/g, '"'); // Remove spaces after quotes
    jsonString = jsonString.replace(/\s+"/g, '"'); // Remove spaces before quotes
    jsonString = jsonString.replace(/""https/g, '"https');
    jsonString = jsonString.replace(/""poster/g, '"poster');
    jsonString = jsonString.replace(/""/g, '"');
    console.log('jsonString:', jsonString);
    // Convert the matched part into a JSON string and parse it
    const fileUrlMatch = jsonString.match(/"file":"([^"]+)"/);
    // Extract the URL from the parsed data
    if (fileUrlMatch && fileUrlMatch[1]) {
      proxiedPlaylist = `https://m3u8.wafflehacker.io/m3u8-proxy?url=${encodeURIComponent(fileUrlMatch[1])}&headers=${encodeURIComponent(headersString)}`;
    }
    if (!fileUrlMatch) {
      throw new NotFoundError('No file URL found');
    }
    console.log('Extracted Stream URL:', fileUrlMatch[1]);
  } else {
    console.log('No match found');
  }

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
