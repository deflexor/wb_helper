import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Input data for SEO content generation
 */
export interface SEOContentInput {
  /** Original content to optimize for SEO */
  originalContent: string;
  /** Target keywords for SEO */
  keywords: string[];
  /** Content type (product description, category page, etc.) */
  contentType: 'product' | 'category' | 'blog' | 'landing';
  /** Target language code (en, ru) */
  language: string;
}

/**
 * Generated SEO content output
 */
export interface SEOContentOutput {
  /** Generated SEO-optimized content */
  content: string;
  /** Meta title suggestion */
  metaTitle: string;
  /** Meta description suggestion */
  metaDescription: string;
  /** Suggested URL slug */
  slug: string;
  /** Generation timestamp */
  generatedAt: string;
}

/**
 * SEO metadata for the content
 */
export interface SEOMetadata {
  /** Word count of the content */
  wordCount: number;
  /** Keyword density percentage */
  keywordDensity: number;
  /** Readability score (0-100) */
  readabilityScore: number;
  /** List of detected issues */
  issues: string[];
}

/**
 * Result returned by useSeoContent hook
 */
export interface UseSeoContentResult {
  /** Current generated content */
  content: SEOContentOutput | null;
  /** Loading state during generation */
  isGenerating: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** SEO metadata for current content */
  metadata: SEOMetadata | null;
  /** Generate new content from input */
  generate: (input: SEOContentInput) => Promise<void>;
  /** Regenerate content with same input */
  regenerate: () => Promise<void>;
  /** Copy content to clipboard */
  copyToClipboard: () => Promise<boolean>;
}

// =============================================================================
// PURE FUNCTIONS (for testing and reuse)
// =============================================================================

/**
 * Calculate SEO metadata from content and keywords
 */
const calculateMetadata = (
  content: string,
  keywords: string[]
): SEOMetadata => {
  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Calculate keyword density
  const contentLower = content.toLowerCase();
  const keywordOccurrences = keywords.reduce((count, kw) => {
    const matches = contentLower.match(new RegExp(kw.toLowerCase(), 'g'));
    return count + (matches?.length ?? 0);
  }, 0);

  const totalWords = wordCount || 1;
  const keywordDensity = Math.round((keywordOccurrences / totalWords) * 100 * 10) / 10;

  // Calculate readability score (simplified Flesch-based)
  const sentences = content.split(/[.!?]+/).filter(Boolean);
  const avgSentenceLength = sentences.length ? wordCount / sentences.length : 0;
  const readabilityScore = Math.max(
    0,
    Math.min(100, Math.round(100 - (avgSentenceLength - 15) * 2))
  );

  // Detect issues
  const issues: string[] = [];
  if (keywordDensity < 1) {
    issues.push('keywordDensityLow');
  }
  if (keywordDensity > 5) {
    issues.push('keywordDensityHigh');
  }
  if (wordCount < 50) {
    issues.push('contentTooShort');
  }
  if (wordCount > 3000) {
    issues.push('contentTooLong');
  }

  return { wordCount, keywordDensity, readabilityScore, issues };
};

// =============================================================================
// MOCK API (replace with real OpenRouter API in production)
// =============================================================================

/**
 * Mock API call - simulates OpenRouter AI content generation
 * In production, replace with actual OpenRouter API integration
 */
const generateSeoContent = async (
  input: SEOContentInput
): Promise<SEOContentOutput> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock response based on input
  const keywordList = input.keywords.join(', ');
  const contentSnippet =
    input.language === 'ru'
      ? `Улучшенное SEO-описание с ключевыми словами: ${keywordList}. `
      : `Improved SEO description with keywords: ${keywordList}. `;

  const generatedContent =
    contentSnippet +
    input.originalContent.substring(0, 200) +
    (input.originalContent.length > 200 ? '...' : '');

  const slugBase = input.originalContent
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50);

  return {
    content: generatedContent,
    metaTitle:
      input.language === 'ru'
        ? `${input.keywords[0] ?? 'Product'} - Купить | WB Helper`
        : `${input.keywords[0] ?? 'Product'} - Buy Now | WB Helper`,
    metaDescription:
      input.language === 'ru'
        ? `Лучшее предложение на ${keywordList}. Быстрая доставка.`
        : `Best offer on ${keywordList}. Fast delivery.`,
    slug: `${slugBase}-${Date.now().toString(36)}`,
    generatedAt: new Date().toISOString(),
  };
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for SEO content generation
 * Integrates with OpenRouter API (mocked) for content generation
 */
export function useSeoContent(): UseSeoContentResult {
  const { t } = useTranslation();

  const [content, setContent] = useState<SEOContentOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<SEOContentInput | null>(null);

  // Calculate metadata whenever content or keywords change
  const metadata = content
    ? calculateMetadata(content.content, lastInput?.keywords ?? [])
    : null;

  /**
   * Generate SEO content from input
   */
  const generate = useCallback(
    async (input: SEOContentInput): Promise<void> => {
      setIsGenerating(true);
      setError(null);
      setLastInput(input);

      try {
        const result = await generateSeoContent(input);
        setContent(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('seo.generationFailed');
        setError(message);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [t]
  );

  /**
   * Regenerate content with the same input
   */
  const regenerate = useCallback(async (): Promise<void> => {
    if (!lastInput) {
      setError(t('seo.noContentToRegenerate'));
      return;
    }
    await generate(lastInput);
  }, [lastInput, generate, t]);

  /**
   * Copy content to clipboard
   */
  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    if (!content) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(content.content);
      return true;
    } catch {
      setError(t('seo.copyFailed'));
      return false;
    }
  }, [content, t]);

  return {
    content,
    isGenerating,
    error,
    metadata,
    generate,
    regenerate,
    copyToClipboard,
  };
}
