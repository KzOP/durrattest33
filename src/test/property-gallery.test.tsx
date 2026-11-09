import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PropertyGallery } from '@/durrat/components/property-gallery';

describe('property gallery browsing', () => {
  it('starts at the facade, navigates every photo and wraps back', () => {
    render(<PropertyGallery images={['https://example.com/facade.jpg', 'https://example.com/room.jpg', 'https://example.com/kitchen.jpg']} title="Property" lang="en" />);
    expect(screen.getByAltText('Property — 1').getAttribute('src')).toBe('https://example.com/facade.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByAltText('Property — 2').getAttribute('src')).toBe('https://example.com/room.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByAltText('Property — 3').getAttribute('src')).toBe('https://example.com/kitchen.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByAltText('Property — 1').getAttribute('src')).toBe('https://example.com/facade.jpg');
  });
});