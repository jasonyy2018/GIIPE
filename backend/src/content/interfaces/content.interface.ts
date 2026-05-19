export interface ProcessedContent {
  html: string;
  markdown: string;
  metadata: ContentMetadata;
}

export interface ContentMetadata {
  wordCount: number;
  readingTime: number; // in minutes
  headings: HeadingInfo[];
  links: LinkInfo[];
  images: ImageInfo[];
}

export interface HeadingInfo {
  level: number;
  text: string;
  id: string;
}

export interface LinkInfo {
  text: string;
  url: string;
  isExternal: boolean;
}

export interface ImageInfo {
  alt: string;
  src: string;
  title?: string;
}

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  stripIgnoreTag?: boolean;
}