/**
 * Поля Yaqin.
 * В Taneesh перетекают только: bio, interests, languages (+ имя/возраст/фото).
 * Локально в Yaqin: looking, media, work, соцссылки — не уходят в Taneesh.
 */

export const INTEREST_OPTIONS = [
  'искусство',
  'дизайн',
  'фотография',
  'музыка',
  'концерты',
  'театр',
  'кино',
  'сериалы',
  'книги',
  'подкасты',
  'кофе',
  'еда',
  'выпечка',
  'рестораны',
  'йога',
  'пилатес',
  'фитнес',
  'бег',
  'плавание',
  'танцы',
  'спорт',
  'велосипед',
  'путешествия',
  'прогулки',
  'горы',
  'кемпинг',
  'животные',
  'собаки',
  'кошки',
  'мода',
  'шопинг',
  'красота',
  'психология',
  'саморазвитие',
  'языки',
  'учёба',
  'стартапы',
  'бизнес',
  'технологии',
  'игры',
  'настолки',
  'волонтёрство',
  'мероприятия',
  'нетворкинг',
  'семья',
  'дети'
];

export const LOOKING_OPTIONS = [
  'кофе',
  'прогулки',
  'ужины',
  'завтраки',
  'кино',
  'концерты',
  'выставки',
  'мастер-классы',
  'книжный клуб',
  'спорт вместе',
  'йога',
  'тренировки',
  'путешествия',
  'выходные',
  'нетворкинг',
  'новые знакомства',
  'глубокие разговоры',
  'юмор',
  'совместные проекты',
  'волонтёрство',
  'фотопрогулки',
  'шопинг',
  'кафе и бары',
  'пикники'
];

export const MEDIA_OPTIONS = [
  'подкасты',
  'сериалы',
  'кино',
  'артхаус',
  'документалки',
  'плейлисты',
  'книги',
  'манга',
  'комиксы',
  'YouTube',
  'TikTok',
  'аудиокниги',
  'блоги',
  'новости',
  'лекции',
  'стендап',
  'аниме',
  'реалити'
];

export const LANGUAGE_OPTIONS = [
  'русский',
  'узбекский',
  'английский',
  'турецкий',
  'корейский',
  'китайский',
  'японский',
  'французский',
  'немецкий',
  'испанский',
  'арабский',
  'казахский',
  'таджикский',
  'персидский',
  'хинди',
  'итальянский'
];

/** Пресеты работы — удобный выбор + своё значение. */
export const WORK_OPTIONS = [
  'Дизайнер',
  'UX/UI дизайнер',
  'Маркетолог',
  'SMM',
  'Контент-креатор',
  'Фотограф',
  'Видеограф',
  'Журналист',
  'Редактор',
  'Учитель',
  'Преподаватель',
  'Студентка',
  'Разработчик',
  'Продакт-менеджер',
  'Менеджер проектов',
  'Предприниматель',
  'HR',
  'Рекрутер',
  'Психолог',
  'Врач',
  'Медсестра',
  'Юрист',
  'Бухгалтер',
  'Финансист',
  'Аналитик',
  'Архитектор',
  'Инженер',
  'Стилист',
  'Визажист',
  'Фитнес-тренер',
  'Йога-инструктор',
  'Повар',
  'Бармен',
  'Официант',
  'Продавец',
  'Администратор',
  'Ассистент',
  'Фрилансер',
  'В декрете',
  'Ищу себя'
];

export const FIELD_LIMITS = {
  interests: 12,
  looking: 8,
  media: 6,
  languages: 5
};

export const CHIP_SHEETS = {
  interests: {
    title: 'Интересы',
    hint: 'Выберите то, что вас описывает',
    options: INTEREST_OPTIONS,
    max: FIELD_LIMITS.interests
  },
  looking: {
    title: 'Чего хочу',
    hint: 'Чем хотите заниматься вместе',
    options: LOOKING_OPTIONS,
    max: FIELD_LIMITS.looking
  },
  media: {
    title: 'Сейчас смотрю / читаю',
    hint: 'Лёгкий повод начать разговор',
    options: MEDIA_OPTIONS,
    max: FIELD_LIMITS.media
  },
  languages: {
    title: 'Языки',
    hint: 'На каких языках вам удобно общаться',
    options: LANGUAGE_OPTIONS,
    max: FIELD_LIMITS.languages
  }
};

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

export function filterOptions(options, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return options;
  return options.filter(item => item.toLowerCase().includes(q));
}
