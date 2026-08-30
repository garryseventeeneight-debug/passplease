"use client";

interface SubtopicOption {
  id: string;
  name: string;
}

interface TopicOption {
  id: string;
  name: string;
  subtopics: SubtopicOption[];
}

interface SubjectOption {
  id: string;
  slug: string;
  name: string;
  topics: TopicOption[];
}

export function QuestionFilters({
  subjects,
  subjectSlug,
  topicId,
  subtopicId,
  search,
  flaggedOnly,
}: {
  subjects: SubjectOption[];
  subjectSlug: string;
  topicId: string;
  subtopicId: string;
  search: string;
  flaggedOnly: boolean;
}) {
  const selectedSubject = subjects.find((s) => s.slug === subjectSlug);
  const selectedTopic = selectedSubject?.topics.find((t) => t.id === topicId);

  function autoSubmit(e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) {
    e.currentTarget.form?.requestSubmit();
  }

  // Changing subject/topic invalidates whatever was picked below it — reset
  // those fields first so the submitted combination doesn't filter to a
  // topic/subtopic that no longer belongs to the newly selected subject.
  function onSubjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const form = e.currentTarget.form;
    const topicField = form?.elements.namedItem("topic") as HTMLSelectElement | null;
    const subtopicField = form?.elements.namedItem("subtopic") as HTMLSelectElement | null;
    if (topicField) topicField.value = "";
    if (subtopicField) subtopicField.value = "";
    form?.requestSubmit();
  }

  function onTopicChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const form = e.currentTarget.form;
    const subtopicField = form?.elements.namedItem("subtopic") as HTMLSelectElement | null;
    if (subtopicField) subtopicField.value = "";
    form?.requestSubmit();
  }

  return (
    <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Subject</label>
        <select
          name="subject"
          defaultValue={subjectSlug}
          onChange={onSubjectChange}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {selectedSubject && (
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Topic</label>
          <select
            name="topic"
            defaultValue={topicId}
            onChange={onTopicChange}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All topics</option>
            {selectedSubject.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {selectedTopic && selectedTopic.subtopics.length > 0 && (
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Subtopic</label>
          <select
            name="subtopic"
            defaultValue={subtopicId}
            onChange={autoSubmit}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All subtopics</option>
            {selectedTopic.subtopics.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Search</label>
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search question text…"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <label className="flex items-center gap-1.5 pb-1.5 text-sm text-neutral-600 dark:text-neutral-400">
        <input type="checkbox" name="flagged" value="1" defaultChecked={flaggedOnly} onChange={autoSubmit} />
        Flagged only
      </label>
      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        Search
      </button>
    </form>
  );
}
