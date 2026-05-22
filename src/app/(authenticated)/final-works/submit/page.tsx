'use client';

import { Suspense } from 'react';
import FinalSubmitForm from '@/components/FinalSubmitForm';

export default function FinalWorksSubmitPage() {
    return (
        <Suspense fallback={<div className="container">로딩 중...</div>}>
            <FinalSubmitForm />
        </Suspense>
    );
}
