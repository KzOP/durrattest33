import { propertyImages } from '@/durrat/lib/property-images';

type FirestoreValue = {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type FirestoreDocument = {
  fields?: Record<string, FirestoreValue>;
};

type RentPeriod = 'monthly' | 'annual' | 'two_installments';

const TELEGRAM_CAPTION_LIMIT = 1024;
const MAX_TELEGRAM_IMAGES = 39;
const TELEGRAM_MEDIA_GROUP_LIMIT = 10;

const RENT_CHAT_ID = '@DurratAlHijraRealEstateOffice';
const SALE_CHAT_ID = '@DurratAlHijraRealEstateOffice11';
const DEFAULT_IMAGE = 'https://kommodo.ai/i/HyR58SlhDKy8AyuOuI8O';

type TelegramTarget = { botToken: string; chatId: string };

function telegramTargetFor(isRent: boolean): TelegramTarget {
  const env = process.env;
  const shared = (env.TELEGRAM_BOT_TOKEN || '').trim();
  const botToken = (isRent ? env.TELEGRAM_RENT_BOT_TOKEN : env.TELEGRAM_SALE_BOT_TOKEN)?.trim() || shared;
  return { botToken, chatId: isRent ? RENT_CHAT_ID : SALE_CHAT_ID };
}

function stringField(fields: Record<string, FirestoreValue>, name: string) {
  const value = fields[name]?.stringValue;
  return typeof value === 'string' ? value : '';
}

function firstTextField(fields: Record<string, FirestoreValue>, names: string[]) {
  for (const name of names) {
    const value = fields[name];
    if (typeof value?.stringValue === 'string' && value.stringValue.trim()) {
      return value.stringValue.trim();
    }
    if (typeof value?.integerValue === 'string') return value.integerValue;
    if (typeof value?.doubleValue === 'number' && Number.isFinite(value.doubleValue)) {
      return String(value.doubleValue);
    }
  }
  return '';
}

function numberField(fields: Record<string, FirestoreValue>, name: string) {
  const value = fields[name];
  const number = value?.doubleValue ?? Number(value?.integerValue);
  return Number.isFinite(number) ? number : 0;
}

function formatNumericText(value: string) {
  const number = Number(value);
  return value.trim() && Number.isFinite(number)
    ? new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(number)
    : value;
}

function normalizedLabel(value: string) {
  return value.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي');
}

function isRentLabel(value: string) {
  return /(?:^|[^a-z])(?:rent|rental|lease)(?:$|[^a-z])|(?:ايجار|استئجار|شهري|شهر|سنوي|سنة)/i.test(normalizedLabel(value));
}

function rentPeriodFromFields(fields: Record<string, FirestoreValue>): RentPeriod {
  const value = stringField(fields, 'rent_period');
  if (value === 'monthly' || value === 'annual' || value === 'two_installments') return value;
  return 'annual';
}

function isRentListing(fields: Record<string, FirestoreValue>) {
  const exact = stringField(fields, 'listing_type').trim().toLowerCase();
  if (exact === 'rent') return true;
  if (exact === 'sale') return false;
  const listingFields = ['listing_type', 'listingType', 'subType', 'offerType', 'offer_type'];
  const values = listingFields.map((name) => stringField(fields, name).trim()).filter(Boolean);
  const recognized = values.find((value) => isRentLabel(value));
  if (recognized) return true;
  return values.some((value) => /شهري|شهر|سنوي|سنة/i.test(normalizedLabel(value)));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] ?? character;
  });
}

function limitText(value: string, maxCharacters: number) {
  return Array.from(value.trim()).slice(0, maxCharacters).join('');
}

function isHttpsUrl(value: string) {
  if (!value || value.length > 2048) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function decodeField(value: FirestoreValue): unknown {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decodeField);
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [key, decodeField(item)]));
  return null;
}

export function listingImageUrls(fields: Record<string, FirestoreValue>): string[] {
  const extracted: string[] = [];

  // 1. محاولة استخدام الدالة المساعدة الأصلية
  try {
    const originalUrls = propertyImages(Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeField(value)])));
    if (Array.isArray(originalUrls)) {
      for (const u of originalUrls) {
        if (typeof u === 'string' && isHttpsUrl(u) && !u.includes('durrattest23.vercel.app')) {
          extracted.push(u);
        }
      }
    }
  } catch {}

  // 2. فحص يدوي لكل الحقول المحتملة في Firestore لضمان عدم ضياع أي صورة
  const possibleKeys = ['images', 'photos', 'image_urls', 'image_url', 'image', 'cover_image', 'gallery', 'property_images'];
  for (const key of possibleKeys) {
    const val = fields[key];
    if (!val) continue;
    const decoded = decodeField(val);
    if (typeof decoded === 'string' && isHttpsUrl(decoded)) {
      if (!extracted.includes(decoded)) extracted.push(decoded);
    } else if (Array.isArray(decoded)) {
      for (const item of decoded) {
        if (typeof item === 'string' && isHttpsUrl(item)) {
          if (!extracted.includes(item)) extracted.push(item);
        } else if (item && typeof item === 'object' && 'url' in item && typeof (item as any).url === 'string' && isHttpsUrl((item as any).url)) {
          if (!extracted.includes((item as any).url)) extracted.push((item as any).url);
        }
      }
    }
  }

  const uniqueValid = Array.from(new Set(extracted)).filter(url => isHttpsUrl(url) && !url.includes('durrattest23.vercel.app'));
  return uniqueValid.length > 0 ? uniqueValid.slice(0, MAX_TELEGRAM_IMAGES) : [DEFAULT_IMAGE];
}

