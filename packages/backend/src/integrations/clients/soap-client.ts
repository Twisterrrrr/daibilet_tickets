/**
 * Заготовка SOAP/XML транспорта (TicketNet и др.). Не использовать прямой HTTP из адаптеров.
 * TODO: WSDL loader, XML parse/serialize, mTLS.
 */
export interface SoapClientContext {
  endpoint: string;
  soapAction?: string;
}

export function createSoapClientContext(ctx: SoapClientContext): SoapClientContext {
  return { ...ctx };
}
