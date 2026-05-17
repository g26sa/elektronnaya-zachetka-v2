import { formatDateLong } from "@/lib/utils";
import type { Institution } from "@prisma/client";

export function DocumentHeader({
  institution,
  title,
  subtitle,
  generatedAt,
}: {
  institution: Institution | null;
  title: string;
  subtitle?: string;
  generatedAt?: Date;
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
      {generatedAt && (
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
    <div className="signatures">
      <div>
        <p className="text-[12px]">{left.title}</p>
        <div className="signature-line">
          <div>{left.name ?? "_______________________"}</div>
          <div className="text-[10px] text-muted">(подпись, расшифровка)</div>
        </div>
      </div>
      <div>
        <p className="text-[12px]">{right.title}</p>
        <div className="signature-line">
          <div>{right.name ?? "_______________________"}</div>
          <div className="text-[10px] text-muted">(подпись, расшифровка)</div>
        </div>
      </div>
    </div>
  );
}
