/** Read legacy and current photo fields without losing the selected facade. */
export function propertyImages(property: Record<string, unknown>): string[] {
  const collect = (value: unknown): string[] => {
    if (typeof value === 'string') return /^(https?:\/\/|data:image\/)/i.test(value) ? [value] : [];
    if (Array.isArray(value)) return value.flatMap(collect);
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return collect(record.url ?? record.src ?? record.imageUrl ?? record.downloadURL);
    }
    return [];
  };
  return [...new Set([
    ...collect(property.facade_image), ...collect(property.main_image), ...collect(property.cover_image),
    ...collect(property.images), ...collect(property.photos),
    ...collect(property.image), ...collect(property.imageUrl), ...collect(property.image_url),
    ...collect(property.imageURL), ...collect(property.imageUrls), ...collect(property.photo),
    ...collect(property.picture), ...collect(property.banner), ...collect(property.thumbnail), ...collect(property.media),
  ])];
}

export function facadeFirst(images: string[], index: number): string[] {
  const facade = images[index];
  return facade ? [facade, ...images.filter((_, position) => position !== index)] : images;
}