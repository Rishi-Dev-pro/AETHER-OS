/**
 * Checks if a point (x, y) falls inside a DOMRect boundary.
 */
export function isPointInRect(x: number, y: number, rect: DOMRect): boolean {
  return (
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom
  );
}

/**
 * Resolves the hovered element from a point (windowX, windowY) and the registered elements.
 * Employs z-index sorting to prioritize topmost overlapping controls.
 */
export function performHitTest(
  windowX: number,
  windowY: number,
  elements: Map<string, HTMLElement>
): string | null {
  let matchedId: string | null = null;
  let maxZIndex = -Infinity;

  for (const [id, element] of elements.entries()) {
    // Verify element is still in DOM and visible
    if (!element.isConnected) continue;
    
    const rect = element.getBoundingClientRect();
    
    // Ignore collapsed elements
    if (rect.width === 0 || rect.height === 0) continue;

    if (isPointInRect(windowX, windowY, rect)) {
      // Fetch computed z-index
      const computedStyle = window.getComputedStyle(element);
      const zVal = computedStyle.zIndex;
      const zIndex = zVal === "auto" ? 0 : (parseInt(zVal, 10) || 0);

      // Select element with highest z-index
      if (zIndex > maxZIndex) {
        maxZIndex = zIndex;
        matchedId = id;
      } else if (zIndex === maxZIndex) {
        // Fallback: If z-index matches, pick the one registered later (or deeper in DOM)
        matchedId = id;
      }
    }
  }

  return matchedId;
}