function parseBody(body: unknown): Record<string, unknown> | null {
  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) as unknown : body;
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

type TelegramResult = { ok: boolean; error?: string };

async function sendTelegram(botToken: string, method: string, payload: Record<string, unknown>): Promise<TelegramResult> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as { ok?: boolean; description?: string };
    if (response.ok && result.ok === true) return { ok: true };
    const error = `${method}: ${result.description || `HTTP ${response.status}`}`;
    console.error('Telegram error', error);
    return { ok: false, error };
  } catch (err) {
    const error = `${method}: ${String(err)}`;
    console.error('Telegram fetch failed', error);
    return { ok: false, error };
  }
}

function normalizeChatId(value: string) {
  const id = value.trim();
  if (!id) return id;
  return /^(@|-?\d)/.test(id) ? id : `@${id}`;
}

function splitMediaGroups(images: string[]) {
  const groups: string[][] = [];
  let offset = 0;
  while (offset < images.length) {
    const remaining = images.length - offset;
    const size = remaining > TELEGRAM_MEDIA_GROUP_LIMIT && remaining - TELEGRAM_MEDIA_GROUP_LIMIT === 1
      ? TELEGRAM_MEDIA_GROUP_LIMIT - 1
      : Math.min(TELEGRAM_MEDIA_GROUP_LIMIT, remaining);
    groups.push(images.slice(offset, offset + size));
    offset += size;
  }
  return groups;
}

export function buildMessage(fields: Record<string, FirestoreValue>, propertyId: string, appUrl: string) {
  const text = (keys: string[], limit = 80) => escapeHtml(limitText(firstTextField(fields, keys), limit));
  const numeric = (keys: string[]) => escapeHtml(formatNumericText(firstTextField(fields, keys) || '0'));
  const propertyType = text(['property_type'], 60) || 'عقار';
  const isRent = isRentListing(fields);
  const period = rentPeriodFromFields(fields);
  const staffName = text(['publisher_name', 'created_by_name']) || 'غير محدد';
  const phone = text(['publisher_phone', 'contact_phone', 'created_by_phone']);
  const condition = stringField(fields, 'condition') || stringField(fields, 'property_condition');
  const conditionText = ['new', 'جديدة', 'جديد'].includes(condition) ? 'جديدة'
    : ['used', 'مستعملة', 'مستعمل'].includes(condition) ? 'مستعملة' : '';
  const price = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(numberField(fields, 'price'));
  const payment = text(['payment_method']) || (isRent ? period === 'two_installments' ? 'على دفعتين' : period === 'monthly' ? 'شهرياً' : 'سنوياً' : '');
  const insurance = numberField(fields, 'insurance_amount');
  const laundry = fields.has_laundry?.booleanValue === true || numberField(fields, 'laundry_rooms') > 0;
  const location = [text(['district'], 60), text(['street'], 100), text(['notes', 'description'], 240)].filter(Boolean).join(' - ');
  return [
    `${propertyType} ${isRent ? 'للإيجار' : 'للبيع'}`,
    conditionText,
    `رقم الإعلان: ${numeric(['serial_number'])}`,
    `المسؤول عن الإعلان: ${staffName}`,
    `الدور: ${numeric(['floor_number', 'floor'])} — ${fields.has_elevator?.booleanValue === true ? 'يوجد مصعد' : 'لا يوجد مصعد'}`,
    `عدد الغرف: ${numeric(['rooms', 'bedrooms', 'bedroom_count'])}`,
    `عدد الصالات: ${numeric(['lounges', 'living_rooms', 'halls'])}`,
    `عدد دورات المياه: ${numeric(['bathrooms', 'bathroom_count', 'baths'])}`,
    `المطبخ: ${numeric(['kitchens', 'kitchen_count'])}`,
    laundry ? 'غرفة الغسيل: يوجد' : '',
    '',
    `المطلوب: ${price} ر.س${payment ? ` ${payment}` : ''}`,
    ...(insurance > 0 ? [`مبلغ التأمين: ${new Intl.NumberFormat('ar-SA').format(insurance)} ر.س`] : []),
    `الموقع: (${location || text(['city'], 60)})`,
    '',
    'الموظف المسؤول عن الإعلان:',
    `للتواصل ${staffName}: ${phone || 'غير متوفر'}`,
    `<a href="${escapeHtml(`${appUrl}/?property=${encodeURIComponent(propertyId)}`)}">معاينة العقار على الموقع</a>`,
  ].filter((line, index) => line !== '' || index === 10 || index >= 13).join('\n');
}

