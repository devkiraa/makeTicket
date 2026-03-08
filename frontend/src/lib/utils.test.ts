import { cn } from './utils';

describe('Utils', () => {
  describe('cn()', () => {
    it('merges tailwind classes correctly', () => {
      // Assuming cn uses clsx and tailwind-merge under the hood
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
    });

    it('handles conditional classes', () => {
      expect(cn('bg-red-500', true && 'text-white', false && 'p-4')).toBe('bg-red-500 text-white');
    });

    it('resolves tailwind conflicts correctly', () => {
      // p-4 should be overridden by p-8
      expect(cn('p-4 bg-red-500', 'p-8')).toBe('bg-red-500 p-8');
    });

    it('handles arrays and objects', () => {
        expect(cn(['text-sm', 'font-bold'])).toBe('text-sm font-bold');
        expect(cn({ 'bg-blue-500': true, 'text-red-500': false })).toBe('bg-blue-500');
    });
  });
});
