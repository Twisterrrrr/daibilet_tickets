'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  MapPin, Calendar, Users, Zap, ArrowRight, ArrowLeft, Loader2,
  Clock, Star, ChevronDown, ChevronUp, Shield, Sparkles, TrendingDown,
  Crown, Gift,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Intensity, INTENSITY_LABELS, formatPrice } from '@daibilet/shared';
import { trackPlannerStart, trackPlannerResult } from '@/lib/analytics';

type Step = 'city' | 'dates' | 'group' | 'intensity' | 'results';

// Визуальная конфигурация тиров
const TIER_STYLES: Record<string, {
  gradient: string; border: string; badge: string; badgeText: string;
  icon: any; accent: string; ring: string;
}> = {
  economy: {
    gradient: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    badgeText: 'Выгодно',
    icon: TrendingDown,
    accent: 'text-emerald-700',
    ring: 'ring-emerald-500',
  },
  optimal: {
    gradient: 'from-indigo-50 to-violet-50',
    border: 'border-indigo-300',
    badge: 'bg-indigo-600 text-white',
    badgeText: 'Рекомендуем',
    icon: Sparkles,
    accent: 'text-indigo-700',
    ring: 'ring-indigo-500',
  },
  premium: {
    gradient: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    badgeText: 'Лучшее',
    icon: Crown,
    accent: 'text-amber-700',
    ring: 'ring-amber-500',
  },
};

