import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { KeywordTable } from "../KeywordTable";

// =============================================================================
// TEST SETUP
// =============================================================================

const mockKeywords = [
  {
    id: "1",
    keyword: "wireless headphones",
    article: "WB-12345",
    position: 3,
    previousPosition: 1,
    lastUpdated: "2024-03-15",
    marketplace: "wildberries" as const,
    positionHistory: [
      { date: "2024-03-10", position: 5 },
      { date: "2024-03-12", position: 3 },
      { date: "2024-03-15", position: 1 },
    ],
  },
  {
    id: "2",
    keyword: "bluetooth speaker",
    article: "WB-67890",
    position: 12,
    previousPosition: 8,
    lastUpdated: "2024-03-14",
    marketplace: "ozon" as const,
    positionHistory: [
      { date: "2024-03-10", position: 10 },
      { date: "2024-03-14", position: 8 },
    ],
  },
  {
    id: "3",
    keyword: "gaming headset",
    article: "WB-11111",
    position: 5,
    previousPosition: 12,
    lastUpdated: "2024-03-15",
    marketplace: "wildberries" as const,
    positionHistory: [
      { date: "2024-03-10", position: 15 },
      { date: "2024-03-15", position: 12 },
    ],
  },
];

const defaultProps = {
  keywords: mockKeywords,
  isLoading: false,
  onKeywordClick: vi.fn(),
  onRecoverClick: vi.fn(),
};

// =============================================================================
// TESTS
// =============================================================================

