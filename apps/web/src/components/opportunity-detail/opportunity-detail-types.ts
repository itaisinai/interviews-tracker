export type NoteDraft = {
  title: string;
  category: string;
  content: string;
};

export type TaskDraft = {
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  notes: string;
};

export type CompensationDraft = {
  baseSalary: string;
  equity: string;
  bonus: string;
  offerStatus: string;
  negotiationNotes: string;
};
