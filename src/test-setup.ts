import '@angular/compiler';
import '@angular/localize/init';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// Polyfill IntersectionObserver in JSDOM
if (typeof globalThis !== 'undefined') {
  (globalThis as any).IntersectionObserver = class {
    root = null;
    rootMargin = '';
    thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

// Ensure relative fetch calls in Node resolve to test host
const originalFetch = globalThis.fetch;
if (originalFetch) {
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = `http://localhost:4200${input}`;
    }
    return originalFetch(input, init);
  };
}

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true } }
);
