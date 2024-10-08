import { Caption, labelToLanguageCode, removeDuplicatedLanguages } from '@/providers/captions';
import { IndividualEmbedRunnerOptions } from '@/runners/individualRunner';
import { ProviderRunnerOptions } from '@/runners/runner';

function fixJson(jsonStr: string): string {
  try {
    JSON.parse(jsonStr);
    return jsonStr; // JSON is already valid
  } catch (e) {
    // Find the last occurrence of a correctly closed object
    const lastIndex = jsonStr.lastIndexOf('}');
    return `${jsonStr.substring(0, lastIndex + 1)}]`;
  }
}

export async function addOpenSubtitlesCaptions(
  captions: Caption[],
  ops: ProviderRunnerOptions | IndividualEmbedRunnerOptions,
  media: string,
): Promise<Caption[]> {
  try {
    const parts = atob(media).split('.');
    const imdbId = parts[0]; // Ensure this is treated as a string
    const season = Number(parts[1]) || null; // Explicitly convert to Number or null if conversion fails
    const episode = Number(parts[2]) || null; // Explicitly convert to Number or null if conversion fails

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

    const jsonResponse = fixJson(response); // Assuming response is a JSON string
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
