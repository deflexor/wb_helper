import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CompetitorCard } from "../CompetitorCard";

// =============================================================================
// TEST SETUP
// =============================================================================

const mockCompetitor = {
  id: "comp-1",
  articleId: "WB-12345",
  marketplace: "wildberries" as const,
  keywords: [
    {
      keyword: "wireless headphones",
      competitorPosition: 2,
      yourPosition: 5,
      volume: 10000,
      difficulty: "hard" as const,
    },
    {
      keyword: "bluetooth speaker",
      competitorPosition: 3,
      yourPosition: 1,
      volume: 8000,
      difficulty: "medium" as const,
    },
    {
      keyword: "gaming headset",
      competitorPosition: 8,
      yourPosition: undefined,
      volume: 5000,
      difficulty: "easy" as const,
    },
    {
      keyword: "portable speaker",
      competitorPosition: 1,
      yourPosition: 10,
      volume: 12000,
      difficulty: "hard" as const,
    },
  ],
  totalKeywords: 4,
  overlap: 65,
  isGaining: true,
};

const defaultProps = {
  competitor: mockCompetitor,
  isLoading: false,
  onFindGapsClick: vi.fn(),
  onKeywordClick: vi.fn(),
};

// =============================================================================
// TESTS
// =============================================================================

describe("CompetitorCard component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the card with article ID", () => {
      render(<CompetitorCard {...defaultProps} />);

      expect(screen.getByText("WB-12345")).toBeInTheDocument();
      expect(screen.getByText("Article ID")).toBeInTheDocument();
    });

    it("should display total keywords count", () => {
      render(<CompetitorCard {...defaultProps} />);

      expect(screen.getByText("4 ranking keywords")).toBeInTheDocument();
    });

    it("should display overlap percentage", () => {
      render(<CompetitorCard {...defaultProps} />);

      expect(screen.getByText("65%")).toBeInTheDocument();
      expect(screen.getByText("overlap")).toBeInTheDocument();
    });

    it("should display marketplace badge", () => {
      render(<CompetitorCard {...defaultProps} />);

      expect(screen.getByText("WB")).toBeInTheDocument();
    });

    it("should display gaining status badge", () => {
      render(<CompetitorCard {...defaultProps} />);

      expect(screen.getByText("Gaining")).toBeInTheDocument();
    });

    it("should display all keywords", () => {
      render(<CompetitorCard {...defaultProps} />);

      expect(screen.getByText("wireless headphones")).toBeInTheDocument();
      expect(screen.getByText("bluetooth speaker")).toBeInTheDocument();
      expect(screen.getByText("gaming headset")).toBeInTheDocument();
      expect(screen.getByText("portable speaker")).toBeInTheDocument();
    });

    it("should show gaps found indicator", () => {
      render(<CompetitorCard {...defaultProps} />);

      // gaming headset is not ranked for you
      // portable speaker competitor beats you (1 vs 10)
      expect(screen.getByText("2 gaps found")).toBeInTheDocument();
    });

    it("should show Find Gaps button", () => {
      render(<CompetitorCard {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Find 2 Keyword Gaps/i })).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show skeleton when isLoading is true", () => {
      render(<CompetitorCard {...defaultProps} isLoading={true} />);

      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it("should not show competitor info when loading", () => {
      render(<CompetitorCard {...defaultProps} isLoading={true} />);

      expect(screen.queryByText("WB-12345")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no keywords", () => {
      render(
        <CompetitorCard
          {...defaultProps}
          competitor={{ ...mockCompetitor, keywords: [], totalKeywords: 0 }}
        />
      );

      expect(screen.getByText("No keyword data available")).toBeInTheDocument();
    });

    it("should not show Find Gaps button when no gaps", () => {
      const competitorWithNoGaps = {
        ...mockCompetitor,
        keywords: [
          {
            keyword: "test keyword",
            competitorPosition: 5,
            yourPosition: 3,
          },
        ],
        totalKeywords: 1,
      };

      render(<CompetitorCard {...defaultProps} competitor={competitorWithNoGaps} />);

      expect(screen.queryByRole("button", { name: /Find.*Keyword Gaps/i })).not.toBeInTheDocument();
    });
  });

  describe("keyword row display", () => {
    it("should show your position for ranked keywords", () => {
      render(<CompetitorCard {...defaultProps} />);

      // wireless headphones: you #5
      expect(screen.getByText(/You:.*#5/)).toBeInTheDocument();
    });

    it("should show Not ranked for unranked keywords", () => {
      render(<CompetitorCard {...defaultProps} />);

      // gaming headset: not ranked
      expect(screen.getByText("Not ranked")).toBeInTheDocument();
    });

    it("should show competitor positions", () => {
      render(<CompetitorCard {...defaultProps} />);

      expect(screen.getAllByText(/#2/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/#3/).length).toBeGreaterThan(0);
    });

    it("should show difficulty badges", () => {
      render(<CompetitorCard {...defaultProps} />);

      expect(screen.getAllByText("hard").length).toBeGreaterThan(0);
      expect(screen.getAllByText("medium").length).toBeGreaterThan(0);
      expect(screen.getAllByText("easy").length).toBeGreaterThan(0);
    });

    it("should show trending icons for comparison", () => {
      render(<CompetitorCard {...defaultProps} />);

      // bluetooth speaker: you're winning (#1 vs #3)
      // portable speaker: you're losing (#10 vs #1)
      const trendingUp = document.querySelectorAll("svg.text-green-500");
      const trendingDown = document.querySelectorAll("svg.text-red-500");

      expect(trendingUp.length).toBeGreaterThan(0);
      expect(trendingDown.length).toBeGreaterThan(0);
    });
  });

  describe("Find Gaps button", () => {
    it("should call onFindGapsClick when clicked", () => {
      render(<CompetitorCard {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /Find 2 Keyword Gaps/i }));
      expect(defaultProps.onFindGapsClick).toHaveBeenCalledWith(mockCompetitor);
    });

    it("should not render when onFindGapsClick not provided", () => {
      render(
        <CompetitorCard
          {...defaultProps}
          onFindGapsClick={undefined}
        />
      );

      expect(screen.queryByRole("button", { name: /Find.*Keyword Gaps/i })).not.toBeInTheDocument();
    });
  });

  describe("keyword row click", () => {
    it("should call onKeywordClick when keyword row is clicked", () => {
      render(<CompetitorCard {...defaultProps} />);

      fireEvent.click(screen.getByText("wireless headphones").closest("button")!);
      expect(defaultProps.onKeywordClick).toHaveBeenCalledWith(mockCompetitor.keywords[0]);
    });
  });

  describe("keyword limit", () => {
    it("should show +N more indicator when keywords exceed 10", () => {
      const manyKeywords = Array.from({ length: 15 }, (_, i) => ({
        keyword: `keyword ${i}`,
        competitorPosition: i + 1,
        yourPosition: i + 5,
      }));

      render(
        <CompetitorCard
          {...defaultProps}
          competitor={{ ...mockCompetitor, keywords: manyKeywords, totalKeywords: 15 }}
        />
      );

      expect(screen.getByText("+5 more keywords")).toBeInTheDocument();
    });
  });

  describe("isGaining indicator", () => {
    it("should show Stable badge when isGaining is false", () => {
      render(
        <CompetitorCard
          {...defaultProps}
          competitor={{ ...mockCompetitor, isGaining: false }}
        />
      );

      expect(screen.getByText("Stable")).toBeInTheDocument();
    });

    it("should not show status badge when isGaining is undefined", () => {
      render(
        <CompetitorCard
          {...defaultProps}
          competitor={{ ...mockCompetitor, isGaining: undefined }}
        />
      );

      expect(screen.queryByText("Gaining")).not.toBeInTheDocument();
      expect(screen.queryByText("Stable")).not.toBeInTheDocument();
    });
  });

  describe("ozon marketplace", () => {
    it("should show Ozon badge for ozon marketplace", () => {
      render(
        <CompetitorCard
          {...defaultProps}
          competitor={{ ...mockCompetitor, marketplace: "ozon" }}
        />
      );

      expect(screen.getByText("Ozon")).toBeInTheDocument();
    });
  });
});
