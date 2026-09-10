/** Поля профиля как в Taneesh B2C (`UpdateUserProfile`). */

export const PURPOSE_TYPES = [
  { id: 1, label: 'Отношения', emoji: '❤️' },
  { id: 2, label: 'Свидания', emoji: '☕️' },
  { id: 3, label: 'Дружба', emoji: '🤝' },
  { id: 4, label: 'Компания', emoji: '🎟️' },
  { id: 5, label: 'Общение', emoji: '🧠' },
  { id: 6, label: 'Афиша', emoji: '👀' }
];

export const WORLD_VIEWS = [
  { id: 1, label: 'Буддизм' },
  { id: 2, label: 'Иудаизм' },
  { id: 3, label: 'Индуизм' },
  { id: 4, label: 'Ислам' },
  { id: 5, label: 'Католицизм' },
  { id: 6, label: 'Конфуцианство' },
  { id: 7, label: 'Православие' },
  { id: 8, label: 'Протестантизм' },
  { id: 9, label: 'Агностицизм' },
  { id: 10, label: 'Атеизм' },
  { id: 11, label: 'Деизм' }
];

export const ZODIAC_SIGNS = [
  { id: 1, label: 'Овен' },
  { id: 2, label: 'Телец' },
  { id: 3, label: 'Близнецы' },
  { id: 4, label: 'Рак' },
  { id: 5, label: 'Лев' },
  { id: 6, label: 'Дева' },
  { id: 7, label: 'Весы' },
  { id: 8, label: 'Скорпион' },
  { id: 9, label: 'Стрелец' },
  { id: 10, label: 'Козерог' },
  { id: 11, label: 'Водолей' },
  { id: 12, label: 'Рыбы' }
];

export const EDUCATION_LEVELS = [
  { id: 1, label: 'Среднее' },
  { id: 2, label: 'Высшее' },
  { id: 3, label: 'Кандидат / Доктор наук' }
];

export const CHILDREN_STATUS = [
  { id: 1, label: 'Детей нет' },
  { id: 2, label: 'Планирую детей' },
  { id: 3, label: 'Уже есть' }
];

export const ATTITUDES = [
  { id: 1, label: 'Резко негативное' },
  { id: 2, label: 'Нейтральное' },
  { id: 3, label: 'Положительное' }
];

/** Демо-каталог интересов (в Taneesh приходит с API). */
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

function pickLabel(list, id) {
  return list.find(item => item.id === Number(id))?.label || '';
}

export function purposeLabel(purposeType) {
  const item = PURPOSE_TYPES.find(entry => entry.id === Number(purposeType));
  if (!item) return '';
  return `${item.emoji} ${item.label}`.trim();
}

export function interestsOf(profile) {
  return profile?.interests || profile?.tags || [];
}

/** Строки блока «Основное» — как в Taneesh profile_edit. */
export function basicRowsFromProfile(profile = {}) {
  const rows = [];
  if (profile.city) rows.push({ key: 'city', label: 'Город', value: profile.city });
  if (profile.height) rows.push({ key: 'height', label: 'Рост', value: `${profile.height} см` });
  const world = pickLabel(WORLD_VIEWS, profile.worldView);
  if (world) rows.push({ key: 'worldView', label: 'Мировоззрение', value: world });
  const zodiac = pickLabel(ZODIAC_SIGNS, profile.zodiacSign);
  if (zodiac) rows.push({ key: 'zodiacSign', label: 'Знак зодиака', value: zodiac });
  const education = pickLabel(EDUCATION_LEVELS, profile.education);
  if (education) rows.push({ key: 'education', label: 'Образование', value: education });
  const children = pickLabel(CHILDREN_STATUS, profile.hasChildren);
  if (children) rows.push({ key: 'hasChildren', label: 'Дети', value: children });
  const alcohol = pickLabel(ATTITUDES, profile.alcoholAttitude);
  if (alcohol) rows.push({ key: 'alcoholAttitude', label: 'Алкоголь', value: alcohol });
  const smoking = pickLabel(ATTITUDES, profile.smokingAttitude);
  if (smoking) rows.push({ key: 'smokingAttitude', label: 'Курение', value: smoking });
  const languages = Array.isArray(profile.languages) ? profile.languages.filter(Boolean) : [];
  if (languages.length) rows.push({ key: 'languages', label: 'Языки', value: languages.join(', ') });
  return rows;
}
