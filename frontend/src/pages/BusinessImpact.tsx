import React from 'react';
import { useGetAllTurbines } from '../hooks/useQueries';
import FinancialMetricCards from '../components/business/FinancialMetricCards';
import SavingsByTurbineChart from '../components/business/SavingsByTurbineChart';
import CostBenefitMatrix from '../components/business/CostBenefitMatrix';
import ModelValidationSection from '../components/business/ModelValidationSection';

export default function BusinessImpact() {
  const { data: turbines } = useGetAllTurbines();
  const displayTurbines = turbines || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="font-montserrat font-800 text-xl" style={{ color: 'var(--color-text-primary)' }}>
          Business Impact
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          Financial performance & ROI analytics
        </p>
      </div>

      <FinancialMetricCards />
      <SavingsByTurbineChart turbines={displayTurbines} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <CostBenefitMatrix turbines={displayTurbines} />
        <ModelValidationSection />
      </div>
    </div>
  );
}
