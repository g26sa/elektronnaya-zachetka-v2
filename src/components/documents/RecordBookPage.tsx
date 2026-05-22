import { formatDate, gradeIsPassing, assessmentTypeLabel } from "@/lib/utils";

export type RecordBookSemester = {
  id: string;
  course: number;
  number: number;
  academicYear: string;
  assessments: {
    id: string;
    discipline: { name: string };
    hours: number | null;
    creditUnits: number | null;
    type: string;
    grade: string;
    date: Date;
    teacher: { fullName: string };
  }[];
};

/**
 * Одна «страница» зачётной книжки — бумажная стилистика, без подписей.
 * Без собственной навигации: листанием/фильтрацией управляет родитель.
 */
export function RecordBookPage({
  studentName,
  group,
  recordBookNumber,
  semester,
  headerNote,
  showHeader = true,
}: {
  studentName: string;
  group: string;
  recordBookNumber: string;
  semester: RecordBookSemester;
  headerNote?: string;
  /** Показывать ли «Зачётная книжка №…, ФИО, группа» (шапка-один-раз vs шапка-на-каждой) */
  showHeader?: boolean;
}) {
  return (
    <article
      className="relative font-serif text-black bg-[#fbf6e9] border border-amber-900/40 shadow-[0_4px_16px_rgba(120,80,30,0.18)] rounded-sm"
      style={{
        backgroundImage:
          "repeating-linear-gradient(180deg, transparent 0 31px, rgba(180,140,80,0.08) 31px 32px)",
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-amber-900/30 rounded-l-sm hidden sm:block" />

      <div className="p-6 sm:p-10 sm:pl-12">
        {showHeader && (
          <header className="text-center border-b border-amber-900/40 pb-3 mb-5">
            <div className="text-[11px] uppercase tracking-widest text-amber-900/80">
              Зачётная книжка № {recordBookNumber}
            </div>
            <h2 className="text-lg font-semibold mt-1">Результаты промежуточной аттестации</h2>
            <p className="text-sm mt-1">{studentName} · группа {group}</p>
            {headerNote && <p className="text-xs mt-1 text-amber-900/70">{headerNote}</p>}
          </header>
        )}

        <div className="text-center mb-4">
          <div className="text-base font-semibold">
            {semester.course} курс · {semester.number}-й семестр · {semester.academicYear} уч. г.
          </div>
        </div>

        {semester.assessments.length === 0 ? (
          <p className="text-center text-amber-900/60 py-12 italic">
            В этом семестре записей нет.
          </p>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border border-amber-900/60 bg-amber-900/10 px-2 py-2 text-center w-10">№</th>
                <th className="border border-amber-900/60 bg-amber-900/10 px-2 py-2 text-left">Наименование дисциплины</th>
                <th className="border border-amber-900/60 bg-amber-900/10 px-2 py-2 text-center w-20">Часы</th>
                <th className="border border-amber-900/60 bg-amber-900/10 px-2 py-2 text-center w-16">З.е.</th>
                <th className="border border-amber-900/60 bg-amber-900/10 px-2 py-2 text-center w-32">Форма контроля</th>
                <th className="border border-amber-900/60 bg-amber-900/10 px-2 py-2 text-center w-20">Оценка</th>
                <th className="border border-amber-900/60 bg-amber-900/10 px-2 py-2 text-center w-28">Дата</th>
                <th className="border border-amber-900/60 bg-amber-900/10 px-2 py-2 text-left">Преподаватель</th>
              </tr>
            </thead>
            <tbody>
              {semester.assessments.map((a, i) => (
                <tr key={a.id} id={a.id}>
                  <td className="border border-amber-900/60 px-2 py-2 text-center">{i + 1}</td>
                  <td className="border border-amber-900/60 px-2 py-2">{a.discipline.name}</td>
                  <td className="border border-amber-900/60 px-2 py-2 text-center">{a.hours ?? "—"}</td>
                  <td className="border border-amber-900/60 px-2 py-2 text-center">{a.creditUnits ?? "—"}</td>
                  <td className="border border-amber-900/60 px-2 py-2 text-center">{assessmentTypeLabel(a.type)}</td>
                  <td className="border border-amber-900/60 px-2 py-2 text-center">
                    <span
                      className={
                        "inline-block min-w-[2rem] px-2 py-0.5 rounded font-semibold " +
                        (gradeIsPassing(a.grade)
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-700/30"
                          : "bg-rose-100 text-rose-900 border border-rose-700/30")
                      }
                    >
                      {a.grade}
                    </span>
                  </td>
                  <td className="border border-amber-900/60 px-2 py-2 text-center whitespace-nowrap">{formatDate(a.date)}</td>
                  <td className="border border-amber-900/60 px-2 py-2">{a.teacher.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </article>
  );
}

