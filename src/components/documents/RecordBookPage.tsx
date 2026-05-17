import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, gradeIsPassing, assessmentTypeLabel } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
 * «Физическая» страница зачётной книжки: одна страница на семестр,
 * крест-накрест бумажная стилистика, навигация листанием.
 */
export function RecordBookPage({
  studentName,
  group,
  recordBookNumber,
  semesters,
  currentIndex,
  basePath = "/attestations",
  headerNote,
}: {
  studentName: string;
  group: string;
  recordBookNumber: string;
  semesters: RecordBookSemester[];
  currentIndex: number;
  basePath?: string;
  headerNote?: string;
}) {
  const current = semesters[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < semesters.length - 1;

  return (
    <div className="space-y-4">
      {/* Навигация листания */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button asChild variant="outline" size="sm" disabled={!hasPrev}>
          {hasPrev ? (
            <Link href={`${basePath}?page=${currentIndex - 1}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Предыдущий семестр
            </Link>
          ) : (
            <span>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Предыдущий семестр
            </span>
          )}
        </Button>
        <div className="text-sm text-muted-foreground">
          Страница {currentIndex + 1} из {semesters.length}
        </div>
        <Button asChild variant="outline" size="sm" disabled={!hasNext}>
          {hasNext ? (
            <Link href={`${basePath}?page=${currentIndex + 1}`}>
              Следующий семестр
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          ) : (
            <span>
              Следующий семестр
              <ChevronRight className="h-4 w-4 ml-1" />
            </span>
          )}
        </Button>
      </div>

      {/* «Лист» зачётной книжки */}
      <article
        className="relative font-serif text-black bg-[#fbf6e9] border border-amber-900/40 shadow-[0_4px_16px_rgba(120,80,30,0.18)] rounded-sm"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0 31px, rgba(180,140,80,0.08) 31px 32px)",
        }}
      >
        {/* «Корешок» книжки */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-amber-900/30 rounded-l-sm hidden sm:block" />

        <div className="p-6 sm:p-10 sm:pl-12">
          <header className="text-center border-b border-amber-900/40 pb-3 mb-5">
            <div className="text-[11px] uppercase tracking-widest text-amber-900/80">
              Зачётная книжка № {recordBookNumber}
            </div>
            <h2 className="text-lg font-semibold mt-1">Результаты промежуточной аттестации</h2>
            <p className="text-sm mt-1">
              {studentName} · группа {group}
            </p>
            {headerNote && <p className="text-xs mt-1 text-amber-900/70">{headerNote}</p>}
          </header>

          <div className="text-center mb-4">
            <div className="text-base font-semibold">
              {current.course} курс · {current.number}-й семестр · {current.academicYear} уч. г.
            </div>
          </div>

          {current.assessments.length === 0 ? (
            <p className="text-center text-amber-900/60 py-12 italic">
              В этом семестре записей пока нет.
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
                  <th className="border border-amber-900/60 bg-amber-900/10 px-2 py-2 text-left">Подпись преподавателя</th>
                </tr>
              </thead>
              <tbody>
                {current.assessments.map((a, i) => (
                  <tr key={a.id}>
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

          {/* Подвал страницы с подписью */}
          <div className="mt-10 grid sm:grid-cols-2 gap-6 text-[12px]">
            <div>
              <div className="border-t border-amber-900/60 pt-1 text-center">
                подпись заведующего отделением
              </div>
            </div>
            <div>
              <div className="border-t border-amber-900/60 pt-1 text-center">
                подпись студента
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Точечная навигация (страницы) */}
      {semesters.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1 pt-2">
          {semesters.map((s, i) => (
            <Link
              key={s.id}
              href={`${basePath}?page=${i}`}
              className={
                "inline-flex items-center gap-1 rounded px-2 py-1 text-xs border transition-colors " +
                (i === currentIndex
                  ? "bg-amber-900/10 border-amber-900/60 font-semibold"
                  : "bg-white border-border hover:bg-accent")
              }
              title={`${s.course} к., ${s.number} сем., ${s.academicYear}`}
            >
              {s.course}к/{s.number}с
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
