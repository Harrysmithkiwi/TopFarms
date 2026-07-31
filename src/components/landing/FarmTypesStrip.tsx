import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Milk, Beef, Wheat, PawPrint, Layers } from 'lucide-react'

// No listing counts here — they were hardcoded and contradicted the live
// platform stats (TF-003 truth pass). Re-add only when driven by real data.
//
// Phase 3 Task 3.3 (audit D7): this strip advertised Horticulture and
// Viticulture, which `jobs_sector_check` rejects — the landing page was selling
// two sectors the database refuses to store. Both removed rather than the
// constraint extended: those two need a competency taxonomy that does not
// overlap pastoral ag, which the Compendium already scopes as v3.0. "Arable"
// was likewise a label with no enum behind it; the stored value is `cropping`.
//
// Every `value` below MUST be a value jobs_sector_check accepts, and each card
// links to a search that really filters on it (JobSearch reads ?sector=).
// Emoji replaced with Lucide glyphs — emoji-as-UI was banned in the admin
// uplift; it renders differently per platform and carries no accessible name.
const sectors = [
  { name: 'Dairy', value: 'dairy', Icon: Milk },
  { name: 'Sheep & Beef', value: 'sheep_beef', Icon: Beef },
  { name: 'Cropping', value: 'cropping', Icon: Wheat },
  { name: 'Deer', value: 'deer', Icon: PawPrint },
  { name: 'Mixed', value: 'mixed', Icon: Layers },
]

export function FarmTypesStrip() {
  return (
    <section className="px-4 py-20 bg-surface">
      <motion.div
        className="mx-auto max-w-6xl"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Eyebrow */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px w-8 bg-brand" />
          <p
            className="text-xs font-bold tracking-widest uppercase text-brand-700"
          >
            Farm Sectors
          </p>
        </div>

        {/* Heading */}
        <h2
          className="font-display mb-10 text-4xl font-bold md:text-5xl text-brand-900"
        >
          Opportunities Across Every Sector
        </h2>

        {/* Sector cards — horizontal scroll on mobile, grid on sm+ */}
        <div className="flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:pb-0 lg:grid-cols-5">
          {sectors.map(({ name, value, Icon }) => (
            <Link
              key={value}
              to={`/jobs?sector=${value}`}
              className="bg-surface border border-border focus-visible:outline-brand min-w-[160px] snap-center rounded-xl p-6 text-center transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-w-0"
            >
              <Icon
                className="mx-auto mb-3 h-7 w-7 text-brand-700"
                aria-hidden="true"
              />
              <p className="text-sm font-bold text-brand-900">
                {name}
              </p>
            </Link>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
