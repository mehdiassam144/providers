import { Caption, labelToLanguageCode, removeDuplicatedLanguages } from '@/providers/captions';
import { IndividualEmbedRunnerOptions } from '@/runners/individualRunner';
import { ProviderRunnerOptions } from '@/runners/runner';

function fixJson(jsonStr: string): string {
  let testJson = jsonStr.trim();
  let attempts = 0; // Limit the number of attempts to prevent infinite loops
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    try {
      JSON.parse(testJson);
      return testJson; // If valid, return the fixed JSON
    } catch (e: any) {
      attempts++;
      const message: string = e.message;
      if (message.includes('Unexpected end of JSON input') || message.includes('Unterminated string')) {
        const lastOpenCurly = testJson.lastIndexOf('{');
        const lastOpenBracket = testJson.lastIndexOf('[');
        const lastQuote = testJson.lastIndexOf('"');

        if (lastQuote > lastOpenCurly && lastQuote > lastOpenBracket) {
          testJson = `${testJson.substring(0, lastQuote)}"${testJson.substring(lastQuote + 1)}`;
        } else {
          testJson = testJson.substring(0, Math.max(lastOpenCurly, lastOpenBracket) + 1);
        }
        testJson += lastOpenCurly > lastOpenBracket ? '}' : ']';
      } else {
        break; // Break the loop if the error isn't about incomplete input
      }
    }
  }

  return '{}'; // Return an empty object if no valid JSON can be formed
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
