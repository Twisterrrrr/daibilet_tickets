import {
  Building2,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  HelpCircle,
  Mail,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ContactForm } from '@/components/ui/ContactForm';

export const metadata: Metadata = {
  title: 'Помощь — Дайбилет',
  description:
    'Ответы на частые вопросы: покупка билетов, возвраты, статусы заказов, как получить билет, льготы и другие вопросы.',
};

// ─── FAQ Data ─────────────────────────────────────

interface FaqItem {
  q: string;
  a: string;
}

interface FaqCategory {
  id: string;
  icon: string;
  title: string;
  items: FaqItem[];
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'tickets',
    icon: 'ticket',
    title: 'Покупка билетов',
    items: [
      {
        q: 'Как купить билет?',
        a: 'Выберите мероприятие или музей, нажмите «Купить билет». В зависимости от типа билета вы будете перенаправлены на сайт оператора или сможете оформить заявку прямо на нашем сайте. Электронный билет придёт на указанный email.',
      },
      {
        q: 'Какие способы оплаты доступны?',
        a: 'Способ оплаты зависит от поставщика билетов. Большинство операторов принимают банковские карты (Visa, Mastercard, МИР), а также оплату через СБП. Конкретные способы указаны на странице оформления.',
      },
      {
        q: 'Нужна ли регистрация для покупки?',
        a: 'Нет, регистрация не требуется. Для оформления заказа достаточно указать имя и email — на него придёт электронный билет.',
      },
      {
        q: 'Как получить билет после покупки?',
        a: 'Электронный билет отправляется на указанный при покупке email сразу после подтверждения оплаты. Если билет не пришёл в течение 15 минут — проверьте папку «Спам» или воспользуйтесь формой «Проверить статус заказа» ниже.',
      },
      {
        q: 'Можно ли купить билет на месте?',
        a: 'Мы продаём только электронные билеты онлайн. Покупка на месте зависит от конкретного музея или мероприятия — рекомендуем покупать заранее, чтобы избежать очередей.',
      },
    ],
  },
  {
    id: 'orders',
    icon: 'calendar',
    title: 'Статус заказа',
    items: [
      {
        q: 'Как проверить статус заказа?',
        a: 'Перейдите на страницу отслеживания заказа и введите код заказа (формат CS-XXXX) или email, указанный при покупке. Вы увидите текущий статус и все этапы обработки.',
      },
      {
        q: 'Что означают статусы заказа?',
        a: 'Создан — заказ оформлен, ожидает подтверждения. Подтверждён — заказ принят, билет отправлен. Отклонён — оператор не смог подтвердить (полный возврат). Истёк — заказ не был подтверждён в срок. Завершён — визит состоялся.',
      },
      {
        q: 'Сколько ждать подтверждения заявки?',
        a: 'Стандартное время подтверждения — до 30 минут для заказов через корзину и до 24 часов для быстрых заявок. Если заказ не подтверждён в срок — он автоматически отменяется без списания средств.',
      },
      {
        q: 'Не пришёл email с билетом, что делать?',
        a: 'Проверьте папку «Спам» и «Промоакции» в вашей почте. Если билет так и не нашёлся — отправьте нам запрос через форму обратной связи с указанием email и кода заказа, мы отправим билет повторно.',
      },
    ],
  },
  {
    id: 'refunds',
    icon: 'refund',
    title: 'Возвраты и отмены',
    items: [
      {
        q: 'Можно ли вернуть билет?',
        a: 'Да, возврат возможен в соответствии с правилами конкретного мероприятия или музея. Обычно возврат доступен не позднее чем за 24 часа до начала. Для билетов с «открытой датой» — в течение 30 дней с момента покупки.',
      },
      {
        q: 'Как оформить возврат?',
        a: 'Если билет куплен через перенаправление на сайт оператора — возврат оформляется на сайте оператора. Если через нашу заявку — отправьте запрос через форму обратной связи с кодом заказа.',
      },
      {
        q: 'Через сколько вернутся деньги?',
        a: 'Срок возврата зависит от оператора и банка. Обычно деньги возвращаются в течение 3–10 рабочих дней на карту, с которой была произведена оплата.',
      },
      {
        q: 'Что будет, если мероприятие отменено?',
        a: 'При отмене мероприятия по инициативе организатора вам полагается полный возврат. Мы автоматически отправим уведомление на email с инструкцией по возврату.',
      },
    ],
  },
  {
    id: 'venues',
    icon: 'building',
    title: 'Музеи и места',
    items: [
      {
        q: 'Что такое билет с «открытой датой»?',
        a: 'Билет с открытой датой не привязан к конкретному сеансу. Вы можете посетить музей в любой рабочий день в течение срока действия билета (обычно 30–90 дней). Удобно, если точная дата визита неизвестна.',
      },
      {
        q: 'Актуальны ли часы работы на сайте?',
        a: 'Мы стараемся поддерживать данные в актуальном состоянии, но рекомендуем проверять часы работы на официальном сайте музея, особенно в праздничные дни.',
      },
      {
        q: 'Есть ли льготные билеты?',
        a: 'Наличие льгот зависит от конкретного музея. Большинство государственных музеев предоставляют бесплатный вход для детей до 14–18 лет, студентов и пенсионеров. Информация о льготах указана на странице музея.',
      },
      {
        q: 'Можно ли пройти без очереди?',
        a: 'Многие электронные билеты дают право на вход без очереди через отдельный вход. Ищите бейдж «Без очереди» на карточке билета.',
      },
    ],
  },
  {
    id: 'security',
    icon: 'shield',
    title: 'Безопасность и данные',
    items: [
      {
        q: 'Безопасно ли покупать билеты на вашем сайте?',
        a: 'Да. Мы не храним данные банковских карт — все платежи проходят через защищённые платёжные системы операторов. Соединение защищено SSL-шифрованием.',
      },
      {
        q: 'Как вы используете мои данные?',
        a: 'Мы используем email и имя только для оформления заказа и отправки билета. Мы не передаём ваши данные третьим лицам для маркетинговых целей. Подробнее — в Политике конфиденциальности.',
      },
      {
        q: 'Можно ли удалить мои данные?',
        a: 'Да, вы можете запросить удаление персональных данных, отправив запрос через форму обратной связи. Мы обработаем запрос в течение 30 дней согласно 152-ФЗ.',
      },
    ],
  },
];

