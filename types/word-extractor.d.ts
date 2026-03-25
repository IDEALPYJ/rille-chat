declare module 'word-extractor' {
  export class WordExtractor {
    extract(filePath: string): Promise<{
      getBody(): string;
      getHeaders(): { [key: string]: string };
      getFootnotes(): string;
      getEndnotes(): string;
    }>;
  }
  
  export default WordExtractor;
}
