declare module 'mammoth' {
  export interface ConvertToHtmlOptions {
    arrayBuffer: ArrayBuffer;
  }

  export interface ConvertResult {
    value: string; // HTML string
    messages: Array<{ type: string; message: string }>;
  }

  export function convertToHtml(
    input: ConvertToHtmlOptions,
    options?: any
  ): Promise<ConvertResult>;
}

