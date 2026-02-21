import type { FC } from 'react'

export const HelpPage: FC = () => {
  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <section className="rounded-lg border-2 border-destructive bg-destructive/10 p-5">
        <h2 className="text-xl font-bold text-destructive">Important disclaimer</h2>
        <p className="mt-2 text-sm leading-relaxed">
          This app was <strong>not created by a financial advisor</strong> and should not be used as the basis for financial,
          investment, or retirement decisions. It is an educational modelling tool only.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">How to use this tool</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>Enter your age, planned retirement age, and target annual spending in today&apos;s money.</li>
          <li>Add your salary, pension contribution rates, and monthly ISA savings.</li>
          <li>Fill in your current balances across SIPP, S&amp;S ISA, Cash ISA, and Cash Savings.</li>
          <li>
            (Optional) Open advanced settings to set drawdown order, spending step-downs, and one-off expenses.
          </li>
          <li>
            Review results in the chart and table. Adjust inputs to run what-if scenarios and compare outcomes.
          </li>
          <li>
            Switch to backtesting mode to compare your plan against historical sequences of UK market and inflation
            conditions.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">How the model works</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>The engine simulates your finances month-by-month from your current age to longevity age.</li>
          <li>Before retirement, it applies contributions and investment growth to each account.</li>
          <li>
            After retirement, it calculates spending needs, subtracts state pension income when applicable, and draws
            funds according to your chosen drawdown order.
          </li>
          <li>
            SIPP withdrawals are grossed up to account for tax, with 25% treated tax-free and 75% treated as taxable.
          </li>
          <li>
            Results are shown in today&apos;s money by deflating projected nominal balances using cumulative inflation.
          </li>
          <li>
            In fixed assumptions mode, rates stay constant at your selected assumptions; in backtesting mode, rates are
            replaced by historical monthly returns and inflation, then fall back to your assumptions when history ends.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Key assumptions and limitations</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>UK-focused model with simplified tax handling and monthly pro-rated annual tax bands.</li>
          <li>Salary sacrifice pension contributions include employee NI saving but do not model employer NI savings.</li>
          <li>Tax bands and major allowances are assumed to grow with inflation.</li>
          <li>State pension is included from state pension age and assumed to rise with inflation.</li>
          <li>Pre-retirement one-off expenses cascade through Cash Savings, then Cash ISA, then S&amp;S ISA.</li>
          <li>
            Out of scope for this model: defined benefit pensions, property income, annuities, GIA accounts, and
            household/joint planning.
          </li>
        </ul>
      </section>
    </main>
  )
}
