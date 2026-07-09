import { useState } from "react";

import { LoadingButton, MaterialIcon, Modal } from "@interviews-tracker/design-system";

type AddFeedbackModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, source?: string) => Promise<void>;
};

export function AddFeedbackModal({ isOpen, onClose, onSubmit }: AddFeedbackModalProps) {
  const [content, setContent] = useState("");
  const [source, setSource] = useState("WhatsApp");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setContent("");
    setSource("WhatsApp");
    onClose();
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim(), source);
      handleClose();
    } catch (error) {
      console.error("Failed to add feedback:", error);
      alert("Failed to add feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Feedback" size="md">
      <div className="space-y-4">
        {/* Info */}
        <p className="text-sm text-neutral-600">
          Paste feedback from WhatsApp, messages, or any text. Our AI will smart-merge it with existing notes.
        </p>

        {/* Source dropdown */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="WhatsApp">WhatsApp</option>
            <option value="Text Message">Text Message</option>
            <option value="Manual">Manual Note</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Content textarea */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Feedback Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your feedback here..."
            rows={8}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
          <div className="text-sm text-neutral-500">{content.length} characters</div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <LoadingButton
              loading={isSubmitting}
              loadingLabel="Parsing with AI..."
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <MaterialIcon name="auto_awesome" className="text-[16px]" />
              Parse with AI
            </LoadingButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
