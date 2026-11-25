/** Present readable statistics with restrained functional color accents. */
import PropTypes from 'prop-types';

const accents = {
  indigo: 'border-indigo-500 dark:border-indigo-400', violet: 'border-violet-500 dark:border-violet-400', pink: 'border-pink-500 dark:border-pink-400', teal: 'border-teal-500 dark:border-teal-400',
};

/** Render an accurately labeled numeric total and explanatory subtitle.
 * Args:
 *   label: Statistic name.
 *   value: Current total, including zero.
 *   subtitle: Explain the counting boundary.
 *   color: Functional accent from the specified statistic palette.
 * Returns:
 *   A semantic statistic group.
 */
export function StatCard({ label, value, subtitle, color = 'indigo' }) {
  return (
    <section aria-label={label} className={`rounded-2xl border border-slate-200 border-t-4 bg-white dark:bg-slate-900 p-5 ${accents[color]}`}>
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</h2>
      <p className="mt-3 text-4xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{subtitle}</p>
    </section>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired, value: PropTypes.number.isRequired, subtitle: PropTypes.string.isRequired,
  color: PropTypes.oneOf(['indigo', 'violet', 'pink', 'teal']),
};
