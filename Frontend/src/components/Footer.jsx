import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-stone-100 border-t border-stone-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-6">
            <Link to="/" className="text-stone-600 hover:text-stone-900">
              About
            </Link>
            <Link to="/" className="text-stone-600 hover:text-stone-900">
              How it works
            </Link>
          </div>
          <p className="text-stone-500 text-sm">
            Launching February–March 2026. Pre-launch.
          </p>
        </div>
        <p className="text-center text-stone-400 text-sm mt-6">
          Pennit – African stories, by African writers.
        </p>
      </div>
    </footer>
  )
}
