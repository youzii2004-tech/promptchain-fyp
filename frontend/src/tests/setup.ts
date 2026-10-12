import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver for React Flow and Monaco
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

// Mock DOMMatrix for React Flow
vi.stubGlobal('DOMMatrixReadOnly', vi.fn().mockImplementation(() => ({
  m11: 1, m12: 0, m13: 0, m14: 0,
  m21: 0, m22: 1, m23: 0, m24: 0,
  m31: 0, m32: 0, m33: 1, m34: 0,
  m41: 0, m42: 0, m43: 0, m44: 1,
  multiply: vi.fn(),
  inverse: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
})));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Canvas API for Recharts/SVG
HTMLCanvasElement.prototype.getContext = vi.fn();
