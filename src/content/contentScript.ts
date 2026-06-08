import { PageExtractor } from './pageExtractor';
import { QuizDetectorService } from '../features/quiz/QuizDetectorService';
import type { RuntimeMessage } from '../types';

const extractor = new PageExtractor();
const detector = new QuizDetectorService();

const extractPayload = () => ({
  pageContext: extractor.extract(document),
  questions: detector.detectFromDocument(document)
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  if (message.type === 'STUDYPILOT_EXTRACT_PAGE') {
    sendResponse(extractPayload());
    return true;
  }

  return false;
});

let updateTimer: number | undefined;
const observer = new MutationObserver(() => {
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(() => {
    chrome.runtime.sendMessage({
      type: 'STUDYPILOT_PAGE_UPDATED',
      payload: extractPayload()
    } satisfies RuntimeMessage);
  }, 800);
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true
});
