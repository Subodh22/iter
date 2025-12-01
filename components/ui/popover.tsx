"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
  contentRef: React.RefObject<HTMLDivElement>;
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined);

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Popover = ({ children, open: controlledOpen, onOpenChange }: PopoverProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [controlledOpen, onOpenChange]
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        open &&
        contentRef.current &&
        !contentRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, setOpen]);

  React.useEffect(() => {
    if (open && triggerRef.current && contentRef.current) {
      const updatePosition = () => {
        if (triggerRef.current && contentRef.current) {
          const triggerRect = triggerRef.current.getBoundingClientRect();
          
          // First, make it visible to get dimensions, but off-screen
          contentRef.current.style.visibility = "hidden";
          contentRef.current.style.position = "fixed";
          contentRef.current.style.display = "block";
          
          // Force a reflow to get dimensions
          void contentRef.current.offsetWidth;
          
          const contentRect = contentRef.current.getBoundingClientRect();
          const align = contentRef.current.getAttribute("data-align") || "start";
          
          // Position below the trigger
          let top = triggerRect.bottom + 4;
          let left = triggerRect.left;
          
          // Handle alignment
          if (align === "end") {
            left = triggerRect.right - contentRect.width;
          } else if (align === "center") {
            left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
          } else {
            // start (default)
            left = triggerRect.left;
          }
          
          // Ensure it doesn't go off screen horizontally
          const padding = 8;
          if (left < padding) left = padding;
          if (left + contentRect.width > window.innerWidth - padding) {
            left = window.innerWidth - contentRect.width - padding;
          }
          
          // Check if there's space below, if not, position above
          if (top + contentRect.height > window.innerHeight - padding) {
            top = triggerRect.top - contentRect.height - 4;
            // Don't go above viewport
            if (top < padding) {
              top = padding;
            }
          }
          
          contentRef.current.style.top = `${top}px`;
          contentRef.current.style.left = `${left}px`;
          contentRef.current.style.visibility = "visible";
        }
      };

      // Use requestAnimationFrame to ensure DOM is ready
      const rafId = requestAnimationFrame(() => {
        updatePosition();
      });
      
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [open]);

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      {children}
    </PopoverContext.Provider>
  );
};

const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  const context = React.useContext(PopoverContext);
  if (!context) throw new Error("PopoverTrigger must be used within Popover");

  const handleClick = () => {
    context.setOpen(!context.open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: (node: HTMLElement) => {
        context.triggerRef.current = node;
        if (typeof ref === "function") {
          ref(node as HTMLButtonElement);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLButtonElement>).current = node as HTMLButtonElement;
        }
      },
      onClick: handleClick,
    });
  }

  return (
    <button
      ref={(node) => {
        if (node) {
          context.triggerRef.current = node;
        }
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLButtonElement>).current = node!;
        }
      }}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
});
PopoverTrigger.displayName = "PopoverTrigger";

const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: "start" | "center" | "end";
    sideOffset?: number;
  }
>(({ className, align = "center", sideOffset = 4, children, ...props }, ref) => {
  const context = React.useContext(PopoverContext);
  if (!context) throw new Error("PopoverContent must be used within Popover");

  const contentRef = React.useCallback(
    (node: HTMLDivElement) => {
      context.contentRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement>).current = node;
      }
    },
    [context, ref]
  );

  if (!context.open) return null;

  // Render in a portal to avoid positioning issues
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      ref={contentRef}
      data-align={align}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
});
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
