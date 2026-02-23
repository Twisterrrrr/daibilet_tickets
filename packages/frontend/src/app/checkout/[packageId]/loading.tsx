import { Loader2 } from 'lucide-react';

export default function CheckoutPackageLoading() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
      <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      <p className="mt-4 text-slate-600">Загрузка заказа...</p>
    </div>
  );
}
