import type { Metadata } from 'next';

import { HeroSection } from './HeroSection';
import { FormatsSection } from './FormatsSection';
import { BenefitsSection } from './BenefitsSection';
import { EconomicsSection } from './EconomicsSection';
import { FeaturesSection } from './FeaturesSection';
import { ReportingSection } from './ReportingSection';
import { ContactSection } from './ContactSection';

export const metadata: Metadata = {
  title: 'Варианты сотрудничества с Дайбилет',
  description: 'Выберите модель сотрудничества, подходящую вашему бизнесу',
};

export default function PartnerPage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FormatsSection />
      <BenefitsSection />
      <EconomicsSection />
      <FeaturesSection />
      <ReportingSection />
      <ContactSection />

      <footer className="py-8 bg-primary-600 text-white/70 text-center text-sm">
        <div className="container-page">
          © {new Date().getFullYear()} Дайбилет — агрегатор экскурсий, мероприятий и музеев
        </div>
      </footer>
    </main>
  );
}
