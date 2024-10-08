import { Caption, labelToLanguageCode, removeDuplicatedLanguages } from '@/providers/captions';
import { IndividualEmbedRunnerOptions } from '@/runners/individualRunner';
import { ProviderRunnerOptions } from '@/runners/runner';

function fixJson(jsonStr: string): string {
  // Remove any partial object or string at the end of the JSON
  let lastValidIndex = Math.min(jsonStr.lastIndexOf('}'), jsonStr.lastIndexOf(']'));
  while (lastValidIndex > -1) {
    try {
      const testJson = jsonStr.substring(0, lastValidIndex + 1);
      JSON.parse(testJson); // Test if the JSON is valid
      return testJson; // If valid, return the test JSON
    } catch (e) {
      // If still invalid, try the previous valid structure
      const nextCloseCurly = jsonStr.lastIndexOf('}', lastValidIndex - 1);
      const nextCloseBracket = jsonStr.lastIndexOf(']', lastValidIndex - 1);
      lastValidIndex = Math.max(nextCloseCurly, nextCloseBracket);
    }
  }
  return '[]'; // Return an empty array if no valid JSON structure is found
}

export async function addOpenSubtitlesCaptions(
  captions: Caption[],
  ops: ProviderRunnerOptions | IndividualEmbedRunnerOptions,
  media: string,
): Promise<Caption[]> {
  try {
    const parts = atob(media).split('.');
    const imdbId = parts[0]; // Assume this is treated as a string
    const season = Number(parts[1]) || null;
    const episode = Number(parts[2]) || null;

    if (!imdbId) return captions;

    const response = await ops.proxiedFetcher(
      `https://rest.opensubtitles.org/search/${
        season && episode ? `episode-${episode}/` : ''
      }imdbid-${imdbId.slice(2)}${season && episode ? `/season-${season}` : ''}`,
      {
        headers: {
          'X-User-Agent': 'VLSub 0.10.2',
        },
      },
    );

    // Check if response is a string or an object
    const jsonResponse = typeof response === 'string' ? fixJson(response) : fixJson(JSON.stringify(response));
    const Res = JSON.parse(jsonResponse);

    const openSubtitlesCaptions: Caption[] = [];
    for (const caption of Res) {
      const url = caption.SubDownloadLink.replace('.gz', '').replace('download/', 'download/subencoding-utf8/');
      const language = labelToLanguageCode(caption.LanguageName);
      if (!url || !language) continue;
      else
        openSubtitlesCaptions.push({
          id: url,
          opensubtitles: true,
          url,
          type: caption.SubFormat || 'srt',
          hasCorsRestrictions: false,
          language,
        });
    }
    return [...captions, ...removeDuplicatedLanguages(openSubtitlesCaptions)];
  } catch (e) {
    console.error('Error processing OpenSubtitles captions:', e);
    return captions;
  }
}
