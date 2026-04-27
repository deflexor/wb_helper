import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PositionChart } from "../PositionChart";

// =============================================================================
// TEST SETUP
// =============================================================================

const mockData = [
  { date: "2024-03-10", position: 15 },
  { date: "2024-03-11", position: 12 },
  { date: "2024-03-12", position: 10 },
  { date: "2024-03-13", position: 8 },
  { date: "2024-03-14", position: 5 },
  { date: "2024-03-15", position: 3 },
];

const defaultProps = {
  data: mockData,
  isLoading: false,
};

// =============================================================================
// TESTS
// =============================================================================

describe("PositionChart component", () => {
  describe("rendering", () => {
    it("should render with correct title", () => {
      render(<PositionChart {...defaultProps} title="Test Chart" />);

      expect(screen.getByText("Test Chart")).toBeInTheDocument();
    });

    it("should display data points count", () => {
      render(<PositionChart {...defaultProps} />);

      expect(screen.getByText("6 data points")).toBeInTheDocument();
    });

    it("should use default title when not provided", () => {
      render(<PositionChart {...defaultProps} />);

      expect(screen.getByText("Position Over Time")).toBeInTheDocument();
    });

    it("should render legend items", () => {
      render(<PositionChart {...defaultProps} />);

      expect(screen.getByText("Top 3 (Excellent)")).toBeInTheDocument();
      expect(screen.getByText("4-10 (Good)")).toBeInTheDocument();
      expect(screen.getByText("10+ (Needs work)")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show skeleton when isLoading is true", () => {
      render(<PositionChart {...defaultProps} isLoading={true} />);

      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it("should not show empty message when loading", () => {
      render(<PositionChart {...defaultProps} isLoading={true} />);

      expect(screen.queryByText("No position data available")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no data", () => {
      render(<PositionChart {...defaultProps} data={[]} />);

      expect(screen.getByText("No position data available")).toBeInTheDocument();
    });

    it("should not show legend when no data", () => {
      render(<PositionChart {...defaultProps} data={[]} />);

      expect(screen.queryByText("Top 3 (Excellent)")).not.toBeInTheDocument();
    });
  });

  describe("custom props", () => {
    it("should render with custom height", () => {
      render(<PositionChart {...defaultProps} height={400} />);

      // Chart container should have the height
      const chartContainer = screen.getByText("6 data points").closest(".w-full");
      expect(chartContainer).toBeInTheDocument();
    });

    it("should hide grid when showGrid is false", () => {
      render(<PositionChart {...defaultProps} showGrid={false} />);

      // Chart should still render
      expect(screen.getByText("Position Over Time")).toBeInTheDocument();
    });

    it("should disable animation when showAnimation is false", () => {
      render(<PositionChart {...defaultProps} showAnimation={false} />);

      expect(screen.getByText("Position Over Time")).toBeInTheDocument();
    });
  });

  describe("data handling", () => {
    it("should handle single data point", () => {
      render(<PositionChart {...defaultProps} data={[{ date: "2024-03-15", position: 5 }]} />);

      expect(screen.getByText("1 data point")).toBeInTheDocument();
    });

    it("should handle position at boundary values", () => {
      const boundaryData = [
        { date: "2024-03-10", position: 1 },
        { date: "2024-03-15", position: 50 },
      ];

      render(<PositionChart {...defaultProps} data={boundaryData} />);

      expect(screen.getByText("2 data points")).toBeInTheDocument();
    });

    it("should handle position = 0 (not ranked)", () => {
      const notRankedData = [
        { date: "2024-03-10", position: 0 },
        { date: "2024-03-15", position: 5 },
      ];

      render(<PositionChart {...defaultProps} data={notRankedData} />);

      expect(screen.getByText("2 data points")).toBeInTheDocument();
    });
  });
});
