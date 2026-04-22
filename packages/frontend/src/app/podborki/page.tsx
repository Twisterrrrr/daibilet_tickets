import { permanentRedirect } from 'next/navigation';

export default function LegacyPodborkiIndexRedirect() {
  permanentRedirect('/collections');
}