export async function deliverListing(botToken: string, chatId: string, images: string[], message: string) {
  const errors: string[] = [];
  const orderedImages = images.length > 0 ? images : [DEFAULT_IMAGE];
  const parsedLength = message.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|#39);/g, 'x').length;
  const captionFits = parsedLength <= TELEGRAM_CAPTION_LIMIT;
  const caption = captionFits ? message : undefined;

  if (orderedImages.length > 1) {
    let albumFailed = false;
    for (const [groupIndex, group] of splitMediaGroups(orderedImages).entries()) {
      const album = await sendTelegram(botToken, 'sendMediaGroup', {
        chat_id: chatId,
        media: group.map((media, index) => ({
          type: 'photo',
          media,
          ...(groupIndex === 0 && index === 0 && caption ? { caption, parse_mode: 'HTML' } : {}),
        })),
      });
      if (!album.ok) {
        if (album.error) errors.push(album.error);
        albumFailed = true;
        break;
      }
    }
    if (!albumFailed && captionFits) return { ok: true, method: 'sendMediaGroup', errors };
    if (!albumFailed) {
      const text = await sendTelegram(botToken, 'sendMessage', { chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true });
      return { ok: text.ok, method: 'sendMediaGroup', errors: text.error ? [text.error] : errors };
    }
  }

  const photo = await sendTelegram(botToken, 'sendPhoto', { chat_id: chatId, photo: orderedImages[0] || DEFAULT_IMAGE, ...(caption ? { caption, parse_mode: 'HTML' } : {}) });
  if (photo.ok && captionFits) return { ok: true, method: 'sendPhoto', errors };
  if (photo.error) errors.push(photo.error);

  const text = await sendTelegram(botToken, 'sendMessage', { chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true });
  if (text.error) errors.push(text.error);
  return { ok: text.ok, method: 'sendMessage', errors };
}

const FIREBASE_PROJECT_ID = 'durratalhijarh';

export async function handleTelegramNotify(request: Request): Promise<Response> {
  const json = (data: unknown, status = 200) => Response.json(data, { status });
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
  const body = parseBody(await request.text());
  const propertyId = body?.propertyId;
  if (typeof propertyId !== 'string' || !propertyId || propertyId.length > 128) {
    return json({ error: 'Invalid property ID' }, 400);
  }
  const projectId = process.env.FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID;
  try {
    const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const propertyResponse = await fetch(`${firestoreBase}/properties/${encodeURIComponent(propertyId)}`, {
      headers: { Authorization: authHeader },
    });
    if (propertyResponse.status === 401 || propertyResponse.status === 403) return json({ error: 'Unauthorized' }, 401);
    let fields: Record<string, FirestoreValue> = {};
    if (propertyResponse.ok) {
      fields = ((await propertyResponse.json()) as FirestoreDocument).fields ?? {};
    } else {
      return json({ error: 'Property not found' }, 404);
    }
    const bodyListingType = body?.listingType;
    if (bodyListingType === 'rent' || bodyListingType === 'sale') fields.listing_type = { stringValue: bodyListingType };
    const bodyRentPeriod = body?.rentPeriod;
    if (!fields.rent_period && typeof bodyRentPeriod === 'string') fields.rent_period = { stringValue: bodyRentPeriod };

    const appUrl = new URL(request.url).origin;
    const message = buildMessage(fields, propertyId, appUrl);
    const images = listingImageUrls(fields);
    const isRent = isRentListing(fields);
    const target = telegramTargetFor(isRent);
    const channelType = isRent ? 'rent' : 'sale';
    if (!target.botToken) return json({ error: 'Telegram is not configured', channel: channelType }, 503);
    const chatId = normalizeChatId(target.chatId);
    const delivery = await deliverListing(target.botToken, chatId, images, message);
    if (!delivery.ok) return json({ error: 'Telegram rejected the message', channel: channelType, chatId, details: delivery.errors }, 502);
    return json({ sent: true, method: delivery.method, channel: channelType });
  } catch (err) {
    return json({ error: 'Notification service unavailable', details: String(err) }, 502);
  }
}