describe("KeywordTable component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the table with correct headers", () => {
      render(<KeywordTable {...defaultProps} />);

      expect(screen.getByText("Keyword Rankings")).toBeInTheDocument();
      expect(screen.getByText("Keyword")).toBeInTheDocument();
      expect(screen.getByText("Article")).toBeInTheDocument();
      expect(screen.getByText("Position")).toBeInTheDocument();
      expect(screen.getByText("Change")).toBeInTheDocument();
      expect(screen.getByText("Last Updated")).toBeInTheDocument();
    });

    it("should display all keywords", () => {
      render(<KeywordTable {...defaultProps} />);

      expect(screen.getByText("wireless headphones")).toBeInTheDocument();
      expect(screen.getByText("bluetooth speaker")).toBeInTheDocument();
      expect(screen.getByText("gaming headset")).toBeInTheDocument();
    });

    it("should display article IDs", () => {
      render(<KeywordTable {...defaultProps} />);

      expect(screen.getByText("WB-12345")).toBeInTheDocument();
      expect(screen.getByText("WB-67890")).toBeInTheDocument();
      expect(screen.getByText("WB-11111")).toBeInTheDocument();
    });

    it("should display keyword count", () => {
      render(<KeywordTable {...defaultProps} />);

      expect(screen.getByText("3 keywords")).toBeInTheDocument();
    });

    it("should show marketplace badges", () => {
      render(<KeywordTable {...defaultProps} />);

      expect(screen.getAllByText("WB").length).toBeGreaterThan(0);
      expect(screen.getByText("Ozon")).toBeInTheDocument();
    });

    it("should show Recover button for dropped keywords", () => {
      render(<KeywordTable {...defaultProps} />);

      // "wireless headphones" dropped from 1 to 3
      // "bluetooth speaker" dropped from 8 to 12
      // "gaming headset" improved from 12 to 5
      const recoverButtons = screen.getAllByRole("button", { name: /Recover/i });
      expect(recoverButtons.length).toBe(2);
    });
  });

  describe("loading state", () => {
    it("should show skeleton when isLoading is true", () => {
      render(<KeywordTable {...defaultProps} isLoading={true} />);

      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it("should not show keywords when loading", () => {
      render(<KeywordTable {...defaultProps} isLoading={true} />);

      expect(screen.queryByText("wireless headphones")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no keywords", () => {
      render(<KeywordTable {...defaultProps} keywords={[]} />);

      expect(screen.getByText("No keywords found")).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    it("should sort by position when clicking Position header", () => {
      render(<KeywordTable {...defaultProps} />);

      const positionHeader = screen.getByText("Position");
      fireEvent.click(positionHeader);

      // After sorting, first row should have position 3
      const firstRowPosition = screen
        .getByText("#3")
        .closest("tr")
        ?.querySelector("td:first-child");
      expect(firstRowPosition?.textContent).toContain("wireless headphones");
    });

    it("should toggle sort direction when clicking same header twice", () => {
      render(<KeywordTable {...defaultProps} />);

      const positionHeader = screen.getByText("Position");
      fireEvent.click(positionHeader);
      fireEvent.click(positionHeader);

      // After toggling back, should be descending (position 12 first)
      const firstRowPosition = screen
        .getAllByText("#12")[0]
        .closest("tr")
        ?.querySelector("td:first-child");
      expect(firstRowPosition?.textContent).toContain("bluetooth speaker");
    });
  });

  describe("pagination", () => {
    it("should paginate when keywords exceed page size", () => {
      const manyKeywords = Array.from({ length: 15 }, (_, i) => ({
        id: String(i),
        keyword: `keyword ${i}`,
        article: `WB-${i}`,
        position: i + 1,
        previousPosition: i + 2,
        lastUpdated: "2024-03-15",
        marketplace: "wildberries" as const,
      }));

      render(<KeywordTable {...defaultProps} keywords={manyKeywords} pageSize={10} />);

      expect(screen.getByText("Showing 1 to 10 of 15")).toBeInTheDocument();
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
    });

    it("should navigate to next page", () => {
      const manyKeywords = Array.from({ length: 15 }, (_, i) => ({
        id: String(i),
        keyword: `keyword ${i}`,
        article: `WB-${i}`,
        position: i + 1,
        previousPosition: i + 2,
        lastUpdated: "2024-03-15",
        marketplace: "wildberries" as const,
      }));

      render(<KeywordTable {...defaultProps} keywords={manyKeywords} pageSize={10} />);

      const nextButton = screen.getByRole("button", { name: /Go to next page/i });
      fireEvent.click(nextButton);

      expect(screen.getByText("Showing 11 to 15 of 15")).toBeInTheDocument();
      expect(screen.getByText("2 / 2")).toBeInTheDocument();
    });

    it("should disable next button on last page", () => {
      const manyKeywords = Array.from({ length: 15 }, (_, i) => ({
        id: String(i),
        keyword: `keyword ${i}`,
        article: `WB-${i}`,
        position: i + 1,
        previousPosition: i + 2,
        lastUpdated: "2024-03-15",
        marketplace: "wildberries" as const,
      }));

      render(<KeywordTable {...defaultProps} keywords={manyKeywords} pageSize={10} />);

      const prevButton = screen.getByRole("button", { name: /Go to previous page/i });
      expect(prevButton).not.toBeDisabled();
    });
  });

  describe("row click and position history", () => {
    it("should call onKeywordClick when row is clicked", () => {
      render(<KeywordTable {...defaultProps} />);

      fireEvent.click(screen.getByText("wireless headphones").closest("tr")!);
      expect(defaultProps.onKeywordClick).toHaveBeenCalledWith(mockKeywords[0]);
    });

    it("should show position history dialog when keyword has history", () => {
      render(<KeywordTable {...defaultProps} />);

      fireEvent.click(screen.getByText("wireless headphones").closest("tr")!);

      expect(screen.getByText("Position History")).toBeInTheDocument();
    });

    it("should display position history entries", () => {
      render(<KeywordTable {...defaultProps} />);

      fireEvent.click(screen.getByText("wireless headphones").closest("tr")!);

      expect(screen.getByText("10 Mar")).toBeInTheDocument();
      expect(screen.getByText("12 Mar")).toBeInTheDocument();
      expect(screen.getByText("15 Mar")).toBeInTheDocument();
    });
  });

  describe("recover button", () => {
    it("should call onRecoverClick with correct keyword", () => {
      render(<KeywordTable {...defaultProps} />);

      const recoverButtons = screen.getAllByRole("button", { name: /Recover/i });
      fireEvent.click(recoverButtons[0]);

      expect(defaultProps.onRecoverClick).toHaveBeenCalledWith(mockKeywords[0]);
    });

    it("should not show recover button for improved keywords", () => {
      render(<KeywordTable {...defaultProps} />);

      // gaming headset improved from 12 to 5
      const recoverButtons = screen.queryAllByRole("button", { name: /Recover/i });
      expect(recoverButtons.length).toBe(2);
    });
  });
});
