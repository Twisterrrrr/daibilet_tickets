import {
  CreditCard,
  FileText,
  Mail,
  Scale,
  Shield,
  Cookie,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Правовая информация — Дайбилет',
  description:
    'Возврат билетов, рассылка, персональные данные, cookie, правообладателям, способы оплаты, реквизиты и контакты',
};

const NAV_ITEMS = [
  { id: 'refunds', label: 'Возврат билетов', icon: FileText },
  { id: 'newsletter', label: 'Рассылка и согласие', icon: Mail },
  { id: 'partner-data', label: 'Данные партнёров', icon: Shield },
  { id: 'cookies', label: 'Cookie', icon: Cookie },
  { id: 'rightsholders', label: 'Правообладателям', icon: AlertCircle },
  { id: 'payments', label: 'Способы оплаты', icon: CreditCard },
  { id: 'contacts', label: 'Реквизиты и контакты', icon: Scale },
] as const;

export default function LegalPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900">Правовая информация</h1>
          <p className="mt-2 text-slate-600">
            Правила возврата, рассылки, cookie, способы оплаты и контакты
          </p>
        </div>

        {/* Навигация */}
        <nav className="mb-12 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Содержание</p>
          <ul className="flex flex-wrap gap-2">
            {NAV_ITEMS.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-white hover:text-primary-600"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="space-y-14">
          {/* 1. Возврат билетов */}
          <section id="refunds" className="scroll-mt-24">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <FileText className="h-5 w-5 text-primary-600" />
              1. Возврат билетов
            </h2>
            <div className="mt-4 space-y-3 text-slate-700">
              <p>
                Условия возврата зависят от правил организатора мероприятия и указаны на странице
                каждого события. Перед оплатой ознакомьтесь с ними.
              </p>
              <p>
                <strong>Общий порядок при возврате:</strong>
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Напишите на{' '}
                  <a href="mailto:info@daibilet.ru" className="text-primary-600 hover:underline">
                    info@daibilet.ru
                  </a>{' '}
                  или воспользуйтесь{' '}
                  <Link href="/help#contact" className="text-primary-600 hover:underline">
                    формой обратной связи
                  </Link>
                </li>
                <li>
                  Укажите код заказа (CS-XXXX) и причину возврата. Срок рассмотрения заявления — до{' '}
                  <strong>5 рабочих дней</strong>
                </li>
                <li>
                  Конкретные сроки и возможность возврата определяются правилами организатора,
                  указанными на странице события
                </li>
              </ul>
            </div>
          </section>

          {/* 2. Рассылка и согласие */}
          <section id="newsletter" className="scroll-mt-24">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Mail className="h-5 w-5 text-primary-600" />
              2. Рассылка и согласие на рекламную информацию
            </h2>
            <div className="mt-4 space-y-3 text-slate-700">
              <p>
                Мы не отправляем рекламные рассылки без явного согласия. Если вы хотите получать
                новости и спецпредложения от Дайбилет — при регистрации или оформлении заказа
                отметьте отдельный чекбокс (не предустановленный галочкой):
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <strong>«Я согласен получать новости и спецпредложения от Daibilet.ru»</strong>
              </p>
              <p>
                Без этого согласия информационные рассылки не осуществляются в соответствии с
                законом «О рекламе» и 152-ФЗ «О персональных данных».
              </p>
            </div>
          </section>

          {/* 3. Данные партнёров */}
          <section id="partner-data" className="scroll-mt-24">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Shield className="h-5 w-5 text-primary-600" />
              3. Обработка персональных данных партнёров
            </h2>
            <div className="mt-4 space-y-3 text-slate-700">
              <p>
                При регистрации в качестве партнёра мы можем запрашивать паспортные данные, сканы
                учредительных документов и иные персональные данные. Они обрабатываются исключительно
                для заключения и исполнения договора, проверки контрагента и соответствия требованиям
                законодательства.
              </p>
              <p>
                Подробности — в{' '}
                <Link href="/offer" className="text-primary-600 hover:underline">
                  Договоре-оферте для партнёров
                </Link>
                . При необходимости выпускается отдельное приложение «Политика обработки персональных
                данных контрагентов».
              </p>
            </div>
          </section>

          {/* 4. Cookie */}
          <section id="cookies" className="scroll-mt-24">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Cookie className="h-5 w-5 text-primary-600" />
              4. Использование cookie
            </h2>
            <div className="mt-4 space-y-3 text-slate-700">
              <p>
                Сайт использует файлы cookie для аутентификации, персонализации, сбора статистики
                посещаемости (Яндекс.Метрика, Google Analytics) и обеспечения безопасности. При
                первом посещении вы можете принять использование cookie через баннер.
              </p>
              <p>
                Полное описание — в{' '}
                <Link href="/privacy#cookies" className="text-primary-600 hover:underline">
                  Политике конфиденциальности
                </Link>
                , раздел 7.
              </p>
            </div>
          </section>

          {/* 5. Правообладателям */}
          <section id="rightsholders" className="scroll-mt-24">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <AlertCircle className="h-5 w-5 text-primary-600" />
              5. Правообладателям (жалобы и заявления)
            </h2>
            <div className="mt-4 space-y-3 text-slate-700">
              <p>
                Дайбилет уважает интеллектуальную собственность. Партнёры размещают на сайте тексты
                и фотографии своих мероприятий. Если вы обнаружили контент, размещённый без вашего
                согласия:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Напишите на{' '}
                  <a href="mailto:legal@daibilet.ru" className="text-primary-600 hover:underline">
                    legal@daibilet.ru
                  </a>{' '}
                  или воспользуйтесь формой обратной связи с темой «Нарушение авторских прав»
                </li>
                <li>
                  Укажите ссылку на спорный материал, доказательства права на контент и контактные
                  данные
                </li>
                <li>
                  Мы обязуемся рассмотреть заявку в разумные сроки (как правило, до 10 рабочих дней)
                  и удалить незаконно размещённый контент
                </li>
              </ul>
            </div>
          </section>

          {/* 6. Способы оплаты */}
          <section id="payments" className="scroll-mt-24">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <CreditCard className="h-5 w-5 text-primary-600" />
              6. Способы оплаты
            </h2>
            <div className="mt-4 space-y-3 text-slate-700">
              <p>
                Оплата осуществляется через защищённые платёжные системы. Доступные способы зависят
                от организатора и типа билета:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Банковские карты: Visa, Mastercard, МИР</li>
                <li>СБП (Система быстрых платежей)</li>
                <li>Специфика каждой платёжной системы описана на странице оформления заказа</li>
              </ul>
              <p>
                При оплате на daibilet.ru применяются платёжные сервисы АО «ТБанк», ЮKassa и др.
                Данные карт не хранятся на нашем сайте и обрабатываются оператором платежей.
              </p>
            </div>
          </section>

          {/* 7. Реквизиты и контакты */}
          <section id="contacts" className="scroll-mt-24">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Scale className="h-5 w-5 text-primary-600" />
              7. Реквизиты и контакты
            </h2>
            <div className="mt-4 space-y-3 text-slate-700">
              <p>
                <strong>Оператор сайта:</strong> Дайбилет (daibilet.ru)
              </p>
              <p>
                Полные реквизиты — на странице{' '}
                <Link href="/requisites" className="text-primary-600 hover:underline">
                  Реквизиты
                </Link>
              </p>
              <p>
                <strong>Поддержка:</strong>{' '}
                <a href="mailto:info@daibilet.ru" className="text-primary-600 hover:underline">
                  info@daibilet.ru
                </a>
              </p>
              <p>
                <Link href="/privacy" className="text-primary-600 hover:underline">
                  Политика конфиденциальности
                </Link>
                {' · '}
                <Link href="/offer" className="text-primary-600 hover:underline">
                  Оферта для партнёров
                </Link>
              </p>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
