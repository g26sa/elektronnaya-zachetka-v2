import { formatDateLong } from "@/lib/utils";
import type { Institution } from "@prisma/client";

export function DocumentHeader({
  institution,
  title,
  subtitle,
  generatedAt,
  showDateInHeader = true,
}: {
  institution: Institution | null;
  title: string;
  subtitle?: string;
  generatedAt?: Date;
  /** Если false — дата формирования не выводится в шапке (она будет внизу). */
  showDateInHeader?: boolean;
}) {
  return (
    <header className="border-b border-black pb-3 mb-6 text-center">
      <div className="text-[12px] uppercase tracking-wider">
        {institution?.name ?? "Образовательное учреждение"}
      </div>
      {institution?.address && <div className="text-[11px]">{institution.address}</div>}
      {(institution?.ogrn || institution?.inn) && (
        <div className="text-[11px]">
          {institution.ogrn && <>ОГРН {institution.ogrn} </>}
          {institution.inn && <>· ИНН {institution.inn}</>}
        </div>
      )}
      <h1 className="mt-4">{title}</h1>
      {subtitle && <p className="text-[12px]">{subtitle}</p>}
      {showDateInHeader && generatedAt && (
        <p className="text-[11px] text-right mt-2">
          Дата формирования: {formatDateLong(generatedAt)}
        </p>
      )}
    </header>
  );
}

export function DocumentSignatures({
  left,
  right,
}: {
  left: { title: string; name?: string };
  right: { title: string; name?: string };
}) {
  return (
    <div className="doc-footer">
      <div className="footer-line">
        <div className="sig-block">
          <div className="text-[12px] text-left">{left.title}</div>
          <div className="sig-underline">
            {left.name ?? "_______________________"}
            <div className="text-[9px]" style={{ color: "#888" }}>(подпись, расшифровка)</div>
          </div>
        </div>
        <div className="sig-block">
          <div className="text-[12px] text-left">{right.title}</div>
          <div className="sig-underline">
            {right.name ?? "«____» _______________ 20___ г."}
            <div className="text-[9px]" style={{ color: "#888" }}>&nbsp;</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Только дата формирования внизу — для студенческих отчётов. */
export function StudentDateFooter({ date }: { date: Date }) {
  return (
    <div className="doc-footer">
      <p className="text-[11px] text-right">
        Дата формирования: {formatDateLong(date)}
      </p>
    </div>
  );
}

/**
 * Подписи преподавателя и зав. отделением + опционально дата формирования.
 * Для печатных отчётов.
 */
export function TeacherReportFooter({
  teacherName,
  institution,
  date,
  showDate = true,
  showTeacherSignature = true,
}: {
  teacherName?: string;
  institution: {
    departmentHeadName?: string | null;
    departmentHeadTitle?: string | null;
  } | null;
  date: Date;
  showDate?: boolean;
  /** false — только подпись заведующего (когда отчёт печатает сам заведующий) */
  showTeacherSignature?: boolean;
}) {
  const headTitle = institution?.departmentHeadTitle?.trim() || "Заведующий отделением";
  const headName = institution?.departmentHeadName?.trim() || "";

  return (
    <div className="doc-footer">
      {showDate && (
        <div className="text-[12px] text-right whitespace-nowrap pb-1 mt-4">
          Дата формирования: {formatDateLong(date)}
        </div>
      )}

      <div className="footer-line" style={{ marginTop: "2.5rem" }}>
        {/* Преподаватель — только если печатает преподаватель */}
        {showTeacherSignature && (
          <div className="sig-block">
            <div className="text-[12px] text-left">Преподаватель</div>
            <div className="sig-underline">
              {teacherName || "_______________________"}
              <div className="text-[9px]" style={{ color: "#888" }}>(подпись, расшифровка)</div>
            </div>
          </div>
        )}
        {/* Заведующий отделением */}
        <div className="sig-block">
          <div className="text-[12px] text-left">{headTitle}</div>
          <div className="sig-underline">
            {headName || "_______________________"}
            <div className="text-[9px]" style={{ color: "#888" }}>(подпись, расшифровка)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Подпись заведующего отделением в печатных отчётах. */
export function DepartmentHeadSignature({
  institution,
}: {
  institution: {
    departmentHeadName?: string | null;
    departmentHeadTitle?: string | null;
  } | null;
}) {
  const title = institution?.departmentHeadTitle?.trim() || "Заведующий отделением";
  const name = institution?.departmentHeadName?.trim() || "";

  return (
    <div className="doc-footer">
      <div className="sig-block mx-auto" style={{ maxWidth: "300px" }}>
        <div className="text-[12px] text-center mb-1">{title}</div>
        <div className="border-t border-black mt-10 mb-2 min-h-[1px]" />
        <div className="text-[12px] text-center">{name || "_______________________"}</div>
      </div>
    </div>
  );
}
