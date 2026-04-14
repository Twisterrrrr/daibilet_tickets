import { permanentRedirect } from 'next/navigation';

export default function LegacyBlogIndexRedirect() {
  permanentRedirect('/articles');
}

