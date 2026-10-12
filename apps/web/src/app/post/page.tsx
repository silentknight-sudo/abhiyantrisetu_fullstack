import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PostRequirement } from './PostRequirement';

export const metadata: Metadata = {
  title: 'Post a requirement',
  description:
    'Describe your job and get quotes from verified professionals in Greater Noida within 24 hours.',
};

export default function PostPage() {
  return (
    <div className="min-h-screen bg-background pt-[72px]">
      <Suspense>
        <PostRequirement />
      </Suspense>
    </div>
  );
}
