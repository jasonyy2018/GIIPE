export interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  wordInfo?: {
    word: string;
    level: number;
    category: string;
  };
  failureLink?: TrieNode;
}

export class DFATrie {
  private root: TrieNode;

  constructor() {
    this.root = {
      children: new Map(),
      isEndOfWord: false,
    };
  }

  /**
   * Insert a sensitive word into the trie
   */
  insert(word: string, level: number, category: string): void {
    let current = this.root;
    const normalizedWord = this.normalizeText(word);

    for (const char of normalizedWord) {
      if (!current.children.has(char)) {
        current.children.set(char, {
          children: new Map(),
          isEndOfWord: false,
        });
      }
      current = current.children.get(char)!;
    }

    current.isEndOfWord = true;
    current.wordInfo = { word, level, category };
  }

  /**
   * Build failure links for Aho-Corasick algorithm
   */
  buildFailureLinks(): void {
    const queue: TrieNode[] = [];

    // Initialize failure links for root's children
    for (const child of this.root.children.values()) {
      child.failureLink = this.root;
      queue.push(child);
    }

    // Build failure links using BFS
    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const [char, child] of current.children) {
        queue.push(child);

        let failure = current.failureLink;
        while (failure && !failure.children.has(char)) {
          failure = failure.failureLink;
        }

        if (failure && failure.children.has(char) && failure.children.get(char) !== child) {
          child.failureLink = failure.children.get(char);
        } else {
          child.failureLink = this.root;
        }
      }
    }
  }

  /**
   * Search for sensitive words in text using Aho-Corasick algorithm
   */
  search(text: string): Array<{ word: string; level: number; category: string; start: number; end: number }> {
    const results: Array<{ word: string; level: number; category: string; start: number; end: number }> = [];
    const normalizedText = this.normalizeText(text);
    let current = this.root;

    for (let i = 0; i < normalizedText.length; i++) {
      const char = normalizedText[i];

      // Follow failure links until we find a match or reach root
      while (current !== this.root && !current.children.has(char)) {
        current = current.failureLink!;
      }

      if (current.children.has(char)) {
        current = current.children.get(char)!;
      }

      // Check for matches at current position
      let temp = current;
      while (temp !== this.root) {
        if (temp.isEndOfWord && temp.wordInfo) {
          const wordLength = temp.wordInfo.word.length;
          results.push({
            word: temp.wordInfo.word,
            level: temp.wordInfo.level,
            category: temp.wordInfo.category,
            start: i - wordLength + 1,
            end: i,
          });
        }
        temp = temp.failureLink!;
      }
    }

    return results;
  }

  /**
   * Normalize text for consistent matching (lowercase, remove special chars)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Clear the trie
   */
  clear(): void {
    this.root = {
      children: new Map(),
      isEndOfWord: false,
    };
  }
}