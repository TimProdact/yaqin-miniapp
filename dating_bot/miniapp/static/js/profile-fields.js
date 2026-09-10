/**
 * Поля Yaqin.
 * В Taneesh перетекают только: bio, interests, languages (+ имя/возраст/фото).
 * Локально в Yaqin: looking, media, work, соцссылки — не уходят в Taneesh.
 */

export const INTEREST_OPTIONS = [
  'искусство',
  'музыка',
  'фотография',
  'театр',
  'фитнес',
  'йога',
  'бег',
  'плавание',
  'кино',
  'книги',
  'кофе',
  'еда',
  'путешествия',
  'прогулки',
  'дизайн',
  'спорт'
];

export const LANGUAGE_OPTIONS = [
  'русский',
  'узбекский',
  'английский',
  'турецкий',
  'корейский'
];

/** Только Yaqin — не маппится в Taneesh. */
export const LOOKING_OPTIONS = [
  'кофе',
  'прогулки',
  'мастер-классы',
  'книжный клуб',
  'спорт',
  'путешествия',
  'кино',
  'ужины'
];

export const MEDIA_OPTIONS = [
  'подкасты',
  'сериалы',
  'артхаус',
  'плейлисты',
  'книги'
];

export function interestsOf(profile) {
  return profile?.interests || profile?.tags || [];
}

export function lookingOf(profile) {
  return profile?.looking || [];
}

export function mediaOf(profile) {
  return profile?.media || [];
}

/** «Основное» для Yaqin: работа + языки. */
export function basicRowsFromProfile(profile = {}) {
  const rows = [];
  if (profile.work) rows.push({ key: 'work', label: 'Работа', value: profile.work });
  const languages = Array.isArray(profile.languages) ? profile.languages.filter(Boolean) : [];
  if (languages.length) rows.push({ key: 'languages', label: 'Языки', value: languages.join(', ') });
  return rows;
}
