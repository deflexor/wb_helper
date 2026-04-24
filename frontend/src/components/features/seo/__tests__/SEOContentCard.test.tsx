import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SEOContentCard } from "../SEOContentCard";

// =============================================================================
// TEST SETUP
// =============================================================================

/**
 * Default props for SEOContentCard testing
 */
const defaultProps = {
  originalContent: "Original product description for testing",
  generatedContent: "Generated SEO-optimized content here",
  isLoading: false,
  onCopy: vi.fn(),
  onSave: vi.fn(),
  onRegenerate: vi.fn(),
};

// =============================================================================
// TESTS
// =============================================================================

describe("SEOContentCard component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the card with correct title", () => {
      render(<SEOContentCard {...defaultProps} />);

      expect(screen.getByText("SEO Content Comparison")).toBeInTheDocument();
    });

    it("should display original content in left panel", () => {
      render(<SEOContentCard {...defaultProps} />);

      expect(screen.getByText(defaultProps.originalContent)).toBeInTheDocument();
    });

    it("should display generated content in right panel", () => {
      render(<SEOContentCard {...defaultProps} />);

      expect(screen.getByText(defaultProps.generatedContent)).toBeInTheDocument();
    });

    it("should show original content placeholder when empty", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          originalContent=""
          isLoading={false}
        />
      );

      expect(screen.getByText("No original content provided")).toBeInTheDocument();
    });

    it("should show generated content placeholder when null", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          generatedContent={null}
          isLoading={false}
        />
      );

      expect(screen.getByText("Click \"Regenerate\" to generate SEO content")).toBeInTheDocument();
    });

    it("should render Original and Generated section headers", () => {
      render(<SEOContentCard {...defaultProps} />);

      expect(screen.getByText("Original")).toBeInTheDocument();
      expect(screen.getByText("Generated")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show skeleton when isLoading is true", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          isLoading={true}
          generatedContent={null}
        />
      );

      // Check for skeleton elements (loading animation)
      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it("should have disabled Copy button for generated content during loading", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          isLoading={true}
          generatedContent={null}
        />
      );

      // Find the Copy button in the Generated section
      const generatedSection = screen.getByText("Generated").closest("div");
      const copyButton = generatedSection?.parentElement?.querySelector('button');

      expect(copyButton).toBeDisabled();
    });

    it("should have disabled Save button during loading", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          isLoading={true}
          generatedContent={null}
        />
      );

      // Find the Save button
      const generatedSection = screen.getByText("Generated").closest("div");
      const saveButton = generatedSection?.parentElement?.querySelectorAll('button')[1];

      expect(saveButton).toBeDisabled();
    });

    it("should have disabled Regenerate button during loading", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          isLoading={true}
        />
      );

      expect(screen.getByRole("button", { name: /Regenerate/i })).toBeDisabled();
    });

    it("should show skeleton instead of content even when generatedContent exists", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          isLoading={true}
          generatedContent="Some content"
        />
      );

      // Should show skeleton, not the actual content
      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });

  describe("button interactions", () => {
    it("should call onCopy with original content when Copy Original is clicked", () => {
      render(<SEOContentCard {...defaultProps} />);

      // Click the first Copy button (Original section)
      const copyButtons = screen.getAllByRole("button", { name: /Copy/i });
      fireEvent.click(copyButtons[0]);

      expect(defaultProps.onCopy).toHaveBeenCalledWith(defaultProps.originalContent);
    });

    it("should call onCopy with generated content when Copy Generated is clicked", () => {
      render(<SEOContentCard {...defaultProps} />);

      // Click the second Copy button (Generated section)
      const copyButtons = screen.getAllByRole("button", { name: /Copy/i });
      fireEvent.click(copyButtons[1]);

      expect(defaultProps.onCopy).toHaveBeenCalledWith(defaultProps.generatedContent);
    });

    it("should call onSave with generated content when Save is clicked", () => {
      render(<SEOContentCard {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: /Save/i });
      fireEvent.click(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith(defaultProps.generatedContent);
    });

    it("should call onRegenerate when Regenerate button is clicked", () => {
      render(<SEOContentCard {...defaultProps} />);

      const regenerateButton = screen.getByRole("button", { name: /Regenerate/i });
      fireEvent.click(regenerateButton);

      expect(defaultProps.onRegenerate).toHaveBeenCalledTimes(1);
    });

    it("should not call onSave when Save is clicked but generatedContent is null", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          generatedContent={null}
          isLoading={false}
        />
      );

      const saveButton = screen.getByRole("button", { name: /Save/i });
      fireEvent.click(saveButton);

      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });
  });

  describe("button disabled states", () => {
    it("should disable Copy button when isLoading and no generated content", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          isLoading={true}
          generatedContent={null}
        />
      );

      const generatedSection = screen.getByText("Generated").closest("div");
      const copyButton = generatedSection?.parentElement?.querySelector('button');

      expect(copyButton).toBeDisabled();
    });

    it("should disable Save button when generatedContent is null", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          generatedContent={null}
          isLoading={false}
        />
      );

      const saveButton = screen.getByRole("button", { name: /Save/i });
      expect(saveButton).toBeDisabled();
    });

    it("should not disable Copy button for original content when loading", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          isLoading={true}
        />
      );

      // Original Copy button should still work
      const copyButtons = screen.getAllByRole("button", { name: /Copy/i });
      expect(copyButtons[0]).not.toBeDisabled();
    });
  });

  describe("split view layout", () => {
    it("should render both Original and Generated sections", () => {
      render(<SEOContentCard {...defaultProps} />);

      // Both sections should be present
      expect(screen.getByText("Original")).toBeInTheDocument();
      expect(screen.getByText("Generated")).toBeInTheDocument();
    });

    it("should show Regenerate button in header", () => {
      render(<SEOContentCard {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Regenerate/i })).toBeInTheDocument();
    });

    it("should show Copy and Save buttons in Generated section header", () => {
      render(<SEOContentCard {...defaultProps} />);

      expect(screen.getAllByRole("button", { name: /Copy/i }).length).toBe(2);
      expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
    });
  });

  describe("error state handling", () => {
    it("should handle empty original content gracefully", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          originalContent=""
        />
      );

      expect(screen.getByText("No original content provided")).toBeInTheDocument();
      expect(screen.queryByText(defaultProps.originalContent)).not.toBeInTheDocument();
    });

    it("should handle empty generated content gracefully", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          generatedContent=""
          isLoading={false}
        />
      );

      expect(screen.getByText("Click \"Regenerate\" to generate SEO content")).toBeInTheDocument();
    });

    it("should show loading skeleton instead of content when loading even if content exists", () => {
      render(
        <SEOContentCard
          {...defaultProps}
          isLoading={true}
          generatedContent="Some existing content"
        />
      );

      // When loading, skeleton should be shown, not the actual content
      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });
});