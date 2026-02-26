import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkScrollPosition = () => {
      // Check window scroll
      const windowScroll = window.scrollY;
      
      // Check main element scroll
      const mainElement = document.querySelector("main");
      const mainScroll = mainElement?.scrollTop || 0;
      
      // Show button if either scroll position is > 300px
      if (windowScroll > 300 || mainScroll > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Initial check
    checkScrollPosition();

    // Listen for scroll events on window
    window.addEventListener("scroll", checkScrollPosition, { passive: true });

    // Listen for scroll events on main element
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.addEventListener("scroll", checkScrollPosition, { passive: true });
    }

    // Also check periodically for dynamically loaded content
    const interval = setInterval(checkScrollPosition, 500);

    return () => {
      window.removeEventListener("scroll", checkScrollPosition);
      if (mainElement) {
        mainElement.removeEventListener("scroll", checkScrollPosition);
      }
      clearInterval(interval);
    };
  }, []);

  const scrollToTop = () => {
    // Try scrolling the main element first (most common case)
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
    // Also scroll window as fallback
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Button
      onClick={scrollToTop}
      className={cn(
        "fixed top-[calc(4rem+1rem)] right-4 z-50 rounded-full w-12 h-12 p-0 shadow-lg transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
      size="icon"
      variant="default"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" />
    </Button>
  );
}

