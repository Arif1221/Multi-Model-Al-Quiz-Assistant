import type { PageContext } from '../types';
import { normalizeWhitespace, uniqueStrings } from '../utils/text';

const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS', 'IFRAME']);

const isVisible = (element: Element) => {
  const htmlElement = element as HTMLElement;
  const style = window.getComputedStyle(htmlElement);
  const rect = htmlElement.getBoundingClientRect();

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.width > 0 &&
    rect.height > 0
  );
};

export class PageExtractor {
  extract(documentRef: Document = document): PageContext {
    const headings = Array.from(documentRef.querySelectorAll('h1, h2, h3'))
      .filter(isVisible)
      .map((heading) => normalizeWhitespace(heading.textContent ?? ''))
      .filter(Boolean);

    const main =
      documentRef.querySelector('main') ??
      documentRef.querySelector('[role="main"]') ??
      documentRef.querySelector('article') ??
      documentRef.body;

    const visibleText = this.getVisibleText(documentRef.body);
    const mainContent = this.getVisibleText(main);

    return {
      url: documentRef.location.href,
      title: normalizeWhitespace(documentRef.title),
      headings: uniqueStrings(headings).slice(0, 20),
      visibleText: visibleText.slice(0, 50000),
      mainContent: mainContent.slice(0, 30000),
      extractedAt: new Date().toISOString()
    };
  }

  private getVisibleText(root: Element | null): string {
    if (!root) return '';

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent || IGNORED_TAGS.has(parent.tagName) || !isVisible(parent)) {
          return NodeFilter.FILTER_REJECT;
        }

        return normalizeWhitespace(node.textContent ?? '')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });

    const chunks: string[] = [];
    let current = walker.nextNode();
    while (current) {
      chunks.push(normalizeWhitespace(current.textContent ?? ''));
      current = walker.nextNode();
    }

    return normalizeWhitespace(chunks.join(' '));
  }
}
