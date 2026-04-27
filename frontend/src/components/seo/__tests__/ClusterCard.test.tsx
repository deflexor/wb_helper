import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ClusterCard } from "../ClusterCard";

// =============================================================================
// TEST SETUP
// =============================================================================

const mockCluster = {
  id: "cluster-1",
  name: "Audio Equipment",
  keywords: [
    { id: "kw-1", keyword: "wireless headphones", marketplace: "wildberries" as const, similarity: 0.95 },
    { id: "kw-2", keyword: "bluetooth speaker", marketplace: "ozon" as const, similarity: 0.85 },
    { id: "kw-3", keyword: "gaming headset", marketplace: "wildberries" as const, similarity: 0.72 },
    { id: "kw-4", keyword: "portable speaker", marketplace: "wildberries" as const, similarity: 0.68 },
  ],
  totalKeywords: 4,
  avgSimilarity: 0.8,
};

const defaultProps = {
  cluster: mockCluster,
  isLoading: false,
  onEditClick: vi.fn(),
  onMergeClick: vi.fn(),
  onDeleteClick: vi.fn(),
  onExportClick: vi.fn(),
  onKeywordClick: vi.fn(),
};

// =============================================================================
// TESTS
// =============================================================================

describe("ClusterCard component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the card with cluster name", () => {
      render(<ClusterCard {...defaultProps} />);

      expect(screen.getByText("Audio Equipment")).toBeInTheDocument();
    });

    it("should display keyword count", () => {
      render(<ClusterCard {...defaultProps} />);

      expect(screen.getByText("4 keywords")).toBeInTheDocument();
    });

    it("should show average similarity", () => {
      render(<ClusterCard {...defaultProps} />);

      expect(screen.getByText("80% avg")).toBeInTheDocument();
    });

    it("should display all keywords", () => {
      render(<ClusterCard {...defaultProps} />);

      expect(screen.getByText("wireless headphones")).toBeInTheDocument();
      expect(screen.getByText("bluetooth speaker")).toBeInTheDocument();
      expect(screen.getByText("gaming headset")).toBeInTheDocument();
      expect(screen.getByText("portable speaker")).toBeInTheDocument();
    });

    it("should show similarity percentages on keyword pills", () => {
      render(<ClusterCard {...defaultProps} />);

      expect(screen.getByText("95%")).toBeInTheDocument();
      expect(screen.getByText("85%")).toBeInTheDocument();
      expect(screen.getByText("72%")).toBeInTheDocument();
      expect(screen.getByText("68%")).toBeInTheDocument();
    });

    it("should show marketplace badges", () => {
      render(<ClusterCard {...defaultProps} />);

      expect(screen.getAllByText("WB").length).toBeGreaterThan(0);
      expect(screen.getByText("Ozon")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show skeleton when isLoading is true", () => {
      render(<ClusterCard {...defaultProps} isLoading={true} />);

      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it("should not show cluster name when loading", () => {
      render(<ClusterCard {...defaultProps} isLoading={true} />);

      expect(screen.queryByText("Audio Equipment")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no keywords", () => {
      render(
        <ClusterCard
          {...defaultProps}
          cluster={{ ...mockCluster, keywords: [], totalKeywords: 0 }}
        />
      );

      expect(screen.getByText("No keywords in this cluster")).toBeInTheDocument();
    });
  });

  describe("action buttons", () => {
    it("should render Edit button", () => {
      render(<ClusterCard {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    });

    it("should render Merge button", () => {
      render(<ClusterCard {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Merge/i })).toBeInTheDocument();
    });

    it("should render Delete button", () => {
      render(<ClusterCard {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Delete/i })).toBeInTheDocument();
    });

    it("should render Export button", () => {
      render(<ClusterCard {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Export/i })).toBeInTheDocument();
    });

    it("should call onEditClick when Edit is clicked", () => {
      render(<ClusterCard {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
      expect(defaultProps.onEditClick).toHaveBeenCalledWith(mockCluster);
    });

    it("should call onMergeClick when Merge is clicked", () => {
      render(<ClusterCard {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Merge/i }));
      expect(defaultProps.onMergeClick).toHaveBeenCalledWith(mockCluster);
    });

    it("should call onDeleteClick when Delete is clicked", () => {
      render(<ClusterCard {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Delete/i }));
      expect(defaultProps.onDeleteClick).toHaveBeenCalledWith(mockCluster);
    });

    it("should call onExportClick when Export is clicked", () => {
      render(<ClusterCard {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Export/i }));
      expect(defaultProps.onExportClick).toHaveBeenCalledWith(mockCluster);
    });
  });

  describe("keyword pill click", () => {
    it("should call onKeywordClick when keyword pill is clicked", () => {
      render(<ClusterCard {...defaultProps} />);

      fireEvent.click(screen.getByText("wireless headphones"));
      expect(defaultProps.onKeywordClick).toHaveBeenCalledWith(mockCluster.keywords[0]);
    });
  });

  describe("similarity color coding", () => {
    it("should show green for high similarity (>= 80%)", () => {
      render(<ClusterCard {...defaultProps} />);

      // wireless headphones has 95% similarity
      const highSimilarityBadge = screen.getByText("95%");
      expect(highSimilarityBadge.closest("span")).toHaveClass("bg-green-900");
    });

    it("should show yellow for medium similarity (50-79%)", () => {
      render(<ClusterCard {...defaultProps} />);

      // gaming headset has 72% similarity
      const mediumSimilarityBadge = screen.getByText("72%");
      expect(mediumSimilarityBadge.closest("span")).toHaveClass("bg-yellow-900");
    });

    it("should show red for low similarity (< 50%)", () => {
      const clusterWithLowSimilarity = {
        ...mockCluster,
        keywords: [
          { id: "kw-1", keyword: "test", marketplace: "wildberries" as const, similarity: 0.3 },
        ],
        totalKeywords: 1,
        avgSimilarity: 0.3,
      };

      render(<ClusterCard {...defaultProps} cluster={clusterWithLowSimilarity} />);

      expect(screen.getByText("30%")).toBeInTheDocument();
      const lowSimilarityBadge = screen.getByText("30%");
      expect(lowSimilarityBadge.closest("span")).toHaveClass("bg-red-900");
    });
  });

  describe("optional props", () => {
    it("should handle missing avgSimilarity", () => {
      render(
        <ClusterCard
          {...defaultProps}
          cluster={{ ...mockCluster, avgSimilarity: undefined }}
        />
      );

      expect(screen.getByText("Audio Equipment")).toBeInTheDocument();
      expect(screen.queryByText("% avg")).not.toBeInTheDocument();
    });
  });
});
