import { Building, FileText, Image, Scale, Check } from 'lucide-react';
import { PartnerApplicationForm } from './PartnerApplicationForm';

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
              Начните продавать с Дайбилет
            </h2>
            <p className="text-slate-600 mb-10 leading-relaxed">
              Оставьте заявку — мы подберём оптимальный формат
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
            <PartnerApplicationForm />
          </div>
        </div>
      </div>
    </section>
  );
}
