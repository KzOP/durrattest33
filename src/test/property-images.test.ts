import { describe, expect, it } from 'vitest';
import { facadeFirst, propertyImages } from '@/durrat/lib/property-images';

describe('property photo ordering', () => {
  const facade = 'https://example.com/facade.jpg';
  const room = 'https://example.com/room.jpg';
  const kitchen = 'https://example.com/kitchen.jpg';
  it('combines every images/photos entry with the selected facade first', () => {
    expect(propertyImages({ facade_image: facade, images: [room, facade], photos: [{ url: kitchen }, room] })).toEqual([facade, room, kitchen]);
  });
  it('moves the employee-selected facade to the first slot without losing photos', () => {
    expect(facadeFirst([room, facade, kitchen], 1)).toEqual([facade, room, kitchen]);
  });
});