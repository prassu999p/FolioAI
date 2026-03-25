import { formatDistanceToNow } from 'date-fns'
import { GenerateReviewButton } from './generate-review-button'

interface StrategicNarrativeProps {
  holderId: string
  narrative: string | null
  generatedAt: string | null
}

export function StrategicNarrative({ holderId, narrative, generatedAt }: StrategicNarrativeProps) {
  const ageLabel = generatedAt
    ? formatDistanceToNow(new Date(generatedAt), { addSuffix: true })
    : null

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary text-2xl">psychology</span>
          <div>
            <h3 className="font-headline text-xl font-bold text-on-surface">
              Strategic Portfolio Narrative
            </h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              AI-generated quarterly review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {ageLabel && (
            <span className="bg-surface-container text-on-surface-variant rounded-full px-3 py-1 text-xs">
              Generated {ageLabel}
            </span>
          )}
          <GenerateReviewButton holderId={holderId} hasExisting={!!narrative} />
        </div>
      </div>

      {narrative ? (
        <div className="prose prose-sm max-w-none text-on-surface leading-relaxed">
          {narrative.split('\n\n').map((paragraph, i) => (
            <p key={i} className="mb-4 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">
            analytics
          </span>
          <p className="text-on-surface-variant">
            No quarterly review generated yet. Click &quot;Generate Review&quot; to create your
            portfolio analysis.
          </p>
        </div>
      )}

      {/* SEBI disclaimer footer */}
      <p className="text-xs text-on-surface-variant italic border-t border-surface-container-high pt-4 mt-6">
        FolioAI provides educational analysis. This is not SEBI-registered investment advice.
        Please consult a qualified financial advisor before making investment decisions.
      </p>
    </div>
  )
}
