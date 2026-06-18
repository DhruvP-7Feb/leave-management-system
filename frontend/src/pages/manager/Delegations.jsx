import React from 'react';
import PageHeader from '../../components/UI/PageHeader';
import DelegateApprovals from '../../components/Manager/DelegateApprovals';

const Delegations = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Delegations"
        subtitle="Manage your approval delegates while you are away"
      />
      <DelegateApprovals />
    </div>
  );
};

export default Delegations;
