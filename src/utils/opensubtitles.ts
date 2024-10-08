import { Caption, labelToLanguageCode, removeDuplicatedLanguages } from '@/providers/captions';
import { IndividualEmbedRunnerOptions } from '@/runners/individualRunner';
import { ProviderRunnerOptions } from '@/runners/runner';

function fixJson(jsonStr: string): string {
  try {
    // Attempt to parse the JSON to see if it's already valid
    JSON.parse(jsonStr);
    return jsonStr;
  } catch (e) {
    // If there's a parsing error, find the last index of potentially complex structures
    let lastValidObjectIndex = jsonStr.lastIndexOf('}');
    let lastValidArrayIndex = jsonStr.lastIndexOf(']');
    let lastValidIndex = Math.max(lastValidObjectIndex, lastValidArrayIndex);

    // Attempt to close open strings and structures
    while (lastValidIndex > -1) {
      try {
        // Close the structure
        let testJson = jsonStr.substring(0, lastValidIndex + 1);
        testJson += lastValidObjectIndex > lastValidArrayIndex ? '}' : ']';
        JSON.parse(testJson); // Test if the JSON is now valid
        return testJson;
      } catch (error) {
        // If still failing, decrement and try again
        lastValidObjectIndex = jsonStr.lastIndexOf('}', lastValidObjectIndex - 1);
        lastValidArrayIndex = jsonStr.lastIndexOf(']', lastValidArrayIndex - 1);
        lastValidIndex = Math.max(lastValidObjectIndex, lastValidArrayIndex);
      }
    }

    // As a last resort, return an empty array or object based on what seems more likely needed
    return lastValidObjectIndex > lastValidArrayIndex ? '{}' : '[]';
  }
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
