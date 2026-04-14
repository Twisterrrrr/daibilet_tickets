import { permanentRedirect } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LegacyBlogArticleRedirect({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/articles/${encodeURIComponent(slug)}`);
}
