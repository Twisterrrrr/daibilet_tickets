import { Building, FileText, Image, Scale, Check, ArrowRight } from 'lucide-react';

const PARTNER_PORTAL_URL = 'https://daibilet-supplier.lovable.app/';

const requirements = [
  { icon: Building, text: 'Юридическое лицо или ИП' },
  { icon: FileText, text: 'Актуальные реквизиты' },
  { icon: Image, text: 'Описание услуг и фото высокого качества' },
  { icon: Scale, text: 'Соблюдение законодательства РФ' },
];

const steps = [
  { num: '01', text: 'Заполните форму заявки' },
  { num: '02', text: 'Мы свяжемся в течение 1–2 рабочих дней' },
  { num: '03', text: 'Подпишем договор' },
  { num: '04', text: 'Настроим размещение и запустим продажи' },
];

export function ContactSection() {
  return (
    <section id="contact" className="py-24 bg-white">
      <div className="container-page">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Начните продавать с Daibilet
            </h2>
            <p className="text-slate-600 mb-10 leading-relaxed">
              Оставьте заявку через форму на партнёрском портале — мы подберём оптимальный формат
              сотрудничества для вашего бизнеса.
            </p>

            <div className="mb-10">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
                Как подключиться
              </h3>
              <div className="space-y-4">
                {steps.map((s) => (
                  <div key={s.num} className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center text-slate-900 font-bold text-sm shrink-0">
                      {s.num}
                    </span>
                    <span className="text-slate-900">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
                Требования к партнёрам
              </h3>
              <div className="space-y-3">
                {requirements.map((r) => (
                  <div key={r.text} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm text-slate-700">{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
                <p className="text-slate-600 mb-6">
                  Чтобы оставить заявку на партнёрство, перейдите на партнёрский портал Daibilet.
                </p>
                <a
                  href={PARTNER_PORTAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-lg gradient-gold text-slate-900 font-semibold text-lg shadow-gold hover:opacity-90 transition-opacity"
                >
                  Перейти на портал партнёров
                  <ArrowRight className="w-5 h-5" />
                </a>
                <p className="mt-4 text-sm text-slate-500 text-center">
                  Или{' '}
                  <a href="mailto:partner@daibilet.ru" className="text-primary-600 hover:underline">
                    напишите нам
                  </a>
                </p>
              </div>
          </div>
        </div>
      </div>
    </section>
  );
}
