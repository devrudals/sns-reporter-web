'use client';

import { Suspense } from 'react';
import ProposalSubmitForm from '@/components/ProposalSubmitForm';

export default function ProposalsSubmitPage() {
    return (
        <Suspense fallback={<div className="container">로딩 중...</div>}>
            <ProposalSubmitForm />
        </Suspense>
    );
}