export default function PlannerPage() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>('city');
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form state
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [intensity, setIntensity] = useState<Intensity>(Intensity.NORMAL);

  // Results state
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [selectedUpsells, setSelectedUpsells] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getCities().then(setCities).catch((e) => { console.error('Planner error:', e); });
  }, []);

  useEffect(() => {
    setChildrenAges((prev) => {
      if (children > prev.length) return [...prev, ...Array(children - prev.length).fill(8)];
      return prev.slice(0, children);
    });
  }, [children]);

  const steps: { key: Step; label: string; icon: any }[] = [
    { key: 'city', label: 'Город', icon: MapPin },
    { key: 'dates', label: 'Даты', icon: Calendar },
    { key: 'group', label: 'Группа', icon: Users },
    { key: 'intensity', label: 'Темп', icon: Zap },
    { key: 'results', label: 'Программа', icon: ArrowRight },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const canProceed = () => {
    switch (step) {
      case 'city': return !!city;
      case 'dates': return !!dateFrom && !!dateTo && dateFrom <= dateTo;
      case 'group': return adults >= 1;
      case 'intensity': return true;
      default: return false;
    }
  };

  const nextStep = () => {
    const idx = currentStepIndex;
    if (idx < steps.length - 2) setStep(steps[idx + 1].key);
    else if (step === 'intensity') calculate();
  };
  const prevStep = () => {
    if (currentStepIndex > 0) setStep(steps[currentStepIndex - 1].key);
  };

  const toggleDay = (dayNum: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayNum)) next.delete(dayNum); else next.add(dayNum);
      return next;
    });
  };

  const toggleUpsell = (id: string) => {
    setSelectedUpsells(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const calculate = async () => {
    setStep('results');
    setLoading(true);
    setSelectedVariant(0);
    setExpandedDays(new Set());
    setSelectedUpsells(new Set());
    trackPlannerStart(city);
    try {
      const res = await api.calculatePlan({ city, dateFrom, dateTo, adults, children, childrenAges, intensity });
      setResult(res);
      // Auto-select optimal variant if it exists
      const optIdx = res.variants?.findIndex((v: any) => v.tier === 'optimal');
      if (optIdx >= 0) setSelectedVariant(optIdx);
      // Auto-expand all days if <= 3 days
      const dCount = res.variants?.[0]?.days?.length || 0;
      if (dCount <= 3) setExpandedDays(new Set(Array.from({ length: dCount }, (_, i) => i + 1)));
      trackPlannerResult(city, res.variants?.length || 0);
    } catch (e) {
      console.error('Planner error:', e);
      setResult({ error: true, message: 'Ошибка при подборе программы' });
    } finally {
      setLoading(false);
    }
  };

  const cityName = cities.find((c: any) => c.slug === city)?.name || city;
  const totalPersons = adults + children;

  // Upsell total
  const upsellTotal = result?.upsells
    ?.filter((u: any) => selectedUpsells.has(u.id))
    .reduce((s: number, u: any) => s + u.priceKopecks, 0) || 0;

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Планировщик поездки</h1>
        <p className="mt-2 text-slate-500">Укажите параметры — мы подберём идеальную программу</p>
      </div>

      {/* Progress */}
      <div className="mx-auto mb-10 max-w-xl">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i <= currentStepIndex ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                <s.icon className="h-4 w-4" />
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-2 h-0.5 w-8 sm:w-16 ${i < currentStepIndex ? 'bg-primary-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className={`mx-auto ${step === 'results' ? 'max-w-4xl' : 'max-w-lg'}`}>

        {/* ========== Step: City ========== */}
        {step === 'city' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Какой город посетить?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cities.map((c: any) => (
                <button key={c.slug} onClick={() => setCity(c.slug)}
                  className={`card flex items-center gap-3 p-4 text-left transition-all ${
                    city === c.slug ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'hover:border-slate-300'
                  }`}>
                  <MapPin className={`h-5 w-5 ${city === c.slug ? 'text-primary-600' : 'text-slate-400'}`} />
                  <span className={`font-medium ${city === c.slug ? 'text-primary-700' : 'text-slate-700'}`}>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========== Step: Dates ========== */}
        {step === 'dates' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Когда планируете поездку?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Дата приезда</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Дата отъезда</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
            </div>
            {dateFrom && dateTo && dateFrom <= dateTo && (
              <p className="text-sm text-slate-500">
                {Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1} дней в {cityName}
              </p>
            )}
          </div>
        )}

        {/* ========== Step: Group ========== */}
        {step === 'group' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">Кто едет?</h2>
            <Counter label="Взрослые" sub="от 18 лет" value={adults} min={1} onChange={setAdults} />
            <Counter label="Дети" sub="до 18 лет" value={children} min={0} onChange={setChildren} />
            {children > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Возраст детей</p>
                <div className="flex flex-wrap gap-2">
                  {childrenAges.map((age, i) => (
                    <select key={i} value={age}
                      onChange={(e) => { const a = [...childrenAges]; a[i] = Number(e.target.value); setChildrenAges(a); }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      {Array.from({ length: 18 }, (_, j) => (
                        <option key={j} value={j}>{j} {j === 0 ? 'лет' : j === 1 ? 'год' : j < 5 ? 'года' : 'лет'}</option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== Step: Intensity ========== */}
        {step === 'intensity' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Какой темп предпочитаете?</h2>
            <div className="space-y-3">
              {Object.entries(INTENSITY_LABELS).map(([key, val]) => (
                <button key={key} onClick={() => setIntensity(key as Intensity)}
                  className={`card w-full p-5 text-left transition-all ${
                    intensity === key ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'hover:border-slate-300'
                  }`}>
                  <p className={`font-semibold ${intensity === key ? 'text-primary-700' : 'text-slate-900'}`}>
                    {key === 'RELAXED' ? '🧘 ' : key === 'NORMAL' ? '🚶 ' : '🏃 '}{val.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{val.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========== Step: Results ========== */}
        {step === 'results' && (
          <div className="space-y-8">
            {loading ? (
              <div className="flex flex-col items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <p className="mt-4 text-slate-500">Подбираем лучшую программу...</p>
              </div>
            ) : result?.variants?.length > 0 ? (
              <>
                {/* Header */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900">Ваша программа в {cityName}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {result.meta.dayCount} {result.meta.dayCount === 1 ? 'день' : result.meta.dayCount < 5 ? 'дня' : 'дней'},
                    {' '}{totalPersons} {totalPersons === 1 ? 'человек' : totalPersons < 5 ? 'человека' : 'человек'}
                    {' '}&middot; {result.meta.availableEventsCount} событий доступно
                  </p>
                </div>

                {/* ===== Tier Cards ===== */}
                <div className="grid gap-4 md:grid-cols-3">
                  {result.variants.map((v: any, i: number) => {
                    const style = TIER_STYLES[v.tier] || TIER_STYLES.optimal;
                    const TierIcon = style.icon;
                    const isSelected = selectedVariant === i;
                    const eventCount = v.days.reduce((s: number, d: any) => s + d.slots.length, 0);
                    const isOptimal = v.tier === 'optimal';

                    return (
                      <button key={i}
                        onClick={() => { setSelectedVariant(i); }}
                        className={`relative rounded-2xl p-5 text-left transition-all border-2 ${
                          isSelected
                            ? `bg-gradient-to-br ${style.gradient} ${style.border} ring-2 ${style.ring} shadow-lg`
                            : `bg-white border-slate-200 hover:${style.border} hover:shadow-md`
                        }`}>
                        {/* Badge */}
                        {isOptimal && (
                          <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold ${style.badge}`}>
                            {style.badgeText}
                          </span>
                        )}

                        <div className="flex items-center gap-2 mb-3 mt-1">
                          <TierIcon className={`h-5 w-5 ${style.accent}`} />
                          <span className={`font-bold text-lg ${style.accent}`}>{v.name}</span>
                        </div>

                        {/* Grand total */}
                        <div className="mb-2">
                          <span className="text-3xl font-extrabold text-slate-900">{formatPrice(v.grandTotal)}</span>
                        </div>
                        <p className="text-sm text-slate-500">{formatPrice(v.perPerson)} / чел.</p>

                        {/* Meta */}
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                          <div className="flex justify-between">
                            <span>Событий</span>
                            <span className="font-medium text-slate-700">{eventCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Билеты</span>
                            <span className="font-medium text-slate-700">{formatPrice(v.totalPrice)}</span>
                          </div>
                          {(v.serviceFee > 0 || v.markup > 0) && (
                            <div className="flex justify-between">
                              <span>Сбор{v.markup > 0 ? ' + наценка' : ''}</span>
                              <span className="font-medium text-slate-700">{formatPrice((v.serviceFee || 0) + (v.markup || 0))}</span>
                            </div>
                          )}
                        </div>

                        {/* Selected indicator */}
                        {isSelected && (
                          <div className={`mt-3 text-center text-xs font-semibold ${style.accent}`}>Выбран</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Savings hint */}
                {result.variants.length >= 2 && (() => {
                  const cheapest = result.variants[0];
                  const priciest = result.variants[result.variants.length - 1];
                  const diff = priciest.grandTotal - cheapest.grandTotal;
                  if (diff <= 0) return null;
                  return (
                    <p className="text-center text-sm text-slate-500">
                      Разница между {cheapest.name} и {priciest.name}:{' '}
                      <strong className="text-slate-700">{formatPrice(diff)}</strong>
                    </p>
                  );
                })()}

                {/* ===== Selected variant: Day timeline ===== */}
                {(() => {
                  const variant = result.variants[selectedVariant];
                  if (!variant) return null;
                  const style = TIER_STYLES[variant.tier] || TIER_STYLES.optimal;

                  return (
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-slate-400" />
                        Программа: {variant.name}
                      </h3>

                      {variant.days.map((day: any) => {
                        const isExp = expandedDays.has(day.dayNumber);
                        const dayTotal = day.slots.reduce((s: number, sl: any) => s + sl.subtotal, 0);

                        return (
                          <div key={day.dayNumber} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                            <button onClick={() => toggleDay(day.dayNumber)}
                              className="flex w-full items-center justify-between p-4 hover:bg-slate-50 transition">
                              <div className="flex items-center gap-3">
                                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                  isExp ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>{day.dayNumber}</span>
                                <div className="text-left">
                                  <span className="font-semibold text-slate-900">День {day.dayNumber}</span>
                                  <span className="ml-2 text-sm text-slate-400">{day.date}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-600">{day.slots.length} событ. &middot; {formatPrice(dayTotal)}</span>
                                {isExp ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                              </div>
                            </button>

                            {isExp && (
                              <div className="border-t border-slate-100">
                                {day.slots.map((slot: any, si: number) => (
                                  <div key={si} className={`flex items-start gap-4 p-4 ${si > 0 ? 'border-t border-slate-50' : ''}`}>
                                    {/* Time column */}
                                    <div className="flex-shrink-0 w-16 text-center">
                                      <span className={`inline-block rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                                        slot.slot === 'MORNING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                        slot.slot === 'AFTERNOON' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                        slot.slot === 'LATE_AFTERNOON' ? 'bg-sky-50 text-sky-600 border border-sky-200' :
                                        'bg-violet-50 text-violet-700 border border-violet-200'
                                      }`}>
                                        {slot.time}
                                      </span>
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        {slot.slot === 'MORNING' ? 'Утро' : slot.slot === 'AFTERNOON' ? 'День' : slot.slot === 'LATE_AFTERNOON' ? 'День' : 'Вечер'}
                                      </p>
                                    </div>

                                    {/* Event image + info */}
                                    <div className="flex-1 min-w-0 flex gap-3">
                                      {slot.event.imageUrl && (
                                        <img src={slot.event.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <Link href={`/events/${slot.event.slug}`}
                                          className="font-semibold text-slate-900 hover:text-primary-600 transition-colors text-sm line-clamp-2">
                                          {slot.event.title}
                                        </Link>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                                          {slot.event.durationMinutes && (
                                            <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {slot.event.durationMinutes} мин</span>
                                          )}
                                          {Number(slot.event.rating) > 0 && (
                                            <span className="flex items-center gap-0.5">
                                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /> {Number(slot.event.rating).toFixed(1)}
                                            </span>
                                          )}
                                          {slot.session?.availableTickets > 0 && slot.session.availableTickets < 20 && (
                                            <span className="text-red-500 font-medium">Осталось {slot.session.availableTickets} мест</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Price column */}
                                    <div className="flex-shrink-0 text-right">
                                      <span className="font-bold text-sm text-slate-900">{formatPrice(slot.subtotal)}</span>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        {slot.tickets.adult.count} взр.{slot.tickets.child.count > 0 ? ` + ${slot.tickets.child.count} дет.` : ''}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {formatPrice(slot.tickets.adult.unitPrice)} / взр.
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* ===== Upsells ===== */}
                {result.upsells?.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                      <Gift className="h-5 w-5 text-slate-400" />
                      Сделайте поездку ещё лучше
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {result.upsells.map((u: any) => {
                        const isOn = selectedUpsells.has(u.id);
                        return (
                          <button key={u.id} onClick={() => toggleUpsell(u.id)}
                            className={`rounded-xl p-4 text-left transition-all border-2 ${
                              isOn
                                ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-400'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}>
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{u.icon}</span>
                              <div className="flex-1">
                                <p className={`font-semibold text-sm ${isOn ? 'text-primary-700' : 'text-slate-900'}`}>{u.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{u.description}</p>
                              </div>
                              <span className={`text-sm font-bold flex-shrink-0 ${isOn ? 'text-primary-700' : 'text-slate-700'}`}>
                                +{formatPrice(u.priceKopecks)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ===== Total + Actions ===== */}
                {(() => {
                  const variant = result.variants[selectedVariant];
                  if (!variant) return null;
                  const grandWithUpsell = variant.grandTotal + upsellTotal;

                  return (
                    <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-300">Итого за {variant.name}</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-extrabold">{formatPrice(grandWithUpsell)}</span>
                            {upsellTotal > 0 && (
                              <span className="text-sm text-slate-400 line-through">{formatPrice(variant.grandTotal)}</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {formatPrice(Math.ceil(grandWithUpsell / totalPersons))} / чел.
                            {upsellTotal > 0 && ` (вкл. доп. услуги ${formatPrice(upsellTotal)})`}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Shield className="h-3.5 w-3.5" />
                            <span>Безопасная оплата</span>
                          </div>
                        </div>
                      </div>

                      {/* Breakdown */}
                      <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div>
                          <p className="text-xs text-slate-400">Билеты</p>
                          <p className="font-semibold">{formatPrice(variant.totalPrice)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Сервисный сбор</p>
                          <p className="font-semibold">{variant.serviceFee > 0 ? formatPrice(variant.serviceFee) : 'Бесплатно'}</p>
                        </div>
                        {variant.markup > 0 && (
                          <div>
                            <p className="text-xs text-slate-400">Сезонная наценка</p>
                            <p className="font-semibold">{formatPrice(variant.markup)}</p>
                          </div>
                        )}
                        {upsellTotal > 0 && (
                          <div>
                            <p className="text-xs text-slate-400">Доп. услуги</p>
                            <p className="font-semibold">{formatPrice(upsellTotal)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => { setStep('city'); setResult(null); }}
                    className="btn-secondary flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Изменить параметры
                  </button>
                  <Link href={`/combo?city=${city}`}
                    className="btn-secondary flex-1 text-center">
                    Смотреть готовые программы
                  </Link>
                </div>
              </>
            ) : result?.meta?.message ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-4xl">🔍</p>
                <p className="mt-4 text-slate-700">{result.meta.message}</p>
                <p className="mt-2 text-sm text-slate-500">Попробуйте другие даты или город</p>
                <button onClick={() => setStep('city')} className="btn-secondary mt-6">
                  Попробовать другие параметры
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                <p className="text-red-700">Не удалось подобрать программу</p>
                <button onClick={() => setStep('city')} className="btn-secondary mt-4">Начать сначала</button>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        {step !== 'results' && (
          <div className="mt-8 flex items-center justify-between">
            {currentStepIndex > 0 ? (
              <button onClick={prevStep} className="btn-secondary"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</button>
            ) : <div />}
            <button onClick={nextStep} disabled={!canProceed()} className="btn-primary disabled:opacity-40">
              {step === 'intensity' ? 'Подобрать программу' : 'Далее'} <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Counter component */
function Counter({ label, sub, value, min, onChange }: {
  label: string; sub: string; value: number; min: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50">-</button>
        <span className="w-8 text-center text-lg font-semibold">{value}</span>
        <button onClick={() => onChange(value + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50">+</button>
      </div>
    </div>
  );
}
