import { Metadata } from 'next';
import ReviewWriteClient from './ReviewWriteClient';

export const metadata: Metadata = {
  title: 'Оставить отзыв — Дайбилет',
  robots: 'noindex, nofollow',
};

export default function ReviewWritePage() {
  return <ReviewWriteClient />;
}
