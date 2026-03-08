import type { Inputs, YearProjection } from '@/types'
import { formatMoney } from './resultsPanelUtils'

export function DataTable({ data, inputs }: { data: YearProjection[], inputs: Inputs }) {
  const retirementAge =
    inputs.householdType === 'single'
      ? inputs.retirementAge
      : Math.min(inputs.partnerA.retirementAge, inputs.partnerB.retirementAge)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="p-2 font-medium">Age</th>
            <th className="p-2 font-medium text-right">Salary</th>
            <th className="p-2 font-medium text-right">Contribs</th>
            <th className="p-2 font-medium text-right">Spending</th>
            <th className="p-2 font-medium text-right">SIPP</th>
            <th className="p-2 font-medium text-right">ISA</th>
            <th className="p-2 font-medium text-right">Cash</th>
            <th className="p-2 font-medium text-right">Total</th>
            <th className="p-2 font-medium text-right">Tax</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => {
            const age = row.partnerA.age
            const salary = row.partnerA.salary + (row.partnerB?.salary ?? 0)
            const contributions = row.partnerA.contributions + (row.partnerB?.contributions ?? 0)
            const sippBalance = row.partnerA.sippBalance + (row.partnerB?.sippBalance ?? 0)
            const isaBalance = row.partnerA.isaBalance + (row.partnerB?.isaBalance ?? 0)
            const cashBalance = row.partnerA.cashBalance + (row.partnerB?.cashBalance ?? 0)
            const taxPaid = row.partnerA.taxPaid + (row.partnerB?.taxPaid ?? 0)

            const isRetired = age >= retirementAge
            const isRunOut = isRetired && row.totalNetWorth <= 0
            return (
              <tr
                key={age}
                className={`border-b border-border/50 ${
                  age === retirementAge
                    ? 'bg-primary/5 font-medium'
                    : isRunOut
                      ? 'bg-red-50 text-red-700'
                      : ''
                }`}
              >
                <td className="p-2">{age}</td>
                <td className="p-2 text-right">{salary ? formatMoney(salary) : '—'}</td>
                <td className="p-2 text-right">{contributions ? formatMoney(contributions) : '—'}</td>
                <td className="p-2 text-right">{row.spending ? formatMoney(row.spending) : '—'}</td>
                <td className="p-2 text-right">{formatMoney(sippBalance)}</td>
                <td className="p-2 text-right">{formatMoney(isaBalance)}</td>
                <td className="p-2 text-right">{formatMoney(cashBalance)}</td>
                <td className="p-2 text-right font-medium">{formatMoney(row.totalNetWorth)}</td>
                <td className="p-2 text-right">{taxPaid ? formatMoney(taxPaid) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
