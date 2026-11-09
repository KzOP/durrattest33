import { afterEach, describe, expect, it, vi } from 'vitest';
import { deliverListing, listingImageUrls } from '@/durrat/server/telegram-notify';

afterEach(() => vi.unstubAllGlobals());
describe('Telegram album delivery', () => {
  const images: [string, string] = ['https://example.com/facade.jpg', 'https://example.com/room.jpg'];
  const caption = 'property';
  it('sends multiple images as an album with the caption only on the facade', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await deliverListing('test-token', '@test', images, caption);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/sendMediaGroup');
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body);
    expect(body.media).toEqual([{ type: 'photo', media: images[0], caption, parse_mode: 'HTML' }, { type: 'photo', media: images[1] }]);
  });
  it('sends up to 39 real images in valid groups and captions only the first cover', async () => {
    const photos = Array.from({ length: 39 }, (_, index) => `https://example.com/photo-${index + 1}.jpg`);
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await deliverListing('test-token', '@test', photos, caption);

    const albums = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body).media);
    expect(albums.map((album: unknown[]) => album.length)).toEqual([10, 10, 10, 9]);
    expect(albums.flat().map((item: { media: string }) => item.media)).toEqual(photos);
    expect(albums[0][0]).toMatchObject({ media: photos[0], caption, parse_mode: 'HTML' });
    expect(albums.flat().slice(1).every((item: { caption?: string }) => !item.caption)).toBe(true);
  });
  it('falls back to the facade photo when the album fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ ok: false })).mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await deliverListing('test-token', '@test', images, caption)).ok).toBe(true);
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/sendPhoto');
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1].body).photo).toBe(images[0]);
  });
  it('falls back to text if album and photo both fail', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ ok: false })).mockResolvedValueOnce(Response.json({ ok: false })).mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await deliverListing('test-token', '@test', images, caption)).ok).toBe(true);
    expect(fetchMock.mock.calls[2]?.[0]).toContain('/sendMessage');
  });
  it('sends a single image without attempting an album', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await deliverListing('test-token', '@test', [images[0]], caption);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/sendPhoto');
  });
  it('reads Firestore facade and both photo arrays in facade-first order', () => {
    expect(listingImageUrls({ facade_image: { stringValue: images[0] }, photos: { arrayValue: { values: [{ stringValue: images[1] }] } }, images: { arrayValue: { values: [{ stringValue: images[0] }] } } })).toEqual(images);
  });
  it('does not add the default logo when real listing images exist', () => {
    expect(listingImageUrls({ facade_image: { stringValue: images[0] }, images: { arrayValue: { values: [{ stringValue: images[1] }] } } })).toEqual(images);
  });
});