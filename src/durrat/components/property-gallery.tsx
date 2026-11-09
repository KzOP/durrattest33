import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Lang } from '@/durrat/lib/i18n';

export function PropertyGallery({ images, title, lang, compact = false, onOpen }: {
  images: string[]; title: string; lang: Lang; compact?: boolean; onOpen?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const position = index < images.length ? index : 0;
  const en = lang === 'en';
  const move = (delta: number) => setIndex((position + delta + images.length) % images.length);
  const image = images[position] || '/images/image.png';
  return <div className={`property-gallery ${compact ? 'gallery-compact' : 'gallery-detail'}`}>
    <div className="gallery-stage" onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)} onTouchEnd={(event) => {
      const end = event.changedTouches[0]?.clientX;
      if (touchStart !== null && end !== undefined && Math.abs(end - touchStart) > 40 && images.length > 1) move(end < touchStart ? 1 : -1);
      setTouchStart(null);
    }}>
      {onOpen ? <Button variant="ghost" className="gallery-open" onClick={onOpen} aria-label={en ? `View ${title}` : `معاينة ${title}`}><img src={image} alt={`${title} — ${position + 1}`} /><span className="gallery-eye"><Eye size={18} /></span></Button> : <img src={image} alt={`${title} — ${position + 1}`} />}
      {images.length > 1 && <><Button variant="ghost" size="icon" className="gallery-arrow gallery-prev" onClick={() => move(-1)} title={en ? 'Previous photo' : 'الصورة السابقة'} aria-label={en ? 'Previous photo' : 'الصورة السابقة'}><ChevronLeft size={20} /></Button><Button variant="ghost" size="icon" className="gallery-arrow gallery-next" onClick={() => move(1)} title={en ? 'Next photo' : 'الصورة التالية'} aria-label={en ? 'Next photo' : 'الصورة التالية'}><ChevronRight size={20} /></Button><span className="gallery-counter" dir="ltr" aria-live="polite">{position + 1} / {images.length}</span></>}
    </div>
    {!compact && images.length > 1 && <div className="gallery-thumbnails">{images.map((src, photoIndex) => <Button variant="ghost" key={src} className={position === photoIndex ? 'gallery-thumb active' : 'gallery-thumb'} onClick={() => setIndex(photoIndex)} aria-label={en ? `Photo ${photoIndex + 1}` : `الصورة ${photoIndex + 1}`} aria-pressed={position === photoIndex}><img src={src} alt="" /></Button>)}</div>}
  </div>;
}