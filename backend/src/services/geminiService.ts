/**
 * Service to interact with the Google Gemini API.
 */
export class GeminiService {
  private static getApiKey(): string {
    return process.env.GEMINI_API_KEY || '';
  }

  /**
   * Generates content from a prompt string.
   */
  public static async generateContent(prompt: string, expectJson = false): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.warn('[GeminiService] GEMINI_API_KEY is not set. Falling back to default mock responses.');
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const body: any = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    };

    if (expectJson) {
      body.generationConfig = {
        responseMimeType: 'application/json'
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (Status ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini API returned an empty or malformed candidates response');
      }

      return text;
    } catch (err) {
      console.error('[GeminiService] API call failed:', err);
      throw err;
    }
  }
}
