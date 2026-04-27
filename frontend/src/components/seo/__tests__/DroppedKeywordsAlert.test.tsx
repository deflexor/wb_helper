import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DroppedKeywordsAlert } from "../DroppedKeywordsAlert";

// =============================================================================
// TEST SETUP
// =============================================================================

const mockKeywords = [
  {
    id: "1",
    keyword: "wireless headphones",
    previousPosition: 5,
    currentPosition: 25,
    droppedDate: "2024-03-10",
    status: "active" as const,
    article: "WB-12345",
    marketplace: "wildberries" as const,
    recoveryAttempts: 0,
  },
  {
    id: "2",
    keyword: "bluetooth speaker",
    previousPosition: 3,
    currentPosition: 12,
    droppedDate: "2024-03-12",
    status: "recovering" as const,
    article: "WB-67890",
    marketplace: "ozon" as const,
    recoveryAttempts: 2,
  },
  {
    id: "3",
    keyword: "gaming mouse",
    previousPosition: 8,
    currentPosition: 15,
    droppedDate: "2024-03-14",
    status: "lost" as const,
    article: "WB-11111",
    marketplace: "wildberries" as const,
    recoveryAttempts: 5,
  },
  {
    id: "4",
    keyword: "mechanical keyboard",
    previousPosition: 6,
    currentPosition: 10,
    droppedDate: "2024-03-15",
    status: "active" as const,
    marketplace: "ozon" as const,
  },
];

const defaultProps = {
  keywords: mockKeywords,
  isLoading: false,
  onRecoverClick: vi.fn(),
  onDismissClick: vi.fn(),
};

// =============================================================================
// TESTS
// =============================================================================

describe("DroppedKeywordsAlert component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the card with correct title", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      expect(screen.getByText("Dropped Keywords")).toBeInTheDocument();
    });

    it("should display total keyword count", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      expect(screen.getByText("4 total")).toBeInTheDocument();
    });

    it("should show severity indicators", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      // wireless headphones dropped 20 positions (critical)
      // bluetooth speaker dropped 9 positions (moderate)
      // gaming mouse dropped 7 positions (moderate)
      // mechanical keyboard dropped 4 positions (mild)
      expect(screen.getByText("1")).toBeInTheDocument(); // critical count
      expect(screen.getAllByText("2").length).toBeGreaterThan(0); // moderate count
    });

    it("should display all dropped keywords", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      expect(screen.getByText("wireless headphones")).toBeInTheDocument();
      expect(screen.getByText("bluetooth speaker")).toBeInTheDocument();
      expect(screen.getByText("gaming mouse")).toBeInTheDocument();
      expect(screen.getByText("mechanical keyboard")).toBeInTheDocument();
    });

    it("should show status badges", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Recovering").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Lost").length).toBeGreaterThan(0);
    });

    it("should show marketplace badges", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      // Multiple WB badges for wildberries keywords
      expect(screen.getAllByText("WB").length).toBeGreaterThan(0);
      // Ozon badges
      expect(screen.getByText("Ozon")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show skeleton when isLoading is true", () => {
      render(<DroppedKeywordsAlert {...defaultProps} isLoading={true} />);

      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it("should not show keywords when loading", () => {
      render(<DroppedKeywordsAlert {...defaultProps} isLoading={true} />);

      expect(screen.queryByText("wireless headphones")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no dropped keywords", () => {
      render(<DroppedKeywordsAlert {...defaultProps} keywords={[]} />);

      expect(screen.getByText("No dropped keywords. Great job!")).toBeInTheDocument();
    });

    it("should not show severity counts when empty", () => {
      render(<DroppedKeywordsAlert {...defaultProps} keywords={[]} />);

      expect(screen.queryByText("0 total")).not.toBeInTheDocument();
    });
  });

  describe("expandable details", () => {
    it("should expand details when clicking Show details", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      const showDetailsButton = screen.getAllByText("Show details")[0];
      fireEvent.click(showDetailsButton);

      expect(screen.getByText("Hide details")).toBeInTheDocument();
    });

    it("should show article ID when expanded", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      const showDetailsButton = screen.getAllByText("Show details")[0];
      fireEvent.click(showDetailsButton);

      expect(screen.getByText("Article ID")).toBeInTheDocument();
      expect(screen.getByText("WB-12345")).toBeInTheDocument();
    });

    it("should collapse details when clicking Hide details", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      const showDetailsButton = screen.getAllByText("Show details")[0];
      fireEvent.click(showDetailsButton);
      fireEvent.click(screen.getByText("Hide details"));

      expect(screen.getByText("Show details")).toBeInTheDocument();
    });
  });

  describe("recover button", () => {
    it("should show Recover button in expanded view", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      const showDetailsButton = screen.getAllByText("Show details")[0];
      fireEvent.click(showDetailsButton);

      const recoverButtons = screen.getAllByRole("button", { name: /Recover/i });
      expect(recoverButtons.length).toBeGreaterThan(0);
    });

    it("should call onRecoverClick when Recover is clicked", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      const showDetailsButton = screen.getAllByText("Show details")[0];
      fireEvent.click(showDetailsButton);

      const recoverButton = screen.getAllByRole("button", { name: /Recover/i })[0];
      fireEvent.click(recoverButton);

      expect(defaultProps.onRecoverClick).toHaveBeenCalled();
    });

    it("should disable Recover button for recovering keywords", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      const showDetailsButton = screen.getAllByText("Show details")[1];
      fireEvent.click(showDetailsButton);

      // First expanded card is for bluetooth speaker (recovering)
      // Its recover button should be disabled
      expect(screen.getAllByRole("button", { name: /Recover/i })[0]).toBeDisabled();
    });
  });

  describe("dismiss button", () => {
    it("should call onDismissClick when dismiss button is clicked", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      const dismissButtons = screen.getAllByRole("button", { name: "" }); // X buttons
      fireEvent.click(dismissButtons[0]);

      expect(defaultProps.onDismissClick).toHaveBeenCalledWith(mockKeywords[0]);
    });
  });

  describe("severity sorting", () => {
    it("should sort critical keywords first", () => {
      render(<DroppedKeywordsAlert {...defaultProps} />);

      // First keyword displayed should be the most critical (wireless headphones - dropped 20 positions)
      const firstKeyword = screen.getAllByRole("button", { name: /Show details/i })[0]
        .closest(".rounded-lg")
        ?.querySelector(".font-medium");
      expect(firstKeyword?.textContent).toBe("wireless headphones");
    });
  });
});
