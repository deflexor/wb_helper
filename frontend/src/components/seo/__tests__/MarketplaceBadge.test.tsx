import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MarketplaceBadge } from "../MarketplaceBadge";

// =============================================================================
// TESTS
// =============================================================================

describe("MarketplaceBadge component", () => {
  describe("wildberries marketplace", () => {
    it("should render WB label", () => {
      render(<MarketplaceBadge marketplace="wildberries" />);

      expect(screen.getByText("WB")).toBeInTheDocument();
    });

    it("should have correct styling for wildberries", () => {
      render(<MarketplaceBadge marketplace="wildberries" />);

      // Get the span that contains the badge text and has the background class
      const badge = document.querySelector(".bg-blue-950");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("text-blue-400");
      expect(badge).toHaveClass("border-blue-800");
    });
  });

  describe("ozon marketplace", () => {
    it("should render Ozon label", () => {
      render(<MarketplaceBadge marketplace="ozon" />);

      expect(screen.getByText("Ozon")).toBeInTheDocument();
    });

    it("should have correct styling for ozon", () => {
      render(<MarketplaceBadge marketplace="ozon" />);

      // Get the span that contains the badge text and has the background class
      const badge = document.querySelector(".bg-red-950");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("text-red-400");
      expect(badge).toHaveClass("border-red-800");
    });
  });

  describe("size variants", () => {
    it("should render small size", () => {
      render(<MarketplaceBadge marketplace="wildberries" size="sm" />);

      const badge = document.querySelector(".bg-blue-950");
      expect(badge).toHaveClass("text-[10px]");
    });

    it("should render medium size (default)", () => {
      render(<MarketplaceBadge marketplace="wildberries" size="md" />);

      const badge = document.querySelector(".bg-blue-950");
      expect(badge).toHaveClass("text-xs");
    });

    it("should render large size", () => {
      render(<MarketplaceBadge marketplace="wildberries" size="lg" />);

      const badge = document.querySelector(".bg-blue-950");
      expect(badge).toHaveClass("text-sm");
    });
  });

  describe("showLabel prop", () => {
    it("should show label by default", () => {
      render(<MarketplaceBadge marketplace="wildberries" />);

      expect(screen.getByText("WB")).toBeInTheDocument();
    });

    it("should hide label when showLabel is false", () => {
      render(<MarketplaceBadge marketplace="wildberries" showLabel={false} />);

      expect(screen.queryByText("WB")).not.toBeInTheDocument();
    });

    it("should still render badge container when showLabel is false", () => {
      render(<MarketplaceBadge marketplace="wildberries" showLabel={false} />);

      // Badge should still be rendered, just without the text label
      const badge = document.querySelector(".bg-blue-950");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("icons", () => {
    it("should render ShoppingBag icon for wildberries", () => {
      render(<MarketplaceBadge marketplace="wildberries" />);

      // ShoppingBag icon should be present (lucide-react icon)
      const svgElements = document.querySelectorAll("svg");
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it("should render Store icon for ozon", () => {
      render(<MarketplaceBadge marketplace="ozon" />);

      // Store icon should be present (lucide-react icon)
      const svgElements = document.querySelectorAll("svg");
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      render(<MarketplaceBadge marketplace="wildberries" className="custom-class" />);

      const badge = document.querySelector(".custom-class");
      expect(badge).toBeInTheDocument();
    });
  });
});
