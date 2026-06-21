import { MaterialIcon } from "@interviews-tracker/design-system";

type NotesCardProps = {
  notes: string | null;
};

export function NotesCard({ notes }: NotesCardProps) {
  if (!notes) {
    return null;
  }

  // Parse notes into bullet points if they contain dashes or asterisks
  const lines = notes.split('\n').filter(line => line.trim());
  const hasBullets = lines.some(line => /^[\-\*•]\s/.test(line.trim()));

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <MaterialIcon name="notes" className="text-[18px] text-neutral-600" />
        <h3 className="text-sm font-semibold text-neutral-900">Notes</h3>
      </div>

      <div className="text-sm text-neutral-700 leading-relaxed">
        {hasBullets ? (
          <ul className="space-y-2 list-none pl-0">
            {lines.map((line, index) => {
              const trimmed = line.trim();
              // Remove leading dash/asterisk/bullet
              const content = trimmed.replace(/^[\-\*•]\s*/, '');
              return (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span className="flex-1">{content}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="whitespace-pre-wrap">{notes}</p>
        )}
      </div>
    </div>
  );
}