// ─── Icon Component ───────────────────────────────

function CategoryIcon({ name }: { name: string }) {
  const cls = 'h-5 w-5';
  switch (name) {
    case 'ticket':
      return <Ticket className={cls} />;
    case 'calendar':
      return <CalendarCheck className={cls} />;
    case 'refund':
      return <RotateCcw className={cls} />;
    case 'building':
      return <Building2 className={cls} />;
    case 'shield':
      return <ShieldCheck className={cls} />;
    default:
      return <HelpCircle className={cls} />;
  }
}

// ─── Page ─────────────────────────────────────────

export default function HelpPage() {
  // All FAQs for JSON-LD
  const allFaqs = FAQ_CATEGORIES.flatMap((cat) => cat.items);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            <HelpCircle className="h-4 w-4" />
            Центр помощи
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Как мы можем помочь?</h1>
          <p className="mt-3 text-lg text-slate-600">
            Ответы на частые вопросы о билетах, заказах, возвратах и работе сервиса
          </p>
        </div>
      </section>

      {/* Quick actions */}
      <section className="max-w-4xl mx-auto px-4 -mt-6 md:-mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="#check-order"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900">Проверить заказ</p>
              <p className="text-xs text-slate-500">По коду или email</p>
            </div>
          </Link>
          <Link
            href="#refunds"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900">Оформить возврат</p>
              <p className="text-xs text-slate-500">Инструкция</p>
            </div>
          </Link>
          <Link
            href="#contact"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900">Написать нам</p>
              <p className="text-xs text-slate-500">Форма обратной связи</p>
            </div>
          </Link>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <div className="space-y-10">
          {FAQ_CATEGORIES.map((category) => (
            <div key={category.id} id={category.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <CategoryIcon name={category.icon} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{category.title}</h2>
              </div>
              <div className="space-y-2">
                {category.items.map((item, i) => (
                  <details
                    key={i}
                    className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none select-none">
                      <span className="font-medium text-sm text-slate-900 pr-4">{item.q}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Check Order */}
      <section id="check-order" className="bg-slate-50 py-12">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Проверить статус заказа</h2>
          <p className="text-sm text-slate-600 mb-6">
            Введите код заказа (формат CS-XXXX) — вы найдёте его в email-подтверждении
          </p>
          <form action="/orders/track" method="GET" className="flex gap-2 max-w-sm mx-auto">
            <input
              type="text"
              name="code"
              placeholder="CS-XXXX"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
            <button
              type="submit"
              className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              Найти
            </button>
          </form>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-12 md:py-16">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">Не нашли ответ?</h2>
          <p className="text-sm text-slate-600 mb-6 text-center">
            Отправьте нам сообщение — мы ответим в течение 24 часов
          </p>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
