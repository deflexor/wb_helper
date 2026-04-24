import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSeoContent } from "@/hooks/useSeoContent";
import type { SEOContentInput } from "@/hooks/useSeoContent";

// =============================================================================
// TEST SETUP
// =============================================================================

/**
 * Mock navigator.clipboard for clipboard operations
 */
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue(""),
};

Object.defineProperty(navigator, "clipboard", {
  value: mockClipboard,
  writable: true,
});

// =============================================================================
// HELPER FUNCTIONS (for pure function testing)
// =============================================================================

/**
 * These are exported from the module for testing - in production they are private
 * We test them via the hook behavior
 */

// =============================================================================
// TESTS
// =============================================================================

describe("useSeoContent hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboard.writeText.mockClear();
    mockClipboard.writeText.mockResolvedValue(undefined);
  });

  describe("initial state", () => {
    it("should return null content on initial render", () => {
      const { result } = renderHook(() => useSeoContent());

      expect(result.current.content).toBeNull();
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.metadata).toBeNull();
    });

    it("should return copyToClipboard as a function", () => {
      const { result } = renderHook(() => useSeoContent());

      expect(typeof result.current.copyToClipboard).toBe("function");
      expect(typeof result.current.generate).toBe("function");
      expect(typeof result.current.regenerate).toBe("function");
    });
  });

  describe("generate content", () => {
    const mockInput: SEOContentInput = {
      originalContent: "Original product description for testing",
      keywords: ["product", "test", "seo"],
      contentType: "product",
      language: "en",
    };

    it("should set isGenerating to true during generation", async () => {
      const { result } = renderHook(() => useSeoContent());

      // Start generation
      act(() => {
        result.current.generate(mockInput);
      });

      // Immediately check isGenerating
      expect(result.current.isGenerating).toBe(true);
    });

    it("should set content after successful generation", async () => {
      const { result } = renderHook(() => useSeoContent());

      await act(async () => {
        await result.current.generate(mockInput);
      });

      await waitFor(() => {
        expect(result.current.content).not.toBeNull();
      });

      expect(result.current.content?.content).toBeDefined();
      expect(result.current.content?.metaTitle).toBeDefined();
      expect(result.current.content?.metaDescription).toBeDefined();
      expect(result.current.content?.slug).toBeDefined();
      expect(result.current.content?.generatedAt).toBeDefined();
    });

    it("should set error to null on successful generation", async () => {
      const { result } = renderHook(() => useSeoContent());

      await act(async () => {
        await result.current.generate(mockInput);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it("should include SEO metadata after generation", async () => {
      const { result } = renderHook(() => useSeoContent());

      await act(async () => {
        await result.current.generate(mockInput);
      });

      await waitFor(() => {
        expect(result.current.metadata).not.toBeNull();
      });

      expect(result.current.metadata?.wordCount).toBeGreaterThan(0);
      expect(result.current.metadata?.keywordDensity).toBeGreaterThanOrEqual(0);
      expect(result.current.metadata?.readabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.current.metadata?.readabilityScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.current.metadata?.issues)).toBe(true);
    });

    it("should generate content with all required fields", async () => {
      const { result } = renderHook(() => useSeoContent());

      await act(async () => {
        await result.current.generate(mockInput);
      });

      await waitFor(() => {
        expect(result.current.content).not.toBeNull();
      });

      // Verify all required fields are present
      const content = result.current.content;
      expect(content?.content).toBeDefined();
      expect(content?.metaTitle).toBeDefined();
      expect(content?.metaDescription).toBeDefined();
      expect(content?.slug).toBeDefined();
      expect(content?.generatedAt).toBeDefined();

      // Verify slug is URL-safe
      expect(content?.slug).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe("regenerate content", () => {
    const mockInput: SEOContentInput = {
      originalContent: "Test content for regeneration",
      keywords: ["test"],
      contentType: "blog",
      language: "en",
    };

    it("should call generate with last input", async () => {
      const { result } = renderHook(() => useSeoContent());

      // First generate
      await act(async () => {
        await result.current.generate(mockInput);
      });

      await waitFor(() => {
        expect(result.current.content).not.toBeNull();
      });

      // Then regenerate
      await act(async () => {
        await result.current.regenerate();
      });

      await waitFor(() => {
        expect(result.current.content).not.toBeNull();
      });
    });

    it("should set error if no content to regenerate", async () => {
      const { result } = renderHook(() => useSeoContent());

      await act(async () => {
        await result.current.regenerate();
      });

      expect(result.current.error).toBe("seo.noContentToRegenerate");
    });
  });

  describe("copyToClipboard", () => {
    const mockInput: SEOContentInput = {
      originalContent: "Content to copy",
      keywords: ["copy"],
      contentType: "product",
      language: "en",
    };

    it("should return true when copying succeeds", async () => {
      const { result } = renderHook(() => useSeoContent());

      await act(async () => {
        await result.current.generate(mockInput);
      });

      await waitFor(() => {
        expect(result.current.content).not.toBeNull();
      });

      let copyResult = false;
      await act(async () => {
        copyResult = await result.current.copyToClipboard();
      });

      expect(copyResult).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        result.current.content?.content
      );
    });

    it("should return false when no content to copy", async () => {
      const { result } = renderHook(() => useSeoContent());

      let copyResult = false;
      await act(async () => {
        copyResult = await result.current.copyToClipboard();
      });

      expect(copyResult).toBe(false);
    });

    it("should return false when clipboard API fails", async () => {
      const { result } = renderHook(() => useSeoContent());

      await act(async () => {
        await result.current.generate(mockInput);
      });

      await waitFor(() => {
        expect(result.current.content).not.toBeNull();
      });

      // Simulate clipboard failure
      mockClipboard.writeText.mockRejectedValueOnce(new Error("Clipboard error"));

      let copyResult = false;
      await act(async () => {
        copyResult = await result.current.copyToClipboard();
      });

      expect(copyResult).toBe(false);
      expect(result.current.error).toBe("seo.copyFailed");
    });
  });

  describe("SEO metadata calculation", () => {
    it("should calculate correct word count for short content", async () => {
      const { result } = renderHook(() => useSeoContent());

      const shortInput: SEOContentInput = {
        originalContent: "Short product description",
        keywords: ["product"],
        contentType: "product",
        language: "en",
      };

      await act(async () => {
        await result.current.generate(shortInput);
      });

      await waitFor(() => {
        expect(result.current.metadata?.wordCount).toBeGreaterThan(0);
      });

      // Short content should trigger contentTooShort issue
      expect(result.current.metadata?.issues).toContain("contentTooShort");
    });

    it("should detect short content", async () => {
      const { result } = renderHook(() => useSeoContent());

      const shortContentInput: SEOContentInput = {
        originalContent: "Short",
        keywords: ["test"],
        contentType: "product",
        language: "en",
      };

      await act(async () => {
        await result.current.generate(shortContentInput);
      });

      await waitFor(() => {
        expect(result.current.metadata?.issues).toContain("contentTooShort");
      });
    });
  });
});
