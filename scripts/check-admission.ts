import { PrismaClient } from "@prisma/client";
import { evaluateAdmission } from "../src/lib/admission";

(async () => {
  const p = new PrismaClient();
  const students = await p.student.findMany({
    include: {
      user: true,
      assessments: { include: { discipline: true, semester: true } },
      courseWorks: { include: { discipline: true } },
    },
    orderBy: { user: { fullName: "asc" } },
  });
  for (const s of students) {
    const r = evaluateAdmission({ assessments: s.assessments, courseWorks: s.courseWorks });
    const semCount = new Set(s.assessments.map((a) => a.semesterId)).size;
    console.log(
      `${s.user.fullName} → ${r.kind.toUpperCase()} | оценок: ${s.assessments.length}, курсовых: ${s.courseWorks.length}, семестров: ${semCount}`
    );
    if (r.kind === "not_admitted") {
      for (const f of r.failed) console.log(`     FAIL: ${f.discipline} = ${f.grade} (${f.type})`);
    }
  }
  await p.$disconnect();
})();
