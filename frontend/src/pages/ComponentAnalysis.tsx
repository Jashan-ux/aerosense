import React from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetTurbine, useGetAllTurbines } from '../hooks/useQueries';
import GearboxAnalysis from '../components/component/GearboxAnalysis';
import GeneratorAnalysis from '../components/component/GeneratorAnalysis';
import BladeRotorAnalysis from '../components/component/BladeRotorAnalysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const COMPONENT_TYPES = [
  { value: 'gearbox', label: 'Gearbox' },
  { value: 'generator', label: 'Generator' },
  { value: 'blade', label: 'Blade / Rotor' },
];

export default function ComponentAnalysis() {
  const params = useParams({ from: '/component/$type' });
  const navigate = useNavigate();
  const componentType = params.type || 'gearbox';

  const { data: allTurbines } = useGetAllTurbines();
  const firstTurbineId = allTurbines && allTurbines.length > 0 ? allTurbines[0].id : '0';
  const { data: turbine } = useGetTurbine(firstTurbineId);
  const displayTurbine = turbine || (allTurbines && allTurbines.length > 0 ? allTurbines[0] : null);

  const handleTypeChange = (type: string) => {
    navigate({ to: '/component/$type', params: { type } });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-montserrat font-800 text-xl" style={{ color: 'var(--color-text-primary)' }}>
            Component Analysis
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Deep-dive component health diagnostics
          </p>
        </div>
        <Select value={componentType} onValueChange={handleTypeChange}>
          <SelectTrigger
            className="w-44 text-sm"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            <SelectValue placeholder="Select component" />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            {COMPONENT_TYPES.map(c => (
              <SelectItem key={c.value} value={c.value} className="text-sm">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {displayTurbine ? (
        <>
          {componentType === 'gearbox' && <GearboxAnalysis turbine={displayTurbine} />}
          {componentType === 'generator' && <GeneratorAnalysis turbine={displayTurbine} />}
          {componentType === 'blade' && <BladeRotorAnalysis turbine={displayTurbine} />}
        </>
      ) : (
        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading turbine data...</div>
      )}
    </div>
  );
}
